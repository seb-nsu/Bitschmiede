// Teilschritt 4.5: Preis nach dem Release, Rabattwochen, Gewöhnung, Preisschutz (MKT-R17 bis MKT-R21, MKT-F4, MKT-V05, MRK-R41).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import {
  aiPriceFactors, discountBoost, habitFactor, isDiscountWeek, pricingDemandFactor, protectionCredit, suggestedPrice,
} from "../../src/sim/systems/preise";
import { migrateState } from "../../src/sim/save";
import { dateOf } from "../../src/sim/calendar";
import type { AiProduct, GameData, GameState, ProductSales } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

/** Spielstand mit einem veröffentlichten Spiel, verschoben ins Jahr 2006, Woche vor der ersten Rabattwoche. */
function released2006(data: GameData, age = 60): { s: GameState; id: number } {
  const s = playProject(neutralGame(data), data, input());
  const id = lastProject(s).id;
  s.startYear = 2006 - dateOf(0, s.week).year;
  const d = dateOf(s.startYear, s.week);
  s.week += (data.sales.pricing.discountWeeks[0]! - d.weekOfYear + 52) % 52;
  const p = s.projects.find((x) => x.id === id)!;
  p.sales!.startWeek = s.week - age;
  p.sales!.ended = false;
  return { s, id };
}

