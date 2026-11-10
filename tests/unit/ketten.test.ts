// Teilschritt 6a.1 und 6a.2: Ketten-Kern (KRN-R32, MRK-R53 bis MRK-R55) und Ketten aus Tabelle 5.7 (MRK-R56).
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import { migrateState } from "../../src/sim/save";
import { applyCatalogDecision, chainStep, evaluate, scheduleStage } from "../../src/sim/systems/katalog";
import { BP_ONE } from "../../src/sim/num";
import type { EventDef, GameData, GameEvent } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

function stage(id: string, over: Partial<EventDef> = {}): EventDef {
  return {
    id, class: "entscheidung", trigger: null, weightBp: 10000, cooldownWeeks: 0, target: null, stage: true, chain: "chance",
    options: [{ id: "ja", effects: [{ type: "geld", cent: -100000 }], isDefault: false }, { id: "nein", effects: [], isDefault: true }],
    ...over,
  };
}

function withChainDefs(data: GameData): GameData {
  data.catalog.chancePerWeekBp = 0;
  data.applications.chancePerWeekBp = 0;
  data.contracts.chancePerWeekBp = 0;
  data.catalog.events.push(
    stage("t_start", { stage: false, weightBp: 0, options: [
      { id: "leugnen", effects: [], isDefault: true, next: { def: "t_krise", delayWeeks: [2, 4] } },
      { id: "zugeben", effects: [], isDefault: false },
    ] }),
    stage("t_krise", { chain: "krise" }),
    stage("t_chance", { chain: "chance" }),
    stage("t_info", { class: "information", options: [], effects: [{ type: "geld", cent: 500000 }], next: { def: "t_chance", delayWeeks: [0, 0] } }),
  );
  return data;
}

function ev(defId: string): GameEvent {
  return { id: 900, kind: "katalog", scope: "welt", projectId: null, createdWeek: 0, deadlineWeek: 4, options: [], defaultOption: "", defId };
}

