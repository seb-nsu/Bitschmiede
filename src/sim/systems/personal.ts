// Teams und Schlüsselpersonen (S07 FRM-R01 bis FRM-R16, FRM-R20, FRM-R68; Formel 5.1).
// ANNAHME: Moral und Burnout gehören der Person; ein Team zeigt den Mittelwert seiner Mitglieder. So gelten sie auch
// für Einzelpersonen bis 7 Mitarbeiter.
import { type Bp, BP_ONE, type Cent, clamp, divBp, divInt, mulBp, mulDiv, powBp } from "../num";
import {
  AREAS, type Area, type AreaMap, type GameData, type GameState, type Person, type Project, type RivalKeyPerson, type StaffParams, type StaffState, type Team, type TeamFocus,
} from "../model/types";
import { dateOf, isFirstWeekOfMonth, isFirstWeekOfQuarter } from "../calendar";
import { type Rng, stream } from "../rng";
import { assignEngine, assignPerson, drawApplicant, hire, log, makeName, maxPersonsNow } from "./firma";
import { burnoutGainFactor, hireQualityPoints, moraleBonusPoints, officeHardware, officePlaces } from "./buero";
import { chronicle } from "./katalog";
import { addEvent } from "./ereignisse";
import { ledgerNow } from "./finanzen";
import { toolSpeedBp } from "./zukunft";
import { savingsWageBp } from "./boerse";
import { remember } from "./ki/rivalen";
import { phaseSalaryBp } from "./marktphasen";
import { homePeople, locationWorkBp } from "./standorte";

function P(data: GameData): StaffParams {
  return data.staff;
}

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

export function emptyStaff(): StaffState {
  return { teams: [], nextTeamId: 1, salary: "markt", crunch: "nie", targetSize: null, legendary: { year: 0, n: 0 }, poachTries: [], crunchWeeks: [] };
}

function bestArea(strength: AreaMap): Area {
  let best: Area = AREAS[0]!;
  for (const a of AREAS) if (strength[a] > strength[best]) best = a;
  return best;
}

// ---------- Teamleistung (FRM-R03, Formel 5.1) ----------

/** Moral-Faktor 0,6 + 0,4 · M, ANNAHME: auf die Startmoral normiert (Moral 70 = 1,0), damit die Tempi gleich bleiben. */
export function moraleFactor(data: GameData, moraleBp: Bp): Bp {
  const m = P(data).morale;
  const f = (x: Bp) => m.baseFactorBp + mulBp(BP_ONE - m.baseFactorBp, x);
  return divBp(f(moraleBp), f(m.startBp), 1);
}

/** Burnout-Faktor 1 − 0,5 · max(0, (B − 40) / 60). */
export function burnoutFactor(data: GameData, burnoutBp: Bp): Bp {
  const b = P(data).burnout;
  return BP_ONE - mulBp(b.lossFactorBp, clamp(divBp(burnoutBp - b.freeBp, b.spanBp, 1), 0, BP_ONE));
}

/** FRM-R04: Einarbeitung eines Teams, 4 Wochen linear von 50 % auf 100 %. */
export function onboardingFactor(data: GameData, weeksLeft: number): Bp {
  const s = P(data);
  if (weeksLeft <= 0) return BP_ONE;
  return s.onboardingStartBp + mulDiv(BP_ONE - s.onboardingStartBp, s.onboardingWeeks - weeksLeft, s.onboardingWeeks, 1);
}

/** n^0,85 mit ANNAHME: bis 7 Personen unverändert (wie bisher), darüber 7 · (n/7)^0,85. Ergebnis in Personen-bp. */
export function effectiveSize(data: GameData, n: number): Bp {
  const free = P(data).sizeFreeUpTo;
  if (n <= free) return n * BP_ONE;
  return mulBp(free * BP_ONE, powBp(divBp(n, free, 1), P(data).sizeExponentBp));
}

function mean(xs: readonly number[]): number {
  return xs.length === 0 ? 0 : divInt(xs.reduce((a, b) => a + b, 0), xs.length, 1);
}

