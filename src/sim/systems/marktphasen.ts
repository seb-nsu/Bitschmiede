// Marktphasen Boom, normal, Krise (S08 MRK-R36, MRK-R59, MRK-R60; Etappe 6a.3).
import { type Bp, BP_ONE } from "../num";
import type { GameData, GameState, MarketPhase, MarketPhaseParams, MarketPhaseState } from "../model/types";
import { dateOf, isFirstWeekOfYear } from "../calendar";
import { stream } from "../rng";
import { log } from "./firma";
import { chronicle } from "./katalog";

function year(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

/** Datenblatt Abschnitt 3: feste Phase eines Jahres vor seedFromYear (Lücken sind normal). */
export function historicalPhase(params: MarketPhaseParams, y: number): { phase: MarketPhase; toYear: number } {
  const hit = params.historical.find((h) => y >= h.from && y <= h.to);
  if (hit) return { phase: hit.phase, toYear: hit.to };
  const next = params.historical.filter((h) => h.from > y).sort((a, b) => a.from - b.from)[0];
  return { phase: "normal", toYear: next ? next.from - 1 : y };
}

/** Startwert der Phase beim Spielbeginn oder nach der Migration. */
export function initialMarket(data: GameData, y: number): MarketPhaseState {
  const h = historicalPhase(data.marketPhases, Math.min(y, data.marketPhases.seedFromYear - 1));
  const before = data.marketPhases.historical.filter((x) => x.to < y && x.phase !== "normal").sort((a, b) => b.to - a.to)[0];
  return { phase: h.phase, toYear: h.toYear, prev: before?.phase ?? "krise" };
}

/** MRK-R59: aktuelle Phase; Schalter „Marktzyklen“ aus = immer normal (auch kein Crash). */
export function marketPhase(state: GameState): MarketPhase {
  return state.settings.marketCycles === false ? "normal" : state.market.phase;
}

export function phaseEffects(state: GameState, data: GameData) {
  return data.marketPhases.effects[marketPhase(state)];
}

/** MRK-R60: Gehaltsniveau der Phase (Boom +5 %). */
export function phaseSalaryBp(state: GameState, data: GameData): Bp {
  return state.market ? phaseEffects(state, data).salaryBp : BP_ONE;
}

/**
 * MRK-R59: Jahreswechsel. Bis seedFromYear gilt die feste Tabelle, danach folgt auf Boom oder Krise eine normale Phase
 * und auf eine normale Phase das Gegenteil der Phase davor; die Dauer kommt aus dem Seed (Strom „markt“).
 */
export function marketPhaseStep(state: GameState, data: GameData): void {
  if (!isFirstWeekOfYear(state.week) || state.week === 0) return;
  const p = data.marketPhases;
  const y = year(state);
  const before = state.market.phase;
  if (y < p.seedFromYear) {
    const h = historicalPhase(p, y);
    state.market = { phase: h.phase, toYear: h.toYear, prev: before !== "normal" && h.phase === "normal" ? before : state.market.prev };
  } else if (y > state.market.toYear) {
    const next: MarketPhase = before === "normal" ? (state.market.prev === "boom" ? "krise" : "boom") : "normal";
    const [lo, hi] = p.durationYears[next];
    const years = stream(state, "markt").range(lo, hi);
    state.market = { phase: next, toYear: y + years - 1, prev: before === "normal" ? state.market.prev : before };
  }
  if (state.market.phase !== before && state.settings.marketCycles !== false) {
    log(state, "log.marketPhase", { phase: state.market.phase });
    chronicle(state, "log.marketPhase", { phase: state.market.phase });
  }
}
