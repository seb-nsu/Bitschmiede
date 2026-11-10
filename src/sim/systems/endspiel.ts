// Endgame-Themen (Auftrag Projektleitung 04.11.2026; Bewertung Fable 04.11.2026: Herausforderungen gekürzt, Krisen mit
// spürbaren Strafen, Nostalgiewelle und Branchen-Standards gestrichen).
// ANNAHME (OFFENE-FRAGEN „Endgame-Themen“): Die Spezifikation kennt diese Bausteine nicht; alle Regeln und Werte sind neu und
// stehen in data/base/core/goals.json („endgame“) und data/base/events/chains.json (Krisen für Große).
//  1. Vermächtnis-Herausforderungen: optionale Langzeitziele, höchstens maxActive gleichzeitig, angeboten nur, solange
//     weniger als offerBelowBp des Ziels erreicht ist; zählende Größen zählen ab dem Annehmen. Erfüllt = Ruhmeshalle-Punkte,
//     die in die Vermächtnis-Wertung eingehen; auch nach dem Endjahr beim Weiterspielen.
//  2. Krisen für Große: Katalog-Krisen mit den Bedingungen firma.rang, firma.marktanteil, firma.moral, betrieb.server und
//     den Wirkungen strafeKasse, geldMonatskosten, kuendigung, serverKosten, zufriedenheitAlle, krisenfest (katalog.ts).
import { type Bp, BP_ONE, type Cent, divInt, mulBp } from "../num";
import type { ChallengeDef, EndgameParams, EndgameState, GameData, GameState, Project } from "../model/types";
import { dateOf, isFirstWeekOfMonth } from "../calendar";
import { chronicle } from "./katalog";
import { log } from "./firma";
import { ranking } from "./ki/rangliste";
import { monthCosts } from "./finanzen";

const PLAYER = 0;

function E(data: GameData): EndgameParams {
  return data.goals.endgame;
}

export function initialEndgame(): EndgameState {
  return { challenges: [], hallPoints: 0, rankOneYears: 0, crisesSurvived: 0, serverCrisis: null, lastFineCent: 0 };
}

function released(state: GameState): Project[] {
  return state.projects.filter((p) => p.status === "veroeffentlicht" && p.result !== null);
}

// ---------- Rang und Marktanteil (auch Bedingungen der Krisen) ----------

export function playerRankEntry(state: GameState, data: GameData): { rank: number; shareBp: Bp } {
  const r = ranking(state, data, "");
  const i = r.findIndex((e) => e.player);
  return i < 0 ? { rank: 99, shareBp: 0 } : { rank: i + 1, shareBp: r[i]!.shareBp };
}

// ---------- Krisen: Serverkosten, Strafen ----------

export function serverCrisisBp(state: GameState): Bp {
  const c = state.endgame.serverCrisis;
  return c && c.untilWeek > state.week ? c.costBp : BP_ONE;
}

/** Mittlere Monatskosten der letzten 12 Monate (Beträge der Krisen wachsen mit der Firma, Bewertung Fable). */
export function averageMonthCosts(state: GameState): Cent {
  const months = state.finance.ledger.slice(-12);
  return months.length === 0 ? 0 : divInt(months.reduce((a, m) => a + monthCosts(m), 0), months.length, 1);
}

/** Strafe: Anteil an der Kasse (Kartell, Datenleck); nie mehr, als da ist. */
export function fineFromCash(state: GameState, bp: Bp): Cent {
  return Math.max(0, mulBp(state.moneyCent, bp));
}

// ---------- Vermächtnis-Herausforderungen ----------

function brandSpans(state: GameState, years: number): number {
  const byBrand = new Map<number, number[]>();
  for (const p of released(state)) {
    if (p.brandId == null) continue;
    const list = byBrand.get(p.brandId) ?? [];
    list.push(p.result!.year);
    byBrand.set(p.brandId, list);
  }
  return [...byBrand.values()].filter((ys) => Math.max(...ys) - Math.min(...ys) >= years).length;
}

function decadesNeeded(state: GameState, data: GameData): number[] {
  const startDecade = state.startYear - (state.startYear % 10);
  return E(data).challenges.decades.filter((d) => d >= startDecade);
}

