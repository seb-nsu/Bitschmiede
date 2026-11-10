// Teilschritt 3.8: Delegation, Führungskapazität, Produzenten und Regeln (S07 FRM-R55 bis FRM-R62, FRM-T12, FRM-T13).
import { describe, expect, it } from "vitest";
import { applyInputs, tick, validateInput } from "../../src/sim/tick";
import { addEvent } from "../../src/sim/systems/ereignisse";
import { drawApplicant, hire } from "../../src/sim/systems/firma";
import {
  appointProducer, delegationStep, leadCapacity, overloadFactor, ruleHits, setProjectProducer, suggestedRule,
} from "../../src/sim/systems/delegation";
import { stream } from "../../src/sim/rng";
import { input, lastProject, neutralGame, testData } from "../helpers";
import type { GameData, GameEvent, GameState } from "../../src/sim/model/types";

function game(data: GameData, people = 0): GameState {
  const s = neutralGame(data);
  s.moneyCent = 1e12;
  s.office.id = "etage";
  const rng = stream(s, "personal");
  for (let i = 0; i < people; i++) hire(s, data, drawApplicant(s, data, rng));
  return s;
}

function applicantEvent(s: GameState, data: GameData, strength = 50): GameEvent {
  const a = drawApplicant(s, data, stream(s, "personal"));
  a.strength[a.focus] = strength;
  return addEvent(s, data, { kind: "bewerbung", scope: "welt", projectId: null, options: ["einstellen", "ablehnen"], defaultOption: "ablehnen", applicant: a });
}

function decide(s: GameState, data: GameData, e: GameEvent, option: string): GameState {
  return applyInputs(s, data, [{ type: "decide", eventId: e.id, option }]);
}

/** Drei laufende Projekte schalten die Delegation frei (FRM-R56). */
function unlocked(data: GameData): GameState {
  let s = game(data, 6);
  s = tick(s, data, [{ type: "createTeam", name: "A", personIds: s.people.slice(6).map((p) => p.id) }]);
  for (let i = 0; i < 3; i++) {
    const free = s.people.filter((p) => p.assignment === null).slice(0, 2).map((p) => p.id);
    s = tick(s, data, [input({ title: `P${i}`, people: free } as never)]);
  }
  return s;
}

describe("Freischaltung und Führungskapazität (FRM-R56 bis FRM-R58)", () => {
  it("FRM-R56 Delegation ab drei gleichzeitig laufenden Projekten; vorher nur „manuell“", () => {
    const data = testData();
    const s0 = game(data);
    expect(validateInput(s0, data, { type: "setDelegation", area: "personal", level: "auto" })).toBe("error.delegationLocked");
    expect(validateInput(s0, data, { type: "setDelegation", area: "personal", level: "manuell" })).toBeNull();
    const s = unlocked(data);
    expect(s.projects.filter((p) => p.status === "laeuft").length).toBeGreaterThanOrEqual(3);
    expect(s.unlocks["delegation"]).toBeDefined();
    expect(validateInput(s, data, { type: "setDelegation", area: "personal", level: "auto" })).toBeNull();
  });

  it("FRM-T12 6 manuelle Einheiten bei Kapazität 4: Tempo und Qualität −10 %", () => {
    const data = testData();
    const s = unlocked(data);
    // Kapazität 3 + 1 Direktor = 4; Einheiten: 3 Projekte + Personal (ab 8) + Lizenzen bringen wir künstlich auf 6.
    for (const p of s.people) p.key = null;
    s.people[0]!.key = { role: "artDirector", traits: [], loyaltyBp: 10000, storyYear: 0 };
    expect(leadCapacity(s, data)).toBe(4);
    // 8 Personen: Personal ist in Gebrauch und manuell (1 Einheit); dazu 5 Projekte = 6 Einheiten.
    while (s.projects.filter((p) => p.status === "laeuft").length < 5) s.projects.push({ ...lastProject(s), id: s.nextProjectId++ });
    expect(overloadFactor(s, data)).toBe(9000);
  });

  it("FRM-R58 Produzent: seine Projekte zählen zur Kapazität und sind keine manuellen Einheiten", () => {
    const data = testData();
    const s = unlocked(data);
    for (const p of s.people) p.key = null;
    const person = s.people.find((p) => !p.isFounder)!;
    person.key = { role: "autor", traits: [], loyaltyBp: 7000, storyYear: 0 };
    appointProducer(s, data, person.id);
    const pid = s.projects.find((p) => p.status === "laeuft")!.id;
    setProjectProducer(s, pid, person.id, null);
    expect(leadCapacity(s, data)).toBe(4);
    expect(person.assignment).toBeNull();
    expect(validateInput(s, data, { type: "assign", personId: person.id, projectId: pid })).toBe("error.isProducer");
  });
});

