// S05 Messe-Saison (MKT-R35 bis MKT-R38): Branchenmesse (bis Mitte der 1990er Handelsmesse) und Entwicklerkonferenz.
import { type Bp, BP_ONE, type Cent, mulBp } from "../num";
import type { BoothSize, FairShow, GameData, GameState, Project, TradeShowParams } from "../model/types";
import { ledgerNow, scaleToYear } from "./finanzen";
import { dateOf } from "../calendar";
import { stream } from "../rng";
import { announce, fairInterest, genreAverage, interestCap, lateEnough, remainingWeeks } from "./marketing";
import { forecast } from "./produkte/forecast";
import { drawApplicant, maxPersonsNow } from "./firma";
import { chronicle, isUnlocked } from "./katalog";
import { addEvent } from "./ereignisse";
import { liveStudios } from "./ki/studios";

function P(data: GameData): TradeShowParams {
  return data.tradeShows;
}

function shownProjects(state: GameState): Project[] {
  return state.projects.filter((p) => p.status === "laeuft" || p.status === "bereit").sort((a, b) => a.id - b.id);
}

/** Woche der nächsten Branchenmesse (absolut), auch für die Anzeige. */
export function nextFairWeek(state: GameState, data: GameData): number {
  const d = dateOf(state.startYear, state.week);
  const delta = (P(data).fairWeekOfYear - d.weekOfYear + 52) % 52;
  return state.week + delta;
}

/** Handelsmesse bis Mitte der 1990er (MKT-R36). */
export function isTradeFair(data: GameData, year: number): boolean {
  return year <= P(data).tradeFairUntilYear;
}

/**
 * S05 Abschnitt 6, „Vorschlag nach Prognose“ (ANNAHME): Demo, wenn die Prognose den Genre-Schnitt erreicht und das
 * Spiel weit genug ist; sonst Trailer, wenn das Projekt angekündigt ist oder der Autopilot es bis zum Release
 * ohnehin ankündigt; sonst nichts.
 */
export function fairSuggestion(state: GameState, data: GameData, p: Project): FairShow {
  const good = forecast(state, data, p).scoreBp >= genreAverage(state, data, p.genre);
  if (good && lateEnough(data, p)) return "demo";
  const m = p.marketing;
  const soon = m.autoAnnounce && remainingWeeks(state, data, p) <= data.marketing.autoAnnounceWeeks;
  return m.announcedWeek !== null || soon ? "trailer" : "nichts";
}

/** MKT-R35, MKT-R37: Wirkung eines Auftritts auf das Interesse (Faktor in bp). */
export function fairFactor(data: GameData, show: FairShow, good: boolean, atAnnouncement: boolean, boothBp: Bp = BP_ONE): Bp {
  const t = P(data);
  // S13 AUS-R21: Die Standgröße skaliert die Wirkung (mittel = 1,0); eine schwache Demo schadet auf großem Stand mehr.
  const effect = mulBp(show === "trailer" ? t.trailerBp : show === "demo" ? (good ? t.demoBp : -t.demoBadBp) : 0, boothBp);
  // MKT-R38: Ankündigungen auf der Messe wirken 1,5-mal stärker.
  return BP_ONE + (atAnnouncement ? mulBp(effect, t.announceFactorBp) : effect);
}

/**
 * Auftritt eines Spielerprojekts. Ein nicht angekündigtes Projekt wird auf der Messe angekündigt (MKT-R38) und
 * startet mit 10 % des zur Prognose passenden Interesses (ANNAHME), damit der Faktor etwas zum Wirken hat.
 */
export function showProject(state: GameState, data: GameData, p: Project, show: FairShow, boothBp: Bp = BP_ONE): void {
  if (show === "nichts") return;
  const m = p.marketing;
  // ANNAHME: Eine spielbare Demo braucht die Beta (wie MKT-R07); davor wird ein Trailer gezeigt.
  const actual: FairShow = show === "demo" && !lateEnough(data, p) ? "trailer" : show;
  const score = forecast(state, data, p).scoreBp;
  const good = score >= genreAverage(state, data, p.genre);
  const atAnnouncement = m.announcedWeek === null;
  if (atAnnouncement) {
    announce(state, p);
    m.interest = Math.max(m.interest, mulBp(fairInterest(state, data, p.platforms, score), P(data).announceSeedBp));
  }
  m.interest = Math.min(interestCap(state, data, p.platforms), mulBp(m.interest, fairFactor(data, actual, good, atAnnouncement, boothBp)));
  m.interestPeak = Math.max(m.interestPeak, m.interest);
  m.fairShownWeek = state.week;
  const key = actual === "demo" && !good ? "log.fairDemoBad" : atAnnouncement ? "log.fairAnnounced" : "log.fairShown";
  chronicle(state, key, { project: p.title, show: actual });
}

