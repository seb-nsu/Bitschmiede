// 4b.5 (UI-R80–R83): Musik und Ereignistöne als Daten. Jede Epoche der Bühne hat Musik, jede Zuordnung zeigt auf einen Ton.
import { TEXTS_DE } from "../../src/ui/textData";
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import music from "../../data/audio/music.json";
import sounds from "../../data/audio/sounds.json";
import stageGfx from "../../data/gfx/stage.json";

const stage = JSON.parse(readFileSync("data/base/stage/config.json", "utf8")) as { epochs: { id: string }[] };
const texts = TEXTS_DE;

describe("4b.5 Musik und Töne", () => {
  it("UI-R81: Musik für jede Epoche und alle drei Stimmungen", () => {
    for (const e of stage.epochs) expect(Object.keys(music.epochs)).toContain(e.id);
    expect(Object.keys(music.moods).sort()).toEqual(["angespannt", "festlich", "ruhig"]);
    expect(music.fadeMs).toBe(2000);
  });
  it("UI-R82: Ton-Zuordnungen zeigen auf vorhandene Töne und Berichtszeilen", () => {
    const ids = Object.keys(sounds.sounds);
    for (const id of [...Object.values(sounds.logSounds), ...Object.values(sounds.eventSounds)]) expect(ids).toContain(id);
    for (const id of ids) expect(Object.keys(sounds.channels)).toContain(id);
    for (const key of Object.keys(sounds.logSounds)) expect(texts[key]).toBeTruthy();
    for (const id of ["messe", "award", "bug", "crunch"]) expect(ids).toContain(id);
  });
  it("UI-R80, UI-R70: Jede CC0-Datei (Ton, Bühne) liegt unter public/ und steht in public/CREDITS.md", () => {
    const credits = readFileSync("public/CREDITS.md", "utf8");
    const files = [
      ...Object.values(sounds.sounds).map((d) => (d as { file?: string }).file),
      ...Object.values((music as { tracks?: Record<string, Record<string, string>> }).tracks ?? {}).flatMap((t) => Object.values(t)),
      ...stageGfx.figures.flatMap((f) => [`${f}-front.png`, `${f}-back.png`]),
      ...stageGfx.plants,
    ].filter((f): f is string => !!f);
    for (const f of files) {
      expect(existsSync(`public/${f}`), f).toBe(true);
      expect(credits, f).toContain(`\`${f}\``);
    }
  });
  it("UI-R80: Jede Datei unter public/ außer Hinweisen steht in public/CREDITS.md", () => {
    const credits = readFileSync("public/CREDITS.md", "utf8");
    const files = (readdirSync("public", { recursive: true }) as string[])
      .map((f) => f.split("\\").join("/"))
      .filter((f) => /\.(ogg|mp3|wav|png|svg|ttf|woff2?)$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(credits, f).toContain(`\`${f}\``);
  });
});
