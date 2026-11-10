// Etappe 5.16: Meilenstein „MMO zehn Jahre“ (ZIE-R02) und Szenario „Live-Service-Rettung“ (ZIE-R13, ZIE-R15).
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import { newGame } from "../../src/sim/game";
import { scenarioStep } from "../../src/sim/systems/szenarien";
import { goalStep } from "../../src/sim/systems/ziele";
import { initLive } from "../../src/sim/systems/live";
import { dateOf } from "../../src/sim/calendar";
import type { GameData, GameState } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, SEED_A, testData } from "../helpers";

function rescue(data: GameData): GameState {
  return newGame(data, SEED_A, { preset: "normal", pressRandom: "aus", decisionDensity: "normal", founderFocus: "gameplay", scenario: "liveServiceRettung", longTermGoal: "unabhaengig" });
}

describe("Live-Service-Rettung (ZIE-R13 bis ZIE-R15)", () => {
  it("ZIE-R14: Start 2018 mit einem laufenden MMO, hohem Churn-Risiko und fester Kasse", () => {
    const data = testData();
    const s = rescue(data);
    expect(dateOf(s.startYear, s.week).year).toBe(2018);
    const p = s.projects.find((x) => x.id === s.scenario!.liveProductId)!;
    expect(p.status).toBe("veroeffentlicht");
    expect(p.ops!.live!.kind).toBe("mmo");
    expect(p.ops!.live!.base).toBe(40000);
    expect(p.ops!.satisfactionBp).toBe(4500);
    expect(s.scenario).toMatchObject({ id: "liveServiceRettung", status: "laeuft", startPlayers: 40000 });
    expect(s.moneyCent).toBe(800000000);
  });

  it("ZIE-R15: verdoppelte Spielerbasis gewinnt, +50 % noch nicht, Einstellen verliert", () => {
    const data = testData();
    const won = rescue(data);
    const live = won.projects.find((x) => x.id === won.scenario!.liveProductId)!.ops!.live!;
    live.base = 60000;
    scenarioStep(won, data);
    expect(won.scenario!.status).toBe("laeuft");
    live.base = 80000;
    scenarioStep(won, data);
    expect(won.scenario!.status).toBe("gewonnen");
    const lost = rescue(data);
    lost.projects.find((x) => x.id === lost.scenario!.liveProductId)!.ops!.live!.shutdownWeek = lost.week;
    scenarioStep(lost, data);
    expect(lost.scenario!.status).toBe("verloren");
  });

  it("ohne Eingriff reicht der Ausläufer der Verkäufe nicht: nach zwei Jahren ist das Szenario verloren", () => {
    const data = testData();
    let s = rescue(data);
    for (let i = 0; i < 104 && s.scenario!.status === "laeuft"; i++) s = tick(s, data);
    expect(s.scenario!.status).toBe("verloren");
  });

  it("BTR-R15: mit einer Kampagne von 100.000 USD je Monat verdoppelt sich die Spielerbasis in zwei Jahren", () => {
    const data = testData();
    let s = rescue(data);
    const id = s.scenario!.liveProductId!;
    s = tick(s, data, [{ type: "setLive", projectId: id, campaignCent: 10_000_000 }]);
    for (let i = 0; i < 103 && s.scenario!.status === "laeuft"; i++) s = tick(s, data);
    expect(s.scenario!.status).toBe("gewonnen");
  });
});

describe("Meilenstein MMO zehn Jahre (ZIE-R02)", () => {
  it("ein laufendes MMO nach 520 Wochen erreicht den Meilenstein, ein eingestelltes nicht", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const p = lastProject(s);
    p.type = "mmo";
    p.ops!.live = initLive(s, data, p)!;
    s.week = p.result!.week + 519;
    goalStep(s, data);
    expect(s.milestones["mmoZehnJahre"]).toBeUndefined();
    s.week += 1;
    p.ops!.live.shutdownWeek = s.week;
    goalStep(s, data);
    expect(s.milestones["mmoZehnJahre"]).toBeUndefined();
    p.ops!.live.shutdownWeek = null;
    goalStep(s, data);
    expect(s.milestones["mmoZehnJahre"]).toBeDefined();
  });
});
