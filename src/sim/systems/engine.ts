// Engines nach S03: Module, Stand der Technik, Starter-Engine, eigene Engine, Engine-Faktor E und Lizenzqualität L.
import { type Bp, BP_ONE, type Cent, clamp, divBp, divInt, mulBp, mulDiv, powBp } from "../num";
import {
  MODULES, type EngineId, type EngineJob, type EngineModuleFactor, type EnginePlan, type GameData, type GameState,
  type MiddlewareVendor, type ModuleKind, type ModuleMap, type ModuleNeed, type OwnEngine, type Person, type Project, type ProjectEngine, type Scope,
} from "../model/types";
import { featureById } from "./produkte/quality";
import { dateOf, isFirstWeekOfYear } from "../calendar";
import { log } from "./firma";
import { chronicle } from "./katalog";
import { payLicense, scaleToYear } from "./finanzen";
import { crewWork } from "./personal";
import { researchFactor } from "./buero";

export function moduleMap<T>(f: (m: ModuleKind) => T): ModuleMap<T> {
  return Object.fromEntries(MODULES.map((m) => [m, f(m)])) as ModuleMap<T>;
}

/** Höchste Stufe eines Moduls, die es in den Daten gibt. */
export function maxLevel(data: GameData, module: ModuleKind): number {
  return data.engine.modules[module].length - 1;
}

/** S03 Begriffe: Stand der Technik = höchste Stufe, deren frühestes Jahr erreicht ist (ENG-R01, ENG-R02). */
export function stateOfArt(data: GameData, module: ModuleKind, year: number): number {
  const levels = data.engine.modules[module];
  let art = 0;
  for (let l = 0; l < levels.length; l++) if (levels[l]!.earliestYear <= year) art = l;
  return art;
}

export function stateOfArtMap(data: GameData, year: number): ModuleMap {
  return moduleMap((m) => stateOfArt(data, m, year));
}

/** ENG-R06, ENG-T09: Die Starter-Engine hat Rendering 1 und sonst überall Stufe 0. */
/**
 * Starter-Engine (Hausmittel). Etappe 6c.10: Bei einem späteren Startjahr entspricht sie dem Stand der Technik
 * starterLagYears Jahre vor dem Start, mindestens den Datenstufen; 1980 bleibt sie wie in den Daten.
 */
export function starterLevels(data: GameData, startYear: number = data.start.startYear): ModuleMap {
  if (startYear <= data.start.startYear) return { ...data.engine.starter };
  const lagged = laggedLevels(data, data.engine.starterLagYears, startYear);
  return moduleMap((m) => Math.max(data.engine.starter[m], lagged[m]));
}

export function ownLevels(engine: OwnEngine): ModuleMap {
  return moduleMap((m) => engine.modules[m].level);
}

/** Stand der Technik vor lagYears Jahren (KI-Engines und Hausmittel der KI, S04 und S08). */
export function laggedLevels(data: GameData, lagYears: number, year: number): ModuleMap {
  const y = Math.max(data.start.startYear, year - lagYears);
  return moduleMap((m) => stateOfArt(data, m, y));
}

/**
 * Balancing 1.0 (Entscheidung Projektleitung 03.11.2026): Module der eigenen Engine, die mehr als behindWarnLevels Stufen
 * hinter dem Stand der Technik liegen (sortiert nach Modul-Reihenfolge). Ohne eigene Engine leer.
 */
export function engineBehind(state: GameState, data: GameData): { module: ModuleKind; level: number; art: number }[] {
  if (!state.engine) return [];
  const levels = engineLevels(state, data, "eigen");
  const art = stateOfArtMap(data, dateOf(state.startYear, state.week).year);
  return MODULES.filter((m) => art[m] - levels[m] > data.engine.behindWarnLevels).map((m) => ({ module: m, level: levels[m], art: art[m] }));
}

/** Jahreswechsel: Hinweis im Bericht, wenn die eigene Engine zurückfällt (Wertungen sinken sonst schleichend). */
export function engineBehindCheck(state: GameState, data: GameData): void {
  const behind = engineBehind(state, data);
  if (behind.length === 0) return;
  log(state, "log.engineBehind", { count: behind.length, n: data.engine.behindWarnLevels, gap: Math.max(...behind.map((b) => b.art - b.level)) });
}

