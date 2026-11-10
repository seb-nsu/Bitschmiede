// S06 Betrieb (Etappe 5): Bugs nach dem Release, Patches, Community-Zufriedenheit.
// Tick-Schritt 8 (S01, S12 Tick-Reihenfolge): nach dem Markt, vor den Finanzen.
import { type Bp, BP_ONE, clamp, divInt, mulBp, mulDiv } from "../num";
import { anchorValue, ledgerNow, preset } from "./finanzen";
import { wageFactor } from "./personal";
import type { GameData, GameState, OperationsInput, OperationsState, PatchInput, Project, ProductOps, SeverityMap } from "../model/types";
import { ANALYTICS_LEVELS, OPS_POTS, SEVERITIES } from "../model/types";
import { dateOf, isFirstWeekOfMonth } from "../calendar";
import { platformById } from "./markt";
import { log } from "./firma";
import { liveStep, totalLiveNeed } from "./live";
import { opsEventStep, severeBugFound } from "./betriebsereignisse";
import { merchStep } from "./merch";
import { opsDelegationStep } from "./betriebsdelegation";

const HISTORY = 52;

function zero(): SeverityMap {
  return { leicht: 0, mittel: 0, schwer: 0 };
}

function total(m: SeverityMap): number {
  return m.leicht + m.mittel + m.schwer;
}

/**
 * BTR-R05, BTR-R11: Betrieb zum Release. Die Bugs des Releases verteilen sich nach Schwere; ein Teil ist sofort
 * bekannt, der Rest verborgen. Die Zufriedenheit startet bei der Spielerwertung × 10 (ANNAHME 3 im Plan), abzüglich
 * der Zufriedenheit, die der Kopierschutz kostet (Etappe 4, MKT-R32).
 */
export function initOps(data: GameData, project: Project): ProductOps {
  const o = data.operations;
  const bugs = project.result?.bugsAtRelease ?? 0;
  const known = zero();
  const hidden = zero();
  let rest = bugs;
  for (const s of SEVERITIES) {
    // ANNAHME: Rundungsrest geht an „leicht“, damit die Summe stimmt.
    const n = s === "leicht" ? 0 : mulBp(bugs, o.severitySharesBp[s]);
    rest -= n;
    const k = mulBp(n, o.knownAtReleaseBp);
    known[s] = k;
    hidden[s] = n - k;
  }
  known.leicht = mulBp(rest, o.knownAtReleaseBp);
  hidden.leicht = rest - known.leicht;
  const target = satisfactionTarget(project);
  // MKT-R32: Kopierschutz-Zufriedenheit ist Punkte · 100 (negativ) und damit schon in der Einheit von bp.
  const start = clamp(target + (project.sales?.protection?.satisfaction ?? 0), 0, BP_ONE);
  return { satisfactionBp: start, known, hidden, patch: null, patches: 0, history: [start], live: null };
}

/** BTR-F3: Zielwert der Zufriedenheit = Spielerwertung × 10 (Wertung 10.0 = 100.000 bp → 10.000 bp). */
export function satisfactionTarget(project: Project): Bp {
  const score = project.result?.userScoreBp ?? project.result?.scoreBp ?? 0;
  return clamp(divInt(score, 10, 1), 0, BP_ONE);
}

/** BTR-F4: Spieler eines Kaufspiels = Verkäufe der letzten Wochen (ANNAHME, bis Live-Produkte eine Basis haben). */
export function activePlayers(data: GameData, project: Project): number {
  // BTR-R15: Live-Produkte zählen ihre Spielerbasis.
  if (project.ops?.live) return project.ops.live.base;
  const w = project.sales?.weekly ?? [];
  return w.slice(-data.operations.playerWeeks).reduce((a, b) => a + b, 0);
}