/** FRM-R09: Rollenbonus der besetzten Rollen in dieser Gruppe (Technischer Direktor für das Engine-Team). */
function roleBonus(data: GameData, workers: readonly Person[], engine: boolean): Bp {
  const roles = new Set(workers.map((p) => p.key?.role).filter((r): r is string => !!r));
  let bonus = 0;
  for (const r of [...roles].sort()) {
    if ((r === "technischerDirektor") === engine) bonus += P(data).key.roleTempoBp[r] ?? 0;
  }
  return BP_ONE + bonus;
}

/** Wochenleistung einer Gruppe in Aufwand-bp (FRM-R03); Crunch +25 % (FRM-R17). */
export function crewWork(state: GameState, data: GameData, workers: readonly Person[], engine: boolean, crunch: boolean): Bp {
  if (workers.length === 0) return 0;
  // FRM-R07: Komfort, Kantine und Grundriss heben die wirksame Moral; FRM-R03: H = Hardware-Faktor des Büros.
  const bonus = moraleBonusPoints(state, data) * 100;
  // FRM-R32: Personen eines Standorts im Aufbau arbeiten mit halber Leistung.
  const factor = mean(workers.map((p) => mulBp(mulBp(mulBp(moraleFactor(data, clamp(p.moraleBp + bonus, 0, BP_ONE)), burnoutFactor(data, p.burnoutBp)), onboardingFactor(data, p.onboardWeeks)), locationWorkBp(state, data, p))));
  let work = mulBp(mulBp(mulBp(data.start.workPerPersonWeekBp, effectiveSize(data, workers.length)), factor), officeHardware(state, data));
  work = mulBp(mulBp(work, roleBonus(data, workers, engine)), toolSpeedBp(state));
  return crunch ? mulBp(work, BP_ONE + P(data).crunch.bonusBp) : work;
}

/** FRM-R17: „vor Gold“ in den letzten 8 Wochen vor Gold; ANNAHME: „bei Bedarf“ crunched die ganze Produktion. */
export function crunching(state: GameState, data: GameData, project: Project, workers: number): boolean {
  if (project.status !== "laeuft" || workers === 0 || state.staff.crunch === "nie") return false;
  if (state.staff.crunch === "beiBedarf") return true;
  const left = project.effortTotalBp - project.effortDoneBp;
  return left <= P(data).crunch.goldWeeks * workers * data.start.workPerPersonWeekBp;
}

// ---------- Teams (FRM-R02) ----------

export function teamMembers(state: GameState, teamId: number): Person[] {
  return state.people.filter((p) => p.teamId === teamId).sort((a, b) => a.id - b.id);
}

export function validateCreateTeam(state: GameState, data: GameData, name: string, ids: readonly number[]): string | null {
  if (state.people.length < P(data).teamMinStaff) return "error.teamsLocked";
  if (name.trim() === "") return "error.noName";
  if (new Set(ids).size !== ids.length || ids.length < P(data).teamMinMembers) return "error.teamMembers";
  for (const id of ids) {
    const p = state.people.find((x) => x.id === id);
    if (!p) return "error.unknownPerson";
    if (p.teamId !== null) return "error.inTeam";
  }
  return null;
}

export function createTeam(state: GameState, name: string, ids: readonly number[]): void {
  const id = state.staff.nextTeamId++;
  state.staff.teams.push({ id, name: name.trim(), focus: null });
  for (const p of state.people) if (ids.includes(p.id)) p.teamId = id;
}

export function validateTeamId(state: GameState, teamId: number): string | null {
  return state.staff.teams.some((t) => t.id === teamId) ? null : "error.unknownTeam";
}

export function dissolveTeam(state: GameState, teamId: number): void {
  state.staff.teams = state.staff.teams.filter((t) => t.id !== teamId);
  for (const p of state.people) if (p.teamId === teamId) p.teamId = null;
}

// ---------- Fachteams und QA-Team (Etappe 6c.2, FRM-R02 erweitert) ----------

export function teamOf(state: GameState, person: Person): Team | undefined {
  return person.teamId === null ? undefined : state.staff.teams.find((t) => t.id === person.teamId);
}

