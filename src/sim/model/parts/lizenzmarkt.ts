// S04 Lizenzmarkt.
// Teil von src/sim/model/types.ts (Prüfung Fable 03.11.2026: Aufteilung nach System); Importe immer über „../model/types“.
import type { Bp, Cent } from "../../num";
import type { LiveServiceParams, OperationsParams, OpsEventParams } from "./betrieb";
import type { AcquisitionParams, ApplicationParams, BugParams, CatalogParams, ContractParams, DistributionParams, EngineParams, EventParams, ExploitationParams, FeatureDef, FutureParams, GenreDef, GoalParams, MarketPhaseParams, MediumDef, PerformanceParams, PlatformDef, PlaytestParams, ProductTypeDef, ProjectParams, PublisherParams, QualityParams, RegionParams, SalesParams, StartParams, StockParams, SubgenreDef, SynergyRule, TechUpdateParams, ThemeDef, TimeParams, TradeShowParams, TrendParams, UnlockParams } from "./daten";
import type { DelegationParams } from "./delegation";
import type { ModuleKind, ScopeMap } from "./grundlagen";
import type { AiArchetype, AiParams } from "./ki";
import type { BrandMarketParams, StageParams } from "./markenmarkt";
import type { MerchParams } from "./projekt";
import type { AudienceParams, ContractGameParams, LocalizationParams, PhaseFocusParams, PillarParams, PolishParams } from "./projektdaten";
import type { Anchors, EconomyParams, EquipmentParams, OfficeParams, PresetDef, StaffParams } from "./spielstand";

// ---------- S04 Lizenzmarkt ----------

export type LicenseModel = "hausintern" | "kommerziell" | "indie" | "open_source";
export const LICENSE_TEMPLATES = ["indie", "standard", "premium", "abo"] as const;
export type LicenseTemplateId = (typeof LICENSE_TEMPLATES)[number];
export type SupportLevel = "keiner" | "basis" | "premium";
export type LicenseConsideration = "passung" | "qualitaet" | "kosten" | "support" | "ruf" | "unabhaengigkeit" | "wechsel";

/** S04 LicenseTerms (LIZ-R03): jeder Bestandteil darf null bzw. „keiner“ sein. */
export interface LicenseTerms {
  flatFeeCent: Cent;
  flatFeeUnit: "pro_spiel" | "pro_jahr";
  royaltyBp: Bp;
  royaltyThresholdCent: Cent;
  seatFeeCent: Cent;
  /** Laufzeit in Jahren; null = unbefristet. */
  termYears: number | null;
  exclusivity: { kind: "keine" | "genre" | "plattform" | "voll"; id: string | null };
  sourceAccess: boolean;
  support: SupportLevel;
  updates: "eingefroren" | "minor" | "alle";
}

export interface LicenseTemplateDef {
  flatFeeShareBp: Bp;
  flatFeeBase: "mittel" | "aaa";
  royaltyBp: Bp;
  threshold: boolean;
  seat: boolean;
  support: SupportLevel;
  updates: LicenseTerms["updates"];
  sourceAccess: boolean;
}

export type ProviderStyle = "riese" | "spezialist" | "spieler";

