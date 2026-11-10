// Prüfung Fable 03.11.2026 (FRM-R61): Routine-Karten fragen nur einmal, danach entscheidet eine Regel.
import { describe, expect, it } from "vitest";
import { addEvent, eventStep } from "../../src/sim/systems/ereignisse";
import { delegationStep, playerDecision } from "../../src/sim/systems/delegation";
import { hire } from "../../src/sim/systems/firma";
import { neutralGame, testData } from "../helpers";

describe("Routine-Karten (FRM-R61, Prüfung Fable)", () => {
  it("Die erste Antwort des Spielers wird zur Regel; die nächste Karte entscheidet die Regel auch vor der Delegation", () => {
    const data = testData();
    const s = neutralGame(data);
    const p = hire(s, data, { name: "A", focus: "technik", salaryCent: 100000, strength: { gameplay: 30, grafik: 30, sound: 30, story: 30, technik: 40 } });
    const first = addEvent(s, data, { kind: "gehaltsforderung", scope: "projekt", projectId: null, options: ["erfuellen", "ablehnen"], defaultOption: "ablehnen", personId: p.id });
    playerDecision(s, data, first, "erfuellen");
    expect(s.delegation.rules.map((r) => [r.eventKey, r.option])).toEqual([["gehaltsforderung", "erfuellen"]]);
    expect(s.unlocks["delegation"]).toBeUndefined();
    const second = addEvent(s, data, { kind: "gehaltsforderung", scope: "projekt", projectId: null, options: ["erfuellen", "ablehnen"], defaultOption: "ablehnen", personId: p.id });
    delegationStep(s, data);
    expect(s.events.includes(second)).toBe(false);
    expect(s.delegation.history.at(-1)).toMatchObject({ eventKey: "gehaltsforderung", by: "regel", option: "erfuellen" });
  });

  it("Läuft die Frist ab, wird die Routine-Antwort aus den Daten zur Regel; andere Karten bleiben Fragen", () => {
    const data = testData();
    const s = neutralGame(data);
    addEvent(s, data, { kind: "schutzEntfernen", scope: "projekt", projectId: null, options: ["entfernen", "behalten"], defaultOption: "behalten" });
    addEvent(s, data, { kind: "neubau", scope: "projekt", projectId: null, options: ["jetzt", "spaeter"], defaultOption: "spaeter" });
    s.week += 60;
    eventStep(s, data);
    expect(s.delegation.rules.map((r) => [r.eventKey, r.option])).toEqual([["schutzEntfernen", data.delegation.routine["schutzEntfernen"]]]);
  });
});