/** Etappe 6c.2: Person gehört einem QA-Team an und arbeitet an keinem Projekt. */
export function inQaTeam(state: GameState, person: Person): boolean {
  return teamOf(state, person)?.focus === "qa";
}

export function validateTeamFocus(state: GameState, data: GameData, teamId: number, focus: TeamFocus): string | null {
  const err = validateTeamId(state, teamId);
  if (err) return err;
  if (focus !== null && focus !== "qa" && !(AREAS as readonly string[]).includes(focus)) return "error.unknownFocus";
  if (focus === "qa" && teamMembers(state, teamId).length < P(data).teamFocus.qaMinMembers) return "error.teamMembers";
  return null;
}

/** Ein QA-Team verlässt seine Projekte; es testet ab jetzt alle laufenden Projekte (qaTeamStep). */
export function setTeamFocus(state: GameState, data: GameData, teamId: number, focus: TeamFocus): void {
  state.staff.teams.find((t) => t.id === teamId)!.focus = focus;
  if (focus === "qa") for (const p of teamMembers(state, teamId)) if (p.assignment !== null && p.assignment.kind !== "contract") assignPerson(state, data, p, null);
}

export function validateTeamMembers(state: GameState, data: GameData, teamId: number | null, ids: readonly number[]): string | null {
  if (state.people.length < P(data).teamMinStaff) return "error.teamsLocked";
  if (teamId !== null) {
    const err = validateTeamId(state, teamId);
    if (err) return err;
  }
  if (ids.length === 0 || new Set(ids).size !== ids.length) return "error.teamMembers";
  for (const id of ids) if (!state.people.some((x) => x.id === id)) return "error.unknownPerson";
  return null;
}

/** Freie Zuordnung: Personen wechseln ins Team (oder werden teamlos); leere Teams lösen sich auf. */
export function setTeamMembers(state: GameState, data: GameData, teamId: number | null, ids: readonly number[]): void {
  const qa = teamId !== null && state.staff.teams.find((t) => t.id === teamId)?.focus === "qa";
  for (const p of state.people) {
    if (!ids.includes(p.id)) continue;
    p.teamId = teamId;
    if (qa && p.assignment !== null && p.assignment.kind !== "contract") assignPerson(state, data, p, null);
  }
  state.staff.teams = state.staff.teams.filter((t) => state.people.some((p) => p.teamId === t.id));
}

/** Schwerpunkt je Person in Fachteams (ohne QA und gemischte Teams), für die Wertung (Formel 5.1, T_f). */
export function focusByPerson(state: GameState): Record<number, Area> {
  const out: Record<number, Area> = {};
  for (const p of state.people) {
    const f = teamOf(state, p)?.focus;
    if (f && f !== "qa") out[p.id] = f;
  }
  return out;
}

/**
 * Etappe 6c.2 (PRD-R29 erweitert): Das QA-Team testet jede Woche alle laufenden Projekte. Seine Leistung verteilt sich
 * gleich auf die Projekte; gefunden = Bugs · Fundrate · min(1, Anteil QA / Wochenleistung der Projektbesetzung).
 * ANNAHME: Wirkt zusätzlich zur QA nach Produktionsende; ohne Besetzung zählt die volle Abdeckung.
 */
export function qaTeamStep(state: GameState, data: GameData, projects: readonly Project[], crew: (p: Project) => Bp): void {
  const qa = state.people.filter((p) => inQaTeam(state, p)).sort((a, b) => a.id - b.id);
  const running = projects.filter((p) => p.status === "laeuft" || p.status === "bereit").sort((a, b) => a.id - b.id);
  if (qa.length === 0 || running.length === 0) return;
  const share = divInt(crewWork(state, data, qa, false, false), running.length, 1);
  for (const p of running) {
    const coverage = clamp(divBp(share, Math.max(1, crew(p)), 1), 0, BP_ONE);
    p.bugsBp -= mulBp(p.bugsBp, mulBp(P(data).teamFocus.qaFindRateBp, coverage));
  }
}

