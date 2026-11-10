// Teilschritt 4.1: Interesse und Marketing-Budget (MKT-R01 bis MKT-R04, MKT-R06, MKT-F1, MKT-F2).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { clampBudget, disappointment, fairInterest, genreAverage, halfEffectCent, interestStep, reachCostCent } from "../../src/sim/systems/marketing";
import { competitionFactor, weeklyDemand } from "../../src/sim/systems/markt";
import { forecast } from "../../src/sim/systems/produkte/forecast";
import { brandStrength, newBrand } from "../../src/sim/systems/marken";
import type { AiProduct } from "../../src/sim/model/types";
import { migrateState } from "../../src/sim/save";
import { input, lastProject, neutralGame, playProject, testData, untilReady } from "../helpers";

describe("Interesse (MKT-F1)", () => {
  it("MKT-T03 ohne Marketing nach der Ankündigung sinkt das Interesse über 26 Wochen um mindestens 30 %", () => {
    const data = testData();
    let i = 100_000;
    for (let w = 0; w < 26; w++) i = interestStep(data, 1990, i, 0, true, 0, 10_000_000).next;
    expect(i).toBeLessThanOrEqual(70_000);
  });

  it("MKT-T11 bei 2 Mio. Zielgruppe und Reichweite 0,5 übersteigt das Interesse nie 1 Mio.", () => {
    const data = testData();
    let i = 0;
    for (let w = 0; w < 104; w++) {
      i = interestStep(data, 2000, i, 500_000_000, true, 0, 1_000_000).next;
      expect(i).toBeLessThanOrEqual(1_000_000);
    }
    expect(i).toBe(1_000_000);
  });

  it("MKT-T12 vor der Ankündigung ist g = 0 und Marketing wirkt nicht; nur die Marke bringt Interesse", () => {
    const data = testData();
    const before = interestStep(data, 1990, 10_000, 1_000_000, false, 0, 10_000_000);
    expect(before.parts.wordOfMouth).toBe(0);
    expect(before.parts.reach).toBe(0);
    expect(before.next).toBe(9_800);
    expect(interestStep(data, 1990, 10_000, 1_000_000, false, 500, 10_000_000).next).toBe(10_300);
    const after = interestStep(data, 1990, 10_000, 1_000_000, true, 0, 10_000_000);
    expect(after.parts.wordOfMouth).toBeGreaterThan(0);
    expect(after.parts.reach).toBe(2_500);
  });

  it("MKT-F1 Startwerte: 25 Personen je 100 USD (1990), M½ = 1 % des Mittel-Budgets der Epoche", () => {
    const data = testData();
    expect(reachCostCent(data, 1990)).toBe(400);
    expect(reachCostCent(data, 2020)).toBeGreaterThan(reachCostCent(data, 1990));
    // Mittel-Budget 1990: 4.000 USD je Personenmonat · 60 = 240.000 USD, davon 1 % = 2.400 USD.
    expect(halfEffectCent(data, 1990)).toBe(240_000);
    // Netto-Wachstum aus der Mundpropaganda erst über 2 · M½: g · M / (M + M½) > δ.
    const slow = interestStep(data, 1990, 100_000, 400_000, true, 0, 10_000_000).parts;
    const fast = interestStep(data, 1990, 100_000, 1_000_000, true, 0, 10_000_000).parts;
    expect(slow.wordOfMouth).toBeLessThan(slow.decay);
    expect(fast.wordOfMouth).toBeGreaterThan(fast.decay);
  });

  it("MKT-T18 budgetPct 1.500 wird angenommen, 1.501 auf 1.500 begrenzt", () => {
    const data = testData();
    expect(clampBudget(data, 1500)).toBe(1500);
    expect(clampBudget(data, 1501)).toBe(1500);
    expect(clampBudget(data, -5)).toBe(0);
  });
});

