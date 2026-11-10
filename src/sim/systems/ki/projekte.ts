// Projekte, Releases und Verkäufe der KI-Studios mit denselben Formeln wie beim Spieler (S08 MRK-R32 bis MRK-R34,
// Formel 5.5; S14 KI-R01, KI-T01). Die Auswahl mit Temperatur, Wahrnehmung und Lernen folgt in Teilschritt 3.3.
import { directiveAllows, subsidiaryTempoBp } from "../uebernahmen";
import { disappointment } from "../marketing";
import { aiCrackCheck, aiProtection, applyPiracy, newProtection } from "../piraterie";
import { aiPriceFactors } from "../preise";
import { awardFactor } from "../branchenpreise";
import { brandById } from "../marken";
import { type Bp, BP_ONE, type Cent, clamp, divBp, divInt, mulBp } from "../../num";
import { linkPublishing, publishingSplit } from "../publishing";
import { middlewareLevels } from "../middlewareAngebot";
import {
  AREAS, type AiProduct, type AiProject, type AiStudio, type AiTeam, type Area, type GameData, type GameState, type ModuleMap,
  type Person, type Scope,
} from "../../model/types";
import { dateOf } from "../../calendar";
import type { Rng } from "../../rng";
import { anchorValue } from "../finanzen";
import {
  accrueRoyalty, aiEngineLevels, chargeProjectStart, chooseEngine, type EngineChoice, exclusivityBlocks, retrainDone, retrainTempo,
} from "../lizenzen";
import { log } from "../firma";
import { agedValue, computeQuality, expectedProfileFor, featureById, totalEffort } from "../produkte/quality";
import { computeScore, effectiveQNorm, pressMood, scoreFromQ, trendOf } from "../produkte/score";
import type { AiConsideration } from "../../model/types";
import { SCOPES } from "../../model/types";
import { newBugs, projectInnovation, qaFound } from "../produkte/bugs";
import {
  activePlatforms, competitionFactor, digitalNetPerUnit, digitalShare, grossPrice, netPerUnit, platformBase, platformById, productionCost, weeklyDemand,
} from "../markt";
import { platformAllows, platformBudget } from "../leistung";
import { creditLimit, liveStudios, personMonthCost, studioRng, weeklyCost } from "./studios";
import { aiLiveShutdown, aiLiveWeek, aiLiveWeeklyCost, rollAiLive } from "./live";
import { aiHasDevkit, launched, launchPlatform } from "../plattformen";
import { bookGenreRevenue, bookStudioQuarter, copycatDemand, duelHold, duelResult, forcedStarted, goalContribution, rivalReleased } from "./rivalen";
import {
  aiEngineLag, belief, considerationWeights, difficulty, learnFromRelease, logDecision, perceive, platformBelief, rate, type Rated, reserveCent, selectOption,
} from "./entscheidung";
import { phaseEffects } from "../marktphasen";
import { aiBrandRelease, aiBrandSales, aiChooseBrand, payBrandRoyalty } from "../markenmarkt";

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

/** Hausmittel ohne Markt-Engine (Stufen aus dem Rückstand des Archetyps). */
const HOME: EngineChoice = { engineId: null, contractId: null, levels: {} as ModuleMap, key: "" };

export { aiEngineLevels };

/** Das Studio als eine Person mit dem Bestwert je Bereich (wie „beste beteiligte Person“ beim Spieler, Konzept 0b 3.1). */
export function studioAsPerson(studio: AiStudio): Person {
  return {
    id: 0, name: studio.name, isFounder: false, strength: { ...studio.strength }, salaryCent: 0,
    experienceGenre: { ...studio.experienceGenre }, experienceEngine: studio.experienceEngine,
    assignment: null, transferWeeks: 0, hiredWeek: 0, teamId: null, onboardWeeks: 0, moraleBp: 0, burnoutBp: 0, key: null,
  };
}

export interface AiCandidate {
  genre: string;
  /** Untergenre oder null (ANNAHME, siehe SubgenreDef). */
  subgenre?: string | null;
  theme: string;
  scope: Scope;
  platforms: string[];
  features: string[];
  engineLevels: ModuleMap;
}

/** Eine Projektwahl: Jahr, Engine und Karten je Bereich nach Wert, einmal je Entscheidung berechnet (TEC-R50). */
export interface ChoiceContext {
  year: number;
  engineLevels: ModuleMap;
  /** Karten, die Jahr und Engine erlauben, je Bereich nach gealtertem Grundwert absteigend. */
  byArea: Map<Area, { id: string; cost: number }[]>;
  /** PRD-R11 je Plattform: erlaubte Karten. */
  allowed: Map<string, Set<string>>;
  platforms: string[];
  /** MRK-R14: Plattformen, die in den nächsten zwei Jahren erscheinen (mit Devkit wählbar, MRK-R17). */
  upcoming: string[];
  maxBase: number;
}

