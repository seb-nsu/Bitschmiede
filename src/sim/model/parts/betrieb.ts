// Bugs, Betrieb und Live-Service (S06).
// Teil von src/sim/model/types.ts (Prüfung Fable 03.11.2026: Aufteilung nach System); Importe immer über „../model/types“.
import type { Bp, Cent } from "../../num";
import type { ChainNext, DemandTier, LiveKind } from "./daten";
import type { Scope } from "./grundlagen";
import type { AiArchetype, AiSize } from "./ki";
import type { ProductPricing, ProductProtection } from "./projekt";
import type { Anchors } from "./spielstand";

export const SEVERITIES = ["leicht", "mittel", "schwer"] as const;
export type Severity = (typeof SEVERITIES)[number];
export type SeverityMap = Record<Severity, number>;
export type PatchSize = "klein" | "gross";

/** S06 Abschnitt 5: Startwerte des Betriebs (data/base/ops/operations.json). */
export interface OperationsParams {
  knownAtReleaseBp: Bp;
  severitySharesBp: Record<Severity, Bp>;
  findRateBp: Bp;
  findHalfPlayers: number;
  playerWeeks: number;
  patch: { effortPersonWeeks: Record<PatchSize, number>; bugsPerPersonWeekAnchors: Anchors; consoleFromYear: number; consoleCertWeeks: number };
  satisfaction: {
    neutralBp: Bp; rhoBp: Bp; patchBp: Bp; freeUpdateBp: Bp; severePerTen: Bp; severeMaxPerWeekBp: Bp; wordOfMouthBp: Bp;
    backlogPer10PctBp: Bp; backlogMaxBp: Bp; answeredBp: Bp; outsourcedAnsweredBp: Bp;
    /** BTR-R13: mehr als dlcFloodPerYear DLC in 52 Wochen kosten je weiterem DLC dlcFloodBp. */
    dlcFloodPerYear: number; dlcFloodBp: Bp;
  };
  /** BTR-F2: Anfragen = Verkäufe · (a + b · B + c · Online) + d · B_live. */
  tickets: { baseBp: Bp; bugsBp: Bp; onlineBp: Bp; perLivePlayerBp: Bp; bugNorm: number; weights: Record<Severity, number>; salesWeeks: number };
  department: {
    unlockOpenTickets: number;
    splitBp: Record<OpsPot, Bp>;
    ticketsPerPersonMonthAnchors: Anchors;
    outsourceCostBp: Bp;
    autoHeadroomBp: Bp;
    maxSize: number;
    supportRequestsPerContract: Record<string, number>;
    supportPerPersonMonth: number;
    engineSupportDaysPerRequestBp: Bp;
    engineSupportMaxMalusBp: Bp;
    workDaysPerWeek: number;
  };
  /** BTR-R25: Kanal der Kundenanfragen je Epoche (nur Darstellung). */
  channels: [number, string][];
}

