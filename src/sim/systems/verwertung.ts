// S05 Abschnitt 13 Verwertung (MKT-V15 bis MKT-V24) und Abo-Deals (MKT-R51 bis MKT-R54): Restnachfrage in drei
// Preisstufen, Complete Edition, Budget-Neuauflage, Sammlung, Klassiker, Lizenz an einen Budget-Publisher.
// Verwertungen sind Vorschläge, nie Pflicht (MKT-V24); die KI verwertet nicht (ANNAHME).
import { type Bp, BP_ONE, type Cent, clamp, mulBp, mulDiv } from "../num";
import type {
  DemandTier, ExploitationParams, GameData, GameEvent, GameState, ProductSales, Project, Reissue, ReissueKind,
} from "../model/types";
import { dateOf, isFirstWeekOfMonth, isFirstWeekOfYear } from "../calendar";
import { stream } from "../rng";
import { ledgerNow } from "./finanzen";
import { competitionFactor, digitalShare, grossPrice, mediumOf, platformById, weeklyDemand } from "./markt";
import { brandById } from "./marken";
import { log } from "./firma";
import { addEvent } from "./ereignisse";

const TIERS: DemandTier[] = ["voll", "mittel", "budget"];

function P(data: GameData): ExploitationParams {
  return data.exploitation;
}

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

/** Erwarteter Absatz über die ersten Wochen (wie die Abbruch-Prognose, ohne Preis- und Ereignis-Faktoren). */
export function expectedUnits(state: GameState, data: GameData, project: Project, scoreBp: Bp): number {
  let units = 0;
  const competition = competitionFactor(state, data, state.week, project.id);
  for (let t = 0; t < P(data).expectedWeeks; t++) units += weeklyDemand(state, data, project, scoreBp, t, state.week + t, competition);
  return units;
}

/**
 * MKT-V16: Restnachfrage beim Release = 2 · erwarteter Absatz, verteilt 50 / 30 / 20 % auf voll, mittel, budget.
 * MKT-V18: Ein Abschlag der Marke (Complete Edition zu früh) senkt die Stufe „voll“ des nächsten Titels einmal.
 */
export function initRemaining(state: GameState, data: GameData, project: Project, expected: number): Record<DemandTier, number> {
  const e = P(data);
  const potential = mulBp(expected, e.potentialFactorBp);
  const brand = brandById(state, project.brandId);
  const malus = brand?.waitMalusBp ?? 0;
  if (brand) brand.waitMalusBp = 0;
  return {
    voll: mulBp(mulBp(potential, e.tierShareBp.voll), BP_ONE - malus),
    mittel: mulBp(potential, e.tierShareBp.mittel),
    budget: mulBp(potential, e.tierShareBp.budget),
  };
}

export function totalRemaining(r: Record<DemandTier, number> | undefined): number {
  return r ? r.voll + r.mittel + r.budget : 0;
}

/** MKT-V16: Verkäufe verbrauchen die Stufen von oben (wer mehr zahlen würde, kauft zuerst). Gibt den Verbrauch zurück. */
export function consume(r: Record<DemandTier, number>, units: number, tiers: readonly DemandTier[] = TIERS): number {
  let left = units;
  for (const tier of tiers) {
    const take = Math.min(left, r[tier]);
    r[tier] -= take;
    left -= take;
  }
  return units - left;
}

/** Aufmerksamkeit aus Marke (ANNAHME): 0,5 + Bekanntheit, höchstens 1,5; ohne Marke 0,5. */
export function attention(state: GameState, data: GameData, brandId: number | null): Bp {
  const b = brandById(state, brandId);
  return clamp(P(data).attentionBaseBp + (b?.awarenessBp ?? 0), 0, P(data).attentionMaxBp);
}

function sourceProjects(state: GameState, ids: readonly number[]): Project[] {
  return ids.map((id) => state.projects.find((p) => p.id === id)).filter((p): p is Project => p !== undefined && p.sales !== null);
}

