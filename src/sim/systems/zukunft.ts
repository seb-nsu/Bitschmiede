// Zukunftsepoche ab 2025 (S08 MRK-R57, MRK-R58, MRK-R68; Design „Die Zukunftsepoche“; Etappe 6a.7).
import { type Bp, BP_ONE, type Cent, clamp, divInt, mulBp, mulDiv } from "../num";
import type { FutureBetInput, FuturePoint, FuturePointDef, GameData, GameState } from "../model/types";
import { dateOf, isFirstWeekOfYear, WEEKS_PER_YEAR } from "../calendar";
import { type Rng, stream } from "../rng";
import { log } from "./firma";
import { ledgerNow } from "./finanzen";
import { chronicle, scheduleStage } from "./katalog";
import { initialMarket } from "./marktphasen";
import { deliverDevkit, schedule } from "./plattformen";

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

function monthsToWeeks(months: number): number {
  return mulDiv(months, WEEKS_PER_YEAR, 12, 1);
}

function defOf(data: GameData, id: string): FuturePointDef | undefined {
  return data.future.points.find((d) => d.id === id);
}

/** Zufällige Auswahl ohne Zurücklegen, stabil nach ID sortiert gezogen. */
function pickSome<T extends { id: string }>(rng: Rng, items: readonly T[], n: number): T[] {
  const pool = [...items].sort((a, b) => (a.id < b.id ? -1 : 1));
  const out: T[] = [];
  while (out.length < n && pool.length > 0) out.push(pool.splice(rng.int(pool.length), 1)[0]!);
  return out;
}

function pointWeek(state: GameState, rng: Rng, def: FuturePointDef, lastYear: number): number {
  const y = rng.range(def.years[0], Math.min(def.years[1], lastYear));
  return Math.max(state.week + 1, (y - state.startYear) * WEEKS_PER_YEAR + rng.int(WEEKS_PER_YEAR));
}

/**
 * MRK-R57: Drei Jahre vor fromYear (längster Gerüchte-Vorlauf) zieht der Seed 4–6 Wendepunkte, davon 2–3 Zukunfts-Ketten.
 * MRK-R68: Jedes Gerücht kommt 24–36 Monate vorher; ANNAHME: Zu jedem echten Wendepunkt kommt mit falseAlarmBp ein
 * Fehlalarm über eine nicht gezogene Entwicklung dazu (etwa 15 % der Gerüchte).
 */
export function generateFuture(state: GameState, data: GameData): void {
  const f = data.future;
  const rng = stream(state, "zukunft");
  const chains = f.points.filter((d) => d.chain);
  const others = f.points.filter((d) => !d.chain);
  const n = rng.range(f.count[0], f.count[1]);
  const c = rng.range(f.chainCount[0], Math.min(f.chainCount[1], n));
  const real = [...pickSome(rng, chains, c), ...pickSome(rng, others, n - c)];
  const add = (def: FuturePointDef, falseAlarm: boolean) => {
    const week = pointWeek(state, rng, def, f.lastYear);
    const lead = monthsToWeeks(rng.range(f.rumor.leadMonths[0], f.rumor.leadMonths[1]));
    const point: FuturePoint = {
      id: state.future.nextPointId++, defId: def.id, week, rumorWeek: Math.max(state.week, week - lead), falseAlarm,
      offsetBp: rng.range(-5000, 5000), status: "verborgen",
    };
    state.future.points.push(point);
  };
  for (const def of real) add(def, false);
  const unused = f.points.filter((d) => !real.includes(d));
  for (let i = 0; i < real.length; i++) {
    if (rng.uniformBp() >= f.rumor.falseAlarmBp || unused.length === 0) continue;
    add(unused.splice(rng.int(unused.length), 1)[0]!, true);
  }
  state.future.points.sort((a, b) => a.week - b.week || a.id - b.id);
  state.future.generated = true;
}

