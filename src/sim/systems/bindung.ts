// Engine-Bindung laufender Projekte und Anforderungen an das Engine-Team (S03 ENG-R40 bis ENG-R53, PRD-R12, PRD-R27).
import { type Bp, BP_ONE, divInt, mulBp } from "../num";
import type { GameData, GameState, ModuleKind, Project, ProjectEngine, Scope } from "../model/types";
import { dateOf } from "../calendar";
import { featureById } from "./produkte/quality";
import { progressShare } from "./produkte/projects";
import { assignedTo, log } from "./firma";
import { versionShares } from "./leistung";
import { type EngineUpdate, ownLevels, plannedLevel, updateCost, researchEffort, projectDebt } from "./engine";

/** PRD-R27: Anteil am Gesamtaufwand, bei dem der Feature-Freeze liegt (klein 60 % der Produktion, mittel Beginn der Beta). */
export function freezeShare(data: GameData, scope: Scope): Bp {
  const f = data.projects.freeze[scope];
  const list = data.projects.phases[scope];
  const i = list.findIndex((p) => p.id === f.phase);
  if (i < 0) return BP_ONE;
  const start = i > 0 ? list[i - 1]!.untilBp : 0;
  return start + mulBp(list[i]!.untilBp - start, f.shareBp);
}

export function freezeEffort(data: GameData, project: Project): Bp {
  return mulBp(project.effortTotalBp, freezeShare(data, project.scope));
}

export function isFrozen(data: GameData, project: Project): boolean {
  return progressShare(project) >= freezeShare(data, project.scope);
}

/** Wochenleistung eines Projekts bei aktueller Besetzung, mindestens die einer Person (für Fristen und Integration). */
function weeklyWork(state: GameState, data: GameData, project: Project): Bp {
  const people = Math.max(1, assignedTo(state, project.id).length);
  return Math.max(1, mulBp(people * data.start.workPerPersonWeekBp, projectDebt(state, data, project).tempoBp));
}

/** ENG-R50: geplanter Feature-Freeze als Woche bei aktueller Besetzung. */
export function freezeWeek(state: GameState, data: GameData, project: Project): number {
  const left = Math.max(0, freezeEffort(data, project) - project.effortDoneBp);
  const work = weeklyWork(state, data, project);
  return state.week + divInt(left + work - 1, work, 1);
}

/** PRD-R12: Kann eine gesperrte Karte beim eigenen Engine-Team bestellt werden? Alle fehlenden Stufen müssen erreichbar sein. */
export function orderBlocker(state: GameState, data: GameData, levels: ProjectEngine["levels"], featureId: string): string | null {
  const engine = state.engine;
  if (!engine) return "error.noEngine";
  const need = featureById(data, featureId).requires;
  if (levels[need.module] >= need.level) return "error.notLocked";
  if (engine.modules[need.module].origin === "lizenziert") return "error.moduleLicensed";
  const year = dateOf(state.startYear, state.week).year;
  for (let l = levels[need.module] + 1; l <= need.level; l++) {
    const def = data.engine.modules[need.module][l]!;
    if (def.earliestYear > year) return "error.tooEarly";
  }
  return null;
}

/**
 * ENG-R50, ENG-R51: Anforderungen für alle fehlenden Stufen der Karte. Gleiche Stufen werden zusammengefasst; es gilt
 * die früheste Frist. Eine schon geplante Forschung derselben Stufe wird zur Anforderung (behält ihren Fortschritt).
 */
export function placeRequests(state: GameState, data: GameData, project: Project, featureIds: readonly string[]): void {
  const engine = state.engine!;
  const deadline = freezeWeek(state, data, project);
  for (const id of featureIds) {
    const need = featureById(data, id).requires;
    for (let l = engine.modules[need.module].level + 1; l <= need.level; l++) {
      const existing = engine.jobs.find((j) => j.module === need.module && j.level === l && j.kind !== "hauptversion");
      if (existing) {
        existing.kind = "anforderung";
        if (!existing.projects.includes(project.id)) existing.projects = [...existing.projects, project.id].sort((a, b) => a - b);
        existing.deadlineWeek = existing.deadlineWeek === null ? deadline : Math.min(existing.deadlineWeek, deadline);
        continue;
      }
      if (plannedLevel(engine, need.module) >= l) continue;
      engine.jobs.push({
        id: engine.nextJobId, kind: "anforderung", module: need.module, level: l,
        effortBp: updateCost(data, researchEffort(data, need.module, l), engine.modules[need.module].debtBp), doneBp: 0, weeksWorked: 0,
        projects: [project.id], deadlineWeek: deadline, priority: data.engine.requests.defaultPriority,
      });
      engine.nextJobId += 1;
    }
    if (!project.pendingFeatures.includes(id)) project.pendingFeatures = [...project.pendingFeatures, id].sort();
  }
}