// Reiner Zwischenspeicher je Datensatz, Jahr und Engine-Stufen: hängt nur von den Daten ab (TEC-R50).
const contextCache = new WeakMap<GameData, Map<string, ChoiceContext>>();

/** Kontext für Engine-Stufen mit Schlüssel (KI-Engines: Rückstand „l<n>“, Spieler-Engine: Version). */
export function contextFor(data: GameData, year: number, key: string, levels: ModuleMap): ChoiceContext {
  let byKey = contextCache.get(data);
  if (!byKey) {
    byKey = new Map();
    contextCache.set(data, byKey);
  }
  const k = `${year}|${key}`;
  let ctx = byKey.get(k);
  if (!ctx) {
    if (byKey.size > 64) byKey.clear();
    ctx = choiceContext(data, year, levels);
    byKey.set(k, ctx);
  }
  return ctx;
}

export function cachedChoiceContext(data: GameData, year: number, lagYears: number): ChoiceContext {
  return contextFor(data, year, `l${lagYears}`, aiEngineLevels(data, lagYears, year));
}

export function choiceContext(data: GameData, year: number, engineLevels: ModuleMap): ChoiceContext {
  const active = activePlatforms(data, year);
  const upcoming = data.platforms.filter((p) => p.releaseYear > year && p.releaseYear <= year + 2 && p.certification);
  const usable = data.features.filter((f) => f.availableFrom <= year && f.requires.level <= engineLevels[f.requires.module])
    .map((f) => ({ id: f.id, area: f.area, cost: f.performanceCost, value: agedValue(data, f, year) }))
    .sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
  const byArea = new Map<Area, { id: string; cost: number }[]>();
  for (const f of usable) byArea.set(f.area, [...(byArea.get(f.area) ?? []), { id: f.id, cost: f.cost }]);
  const allowed = new Map([...active, ...upcoming].map((p) => [p.id, new Set(usable.filter((f) => platformAllows(data, p, f.id, year)).map((f) => f.id))]));
  return {
    year, engineLevels, byArea, allowed, platforms: active.map((p) => p.id).sort(), upcoming: upcoming.map((p) => p.id).sort(),
    maxBase: Math.max(1, ...active.map((p) => platformBase(p, year))),
  };
}

/**
 * Karten nach dem erwarteten Bereichsprofil des Genres: Immer der Bereich mit dem größten Abstand zum Profil, darin
 * eine der drei wertvollsten passenden Karten (ANNAHME). Die Leistung aller Zielplattformen muss reichen (PRD-R11).
 */
export function pickFeatures(state: GameState, data: GameData, ctx: ChoiceContext, c: Pick<AiCandidate, "genre" | "subgenre" | "scope" | "platforms">, rng: Rng): string[] {
  const slots = data.projects.featureSlots[c.scope];
  const budget = Math.min(...c.platforms.map((id) => platformBudget(data, platformById(data, id), ctx.year, state)));
  const allowed = c.platforms.map((id) => ctx.allowed.get(id)!);
  const expected = expectedProfileFor(state, data, c.genre, c.subgenre ?? null);
  const picked: string[] = [];
  const count: Record<Area, number> = { gameplay: 0, grafik: 0, sound: 0, story: 0, technik: 0 };
  let used = 0;
  while (picked.length < slots) {
    const n = picked.length;
    const areas = [...AREAS].sort((a, b) => (expected[b] * (n + 1) - count[b] * BP_ONE) - (expected[a] * (n + 1) - count[a] * BP_ONE) || a.localeCompare(b));
    let choice: { id: string; cost: number; area: Area } | null = null;
    for (const area of areas) {
      const pool: { id: string; cost: number }[] = [];
      for (const f of ctx.byArea.get(area) ?? []) {
        if (picked.includes(f.id) || used + f.cost > budget || !allowed.every((a) => a.has(f.id))) continue;
        pool.push(f);
        if (pool.length === 3) break;
      }
      if (pool.length === 0) continue;
      choice = { ...pool[rng.int(pool.length)]!, area };
      break;
    }
    if (!choice) break;
    picked.push(choice.id);
    count[choice.area] += 1;
    used += choice.cost;
  }
  return picked.sort();
}

/** Wochen bis zum Release: Produktion mit dem Team, Testwochen des Archetyps, Zertifizierung. */
export function plannedWeeks(data: GameData, studio: AiStudio, team: AiTeam, c: AiCandidate): number {
  const capacity = Math.max(1, team.size * data.start.workPerPersonWeekBp);
  const effort = totalEffort(data, c.features, c.scope);
  const cert = c.platforms.some((id) => platformById(data, id).certification) ? data.sales.certification.weeks : 0;
  return divInt(effort + capacity - 1, capacity, 1) + data.ai.archetypes[studio.archetype].polishWeeks + cert;
}

/** Erwartete Bugs zum Release (ANNAHME: die Hälfte der entstandenen Bugs bleibt nach dem Testen). */
function expectedBugs(data: GameData, c: Pick<AiCandidate, "features" | "scope">): Bp {
  return mulBp(newBugs(data, totalEffort(data, c.features, c.scope), projectInnovation(data, c.features)), 5000);
}