/** MRK-R68: angezeigter Zeitraum des Gerüchts; die Analytics-Stufe macht ihn schmaler, der wahre Termin liegt darin. */
export function rumorWindow(state: GameState, data: GameData, point: FuturePoint): { from: number; to: number } {
  const width = monthsToWeeks(data.future.rumor.fuzzMonths[state.operations.analytics]);
  const center = point.week + mulBp(width, point.offsetBp);
  const half = divInt(width, 2, 1);
  return { from: center - half, to: center + half };
}

/** MRK-R58: Anteil der Releases der letzten zwei Jahre auf den Plattformen des Wendepunkts (Spieler und KI). */
export function investShare(state: GameState, data: GameData, platforms: readonly string[]): Bp {
  const from = state.week - data.future.investBoost.lookbackWeeks;
  let all = 0;
  let on = 0;
  const count = (list: readonly string[]) => {
    all++;
    if (list.some((p) => platforms.includes(p))) on++;
  };
  for (const p of state.ai.products) if (p.releaseWeek >= from && p.releaseWeek <= state.week) count(p.platforms);
  for (const p of state.projects) if (p.result && p.result.week >= from) count(p.platforms);
  return all === 0 ? 0 : mulDiv(on, BP_ONE, all, 1);
}

/** MRK-R58: Investieren die Firmen zusammen über 20 %, steigt die Chance auf den Massenmarkt um bis zu 30 %. */
export function massMarketChance(state: GameState, data: GameData, def: FuturePointDef): Bp {
  const b = data.future.investBoost;
  const share = investShare(state, data, def.platforms ?? []);
  // ANNAHME: Der Zuschlag wächst linear bis zur Schwelle und ist dort voll (relativ auf die Grundchance).
  const boost = mulDiv(b.maxBp, Math.min(share, b.shareBp), b.shareBp, 1);
  return clamp(mulBp(def.chanceBp ?? BP_ONE, BP_ONE + boost), 0, BP_ONE);
}

function occur(state: GameState, data: GameData, point: FuturePoint, def: FuturePointDef): void {
  if (point.falseAlarm) {
    point.status = "geplatzt";
    log(state, "log.futureFalseAlarm", { id: def.id });
    for (const bet of state.future.bets.filter((x) => x.pointId === point.id && x.result === "offen")) {
      bet.result = "daneben";
      log(state, "log.futureBetMiss", { id: def.id });
    }
    return;
  }
  point.status = "eingetreten";
  if (def.platforms) {
    const hit = stream(state, "zukunft").uniformBp() < massMarketChance(state, data, def);
    point.hit = hit;
    for (const [id, bp] of Object.entries((hit ? def.hit : def.miss) ?? {})) state.future.platformBp[id] = bp;
  }
  if (def.phase && state.settings.marketCycles !== false) {
    const y = yearOf(state);
    const [lo, hi] = data.marketPhases.durationYears[def.phase];
    const years = stream(state, "zukunft").range(lo, hi);
    const prev = state.market?.phase ?? initialMarket(data, y).phase;
    state.market = { phase: def.phase, toYear: y + years - 1, prev: prev === "normal" ? state.market.prev : prev };
  }
  const key = def.platforms ? (point.hit ? "log.futureHit" : "log.futureMiss") : "log.futureOccurred";
  log(state, key, { id: def.id });
  chronicle(state, key, { id: def.id });
  if (def.chain) scheduleStage(state, data, { projectId: null }, `zukunft:${def.id}`, { def: def.chain, delayWeeks: [0, 0] });
  settleBets(state, data, point, def);
}

/** MRK-R58: Ein Pin mit Abstand unter windowMonths zum Eintritt ist ein Treffer (MRK-T17). */
export function betHits(data: GameData, pinWeek: number, week: number): boolean {
  return Math.abs(pinWeek - week) < monthsToWeeks(data.future.bet.windowMonths);
}

