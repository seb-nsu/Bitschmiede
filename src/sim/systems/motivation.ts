// Langzeitmotivation (Konzept-Langzeitmotivation.md, Prüfung Fable 03.11.2026, Entscheidung Projektleitung „Alle drei Takte plus Geld“):
// Takt 1 Strategiekonferenz mit drei Jahreszielen, Takt 2 Epochen-Fragen mit Epochentitel, Takt 3 Erzrivale mit Bilanz.
// ANNAHME: Die Spezifikation kennt die Bausteine nur als Design (Strategiekonferenz); Regeln, Schwellen und Belohnungen sind
// neu und stehen in data/base/core/goals.json („motivation“), siehe OFFENE-FRAGEN.
import { BP_ONE, clamp, mulBp } from "../num";
import type {
  AnnualGoal, AnnualGoalDef, AiStudio, EpochDef, GameData, GameState, MotivationParams, MotivationState, Project,
} from "../model/types";
import { dateOf } from "../calendar";
import { stream } from "../rng";
import { chronicle } from "./katalog";
import { monthIncome } from "./finanzen";
import { log } from "./firma";
import { ranking } from "./ki/rangliste";
import { rivalStudios } from "./ki/rivalen";

const PLAYER = 0;

function M(data: GameData): MotivationParams {
  return data.goals.motivation;
}

export function initialMotivation(): MotivationState {
  return {
    offers: [], offerDeadlineWeek: 0, annual: null, annualHistory: [], streak: 0, bestStreak: 0,
    archrival: null, formerRivals: [], epochAnnounced: [], epochTitles: [],
  };
}

function games(state: GameState, data: GameData): Project[] {
  const types = M(data).conference.gameTypes;
  return state.projects.filter((p) => p.status === "veroeffentlicht" && p.result !== null && types.includes(p.type));
}

function playerRank(state: GameState, data: GameData): number | null {
  const i = ranking(state, data, "").findIndex((e) => e.player);
  return i < 0 ? null : i + 1;
}

// ---------- Takt 1: Strategiekonferenz ----------

function topTrendGenre(state: GameState): string | null {
  const entries = Object.entries(state.trends.genre).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries[0]?.[0] ?? null;
}

function newestPlatform(state: GameState, data: GameData, year: number): string | null {
  const own = new Set(games(state, data).flatMap((p) => p.platforms));
  const fresh = data.platforms.filter((p) => p.releaseYear >= year - 2 && p.releaseYear <= year && !own.has(p.id))
    .sort((a, b) => b.releaseYear - a.releaseYear || a.id.localeCompare(b.id));
  return fresh[0]?.id ?? null;
}

/** Ziel aus der Vorlage für das Jahr bilden; null, wenn es dieses Jahr nicht passt. */
function makeGoal(state: GameState, data: GameData, def: AnnualGoalDef, year: number, released: number): AnnualGoal | null {
  if (def.fromYear !== undefined && year < def.fromYear) return null;
  const base = { id: def.id, kind: def.kind, year, reward: def.reward, status: "offen" as const, week: null };
  switch (def.kind) {
    case "wertung":
      return { ...base, target: def.scoreBp!, param: null };
    case "wertungTrend": {
      const genre = topTrendGenre(state);
      return genre && released > 0 ? { ...base, target: def.scoreBp!, param: genre } : null;
    }
    case "releases": {
      const last = games(state, data).filter((p) => p.result!.year === year - 1).length;
      return { ...base, target: Math.max(def.min ?? 1, last + (def.extra ?? 1)), param: null };
    }
    case "plattformNeu": {
      const platform = newestPlatform(state, data, year);
      return platform ? { ...base, target: 1, param: platform } : null;
    }
    case "rangliste": {
      const rank = released > 0 ? playerRank(state, data) : null;
      return rank !== null && rank > 1 ? { ...base, target: rank - 1, param: null } : null;
    }
    case "umsatz": {
      const last = state.yearbooks[state.yearbooks.length - 1];
      return last && last.year === year - 1 && last.incomeCent > 0
        ? { ...base, target: mulBp(last.incomeCent, BP_ONE + def.growthBp!), param: null } : null;
    }
    case "preis":
      return released > 0 ? { ...base, target: 1, param: null } : null;
  }
}