describe("Marketing im Projekt (MKT-R02 bis MKT-R04, MKT-R06)", () => {
  it("MKT-R04 Autopilot: Standardbudget 30 %, Ankündigung ab Pre-Production, Kosten im Monatsbuch", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input()]);
    const id = lastProject(s).id;
    expect(lastProject(s).marketing.budgetPermille).toBe(300);
    expect(lastProject(s).marketing.announcedWeek).toBeNull();
    for (let i = 0; i < 12; i++) s = tick(s, data);
    const p = s.projects.find((x) => x.id === id)!;
    expect(p.marketing.announcedWeek).not.toBeNull();
    expect(p.marketing.interest).toBeGreaterThan(0);
    expect(p.marketing.spentCent).toBeGreaterThan(0);
    const booked = s.finance.ledger.reduce((sum, m) => sum + m.costs.marketing, 0);
    expect(booked).toBe(p.marketing.spentCent);
  });

  it("MKT-R03 ohne Ankündigung kein Marketing: Autopilot aus, kein Interesse und keine Ausgaben", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input()]);
    const id = lastProject(s).id;
    s = tick(s, data, [{ type: "setMarketing", projectId: id, autoAnnounce: false }]);
    for (let i = 0; i < 12; i++) s = tick(s, data);
    const p = s.projects.find((x) => x.id === id)!;
    expect(p.marketing.announcedWeek).toBeNull();
    expect(p.marketing.interest).toBe(0);
    expect(p.marketing.spentCent).toBe(0);
  });

  it("MKT-R06 jetzt ankündigen; zweimal ankündigen wird abgelehnt", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input()]);
    const id = lastProject(s).id;
    s = tick(s, data, [{ type: "setMarketing", projectId: id, announce: true, budgetPermille: 1501 }]);
    const p = s.projects.find((x) => x.id === id)!;
    expect(p.marketing.announcedWeek).toBe(s.week - 1);
    expect(p.marketing.budgetPermille).toBe(1500);
    expect(validateInput(s, data, { type: "setMarketing", projectId: id, announce: true })).toBe("error.alreadyAnnounced");
  });

  it("MKT-F2 Hype steuert den Verkaufsstart: mehr Interesse, mehr Startabsatz", () => {
    const data = testData();
    const s = neutralGame(data);
    const subject = { genre: "action", theme: "scifi", scope: "klein" as const, platforms: ["fuchs"] };
    const none = weeklyDemand(s, data, subject, 70000, 0, s.week, 10000);
    const hyped = weeklyDemand(s, data, { ...subject, interest: 50_000 }, 70000, 0, s.week, 10000);
    expect(hyped - none).toBeGreaterThanOrEqual(4_900);
    // Die Wertung steuert den Verlauf: nach 12 Wochen ist vom Hype nur noch ein Teil übrig.
    const later = weeklyDemand(s, data, { ...subject, interest: 50_000 }, 70000, 12, s.week + 12, 10000);
    expect(later).toBeLessThan(hyped);
  });

  it("Release mit Ankündigung verkauft in der Startwoche mehr als ohne", () => {
    const data = testData();
    const base = neutralGame(data);
    const withHype = playProject(base, data, input());
    const quiet = (() => {
      let s = tick(base, data, [input()]);
      const id = lastProject(s).id;
      s = tick(s, data, [{ type: "setMarketing", projectId: id, autoAnnounce: false }]);
      while (lastProject(s).status === "laeuft") s = tick(s, data);
      for (let i = 0; i < 2; i++) s = tick(s, data);
      return tick(s, data, [{ type: "release", projectId: id }]);
    })();
    expect(lastProject(withHype).sales!.sold).toBeGreaterThan(lastProject(quiet).sales!.sold);
  });

  it("Migration 25 → 26: Projekte bekommen Marketing mit Autopilot, das Monatsbuch eine Spalte Marketing", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    const old = structuredClone(s) as unknown as Record<string, unknown> & { schemaVersion: number };
    old.schemaVersion = 25;
    for (const p of old.projects as Record<string, unknown>[]) delete p.marketing;
    for (const m of (old.finance as { ledger: { costs: Record<string, number> }[] }).ledger) delete m.costs.marketing;
    const migrated = migrateState(old);
    expect(migrated.projects[0]!.marketing.budgetPermille).toBe(300);
    expect(migrated.projects[0]!.marketing.lastCostCent).toBe(s.projects[0]!.costCent);
    expect(migrated.finance.ledger[0]!.costs.marketing).toBe(0);
  });
});

