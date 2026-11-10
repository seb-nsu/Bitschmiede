// Teilschritt 3.11: Bühne der Zentrale (S11 UI-R70, Abschnitt 8.3): Tische je Projekt, Figuren und Requisiten.
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import { stageView } from "../../src/sim/view/buehneView";
import { drawApplicant, hire } from "../../src/sim/systems/firma";
import { stream } from "../../src/sim/rng";
import { input, neutralGame, testData } from "../helpers";

describe("Bühne (UI-R70, S11 8.3)", () => {
  it("UI-R70 ein Tisch je Projekt mit Schild und Fortschritt, freie Personen am eigenen Tisch", () => {
    const data = testData();
    let s = neutralGame(data);
    s = tick(s, data, [input({ title: "Sternflug", people: [1] })]);
    const v = stageView(s, data);
    expect(v.layout).toBe("garage");
    expect(v.epoch).toBe("80");
    const table = v.tables.find((t) => t.kind === "project")!;
    expect(table.label).toBe("Sternflug");
    expect(table.figures.map((f) => f.id)).toEqual([1]);
    expect(table.progressBp).toBeGreaterThan(0);
    expect(v.tables.find((t) => t.kind === "frei")!.figures.map((f) => f.id)).toEqual([2]);
    expect(v.tables.flatMap((t) => t.figures).find((f) => f.id === 1)!.keyRole).not.toBeNull();
  });

  it("S11 8.3 Requisiten: Zusatztische bei Überbelegung, Röhrenmonitore bei alter Hardware, müde Figuren bei Burnout", () => {
    const data = testData();
    const s = neutralGame(data);
    s.moneyCent = 1e12;
    const rng = stream(s, "personal");
    while (s.people.length < 6) hire(s, data, drawApplicant(s, data, rng));
    s.people[0]!.burnoutBp = 7000;
    s.week = 6 * 52;
    const v = stageView(s, data);
    expect(v.props.extraDesks).toBe(6 - v.places);
    expect(v.props.oldHardwarePct).not.toBeNull();
    expect(v.props.burnout).toBe(1);
    expect(v.tables.flatMap((t) => t.figures).find((f) => f.id === s.people[0]!.id)!.tired).toBe(true);
  });

  it("UI-R70 höchstens 40 Figuren; der Rest steht als Zahl daneben", () => {
    const data = testData();
    const s = neutralGame(data);
    s.moneyCent = 1e12;
    const rng = stream(s, "personal");
    while (s.people.length < 45) hire(s, data, drawApplicant(s, data, rng));
    const v = stageView(s, data);
    expect(v.tables.flatMap((t) => t.figures)).toHaveLength(40);
    expect(v.hidden).toBe(5);
  });
});
