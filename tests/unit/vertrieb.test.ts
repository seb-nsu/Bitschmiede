// Teilschritt 4.7: Vertrieb (MKT-V04, MKT-V06 bis MKT-V13, MKT-R26, MKT-VT07).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { applyReturns, autopilotChannel, bundlePay, channelBlocker, channelReach, distributionStep, refundRate } from "../../src/sim/systems/vertrieb";
import { relation } from "../../src/sim/systems/plattformen";
import { migrateState } from "../../src/sim/save";
import { dateOf } from "../../src/sim/calendar";
import type { GameData, GameState } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, testData, untilReady } from "../helpers";

function readyGame(data: GameData): { s: GameState; id: number } {
  let s = tick(neutralGame(data), data, [input()]);
  const id = lastProject(s).id;
  s = untilReady(s, data, id);
  return { s, id };
}

function toYear(s: GameState, year: number): void {
  s.startYear = year - dateOf(0, s.week).year;
}

describe("Vertrieb (S05 Abschnitt 13)", () => {
  it("MKT-V07, MKT-V08 Autopilot nimmt den Distributor (90 % Reichweite); Eigenvertrieb erreicht 15 %", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const sales = lastProject(s).sales!;
    expect(sales.channel).toBe("distributor");
    expect(channelReach(data, sales)).toBe(9000);
    expect(channelReach(data, { ...sales, channel: "eigen" })).toBe(1500);
    expect(channelReach(data, { ...sales, channel: undefined })).toBe(10000);
  });

  it("MKT-V09 Handelsvertrieb erst ab 30 Personen; der Autopilot nimmt ihn dann", () => {
    const data = testData();
    const { s, id } = readyGame(data);
    const p = s.projects.find((x) => x.id === id)!;
    expect(validateInput(s, data, { type: "release", projectId: id, channel: "handelsvertrieb" })).toBe("error.teamTooSmall");
    expect(autopilotChannel(s, data, p.platforms)).toBe("distributor");
    while (s.people.length < 30) s.people.push({ ...s.people[0]!, id: s.people.length + 100 });
    expect(channelBlocker(s, data, p.platforms, "handelsvertrieb")).toBeNull();
    expect(autopilotChannel(s, data, p.platforms)).toBe("handelsvertrieb");
  });

  it("MKT-V10 Shareware 1988–2000 nur auf Heimcomputer und PC: keine Auflage, Interesse +50 %", () => {
    const data = testData();
    const { s, id } = readyGame(data);
    expect(validateInput(s, data, { type: "release", projectId: id, channel: "shareware" })).toBe("error.locked");
    toYear(s, 1990);
    const p = s.projects.find((x) => x.id === id)!;
    expect(channelBlocker(s, data, ["nova"], "shareware")).toBe("error.platform");
    expect(validateInput(s, data, { type: "release", projectId: id, channel: "shareware" })).toBeNull();
    p.marketing.interest = 10000;
    const after = tick(s, data, [{ type: "release", projectId: id, channel: "shareware" }]);
    const r = after.projects.find((x) => x.id === id)!;
    expect(r.sales!.channel).toBe("shareware");
    expect(r.result!.interestAtRelease).toBe(15000);
    expect(r.sales!.stock).toBe(0);
    expect(r.sales!.sold).toBeGreaterThan(0);
  });

  it("MKT-V04 nach 4 Monaten kommen 30 % der Restware aus dem Handel zurück", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const p = lastProject(s);
    p.sales!.stock = 10000;
    applyReturns(s, data, p, 16);
    expect(p.sales!.stock).toBe(10000);
    applyReturns(s, data, p, 17);
    expect(p.sales!.stock).toBe(7000);
    expect(p.sales!.returned).toBe(3000);
    // Eigenvertrieb hat keine Rückläufer.
    p.sales!.channel = "eigen";
    p.sales!.returned = 0;
    applyReturns(s, data, p, 17);
    expect(p.sales!.returned).toBe(0);
  });

  it("MKT-R26 Rückerstattungen ab 2010: 2 % Grund, +5 % kurz, +5 % viele Bugs", () => {
    const data = testData();
    const s = neutralGame(data);
    const p = { scope: "klein" } as never;
    expect(refundRate(s, data, p, 20)).toBe(0);
    toYear(s, 2012);
    expect(refundRate(s, data, p, 20)).toBe(1200);
    expect(refundRate(s, data, { scope: "mittel" } as never, 0)).toBe(200);
  });

  it("MKT-V06 Beigaben: teurere Stücke, mehr Fan-Käufe, wirken als Handbuchabfrage", () => {
    const data = testData();
    const plain = readyGame(data);
    const a = tick(plain.s, data, [{ type: "release", projectId: plain.id, protection: "keiner" }]);
    const b = tick(plain.s, data, [{ type: "release", projectId: plain.id, protection: "keiner", extras: true }]);
    const sa = a.projects.find((x) => x.id === plain.id)!.sales!;
    const sb = b.projects.find((x) => x.id === plain.id)!.sales!;
    expect(sa.protection!.level).toBe("keiner");
    expect(sb.protection!.level).toBe("abfrage");
    expect(b.moneyCent).toBeLessThan(a.moneyCent);
  });

  it("MKT-VT07 Wertung 8,7 auf Plattform X: Hersteller bündelt den Titel, das bringt Geld und Beziehung (Prüfung Fable: ohne Fenster)", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const p = lastProject(s);
    p.result!.scoreBp = 87000;
    p.platforms = ["nova"];
    p.sales!.startWeek = s.week - data.distribution.bundle.afterWeeks;
    const rel = relation(s, data, "morgenstern");
    const money = s.moneyCent;
    const pay = bundlePay(s, data, "nova");
    distributionStep(s, data);
    expect(s.events.some((e) => e.kind === "hardwareBundle")).toBe(false);
    expect(relation(s, data, "morgenstern")).toBeGreaterThan(rel);
    expect(s.moneyCent).toBe(money + pay);
    // Unter 8,5 kein Angebot.
    const t = playProject(neutralGame(data), data, input());
    const q = lastProject(t);
    q.result!.scoreBp = 84000;
    q.platforms = ["nova"];
    q.sales!.startWeek = t.week - data.distribution.bundle.afterWeeks;
    const before = t.moneyCent;
    distributionStep(t, data);
    expect(t.moneyCent).toBe(before);
  });

  it("MKT-V13 Heft-Beilage nur für Titel ab 2 Jahren; Annahme: Festbetrag und Bekanntheit", () => {
    const data = testData();
    data.distribution.coverMount.chancePerQuarterBp = 10000;
    const s = playProject(neutralGame(data), data, input());
    const p = lastProject(s);
    toYear(s, 1990);
    s.week += (52 - (s.week % 13)) % 13;
    p.sales!.startWeek = s.week - 50;
    distributionStep(s, data);
    expect(p.sales!.coverMounted).toBeFalsy();
    p.sales!.startWeek = s.week - 110;
    const brand = s.brands.find((b) => b.id === p.brandId);
    const aw = brand?.awarenessBp ?? 0;
    const money = s.moneyCent;
    distributionStep(s, data);
    expect(s.events.some((e) => e.kind === "heftBeilage")).toBe(false);
    expect(s.moneyCent).toBeGreaterThan(money);
    expect(s.projects.find((x) => x.id === p.id)!.sales!.coverMounted).toBe(true);
    if (brand) expect(s.brands.find((b) => b.id === brand.id)!.awarenessBp).toBeGreaterThan(aw);
  });

  it("Migration 31 → 32: Pakete über den Distributor ohne Beigaben", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    const old = structuredClone(s) as unknown as Record<string, unknown> & { schemaVersion: number };
    old.schemaVersion = 31;
    (old.projects as Record<string, unknown>[])[0]!.releasePlan = { week: 1, priceCent: 1, deluxe: false, collectorUnits: 0, preorders: false, postponements: 0, protection: "keiner" };
    const m = migrateState(old);
    expect(m.projects[0]!.releasePlan!.channel).toBe("distributor");
    expect(m.projects[0]!.releasePlan!.extras).toBe(false);
  });
});
