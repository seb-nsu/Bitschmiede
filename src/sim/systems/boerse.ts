// Börse mit genau einem gesteuerten Wert, der Anlegerstimmung (S07 FRM-R51 bis FRM-R54, FRM-R74, FRM-R75, Formel 5.7;
// Etappe 6b.2). Der Kurs ist reine Anzeige.
import { type Bp, BP_ONE, type Cent, clamp, divBp, divInt, mulBp, mulDiv } from "../num";
import type { CapitalRaiseInput, DividendInput, DividendLevel, GameData, GameEvent, GameState, IpoInput, StockState } from "../model/types";
import { dateOf, isFirstWeekOfQuarter, WEEKS_PER_QUARTER, WEEKS_PER_YEAR } from "../calendar";
import { stream } from "../rng";
import { anchorValue, creditNote, ledgerNow, monthCosts, monthIncome } from "./finanzen";
import { log } from "./firma";
import { chronicle } from "./katalog";
import { marketPhase } from "./marktphasen";
import { playerValue, playerYearProfits } from "./firmenwert";
import { addEvent } from "./ereignisse";
import { cancelProject } from "./produkte/projects";

function S(data: GameData) {
  return data.stock;
}

export function emptyStock(): StockState {
  return {
    listed: false, ipoWeek: null, shares: 0, publicShares: 0, sentiment: 0, targetCent: 0, dividend: "keine", eventDelta: 0,
    dividendCut: false, lastRaiseYear: 0, priceCent: 0, history: [], savingsUntilWeek: 0, lastAssemblyYear: 0,
    protection: false, lastBuybackWeek: -999, hostile: null, hostileCooldownUntil: 0,
  };
}

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

/** Gewinn und Umsatz eines absoluten Quartals (Woche / 13) aus dem Monatsbuch. */
export function quarterResult(state: GameState, quarter: number): { profitCent: Cent; revenueCent: Cent; complete: boolean } {
  const d = dateOf(state.startYear, quarter * WEEKS_PER_QUARTER);
  const months = state.finance.ledger.filter((m) => m.year === d.year && m.month >= d.month && m.month < d.month + 3);
  return {
    profitCent: months.reduce((s, m) => s + monthIncome(m) - monthCosts(m), 0),
    revenueCent: months.reduce((s, m) => s + monthIncome(m), 0),
    complete: months.length === 3,
  };
}

// ---------- Börsengang (FRM-R51) ----------

/** FRM-R51: Mindestumsatz, inflationsbereinigt über die Gehaltsanker (Epochenfaktor). */
export function ipoMinRevenue(state: GameState, data: GameData): Cent {
  const i = S(data).ipo;
  const a = data.economy.salaryAnchorsCent;
  return mulDiv(i.minRevenueCent, anchorValue(a, yearOf(state)), anchorValue(a, i.minRevenueYear), 1);
}

function lastYearRevenue(state: GameState): Cent {
  const y = yearOf(state) - 1;
  return state.finance.ledger.filter((m) => m.year === y).reduce((s, m) => s + monthIncome(m), 0);
}

/** Gründe, warum der Börsengang (noch) nicht geht; leer = möglich. */
export function ipoBlockers(state: GameState, data: GameData): string[] {
  const i = S(data).ipo;
  const out: string[] = [];
  if (state.stock.listed) out.push("stock.block.listed");
  if (yearOf(state) < i.fromYear) out.push("stock.block.year");
  if (state.people.length < i.minPeople) out.push("stock.block.people");
  const profits = playerYearProfits(state).slice(0, i.profitYears);
  if (profits.length < i.profitYears || profits.some((p) => p <= 0)) out.push("stock.block.profit");
  if (lastYearRevenue(state) < ipoMinRevenue(state, data)) out.push("stock.block.revenue");
  if (!i.creditNotes.includes(creditNote(state, data).note)) out.push("stock.block.credit");
  return out;
}

/** FRM-R51: Marktstimmung 0–1 aus der Marktphase (ANNAHME: Boom 1, normal 0,5, Krise 0). */
function moodBp(state: GameState, data: GameData): Bp {
  return S(data).ipo.moodBp[marketPhase(state)];
}

/** FRM-R51: Erlös = Firmenwert × Anteil × (0,7 + 0,6 × Marktstimmung). */
export function ipoProceeds(state: GameState, data: GameData, shareBp: Bp): Cent {
  const w = playerValue(state, data).totalCent;
  return mulBp(mulBp(w, shareBp), S(data).priceBaseBp + mulBp(S(data).priceSpanBp, moodBp(state, data)));
}