export interface LicensingParams {
  referenceBudget: { teamMonths: number; aaaTeams: number; revenueFactorBp: Bp };
  templates: Record<LicenseTemplateId, LicenseTemplateDef>;
  providerStyles: Record<ProviderStyle, { templates: LicenseTemplateId[]; royaltyFactorBp: Bp; flatFactorBp: Bp; trustStart: Bp }>;
  thresholdAnchorsCent: Anchors;
  seatFeeAnchorsCent: Anchors;
  seatFromYear: number;
  bigCustomerShareBp: Bp;
  hurdle: { h0Bp: Bp; h1Bp: Bp };
  experiencePerReleaseBp: Bp;
  satisfaction: { startBp: Bp; z1: number; z2: number; z3: number; z4: number; z5Bp: Bp; rejectBp: Bp; neutralSupportBp: Bp };
  statusBp: { zufrieden: Bp; sicher: Bp; gefaehrdet: Bp };
  trust: {
    v1: number; gainPerQuarterBp: Bp; fromZeroLossBp: Bp; openSourceReturnExtraBp: Bp; bigProviderShareBp: Bp;
    osBonusBelowBp: Bp; osBonusBp: Bp; osBonusWeeks: number;
  };
  retrain: { slowWeeks: number; slowTempoBp: Bp; mediumWeeks: number; mediumTempoBp: Bp; referenceWeeks: number };
  requests: { chancePerMonthBp: Record<"basis" | "premium", Bp>; deadlineWeeks: number; priority: number };
  weightsBp: Record<AiArchetype, Record<LicenseConsideration, Bp>>;
  hitBonusBp: Bp;
  hitBonusMaxBp: Bp;
  engineFirms: { countAnchors: Anchors; staff: number; startCashMonths: number; lagYears: number };
  /** Prüfung Fable 03.11.2026: zusätzlicher Rückstand 0 bis lagSpreadYears Jahre, damit Engines im Markt in der Qualität streuen. */
  ownEngine: { minPeople: number; profitYears: number; lagSpreadYears: number };
  priceShock: { stagnantYears: number; minShareBp: Bp; chancePerYearBp: Bp; royaltyAddBp: Bp };
  lossReaction: { lostShareBp: Bp; cutMinBp: Bp; cutMaxBp: Bp };
  renegotiateBackBp: Bp;
  bigCustomer: { discountBp: Bp; exclusiveRoyaltyAddBp: Bp };
}

/** S04 LicenseOffer: eine Engine im Lizenzmarkt. ownerId 0 = Spieler. */
export interface MarketEngine {
  id: number;
  ownerId: number;
  name: string;
  style: ProviderStyle;
  /** KI-Engines: Stand der Technik vor lagYears Jahren (ANNAHME, wie bisher die Hausmittel der KI). */
  lagYears: number;
  model: LicenseModel;
  templates: Partial<Record<LicenseTemplateId, LicenseTerms>>;
  /** LIZ-R16 bis LIZ-R19: Vertrauenswert 0–100 als 0–10.000 bp. */
  trustBp: Bp;
  /** Quartal (Woche / 13) der letzten Verschlechterung; LIZ-R18. */
  worsenedQuarter: number;
  /** LIZ-R17: letzter Vertrauensverlust und Jahreskosten davor, für die halbe Rücknahme. */
  lastLoss: { lossBp: Bp; costBeforeCent: Cent } | null;
  /** War die Engine schon einmal Open Source (LIZ-R24). */
  wasOpenSource: boolean;
  /** Lizenzeinnahmen je Jahr (Index 0 = laufendes Jahr). */
  revenueByYear: Cent[];
  /** S04 Abschnitt 7: Kunden, die im laufenden Jahr zum Spieler gewechselt sind, und Kunden zum Jahresbeginn. */
  lostToPlayer: number;
  customersAtYearStart: number;
  closed: boolean;
}

export type LicenseStatus = "zufrieden" | "sicher" | "gefaehrdet" | "abwandernd" | "beendet";

/** S04 LicenseContract. licensorId/licenseeId: 0 = Spieler, sonst KI-Studio. */
export interface LicenseContract {
  id: number;
  engineId: number;
  licensorId: number;
  licenseeId: number;
  template: LicenseTemplateId;
  terms: LicenseTerms;
  startWeek: number;
  /** Laufzeitende (Woche) oder null; „beendet“ nimmt keine neuen Spiele, Royalties der alten laufen weiter (LIZ-R07). */
  endWeek: number | null;
  status: LicenseStatus;
  /** LIZ-R13: größter negativer Einflussfaktor als Text-Schlüssel. */
  reason: string;
  satisfactionBp: Bp;
  /** Fällige Royalties bis zur Monatsabrechnung (LIZ-R07). */
  owedCent: Cent;
  /** Einnahmen je Monat, älteste zuerst (höchstens 24). */
  revenueByMonth: Cent[];
  /** LIZ-R34: im laufenden Monat erfüllte bzw. abgelehnte Anforderungen. */
  fulfilled: number;
  rejected: number;
  /** LIZ-R12: Preisverschlechterung des laufenden Monats (Anteil der Jahreskosten, bp). */
  worseningBp: Bp;
  /** Offene Anforderung (EngineJob-ID) oder null. */
  openRequest: number | null;
}

