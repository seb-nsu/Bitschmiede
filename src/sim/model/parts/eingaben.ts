// Eingaben (TEC-R20).
// Teil von src/sim/model/types.ts (Prüfung Fable 03.11.2026: Aufteilung nach System); Importe immer über „../model/types“.
import type { Bp, Cent } from "../../num";
import type { AnalyticsLevel, OpsPot, PatchSize } from "./betrieb";
import type { PublishingPackage } from "./publishing";
import type { AcquireInput, BoothSize, CapitalRaiseInput, DividendInput, FairShow, FutureBetInput, IpoInput, PublisherTerms, Region, SubsidiaryInput } from "./daten";
import type { DelegationArea, DelegationLevel, ProducerBrief, RuleOp, RuleValue } from "./delegation";
import type { Area, ModuleKind, Scope } from "./grundlagen";
import type { EnginePlan, LicenseModel, LicenseTemplateId, LicenseTerms } from "./lizenzmarkt";
import type { BrandForm, BrandTemplate } from "./markenmarkt";
import type { DemoMode, EngineId, ProjectEngine } from "./projekt";
import type { CrunchRule, SalaryLevel, TeamFocus } from "./spielstand";

// ---------- Eingaben (TEC-R20) ----------

export interface CreateProjectInput {
  type: "createProject";
  title: string;
  genre: string;
  /** Untergenre des Genres oder leer (ANNAHME, siehe SubgenreDef). */
  subgenre?: string | null;
  theme: string;
  scope: Scope;
  features: string[];
  /** Personen, die das Projekt beginnen. */
  people: number[];
  /** PRD-R10, PRD-R60: Zielplattformen, die erste ist die Lead-Plattform. */
  platforms: string[];
  /** PRD-R01: Produkttyp (Standard, wenn leer) und Vorlage für Port und Addon. */
  productType?: string;
  sourceId?: number | null;
  /** PRD-R10: Engine; Standard ist die eigene, sonst die Starter-Engine. */
  engine?: EngineId;
  /** S04 Lizenzweg: Vorlage des Anbieters (Standard: „standard“, sonst die erste angebotene). */
  licenseTemplate?: LicenseTemplateId;
  /** PRD-R12: gesperrte Karten, die beim Engine-Team bestellt werden (müssen in features stehen). */
  ordered?: string[];
  /** ENG-R41: Bindung; Standard nach Umfang. */
  binding?: ProjectEngine["binding"];
  /** Etappe 6c.3: Auftragsspiel vom Marktplatz (legt Genre, Thema, Umfang und Plattform fest). */
  contractOfferId?: number | null;
  /** Etappe 6c.4 (PRD-R10): Zielgruppe; fehlt = Standard aus den Daten (Kernspieler). */
  audience?: string;
  /** Etappe 6c.5: Design-Säulen; fehlt = keine. */
  pillars?: string[];
  /** S02 Abschnitt 6 „Marke zuordnen“: bestehende Marke (ID) oder neue (leer). Port und Addon gehören zur Marke der Vorlage. */
  brandId?: number | null;
}

/** ENG-R41, ENG-R44: Bindung wechseln (bis zum Freeze) oder auf die neue Hauptversion umsteigen. */
export interface BindingInput {
  type: "setBinding";
  projectId: number;
  binding: ProjectEngine["binding"];
}

export interface SwitchMajorInput {
  type: "switchMajor";
  projectId: number;
}

/** ENG-R52: Priorität einer Anforderung (1 = zuerst). */
export interface RequestPriorityInput {
  type: "setRequestPriority";
  jobId: number;
  priority: number;
}

/** S03 Abschnitt 6 „Engine bauen“: eigene Engine gründen. */
/** S04 Abschnitt 6: Lizenzmodell der eigenen Engine. */
export interface LicenseModelInput {
  type: "setLicenseModel";
  model: LicenseModel;
}

