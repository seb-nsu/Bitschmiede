// Firma für Prototyp 0b: Personen mit Zuordnung (FRM-R02), Kasse, Einarbeitung, Erfahrung (FRM-R05),
// Aufträge (FRM-R49) und Einstellungen. S07 stark vereinfacht; Teams, Moral und Büro folgen in Etappe 1 und 3.
import { locationPlaces, placeNewPerson } from "./standorte";
import { BP_ONE, type Cent, divInt, mulBp, mulDiv } from "../num";
import { AREAS, type Applicant, type Area, type AreaMap, type Contract, type ContractOffer, type GameData, type GameState, type OfficeDef, type Person } from "../model/types";
import type { Rng } from "../rng";
import { dateOf } from "../calendar";
import { freezeDeep } from "../clone";
import { anchorValue, scaleToYear } from "./finanzen";
import { staffStep } from "./personal";
import { officeDef, officePlaces, placesOf } from "./buero";

export function makeName(data: GameData, rng: Rng): string {
  const a = data.applications;
  const first = a.firstNames[rng.int(a.firstNames.length)]!;
  const last = a.lastInitials[rng.int(a.lastInitials.length)]!;
  return `${first} ${last}.`;
}

function newPerson(state: GameState, data: GameData, name: string, strength: AreaMap, salaryCent: Cent, isFounder: boolean): Person {
  const person: Person = {
    id: state.nextPersonId, name, isFounder, strength, salaryCent,
    experienceGenre: {}, experienceEngine: 0, assignment: null, transferWeeks: 0, hiredWeek: state.week,
    teamId: null, onboardWeeks: 0, moraleBp: data.staff.morale.startBp, burnoutBp: 0, key: null,
  };
  state.nextPersonId += 1;
  state.people.push(person);
  return person;
}

/** Zwei Gründer: der erste mit gewähltem Schwerpunkt, der zweite mit einem zufälligen anderen (Strom „personal“). */
export function createFounders(state: GameState, data: GameData, rng: Rng): void {
  const s = data.start;
  const focus = state.settings.founderFocus;
  // Etappe 6c.10: Bei späterem Start wächst die Grundstärke mit der Teamstärke der Branche (marketStrengthAnchors).
  const anchors = data.quality.marketStrengthAnchors;
  const base = mulDiv(s.baseStrength, anchorValue(anchors, state.startYear), Math.max(1, anchorValue(anchors, s.startYear)), 1);
  const strength = (bonusArea: Area, bonus: number) =>
    Object.fromEntries(AREAS.map((a) => [a, Math.min(100, base + (a === bonusArea ? bonus : 0))])) as AreaMap;
  // Etappe 6c.10: Gründergehalt aufs Lohnniveau des Startjahres (1980 unverändert).
  const salary = scaleToYear(data, s.costPerPersonMonthCent, state.startYear);
  newPerson(state, data, makeName(data, rng), strength(focus, s.founderBonus), salary, true);
  const others = AREAS.filter((a) => a !== focus);
  const second = others[rng.int(others.length)]!;
  let name = makeName(data, rng);
  while (name === state.people[0]!.name) name = makeName(data, rng);
  newPerson(state, data, name, strength(second, s.secondFounderBonus), salary, true);
}

export function personById(state: GameState, id: number): Person | undefined {
  return state.people.find((p) => p.id === id);
}

export function assignedTo(state: GameState, projectId: number): Person[] {
  return state.people.filter((p) => p.assignment?.kind === "project" && p.assignment.id === projectId);
}

/** Ins Engine-Team (Plan Etappe 2, Punkt 1); wie ein Projektwechsel mit Einarbeitung, wenn die Person vorher arbeitete. */
export function assignEngine(state: GameState, data: GameData, person: Person): void {
  if (person.assignment?.kind === "engine") return;
  const wasWorking = person.assignment !== null;
  person.assignment = { kind: "engine", id: 0 };
  person.transferWeeks = wasWorking ? data.start.transferWeeks : 0;
}

/** Umsetzen auf ein Projekt kostet Einarbeitung (FRM-R04 vereinfacht); frei stellen nicht. */
export function assignPerson(state: GameState, data: GameData, person: Person, projectId: number | null): void {
  if (projectId === null) {
    person.assignment = null;
    person.transferWeeks = 0;
    return;
  }
  if (person.assignment?.kind === "project" && person.assignment.id === projectId) return;
  const wasWorking = person.assignment !== null;
  person.assignment = { kind: "project", id: projectId };
  person.transferWeeks = wasWorking ? data.start.transferWeeks : 0;
}

/** FRM-R49: q = Stärke × Erfahrung / 100. ANNAHME: Erfahrung für Aufträge = Grundwert + halbe Engine-Erfahrung, höchstens 100. */
export function contractQuality(data: GameData, person: Person, area: Area): number {
  const experience = Math.min(100, data.contracts.baseExperience + divInt(person.experienceEngine, 200, 1));
  return divInt(person.strength[area] * experience, 100, 1);
}

