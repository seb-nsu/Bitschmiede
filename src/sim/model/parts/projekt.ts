// Projekt, Preise und Engine-Stand eines Projekts.
// Teil von src/sim/model/types.ts (Prüfung Fable 03.11.2026: Aufteilung nach System); Importe immer über „../model/types“.
import type { Bp, Cent } from "../../num";
import type { ProductOps, ProductSales } from "./betrieb";
import type { FairShow, PublisherDeal } from "./daten";
import type { ProducerBrief } from "./delegation";
import type { Playtest, ProjectStatus, ReleaseResult, ScoreFactor } from "./ereignisse";
import type { Area, ModuleKind, ModuleMap, Scope } from "./grundlagen";
import type { EngineJob, EnginePlan } from "./lizenzmarkt";
import type { ContractGameDeal } from "./projektdaten";

export interface ProductPricing {
  releasePriceCent: Cent;
  standardCent: Cent;
  /** Rabatt in dieser Woche (0 = keiner) und der für die nächste Aktion gewählte (null = Regel). */
  discountBp: Bp;
  nextDiscountBp: Bp | null;
  discounts: number;
  habitAtReleaseBp: Bp;
  /** Preis-Historie (Woche, Preis), nur Änderungen. */
  history: [number, Cent][];
  /** MKT-V05: gezahlte Preisschutz-Gutschriften. */
  protectionCreditCent: Cent;
}

export interface ProductProtection {
  level: string;
  /** H in Wochen; null = dauerhaft. */
  holdWeeks: number | null;
  cracked: boolean;
  removed: boolean;
  offered: boolean;
  piracyBp: Bp;
  copies: number;
  /** Zufriedenheit der Käufer durch den Schutz (Punkte · 100, negativ; S06 ab Etappe 5). */
  satisfaction: number;
}

/** S02 Brand: sichtbar nur Stärke und Frische (PRD-R70); Fans je Genre als Personen. */
export interface Brand {
  id: number;
  name: string;
  /** PRD-R74: Inhaber (0 = Spieler, sonst KI-Studio, −1 = Konkursmasse ohne Inhaber). */
  ownerId: number;
  /** FRM-R43: IP beim Publisher (Merch-Ertrag geht an ihn) bzw. Sequel-Option eines Publishers. */
  publisherId?: number | null;
  sequelOptionPublisherId?: number | null;
  foundedWeek: number;
  awarenessBp: Bp;
  reputationBp: Bp;
  depthBp: Bp;
  fatigueBp: Bp;
  fans: Record<string, number>;
  /** MKT-V18: Abschlag auf die Vollpreis-Restnachfrage des nächsten Titels (Gewöhnung ans Warten). */
  waitMalusBp?: Bp;
  /** MKT-R19: Gewöhnung der Fans an Rabatte (0–10.000 bp). */
  discountHabitBp: Bp;
  /** Veröffentlichte Titel (Projekt-IDs) in Reihenfolge. */
  titles: number[];
  firstTitleWeek: number | null;
  lastTitleWeek: number | null;
  jubileeOffered: boolean;
  /** MKT-R41: Merchandising (einmal gewählt: Fanshop oder Lizenz) und ob die Wahl angeboten wurde. */
  merch?: "eigen" | "lizenz" | null;
  merchOffered?: boolean;
  merchLastMonthCent?: Cent;
}

/** S05 MKT-R41 bis MKT-R43, V_Katalog (data/base/market/merch.json). */
export interface MerchParams {
  minStrengthBp: Bp;
  centPerFanMonth: Cent;
  ownFactorBp: Bp;
  ownRiskBp: Bp;
  licenseFactorBp: Bp;
  weakStrengthBp: Bp;
  weakReputationLossBp: Bp;
  catalog: { fromYear: number; shareBp: Bp; minScoreBp: Bp };
  extras: { fromYear: number; attachBp: Bp; priceBp: Bp };
}

/** S03 ModuleState (ENG-R30): Stufe, Schuld 0–100 Punkte als 0–10.000 bp, Herkunft. */
export interface ModuleState {
  level: number;
  debtBp: Bp;
  origin: "eigen" | "lizenziert" | "gekauft";
  vendor: string | null;
  /** Lizenziert: eigene Stufe und Schuld davor; beim Kündigen gilt wieder diese (ANNAHME). */
  ownLevel: number;
  ownDebtBp: Bp;
}

/** S03 Engine des Spielers (Plan Etappe 2, Punkt 3: höchstens eine eigene). */
export interface OwnEngine {
  name: string;
  major: number;
  minor: number;
  modules: ModuleMap<ModuleState>;
  foundedWeek: number;
  /** Alle Versionen mit ihren Stufen, älteste zuerst (für Bindung und Technik-Update). */
  versions: { major: number; minor: number; week: number; levels: ModuleMap }[];
  plan: EnginePlan;
  jobs: EngineJob[];
  nextJobId: number;
  /** ENG-R23: letzte Neubau-Empfehlung (Woche) oder null. */
  lastRecommendWeek: number | null;
}

