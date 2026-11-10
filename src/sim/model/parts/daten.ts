// Daten (data/base): Parameter aller Systeme.
// Teil von src/sim/model/types.ts (Prüfung Fable 03.11.2026: Aufteilung nach System); Importe immer über „../model/types“.
import type { Bp, Cent } from "../../num";
import type { AnalyticsLevel } from "./betrieb";
import type { EventKind, LogEntry } from "./ereignisse";
import type { Area, AreaMap, ModuleKind, ModuleMap, ModuleNeed, PressRandom, Scope, ScopeMap } from "./grundlagen";
import type { EnginePlan, LicensingParams, MiddlewareVendor } from "./lizenzmarkt";
import type { Anchors, CrunchRule } from "./spielstand";
import type { MotivationParams } from "./motivation";
import type { EndgameParams } from "./endspiel";
import type { OwnPublishingParams } from "./publishing";

// ---------- Daten (data/base) ----------

export interface FeatureDef {
  id: string;
  /** Hauptbereich; bestimmt die Teamstärke T_f (S02 5.1). */
  area: Area;
  /** Aufwand je Bereichsrolle in bp-Personenwochen bei Umfang mittel (Feature.effort, PRD-R28). */
  effort: Partial<AreaMap>;
  /** Grundwert q_f in bp von Q-Punkten (0–100 Punkte). */
  baseValue: Bp;
  /** −5…+5 Punkte, als bp. */
  innovation: Bp;
  stability: Bp;
  fun: Bp;
  /** Merkmale für Synergien und Konflikte (A26). */
  tags: string[];
  contentLevel: number;
  availableFrom: number;
  /** PRD-R16: Nachfolger, ab dessen Erscheinen dieses Feature altert. */
  successor?: string;
  /** PRD-R11, S03: Engine-Voraussetzung (Feature.requiresModule). */
  requires: ModuleNeed;
  /** PRD-R15: Verbrauch am Leistungsbudget der Plattform (Punkte). */
  performanceCost: number;
}

export interface GenreDef {
  id: string;
  /** Erwartungsprofil, Summe 10.000 bp. */
  expectedProfile: AreaMap;
  /** Genre-Thema-Passung 5.000–13.000 bp. */
  themeFit: Record<string, Bp>;
}

/**
 * ANNAHME (Inhaltsausbau nach 3.12, OFFENE-FRAGEN): Untergenre eines Genres, ab einem Jahr wählbar. Es verschiebt das
 * Erwartungsprofil des Genres (Summe 0) und hebt die Passung zu einigen Themen; ohne Untergenre gilt das Genre allein.
 */
export interface SubgenreDef {
  id: string;
  genre: string;
  fromYear: number;
  profileShiftBp: Partial<AreaMap>;
  themeBonusBp: Record<string, Bp>;
}

export interface ThemeDef {
  id: string;
  contentLevel: number;
}

export interface SynergyRule {
  a: string;
  b: string;
  bp: Bp;
}

export interface QualityParams {
  profileWeightBp: Bp;
  steepnessBp: Bp;
  scoreBaseBp: Bp;
  scoreAmplitudeBp: Bp;
  scoreMinBp: Bp;
  scoreMaxBp: Bp;
  zeitgeistMaxBp: Bp;
  pressRandomSdBp: Record<PressRandom, Bp>;
  pressStrictnessStepBp: Bp;
  qNormStartBp: ScopeMap;
  qNormFallbackGrowthBp: Bp;
  /**
   * ANNAHME (bis KI-Studios in Etappe 3 echte Releases liefern): Teamstärke der Branche je Jahr. Die Marktreferenz für
   * Q_erw wächst mit ihr und mit den besten Karten des Katalogs (PRD-R56 Ersatz für den Median fremder Releases).
   */
  marketStrengthAnchors: Anchors;
  /**
   * ANNAHME (bis KI-Studios in Etappe 3): typischer Engine-Faktor E der Branche je Jahr (bp). Auch fremde Studios
   * liegen hinter dem Stand der Technik; die Marktreferenz für Q_erw rechnet deshalb mit diesem E (S03 5.1, PRD-R56).
   */
  marketEngineAnchors: Anchors;
  /** Balancing 1.0 (Entscheidung Projektleitung 03.11.2026): Die Presse erwartet in den frühen Jahren mehr (80er sonst zu leicht). */
  pressEraAnchors: Anchors;
  qNormMinReleases: number;
  teamExperienceWeightBp: Bp;
  referenceStrength: number;
  synergyMinBp: Bp;
  synergyMaxBp: Bp;
  seedVariationBp: Bp;
  themeFitMinBp: Bp;
  themeFitMaxBp: Bp;
  /** PRD-R16: Wertverlust je Jahr nach Erscheinen des Nachfolgers und Untergrenze (Anteil des Grundwerts). */
  featureAgingPerYearBp: Bp;
  /** S11 Release-Abend: fiktive Magazine und Streuung ihrer Einzelwertungen. */
  magazines: string[];
  magazineSpreadBp: Bp;
  featureAgingMinBp: Bp;
}

export interface BugParams {
  bugsPerPackageBp: Bp;
  halfValue: ScopeMap;
  qaFindRateBp: Bp;
  testLabBonusBp: Bp;
  innovationWeightBp: Bp;
  innovationScalePoints: number;
}

export interface PhaseDef {
  id: string;
  /** Phase gilt bis zu diesem Anteil am Gesamtaufwand (bp). */
  untilBp: Bp;
}

export interface ProjectParams {
  /** PRD-R40: Wochen Einarbeitung nach einer Pause. */
  resumeWeeks: number;
  /** PRD-R43: höchstens so viel Aufwand sparen gleiche Features aus dem Archiv. */
  archiveSavingBp: Bp;
  /** PRD-R41: Beim Umsteuern auf ein anderes Genre bleibt dieser Anteil der erledigten Arbeit erhalten. */
  steerGenreKeepBp: Bp;
  scopeEffortFactorBp: ScopeMap;
  featureSlots: ScopeMap;
  phases: ScopeMap<PhaseDef[]>;
  /** PRD-R27: Feature-Freeze je Umfang als Phase und Anteil innerhalb dieser Phase (klein 60 % der Produktion, mittel Beginn der Beta). */
  freeze: ScopeMap<{ phase: string; shareBp: Bp }>;
  /** Etappe 6c.1: Jahr, ab dem ein Umfang wählbar ist (groß 1990, AAA 1998). */
  scopeFromYear: ScopeMap;
  /** PRD-R22: Phase, an deren Ende das Gate liegt (mittel Pre-Production, groß und AAA Vertical Slice); null = kein Gate. */
  gatePhase: ScopeMap<string | null>;
}

export interface StartParams {
  startYear: number;
  /** Etappe 6c.10: wählbare Startjahre und Schnellwahl. */
  startYearRange: [number, number];
  startYearQuick: number[];
  startMoneyCent: Cent;
  teamSize: number;
  baseStrength: number;
  founderBonus: number;
  workPerPersonWeekBp: Bp;
  costPerPersonMonthCent: Cent;
  experienceGainPerWeekBp: Bp;
  hasTestLab: boolean;
  /** PRD-R14: Konzept und drei vorgewählte Karten des ersten Projekts. */
  /** Prüfung Fable 03.11.2026 (Design „erste Minute“): Kartenreihen des ersten Projekts. */
  firstProjectAreas: Area[];
  firstProject: { genre: string; theme: string; scope: Scope; features: string[]; platforms: string[] };
  /** Zweiter Gründer: Bonus in einem zufälligen anderen Bereich. */
  secondFounderBonus: number;
  maxPersons: number;
  /** E3: ab dieser Personenzahl sind zwei eigene Projekte gleichzeitig erlaubt. */
  secondProjectFromPersons: number;
  maxOwnProjects: number;
  transferWeeks: number;
  /** Nur wer mindestens so viele Wochen mitgearbeitet hat, zählt für die Teamstärke. */
  minContributionWeeks: number;
}