describe("Interesse am Release (MKT-R05, MKT-R07, MKT-R08)", () => {
  it("MKT-T01 ein Release neben einem großen KI-Titel verkauft in den ersten 4 Wochen mindestens 25 % weniger", () => {
    const data = testData();
    const s = neutralGame(data);
    s.ai.generated = true;
    s.ai.studios = [];
    s.ai.products = [];
    const subject = { genre: "action", theme: "scifi", scope: "klein" as const, platforms: ["fuchs"], interest: 20_000 };
    const alone = competitionFactor(s, data, s.week);
    const big: AiProduct = {
      id: 1, studioId: 1, brandId: null, brandLicenseId: null, fanUnitsPerWeek: 0, genre: "action", theme: "scifi", scope: "mittel",
      platforms: ["fuchs"], scoreBp: 90000, releaseWeek: s.week, competitionBp: 10000, sold: 0, revenueCent: 0, engineId: null,
      contractId: null, demandBp: 10000, duelWith: null,
    };
    s.ai.products = [big];
    const crowded = competitionFactor(s, data, s.week);
    let a = 0;
    let b = 0;
    for (let t = 0; t < 4; t++) {
      a += weeklyDemand(s, data, subject, 70000, t, s.week + t, alone);
      b += weeklyDemand(s, data, subject, 70000, t, s.week + t, crowded);
    }
    expect(b).toBeLessThanOrEqual(a - Math.trunc(a / 4));
  });

  it("MKT-T02 Interesse doppelt so hoch wie passend: Spielerwertung unter der Presse, Markenstärke sinkt", () => {
    const data = testData();
    const s = neutralGame(data);
    const brand = newBrand(s, data, "Testmarke");
    brand.reputationBp = 6000;
    const fair = fairInterest(s, data, ["fuchs"], 70000);
    const before = brandStrength(data, brand);
    const ok = disappointment(s, data, ["fuchs"], fair, 70000, brand);
    expect(ok.userScoreBp).toBe(70000);
    expect(brandStrength(data, brand)).toBe(before);
    const hyped = disappointment(s, data, ["fuchs"], fair * 2, 70000, brand);
    expect(hyped.userScoreBp).toBeLessThan(70000);
    expect(hyped.userScoreBp).toBeGreaterThanOrEqual(70000 - 20000);
    expect(brandStrength(data, brand)).toBeLessThan(before);
    // Ab 3 × gilt die volle Folge: −2,0 Punkte.
    expect(disappointment(s, data, ["fuchs"], fair * 4, 70000, undefined).userScoreBp).toBe(50000);
  });

  it("MKT-R07 Demo: über dem Genre-Schnitt steigt das Interesse, darunter sinkt es", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input()]);
    const id = lastProject(s).id;
    s = untilReady(s, data, id);
    const p = s.projects.find((x) => x.id === id)!;
    p.marketing.interest = 10_000;
    const score = forecast(s, data, p).scoreBp;
    const low = structuredClone(s);
    data.marketing.genreAverageDefaultBp = score - 1;
    const up = tick(s, data, [{ type: "setMarketing", projectId: id, demo: "vorab" }]).projects.find((x) => x.id === id)!;
    data.marketing.genreAverageDefaultBp = score + 1;
    const down = tick(low, data, [{ type: "setMarketing", projectId: id, demo: "vorab" }]).projects.find((x) => x.id === id)!;
    expect(up.marketing.interest).toBeGreaterThan(down.marketing.interest);
    expect(up.marketing.demoDone).toBe(true);
    expect(validateInput(tick(low, data, [{ type: "setMarketing", projectId: id, demo: "vorab" }]), data, { type: "setMarketing", projectId: id, demo: "vorab" })).toBe("error.demoDone");
  });

  it("MKT-R07 eine Demo vorab gibt es erst ab Beta", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    expect(validateInput(s, data, { type: "setMarketing", projectId: lastProject(s).id, demo: "vorab" })).toBe("error.tooEarlyPhase");
    expect(validateInput(s, data, { type: "setMarketing", projectId: lastProject(s).id, demo: "zumRelease" })).toBeNull();
  });

  it("MKT-R08 Creator-Zugang erst ab 2010; macht die Schwächen öffentlich und verdoppelt den Zuwachs", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input()]);
    const id = lastProject(s).id;
    s = untilReady(s, data, id);
    s = tick(s, data, [{ type: "setMarketing", projectId: id, announce: true }]);
    expect(validateInput(s, data, { type: "setMarketing", projectId: id, creator: true })).toBe("error.locked");
    data.marketing.creatorFromYear = 1980;
    s = tick(s, data, [{ type: "setMarketing", projectId: id, creator: true }]);
    const p = s.projects.find((x) => x.id === id)!;
    expect(p.marketing.creatorUsed).toBe(true);
    expect(p.marketing.creatorWeeksLeft).toBe(data.marketing.creatorWeeks - 1);
    expect(p.marketing.weaknesses.length).toBeLessThanOrEqual(3);
    expect(validateInput(s, data, { type: "setMarketing", projectId: id, creator: true })).toBe("error.creatorUsed");
    const normal = interestStep(data, 2010, 10_000, 1_000_000, true, 0, 10_000_000).parts;
    const boosted = interestStep(data, 2010, 10_000, 1_000_000, true, 0, 10_000_000, 2).parts;
    expect(boosted.reach).toBe(normal.reach * 2);
  });

  it("Genre-Schnitt aus den KI-Titeln der letzten zwei Jahre, sonst 7,0", () => {
    const data = testData();
    const s = neutralGame(data);
    s.ai.products = [];
    expect(genreAverage(s, data, "action")).toBe(70000);
  });

  it("Migration 26 → 27: Marketing bekommt Demo und Creator-Zugang", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    const old = structuredClone(s) as unknown as Record<string, unknown> & { schemaVersion: number };
    old.schemaVersion = 26;
    for (const p of old.projects as { marketing: Record<string, unknown> }[]) delete p.marketing.demo;
    const migrated = migrateState(old);
    expect(migrated.projects[0]!.marketing.demo).toBe("keine");
    expect(migrated.projects[0]!.marketing.weaknesses).toEqual([]);
  });
});
