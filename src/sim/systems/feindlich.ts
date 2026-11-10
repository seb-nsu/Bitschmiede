// S13 3.8 und 3.9 (Ausbaustufe 1.4; Prüfung Fable 03.11.2026: „vereinfachen“): nur feindliche Übernahmen gegen den Spieler
// (AUS-R83, AUS-R91), Übernahmeschutz und Aktienrückkauf (AUS-R90). Aktivisten, Delisting, Fusion und Co. entfallen.
// ANNAHMEN (OFFENE-FRAGEN): (1) Mitarbeiter-Aktienprogramm: Jedes Jahr gehen dilutionPerYearBp aller Aktien an den Markt,
// damit der eigene Anteil ohne Rückkauf unter 50 % sinkt (sonst wäre AUS-R91 nie erreichbar, die Kapitalerhöhung ist aus
// der Oberfläche genommen). (2) Bieter ist das reichste KI-Studio, das sich den Streubesitz mit Aufschlag leisten kann,
// sonst ein Finanzinvestor. (3) Ohne Rückkauf bis zur Frist entscheiden die Aktionäre nach der Stimmung; nehmen sie an,
// endet das Spiel mit der Übernahme (Vermächtnis-Wertung wie beim Endjahr).
import { type Bp, BP_ONE, type Cent, clamp, divBp, mulBp } from "../num";
import type { GameData, GameState, HostileParams } from "../model/types";
import { isFirstWeekOfQuarter, isFirstWeekOfYear } from "../calendar";
import { stream } from "../rng";
import { ledgerNow } from "./finanzen";
import { log } from "./firma";
import { chronicle } from "./katalog";
import { liveStudios } from "./ki/studios";

const PLAYER = 0;

function H(data: GameData): HostileParams {
  return data.stock.hostile;
}

/** Eigener Anteil an allen Aktien. */
export function ownShareBp(state: GameState): Bp {
  const st = state.stock;
  return st.shares <= 0 ? BP_ONE : BP_ONE - divBp(st.publicShares, st.shares, 1);
}

/** Aktien, die der Spieler zurückkaufen muss, um wieder die Mehrheit (über 50 %) zu halten. */
export function sharesForMajority(state: GameState, data: GameData): number {
  const st = state.stock;
  return Math.max(0, st.publicShares - mulBp(st.shares, H(data).majorityBp) + 1);
}

function bidPrice(state: GameState, data: GameData): Cent {
  return mulBp(state.stock.priceCent, H(data).premiumBp);
}

// ---------- Rückkauf (AUS-R90) ----------

export function buybackCost(state: GameState, data: GameData, shares: number, priceCent: Cent = mulBp(state.stock.priceCent, H(data).buybackPremiumBp)): Cent {
  return shares * priceCent;
}

export function validateBuyback(state: GameState, data: GameData, shareBp: Bp): string | null {
  const st = state.stock;
  if (!st.listed) return "error.notListed";
  if (!Number.isSafeInteger(shareBp) || shareBp <= 0 || shareBp > H(data).buybackMaxBp) return "error.amount";
  const shares = Math.min(st.publicShares, mulBp(st.shares, shareBp));
  if (shares <= 0) return "error.amount";
  return state.moneyCent >= buybackCost(state, data, shares) ? null : "error.noMoney";
}

/** AUS-R90: eigene Aktien vom Markt kaufen (Aufschlag auf den Kurs); einmal je Quartal hebt das die Stimmung. */
export function buyback(state: GameState, data: GameData, shareBp: Bp, priceCent?: Cent): void {
  const st = state.stock;
  const shares = Math.min(st.publicShares, mulBp(st.shares, shareBp));
  const cost = buybackCost(state, data, shares, priceCent);
  state.moneyCent -= cost;
  ledgerNow(state).costs.other += cost;
  st.publicShares -= shares;
  if (state.week - st.lastBuybackWeek >= 13) st.sentiment = clamp(st.sentiment + H(data).buybackSentiment, 0, 100);
  st.lastBuybackWeek = state.week;
  log(state, "log.buyback", { share: shareBp, cost });
}

