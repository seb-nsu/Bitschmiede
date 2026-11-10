// Übernahmen als Minimalversion (S09 UEB-R01 bis UEB-R42; Etappe 6b.3 bis 6b.5): Sondieren, Prüfen, Bieten,
// Gegenangebot, Kauf, Integration, Tochter mit Konto und Vorgaben, Schließen, KI-Käufer.
import { type Bp, BP_ONE, type Cent, clamp, divInt, mulBp, mulDiv } from "../num";
import type {
  AcqFinding, AcqTarget, AcquireInput, AcquisitionDeal, AcquisitionState, AiStudio, Directives, FindingType, GameData, GameEvent, GameState,
  Scope, Subsidiary, SubsidiaryInput,
} from "../model/types";
import { SCOPES } from "../model/types";
import { dateOf, isFirstWeekOfQuarter, WEEKS_PER_YEAR } from "../calendar";
import { type Rng, stream } from "../rng";
import { anchorValue, creditLimit, ledgerNow, monthCosts } from "./finanzen";
import { log } from "./firma";
import { chronicle } from "./katalog";
import { marketPhase } from "./marktphasen";
import { studioValue, valueRange } from "./firmenwert";
import { addEvent } from "./ereignisse";
import { stockEvent } from "./boerse";
import { liveStudios, monthlyCost, studioPeople } from "./ki/studios";

const PLAYER = 0;

function A(data: GameData) {
  return data.acquisitions;
}

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

export function emptyAcquisitions(): AcquisitionState {
  return { deals: [], nextDealId: 1, targets: {}, aiOverreach: 0 };
}

/** Wert aus einer Stufentabelle [[ab, Wert], …] nach Personenzahl. */
function bySize(table: [number, number][], people: number): number {
  let v = table[0]![1];
  for (const [from, x] of table) if (people >= from) v = x;
  return v;
}

function studioById(state: GameState, id: number): AiStudio | undefined {
  return state.ai.studios.find((s) => s.id === id);
}

/** Töchter eines Eigentümers (0 = Spieler), nach ID. */
export function subsidiaries(state: GameState, ownerId: number): AiStudio[] {
  return liveStudios(state).filter((s) => s.parent?.ownerId === ownerId).sort((a, b) => a.id - b.id);
}

// ---------- Freischaltung und Wissen über das Ziel (UEB-R01, UEB-R05) ----------

/** UEB-R01, A02 mit Entscheidung Projektleitung 02.11.2026: ab 2005 und 60 Personen (Daten); Schalter „Übernahmen“ in den Einstellungen. */
export function acquisitionsUnlocked(state: GameState, data: GameData): boolean {
  return state.settings.acquisitions !== false && yearOf(state) >= A(data).unlockYear && state.people.length >= A(data).unlockPeople;
}

/** UEB-R05: Versatz und Befunde werden beim ersten Sondieren einmal gezogen (Strom „acquisitions“) und bleiben fest. */
function targetInfo(state: GameState, data: GameData, studioId: number): AcqTarget {
  const key = String(studioId);
  const known = state.acquisitions.targets[key];
  if (known) return known;
  const rng = stream(state, "acquisitions");
  const r = A(data).range;
  const offsetBp = rng.range(-r.offsetBp, r.offsetBp);
  const f = A(data).findings;
  const types = Object.keys(f.types).sort() as FindingType[];
  const findings: AcqFinding[] = [];
  for (let i = 0; i < f.countMax; i++) {
    if (rng.uniformBp() >= f.chanceBp) continue;
    const type = types[rng.int(types.length)]!;
    const [lo, hi] = f.types[type];
    findings.push({ type, impactBp: rng.range(lo, hi) });
  }
  const t: AcqTarget = { offsetBp, findings, blockedUntil: 0 };
  state.acquisitions.targets[key] = t;
  return t;
}

/** Wahrer Wert W mit Befunden (Befunde in bp des Werts ohne Befunde). */
export function trueValue(state: GameState, data: GameData, studio: AiStudio): Cent {
  const base = studioValue(state, data, studio).totalCent;
  const t = state.acquisitions.targets[String(studio.id)];
  const findings = (t?.findings ?? []).reduce((s, f) => s + mulBp(base, f.impactBp), 0);
  return Math.max(0, base + findings);
}

/** UEB-R05, UEB-R06: angezeigte Spanne (ohne Prüfung ±40 % um die versetzte Mitte, mit Prüfung ±10 % um W). */
export function shownRange(state: GameState, data: GameData, deal: AcquisitionDeal) {
  const studio = studioById(state, deal.targetId)!;
  const t = targetInfo(state, data, studio.id);
  const r = A(data).range;
  const checked = deal.diligence === "fertig";
  return valueRange(trueValue(state, data, studio), checked ? 0 : t.offsetBp, checked ? r.checkedWidthBp : r.widthBp);
}

