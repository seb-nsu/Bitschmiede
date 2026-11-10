// Spielstand: Personen, Firma, Finanzen, Welt.
// Teil von src/sim/model/types.ts (Prüfung Fable 03.11.2026: Aufteilung nach System); Importe immer über „../model/types“.
import type { Bp, Cent } from "../../num";
import type { Area, AreaMap, PressRandom } from "./grundlagen";

// ---------- Spielstand ----------

export type DecisionDensity = "ruhig" | "normal" | "dicht";

export interface Settings {
  /** S10: Schwierigkeits-Preset (entspannt, leicht, normal, schwer, hardcore). */
  preset: string;
  pressRandom: PressRandom;
  /** Stufe der Presse-Strenge, 0 = Standard (PRD-R57, ZIE-R48); kommt aus dem Preset. */
  pressStrictness: number;
  /** ZIE-R47: wirkt nur auf Welt-Angebote. */
  decisionDensity: DecisionDensity;
  founderFocus: Area;
  /** KRN-R54, ZIE-R21: nur ein Spielstand je Partie mit Autosave, kein manuelles Laden. */
  ironman: boolean;
  /** FRM-R22: Platzangebot; fehlt = normal. */
  space?: SpaceSetting;
  /** ZIE-R06: höchstens ein langfristiges Ziel (fehlt = keins). */
  longTermGoal?: string | null;
  /** ZIE-R08: Spielende (fehlt = Endjahr) und Endjahr 2000–2100 (fehlt = 2040). */
  endMode?: EndMode;
  endYear?: number;
  /** ZIE-R13, ZIE-R14: gewähltes Szenario (fehlt = freies Spiel). */
  scenario?: string | null;
  /** S10 Schalter „Marktzyklen“ (MRK-R59): fehlt = an; aus = immer normal, ohne Crash. */
  marketCycles?: boolean;
  /** S10 Schalter „Übernahmen“ (UEB-R01): fehlt = an. */
  acquisitions?: boolean;
  /** Etappe 6c.11: Einstiegsart (fehlt = geführt): Lernpfad, Freischalt-Karten, frei = alle Systeme offen (KRN-R43). */
  guide?: GuideMode;
  /** Etappe 6c.10 (KRN-R70): freies Startjahr im Profil Garage (fehlt = Datenwert 1980; Szenarien setzen ihr eigenes). */
  startYear?: number;
  /** S13 AUS-R43: Startprofil (fehlt = Studio; „publisher“ = mit Kapital und zwei Partnerstudios). */
  profile?: "studio" | "publisher";
}

export type GuideMode = "gefuehrt" | "klassisch" | "frei";

export type EndMode = "offen" | "endjahr" | "zielbedingung";

/** S10 Abschnitt 5: Stellschrauben eines Presets (nur die, die Etappe 1 braucht). */
export interface PresetDef {
  id: string;
  startMoneyFactorBp: Bp;
  revenueFactorBp: Bp;
  costFactorBp: Bp;
  loanRateAddBp: Bp;
  loanLimitFactorBp: Bp;
  pressStrictness: number;
  bugRateBp: Bp;
  insolvencyToleranceMonths: number;
  /** Balancing 1.0: Anteil des Epochen-Faktors der Presse (pressEraAnchors); Schwer und Hardcore haben ihre Strenge schon. */
  pressEraWeightBp: Bp;
  /**
   * Balancing 1.0 (Entscheidung Projektleitung 03.11.2026): Kassendruck je Stufe. Liegt das Guthaben über so vielen
   * Monatskosten, kostet der Überschuss jährlich excessCashRateBp (vierteljährlich gebucht); 0 = aus.
   */
  excessCashMonths: number;
  excessCashRateBp: Bp;
  startCushionMonths: number;
  /** PRD-R52: Mindestwertung bei Genre-Thema-Passung ≥ 1,0, sonst null. */
  minScoreGoodFitBp: Bp | null;
}

/** Ankerwerte je Jahr, linear interpoliert (Datenblatt Abschnitt 1). */
export type Anchors = [number, number][];

export interface CreditNote {
  note: string;
  rateBp: Bp;
  limitFactorBp: Bp;
}

/** S07 Grundrisse in der Etappe-1-Form: nur Garage und Etage, ohne Ausstattung (Entscheidung 1 vom 29.10.2026). */
export interface OfficeParams {
  /** FRM-R23: mehr als 20 % Überbelegung ist nicht möglich. */
  overcrowdingMaxBp: Bp;
  /** FRM-R24: Kaution in Monatsmieten des neuen Büros. */
  depositMonths: number;
  /** FRM-R25: Mietvertrag; Auszug vorher kostet die halbe Restmiete. */
  contractMonths: number;
  /** FRM-R24: so viele Wochen nach dem Umzug mit verminderter Leistung. */
  moveWeeks: number;
  moveProductivityBp: Bp;
  /** FRM-R22: Platzangebot. */
  spaceFactorsBp: Record<SpaceSetting, Bp>;
  /** FRM-R23: Moral −1 je Woche je 5 % Überbelegung. */
  overcrowdMoralePerStepBp: Bp;
  overcrowdStepBp: Bp;
  /** S07 Abschnitt 7: Umzugsvorschlag ab 90 % Belegung. */
  suggestMoveBp: Bp;
  /** FRM-R26: weitere Etage bzw. weiteres Gebäude. */
  extension: { floor: { placesBp: Bp; slots: number; rentBp: Bp }; building: { places: number; slots: number } };
  /** MRK-R38: KI zieht bei 95 % Belegung um, wenn 6 Monatsmieten vorhanden sind. */
  aiMoveBp: Bp;
  aiMoveRentMonths: number;
  offices: OfficeDef[];
}

