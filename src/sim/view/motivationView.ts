// Anzeigemodell der Langzeitmotivation: Strategiekonferenz, Erzrivale, Epochen-Frage (Prüfung Fable 03.11.2026).
import type { Bp } from "../num";
import type { AnnualGoal, AnnualGoalStatus, GameData, GameState } from "../model/types";
import { type CalendarDate, dateOf } from "../calendar";
import { annualProgress, epochTier, epochValue } from "../systems/motivation";

export interface AnnualGoalView {
  id: string;
  kind: AnnualGoal["kind"];
  year: number;
  target: number;
  param: string | null;
  reward: { kind: string; bp: Bp };
  status: AnnualGoalStatus;
  now: number;
}

export interface MotivationView {
  offers: AnnualGoalView[];
  deadline: CalendarDate | null;
  annual: AnnualGoalView | null;
  streak: number;
  bestStreak: number;
  history: { year: number; id: string; status: "erreicht" | "verfehlt" }[];
  archrival: { name: string; wins: number; losses: number; sinceYear: number; next: { genre: string; date: CalendarDate } | null } | null;
  formerRivals: { name: string; wins: number; losses: number; end: string; year: number }[];
  /** Laufende Epochen-Frage mit Wert und Schwellen. */
  epoch: { id: string; from: number; to: number; value: number; tier: number; tiers: number[]; rank: boolean } | null;
  epochTitles: { id: string; tier: number; value: number; to: number }[];
}

function goalView(state: GameState, data: GameData, g: AnnualGoal): AnnualGoalView {
  // Platzierung nur für das laufende Ziel rechnen (Rangliste ist teuer), Angebote ohne.
  const p = annualProgress(state, data, g, g.status === "offen");
  return { id: g.id, kind: g.kind, year: g.year, target: g.target, param: g.param, reward: g.reward, status: g.status, now: p.now };
}

export function motivationView(state: GameState, data: GameData): MotivationView {
  const m = state.motivation;
  const year = dateOf(state.startYear, state.week).year;
  const a = m.archrival;
  let next: { genre: string; date: CalendarDate } | null = null;
  if (a) {
    const s = state.ai.studios.find((x) => x.id === a.studioId);
    const planned = (s?.teams ?? []).map((t) => t.project).filter((p) => p !== null)
      .sort((x, y) => x.plannedReleaseWeek - y.plannedReleaseWeek)[0];
    if (planned) next = { genre: planned.genre, date: dateOf(state.startYear, planned.plannedReleaseWeek) };
  }
  const e = data.goals.motivation.epochs.find((x) => year >= x.from && year <= x.to && m.epochAnnounced.includes(x.id)) ?? null;
  const value = e ? epochValue(state, data, e) : 0;
  return {
    offers: m.offers.map((g) => goalView(state, data, g)),
    deadline: m.offers.length > 0 ? dateOf(state.startYear, m.offerDeadlineWeek) : null,
    annual: m.annual && m.annual.year >= year - 1 ? goalView(state, data, m.annual) : null,
    streak: m.streak,
    bestStreak: m.bestStreak,
    history: [...m.annualHistory].reverse(),
    archrival: a ? { name: a.name, wins: a.wins, losses: a.losses, sinceYear: dateOf(state.startYear, a.sinceWeek).year, next } : null,
    formerRivals: m.formerRivals.map((r) => ({ name: r.name, wins: r.wins, losses: r.losses, end: r.end, year: dateOf(state.startYear, r.week).year })),
    epoch: e ? { id: e.id, from: e.from, to: e.to, value, tier: epochTier(e, value), tiers: e.tiers, rank: e.metric === "rank" } : null,
    epochTitles: m.epochTitles.map((x) => ({ ...x, to: data.goals.motivation.epochs.find((d) => d.id === x.id)?.to ?? 0 })),
  };
}