/** „lizenz:N“: Engine N aus dem Lizenzmarkt (S04 Lizenzweg). */
export type EngineId = "starter" | "eigen" | `lizenz:${number}`;

/** S02 Project.engine, S03 Project.engine: Engine und Stand im Projekt. */
export interface ProjectEngine {
  id: EngineId;
  major: number;
  minor: number;
  binding: "fest" | "mitlaufend";
  levels: ModuleMap;
}

export interface Project {
  /** FRM-R45: Publisher-Vertrag; FRM-R42: schon gepitcht (Konzept, Vertical Slice). */
  publisherDeal?: PublisherDeal | null;
  /** Etappe 6c.3: Auftragsspiel (fehlt = eigenes Spiel). */
  contractGame?: ContractGameDeal | null;
  /** Etappe 6c.4 (PRD-R10): Zielgruppe. */
  audience: string;
  /** Etappe 6c.5: Design-Säulen (höchstens zwei). */
  pillars: string[];
  pitched?: ("konzept" | "slice")[];
  id: number;
  title: string;
  genre: string;
  /** Untergenre oder null (ANNAHME, siehe SubgenreDef). */
  subgenre: string | null;
  theme: string;
  scope: Scope;
  features: string[];
  status: ProjectStatus;
  phase: string;
  effortTotalBp: Bp;
  effortDoneBp: Bp;
  bugsBp: Bp;
  bugHistory: number[];
  startWeek: number;
  readyWeek: number | null;
  costCent: Cent;
  releaseRequested: boolean;
  /** PRD-R10, PRD-R60: Zielplattformen, die erste ist die Lead-Plattform. */
  platforms: string[];
  /** MKT-R22: gewählte Erstauflage; null = Empfehlung. */
  printRun: number | null;
  /** PRD-R26, MKT-R13: laufende Zertifizierung (Wochen bis zur Prüfung) oder null. */
  certWeeksLeft: number | null;
  certPassed: boolean;
  certAttempts: number;
  /** Verkäufe nach dem Release (S05 MKT-F3, Abschnitt 13). */
  sales: ProductSales | null;
  /** PRD-R01: Produkttyp und Vorlage. */
  type: string;
  sourceId: number | null;
  /** PRD-R22: Gate am Ende der Pre-Production (mittel) schon angeboten. */
  gateOffered: boolean;
  result: ReleaseResult | null;
  /** S04 Lizenzweg: Vertrag der fremden Engine (Royalties) oder null; LIZ-R27 Umschulungswochen (0 = keine). */
  licenseContractId: number | null;
  retrainWeeks: number;
  /** Arbeitswochen je Person (sortiert nach ID); bestimmt, wessen Stärke zählt. */
  contributors: { personId: number; weeks: number }[];
  reviewOffered: boolean;
  goldOffered: boolean;
  /** Vorab gezogener Zeitpunkt des kritischen Bugs (Anteil am Aufwand) oder null. */
  criticalBugAtBp: Bp | null;
  criticalBugPending: boolean;
  criticalBugDone: boolean;
  dayOnePatch: boolean;
  playtests: Playtest[];
  playtestWeeksLeft: number;
  patchWeeksLeft: number;
  /** PRD-R40: Einarbeitung nach der Wiederaufnahme, solange kein Fortschritt. */
  resumeWeeksLeft: number;
  /** PRD-R43: durch das Archiv gesparter Aufwand (bp-Personenwochen). */
  archiveSavingBp: Bp;
  /** PRD-R10, S03: Engine und Engine-Stand des Projekts. */
  engine: ProjectEngine;
  /** ENG-R22: durch technische Schuld verlorene Arbeitswochen (bp) und schon gemeldete ganze Wochen. */
  debtLostWeeksBp: Bp;
  debtWeeksReported: number;
  /** PRD-R12, ENG-R50: bestellte Karten, deren Modulstufe noch fehlt (S02 Project.pendingFeatures). */
  pendingFeatures: string[];
  /** ENG-R53: Karten mit Notlösung (70 % Wirkung). */
  makeshift: string[];
  /** ENG-R53 „verschieben“: Das Projekt wartet am Freeze auf die Engine. */
  waitingForEngine: boolean;
  /** PRD-R61, Plan Etappe 2 Punkt 8: Anteil der behaltenen Leistungskosten je Plattform (abgespeckte Versionen). */
  versionShareBp: Record<string, Bp>;
  /** S02 Project.brand. */
  brandId: number | null;
  /** ENG-R73: Engine-Faktor nach einem Technik-Update (die Pressewertung bleibt) oder null. */
  patchedEngineBp: Bp | null;
  /** MRK-R26: Exklusivdeal mit dieser Plattform oder null. */
  exclusivePlatform: string | null;
  /** PRD-R76: Lizenz einer fremden Marke oder null. */
  brandLicenseId: number | null;
  /** FRM-R59: Produzent (Personen-ID) mit Vorgabe oder null. */
  producerId: number | null;
  brief: ProducerBrief | null;
  /** FRM-R59: Vorgabe gefährdet wurde gemeldet. */
  briefWarned: boolean;
  /** FRM-R57: arbeitsgewichteter Mittelwert des Führungsfaktors (Qualität). */
  leadershipBp: Bp;
  /** Etappe 6c.6: Schwerpunkt je Phasengruppe (fehlt = ausgewogen) und arbeitsgewichteter Qualitätsfaktor. */
  phaseFocus: Record<string, string>;
  phaseQualityBp: Bp;
  /** Etappe 6c.7: Bereich in Politur (oder null) und erreichter Bonus je Bereich. */
  polishArea: Area | null;
  polish: Partial<Record<Area, Bp>>;
  /** Etappe 6c.8: übersetzte Sprachen (ohne Heimatsprache). */
  languages: string[];
  /** S05 Project.marketing. */
  marketing: ProjectMarketing;
  /** MKT-R47 bis MKT-R50: Early Access vor dem Release von 1.0, oder fehlt. */
  earlyAccess?: EarlyAccess;
  /** MKT-R09: bestätigtes Release-Paket oder null. */
  releasePlan: ReleasePlan | null;
  /** S06: Betrieb nach dem Release (null vor dem Release und bei Patch-Produkten). */
  ops: ProductOps | null;
}

