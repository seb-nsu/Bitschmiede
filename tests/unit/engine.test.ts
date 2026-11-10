import { describe, expect, it } from "vitest";
import { buyPrice, engineFactor, moduleFactor, licenseFee, licenseQuality, updateCost, validatePlanResearch, vendorById, missingModule, moduleMap, projectEngineFactor, researchEffort, starterLevels, stateOfArtMap } from "../../src/sim/systems/engine";
import { lnBp, mulDiv, powBp, TABLES } from "../../src/sim/num";
import { checksum } from "../../tools/tables";
import { MODULES, type GameState, type Input, type ModuleMap } from "../../src/sim/model/types";
import { tick } from "../../src/sim/tick";
import { migrateState } from "../../src/sim/save";
import { dateOf, isFirstWeekOfYear } from "../../src/sim/calendar";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

const LEVELS_2005: ModuleMap = { rendering: 7, audio: 6, physik: 3, ki: 3, netzwerk: 3, werkzeuge: 3, plattformen: 2, streaming: 1 };

describe("Numerik für den Engine-Faktor", () => {
  it("TEC-R85 ln-Tabelle mit Prüfsumme; x^γ aus Tabellen weicht höchstens 0,2 % ab", () => {
    expect(checksum(TABLES.ln.values)).toBe(TABLES.ln.checksum);
    expect(lnBp(10000)).toBe(0);
    for (const [x, g] of [[5000, 12000], [8333, 12000], [6667, 12000], [11500, 12000], [1429, 16000], [10000, 12000]] as const) {
      const exact = Math.pow(x / 10000, g / 10000) * 10000;
      expect(Math.abs(powBp(x, g) - exact)).toBeLessThanOrEqual(exact * 0.002 + 2);
    }
  });
});

describe("Module und Stand der Technik", () => {
  it("ENG-T09 Die Starter-Engine hat Rendering 1 und jedes andere Modul Stufe 0", () => {
    const data = testData();
    const lv = starterLevels(data);
    expect(lv.rendering).toBe(1);
    for (const m of MODULES.filter((x) => x !== "rendering")) expect(lv[m]).toBe(0);
  });

  it("ENG-R01, ENG-R02 Stand der Technik folgt dem frühesten Jahr je Stufe (2012: 9, 8, 4, 3, 4, 4, 3, 2; Rendering und Audio mit feineren Stufen)", () => {
    const data = testData();
    expect(stateOfArtMap(data, 2012)).toEqual({ rendering: 9, audio: 8, physik: 4, ki: 3, netzwerk: 4, werkzeuge: 4, plattformen: 3, streaming: 2 });
    expect(stateOfArtMap(data, 1980)).toEqual(starterLevels(data));
  });

  it("S03 5 Forschungsaufwand Grundwert · 1,8^Stufe (Grundwert nach Balancing 20 statt 40 Personenwochen)", () => {
    const data = testData();
    expect(researchEffort(data, "physik", 0)).toBe(200000);
    expect(researchEffort(data, "physik", 1)).toBe(360000);
    expect(researchEffort(data, "physik", 3)).toBe(1166400);
  });
});