/** S06 Abschnitt 5: Startwerte der Live-Produkte (data/base/ops/liveservice.json, BTR-F1). */
export interface LiveServiceParams {
  /** BTR-R15 (Etappe 6a.8): Kampagnen für laufende Live-Produkte. */
  campaign: { costPerPlayerAnchorsCent: Anchors; satisfactionPivotBp: Bp; satisfactionFactorBp: [Bp, Bp]; capShareBp: Bp; minEfficiencyBp: Bp; maxMonthlyCentAnchors: Anchors };
  /** c₀ Grund-Churn je Monat. */
  baseChurnBp: Record<LiveKind, Bp>;
  /** c₁ Konkurrenz, c₂ je Woche Content-Pause, c₃ veraltete Technik, c₄ Zufriedenheit. */
  c1Bp: Bp; c2PerWeekBp: Bp; c3Bp: Bp; c4Bp: Bp;
  maxChurnBp: Bp;
  /** Obergrenze der gezählten Pausenwochen (ANNAHME). */
  maxPauseWeeks: number;
  rhythmWeeks: Record<LiveKind, number>;
  /** Content-Drop: Rückkehrer und Neugierige als Anteil der Basis; Zufriedenheit je Drop. */
  dropJoinBp: Bp;
  dropSatisfactionBp: Bp;
  /** BTR-R23: Live-Ops-Bedarf = typische Teamgröße des Umfangs · Teamanteil des Typs. */
  teamByScope: Record<Scope, number>;
  /** BTR-R34 bis BTR-R38: Server (gleichzeitige Spieler, Preise je gleichzeitigem Spieler und Monat). */
  server: {
    concurrentBp: Bp;
    peakMinBp: Bp; peakMaxBp: Bp; peakWeeks: number;
    ruleBp: Bp; ruleMinBp: Bp; ruleMaxBp: Bp;
    roomCapacityAnchors: Anchors;
    /** Einheiten je Raum in bp (Serverraum 1, Rechenzentrum 10). */
    roomUnitsBp: Record<string, Bp>;
    rentBlock: number; rentLeadWeeks: number;
    cloudFromYear: number; cloudGrowthBp: Bp; cloudStartUnits: number;
    rentCentAnchors: Anchors; cloudCentAnchors: Anchors; ownCentAnchors: Anchors;
    outageSatisfactionBp: Bp;
  };
  /** BTR-R28 bis BTR-R30: Analytics (Churn-Senkung a, ARPU, Personen, Prognose-Spanne, Drops). */
  analytics: {
    fromYear: number;
    churnBp: Record<AnalyticsLevel, Bp>;
    arpuBp: Record<AnalyticsLevel, Bp>;
    people: Record<AnalyticsLevel, number>;
    forecastSpreadBp: Record<AnalyticsLevel, Bp>;
    dropJoinBp: Record<AnalyticsLevel, Bp>;
    /** KI-R09: KI-Studios nutzen Analytics ab 2010 nach Größe. */
    aiLevel: Record<AiSize, AnalyticsLevel>;
  };
  /** S06 Abschnitt 7: KI-Live-Produkte (Chance je Release, Härte nach Persönlichkeit, Rhythmus nach Größe). */
  ai: {
    fromYear: Record<LiveKind, number>;
    chanceBp: Record<AiSize, Bp>;
    hardnessBp: Record<AiArchetype, Bp>;
    keepRhythmBp: Record<AiSize, Bp>;
    competitionBp: Bp;
    shutdownLossMonths: number;
  };
  /** BTR-R03, S06 Abschnitt 6: Delegation im Betrieb. */
  delegation: { producersFromLive: number; minPotBp: Bp; patchBelowBp: Bp; patchPeople: number; shutdownBelowPlayers: number; shutdownMinWeeks: number };
  /** ANNAHME: Anteil des Rhythmus ohne Abteilung Betrieb (das Entwicklungsteam macht Inhalte nebenher). */
  noDepartmentRatioBp: Bp;
  /** BTR-R21: Abogebühr (MMO) je Monat; Season-Pass-Erlös je Spieler und Monat (Live-Service). */
  subscriptionAnchorsCent: Anchors;
  seasonArpuAnchorsCent: Anchors;
  /** BTR-R20: F2P-ARPU je Monat nach Härte (0–10.000 bp) im Jahr 2010; danach mit dem Preisniveau. */
  f2pArpuByHardnessCent: Anchors;
  f2pArpuYearAnchorsBp: Anchors;
  defaultHardnessBp: Bp;
  /** BTR-R20: Härte über der Schwelle kostet Zufriedenheit je Woche (bei Härte 100 der volle Wert). */
  hardnessSatisfactionFromBp: Bp;
  hardnessSatisfactionMaxBp: Bp;
  /** BTR-R22, S06 Startwerte: Einstellen kostet Markenstärke −10 (über die Bekanntheit) und Ruf −5 ab 100.000 Spielern. */
  shutdownAwarenessBp: Bp;
  shutdownReputationBp: Bp;
  shutdownReputationFromPlayers: number;
}

/** BTR-R15 ff.: Live-Betrieb eines Produkts (MMO, Live-Service, F2P). */
export interface LiveState {
  kind: LiveKind;
  /** Spielerbasis B. */
  base: number;
  /** Verkaufte Stück bis zur letzten Woche (Zugang = Differenz). */
  soldSeen: number;
  joinedThisMonth: number;
  joinedLastMonth: number;
  /** BTR-F1: Churn des letzten Monats und seine Aufschlüsselung (Wasserfall). */
  churnBp: Bp;
  churnParts: { baseBp: Bp; competitionBp: Bp; pauseBp: Bp; techBp: Bp; satisfactionBp: Bp };
  /** BTR-R17: Content-Fortschritt in bp-Wochen und letzter Drop. */
  contentProgressBp: number;
  lastDropWeek: number;
  drops: number;
  /** BTR-R20: Monetarisierungs-Härte 0–100 als bp (nur F2P wirksam). */
  hardnessBp: Bp;
  /** Umsatz je Spieler und Monat (zuletzt) und Live-Umsatz der Woche. */
  arpuCent: Cent;
  weekRevenueCent: Cent;
  revenueCent: Cent;
  /** BTR-R22: eingestellt (Woche) oder null. */
  shutdownWeek: number | null;
  /** Spielerbasis je Monat (höchstens 60, Sparkline). */
  history: number[];
  /** BTR-R18, BTR-R34 bis R38: Server des Produkts. */
  server: ServerState;
  /** BTR-R15: Kampagnen-Budget je Monat (0 = keine Kampagne) und Zugang daraus im laufenden Monat. */
  campaignCent: Cent;
  campaignJoined: number;
}

