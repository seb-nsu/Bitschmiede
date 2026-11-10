// KI-Entscheidungen nach S14: Nutzwert mit Antwortkurven (6.1), Auswahl mit Temperatur (6.2) oder Bauchentscheidung
// (KI-R55, KI-R56), Wahrnehmung (6.3, KI-R07 bis KI-R12), Lernen (6.7, KI-R51 bis KI-R54), Strategiekonferenz
// (KI-R13, KI-R14, KI-R21, KI-R24) und Entscheidungsprotokoll (KI-R04, KI-R59, KI-R84).
import { type Bp, BP_ONE, clamp, divBp, divInt, expNegBp, mulBp, mulDiv, tanhBp } from "../../num";
import { ANALYTICS_LEVELS } from "../../model/types";
import type {
  AiBudget, AiConsideration, AiCurve, AiDecision, AiDifficulty, AiStudio, GameData, GameState,
} from "../../model/types";
import { dateOf } from "../../calendar";
import type { Rng } from "../../rng";
import { platformBase, qRel } from "../markt";
import { trendOf } from "../produkte/score";
import { liveStudios, monthlyCost, studioPeople, studioRng } from "./studios";
import { rivalConference } from "./rivalen";
import { freezeDeep } from "../../clone";

export const CONSIDERATIONS: readonly AiConsideration[] = ["qualitaet", "trend", "marke", "kosten", "risiko", "plattform", "dichte", "schwerpunkt", "ziel"];

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

/** KI-R69, KI-R70: Parameter der Stufe; die Stufe ist das Preset des Spielstands. */
export function difficulty(state: GameState, data: GameData): AiDifficulty {
  return data.ai.difficulty[state.settings.preset] ?? data.ai.difficulty.normal!;
}

/** Rückstand des KI-Hausmittels: Archetyp plus Stufe (leichter = ältere Technik der KI). */
export function aiEngineLag(state: GameState, data: GameData, archetypeLag: number): number {
  return archetypeLag + difficulty(state, data).engineLagAddYears;
}

// ---------- 6.1 Nutzwert ----------

/** Antwortkurve: Rohwert → 0–10.000 bp (linear, invers, logistisch über tanh, Stufe). */
export function curveValue(c: AiCurve, raw: Bp): Bp {
  switch (c.curve) {
    case "linear":
    case "invers": {
      const lo = c.loBp ?? 0;
      const v = clamp(divBp(raw - lo, Math.max(1, (c.hiBp ?? BP_ONE) - lo), 1), 0, BP_ONE);
      return c.curve === "linear" ? v : BP_ONE - v;
    }
    case "logistisch":
      return clamp(divInt(BP_ONE + tanhBp(divInt(mulBp(c.steepBp ?? BP_ONE, raw - (c.midBp ?? BP_ONE)), 2, 1)), 2, 1), 0, BP_ONE);
    case "stufe":
      return raw >= (c.midBp ?? BP_ONE) ? BP_ONE : 0;
  }
}

/**
 * w_k = w_k^Archetyp · m_k^Charakter (· m_k^Stimmung, mit den Rivalen in 3.5). Formel 5.5 liefert w_q (Qualität und
 * Trend), w_m, w_k, w_r, w_p; Konkurrenzdichte und Schwerpunkt haben eigene Gewichte (considerations.json).
 * KI-R52: Nach einem eigenen Flop wiegt das Risiko zwei Jahre schwerer.
 */
export function considerationWeights(state: GameState, data: GameData, studio: AiStudio): Record<AiConsideration, Bp> {
  const w = data.ai.archetypes[studio.archetype].weightsBp;
  const extra = data.ai.considerations.extraWeightsBp;
  const out: Record<AiConsideration, Bp> = {
    qualitaet: w.q, trend: w.q, marke: w.m, kosten: w.k, risiko: w.r, plattform: w.p, dichte: extra.dichte, schwerpunkt: extra.schwerpunkt,
    // KI-R16: Zielbeitrag nur für Rivalen mit aktivem Ziel.
    ziel: studio.rival && studio.rival.goals.length > 0 ? data.ai.rivals.goalWeightBp : extra.ziel,
  };
  for (const t of studio.traits) {
    const m = data.ai.traits[t]?.weightsBp ?? {};
    for (const k of CONSIDERATIONS) if (m[k] !== undefined) out[k] = mulBp(out[k], m[k]!);
  }
  if (state.week < studio.riskShyUntilWeek) out.risiko = mulBp(out.risiko, data.ai.considerations.flopRiskWeightBp);
  // KI-R62: Stimmung des Chefs verschiebt das Risikogewicht.
  if (studio.rival) out.risiko = mulBp(out.risiko, data.ai.rivals.mood.riskBp[studio.rival.mood]);
  return out;
}

