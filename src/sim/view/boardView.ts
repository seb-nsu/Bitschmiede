// Anzeigemodell des Projektbretts: starker Start, Qualitätsvorschau, Kartenpassung und Brett-Vorschau (S11 Bildschirm B).
// Prüfung Fable 03.11.2026: aus view.ts herausgelöst.
import { contractLevels } from "../systems/produkte/auftragsspiele";
import { audienceOf } from "../systems/produkte/zielgruppe";
import { type Bp, BP_ONE, type Cent, divBp, divInt, mulBp } from "../num";
import { dateOf } from "../calendar";
import { AREAS, type AreaMap, type CreateProjectInput, type GameData, type GameState, type Person, type Project, type Scope, type SteerInput } from "../model/types";
import { ageRating, steerOutcome } from "../systems/produkte/projects";
import { agedValue, areaProfile, computeQuality, expectedProfileFor, profileFactor, subgenreById, synergies, totalEffort } from "../systems/produkte/quality";
import { activePlatforms, platformBase, productionCost, recommendedPrintRun } from "../systems/markt";
import { knowledgeStatus, type KnowledgeStatus } from "../systems/wissensbuch";
import { assignedTo, personById } from "../systems/firma";
import { creditLimit } from "../systems/finanzen";
import { focusByPerson } from "../systems/personal";
import { validateInput } from "../tick";
import { engineLevels, missingModule, projectEngineFactor } from "../systems/engine";
import { orderBlocker } from "../systems/bindung";
import { featureCost, platformVersions, type PlatformVersion } from "../systems/leistung";
import { startFans } from "../systems/marken";
import { type LicenseTemplateId, type EngineId, type ModuleMap, type SynergyHit, type PillarEffect, type ModuleNeed, type ProjectEngine } from "../model/types";
import type { ViewModel } from "./view";

/**
 * 4b.10 Starker Start (KRN-R70 ff., PRD-R10, PRD-R14): Das erste Projekt ist mit der Kombination vorbelegt, die im
 * Startjahr am besten läuft: Passung × Trend des Genres × Trend des Themas, nur Themen ohne Inhaltsstufe; bei
 * Gleichstand entscheidet die ID. Features und Umfang kommen aus den Startdaten, die Plattform fällt auf die größte
 * aktive zurück, wenn die vorgesehene (späterer Start) nicht mehr im Handel ist.
 */
export function strongStart(state: GameState, data: GameData): ViewModel["catalog"]["firstProject"] {
  const f = data.start.firstProject;
  let best = { genre: f.genre, theme: f.theme, value: -1 };
  for (const g of [...data.genres].sort((a, b) => a.id.localeCompare(b.id))) {
    for (const t of [...data.themes].filter((x) => x.contentLevel === 0).sort((a, b) => a.id.localeCompare(b.id))) {
      const fit = state.world.themeFit[g.id]?.[t.id] ?? g.themeFit[t.id] ?? BP_ONE;
      const value = mulBp(mulBp(fit, state.trends.genre[g.id] ?? BP_ONE), state.trends.theme[t.id] ?? BP_ONE);
      if (value > best.value) best = { genre: g.id, theme: t.id, value };
    }
  }
  const year = dateOf(state.startYear, state.week).year;
  const active = activePlatforms(data, year);
  const platforms = f.platforms.filter((id) => active.some((p) => p.id === id));
  const fallback = [...active].sort((a, b) => platformBase(b, year) - platformBase(a, year) || a.id.localeCompare(b.id))[0];
  // Etappe 6c.10 und Abschluss 1.0 (Einstieg): Karten, die die Starter-Engine kann, so gewählt, dass das Profil dem
  // Genre möglichst nahe kommt (gierig nach kleinster Abweichung, bei Gleichstand die wertvollere Karte, dann die ID).
  // So zeigt keine vorbelegte Karte „schadet der Passung“. Reicht die Auswahl nicht, bleiben die Karten der Startdaten.
  let features = [...f.features];
  const slots = data.projects.featureSlots[f.scope];
  if (state.world.expectedProfile[best.genre]) {
    const expected = expectedProfileFor(state, data, best.genre, null);
    const levels = engineLevels(state, data, "starter");
    const first = !state.projects.some((p) => p.status === "veroeffentlicht");
    const pool = data.features
      .filter((x) => x.availableFrom <= year && x.contentLevel === 0 && !missingModule(data, levels, x.id))
      .filter((x) => !first || data.start.firstProjectAreas.includes(x.area))
      .sort((a, b) => agedValue(data, b, year) - agedValue(data, a, year) || a.id.localeCompare(b.id));
    const pick: string[] = [];
    while (pick.length < slots) {
      let bestCard: string | null = null;
      let bestDev = Number.MAX_SAFE_INTEGER;
      for (const x of pool) {
        if (pick.includes(x.id)) continue;
        const dev = deviationOf(data, [...pick, x.id], f.scope, expected);
        if (dev < bestDev) { bestDev = dev; bestCard = x.id; }
      }
      if (bestCard === null) break;
      pick.push(bestCard);
    }
    if (pick.length === slots) features = pick;
  }
  return {
    genre: best.genre, theme: best.theme, scope: f.scope, features,
    platforms: platforms.length > 0 ? platforms : fallback ? [fallback.id] : [...f.platforms],
  };
}


