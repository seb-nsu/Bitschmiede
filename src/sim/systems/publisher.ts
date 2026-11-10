// Publisher-Verträge (S07 FRM-R42 bis FRM-R47, Tabelle 5.8; Etappe 6a.4 und 6a.5): KI-Publisher, Pitch, Angebote mit
// Spielraum und Geduld, Verhandlung, Raten je Meilenstein, Split vor und nach Recoup, IP, Sequel-Option, Abbruch.
import { type Bp, BP_ONE, type Cent, clamp, divInt, mulBp, mulDiv } from "../num";
import type {
  GameData, GameState, NumericTerm, PitchInput, Project, Publisher, PublisherDeal, PublisherOffer, PublisherOfferInput,
  PublisherPersonality, PublisherTerms,
} from "../model/types";
import { dateOf, isFirstWeekOfYear } from "../calendar";
import { stream } from "../rng";
import { anchorValue, ledgerNow, scaleToYear } from "./finanzen";
import { log } from "./firma";
import { chronicle, isUnlocked } from "./katalog";
import { addEvent } from "./ereignisse";
import { progressShare } from "./produkte/projects";
import { brandById, brandStrength } from "./marken";
import { forecast, runPlaytest, validatePlaytest } from "./produkte/forecast";
import { assignedTo } from "./firma";
import { marketPhase } from "./marktphasen";

const P = (data: GameData) => data.publishers;
const PERSONALITIES: PublisherPersonality[] = ["ausgewogen", "grosszuegig", "markenfreundlich"];
const NUMERIC: NumericTerm[] = ["advanceBp", "splitBeforeBp", "splitAfterBp", "markupBp", "termYears"];
/** Richtung zugunsten des Studios: mehr Vorschuss und Anteil, weniger Aufschlag und kürzere Laufzeit. */
const FAVOUR: Record<NumericTerm, 1 | -1> = { advanceBp: 1, splitBeforeBp: 1, splitAfterBp: 1, markupBp: -1, termYears: -1 };

