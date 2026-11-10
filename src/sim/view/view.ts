// Anzeigemodell für die Oberfläche (S12 TEC-R21, TEC-R88). Werte bleiben bp und Cent; formatiert wird erst in der UI.
import { contractGamesUnlocked } from "../systems/produkte/auftragsspiele";
import { cardMatches } from "../systems/produkte/saeulen";
import { groupsOf, phaseGroup } from "../systems/produkte/phasenfokus";
import { availableLanguages, languageCost, localizationFactor } from "../systems/produkte/lokalisierung";
import { searchFee, searchWeeks } from "../systems/suche";
import { operationsView, type OperationsView } from "./betriebView";
import { liveKind } from "../systems/live";
import { ownCapacity, suggestedStartServer } from "../systems/server";
import { validateEarlyAccess } from "../systems/produkte/earlyaccess";
import { type Bp, BP_ONE, type Cent, divInt, mulBp } from "../num";
import { dateOf, type CalendarDate, WEEKS_PER_YEAR } from "../calendar";
import { AREAS, type Applicant, type Area, type AreaMap, type TeamFocus, type Assignment, type ContractOffer, type EventKind, type GameData, type GameEvent, type ModuleKind, type GameState, type KnowledgeEntry, type LedgerMonth, type LogEntry, type Person, type Project, type ProductSales, type ReleaseResult, type Yearbook, type Scope, type ScopeMap, type ScoreFactor, type Settings } from "../model/types";
import { activeProjects, allowedOwnProjects, pausedProjects, remainingWeeks } from "../systems/produkte/projects";
import { interestCap, interestLabel, lateEnough } from "../systems/marketing";
import { suggestedPrice } from "../systems/preise";
import { boothCost, fairSuggestion, isTradeFair, nextFairWeek } from "../systems/messe";
import { regionalTax } from "../systems/standorte";
import { hallOfFame } from "../systems/ziele";
import { motivationView, type MotivationView } from "./motivationView";
import { endgameView, type EndgameView } from "./endgameView";
import { publishingView, type PublishingView } from "./publishingView";
import { nomineeName, playerAwards } from "../systems/branchenpreise";
import { canContinue, legacy, paused } from "../systems/spielende";
import { integrationStatus, scenarioDef } from "../systems/szenarien";
import { conditionNeeds, type ConditionNeed } from "../systems/katalog";
import { agedValue, scaledEffort, totalEffort } from "../systems/produkte/quality";
import { forecast, validatePlaytest } from "../systems/produkte/forecast";
import { ranking, type RankingEntry } from "../systems/ki/rangliste";
import { liveStudios } from "../systems/ki/studios";
import { rivalsView, rivalTicker, type RivalView } from "./rivalView";
import { makersView, type MakerView } from "./makerView";
import { devkitPlatforms, playerFeeBp } from "../systems/plattformen";
import { weeklyDemand, activePlatforms, digitalOnly, expectedRevenue, platformById, grossPrice, mediumOf, platformBase, printRunScore, productionCost, recommendedPrintRun } from "../systems/markt";
import { defaultPlan, earliestReleaseWeek, needsCertification, standardPrice } from "../systems/produkte/release";
import { availableProtections } from "../systems/piraterie";
import { channelBlocker } from "../systems/vertrieb";
import { knowledgeStatus, type KnowledgeStatus } from "../systems/wissensbuch";
import { assignedTo, contractQuality, maxPersonsNow, personById, validateMove, contractTeam, teamContractQuality } from "../systems/firma";
import { creditLimit, creditNote, inCushion, preset, weeklyRent, weeklyWages } from "../systems/finanzen";
import { teamMembers, validateFire } from "../systems/personal";
import { currentRent, epochPrice, levelPrice, monthlyUpkeep, officeHardware, officePlaces, officeRent, officeSlots, placesOf, slotsOf, upgradeLevel, usedSlots, validateBuyLevel, validateBuyRoom, validateExtend } from "../systems/buero";
import { briefAtRisk, delegationUnlocked, eventKey, leadCapacity, manualUnits, optionsFor, overloadFactor, producerProjects, ruleHits, suggestedRule, validateAppoint } from "../systems/delegation";
import { buyPrice, engineBehind, engineCapacity, engineLevels, engineTeam, licenseFee, majorEffort, maxLevel, plannedLevel, projectEngineFactor, rebuildRecommended, researchBlocker, researchEffort, stateOfArt, updateCost, validateMajor, validateMiddleware, vendorLevel } from "../systems/engine";
import { isFrozen, majorSwitchWeeks, validateBinding, validateSwitchMajor } from "../systems/bindung";
import { platformBudget, platformVersions, type PlatformVersion } from "../systems/leistung";
import { brandFreshness, brandStrength, pauseUntilWeek, isEstablished } from "../systems/marken";
import { stageView, type StageView } from "./buehneView";
import { brandDealView, brandMarketView, type BrandDealView, type BrandMarketView } from "./markenmarktView";
import { licensedEngineChoices, licenseEventView, licensingView, type LicenseEventView, type LicensingView } from "./lizenzView";
import { MODULES, SCOPES, type MarketPhase, type CrunchRule, type SalaryLevel, type DecisionRecord, type DelegationArea, type DelegationLevel, type DelegationRule, type ProducerAttrs, type ProducerBrief, type LicenseTemplateId, type EngineId, type EnginePlan, type ModuleMap, type PhaseFocusOption, type ModuleNeed, type ModuleState, type ProjectEngine, type ProjectMarketing, type PriceRule, type FairShow, type Reissue, type LongTermGoal, type Ending, type Legacy, type ReleasePlan, type GuideSeen, type BoothSize } from "../model/types";
import { marketPhase } from "../systems/marktphasen";
import { type ProjectPublisherView, projectPublisherView } from "./publisherView";
import { type LocationsView, locationsView } from "./standorteView";
import { type FutureView, futureView } from "./zukunftView";
import { type StockView, stockView } from "./boerseView";
import { type KonzernView, konzernView } from "./konzernView";
import { type BoardDraft, strongStart } from "./boardView";
export { type BoardDraft, type BoardPreview, type QualityPreview, boardPreview, strongStart } from "./boardView";

export interface FeatureCard {
  id: string;
  area: Area;
  /** Im laufenden Jahr verfügbar (Feature.availableFrom). */
  available: boolean;
  /** Grundwert nach Alterung (PRD-R16) und ob der Nachfolger schon da ist. */
  agedValue: Bp;
  outdated: boolean;
  /** Aufwand je Bereich bei Umfang mittel, bp-Personenwochen. */
  effort: AreaMap;
  /** Gesamtaufwand je Umfang nach PRD-R28, bp-Personenwochen. */
  effortByScope: ScopeMap;
  baseValue: Bp;
  innovation: Bp;
  tags: string[];
  contentLevel: number;
  /** PRD-R11: nötiges Engine-Modul und Leistungskosten (Punkte, ohne Erfahrung). */
  requires: ModuleNeed;
  performanceCost: number;
}

/** S03 Abschnitt 6, Engine-Werkstatt: Module, Arbeiten des Teams, Plan, Fremdmodule. */
export interface EngineView {
  name: string;
  major: number;
  minor: number;
  versions: number;
  team: number[];
  /** bp-Personenwochen je Woche. */
  capacityBp: Bp;
  plan: EnginePlan;
  modules: (ModuleState & {
    module: ModuleKind;
    art: number;
    max: number;
    planned: number;
    /** Nächste planbare Stufe mit Aufwand und Sperrgrund (null = frei). */
    next: { level: number; effortBp: Bp; blocked: string | null } | null;
  })[];
  jobs: {
    id: number; kind: "forschung" | "anforderung" | "hauptversion"; module: ModuleKind | null; level: number;
    effortBp: Bp; doneBp: Bp; projects: string[]; weeksToDeadline: number | null; priority: number;
  }[];
  majorEffortBp: Bp;
  majorBlocked: string | null;
  rebuild: ModuleKind | null;
  /** Balancing 1.0: Module, die mehr als `behindLevels` Stufen hinter dem Stand der Technik liegen. */
  behind: { module: ModuleKind; level: number; art: number }[];
  behindLevels: number;
  middleware: {
    vendor: string; module: ModuleKind; level: number | null; buyCent: Cent;
    /** ENG-R30: Gebühr je Spiel (klein, mittel) und Umsatzbeteiligung. */
    feeModel: "groesse" | "beteiligung"; feeKleinCent: Cent; feeMittelCent: Cent; royaltyBp: Bp;
    licenseBlocked: string | null; buyBlocked: string | null; active: boolean;
  }[];
}

/** S02 5.5, PRD-R70: Franchise-Cockpit; sichtbar sind Stärke und Frische, dazu Fans und Titel. */
export interface BrandView {
  id: number;
  name: string;
  strengthBp: Bp;
  freshnessBp: Bp;
  fans: number;
  titles: { id: number; title: string; scoreBp: Bp | null }[];
  /** Wochen, bis die Pause empfohlen nicht mehr nötig ist (0 = jetzt bereit). */
  pauseWeeks: number;
  lastTitleWeeksAgo: number | null;
  /** Prüfung Fable 03.11.2026: Hit oder Nachfolger; sonst im Cockpit unter „Weitere Titel“. */
  established: boolean;
}