/** BTR-F4: gefunden = verborgen · f · Spieler / (Spieler + S½), je Schwere. */
export function findBugs(data: GameData, ops: ProductOps, players: number): SeverityMap {
  const o = data.operations;
  const found = zero();
  for (const s of SEVERITIES) {
    found[s] = mulDiv(mulBp(ops.hidden[s], o.findRateBp), players, players + o.findHalfPlayers, 1);
    ops.hidden[s] -= found[s];
    ops.known[s] += found[s];
  }
  return found;
}

/** BTR-F3, BTR-T14: −1 Punkt je 10 offene schwere Bugs pro Woche, höchstens −5. */
export function severeBugPenalty(data: GameData, ops: ProductOps): Bp {
  const z = data.operations.satisfaction;
  return Math.min(z.severeMaxPerWeekBp, divInt(ops.known.schwer, 10, 1) * z.severePerTen);
}

/** BTR-F3: Z(t+1) = clamp(Z + Einflüsse + ρ · (Z_Ziel − Z)); BTR-R11, BTR-T19: immer 0–100. */
export function updateSatisfaction(data: GameData, project: Project, influencesBp: Bp): void {
  const ops = project.ops!;
  const pull = mulBp(satisfactionTarget(project) - ops.satisfactionBp, data.operations.satisfaction.rhoBp);
  ops.satisfactionBp = clamp(ops.satisfactionBp + influencesBp + pull, 0, BP_ONE);
  ops.history = [...ops.history, ops.satisfactionBp].slice(-HISTORY);
}

/** BTR-R14: Mundpropaganda. Faktor auf die Nachfrage 1 ± w · (Z − neutral) / neutral, ANNAHME neutral 60. */
export function wordOfMouthBp(data: GameData, project: Project): Bp {
  if (!project.ops) return BP_ONE;
  const z = data.operations.satisfaction;
  const delta = clamp(mulDiv(project.ops.satisfactionBp - z.neutralBp, BP_ONE, z.neutralBp, 1), -BP_ONE, BP_ONE);
  return BP_ONE + mulBp(z.wordOfMouthBp, delta);
}

function patchBlocked(state: GameState, data: GameData, project: Project): string | null {
  const year = dateOf(state.startYear, state.week).year;
  // BTR-R09: Patches für Konsolen erst ab etwa 2000 (vorher nur PC und Heimcomputer).
  const consoleOnly = project.platforms.every((id) => { const t = platformById(data, id).type; return t === "konsole" || t === "handheld"; });
  if (consoleOnly && year < data.operations.patch.consoleFromYear) return "error.noConsolePatch";
  return null;
}

/** BTR-R07: Patch planen. Nur für veröffentlichte Spiele mit Betrieb, ein Patch zur Zeit, nur freie Personen. */
export function validatePlanPatch(state: GameState, data: GameData, input: PatchInput): string | null {
  const project = state.projects.find((p) => p.id === input.projectId);
  if (!project) return "error.unknownProject";
  if (!project.ops || project.status !== "veroeffentlicht") return "error.notReleased";
  if (project.ops.patch) return "error.patchRunning";
  if (!(input.size in data.operations.patch.effortPersonWeeks)) return "error.amount";
  if (input.people.length === 0) return "error.noPeople";
  if (new Set(input.people).size !== input.people.length) return "error.noPeople";
  for (const id of input.people) {
    const person = state.people.find((p) => p.id === id);
    if (!person) return "error.unknownPerson";
    if (person.assignment !== null) return "error.personBusy";
  }
  return patchBlocked(state, data, project);
}

/** BTR-R07: Aufwand in Personenwochen; Dauer = Aufwand / Personen (aufgerundet), Konsolen plus Zertifizierung (BTR-R09). */
export function planPatch(state: GameState, data: GameData, input: PatchInput): void {
  const project = state.projects.find((p) => p.id === input.projectId)!;
  const o = data.operations.patch;
  const effort = o.effortPersonWeeks[input.size];
  const year = dateOf(state.startYear, state.week).year;
  const console = project.platforms.some((id) => { const t = platformById(data, id).type; return t === "konsole" || t === "handheld"; });
  const weeks = divInt(effort + input.people.length - 1, input.people.length, 1) + (console ? o.consoleCertWeeks : 0);
  const fixes = effort * anchorValue(o.bugsPerPersonWeekAnchors, year);
  const people = [...input.people].sort((a, b) => a - b);
  for (const id of people) state.people.find((p) => p.id === id)!.assignment = { kind: "project", id: project.id };
  project.ops!.patch = { size: input.size, people, weeksLeft: weeks, fixes };
}

