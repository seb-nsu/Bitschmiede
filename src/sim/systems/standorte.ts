// Standorte (S07 FRM-R32 bis FRM-R34, FRM-R72; Etappe 6a.6): Lohnfaktor, Förderung, Aufbau, Schließen, regionale Steuer.
import { type Bp, BP_ONE, type Cent, mulBp, mulDiv } from "../num";
import type { GameData, GameState, Location, LocationInput, Person, Region } from "../model/types";
import { dateOf } from "../calendar";
import { anchorValue, ledgerNow, preset } from "./finanzen";
import { isUnlocked } from "./katalog";
import { log } from "./firma";
import { firePerson } from "./personal";
import { officePlaces } from "./buero";

const L = (data: GameData) => data.regions.locations;

function year(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

export function locationById(state: GameState, id: number | undefined): Location | undefined {
  return id === undefined ? undefined : state.locations.find((l) => l.id === id);
}

export function regionOf(state: GameState, data: GameData, person: Person): Region {
  return locationById(state, person.locationId)?.region ?? data.regions.home;
}

/** FRM-R33: Lohnkostenfaktor einer Person = Lohnfaktor der Region × (1 − Förderung). */
export function locationWageBp(state: GameState, data: GameData, person: Person): Bp {
  if (person.locationId === undefined) return BP_ONE;
  const r = data.regions.regions[regionOf(state, data, person)];
  return mulBp(r.wageFactorBp, BP_ONE - r.subsidyBp);
}

/** FRM-R32: Während des Aufbaus (6 Monate) arbeiten die Personen eines neuen Standorts mit halber Leistung. */
export function locationWorkBp(state: GameState, data: GameData, person: Person): Bp {
  const loc = locationById(state, person.locationId);
  return loc && state.week < loc.readyWeek ? L(data).buildWorkBp : BP_ONE;
}

export function peopleAt(state: GameState, locationId: number | undefined): Person[] {
  return state.people.filter((p) => p.locationId === locationId);
}

export function homePeople(state: GameState): number {
  return state.people.filter((p) => p.locationId === undefined).length;
}

/** Plätze aller weiteren Standorte (ANNAHME: je Standort ein festes Büro mit 50 Plätzen ohne Ausstattung). */
export function locationPlaces(state: GameState, data: GameData): number {
  return state.locations.length * L(data).places;
}

/** Monatsmiete eines Standort-Büros: Plätze × Miete je Platz × Lohnfaktor der Region (ANNAHME). */
function locationRent(state: GameState, data: GameData, region: Region): Cent {
  const perPlace = mulBp(anchorValue(data.economy.rentPerPlaceAnchorsCent, year(state)), preset(state, data).costFactorBp);
  return mulBp(L(data).places * perPlace, data.regions.regions[region].wageFactorBp);
}

export function locationsMonthlyRent(state: GameState, data: GameData): Cent {
  return state.locations.reduce((s, l) => s + locationRent(state, data, l.region), 0);
}

/** FRM-R32: Ein Standort kostet eine Einheit Führungskapazität. */
export function locationLeadUnits(state: GameState, data: GameData): number {
  return state.locations.length * L(data).leadUnits;
}

export function openingCost(state: GameState, data: GameData, region: Region): Cent {
  return L(data).depositMonths * locationRent(state, data, region);
}

export function validateLocation(state: GameState, data: GameData, input: LocationInput): string | null {
  if (!isUnlocked(state, "standorte")) return "error.locked";
  if (input.action === "eroeffnen") {
    if (!input.region || !(input.region in data.regions.regions)) return "error.unknownRegion";
    if (input.region === data.regions.home || state.locations.some((l) => l.region === input.region)) return "error.regionTaken";
    if (state.locations.length + 1 >= L(data).maxLocations) return "error.tooManyLocations";
    if (state.moneyCent < openingCost(state, data, input.region)) return "error.noMoney";
    return null;
  }
  if (input.action === "schliessen") return locationById(state, input.locationId) ? null : "error.unknownLocation";
  const person = state.people.find((p) => p.id === input.personId);
  if (!person) return "error.unknownPerson";
  const target = input.locationId === 0 ? undefined : input.locationId;
  if (target !== undefined && !locationById(state, target)) return "error.unknownLocation";
  if (person.locationId === target) return "error.sameLocation";
  const free = target === undefined ? officePlaces(state, data) - homePeople(state) : L(data).places - peopleAt(state, target).length;
  return free > 0 ? null : "error.locationFull";
}

export function applyLocation(state: GameState, data: GameData, input: LocationInput): void {
  if (input.action === "eroeffnen") {
    const region = input.region!;
    const cost = openingCost(state, data, region);
    state.moneyCent -= cost;
    ledgerNow(state).costs.other += cost;
    state.locations.push({ id: state.nextLocationId, region, openedWeek: state.week, readyWeek: state.week + L(data).buildWeeks });
    state.nextLocationId += 1;
    log(state, "log.locationOpened", { region, cost });
    return;
  }
  if (input.action === "schliessen") {
    // FRM-R34: Abfindungen nach FRM-R08 für alle am Standort; der Ruf leidet (ANNAHME: Studio-Ruf statt Ruf der Region).
    const loc = locationById(state, input.locationId)!;
    for (const p of peopleAt(state, loc.id).sort((a, b) => a.id - b.id)) firePerson(state, data, p.id);
    state.locations = state.locations.filter((l) => l.id !== loc.id);
    state.studioReputationBp = Math.max(0, state.studioReputationBp - L(data).closeReputationBp);
    log(state, "log.locationClosed", { region: loc.region });
    return;
  }
  // FRM-R04: Ein Standortwechsel kostet 8 Wochen Einarbeitung.
  const person = state.people.find((p) => p.id === input.personId)!;
  if (input.locationId === 0 || input.locationId === undefined) delete person.locationId;
  else person.locationId = input.locationId;
  person.onboardWeeks = Math.max(person.onboardWeeks, L(data).onboardWeeks);
  log(state, "log.personMoved", { person: person.name, region: regionOf(state, data, person) });
}

/** Neue Leute kommen an den Heimatstandort; ist er voll, an den ersten Standort mit freiem Platz (ANNAHME). */
export function placeNewPerson(state: GameState, data: GameData, person: Person): void {
  if (state.locations.length === 0 || homePeople(state) <= officePlaces(state, data)) return;
  const loc = [...state.locations].sort((a, b) => a.id - b.id).find((l) => peopleAt(state, l.id).length < L(data).places);
  if (loc) person.locationId = loc.id;
}

/**
 * FRM-R72, FRM-T22: Der Gewinn wird nach Lohnkosten auf die Regionen verteilt und dort besteuert. Liefert die Steuer.
 * ANNAHME: wie bisher quartalsweise (Datenblatt „quartalsweise“), mit dem Verlustvortrag aus dem Finanz-Schritt.
 */
export function regionalTax(state: GameState, data: GameData, base: Cent): Cent {
  const wages = new Map<Region, number>();
  for (const p of state.people) {
    const r = regionOf(state, data, p);
    wages.set(r, (wages.get(r) ?? 0) + mulBp(p.salaryCent, locationWageBp(state, data, p)));
  }
  const total = [...wages.values()].reduce((s, w) => s + w, 0);
  if (total === 0) return mulBp(base, data.regions.regions[data.regions.home].taxRateBp);
  let tax = 0;
  for (const [r, w] of [...wages.entries()].sort((a, b) => a[0].localeCompare(b[0]))) tax += mulBp(mulDiv(base, w, total, 1), data.regions.regions[r].taxRateBp);
  return tax;
}
