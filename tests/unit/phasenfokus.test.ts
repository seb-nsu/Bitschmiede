// Etappe 6c.6: Phasen-Schwerpunkt (PRD-R20 erweitert, data/base/dev/phasefocus.json).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { migrateState } from "../../src/sim/save";
import { buildView } from "../../src/sim/view/view";
import { input, lastProject, neutralGame, playProject, testData, untilReady } from "../helpers";
import type { GameState } from "../../src/sim/model/types";

function started(focus: Record<string, string>) {
  const data = testData();
  let s: GameState = tick(neutralGame(data), data, [input()]);
  const id = lastProject(s).id;
  s = tick(s, data, Object.entries(focus).map(([group, f]) => ({ type: "setPhaseFocus" as const, projectId: id, group, focus: f })));
  return { data, s, id };
}

describe("Phasen-Schwerpunkt (Etappe 6c.6)", () => {
  it("PRD-R20 Wahl nur für Phasengruppen des Umfangs und bekannte Optionen", () => {
    const { data, s, id } = started({});
    expect(validateInput(s, data, { type: "setPhaseFocus", projectId: id, group: "produktion", focus: "tempo" })).toBeNull();
    // Kleine Projekte haben keine Pre-Production und keine Beta.
    expect(validateInput(s, data, { type: "setPhaseFocus", projectId: id, group: "beta", focus: "bugjagd" })).toBe("error.phaseFocus");
    expect(validateInput(s, data, { type: "setPhaseFocus", projectId: id, group: "produktion", focus: "bugjagd" })).toBe("error.phaseFocus");
    expect(validateInput(s, data, { type: "setPhaseFocus", projectId: 999, group: "produktion", focus: "tempo" })).toBe("error.unknownProject");
  });

  it("PRD-R20 Tempo macht schneller und erzeugt mehr Bugs, Feinschliff kostet Zeit und hebt die Teamqualität", () => {
    const base = started({});
    const fast = started({ produktion: "tempo" });
    const fine = started({ produktion: "feinschliff" });
    const weeks = (x: typeof base) => {
      const r = untilReady(x.s, x.data, x.id);
      return { week: r.week, p: r.projects.find((p) => p.id === x.id)! };
    };
    const b = weeks(base), f = weeks(fast), q = weeks(fine);
    expect(f.week).toBeLessThan(b.week);
    expect(q.week).toBeGreaterThan(b.week);
    expect(f.p.bugsBp).toBeGreaterThan(b.p.bugsBp);
    expect(b.p.phaseQualityBp).toBe(10000);
    expect(q.p.phaseQualityBp).toBeGreaterThan(10300);
    expect(q.p.phaseQualityBp).toBeLessThan(10600);
    const v = buildView(fine.s, fine.data);
    const pf = v.active.find((p) => p.id === fine.id)!.phaseFocus;
    expect(pf.map((g) => g.group)).toEqual(["produktion"]);
    expect(pf[0]!.current).toBe("feinschliff");
  });

  it("PRD-R50 Der Qualitätsfaktor des Schwerpunkts erscheint im Balken Team", () => {
    const data = testData();
    const plain = lastProject(playProject(neutralGame(data), data, input()));
    let s: GameState = tick(neutralGame(data), data, [input()]);
    s = tick(s, data, [{ type: "setPhaseFocus", projectId: lastProject(s).id, group: "produktion", focus: "feinschliff" }]);
    const id = lastProject(s).id;
    s = untilReady(s, data, id);
    for (let i = 0; i < 3; i++) s = tick(s, data);
    const fine = lastProject(tick(s, data, [{ type: "release", projectId: id }]));
    const team = (p: typeof plain) => p.result!.bars.find((b) => b.factor === "team")!.value;
    expect(team(fine)).toBeGreaterThan(team(plain));
  });

  it("TEC-R44 Migration 59 → 60: bisherige Projekte arbeiten ausgewogen", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    const old = JSON.parse(JSON.stringify({ ...s, schemaVersion: 59 })) as { projects: Record<string, unknown>[] };
    for (const p of old.projects) {
      delete p.phaseFocus;
      delete p.phaseQualityBp;
    }
    const m = migrateState(old as never);
    expect(m.projects[0]!.phaseFocus).toEqual({});
    expect(m.projects[0]!.phaseQualityBp).toBe(10000);
  });
});
