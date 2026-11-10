// S05 Early Access (Etappe 5.11): MKT-R47 bis MKT-R50. Verkauf ab der Beta zu 60–80 % des Preises, doppelter
// Interessenzerfall, Zufriedenheit am Update-Takt, Release von 1.0 als zweiter Release-Abend.
import { type Bp, BP_ONE, clamp, mulBp, mulDiv } from "../../num";
import type { EarlyAccessInput, GameData, GameState, Project } from "../../model/types";
import { dateOf, isFirstWeekOfMonth } from "../../calendar";
import { digitalNetPerUnit, grossPrice, platformById, priceDemandFactor, weeklyDemand } from "../markt";
import { ledgerNow } from "../finanzen";
import { forecast, playtestPhase } from "./forecast";
import { assignedTo, log } from "../firma";
import { brandById } from "../marken";

function ea(data: GameData) {
  return data.release.earlyAccess;
}

/** MKT-R47: ab 2013, PC als Lead-Plattform, ab der Beta, noch nicht veröffentlicht. */
export function validateEarlyAccess(state: GameState, data: GameData, input: EarlyAccessInput): string | null {
  const p = state.projects.find((x) => x.id === input.projectId);
  if (!p) return "error.unknownProject";
  if (dateOf(state.startYear, state.week).year < ea(data).fromYear) return "error.tooEarly";
  if (p.earlyAccess) return "error.earlyAccessRunning";
  if (p.status !== "laeuft" && p.status !== "pausiert") return "error.notInDevelopment";
  if (platformById(data, p.platforms[0]!).type !== "pc") return "error.earlyAccessPc";
  if (playtestPhase(data, p) !== "beta" && p.phase !== "beta") return "error.earlyAccessBeta";
  if (input.priceBp !== undefined && (!Number.isSafeInteger(input.priceBp) || input.priceBp < ea(data).priceMinBp || input.priceBp > ea(data).priceMaxBp)) return "error.earlyAccessPrice";
  return null;
}

export function startEarlyAccess(state: GameState, data: GameData, input: EarlyAccessInput): void {
  const p = state.projects.find((x) => x.id === input.projectId)!;
  p.earlyAccess = {
    startWeek: state.week, priceBp: input.priceBp ?? ea(data).priceDefaultBp, scoreBp: forecast(state, data, p).scoreBp,
    sold: 0, revenueCent: 0, lastUpdateWeek: state.week, updates: 0, satisfactionBp: ea(data).startSatisfactionBp, endWeek: null,
  };
  log(state, "log.earlyAccessStart", { project: p.title });
}

/** Preis im Early Access (Cent). */
export function earlyAccessPrice(state: GameState, data: GameData, p: Project): number {
  return mulBp(grossPrice(data, p, dateOf(state.startYear, state.week).year), p.earlyAccess!.priceBp);
}

/**
 * Tick-Schritt 7, nach den Verkäufen: Early-Access-Verkäufe (nur digital, ohne Auflage), doppelter Interessenzerfall
 * (MKT-R48), Updates im Takt mit etwas Teamzeit und die Zufriedenheit der Käufer (MKT-R49).
 */
export function earlyAccessStep(state: GameState, data: GameData): void {
  const e = ea(data);
  for (const p of [...state.projects].sort((a, b) => a.id - b.id)) {
    const a = p.earlyAccess;
    if (!a || a.endWeek !== null || (p.status !== "laeuft" && p.status !== "pausiert" && p.status !== "bereit")) continue;
    const year = dateOf(state.startYear, state.week).year;
    const t = state.week - a.startWeek;
    const standard = grossPrice(data, p, year);
    const price = earlyAccessPrice(state, data, p);
    // MKT-R48: Zerfall doppelt so schnell (ANNAHME: auch die Kurve läuft mit doppelter Zeit).
    const units = mulBp(weeklyDemand(state, data, p, a.scoreBp, mulDiv(t, e.decayFactorBp, BP_ONE, 1), state.week), priceDemandFactor(data, price, standard));
    // Käufer verbrauchen das Interesse (Restnachfrage, MKT-V16); der Rest zerfällt doppelt.
    const m = p.marketing;
    m.interest = Math.max(0, m.interest - units);
    m.interest -= mulBp(m.interest, mulBp(data.marketing.decayBp, e.decayFactorBp - BP_ONE));
    const revenue = units * digitalNetPerUnit(state, data, { type: p.type, platforms: p.platforms, sales: { priceCent: price } }, a.revenueCent);
    a.sold += units;
    a.revenueCent += revenue;
    state.moneyCent += revenue;
    ledgerNow(state).income.sales += revenue;
    // MKT-R49: Ein Update je Takt, solange das Team am Spiel arbeitet; jedes kostet etwas Aufwand.
    if (p.status === "laeuft" && assignedTo(state, p.id).length > 0 && state.week - a.lastUpdateWeek >= e.updateWeeks) {
      a.lastUpdateWeek = state.week;
      a.updates += 1;
      p.effortTotalBp += mulBp(p.effortTotalBp, e.updateEffortBp);
    }
    if (isFirstWeekOfMonth(state.startYear, state.week)) {
      const since = state.week - a.lastUpdateWeek;
      let d: Bp = 0;
      if (since <= e.updateWeeks) d = e.updateSatisfactionBp;
      if (since > e.pauseWeeks) d = -e.pauseSatisfactionBp;
      a.satisfactionBp = clamp(a.satisfactionBp + d, 0, BP_ONE);
    }
  }
}

/**
 * MKT-R50: Release von 1.0. Neue Wertung (normaler Release-Abend), voller Preis; die Zufriedenheit startet aus dem
 * Mittel von Early Access und Spielerwertung (ANNAHME). Liegt die neue Wertung unter der Early-Access-Wertung, sinkt die
 * Marke wie bei einer Enttäuschung (Ruf −10, brands.reputationFlopBp).
 */
export function finishEarlyAccess(state: GameState, data: GameData, p: Project): void {
  const a = p.earlyAccess;
  if (!a || a.endWeek !== null || !p.result) return;
  a.endWeek = state.week;
  if (p.ops) p.ops.satisfactionBp = clamp(mulDiv(p.ops.satisfactionBp + a.satisfactionBp, 1, 2, 1), 0, BP_ONE);
  const brand = brandById(state, p.brandId);
  if (p.result.scoreBp < a.scoreBp && brand) brand.reputationBp = Math.max(0, brand.reputationBp - data.brands.reputationFlopBp);
  log(state, "log.earlyAccessRelease", { project: p.title, before: a.scoreBp, after: p.result.scoreBp, sold: a.sold });
}