describe("Regeln (FRM-R60 bis FRM-R62)", () => {
  it("FRM-T13 Zweimal gleich beantwortet: die dritte Karte bietet die Regel an; sie trifft die vierte Entscheidung und steht im Protokoll", () => {
    const data = testData();
    let s = game(data);
    for (let i = 0; i < 2; i++) {
      const e = applicantEvent(s, data);
      expect(suggestedRule(s, data, e)).toBeNull();
      s = decide(s, data, e, "ablehnen");
    }
    const third = applicantEvent(s, data);
    expect(suggestedRule(s, data, third)).toBe("ablehnen");
    s = applyInputs(s, data, [{ type: "createRule", eventKey: "bewerbung", condition: { value: "immer", op: "gleich", number: 0 }, option: "ablehnen", brandId: null, answerEventId: third.id }]);
    expect(s.events.some((e) => e.id === third.id)).toBe(false);
    expect(s.delegation.levels.personal).toBe("regel");
    const fourth = applicantEvent(s, data);
    s = tick(s, data);
    expect(s.events.some((e) => e.id === fourth.id)).toBe(false);
    const entry = s.delegation.history[s.delegation.history.length - 1]!;
    expect(entry).toMatchObject({ eventKey: "bewerbung", option: "ablehnen", by: "regel", ruleId: 1 });
    expect(s.log.some((l) => l.key === "log.ruleFired")).toBe(true);
  });

  it("FRM-R60 Bedingung: Bewerber über Stärke 70 einstellen, sonst fragen; FRM-R62 „hätte gegriffen“", () => {
    const data = testData();
    let s = game(data);
    s.delegation.levels.personal = "regel";
    s = decide(s, data, applicantEvent(s, data, 80), "ablehnen");
    s = decide(s, data, applicantEvent(s, data, 40), "ablehnen");
    s = applyInputs(s, data, [{ type: "createRule", eventKey: "bewerbung", condition: { value: "staerke", op: "ueber", number: 70 }, option: "einstellen", brandId: null }]);
    const rule = s.delegation.rules[0]!;
    expect(ruleHits(s, rule)).toEqual({ fired: 0, wouldHave: 1 });
    const weak = applicantEvent(s, data, 60);
    const strong = applicantEvent(s, data, 90);
    const people = s.people.length;
    delegationStep(s, data);
    expect(s.events.some((e) => e.id === weak.id)).toBe(true);
    expect(s.events.some((e) => e.id === strong.id)).toBe(false);
    expect(s.people.length).toBe(people + 1);
    expect(ruleHits(s, rule).fired).toBe(1);
  });

  it("FRM-R55 „manuell“ wendet keine Regeln an; „vollautomatisch“ nimmt ohne Regel die Standardoption", () => {
    const data = testData();
    const s = game(data);
    s.delegation.rules.push({ id: 1, eventKey: "bewerbung", condition: { value: "immer", op: "gleich", number: 0 }, option: "einstellen", brandId: null, active: true, createdWeek: 0 });
    s.delegation.nextRuleId = 2;
    const e = applicantEvent(s, data);
    delegationStep(s, data);
    expect(s.events.some((x) => x.id === e.id)).toBe(true);
    s.delegation.rules = [];
    s.delegation.levels.personal = "auto";
    delegationStep(s, data);
    expect(s.events.some((x) => x.id === e.id)).toBe(false);
    expect(s.delegation.history[s.delegation.history.length - 1]).toMatchObject({ by: "auto", option: "ablehnen" });
  });
});

describe("Produzenten (FRM-R59)", () => {
  it("entscheidet Projekt-Karten mit dem Standard, meldet sich aber am Gate und bei gefährdeter Vorgabe", () => {
    const data = testData();
    const s = unlocked(data);
    const person = s.people.find((p) => !p.isFounder)!;
    person.key = { role: "autor", traits: [], loyaltyBp: 7000, storyYear: 0 };
    appointProducer(s, data, person.id);
    const project = s.projects.find((p) => p.status === "laeuft")!;
    setProjectProducer(s, project.id, person.id, { minScoreBp: null, budgetCent: null, targetWeek: null });
    const review = addEvent(s, data, { kind: "kritischerBug", scope: "projekt", projectId: project.id, options: ["verschieben", "dayOnePatch", "soVeroeffentlichen"], defaultOption: "verschieben" });
    const gate = addEvent(s, data, { kind: "gate", scope: "projekt", projectId: project.id, options: ["fortsetzen", "pausieren", "abbrechen"], defaultOption: "fortsetzen" });
    delegationStep(s, data);
    expect(s.events.some((e) => e.id === review.id)).toBe(false);
    expect(s.events.some((e) => e.id === gate.id)).toBe(true);
    // Vorgabe gefährdet: Mindestwertung 10,0 ist nicht zu halten, der Produzent fragt.
    project.brief = { minScoreBp: 100000, budgetCent: null, targetWeek: null };
    const again = addEvent(s, data, { kind: "kritischerBug", scope: "projekt", projectId: project.id, options: ["verschieben", "dayOnePatch", "soVeroeffentlichen"], defaultOption: "verschieben" });
    delegationStep(s, data);
    expect(s.events.some((e) => e.id === again.id)).toBe(true);
  });
});
