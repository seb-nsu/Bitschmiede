// Teilschritt 6a.8: Kampagnen für laufende Live-Produkte (BTR-R15, „Zugang aus Marketing“).
import { describe, expect, it } from "vitest";
import { newGame } from "../../src/sim/game";
import { migrateState } from "../../src/sim/save";
import { campaignEfficiency, campaignWeek, validateSetLive } from "../../src/sim/systems/live";
import type { GameData, GameState } from "../../src/sim/model/types";
import { SEED_A, testData } from "../helpers";

function rescue(data: GameData): GameState {
  return newGame(data, SEED_A, { preset: "normal", pressRandom: "aus", decisionDensity: "normal", founderFocus: "gameplay", scenario: "liveServiceRettung", longTermGoal: "unabhaengig" });
}

describe("Live-Kampagnen (BTR-R15)", () => {
  it("BTR-R15: eine Kampagne kostet wöchentlich ihren Monatsanteil als Marketing und bringt Spieler", () => {
    const data = testData();
    const s = rescue(data);
    const p = s.projects.find((x) => x.id === s.scenario!.liveProductId)!;
    const live = p.ops!.live!;
    live.campaignCent = 5_200_000;
    const money = s.moneyCent;
    const base = live.base;
    const joined = campaignWeek(s, data, p, live);
    expect(s.moneyCent).toBe(money - 1_200_000);
    expect(joined).toBeGreaterThan(0);
    expect(live.base).toBe(base + joined);
    expect(live.campaignJoined).toBe(joined);
  });

  it("BTR-R15: ohne Budget kein Zugang; die Wirkung steigt mit der Zufriedenheit und sinkt mit der Sättigung", () => {
    const data = testData();
    const s = rescue(data);
    const p = s.projects.find((x) => x.id === s.scenario!.liveProductId)!;
    const live = p.ops!.live!;
    expect(campaignWeek(s, data, p, live)).toBe(0);
    p.ops!.satisfactionBp = 4000;
    const low = campaignEfficiency(s, data, p, live);
    p.ops!.satisfactionBp = 8000;
    const high = campaignEfficiency(s, data, p, live);
    expect(high).toBeGreaterThan(low);
    live.base = 1_000_000_000;
    expect(campaignEfficiency(s, data, p, live)).toBeLessThan(high);
  });

  it("BTR-R15: das Budget hat eine Obergrenze je Jahr", () => {
    const data = testData();
    const s = rescue(data);
    const id = s.scenario!.liveProductId!;
    expect(validateSetLive(s, data, { type: "setLive", projectId: id, campaignCent: 10_000_000 })).toBeNull();
    expect(validateSetLive(s, data, { type: "setLive", projectId: id, campaignCent: 900_000_000 })).toBe("error.amount");
    expect(validateSetLive(s, data, { type: "setLive", projectId: id, campaignCent: -1 })).toBe("error.amount");
  });

  it("Spielstand 51 → 52: Live-Produkte ohne Kampagne", () => {
    const data = testData();
    const old = structuredClone(rescue(data)) as unknown as { schemaVersion: number; projects: { ops?: { live?: Record<string, unknown> } }[] };
    old.schemaVersion = 51;
    for (const p of old.projects) {
      delete p.ops?.live?.campaignCent;
      delete p.ops?.live?.campaignJoined;
    }
    const m = migrateState(old as never);
    const live = m.projects.find((p) => p.ops?.live)!.ops!.live!;
    expect(live.campaignCent).toBe(0);
    expect(live.campaignJoined).toBe(0);
  });
});
