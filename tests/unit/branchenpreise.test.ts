// Teilschritt 4.10: Branchenpreise (ZIE-R03 bis ZIE-R05, MKT-R39).
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import { awardStep, candidates, playerAwardFactor } from "../../src/sim/systems/branchenpreise";
import { nextFairWeek } from "../../src/sim/systems/messe";
import { completeEligible } from "../../src/sim/systems/verwertung";
import { migrateState } from "../../src/sim/save";
import { buildView } from "../../src/sim/view/view";
import type { AiProduct, GameData, GameState, Project } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

function released(data: GameData): { s: GameState; p: Project } {
  const s = playProject(neutralGame(data), data, input());
  s.week = nextFairWeek(s, data);
  const p = lastProject(s);
  p.result!.week = s.week - 10;
  return { s, p };
}

function aiGame(s: GameState, id: number, studioId: number, scoreBp: number, innovationBp = 0): void {
  s.ai.products.push({
    id, studioId, genre: "action", theme: "fantasy", scope: "klein", platforms: [], scoreBp, releaseWeek: s.week - 5, competitionBp: 10000,
    sold: 0, revenueCent: 0, engineId: null, contractId: null, demandBp: 10000, duelWith: null, brandId: null, brandLicenseId: null,
    fanUnitsPerWeek: 0, innovationBp,
  } as AiProduct);
}

describe("Branchenpreise (ZIE-R03 bis ZIE-R05)", () => {
  it("ZIE-R04 Spiel: die fünf Besten des letzten Jahres nach Wertung sind nominiert", () => {
    const data = testData();
    const { s, p } = released(data);
    p.result!.scoreBp = 75000;
    for (let i = 0; i < 6; i++) aiGame(s, 100 + i, 1, 70000 + i * 2000);
    aiGame(s, 200, 2, 99000);
    s.ai.products.find((x) => x.id === 200)!.releaseWeek = s.week - 60;
    const nominees = candidates(s, data, "spiel")!;
    expect(nominees).toHaveLength(5);
    expect(nominees.map((n) => n.points)).toEqual([80000, 78000, 76000, 75000, 74000]);
    expect(nominees.some((n) => n.ownerId === 0)).toBe(true);
  });

  it("ZIE-R03 Engine erst mit dem ersten Lizenzmarkt; Innovation nur mit innovativen Features", () => {
    const data = testData();
    const { s } = released(data);
    expect(candidates(s, data, "engine")).toBeNull();
    aiGame(s, 300, 1, 80000, 0);
    aiGame(s, 301, 1, 70000, 5000);
    expect(candidates(s, data, "innovation")!.map((n) => n.refId)).toContain(301);
    expect(candidates(s, data, "innovation")!.map((n) => n.refId)).not.toContain(300);
  });

  it("ZIE-R04 Der Gewinner kommt immer aus den drei Besten", () => {
    const data = testData();
    for (let seed = 0; seed < 12; seed++) {
      const { s } = released(data);
      s.week += seed * 52;
      for (let i = 0; i < 5; i++) aiGame(s, 100 + i, 1, 60000 + i * 5000);
      awardStep(s, data);
      const a = s.awards.find((x) => x.category === "spiel")!;
      expect(a.winner).toBeLessThan(3);
    }
  });

  it("ZIE-R05, MKT-R39 Preis auf der Messe: +20 % Wochenverkäufe für 8 Wochen, Ruf +3 Punkte, Complete Edition möglich", () => {
    const data = testData();
    const { s, p } = released(data);
    p.result!.scoreBp = 70000;
    // Ohne KI-Konkurrenz im Preisjahr: Der Test prüft die Wirkung des Preises, nicht die Auswahl (ZIE-R04).
    s.ai.products = [];
    const rep = s.studioReputationBp;
    awardStep(s, data);
    const a = s.awards.find((x) => x.category === "spiel")!;
    expect(a.nominees[a.winner]!.refId).toBe(p.id);
    expect(p.result!.awards).toContain("spiel");
    expect(s.studioReputationBp).toBeGreaterThanOrEqual(Math.min(10000, rep + 300));
    expect(playerAwardFactor(data, p.sales!, s.week)).toBe(12000);
    expect(playerAwardFactor(data, p.sales!, s.week + 8)).toBe(10000);
    // MKT-V17: Wertung unter 8, aber Branchenpreis.
    for (const id of [501, 502]) s.projects.push({ ...p, id, type: "addon", sourceId: p.id, sales: null });
    p.sales!.startWeek = s.week - 43;
    expect(completeEligible(s, data, p)).toBe(true);
    expect(s.log.some((l) => l.key === "log.awardWon")).toBe(true);
  });

  it("4b.3 Preis-Gala im Anzeigemodell: alle Nominierten je Kategorie, Gewinner und eigene Nominierung", () => {
    const data = testData();
    const { s, p } = released(data);
    p.result!.scoreBp = 70000;
    expect(buildView(s, data).goals.gala).toBeNull();
    awardStep(s, data);
    const gala = buildView(s, data).goals.gala!;
    expect(gala.playerNominated).toBe(true);
    const spiel = gala.categories.find((c) => c.category === "spiel")!;
    expect(spiel.nominees.some((n) => n.player && n.name === p.title)).toBe(true);
    expect(spiel.winner).toBeLessThan(spiel.nominees.length);
  });

  it("Preise nur in der Messewoche", () => {
    const data = testData();
    const { s } = released(data);
    s.week += 1;
    awardStep(s, data);
    expect(s.awards).toEqual([]);
  });

  it("Migration 34 → 35: keine Preise", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    const old = structuredClone(s) as unknown as Record<string, unknown> & { schemaVersion: number };
    old.schemaVersion = 34;
    delete old.awards;
    expect(migrateState(old).awards).toEqual([]);
  });
});