describe("Engine-Faktor E", () => {
  it("ENG-T01 Engine auf dem Stand von 2005 ergibt 2012 mit allen Modulen E = 0,77 (γ = 1,2 der Spezifikation; Spec 0,78 vor den feineren Stufen)", () => {
    const data = testData();
    data.engine.factor.gammaBp = 12000;
    const e = engineFactor(data, LEVELS_2005, MODULES, 2012);
    expect(e.factorBp).toBeGreaterThanOrEqual(7600);
    expect(e.factorBp).toBeLessThanOrEqual(7700);
    expect(engineFactor(data, LEVELS_2005, MODULES, 2005).factorBp).toBe(10000);
  });

  it("S03 5.1 ANNAHME γ = 1,0 nach Balancing: dieselbe Engine ergibt E = 0,80; Stufe 0 gegen 1 kostet 50 %", () => {
    const data = testData();
    const e = engineFactor(data, LEVELS_2005, MODULES, 2012);
    expect(e.factorBp).toBeGreaterThanOrEqual(7950);
    expect(e.factorBp).toBeLessThanOrEqual(8050);
    expect(moduleFactor(data, 0, 1)).toBeGreaterThanOrEqual(4990);
    expect(moduleFactor(data, 0, 1)).toBeLessThanOrEqual(5010);
  });

  it("ENG-R11 Nur genutzte Module zählen; ohne genutztes Modul ist E neutral", () => {
    const data = testData();
    const old = moduleMap(() => 0);
    // Nur Werkzeuge-Karten: Werkzeuge 0 gegen Stand 1 (1985).
    const tools = projectEngineFactor(data, old, ["levelVielfalt", "punktejagd"], 1985);
    expect(tools.modules.map((m) => m.module)).toEqual(["werkzeuge"]);
    expect(tools.factorBp).toBeLessThanOrEqual(5000);
    expect(engineFactor(data, old, [], 2030).factorBp).toBe(10000);
  });

  it("ENG-R10 E ist auf 0,3 bis 1,15 begrenzt", () => {
    const data = testData();
    expect(engineFactor(data, moduleMap(() => 0), MODULES, 2030).factorBp).toBe(3000);
  });

  it("ENG-T12 Lizenzqualität L = (E − 0,3) / 0,85: E 1,15 → 1, E 0,3 → 0", () => {
    const data = testData();
    expect(licenseQuality(data, 11500)).toBe(10000);
    expect(licenseQuality(data, 3000)).toBe(0);
    expect(licenseQuality(data, 7250)).toBe(5000);
  });

  it("Abnahme Etappe 2: Dasselbe Spiel mit veralteter Engine wird spürbar schlechter bewertet", () => {
    const data = testData();
    const s0 = neutralGame(data);
    // Gleiches Spiel, einmal mit dem Stand von 1980, einmal mit den Stufen, die 1990 zur Verfügung stünden.
    s0.week = 10 * 52;
    s0.engine = null;
    const feats = ["grosseSprites", "levelVielfalt", "titelmelodie"];
    const oldE = projectEngineFactor(data, starterLevels(data), feats, 1990);
    const newE = projectEngineFactor(data, stateOfArtMap(data, 1990), feats, 1990);
    expect(newE.factorBp).toBe(10000);
    expect(oldE.factorBp).toBeLessThan(6000);
  });
});

describe("Gesperrte Karten", () => {
  it("PRD-T03 Karte mit fehlender Modulstufe ist gesperrt; das Projekt lässt sich damit nicht anlegen", () => {
    const data = testData();
    const s0 = neutralGame(data);
    expect(missingModule(data, starterLevels(data), "mehrstimmigeMusik")).toEqual({ module: "audio", level: 1 });
    expect(missingModule(data, starterLevels(data), "titelmelodie")).toBeNull();
    s0.week = 3 * 52;
    const s1 = tick(s0, data, [input({ features: ["grosseSprites", "levelVielfalt", "mehrstimmigeMusik"], platforms: ["kobold"] })]);
    expect(s1.projects).toHaveLength(0);
  });

  it("PRD-R10 Ein Projekt läuft auf der Starter-Engine, solange es keine eigene gibt; Release zeigt den Engine-Balken", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const p = lastProject(s);
    expect(p.engine.id).toBe("starter");
    expect(p.result!.bars.map((b) => b.factor)).toContain("engine");
    expect(p.result!.quality.engineFactorBp).toBe(10000);
  });

  it("Eigene Engine gründen: erst nach Freischaltung, dann nutzen neue Projekte sie", () => {
    const data = testData();
    const s0 = neutralGame(data);
    expect(tick(s0, data, [{ type: "foundEngine", name: "Kern" }]).engine).toBeNull();
    s0.unlocks["engine"] = 0;
    const s1 = tick(s0, data, [{ type: "foundEngine", name: "Kern" }]);
    expect(s1.engine?.name).toBe("Kern");
    expect(s1.engine?.modules.rendering.level).toBe(1);
    const s2 = tick(s1, data, [input()]);
    expect(lastProject(s2).engine.id).toBe("eigen");
    expect(s2.displayUnit).toBe("woche");
  });
});