/** Ein Projekt fällt aus seinen Anforderungen heraus; ohne Anforderer wird daraus normale Forschung (ANNAHME). */
export function dropProjectRequests(state: GameState, projectId: number, module: ModuleKind | null = null): void {
  if (!state.engine) return;
  for (const j of state.engine.jobs) {
    if (j.kind !== "anforderung" || !j.projects.includes(projectId) || (module !== null && j.module !== module)) continue;
    j.projects = j.projects.filter((x) => x !== projectId);
    if (j.projects.length === 0) {
      j.kind = "forschung";
      j.deadlineWeek = null;
    }
  }
}

/** Bestellte Karten, deren Stufe das Projekt inzwischen hat, sind nicht mehr ausstehend. */
function settlePending(state: GameState, data: GameData, project: Project): void {
  const done = project.pendingFeatures.filter((id) => {
    const need = featureById(data, id).requires;
    return project.engine.levels[need.module] >= need.level;
  });
  if (done.length === 0) return;
  project.pendingFeatures = project.pendingFeatures.filter((id) => !done.includes(id));
  if (project.pendingFeatures.length === 0) project.waitingForEngine = false;
  for (const id of done) log(state, "log.requestDone", { project: project.title, feature: id });
}

function boundProjects(state: GameState): Project[] {
  return state.projects
    .filter((p) => p.engine.id === "eigen" && (p.status === "laeuft" || p.status === "bereit" || p.status === "pausiert"))
    .sort((a, b) => a.id - b.id);
}

/** ENG-R42, S03 5.3: Integration = w_i · |ΔModule| Wochen der Besetzung, Bugs + 5 % der Projekt-Bugs. */
function integrate(state: GameState, data: GameData, project: Project, modules: readonly ModuleKind[]): number {
  const engine = state.engine!;
  const changed = modules.filter((m) => engine.modules[m].level > project.engine.levels[m]);
  for (const m of changed) project.engine.levels[m] = engine.modules[m].level;
  project.engine.major = engine.major;
  project.engine.minor = engine.minor;
  if (changed.length === 0) return 0;
  const weeksBp = data.engine.binding.integrationWeeksBp[project.scope] * changed.length;
  project.effortTotalBp += mulBp(weeklyWork(state, data, project), weeksBp);
  project.bugsBp += mulBp(project.bugsBp, data.engine.binding.updateBugShareBp);
  if (project.status === "bereit") {
    project.status = "laeuft";
    project.readyWeek = null;
    project.goldOffered = false;
  }
  return changed.length;
}

/**
 * Tick-Schritt 4 nach dem Engine-Team: Updates an die Projekte. Wer die Stufe angefordert hat, bekommt sie ohne
 * Integration (Plan Etappe 2, Punkt 6); mitlaufende Projekte übernehmen jedes Update bis zum Freeze (ENG-R40, ENG-R43).
 * Eine neue Hauptversion übernimmt niemand automatisch (ENG-R44).
 */
export function applyEngineUpdates(state: GameState, data: GameData, updates: readonly EngineUpdate[]): void {
  if (!state.engine) return;
  for (const u of updates) {
    for (const p of boundProjects(state)) {
      if (u.job?.kind === "anforderung" && u.job.projects.includes(p.id)) {
        for (const m of u.modules) p.engine.levels[m] = Math.max(p.engine.levels[m], state.engine.modules[m].level);
      } else if (u.job?.kind !== "hauptversion" && p.engine.binding === "mitlaufend" && p.engine.major === state.engine.major && !isFrozen(data, p)) {
        const n = integrate(state, data, p, u.modules);
        if (n > 0) log(state, "log.integrated", { project: p.title, modules: n });
      }
      settlePending(state, data, p);
    }
  }
}

/** Projekt-Freeze mit ausstehenden Karten: Fortschritt endet am Freeze, bis entschieden ist (ENG-R53). */
export function capAtFreeze(data: GameData, project: Project, work: Bp): Bp {
  if (project.pendingFeatures.length === 0) return work;
  return Math.max(0, Math.min(work, freezeEffort(data, project) - project.effortDoneBp));
}

/** ENG-R53: ausstehende Karten, für die am Freeze eine Entscheidung fällig ist. */
export function missedRequests(data: GameData, project: Project): string[] {
  if (project.status !== "laeuft" || project.waitingForEngine || project.pendingFeatures.length === 0) return [];
  return project.effortDoneBp >= freezeEffort(data, project) ? project.pendingFeatures : [];
}

