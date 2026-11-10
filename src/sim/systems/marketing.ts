// S05 Interesse und Marketing (MKT-R01 bis MKT-R08, MKT-F1). Spieler und KI rechnen mit derselben
// Wachstumsformel und derselben Enttäuschung (KI-R01).
import { type Bp, BP_ONE, type Cent, clamp, divInt, mulBp, mulDiv } from "../num";
import type { AiProject, AiStudio, Brand, GameData, GameState, InterestParts, Project, ProjectMarketing, ScoreFactor } from "../model/types";
import { dateOf } from "../calendar";
import { anchorValue, ledgerNow } from "./finanzen";
import { qRel, reachableBase } from "./markt";
import { brandById, startFans } from "./marken";
import { assignedTo } from "./firma";
import { liveStudios, weeklyCost } from "./ki/studios";
import { forecast } from "./produkte/forecast";

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

export function emptyMarketing(data: GameData, costCent: Cent = 0): ProjectMarketing {
  return {
    interest: 0, interestPeak: 0, budgetPermille: data.marketing.budgetDefaultPermille, announcedWeek: null, autoAnnounce: true,
    lastCostCent: costCent, spentCent: 0, last: { spendCent: 0, decay: 0, wordOfMouth: 0, reach: 0, brand: 0, capped: 0 },
    demo: "keine", demoDone: false, creatorWeeksLeft: 0, creatorUsed: false, weaknesses: [], fairPlan: "auto", fairShownWeek: null,
  };
}

/** MKT-T18: Budget auf 0–1.500 Promille begrenzt. */
export function clampBudget(data: GameData, permille: number): number {
  return Math.max(0, Math.min(data.marketing.budgetMaxPermille, Math.trunc(permille)));
}

/** M½ = 1 % des Mittel-Budgets der Epoche je Woche (Personalkosten je Monat · Personenmonate, ANNAHME). */
export function halfEffectCent(data: GameData, year: number): Cent {
  const m = data.marketing;
  return mulBp(anchorValue(data.economy.salaryAnchorsCent, year) * m.mediumBudgetPersonMonths, m.halfEffectShareBp);
}

/** b: Kosten je erreichter Person, 1990 400 Cent (25 Personen je 100 USD), mit den Personalkosten der Epoche skaliert. */
export function reachCostCent(data: GameData, year: number): Cent {
  const a = data.economy.salaryAnchorsCent;
  return Math.max(1, mulDiv(data.marketing.reachCostCentPerPersonAt1990, anchorValue(a, year), anchorValue(a, 1990), 1));
}

/**
 * MKT-F1: I' = min(I_max, I · (1 − δ) + g · I · M / (M + M½) + b · M + Marke). Vor der Ankündigung sind g und b null
 * (MKT-R03, MKT-T12): Interesse wächst dann nur durch die Marke. ANNAHME: Der Ruf des Studios kommt mit den
 * Branchenpreisen (Teilschritt 4.10) dazu.
 */
export function interestStep(
  data: GameData, year: number, interest: number, spendCent: Cent, announced: boolean, brandInterest: number, cap: number, boost = 1,
): { next: number; parts: InterestParts } {
  const m = data.marketing;
  const decay = mulBp(interest, m.decayBp);
  const half = halfEffectCent(data, year);
  // MKT-R08: Der Creator-Zugang verdoppelt den Zuwachs der Woche (boost = 2).
  const wordOfMouth = announced && spendCent > 0 ? mulDiv(mulBp(interest, m.wordOfMouthBp), spendCent, spendCent + half, 1) * boost : 0;
  const reach = announced ? divInt(spendCent, reachCostCent(data, year), 1) * boost : 0;
  const raw = interest - decay + wordOfMouth + reach + brandInterest;
  // MKT-T11: nie über die erreichbare Zielgruppe.
  const next = Math.max(0, Math.min(cap, raw));
  return { next, parts: { spendCent, decay, wordOfMouth, reach, brand: brandInterest, capped: Math.max(0, raw - next) } };
}