/** S04 Abschnitt 6: Konditionen einer Vorlage; für Bestandskunden mit Vertrauensfolge (LIZ-R16, LIZ-R17). */
export interface LicenseTemplateInput {
  type: "setLicenseTemplate";
  template: LicenseTemplateId;
  terms: LicenseTerms | null;
  applyToExisting: boolean;
}

/** FRM-R02: Team bilden (ab 8 Mitarbeitern) oder auflösen; FRM-R04: Team einem Projekt oder dem Engine-Team zuweisen. */
export interface TeamInput {
  type: "createTeam";
  name: string;
  personIds: number[];
}
/** Etappe 6c.2: Schwerpunkt eines Teams setzen. */
export interface TeamFocusInput {
  type: "setTeamFocus";
  teamId: number;
  focus: TeamFocus;
}
/** Etappe 6c.8: Sprachen eines Projekts festlegen (vor dem Release). */
export interface LanguagesInput {
  type: "setLanguages";
  projectId: number;
  languages: string[];
}
/** Etappe 6c.7: Bereich polieren (null = keine Politur). */
export interface PolishInput {
  type: "setPolish";
  projectId: number;
  area: Area | null;
}
/** Etappe 6c.6: Schwerpunkt einer Phasengruppe eines Projekts. */
export interface PhaseFocusInput {
  type: "setPhaseFocus";
  projectId: number;
  group: string;
  focus: string;
}
/** Etappe 6c.2: Personen frei einem Team zuordnen oder aus ihm lösen (teamId null). */
export interface TeamMembersInput {
  type: "teamMembers";
  teamId: number | null;
  personIds: number[];
}
/** Etappe 6c.3: Angebot vom Marktplatz ablehnen. */
export interface DeclineContractGameInput {
  type: "declineContractGame";
  offerId: number;
}
export interface DissolveTeamInput {
  type: "dissolveTeam";
  teamId: number;
}
export interface AssignTeamInput {
  type: "assignTeam";
  teamId: number;
  /** Projekt-ID, null = frei, 0 mit engine = Engine-Team. */
  projectId: number | null;
  engine?: boolean;
}
/** FRM-R15 bis FRM-R17, FRM-R20: Personalpolitik und Zielgröße. */
export interface StaffPolicyInput {
  type: "setStaffPolicy";
  salary: SalaryLevel;
  crunch: CrunchRule;
  targetSize: number | null;
}
/** FRM-R08: Entlassung. */
export interface FireInput {
  type: "firePerson";
  personId: number;
}
/** FRM-R55, FRM-R56: Delegationsstufe eines Bereichs. */
export interface DelegationLevelInput {
  type: "setDelegation";
  area: DelegationArea;
  level: DelegationLevel;
}
/** FRM-R60, FRM-R61: Regel anlegen (optional mit sofortiger Antwort auf ein offenes Ereignis). */
export interface RuleInput {
  type: "createRule";
  eventKey: string;
  condition: { value: RuleValue; op: RuleOp; number: number };
  option: string;
  brandId: number | null;
  answerEventId?: number;
}
export interface RuleControlInput {
  type: "toggleRule" | "deleteRule";
  ruleId: number;
}
/** FRM-R58, FRM-R59: Produzent ernennen oder abberufen; Projekt einem Produzenten mit Vorgabe geben. */
export interface ProducerInput {
  type: "appointProducer" | "dismissProducer";
  personId: number;
}
export interface ProjectProducerInput {
  type: "setProjectProducer";
  projectId: number;
  producerId: number | null;
  brief: ProducerBrief | null;
}
/** FRM-R68: Schlüsselperson eines Rivalen abwerben; Aufschlag in bp (0–10.000). */
export interface PoachInput {
  type: "poach";
  studioId: number;
  index: number;
  raiseBp: Bp;
}

/** MRK-R16: Devkit der Welle 2 auf Antrag gegen Gebühr. */
export interface RequestDevkitInput {
  type: "requestDevkit";
  platformId: string;
}

