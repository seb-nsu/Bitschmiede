// PRD-R40 bis PRD-R44: Pausieren, Fortsetzen, Abbrechen, Archiv; TEC-R41: Migration 2 → 3.
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import { migrateState } from "../../src/sim/save";
import { SCHEMA_VERSION } from "../../src/sim/game";
import { buildView } from "../../src/sim/view/view";
import { totalEffort } from "../../src/sim/systems/produkte/quality";
import { steerOutcome } from "../../src/sim/systems/produkte/projects";
import { input, neutralGame, testData } from "../helpers";

function run(state: ReturnType<typeof neutralGame>, data: ReturnType<typeof testData>, weeks: number) {
  let s = state;
  for (let i = 0; i < weeks; i++) s = tick(s, data);
  return s;
}

describe("Pausieren und Fortsetzen (PRD-R40)", () => {
  it("PRD-R40 Pausieren gibt die Personen frei und behält den Fortschritt", () => {
    const data = testData();
    let s = run(tick(neutralGame(data), data, [input()]), data, 5);
    const done = s.projects[0]!.effortDoneBp;
    s = tick(s, data, [{ type: "pauseProject", projectId: 1 }]);
    expect(s.projects[0]!.status).toBe("pausiert");
    expect(s.people.every((p) => p.assignment === null)).toBe(true);
    s = run(s, data, 4);
    expect(s.projects[0]!.effortDoneBp).toBe(done);
  });

  it("PRD-R40 die Wiederaufnahme kostet drei Wochen Einarbeitung", () => {
    const data = testData();
    let s = run(tick(neutralGame(data), data, [input()]), data, 5);
    s = tick(s, data, [{ type: "pauseProject", projectId: 1 }]);
    const done = s.projects[0]!.effortDoneBp;
    s = tick(s, data, [{ type: "resumeProject", projectId: 1, people: [1, 2] }]);
    s = run(s, data, 2);
    expect(s.projects[0]!.effortDoneBp).toBe(done);
    s = run(s, data, 1);
    expect(s.projects[0]!.effortDoneBp).toBeGreaterThan(done);
  });

  it("Ein pausiertes Projekt zählt nicht gegen die Projektgrenze", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input()]);
    s = tick(s, data, [{ type: "pauseProject", projectId: 1 }]);
    s = tick(s, data, [input({ title: "Neu" })]);
    expect(s.projects.filter((p) => p.status === "laeuft")).toHaveLength(1);
    expect(tick(s, data, [{ type: "resumeProject", projectId: 1, people: [1] }]).projects[0]!.status).toBe("pausiert");
  });
});

describe("Abbrechen und Archiv (PRD-R42 bis PRD-R44)", () => {
  it("PRD-R42 Abbrechen beendet das Projekt, gibt die Personen frei und archiviert es", () => {
    const data = testData();
    let s = run(tick(neutralGame(data), data, [input()]), data, 6);
    s = tick(s, data, [{ type: "cancelProject", projectId: 1 }]);
    expect(s.projects[0]!.status).toBe("abgebrochen");
    expect(s.people.every((p) => p.assignment === null)).toBe(true);
    expect(s.archive).toHaveLength(1);
    expect(s.archive[0]!.reusableBp).toBeGreaterThan(0);
  });

  it("PRD-R43 PRD-T05 ein späteres Projekt desselben Genres mit gleichen Features spart bis zu 25 %", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input({ genre: "rollenspiel" })]);
    while (s.projects[0]!.status === "laeuft") s = tick(s, data);
    s = tick(s, data, [{ type: "cancelProject", projectId: 1 }]);
    const full = s.projects[0]!.effortTotalBp;
    s = tick(s, data, [input({ genre: "rollenspiel", title: "Zweiter Anlauf" })]);
    const second = s.projects[1]!;
    expect(second.archiveSavingBp).toBe(Math.trunc(full / 4));
    expect(second.effortTotalBp).toBe(full - second.archiveSavingBp);
    // Ein Archiv-Eintrag hilft nur einmal; ein anderes Genre spart nichts.
    s = tick(s, data, [{ type: "cancelProject", projectId: 2 }]);
    const other = tick(s, data, [input({ genre: "action", title: "Anderes Genre" })]);
    expect(other.projects[2]!.archiveSavingBp).toBe(0);
  });

  it("PRD-R44 die Abbruch-Prognose zeigt Restkosten und erwarteten Ertrag, nicht das Ausgegebene", () => {
    const data = testData();
    const s = run(tick(neutralGame(data), data, [input()]), data, 4);
    const v = buildView(s, data).active[0]!;
    expect(v.outlook).not.toBeNull();
    expect(v.outlook!.remainingCostCent).toBeLessThan(v.costCent + v.outlook!.remainingCostCent);
    expect(v.outlook!.remainingCostCent).toBe((v.remainingWeeks ?? 0) * Math.trunc((2 * 250000 * 12) / 52));
    expect(v.outlook!.expectedRevenueCent).toBeGreaterThan(0);
  });
});

