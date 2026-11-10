// Prognose der Wertung vor dem Release: Grundlage für Playtests (PRD-R30 bis PRD-R32, S02 5.7) und den
// Vorschlag im Prototyp-Review (PRD-R33, PRD-R34).
import { audienceOf } from "./zielgruppe";
import { focusByPerson } from "../personal";
import { type Bp, clamp, mulBp } from "../../num";
import type { GameData, GameState, Person, Project, ScoreBar, ScoreFactor } from "../../model/types";
import { stream } from "../../rng";
import { dateOf } from "../../calendar";
import { areaProfile, computeQuality, expectedProfileFor, profileFactor, totalEffort } from "./quality";
import { computeScore, playerQNorm, trendOf } from "./score";
import { expectedBugsAtRelease, progressShare, projectPeople } from "./projects";
import { assignedTo, log } from "../firma";
import { minScore, preset } from "../finanzen";
import { playtestSpreadFactor, qualityBonus } from "../buero";

export interface Forecast {
  /** Wahre Prognose W: Wertung ohne Tagesform der Presse, mit den bis zum Release erwarteten Bugs. */
  scoreBp: Bp;
  bars: ScoreBar[];
}

function forecastPeople(state: GameState, data: GameData, project: Project): Person[] {
  const byId = new Map<number, Person>();
  for (const p of [...projectPeople(state, data, project), ...assignedTo(state, project.id)]) byId.set(p.id, p);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export function forecast(state: GameState, data: GameData, project: Project, features = project.features, extraEffortBp = 0): Forecast {
  const bugsBp = expectedBugsAtRelease(data, project, features, extraEffortBp, preset(state, data).bugRateBp);
  const qb = computeQuality(data, state, {
    genre: project.genre, subgenre: project.subgenre, theme: project.theme, scope: project.scope, features, bugsBp,
    people: forecastPeople(state, data, project), engineLevels: project.engine.levels, makeshift: project.makeshift,
    leadershipBp: project.leadershipBp, equipment: qualityBonus(state, data), focus: focusByPerson(state),
    // Etappe 6c.5 bis 6c.7: Säulen, Phasen-Schwerpunkt (bisherige Arbeit) und Politur.
    pillars: project.pillars, phaseQualityBp: project.phaseQualityBp, polish: project.polish,
  });
  const s = computeScore(data, qb, mulBp(playerQNorm(data, state, project.scope), audienceOf(data, project.audience).expectationBp), trendOf(state, project.genre, project.theme), 0, minScore(state, data, qb.themeFitBp));
  return { scoreBp: s.scoreBp, bars: s.bars };
}

// ---------- Playtests ----------

/** Welche Phasenwerte (S, V) gelten. ANNAHME (E5): kleine Projekte ab Produktion, ab 60 % mit den Beta-Werten. */
export function playtestPhase(data: GameData, project: Project): string | null {
  if (project.scope === "klein") {
    if (project.phase !== "produktion") return null;
    return progressShare(project) >= data.playtests.smallLateFromBp ? "beta" : "produktion";
  }
  return project.phase in data.playtests.phases ? project.phase : null;
}

export function validatePlaytest(state: GameState, data: GameData, projectId: number): string | null {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return "error.unknownProject";
  if (project.status !== "laeuft") return "error.playtestPhase";
  if (project.playtestWeeksLeft > 0) return "error.playtestRunning";
  if (playtestPhase(data, project) === null) return "error.playtestPhase";
  return null;
}

const WEAKNESS_FACTORS: ScoreFactor[] = ["features", "team", "profil", "passung", "saeulen", "engine", "bugs", "zeitgeist"];

/**
 * PRD-R31: Spanne um W + v mit einmal gezogenem Versatz v ∈ [−V; +V] aus dem Strom „projekte“, dazu die drei
 * größten Schwächen (negativste Balken). Kostet eine Woche Fortschritt (PRD-R30, intern).
 */
export function runPlaytest(state: GameState, data: GameData, project: Project): void {
  const phase = playtestPhase(data, project)!;
  const { offsetBp } = data.playtests.phases[phase]!;
  // Tabelle 5.4: Testlabor −20 % Spanne.
  // BTR-R29: Analytics macht Prognosen genauer (ANNAHME: auch die Playtest-Spanne).
  const analytics = data.liveService.analytics.forecastSpreadBp[state.operations?.analytics ?? "keine"];
  const spreadBp = mulBp(mulBp(data.playtests.phases[phase]!.spreadBp, playtestSpreadFactor(state, data)), analytics);
  const w = forecast(state, data, project);
  const v = stream(state, "projekte").range(-offsetBp, offsetBp);
  const lo = data.quality.scoreMinBp;
  const hi = data.quality.scoreMaxBp;
  const weaknesses = w.bars
    .filter((b) => WEAKNESS_FACTORS.includes(b.factor) && b.value < 0)
    .sort((a, b) => a.value - b.value)
    .slice(0, 3)
    .map((b) => b.factor);
  project.playtests.push({
    week: state.week, phase,
    lowBp: clamp(w.scoreBp + v - spreadBp, lo, hi), highBp: clamp(w.scoreBp + v + spreadBp, lo, hi),
    trueBp: w.scoreBp, offsetBp: v, weaknesses,
  });
  project.playtestWeeksLeft = data.playtests.weeks;
  log(state, "log.playtest", { project: project.title });
}

// ---------- Prototyp-Review ----------

export interface SwapSuggestion {
  from: string;
  to: string;
  forecastBefore: Bp;
  forecastAfter: Bp;
}

/**
 * PRD-R34: Das Team schlägt einen Karten-Tausch vor, der das Bereichsprofil verbessert. Unter diesen Tauschen wählt es
 * den mit der besten Prognose (inklusive Zusatzaufwand); bei Gleichstand den ersten nach Feature-ID (TEC-R09).
 * ANNAHME: Es schlägt nur vor, wenn die Prognose dadurch steigt; sonst gibt es null zurück.
 */
export function suggestSwap(state: GameState, data: GameData, project: Project): SwapSuggestion | null {
  const expected = expectedProfileFor(state, data, project.genre, project.subgenre);
  const current = profileFactor(data, areaProfile(data, project.features, project.scope), expected).deviation;
  const year = dateOf(state.startYear, state.week).year;
  const candidates = data.features.filter((f) => !project.features.includes(f.id) && f.availableFrom <= year).map((f) => f.id);
  const before = forecast(state, data, project).scoreBp;
  let best: SwapSuggestion | null = null;
  for (const from of project.features) {
    for (const to of candidates) {
      const features = project.features.map((f) => (f === from ? to : f)).sort();
      const deviation = profileFactor(data, areaProfile(data, features, project.scope), expected).deviation;
      if (deviation >= current) continue;
      const after = forecast(state, data, project, features, reviewExtraEffort(data, project, features)).scoreBp;
      if (after > before && (!best || after > best.forecastAfter)) best = { from, to, forecastBefore: before, forecastAfter: after };
    }
  }
  return best;
}

/** Zusatzaufwand eines Tauschs: Differenz der Feature-Aufwände plus Nacharbeit (data: reviewReworkEffortBp). */
export function reviewExtraEffort(data: GameData, project: Project, features: readonly string[]): Bp {
  return totalEffort(data, features, project.scope) - totalEffort(data, project.features, project.scope) + data.events.reviewReworkEffortBp;
}