export function validateIpo(state: GameState, data: GameData, input: IpoInput): string | null {
  if (ipoBlockers(state, data).length > 0) return "error.ipoLocked";
  const [lo, hi] = S(data).ipo.shareBp;
  if (!Number.isSafeInteger(input.shareBp) || input.shareBp < lo || input.shareBp > hi) return "error.amount";
  return null;
}

export function applyIpo(state: GameState, data: GameData, input: IpoInput): void {
  const i = S(data).ipo;
  const proceeds = ipoProceeds(state, data, input.shareBp);
  const st = state.stock;
  st.listed = true;
  st.ipoWeek = state.week;
  st.shares = i.shares;
  st.publicShares = mulBp(i.shares, input.shareBp);
  st.sentiment = i.startSentiment;
  st.priceCent = sharePrice(state, data);
  st.targetCent = quarterTarget(state, data, divInt(state.week, WEEKS_PER_QUARTER, 1));
  state.moneyCent += proceeds;
  log(state, "log.ipo", { amount: proceeds, share: input.shareBp });
  chronicle(state, "log.ipo", { amount: proceeds, share: input.shareBp });
}

// ---------- Kurs und Stimmung (FRM-R52, FRM-R74, Formel 5.7) ----------

/** FRM-R74: Kurs = W ÷ Aktien × (0,7 + 0,6 × S ÷ 100), in Cent je Aktie. */
export function sharePrice(state: GameState, data: GameData, valueCent: Cent = playerValue(state, data).totalCent): Cent {
  const st = state.stock;
  if (st.shares === 0) return 0;
  const f = S(data).priceBaseBp + mulDiv(S(data).priceSpanBp, st.sentiment, 100, 1);
  return mulBp(divInt(valueCent, st.shares, 1), f);
}

/** Formel 5.7: Ziel_q aus dem Gewinn des Vorjahresquartals (+5 % bei Gewinn, halber Verlust bei Verlust). */
export function quarterTarget(state: GameState, data: GameData, quarter: number): Cent {
  const t = S(data).target;
  // Prüfung Fable 03.11.2026 (ANNAHME): Zielmarke = Umsatz des Vorjahresquartals + 5 %; Quartalsverluste aus Abgaben machen keinen Lärm.
  if (t.basis === "umsatz") return mulBp(quarterResult(state, quarter - 4).revenueCent, t.growthBp);
  const g = quarterResult(state, quarter - 4).profitCent;
  return mulBp(g, g >= 0 ? t.growthBp : t.lossBp);
}

/** Formel 5.7: Δ Ziel aus a = (G − Ziel) / (|Ziel| + 0,05 · U); Verlust bei positivem Ziel ersetzt alle Fälle (−15). */
export function targetDelta(data: GameData, profitCent: Cent, targetCent: Cent, revenueCent: Cent): number {
  const d = S(data).delta;
  if (profitCent < 0 && targetCent >= 0) return d.lossMiss;
  const a = divBp(profitCent - targetCent, Math.abs(targetCent) + mulBp(Math.abs(revenueCent), S(data).target.revenueShareBp), 1);
  if (a >= d.strongBp) return d.strongUp;
  if (a >= 0) return d.up;
  if (a > -d.strongBp) return d.down;
  return d.strongDown;
}

/** Prüfung Fable 03.11.2026: Δ Ziel aus a = (U − Ziel) / Ziel mit denselben Stufen wie Formel 5.7, ohne Verluststrafe. */
export function revenueDelta(data: GameData, revenueCent: Cent, targetCent: Cent): number {
  const d = S(data).delta;
  const a = divBp(revenueCent - targetCent, Math.max(1, Math.abs(targetCent)), 1);
  if (a >= d.strongBp) return d.strongUp;
  if (a >= 0) return d.up;
  if (a > -d.strongBp) return d.down;
  return d.strongDown;
}

/** Rückkehr zur Mitte: ⌊0,1 · (50 − S)⌋, abgeschnitten Richtung null. */
export function meanReversion(data: GameData, sentiment: number): number {
  const m = S(data).meanRevert;
  const x = m.center - sentiment;
  const v = divInt(Math.abs(x) * m.factorBp, BP_ONE, 1);
  return x < 0 ? -v : v;
}

