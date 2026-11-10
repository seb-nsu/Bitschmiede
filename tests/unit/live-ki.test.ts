// Etappe 5.10: KI im Betrieb (S06 Abschnitt 7) und Online-Spiele beim Kopierschutz (MKT-R34, MKT-T08).
import { describe, expect, it } from "vitest";
import { aiLiveShutdown, aiLiveWeek, rollAiLive } from "../../src/sim/systems/ki/live";
import { applyPiracy, newProtection } from "../../src/sim/systems/piraterie";
import { stream } from "../../src/sim/rng";
import type { AiProduct, AiStudio, GameState } from "../../src/sim/model/types";
import { neutralGame, testData } from "../helpers";

function at(s: GameState, year: number): void {
  s.startYear = year;
  s.week = 0;
}

const studio = { id: 1, name: "Testhaus", size: "gross", archetype: "publisher" } as AiStudio;

function product(kind: "mmo" | "f2p", base: number): AiProduct {
  return {
    id: 1, studioId: 1, brandId: null, brandLicenseId: null, fanUnitsPerWeek: 0, genre: "action", theme: "fantasy", scope: "mittel", platforms: ["standardpc"],
    scoreBp: 80000, userScoreBp: 80000, releaseWeek: 0, competitionBp: 10000, sold: 0, revenueCent: 0, engineId: null, contractId: null, demandBp: 10000,
    duelWith: null, type: kind, live: { kind, base, hardnessBp: 7000, missed: 0, nextDropWeek: 1000, lossMonths: 0 },
  };
}

describe("KI im Betrieb (S06 7)", () => {
  it("MKT-T08: ein Online-Spiel hat höchstens 1 % Piraterie", () => {
    const data = testData();
    const s = neutralGame(data);
    const prot = newProtection(s, data, "keiner");
    applyPiracy(data, 1999, ["standardpc"], prot, 0, 10000, undefined, "action", true);
    expect(prot.piracyBp).toBeLessThanOrEqual(100);
  });

  it("S06 7: KI-Releases werden ab ihrem Jahr mit einer Chance nach Größe Live-Produkte; Härte nach Persönlichkeit", () => {
    const data = testData();
    const s = neutralGame(data);
    at(s, 1990);
    const rng = stream(s, "ki");
    for (let i = 0; i < 50; i++) expect(rollAiLive(s, data, studio, rng)).toBeNull();
    at(s, 2012);
    data.liveService.ai.chanceBp.gross = 10000;
    const live = rollAiLive(s, data, studio, rng)!;
    expect(live).not.toBeNull();
    expect(live.hardnessBp).toBe(data.liveService.ai.hardnessBp.publisher);
  });

  it("S06 7: zweimal den Rhythmus verpasst → Churn sichtbar höher", () => {
    const data = testData();
    const s = neutralGame(data);
    at(s, 2005);
    const rng = stream(s, "ki");
    const kept = product("mmo", 100000);
    const missed = product("mmo", 100000);
    missed.live!.missed = 2;
    aiLiveWeek(s, data, studio, kept, 0, 0, rng);
    aiLiveWeek(s, data, studio, missed, 0, 0, rng);
    expect(missed.live!.base).toBeLessThan(kept.live!.base);
  });

  it("S06 7: nach 6 Monaten Verlust stellt die KI ein", () => {
    const data = testData();
    const s = neutralGame(data);
    const p = product("mmo", 10);
    p.live!.lossMonths = 5;
    expect(aiLiveShutdown(s, data, studio, p)).toBe(false);
    p.live!.lossMonths = 6;
    expect(aiLiveShutdown(s, data, studio, p)).toBe(true);
    expect(p.live).toBeNull();
  });

  it("S06 7: Verlust zählt Monate; Gewinn setzt zurück", () => {
    const data = testData();
    const s = neutralGame(data);
    at(s, 2005);
    const rng = stream(s, "ki");
    const p = product("mmo", 0);
    aiLiveWeek(s, data, studio, p, 0, 1000000, rng);
    expect(p.live!.lossMonths).toBe(1);
    p.live!.base = 1000000;
    aiLiveWeek(s, data, studio, p, 0, 1000000, rng);
    expect(p.live!.lossMonths).toBe(0);
  });
});
