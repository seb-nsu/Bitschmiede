// Teilschritt 6a.6: Standorte (S07 FRM-R32 bis FRM-R34, FRM-R72).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { migrateState } from "../../src/sim/save";
import { weeklyWages } from "../../src/sim/systems/finanzen";
import { leadCapacity } from "../../src/sim/systems/delegation";
import { crewWork } from "../../src/sim/systems/personal";
import { regionalTax } from "../../src/sim/systems/standorte";
import { maxPersonsNow } from "../../src/sim/systems/firma";
import type { GameData, GameState } from "../../src/sim/model/types";
import { neutralGame, testData } from "../helpers";

function open(data: GameData): GameState {
  const s = neutralGame(data);
  s.unlocks.standorte = s.week;
  s.moneyCent = 1e11;
  return s;
}

describe("Standorte (FRM-R32 bis FRM-R34)", () => {
  it("FRM-R32: erst nach der Freischaltung; eröffnen kostet die Kaution, bringt Plätze und bindet Führungskapazität", () => {
    const data = testData();
    const s = open(data);
    expect(validateInput(neutralGame(data), data, { type: "location", action: "eroeffnen", region: "eu" })).toBe("error.locked");
    expect(validateInput(s, data, { type: "location", action: "eroeffnen", region: "na" })).toBe("error.regionTaken");
    const lead = leadCapacity(s, data);
    const max = maxPersonsNow(s, data);
    const next = tick(s, data, [{ type: "location", action: "eroeffnen", region: "eu" }]);
    expect(next.locations).toHaveLength(1);
    expect(next.locations[0]!.readyWeek - next.locations[0]!.openedWeek).toBe(26);
    expect(maxPersonsNow(next, data)).toBe(max + 50);
    expect(leadCapacity(next, data)).toBe(Math.max(0, lead - 1));
    expect(validateInput(next, data, { type: "location", action: "eroeffnen", region: "eu" })).toBe("error.regionTaken");
  });

  it("FRM-R33: Lohnkosten mit Lohnfaktor und Förderung der Region; FRM-R04: Versetzen kostet 8 Wochen Einarbeitung", () => {
    const data = testData();
    let s = tick(open(data), data, [{ type: "location", action: "eroeffnen", region: "cn" }]);
    const before = weeklyWages(s, data);
    const person = s.people[1]!;
    s = tick(s, data, [{ type: "location", action: "versetzen", personId: person.id, locationId: s.locations[0]!.id }]);
    const moved = s.people.find((p) => p.id === person.id)!;
    expect(moved.onboardWeeks).toBeGreaterThanOrEqual(7);
    // cn: Lohnfaktor 0,6 und 15 % Förderung → 51 % der Kosten.
    expect(weeklyWages(s, data)).toBeLessThan(before);
  });

  it("FRM-R32: Personen eines Standorts im Aufbau arbeiten mit halber Leistung", () => {
    const data = testData();
    let s = tick(open(data), data, [{ type: "location", action: "eroeffnen", region: "eu" }]);
    const p = structuredClone(s.people[1]!);
    p.onboardWeeks = 0;
    const home = crewWork(s, data, [p], false, false);
    p.locationId = s.locations[0]!.id;
    expect(crewWork(s, data, [p], false, false)).toBe(Math.trunc(home / 2));
    s = structuredClone(s);
    s.week = s.locations[0]!.readyWeek;
    expect(crewWork(s, data, [p], false, false)).toBe(home);
  });

  it("FRM-R34: Schließen kostet Abfindungen und Ruf", () => {
    const data = testData();
    let s = tick(open(data), data, [{ type: "location", action: "eroeffnen", region: "eu" }]);
    const loc = s.locations[0]!.id;
    s = tick(s, data, [{ type: "location", action: "versetzen", personId: s.people[1]!.id, locationId: loc }]);
    const people = s.people.length;
    const rep = s.studioReputationBp;
    s = tick(s, data, [{ type: "location", action: "schliessen", locationId: loc }]);
    expect(s.locations).toHaveLength(0);
    expect(s.people).toHaveLength(people - 1);
    expect(s.studioReputationBp).toBeLessThan(rep);
    expect(s.log.some((l) => l.key === "log.fired")).toBe(true);
  });
});

describe("Regionale Steuer (FRM-R72)", () => {
  it("FRM-T22: Gewinn 1 Mio., Lohnkosten 60/40, Sätze 30 % und 20 % → 260.000", () => {
    const data = testData();
    data.regions.regions.na.taxRateBp = 3000;
    data.regions.regions.eu = { wageFactorBp: 10000, subsidyBp: 0, taxRateBp: 2000 };
    const s = open(data);
    s.locations.push({ id: 1, region: "eu", openedWeek: 0, readyWeek: 0 });
    s.people = s.people.slice(0, 2);
    s.people[0]!.salaryCent = 600000;
    delete s.people[0]!.locationId;
    s.people[1]!.salaryCent = 400000;
    s.people[1]!.locationId = 1;
    expect(regionalTax(s, data, 100000000)).toBe(18000000 + 8000000);
  });

  it("Spielstand 49 → 50: keine weiteren Standorte", () => {
    const data = testData();
    const old = structuredClone(neutralGame(data)) as unknown as Record<string, unknown>;
    old.schemaVersion = 49;
    delete old.locations;
    delete old.nextLocationId;
    expect(migrateState(old as never).locations).toEqual([]);
  });
});
