// Teilschritt 3.10: Markenmarkt (S04 Abschnitt 13, LIZ-M01 bis LIZ-M29; S08 MRK-R65, MRK-R66).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import {
  aiBrandSales, brandMarketStep, brandValue, onLicensedRelease, onStudioClosed, PLAYER, proposeTerms, salePrice, takeOffer, usableLicense,
  payBrandRoyalty, NO_OWNER,
} from "../../src/sim/systems/markenmarkt";
import { newBrand } from "../../src/sim/systems/marken";
import { netPerUnit } from "../../src/sim/systems/markt";
import { generateWorld, liveStudios } from "../../src/sim/systems/ki/studios";
import { applyDecision } from "../../src/sim/systems/ereignisse";
import { input, neutralGame, testData } from "../helpers";
import type { Brand, GameData, GameState } from "../../src/sim/model/types";

function game(data: GameData, year = 1986): GameState {
  const s = neutralGame(data);
  s.moneyCent = 1e12;
  // Eine Woche nach Jahresbeginn, damit die jährliche Ausschüttung der KI das Testkapital nicht kappt.
  s.week = (year - s.startYear) * 52 + 1;
  s.office.hardware.year = year;
  s.office.upgradeOfferYear = year;
  generateWorld(s, data);
  for (const st of s.ai.studios) st.cashCent = 1e12;
  return s;
}

function brand(s: GameState, data: GameData, fans = 1_000_000, genre = "action"): Brand {
  const b = newBrand(s, data, "Testmarke");
  b.fans[genre] = fans;
  b.titles.push(999);
  b.firstTitleWeek = s.week - 52;
  b.lastTitleWeek = s.week - 52;
  return b;
}

function open(s: GameState, data: GameData): void {
  if (!s.brands.some((b) => b.ownerId === PLAYER && b.titles.length > 0)) brand(s, data, 1000, "strategie");
  brandMarketStep(s, data);
  expect(s.brandMarket.unlocked).toBe(true);
}

describe("Formeln (LIZ-MF1, LIZ-MF2, LIZ-MF3)", () => {
  it("LIZ-MT01 W = Fans · Kaufquote · Preis · (1 − Müdigkeit) · R(2)", () => {
    const data = testData();
    const s = game(data);
    const b = brand(s, data);
    b.fatigueBp = 3000;
    const net = netPerUnit(s, data);
    // 1.000.000 · 0,25 · 0,7 = 175.000 Stück; R(2) = 0,9.
    expect(brandValue(s, data, b, ["action"], 9000)).toBe(Math.floor(175_000 * net * 9000 / 10000));
  });

  it("LIZ-MT02 q = W / (W + U_ref · R) = 4.117 bp; Royalty offen 1.117 bp, Premium 1.563 bp", () => {
    const data = testData();
    const s = game(data);
    const b = brand(s, data);
    b.fatigueBp = 3000;
    // U_ref · R soll zu W im Verhältnis 9 : 6,3 stehen: 175.000 Fan-Stück zu 250.000 Referenzstück.
    data.brandMarket.refUnits = 250_000;
    const offen = proposeTerms(s, data, b, "offen", ["action"], 2);
    const premium = proposeTerms(s, data, b, "premium", ["action"], 2);
    expect(offen.royaltyBp).toBe(1117);
    expect(premium.royaltyBp).toBe(1563);
  });

  it("LIZ-MT10 Konkurs: die Auktion startet bei 40 % des Markenwerts", () => {
    const data = testData();
    const s = game(data);
    const b = brand(s, data);
    expect(salePrice(s, data, b, data.brandMarket.auction.startFactorBp)).toBe(Math.floor(salePrice(s, data, b) * 4000 / 10000));
  });
});

