// Teilschritt 6a.7: Zukunftsepoche (MRK-R57, MRK-R58, MRK-R68, ZIE-R07).
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import { migrateState } from "../../src/sim/save";
import { applyEffects } from "../../src/sim/systems/katalog";
import { betHits, futureStep, generateFuture, massMarketChance, rumorWindow, validateFutureBet } from "../../src/sim/systems/zukunft";
import { reachableBase } from "../../src/sim/systems/markt";
import { goalStep } from "../../src/sim/systems/ziele";
import type { GameData, GameEvent, GameState } from "../../src/sim/model/types";
import { input, neutralGame, SEED_A, SEED_B, testData } from "../helpers";

const SEEDS = [SEED_A, SEED_B, "1111111111111111", "abcdefabcdef0123", "0000000000000042", "fedcba9876543210"];

function at2022(data: GameData, seed = SEED_A): GameState {
  const s = neutralGame(data, seed);
  s.week = (2022 - s.startYear) * 52;
  return s;
}

function ev(): GameEvent {
  return { id: 900, kind: "katalog", scope: "welt", projectId: null, createdWeek: 0, deadlineWeek: 4, options: [], defaultOption: "" };
}

describe("Wendepunkte (MRK-R57, MRK-R68)", () => {
  it("MRK-T12: je Seed 4–6 Wendepunkte bis 2040, davon mindestens zwei Zukunfts-Ketten", () => {
    const data = testData();
    for (const seed of SEEDS) {
      const s = at2022(data, seed);
      generateFuture(s, data);
      const real = s.future.points.filter((p) => !p.falseAlarm);
      expect(real.length).toBeGreaterThanOrEqual(4);
      expect(real.length).toBeLessThanOrEqual(6);
      const chains = real.filter((p) => data.future.points.find((d) => d.id === p.defId)!.chain);
      expect(chains.length).toBeGreaterThanOrEqual(2);
      for (const p of real) {
        const y = s.startYear + Math.floor(p.week / 52);
        expect(y).toBeGreaterThanOrEqual(2025);
        expect(y).toBeLessThanOrEqual(2040);
      }
      expect(new Set(s.future.points.map((p) => p.defId)).size).toBe(s.future.points.length);
    }
  });

  it("MRK-T17: das Gerücht erscheint 24–36 Monate vorher; der wahre Termin liegt im angezeigten Zeitraum", () => {
    const data = testData();
    for (const seed of SEEDS) {
      const s = at2022(data, seed);
      generateFuture(s, data);
      for (const p of s.future.points) {
        if (p.rumorWeek === s.week) continue;
        expect(p.week - p.rumorWeek).toBeGreaterThanOrEqual(104);
        expect(p.week - p.rumorWeek).toBeLessThanOrEqual(156);
        for (const level of ["keine", "grundlegend", "intensiv"] as const) {
          s.operations.analytics = level;
          const w = rumorWindow(s, data, p);
          expect(w.from).toBeLessThanOrEqual(p.week);
          expect(w.to).toBeGreaterThanOrEqual(p.week);
        }
      }
    }
  });

  it("MRK-R68: Analytics macht den Zeitraum schmaler", () => {
    const data = testData();
    const s = at2022(data);
    generateFuture(s, data);
    const p = s.future.points[0]!;
    const width = (level: "keine" | "grundlegend" | "intensiv") => {
      s.operations.analytics = level;
      const w = rumorWindow(s, data, p);
      return w.to - w.from;
    };
    expect(width("keine")).toBeGreaterThan(width("grundlegend"));
    expect(width("grundlegend")).toBeGreaterThan(width("intensiv"));
  });

  it("MRK-T17: ein Pin mit Abstand unter 12 Monaten ist ein Treffer", () => {
    const data = testData();
    expect(betHits(data, 1000, 1051)).toBe(true);
    expect(betHits(data, 1000, 949)).toBe(true);
    expect(betHits(data, 1000, 1052)).toBe(false);
  });

  it("MRK-R57: die Wendepunkte entstehen drei Jahre vor 2025, nicht früher; Gerücht und Eintritt laufen im Wochenschritt", () => {
    const data = testData();
    const s = neutralGame(data);
    s.week = (2021 - s.startYear) * 52;
    futureStep(s, data);
    expect(s.future.generated).toBe(false);
    s.week = (2022 - s.startYear) * 52;
    futureStep(s, data);
    expect(s.future.generated).toBe(true);
    const p = s.future.points[0]!;
    s.week = p.rumorWeek;
    futureStep(s, data);
    expect(p.status).toBe("geruecht");
    s.week = p.week;
    futureStep(s, data);
    expect(p.status).toBe(p.falseAlarm ? "geplatzt" : "eingetreten");
  });

  it("MRK-R57: ein Ketten-Wendepunkt startet seine Zukunfts-Kette; ein Markt-Wendepunkt setzt die Phase", () => {
    const data = testData();
    const s = at2022(data);
    s.future.generated = true;
    s.future.points = [
      { id: 1, defId: "regulierungswelle", week: s.week, rumorWeek: s.week, falseAlarm: false, offsetBp: 0, status: "geruecht" },
      { id: 2, defId: "konsolidierung", week: s.week, rumorWeek: s.week, falseAlarm: false, offsetBp: 0, status: "geruecht" },
    ];
    futureStep(s, data);
    expect(s.chains.map((c) => c.defId)).toEqual(["regulierungswelle"]);
    expect(s.market.phase).toBe("krise");
  });

  it("MRK-R57: eine Plattform-Wende hebt die erreichbare Basis der neuen Plattformart oder senkt sie", () => {
    const data = testData();
    const s = at2022(data);
    const before = reachableBase(data, ["brille"], 2030, undefined, s);
    s.future.generated = true;
    s.future.points = [{ id: 1, defId: "vr", week: s.week, rumorWeek: s.week, falseAlarm: false, offsetBp: 0, status: "geruecht" }];
    futureStep(s, data);
    const p = s.future.points[0]!;
    const after = reachableBase(data, ["brille"], 2030, undefined, s);
    if (p.hit) expect(after).toBeGreaterThan(before);
    else expect(after).toBeLessThan(before);
  });

  it("MRK-R58: wer zusammen über 20 % in die Plattformart investiert, hebt die Chance um bis zu 30 %", () => {
    const data = testData();
    const s = at2022(data);
    const def = data.future.points.find((d) => d.id === "vr")!;
    s.ai.products = [];
    expect(massMarketChance(s, data, def)).toBe(def.chanceBp);
    const product = (platforms: string[], i: number) => ({ id: i, platforms, releaseWeek: s.week - 1 }) as unknown as GameState["ai"]["products"][number];
    s.ai.products = [product(["brille"], 1), product(["fuchs"], 2), product(["fuchs"], 3), product(["fuchs"], 4)];
    expect(massMarketChance(s, data, def)).toBe(6500);
  });
});

