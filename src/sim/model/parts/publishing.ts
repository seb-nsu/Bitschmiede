// S13 3.5 Eigenes Publishing und Startprofil Publisher (AUS-R40 bis AUS-R43, Ausbaustufe 1.3; Prüfung Fable 03.11.2026: „passend“).
// Teil von src/sim/model/types.ts (Prüfung Fable 03.11.2026: Aufteilung nach System); Importe immer über „../model/types“.
import type { Bp, Cent } from "../../num";
import type { Scope } from "./grundlagen";

/** ANNAHME (statt des vollen Verhandlungstischs): drei Pakete aus Vorschuss und Anteil des Studios. */
export type PublishingPackage = "knapp" | "ausgewogen" | "grosszuegig";

export interface OwnPublishingParams {
  /** Ab diesem Jahr, mit so vielen eigenen Releases (Profil Publisher: sofort). */
  fromYear: number;
  minReleases: number;
  /** Chance je Monat auf einen Pitch, solange ein Platz frei ist; Pitch gilt so viele Wochen. */
  pitchChancePerMonthBp: Bp;
  pitchWeeks: number;
  /** AUS-R42: Plätze = Grundwert + Personen / peoplePerSlot. */
  slotsBase: number;
  peoplePerSlot: number;
  /** AUS-R40: Pitch als Konzept (bis sliceFromBp Fortschritt) oder Vertical Slice; Unschärfe der gezeigten Wertung. */
  sliceFromBp: Bp;
  /** Pitches nur bis zu diesem Fortschritt des Projekts. */
  pitchUntilBp: Bp;
  conceptNoiseBp: Bp;
  sliceNoiseBp: Bp;
  /** Vorschuss in Anteil der Projektkosten, Anteil des Studios an den Einnahmen, Annahme-Chance. */
  packages: Record<PublishingPackage, { advanceBp: Bp; studioShareBp: Bp; acceptBp: Bp }>;
  /** AUS-R41: drei Raten (Unterschrift, Hälfte, Gold); Verfehlen nach Stärke, Verzug in Wochen. */
  rateAtBp: Bp[];
  missBaseBp: Bp;
  missPerStrengthBp: Bp;
  delayWeeks: number;
  /** AUS-R41 „kürzen“: Anteil der Rate und des restlichen Aufwands. */
  cutRateBp: Bp;
  cutEffortBp: Bp;
  /** AUS-R42: Marketing und Vertrieb durch die eigene Abteilung heben die Nachfrage. */
  demandBoostBp: Bp;
  /** AUS-R42: Marketing zum Release, als Anteil des Vorschusses (Kosten des Spielers). */
  releaseMarketingBp: Bp;
  /** Mindestbudget eines Pitches je Umfang (1980er Preise), falls das KI-Projekt keine Kosten führt. */
  budgetFloorCent: Record<Scope, Cent>;
  /** AUS-R43: Startprofil Publisher. */
  profile: { startMoneyFactorBp: Bp; partners: number };
}

export interface PublishingPitch {
  id: number;
  studioId: number;
  teamId: number;
  genre: string;
  scope: Scope;
  mode: "konzept" | "slice";
  /** Gezeigte Wertung (mit Unschärfe) und ihre Spanne. */
  shownScoreBp: Bp;
  noiseBp: Bp;
  budgetCent: Cent;
  expiresWeek: number;
}

export interface PublishingDeal {
  id: number;
  studioId: number;
  studioName: string;
  teamId: number;
  /** Startwoche des KI-Projekts (erkennt, ob das Team noch am selben Spiel arbeitet). */
  projectStartWeek: number;
  genre: string;
  scope: Scope;
  package: PublishingPackage;
  advanceCent: Cent;
  studioShareBp: Bp;
  signedWeek: number;
  /** Raten mit Fortschritts-Schwelle; paid = gezahlt, missed = verfehlte Prüfungen. */
  rates: { atBp: Bp; amountCent: Cent; paid: boolean; missed: number }[];
  status: "laeuft" | "veroeffentlicht" | "gestoppt" | "verloren";
  productId: number | null;
  incomeCent: Cent;
  /** AUS-R41: offene Entscheidung nach einem verfehlten Meilenstein (Rate, Frist; danach wird gezahlt). */
  decision: { rate: number; untilWeek: number } | null;
}

export interface PublishingState {
  pitches: PublishingPitch[];
  deals: PublishingDeal[];
  nextId: number;
}
