// Teilschritte 6b.3 bis 6b.5: Übernahmen, Tochter, KI-Käufer (S09 UEB-R01 bis UEB-R42).
import { describe, expect, it } from "vitest";
import { migrateState } from "../../src/sim/save";
import { tick } from "../../src/sim/tick";
import {
  acquisitionStep, applyAcquire, applySubsidiary, becomeSubsidiary, cultureFit, directiveAllows, integrationCapacity, leaveChance, minPrice,
  shownRange, synergyBp, trueValue, validateAcquire, validateSubsidiary,
} from "../../src/sim/systems/uebernahmen";
import { liveStudios } from "../../src/sim/systems/ki/studios";
import { goalStep } from "../../src/sim/systems/ziele";
import type { AiStudio, GameData, GameState } from "../../src/sim/model/types";
import { neutralGame, testData } from "../helpers";

/** Firma im Jahr `year` mit `people` Personen (Kopien der Gründer); die KI-Welt steht. */
function bigFirm(data: GameData, year = 2010, people = 150): GameState {
  const s = neutralGame(data);
  s.week = (year - s.startYear) * 52 + 1;
  const base = s.people[0]!;
  let id = Math.max(...s.people.map((p) => p.id)) + 1;
  while (s.people.length < people) s.people.push({ ...structuredClone(base), id: id++, isFounder: false });
  s.moneyCent = 100_000_000_000;
  return s;
}

function target(s: GameState): AiStudio {
  return liveStudios(s).filter((x) => !x.parent).sort((a, b) => a.id - b.id)[0]!;
}

function probe(s: GameState, data: GameData, t: AiStudio): number {
  const inp = { type: "acquire" as const, action: "sondieren" as const, targetId: t.id };
  expect(validateAcquire(s, data, inp)).toBeNull();
  applyAcquire(s, data, inp);
  return s.acquisitions.deals[s.acquisitions.deals.length - 1]!.id;
}

describe("Übernahmen: Ablauf (UEB-R01 bis UEB-R12)", () => {
  // Entscheidung Projektleitung 02.11.2026: Schwelle 60 Personen statt 150 (A02), Jahr 2005 bleibt.
  it("UEB-T01, UEB-T11: vor 2005 oder unter 60 Personen gesperrt, mit 60 ab 2005 möglich", () => {
    const data = testData();
    const t = (s: GameState) => validateAcquire(s, data, { type: "acquire", action: "sondieren", targetId: target(s).id });
    expect(t(bigFirm(data, 2004, 120))).toBe("error.acqLocked");
    expect(t(bigFirm(data, 2010, 59))).toBe("error.acqLocked");
    expect(t(bigFirm(data, 2010, 60))).toBeNull();
    const off = bigFirm(data, 2010, 150);
    off.settings.acquisitions = false;
    expect(t(off)).toBe("error.acqLocked");
  });

  it("UEB-T02, UEB-T03, UEB-T12: Spanne um die versetzte Mitte enthält den wahren Wert; nach der Prüfung ±10 %", () => {
    const data = testData();
    const s = bigFirm(data);
    const t = target(s);
    const dealId = probe(s, data, t);
    const deal = s.acquisitions.deals.find((d) => d.id === dealId)!;
    const w = trueValue(s, data, t);
    const r = shownRange(s, data, deal);
    expect(r.low).toBeLessThanOrEqual(w);
    expect(r.high).toBeGreaterThanOrEqual(w);
    applyAcquire(s, data, { type: "acquire", action: "pruefen", dealId });
    expect(deal.diligence).toBe("laufend");
    for (let i = 0; i < 20 && deal.diligence !== "fertig"; i++) acquisitionStep(s, data);
    expect(deal.diligence).toBe("fertig");
    const c = shownRange(s, data, deal);
    expect(c.mid).toBe(w);
    expect(c.high - c.low).toBeLessThanOrEqual(w * 2 / 10 + 2);
  });

  it("UEB-T04: 90 % des Mindestpreises ergibt ein Gegenangebot, 80 % eine Ablehnung mit 26 Wochen Sperre", () => {
    const data = testData();
    data.acquisitions.price.bidderChanceBp = 0;
    for (const [share, phase] of [[9000, "gegenangebot"], [8000, "gescheitert"]] as const) {
      const s = bigFirm(data);
      const t = target(s);
      const dealId = probe(s, data, t);
      const min = minPrice(s, data, t, 0);
      applyAcquire(s, data, { type: "acquire", action: "bieten", dealId, bidCent: Math.floor(min * share / 10000) });
      s.week += 1;
      acquisitionStep(s, data);
      const deal = s.acquisitions.deals.find((d) => d.id === dealId)!;
      expect(deal.phase).toBe(phase);
      if (phase === "gegenangebot") {
        expect(s.events.some((e) => e.kind === "gegenangebot" && e.dealId === dealId)).toBe(true);
      } else {
        expect(s.acquisitions.targets[String(t.id)]!.blockedUntil).toBe(s.week + 26);
        expect(validateAcquire(s, data, { type: "acquire", action: "sondieren", targetId: t.id })).toBe("error.acqBlocked");
      }
    }
  });

  it("Gebot über dem Mindestpreis kauft die Firma; sie wird Tochter mit Integration", () => {
    const data = testData();
    data.acquisitions.price.bidderChanceBp = 0;
    const s = bigFirm(data);
    const t = target(s);
    const dealId = probe(s, data, t);
    const bid = minPrice(s, data, t, 0) + 100;
    const before = s.moneyCent;
    applyAcquire(s, data, { type: "acquire", action: "bieten", dealId, bidCent: bid });
    s.week += 1;
    acquisitionStep(s, data);
    expect(t.parent?.ownerId).toBe(0);
    expect(t.parent!.integration.progressBp).toBeGreaterThan(0);
    expect(before - s.moneyCent).toBe(bid);
  });

  it("UEB-R11: Gebot mit Kredit über dem Kreditrahmen ist ungültig", () => {
    const data = testData();
    const s = bigFirm(data);
    const dealId = probe(s, data, target(s));
    expect(validateAcquire(s, data, { type: "acquire", action: "bieten", dealId, bidCent: 2_000_000_000_000, loanCent: 1_000_000_000_000 })).toBe("error.loanLimit");
  });
});

