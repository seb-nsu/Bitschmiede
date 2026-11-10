// Anzeigemodell der Publisher-Verträge (S07 FRM-R42 bis FRM-R47, S11 Verhandlungstisch; Etappe 6a.5).
import { type Bp, type Cent, mulBp } from "../num";
import type { GameData, GameState, NumericTerm, Project, PublisherPersonality, PublisherTerms } from "../model/types";
import { dateOf, type CalendarDate } from "../calendar";
import { isUnlocked } from "../systems/katalog";
import { concessionOf, publisherById, termRoom, validatePitch } from "../systems/publisher";

export interface PublisherOfferView {
  id: number;
  publisher: string;
  personality: PublisherPersonality;
  reputationBp: Bp;
  mode: "konzept" | "slice";
  budgetCent: Cent;
  advanceCent: Cent;
  terms: PublisherTerms;
  base: PublisherTerms;
  /** Sichtbarer Spielraum je Punkt bei den übrigen Forderungen (FRM-R43). */
  room: Record<NumericTerm, [number, number]>;
  ranges: Record<NumericTerm, [number, number]>;
  /** Verbleibender Zugeständnis-Rahmen in bp (0 = ausgeschöpft). */
  leftBp: Bp;
  capacityBp: Bp;
  patience: number;
  ipFixed: boolean;
  expires: CalendarDate;
}

export interface PublisherDealView {
  publisher: string;
  terms: PublisherTerms;
  advanceCent: Cent;
  paidCent: Cent;
  /** Recoup-Ziel (Vorschuss + Aufschlag) und Stand. */
  recoupTargetCent: Cent;
  recoupedCent: Cent;
  publisherIncomeCent: Cent;
  nextRate: { phase: string; amountCent: Cent; due: CalendarDate } | null;
  misses: number;
  stopped: boolean;
  ends: CalendarDate | null;
}

export interface ProjectPublisherView {
  /** Pitch-Knöpfe: null = möglich, Schlüssel = Grund. */
  pitch: { konzept: string | null; slice: string | null };
  offers: PublisherOfferView[];
  deal: PublisherDealView | null;
}

/** undefined = Publisher noch nicht freigeschaltet und kein Vertrag. */
export function projectPublisherView(state: GameState, data: GameData, p: Project): ProjectPublisherView | undefined {
  const deal = p.publisherDeal ?? null;
  if (!deal && (!isUnlocked(state, "publisher") || p.status === "veroeffentlicht" || p.status === "abgebrochen")) return undefined;
  const offers = state.publisherOffers.filter((o) => o.projectId === p.id).sort((a, b) => a.id - b.id).map((o): PublisherOfferView => {
    const pub = publisherById(state, o.publisherId);
    return {
      id: o.id, publisher: pub?.name ?? "?", personality: pub?.personality ?? "ausgewogen", reputationBp: pub?.reputationBp ?? 0,
      mode: o.mode, budgetCent: o.budgetCent, advanceCent: mulBp(o.budgetCent, o.terms.advanceBp), terms: { ...o.terms }, base: { ...o.base },
      room: termRoom(data, o), ranges: { ...data.publishers.ranges }, leftBp: Math.max(0, o.capacityBp - concessionOf(data, o.base, o.terms)),
      capacityBp: o.capacityBp, patience: o.patience, ipFixed: o.ipFixed, expires: dateOf(state.startYear, o.expiresWeek),
    };
  });
  const next = deal?.rates.find((r) => !r.paid) ?? null;
  return {
    pitch: {
      konzept: validatePitch(state, data, { type: "pitchPublisher", projectId: p.id, mode: "konzept" }),
      slice: validatePitch(state, data, { type: "pitchPublisher", projectId: p.id, mode: "slice" }),
    },
    offers,
    deal: deal ? {
      publisher: publisherById(state, deal.publisherId)?.name ?? "?", terms: { ...deal.terms }, advanceCent: deal.advanceCent, paidCent: deal.paidCent,
      recoupTargetCent: deal.paidCent + mulBp(deal.paidCent, deal.terms.markupBp), recoupedCent: deal.recoupedCent, publisherIncomeCent: deal.publisherIncomeCent,
      nextRate: next && !deal.stopped ? { phase: next.phase, amountCent: next.amountCent, due: dateOf(state.startYear, next.dueWeek) } : null,
      misses: deal.misses, stopped: deal.stopped, ends: deal.endWeek === null ? null : dateOf(state.startYear, deal.endWeek),
    } : null,
  };
}
