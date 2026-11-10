// Teilschritte 6b.1 und 6b.2: Firmenwert (S09 Formel 5) und Börse (FRM-R51 bis FRM-R54, FRM-R74, Formel 5.7).
import { describe, expect, it } from "vitest";
import { migrateState } from "../../src/sim/save";
import { tick } from "../../src/sim/tick";
import {
  applyAssembly, assemblyStep, capitalRaise, ipoBlockers, meanReversion, setDividend, sharePrice, stockQuarter, targetDelta, validateCapitalRaise,
} from "../../src/sim/systems/boerse";
import { playerValue, studioValue, valueRange } from "../../src/sim/systems/firmenwert";
import type { GameData, GameState, LedgerMonth } from "../../src/sim/model/types";
import { neutralGame, testData } from "../helpers";

const USD = 100;

function listed(data: GameData, sentiment = 60): GameState {
  const s = neutralGame(data);
  s.week = (2010 - s.startYear) * 52;
  s.stock = { ...s.stock, listed: true, ipoWeek: 0, shares: 10_000_000, publicShares: 3_000_000, sentiment };
  return s;
}

function month(year: number, m: number, incomeCent: number, costCent: number): LedgerMonth {
  return { year, month: m, income: { sales: incomeCent, contracts: 0, licenses: 0, merch: 0 }, costs: { wages: costCent, rent: 0, interest: 0, production: 0, storage: 0, other: 0, tax: 0, licenses: 0, marketing: 0, server: 0 } };
}

describe("Firmenwert (S09 Formel 5)", () => {
  it("UEB-T02: Spanne ±40 % um die versetzte Mitte, nach der Prüfung ±10 % um den wahren Wert", () => {
    expect(valueRange(1_000_000_000, 2000, 4000)).toEqual({ low: 720_000_000, mid: 1_200_000_000, high: 1_680_000_000 });
    expect(valueRange(1_000_000_000, 0, 1000)).toEqual({ low: 900_000_000, mid: 1_000_000_000, high: 1_100_000_000 });
  });

  it("UEB-T12: der wahre Wert liegt bei jedem Versatz bis ±2.500 bp in der Spanne", () => {
    for (let o = -2500; o <= 2500; o += 250) {
      const r = valueRange(1_000_000_000, o, 4000);
      expect(r.low).toBeLessThanOrEqual(1_000_000_000);
      expect(r.high).toBeGreaterThanOrEqual(1_000_000_000);
    }
  });

  it("Formel 5: Ertrag nur aus Gewinn, Schulden ziehen ab; die Teile summieren sich zum Wert", () => {
    const data = testData();
    const s = listed(data);
    s.ai.generated = true;
    const studio = { ...structuredClone(s.ai.studios[0]!) };
    if (!studio.id) return;
    studio.revenueByYear = [0, 0, 0, 0];
    studio.cashCent = -1_000_000;
    const v = studioValue(s, data, studio);
    expect(v.earningsCent).toBe(0);
    expect(v.debtCent).toBe(1_000_000);
    expect(v.totalCent).toBe(Math.max(0, v.brandsCent + v.techCent + v.teamCent - v.debtCent));
  });

  it("eigener Firmenwert: Gewinn der letzten drei vollen Jahre × 8, Kredite ziehen ab", () => {
    const data = testData();
    const s = listed(data);
    s.finance.ledger = [];
    for (const y of [2007, 2008, 2009]) for (let m = 0; m < 12; m++) s.finance.ledger.push(month(y, m, 200_000 * USD, 100_000 * USD));
    s.finance.loanCent = 5_000_000;
    const v = playerValue(s, data);
    expect(v.earningsCent).toBe(1_200_000 * USD * 8);
    expect(v.debtCent).toBe(5_000_000);
  });
});