/** Formel P_min = W · (1 + k + b · n) · f_Stimmung; ein Rivale mit Groll verlangt vom Spieler +15 % (S09 Abschnitt 7). */
export function minPrice(state: GameState, data: GameData, studio: AiStudio, bidders: number, buyerId: number = PLAYER): Cent {
  const p = A(data).price;
  const w = trueValue(state, data, studio);
  let price = mulBp(mulBp(w, BP_ONE + p.controlBp + p.bidderBp * bidders), p.phaseBp[marketPhase(state)]);
  if (buyerId === PLAYER && studio.rival && studio.rival.relationBp < 0) price = mulBp(price, BP_ONE + p.rivalGrudgeBp);
  return price;
}

/** UEB-R06: Prüfungskosten 150 bp des angezeigten Mittelwerts, mindestens 50.000 USD. */
export function diligenceCost(state: GameState, data: GameData, deal: AcquisitionDeal): Cent {
  return Math.max(A(data).diligence.minCostCent, mulBp(shownRange(state, data, deal).mid, A(data).diligence.costBp));
}

// ---------- Eingaben (UEB-R03 bis UEB-R12) ----------

function openDeal(state: GameState, targetId: number): AcquisitionDeal | undefined {
  return state.acquisitions.deals.find((d) => d.targetId === targetId && d.phase !== "abgeschlossen" && d.phase !== "gescheitert");
}

export function validateAcquire(state: GameState, data: GameData, input: AcquireInput): string | null {
  if (!acquisitionsUnlocked(state, data)) return "error.acqLocked";
  if (input.action === "sondieren") {
    const s = input.targetId === undefined ? undefined : studioById(state, input.targetId);
    if (!s || s.closedWeek !== null) return "error.acqTarget";
    if (s.parent) return "error.acqOwned";
    if ((state.acquisitions.targets[String(s.id)]?.blockedUntil ?? 0) > state.week) return "error.acqBlocked";
    return openDeal(state, s.id) ? "error.acqOpen" : null;
  }
  const deal = state.acquisitions.deals.find((d) => d.id === input.dealId);
  if (!deal || deal.phase === "abgeschlossen" || deal.phase === "gescheitert") return "error.acqDeal";
  const studio = studioById(state, deal.targetId);
  if (!studio || studio.closedWeek !== null || studio.parent) return "error.acqTarget";
  switch (input.action) {
    case "pruefen":
      if (deal.diligence !== "keine" || deal.phase !== "sondiert") return "error.acqDiligence";
      return state.moneyCent >= diligenceCost(state, data, deal) ? null : "error.notEnoughMoney";
    case "bieten": {
      if (deal.phase === "warten" || deal.diligence === "laufend") return "error.acqWaiting";
      const bid = input.bidCent ?? 0;
      const loan = input.loanCent ?? 0;
      const retention = input.retentionCent ?? 0;
      if (![bid, loan, retention].every((x) => Number.isSafeInteger(x) && x >= 0) || bid <= 0 || loan > bid) return "error.amount";
      // UEB-R11: Bargeld plus Kredit nach den Kreditregeln aus S07.
      if (state.finance.loanCent + loan > creditLimit(state, data).limitCent) return "error.loanLimit";
      return bid - loan + retention <= state.moneyCent ? null : "error.notEnoughMoney";
    }
    case "annehmen":
      if (deal.phase !== "gegenangebot") return "error.acqDeal";
      return deal.counterCent - deal.loanCent + deal.retentionCent <= state.moneyCent ? null : "error.notEnoughMoney";
    case "zurueckziehen":
      return null;
  }
  return "error.acqDeal";
}