/** Stufen einer Engine, wie ein neues Projekt sie bekommt; „lizenz:N“ ist Engine N im Lizenzmarkt (S04). */
export function engineLevels(state: GameState, data: GameData, id: EngineId): ModuleMap {
  if (id.startsWith("lizenz:")) {
    const e = state.licensing.engines.find((x) => `lizenz:${x.id}` === id);
    if (e && e.ownerId !== 0) return laggedLevels(data, e.lagYears, dateOf(state.startYear, state.week).year);
    return starterLevels(data, state.startYear);
  }
  return id === "eigen" && state.engine ? ownLevels(state.engine) : starterLevels(data, state.startYear);
}

/** PRD-R10: Ohne Angabe nimmt ein Projekt die eigene Engine, sonst die Starter-Engine. */
export function defaultEngineId(state: GameState): EngineId {
  return state.engine ? "eigen" : "starter";
}

/** ENG-R41: Klein und mittel sind fest gebunden (groß und AAA mitlaufend, ab Etappe 3). */
export function defaultBinding(scope: Scope): ProjectEngine["binding"] {
  return scope === "klein" || scope === "mittel" ? "fest" : "mitlaufend";
}

export function projectEngine(state: GameState, data: GameData, id: EngineId, scope: Scope): ProjectEngine {
  const own = id === "eigen" ? state.engine : null;
  return { id, major: own?.major ?? 1, minor: own?.minor ?? 0, binding: defaultBinding(scope), levels: engineLevels(state, data, id) };
}

/** S03 5.1: ((Stufe + 1) / (Stand + 1))^γ, höchstens der Vorreiter-Bonus. */
export function moduleFactor(data: GameData, level: number, art: number): Bp {
  const f = data.engine.factor;
  const ratio = divBp(level + 1, art + 1, 1);
  return Math.min(powBp(ratio, f.gammaBp), f.pioneerMaxBp);
}

/** Module, die ein Projekt durch seine Features nutzt (ENG-R11), sortiert nach der Modul-Reihenfolge. */
export function usedModules(data: GameData, features: readonly string[]): ModuleKind[] {
  const used = new Set(features.map((id) => featureById(data, id).requires.module));
  return MODULES.filter((m) => used.has(m));
}

/**
 * ENG-R10, ENG-R11, S03 5.1: E = Mittel über die genutzten Module von ((Stufe + 1) / (Stand + 1))^γ, begrenzt auf
 * 0,3–1,15. Ohne genutztes Modul ist E neutral (1).
 */
export function engineFactor(data: GameData, levels: ModuleMap, modules: readonly ModuleKind[], year: number): { factorBp: Bp; modules: EngineModuleFactor[] } {
  const f = data.engine.factor;
  if (modules.length === 0) return { factorBp: BP_ONE, modules: [] };
  const list = modules.map((m) => {
    const art = stateOfArt(data, m, year);
    return { module: m, level: levels[m], art, factorBp: moduleFactor(data, levels[m], art) };
  });
  const mean = divInt(list.reduce((s, x) => s + x.factorBp, 0), list.length, 1);
  return { factorBp: clamp(mean, f.minBp, f.maxBp), modules: list };
}

export function projectEngineFactor(data: GameData, levels: ModuleMap, features: readonly string[], year: number) {
  return engineFactor(data, levels, usedModules(data, features), year);
}

/** ENG-R13, ENG-T12: L = (E − 0,3) / 0,85 mit allen acht Modulen, begrenzt auf 0–1. */
export function licenseQuality(data: GameData, eBp: Bp): Bp {
  const f = data.engine.factor;
  return clamp(divBp(eBp - f.licenseMinBp, f.licenseSpanBp, 1), 0, BP_ONE);
}

/** PRD-R11: fehlende Modulstufe einer Karte bei diesen Engine-Stufen oder null. */
export function missingModule(data: GameData, levels: ModuleMap, featureId: string): ModuleNeed | null {
  const need = featureById(data, featureId).requires;
  return levels[need.module] >= need.level ? null : need;
}

