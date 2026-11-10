// Anzeigemodell des Markenmarkts (S04 Abschnitt 13): eigene Marken mit Angeboten und Lizenznehmern, Angebote im Markt,
// eigene Lizenzen fremder Marken (LIZ-M09) und die Fokus-Karten Markenanfrage und Konkursmasse.
import { type Bp, BP_ONE, type Cent } from "../num";
import type { BrandForm, BrandTemplate, GameData, GameEvent, GameState } from "../model/types";
import {
  NO_OWNER, ownerName, PLAYER, salePrice, validateOfferBrand, validateTakeOffer,
} from "../systems/markenmarkt";
import { brandById, brandStrength, isEstablished } from "../systems/marken";

export interface BrandOfferView {
  id: number;
  brandId: number;
  brand: string;
  owner: string;
  form: BrandForm;
  template: BrandTemplate;
  genres: string[];
  years: number;
  gamesMax: number;
  flatCent: Cent;
  royaltyBp: Bp;
  minScoreBp: Bp;
  priceCent: Cent;
  weeksLeft: number;
  fans: number;
  strengthBp: Bp;
  /** Fehlerschlüssel, warum der Spieler nicht zugreifen kann (null = möglich). */
  blocked: string | null;
}

export interface BrandLicenseView {
  id: number;
  brandId: number;
  brand: string;
  partner: string;
  genres: string[];
  gamesMade: number;
  gamesAllowed: number;
  weeksLeft: number;
  royaltyBp: Bp;
  minScoreBp: Bp;
  incomeCent: Cent;
}

export interface OwnBrandMarketView {
  id: number;
  name: string;
  /** LIZ-MF3: Richtwert für den Komplettverkauf. */
  valueCent: Cent;
  offers: BrandOfferView[];
  licensees: BrandLicenseView[];
  blocked: Record<BrandForm, string | null>;
}

export interface BrandMarketView {
  unlocked: boolean;
  fromYear: number;
  templates: BrandTemplate[];
  own: OwnBrandMarketView[];
  market: BrandOfferView[];
  /** Lizenzen des Spielers an fremden Marken (für „Neues Spiel“). */
  licenses: BrandLicenseView[];
  /** Prüfung Fable 03.11.2026: Genres der eigenen Spiele; das Regal zeigt passende Angebote zuerst. */
  ownGenres: string[];
}

function partnerName(state: GameState, id: number): string {
  if (id === NO_OWNER) return "";
  return ownerName(state, id);
}

function offerView(state: GameState, data: GameData, o: GameState["brandMarket"]["offers"][number]): BrandOfferView {
  const b = brandById(state, o.brandId);
  return {
    id: o.id, brandId: o.brandId, brand: b?.name ?? "?", owner: partnerName(state, o.ownerId), form: o.form, template: o.template, genres: o.genres,
    years: o.years, gamesMax: o.gamesMax, flatCent: o.flatCent, royaltyBp: o.royaltyBp, minScoreBp: o.minScoreBp, priceCent: o.priceCent,
    weeksLeft: o.validUntilWeek - state.week, fans: b ? Object.values(b.fans).reduce((s, v) => s + v, 0) : 0,
    strengthBp: b ? brandStrength(data, b) : 0, blocked: o.ownerId === PLAYER ? "error.ownOffer" : validateTakeOffer(state, data, o.id),
  };
}

function licenseView(state: GameState, l: GameState["brandMarket"]["licenses"][number], partnerId: number): BrandLicenseView {
  return {
    id: l.id, brandId: l.brandId, brand: brandById(state, l.brandId)?.name ?? "?", partner: partnerName(state, partnerId), genres: l.genres,
    gamesMade: l.gamesMade, gamesAllowed: l.gamesAllowed, weeksLeft: Math.max(0, l.endWeek - state.week), royaltyBp: l.royaltyBp,
    minScoreBp: l.minScoreBp, incomeCent: l.incomeCent,
  };
}

export function brandMarketView(state: GameState, data: GameData): BrandMarketView {
  const bm = state.brandMarket;
  const offers = [...bm.offers].sort((a, b) => a.id - b.id);
  const active = bm.licenses.filter((l) => l.status === "aktiv").sort((a, b) => a.id - b.id);
  return {
    unlocked: bm.unlocked, fromYear: data.brandMarket.fromYear, templates: Object.keys(data.brandMarket.templates).sort() as BrandTemplate[],
    own: state.brands.filter((b) => b.ownerId === PLAYER && b.titles.length > 0 && isEstablished(state, data, b)).sort((a, b) => a.id - b.id).map((b) => ({
      id: b.id, name: b.name, valueCent: salePrice(state, data, b),
      offers: offers.filter((o) => o.brandId === b.id).map((o) => offerView(state, data, o)),
      licensees: active.filter((l) => l.brandId === b.id && l.ownerId === PLAYER).map((l) => licenseView(state, l, l.licenseeId)),
      blocked: {
        lizenzspiel: validateOfferBrand(state, data, { type: "offerBrand", brandId: b.id, form: "lizenzspiel", template: "offen", genre: null, priceFactorBp: BP_ONE }),
        komplettverkauf: validateOfferBrand(state, data, { type: "offerBrand", brandId: b.id, form: "komplettverkauf", template: "offen", genre: null, priceFactorBp: BP_ONE }),
      },
    })),
    market: offers.filter((o) => o.ownerId !== PLAYER).map((o) => offerView(state, data, o)),
    licenses: active.filter((l) => l.licenseeId === PLAYER).map((l) => licenseView(state, l, l.ownerId)),
    ownGenres: [...new Set(state.projects.filter((p) => p.result !== null).map((p) => p.genre))].sort(),
  };
}

export interface BrandDealView {
  brand: string;
  studio: string;
  priceCent: Cent;
  aiBidCent: Cent;
  template: BrandTemplate | null;
  royaltyBp: Bp;
  genres: string[];
}

/** Fokus-Karten „Markenanfrage“ (LIZ-M18) und „Konkursmasse“ (MRK-R65). */
export function brandDealView(state: GameState, e: GameEvent): BrandDealView | undefined {
  const d = e.brandDeal;
  if (!d) return undefined;
  const o = d.offerId === null ? undefined : state.brandMarket.offers.find((x) => x.id === d.offerId);
  return {
    brand: brandById(state, d.brandId)?.name ?? "?", studio: state.ai.studios.find((s) => s.id === d.studioId)?.name ?? "?",
    priceCent: d.priceCent, aiBidCent: d.aiBidCent, template: o?.template ?? null, royaltyBp: o?.royaltyBp ?? 0, genres: o?.genres ?? [],
  };
}