export type SpaceSetting = "grosszuegig" | "normal" | "knapp";

/** FRM-R21, Tabelle 5.4: Grundriss mit Variante und Eigenschaft. */
export interface OfficeDef {
  id: string;
  layout: string;
  places: number;
  slots: number;
  rentFactorBp: Bp;
  availableFrom: number;
  extension: "floor" | "building" | null;
  trait?: EquipmentEffects;
}

export interface EquipmentEffects {
  areaQuality?: Partial<AreaMap>;
  featureQuality?: Bp;
  qaBp?: Bp;
  playtestSpreadBp?: Bp;
  researchBp?: Bp;
  bugsBp?: Bp;
  moralePoints?: number;
  hireQualityPoints?: number;
}

export interface RoomDef {
  id: string;
  slots: number;
  priceCent: Cent;
  upkeepCent: Cent;
  from: number;
  minLayout: string;
  effects: EquipmentEffects;
}

/** Tabelle 5.4: Ausstattung, Preise Stand 2000 (× Epochenfaktor). */
export interface EquipmentParams {
  layoutOrder: string[];
  epochFactorsBp: Anchors;
  copyFactorBp: Bp;
  upgradeYears: number[];
  hardware: { perPlaceLevelCent: Cent; upkeepBp: Bp; baseBp: Bp; perLevelBp: Bp; agePerYearBp: Bp; minBp: Bp; bugsPerLevelBp: Bp; startLevel: number; maxLevel: number; symptomBelowBp: Bp };
  comfort: { perPlaceLevelCent: Cent; upkeepBp: Bp; moralePerLevel: number; burnoutPerLevelBp: Bp; maxLevel: number };
  rooms: RoomDef[];
  capacityRooms: string[];
  animationFeatures: string[];
}

/** Büro des Spielers (FRM-R21 bis FRM-R30). */
export interface OfficeState {
  id: string;
  sinceWeek: number;
  moveWeeksLeft: number;
  /** FRM-R26: weitere Etagen bzw. Gebäude. */
  extensions: number;
  hardware: { level: number; year: number; paidCent: Cent };
  comfort: { level: number; paidCent: Cent };
  /** Räume in Kaufreihenfolge (Kapazitätsräume mehrfach, FRM-R65). */
  rooms: string[];
  /** FRM-R29, FRM-R30, Umzugsvorschlag: bereits gezeigt. */
  hardwareSymptomShown: boolean;
  upgradeOfferYear: number;
  moveSuggested: boolean;
}

export interface EconomyParams {
  salaryAnchorsCent: Anchors;
  rentPerPlaceAnchorsCent: Anchors;
  creditNotes: CreditNote[];
  /** Garage 1980: Kreditlinie bis 50.000 USD zu 9 % (S07 Startwerte). */
  startLoanLimitCent: Cent;
  startLoanRateBp: Bp;
  /** ANNAHME: Der zinslose Kredit des Startpolsters wird danach in so vielen Monatsraten getilgt. */
  cushionRepayMonths: number;
  decisionDensityBp: Record<DecisionDensity, Bp>;
  /** A46, FRM-R72: Gewinnsteuer (Region Nordamerika, solange es keine Regionen gibt) und Verlustvortrag in Quartalen. */
  lossCarryQuarters: number;
  /** Balancing Spätspiel (Entscheidung Projektleitung 04.11.2026): Kosten, die mit dem Erfolg wachsen. */
  success: SuccessParams;
}

/** Balancing Spätspiel: Gewinnbeteiligung und Star-Gehälter (economy.json „success“). */
export interface SuccessParams {
  profitShare: { fromYear: number; minPeople: number; shareAnchorsBp: Anchors; sizeSteps: [number, Bp][]; moraleBp: Bp; minReserveMonths: number };
  starSalary: { fromYear: number; minStrength: number; reserveMonths: number; raiseBp: Bp; capBp: Bp };
}

/** Monatsbuch der Finanzen-Ansicht (FRM-R38). */
export interface LedgerMonth {
  year: number;
  month: number;
  /** publisher: Raten der Publisher-Verträge (FRM-R46, ab Etappe 6a; fehlt in älteren Monaten). */
  income: { sales: Cent; contracts: Cent; licenses: Cent; merch: Cent; publisher?: Cent; konzern?: Cent; publishing?: Cent };
  costs: { wages: Cent; rent: Cent; interest: Cent; production: Cent; storage: Cent; other: Cent; tax: Cent; licenses: Cent; marketing: Cent; server: Cent; writeDown?: Cent; publishing?: Cent; bonus?: Cent };
}

