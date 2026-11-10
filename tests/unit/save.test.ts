import { describe, expect, it } from "vitest";
import { createSave, ironmanSlot, isAutosaveWeek, loadSave, migrateState, SaveError, trimInputLog } from "../../src/sim/save";
import { newGame } from "../../src/sim/game";
import { tick } from "../../src/sim/tick";
import { stateChecksum } from "../../src/sim/hash";
import { compress, decompress } from "../../src/worker/storage";
import { input, neutralGame, playProject, testData } from "../helpers";

describe("Spielstand (TEC-R40 bis TEC-R45)", () => {
  it("TEC-R40 der Spielstand enthält Schema-Version, Spielversion, Seed, Mods und Daten-Prüfsumme", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const file = createSave(s, data, []);
    expect(file.meta.schemaVersion).toBe(s.schemaVersion);
    expect(file.meta.gameVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(file.meta.seed).toBe(s.seed);
    expect(file.meta.mods).toEqual([{ id: "base", version: data.modVersion }]);
    expect(file.meta.dataChecksum).toBe(data.checksum);
    expect(file.state.settings).toEqual(s.settings);
  });

  it("TEC-R04 ein geladener Spielstand läuft bitgleich weiter", () => {
    const data = testData();
    let s = playProject(neutralGame(data), data, input());
    s = tick(s, data, [input({ title: "Zwei" })]);
    const json = JSON.parse(JSON.stringify(createSave(s, data, [])));
    const loaded = loadSave(json, data).state;
    let a = s;
    let b = loaded;
    for (let i = 0; i < 40; i++) {
      a = tick(a, data);
      b = tick(b, data);
    }
    expect(stateChecksum(b)).toBe(stateChecksum(a));
  });

  it("TEC-R42 die Datei wird mit gzip komprimiert und unverändert entpackt", async () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const file = createSave(s, data, []);
    const bytes = await compress(file);
    expect(bytes[0]).toBe(0x1f);
    expect(bytes[1]).toBe(0x8b);
    expect(bytes.byteLength).toBeLessThan(JSON.stringify(file).length);
    expect(await decompress(bytes)).toEqual(JSON.parse(JSON.stringify(file)));
  });

  it("Eine beschädigte Datei wird erkannt", () => {
    const data = testData();
    const file = JSON.parse(JSON.stringify(createSave(neutralGame(data), data, [])));
    file.state.moneyCent += 1;
    expect(() => loadSave(file, data)).toThrow(SaveError);
    expect(() => loadSave({ foo: 1 }, data)).toThrow(/Keine Spielstand-Datei/);
  });

  it("TEC-R41 zu alte oder zu neue Schema-Versionen werden mit Code abgewiesen", () => {
    const data = testData();
    const s = neutralGame(data) as unknown as Record<string, unknown> & { schemaVersion: number };
    expect(() => migrateState({ ...s, schemaVersion: 1 })).toThrow(expect.objectContaining({ code: "save.tooOld" }));
    expect(() => migrateState({ ...s, schemaVersion: 999 })).toThrow(expect.objectContaining({ code: "save.tooNew" }));
  });

  it("TEC-R44 geänderte Spieldaten sind kein Fehler, sondern ein Hinweis", () => {
    const data = testData();
    const file = JSON.parse(JSON.stringify(createSave(neutralGame(data), data, [])));
    const other = { ...data, checksum: "00000000" };
    const r = loadSave(file, other);
    expect(r.warnings).toContain("save.dataChanged");
    expect(r.state.dataChecksum).toBe("00000000");
  });

  it("TEC-R41 Spielstand ohne neue Genres und Themen bekommt Passung, Profil und Trend aus den Daten", () => {
    const data = testData();
    const s = neutralGame(data);
    delete s.world.themeFit["shooter"];
    delete s.world.expectedProfile["shooter"];
    delete s.trends.genre["shooter"];
    delete s.trends.theme["piraten"];
    for (const g of Object.keys(s.world.themeFit)) delete s.world.themeFit[g]!["piraten"];
    const { state } = loadSave(createSave(s, data, []), data);
    expect(state.world.themeFit["shooter"]!["krieg"]).toBe(data.genres.find((g) => g.id === "shooter")!.themeFit["krieg"]);
    expect(state.world.themeFit["abenteuer"]!["piraten"]).toBe(12000);
    expect(Object.values(state.world.expectedProfile["shooter"]!).reduce((a, b) => a + b, 0)).toBe(10000);
    expect(state.trends.genre["shooter"]).toBe(10000);
    expect(state.trends.theme["piraten"]).toBe(10000);
  });

  it("TEC-R45 das Eingabeprotokoll behält nur die letzten 52 Wochen", () => {
    const log = [10, 60, 100, 150].map((week) => ({ week, input: { type: "release" as const, projectId: 1 } }));
    expect(trimInputLog(log, 150).map((e) => e.week)).toEqual([100, 150]);
  });

  it("KRN-R52 ZIE-R29 Autosave nach jedem Jahrbuch und alle 13 Wochen", () => {
    const data = testData();
    const weeks = Array.from({ length: 60 }, (_, w) => w).filter((w) => isAutosaveWeek(data, w, false));
    expect(weeks).toEqual([13, 26, 39, 52]);
    expect(isAutosaveWeek(data, 51, true)).toBe(true);
    expect(data.time.autosaveSlots).toBe(5);
  });

  it("KRN-R54 ZIE-R21 Ironman: Einstellung im Spielstand, ein Platz je Partie", () => {
    const data = testData();
    const s = newGame(data, "00000000000000a1", { preset: "normal", pressRandom: "normal", decisionDensity: "normal", founderFocus: "gameplay", ironman: true });
    expect(s.settings.ironman).toBe(true);
    expect(createSave(s, data, []).meta.ironman).toBe(true);
    expect(ironmanSlot(s.seed)).toBe("ironman-00000000000000a1");
    expect(newGame(data, "00000000000000a1").settings.ironman).toBe(false);
  });
});
