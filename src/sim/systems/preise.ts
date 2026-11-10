// S05 Preis nach dem Release (MKT-R17 bis MKT-R21, MKT-F4, MKT-V05, A12) und KI-Preisaktionen (MRK-R41, KI-R39).
import { type Bp, BP_ONE, type Cent, mulBp, mulDiv } from "../num";
import type { AiProduct, GameData, GameState, PriceRule, PricingParams, ProductPricing, ProductSales, Project } from "../model/types";
import { dateOf, isFirstWeekOfMonth } from "../calendar";
import { brandById } from "./marken";
import { priceDemandFactor } from "./markt";
import { ledgerNow } from "./finanzen";
import { log } from "./firma";
import { addEvent } from "./ereignisse";
import { reserveCent } from "./ki/entscheidung";

function P(data: GameData): PricingParams {
  return data.sales.pricing;
}

/** A12: Die Standardregel ist ab Start aktiv. */
export function defaultPriceRule(data: GameData): PriceRule {
  return { active: true, afterWeeks: P(data).ruleAfterWeeks, discountBp: P(data).ruleDiscountBp, followCurve: false };
}

/** MKT-R18: Ab 2005 vier feste Rabattwochen im Jahr. */
export function isDiscountWeek(data: GameData, startYear: number, week: number): boolean {
  const d = dateOf(startYear, week);
  return d.year >= P(data).discountFromYear && P(data).discountWeeks.includes(d.weekOfYear);
}

/** MKT-F4: (1 − Gewöhnung · r₂). */
export function habitFactor(data: GameData, habitBp: Bp): Bp {
  return Math.max(0, BP_ONE - mulBp(habitBp, P(data).r2Bp));
}

/** MKT-F4: (1 + r₁ · Rabatt). */
export function discountBoost(data: GameData, discountBp: Bp): Bp {
  return BP_ONE + mulBp(P(data).r1Bp, discountBp);
}

/** Beim Release (startSales): Preis, Normalpreis und Gewöhnung der Marke festhalten. */
export function newPricing(state: GameState, project: Project, priceCent: Cent, standardCent: Cent): ProductPricing {
  return {
    releasePriceCent: priceCent, standardCent, discountBp: 0, nextDiscountBp: null, discounts: 0,
    habitAtReleaseBp: brandById(state, project.brandId)?.discountHabitBp ?? 0, history: [[state.week, priceCent]], protectionCreditCent: 0,
  };
}

/** Preis dieser Woche (mit Rabatt). */
export function effectivePrice(s: ProductSales): Cent | undefined {
  if (s.priceCent === undefined) return undefined;
  return s.pricing && s.pricing.discountBp > 0 ? mulBp(s.priceCent, BP_ONE - s.pricing.discountBp) : s.priceCent;
}

/**
 * MKT-F4, MKT-R19: In der Rabattwoche (1 + r₁ · Rabatt) · (1 − Gewöhnung · r₂) mit der Gewöhnung der Marke von heute.
 * ANNAHME: Zum Vollpreis (Preis zum Release) kaufen die Fans um (1 − Gewöhnung · r₂) weniger, mit der Gewöhnung
 * zum Release; nach einer dauerhaften Senkung warten sie nicht mehr.
 */
export function pricingDemandFactor(state: GameState, data: GameData, s: ProductSales, brandId: number | null): Bp {
  const pr = s.pricing;
  if (!pr) return BP_ONE;
  if (pr.discountBp > 0) return mulBp(discountBoost(data, pr.discountBp), habitFactor(data, brandById(state, brandId)?.discountHabitBp ?? 0));
  if (s.priceCent !== undefined && s.priceCent >= pr.releasePriceCent) return habitFactor(data, pr.habitAtReleaseBp);
  return BP_ONE;
}

/** MKT-R17: vorgeschlagene Preiskurve (S05 Abschnitt 7: nach 6 Monaten −20 %, nach 12 Monaten −40 %). */
export function suggestedPrice(data: GameData, pr: ProductPricing, t: number): Cent {
  let cut = 0;
  for (const [week, bp] of P(data).curve) if (t >= week) cut = bp;
  return mulBp(pr.releasePriceCent, BP_ONE - cut);
}

export function validateSetPrice(state: GameState, project: Project | undefined, priceCent: Cent): string | null {
  if (!project || !project.sales || project.sales.ended) return "error.unknownProject";
  if (!project.sales.pricing || project.sales.priceCent === undefined) return "error.locked";
  // MKT-V23: Nach der Lizenz an einen Budget-Publisher hat der Spieler keine Preishoheit mehr.
  if (project.sales.priceLocked) return "error.priceLicensed";
  if (!Number.isSafeInteger(priceCent) || priceCent < 1) return "error.amount";
  // MKT-R17: Erhöhen ist nicht möglich.
  if (priceCent >= project.sales.priceCent) return "error.priceUp";
  return null;
}

/** Gutschrift an den Handel (MKT-V05): Bestand × Preisdifferenz. */
export function protectionCredit(stock: number, oldCent: Cent, newCent: Cent): Cent {
  return Math.max(0, stock) * Math.max(0, oldCent - newCent);
}

/**
 * MKT-R17: Preis dauerhaft senken. MKT-V05: Für Ware im Handel schuldet das Studio eine Gutschrift.
 * ANNAHME: Bis zum Vertrieb (Etappe 4.7) gilt der ganze Bestand als Ware im Handel.
 */