describe("Börse (FRM-R51 bis FRM-R54)", () => {
  it("FRM-T15: Zielmarke gegen Gewinn und Rückkehr zur Mitte", () => {
    const data = testData();
    expect(targetDelta(data, 1_400_000 * USD, 1_050_000 * USD, 4_000_000 * USD)).toBe(10);
    expect(60 + 10 + meanReversion(data, 60)).toBe(69);
    expect(targetDelta(data, -200_000 * USD, 1_050_000 * USD, 4_000_000 * USD)).toBe(-15);
    expect(60 - 15 + meanReversion(data, 60)).toBe(44);
    expect(meanReversion(data, 25)).toBe(2);
  });

  it("FRM-T28: Kurs = W ÷ Aktien × (0,7 + 0,6 × S ÷ 100)", () => {
    const data = testData();
    const s = listed(data, 50);
    expect(sharePrice(s, data, 500_000_000 * USD)).toBe(50 * USD);
    s.stock.sentiment = 100;
    expect(sharePrice(s, data, 500_000_000 * USD)).toBe(65 * USD);
    s.stock.sentiment = 0;
    expect(sharePrice(s, data, 500_000_000 * USD)).toBe(35 * USD);
  });

  it("FRM-T29: Senken der Dividende kostet im selben Quartal einmalig 8, danach +1 statt +3", () => {
    const data = testData();
    const s = listed(data, 50);
    s.finance.ledger = [];
    s.stock.targetCent = 0;
    s.stock.dividend = "hoch";
    setDividend(s, { type: "dividend", level: "niedrig" });
    s.week = (2010 - s.startYear) * 52 + 13;
    data.stock.events.phase = { boom: 0, normal: 0, krise: 0 };
    data.stock.delta.up = 0;
    stockQuarter(s, data);
    expect(s.stock.sentiment).toBe(50 - 8);
    const before = s.stock.sentiment;
    s.stock.targetCent = 0;
    s.week += 13;
    stockQuarter(s, data);
    expect(s.stock.sentiment).toBe(before + 1 + meanReversion(data, before));
  });

  it("FRM-T30: Hauptversammlung bei S = 25: genau eine Pflicht-Entscheidung; Ablehnen 15, Annehmen 33", () => {
    const data = testData();
    const s = listed(data, 25);
    s.week = (2010 - s.startYear) * 52 + 51;
    assemblyStep(s, data);
    assemblyStep(s, data);
    const events = s.events.filter((e) => e.kind === "hauptversammlung");
    expect(events).toHaveLength(1);
    const a = structuredClone(s);
    applyAssembly(a, data, events[0]!, "ablehnen");
    expect(a.stock.sentiment).toBe(15);
    const b = structuredClone(s);
    applyAssembly(b, data, { ...events[0]!, stockDemand: "sparprogramm" }, "annehmen");
    expect(b.stock.sentiment).toBe(33);
    expect(b.stock.savingsUntilWeek).toBe(b.week + 52);
  });

  it("FRM-T31: Kapitalerhöhung bei S = 65 gesperrt; bei 72 möglich, danach 67 und im selben Jahr gesperrt", () => {
    const data = testData();
    const s = listed(data, 65);
    const input = { type: "capitalRaise" as const, shareBp: 1000 };
    expect(validateCapitalRaise(s, data, input)).toBe("error.raiseSentiment");
    s.stock.sentiment = 72;
    expect(validateCapitalRaise(s, data, input)).toBeNull();
    capitalRaise(s, data, input);
    expect(s.stock.sentiment).toBe(67);
    expect(s.stock.shares).toBe(11_000_000);
    s.stock.sentiment = 80;
    expect(validateCapitalRaise(s, data, input)).toBe("error.raiseYear");
  });

  it("FRM-R51: Börsengang erst ab 2000, 60 Personen (Entscheidung Projektleitung 02.11.2026), drei Jahre Gewinn, Mindestumsatz und Kreditnote", () => {
    const data = testData();
    const s = neutralGame(data);
    const b = ipoBlockers(s, data);
    for (const k of ["stock.block.year", "stock.block.people", "stock.block.profit", "stock.block.revenue"]) expect(b).toContain(k);
    const next = tick(s, data, [{ type: "ipo", shareBp: 3000 }]);
    expect(next.stock.listed).toBe(false);
  });

  it("Spielstand 52 → 53: nicht an der Börse", () => {
    const data = testData();
    const old = structuredClone(neutralGame(data)) as unknown as Record<string, unknown>;
    old.schemaVersion = 52;
    delete old.stock;
    expect(migrateState(old as never).stock.listed).toBe(false);
  });
});