export interface EventParams {
  /** Frist einer Entscheidung in Wochen (KRN-R34). */
  deadlineWeeks: { projekt: number; welt: number };
  /** S01 5.2: Ein Welt-Angebot in einer belegten Woche rückt in die nächste freie, höchstens so viele Wochen später. */
  plannerMaxDelayWeeks: number;
  maxWorldEventsPerWeek: number;
  prototypeReviewAtBp: Bp;
  reviewReworkEffortBp: Bp;
  criticalBug: { chanceBp: Bp; fromBp: Bp; toBp: Bp; extraShareBp: Bp; minExtraBugs: number; delayWeeks: number };
  dayOnePatch: { bugReductionBp: Bp; weeks: number };
  /** Testwochen, mit denen die Prognose bis zum Release rechnet. */
  forecastTestWeeks: number;
}

export interface PlaytestParams {
  weeks: number;
  /** Spanne S und möglicher Versatz V je Phase, intern (S02 5.7). */
  phases: Record<string, { spreadBp: Bp; offsetBp: Bp }>;
  /** ANNAHME (E5): kleine Projekte testen ab Produktion; ab diesem Anteil gelten die Beta-Werte. */
  smallLateFromBp: Bp;
}

export interface ContractKind {
  id: string;
  area: Area;
  weeks: [number, number];
  payPerWeekCent: [Cent, Cent];
  requirement: [number, number];
}

export interface ContractParams {
  unlockAfterReleases: number;
  chancePerWeekBp: Bp;
  failPayBp: Bp;
  baseExperience: number;
  /** Entscheidung Projektleitung 02.11.2026: Faktoren auf Bezahlung und Wochenchance nach Jahr (Stützwerte). */
  epoch?: { payBp: [number, Bp][]; chanceBp: [number, Bp][] };
  /**
   * Entscheidung Projektleitung 03.11.2026 (Auftragsstudio bis 2040): Team-Aufträge mit mehreren Personen. Anteil der
   * Angebote ab fromYear, Teamgröße sizeMin bis Stützwert nach Jahr, Dauer × weeksBp, Bezahlung je Person × payPerPersonBp.
   */
  team?: { fromYear: number; chanceBp: Bp; sizeMin: number; sizeMaxAnchors: [number, number][]; weeksBp: Bp; payPerPersonBp: Bp };
  kinds: ContractKind[];
  clients: string[];
}

export interface ApplicationParams {
  firstAfterReleases: number;
  chancePerWeekBp: Bp;
  baseStrength: [number, number];
  focusBonus: [number, number];
  salaryBaseCent: Cent;
  salaryPerFocusPointCent: Cent;
  firstNames: string[];
  lastInitials: string;
}

export interface TrendParams {
  startSdBp: Bp;
  monthlySdBp: Bp;
  meanReversionBp: Bp;
  minBp: Bp;
  maxBp: Bp;
}

/** S08 Plattform mit festem Lebenszyklus (MRK-R11) aus dem Gerüst im Datenblatt Abschnitt 4. */
/** Datenblatt Abschnitt 4: Familien; „mobil“ ab 2008 (Smartphone, nur Download). */
export type PlatformType = "konsole" | "handheld" | "heimcomputer" | "pc" | "mobil";

export interface PlatformDef {
  id: string;
  type: PlatformType;
  releaseYear: number;
  endYear: number;
  /** Datenträger ab Jahr, z. B. PC: Diskette, ab 1994 CD. */
  media: [number, string][];
  /** Plattformgebühr je gefertigtem Stück als Anteil am Preis (MKT-V03). */
  licenseFeeBp: Bp;
  /** Installierte Basis in Personen je Jahr, linear interpoliert. */
  baseAnchors: Anchors;
  /** PRD-R26: Konsolen und Handhelds verlangen eine Zertifizierung. */
  certification: boolean;
  /** PRD-R15, MRK-R02: Leistungsbudget beim Erscheinen (fest); beim PC aus den Ankerwerten des Jahres. */
  performance: number;
  /** MRK-R02: Plattformen, die wie der PC laufend wachsen (Smartphone), haben eigene Ankerwerte statt eines festen Budgets. */
  performanceAnchors?: Anchors;
  /** ANNAHME: Preis der Spiele auf dieser Plattform im Verhältnis zum Vollpreis (Smartphone: Spiele kosten wenig). */
  priceBp?: Bp;
  /** MKT-R24: Plattform ohne Datenträger (Brille, Cloud); sonst gilt der Digitalanteil der Familie. */
  digitalOnly?: boolean;
}

/** PRD-R15, PRD-R61, MRK-R02, MRK-R05 (data/market/platforms.json, Abschnitt performance). */
export interface PerformanceParams {
  pcAnchors: Anchors;
  /** Plattform-Erfahrung je veröffentlichtem Spiel (8 Punkte als bp) und höchste Ersparnis beim Verbrauch. */
  experiencePerReleaseBp: Bp;
  experienceSavingMaxBp: Bp;
  /** PRD-R61: Warnung vor schwacher Version ab diesem Verlust an Leistungskosten. */
  weakVersionThresholdBp: Bp;
}

export interface MediumDef {
  id: string;
  unitCostCent: Cent;
  leadWeeks: number;
  minBatch: number;
}

/** S05 MKT-F2, MKT-F3, Abschnitt 13 in der Etappe-1-Form (ohne Interesse und Marketing). */
export interface SalesParams {
  /** c_M: Spontankäufer je Startwoche als Anteil der erreichbaren Basis bei Q_rel = 1. */
  spontaneousBp: Bp;
  /** MKT-F2, MKT-R10: κ und Konkurrenzdichte; die Dichte kommt bis zu den KI-Studios (Etappe 3) aus Ankerwerten (bp). */
  competitionKappaBp: Bp;
  competitionDensityAnchors: Anchors;
  /** ANNAHME: Nachfrage-Faktor je Umfang, bis Interesse und Marketing (Etappe 4) den Unterschied tragen. */
  scopeDemandBp: ScopeMap;
  /**
   * Balancing Spätspiel (Auftrag Projektleitung 04.11.2026, Prüfung Fable: „Firma wächst nicht“): Erwartung der Käufer je Umfang
   * und Jahr. Kleine und mittlere Spiele erreichen ab den 2000ern einen kleineren Teil der Basis; die 1980er bleiben gleich.
   */
  scopeEraAnchors: Record<Scope, Anchors>;
  /** Q_rel = Wertung / 7, begrenzt 0,3–1,5. */
  qRelDivisorBp: Bp;
  qRelMinBp: Bp;
  qRelMaxBp: Bp;
  /** k = k₀ · 7 / max(Wertung, 3). */
  decayK0Bp: Bp;
  seasonQ4Bp: Bp;
  seasonSummerBp: Bp;
  /** Händler- und Vertriebsanteil am Preis (MKT-R25). */
  retailShareBp: Bp;
  /** MKT-R24: Digitalanteil der Verkäufe je Plattformfamilie und Jahr (Datenblatt Abschnitt 1). */
  digitalShareAnchors: Record<PlatformType, Anchors>;
  /** MKT-R25: Store-Anteil digital, ab der Umsatzschwelle je Spiel der niedrigere Satz. */
  storeShareBp: Bp;
  storeShareReducedBp: Bp;
  storeThresholdCent: Cent;
  /** MRK-R06: Absatz auf eingestellten Plattformen. */
  discontinuedShareBp: Bp;
  /** MKT-V11: Regalverlust nach so vielen Wochen unter der Schwelle (Anteil der Startwoche). */
  shelfAfterWeeks: number;
  shelfThresholdBp: Bp;
  shelfFactorBp: Bp;
  storageCentPerUnitMonth: Cent;
  /** Auflage-Empfehlung: Nachfrage der ersten Wochen bei dieser Wertung (ohne Playtest). */
  recommendWeeks: number;
  neutralForecastBp: Bp;
  /** Verkäufe enden, wenn die Wochennachfrage nach mindestens so vielen Wochen unter 1 Stück fällt. */
  minSalesWeeks: number;
  priceAnchorsCent: Anchors;
  certification: { weeks: number; failDelayWeeks: number; thresholdBugs: number };
  /** PRD-R60, S02 5.4: a₀ und a₁ der Plattform-Anpassung; Leistungsabstand zwischen verschiedenen Plattformtypen (ANNAHME). */
  extraPlatformEffortBp: Bp;
  platformGapEffortBp: Bp;
  otherTypeGapBp: Bp;
  /** MKT-R17 bis MKT-R21, MKT-F4, MRK-R41 (Datenblatt S05 Abschnitt 5). */
  pricing: PricingParams;
}

