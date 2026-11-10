// Teilschritt 1.3: Schwierigkeit und Finanzen (S10 Presets, FRM-R37 bis FRM-R41, PRD-R52, A20).
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import { newGame } from "../../src/sim/game";
import { anchorValue, creditLimit, ledgerNow, monthlyRent, quarterlyTax, weeklyRent } from "../../src/sim/systems/finanzen";
import { maxPersonsNow, validateMove } from "../../src/sim/systems/firma";
import { computeScore } from "../../src/sim/systems/produkte/score";
import { computeQuality } from "../../src/sim/systems/produkte/quality";
import { input, neutralGame, playProject, SEED_A, testData } from "../helpers";

function weeksUntil(state: ReturnType<typeof newGame>, data: ReturnType<typeof testData>, pred: (s: ReturnType<typeof newGame>) => boolean, max = 600) {
  let s = state;
  for (let i = 0; i < max && !pred(s); i++) s = tick(s, data);
  return s;
}

describe("Schwierigkeit (S10)", () => {
  it("KRN-R71 die Stufen ändern nur das Startgeld: Entspannt ×3, Normal ×1, Schwer ×0,8, Hardcore ×0,6 (Balancing 1.0, OFFENE-FRAGEN)", () => {
    const data = testData();
    const money = (preset: string) => newGame(data, SEED_A, { preset, pressRandom: "normal", decisionDensity: "normal", founderFocus: "gameplay" }).moneyCent;
    expect(money("normal")).toBe(5000000);
    expect(money("entspannt")).toBe(15000000);
    expect(money("schwer")).toBe(4000000);
    expect(money("hardcore")).toBe(3000000);
  });

  it("ZIE-R48 die Presse-Strenge kommt aus dem Preset, solange sie nicht ausdrücklich gesetzt ist", () => {
    const data = testData();
    const s = newGame(data, SEED_A, { preset: "schwer", pressRandom: "normal", decisionDensity: "normal", founderFocus: "gameplay" });
    expect(s.settings.pressStrictness).toBe(1);
  });

  it("PRD-R52 auf Leicht bekommt ein Spiel mit Passung ≥ 1,0 nie unter 5,0, auf Normal schon", () => {
    const data = testData();
    const easy = neutralGame(data, SEED_A, { preset: "leicht" });
    const normal = neutralGame(data, SEED_A);
    const qb = computeQuality(data, easy, { ...input({ features: ["punktejagd", "soundeffekte", "spielstand"] }), bugsBp: 0, people: easy.people, engineLevels: data.engine.starter });
    expect(qb.themeFitBp).toBe(10000);
    const low = computeScore(data, qb, 3_000_000, 10000, 0, null).scoreBp;
    expect(low).toBeLessThan(50000);
    expect(computeScore(data, qb, 3_000_000, 10000, 0, 50000).scoreBp).toBe(50000);
    expect(normal.settings.preset).toBe("normal");
  });
});

describe("Kosten (A20, FRM-T25)", () => {
  it("A20 Gehälter folgen dem Lohnniveau der Epoche: 2.500 USD 1980, 4.000 USD 1990", () => {
    const data = testData();
    const a = data.economy.salaryAnchorsCent;
    expect(anchorValue(a, 1980)).toBe(250000);
    expect(anchorValue(a, 1985)).toBe(325000);
    expect(anchorValue(a, 1990)).toBe(400000);
    let s = neutralGame(data);
    s = weeksUntil(s, data, (x) => x.week >= 53);
    expect(s.people[0]!.salaryCent).toBe(Math.trunc((250000 * anchorValue(a, 1981)) / 250000));
  });

  it("FRM-T25 die Garage kostet 1980 150 USD je Arbeitsplatz und Monat", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(weeklyRent(s, data)).toBe(Math.trunc((4 * 15000 * 12) / 52));
  });
});