/** Etappe 6c.3: Angebot auf dem Marktplatz der Auftragsspiele. */
export interface ContractGameOfferView {
  id: number;
  client: string;
  genre: string;
  theme: string | null;
  scope: Scope;
  platform: string;
  audience: string | null;
  minScoreBp: Bp;
  weeks: number;
  payCent: Cent;
  advanceCent: Cent;
  bonusCent: Cent;
  bonusScoreBp: Bp;
  penaltyCent: Cent;
  expiresWeeks: number;
}

export interface ContractGamesView {
  unlocked: boolean;
  unlockAfterReleases: number;
  offers: ContractGameOfferView[];
}

export interface LocalizationView {
  home: string;
  /** Je verfügbarer Sprache: Kosten und Nachfrage-Zuwachs, wenn sie allein dazukommt. */
  options: { id: string; costCent: Cent; gainBp: Bp }[];
  /** Nachfragefaktor der aktuellen Wahl und Gesamtkosten beim Release. */
  factorBp: Bp;
  costCent: Cent;
}

function localizationView(state: GameState, data: GameData, p: Project): LocalizationView {
  const year = dateOf(state.startYear, state.week).year;
  const cost = languageCost(data, p, year);
  return {
    home: data.localization.home,
    options: availableLanguages(data, year).map((id) => ({ id, costCent: cost, gainBp: localizationFactor(data, [id], year) - BP_ONE })),
    factorBp: localizationFactor(data, p.languages, year),
    costCent: cost * (p.contractGame ? 0 : p.languages.length),
  };
}

export interface PhaseFocusView {
  group: string;
  current: string;
  options: PhaseFocusOption[];
  /** Läuft gerade bzw. ist schon vorbei (Wahl wirkt nicht mehr). */
  active: boolean;
  done: boolean;
}

/** Etappe 6c.6: Schwerpunkt je Phasengruppe mit Optionen; vorbei, wenn die Gruppe hinter der laufenden Phase liegt. */
function phaseFocusView(data: GameData, p: Project): PhaseFocusView[] {
  const phases = data.projects.phases[p.scope].map((x) => x.id);
  const idx = phases.indexOf(p.phase);
  const finished = p.status !== "laeuft" && p.status !== "pausiert";
  return groupsOf(data, p.scope).map((group) => {
    const own = phases.map((ph, i) => (phaseGroup(data, ph) === group ? i : -1)).filter((i) => i >= 0);
    return {
      group,
      current: p.phaseFocus[group] ?? data.phaseFocus.default,
      options: data.phaseFocus.options[group] ?? [],
      active: !finished && own.includes(idx),
      done: finished || own.every((i) => i < idx),
    };
  });
}

export interface ProjectView {
  /** Etappe 6c.6: Phasen-Schwerpunkt und bisheriger Qualitätsfaktor daraus. */
  phaseFocus: PhaseFocusView[];
  phaseQualityBp: Bp;
  /** Etappe 6c.7: Bereich in Politur und erreichter Bonus je Bereich. */
  polishArea: Area | null;
  polish: Partial<Record<Area, Bp>>;
  /** Etappe 6c.8: übersetzte Sprachen; vor dem Release die Wahl mit Kosten und Wirkung je Sprache. */
  languages: string[];
  localization: LocalizationView | null;
  /** Etappe 6c.4: Zielgruppe. */
  audience: string;
  /** Etappe 6c.5: Design-Säulen. */
  pillars: string[];
  /** Etappe 6c.3: Auftragsspiel (Auftraggeber, Mindestwertung, Wochen bis zur Frist, Zahlungen, Stand) oder null. */
  contractGame: { client: string; minScoreBp: Bp; weeksLeft: number; finalCent: Cent; bonusCent: Cent; bonusScoreBp: Bp; penaltyCent: Cent; status: string } | null;
  /** MKT-R47 bis R50: Early Access dieses Projekts oder null. */
  earlyAccess: { sold: number; revenueCent: Cent; satisfactionBp: Bp; updates: number; priceBp: Bp; ended: boolean } | null;
  /** Early-Access-Knopf: null = möglich, Schlüssel = Grund; undefined = nicht anzeigen (zu früh, kein PC, schon gestartet). */
  earlyAccessBlocked: string | null | undefined;
  /** FRM-R42 bis FRM-R47: Pitch, Angebote und Vertrag; undefined = nicht freigeschaltet. */
  publisher: ProjectPublisherView | undefined;
  id: number;
  title: string;
  genre: string;
  subgenre: string | null;
  theme: string;
  scope: Scope;
  features: string[];
  status: Project["status"];
  phase: string;
  phases: string[];
  progressBp: Bp;
  bugs: number;
  bugHistory: number[];
  weeksRunning: number;
  readyWeeks: number;
  costCent: Cent;
  result: ReleaseResult | null;
  /** Zugeordnete Personen (IDs) und Restwochen bei dieser Besetzung (null = niemand zugeordnet). */
  people: number[];
  remainingWeeks: number | null;
  /** Playtests ohne die wahre Prognose (PRD-R32: die Mitte verrät sie nicht). */
  playtests: { week: number; phase: string; lowBp: Bp; highBp: Bp; weaknesses: ScoreFactor[] }[];
  /** null = Playtest möglich, sonst Textschlüssel. */
  playtestBlocked: string | null;
  playtestRunning: boolean;
  dayOnePatch: boolean;
  platforms: string[];
  /** S05 Project.marketing mit Anzeigeform je Epoche (MKT-R01), Deckel und Wasserfall der letzten Woche. */
  marketing: ProjectMarketing & { label: "vorbestellungen" | "hype" | "wishlists"; capPeople: number; maxPermille: number; lateEnough: boolean; creatorAvailable: boolean;
    /** MKT-R35: Vorschlag für die nächste Branchenmesse, ihre Woche (Datum) und ob sie noch Handelsmesse ist. */
    fair: { suggestion: FairShow; date: CalendarDate; trade: boolean } };
  /** MKT-R22: gewählte Auflage (null = Empfehlung), Empfehlung und Kosten der gewählten Auflage. */
  printRun: number | null;
  recommendedPrintRun: number;
  printRunCostCent: Cent;
  /** MKT-T09: rein digital, keine Auflage. */
  digitalOnly: boolean;
  /** PRD-R26: Zertifizierung (null = nicht nötig). */
  certification: { weeksLeft: number | null; attempts: number; passed: boolean } | null;
  sales: ProductSales | null;
  /** MKT-R17: vorgeschlagener Preis nach der Kurve (null ohne Preisdaten). */
  suggestedPriceCent: Cent | null;
  /** PRD-R43: durch das Archiv gesparter Aufwand. */
  archiveSavingBp: Bp;
  /** PRD-R01: Produkttyp; nur Standardspiele lassen sich umsteuern (PRD-R41). */
  productType: string;
  resumeWeeksLeft: number;
  /** PRD-R44: Abbruch-Prognose ohne bereits ausgegebenes Geld: Restkosten gegen erwarteten Ertrag (null wenn nicht laufend). */
  outlook: { remainingCostCent: Cent; expectedRevenueCent: Cent } | null;
  /** PRD-R10, ENG-R41, ENG-R44: Engine-Stand, Bindung, Freeze und Kosten des Umstiegs auf die neue Hauptversion. */
  engine: ProjectEngine & { frozen: boolean; bindingBlocked: string | null; switchWeeks: number | null; factorBp: Bp };
  /** PRD-R12, ENG-R53: bestellte Karten, Notlösungen, Warten auf die Engine. */
  pendingFeatures: string[];
  makeshift: string[];
  waitingForEngine: boolean;
  /** PRD-R61: Versionen je Plattform (laufend: Vorschau, veröffentlicht: Anteile beim Release). */
  versions: PlatformVersion[];
  brandName: string | null;
  /** Vergleich mit dem vorher veröffentlichten Projekt. */
  previous: { id: number; title: string; scoreBp: Bp; bars: ReleaseResult["bars"] } | null;
  /** MKT-R09, MKT-R27: vorbelegtes Release-Paket mit den Wahlmöglichkeiten (nur für fertige Projekte). */
  releasePackage: ReleasePackageView | null;
  /** MKT-R12: bestätigter Termin, solange das Spiel noch nicht erschienen ist. */
  releasePlanned: CalendarDate | null;
}

export interface ReleasePackageView {
  defaults: ReleasePlan;
  earliest: CalendarDate;
  priceEditable: boolean;
  priceMinCent: Cent;
  priceMaxCent: Cent;
  editionsAvailable: boolean;
  collectorMax: number;
  physical: boolean;
  protections: { id: string; strengthBp: Bp; satisfaction: number; holdWeeks: [number, number] | null; royaltyBp: Bp | null }[];
  channels: { id: string; blocker: string | null; shareBp: Bp; reachBp: Bp; returns: boolean }[];
  /** MKT-V06: Mehrkosten der Beigaben je Stück (Anteil der Stückkosten). */
  extrasCostBp: Bp;
  /** MKT-R14: Konkurrenz mit Release in derselben Woche (KI-Titel). */
  sameWeek: number;
  /** Punkt 9 (BTR-R37): Startkapazität der Server für Live-Produkte (Vorschlag und eigene Kapazität) oder null. */
  server: { suggested: number; own: number; rentBlock: number } | null;
}

export interface KnowledgeView {
  key: string;
  factor: KnowledgeEntry["factor"];
  ref: KnowledgeEntry["ref"];
  params: Record<string, number>;
  status: KnowledgeStatus;
  direction: 1 | -1;
  count: number;
  up: number;
  down: number;
  lastWeek: number;
}

