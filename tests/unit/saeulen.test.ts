// Etappe 6c.5: Design-Säulen (PRD-R50 erweitert, data/base/dev/pillars.json).
import { describe, expect, it } from "vitest";
import { validateInput } from "../../src/sim/tick";
import { migrateState } from "../../src/sim/save";
import { boardPreview } from "../../src/sim/view/view";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

describe("Design-Säulen (Etappe 6c.5)", () => {
  it("PRD-R50 Höchstens zwei verschiedene, bekannte Säulen", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(validateInput(s, data, input({ pillars: ["praesentation", "inhalt"] }))).toBeNull();
    expect(validateInput(s, data, input({ pillars: ["praesentation", "inhalt", "innovation"] }))).toBe("error.pillarsTooMany");
    expect(validateInput(s, data, input({ pillars: ["inhalt", "inhalt"] }))).toBe("error.pillarsTooMany");
    expect(validateInput(s, data, input({ pillars: ["grafikwunder"] }))).toBe("error.unknownPillar");
  });

  it("PRD-R50 Passende Karten bringen den Bonus mal Vorliebe der Presse, fehlende einen Abzug", () => {
    const data = testData();
    const s = neutralGame(data);
    // Große Sprites (Optik) und Titelmelodie (Klang) tragen gut zwei Drittel des Kartenwerts: voller Bonus, Action 1,3.
    const good = boardPreview(s, data, input({ pillars: ["praesentation"] })).quality!;
    expect(good.pillars).toEqual([expect.objectContaining({ id: "praesentation", weightBp: 13000, bp: 650 })]);
    expect(good.pillarBp).toBe(10650);
    // Keine Karte mit System, Taktik oder Denken: Versprechen nicht eingelöst.
    const bad = boardPreview(s, data, input({ pillars: ["spieltiefe"] })).quality!;
    expect(bad.pillars[0]!.shareBp).toBe(0);
    expect(bad.pillarBp).toBe(9600);
    const none = boardPreview(s, data, input()).quality!;
    expect(none.pillarBp).toBe(10000);
    expect(good.indexBp).toBeGreaterThan(none.indexBp);
    expect(bad.indexBp).toBeLessThan(none.indexBp);
  });

  it("PRD-R50 Die Säulen stehen als eigener Balken im Wasserfall, die Summe bleibt die Wertung", () => {
    const data = testData();
    const with_ = lastProject(playProject(neutralGame(data), data, input({ pillars: ["praesentation"] })));
    const without = lastProject(playProject(neutralGame(data), data, input()));
    const bar = (p: typeof with_) => p.result!.bars.find((b) => b.factor === "saeulen")!.value;
    expect(with_.pillars).toEqual(["praesentation"]);
    expect(bar(with_)).toBeGreaterThan(0);
    expect(bar(without)).toBe(0);
    const sum = with_.result!.baseBp + with_.result!.bars.reduce((a, b) => a + b.value, 0);
    expect(sum).toBe(with_.result!.scoreBp);
  });

  it("TEC-R44 Migration 58 → 59: keine Säulen, Säulen-Balken 0 nach der Passung", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const old = JSON.parse(JSON.stringify({ ...s, schemaVersion: 58 })) as { projects: { pillars?: string[]; result: { bars: { factor: string }[] } }[] };
    for (const p of old.projects) {
      delete p.pillars;
      p.result.bars = p.result.bars.filter((b) => b.factor !== "saeulen");
    }
    const m = migrateState(old as never);
    expect(m.projects[0]!.pillars).toEqual([]);
    const factors = m.projects[0]!.result!.bars.map((b) => b.factor);
    expect(factors.indexOf("saeulen")).toBe(factors.indexOf("passung") + 1);
  });
});