/** Δ Ereignisse aus Releases des Quartals, Marktphase, Rekordumsatz und gemeldeten Ereignissen, höchstens ±15. */
function eventsDelta(state: GameState, data: GameData, quarter: number, revenueCent: Cent): number {
  const e = S(data).events;
  const from = quarter * WEEKS_PER_QUARTER;
  let sum = state.stock.eventDelta;
  for (const p of state.projects) {
    if (!p.result || p.result.week < from || p.result.week >= from + WEEKS_PER_QUARTER) continue;
    if (p.result.scoreBp >= e.hitScoreBp) sum += e.hit;
    else if (p.result.scoreBp < e.flopScoreBp) sum += e.flop;
  }
  sum += e.phase[marketPhase(state)];
  const earlier = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => quarterResult(state, quarter - k)).filter((r) => r.complete);
  if (earlier.length > 0 && earlier.every((r) => revenueCent > r.revenueCent)) sum += e.record;
  return clamp(sum, -e.maxAbs, e.maxAbs);
}

/** Meldet ein Ereignis an die Börse (Skandal, Verschiebung, Übernahme); wirkt im laufenden Quartal. */
export function stockEvent(state: GameState, delta: number): void {
  if (state.stock?.listed) state.stock.eventDelta += delta;
}

/** Hook aus der Ereignis-Warteschlange: Skandale nach Art oder Katalog-Ereignis (Formel 5.7, Δ Ereignisse). */
export function stockEventFor(state: GameState, data: GameData, event: Pick<GameEvent, "kind" | "defId">): void {
  const k = S(data).events.kinds;
  const delta = (event.defId ? k[event.defId] : undefined) ?? k[event.kind];
  if (delta) stockEvent(state, delta);
}

/** FRM-R54: Dividende des Quartals = Stufe × Jahresgewinn ÷ 4, nur bei Gewinn; ANNAHME: nur der Anteil der Anleger fließt ab. */
function payDividend(state: GameState, data: GameData, profitCent: Cent): Cent {
  const st = state.stock;
  const share = S(data).dividend.shareBp[st.dividend];
  if (share === 0 || profitCent <= 0) return 0;
  const amount = mulDiv(mulBp(profitCent, share), st.publicShares, st.shares, 1);
  state.moneyCent -= amount;
  ledgerNow(state).costs.other += amount;
  return amount;
}

/** Quartals-Job (FRM-R52): Stimmung fortschreiben, Dividende zahlen, Kurs neu berechnen, nächste Zielmarke setzen. */
export function stockQuarter(state: GameState, data: GameData): void {
  const st = state.stock;
  if (!st.listed || !isFirstWeekOfQuarter(state.week) || st.ipoWeek === state.week) return;
  const quarter = divInt(state.week, WEEKS_PER_QUARTER, 1) - 1;
  const r = quarterResult(state, quarter);
  const dZiel = S(data).target.basis === "umsatz" ? revenueDelta(data, r.revenueCent, st.targetCent) : targetDelta(data, r.profitCent, st.targetCent, r.revenueCent);
  const dEvents = eventsDelta(state, data, quarter, r.revenueCent);
  // FRM-T29: Im Quartal der Senkung wirkt nur die Strafe, danach die neue Stufe.
  const dDiv = st.dividendCut ? S(data).dividend.cut : S(data).dividend.delta[st.dividend];
  const paid = payDividend(state, data, r.profitCent);
  const before = st.sentiment;
  st.sentiment = clamp(before + dZiel + dEvents + dDiv + meanReversion(data, before), 0, 100);
  st.eventDelta = 0;
  st.dividendCut = false;
  const old = st.priceCent;
  st.priceCent = sharePrice(state, data);
  st.targetCent = quarterTarget(state, data, quarter + 1);
  st.history = [...st.history, { quarter, sentiment: st.sentiment, priceCent: st.priceCent, profitCent: r.profitCent, targetCent: 0, revenueCent: r.revenueCent }].slice(-20);
  st.history[st.history.length - 1]!.targetCent = st.targetCent;
  log(state, "log.stockQuarter", { before, after: st.sentiment, ziel: dZiel, events: dEvents, dividend: dDiv, paid });
  // FRM-R74: Ticker-Meldung ab ±10 % Kursänderung.
  if (old > 0 && Math.abs(st.priceCent - old) >= mulBp(old, S(data).tickerChangeBp)) {
    log(state, st.priceCent > old ? "log.stockUp" : "log.stockDown", { price: st.priceCent });
  }
}

// ---------- Dividende, Kapitalerhöhung, Hauptversammlung (FRM-R53, FRM-R54) ----------

