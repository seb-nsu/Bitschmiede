// Etappe 6c.7: Politur je Bereich (PRD-R50 erweitert, data/base/dev/polish.json).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { migrateState } from "../../src/sim/save";
import { input, lastProject, neutralGame, testData, untilReady } from "../helpers";
import type { Area, GameData, GameState } from "../../src/sim/model/types";

function play(data: GameData, area: Area | null, weeks: number): GameState {
  let s: GameState = tick(neutralGame(data), data, [input()]);
  const id = lastProject(s).id;
  s = untilReady(s, data, id);
  if (area) s = tick(s, data, [{ type: "setPolish", projectId: id, area }]);
  else s = tick(s, data);
  for (let i = 1; i < weeks; i++) s = tick(s, data);
  return tick(s, data, [{ type: "release", projectId: id }]);
}

describe("Politur je Bereich (Etappe 6c.7)", () => {
  it("PRD-R50 Nur für laufende oder fertige Projekte und bekannte Bereiche", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    const id = lastProject(s).id;
    expect(validateInput(s, data, { type: "setPolish", projectId: id, area: "grafik" })).toBeNull();
    expect(validateInput(s, data, { type: "setPolish", projectId: id, area: null })).toBeNull();
    expect(validateInput(s, data, { type: "setPolish", projectId: id, area: "mode" as Area })).toBe("error.unknownArea");
    expect(validateInput(s, data, { type: "setPolish", projectId: 99, area: "grafik" })).toBe("error.unknownProject");
  });

  it("PRD-R50 Abnehmender Ertrag: jede Woche holt 15 % der Lücke zum Höchstbonus auf", () => {
    const data = testData();
    const p = lastProject(play(data, "grafik", 4));
    // Vier Wochen plus die Woche des Releases: 1.500 · (1 − 0,85⁵) ≈ 834 bp.
    expect(p.polish.grafik).toBeGreaterThan(820);
    expect(p.polish.grafik).toBeLessThan(845);
    const longer = lastProject(play(data, "grafik", 12));
    expect(longer.polish.grafik! - p.polish.grafik!).toBeLessThan(p.polish.grafik!);
    expect(longer.polish.grafik).toBeLessThan(data.polish.maxBonusBp);
  });

  it("PRD-R50 Politur hebt den Balken Team, kostet aber Bugsuche", () => {
    const data = testData();
    const plain = lastProject(play(data, null, 6));
    const polished = lastProject(play(data, "grafik", 6));
    const team = (p: typeof plain) => p.result!.bars.find((b) => b.factor === "team")!.value;
    expect(team(polished)).toBeGreaterThan(team(plain));
    expect(polished.result!.bugsAtRelease).toBeGreaterThan(plain.result!.bugsAtRelease);
  });

  it("TEC-R44 Migration 60 → 61: bisher ohne Politur", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    const old = JSON.parse(JSON.stringify({ ...s, schemaVersion: 60 })) as { projects: Record<string, unknown>[] };
    for (const p of old.projects) {
      delete p.polish;
      delete p.polishArea;
    }
    const m = migrateState(old as never);
    expect(m.projects[0]!.polishArea).toBeNull();
    expect(m.projects[0]!.polish).toEqual({});
  });
});