export interface PersonView {
  id: number;
  name: string;
  isFounder: boolean;
  strength: AreaMap;
  bestArea: Area;
  salaryCent: Cent;
  assignment: Assignment | null;
  transferWeeks: number;
  /** FRM-R02 bis FRM-R10: Team, Einarbeitung, Moral, Burnout, Schlüsselrolle. */
  teamId: number | null;
  onboardWeeks: number;
  moraleBp: Bp;
  burnoutBp: Bp;
  key: { role: string; traits: string[]; loyaltyBp: Bp } | null;
  fireBlocked: string | null;
  /** FRM-R32: Standort (0 = Heimatstandort). */
  locationId: number;
}

/** FRM-R55 bis FRM-R62: Delegation, Führungskapazität, Produzenten und Regeln. */
export interface DelegationView {
  unlocked: boolean;
  unlockProjects: number;
  levels: Record<DelegationArea, DelegationLevel>;
  capacity: number;
  units: { projects: number[]; areas: DelegationArea[] };
  factorBp: Bp;
  rules: (DelegationRule & { fired: number; wouldHave: number })[];
  log: DecisionRecord[];
  producers: { personId: number; name: string; attrs: ProducerAttrs; maxProjects: number; projects: { id: number; title: string; brief: ProducerBrief | null; risk: string | null }[] }[];
  candidates: { personId: number; name: string; blocked: string | null }[];
  /** Regel-Editor: Ereignisarten mit ihren Optionen. */
  eventKeys: { key: string; options: string[] }[];
  brands: { id: number; name: string }[];
}

/** FRM-R02, FRM-R15 bis FRM-R17, FRM-R20: Teams und Personalpolitik. */
export interface StaffView {
  /** Etappe 6c.2: Schwerpunkt (Bereich, „qa“ oder null) und mittlere Stärke im Schwerpunkt bzw. im besten Bereich. */
  teams: { id: number; name: string; members: number[]; moraleBp: Bp; burnoutBp: Bp; focus: TeamFocus; strength: number }[];
  /** Etappe 6c.2: Bonus/Malus der Fachteams und Fundrate des QA-Teams (für Hinweise). */
  teamFocus: { inAreaBp: Bp; outAreaBp: Bp; qaFindRateBp: Bp };
  teamsBlocked: string | null;
  salary: SalaryLevel;
  crunch: CrunchRule;
  targetSize: number | null;
  severanceMonths: number;
  /** FRM-R76: laufende Suche (Wochen bis Ergebnis) und Gebühr/Dauer je Mindeststärke (40, 50 … 90). */
  search: { area: Area; minStrength: number; weeksLeft: number } | null;
  searchOptions: { minStrength: number; feeCent: Cent; weeks: number }[];
  searchAreas: Area[];
}

export interface ContractView {
  id: number;
  kind: string;
  client: string;
  area: Area;
  weeksLeft: number;
  payCent: Cent;
  requirement: number;
  personId: number;
  personIds: number[];
  expectedQuality: number;
}

export interface EventView {
  id: number;
  kind: EventKind;
  scope: "projekt" | "welt";
  /** Spieltest (Abweichung von UI-R66): hält diese Entscheidung die Zeit an? */
  pauses: boolean;
  projectId: number | null;
  projectTitle: string | null;
  weeksLeft: number;
  options: string[];
  defaultOption: string;
  review?: { from: string; to: string; forecastBefore: Bp; forecastAfter: Bp };
  extraBugs?: number;
  /** FRM-R53: Forderung der Hauptversammlung. */
  stockDemand?: "sparprogramm" | "projektStreichen";
  /** UEB-R08: Gegenangebot einer Zielfirma. */
  counter?: { studio: string; cent: Cent; bidCent: Cent };
  /** Angebot mit der erreichbaren Qualität q je Person (FRM-R49). */
  offer?: ContractOffer & { quality: Record<string, number>; teamNames?: string[]; teamQuality?: number };
  applicant?: Applicant;
  reorder?: { units: number; costCent: Cent; leadWeeks: number; expectedUnits: number; expectedRevenueCent: Cent };
  /** Katalog-Ereignis: Datensatz und Namen der Ziele für den Text. */
  defId?: string;
  personName?: string;
  productTitle?: string;
  /** S06 Abschnitt 9: Kosten der teuren Option und fehlende Serverkapazität. */
  opsCostCent?: Cent;
  opsGap?: number;
  /** FRM-R76: Kandidaten der gezielten Suche. */
  candidates?: Applicant[];
  module?: ModuleKind;
  featureId?: string;
  brandName?: string;
  /** S04: Lizenzanfrage, Großkunde oder Preis-Schock. */
  license?: LicenseEventView;
  /** S05: Konkurrent auf deiner Woche (Studio). */
  duelStudio?: string;
  /** S04 Abschnitt 13: Markenanfrage oder Konkursmasse. */
  brandDeal?: BrandDealView;
  platformDeal?: GameEvent["platformDeal"];
  /** MKT-V24, MKT-R51: Verwertung und Abo-Deal. */
  reissue?: GameEvent["reissue"];
  subscription?: GameEvent["subscription"];
  /** FRM-R11: abwerbendes Studio. */
  poachFrom?: string;
  /** FRM-R61: Schlüssel für Regeln und vorgeschlagene Option für „Nicht mehr fragen – Regel anlegen“. */
  eventKey: string;
  suggestRule: string | null;
  /** FRM-R30: angebotene Hardware-Stufe mit Preis. */
  upgrade?: { level: number | null; costCent: Cent; factorBp: Bp };
}

export interface RoadmapItem {
  id: string;
  unlocked: boolean;
  /** Bedingung erfüllt, wartet auf den nächsten Release (KRN-R41). */
  waiting: boolean;
  any: boolean;
  needs: ConditionNeed[];
}

/** Systeme aus data/core/unlocks.json plus Delegation (Projektzahl) und Lizenzmarkt (eigener Auslöser). */
/** Prüfung Fable 03.11.2026: Marken der Zeitleiste neben Plattformen und eigenen Releases. */
function timelineMarks(state: GameState, data: GameData): Omit<ViewModel["timeline"], "platforms"> {
  const year = dateOf(state.startYear, state.week).year;
  const from = state.week - 5 * WEEKS_PER_YEAR;
  const to = state.week + 2 * WEEKS_PER_YEAR;
  const at = (w: number) => {
    const d = dateOf(state.startYear, w);
    return { year: d.year, week: d.weekOfYear };
  };
  const name = (id: number) => state.ai.studios.find((s) => s.id === id)?.name ?? "?";
  const hits = state.ai.products
    .filter((p) => p.releaseWeek >= from && p.scoreBp >= data.brands.hitScoreBp)
    .sort((a, b) => b.scoreBp - a.scoreBp || a.id - b.id).slice(0, 30)
    .map((p) => ({ ...at(p.releaseWeek), studio: name(p.studioId), genre: p.genre, scoreBp: p.scoreBp as Bp | null }));
  const planned = state.ai.studios.flatMap((s) => s.teams.filter((t) => t.project && t.project.plannedReleaseWeek > state.week && t.project.plannedReleaseWeek <= to)
    .map((t) => ({ week: t.project!.plannedReleaseWeek, studio: s.name, genre: t.project!.genre })))
    .sort((a, b) => a.week - b.week || a.studio.localeCompare(b.studio)).slice(0, 20)
    .map((p) => ({ ...at(p.week), studio: p.studio, genre: p.genre, scoreBp: null }));
  const fairs = Array.from({ length: 8 }, (_, i) => year - 5 + i)
    .filter((y) => y >= state.startYear)
    .map((y) => ({ year: y, week: data.tradeShows.fairWeekOfYear, trade: isTradeFair(data, y) }));
  const contractEnds = state.contracts.filter((c) => c.deadlineWeek <= to).sort((a, b) => a.deadlineWeek - b.deadlineWeek || a.id - b.id)
    .map((c) => ({ ...at(c.deadlineWeek), client: c.client }));
  return { foreign: [...hits, ...planned], fairs, contractEnds };
}

function roadmap(state: GameState, data: GameData): RoadmapItem[] {
  const items: RoadmapItem[] = data.unlocks.systems.map((sys) => ({
    id: sys.id, unlocked: state.unlocks[sys.id] !== undefined, waiting: state.unlockWaiting[sys.id] !== undefined,
    ...conditionNeeds(sys.condition, { state, data }),
  }));
  items.push({
    id: "delegation", unlocked: state.unlocks["delegation"] !== undefined, waiting: false, any: false,
    needs: [{ field: "firma.projekte", value: data.delegation.unlockProjects, current: activeProjects(state).length }],
  });
  items.push({ id: "lizenzmarkt", unlocked: state.unlocks["lizenzmarkt"] !== undefined, waiting: false, any: false, needs: [] });
  // Etappe 6c.11 (Fahrplan „Was kommt noch“): Schwellen der Systeme aus 6b und 6c, aus deren Daten.
  const year = dateOf(state.startYear, state.week).year;
  const releases = state.projects.filter((p) => p.result !== null && p.type === "standard").length;
  const people = state.people.length;
  const gate = (id: string, needs: ConditionNeed[]) =>
    items.push({ id, unlocked: needs.every((n) => n.current >= n.value), waiting: false, any: false, needs });
  gate("teams", [{ field: "firma.mitarbeiter", value: data.staff.teamMinStaff, current: people }]);
  gate("auftragsspiele", [{ field: "firma.releases", value: data.contractGames.unlockAfterReleases, current: releases }]);
  gate("gross", [{ field: "jahr", value: data.projects.scopeFromYear.gross, current: year }]);
  gate("aaa", [{ field: "jahr", value: data.projects.scopeFromYear.aaa, current: year }]);
  gate("boerse", [{ field: "jahr", value: data.stock.ipo.fromYear, current: year }, { field: "firma.mitarbeiter", value: data.stock.ipo.minPeople, current: people }]);
  gate("uebernahmen", [{ field: "jahr", value: data.acquisitions.unlockYear, current: year }, { field: "firma.mitarbeiter", value: data.acquisitions.unlockPeople, current: people }]);
  return items;
}

