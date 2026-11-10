// Finanzen (S07 FRM-R37 bis FRM-R41, S10 Presets, Datenblatt Abschnitt 1): Löhne und Miete je Epoche, Kredite,
// Startpolster, Insolvenzzähler und Monatsbuch für die Finanzen-Ansicht.
import { profitShareStep } from "./erfolg";
import { phaseEffects } from "./marktphasen";
import { publisherSplit } from "./publisher";
import { locationsMonthlyRent, locationWageBp, regionalTax } from "./standorte";
import { type Bp, BP_ONE, type Cent, divInt, mulBp, mulDiv } from "../num";
import type { Anchors, CreditNote, GameData, GameState, LedgerMonth, PresetDef } from "../model/types";
import { dateOf, isFirstWeekOfMonth, isFirstWeekOfQuarter, isFirstWeekOfYear, WEEKS_PER_QUARTER } from "../calendar";
import { log, settleContracts } from "./firma";
import { currentRent, moveEquipment, officeDef, officeRent } from "./buero";
import { storageCost } from "./markt";
import { wageFactor } from "./personal";

/** Fertigungskosten sofort bezahlen und im Monatsbuch vermerken (MKT-V01, MKT-V03). */
export function payProduction(state: GameState, costCent: Cent): void {
  state.moneyCent -= costCent;
  ledgerNow(state).costs.production += costCent;
}

/** FRM-R38: Lizenzgebühren (Fremdmodule, ENG-R30) sofort bezahlen und im Monatsbuch vermerken. */
export function payLicense(state: GameState, costCent: Cent): void {
  state.moneyCent -= costCent;
  ledgerNow(state).costs.licenses += costCent;
}

export function preset(state: GameState, data: GameData): PresetDef {
  return data.presets.find((p) => p.id === state.settings.preset) ?? data.presets.find((p) => p.id === "normal")!;
}

/** Ankerwert für ein Jahr, linear zwischen den Stützjahren, außerhalb der Rand (Datenblatt Abschnitt 1). */
export function anchorValue(anchors: Anchors, year: number): number {
  if (year <= anchors[0]![0]) return anchors[0]![1];
  for (let i = 1; i < anchors.length; i++) {
    const [y1, v1] = anchors[i]!;
    const [y0, v0] = anchors[i - 1]!;
    if (year <= y1) return v0 + mulDiv(v1 - v0, year - y0, y1 - y0, 1);
  }
  return anchors[anchors.length - 1]![1];
}

/** Ein Betrag in 1980er-Preisen, auf das Lohnniveau des Jahres hochgerechnet (A20). */
export function scaleToYear(data: GameData, amount: Cent, year: number): Cent {
  const a = data.economy.salaryAnchorsCent;
  return mulDiv(amount, anchorValue(a, year), anchorValue(a, a[0]![0]), 1);
}

