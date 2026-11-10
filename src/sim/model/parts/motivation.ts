// Langzeitmotivation: Strategiekonferenz mit Jahreszielen, Erzrivale, Epochen-Fragen (Konzept-Langzeitmotivation.md, Prüfung Fable 03.11.2026).
// Teil von src/sim/model/types.ts (Prüfung Fable 03.11.2026: Aufteilung nach System); Importe immer über „../model/types“.
import type { Bp } from "../../num";
import type { ModuleKind } from "./grundlagen";

/** Takt 1: Arten von Jahreszielen; die Prüfung steht in systems/motivation.ts. */
export type AnnualGoalKind = "wertung" | "wertungTrend" | "releases" | "plattformNeu" | "rangliste" | "umsatz" | "preis";
/** Belohnung nie in Geld (Konzept: „Geld ist nicht knapp“): Ruf oder Fans der größten eigenen Marke. */
export type AnnualRewardKind = "ruf" | "fans";

export interface AnnualGoalDef {
  id: string;
  kind: AnnualGoalKind;
  /** wertung, wertungTrend: Mindestwertung. */
  scoreBp?: Bp;
  /** releases: Releases des Vorjahres plus extra, mindestens min. */
  extra?: number;
  min?: number;
  /** umsatz: Wachstum gegen das Vorjahr. */
  growthBp?: Bp;
  /** Frühestes Jahr, in dem das Ziel angeboten wird. */
  fromYear?: number;
  reward: { kind: AnnualRewardKind; bp: Bp };
}

export interface ConferenceParams {
  /** Zahl der Ziele zur Wahl. */
  offers: number;
  /** Ohne Wahl nimmt das Studio nach so vielen Wochen das erste Angebot (Delegation, Bot-Läufe). */
  pickWithinWeeks: number;
  /** Produkttypen, die als Spiel zählen (Releases, Wertung). */
  gameTypes: string[];
  goals: AnnualGoalDef[];
}

export interface ArchrivalParams {
  /** Zwei Releases zählen als Duell, wenn sie höchstens so viele Wochen auseinanderliegen. */
  windowWeeks: number;
  /** Beim Erwählen sinkt die Beziehung (mehr Groll, öfter Release-Duelle nach MRK-R47). */
  relationDropBp: Bp;
  /** So viele vergangene Duelle bleiben gespeichert (Bilanz zählt weiter). */
  keepDuels: number;
}

export type EpochMetric = "hits" | "hitsNewPlatforms" | "hitsModuleLevel" | "liveGames" | "platformTypeGames" | "rank";

/** Takt 2: eine Frage je Jahrzehnt; Stufen 1–3 nach den Schwellen (bei „rank“: höchstens diese Platzierung). */
export interface EpochDef {
  id: string;
  from: number;
  to: number;
  metric: EpochMetric;
  tiers: number[];
  scoreBp?: Bp;
  platformFromYear?: number;
  /** hitsModuleLevel: Engine-Modul des Projekts mindestens auf dieser Stufe (z. B. Rendering 4 = 3D). */
  module?: ModuleKind;
  minLevel?: number;
  platformTypes?: string[];
  productTypes?: string[];
}

export interface MotivationParams {
  conference: ConferenceParams;
  archrival: ArchrivalParams;
  epochs: EpochDef[];
}

export type AnnualGoalStatus = "offen" | "erreicht" | "verfehlt";

export interface AnnualGoal {
  id: string;
  kind: AnnualGoalKind;
  year: number;
  target: number;
  /** Genre (wertungTrend) oder Plattform (plattformNeu). */
  param: string | null;
  reward: { kind: AnnualRewardKind; bp: Bp };
  status: AnnualGoalStatus;
  week: number | null;
}

export interface ArchrivalState {
  studioId: number;
  name: string;
  sinceWeek: number;
  wins: number;
  losses: number;
  duels: { week: number; projectId: number; productId: number; won: boolean }[];
}

export interface MotivationState {
  /** Strategiekonferenz: Angebote dieses Jahres (leer = gewählt oder keine) und Frist der Wahl. */
  offers: AnnualGoal[];
  offerDeadlineWeek: number;
  annual: AnnualGoal | null;
  annualHistory: { year: number; id: string; status: "erreicht" | "verfehlt" }[];
  streak: number;
  bestStreak: number;
  archrival: ArchrivalState | null;
  /** Frühere Erzrivalen mit Endbilanz. */
  formerRivals: { name: string; wins: number; losses: number; end: "geschlossen" | "gekauft" | "abgehaengt"; week: number }[];
  /** Angekündigte und ausgewertete Epochen (Stufe 0 = verpasst). */
  epochAnnounced: string[];
  epochTitles: { id: string; tier: number; value: number }[];
}