/** MKT-V20, MKT-VT05: Potenzial der Quellen in den Stufen der Form (Sammlung · 0,6, Klassiker mit Nostalgie-Bonus). */
export function reissuePotential(state: GameState, data: GameData, kind: ReissueKind, ids: readonly number[]): number {
  const f = P(data).forms[kind];
  let sum = 0;
  for (const p of sourceProjects(state, ids)) {
    const r = p.sales!.remaining;
    if (r) for (const tier of f.tiers) sum += r[tier];
  }
  if (f.bundleFactorBp !== undefined) sum = mulBp(sum, f.bundleFactorBp);
  if (f.nostalgiaBp !== undefined) sum = mulBp(sum, f.nostalgiaBp);
  return sum;
}

/** V_Neuauflage = Σ R_s · i · Aufmerksamkeit (Formel Abschnitt 13.3). */
export function reissueUnits(state: GameState, data: GameData, kind: ReissueKind, ids: readonly number[]): number {
  const first = sourceProjects(state, ids)[0];
  return mulBp(mulBp(reissuePotential(state, data, kind, ids), P(data).forms[kind].impulseBp), attention(state, data, first?.brandId ?? null));
}

function reissuePrice(state: GameState, data: GameData, kind: ReissueKind, p: Project): Cent {
  return mulBp(grossPrice(data, p, yearOf(state)), P(data).forms[kind].priceBp);
}

/** Erlös je Stück einer Verwertung: physisch 60 % abzüglich Datenträger, digital 70 % (ANNAHME wie Distributor und Store). */
function reissueNet(state: GameState, data: GameData, r: Reissue): Cent {
  const year = yearOf(state);
  const d = digitalShare(data, r.platforms, year);
  const unit = mediumOf(data, platformById(data, r.platforms[0]!), year).unitCostCent;
  const physical = Math.max(0, mulBp(r.priceCent, data.distribution.channels.find((c) => c.id === "distributor")!.shareBp) - unit);
  const digital = mulBp(r.priceCent, BP_ONE - data.sales.storeShareBp);
  return mulBp(physical, BP_ONE - d) + mulBp(digital, d);
}

function addons(state: GameState, id: number): number {
  return state.projects.filter((p) => p.type === "addon" && p.sourceId === id && p.status === "veroeffentlicht").length;
}

function offered(s: ProductSales, key: string): boolean {
  return (s.reissuesOffered ?? []).includes(key);
}

function markOffered(state: GameState, ids: readonly number[], key: string): void {
  for (const p of sourceProjects(state, ids)) p.sales!.reissuesOffered = [...(p.sales!.reissuesOffered ?? []), key];
}

function released(state: GameState): Project[] {
  return state.projects.filter((p) => p.status === "veroeffentlicht" && p.sales && p.result && p.type !== "addon").sort((a, b) => a.id - b.id);
}

/** MKT-V17: Complete Edition ab Wertung 8 (oder Branchenpreis), zwei DLC, frühestens 9 Monate nach Release. */
export function completeEligible(state: GameState, data: GameData, p: Project): boolean {
  const f = P(data).forms.complete;
  const s = p.sales!;
  const good = p.result!.scoreBp >= f.minScoreBp! || (p.result!.awards?.length ?? 0) > 0;
  return state.week - s.startWeek >= f.minWeeks! && good && addons(state, p.id) >= f.minAddons!;
}

/**
 * MKT-V19: Budget-Neuauflage nach einem Jahr, wenn die Woche unter 10 % der Startwoche liegt (ANNAHME); auf Konsolen
 * erst ab 250.000 verkauften Stück (Herstellerprogramm, ANNAHME).
 */