describe("Büro (FRM-R21 bis FRM-R25, Entscheidung 1)", () => {
  it("FRM-R23 in die Garage passen höchstens 4 Personen; Bewerbungen bleiben dann aus", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(maxPersonsNow(s, data)).toBe(4);
    for (let i = 0; i < 2; i++) s.people.push({ ...structuredClone(s.people[0]!), id: 10 + i, isFounder: false });
    data.applications.chancePerWeekBp = 10000;
    let x = playProject(s, data, input());
    for (let i = 0; i < 20; i++) x = tick(x, data);
    expect(x.people).toHaveLength(4);
    expect(x.events.some((e) => e.kind === "bewerbung")).toBe(false);
  });

  it("S07 Grundrisse: Die Etage gibt es ab 1980 (frei wählbar): 15 Plätze, ab Etappe 3 begrenzt das Büro (15 + 20 % Überbelegung, FRM-R02 Teams ab 8)", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(validateMove(s, data, "etage")).toBeNull();
    expect(validateMove(s, data, "garage")).toBe("error.sameOffice");
    const moved = tick(s, data, [{ type: "moveOffice", office: "etage" }]);
    expect(moved.office.id).toBe("etage");
    expect(maxPersonsNow(moved, data)).toBe(18);
  });

  it("FRM-R24 Umzug: Kaution 3 Monatsmieten, zwei Wochen 70 % Leistung; FRM-R25 vor Vertragsende die halbe Restmiete", () => {
    const data = testData();
    let s = neutralGame(data);
    s.week = 5 * 52;
    s.office.sinceWeek = 5 * 52 - 13;
    s.office.hardware.year = s.startYear + 5;
    s.unlocks.etage = s.week;
    s = tick(s, data, [input({ platforms: ["standardpc"] })]);
    const before = s.moneyCent;
    const doneBefore = s.projects[0]!.effortDoneBp;
    const x = tick(s, data, [{ type: "moveOffice", office: "etage" }]);
    const rent = monthlyRent(s, data, 15);
    const penalty = Math.trunc((21 * monthlyRent(s, data, 4)) / 2);
    expect(x.log.some((l) => l.key === "log.moved" && l.params.cost === 3 * rent + penalty)).toBe(true);
    expect(x.projects[0]!.effortDoneBp - doneBefore).toBe(Math.trunc((2 * 10000 * 7000) / 10000));
    expect(x.moneyCent).toBeLessThan(before - 3 * rent);
  });
});

describe("Insolvenz (FRM-R40, FRM-R41)", () => {
  it("FRM-T09 auf Normal: nach 5 Monaten im Minus noch nicht, nach 6 Monaten insolvent", () => {
    const data = testData();
    let s = neutralGame(data);
    s.moneyCent = -100;
    s = weeksUntil(s, data, (x) => x.finance.insolvencyMonths >= 5);
    expect(s.gameOver).toBeNull();
    s = weeksUntil(s, data, (x) => x.gameOver !== null, 10);
    expect(s.gameOver?.reason).toBe("insolvenz");
    const frozen = tick(s, data);
    expect(frozen.week).toBe(s.week);
  });

  it("FRM-T09 ein positiver Kontostand setzt den Zähler zurück", () => {
    const data = testData();
    let s = neutralGame(data);
    s.moneyCent = -100;
    s = weeksUntil(s, data, (x) => x.finance.insolvencyMonths >= 3);
    s.moneyCent = 10_000_000;
    s = weeksUntil(s, data, (x) => x.finance.insolvencyMonths === 0, 6);
    expect(s.finance.insolvencyMonths).toBe(0);
  });

  it("FRM-R41 auf Leicht gibt es 24 Monate keine Insolvenz; der Stand bleibt bei 0, Kosten werden zinsloser Kredit", () => {
    const data = testData();
    let s = neutralGame(data, SEED_A, { preset: "leicht" });
    s.moneyCent = 0;
    s = weeksUntil(s, data, (x) => x.week >= 100);
    expect(s.moneyCent).toBe(0);
    expect(s.gameOver).toBeNull();
    expect(s.finance.insolvencyMonths).toBe(0);
    expect(s.finance.cushionDebtCent).toBeGreaterThan(0);
  });
});