/** S08 MRK-R14 bis MRK-R26 (data/market/makers.json): Hersteller, Devkit-Wellen, Launch-Titel, Beziehung. */
export interface MakerParams {
  makers: Record<string, string[]>;
  relation: { startBp: Bp; wave1Bp: Bp; wave2AutoBp: Bp; wave2FreeBp: Bp; lowBp: Bp; premiumBp: Bp; launchAskBp: Bp; minReputationBp: Bp };
  announceMonths: [number, number];
  wave1Months: [number, number];
  wave2Months: [number, number];
  devkitFeeAnchorsCent: Anchors;
  launchWeeks: number;
  launchDensityBp: Bp;
  launchInterestBp: Bp;
  launchRequests: number;
  launchSubsidyAnchorsCent: Anchors;
  clockCut: { chanceBp: Bp; cutBp: Bp };
  rangeBp: Bp;
  licenseCutBp: Bp;
  strictCertBp: Bp;
  exclusive: { payAnchorsCent: Anchors; scopeBp: ScopeMap<Bp>; weeks: number };
  hitScoreBp: Bp;
  flopScoreBp: Bp;
  deltas: { hit: Bp; flop: Bp; weakVersion: Bp; exclusive: Bp; rivalExclusive: Bp; certFirst: Bp; certFail: Bp; launch: Bp; missedLaunch: Bp; rejectLaunch: Bp };
}

/** Zeitplan einer neuen Plattform mit Zertifizierung (MRK-R14) und Stand des Spielers. */
export interface PlatformSchedule {
  announceWeek: number;
  wave1Week: number;
  wave2Week: number;
  launchWeek: number;
  /** MRK-R18: Woche der Taktsenkung oder null; true, sobald eingetreten. */
  clockCutWeek: number | null;
  clockCut: boolean;
  /** Devkit-Welle des Spielers (0 = keines), Antrag gestellt, Launch-Anfrage. */
  devkit: number;
  launchRequest: "keine" | "angefragt" | "zugesagt" | "abgelehnt";
  launchChecked: boolean;
}

export interface MakerState {
  /** Zeitpläne werden im ersten Tick gezogen (auch nach der Migration). */
  initialized: boolean;
  /** MRK-R24: Beziehung des Spielers je Hersteller (0–100 als 0–10.000 bp). */
  relationBp: Record<string, Bp>;
  schedules: Record<string, PlatformSchedule>;
  /** MRK-R26: Exklusivdeal-Angebote je Projekt und Hersteller („projekt:hersteller“). */
  exclusiveOffered: string[];
}

export interface LicensingState {
  engines: MarketEngine[];
  contracts: LicenseContract[];
  nextEngineId: number;
  nextContractId: number;
  /** Eintrag der Spieler-Engine im Lizenzmarkt (mit der eigenen Engine angelegt). */
  playerEngineId: number | null;
  /** LIZ-R19: Bonus für Open-Source-Engines bis zu dieser Woche. */
  osBonusUntilWeek: number;
  /** LIZ-R02: erste Anfrage gestellt (Tutorial). */
  firstRequestDone: boolean;
  /** LIZ-R27: zuletzt genutzte Engine des Spielers (für die Umschulung). */
  lastPlayerEngine: string | null;
}

/**
 * Fiktiver Middleware-Anbieter: Modul ab einem Jahr, Stufe = Stand der Technik vor lagYears Jahren (seine Roadmap),
 * Lizenzgebühr je Spiel und Kaufpreis je Personenwoche Forschung der Stufe, beides in 1980er-Preisen; Schuld beim Kauf.
 */
export interface MiddlewareVendor {
  id: string;
  module: ModuleKind;
  fromYear: number;
  lagYears: number;
  licenseFeeCent: Cent;
  /**
   * ENG-R30, LIZ-R03 sinngemäß: „groesse“ = Gebühr je Spiel nach Umfang (licenseFeeCent · feeScopeBp), „beteiligung“ =
   * Festbetrag je Spiel plus royaltyBp vom Nettoumsatz.
   */
  feeModel: "groesse" | "beteiligung";
  royaltyBp: Bp;
  buyPerPwCent: Cent;
  debtBp: Bp;
}