describe("Ketten-Kern (KRN-R32, MRK-R53–R55)", () => {
  it("MRK-R55: die gewählte Option plant die Folgestufe mit Verzögerung; das Gedächtnis merkt sich Stufe und Option", () => {
    const data = withChainDefs(testData());
    const s = neutralGame(data);
    applyCatalogDecision(s, data, ev("t_start"), "leugnen");
    expect(s.chains).toHaveLength(1);
    const c = s.chains[0]!;
    expect(c.defId).toBe("t_krise");
    expect(c.dueWeek - s.week).toBeGreaterThanOrEqual(2);
    expect(c.dueWeek - s.week).toBeLessThanOrEqual(4);
    expect(c.memory).toEqual(["t_start:leugnen"]);
    applyCatalogDecision(s, data, ev("t_start"), "zugeben");
    expect(s.chains).toHaveLength(1);
  });

  it("MRK-R55: eine Folgestufe mit Chance 0 kommt nie", () => {
    const data = withChainDefs(testData());
    const s = neutralGame(data);
    scheduleStage(s, data, { projectId: null }, "x", { def: "t_krise", delayWeeks: [1, 1], chanceBp: 0 });
    expect(s.chains).toHaveLength(0);
  });

  it("KRN-R32: die Stufe erscheint erst in ihrer Woche, dann als Ereignis mit Gedächtnis", () => {
    const data = withChainDefs(testData());
    let s = neutralGame(data);
    scheduleStage(s, data, { projectId: null }, "t_start:leugnen", { def: "t_krise", delayWeeks: [3, 3] });
    const due = s.chains[0]!.dueWeek;
    while (s.week < due) s = tick(s, data);
    expect(s.events.some((e) => e.defId === "t_krise")).toBe(false);
    s = tick(s, data);
    const e = s.events.find((x) => x.defId === "t_krise");
    expect(e?.chainMemory).toEqual(["t_start:leugnen"]);
    expect(s.chains).toHaveLength(0);
  });

  it("MRK-R54: höchstens eine Entscheidungsstufe je Woche, Krise vor Chance; die andere wartet", () => {
    const data = withChainDefs(testData());
    const s = neutralGame(data);
    scheduleStage(s, data, { projectId: null }, "a", { def: "t_chance", delayWeeks: [0, 0] });
    scheduleStage(s, data, { projectId: null }, "b", { def: "t_krise", delayWeeks: [0, 0] });
    expect(chainStep(s, data)).toBe(true);
    expect(s.events.map((e) => e.defId)).toEqual(["t_krise"]);
    expect(s.chains.map((c) => c.defId)).toEqual(["t_chance"]);
  });

  it("MRK-R54: Meldungen wirken sofort, belegen keinen Platz und können eine Stufe nachziehen", () => {
    const data = withChainDefs(testData());
    const s = neutralGame(data);
    const money = s.moneyCent;
    scheduleStage(s, data, { projectId: null }, "a", { def: "t_info", delayWeeks: [0, 0] });
    expect(chainStep(s, data)).toBe(false);
    expect(s.moneyCent).toBe(money + 500000);
    expect(s.chronicle.some((c) => c.key === "chronicle.info" && c.params.id === "t_info")).toBe(true);
    expect(s.chains.map((c) => [c.defId, c.memory])).toEqual([["t_chance", ["a", "t_info"]]]);
  });

  it("KRN-R32: eine Stufe belegt den Welt-Platz der Woche; neue Welt-Angebote warten", () => {
    const data = withChainDefs(testData());
    data.applications.chancePerWeekBp = 10000;
    let s = neutralGame(data);
    scheduleStage(s, data, { projectId: null }, "a", { def: "t_krise", delayWeeks: [1, 1] });
    s = tick(tick(s, data), data);
    // Der Tick zählt die Woche am Ende weiter; die Stufe entstand in der Woche davor.
    const fresh = s.events.filter((e) => e.createdWeek === s.week - 1 && e.scope === "welt");
    expect(fresh.map((e) => e.defId)).toEqual(["t_krise"]);
  });

  it("Stufen werden nie ausgelost", () => {
    const data = withChainDefs(testData());
    data.catalog.chancePerWeekBp = 10000;
    data.catalog.events = data.catalog.events.filter((d) => d.stage || d.historical);
    let s = neutralGame(data);
    for (let i = 0; i < 30; i++) s = tick(s, data);
    expect(s.events.some((e) => e.defId?.startsWith("t_"))).toBe(false);
  });

  it("KRN-R32: eine Kette endet, wenn ihr Projekt nicht mehr existiert", () => {
    const data = withChainDefs(testData());
    const s = neutralGame(data);
    scheduleStage(s, data, { projectId: 4711 }, "a", { def: "t_krise", delayWeeks: [0, 0] });
    expect(chainStep(s, data)).toBe(false);
    expect(s.chains).toHaveLength(0);
    expect(s.events).toHaveLength(0);
  });

  it("Spielstand 45 → 46: keine Kette läuft", () => {
    const data = testData();
    const old = structuredClone(neutralGame(data)) as unknown as Record<string, unknown>;
    old.schemaVersion = 45;
    delete old.chains;
    delete old.nextChainId;
    const m = migrateState(old as never);
    expect(m.chains).toEqual([]);
    expect(m.nextChainId).toBe(1);
  });
});