// ---------- Übernahmeschutz (AUS-R90) ----------

export function setProtection(state: GameState, active: boolean): void {
  state.stock.protection = active;
}

// ---------- Feindliche Übernahme (AUS-R83, AUS-R91) ----------

function raider(state: GameState, data: GameData, cost: Cent): { id: number | null; name: string } {
  const rich = liveStudios(state).filter((s) => s.parent?.ownerId !== PLAYER && s.cashCent >= cost).sort((a, b) => b.cashCent - a.cashCent || a.id - b.id)[0];
  return rich ? { id: rich.id, name: rich.name } : { id: null, name: "" };
}

/** Rückkauf gegen das Angebot: so viele Aktien zum Bieterpreis, dass der Spieler wieder die Mehrheit hält. */
export function defendCost(state: GameState, data: GameData): Cent {
  const h = state.stock.hostile;
  return h ? sharesForMajority(state, data) * h.priceCent : 0;
}

export function validateDefend(state: GameState, data: GameData): string | null {
  if (!state.stock.hostile) return "error.locked";
  return state.moneyCent >= defendCost(state, data) ? null : "error.noMoney";
}

export function defend(state: GameState, data: GameData): void {
  const h = state.stock.hostile!;
  const st = state.stock;
  const shares = sharesForMajority(state, data);
  const cost = shares * h.priceCent;
  state.moneyCent -= cost;
  ledgerNow(state).costs.other += cost;
  st.publicShares -= shares;
  st.hostile = null;
  st.hostileCooldownUntil = state.week + H(data).cooldownWeeks;
  log(state, "log.hostileDefended", { raider: h.raider, cost });
  chronicle(state, "log.hostileDefended", { raider: h.raider, cost });
}

/** Tick nach dem Börsenquartal: Verwässerung (jährlich), Angebot (quartalsweise), Entscheidung der Aktionäre (Frist). */
export function hostileStep(state: GameState, data: GameData): void {
  const st = state.stock;
  if (!st.listed) return;
  const h = H(data);
  // ANNAHME (1): Mitarbeiter-Aktienprogramm.
  if (isFirstWeekOfYear(state.week) && st.ipoWeek !== null && state.week > st.ipoWeek) {
    const fresh = mulBp(st.shares, h.dilutionPerYearBp);
    st.shares += fresh;
    st.publicShares += fresh;
  }
  if (st.protection && isFirstWeekOfQuarter(state.week)) st.sentiment = clamp(st.sentiment + h.protectionSentiment, 0, 100);
  if (st.hostile) {
    if (state.week < st.hostile.untilWeek) return;
    const accept = clamp(h.acceptBaseBp + (h.acceptCenter - st.sentiment) * h.acceptPerPointBp, 0, BP_ONE);
    const raiderName = st.hostile.raider;
    if (ownShareBp(state) <= h.majorityBp && stream(state, "acquisitions").uniformBp() < accept) {
      st.hostile = null;
      state.gameOver = { week: state.week, reason: "uebernahme" };
      log(state, "log.hostileWon", { raider: raiderName });
      chronicle(state, "log.hostileWon", { raider: raiderName });
      return;
    }
    st.hostile = null;
    st.hostileCooldownUntil = state.week + h.cooldownWeeks;
    log(state, "log.hostileFailed", { raider: raiderName });
    return;
  }
  if (!isFirstWeekOfQuarter(state.week) || st.protection || state.week < st.hostileCooldownUntil || ownShareBp(state) > h.majorityBp) return;
  if (stream(state, "acquisitions").uniformBp() >= h.chanceBp) return;
  const price = bidPrice(state, data);
  const r = raider(state, data, st.publicShares * price);
  st.hostile = { raiderId: r.id, raider: r.name, priceCent: price, untilWeek: state.week + h.decisionWeeks };
  log(state, "log.hostileBid", { raider: r.name, price });
  chronicle(state, "log.hostileBid", { raider: r.name, price });
}