/** S03 EngineTeamPlan: Aufteilung der Kapazität, Summe 10.000 bp. */
export interface EnginePlan {
  researchBp: Bp;
  maintenanceBp: Bp;
  requestsBp: Bp;
}

/** Arbeit des Engine-Teams: geplante Forschung, Anforderung eines Projekts (S03 EngineRequest) oder neue Hauptversion. */
export interface EngineJob {
  id: number;
  kind: "forschung" | "anforderung" | "hauptversion";
  module: ModuleKind | null;
  level: number;
  effortBp: Bp;
  doneBp: Bp;
  weeksWorked: number;
  /** Nur Anforderungen: anfordernde Projekte, Frist (Feature-Freeze), Priorität 1–5 (ENG-R50 bis ENG-R52). */
  projects: number[];
  /** LIZ-R34: anfordernde Lizenzverträge. */
  licensees?: number[];
  deadlineWeek: number | null;
  priority: number;
}

/** S02 Marken (PRD-R70 bis PRD-R75, 5.5), data/brands.json; Werte 0–100 Punkte als 0–10.000 bp. */
export interface BrandParams {
  awarenessStartBp: Bp;
  awarenessPerTitleBp: Bp;
  awarenessHitBp: Bp;
  reputationStartBp: Bp;
  reputationFlopBp: Bp;
  /** BTR-R14: Wirkung der Community-Zufriedenheit auf Markenruf (je Monat) und Startfans. */
  satisfaction: { reputationPerMonthBp: Bp; sequelFansBp: Bp };
  reputationHitBp: Bp;
  reputationCancelBp: Bp;
  flopScoreBp: Bp;
  hitScoreBp: Bp;
  hitFansBp: Bp;
  depthPerTitleBp: Bp;
  fatiguePerTitleBp: Bp;
  fatigueWindowWeeks: number;
  fatigueDecayPerMonthBp: Bp;
  /** Cockpit: „Pause empfohlen bis …“, bis die Müdigkeit unter diesen Wert fällt. */
  pauseFatigueBp: Bp;
  /** ANNAHME: Anteil der Käufer, die Fan der Marke im Genre werden; Anteil der Startfans, die in den ersten Wochen kaufen. */
  fanShareOfBuyersBp: Bp;
  fanBuyRateBp: Bp;
  fanBuyWeeks: number;
  transferBp: { same: Bp; near: Bp; far: Bp };
  near: Record<string, string[]>;
  /** ANNAHME: Stärke = gewichtete Summe aus Bekanntheit, Ruf und Welttiefe. */
  strengthWeightsBp: { awareness: Bp; reputation: Bp; depth: Bp };
  jubileeYears: number;
  /** ANNAHME: Jubiläums-Sammlung verkauft an diesen Anteil der Fans zu diesem Anteil am Vollpreis. */
  collection: { fanShareBp: Bp; priceBp: Bp };
}

