// Etappe 5.4: Abteilung Betrieb und Kundenservice (S06 BTR-R01, R02, R04, R24, R25, R27, BTR-F2).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { departmentWeeklyCost, monthlyOperations, productTickets, serviceInfluence, suggestedSize, ticketChannel } from "../../src/sim/systems/betrieb";
import { engineCapacity } from "../../src/sim/systems/engine";
import type { GameData, GameState } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

function released(data: GameData): GameState {
  return playProject(neutralGame(data), data, input());
}

describe("Abteilung Betrieb (S06 5.4)", () => {
  it("BTR-T12: 10.000 Verkäufe im Monat, offline, B = 1 ergeben 700 Anfragen; ohne Bugs 200", () => {
    const data = testData();
    const p = structuredClone(lastProject(released(data)));
    p.sales!.weekly = [2500, 2500, 2500, 2500];
    p.ops!.known = { leicht: 0, mittel: 0, schwer: 20 };
    expect(productTickets(data, p)).toBe(700);
    p.ops!.known = { leicht: 0, mittel: 0, schwer: 0 };
    expect(productTickets(data, p)).toBe(200);
  });

  it("BTR-T18: ohne Online-Produkt, Lizenz mit Support und unter 20 Anfragen bleibt die Abteilung gesperrt", () => {
    const data = testData();
    let s = released(data);
    for (const p of s.projects) if (p.sales) p.sales.weekly = [1, 1, 1, 1];
    for (let i = 0; i < 6; i++) s = tick(s, data);
    expect(s.operations.triggered).toBe(false);
    expect(validateInput(s, data, { type: "setOperations", size: 3 })).toBe("error.locked");
    s.operations.triggered = true;
    s.unlocks.betrieb = s.week;
    expect(validateInput(s, data, { type: "setOperations", size: 3 })).toBeNull();
  });

  it("BTR-R02: ein Verkaufserfolg mit vielen Anfragen löst die Abteilung aus", () => {
    const data = testData();
    const s = released(data);
    for (const p of s.projects) if (p.sales) p.sales.weekly = [3000, 3000, 3000, 3000];
    monthlyOperations(s, data);
    expect(s.operations.triggered).toBe(true);
  });

  it("BTR-T04: Kundenservice unter der Hälfte der Anfragen lässt den Rückstand wachsen und senkt die Zufriedenheit", () => {
    const data = testData();
    let s = released(data);
    s.unlocks.betrieb = s.week;
    s.operations.triggered = true;
    s.operations.auto = false;
    s.operations.size = 1;
    const id = lastProject(s).id;
    const pr = s.projects.find((x) => x.id === id)!;
    pr.ops!.known = { leicht: 0, mittel: 0, schwer: 0 };
    pr.ops!.hidden = { leicht: 0, mittel: 0, schwer: 0 };
    // Viele Verkäufe: Anfragen ≫ 1 Person × 60 % × 250 je Monat.
    for (const p of s.projects) if (p.sales) p.sales.weekly = [20000, 20000, 20000, 20000];
    monthlyOperations(s, data);
    const first = s.operations.backlog;
    expect(first).toBeGreaterThan(0);
    monthlyOperations(s, data);
    expect(s.operations.backlog).toBeGreaterThan(first);
    expect(serviceInfluence(s, data)).toBeLessThan(0);
    const before = s.projects.find((x) => x.id === id)!.ops!.satisfactionBp;
    s = tick(s, data);
    expect(s.projects.find((x) => x.id === id)!.ops!.satisfactionBp).toBeLessThan(before);
  });

  it("BTR-R04: Auslagern beantwortet alles, kostet je Anfrage die Hälfte und wirkt schwächer", () => {
    const data = testData();
    const s = released(data);
    s.unlocks.betrieb = s.week;
    s.operations.size = 0;
    s.operations.auto = false;
    s.operations.ticketsLastMonth = 400;
    s.operations.backlog = 0;
    s.operations.outsourced = false;
    const inHouse = serviceInfluence(s, data);
    s.operations.outsourced = true;
    expect(serviceInfluence(s, data)).toBeGreaterThan(0);
    expect(serviceInfluence(s, data)).toBeLessThan(inHouse);
    expect(departmentWeeklyCost(s, data)).toBeGreaterThan(0);
  });

  it("Vorschlag nach Last: mehr Anfragen, mehr Personen; mindestens eine", () => {
    const data = testData();
    const s = released(data);
    expect(suggestedSize(s, data, 0, 0)).toBe(1);
    expect(suggestedSize(s, data, 3000, 0)).toBeGreaterThan(suggestedSize(s, data, 300, 0));
  });

  it("BTR-R02: ohne Abteilung bremst der Engine-Support das Engine-Team, höchstens um 30 %", () => {
    const data = testData();
    const s = released(data);
    s.people[0]!.assignment = { kind: "engine", id: 0 };
    s.engine = s.engine ?? null;
    const before = s.engine ? engineCapacity(s, data) : 0;
    s.operations.engineMalusBp = 3000;
    if (s.engine) expect(engineCapacity(s, data)).toBe(Math.trunc((before * 7000) / 10000));
    s.operations.engineMalusBp = 0;
    expect(s.operations.engineMalusBp).toBe(0);
  });

  it("BTR-R01: Aufteilung muss 100 % ergeben; Größe setzen schaltet die Automatik ab", () => {
    const data = testData();
    let s = released(data);
    s.unlocks.betrieb = s.week;
    expect(validateInput(s, data, { type: "setOperations", splitBp: { liveops: 5000, service: 5000, community: 1000, support: 0 } })).toBe("error.split");
    s = tick(s, data, [{ type: "setOperations", size: 4, splitBp: { liveops: 0, service: 8000, community: 1000, support: 1000 } }]);
    expect(s.operations.size).toBe(4);
    expect(s.operations.auto).toBe(false);
    expect(s.operations.splitBp.service).toBe(8000);
  });

  it("BTR-R25: Kanal wechselt mit der Epoche", () => {
    const data = testData();
    const s = released(data);
    expect(ticketChannel(s, data)).toBe("hotline");
    s.startYear = 2020;
    expect(ticketChannel(s, data)).toBe("discord");
  });
});
