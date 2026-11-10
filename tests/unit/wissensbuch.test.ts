import { describe, expect, it } from "vitest";
import { knowledgeStatus, recordRelease } from "../../src/sim/systems/wissensbuch";
import type { FeatureDef, KnowledgeEntry } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

function entry(up: number, down: number): KnowledgeEntry {
  return { key: "k", factor: "passung", ref: {}, up, down, params: {}, firstWeek: 0, lastWeek: 0 };
}

describe("Wissensbuch", () => {
  it("PRD-T01 Rollenspiel mit 10 % Story bei 30 % Erwartung: negativer Profilbalken und Eintrag", () => {
    const data = testData();
    const base: Omit<FeatureDef, "id" | "area" | "effort"> = { baseValue: 500000, innovation: 0, stability: 0, fun: 0, tags: [], contentLevel: 0, availableFrom: 1980, requires: { module: "werkzeuge", level: 0 }, performanceCost: 0 };
    data.features.push(
      { ...base, id: "tGameplay", area: "gameplay", effort: { gameplay: 500000 } },
      { ...base, id: "tGrafik", area: "grafik", effort: { grafik: 400000 } },
      { ...base, id: "tStory", area: "story", effort: { story: 100000 } },
    );
    const s0 = neutralGame(data);
    s0.world.expectedProfile.rollenspiel = { gameplay: 3500, grafik: 2500, sound: 500, story: 3000, technik: 500 };
    const s = playProject(s0, data, input({ genre: "rollenspiel", theme: "fantasy", features: ["tGameplay", "tGrafik", "tStory"] }));
    const r = lastProject(s).result!;
    expect(r.quality.profileActual.story).toBe(1000);
    expect(r.bars.find((b) => b.factor === "profil")!.value).toBeLessThan(0);
    const e = s.knowledge.find((k) => k.key === "profil:rollenspiel:story")!;
    expect(e).toBeDefined();
    expect(e.up).toBe(1);
    expect(e.params).toEqual({ actual: 1000, expected: 3000 });
  });

  it("UI-R95 UI-T17 jeder Release erzeugt höchstens zwei Einträge oder Bestätigungen, Tagesform nie", () => {
    const data = testData();
    let s = neutralGame(data, "00000000000000a1", { pressRandom: "normal" });
    for (let i = 0; i < 3; i++) {
      const before = s.knowledge.reduce((n, k) => n + k.up + k.down, 0);
      s = playProject(s, data, input());
      const after = s.knowledge.reduce((n, k) => n + k.up + k.down, 0);
      expect(after - before).toBeGreaterThanOrEqual(1);
      expect(after - before).toBeLessThanOrEqual(2);
      expect(lastProject(s).result!.knowledgeKeys.length).toBe(after - before);
    }
    expect(s.knowledge.every((k) => (k.factor as string) !== "tagesform")).toBe(true);
  });

  it("UI-R96 Sicherheitsgrad: 1–2 vermutlich, ab 3 bestätigt", () => {
    expect(knowledgeStatus(entry(1, 0)).status).toBe("vermutlich");
    expect(knowledgeStatus(entry(2, 0)).status).toBe("vermutlich");
    expect(knowledgeStatus(entry(3, 0)).status).toBe("bestaetigt");
  });

  it("UI-R97 Gegenrichtung macht den Eintrag umstritten, bis eine Seite zwei Releases Vorsprung hat", () => {
    expect(knowledgeStatus(entry(3, 1)).status).toBe("bestaetigt");
    expect(knowledgeStatus(entry(1, 1)).status).toBe("umstritten");
    expect(knowledgeStatus(entry(2, 1)).status).toBe("umstritten");
    expect(knowledgeStatus(entry(3, 2)).status).toBe("umstritten");
    expect(knowledgeStatus(entry(1, 3))).toEqual({ status: "bestaetigt", direction: -1, count: 3 });
    expect(knowledgeStatus(entry(0, 2))).toEqual({ status: "vermutlich", direction: -1, count: 2 });
  });

  it("UI-R97 derselbe Faktor mit Gegenrichtung zählt beim selben Eintrag", () => {
    const data = testData();
    const s = neutralGame(data);
    const done = playProject(s, data, input());
    const p = lastProject(done);
    const r = p.result!;
    const passung = r.bars.map((b) => (b.factor === "passung" ? { ...b, value: 5000 } : { ...b, value: 0 }));
    recordRelease(done, p, r.quality, passung, 10000);
    const flipped = passung.map((b) => ({ ...b, value: -b.value }));
    recordRelease(done, p, r.quality, flipped, 10000);
    const e = done.knowledge.find((k) => k.key === "passung:action:scifi")!;
    expect([e.up, e.down]).toEqual([1, 1]);
    expect(knowledgeStatus(e).status).toBe("umstritten");
  });
});
