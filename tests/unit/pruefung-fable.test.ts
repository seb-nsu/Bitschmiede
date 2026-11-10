// Prüfung Fable 03.11.2026: kleinere Vereinfachungen mit eigener Regel.
import { describe, expect, it } from "vitest";
import { isEstablished } from "../../src/sim/systems/marken";
import { revenueDelta } from "../../src/sim/systems/boerse";
import { applyInputs, validateInput } from "../../src/sim/tick";
import { migrateState } from "../../src/sim/save";
import { buildView } from "../../src/sim/view/view";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

describe("Prüfung Fable: Marken erst ab Hit oder Nachfolger (PRD-R70)", () => {
  it("Ein Titel unter der Hit-Schwelle ist keine etablierte Marke; ab Hit-Wertung oder zweitem Titel schon", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const p = lastProject(s);
    const b = s.brands.find((x) => x.id === p.brandId)!;
    p.result!.scoreBp = data.brands.hitScoreBp - 1;
    expect(isEstablished(s, data, b)).toBe(false);
    expect(buildView(s, data).brands.find((x) => x.id === b.id)!.established).toBe(false);
    expect(buildView(s, data).brandMarket.own.some((x) => x.id === b.id)).toBe(false);
    p.result!.scoreBp = data.brands.hitScoreBp;
    expect(isEstablished(s, data, b)).toBe(true);
    p.result!.scoreBp = 50000;
    b.titles.push(9999);
    expect(isEstablished(s, data, b)).toBe(true);
  });
});

describe("Prüfung Fable: Anlegerstimmung misst den Umsatz (FRM-R52, Formel 5.7 abgewandelt)", () => {
  it("Umsatz über Ziel hebt, deutlich darunter senkt stark; ein Quartalsverlust allein spielt keine Rolle", () => {
    const data = testData();
    expect(data.stock.target.basis).toBe("umsatz");
    const d = data.stock.delta;
    expect(revenueDelta(data, 130, 100)).toBe(d.strongUp);
    expect(revenueDelta(data, 105, 100)).toBe(d.up);
    expect(revenueDelta(data, 90, 100)).toBe(d.down);
    expect(revenueDelta(data, 50, 100)).toBe(d.strongDown);
    expect(revenueDelta(data, 1, 0)).toBe(d.strongUp);
  });
});

describe("Prüfung Fable: Lernpfad im Spielstand (Migration 62 → 63)", () => {
  it("Eingabe guideSeen merkt Kapitel, Karten und Hinweise; eine alte Partie zählt Offenes als gesehen", () => {
    const data = testData();
    let s = neutralGame(data);
    expect(s.guideSeen).toEqual({ hidden: false, skipped: [], unlocks: Object.keys(s.unlocks).sort(), firsts: [] });
    s = applyInputs(s, data, [{ type: "guideSeen", what: "unlocks", id: "markt" }, { type: "guideSeen", what: "firsts", id: "gate" }, { type: "guideSeen", what: "unlocks", id: "markt" }]);
    expect(s.guideSeen.unlocks.filter((x) => x === "markt").length).toBe(1);
    expect(s.guideSeen.firsts).toEqual(["gate"]);
    s = applyInputs(s, data, [{ type: "guideSeen", what: "hidden", id: "all" }]);
    expect(s.guideSeen.hidden).toBe(true);
    expect(validateInput(s, data, { type: "guideSeen", what: "x" as "hidden", id: "a" })).not.toBeNull();
    const old = structuredClone(s) as unknown as Record<string, unknown> & { schemaVersion: number };
    delete old.guideSeen;
    old.schemaVersion = 62;
    old.unlocks = { markt: 3, engine: 9 };
    expect(migrateState(old).guideSeen).toEqual({ hidden: false, skipped: [], unlocks: ["engine", "markt"], firsts: [] });
  });
});
