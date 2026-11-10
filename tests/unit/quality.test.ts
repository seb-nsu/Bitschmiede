import { describe, expect, it } from "vitest";
import { agedValue, areaProfile, computeQuality, profileFactor, scaledEffort, synergies } from "../../src/sim/systems/produkte/quality";
import { AREAS, type FeatureDef } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

function addFeature(data: ReturnType<typeof testData>, f: Partial<FeatureDef> & { id: string }): void {
  data.features.push({
    area: "gameplay", effort: { gameplay: 100000 }, baseValue: 500000, innovation: 0, stability: 0, fun: 0,
    tags: [], contentLevel: 0, availableFrom: 1980, requires: { module: "werkzeuge", level: 0 }, performanceCost: 0, ...f,
  });
}

describe("Bereichsprofil", () => {
  it("PRD-R13 Profil ist der Anteil des Aufwands je Bereich und summiert sich auf etwa 10.000 bp", () => {
    const data = testData();
    const p = areaProfile(data, ["grosseSprites", "levelVielfalt", "titelmelodie"], "klein");
    // grosseSprites 22 Grafik, levelVielfalt 24 Gameplay + 6 Grafik, titelmelodie 14 Sound = 66
    expect(p.gameplay).toBe(3636);
    expect(p.grafik).toBe(4242);
    expect(p.sound).toBe(2121);
    const sum = AREAS.reduce((s, a) => s + p[a], 0);
    expect(sum).toBeGreaterThan(9990);
    expect(sum).toBeLessThanOrEqual(10000);
  });

  it("PRD-R13 Profilfaktor = 1 − α · ½ Σ |ist − erwartet|", () => {
    const data = testData();
    const actual = { gameplay: 5000, grafik: 5000, sound: 0, story: 0, technik: 0 };
    const expected = { gameplay: 3000, grafik: 2000, sound: 1000, story: 3000, technik: 1000 };
    // ½ (2000 + 3000 + 1000 + 3000 + 1000) = 5000 → 1 − 0,8 · 0,5 = 0,6
    expect(profileFactor(data, actual, expected)).toEqual({ deviation: 5000, factor: 6000 });
  });
});

describe("Umfang", () => {
  it("PRD-R28 PRD-T16 ein Feature mit 10 Personenwochen kostet klein 4 und mittel 10", () => {
    const data = testData();
    addFeature(data, { id: "zehn", effort: { gameplay: 100000 } });
    const f = data.features.find((x) => x.id === "zehn")!;
    expect(scaledEffort(data, f, "klein").gameplay).toBe(40000);
    expect(scaledEffort(data, f, "mittel").gameplay).toBe(100000);
  });
});

describe("Alterung (PRD-R16)", () => {
  it("PRD-R16 ein Feature verliert pro Jahr nach seinem Nachfolger 15 %, höchstens bis 30 %", () => {
    const data = testData();
    addFeature(data, { id: "alt", baseValue: 500000, availableFrom: 1980, successor: "neu" });
    addFeature(data, { id: "neu", baseValue: 700000, availableFrom: 1985 });
    const alt = data.features.find((f) => f.id === "alt")!;
    expect(agedValue(data, alt, 1984)).toBe(500000);
    expect(agedValue(data, alt, 1985)).toBe(500000);
    expect(agedValue(data, alt, 1986)).toBe(425000);
    expect(agedValue(data, alt, 1989)).toBe(200000);
    expect(agedValue(data, alt, 1995)).toBe(150000);
  });
});

describe("Qualität", () => {
  it("PRD-R50 Q entsteht nach 5.1 und speichert seine Aufschlüsselung", () => {
    const data = testData();
    const s = neutralGame(data);
    const qb = computeQuality(data, s, { genre: "action", theme: "scifi", scope: "klein", features: ["grosseSprites", "levelVielfalt", "titelmelodie"], bugsBp: 0, people: s.people, engineLevels: data.engine.starter });
    expect(qb.contributions).toHaveLength(3);
    // Team 45 ohne Erfahrung: T_f = 0,45; Σ q_f T_f = (50 + 50 + 40) · 0,45 = 63; Synergie action+klang +5 %
    expect(qb.qTeam).toBe(661500);
    expect(qb.q).toBe(Math.trunc((Math.trunc((qb.qTeam * qb.profileFactorBp) / 10000) * 10000) / 10000));
    expect(qb.bugShareBp).toBe(0);
  });

  it("A26 Merkmale erzeugen Synergien und Konflikte", () => {
    const data = testData();
    expect(synergies(data, ["grosseSprites", "titelmelodie"]).total).toBe(500);
    expect(synergies(data, ["punktejagd", "dialoge"]).total).toBe(-1000);
  });

  it("PRD-T02 gleiche Spiele mit verschiedenen Teams bekommen messbar verschiedene Wertungen", () => {
    const data = testData();
    const weak = neutralGame(data);
    const strong = neutralGame(data);
    for (const p of strong.people) for (const a of AREAS) p.strength[a] = 70;
    const a = lastProject(playProject(weak, data, input())).result!;
    const b = lastProject(playProject(strong, data, input())).result!;
    expect(b.scoreBp - a.scoreBp).toBeGreaterThan(5000);
    const teamBar = (r: typeof a) => r.bars.find((x) => x.factor === "team")!.value;
    expect(teamBar(b)).toBeGreaterThan(teamBar(a));
  });

  it("PRD-T02 Erfahrung mit dem Genre verbessert das zweite Spiel (FRM-R05)", () => {
    const data = testData();
    let s = neutralGame(data);
    s = playProject(s, data, input());
    const first = lastProject(s).result!.quality;
    s = playProject(s, data, input());
    const second = lastProject(s).result!.quality;
    expect(s.people[0]!.experienceGenre.action).toBeGreaterThan(0);
    expect(second.qTeam).toBeGreaterThan(first.qTeam);
  });
});
