// Etappe 5.15: Anzeigemodell des Betriebs (S06 Abschnitt 8) und Release-Paket Punkt 9.
import { describe, expect, it } from "vitest";
import { operationsView } from "../../src/sim/view/betriebView";
import { buildView } from "../../src/sim/view/view";
import { initLive } from "../../src/sim/systems/live";
import { suggestedStartServer } from "../../src/sim/systems/server";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

describe("Anzeigemodell Betrieb (S06 Abschnitt 8)", () => {
  it("vor dem ersten Release ist die Unterseite unsichtbar, danach zeigt sie das Spiel mit Zufriedenheit und Bugs", () => {
    const data = testData();
    expect(operationsView(neutralGame(data), data).visible).toBe(false);
    const s = playProject(neutralGame(data), data, input());
    const v = operationsView(s, data);
    expect(v.visible).toBe(true);
    const p = v.products[0]!;
    expect(p.id).toBe(lastProject(s).id);
    expect(p.satisfactionBp).toBe(lastProject(s).ops!.satisfactionBp);
    expect(p.live).toBeNull();
  });

  it("Live-Produkte zeigen Spielerbasis, Churn-Aufschlüsselung und Server", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const p = lastProject(s);
    p.type = "liveService";
    p.ops!.live = initLive(s, data, p)!;
    p.ops!.live.base = 12345;
    const live = operationsView(s, data).products[0]!.live!;
    expect(live.base).toBe(12345);
    expect(Object.keys(live.churnParts).sort()).toEqual(["baseBp", "competitionBp", "pauseBp", "satisfactionBp", "techBp"]);
    expect(live.server.capacity).toBe(live.server.own + live.server.rented + live.server.cloud);
  });

  it("BTR-R37: Vorschlag für die Startkapazität in ganzen Mietblöcken, ohne Bedarf null", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(suggestedStartServer(s, data, 0)).toBe(0);
    const n = suggestedStartServer(s, data, 100000);
    expect(n).toBeGreaterThan(0);
    expect(n % data.liveService.server.rentBlock).toBe(0);
  });

  it("das Anzeigemodell enthält den Betrieb", () => {
    const data = testData();
    expect(buildView(neutralGame(data), data).operations.products).toEqual([]);
  });
});
