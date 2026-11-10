// Gesamter Spielstand (GameState).
// Teil von src/sim/model/types.ts (Prüfung Fable 03.11.2026: Aufteilung nach System); Importe immer über „../model/types“.
import type { Bp, Cent } from "../../num";
import type { RngState } from "../../rng";
import type { OperationsState } from "./betrieb";
import type { AcquisitionState, Award, ChainState, Ending, FutureState, Location, LongTermGoal, MarketPhaseState, Publisher, PublisherOffer, Reissue, ScenarioState, StockState, Yearbook } from "./daten";
import type { DelegationState, Person, StaffState } from "./delegation";
import type { GuideSeen, PriceRule } from "./eingaben";
import type { GameEvent, LogEntry, World } from "./ereignisse";
import type { Area, Scope, ScopeMap } from "./grundlagen";
import type { AiWorld } from "./ki";
import type { LicensingState, MakerState } from "./lizenzmarkt";
import type { BrandMarketState } from "./markenmarkt";
import type { ArchiveEntry, Brand, KnowledgeEntry, OwnEngine, Project, ProjectEngine } from "./projekt";
import type { Contract, ContractGameState } from "./projektdaten";
import type { Finance, OfficeState, Settings } from "./spielstand";
import type { MotivationState } from "./motivation";
import type { EndgameState } from "./endspiel";
import type { PublishingState } from "./publishing";
import type { ModuleKind } from "./grundlagen";
import type { BoothSize } from "./daten";

export interface ReleaseRecord {
  year: number;
  scope: Scope;
  q: Bp;
}

