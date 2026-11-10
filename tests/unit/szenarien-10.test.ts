// Abschluss 1.0: Szenarien „Indie-Durchbruch“ und „Konzern-Integration“ (ZIE-R13 bis ZIE-R15, UEB-R19).
import { describe, expect, it } from "vitest";
import { newGame } from "../../src/sim/game";
import { tick } from "../../src/sim/tick";
import { integrationStatus, scenarioStep } from "../../src/sim/systems/szenarien";
import { fullRetentionCent, leaveChance } from "../../src/sim/systems/uebernahmen";
import { dateOf } from "../../src/sim/calendar";
import type { GameData, GameState } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, SEED_A, testData } from "../helpers";

function scenarioGame(data: GameData, id: string): GameState {
  return newGame(data, SEED_A, { preset: "normal", pressRandom: "aus", decisionDensity: "normal", founderFocus: "gameplay", scenario: id });
}

function at(s: GameState, year: number, weekOfYear: number): void {
  s.week = (year - s.startYear) * 52 + weekOfYear;
}

describe("Indie-Durchbruch (ZIE-R13 bis ZIE-R15)", () => {
  it("ZIE-R14: Start 2015 mit fünf Personen in einer Etage", () => {
    const data = testData();
    const s = scenarioGame(data, "indieDurchbruch");
    expect(dateOf(s.startYear, s.week).year).toBe(2015);
    expect(s.people.length).toBe(5);
    expect(s.office.id).toBe("etage");
    expect(s.moneyCent).toBe(60_000_000);
    expect(s.scenario).toMatchObject({ id: "indieDurchbruch", status: "laeuft" });
  });

  it("ZIE-R15: 500.000 Interessenten zum Release gewinnen, 499.999 nicht; Fristablauf verliert", () => {
    const data = testData();
    const template = lastProject(playProject(neutralGame(data), data, input()));
    const s = scenarioGame(data, "indieDurchbruch");
    s.projects.push({ ...template, id: 900, result: { ...template.result!, interestAtRelease: 499_999 } });
    scenarioStep(s, data);
    expect(s.scenario!.status).toBe("laeuft");
    s.projects.push({ ...template, id: 901, result: { ...template.result!, interestAtRelease: 500_000 } });
    scenarioStep(s, data);
    expect(s.scenario!.status).toBe("gewonnen");

    const late = scenarioGame(data, "indieDurchbruch");
    at(late, 2020, 51);
    scenarioStep(late, data);
    expect(late.scenario!.status).toBe("verloren");
  });
});

describe("Konzern-Integration (ZIE-R13 bis ZIE-R15, UEB-R15 bis UEB-R19)", () => {
  it("ZIE-R14: Start 2020 mit 30 Personen und drei frisch gekauften Töchtern am Anfang der Integration", () => {
    const data = testData();
    const s = scenarioGame(data, "konzernIntegration");
    expect(dateOf(s.startYear, s.week).year).toBe(2020);
    expect(s.people.length).toBe(30);
    const ids = s.scenario!.subsidiaryIds!;
    expect(ids.length).toBe(3);
    for (const id of ids) {
      const sub = s.ai.studios.find((x) => x.id === id)!;
      expect(sub.parent).toMatchObject({ ownerId: 0, leftCount: 0, retentionCent: 0 });
      expect(sub.parent!.integration.progressBp).toBe(0);
      expect(sub.rival).toBeNull();
    }
    // Systeme, deren Bedingung zum Start erfüllt ist, sind offen (Standorte erhöhen die Integrationskapazität).
    expect(s.unlocks["standorte"]).toBe(0);
    expect(s.unlocks["firma"]).toBe(0);
  });

  it("ZIE-R15: alle drei integriert mit höchstens zwei Abgängen gewinnt; der dritte Abgang verliert", () => {
    const data = testData();
    const s = scenarioGame(data, "konzernIntegration");
    const subs = s.scenario!.subsidiaryIds!.map((id) => s.ai.studios.find((x) => x.id === id)!);
    subs[0]!.parent!.leftCount = 2;
    for (const x of subs) x.parent!.integration.progressBp = 10000;
    scenarioStep(s, data);
    expect(s.scenario!.status).toBe("gewonnen");

    const lost = scenarioGame(data, "konzernIntegration");
    const lostSubs = lost.scenario!.subsidiaryIds!.map((id) => lost.ai.studios.find((x) => x.id === id)!);
    lostSubs[0]!.parent!.leftCount = 2;
    lostSubs[1]!.parent!.leftCount = 1;
    scenarioStep(lost, data);
    expect(lost.scenario!.status).toBe("verloren");
  });

  it("ZIE-R15: Wer eine Tochter schließt, verliert das Szenario", () => {
    const data = testData();
    const s = scenarioGame(data, "konzernIntegration");
    const id = s.scenario!.subsidiaryIds![0]!;
    const next = tick(s, data, [{ type: "subsidiary", studioId: id, action: "schliessen" }]);
    expect(integrationStatus(next, next.scenario!.subsidiaryIds!).owned).toBe(false);
    expect(next.scenario!.status).toBe("verloren");
  });

  it("UEB-R19: Eine Halteprämie während der Integration senkt die Wechselneigung für 104 Wochen und kostet Geld", () => {
    const data = testData();
    const s = scenarioGame(data, "konzernIntegration");
    const id = s.scenario!.subsidiaryIds![0]!;
    const before = leaveChance(s, data, s.ai.studios.find((x) => x.id === id)!);
    const full = fullRetentionCent(s, data, s.ai.studios.find((x) => x.id === id)!);
    const money = s.moneyCent;
    const next = tick(s, data, [{ type: "subsidiary", studioId: id, action: "halten", amountCent: full }]);
    const sub = next.ai.studios.find((x) => x.id === id)!;
    expect(sub.parent!.retentionCent).toBe(full);
    expect(sub.parent!.retentionUntilWeek).toBe(s.week + data.acquisitions.leave.retentionWeeks);
    expect(leaveChance(next, data, sub)).toBe(Math.max(0, before - data.acquisitions.leave.retentionBp));
    expect(next.moneyCent).toBeLessThan(money - full + 1);
  });
});
