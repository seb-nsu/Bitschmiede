// Marken (S02 PRD-R70 bis PRD-R75, 5.5) mit den Werten für das Franchise-Cockpit.
import { type Bp, BP_ONE, type Cent, clamp, divInt, mulBp, mulDiv } from "../num";
import type { Brand, GameData, GameState, Project } from "../model/types";
import { isFirstWeekOfMonth, WEEKS_PER_YEAR } from "../calendar";
import { log } from "./firma";
import { chronicle } from "./katalog";
import { netPerUnit, productType } from "./markt";
import { ledgerNow } from "./finanzen";

export function brandById(state: GameState, id: number | null | undefined): Brand | undefined {
  return id == null ? undefined : state.brands.find((b) => b.id === id);
}

/** S02 Abschnitt 6: Ohne Angabe bekommt ein neues Spiel eine neue Marke mit seinem Titel. */
export function newBrand(state: GameState, data: GameData, name: string): Brand {
  const b: Brand = {
    id: state.nextBrandId, name: name.trim().slice(0, 60), ownerId: 0, foundedWeek: state.week,
    awarenessBp: data.brands.awarenessStartBp, reputationBp: data.brands.reputationStartBp, depthBp: 0, fatigueBp: 0, discountHabitBp: 0,
    fans: {}, titles: [], firstTitleWeek: null, lastTitleWeek: null, jubileeOffered: false,
  };
  state.nextBrandId += 1;
  state.brands.push(b);
  return b;
}

/**
 * Prüfung Fable 03.11.2026 (Design „Marken mit dem ersten Nachfolger“): Eine Marke zählt als etabliert ab einem Hit
 * (Wertung ≥ hitScoreBp) oder ab dem zweiten Titel. Jedes Spiel führt intern weiter seine Marke (Fans, Ruf), aber Cockpit
 * und Markenmarkt zeigen nur etablierte Marken. ANNAHME: Ein-Titel-Marken bleiben im Zustand, damit Nachfolger auf den
 * Fans des ersten Spiels aufbauen; sie werden nur in der Anzeige eingeklappt.
 */
export function isEstablished(state: GameState, data: GameData, b: Brand): boolean {
  if (b.titles.length >= 2) return true;
  return b.titles.some((id) => (state.projects.find((p) => p.id === id)?.result?.scoreBp ?? 0) >= data.brands.hitScoreBp);
}

/** PRD-R70: sichtbare Stärke (ANNAHME: gewichtet aus Bekanntheit, Ruf und Welttiefe). */
export function brandStrength(data: GameData, b: Brand): Bp {
  const w = data.brands.strengthWeightsBp;
  return clamp(mulBp(b.awarenessBp, w.awareness) + mulBp(b.reputationBp, w.reputation) + mulBp(b.depthBp, w.depth), 0, BP_ONE);
}

/** PRD-R70: sichtbare Frische = 100 − Müdigkeit. */
export function brandFreshness(b: Brand): Bp {
  return BP_ONE - b.fatigueBp;
}

/** S02 5.5: Übertragung gleich / nah / fern; „nah“ gilt in beide Richtungen. */
export function genreTransfer(data: GameData, from: string, to: string): Bp {
  const t = data.brands.transferBp;
  if (from === to) return t.same;
  const near = (data.brands.near[from] ?? []).includes(to) || (data.brands.near[to] ?? []).includes(from);
  return near ? t.near : t.far;
}

/** PRD-R71, S02 5.5: Startfans = Σ Fans_g · Übertragung(g → neu) · Ruf/100 · (1 − Müdigkeit/100). */
export function startFans(data: GameData, b: Brand, genre: string, fatigueBp: Bp = b.fatigueBp): number {
  let sum = 0;
  for (const g of Object.keys(b.fans).sort()) sum += mulBp(b.fans[g]!, genreTransfer(data, g, genre));
  return mulBp(mulBp(sum, b.reputationBp), BP_ONE - fatigueBp);
}

