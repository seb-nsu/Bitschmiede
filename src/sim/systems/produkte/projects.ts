// Projekte anlegen und wöchentlich fortschreiben (PRD-R10, PRD-R13, PRD-R18, PRD-R20, PRD-R21, PRD-R25, PRD-R28, PRD-R29),
// mit Personen statt Team-Pool und mehreren Projekten gleichzeitig (Konzept 0b, Abschnitt 3).
import { validateAudience } from "./zielgruppe";
import { validatePillars } from "./saeulen";
import { focusOption, recordPhaseQuality } from "./phasenfokus";
import { bugFindShare, polishWeek } from "./politur";
import { acceptContractGame, cancelContractGame, contractLevels, validateContractOffer } from "./auftragsspiele";
import { type Bp, BP_ONE, divBp, divInt, mulBp, mulDiv } from "../../num";
import type { CreateProjectInput, GameData, GameState, ModuleMap, Person, Project, Scope, SteerInput } from "../../model/types";
import { featureById, subgenreById, totalEffort } from "./quality";
import { emptyMarketing } from "../marketing";
import { newBugs, projectInnovation, qaFound } from "./bugs";
import { dateOf } from "../../calendar";
import { stream } from "../../rng";
import { assignPerson, assignedTo, personById } from "../firma";
import { preset } from "../finanzen";
import { platformActive } from "../markt";
import { exclusiveLocked, playerHasDevkit } from "../plattformen";
import { defaultEngineId, engineLevels, missingModule, projectDebt, projectEngine, recordDebtDelay } from "../engine";
import { capAtFreeze, dropProjectRequests, orderBlocker, placeRequests } from "../bindung";
import { leadBlocker, versionShares } from "../leistung";
import { brandCancel, newBrand } from "../marken";
import { PLAYER, usableLicense, validatePlayerBrand } from "../markenmarkt";
import { parseLicensedEngine, retrainDone, retrainTempo, startPlayerProject, validatePlayerLicense } from "../lizenzen";
import { crewWork, crunchBugs, crunching } from "../personal";
import { leadershipFactor, recordLeadership } from "../delegation";
import { bugFactor, qaBonus } from "../buero";

/** Laufende Projekte (in Arbeit oder im Test); pausierte und abgebrochene zählen nicht. */
export function activeProjects(state: GameState): Project[] {
  return state.projects.filter((p) => p.status === "laeuft" || p.status === "bereit");
}

export function pausedProjects(state: GameState): Project[] {
  return state.projects.filter((p) => p.status === "pausiert");
}

/** E3: zwei eigene Projekte ab der dritten Person. */
export function allowedOwnProjects(state: GameState, data: GameData): number {
  if (state.people.length < data.start.secondProjectFromPersons) return 1;
  // ANNAHME (Etappe 3, FRM-R02, FRM-R56): Jedes Team trägt ein weiteres eigenes Projekt; so wird Delegation ab drei Projekten erreichbar.
  return data.start.maxOwnProjects + data.staff.projectsPerTeam * state.staff.teams.length;
}

/** PRD-R20: Phase aus dem Anteil des erledigten Aufwands. */
export function phaseFor(data: GameData, scope: Scope, doneBp: Bp, totalBp: Bp): string {
  const share = divBp(doneBp, totalBp, 1);
  const list = data.projects.phases[scope];
  for (const p of list) if (share < p.untilBp) return p.id;
  return "launch";
}

export function progressShare(p: Project): Bp {
  return divBp(p.effortDoneBp, p.effortTotalBp, 1);
}

/** PRD-R18: Altersfreigabe = höchste Inhaltsstufe aus Thema und Features. */
export function ageRating(data: GameData, theme: string, features: readonly string[]): number {
  const t = data.themes.find((x) => x.id === theme)?.contentLevel ?? 0;
  return features.reduce((m, id) => Math.max(m, featureById(data, id).contentLevel), t);
}

/**
 * Wessen Stärke für die Qualität zählt: wer mindestens minContributionWeeks mitgearbeitet hat; sonst alle Beteiligten;
 * sonst die aktuell Zugeordneten. So bringt eine Person, die erst in der letzten Woche dazukommt, ihre Stärke nicht mit.
 */
export function projectPeople(state: GameState, data: GameData, project: Project): Person[] {
  const pick = (ids: number[]) => ids.map((id) => personById(state, id)).filter((p): p is Person => !!p);
  const enough = project.contributors.filter((c) => c.weeks >= data.start.minContributionWeeks).map((c) => c.personId);
  if (enough.length > 0) return pick(enough);
  if (project.contributors.length > 0) return pick(project.contributors.map((c) => c.personId));
  return assignedTo(state, project.id);
}

export function workingOn(state: GameState, projectId: number): Person[] {
  return assignedTo(state, projectId).filter((p) => p.transferWeeks === 0);
}

