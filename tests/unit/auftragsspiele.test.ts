// Etappe 6c.3: Marktplatz der Auftragsspiele (FRM-R48, FRM-R49 erweitert).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { contractGameStep, drawOffer, settleContractGame } from "../../src/sim/systems/produkte/auftragsspiele";
import { migrateState } from "../../src/sim/save";
import { buildView } from "../../src/sim/view/view";
import { stream } from "../../src/sim/rng";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";
import type { ContractGameOffer, GameData, GameState } from "../../src/sim/model/types";

function withOffer(data: GameData): { s: GameState; o: ContractGameOffer } {
  const s = playProject(neutralGame(data), data, input());
  s.moneyCent = 1e10;
  const base = input();
  const o: ContractGameOffer = {
    id: s.contractGames.nextId++, client: "Nordlicht Verlag", genre: base.genre, theme: null, scope: "klein", platform: base.platforms[0]!,
    minScoreBp: 60000, weeks: 30, payCent: 5_000_000, advanceCent: 1_500_000, bonusCent: 1_250_000, penaltyCent: 1_000_000, expiresWeek: s.week + 10,
  };
  s.contractGames.offers.push(o);
  return { s, o };
}

describe("Auftragsspiele (Etappe 6c.3)", () => {
  it("FRM-R48 Nach dem ersten Release erscheinen Angebote mit Vorgaben, Mindestwertung, Frist und Bezahlung", () => {
    const data = testData();
    let s = playProject(neutralGame(data), data, input());
    for (let i = 0; i < 52 && s.contractGames.offers.length === 0; i++) s = tick(s, data);
    expect(s.contractGames.offers.length).toBeGreaterThan(0);
    const o = s.contractGames.offers[0]!;
    expect(o.minScoreBp % 5000).toBe(0);
    expect(o.payCent).toBeGreaterThan(o.advanceCent);
    expect(o.weeks).toBeGreaterThan(data.contractGames.polishWeeks);
    expect(buildView(s, data).contractGames.offers[0]!.client).toBe(o.client);
    // Ohne Release keine Angebote.
    const fresh = neutralGame(data);
    contractGameStep(fresh, data);
    expect(fresh.contractGames.offers).toHaveLength(0);
    expect(drawOffer(fresh, data, stream(fresh, "auftragsspiele"))).not.toBeNull();
  });

  it("FRM-R49 Vorgaben müssen stimmen; Annahme mit Projektstart zahlt den Vorschuss, ohne eigene Marke", () => {
    const data = testData();
    const { s, o } = withOffer(data);
    expect(validateInput(s, data, input({ contractOfferId: o.id, scope: "mittel", features: ["grosseSprites", "levelVielfalt", "titelmelodie", "einfacheSteuerung", "farbgrafik"] }))).toBe("error.contractGameSpec");
    expect(validateInput(s, data, input({ contractOfferId: 999 }))).toBe("error.unknownOffer");
    expect(validateInput(s, data, input({ contractOfferId: o.id, title: "Auftrag" }))).toBeNull();
    const brands = s.brands.length;
    const money = s.moneyCent;
    const x = tick(s, data, [input({ contractOfferId: o.id, title: "Auftrag" })]);
    const p = lastProject(x);
    expect(p.contractGame!.status).toBe("laeuft");
    expect(p.brandId).toBeNull();
    expect(x.brands.length).toBe(brands);
    expect(x.contractGames.offers.some((y) => y.id === o.id)).toBe(false);
    expect(x.moneyCent - money).toBeGreaterThan(o.advanceCent - 2_000_000);
  });

  it("FRM-R49 Abgabe: Rest ab Mindestwertung, Bonus ab +1,0, sonst Strafe", () => {
    const data = testData();
    const { s, o } = withOffer(data);
    const x = tick(s, data, [input({ contractOfferId: o.id, title: "Auftrag" })]);
    const p = lastProject(x);
    const before = x.moneyCent;
    settleContractGame(x, data, p, 65000);
    expect(p.contractGame!.status).toBe("erfuellt");
    expect(x.moneyCent - before).toBe(o.payCent - o.advanceCent);
    p.contractGame!.status = "laeuft";
    settleContractGame(x, data, p, 70000);
    expect(p.contractGame!.status).toBe("bonus");
    p.contractGame!.status = "laeuft";
    const b2 = x.moneyCent;
    settleContractGame(x, data, p, 55000);
    expect(p.contractGame!.status).toBe("verfehlt");
    expect(x.moneyCent - b2).toBe(-o.penaltyCent);
  });

  it("TEC-R44 Migration 56 → 57 legt den leeren Marktplatz an", () => {
    const data = testData();
    const old = { ...neutralGame(data), schemaVersion: 56 } as unknown as Record<string, unknown>;
    delete old.contractGames;
    const m = migrateState(old as never);
    expect(m.contractGames.offers).toEqual([]);
  });
});