/** Fortschritt eines Jahresziels (jetzt, Ziel); bei „rangliste“ ist der Wert die aktuelle Platzierung. */
export function annualProgress(state: GameState, data: GameData, g: AnnualGoal, withRank = false): { now: number; target: number } {
  const year = g.year;
  const mine = games(state, data).filter((p) => p.result!.year === year);
  switch (g.kind) {
    case "wertung":
      return { now: Math.max(0, ...mine.map((p) => p.result!.scoreBp)), target: g.target };
    case "wertungTrend":
      return { now: Math.max(0, ...mine.filter((p) => p.genre === g.param).map((p) => p.result!.scoreBp)), target: g.target };
    case "releases":
      return { now: mine.length, target: g.target };
    case "plattformNeu":
      return { now: mine.filter((p) => p.platforms.includes(g.param!)).length, target: 1 };
    case "rangliste":
      return { now: withRank ? playerRank(state, data) ?? 0 : 0, target: g.target };
    case "umsatz": {
      const income = state.finance.ledger.filter((m) => m.year === year).reduce((s, m) => s + monthIncome(m), 0);
      return { now: income, target: g.target };
    }
    case "preis":
      return { now: state.awards.filter((a) => a.year === year && a.nominees[a.winner]?.ownerId === PLAYER).length, target: 1 };
  }
}

function reached(state: GameState, data: GameData, g: AnnualGoal, yearEnd: boolean): boolean {
  if (g.kind === "rangliste") {
    if (!yearEnd) return false;
    const rank = playerRank(state, data);
    return rank !== null && rank <= g.target;
  }
  if (g.kind === "umsatz" && !yearEnd) return false;
  const p = annualProgress(state, data, g);
  return p.now >= p.target;
}

function reward(state: GameState, g: AnnualGoal): void {
  if (g.reward.kind === "ruf") {
    state.studioReputationBp = clamp(state.studioReputationBp + g.reward.bp, 0, BP_ONE);
    return;
  }
  const fans = (b: (typeof state.brands)[number]) => Object.values(b.fans).reduce((s, v) => s + v, 0);
  const best = state.brands.filter((b) => b.ownerId === PLAYER).sort((a, b) => fans(b) - fans(a) || a.id - b.id)[0];
  if (best) for (const k of Object.keys(best.fans).sort()) best.fans[k] = best.fans[k]! + mulBp(best.fans[k]!, g.reward.bp);
  else state.studioReputationBp = clamp(state.studioReputationBp + g.reward.bp, 0, BP_ONE);
}

function closeAnnual(state: GameState, m: MotivationState, status: "erreicht" | "verfehlt"): void {
  const g = m.annual!;
  m.annual = { ...g, status, week: state.week };
  m.annualHistory.push({ year: g.year, id: g.id, status });
  if (status === "erreicht") {
    m.streak += 1;
    m.bestStreak = Math.max(m.bestStreak, m.streak);
    reward(state, g);
  } else m.streak = 0;
  log(state, status === "erreicht" ? "log.annualReached" : "log.annualMissed", { id: g.id, streak: m.streak });
  chronicle(state, status === "erreicht" ? "log.annualReached" : "log.annualMissed", { id: g.id, streak: m.streak });
}

/** Ein Ziel annehmen (Eingabe „annualGoal“ oder Ablauf der Frist). */
export function chooseAnnualGoal(state: GameState, index: number): void {
  const m = state.motivation;
  const g = m.offers[index];
  if (!g) return;
  m.annual = { ...g, week: null };
  m.offers = [];
  log(state, "log.annualChosen", { id: g.id });
}

export function validateAnnualGoal(state: GameState, index: number): string | null {
  return Number.isSafeInteger(index) && index >= 0 && index < state.motivation.offers.length ? null : "error.unknownOffer";
}

