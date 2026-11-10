// Abschluss 1.0: Mod-Unterstützung, Stufe Daten (S10 ZIE-R31 bis ZIE-R38).
import { describe, expect, it } from "vitest";
import { loadBaseData, loadData } from "../../src/mods/loadBase";
import { manifestErrors, type ModBundle, type ModManifest, orderMods, satisfies } from "../../src/mods/modding";
import { newGame } from "../../src/sim/game";
import { SEED_A } from "../helpers";

function manifest(id: string, over: Partial<ModManifest> = {}): ModManifest {
  return {
    id, name: id, version: "1.0.0", gameVersion: ">=0.1.0", author: "Test", description: "Test",
    dependencies: [], conflicts: [], loadAfter: [], tier: "daten", affectsBalance: true, ...over,
  };
}

function bundle(id: string, files: ModBundle["files"], over: Partial<ModManifest> = {}): ModBundle {
  return { manifest: manifest(id, over), files };
}

describe("Mods: Ladepipeline (ZIE-R31 bis ZIE-R36)", () => {
  it("ZIE-R31: Ohne Mods ergibt die Pipeline genau das Grundspiel", () => {
    const r = loadData([]);
    expect(r.data.checksum).toBe(loadBaseData().checksum);
    expect(r.active).toEqual([]);
    expect(r.errors).toEqual([]);
  });

  it("ZIE-R34: add, modify und remove über die Kennung; Feld einer Datei mit set", () => {
    const base = loadBaseData();
    const feature = structuredClone(base.features.find((f) => f.id === "adaptiveSpielwelt")!);
    const genre = base.genres[0]!;
    const theme = base.themes[0]!.id;
    const syn = base.synergies[0]!;
    const r = loadData([bundle("probe", {
      "dev/features.json": { add: [{ ...feature, id: "probeKarte" }] },
      "dev/genres.json": { modify: [{ id: genre.id, set: { [`themeFit.${theme}`]: 12345 } }] },
      "dev/synergies.json": { remove: [`${syn.a}+${syn.b}`] },
      "dev/quality.json": { set: { seedVariationBp: 1234 } },
      "market/platforms.json": { list: "platforms", modify: [{ id: base.platforms[0]!.id, set: { endYear: base.platforms[0]!.endYear + 1 } }] },
    })]);
    expect(r.errors).toEqual([]);
    expect(r.active.map((m) => m.id)).toEqual(["probe"]);
    expect(r.data.features.some((f) => f.id === "probeKarte")).toBe(true);
    expect(r.data.genres.find((g) => g.id === genre.id)!.themeFit[theme]).toBe(12345);
    expect(r.data.synergies.length).toBe(base.synergies.length - 1);
    expect(r.data.quality.seedVariationBp).toBe(1234);
    expect(r.data.platforms[0]!.endYear).toBe(base.platforms[0]!.endYear + 1);
    expect(r.data.mods).toEqual([{ id: "probe", version: "1.0.0", affectsBalance: true }]);
    expect(r.data.checksum).not.toBe(base.checksum);
    // Das Grundspiel bleibt unverändert (keine geteilten Objekte).
    expect(loadBaseData().quality.seedVariationBp).toBe(base.quality.seedVariationBp);
  });

  it("ZIE-R36: fehlerhafte Mod wird mit Datei und Stelle gemeldet und abgeschaltet, das Spiel startet ohne sie", () => {
    const good = bundle("gut", { "dev/quality.json": { set: { seedVariationBp: 1500 } } });
    const wrongType = bundle("typ", { "dev/quality.json": { set: { seedVariationBp: "viel" } } });
    const unknownId = bundle("fehlt", { "dev/genres.json": { modify: [{ id: "gibtsNicht", set: { themeFit: {} } }] } });
    const unknownFile = bundle("datei", { "dev/gibtsNicht.json": { set: { a: 1 } } });
    const missingField = bundle("feld", { "dev/genres.json": { add: [{ id: "neu" }] } });
    // Ein neues Thema ohne Passung in den Genres scheitert an der Prüfung des Grundspiels.
    const invalid = bundle("pruefung", { "dev/themes.json": { add: [{ ...structuredClone(loadBaseData().themes[0]!), id: "neuesThema" }] } });
    const r = loadData([wrongType, good, unknownId, unknownFile, missingField, invalid]);
    expect(r.active.map((m) => m.id)).toEqual(["gut"]);
    expect(r.data.quality.seedVariationBp).toBe(1500);
    expect(r.errors.find((e) => e.mod === "typ")).toMatchObject({ file: "dev/quality.json", where: ".set.seedVariationBp" });
    expect(r.errors.find((e) => e.mod === "fehlt")).toMatchObject({ file: "dev/genres.json", where: ".modify[0]" });
    expect(r.errors.find((e) => e.mod === "datei")).toMatchObject({ file: "dev/gibtsNicht.json" });
    expect(r.errors.find((e) => e.mod === "feld")!.where).toContain("add[0]");
    expect(r.errors.find((e) => e.mod === "pruefung")!.problem).toContain("genres.json");
    expect(() => newGame(r.data, SEED_A)).not.toThrow();
  });

  it("ZIE-R34: ganze Listen mit Kennungen lassen sich nicht per set ersetzen", () => {
    const r = loadData([bundle("ersetzen", { "market/platforms.json": { set: { platforms: [] } } })]);
    expect(r.active).toEqual([]);
    expect(r.errors[0]!.problem).toContain("ZIE-R34");
  });

  it("ZIE-R35: Ändern zwei Mods dasselbe Feld, gewinnt die später geladene, und der Konflikt nennt Feld, Werte, Gewinner", () => {
    const a = bundle("a", { "dev/quality.json": { set: { seedVariationBp: 1100 } } });
    const b = bundle("b", { "dev/quality.json": { set: { seedVariationBp: 1900 } } });
    const r = loadData([a, b]);
    expect(r.data.quality.seedVariationBp).toBe(1900);
    expect(r.conflicts).toEqual([{
      file: "dev/quality.json", record: "", field: "seedVariationBp", first: { mod: "a", value: 1100 }, second: { mod: "b", value: 1900 }, winner: "b",
    }]);
  });

  it("ZIE-R35: Reihenfolge core, Abhängigkeiten, loadAfter, dann Spielerreihenfolge", () => {
    const x = bundle("x", {}, { dependencies: [{ id: "y", version: "^1.0.0" }] });
    const y = bundle("y", {});
    const z = bundle("z", {}, { loadAfter: ["x"] });
    const w = bundle("w", {});
    expect(orderMods([z, x, w, y], "0.1.0").order.map((m) => m.manifest.id)).toEqual(["w", "y", "x", "z"]);
    // Fehlende oder zu alte Abhängigkeit, Konflikt, Kreis, falsche Spielversion: abgeschaltet und gemeldet.
    const old = bundle("alt", {}, { dependencies: [{ id: "y", version: ">=2.0.0" }] });
    const clash = bundle("streit", {}, { conflicts: ["y"] });
    const c1 = bundle("k1", {}, { loadAfter: ["k2"] });
    const c2 = bundle("k2", {}, { loadAfter: ["k1"] });
    const future = bundle("zukunft", {}, { gameVersion: ">=9.0.0" });
    const r = orderMods([y, old, clash, c1, c2, future], "0.1.0");
    expect(r.order.map((m) => m.manifest.id)).toEqual(["y"]);
    expect(r.errors.map((e) => e.mod).sort()).toEqual(["alt", "k1", "k2", "streit", "zukunft"]);
  });

  it("ZIE-R33: Manifest mit allen Feldern; fehlende oder falsche Felder werden benannt", () => {
    expect(manifestErrors(manifest("ok"))).toEqual([]);
    const bad = manifestErrors({ id: "Base Mod", version: "1.0", tier: "alles" });
    for (const f of ["id", "version", "name", "tier", "affectsBalance", "dependencies", "conflicts", "loadAfter"]) {
      expect(bad.some((e) => e.where === f)).toBe(true);
    }
    expect(manifestErrors(manifest("base")).some((e) => e.where === "id")).toBe(true);
    const r = loadData([bundle("code", {}, { tier: "code" })]);
    expect(r.errors[0]).toMatchObject({ mod: "code", where: "tier" });
  });

  it("ZIE-R33: Versionsbereiche", () => {
    expect(satisfies("1.2.3", "*")).toBe(true);
    expect(satisfies("1.2.3", "1.2.3")).toBe(true);
    expect(satisfies("1.2.3", ">=1.0.0 <2.0.0")).toBe(true);
    expect(satisfies("2.0.0", ">=1.0.0 <2.0.0")).toBe(false);
    expect(satisfies("1.4.0", "^1.2.0")).toBe(true);
    expect(satisfies("1.4.0", "~1.2.0")).toBe(false);
  });

  it("Stufe Inhalte: Texte einer Mod kommen mit, die einer abgeschalteten nicht", () => {
    const ok: ModBundle = { ...bundle("texte", {}, { tier: "inhalte", affectsBalance: false }), texts: { de: { "genre.x": "X" }, en: { "genre.x": "X" } } };
    const broken: ModBundle = { ...bundle("kaputt", { "dev/nix.json": {} }), texts: { de: { "genre.y": "Y" } } };
    const r = loadData([ok, broken]);
    expect(r.texts.de).toEqual({ "genre.x": "X" });
    expect(r.data.mods).toEqual([{ id: "texte", version: "1.0.0", affectsBalance: false }]);
  });
});
