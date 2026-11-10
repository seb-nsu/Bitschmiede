// Pressewertung nach S02 5.2 mit Wasserfall (PRD-R51, PRD-R54 bis PRD-R57, A34, UI-R104).
import { type Bp, BP_ONE, clamp, divBp, mulBp, tanhBp } from "../../num";
import type { GameData, GameState, QualityBreakdown, Scope, ScoreBar } from "../../model/types";
import type { Rng } from "../../rng";
import { dateOf } from "../../calendar";
import { anchorValue, preset } from "../finanzen";

/** PRD-R57: Presse-Strenge verschiebt Q_erw um 8 % je Stufe. */
export function effectiveQNorm(data: GameData, state: GameState, scope: Scope): Bp {
  return mulBp(state.qNorm[scope], BP_ONE + data.quality.pressStrictnessStepBp * state.settings.pressStrictness);
}

/**
 * Q_erw für Spiele des Spielers: dazu der Epochen-Faktor (pressEraAnchors, gewichtet je Stufe mit pressEraWeightBp).
 * Die Presse erwartet vom Spieler in den 80ern mehr, als der Median der schwachen KI-Releases hergibt; KI-Releases
 * bleiben ohne Faktor, sonst dünnt der frühe Markt aus.
 */
export function playerQNorm(data: GameData, state: GameState, scope: Scope): Bp {
  const raw = anchorValue(data.quality.pressEraAnchors, dateOf(state.startYear, state.week).year);
  return mulBp(effectiveQNorm(data, state, scope), BP_ONE + mulBp(raw - BP_ONE, preset(state, data).pressEraWeightBp));
}

/** 5,5 + 4,5 · tanh(k · (Q / Q_erw − 1)), noch ohne Zeitgeist, Tagesform und Begrenzung. */
export function scoreFromQ(data: GameData, q: Bp, qNorm: Bp): Bp {
  const ratio = divBp(q, qNorm, 1) - BP_ONE;
  return data.quality.scoreBaseBp + mulBp(data.quality.scoreAmplitudeBp, tanhBp(mulBp(data.quality.steepnessBp, ratio)));
}

/** PRD-R54: Z = clamp(−0,3; 0,3; T − 1). */
export function zeitgeist(data: GameData, trendBp: Bp): Bp {
  return clamp(trendBp - BP_ONE, -data.quality.zeitgeistMaxBp, data.quality.zeitgeistMaxBp);
}

/** Trend-Faktor von Genre und Thema (S08 vereinfacht für Etappe 0). */
export function trendOf(state: GameState, genre: string, theme: string): Bp {
  return mulBp(state.trends.genre[genre] ?? BP_ONE, state.trends.theme[theme] ?? BP_ONE);
}

/** PRD-R55: ε = σ · Φ⁻¹(u) aus dem Strom „projekte“. Bei σ = 0 wird trotzdem gezogen, damit der Strom gleich bleibt. */
export function pressMood(data: GameData, state: GameState, rng: Rng): Bp {
  return rng.normal(0, data.quality.pressRandomSdBp[state.settings.pressRandom]);
}

export interface ScoreResult {
  baseBp: Bp;
  bars: ScoreBar[];
  scoreBp: Bp;
}

/**
 * Wasserfall: Ausgangswert 5,5 (Q = Q_erw), dann je Faktor die Änderung der Wertung, wenn er zu Q hinzukommt.
 * ANNAHME: Wegen tanh hängt die Größe der Balken von der Reihenfolge ab; sie folgt der Formel von links nach rechts.
 * Die Summe der Balken ergibt immer genau die Wertung.
 */
export function computeScore(
  data: GameData, qb: QualityBreakdown, qNorm: Bp, trendBp: Bp, moodBp: Bp, minScoreBp: Bp | null = null,
): ScoreResult {
  const base = data.quality.scoreBaseBp;
  const sFeatures = scoreFromQ(data, qb.qFeatures, qNorm);
  const sTeam = scoreFromQ(data, qb.qTeam, qNorm);
  const sProfile = scoreFromQ(data, qb.qProfile, qNorm);
  const sFit = scoreFromQ(data, qb.qFit, qNorm);
  const sPillars = scoreFromQ(data, qb.qPillars ?? qb.qFit, qNorm);
  const sEngine = scoreFromQ(data, qb.qEngine, qNorm);
  const sFinalQ = scoreFromQ(data, qb.q, qNorm);
  const z = zeitgeist(data, trendBp);
  const raw = sFinalQ + z + moodBp;
  // PRD-R52: Mindestwertung auf den leichten Stufen; erscheint im Balken „Begrenzung“.
  const score = clamp(Math.max(raw, minScoreBp ?? raw), data.quality.scoreMinBp, data.quality.scoreMaxBp);
  const bars: ScoreBar[] = [
    { factor: "features", value: sFeatures - base },
    { factor: "team", value: sTeam - sFeatures },
    { factor: "profil", value: sProfile - sTeam },
    { factor: "passung", value: sFit - sProfile },
    { factor: "saeulen", value: sPillars - sFit },
    { factor: "engine", value: sEngine - sPillars },
    { factor: "bugs", value: sFinalQ - sEngine },
    { factor: "zeitgeist", value: z },
    { factor: "tagesform", value: moodBp },
    { factor: "begrenzung", value: score - raw },
  ];
  return { baseBp: base, bars, scoreBp: score };
}