/** Erwartete Qualität Q̂ des Kandidaten mit derselben Qualitätsformel wie beim Spieler (KI-R01, KI-R07: eigene Werte exakt). */
export function expectedQuality(state: GameState, data: GameData, studio: AiStudio, c: AiCandidate, bugsBp: Bp = expectedBugs(data, c)): Bp {
  return computeQuality(data, state, { ...c, bugsBp, people: [studioAsPerson(studio)] }).q;
}

/** Erwartete Wertung: Q̂ gegen das wahrgenommene Q_erw (KI-R08). */
export function expectedScore(state: GameState, data: GameData, studio: AiStudio, c: AiCandidate, bugsBp?: Bp): Bp {
  const qNorm = perceive(state, data, studio, `qnorm.${c.scope}`, effectiveQNorm(data, state, c.scope));
  return clamp(scoreFromQ(data, expectedQuality(state, data, studio, c, bugsBp), qNorm), data.quality.scoreMinBp, data.quality.scoreMaxBp);
}

/**
 * KI-R27, S14 6.1: angekündigte Titel im Fenster ±8 Wochen um den geplanten Release (KI-Projekte mit geplanter Woche und
 * erschienene Spiele), gewichtet wie die Konkurrenzdichte (Umfang-Faktor).
 */
export function announcedDensity(state: GameState, data: GameData, week: number, self: AiTeam | null): Bp {
  const w = data.ai.considerations.densityWindowWeeks;
  let sum = 0;
  for (const s of state.ai.studios) {
    if (s.closedWeek !== null) continue;
    for (const t of s.teams) {
      const r = t.project?.plannedReleaseWeek;
      if (t !== self && r !== undefined && r >= week - w && r <= week + w) sum += data.sales.scopeDemandBp[t.project!.scope];
    }
  }
  for (const p of state.ai.products) if (p.releaseWeek >= week - w && p.releaseWeek <= week + w) sum += data.sales.scopeDemandBp[p.scope];
  return sum;
}

export interface RatedCandidate extends Rated {
  c: AiCandidate;
  engine: EngineChoice;
  costCent: Cent;
  gutBp: Bp;
  scoreBp: Bp;
}

/**
 * S14 6.1 für die Projektwahl (KI-R25): Formel 5.5 als Erwägungen mit Antwortkurven, erweitert um Konkurrenzdichte
 * und Schwerpunkt (Zielbeitrag und Bedrohung folgen mit den Rivalen in 3.5).
 * Rohwerte: Qualität = Q̂ / Q_erw (wahrgenommen), Trend = Überzeugung Genre × Thema, Marke = 0 bis 3.10, Kosten =
 * Kosten / max(Kapital, Mindestkapital) (MRK-T19), Risiko = Innovation plus Umfang gegen Teamgröße, Plattform =
 * wahrgenommene Basis · Überzeugung gegen die größte Plattform, Schwerpunkt = Schwerpunkt-Genre 1,5, Lieblingsgenre
 * 1,0, Plattform-Wette +0,5 (KI-R21, KI-R26).
 */
export function rateCandidate(state: GameState, data: GameData, studio: AiStudio, team: AiTeam, c: AiCandidate, ctx: ChoiceContext): RatedCandidate {
  const k = data.ai.considerations;
  const y = ctx.year;
  const weeks = plannedWeeks(data, studio, team, c);
  const costCent = weeks * weeklyCost(state, data, team.size);
  const capital = Math.max(studio.cashCent, anchorValue(data.ai.minCapitalCent, y));
  const qNorm = perceive(state, data, studio, `qnorm.${c.scope}`, effectiveQNorm(data, state, c.scope));
  const q = expectedQuality(state, data, studio, c);
  const releaseYear = dateOf(state.startYear, state.week + weeks).year;
  const base = c.platforms.reduce((sum, id) => {
    const p = platformById(data, id);
    return sum + mulBp(perceive(state, data, studio, `basis.${id}`, platformBase(p, Math.min(releaseYear, p.endYear))), platformBelief(studio, id));
  }, 0);
  let focus = studio.focusGenres.includes(c.genre) ? k.focusRawBp : studio.favGenres.includes(c.genre) ? k.favoriteRawBp : 0;
  if (c.platforms[0] === studio.platformBet) focus += k.betRawBp;
  const raw: Record<AiConsideration, Bp> = {
    qualitaet: divBp(q, qNorm, 1),
    trend: belief(data, studio, c.genre, c.theme),
    marke: 0,
    kosten: divBp(costCent, capital, 1),
    risiko: clamp(projectInnovation(data, c.features), 0, BP_ONE) + (c.scope === "mittel" && team.size < 4 ? k.scopeRiskBp : 0),
    plattform: divBp(base, ctx.maxBase, 1),
    dichte: announcedDensity(state, data, state.week + weeks, team),
    schwerpunkt: Math.min(focus, k.focusRawBp),
    ziel: goalContribution(state, data, studio, c, divBp(q, qNorm, 1)),
  };
  const rated = rate(data, considerationWeights(state, data, studio), raw);
  // KI-R56, Tabelle 6.9: Der Charakter-Wert einer Option für die Bauchentscheidung.
  const gutBp = studio.traits.reduce((sum, t) => {
    switch (data.ai.traits[t]?.gut) {
      case "neuheit": return sum + BP_ONE - rated.values.risiko;
      case "billig": return sum + rated.values.kosten;
      case "qualitaet": return sum + rated.values.qualitaet;
      case "ruhe": return sum + rated.values.dichte;
      case "schwerpunkt": return sum + rated.values.schwerpunkt;
      case "gross": return sum + rated.values.plattform;
      default: return sum;
    }
  }, 0);
  return { ...rated, c, engine: HOME, costCent, gutBp, scoreBp: clamp(scoreFromQ(data, q, qNorm), data.quality.scoreMinBp, data.quality.scoreMaxBp) };
}