/**
 * S03 5 Forschungskosten: 40 Personenwochen · 1,8^Stufe (bp-Personenwochen).
 * ANNAHME (Inhaltsausbau nach 3.12, OFFENE-FRAGEN): Rendering und Audio haben doppelt so viele, dafür kleinere Stufen;
 * ihr Wachstum je Stufe (1,34) hält die Kosten der höchsten Stufe etwa gleich.
 */
export function researchEffort(data: GameData, module: ModuleKind, level: number): Bp {
  const growth = data.engine.researchGrowthByModuleBp?.[module] ?? data.engine.researchGrowthBp;
  let effort = data.engine.researchBasePwBp;
  for (let i = 0; i < level; i++) effort = mulBp(effort, growth);
  return effort;
}

/** Neue eigene Engine auf den Stufen der Starter-Engine, Version 1.0 (Plan Etappe 2, Punkt 3). */
export function foundEngine(state: GameState, data: GameData, name: string): OwnEngine {
  const levels = starterLevels(data, state.startYear);
  const engine: OwnEngine = {
    name: name.trim().slice(0, 40),
    major: 1,
    minor: 0,
    modules: moduleMap((m) => ({ level: levels[m], debtBp: 0, origin: "eigen" as const, vendor: null, ownLevel: levels[m], ownDebtBp: 0 })),
    foundedWeek: state.week,
    versions: [{ major: 1, minor: 0, week: state.week, levels }],
    plan: { ...data.engine.versions.defaultPlan },
    jobs: [],
    nextJobId: 1,
    lastRecommendWeek: null,
  };
  state.engine = engine;
  return engine;
}

export function validateFoundEngine(state: GameState, name: string): string | null {
  if (state.engine) return "error.engineExists";
  if (state.unlocks["engine"] === undefined) return "error.locked";
  if (name.trim().length === 0) return "error.noName";
  return null;
}

// ---------- Engine-Team, Forschung, Versionen, Schuld (ENG-R03 bis ENG-R05, ENG-R20 bis ENG-R23) ----------

/** Plan Etappe 2, Punkt 1: Das Engine-Team sind die Personen mit Zuordnung „Engine“ (ohne laufende Einarbeitung). */
export function engineTeam(state: GameState): Person[] {
  return state.people.filter((p) => p.assignment?.kind === "engine");
}

export function engineCapacity(state: GameState, data: GameData): Bp {
  const working = engineTeam(state).filter((p) => p.transferWeeks === 0);
  const pace = state.office.moveWeeksLeft > 0 ? data.offices.moveProductivityBp : BP_ONE;
  // FRM-R03, FRM-R09: Teamleistung; der Technische Direktor beschleunigt das Engine-Team.
  // Tabelle 5.4: Forschungslabor +20 % Engine-Forschung.
  // BTR-R02: Ohne Abteilung Betrieb beantwortet das Engine-Team den Support selbst (höchstens −30 % Tempo).
  const support = BP_ONE - (state.operations?.engineMalusBp ?? 0);
  return mulBp(mulBp(mulBp(crewWork(state, data, working, true, false), pace), researchFactor(state, data)), support);
}

/** S03 5.2: Tempo = 1 − 0,004 · Schuld (Schuld in Punkten). */
export function debtTempo(data: GameData, debtBp: Bp): Bp {
  return BP_ONE - mulBp(debtBp, data.engine.debt.tempoPerDebtBp);
}

/** S03 5.2: Bugs = 1 + 0,01 · Schuld. */
export function debtBugs(data: GameData, debtBp: Bp): Bp {
  return BP_ONE + mulBp(debtBp, data.engine.debt.bugsPerDebtBp);
}

/** S03 5.2, ENG-R23: Updatekosten = K · (1 + 0,01 · Schuld), ab Schuld 80 doppelt. */
export function updateCost(data: GameData, baseBp: Bp, debtBp: Bp): Bp {
  const d = data.engine.debt;
  const cost = mulBp(baseBp, BP_ONE + mulBp(debtBp, d.updateCostPerDebtBp));
  return debtBp >= d.rebuildRecommendBp ? mulBp(cost, d.highDebtCostFactorBp) : cost;
}