describe("Ketten aus Tabelle 5.7 (MRK-R56)", () => {
  it("MRK-R56 Crunch-Enthüllung: 13 Crunch-Wochen in 52 Wochen lösen sie aus; die Personalrunde zählt mit", () => {
    const data = testData();
    const s = neutralGame(data);
    const def = data.catalog.events.find((d) => d.id === "crunchEnthuellung")!;
    s.week = 100;
    s.staff.crunchWeeks = Array.from({ length: 12 }, (_, i) => 90 + i);
    expect(evaluate(def.trigger, { state: s, data })).toBe(false);
    s.staff.crunchWeeks.push(40, 99);
    expect(evaluate(def.trigger, { state: s, data })).toBe(true);
  });

  it("MRK-R55 Crunch-Enthüllung: Dementi kann eine zweite Welle auslösen; Entschuldigung schafft Crunch ab", () => {
    const data = testData();
    const s = neutralGame(data);
    s.staff.crunch = "beiBedarf";
    const rep = s.studioReputationBp;
    applyCatalogDecision(s, data, ev("crunchEnthuellung"), "entschuldigen");
    expect(s.staff.crunch).toBe("nie");
    expect(s.studioReputationBp).toBe(rep - 300);
    data.catalog.events.find((d) => d.id === "crunchEnthuellung")!.options.find((o) => o.id === "dementieren")!.next = { def: "crunchZweiteWelle", delayWeeks: [3, 10], chanceBp: 10000 };
    applyCatalogDecision(s, data, ev("crunchEnthuellung"), "dementieren");
    expect(s.chains.map((c) => c.defId)).toEqual(["crunchZweiteWelle"]);
  });

  it("MRK-R55: bei Alternativen wählt eine Zufallszahl über die aufsummierten Chancen", () => {
    const data = withChainDefs(testData());
    const s = neutralGame(data);
    scheduleStage(s, data, { projectId: null }, "a", [{ def: "t_krise", delayWeeks: [0, 0], chanceBp: 0 }, { def: "t_chance", delayWeeks: [0, 0], chanceBp: 10000 }]);
    expect(s.chains.map((c) => c.defId)).toEqual(["t_chance"]);
  });

  it("MRK-R56 Konsolen-Ende und Verfilmung finden ihr Produkt", () => {
    const data = testData();
    let s = playProject(neutralGame(data), data, input());
    const p = lastProject(s);
    const konsole = data.catalog.events.find((d) => d.id === "konsolenEnde")!;
    expect(evaluate(konsole.trigger, { state: s, data })).toBe(false);
    p.platforms = ["orbis"];
    s.startYear = 1990;
    expect(evaluate(konsole.trigger, { state: s, data })).toBe(true);
    const film = data.catalog.events.find((d) => d.id === "verfilmung")!;
    expect(evaluate(film.trigger, { state: s, data })).toBe(false);
    s = structuredClone(s);
    const product = lastProject(s);
    expect(product.brandId).not.toBeNull();
    {
      const brand = s.brands.find((b) => b.id === product.brandId!)!;
      brand.awarenessBp = BP_ONE;
      brand.reputationBp = BP_ONE;
      brand.depthBp = BP_ONE;
      brand.fatigueBp = 0;
      expect(evaluate(film.trigger, { state: s, data })).toBe(true);
    }
  });

  it("MRK-R56 Betriebs-Kette: still behobenes Datenleck fliegt als Folgestufe auf und wirkt auf die Zufriedenheit", () => {
    const data = testData();
    data.opsEvents.chains["datenleck:stillBeheben"] = { def: "datenleckEntdeckt", delayWeeks: [0, 0], chanceBp: 10000 };
    const s = playProject(neutralGame(data), data, input());
    const p = lastProject(s);
    p.ops!.satisfactionBp = 6000;
    s.events.push({ id: 900, kind: "datenleck", scope: "projekt", projectId: null, createdWeek: s.week, deadlineWeek: s.week + 4, options: ["offenlegen", "stillBeheben"], defaultOption: "offenlegen", productId: p.id });
    let next = tick(s, data, [{ type: "decide", eventId: 900, option: "stillBeheben" }]);
    expect(next.chains.map((c) => [c.defId, c.productId])).toEqual([]);
    expect(next.projects.find((x) => x.id === p.id)!.ops!.satisfactionBp).toBeLessThanOrEqual(6000 - 1000);
    expect(next.chronicle.some((c) => c.params.id === "datenleckEntdeckt")).toBe(true);
    next = tick(next, data);
    expect(next.chains).toHaveLength(0);
  });

  it("Spielstand 46 → 47: Crunch-Wochen beginnen leer", () => {
    const data = testData();
    const old = structuredClone(neutralGame(data)) as unknown as { schemaVersion: number; staff: Record<string, unknown> };
    old.schemaVersion = 46;
    delete old.staff.crunchWeeks;
    expect(migrateState(old as never).staff.crunchWeeks).toEqual([]);
  });
});
