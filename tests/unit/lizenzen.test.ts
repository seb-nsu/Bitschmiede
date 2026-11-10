// Teilschritt 3.4: Engine-Lizenzmarkt (S04 LIZ-T01 bis LIZ-T15 soweit Etappe 3, KI-R28, KI-R29).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { newGame, DEFAULT_SETTINGS } from "../../src/sim/game";
import { foundEngine, licenseQuality } from "../../src/sim/systems/engine";
import { applyDecision } from "../../src/sim/systems/ereignisse";
import { liveStudios } from "../../src/sim/systems/ki/studios";
import {
  accrueRoyalty, beatsHurdle, changeTerms, chooseEngine, createContract, engineById, exclusivityBlocks, freeTerms, hurdleBp,
  licensingMonthStep, licensingWeekStep, offeredTemplates, playerMarketEngine, priceShock, retrainTempo, royaltyDue,
  satisfactionFactors, setLicenseModel, statusFor, templateTerms, termsCost,
} from "../../src/sim/systems/lizenzen";
import { input, SEED_A, testData } from "../helpers";
import type { GameData, GameState, LicenseTerms, MarketEngine } from "../../src/sim/model/types";

function withPlayerEngine(data: GameData): GameState {
  const s = newGame(data, SEED_A, DEFAULT_SETTINGS);
  foundEngine(s, data, "Testwerk");
  licensingWeekStep(s, data);
  return s;
}

function aiEngine(s: GameState): MarketEngine {
  return s.licensing.engines.find((e) => e.ownerId !== 0 && !e.closed)!;
}

function terms(over: Partial<LicenseTerms>): LicenseTerms {
  return { ...freeTerms(), sourceAccess: false, support: "basis", ...over };
}

describe("Konditionen und Royalties (LIZ-R03, LIZ-R07)", () => {
  it("LIZ-T02 Indie 5 % ab 1 Mio.: bei 800.000 USD keine Royalty, bei 1,5 Mio. 25.000 USD", () => {
    const t = terms({ royaltyBp: 500, royaltyThresholdCent: 100_000_000 });
    expect(royaltyDue(t, 0, 80_000_000)).toBe(0);
    expect(royaltyDue(t, 0, 150_000_000)).toBe(2_500_000);
    // Schrittweise ergibt dasselbe wie auf einmal.
    expect(royaltyDue(t, 0, 80_000_000) + royaltyDue(t, 80_000_000, 70_000_000)).toBe(2_500_000);
  });

  it("LIZ-T15 Vorlage Standard hat 5 % Royalty; Indie mit Schwelle, Abo ohne Royalty (LIZ-R04)", () => {
    const data = testData();
    const s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    expect(templateTerms(s, data, "standard", "spieler").royaltyBp).toBe(500);
    expect(templateTerms(s, data, "indie", "spieler").royaltyThresholdCent).toBeGreaterThan(0);
    const abo = templateTerms(s, data, "abo", "riese");
    expect(abo.royaltyBp).toBe(0);
    expect(abo.seatFeeCent).toBeGreaterThan(0);
  });

  it("LIZ-R21 Open Source: keine Pauschale, keine Royalty, kein Abo", () => {
    expect(termsCost(freeTerms(), 1_000_000_000, 50)).toBe(0);
  });
});

describe("Engine-Wahl (LIZ-R25, LIZ-R26, KI-R28)", () => {
  it("LIZ-T13 Hürde 0,10 + 0,30 · Erfahrung / 100", () => {
    const data = testData();
    expect(hurdleBp(data, 10000)).toBe(4000);
    expect(hurdleBp(data, 0)).toBe(1000);
  });

  it("LIZ-T14 Qualität (E − 0,3) / 0,85: 1,15 → 1, 0,3 → 0, 0,725 → 0,5", () => {
    const data = testData();
    expect(licenseQuality(data, 11500)).toBe(10000);
    expect(licenseQuality(data, 3000)).toBe(0);
    expect(licenseQuality(data, 7250)).toBe(5000);
  });

  it("LIZ-T05 U-Differenz 5 % bei hoher Erfahrung: kein Wechsel; ohne Erfahrung bei 15 % schon", () => {
    const data = testData();
    expect(beatsHurdle(data, 10500, 10000, 10000)).toBe(false);
    expect(beatsHurdle(data, 11500, 10000, 0)).toBe(true);
  });

  it("LIZ-T01 hausinterne Engine des Spielers: nach der ersten Anfrage bekommt kein Studio eine Lizenz", () => {
    const data = testData();
    const s = withPlayerEngine(data);
    s.licensing.firstRequestDone = true;
    // Die Spieler-Engine wäre die beste: alle Module auf dem Höchststand, mit Engine-Team.
    for (const m of Object.values(s.engine!.modules)) m.level = 9;
    s.people[0]!.assignment = { kind: "engine", id: 0 };
    for (const st of liveStudios(s)) {
      const c = chooseEngine(s, data, st, st.teams[0]!);
      expect(c.engineId).not.toBe(s.licensing.playerEngineId);
    }
    expect(s.licensing.contracts.some((c) => c.licensorId === 0)).toBe(false);
  });

  it("LIZ-R02 die erste Anfrage schaltet den Lizenzmarkt frei; annehmen macht die Engine kommerziell", () => {
    const data = testData();
    const s = withPlayerEngine(data);
    for (const m of Object.values(s.engine!.modules)) m.level = 9;
    s.people[0]!.assignment = { kind: "engine", id: 0 };
    for (const st of liveStudios(s).filter((x) => x.archetype !== "engine")) chooseEngine(s, data, st, st.teams[0]!);
    const req = s.events.filter((e) => e.kind === "lizenzanfrage");
    expect(req.length).toBe(1);
    expect(s.unlocks.lizenzmarkt).toBe(s.week);
    applyDecision(s, data, req[0]!, "annehmen");
    expect(playerMarketEngine(s)!.model).toBe("kommerziell");
    expect(s.licensing.contracts.filter((c) => c.licensorId === 0).length).toBe(1);
  });
});