/** Stufe, die ein Modul nach allen schon geplanten Arbeiten hätte. */
export function plannedLevel(engine: OwnEngine, module: ModuleKind): number {
  return engine.jobs.reduce((l, j) => (j.module === module && j.kind !== "hauptversion" ? Math.max(l, j.level) : l), engine.modules[module].level);
}

/** ENG-R02, ENG-R31: nächste Stufe ist erforschbar, wenn ihr Jahr erreicht ist, die Voraussetzungen geplant sind und das Modul nicht lizenziert ist. */
export function researchBlocker(state: GameState, data: GameData, module: ModuleKind, level: number): string | null {
  const engine = state.engine;
  if (!engine) return "error.noEngine";
  if (engine.modules[module].origin === "lizenziert") return "error.moduleLicensed";
  const def = data.engine.modules[module][level];
  if (!def) return "error.maxLevel";
  if (def.earliestYear > dateOf(state.startYear, state.week).year) return "error.tooEarly";
  for (const r of def.requires ?? []) if (plannedLevel(engine, r.module) < r.level) return "error.requiresModule";
  return null;
}

export function validatePlanResearch(state: GameState, data: GameData, module: ModuleKind): string | null {
  if (!state.engine) return "error.noEngine";
  return researchBlocker(state, data, module, plannedLevel(state.engine, module) + 1);
}

function addJob(engine: OwnEngine, job: Omit<EngineJob, "id" | "doneBp" | "weeksWorked">): EngineJob {
  const full: EngineJob = { ...job, id: engine.nextJobId, doneBp: 0, weeksWorked: 0 };
  engine.nextJobId += 1;
  engine.jobs.push(full);
  return full;
}

export function planResearch(state: GameState, data: GameData, module: ModuleKind): EngineJob {
  const engine = state.engine!;
  const level = plannedLevel(engine, module) + 1;
  return addJob(engine, {
    kind: "forschung", module, level, effortBp: updateCost(data, researchEffort(data, module, level), engine.modules[module].debtBp),
    projects: [], deadlineWeek: null, priority: 3,
  });
}

/** ENG-R05, Plan Etappe 2 Punkt 4: Neubau aller nicht lizenzierten Module, 30 % ihrer Forschungsaufwände. */
export function majorEffort(data: GameData, engine: OwnEngine): Bp {
  return MODULES.reduce((s, m) => {
    const mod = engine.modules[m];
    if (mod.origin === "lizenziert" || mod.level === 0) return s;
    let sum = 0;
    for (let l = 1; l <= mod.level; l++) sum += researchEffort(data, m, l);
    return s + mulBp(sum, data.engine.versions.majorShareBp);
  }, 0);
}

export function validateMajor(state: GameState): string | null {
  if (!state.engine) return "error.noEngine";
  if (state.engine.jobs.some((j) => j.kind === "hauptversion")) return "error.majorPlanned";
  return null;
}

export function startMajor(state: GameState, data: GameData): EngineJob {
  const engine = state.engine!;
  return addJob(engine, { kind: "hauptversion", module: null, level: engine.major + 1, effortBp: Math.max(1, majorEffort(data, engine)), projects: [], deadlineWeek: null, priority: 3 });
}

export function validateCancelJob(state: GameState, jobId: number): string | null {
  const job = state.engine?.jobs.find((j) => j.id === jobId);
  if (!job) return "error.unknownJob";
  // Eine spätere Stufe desselben Moduls hängt an dieser.
  if (job.module && state.engine!.jobs.some((j) => j.module === job.module && j.level > job.level && j.kind !== "hauptversion")) return "error.jobHasFollower";
  return null;
}

export function cancelJob(state: GameState, jobId: number): void {
  state.engine!.jobs = state.engine!.jobs.filter((j) => j.id !== jobId);
}

export function validatePlan(plan: EnginePlan): string | null {
  const parts = [plan.researchBp, plan.maintenanceBp, plan.requestsBp];
  if (parts.some((x) => !Number.isSafeInteger(x) || x < 0) || parts.reduce((a, b) => a + b, 0) !== BP_ONE) return "error.planSum";
  return null;
}

