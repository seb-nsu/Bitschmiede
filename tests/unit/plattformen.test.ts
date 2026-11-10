// Teilschritt 3.6: Plattformbeziehungen und Devkit-Wellen (S08 MRK-R14 bis MRK-R26, MRK-T03 bis MRK-T05).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { applyDecision } from "../../src/sim/systems/ereignisse";
import { platformBudget } from "../../src/sim/systems/leistung";
import { competitionFactor } from "../../src/sim/systems/markt";
import {
  budgetFactor, certThreshold, launchPlatform, makersStep, onPlayerRelease, playerFeeBp, requestDevkit, validateRequestDevkit,
} from "../../src/sim/systems/plattformen";
import { input, neutralGame, testData } from "../helpers";
import type { GameData, GameState, Project } from "../../src/sim/model/types";

function game(data: GameData): GameState {
  const s = neutralGame(data);
  s.moneyCent = 1e12;
  makersStep(s, data);
  return s;
}

function runTo(s: GameState, data: GameData, week: number): void {
  while (s.week < week) {
    makersStep(s, data);
    s.week += 1;
  }
  makersStep(s, data);
}

describe("Devkit-Wellen (MRK-R14 bis MRK-R17, MRK-R25)", () => {
  it("MRK-R14 Ankündigung 12–24 Monate, Welle 1 24–18, Welle 2 12–9 Monate vor dem Start", () => {
    const data = testData();
    const s = game(data);
    const n = s.makers.schedules.nova!;
    expect(n.launchWeek).toBe(5 * 52);
    expect(n.launchWeek - n.announceWeek).toBeGreaterThanOrEqual(52);
    expect(n.launchWeek - n.announceWeek).toBeLessThanOrEqual(104);
    expect(n.launchWeek - n.wave1Week).toBeGreaterThanOrEqual(78);
    expect(n.launchWeek - n.wave2Week).toBeLessThanOrEqual(52);
    expect(n.launchWeek - n.wave2Week).toBeGreaterThanOrEqual(39);
    // Offene Plattformen (PC, Heimcomputer) haben keinen Hersteller und keinen Zeitplan.
    expect(s.makers.schedules.standardpc).toBeUndefined();
  });

  it("MRK-T03 Beziehung 85: Welle-1-Devkit; Beziehung 40: erst auf Antrag ab Welle 2", () => {
    const data = testData();
    const a = game(data);
    a.makers.relationBp.morgenstern = 8500;
    runTo(a, data, a.makers.schedules.nova!.wave1Week);
    expect(a.makers.schedules.nova!.devkit).toBe(1);

    const b = game(data);
    b.makers.relationBp.morgenstern = 4000;
    const n = b.makers.schedules.nova!;
    runTo(b, data, n.wave2Week - 1);
    expect(validateRequestDevkit(b, data, "nova")).toBe("error.devkitWave");
    runTo(b, data, Math.max(n.wave2Week, n.announceWeek));
    expect(n.devkit).toBe(0);
    expect(validateRequestDevkit(b, data, "nova")).toBeNull();
    const money = b.moneyCent;
    requestDevkit(b, data, "nova");
    expect(n.devkit).toBe(2);
    expect(b.moneyCent).toBeLessThan(money);
  });

  it("MRK-R16, MRK-R25 Welle 2 ab 50 automatisch, ab 70 ohne Gebühr; unter 30 kein Antrag", () => {
    const data = testData();
    const a = game(data);
    a.makers.relationBp.morgenstern = 7000;
    const money = a.moneyCent;
    runTo(a, data, a.makers.schedules.nova!.wave2Week);
    expect(a.makers.schedules.nova!.devkit).toBe(2);
    expect(a.moneyCent).toBe(money);

    const b = game(data);
    b.makers.relationBp.morgenstern = 2500;
    runTo(b, data, Math.max(b.makers.schedules.nova!.wave2Week, b.makers.schedules.nova!.announceWeek));
    expect(validateRequestDevkit(b, data, "nova")).toBe("error.devkitRelation");
  });

  it("MRK-T04 Ohne Devkit ist die angekündigte Plattform nicht wählbar, mit Devkit schon", () => {
    const data = testData();
    const s = game(data);
    expect(validateInput(s, data, input({ platforms: ["nova"] }))).toBe("error.noDevkit");
    s.makers.schedules.nova!.devkit = 2;
    expect(validateInput(s, data, input({ platforms: ["nova"] }))).toBeNull();
  });

  it("MRK-R17 Ein fertiges Spiel für eine Plattform vor dem Start erscheint erst zum Start, dann als Launch-Titel", () => {
    const data = testData();
    let s = game(data);
    s.makers.schedules.nova!.devkit = 2;
    s.week = s.makers.schedules.nova!.launchWeek - 40;
    s = tick(s, data, [input({ platforms: ["nova"] })]);
    const id = s.projects[s.projects.length - 1]!.id;
    for (let i = 0; i < 80 && !s.projects.find((p) => p.id === id)!.result; i++) {
      const p = s.projects.find((x) => x.id === id)!;
      s.moneyCent = 1e12;
      s = tick(s, data, p.status === "bereit" && !p.releaseRequested ? [{ type: "release", projectId: id }] : []);
      s.events = [];
    }
    const p = s.projects.find((x) => x.id === id)!;
    expect(p.result).not.toBeNull();
    expect(p.result!.week).toBeGreaterThanOrEqual(s.makers.schedules.nova!.launchWeek);
    expect(launchPlatform(s, data, p.platforms, p.result!.week)).toBe("nova");
  });
});