export function applyAcquire(state: GameState, data: GameData, input: AcquireInput): void {
  if (input.action === "sondieren") {
    const s = studioById(state, input.targetId!)!;
    targetInfo(state, data, s.id);
    const deal: AcquisitionDeal = {
      id: state.acquisitions.nextDealId++, targetId: s.id, phase: "sondiert", diligence: "keine", diligenceWeeksLeft: 0,
      bidCent: 0, loanCent: 0, retentionCent: 0, counterCent: 0, bidders: [], answerWeek: 0,
    };
    state.acquisitions.deals.push(deal);
    log(state, "log.acqProbe", { studio: s.name });
    return;
  }
  const deal = state.acquisitions.deals.find((d) => d.id === input.dealId)!;
  const studio = studioById(state, deal.targetId)!;
  switch (input.action) {
    case "pruefen": {
      const cost = diligenceCost(state, data, deal);
      state.moneyCent -= cost;
      ledgerNow(state).costs.other += cost;
      deal.diligence = "laufend";
      deal.diligenceWeeksLeft = bySize(A(data).diligence.weeksBySize, studioPeople(studio));
      log(state, "log.acqDiligence", { studio: studio.name, cost, n: deal.diligenceWeeksLeft });
      break;
    }
    case "bieten":
      deal.bidCent = input.bidCent!;
      deal.loanCent = input.loanCent ?? 0;
      deal.retentionCent = input.retentionCent ?? 0;
      deal.phase = "warten";
      deal.answerWeek = state.week + A(data).price.answerWeeks;
      if (deal.bidders.length === 0) drawBidders(state, data, studio, deal);
      break;
    case "annehmen":
      deal.bidCent = deal.counterCent;
      closeDeal(state, data, deal, studio);
      break;
    case "zurueckziehen":
      deal.phase = "gescheitert";
      state.events = state.events.filter((e) => e.dealId !== deal.id);
      log(state, "log.acqWithdrawn", { studio: studio.name });
      break;
  }
}

/** UEB-R10, S09 Abschnitt 7: Jeder interessierte KI-Konzern prüft einmal, ob er mitbietet (höchstens drei). */
function drawBidders(state: GameState, data: GameData, target: AiStudio, deal: AcquisitionDeal): void {
  const p = A(data).price;
  const rng = stream(state, "acquisitions");
  for (const s of aiBuyers(state, data)) {
    if (deal.bidders.length >= p.maxBidders) break;
    if (s.id === target.id || rng.uniformBp() >= p.bidderChanceBp) continue;
    if (s.cashCent < mulBp(minPrice(state, data, target, 0, s.id), A(data).ai.cashFactorBp)) continue;
    deal.bidders.push(s.id);
    log(state, "log.acqBidder", { studio: target.name, bidder: s.name });
  }
}

/** UEB-R08, UEB-R09: Antwort der Zielfirma eine Woche nach dem Gebot. */
function answerStep(state: GameState, data: GameData): void {
  const p = A(data).price;
  for (const deal of state.acquisitions.deals) {
    const studio = studioById(state, deal.targetId);
    if (!studio || studio.closedWeek !== null || (studio.parent && deal.phase !== "abgeschlossen" && deal.phase !== "gescheitert")) {
      if (deal.phase !== "abgeschlossen" && deal.phase !== "gescheitert") deal.phase = "gescheitert";
      continue;
    }
    if (deal.phase === "sondiert" && deal.diligence === "laufend" && --deal.diligenceWeeksLeft <= 0) {
      deal.diligence = "fertig";
      log(state, "log.acqDiligenceDone", { studio: studio.name, n: state.acquisitions.targets[String(studio.id)]?.findings.length ?? 0 });
    }
    if (deal.phase !== "warten" || state.week < deal.answerWeek) continue;
    const min = minPrice(state, data, studio, deal.bidders.length);
    if (deal.bidCent >= min) {
      closeDeal(state, data, deal, studio);
    } else if (deal.bidCent >= mulBp(min, p.counterFromBp)) {
      deal.phase = "gegenangebot";
      deal.counterCent = min;
      addEvent(state, data, { kind: "gegenangebot", scope: "welt", projectId: null, options: ["annehmen", "zurueckziehen"], defaultOption: "zurueckziehen", dealId: deal.id, counterCent: min });
    } else {
      deal.phase = "gescheitert";
      state.acquisitions.targets[String(studio.id)]!.blockedUntil = state.week + p.blockWeeks;
      log(state, "log.acqRejected", { studio: studio.name, n: p.blockWeeks });
    }
  }
}

/** Fokus-Karte „Gegenangebot von …“: annehmen kauft zum Gegenangebot, sonst zurückziehen. */
export function applyCounterDecision(state: GameState, data: GameData, event: GameEvent, option: string): void {
  const deal = state.acquisitions.deals.find((d) => d.id === event.dealId);
  if (!deal || deal.phase !== "gegenangebot") return;
  const input: AcquireInput = { type: "acquire", action: option === "annehmen" ? "annehmen" : "zurueckziehen", dealId: deal.id };
  if (validateAcquire(state, data, input) === null) applyAcquire(state, data, input);
  else deal.phase = "gescheitert";
}

// ---------- Kauf und Tochter (UEB-R15 bis UEB-R29, UEB-R41) ----------