/**
 * PRD-R50 als Vorschau: Kartenwert, Team, Synergie, Profil, Thema und Engine. Die Passung von Genre und Thema bleibt
 * Wissen aus dem Wissensbuch (UI-R95): Ohne Eintrag zeigt die Vorschau nur den bekannten Bonus des Untergenres.
 * ANNAHME: Ausstattung und Führungsfaktor fehlen in der Vorschau; Bugs gelten als 0.
 */
export interface QualityPreview {
  /** Summe der Kartenwerte (Punkte wie auf den Karten, in bp). */
  cardsBp: Bp;
  /** Team gegen Referenzteam (1,0 = Stärke der Referenz). */
  teamBp: Bp;
  synergyBp: Bp;
  synergies: SynergyHit[];
  profileBp: Bp;
  engineBp: Bp;
  /** Wissensbuch-Eintrag zur Passung: Richtung und Sicherheit, sonst null. */
  theme: { direction: 1 | -1; status: KnowledgeStatus } | null;
  subgenreThemeBonusBp: Bp;
  /** Etappe 6c.5: Wirkung je gewählter Design-Säule und Gesamtfaktor. */
  pillars: PillarEffect[];
  pillarBp: Bp;
  /** Kartenwert × Team × Synergie × Profil × Säulen × Engine (ohne Thema), als Vergleichswert zwischen Entwürfen. */
  indexBp: Bp;
}

function cardSynergy(data: GameData, known: string[], year: number): Record<string, SynergyHit[]> {
  const out: Record<string, SynergyHit[]> = {};
  for (const f of data.features) {
    if (f.availableFrom > year) continue;
    const hits = known.filter((g) => g !== f.id).flatMap((g) => synergies(data, [f.id, g]).hits);
    if (hits.length > 0) out[f.id] = hits;
  }
  return out;
}

function qualityPreview(state: GameState, data: GameData, draft: BoardDraft, known: string[], people: Person[], levels: ModuleMap): QualityPreview | null {
  if (known.length === 0 || !state.world.expectedProfile[draft.genre] || !state.world.themeFit[draft.genre]?.[draft.theme]) return null;
  const q = computeQuality(data, state, {
    genre: draft.genre, subgenre: draft.subgenre ?? null, theme: draft.theme, scope: draft.scope, features: known, bugsBp: 0, people, engineLevels: levels,
    focus: focusByPerson(state), pillars: draft.pillars ?? [],
  });
  const cards = q.contributions.reduce((sum, c) => sum + c.baseValue, 0);
  const refSum = mulBp(cards, q.referenceTeamBp);
  const teamSum = q.contributions.reduce((sum, c) => sum + c.valueBp, 0);
  const entry = state.knowledge.find((e) => e.key === `passung:${draft.genre}:${draft.theme}`);
  const st = entry ? knowledgeStatus(entry) : null;
  return {
    cardsBp: cards,
    teamBp: divBp(teamSum, refSum, 1),
    synergyBp: q.synergyBp,
    synergies: q.synergies,
    profileBp: q.profileFactorBp,
    engineBp: q.engineFactorBp,
    theme: st ? { direction: st.direction, status: st.status } : null,
    subgenreThemeBonusBp: subgenreById(data, draft.subgenre ?? null)?.themeBonusBp[draft.theme] ?? 0,
    pillars: q.pillars ?? [],
    pillarBp: q.pillarFactorBp ?? BP_ONE,
    indexBp: mulBp(mulBp(mulBp(mulBp(mulBp(cards, divBp(teamSum, refSum, 1)), BP_ONE + q.synergyBp), q.profileFactorBp), q.pillarFactorBp ?? BP_ONE), q.engineFactorBp),
  };
}