/** FRM-R04: Ein Team wechselt geschlossen; Einarbeitung 4 Wochen von 50 % auf 100 %. */
export function assignTeam(state: GameState, data: GameData, teamId: number, projectId: number | null, engine: boolean): void {
  for (const p of teamMembers(state, teamId)) {
    if (p.assignment?.kind === "contract") continue;
    const before = JSON.stringify(p.assignment);
    if (engine) assignEngine(state, data, p);
    else assignPerson(state, data, p, projectId);
    // Die Einarbeitung des Teams ersetzt die Woche Pause der Einzelperson.
    if (JSON.stringify(p.assignment) !== before && p.assignment !== null) {
      p.transferWeeks = 0;
      p.onboardWeeks = P(data).onboardingWeeks;
    }
  }
}

/** FRM-R02: Ab 20 Mitarbeitern kommt eine neue Einstellung ins kleinste Team. */
function autoTeam(state: GameState, data: GameData, person: Person): void {
  if (state.people.length < P(data).autoTeamStaff || state.staff.teams.length === 0) return;
  const smallest = [...state.staff.teams].sort((a, b) => teamMembers(state, a.id).length - teamMembers(state, b.id).length || a.id - b.id)[0]!;
  person.teamId = smallest.id;
}

// ---------- Personalpolitik, Einstellen, Entlassen (FRM-R08, FRM-R15, FRM-R16, FRM-R20) ----------

export function validateStaffPolicy(target: number | null): string | null {
  return target !== null && (!Number.isInteger(target) || target < 1) ? "error.amount" : null;
}

/** FRM-R16: Lohnfaktor der Personalpolitik. */
export function wageFactor(state: GameState, data: GameData): Bp {
  // MRK-R60: Im Boom steigt das Gehaltsniveau (+5 %).
  // FRM-R53: Das Sparprogramm der Hauptversammlung senkt die Lohnkosten für vier Quartale.
  return mulBp(mulBp(P(data).salaryPolicy[state.staff.salary].wageBp, phaseSalaryBp(state, data)), savingsWageBp(state, data));
}

/** FRM-R16: Bewerber nach Personalpolitik (Qualität ±). */
export function policyApplicant(state: GameState, data: GameData, rng: Rng) {
  const a = drawApplicant(state, data, rng);
  const shift = P(data).salaryPolicy[state.staff.salary].qualityPoints + hireQualityPoints(state, data);
  for (const area of AREAS) a.strength[area] = clamp(a.strength[area] + shift, 1, 100);
  return a;
}

export function hireApplicant(state: GameState, data: GameData, applicant: Parameters<typeof hire>[2]): Person {
  const person = hire(state, data, applicant);
  autoTeam(state, data, person);
  promoteKey(state, data, person, stream(state, "personal"));
  return person;
}

/** FRM-R20: Monatlich bis zur Zielgröße einstellen, höchstens so viele wie der Bewerberfluss erlaubt. */
function hiringStep(state: GameState, data: GameData): void {
  const target = state.staff.targetSize;
  if (target === null) return;
  const rng = stream(state, "personal");
  for (let i = 0; i < P(data).hiresPerMonth && state.people.length < Math.min(target, maxPersonsNow(state, data)); i++) {
    const p = hireApplicant(state, data, policyApplicant(state, data, rng));
    log(state, "log.hired", { person: p.name });
  }
}

export function validateFire(state: GameState, personId: number): string | null {
  const p = state.people.find((x) => x.id === personId);
  if (!p) return "error.unknownPerson";
  if (p.isFounder) return "error.founder";
  return null;
}

function removePerson(state: GameState, person: Person): void {
  state.people = state.people.filter((p) => p.id !== person.id);
}

/** FRM-R08: 3 Monatsgehälter Abfindung, Moral aller −10. */
export function firePerson(state: GameState, data: GameData, personId: number): void {
  const p = state.people.find((x) => x.id === personId)!;
  const cost = P(data).severanceMonths * p.salaryCent;
  state.moneyCent -= cost;
  ledgerNow(state).costs.wages += cost;
  removePerson(state, p);
  for (const x of state.people) x.moraleBp = clamp(x.moraleBp + P(data).morale.layoff, 0, BP_ONE);
  log(state, "log.fired", { person: p.name, cost });
}