function settleBets(state: GameState, data: GameData, point: FuturePoint, def: FuturePointDef): void {
  const b = data.future.bet;
  for (const bet of state.future.bets.filter((x) => x.pointId === point.id && x.result === "offen")) {
    const hit = betHits(data, bet.pinWeek, point.week);
    bet.result = hit ? "treffer" : "daneben";
    if (hit && def.platforms) {
      // MRK-R58: Plattform-Erfahrung 30 und Welle-1-Devkits der neuen Plattformart.
      for (const id of def.platforms) {
        state.platformExperience[id] = Math.min(BP_ONE, (state.platformExperience[id] ?? 0) + b.platformExperienceBp);
        const s = schedule(state, id);
        if (s && s.devkit === 0) deliverDevkit(state, data, id, 1);
      }
    } else if (hit) {
      // ANNAHME: Wendepunkte ohne Plattform zahlen den Einsatz mal returnFactorBp zurück (Vorsprung als Geld).
      state.moneyCent += mulBp(bet.stakeCent, b.returnFactorBp);
    }
    log(state, hit ? "log.futureBetHit" : "log.futureBetMiss", { id: def.id });
  }
}

/** Tick-Schritt nach den Marktphasen: Wendepunkte ziehen, Gerüchte zeigen, Wendepunkte eintreten lassen. */
export function futureStep(state: GameState, data: GameData): void {
  const f = data.future;
  const y = yearOf(state);
  if (!state.future.generated) {
    if (y < f.fromYear - 3 || y > f.lastYear || (state.week > 0 && !isFirstWeekOfYear(state.week))) return;
    generateFuture(state, data);
  }
  for (const point of state.future.points) {
    if (point.status === "verborgen" && state.week >= point.rumorWeek) {
      point.status = "geruecht";
      log(state, "log.futureRumor", { id: point.defId });
    }
    if (point.status === "geruecht" && state.week >= point.week) {
      const def = defOf(data, point.defId);
      if (def) occur(state, data, point, def);
    }
  }
}

/** Werkzeug-Tempo der Zukunfts-Kette auf die Arbeitsleistung. */
export function toolSpeedBp(state: GameState): Bp {
  return BP_ONE + (state.future?.toolSpeedBp ?? 0);
}

/** Faktor einer Plattform auf die erreichbare Basis (1,0 ohne Wendepunkt). */
export function futurePlatformBp(state: GameState | undefined, id: string): Bp {
  return state?.future?.platformBp[id] ?? BP_ONE;
}

// ---------- Wette auf die Zukunft (MRK-R58) ----------

export function betStake(state: GameState, stakeBp: Bp): Cent {
  return mulBp(Math.max(0, state.moneyCent), stakeBp);
}

export function validateFutureBet(state: GameState, data: GameData, input: FutureBetInput): string | null {
  const point = state.future.points.find((p) => p.id === input.pointId);
  if (!point || point.status !== "geruecht") return "error.futureNoRumor";
  if (state.future.bets.some((b) => b.pointId === point.id)) return "error.futureAlreadyBet";
  if (!Number.isSafeInteger(input.pinWeek) || input.pinWeek <= state.week) return "error.futurePin";
  if (!Number.isSafeInteger(input.stakeBp) || input.stakeBp <= 0 || input.stakeBp > data.future.bet.maxStakeBp) return "error.amount";
  if (betStake(state, input.stakeBp) <= 0) return "error.money";
  return null;
}

export function placeFutureBet(state: GameState, input: FutureBetInput): void {
  const stake = betStake(state, input.stakeBp);
  state.moneyCent -= stake;
  ledgerNow(state).costs.other += stake;
  state.future.bets.push({ pointId: input.pointId, pinWeek: input.pinWeek, stakeCent: stake, result: "offen" });
  const point = state.future.points.find((p) => p.id === input.pointId)!;
  log(state, "log.futureBet", { id: point.defId, cost: stake });
}
