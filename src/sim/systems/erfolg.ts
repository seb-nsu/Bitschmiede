// Balancing Spätspiel (Entscheidung Projektleitung 04.11.2026 „Kosten wachsen mit Erfolg“; Prüfung Fable: Geld bedeutet ab 1990
// nichts mehr, weil die Kosten nicht mit dem Erfolg wachsen). Zwei Kosten, die reiche Studios treffen und kleine schonen:
//  1. Gewinnbeteiligung: Zu Quartalsbeginn bekommt das Team einen Anteil am Gewinn des Vorquartals (vor Steuern), je Jahr
//     und Firmengröße, nur aus dem Polster über minReserveMonths Monatskosten; das hebt die Moral. Verluste kosten nichts.
//  2. Star-Gehälter: Einmal im Jahr verlangen starke Leute mehr, solange die Kasse über reserveMonths Monatskosten liegt,
//     höchstens bis capBp des Marktgehalts für ihre Stärke.
// ANNAHME (OFFENE-FRAGEN „Kosten wachsen mit Erfolg“): Die Spezifikation kennt beides nicht; Werte in core/economy.json.
import { type Bp, BP_ONE, type Cent, clamp, divInt, mulBp } from "../num";
import type { GameData, GameState, LedgerMonth, SuccessParams } from "../model/types";
import { AREAS } from "../model/types";
import { dateOf, WEEKS_PER_QUARTER } from "../calendar";
import { anchorValue, monthCosts, monthIncome, scaleToYear } from "./finanzen";
import { log } from "./firma";

function S(data: GameData): SuccessParams {
  return data.economy.success;
}

/** Anteil der Gewinnbeteiligung im Jahr bei dieser Firmengröße (0, wenn sie noch nicht gilt). */
export function profitShareBp(state: GameState, data: GameData): Bp {
  const p = S(data).profitShare;
  const year = dateOf(state.startYear, state.week).year;
  if (year < p.fromYear || state.people.length < p.minPeople || state.scenario) return 0;
  const size = p.sizeSteps.reduce((acc, [n, bp]) => (state.people.length >= n ? bp : acc), 0);
  return Math.min(BP_ONE, anchorValue(p.shareAnchorsBp, year) + size);
}

/** Gewinn (vor Steuern und ohne frühere Boni) der drei Monate des Vorquartals. */
function lastQuarterProfit(state: GameState): Cent {
  const quarter = divInt(state.week, WEEKS_PER_QUARTER, 1) - 1;
  if (quarter < 0) return 0;
  const first = dateOf(state.startYear, quarter * WEEKS_PER_QUARTER);
  const months = state.finance.ledger.filter((m) => m.year === first.year && m.month >= first.month && m.month < first.month + 3);
  return months.reduce((s, m) => s + monthIncome(m) - monthCosts(m, false) + (m.costs.bonus ?? 0), 0);
}

/** Zu Quartalsbeginn vor der Gewinnsteuer: Bonus = Anteil am Vorquartalsgewinn; Moral steigt. */
export function profitShareStep(state: GameState, data: GameData, book: LedgerMonth): Cent {
  const share = profitShareBp(state, data);
  if (share <= 0) return 0;
  const profit = lastQuarterProfit(state);
  if (profit <= 0) return 0;
  // Boni nur aus dem Polster über minReserveMonths Monatskosten: Wer knapp ist, zahlt nichts (keine Abwärtsspirale).
  const room = state.moneyCent - state.finance.loanCent - monthlyCosts(state) * S(data).profitShare.minReserveMonths;
  const bonus = Math.min(mulBp(profit, share), room);
  if (bonus <= 0) return 0;
  state.moneyCent -= bonus;
  book.costs.bonus = (book.costs.bonus ?? 0) + bonus;
  for (const p of state.people) p.moraleBp = clamp(p.moraleBp + S(data).profitShare.moraleBp, 0, BP_ONE);
  log(state, "log.profitShare", { amount: bonus, share });
  return bonus;
}

/** Mittlere Monatskosten (ohne Steuern) der letzten zwölf Monate. */
function monthlyCosts(state: GameState): Cent {
  const months = state.finance.ledger.slice(-12);
  return months.length === 0 ? 0 : divInt(months.reduce((s, m) => s + monthCosts(m, false), 0), months.length, 1);
}

/** Jahresbeginn: Stars verlangen mehr, wenn das Studio reich ist (Gründer ausgenommen). */
export function starSalaryStep(state: GameState, data: GameData): number {
  const p = S(data).starSalary;
  const year = dateOf(state.startYear, state.week).year;
  if (year < p.fromYear || state.scenario) return 0;
  const reserve = monthlyCosts(state) * p.reserveMonths;
  if (reserve <= 0 || state.moneyCent - state.finance.loanCent <= reserve) return 0;
  const a = data.applications;
  let n = 0;
  for (const person of [...state.people].sort((x, y) => x.id - y.id)) {
    if (person.isFounder) continue;
    const best = AREAS.reduce((m, ar) => Math.max(m, person.strength[ar]), 0);
    if (best < p.minStrength) continue;
    const cap = mulBp(scaleToYear(data, a.salaryBaseCent + best * a.salaryPerFocusPointCent, year), p.capBp);
    const next = Math.min(cap, person.salaryCent + mulBp(person.salaryCent, p.raiseBp));
    if (next > person.salaryCent) {
      person.salaryCent = next;
      n += 1;
    }
  }
  if (n > 0) log(state, "log.starSalaries", { n });
  return n;
}
