// KI-Studios (S08 MRK-R32 ff., S01 KRN-R75 ff., S14).
// Teil von src/sim/model/types.ts (Prüfung Fable 03.11.2026: Aufteilung nach System); Importe immer über „../model/types“.
import type { Bp, Cent } from "../../num";
import type { LiveKind, Subsidiary } from "./daten";
import type { RivalKeyPerson } from "./delegation";
import type { AreaMap, ModuleMap, Scope } from "./grundlagen";
import type { ProductProtection } from "./projekt";
import type { Anchors } from "./spielstand";

// ---------- KI-Studios (S08 MRK-R32 ff., S01 KRN-R75 ff., S14) ----------

/** S14 Archetypen; Formel 5.5 liefert ihre Gewichte (S08). */
export type AiArchetype = "indie" | "mittelklasse" | "aaa" | "engine" | "publisher";
export type AiSize = "klein" | "mittel" | "gross";

export interface AiArchetypeDef {
  /** Formel 5.5: w_q, w_m, w_k, w_r, w_p. */
  weightsBp: { q: Bp; m: Bp; k: Bp; r: Bp; p: Bp };
  /** ANNAHME bis zum Lizenzmarkt (3.4): Die Engine liegt so viele Jahre hinter dem Stand der Technik. */
  engineLagYears: number;
  /** Abstand der Teamstärke zur Branche (Punkte). */
  strengthOffset: number;
  /** Testwochen nach der Produktion. */
  polishWeeks: number;
  /** Anteil mittlerer Projekte unter den Kandidaten. */
  mittelShareBp: Bp;
  maxPlatforms: number;
  /** MRK-R35: höchstens so viele Teams (ANNAHME, hält die Größenverteilung über die Jahrzehnte). */
  maxTeams: number;
  /** KI-R32: Rücklage in Monatskosten. */
  reserveMonths: number;
  /** MRK-R43: Mindestwertung, gegen die der Abbruch prüft. */
  minScoreBp: Bp;
  /** KI-R14: Vorlage der Budgetverteilung (Summe 10.000 bp). */
  budgetBp: AiBudget;
}

/** KI-R13: Budgetverteilung der Strategiekonferenz, Summe genau 10.000 bp (KI-T10). */
export interface AiBudget {
  projekte: Bp;
  engine: Bp;
  marketing: Bp;
  uebernahmen: Bp;
  ruecklage: Bp;
}

/** S14 Abschnitt 7: Schwierigkeitsparameter je Preset. */
export interface AiDifficulty {
  candidates: number;
  temperatureBp: Bp;
  perceptionSdBp: Bp;
  learningBp: Bp;
  reactionWeeks: number;
  horizonYears: number;
  gutBp: Bp;
  aggressionBp: Bp;
  countersPerYear: number;
  copycatChanceBp: Bp;
  copycatsPerHit: number;
  cooperationThreshold: number;
  /** Balancing 1.0 (Entscheidung Projektleitung 03.11.2026): Jahre, die das Hausmittel der KI zusätzlich hinter dem Stand der Technik liegt. */
  engineLagAddYears: number;
  maxStudios: number;
  rivals: number;
  balancing: "aus" | "sanft";
}

/** S14 6.1: Erwägungen der Projektwahl. */
export type AiConsideration = "qualitaet" | "trend" | "marke" | "kosten" | "risiko" | "plattform" | "dichte" | "schwerpunkt" | "ziel";

export interface AiCurve {
  curve: "linear" | "logistisch" | "invers" | "stufe";
  loBp?: Bp;
  hiBp?: Bp;
  midBp?: Bp;
  steepBp?: Bp;
}

/** S14 6.9: Charakterzug mit Gewichtsfaktoren und der Richtung seiner Bauchentscheidung. */
export interface AiTraitDef {
  weightsBp: Partial<Record<AiConsideration, Bp>>;
  gut: "neuheit" | "billig" | "qualitaet" | "ruhe" | "schwerpunkt" | "gross";
  reserveMonths: number;
}

