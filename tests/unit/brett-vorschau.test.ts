// Durchschaubarkeit im Design-Brett (Spieltest 02.11.2026): Karten-Info und Wertungs-Vorschau (PRD-R50).
import { describe, expect, it } from "vitest";
import { boardPreview } from "../../src/sim/view/view";
import { computeQuality } from "../../src/sim/systems/produkte/quality";
import { input, neutralGame, testData } from "../helpers";

describe("Brett-Vorschau", () => {
  it("Wertungs-Vorschau folgt PRD-R50: Faktoren wie computeQuality, Thema ohne Wissensbuch unbekannt", () => {
    const data = testData();
    const s = neutralGame(data);
    const d = input();
    const p = boardPreview(s, data, { ...d });
    expect(p.quality).not.toBeNull();
    const q = computeQuality(data, s, { genre: d.genre, theme: d.theme, scope: d.scope, features: d.features, bugsBp: 0, people: s.people, engineLevels: p.engineLevels });
    expect(p.quality!.synergyBp).toBe(q.synergyBp);
    expect(p.quality!.profileBp).toBe(q.profileFactorBp);
    expect(p.quality!.engineBp).toBe(q.engineFactorBp);
    expect(p.quality!.theme).toBeNull();
    s.knowledge.push({ key: `passung:${d.genre}:${d.theme}`, factor: "passung", ref: { genre: d.genre, theme: d.theme }, up: 1, down: 0, params: {}, firstWeek: 0, lastWeek: 0 });
    expect(boardPreview(s, data, { ...d }).quality!.theme).toEqual({ direction: 1, status: "vermutlich" });
  });

  it("Karten-Info: Synergien einer Karte mit der Auswahl und Engine-Stufen", () => {
    const data = testData();
    const s = neutralGame(data);
    const d = input();
    const p = boardPreview(s, data, { ...d });
    for (const [id, hits] of Object.entries(p.cardSynergy)) {
      for (const h of hits) {
        expect([h.a, h.b]).toContain(id);
        expect(d.features.includes(h.a === id ? h.b : h.a)).toBe(true);
      }
    }
    expect(Object.keys(p.engineLevels).length).toBeGreaterThan(0);
  });
});
