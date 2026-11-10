import { describe, expect, it } from "vitest";
import { versionDistanceBp } from "../../src/sim/systems/produkte/projects";
import { tick } from "../../src/sim/tick";
import type { GameData, GameState } from "../../src/sim/model/types";
import { input as baseInput, lastProject, neutralGame, playProject, testData, untilReady } from "../helpers";

const input: typeof baseInput = (o = {}) => baseInput({ platforms: ["standardpc"], features: ["grosseSprites", "levelVielfalt", "soundeffekte"], ...o });

/** Spiel von 1985 auf der eigenen Engine 1.0, danach Audio auf Stufe 1 (Version 1.1). */
function released(data: GameData, seed?: string): GameState {
  const s0 = neutralGame(data, seed);
  s0.week = 5 * 52;
  s0.unlocks["engine"] = 0;
  s0.unlocks["produkttypen"] = 0;
  s0.moneyCent = 5_000_000_00;
  const s1 = tick(s0, data, [{ type: "foundEngine", name: "Kern" }]);
  const s = playProject(s1, data, input({ title: "Alt" }));
  const e = s.engine!;
  e.modules.audio.level = 1;
  e.minor = 1;
  e.versions.push({ major: 1, minor: 1, week: s.week, levels: { ...e.versions[0]!.levels, audio: 1 } });
  return s;
}

function playPatch(s: GameState, data: GameData, type: string): GameState {
  const src = s.projects.find((p) => p.title === "Alt")!;
  let x = tick(s, data, [input({ title: type, productType: type, sourceId: src.id })]);
  const id = lastProject(x).id;
  x = untilReady(x, data, id);
  x = tick(x, data, [{ type: "release", projectId: id }]);
  return x;
}

describe("Technik-Update per Patch", () => {
  it("ENG-R70 Nur mit einer neueren Version derselben Engine", () => {
    const data = testData();
    const s = released(data);
    const src = s.projects.find((p) => p.title === "Alt")!;
    s.engine!.minor = 0;
    expect(tick(s, data, [input({ productType: "technikUpdate", sourceId: src.id })]).projects).toHaveLength(1);
  });

  it("ENG-R72 Aufwand nach Versionsabstand: zwei Hauptversionen kosten 80 % eines Remasters", () => {
    const data = testData();
    const s = released(data);
    const src = s.projects.find((p) => p.title === "Alt")!;
    expect(versionDistanceBp(data, s, src)).toBe(1000);
    s.engine!.major = 3;
    s.engine!.minor = 0;
    expect(versionDistanceBp(data, s, src)).toBe(8000);
    const up = tick(s, data, [input({ productType: "technikUpdate", sourceId: src.id })]);
    const rem = tick(s, data, [input({ productType: "remaster", sourceId: src.id })]);
    expect(lastProject(up).effortTotalBp).toBe(Math.trunc((lastProject(rem).effortTotalBp * 8000) / 10000));
  });

  it("ENG-R73 Kostenloses Update: E neu berechnet, Pressewertung bleibt, Nachfrage steigt", () => {
    const data = testData();
    const s = released(data);
    const src = s.projects.find((p) => p.title === "Alt")!;
    const oldScore = src.result!.scoreBp;
    const oldE = src.result!.quality.engineFactorBp;
    const x = playPatch(s, data, "technikUpdate");
    const after = x.projects.find((p) => p.title === "Alt")!;
    expect(after.result!.scoreBp).toBe(oldScore);
    expect(after.engine.levels.audio).toBe(1);
    expect(after.patchedEngineBp!).toBeGreaterThan(oldE);
    if (!x.events.some((e) => e.kind === "modsKaputt")) expect(after.sales!.demandFactorBp).toBeGreaterThan(10000);
  });

  it("ENG-R71 Upgrade verkauft zum Aufpreis von 15 % an Besitzer; Remaster ist ein eigenes Produkt mit neuer Wertung", () => {
    const data = testData();
    const s = released(data);
    const up = playPatch(s, data, "upgrade");
    const u = lastProject(up);
    expect(u.sales).not.toBeNull();
    expect(data.productTypes.find((t) => t.id === "upgrade")!.priceBp).toBe(1500);
    const rem = playPatch(released(data), data, "remaster");
    const r = lastProject(rem);
    expect(r.type).toBe("remaster");
    expect(r.result!.quality.engineModules.find((m) => m.module === "audio")!.level).toBe(1);
    expect(r.result!.reviews!.length).toBeGreaterThan(0);
  });

  it("ENG-R75 In etwa einem Viertel der Fälle zerstört das Update Mods; Zurücksetzen stellt den alten Stand her", () => {
    const data = testData();
    let broken = 0;
    let checked = false;
    const seeds = 24;
    for (let i = 0; i < seeds; i++) {
      const x = playPatch(released(data, `00000000000000${(i + 16).toString(16)}`), data, "technikUpdate");
      const e = x.events.find((ev) => ev.kind === "modsKaputt");
      if (!e) continue;
      broken += 1;
      if (!checked) {
        checked = true;
        expect(e.options).toEqual(["entschaedigen", "zuruecksetzen", "modder"]);
        const back = tick(x, data, [{ type: "decide", eventId: e.id, option: "zuruecksetzen" }]);
        expect(back.projects.find((p) => p.title === "Alt")!.engine.levels.audio).toBe(0);
      }
    }
    expect(broken).toBeGreaterThan(1);
    expect(broken).toBeLessThan(13);
  });
});
