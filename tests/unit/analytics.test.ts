// Etappe 5.8: Analytics (S06 BTR-R28 bis BTR-R30, BTR-T06; S14 KI-R09).
import { describe, expect, it } from "vitest";
import { validateInput } from "../../src/sim/tick";
import { arpuOf, churnOf, initLive } from "../../src/sim/systems/live";
import { departmentWeeklyCost } from "../../src/sim/systems/betrieb";
import { perceptionSd } from "../../src/sim/systems/ki/entscheidung";
import { migrateState } from "../../src/sim/save";
import type { AiStudio } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

describe("Analytics (S06 5.8)", () => {
  it("BTR-T06: intensiv senkt den Churn und hebt den ARPU gegenüber keiner Analytics", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const p = lastProject(s);
    p.type = "f2p";
    p.ops!.live = initLive(s, data, p)!;
    s.operations.analytics = "keine";
    const churn0 = churnOf(s, data, p).churnBp;
    const arpu0 = arpuOf(s, data, p.ops!.live);
    s.operations.analytics = "intensiv";
    expect(churnOf(s, data, p).churnBp).toBeLessThan(churn0);
    expect(arpuOf(s, data, p.ops!.live)).toBeGreaterThan(arpu0);
  });

  it("BTR-R28: Analytics erst ab 2010; die Personen kosten Gehalt", () => {
    const data = testData();
    const s = neutralGame(data);
    s.unlocks.betrieb = s.week;
    s.operations.size = 2;
    expect(validateInput(s, data, { type: "setOperations", analytics: "intensiv" })).toBe("error.tooEarly");
    const before = departmentWeeklyCost(s, data);
    s.operations.analytics = "intensiv";
    expect(departmentWeeklyCost(s, data)).toBeGreaterThan(before);
    s.startYear = 2010;
    s.week = 0;
    expect(validateInput(s, data, { type: "setOperations", analytics: "intensiv" })).toBeNull();
  });

  it("KI-R09: Analytics halbiert den Wahrnehmungsfehler je Stufe, höchstens bis Hardcore", () => {
    const data = testData();
    const s = neutralGame(data);
    const studio = { size: "gross" } as AiStudio;
    const sd = data.ai.difficulty.normal!.perceptionSdBp;
    expect(perceptionSd(s, data, studio)).toBe(sd);
    s.startYear = 2012;
    s.week = 0;
    expect(perceptionSd(s, data, studio)).toBe(Math.max(sd / 4, data.ai.difficulty.hardcore!.perceptionSdBp));
    expect(perceptionSd(s, data, { size: "mittel" } as AiStudio)).toBe(sd / 2);
    expect(perceptionSd(s, data, { size: "klein" } as AiStudio)).toBe(sd);
  });

  it("Migration 41 → 42: Analytics „keine“", () => {
    const data = testData();
    const s = neutralGame(data);
    const old = structuredClone(s) as unknown as { schemaVersion: number; operations: Record<string, unknown> };
    old.schemaVersion = 41;
    delete old.operations.analytics;
    expect(migrateState(old as never).operations.analytics).toBe("keine");
  });
});
