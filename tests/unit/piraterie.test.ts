// Teilschritt 4.4: Piraterie und Kopierschutz (MKT-R28 bis MKT-R34, MKT-R55, MKT-R56, MKT-F5).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { aiProtection, autopilotProtection, availableProtections, baseRate, newProtection, piracyRate, removeProtection } from "../../src/sim/systems/piraterie";
import { migrateState } from "../../src/sim/save";
import type { AiStudio, GameData, ProductProtection } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

function pcIn(data: GameData, year: number): string {
  return data.platforms.find((p) => p.type === "pc" && p.releaseYear <= year && p.endYear >= year)!.id;
}

function prot(level: string, hold: number | null): ProductProtection {
  return { level, holdWeeks: hold, cracked: false, removed: false, offered: false, piracyBp: 0, copies: 0, satisfaction: 0 };
}

describe("Piraterie (MKT-F5, Datenblatt §8)", () => {
  it("MKT-T17 PC 1995 mit Datenträger-Schutz und H = 2: Woche 1 und 2 genau 0,35, ab Woche 3 genau 0,50", () => {
    const data = testData();
    const pc = pcIn(data, 1995);
    expect(baseRate(data, [pc], 1995)).toBe(5000);
    const p = prot("datentraeger", 2);
    expect(piracyRate(data, [pc], 1995, p, 0)).toBe(3500);
    expect(piracyRate(data, [pc], 1995, p, 1)).toBe(3500);
    expect(piracyRate(data, [pc], 1995, p, 2)).toBe(5000);
  });

  it("MKT-T05 PC 2005 mit Aktivierung: Woche 1 deutlich niedriger als Woche 12", () => {
    const data = testData();
    const pc = pcIn(data, 2005);
    const s = neutralGame(data);
    const p = newProtection(s, data, "aktivierung");
    expect(p.holdWeeks).toBeGreaterThanOrEqual(1);
    expect(p.holdWeeks).toBeLessThanOrEqual(4);
    expect(piracyRate(data, [pc], 2005, p, 0)).toBe(2000);
    expect(piracyRate(data, [pc], 2005, p, 11)).toBe(5000);
  });

  it("MKT-R30 Store-Schutz hält dauerhaft mit 0,10; Konsolen in den Modchip-Jahren 0,20", () => {
    const data = testData();
    const pc = pcIn(data, 2012);
    expect(piracyRate(data, [pc], 2012, prot("store", null), 200)).toBe(1800);
    const console = data.platforms.find((p) => p.type === "konsole" && p.releaseYear <= 1999 && p.endYear >= 1999)!.id;
    expect(baseRate(data, [console], 1999)).toBe(2000);
    expect(baseRate(data, [console], 2005)).toBe(500);
  });

  it("MKT-R29 Stufen nach Epoche; Autopilot ohne Online-Pflicht und Middleware", () => {
    const data = testData();
    expect(availableProtections(data, 1985).map((l) => l.id)).toEqual(["keiner", "abfrage"]);
    expect(autopilotProtection(data, 1985)).toBe("abfrage");
    expect(autopilotProtection(data, 1995)).toBe("datentraeger");
    expect(autopilotProtection(data, 2012)).toBe("aktivierung");
    expect(availableProtections(data, 2015).map((l) => l.id)).toContain("middleware");
  });

  it("S05 Abschnitt 7: AAA nimmt die stärkste Stufe, Online-Pflicht nur mit Draufgänger; sonst Store-Schutz", () => {
    const data = testData();
    const aaa = { archetype: "aaa", traits: [] } as unknown as AiStudio;
    const bold = { archetype: "aaa", traits: ["draufgaenger"] } as unknown as AiStudio;
    const indie = { archetype: "indie", traits: [] } as unknown as AiStudio;
    expect(aiProtection(data, aaa, 2012)).toBe("aktivierung");
    expect(aiProtection(data, bold, 2012)).toBe("online");
    expect(aiProtection(data, indie, 2012)).toBe("store");
    expect(aiProtection(data, indie, 1995)).toBe("datentraeger");
  });

  it("MKT-R28 Kopien sind verlorene Verkäufe; Release mit Schutz aus dem Paket", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const sales = lastProject(s).sales!;
    expect(sales.protection!.level).toBe("abfrage");
    expect(sales.protection!.copies).toBeGreaterThan(0);
    expect(validateInput(neutralGame(data), data, { type: "release", projectId: 1, protection: "online" })).not.toBeNull();
  });

  it("MKT-R55, MKT-R56 geknackt: Vorschlag „entfernen“, danach Zufriedenheit +50 % und Studio-Ruf +1", () => {
    const data = testData();
    let s = playProject(neutralGame(data), data, input());
    const id = lastProject(s).id;
    // Bis der Kopierschutz geknackt ist und die Karte kommt (Zeitpunkt hängt vom Zufallsstrom ab).
    for (let i = 0; i < 12 && !s.events.some((e) => e.kind === "schutzEntfernen" && e.projectId === id); i++) s = tick(s, data);
    const p = s.projects.find((x) => x.id === id)!;
    expect(p.sales!.protection!.cracked).toBe(true);
    const ev = s.events.find((e) => e.kind === "schutzEntfernen" && e.projectId === id);
    expect(ev).toBeDefined();
    const rep = s.studioReputationBp;
    s = tick(s, data, [{ type: "decide", eventId: ev!.id, option: "entfernen" }]);
    const after = s.projects.find((x) => x.id === id)!.sales!.protection!;
    expect(after.removed).toBe(true);
    expect(after.satisfaction).toBe(-50);
    expect(s.studioReputationBp).toBe(rep + 100);
  });

  it("MKT-R32 Entfernen gibt die Hälfte der verlorenen Zufriedenheit zurück", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const p = lastProject(s);
    p.sales!.protection!.satisfaction = -1200;
    removeProtection(s, data, p);
    expect(p.sales!.protection!.satisfaction).toBe(-600);
  });

  it("Migration 28 → 29: Studio-Ruf und Pakete ohne Schutz", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    const old = structuredClone(s) as unknown as Record<string, unknown> & { schemaVersion: number };
    old.schemaVersion = 28;
    delete old.studioReputationBp;
    (old.projects as Record<string, unknown>[])[0]!.releasePlan = { week: 1, priceCent: 1, deluxe: false, collectorUnits: 0, preorders: false, postponements: 0 };
    const m = migrateState(old);
    expect(m.studioReputationBp).toBe(2000);
    expect(m.projects[0]!.releasePlan!.protection).toBe("keiner");
  });
});
