// Etappe 5.11: Early Access (S05 MKT-R47 bis MKT-R50, MKT-T15).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { earlyAccessStep, finishEarlyAccess, startEarlyAccess } from "../../src/sim/systems/produkte/earlyaccess";
import type { GameData, GameState, Project } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, testData } from "../helpers";

/** Ein laufendes PC-Projekt in der Beta im Jahr 2014. */
function betaGame(data: GameData): { s: GameState; p: Project } {
  const s = tick(neutralGame(data), data, [input()]);
  const p = lastProject(s);
  s.startYear = 2014;
  p.platforms = ["standardpc"];
  p.phase = "beta";
  p.effortDoneBp = p.effortTotalBp - 1;
  p.marketing.interest = 50000;
  return { s, p };
}

describe("Early Access (S05 MKT-R47 bis MKT-R50)", () => {
  it("MKT-R47: ab 2013, PC als Lead-Plattform, ab der Beta, Preis 60–80 %", () => {
    const data = testData();
    const { s, p } = betaGame(data);
    const ok = { type: "startEarlyAccess" as const, projectId: p.id };
    expect(validateInput(s, data, ok)).toBeNull();
    expect(validateInput(s, data, { ...ok, priceBp: 9000 })).toBe("error.earlyAccessPrice");
    p.platforms = ["fuchs"];
    expect(validateInput(s, data, ok)).toBe("error.earlyAccessPc");
    p.platforms = ["standardpc"];
    s.startYear = 2010;
    expect(validateInput(s, data, ok)).toBe("error.tooEarly");
  });

  it("MKT-R48: Verkäufe zu 70 % ohne Auflage; das Interesse zerfällt schneller als ohne Early Access", () => {
    const data = testData();
    const a = betaGame(data);
    const b = betaGame(data);
    startEarlyAccess(a.s, data, { type: "startEarlyAccess", projectId: a.p.id });
    const money = a.s.moneyCent;
    earlyAccessStep(a.s, data);
    earlyAccessStep(b.s, data);
    expect(a.p.earlyAccess!.sold).toBeGreaterThan(0);
    expect(a.s.moneyCent).toBeGreaterThan(money);
    expect(a.p.marketing.interest).toBeLessThan(b.p.marketing.interest);
  });

  it("MKT-R49: Pause über 8 Wochen senkt die Zufriedenheit der Käufer", () => {
    const data = testData();
    const { s, p } = betaGame(data);
    startEarlyAccess(s, data, { type: "startEarlyAccess", projectId: p.id });
    p.status = "pausiert";
    const start = p.earlyAccess!.satisfactionBp;
    for (let i = 0; i < 16; i++) {
      s.week += 1;
      earlyAccessStep(s, data);
    }
    expect(p.earlyAccess!.satisfactionBp).toBeLessThan(start);
  });

  it("MKT-T15, MKT-R50: 1.0 ist ein zweiter Release mit neuer Wertung; schlechter als im Early Access kostet Ruf", () => {
    const data = testData();
    const { s, p } = betaGame(data);
    startEarlyAccess(s, data, { type: "startEarlyAccess", projectId: p.id });
    p.earlyAccess!.scoreBp = 100000;
    p.result = { scoreBp: 60000 } as Project["result"];
    const brand = { id: 77, reputationBp: 5000 } as GameState["brands"][number];
    s.brands.push(brand);
    p.brandId = 77;
    finishEarlyAccess(s, data, p);
    expect(p.earlyAccess!.endWeek).toBe(s.week);
    expect(brand.reputationBp).toBe(5000 - data.brands.reputationFlopBp);
  });
});