describe("Freischaltung und Angebote (LIZ-M01, LIZ-M17, LIZ-M18)", () => {
  it("LIZ-MT09 vor 1985 oder ohne Marke mit Titel bleibt der Markenmarkt zu; 1986 mit Titel öffnet er", () => {
    const data = testData();
    const early = game(data, 1983);
    brand(early, data);
    brandMarketStep(early, data);
    expect(early.brandMarket.unlocked).toBe(false);
    const late = game(data, 1986);
    newBrand(late, data, "Ohne Titel");
    brandMarketStep(late, data);
    expect(late.brandMarket.unlocked).toBe(false);
    brand(late, data);
    brandMarketStep(late, data);
    expect(late.brandMarket.unlocked).toBe(true);
    expect(validateInput(game(data, 1983), data, { type: "offerBrand", brandId: 1, form: "lizenzspiel", template: "offen", genre: null, priceFactorBp: 10000 }))
      .toBe("error.brandMarketLocked");
  });

  it("LIZ-M17 Angebot einstellen, doppelt verboten, zurückziehen; Verkauf nur ohne laufendes Projekt (LIZ-M16)", () => {
    const data = testData();
    let s = game(data);
    const b = brand(s, data);
    open(s, data);
    const offer = { type: "offerBrand" as const, brandId: b.id, form: "lizenzspiel" as const, template: "offen" as const, genre: null, priceFactorBp: 10000 };
    s = tick(s, data, [offer]);
    expect(s.brandMarket.offers.filter((o) => o.ownerId === PLAYER)).toHaveLength(1);
    expect(validateInput(s, data, offer)).toBe("error.offerExists");
    expect(validateInput(s, data, { ...offer, priceFactorBp: 20000, form: "komplettverkauf" })).toBe("error.amount");
    s = tick(s, data, [input({ brandId: b.id })]);
    expect(validateInput(s, data, { ...offer, form: "komplettverkauf" })).toBe("error.brandInProduction");
    const id = s.brandMarket.offers.find((o) => o.ownerId === PLAYER)!.id;
    s = tick(s, data, [{ type: "withdrawBrandOffer", offerId: id }]);
    expect(s.brandMarket.offers.some((o) => o.ownerId === PLAYER)).toBe(false);
  });

  it("LIZ-M18 Ein KI-Studio mit Erfahrung im Genre nimmt „offen“ an; „Premium“ wird zur Fokus-Karte", () => {
    const data = testData();
    const s = game(data);
    const b = brand(s, data);
    open(s, data);
    data.brandMarket.indieChancePerYearBp = 10000;
    data.brandMarket.aiDemandChancePerYearBp = 10000;
    for (const st of s.ai.studios) {
      st.experienceGenre.action = 10000;
      st.lastScores = [80000];
      if (st.rival) st.rival.relationBp = 0;
    }
    let t = tick(structuredClone(s), data, [{ type: "offerBrand", brandId: b.id, form: "lizenzspiel", template: "premium", genre: null, priceFactorBp: 10000 }]);
    for (let i = 0; i < 14 && !t.events.some((e) => e.kind === "markenanfrage"); i++) t = tick(t, data);
    const card = t.events.find((e) => e.kind === "markenanfrage");
    expect(card).toBeDefined();
    applyDecision(t, data, card!, "annehmen");
    expect(t.brandMarket.licenses.some((l) => l.brandId === b.id && l.licenseeId === card!.brandDeal!.studioId)).toBe(true);

    let u = structuredClone(s);
    u = tick(u, data, [{ type: "offerBrand", brandId: b.id, form: "lizenzspiel", template: "offen", genre: null, priceFactorBp: 10000 }]);
    for (let i = 0; i < 16 && !u.brandMarket.licenses.some((l) => l.brandId === b.id); i++) u = tick(u, data);
    expect(u.brandMarket.licenses.some((l) => l.brandId === b.id && l.licenseeId !== PLAYER)).toBe(true);
  });
});

