// Spieltest nach Etappe 4: Übersicht „Was gibt es“ im Anzeigemodell (KRN-R40, KRN-R41).
import { describe, expect, it } from "vitest";
import { buildView } from "../../src/sim/view/view";
import { neutralGame, testData } from "../helpers";

describe("Übersicht freischaltbarer Bereiche (KRN-R40)", () => {
  it("zeigt gesperrte Systeme mit Schwelle und aktuellem Wert", () => {
    const data = testData();
    const s = neutralGame(data);
    const v = buildView(s, data);
    const engine = v.roadmap.find((r) => r.id === "engine")!;
    expect(engine.unlocked).toBe(false);
    expect(engine.any).toBe(true);
    expect(engine.needs).toEqual([{ field: "firma.releases", value: 2, current: 0 }, { field: "jahr", value: 1982, current: 1980 }]);
    expect(v.roadmap.map((r) => r.id)).toEqual(expect.arrayContaining(["auftraege", "marken", "firma", "delegation", "lizenzmarkt"]));
  });

  it("markiert Freigeschaltetes und Wartendes", () => {
    const data = testData();
    const s = neutralGame(data);
    s.unlocks["markt"] = s.week;
    s.unlockWaiting["zeitleiste"] = s.week;
    const v = buildView(s, data);
    expect(v.roadmap.find((r) => r.id === "markt")!.unlocked).toBe(true);
    expect(v.roadmap.find((r) => r.id === "zeitleiste")!.waiting).toBe(true);
  });
});