export interface BoardDraft {
  genre: string;
  subgenre?: string | null;
  theme: string;
  scope: Scope;
  features: string[];
  people: number[];
  platforms: string[];
  /** PRD-R01, PRD-R10, PRD-R12, ENG-R41, S02 Abschnitt 6: Produkttyp, Engine, bestellte Karten, Bindung, Marke. */
  productType?: string;
  sourceId?: number | null;
  engine?: EngineId;
  licenseTemplate?: LicenseTemplateId;
  ordered?: string[];
  binding?: ProjectEngine["binding"];
  brandId?: number | null;
  /** Etappe 6c.3: Auftragsspiel vom Marktplatz. */
  contractOfferId?: number | null;
  /** Etappe 6c.4: Zielgruppe. */
  audience?: string;
  /** Etappe 6c.5: Design-Säulen. */
  pillars?: string[];
  /** PRD-R41: Vorschau für das Umsteuern dieses Projekts statt für ein neues. */
  steerProjectId?: number;
}

export interface BoardPreview {
  /** PRD-R41: erhaltener Anteil der erledigten Arbeit und Aufwand nach dem Umsteuern. */
  steer: { keptBp: Bp; effortTotalBp: Bp; effortDoneBp: Bp } | null;
  profileActual: AreaMap;
  profileExpected: AreaMap;
  /** ½ Σ |ist − erwartet| in bp; 0 = perfekte Passung. */
  deviationBp: Bp;
  effortBp: Bp;
  weeks: number;
  costCent: Cent;
  ageRating: number;
  slots: number;
  /** Stärke der besten gewählten Person je Bereich. */
  bestStrength: AreaMap;
  /** MKT-R22: Erstauflage bei neutraler Prognose und ihre Kosten (Mindestcharge des Datenträgers). */
  printRun: number;
  printRunCostCent: Cent;
  /** Kasse plus freier Kreditrahmen; reicht er nicht für Löhne und Erstauflage, warnt das Brett. */
  fundsCent: Cent;
  /** PRD-R11, PRD-R12: Karten, die der gewählten Engine fehlen, und ob sie bestellbar sind (null = bestellbar). */
  locked: { id: string; need: ModuleNeed; orderBlocked: string | null }[];
  /** PRD-R15, PRD-R61: Leistungskosten je Karte auf der Lead-Plattform und Versionen je Plattform. */
  cardCost: Record<string, number>;
  /** Passung je Karte: Verbesserung der Profil-Abweichung in bp, wenn die Karte dazukommt (gewählte: ihr Beitrag); positiv = passt besser. */
  cardFit: Record<string, Bp>;
  versions: PlatformVersion[];
  /** Engine-Faktor E des Entwurfs (S03 5.1). */
  engineFactorBp: Bp;
  /** Karten-Info: Synergien jeder verfügbaren Karte mit den gewählten (S02 Synergien, positive und negative). */
  cardSynergy: Record<string, SynergyHit[]>;
  /** Modulstufen der gewählten Engine (Karten-Info: eigene Stufe gegen benötigte). */
  engineLevels: ModuleMap;
  /** Durchschaubarkeit (Spieltest 02.11.2026): Wertungs-Wasserfall des Entwurfs vor dem Start (PRD-R50 ohne Bugs). */
  quality: QualityPreview | null;
  /** PRD-R71: Startfans, wenn die gewählte Marke jetzt einen Titel bekäme. */
  brandFans: number;
  /** Etappe 6c.4: Wirkung der gewählten Zielgruppe (Nachfrage samt Genre-Passung, Treue, Erwartung, Fans). */
  audience: { id: string; demandBp: Bp; genreFitBp: Bp; decayBp: Bp; expectationBp: Bp; fansBp: Bp };
  /** null = startbar, sonst Textschlüssel. */
  error: string | null;
}