describe("Tochter (UEB-R15 bis UEB-R29, UEB-R35, UEB-R41)", () => {
  it("UEB-T15: Fit kreativ+familiär gegen kreativ+Konzern+Crunch = 3.333 bp; Integration +25 %, Moral −10", () => {
    expect(cultureFit(["kreativ", "familiaer"], ["kreativ", "konzern", "crunchKultur"])).toBe(3333);
    const data = testData();
    const s = bigFirm(data);
    const t = target(s);
    const sub = becomeSubsidiary(s, data, t, 0, 1_000_000, 0, []);
    if (sub.cultureFitBp < data.acquisitions.integration.cultureMinFitBp) expect(sub.moraleBp).toBe(6000);
    else expect(sub.moraleBp).toBe(7000);
  });

  it("UEB-T07: über der Kapazität sinken Moral und Fortschritt in allen laufenden Integrationen", () => {
    const data = testData();
    const s = bigFirm(data);
    const cap = integrationCapacity(s, data, 0);
    const list = liveStudios(s).filter((x) => !x.parent).slice(0, cap + 1);
    for (const x of list) becomeSubsidiary(s, data, x, 0, 1_000_000, 0, []);
    for (const x of list) x.parent!.cultureFitBp = 10000;
    const morale = list.map((x) => x.parent!.moraleBp);
    acquisitionStep(s, data);
    list.forEach((x, i) => expect(x.parent!.moraleBp).toBeLessThan(morale[i]!));
    const normal = Math.floor(10000 / list[0]!.parent!.integration.weeks);
    expect(list[0]!.parent!.integration.progressBp).toBeLessThan(normal);
    expect(list[0]!.parent!.integration.progressBp).toBeGreaterThanOrEqual(Math.floor(normal * 75 / 100) - 1);
  });

  it("UEB-T14: Wechselneigung nie negativ; Halteprämie gleich Jahresgehalt bei q0 = 400 ergibt 0", () => {
    const data = testData();
    const s = bigFirm(data);
    const t = target(s);
    const sub = becomeSubsidiary(s, data, t, 0, 1_000_000, 0, []);
    sub.cultureFitBp = 10000;
    sub.retentionCent = 1_000_000_000_000;
    sub.retentionUntilWeek = s.week + 10;
    expect(leaveChance(s, data, t)).toBe(0);
  });

  it("UEB-T17: von 1 Mio. Quartalsgewinn fließen 70 % an die Mutter", () => {
    const data = testData();
    const s = bigFirm(data);
    const t = target(s);
    const sub = becomeSubsidiary(s, data, t, 0, 1_000_000, 0, []);
    sub.integration.progressBp = 10000;
    t.cashCent = 1_000_000_000_000;
    sub.quarterCashStart = t.cashCent - 100_000_000;
    s.week = Math.ceil(s.week / 13) * 13;
    const money = s.moneyCent;
    const cash = t.cashCent;
    acquisitionStep(s, data);
    expect(s.moneyCent - money).toBe(70_000_000);
    expect(cash - t.cashCent).toBe(70_000_000);
  });

  it("UEB-R21: Synergien steigen ab 50 % Integration bis 10 %", () => {
    const data = testData();
    const s = bigFirm(data);
    const t = target(s);
    const sub = becomeSubsidiary(s, data, t, 0, 1_000_000, 0, []);
    sub.integration.progressBp = 4000;
    expect(synergyBp(data, t)).toBe(0);
    sub.integration.progressBp = 10000;
    expect(synergyBp(data, t)).toBe(1000);
  });

  it("UEB-R24, UEB-R26: Vorgaben begrenzen Genres und Umfang; gesteuert kostet Moral", () => {
    const data = testData();
    const s = bigFirm(data);
    const t = target(s);
    const sub = becomeSubsidiary(s, data, t, 0, 1_000_000, 0, []);
    expect(directiveAllows(t, "strategie", "mittel")).toBe(true);
    const inp = { type: "subsidiary" as const, studioId: t.id, action: "vorgaben" as const, directives: { autonomy: "gesteuert" as const, genres: ["action"], maxScope: "klein" as const } };
    expect(validateSubsidiary(s, data, inp)).toBeNull();
    const m = sub.moraleBp;
    applySubsidiary(s, data, inp, () => undefined);
    expect(sub.moraleBp).toBe(m - 1000);
    expect(directiveAllows(t, "action", "klein")).toBe(true);
    expect(directiveAllows(t, "action", "mittel")).toBe(false);
    expect(directiveAllows(t, "strategie", "klein")).toBe(false);
  });

  it("UEB-R28: Schließen übernimmt die Marken und kostet Ruf", () => {
    const data = testData();
    const s = bigFirm(data);
    const t = target(s);
    becomeSubsidiary(s, data, t, 0, 1_000_000, 0, []);
    const rep = s.studioReputationBp;
    let closed = false;
    applySubsidiary(s, data, { type: "subsidiary", studioId: t.id, action: "schliessen" }, () => { closed = true; });
    expect(closed).toBe(true);
    expect(s.studioReputationBp).toBeLessThan(rep);
    expect(s.brands.some((b) => b.ownerId === t.id)).toBe(false);
  });

  it("fremde Studios sind keine Tochter (Eingabe gesperrt)", () => {
    const data = testData();
    const s = bigFirm(data);
    expect(validateSubsidiary(s, data, { type: "subsidiary", studioId: target(s).id, action: "schliessen" })).toBe("error.notSubsidiary");
  });
});

