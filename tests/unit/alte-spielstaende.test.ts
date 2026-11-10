// TEC-R41: Echte Spielstände früherer Versionen (erzeugt mit tools/playsave.ts auf dem jeweiligen Stand, Bot
// „vernuenftig“ bis 1984) laden, migrieren und laufen ein Jahr weiter. Die Dateien liegen in tests/fixtures/saves.
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadBaseData } from "../../src/mods/loadBase";
import { loadSave, type SaveFile } from "../../src/sim/save";
import { SCHEMA_VERSION } from "../../src/sim/game";
import { tick } from "../../src/sim/tick";
import { buildView } from "../../src/sim/view/view";
import { stateChecksum } from "../../src/sim/hash";
import { botInputs, createBot } from "../../tools/bots";

const data = loadBaseData();
const read = (v: number): SaveFile => JSON.parse(gunzipSync(readFileSync(`tests/fixtures/saves/schema-${v}.json.gz`)).toString()) as SaveFile;

describe("Alte Spielstände", () => {
  for (const v of [37, 52, 54, 57]) {
    it(`TEC-R41 Schema ${v} wird migriert und läuft ein Jahr mit Bot und Anzeigemodell weiter`, () => {
      const file = read(v);
      expect(file.state.schemaVersion).toBe(v);
      const r = loadSave(file, data);
      expect(r.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(r.warnings).not.toContain("save.modMissing");
      let s = r.state;
      const bot = createBot("vernuenftig", s.seed);
      const week = s.week;
      for (let i = 0; i < 52 && !s.gameOver; i++) s = tick(s, data, botInputs(bot, data, s));
      expect(s.week).toBe(week + 52);
      expect(Number.isSafeInteger(s.moneyCent)).toBe(true);
      const view = buildView(s, data);
      expect(view.date.year).toBeGreaterThan(1984);
    }, 60000);
  }

  it("ZIE-R37 fehlende Mod: Hinweis, Ersatz für unbekannte Genres und Plattformen, Spiel läuft weiter", () => {
    const file = read(57);
    file.meta.mods = [...file.meta.mods, { id: "fehlende-mod", version: "1.0.0" }];
    const p = (file.state.projects as unknown as { genre: string; platforms: string[] }[])[0]!;
    p.genre = "fehlende-mod:genre";
    p.platforms = ["fehlende-mod:konsole"];
    file.meta.stateChecksum = stateChecksum(file.state);
    const r = loadSave(file, data);
    expect(r.warnings).toEqual(expect.arrayContaining(["save.modMissing", "save.modFallback"]));
    let s = r.state;
    for (let i = 0; i < 13; i++) s = tick(s, data, []);
    expect(s.projects.every((x) => data.genres.some((g) => g.id === x.genre))).toBe(true);
  }, 60000);
});
