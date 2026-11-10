// Anzeigemodell der Endgame-Themen (Auftrag 04.11.2026, Bewertung Fable): Herausforderungen und Krisen.
import type { Bp, Cent } from "../num";
import type { ChallengeState, GameData, GameState } from "../model/types";
import { dateOf } from "../calendar";
import { challengeOffered, challengeProgress, challengeTarget, serverCrisisBp } from "../systems/endspiel";

export interface EndgameView {
  hallPoints: number;
  maxActive: number;
  activeCount: number;
  rankFromYear: number;
  challenges: { id: string; points: number; target: number; now: number; status: ChallengeState["status"] | "offen"; offered: boolean; doneYear: number | null; afterEnd: boolean }[];
  serverCrisisBp: Bp;
  serverCrisisUntilYear: number | null;
  crisesSurvived: number;
  lastFineCent: Cent;
}

export function endgameView(state: GameState, data: GameData): EndgameView {
  const g = state.endgame;
  const p = data.goals.endgame;
  return {
    hallPoints: g.hallPoints,
    maxActive: p.challenges.maxActive,
    activeCount: g.challenges.filter((c) => c.status === "aktiv").length,
    rankFromYear: p.challenges.rankFromYear,
    challenges: p.challenges.list.map((def) => {
      const c = g.challenges.find((x) => x.id === def.id);
      return {
        id: def.id, points: def.points, target: challengeTarget(state, data, def), now: challengeProgress(state, data, def),
        status: c?.status ?? "offen", offered: challengeOffered(state, data, def),
        doneYear: c?.doneWeek == null ? null : dateOf(state.startYear, c.doneWeek).year, afterEnd: c?.afterEnd ?? false,
      };
    }),
    serverCrisisBp: serverCrisisBp(state),
    serverCrisisUntilYear: g.serverCrisis && g.serverCrisis.untilWeek > state.week ? dateOf(state.startYear, g.serverCrisis.untilWeek).year : null,
    crisesSurvived: g.crisesSurvived,
    lastFineCent: g.lastFineCent,
  };
}