type Content = Pick<CreateProjectInput, "genre" | "subgenre" | "theme" | "scope" | "features" | "platforms"> & { engineLevels: ModuleMap; allowMissing?: readonly string[]; skipLead?: boolean };

/** Inhalt eines Projekts: Genre, Thema, Umfang, Karten, Plattformen und Engine-Stufen (für Anlegen und Umsteuern). */
function validateContent(state: GameState, data: GameData, input: Content): string | null {
  if (!data.genres.some((g) => g.id === input.genre)) return "error.unknownGenre";
  if (!data.themes.some((t) => t.id === input.theme)) return "error.unknownTheme";
  if (input.subgenre) {
    // ANNAHME (Untergenre): gehört zum Genre und ist im laufenden Jahr wählbar.
    const sub = subgenreById(data, input.subgenre);
    if (!sub || sub.genre !== input.genre) return "error.unknownSubgenre";
    if (sub.fromYear > dateOf(state.startYear, state.week).year) return "error.tooEarly";
  }
  if (!(input.scope in data.projects.featureSlots)) return "error.unknownScope";
  // Etappe 6c.1: groß ab 1990, AAA ab 1998 (data: scopeFromYear).
  if (data.projects.scopeFromYear[input.scope] > dateOf(state.startYear, state.week).year) return "error.scopeTooEarly";
  if (new Set(input.features).size !== input.features.length) return "error.duplicateFeature";
  if (input.features.length !== data.projects.featureSlots[input.scope]) return "error.featureCount";
  const year = dateOf(state.startYear, state.week).year;
  for (const id of input.features) {
    const f = data.features.find((x) => x.id === id);
    if (!f) return "error.unknownFeature";
    if (f.availableFrom > year) return "error.featureLocked";
    // PRD-R11, PRD-T03: Die Engine braucht das Modul in der Stufe, sonst ist die Karte gesperrt.
    if (missingModule(data, input.engineLevels, id) && !input.allowMissing?.includes(id)) return "error.moduleMissing";
  }
  // PRD-R10: mindestens eine Plattform, alle im Handel; doppelte nicht.
  if (input.platforms.length === 0) return "error.noPlatform";
  if (new Set(input.platforms).size !== input.platforms.length) return "error.duplicatePlatform";
  for (const id of input.platforms) {
    const pf = data.platforms.find((x) => x.id === id);
    if (!pf) return "error.unknownPlatform";
    // MRK-R17, MRK-T04: Eine angekündigte Plattform ist nur mit Devkit wählbar.
    if (!platformActive(pf, year) && !(pf.releaseYear > year && playerHasDevkit(state, id))) return pf.releaseYear > year ? "error.noDevkit" : "error.platformInactive";
  }
  // PRD-R11, PRD-R15: Die Lead-Plattform erlaubt jede Karte, und die Summe passt in ihr Leistungsbudget.
  return input.skipLead ? null : leadBlocker(data, state, input.features, input.platforms[0]!);
}