/** FRM-R71 (kleinste Form, Plan 6b Annahme 4): Kulturmerkmale aus Größe, Archetyp, Engine und Crunch. */
export function cultureOf(state: GameState, data: GameData, ownerId: number): string[] {
  if (ownerId === PLAYER) {
    const tags: string[] = [];
    const n = state.people.length;
    if (n >= 200) tags.push("konzern");
    if (n < 20) tags.push("indieGeist");
    if (state.engine) tags.push("technikgetrieben");
    if (state.staff.crunchWeeks.filter((w) => w > state.week - WEEKS_PER_YEAR).length >= 26) tags.push("crunchKultur");
    if (state.staff.crunch === "nie") tags.push("familiaer");
    if (tags.length === 0) tags.push("kreativ");
    return tags.slice(0, 3);
  }
  const s = studioById(state, ownerId)!;
  const tags: string[] = [];
  if (studioPeople(s) >= 200 || s.archetype === "aaa" || s.archetype === "publisher") tags.push("konzern");
  if (s.archetype === "indie") tags.push("indieGeist");
  if (s.archetype === "engine" || s.ownEngineId !== null) tags.push("technikgetrieben");
  if (s.traits.includes("visionaer") || s.traits.includes("perfektionist")) tags.push("kreativ");
  if (s.traits.includes("draufgaenger") && s.archetype === "aaa") tags.push("crunchKultur");
  if (tags.length === 0) tags.push("familiaer");
  return tags.slice(0, 3);
}

/** UEB-R20: Fit = gemeinsame Merkmale / Merkmale der Zielfirma. */
export function cultureFit(buyer: readonly string[], target: readonly string[]): Bp {
  if (target.length === 0) return BP_ONE;
  return mulDiv(target.filter((t) => buyer.includes(t)).length, BP_ONE, target.length, 1);
}

/** Vorschlag der Vorgaben nach Kultur (S09 Abschnitt 6): selbstständig, ohne Listen. */
function defaultDirectives(): Directives {
  return { autonomy: "selbststaendig", genres: [], maxScope: null };
}

/** UEB-R15 bis UEB-R20: Abschluss; die Firma wird Tochter des Käufers und startet ihre Integration. */
export function becomeSubsidiary(state: GameState, data: GameData, studio: AiStudio, buyerId: number, priceCent: Cent, retentionCent: Cent, findings: AcqFinding[]): Subsidiary {
  const i = A(data).integration;
  const fit = cultureFit(cultureOf(state, data, buyerId), cultureOf(state, data, studio.id));
  let weeks = bySize(i.weeksBySize, studioPeople(studio));
  let morale = 7000;
  if (fit < i.cultureMinFitBp) {
    weeks = mulBp(weeks, BP_ONE + i.cultureLongerBp);
    morale += i.cultureMoraleBp;
  }
  studio.parent = {
    ownerId: buyerId, acquiredWeek: state.week, purchaseCent: priceCent, bookCent: priceCent,
    integration: { progressBp: 0, weeks, state: "gut" }, moraleBp: clamp(morale, 0, BP_ONE), cultureFitBp: fit, directives: defaultDirectives(),
    retentionCent, retentionUntilWeek: retentionCent > 0 ? state.week + A(data).leave.retentionWeeks : 0, transferBp: A(data).transferBp,
    quarterCashStart: Math.max(0, studio.cashCent), pendingFindings: findings, leftCount: 0,
  };
  // MRK-R45: Ein gekaufter Rivale ist kein Rivale mehr.
  if (buyerId === PLAYER) studio.rival = null;
  return studio.parent;
}

function closeDeal(state: GameState, data: GameData, deal: AcquisitionDeal, studio: AiStudio): void {
  const t = targetInfo(state, data, studio.id);
  const cash = deal.bidCent - deal.loanCent;
  state.moneyCent -= cash + deal.retentionCent;
  state.finance.loanCent += deal.loanCent;
  // UEB-R11: Der Kaufkredit läuft zu den Kreditregeln aus S07 (FRM-R39).
  if (deal.loanCent > 0) state.finance.loanRateBp = creditLimit(state, data).rateBp;
  const ledger = ledgerNow(state);
  ledger.costs.other += deal.retentionCent;
  deal.phase = "abgeschlossen";
  // UEB-R07: Ohne Prüfung werden Befunde erst nach dem Kauf wirksam.
  const hidden = deal.diligence === "fertig" ? [] : t.findings;
  becomeSubsidiary(state, data, studio, PLAYER, deal.bidCent, deal.retentionCent, hidden);
  stockEvent(state, data.stock.events.acquisition);
  log(state, "log.acqDone", { studio: studio.name, amount: deal.bidCent });
  chronicle(state, "log.acqDone", { studio: studio.name, amount: deal.bidCent });
}

