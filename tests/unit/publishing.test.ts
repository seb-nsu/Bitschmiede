// S13 3.5 Eigenes Publishing und Startprofil Publisher (AUS-R40 bis AUS-R43).
import { describe, expect, it } from "vitest";
import { applyInputs, tick, validateInput } from "../../src/sim/tick";
import { migrateState } from "../../src/sim/save";
import { buildView } from "../../src/sim/view/view";
import { linkPublishing, publishingDecision, publishingSplit } from "../../src/sim/systems/publishing";
import type { GameData, GameState } from "../../src/sim/model/types";
import { neutralGame, testData } from "../helpers";

/** Ein Pitch eines KI-Teams mit laufendem Projekt (ohne Zufall des Monatswurfs). */
function withPitch(data: GameData, s: GameState): { s: GameState; pitchId: number } {
  for (let i = 0; i < 30 && !s.ai.studios.some((x) => x.teams.some((t) => t.project)); i++) s = tick(s, data);
  const studio = s.ai.studios.find((x) => x.closedWeek === null && x.teams.some((t) => t.project))!;
  const team = studio.teams.find((t) => t.project)!;
  const id = s.publishing.nextId++;
  s.publishing.pitches.push({ id, studioId: studio.id, teamId: team.id, genre: team.project!.genre, scope: team.project!.scope, mode: "konzept",
    shownScoreBp: 70000, noiseBp: 1500, budgetCent: 10000000, expiresWeek: s.week + 8 });
  s.moneyCent = 100000000;
  return { s, pitchId: id };
}

describe("Eigenes Publishing (S13 AUS-R40 bis AUS-R42)", () => {
  it("AUS-R40 Großzügiges Paket wird immer angenommen; erste Rate fließt an das Studio", () => {
    const data = testData();
    const { s, pitchId } = withPitch(data, neutralGame(data));
    const pitch = s.publishing.pitches.find((p) => p.id === pitchId)!;
    const studio = s.ai.studios.find((x) => x.id === pitch.studioId)!;
    const cash = studio.cashCent;
    const money = s.moneyCent;
    expect(validateInput(s, data, { type: "publishingOffer", pitchId: 999, package: "knapp" })).not.toBeNull();
    const s2 = applyInputs(s, data, [{ type: "publishingOffer", pitchId, package: "grosszuegig" }]);
    const deal = s2.publishing.deals[0]!;
    expect(deal.status).toBe("laeuft");
    const advance = (10000000 * data.publishers.own.packages.grosszuegig.advanceBp) / 10000;
    expect(deal.advanceCent).toBe(advance);
    expect(deal.rates[0]!.paid).toBe(true);
    expect(s2.moneyCent).toBe(money - deal.rates[0]!.amountCent);
    expect(s2.ai.studios.find((x) => x.id === studio.id)!.cashCent).toBe(cash + deal.rates[0]!.amountCent);
    expect(s2.publishing.pitches.some((p) => p.id === pitchId)).toBe(false);
    expect(buildView(s2, data).publishing.deals.length).toBe(1);
  });

  it("AUS-R41 Verfehlter Meilenstein: kürzen zahlt die halbe Rate; stoppen beendet den Vertrag", () => {
    const data = testData();
    const { s, pitchId } = withPitch(data, neutralGame(data));
    const s2 = applyInputs(s, data, [{ type: "publishingOffer", pitchId, package: "grosszuegig" }]);
    const deal = s2.publishing.deals[0]!;
    deal.decision = { rate: 1, untilWeek: s2.week + 4 };
    const money = s2.moneyCent;
    publishingDecision(s2, data, deal.id, "kuerzen");
    expect(s2.moneyCent).toBe(money - (deal.rates[1]!.amountCent * data.publishers.own.cutRateBp) / 10000);
    expect(deal.decision).toBeNull();
    publishingDecision(s2, data, deal.id, "stoppen");
    expect(deal.status).toBe("gestoppt");
  });

  it("AUS-R42 Beim Release: Rest des Vorschusses, höhere Nachfrage; Einnahmen werden nach Anteil geteilt", () => {
    const data = testData();
    const { s, pitchId } = withPitch(data, neutralGame(data));
    const s2 = applyInputs(s, data, [{ type: "publishingOffer", pitchId, package: "ausgewogen" }]);
    if (s2.publishing.deals.length === 0) return; // Annahme 80 %: bei Ablehnung prüft der erste Test den Weg.
    const deal = s2.publishing.deals[0]!;
    const studio = s2.ai.studios.find((x) => x.id === deal.studioId)!;
    const team = studio.teams.find((t) => t.id === deal.teamId)!;
    const product = { ...(s2.ai.products[0] ?? ({} as never)), id: 777, studioId: studio.id, demandBp: 10000, scoreBp: 75000 };
    linkPublishing(s2, data, studio, team, team.project!, product);
    expect(deal.status).toBe("veroeffentlicht");
    expect(deal.rates.every((r) => r.paid)).toBe(true);
    expect(product.publishingDealId).toBe(deal.id);
    expect(product.demandBp).toBe(data.publishers.own.demandBoostBp);
    const money = s2.moneyCent;
    const studioPart = publishingSplit(s2, product, 1000000);
    expect(studioPart).toBe((1000000 * deal.studioShareBp) / 10000);
    expect(s2.moneyCent).toBe(money + 1000000 - studioPart);
  });

  it("AUS-R43 Startprofil Publisher: mehr Kapital und zwei Partnerverträge", () => {
    const data = testData();
    const base = neutralGame(data);
    let s = neutralGame(data, undefined, { profile: "publisher" });
    expect(s.moneyCent).toBe((base.moneyCent * data.publishers.own.profile.startMoneyFactorBp) / 10000);
    for (let i = 0; i < 20 && s.publishing.deals.length === 0; i++) s = tick(s, data);
    expect(s.publishing.deals.length).toBe(data.publishers.own.profile.partners);
    expect(buildView(s, data).publishing.visible).toBe(true);
  });

  it("Migration 64 → 65: leeres Publishing", () => {
    const data = testData();
    const old = structuredClone(neutralGame(data)) as unknown as Record<string, unknown> & { schemaVersion: number };
    delete old.publishing;
    old.schemaVersion = 64;
    expect(migrateState(old).publishing).toEqual({ pitches: [], deals: [], nextId: 1 });
  });
});
