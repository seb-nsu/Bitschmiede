// Etappe 6c.10: freies Startjahr im Profil Garage (KRN-R70, KRN-R75).
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, newGame } from "../../src/sim/game";
import { tick } from "../../src/sim/tick";
import { buildView } from "../../src/sim/view/view";
import { testData } from "../helpers";

const SEED = "00000000000000aa";

describe("Freies Startjahr (Etappe 6c.10)", () => {
  it("KRN-R70 Jedes Jahr der Spanne; außerhalb wird begrenzt; Szenarien behalten ihr Jahr", () => {
    const data = testData();
    expect(newGame(data, SEED, { ...DEFAULT_SETTINGS, startYear: 1997 }).startYear).toBe(1997);
    expect(newGame(data, SEED, { ...DEFAULT_SETTINGS, startYear: 1970 }).startYear).toBe(1980);
    expect(newGame(data, SEED, { ...DEFAULT_SETTINGS, startYear: 2099 }).startYear).toBe(2030);
    expect(newGame(data, SEED, DEFAULT_SETTINGS).startYear).toBe(1980);
    const sc = data.goals.scenarios[1]!;
    expect(newGame(data, SEED, { ...DEFAULT_SETTINGS, startYear: 1985, scenario: sc.id }).startYear).toBe(sc.startYear);
  });

  it("KRN-R70 Geld, Gehälter und Erwartung der Presse entsprechen dem Startjahr", () => {
    const data = testData();
    const early = newGame(data, SEED, DEFAULT_SETTINGS);
    const late = newGame(data, SEED, { ...DEFAULT_SETTINGS, startYear: 2010 });
    expect(late.moneyCent).toBeGreaterThan(early.moneyCent);
    expect(late.people[0]!.salaryCent).toBeGreaterThan(early.people[0]!.salaryCent);
    expect(late.qNorm.klein).toBeGreaterThan(early.qNorm.klein);
    expect(early.qNorm.klein).toBe(data.quality.qNormStartBp.klein);
    // Plattformen und Umfänge des Jahres.
    const v = buildView(late, data);
    expect(v.catalog.scopes).toContain("aaa");
    expect(v.catalog.firstProject.platforms.length).toBeGreaterThan(0);
  });

  it("KRN-R75 Ein Start 2020 läuft ein Jahr ohne Fehler, mit KI-Studios des Jahres", () => {
    const data = testData();
    let s = newGame(data, SEED, { ...DEFAULT_SETTINGS, startYear: 2020 });
    expect(s.ai.studios.length).toBeGreaterThan(0);
    for (let i = 0; i < 52; i++) s = tick(s, data);
    expect(s.gameOver).toBeNull();
  });
});