/** Prüft eine Projekt-Eingabe gegen Zustand und Daten (TEC-R20); null = gültig, sonst Textschlüssel. */
export function validateCreateProject(state: GameState, data: GameData, input: CreateProjectInput): string | null {
  if (activeProjects(state).length >= allowedOwnProjects(state, data)) return "error.projectLimit";
  // PRD-R01: Voraussetzung des Produkttyps.
  const type = data.productTypes.find((x) => x.id === (input.productType ?? "standard"));
  if (!type) return "error.unknownType";
  if (type.id !== "standard" && state.unlocks["produkttypen"] === undefined) return "error.locked";
  // PRD-R01: DLC, F2P und Live-Service erst ab ihrem Jahr.
  if (type.fromYear !== undefined && dateOf(state.startYear, state.week).year < type.fromYear) return "error.typeTooEarly";
  const source = input.sourceId == null ? undefined : state.projects.find((p) => p.id === input.sourceId);
  if (type.requires === "releasedGame") {
    if (!source || source.status !== "veroeffentlicht") return "error.needsReleasedGame";
    if (type.requiresNewPlatform && input.platforms.some((id) => source.platforms.includes(id))) return "error.portSamePlatform";
    // MRK-R26: Während eines Exklusivdeals ist das Spiel für andere Plattformen gesperrt.
    if (type.requiresNewPlatform && exclusiveLocked(state, data, source)) return "error.exclusiveLocked";
    // ENG-R70: Technik-Update und Remaster nur mit einer neueren Version derselben Engine.
    if (type.needsNewerEngine && !newerEngine(state, source)) return "error.noNewerEngine";
    // ANNAHME: Ein Technik-Update (Patch) erscheint auf den Plattformen der Vorlage; neue Plattformen (ENG-R74) folgen später.
    if (type.patch && (input.platforms.length !== source.platforms.length || input.platforms.some((id, i) => source.platforms[i] !== id))) return "error.patchPlatforms";
    if (type.patch && state.projects.some((p) => p.sourceId === source.id && p.type === type.id && p.status !== "abgebrochen" && p.status !== "veroeffentlicht")) return "error.patchRunning";
  }
  if (type.sameContent && source && (input.genre !== source.genre || input.theme !== source.theme || input.scope !== source.scope
    || input.features.length !== source.features.length || input.features.some((f) => !source.features.includes(f)))) return "error.portContent";
  if (type.fixedScope && input.scope !== type.fixedScope) return "error.typeScope";
  if (type.requires === "releasedGame" && source && input.genre !== source.genre) return "error.typeGenre";
  const engineId = type.needsNewerEngine ? "eigen" : input.engine ?? defaultEngineId(state);
  if (engineId === "eigen" && !state.engine) return "error.noEngine";
  // S04 Lizenzweg: fremde Engine mit gültiger Vorlage, ohne fremde Exklusivität, Pauschale bezahlbar.
  const licensed = parseLicensedEngine(engineId);
  if (engineId.startsWith("lizenz:") && licensed === null) return "error.noEngine";
  if (licensed !== null) {
    if (type.engineSource === "source") return "error.noEngine";
    const err = validatePlayerLicense(state, data, licensed, input.licenseTemplate, input.genre, input.platforms);
    if (err) return err;
  }
  // ANNAHME: Port und Addon laufen auf der Engine ihrer Vorlage; ihre Karten stehen damit schon fest.
  const levels = type.engineSource === "source" && source ? source.engine.levels : contractLevels(state, data, engineLevels(state, data, engineId), input.contractOfferId);
  // PRD-R01, BTR-R23: MMO, F2P und Live-Service brauchen das Netzwerk-Modul in der Stufe des Typs.
  if (type.requiresModule && levels[type.requiresModule.module] < type.requiresModule.level) return "error.typeModule";
  // PRD-R12: bestellte Karten dürfen gesperrt sein, wenn das eigene Engine-Team sie bauen kann.
  const ordered = input.ordered ?? [];
  for (const id of ordered) {
    if (!input.features.includes(id)) return "error.orderNotInProject";
    if (engineId !== "eigen" || type.requires === "releasedGame") return "error.noEngine";
    const blocker = data.features.some((f) => f.id === id) ? orderBlocker(state, data, levels, id) : "error.unknownFeature";
    if (blocker) return blocker;
  }
  // ANNAHME: Port und Addon übernehmen die Karten der Vorlage; was die Plattform nicht kann, fällt in der Version weg.
  const content = validateContent(state, data, { ...input, engineLevels: levels, allowMissing: ordered, skipLead: type.requires === "releasedGame" });
  if (content) return content;
  // LIZ-M09: fremde Marken nur mit gültiger Lizenz für das Genre.
  const brand = input.sourceId == null ? validatePlayerBrand(state, input.brandId, input.genre) : null;
  if (brand) return brand;
  // Etappe 6c.3: Vorgaben des Auftragsspiels.
  const offer = validateContractOffer(state, input);
  if (offer) return offer;
  // Etappe 6c.4, PRD-R18: Zielgruppe und Altersfreigabe.
  const audience = validateAudience(data, input.audience, ageRating(data, input.theme, input.features));
  if (audience) return audience;
  // Etappe 6c.5: höchstens zwei bekannte Design-Säulen.
  const pillars = validatePillars(data, input.pillars);
  if (pillars) return pillars;
  if (input.people.length === 0) return "error.noPeople";
  for (const id of input.people) {
    const person = personById(state, id);
    if (!person) return "error.unknownPerson";
    if (person.assignment?.kind === "contract") return "error.personBound";
  }
  return null;
}

/**
 * Aufwand eines Inhalts. PRD-R60: jede weitere Plattform kostet Anpassungsaufwand (ANNAHME: a₀ ohne Leistungsabstand,
 * S02 5.4). PRD-R01: Port und Addon haben einen eigenen Aufwandsanteil (data: producttypes.json).
 */
export function contentEffort(data: GameData, features: readonly string[], scope: Scope, platforms: readonly string[], type: string): Bp {
  return scaleEffort(data, totalEffort(data, features, scope), platforms, type);
}

/**
 * PRD-R60, S02 5.4: Faktor 1 + Σ (a₀ + a₁ · Leistungsabstand) über alle Plattformen außer der Lead-Plattform.
 * ANNAHME: Leistungsprofile kommen mit den Engines (Etappe 2); bis dahin ist der Abstand 0 bei gleichem Plattformtyp
 * und otherTypeGapBp bei verschiedenem (Konsole, Handheld, Heimcomputer, PC).
 */
