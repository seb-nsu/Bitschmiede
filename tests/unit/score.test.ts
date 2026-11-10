import { describe, expect, it } from "vitest";
import { computeScore, effectiveQNorm, scoreFromQ, zeitgeist } from "../../src/sim/systems/produkte/score";
import { computeQuality } from "../../src/sim/systems/produkte/quality";
import { marketQNorm, updateQNorm } from "../../src/sim/systems/produkte/release";
import { SCORE_FACTORS } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, SEED_A, SEED_B, testData } from "../helpers";

describe("Pressewertung", () => {
  it("PRD-R51 Q = Q_erw ergibt 5,5; mehr Q mehr Wertung; Grenzen 1 bis 10", () => {
    const data = testData();
    expect(scoreFromQ(data, 600000, 600000)).toBe(55000);
    expect(scoreFromQ(data, 900000, 600000)).toBeGreaterThan(70000);
    expect(scoreFromQ(data, 300000, 600000)).toBeLessThan(40000);
  });

  it("PRD-R51 ein mittleres Spiel braucht für dieselbe Wertung mehr Q als ein kleines", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(effectiveQNorm(data, s, "mittel")).toBeGreaterThan(effectiveQNorm(data, s, "klein"));
  });

  it("TEC-R07 Ausgangswert plus alle Balken ergibt genau die Wertung", () => {
    const data = testData();
    const s = playProject(neutralGame(data, SEED_A, { pressRandom: "normal" }), data, input());
    const r = lastProject(s).result!;
    expect(r.baseBp + r.bars.reduce((sum, b) => sum + b.value, 0)).toBe(r.scoreBp);
  });

  it("UI-R104 der Wasserfall hat immer die Balken Zeitgeist und Tagesform der Presse, auch wenn sie null sind", () => {
    const data = testData();
    const r = lastProject(playProject(neutralGame(data), data, input())).result!;
    expect(r.bars.map((b) => b.factor)).toEqual([...SCORE_FACTORS]);
    expect(r.bars.find((b) => b.factor === "zeitgeist")!.value).toBe(0);
    expect(r.bars.find((b) => b.factor === "tagesform")!.value).toBe(0);
  });

  it("PRD-R54 PRD-T11 Trend 1,4 und 0,7: gleiches Q, Zeitgeist +0,3 bzw. −0,3, Verkäufe nach Trend", () => {
    const data = testData();
    const hot = neutralGame(data);
    const cold = neutralGame(data);
    hot.trends.genre.action = 14000;
    cold.trends.genre.action = 7000;
    const a = lastProject(playProject(hot, data, input())).result!;
    const b = lastProject(playProject(cold, data, input())).result!;
    expect(a.quality.q).toBe(b.quality.q);
    expect(a.bars.find((x) => x.factor === "zeitgeist")!.value).toBe(3000);
    expect(b.bars.find((x) => x.factor === "zeitgeist")!.value).toBe(-3000);
    expect(zeitgeist(data, 14000)).toBe(3000);
    // Verkäufe: Platzhalter · Trend, bei gleicher Wertung also Verhältnis 2 : 1 (bis auf Wertungsunterschied ±0,3).
    expect(a.units).toBeGreaterThan(b.units * 2);
  });

  it("PRD-R55 PRD-T12 Presse-Zufall aus: zwei Seeds, gleiche Wertung, Tagesform 0", () => {
    const data = testData();
    const a = lastProject(playProject(neutralGame(data, SEED_A), data, input())).result!;
    const b = lastProject(playProject(neutralGame(data, SEED_B), data, input())).result!;
    expect(a.scoreBp).toBe(b.scoreBp);
    expect(a.bars.find((x) => x.factor === "tagesform")!.value).toBe(0);
  });

  it("PRD-R55 Presse-Zufall normal streut mit σ 0,3 aus der Tabelle", () => {
    const data = testData();
    const values = new Set<number>();
    for (const seed of ["0000000000000001", "0000000000000002", "0000000000000003", "0000000000000004"]) {
      const r = lastProject(playProject(neutralGame(data, seed, { pressRandom: "normal" }), data, input())).result!;
      const mood = r.bars.find((x) => x.factor === "tagesform")!.value;
      expect(Math.abs(mood)).toBeLessThanOrEqual(11005);
      values.add(mood);
    }
    expect(values.size).toBeGreaterThan(1);
  });

  it("PRD-R57 Presse-Strenge verschiebt Q_erw um 8 % je Stufe", () => {
    const data = testData();
    const s0 = neutralGame(data);
    const s1 = neutralGame(data, SEED_A, { pressStrictness: 1 });
    const sm = neutralGame(data, SEED_A, { pressStrictness: -1 });
    expect(effectiveQNorm(data, s1, "klein")).toBe(Math.trunc((s0.qNorm.klein * 10800) / 10000));
    expect(effectiveQNorm(data, sm, "klein")).toBe(Math.trunc((s0.qNorm.klein * 9200) / 10000));
    const qb = computeQuality(data, s0, { ...input(), bugsBp: 0, people: s0.people, engineLevels: data.engine.starter });
    const easy = computeScore(data, qb, effectiveQNorm(data, s0, "klein"), 10000, 0).scoreBp;
    const hard = computeScore(data, qb, effectiveQNorm(data, s1, "klein"), 10000, 0).scoreBp;
    expect(hard).toBeLessThan(easy);
  });
});

describe("Q_erw", () => {
  it("PRD-R56 Startwerte 1980 aus den Daten", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(s.qNorm).toEqual(data.quality.qNormStartBp);
  });

  it("PRD-R56 unter fünf Releases im Vorjahr gilt Vorjahreswert · 1,03", () => {
    const data = testData();
    const s = neutralGame(data);
    s.week = 52;
    s.releases = [{ year: 1980, scope: "klein", q: 999999 }];
    updateQNorm(s, data);
    expect(s.qNorm.klein).toBe(Math.trunc((data.quality.qNormStartBp.klein * 10300) / 10000));
  });

  it("PRD-R56 ANNAHME ohne fremde Releases gilt mindestens die Marktreferenz aus Katalog, Branchenstärke und Branchen-E", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(marketQNorm(data, s, "klein", 1980)).toBe(data.quality.qNormStartBp.klein);
    // 1990: bessere Karten und Branchenstärke 70 statt 50 heben die Erwartung deutlich über 1,03 je Jahr,
    // der typische Engine-Faktor der Branche (0,8) senkt sie etwas.
    const ref = marketQNorm(data, s, "klein", 1990);
    expect(ref).toBeGreaterThan(Math.trunc((data.quality.qNormStartBp.klein * 12000) / 10000));
    s.week = 52 * 11;
    updateQNorm(s, data);
    expect(s.qNorm.klein).toBe(Math.max(Math.trunc((data.quality.qNormStartBp.klein * 10300) / 10000), ref));
    data.quality.marketEngineAnchors = [[1980, 10000]];
    expect(marketQNorm(data, s, "klein", 1990)).toBeGreaterThan(Math.trunc((ref * 12400) / 10000));
  });

  it("PRD-R56 ab fünf Releases gilt der Median des Vorjahres", () => {
    const data = testData();
    const s = neutralGame(data);
    s.week = 52;
    s.releases = [500000, 700000, 600000, 900000, 800000].map((q) => ({ year: 1980, scope: "klein" as const, q }));
    s.releases.push({ year: 1979, scope: "klein", q: 1 });
    updateQNorm(s, data);
    expect(s.qNorm.klein).toBe(700000);
  });
});