export function startContract(state: GameState, offer: ContractOffer, person: Person, team: Person[] = []): Contract {
  const members = [person, ...team.filter((x) => x.id !== person.id)];
  const contract: Contract = {
    id: state.nextContractId, ...offer, personId: person.id,
    ...(members.length > 1 ? { personIds: members.map((x) => x.id) } : {}),
    startWeek: state.week, deadlineWeek: state.week + offer.weeks, status: "laeuft", quality: null,
  };
  state.nextContractId += 1;
  state.contracts.push(contract);
  for (const m of members) {
    m.assignment = { kind: "contract", id: contract.id };
    m.transferWeeks = 0;
  }
  return contract;
}

/**
 * Team-Auftrag (Entscheidung Projektleitung 03.11.2026): die besten freien Personen für den Bereich (nicht schon an einen
 * Auftrag gebunden), nach Auftragsqualität, bei Gleichstand nach ID. Leer, wenn nicht genug Leute da sind.
 */
export function contractTeam(state: GameState, data: GameData, offer: ContractOffer): Person[] {
  const size = offer.team ?? 1;
  const pool = state.people.filter((p) => p.assignment?.kind !== "contract")
    .sort((a, b) => contractQuality(data, b, offer.area) - contractQuality(data, a, offer.area) || a.id - b.id);
  return pool.length >= size ? pool.slice(0, size) : [];
}

/** Qualität eines Teams: Mittel der Einzelqualitäten (ANNAHME: wie die Stärke eines Projektteams ohne Führung). */
export function teamContractQuality(data: GameData, people: Person[], area: Area): number {
  if (people.length === 0) return 0;
  return divInt(people.reduce((s, p) => s + contractQuality(data, p, area), 0), people.length, 1);
}

export function hire(state: GameState, data: GameData, applicant: Applicant): Person {
  const person = newPerson(state, data, applicant.name, applicant.strength, applicant.salaryCent, false);
  placeNewPerson(state, data, person);
  return person;
}

export function log(state: GameState, key: string, params: Record<string, string | number> = {}): void {
  state.log.push(freezeDeep({ week: state.week, key, params }));
  if (state.log.length > 60) state.log.splice(0, state.log.length - 60);
}

/**
 * FRM-R49: Aufträge mit Frist in dieser Woche abrechnen; liefert die Einnahmen (mit Preset-Faktor auf Einnahmen).
 * Wird vom Finanz-Schritt aufgerufen.
 */
export function settleContracts(state: GameState, data: GameData, revenueFactorBp: number): Cent {
  let income = 0;
  for (const c of state.contracts) {
    if (c.status !== "laeuft" || c.deadlineWeek > state.week) continue;
    const person = personById(state, c.personId);
    const members = (c.personIds ?? [c.personId]).map((id) => personById(state, id)).filter((p): p is Person => p !== undefined);
    c.quality = teamContractQuality(data, members, c.area);
    const ok = c.quality >= c.requirement;
    c.status = ok ? "erfuellt" : "verfehlt";
    const pay = mulBp(ok ? c.payCent : mulBp(c.payCent, data.contracts.failPayBp), revenueFactorBp);
    income += pay;
    for (const m of members) if (m.assignment?.kind === "contract" && m.assignment.id === c.id) m.assignment = null;
    log(state, ok ? "log.contractDone" : "log.contractFailed", { client: c.client, kind: c.kind, pay, person: person?.name ?? "" });
  }
  return income;
}

/**
 * Tick-Schritt 11: Einarbeitung läuft ab; wer diese Woche an einem laufenden Projekt gearbeitet hat, gewinnt
 * 0,5 Punkte Erfahrung mit Genre und Engine (FRM-R05; ANNAHME: wöchentlich statt im Monatsjob).
 */
export function personnelStep(state: GameState, data: GameData): void {
  staffStep(state, data);
  if (state.office.moveWeeksLeft > 0) state.office.moveWeeksLeft -= 1;
  const gain = data.start.experienceGainPerWeekBp;
  for (const person of state.people) {
    if (person.transferWeeks > 0) {
      person.transferWeeks -= 1;
      continue;
    }
    if (person.assignment?.kind !== "project") continue;
    const project = state.projects.find((x) => x.id === person.assignment!.id);
    if (!project || project.status !== "laeuft") continue;
    person.experienceGenre[project.genre] = Math.min(10000, (person.experienceGenre[project.genre] ?? 0) + gain);
    person.experienceEngine = Math.min(10000, person.experienceEngine + gain);
  }
}

