// Zielgruppe, Säulen, Phasen und Auftragsspiele (Etappe 6c).
// Teil von src/sim/model/types.ts (Prüfung Fable 03.11.2026: Aufteilung nach System); Importe immer über „../model/types“.
import type { Bp, Cent } from "../../num";
import type { Area, AreaMap, Scope, ScopeMap } from "./grundlagen";
import type { Anchors } from "./spielstand";

/**
 * Etappe 6c.4 (PRD-R10, PRD-R18, MKT-R10): Zielgruppe mit Marktgröße (Nachfrage), Treue (Abfall der Verkaufskurve),
 * Erwartung der Presse, Fanbindung, höchster Altersfreigabe und Passung je Genre (fehlt = 1,0).
 */
export interface AudienceDef {
  id: string;
  demandBp: Bp;
  decayBp: Bp;
  expectationBp: Bp;
  fansBp: Bp;
  maxRating: number;
  genreFitBp: Record<string, Bp>;
}
export interface AudienceParams {
  default: string;
  list: AudienceDef[];
}

/** Etappe 6c.8: Sprachmärkte, Reichweite ohne Übersetzung und Kosten je Sprache. */
export interface LocalizationParams {
  /** Prüfung Fable 03.11.2026: Sprachen erst ab diesem Jahr anbieten; vorher ist Englisch die einzige sinnvolle Wahl. */
  showFromYear: number;
  home: string;
  homeShareAnchors: Anchors;
  languages: { id: string; fromYear: number; unlocalizedBp: Bp; shareAnchors: Anchors }[];
  costCent: ScopeMap<Cent>;
  textTags: string[];
  textCardBp: Bp;
}

/** Etappe 6c.7: Politur je Bereich nach der Produktion. */
export interface PolishParams {
  maxBonusBp: Bp;
  /** Anteil der Lücke zum Höchstbonus, der je Woche aufgeholt wird. */
  rateBp: Bp;
  /** Anteil der normalen Bugsuche in Politur-Wochen. */
  bugFindShareBp: Bp;
}

/** Etappe 6c.6 (PRD-R20 erweitert): Wahl je Phasengruppe mit Tempo, Qualität und Bugs. */
export interface PhaseFocusOption {
  id: string;
  tempoBp: Bp;
  qualityBp: Bp;
  bugsBp: Bp;
}
export interface PhaseFocusParams {
  default: string;
  /** Phase → Gruppe (preprod, produktion, beta); Phasen ohne Gruppe haben keine Wahl. */
  groups: Record<string, string>;
  options: Record<string, PhaseFocusOption[]>;
}

/** Etappe 6c.5 (PRD-R50 erweitert): Design-Säule mit passenden Karten-Tags und Gewicht der Presse je Genre (fehlt = 1,0). */
export interface PillarDef {
  id: string;
  tags: string[];
  /** Karten ab diesem Innovationswert zählen ebenfalls (Säule Innovation). */
  minInnovation?: number;
  genreWeightBp: Record<string, Bp>;
}
export interface PillarParams {
  maxPillars: number;
  /** Bonus auf Q bei vollem Anteil und Gewicht 1,0. */
  bonusBp: Bp;
  targetShareBp: Bp;
  minShareBp: Bp;
  /** Abzug, wenn der Anteil unter minShareBp liegt (Versprechen nicht eingelöst). */
  missBp: Bp;
  list: PillarDef[];
}
export interface PillarEffect {
  id: string;
  shareBp: Bp;
  weightBp: Bp;
  bp: Bp;
}

/** Etappe 6c.3 (FRM-R48, FRM-R49 erweitert): Marktplatz für Auftragsspiele. */
export interface ContractGameParams {
  unlockAfterReleases: number;
  maxOffers: number;
  newOfferChanceBp: Bp;
  expiresWeeks: [number, number];
  themeChanceBp: Bp;
  /** Etappe 6c.4: Anteil der Angebote mit vorgegebener Zielgruppe. */
  audienceChanceBp: Bp;
  /** Bezugsteam je Umfang für Frist und Preis. */
  teamRef: ScopeMap<number>;
  polishWeeks: number;
  deadlineSlackBp: [Bp, Bp];
  marginBp: [Bp, Bp];
  advanceBp: Bp;
  bonusBp: Bp;
  bonusMarginBp: Bp;
  penaltyBp: Bp;
  minScoreBp: ScopeMap<[Bp, Bp]>;
  scopeWeightBp: ScopeMap<Bp>;
  clients: string[];
  /** Balancing 1.0 (Entscheidung Projektleitung 03.11.2026): Der Auftraggeber stellt Technik vom Stand vor so vielen Jahren. */
  clientTechLagYears: number;
}

/** Angebot auf dem Marktplatz: Vorgaben, Mindestwertung, Frist (Wochen ab Annahme) und Bezahlung. */
export interface ContractGameOffer {
  id: number;
  client: string;
  genre: string;
  theme: string | null;
  scope: Scope;
  platform: string;
  /** Etappe 6c.4: vorgegebene Zielgruppe (fehlt in älteren Angeboten = frei). */
  audience?: string;
  minScoreBp: Bp;
  weeks: number;
  payCent: Cent;
  advanceCent: Cent;
  bonusCent: Cent;
  penaltyCent: Cent;
  expiresWeek: number;
}

/** Angenommenes Auftragsspiel an einem Projekt; Marke und Verkäufe gehören dem Auftraggeber. */
export interface ContractGameDeal {
  offerId: number;
  client: string;
  minScoreBp: Bp;
  deadlineWeek: number;
  finalCent: Cent;
  bonusCent: Cent;
  penaltyCent: Cent;
  status: "laeuft" | "erfuellt" | "bonus" | "verfehlt";
}

export interface ContractGameState {
  offers: ContractGameOffer[];
  nextId: number;
}

/** FRM-R49: Auftrag mit Frist, Bezahlung und Anforderung. */
export interface Contract {
  id: number;
  kind: string;
  client: string;
  area: Area;
  weeks: number;
  payCent: Cent;
  requirement: number;
  personId: number;
  /** Team-Auftrag: alle Personen (personId ist die erste). Fehlt bei Einzelaufträgen. */
  personIds?: number[];
  startWeek: number;
  deadlineWeek: number;
  status: "laeuft" | "erfuellt" | "verfehlt";
  quality: number | null;
}

export interface ContractOffer {
  kind: string;
  client: string;
  area: Area;
  weeks: number;
  payCent: Cent;
  requirement: number;
  /** Team-Auftrag: Zahl der Personen (fehlt = eine). */
  team?: number;
}

export interface Applicant {
  name: string;
  strength: AreaMap;
  focus: Area;
  salaryCent: Cent;
}