export function platformEffortFactor(data: GameData, platforms: readonly string[]): Bp {
  const s = data.sales;
  const lead = data.platforms.find((p) => p.id === platforms[0]);
  return platforms.slice(1).reduce((f, id) => {
    const other = data.platforms.find((p) => p.id === id);
    const gap = lead && other && lead.type !== other.type ? s.otherTypeGapBp : 0;
    return f + s.extraPlatformEffortBp + mulBp(s.platformGapEffortBp, gap);
  }, BP_ONE);
}

function scaleEffort(data: GameData, effort: Bp, platforms: readonly string[], type: string): Bp {
  const typeBp = data.productTypes.find((x) => x.id === type)!.effortBp;
  return mulBp(mulBp(effort, platformEffortFactor(data, platforms)), typeBp);
}

/** ANNAHME: Port und Addon übernehmen die Engine ihrer Vorlage mit deren Stand (fest gebunden). */
function sourceEngine(state: GameState, data: GameData, input: CreateProjectInput): Project["engine"] | null {
  const type = data.productTypes.find((x) => x.id === (input.productType ?? "standard"));
  const source = input.sourceId == null ? undefined : state.projects.find((p) => p.id === input.sourceId);
  if (type?.requires !== "releasedGame" || !source || type.engineSource !== "source") return null;
  return { ...source.engine, levels: { ...source.engine.levels }, binding: "fest" };
}

/** ENG-R70: Gibt es eine neuere Version der eigenen Engine als die der Vorlage? */
export function newerEngine(state: GameState, source: Project): boolean {
  const e = state.engine;
  if (!e || source.engine.id !== "eigen") return false;
  return e.major > source.engine.major || (e.major === source.engine.major && e.minor > source.engine.minor);
}

/** ENG-R72, S03 5.4: min(1, 0,4 · ΔHauptversion + 0,1 · ΔUnterversion); nach einem Hauptversionssprung zählt die neue Unterversion. */
export function versionDistanceBp(data: GameData, state: GameState, source: Project): Bp {
  const e = state.engine;
  if (!e) return BP_ONE;
  const dMajor = e.major - source.engine.major;
  const dMinor = dMajor > 0 ? e.minor : e.minor - source.engine.minor;
  const t = data.techUpdate;
  return Math.min(BP_ONE, dMajor * t.majorStepBp + Math.max(0, dMinor) * t.minorStepBp);
}