export function budgetEligible(state: GameState, data: GameData, p: Project): boolean {
  const f = P(data).forms.budget;
  const s = p.sales!;
  if (state.week - s.startWeek < f.minWeeks!) return false;
  const last = s.weekly.length > 0 ? s.weekly[s.weekly.length - 1]! : 0;
  if (!s.ended && last > mulBp(s.firstWeekUnits, f.tailShareBp!)) return false;
  const consoleOnly = p.platforms.every((id) => ["konsole", "handheld"].includes(platformById(data, id).type));
  return !consoleOnly || s.sold >= f.consoleMinSold!;
}

/** MKT-V21: Klassiker ab 10 Jahren, wenn eine neuere Plattform derselben Familie läuft (ANNAHME). */
function classicPlatform(state: GameState, data: GameData, p: Project): string | null {
  const year = yearOf(state);
  const type = platformById(data, p.platforms[0]!).type;
  const relYear = p.result!.year;
  const cands = data.platforms.filter((x) => x.type === type && x.releaseYear > relYear && x.releaseYear <= year && x.endYear >= year);
  return [...cands].sort((a, b) => b.releaseYear - a.releaseYear || a.id.localeCompare(b.id))[0]?.id ?? null;
}

function propose(state: GameState, data: GameData, kind: ReissueKind, ids: number[], platforms?: string[]): void {
  const units = reissueUnits(state, data, kind, ids);
  markOffered(state, ids, kind);
  if (units < P(data).minPotential) return;
  const first = sourceProjects(state, ids)[0]!;
  const priceCent = reissuePrice(state, data, kind, first);
  // MKT-V23: Festbetrag eines Budget-Publishers = 50 % des erwarteten Erlöses (ANNAHME).
  const fake: Reissue = { id: 0, kind, sourceIds: ids, startWeek: state.week, priceCent, platforms: platforms ?? first.platforms, units, left: units, sold: 0, revenueCent: 0, licensed: false, ended: false };
  const licenseFeeCent = kind === "budget" ? mulBp(units * reissueNet(state, data, fake), P(data).budgetLicense.fixedShareBp) : 0;
  const options = kind === "budget" ? ["annehmen", "lizenz", "ablehnen"] : ["annehmen", "ablehnen"];
  addEvent(state, data, {
    kind: "verwertung", scope: "projekt", projectId: first.id, options, defaultOption: "ablehnen",
    reissue: { kind, sourceIds: ids, units, priceCent, licenseFeeCent },
    // MKT-V21: Der Klassiker erscheint auf der neuen Plattform.
    ...(platforms ? { platformDeal: { platform: platforms[0]!, maker: "", payCent: 0, projectId: first.id } } : {}),
  });
}

/** MKT-V24: Vorschläge monatlich (Klasse Ergebnis), je Titel und Form einmal. */
export function exploitationStep(state: GameState, data: GameData): void {
  if (!isFirstWeekOfMonth(state.startYear, state.week)) return;
  if (state.events.some((e) => e.kind === "verwertung")) return;
  const f = P(data).forms;
  const list = released(state).filter((p) => p.sales!.remaining);
  for (const p of list) {
    const s = p.sales!;
    if (!offered(s, "complete") && completeEligible(state, data, p)) return propose(state, data, "complete", [p.id]);
    if (!offered(s, "budget") && budgetEligible(state, data, p)) return propose(state, data, "budget", [p.id]);
    if (!offered(s, "klassiker") && state.week - s.startWeek >= f.klassiker.minAgeWeeks!) {
      const platform = classicPlatform(state, data, p);
      if (platform !== null) return propose(state, data, "klassiker", [p.id], [platform]);
    }
  }
  // MKT-V20: Sammlung aus mindestens drei Titeln einer Marke, alle ab 2 Jahren, noch in keiner Sammlung.
  const byBrand = new Map<number, Project[]>();
  for (const p of list) {
    if (p.brandId === null || offered(p.sales!, "sammlung") || state.week - p.sales!.startWeek < f.sammlung.minAgeWeeks!) continue;
    byBrand.set(p.brandId, [...(byBrand.get(p.brandId) ?? []), p]);
  }
  for (const id of [...byBrand.keys()].sort((a, b) => a - b)) {
    const titles = byBrand.get(id)!;
    if (titles.length >= f.sammlung.minTitles!) return propose(state, data, "sammlung", titles.map((p) => p.id));
  }
}

