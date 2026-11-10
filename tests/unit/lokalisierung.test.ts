// Etappe 6c.8: Lokalisierung (data/base/market/localization.json).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { migrateState } from "../../src/sim/save";
import { weeklyDemand } from "../../src/sim/systems/markt";
import { languageCost, localizationFactor } from "../../src/sim/systems/produkte/lokalisierung";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

describe("Lokalisierung (Etappe 6c.8)", () => {
  it("Nur Heimatsprache verkauft wie bisher, jede Übersetzung hebt die Nachfrage", () => {
    const data = testData();
    expect(localizationFactor(data, [], 1980)).toBe(10000);
    const de = localizationFactor(data, ["de"], 1980);
    const all = localizationFactor(data, ["de", "fr", "jp"], 1980);
    expect(de).toBeGreaterThan(10000);
    expect(all).toBeGreaterThan(de);
    // Chinesisch gibt es erst ab 2000; davor wirkt es nicht.
    expect(localizationFactor(data, ["zh"], 1990)).toBe(10000);
    expect(localizationFactor(data, ["zh"], 2020)).toBeGreaterThan(localizationFactor(data, ["de"], 2020));
    const s = neutralGame(data);
    const base = { platforms: ["fuchs"], genre: "action", theme: "scifi", scope: "klein" as const };
    expect(weeklyDemand(s, data, { ...base, languages: ["de"] }, 70000, 0, s.week)).toBeGreaterThan(weeklyDemand(s, data, base, 70000, 0, s.week));
  });

  it("Nur verfügbare Sprachen, keine bei Auftragsspielen; Kosten nach Umfang und Textmenge", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    const id = lastProject(s).id;
    expect(validateInput(s, data, { type: "setLanguages", projectId: id, languages: ["de", "fr"] })).toBeNull();
    expect(validateInput(s, data, { type: "setLanguages", projectId: id, languages: ["zh"] })).toBe("error.unknownLanguage");
    expect(validateInput(s, data, { type: "setLanguages", projectId: id, languages: ["de", "de"] })).toBe("error.unknownLanguage");
    const plain = languageCost(data, { scope: "klein", features: ["grosseSprites", "titelmelodie"] }, 1980);
    const texty = languageCost(data, { scope: "klein", features: ["grosseSprites", "levelVielfalt"] }, 1980);
    expect(plain).toBe(300000);
    expect(texty).toBe(375000);
    expect(languageCost(data, { scope: "mittel", features: [] }, 1980)).toBeGreaterThan(plain);
  });

  it("Übersetzungen werden beim Release bezahlt", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input()]);
    const id = lastProject(s).id;
    s = tick(s, data, [{ type: "setLanguages", projectId: id, languages: ["de"] }]);
    expect(lastProject(s).languages).toEqual(["de"]);
    const withLoc = playProject(neutralGame(data), data, input());
    const before = withLoc.finance.ledger.reduce((a, m) => a + m.costs.production, 0);
    let s2 = tick(neutralGame(data), data, [input()]);
    s2 = tick(s2, data, [{ type: "setLanguages", projectId: lastProject(s2).id, languages: ["de"] }]);
    const id2 = lastProject(s2).id;
    while (s2.projects.find((p) => p.id === id2)!.status === "laeuft") s2 = tick(s2, data);
    for (let i = 0; i < 3; i++) s2 = tick(s2, data);
    s2 = tick(s2, data, [{ type: "release", projectId: id2 }]);
    const after = s2.finance.ledger.reduce((a, m) => a + m.costs.production, 0);
    expect(after - before).toBe(375000);
  });

  it("TEC-R44 Migration 61 → 62: bisher nur Heimatsprache", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    const old = JSON.parse(JSON.stringify({ ...s, schemaVersion: 61 })) as { projects: Record<string, unknown>[] };
    for (const p of old.projects) delete p.languages;
    expect(migrateState(old as never).projects[0]!.languages).toEqual([]);
  });
});