export function createProject(state: GameState, data: GameData, input: CreateProjectInput): Project {
  const features = [...input.features].sort();
  // Kritischer Bug (S02 Abschnitt 9): ob und wann, wird beim Anlegen einmal gezogen (KRN-R37).
  const rng = stream(state, "projekte");
  const cb = data.events.criticalBug;
  const hasBug = rng.uniformBp() < cb.chanceBp;
  const at = rng.range(cb.fromBp, cb.toBp);
  const project: Project = {
    id: state.nextProjectId,
    title: input.title.trim().slice(0, 60),
    genre: input.genre,
    subgenre: input.subgenre ?? null,
    marketing: emptyMarketing(data),
    releasePlan: null,
    ops: null,
    theme: input.theme,
    scope: input.scope,
    audience: input.audience ?? data.audiences.default,
    pillars: [...(input.pillars ?? [])].sort(),
    features,
    status: "laeuft",
    phase: data.projects.phases[input.scope][0]!.id,
    effortTotalBp: contentEffort(data, features, input.scope, input.platforms, input.productType ?? "standard"),
    effortDoneBp: 0,
    bugsBp: 0,
    bugHistory: [],
    startWeek: state.week,
    readyWeek: null,
    costCent: 0,
    releaseRequested: false,
    result: null,
    contributors: [],
    reviewOffered: false,
    goldOffered: false,
    criticalBugAtBp: hasBug ? at : null,
    criticalBugPending: false,
    criticalBugDone: false,
    dayOnePatch: false,
    playtests: [],
    playtestWeeksLeft: 0,
    patchWeeksLeft: 0,
    resumeWeeksLeft: 0,
    archiveSavingBp: 0,
    platforms: [...input.platforms],
    printRun: null,
    certWeeksLeft: null,
    certPassed: false,
    certAttempts: 0,
    sales: null,
    type: input.productType ?? "standard",
    sourceId: input.sourceId ?? null,
    gateOffered: false,
    engine: sourceEngine(state, data, input) ?? projectEngine(state, data, input.engine ?? defaultEngineId(state), input.scope),
    debtLostWeeksBp: 0,
    debtWeeksReported: 0,
    pendingFeatures: [],
    makeshift: [],
    waitingForEngine: false,
    versionShareBp: versionShares(data, state, features, input.platforms),
    brandId: null,
    brandLicenseId: null,
    patchedEngineBp: null,
    exclusivePlatform: null,
    producerId: null,
    brief: null,
    briefWarned: false,
    leadershipBp: BP_ONE,
    phaseFocus: {},
    phaseQualityBp: BP_ONE,
    polishArea: null,
    polish: {},
    languages: [],
    licenseContractId: null,
    retrainWeeks: 0,
  };
  // S02 Abschnitt 6: Port und Addon gehören zur Marke der Vorlage; sonst die gewählte oder eine neue Marke.
  const source = input.sourceId == null ? undefined : state.projects.find((p) => p.id === input.sourceId);
  // Etappe 6c.3: Ein Auftragsspiel trägt die Marke des Auftraggebers (keine eigene Marke).
  // Etappe 6c.4: Port, Addon und Update erben die Zielgruppe der Vorlage.
  if (source && input.audience === undefined) project.audience = source.audience;
  if (source && input.pillars === undefined) project.pillars = [...source.pillars];
  // Etappe 6c.8: Port, Addon und Update übernehmen die Sprachen der Vorlage (Kosten fallen erneut an).
  if (source) project.languages = [...source.languages];
  project.brandId = source ? source.brandId : input.contractOfferId != null ? null : input.brandId ?? newBrand(state, data, project.title).id;
  if (input.contractOfferId != null) {
    project.engine.levels = contractLevels(state, data, project.engine.levels, input.contractOfferId);
    acceptContractGame(state, project, input.contractOfferId);
  }
  // LIZ-M09, LIZ-M10: Lizenzspiel einer fremden Marke; Port und Addon zahlen die Royalty der Vorlage weiter.
  const owner = state.brands.find((b) => b.id === project.brandId)?.ownerId ?? PLAYER;
  project.brandLicenseId = source ? source.brandLicenseId ?? null
    : owner === PLAYER ? null : usableLicense(state, PLAYER, project.brandId!, project.genre)?.id ?? null;
  if (input.binding && project.engine.id === "eigen") project.engine.binding = input.binding;
  state.nextProjectId += 1;
  state.projects.push(project);
  const ptype = data.productTypes.find((x) => x.id === project.type)!;
  if (ptype.engineSource !== "source") startPlayerProject(state, data, project, input.licenseTemplate);
  if (ptype.versionScaled && source) project.effortTotalBp = Math.max(1, mulBp(project.effortTotalBp, versionDistanceBp(data, state, source)));
  applyArchive(state, data, project);
  // ANNAHME: Wer ein Projekt beginnt, braucht keine Einarbeitung; Wechsel aus einem anderen Projekt schon.
  for (const id of [...input.people].sort((a, b) => a - b)) {
    const person = personById(state, id)!;
    const fromProject = person.assignment?.kind === "project";
    assignPerson(state, data, person, project.id);
    if (!fromProject) person.transferWeeks = 0;
  }
  // ENG-R50: Frist ist der geplante Freeze mit der Besetzung, die das Projekt beginnt.
  if (input.ordered && input.ordered.length > 0) placeRequests(state, data, project, [...input.ordered].sort());
  return project;
}

function addContribution(project: Project, personId: number): void {
  const c = project.contributors.find((x) => x.personId === personId);
  if (c) c.weeks += 1;
  else {
    project.contributors.push({ personId, weeks: 1 });
    project.contributors.sort((a, b) => a.personId - b.personId);
  }
}

/**
 * Tick-Schritt 5 für ein Projekt: Fortschritt, neue Bugs, kritischer Bug, QA.
 * ANNAHME: Die Personen arbeiten als Pool an allen Bereichen; Rollen und Stau kommen mit Teams (PRD-R21, Etappe 1).
 * ANNAHME: Während der Produktion gibt es keine QA-Kapazität; nach Produktionsende testen die Zugeordneten.
 */