/** Marke: Startfans für das Genre · Anteil je Woche (PRD-R71 als Quelle des Interesses). */
function brandInterest(state: GameState, data: GameData, brandId: number | null | undefined, genre: string): number {
  const b = brandById(state, brandId);
  return b ? mulBp(startFans(data, b, genre), data.marketing.brandInterestBp) : 0;
}

/** Deckel I_max: erreichbare Basis der Zielplattformen (ANNAHME: Marktgröße der Zielgruppe · Reichweite = Σ Basis). */
export function interestCap(state: GameState, data: GameData, platforms: readonly string[]): number {
  return reachableBase(data, platforms, yearOf(state), undefined, state);
}

/** Restliche Arbeitswochen bei der jetzigen Besetzung (für den Autopiloten). */
export function remainingWeeks(state: GameState, data: GameData, p: Project): number {
  const people = Math.max(1, assignedTo(state, p.id).length);
  const rest = Math.max(0, p.effortTotalBp - p.effortDoneBp);
  const cap = people * data.start.workPerPersonWeekBp;
  return divInt(rest + cap - 1, cap, 1);
}

/** MKT-R06, Entscheidungstabelle S05: Der Autopilot kündigt ab Pre-Production an, wenn höchstens 52 Wochen fehlen. */
function autoAnnounceDue(state: GameState, data: GameData, p: Project): boolean {
  const first = data.projects.phases[p.scope][0]!.id;
  return p.phase !== first && remainingWeeks(state, data, p) <= data.marketing.autoAnnounceWeeks;
}

export function announce(state: GameState, p: Project): void {
  if (p.marketing.announcedWeek === null) p.marketing.announcedWeek = state.week;
}

/**
 * Tick-Schritt 7 (Markt), vor den Verkäufen: Interesse aller Spielerprojekte in Entwicklung. Ausgaben dieser Woche =
 * Budget-Promille · Entwicklungskosten der Vorwoche, nur nach der Ankündigung (ANNAHME: Der Autopilot hält das
 * Budget bis dahin zurück, weil Marketing vorher nicht wirkt, MKT-R03).
 */
export function marketingStep(state: GameState, data: GameData): void {
  const year = yearOf(state);
  let total = 0;
  for (const p of [...state.projects].sort((a, b) => a.id - b.id)) {
    if (p.status !== "laeuft" && p.status !== "bereit" && p.status !== "pausiert") continue;
    const m = p.marketing;
    if (m.autoAnnounce && m.announcedWeek === null && p.status === "laeuft" && autoAnnounceDue(state, data, p)) announce(state, p);
    const devCost = Math.max(0, p.costCent - m.lastCostCent);
    m.lastCostCent = p.costCent;
    const announced = m.announcedWeek !== null;
    const spend = announced ? mulDiv(devCost, m.budgetPermille, 1000, 1) : 0;
    const boost = m.creatorWeeksLeft > 0 ? 2 : 1;
    if (m.creatorWeeksLeft > 0) m.creatorWeeksLeft -= 1;
    const step = interestStep(data, year, m.interest, spend, announced, brandInterest(state, data, p.brandId, p.genre), interestCap(state, data, p.platforms), boost);
    m.interest = step.next;
    m.interestPeak = Math.max(m.interestPeak, m.interest);
    m.last = step.parts;
    m.spentCent += spend;
    total += spend;
  }
  if (total > 0) {
    state.moneyCent -= total;
    ledgerNow(state).costs.marketing += total;
  }
}

/** Tick-Schritt 7 für die KI: Interesse aller laufenden KI-Projekte, nach Firmen- und Team-ID. */
export function aiMarketingStep(state: GameState, data: GameData): void {
  for (const s of liveStudios(state)) for (const t of s.teams) if (t.project) aiProjectMarketing(state, data, s, t.project, t.size);
}