function year(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

export function publisherById(state: GameState, id: number | null | undefined): Publisher | undefined {
  return id == null ? undefined : state.publishers.find((p) => p.id === id);
}

// ---------- Publisher im Markt (Tabelle 5.8) ----------

function targetCount(data: GameData, y: number): number {
  return P(data).countByYear.filter(([from]) => from <= y).reduce((n, [, c]) => c, P(data).countByYear[0]![1]);
}

function createPublisher(state: GameState, data: GameData): void {
  const p = P(data);
  const rng = stream(state, "publisher");
  const used = new Set(state.publishers.map((x) => x.name));
  let name = "";
  for (let i = 0; i < 20 && (name === "" || used.has(name)); i++) name = `${p.names.first[rng.int(p.names.first.length)]!}${p.names.suffix[rng.int(p.names.suffix.length)]!}`;
  const factor = rng.range(p.capitalFactorBp[0], p.capitalFactorBp[1]);
  state.publishers.push({
    id: state.nextPublisherId,
    name,
    capitalCent: mulBp(scaleToYear(data, p.startCapitalCent, year(state)), factor),
    reputationBp: rng.range(p.reputationBp[0], p.reputationBp[1]),
    personality: PERSONALITIES[rng.int(PERSONALITIES.length)]!,
    foundedWeek: state.week,
  });
  state.nextPublisherId += 1;
}

/** Tabelle 5.8: 3 / 5 / 7 / 8 Publisher je Epoche; ihr Kapital folgt dem Lohnniveau. Abgelaufene Angebote verfallen. */
export function publisherStep(state: GameState, data: GameData): void {
  const y = year(state);
  if (state.week === 0 || isFirstWeekOfYear(state.week)) {
    if (state.week > 0) {
      const a = data.economy.salaryAnchorsCent;
      for (const pub of state.publishers) pub.capitalCent = mulDiv(pub.capitalCent, anchorValue(a, y), anchorValue(a, y - 1), 1);
    }
    while (state.publishers.length < targetCount(data, y)) createPublisher(state, data);
  }
  for (const o of state.publisherOffers.filter((x) => x.expiresWeek <= state.week)) {
    log(state, "log.publisherOfferExpired", { publisher: publisherById(state, o.publisherId)?.name ?? "?", project: projectTitle(state, o.projectId) });
  }
  state.publisherOffers = state.publisherOffers.filter((o) => o.expiresWeek > state.week);
}

function projectTitle(state: GameState, id: number): string {
  return state.projects.find((p) => p.id === id)?.title ?? "?";
}

// ---------- Pitch (FRM-R42) ----------

/** Erwartete Gesamtkosten: bisher + Restaufwand mit dem heutigen Team (mindestens eine Person). */
export function projectBudget(state: GameState, data: GameData, project: Project): Cent {
  const team = assignedTo(state, project.id);
  const cap = Math.max(1, team.length) * data.start.workPerPersonWeekBp;
  const rest = Math.max(0, project.effortTotalBp - project.effortDoneBp);
  const weeks = divInt(rest + cap - 1, cap, 1);
  const weekly = team.length > 0 ? divInt(team.reduce((s, p) => s + p.salaryCent, 0) * 12, 52, 1)
    : divInt(anchorValue(data.economy.salaryAnchorsCent, year(state)) * 12, 52, 1);
  return project.costCent + weeks * weekly;
}

function phaseIndex(data: GameData, project: Project, phase: string): number {
  return data.projects.phases[project.scope].findIndex((p) => p.id === phase);
}

export function validatePitch(state: GameState, data: GameData, input: PitchInput): string | null {
  const project = state.projects.find((p) => p.id === input.projectId);
  if (!project || project.status !== "laeuft") return "error.unknownProject";
  if (!isUnlocked(state, "publisher")) return "error.locked";
  if (project.publisherDeal) return "error.publisherDeal";
  if ((project.pitched ?? []).includes(input.mode)) return "error.alreadyPitched";
  if (state.publisherOffers.some((o) => o.projectId === project.id)) return "error.offersOpen";
  if (input.mode === "slice" && phaseIndex(data, project, project.phase) < Math.max(0, phaseIndex(data, project, P(data).sliceFromPhase))) {
    return "error.noSlice";
  }
  return null;
}

/** FRM-R42: Interesse = Prognose × Markenfaktor × Ruf-Faktor (× Vertical Slice; in der Krise neue Marken schwächer, MRK-R60). */
export function pitchInterest(state: GameState, data: GameData, project: Project, mode: "konzept" | "slice"): Bp {
  const p = P(data);
  const scoreBp = divInt(forecast(state, data, project).scoreBp, 10, 1);
  const brand = brandById(state, project.brandId);
  const sequel = brand !== undefined && state.projects.some((x) => x.id !== project.id && x.brandId === brand.id && x.result);
  const strength = sequel ? brandStrength(data, brand) : 0;
  const brandF = p.brandFactor.baseBp + mulBp(p.brandFactor.perStrengthBp, strength);
  const repF = p.reputationFactor.baseBp + mulBp(p.reputationFactor.perReputationBp, state.studioReputationBp);
  let interest = mulBp(mulBp(scoreBp, brandF), repF);
  if (mode === "slice") interest = mulBp(interest, p.sliceInterestBp);
  if (!sequel && marketPhase(state) === "krise") interest = mulBp(interest, p.crisisNewIpBp);
  return interest;
}

function threshold(data: GameData, pub: Publisher): Bp {
  return P(data).interestThresholdBp + mulBp(pub.reputationBp - divInt(BP_ONE, 2, 1), P(data).thresholdPerReputationBp);
}

function startTerms(data: GameData, pub: Publisher): { terms: PublisherTerms; patience: number; ipFixed: boolean } {
  const p = P(data);
  const pers = p.personalities[pub.personality];
  const { patience: basePatience, ...base } = p.defaults;
  const { patience, ipFixed, ...over } = pers;
  return { terms: { ...base, ...over }, patience: patience ?? basePatience, ipFixed: ipFixed === true };
}

/**
 * FRM-R42, FRM-R43: Bis zu drei Publisher (Sequel-Option zuerst, dann nach Ruf) antworten. Wer das Budget tragen kann
 * (höchstens 25 % seines Kapitals) und die Schwelle erreicht, macht ein Angebot; die anderen sagen ab.
 */
export function pitchProject(state: GameState, data: GameData, input: PitchInput): void {
  const p = P(data);
  const project = state.projects.find((x) => x.id === input.projectId)!;
  project.pitched = [...(project.pitched ?? []), input.mode];
  const interest = pitchInterest(state, data, project, input.mode);
  const budget = projectBudget(state, data, project);
  const option = brandById(state, project.brandId)?.sequelOptionPublisherId ?? null;
  const order = [...state.publishers].sort((a, b) => Number(b.id === option) - Number(a.id === option) || b.reputationBp - a.reputationBp || a.id - b.id);
  const created: PublisherOffer[] = [];
  for (const pub of order.slice(0, p.maxAnswers)) {
    const fits = budget <= mulBp(pub.capitalCent, p.maxBudgetShareBp);
    // FRM-R43 Sequel-Option: Der Inhaber der Option antwortet immer mit Interesse, wenn er das Budget tragen kann.
    if (!fits || (interest < threshold(data, pub) && pub.id !== option)) {
      log(state, "log.publisherDeclined", { publisher: pub.name, project: project.title });
      continue;
    }
    const start = startTerms(data, pub);
    const offer: PublisherOffer = {
      id: state.nextPublisherId, publisherId: pub.id, projectId: project.id, mode: input.mode, budgetCent: budget, interestBp: interest,
      terms: { ...start.terms }, base: { ...start.terms }, capacityBp: 0, patience: start.patience, ipFixed: start.ipFixed,
      expiresWeek: state.week + p.offerWeeks,
    };
    state.nextPublisherId += 1;
    offer.capacityBp = capacity(data, pub, offer, 0);
    created.push(offer);
  }
  // Wer zwei Angebote hat, verhandelt besser (Design „Verhandlungsmacht“).
  for (const o of created) o.capacityBp = capacity(data, publisherById(state, o.publisherId)!, o, created.length - 1);
  state.publisherOffers.push(...created);
  log(state, "log.publisherPitched", { project: project.title, offers: created.length });
}

function capacity(data: GameData, pub: Publisher, offer: PublisherOffer, rivals: number): Bp {
  const c = P(data).concession;
  const margin = Math.max(0, offer.interestBp - threshold(data, pub));
  return clamp(c.baseBp + mulBp(margin, c.perInterestMarginBp) + rivals * c.perRivalOfferBp + (offer.mode === "slice" ? c.sliceBp : 0), 0, c.maxBp);
}

// ---------- Verhandlung (FRM-R43, FRM-R44) ----------

/** Zugeständnis eines Punktes in bp: Weg vom Startangebot zum Rand des Spielraums zugunsten des Studios (negativ = Entgegenkommen). */
export function concessionOf(data: GameData, base: PublisherTerms, terms: PublisherTerms): Bp {
  const p = P(data);
  let sum = 0;
  for (const k of NUMERIC) {
    const [lo, hi] = p.ranges[k];
    const delta = (terms[k] - base[k]) * FAVOUR[k];
    const room = FAVOUR[k] === 1 ? (delta >= 0 ? hi - base[k] : base[k] - lo) : (delta >= 0 ? base[k] - lo : hi - base[k]);
    sum += room > 0 ? mulDiv(delta, BP_ONE, room, 1) : 0;
  }
  if (base.ipPublisher && !terms.ipPublisher) sum += p.concession.ipBp;
  if (!base.ipPublisher && terms.ipPublisher) sum -= p.concession.ipBp;
  if (base.sequelOption && !terms.sequelOption) sum += p.concession.sequelBp;
  if (!base.sequelOption && terms.sequelOption) sum -= p.concession.sequelBp;
  return sum;
}

/** Sichtbarer Spielraum je Punkt: bis wohin er sich bei den übrigen Forderungen bewegen lässt. */
export function termRoom(data: GameData, offer: PublisherOffer): Record<NumericTerm, [number, number]> {
  const out = {} as Record<NumericTerm, [number, number]>;
  for (const k of NUMERIC) {
    const [lo, hi] = P(data).ranges[k];
    const others = concessionOf(data, offer.base, { ...offer.terms, [k]: offer.base[k] });
    const left = Math.max(0, offer.capacityBp - others);
    const span = FAVOUR[k] === 1 ? hi - offer.base[k] : offer.base[k] - lo;
    const reach = Math.min(span, mulDiv(span, left, BP_ONE, 1));
    out[k] = FAVOUR[k] === 1 ? [lo, offer.base[k] + reach] : [offer.base[k] - reach, hi];
  }
  return out;
}

export function validatePublisherOffer(state: GameState, data: GameData, input: PublisherOfferInput): string | null {
  const offer = state.publisherOffers.find((o) => o.id === input.offerId);
  if (!offer) return "error.unknownOffer";
  if (input.action !== "fordern") return null;
  const t = input.terms ?? {};
  for (const k of NUMERIC) {
    const v = t[k];
    if (v === undefined) continue;
    const [lo, hi] = P(data).ranges[k];
    if (!Number.isInteger(v) || v < lo || v > hi) return "error.amount";
  }
  if (offer.ipFixed && t.ipPublisher === false) return "error.ipFixed";
  return null;
}

/** FRM-R44: Liegt die Forderung im Spielraum, gilt sie; sonst sinkt die Geduld, bei 0 zieht der Publisher zurück. */
export function handlePublisherOffer(state: GameState, data: GameData, input: PublisherOfferInput): void {
  const offer = state.publisherOffers.find((o) => o.id === input.offerId)!;
  const pub = publisherById(state, offer.publisherId)!;
  const title = projectTitle(state, offer.projectId);
  if (input.action === "ablehnen") {
    state.publisherOffers = state.publisherOffers.filter((o) => o.id !== offer.id);
    log(state, "log.publisherRejected", { publisher: pub.name, project: title });
    return;
  }
  if (input.action === "annehmen") {
    signDeal(state, data, offer);
    return;
  }
  const wanted: PublisherTerms = { ...offer.terms, ...input.terms };
  if (concessionOf(data, offer.base, wanted) <= offer.capacityBp) {
    offer.terms = wanted;
    log(state, "log.publisherAgreed", { publisher: pub.name, project: title });
    return;
  }
  offer.patience -= 1;
  if (offer.patience <= 0) {
    state.publisherOffers = state.publisherOffers.filter((o) => o.id !== offer.id);
    log(state, "log.publisherWithdrew", { publisher: pub.name, project: title });
    chronicle(state, "log.publisherWithdrew", { publisher: pub.name, project: title });
    return;
  }
  log(state, "log.publisherRefused", { publisher: pub.name, project: title, patience: offer.patience });
}

// ---------- Vertrag (FRM-R45, FRM-R46) ----------

/** Wochen bis zum Ende einer Phase nach heutigem Tempo (für die Fälligkeit der Rate). */
function weeksUntil(state: GameState, data: GameData, project: Project, untilBp: Bp): number {
  const team = assignedTo(state, project.id);
  const cap = Math.max(1, team.length) * data.start.workPerPersonWeekBp;
  const target = mulBp(project.effortTotalBp, untilBp);
  return divInt(Math.max(0, target - project.effortDoneBp) + cap - 1, cap, 1);
}

function signDeal(state: GameState, data: GameData, offer: PublisherOffer): void {
  const project = state.projects.find((p) => p.id === offer.projectId)!;
  const pub = publisherById(state, offer.publisherId)!;
  const phases = data.projects.phases[project.scope];
  const from = Math.max(0, phaseIndex(data, project, project.phase));
  const ahead = phases.slice(from);
  const advance = mulBp(offer.budgetCent, offer.terms.advanceBp);
  // ANNAHME: Die erste Rate fließt bei Unterschrift, je eine weitere am Ende jeder verbleibenden Phase.
  const n = ahead.length + 1;
  const each = divInt(advance, n, 1);
  const deal: PublisherDeal = {
    publisherId: pub.id, terms: { ...offer.terms }, signedWeek: state.week, budgetCent: offer.budgetCent, advanceCent: advance, paidCent: 0,
    rates: [
      { phase: "vertrag", untilBp: 0, dueWeek: state.week, amountCent: advance - each * ahead.length, paid: false, missed: false, cutBp: 0 },
      ...ahead.map((ph) => ({
        phase: ph.id, untilBp: ph.untilBp, dueWeek: state.week + weeksUntil(state, data, project, ph.untilBp), amountCent: each, paid: false, missed: false, cutBp: 0,
      })),
    ],
    recoupedCent: 0, publisherIncomeCent: 0, misses: 0, stopped: false, endWeek: null,
  };
  project.publisherDeal = deal;
  payRate(state, project, deal, deal.rates[0]!);
  state.publisherOffers = state.publisherOffers.filter((o) => o.projectId !== project.id);
  const brand = brandById(state, project.brandId);
  // FRM-R43: IP beim Publisher; Sequel-Option für die Marke.
  if (brand && deal.terms.ipPublisher) brand.publisherId = pub.id;
  if (brand && deal.terms.sequelOption) brand.sequelOptionPublisherId = pub.id;
  log(state, "log.publisherSigned", { publisher: pub.name, project: project.title, amount: advance });
  chronicle(state, "log.publisherSigned", { publisher: pub.name, project: project.title, amount: advance });
}

function payRate(state: GameState, project: Project, deal: PublisherDeal, rate: PublisherDeal["rates"][number]): void {
  const pub = publisherById(state, deal.publisherId);
  const amount = mulBp(rate.amountCent, BP_ONE - rate.cutBp);
  rate.paid = true;
  deal.paidCent += amount;
  state.moneyCent += amount;
  if (pub) pub.capitalCent -= amount;
  const book = ledgerNow(state);
  book.income.publisher = (book.income.publisher ?? 0) + amount;
  if (rate.phase !== "vertrag") log(state, "log.publisherRate", { project: project.title, amount });
}


/**
 * FRM-R46: Raten fließen am Phasenende. Liegt ein Meilenstein mehr als 4 Wochen hinter seinem Termin, reagiert der
 * Publisher nach Persönlichkeit: beim ersten Mal Kürzen (−20 % der Rate) oder Auflagen (Pflicht-Playtest), beim zweiten
 * Mal Stopp; der ausgewogene Publisher bleibt bei Auflagen (FRM-T11: eine Reaktion bleibt nie aus).
 */
export function dealStep(state: GameState, data: GameData): void {
  const p = P(data);
  for (const project of state.projects.filter((x) => x.publisherDeal && !x.publisherDeal.stopped).sort((a, b) => a.id - b.id)) {
    const deal = project.publisherDeal!;
    const pub = publisherById(state, deal.publisherId);
    if (project.status === "veroeffentlicht" && deal.endWeek === null) deal.endWeek = state.week + deal.terms.termYears * 52;
    if (project.status === "abgebrochen") continue;
    for (const rate of deal.rates) {
      if (rate.paid) continue;
      const reached = project.status === "veroeffentlicht" || project.status === "bereit" || progressShare(project) >= rate.untilBp;
      if (reached) {
        payRate(state, project, deal, rate);
        continue;
      }
      if (rate.missed || state.week <= rate.dueWeek + p.milestones.lateWeeks) continue;
      rate.missed = true;
      deal.misses += 1;
      const stop = deal.misses >= 2 && pub?.personality !== "ausgewogen";
      if (stop) {
        deal.stopped = true;
        log(state, "log.publisherStopped", { publisher: pub?.name ?? "?", project: project.title });
        chronicle(state, "log.publisherStopped", { publisher: pub?.name ?? "?", project: project.title });
        break;
      }
      if (pub?.personality === "grosszuegig") {
        rate.cutBp = p.milestones.cutBp;
        log(state, "log.publisherCut", { publisher: pub.name, project: project.title });
      } else {
        // Auflage: Pflicht-Playtest, sobald die Phase einen erlaubt (ANNAHME: sonst nur die Mahnung).
        if (validatePlaytest(state, data, project.id) === null) runPlaytest(state, data, project);
        log(state, "log.publisherCondition", { publisher: pub?.name ?? "?", project: project.title });
      }
    }
  }
}

/**
 * FRM-R45, FRM-T10: Bis der Publisher Vorschuss plus Aufschlag aus seinem Anteil zurück hat, erhält das Studio den
 * Split vor Recoup, danach den Split nach Recoup; nach der Laufzeit alles. Liefert den Anteil des Studios.
 */
export function publisherSplit(state: GameState, project: Project, revenue: Cent): Cent {
  const deal = project.publisherDeal;
  if (!deal || revenue <= 0 || deal.paidCent === 0 || (deal.endWeek !== null && state.week >= deal.endWeek)) return revenue;
  const target = deal.paidCent + mulBp(deal.paidCent, deal.terms.markupBp);
  const remaining = Math.max(0, target - deal.recoupedCent);
  const pubBeforeShare = BP_ONE - deal.terms.splitBeforeBp;
  // Umsatz, der noch zum Satz vor Recoup läuft (aufgerundet, damit der Recoup genau erreicht wird).
  let need = remaining === 0 ? 0 : mulDiv(remaining, BP_ONE, Math.max(1, pubBeforeShare), 1);
  if (remaining > 0 && mulBp(need, pubBeforeShare) < remaining) need += 1;
  const before = Math.min(revenue, need);
  const pubBefore = Math.min(remaining, mulBp(before, pubBeforeShare));
  const pubAfter = mulBp(revenue - before, BP_ONE - deal.terms.splitAfterBp);
  deal.recoupedCent += pubBefore;
  deal.publisherIncomeCent += pubBefore + pubAfter;
  const pub = publisherById(state, deal.publisherId);
  if (pub) pub.capitalCent += pubBefore + pubAfter;
  return revenue - pubBefore - pubAfter;
}

/** FRM-R47: Abbruch eines Publisher-Projekts: Vorschuss zurückzahlen oder Projekt und Marke abgeben (Wahl des Spielers). */
export function publisherCancelled(state: GameState, data: GameData, project: Project): void {
  const deal = project.publisherDeal;
  if (!deal || deal.stopped || deal.paidCent === 0) return;
  deal.stopped = true;
  addEvent(state, data, {
    kind: "publisherAbbruch", scope: "projekt", projectId: project.id, options: ["zurueckzahlen", "abgeben"], defaultOption: "abgeben",
  });
}

export function applyPublisherCancel(state: GameState, event: { projectId: number | null }, option: string): void {
  const project = state.projects.find((p) => p.id === event.projectId);
  const deal = project?.publisherDeal;
  if (!project || !deal) return;
  const pub = publisherById(state, deal.publisherId);
  if (option === "zurueckzahlen") {
    state.moneyCent -= deal.paidCent;
    ledgerNow(state).costs.other += deal.paidCent;
    if (pub) pub.capitalCent += deal.paidCent;
    log(state, "log.publisherRepaid", { publisher: pub?.name ?? "?", project: project.title, amount: deal.paidCent });
    return;
  }
  // ANNAHME: Der Publisher übernimmt die Marke als IP-Inhaber; das abgebrochene Projekt bleibt im Archiv.
  const brand = brandById(state, project.brandId);
  if (brand) brand.publisherId = deal.publisherId;
  log(state, "log.publisherTookOver", { publisher: pub?.name ?? "?", project: project.title });
  chronicle(state, "log.publisherTookOver", { publisher: pub?.name ?? "?", project: project.title });
}