/** S05 Messen (MKT-R35 bis MKT-R38, Datenblatt S05 Abschnitt 5). */
export type BoothSize = "klein" | "mittel" | "gross";

export interface TradeShowParams {
  /** S13 AUS-R21 (1.2, Prüfung Fable: nur die Standgröße): Wirkung auf den Auftritt und Kosten in 1980er Preisen. */
  booths: Record<BoothSize, { effectBp: Bp; costCent: Cent }>;
  /** Branchenmesse (bis tradeFairUntilYear als Handelsmesse) und Entwicklerkonferenz als Woche im Jahr (0–51). */
  fairWeekOfYear: number;
  tradeFairUntilYear: number;
  conferenceWeekOfYear: number;
  conferenceFromYear: number;
  /** Trailer +15 %, Demo +30 %, Demo unter dem Genre-Schnitt −20 % Interesse. */
  trailerBp: Bp;
  demoBp: Bp;
  demoBadBp: Bp;
  /** MKT-R38: Ankündigung auf der Messe wirkt 1,5-fach; Startinteresse als Anteil des passenden Interesses. */
  announceFactorBp: Bp;
  announceSeedBp: Bp;
  /** MKT-R36: Handelsmesse: gezeigte Titel behalten ihren Regalplatz länger, wenn sie binnen eines Jahres erscheinen. */
  tradeShelfExtraWeeks: number;
  tradeShelfWithinWeeks: number;
  /** S05 Abschnitt 7: KI zeigt ihre zwei stärksten Projekte. */
  aiShows: number;
  conferenceReputationBp: Bp;
}

/** S05 Abschnitt 13 Vertrieb (MKT-V04, MKT-V06 bis MKT-V13, MKT-R26). */
export interface ChannelDef {
  id: string;
  /** Anteil des Preises beim Studio und Anteil des erreichbaren Markts (physisch). */
  shareBp: Bp;
  reachBp: Bp;
  /** MKT-V04: Rückläufer über den Handel. */
  returns: boolean;
  fromYear: number;
  toYear: number;
  /** MKT-V09: Mindestgröße des Studios. */
  minStaff: number;
  /** MKT-V10: nur auf diesen Plattformfamilien (fehlt = alle). */
  platformTypes?: PlatformType[];
}

export interface DistributionParams {
  channels: ChannelDef[];
  returnsAfterWeeks: number;
  returnsShareBp: Bp;
  refundFromYear: number;
  refundBaseBp: Bp;
  refundShortBp: Bp;
  refundBugsBp: Bp;
  refundBugsThreshold: number;
  refundShortScopes: Scope[];
  extras: { unitCostBp: Bp; fansBp: Bp; protectionAs: string };
  shareware: { buyersBp: Bp; interestBp: Bp };
  bundle: { minScoreBp: Bp; afterWeeks: number; feeCentAnchors: Anchors; devicesShareBp: Bp; relationBp: Bp };
  coverMount: { fromYear: number; toYear: number; minAgeWeeks: number; chancePerQuarterBp: Bp; feeCentAnchors: Anchors; awarenessBp: Bp; platformTypes: PlatformType[] };
}

/** S10 Meilensteine und langfristige Ziele (ZIE-R01, ZIE-R02, ZIE-R06). */
export interface MilestoneDef {
  id: string;
  /** Systeme fehlen noch (Betrieb, Börse, Übernahmen, dynamische Lebenszyklen). */
  later?: boolean;
  scoreBp?: Bp;
  count?: number;
  year?: number;
  /** mmoZehnJahre: Betriebsdauer in Wochen. */
  weeks?: number;
  /** ZIE-R07: Ziel der Zukunftsepoche, erst ab diesem Jahr prüfbar. */
  fromYear?: number;
  /** plattformDerZukunft: Plattformen der Zukunft. */
  platforms?: string[];
}

export interface GoalParams {
  milestones: MilestoneDef[];
  longTermGoals: string[];
  goalEndYear: number;
  hallOfFameSize: number;
  awards: AwardParams;
  legacy: LegacyParams;
  scenarios: ScenarioDef[];
  /** Langzeitmotivation (Prüfung Fable 03.11.2026): Strategiekonferenz, Erzrivale, Epochen-Fragen. */
  motivation: MotivationParams;
  /** Endgame-Themen (Auftrag 04.11.2026): Herausforderungen, Nostalgie, Standards, Krisen. */
  endgame: EndgameParams;
}

/** ZIE-R08, ZIE-R51 und Vermächtnis-Wertung (S10 Abschnitt 5). */
export interface LegacyParams {
  defaultEndYear: number;
  minEndYear: number;
  /** Ende des Kalenders: danach kein Weiterspielen. */
  lastYear: number;
  weights: Record<LegacyPart, Bp>;
}

export type LegacyPart = "marken" | "engines" | "umsatz" | "preise" | "rivalen" | "ruf";

/** Vermächtnis-Wertung: Teilwerte 0–100 (gegen die beste KI-Firma), Beitrag je Teil in Punkten · 100, Titel. */
export interface Legacy {
  parts: { part: LegacyPart; player: number; best: number; score: number; contribution: Bp }[];
  totalBp: Bp;
  /** Endgame-Themen: Ruhmeshalle-Punkte aus Vermächtnis-Herausforderungen (in totalBp enthalten). */
  challengeBp?: Bp;
  title: string;
}

/** ZIE-R13 bis ZIE-R15: Szenario mit Startzustand, Ziel und Frist (Ende des Fristjahres). */
export interface ScenarioDef {
  id: string;
  startYear: number;
  deadlineYear: number;
  start: {
    moneyCent?: Cent;
    office?: string;
    hires?: number;
    /** Aufschlag auf die Stärke aller Startpersonen (Punkte). */
    strengthBonus?: number;
    relations?: Record<string, Bp>;
    reputationBp?: Bp;
    /** Live-Service-Rettung: ein laufendes Live-Produkt zum Start (Spieler, Zufriedenheit, Wochen ohne Content). */
    liveProduct?: {
      title: string; type: string; genre: string; theme: string; scope: Scope; features: string[];
      players: number; satisfactionBp: Bp; pauseWeeks: number; ageWeeks: number; scoreBp: Bp;
    };
    /** Konzern-Integration: so viele KI-Studios (Größe in Personen) sind zum Start frisch gekaufte Töchter. */
    subsidiaries?: { count: number; minPeople: number; maxPeople: number };
  };
  goal: {
    kind: "spielWertung" | "plattformErhalten" | "engineMarktfuehrer" | "spielerbasisSteigern" | "interesseRelease" | "integrationOhneAbwanderung";
    scoreBp?: Bp; platform?: string; plannedEndYear?: number; minScoreBp?: Bp; factorBp?: Bp;
    /** Indie-Durchbruch: Interesse zum Release (Interessenten). */
    interest?: number;
    /** Konzern-Integration: höchstens so viele Abgänge in den Töchtern während der Integration. */
    maxLeft?: number;
  };
}

