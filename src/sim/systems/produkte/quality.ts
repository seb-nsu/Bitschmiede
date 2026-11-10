// Qualität Q nach S02 5.1 mit Aufschlüsselung (PRD-R13, PRD-R28, PRD-R50, A26).
import { pillarEffects } from "./saeulen";
import { type Bp, BP_ONE, clamp, divBp, mulBp, mulDiv } from "../../num";
import { dateOf } from "../../calendar";
import {
  AREAS, type Area, type AreaMap, type FeatureContribution, type FeatureDef, type GameData,
  type GameState, type ModuleMap, type Person, type QualityBreakdown, type Scope, type SubgenreDef, type SynergyHit,
} from "../../model/types";
import { projectEngineFactor } from "../engine";

// TEC-R50: Index je Datensatz (die Daten sind eingefroren, der Index hängt am Feld-Objekt).
const featureIndex = new WeakMap<readonly FeatureDef[], Map<string, FeatureDef>>();

export function featureById(data: GameData, id: string): FeatureDef {
  let index = featureIndex.get(data.features);
  if (!index) {
    index = new Map(data.features.map((f) => [f.id, f]));
    featureIndex.set(data.features, index);
  }
  const f = index.get(id);
  if (!f) throw new Error(`Unbekanntes Feature ${id}`);
  return f;
}

function emptyAreas(): AreaMap {
  return { gameplay: 0, grafik: 0, sound: 0, story: 0, technik: 0 };
}

/** PRD-R28: Aufwand eines Features = Feature.effort · Umfangsfaktor (klein 0,4, mittel 1). */
export function scaledEffort(data: GameData, feature: FeatureDef, scope: Scope): AreaMap {
  const factor = data.projects.scopeEffortFactorBp[scope];
  const out = emptyAreas();
  for (const a of AREAS) out[a] = mulBp(feature.effort[a] ?? 0, factor);
  return out;
}

export function effortByArea(data: GameData, featureIds: readonly string[], scope: Scope): AreaMap {
  const sum = emptyAreas();
  for (const id of featureIds) {
    const e = scaledEffort(data, featureById(data, id), scope);
    for (const a of AREAS) sum[a] += e[a];
  }
  return sum;
}

export function totalEffort(data: GameData, featureIds: readonly string[], scope: Scope): Bp {
  const e = effortByArea(data, featureIds, scope);
  return AREAS.reduce((s, a) => s + e[a], 0);
}

/** PRD-R13: Bereichsprofil = Anteil des Aufwands je Bereich an der Summe aller Features. */
export function areaProfile(data: GameData, featureIds: readonly string[], scope: Scope): AreaMap {
  const e = effortByArea(data, featureIds, scope);
  const total = AREAS.reduce((s, a) => s + e[a], 0);
  const out = emptyAreas();
  for (const a of AREAS) out[a] = divBp(e[a], total, 1);
  return out;
}

/** Profil_Genre = 1 − α · ½ Σ |ist − erwartet| (S02 5.1). */
export function profileFactor(data: GameData, actual: AreaMap, expected: AreaMap): { deviation: Bp; factor: Bp } {
  let sum = 0;
  for (const a of AREAS) sum += Math.abs(actual[a] - expected[a]);
  const deviation = mulDiv(sum, 1, 2, 1);
  return { deviation, factor: clamp(BP_ONE - mulBp(data.quality.profileWeightBp, deviation), 0, BP_ONE) };
}

/** T_f = Stärke im Bereich / 100 · (1 + 0,2 · Erfahrung mit Genre und Engine), S02 5.1. */
export function teamExecution(data: GameData, person: Person, area: Area, genre: string): Bp {
  // ANNAHME: „Erfahrung mit Genre und Engine“ ist der Mittelwert beider Werte, jeweils 0–100 Punkte als 0–10.000 bp.
  const experience = mulDiv((person.experienceGenre[genre] ?? 0) + person.experienceEngine, 1, 2, 1);
  const strengthBp = person.strength[area] * 100;
  return mulBp(strengthBp, BP_ONE + mulBp(data.quality.teamExperienceWeightBp, experience));
}

/**
 * Konzept 0b, 3.1: Für jede Karte zählt die beste beteiligte Person in ihrem Bereich.
 * Etappe 6c.2: In einem Fachteam +10 % im Schwerpunkt, −10 % außerhalb (staff.teamFocus).
 */
export function bestExecution(data: GameData, people: readonly Person[], area: Area, genre: string, focus?: Readonly<Record<number, Area>>): Bp {
  const tf = data.staff.teamFocus;
  return people.reduce((best, p) => {
    const f = focus?.[p.id];
    const factor = f === undefined ? BP_ONE : BP_ONE + (f === area ? tf.inAreaBp : tf.outAreaBp);
    return Math.max(best, mulBp(teamExecution(data, p, area, genre), factor));
  }, 0);
}