describe("Verträge, Zufriedenheit, Vertrauen (LIZ-R06, LIZ-R12 bis LIZ-R18, LIZ-R37, LIZ-R38)", () => {
  it("LIZ-T08 Genre-Exklusivität für Kunde A sperrt Rennspiele für Kunde B", () => {
    const data = testData();
    const s = withPlayerEngine(data);
    const e = playerMarketEngine(s)!;
    const [a, b] = liveStudios(s);
    createContract(s, data, e, a!.id, "standard", terms({ royaltyBp: 500, exclusivity: { kind: "genre", id: "rennspiel" } }));
    expect(exclusivityBlocks(s, e.id, b!.id, "rennspiel", [])).toBe(true);
    expect(exclusivityBlocks(s, e.id, b!.id, "action", [])).toBe(false);
    expect(exclusivityBlocks(s, e.id, a!.id, "rennspiel", [])).toBe(false);
  });

  it("LIZ-T03 Support basis ohne Engine-Team: nach 6 Monaten gefährdet oder schlechter, Grund Support", () => {
    const data = testData();
    const s = withPlayerEngine(data);
    const c = createContract(s, data, playerMarketEngine(s)!, liveStudios(s)[0]!.id, "standard", terms({ royaltyBp: 500, support: "basis" }));
    for (let i = 0; i < 6; i++) licensingMonthStep(s, data);
    expect(["gefaehrdet", "abwandernd"]).toContain(c.status);
    expect(c.reason).toBe("license.reason.support");
  });

  it("LIZ-T11 Zufriedenheit bleibt in 0–100", () => {
    const data = testData();
    const s = withPlayerEngine(data);
    const c = createContract(s, data, playerMarketEngine(s)!, liveStudios(s)[0]!.id, "standard", terms({ royaltyBp: 500 }));
    c.satisfactionBp = 9500;
    c.fulfilled = 10;
    s.people[0]!.assignment = { kind: "engine", id: 0 };
    licensingMonthStep(s, data);
    expect(c.satisfactionBp).toBeLessThanOrEqual(10000);
    c.satisfactionBp = 300;
    c.rejected = 10;
    c.worseningBp = 10000;
    s.people[0]!.assignment = null;
    licensingMonthStep(s, data);
    expect(c.satisfactionBp).toBeGreaterThanOrEqual(0);
    expect(statusFor(data, c.satisfactionBp)).toBe("abwandernd");
  });

  it("LIZ-T04 Royalty 5 → 12 % für Bestandskunden kostet ≥ 40 Vertrauen, Rücknahme bringt höchstens die Hälfte", () => {
    const data = testData();
    const s = withPlayerEngine(data);
    const e = playerMarketEngine(s)!;
    e.trustBp = 8000;
    const old = templateTerms(s, data, "standard", "spieler");
    const worse = { ...old, royaltyBp: 1200 };
    changeTerms(s, data, e, old, worse);
    const loss = 8000 - e.trustBp;
    expect(loss).toBeGreaterThanOrEqual(4000);
    const before = e.trustBp;
    changeTerms(s, data, e, worse, old);
    expect(e.trustBp - before).toBeLessThanOrEqual(Math.floor(loss / 2));
    expect(e.trustBp - before).toBeGreaterThan(0);
  });

  it("LIZ-T12 kostenlos → 2 % Royalty: Vertrauen 70 fällt auf genau 40", () => {
    const data = testData();
    const s = withPlayerEngine(data);
    const e = playerMarketEngine(s)!;
    e.trustBp = 7000;
    changeTerms(s, data, e, freeTerms(), { ...freeTerms(), royaltyBp: 200 });
    expect(e.trustBp).toBe(4000);
  });

  it("LIZ-R24 Open Source zurück zu Gebühren kostet 40 Vertrauen", () => {
    const data = testData();
    const s = withPlayerEngine(data);
    const e = playerMarketEngine(s)!;
    setLicenseModel(s, data, "open_source");
    e.trustBp = 7000;
    setLicenseModel(s, data, "kommerziell");
    expect(e.trustBp).toBe(3000);
    expect(offeredTemplates(s, data, e).length).toBeGreaterThan(0);
  });

  it("LIZ-R12 die Faktoren sind ganzzahlig und erklären den Status", () => {
    const data = testData();
    const s = withPlayerEngine(data);
    const c = createContract(s, data, playerMarketEngine(s)!, liveStudios(s)[0]!.id, "standard", terms({ royaltyBp: 500 }));
    const f = satisfactionFactors(s, data, c, 10000);
    for (const v of Object.values(f)) expect(Number.isSafeInteger(v)).toBe(true);
  });
});