export interface ScenarioState {
  id: string;
  status: "laeuft" | "gewonnen" | "verloren";
  week: number | null;
  /** Rette die Konsole: geplantes letztes Jahr der Plattform laut Hersteller. */
  plannedEndYear: number | null;
  warned: boolean;
  /** Live-Service-Rettung: Produkt und Spielerbasis zum Start (fehlt bei anderen Szenarien). */
  liveProductId?: number;
  startPlayers?: number;
  /** Konzern-Integration: die Töchter des Startzustands. */
  subsidiaryIds?: number[];
}

export interface Ending {
  week: number;
  reason: "endjahr" | "ziel" | "kalender" | "insolvenz" | "szenario" | "uebernahme";
  legacy: Legacy;
  /** ZIE-R11: Erfolge zum Endzeitpunkt. */
  milestones: number;
  awards: number;
  continued: boolean;
}

/** ZIE-R03 bis ZIE-R05: Branchenpreise. */
export type AwardCategory = "spiel" | "engine" | "studio" | "newcomer" | "innovation";

export interface AwardParams {
  categories: AwardCategory[];
  nominees: number;
  drawTop: number;
  /** Produkttypen, die als neues Spiel zählen. */
  gameTypes: string[];
  salesBoostBp: Bp;
  salesBoostWeeks: number;
  reputationBp: Bp;
  newcomerMaxWeeks: number;
  /** Engine: Punkte je laufender Lizenz, dazu das Vertrauen als Qualität. */
  enginePointsPerContract: number;
  /** Studio: Gewicht und Deckel des Umsatzwachstums neben dem Ruf. */
  growthWeightBp: Bp;
  growthCapBp: Bp;
}

/** Nominierung: Eigentümer (0 = Spieler), Bezug (Projekt, KI-Produkt, Engine oder Studio) und Punkte. */
export interface AwardNominee {
  ownerId: number;
  refId: number;
  points: number;
}

export interface Award {
  year: number;
  category: AwardCategory;
  nominees: AwardNominee[];
  /** Index des Gewinners in nominees. */
  winner: number;
}

export interface LongTermGoal {
  id: string;
  status: "offen" | "erreicht" | "verfehlt";
  week: number | null;
}

/** S05 Abschnitt 13 Verwertung (MKT-V15 bis MKT-V24, MKT-R51 bis MKT-R54). */
export type DemandTier = "voll" | "mittel" | "budget";
export type ReissueKind = "complete" | "budget" | "sammlung" | "klassiker";

export interface ReissueForm {
  impulseBp: Bp;
  /** Preis als Anteil am Vollpreis des Jahres. */
  priceBp: Bp;
  tiers: DemandTier[];
  minScoreBp?: Bp;
  minAddons?: number;
  minWeeks?: number;
  earlyWeeks?: number;
  earlyMalusBp?: Bp;
  tailShareBp?: Bp;
  consoleMinSold?: number;
  maxShareBp?: Bp;
  reputationPenaltyBp?: Bp;
  bundleFactorBp?: Bp;
  minTitles?: number;
  minAgeWeeks?: number;
  nostalgiaBp?: Bp;
}

export interface ExploitationParams {
  tierShareBp: Record<DemandTier, Bp>;
  /** Restnachfrage beim Release = Faktor · erwarteter Absatz über expectedWeeks Wochen. */
  potentialFactorBp: Bp;
  expectedWeeks: number;
  /** Eine Verwertung verkauft je Woche diesen Anteil ihres Rests. */
  weeklyShareBp: Bp;
  attentionBaseBp: Bp;
  attentionMaxBp: Bp;
  forms: Record<ReissueKind, ReissueForm>;
  budgetLicense: { fixedShareBp: Bp; royaltyBp: Bp };
  subscription: { fromYear: number; feeShareBp: Bp; displaceBp: Bp; weeks: number; fansShareBp: Bp; releaseChanceBp: Bp; catalogChancePerYearBp: Bp; catalogMinAgeWeeks: number };
  minPotential: number;
}

/** MKT-V15: Edition, Neuauflage, Sammlung oder Klassiker mit Bezug auf die Originale. */
export interface Reissue {
  id: number;
  kind: ReissueKind;
  sourceIds: number[];
  startWeek: number;
  priceCent: Cent;
  platforms: string[];
  units: number;
  left: number;
  sold: number;
  revenueCent: Cent;
  /** MKT-V23: an einen Budget-Publisher lizenziert (Spieler bekommt den Anteil). */
  licensed: boolean;
  ended: boolean;
}

export type FairShow = "nichts" | "trailer" | "demo";

/** S05: Preis nach dem Release, Rabattwochen und Gewöhnung (MKT-R17 bis MKT-R21, MKT-F4). */
export interface PricingParams {
  discountFromYear: number;
  /** Rabattwochen als Woche im Jahr (0–51), 4 pro Jahr. */
  discountWeeks: number[];
  r1Bp: Bp;
  r2Bp: Bp;
  /** Gewöhnung 0–1.000 als 0–10.000 bp: +50 je Rabatt ab der Schwelle, −10 je Monat. */
  habitPerDiscountBp: Bp;
  habitMinDiscountBp: Bp;
  habitDecayPerMonthBp: Bp;
  /** Rabatthöhen der Entscheidung, wenn keine Regel aktiv ist. */
  discountOptionsBp: Bp[];
  /** A12: Standardregel „nach 12 Monaten an jeder Store-Aktion mit 25 % Rabatt“. */
  ruleAfterWeeks: number;
  ruleDiscountBp: Bp;
  ruleMaxDiscountBp: Bp;
  /** MKT-R17: vorgeschlagene Preiskurve (ab Woche nach Release, Senkung in bp). */
  curve: [number, Bp][];
  /** MRK-R41, KI-R39: KI senkt nach 12 Monaten um 25 % und nimmt an jeder zweiten (Publisher jeder dritten) Aktion teil. */
  aiCutAfterWeeks: number;
  aiCutBp: Bp;
  aiDiscountBp: Bp;
  aiEvery: number;
  aiEveryPublisher: number;
}

/** KRN-R03, ZIE-R45: Zeit pro Anzeigeschritt bei 1× (S01: 0,5–2,0 s) und Faktoren der Tempo-Knöpfe. */
export interface TimeParams {
  msPerDisplayStep: number;
  speedFactorBp: Record<"0.5x" | "1x" | "2x" | "4x", Bp>;
  /** KRN-R52, ZIE-R29: Autosave nach jedem Jahrbuch und alle so viele Wochen, rotierend über so viele Plätze. */
  autosaveIntervalWeeks: number;
  autosaveSlots: number;
  /** Spieltest-Rückmeldung (Abweichung von UI-R66, OFFENE-FRAGEN): nur diese Entscheidungen halten die Zeit an. */
  pauseOnEvents: EventKind[];
}

