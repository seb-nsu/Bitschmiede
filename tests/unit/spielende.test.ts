// Teilschritt 4.11: Spielende und Vermächtnis-Wertung (ZIE-R08 bis ZIE-R11, ZIE-R51, ZIE-T05).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { legacy } from "../../src/sim/systems/spielende";
import { generateWorld } from "../../src/sim/systems/ki/studios";
import { buildView } from "../../src/sim/view/view";
import { migrateState } from "../../src/sim/save";
import { dateOf } from "../../src/sim/calendar";
import type { GameData, GameState, Settings } from "../../src/sim/model/types";
import { input, neutralGame, SEED_A, testData } from "../helpers";

/** Letzte Woche des Jahres `year`. */
function lastWeekOf(data: GameData, year: number, settings: Partial<Settings> = {}): GameState {
  const s = neutralGame(data, SEED_A, settings);
  s.moneyCent = 1e12;
  s.week = (year - s.startYear) * 52 + 51;
  expect(dateOf(s.startYear, s.week)).toMatchObject({ year, weekOfYear: 51 });
  return s;
}

describe("Spielende (ZIE-R08 bis ZIE-R11, ZIE-R51)", () => {
  it("ZIE-T05 Endjahr 2040: nach der letzten Woche öffnet sich der Abschluss; Weiterspielen führt ins Jahr 2041", () => {
    const data = testData();
    let s = tick(lastWeekOf(data, 2040), data);
    expect(s.ending).toMatchObject({ reason: "endjahr", continued: false });
    expect(buildView(s, data).ending!.date.year).toBe(2040);
    expect(buildView(s, data).ending!.canContinue).toBe(true);
    // Die Zeit steht, bis der Spieler weiterspielt.
    expect(tick(s, data)).toBe(s);
    expect(validateInput(s, data, { type: "continuePlaying" })).toBeNull();
    s = tick(s, data, [{ type: "continuePlaying" }]);
    expect(s.ending!.continued).toBe(true);
    expect(dateOf(s.startYear, s.week).year).toBe(2041);
    s = tick(s, data);
    expect(buildView(s, data).ending).toBeNull();
  });

  it("ZIE-T05, ZIE-R51 Endjahr 2100: kein Weiterspielen", () => {
    const data = testData();
    const s = tick(lastWeekOf(data, 2100, { endYear: 2100 }), data);
    expect(s.ending!.reason).toBe("kalender");
    expect(validateInput(s, data, { type: "continuePlaying" })).toBe("error.locked");
    expect(tick(s, data, [{ type: "continuePlaying" }]).week).toBe(s.week);
  });

  it("ZIE-R08 Spielende „offen“ läuft über 2040 hinaus; „Zielbedingung“ endet mit dem erreichten Ziel", () => {
    const data = testData();
    expect(tick(lastWeekOf(data, 2040, { endMode: "offen" }), data).ending).toBeNull();
    const s = lastWeekOf(data, 1990, { endMode: "zielbedingung", longTermGoal: "unabhaengig" });
    s.goal = { id: "unabhaengig", status: "erreicht", week: s.week };
    expect(tick(s, data).ending!.reason).toBe("ziel");
  });

  it("ZIE-R09 Insolvenz hält die Wertung fest, ohne Weiterspielen", () => {
    const data = testData();
    const s = neutralGame(data);
    s.gameOver = { week: s.week, reason: "insolvenz" };
    const v = buildView(s, data);
    expect(v.ending!.reason).toBe("insolvenz");
    expect(v.ending!.canContinue).toBe(false);
  });

  it("Vermächtnis: Gewichte 25/20/20/15/10/10, Teilwerte gegen die beste KI, Titel nach dem stärksten Teil", () => {
    const data = testData();
    const s = lastWeekOf(data, 1990);
    generateWorld(s, data);
    const empty = legacy(s, data);
    expect(empty.parts.map((p) => p.part)).toEqual(["marken", "engines", "umsatz", "preise", "rivalen", "ruf"]);
    expect(empty.parts.find((p) => p.part === "umsatz")!.score).toBe(0);
    // Mit Umsatz weit über allen KI-Firmen: Umsatz 100 und Titel „Branchenprimus“.
    s.ai.playerRevenueByYear = [1e13, 1e13];
    const rich = legacy(s, data);
    const umsatz = rich.parts.find((p) => p.part === "umsatz")!;
    expect(umsatz.score).toBe(100);
    expect(umsatz.contribution).toBe(2000);
    expect(rich.title).toBe("umsatz");
    expect(rich.totalBp).toBe(rich.parts.reduce((x, p) => x + p.contribution, 0));
  });

  it("Migration 35 → 36: kein Spielende", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    const old = structuredClone(s) as unknown as Record<string, unknown> & { schemaVersion: number };
    old.schemaVersion = 35;
    delete old.ending;
    expect(migrateState(old).ending).toBeNull();
  });
});