/** BTR-R07: Ein Patch behebt bekannte Bugs, die schweren zuerst; danach +3 Zufriedenheit (BTR-R12). */
function finishPatch(state: GameState, data: GameData, project: Project): Bp {
  const ops = project.ops!;
  const patch = ops.patch!;
  let left = patch.fixes;
  for (const s of [...SEVERITIES].reverse()) {
    const n = Math.min(left, ops.known[s]);
    ops.known[s] -= n;
    left -= n;
  }
  for (const id of patch.people) {
    const p = state.people.find((x) => x.id === id);
    if (p?.assignment?.kind === "project" && p.assignment.id === project.id) p.assignment = null;
  }
  ops.patch = null;
  ops.patches += 1;
  log(state, "log.patchDone", { project: project.title, fixed: patch.fixes - left });
  return data.operations.satisfaction.patchBp;
}

/** Tick-Schritt 8: Abteilung Betrieb, dann Betrieb je veröffentlichtem Spiel des Spielers, nach ID (TEC-R09). */
export function operationsStep(state: GameState, data: GameData): void {
  // Migration 38 → 39 setzt null; die Startwerte kommen aus den Daten.
  state.operations ??= newOperations(data);
  if (isFirstWeekOfMonth(state.startYear, state.week)) monthlyOperations(state, data);
  payDepartment(state, data);
  const service = serviceInfluence(state, data);
  const live = liveStep(state, data);
  for (const p of [...state.projects].sort((a, b) => a.id - b.id)) {
    if (!p.ops || p.status !== "veroeffentlicht") continue;
    const found = findBugs(data, p.ops, activePlayers(data, p));
    // S06 Abschnitt 9: „Schwerer Bug gefunden“ als Entscheidung.
    severeBugFound(state, data, p, found.schwer);
    let influence = service - severeBugPenalty(data, p.ops) + (live.get(p.id) ?? 0);
    if (p.ops.patch) {
      p.ops.patch.weeksLeft -= 1;
      if (p.ops.patch.weeksLeft <= 0) influence += finishPatch(state, data, p);
    }
    updateSatisfaction(data, p, influence);
  }
  opsEventStep(state, data);
  // MKT-R41: Merchandising je Marke (monatlich).
  merchStep(state, data);
  // BTR-R03, S06 Abschnitt 6: Produzenten und Regeln im Betrieb.
  opsDelegationStep(state, data);
}

/** BTR-R13, S06 Startwerte: Mehr als 3 DLC in einem Jahr kosten die Vorlage je weiterem DLC 4 Punkte Zufriedenheit. */
export function dlcReleased(state: GameState, data: GameData, project: Project): void {
  const source = state.projects.find((p) => p.id === project.sourceId);
  if (project.type !== "dlc" || !source?.ops) return;
  const z = data.operations.satisfaction;
  const recent = state.projects.filter((p) => p.type === "dlc" && p.sourceId === source.id && p.status === "veroeffentlicht" && p.result && state.week - p.result.week < 52).length;
  if (recent > z.dlcFloodPerYear) source.ops.satisfactionBp = clamp(source.ops.satisfactionBp - z.dlcFloodBp, 0, BP_ONE);
}

/** Offene bekannte Bugs gesamt (Anzeige, Prognosen). */
export function openBugs(ops: ProductOps): number {
  return total(ops.known);
}

/** Migration 37 → 38: veröffentlichte Spiele alter Spielstände bekommen ihren Betrieb aus Release und Daten. */
export function fillOps(state: GameState, data: GameData): void {
  for (const p of state.projects) {
    if (p.status === "veroeffentlicht" && p.result && !p.ops && !data.productTypes.find((t) => t.id === p.type)?.patch) p.ops = initOps(data, p);
  }
}