export function progressProject(state: GameState, data: GameData, project: Project): void {
  const workers = workingOn(state, project.id);
  // FRM-R24: in den Wochen nach einem Umzug nur 70 % Leistung.
  const pace = state.office.moveWeeksLeft > 0 ? data.offices.moveProductivityBp : BP_ONE;
  // ENG-R21: Schuld der genutzten Module verlangsamt die Arbeit und erzeugt mehr Bugs.
  const debt = projectDebt(state, data, project);
  // FRM-R03, FRM-R17: Teamleistung mit Größe, Moral, Burnout, Einarbeitung, Rollen und Crunch.
  const crunch = crunching(state, data, project, workers.length);
  // FRM-R57: Überlastung der Führung bremst manuell geführte Projekte.
  const lead = leadershipFactor(state, data, project);
  const fullCapacity = mulBp(mulBp(crewWork(state, data, workers, false, crunch), pace), lead);
  // LIZ-R27: Umschulung nach einem Engine-Wechsel.
  // Etappe 6c.6: Phasen-Schwerpunkt der laufenden Phase (Tempo, Bugs, Qualität).
  const focus = focusOption(data, project);
  const capacity = mulBp(mulBp(mulBp(fullCapacity, debt.tempoBp), retrainTempo(data, project.retrainWeeks)), focus?.tempoBp ?? BP_ONE);
  if (project.retrainWeeks > 0 && workers.length > 0) project.retrainWeeks = retrainDone(data, project.retrainWeeks + 1) ? 0 : project.retrainWeeks + 1;
  if (project.resumeWeeksLeft > 0) {
    // PRD-R40: Einarbeitung nach der Pause.
    project.resumeWeeksLeft -= 1;
  } else if (project.playtestWeeksLeft > 0) {
    // PRD-R30: Ein interner Playtest kostet nur Zeit.
    project.playtestWeeksLeft -= 1;
  } else if (project.status === "laeuft") {
    // ENG-R53: Mit ausstehenden Karten endet der Fortschritt am Feature-Freeze, bis entschieden ist.
    const work = capAtFreeze(data, project, Math.min(capacity, project.effortTotalBp - project.effortDoneBp));
    recordLeadership(project, lead, project.effortDoneBp, work);
    recordPhaseQuality(project, focus?.qualityBp ?? BP_ONE, project.effortDoneBp, work);
    project.effortDoneBp += work;
    // Tabelle 5.4: Hardware und Qualitätszentrum senken die Bugs.
    project.bugsBp += mulBp(mulBp(mulBp(newBugs(data, work, projectInnovation(data, project.features), preset(state, data).bugRateBp), debt.bugsBp), bugFactor(state, data)), focus?.bugsBp ?? BP_ONE);
    // FRM-R17: jede Crunch-Woche erhöht die Bugs um 5 %.
    if (crunch && work > 0) project.bugsBp += crunchBugs(data, project.bugsBp);
    if (work > 0) recordDebtDelay(state, project, debt.tempoBp, debt.worst);
    for (const w of workers) addContribution(project, w.id);
    project.phase = phaseFor(data, project.scope, project.effortDoneBp, project.effortTotalBp);
    const share = progressShare(project);
    if (project.criticalBugAtBp !== null && !project.criticalBugDone && share >= project.criticalBugAtBp) {
      project.criticalBugDone = true;
      project.criticalBugPending = true;
    }
    if (project.effortDoneBp >= project.effortTotalBp) {
      project.status = "bereit";
      project.readyWeek = state.week;
    }
  } else if (project.status === "bereit") {
    const open = project.effortTotalBp - project.effortDoneBp;
    // Etappe 6c.7: Politur bindet das Team, es findet in dieser Woche nur einen Teil der Bugs.
    project.bugsBp -= mulBp(qaFound(data, project.bugsBp, open, fullCapacity, qaBonus(state, data)), bugFindShare(data, project));
    if (workers.length > 0) polishWeek(data, project);
  }
  project.bugHistory.push(divInt(project.bugsBp, BP_ONE, 1));
}

/** Day-One-Patch nach dem Release: Die Zugeordneten bleiben gebunden, danach werden sie frei. */
export function patchStep(state: GameState, project: Project): void {
  if (project.patchWeeksLeft <= 0) return;
  project.patchWeeksLeft -= 1;
  if (project.patchWeeksLeft === 0) for (const p of assignedTo(state, project.id)) p.assignment = null;
}

/** Restwochen bei aktueller Besetzung, aufgerundet; null ohne Personen. */
export function remainingWeeks(state: GameState, data: GameData, project: Project): number | null {
  const people = assignedTo(state, project.id).length;
  if (people === 0) return null;
  const capacity = Math.max(1, mulBp(mulBp(people * data.start.workPerPersonWeekBp, projectDebt(state, data, project).tempoBp), focusOption(data, project)?.tempoBp ?? BP_ONE));
  return divInt(project.effortTotalBp - project.effortDoneBp + capacity - 1, capacity, 1) + project.playtestWeeksLeft;
}

/** Bugs, die ein Projekt bis zum Release voraussichtlich hat: Rest-Aufwand plus Testwochen (für Prognosen). */
export function expectedBugsAtRelease(data: GameData, project: Project, features: readonly string[], extraEffortBp: Bp, bugRateBp: Bp = BP_ONE): Bp {
  const remaining = Math.max(0, project.effortTotalBp + extraEffortBp - project.effortDoneBp);
  let bugs = project.bugsBp + newBugs(data, remaining, projectInnovation(data, features), bugRateBp);
  for (let i = 0; i < data.events.forecastTestWeeks; i++) bugs -= mulBp(bugs, data.bugs.qaFindRateBp);
  return bugs;
}

// ---------- Pausieren, Fortsetzen, Abbrechen, Archiv (PRD-R40 bis PRD-R44) ----------

