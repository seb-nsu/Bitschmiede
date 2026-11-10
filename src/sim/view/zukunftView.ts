// Anzeigemodell der Zukunftsepoche (S08 MRK-R57, MRK-R58, MRK-R68; Etappe 6a.7): Gerüchte mit unscharfem Zeitraum,
// eingetretene Wendepunkte und die Wette auf die Zukunft.
import type { Bp, Cent } from "../num";
import type { FutureBet, FuturePointStatus, GameData, GameState } from "../model/types";
import { dateOf, type CalendarDate } from "../calendar";
import { betStake, rumorWindow } from "../systems/zukunft";

export interface FuturePointView {
  id: number;
  defId: string;
  area: string;
  status: FuturePointStatus;
  /** Gerücht: angezeigter Zeitraum; eingetreten oder geplatzt: Woche. */
  from: CalendarDate;
  to: CalendarDate;
  fromWeek: number;
  toWeek: number;
  /** MRK-R68: Eintrittswahrscheinlichkeit nur mit Analytics. */
  chanceBp: Bp | null;
  hit: boolean | null;
  bet: (Omit<FutureBet, "pointId" | "pinWeek"> & { pin: CalendarDate }) | null;
  canBet: boolean;
  /** Mögliche Pins: Quartale im angezeigten Zeitraum, nur in der Zukunft. */
  pins: { week: number; date: CalendarDate }[];
}

export interface FutureView {
  points: FuturePointView[];
  maxStakeBp: Bp;
  /** Einsatz bei maxStakeBp. */
  maxStakeCent: Cent;
  windowMonths: number;
}

function pinWeeks(now: number, from: number, to: number): number[] {
  const out: number[] = [];
  for (let w = Math.max(from, now + 1); w <= to; w += 13) out.push(w);
  return out;
}

export function futureView(state: GameState, data: GameData): FutureView {
  const d = (w: number) => dateOf(state.startYear, w);
  const points = state.future.points.filter((p) => p.status !== "verborgen").map((p): FuturePointView => {
    const win = p.status === "geruecht" ? rumorWindow(state, data, p) : { from: p.week, to: p.week };
    const bet = state.future.bets.find((b) => b.pointId === p.id);
    return {
      id: p.id, defId: p.defId, area: data.future.points.find((x) => x.id === p.defId)?.area ?? "markt", status: p.status,
      from: d(win.from), to: d(win.to), fromWeek: win.from, toWeek: win.to,
      chanceBp: p.status === "geruecht" && state.operations.analytics !== "keine" ? data.future.rumor.shownChanceBp : null,
      hit: p.hit ?? null,
      bet: bet ? { stakeCent: bet.stakeCent, result: bet.result, pin: d(bet.pinWeek) } : null,
      canBet: p.status === "geruecht" && !bet,
      pins: p.status === "geruecht" && !bet ? pinWeeks(state.week, win.from, win.to).map((w) => ({ week: w, date: d(w) })) : [],
    };
  });
  return {
    points: points.reverse(),
    maxStakeBp: data.future.bet.maxStakeBp,
    maxStakeCent: betStake(state, data.future.bet.maxStakeBp),
    windowMonths: data.future.bet.windowMonths,
  };
}
