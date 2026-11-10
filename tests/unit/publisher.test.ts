// Teilschritte 6a.4 und 6a.5: Publisher-Verträge (S07 FRM-R42 bis FRM-R47, Tabelle 5.8).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { migrateState } from "../../src/sim/save";
import { concessionOf, dealStep, pitchInterest, publisherSplit, termRoom } from "../../src/sim/systems/publisher";
import type { GameData, GameState, Project, PublisherDeal } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, testData } from "../helpers";

function running(data: GameData): { s: GameState; p: Project } {
  let s = tick(neutralGame(data), data, [input()]);
  s.unlocks.publisher = s.week;
  // Das Testprojekt im Konzept hat eine schwache Prognose; mit niedriger Schwelle haben alle Publisher Interesse.
  if (data.publishers.interestThresholdBp === 3000) data.publishers.interestThresholdBp = 500;
  s.studioReputationBp = 10000;
  s = structuredClone(s);
  return { s, p: lastProject(s) };
}

function richPublishers(s: GameState): void {
  for (const pub of s.publishers) pub.capitalCent = 1e12;
}

describe("Publisher im Markt (Tabelle 5.8)", () => {
  it("FRM-T27: 1980 gibt es 3 Publisher mit Startruf 40–70", () => {
    const data = testData();
    const s = tick(neutralGame(data), data);
    expect(s.publishers).toHaveLength(3);
    for (const p of s.publishers) {
      expect(p.reputationBp).toBeGreaterThanOrEqual(4000);
      expect(p.reputationBp).toBeLessThanOrEqual(7000);
    }
  });

  it("FRM-T27: unter der Interesse-Schwelle von 3.000 bp gibt es nur Absagen", () => {
    const data = testData();
    data.publishers.interestThresholdBp = 20000;
    const { s, p } = running(data);
    richPublishers(s);
    const next = tick(s, data, [{ type: "pitchPublisher", projectId: p.id, mode: "konzept" }]);
    expect(next.publisherOffers).toHaveLength(0);
    expect(next.log.filter((l) => l.key === "log.publisherDeclined")).toHaveLength(3);
  });
});

describe("Pitch und Verhandlung (FRM-R42 bis FRM-R44)", () => {
  it("FRM-R42: bis zu drei Angebote; Vertical Slice erst ab der Produktion und stärker als das Konzept", () => {
    const data = testData();
    const { s, p } = running(data);
    richPublishers(s);
    expect(validateInput(s, data, { type: "pitchPublisher", projectId: p.id, mode: "slice" })).toBe("error.noSlice");
    expect(pitchInterest(s, data, p, "slice")).toBeGreaterThan(pitchInterest(s, data, p, "konzept"));
    const next = tick(s, data, [{ type: "pitchPublisher", projectId: p.id, mode: "konzept" }]);
    expect(next.publisherOffers.length).toBeGreaterThanOrEqual(1);
    expect(next.publisherOffers.length).toBeLessThanOrEqual(3);
    expect(validateInput(next, data, { type: "pitchPublisher", projectId: p.id, mode: "konzept" })).toBe("error.alreadyPitched");
  });

  it("FRM-R43: Startangebot nach Persönlichkeit; der Spielraum hängt an den übrigen Forderungen", () => {
    const data = testData();
    const { s, p } = running(data);
    richPublishers(s);
    const next = tick(s, data, [{ type: "pitchPublisher", projectId: p.id, mode: "konzept" }]);
    const o = next.publisherOffers[0]!;
    const pub = next.publishers.find((x) => x.id === o.publisherId)!;
    const pers = data.publishers.personalities[pub.personality];
    expect(o.terms.advanceBp).toBe(pers.advanceBp ?? data.publishers.defaults.advanceBp);
    const room = termRoom(data, o);
    // Wer beim Split mehr will, hat beim Vorschuss weniger Luft.
    const pushed = { ...o, terms: { ...o.terms, splitBeforeBp: room.splitBeforeBp[1] } };
    expect(termRoom(data, pushed).advanceBp[1]).toBeLessThanOrEqual(room.advanceBp[1]);
    // Weniger Vorschuss schafft Spielraum (Zugeständnis negativ).
    expect(concessionOf(data, o.base, { ...o.base, advanceBp: data.publishers.ranges.advanceBp[0] })).toBeLessThan(0);
  });

  it("FRM-R44: Forderung über dem Spielraum kostet Geduld; bei 0 zieht der Publisher zurück", () => {
    const data = testData();
    const { s, p } = running(data);
    richPublishers(s);
    let next = tick(s, data, [{ type: "pitchPublisher", projectId: p.id, mode: "konzept" }]);
    const o = next.publisherOffers[0]!;
    const greedy = { advanceBp: 13000, splitBeforeBp: 3500, splitAfterBp: 7000, markupBp: 0, termYears: 3 };
    expect(concessionOf(data, o.base, { ...o.terms, ...greedy })).toBeGreaterThan(o.capacityBp);
    for (let i = 0; i < o.patience; i++) next = tick(next, data, [{ type: "publisherOffer", offerId: o.id, action: "fordern", terms: greedy }]);
    expect(next.publisherOffers.some((x) => x.id === o.id)).toBe(false);
    expect(next.log.some((l) => l.key === "log.publisherWithdrew")).toBe(true);
  });

  it("FRM-R44: Forderung im Spielraum gilt; Annehmen zahlt die erste Rate und setzt IP und Sequel-Option", () => {
    const data = testData();
    const { s, p } = running(data);
    richPublishers(s);
    let next = tick(s, data, [{ type: "pitchPublisher", projectId: p.id, mode: "konzept" }]);
    const o = next.publisherOffers[0]!;
    const room = termRoom(data, o);
    next = tick(next, data, [{ type: "publisherOffer", offerId: o.id, action: "fordern", terms: { advanceBp: room.advanceBp[1] } }]);
    expect(next.publisherOffers.find((x) => x.id === o.id)!.terms.advanceBp).toBe(room.advanceBp[1]);
    const money = next.moneyCent;
    next = tick(next, data, [{ type: "publisherOffer", offerId: o.id, action: "annehmen" }]);
    const deal = next.projects.find((x) => x.id === p.id)!.publisherDeal!;
    expect(deal.paidCent).toBeGreaterThan(0);
    expect(deal.rates[0]!.paid).toBe(true);
    expect(next.publisherOffers).toHaveLength(0);
    expect(next.moneyCent - money).toBeGreaterThan(deal.paidCent - money);
    const brand = next.brands.find((b) => b.id === p.brandId);
    if (brand && deal.terms.ipPublisher) expect(brand.publisherId).toBe(deal.publisherId);
  });
});

