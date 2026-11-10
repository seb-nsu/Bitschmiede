// Teilschritt 3.1: Welt bis 2040 (MRK-R01, MRK-R11, KRN-R78) mit Digitalanteil (MKT-R24, MKT-R25, MKT-T09).
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import {
  activePlatforms, digitalNetPerUnit, digitalOnly, digitalShare, grossPrice, netPerUnit, platformById, recommendedPrintRun, salesStep, startSales,
} from "../../src/sim/systems/markt";
import { platformBudget } from "../../src/sim/systems/leistung";
import { stateOfArt } from "../../src/sim/systems/engine";
import { input, lastProject, neutralGame, testData } from "../helpers";
import { TEXTS_DE as de, TEXTS_EN as en } from "../../src/ui/textData";

const weekOf = (year: number) => (year - 1980) * 52;

describe("Welt bis 2040 (Teilschritt 3.1)", () => {
  it("MRK-R01, KRN-R78 jedes Jahr 1980–2040 hat Plattformen im Handel, ab 1985 mindestens eine Konsole oder einen Handheld", () => {
    const data = testData();
    for (let y = 1980; y <= 2040; y++) {
      const active = activePlatforms(data, y);
      expect(active.length, `Jahr ${y}`).toBeGreaterThanOrEqual(2);
      expect(active.some((p) => p.type === "konsole" || p.type === "handheld"), `Jahr ${y}`).toBe(true);
    }
    // Neue Plattformen erscheinen über die ganze Zeit, nicht nur bis 2000.
    expect(data.platforms.filter((p) => p.releaseYear > 2000).length).toBeGreaterThanOrEqual(10);
    expect(data.platforms.some((p) => p.releaseYear >= 2030)).toBe(true);
  });

  it("MRK-R01 jede Plattform und jeder Datenträger hat einen Namen in beiden Sprachen", () => {
    const data = testData();
    const texts = [de, en] as Record<string, string>[];
    for (const t of texts) {
      for (const p of data.platforms) expect(t[`platform.${p.id}`], p.id).toBeTruthy();
      for (const m of data.media) expect(t[`medium.${m.id}`], m.id).toBeTruthy();
      for (const f of data.features) expect(t[`feature.${f.id}`], f.id).toBeTruthy();
      for (const ty of new Set(data.platforms.map((p) => p.type))) expect(t[`platformType.${ty}`], ty).toBeTruthy();
    }
  });

  it("MRK-R11 feste Lebenszyklen gelten auch nach 2000: das Smartphone ab 2008 ohne Ende, Konsolen mit Ende", () => {
    const data = testData();
    const phone = platformById(data, "taschenfon");
    expect(activePlatforms(data, 2007).includes(phone)).toBe(false);
    expect(activePlatforms(data, 2040).includes(phone)).toBe(true);
    expect(activePlatforms(data, 2025).some((p) => p.id === "helios")).toBe(false);
  });

  it("PRD-R11 jede Karte ist ab ihrem Jahr technisch erreichbar, und bis 2040 kommen laufend neue Karten", () => {
    const data = testData();
    for (const f of data.features) expect(stateOfArt(data, f.requires.module, f.availableFrom), f.id).toBeGreaterThanOrEqual(f.requires.level);
    for (let y = 2000; y < 2035; y += 5) {
      expect(data.features.filter((f) => f.availableFrom >= y && f.availableFrom < y + 5).length, `ab ${y}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("MRK-R02 feste Budgets für Konsolen, das Smartphone wächst wie der PC mit dem Jahr", () => {
    const data = testData();
    const phone = platformById(data, "taschenfon");
    expect(platformBudget(data, phone, 2020)).toBeGreaterThan(platformBudget(data, phone, 2010));
    const helios = platformById(data, "helios");
    expect(platformBudget(data, helios, 2014)).toBe(platformBudget(data, helios, 2006));
  });
});

describe("Digitaler Vertrieb (MKT-R24, MKT-R25)", () => {
  it("MKT-R24 der Digitalanteil folgt dem Datenblatt: Konsole 2000 null, PC 2020 95 %, Smartphone immer ganz", () => {
    const data = testData();
    expect(digitalShare(data, ["zenit"], 2000)).toBe(0);
    expect(digitalShare(data, ["helios"], 2010)).toBe(1000);
    expect(digitalShare(data, ["standardpc"], 2020)).toBe(9500);
    expect(digitalShare(data, ["taschenfon"], 2010)).toBe(10000);
    expect(digitalOnly(data, ["wolke"], 2035)).toBe(true);
    expect(digitalOnly(data, ["helios3"], 2035)).toBe(false);
  });

  it("MKT-R25 digital behält der Store 30 %, ab 10 Mio. Umsatz je Spiel 20 %; physisch der Handel 40 %", () => {
    const data = testData();
    const s = neutralGame(data);
    s.week = weekOf(2012);
    const p = { platforms: ["standardpc"] };
    const price = grossPrice(data, p, 2012);
    expect(digitalNetPerUnit(s, data, p, 0)).toBe(Math.trunc((price * 7000) / 10000));
    expect(digitalNetPerUnit(s, data, p, data.sales.storeThresholdCent)).toBe(Math.trunc((price * 8000) / 10000));
    expect(netPerUnit(s, data, undefined, ["standardpc"])).toBe(Math.trunc((price * 6000) / 10000));
    // ANNAHME: Spiele auf dem Smartphone kosten einen Bruchteil des Vollpreises.
    expect(grossPrice(data, { platforms: ["taschenfon"] }, 2012)).toBeLessThan(price / 4);
  });

  it("MKT-T09 im Jahr 2016 hat ein rein digitales Spiel keine Auflage und verkauft ohne Bestand", () => {
    const data = testData();
    let s = neutralGame(data);
    s.week = weekOf(2016);
    s = tick(s, data, [input({ platforms: ["taschenfon"] })]);
    const project = lastProject(s);
    expect(project.status).toBe("laeuft");
    expect(recommendedPrintRun(s, data, project, 70000)).toBe(0);
    expect(startSales(s, data, project, 70000)).toBe(0);
    expect(project.sales!.stock).toBe(0);
    salesStep(s, data);
    expect(project.sales!.sold).toBeGreaterThan(0);
    expect(project.sales!.digitalSold).toBe(project.sales!.sold);
    expect(project.sales!.lost).toBe(0);
  });

  it("MKT-R24 gemischter Vertrieb: der PC 2010 verkauft die Hälfte digital, die Auflage deckt nur den physischen Teil", () => {
    const data = testData();
    let s = neutralGame(data);
    s.week = weekOf(2010);
    s = tick(s, data, [input({ platforms: ["standardpc"] })]);
    const project = lastProject(s);
    expect(recommendedPrintRun(s, data, project, 70000)).toBeGreaterThan(0);
    startSales(s, data, project, 70000);
    project.sales!.stock = 0;
    salesStep(s, data);
    // Ohne Bestand verkauft nur der digitale Weg; der physische Teil geht verloren.
    expect(project.sales!.digitalSold).toBeGreaterThan(0);
    expect(project.sales!.lost).toBeGreaterThan(0);
    expect(Math.abs(project.sales!.digitalSold - project.sales!.lost)).toBeLessThanOrEqual(1);
  });
});
