// Langzeitmotivation (Konzept-Langzeitmotivation.md, Prüfung Fable 03.11.2026): Strategiekonferenz, Erzrivale, Epochen-Fragen.
import { describe, expect, it } from "vitest";
import { applyInputs, tick, validateInput } from "../../src/sim/tick";
import { migrateState } from "../../src/sim/save";
import { buildView } from "../../src/sim/view/view";
import { epochTier, epochValue, motivationStep } from "../../src/sim/systems/motivation";
import { lastProject, input, neutralGame, playProject, testData } from "../helpers";

describe("Strategiekonferenz: drei Jahresziele, Wahl, Belohnung ohne Geld", () => {
  it("Zum Jahresbeginn liegen drei Ziele aus; die Wahl gilt, ohne Wahl nimmt das Studio nach der Frist das erste", () => {
    const data = testData();
    let s = neutralGame(data);
    s = tick(s, data, []);
    expect(s.motivation.offers.length).toBe(data.goals.motivation.conference.offers);
    expect(new Set(s.motivation.offers.map((o) => o.id)).size).toBe(s.motivation.offers.length);
    expect(buildView(s, data).motivation.offers.length).toBe(s.motivation.offers.length);
    const second = s.motivation.offers[1]!.id;
    expect(validateInput(s, data, { type: "annualGoal", index: 7 })).not.toBeNull();
    s = applyInputs(s, data, [{ type: "annualGoal", index: 1 }]);
    expect(s.motivation.annual?.id).toBe(second);
    expect(s.motivation.offers).toEqual([]);

    let t = tick(neutralGame(data), data, []);
    const first = t.motivation.offers[0]!.id;
    for (let i = 0; i < data.goals.motivation.conference.pickWithinWeeks; i++) t = tick(t, data, []);
    expect(t.motivation.annual?.id).toBe(first);
  });

  it("Ein erreichtes Ziel zählt die Serie hoch und gibt Ruf; ein offenes Ziel ist am Jahresende verfehlt", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const p = lastProject(s);
    const year = p.result!.year;
    const money = s.moneyCent;
    s.motivation.offers = [];
    s.motivation.annual = { id: "releases", kind: "releases", year, target: 1, param: null, reward: { kind: "ruf", bp: 400 }, status: "offen", week: null };
    const rep = s.studioReputationBp;
    const streak = s.motivation.streak;
    motivationStep(s, data);
    expect(s.motivation.annual!.status).toBe("erreicht");
    expect(s.motivation.streak).toBe(streak + 1);
    expect(s.studioReputationBp).toBe(Math.min(10000, rep + 400));
    expect(s.moneyCent).toBe(money);

    s.motivation.annual = { id: "releases", kind: "releases", year, target: 9, param: null, reward: { kind: "ruf", bp: 400 }, status: "offen", week: null };
    s.week = (year - s.startYear) * 52 + 51;
    motivationStep(s, data);
    expect(s.motivation.annual!.status).toBe("verfehlt");
    expect(s.motivation.streak).toBe(0);
    expect(s.motivation.bestStreak).toBeGreaterThanOrEqual(streak + 1);
  });
});

describe("Epochen-Fragen: Stufen nach Schwellen, bei der Rangliste umgekehrt", () => {
  it("Garage zählt Hits des Jahrzehnts; Rangplätze geben Titel ab der Schwelle", () => {
    const data = testData();
    const garage = data.goals.motivation.epochs.find((e) => e.id === "garage")!;
    expect(epochTier(garage, 0)).toBe(0);
    expect(epochTier(garage, garage.tiers[0]!)).toBe(1);
    expect(epochTier(garage, garage.tiers[2]!)).toBe(3);
    const branche = data.goals.motivation.epochs.find((e) => e.metric === "rank")!;
    expect(epochTier(branche, 0)).toBe(0);
    expect(epochTier(branche, branche.tiers[0]! + 1)).toBe(0);
    expect(epochTier(branche, 1)).toBe(3);
    const s = playProject(neutralGame(data), data, input());
    lastProject(s).result!.scoreBp = data.brands.hitScoreBp;
    expect(epochValue(s, data, garage)).toBe(1);
  });
});

describe("Erzrivale: ab dem ersten Hit, Duelle im Release-Fenster", () => {
  it("Nach einem Hit wird ein Rivale zum Erzrivalen; ein Release im Fenster zählt als Duell", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const p = lastProject(s);
    p.result!.scoreBp = data.brands.hitScoreBp;
    p.result!.week = s.week;
    expect(s.ai.rivals.length).toBeGreaterThan(0);
    motivationStep(s, data);
    const a = s.motivation.archrival!;
    expect(a).not.toBeNull();
    expect(s.ai.rivals).toContain(a.studioId);
    const product = { ...s.ai.products[0]!, id: 99999, studioId: a.studioId, releaseWeek: s.week, scoreBp: p.result!.scoreBp - 1 };
    s.ai.products.push(product);
    motivationStep(s, data);
    expect(s.motivation.archrival!.wins).toBe(1);
    motivationStep(s, data);
    expect(s.motivation.archrival!.wins).toBe(1);
  });
});

describe("Migration 63 → 64", () => {
  it("Ältere Stände bekommen leere Langzeitmotivation", () => {
    const data = testData();
    const old = structuredClone(neutralGame(data)) as unknown as Record<string, unknown> & { schemaVersion: number };
    delete old.motivation;
    old.schemaVersion = 63;
    const m = migrateState(old).motivation;
    expect(m.annual).toBeNull();
    expect(m.offers).toEqual([]);
    expect(m.epochTitles).toEqual([]);
  });
});
