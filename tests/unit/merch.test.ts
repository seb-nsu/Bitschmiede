// Etappe 5.12: Back-Catalog (V_Katalog), Merchandising (MKT-R41, MKT-R42), Soundtrack und Artbook (MKT-R43).
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import { merchBase, merchStep } from "../../src/sim/systems/merch";
import { catalogUnits } from "../../src/sim/systems/markt";
import { migrateState } from "../../src/sim/save";
import type { Brand, GameState, ProductSales } from "../../src/sim/model/types";
import { neutralGame, testData } from "../helpers";

function brand(over: Partial<Brand> = {}): Brand {
  return {
    id: 50, name: "Testwelt", ownerId: 0, foundedWeek: 0, awarenessBp: 8000, reputationBp: 8000, depthBp: 5000, fatigueBp: 0, fans: { action: 100000 },
    discountHabitBp: 0, titles: [1], firstTitleWeek: 0, lastTitleWeek: 0, jubileeOffered: false, ...over,
  };
}

function firstWeekOfMonth(s: GameState): void {
  s.week = 0;
}

describe("Merchandising und Back-Catalog (S05 5.12)", () => {
  it("MKT-R41: eine starke Marke bekommt die Lizenz automatisch (Prüfung Fable: kein Fenster); sie bringt den Grundertrag sicher", () => {
    const data = testData();
    const s = neutralGame(data);
    firstWeekOfMonth(s);
    const b = brand();
    s.brands.push(b);
    merchStep(s, data);
    expect(s.events.some((x) => x.kind === "merchWahl")).toBe(false);
    const next = tick(s, data, []);
    const nb = next.brands.find((x) => x.id === 50)!;
    expect(nb.merch).toBe("lizenz");
    const money = next.moneyCent;
    firstWeekOfMonth(next);
    merchStep(next, data);
    expect(next.moneyCent - money).toBe(merchBase(data, nb));
    expect(merchBase(data, nb)).toBeGreaterThan(0);
  });

  it("MKT-R42: Fanshop bei schwacher Marke senkt ihren Ruf", () => {
    const data = testData();
    const s = neutralGame(data);
    firstWeekOfMonth(s);
    const b = brand({ awarenessBp: 1000, reputationBp: 1000, depthBp: 1000, merch: "eigen" });
    s.brands.push(b);
    merchStep(s, data);
    expect(b.reputationBp).toBe(1000 - data.merch.weakReputationLossBp);
  });

  it("V_Katalog: ab 2005 verkauft ein gutes Spiel dauerhaft weiter, vorher nicht", () => {
    const data = testData();
    const s = { firstWeekUnits: 20000, scoreBp: 80000 } as ProductSales;
    expect(catalogUnits(data, s, 2004)).toBe(0);
    expect(catalogUnits(data, s, 2005)).toBe(100);
    expect(catalogUnits(data, { ...s, scoreBp: 40000 }, 2010)).toBe(0);
  });

  it("Migration 42 → 43: Einnahmenzeile Merchandising", () => {
    const data = testData();
    const s = neutralGame(data);
    const t = tick(s, data);
    const old = structuredClone(t) as unknown as { schemaVersion: number; finance: { ledger: { income: Record<string, number> }[] } };
    old.schemaVersion = 42;
    for (const m of old.finance.ledger) delete m.income.merch;
    expect(migrateState(old as never).finance.ledger.every((m) => m.income.merch === 0)).toBe(true);
  });
});