/** UEB-R17: Integrationskapazität 1 + Studioleitungen, höchstens 4. ANNAHME: Jeder weitere Standort bringt eine Studioleitung. */
export function integrationCapacity(state: GameState, data: GameData, ownerId: number): number {
  const i = A(data).integration;
  if (ownerId !== PLAYER) return A(data).ai.capacity;
  return Math.min(i.capacityMax, i.capacityBase + state.locations.length);
}

function integrating(state: GameState, ownerId: number): AiStudio[] {
  return subsidiaries(state, ownerId).filter((s) => s.parent!.integration.progressBp < BP_ONE);
}

/** UEB-R16, UEB-R18, Formel ΔI: Integration je Woche; Überlast kostet Moral und Tempo, bei 4 über K steht sie still. */
function integrationStep(state: GameState, data: GameData): void {
  const i = A(data).integration;
  const owners = [...new Set(liveStudios(state).filter((s) => s.parent).map((s) => s.parent!.ownerId))].sort((a, b) => a - b);
  for (const owner of owners) {
    const list = integrating(state, owner);
    const over = Math.max(0, list.length - integrationCapacity(state, data, owner));
    const factor = Math.max(0, BP_ONE - i.overloadBp * over);
    for (const s of list) {
      const sub = s.parent!;
      sub.integration.progressBp = Math.min(BP_ONE, sub.integration.progressBp + mulDiv(BP_ONE, factor, sub.integration.weeks * BP_ONE, 1));
      if (over > 0) sub.moraleBp = Math.max(0, sub.moraleBp - i.moralePerWeekBp);
      const next = over >= 2 || sub.moraleBp < 3000 ? "chaos" : over > 0 || sub.cultureFitBp < i.cultureMinFitBp ? "angespannt" : "gut";
      if (next === "chaos" && sub.integration.state !== "chaos" && owner === PLAYER) log(state, "log.acqChaos", { studio: s.name });
      sub.integration.state = next;
      if (sub.integration.progressBp >= BP_ONE && owner === PLAYER) log(state, "log.acqIntegrated", { studio: s.name });
    }
  }
}

/** UEB-R18: Überlast verschiebt Termine der Tochter um 10 % (Tempo 0,9). */
export function subsidiaryTempoBp(state: GameState, data: GameData, studio: AiStudio): Bp {
  const sub = studio.parent;
  if (!sub || sub.integration.progressBp >= BP_ONE) return BP_ONE;
  const over = integrating(state, sub.ownerId).length - integrationCapacity(state, data, sub.ownerId);
  return over > 0 ? BP_ONE - A(data).integration.delayBp : BP_ONE;
}

/** UEB-R21: Synergien senken die laufenden Kosten um bis zu 10 %, linear ab 50 % Integration. */
export function synergyBp(data: GameData, studio: AiStudio): Bp {
  const sub = studio.parent;
  if (!sub) return 0;
  const from = A(data).synergyFromBp;
  if (sub.integration.progressBp < from) return 0;
  return mulDiv(A(data).synergyMaxBp, sub.integration.progressBp - from, BP_ONE - from, 1);
}

/** UEB-R26: Enge der Vorgaben 0 / 0,5 / 1. */
function narrowness(d: Directives): Bp {
  return d.autonomy === "gesteuert" ? BP_ONE : d.autonomy === "rahmen" ? 5000 : 0;
}

/** Formel q: Wechselneigung je Quartal, zwischen 0 und 10.000 bp (UEB-T14). */
/** UEB-R19, Formel q: Halteprämie, ab der die Wechselneigung ihren vollen Abschlag erreicht (ein Jahresgehalt der Firma). */
export function fullRetentionCent(state: GameState, data: GameData, studio: AiStudio): Cent {
  return anchorValue(data.economy.salaryAnchorsCent, yearOf(state)) * 12 * Math.max(1, studioPeople(studio));
}

export function leaveChance(state: GameState, data: GameData, studio: AiStudio): Bp {
  const l = A(data).leave;
  const sub = studio.parent!;
  const salary = fullRetentionCent(state, data, studio);
  const premium = state.week < sub.retentionUntilWeek ? Math.min(BP_ONE, mulDiv(sub.retentionCent, BP_ONE, salary, 1)) : 0;
  return clamp(l.q0Bp + mulBp(l.cultureBp, BP_ONE - sub.cultureFitBp) + mulBp(l.directiveBp, narrowness(sub.directives)) - mulBp(l.retentionBp, premium), 0, BP_ONE);
}