function printRunPreview(state: GameState, data: GameData, draft: BoardDraft): { printRun: number; printRunCostCent: Cent } {
  const platforms = draft.platforms.filter((id) => data.platforms.some((p) => p.id === id));
  if (platforms.length === 0) return { printRun: 0, printRunCostCent: 0 };
  const proj = { ...draft, platforms, playtests: [] } as unknown as Project;
  const units = recommendedPrintRun(state, data, proj, data.sales.neutralForecastBp);
  return { printRun: units, printRunCostCent: productionCost(state, data, proj, units).costCent };
}

const ZERO_AREAS: AreaMap = { gameplay: 0, grafik: 0, sound: 0, story: 0, technik: 0 };

/** Abweichung vom erwarteten Profil; ohne Karten die volle Abweichung (alles fehlt). */
function deviationOf(data: GameData, features: string[], scope: Scope, expected: AreaMap): Bp {
  return features.length > 0 ? profileFactor(data, areaProfile(data, features, scope), expected).deviation : BP_ONE;
}

/** Wie viel jede Karte an der Passung ändert (Erklärung auf dem Brett). */
function cardFit(data: GameData, known: string[], scope: Scope, expected: AreaMap, year: number): Record<string, Bp> {
  const now = deviationOf(data, known, scope, expected);
  const out: Record<string, Bp> = {};
  for (const f of data.features) {
    if (f.availableFrom > year) continue;
    out[f.id] = known.includes(f.id)
      ? deviationOf(data, known.filter((x) => x !== f.id), scope, expected) - now
      : now - deviationOf(data, [...known, f.id], scope, expected);
  }
  return out;
}