describe("Preis nach dem Release (MKT-R17 bis MKT-R21)", () => {
  it("MKT-VT02 20.000 Stück im Handel, Preis −10 USD: Gutschrift 200.000 USD", () => {
    expect(protectionCredit(20000, 6000, 5000)).toBe(20_000_000);
    const data = testData();
    let s = playProject(neutralGame(data), data, input());
    const p = lastProject(s);
    p.sales!.stock = 20000;
    const price = p.sales!.priceCent!;
    const money = s.moneyCent;
    const factor = p.sales!.demandFactorBp;
    s = tick(s, data, [{ type: "setPrice", projectId: p.id, priceCent: price - 1000 }]);
    const after = s.projects.find((x) => x.id === p.id)!.sales!;
    expect(after.pricing!.protectionCreditCent).toBe(20_000_000);
    expect(after.priceCent).toBe(price - 1000);
    // MKT-R17: billiger verkauft mehr (Elastizität wie beim Release).
    expect(after.demandFactorBp).toBeGreaterThan(factor);
    expect(s.moneyCent).toBeLessThan(money + after.weekRevenueCent - 19_000_000);
  });

  it("MKT-R17 Erhöhen ist nicht möglich; Preiskurve −20 % nach 6, −40 % nach 12 Monaten", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const p = lastProject(s);
    const price = p.sales!.priceCent!;
    expect(validateInput(s, data, { type: "setPrice", projectId: p.id, priceCent: price })).toBe("error.priceUp");
    expect(validateInput(s, data, { type: "setPrice", projectId: p.id, priceCent: price + 1 })).toBe("error.priceUp");
    expect(validateInput(s, data, { type: "setPrice", projectId: p.id, priceCent: price - 1 })).toBeNull();
    const pr = p.sales!.pricing!;
    expect(suggestedPrice(data, pr, 10)).toBe(pr.releasePriceCent);
    expect(suggestedPrice(data, pr, 26)).toBe(pr.releasePriceCent - pr.releasePriceCent * 20 / 100);
    expect(suggestedPrice(data, pr, 60)).toBe(pr.releasePriceCent - pr.releasePriceCent * 40 / 100);
  });

  it("MKT-R18 Rabattwochen: keine vor 2005, ab 2005 vier im Jahr", () => {
    const data = testData();
    const count = (startYear: number) => Array.from({ length: 52 }, (_, w) => w).filter((w) => isDiscountWeek(data, startYear, w)).length;
    expect(count(2004)).toBe(0);
    expect(count(2005)).toBe(4);
  });

  it("MKT-F4 (1 + r₁ · Rabatt) · (1 − Gewöhnung · r₂) mit r₁ = 3, r₂ = 0,5", () => {
    const data = testData();
    expect(discountBoost(data, 2500)).toBe(17500);
    expect(habitFactor(data, 10000)).toBe(5000);
    expect(habitFactor(data, 0)).toBe(10000);
  });

  it("A12, MKT-R21 Standardregel: nach 12 Monaten 25 % in jeder Store-Aktion, ohne Gewöhnung", () => {
    const data = testData();
    const { s, id } = released2006(data);
    expect(s.priceRule.active).toBe(true);
    const brandId = s.projects.find((x) => x.id === id)!.brandId;
    const s2 = tick(s, data);
    const sales = s2.projects.find((x) => x.id === id)!.sales!;
    expect(sales.pricing!.discountBp).toBe(2500);
    expect(sales.pricing!.discounts).toBe(1);
    if (brandId !== null) expect(s2.brands.find((b) => b.id === brandId)!.discountHabitBp).toBe(0);
    // Zu junge Spiele nehmen nicht teil.
    const young = released2006(data, 20);
    expect(tick(young.s, data).projects.find((x) => x.id === young.id)!.sales!.pricing!.discountBp).toBe(0);
  });

  it("MKT-R18, A12 Regel aus: Karte eine Woche vorher, 50 % Rabatt erhöht die Gewöhnung (MKT-R19)", () => {
    const data = testData();
    const { s, id } = released2006(data);
    s.week -= 1;
    s.projects.find((x) => x.id === id)!.sales!.startWeek -= 1;
    let s2 = tick(s, data, [{ type: "setPriceRule", rule: { active: false, afterWeeks: 52, discountBp: 2500, followCurve: false } }]);
    const ev = s2.events.find((e) => e.kind === "rabattwoche");
    expect(ev).toBeDefined();
    expect(ev!.options).toEqual(["rabatt2500", "rabatt5000", "aussetzen"]);
    const p = s2.projects.find((x) => x.id === id)!;
    const brand = s2.brands.find((b) => b.id === p.brandId);
    const habit = brand?.discountHabitBp ?? 0;
    // Das alte Spiel verkauft nach der Jahresverschiebung nichts mehr; für den Test bleibt es im Verkauf.
    p.sales!.ended = false;
    s2 = tick(s2, data, [{ type: "decide", eventId: ev!.id, option: "rabatt5000" }]);
    expect(s2.projects.find((x) => x.id === id)!.sales!.pricing!.discountBp).toBe(5000);
    if (brand) expect(s2.brands.find((b) => b.id === brand.id)!.discountHabitBp).toBe(habit + 500);
  });

  it("MKT-T06 Marke mit Rabatt-Gewöhnung verkauft ihr nächstes Spiel zum Vollpreis schlechter", () => {
    const data = testData();
    const s = neutralGame(data);
    const base = { priceCent: 5000, pricing: { releasePriceCent: 5000, standardCent: 5000, discountBp: 0, nextDiscountBp: null, discounts: 0, habitAtReleaseBp: 0, history: [], protectionCreditCent: 0 } };
    const clean = base as unknown as ProductSales;
    const habit = { ...base, pricing: { ...base.pricing, habitAtReleaseBp: 4000 } } as unknown as ProductSales;
    expect(pricingDemandFactor(s, data, clean, null)).toBe(10000);
    expect(pricingDemandFactor(s, data, habit, null)).toBe(8000);
    // Nach einer dauerhaften Senkung warten die Fans nicht mehr.
    expect(pricingDemandFactor(s, data, { ...habit, priceCent: 4000 } as ProductSales, null)).toBe(10000);
  });

  it("MKT-R19 Gewöhnung baut sich je Monat um 10 ab", () => {
    const data = testData();
    let s = playProject(neutralGame(data), data, input());
    const b = s.brands[0];
    if (!b) return;
    b.discountHabitBp = 1000;
    for (let i = 0; i < 13; i++) s = tick(s, data);
    expect(s.brands[0]!.discountHabitBp).toBe(700);
  });

  it("MRK-R41 KI: nach 12 Monaten −25 % dauerhaft, Rabattwoche nach MKT-F4", () => {
    const data = testData();
    const s = neutralGame(data);
    const p = { brandId: null, priceCutBp: 2500, discountBp: 0 } as unknown as AiProduct;
    const f = aiPriceFactors(s, data, p);
    expect(f.priceBp).toBe(7500);
    expect(f.demandBp).toBe(13750);
    const d = aiPriceFactors(s, data, { ...p, discountBp: 2500 });
    expect(d.priceBp).toBe(5625);
    expect(d.demandBp).toBe(24062);
  });

  it("Migration 29 → 30: Gewöhnung 0 und Standardregel", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const old = structuredClone(s) as unknown as Record<string, unknown> & { schemaVersion: number };
    old.schemaVersion = 29;
    delete old.priceRule;
    for (const b of old.brands as Record<string, unknown>[]) delete b.discountHabitBp;
    const m = migrateState(old);
    expect(m.priceRule).toEqual({ active: true, afterWeeks: 52, discountBp: 2500, followCurve: false });
    for (const b of m.brands) expect(b.discountHabitBp).toBe(0);
  });
});
