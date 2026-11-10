// 4b.9: 60 Themen und 15 Genres als Daten (PRD-R10). Jedes Genre hat Profil, Passung zu allen Themen, drei Untergenres,
// Markennähe, Texte und ein Symbol (4b.4, UI-R60).
import { TEXTS_DE, TEXTS_EN } from "../../src/ui/textData";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { iconPaths } from "../../src/ui/icons";
import { testData } from "../helpers";

const de = TEXTS_DE;
const en = TEXTS_EN;
const brands = JSON.parse(readFileSync("data/base/brands.json", "utf8")) as { near: Record<string, string[]> };

describe("4b.9 Inhaltsausbau", () => {
  const data = testData();
  it("PRD-R10: 15 Genres und 60 Themen, jede Passung in 0,5–1,3, Profile summieren sich auf 1", () => {
    expect(data.genres.length).toBe(15);
    expect(data.themes.length).toBe(60);
    for (const g of data.genres) {
      expect(Object.values(g.expectedProfile).reduce((a, b) => a + b, 0)).toBe(10000);
      for (const t of data.themes) {
        expect(g.themeFit[t.id], `${g.id}/${t.id}`).toBeGreaterThanOrEqual(5000);
        expect(g.themeFit[t.id], `${g.id}/${t.id}`).toBeLessThanOrEqual(13000);
      }
    }
  });
  it("je Genre drei Untergenres, Markennähe, Texte und Symbol; je Thema Texte und Symbol", () => {
    for (const g of data.genres) {
      expect(data.subgenres.filter((s) => s.genre === g.id).length, g.id).toBe(3);
      expect(brands.near[g.id]?.length, g.id).toBe(2);
      expect(de[`genre.${g.id}`] && en[`genre.${g.id}`], g.id).toBeTruthy();
      expect(iconPaths("genre", g.id), g.id).not.toBeNull();
    }
    for (const t of data.themes) {
      expect(de[`theme.${t.id}`] && en[`theme.${t.id}`], t.id).toBeTruthy();
      expect(iconPaths("theme", t.id), t.id).not.toBeNull();
    }
    for (const s of data.subgenres) expect(de[`subgenre.${s.id}`] && en[`subgenre.${s.id}`], s.id).toBeTruthy();
  });
});
