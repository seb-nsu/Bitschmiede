import { freezeDeep } from "../clone";
// S10 Branchenpreise (ZIE-R03 bis ZIE-R05, MKT-R39): Vergabe einmal im Jahr auf der großen Branchenmesse.
import { type Bp, BP_ONE, clamp, divBp, divInt, mulBp } from "../num";
import type { AiProduct, Award, AwardCategory, AwardNominee, AwardParams, GameData, GameState, Project, ProductSales } from "../model/types";
import { dateOf } from "../calendar";
import { stream } from "../rng";
import { chronicle } from "./katalog";
import { log } from "./firma";
import { liveStudios } from "./ki/studios";
import { projectInnovation } from "./produkte/bugs";
import { reachMilestone } from "./ziele";

const PLAYER = 0;

function P(data: GameData): AwardParams {
  return data.goals.awards;
}

function mean(values: readonly Bp[]): Bp {
  return values.length === 0 ? 0 : divInt(values.reduce((s, v) => s + v, 0), values.length, 1);
}

/** Spiele des Spielers und der KI, die seit der letzten Messe erschienen sind. */
function recentGames(state: GameState, data: GameData): { player: Project[]; ai: AiProduct[] } {
  const from = state.week - 52;
  const types = P(data).gameTypes;
  const player = state.projects
    .filter((p) => p.status === "veroeffentlicht" && p.result && p.result.week > from && types.includes(p.type))
    .sort((a, b) => a.id - b.id);
  const ai = state.ai.products.filter((p) => p.releaseWeek > from).sort((a, b) => a.id - b.id);
  return { player, ai };
}

/**
 * ZIE-R04 Studio und Newcomer (ANNAHME zur Formel): Ruf = mittlere Wertung der letzten fünf Releases, mal
 * 1 + Gewicht · Umsatzwachstum vom vorletzten zum letzten vollen Jahr (gedeckelt).
 */
function studioPoints(data: GameData, scores: readonly Bp[], revenue: readonly number[]): number {
  const rep = mean(scores);
  if (rep <= 0) return 0;
  const last = revenue[1] ?? 0;
  const before = revenue[2] ?? 0;
  const cap = P(data).growthCapBp;
  const growth = before > 0 ? clamp(divBp(last - before, before, 1), -cap, cap) : 0;
  return mulBp(rep, BP_ONE + mulBp(growth, P(data).growthWeightBp));
}

/** ZIE-R04: Kandidaten je Kategorie mit Punkten (null = Kategorie wird in diesem Jahr nicht vergeben). */
export function candidates(state: GameState, data: GameData, category: AwardCategory): AwardNominee[] | null {
  const games = recentGames(state, data);
  const out: AwardNominee[] = [];
  switch (category) {
    case "spiel":
      for (const p of games.player) out.push({ ownerId: PLAYER, refId: p.id, points: p.result!.scoreBp });
      for (const p of games.ai) out.push({ ownerId: p.studioId, refId: p.id, points: p.scoreBp });
      break;
    case "innovation": {
      // ANNAHME: Wertung · (1 + Innovation der Features); nur Spiele mit positiver Innovation.
      const add = (ownerId: number, refId: number, score: Bp, innov: Bp) => {
        if (innov > 0) out.push({ ownerId, refId, points: mulBp(score, BP_ONE + innov) });
      };
      for (const p of games.player) add(PLAYER, p.id, p.result!.scoreBp, projectInnovation(data, p.features));
      for (const p of games.ai) add(p.studioId, p.id, p.scoreBp, p.innovationBp ?? 0);
      break;
    }
    case "engine": {
      // ZIE-R03: erst ab dem ersten Lizenzmarkt, also sobald eine Engine laufende Lizenzen hat.
      const counts = new Map<number, number>();
      for (const c of state.licensing.contracts) if (c.status !== "beendet") counts.set(c.engineId, (counts.get(c.engineId) ?? 0) + 1);
      for (const e of state.licensing.engines) {
        const n = counts.get(e.id) ?? 0;
        if (!e.closed && n > 0) out.push({ ownerId: e.ownerId, refId: e.id, points: n * P(data).enginePointsPerContract + e.trustBp });
      }
      if (out.length === 0) return null;
      break;
    }
    case "studio":
    case "newcomer": {
      const maxAge = category === "newcomer" ? P(data).newcomerMaxWeeks : Number.MAX_SAFE_INTEGER;
      for (const s of liveStudios(state)) {
        if (state.week - s.foundedWeek > maxAge) continue;
        const pts = studioPoints(data, s.lastScores, s.revenueByYear);
        if (pts > 0) out.push({ ownerId: s.id, refId: s.id, points: pts });
      }
      if (state.week <= maxAge) {
        const scores = state.projects.filter((p) => p.status === "veroeffentlicht" && p.result).slice(-5).map((p) => p.result!.scoreBp);
        const pts = studioPoints(data, scores, state.ai.playerRevenueByYear);
        if (pts > 0) out.push({ ownerId: PLAYER, refId: PLAYER, points: pts });
      }
      break;
    }
  }
  return out.sort((a, b) => b.points - a.points || a.ownerId - b.ownerId || a.refId - b.refId).slice(0, P(data).nominees);
}