/** PRD-R01: Produkttyp als Datensatz mit den fünf Parametern und den Stellgrößen der Etappe 1. */
export interface ProductTypeDef {
  id: string;
  /** Voraussetzung: null oder „releasedGame“ (ein eigenes veröffentlichtes Spiel als Vorlage). */
  requires: "releasedGame" | null;
  revenueModel: string;
  lifetime: { shape: string; weeks: number };
  teamShare: Bp;
  brandEffect: { strength: Bp; freshness: Bp };
  /** Preis als Anteil am Vollpreis. */
  priceBp: Bp;
  /** Aufwand als Anteil des normalen Aufwands. */
  effortBp: Bp;
  /** „basis“: Käufer aus der Plattformbasis; „besitzer“: Käufer aus den Besitzern der Vorlage; „keine“: kein Verkauf. */
  demand: "basis" | "besitzer" | "keine";
  ownerShareBp: Bp;
  /** Faktor auf k: Addons verkaufen sich kürzer. */
  decayFactorBp: Bp;
  /** Port: Inhalt (Genre, Thema, Umfang, Features) kommt aus der Vorlage. */
  sameContent: boolean;
  fixedScope: Scope | null;
  /** Port: nur Plattformen, auf denen die Vorlage noch nicht erschienen ist. */
  requiresNewPlatform: boolean;
  /** Engine-Stand: von der Vorlage (Port, Addon) oder die aktuelle eigene Engine (Technik-Update, Remaster). */
  engineSource: "source" | "current";
  /** ENG-R70: nur, wenn es eine neuere Version der Engine der Vorlage gibt. */
  needsNewerEngine: boolean;
  /** ENG-R72, S03 5.4: Aufwand · min(1, 0,4 · ΔHauptversion + 0,1 · ΔUnterversion). */
  versionScaled: boolean;
  /** ENG-R71: Technik-Update als kostenloser Patch oder kostenpflichtiges Upgrade (ohne neue Pressewertung). */
  patch: "kostenlos" | "upgrade" | null;
  /** PRD-R01: frühestes Jahr des Typs (DLC, F2P, Live-Service); fehlt = immer. */
  fromYear?: number;
  /** PRD-R01, BTR-R23: Engine-Modul als Voraussetzung (MMO: Netzwerk-Stufe „Massively Multiplayer“). */
  requiresModule?: { module: ModuleKind; level: number } | null;
  /** BTR-R15: Live-Produkt mit Spielerbasis (Art bestimmt Churn, Rhythmus und Umsatzmodell, liveservice.json). */
  live?: LiveKind | null;
  /** Faktor auf die Nachfrage (F2P: kostenlos erreicht mehr Spieler). */
  reachBp?: Bp;
}

export const LIVE_KINDS = ["mmo", "liveService", "f2p"] as const;
export type LiveKind = (typeof LIVE_KINDS)[number];

/** ENG-R72, ENG-R75 (data/events/techupdate.json). */
export interface TechUpdateParams {
  /** Risiko „Update zerstört Mods und Spielstände“ ohne QA (25 %). */
  modsBrokenRiskBp: Bp;
  compensationCent: Cent;
  modderCostCent: Cent;
  modderDemandBp: Bp;
  majorStepBp: Bp;
  minorStepBp: Bp;
}

/**
 * S01 5.4: Bedingungen sind deklarativ, z. B. {"alle": [{"jahr": {">=": 1985}}, {"firma.mitarbeiter": {">=": 8}}]},
 * mit den Operatoren alle, eines, nicht und den Vergleichen =, <, <=, >, >=. Geprüft wird beim Laden (TEC-R33).
 */
export type Condition = Record<string, unknown>;

/** Wirkungen einer Option (S01 Option.effects); Geldbeträge in 1980er-Preisen, aufs Jahr hochgerechnet. */
export type Effect =
  | { type: "geld"; cent: Cent }
  | { type: "geldJePerson"; cent: Cent }
  | { type: "trend"; on: "genre" | "thema"; bp: Bp }
  | { type: "staerke"; who: "ziel" | "alle"; area: Area | "beste"; points: number }
  | { type: "gehalt"; bp: Bp; who?: "ziel" | "alle" }
  | { type: "geht" }
  | { type: "bugs"; bp: Bp }
  | { type: "aufwand"; pwPerPerson: number }
  | { type: "nachfrage"; bp: Bp }
  // 6a.2 (MRK-R56): Wirkungen der Ketten. ruf = Studio-Ruf, moral = alle Personen, interesse relativ zum Projekt,
  // zufriedenheit und spieler am Produkt, markenRuf und markenBekanntheit an der Marke des Produkts.
  | { type: "ruf"; bp: Bp }
  | { type: "moral"; bp: Bp }
  | { type: "interesse"; bp: Bp }
  | { type: "zufriedenheit"; bp: Bp }
  | { type: "spieler"; bp: Bp }
  | { type: "markenRuf"; bp: Bp }
  | { type: "markenBekanntheit"; bp: Bp }
  | { type: "crunchRegel"; rule: CrunchRule }
  // 6a.7 (MRK-R57, Tabelle 5.8): Zukunfts-Ketten. werkzeugTempo setzt den Tempo-Zuschlag der KI-Werkzeuge,
  // plattformErfahrung hebt die Erfahrung auf einer Plattform, haerte ändert die Monetarisierungs-Härte aller eigenen
  // Live-Produkte, nachfrageAlle den Nachfrage-Faktor aller eigenen Produkte im Verkauf.
  | { type: "werkzeugTempo"; bp: Bp }
  | { type: "plattformErfahrung"; platform: string; bp: Bp }
  | { type: "haerte"; bp: Bp }
  | { type: "nachfrageAlle"; bp: Bp }
  // Endgame-Themen, Krisen für Große (Auftrag 04.11.2026, Bewertung Fable): strafeKasse = Anteil an der Kasse,
  // geldMonatskosten = Vielfaches (bp) der mittleren Monatskosten, kuendigung = Anteil der Angestellten (geringste Moral
  // zuerst), serverKosten = Aufschlag auf alle Serverkosten für Wochen, zufriedenheitAlle = alle eigenen Live-Produkte,
  // krisenfest zählt die überstandene Krise (Herausforderung „Krisenfest“).
  | { type: "strafeKasse"; bp: Bp }
  | { type: "geldMonatskosten"; bp: Bp }
  | { type: "kuendigung"; bp: Bp }
  | { type: "serverKosten"; bp: Bp; weeks: number }
  | { type: "zufriedenheitAlle"; bp: Bp }
  | { type: "krisenfest" };

/** S07 FRM-R51 bis FRM-R54, FRM-R74, FRM-R75, Formel 5.7 (data/core/stock.json, Etappe 6b.2). */
export type DividendLevel = "keine" | "niedrig" | "hoch";
export interface StockParams {
  hostile: HostileParams;
  ipo: { fromYear: number; minPeople: number; profitYears: number; minRevenueCent: Cent; minRevenueYear: number; creditNotes: string[]; shareBp: [Bp, Bp]; shares: number; startSentiment: number; moodBp: Record<MarketPhase, Bp> };
  priceBaseBp: Bp;
  priceSpanBp: Bp;
  tickerChangeBp: Bp;
  /** Prüfung Fable 03.11.2026: „umsatz“ misst die Zielmarke am Umsatz (Wertung wirkt über Hit und Flop), „gewinn“ wie Formel 5.7. */
  target: { basis: "umsatz" | "gewinn"; growthBp: Bp; lossBp: Bp; revenueShareBp: Bp };
  delta: { strongBp: Bp; strongUp: number; up: number; down: number; strongDown: number; lossMiss: number };
  meanRevert: { center: number; factorBp: Bp };
  events: { hitScoreBp: Bp; hit: number; flopScoreBp: Bp; flop: number; delay: number; kinds: Record<string, number>; acquisition: number; record: number; phase: Record<MarketPhase, number>; maxAbs: number };
  dividend: { shareBp: Record<DividendLevel, Bp>; delta: Record<DividendLevel, number>; cut: number };
  raise: { maxShareBp: Bp; minSentiment: number; delta: number };
  assembly: { below: number; accept: number; reject: number; savingsBp: Bp; savingsWeeks: number; moraleBp: Bp };
  excitedFrom: number;
  excitedApplicantsBp: Bp;
}