/** S05 Abschnitt 7: KI-Marketing nach Archetyp; angekündigt ab Projektstart (MKT-R14). */
export function aiProjectMarketing(state: GameState, data: GameData, studio: AiStudio, project: AiProject, teamSize: number): void {
  const year = yearOf(state);
  const permille = data.marketing.aiBudgetPermille[studio.archetype] ?? data.marketing.budgetDefaultPermille;
  const spend = mulDiv(weeklyCost(state, data, teamSize), permille, 1000, 1);
  const step = interestStep(data, year, project.interest ?? 0, spend, true, brandInterest(state, data, project.brandId, project.genre), interestCap(state, data, project.platforms));
  project.interest = step.next;
  studio.cashCent -= spend;
  project.costCent += spend;
}

/** Anzeige: Interesse je Epoche als Vorbestellungen (bis 1999), Hype (2000–2009) oder Wishlists (ab 2010) (MKT-R01). */
export function interestLabel(year: number): "vorbestellungen" | "hype" | "wishlists" {
  return year < 2000 ? "vorbestellungen" : year < 2010 ? "hype" : "wishlists";
}

// ---------- Interesse am Release (MKT-R05, MKT-R07, MKT-R08) ----------

/**
 * Genre-Schnitt für Demo und Creator-Zugang: mittlere Wertung der KI-Titel des Genres aus den letzten zwei Jahren
 * (ANNAHME), ohne solche Titel 7,0.
 */
export function genreAverage(state: GameState, data: GameData, genre: string): Bp {
  const m = data.marketing;
  const recent = state.ai.products.filter((p) => p.genre === genre && state.week - p.releaseWeek <= m.genreAverageWeeks);
  if (recent.length === 0) return m.genreAverageDefaultBp;
  return divInt(recent.reduce((sum, p) => sum + p.scoreBp, 0), recent.length, 1);
}

/** Demo und Creator-Zugang „ab Beta“: ab 80 % Fortschritt oder fertig. */
export function lateEnough(data: GameData, p: Project): boolean {
  return p.status === "bereit" || mulDiv(p.effortDoneBp, BP_ONE, Math.max(1, p.effortTotalBp), 1) >= data.marketing.lateMinProgressBp;
}

/** MKT-R07: Die Demo zeigt die Prognose: über dem Genre-Schnitt +15 % Interesse, darunter −10 % (einmal). */
export function applyDemo(state: GameState, data: GameData, p: Project): void {
  const m = p.marketing;
  if (m.demoDone || m.demo === "keine") return;
  m.demoDone = true;
  const good = forecast(state, data, p).scoreBp >= genreAverage(state, data, p.genre);
  const factor = good ? BP_ONE + data.marketing.demoUpBp : BP_ONE - data.marketing.demoDownBp;
  m.interest = Math.min(interestCap(state, data, p.platforms), mulBp(m.interest, factor));
  m.interestPeak = Math.max(m.interestPeak, m.interest);
}

/**
 * MKT-R08: Creator-Zugang (ab 2010): 4 Wochen doppelter Zuwachs; die drei größten Schwächen der Prognose werden
 * öffentlich, jede schwere (ab −1,0 Wertungspunkt) kostet 10 % Interesse.
 */
export function creatorAccess(state: GameState, data: GameData, p: Project): void {
  const m = p.marketing;
  const c = data.marketing;
  m.creatorUsed = true;
  m.creatorWeeksLeft = c.creatorWeeks;
  const bars = forecast(state, data, p).bars.filter((b) => b.value < 0 && b.factor !== "tagesform" && b.factor !== "begrenzung");
  const worst = [...bars].sort((a, b) => a.value - b.value || a.factor.localeCompare(b.factor)).slice(0, 3);
  m.weaknesses = worst.map((b) => b.factor as ScoreFactor);
  const severe = worst.filter((b) => -b.value >= c.creatorSevereBp).length;
  if (severe > 0) m.interest = mulBp(m.interest, Math.max(0, BP_ONE - severe * c.creatorWeaknessPenaltyBp));
}

