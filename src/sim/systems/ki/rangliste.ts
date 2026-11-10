// MRK-R37: Rangliste aller Firmen nach Umsatz, Marktanteil und Ruf.
import { type Bp, type Cent, divBp, divInt } from "../../num";
import type { GameData, GameState } from "../../model/types";
import { liveStudios, studioPeople } from "./studios";

export interface RankingEntry {
  /** 0 = Spieler. */
  id: number;
  name: string;
  player: boolean;
  archetype: string | null;
  people: number;
  revenueCent: Cent;
  shareBp: Bp;
  /** Ruf: mittlere Wertung der letzten fünf Releases (0, wenn noch keiner). */
  reputationBp: Bp;
  releases: number;
}

function sum(values: readonly Cent[], years: number): Cent {
  return values.slice(0, years).reduce((s, v) => s + v, 0);
}

function mean(values: readonly Bp[]): Bp {
  return values.length === 0 ? 0 : divInt(values.reduce((s, v) => s + v, 0), values.length, 1);
}

/** Umsatz = laufendes und letztes volles Jahr (historyYears Einträge); Marktanteil am Umsatz aller Firmen. */
export function ranking(state: GameState, data: GameData, playerName: string): RankingEntry[] {
  const years = data.ai.historyYears;
  const released = state.projects.filter((p) => p.status === "veroeffentlicht" && p.result);
  const entries: RankingEntry[] = liveStudios(state).map((s) => ({
    id: s.id, name: s.name, player: false, archetype: s.archetype, people: studioPeople(s),
    revenueCent: sum(s.revenueByYear, years), shareBp: 0, reputationBp: mean(s.lastScores), releases: s.releases,
  }));
  entries.push({
    id: 0, name: playerName, player: true, archetype: null, people: state.people.length,
    revenueCent: sum(state.ai.playerRevenueByYear, years), shareBp: 0,
    reputationBp: mean(released.slice(-5).map((p) => p.result!.scoreBp)), releases: released.length,
  });
  const total = entries.reduce((s, e) => s + e.revenueCent, 0);
  for (const e of entries) e.shareBp = total > 0 ? divBp(e.revenueCent, total, 1) : 0;
  return entries.sort((a, b) => b.revenueCent - a.revenueCent || b.reputationBp - a.reputationBp || a.id - b.id);
}

/** MRK-T07: höchster Marktanteil einer Firma (für Prüfläufe). */
export function topShare(state: GameState, data: GameData): Bp {
  return ranking(state, data, "").reduce((m, e) => Math.max(m, e.shareBp), 0);
}
