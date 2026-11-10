// Balancing Spätspiel (Entscheidung Projektleitung 04.11.2026 „Kosten wachsen mit Erfolg“): Gewinnbeteiligung und Star-Gehälter.
import { describe, expect, it } from "vitest";
import type { LedgerMonth } from "../../src/sim/model/types";
import { profitShareBp, profitShareStep, starSalaryStep } from "../../src/sim/systems/erfolg";
import { dateOf } from "../../src/sim/calendar";
import { neutralGame, testData } from "../helpers";

function month(year: number, m: number, income: number, wages: number): LedgerMonth {
  return { year, month: m, income: { sales: income, contracts: 0, licenses: 0, merch: 0 }, costs: { wages, rent: 0, interest: 0, production: 0, storage: 0, other: 0, tax: 0, licenses: 0, marketing: 0, server: 0 } };
}

function richStudio(people: number, year: number) {
  const data = testData();
  const s = neutralGame(data);
  s.week = (year - s.startYear) * 52 + 13; // erste Woche des zweiten Quartals
  while (s.people.length < people) s.people.push({ ...structuredClone(s.people[0]!), id: 1000 + s.people.length, isFounder: false });
  return { data, s };
}

describe("Gewinnbeteiligung", () => {
  it("gilt erst ab fromYear und minPeople und wächst mit Jahr und Größe", () => {
    const { data, s } = richStudio(6, 1985);
    expect(profitShareBp(s, data)).toBe(0);
    const late = richStudio(15, 2020);
    const big = richStudio(120, 2020);
    expect(profitShareBp(late.s, late.data)).toBeGreaterThan(0);
    expect(profitShareBp(big.s, big.data)).toBeGreaterThan(profitShareBp(late.s, late.data));
  });

  it("zahlt den Anteil am Vorquartalsgewinn, nichts bei Verlust, und hebt die Moral", () => {
    const { data, s } = richStudio(15, 2020);
    const y = dateOf(s.startYear, 0 + (2020 - s.startYear) * 52).year;
    s.moneyCent = 1_000_000_000;
    s.finance.ledger = [month(y, 0, 1_000_000, 200_000), month(y, 1, 1_000_000, 200_000), month(y, 2, 1_000_000, 200_000)];
    const book = month(y, 3, 0, 0);
    s.finance.ledger.push(book);
    const money = s.moneyCent;
    const morale = s.people[0]!.moraleBp;
    const bonus = profitShareStep(s, data, book);
    expect(bonus).toBe(Math.trunc((2_400_000 * profitShareBp(s, data)) / 10000));
    expect(money - s.moneyCent).toBe(bonus);
    expect(book.costs.bonus).toBe(bonus);
    expect(s.people[0]!.moraleBp).toBeGreaterThanOrEqual(morale);
    s.finance.ledger = [month(y, 0, 0, 200_000), month(y, 1, 0, 200_000), month(y, 2, 0, 200_000), month(y, 3, 0, 0)];
    expect(profitShareStep(s, data, s.finance.ledger[3]!)).toBe(0);
  });
});

describe("Star-Gehälter", () => {
  it("Starke Angestellte verlangen mehr, wenn die Kasse über der Reserve liegt; Gründer und Schwache nicht", () => {
    const { data, s } = richStudio(6, 2020);
    const star = s.people.find((p) => !p.isFounder)!;
    for (const k of Object.keys(star.strength) as (keyof typeof star.strength)[]) star.strength[k] = 95;
    const weak = s.people.filter((p) => !p.isFounder)[1]!;
    for (const k of Object.keys(weak.strength) as (keyof typeof weak.strength)[]) weak.strength[k] = 30;
    s.finance.ledger = [month(2019, 11, 0, 100_000)];
    s.moneyCent = 100_000 * data.economy.success.starSalary.reserveMonths - 1;
    const before = star.salaryCent;
    expect(starSalaryStep(s, data)).toBe(0);
    s.moneyCent = 100_000 * data.economy.success.starSalary.reserveMonths * 10;
    const weakBefore = weak.salaryCent;
    expect(starSalaryStep(s, data)).toBeGreaterThanOrEqual(1);
    expect(star.salaryCent).toBeGreaterThan(before);
    expect(weak.salaryCent).toBe(weakBefore);
  });
});