/** Kann an einer Arbeit diese Woche gearbeitet werden? Stufen der Reihe nach, Voraussetzungen erreicht (ENG-R01). */
function workable(state: GameState, data: GameData, engine: OwnEngine, job: EngineJob): boolean {
  if (job.kind === "hauptversion") return true;
  const m = job.module!;
  if (engine.modules[m].level !== job.level - 1) return false;
  const def = data.engine.modules[m][job.level]!;
  if (def.earliestYear > dateOf(state.startYear, state.week).year) return false;
  return (def.requires ?? []).every((r) => engine.modules[r.module].level >= r.level);
}

/** ENG-R52: Anforderungen nach Priorität (1 = zuerst), dann Frist, dann ID. */
export function requestOrder(a: EngineJob, b: EngineJob): number {
  return a.priority - b.priority || (a.deadlineWeek ?? 0) - (b.deadlineWeek ?? 0) || a.id - b.id;
}

/** Verteilt Kapazität auf die Arbeiten der Reihe nach; liefert den Rest. */
function pour(state: GameState, data: GameData, engine: OwnEngine, jobs: EngineJob[], capacity: Bp): Bp {
  let left = capacity;
  for (const job of jobs) {
    if (left <= 0) break;
    if (!workable(state, data, engine, job)) continue;
    const take = Math.min(left, Math.max(0, job.effortBp - job.doneBp));
    job.doneBp += take;
    job.weeksWorked += 1;
    left -= take;
  }
  return left;
}

/** ENG-R20: Wartung senkt die Schuld, zuerst im Modul mit der höchsten Schuld (ANNAHME). */
function maintain(data: GameData, engine: OwnEngine, capacity: Bp): void {
  let points = mulBp(capacity, data.engine.debt.maintenancePerPwBp);
  while (points > 0) {
    let worst: ModuleKind | null = null;
    for (const m of MODULES) if (engine.modules[m].debtBp > 0 && (worst === null || engine.modules[m].debtBp > engine.modules[worst].debtBp)) worst = m;
    if (worst === null) return;
    const take = Math.min(points, engine.modules[worst].debtBp);
    engine.modules[worst].debtBp -= take;
    points -= take;
  }
}

export interface EngineUpdate {
  major: number;
  minor: number;
  /** Geänderte Module (bei einer Hauptversion alle eigenen). */
  modules: ModuleKind[];
  job: EngineJob | null;
}

function pushVersion(state: GameState, engine: OwnEngine): void {
  engine.versions.push({ major: engine.major, minor: engine.minor, week: state.week, levels: ownLevels(engine) });
}

/** Fertige Arbeiten anwenden: Update mit neuer Unterversion (ENG-R04, ENG-R20) oder neue Hauptversion (ENG-R05). */
function finishJobs(state: GameState, data: GameData, engine: OwnEngine): EngineUpdate[] {
  const updates: EngineUpdate[] = [];
  for (const job of [...engine.jobs].sort((a, b) => a.id - b.id)) {
    if (job.doneBp < job.effortBp || job.weeksWorked < data.engine.minResearchWeeks) continue;
    engine.jobs = engine.jobs.filter((j) => j.id !== job.id);
    if (job.kind === "hauptversion") {
      engine.major += 1;
      engine.minor = 0;
      const rebuilt = MODULES.filter((m) => engine.modules[m].origin !== "lizenziert");
      for (const m of rebuilt) engine.modules[m].debtBp = data.engine.debt.afterRebuildBp;
      pushVersion(state, engine);
      updates.push({ major: engine.major, minor: 0, modules: rebuilt, job });
      log(state, "log.majorDone", { engine: engine.name, major: engine.major });
      chronicle(state, "log.majorDone", { engine: engine.name, major: engine.major });
      continue;
    }
    const m = job.module!;
    const mod = engine.modules[m];
    mod.level = job.level;
    mod.debtBp = Math.min(BP_ONE, mod.debtBp + data.engine.debt.perUpdateBp);
    engine.minor += 1;
    pushVersion(state, engine);
    updates.push({ major: engine.major, minor: engine.minor, modules: [m], job });
    log(state, "log.researchDone", { engine: engine.name, module: m, level: job.level, major: engine.major, minor: engine.minor });
    // ENG-R02: Wer eine Stufe im Jahr ihres Erscheinens erreicht, ist Vorreiter (Information; Vorteil im Lizenzmarkt mit S04).
    if (data.engine.modules[m][job.level]!.earliestYear === dateOf(state.startYear, state.week).year) {
      log(state, "log.pioneer", { module: m, level: job.level });
      chronicle(state, "log.pioneer", { module: m, level: job.level });
    }
  }
  return updates;
}