/** S13 AUS-R83, AUS-R90, AUS-R91: feindliche Übernahme gegen den Spieler, Übernahmeschutz, Rückkauf. */
export interface HostileParams {
  dilutionPerYearBp: Bp;
  majorityBp: Bp;
  chanceBp: Bp;
  premiumBp: Bp;
  decisionWeeks: number;
  cooldownWeeks: number;
  acceptBaseBp: Bp;
  acceptCenter: number;
  acceptPerPointBp: Bp;
  protectionSentiment: number;
  buybackMaxBp: Bp;
  buybackPremiumBp: Bp;
  buybackSentiment: number;
}

export interface StockState {
  listed: boolean;
  ipoWeek: number | null;
  shares: number;
  /** Aktien in fremder Hand (Anteil beim Börsengang plus Kapitalerhöhungen). */
  publicShares: number;
  /** FRM-R52: Anlegerstimmung S, ganze Zahl 0–100. */
  sentiment: number;
  /** Formel 5.7: Zielmarke des laufenden Quartals (vor Quartalsbeginn sichtbar). */
  targetCent: Cent;
  dividend: DividendLevel;
  dividendCut: boolean;
  /** Δ Ereignisse, die im laufenden Quartal gemeldet wurden (Skandale, Verschiebungen, Übernahmen). */
  eventDelta: number;
  lastRaiseYear: number;
  priceCent: Cent;
  history: { quarter: number; sentiment: number; priceCent: Cent; profitCent: Cent; targetCent: Cent; revenueCent?: Cent }[];
  /** FRM-R53: Sparprogramm bis zu dieser Woche. */
  savingsUntilWeek: number;
  lastAssemblyYear: number;
  /** S13 AUS-R90: Übernahmeschutz an; letzte Woche eines Rückkaufs. */
  protection: boolean;
  lastBuybackWeek: number;
  /** S13 AUS-R83: laufendes feindliches Angebot (Bieter, Preis je Aktie, Frist) und Sperre danach. */
  hostile: { raiderId: number | null; raider: string; priceCent: Cent; untilWeek: number } | null;
  hostileCooldownUntil: number;
}

export interface IpoInput { type: "ipo"; shareBp: Bp }
export interface DividendInput { type: "dividend"; level: DividendLevel }
export interface CapitalRaiseInput { type: "capitalRaise"; shareBp: Bp }

/** S09 UEB-R01 bis UEB-R42 (data/core/acquisitions.json, Etappe 6b). */
export interface AcquisitionParams {
  unlockYear: number;
  unlockPeople: number;
  /** S09 Formel 5: Ertrag, Marken, Technik, Plattform, Team. */
  value: { earningsMultBp: Bp; earningsYears: number; brandFactorBp: Bp; engineMultBp: Bp; platformMultBp: Bp; teamFactorBp: Bp; strengthPivot: number };
  range: { offsetBp: Bp; widthBp: Bp; checkedWidthBp: Bp };
  diligence: { costBp: Bp; minCostCent: Cent; weeksBySize: [number, number][] };
  findings: { countMax: number; chanceBp: Bp; types: Record<FindingType, [Bp, Bp]> };
  price: { controlBp: Bp; bidderBp: Bp; maxBidders: number; bidderChanceBp: Bp; phaseBp: Record<MarketPhase, Bp>; rivalGrudgeBp: Bp; counterFromBp: Bp; blockWeeks: number; answerWeeks: number };
  warnMonths: number;
  integration: { weeksBySize: [number, number][]; capacityBase: number; capacityMax: number; overloadBp: Bp; moralePerWeekBp: Bp; delayBp: Bp; cultureMinFitBp: Bp; cultureLongerBp: Bp; cultureMoraleBp: Bp };
  /** Prüfung Fable 03.11.2026: Halteprämie automatisch (Anteil eines Jahresgehalts), solange die Kasse das Vielfache trägt. */
  leave: { q0Bp: Bp; cultureBp: Bp; directiveBp: Bp; retentionBp: Bp; retentionWeeks: number; autoRetentionShareBp: Bp; autoRetentionCashFactor: number };
  synergyMaxBp: Bp;
  synergyFromBp: Bp;
  writeDownBelowBp: Bp;
  transferBp: Bp;
  steeredMoraleBp: Bp;
  withdrawMoraleBp: Bp;
  closeReputation: [Bp, Bp];
  /** S09 Abschnitt 7 (6b.5): KI-Käufer. */
  ai: { archetypes: string[]; chancePerQuarterBp: Bp; cashFactorBp: Bp; bidBp: [Bp, Bp]; capacity: number; maxTargetValueBp: Bp };
}

export type FindingType = "schulden" | "projektSchieflage" | "wechselwillig" | "rechtsstreit" | "technikschuld" | "positivPrototyp";
export interface AcqFinding { type: FindingType; impactBp: Bp }
export type Autonomy = "selbststaendig" | "rahmen" | "gesteuert";
export interface Directives { autonomy: Autonomy; genres: string[]; maxScope: Scope | null }

/** UEB-R03: laufendes Kaufverfahren des Spielers. */
export interface AcquisitionDeal {
  id: number;
  targetId: number;
  phase: "sondiert" | "warten" | "gegenangebot" | "abgeschlossen" | "gescheitert";
  diligence: "keine" | "laufend" | "fertig";
  diligenceWeeksLeft: number;
  bidCent: Cent;
  loanCent: Cent;
  retentionCent: Cent;
  counterCent: Cent;
  bidders: number[];
  answerWeek: number;
}

/** Wissen über eine Zielfirma: Versatz der Spanne (UEB-R05), Befunde, Sperre nach Ablehnung (UEB-R09). */
export interface AcqTarget { offsetBp: Bp; findings: AcqFinding[]; blockedUntil: number }

export interface AcquisitionState {
  deals: AcquisitionDeal[];
  nextDealId: number;
  targets: Record<string, AcqTarget>;
  /** UEB-T10: KI-Konzerne, die an zu vielen Käufen zerbrochen sind. */
  aiOverreach: number;
}

/** S09 Subsidiary (6b.4): Tochter eines Konzerns; ownerId 0 = Spieler, sonst KI-Studio. */
export interface Subsidiary {
  ownerId: number;
  acquiredWeek: number;
  purchaseCent: Cent;
  bookCent: Cent;
  integration: { progressBp: Bp; weeks: number; state: "gut" | "angespannt" | "chaos" };
  moraleBp: Bp;
  cultureFitBp: Bp;
  directives: Directives;
  retentionCent: Cent;
  retentionUntilWeek: number;
  transferBp: Bp;
  quarterCashStart: Cent;
  /** UEB-R07: verborgene Befunde, die nach dem Kauf ohne Prüfung wirksam werden. */
  pendingFindings: AcqFinding[];
  /** ZIE-R02 „Integration ohne Abwanderung“: Personen, die während der Integration gegangen sind. */
  leftCount: number;
}