/** A26: Merkmale verstärken oder stören sich paarweise. */
// Leistung (KI-R80): Synergien hängen nur von Daten und Feature-Menge ab; Zwischenspeicher je Datensatz.
const synergyCache = new WeakMap<GameData, Map<string, { hits: SynergyHit[]; total: Bp }>>();

export function synergies(data: GameData, featureIds: readonly string[]): { hits: SynergyHit[]; total: Bp } {
  const ids = [...featureIds].sort();
  let cache = synergyCache.get(data);
  if (!cache) synergyCache.set(data, (cache = new Map()));
  const key = ids.join(",");
  const hit = cache.get(key);
  if (hit) return { hits: hit.hits.map((h) => ({ ...h })), total: hit.total };
  if (cache.size > 20000) cache.clear();
  const result = computeSynergies(data, ids);
  cache.set(key, result);
  return { hits: result.hits.map((h) => ({ ...h })), total: result.total };
}

function computeSynergies(data: GameData, ids: readonly string[]): { hits: SynergyHit[]; total: Bp } {
  const hits: SynergyHit[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const fa = featureById(data, ids[i]!);
      const fb = featureById(data, ids[j]!);
      for (const rule of data.synergies) {
        const ab = fa.tags.includes(rule.a) && fb.tags.includes(rule.b);
        const ba = fa.tags.includes(rule.b) && fb.tags.includes(rule.a);
        if (ab || ba) hits.push({ a: fa.id, b: fb.id, tag: rule.a, otherTag: rule.b, bp: rule.bp });
      }
    }
  }
  const total = clamp(hits.reduce((s, h) => s + h.bp, 0), data.quality.synergyMinBp, data.quality.synergyMaxBp);
  return { hits, total };
}

/** Anteil verbliebener Bugs B = offen / (offen + c_B), S02 5.3. */
export function bugShare(data: GameData, bugsBp: Bp, scope: Scope): Bp {
  const half = data.bugs.halfValue[scope] * BP_ONE;
  return divBp(bugsBp, bugsBp + half, 1);
}

export interface QualityInput {
  genre: string;
  subgenre?: string | null;
  theme: string;
  scope: Scope;
  features: readonly string[];
  bugsBp: Bp;
  /** Personen, deren Stärke zählt (projects.ts: projectPeople). */
  people: readonly Person[];
  /** ENG-R10: Modulstufen der Engine im Projekt. */
  engineLevels: ModuleMap;
  /** ENG-R53: Karten mit Notlösung wirken mit 70 %. */
  makeshift?: readonly string[];
  /** FRM-R57: Führungsfaktor (Überlastung) auf die Teamqualität; fehlt = 1,0. */
  leadershipBp?: Bp;
  /** Tabelle 5.4: Qualitätsboni der Ausstattung je Bereich und für Animations-Features. */
  equipment?: { areas: Partial<Record<Area, Bp>>; features: Record<string, Bp> };
  /** Etappe 6c.2: Schwerpunkt der Fachteams je Person (personal.ts: focusByPerson). */
  focus?: Readonly<Record<number, Area>>;
  /** Etappe 6c.5: Design-Säulen des Projekts. */
  pillars?: readonly string[];
  /** Etappe 6c.7: Politur-Bonus je Bereich (wie die Ausstattung). */
  polish?: Partial<Record<Area, Bp>>;
  /** Etappe 6c.6: Qualitätsfaktor aus dem Phasen-Schwerpunkt; fehlt = 1,0. */
  phaseQualityBp?: Bp;
}

/**
 * PRD-R16: Grundwert nach Alterung. Pro Jahr nach Erscheinen des Nachfolgers 15 % weniger, höchstens bis 30 %.
 * Gezählt werden volle Jahre (Jahr minus Erscheinungsjahr des Nachfolgers).
 */
export function agedValue(data: GameData, feature: FeatureDef, year: number): Bp {
  if (!feature.successor) return feature.baseValue;
  const successor = featureIndex.get(data.features)?.get(feature.successor) ?? data.features.find((f) => f.id === feature.successor);
  if (!successor || year < successor.availableFrom) return feature.baseValue;
  const factor = clamp(BP_ONE - data.quality.featureAgingPerYearBp * (year - successor.availableFrom), data.quality.featureAgingMinBp, BP_ONE);
  return mulBp(feature.baseValue, factor);
}

export function subgenreById(data: GameData, id: string | null | undefined): SubgenreDef | null {
  return id ? (data.subgenres.find((x) => x.id === id) ?? null) : null;
}

/**
 * ANNAHME (Untergenre, OFFENE-FRAGEN): Erwartungsprofil des Genres in dieser Welt plus Verschiebung des Untergenres,
 * Bereiche nicht unter 0, wieder auf 10.000 bp normiert.
 */
