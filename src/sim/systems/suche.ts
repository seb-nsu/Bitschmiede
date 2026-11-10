// S07 FRM-R76 (Etappe 5.13): gezielte Personalsuche. Bereich und Mindeststärke, Gebühr und Dauer, danach 1–3
// Kandidaten als Fokus-Karte mit 4 Wochen Frist. Höchstens eine Suche gleichzeitig.
import { divInt, mulBp, mulDiv } from "../num";
import type { Applicant, AreaMap, GameData, GameEvent, GameState, SearchInput } from "../model/types";
import { AREAS } from "../model/types";
import { dateOf } from "../calendar";
import { stream } from "../rng";
import { anchorValue, ledgerNow, preset, scaleToYear } from "./finanzen";
import { addEvent } from "./ereignisse";
import { drawApplicant, log, maxPersonsNow, strengthLift } from "./firma";
import { hireApplicant } from "./personal";

function year(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

/** FRM-R76, FRM-T32: Gebühr = 2 Monatsgehälter auf Marktniveau × (1 + (m − 40) / 25). */
export function searchFee(state: GameState, data: GameData, min: number): number {
  const s = data.staff.search;
  const salary = mulBp(anchorValue(data.economy.salaryAnchorsCent, year(state)), preset(state, data).costFactorBp);
  return mulDiv(salary * s.feeSalaries, s.feeDivisor + min - s.minStrength, s.feeDivisor, 1);
}

/** FRM-R76, FRM-T32: Dauer = 2 + (m − 40) / 10 Wochen (abgeschnitten). */
export function searchWeeks(data: GameData, min: number): number {
  const s = data.staff.search;
  return s.baseWeeks + divInt(min - s.minStrength, s.weeksDivisor, 1);
}

function running(state: GameState): boolean {
  return state.search != null || [...state.events, ...state.eventQueue].some((e) => e.kind === "suche");
}

export function validateSearch(state: GameState, data: GameData, input: SearchInput): string | null {
  const s = data.staff.search;
  if (!AREAS.includes(input.area)) return "error.unknownArea";
  if (!Number.isSafeInteger(input.minStrength) || input.minStrength < s.minStrength || input.minStrength > s.maxStrength) return "error.amount";
  if (running(state)) return "error.searchRunning";
  return null;
}

/** Gebühr sofort; die Kandidaten kommen nach der Dauer (FRM-R76, auch wenn keiner gefunden wird). */
export function startSearch(state: GameState, data: GameData, input: SearchInput): void {
  const fee = searchFee(state, data, input.minStrength);
  state.moneyCent -= fee;
  ledgerNow(state).costs.other += fee;
  state.search = { area: input.area, minStrength: input.minStrength, readyWeek: state.week + searchWeeks(data, input.minStrength), feeCent: fee };
}

/** ANNAHME: Bewerberqualität = Mitte von Grundstärke und Schwerpunkt-Bonus der Bewerbungen (Daten), ohne Standort-Pool. */
export function applicantQuality(data: GameData, state: GameState): number {
  const a = data.applications;
  const q = divInt(a.baseStrength[0] + a.baseStrength[1] + a.focusBonus[0] + a.focusBonus[1], 2, 1);
  // Balancing 1.0: Bewerber wachsen mit der Branche (strengthLift).
  const lift = strengthLift(state, data);
  return Math.min(100, mulDiv(q, lift.num, lift.den, 1));
}

/** Wöchentlich (Tick-Schritt 11): fertige Suche liefert 1–3 Kandidaten mit Bereich ≥ m oder mit 50 % keinen. */
export function searchStep(state: GameState, data: GameData): void {
  const search = state.search;
  if (!search || state.week < search.readyWeek) return;
  state.search = null;
  const s = data.staff.search;
  const rng = stream(state, "personal");
  const reachable = search.minStrength <= applicantQuality(data, state) + s.reachBonus;
  let count = reachable ? rng.range(1, s.maxCandidates) : rng.uniformBp() < s.farChanceBp ? 1 : 0;
  if (count === 0) {
    log(state, "log.searchEmpty", { area: search.area, min: search.minStrength });
    return;
  }
  const candidates: Applicant[] = [];
  for (; count > 0; count--) {
    const base = drawApplicant(state, data, rng);
    const strength: AreaMap = { ...base.strength };
    strength[search.area] = Math.min(100, rng.range(search.minStrength, search.minStrength + s.spread));
    const lift = strengthLift(state, data);
    const salary1980 = data.applications.salaryBaseCent + mulDiv(strength[search.area], lift.den, lift.num, 1) * data.applications.salaryPerFocusPointCent;
    candidates.push({ ...base, strength, focus: search.area, salaryCent: scaleToYear(data, salary1980, year(state)) });
  }
  const event = addEvent(state, data, {
    kind: "suche", scope: "projekt", projectId: null, candidates,
    options: [...candidates.map((_, i) => `einstellen:${i}`), "keinen"], defaultOption: "keinen",
  });
  event.deadlineWeek = state.week + s.deadlineWeeks;
}

export function applySearchDecision(state: GameState, data: GameData, event: GameEvent, option: string): void {
  if (!option.startsWith("einstellen:") || !event.candidates) return;
  const c = event.candidates[Number(option.slice("einstellen:".length))];
  if (!c || state.people.length >= maxPersonsNow(state, data)) return;
  hireApplicant(state, data, c);
  log(state, "log.hired", { person: c.name });
}