export interface FoundEngineInput {
  type: "foundEngine";
  name: string;
}

/** MKT-R22: Erstauflage vor dem Release festlegen; null = Empfehlung. */
/** MKT-R04, MKT-R06: Marketing-Budget, Autopilot der Ankündigung oder jetzt ankündigen. */
export interface PriceRule {
  active: boolean;
  afterWeeks: number;
  discountBp: Bp;
  /** MKT-R17: Preise folgen der vorgeschlagenen Kurve. */
  followCurve: boolean;
}

/** MKT-R17: Preis senken (nie erhöhen). */
export interface SetPriceInput {
  type: "setPrice";
  projectId: number;
  priceCent: Cent;
}

/** ZIE-R10: Weiterspielen nach dem Spielende (nicht nach Insolvenz und nicht nach 2100). */
export interface ContinueInput {
  type: "continuePlaying";
}

/** Prüfung Fable 03.11.2026: Lernpfad, Freischalt-Karten und Erste-Male-Hinweise im Spielstand statt im Browser. */
export interface GuideSeen {
  hidden: boolean;
  skipped: string[];
  unlocks: string[];
  firsts: string[];
}

export interface GuideSeenInput {
  type: "guideSeen";
  what: "hidden" | "skipped" | "unlocks" | "firsts";
  id: string;
}

/** S13 AUS-R40: Paket für einen Pitch anbieten (null = ablehnen). */
export interface PublishingOfferInput {
  type: "publishingOffer";
  pitchId: number;
  package: PublishingPackage | null;
}

/** S13 AUS-R41: nach verfehltem Meilenstein zahlen, kürzen oder den Vertrag stoppen. */
export interface PublishingDealInput {
  type: "publishingDeal";
  dealId: number;
  action: "zahlen" | "kuerzen" | "stoppen";
}

/** S13 AUS-R90, AUS-R83: Rückkauf eigener Aktien, Übernahmeschutz, Abwehr eines feindlichen Angebots. */
export interface StockDefenseInput {
  type: "stockDefense";
  action: "rueckkauf" | "schutz" | "abwehr";
  shareBp?: Bp;
  active?: boolean;
}

/** S13 AUS-R70: Schalter „Module einzeln anbieten“ an der Lizenzvorlage. */
export interface ModuleOfferInput {
  type: "setModuleOffer";
  active: boolean;
}

/** S13 AUS-R21: Standgröße der Branchenmesse. */
export interface BoothInput {
  type: "setBooth";
  booth: BoothSize;
}

/** Endgame-Themen: Vermächtnis-Herausforderung annehmen oder aufgeben. */
export interface ChallengeInput {
  type: "challenge";
  id: string;
  action: "annehmen" | "aufgeben";
}

/** Strategiekonferenz: eines der angebotenen Jahresziele annehmen. */
export interface AnnualGoalInput {
  type: "annualGoal";
  index: number;
}

/** MKT-R21: Regel für Preisaktionen. */
export interface PriceRuleInput {
  type: "setPriceRule";
  rule: PriceRule;
}

export interface MarketingInput {
  type: "setMarketing";
  projectId: number;
  budgetPermille?: number;
  autoAnnounce?: boolean;
  announce?: boolean;
  /** MKT-R07, MKT-R08: Demo und Creator-Zugang. */
  demo?: DemoMode;
  creator?: boolean;
  /** MKT-R35: Messe-Auftritt. */
  fairPlan?: FairShow | "auto";
}

export interface PrintRunInput {
  type: "setPrintRun";
  projectId: number;
  units: number | null;
}