export function lowerPrice(state: GameState, data: GameData, project: Project, priceCent: Cent): void {
  const s = project.sales!;
  const pr = s.pricing!;
  const old = s.priceCent!;
  const credit = protectionCredit(s.stock, old, priceCent);
  if (credit > 0) {
    state.moneyCent -= credit;
    ledgerNow(state).costs.other += credit;
    pr.protectionCreditCent += credit;
  }
  // Die Preiselastizität wirkt auf den neuen Preis (MKT-R09 wie beim Release).
  s.demandFactorBp = mulDiv(s.demandFactorBp, priceDemandFactor(data, priceCent, pr.standardCent), priceDemandFactor(data, old, pr.standardCent), 1);
  s.priceCent = priceCent;
  pr.history.push([state.week, priceCent]);
  log(state, "log.priceLowered", { project: project.title, price: priceCent, cost: credit });
}

function playerProducts(state: GameState): Project[] {
  return state.projects.filter((p) => p.sales && !p.sales.ended && p.sales.pricing).sort((a, b) => a.id - b.id);
}

function addHabit(state: GameState, data: GameData, brandId: number | null, discountBp: Bp): void {
  const b = brandById(state, brandId);
  if (b && discountBp >= P(data).habitMinDiscountBp) b.discountHabitBp = Math.min(BP_ONE, b.discountHabitBp + P(data).habitPerDiscountBp);
}

/** Tick-Schritt 7 vor den Verkäufen: Gewöhnung, Preiskurve, Rabattwochen für Spieler und KI. */
export function priceStep(state: GameState, data: GameData): void {
  const pp = P(data);
  // MKT-R19: Gewöhnung baut sich langsam ab (−10 je Monat).
  if (isFirstWeekOfMonth(state.startYear, state.week)) for (const b of state.brands) b.discountHabitBp = Math.max(0, b.discountHabitBp - pp.habitDecayPerMonthBp);
  const discount = isDiscountWeek(data, state.startYear, state.week);
  const rule = state.priceRule;
  for (const p of playerProducts(state)) {
    const s = p.sales!;
    const pr = s.pricing!;
    pr.discountBp = 0;
    const t = state.week - s.startWeek;
    // MKT-R17, MKT-R21: Preise folgen auf Wunsch der Kurve.
    if (rule.followCurve) {
      const target = suggestedPrice(data, pr, t);
      if (target < s.priceCent!) lowerPrice(state, data, p, target);
    }
    if (!discount) continue;
    // A12: ohne Entscheidung die Regel; MKT-R21.
    const chosen = pr.nextDiscountBp ?? (rule.active && t >= rule.afterWeeks ? rule.discountBp : 0);
    pr.nextDiscountBp = null;
    if (chosen <= 0) continue;
    pr.discountBp = chosen;
    pr.discounts += 1;
    addHabit(state, data, p.brandId, chosen);
  }
  // A12: Ist die Regel aus, fragt eine Karte eine Woche vor der Aktion.
  if (!rule.active && isDiscountWeek(data, state.startYear, state.week + 1) && playerProducts(state).length > 0) {
    const options = [...pp.discountOptionsBp.map((bp) => `rabatt${bp}`), "aussetzen"];
    addEvent(state, data, { kind: "rabattwoche", scope: "welt", projectId: null, options, defaultOption: "aussetzen" });
  }
  aiPriceStep(state, data, discount);
}

/** Entscheidung der Karte „Rabattwoche steht an“: gilt für alle Produkte im Verkauf. */
export function applyDiscountDecision(state: GameState, option: string): void {
  const bp = option.startsWith("rabatt") ? Number.parseInt(option.slice("rabatt".length), 10) : 0;
  for (const p of playerProducts(state)) p.sales!.pricing!.nextDiscountBp = Number.isSafeInteger(bp) ? bp : 0;
}

/**
 * MRK-R41: KI senkt den Preis nach 12 Monaten um 25 % und nimmt danach an jeder zweiten Store-Aktion teil
 * (ANNAHME: Publisher als „Marken-Fabriken“ an jeder dritten). KI-R39: unter der Rücklage an jeder Aktion.
 */
function aiPriceStep(state: GameState, data: GameData, discount: boolean): void {
  const pp = P(data);
  const studios = new Map(state.ai.studios.map((s) => [s.id, s]));
  for (const p of state.ai.products) {
    p.discountBp = 0;
    const t = state.week - p.releaseWeek;
    if (t < pp.aiCutAfterWeeks) continue;
    p.priceCutBp ??= pp.aiCutBp;
    if (!discount) continue;
    p.storeActions = (p.storeActions ?? 0) + 1;
    const studio = studios.get(p.studioId);
    const every = studio?.archetype === "publisher" ? pp.aiEveryPublisher : pp.aiEvery;
    const poor = studio !== undefined && studio.cashCent < reserveCent(state, data, studio);
    if (!poor && p.storeActions % every !== 0) continue;
    p.discountBp = pp.aiDiscountBp;
    addHabit(state, data, p.brandId, pp.aiDiscountBp);
  }
}

/** Preis-Faktor eines KI-Produkts: dauerhafte Senkung (Elastizität) und Rabattwoche nach MKT-F4. */
export function aiPriceFactors(state: GameState, data: GameData, p: AiProduct): { demandBp: Bp; priceBp: Bp } {
  const cut = p.priceCutBp ?? 0;
  const d = p.discountBp ?? 0;
  let demandBp = priceDemandFactor(data, BP_ONE - cut, BP_ONE);
  if (d > 0) demandBp = mulBp(demandBp, mulBp(discountBoost(data, d), habitFactor(data, brandById(state, p.brandId)?.discountHabitBp ?? 0)));
  else if (cut === 0) demandBp = mulBp(demandBp, habitFactor(data, p.habitAtReleaseBp ?? 0));
  return { demandBp, priceBp: mulBp(BP_ONE - cut, BP_ONE - d) };
}
