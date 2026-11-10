// Teilschritt 1.4: Plattformen, Verkäufe, Auflage, Zertifizierung (S05, S08, PRD-R10, PRD-R26).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import {
  decayK, platformActive, platformBase, platformById, priceOf, productionCost, qRel, reachableBase, season, weeklyDemand,
} from "../../src/sim/systems/markt";
import { input, lastProject, neutralGame, playProject, testData, untilReady } from "../helpers";

describe("Plattformen (S08)", () => {
  it("MRK-R11 feste Lebenszyklen: Orbis bis 1986, Nova ab 1985; der Crash 1983–85 senkt die Konsolenbasis", () => {
    const data = testData();
    const orbis = platformById(data, "orbis");
    expect(platformActive(orbis, 1986)).toBe(true);
    expect(platformActive(orbis, 1987)).toBe(false);
    expect(platformActive(platformById(data, "nova"), 1984)).toBe(false);
    expect(platformBase(orbis, 1985)).toBeLessThan(platformBase(orbis, 1982) / 5);
  });

  it("MRK-R06 eine eingestellte Plattform bringt neuen Spielen nur 5 % ihrer Basis", () => {
    const data = testData();
    const base = platformBase(platformById(data, "orbis"), 1987);
    expect(reachableBase(data, ["orbis"], 1987)).toBe(Math.trunc((base * 500) / 10000));
  });

  it("PRD-R10 ein Projekt braucht mindestens eine Plattform im Handel", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(validateInput(s, data, input({ platforms: [] }))).toBe("error.noPlatform");
    // MRK-T04: Eine angekündigte Plattform ist ohne Devkit nicht wählbar.
    expect(validateInput(s, data, input({ platforms: ["nova"] }))).toBe("error.noDevkit");
    expect(validateInput(s, data, input({ platforms: ["fuchs", "fuchs"] }))).toBe("error.duplicatePlatform");
    expect(validateInput(s, data, input({ platforms: ["fuchs", "orbis"] }))).toBeNull();
  });

  it("PRD-R60 S02 5.4 weitere Plattform: a₀ = 15 % bei gleichem Typ, plus a₁ · Abstand = 35 % bei anderem Typ", () => {
    const data = testData();
    const one = tick(neutralGame(data), data, [input()]).projects[0]!.effortTotalBp;
    const other = tick(neutralGame(data), data, [input({ platforms: ["fuchs", "orbis"] })]).projects[0]!.effortTotalBp;
    expect(other).toBe(Math.trunc((one * 15000) / 10000));
    // 1983: zwei Heimcomputer (gleicher Typ) kosten nur a₀.
    const late = neutralGame(data);
    late.week = 52 * 3;
    const lateOne = tick(late, data, [input()]).projects[0]!.effortTotalBp;
    const same = tick(late, data, [input({ platforms: ["fuchs", "kobold"] })]).projects[0]!.effortTotalBp;
    expect(same).toBe(Math.trunc((lateOne * 11500) / 10000));
  });
});

describe("Nachfrage (MKT-F2, MKT-F3)", () => {
  it("MKT-F2 Q_rel = Wertung / 7, begrenzt 0,3–1,5; k = k₀ · 7 / max(Wertung, 3)", () => {
    const data = testData();
    expect(qRel(data, 70000)).toBe(10000);
    expect(qRel(data, 10000)).toBe(3000);
    expect(qRel(data, 100000)).toBe(14285);
    expect(decayK(data, 70000)).toBe(1200);
    expect(decayK(data, 10000)).toBe(2800);
  });

  it("MKT-T13 die Nachfrage wächst mit der erreichbaren Basis und fällt mit der Zeit", () => {
    const data = testData();
    const s = neutralGame(data);
    const p = { platforms: ["fuchs"], genre: "action", theme: "scifi", scope: "klein" as const };
    const both = { ...p, platforms: ["fuchs", "orbis"] };
    expect(weeklyDemand(s, data, both, 70000, 0, 13)).toBeGreaterThan(weeklyDemand(s, data, p, 70000, 0, 13) * 5);
    expect(weeklyDemand(s, data, p, 70000, 10, 13)).toBeLessThan(weeklyDemand(s, data, p, 70000, 0, 13));
    expect(weeklyDemand(s, data, p, 90000, 0, 13)).toBeGreaterThan(weeklyDemand(s, data, p, 50000, 0, 13));
  });

  it("MKT-R11 Weihnachtsquartal ×1,6, Sommerloch ×0,8", () => {
    const data = testData();
    expect(season(data, 10)).toBe(16000);
    expect(season(data, 6)).toBe(8000);
    expect(season(data, 2)).toBe(10000);
  });

  it("MKT-V03 Modul: Stückkosten plus Plattformgebühr je gefertigtem Stück; Mindestcharge 10.000", () => {
    const data = testData();
    const s = neutralGame(data);
    s.week = 6 * 52;
    const proj = { platforms: ["nova"], playtests: [] } as never;
    const c = productionCost(s, data, proj, 10000);
    expect(c.minBatch).toBe(10000);
    expect(c.leadWeeks).toBe(10);
    const price = priceOf(data, 1986);
    expect(price).toBe(4200);
    expect(c.costCent).toBe(10000 * (600 + Math.trunc((price * 1200) / 10000)));
  });
});

