// Etappe 6c.2: Fachteams, QA-Team und freie Zuordnung (FRM-R02 bis FRM-R05 erweitert, PRD-R29 erweitert).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { hire, drawApplicant } from "../../src/sim/systems/firma";
import { focusByPerson, qaTeamStep } from "../../src/sim/systems/personal";
import { bestExecution, teamExecution } from "../../src/sim/systems/produkte/quality";
import { migrateState } from "../../src/sim/save";
import { buildView } from "../../src/sim/view/view";
import { stream } from "../../src/sim/rng";
import { input, lastProject, neutralGame, testData } from "../helpers";
import type { GameData, GameState } from "../../src/sim/model/types";

function game(data: GameData, people = 8): GameState {
  const s = neutralGame(data);
  s.moneyCent = 1e12;
  s.office.id = "etage";
  const rng = stream(s, "personal");
  for (let i = 0; i < people; i++) hire(s, data, drawApplicant(s, data, rng));
  return s;
}

describe("Fachteams (Etappe 6c.2)", () => {
  it("FRM-R02 Ein Fachteam führt im Schwerpunkt +10 % besser aus, außerhalb −10 %", () => {
    const data = testData();
    let s = game(data);
    const ids = s.people.filter((p) => !p.isFounder).slice(0, 3).map((p) => p.id);
    s = tick(s, data, [{ type: "createTeam", name: "Grafik", personIds: ids }]);
    expect(validateInput(s, data, { type: "setTeamFocus", teamId: 1, focus: "grafik" })).toBeNull();
    s = tick(s, data, [{ type: "setTeamFocus", teamId: 1, focus: "grafik" }]);
    const focus = focusByPerson(s);
    const p = s.people.find((x) => x.id === ids[0])!;
    expect(focus[p.id]).toBe("grafik");
    const base = teamExecution(data, p, "grafik", "rollenspiel");
    expect(bestExecution(data, [p], "grafik", "rollenspiel", focus)).toBe(Math.trunc((base * 11000) / 10000));
    const other = teamExecution(data, p, "sound", "rollenspiel");
    expect(bestExecution(data, [p], "sound", "rollenspiel", focus)).toBe(Math.trunc((other * 9000) / 10000));
    expect(buildView(s, data).staff.teams[0]!.focus).toBe("grafik");
  });

  it("FRM-R02 Personen lassen sich frei einem Team zuordnen; leere Teams lösen sich auf", () => {
    const data = testData();
    let s = game(data);
    const ids = s.people.slice(0, 2).map((p) => p.id);
    s = tick(s, data, [{ type: "createTeam", name: "A", personIds: ids }, { type: "createTeam", name: "B", personIds: [s.people[2]!.id, s.people[3]!.id] }]);
    s = tick(s, data, [{ type: "teamMembers", teamId: 2, personIds: [...ids, s.people[4]!.id] }]);
    expect(s.staff.teams.map((t) => t.id)).toEqual([2]);
    expect(s.people.filter((p) => p.teamId === 2)).toHaveLength(5);
    s = tick(s, data, [{ type: "teamMembers", teamId: null, personIds: [ids[0]!] }]);
    expect(s.people.find((p) => p.id === ids[0])!.teamId).toBeNull();
    expect(validateInput(s, data, { type: "teamMembers", teamId: 9, personIds: [ids[0]!] })).toBe("error.unknownTeam");
  });

  it("PRD-R29 Ein QA-Team arbeitet an keinem Projekt und findet Bugs in allen laufenden Projekten", () => {
    const data = testData();
    let s = game(data);
    s = tick(s, data, [input()]);
    const pid = lastProject(s).id;
    const qa = s.people.filter((p) => p.assignment === null).slice(0, 2).map((p) => p.id);
    s = tick(s, data, [{ type: "createTeam", name: "QA", personIds: qa }, { type: "setTeamFocus", teamId: 1, focus: "qa" }]);
    expect(validateInput(s, data, { type: "assignTeam", teamId: 1, projectId: pid })).toBe("error.qaTeam");
    expect(validateInput(s, data, { type: "assign", personId: qa[0]!, projectId: pid })).toBe("error.qaTeam");
    const project = lastProject(s);
    project.bugsBp = 1_000_000;
    qaTeamStep(s, data, s.projects, () => 1);
    expect(project.bugsBp).toBe(1_000_000 - data.staff.teamFocus.qaFindRateBp * 100);
  });

  it("TEC-R44 Migration 55 → 56: bestehende Teams sind gemischt", () => {
    const data = testData();
    const s = game(data);
    const old = { ...s, schemaVersion: 55, staff: { ...s.staff, teams: [{ id: 1, name: "Alt" }] } };
    const m = migrateState(old as never);
    expect(m.staff.teams[0]!.focus).toBeNull();
  });
});