/** Entscheidung „Verwertung“: selbst verwerten, an einen Budget-Publisher lizenzieren (MKT-V23) oder ablehnen. */
export function applyReissueDecision(state: GameState, data: GameData, event: GameEvent, option: string): void {
  const d = event.reissue;
  if (!d || option === "ablehnen") return;
  const sources = sourceProjects(state, d.sourceIds);
  if (sources.length === 0) return;
  const f = P(data).forms[d.kind];
  // Das Potenzial wird neu gerechnet (die Originale haben inzwischen weiter verkauft); R_s ← R_s − V_s.
  const units = reissueUnits(state, data, d.kind, d.sourceIds);
  let left = units;
  for (const p of sources) left -= consume(p.sales!.remaining!, left, f.tiers);
  const licensed = option === "lizenz";
  const r: Reissue = {
    id: state.nextReissueId, kind: d.kind, sourceIds: [...d.sourceIds], startWeek: state.week, priceCent: d.priceCent,
    platforms: event.platformDeal ? [event.platformDeal.platform] : [...sources[0]!.platforms], units, left: units, sold: 0, revenueCent: 0,
    licensed, ended: false,
  };
  state.nextReissueId += 1;
  state.reissues.push(r);
  const first = sources[0]!;
  if (licensed) {
    // MKT-V23: Festbetrag sofort; der Spieler verliert die Preishoheit über das Original.
    state.moneyCent += d.licenseFeeCent;
    ledgerNow(state).income.sales += d.licenseFeeCent;
    first.sales!.priceLocked = true;
  }
  const brand = brandById(state, first.brandId);
  if (d.kind === "complete" && brand && state.week - first.sales!.startWeek < f.earlyWeeks!) {
    // MKT-V18: zu früh: Fans warten künftig auf die Complete Edition.
    brand.waitMalusBp = f.earlyMalusBp!;
  }
  // MKT-V20: Eine Sammlung ermüdet die Marke wie ein halber neuer Titel.
  if (d.kind === "sammlung" && brand) brand.fatigueBp = Math.min(BP_ONE, brand.fatigueBp + mulBp(data.brands.fatiguePerTitleBp, 5000));
  // MKT-V19: Mehr als ein Drittel der eigenen Titel in Budget-Reihen kostet Ruf.
  if (d.kind === "budget" && !licensed) {
    const budget = new Set(state.reissues.filter((x) => x.kind === "budget" && !x.licensed).flatMap((x) => x.sourceIds)).size;
    if (mulDiv(budget, BP_ONE, Math.max(1, released(state).length), 1) > f.maxShareBp!) {
      state.studioReputationBp = Math.max(0, state.studioReputationBp - f.reputationPenaltyBp!);
    }
  }
  log(state, `log.reissue.${d.kind}`, { project: first.title, units, licensed: licensed ? 1 : 0 });
}

