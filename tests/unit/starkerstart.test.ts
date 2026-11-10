// 4b.10 Starker Start (KRN-R70 ff., PRD-R10, PRD-R14): Das erste Projekt liegt im Trend und passt gut.
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, newGame } from "../../src/sim/game";
import { boardPreview, strongStart } from "../../src/sim/view/view";
import { SEED_A, SEED_B, testData } from "../helpers";

describe("4b.10 Starker Start", () => {
  const data = testData();
  for (const seed of [SEED_A, SEED_B]) {
    it(`erste Kombination mit Trend ≥ 1 und Passung ≥ 1,1, kein Thema mit Inhaltsstufe (${seed})`, () => {
      const s = newGame(data, seed, DEFAULT_SETTINGS);
      const f = strongStart(s, data);
      expect(s.trends.genre[f.genre]).toBeGreaterThanOrEqual(10000);
      expect(s.trends.theme[f.theme]).toBeGreaterThanOrEqual(10000);
      expect(s.world.themeFit[f.genre]![f.theme]).toBeGreaterThanOrEqual(11000);
      expect(data.themes.find((t) => t.id === f.theme)!.contentLevel).toBe(0);
      // Abschluss 1.0 (Einstieg): keine vorbelegte Karte schadet der Passung zum Genre-Profil.
      expect(f.features.length).toBe(data.start.firstProject.features.length);
      const preview = boardPreview(s, data, { ...f, people: s.people.map((p) => p.id) });
      for (const id of f.features) expect(preview.cardFit[id] ?? 0).toBeGreaterThanOrEqual(-100);
      expect(f.platforms.length).toBe(1);
    });
  }
  it("später Start: Plattform fällt auf eine aktive zurück", () => {
    const s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    s.startYear = 2010;
    const f = strongStart(s, data);
    expect(f.platforms).not.toContain("fuchs");
  });
});