// ---------- Abteilung Betrieb und Kundenservice (5.4) ----------

export function newOperations(data: GameData): OperationsState {
  return {
    triggered: false, size: 0, auto: true, splitBp: { ...data.operations.department.splitBp }, outsourced: false,
    backlog: 0, ticketsLastMonth: 0, answeredLastMonth: 0, supportRequests: 0, supportFulfillmentBp: BP_ONE, engineMalusBp: 0,
    analytics: "keine", splitAuto: true, autoPatch: true, shutdownBelow: data.liveService.delegation.shutdownBelowPlayers,
  };
}

/** BTR-R02: Die Abteilung ist da, sobald die Freischaltung „betrieb“ erfolgt ist. */
export function departmentOpen(state: GameState): boolean {
  return state.unlocks["betrieb"] !== undefined;
}

/** BTR-F2: neue Anfragen eines Spiels im Monat. B = min(1, (leicht + 3 · mittel + 10 · schwer) / 200) aus den offenen bekannten Bugs. */
export function productTickets(data: GameData, project: Project): number {
  const t = data.operations.tickets;
  if (!project.ops) return 0;
  const sales = (project.sales?.weekly ?? []).slice(-t.salesWeeks).reduce((a, b) => a + b, 0);
  const k = project.ops.known;
  const weighted = k.leicht * t.weights.leicht + k.mittel * t.weights.mittel + k.schwer * t.weights.schwer;
  const b = Math.min(BP_ONE, mulDiv(weighted, BP_ONE, t.bugNorm, 1));
  // BTR-F2: Online-Produkte (Netzwerk-Modul als Voraussetzung) und d · B_live für Live-Produkte.
  const type = data.productTypes.find((x) => x.id === project.type);
  const online = type?.requiresModule?.module === "netzwerk" ? t.onlineBp : 0;
  return mulBp(sales, t.baseBp + mulBp(t.bugsBp, b) + online) + mulBp(project.ops.live?.base ?? 0, t.perLivePlayerBp);
}

/** Kundenanfragen je Person Kundenservice und Monat (S06: 400 im Jahr 2000, +30 % je Jahrzehnt durch Werkzeuge). */
function ticketsPerPerson(state: GameState, data: GameData): number {
  return anchorValue(data.operations.department.ticketsPerPersonMonthAnchors, dateOf(state.startYear, state.week).year);
}

/** Personen eines Topfs (ganze und anteilige Personen in bp-Personen). */
function potPeopleBp(ops: OperationsState, pot: (typeof OPS_POTS)[number]): Bp {
  return ops.size * ops.splitBp[pot];
}

/** BTR-R27: Support-Anfragen der Lizenznehmer der Spieler-Engine im Monat. */
function supportRequests(state: GameState, data: GameData): number {
  const per = data.operations.department.supportRequestsPerContract;
  return state.licensing.contracts.filter((c) => c.licensorId === 0 && c.status !== "beendet").reduce((a, c) => a + (per[c.terms.support] ?? 0), 0);
}

/**
 * Monatsjob: Anfragen (BTR-F2, BTR-R24), Auslöser der Abteilung (BTR-R02), Vorschlag nach Last (auto), Kundenservice
 * mit Rückstand oder ausgelagert (BTR-R04), Engine-Support (BTR-R27) bzw. Tempo-Abzug des Engine-Teams.
 */