/** Tick-Schritt 7 nach dem Marketing: Branchenmesse und Entwicklerkonferenz in ihren Wochen. */
export function tradeShowStep(state: GameState, data: GameData): void {
  const t = P(data);
  const d = dateOf(state.startYear, state.week);
  if (d.weekOfYear === t.fairWeekOfYear) fairStep(state, data);
  if (d.weekOfYear === t.conferenceWeekOfYear && d.year >= t.conferenceFromYear) conferenceStep(state, data);
}

/** S13 AUS-R21: Kosten eines Stands im Jahr (1980er Preise aufs Lohnniveau des Jahres). */
export function boothCost(state: GameState, data: GameData, size: BoothSize): Cent {
  return scaleToYear(data, P(data).booths[size].costCent, dateOf(state.startYear, state.week).year);
}

function fairStep(state: GameState, data: GameData): void {
  const booth = P(data).booths[state.fairBooth];
  let shown = false;
  for (const p of shownProjects(state)) {
    const plan = p.marketing.fairPlan;
    const show = plan === "auto" ? fairSuggestion(state, data, p) : plan;
    showProject(state, data, p, show, booth.effectBp);
    shown ||= show !== "nichts";
    // MKT-R35: Der Plan gilt für ein Jahr; danach wieder der Vorschlag.
    p.marketing.fairPlan = "auto";
  }
  // S13 AUS-R21: Der Stand kostet nur, wenn das Studio etwas zeigt.
  if (shown) {
    const cost = boothCost(state, data, state.fairBooth);
    state.moneyCent -= cost;
    ledgerNow(state).costs.marketing += cost;
  }
  // S05 Abschnitt 7: Jedes KI-Studio zeigt seine zwei stärksten Projekte (als Trailer, ANNAHME).
  for (const studio of liveStudios(state)) {
    const projects = studio.teams.map((tm) => tm.project).filter((x) => x !== null);
    const best = [...projects].sort((a, b) => b.expectedScoreBp - a.expectedScoreBp || a.startWeek - b.startWeek).slice(0, P(data).aiShows);
    for (const ap of best) {
      ap.interest = Math.min(interestCap(state, data, ap.platforms), mulBp(ap.interest ?? 0, fairFactor(data, "trailer", true, false)));
    }
  }
}

/**
 * MKT-R36: Die Entwicklerkonferenz bringt Bewerber und Ruf. ANNAHME: Das Studio nimmt teil, sobald es ein Spiel
 * veröffentlicht hat; es gibt +0,5 Studio-Ruf und eine Bewerbung, wenn Platz ist. Lizenzanfragen kommen weiter über
 * den Lizenzmarkt (S04).
 */
function conferenceStep(state: GameState, data: GameData): void {
  if (!state.projects.some((p) => p.status === "veroeffentlicht")) return;
  state.studioReputationBp = Math.min(BP_ONE, state.studioReputationBp + P(data).conferenceReputationBp);
  chronicle(state, "log.conference", {});
  const rng = stream(state, "messe");
  const applicant = drawApplicant(state, data, rng);
  if (state.people.length >= maxPersonsNow(state, data) || !isUnlocked(state, "bewerbungen")) return;
  if (state.events.some((e) => e.kind === "bewerbung") || state.eventQueue.some((e) => e.kind === "bewerbung")) return;
  addEvent(state, data, { kind: "bewerbung", scope: "welt", projectId: null, options: ["einstellen", "ablehnen"], defaultOption: "ablehnen", applicant });
}

/** MKT-R36: Handelsmesse: gezeigte Titel, die binnen eines Jahres erscheinen, behalten den Regalplatz länger. */
export function tradeShelfWeeks(state: GameState, data: GameData, p: Project): number {
  const w = p.marketing.fairShownWeek;
  if (w === null || state.week - w > P(data).tradeShelfWithinWeeks) return 0;
  return isTradeFair(data, dateOf(state.startYear, w).year) ? P(data).tradeShelfExtraWeeks : 0;
}