describe("Migration", () => {
  it("TEC-R41 Schema 11 → 12: Projekte auf der Starter-Engine, Wertungen mit Engine-Balken 0", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const old = structuredClone(s) as unknown as Record<string, unknown>;
    old.schemaVersion = 11;
    delete old.engine;
    for (const p of old.projects as Record<string, unknown>[]) {
      delete p.engine;
      const r = p.result as { bars: { factor: string }[]; quality: Record<string, unknown> };
      r.bars = r.bars.filter((b) => b.factor !== "engine");
      delete r.quality.qEngine;
    }
    const m = migrateState(old as never);
    expect(m.engine).toBeNull();
    expect(m.projects[0]!.engine.levels).toEqual(starterLevels(data));
    const bars = m.projects[0]!.result!.bars;
    expect(bars.find((b) => b.factor === "engine")?.value).toBe(0);
    expect(bars.reduce((a, b) => a + b.value, m.projects[0]!.result!.baseBp)).toBe(m.projects[0]!.result!.scoreBp);
  });

  it("TEC-R41 Schema 22 → 23: alte Rendering- und Audio-Stufen landen auf der neuen Stufe gleichen Jahres", () => {
    const data = testData();
    const s = withEngine(data, 1982);
    const old = structuredClone(s) as unknown as { schemaVersion: number; engine: { modules: Record<string, { level: number; ownLevel: number }>; versions: { levels: Record<string, number> }[] } };
    old.schemaVersion = 22;
    old.engine.modules.rendering = { ...old.engine.modules.rendering!, level: 4, ownLevel: 4 };
    old.engine.modules.audio = { ...old.engine.modules.audio!, level: 3, ownLevel: 3 };
    old.engine.versions[0]!.levels = { ...old.engine.versions[0]!.levels, rendering: 2, audio: 5 };
    const m = migrateState(old as never);
    expect(m.engine!.modules.rendering.level).toBe(7);
    expect(m.engine!.modules.audio.ownLevel).toBe(4);
    expect(m.engine!.versions[0]!.levels).toMatchObject({ rendering: 3, audio: 8 });
    expect(data.engine.modules.rendering[7]!.earliestYear).toBe(2002);
  });
});

function withEngine(data: ReturnType<typeof testData>, year = 1982) {
  const s0 = neutralGame(data);
  s0.week = (year - 1980) * 52;
  s0.unlocks["engine"] = 0;
  return tick(s0, data, [{ type: "foundEngine", name: "Kern" }]);
}

function runWeeks(s: GameState, data: ReturnType<typeof testData>, n: number, inputs: Input[] = []): GameState {
  let x = tick(s, data, inputs);
  for (let i = 1; i < n; i++) x = tick(x, data);
  return x;
}