// ---------- Schlüsselpersonen (FRM-R09 bis FRM-R14) ----------

function drawTraits(data: GameData, rng: Rng): string[] {
  const pool = [...P(data).key.traits];
  const n = rng.range(2, 3);
  const out: string[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) out.push(pool.splice(rng.int(pool.length), 1)[0]!);
  return out.sort();
}

/** FRM-R09: Gründer und Personen ab Stärke 70 im besten Bereich werden Schlüsselpersonen mit der Rolle dieses Bereichs. */
export function promoteKey(state: GameState, data: GameData, person: Person, rng: Rng): void {
  if (person.key) return;
  const area = bestArea(person.strength);
  if (!person.isFounder && person.strength[area] < P(data).key.strengthMin) return;
  person.key = { role: P(data).key.roles[area], traits: drawTraits(data, rng), loyaltyBp: person.isFounder ? BP_ONE : P(data).key.loyaltyStartBp, storyYear: 0 };
}

function changeLoyalty(person: Person, delta: Bp): void {
  if (!person.key || person.isFounder) return;
  // Eigenschaft „loyal“: Verluste halb so groß (ANNAHME für die Wirkung der Eigenschaft).
  const d = delta < 0 && person.key.traits.includes("loyal") ? divInt(delta, 2, 1) : delta;
  person.key.loyaltyBp = clamp(person.key.loyaltyBp + d, 0, BP_ONE);
}

/** FRM-R11: Unter 40 kommen Abwerbeangebote (bei Groll eines Rivalen doppelt so oft), unter 20 kündigt die Person. */
function loyaltyStep(state: GameState, data: GameData, rng: Rng): void {
  const k = P(data).key;
  const grudge = state.ai.rivals.some((id) => (state.ai.studios.find((s) => s.id === id)?.rival?.relationBp ?? 0) <= data.ai.rivals.relation.grudgeBp);
  for (const p of [...state.people].sort((a, b) => a.id - b.id)) {
    if (!p.key || p.isFounder) continue;
    changeLoyalty(p, P(data).salaryPolicy[state.staff.salary].loyaltyMonth);
    const offerRoll = rng.uniformBp();
    const quitRoll = rng.uniformBp();
    if (p.key.loyaltyBp < k.quitBelowBp && quitRoll < k.quitChanceBp) {
      removePerson(state, p);
      log(state, "log.keyQuit", { person: p.name });
      continue;
    }
    const chance = grudge ? 2 * k.offerChanceBp : k.offerChanceBp;
    if (p.key.loyaltyBp < k.offerBelowBp && offerRoll < chance && !state.events.some((e) => e.kind === "abwerbung" && e.personId === p.id)) {
      const from = poacher(state, rng);
      changeLoyalty(p, k.loyalty.offer);
      addEvent(state, data, {
        kind: "abwerbung", scope: "welt", projectId: null, personId: p.id, options: ["gegenangebot", "halteprämie", "gehenlassen"], defaultOption: "gehenlassen",
        poachFrom: from,
      });
    }
  }
}

/** Wer abwirbt: ein Rivale mit Groll, sonst das umsatzstärkste lebende Studio (ANNAHME). */
function poacher(state: GameState, rng: Rng): string {
  const live = state.ai.studios.filter((s) => s.closedWeek === null);
  if (live.length === 0) return "";
  const angry = live.filter((s) => s.rival && s.rival.relationBp < 0);
  const pool = angry.length > 0 ? angry : live;
  return pool[rng.int(pool.length)]!.name;
}