/** PRD-R73: Müdigkeit, die ein neuer Titel jetzt bringen würde (für Prognose und Cockpit). */
export function fatigueAfterTitle(data: GameData, state: GameState, b: Brand): Bp {
  const recent = b.lastTitleWeek !== null && state.week - b.lastTitleWeek < data.brands.fatigueWindowWeeks;
  return clamp(b.fatigueBp + (recent ? data.brands.fatiguePerTitleBp : 0), 0, BP_ONE);
}

/**
 * Release eines Markentitels (Standardspiel): Müdigkeit (PRD-R73), Startfans für die ersten Wochen (PRD-R71),
 * Welttiefe und Bekanntheit; ab 8,0 mehr Bekanntheit und Fans im Genre, unter 6,0 weniger Ruf (PRD-R72).
 * Port und Addon wirken über ihre Markenwirkung (PRD-R01: brandEffect).
 * Liefert die zusätzlichen Fan-Käufer je Woche und die Zahl der Wochen.
 */
export function brandRelease(state: GameState, data: GameData, project: Project, scoreBp: Bp): { perWeek: number; weeks: number } {
  const b = brandById(state, project.brandId);
  if (!b) return { perWeek: 0, weeks: 0 };
  const p = data.brands;
  const type = productType(data, project.type);
  let fans = 0;
  if (type.id === "standard") {
    b.fatigueBp = fatigueAfterTitle(data, state, b);
    fans = startFans(data, b, project.genre);
    b.titles.push(project.id);
    b.firstTitleWeek ??= state.week;
    b.lastTitleWeek = state.week;
    b.depthBp = Math.min(BP_ONE, b.depthBp + p.depthPerTitleBp);
    b.awarenessBp = Math.min(BP_ONE, b.awarenessBp + p.awarenessPerTitleBp);
    if (scoreBp >= p.hitScoreBp) {
      b.awarenessBp = Math.min(BP_ONE, b.awarenessBp + p.awarenessHitBp);
      b.reputationBp = Math.min(BP_ONE, b.reputationBp + p.reputationHitBp);
      b.fans[project.genre] = (b.fans[project.genre] ?? 0) + mulBp(b.fans[project.genre] ?? 0, p.hitFansBp);
    }
    if (scoreBp < p.flopScoreBp) b.reputationBp = Math.max(0, b.reputationBp - p.reputationFlopBp);
  } else {
    // Port und Addon: Wirkung −1…+1 auf Bekanntheit (10 Punkte je 1,0) und Müdigkeit (10 Punkte je −1,0 Frische).
    b.awarenessBp = clamp(b.awarenessBp + mulBp(1000, type.brandEffect.strength), 0, BP_ONE);
    if (type.brandEffect.freshness < 0) b.fatigueBp = clamp(b.fatigueBp + mulBp(1000, -type.brandEffect.freshness), 0, BP_ONE);
    // ANNAHME: Ports erreichen die Fans wie ein Titel, Addons verkaufen nur an Besitzer der Vorlage.
    if (type.demand === "basis") fans = startFans(data, b, project.genre);
  }
  // BTR-R14: Die Zufriedenheit mit dem letzten Titel der Marke hebt oder senkt die Startfans des nächsten.
  fans = mulBp(fans, BP_ONE + mulBp(p.satisfaction.sequelFansBp, satisfactionDelta(state, data, b, project.id)));
  const buyers = mulBp(fans, p.fanBuyRateBp);
  return { perWeek: divInt(buyers, Math.max(1, p.fanBuyWeeks), 1), weeks: buyers > 0 ? p.fanBuyWeeks : 0 };
}

/** PRD-R72 sinngemäß: Ein Teil der Käufer wird Fan der Marke im Genre des Spiels (ANNAHME, wöchentlich). */
export function brandSales(state: GameState, data: GameData, project: Project, sold: number): void {
  const b = brandById(state, project.brandId);
  if (!b || sold <= 0) return;
  b.fans[project.genre] = (b.fans[project.genre] ?? 0) + mulBp(sold, data.brands.fanShareOfBuyersBp);
}