export interface Finance {
  loanCent: Cent;
  creditNote: string;
  loanRateBp: Bp;
  /** FRM-R41: offene Kosten während des Startpolsters als zinsloser Kredit. */
  cushionDebtCent: Cent;
  cushionRepayCent: Cent;
  /** FRM-R40: Monate in Folge mit negativem Kontostand. */
  insolvencyMonths: number;
  ledger: LedgerMonth[];
  /** A46: Verlustvortrag je Quartal (absolute Quartalsnummer = Woche / 13), älteste zuerst. */
  lossCarry: { quarter: number; cent: Cent }[];
}

/** Zuordnung einer Person (Konzept 0b, 3.1). */
export interface Assignment {
  /** „engine“: Engine-Team (Plan Etappe 2, Punkt 1); id ist dann 0. */
  kind: "project" | "contract" | "engine";
  id: number;
}

/** S07 FRM-R01 bis FRM-R20, FRM-R68 (data/staff.json): Teams, Moral, Burnout, Personalpolitik, Schlüsselpersonen. */
export type SalaryLevel = "unter" | "markt" | "ueber";
export type CrunchRule = "nie" | "vorGold" | "beiBedarf";
export interface StaffParams {
  /** FRM-R76, FRM-T32: gezielte Personalsuche. */
  search: {
    minStrength: number; maxStrength: number; feeSalaries: number; feeDivisor: number; baseWeeks: number; weeksDivisor: number;
    reachBonus: number; maxCandidates: number; farChanceBp: Bp; spread: number; deadlineWeeks: number;
  };
  projectsPerTeam: number;
  teamMinStaff: number;
  autoTeamStaff: number;
  teamMinMembers: number;
  /** Etappe 6c.2: Fachteams (±10 % Ausführung im bzw. außerhalb des Schwerpunkts) und QA-Team (Fundrate je Woche). */
  teamFocus: { inAreaBp: Bp; outAreaBp: Bp; qaFindRateBp: Bp; qaMinMembers: number };
  sizeFreeUpTo: number;
  sizeExponentBp: Bp;
  onboardingWeeks: number;
  onboardingStartBp: Bp;
  morale: { startBp: Bp; baseFactorBp: Bp; hit: Bp; flop: Bp; layoff: Bp; crunchWeek: Bp; salaryHighMonth: Bp; salaryLowMonth: Bp };
  burnout: { crunchWeek: Bp; overloadWeek: Bp; recoverWeek: Bp; freeBp: Bp; spanBp: Bp; lossFactorBp: Bp; quitAtBp: Bp; quitChanceBp: Bp };
  crunch: { bonusBp: Bp; goldWeeks: number; bugsBp: Bp };
  hitScoreBp: Bp;
  flopScoreBp: Bp;
  severanceMonths: number;
  mentoring: { shareBp: Bp; gapPoints: number; pointsPerMonth: number };
  salaryPolicy: Record<SalaryLevel, { wageBp: Bp; qualityPoints: number; loyaltyMonth: Bp }>;
  hiresPerMonth: number;
  key: {
    strengthMin: number;
    roles: Record<Area, string>;
    roleTempoBp: Record<string, Bp>;
    traits: string[];
    loyaltyStartBp: Bp;
    loyalty: { crunchWeek: Bp; offer: Bp; hit: Bp; raise: Bp; bonus: Bp; storyDenied: Bp };
    offerBelowBp: Bp;
    offerChanceBp: Bp;
    quitBelowBp: Bp;
    quitChanceBp: Bp;
    counterRaiseBp: Bp;
    counterLoyaltyBp: Bp;
    bonusMonths: number;
    storyRaiseBp: Bp;
  };
  legendary: { strengthMin: number; perYear: number; chancePerQuarterBp: Bp };
  poach: { baseBp: Bp; raiseFactor: number; maxBp: Bp; relationAttempt: Bp; relationSuccess: Bp; rivalKeyPeople: number; strengthLoss: number; loyaltyRange: [Bp, Bp] };
}

/** FRM-R09: Schlüsselperson mit Rolle, Eigenschaften und Loyalität. */
export interface KeyPerson {
  role: string;
  traits: string[];
  loyaltyBp: Bp;
  /** FRM-R13: Jahr der letzten Geschichte. */
  storyYear: number;
}

/** FRM-R02: Team ab 8 Mitarbeitern; Mitglieder über Person.teamId. */
export interface Team {
  id: number;
  name: string;
  /** Etappe 6c.2 (FRM-R02 erweitert): Schwerpunkt-Bereich, „qa“ = QA-Team, null = gemischt. */
  focus: TeamFocus;
}
export type TeamFocus = Area | "qa" | null;