function galaView(state: GameState): ViewModel["goals"]["gala"] {
  const last = state.awards[state.awards.length - 1];
  if (!last) return null;
  const year = state.awards.filter((a) => a.year === last.year);
  return {
    year: last.year, playerNominated: year.some((a) => a.nominees.some((n) => n.ownerId === 0)),
    categories: year.map((a) => ({
      category: a.category, winner: a.winner,
      nominees: a.nominees.map((n) => ({ name: nomineeName(state, a.category, n), player: n.ownerId === 0 })),
    })),
  };
}

export interface ViewModel {
  /** Langzeitmotivation (Prüfung Fable 03.11.2026): Strategiekonferenz, Erzrivale, Epochen-Frage. */
  motivation: MotivationView;
  /** Endgame-Themen (Auftrag 04.11.2026): Herausforderungen, Standards, Nostalgie, Krisen. */
  endgame: EndgameView;
  /** S13 AUS-R40 bis AUS-R43: eigenes Publishing. */
  publishing: PublishingView;
  /** S13 AUS-R21: Standgröße der Branchenmesse mit Wirkung und Kosten dieses Jahres. */
  fairBooth: { size: BoothSize; options: { size: BoothSize; effectBp: Bp; costCent: Cent }[] };
  seed: string;
  settings: Settings;
  week: number;
  date: CalendarDate;
  /** FRM-R32 bis FRM-R34: Standorte. */
  locations: LocationsView;
  /** MRK-R57, MRK-R58, MRK-R68: Gerüchte, Wendepunkte und Wette auf die Zukunft. */
  future: FutureView;
  /** FRM-R51 bis FRM-R54: Börse. */
  stock: StockView;
  konzern: KonzernView;
  /** Etappe 6c.3: Marktplatz der Auftragsspiele. */
  contractGames: ContractGamesView;
  /** MRK-R59: Marktphase (Boom, normal, Krise). */
  marketPhase: MarketPhase;
  displayUnit: GameState["displayUnit"];
  moneyCent: Cent;
  weeklyCostCent: Cent;
  /** FRM-R38 bis FRM-R41: Kredit, Bonität, Startpolster, Insolvenzzähler und Monatsbuch. */
  finance: {
    weeklyWagesCent: Cent;
    weeklyRentCent: Cent;
    loanCent: Cent;
    loanRateBp: Bp;
    creditNote: string;
    creditLimitCent: Cent;
    newLoanRateBp: Bp;
    cushionDebtCent: Cent;
    inCushion: boolean;
    insolvencyMonths: number;
    toleranceMonths: number;
    ledger: LedgerMonth[];
    /** A46: offener Verlustvortrag. */
    lossCarryCent: Cent;
    /** Prüfung Fable 03.11.2026: effektiver Gewinnsteuersatz (FRM-R72, nach Lohnanteil je Region). */
    taxRateBp: Bp;
  };
  gameOver: GameState["gameOver"];
  /** ZIE-R10: Abschluss-Bildschirm (offen, solange nicht weitergespielt wird). */
  ending: {
    reason: Ending["reason"];
    date: CalendarDate;
    legacy: Legacy;
    milestones: number;
    awards: number;
    canContinue: boolean;
    /** Rivalen-Vergleich: Spieler, Rivalen und die drei Umsatzstärksten. */
    rivals: { rank: number; name: string; player: boolean; rival: boolean; revenueCent: Cent; reputationBp: Bp; releases: number }[];
  } | null;
  presetId: string;
  people: PersonView[];
  staff: StaffView;
  delegation: DelegationView;
  maxPersons: number;
  /** S07 Büro (Entscheidung 1): aktuelles Büro und mögliche Umzüge. */
  office: {
    id: string; places: number; moveWeeksLeft: number; monthlyRentCent: Cent;
    options: { id: string; places: number; slots: number; blocked: string | null; monthlyRentCent: Cent; depositCent: Cent }[];
    /** FRM-R26 bis FRM-R30, Tabelle 5.4: Ausbau und Ausstattung. */
    slots: number; usedSlots: number; extensions: number; extendBlocked: string | null; upkeepCent: Cent;
    hardware: { level: number; year: number; factorBp: Bp; maxLevel: number; offers: { level: number; costCent: Cent; blocked: string | null }[] };
    comfort: { level: number; maxLevel: number; offers: { level: number; costCent: Cent; blocked: string | null }[] };
    rooms: { id: string; count: number }[];
    shop: { id: string; slots: number; priceCent: Cent; upkeepCent: Cent; from: number; blocked: string | null }[];
  };
  /** Laufende eigene Projekte, nach ID. */
  active: ProjectView[];
  /** PRD-R40: pausierte Projekte. */
  paused: ProjectView[];
  /** null = ein neues Projekt ist möglich, sonst Textschlüssel des Grunds. */
  newProjectBlocked: string | null;
  contracts: ContractView[];
  /** Offene Entscheidungen, älteste zuerst (A23: eine im Fokus, die übrigen warten). */
  events: EventView[];
  /** KRN-R62: letztes Jahrbuch; KRN-R61: Chronik; KRN-R40: freigeschaltete Systeme. */
  yearbook: Yearbook | null;
  chronicle: (LogEntry & { date: CalendarDate })[];
  unlocks: string[];
  /** Prüfung Fable 03.11.2026: Lernpfad und Hinweise, gesehen im Spielstand. */
  guideSeen: GuideSeen;
  /** Spieltest „Was gibt es“: alle freischaltbaren Systeme mit Stand und fehlenden Schwellen (KRN-R40). */
  roadmap: RoadmapItem[];
  /** Zeitleiste: Plattformen, die erschienen oder für das nächste Jahr angekündigt sind. */
  timeline: {
    platforms: { id: string; type: string; releaseYear: number; endYear: number }[];
    /** Prüfung Fable 03.11.2026 (Design: „unverzichtbar für das Release-Timing“): fremde Hits und angekündigte fremde Releases. */
    foreign: { year: number; week: number; studio: string; genre: string; scoreBp: Bp | null }[];
    /** Branchenmessen der letzten fünf und nächsten zwei Jahre (MKT-R35, MKT-R36). */
    fairs: { year: number; week: number; trade: boolean }[];
    /** Enden laufender Aufträge. */
    contractEnds: { year: number; week: number; client: string }[];
  };
  /** MRK-R37: die zehn umsatzstärksten Firmen und der Spieler (falls nicht darunter), Zahl der KI-Studios. */
  ranking: { entries: (RankingEntry & { rank: number })[]; studios: number };
  rivals: RivalView[];
  makers: MakerView[];
  rivalTicker: (LogEntry & { date: CalendarDate })[];
  /** Ergebnisse und Informationen, neueste zuerst. */
  log: (LogEntry & { date: CalendarDate })[];
  /** Veröffentlichte Projekte, neuestes zuerst. */
  products: ProjectView[];
  /** ZIE-R01, ZIE-R06: Meilensteine (ohne spätere), langfristiges Ziel, Ruhmeshalle. */
  goals: {
    milestones: { id: string; week: number | null; date: CalendarDate | null }[];
    goal: LongTermGoal | null;
    hallOfFame: { id: number; title: string; year: number; scoreBp: Bp; sold: number; awards: string[] }[];
    /** ZIE-R03: Branchenpreise, neueste zuerst (eigener Name leer = eigenes Studio). */
    awards: { year: number; category: string; name: string; player: boolean; playerNominated: boolean }[];
    /** 4b.3: Preis-Gala des jüngsten Preisjahrs mit allen Nominierten (ZIE-R04). */
    gala: { year: number; playerNominated: boolean; categories: { category: string; nominees: { name: string; player: boolean }[]; winner: number }[] } | null;
    playerAwards: number;
    /** ZIE-R13 bis ZIE-R15: laufendes Szenario mit Frist. */
    scenario: { id: string; status: string; deadlineYear: number; goalKind: string; platform: string | null; plannedEndYear: number | null; players: { now: number; target: number } | null;
      /** Indie-Durchbruch: bestes Interesse zum Release und höchstes Interesse eines laufenden Projekts. */
      interest: { released: number; running: number; target: number } | null;
      /** Konzern-Integration: Abgänge, erlaubte Abgänge, fertig integrierte Töchter. */
      integration: { left: number; maxLeft: number; done: number; total: number } | null } | null;
  };
  /** MKT-V15: Verwertungen mit Titel des ersten Originals. */
  reissues: (Reissue & { title: string })[];
  /** MKT-R21, A12: Regel für Preisaktionen; Rabattwochen ab diesem Jahr. */
  priceRule: PriceRule & { fromYear: number; maxDiscountBp: Bp };
  knowledge: KnowledgeView[];
  /** S03: eigene Engine (null = noch keine) und Sperrgrund für die Gründung. */
  engine: EngineView | null;
  foundEngineBlocked: string | null;
  /** S04 Abschnitt 8: Lizenzmarkt. */
  licensing: LicensingView;
  /** S06 Abschnitt 8 (Etappe 5.15): Betrieb als Unterseite der Projekte. */
  operations: OperationsView;
  brands: BrandView[];
  brandMarket: BrandMarketView;
  /** S11 UI-R70: Bühne der Zentrale. */
  stage: StageView;
  catalog: {
    genres: { id: string; expectedProfile: AreaMap; trendBp: Bp }[];
    themes: { id: string; trendBp: Bp; contentLevel: number }[];
    /** Untergenres je Genre (ANNAHME, Inhaltsausbau): Freischaltjahr und die Themen mit Bonus. */
    subgenres: { id: string; genre: string; fromYear: number; available: boolean; bonusThemes: string[] }[];
    features: FeatureCard[];
    slots: ScopeMap;
    scopes: Scope[];
    /** Etappe 6c.4: Zielgruppen mit höchster Altersfreigabe. */
    audiences: { id: string; maxRating: number }[];
    /** Etappe 6c.5: Design-Säulen mit Gewicht der Presse je Genre und den passenden Karten. */
    pillars: { id: string; genreWeightBp: Record<string, Bp>; cards: string[] }[];
    maxPillars: number;
    defaultAudience: string;
    /** Prüfung Fable 03.11.2026: Kartenreihen des ersten Projekts. */
    firstProjectAreas: Area[];
    firstProject: Omit<BoardDraft, "people">;
    /** S08: Plattformen im Handel mit Basis, Datenträger, Preis und Gebühr. */
    platforms: {
      id: string; type: string; base: number; medium: string; priceCent: Cent; licenseFeeBp: Bp; certification: boolean; endYear: number; budget: number;
      /** MRK-R17, MRK-R18: mit Devkit vor dem Start wählbar; Budget nur als Spanne. */
      launchYear: number | null; budgetLo: number; budgetHi: number;
    }[];
    /** PRD-R01: Produkttypen mit ihren Bedingungen. */
    productTypes: { live: string | null; requiresModule: { module: ModuleKind; level: number } | null; id: string; requiresSource: boolean; sameContent: boolean; fixedScope: Scope | null; needsNewerEngine: boolean; patch: string | null; requiresNewPlatform: boolean; engineSource: string }[];
    /** PRD-R10: wählbare Engines und ihre Stufen. */
    engines: { id: EngineId; levels: ModuleMap; name?: string; templates?: LicenseTemplateId[]; contractTemplate?: LicenseTemplateId | null }[];
  };
}

