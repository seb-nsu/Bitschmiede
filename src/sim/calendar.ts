// Kalender (KRN-R01, KRN-R02, A13, A33): 52 Wochen, Quartale zu 13 Wochen, Monate zu 4, 4 und 5 Wochen.
import { divInt } from "./num";

export const WEEKS_PER_YEAR = 52;
export const WEEKS_PER_QUARTER = 13;

export interface CalendarDate {
  year: number;
  /** 0–51 */
  weekOfYear: number;
  /** 0–11 */
  month: number;
  /** 0-basierte Woche innerhalb des Monats */
  weekOfMonth: number;
}

export function dateOf(startYear: number, week: number): CalendarDate {
  const year = startYear + divInt(week, WEEKS_PER_YEAR, 1);
  const weekOfYear = week % WEEKS_PER_YEAR;
  const quarter = divInt(weekOfYear, WEEKS_PER_QUARTER, 1);
  const wq = weekOfYear % WEEKS_PER_QUARTER;
  const inQuarter = wq < 4 ? 0 : wq < 8 ? 1 : 2;
  return { year, weekOfYear, month: quarter * 3 + inQuarter, weekOfMonth: wq - inQuarter * 4 };
}

/** Länge des Monats, in dem die Woche liegt: 4, 4 oder 5 Wochen (KRN-R02). */
export function weeksInMonth(startYear: number, week: number): number {
  return dateOf(startYear, week).month % 3 === 2 ? 5 : 4;
}

/** Monatsjobs laufen in der ersten Woche jedes Monats (TEC-R14, KRN-R12). */
export function isFirstWeekOfMonth(startYear: number, week: number): boolean {
  return dateOf(startYear, week).weekOfMonth === 0;
}

export function isFirstWeekOfYear(week: number): boolean {
  return week % WEEKS_PER_YEAR === 0;
}

/** Quartalsjobs laufen in den Wochen 1, 14, 27 und 40 (TEC-R14, A13). */
export function isFirstWeekOfQuarter(week: number): boolean {
  return week % WEEKS_PER_QUARTER === 0;
}
