// Teilschritt 3.7: Teams und Schlüsselpersonen (S07 FRM-R01 bis FRM-R16, FRM-R20, FRM-R68; FRM-T01 bis FRM-T03, FRM-T18).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { hire, drawApplicant } from "../../src/sim/systems/firma";
import {
  applyStaffDecision, crewWork, effectiveSize, moraleFactor, onboardingFactor, poach, poachChance, promoteKey, staffStep, validatePoach,
} from "../../src/sim/systems/personal";
import { stream } from "../../src/sim/rng";
import { input, lastProject, neutralGame, testData } from "../helpers";
import type { GameData, GameState, Person } from "../../src/sim/model/types";

function game(data: GameData, people = 0): GameState {
  const s = neutralGame(data);
  s.moneyCent = 1e12;
  s.office.id = "etage";
  const rng = stream(s, "personal");
  for (let i = 0; i < people; i++) hire(s, data, drawApplicant(s, data, rng));
  return s;
}

function crunchingProject(data: GameData): { s: GameState; workers: Person[] } {
  let s = game(data);
  s.staff.crunch = "beiBedarf";
  s = tick(s, data, [input()]);
  const id = lastProject(s).id;
  return { s, workers: s.people.filter((p) => p.assignment?.kind === "project" && p.assignment.id === id) };
}

describe("Teams (FRM-R02 bis FRM-R05)", () => {
  it("FRM-T01 Teams ab 8 Mitarbeitern: mit 7 gesperrt, mit 8 möglich", () => {
    const data = testData();
    const s = game(data, 5);
    expect(s.people.length).toBe(7);
    const ids = s.people.slice(0, 3).map((p) => p.id);
    expect(validateInput(s, data, { type: "createTeam", name: "A", personIds: ids })).toBe("error.teamsLocked");
    hire(s, data, drawApplicant(s, data, stream(s, "personal")));
    expect(validateInput(s, data, { type: "createTeam", name: "A", personIds: ids })).toBeNull();
    const t = tick(s, data, [{ type: "createTeam", name: "A", personIds: ids }]);
    expect(t.staff.teams).toHaveLength(1);
    expect(t.people.filter((p) => p.teamId === 1)).toHaveLength(3);
    expect(validateInput(t, data, { type: "createTeam", name: "B", personIds: [ids[0]!, t.people[5]!.id] })).toBe("error.inTeam");
  });

  it("FRM-T02 Moral 80 gegen 30: das erste Team leistet rund 1,28-mal so viel (0,92 gegen 0,72)", () => {
    const data = testData();
    const ratio = Math.round((moraleFactor(data, 8000) * 100) / moraleFactor(data, 3000));
    expect(ratio).toBe(128);
    // Startmoral 70 ist auf 1,0 normiert, damit die Tempi der Etappen 1 und 2 gleich bleiben.
    expect(moraleFactor(data, data.staff.morale.startBp)).toBe(10000);
  });

  it("FRM-R03 Formel 5.1: Größe mit abnehmendem Ertrag ab 8 Personen; bis 7 linear", () => {
    const data = testData();
    expect(effectiveSize(data, 7)).toBe(70000);
    const e14 = effectiveSize(data, 14);
    expect(e14).toBeGreaterThan(70000);
    expect(e14).toBeLessThan(140000);
    // 7 · 2^0,85 ≈ 12,6
    expect(Math.abs(e14 - 126000)).toBeLessThan(1500);
  });

  it("FRM-R04 Ein Team wechselt geschlossen; Einarbeitung 4 Wochen von 50 % auf 100 %", () => {
    const data = testData();
    expect(onboardingFactor(data, 4)).toBe(5000);
    expect(onboardingFactor(data, 2)).toBe(7500);
    expect(onboardingFactor(data, 0)).toBe(10000);
    let s = game(data, 8);
    s = tick(s, data, [input()]);
    const pid = lastProject(s).id;
    const ids = s.people.filter((p) => !p.isFounder).slice(0, 3).map((p) => p.id);
    s = tick(s, data, [{ type: "createTeam", name: "A", personIds: ids }, { type: "assignTeam", teamId: 1, projectId: pid }]);
    for (const p of s.people.filter((x) => ids.includes(x.id))) {
      expect(p.assignment).toEqual({ kind: "project", id: pid });
      expect(p.onboardWeeks).toBe(3);
    }
  });
});