function releasePackageView(state: GameState, data: GameData, p: Project): ReleasePackageView {
  const year = dateOf(state.startYear, state.week).year;
  const plan = defaultPlan(state, data, p);
  const standard = standardPrice(state, data, p);
  const r = data.release;
  const physical = !digitalOnly(data, p.platforms, year);
  return {
    defaults: plan,
    earliest: dateOf(state.startYear, earliestReleaseWeek(state, data, p)),
    priceEditable: year >= r.priceFromYear,
    priceMinCent: mulBp(standard, r.priceMinBp),
    priceMaxCent: mulBp(standard, r.priceMaxBp),
    editionsAvailable: year >= r.deluxeFromYear,
    collectorMax: physical ? r.collectorMaxUnits : 0,
    physical,
    protections: availableProtections(data, year).map((l) => ({ id: l.id, strengthBp: l.strengthBp, satisfaction: l.satisfaction, holdWeeks: l.holdWeeks, royaltyBp: l.royaltyBp ?? null })),
    channels: data.distribution.channels.filter((c) => c.fromYear <= year && c.toYear >= year)
      .map((c) => ({ id: c.id, blocker: channelBlocker(state, data, p.platforms, c.id), shareBp: c.shareBp, reachBp: c.reachBp, returns: c.returns })),
    extrasCostBp: data.distribution.extras.unitCostBp,
    sameWeek: state.ai.studios.reduce((n, st) => n + st.teams.filter((tm) => tm.project && tm.project.plannedReleaseWeek === plan.week).length, 0),
    server: liveKind(data, p) ? {
      suggested: suggestedStartServer(state, data, weeklyDemand(state, data, p, forecast(state, data, p).scoreBp, 0, plan.week)),
      own: ownCapacity(state, data), rentBlock: data.liveService.server.rentBlock,
    } : null,
  };
}

/** Early-Access-Knopf (MKT-R47): ausblenden, solange es ihn noch nicht geben kann; sonst Grund oder null. */
function earlyAccessOffer(state: GameState, data: GameData, p: Project): string | null | undefined {
  const reason = validateEarlyAccess(state, data, { type: "startEarlyAccess", projectId: p.id });
  return reason === "error.tooEarly" || reason === "error.earlyAccessPc" || reason === "error.earlyAccessRunning" || reason === "error.notInDevelopment" ? undefined : reason;
}

function projectView(state: GameState, data: GameData, p: Project, previous: Project | null): ProjectView {
  return {
    id: p.id,
    title: p.title,
    genre: p.genre,
    subgenre: p.subgenre,
    theme: p.theme,
    scope: p.scope,
    features: p.features,
    status: p.status,
    phase: p.phase,
    phases: [...data.projects.phases[p.scope].map((x) => x.id), "launch"],
    phaseFocus: phaseFocusView(data, p),
    phaseQualityBp: p.phaseQualityBp,
    polishArea: p.polishArea,
    polish: p.polish,
    languages: p.languages,
    localization: (p.status === "laeuft" || p.status === "bereit") && (p.languages.length > 0 || dateOf(state.startYear, state.week).year >= data.localization.showFromYear)
      ? localizationView(state, data, p) : null,
    progressBp: divInt(p.effortDoneBp * 10000, p.effortTotalBp, 1),
    bugs: p.bugHistory[p.bugHistory.length - 1] ?? 0,
    bugHistory: p.bugHistory,
    weeksRunning: (p.result ? p.result.week + 1 : state.week) - p.startWeek,
    readyWeeks: p.readyWeek === null ? 0 : (p.result ? p.result.week : state.week) - p.readyWeek,
    costCent: p.costCent,
    result: p.result,
    people: assignedTo(state, p.id).map((x) => x.id),
    remainingWeeks: p.status === "veroeffentlicht" ? null : remainingWeeks(state, data, p),
    playtests: p.playtests.map((t) => ({ week: t.week, phase: t.phase, lowBp: t.lowBp, highBp: t.highBp, weaknesses: t.weaknesses })),
    playtestBlocked: p.status === "veroeffentlicht" ? "error.playtestPhase" : validatePlaytest(state, data, p.id),
    playtestRunning: p.playtestWeeksLeft > 0,
    dayOnePatch: p.dayOnePatch,
    platforms: p.platforms,
    marketing: {
      ...p.marketing, label: interestLabel(dateOf(state.startYear, state.week).year), capPeople: interestCap(state, data, p.platforms),
      maxPermille: data.marketing.budgetMaxPermille, lateEnough: lateEnough(data, p),
      creatorAvailable: dateOf(state.startYear, state.week).year >= data.marketing.creatorFromYear,
      fair: fairView(state, data, p),
    },
    printRun: p.printRun,
    recommendedPrintRun: p.sales ? 0 : recommendedPrintRun(state, data, p, printRunScore(data, p)),
    printRunCostCent: p.sales ? 0 : productionCost(state, data, p, p.printRun ?? recommendedPrintRun(state, data, p, printRunScore(data, p))).costCent,
    digitalOnly: digitalOnly(data, p.platforms, dateOf(state.startYear, state.week).year),
    certification: needsCertification(data, p) ? { weeksLeft: p.certWeeksLeft, attempts: p.certAttempts, passed: p.certPassed } : null,
    sales: p.sales,
    releasePackage: p.status === "bereit" && !p.releaseRequested ? releasePackageView(state, data, p) : null,
    earlyAccess: p.earlyAccess ? { sold: p.earlyAccess.sold, revenueCent: p.earlyAccess.revenueCent, satisfactionBp: p.earlyAccess.satisfactionBp, updates: p.earlyAccess.updates, priceBp: p.earlyAccess.priceBp, ended: p.earlyAccess.endWeek !== null } : null,
    earlyAccessBlocked: earlyAccessOffer(state, data, p),
    audience: p.audience,
    pillars: p.pillars,
    contractGame: p.contractGame ? {
      client: p.contractGame.client, minScoreBp: p.contractGame.minScoreBp, weeksLeft: p.contractGame.deadlineWeek - state.week,
      finalCent: p.contractGame.finalCent, bonusCent: p.contractGame.bonusCent, bonusScoreBp: p.contractGame.minScoreBp + data.contractGames.bonusMarginBp,
      penaltyCent: p.contractGame.penaltyCent, status: p.contractGame.status,
    } : null,
    publisher: projectPublisherView(state, data, p),
    releasePlanned: p.releaseRequested && p.releasePlan && p.status !== "veroeffentlicht" ? dateOf(state.startYear, p.releasePlan.week) : null,
    suggestedPriceCent: p.sales?.pricing ? suggestedPrice(data, p.sales.pricing, state.week - p.sales.startWeek) : null,
    archiveSavingBp: p.archiveSavingBp,
    productType: p.type,
    resumeWeeksLeft: p.resumeWeeksLeft,
    outlook: outlookOf(state, data, p),
    engine: {
      ...p.engine,
      frozen: isFrozen(data, p),
      bindingBlocked: p.status === "veroeffentlicht" ? "error.unknownProject"
        : validateBinding(state, data, p.id, p.engine.binding === "fest" ? "mitlaufend" : "fest"),
      switchWeeks: p.status !== "veroeffentlicht" && validateSwitchMajor(state, p.id) === null ? majorSwitchWeeks(data, p) : null,
      factorBp: p.patchedEngineBp ?? p.result?.quality.engineFactorBp
        ?? projectEngineFactor(data, p.engine.levels, p.features, dateOf(state.startYear, state.week).year).factorBp,
    },
    pendingFeatures: p.pendingFeatures,
    makeshift: p.makeshift,
    waitingForEngine: p.waitingForEngine,
    versions: p.status === "veroeffentlicht" ? [] : platformVersions(data, state, p.features, p.platforms),
    brandName: p.brandId === null ? null : state.brands.find((b) => b.id === p.brandId)?.name ?? null,
    previous: previous && previous.result
      ? { id: previous.id, title: previous.title, scoreBp: previous.result.scoreBp, bars: previous.result.bars }
      : null,
  };
}