/** S05 MKT-F1, MKT-R01 bis MKT-R04: Interesse und Marketing (data/base/dev/marketing.json). */
export interface MarketingParams {
  /** MKT-T18: Budget in Promille der Entwicklungskosten, Standard 300, höchstens 1.500. */
  budgetDefaultPermille: number;
  budgetMaxPermille: number;
  /** δ Zerfall und g Mundpropaganda je Woche (bp). */
  decayBp: Bp;
  wordOfMouthBp: Bp;
  /** b: Kosten je erreichter Person 1990 (Cent; 25 Personen je 100 USD), skaliert mit den Personalkosten der Epoche. */
  reachCostCentPerPersonAt1990: Cent;
  /** M½ = Anteil (bp) des Mittel-Budgets der Epoche je Woche; Mittel-Budget = Personalkosten je Monat · Personenmonate. */
  halfEffectShareBp: Bp;
  mediumBudgetPersonMonths: number;
  /** Interesse aus der Marke je Woche als Anteil der Startfans (bp). */
  brandInterestBp: Bp;
  /** Autopilot: ankündigen, sobald höchstens so viele Wochen Arbeit übrig sind (ab Pre-Production). */
  autoAnnounceWeeks: number;
  /** c_I: Anteil der Interessierten, der in der Startwoche kauft (bp). */
  startWeekShareBp: Bp;
  /** S05 Abschnitt 7: Marketing der KI nach Archetyp (Promille der Entwicklungskosten). */
  aiBudgetPermille: Record<string, number>;
  /** MKT-R05: zur Wertung passendes Interesse = Σ Basis · Anteil · Q_rel; Enttäuschung ab 1,5×, volle Folge ab 3×. */
  fairInterestShareBp: Bp;
  disappointmentThresholdBp: Bp;
  disappointmentFullBp: Bp;
  /** Folge von der Schwelle bis zur vollen Lücke: Spielerwertung −0,5 bis −2, Markenruf −5 bis −15 Punkte. */
  userPenaltyBp: [Bp, Bp];
  brandPenaltyBp: [Bp, Bp];
  /** MKT-R07: Demo über dem Genre-Schnitt +15 %, darunter −10 % Interesse (ANNAHME, Messe-Werte halbiert). */
  demoUpBp: Bp;
  demoDownBp: Bp;
  /** Demo und Creator-Zugang ab diesem Fortschritt („ab Beta“). */
  lateMinProgressBp: Bp;
  /** Genre-Schnitt: Wertungen der letzten Wochen, ohne Releases dieser Wert. */
  genreAverageWeeks: number;
  genreAverageDefaultBp: Bp;
  /** MKT-R08: Creator-Zugang ab 2010, 4 Wochen doppelter Zuwachs; schwere Schwäche ab −1,0 Punkt, je −10 % Interesse. */
  creatorFromYear: number;
  creatorWeeks: number;
  creatorSevereBp: Bp;
  creatorWeaknessPenaltyBp: Bp;
  /** Studio-Ruf zu Spielbeginn (Punkte · 100; ANNAHME 20 Punkte). */
  studioReputationStartBp: Bp;
}

/** S05 Release-Paket (MKT-R09, MKT-R12, MKT-R27; data/base/dev/release.json). */
export interface ReleaseParams {
  /** MKT-R47 bis MKT-R50: Early Access (Preis als Anteil, Takt in Wochen, Zufriedenheit je Monat). */
  earlyAccess: {
    fromYear: number; priceMinBp: Bp; priceMaxBp: Bp; priceDefaultBp: Bp; decayFactorBp: Bp;
    updateWeeks: number; pauseWeeks: number; updateSatisfactionBp: Bp; pauseSatisfactionBp: Bp; updateEffortBp: Bp; startSatisfactionBp: Bp;
  };
  /** MKT-R06: Preis frei ab 2000 (digital), in den Grenzen min–max des Standardpreises. */
  priceFromYear: number;
  priceMinBp: Bp;
  priceMaxBp: Bp;
  /** ANNAHME: Nachfrage · (1 + ε · (1 − Preis/Standard)), mindestens priceDemandMinBp. */
  priceElasticityBp: Bp;
  priceDemandMinBp: Bp;
  /** MKT-R12: Verschieben nach der Ankündigung kostet 10 % Interesse, nach Vorbestellungen 20 %. */
  postponeInterestBp: Bp;
  postponePreorderInterestBp: Bp;
  /** MKT-R27: Deluxe hebt den Durchschnittspreis; Sammler-Edition als kleine eigene Auflage. */
  deluxeFromYear: number;
  deluxeAvgPriceBp: Bp;
  collectorPriceBp: Bp;
  collectorUnitCostBp: Bp;
  collectorShareBp: Bp;
  collectorMaxUnits: number;
  /** S05 Ereignis „Konkurrent legt Release auf deine Woche“: Marketing erhöhen = einmalig dieser Anteil der Entwicklungskosten. */
  duelBoostShareBp: Bp;
}

/** S05 MKT-R28 bis MKT-R34, MKT-F5, Datenblatt §8 (data/base/dev/piracy.json). */
export interface ProtectionLevelDef {
  id: string;
  fromYear: number;
  /** S₀: Schutzwirkung bis zum Knacken (bp). */
  strengthBp: Bp;
  /** Spanne der Haltbarkeit H in Wochen; null = dauerhaft (Store-Schutz). */
  holdWeeks: [number, number] | null;
  lateFromYear?: number;
  lateHoldWeeks?: [number, number];
  /** S_Rest nach dem Knacken (Store-Schutz 0,10). */
  restBp: Bp;
  /** Zufriedenheit der Käufer (Punkte, wirkt ab Etappe 5). */
  satisfaction: number;
  /** ANNAHME: Lizenzgebühr der Middleware als Umsatzanteil. */
  royaltyBp?: Bp;
}