/** ZIE-R04: Gewinner aus den drei Besten, gewichtet nach Punkten, mit dem Strom „awards“. */
function drawWinner(state: GameState, data: GameData, nominees: AwardNominee[]): number {
  const top = nominees.slice(0, P(data).drawTop);
  const total = top.reduce((s, n) => s + n.points, 0);
  let r = stream(state, "awards").int(total);
  for (let i = 0; i < top.length; i++) {
    r -= top[i]!.points;
    if (r < 0) return i;
  }
  return 0;
}

/** ZIE-R05: +20 % Wochenverkäufe für 8 Wochen (Faktor in bp). */
export function awardFactor(data: GameData, until: number | undefined, week: number): Bp {
  return until !== undefined && week < until ? BP_ONE + P(data).salesBoostBp : BP_ONE;
}

export function playerAwardFactor(data: GameData, sales: ProductSales, week: number): Bp {
  return awardFactor(data, sales.awardUntil, week);
}

/** ZIE-R05: Wirkung eines Preises auf Spiel und Ruf. */
function applyWin(state: GameState, data: GameData, category: AwardCategory, n: AwardNominee): void {
  const until = state.week + P(data).salesBoostWeeks;
  const isGame = category === "spiel" || category === "innovation";
  if (n.ownerId !== PLAYER) {
    if (isGame) {
      const p = state.ai.products.find((x) => x.id === n.refId);
      if (p) p.awardUntil = until;
    }
    // ANNAHME: KI-Studios haben keinen eigenen Ruf-Wert; ihr Ruf ergibt sich aus den Wertungen (MRK-R37).
    return;
  }
  state.studioReputationBp = Math.min(BP_ONE, state.studioReputationBp + P(data).reputationBp);
  if (isGame) {
    const p = state.projects.find((x) => x.id === n.refId)!;
    if (p.sales) p.sales.awardUntil = until;
    p.result!.awards = [...(p.result!.awards ?? []), category];
  }
  if (category === "engine") reachMilestone(state, "engineDesJahres");
  if (category === "studio") reachMilestone(state, "studioDesJahres");
  const key = n.refId === PLAYER && !isGame && category !== "engine" ? "log.awardWonStudio" : "log.awardWon";
  chronicle(state, key, { category, name: nomineeName(state, category, n) });
  log(state, key, { category, name: nomineeName(state, category, n) });
}

/** Anzeigename einer Nominierung (Spieltitel, Engine- oder Studioname; KI-Spiele über ihr Studio; eigenes Studio leer). */
export function nomineeName(state: GameState, category: AwardCategory, n: AwardNominee): string {
  if (category === "engine") return state.licensing.engines.find((e) => e.id === n.refId)?.name ?? "";
  if (n.ownerId === PLAYER) {
    if (category === "studio" || category === "newcomer") return "";
    return state.projects.find((p) => p.id === n.refId)?.title ?? "";
  }
  return state.ai.studios.find((s) => s.id === n.ownerId)?.name ?? "";
}

/** Tick-Schritt 7 nach der Messe: Branchenpreise in der Messewoche (ZIE-R03, MKT-R39). */
export function awardStep(state: GameState, data: GameData): void {
  const d = dateOf(state.startYear, state.week);
  if (d.weekOfYear !== data.tradeShows.fairWeekOfYear) return;
  for (const category of P(data).categories) {
    const nominees = candidates(state, data, category);
    if (!nominees || nominees.length === 0) continue;
    const winner = drawWinner(state, data, nominees);
    const award: Award = { year: d.year, category, nominees, winner };
    state.awards.push(freezeDeep(award));
    for (const n of nominees) {
      if (n.ownerId !== PLAYER || n === nominees[winner]) continue;
      log(state, n.refId === PLAYER && category !== "engine" && category !== "spiel" && category !== "innovation" ? "log.awardNominatedStudio" : "log.awardNominated",
        { category, name: nomineeName(state, category, n) });
    }
    applyWin(state, data, category, nominees[winner]!);
  }
}

/** Preise des Spielers (für Ruhmeshalle und Abschluss). */
export function playerAwards(state: GameState): Award[] {
  return state.awards.filter((a) => a.nominees[a.winner]!.ownerId === PLAYER);
}
