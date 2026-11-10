// Teilschritt 1.5: Produkttypen (PRD-R01, PRD-R02), Gate (PRD-R22), Inhalte über die Jahrzehnte (PRD-R16, availableFrom).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { buildView } from "../../src/sim/view/view";
import { netPerUnit, weeklyDemand } from "../../src/sim/systems/markt";
import { input, lastProject, neutralGame, playProject, testData, untilReady } from "../helpers";

function released(data: ReturnType<typeof testData>) {
  let s = playProject(neutralGame(data), data, input());
  for (let i = 0; i < 10; i++) s = tick(s, data);
  s.unlocks.produkttypen = s.week;
  return s;
}

describe("Produkttypen (PRD-R01)", () => {
  it("PRD-R01 Produkttypen sind Datensätze mit den fünf Parametern", () => {
    const data = testData();
    for (const ty of data.productTypes) {
      expect(ty).toHaveProperty("requires");
      expect(ty).toHaveProperty("revenueModel");
      expect(ty).toHaveProperty("lifetime");
      expect(ty).toHaveProperty("teamShare");
      expect(ty).toHaveProperty("brandEffect");
    }
    expect(data.productTypes.map((t) => t.id)).toEqual(["addon", "dlc", "f2p", "liveService", "mmo", "port", "remake", "remaster", "standard", "technikUpdate", "upgrade"]);
  });

  it("PRD-R02 Port und Addon brauchen ein veröffentlichtes eigenes Spiel", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(validateInput(s, data, input({ productType: "port", sourceId: 1 }))).toBe("error.locked");
    s.unlocks.produkttypen = 0;
    expect(validateInput(s, data, input({ productType: "port", sourceId: 1 }))).toBe("error.needsReleasedGame");
    expect(validateInput(s, data, input({ productType: "addon", sourceId: null }))).toBe("error.needsReleasedGame");
  });

  it("Port: gleicher Inhalt auf einer neuen Plattform, 30 % des Aufwands", () => {
    const data = testData();
    const s = released(data);
    const src = s.projects[0]!;
    expect(validateInput(s, data, input({ productType: "port", sourceId: src.id }))).toBe("error.portSamePlatform");
    expect(validateInput(s, data, input({ productType: "port", sourceId: src.id, platforms: ["orbis"], features: ["dialoge", "rundenkampf", "weltkarte"] }))).toBe("error.portContent");
    const x = tick(s, data, [input({ productType: "port", sourceId: src.id, platforms: ["orbis"] })]);
    const port = lastProject(x);
    expect(port.type).toBe("port");
    expect(port.effortTotalBp).toBe(Math.trunc((src.effortTotalBp * 3000) / 10000));
  });

  it("Addon: klein, Genre der Vorlage, verkauft an deren Besitzer zum halben Preis", () => {
    const data = testData();
    const s = released(data);
    const src = s.projects[0]!;
    expect(validateInput(s, data, input({ productType: "addon", sourceId: src.id, scope: "mittel", features: ["dialoge", "rundenkampf", "weltkarte", "gegnerKi", "farbgrafik"] }))).toBe("error.typeScope");
    expect(validateInput(s, data, input({ productType: "addon", sourceId: src.id, genre: "strategie" }))).toBe("error.typeGenre");
    const addon = { platforms: src.platforms, genre: src.genre, theme: src.theme, scope: "klein" as const, type: "addon", sourceId: src.id };
    const demand = weeklyDemand(s, data, addon, 70000, 0, s.week);
    // Wochennachfrage höchstens 6 % der Besitzer · Q_rel (1,0) · Trend · Saison (je höchstens 1,4 bzw. 1,6).
    expect(demand).toBeGreaterThan(0);
    expect(demand).toBeLessThanOrEqual(Math.ceil(src.sales!.sold * 0.06 * 1.4 * 1.6));
    expect(netPerUnit(s, data, "addon")).toBe(Math.trunc(netPerUnit(s, data, "standard") / 2));
    let x = tick(s, data, [input({ productType: "addon", sourceId: src.id, title: "Addon" })]);
    x = untilReady(x, data, lastProject(x).id);
    x = tick(x, data, [{ type: "release", projectId: lastProject(x).id }]);
    expect(lastProject(x).sales!.sold).toBeGreaterThanOrEqual(0);
  });
});

describe("Gate (PRD-R22)", () => {
  it("PRD-R22 ein mittleres Projekt bekommt am Ende der Pre-Production eine Pflicht-Entscheidung mit vier Optionen", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input({ scope: "mittel", features: ["grosseSprites", "levelVielfalt", "titelmelodie", "einfacheSteuerung", "farbgrafik"] })]);
    for (let i = 0; i < 200 && !s.events.some((e) => e.kind === "gate"); i++) {
      const ids = s.events.map((e) => ({ type: "decide" as const, eventId: e.id, option: e.defaultOption }));
      s = tick(s, data, ids);
    }
    const gate = s.events.find((e) => e.kind === "gate")!;
    expect(gate.options).toEqual(["fortsetzen", "umsteuern", "pausieren", "abbrechen"]);
    expect(lastProject(s).phase).toBe("produktion");
    const cancelled = tick(s, data, [{ type: "decide", eventId: gate.id, option: "abbrechen" }]);
    expect(lastProject(cancelled).status).toBe("abgebrochen");
  });

  it("PRD-R20 kleine Projekte haben kein Gate", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input()]);
    s = untilReady(s, data, 1);
    expect(s.projects[0]!.gateOffered).toBe(false);
  });
});

describe("Inhalte über die Jahrzehnte (Entscheidung 5)", () => {
  it("Das Brett zeigt nur Karten, die es im Jahr gibt; Nachfolger erscheinen später", () => {
    const data = testData();
    const s = neutralGame(data);
    const v1980 = buildView(s, data).catalog.features.filter((f) => f.available).map((f) => f.id);
    expect(v1980).toContain("titelmelodie");
    expect(v1980).not.toContain("mehrstimmigeMusik");
    expect(v1980).not.toContain("polygon3d");
    s.week = 16 * 52;
    const v1996 = buildView(s, data).catalog.features;
    expect(v1996.find((f) => f.id === "polygon3d")!.available).toBe(true);
    expect(v1996.find((f) => f.id === "titelmelodie")!.outdated).toBe(true);
    expect(validateInput(neutralGame(data), data, input({ features: ["polygon3d", "grosseSprites", "titelmelodie"] }))).toBe("error.featureLocked");
  });

  it("PRD-R16 jede Kette hat steigende Grundwerte", () => {
    const data = testData();
    for (const f of data.features) {
      if (!f.successor) continue;
      const next = data.features.find((x) => x.id === f.successor)!;
      expect(next.baseValue).toBeGreaterThan(f.baseValue);
      expect(next.availableFrom).toBeGreaterThan(f.availableFrom);
    }
  });
});