/**
 * Prüfung Fable 03.11.2026 (UEB-R19): Die Halteprämie läuft als Teil der Integration automatisch. Ist keine Prämie aktiv,
 * zahlt der Konzern autoRetentionShareBp eines Jahresgehalts der Tochter, wenn die Kasse das autoRetentionCashFactor-Fache trägt.
 */
function autoRetention(state: GameState, data: GameData, studio: AiStudio): void {
  const sub = studio.parent!;
  if (sub.ownerId !== PLAYER || sub.integration.progressBp >= BP_ONE || state.week < sub.retentionUntilWeek) return;
  const l = A(data).leave;
  const cent = mulBp(fullRetentionCent(state, data, studio), l.autoRetentionShareBp);
  if (cent <= 0 || state.moneyCent < cent * l.autoRetentionCashFactor) return;
  state.moneyCent -= cent;
  ledgerNow(state).costs.other += cent;
  sub.retentionCent = cent;
  sub.retentionUntilWeek = state.week + l.retentionWeeks;
  log(state, "log.acqAutoRetention", { studio: studio.name, amount: cent });
}

/** UEB-R19 (Plan 6b Annahme 3): Je Quartal verliert jedes Team der Tochter mit Wahrscheinlichkeit q eine Person. */
function leaveStep(state: GameState, data: GameData, studio: AiStudio, rng: Rng): void {
  if (studio.parent!.integration.progressBp >= BP_ONE) return;
  const q = leaveChance(state, data, studio);
  let lost = 0;
  for (const t of studio.teams) {
    if (t.size > 1 && rng.uniformBp() < q) {
      t.size -= 1;
      lost += 1;
    }
  }
  studio.parent!.leftCount += lost;
  if (lost > 0 && studio.parent!.ownerId === PLAYER) log(state, "log.acqLeft", { studio: studio.name, n: lost });
}

/** UEB-R41, FRM-R73: Am Quartalsende führt die Tochter den Anteil ihres Quartalsgewinns ab. */
function transferStep(state: GameState, data: GameData, studio: AiStudio): void {
  const sub = studio.parent!;
  const profit = studio.cashCent - sub.quarterCashStart;
  // ANNAHME: Die Abführung lässt der Tochter eine Reserve von warnMonths Monatskosten (wie UEB-R12 beim Konzern).
  const room = studio.cashCent - monthlyCost(state, data, studio) * A(data).warnMonths;
  if (profit > 0 && room > 0) {
    const amount = Math.min(room, mulBp(profit, sub.transferBp));
    studio.cashCent -= amount;
    if (sub.ownerId === PLAYER) {
      state.moneyCent += amount;
      const l = ledgerNow(state);
      l.income.konzern = (l.income.konzern ?? 0) + amount;
    } else {
      const owner = studioById(state, sub.ownerId);
      if (owner) owner.cashCent += amount;
    }
  }
  sub.quarterCashStart = studio.cashCent;
}

/** UEB-R07: Befunde eines Kaufs ohne Prüfung wirken nach dem Abschluss auf das Tochterkonto (ANNAHME) und den Buchwert. */
function findingsStep(state: GameState, studio: AiStudio): void {
  const sub = studio.parent!;
  if (sub.pendingFindings.length === 0) return;
  for (const f of sub.pendingFindings) {
    const impact = mulBp(sub.purchaseCent, f.impactBp);
    studio.cashCent += impact;
    sub.bookCent = Math.max(0, sub.bookCent + impact);
    if (sub.ownerId === PLAYER) log(state, "log.acqFinding", { studio: studio.name, finding: f.type, amount: impact });
  }
  sub.pendingFindings = [];
}

/** UEB-R23: Fällt der Buchwert unter 60 % des Kaufpreises, wird die Differenz zum Jahresende abgeschrieben. */
function writeDownStep(state: GameState, data: GameData, studio: AiStudio): void {
  const sub = studio.parent!;
  const value = studioValue(state, data, studio).totalCent;
  if (value >= mulBp(sub.purchaseCent, A(data).writeDownBelowBp) || value >= sub.bookCent) return;
  const amount = sub.bookCent - value;
  sub.bookCent = value;
  if (sub.ownerId !== PLAYER) return;
  const l = ledgerNow(state);
  l.costs.writeDown = (l.costs.writeDown ?? 0) + amount;
  log(state, "log.acqWriteDown", { studio: studio.name, amount });
}