/** Rohwert der Messgröße (ohne Baseline). */
export function metricValue(state: GameState, data: GameData, def: ChallengeDef): number {
  switch (def.metric) {
    case "markenSpanne": return brandSpans(state, def.years ?? 20);
    case "epochenHits": {
      const hits = released(state).filter((p) => p.result!.scoreBp >= data.brands.hitScoreBp).map((p) => p.result!.year - (p.result!.year % 10));
      return decadesNeeded(state, data).filter((d) => hits.includes(d)).length;
    }
    case "rangEinsJahre": return state.endgame.rankOneYears;
    case "krisen": return state.endgame.crisesSurvived;
  }
}

/** Zählende Größen beginnen beim Annehmen bei 0; Spanne und Epochen sind Lebenswerke, das Angebot sperrt sie ab der Hälfte. */
function counting(def: ChallengeDef): boolean {
  return def.metric === "rangEinsJahre" || def.metric === "krisen";
}

export function challengeTarget(state: GameState, data: GameData, def: ChallengeDef): number {
  return def.target ?? decadesNeeded(state, data).length;
}

export function challengeProgress(state: GameState, data: GameData, def: ChallengeDef): number {
  const c = state.endgame.challenges.find((x) => x.id === def.id);
  const raw = metricValue(state, data, def);
  return counting(def) && c ? Math.max(0, raw - c.baseline) : raw;
}

/** Angebot nur, solange weniger als offerBelowBp des Ziels erreicht ist (zählende Größen beginnen ohnehin bei 0). */
export function challengeOffered(state: GameState, data: GameData, def: ChallengeDef): boolean {
  if (counting(def)) return true;
  return metricValue(state, data, def) * BP_ONE < challengeTarget(state, data, def) * E(data).challenges.offerBelowBp;
}

export function validateChallenge(state: GameState, data: GameData, id: string, action: string): string | null {
  const def = E(data).challenges.list.find((d) => d.id === id);
  if (!def) return "error.unknownOption";
  const c = state.endgame.challenges.find((x) => x.id === id);
  if (action === "annehmen") {
    if (c && c.status !== "aufgegeben") return "error.locked";
    if (!challengeOffered(state, data, def)) return "error.challengeTooLate";
    const active = state.endgame.challenges.filter((x) => x.status === "aktiv").length;
    return active >= E(data).challenges.maxActive ? "error.challengeLimit" : null;
  }
  if (action === "aufgeben") return c?.status === "aktiv" ? null : "error.locked";
  return "error.unknownOption";
}

export function setChallenge(state: GameState, data: GameData, id: string, action: "annehmen" | "aufgeben"): void {
  const def = E(data).challenges.list.find((d) => d.id === id)!;
  const list = state.endgame.challenges;
  if (action === "aufgeben") {
    list.find((x) => x.id === id)!.status = "aufgegeben";
    return;
  }
  const entry = { id, acceptedWeek: state.week, status: "aktiv" as const, doneWeek: null, afterEnd: false, baseline: counting(def) ? metricValue(state, data, def) : 0 };
  state.endgame.challenges = [...list.filter((x) => x.id !== id), entry];
  log(state, "log.challengeAccepted", { id });
}

function checkChallenges(state: GameState, data: GameData): void {
  for (const c of state.endgame.challenges.filter((x) => x.status === "aktiv")) {
    const def = E(data).challenges.list.find((d) => d.id === c.id);
    if (!def || challengeProgress(state, data, def) < challengeTarget(state, data, def)) continue;
    c.status = "erfuellt";
    c.doneWeek = state.week;
    c.afterEnd = state.ending?.continued ?? false;
    state.endgame.hallPoints += def.points;
    log(state, "log.challengeDone", { id: c.id, points: def.points });
    chronicle(state, "log.challengeDone", { id: c.id, points: def.points });
  }
}

// ---------- Tick ----------

/** Tick-Schritt nach der Langzeitmotivation: Jahresbilanz Platz 1 (Woche 51), Herausforderungen (monatlich). */
export function endgameStep(state: GameState, data: GameData): void {
  const g = state.endgame;
  if (g.serverCrisis && g.serverCrisis.untilWeek <= state.week) g.serverCrisis = null;
  const d = dateOf(state.startYear, state.week);
  if (d.weekOfYear === 51 && d.year >= E(data).challenges.rankFromYear && playerRankEntry(state, data).rank === 1) g.rankOneYears += 1;
  if (isFirstWeekOfMonth(state.startYear, state.week)) checkChallenges(state, data);
}

export { PLAYER };