/** MKT-R09: Release-Paket; fehlende Punkte nimmt der Autopilot (MKT-T07). */
export interface ReleaseInput {
  type: "release";
  projectId: number;
  week?: number;
  priceCent?: Cent;
  printRun?: number | null;
  deluxe?: boolean;
  collectorUnits?: number;
  preorders?: boolean;
  demo?: DemoMode;
  dayOnePatch?: boolean;
  protection?: string;
  channel?: string;
  extras?: boolean;
  /** BTR-R37: Startkapazität der Server (gleichzeitige Spieler) für Live-Produkte; null = Vorschlag. */
  serverCapacity?: number | null;
}

/** MKT-R12: Termin verschieben. */
export interface PostponeInput {
  type: "postponeRelease";
  projectId: number;
  week: number;
}

export interface DecideInput {
  type: "decide";
  eventId: number;
  option: string;
}

export interface PlaytestInput {
  type: "playtest";
  projectId: number;
}

export interface AssignInput {
  type: "assign";
  personId: number;
  /** null = frei; Aufträge werden nur über das Auftrags-Angebot zugeordnet. */
  projectId: number | null;
  /** Ins Engine-Team (dann ohne projectId). */
  engine?: boolean;
}

/** S03 Abschnitt 6: Forschung einplanen (nächste Stufe eines Moduls), streichen, neue Hauptversion, Kapazität teilen. */
export interface ResearchInput {
  type: "planResearch";
  module: ModuleKind;
}

/** ENG-R30: Fremdmodul lizenzieren, kaufen oder die Lizenz beenden. */
export interface MiddlewareInput {
  type: "licenseModule" | "buyModule";
  vendor: string;
}

export interface EndLicenseInput {
  type: "endLicense";
  module: ModuleKind;
}

export interface EngineJobInput {
  type: "cancelEngineJob";
  jobId: number;
}

export interface MajorVersionInput {
  type: "startMajorVersion";
}

export interface EnginePlanInput {
  type: "setEnginePlan";
  plan: EnginePlan;
}

/** PRD-R40, PRD-R42: Pausieren, Fortsetzen (mit Personen), Abbrechen. */
export interface ProjectControlInput {
  type: "pauseProject" | "cancelProject";
  projectId: number;
}

export interface ResumeInput {
  type: "resumeProject";
  projectId: number;
  people: number[];
}

/** PRD-R41: Umsteuern eines laufenden Projekts (Umfang, Features, Plattformen oder Genre). */
export interface SteerInput {
  type: "steerProject";
  projectId: number;
  genre: string;
  scope: Scope;
  features: string[];
  platforms: string[];
}

/** FRM-R39: Kredit aufnehmen oder tilgen. */
export interface LoanInput {
  type: "takeLoan" | "repayLoan";
  amountCent: Cent;
}

/** FRM-R24: Umzug in ein anderes Büro. */
export interface MoveOfficeInput {
  type: "moveOffice";
  office: string;
}
/** FRM-R26 bis FRM-R28: Ausbau, Hardware, Komfort, Räume kaufen und verkaufen. */
export interface OfficeEquipInput {
  type: "buyHardware" | "buyComfort";
  level: number;
}
export interface RoomInput {
  type: "buyRoom" | "sellRoom";
  room: string;
}
export interface ExtendOfficeInput {
  type: "extendOffice";
}
/** LIZ-M17: eigene Marke anbieten (Lizenzspiel mit Vorlage oder Komplettverkauf, Preis ±50 %). */
export interface BrandOfferInput {
  type: "offerBrand";
  brandId: number;
  form: BrandForm;
  template: BrandTemplate;
  genre: string | null;
  priceFactorBp: Bp;
}
export interface BrandOfferControlInput {
  type: "withdrawBrandOffer" | "takeBrandOffer";
  offerId: number;
}

/** BTR-R07: Patch für ein veröffentlichtes Spiel mit freien Personen. */
/** BTR-R01, BTR-R04: Abteilung Betrieb einstellen. */
export interface OperationsInput {
  type: "setOperations";
  size?: number;
  auto?: boolean;
  splitBp?: Record<OpsPot, Bp>;
  outsourced?: boolean;
  analytics?: AnalyticsLevel;
  splitAuto?: boolean;
  autoPatch?: boolean;
  shutdownBelow?: number;
}