export interface AiConsiderationParams {
  curves: Record<AiConsideration, AiCurve>;
  extraWeightsBp: { dichte: Bp; schwerpunkt: Bp; ziel: Bp };
  focusRawBp: Bp;
  favoriteRawBp: Bp;
  betRawBp: Bp;
  densityWindowWeeks: number;
  topForSoftmax: number;
  topForGut: number;
  affordableUtilityBp: Bp;
  potOverrunBp: Bp;
  mainGenreChanceBp: Bp;
  scopeRiskBp: Bp;
  /** Etappe 6c.1: große KI-Studios wählen ab der Freischaltung groß bzw. AAA (PRD-R28). */
  bigScope: Record<"gross" | "aaa", { minTeam: number; shareBp: Bp }>;
  flopRiskWeightBp: Bp;
  flopRiskWeeks: number;
  conferenceEveryYearsSmall: number;
  conferencePeople: number;
  extraConferenceSwingBp: Bp;
  favoriteGenres: number;
  logSize: number;
  cancelCheckBp: Bp;
  cancelMarginBp: Bp;
  cancelBudgetBp: Bp;
  savingsMonths: number;
}

/** KI-R04: Eintrag im Entscheidungsprotokoll mit den drei stärksten Erwägungen. */
export interface AiDecision {
  week: number;
  domain: "projekt" | "konferenz" | "abbruch" | "umsteuern" | "sparprogramm" | "engine" | "gegenzug" | "nachahmer" | "duell" | "kooperation" | "chefwechsel";
  choice: string;
  utilityBp: Bp;
  reasons: string[];
  viaGut: boolean;
}

export type RivalGoalId = "genreFuehrer" | "engineImperium" | "kritikerliebling" | "wachstum" | "spielerSchlagen";
export type RivalMood = "selbstbewusst" | "normal" | "unterDruck" | "angeschlagen";
export type ThreatDomain = "genre" | "engine";

export interface RivalParams {
  chiefFirstNames: string[];
  chiefLastNames: string[];
  minArchetypes: number;
  relation: { decayBp: Bp; decayNachtragendBp: Bp; grudgeBp: Bp; respectBp: Bp; knownGoalBp: Bp; historyQuarters: number };
  memory: { licenseWon: Bp; licenseLost: Bp; duelWon: Bp; duelLost: Bp; cooperation: Bp; fairLicense: Bp; poachTry: Bp; poachSuccess: Bp; maxEntries: number };
  goals: Record<RivalGoalId, { years: number; archetypes: AiArchetype[]; consecutiveYears?: number; shareBp?: Bp; titles?: number; scoreBp?: Bp; factorBp?: Bp; quarters?: number; maxRelationBp?: Bp }>;
  goalWeightBp: Bp;
  mood: { confidentRevenueBp: Bp; riskBp: Record<RivalMood, Bp> };
  chiefChange: { goalFailures: number; angeschlagenQuarters: number; chanceBp: Bp };
  threat: { thresholdBp: Bp; overlapFocusBp: Bp; overlapFavBp: Bp; overlapOtherBp: Bp; historyQuarters: number };
  counters: { extraNachtragend: number; lessDiplomat: number; allActorsFactor: number; royaltyCutMinBp: Bp; royaltyCutMaxBp: Bp; rivalGenreWindowWeeks: number };
  copycat: { hitScoreBp: Bp; affinityFocusBp: Bp; affinityFavBp: Bp; affinityOtherBp: Bp; saturationTitles: number; announceMinWeeks: number; announceMaxWeeks: number; windowWeeks: number; penaltyBp: Bp; betterBp: Bp; originalFansBp: Bp };
  duel: { windowWeeks: number; chanceBp: Bp; dodgeWeeks: number; minScope: Scope; shiftCostBp: Bp };
  engineFight: { cutMinBp: Bp; cutMaxBp: Bp };
  startStrength: Record<string, number>;
  cooperationDiscountBp: Bp;
  cooperationDiplomatBp: Bp;
}

export interface RivalGoal {
  id: RivalGoalId;
  sinceWeek: number;
  deadlineWeek: number;
  /** Genre (Genre-Führer), Ausgangswert (Wachstum: Personen) oder Zähler (Jahre, Quartale, Wertungen). */
  genre: string | null;
  base: number;
  progress: number[];
}