function conference(state: GameState, data: GameData, year: number): void {
  const m = state.motivation;
  const c = M(data).conference;
  const released = games(state, data).length;
  const pool = c.goals.map((d) => makeGoal(state, data, d, year, released)).filter((g): g is AnnualGoal => g !== null);
  const rng = stream(state, "ziele");
  const offers: AnnualGoal[] = [];
  while (offers.length < c.offers && pool.length > 0) offers.push(pool.splice(rng.int(pool.length), 1)[0]!);
  m.offers = offers;
  m.offerDeadlineWeek = state.week + c.pickWithinWeeks;
  if (offers.length > 0) log(state, "log.strategyMeeting", { year });
}

function annualStep(state: GameState, data: GameData): void {
  const m = state.motivation;
  const d = dateOf(state.startYear, state.week);
  if (m.annual?.status === "offen" && m.annual.year === d.year && reached(state, data, m.annual, d.weekOfYear === 51)) closeAnnual(state, m, "erreicht");
  if (d.weekOfYear === 51 && m.annual?.status === "offen" && m.annual.year === d.year) closeAnnual(state, m, "verfehlt");
  if (d.weekOfYear === 0 && (m.annual === null || m.annual.year < d.year)) conference(state, data, d.year);
  if (m.offers.length > 0 && state.week >= m.offerDeadlineWeek) chooseAnnualGoal(state, 0);
}

// ---------- Takt 3: Erzrivale ----------

function rivalScore(state: GameState, data: GameData, s: AiStudio): number {
  const genres = new Set(games(state, data).map((p) => p.genre));
  const overlap = [s.mainGenre, ...s.focusGenres, ...s.favGenres].filter((g) => genres.has(g)).length;
  return overlap * BP_ONE + (s.rival?.threat.genre ?? 0) + (s.rival?.threat.engine ?? 0);
}

function pickArchrival(state: GameState, data: GameData): void {
  const m = state.motivation;
  const hit = games(state, data).some((p) => p.result!.scoreBp >= data.brands.hitScoreBp);
  if (!hit) return;
  const candidates = rivalStudios(state).filter((s) => s.parent?.ownerId !== PLAYER);
  const best = candidates.sort((a, b) => rivalScore(state, data, b) - rivalScore(state, data, a) || a.id - b.id)[0];
  if (!best) return;
  m.archrival = { studioId: best.id, name: best.name, sinceWeek: state.week, wins: 0, losses: 0, duels: [] };
  if (best.rival) best.rival.relationBp = clamp(best.rival.relationBp - M(data).archrival.relationDropBp, -BP_ONE, BP_ONE);
  log(state, "log.archrival", { studio: best.name });
  chronicle(state, "log.archrival", { studio: best.name });
}

function endArchrival(state: GameState, m: MotivationState, end: "geschlossen" | "gekauft" | "abgehaengt"): void {
  const a = m.archrival!;
  m.formerRivals.push({ name: a.name, wins: a.wins, losses: a.losses, end, week: state.week });
  log(state, `log.archrivalEnd.${end}`, { studio: a.name, wins: a.wins, losses: a.losses });
  chronicle(state, `log.archrivalEnd.${end}`, { studio: a.name, wins: a.wins, losses: a.losses });
  m.archrival = null;
}

/** Duelle: Releases von Spieler und Erzrivale, die höchstens windowWeeks auseinanderliegen; jedes Spiel zählt einmal. */
function duels(state: GameState, data: GameData): void {
  const a = state.motivation.archrival!;
  const w = M(data).archrival.windowWeeks;
  const usedP = new Set(a.duels.map((x) => x.projectId));
  const usedA = new Set(a.duels.map((x) => x.productId));
  const mine = games(state, data).filter((p) => p.result!.week >= state.week - w && p.result!.week >= a.sinceWeek && !usedP.has(p.id))
    .sort((x, y) => x.result!.week - y.result!.week || x.id - y.id);
  const theirs = state.ai.products.filter((x) => x.studioId === a.studioId && x.releaseWeek >= state.week - w && x.releaseWeek >= a.sinceWeek
    && x.releaseWeek <= state.week && !usedA.has(x.id)).sort((x, y) => x.releaseWeek - y.releaseWeek || x.id - y.id);
  for (const p of mine) {
    const o = theirs.find((x) => !usedA.has(x.id) && Math.abs(x.releaseWeek - p.result!.week) <= w);
    if (!o || p.result!.scoreBp === o.scoreBp) continue;
    usedA.add(o.id);
    const won = p.result!.scoreBp > o.scoreBp;
    if (won) a.wins += 1;
    else a.losses += 1;
    a.duels.push({ week: state.week, projectId: p.id, productId: o.id, won });
    log(state, won ? "log.archrivalWon" : "log.archrivalLost", { studio: a.name, project: p.title, wins: a.wins, losses: a.losses });
  }
  const keep = M(data).archrival.keepDuels;
  if (a.duels.length > keep) a.duels.splice(0, a.duels.length - keep);
}

