// S13 AUS-R70, AUS-R71: eigene Module einzeln anbieten (Prüfung Fable: Schalter an der Lizenzvorlage).
import { describe, expect, it } from "vitest";
import { applyInputs, validateInput } from "../../src/sim/tick";
import { middlewareLevels, moduleOfferStep } from "../../src/sim/systems/middlewareAngebot";
import { aiEngineLevels } from "../../src/sim/systems/lizenzen";
import { MODULES } from "../../src/sim/model/types";
import { neutralGame, testData } from "../helpers";

describe("Middleware-Angebot (AUS-R70, AUS-R71)", () => {
  it("AUS-R70 Ohne eigene Engine kein Schalter; mit Schalter kaufen Studios mit Hausmitteln Module mit Vorsprung und zahlen jährlich", () => {
    const data = testData();
    let s = neutralGame(data);
    expect(validateInput(s, data, { type: "setModuleOffer", active: true })).not.toBeNull();
    // Eigene Engine mit weit überlegenen Stufen.
    const levels = Object.fromEntries(MODULES.map((m) => [m, 9])) as Record<(typeof MODULES)[number], number>;
    s.engine = { versions: [{ major: 1, minor: 0, week: 0, levels }] } as never;
    s = applyInputs(s, data, [{ type: "setModuleOffer", active: true }]);
    expect(s.moduleOffer.active).toBe(true);
    for (const st of s.ai.studios) { st.engineId = null; st.cashCent = 1_000_000_000; }
    const money = s.moneyCent;
    s.week = 52;
    moduleOfferStep(s, data);
    expect(s.moduleOffer.customers.length).toBeGreaterThan(0);
    const c = s.moduleOffer.customers[0]!;
    expect(s.moneyCent - money).toBe(s.moduleOffer.customers.reduce((a, x) => a + x.feeCent, 0));
    const base = aiEngineLevels(data, 0, 1981);
    const mw = middlewareLevels(s, c.studioId, base)!;
    expect(mw.levels[c.module]).toBe(9);
    // Schalter aus: zum nächsten Jahr enden alle Modul-Lizenzen.
    s = applyInputs(s, data, [{ type: "setModuleOffer", active: false }]);
    s.week = 104;
    moduleOfferStep(s, data);
    expect(s.moduleOffer.customers).toEqual([]);
  });
});