export function monthlyOperations(state: GameState, data: GameData): void {
  const ops = state.operations;
  const d = data.operations.department;
  const tickets = state.projects.reduce((a, p) => a + (p.status === "veroeffentlicht" ? productTickets(data, p) : 0), 0);
  const support = supportRequests(state, data);
  ops.ticketsLastMonth = tickets;
  ops.supportRequests = support;
  // BTR-R02: Auslöser: Online-Produkt (Live), Lizenz mit Support oder 20 Anfragen in einem Monat.
  if (!ops.triggered && (tickets >= d.unlockOpenTickets || support > 0 || totalLiveNeed(state, data) > 0)) ops.triggered = true;
  const per = ticketsPerPerson(state, data);
  if (!departmentOpen(state)) {
    // Vorher beantworten Entwicklungsteams Kundenanfragen nebenbei; das Engine-Team beantwortet den Support selbst.
    ops.backlog = 0;
    ops.answeredLastMonth = tickets;
    ops.supportFulfillmentBp = BP_ONE;
    const team = state.people.filter((p) => p.assignment?.kind === "engine").length;
    const days = mulBp(support, d.engineSupportDaysPerRequestBp);
    // 0,5 Personentage je Anfrage gegen die Arbeitstage des Teams im Monat (ANNAHME: 4 Wochen).
    ops.engineMalusBp = team === 0 ? 0 : Math.min(d.engineSupportMaxMalusBp, mulDiv(days, BP_ONE, team * d.workDaysPerWeek * 4, 1));
    return;
  }
  ops.engineMalusBp = 0;
  if (ops.auto) ops.size = suggestedSize(state, data, tickets, support);
  // BTR-R04: ausgelagert beantwortet alles, kostet die Hälfte je Anfrage (gebucht in payDepartment), wirkt zu 60 %.
  const capacity = ops.outsourced ? ops.backlog + tickets : mulDiv(potPeopleBp(ops, "service"), per, BP_ONE, 1);
  const due = ops.backlog + tickets;
  ops.answeredLastMonth = Math.min(due, capacity);
  ops.backlog = due - ops.answeredLastMonth;
  const supportCap = mulDiv(potPeopleBp(ops, "support"), d.supportPerPersonMonth, BP_ONE, 1);
  ops.supportFulfillmentBp = support === 0 ? BP_ONE : Math.min(BP_ONE, mulDiv(supportCap, BP_ONE, support, 1));
}

/** Vorschlag nach Last (S06 Abschnitt 6): Kundenservice und Engine-Support mit Reserve; mindestens eine Person. */
export function suggestedSize(state: GameState, data: GameData, tickets: number, support: number): number {
  const ops = state.operations;
  const d = data.operations.department;
  const per = ticketsPerPerson(state, data);
  const service = ops.outsourced ? 0 : needed(mulBp(tickets, d.autoHeadroomBp), per, ops.splitBp.service);
  const engine = needed(mulBp(support, d.autoHeadroomBp), d.supportPerPersonMonth, ops.splitBp.support);
  // BTR-R23: Live-Ops trägt den Teamanteil aller laufenden Live-Produkte.
  const liveops = needed(totalLiveNeed(state, data) * BP_ONE, BP_ONE, ops.splitBp.liveops);
  return Math.min(d.maxSize, Math.max(1, service, engine, liveops));
}

/** Personen, damit ein Topf mit Anteil share die Last trägt (aufgerundet). */
function needed(load: number, perPerson: number, shareBp: Bp): number {
  if (load <= 0 || shareBp <= 0) return 0;
  const den = Math.max(1, mulBp(perPerson, shareBp));
  return divInt(load + den - 1, den, 1);
}

/** Kosten der Abteilung je Woche: Personen zum Lohnniveau der Epoche; ausgelagerter Kundenservice zur Hälfte je Anfrage. */
export function departmentWeeklyCost(state: GameState, data: GameData): number {
  const ops = state.operations;
  if (!departmentOpen(state)) return 0;
  const year = dateOf(state.startYear, state.week).year;
  const salary = mulBp(mulBp(anchorValue(data.economy.salaryAnchorsCent, year), preset(state, data).costFactorBp), wageFactor(state, data));
  // BTR-R28: Analytics-Personen gehören zur Abteilung (ANNAHME: zum selben Lohnniveau).
  const people = mulDiv(salary * (ops.size + data.liveService.analytics.people[ops.analytics ?? "keine"]), 12, 52, 1);
  if (!ops.outsourced) return people;
  // Je Anfrage kostet eine Person Gehalt / Anfragen je Person; ausgelagert die Hälfte (BTR-R04).
  const perTicket = mulDiv(salary, data.operations.department.outsourceCostBp, ticketsPerPerson(state, data) * BP_ONE, 1);
  return people + mulDiv(perTicket * ops.ticketsLastMonth, 12, 52, 1);
}