export function applyStaffDecision(state: GameState, data: GameData, kind: string, personId: number | undefined, option: string): void {
  const p = state.people.find((x) => x.id === personId);
  if (!p?.key) return;
  const k = P(data).key;
  if (kind === "abwerbung") {
    if (option === "gegenangebot") {
      p.salaryCent = mulBp(p.salaryCent, BP_ONE + k.counterRaiseBp);
      changeLoyalty(p, k.counterLoyaltyBp);
    } else if (option === "halteprämie") {
      const cost = k.bonusMonths * p.salaryCent;
      state.moneyCent -= cost;
      ledgerNow(state).costs.wages += cost;
      changeLoyalty(p, k.loyalty.bonus);
    } else {
      removePerson(state, p);
      log(state, "log.keyPoached", { person: p.name });
      chronicle(state, "log.keyPoached", { person: p.name });
    }
  }
  if (kind === "gehaltsforderung") {
    if (option === "erfuellen") {
      p.salaryCent = mulBp(p.salaryCent, BP_ONE + k.storyRaiseBp);
      changeLoyalty(p, k.loyalty.raise);
    } else changeLoyalty(p, k.loyalty.storyDenied);
  }
}

/** FRM-R14: höchstens zwei legendäre Entwickler je Jahr auf dem Markt (als Bewerbung mit Schlagzeile). */
function legendaryStep(state: GameState, data: GameData, rng: Rng): void {
  const l = P(data).legendary;
  const y = yearOf(state);
  if (state.staff.legendary.year !== y) state.staff.legendary = { year: y, n: 0 };
  if (state.staff.legendary.n >= l.perYear || rng.uniformBp() >= l.chancePerQuarterBp) return;
  if (state.people.length >= maxPersonsNow(state, data) || state.events.some((e) => e.kind === "bewerbung")) return;
  const a = drawApplicant(state, data, rng);
  a.strength[a.focus] = rng.range(l.strengthMin, 100);
  a.salaryCent = mulBp(a.salaryCent, 2 * BP_ONE);
  state.staff.legendary.n += 1;
  chronicle(state, "log.legendary", { person: a.name, area: a.focus });
  addEvent(state, data, { kind: "bewerbung", scope: "welt", projectId: null, options: ["einstellen", "ablehnen"], defaultOption: "ablehnen", applicant: a });
}

// ---------- Wochen- und Monatsschritt ----------

/** Wer an einem crunchenden Projekt arbeitet (für Burnout, Moral, Loyalität). */
export function crunchingPeople(state: GameState, data: GameData): Set<number> {
  const out = new Set<number>();
  for (const pr of state.projects) {
    const workers = state.people.filter((p) => p.assignment?.kind === "project" && p.assignment.id === pr.id);
    if (crunching(state, data, pr, workers.length)) for (const w of workers) out.add(w.id);
  }
  return out;
}

/** FRM-R05: Mentoring: Mindestens 25 % des Teams liegen 15 über dem Schnitt, dann lernen die anderen 1 Punkt im Monat. */
function mentoringStep(state: GameState, data: GameData): void {
  const m = P(data).mentoring;
  for (const t of state.staff.teams) {
    const members = teamMembers(state, t.id);
    if (members.length < 2) continue;
    for (const a of AREAS) {
      const avg = mean(members.map((p) => p.strength[a]));
      const strong = members.filter((p) => p.strength[a] > avg + m.gapPoints);
      if (strong.length * BP_ONE < mulBp(members.length * BP_ONE, m.shareBp)) continue;
      for (const p of members) if (p.strength[a] <= avg) p.strength[a] = Math.min(100, p.strength[a] + m.pointsPerMonth);
    }
  }
}

/** FRM-R06: Ab Burnout 60 verliert eine Gruppe (Team, sonst alle ohne Team) im Monat mit 10 % eine Person. */
function burnoutQuits(state: GameState, data: GameData, rng: Rng): void {
  const b = P(data).burnout;
  const groups: Person[][] = [...state.staff.teams.map((t) => teamMembers(state, t.id)), state.people.filter((p) => p.teamId === null)];
  for (const g of groups) {
    const free = g.filter((p) => !p.isFounder);
    if (free.length === 0 || mean(g.map((p) => p.burnoutBp)) < b.quitAtBp) continue;
    if (rng.uniformBp() >= b.quitChanceBp) continue;
    const p = [...free].sort((x, y) => y.burnoutBp - x.burnoutBp || x.id - y.id)[0]!;
    removePerson(state, p);
    log(state, "log.burnoutQuit", { person: p.name });
  }
}

