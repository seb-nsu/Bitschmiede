// Etappe 5.1 bis 5.3: Betrieb nach dem Release (S06): Bugs nach Schwere, Bugfund, Patches, Zufriedenheit.
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { findBugs, initOps, severeBugPenalty, updateSatisfaction, wordOfMouthBp } from "../../src/sim/systems/betrieb";
import { migrateState } from "../../src/sim/save";
import { fillOps } from "../../src/sim/systems/betrieb";
import type { GameData, GameState, Project } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

function released(data: GameData): { s: GameState; p: Project } {
  const s = playProject(neutralGame(data), data, input());
  return { s, p: lastProject(s) };
}

describe("Betrieb nach dem Release (S06)", () => {
  it("BTR-R05: Bugs des Releases nach Schwere, 40 % bekannt, Summe stimmt", () => {
    const data = testData();
    const { p } = released(data);
    const ops = initOps(data, { ...p, result: { ...p.result!, bugsAtRelease: 100 } });
    const sum = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);
    expect(sum(ops.known) + sum(ops.hidden)).toBe(100);
    expect(ops.known.schwer + ops.hidden.schwer).toBe(10);
    expect(ops.known.schwer).toBe(4);
    expect(sum(ops.known)).toBe(40);
  });

  it("BTR-R11: Zufriedenheit startet bei Spielerwertung × 10, abzüglich Kopierschutz", () => {
    const data = testData();
    const { p } = released(data);
    expect(p.ops).not.toBeNull();
    const target = Math.trunc((p.result!.userScoreBp ?? p.result!.scoreBp) / 10);
    expect(p.ops!.history[0]).toBe(Math.max(0, target + (p.sales!.protection?.satisfaction ?? 0)));
  });

  it("BTR-F4: Spieler finden verborgene Bugs; mehr Spieler finden mehr", () => {
    const data = testData();
    const { p } = released(data);
    const ops = initOps(data, { ...p, result: { ...p.result!, bugsAtRelease: 1000 } });
    const few = structuredClone(ops);
    const many = structuredClone(ops);
    const a = findBugs(data, few, 1000);
    const b = findBugs(data, many, 100000);
    expect(b.leicht + b.mittel + b.schwer).toBeGreaterThan(a.leicht + a.mittel + a.schwer);
    // f = 25 % bei voller Spielerzahl: höchstens ein Viertel je Woche.
    expect(b.leicht).toBeLessThanOrEqual(Math.trunc(ops.hidden.leicht / 4));
    expect(many.known.leicht).toBe(ops.known.leicht + b.leicht);
  });

  it("BTR-T14: 35 offene schwere Bugs kosten 3 Punkte je Woche, 120 höchstens 5", () => {
    const data = testData();
    const { p } = released(data);
    const ops = initOps(data, p);
    ops.known.schwer = 35;
    expect(severeBugPenalty(data, ops)).toBe(300);
    ops.known.schwer = 120;
    expect(severeBugPenalty(data, ops)).toBe(500);
  });

  it("BTR-T03: 100 offene schwere Bugs und 8 Wochen ohne Patch senken die Zufriedenheit um mindestens 20", () => {
    const data = testData();
    let { s } = released(data);
    const id = lastProject(s).id;
    const pr = s.projects.find((x) => x.id === id)!;
    pr.ops!.known.schwer = 100;
    pr.ops!.hidden = { leicht: 0, mittel: 0, schwer: 0 };
    const before = pr.ops!.satisfactionBp;
    for (let i = 0; i < 8; i++) s = tick(s, data);
    expect(before - s.projects.find((x) => x.id === id)!.ops!.satisfactionBp).toBeGreaterThanOrEqual(2000);
  });

  it("BTR-T19: Zufriedenheit bleibt in 0–100", () => {
    const data = testData();
    const { p } = released(data);
    const q = structuredClone(p);
    q.ops!.satisfactionBp = 9800;
    q.result!.userScoreBp = 100000;
    updateSatisfaction(data, q, 1000);
    expect(q.ops!.satisfactionBp).toBe(10000);
    q.ops!.satisfactionBp = 400;
    q.result!.userScoreBp = 0;
    updateSatisfaction(data, q, -1000);
    expect(q.ops!.satisfactionBp).toBe(0);
  });

  it("BTR-R07, BTR-R12: Patch mit freien Personen behebt schwere Bugs zuerst und hebt die Zufriedenheit", () => {
    const data = testData();
    let { s } = released(data);
    const id = lastProject(s).id;
    const pr = s.projects.find((x) => x.id === id)!;
    pr.ops!.known = { leicht: 10, mittel: 5, schwer: 3 };
    pr.ops!.hidden = { leicht: 0, mittel: 0, schwer: 0 };
    s.people.forEach((x) => (x.assignment = null));
    const patch = { type: "planPatch" as const, projectId: id, size: "klein" as const, people: [1, 2] };
    expect(validateInput(s, data, patch)).toBeNull();
    s = tick(s, data, [patch]);
    expect(validateInput(s, data, patch)).toBe("error.patchRunning");
    expect(s.people.find((x) => x.id === 1)!.assignment).toEqual({ kind: "project", id });
    let guard = 0;
    while (s.projects.find((x) => x.id === id)!.ops!.patch && guard++ < 10) s = tick(s, data);
    const ops = s.projects.find((x) => x.id === id)!.ops!;
    expect(ops.patches).toBe(1);
    expect(ops.known.schwer).toBe(0);
    expect(ops.known.mittel).toBe(0);
    // 4 Personenwochen × 2 Bugs (1980) = 8 behoben: 3 schwere, 5 mittlere, 0 leichte.
    expect(ops.known.leicht).toBe(10);
    expect(s.people.find((x) => x.id === 1)!.assignment).toBeNull();
  });

  it("BTR-R07: Patch nur für veröffentlichte Spiele, mit freien Personen", () => {
    const data = testData();
    const { s } = released(data);
    expect(validateInput(s, data, { type: "planPatch", projectId: 999, size: "klein", people: [1] })).toBe("error.unknownProject");
    expect(validateInput(s, data, { type: "planPatch", projectId: lastProject(s).id, size: "klein", people: [] })).toBe("error.noPeople");
  });

  it("BTR-R09: Konsolenspiele lassen sich vor 2000 nicht patchen", () => {
    const data = testData();
    const { s } = released(data);
    const p = lastProject(s);
    const konsole = data.platforms.find((x) => x.type === "konsole")!;
    p.platforms = [konsole.id];
    s.people.forEach((x) => (x.assignment = null));
    expect(validateInput(s, data, { type: "planPatch", projectId: p.id, size: "klein", people: [1] })).toBe("error.noConsolePatch");
  });

  it("BTR-R14: Mundpropaganda hebt die Nachfrage bei hoher Zufriedenheit und senkt sie bei niedriger", () => {
    const data = testData();
    const { p } = released(data);
    const q = structuredClone(p);
    q.ops!.satisfactionBp = 9000;
    expect(wordOfMouthBp(data, q)).toBeGreaterThan(10000);
    q.ops!.satisfactionBp = 3000;
    expect(wordOfMouthBp(data, q)).toBeLessThan(10000);
    q.ops!.satisfactionBp = data.operations.satisfaction.neutralBp;
    expect(wordOfMouthBp(data, q)).toBe(10000);
  });

  it("Migration 37 → 38: alte Spielstände bekommen den Betrieb ihrer veröffentlichten Spiele", () => {
    const data = testData();
    const { s } = released(data);
    const old = structuredClone(s) as unknown as Record<string, unknown>;
    old.schemaVersion = 37;
    for (const p of old.projects as Record<string, unknown>[]) delete p.ops;
    const m = migrateState(old as never);
    expect(lastProject(m).ops).toBeNull();
    fillOps(m, data);
    expect(lastProject(m).ops).not.toBeNull();
  });
});
