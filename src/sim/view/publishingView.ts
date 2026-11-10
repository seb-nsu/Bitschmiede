// Anzeigemodell des eigenen Publishings (S13 AUS-R40 bis AUS-R43).
import type { Bp, Cent } from "../num";
import type { GameData, GameState, PublishingPackage } from "../model/types";
import { PACKAGES, publishingOpen, publishingSlots } from "../systems/publishing";
import { mulBp } from "../num";

export interface PublishingView {
  visible: boolean;
  slots: number;
  used: number;
  pitches: {
    id: number; studio: string; genre: string; scope: string; mode: "konzept" | "slice"; shownScoreBp: Bp; noiseBp: Bp; budgetCent: Cent; weeksLeft: number;
    packages: { id: PublishingPackage; advanceCent: Cent; studioShareBp: Bp; acceptBp: Bp }[];
  }[];
  deals: {
    id: number; studio: string; genre: string; scope: string; package: PublishingPackage; status: string; advanceCent: Cent; paidCent: Cent;
    studioShareBp: Bp; incomeCent: Cent; decision: boolean; scoreBp: Bp | null;
  }[];
}

export function publishingView(state: GameState, data: GameData): PublishingView {
  const own = data.publishers.own;
  const visible = publishingOpen(state, data) || state.publishing.deals.length > 0;
  const studioName = (id: number) => state.ai.studios.find((s) => s.id === id)?.name ?? "";
  return {
    visible,
    slots: publishingSlots(state, data),
    used: state.publishing.deals.filter((d) => d.status === "laeuft").length,
    pitches: state.publishing.pitches.map((p) => ({
      id: p.id, studio: studioName(p.studioId), genre: p.genre, scope: p.scope, mode: p.mode, shownScoreBp: p.shownScoreBp, noiseBp: p.noiseBp,
      budgetCent: p.budgetCent, weeksLeft: p.expiresWeek - state.week,
      packages: PACKAGES.map((id) => ({ id, advanceCent: mulBp(p.budgetCent, own.packages[id].advanceBp), studioShareBp: own.packages[id].studioShareBp, acceptBp: own.packages[id].acceptBp })),
    })),
    deals: [...state.publishing.deals].reverse().slice(0, 12).map((d) => ({
      id: d.id, studio: d.studioName, genre: d.genre, scope: d.scope, package: d.package, status: d.status, advanceCent: d.advanceCent,
      paidCent: d.rates.filter((r) => r.paid).reduce((a, r) => a + r.amountCent, 0), studioShareBp: d.studioShareBp, incomeCent: d.incomeCent,
      decision: d.decision !== null, scoreBp: state.ai.products.find((x) => x.id === d.productId)?.scoreBp ?? null,
    })),
  };
}