/** Tick-Schritt nach den KI-Finanzen: Antworten, Integration, Befunde, Quartal (Abwanderung, Abführung), Jahresende. */
export function acquisitionStep(state: GameState, data: GameData): void {
  answerStep(state, data);
  integrationStep(state, data);
  const quarter = isFirstWeekOfQuarter(state.week);
  const yearEnd = dateOf(state.startYear, state.week).weekOfYear === WEEKS_PER_YEAR - 1;
  const rng = stream(state, "acquisitions");
  for (const s of liveStudios(state).filter((x) => x.parent).sort((a, b) => a.id - b.id)) {
    findingsStep(state, s);
    if (quarter) {
      autoRetention(state, data, s);
      leaveStep(state, data, s, rng);
      transferStep(state, data, s);
    }
    if (yearEnd) writeDownStep(state, data, s);
  }
  if (quarter) aiAcquisitionStep(state, data);
}

// ---------- Vorgaben, Konto und Schließen (UEB-R24 bis UEB-R29, UEB-R41) ----------

export function validateSubsidiary(state: GameState, data: GameData, input: SubsidiaryInput): string | null {
  const s = studioById(state, input.studioId);
  if (!s || s.closedWeek !== null || s.parent?.ownerId !== PLAYER) return "error.notSubsidiary";
  switch (input.action) {
    case "vorgaben": {
      const d = input.directives;
      if (!d || !["selbststaendig", "rahmen", "gesteuert"].includes(d.autonomy)) return "error.amount";
      if (d.genres.some((g) => !data.genres.some((x) => x.id === g))) return "error.amount";
      return d.maxScope === null || SCOPES.includes(d.maxScope) ? null : "error.amount";
    }
    case "zuschiessen":
      return Number.isSafeInteger(input.amountCent) && input.amountCent! > 0 && input.amountCent! <= state.moneyCent ? null : "error.amount";
    case "entnehmen":
      return Number.isSafeInteger(input.amountCent) && input.amountCent! > 0 && input.amountCent! <= s.cashCent ? null : "error.amount";
    case "halten":
      // UEB-R19, S09 Abschnitt 8: Halteprämien auch während der Integration.
      if (s.parent!.integration.progressBp >= BP_ONE) return "error.integrated";
      return Number.isSafeInteger(input.amountCent) && input.amountCent! > 0 && input.amountCent! <= state.moneyCent ? null : "error.amount";
    case "schliessen":
      return null;
  }
  return "error.amount";
}

export function applySubsidiary(state: GameState, data: GameData, input: SubsidiaryInput, close: (s: AiStudio) => void): void {
  const s = studioById(state, input.studioId)!;
  const sub = s.parent!;
  switch (input.action) {
    case "vorgaben": {
      const before = sub.directives.autonomy;
      sub.directives = { autonomy: input.directives!.autonomy, genres: [...input.directives!.genres].sort(), maxScope: input.directives!.maxScope };
      // UEB-R26: Gesteuert kostet dauerhaft 10 Punkte Moral (beim Wechsel hin, zurück beim Wechsel weg).
      const steered = A(data).steeredMoraleBp;
      if (before !== "gesteuert" && sub.directives.autonomy === "gesteuert") sub.moraleBp = clamp(sub.moraleBp + steered, 0, BP_ONE);
      if (before === "gesteuert" && sub.directives.autonomy !== "gesteuert") sub.moraleBp = clamp(sub.moraleBp - steered, 0, BP_ONE);
      break;
    }
    case "zuschiessen":
      state.moneyCent -= input.amountCent!;
      s.cashCent += input.amountCent!;
      sub.quarterCashStart += input.amountCent!;
      break;
    case "entnehmen":
      s.cashCent -= input.amountCent!;
      sub.quarterCashStart -= input.amountCent!;
      state.moneyCent += input.amountCent!;
      // UEB-R41: Eine Entnahme senkt die Moral der Tochter um 5 Punkte.
      sub.moraleBp = clamp(sub.moraleBp + A(data).withdrawMoraleBp, 0, BP_ONE);
      break;
    case "halten": {
      // UEB-R19: Eine Halteprämie senkt die Wechselneigung für 104 Wochen ab der Zahlung. ANNAHME: Prämien innerhalb
      // der laufenden Frist zählen zusammen, eine abgelaufene Frist beginnt mit der neuen Zahlung von vorn.
      state.moneyCent -= input.amountCent!;
      ledgerNow(state).costs.other += input.amountCent!;
      sub.retentionCent = state.week < sub.retentionUntilWeek ? sub.retentionCent + input.amountCent! : input.amountCent!;
      sub.retentionUntilWeek = state.week + A(data).leave.retentionWeeks;
      break;
    }
    case "schliessen": {
      // UEB-R28, UEB-R29: Marken bleiben im Konzern, laufende Projekte enden; Ruf −5 bis −20 nach Größe.
      for (const b of state.brands) if (b.ownerId === s.id) b.ownerId = PLAYER;
      const [lo, hi] = A(data).closeReputation;
      const loss = clamp(lo + mulDiv(hi - lo, studioPeople(s), 300, 1), lo, hi);
      state.studioReputationBp = Math.max(0, state.studioReputationBp - loss);
      log(state, "log.acqClosed", { studio: s.name });
      close(s);
      break;
    }
  }
}

