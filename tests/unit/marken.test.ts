import { describe, expect, it } from "vitest";
import { brandFreshness, brandRelease, brandStrength, genreTransfer, newBrand, startFans } from "../../src/sim/systems/marken";
import { tick } from "../../src/sim/tick";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

describe("Marken", () => {
  it("S02 Abschnitt 6: Ein neues Spiel bekommt eine neue Marke; eine bestehende lässt sich wählen", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input({ title: "Sternenfahrt" }));
    expect(s.brands).toHaveLength(1);
    expect(s.brands[0]!.name).toBe("Sternenfahrt");
    expect(s.brands[0]!.titles).toEqual([lastProject(s).id]);
    const s2 = tick(s, data, [input({ title: "Sternenfahrt 2", brandId: s.brands[0]!.id })]);
    expect(s2.brands).toHaveLength(1);
    expect(lastProject(s2).brandId).toBe(s.brands[0]!.id);
  });

  it("S02 5.5 Übertragung gleich / nah / fern 0,9 / 0,6 / 0,2", () => {
    const data = testData();
    expect(genreTransfer(data, "action", "action")).toBe(9000);
    expect(genreTransfer(data, "action", "abenteuer")).toBe(6000);
    expect(genreTransfer(data, "action", "denkspiel")).toBe(2000);
  });

  it("PRD-R71 Startfans = Σ Fans · Übertragung · Ruf/100 · (1 − Müdigkeit/100)", () => {
    const data = testData();
    const s = neutralGame(data);
    const b = newBrand(s, data, "Welt");
    b.fans = { action: 10000, abenteuer: 5000 };
    b.reputationBp = 8000;
    b.fatigueBp = 2000;
    // (10.000 · 0,9 + 5.000 · 0,6) · 0,8 · 0,8 = 7.680
    expect(startFans(data, b, "action")).toBe(7680);
  });

  it("PRD-T09 Drei Titel in 12 Monaten: der vierte hat durch Müdigkeit sichtbar weniger Startfans", () => {
    const data = testData();
    const s = neutralGame(data);
    const b = newBrand(s, data, "Welt");
    b.fans = { action: 20000 };
    const fresh = startFans(data, b, "action");
    const p = { ...input(), id: 99, brandId: b.id, type: "standard", genre: "action" } as never;
    for (let i = 0; i < 3; i++) {
      brandRelease(s, data, p, 70000);
      s.week += 17;
    }
    expect(b.fatigueBp).toBe(3000);
    expect(startFans(data, b, "action")).toBeLessThan(Math.trunc((fresh * 75) / 100));
    expect(brandFreshness(b)).toBe(7000);
  });

  it("PRD-R72 unter 6,0 sinkt der Ruf, ab 8,0 steigen Bekanntheit und Fans im Genre", () => {
    const data = testData();
    const s = neutralGame(data);
    const b = newBrand(s, data, "Welt");
    b.fans = { action: 10000 };
    const p = { ...input(), id: 99, brandId: b.id, type: "standard", genre: "action" } as never;
    const rep = b.reputationBp;
    brandRelease(s, data, p, 50000);
    expect(b.reputationBp).toBe(rep - 1000);
    const aw = b.awarenessBp;
    s.week += 200;
    brandRelease(s, data, p, 85000);
    expect(b.awarenessBp).toBe(aw + 500 + 1500);
    expect(b.fans.action).toBe(12000);
    expect(brandStrength(data, b)).toBeGreaterThan(0);
  });

  it("PRD-R73 Ohne neuen Titel sinkt die Müdigkeit um 2 Punkte im Monat", () => {
    const data = testData();
    const s0 = neutralGame(data);
    const b = newBrand(s0, data, "Welt");
    b.fatigueBp = 3000;
    let s = s0;
    for (let i = 0; i < 52; i++) s = tick(s, data);
    expect(s.brands[0]!.fatigueBp).toBe(3000 - 12 * 200);
  });

  it("PRD-R71 Startfans kaufen in den ersten Wochen zusätzlich; Käufer werden Fans", () => {
    const data = testData();
    const s0 = neutralGame(data);
    const b = newBrand(s0, data, "Welt");
    b.fans = { action: 40000 };
    const withFans = playProject(s0, data, input({ brandId: b.id }));
    const without = playProject(neutralGame(data), data, input());
    expect(lastProject(withFans).sales!.fanUnitsPerWeek).toBeGreaterThan(0);
    expect(lastProject(without).sales!.fanUnitsPerWeek).toBe(0);
    const later = (st: typeof withFans) => {
      let x = st;
      for (let i = 0; i < 6; i++) x = tick(x, data);
      return x;
    };
    expect(lastProject(later(withFans)).sales!.sold).toBeGreaterThan(lastProject(later(without)).sales!.sold);
    expect(later(without).brands[0]!.fans.action).toBeGreaterThan(0);
  });

  it("PRD-R75 Zehn Jahre nach dem ersten Titel: Vorschlag Markenjubiläum mit Sammlung, Remaster, nichts", () => {
    const data = testData();
    const s0 = neutralGame(data);
    const b = newBrand(s0, data, "Welt");
    b.firstTitleWeek = 0;
    b.fans = { action: 50000 };
    s0.week = 10 * 52;
    const s = tick(s0, data);
    const e = s.events.find((x) => x.kind === "markenjubilaeum")!;
    expect(e.options).toEqual(["sammlung", "remaster", "nichts"]);
    expect(e.defaultOption).toBe("nichts");
    const money = s.moneyCent;
    const s2 = tick(s, data, [{ type: "decide", eventId: e.id, option: "sammlung" }]);
    expect(s2.log.some((l) => l.key === "log.collection")).toBe(true);
    expect(s2.moneyCent).toBeGreaterThan(money - 1_000_000);
  });
});
