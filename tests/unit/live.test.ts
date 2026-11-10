// Etappe 5.5 und 5.6: Produkttypen DLC, MMO, F2P, Live-Service und Live-Produkte (S02 PRD-R01, S06 BTR-R15 ff., BTR-F1).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { arpuOf, initLive, liveChurn, liveNeed, liveWeek } from "../../src/sim/systems/live";
import { departmentWeeklyCost, dlcReleased, productTickets } from "../../src/sim/systems/betrieb";
import { validateCreateProject } from "../../src/sim/systems/produkte/projects";
import { brandStrength } from "../../src/sim/systems/marken";
import { migrateState } from "../../src/sim/save";
import { LIVE_KINDS, type GameData, type GameState, type LiveKind } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

/** Ein veröffentlichtes Spiel, umgebaut zum Live-Produkt mit fester Basis (die Verkaufskurve ist beendet). */
function liveGame(data: GameData, kind: LiveKind, base: number): { s: GameState; id: number } {
  const s = playProject(neutralGame(data), data, input());
  const p = lastProject(s);
  p.type = kind;
  p.ops!.live = initLive(s, data, p)!;
  p.ops!.live.base = base;
  p.ops!.live.soldSeen = p.sales!.sold;
  p.sales!.ended = true;
  p.ops!.hidden = { leicht: 0, mittel: 0, schwer: 0 };
  p.ops!.known = { leicht: 0, mittel: 0, schwer: 0 };
  return { s, id: p.id };
}

describe("Produkttypen (PRD-R01, PRD-R02)", () => {
  it("PRD-R02: DLC, MMO, Free-to-Play und Live-Service sind Datensätze", () => {
    const data = testData();
    for (const id of ["dlc", "mmo", "f2p", "liveService"]) expect(data.productTypes.some((t) => t.id === id)).toBe(true);
    expect(data.productTypes.find((t) => t.id === "mmo")!.live).toBe("mmo");
    expect(data.productTypes.find((t) => t.id === "dlc")!.requires).toBe("releasedGame");
  });

  it("PRD-R01, BTR-R23: Ein MMO braucht das Netzwerk-Modul, ein DLC sein Jahr", () => {
    const data = testData();
    const s = neutralGame(data);
    s.unlocks.produkttypen = s.week;
    s.startYear = 1999;
    expect(validateCreateProject(s, data, input({ productType: "mmo" }))).toBe("error.typeModule");
    expect(validateCreateProject(s, data, input({ productType: "dlc" }))).toBe("error.typeTooEarly");
    data.productTypes.find((t) => t.id === "mmo")!.requiresModule = null;
    expect(validateCreateProject(s, data, input({ productType: "mmo" }))).not.toBe("error.typeModule");
  });
});