describe("Lizenzspiele (LIZ-M05, LIZ-M09, LIZ-M10, LIZ-M12)", () => {
  function foreign(s: GameState, data: GameData): { b: Brand; ownerId: number } {
    const owner = liveStudios(s)[0]!;
    const b = brand(s, data);
    b.ownerId = owner.id;
    if (owner.rival) owner.rival.relationBp = 0;
    return { b, ownerId: owner.id };
  }

  function license(s: GameState, data: GameData, b: Brand, minScoreBp = 70000): number {
    s.brandMarket.offers.push({
      id: s.brandMarket.nextOfferId++, brandId: b.id, ownerId: b.ownerId, form: "lizenzspiel", template: "offen", genres: ["action"], years: 3,
      gamesMax: 2, flatCent: 1_000_000, royaltyBp: 1000, minScoreBp, priceCent: 0, validUntilWeek: s.week + 26,
    });
    const id = s.brandMarket.offers[s.brandMarket.offers.length - 1]!.id;
    expect(validateInput(s, data, { type: "takeBrandOffer", offerId: id })).toBeNull();
    takeOffer(s, data, id, PLAYER);
    return s.brandMarket.licenses[s.brandMarket.licenses.length - 1]!.id;
  }

  it("LIZ-M09 fremde Marke nur mit Lizenz im Genre; das Projekt merkt sich die Lizenz", () => {
    const data = testData();
    let s = game(data);
    open(s, data);
    const { b } = foreign(s, data);
    expect(validateInput(s, data, input({ brandId: b.id }))).toBe("error.noBrandLicense");
    const id = license(s, data, b);
    expect(validateInput(s, data, input({ brandId: b.id, genre: "strategie" }))).toBe("error.noBrandLicense");
    expect(validateInput(s, data, input({ brandId: b.id }))).toBeNull();
    s = tick(s, data, [input({ brandId: b.id })]);
    expect(s.projects[s.projects.length - 1]!.brandLicenseId).toBe(id);
  });

  it("LIZ-MT03 Wertung 64 bei Mindestwertung 70: 2 × Pauschale, Lizenz entzogen, kein zweites Spiel", () => {
    const data = testData();
    const s = game(data);
    open(s, data);
    const { b, ownerId } = foreign(s, data);
    const id = license(s, data, b, 70000);
    const owner = s.ai.studios.find((x) => x.id === ownerId)!;
    const [money, cash] = [s.moneyCent, owner.cashCent];
    onLicensedRelease(s, data, id, 64000);
    const l = s.brandMarket.licenses.find((x) => x.id === id)!;
    expect(l.status).toBe("entzogen");
    expect(s.moneyCent).toBe(money - 2 * 1_000_000);
    expect(owner.cashCent).toBe(cash + 2 * 1_000_000);
    expect(usableLicense(s, PLAYER, b.id, "action")).toBeUndefined();
  });

  it("LIZ-MT05 Wertung 50: die Müdigkeit der Marke steigt zusätzlich um 0,10", () => {
    const data = testData();
    const s = game(data);
    open(s, data);
    const { b } = foreign(s, data);
    const id = license(s, data, b, 40000);
    b.fatigueBp = 2000;
    onLicensedRelease(s, data, id, 50000);
    expect(b.fatigueBp).toBe(3000);
  });

  it("LIZ-MT04 neue Fans eines Lizenzspiels landen bei der Marke des Inhabers", () => {
    const data = testData();
    const s = game(data);
    const { b } = foreign(s, data);
    const before = b.fans.action!;
    aiBrandSales(s, data, { brandId: b.id, genre: "action" } as never, 10_000);
    expect(b.fans.action).toBeGreaterThan(before);
  });

  it("LIZ-MT08 Komplettverkauf mit laufender Lizenz: Royalties fließen danach an den Käufer", () => {
    const data = testData();
    const s = game(data);
    open(s, data);
    const b = brand(s, data);
    const licensee = liveStudios(s)[0]!;
    const buyer = liveStudios(s)[1]!;
    s.brandMarket.licenses.push({
      id: 77, brandId: b.id, ownerId: PLAYER, licenseeId: licensee.id, genres: ["action"], startWeek: s.week, endWeek: s.week + 156,
      gamesAllowed: 2, gamesMade: 0, flatCent: 0, royaltyBp: 1000, minScoreBp: 60000, incomeCent: 0, status: "aktiv",
    });
    tick(s, data);
    const t = tick(s, data, [{ type: "offerBrand", brandId: b.id, form: "komplettverkauf", template: "offen", genre: null, priceFactorBp: 10000 }]);
    const offer = t.brandMarket.offers.find((o) => o.brandId === b.id)!;
    takeOffer(t, data, offer.id, buyer.id);
    expect(t.brands.find((x) => x.id === b.id)!.ownerId).toBe(buyer.id);
    const cash = t.ai.studios.find((x) => x.id === buyer.id)!.cashCent;
    const money = t.moneyCent;
    payBrandRoyalty(t, 77, 1_000_000);
    expect(t.ai.studios.find((x) => x.id === buyer.id)!.cashCent).toBe(cash + 100_000);
    expect(t.moneyCent).toBe(money);
  });

  it("LIZ-MT06 Groll: ein Rivale mit Beziehung −60 verhandelt nicht mit dem Spieler", () => {
    const data = testData();
    const s = game(data);
    open(s, data);
    const rival = s.ai.studios.find((x) => x.rival !== null)!;
    const b = brand(s, data);
    b.ownerId = rival.id;
    rival.rival!.relationBp = -6000;
    s.brandMarket.offers.push({
      id: 50, brandId: b.id, ownerId: rival.id, form: "lizenzspiel", template: "offen", genres: ["action"], years: 3, gamesMax: 2,
      flatCent: 1000, royaltyBp: 1000, minScoreBp: 60000, priceCent: 0, validUntilWeek: s.week + 26,
    });
    expect(validateInput(s, data, { type: "takeBrandOffer", offerId: 50 })).toBe("error.grudge");
  });
});

