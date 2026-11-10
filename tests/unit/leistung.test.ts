import { describe, expect, it } from "vitest";
import { experienceSaving, featureCost, platformAllows, platformBudget, platformVersions } from "../../src/sim/systems/leistung";
import { reachableBase } from "../../src/sim/systems/markt";
import { tick } from "../../src/sim/tick";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

const pf = (data: ReturnType<typeof testData>, id: string) => data.platforms.find((p) => p.id === id)!;

describe("Leistungsbudget je Plattform", () => {
  it("MRK-R02 Konsolen haben ein festes Budget, der PC wächst mit dem Jahr", () => {
    const data = testData();
    expect(platformBudget(data, pf(data, "nova"), 1986)).toBe(platformBudget(data, pf(data, "nova"), 1994));
    expect(platformBudget(data, pf(data, "standardpc"), 1995)).toBeGreaterThan(platformBudget(data, pf(data, "standardpc"), 1985));
  });

  it("PRD-R11 Die Lead-Plattform erlaubt nur Modulstufen bis zum Stand ihres Erscheinens", () => {
    const data = testData();
    // Fuchs (1978) kann kein 8-Bit-Audio, der Kobold (1982) schon.
    expect(platformAllows(data, pf(data, "fuchs"), "mehrstimmigeMusik", 1984)).toBe(false);
    expect(platformAllows(data, pf(data, "kobold"), "mehrstimmigeMusik", 1984)).toBe(true);
    const s0 = neutralGame(data);
    s0.week = 3 * 52;
    expect(tick(s0, data, [input({ features: ["grosseSprites", "levelVielfalt", "mehrstimmigeMusik"], platforms: ["fuchs"] })]).projects).toHaveLength(0);
  });

  it("PRD-R15 Die Summe der Leistungskosten darf das Budget der Lead-Plattform nicht überschreiten", () => {
    const data = testData();
    const s0 = neutralGame(data);
    const heavy = ["grosseSprites", "pseudo3d", "weichesScrolling", "farbgrafik", "standbilder"];
    expect(heavy.reduce((a, id) => a + data.features.find((f) => f.id === id)!.performanceCost, 0)).toBeGreaterThan(pf(data, "orbis").performance);
    expect(tick(s0, data, [input({ scope: "mittel", features: heavy, platforms: ["orbis"] })]).projects).toHaveLength(0);
    expect(tick(s0, data, [input({ scope: "mittel", features: ["grosseSprites", "levelVielfalt", "titelmelodie", "punktejagd", "dialoge"], platforms: ["orbis"] })]).projects).toHaveLength(1);
  });

  it("PRD-T17 Lead erlaubt die Karte, die weitere Plattform nicht: wählbar, die weitere Version verliert sie und warnt", () => {
    const data = testData();
    const s0 = neutralGame(data);
    s0.week = 4 * 52;
    s0.unlocks["engine"] = 0;
    const s1 = tick(s0, data, [{ type: "foundEngine", name: "Kern" }]);
    s1.engine!.modules.audio.level = 1;
    const s = tick(s1, data, [input({ features: ["grosseSprites", "levelVielfalt", "mehrstimmigeMusik"], platforms: ["kobold", "fuchs"] })]);
    const p = lastProject(s);
    expect(p.features).toContain("mehrstimmigeMusik");
    const v = platformVersions(data, s, p.features, p.platforms);
    expect(v[0]!.dropped).toEqual([]);
    expect(v[1]!.dropped).toEqual(["mehrstimmigeMusik"]);
    expect(v[1]!.weak).toBe(true);
    expect(p.versionShareBp.fuchs).toBeLessThan(7500);
  });

  it("PRD-R61 Eine weitere Plattform mit kleinerem Budget bekommt eine abgespeckte Version; sie verkauft anteilig", () => {
    const data = testData();
    const s0 = neutralGame(data);
    s0.week = 9 * 52;
    const feats = ["grosseSprites", "pseudo3d", "weichesScrolling", "levelVielfalt", "titelmelodie"];
    const v = platformVersions(data, s0, feats, ["vega", "pocket"]);
    expect(v[0]!.dropped).toEqual([]);
    expect(v[1]!.dropped.length).toBeGreaterThan(0);
    expect(v[1]!.used).toBeLessThanOrEqual(v[1]!.budget);
    const shares = { vega: v[0]!.shareBp, pocket: v[1]!.shareBp };
    expect(reachableBase(data, ["vega", "pocket"], 1989, shares)).toBeLessThan(reachableBase(data, ["vega", "pocket"], 1989));
  });

  it("MRK-R05 Erfahrung +8 je Release und Plattform senkt den Verbrauch, höchstens um 25 %", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    expect(s.platformExperience.fuchs).toBe(800);
    expect(experienceSaving(data, s, "fuchs")).toBe(200);
    expect(featureCost(data, s, "grosseSprites", "fuchs")).toBe(1300 - 26);
    s.platformExperience.fuchs = 10000;
    expect(featureCost(data, s, "grosseSprites", "fuchs")).toBe(975);
  });
});