/** Auftrags-Angebot aus den Daten (Strom „ereignisse“). */
export function drawContractOffer(state: GameState, data: GameData, rng: Rng): ContractOffer {
  const c = data.contracts;
  const kind = c.kinds[rng.int(c.kinds.length)]!;
  const year = dateOf(state.startYear, state.week).year;
  // Team-Auftrag: erst ab fromYear gezogen, damit frühere Läufe denselben Zufall behalten.
  let team = 1;
  if (c.team && year >= c.team.fromYear && rng.int(10000) < c.team.chanceBp) {
    team = rng.range(c.team.sizeMin, Math.max(c.team.sizeMin, anchorValue(c.team.sizeMaxAnchors, year)));
  }
  const single = rng.range(kind.weeks[0], kind.weeks[1]);
  const weeks = team > 1 && c.team ? mulBp(single, c.team.weeksBp) : single;
  const perPerson = team > 1 && c.team ? mulBp(team * BP_ONE, c.team.payPerPersonBp) : BP_ONE;
  return {
    kind: kind.id,
    client: c.clients[rng.int(c.clients.length)]!,
    area: kind.area,
    weeks,
    ...(team > 1 ? { team } : {}),
    // Bezahlung in 1980er-Preisen, auf das Lohnniveau des Jahres hochgerechnet (A20).
    // Entscheidung Projektleitung 02.11.2026: Ab 2000 werden Aufträge mit der Epoche besser bezahlt (Auftragsstudio bis 2040).
    payCent: mulBp(mulBp(scaleToYear(data, weeks * rng.range(kind.payPerWeekCent[0], kind.payPerWeekCent[1]), year),
      c.epoch ? anchorValue(c.epoch.payBp, year) : BP_ONE), perPerson),
    requirement: rng.range(kind.requirement[0], kind.requirement[1]),
  };
}

/**
 * Balancing 1.0 (Lauf 1980–2040): Die Branche wird besser (marketStrengthAnchors, KI-Studios, Q_erw); Bewerber wachsen
 * mit, sonst fällt jedes Studio ab 2000 hinter den Markt zurück (Wertung 8 → 3). Faktor = Anker(Jahr) / Anker(1980).
 * ANNAHME: Das Gehalt folgt der relativen Stärke (wie 1980), nicht der absoluten.
 */
export function strengthLift(state: GameState, data: GameData): { num: number; den: number } {
  const a = data.quality.marketStrengthAnchors;
  return { num: anchorValue(a, dateOf(state.startYear, state.week).year), den: Math.max(1, anchorValue(a, data.start.startYear)) };
}

/** Bewerbung aus den Daten (Strom „personal“): Grundstärke, ein Schwerpunkt, Gehalt nach Schwerpunkt-Stärke. */
export function drawApplicant(state: GameState, data: GameData, rng: Rng): Applicant {
  const a = data.applications;
  const lift = strengthLift(state, data);
  const base = rng.range(a.baseStrength[0], a.baseStrength[1]);
  const focus = AREAS[rng.int(AREAS.length)]!;
  const focusStrength = Math.min(100, base + rng.range(a.focusBonus[0], a.focusBonus[1]));
  const strength = Object.fromEntries(AREAS.map((x) => [x, Math.min(100, mulDiv(base, lift.num, lift.den, 1))])) as AreaMap;
  strength[focus] = Math.min(100, mulDiv(focusStrength, lift.num, lift.den, 1));
  let name = makeName(data, rng);
  for (let i = 0; i < 10 && state.people.some((p) => p.name === name); i++) name = makeName(data, rng);
  const salary1980 = a.salaryBaseCent + focusStrength * a.salaryPerFocusPointCent;
  return { name, strength, focus, salaryCent: scaleToYear(data, salary1980, dateOf(state.startYear, state.week).year) };
}

// ---------- Büro (S07 FRM-R21 bis FRM-R25, Entscheidung 1) ----------

export function officeOf(state: GameState, data: GameData): OfficeDef {
  return officeDef(data, state.office.id);
}

/** Höchstzahl Personen: Plätze + 20 % Überbelegung (FRM-R23), höchstens die Einzelpersonen-Grenze (FRM-R02). */
export function maxPersonsNow(state: GameState, data: GameData): number {
  const places = officePlaces(state, data);
  // FRM-R32: Die Plätze der weiteren Standorte kommen dazu.
  return Math.min(data.start.maxPersons, places + mulBp(places, data.offices.overcrowdingMaxBp) + locationPlaces(state, data));
}

export function validateMove(state: GameState, data: GameData, target: string): string | null {
  const office = data.offices.offices.find((o) => o.id === target);
  if (!office) return "error.unknownOffice";
  if (office.id === state.office.id) return "error.sameOffice";
  if (dateOf(state.startYear, state.week).year < office.availableFrom) return "error.officeLocked";
  if (placesOf(state, data, office, 0) < state.people.length) return "error.officeTooSmall";
  return null;
}