describe("Wette auf die Zukunft (MRK-R58)", () => {
  function rumor(data: GameData, defId = "vr") {
    const s = at2022(data);
    s.moneyCent = 100_000_000;
    s.future.generated = true;
    const week = s.week + 120;
    s.future.points = [{ id: 1, defId, week, rumorWeek: s.week, falseAlarm: false, offsetBp: 0, status: "geruecht" }];
    return { s, week };
  }

  it("ein Treffer bringt Plattform-Erfahrung 30 und Welle-1-Devkits", () => {
    const data = testData();
    const { s, week } = rumor(data);
    s.makers.schedules["brille"] = { announceWeek: week, wave1Week: week, wave2Week: week, launchWeek: week + 50, clockCutWeek: null, clockCut: false, devkit: 0, launchRequest: "keine", launchChecked: false };
    const inp = { type: "futureBet" as const, pointId: 1, pinWeek: week - 20, stakeBp: 1000 };
    expect(validateFutureBet(s, data, inp)).toBeNull();
    const next = tick(s, data, [inp]);
    expect(next.moneyCent).toBeLessThan(s.moneyCent - 9_000_000);
    expect(validateFutureBet(next, data, inp)).toBe("error.futureAlreadyBet");
    next.week = week;
    futureStep(next, data);
    expect(next.future.bets[0]!.result).toBe("treffer");
    expect(next.platformExperience["brille"]).toBe(3000);
    expect(next.makers.schedules["brille"]!.devkit).toBe(1);
  });

  it("ein Pin über 12 Monate daneben verliert; Einsatz höchstens 20 %", () => {
    const data = testData();
    const { s, week } = rumor(data, "indieBoom");
    expect(validateFutureBet(s, data, { type: "futureBet", pointId: 1, pinWeek: week, stakeBp: 2500 })).toBe("error.amount");
    const next = tick(s, data, [{ type: "futureBet", pointId: 1, pinWeek: week + 60, stakeBp: 2000 }]);
    const money = next.moneyCent;
    next.week = week;
    futureStep(next, data);
    expect(next.future.bets[0]!.result).toBe("daneben");
    expect(next.moneyCent).toBe(money);
  });

  it("ANNAHME: ein Treffer ohne Plattform zahlt den doppelten Einsatz", () => {
    const data = testData();
    const { s, week } = rumor(data, "indieBoom");
    const next = tick(s, data, [{ type: "futureBet", pointId: 1, pinWeek: week, stakeBp: 1000 }]);
    const stake = next.future.bets[0]!.stakeCent;
    const money = next.moneyCent;
    next.week = week;
    futureStep(next, data);
    expect(next.moneyCent).toBe(money + 2 * stake);
  });
});