export interface AcquireInput {
  type: "acquire";
  action: "sondieren" | "pruefen" | "bieten" | "annehmen" | "zurueckziehen";
  targetId?: number;
  dealId?: number;
  bidCent?: Cent;
  loanCent?: Cent;
  retentionCent?: Cent;
}

export interface SubsidiaryInput {
  type: "subsidiary";
  studioId: number;
  action: "vorgaben" | "schliessen" | "zuschiessen" | "entnehmen" | "halten";
  directives?: Directives;
  amountCent?: Cent;
}

/** S08 MRK-R57, MRK-R58, MRK-R68 (data/market/future.json): Wendepunkte der Zukunftsepoche. */
export interface FuturePointDef {
  id: string;
  area: "technik" | "plattformen" | "werkzeuge" | "regulierung" | "markt";
  years: [number, number];
  /** Plattform-Wendepunkt: neue Plattformart, Chance auf den Massenmarkt und Faktoren auf die erreichbare Basis. */
  platforms?: string[];
  chanceBp?: Bp;
  hit?: Record<string, Bp>;
  miss?: Record<string, Bp>;
  /** Markt-Wendepunkt: setzt die Marktphase. */
  phase?: MarketPhase;
  /** Zukunfts-Kette: erste Stufe (Katalog-Ereignis mit stage). */
  chain?: string;
}

export interface FutureParams {
  fromYear: number;
  lastYear: number;
  count: [number, number];
  chainCount: [number, number];
  rumor: { leadMonths: [number, number]; fuzzMonths: Record<AnalyticsLevel, number>; falseAlarmBp: Bp; shownChanceBp: Bp };
  bet: { windowMonths: number; maxStakeBp: Bp; platformExperienceBp: Bp; returnFactorBp: Bp };
  investBoost: { shareBp: Bp; maxBp: Bp; lookbackWeeks: number };
  points: FuturePointDef[];
}

export type FuturePointStatus = "verborgen" | "geruecht" | "eingetreten" | "geplatzt";

export interface FuturePoint {
  id: number;
  defId: string;
  /** Woche des Eintritts (beim Fehlalarm: Woche, in der das Gerücht platzt). */
  week: number;
  rumorWeek: number;
  falseAlarm: boolean;
  /** Lage des wahren Termins im angezeigten Zeitraum, −5.000 bis 5.000 bp der Breite (MRK-R68). */
  offsetBp: Bp;
  status: FuturePointStatus;
  /** Plattform-Wendepunkt: Massenmarkt erreicht. */
  hit?: boolean;
}

export interface FutureBet {
  pointId: number;
  pinWeek: number;
  stakeCent: Cent;
  result: "offen" | "treffer" | "daneben";
}

export interface FutureState {
  generated: boolean;
  points: FuturePoint[];
  bets: FutureBet[];
  nextPointId: number;
  /** Tempo-Zuschlag der KI-Werkzeuge auf die Arbeitsleistung (Kette „KI-Werkzeug-Welle“). */
  toolSpeedBp: Bp;
  /** Faktor je Plattform auf die erreichbare Basis nach Plattform-Wendepunkten. */
  platformBp: Record<string, Bp>;
}

/** MRK-R58: Wette auf die Zukunft (Pin auf ein Gerücht mit Budgetanteil). */
export interface FutureBetInput {
  type: "futureBet";
  pointId: number;
  pinWeek: number;
  stakeBp: Bp;
}

/** S07 FRM-R42 bis FRM-R47, Tabelle 5.8: Vertragspunkte eines Publisher-Angebots. */
export interface PublisherTerms {
  advanceBp: Bp;
  splitBeforeBp: Bp;
  splitAfterBp: Bp;
  markupBp: Bp;
  termYears: number;
  ipPublisher: boolean;
  sequelOption: boolean;
}

export type PublisherPersonality = "grosszuegig" | "markenfreundlich" | "ausgewogen";
export type NumericTerm = "advanceBp" | "splitBeforeBp" | "splitAfterBp" | "markupBp" | "termYears";

export interface PublisherParams {
  /** S13 AUS-R40 bis AUS-R43: eigenes Publishing (1.3). */
  own: OwnPublishingParams;
  countByYear: [number, number][];
  startCapitalCent: Cent;
  capitalFactorBp: [Bp, Bp];
  reputationBp: [Bp, Bp];
  interestThresholdBp: Bp;
  thresholdPerReputationBp: Bp;
  maxBudgetShareBp: Bp;
  maxAnswers: number;
  offerWeeks: number;
  brandFactor: { baseBp: Bp; perStrengthBp: Bp };
  reputationFactor: { baseBp: Bp; perReputationBp: Bp };
  sliceInterestBp: Bp;
  crisisNewIpBp: Bp;
  sliceFromPhase: string;
  concession: { baseBp: Bp; perInterestMarginBp: Bp; perRivalOfferBp: Bp; sliceBp: Bp; maxBp: Bp; ipBp: Bp; sequelBp: Bp };
  defaults: PublisherTerms & { patience: number };
  ranges: Record<NumericTerm, [number, number]>;
  personalities: Record<PublisherPersonality, Partial<PublisherTerms> & { ipFixed?: boolean; patience: number }>;
  milestones: { lateWeeks: number; cutBp: Bp };
  names: { first: string[]; suffix: string[] };
}

/** FRM-R42: KI-Publisher mit Kapital, Ruf und Persönlichkeit (ANNAHME: eigene Firmen ohne Studios). */
export interface Publisher {
  id: number;
  name: string;
  capitalCent: Cent;
  reputationBp: Bp;
  personality: PublisherPersonality;
  foundedWeek: number;
}

/** FRM-R43, FRM-R44: Angebot mit Spielraum (Zugeständnis-Rahmen) und Geduld; gilt bis expiresWeek. */
export interface PublisherOffer {
  id: number;
  publisherId: number;
  projectId: number;
  mode: "konzept" | "slice";
  budgetCent: Cent;
  interestBp: Bp;
  terms: PublisherTerms;
  /** Startangebot des Publishers; Zugeständnisse zählen von hier. */
  base: PublisherTerms;
  capacityBp: Bp;
  patience: number;
  ipFixed: boolean;
  expiresWeek: number;
}

/** FRM-R45, FRM-R46: laufender Vertrag am Projekt. */
export interface PublisherDeal {
  publisherId: number;
  terms: PublisherTerms;
  signedWeek: number;
  budgetCent: Cent;
  advanceCent: Cent;
  paidCent: Cent;
  /** Raten je Meilenstein (Phasenende); die erste fließt bei Unterschrift. */
  rates: { phase: string; untilBp: Bp; dueWeek: number; amountCent: Cent; paid: boolean; missed: boolean; cutBp: Bp }[];
  /** Anteil des Publishers an den Einnahmen bis zum Recoup (Vorschuss + Aufschlag). */
  recoupedCent: Cent;
  publisherIncomeCent: Cent;
  misses: number;
  stopped: boolean;
  endWeek: number | null;
}

/** S07 FRM-R32, FRM-R33, FRM-R72: Regionen (ANNAHME: fünf, nur für Lohn, Förderung und Steuer). */
export type Region = "na" | "eu" | "jp" | "cn" | "latam";

export interface RegionParams {
  home: Region;
  regions: Record<Region, { wageFactorBp: Bp; subsidyBp: Bp; taxRateBp: Bp }>;
  locations: {
    buildWeeks: number; buildWorkBp: Bp; places: number; depositMonths: number; onboardWeeks: number; maxLocations: number; leadUnits: number;
    closeReputationBp: Bp;
  };
}