/**
 * Formel 5.5 als Zahl (S08), für Prüfungen: der Nutzwert nach S14 6.1. Endlich auch bei Kapital 0 (MRK-T19).
 */
export function projectUtility(state: GameState, data: GameData, studio: AiStudio, team: AiTeam, c: AiCandidate, ctx: ChoiceContext): Bp {
  return rateCandidate(state, data, studio, team, c, ctx).utilityBp;
}

/**
 * KI-R25, MRK-R34: K Kandidaten (Stufe) aus Genre, Thema, Umfang und Plattformen. Vetos und Töpfe vor der Auswahl:
 * Wer die Kosten nicht bezahlen kann, verwirft die Option; wer danach unter die Rücklage fiele, nimmt sie nur mit
 * Nutzwert ab 0,6 (KI-R32, ohne Kredit). Über dem Projekttopf nur mit 20 % mehr Nutzwert als die beste Option im Topf
 * (KI-R23). Ausgewählt wird nach Formel 6.2.
 */
/** Etappe 6c.1 (PRD-R28): Große KI-Studios wählen ab der Freischaltung auch groß und AAA. */
// ANNAHME: Nur KI-Studios der Größe „gross“ planen große Umfänge, mit Mindestteam und Anteil aus considerations.bigScope.
function bigScope(data: GameData, studio: AiStudio, teamSize: number, year: number, rng: Rng): Scope | null {
  if (studio.size !== "gross") return null;
  const b = data.ai.considerations.bigScope;
  for (const s of ["aaa", "gross"] as const) {
    if (year >= data.projects.scopeFromYear[s] && teamSize >= b[s].minTeam && rng.uniformBp() < b[s].shareBp) return s;
  }
  return null;
}

export function rateCandidates(state: GameState, data: GameData, studio: AiStudio, team: AiTeam, rng: Rng, engine: EngineChoice = HOME): RatedCandidate[] {
  const y = yearOf(state);
  const def = data.ai.archetypes[studio.archetype];
  const lag = aiEngineLag(state, data, def.engineLagYears);
  // S13 AUS-R70: Hausmittel mit lizenzierten Modulen des Spielers.
  const mw = engine === HOME ? middlewareLevels(state, studio.id, aiEngineLevels(data, lag, y)) : null;
  const ctx = engine !== HOME ? contextFor(data, y, engine.key, engine.levels)
    : mw ? contextFor(data, y, `l${lag}|mw${mw.key}`, mw.levels) : cachedChoiceContext(data, y, lag);
  // MRK-R17: angekündigte Plattformen nur mit Devkit.
  const platforms = [...ctx.platforms, ...ctx.upcoming.filter((id) => aiHasDevkit(state, studio, id))];
  if (platforms.length === 0) return [];
  const n = difficulty(state, data).candidates;
  const out: RatedCandidate[] = [];
  // KI-R45, KI-R47: Gegenzug „Konkurrenztitel“ oder Nachahmer legt Genre (und Thema) fest.
  const forced = studio.forced && studio.forced.fromWeek <= state.week ? studio.forced : null;
  for (let i = 0; i < n; i++) {
    const randomGenre = rng.uniformBp() < data.ai.considerations.mainGenreChanceBp
      ? studio.focusGenres[rng.int(studio.focusGenres.length)] ?? studio.mainGenre
      : data.genres[rng.int(data.genres.length)]!.id;
    const randomTheme = data.themes[rng.int(data.themes.length)]!.id;
    const genre = forced?.genre ?? randomGenre;
    const theme = forced?.theme ?? randomTheme;
    const scope: Scope = bigScope(data, studio, team.size, y, rng) ?? (studio.size !== "klein" || team.size >= 4 ? (rng.uniformBp() < def.mittelShareBp ? "mittel" : "klein") : "klein");
    // UEB-R24, UEB-R26: Vorgaben des Konzerns begrenzen die Kandidaten einer Tochter.
    if (!directiveAllows(studio, genre, scope)) continue;
    const pool = [...platforms];
    const chosen: string[] = [];
    const count = rng.range(1, Math.min(def.maxPlatforms, pool.length));
    for (let k = 0; k < count; k++) chosen.push(pool.splice(rng.int(pool.length), 1)[0]!);
    // LIZ-R06: Die Exklusivität eines anderen Kunden sperrt Genre bzw. Plattform dieser Engine.
    if (engine.engineId !== null && exclusivityBlocks(state, engine.engineId, studio.id, genre, chosen)) continue;
    const partial = { genre, subgenre: aiSubgenre(data, genre, theme, y), theme, scope, platforms: chosen, engineLevels: ctx.engineLevels };
    const features = pickFeatures(state, data, ctx, partial, rng);
    if (features.length < data.projects.featureSlots[scope]) continue;
    out.push({ ...rateCandidate(state, data, studio, team, { ...partial, features }, ctx), engine });
  }
  return out;
}