describe("Konkursmasse (MRK-R65, MRK-R66)", () => {
  it("MRK-T15 Pleite mit zwei Marken: zwei Karten mit einer Woche Frist; ohne Gebot geht die Marke an die KI oder in den Markt", () => {
    const data = testData();
    const s = game(data);
    open(s, data);
    const studio = liveStudios(s)[0]!;
    for (const name of ["A", "B"]) {
      const b = brand(s, data);
      b.name = name;
      b.ownerId = studio.id;
    }
    studio.closedWeek = s.week;
    onStudioClosed(s, data, studio);
    const cards = s.events.filter((e) => e.kind === "konkursmasse");
    expect(cards).toHaveLength(2);
    expect(cards.every((e) => e.deadlineWeek === s.week + 1)).toBe(true);
    for (const c of cards) {
      expect(s.brands.find((b) => b.id === c.brandDeal!.brandId)!.ownerId).toBe(NO_OWNER);
      applyDecision(s, data, c, "verzichten");
      const b = s.brands.find((x) => x.id === c.brandDeal!.brandId)!;
      const inMarket = s.brandMarket.offers.some((o) => o.brandId === b.id && o.form === "komplettverkauf");
      expect(b.ownerId !== NO_OWNER || inMarket).toBe(true);
    }
  });

  it("MRK-R65 Mitbieten: der Spieler zahlt den Zuschlag und besitzt die Marke", () => {
    const data = testData();
    const s = game(data);
    open(s, data);
    const studio = liveStudios(s)[0]!;
    const b = brand(s, data);
    b.ownerId = studio.id;
    studio.closedWeek = s.week;
    onStudioClosed(s, data, studio);
    const card = s.events.find((e) => e.kind === "konkursmasse")!;
    const money = s.moneyCent;
    applyDecision(s, data, card, "bieten");
    expect(b.ownerId).toBe(PLAYER);
    expect(s.moneyCent).toBe(money - card.brandDeal!.priceCent);
  });
});
