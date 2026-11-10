// S13 3.5 Eigenes Publishing (AUS-R40 bis AUS-R43, Ausbaustufe 1.3; Prüfung Fable 03.11.2026: „passend“, Entscheidung Projektleitung: bauen).
// KI-Studios pitchen Projekte, der Spieler zahlt Vorschuss in Raten und bekommt dafür einen Anteil an den Einnahmen.
// ANNAHMEN (OFFENE-FRAGEN): statt des vollen Verhandlungstischs drei Pakete (knapp, ausgewogen, großzügig) mit fester
// Annahme-Chance; drei Raten bei Unterschrift, Hälfte und Gold; die Abteilung Publishing ist keine eigene Mannschaft,
// die Zahl der Plätze wächst mit der Firmengröße.
import { type Bp, BP_ONE, type Cent, clamp, divBp, divInt, mulBp } from "../num";
import type {
  AiProduct, AiProject, AiStudio, AiTeam, GameData, GameState, OwnPublishingParams, PublishingDeal, PublishingPackage, PublishingPitch,
} from "../model/types";
import { dateOf, isFirstWeekOfMonth } from "../calendar";
import { type Rng, stream } from "../rng";
import { ledgerNow, scaleToYear } from "./finanzen";
import { log } from "./firma";
import { chronicle } from "./katalog";
import { liveStudios } from "./ki/studios";

const PLAYER = 0;
export const PACKAGES: readonly PublishingPackage[] = ["knapp", "ausgewogen", "grosszuegig"];

function P(data: GameData): OwnPublishingParams {
  return data.publishers.own;
}