/** BTR-R20, BTR-R22: Monetarisierungs-Härte eines F2P-Produkts setzen oder ein Live-Produkt einstellen. */
export interface LiveInput {
  type: "setLive";
  projectId: number;
  hardnessBp?: Bp;
  shutdown?: boolean;
  /** BTR-R15: Kampagnen-Budget je Monat. */
  campaignCent?: Cent;
}

/** FRM-R76: gezielte Personalsuche beauftragen. */
export interface SearchInput {
  type: "startSearch";
  area: Area;
  minStrength: number;
}

/** MKT-R47: Early Access starten (Preis als Anteil des geplanten Preises). */
export interface EarlyAccessInput {
  type: "startEarlyAccess";
  projectId: number;
  priceBp?: Bp;
}

/** BTR-R35, BTR-R37: Server mieten (Blöcke, Vorlauf) oder kündigen, Regel ein/aus und Faktor. */
export interface ServerInput {
  type: "setServer";
  projectId: number;
  /** Gewünschte Mietkapazität (gleichzeitige Spieler); mehr wird bestellt, weniger zum Monatsende gekündigt. */
  rented?: number;
  rule?: boolean;
  ruleBp?: Bp;
}

export interface PatchInput {
  type: "planPatch";
  projectId: number;
  size: PatchSize;
  people: number[];
}

/** FRM-R42: Projekt bei Publishern anbieten (Konzept oder Vertical Slice). */
export interface PitchInput {
  type: "pitchPublisher";
  projectId: number;
  mode: "konzept" | "slice";
}

/** FRM-R44: Forderung stellen, Angebot annehmen oder ablehnen. */
export interface PublisherOfferInput {
  type: "publisherOffer";
  offerId: number;
  action: "fordern" | "annehmen" | "ablehnen";
  terms?: Partial<PublisherTerms>;
}

/** FRM-R32 bis FRM-R34: Standort eröffnen, schließen, Person versetzen (locationId 0 = Heimatstandort). */
export interface LocationInput {
  type: "location";
  action: "eroeffnen" | "schliessen" | "versetzen";
  region?: Region;
  locationId?: number;
  personId?: number;
}

export type Input = AcquireInput | SubsidiaryInput | IpoInput | DividendInput | CapitalRaiseInput | FutureBetInput | LocationInput | PitchInput | PublisherOfferInput | SearchInput | EarlyAccessInput | ServerInput | LiveInput | OperationsInput | PatchInput | BrandOfferInput | BrandOfferControlInput | OfficeEquipInput | RoomInput | ExtendOfficeInput | DelegationLevelInput | RuleInput | RuleControlInput | ProducerInput | ProjectProducerInput | TeamInput | DeclineContractGameInput | TeamFocusInput | PhaseFocusInput | PolishInput | LanguagesInput | TeamMembersInput | DissolveTeamInput | AssignTeamInput | StaffPolicyInput | FireInput | PoachInput | RequestDevkitInput | LicenseModelInput | LicenseTemplateInput | BindingInput | SwitchMajorInput | RequestPriorityInput | MiddlewareInput | EndLicenseInput | ResearchInput | EngineJobInput | MajorVersionInput | EnginePlanInput | FoundEngineInput | SteerInput | MoveOfficeInput | CreateProjectInput | ReleaseInput | DecideInput | PlaytestInput | AssignInput | ProjectControlInput | ResumeInput | LoanInput | PrintRunInput | MarketingInput | PostponeInput | SetPriceInput | PriceRuleInput | ContinueInput | GuideSeenInput | AnnualGoalInput | BoothInput | PublishingOfferInput | PublishingDealInput | ModuleOfferInput | StockDefenseInput | ChallengeInput;