/** ENG-R53 „streichen“: Karte fällt weg, mit dem noch offenen Teil ihres Aufwands (ANNAHME). */
export function dropFeature(state: GameState, data: GameData, project: Project, featureId: string): void {
  const need = featureById(data, featureId).requires;
  const share = BP_ONE - progressShare(project);
  const effort = Object.values(featureById(data, featureId).effort).reduce((s, v) => s + (v ?? 0), 0);
  const scaled = mulBp(mulBp(effort, data.projects.scopeEffortFactorBp[project.scope]), share);
  project.features = project.features.filter((f) => f !== featureId);
  project.pendingFeatures = project.pendingFeatures.filter((f) => f !== featureId);
  project.effortTotalBp = Math.max(project.effortDoneBp + 1, project.effortTotalBp - scaled);
  project.versionShareBp = versionShares(data, state, project.features, project.platforms);
  if (!project.pendingFeatures.some((f) => featureById(data, f).requires.module === need.module)) dropProjectRequests(state, project.id, need.module);
}

/** ENG-R53 „Notlösung“: Karte wirkt mit 70 %, das Modul bekommt +15 Schuld. */
export function makeshiftFeature(state: GameState, data: GameData, project: Project, featureId: string): void {
  const need = featureById(data, featureId).requires;
  project.pendingFeatures = project.pendingFeatures.filter((f) => f !== featureId);
  project.makeshift = [...project.makeshift, featureId].sort();
  if (state.engine) {
    const mod = state.engine.modules[need.module];
    mod.debtBp = Math.min(BP_ONE, mod.debtBp + data.engine.requests.makeshiftDebtBp);
  }
  if (!project.pendingFeatures.some((f) => featureById(data, f).requires.module === need.module)) dropProjectRequests(state, project.id, need.module);
}

// ---------- Bindung und Hauptversion wechseln ----------

export function validateBinding(state: GameState, data: GameData, projectId: number, binding: ProjectEngine["binding"]): string | null {
  const p = state.projects.find((x) => x.id === projectId);
  if (!p || !(p.status === "laeuft" || p.status === "bereit" || p.status === "pausiert")) return "error.unknownProject";
  if (p.engine.id !== "eigen") return "error.noEngine";
  if (p.engine.binding === binding) return "error.sameBinding";
  if (isFrozen(data, p)) return "error.afterFreeze";
  return null;
}

/** ENG-R41: Wechsel bis zum Freeze; wer auf mitlaufend wechselt, übernimmt den aktuellen Stand gleich mit Integration. */
export function setBinding(state: GameState, data: GameData, projectId: number, binding: ProjectEngine["binding"]): void {
  const p = state.projects.find((x) => x.id === projectId)!;
  p.engine.binding = binding;
  if (binding === "mitlaufend" && state.engine && p.engine.major === state.engine.major) {
    integrate(state, data, p, Object.keys(ownLevels(state.engine)) as ModuleKind[]);
    settlePending(state, data, p);
  }
}

/** ENG-R44: Kosten des Umstiegs auf die neue Hauptversion in Wochen der Besetzung, nach Phase. */
export function majorSwitchWeeks(data: GameData, project: Project): number {
  const w = data.engine.binding.majorSwitchWeeks;
  if (isFrozen(data, project) || project.phase === "beta") return w.late;
  if (project.phase === "konzept") return w.konzept;
  if (project.phase === "preprod") return w.preprod;
  const list = data.projects.phases[project.scope];
  const i = list.findIndex((p) => p.id === "produktion");
  const start = i > 0 ? list[i - 1]!.untilBp : 0;
  const within = Math.max(0, progressShare(project) - start);
  const len = Math.max(1, list[i]!.untilBp - start);
  return w.produktionMin + divInt((w.produktionMax - w.produktionMin) * within, len, 1);
}

export function validateSwitchMajor(state: GameState, projectId: number): string | null {
  const p = state.projects.find((x) => x.id === projectId);
  if (!p || !(p.status === "laeuft" || p.status === "bereit" || p.status === "pausiert")) return "error.unknownProject";
  if (p.engine.id !== "eigen" || !state.engine) return "error.noEngine";
  if (p.engine.major >= state.engine.major) return "error.alreadyCurrent";
  return null;
}

export function switchMajor(state: GameState, data: GameData, projectId: number): void {
  const p = state.projects.find((x) => x.id === projectId)!;
  const engine = state.engine!;
  const weeks = majorSwitchWeeks(data, p);
  p.effortTotalBp += weeks * weeklyWork(state, data, p);
  p.engine.levels = ownLevels(engine);
  p.engine.major = engine.major;
  p.engine.minor = engine.minor;
  if (p.status === "bereit" && weeks > 0) {
    p.status = "laeuft";
    p.readyWeek = null;
    p.goldOffered = false;
  }
  settlePending(state, data, p);
  log(state, "log.majorSwitched", { project: p.title, major: engine.major, weeks });
}

export function validateRequestPriority(state: GameState, jobId: number, priority: number): string | null {
  const job = state.engine?.jobs.find((j) => j.id === jobId);
  if (!job || job.kind !== "anforderung") return "error.unknownJob";
  if (!Number.isSafeInteger(priority) || priority < 1 || priority > 5) return "error.priority";
  return null;
}