describe("Crunch, Moral, Burnout (FRM-R06, FRM-R07, FRM-R17)", () => {
  it("FRM-T18 Moral 70 und 4 Crunch-Wochen ohne andere Einflüsse: danach Moral 58", () => {
    const data = testData();
    const { s, workers } = crunchingProject(data);
    for (const w of workers) w.moraleBp = 7000;
    for (let i = 0; i < 4; i++) {
      s.week += 1;
      // nur der Wochenteil: kein Monatsanfang
      if (s.week % 4 === 0) s.week += 1;
      staffStep(s, data);
    }
    for (const w of workers) expect(w.moraleBp).toBe(5800);
  });

  it("FRM-T03 „bei Bedarf“ und 10 Crunch-Wochen: Burnout mindestens 60 und eine Burnout-Meldung", () => {
    const data = testData();
    const { s, workers } = crunchingProject(data);
    for (let i = 0; i < 10; i++) staffStep(s, data);
    for (const w of workers) expect(w.burnoutBp).toBeGreaterThanOrEqual(6000);
    expect(s.log.some((l) => l.key === "log.burnoutHigh")).toBe(true);
  });

  it("FRM-R17 Crunch +25 % Leistung; FRM-R06 ohne Crunch baut sich Burnout um 3 je Woche ab", () => {
    const data = testData();
    const { s, workers } = crunchingProject(data);
    expect(Math.abs(crewWork(s, data, workers, false, true) - (crewWork(s, data, workers, false, false) * 125) / 100)).toBeLessThanOrEqual(1);
    s.staff.crunch = "nie";
    for (const w of workers) w.burnoutBp = 1000;
    staffStep(s, data);
    for (const w of workers) expect(w.burnoutBp).toBe(700);
  });
});

describe("Schlüsselpersonen (FRM-R09 bis FRM-R14)", () => {
  it("FRM-R09 Gründer sind Schlüsselpersonen mit Rolle ihres besten Bereichs und Loyalität 100", () => {
    const data = testData();
    const s = game(data);
    for (const f of s.people) {
      expect(f.key).not.toBeNull();
      expect(f.key!.traits.length).toBeGreaterThanOrEqual(2);
      expect(f.key!.loyaltyBp).toBe(10000);
    }
  });

  it("FRM-R09 Technischer Direktor: +10 % nur für das Engine-Team", () => {
    const data = testData();
    const s = game(data, 2);
    const p = s.people.find((x) => !x.isFounder)!;
    p.strength.technik = 90;
    promoteKey(s, data, p, stream(s, "personal"));
    expect(p.key!.role).toBe("technischerDirektor");
    expect(crewWork(s, data, [p], true, false)).toBe(crewWork(s, data, [p], false, false) * 110 / 100);
  });

  it("FRM-R11 Abwerbeangebot: Gegenangebot +20 % Gehalt und +15 Loyalität; „gehen lassen“ verliert die Person", () => {
    const data = testData();
    const s = game(data, 2);
    const p = s.people.find((x) => !x.isFounder)!;
    p.key = { role: "autor", traits: ["kreativ", "mentor"], loyaltyBp: 3000, storyYear: 0 };
    const salary = p.salaryCent;
    applyStaffDecision(s, data, "abwerbung", p.id, "gegenangebot");
    expect(p.salaryCent).toBe(salary * 12 / 10);
    expect(p.key.loyaltyBp).toBe(4500);
    applyStaffDecision(s, data, "abwerbung", p.id, "gehenlassen");
    expect(s.people.some((x) => x.id === p.id)).toBe(false);
  });

  it("FRM-R08 Entlassen: 3 Monatsgehälter Abfindung, Moral aller −10; Gründer nicht", () => {
    const data = testData();
    let s = game(data, 2);
    const founder = s.people.find((x) => x.isFounder)!;
    expect(validateInput(s, data, { type: "firePerson", personId: founder.id })).toBe("error.founder");
    const p = s.people.find((x) => !x.isFounder)!;
    const before = s.moneyCent;
    s = tick(s, data, [{ type: "firePerson", personId: p.id }]);
    expect(s.people.some((x) => x.id === p.id)).toBe(false);
    expect(before - s.moneyCent).toBeGreaterThanOrEqual(3 * p.salaryCent);
    expect(s.people.find((x) => x.isFounder)!.moraleBp).toBe(6000);
  });
});

describe("Abwerben beim Rivalen (FRM-R68)", () => {
  it("Erfolgschance clamp(50 % + 2 · Aufschlag − Loyalität, 0, 90 %); einmal je Jahr und Person; Beziehung sinkt", () => {
    const data = testData();
    expect(poachChance(data, 2000, 7000)).toBe(2000);
    expect(poachChance(data, 10000, 0)).toBe(9000);
    let s = game(data);
    while (s.ai.rivals.length === 0) s = tick(s, data);
    const rival = s.ai.studios.find((x) => x.id === s.ai.rivals[0])!;
    expect(rival.rival!.keyPeople).toHaveLength(2);
    const relation = rival.rival!.relationBp;
    const people = s.people.length;
    rival.rival!.keyPeople[0]!.loyaltyBp = 0;
    poach(s, data, rival.id, 0, 10000);
    expect(s.people.length).toBe(people + 1);
    expect(s.people[s.people.length - 1]!.key).not.toBeNull();
    expect(rival.rival!.relationBp).toBeLessThan(relation);
    // Die zweite Schlüsselperson rückt nach und bleibt umwerbbar; ein gescheiterter Versuch sperrt sie für das Jahr.
    expect(validatePoach(s, data, rival.id, 0, 0)).toBeNull();
    rival.rival!.keyPeople[0]!.loyaltyBp = 10000;
    poach(s, data, rival.id, 0, 0);
    expect(validatePoach(s, data, rival.id, 0, 0)).toBe("error.poachYear");
  });
});
