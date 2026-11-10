// Endgame-Themen (Auftrag Projektleitung 04.11.2026, Bewertung Fable 04.11.2026): Vermächtnis-Herausforderungen und Krisen für Große
// (Kartell, Datenleck, Kündigungswelle, Speicher- und Stromkrise). Nostalgiewelle und Branchen-Standards sind gestrichen.
// Teil von src/sim/model/types.ts; Importe immer über „../model/types“.
import type { Bp, Cent } from "../../num";

/** Messgrößen der Herausforderungen; die Berechnung steht in systems/endspiel.ts. */
export type ChallengeMetric = "markenSpanne" | "epochenHits" | "rangEinsJahre" | "krisen";

export interface ChallengeDef {
  id: string;
  metric: ChallengeMetric;
  /** Zielwert; bei epochenHits null = alle Jahrzehnte ab dem Startjahrzehnt. */
  target: number | null;
  /** Ruhmeshalle-Punkte · 100 (wie die Vermächtnis-Wertung). */
  points: number;
  /** markenSpanne: Mindestspanne in Jahren zwischen erstem und letztem Spiel der Marke. */
  years?: number;
}

export interface EndgameParams {
  challenges: {
    maxActive: number;
    decades: number[];
    /** Angebot nur, solange der Rohwert unter diesem Anteil des Ziels liegt (sonst wäre die Herausforderung geschenkt). */
    offerBelowBp: Bp;
    /** „Platz 1“ zählt erst ab diesem Jahr (vorher sind die KI-Studios klein). */
    rankFromYear: number;
    list: ChallengeDef[];
  };
}

export interface ChallengeState {
  id: string;
  acceptedWeek: number;
  status: "aktiv" | "erfuellt" | "aufgegeben";
  doneWeek: number | null;
  /** Nach dem Ende (Weiterspielen über das Endjahr hinaus) erfüllt. */
  afterEnd: boolean;
  /** Stand der zählenden Messgröße beim Annehmen: nur, was danach dazukommt, zählt. */
  baseline: number;
}

export interface EndgameState {
  challenges: ChallengeState[];
  /** Ruhmeshalle-Punkte · 100 aus erfüllten Herausforderungen. */
  hallPoints: number;
  rankOneYears: number;
  crisesSurvived: number;
  /** Speicher- und Stromkrise: Aufschlag auf die Serverkosten bis zur Woche. */
  serverCrisis: { costBp: Bp; untilWeek: number } | null;
  /** Zuletzt gezahlte Strafe (Anzeige). */
  lastFineCent: Cent;
}