/**
 * ANNAHME (Inhaltsausbau): Die KI nimmt das freigeschaltete Untergenre mit dem größten Bonus für das Thema, bei
 * Gleichstand nach ID; ohne Bonus kein Untergenre. Kein Zufall, damit die Ströme unverändert bleiben.
 */
export function aiSubgenre(data: GameData, genre: string, theme: string, year: number): string | null {
  let best: string | null = null;
  let bestBonus = 0;
  for (const sg of [...data.subgenres].sort((a, b) => a.id.localeCompare(b.id))) {
    if (sg.genre !== genre || sg.fromYear > year) continue;
    const bonus = sg.themeBonusBp[theme] ?? 0;
    if (bonus > bestBonus) { best = sg.id; bestBonus = bonus; }
  }
  return best;
}

export function admissible(state: GameState, data: GameData, studio: AiStudio, options: readonly RatedCandidate[]): RatedCandidate[] {
  const k = data.ai.considerations;
  const reserve = reserveCent(state, data, studio);
  // KI-R32: Rücklage plus Kosten aus der Kasse; darunter nur Projekte mit Nutzwert über 0,6, notfalls auf Kredit.
  const credit = creditLimit(state, data, studio);
  const strict = options.filter((o) => studio.cashCent - o.costCent >= reserve
    || (o.utilityBp >= k.affordableUtilityBp && o.costCent <= studio.cashCent + credit));
  // ANNAHME (3.12): Ein Team ohne Projekt kostet dasselbe Gehalt; findet sich nichts nach der Rücklage-Regel, nimmt die
  // KI das Projekt, das noch in die Kreditlinie passt, statt das Team leer laufen zu lassen.
  const affordable = strict.length > 0 ? strict : options.filter((o) => o.costCent <= studio.cashCent + credit);
  // MRK-R60: In der Krise sinken die Budgets der KI um 20 %.
  const pot = mulBp(mulBp(Math.max(0, studio.cashCent), studio.budgetBp.projekte), phaseEffects(state, data).aiBudgetBp);
  const inPot = affordable.filter((o) => o.costCent <= pot);
  const bestInPot = inPot.reduce((m, o) => Math.max(m, o.utilityBp), 0);
  return affordable.filter((o) => o.costCent <= pot || o.utilityBp >= mulBp(bestInPot, k.potOverrunBp));
}

export function chooseProject(state: GameState, data: GameData, studio: AiStudio, team: AiTeam, rng: Rng): RatedCandidate | null {
  // KI-R28: zuerst die Engine (Nutzwert aus S04 mit Wechselhürde), dann die Kandidaten auf ihren Stufen.
  const engine = state.licensing.engines.length > 0 ? chooseEngine(state, data, studio, team) : HOME;
  const options = admissible(state, data, studio, rateCandidates(state, data, studio, team, rng, engine));
  const choice = selectOption(data, difficulty(state, data), options, rng);
  if (!choice) return null;
  const o = options[choice.index]!;
  logDecision(data, studio, {
    week: state.week, domain: "projekt", choice: `${o.c.genre}/${o.c.theme}/${o.c.scope}/${o.c.platforms.join("+")}`,
    utilityBp: o.utilityBp, reasons: choice.viaGut ? ["ai.reason.bauchgefuehl", ...o.reasons.slice(0, 2)] : o.reasons, viaGut: choice.viaGut,
  });
  return o;
}

