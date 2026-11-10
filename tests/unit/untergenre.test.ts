import { describe, expect, it } from "vitest";
import { expectedProfileFor, themeFitFor } from "../../src/sim/systems/produkte/quality";
import { aiSubgenre } from "../../src/sim/systems/ki/projekte";
import { migrateState } from "../../src/sim/save";
import { tick, validateInput } from "../../src/sim/tick";
import { AREAS } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, testData } from "../helpers";

// ANNAHME (Inhaltsausbau, OFFENE-FRAGEN): Untergenres verschieben das Erwartungsprofil und geben drei Themen +10 %.
describe("Untergenres", () => {
  it("Daten: drei Untergenres je Genre, Verschiebung summiert sich auf 0", () => {
    const data = testData();
    for (const g of data.genres) expect(data.subgenres.filter((sg) => sg.genre === g.id)).toHaveLength(3);
    for (const sg of data.subgenres) expect(Object.values(sg.profileShiftBp).reduce((a, b) => a + (b ?? 0), 0)).toBe(0);
  });

  it("Erwartungsprofil: Genre plus Verschiebung, Summe 10.000 bp, ohne Untergenre unverändert", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(expectedProfileFor(s, data, "action", null)).toEqual(s.world.expectedProfile["action"]);
    const p = expectedProfileFor(s, data, "action", "shootemup");
    expect(p).toEqual({ gameplay: 5000, grafik: 3000, sound: 1500, story: 500, technik: 0 });
    // Bereiche fallen nicht unter 0, danach wird neu normiert.
    data.subgenres.find((sg) => sg.id === "shootemup")!.profileShiftBp = { technik: -3000, gameplay: 3000 };
    const q = expectedProfileFor(s, data, "action", "shootemup");
    expect(q.technik).toBe(0);
    expect(AREAS.reduce((sum, a) => sum + q[a], 0)).toBe(10000);
  });

  it("Themenbonus: +10 % auf die Passung, in den Grenzen der Passung", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(themeFitFor(s, data, "action", "shootemup", "scifi")).toBe(11000);
    expect(themeFitFor(s, data, "action", "shootemup", "krimi")).toBe(10000);
    s.world.themeFit["action"]!["scifi"] = data.quality.themeFitMaxBp;
    expect(themeFitFor(s, data, "action", "shootemup", "scifi")).toBe(data.quality.themeFitMaxBp);
  });

  it("Prüfung: fremdes Genre und zu frühes Jahr werden abgelehnt, gültiges Untergenre landet im Projekt", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(validateInput(s, data, input({ subgenre: "textadventure" }))).toBe("error.unknownSubgenre");
    expect(validateInput(s, data, input({ subgenre: "gibtsnicht" }))).toBe("error.unknownSubgenre");
    expect(validateInput(s, data, input({ subgenre: "stealth" }))).toBe("error.tooEarly");
    const next = tick(s, data, [input({ subgenre: "shootemup" })]);
    expect(lastProject(next).subgenre).toBe("shootemup");
  });

  it("KI: nimmt das freigeschaltete Untergenre mit Bonus für das Thema, sonst keins", () => {
    const data = testData();
    expect(aiSubgenre(data, "action", "scifi", 1980)).toBe("shootemup");
    expect(aiSubgenre(data, "action", "spionage", 1980)).toBeNull();
    expect(aiSubgenre(data, "action", "spionage", 1998)).toBe("stealth");
  });

  it("Migration 24 → 25: bestehende Projekte bekommen kein Untergenre", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    const old = structuredClone(s) as unknown as Record<string, unknown> & { schemaVersion: number };
    old.schemaVersion = 24;
    for (const p of old.projects as Record<string, unknown>[]) delete p.subgenre;
    const migrated = migrateState(old);
    expect(migrated.schemaVersion).toBeGreaterThanOrEqual(25);
    expect(migrated.projects[0]!.subgenre).toBeNull();
  });
});