export interface PiracyParams {
  /** MKT-R34, MKT-T08: Online-Spiele, F2P und Live-Service haben höchstens diese Piraterie-Rate. */
  onlineMaxBp: Bp;
  /** p: Grundrate je Plattformtyp und Jahr (Stützwerte, bp). */
  baseRateAnchors: Record<string, [number, number][]>;
  levels: ProtectionLevelDef[];
  /** Autopilot: stärkste Stufe, die höchstens so viel Zufriedenheit kostet. */
  autopilotMaxSatisfactionLoss: number;
  /** MKT-R33: Kopien als Fans der Marke (bp der Kopien). */
  fansPerCopyBp: Bp;
  /** ANNAHME (Datenblatt §8, Kontrollwert): Anteil der Kopien, die ein Kauf gewesen wären. */
  lostSaleBp: Bp;
  /** MKT-R55: „trotzt den Crackern“ ab dieser Haltbarkeit; Studio-Ruf je Moment. */
  defiantHoldWeeks: number;
  reputationPerMomentBp: Bp;
  /** MKT-R32: Entfernen per Patch gibt diesen Anteil der verlorenen Zufriedenheit zurück. */
  removeRecoveryBp: Bp;
}

export interface GameData {
  modId: string;
  modVersion: string;
  /** ZIE-R33, ZIE-R38: geladene Mods außer dem Grundspiel, in Ladereihenfolge. */
  mods: { id: string; version: string; affectsBalance: boolean }[];
  checksum: string;
  features: FeatureDef[];
  genres: GenreDef[];
  subgenres: SubgenreDef[];
  themes: ThemeDef[];
  synergies: SynergyRule[];
  quality: QualityParams;
  bugs: BugParams;
  projects: ProjectParams;
  start: StartParams;
  trends: TrendParams;
  sales: SalesParams;
  marketing: MarketingParams;
  marketPhases: MarketPhaseParams;
  publishers: PublisherParams;
  regions: RegionParams;
  future: FutureParams;
  acquisitions: AcquisitionParams;
  stock: StockParams;
  release: ReleaseParams;
  piracy: PiracyParams;
  tradeShows: TradeShowParams;
  distribution: DistributionParams;
  exploitation: ExploitationParams;
  /** S06 (Etappe 5): Betrieb, Bugs nach dem Release, Patches, Zufriedenheit. */
  operations: OperationsParams;
  liveService: LiveServiceParams;
  opsEvents: OpsEventParams;
  merch: MerchParams;
  goals: GoalParams;
  platforms: PlatformDef[];
  makers: MakerParams;
  staff: StaffParams;
  delegation: DelegationParams;
  equipment: EquipmentParams;
  brandMarket: BrandMarketParams;
  stage: StageParams;
  performance: PerformanceParams;
  media: MediumDef[];
  time: TimeParams;
  presets: PresetDef[];
  economy: EconomyParams;
  offices: OfficeParams;
  productTypes: ProductTypeDef[];
  catalog: CatalogParams;
  unlocks: UnlockParams;
  events: EventParams;
  playtests: PlaytestParams;
  contracts: ContractParams;
  /** Etappe 6c.3: Auftragsspiele (data/base/dev/contractgames.json). */
  contractGames: ContractGameParams;
  /** Etappe 6c.4: Zielgruppen (data/base/dev/audiences.json). */
  audiences: AudienceParams;
  /** Etappe 6c.5: Design-Säulen (data/base/dev/pillars.json). */
  pillars: PillarParams;
  /** Etappe 6c.6: Phasen-Schwerpunkt (data/base/dev/phasefocus.json). */
  phaseFocus: PhaseFocusParams;
  /** Etappe 6c.7: Politur je Bereich (data/base/dev/polish.json). */
  polish: PolishParams;
  /** Etappe 6c.8: Lokalisierung (data/base/market/localization.json). */
  localization: LocalizationParams;
  applications: ApplicationParams;
  engine: EngineParams;
  brands: BrandParams;
  techUpdate: TechUpdateParams;
  ai: AiParams;
}