function releasePeople(state: GameState, project: Project): void {
  for (const p of assignedTo(state, project.id)) {
    p.assignment = null;
    p.transferWeeks = 0;
  }
  state.events = state.events.filter((e) => e.projectId !== project.id);
}

/** PRD-R40: Ein pausiertes Projekt gibt seine Personen frei und behält seinen Fortschritt. */
export function pauseProject(state: GameState, project: Project): void {
  project.status = "pausiert";
  project.releaseRequested = false;
  project.certWeeksLeft = null;
  releasePeople(state, project);
}

/** PRD-R40: Die Wiederaufnahme kostet Einarbeitung (data: resumeWeeks). */
export function resumeProject(state: GameState, data: GameData, project: Project, people: readonly number[]): void {
  project.status = project.effortDoneBp >= project.effortTotalBp ? "bereit" : "laeuft";
  project.resumeWeeksLeft = data.projects.resumeWeeks;
  // Ein fertiges Projekt bekommt beim nächsten Ereignis-Schritt wieder sein Gold-Review.
  project.goldOffered = false;
  for (const id of [...people].sort((a, b) => a - b)) {
    const person = personById(state, id);
    if (person) {
      person.assignment = { kind: "project", id: project.id };
      person.transferWeeks = 0;
    }
  }
}

/**
 * PRD-R42, PRD-R43: Abbruch beendet das Projekt; es wird archiviert. Der wiederverwendbare Anteil ist der erledigte
 * Anteil des Aufwands. ANNAHME: Moral, Ruf, Marke und Interesse gibt es noch nicht; sie folgen mit ihren Systemen.
 */
export function cancelProject(state: GameState, data: GameData, project: Project): void {
  project.status = "abgebrochen";
  cancelContractGame(state, project);
  dropProjectRequests(state, project.id);
  brandCancel(state, data, project);
  releasePeople(state, project);
  state.archive.push({
    projectId: project.id, genre: project.genre, features: [...project.features],
    reusableBp: progressShare(project), used: false,
  });
}

/**
 * PRD-R43, PRD-T05: Ein späteres Projekt desselben Genres spart bis zu 25 % des Aufwands für gleiche Features.
 * Ersparnis je gleichem Feature = Aufwand · 25 % · wiederverwendbarer Anteil.
 * ANNAHME: Jeder Archiv-Eintrag hilft genau einmal; genutzt wird der Eintrag mit der größten Ersparnis.
 */
export function applyArchive(state: GameState, data: GameData, project: Project): void {
  let best: { entry: (typeof state.archive)[number]; saving: Bp } | null = null;
  for (const entry of state.archive) {
    if (entry.used || entry.genre !== project.genre) continue;
    const shared = project.features.filter((f) => entry.features.includes(f));
    if (shared.length === 0) continue;
    const share = mulBp(data.projects.archiveSavingBp, entry.reusableBp);
    const saving = mulBp(totalEffort(data, shared, project.scope), share);
    if (!best || saving > best.saving) best = { entry, saving };
  }
  if (!best || best.saving <= 0) return;
  best.entry.used = true;
  project.effortTotalBp -= best.saving;
  project.archiveSavingBp = best.saving;
}

export function validateProjectControl(state: GameState, data: GameData, type: "pauseProject" | "cancelProject" | "resumeProject", projectId: number, people: readonly number[] = []): string | null {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return "error.unknownProject";
  if (type === "pauseProject") return project.status === "laeuft" || project.status === "bereit" ? null : "error.notRunning";
  if (type === "cancelProject") return project.status === "laeuft" || project.status === "bereit" || project.status === "pausiert" ? null : "error.notRunning";
  if (project.status !== "pausiert") return "error.notPaused";
  if (activeProjects(state).length >= allowedOwnProjects(state, data)) return "error.projectLimit";
  if (people.length === 0) return "error.noPeople";
  for (const id of people) {
    const person = personById(state, id);
    if (!person) return "error.unknownPerson";
    if (person.assignment?.kind === "contract") return "error.personBound";
  }
  return null;
}

// ---------- Umsteuern (PRD-R41) ----------

export interface SteerOutcome {
  effortTotalBp: Bp;
  effortDoneBp: Bp;
  /** Anteil der erledigten Arbeit, der erhalten bleibt (bp). */
  keptBp: Bp;
}

/**
 * PRD-R41: Neuer Aufwand = Aufwand des neuen Inhalts plus alle bisherigen Zu- und Abschläge (Ereignisse, Archiv).
 * Erhalten bleibt je beibehaltenem Feature der erledigte Anteil seines Aufwands (höchstens sein neuer Aufwand);
 * gestrichene Features und weggefallene Plattformen sind verloren. Ein Genrewechsel behält davon 30 %.
 * ANNAHME: Arbeit ist je Projekt ein Topf; der erledigte Anteil verteilt sich gleichmäßig auf die Features.
 */