/**
 * Tick-Schritt 4: Kapazität nach dem Trennbalken (S03 EngineTeamPlan). Nicht gebrauchte Kapazität für Anforderungen
 * geht in die Forschung, nicht gebrauchte Forschung an die Anforderungen und dann in die Wartung (ANNAHME).
 */
export function engineStep(state: GameState, data: GameData): EngineUpdate[] {
  const engine = state.engine;
  if (!engine) return [];
  const roadmap = isFirstWeekOfYear(state.week) ? followRoadmaps(state, data) : [];
  const capacity = engineCapacity(state, data);
  const requests = engine.jobs.filter((j) => j.kind === "anforderung").sort(requestOrder);
  const research = engine.jobs.filter((j) => j.kind !== "anforderung").sort((a, b) => a.id - b.id);
  const reqCap = mulBp(capacity, engine.plan.requestsBp);
  const resCap = mulBp(capacity, engine.plan.researchBp);
  const maintCap = capacity - reqCap - resCap;
  const reqLeft = pour(state, data, engine, requests, reqCap);
  const resLeft = pour(state, data, engine, research, resCap + reqLeft);
  const rest = pour(state, data, engine, requests, resLeft);
  maintain(data, engine, maintCap + rest);
  for (const p of engineTeam(state)) if (p.transferWeeks === 0) p.experienceEngine = Math.min(BP_ONE, p.experienceEngine + data.start.experienceGainPerWeekBp);
  const done = finishJobs(state, data, engine);
  if (roadmap.length === 0) return done;
  // Ein Anbieter-Update zählt für mitlaufende Projekte wie ein eigenes (ENG-R40).
  return [{ major: engine.major, minor: engine.minor, modules: roadmap, job: null }, ...done];
}

/** ENG-R23: Ab Schuld 80 in einem Modul empfiehlt das Spiel eine neue Hauptversion (höchstens einmal je Abklingzeit). */
export function rebuildRecommended(state: GameState, data: GameData): ModuleKind | null {
  const engine = state.engine;
  if (!engine || engine.jobs.some((j) => j.kind === "hauptversion")) return null;
  const d = data.engine.debt;
  if (engine.lastRecommendWeek !== null && state.week - engine.lastRecommendWeek < d.recommendCooldownWeeks) return null;
  return MODULES.find((m) => engine.modules[m].debtBp >= d.rebuildRecommendBp) ?? null;
}

/** ENG-R21: Tempo und Bug-Faktor eines Projekts aus der Schuld der genutzten Module seiner Engine. */
export function projectDebt(state: GameState, data: GameData, project: Project): { tempoBp: Bp; bugsBp: Bp; worst: ModuleKind | null; debtBp: Bp } {
  const engine = project.engine.id === "eigen" ? state.engine : null;
  const used = engine ? usedModules(data, project.features) : [];
  if (!engine || used.length === 0) return { tempoBp: BP_ONE, bugsBp: BP_ONE, worst: null, debtBp: 0 };
  const debt = divInt(used.reduce((s, m) => s + engine.modules[m].debtBp, 0), used.length, 1);
  let worst = used[0]!;
  for (const m of used) if (engine.modules[m].debtBp > engine.modules[worst].debtBp) worst = m;
  return { tempoBp: debtTempo(data, debt), bugsBp: debtBugs(data, debt), worst: engine.modules[worst].debtBp > 0 ? worst : null, debtBp: debt };
}