function archrivalStep(state: GameState, data: GameData): void {
  const m = state.motivation;
  if (m.archrival) {
    const s = state.ai.studios.find((x) => x.id === m.archrival!.studioId);
    if (!s || s.closedWeek !== null) endArchrival(state, m, "geschlossen");
    else if (s.parent?.ownerId === PLAYER) endArchrival(state, m, "gekauft");
    else if (!state.ai.rivals.includes(s.id)) endArchrival(state, m, "abgehaengt");
    else duels(state, data);
  }
  if (!m.archrival) pickArchrival(state, data);
}

// ---------- Takt 2: Epochen-Fragen ----------

/** Messwert einer Epoche bis jetzt (bei „rank“: aktuelle Platzierung, 0 = keine). */
export function epochValue(state: GameState, data: GameData, e: EpochDef, withRank = true): number {
  const inEpoch = games(state, data).filter((p) => p.result!.year >= e.from && p.result!.year <= e.to);
  const hit = (p: Project) => p.result!.scoreBp >= (e.scoreBp ?? data.brands.hitScoreBp);
  const platform = (id: string) => data.platforms.find((x) => x.id === id);
  switch (e.metric) {
    case "hits":
      return inEpoch.filter(hit).length;
    case "hitsNewPlatforms":
      return inEpoch.filter((p) => hit(p) && p.platforms.some((id) => (platform(id)?.releaseYear ?? 0) >= e.platformFromYear!)).length;
    case "hitsModuleLevel":
      return inEpoch.filter((p) => hit(p) && (p.engine.levels[e.module!] ?? 0) >= e.minLevel!).length;
    case "liveGames":
      return inEpoch.filter((p) => e.productTypes!.includes(p.type) && hit(p)).length;
    case "platformTypeGames":
      return inEpoch.filter((p) => hit(p) && p.platforms.some((id) => e.platformTypes!.includes(platform(id)?.type ?? ""))).length;
    case "rank":
      return withRank ? playerRank(state, data) ?? 0 : 0;
  }
}

/** Stufe 0–3; bei „rank“ zählt eine Platzierung höchstens so gut wie die Schwelle. */
export function epochTier(e: EpochDef, value: number): number {
  let tier = 0;
  e.tiers.forEach((t, i) => {
    if (e.metric === "rank" ? value > 0 && value <= t : value >= t) tier = i + 1;
  });
  return tier;
}

function epochStep(state: GameState, data: GameData): void {
  const m = state.motivation;
  const d = dateOf(state.startYear, state.week);
  for (const e of M(data).epochs) {
    if (d.year >= e.from && d.year <= e.to && !m.epochAnnounced.includes(e.id)) {
      m.epochAnnounced = [...m.epochAnnounced, e.id];
      log(state, "log.epochQuestion", { id: e.id });
      chronicle(state, "log.epochQuestion", { id: e.id });
    }
    if (d.year === e.to && d.weekOfYear === 51 && m.epochAnnounced.includes(e.id) && !m.epochTitles.some((x) => x.id === e.id)) {
      const value = epochValue(state, data, e);
      const tier = epochTier(e, value);
      m.epochTitles.push({ id: e.id, tier, value });
      log(state, tier > 0 ? "log.epochTitle" : "log.epochMissed", { id: e.id, tier });
      chronicle(state, tier > 0 ? "log.epochTitle" : "log.epochMissed", { id: e.id, tier });
    }
  }
}

/** Tick-Schritt 13 (nach dem Jahrbuch): Jahresziel, Erzrivale, Epochen. */
export function motivationStep(state: GameState, data: GameData): void {
  annualStep(state, data);
  archrivalStep(state, data);
  epochStep(state, data);
}