export function steerOutcome(data: GameData, project: Project, input: Omit<SteerInput, "type" | "projectId">): SteerOutcome {
  const old = contentEffort(data, project.features, project.scope, project.platforms, project.type);
  const extra = project.effortTotalBp - old;
  const total = Math.max(1, contentEffort(data, input.features, input.scope, input.platforms, project.type) + extra);
  const doneShare = divBp(project.effortDoneBp, Math.max(1, project.effortTotalBp), 1);
  let base = 0;
  for (const f of project.features) {
    if (!input.features.includes(f)) continue;
    base += Math.min(totalEffort(data, [f], input.scope), mulBp(totalEffort(data, [f], project.scope), doneShare));
  }
  let kept = scaleEffort(data, base, input.platforms, project.type);
  if (input.genre !== project.genre) kept = mulBp(kept, data.projects.steerGenreKeepBp);
  const done = Math.min(kept, total - 1);
  return { effortTotalBp: total, effortDoneBp: done, keptBp: project.effortDoneBp > 0 ? divBp(done, project.effortDoneBp, 1) : BP_ONE };
}

/** ANNAHME (Inhaltsausbau): Wer das Genre umsteuert, verliert das Untergenre; es gehört zum alten Genre. */
function steeredSubgenre(project: Project, input: SteerInput): string | null {
  return input.genre === project.genre ? project.subgenre : null;
}

export function validateSteer(state: GameState, data: GameData, input: SteerInput): string | null {
  const project = state.projects.find((p) => p.id === input.projectId);
  if (!project) return "error.unknownProject";
  if (project.status !== "laeuft" && project.status !== "bereit") return "error.notRunning";
  // ANNAHME: Port und Addon hängen an ihrer Vorlage und lassen sich nicht umsteuern.
  if (project.type !== "standard") return "error.steerType";
  // MRK-R26: Ein Exklusivtitel bleibt auf seiner Plattform.
  if (project.exclusivePlatform !== null && (input.platforms.length !== 1 || input.platforms[0] !== project.exclusivePlatform)) return "error.exclusiveLocked";
  const content = validateContent(state, data, { ...input, subgenre: steeredSubgenre(project, input), theme: project.theme, engineLevels: project.engine.levels, allowMissing: project.pendingFeatures });
  if (content) return content;
  const same = input.genre === project.genre && input.scope === project.scope
    && input.features.length === project.features.length && input.features.every((f) => project.features.includes(f))
    && input.platforms.length === project.platforms.length && input.platforms.every((x, i) => project.platforms[i] === x);
  return same ? "error.steerNothing" : null;
}

export function steerProject(state: GameState, data: GameData, input: SteerInput): void {
  const project = state.projects.find((p) => p.id === input.projectId)!;
  const outcome = steerOutcome(data, project, input);
  // Bugs stecken in der erledigten Arbeit; was verloren geht, nimmt seine Bugs mit.
  project.bugsBp = project.effortDoneBp > 0 ? mulDiv(project.bugsBp, outcome.effortDoneBp, project.effortDoneBp, 1) : project.bugsBp;
  project.subgenre = steeredSubgenre(project, input);
  project.genre = input.genre;
  project.scope = input.scope;
  project.features = [...input.features].sort();
  project.platforms = [...input.platforms];
  // Gestrichene bestellte Karten fallen aus den Anforderungen.
  const removed = project.pendingFeatures.filter((f) => !project.features.includes(f));
  project.pendingFeatures = project.pendingFeatures.filter((f) => project.features.includes(f));
  project.makeshift = project.makeshift.filter((f) => project.features.includes(f));
  project.versionShareBp = versionShares(data, state, project.features, project.platforms);
  if (removed.length > 0) {
    dropProjectRequests(state, project.id);
    if (project.pendingFeatures.length > 0) placeRequests(state, data, project, project.pendingFeatures);
  }
  project.effortTotalBp = outcome.effortTotalBp;
  project.effortDoneBp = outcome.effortDoneBp;
  project.status = "laeuft";
  project.readyWeek = null;
  project.goldOffered = false;
  project.releaseRequested = false;
  project.certWeeksLeft = null;
  project.certPassed = false;
  // Alte Playtests messen den alten Inhalt.
  project.playtests = [];
  project.phase = phaseFor(data, project.scope, project.effortDoneBp, project.effortTotalBp);
  const pre = data.projects.phases[project.scope].find((x) => x.id === data.projects.gatePhase[project.scope]);
  project.gateOffered = !pre || progressShare(project) >= pre.untilBp;
  state.events = state.events.filter((e) => !(e.projectId === project.id && (e.kind === "goldReview" || e.kind === "gate")));
}