/** BTR-R34 bis BTR-R38: Serverkapazität eines Live-Produkts in gleichzeitigen Spielern. */
export interface ServerState {
  /** Zugeteilte eigene Kapazität (Serverraum, Rechenzentrum) dieser Woche. */
  own: number;
  /** BTR-R35: gemietet (bereit) und bestellt (bereit ab Woche). */
  rented: number;
  orders: { week: number; units: number }[];
  /** BTR-R36: Cloud ab 2010. */
  cloud: number;
  /** BTR-R37: Regel „Kapazität = Bedarf × Faktor“ an oder aus. */
  rule: boolean;
  ruleBp: Bp;
  /** BTR-R38: Startspitze (2–4 × Bedarf, Seed) in den ersten Wochen. */
  peakBp: Bp;
  startWeek: number;
  demand: number;
  outages: number;
  lastOutageWeek: number | null;
  weekCostCent: Cent;
}

/** BTR-R28: Analytics-Stufen. */
export const ANALYTICS_LEVELS = ["keine", "grundlegend", "intensiv"] as const;
export type AnalyticsLevel = (typeof ANALYTICS_LEVELS)[number];

export const OPS_POTS = ["liveops", "service", "community", "support"] as const;
export type OpsPot = (typeof OPS_POTS)[number];

/** S06 Operations je Firma (BTR-R01 bis BTR-R04, BTR-R24, BTR-R27). */
export interface OperationsState {
  /** BTR-R02: Auslöser erfüllt (Online-Produkt, Lizenz mit Support oder 20 offene Anfragen in einem Monat). */
  triggered: boolean;
  size: number;
  /** Größe folgt dem Vorschlag nach Last (Standard, S06 Abschnitt 6). */
  auto: boolean;
  splitBp: Record<OpsPot, Bp>;
  outsourced: boolean;
  /** Offene Kundenanfragen und neue Anfragen des letzten Monats. */
  backlog: number;
  ticketsLastMonth: number;
  answeredLastMonth: number;
  /** BTR-R27: Support-Anfragen der Lizenznehmer im letzten Monat und Anteil, der beantwortet wurde. */
  supportRequests: number;
  supportFulfillmentBp: Bp;
  /** BTR-R02: Tempo-Abzug des Engine-Teams, solange es den Support selbst beantwortet. */
  engineMalusBp: Bp;
  /** BTR-R28: Analytics-Stufe der Firma (ab 2010). */
  analytics: AnalyticsLevel;
  /** BTR-R03: Produzenten verteilen die Töpfe (aus, sobald der Spieler die Aufteilung selbst setzt). */
  splitAuto: boolean;
  /** S06 Abschnitt 6: Regel „Zufriedenheit unter 60 → Patch“ und Schwelle für den Einstellen-Vorschlag. */
  autoPatch: boolean;
  shutdownBelow: number;
}

/** S06 Product.ops: Betrieb eines veröffentlichten Spiels. */
export interface ProductOps {
  /** BTR-R11: Community-Zufriedenheit 0–100 als 0–10.000 bp. */
  satisfactionBp: Bp;
  /** BTR-R05: bekannte und noch verborgene Bugs nach Schwere. */
  known: SeverityMap;
  hidden: SeverityMap;
  /** BTR-R07: laufender Patch (Personen, Restwochen, behebt am Ende so viele Bugs) oder null. */
  patch: { size: PatchSize; people: number[]; weeksLeft: number; fixes: number } | null;
  patches: number;
  /** Zufriedenheit je Woche (höchstens 52, für die Sparkline). */
  history: number[];
  /** BTR-R15: Live-Betrieb (MMO, Live-Service, F2P) oder null. */
  live: LiveState | null;
  /** S06 Abschnitt 9: Woche des letzten „Schwerer Bug gefunden“, Meldung „unter 40“ aktiv, Liga-Anfrage gestellt. */
  lastSevereEventWeek?: number;
  lowWarned?: boolean;
  leagueOffered?: boolean;
}