function outlookOf(state: GameState, data: GameData, p: Project): ProjectView["outlook"] {
  if (p.status !== "laeuft" && p.status !== "bereit" && p.status !== "pausiert") return null;
  const people = assignedTo(state, p.id);
  const weekly = divInt(people.reduce((s, x) => s + x.salaryCent, 0) * 12, 52, 1);
  const weeks = remainingWeeks(state, data, p) ?? 0;
  return { remainingCostCent: weeks * weekly, expectedRevenueCent: expectedRevenue(state, data, p, forecast(state, data, p).scoreBp) };
}

function bestArea(p: Person): Area {
  return AREAS.reduce((b, a) => (p.strength[a] > p.strength[b] ? a : b), AREAS[0]);
}

function engineView(state: GameState, data: GameData): EngineView | null {
  const e = state.engine;
  if (!e) return null;
  const year = dateOf(state.startYear, state.week).year;
  return {
    name: e.name, major: e.major, minor: e.minor, versions: e.versions.length,
    behind: engineBehind(state, data), behindLevels: data.engine.behindWarnLevels,
    team: engineTeam(state).map((p) => p.id),
    capacityBp: engineCapacity(state, data),
    plan: e.plan,
    modules: MODULES.map((m) => {
      const planned = plannedLevel(e, m);
      const max = maxLevel(data, m);
      return {
        ...e.modules[m], module: m, art: stateOfArt(data, m, year), max, planned,
        next: planned >= max ? null : {
          level: planned + 1,
          effortBp: updateCost(data, researchEffort(data, m, planned + 1), e.modules[m].debtBp),
          blocked: researchBlocker(state, data, m, planned + 1),
        },
      };
    }),
    jobs: [...e.jobs].sort((a, b) => a.id - b.id).map((j) => ({
      id: j.id, kind: j.kind, module: j.module, level: j.level, effortBp: j.effortBp, doneBp: j.doneBp, priority: j.priority,
      projects: j.projects.map((id) => state.projects.find((p) => p.id === id)?.title ?? "?"),
      weeksToDeadline: j.deadlineWeek === null ? null : j.deadlineWeek - state.week,
    })),
    majorEffortBp: majorEffort(data, e),
    majorBlocked: validateMajor(state),
    rebuild: MODULES.find((m) => e.modules[m].debtBp >= data.engine.debt.rebuildRecommendBp) ?? rebuildRecommended(state, data),
    middleware: data.engine.middleware.vendors.filter((v) => v.fromYear <= year).map((v) => ({
      vendor: v.id, module: v.module, level: vendorLevel(data, v, year), feeModel: v.feeModel, feeKleinCent: licenseFee(data, v, year, "klein"), feeMittelCent: licenseFee(data, v, year, "mittel"), royaltyBp: v.royaltyBp, buyCent: buyPrice(data, v, year),
      licenseBlocked: validateMiddleware(state, data, "licenseModule", v.id), buyBlocked: validateMiddleware(state, data, "buyModule", v.id),
      active: e.modules[v.module].vendor === v.id,
    })),
  };
}

function brandViews(state: GameState, data: GameData): BrandView[] {
  return state.brands.filter((b) => b.ownerId === 0).sort((a, b) => a.id - b.id).map((b) => {
    const until = pauseUntilWeek(state, data, b);
    return {
      id: b.id, name: b.name, strengthBp: brandStrength(data, b), freshnessBp: brandFreshness(b),
      fans: Object.values(b.fans).reduce((s, v) => s + v, 0),
      titles: b.titles.map((id) => {
        const p = state.projects.find((x) => x.id === id);
        return { id, title: p?.title ?? "?", scoreBp: p?.result?.scoreBp ?? null };
      }),
      pauseWeeks: until === null ? 0 : Math.max(0, until - state.week),
      lastTitleWeeksAgo: b.lastTitleWeek === null ? null : state.week - b.lastTitleWeek,
      established: isEstablished(state, data, b),
    };
  });
}

function scenarioView(state: GameState, data: GameData): ViewModel["goals"]["scenario"] {
  const sc = state.scenario;
  const def = sc ? scenarioDef(data, sc.id) : null;
  if (!sc || !def) return null;
  const live = sc.liveProductId === undefined ? null : state.projects.find((p) => p.id === sc.liveProductId)?.ops?.live ?? null;
  const players = live && def.goal.factorBp ? { now: live.base, target: mulBp(sc.startPlayers ?? 0, def.goal.factorBp) } : null;
  const interest = def.goal.interest === undefined ? null : {
    released: state.projects.reduce((m, p) => (p.result ? Math.max(m, p.result.interestAtRelease ?? 0) : m), 0),
    running: state.projects.reduce((m, p) => (p.result === null && p.status !== "abgebrochen" ? Math.max(m, p.marketing.interest) : m), 0),
    target: def.goal.interest,
  };
  const ids = sc.subsidiaryIds ?? [];
  const integration = def.goal.maxLeft === undefined ? null : {
    left: integrationStatus(state, ids).left, maxLeft: def.goal.maxLeft, total: ids.length,
    done: ids.filter((id) => (state.ai.studios.find((x) => x.id === id)?.parent?.integration.progressBp ?? 0) >= BP_ONE).length,
  };
  return { id: sc.id, status: sc.status, deadlineYear: def.deadlineYear, goalKind: def.goal.kind, platform: def.goal.platform ?? null, plannedEndYear: sc.plannedEndYear, players, interest, integration };
}

function endingView(state: GameState, data: GameData): ViewModel["ending"] {
  if (!paused(state)) return null;
  // Alte Spielstände mit Insolvenz haben keine festgehaltene Wertung: live berechnen.
  const e = state.ending ?? { week: state.week, reason: "insolvenz" as const, legacy: legacy(state, data), milestones: Object.keys(state.milestones).length, awards: playerAwards(state).length, continued: false };
  const rivalIds = new Set(liveStudios(state).filter((x) => x.rival !== null).map((x) => x.id));
  const rivals = ranking(state, data, "").map((r, i) => ({
    rank: i + 1, name: r.name, player: r.player, rival: !r.player && rivalIds.has(r.id), revenueCent: r.revenueCent, reputationBp: r.reputationBp, releases: r.releases,
  })).filter((r) => r.player || r.rival || r.rank <= 3);
  // Das Ende liegt nach dem Wochenwechsel; angezeigt wird die letzte gespielte Woche.
  return { reason: e.reason, date: dateOf(state.startYear, Math.max(0, e.week - 1)), legacy: e.legacy, milestones: e.milestones, awards: e.awards, canContinue: canContinue(state), rivals };
}

function rankingView(state: GameState, data: GameData): ViewModel["ranking"] {
  const all = ranking(state, data, "").map((e, i) => ({ ...e, rank: i + 1 }));
  const top = all.slice(0, 10);
  const player = all.find((e) => e.player)!;
  return { entries: top.includes(player) ? top : [...top, player], studios: all.length - 1 };
}