describe("Auflage und Verkäufe (S05 Abschnitt 13)", () => {
  it("MKT-R22 die Erstauflage wird beim Release bezahlt; verkauft wird höchstens der Bestand", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input()]);
    s = tick(s, data, [{ type: "setPrintRun", projectId: 1, units: 1000 }]);
    s = untilReady(s, data, 1);
    s = tick(s, data, [{ type: "release", projectId: 1 }]);
    const p = lastProject(s);
    expect(s.finance.ledger.some((m) => m.costs.production === 1000 * 150)).toBe(true);
    for (let i = 0; i < 30; i++) s = tick(s, data);
    const sales = s.projects[0]!.sales!;
    expect(sales.sold).toBeLessThanOrEqual(1000);
    expect(p.sales!.stock + p.sales!.sold).toBeLessThanOrEqual(1000);
  });

  it("MKT-R23 S05 Abschnitt 9: Ist die Auflage weg und die Nachfrage nicht, kommt „Nachproduktion“; die Ware kommt nach dem Vorlauf", () => {
    const data = testData();
    data.sales.spontaneousBp = 40;
    let s = tick(neutralGame(data), data, [input(), { type: "setPrintRun", projectId: 1, units: 1000 }]);
    s = untilReady(s, data, 1);
    s = tick(s, data, [{ type: "release", projectId: 1 }]);
    for (let i = 0; i < 20 && !s.events.some((e) => e.kind === "nachproduktion"); i++) s = tick(s, data);
    const e = s.events.find((x) => x.kind === "nachproduktion")!;
    expect(e).toBeDefined();
    expect(s.projects[0]!.sales!.lost).toBeGreaterThan(0);
    s = tick(s, data, [{ type: "decide", eventId: e.id, option: "nachproduzieren" }]);
    const order = s.projects[0]!.sales!.orders[0]!;
    expect(order.arrivalWeek - (s.week - 1)).toBe(2);
    expect(order.units).toBe(e.reorder!.units);
  });

  it("MKT-V11 MKT-VT06 nach 8 Wochen unter 20 % der Startwoche halbiert der Regalverlust die Nachfrage", () => {
    const data = testData();
    data.sales.decayK0Bp = 3000;
    let s = playProject(neutralGame(data), data, input({ printRun: undefined } as never));
    for (let i = 0; i < 12; i++) s = tick(s, data);
    expect(s.projects[0]!.sales!.shelfLost).toBe(true);
  });

  it("MKT-V02 die Erstauflage erreicht mindestens die Mindestcharge", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input(), { type: "setPrintRun", projectId: 1, units: 10 }]);
    s = untilReady(s, data, 1);
    s = tick(s, data, [{ type: "release", projectId: 1 }]);
    expect(s.finance.ledger.some((m) => m.costs.production === 1000 * 150)).toBe(true);
  });

  it("MKT-V04 Lagerkosten je Stück und Monat", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input(), { type: "setPrintRun", projectId: 1, units: 500000 }]);
    s = untilReady(s, data, 1);
    s = tick(s, data, [{ type: "release", projectId: 1 }]);
    for (let i = 0; i < 6; i++) s = tick(s, data);
    expect(s.finance.ledger.reduce((sum, m) => sum + m.costs.storage, 0)).toBeGreaterThan(400000 * 2);
  });
});

describe("Zertifizierung (PRD-R26, MKT-R13)", () => {
  function goldOnNova(threshold: number) {
    const data = testData();
    data.sales.certification.thresholdBugs = threshold;
    let s = neutralGame(data);
    s.week = 6 * 52;
    s.moneyCent = 100_000_000;
    s = tick(s, data, [input({ platforms: ["nova"] })]);
    s = untilReady(s, data, 1);
    s = tick(s, data, [{ type: "release", projectId: 1 }]);
    return { data, s, gold: s.week - 1 };
  }

  it("MKT-T14 Gold in Woche w → Release frühestens in Woche w + 4", () => {
    const { data, s: s0, gold } = goldOnNova(10_000);
    let s = s0;
    while (s.projects[0]!.status !== "veroeffentlicht") s = tick(s, data);
    expect(s.projects[0]!.result!.week).toBe(gold + 4);
    expect(s.projects[0]!.certAttempts).toBe(1);
  });

  it("MKT-T14 scheitert die Zertifizierung, verschiebt sich der Release um weitere 4 Wochen", () => {
    const { data, s: s0, gold } = goldOnNova(0);
    let s = s0;
    for (let i = 0; i < 4; i++) s = tick(s, data);
    expect(s.projects[0]!.certAttempts).toBe(2);
    expect(s.log.some((l) => l.key === "log.certFailed")).toBe(true);
    data.sales.certification.thresholdBugs = 10_000;
    while (s.projects[0]!.status !== "veroeffentlicht") s = tick(s, data);
    expect(s.projects[0]!.result!.week).toBe(gold + 8);
  });

  it("PRD-R26 ein reiner Heimcomputer-Titel braucht keine Zertifizierung", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input()]);
    s = untilReady(s, data, 1);
    const gold = s.week;
    s = tick(s, data, [{ type: "release", projectId: 1 }]);
    expect(s.projects[0]!.result!.week).toBe(gold);
  });
});