/** Tick-Schritt 11: Burnout, Moral und Loyalität je Woche; Monat: Politik, Mentoring, Abwerben, Einstellen. */
export function staffStep(state: GameState, data: GameData): void {
  const s = P(data);
  const crunch = crunchingPeople(state, data);
  const overload = homePeople(state) > officePlaces(state, data);
  // MRK-R56: Crunch-Wochen der letzten 52 Wochen für die Crunch-Enthüllung.
  if (crunch.size > 0) state.staff.crunchWeeks.push(state.week);
  state.staff.crunchWeeks = state.staff.crunchWeeks.filter((w) => state.week - w < 52);
  for (const p of state.people) {
    if (p.onboardWeeks > 0) p.onboardWeeks -= 1;
    if (crunch.has(p.id)) {
      // FRM-T03: Meldung, sobald der Burnout die Kündigungsschwelle erreicht.
      const gain = mulBp(s.burnout.crunchWeek, burnoutGainFactor(state, data));
      if (p.burnoutBp < s.burnout.quitAtBp && p.burnoutBp + gain >= s.burnout.quitAtBp) log(state, "log.burnoutHigh", { person: p.name });
      p.burnoutBp = clamp(p.burnoutBp + gain, 0, BP_ONE);
      p.moraleBp = clamp(p.moraleBp + s.morale.crunchWeek, 0, BP_ONE);
      changeLoyalty(p, s.key.loyalty.crunchWeek);
    } else if (overload) p.burnoutBp = clamp(p.burnoutBp + mulBp(s.burnout.overloadWeek, burnoutGainFactor(state, data)), 0, BP_ONE);
    else p.burnoutBp = Math.max(0, p.burnoutBp - s.burnout.recoverWeek);
  }
  if (!isFirstWeekOfMonth(state.startYear, state.week) || state.week === 0) return;
  const rng = stream(state, "personal");
  const level = state.staff.salary;
  if (level !== "markt") for (const p of state.people) p.moraleBp = clamp(p.moraleBp + (level === "ueber" ? s.morale.salaryHighMonth : s.morale.salaryLowMonth), 0, BP_ONE);
  for (const p of [...state.people].sort((a, b) => a.id - b.id)) promoteKey(state, data, p, rng);
  mentoringStep(state, data);
  burnoutQuits(state, data, rng);
  loyaltyStep(state, data, rng);
  hiringStep(state, data);
  if (isFirstWeekOfQuarter(state.week)) legendaryStep(state, data, rng);
}

/** FRM-R07, FRM-R10, FRM-R13: Release eines Spielers-Projekts wirkt auf die Beteiligten. */
export function onReleaseStaff(state: GameState, data: GameData, project: Project, scoreBp: Bp): void {
  const s = P(data);
  const ids = new Set(project.contributors.map((c) => c.personId));
  const people = state.people.filter((p) => ids.has(p.id)).sort((a, b) => a.id - b.id);
  const delta = scoreBp >= s.hitScoreBp ? s.morale.hit : scoreBp < s.flopScoreBp ? s.morale.flop : 0;
  for (const p of people) {
    p.moraleBp = clamp(p.moraleBp + delta, 0, BP_ONE);
    if (scoreBp >= s.hitScoreBp) changeLoyalty(p, s.key.loyalty.hit);
  }
  // FRM-R13: Gehaltsforderung nach einem Hit, je Person höchstens eine Geschichte im Jahr.
  if (scoreBp < s.hitScoreBp) return;
  const y = yearOf(state);
  const who = people.find((p) => p.key && !p.isFounder && p.key.storyYear !== y && (p.key.traits.includes("gierig") || p.key.traits.includes("ehrgeizig")));
  if (!who) return;
  who.key!.storyYear = y;
  addEvent(state, data, {
    kind: "gehaltsforderung", scope: "welt", projectId: null, personId: who.id, options: ["erfuellen", "ablehnen"], defaultOption: "ablehnen",
    projectTitle: project.title,
  });
}