export function buildView(state: GameState, data: GameData): ViewModel {
  const released = state.projects.filter((p) => p.status === "veroeffentlicht").sort((a, b) => a.result!.week - b.result!.week || a.id - b.id);
  const products = released.map((p, i) => projectView(state, data, p, i > 0 ? released[i - 1]! : null)).reverse();
  const active = activeProjects(state).sort((a, b) => a.id - b.id);
  const lastReleased = released[released.length - 1] ?? null;
  return {
    seed: state.seed,
    settings: state.settings,
    week: state.week,
    date: dateOf(state.startYear, state.week),
    marketPhase: marketPhase(state),
    displayUnit: state.displayUnit,
    moneyCent: state.moneyCent,
    weeklyCostCent: weeklyWages(state, data) + weeklyRent(state, data),
    finance: {
      weeklyWagesCent: weeklyWages(state, data),
      weeklyRentCent: weeklyRent(state, data),
      loanCent: state.finance.loanCent,
      loanRateBp: state.finance.loanRateBp,
      creditNote: creditNote(state, data).note,
      creditLimitCent: creditLimit(state, data).limitCent,
      newLoanRateBp: creditLimit(state, data).rateBp,
      cushionDebtCent: state.finance.cushionDebtCent,
      inCushion: inCushion(state, data),
      insolvencyMonths: state.finance.insolvencyMonths,
      toleranceMonths: preset(state, data).insolvencyToleranceMonths,
      ledger: state.finance.ledger.slice(-24),
      taxRateBp: regionalTax(state, data, BP_ONE),
      lossCarryCent: state.finance.lossCarry.reduce((sum, l) => sum + l.cent, 0),
    },
    gameOver: state.gameOver,
    ending: endingView(state, data),
    presetId: state.settings.preset,
    people: state.people.map((p) => ({
      id: p.id, name: p.name, isFounder: p.isFounder, strength: p.strength, bestArea: bestArea(p),
      salaryCent: p.salaryCent, assignment: p.assignment, transferWeeks: p.transferWeeks,
      teamId: p.teamId, onboardWeeks: p.onboardWeeks, moraleBp: p.moraleBp, burnoutBp: p.burnoutBp,
      key: p.key ? { role: p.key.role, traits: [...p.key.traits], loyaltyBp: p.key.loyaltyBp } : null,
      fireBlocked: validateFire(state, p.id),
      locationId: p.locationId ?? 0,
    })),
    locations: locationsView(state, data),
    future: futureView(state, data),
    stock: stockView(state, data),
    konzern: konzernView(state, data),
    contractGames: {
      unlocked: contractGamesUnlocked(state, data),
      unlockAfterReleases: data.contractGames.unlockAfterReleases,
      offers: state.contractGames.offers.map((o) => ({
        id: o.id, client: o.client, genre: o.genre, theme: o.theme, scope: o.scope, platform: o.platform, audience: o.audience ?? null, minScoreBp: o.minScoreBp, weeks: o.weeks,
        payCent: o.payCent, advanceCent: o.advanceCent, bonusCent: o.bonusCent, bonusScoreBp: o.minScoreBp + data.contractGames.bonusMarginBp,
        penaltyCent: o.penaltyCent, expiresWeeks: o.expiresWeek - state.week,
      })),
    },
    staff: staffView(state, data),
    delegation: delegationView(state, data),
    maxPersons: maxPersonsNow(state, data),
    office: officeView(state, data),
    active: active.map((p) => projectView(state, data, p, lastReleased)),
    paused: pausedProjects(state).sort((a, b) => a.id - b.id).map((p) => projectView(state, data, p, lastReleased)),
    newProjectBlocked: active.length >= data.start.maxOwnProjects ? "error.projectMax"
      : active.length >= allowedOwnProjects(state, data) ? "error.projectLimit" : null,
    contracts: state.contracts.filter((c) => c.status === "laeuft").map((c) => {
      const members = (c.personIds ?? [c.personId]).map((id) => personById(state, id)).filter((p): p is Person => p !== undefined);
      return {
        id: c.id, kind: c.kind, client: c.client, area: c.area, weeksLeft: c.deadlineWeek - state.week, payCent: c.payCent,
        requirement: c.requirement, personId: c.personId, personIds: c.personIds ?? [c.personId],
        expectedQuality: teamContractQuality(data, members, c.area),
      };
    }),
    events: [...state.events].sort((a, b) => a.id - b.id).map((e) => ({
      id: e.id, kind: e.kind, scope: e.scope, pauses: data.time.pauseOnEvents.includes(e.kind), projectId: e.projectId,
      projectTitle: e.projectId === null ? e.projectTitle ?? null : state.projects.find((p) => p.id === e.projectId)?.title ?? null,
      weeksLeft: e.deadlineWeek - state.week, options: e.options, defaultOption: e.defaultOption,
      review: e.review,
      extraBugs: e.bug ? divInt(e.bug.extraBugsBp, 10000, 1) : undefined,
      offer: e.offer
        ? {
          ...e.offer, quality: Object.fromEntries(state.people.map((p) => [String(p.id), contractQuality(data, p, e.offer!.area)])),
          ...((e.offer.team ?? 1) > 1 ? (() => {
            const team = contractTeam(state, data, e.offer!);
            return { teamNames: team.map((p) => p.name), teamQuality: teamContractQuality(data, team, e.offer!.area) };
          })() : {}),
        }
        : undefined,
      applicant: e.applicant,
      reorder: e.reorder,
      module: e.module,
      featureId: e.featureId,
      brandName: (e.brandId ?? e.brandDeal?.brandId) === undefined ? undefined : state.brands.find((b) => b.id === (e.brandId ?? e.brandDeal?.brandId))?.name,
      defId: e.defId,
      personName: e.personId === undefined ? undefined : state.people.find((p) => p.id === e.personId)?.name,
      poachFrom: e.poachFrom,
      eventKey: eventKey(e),
      suggestRule: suggestedRule(state, data, e),
      upgrade: e.kind === "hardwareUpgrade" ? upgradeInfo(state, data) : undefined,
      productTitle: e.productId === undefined ? undefined : state.projects.find((p) => p.id === e.productId)?.title,
      opsCostCent: e.opsCostCent,
      stockDemand: e.stockDemand,
      counter: counterView(state, e),
      candidates: e.candidates,
      opsGap: e.opsGap,
      license: licenseEventView(state, e, ""),
      platformDeal: e.platformDeal,
      reissue: e.reissue,
      subscription: e.subscription,
      brandDeal: brandDealView(state, e),
      duelStudio: e.duel ? state.ai.studios.find((x) => x.id === e.duel!.studioId)?.name : undefined,
    })),
    yearbook: state.yearbooks[state.yearbooks.length - 1] ?? null,
    chronicle: state.chronicle.map((c) => ({ ...c, date: dateOf(state.startYear, c.week) })),
    unlocks: Object.keys(state.unlocks).sort(),
    guideSeen: state.guideSeen,
    roadmap: roadmap(state, data),
    timeline: {
      ...timelineMarks(state, data),
      platforms: data.platforms.filter((p) => p.releaseYear <= dateOf(state.startYear, state.week).year + 1)
        .map((p) => ({ id: p.id, type: p.type, releaseYear: p.releaseYear, endYear: p.endYear }))
        .sort((a, b) => a.releaseYear - b.releaseYear || (a.id < b.id ? -1 : 1)),
    },
    ranking: rankingView(state, data),
    rivals: rivalsView(state, data),
    makers: makersView(state, data),
    brandMarket: brandMarketView(state, data),
    stage: stageView(state, data),
    rivalTicker: rivalTicker(state).map((c) => ({ ...c, date: dateOf(state.startYear, c.week) })),
    log: [...state.log].reverse().slice(0, 15).map((l) => ({ ...l, date: dateOf(state.startYear, l.week) })),
    products,
    motivation: motivationView(state, data),
    endgame: endgameView(state, data),
    publishing: publishingView(state, data),
    fairBooth: {
      size: state.fairBooth,
      options: (["klein", "mittel", "gross"] as const).map((size) => ({ size, effectBp: data.tradeShows.booths[size].effectBp, costCent: boothCost(state, data, size) })),
    },
    goals: {
      milestones: data.goals.milestones.filter((m) => !m.later).map((m) => {
        const week = state.milestones[m.id] ?? null;
        return { id: m.id, week, date: week === null ? null : dateOf(state.startYear, week) };
      }),
      goal: state.goal,
      hallOfFame: hallOfFame(state, data).games.map((p) => ({
        id: p.id, title: p.title, year: p.result!.year, scoreBp: p.result!.scoreBp, sold: p.sales?.sold ?? 0, awards: p.result!.awards ?? [],
      })),
      awards: [...state.awards].reverse().slice(0, 25).map((a) => {
        const w = a.nominees[a.winner]!;
        return { year: a.year, category: a.category, name: nomineeName(state, a.category, w), player: w.ownerId === 0, playerNominated: a.nominees.some((n) => n.ownerId === 0) };
      }),
      playerAwards: playerAwards(state).length,
      gala: galaView(state),
      scenario: scenarioView(state, data),
    },
    reissues: [...state.reissues].reverse().map((r) => ({ ...r, title: state.projects.find((p) => p.id === r.sourceIds[0])?.title ?? "" })),
    priceRule: { ...state.priceRule, fromYear: data.sales.pricing.discountFromYear, maxDiscountBp: data.sales.pricing.ruleMaxDiscountBp },
    knowledge: state.knowledge.map((e) => ({
      key: e.key, factor: e.factor, ref: e.ref, params: e.params, up: e.up, down: e.down, lastWeek: e.lastWeek,
      ...knowledgeStatus(e),
    })),
    engine: engineView(state, data),
    licensing: licensingView(state, data, ""),
    operations: operationsView(state, data),
    foundEngineBlocked: state.engine ? "error.engineExists" : state.unlocks["engine"] === undefined ? "error.locked" : null,
    brands: brandViews(state, data),
    catalog: {
      genres: data.genres.map((g) => ({ id: g.id, expectedProfile: state.world.expectedProfile[g.id]!, trendBp: state.trends.genre[g.id]! })),
      themes: data.themes.map((t) => ({ id: t.id, trendBp: state.trends.theme[t.id]!, contentLevel: t.contentLevel })),
      subgenres: data.subgenres.map((sg) => ({
        id: sg.id, genre: sg.genre, fromYear: sg.fromYear, available: sg.fromYear <= dateOf(state.startYear, state.week).year,
        bonusThemes: Object.keys(sg.themeBonusBp).sort(),
      })),
      features: data.features.map((f) => ({
        id: f.id, area: f.area, effort: scaledEffort(data, f, "mittel"),
        available: f.availableFrom <= dateOf(state.startYear, state.week).year,
        agedValue: agedValue(data, f, dateOf(state.startYear, state.week).year),
        outdated: agedValue(data, f, dateOf(state.startYear, state.week).year) < f.baseValue,
        effortByScope: Object.fromEntries(
          (Object.keys(data.projects.featureSlots) as Scope[]).map((s) => [s, totalEffort(data, [f.id], s)]),
        ) as ScopeMap,
        baseValue: f.baseValue, innovation: f.innovation,
        tags: f.tags, contentLevel: f.contentLevel,
        requires: f.requires, performanceCost: f.performanceCost,
      })),
      slots: data.projects.featureSlots,
      // Etappe 6c.1: nur Umfänge, die im laufenden Jahr wählbar sind.
      scopes: SCOPES.filter((sc) => data.projects.scopeFromYear[sc] <= dateOf(state.startYear, state.week).year),
      audiences: data.audiences.list.map((a) => ({ id: a.id, maxRating: a.maxRating })),
      pillars: data.pillars.list.map((pl) => ({ id: pl.id, genreWeightBp: pl.genreWeightBp, cards: data.features.filter((f) => cardMatches(pl, f)).map((f) => f.id) })),
      maxPillars: data.pillars.maxPillars,
      defaultAudience: data.audiences.default,
      firstProject: strongStart(state, data),
      firstProjectAreas: data.start.firstProjectAreas,
      platforms: [...activePlatforms(data, dateOf(state.startYear, state.week).year), ...devkitPlatforms(state, data, null).map((id) => platformById(data, id))].map((p) => {
        const year = dateOf(state.startYear, state.week).year;
        const budget = platformBudget(data, p, year, state);
        const early = p.releaseYear > year;
        const range = early ? mulBp(budget, data.makers.rangeBp) : 0;
        return {
          id: p.id, type: p.type, base: platformBase(p, Math.max(year, p.releaseYear)), medium: mediumOf(data, p, Math.max(year, p.releaseYear)).id,
          priceCent: grossPrice(data, { platforms: [p.id] }, year), licenseFeeBp: playerFeeBp(state, data, p), certification: p.certification, endYear: p.endYear,
          budget, launchYear: early ? p.releaseYear : null, budgetLo: budget - range, budgetHi: budget + range,
        };
      }).sort((a, b) => (a.launchYear ?? 0) - (b.launchYear ?? 0) || b.base - a.base || (a.id < b.id ? -1 : 1)),
      // PRD-R01: Typen vor ihrem Jahr erscheinen nicht.
      productTypes: data.productTypes.filter((t) => (t.fromYear ?? 0) <= dateOf(state.startYear, state.week).year).map((t) => ({
        live: t.live ?? null, requiresModule: t.requiresModule ?? null,
        id: t.id, requiresSource: t.requires === "releasedGame", sameContent: t.sameContent, fixedScope: t.fixedScope,
        needsNewerEngine: t.needsNewerEngine, patch: t.patch, requiresNewPlatform: t.requiresNewPlatform, engineSource: t.engineSource,
      })),
      engines: [
        ...(state.engine ? (["eigen", "starter"] as const) : (["starter"] as const)).map((id) => ({ id, levels: engineLevels(state, data, id) })),
        ...licensedEngineChoices(state, data),
      ],
    },
  };
}