describe("Umsteuern (PRD-R41)", () => {
  const steer = (over: Record<string, unknown> = {}) => ({
    type: "steerProject" as const, projectId: 1, genre: "action", scope: "klein" as const,
    features: ["grosseSprites", "levelVielfalt", "titelmelodie"], platforms: ["fuchs"], ...over,
  });

  it("PRD-R41 Feature tauschen: die erledigte Arbeit der behaltenen Features bleibt zu 100 % erhalten", () => {
    const data = testData();
    const s = run(tick(neutralGame(data), data, [input()]), data, 4);
    const p = s.projects[0]!;
    const share = Math.trunc((p.effortDoneBp * 10000) / p.effortTotalBp);
    const keep = ["grosseSprites", "levelVielfalt"];
    const o = steerOutcome(data, p, { genre: "action", scope: "klein", features: [...keep, "soundeffekte"], platforms: ["fuchs"] });
    const expected = keep.reduce((sum, f) => sum + Math.trunc((totalEffort(data, [f], "klein") * share) / 10000), 0);
    expect(o.effortDoneBp).toBe(expected);
    expect(o.effortTotalBp).toBe(totalEffort(data, [...keep, "soundeffekte"], "klein"));
  });

  it("PRD-R41 Genrewechsel behält 30 % der erledigten Arbeit", () => {
    const data = testData();
    const s = run(tick(neutralGame(data), data, [input()]), data, 4);
    const p = s.projects[0]!;
    const same = steerOutcome(data, p, { genre: "action", scope: "klein", features: p.features, platforms: ["fuchs"] });
    const other = steerOutcome(data, p, { genre: "strategie", scope: "klein", features: p.features, platforms: ["fuchs"] });
    expect(same.effortDoneBp).toBeLessThanOrEqual(p.effortDoneBp);
    expect(other.effortDoneBp).toBe(Math.trunc((same.effortDoneBp * 3000) / 10000));
  });

  it("PRD-R41 Umsteuern über die Eingabe: neuer Inhalt, weniger erledigt, Playtests verworfen; ohne Änderung abgewiesen", () => {
    const data = testData();
    let s = run(tick(neutralGame(data), data, [input()]), data, 6);
    const before = s.projects[0]!.effortDoneBp;
    const unchanged = tick(s, data, [steer()]);
    expect(unchanged.projects[0]!.effortDoneBp).toBeGreaterThan(before);
    s = tick(s, data, [steer({ genre: "strategie", features: ["grosseSprites", "levelVielfalt", "soundeffekte"] })]);
    const p = s.projects[0]!;
    expect(p.genre).toBe("strategie");
    expect(p.features).toContain("soundeffekte");
    expect(p.status).toBe("laeuft");
    expect(p.playtests).toEqual([]);
    expect(p.effortDoneBp).toBeLessThan(before);
    expect(p.effortDoneBp).toBeLessThan(p.effortTotalBp);
  });

  it("PRD-R41 Port und Addon lassen sich nicht umsteuern; Inhalt wird wie beim Anlegen geprüft", async () => {
    const { validateInput } = await import("../../src/sim/tick");
    const data = testData();
    const s = run(tick(neutralGame(data), data, [input()]), data, 2);
    expect(validateInput(s, data, steer({ features: ["grosseSprites"] }))).toBe("error.featureCount");
    expect(validateInput(s, data, steer({ platforms: [] }))).toBe("error.noPlatform");
    s.projects[0]!.type = "port";
    expect(validateInput(s, data, steer({ genre: "strategie" }))).toBe("error.steerType");
  });
});

describe("Migration (TEC-R41)", () => {
  it("TEC-R41 TEC-T06 ein Spielstand der Schema-Version 2 durchläuft alle Migrationen (mindestens zwei) und läuft 52 Wochen weiter", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    const v2 = JSON.parse(JSON.stringify(s));
    v2.schemaVersion = 2;
    delete v2.archive;
    delete v2.finance;
    delete v2.gameOver;
    delete v2.settings.preset;
    delete v2.settings.decisionDensity;
    delete v2.settings.ironman;
    delete v2.eventQueue;
    for (const p of v2.projects) {
      delete p.resumeWeeksLeft;
      delete p.archiveSavingBp;
    }
    const before = JSON.stringify(v2);
    const migrated = migrateState(v2);
    expect(JSON.stringify(v2)).toBe(before);
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(SCHEMA_VERSION - 2).toBeGreaterThanOrEqual(2);
    expect(migrated.archive).toEqual([]);
    expect(migrated.settings.preset).toBe("normal");
    expect(migrated.finance.insolvencyMonths).toBe(0);
    expect(migrated.finance.lossCarry).toEqual([]);
    expect(migrated.settings.ironman).toBe(false);
    expect(migrated.eventQueue).toEqual([]);
    expect(migrated.projects[0]!.resumeWeeksLeft).toBe(0);
    expect(run(migrated, data, 52).week).toBe(s.week + 52);
  });
});
