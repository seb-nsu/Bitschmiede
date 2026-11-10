// Delegation (S07 FRM-R55 bis FRM-R62).
// Teil von src/sim/model/types.ts (Prüfung Fable 03.11.2026: Aufteilung nach System); Importe immer über „../model/types“.
import type { Bp, Cent } from "../../num";
import type { Area, AreaMap } from "./grundlagen";
import type { Assignment, CrunchRule, KeyPerson, SalaryLevel, Team } from "./spielstand";

// ---------- Delegation (S07 FRM-R55 bis FRM-R62) ----------

export const DELEGATION_AREAS = ["projekte", "patches", "dlc", "lizenzen", "liveService", "personal", "marketing", "buero"] as const;
export type DelegationArea = (typeof DELEGATION_AREAS)[number];
export type DelegationLevel = "manuell" | "regel" | "auto";
export const RULE_VALUES = ["immer", "kasse", "wertung", "staerke", "loyalitaet", "personal"] as const;
export type RuleValue = (typeof RULE_VALUES)[number];
export type RuleOp = "unter" | "ueber" | "gleich";

export interface DelegationParams {
  /** Prüfung Fable 03.11.2026 (FRM-R61): Routine-Karten fragen nur einmal; Antwort, die nach abgelaufener Frist zur Regel wird. */
  routine: Record<string, string>;
  unlockProjects: number;
  capacity: { base: number; studioLead: number; director: number };
  directorRoles: string[];
  overloadPerUnitBp: Bp;
  /** Bereich je Ereignisart (Schlüssel wie EventKind; „katalog“ für alle Katalog-Ereignisse). */
  eventAreas: Record<string, DelegationArea>;
  /** Optionen je Ereignisart für den Regel-Editor (Katalog-Ereignisse aus ihrer Definition). */
  eventOptions: Record<string, string[]>;
  /** FRM-R61: gleiche Antwort so oft hintereinander, dann erscheint „Nicht mehr fragen“. */
  suggestAfter: number;
  historyWeeks: number;
  maxRules: number;
  logEntries: number;
  producer: { maxProjects: number; expertMaxProjects: number; expertFrom: number; attrMin: number; attrMax: number; salaryRaiseBp: Bp };
}

/** FRM-R60: „Wenn [Wert] [unter/über/gleich] [Zahl], dann [Option]“ für eine Ereignisart, gültig für Firma oder Marke. */
export interface DelegationRule {
  id: number;
  /** EventKind oder „katalog.<defId>“. */
  eventKey: string;
  condition: { value: RuleValue; op: RuleOp; number: number };
  option: string;
  /** null = Firma (ein Studio), sonst Marken-ID. */
  brandId: number | null;
  active: boolean;
  createdWeek: number;
}

/** FRM-R62: Protokoll einer getroffenen Entscheidung (Regel, Automatik, Produzent oder Spieler). */
export interface DecisionRecord {
  week: number;
  eventKey: string;
  option: string;
  by: "spieler" | "regel" | "auto" | "produzent";
  ruleId: number | null;
  /** Objekt für das Protokoll (Projekt, Person, Produkt). */
  object: string;
  brandId: number | null;
  values: Partial<Record<RuleValue, number>>;
}

export interface ProducerAttrs {
  planning: number;
  quality: number;
  risk: number;
  experience: number;
  communication: number;
}

export interface Producer {
  personId: number;
  attrs: ProducerAttrs;
  maxProjects: number;
}

/** FRM-R59: Vorgabe für ein Projekt unter einem Produzenten. */
export interface ProducerBrief {
  minScoreBp: Bp | null;
  budgetCent: Cent | null;
  targetWeek: number | null;
}

export interface DelegationState {
  levels: Record<DelegationArea, DelegationLevel>;
  rules: DelegationRule[];
  nextRuleId: number;
  /** Letzte Entscheidungen (historyWeeks) für „hätte gegriffen“ und FRM-R61. */
  history: DecisionRecord[];
  producers: Producer[];
  /** FRM-R57: Überlastung wurde gemeldet (einmal je Überlastungsphase). */
  overloadWarned: boolean;
}

export interface StaffState {
  teams: Team[];
  nextTeamId: number;
  salary: SalaryLevel;
  crunch: CrunchRule;
  /** FRM-R20: Zielgröße der Firma (null = keine automatischen Einstellungen). */
  targetSize: number | null;
  /** FRM-R14: legendäre Entwickler je Jahr. */
  legendary: { year: number; n: number };
  /** FRM-R68: Abwerbeversuche („studio:name:jahr“). */
  poachTries: string[];
  /** MRK-R56: Wochen mit Crunch der letzten 52 Wochen (Auslöser der Crunch-Enthüllung). */
  crunchWeeks: number[];
}

/** Schlüsselperson eines Rivalen (FRM-R68, Plan Annahme 1: einzelne Personen der KI nur, wo eine Regel sie braucht). */
export interface RivalKeyPerson {
  name: string;
  role: string;
  area: Area;
  strength: number;
  loyaltyBp: Bp;
}

/** FRM-R02: Bis 7 Mitarbeiter arbeiten als Einzelpersonen. */
export interface Person {
  /** FRM-R32: Standort (fehlt = Heimatstandort). */
  locationId?: number;
  id: number;
  name: string;
  isFounder: boolean;
  /** Stärke je Bereich 0–100. */
  strength: AreaMap;
  salaryCent: Cent;
  /** Erfahrung je Genre und mit der Starter-Engine, 0–10.000 bp (= 0–100 Punkte), FRM-R05. */
  experienceGenre: Record<string, Bp>;
  experienceEngine: Bp;
  assignment: Assignment | null;
  /** Einarbeitung nach einem Wechsel (FRM-R04 vereinfacht). */
  transferWeeks: number;
  hiredWeek: number;
  /** FRM-R02, FRM-R04: Team, Einarbeitung (Wochen übrig), FRM-R06, FRM-R07: Moral und Burnout (0–10.000). */
  teamId: number | null;
  onboardWeeks: number;
  moraleBp: Bp;
  burnoutBp: Bp;
  /** FRM-R09: Schlüsselperson oder null. */
  key: KeyPerson | null;
}