export interface Rated {
  utilityBp: Bp;
  /** Beitrag w_k · f_k je Erwägung, für die Gründe im Protokoll. */
  values: Record<AiConsideration, Bp>;
  reasons: string[];
}

/** U(o) = Σ w_k · f_k(x_k) / Σ w_k, 0–10.000 bp (S14 6.1). */
export function rate(data: GameData, weights: Record<AiConsideration, Bp>, raw: Record<AiConsideration, Bp>): Rated {
  const curves = data.ai.considerations.curves;
  const values = {} as Record<AiConsideration, Bp>;
  let sum = 0;
  let sumW = 0;
  const parts: [AiConsideration, Bp][] = [];
  for (const k of CONSIDERATIONS) {
    const f = curveValue(curves[k], raw[k]);
    values[k] = f;
    const part = mulBp(weights[k], f);
    sum += part;
    sumW += weights[k];
    parts.push([k, part]);
  }
  parts.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return { utilityBp: divBp(sum, Math.max(1, sumW), 1), values, reasons: parts.slice(0, 3).map(([k]) => `ai.reason.${k}`) };
}

// ---------- 6.2 Auswahl ----------

export interface Choice {
  index: number;
  viaGut: boolean;
}

/**
 * S14 6.2: Softmax über die acht besten Optionen mit Temperatur τ; mit der Wahrscheinlichkeit der Stufe statt dessen
 * eine Bauchentscheidung unter den fünf besten nach dem Charakter-Wert (KI-R56). Beide Zufallszahlen werden immer
 * gezogen, damit der Strom nicht von der Verzweigung abhängt.
 */
export function selectOption(data: GameData, diff: AiDifficulty, options: readonly { utilityBp: Bp; gutBp: Bp }[], rng: Rng): Choice | null {
  if (options.length === 0) return null;
  const c = data.ai.considerations;
  const gutRoll = rng.uniformBp();
  const pick = rng.uniformBp();
  const order = options.map((o, i) => ({ ...o, i })).sort((a, b) => b.utilityBp - a.utilityBp || a.i - b.i);
  if (gutRoll < diff.gutBp) {
    const top = order.slice(0, c.topForGut).sort((a, b) => b.gutBp - a.gutBp || b.utilityBp - a.utilityBp || a.i - b.i);
    return { index: top[0]!.i, viaGut: true };
  }
  const top = order.slice(0, c.topForSoftmax);
  const max = top[0]!.utilityBp;
  const weights = top.map((o) => expNegBp(mulDiv(max - o.utilityBp, BP_ONE, Math.max(1, diff.temperatureBp), 1)));
  const total = weights.reduce((s, w) => s + w, 0);
  let target = mulDiv(pick, total, BP_ONE, 1);
  for (let k = 0; k < top.length; k++) {
    target -= weights[k]!;
    if (target < 0) return { index: top[k]!.i, viaGut: false };
  }
  return { index: top[top.length - 1]!.i, viaGut: false };
}

// ---------- 6.3 Wahrnehmung ----------

/**
 * KI-R09: Eigene Analytics-Stufe halbiert den Wahrnehmungsfehler je Stufe, höchstens bis auf σ von Hardcore.
 * ANNAHME: KI-Studios nutzen Analytics ab 2010 nach Größe (liveservice.json, analytics.aiLevel).
 */