function year(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

export function publisherProfile(state: GameState): boolean {
  return state.settings.profile === "publisher";
}

/** AUS-R40: Publishing ist offen ab dem Jahr und den eigenen Releases (Profil Publisher: sofort). */
export function publishingOpen(state: GameState, data: GameData): boolean {
  if (publisherProfile(state)) return true;
  const released = state.projects.filter((p) => p.status === "veroeffentlicht").length;
  return year(state) >= P(data).fromYear && released >= P(data).minReleases;
}

/** AUS-R42: Plätze für gleichzeitige Titel (laufende Verträge vor dem Release). */
export function publishingSlots(state: GameState, data: GameData): number {
  return P(data).slotsBase + divInt(state.people.length, P(data).peoplePerSlot, 1);
}

function activeDeals(state: GameState): PublishingDeal[] {
  return state.publishing.deals.filter((d) => d.status === "laeuft");
}

function progressBp(p: AiProject): Bp {
  return p.effortTotalBp <= 0 ? BP_ONE : clamp(divBp(p.effortDoneBp, p.effortTotalBp, 1), 0, BP_ONE);
}

function meanStrength(s: AiStudio): number {
  const v = Object.values(s.strength);
  return v.length === 0 ? 0 : divInt(v.reduce((a, b) => a + b, 0), v.length, 1);
}

function teamOf(state: GameState, studioId: number, teamId: number): { studio: AiStudio; team: AiTeam } | null {
  const studio = state.ai.studios.find((s) => s.id === studioId && s.closedWeek === null);
  const team = studio?.teams.find((t) => t.id === teamId);
  return studio && team ? { studio, team } : null;
}

// ---------- Pitches (AUS-R40) ----------

function pitchCandidates(state: GameState, data: GameData): { studio: AiStudio; team: AiTeam }[] {
  const busy = new Set(state.publishing.deals.filter((d) => d.status === "laeuft").map((d) => `${d.studioId}:${d.teamId}`));
  const pitched = new Set(state.publishing.pitches.map((p) => `${p.studioId}:${p.teamId}`));
  const out: { studio: AiStudio; team: AiTeam }[] = [];
  for (const studio of liveStudios(state)) {
    if (studio.parent?.ownerId === PLAYER || studio.size === "gross") continue;
    for (const team of studio.teams) {
      const key = `${studio.id}:${team.id}`;
      if (!team.project || busy.has(key) || pitched.has(key) || team.project.copyOf !== null) continue;
      if (progressBp(team.project) >= P(data).pitchUntilBp) continue;
      out.push({ studio, team });
    }
  }
  return out;
}

function makePitch(state: GameState, data: GameData, rng: Rng): void {
  const cands = pitchCandidates(state, data);
  if (cands.length === 0) return;
  const { studio, team } = cands[rng.int(cands.length)]!;
  const p = team.project!;
  const slice = progressBp(p) >= P(data).sliceFromBp;
  const noise = slice ? P(data).sliceNoiseBp : P(data).conceptNoiseBp;
  // Gezeigte Wertung: erwartete Wertung ± Unschärfe, einmal gezogen.
  const shown = clamp(p.expectedScoreBp + rng.range(-noise, noise + 1), data.quality.scoreMinBp, data.quality.scoreMaxBp);
  const pitch: PublishingPitch = {
    id: state.publishing.nextId++, studioId: studio.id, teamId: team.id, genre: p.genre, scope: p.scope, mode: slice ? "slice" : "konzept",
    shownScoreBp: shown, noiseBp: noise, budgetCent: Math.max(p.costCent, scaleToYear(data, P(data).budgetFloorCent[p.scope], year(state))), expiresWeek: state.week + P(data).pitchWeeks,
  };
  state.publishing.pitches.push(pitch);
  log(state, "log.publishingPitch", { studio: studio.name, genre: p.genre });
}

// ---------- Angebot und Vertrag ----------

export function validatePublishingOffer(state: GameState, data: GameData, pitchId: number, pkg: PublishingPackage | null): string | null {
  const pitch = state.publishing.pitches.find((p) => p.id === pitchId);
  if (!pitch) return "error.unknownOffer";
  if (pkg === null) return null;
  if (!PACKAGES.includes(pkg)) return "error.unknownOption";
  if (activeDeals(state).length >= publishingSlots(state, data)) return "error.publishingSlots";
  return state.moneyCent >= firstRate(data, pitch, pkg) ? null : "error.noMoney";
}

function advanceOf(data: GameData, pitch: { budgetCent: Cent }, pkg: PublishingPackage): Cent {
  return mulBp(pitch.budgetCent, P(data).packages[pkg].advanceBp);
}

function rateAmounts(data: GameData, advance: Cent): Cent[] {
  const n = P(data).rateAtBp.length;
  const part = divInt(advance, n, 1);
  return P(data).rateAtBp.map((_, i) => (i === n - 1 ? advance - part * (n - 1) : part));
}

function firstRate(data: GameData, pitch: { budgetCent: Cent }, pkg: PublishingPackage): Cent {
  return rateAmounts(data, advanceOf(data, pitch, pkg))[0]!;
}

function pay(state: GameState, studio: AiStudio, amount: Cent): void {
  state.moneyCent -= amount;
  const l = ledgerNow(state);
  l.costs.publishing = (l.costs.publishing ?? 0) + amount;
  studio.cashCent += amount;
}

function signDeal(state: GameState, data: GameData, pitch: PublishingPitch, pkg: PublishingPackage, studio: AiStudio, team: AiTeam): PublishingDeal {
  const advance = advanceOf(data, pitch, pkg);
  const amounts = rateAmounts(data, advance);
  const deal: PublishingDeal = {
    id: state.publishing.nextId++, studioId: studio.id, studioName: studio.name, teamId: team.id, projectStartWeek: team.project!.startWeek,
    genre: pitch.genre, scope: pitch.scope, package: pkg, advanceCent: advance, studioShareBp: P(data).packages[pkg].studioShareBp,
    signedWeek: state.week, rates: P(data).rateAtBp.map((atBp, i) => ({ atBp, amountCent: amounts[i]!, paid: false, missed: 0 })),
    status: "laeuft", productId: null, incomeCent: 0, decision: null,
  };
  state.publishing.deals.push(deal);
  return deal;
}

/** AUS-R40: Paket anbieten; das Studio nimmt mit der Chance des Pakets an. */
export function publishingOffer(state: GameState, data: GameData, pitchId: number, pkg: PublishingPackage | null): void {
  const pitch = state.publishing.pitches.find((p) => p.id === pitchId)!;
  state.publishing.pitches = state.publishing.pitches.filter((p) => p.id !== pitchId);
  const t = teamOf(state, pitch.studioId, pitch.teamId);
  if (pkg === null || !t || !t.team.project) return;
  if (stream(state, "publisher").uniformBp() >= P(data).packages[pkg].acceptBp) {
    log(state, "log.publishingRefused", { studio: t.studio.name });
    return;
  }
  const deal = signDeal(state, data, pitch, pkg, t.studio, t.team);
  payRate(state, deal, t.studio, 0);
  log(state, "log.publishingSigned", { studio: t.studio.name, genre: pitch.genre });
  chronicle(state, "log.publishingSigned", { studio: t.studio.name, genre: pitch.genre });
}

function payRate(state: GameState, deal: PublishingDeal, studio: AiStudio, index: number, shareBp: Bp = BP_ONE): void {
  const r = deal.rates[index]!;
  pay(state, studio, mulBp(r.amountCent, shareBp));
  r.paid = true;
}

// ---------- Meilensteine (AUS-R41) ----------

export type PublishingAction = "zahlen" | "kuerzen" | "stoppen";

export function validatePublishingDeal(state: GameState, dealId: number, action: PublishingAction): string | null {
  const d = state.publishing.deals.find((x) => x.id === dealId);
  if (!d || d.status !== "laeuft") return "error.unknownOffer";
  if (action === "stoppen") return null;
  return d.decision ? null : "error.locked";
}

/** AUS-R41: verfehlter Meilenstein: trotzdem zahlen, kürzen (halbe Rate, weniger Aufwand) oder stoppen. */
export function publishingDecision(state: GameState, data: GameData, dealId: number, action: PublishingAction): void {
  const d = state.publishing.deals.find((x) => x.id === dealId)!;
  const t = teamOf(state, d.studioId, d.teamId);
  if (action === "stoppen" || !t) {
    d.status = "gestoppt";
    d.decision = null;
    log(state, "log.publishingStopped", { studio: d.studioName });
    return;
  }
  const index = d.decision?.rate;
  if (index === undefined) return;
  if (action === "kuerzen") {
    payRate(state, d, t.studio, index, P(data).cutRateBp);
    // ANNAHME: Gekürzt wird beim Aufwand; das Spiel wird früher fertig und schwächer.
    if (t.team.project) t.team.project.effortTotalBp = Math.max(t.team.project.effortDoneBp, mulBp(t.team.project.effortTotalBp, P(data).cutEffortBp));
  } else payRate(state, d, t.studio, index);
  d.decision = null;
}

function checkRates(state: GameState, data: GameData, d: PublishingDeal, studio: AiStudio, project: AiProject, rng: Rng): void {
  if (d.decision) {
    if (state.week >= d.decision.untilWeek) publishingDecision(state, data, d.id, "zahlen");
    return;
  }
  const progress = progressBp(project);
  const i = d.rates.findIndex((r) => !r.paid);
  if (i < 0 || d.rates[i]!.atBp > progress) return;
  const miss = clamp(P(data).missBaseBp - meanStrength(studio) * P(data).missPerStrengthBp, 0, BP_ONE);
  if (rng.uniformBp() < miss) {
    d.rates[i]!.missed += 1;
    project.plannedReleaseWeek += P(data).delayWeeks;
    d.decision = { rate: i, untilWeek: state.week + P(data).delayWeeks };
    log(state, "log.publishingMissed", { studio: d.studioName });
    return;
  }
  payRate(state, d, studio, i);
}

/** Beim Release des Studios (releaseAiProject): Produkt dem Vertrag zuordnen; AUS-R42 Marketing und Vertrieb heben die Nachfrage. */
export function linkPublishing(state: GameState, data: GameData, studio: AiStudio, team: AiTeam, project: AiProject, product: AiProduct): void {
  const d = activeDeals(state).find((x) => x.studioId === studio.id && x.teamId === team.id && x.projectStartWeek === project.startWeek);
  if (!d) return;
  for (let i = 0; i < d.rates.length; i++) if (!d.rates[i]!.paid) payRate(state, d, studio, i);
  // AUS-R42: Die eigene Abteilung bezahlt Marketing und Vertrieb zum Release.
  const marketing = mulBp(d.advanceCent, P(data).releaseMarketingBp);
  state.moneyCent -= marketing;
  ledgerNow(state).costs.marketing += marketing;
  d.status = "veroeffentlicht";
  d.decision = null;
  d.productId = product.id;
  product.publishingDealId = d.id;
  product.demandBp = mulBp(product.demandBp, P(data).demandBoostBp);
  log(state, "log.publishingReleased", { studio: studio.name, score: product.scoreBp });
}

/** Verkäufe eines verlegten Spiels: der Spieler bekommt seinen Anteil; zurück geht der Anteil des Studios. */
export function publishingSplit(state: GameState, product: AiProduct, revenue: Cent): Cent {
  if (product.publishingDealId === undefined || revenue <= 0) return revenue;
  const d = state.publishing.deals.find((x) => x.id === product.publishingDealId);
  if (!d) return revenue;
  const studioPart = mulBp(revenue, d.studioShareBp);
  const mine = revenue - studioPart;
  state.moneyCent += mine;
  const l = ledgerNow(state);
  l.income.publishing = (l.income.publishing ?? 0) + mine;
  d.incomeCent += mine;
  return studioPart;
}

/** Tick-Schritt 6 (nach den KI-Projekten): Pitches, Raten, verlorene Verträge. */
export function publishingStep(state: GameState, data: GameData): void {
  if (!publishingOpen(state, data)) return;
  // AUS-R43: Profil Publisher, Partnerstudios in der ersten Woche, in der KI-Teams an Spielen arbeiten.
  if (publisherProfile(state) && state.publishing.nextId === 1) startPartners(state, data);
  const rng = stream(state, "publisher");
  state.publishing.pitches = state.publishing.pitches.filter((p) => p.expiresWeek > state.week && teamOf(state, p.studioId, p.teamId)?.team.project);
  for (const d of activeDeals(state)) {
    const t = teamOf(state, d.studioId, d.teamId);
    const project = t?.team.project;
    if (!t || !project || project.startWeek !== d.projectStartWeek) {
      d.status = "verloren";
      d.decision = null;
      log(state, "log.publishingLost", { studio: d.studioName });
      continue;
    }
    checkRates(state, data, d, t.studio, project, rng);
  }
  if (!isFirstWeekOfMonth(state.startYear, state.week)) return;
  if (activeDeals(state).length + state.publishing.pitches.length >= publishingSlots(state, data) + 1) return;
  if (rng.uniformBp() < P(data).pitchChancePerMonthBp) makePitch(state, data, rng);
}

/** AUS-R43: Startprofil Publisher: zwei Partnerstudios mit ausgewogenem Vertrag zum Start. */
export function startPartners(state: GameState, data: GameData): void {
  const rng = stream(state, "publisher");
  for (let i = 0; i < P(data).profile.partners; i++) {
    makePitch(state, data, rng);
    const pitch = state.publishing.pitches.pop();
    if (!pitch) return;
    const t = teamOf(state, pitch.studioId, pitch.teamId)!;
    const deal = signDeal(state, data, pitch, "ausgewogen", t.studio, t.team);
    payRate(state, deal, t.studio, 0);
  }
}

export function initialPublishing() {
  return { pitches: [], deals: [], nextId: 1 };
}
