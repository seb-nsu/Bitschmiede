// Teilschritt 6a.3: Marktphasen (MRK-R36, MRK-R59, MRK-R60).
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import { migrateState } from "../../src/sim/save";
import { historicalPhase, initialMarket, marketPhase, marketPhaseStep, phaseSalaryBp } from "../../src/sim/systems/marktphasen";
import { creditLimit } from "../../src/sim/systems/finanzen";
import { wageFactor } from "../../src/sim/systems/personal";
import type { GameState } from "../../src/sim/model/types";
import { neutralGame, testData } from "../helpers";

function yearStart(s: GameState, year: number): void {
  s.week = (year - s.startYear) * 52;
}

describe("Marktphasen (MRK-R59)", () => {
  it("MRK-R59: historischer Crash 1983–85, davor und danach normal (Datenblatt Abschnitt 3)", () => {
    const data = testData();
    const p = data.marketPhases;
    expect(historicalPhase(p, 1981)).toEqual({ phase: "normal", toYear: 1982 });
    expect(historicalPhase(p, 1983)).toEqual({ phase: "krise", toYear: 1985 });
    expect(historicalPhase(p, 1990)).toEqual({ phase: "normal", toYear: 2007 });
    expect(initialMarket(data, 1980).phase).toBe("normal");
    expect(initialMarket(data, 2021)).toEqual({ phase: "boom", toYear: 2021, prev: "krise" });
  });

  it("MRK-R59: der Jahreswechsel setzt die Phase und meldet den Wechsel", () => {
    const data = testData();
    const s = neutralGame(data);
    yearStart(s, 1983);
    marketPhaseStep(s, data);
    expect(s.market.phase).toBe("krise");
    expect(s.chronicle.some((c) => c.key === "log.marketPhase" && c.params.phase === "krise")).toBe(true);
  });

  it("MRK-R59: ab 2026 aus dem Seed, Dauern im Rahmen, Folge Krise → normal → Boom → normal → Krise", () => {
    const data = testData();
    const s = neutralGame(data);
    s.market = { phase: "krise", toYear: 2025, prev: "boom" };
    const seen: { year: number; phase: string; toYear: number }[] = [];
    for (let y = 2026; y <= 2060; y++) {
      yearStart(s, y);
      const before = s.market.phase;
      marketPhaseStep(s, data);
      if (s.market.phase !== before || y === 2026) seen.push({ year: y, phase: s.market.phase, toYear: s.market.toYear });
    }
    expect(seen.slice(0, 4).map((x) => x.phase)).toEqual(["normal", "boom", "normal", "krise"]);
    for (const x of seen) {
      const [lo, hi] = data.marketPhases.durationYears[x.phase as "boom"];
      expect(x.toYear - x.year + 1).toBeGreaterThanOrEqual(lo);
      expect(x.toYear - x.year + 1).toBeLessThanOrEqual(hi);
    }
  });

  it("S10 Schalter Marktzyklen aus: immer normal, auch im Crash", () => {
    const data = testData();
    const s = neutralGame(data, undefined, { marketCycles: false });
    yearStart(s, 1983);
    marketPhaseStep(s, data);
    expect(marketPhase(s)).toBe("normal");
    expect(s.chronicle.some((c) => c.key === "log.marketPhase")).toBe(false);
  });
});

describe("Wirkung der Marktphasen (MRK-R36, MRK-R60)", () => {
  it("MRK-R60: Boom senkt den Zins um 1 Punkt und hebt das Gehaltsniveau um 5 %; Krise verteuert Kredite", () => {
    const data = testData();
    const s = neutralGame(data);
    s.market = { phase: "normal", toYear: 2000, prev: "krise" };
    const rate = creditLimit(s, data).rateBp;
    const wage = wageFactor(s, data);
    s.market.phase = "boom";
    expect(creditLimit(s, data).rateBp).toBe(rate - 100);
    expect(phaseSalaryBp(s, data)).toBe(10500);
    expect(wageFactor(s, data)).toBe(Math.trunc((wage * 10500) / 10000));
    s.market.phase = "krise";
    expect(creditLimit(s, data).rateBp).toBe(rate + 100);
  });

  it("MRK-R36: Gründungen je Quartal: Krise keine, Boom 1–3", () => {
    const data = testData();
    for (const [phase, min, max] of [["krise", 0, 0], ["boom", 1, 3]] as const) {
      let s = neutralGame(data);
      for (let i = 0; i < 2; i++) s = tick(s, data);
      s.market = { phase, toYear: 2100, prev: "krise" };
      const before = s.ai.studios.length;
      // Bis zum nächsten Quartalsanfang laufen; Pleiten werden über das Minimum nachgegründet, deshalb nur die Spanne prüfen.
      let quarters = 0;
      let founded = 0;
      for (let w = 0; w < 26; w++) {
        const n = s.ai.studios.length;
        s = tick(s, data);
        s.market = { phase, toYear: 2100, prev: "krise" };
        const d = s.ai.studios.length - n;
        if (d > 0) { founded += d; quarters += 1; }
      }
      expect(s.ai.studios.length).toBeGreaterThanOrEqual(before);
      if (phase === "krise") expect(founded).toBe(0);
      else {
        expect(quarters).toBeGreaterThanOrEqual(1);
        expect(founded).toBeGreaterThanOrEqual(min * quarters);
        expect(founded).toBeLessThanOrEqual(max * quarters);
      }
    }
  });

  it("Spielstand 47 → 48: Marktphase normal bis zum nächsten Jahreswechsel", () => {
    const data = testData();
    const old = structuredClone(neutralGame(data)) as unknown as Record<string, unknown>;
    old.schemaVersion = 47;
    delete old.market;
    expect(migrateState(old as never).market.phase).toBe("normal");
  });
});
