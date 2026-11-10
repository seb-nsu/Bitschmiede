// Firmenwert W (S09 Formel 5, UEB-R42, A37; Etappe 6b.1): Ertrag, Marken, Technik, Plattform, Team, Schulden, Befunde.
// Die Aufschlüsselung ist der Wasserfall des Firmenwerts (S09 Abschnitt 8).
import { type Bp, BP_ONE, type Cent, divInt, mulBp, mulDiv } from "../num";
import type { AiStudio, GameData, GameState } from "../model/types";
import { AREAS } from "../model/types";
import { dateOf } from "../calendar";
import { anchorValue, monthCosts, monthIncome } from "./finanzen";
import { salePrice } from "./markenmarkt";
import { monthlyCost, studioPeople } from "./ki/studios";

export interface FirmValue {
  earningsCent: Cent;
  brandsCent: Cent;
  techCent: Cent;
  platformCent: Cent;
  teamCent: Cent;
  debtCent: Cent;
  findingsCent: Cent;
  totalCent: Cent;
}

function V(data: GameData) {
  return data.acquisitions.value;
}

function total(v: Omit<FirmValue, "totalCent">): FirmValue {
  return { ...v, totalCent: Math.max(0, v.earningsCent + v.brandsCent + v.techCent + v.platformCent + v.teamCent - v.debtCent + v.findingsCent) };
}

/** Jahresgehalt einer Person im laufenden Jahr (Marktniveau). */
function yearSalary(state: GameState, data: GameData): Cent {
  return anchorValue(data.economy.salaryAnchorsCent, dateOf(state.startYear, state.week).year) * 12;
}

/** P = Personen × Jahresgehalt × Teamfaktor × (Durchschnittsstärke / 50). */
function teamValue(state: GameState, data: GameData, people: number, strength: number): Cent {
  const v = V(data);
  return mulDiv(mulBp(people * yearSalary(state, data), v.teamFactorBp), strength, v.strengthPivot, 1);
}

/** Marken: Kaufpreis des Markenmarkts (LIZ-MF3) × Markenfaktor, damit beide Wege gleich bewerten (UEB-R42, A37). */
function brandsValue(state: GameState, data: GameData, ownerId: number): Cent {
  let sum = 0;
  for (const b of state.brands) if (b.ownerId === ownerId) sum += mulBp(salePrice(state, data, b), V(data).brandFactorBp);
  return sum;
}

/** T: Lizenzumsatz des letzten Jahres × Engine-Multiplikator. ANNAHME: Den Forschungswert der Module zählt erst die Vollversion. */
function techValue(state: GameState, data: GameData, ownerId: number): Cent {
  let sum = 0;
  for (const e of state.licensing.engines) if (e.ownerId === ownerId && !e.closed) sum += mulBp(e.revenueByYear[1] ?? 0, V(data).engineMultBp);
  return sum;
}

/**
 * W einer KI-Firma. E = Durchschnittsgewinn der letzten drei abgeschlossenen Jahre × Ertragsmultiplikator (bei Verlust 0).
 * ANNAHME: KI-Studios führen kein Kostenbuch; ihr Jahresgewinn ist Jahresumsatz minus die heutigen Jahreskosten.
 * S = negatives Konto. H = 0, solange Plattformhersteller keine Firmen sind (Plan 6b, Annahme 1).
 */
export function studioValue(state: GameState, data: GameData, studio: AiStudio, findingsCent: Cent = 0): FirmValue {
  const v = V(data);
  const years = studio.revenueByYear.slice(1, 1 + v.earningsYears);
  const yearCost = monthlyCost(state, data, studio) * 12;
  const avg = years.length === 0 ? 0 : divInt(years.reduce((s, r) => s + r - yearCost, 0), v.earningsYears, 1);
  const strength = divInt(AREAS.reduce((s, a) => s + studio.strength[a], 0), AREAS.length, 1);
  return total({
    earningsCent: mulBp(Math.max(0, avg), v.earningsMultBp),
    brandsCent: brandsValue(state, data, studio.id),
    techCent: techValue(state, data, studio.id),
    platformCent: 0,
    teamCent: teamValue(state, data, studioPeople(studio), strength),
    debtCent: Math.max(0, -studio.cashCent),
    findingsCent,
  });
}

/** Gewinn je Kalenderjahr aus dem Monatsbuch (höchstens fünf Jahre), ohne das laufende Jahr. */
export function playerYearProfits(state: GameState): Cent[] {
  const year = dateOf(state.startYear, state.week).year;
  const out: Cent[] = [];
  for (let y = year - 1; y >= year - 5; y--) {
    const months = state.finance.ledger.filter((m) => m.year === y);
    if (months.length < 12) break;
    out.push(months.reduce((s, m) => s + monthIncome(m) - monthCosts(m), 0));
  }
  return out;
}

/** W der eigenen Firma (Kurs, FRM-R74; Erlös des Börsengangs, FRM-R51). S = Kredite. */
export function playerValue(state: GameState, data: GameData): FirmValue {
  const v = V(data);
  const years = playerYearProfits(state).slice(0, v.earningsYears);
  const avg = years.length === 0 ? 0 : divInt(years.reduce((s, x) => s + x, 0), v.earningsYears, 1);
  const people = state.people.length;
  const strength = people === 0 ? 0 : divInt(state.people.reduce((s, p) => s + divInt(AREAS.reduce((a, k) => a + p.strength[k], 0), AREAS.length, 1), 0), people, 1);
  return total({
    earningsCent: mulBp(Math.max(0, avg), v.earningsMultBp),
    brandsCent: brandsValue(state, data, 0),
    techCent: techValue(state, data, 0),
    platformCent: 0,
    teamCent: teamValue(state, data, people, strength),
    debtCent: state.finance.loanCent,
    findingsCent: 0,
  });
}

/** UEB-R05: Spanne ±widthBp um die Mitte W × (1 + o). */
export function valueRange(trueCent: Cent, offsetBp: Bp, widthBp: Bp): { low: Cent; mid: Cent; high: Cent } {
  const mid = mulBp(trueCent, BP_ONE + offsetBp);
  return { low: mulBp(mid, BP_ONE - widthBp), mid, high: mulBp(mid, BP_ONE + widthBp) };
}