export function startAiProject(state: GameState, data: GameData, studio: AiStudio, team: AiTeam, c: AiCandidate, expectedScoreBp: Bp = data.quality.scoreBaseBp, engine: EngineChoice = HOME): AiProject {
  const cert = c.platforms.some((id) => platformById(data, id).certification) ? data.sales.certification.weeks : 0;
  // LIZ-R27: Ein Team, das zum ersten Mal mit dieser Engine arbeitet, schult um.
  if (team.lastEngineId !== engine.engineId && studio.releases > 0) team.retrainWeeks = 1;
  team.lastEngineId = engine.engineId;
  team.project = {
    ...c, effortTotalBp: totalEffort(data, c.features, c.scope), effortDoneBp: 0, bugsBp: 0, startWeek: state.week,
    plannedReleaseWeek: state.week + plannedWeeks(data, studio, team, c),
    polishWeeksLeft: data.ai.archetypes[studio.archetype].polishWeeks, certWeeksLeft: cert, costCent: 0, checked: false, expectedScoreBp,
    engineId: engine.engineId, contractId: engine.contractId, copyOf: null, holdUntilWeek: 0, duel: "keins", duelWith: null, demandBp: BP_ONE,
  };
  const contract = engine.contractId === null ? undefined : state.licensing.contracts.find((x) => x.id === engine.contractId);
  if (contract) chargeProjectStart(state, contract);
  // MRK-R69, LIZ-M24: Lizenzmarke oder eigene Marke für das Genre.
  aiChooseBrand(state, data, studio, team.project);
  return team.project;
}

/**
 * Tick-Schritt 3: Freie Teams wählen ein neues Projekt. KI-R81: Taktische Entscheidungen sind nach Firmen-ID auf die
 * vier Wochen eines Monats verteilt (Woche, in der (Woche + ID) durch 4 teilbar ist). MRK-R33: eigener Strom je Firma.
 */
export function aiDecisionStep(state: GameState, data: GameData): void {
  for (const s of liveStudios(state)) {
    if ((state.week + s.id) % 4 !== 0) continue;
    for (const t of s.teams) {
      if (t.project) continue;
      const forced = s.forced !== null && s.forced.fromWeek <= state.week;
      const o = chooseProject(state, data, s, t, studioRng(state, s));
      if (!o) continue;
      const project = startAiProject(state, data, s, t, o.c, o.scoreBp, o.engine);
      if (forced) forcedStarted(state, data, s, project, o.utilityBp);
    }
  }
}

/**
 * MRK-R43 (einzige Fassung der Abbruchregel, KI-R37): Am Vertical Slice prüft die KI ihre Prognose. Liegt sie mehr als
 * 1,5 unter der Mindestwertung und ist weniger als die Hälfte des Budgets ausgegeben, bricht sie ab; sonst steuert sie
 * um (Umfang −1: aus mittel wird klein mit den wertvollsten Karten). ANNAHME: Vertical Slice bei 20 % Fortschritt.
 */
export function checkAiProject(state: GameState, data: GameData, studio: AiStudio, team: AiTeam): void {
  const p = team.project!;
  const k = data.ai.considerations;
  if (p.checked || p.effortDoneBp < mulBp(p.effortTotalBp, k.cancelCheckBp)) return;
  p.checked = true;
  const forecast = expectedScore(state, data, studio, p, p.bugsBp + expectedBugs(data, p) - mulBp(expectedBugs(data, p), divBp(p.effortDoneBp, Math.max(1, p.effortTotalBp), 1)));
  const min = data.ai.archetypes[studio.archetype].minScoreBp - k.cancelMarginBp;
  if (forecast >= min) return;
  const budget = Math.max(1, plannedWeeks(data, studio, team, p) * weeklyCost(state, data, team.size));
  const reasons = ["ai.reason.prognose", "ai.reason.mindestwertung"];
  if (p.costCent < mulBp(budget, k.cancelBudgetBp)) {
    team.project = null;
    logDecision(data, studio, { week: state.week, domain: "abbruch", choice: `${p.genre}/${p.theme}/${p.scope}`, utilityBp: forecast, reasons, viaGut: false });
    return;
  }
  // PRD-R28, Etappe 6c.1: Umsteuern verkleinert um eine Stufe.
  const smaller = SCOPES[SCOPES.indexOf(p.scope) - 1];
  if (smaller !== undefined) {
    const y = yearOf(state);
    const keep = [...p.features].sort((a, b) => agedValue(data, featureById(data, b), y) - agedValue(data, featureById(data, a), y) || a.localeCompare(b))
      .slice(0, data.projects.featureSlots[smaller]).sort();
    p.scope = smaller;
    p.features = keep;
    p.effortTotalBp = totalEffort(data, keep, smaller);
    p.effortDoneBp = Math.min(p.effortDoneBp, p.effortTotalBp);
    p.plannedReleaseWeek = state.week + plannedWeeks(data, studio, team, { ...p, features: keep }) - divInt(p.effortDoneBp, Math.max(1, team.size * data.start.workPerPersonWeekBp), 1);
    logDecision(data, studio, { week: state.week, domain: "umsteuern", choice: `${p.genre}/${p.theme}/${smaller}`, utilityBp: forecast, reasons, viaGut: false });
  }
}

/**
 * Tick-Schritt 5 und 6 für die KI: Fortschritt wie beim Spieler (Kapazität je Person, Bugs, QA nach der Produktion,
 * Zertifizierung), danach der Release mit Pressewertung (PRD-R50 bis PRD-R57) im gemeinsamen Markt.
 */