/** S14 AiChief, AiMind (Ziele, Bedrohung, Stimmung) und AiMemory eines Rivalen (MRK-R45 ff.). */
export interface RivalState {
  chief: { name: string; sinceWeek: number; goalFailures: number };
  goals: RivalGoal[];
  /** Beziehung −100 bis +100 als −10.000 bis 10.000 bp; Verlauf je Quartal. */
  relationBp: Bp;
  relationHistory: Bp[];
  memory: { week: number; event: string; valueBp: Bp }[];
  mood: RivalMood;
  angeschlagenQuarters: number;
  threat: Record<ThreatDomain, Bp>;
  /** Woche, ab der eine Bedrohung über der Schwelle beantwortet wird (Reaktionszeit der Stufe), je Domäne. */
  reactAtWeek: Record<ThreatDomain, number | null>;
  counters: { year: number; n: number };
  lastQuoteMonth: number;
  /** FRM-R68: Schlüsselpersonen, die der Spieler abwerben kann. */
  keyPeople: RivalKeyPerson[];
}

export interface AiParams {
  /** KRN-R75: Zahl der Studios nach Startjahr, ±10 %, zwischen min und max (MRK-R36). */
  countAnchors: Anchors;
  countVariationBp: Bp;
  minStudios: number;
  maxStudios: number;
  sizeSharesBp: Record<AiSize, Bp>;
  /** ANNAHME: Ein Studio arbeitet mit Teams; klein 1, mittel 2, groß 4. */
  teamsBySize: Record<AiSize, number>;
  /** ANNAHME: Personen je Team nach Jahr (höchstens 7 wie beim Spieler bis zu den Teams aus 3.7). */
  teamSizeAnchors: Anchors;
  /** KRN-R76: kein Archetyp über diesem Anteil, keiner unter seinem Mindestanteil. */
  maxArchetypeShareBp: Bp;
  sizeArchetypes: Record<AiSize, { id: AiArchetype; minShareBp: Bp }[]>;
  archetypes: Record<AiArchetype, AiArchetypeDef>;
  /** ANNAHME (3.12): Verschiebung der KI-Stärke gegen die Marktstärke, damit KI-Teams nicht stärker sind als Bewerber des Spielers samt Lernen. */
  strengthShift: number;
  strengthSd: number;
  areaSd: number;
  /** Startkapital in Monatskosten (von, bis). */
  startCashMonths: [number, number];
  /** Formel 5.5: Mindestkapital der Epoche (S08 5.5). */
  minCapitalCent: Anchors;
  /** MRK-R34: Kandidaten je Projektwahl. */
  candidates: number;
  /** MRK-R36: Gründungen in normalen Phasen 0–1 je Quartal. */
  foundCashMonths: number;
  /** MRK-R35: Wachsen ab so vielen Monatskosten in der Kasse (Schrumpfen: Sparprogramm, KI-R32). */
  growCashMonths: number;
  /** ANNAHME: Was über so vielen Monatskosten liegt, schütten die Eigner zum Jahreswechsel aus (sonst wüchse die Kasse ohne Ziel). */
  payoutAboveMonths: number;
  /** KI-R32 vereinfacht: Kreditlinie in Monatskosten und Monatszins auf den negativen Kontostand. */
  creditMonths: number;
  creditInterestPerMonthBp: Bp;
  /** MRK-R30, Annahme 4 aus Etappe 3: Gewicht eines Releases in der Konkurrenzdichte und Fenster ±Wochen. */
  densityPerReleaseBp: Bp;
  densityWindowWeeks: number;
  /** MRK-R37: Rangliste über so viele Jahre Umsatz. */
  historyYears: number;
  names: { first: string[]; second: string[]; suffix: string[] };
  difficulty: Record<string, AiDifficulty>;
  traits: Record<string, AiTraitDef>;
  traitsByArchetype: Record<AiArchetype, string[]>;
  considerations: AiConsiderationParams;
  /** S08 MRK-R45 bis MRK-R52, S14 5.6 und 5.9 (data/ai/rivals.json). */
  rivals: RivalParams;
}