/** FRM-R07: Bugs +5 % je Crunch-Woche (S02). */
export function crunchBugs(data: GameData, bugsBp: Bp): Bp {
  return mulBp(bugsBp, P(data).crunch.bugsBp);
}

// ---------- Abwerben beim Rivalen (FRM-R68) ----------

/** Zwei Schlüsselpersonen eines Rivalen (bei der Auswahl gezogen). */
export function rivalKeyPeople(data: GameData, strength: AreaMap, rng: Rng): RivalKeyPerson[] {
  const p = P(data).poach;
  const areas = [...AREAS].sort((a, b) => strength[b] - strength[a] || a.localeCompare(b)).slice(0, p.rivalKeyPeople);
  return areas.map((area) => ({
    name: makeName(data, rng), role: P(data).key.roles[area], area, strength: strength[area], loyaltyBp: rng.range(p.loyaltyRange[0], p.loyaltyRange[1]),
  }));
}

function poachKey(studioId: number, name: string, year: number): string {
  return `${studioId}:${name}:${year}`;
}

export function poachChance(data: GameData, raiseBp: Bp, loyaltyBp: Bp): Bp {
  const p = P(data).poach;
  return clamp(p.baseBp + p.raiseFactor * raiseBp - loyaltyBp, 0, p.maxBp);
}

export function validatePoach(state: GameState, data: GameData, studioId: number, index: number, raiseBp: Bp): string | null {
  const s = state.ai.studios.find((x) => x.id === studioId);
  const k = s?.rival?.keyPeople[index];
  if (!s || s.closedWeek !== null || !k) return "error.unknownPerson";
  if (!Number.isInteger(raiseBp) || raiseBp < 0 || raiseBp > BP_ONE) return "error.amount";
  if (state.staff.poachTries.includes(poachKey(studioId, k.name, yearOf(state)))) return "error.poachYear";
  if (state.people.length >= maxPersonsNow(state, data)) return "error.teamFull";
  return null;
}

/** Erfolgschance clamp(5.000 + 2 · a − 100 · Loyalität, 0, 9.000); Versuch −10, Erfolg weitere −10 Beziehung. */
export function poach(state: GameState, data: GameData, studioId: number, index: number, raiseBp: Bp): void {
  const s = state.ai.studios.find((x) => x.id === studioId)!;
  const k = s.rival!.keyPeople[index]!;
  const p = P(data).poach;
  state.staff.poachTries.push(poachKey(studioId, k.name, yearOf(state)));
  remember(state, data, s, "poachTry", p.relationAttempt);
  const rng = stream(state, "personal");
  if (rng.uniformBp() >= poachChance(data, raiseBp, k.loyaltyBp)) {
    log(state, "log.poachFailed", { person: k.name, studio: s.name });
    return;
  }
  remember(state, data, s, "poachSuccess", p.relationSuccess);
  s.rival!.keyPeople.splice(index, 1);
  // ANNAHME: Der Rivale verliert 5 Punkte in diesem Bereich.
  s.strength[k.area] = Math.max(1, s.strength[k.area] - p.strengthLoss);
  const strength = Object.fromEntries(AREAS.map((a) => [a, Math.max(1, k.strength - 20)])) as AreaMap;
  strength[k.area] = k.strength;
  const base = drawApplicant(state, data, rng);
  const person = hire(state, data, { name: k.name, strength, focus: k.area, salaryCent: mulBp(base.salaryCent, BP_ONE + raiseBp) });
  person.key = { role: k.role, traits: drawTraits(data, rng), loyaltyBp: P(data).key.loyaltyStartBp, storyYear: 0 };
  autoTeam(state, data, person);
  chronicle(state, "log.poached", { person: k.name, studio: s.name });
  log(state, "log.poached", { person: k.name, studio: s.name });
}

/** Für Prognosen: Wochenleistung der Zugeordneten eines Projekts. */
export function projectCrewWork(state: GameState, data: GameData, project: Project, workers: readonly Person[]): Cent {
  return crewWork(state, data, workers, false, crunching(state, data, project, workers.length));
}
