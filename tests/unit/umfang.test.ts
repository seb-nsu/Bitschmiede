// Etappe 6c.1: Umfänge groß und AAA (PRD-R20, PRD-R22, PRD-R27, PRD-R28, PRD-T04).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { totalEffort } from "../../src/sim/systems/produkte/quality";
import { migrateState } from "../../src/sim/save";
import { input, lastProject, neutralGame, testData } from "../helpers";

const MITTEL = ["grosseSprites", "levelVielfalt", "titelmelodie", "einfacheSteuerung", "farbgrafik"];

describe("Umfänge groß und AAA (Etappe 6c.1)", () => {
  it("PRD-R28 Aufwand je Umfang: klein 0,4, mittel 1, groß 2,5, AAA 5", () => {
    const data = testData();
    const m = totalEffort(data, MITTEL, "mittel");
    expect(totalEffort(data, MITTEL, "gross")).toBe(Math.trunc((m * 25) / 10));
    expect(totalEffort(data, MITTEL, "aaa")).toBe(m * 5);
  });

  it("PRD-R20 groß erst ab 1990, AAA erst ab 1998", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(validateInput(s, data, input({ scope: "gross" }))).toBe("error.scopeTooEarly");
    expect(validateInput(s, data, input({ scope: "aaa" }))).toBe("error.scopeTooEarly");
    s.week = (1990 - s.startYear) * 52;
    expect(validateInput(s, data, input({ scope: "gross" }))).not.toBe("error.scopeTooEarly");
    expect(validateInput(s, data, input({ scope: "aaa" }))).toBe("error.scopeTooEarly");
  });

  it("PRD-R22 PRD-T04 ein AAA-Projekt bekommt am Ende des Vertical Slice eine Pflicht-Entscheidung mit vier Optionen", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input({ scope: "mittel", features: MITTEL })]);
    const p = lastProject(s);
    p.scope = "aaa";
    p.effortTotalBp = p.effortTotalBp * 5;
    const vslice = data.projects.phases.aaa.find((x) => x.id === "vslice")!;
    p.effortDoneBp = Math.trunc((p.effortTotalBp * (vslice.untilBp - 50)) / 10000);
    for (let i = 0; i < 40 && !s.events.some((e) => e.kind === "gate"); i++) {
      s = tick(s, data, s.events.filter((e) => e.kind !== "gate").map((e) => ({ type: "decide" as const, eventId: e.id, option: e.defaultOption })));
    }
    const gate = s.events.find((e) => e.kind === "gate")!;
    expect(gate.options).toEqual(["fortsetzen", "umsteuern", "pausieren", "abbrechen"]);
    expect(lastProject(s).phase).toBe("produktion");
  });

  it("PRD-R27 Freeze bei groß und AAA zu Beginn der Alpha", () => {
    const data = testData();
    expect(data.projects.freeze.gross.phase).toBe("alpha");
    expect(data.projects.freeze.aaa.phase).toBe("alpha");
    expect(data.projects.phases.aaa.map((x) => x.id)).toEqual(["konzept", "preprod", "vslice", "produktion", "alpha", "beta"]);
  });

  it("TEC-R44 Migration 54 → 55 ergänzt die Erwartung der Presse für groß und AAA", () => {
    const data = testData();
    const s = neutralGame(data) as unknown as Record<string, unknown> & { qNorm: Record<string, number> };
    const old = { ...s, schemaVersion: 54, qNorm: { klein: s.qNorm.klein!, mittel: s.qNorm.mittel! } };
    const m = migrateState(old as never);
    expect(m.qNorm.gross).toBeGreaterThan(m.qNorm.mittel);
    expect(m.qNorm.aaa).toBeGreaterThan(m.qNorm.gross);
  });
});