/** PRD-R42: Ein Abbruch senkt den Ruf der Marke leicht. */
export function brandCancel(state: GameState, data: GameData, project: Project): void {
  const b = brandById(state, project.brandId);
  if (b) b.reputationBp = Math.max(0, b.reputationBp - data.brands.reputationCancelBp);
}

/** PRD-R73: ohne neuen Titel sinkt die Müdigkeit um 2 Punkte im Monat (Monatsjob). */
export function brandMonth(state: GameState, data: GameData): void {
  if (!isFirstWeekOfMonth(state.startYear, state.week)) return;
  for (const b of state.brands) {
    b.fatigueBp = Math.max(0, b.fatigueBp - data.brands.fatigueDecayPerMonthBp);
    // BTR-R14: Zufriedenheit der Community wirkt auf den Markenruf, je Monat höchstens ± reputationPerMonthBp.
    const delta = satisfactionDelta(state, data, b, null);
    if (delta !== 0) b.reputationBp = clamp(b.reputationBp + mulBp(data.brands.satisfaction.reputationPerMonthBp, delta), 0, BP_ONE);
  }
}

/**
 * BTR-R14: (Z − neutral) / neutral, begrenzt auf ±1, für den jüngsten Titel der Marke mit Betrieb (ohne `except`);
 * ohne einen solchen Titel 0. ANNAHME: Es zählt nur der jüngste Titel, nicht das Mittel aller.
 */
export function satisfactionDelta(state: GameState, data: GameData, b: Brand, except: number | null): Bp {
  const z = data.operations.satisfaction;
  for (let i = b.titles.length - 1; i >= 0; i--) {
    if (b.titles[i] === except) continue;
    const p = state.projects.find((x) => x.id === b.titles[i]);
    if (p?.ops) return clamp(mulDiv(p.ops.satisfactionBp - z.neutralBp, BP_ONE, z.neutralBp, 1), -BP_ONE, BP_ONE);
  }
  return 0;
}

/** Cockpit: Woche, ab der die Müdigkeit unter die Pausen-Schwelle gefallen ist (null = jetzt schon). */
export function pauseUntilWeek(state: GameState, data: GameData, b: Brand): number | null {
  const over = b.fatigueBp - data.brands.pauseFatigueBp;
  if (over <= 0) return null;
  const months = divInt(over + data.brands.fatigueDecayPerMonthBp - 1, data.brands.fatigueDecayPerMonthBp, 1);
  return state.week + mulDiv(months, WEEKS_PER_YEAR, 12, 1);
}

/** PRD-R75: Marken, für die das Jubiläum fällig ist (zehn Jahre nach dem ersten Titel, einmal). */
export function jubileeDue(state: GameState, data: GameData): Brand[] {
  return state.brands.filter((b) => b.ownerId === 0 && !b.jubileeOffered && b.firstTitleWeek !== null && state.week - b.firstTitleWeek >= data.brands.jubileeYears * WEEKS_PER_YEAR);
}

/** PRD-R75 „Sammlung“ (ANNAHME): einmaliger Verkauf an einen Teil der Fans zu einem Teil des Vollpreises. */
export function collectionRevenue(state: GameState, data: GameData, b: Brand): Cent {
  const fans = Object.values(b.fans).reduce((s, v) => s + v, 0);
  const units = mulBp(fans, data.brands.collection.fanShareBp);
  return units * mulBp(netPerUnit(state, data), data.brands.collection.priceBp);
}

export function sellCollection(state: GameState, data: GameData, b: Brand): void {
  const revenue = collectionRevenue(state, data, b);
  state.moneyCent += revenue;
  ledgerNow(state).income.sales += revenue;
  log(state, "log.collection", { brand: b.name, revenue });
  chronicle(state, "log.collection", { brand: b.name, revenue });
}