function fakeDeal(over: Partial<PublisherDeal> = {}): PublisherDeal {
  return {
    publisherId: 1, signedWeek: 0, budgetCent: 100000000, advanceCent: 100000000, paidCent: 100000000,
    terms: { advanceBp: 10000, splitBeforeBp: 2000, splitAfterBp: 5000, markupBp: 0, termYears: 5, ipPublisher: true, sequelOption: true },
    rates: [], recoupedCent: 0, publisherIncomeCent: 0, misses: 0, stopped: false, endWeek: null, ...over,
  };
}

describe("Vertrag (FRM-R45 bis FRM-R47)", () => {
  it("FRM-T10: Vorschuss 1 Mio., 20 % vor Recoup, 3 Mio. Erlös → 250.000 vor und 875.000 nach dem Recoup", () => {
    const data = testData();
    const s = tick(neutralGame(data), data);
    const p = { publisherDeal: fakeDeal() } as Project;
    let own = 0;
    for (let i = 0; i < 30; i++) own += publisherSplit(s, p, 10000000);
    expect(p.publisherDeal!.recoupedCent).toBe(100000000);
    expect(own).toBe(25000000 + 87500000);
  });

  it("FRM-R45: nach der Laufzeit bleibt alles beim Studio", () => {
    const data = testData();
    const s = tick(neutralGame(data), data);
    const p = { publisherDeal: fakeDeal({ endWeek: s.week }) } as Project;
    expect(publisherSplit(s, p, 1000)).toBe(1000);
  });

  it("FRM-R46, FRM-T11: verfehlte Meilensteine führen immer zu einer Reaktion, beim zweiten Mal Stopp oder Auflagen", () => {
    const data = testData();
    const { s, p } = running(data);
    const pub = s.publishers[0]!;
    for (const personality of ["grosszuegig", "markenfreundlich", "ausgewogen"] as const) {
      const st = structuredClone(s);
      st.publishers[0]!.personality = personality;
      const proj = st.projects.find((x) => x.id === p.id)!;
      proj.publisherDeal = fakeDeal({
        publisherId: pub.id,
        rates: [
          { phase: "preprod", untilBp: 9000, dueWeek: st.week - 10, amountCent: 1000, paid: false, missed: false, cutBp: 0 },
          { phase: "produktion", untilBp: 9500, dueWeek: st.week - 10, amountCent: 1000, paid: false, missed: false, cutBp: 0 },
        ],
      });
      dealStep(st, data);
      const d = proj.publisherDeal;
      expect(d.misses).toBe(2);
      if (personality === "ausgewogen") expect(d.stopped).toBe(false);
      else expect(d.stopped).toBe(true);
      const reactions = st.log.filter((l) => ["log.publisherCut", "log.publisherCondition", "log.publisherStopped"].includes(l.key));
      expect(reactions).toHaveLength(2);
    }
  });

  it("FRM-R47: Abbruch fragt nach Rückzahlung oder Übergabe; Rückzahlung kostet den erhaltenen Vorschuss", () => {
    const data = testData();
    const { s, p } = running(data);
    const proj = s.projects.find((x) => x.id === p.id)!;
    proj.publisherDeal = fakeDeal({ publisherId: s.publishers[0]!.id, paidCent: 500000 });
    let next = tick(s, data, [{ type: "cancelProject", projectId: p.id }]);
    const e = next.events.find((x) => x.kind === "publisherAbbruch")!;
    expect(e.options).toEqual(["zurueckzahlen", "abgeben"]);
    const money = next.moneyCent;
    const repaid = tick(next, data, [{ type: "decide", eventId: e.id, option: "zurueckzahlen" }]);
    expect(money - repaid.moneyCent).toBeGreaterThanOrEqual(500000);
    next = tick(next, data, [{ type: "decide", eventId: e.id, option: "abgeben" }]);
    expect(next.brands.find((b) => b.id === p.brandId)?.publisherId).toBe(s.publishers[0]!.id);
  });

  it("Spielstand 48 → 49: keine Publisher bis zum Jahreswechsel", () => {
    const data = testData();
    const old = structuredClone(neutralGame(data)) as unknown as Record<string, unknown>;
    old.schemaVersion = 48;
    delete old.publishers;
    delete old.publisherOffers;
    delete old.nextPublisherId;
    const m = migrateState(old as never);
    expect(m.publishers).toEqual([]);
    expect(m.nextPublisherId).toBe(1);
  });
});
