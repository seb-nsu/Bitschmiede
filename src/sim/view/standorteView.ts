// Anzeigemodell der Standorte (S07 FRM-R32 bis FRM-R34, FRM-R72; Etappe 6a.6).
import type { Bp, Cent } from "../num";
import type { GameData, GameState, Region } from "../model/types";
import { dateOf, type CalendarDate } from "../calendar";
import { isUnlocked } from "../systems/katalog";
import { officePlaces } from "../systems/buero";
import { homePeople, openingCost, peopleAt, validateLocation } from "../systems/standorte";

export interface LocationView {
  /** 0 = Heimatstandort. */
  id: number;
  region: Region;
  people: number;
  places: number;
  ready: CalendarDate | null;
  wageFactorBp: Bp;
  subsidyBp: Bp;
  taxRateBp: Bp;
}

export interface LocationsView {
  unlocked: boolean;
  list: LocationView[];
  regions: { id: Region; wageFactorBp: Bp; subsidyBp: Bp; taxRateBp: Bp; costCent: Cent; blocked: string | null }[];
}

export function locationsView(state: GameState, data: GameData): LocationsView {
  const r = data.regions;
  const home = r.regions[r.home];
  const list: LocationView[] = [
    { id: 0, region: r.home, people: homePeople(state), places: officePlaces(state, data), ready: null, wageFactorBp: home.wageFactorBp, subsidyBp: home.subsidyBp, taxRateBp: home.taxRateBp },
    ...[...state.locations].sort((a, b) => a.id - b.id).map((l) => ({
      id: l.id, region: l.region, people: peopleAt(state, l.id).length, places: r.locations.places,
      ready: state.week < l.readyWeek ? dateOf(state.startYear, l.readyWeek) : null,
      wageFactorBp: r.regions[l.region].wageFactorBp, subsidyBp: r.regions[l.region].subsidyBp, taxRateBp: r.regions[l.region].taxRateBp,
    })),
  ];
  const regions = (Object.keys(r.regions) as Region[]).sort().filter((id) => id !== r.home && !state.locations.some((l) => l.region === id)).map((id) => ({
    id, ...r.regions[id], costCent: openingCost(state, data, id), blocked: validateLocation(state, data, { type: "location", action: "eroeffnen", region: id }),
  }));
  return { unlocked: isUnlocked(state, "standorte"), list, regions };
}