export function aiProjectStep(state: GameState, data: GameData): void {
  const gain = data.start.experienceGainPerWeekBp;
  const cert = data.sales.certification;
  for (const s of liveStudios(state)) {
    for (const t of s.teams) {
      if (!t.project) continue;
      checkAiProject(state, data, s, t);
      const p = t.project;
      if (!p) continue;
      // UEB-R18: Überlast der Integration verlangsamt die Tochter.
      const capacity = mulBp(mulBp(t.size * data.start.workPerPersonWeekBp, retrainTempo(data, t.retrainWeeks)), subsidiaryTempoBp(state, data, s));
      if (t.retrainWeeks > 0) t.retrainWeeks = retrainDone(data, t.retrainWeeks + 1) ? 0 : t.retrainWeeks + 1;
      if (p.effortDoneBp < p.effortTotalBp) {
        const work = Math.min(capacity, p.effortTotalBp - p.effortDoneBp);
        p.effortDoneBp += work;
        p.bugsBp += newBugs(data, work, projectInnovation(data, p.features));
        s.experienceGenre[p.genre] = Math.min(BP_ONE, (s.experienceGenre[p.genre] ?? 0) + gain);
        s.experienceEngine = Math.min(BP_ONE, s.experienceEngine + gain);
        continue;
      }
      p.bugsBp -= qaFound(data, p.bugsBp, 0, capacity, 0);
      if (p.polishWeeksLeft > 0) {
        p.polishWeeksLeft -= 1;
        continue;
      }
      if (p.certWeeksLeft > 0) {
        p.certWeeksLeft -= 1;
        // PRD-R26: Zu viele offene Bugs lassen die Zertifizierung scheitern.
        if (p.certWeeksLeft === 0 && divInt(p.bugsBp, BP_ONE, 1) > cert.thresholdBugs) p.certWeeksLeft = cert.failDelayWeeks;
        continue;
      }
      // MRK-R17: Vor dem Plattformstart wartet der Release; MRK-R47: Release-Duell.
      if (p.platforms.some((id) => !launched(state, data, id))) continue;
      if (duelHold(state, data, s, p)) continue;
      releaseAiProject(state, data, s, t, studioRng(state, s));
    }
  }
}

export function rateAiProject(state: GameState, data: GameData, studio: AiStudio, p: AiProject, rng: Rng) {
  const quality = computeQuality(data, state, { ...p, people: [studioAsPerson(studio)] });
  const score = computeScore(data, quality, effectiveQNorm(data, state, p.scope), trendOf(state, p.genre, p.theme), pressMood(data, state, rng), null);
  return { quality, scoreBp: score.scoreBp };
}

export function releaseAiProject(state: GameState, data: GameData, studio: AiStudio, team: AiTeam, rng: Rng): AiProduct {
  const p = team.project!;
  const { quality, scoreBp } = rateAiProject(state, data, studio, p, rng);
  team.project = null;
  state.releases.push({ year: yearOf(state), scope: p.scope, q: quality.q });
  const product: AiProduct = {
    id: state.ai.nextProductId++, studioId: studio.id, genre: p.genre, theme: p.theme, scope: p.scope, platforms: [...p.platforms],
    scoreBp, releaseWeek: state.week, competitionBp: competitionFactor(state, data, state.week), sold: 0, revenueCent: 0,
    engineId: p.engineId, contractId: p.contractId, demandBp: mulBp(p.demandBp, copycatDemand(state, data, p, quality.q)), duelWith: p.duelWith,
    brandId: null, brandLicenseId: null, fanUnitsPerWeek: 0, interest: p.interest ?? 0,
    // ZIE-R04: Innovation für den Preis „Innovation“.
    innovationBp: projectInnovation(data, p.features),
  };
  // MRK-R19: Launch-Titel (Konkurrenzdichte −50 %, Interesse +20 % als Nachfrage bis Etappe 4).
  if (launchPlatform(state, data, p.platforms, state.week)) {
    product.competitionBp = competitionFactor(state, data, state.week, null, data.makers.launchDensityBp);
    product.demandBp = mulBp(product.demandBp, data.makers.launchInterestBp);
  }
  duelResult(state, data, studio, p.duelWith, scoreBp);
  rivalReleased(state, data, studio, scoreBp);
  if (p.engineId !== null && p.engineId === studio.engineId) {
    studio.engineExperienceBp = Math.min(BP_ONE, studio.engineExperienceBp + data.engine.licensing.experiencePerReleaseBp);
  }
  // S04 Abschnitt 9: „Gebaut mit deiner Engine“.
  if (p.engineId !== null && p.engineId === state.licensing.playerEngineId && scoreBp >= data.brands.hitScoreBp) {
    log(state, "log.licenseHit", { studio: studio.name, score: scoreBp });
  }
  aiBrandRelease(state, data, studio, p, product, rng);
  // S05 Abschnitt 7: Kopierschutz der KI.
  product.protection = newProtection(state, data, aiProtection(data, studio, yearOf(state)));
  // MKT-R19 für die KI: Gewöhnung der Marke zum Release.
  product.habitAtReleaseBp = brandById(state, product.brandId)?.discountHabitBp ?? 0;
  // MKT-R05 für die KI (KI-R01): Enttäuschung bei zu viel Interesse.
  product.userScoreBp = disappointment(state, data, p.platforms, product.interest ?? 0, scoreBp, brandById(state, product.brandId)).userScoreBp;
  // S06 Abschnitt 7: Ein Teil der KI-Releases wird ein Live-Produkt (MMO, F2P, Live-Service).
  product.live = rollAiLive(state, data, studio, rng);
  if (product.live) product.type = product.live.kind;
  // S13 AUS-R42: vom Spieler verlegt.
  linkPublishing(state, data, studio, team, p, product);
  state.ai.products.push(product);
  learnFromRelease(state, data, product, studio.id);
  studio.releases += 1;
  studio.lastScores = [...studio.lastScores, scoreBp].slice(-5);
  return product;
}