/** Tick-Schritt 7 nach den Verkäufen: Verwertungen verkaufen je Woche 8 % ihres Rests (ANNAHME); Rückläufer zuerst. */
export function reissueStep(state: GameState, data: GameData): void {
  for (const r of state.reissues) {
    if (r.ended) continue;
    const units = Math.min(r.left, Math.max(1, mulBp(r.left, P(data).weeklyShareBp)));
    r.left -= units;
    r.sold += units;
    // MKT-V04: zurückgekommene Ware der Originale wird zuerst verkauft (ohne neue Fertigung).
    let fromStock = 0;
    for (const p of sourceProjects(state, r.sourceIds)) {
      const take = Math.min(units - fromStock, p.sales!.returned ?? 0);
      if (take > 0) p.sales!.returned = (p.sales!.returned ?? 0) - take;
      fromStock += take;
    }
    const unit = mediumOf(data, platformById(data, r.platforms[0]!), yearOf(state)).unitCostCent;
    let revenue = units * reissueNet(state, data, r) + fromStock * mulBp(unit, BP_ONE - digitalShare(data, r.platforms, yearOf(state)));
    // MKT-V23: Lizenziert bekommt der Spieler nur seinen Anteil.
    if (r.licensed) revenue = mulBp(revenue, P(data).budgetLicense.royaltyBp);
    r.revenueCent += revenue;
    state.moneyCent += revenue;
    ledgerNow(state).income.sales += revenue;
    if (r.left <= 0) r.ended = true;
  }
}

/** MKT-R52: Festbetrag = erwartete Verkäufe · 30 % · Preis. */
export function subscriptionFee(data: GameData, units: number, priceCent: Cent): Cent {
  return mulBp(units * priceCent, P(data).subscription.feeShareBp);
}

function offerSubscription(state: GameState, data: GameData, p: Project, units: number): void {
  const price = p.sales!.priceCent ?? grossPrice(data, p, yearOf(state));
  addEvent(state, data, {
    kind: "aboDeal", scope: "projekt", projectId: p.id, options: ["annehmen", "ablehnen"], defaultOption: "ablehnen",
    subscription: { feeCent: subscriptionFee(data, units, price), units },
  });
}

/** MKT-R51: Ab 2017 Angebote zum Release (Chance je Release) und einmal im Jahr für einen Katalogtitel (ANNAHME). */
export function subscriptionOnRelease(state: GameState, data: GameData, p: Project): void {
  const a = P(data).subscription;
  if (yearOf(state) < a.fromYear || !p.sales?.expectedUnits) return;
  if (stream(state, "vertrieb").uniformBp() >= a.releaseChanceBp) return;
  offerSubscription(state, data, p, p.sales.expectedUnits);
}

export function subscriptionStep(state: GameState, data: GameData): void {
  const a = P(data).subscription;
  if (!isFirstWeekOfYear(state.week) || yearOf(state) < a.fromYear) return;
  const rng = stream(state, "vertrieb");
  const roll = rng.uniformBp();
  const cands = released(state).filter((p) => !p.sales!.ended && p.sales!.subscriptionUntil === undefined && p.sales!.remaining && state.week - p.sales!.startWeek >= a.catalogMinAgeWeeks);
  if (cands.length === 0 || roll >= a.catalogChancePerYearBp) return;
  const p = cands[rng.range(0, cands.length - 1)]!;
  offerSubscription(state, data, p, p.sales!.remaining!.voll);
}

/** MKT-R52 bis MKT-R54: Festbetrag sofort, 12 Monate −40 % Vollpreis-Verkäufe, Fans +5 % der erwarteten Verkäufe. */
export function applySubscription(state: GameState, data: GameData, event: GameEvent, project: Project | undefined): void {
  const d = event.subscription;
  if (!d || !project?.sales) return;
  const a = P(data).subscription;
  state.moneyCent += d.feeCent;
  ledgerNow(state).income.sales += d.feeCent;
  project.sales.subscriptionUntil = state.week + a.weeks;
  const brand = brandById(state, project.brandId);
  if (brand) brand.fans[project.genre] = (brand.fans[project.genre] ?? 0) + mulBp(d.units, a.fansShareBp);
  log(state, "log.subscription", { project: project.title, pay: d.feeCent });
}

/** MKT-R53: Faktor auf die Vollpreis-Verkäufe während des Deals. */
export function subscriptionFactor(data: GameData, s: ProductSales, week: number): Bp {
  return s.subscriptionUntil !== undefined && week < s.subscriptionUntil ? BP_ONE - P(data).subscription.displaceBp : BP_ONE;
}
