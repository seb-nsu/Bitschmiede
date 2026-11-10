// Ereignisse, Protokoll und Wertung.
// Teil von src/sim/model/types.ts (Prüfung Fable 03.11.2026: Aufteilung nach System); Importe immer über „../model/types“.
import type { Bp, Cent } from "../../num";
import type { AwardCategory, ReissueKind } from "./daten";
import type { Area, AreaMap, ModuleKind } from "./grundlagen";
import type { LicenseTemplateId, LicenseTerms } from "./lizenzmarkt";
import type { Applicant, ContractOffer, PillarEffect } from "./projektdaten";

export const EVENT_KINDS = ["abwerbung", "gehaltsforderung", "launchAnfrage", "exklusivdeal", "kooperation", "lizenzanfrage", "grosskunde", "preisschock", "modsKaputt", "markenjubilaeum", "anforderungVerpasst", "neubau", "prototypReview", "goldReview", "kritischerBug", "auftrag", "bewerbung", "nachproduktion", "gate", "katalog", "hardwareUpgrade", "markenanfrage", "konkursmasse", "releaseDuell", "schutzEntfernen", "rabattwoche", "hardwareBundle", "heftBeilage", "verwertung", "aboDeal", "schwererBug", "serverAusfall", "cheaterWelle", "lootboxDebatte", "datenleck", "ligaAnfrage", "merchWahl", "suche", "einstellenVorschlag", "publisherAbbruch", "hauptversammlung", "gegenangebot"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/** Entscheidungsangebot (S01 KRN-R30 bis KRN-R36, A23). Projekt-Ereignisse zählen nicht gegen die Obergrenze. */
export interface GameEvent {
  /** KRN-R32: Gedächtnis der Kette, aus der diese Stufe stammt. */
  chainMemory?: string[];
  id: number;
  kind: EventKind;
  scope: "projekt" | "welt";
  projectId: number | null;
  createdWeek: number;
  deadlineWeek: number;
  options: string[];
  defaultOption: string;
  /** FRM-R53: Forderung der Hauptversammlung. */
  stockDemand?: "sparprogramm" | "projektStreichen";
  /** UEB-R09: Gegenangebot einer Zielfirma. */
  dealId?: number;
  counterCent?: Cent;
  /** Inhalte je Art; nur ganze Zahlen und Texte, damit der Spielstand serialisierbar bleibt (TEC-R01). */
  review?: { from: string; to: string; forecastBefore: Bp; forecastAfter: Bp };
  bug?: { extraBugsBp: Bp };
  /** MKT-V24: vorgeschlagene Verwertung; MKT-R51: Abo-Deal. */
  reissue?: { kind: ReissueKind; sourceIds: number[]; units: number; priceCent: Cent; licenseFeeCent: Cent };
  subscription?: { feeCent: Cent; units: number };
  /** S05: Konkurrent legt Release auf deine Woche (Studio und seine Woche). */
  duel?: { studioId: number; week: number };
  offer?: ContractOffer;
  /** LIZ-M18, MRK-R65: Markenanfrage eines KI-Studios bzw. Konkursmasse-Auktion. */
  brandDeal?: { brandId: number; offerId: number | null; studioId: number; priceCent: Cent; aiBidCent: Cent; aiBidderId: number | null };
  /** MRK-R21, MRK-R26: Launch-Anfrage oder Exklusivdeal eines Herstellers. */
  platformDeal?: { platform: string; maker: string; payCent: Cent; projectId: number | null };
  applicant?: Applicant;
  /** FRM-R14: abwerbendes Studio; FRM-R13: Titel des Hits hinter der Gehaltsforderung. */
  poachFrom?: string;
  projectTitle?: string;
  /** Katalog-Ereignis (S01 EventDef) mit Ziel: Person oder Produkt. */
  defId?: string;
  personId?: number;
  productId?: number;
  /** S05 Abschnitt 9: „Auflage ausverkauft“ mit Empfehlung zur Nachproduktion. */
  reorder?: { units: number; costCent: Cent; leadWeeks: number; expectedUnits: number; expectedRevenueCent: Cent };
  /** S03 Abschnitt 9: Modul der Neubau-Empfehlung oder der verpassten Anforderung. */
  module?: ModuleKind;
  /** ENG-R53: Karte der verpassten Anforderung. */
  featureId?: string;
  /** PRD-R75: Marke des Jubiläums. */
  brandId?: number;
  /** S04: Lizenzanfrage, Großkunde oder Preis-Schock. */
  license?: LicenseEventData;
  /** S06 Abschnitt 9: Kosten der teuren Option (Hotfix, Entschädigung, Anti-Cheat) und fehlende Serverkapazität. */
  opsCostCent?: Cent;
  opsGap?: number;
  /** FRM-R76: Kandidaten der gezielten Suche. */
  candidates?: Applicant[];
}

export interface LicenseEventData {
  engineId: number;
  studioId: number;
  template: LicenseTemplateId;
  terms: LicenseTerms;
  contractId: number | null;
  /** Erwartete Einnahmen bzw. Mehrkosten je Jahr. */
  perYearCent: Cent;
  genre: string;
}

/** Ergebnis- und Informationsmeldungen für den Wochenbericht und den Ticker (KRN-R30). */
export interface LogEntry {
  week: number;
  key: string;
  params: Record<string, string | number>;
}

/** PRD-R31: Playtest mit einmal gezogenem Versatz. */
export interface Playtest {
  week: number;
  phase: string;
  lowBp: Bp;
  highBp: Bp;
  /** Wahre Prognose ohne Tagesform der Presse; nur für Tests, nicht im Anzeigemodell. */
  trueBp: Bp;
  offsetBp: Bp;
  weaknesses: ScoreFactor[];
}

export interface World {
  themeFit: Record<string, Record<string, Bp>>;
  expectedProfile: Record<string, AreaMap>;
}

export type ProjectStatus = "laeuft" | "bereit" | "pausiert" | "abgebrochen" | "veroeffentlicht";

export interface FeatureContribution {
  featureId: string;
  area: Area;
  baseValue: Bp;
  teamBp: Bp;
  valueBp: Bp;
}

export interface SynergyHit {
  a: string;
  b: string;
  tag: string;
  otherTag: string;
  bp: Bp;
}

/** Aufschlüsselung von Q nach S02 5.1 (TEC-R07). */
/** S03 5.1: Beitrag eines genutzten Moduls zu E. */
export interface EngineModuleFactor {
  module: ModuleKind;
  level: number;
  /** Stand der Technik im Jahr der Berechnung. */
  art: number;
  factorBp: Bp;
}

export interface QualityBreakdown {
  contributions: FeatureContribution[];
  synergies: SynergyHit[];
  synergyBp: Bp;
  referenceTeamBp: Bp;
  profileActual: AreaMap;
  profileExpected: AreaMap;
  profileDeviationBp: Bp;
  profileFactorBp: Bp;
  themeFitBp: Bp;
  /** Etappe 6c.5: Design-Säulen (fehlt in älteren Ergebnissen = keine). */
  pillars?: PillarEffect[];
  pillarFactorBp?: Bp;
  engineFactorBp: Bp;
  /** ENG-R10, ENG-R11: genutzte Module mit ihrem Beitrag. */
  engineModules: EngineModuleFactor[];
  bugShareBp: Bp;
  /** Zwischenstufen von Q (bp Q-Punkte) für den Wasserfall. */
  qFeatures: Bp;
  qTeam: Bp;
  qProfile: Bp;
  qFit: Bp;
  /** Etappe 6c.5: Q nach den Design-Säulen (fehlt = qFit). */
  qPillars?: Bp;
  qEngine: Bp;
  q: Bp;
}

export const SCORE_FACTORS = [
  "features", "team", "profil", "passung", "saeulen", "engine", "bugs", "zeitgeist", "tagesform", "begrenzung",
] as const;
export type ScoreFactor = (typeof SCORE_FACTORS)[number];

export interface ScoreBar {
  factor: ScoreFactor;
  value: Bp;
}

export interface ReleaseResult {
  week: number;
  year: number;
  quality: QualityBreakdown;
  qNormBp: Bp;
  trendBp: Bp;
  baseBp: Bp;
  bars: ScoreBar[];
  scoreBp: Bp;
  bugsAtRelease: number;
  units: number;
  revenueCent: Cent;
  knowledgeKeys: string[];
  /** S11 Release-Abend: Einzelwertungen fiktiver Magazine um die Gesamtwertung (nur Darstellung, ändert nichts). */
  reviews?: { magazine: string; scoreBp: Bp }[];
  /** MKT-R05: Spielerwertung (steuert die Verkaufskurve), Interesse zum Release und dazu passender Wert. */
  userScoreBp?: Bp;
  interestAtRelease?: number;
  fairInterest?: number;
  /** MRK-R19, ZIE-R02: Launch-Titel einer Plattform. */
  launchTitle?: boolean;
  /** ZIE-R05: gewonnene Branchenpreise (Kategorie). */
  awards?: AwardCategory[];
}