/** S06 Abschnitt 9: Startwerte der Betriebs-Ereignisse (data/base/ops/events.json). */
export interface OpsEventParams {
  lowSatisfactionBp: Bp;
  severeBug: { cooldownWeeks: number; hotfixCentPerBug: Cent; hotfixSatisfactionBp: Bp; ignoreSatisfactionBp: Bp };
  outage: { compensationCentPerPlayer: Cent; compensationSatisfactionBp: Bp; sitOutSatisfactionBp: Bp };
  cheater: {
    baseRiskBp: Bp; uncoveredFactorBp: Bp; playersPerCommunityPerson: number; antiCheatCent: Cent; antiCheatSatisfactionBp: Bp;
    banShareBp: Bp; banSatisfactionBp: Bp; ignoreSatisfactionBp: Bp;
  };
  lootbox: { fromYear: number; fromHardnessBp: Bp; perTenPointsBp: Bp; intensiveFactorBp: Bp; softenBp: Bp; abolishSatisfactionBp: Bp; defendSatisfactionBp: Bp; defendReputationBp: Bp };
  leak: {
    fromYear: number; baseRiskBp: Bp; affectedBp: Bp; compensationCentPerPlayer: Cent; discloseSatisfactionBp: Bp;
  };
  league: { fromYear: number; minPlayers: number; riskBp: Bp; genres: string[]; playersBp: Bp; awarenessBp: Bp };
  /** MRK-R55, 6a.2: Folgestufen der Betriebs-Ereignisse je „Art:Option“. */
  chains: Record<string, ChainNext | ChainNext[]>;
}

export interface ProductSales {
  startWeek: number;
  scoreBp: Bp;
  stock: number;
  sold: number;
  lost: number;
  revenueCent: Cent;
  /** Einnahmen dieser Woche; der Finanz-Schritt bucht sie (KRN-R14). */
  weekRevenueCent: Cent;
  /** Verkaufte Stück je Woche seit dem Release (höchstens 156 Wochen). */
  weekly: number[];
  firstWeekUnits: number;
  shelfLost: boolean;
  orders: { arrivalWeek: number; units: number }[];
  soldOutOffered: boolean;
  ended: boolean;
  /** Wirkung von Ereignissen auf die Nachfrage (Klon, Werbung, Jugendschutz), bp. */
  demandFactorBp: Bp;
  /** PRD-R71: Startfans der Marke, die in den ersten Wochen zusätzlich kaufen (Stück je Woche, Wochen). */
  fanUnitsPerWeek: number;
  fanWeeks: number;
  /** ENG-R30: Umsatzbeteiligung der lizenzierten Module (Summe), die je Woche vom Nettoumsatz an die Anbieter geht. */
  licenseRoyaltyBp: Bp;
  /** MKT-R24: davon digital verkauft (ohne Bestand und Regal). */
  digitalSold: number;
  /** MRK-R30: Konkurrenzfaktor 1 / (1 + κ · Dichte) zum Release; null bei alten Spielständen (dann neu berechnet). */
  competitionBp: Bp | null;
  /** MKT-R09, MKT-R27: Preis je Stück (mit Deluxe-Anteil); fehlt = Vollpreis des laufenden Jahres. */
  priceCent?: Cent;
  /** MKT-R27: Sammler-Edition (Bestand, verkauft, Preis). */
  collector?: { stock: number; sold: number; priceCent: Cent };
  /** MKT-R28 bis MKT-R32, MKT-R55, MKT-R56: Kopierschutz, Piraterie-Rate der Woche, Kopien, Zufriedenheit. */
  protection?: ProductProtection;
  /** MKT-V07: Vertriebsweg (fehlt = alter Spielstand, Handelsanteil wie bisher); MKT-V04: zurückgekommene Ware im Lager. */
  channel?: string;
  returned?: number;
  /** MKT-R26: Rückerstattungsquote digital. */
  refundBp?: Bp;
  /** MKT-V16: Restnachfrage je Preisstufe; MKT-V24: schon vorgeschlagene Verwertungen. */
  remaining?: Record<DemandTier, number>;
  reissuesOffered?: string[];
  /** MKT-V23: Preishoheit an einen Budget-Publisher abgegeben. */
  priceLocked?: boolean;
  /** MKT-R51 bis MKT-R53: erwarteter Absatz zum Release; Abo-Deal bis zu dieser Woche. */
  expectedUnits?: number;
  subscriptionUntil?: number;
  /** ZIE-R05: Preisbonus auf die Verkäufe bis zu dieser Woche. */
  awardUntil?: number;
  /** MKT-V12, MKT-V13: Bundle und Heft-Beilage angeboten bzw. gemacht. */
  bundleOffered?: boolean;
  coverMounted?: boolean;
  /** MKT-R36: Handelsmesse: zusätzliche Wochen bis zum Regalverlust. */
  shelfExtraWeeks?: number;
  /** MKT-R17 bis MKT-R19: Preis zum Release, Normalpreis der Epoche, Rabatt dieser Woche, Gewöhnung der Marke zum Release. */
  pricing?: ProductPricing;
}