/** Brett-Vorschau (S02 Abschnitt 8): Profil ist gegen erwartet, Dauer und Löhne der gewählten Personen, Freigabe. */
export function boardPreview(state: GameState, data: GameData, draft: BoardDraft): BoardPreview {
  const known = draft.features.filter((id) => data.features.some((f) => f.id === id));
  const expected = state.world.expectedProfile[draft.genre] ? expectedProfileFor(state, data, draft.genre, draft.subgenre ?? null) : ZERO_AREAS;
  const actual: AreaMap = known.length > 0 ? areaProfile(data, known, draft.scope) : ZERO_AREAS;
  const effort = known.length > 0 ? totalEffort(data, known, draft.scope) : 0;
  const chosen = draft.people.map((id) => personById(state, id)).filter((p): p is Person => p !== undefined);
  const capacity = Math.max(1, chosen.length) * data.start.workPerPersonWeekBp;
  const weeks = divInt(effort + capacity - 1, capacity, 1);
  const bestStrength = Object.fromEntries(AREAS.map((a) => [a, chosen.reduce((m, p) => Math.max(m, p.strength[a]), 0)])) as AreaMap;
  const weeklyOfChosen = divInt(chosen.reduce((sum, p) => sum + p.salaryCent, 0) * 12, 52, 1);
  const project = draft.steerProjectId === undefined ? undefined : state.projects.find((p) => p.id === draft.steerProjectId);
  if (project) {
    // PRD-R41: Restaufwand nach dem Umsteuern mit den Personen, die schon am Projekt sind.
    const steerInput: SteerInput = { type: "steerProject", projectId: project.id, genre: draft.genre, scope: draft.scope, features: draft.features, platforms: draft.platforms };
    const error = validateInput(state, data, steerInput);
    const outcome = known.length === draft.features.length ? steerOutcome(data, project, steerInput) : null;
    const team = assignedTo(state, project.id);
    const cap = Math.max(1, team.length) * data.start.workPerPersonWeekBp;
    const rest = outcome ? outcome.effortTotalBp - outcome.effortDoneBp : effort;
    const restWeeks = divInt(rest + cap - 1, cap, 1);
    return {
      steer: outcome,
      profileActual: actual, profileExpected: expected,
      deviationBp: known.length > 0 ? profileFactor(data, actual, expected).deviation : 0,
      effortBp: rest, weeks: restWeeks,
      costCent: restWeeks * divInt(team.reduce((sum, p) => sum + p.salaryCent, 0) * 12, 52, 1),
      ageRating: ageRating(data, draft.theme, known), slots: data.projects.featureSlots[draft.scope],
      bestStrength: Object.fromEntries(AREAS.map((a) => [a, team.reduce((m, p) => Math.max(m, p.strength[a]), 0)])) as AreaMap,
      printRun: 0, printRunCostCent: 0,
      locked: data.features.filter((f) => missingModule(data, project.engine.levels, f.id)).map((f) => ({
        id: f.id, need: missingModule(data, project.engine.levels, f.id)!, orderBlocked: project.pendingFeatures.includes(f.id) ? null : "error.moduleMissing",
      })),
      cardCost: draft.platforms[0] ? Object.fromEntries(data.features.map((f) => [f.id, featureCost(data, state, f.id, draft.platforms[0]!)])) : {},
      cardFit: cardFit(data, known, draft.scope, expected, dateOf(state.startYear, state.week).year),
      versions: platformVersions(data, state, known, draft.platforms.filter((id) => data.platforms.some((p) => p.id === id))),
      engineFactorBp: projectEngineFactor(data, project.engine.levels, known, dateOf(state.startYear, state.week).year).factorBp,
      engineLevels: project.engine.levels,
      cardSynergy: cardSynergy(data, known, dateOf(state.startYear, state.week).year),
      quality: qualityPreview(state, data, { ...draft, pillars: project.pillars }, known, team, project.engine.levels),
      brandFans: 0,
      audience: audiencePreview(data, { ...draft, audience: project.audience }),
      fundsCent: state.moneyCent + Math.max(0, creditLimit(state, data).limitCent - state.finance.loanCent),
      error,
    };
  }
  const input: CreateProjectInput = { type: "createProject", title: "", ...draft };
  const source = draft.sourceId == null ? undefined : state.projects.find((p) => p.id === draft.sourceId);
  const typeDef = data.productTypes.find((x) => x.id === (draft.productType ?? "standard"));
  const engineId: EngineId = typeDef?.needsNewerEngine ? "eigen" : draft.engine ?? (state.engine ? "eigen" : "starter");
  const levels = typeDef?.engineSource === "source" && source ? source.engine.levels
    : contractLevels(state, data, engineLevels(state, data, engineId === "eigen" && !state.engine ? "starter" : engineId), draft.contractOfferId);
  const lead = draft.platforms[0];
  const brand = draft.brandId == null ? undefined : state.brands.find((b) => b.id === draft.brandId);
  const year = dateOf(state.startYear, state.week).year;
  return {
    locked: data.features.filter((f) => f.availableFrom <= year && missingModule(data, levels, f.id)).map((f) => ({
      id: f.id, need: missingModule(data, levels, f.id)!,
      orderBlocked: engineId !== "eigen" || typeDef?.requires === "releasedGame" ? "error.noEngine" : orderBlocker(state, data, levels, f.id),
    })),
    cardCost: lead && data.platforms.some((p) => p.id === lead)
      ? Object.fromEntries(data.features.filter((f) => f.availableFrom <= year).map((f) => [f.id, featureCost(data, state, f.id, lead)]))
      : {},
    cardFit: cardFit(data, known, draft.scope, expected, year),
    versions: platformVersions(data, state, known, draft.platforms.filter((id) => data.platforms.some((p) => p.id === id))),
    engineFactorBp: projectEngineFactor(data, levels, known, year).factorBp,
    engineLevels: levels,
    cardSynergy: cardSynergy(data, known, year),
    quality: qualityPreview(state, data, draft, known, chosen, levels),
    brandFans: brand ? startFans(data, brand, draft.genre) : 0,
    audience: audiencePreview(data, draft),
    steer: null,
    profileActual: actual,
    profileExpected: expected,
    deviationBp: known.length > 0 ? profileFactor(data, actual, expected).deviation : 0,
    effortBp: effort,
    weeks,
    costCent: weeks * weeklyOfChosen,
    ageRating: ageRating(data, draft.theme, known),
    slots: data.projects.featureSlots[draft.scope],
    bestStrength,
    ...printRunPreview(state, data, draft),
    fundsCent: state.moneyCent + Math.max(0, creditLimit(state, data).limitCent - state.finance.loanCent),
    error: validateInput(state, data, input),
  };
}

function audiencePreview(data: GameData, draft: BoardDraft): BoardPreview["audience"] {
  const a = audienceOf(data, draft.audience);
  return { id: a.id, demandBp: a.demandBp, genreFitBp: a.genreFitBp[draft.genre] ?? BP_ONE, decayBp: a.decayBp, expectationBp: a.expectationBp, fansBp: a.fansBp };
}
