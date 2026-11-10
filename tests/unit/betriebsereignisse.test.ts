// Etappe 5.9: Ereignisse im Betrieb (S06 Abschnitt 9, BTR-R26, BTR-T05, BTR-T13).
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import { cheaterRisk, lootboxRisk, severeBugFound } from "../../src/sim/systems/betriebsereignisse";
import { initLive } from "../../src/sim/systems/live";
import { serverStep } from "../../src/sim/systems/server";
import type { GameData, GameState, Project } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

function liveGame(data: GameData, kind: "mmo" | "f2p", base: number): { s: GameState; p: Project } {
  const s = playProject(neutralGame(data), data, input());
  const p = lastProject(s);
  p.type = kind;
  p.ops!.live = initLive(s, data, p)!;
  p.ops!.live.base = base;
  p.ops!.live.soldSeen = p.sales!.sold;
  p.sales!.ended = true;
  return { s, p };
}

function at(s: GameState, year: number): void {
  s.startYear = year;
  s.week = 0;
}

describe("Ereignisse im Betrieb (S06 5.9)", () => {
  it("BTR-T13: Härte 90 im Jahr 2016 → 6 % je Monat; Härte 60 oder weniger → 0", () => {
    const data = testData();
    const s = neutralGame(data);
    at(s, 2016);
    expect(lootboxRisk(s, data, 9000)).toBe(600);
    expect(lootboxRisk(s, data, 6000)).toBe(0);
    at(s, 2014);
    expect(lootboxRisk(s, data, 9000)).toBe(0);
  });

  it("BTR-T05: Härte 90 ab 2015 → in einem Jahr mit mehr als 50 % die Lootbox-Debatte", () => {
    const data = testData();
    const s = neutralGame(data);
    at(s, 2015);
    const monthly = lootboxRisk(s, data, 9000);
    let none = 10000;
    for (let i = 0; i < 12; i++) none = Math.trunc((none * (10000 - monthly)) / 10000);
    expect(10000 - none).toBeGreaterThan(5000);
  });

  it("BTR-R26: zu wenig Community-Kapazität erhöht das Risiko der Cheater-Welle", () => {
    const data = testData();
    const { s } = liveGame(data, "mmo", 500000);
    s.unlocks.betrieb = s.week;
    s.operations.size = 0;
    const uncovered = cheaterRisk(s, data);
    s.operations.size = 200;
    expect(cheaterRisk(s, data)).toBeLessThan(uncovered);
  });

  it("Schwerer Bug gefunden: Entscheidung; „sofort“ behebt die schweren Bugs gegen Geld", () => {
    const data = testData();
    const { s, p } = liveGame(data, "mmo", 1000);
    p.ops!.known.schwer = 5;
    severeBugFound(s, data, p, 2);
    const e = s.events.find((x) => x.kind === "schwererBug")!;
    expect(e).toBeDefined();
    severeBugFound(s, data, p, 2);
    expect(s.events.filter((x) => x.kind === "schwererBug").length).toBe(1);
    const money = s.moneyCent;
    const next = tick(s, data, [{ type: "decide", eventId: e.id, option: "sofort" }]);
    expect(next.projects.find((x) => x.id === p.id)!.ops!.known.schwer).toBe(0);
    expect(next.moneyCent).toBeLessThan(money);
  });

  it("BTR-R38: ein Ausfall in der Startspitze wird zur Entscheidung „Server-Ausfall zum Start“", () => {
    const data = testData();
    const { s, p } = liveGame(data, "mmo", 200000);
    const sv = p.ops!.live!.server;
    sv.startWeek = s.week;
    sv.rented = 0;
    serverStep(s, data, [p]);
    const e = s.events.find((x) => x.kind === "serverAusfall")!;
    expect(e.options).toEqual(["entschaedigen", "miete", "aussitzen"]);
    expect(e.opsGap).toBeGreaterThan(0);
  });

  it("Lootbox-Debatte „abschaffen“ senkt die Härte; „Liga“ hebt die Spielerbasis", () => {
    const data = testData();
    const { s, p } = liveGame(data, "f2p", 100000);
    p.ops!.live!.hardnessBp = 9000;
    s.events.push({ id: 900, kind: "lootboxDebatte", scope: "projekt", projectId: null, createdWeek: s.week, deadlineWeek: s.week + 4, options: ["abschaffen", "abschwaechen", "verteidigen"], defaultOption: "abschwaechen", productId: p.id });
    s.events.push({ id: 901, kind: "ligaAnfrage", scope: "projekt", projectId: null, createdWeek: s.week, deadlineWeek: s.week + 4, options: ["zustimmen", "ablehnen"], defaultOption: "zustimmen", productId: p.id });
    const next = tick(s, data, [{ type: "decide", eventId: 900, option: "abschaffen" }, { type: "decide", eventId: 901, option: "zustimmen" }]);
    const live = next.projects.find((x) => x.id === p.id)!.ops!.live!;
    expect(live.hardnessBp).toBe(data.liveService.defaultHardnessBp);
    expect(live.base).toBeGreaterThan(100000 - 100000 / 10);
  });
});