/** FRM-R32: weiterer Standort (der Heimatstandort ist implizit, Personen ohne locationId). */
export interface Location {
  id: number;
  region: Region;
  openedWeek: number;
  /** Ende des Aufbaus (6 Monate mit halber Leistung). */
  readyWeek: number;
}

/** MRK-R59: Marktphase. */
export type MarketPhase = "boom" | "normal" | "krise";

/** MRK-R36, MRK-R59, MRK-R60: Phasen aus Daten (bis 2025 fest, danach aus dem Seed) und ihre Wirkung. */
export interface MarketPhaseParams {
  historical: { from: number; to: number; phase: MarketPhase }[];
  seedFromYear: number;
  durationYears: Record<MarketPhase, [number, number]>;
  effects: Record<MarketPhase, {
    aiBudgetBp: Bp; aiTeamSizeBp: Bp; loanRateAddBp: Bp; salaryBp: Bp; foundPerQuarter: [number, number]; applicationsBp: Bp;
  }>;
}

/** MRK-R59: aktuelle Phase, letztes Jahr der Phase und die Phase vor der letzten normalen (für die Folge). */
export interface MarketPhaseState {
  phase: MarketPhase;
  toYear: number;
  prev: MarketPhase;
}

/** MRK-R55: Folge einer Option, bis zu 12 Wochen verzögert, mit Chance (Eskalation). */
export interface ChainNext {
  def: string;
  delayWeeks: [number, number];
  chanceBp?: Bp;
}

/** KRN-R32, MRK-R53: laufende Ereigniskette (nächste Stufe, fällig ab Woche, Ziele, gewählte Optionen). */
export interface ChainState {
  id: number;
  defId: string;
  dueWeek: number;
  projectId: number | null;
  productId?: number;
  personId?: number;
  /** ChainState.memory: „Stufe:Option“ der bisherigen Stufen. */
  memory: string[];
}

/** S01 EventDef: Klasse, Auslöser, Gewicht, Abklingzeit, Optionen; historische Ereignisse mit festem Termin. */
export interface EventDef {
  id: string;
  class: "entscheidung" | "information";
  trigger: Condition | null;
  weightBp: Bp;
  cooldownWeeks: number;
  target: "projekt" | "person" | "angestellter" | "letztesProdukt" | "starkeMarke" | "altePlattform" | null;
  /** MRK-R55: eine Folgestufe oder Alternativen; eine Zufallszahl wählt über die aufsummierten Chancen. */
  options: { id: string; effects: Effect[]; isDefault: boolean; next?: ChainNext | ChainNext[] }[];
  scope?: "projekt";
  /** MRK-R54: Kette mit Rang (Krise vor Chance vor Information); stage = nur als Folgestufe, nie ausgelost. */
  chain?: "krise" | "chance" | "information";
  stage?: boolean;
  /** Folgestufe ohne Entscheidung: Wirkungen beim Eintreten (Meldung) und die Stufe danach. */
  effects?: Effect[];
  next?: ChainNext | ChainNext[];
  historical?: { year: number; weekOfYear: number };
  /** S01 5.1: Krisen sind von der Auslosung ausgenommen und haben Vorrang; sie belegen den Wochenplatz (TEC-R13). */
  forced?: boolean;
}

export interface CatalogParams {
  chancePerWeekBp: Bp;
  events: EventDef[];
}

/** KRN-R40, KRN-R41: Freischaltungen aus Daten. */
export interface UnlockParams {
  perYear: number;
  maxWaitWeeks: number;
  systems: { id: string; condition: Condition; ownEvent: boolean }[];
}

/** KRN-R62: Jahrbuch in Woche 52. */
export interface Yearbook {
  year: number;
  releases: { title: string; scoreBp: Bp }[];
  incomeCent: Cent;
  costsCent: Cent;
  people: number;
  chronicle: LogEntry[];
}

/** S03 ModuleLevelDef: frühestes Jahr und Voraussetzungen je Stufe (Index = Stufe), data/engine/modules.json. */
export interface ModuleLevelDef {
  earliestYear: number;
  requires?: ModuleNeed[];
}

/** S03 Abschnitt 5: Module, Forschung, Engine-Faktor. */
export interface EngineParams {
  modules: ModuleMap<ModuleLevelDef[]>;
  /** ENG-R06: Starter-Engine. */
  starter: ModuleMap;
  /** Etappe 6c.10: Bei späterem Startjahr entspricht die Starter-Engine dem Stand der Technik so viele Jahre zuvor. */
  starterLagYears: number;
  /** ANNAHME (Plan Etappe 2, Punkt 2): Forschungsaufwand 40 Personenwochen · 1,8^Stufe, mindestens 8 Wochen. */
  /** Balancing 1.0 (Entscheidung Projektleitung 03.11.2026): Hinweis, wenn ein Modul der eigenen Engine mehr Stufen zurückliegt. */
  behindWarnLevels: number;
  researchBasePwBp: Bp;
  researchGrowthBp: Bp;
  /** ANNAHME (Inhaltsausbau nach 3.12): eigenes Wachstum für Module mit feineren Stufen (Rendering, Audio). */
  researchGrowthByModuleBp?: Partial<ModuleMap<Bp>>;
  minResearchWeeks: number;
  /** S03 5.1: Exponent γ, Vorreiter-Grenze, Spanne von E und Lizenzqualität L = (E − 0,3) / 0,85. */
  factor: { gammaBp: Bp; pioneerMaxBp: Bp; minBp: Bp; maxBp: Bp; licenseMinBp: Bp; licenseSpanBp: Bp };
  /** S03 5.2, ENG-R20 bis ENG-R23 (data/engine/debt.json); Schuld 0–100 Punkte als 0–10.000 bp. */
  debt: {
    perUpdateBp: Bp;
    /** Wartung: Schuld-Abbau je Personenwoche Wartung. */
    maintenancePerPwBp: Bp;
    tempoPerDebtBp: Bp;
    bugsPerDebtBp: Bp;
    updateCostPerDebtBp: Bp;
    rebuildRecommendBp: Bp;
    highDebtCostFactorBp: Bp;
    afterRebuildBp: Bp;
    recommendCooldownWeeks: number;
  };
  /** ENG-R04, ENG-R05, S03 Abschnitt 6 (data/engine/versions.json). */
  versions: { majorShareBp: Bp; defaultPlan: EnginePlan };
  /** ENG-R30 bis ENG-R32, Plan Etappe 2 Punkt 5 (data/engine/middleware.json). */
  middleware: { vendors: MiddlewareVendor[]; feeScopeBp: ScopeMap;
    /** S13 AUS-R70, AUS-R71: eigene Module einzeln an KI-Studios mit Hausmitteln (Schalter an der Lizenzvorlage). */
    playerOffer: { chanceBp: Bp; minLevelGap: number; feePerLevelCent: Cent; maxModulesPerStudio: number; cashYears: number } };
  /** ENG-R42, ENG-R44, S03 5.3 (data/engine/binding.json). */
  binding: {
    /** w_i je Umfang in bp-Wochen je übernommenem Modul. */
    integrationWeeksBp: ScopeMap;
    updateBugShareBp: Bp;
    majorSwitchWeeks: { konzept: number; preprod: number; produktionMin: number; produktionMax: number; late: number };
  };
  /** ENG-R50 bis ENG-R53 (data/engine/requests.json). */
  requests: { makeshiftEffectBp: Bp; makeshiftDebtBp: Bp; defaultPriority: number };
  /** S04 Lizenzmarkt (data/engine/licensing.json). */
  licensing: LicensingParams;
}
