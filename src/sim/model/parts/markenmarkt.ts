// Markenmarkt (S04 Abschnitt 13, S08 MRK-R65 ff.).
// Teil von src/sim/model/types.ts (Prüfung Fable 03.11.2026: Aufteilung nach System); Importe immer über „../model/types“.
import type { Bp, Cent } from "../../num";

// ---------- Markenmarkt (S04 Abschnitt 13, LIZ-M01 ff.; S08 MRK-R65, MRK-R66, MRK-R69) ----------

export type BrandTemplate = "offen" | "genreExklusiv" | "premium";
export type BrandForm = "lizenzspiel" | "komplettverkauf";

/** S11 UI-R70, 8.3: Bühne mit Figuren und Requisiten (data/base/stage/config.json). */
export interface StageParams {
  maxFigures: number;
  tiredBurnoutBp: Bp;
  happyMoraleBp: Bp;
  hitWeeks: number;
  oldHardwareBp: Bp;
  /** Lager mit Kisten, wenn der Bestand mehr als dieser Anteil der Erstauflage ist (Überauflage). */
  boxesStockShareBp: Bp;
  epochs: { id: string; from: number }[];
}

export interface BrandMarketParams {
  fromYear: number;
  buyRateBp: Bp;
  transferBp: { same: Bp; near: Bp; far: Bp };
  yearsFactorBp: Bp[];
  saleYearsFactorBp: Bp;
  depthBonusBp: Bp;
  templates: Record<BrandTemplate, { royaltyFactorBp: Bp; flatBp: Bp; minScoreBp: Bp; autoAccept: boolean; minTransferBp: Bp }>;
  royaltyBaseBp: Bp;
  royaltySpanBp: Bp;
  royaltyMaxBp: Bp;
  refUnits: number;
  licenseYears: number;
  gamesMax: number;
  maxActiveLicenses: number;
  penaltyFlatTimes: number;
  weakScoreBp: Bp;
  weakExtraFatigueBp: Bp;
  autoAcceptReputation: number;
  offerWeeks: number;
  aiOfferRestYears: number;
  aiOfferCashMonths: number;
  aiExperienceMinBp: Bp;
  aiBuyMaxValueBp: Bp;
  aiBuyCashMonths: number;
  indieChancePerYearBp: Bp;
  /** ANNAHME (3.12): Wie oft andere Archetypen im Jahr nach Marken fragen (sonst entstehen Hunderte Lizenzen). */
  aiDemandChancePerYearBp: Bp;
  factoryArchetypes: string[];
  buyerArchetypes: string[];
  grudgeBp: Bp;
  aiBrandFromScoreBp: Bp;
  auction: { startFactorBp: Bp; biddersMin: number; biddersMax: number; aiMaxCashBp: Bp; winStepBp: Bp; unsoldDiscountBp: Bp; unsoldOfferWeeks: number };
  names: string[];
}

/** LIZ-M04, LIZ-M14: Angebot in der Markenbörse. */
export interface BrandOffer {
  id: number;
  brandId: number;
  ownerId: number;
  form: BrandForm;
  template: BrandTemplate;
  genres: string[];
  years: number;
  gamesMax: number;
  flatCent: Cent;
  royaltyBp: Bp;
  minScoreBp: Bp;
  priceCent: Cent;
  validUntilWeek: number;
}

export interface BrandLicense {
  id: number;
  brandId: number;
  ownerId: number;
  licenseeId: number;
  genres: string[];
  startWeek: number;
  endWeek: number;
  gamesAllowed: number;
  gamesMade: number;
  flatCent: Cent;
  royaltyBp: Bp;
  minScoreBp: Bp;
  incomeCent: Cent;
  status: "aktiv" | "abgelaufen" | "entzogen";
}

export interface BrandMarketState {
  offers: BrandOffer[];
  licenses: BrandLicense[];
  nextOfferId: number;
  nextLicenseId: number;
  /** LIZ-M01: Reiter „Marken“ sichtbar. */
  unlocked: boolean;
}