/**
 * Tick-Schritt 7 für die KI: Verkäufe nach MKT-F2/MKT-F3 mit dem Digitalanteil (MKT-R24, MKT-R25), ohne Preset-Faktor.
 * ANNAHME: KI-Studios fertigen genau die physische Nachfrage nach (keine Auflage, kein Lager); die Stückkosten des
 * Datenträgers und die Plattformgebühr fallen je verkauftem Stück an.
 */
export function aiSalesStep(state: GameState, data: GameData): void {
  const year = yearOf(state);
  const ended = new Set<number>();
  const studios = new Map(state.ai.studios.map((s) => [s.id, s]));
  const salary = personMonthCost(state, data);
  for (const p of state.ai.products) {
    const t = state.week - p.releaseWeek;
    // MRK-R41, MKT-F4: Preissenkung und Rabattwoche der KI.
    const price = aiPriceFactors(state, data, p);
    let demand = mulBp(mulBp(weeklyDemand(state, data, p, p.userScoreBp ?? p.scoreBp, t, state.week, p.competitionBp), p.demandBp), price.demandBp);
    // ZIE-R05: Branchenpreis +20 % für 8 Wochen.
    demand = mulBp(demand, awardFactor(data, p.awardUntil, state.week));
    // PRD-R71 für die KI: Fans der Marke kaufen in den ersten Wochen zusätzlich.
    if (t < data.brands.fanBuyWeeks) demand += p.fanUnitsPerWeek;
    // MKT-R28 für die KI: Kopien sind verlorene Verkäufe.
    demand = applyPiracy(data, year, p.platforms, p.protection, t, demand, brandById(state, p.brandId), p.genre, !!p.live);
    aiCrackCheck(p.protection, t);
    // BTR-R20: F2P wird nur heruntergeladen.
    const digital = p.live?.kind === "f2p" ? demand : mulBp(demand, digitalShare(data, p.platforms, year));
    const physical = demand - digital;
    const priceCent = mulBp(grossPrice(data, p, year), price.priceBp);
    let revenue: Cent = physical * netPerUnit(state, data, p.type, p.platforms, BP_ONE, priceCent)
      + digital * digitalNetPerUnit(state, data, { type: p.type, platforms: p.platforms, sales: { priceCent } }, p.revenueCent, BP_ONE);
    const studio = studios.get(p.studioId)!;
    // S13 AUS-R42: Bei verlegten Spielen bleibt dem Studio nur sein Anteil.
    revenue = publishingSplit(state, p, revenue);
    // S06 Abschnitt 7: Live-Umsatz und laufende Kosten (Live-Ops, Server) der KI-Live-Produkte.
    let liveCost = 0;
    if (p.live) {
      revenue += aiLiveWeek(state, data, studio, p, demand, salary, studioRng(state, studio));
      liveCost = aiLiveWeeklyCost(state, data, p, salary);
    }
    studio.cashCent += revenue - productionCost(state, data, p, physical).costCent - liveCost;
    studio.revenueByYear[0] = (studio.revenueByYear[0] ?? 0) + revenue;
    bookStudioQuarter(studio, revenue);
    bookGenreRevenue(state, studio.id, p.genre, revenue);
    p.sold += demand;
    accrueRoyalty(state, p.contractId, p.revenueCent, revenue);
    // LIZ-M04, LIZ-M10: Royalty an den Inhaber der Marke; neue Fans gehören der Marke.
    payBrandRoyalty(state, p.brandLicenseId, revenue);
    aiBrandSales(state, data, p, demand);
    p.revenueCent += revenue;
    aiLiveShutdown(state, data, studio, p);
    if (t >= data.sales.minSalesWeeks && demand === 0 && !p.live) ended.add(p.id);
  }
  if (ended.size > 0) state.ai.products = state.ai.products.filter((p) => !ended.has(p.id));
}