export function perceptionSd(state: GameState, data: GameData, studio: AiStudio): Bp {
  const sd = difficulty(state, data).perceptionSdBp;
  const a = data.liveService.analytics;
  if (dateOf(state.startYear, state.week).year < a.fromYear) return sd;
  const steps = ANALYTICS_LEVELS.indexOf(a.aiLevel[studio.size]);
  let out = sd;
  for (let i = 0; i < steps; i++) out = divInt(out, 2, 1);
  return Math.max(out, Math.min(sd, (data.ai.difficulty.hardcore ?? difficulty(state, data)).perceptionSdBp));
}

/** Wahrnehmungsfaktor clamp(1 + σ · z, 1 − 2σ, 1 + 2σ) für einen gezogenen z-Wert (bp). */
export function perceptionFactor(sdBp: Bp, zBp: Bp): Bp {
  return clamp(BP_ONE + mulBp(sdBp, zBp), BP_ONE - 2 * sdBp, BP_ONE + 2 * sdBp);
}

/**
 * KI-R07, KI-R08: Öffentliche Größen sieht ein Akteur mit einem Fehler, der je Größe und Quartal einmal gezogen wird
 * (Strom „ki“ der Firma). Ohne Analytics (Etappe 5) gilt σ der Stufe (KI-R09).
 */
export function perceive(state: GameState, data: GameData, studio: AiStudio, key: string, value: number): number {
  const quarter = divInt(state.week, 13, 1);
  if (studio.perception.quarter !== quarter) studio.perception = { quarter, z: {} };
  let z = studio.perception.z[key];
  if (z === undefined) {
    z = studioRng(state, studio).normal(0, BP_ONE);
    studio.perception.z[key] = z;
  }
  return mulBp(value, perceptionFactor(perceptionSd(state, data, studio), z));
}

// ---------- Überzeugungen und Lernen ----------

const genreThemeIndex = new WeakMap<GameData, Map<string, number>>();

/** Platz von Genre × Thema in der Überzeugungsliste (Genre-Reihenfolge × Themen der Daten); eine Zahlenliste statt
 * eines Objekts hält die wöchentliche Kopie des Spielstands klein (TEC-R50). */
export function genreThemeKey(data: GameData, genre: string, theme: string): number {
  let idx = genreThemeIndex.get(data);
  if (!idx) {
    idx = new Map();
    let i = 0;
    for (const g of data.genres) for (const t of data.themes) idx.set(`${g.id}/${t.id}`, i++);
    genreThemeIndex.set(data, idx);
  }
  return idx.get(`${genre}/${theme}`) ?? -1;
}

/** KI-R12: Überzeugungen starten bei der wahren Beliebtheit mit dem Wahrnehmungsfehler der Stufe. */
export function initBeliefs(state: GameState, data: GameData, studio: AiStudio, rng: Rng): void {
  const sd = perceptionSd(state, data, studio);
  for (const g of data.genres) {
    for (const t of data.themes) {
      studio.beliefs.genreTheme[genreThemeKey(data, g.id, t.id)] = mulBp(trendOf(state, g.id, t.id), perceptionFactor(sd, rng.normal(0, BP_ONE)));
    }
  }
}

export function belief(data: GameData, studio: AiStudio, genre: string, theme: string): Bp {
  return studio.beliefs.genreTheme[genreThemeKey(data, genre, theme)] ?? BP_ONE;
}

export function platformBelief(studio: AiStudio, platform: string): Bp {
  return studio.beliefs.platform[platform] ?? BP_ONE;
}

/**
 * S14 6.7: r = clamp(½ · Wertung / Wertung_erw + ½ · Verkäufe / Verkäufe_erw, 0, 2).
 * ANNAHME: Wertung_erw = 5,5 (Mitte der Skala); Verkäufe / Verkäufe_erw ist die öffentlich sichtbare Abweichung der
 * Startverkäufe von einem neutralen Spiel derselben Wertung, also Beliebtheit von Genre × Thema · Q_rel / Q_rel(5,5).
 */
export function learningSignal(state: GameState, data: GameData, genre: string, theme: string, scoreBp: Bp): Bp {
  const base = data.quality.scoreBaseBp;
  const sales = mulDiv(trendOf(state, genre, theme), qRel(data, scoreBp), Math.max(1, qRel(data, base)), 1);
  return clamp(divInt(divBp(scoreBp, base, 1) + sales, 2, 1), 0, 2 * BP_ONE);
}