const LEVELS: readonly DividendLevel[] = ["keine", "niedrig", "hoch"];

export function validateDividend(state: GameState, input: DividendInput): string | null {
  if (!state.stock.listed) return "error.notListed";
  return LEVELS.includes(input.level) ? null : "error.amount";
}

export function setDividend(state: GameState, input: DividendInput): void {
  const st = state.stock;
  if (LEVELS.indexOf(input.level) < LEVELS.indexOf(st.dividend)) st.dividendCut = true;
  st.dividend = input.level;
}

export function validateCapitalRaise(state: GameState, data: GameData, input: CapitalRaiseInput): string | null {
  const st = state.stock;
  const r = S(data).raise;
  if (!st.listed) return "error.notListed";
  if (st.sentiment < r.minSentiment) return "error.raiseSentiment";
  if (st.lastRaiseYear === yearOf(state)) return "error.raiseYear";
  if (!Number.isSafeInteger(input.shareBp) || input.shareBp <= 0 || input.shareBp > r.maxShareBp) return "error.amount";
  return null;
}

/** FRM-R54: bis 10 % neue Aktien zum aktuellen Kurs; danach Stimmung −5, höchstens einmal im Jahr. */
export function capitalRaise(state: GameState, data: GameData, input: CapitalRaiseInput): void {
  const st = state.stock;
  const fresh = mulBp(st.shares, input.shareBp);
  const proceeds = fresh * sharePrice(state, data);
  st.shares += fresh;
  st.publicShares += fresh;
  st.lastRaiseYear = yearOf(state);
  st.sentiment = clamp(st.sentiment + S(data).raise.delta, 0, 100);
  state.moneyCent += proceeds;
  log(state, "log.capitalRaise", { amount: proceeds });
}

/** FRM-R75: Anlegerstimmung ab 70 („begeistert“) gibt Bewerbern +10 %. */
export function stockApplicantsBp(state: GameState, data: GameData): Bp {
  return state.stock?.listed && state.stock.sentiment >= S(data).excitedFrom ? S(data).excitedApplicantsBp : BP_ONE;
}

/** FRM-R53: Sparprogramm senkt die Lohnkosten um 10 % für vier Quartale. */
export function savingsWageBp(state: GameState, data: GameData): Bp {
  return state.stock && state.week < state.stock.savingsUntilWeek ? BP_ONE - S(data).assembly.savingsBp : BP_ONE;
}

/**
 * FRM-R53: Hauptversammlung in der letzten Woche des Geschäftsjahres; unter S 30 eine Forderung als Pflicht-Entscheidung.
 * ANNAHME: Die Forderung wird aus dem Strom „finanzen“ gezogen; „Sparte verkaufen“ gibt es erst mit Töchtern (6b.4),
 * bis dahin und ohne laufendes Projekt fordert die Versammlung das Sparprogramm.
 */
export function assemblyStep(state: GameState, data: GameData): void {
  const st = state.stock;
  if (!st.listed || dateOf(state.startYear, state.week).weekOfYear !== WEEKS_PER_YEAR - 1 || st.lastAssemblyYear === yearOf(state)) return;
  st.lastAssemblyYear = yearOf(state);
  if (st.sentiment >= S(data).assembly.below) return;
  const running = state.projects.some((p) => p.status === "laeuft");
  const demands = running ? ["sparprogramm", "projektStreichen"] as const : ["sparprogramm"] as const;
  const demand = demands[stream(state, "finanzen").int(demands.length)]!;
  addEvent(state, data, { kind: "hauptversammlung", scope: "welt", projectId: null, options: ["annehmen", "ablehnen"], defaultOption: "ablehnen", stockDemand: demand });
}

export function applyAssembly(state: GameState, data: GameData, event: GameEvent, option: string): void {
  const a = S(data).assembly;
  const st = state.stock;
  if (option !== "annehmen") {
    st.sentiment = clamp(st.sentiment + a.reject, 0, 100);
    return;
  }
  st.sentiment = clamp(st.sentiment + a.accept, 0, 100);
  if (event.stockDemand === "projektStreichen") {
    const p = [...state.projects].filter((x) => x.status === "laeuft").sort((x, y) => y.id - x.id)[0];
    if (p) {
      cancelProject(state, data, p);
      return;
    }
  }
  st.savingsUntilWeek = state.week + a.savingsWeeks;
  for (const p of state.people) p.moraleBp = clamp(p.moraleBp + a.moraleBp, 0, BP_ONE);
}