function year(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

/** Monatsbuch: Eintrag des laufenden Monats, angelegt bei Bedarf; höchstens 60 Monate. */
export function ledgerNow(state: GameState): LedgerMonth {
  const d = dateOf(state.startYear, state.week);
  let e = state.finance.ledger[state.finance.ledger.length - 1];
  if (!e || e.year !== d.year || e.month !== d.month) {
    e = { year: d.year, month: d.month, income: { sales: 0, contracts: 0, licenses: 0, merch: 0 }, costs: { wages: 0, rent: 0, interest: 0, production: 0, storage: 0, other: 0, tax: 0, licenses: 0, marketing: 0, server: 0 } };
    state.finance.ledger.push(e);
    if (state.finance.ledger.length > 60) state.finance.ledger.splice(0, state.finance.ledger.length - 60);
  }
  return e;
}

/** Einnahmen eines Monats aus dem Monatsbuch. */
export function monthIncome(m: LedgerMonth): Cent {
  return m.income.sales + m.income.contracts + m.income.licenses + (m.income.merch ?? 0) + (m.income.publisher ?? 0) + (m.income.konzern ?? 0) + (m.income.publishing ?? 0);
}

/** Kosten eines Monats; mit withTax = false ohne Steuern (Bemessung der Steuer, A46). */
export function monthCosts(m: LedgerMonth, withTax = true): Cent {
  const c = m.costs;
  return c.wages + c.rent + c.interest + c.production + c.storage + c.other + c.licenses + c.marketing + (c.server ?? 0) + (c.writeDown ?? 0) + (c.publishing ?? 0) + (c.bonus ?? 0) + (withTax ? c.tax : 0);
}

/** FRM-R41: Startpolster in Monaten ab Spielbeginn; 4 oder 5 Wochen je Monat werden als 13 Wochen je 3 Monate gezählt. */
export function inCushion(state: GameState, data: GameData): boolean {
  return divInt(state.week * 3, 13, 1) < preset(state, data).startCushionMonths;
}

// ---------- Kredite (FRM-R39) ----------

function last12(state: GameState): { income: Cent; costs: Cent } {
  const months = state.finance.ledger.slice(-12);
  const income = months.reduce((s, m) => s + monthIncome(m), 0);
  const costs = months.reduce((s, m) => s + monthCosts(m), 0);
  return { income, costs };
}

/**
 * Kreditwürdigkeit nach S07 5.6, vereinfacht. ANNAHME: Eigenkapitalquote gibt es ohne Bilanz noch nicht;
 * A = Gewinn ohne Kredit, B = Gewinn, C = ausgeglichen (Ergebnis innerhalb ±5 % des Umsatzes), D = Verlust,
 * E = Insolvenzzähler läuft.
 */
export function creditNote(state: GameState, data: GameData): CreditNote {
  const notes = data.economy.creditNotes;
  const pick = (n: string) => notes.find((x) => x.note === n)!;
  if (state.finance.insolvencyMonths > 0) return pick("E");
  const { income, costs } = last12(state);
  const profit = income - costs;
  if (profit > 0) return state.finance.loanCent === 0 ? pick("A") : pick("B");
  if (Math.abs(profit) <= mulBp(income, 500)) return pick("C");
  return pick("D");
}

/**
 * Kreditrahmen = Faktor der Note · Umsatz der letzten 12 Monate · Preset-Faktor.
 * ANNAHME: Die Startkreditlinie der Garage (50.000 USD zu 9 %, S07) gilt als Untergrenze, solange keine Insolvenz droht.
 */
export function creditLimit(state: GameState, data: GameData): { limitCent: Cent; rateBp: Bp } {
  const note = creditNote(state, data);
  const p = preset(state, data);
  const byRevenue = mulBp(mulBp(last12(state).income, note.limitFactorBp), p.loanLimitFactorBp);
  if (note.note === "E") return { limitCent: 0, rateBp: 0 };
  // Etappe 6c.10: Der Startkredit gilt für jeden Garagenstart (ohne Szenario), aufs Lohnniveau des Startjahres.
  const garage = state.startYear === data.start.startYear || !state.scenario;
  const startLine = garage ? scaleToYear(data, mulBp(data.economy.startLoanLimitCent, p.loanLimitFactorBp), state.startYear) : 0;
  const useStart = startLine > byRevenue;
  // MRK-R60: Im Boom ist Kapital billiger (−1 Prozentpunkt); ANNAHME (Datenblatt Abschnitt 3): in der Krise +1.
  const rate = (useStart ? data.economy.startLoanRateBp : note.rateBp) + p.loanRateAddBp + phaseEffects(state, data).loanRateAddBp;
  return { limitCent: Math.max(byRevenue, startLine), rateBp: Math.max(0, rate) };
}

export function validateLoan(state: GameState, data: GameData, kind: "takeLoan" | "repayLoan", amountCent: Cent): string | null {
  if (!Number.isSafeInteger(amountCent) || amountCent <= 0) return "error.amount";
  if (kind === "takeLoan") {
    const { limitCent } = creditLimit(state, data);
    return state.finance.loanCent + amountCent <= limitCent ? null : "error.loanLimit";
  }
  if (amountCent > state.finance.loanCent) return "error.repayTooMuch";
  return amountCent <= state.moneyCent ? null : "error.notEnoughMoney";
}

export function takeLoan(state: GameState, data: GameData, amountCent: Cent): void {
  const { rateBp } = creditLimit(state, data);
  state.finance.loanCent += amountCent;
  state.finance.loanRateBp = rateBp;
  state.moneyCent += amountCent;
  log(state, "log.loanTaken", { amount: amountCent });
}

export function repayLoan(state: GameState, amountCent: Cent): void {
  state.finance.loanCent -= amountCent;
  state.moneyCent -= amountCent;
  log(state, "log.loanRepaid", { amount: amountCent });
}

// ---------- Tick-Schritt 10 ----------

function weekly(monthly: Cent): Cent {
  return mulDiv(monthly, 12, 52, 1);
}

/** Monatsmiete eines Büros: Arbeitsplätze des Grundrisses · Miete je Platz (FRM-T25), mit Kostenfaktor des Presets. */
export function monthlyRent(state: GameState, data: GameData, places: number): Cent {
  return mulBp(places * anchorValue(data.economy.rentPerPlaceAnchorsCent, year(state)), preset(state, data).costFactorBp);
}

export function weeklyRent(state: GameState, data: GameData): Cent {
  // FRM-R32: dazu die Büros der weiteren Standorte.
  return weekly(currentRent(state, data) + locationsMonthlyRent(state, data));
}

/**
 * FRM-R24, FRM-R25: Umzug. Kaution 3 Monatsmieten des neuen Büros; vor Ablauf des Mietvertrags (24 Monate) die halbe
 * Restmiete des alten. ANNAHME: Die Kaution ist Kosten (kein Rückfluss), weil es noch keine Bilanz gibt.
 */
export function moveOffice(state: GameState, data: GameData, target: string): void {
  const o = data.offices;
  const next = officeDef(data, target);
  const monthsUsed = divInt((state.week - state.office.sinceWeek) * 3, 13, 1);
  const remaining = Math.max(0, o.contractMonths - monthsUsed);
  const penalty = divInt(remaining * currentRent(state, data), 2, 1);
  const deposit = o.depositMonths * officeRent(state, data, next, 0);
  state.moneyCent -= deposit + penalty;
  ledgerNow(state).costs.rent += deposit + penalty;
  state.office = { ...state.office, id: target, sinceWeek: state.week, moveWeeksLeft: o.moveWeeks, extensions: 0, moveSuggested: false };
  // FRM-R24: Ausstattung zieht mit, überschüssige Räume werden zum halben Preis verkauft.
  moveEquipment(state, data);
  log(state, "log.moved", { office: target, cost: deposit + penalty });
}

export function weeklyWages(state: GameState, data: GameData): Cent {
  return state.people.reduce((s, p) => s + mulBp(mulBp(mulBp(weekly(p.salaryCent), preset(state, data).costFactorBp), wageFactor(state, data)), locationWageBp(state, data, p)), 0);
}

/** A20, FRM-R33: Gehälter folgen dem Lohnniveau der Epoche; angepasst in Woche 1 jedes Jahres. */
function indexSalaries(state: GameState, data: GameData): void {
  const a = data.economy.salaryAnchorsCent;
  const y = year(state);
  const from = anchorValue(a, y - 1);
  const to = anchorValue(a, y);
  for (const p of state.people) p.salaryCent = mulDiv(p.salaryCent, to, from, 1);
}

export function financeStep(state: GameState, data: GameData): void {
  if (isFirstWeekOfYear(state.week) && state.week > 0) indexSalaries(state, data);
  const book = ledgerNow(state);
  const p = preset(state, data);

  const contractIncome = settleContracts(state, data, p.revenueFactorBp);
  state.moneyCent += contractIncome;
  book.income.contracts += contractIncome;

  for (const person of state.people) {
    // FRM-R16: Gehaltsniveau der Personalpolitik; FRM-R33: Lohnfaktor und Förderung des Standorts.
    const cost = mulBp(mulBp(mulBp(weekly(person.salaryCent), p.costFactorBp), wageFactor(state, data)), locationWageBp(state, data, person));
    state.moneyCent -= cost;
    book.costs.wages += cost;
    if (person.assignment?.kind === "project") {
      const project = state.projects.find((x) => x.id === person.assignment!.id);
      if (project) project.costCent += cost;
    }
  }
  const rent = weeklyRent(state, data);
  state.moneyCent -= rent;
  book.costs.rent += rent;

  // Verkäufe dieser Woche (Tick-Schritt 7 hat sie je Produkt vermerkt).
  for (const pr of state.projects) {
    if (pr.sales && pr.sales.weekRevenueCent > 0) {
      // FRM-R45: Mit Publisher-Vertrag bucht das Studio nur seinen Anteil; Etappe 6c.3: Auftragsspiele verkauft der Auftraggeber.
      const own = pr.contractGame ? 0 : publisherSplit(state, pr, pr.sales.weekRevenueCent);
      state.moneyCent += own;
      book.income.sales += own;
    }
  }

  if (isFirstWeekOfMonth(state.startYear, state.week)) monthlyFinance(state, data, book);
  if (isFirstWeekOfQuarter(state.week) && state.week > 0) {
    // Balancing Spätspiel (Entscheidung Projektleitung 04.11.2026): Gewinnbeteiligung vor der Gewinnsteuer.
    profitShareStep(state, data, book);
    quarterlyTax(state, data, book);
    excessCashCharge(state, data, book);
  }

  // FRM-R41: Im Startpolster bleibt der Kontostand bei 0; offene Kosten werden ein zinsloser Kredit.
  if (inCushion(state, data) && state.moneyCent < 0) {
    state.finance.cushionDebtCent -= state.moneyCent;
    state.moneyCent = 0;
  }
}

/**
 * Monatsjob im Finanz-Schritt (A13): Zinsen, Tilgung des Startpolster-Kredits, Kreditnote, Insolvenzzähler.
 * ANNAHME: Der Zähler zählt Monate in Folge mit negativem Kontostand und springt bei positivem Stand auf 0 zurück.
 */
function monthlyFinance(state: GameState, data: GameData, book: LedgerMonth): void {
  const f = state.finance;
  // MKT-V04: Lagerkosten je Stück und Monat.
  const storage = storageCost(state, data);
  state.moneyCent -= storage;
  book.costs.storage += storage;
  if (f.loanCent > 0) {
    const interest = mulDiv(f.loanCent, f.loanRateBp, 12 * BP_ONE, 1);
    state.moneyCent -= interest;
    book.costs.interest += interest;
  }
  if (!inCushion(state, data) && f.cushionDebtCent > 0) {
    if (f.cushionRepayCent === 0) f.cushionRepayCent = divInt(f.cushionDebtCent + data.economy.cushionRepayMonths - 1, data.economy.cushionRepayMonths, 1);
    const pay = Math.min(f.cushionRepayCent, f.cushionDebtCent);
    f.cushionDebtCent -= pay;
    state.moneyCent -= pay;
  }
  const note = creditNote(state, data);
  f.creditNote = note.note;
  if (f.loanCent > 0) f.loanRateBp = creditLimit(state, data).rateBp || f.loanRateBp;

  if (state.moneyCent < 0 && !inCushion(state, data)) {
    f.insolvencyMonths += 1;
    log(state, "log.insolvencyMonth", { n: f.insolvencyMonths, max: preset(state, data).insolvencyToleranceMonths });
  } else {
    f.insolvencyMonths = 0;
  }
  if (f.insolvencyMonths >= preset(state, data).insolvencyToleranceMonths) {
    state.gameOver = { week: state.week, reason: "insolvenz" };
    log(state, "log.insolvent", {});
  }
}

/**
 * A46 (Vorrang vor FRM-R72: quartalsweise statt jährlich): Gewinnsteuer auf das Ergebnis des Vorquartals, gebucht im
 * ersten Wochen-Tick des neuen Quartals. Verluste werden vorgetragen und verfallen nach lossCarryQuarters (FRM-R72: 5 Jahre).
 * ANNAHME: Ein Satz für die ganze Firma (Region Nordamerika, 2.500 bp), bis es Regionen und Standorte gibt (Etappe 3).
 */
export function quarterlyTax(state: GameState, data: GameData, book: LedgerMonth): Cent {
  const f = state.finance;
  const quarter = divInt(state.week, WEEKS_PER_QUARTER, 1) - 1;
  const first = dateOf(state.startYear, quarter * WEEKS_PER_QUARTER);
  const months = f.ledger.filter((m) => m.year === first.year && m.month >= first.month && m.month < first.month + 3);
  const result = months.reduce((s, m) => s + monthIncome(m) - monthCosts(m, false), 0);
  f.lossCarry = f.lossCarry.filter((l) => quarter - l.quarter <= data.economy.lossCarryQuarters);
  if (result <= 0) {
    if (result < 0) f.lossCarry.push({ quarter, cent: -result });
    return 0;
  }
  let base = result;
  for (const l of f.lossCarry) {
    const use = Math.min(l.cent, base);
    l.cent -= use;
    base -= use;
  }
  f.lossCarry = f.lossCarry.filter((l) => l.cent > 0);
  // FRM-R72: Steuersatz je Region nach Lohnkosten-Anteil.
  const tax = regionalTax(state, data, base);
  if (tax <= 0) return 0;
  state.moneyCent -= tax;
  book.costs.tax += tax;
  log(state, "log.tax", { amount: tax, base });
  return tax;
}

/**
 * Balancing 1.0 (Entscheidung Projektleitung 03.11.2026): Kassendruck je Schwierigkeitsstufe, angelehnt an eine Abgabe auf
 * einbehaltene Gewinne. Schwelle = excessCashMonths · mittlere Monatskosten der letzten zwölf Monate; vom Guthaben
 * (Kasse minus Kredite) darüber kostet jedes Quartal ein Viertel des Jahressatzes. ANNAHME: gebucht als Steuer.
 */
export function excessCashCharge(state: GameState, data: GameData, book: LedgerMonth): Cent {
  const p = preset(state, data);
  if (p.excessCashRateBp <= 0 || state.scenario) return 0;
  const months = state.finance.ledger.slice(-12);
  if (months.length < 12) return 0;
  const monthly = divInt(months.reduce((s, m) => s + monthCosts(m, false), 0), 12, 1);
  const excess = state.moneyCent - state.finance.loanCent - monthly * p.excessCashMonths;
  if (excess <= 0) return 0;
  const charge = mulDiv(excess, p.excessCashRateBp, 4 * BP_ONE, 1);
  if (charge <= 0) return 0;
  state.moneyCent -= charge;
  book.costs.tax += charge;
  log(state, "log.excessCash", { amount: charge, months: p.excessCashMonths });
  return charge;
}

/** PRD-R52: Mindestwertung auf den leichten Stufen bei Genre-Thema-Passung ≥ 1,0; sonst null. */
export function minScore(state: GameState, data: GameData, themeFitBp: Bp): Bp | null {
  const m = preset(state, data).minScoreGoodFitBp;
  return m !== null && themeFitBp >= BP_ONE ? m : null;
}