/** MKT-R47 bis MKT-R50: Early Access eines Projekts. */
export interface EarlyAccess {
  startWeek: number;
  priceBp: Bp;
  /** Prognose-Wertung beim Start (Vergleich mit 1.0, MKT-R50). */
  scoreBp: Bp;
  sold: number;
  revenueCent: Cent;
  lastUpdateWeek: number;
  updates: number;
  /** MKT-R49: Zufriedenheit der Early-Access-Käufer. */
  satisfactionBp: Bp;
  /** Woche des Releases von 1.0 oder null. */
  endWeek: number | null;
}

/** MKT-R09: Release-Paket. Plattformen, Auflage, Demo und Day-One-Patch stehen am Projekt. */
export interface ReleasePlan {
  week: number;
  /** Vollpreis ohne Editionen. */
  priceCent: Cent;
  deluxe: boolean;
  collectorUnits: number;
  preorders: boolean;
  postponements: number;
  /** MKT-R29: Kopierschutz-Stufe. */
  protection: string;
  /** MKT-V07: physischer Vertriebsweg; MKT-V06: Beigaben. */
  channel: string;
  extras: boolean;
  /** BTR-R37: Startkapazität der Server (Punkt 9 des Pakets); fehlt oder null = erwartete Startspitze. */
  serverCapacity?: number | null;
}

/** S05 Project.marketing (MKT-R01 bis MKT-R04): ein Interesse-Wert, Budget, Ankündigung. */
export interface ProjectMarketing {
  /** Vorgemerkte Interessenten (Personen) und ihr Höchstwert. */
  interest: number;
  interestPeak: number;
  /** MKT-T18: Promille der Entwicklungskosten, 0–1.500. */
  budgetPermille: number;
  announcedWeek: number | null;
  /** MKT-R04: Der Autopilot kündigt an (Standard). */
  autoAnnounce: boolean;
  /** Entwicklungskosten bis zur Vorwoche (für die Ausgaben dieser Woche) und Marketing-Ausgaben insgesamt. */
  lastCostCent: Cent;
  spentCent: Cent;
  /** Wasserfall der letzten Woche (Personen): Zerfall, Mundpropaganda, Reichweite, Marke, Deckel. */
  last: InterestParts;
  /** MKT-R07: Demo (keine, vorab, zum Release) und ob sie schon gewirkt hat. */
  demo: DemoMode;
  demoDone: boolean;
  /** MKT-R08: Creator-Zugang: verbleibende Wochen mit doppeltem Zuwachs, öffentliche Schwächen. */
  creatorWeeksLeft: number;
  creatorUsed: boolean;
  weaknesses: ScoreFactor[];
  /** MKT-R35: Auftritt auf der nächsten Branchenmesse („auto“ = Vorschlag nach Prognose) und Jahr des letzten Auftritts. */
  fairPlan: FairShow | "auto";
  fairShownWeek: number | null;
}

export type DemoMode = "keine" | "vorab" | "zumRelease";

export interface InterestParts {
  spendCent: Cent;
  decay: number;
  wordOfMouth: number;
  reach: number;
  brand: number;
  capped: number;
}

export type KnowledgeFactor = Exclude<ScoreFactor, "tagesform" | "begrenzung">;

export interface KnowledgeEntry {
  key: string;
  factor: KnowledgeFactor;
  ref: { genre?: string; theme?: string; area?: Area; feature?: string; scope?: Scope; module?: ModuleKind };
  /** Zählung bestätigender Releases je Richtung (UI-R96, UI-R97). */
  up: number;
  down: number;
  /** Letzte Kennzahlen für den Text (z. B. ist/erwartet). */
  params: Record<string, number>;
  firstWeek: number;
  lastWeek: number;
}

/** S02 ArchiveEntry: wiederverwendbarer Anteil eines abgebrochenen Projekts. */
export interface ArchiveEntry {
  projectId: number;
  genre: string;
  features: string[];
  reusableBp: Bp;
  used: boolean;
}
