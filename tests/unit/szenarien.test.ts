// Teilschritt 4.12: Szenarien (ZIE-R13 bis ZIE-R15, ZIE-T10).
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import { newGame } from "../../src/sim/game";
import { scenarioStep } from "../../src/sim/systems/szenarien";
import { endingStep } from "../../src/sim/systems/spielende";
import { relation } from "../../src/sim/systems/plattformen";
import { migrateState } from "../../src/sim/save";
import { dateOf } from "../../src/sim/calendar";
import type { GameData, GameState, Project } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, SEED_A, testData } from "../helpers";

function scenarioGame(data: GameData, id: string): GameState {
  return newGame(data, SEED_A, { preset: "normal", pressRandom: "aus", decisionDensity: "normal", founderFocus: "gameplay", scenario: id, longTermGoal: "unabhaengig" });
}

/** Woche `weekOfYear` im Jahr `year`. */
function at(s: GameState, year: number, weekOfYear: number): void {
  s.week = (year - s.startYear) * 52 + weekOfYear;
  expect(dateOf(s.startYear, s.week)).toMatchObject({ year, weekOfYear });
}

/** Ein veröffentlichtes Spiel des Jahres `year` auf `platform` mit Wertung `scoreBp` (Kopie eines echten Releases). */
function fakeRelease(s: GameState, template: Project, id: number, year: number, platform: string, scoreBp: number): void {
  s.projects.push({ ...template, id, platforms: [platform], result: { ...template.result!, year, scoreBp } });
}

describe("Szenarien (ZIE-R13 bis ZIE-R15)", () => {
  it("ZIE-R13, ZIE-R14 Rette die Konsole: Start 2004 mit Studio, Beziehung zum Hersteller, ohne eigenes Ziel und Endjahr", () => {
    const data = testData();
    const s = scenarioGame(data, "retteDieKonsole");
    expect(dateOf(s.startYear, s.week).year).toBe(2004);
    expect(s.people.length).toBe(8);
    expect(s.moneyCent).toBe(300_000_000);
    expect(relation(s, data, "lichtblick")).toBe(8000);
    expect(s.goal).toBeNull();
    expect(s.settings.endMode).toBe("offen");
    expect(s.scenario).toMatchObject({ id: "retteDieKonsole", status: "laeuft", plannedEndYear: 2005 });
    expect(s.chronicle.some((c) => c.key === "log.scenarioStart")).toBe(true);
  });

  it("ZIE-T10 Rette die Konsole: Bleibt die Plattform bis 2012 aktiv, ist das Szenario gewonnen", () => {
    const data = testData();
    const s = scenarioGame(data, "retteDieKonsole");
    const done = playProject(neutralGame(data), data, input());
    const template = lastProject(done);
    for (let year = 2004; year <= 2011; year++) fakeRelease(s, template, 900 + year, year, "zenit", 75000);
    for (let year = 2005; year <= 2012; year++) {
      at(s, year, 0);
      scenarioStep(s, data);
      expect(s.scenario!.status).toBe("laeuft");
    }
    expect(s.scenario!.plannedEndYear).toBe(2013);
    at(s, 2012, 51);
    scenarioStep(s, data);
    expect(s.scenario!.status).toBe("gewonnen");
    s.week += 1;
    endingStep(s, data);
    expect(s.ending).toMatchObject({ reason: "szenario", continued: false });
  });

  it("ZIE-R15 Rette die Konsole: Ohne gutes Spiel auf der Plattform stellt der Hersteller sie ein", () => {
    const data = testData();
    const s = scenarioGame(data, "retteDieKonsole");
    const template = lastProject(playProject(neutralGame(data), data, input()));
    // Ein schwaches Spiel zählt nicht, eins auf einer anderen Plattform auch nicht.
    fakeRelease(s, template, 901, 2005, "zenit", 60000);
    fakeRelease(s, template, 902, 2005, "standardpc", 90000);
    at(s, 2005, 0);
    scenarioStep(s, data);
    expect(s.scenario!.status).toBe("laeuft");
    at(s, 2006, 0);
    scenarioStep(s, data);
    expect(s.scenario!.status).toBe("verloren");
  });

  it("ZIE-R15 Garagen-Traum: ein Spiel ab 9,0 gewinnt; nach Ende 1995 ist es verloren; Insolvenz verliert", () => {
    const data = testData();
    const won = scenarioGame(data, "garagenTraum");
    const template = lastProject(playProject(neutralGame(data), data, input()));
    fakeRelease(won, template, 901, 1983, "fuchs", 90000);
    scenarioStep(won, data);
    expect(won.scenario!.status).toBe("gewonnen");

    const late = scenarioGame(data, "garagenTraum");
    at(late, 1995, 0);
    scenarioStep(late, data);
    expect(late.log.some((l) => l.key === "log.scenarioYearLeft")).toBe(true);
    at(late, 1995, 51);
    scenarioStep(late, data);
    expect(late.scenario!.status).toBe("verloren");

    const broke = scenarioGame(data, "garagenTraum");
    broke.gameOver = { week: broke.week, reason: "insolvenz" };
    scenarioStep(broke, data);
    expect(broke.scenario!.status).toBe("verloren");
  });

  it("Vom Lizenznehmer zum Anbieter: Start 1998 ohne eigene Engine; Sieg mit der meistlizenzierten Engine", () => {
    const data = testData();
    let s = scenarioGame(data, "lizenznehmer");
    expect(dateOf(s.startYear, s.week).year).toBe(1998);
    expect(s.engine).toBeNull();
    s = tick(s, data);
    expect(s.scenario!.status).toBe("laeuft");
  });

  it("Freies Spiel hat kein Szenario; Migration 36 → 37", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    expect(s.scenario).toBeNull();
    const old = structuredClone(s) as unknown as Record<string, unknown> & { schemaVersion: number };
    old.schemaVersion = 36;
    delete old.scenario;
    expect(migrateState(old).scenario).toBeNull();
  });
});