describe("Zukunfts-Ketten und Ziele (MRK-R57, ZIE-R07)", () => {
  it("die neuen Wirkungen: Werkzeug-Tempo, Plattform-Erfahrung, Härte, Nachfrage aller Produkte", () => {
    const data = testData();
    const s = at2022(data);
    applyEffects(s, data, ev(), [{ type: "werkzeugTempo", bp: 3000 }, { type: "plattformErfahrung", platform: "wolke", bp: 2000 }]);
    expect(s.future.toolSpeedBp).toBe(3000);
    expect(s.platformExperience["wolke"]).toBe(2000);
  });

  it("KI-Werkzeuge machen die Arbeit schneller", () => {
    const data = testData();
    const a = neutralGame(data);
    const b = structuredClone(a);
    b.future.toolSpeedBp = 3000;
    const inp = input();
    const ta = tick(tick(a, data, [inp]), data);
    const tb = tick(tick(b, data, [inp]), data);
    expect(tb.projects[0]!.effortDoneBp).toBeGreaterThan(ta.projects[0]!.effortDoneBp);
  });

  it("ZIE-R07: Ziele der Zukunftsepoche gelten erst ab 2025", () => {
    const data = testData();
    const s = at2022(data);
    s.chronicle.push({ week: s.week, key: "chronicle.info", params: { id: "filmErfolg" } });
    s.week = (2024 - s.startYear) * 52;
    goalStep(s, data);
    expect(s.milestones["filmFranchise"]).toBeUndefined();
    s.week = (2025 - s.startYear) * 52;
    s.chronicle.push({ week: s.week, key: "chronicle.info", params: { id: "filmErfolg" } });
    goalStep(s, data);
    expect(s.milestones["filmFranchise"]).toBe(s.week);
  });

  it("Spielstand 50 → 51: Zukunft noch nicht gezogen", () => {
    const data = testData();
    const old = structuredClone(neutralGame(data)) as unknown as Record<string, unknown>;
    old.schemaVersion = 50;
    delete old.future;
    const m = migrateState(old as never);
    expect(m.future).toEqual({ generated: false, points: [], bets: [], nextPointId: 1, toolSpeedBp: 0, platformBp: {} });
  });
});
