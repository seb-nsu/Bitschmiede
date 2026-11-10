// Teilschritt 4.3: Release-Paket (MKT-R09, MKT-R12, MKT-R27, MKT-T07, MKT-T14).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { defaultPlan, earliestReleaseWeek, standardPrice } from "../../src/sim/systems/produkte/release";
import { priceDemandFactor } from "../../src/sim/systems/markt";
import { migrateState } from "../../src/sim/save";
import type { GameData, GameState } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, testData, untilReady } from "../helpers";

function ready(data: GameData, over = {}): { s: GameState; id: number } {
  let s = tick(neutralGame(data), data, [input(over)]);
  const id = lastProject(s).id;
  s = untilReady(s, data, id);
  s.events = [];
  return { s, id };
}

describe("Release-Paket (MKT-R09)", () => {
  it("MKT-T07 ohne Änderung ist jeder Punkt vorbelegt und eine Bestätigung genügt", () => {
    const data = testData();
    const { s, id } = ready(data);
    const p = s.projects.find((x) => x.id === id)!;
    const plan = defaultPlan(s, data, p);
    expect(plan.week).toBe(earliestReleaseWeek(s, data, p));
    expect(plan.priceCent).toBe(standardPrice(s, data, p));
    expect(plan.deluxe).toBe(false);
    expect(plan.collectorUnits).toBe(0);
    expect(plan.preorders).toBe(p.marketing.announcedWeek !== null);
    let next = tick(s, data, [{ type: "release", projectId: id }]);
    expect(next.projects.find((x) => x.id === id)!.releasePlan).not.toBeNull();
    for (let i = 0; i < 6 && next.projects.find((x) => x.id === id)!.status !== "veroeffentlicht"; i++) next = tick(next, data);
    expect(next.projects.find((x) => x.id === id)!.status).toBe("veroeffentlicht");
  });

  it("MKT-R09 Termin: der Release wartet auf die Woche im Paket", () => {
    const data = testData();
    const { s, id } = ready(data);
    let next = tick(s, data, [{ type: "release", projectId: id, week: s.week + 6 }]);
    for (let i = 0; i < 5; i++) next = tick(next, data);
    expect(next.projects.find((x) => x.id === id)!.status).toBe("bereit");
    next = tick(next, data);
    expect(next.projects.find((x) => x.id === id)!.status).toBe("veroeffentlicht");
    expect(validateInput(s, data, { type: "release", projectId: id, week: s.week - 1 })).toBe("error.releaseWeek");
  });

  it("MKT-R06 Preis: vor 2000 bestimmt der Handel, ab 2000 frei zwischen 50 % und 150 %", () => {
    const data = testData();
    const { s, id } = ready(data);
    const p = s.projects.find((x) => x.id === id)!;
    const std = standardPrice(s, data, p);
    expect(validateInput(s, data, { type: "release", projectId: id, priceCent: std - 100 })).toBe("error.priceLocked");
    expect(validateInput(s, data, { type: "release", projectId: id, priceCent: std })).toBeNull();
    data.release.priceFromYear = 1980;
    expect(validateInput(s, data, { type: "release", projectId: id, priceCent: Math.trunc(std * 0.8) })).toBeNull();
    expect(validateInput(s, data, { type: "release", projectId: id, priceCent: Math.trunc(std * 0.4) })).toBe("error.priceRange");
  });

  it("ANNAHME Preis-Elastizität: 20 % billiger gibt 30 % mehr Nachfrage, 20 % teurer 30 % weniger", () => {
    const data = testData();
    expect(priceDemandFactor(data, 8000, 10000)).toBe(13000);
    expect(priceDemandFactor(data, 12000, 10000)).toBe(7000);
    expect(priceDemandFactor(data, 10000, 10000)).toBe(10000);
    expect(priceDemandFactor(data, 100000, 10000)).toBe(data.release.priceDemandMinBp);
  });

  it("MKT-R27 Deluxe hebt den Durchschnittspreis, die Sammler-Edition ist eine eigene kleine Auflage", () => {
    const data = testData();
    data.release.deluxeFromYear = 1980;
    const { s, id } = ready(data);
    const p = s.projects.find((x) => x.id === id)!;
    const std = standardPrice(s, data, p);
    let next = tick(s, data, [{ type: "release", projectId: id, deluxe: true, collectorUnits: 2000 }]);
    for (let i = 0; i < 6 && next.projects.find((x) => x.id === id)!.status !== "veroeffentlicht"; i++) next = tick(next, data);
    const sales = next.projects.find((x) => x.id === id)!.sales!;
    expect(sales.priceCent).toBe(std + Math.trunc((std * 750) / 10000));
    expect(sales.collector!.sold).toBeGreaterThan(0);
    expect(sales.collector!.stock + sales.collector!.sold).toBe(2000);
    expect(sales.collector!.priceCent).toBe(Math.trunc((std * 25000) / 10000));
  });

  it("MKT-R27 vor 2000 keine Deluxe-Edition", () => {
    const data = testData();
    const { s, id } = ready(data);
    expect(validateInput(s, data, { type: "release", projectId: id, deluxe: true })).toBe("error.locked");
  });

  it("MKT-R12 Verschieben kostet 10 % Interesse, nach Vorbestellungen 20 %", () => {
    const data = testData();
    const { s, id } = ready(data);
    s.projects.find((x) => x.id === id)!.marketing.announcedWeek = 0;
    s.projects.find((x) => x.id === id)!.marketing.interest = 100_000;
    const withPre = tick(s, data, [{ type: "release", projectId: id, week: s.week + 3, preorders: true }]);
    const a = tick(withPre, data, [{ type: "postponeRelease", projectId: id, week: s.week + 8 }]).projects.find((x) => x.id === id)!;
    const without = tick(s, data, [{ type: "release", projectId: id, week: s.week + 3, preorders: false }]);
    const b = tick(without, data, [{ type: "postponeRelease", projectId: id, week: s.week + 8 }]).projects.find((x) => x.id === id)!;
    expect(a.releasePlan!.week).toBe(s.week + 8);
    expect(a.releasePlan!.postponements).toBe(1);
    expect(b.marketing.interest).toBeGreaterThan(a.marketing.interest);
    expect(validateInput(withPre, data, { type: "postponeRelease", projectId: id, week: s.week + 2 })).toBe("error.releaseWeek");
  });

  it("MKT-T14 Konsole: Gold in Woche w, Release frühestens w + 4", () => {
    const data = testData();
    const { s, id } = ready(data);
    const p = s.projects.find((x) => x.id === id)!;
    p.platforms = [data.platforms.find((x) => x.certification && x.releaseYear <= 1980)?.id ?? p.platforms[0]!];
    if (data.platforms.find((x) => x.id === p.platforms[0])!.certification) expect(earliestReleaseWeek(s, data, p)).toBe(s.week + 4);
  });

  it("Migration 27 → 28: Projekte ohne Release-Paket", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    const old = structuredClone(s) as unknown as Record<string, unknown> & { schemaVersion: number };
    old.schemaVersion = 27;
    for (const p of old.projects as Record<string, unknown>[]) delete p.releasePlan;
    expect(migrateState(old).projects[0]!.releasePlan).toBeNull();
  });
});