describe("Einnahmen und Lizenzweg (LIZ-R15, LIZ-R32, LIZ-R27)", () => {
  it("LIZ-R15 Royalties eines KI-Kunden erscheinen monatlich als Lizenzeinnahmen des Spielers", () => {
    const data = testData();
    const s = withPlayerEngine(data);
    const c = createContract(s, data, playerMarketEngine(s)!, liveStudios(s)[0]!.id, "standard", terms({ royaltyBp: 500 }));
    accrueRoyalty(s, c.id, 0, 10_000_000);
    const money = s.moneyCent;
    licensingMonthStep(s, data);
    expect(s.moneyCent - money).toBe(500_000);
    expect(s.finance.ledger[s.finance.ledger.length - 1]!.income.licenses).toBe(500_000);
  });

  it("Spieler als Lizenznehmer: Projekt auf fremder Engine zahlt Pauschale und Royalty", () => {
    const data = testData();
    let s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    s.moneyCent = 1_000_000_000;
    s = tick(s, data);
    while (!aiEngine(s)) s = tick(s, data);
    const e = aiEngine(s);
    const proj = input({ engine: `lizenz:${e.id}`, licenseTemplate: offeredTemplates(s, data, e)[0] });
    expect(validateInput(s, data, proj)).toBeNull();
    const money = s.moneyCent;
    s = tick(s, data, [proj]);
    const p = s.projects[s.projects.length - 1]!;
    expect(p.engine.id).toBe(`lizenz:${e.id}`);
    expect(p.licenseContractId).not.toBeNull();
    const c = s.licensing.contracts.find((x) => x.id === p.licenseContractId)!;
    expect(c.licenseeId).toBe(0);
    expect(money - s.moneyCent).toBeGreaterThanOrEqual(c.terms.flatFeeCent);
  });

  it("LIZ-T06 Preis-Schock des eigenen Anbieters: genau eine Fokus-Karte mit vier Optionen und Mehrkosten", () => {
    const data = testData();
    let s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    s = tick(s, data);
    while (!aiEngine(s)) s = tick(s, data);
    const e = aiEngine(s);
    const t = offeredTemplates(s, data, e).find((x) => e.templates[x]!.royaltyBp > 0)!;
    const c = createContract(s, data, e, 0, t, structuredClone(e.templates[t]!));
    const before = c.terms.royaltyBp;
    priceShock(s, data, e);
    const cards = s.events.filter((x) => x.kind === "preisschock");
    expect(cards.length).toBe(1);
    expect(cards[0]!.options).toEqual(["akzeptieren", "nachverhandeln", "wechsel", "eigeneEngine"]);
    expect(cards[0]!.license!.perYearCent).toBeGreaterThan(0);
    expect(c.terms.royaltyBp).toBe(before + data.engine.licensing.priceShock.royaltyAddBp);
    applyDecision(s, data, cards[0]!, "nachverhandeln");
    expect(c.terms.royaltyBp).toBe(before + data.engine.licensing.priceShock.royaltyAddBp / 2);
  });

  it("LIZ-R27 Umschulung: 4 Wochen 50 %, 4 Wochen 80 %, danach voll", () => {
    const data = testData();
    expect([0, 1, 4, 5, 8, 9].map((w) => retrainTempo(data, w))).toEqual([10000, 5000, 5000, 8000, 8000, 10000]);
  });

  it("KI-R28 im Lauf lizenzieren KI-Studios Engines der Engine-Firmen", () => {
    const data = testData();
    let s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    s.moneyCent = 1e13;
    for (let w = 0; w < 52 * 12; w++) s = tick(s, data);
    expect(s.licensing.contracts.filter((c) => c.status !== "beendet" && c.licenseeId !== 0).length).toBeGreaterThan(0);
    expect(engineById(s, s.licensing.contracts[0]!.engineId)).toBeDefined();
  });
});