/**
 * KI-R51 bis KI-R53: Nach jedem Release passen alle Akteure ihre Überzeugung zu Genre × Thema und den Plattformen an,
 * b += λ · (r − b); eigene Releases mit doppelter Rate (höchstens 4.000 bp). Ein eigener Flop macht zwei Jahre vorsichtig.
 */
export function learnFromRelease(state: GameState, data: GameData, r: { genre: string; theme: string; platforms: readonly string[]; scoreBp: Bp }, ownerId: number | null): void {
  const lambda = difficulty(state, data).learningBp;
  const signal = learningSignal(state, data, r.genre, r.theme, r.scoreBp);
  const key = genreThemeKey(data, r.genre, r.theme);
  for (const s of liveStudios(state)) {
    const l = s.id === ownerId ? Math.min(2 * lambda, 4000) : lambda;
    if (l > 0 && key >= 0) {
      const b = s.beliefs.genreTheme[key] ?? BP_ONE;
      s.beliefs.genreTheme[key] = b + mulBp(l, signal - b);
      for (const p of r.platforms) {
        const pb = s.beliefs.platform[p] ?? BP_ONE;
        s.beliefs.platform[p] = pb + mulBp(l, signal - pb);
      }
    }
    if (s.id === ownerId && r.scoreBp < data.brands.flopScoreBp) s.riskShyUntilWeek = state.week + data.ai.considerations.flopRiskWeeks;
  }
}

// ---------- Protokoll ----------

/** KI-R04, KI-R84: Eintrag mit den drei stärksten Erwägungen; je Akteur die letzten 50. */
export function logDecision(data: GameData, studio: AiStudio, entry: AiDecision): void {
  studio.log.push(freezeDeep(entry));
  const max = data.ai.considerations.logSize;
  if (studio.log.length > max) studio.log.splice(0, studio.log.length - max);
}

// ---------- Rücklage und Budget ----------

/** KI-R32: Rücklage in Monatskosten nach Archetyp, „Sparsam“ +2. */
export function reserveCent(state: GameState, data: GameData, studio: AiStudio): number {
  const months = data.ai.archetypes[studio.archetype].reserveMonths + studio.traits.reduce((s, t) => s + (data.ai.traits[t]?.reserveMonths ?? 0), 0);
  return months * monthlyCost(state, data, studio);
}

/** KI-R13, KI-R14: Budget aus der Vorlage; Sparsam und eine Kasse unter der Rücklage schieben 10 % zur Rücklage. Summe 10.000 bp (KI-T10). */
export function planBudget(state: GameState, data: GameData, studio: AiStudio): AiBudget {
  const b = { ...data.ai.archetypes[studio.archetype].budgetBp };
  let shift = studio.traits.includes("sparsam") ? 1000 : 0;
  if (studio.cashCent < reserveCent(state, data, studio)) shift += 1000;
  shift = Math.min(shift, b.projekte);
  b.projekte -= shift;
  b.ruecklage += shift;
  return b;
}

// ---------- Strategiekonferenz ----------

/**
 * KI-R13, KI-R14, KI-R81: Akteure ab 50 Personen tagen jährlich in den Wochen 1–4 (nach Firmen-ID gestaffelt),
 * kleinere alle zwei Jahre mit der Vorlage ihres Archetyps. KI-R24: außerordentlich, wenn die Kasse um mehr als 30 %
 * vom Stand der letzten Konferenz abweicht (höchstens einmal im Jahr).
 */
export function conferenceDue(state: GameState, data: GameData, studio: AiStudio): boolean {
  const c = data.ai.considerations;
  const d = dateOf(state.startYear, state.week);
  if (studio.lastConferenceWeek < 0) return true;
  const ref = Math.max(1, Math.abs(studio.conferenceCashCent));
  const swing = Math.abs(studio.cashCent - studio.conferenceCashCent) > mulBp(ref, c.extraConferenceSwingBp);
  if (swing && studio.extraConferenceYear !== d.year && state.week - studio.lastConferenceWeek >= 13) {
    studio.extraConferenceYear = d.year;
    return true;
  }
  if (d.weekOfYear !== studio.id % 4) return false;
  const yearly = studioPeople(studio) >= c.conferencePeople;
  return yearly || (d.year - dateOf(state.startYear, studio.foundedWeek).year) % c.conferenceEveryYearsSmall === 0;
}

