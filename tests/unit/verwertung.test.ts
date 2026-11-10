// Teilschritt 4.8: Verwertungskette und Abo-Deal (MKT-V15 bis MKT-V24, MKT-R51 bis MKT-R54).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import {
  applyReissueDecision, applySubscription, budgetEligible, completeEligible, consume, initRemaining, reissuePotential, reissueStep,
  subscriptionFactor, subscriptionFee,
} from "../../src/sim/systems/verwertung";
import { migrateState } from "../../src/sim/save";
import type { GameData, GameEvent, GameState, Project } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

function released(data: GameData): { s: GameState; p: Project } {
  const s = playProject(neutralGame(data), data, input());
  return { s, p: lastProject(s) };
}

function fakeAddon(s: GameState, sourceId: number, id: number): void {
  s.projects.push({ ...s.projects.find((x) => x.id === sourceId)!, id, type: "addon", sourceId, sales: null });
}

function event(kind: GameEvent["kind"], over: Partial<GameEvent>): GameEvent {
  return { id: 999, kind, scope: "projekt", projectId: null, createdWeek: 0, deadlineWeek: 10, options: [], defaultOption: "ablehnen", ...over };
}

describe("Verwertung (MKT-V15 bis MKT-V24)", () => {
  it("MKT-V16 Restnachfrage 50 / 30 / 20 % von 2 · erwartetem Absatz; Verkäufe verbrauchen von oben", () => {
    const data = testData();
    const { s, p } = released(data);
    const r = initRemaining(s, data, p, 100000);
    expect(r).toEqual({ voll: 100000, mittel: 60000, budget: 40000 });
    expect(consume(r, 120000)).toBe(120000);
    expect(r).toEqual({ voll: 0, mittel: 40000, budget: 40000 });
    // Beim Release gesetzt und vom Absatz verbraucht.
    expect(p.sales!.remaining).toBeDefined();
    expect(p.sales!.expectedUnits).toBeGreaterThan(0);
    const total = 2 * p.sales!.expectedUnits!;
    expect(p.sales!.remaining!.voll + p.sales!.remaining!.mittel + p.sales!.remaining!.budget).toBeLessThan(total);
  });

  it("MKT-VT05 Sammlung aus drei Titeln mit je 100.000 Restnachfrage: Potenzial 180.000", () => {
    const data = testData();
    const { s, p } = released(data);
    const ids = [p.id, 101, 102];
    for (const id of ids.slice(1)) s.projects.push({ ...p, id, sales: { ...p.sales! } });
    for (const id of ids) s.projects.find((x) => x.id === id)!.sales!.remaining = { voll: 50000, mittel: 30000, budget: 20000 };
    expect(reissuePotential(s, data, "sammlung", ids)).toBe(180000);
  });

  it("MKT-VT03 Wertung 8,6 und zwei DLC: Complete Edition nach 10 Monaten, nicht vor 9 Monaten", () => {
    const data = testData();
    const { s, p } = released(data);
    p.result!.scoreBp = 86000;
    fakeAddon(s, p.id, 201);
    expect(completeEligible(s, data, p)).toBe(false);
    fakeAddon(s, p.id, 202);
    p.sales!.startWeek = s.week - 34;
    expect(completeEligible(s, data, p)).toBe(false);
    p.sales!.startWeek = s.week - 43;
    expect(completeEligible(s, data, p)).toBe(true);
    p.result!.scoreBp = 79000;
    expect(completeEligible(s, data, p)).toBe(false);
  });

  it("MKT-VT04 Complete Edition nach 10 Monaten: Vollpreis-Restnachfrage des nächsten Titels −10 %", () => {
    const data = testData();
    const { s, p } = released(data);
    const brand = s.brands.find((b) => b.id === p.brandId);
    expect(brand).toBeDefined();
    p.sales!.startWeek = s.week - 43;
    p.sales!.remaining = { voll: 50000, mittel: 30000, budget: 20000 };
    applyReissueDecision(s, data, event("verwertung", { reissue: { kind: "complete", sourceIds: [p.id], units: 0, priceCent: 3000, licenseFeeCent: 0 } }), "annehmen");
    expect(s.reissues).toHaveLength(1);
    expect(p.sales!.remaining.voll).toBeLessThan(50000);
    const next = initRemaining(s, data, p, 100000);
    expect(next.voll).toBe(90000);
    expect(initRemaining(s, data, p, 100000).voll).toBe(100000);
  });

  it("MKT-V19 Budget-Neuauflage nach einem Jahr im Auslauf; Konsolen erst ab 250.000 Stück", () => {
    const data = testData();
    const { s, p } = released(data);
    const sales = p.sales!;
    sales.firstWeekUnits = 10000;
    sales.weekly = [10000, 500];
    expect(budgetEligible(s, data, p)).toBe(false);
    sales.startWeek = s.week - 60;
    expect(budgetEligible(s, data, p)).toBe(true);
    sales.weekly = [10000, 5000];
    expect(budgetEligible(s, data, p)).toBe(false);
    sales.weekly = [10000, 500];
    p.platforms = ["nova"];
    sales.sold = 100000;
    expect(budgetEligible(s, data, p)).toBe(false);
    sales.sold = 300000;
    expect(budgetEligible(s, data, p)).toBe(true);
  });

  it("MKT-V23 Lizenz an Budget-Publisher: Festbetrag, 10 % Anteil, keine Preishoheit; Rückläufer zuerst (MKT-V04)", () => {
    const data = testData();
    const { s, p } = released(data);
    p.sales!.remaining = { voll: 0, mittel: 0, budget: 40000 };
    p.sales!.returned = 1000;
    const money = s.moneyCent;
    applyReissueDecision(s, data, event("verwertung", { reissue: { kind: "budget", sourceIds: [p.id], units: 0, priceCent: 1500, licenseFeeCent: 500000 } }), "lizenz");
    expect(s.moneyCent).toBe(money + 500000);
    expect(p.sales!.priceLocked).toBe(true);
    expect(validateInput(s, data, { type: "setPrice", projectId: p.id, priceCent: 100 })).toBe("error.priceLicensed");
    const r = s.reissues[0]!;
    expect(r.licensed).toBe(true);
    reissueStep(s, data);
    expect(r.sold).toBeGreaterThan(0);
    expect(p.sales!.returned).toBe(Math.max(0, 1000 - r.sold));
  });

  it("MKT-T16 Abo-Deal: 100.000 erwartete Verkäufe zu 6.000 Cent ergeben 180.000.000 Cent, −40 % im Deal-Jahr", () => {
    const data = testData();
    expect(subscriptionFee(data, 100000, 6000)).toBe(180_000_000);
    const { s, p } = released(data);
    const money = s.moneyCent;
    const brand = s.brands.find((b) => b.id === p.brandId)!;
    const fans = brand.fans[p.genre] ?? 0;
    applySubscription(s, data, event("aboDeal", { projectId: p.id, subscription: { feeCent: 180_000_000, units: 100000 } }), p);
    expect(s.moneyCent).toBe(money + 180_000_000);
    expect(subscriptionFactor(data, p.sales!, s.week)).toBe(6000);
    expect(subscriptionFactor(data, p.sales!, s.week + 52)).toBe(10000);
    // MKT-R54: Fans +5 % der erwarteten Verkäufe.
    expect(brand.fans[p.genre]).toBe(fans + 5000);
  });

  it("MKT-V24 Vorschläge sind nie Pflicht: Standardantwort „Nicht jetzt“", () => {
    const data = testData();
    const start = released(data);
    let s = start.s;
    const p = start.p;
    p.result!.scoreBp = 86000;
    fakeAddon(s, p.id, 201);
    fakeAddon(s, p.id, 202);
    p.sales!.startWeek = s.week - 60;
    p.sales!.remaining = { voll: 50000, mittel: 30000, budget: 20000 };
    let guard = 0;
    while (!s.events.some((e) => e.kind === "verwertung") && guard++ < 6) s = tick(s, data);
    const ev = s.events.find((e) => e.kind === "verwertung");
    expect(ev).toBeDefined();
    expect(ev!.defaultOption).toBe("ablehnen");
    expect(ev!.reissue!.kind).toBe("complete");
  });

  it("Migration 32 → 33: leere Verwertungen", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    const old = structuredClone(s) as unknown as Record<string, unknown> & { schemaVersion: number };
    old.schemaVersion = 32;
    delete old.reissues;
    delete old.nextReissueId;
    const m = migrateState(old);
    expect(m.reissues).toEqual([]);
    expect(m.nextReissueId).toBe(1);
  });
});