/** ENG-R22: Symptom, sobald die Schuld ein Projekt um eine weitere ganze Woche verzögert hat. */
export function recordDebtDelay(state: GameState, project: Project, tempoBp: Bp, worst: ModuleKind | null): void {
  if (tempoBp >= BP_ONE || worst === null) return;
  project.debtLostWeeksBp += BP_ONE - tempoBp;
  const weeks = divInt(project.debtLostWeeksBp, BP_ONE, 1);
  if (weeks > project.debtWeeksReported) {
    project.debtWeeksReported = weeks;
    log(state, "log.debtSymptom", { project: project.title, weeks, module: worst });
  }
}

// ---------- Fremdmodule (ENG-R30 bis ENG-R32) ----------

export function vendorById(data: GameData, id: string): MiddlewareVendor | undefined {
  return data.engine.middleware.vendors.find((v) => v.id === id);
}

/** ENG-R31: Stufe des Anbieters im Jahr (seine Roadmap): Stand der Technik vor lagYears Jahren; vor fromYear keine. */
export function vendorLevel(data: GameData, vendor: MiddlewareVendor, year: number): number | null {
  if (year < vendor.fromYear) return null;
  return stateOfArt(data, vendor.module, year - vendor.lagYears);
}

/**
 * ENG-R30: Lizenzgebühr je Spiel, aufs Lohnniveau des Jahres hochgerechnet. Modell „groesse“ nach Umfang
 * (ANNAHME, Wunsch aus der Abnahme: Gebühren mal nach Größe, mal Festbetrag mit Beteiligung).
 */
export function licenseFee(data: GameData, vendor: MiddlewareVendor, year: number, scope: Scope = "mittel"): Cent {
  const base = scaleToYear(data, vendor.licenseFeeCent, year);
  return vendor.feeModel === "groesse" ? mulBp(base, data.engine.middleware.feeScopeBp[scope]) : base;
}

/** ENG-R30: Kaufpreis = Preis je Personenwoche · Forschungsaufwand aller Stufen bis zur Stufe des Anbieters. */
export function buyPrice(data: GameData, vendor: MiddlewareVendor, year: number): Cent {
  const level = vendorLevel(data, vendor, year) ?? 0;
  let pw = 0;
  for (let l = 1; l <= level; l++) pw += researchEffort(data, vendor.module, l);
  return scaleToYear(data, mulDiv(vendor.buyPerPwCent, pw, BP_ONE, 1), year);
}

export function validateMiddleware(state: GameState, data: GameData, kind: "licenseModule" | "buyModule", vendorId: string): string | null {
  const engine = state.engine;
  if (!engine) return "error.noEngine";
  const vendor = vendorById(data, vendorId);
  if (!vendor) return "error.unknownVendor";
  const year = dateOf(state.startYear, state.week).year;
  const level = vendorLevel(data, vendor, year);
  if (level === null) return "error.vendorNotYet";
  const mod = engine.modules[vendor.module];
  if (mod.origin === "lizenziert") return "error.moduleLicensed";
  if (level <= mod.level) return "error.vendorNotBetter";
  if (kind === "buyModule" && state.moneyCent < buyPrice(data, vendor, year)) return "error.notEnoughMoney";
  return null;
}

/** Eigene Arbeiten am Modul entfallen, wenn es fremd wird (ENG-R31: keine eigene Forschung). */
function dropModuleJobs(engine: OwnEngine, module: ModuleKind): void {
  engine.jobs = engine.jobs.filter((j) => j.module !== module || j.kind === "anforderung");
}

function moduleUpdate(state: GameState, engine: OwnEngine): void {
  engine.minor += 1;
  pushVersion(state, engine);
}

/** ENG-R31: Lizenziertes Modul startet auf der Stufe des Anbieters, ohne eigene Schuld (ANNAHME: der Anbieter pflegt). */
export function licenseModule(state: GameState, data: GameData, vendorId: string): void {
  const engine = state.engine!;
  const vendor = vendorById(data, vendorId)!;
  const mod = engine.modules[vendor.module];
  engine.modules[vendor.module] = {
    level: vendorLevel(data, vendor, dateOf(state.startYear, state.week).year)!, debtBp: 0, origin: "lizenziert", vendor: vendor.id,
    ownLevel: mod.level, ownDebtBp: mod.debtBp,
  };
  dropModuleJobs(engine, vendor.module);
  moduleUpdate(state, engine);
  log(state, "log.moduleLicensed", { module: vendor.module, vendor: vendor.id, level: engine.modules[vendor.module].level });
}