export interface GameState {
  schemaVersion: number;
  tableVersion: number;
  dataChecksum: string;
  seed: string;
  settings: Settings;
  /** Absolute Woche seit Start, 0 = Woche 1 des Startjahres (KRN-R01). */
  week: number;
  startYear: number;
  displayUnit: "monat" | "woche";
  rngStates: Record<string, RngState>;
  moneyCent: Cent;
  people: Person[];
  nextPersonId: number;
  contracts: Contract[];
  nextContractId: number;
  events: GameEvent[];
  /** S01 5.2: Welt-Angebote, die auf eine freie Woche warten (höchstens 2 Wochen), älteste zuerst. */
  eventQueue: GameEvent[];
  /** FRM-R76: laufende gezielte Personalsuche oder fehlt/null. */
  search?: { area: Area; minStrength: number; readyWeek: number; feeCent: Cent } | null;
  nextEventId: number;
  /** Zähler für geplante Welt-Ereignisse. */
  counters: { applications: number; contractOffers: number };
  log: LogEntry[];
  finance: Finance;
  /** KRN-R36: letzte Woche je Katalog-Ereignis (Abklingzeit); Schlüssel „id“ oder „id:projekt“. */
  eventCooldowns: Record<string, number>;
  /** KRN-R32: laufende Ereignisketten (Etappe 6a.1). */
  chains: ChainState[];
  /** MRK-R59: Marktphase (Etappe 6a.3). */
  market: MarketPhaseState;
  /** FRM-R42 bis FRM-R47: KI-Publisher und offene Angebote (Etappe 6a.4). */
  publishers: Publisher[];
  publisherOffers: PublisherOffer[];
  nextPublisherId: number;
  /** FRM-R32: weitere Standorte (Etappe 6a.6). */
  locations: Location[];
  nextLocationId: number;
  nextChainId: number;
  /** KRN-R61: Chronik (Releases, Plattformen, historische Ereignisse, Freischaltungen). */
  chronicle: LogEntry[];
  yearbooks: Yearbook[];
  /** KRN-R40: freigeschaltete Systeme mit Woche; wartende mit der ersten Woche, in der die Bedingung galt. */
  unlocks: Record<string, number>;
  unlockWaiting: Record<string, number>;
  /** Prüfung Fable 03.11.2026: Gesehen-Zustand von Lernpfad, Freischalt-Karten und Erste-Male-Hinweisen im Spielstand. */
  guideSeen: GuideSeen;
  /** S07: aktuelles Büro, Einzugswoche und verbleibende Umzugswochen. */
  office: OfficeState;
  /** Spielende durch Insolvenz (FRM-R40, ZIE-R09); danach rechnet der Tick nicht weiter. */
  /** S13 AUS-R83: auch feindliche Übernahme. */
  gameOver: { week: number; reason: "insolvenz" | "uebernahme" } | null;
  world: World;
  trends: { genre: Record<string, Bp>; theme: Record<string, Bp> };
  /** Q_erw je Umfang für das laufende Jahr ohne Presse-Strenge (PRD-R56). */
  qNorm: ScopeMap;
  releases: ReleaseRecord[];
  projects: Project[];
  nextProjectId: number;
  knowledge: KnowledgeEntry[];
  /** PRD-R43: abgebrochene Projekte, deren Teile spätere Projekte verbilligen. */
  archive: ArchiveEntry[];
  /** S03: eigene Engine oder null (bis dahin nur die Starter-Engine, ENG-R06). */
  engine: OwnEngine | null;
  /** MRK-R05: Erfahrung je Plattform, 0–10.000 bp (= 0–100 Punkte). */
  platformExperience: Record<string, Bp>;
  /** S02 Marken der Firma (PRD-R74). */
  brands: Brand[];
  nextBrandId: number;
  /** ENG-R75: Stand vor einem Technik-Update, solange „zurücksetzen“ noch möglich ist. */
  techUndo: { projectId: number; engine: ProjectEngine; patchedEngineBp: Bp | null; demandBp: Bp }[];
  /** S08, S14: KI-Studios und ihre Spiele. */
  ai: AiWorld;
  /** S04: Lizenzmarkt. */
  licensing: LicensingState;
  /** S08 MRK-R14 ff.: Hersteller, Devkits und Plattformbeziehungen. */
  makers: MakerState;
  /** S07: Teams, Personalpolitik, Abwerben. */
  staff: StaffState;
  delegation: DelegationState;
  brandMarket: BrandMarketState;
  /** Studio-Ruf in Punkten · 100 (0–10.000), z. B. MKT-R55, MKT-R56, ZIE-R05. */
  studioReputationBp: Bp;
  /** ZIE-R01: erreichte Meilensteine (ID → Woche); ZIE-R06: langfristiges Ziel. */
  milestones: Record<string, number>;
  goal: LongTermGoal | null;
  /** ZIE-R03: vergebene Branchenpreise. */
  awards: Award[];
  /** ZIE-R08 bis ZIE-R11: Spielende mit festgehaltener Vermächtnis-Wertung oder null. */
  ending: Ending | null;
  /** ZIE-R13 bis ZIE-R15: laufendes Szenario oder null. */
  scenario: ScenarioState | null;
  /** MKT-V15: Editionen, Neuauflagen, Sammlungen und Klassiker. */
  reissues: Reissue[];
  nextReissueId: number;
  /** MKT-R21, A12: Regel für Preisaktionen (aktiv ab Start) und optionale Preiskurve. */
  priceRule: PriceRule;
  /** S06: Abteilung Betrieb (Etappe 5). */
  operations: OperationsState;
  /** S08 MRK-R57, MRK-R58: Zukunftsepoche (Etappe 6a.7). */
  future: FutureState;
  /** S07 FRM-R51 bis FRM-R54: Börse (Etappe 6b.2). */
  stock: StockState;
  /** S09: Übernahmen (Etappe 6b.3). */
  acquisitions: AcquisitionState;
  /** Etappe 6c.3: Marktplatz der Auftragsspiele. */
  contractGames: ContractGameState;
  /** Langzeitmotivation: Jahresziel, Erzrivale, Epochen (Prüfung Fable 03.11.2026). */
  motivation: MotivationState;
  /** Endgame-Themen: Herausforderungen, Standards, Krisen. */
  endgame: EndgameState;
  /** S13 AUS-R21: Standgröße auf der Branchenmesse (gilt, bis der Spieler sie ändert). */
  fairBooth: BoothSize;
  /** S13 AUS-R40 bis AUS-R42: eigenes Publishing. */
  publishing: PublishingState;
  /** S13 AUS-R70, AUS-R71: eigene Module einzeln anbieten und laufende Modul-Lizenzen (je Studio und Modul, Stufe, Jahresgebühr). */
  moduleOffer: { active: boolean; customers: { studioId: number; module: ModuleKind; level: number; feeCent: Cent; year: number }[] };
}