describe("Live-Produkte (S06 BTR-F1)", () => {
  it("BTR-T11: alles maximal und Zufriedenheit 0 ergibt genau 0,5; Zufriedenheit 100 und Analytics nie negativ", () => {
    const data = testData();
    const worst = { competitionBp: 10000, pauseWeeks: 999, engineRelBp: 0, satisfactionBp: 0, analyticsBp: 0 };
    // ANNAHME (OFFENE-FRAGEN): Mit den Startwerten erreicht das MMO (c₀ = 4 %) höchstens 0,42.
    for (const kind of ["f2p", "liveService"] as const) expect(liveChurn(data, kind, worst).churnBp).toBe(5000);
    for (const kind of LIVE_KINDS) {
      const best = liveChurn(data, kind, { competitionBp: 0, pauseWeeks: 0, engineRelBp: 10000, satisfactionBp: 10000, analyticsBp: 2000 });
      expect(best.churnBp).toBeGreaterThanOrEqual(0);
      expect(best.churnBp).toBeLessThan(data.liveService.baseChurnBp[kind]);
    }
  });

  it("BTR-F1: die Aufschlüsselung des Churns ergibt die Summe (Wasserfall)", () => {
    const data = testData();
    const c = liveChurn(data, "mmo", { competitionBp: 4000, pauseWeeks: 6, engineRelBp: 8000, satisfactionBp: 7000, analyticsBp: 0 });
    const p = c.parts;
    expect(p.baseBp + p.competitionBp + p.pauseBp + p.techBp + p.satisfactionBp).toBe(c.churnBp);
  });

  it("BTR-T01: ein MMO ohne Content-Drop über 52 Wochen hat am Ende höheren Churn und kleinere Basis", () => {
    const data = testData();
    data.liveService.noDepartmentRatioBp = 0;
    const g = liveGame(data, "mmo", 100000);
    let s = g.s;
    const id = g.id;
    for (let i = 0; i < 5; i++) s = tick(s, data);
    const early = s.projects.find((x) => x.id === id)!.ops!.live!.churnBp;
    for (let i = 0; i < 47; i++) s = tick(s, data);
    const live = s.projects.find((x) => x.id === id)!.ops!.live!;
    expect(live.drops).toBe(0);
    expect(live.churnBp).toBeGreaterThan(early);
    expect(live.base).toBeLessThan(100000);
  });

  it("BTR-R17: Live-Ops nach Rhythmus bringt Content-Drops; der Drop holt Spieler zurück", () => {
    const data = testData();
    data.liveService.noDepartmentRatioBp = 10000;
    const g = liveGame(data, "f2p", 50000);
    let s = g.s;
    const id = g.id;
    for (let i = 0; i < 9; i++) s = tick(s, data);
    expect(s.projects.find((x) => x.id === id)!.ops!.live!.drops).toBe(1);
  });

  it("BTR-T02: ein MMO mit pünktlichen Drops und Zufriedenheit 75 läuft zehn Jahre mit Gewinn (Betrieb und Server)", () => {
    const data = testData();
    const g = liveGame(data, "mmo", 200000);
    let s = g.s;
    const id = g.id;
    s.unlocks.betrieb = s.week;
    s.operations.triggered = true;
    const p = s.projects.find((x) => x.id === id)!;
    p.result!.userScoreBp = 75000;
    p.ops!.satisfactionBp = 7500;
    let cost = 0;
    for (let i = 0; i < 520; i++) {
      s = tick(s, data);
      cost += departmentWeeklyCost(s, data) + s.projects.find((x) => x.id === id)!.ops!.live!.server.weekCostCent;
    }
    const live = s.projects.find((x) => x.id === id)!.ops!.live!;
    expect(live.drops).toBeGreaterThanOrEqual(19);
    expect(live.revenueCent).toBeGreaterThan(cost);
    expect(live.base).toBeGreaterThan(0);
  }, 60000);

  it("BTR-R20: F2P-Umsatz = Basis · ARPU; Härte hebt den ARPU und kostet Zufriedenheit", () => {
    const data = testData();
    const { s, id } = liveGame(data, "f2p", 10000);
    const p = s.projects.find((x) => x.id === id)!;
    const live = p.ops!.live!;
    const soft = arpuOf(s, data, live);
    live.hardnessBp = 10000;
    expect(arpuOf(s, data, live)).toBeGreaterThan(soft);
    expect(liveWeek(s, data, p, 0)).toBeLessThan(0);
    expect(live.weekRevenueCent).toBe(Math.trunc((10000 * arpuOf(s, data, live) * 12) / 52));
    expect(validateInput(s, data, { type: "setLive", projectId: id, hardnessBp: 12000 })).toBe("error.amount");
    expect(validateInput(s, data, { type: "setLive", projectId: id, hardnessBp: 8000 })).toBeNull();
  });

  it("BTR-R21: das MMO-Abo bringt die Abogebühr je Spieler", () => {
    const data = testData();
    const { s, id } = liveGame(data, "mmo", 1000);
    const live = s.projects.find((x) => x.id === id)!.ops!.live!;
    expect(arpuOf(s, data, live)).toBeGreaterThan(0);
    expect(validateInput(s, data, { type: "setLive", projectId: id, hardnessBp: 5000 })).toBe("error.notF2p");
  });

  it("BTR-T08, BTR-R22: Einstellen bei 500.000 Spielern senkt Markenstärke und Ruf; die Basis verschwindet", () => {
    const data = testData();
    const g = liveGame(data, "mmo", 500000);
    let s = g.s;
    const id = g.id;
    const p = s.projects.find((x) => x.id === id)!;
    const brand = s.brands.find((b) => b.id === p.brandId)!;
    expect(brand).toBeDefined();
    const before = brandStrength(data, brand);
    s = tick(s, data, [{ type: "setLive", projectId: id, shutdown: true }]);
    const after = s.brands.find((b) => b.id === p.brandId)!;
    expect(brandStrength(data, after)).toBeLessThan(before);
    expect(after.reputationBp).toBe(brand.reputationBp - data.liveService.shutdownReputationBp);
    const live = s.projects.find((x) => x.id === id)!.ops!.live!;
    expect(live.base).toBe(0);
    expect(live.shutdownWeek).not.toBeNull();
    expect(validateInput(s, data, { type: "setLive", projectId: id, shutdown: true })).toBe("error.liveShutdown");
  });

  it("BTR-F2, BTR-R23: Live-Spieler erzeugen Anfragen und binden Live-Ops", () => {
    const data = testData();
    const { s, id } = liveGame(data, "mmo", 100000);
    const p = s.projects.find((x) => x.id === id)!;
    p.sales!.weekly = [0, 0, 0, 0];
    expect(productTickets(data, p)).toBe(500);
    expect(liveNeed(data, p)).toBeGreaterThan(0);
  });

  it("BTR-R13: mehr als 3 DLC in einem Jahr kosten die Vorlage je weiterem DLC 4 Punkte", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const src = lastProject(s);
    src.ops!.satisfactionBp = 7000;
    for (let i = 0; i < 4; i++) {
      const dlc = { ...structuredClone(src), id: 900 + i, type: "dlc", sourceId: src.id, ops: null };
      dlc.result!.week = s.week;
      s.projects.push(dlc);
      dlcReleased(s, data, dlc);
    }
    expect(src.ops!.satisfactionBp).toBe(6600);
  });

  it("Migration 39 → 40: jeder Betrieb bekommt live: null", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const old = structuredClone(s) as unknown as Record<string, unknown>;
    old.schemaVersion = 39;
    for (const p of old.projects as { ops?: Record<string, unknown> }[]) if (p.ops) delete p.ops.live;
    const m = migrateState(old as never);
    expect(lastProject(m).ops!.live).toBeNull();
  });
});
