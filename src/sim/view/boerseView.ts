// Anzeigemodell der Börse (S07 FRM-R51 bis FRM-R54, FRM-R74, FRM-R75; Etappe 6b.2).
import { buybackCost, defendCost } from "../systems/feindlich";
import { type Bp, BP_ONE, type Cent, divInt, mulBp, mulDiv } from "../num";
import type { DividendLevel, GameData, GameState } from "../model/types";
import { dateOf } from "../calendar";
import { ipoBlockers, ipoMinRevenue, ipoProceeds, sharePrice } from "../systems/boerse";
import { type FirmValue, playerValue } from "../systems/firmenwert";

export interface StockView {
  /** Erst ab dem Jahr des Börsengangs sichtbar. */
  visible: boolean;
  listed: boolean;
  blockers: string[];
  minRevenueCent: Cent;
  /** Vorschau des Erlöses je wählbarem Anteil (20, 30, 40, 49 %). */
  proceeds: { shareBp: Bp; cent: Cent }[];
  value: FirmValue;
  sentiment: number;
  mood: "unruhig" | "ruhig" | "begeistert";
  targetCent: Cent;
  priceCent: Cent;
  ownShareBp: Bp;
  dividend: DividendLevel;
  canRaise: boolean;
  savings: boolean;
  history: { label: string; sentiment: number; priceCent: Cent; profitCent: Cent; revenueCent: Cent | null }[];
  /** Prüfung Fable 03.11.2026: Zielmarke misst Umsatz oder Gewinn. */
  basis: "umsatz" | "gewinn";
  /** S13 AUS-R83, AUS-R90, AUS-R91: Schutz, Rückkauf (Kosten je Stufe), laufendes Angebot mit Abwehrkosten. */
  protection: boolean;
  majorityBp: Bp;
  buyback: { shareBp: Bp; costCent: Cent }[];
  hostile: { raider: string; priceCent: Cent; weeksLeft: number; defendCent: Cent } | null;
}

export function stockView(state: GameState, data: GameData): StockView {
  const st = state.stock;
  const s = data.stock;
  const year = dateOf(state.startYear, state.week).year;
  const value = playerValue(state, data);
  const blockers = ipoBlockers(state, data);
  return {
    visible: st.listed || year >= s.ipo.fromYear,
    listed: st.listed,
    blockers,
    minRevenueCent: ipoMinRevenue(state, data),
    proceeds: st.listed ? [] : [2000, 3000, 4000, 4900].map((bp) => ({ shareBp: bp, cent: ipoProceeds(state, data, bp) })),
    value,
    sentiment: st.sentiment,
    mood: st.sentiment < s.assembly.below ? "unruhig" : st.sentiment >= s.excitedFrom ? "begeistert" : "ruhig",
    targetCent: st.targetCent,
    basis: s.target.basis,
    priceCent: st.listed ? sharePrice(state, data, value.totalCent) : 0,
    ownShareBp: st.shares === 0 ? BP_ONE : BP_ONE - mulDiv(st.publicShares, BP_ONE, st.shares, 1),
    dividend: st.dividend,
    canRaise: st.listed && st.sentiment >= s.raise.minSentiment && st.lastRaiseYear !== year,
    savings: state.week < st.savingsUntilWeek,
    protection: st.protection,
    majorityBp: s.hostile.majorityBp,
    buyback: st.listed ? [100, 500, 1000].map((bp) => ({ shareBp: bp, costCent: buybackCost(state, data, Math.min(st.publicShares, mulBp(st.shares, bp))) })) : [],
    hostile: st.hostile ? { raider: st.hostile.raider, priceCent: st.hostile.priceCent, weeksLeft: st.hostile.untilWeek - state.week, defendCent: defendCost(state, data) } : null,
    history: st.history.map((h) => {
      const d = dateOf(state.startYear, h.quarter * 13);
      return { label: `Q${divInt(d.month, 3, 1) + 1} ${d.year}`, sentiment: h.sentiment, priceCent: h.priceCent, profitCent: h.profitCent, revenueCent: h.revenueCent ?? null };
    }),
  };
}
