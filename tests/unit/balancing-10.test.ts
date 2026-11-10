// Balancing 1.0 (Entscheidung Projektleitung 03.11.2026): Werte je Schwierigkeitsgrad.
import { describe, expect, it } from "vitest";
import { newGame, DEFAULT_SETTINGS } from "../../src/sim/game";
import { excessCashCharge, ledgerNow } from "../../src/sim/systems/finanzen";
import { effectiveQNorm, playerQNorm } from "../../src/sim/systems/produkte/score";
import { aiEngineLag } from "../../src/sim/systems/ki/entscheidung";
import { SEED_A, testData } from "../helpers";
import type { GameData, GameState } from "../../src/sim/model/types";

function game(data: GameData, preset: string): GameState {
  return newGame(data, SEED_A, { ...DEFAULT_SETTINGS, preset });
}

describe("Balancing je Schwierigkeitsgrad", () => {
  it("Presse erwartet vom Spieler 1980 mehr: voll bis Leicht, halb auf Normal, nicht auf Schwer und Hardcore; KI ohne Faktor", () => {
    const data = testData();
    data.quality.pressEraAnchors = [[1980, 10800], [2000, 10000]];
    const l = game(data, "leicht");
    expect(playerQNorm(data, l, "klein")).toBe(Math.trunc((effectiveQNorm(data, l, "klein") * 10800) / 10000));
    // Abschluss 1.0: Normal mit halbem Faktor (Volllauf 1980–2040: „durchschnitt“ sonst zu 63 % pleite).
    const n = game(data, "normal");
    expect(playerQNorm(data, n, "klein")).toBe(Math.trunc((effectiveQNorm(data, n, "klein") * 10400) / 10000));
    const s = game(data, "schwer");
    expect(playerQNorm(data, s, "klein")).toBe(effectiveQNorm(data, s, "klein"));
    const h = game(data, "hardcore");
    expect(playerQNorm(data, h, "klein")).toBe(effectiveQNorm(data, h, "klein"));
  });

  it("Das Hausmittel der KI liegt auf leichteren Stufen weiter zurück", () => {
    const data = testData();
    const lags = ["entspannt", "leicht", "normal", "schwer", "hardcore"].map((p) => aiEngineLag(game(data, p), data, 1));
    for (let i = 1; i < lags.length; i++) expect(lags[i]!).toBeLessThanOrEqual(lags[i - 1]!);
    expect(lags[0]!).toBeGreaterThan(lags[4]!);
  });

  it("Abgabe auf Rücklagen: in allen Stufen aus (Prüfung Fable); mit Satz nur über der Schwelle", () => {
    const data = testData();
    expect(data.presets.every((x) => x.excessCashRateBp === 0)).toBe(true);
    // Die Formel bleibt für Mods: Sätze wie vor der Prüfung.
    for (const [id, rate] of [["normal", 1000], ["hardcore", 2000]] as const) data.presets.find((x) => x.id === id)!.excessCashRateBp = rate;
    const charge = (preset: string, cash: number) => {
      const s = game(data, preset);
      const month = ledgerNow(s);
      s.finance.ledger = Array.from({ length: 12 }, (_, i) => ({ ...structuredClone(month), month: i + 1, costs: { ...month.costs, wages: 1000000 } }));
      s.moneyCent = cash;
      return excessCashCharge(s, data, month);
    };
    const p = (id: string) => data.presets.find((x) => x.id === id)!;
    expect(charge("entspannt", 1000000000)).toBe(0);
    expect(charge("normal", 1000000 * p("normal").excessCashMonths)).toBe(0);
    const excess = 100000000;
    expect(charge("normal", 1000000 * p("normal").excessCashMonths + excess)).toBe(Math.trunc((excess * p("normal").excessCashRateBp) / 40000));
    expect(charge("hardcore", 1000000000)).toBeGreaterThan(charge("normal", 1000000000));
  });
});

describe("Auftragsspiele mit Technik des Auftraggebers", () => {
  it("Ein Auftragsspiel bekommt je Modul die bessere Stufe aus eigener Engine und Stand vor clientTechLagYears", async () => {
    const { contractLevels } = await import("../../src/sim/systems/produkte/auftragsspiele");
    const { laggedLevels, starterLevels } = await import("../../src/sim/systems/engine");
    const data = testData();
    const s = game(data, "normal");
    s.week = 52 * 30;
    const own = starterLevels(data, 1980);
    expect(contractLevels(s, data, own, null)).toEqual(own);
    const client = laggedLevels(data, data.contractGames.clientTechLagYears, 2010);
    const got = contractLevels(s, data, own, 1);
    for (const m of Object.keys(own) as (keyof typeof own)[]) expect(got[m]).toBe(Math.max(own[m], client[m]));
    expect(Object.values(got).reduce((a, b) => a + b, 0)).toBeGreaterThan(Object.values(own).reduce((a, b) => a + b, 0));
  });
});

describe("Engine-Hinweis", () => {
  it("meldet Module mehr als behindWarnLevels Stufen hinter dem Stand der Technik und schreibt zum Jahreswechsel einen Bericht", async () => {
    const { engineBehind, engineBehindCheck, foundEngine } = await import("../../src/sim/systems/engine");
    const data = testData();
    const s = game(data, "normal");
    expect(engineBehind(s, data)).toEqual([]);
    foundEngine(s, data, "Kern");
    s.week = 52 * 30;
    const behind = engineBehind(s, data);
    expect(behind.length).toBeGreaterThan(0);
    for (const b of behind) expect(b.art - b.level).toBeGreaterThan(data.engine.behindWarnLevels);
    engineBehindCheck(s, data);
    expect(s.log.some((l) => l.key === "log.engineBehind")).toBe(true);
  });
});