/** ENG-R32, ENG-T07: Gekauftes Modul übernimmt Stufe und Schuld des Verkäufers und gehört danach der Firma. */
export function buyModule(state: GameState, data: GameData, vendorId: string): void {
  const engine = state.engine!;
  const vendor = vendorById(data, vendorId)!;
  const year = dateOf(state.startYear, state.week).year;
  const price = buyPrice(data, vendor, year);
  payLicense(state, price);
  const level = vendorLevel(data, vendor, year)!;
  engine.modules[vendor.module] = { level, debtBp: vendor.debtBp, origin: "gekauft", vendor: vendor.id, ownLevel: level, ownDebtBp: vendor.debtBp };
  dropModuleJobs(engine, vendor.module);
  moduleUpdate(state, engine);
  log(state, "log.moduleBought", { module: vendor.module, vendor: vendor.id, level, cost: price });
}

export function validateEndLicense(state: GameState, module: ModuleKind): string | null {
  if (!state.engine) return "error.noEngine";
  return state.engine.modules[module].origin === "lizenziert" ? null : "error.notLicensed";
}

/** ANNAHME: Nach dem Ende der Lizenz gilt wieder die eigene Stufe von davor. */
export function endLicense(state: GameState, module: ModuleKind): void {
  const engine = state.engine!;
  const mod = engine.modules[module];
  engine.modules[module] = { level: mod.ownLevel, debtBp: mod.ownDebtBp, origin: "eigen", vendor: null, ownLevel: mod.ownLevel, ownDebtBp: mod.ownDebtBp };
  moduleUpdate(state, engine);
  log(state, "log.licenseEnded", { module });
}

/** ENG-R31: Lizenzierte Module folgen jährlich der Roadmap des Anbieters (ein Update der Engine je neuer Stufe). */
export function followRoadmaps(state: GameState, data: GameData): ModuleKind[] {
  const engine = state.engine;
  if (!engine) return [];
  const year = dateOf(state.startYear, state.week).year;
  const changed: ModuleKind[] = [];
  for (const m of MODULES) {
    const mod = engine.modules[m];
    if (mod.origin !== "lizenziert") continue;
    const level = vendorLevel(data, vendorById(data, mod.vendor!)!, year) ?? mod.level;
    if (level > mod.level) {
      mod.level = level;
      changed.push(m);
    }
  }
  if (changed.length > 0) {
    moduleUpdate(state, engine);
    for (const m of changed) log(state, "log.vendorUpdate", { module: m, level: engine.modules[m].level });
  }
  return changed;
}

/** ENG-R30: Lizenzierte Module, die ein Projekt nutzt, mit ihren Anbietern. */
function licensedVendors(state: GameState, data: GameData, project: Project): MiddlewareVendor[] {
  const engine = project.engine.id === "eigen" ? state.engine : null;
  if (!engine) return [];
  return usedModules(data, project.features).filter((m) => engine.modules[m].origin === "lizenziert")
    .map((m) => vendorById(data, engine.modules[m].vendor!)!);
}

/** ENG-R30: Summe der Umsatzbeteiligungen der lizenzierten Module eines Projekts (Modell „beteiligung“). */
export function licenseRoyalty(state: GameState, data: GameData, project: Project): Bp {
  return licensedVendors(state, data, project).reduce((s, v) => s + (v.feeModel === "beteiligung" ? v.royaltyBp : 0), 0);
}

/** ENG-R30: Gebühr je veröffentlichtem Spiel für jedes lizenzierte Modul, das es nutzt. */
export function releaseLicenseFees(state: GameState, data: GameData, project: Project): Cent {
  const year = dateOf(state.startYear, state.week).year;
  const fee = licensedVendors(state, data, project).reduce((s, v) => s + licenseFee(data, v, year, project.scope), 0);
  if (fee > 0) {
    payLicense(state, fee);
    log(state, "log.licenseFees", { project: project.title, cost: fee });
  }
  return fee;
}