/** Laufendes KI-Projekt; gerechnet mit denselben Funktionen wie Spielerprojekte (KI-R01, KI-T01). */
export interface AiProject {
  brandId?: number | null;
  brandLicenseId?: number | null;
  genre: string;
  /** Untergenre oder null (ANNAHME, siehe SubgenreDef). */
  subgenre?: string | null;
  theme: string;
  scope: Scope;
  platforms: string[];
  features: string[];
  engineLevels: ModuleMap;
  effortTotalBp: Bp;
  effortDoneBp: Bp;
  bugsBp: Bp;
  startWeek: number;
  /** MRK-R30: geplante Release-Woche, für die Konkurrenzdichte angekündigter Titel. */
  plannedReleaseWeek: number;
  polishWeeksLeft: number;
  certWeeksLeft: number;
  costCent: Cent;
  /** MRK-R43: Prüfung am Vertical Slice schon erfolgt. */
  checked: boolean;
  /** Erwartete Wertung bei der Wahl (für Abbruch und Lernen). */
  expectedScoreBp: Bp;
  /** S04: Engine aus dem Lizenzmarkt (null = Hausmittel) und Vertrag. */
  engineId: number | null;
  contractId: number | null;
  /** KI-R47: Nachahmer eines Spieler-Projekts; MRK-R47: frühester Release und Duell-Stand. */
  copyOf: number | null;
  holdUntilWeek: number;
  duel: "keins" | "geprueft" | "duell" | "ausgewichen";
  /** MRK-R47: Spieler-Projekt des Duells; Nachfrage-Faktor (Verschiebung −10 %, KI-R49 Abklatsch). */
  duelWith: number | null;
  demandBp: Bp;
  /** S05 Abschnitt 7: Interesse; die KI kündigt beim Projektstart an (MKT-R14). */
  interest?: number;
}

export interface AiTeam {
  id: number;
  size: number;
  project: AiProject | null;
  /** LIZ-R27: Wochen seit dem Engine-Wechsel in der Umschulung (0 = keine) und Engine des letzten Projekts. */
  retrainWeeks: number;
  lastEngineId: number | null;
}

export interface AiStudio {
  id: number;
  name: string;
  archetype: AiArchetype;
  size: AiSize;
  /** MRK-R38: Grundriss des KI-Studios (ANNAHME: ohne Ausstattung). */
  officeId: string;
  foundedWeek: number;
  /** null, solange das Studio lebt (MRK-R35). */
  closedWeek: number | null;
  cashCent: Cent;
  /** Bestwert je Bereich im Studio (0–100), wie die beste beteiligte Person beim Spieler. */
  strength: AreaMap;
  experienceGenre: Record<string, Bp>;
  experienceEngine: Bp;
  mainGenre: string;
  teams: AiTeam[];
  nextTeamId: number;
  releases: number;
  /** MRK-R37: Umsatz je Jahr (Index 0 = laufendes Jahr) und Wertungen der letzten Releases. */
  revenueByYear: Cent[];
  lastScores: Bp[];
  /** S14 AiProfile und AiMind: zwei Charakterzüge, Lieblings- und Schwerpunkt-Genres, Plattform-Wette, Budget. */
  traits: string[];
  favGenres: string[];
  focusGenres: string[];
  platformBet: string | null;
  budgetBp: AiBudget;
  lastConferenceWeek: number;
  conferenceCashCent: Cent;
  extraConferenceYear: number;
  /** KI-R12, KI-R51: Überzeugungen zur Beliebtheit (Schlüssel „genre/thema“) und zu Plattformen, 1,0 = 10.000. */
  /** genreTheme: Überzeugung je Genre × Thema in Datenreihenfolge (genreThemeKey). */
  beliefs: { genreTheme: Bp[]; platform: Record<string, Bp> };
  /** KI-R08: Wahrnehmungsfehler z je Größe, einmal je Quartal gezogen. */
  perception: { quarter: number; z: Record<string, Bp> };
  /** KI-R52: Nach einem eigenen Flop wiegt Risiko zwei Jahre schwerer. */
  riskShyUntilWeek: number;
  /** KI-R84: die letzten 50 Entscheidungen. */
  log: AiDecision[];
  /** S04, KI-R28: aktuelle Engine (Lizenzmarkt) oder null = Hausmittel; eigene Engine im Markt; Erfahrung damit. */
  engineId: number | null;
  ownEngineId: number | null;
  engineExperienceBp: Bp;
  /** Reine Engine-Firma: Personen im Engine-Team, keine Spiele-Teams (Plan Etappe 3, 3.4). */
  engineStaff: number;
  /** LIZ-R28: Jahre in Folge mit Gewinn. */
  profitYears: number;
  /** Umsatz je Quartal (Index 0 = laufendes Quartal, höchstens 8). */
  revenueByQuarter: Cent[];
  /** MRK-R45: Rivale mit Chef, Zielen, Beziehung und Gedächtnis, sonst null. */
  rival: RivalState | null;
  /** S09 (6b.4): Tochter eines Konzerns (fehlt oder null = eigenständig). */
  parent?: Subsidiary | null;
  /** Gegenzug „Konkurrenztitel“ (KI-R45) oder Nachahmer (KI-R47): das nächste freie Team nimmt Genre und Thema. */
  forced: { genre: string; theme: string | null; fromWeek: number; copyOf: number | null } | null;
}