/** UEB-R24, UEB-R26: Erlaubte Kandidaten einer Tochter mit Rahmen oder Steuerung (Genres, Höchstumfang). */
export function directiveAllows(studio: AiStudio, genre: string, scope: Scope): boolean {
  const d = studio.parent?.directives;
  if (!d || d.autonomy === "selbststaendig") return true;
  if (d.genres.length > 0 && !d.genres.includes(genre)) return false;
  return d.maxScope === null || SCOPES.indexOf(scope) <= SCOPES.indexOf(d.maxScope);
}

/** UEB-R35: Gebühren an die eigene Tochter entfallen. */
export function ownedByPlayer(state: GameState, studioId: number): boolean {
  return studioById(state, studioId)?.parent?.ownerId === PLAYER;
}

// ---------- KI-Käufer (UEB-R36, UEB-R37, UEB-R39) ----------

function aiBuyers(state: GameState, data: GameData): AiStudio[] {
  return liveStudios(state).filter((s) => !s.parent && A(data).ai.archetypes.includes(s.archetype)).sort((a, b) => a.id - b.id);
}

/**
 * S09 Abschnitt 7: KI-Konzerne prüfen einmal im Quartal ein Ziel, wenn ihr Bargeld 1,5 × den Mindestpreis deckt.
 * ANNAHME: Ziel ist das wertvollste eigenständige Studio bis maxTargetValue des eigenen Werts, das das Bargeld deckt; Gebot = Mindestpreis ×
 * (1,0 bis 1,4); Käufe über der Kapazität sind erlaubt (Überdehnung, UEB-R36). Den Spieler kauft die KI nie (UEB-R37).
 */
function aiAcquisitionStep(state: GameState, data: GameData): void {
  const a = A(data).ai;
  const rng = stream(state, "acquisitions");
  if (yearOf(state) < A(data).unlockYear || state.settings.acquisitions === false) return;
  for (const buyer of aiBuyers(state, data)) {
    if (rng.uniformBp() >= a.chancePerQuarterBp) continue;
    const own = studioValue(state, data, buyer).totalCent;
    const targets = liveStudios(state)
      .filter((s) => s.id !== buyer.id && !s.parent && !openDeal(state, s.id))
      .map((s) => ({ s, w: trueValue(state, data, s) }))
      .filter((x) => x.w > 0 && x.w <= mulBp(own, a.maxTargetValueBp))
      .map((x) => ({ ...x, min: minPrice(state, data, x.s, 0, buyer.id) }))
      .filter((x) => buyer.cashCent >= mulBp(x.min, a.cashFactorBp))
      .sort((x, y) => y.w - x.w || x.s.id - y.s.id);
    const target = targets[0];
    if (!target) continue;
    const min = target.min;
    const price = mulBp(min, rng.range(a.bidBp[0], a.bidBp[1]));
    buyer.cashCent -= price;
    becomeSubsidiary(state, data, target.s, buyer.id, price, 0, []);
    if (integrating(state, buyer.id).length > integrationCapacity(state, data, buyer.id)) state.acquisitions.aiOverreach += 1;
    log(state, "log.aiAcquired", { studio: target.s.name, buyer: buyer.name, amount: price });
    chronicle(state, "log.aiAcquired", { studio: target.s.name, buyer: buyer.name, amount: price });
  }
}

/** UEB-R12: Warnung, wenn ein Kauf das Bargeld unter die Kosten von drei Monaten drückt. */
export function acquisitionWarning(state: GameState, data: GameData, cashCent: Cent): boolean {
  // ANNAHME: Monatskosten = Durchschnitt der letzten drei Monate im Kostenbuch.
  const months = state.finance.ledger.slice(-3);
  const avg = months.length === 0 ? 0 : divInt(months.reduce((s, m) => s + monthCosts(m), 0), months.length, 1);
  return state.moneyCent - cashCent < avg * A(data).warnMonths;
}