describe("Launch-Titel (MRK-R19 bis MRK-R21)", () => {
  it("MRK-T05 Release 4 Wochen nach Start ist Launch-Titel und halbiert die Konkurrenzdichte", () => {
    const data = testData();
    const s = game(data);
    const start = s.makers.schedules.nova!.launchWeek;
    expect(launchPlatform(s, data, ["nova"], start + 4)).toBe("nova");
    expect(launchPlatform(s, data, ["nova"], start + 8)).toBeNull();
    expect(launchPlatform(s, data, ["fuchs"], start + 4)).toBeNull();
    s.week = start + 4;
    const full = competitionFactor(s, data, s.week);
    const half = competitionFactor(s, data, s.week, null, data.makers.launchDensityBp);
    expect(half).toBeGreaterThanOrEqual(full);
  });

  it("MRK-R21 Launch-Anfrage ab Beziehung 60: Zusage gibt Devkit, verpasster Start −10; Ablehnen −3", () => {
    const data = testData();
    const a = game(data);
    a.ai.generated = true;
    a.makers.relationBp.morgenstern = 6000;
    const n = a.makers.schedules.nova!;
    runTo(a, data, n.wave2Week);
    const ev = a.events.find((e) => e.kind === "launchAnfrage")!;
    expect(ev.platformDeal!.platform).toBe("nova");
    applyDecision(a, data, ev, "zusagen");
    expect(n.devkit).toBeGreaterThan(0);
    const before = a.makers.relationBp.morgenstern!;
    runTo(a, data, n.launchWeek + data.makers.launchWeeks);
    expect(a.makers.relationBp.morgenstern).toBe(before - 1000);

    const b = game(data);
    b.ai.generated = true;
    b.makers.relationBp.morgenstern = 6000;
    runTo(b, data, b.makers.schedules.nova!.wave2Week);
    applyDecision(b, data, b.events.find((e) => e.kind === "launchAnfrage")!, "ablehnen");
    expect(b.makers.relationBp.morgenstern).toBe(5700);
  });
});

describe("Beziehung (MRK-R24 bis MRK-R26, Tabelle 5.4)", () => {
  function released(over: Partial<Project>): Project {
    return { id: 1, title: "X", platforms: ["nova"], versionShareBp: { nova: 10000 }, exclusivePlatform: null, certAttempts: 1, ...over } as Project;
  }

  it("Start 50; Hit +5, Flop −3, Launch-Titel +5, Exklusivtitel +10", () => {
    const data = testData();
    const s = game(data);
    expect(s.makers.relationBp.morgenstern ?? data.makers.relation.startBp).toBe(5000);
    s.week = 10;
    onPlayerRelease(s, data, released({}), 85000);
    expect(s.makers.relationBp.morgenstern).toBe(5500);
    onPlayerRelease(s, data, released({}), 40000);
    expect(s.makers.relationBp.morgenstern).toBe(5200);
    s.week = s.makers.schedules.nova!.launchWeek + 2;
    onPlayerRelease(s, data, released({ exclusivePlatform: "nova" }), 70000);
    expect(s.makers.relationBp.morgenstern).toBe(5200 + 500 + 1000);
  });

  it("MRK-R25 ab 85 Plattformgebühr −2 Punkte; unter 30 strengere Zertifizierung", () => {
    const data = testData();
    const s = game(data);
    const nova = data.platforms.find((p) => p.id === "nova")!;
    expect(playerFeeBp(s, data, nova)).toBe(nova.licenseFeeBp);
    s.makers.relationBp.morgenstern = 8500;
    expect(playerFeeBp(s, data, nova)).toBe(nova.licenseFeeBp - 200);
    s.makers.relationBp.morgenstern = 2900;
    expect(certThreshold(s, data, { platforms: ["nova"] }, 10)).toBe(8);
    expect(certThreshold(s, data, { platforms: ["fuchs"] }, 10)).toBe(10);
  });

  it("MRK-R26 Exklusivdeal ab 85: Zahlung, nur noch eine Plattform, andere Hersteller −5", () => {
    const data = testData();
    let s = game(data);
    s.makers.schedules.nova!.devkit = 2;
    s.makers.relationBp.morgenstern = 9000;
    s = tick(s, data, [input({ platforms: ["nova", "fuchs"] })]);
    for (let i = 0; i < 8 && !s.events.some((e) => e.kind === "exklusivdeal"); i++) s = tick(s, data);
    const ev = s.events.find((e) => e.kind === "exklusivdeal")!;
    const money = s.moneyCent;
    applyDecision(s, data, ev, "annehmen");
    const p = s.projects.find((x) => x.id === ev.projectId)!;
    expect(p.platforms).toEqual(["nova"]);
    expect(p.exclusivePlatform).toBe("nova");
    expect(s.moneyCent).toBe(money + ev.platformDeal!.payCent);
    expect(s.makers.relationBp.lichtblick).toBe(4500);
  });

  it("MRK-R18 Taktsenkung: Budget −10 %", () => {
    const data = testData();
    const s = game(data);
    const nova = data.platforms.find((p) => p.id === "nova")!;
    const before = platformBudget(data, nova, 1985, s);
    s.makers.schedules.nova!.clockCut = true;
    expect(budgetFactor(s, data, "nova")).toBe(9000);
    expect(platformBudget(data, nova, 1985, s)).toBe(Math.floor(before * 0.9));
  });
});