describe("Engine-Team und Forschung", () => {
  it("ENG-R03 Ohne Engine-Team gibt es keine Forschung", () => {
    const data = testData();
    const s = runWeeks(withEngine(data), data, 60, [{ type: "planResearch", module: "audio" }]);
    expect(s.engine!.modules.audio.level).toBe(0);
    expect(s.engine!.jobs[0]!.doneBp).toBe(0);
  });

  it("ENG-R02 Eine Stufe lässt sich erst ab ihrem frühesten Jahr einplanen", () => {
    const data = testData();
    const s = tick(withEngine(data, 1981), data, [{ type: "planResearch", module: "audio" }]);
    expect(s.engine!.jobs).toHaveLength(0);
  });

  it("ENG-R04, ENG-R20 Fertige Forschung ist ein Update: Unterversion +1, Schuld +8 im Modul, Meldung", () => {
    const data = testData();
    const s0 = withEngine(data);
    const s1 = tick(s0, data, [{ type: "planResearch", module: "audio" }, { type: "assign", personId: 1, projectId: null, engine: true }, { type: "assign", personId: 2, projectId: null, engine: true }]);
    let s = s1;
    for (let i = 0; i < 200 && s.engine!.modules.audio.level === 0; i++) s = tick(s, data);
    expect(s.engine!.modules.audio.level).toBe(1);
    expect(s.engine!.minor).toBe(1);
    expect(s.engine!.versions).toHaveLength(2);
    // Wartung (25 %) hat die 8 Punkte in der Woche des Updates noch nicht abgebaut.
    expect(s.engine!.modules.audio.debtBp).toBe(800);
    expect(s.log.some((l) => l.key === "log.researchDone")).toBe(true);
    // Zwei Personen, 36 Personenwochen: etwa 18 Wochen plus Anteil für Wartung.
    expect(s.week - s1.week).toBeGreaterThan(18);
  });

  it("ENG-R20 Wartung senkt die Schuld um die eingesetzte Kapazität", () => {
    const data = testData();
    const s0 = withEngine(data);
    s0.engine!.modules.rendering.debtBp = 2000;
    const s = runWeeks(s0, data, 10, [{ type: "assign", personId: 1, projectId: null, engine: true }]);
    // Ohne Forschung geht die ganze Kapazität in die Wartung: 1 Punkt je Personenwoche.
    expect(s.engine!.modules.rendering.debtBp).toBeLessThan(2000);
    expect(s.engine!.modules.rendering.debtBp).toBeGreaterThanOrEqual(2000 - 10 * 100);
  });

  it("ENG-R05 Neue Hauptversion setzt die Schuld der neu gebauten Module auf 5", () => {
    const data = testData();
    const s0 = withEngine(data);
    s0.engine!.modules.rendering.debtBp = 6000;
    s0.engine!.plan = { researchBp: 10000, maintenanceBp: 0, requestsBp: 0 };
    let s = tick(s0, data, [{ type: "startMajorVersion" }, { type: "assign", personId: 1, projectId: null, engine: true }]);
    for (let i = 0; i < 200 && s.engine!.major === 1; i++) s = tick(s, data);
    expect(s.engine!.major).toBe(2);
    expect(s.engine!.minor).toBe(0);
    expect(s.engine!.modules.rendering.debtBp).toBe(500);
  });

  it("ENG-R23 Ab Schuld 80 kostet ein Update doppelt, und das Spiel empfiehlt eine neue Hauptversion", () => {
    const data = testData();
    expect(updateCost(data, 10000, 7900)).toBe(17900);
    expect(updateCost(data, 10000, 8000)).toBe(36000);
    const s0 = withEngine(data);
    s0.engine!.modules.ki.debtBp = 8000;
    const s = tick(s0, data);
    const e = s.events.find((x) => x.kind === "neubau");
    expect(e?.module).toBe("ki");
    const s2 = tick(s, data, [{ type: "decide", eventId: e!.id, option: "jetzt" }]);
    expect(s2.engine!.jobs.some((j) => j.kind === "hauptversion")).toBe(true);
  });

  it("ENG-T02 Drei Updates ohne Wartung: Projekt mit dem Modul verschiebt sich, das Symptom wird gemeldet", () => {
    const data = testData();
    const s0 = withEngine(data);
    s0.engine!.modules.werkzeuge.debtBp = 3 * 800;
    const withDebt = tick(s0, data, [input({ scope: "mittel", features: ["grosseSprites", "levelVielfalt", "titelmelodie", "punktejagd", "texteingabe"] })]);
    const clean = structuredClone(s0);
    clean.engine!.modules.werkzeuge.debtBp = 0;
    const noDebt = tick(clean, data, [input({ scope: "mittel", features: ["grosseSprites", "levelVielfalt", "titelmelodie", "punktejagd", "texteingabe"] })]);
    const a = runWeeks(withDebt, data, 45);
    const b = runWeeks(noDebt, data, 45);
    expect(lastProject(a).effortDoneBp).toBeLessThan(lastProject(b).effortDoneBp);
    expect(lastProject(a).bugsBp).toBeGreaterThan(mulDiv(lastProject(b).bugsBp, lastProject(a).effortDoneBp, lastProject(b).effortDoneBp, 1));
    expect(a.log.some((l) => l.key === "log.debtSymptom" && l.params.module === "werkzeuge")).toBe(true);
  });
});