/**
 * KI-R13, KI-R21: Die Konferenz wählt zwei Schwerpunkt-Genres (Überzeugung zur besten Kombination, Lieblingsgenres
 * bevorzugt), eine Plattform-Wette (erwartete Basis im Planungshorizont · Überzeugung) und die Budgetverteilung.
 * Engine-Kurs folgt mit dem Lizenzmarkt (3.4). Jede Wahl läuft über Formel 6.2.
 */
export function holdConference(state: GameState, data: GameData, studio: AiStudio): void {
  const rng = studioRng(state, studio);
  const diff = difficulty(state, data);
  const y = yearOf(state);
  const curves = data.ai.considerations.curves;
  let viaGut = false;
  const focus: string[] = [];
  for (let k = 0; k < 2; k++) {
    const options = data.genres.filter((g) => !focus.includes(g.id)).map((g) => {
      const best = Math.max(...data.themes.map((t) => belief(data, studio, g.id, t.id)));
      const fav = studio.favGenres.includes(g.id) ? data.ai.considerations.favoriteRawBp : 0;
      return { id: g.id, utilityBp: divInt(curveValue(curves.trend, best) + curveValue(curves.schwerpunkt, fav), 2, 1), gutBp: fav };
    });
    const c = selectOption(data, diff, options, rng)!;
    viaGut ||= c.viaGut;
    focus.push(options[c.index]!.id);
  }
  // KI-R18: Plattformen, die im Planungshorizont erscheinen, zählen mit ihrer erwarteten Basis.
  const horizon = y + diff.horizonYears;
  const candidates = data.platforms.filter((p) => p.releaseYear <= horizon && p.endYear >= y + 1);
  const bets = candidates.map((p) => {
    const base = perceive(state, data, studio, `basis.${p.id}`, platformBase(p, Math.min(horizon, p.endYear)));
    return { id: p.id, raw: mulBp(base, platformBelief(studio, p.id)) };
  });
  const maxBet = Math.max(1, ...bets.map((b) => b.raw));
  const betOptions = bets.map((b) => ({ id: b.id, utilityBp: curveValue(curves.plattform, divBp(b.raw, maxBet, 1)), gutBp: studio.traits.includes("visionaer") ? BP_ONE - divBp(b.raw, maxBet, 1) : 0 }));
  const bet = selectOption(data, diff, betOptions, rng);
  viaGut ||= bet?.viaGut ?? false;
  studio.focusGenres = focus;
  studio.platformBet = bet ? betOptions[bet.index]!.id : null;
  studio.budgetBp = planBudget(state, data, studio);
  studio.lastConferenceWeek = state.week;
  studio.conferenceCashCent = studio.cashCent;
  rivalConference(state, data, studio);
  logDecision(data, studio, {
    week: state.week, domain: "konferenz", choice: `${focus.join("+")}|${studio.platformBet ?? "-"}`,
    utilityBp: 0, reasons: ["ai.reason.schwerpunkt", "ai.reason.plattform", "ai.reason.budget"], viaGut,
  });
}

/** KI-R51: Releases des Spielers dieser Woche sind öffentliche Signale wie KI-Releases (Tick-Schritt 6). */
export function learnFromPlayerReleases(state: GameState, data: GameData): void {
  for (const p of [...state.projects].sort((a, b) => a.id - b.id)) {
    if (p.result?.week !== state.week || p.status !== "veroeffentlicht") continue;
    learnFromRelease(state, data, { genre: p.genre, theme: p.theme, platforms: p.platforms, scoreBp: p.result.scoreBp }, null);
  }
}

/** Tick-Schritt 3: strategische Ebene aller lebenden Akteure nach Firmen-ID. */
export function strategyStep(state: GameState, data: GameData): void {
  for (const s of liveStudios(state)) if (conferenceDue(state, data, s)) holdConference(state, data, s);
}
