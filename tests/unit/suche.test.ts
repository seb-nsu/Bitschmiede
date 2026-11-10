// Etappe 5.13: gezielte Personalsuche (S07 FRM-R76, FRM-T32).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { searchFee, searchWeeks } from "../../src/sim/systems/suche";
import { preset } from "../../src/sim/systems/finanzen";
import { neutralGame, testData } from "../helpers";

describe("Gezielte Personalsuche (FRM-R76)", () => {
  it("FRM-T32: „Grafik ab 60“ bei Marktgehalt 1.500 USD kostet 5.400 USD und dauert 4 Wochen; Kandidaten ≥ 60; eine Suche zur Zeit", () => {
    const data = testData();
    let s = neutralGame(data);
    data.economy.salaryAnchorsCent = [[1980, 150000], [2040, 150000]];
    const factor = preset(s, data).costFactorBp;
    expect(searchFee(s, data, 60)).toBe(Math.trunc((((150000 * factor) / 10000) * 2 * 45) / 25));
    if (factor === 10000) expect(searchFee(s, data, 60)).toBe(540000);
    expect(searchWeeks(data, 60)).toBe(4);
    const money = s.moneyCent;
    const search = { type: "startSearch" as const, area: "grafik" as const, minStrength: 60 };
    expect(validateInput(s, data, search)).toBeNull();
    s = tick(s, data, [search]);
    expect(s.moneyCent).toBeLessThan(money);
    expect(validateInput(s, data, search)).toBe("error.searchRunning");
    let guard = 0;
    while (!s.events.some((e) => e.kind === "suche") && guard++ < 10) s = tick(s, data);
    const e = s.events.find((x) => x.kind === "suche")!;
    expect(e.candidates!.length).toBeGreaterThanOrEqual(1);
    expect(e.candidates!.length).toBeLessThanOrEqual(3);
    for (const c of e.candidates!) expect(c.strength.grafik).toBeGreaterThanOrEqual(60);
    expect(validateInput(s, data, search)).toBe("error.searchRunning");
    const people = s.people.length;
    s = tick(s, data, [{ type: "decide", eventId: e.id, option: "einstellen:0" }]);
    expect(s.people.length).toBe(people + 1);
    expect(validateInput(s, data, search)).toBeNull();
  });

  it("FRM-R76: Mindeststärke 40–90", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(validateInput(s, data, { type: "startSearch", area: "grafik", minStrength: 95 })).toBe("error.amount");
    expect(validateInput(s, data, { type: "startSearch", area: "grafik", minStrength: 30 })).toBe("error.amount");
  });
});