describe("Kredite (FRM-R39)", () => {
  it("Die Garage 1980 hat eine Kreditlinie bis 50.000 USD zu 9 %", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(creditLimit(s, data)).toEqual({ limitCent: 5000000, rateBp: 900 });
  });

  it("Ein Kredit bringt Geld und kostet monatlich Zinsen; über den Rahmen geht es nicht", () => {
    const data = testData();
    let s = neutralGame(data);
    const before = s.moneyCent;
    s = tick(s, data, [{ type: "takeLoan", amountCent: 2_000_000 }]);
    expect(s.finance.loanCent).toBe(2_000_000);
    const tooMuch = tick(s, data, [{ type: "takeLoan", amountCent: 4_000_000 }]);
    expect(tooMuch.finance.loanCent).toBe(2_000_000);
    s = weeksUntil(s, data, (x) => x.finance.ledger.some((m) => m.costs.interest > 0));
    const interest = s.finance.ledger.find((m) => m.costs.interest > 0)!.costs.interest;
    expect(interest).toBe(Math.trunc((2_000_000 * 900) / 120000));
    s = tick(s, data, [{ type: "repayLoan", amountCent: 2_000_000 }]);
    expect(s.finance.loanCent).toBe(0);
    expect(s.moneyCent).toBeLessThan(before);
  });

});

describe("Steuern (A46, FRM-R72)", () => {
  it("A46 Gewinnsteuer quartalsweise: 25 % auf den Gewinn des Vorquartals, gebucht in Woche 14", () => {
    const data = testData();
    let s = neutralGame(data);
    // Ein Quartal mit 100.000 USD Einnahmen: Steuer auf (Einnahmen − Kosten) des Quartals.
    s = tick(s, data);
    ledgerNow(s).income.sales += 10_000_000;
    s.moneyCent += 10_000_000;
    while (s.week < 13) s = tick(s, data);
    const q1 = s.finance.ledger.filter((m) => m.month < 3);
    const profit = q1.reduce((sum, m) => sum + m.income.sales + m.income.contracts
      - m.costs.wages - m.costs.rent - m.costs.interest - m.costs.production - m.costs.storage - m.costs.other, 0);
    const before = s.moneyCent;
    s = tick(s, data);
    const tax = s.finance.ledger.find((m) => m.month === 3)!.costs.tax;
    expect(tax).toBe(Math.trunc((profit * 2500) / 10000));
    expect(before - s.moneyCent).toBeGreaterThanOrEqual(tax);
  });

  it("A46 FRM-R72 Verluste werden vorgetragen und mindern die Steuer späterer Gewinne", () => {
    const data = testData();
    const s = neutralGame(data);
    s.week = 13;
    const book = ledgerNow(s);
    s.finance.ledger = [
      { year: 1980, month: 0, income: { sales: 0, contracts: 0, licenses: 0, merch: 0 }, costs: { wages: 4_000_000, rent: 0, interest: 0, production: 0, storage: 0, other: 0, tax: 0, licenses: 0, marketing: 0, server: 0 } },
      book,
    ];
    expect(quarterlyTax(s, data, book)).toBe(0);
    expect(s.finance.lossCarry).toEqual([{ quarter: 0, cent: 4_000_000 }]);
    // Folgequartal mit 10.000.000 Gewinn: Bemessung 6.000.000, Steuer 1.500.000.
    s.week = 26;
    const april = { year: 1980, month: 3, income: { sales: 10_000_000, contracts: 0, licenses: 0, merch: 0 }, costs: { wages: 0, rent: 0, interest: 0, production: 0, storage: 0, other: 0, tax: 0, licenses: 0, marketing: 0, server: 0 } };
    s.finance.ledger = [april];
    expect(quarterlyTax(s, data, april)).toBe(1_500_000);
    expect(s.finance.lossCarry).toEqual([]);
  });

  it("FRM-R72 ein Verlustvortrag verfällt nach fünf Jahren", () => {
    const data = testData();
    const s = neutralGame(data);
    s.finance.lossCarry = [{ quarter: 0, cent: 5_000_000 }];
    s.week = 13 * 22;
    const d = { year: 1985, month: 3, income: { sales: 1_000_000, contracts: 0, licenses: 0, merch: 0 }, costs: { wages: 0, rent: 0, interest: 0, production: 0, storage: 0, other: 0, tax: 0, licenses: 0, marketing: 0, server: 0 } };
    s.finance.ledger = [d];
    expect(quarterlyTax(s, data, d)).toBe(250_000);
  });
});