export function expectedProfileFor(state: GameState, data: GameData, genre: string, subgenre: string | null): AreaMap {
  const base = state.world.expectedProfile[genre]!;
  const sub = subgenreById(data, subgenre);
  if (!sub) return base;
  const raw = {} as AreaMap;
  for (const a of AREAS) raw[a] = Math.max(0, base[a] + (sub.profileShiftBp[a] ?? 0));
  const total = AREAS.reduce((sum, a) => sum + raw[a], 0);
  const out = {} as AreaMap;
  for (const a of AREAS) out[a] = mulDiv(raw[a], BP_ONE, total, 1);
  let largest: Area = AREAS[0];
  for (const a of AREAS) if (out[a] > out[largest]) largest = a;
  out[largest] += BP_ONE - AREAS.reduce((sum, a) => sum + out[a], 0);
  return out;
}

/** ANNAHME (Untergenre): Passung Genre–Thema dieser Welt, mit dem Bonus des Untergenres, in den Grenzen der Passung. */
export function themeFitFor(state: GameState, data: GameData, genre: string, subgenre: string | null, theme: string): Bp {
  const fit = state.world.themeFit[genre]![theme]!;
  const bonus = subgenreById(data, subgenre)?.themeBonusBp[theme] ?? 0;
  return bonus === 0 ? fit : clamp(mulBp(fit, BP_ONE + bonus), data.quality.themeFitMinBp, data.quality.themeFitMaxBp);
}

/**
 * PRD-R50: Q = (Σ q_f · T_f) · Synergie · Profil · P · Säulen (6c.5) · E · (1 − B), mit Zwischenstufen für den Wasserfall.
 * Der Trend steht bewusst nicht in Q (PRD-R54).
 */
export function computeQuality(data: GameData, state: GameState, input: QualityInput): QualityBreakdown {
  const referenceTeamBp = data.quality.referenceStrength * 100;
  const contributions: FeatureContribution[] = [...input.features].sort().map((id) => {
    const f = featureById(data, id);
    const teamBp = bestExecution(data, input.people, f.area, input.genre, input.focus);
    const aged = agedValue(data, f, dateOf(state.startYear, state.week).year);
    const baseValue = input.makeshift?.includes(id) ? mulBp(aged, data.engine.requests.makeshiftEffectBp) : aged;
    const bonus = (input.equipment?.areas[f.area] ?? 0) + (input.equipment?.features[id] ?? 0) + (input.polish?.[f.area] ?? 0);
    return { featureId: id, area: f.area, baseValue, teamBp, valueBp: mulBp(mulBp(baseValue, teamBp), BP_ONE + bonus) };
  });
  const syn = synergies(data, input.features);
  const synFactor = BP_ONE + syn.total;

  const refSum = contributions.reduce((s, c) => s + mulBp(c.baseValue, referenceTeamBp), 0);
  const teamSum = contributions.reduce((s, c) => s + c.valueBp, 0);
  const qFeatures = mulBp(refSum, synFactor);
  // Etappe 6c.6: Phasen-Schwerpunkt wirkt wie der Führungsfaktor auf die Teamqualität.
  const qTeam = mulBp(mulBp(mulBp(teamSum, synFactor), input.leadershipBp ?? BP_ONE), input.phaseQualityBp ?? BP_ONE);

  const profileActual = areaProfile(data, input.features, input.scope);
  const profileExpected = expectedProfileFor(state, data, input.genre, input.subgenre ?? null);
  const prof = profileFactor(data, profileActual, profileExpected);
  const qProfile = mulBp(qTeam, prof.factor);

  const themeFitBp = themeFitFor(state, data, input.genre, input.subgenre ?? null, input.theme);
  const qFit = mulBp(qProfile, themeFitBp);
  // Etappe 6c.5: Design-Säulen als eigener Faktor nach der Passung.
  const pil = pillarEffects(data, input.pillars, input.genre, contributions, (id) => featureById(data, id));
  const qPillars = mulBp(qFit, pil.factorBp);

  // ENG-R10: E aus den Modulstufen im Projekt gegen den Stand der Technik im Jahr der Berechnung (beim Release das Release-Jahr).
  const engine = projectEngineFactor(data, input.engineLevels, input.features, dateOf(state.startYear, state.week).year);
  const engineFactorBp = engine.factorBp;
  const qEngine = mulBp(qPillars, engineFactorBp);
  const bugShareBp = bugShare(data, input.bugsBp, input.scope);
  const q = mulBp(qEngine, BP_ONE - bugShareBp);

  return {
    contributions,
    synergies: syn.hits,
    synergyBp: syn.total,
    referenceTeamBp,
    profileActual,
    profileExpected,
    profileDeviationBp: prof.deviation,
    profileFactorBp: prof.factor,
    themeFitBp,
    pillars: pil.effects,
    pillarFactorBp: pil.factorBp,
    engineFactorBp,
    engineModules: engine.modules,
    bugShareBp,
    qFeatures,
    qTeam,
    qProfile,
    qFit,
    qPillars,
    qEngine,
    q,
  };
}