describe("KI-Übernahmen und Spielstand (UEB-R36, UEB-R37)", () => {
  it("UEB-R37: KI-Konzerne kaufen nach 2005 andere Studios, nie den Spieler", () => {
    const data = testData();
    data.acquisitions.ai.chancePerQuarterBp = 10000;
    data.acquisitions.ai.cashFactorBp = 0;
    let s = bigFirm(data, 2010, 3);
    for (let i = 0; i < 26; i++) s = tick(s, data);
    expect(liveStudios(s).some((x) => x.parent && x.parent.ownerId !== 0)).toBe(true);
  });

  it("Migration 53 → 54 legt leere Übernahmen an", () => {
    const data = testData();
    const s = neutralGame(data) as unknown as Record<string, unknown>;
    delete s.acquisitions;
    s.schemaVersion = 53;
    const m = migrateState(s as never);
    expect(m.acquisitions).toEqual({ deals: [], nextDealId: 1, targets: {}, aiOverreach: 0 });
  });
});

describe("Meilensteine 6b (ZIE-R02)", () => {
  it("erste Übernahme und Integration ohne Abwanderung", () => {
    const data = testData();
    const s = bigFirm(data);
    goalStep(s, data);
    expect(s.milestones["ersteUebernahme"]).toBeUndefined();
    const sub = becomeSubsidiary(s, data, target(s), 0, 1_000_000, 0, []);
    sub.leftCount = 1;
    sub.integration.progressBp = 10000;
    goalStep(s, data);
    expect(s.milestones["ersteUebernahme"]).toBeDefined();
    expect(s.milestones["integration"]).toBeUndefined();
    sub.leftCount = 0;
    goalStep(s, data);
    expect(s.milestones["integration"]).toBeDefined();
  });
});
