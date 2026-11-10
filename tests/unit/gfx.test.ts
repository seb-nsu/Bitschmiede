// UI-R60, UI-R70: CC0-Motive für Ereignisse, Berichtszeilen und Räume (data/gfx/icons.json).
import { TEXTS_DE } from "../../src/ui/textData";
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import gfx from "../../data/gfx/icons.json";
import { EVENT_KINDS } from "../../src/sim/model/types";

const texts = TEXTS_DE;

describe("Motive für Meldungen und Räume", () => {
  it("UI-R60: jedes Motiv liegt unter public/", () => {
    for (const f of Object.values(gfx.icons)) expect(existsSync(`public/${f}`), f).toBe(true);
  });
  it("UI-R60: jede Ereignisart hat ein vorhandenes Motiv", () => {
    for (const k of EVENT_KINDS) expect(Object.keys(gfx.icons), k).toContain((gfx.events as Record<string, string>)[k]);
  });
  it("UI-R70: jeder Raum hat ein vorhandenes Motiv", () => {
    const rooms = Object.keys(texts).filter((k) => /^room\.[a-zA-Z]+$/.test(k)).map((k) => k.slice(5));
    expect(rooms.length).toBeGreaterThan(0);
    for (const r of rooms) expect(Object.keys(gfx.icons), r).toContain((gfx.rooms as Record<string, string>)[r]);
  });
  it("UI-R60: Regeln für Berichtszeilen zeigen auf vorhandene Motive", () => {
    for (const [, icon] of gfx.logs) expect(Object.keys(gfx.icons)).toContain(icon);
  });
});