/** Ein veröffentlichtes KI-Spiel im gemeinsamen Markt. */
export interface AiProduct {
  id: number;
  studioId: number;
  /** PRD-R74, LIZ-M09: Marke, Lizenz und Fan-Käufer der ersten Wochen. */
  brandId: number | null;
  brandLicenseId: number | null;
  fanUnitsPerWeek: number;
  genre: string;
  theme: string;
  scope: Scope;
  platforms: string[];
  scoreBp: Bp;
  releaseWeek: number;
  competitionBp: Bp;
  sold: number;
  revenueCent: Cent;
  /** S04: Engine und Lizenzvertrag (Royalties nach LIZ-R07). */
  engineId: number | null;
  contractId: number | null;
  /** KI-R49: Nachfrage-Faktor für Nachahmer (Abklatsch −10 %, besser als das Original +5 %). */
  demandBp: Bp;
  /** MRK-R47: Spieler-Projekt im Release-Duell oder null. */
  duelWith: number | null;
  /** S13 AUS-R42: vom Spieler verlegt (Vertrag) oder fehlt. */
  publishingDealId?: number;
  /** MKT-F2: Interesse zum Release (Personen); MKT-R05: Spielerwertung für die Kurve. */
  interest?: number;
  userScoreBp?: Bp;
  /** S05 Abschnitt 7: Kopierschutz der KI. */
  protection?: ProductProtection;
  /** MRK-R41: dauerhafte Preissenkung, Rabatt dieser Woche, gezählte Store-Aktionen. */
  priceCutBp?: Bp;
  discountBp?: Bp;
  /** ZIE-R03: Innovation der Features (−1…+1) und ZIE-R05: Preisbonus bis zu dieser Woche. */
  innovationBp?: Bp;
  awardUntil?: number;
  storeActions?: number;
  habitAtReleaseBp?: Bp;
  /** S06 Abschnitt 7: Live-Art als Produkttyp (Nachfrage, Preis) und Live-Betrieb der KI oder null. */
  type?: string;
  live?: AiLive | null;
}

/** S06 Abschnitt 7: Live-Betrieb eines KI-Produkts (vereinfacht, ohne Abteilung und Server-Ereignisse). */
export interface AiLive {
  kind: LiveKind;
  base: number;
  hardnessBp: Bp;
  /** Verpasste Content-Termine in Folge; nächster Termin. */
  missed: number;
  nextDropWeek: number;
  /** Monate in Folge mit Verlust. */
  lossMonths: number;
}

export interface AiWorld {
  studios: AiStudio[];
  products: AiProduct[];
  nextStudioId: number;
  nextProductId: number;
  /** Alte Spielstände bekommen die Welt im ersten Tick (Migration 14 → 15). */
  generated: boolean;
  /** MRK-R37: Umsatz des Spielers je Jahr (Index 0 = laufendes Jahr). */
  playerRevenueByYear: Cent[];
  /** KI-R58: Pleiten je Jahrzehnt (Schlüssel = erstes Jahr des Jahrzehnts). */
  closures: Record<string, number>;
  /** MRK-R45: IDs der Rivalen. */
  rivals: number[];
  /** Umsatz des Spielers je Quartal (Index 0 = laufendes Quartal) und Anteile je Quartal für die Bedrohung (6.4). */
  playerRevenueByQuarter: Cent[];
  playerShares: { genre: Record<string, Bp>; engine: Bp }[];
  /** KI-R47: Nachahmer je Spieler-Projekt; KI-R44: Gegenzüge aller Akteure im Jahr. */
  copycats: Record<string, number>;
  countersAll: { year: number; n: number };
  /** Umsatz je Genre im laufenden Quartal (Spieler und alle) für den Anteil A_d (6.4). */
  quarterGenre: { player: Record<string, Cent>; all: Record<string, Cent> };
  /** Umsatz je Genre und Firma (0 = Spieler) im laufenden Jahr; Genre-Führer im Vorjahr (Zielkatalog). */
  yearGenre: Record<string, Record<string, Cent>>;
  genreLeaders: Record<string, number>[];
}
