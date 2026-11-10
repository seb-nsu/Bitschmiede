// Team-Aufträge (Entscheidung Projektleitung 03.11.2026): Ein Auftragsstudio soll bis 2040 tragen.
import { describe, expect, it } from "vitest";
import { contractTeam, drawContractOffer, hire, settleContracts, startContract, teamContractQuality } from "../../src/sim/systems/firma";
import { stream } from "../../src/sim/rng";
import { neutralGame, testData } from "../helpers";
import type { ContractOffer, GameData, GameState } from "../../src/sim/model/types";

function withPeople(data: GameData, n: number): GameState {
  const s = neutralGame(data);
  for (let i = 0; i < n; i++) {
    hire(s, data, { name: `P${i}`, focus: "technik", salaryCent: 100000, strength: { gameplay: 30, grafik: 30, sound: 30, story: 30, technik: 40 + i * 5 } });
  }
  return s;
}

describe("Team-Aufträge", () => {
  it("Vor fromYear gibt es nur Einzelaufträge; danach kommen Team-Angebote mit Größe, längerer Dauer und mehr Geld", () => {
    const data = testData();
    const team = data.contracts.team!;
    const s = neutralGame(data);
    const early = Array.from({ length: 40 }, () => drawContractOffer(s, data, stream(s, "ereignisse")));
    expect(early.every((o) => o.team === undefined)).toBe(true);
    s.week = 52 * (2005 - s.startYear);
    const late = Array.from({ length: 200 }, () => drawContractOffer(s, data, stream(s, "ereignisse")));
    const teams = late.filter((o) => (o.team ?? 1) > 1);
    expect(teams.length).toBeGreaterThan(0);
    expect(teams.length).toBeLessThan(late.length);
    for (const o of teams) {
      expect(o.team!).toBeGreaterThanOrEqual(team.sizeMin);
      const kind = data.contracts.kinds.find((k) => k.id === o.kind)!;
      expect(o.weeks).toBeGreaterThanOrEqual(kind.weeks[0]);
    }
    const avg = (xs: ContractOffer[]) => xs.reduce((a, o) => a + o.payCent, 0) / xs.length;
    expect(avg(teams)).toBeGreaterThan(avg(late.filter((o) => o.team === undefined)));
  });

  it("Das Team sind die besten freien Personen; alle sind gebunden, die Qualität ist das Mittel, nach der Frist sind alle frei", () => {
    const data = testData();
    const s = withPeople(data, 4);
    const offer: ContractOffer = { kind: data.contracts.kinds[0]!.id, client: data.contracts.clients[0]!, area: "technik", weeks: 6, payCent: 1000000, requirement: 1, team: 3 };
    const team = contractTeam(s, data, offer);
    expect(team.length).toBe(3);
    const q = teamContractQuality(data, team, "technik");
    const all = s.people.map((p) => teamContractQuality(data, [p], "technik")).sort((a, b) => b - a);
    expect(teamContractQuality(data, [team[0]!], "technik")).toBe(all[0]);
    const c = startContract(s, offer, team[0]!, team);
    expect(c.personIds).toEqual(team.map((p) => p.id));
    for (const p of team) expect(p.assignment).toEqual({ kind: "contract", id: c.id });
    expect(contractTeam(s, data, offer).some((p) => team.includes(p))).toBe(false);
    s.week = c.deadlineWeek;
    expect(settleContracts(s, data, 10000)).toBe(offer.payCent);
    expect(c.quality).toBe(q);
    expect(c.status).toBe("erfuellt");
    for (const p of team) expect(p.assignment).toBeNull();
  });
});