/** MKT-R05: das zur Wertung passende Interesse = Σ Basis · Anteil · Q_rel (ANNAHME). */
export function fairInterest(state: GameState, data: GameData, platforms: readonly string[], scoreBp: Bp): number {
  return mulBp(mulBp(interestCap(state, data, platforms), data.marketing.fairInterestShareBp), qRel(data, scoreBp));
}

/** Anteil (0–1) der Enttäuschungsfolge: 0 bis zur Schwelle 1,5×, 1 ab 3× des passenden Interesses. */
function disappointmentShare(data: GameData, interest: number, fair: number): Bp {
  const m = data.marketing;
  const gap = mulDiv(interest, BP_ONE, Math.max(1, fair), 1);
  if (gap <= m.disappointmentThresholdBp) return -1;
  return clamp(mulDiv(gap - m.disappointmentThresholdBp, BP_ONE, m.disappointmentFullBp - m.disappointmentThresholdBp, 1), 0, BP_ONE);
}

function between([lo, hi]: [Bp, Bp], share: Bp): Bp {
  return lo + mulBp(hi - lo, share);
}

/**
 * MKT-R05: Liegt das Interesse zum Release über 1,5 × dem passenden Wert, fällt die Spielerwertung unter die
 * Pressewertung (−0,5 bis −2) und die Marke verliert Ruf (−5 bis −15 Punkte). ANNAHME: Die Spielerwertung steuert
 * die Verkaufskurve (Q_rel und Abfall), die Pressewertung bleibt die veröffentlichte Wertung.
 */
export function disappointment(state: GameState, data: GameData, platforms: readonly string[], interest: number, scoreBp: Bp, brand: Brand | undefined): { userScoreBp: Bp; fair: number } {
  const fair = fairInterest(state, data, platforms, scoreBp);
  const share = disappointmentShare(data, interest, fair);
  if (share < 0) return { userScoreBp: scoreBp, fair };
  const m = data.marketing;
  if (brand) brand.reputationBp = Math.max(0, brand.reputationBp - between(m.brandPenaltyBp, share));
  return { userScoreBp: Math.max(data.quality.scoreMinBp, scoreBp - between(m.userPenaltyBp, share)), fair };
}

/** Am Release: Demo „zum Release“ wirkt, dann wird das Interesse eingefroren und mit der Wertung verglichen. */
export function releaseInterest(state: GameState, data: GameData, p: Project, scoreBp: Bp): { userScoreBp: Bp; interest: number; fair: number } {
  if (p.marketing.demo === "zumRelease") applyDemo(state, data, p);
  const d = disappointment(state, data, p.platforms, p.marketing.interest, scoreBp, brandById(state, p.brandId));
  return { userScoreBp: d.userScoreBp, interest: p.marketing.interest, fair: d.fair };
}

/** S05 Ereignis „Konkurrent legt Release auf deine Woche“, Option Marketing erhöhen: einmalig 10 % der Entwicklungskosten. */
export function marketingBoost(state: GameState, data: GameData, p: Project): void {
  const spend = mulBp(p.costCent, data.release.duelBoostShareBp);
  if (spend <= 0) return;
  // Wer gegenhält, macht das Spiel spätestens jetzt öffentlich.
  announce(state, p);
  const reach = divInt(spend, reachCostCent(data, yearOf(state)), 1);
  p.marketing.interest = Math.min(interestCap(state, data, p.platforms), p.marketing.interest + reach);
  p.marketing.interestPeak = Math.max(p.marketing.interestPeak, p.marketing.interest);
  p.marketing.spentCent += spend;
  state.moneyCent -= spend;
  ledgerNow(state).costs.marketing += spend;
}
