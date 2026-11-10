// S13 AUS-R83, AUS-R90, AUS-R91 (Prüfung Fable: nur feindliche Übernahme gegen den Spieler, Schutz, Rückkauf).
import { describe, expect, it } from "vitest";
import { applyInputs, validateInput } from "../../src/sim/tick";
import { hostileStep, ownShareBp } from "../../src/sim/systems/feindlich";
import { endingStep } from "../../src/sim/systems/spielende";
import { migrateState } from "../../src/sim/save";
import type { GameData, GameState } from "../../src/sim/model/types";
import { neutralGame, testData } from "../helpers";

function listed(data: GameData, publicShare: number): GameState {
  const s = neutralGame(data);
  s.stock = { ...s.stock, listed: true, ipoWeek: 0, shares: 10_000_000, publicShares: publicShare, sentiment: 50, priceCent: 1000 };
  s.week = 52 * 5;
  s.moneyCent = 100_000_000_000;
  return s;
}

describe("Feindliche Übernahme, Schutz, Rückkauf (AUS-R83, AUS-R90, AUS-R91)", () => {
  it("AUS-R91 Über 50 % eigener Anteil: kein Angebot; darunter kommt eines und endet ohne Abwehr womöglich mit Spielende", () => {
    const data = testData();
    const safe = listed(data, 3_000_000);
    for (let i = 0; i < 40; i++) { safe.week += 13; hostileStep(safe, data); }
    expect(safe.stock.hostile).toBeNull();
    const s = listed(data, 6_000_000);
    s.stock.sentiment = 0;
    let bids = 0;
    for (let i = 0; i < 80 && !s.gameOver; i++) {
      s.week = 52 * 5 + i * 13 + 1;
      if (i % 4 === 0) s.week -= 1;
      hostileStep(s, data);
      if (s.stock.hostile) {
        bids += 1;
        s.week = s.stock.hostile.untilWeek;
        hostileStep(s, data);
      }
    }
    expect(bids).toBeGreaterThan(0);
    expect(s.gameOver?.reason).toBe("uebernahme");
    endingStep(s, data);
    expect(s.ending?.reason).toBe("uebernahme");
  });

  it("AUS-R83 Abwehr kauft genau bis zur Mehrheit zurück; AUS-R90 Schutz blockiert Angebote", () => {
    const data = testData();
    const s = listed(data, 6_000_000);
    s.stock.hostile = { raiderId: null, raider: "", priceCent: 1300, untilWeek: s.week + 8 };
    const money = s.moneyCent;
    const s2 = applyInputs(s, data, [{ type: "stockDefense", action: "abwehr" }]);
    expect(ownShareBp(s2)).toBeGreaterThan(data.stock.hostile.majorityBp);
    expect(s2.stock.hostile).toBeNull();
    expect(s2.moneyCent).toBeLessThan(money);
    const p = listed(data, 6_000_000);
    const p2 = applyInputs(p, data, [{ type: "stockDefense", action: "schutz", active: true }]);
    for (let i = 0; i < 20; i++) { p2.week = 52 * 6 + i * 13; hostileStep(p2, data); }
    expect(p2.stock.hostile).toBeNull();
  });

  it("AUS-R90 Rückkauf senkt den Streubesitz und kostet Geld; ungültige Mengen werden abgelehnt", () => {
    const data = testData();
    const s = listed(data, 4_000_000);
    expect(validateInput(s, data, { type: "stockDefense", action: "rueckkauf", shareBp: 5000 })).not.toBeNull();
    const money = s.moneyCent;
    const s2 = applyInputs(s, data, [{ type: "stockDefense", action: "rueckkauf", shareBp: 1000 }]);
    expect(s2.stock.publicShares).toBe(3_000_000);
    expect(s2.moneyCent).toBe(money - 1_000_000 * ((1000 * data.stock.hostile.buybackPremiumBp) / 10000));
  });

  it("Verwässerung: jedes Jahr gehen Aktien an den Markt", () => {
    const data = testData();
    const s = listed(data, 3_000_000);
    s.week = 52 * 6;
    hostileStep(s, data);
    expect(s.stock.publicShares).toBe(3_000_000 + (10_000_000 * data.stock.hostile.dilutionPerYearBp) / 10000);
  });

  it("Migration 64 → 65: Börse ohne Schutz und Angebot", () => {
    const data = testData();
    const old = structuredClone(neutralGame(data)) as unknown as Record<string, unknown> & { schemaVersion: number; stock: Record<string, unknown> };
    delete old.stock.protection;
    delete old.stock.hostile;
    old.schemaVersion = 64;
    const m = migrateState(old);
    expect(m.stock.protection).toBe(false);
    expect(m.stock.hostile).toBeNull();
  });
});