describe("Fremdmodule", () => {
  it("ENG-R31 Lizenziertes Modul startet auf der Stufe des Anbieters, ohne eigene Forschung", () => {
    const data = testData();
    const s0 = withEngine(data, 1984);
    const s = tick(s0, data, [{ type: "licenseModule", vendor: "klangwerk" }]);
    expect(s.engine!.modules.audio).toMatchObject({ level: 1, origin: "lizenziert", vendor: "klangwerk", debtBp: 0 });
    expect(s.engine!.minor).toBe(1);
    expect(tick(s, data, [{ type: "planResearch", module: "audio" }]).engine!.jobs).toHaveLength(0);
  });

  it("ENG-R31 Lizenzierte Module folgen der Roadmap des Anbieters", () => {
    const data = testData();
    const s0 = withEngine(data, 1987);
    let s = tick(s0, data, [{ type: "licenseModule", vendor: "klangwerk" }]);
    expect(s.engine!.modules.audio.level).toBe(2);
    while (dateOf(s.startYear, s.week).year < 1988 || !isFirstWeekOfYear(s.week - 1)) s = tick(s, data);
    expect(s.engine!.modules.audio.level).toBe(3);
    expect(s.log.some((l) => l.key === "log.vendorUpdate")).toBe(true);
  });

  it("ENG-R30 Gebühr je veröffentlichtem Spiel, das das lizenzierte Modul nutzt", () => {
    const data = testData();
    const s0 = withEngine(data, 1984);
    const s1 = tick(s0, data, [{ type: "licenseModule", vendor: "klangwerk" }]);
    const s = playProject(s1, data, input({ features: ["grosseSprites", "levelVielfalt", "mehrstimmigeMusik"], platforms: ["kobold"] }));
    const fees = s.finance.ledger.reduce((a, m) => a + m.costs.licenses, 0);
    const flat = licenseFee(data, vendorById(data, "klangwerk")!, dateOf(s.startYear, lastProject(s).result!.week).year);
    // Modell „beteiligung“: Festbetrag beim Release plus 8 % vom Nettoumsatz jeder Woche.
    expect(lastProject(s).sales!.licenseRoyaltyBp).toBe(800);
    expect(fees).toBeGreaterThan(flat);
    expect(fees - flat).toBeLessThanOrEqual(Math.trunc((lastProject(s).sales!.revenueCent * 800) / 10000));
  });

  it("ENG-R30 ANNAHME Modell „groesse“: Gebühr je Spiel nach Umfang, ohne Umsatzbeteiligung", () => {
    const data = testData();
    const v = vendorById(data, "pinselei")!;
    const base = licenseFee({ ...data, engine: { ...data.engine, middleware: { ...data.engine.middleware, feeScopeBp: { klein: 10000, mittel: 10000, gross: 10000, aaa: 10000 } } } }, v, 1990);
    expect(licenseFee(data, v, 1990, "klein")).toBe(Math.trunc((base * 6000) / 10000));
    expect(licenseFee(data, v, 1990, "mittel")).toBe(Math.trunc((base * 15000) / 10000));
  });

  it("ENG-T07, ENG-R32 Gekauftes Modul übernimmt die Schuld des Verkäufers und kostet den Kaufpreis", () => {
    const data = testData();
    const s0 = withEngine(data, 1987);
    const vendor = data.engine.middleware.vendors.find((v) => v.id === "physikus")!;
    vendor.debtBp = 6000;
    const price = buyPrice(data, vendor, 1987);
    expect(tick(s0, data, [{ type: "buyModule", vendor: "physikus" }]).engine!.modules.physik.origin).toBe("eigen");
    s0.moneyCent = price + 100_000_00;
    const s = tick(s0, data, [{ type: "buyModule", vendor: "physikus" }]);
    expect(s.engine!.modules.physik).toMatchObject({ level: 1, debtBp: 6000, origin: "gekauft" });
    expect(s.finance.ledger.reduce((a, m) => a + m.costs.licenses, 0)).toBe(price);
    // Danach ist es ein eigenes Modul, das weiter erforscht werden kann (sobald die nächste Stufe erreichbar ist).
    expect(validatePlanResearch({ ...s, week: 18 * 52 }, data, "physik")).toBeNull();
  });

  it("Lizenz beenden: wieder die eigene Stufe von davor", () => {
    const data = testData();
    const s1 = tick(withEngine(data, 1984), data, [{ type: "licenseModule", vendor: "klangwerk" }]);
    const s2 = tick(s1, data, [{ type: "endLicense", module: "audio" }]);
    expect(s2.engine!.modules.audio).toMatchObject({ level: 0, origin: "eigen" });
  });
});
