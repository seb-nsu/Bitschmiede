// Etappe 5.7: Serverkapazität (S06 BTR-R18, BTR-R19, BTR-R34 bis BTR-R38, A30).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { initLive } from "../../src/sim/systems/live";
import { cloudStep, ownCapacity, serverStep } from "../../src/sim/systems/server";
import { migrateState } from "../../src/sim/save";
import type { GameData, GameState, Project } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

function liveGame(data: GameData, base: number): { s: GameState; p: Project } {
  const s = playProject(neutralGame(data), data, input());
  const p = lastProject(s);
  p.type = "mmo";
  p.ops!.live = initLive(s, data, p)!;
  p.ops!.live.base = base;
  p.ops!.live.soldSeen = p.sales!.sold;
  p.sales!.ended = true;
  return { s, p };
}

describe("Serverkapazität (S06 5.7)", () => {
  it("BTR-T15: Normalbedarf 20.000, Startspitze 3 ×, Startkapazität 40.000 → Ausfall in Woche 1, Zufriedenheit −8", () => {
    const data = testData();
    const { s, p } = liveGame(data, 200000);
    const sv = p.ops!.live!.server;
    sv.startWeek = s.week;
    sv.peakBp = 30000;
    sv.rented = 40000;
    const out = serverStep(s, data, [p]);
    expect(sv.demand).toBe(60000);
    expect(sv.outages).toBe(1);
    expect(out.get(p.id)).toBe(-800);
  });

  it("BTR-T07: gleichzeitige Spieler über der Kapazität senken die Zufriedenheit; genug Kapazität nicht", () => {
    const data = testData();
    const { s, p } = liveGame(data, 100000);
    const sv = p.ops!.live!.server;
    sv.startWeek = s.week - 10;
    sv.rule = false;
    sv.rented = 5000;
    expect(serverStep(s, data, [p]).get(p.id)).toBe(-800);
    sv.rented = 20000;
    expect(serverStep(s, data, [p]).has(p.id)).toBe(false);
  });

  it("BTR-T16: Cloud 10.000 bei Bedarf 40.000: nach 1 Woche 15.000, nach 4 Wochen höchstens 50.625", () => {
    const data = testData();
    let c = cloudStep(data, 10000, 40000);
    expect(c).toBe(15000);
    for (let i = 0; i < 3; i++) c = cloudStep(data, c, 60000);
    expect(c).toBeLessThanOrEqual(50625);
  });

  it("BTR-T17: eine Miet-Bestellung in Woche 10 steht ab Woche 14 bereit", () => {
    const data = testData();
    const { s, p } = liveGame(data, 0);
    const sv = p.ops!.live!.server;
    sv.rule = false;
    sv.rented = 0;
    const id = p.id;
    let st = tick(s, data, [{ type: "setServer", projectId: id, rented: 10000 }]);
    const ordered = st.week - 1;
    const order = st.projects.find((x) => x.id === id)!.ops!.live!.server.orders[0]!;
    expect(order.week).toBe(ordered + 4);
    while (st.week < order.week) {
      expect(st.projects.find((x) => x.id === id)!.ops!.live!.server.rented).toBe(0);
      st = tick(st, data);
    }
    st = tick(st, data);
    expect(st.projects.find((x) => x.id === id)!.ops!.live!.server.rented).toBe(10000);
  });

  it("BTR-R37: die Regel „Bedarf × 1,3“ bestellt Miete nach und kündigt Überschuss", () => {
    const data = testData();
    const { s, p } = liveGame(data, 100000);
    const sv = p.ops!.live!.server;
    sv.startWeek = s.week - 10;
    sv.rented = 0;
    serverStep(s, data, [p]);
    expect(sv.orders.reduce((a, o) => a + o.units, 0)).toBe(20000);
  });

  it("BTR-R34, FRM-R65: Serverraum 5.000 (2000), Rechenzentrum das Zehnfache, zweiter Raum 70 %", () => {
    const data = testData();
    const s = neutralGame(data);
    s.startYear = 2000;
    s.week = 0;
    s.office.rooms = ["serverraum"];
    expect(ownCapacity(s, data)).toBe(5000);
    s.office.rooms = ["serverraum", "serverraum"];
    expect(ownCapacity(s, data)).toBe(8500);
    s.office.rooms = ["rechenzentrum"];
    expect(ownCapacity(s, data)).toBe(50000);
  });

  it("BTR-R35: Server nur für laufende Live-Produkte, Regel-Faktor 1,0–2,0", () => {
    const data = testData();
    const { s, p } = liveGame(data, 1000);
    expect(validateInput(s, data, { type: "setServer", projectId: p.id, ruleBp: 25000 })).toBe("error.amount");
    expect(validateInput(s, data, { type: "setServer", projectId: p.id, ruleBp: 15000 })).toBeNull();
    p.ops!.live = null;
    expect(validateInput(s, data, { type: "setServer", projectId: p.id, rule: false })).toBe("error.notLive");
  });

  it("Migration 40 → 41: Kostenzeile Server", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const old = structuredClone(s) as unknown as { schemaVersion: number; finance: { ledger: { costs: Record<string, number> }[] } };
    old.schemaVersion = 40;
    for (const m of old.finance.ledger) delete m.costs.server;
    const m = migrateState(old as never);
    expect(m.finance.ledger.every((x) => x.costs.server === 0)).toBe(true);
  });
});