function staffView(state: GameState, data: GameData): StaffView {
  const avg = (xs: number[]) => (xs.length === 0 ? 0 : divInt(xs.reduce((a, b) => a + b, 0), xs.length, 1));
  const sr = data.staff.search;
  const levels: number[] = [];
  for (let m = sr.minStrength; m <= sr.maxStrength; m += 10) levels.push(m);
  return {
    search: state.search ? { area: state.search.area, minStrength: state.search.minStrength, weeksLeft: state.search.readyWeek - state.week } : null,
    searchAreas: [...AREAS],
    searchOptions: levels.map((m) => ({ minStrength: m, feeCent: searchFee(state, data, m), weeks: searchWeeks(data, m) })),
    teams: state.staff.teams.map((t) => {
      const m = teamMembers(state, t.id);
      const areaOf = t.focus !== null && t.focus !== "qa" ? t.focus : null;
      const strength = m.length === 0 ? 0 : areaOf
        ? avg(m.map((p) => p.strength[areaOf]))
        : avg(m.map((p) => Math.max(...AREAS.map((a) => p.strength[a]))));
      return { id: t.id, name: t.name, members: m.map((p) => p.id), moraleBp: avg(m.map((p) => p.moraleBp)), burnoutBp: avg(m.map((p) => p.burnoutBp)), focus: t.focus, strength };
    }),
    teamFocus: { inAreaBp: data.staff.teamFocus.inAreaBp, outAreaBp: data.staff.teamFocus.outAreaBp, qaFindRateBp: data.staff.teamFocus.qaFindRateBp },
    teamsBlocked: state.people.length < data.staff.teamMinStaff ? "error.teamsLocked" : null,
    salary: state.staff.salary, crunch: state.staff.crunch, targetSize: state.staff.targetSize, severanceMonths: data.staff.severanceMonths,
  };
}

function delegationView(state: GameState, data: GameData): DelegationView {
  const units = manualUnits(state, data);
  const keys = [...Object.keys(data.delegation.eventOptions), ...data.catalog.events.map((d) => `katalog.${d.id}`)].sort();
  return {
    unlocked: delegationUnlocked(state), unlockProjects: data.delegation.unlockProjects,
    levels: { ...state.delegation.levels }, capacity: leadCapacity(state, data), units, factorBp: overloadFactor(state, data),
    rules: state.delegation.rules.map((r) => ({ ...r, ...ruleHits(state, r) })),
    log: state.delegation.history.filter((h) => h.by !== "spieler").slice(-data.delegation.logEntries).reverse(),
    producers: state.delegation.producers.map((pr) => ({
      personId: pr.personId, name: personById(state, pr.personId)?.name ?? "?", attrs: { ...pr.attrs }, maxProjects: pr.maxProjects,
      projects: producerProjects(state, pr.personId).map((p) => ({ id: p.id, title: p.title, brief: p.brief, risk: briefAtRisk(state, data, p) })),
    })),
    candidates: state.people.filter((p) => p.key && !state.delegation.producers.some((x) => x.personId === p.id))
      .map((p) => ({ personId: p.id, name: p.name, blocked: validateAppoint(state, p.id) })),
    eventKeys: keys.map((key) => ({ key, options: optionsFor(data, key) })),
    brands: state.brands.filter((b) => b.ownerId === 0).map((b) => ({ id: b.id, name: b.name })),
  };
}

function officeView(state: GameState, data: GameData): ViewModel["office"] {
  const eq = data.equipment;
  const offers = (kind: "hardware" | "comfort", max: number) => Array.from({ length: max }, (_, i) => i + 1).map((level) => ({
    level, costCent: levelPrice(state, data, kind, level), blocked: validateBuyLevel(state, data, kind, level),
  }));
  const counts = new Map<string, number>();
  for (const r of state.office.rooms) counts.set(r, (counts.get(r) ?? 0) + 1);
  return {
    id: state.office.id, places: officePlaces(state, data), moveWeeksLeft: state.office.moveWeeksLeft, monthlyRentCent: currentRent(state, data),
    options: data.offices.offices.filter((o) => o.id !== state.office.id).map((o) => {
      const rent = officeRent(state, data, o, 0);
      return {
        id: o.id, places: placesOf(state, data, o, 0), slots: slotsOf(state, data, o, 0), blocked: validateMove(state, data, o.id),
        monthlyRentCent: rent, depositCent: data.offices.depositMonths * rent,
      };
    }),
    slots: officeSlots(state, data), usedSlots: usedSlots(state, data), extensions: state.office.extensions, extendBlocked: validateExtend(state, data),
    upkeepCent: monthlyUpkeep(state, data),
    hardware: { level: state.office.hardware.level, year: state.office.hardware.year, factorBp: officeHardware(state, data), maxLevel: eq.hardware.maxLevel, offers: offers("hardware", eq.hardware.maxLevel) },
    comfort: { level: state.office.comfort.level, maxLevel: eq.comfort.maxLevel, offers: offers("comfort", eq.comfort.maxLevel) },
    rooms: [...counts.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => a.id.localeCompare(b.id)),
    shop: eq.rooms.map((r) => ({
      id: r.id, slots: r.slots, priceCent: epochPrice(state, data, r.priceCent), upkeepCent: epochPrice(state, data, r.upkeepCent), from: r.from,
      blocked: validateBuyRoom(state, data, r.id),
    })),
  };
}

function upgradeInfo(state: GameState, data: GameData): NonNullable<EventView["upgrade"]> {
  const level = upgradeLevel(state, data);
  return { level, costCent: level === null ? 0 : levelPrice(state, data, "hardware", level), factorBp: officeHardware(state, data) };
}

/** MKT-R35: Messe-Auftritt des Projekts (nur für laufende Projekte berechnet). */
function fairView(state: GameState, data: GameData, p: Project): { suggestion: FairShow; date: CalendarDate; trade: boolean } {
  const week = nextFairWeek(state, data);
  const date = dateOf(state.startYear, week);
  const running = p.status === "laeuft" || p.status === "bereit";
  return { suggestion: running ? fairSuggestion(state, data, p) : "nichts", date, trade: isTradeFair(data, date.year) };
}

function counterView(state: GameState, e: GameEvent): EventView["counter"] {
  if (e.kind !== "gegenangebot") return undefined;
  const deal = state.acquisitions.deals.find((d) => d.id === e.dealId);
  const studio = deal ? state.ai.studios.find((x) => x.id === deal.targetId) : undefined;
  return { studio: studio?.name ?? "?", cent: e.counterCent ?? 0, bidCent: deal?.bidCent ?? 0 };
}