function payDepartment(state: GameState, data: GameData): void {
  const cost = departmentWeeklyCost(state, data);
  if (cost <= 0) return;
  state.moneyCent -= cost;
  ledgerNow(state).costs.wages += cost;
}

/**
 * BTR-R12, BTR-R13, BTR-F3: Wirkung des Kundenservice auf jedes Spiel je Woche. Rückstand: −1 je 10 % der Anfragen des
 * Monats, höchstens −10 (ANNAHME). Beantwortet alles: +0,5 (ausgelagert +0,3, BTR-R04: 60 % Wirkung).
 */
export function serviceInfluence(state: GameState, data: GameData): Bp {
  const ops = state.operations;
  const z = data.operations.satisfaction;
  if (!departmentOpen(state) || ops.ticketsLastMonth === 0) return 0;
  if (ops.backlog === 0) return ops.outsourced ? z.outsourcedAnsweredBp : z.answeredBp;
  const tenths = divInt(ops.backlog * 10, Math.max(1, ops.ticketsLastMonth), 1);
  return -Math.min(z.backlogMaxBp, tenths * z.backlogPer10PctBp);
}

/** BTR-R25: Kanal der Epoche (nur Darstellung). */
export function ticketChannel(state: GameState, data: GameData): string {
  const year = dateOf(state.startYear, state.week).year;
  return [...data.operations.channels].reverse().find(([from]) => year >= from)?.[1] ?? data.operations.channels[0]![1];
}

/** BTR-R01, BTR-R04: Größe, Automatik, Aufteilung (Summe 100 %), Auslagerung. */
export function validateSetOperations(state: GameState, data: GameData, input: OperationsInput): string | null {
  if (!departmentOpen(state)) return "error.locked";
  // BTR-R28: Analytics ab 2010, in drei Stufen.
  if (input.analytics !== undefined) {
    if (!ANALYTICS_LEVELS.includes(input.analytics)) return "error.amount";
    if (input.analytics !== "keine" && dateOf(state.startYear, state.week).year < data.liveService.analytics.fromYear) return "error.tooEarly";
  }
  if (input.size !== undefined && (!Number.isSafeInteger(input.size) || input.size < 0 || input.size > data.operations.department.maxSize)) return "error.amount";
  if (input.shutdownBelow !== undefined && (!Number.isSafeInteger(input.shutdownBelow) || input.shutdownBelow < 0)) return "error.amount";
  if (input.splitBp) {
    const values = OPS_POTS.map((k) => input.splitBp![k]);
    if (values.some((v) => !Number.isSafeInteger(v) || v < 0) || values.reduce((a, b) => a + b, 0) !== BP_ONE) return "error.split";
  }
  return null;
}

export function setOperations(state: GameState, input: OperationsInput): void {
  const ops = state.operations;
  if (input.size !== undefined) {
    ops.size = input.size;
    ops.auto = false;
  }
  if (input.auto !== undefined) ops.auto = input.auto;
  if (input.splitBp) {
    ops.splitBp = { ...input.splitBp };
    // BTR-R03: Der Spieler greift ein; die Produzenten verteilen nicht mehr, bis er es wieder erlaubt.
    ops.splitAuto = false;
  }
  if (input.splitAuto !== undefined) ops.splitAuto = input.splitAuto;
  if (input.autoPatch !== undefined) ops.autoPatch = input.autoPatch;
  if (input.shutdownBelow !== undefined) ops.shutdownBelow = input.shutdownBelow;
  if (input.outsourced !== undefined) ops.outsourced = input.outsourced;
  if (input.analytics !== undefined) ops.analytics = input.analytics;
}
