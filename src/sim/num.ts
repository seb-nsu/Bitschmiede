// Festkomma-Numerik des Kerns (S12 5.9, TEC-R80 bis TEC-R86, A22, A40).
// Einzige Datei in src/sim, die '/', Fließkomma und Math.* nutzen darf (TEC-R87).
import tanhTable from "./tables/tanh.json";
import invNormTable from "./tables/invNorm.json";
import expNegTable from "./tables/expNeg.json";
import lnTable from "./tables/ln.json";

/** Geld in ganzen Cent (TEC-R80). */
export type Cent = number;
/** Basispunkte: 1,0 = 10.000 (TEC-R80). */
export type Bp = number;

export const BP_ONE: Bp = 10000;

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

function noNegZero(x: number): number {
  return x === 0 ? 0 : x;
}

function assertInt(x: number, what: string): void {
  if (!Number.isSafeInteger(x)) throw new Error(`num: ${what} ist keine sichere ganze Zahl: ${x}`);
}

/** TEC-R82: Nenner mit Mindestbetrag; null zählt als positiv. */
function effectiveDenominator(b: number, minDen: number): number {
  assertInt(b, "Nenner");
  assertInt(minDen, "Mindestnenner");
  if (minDen < 1) throw new Error("num: Mindestnenner muss mindestens 1 sein");
  const mag = Math.max(Math.abs(b), minDen);
  return b < 0 ? -mag : mag;
}

/** Ganzzahlige Division p / d mit Abschneiden zur Null (TEC-R81), BigInt bei großen Zwischenwerten. */
function truncDiv(p: number, d: number): number {
  if (Math.abs(p) > MAX_SAFE) throw new Error("num: Zwischenprodukt außerhalb des sicheren Bereichs");
  let q = Math.trunc(p / d);
  const r = p - q * d;
  // Korrektur möglicher Rundung der Fließkomma-Division.
  if (r !== 0 && Math.sign(r) !== Math.sign(p)) q -= Math.sign(p) * Math.sign(d);
  else if (Math.abs(r) >= Math.abs(d)) q += Math.sign(p) * Math.sign(d);
  return noNegZero(q);
}

function bigMulDiv(a: number, b: number, d: number): number {
  const r = (BigInt(a) * BigInt(b)) / BigInt(d);
  const n = Number(r);
  assertInt(n, "Ergebnis");
  return noNegZero(n);
}

/** a · b / c, abgeschnitten zur Null (TEC-R81). */
export function mulDiv(a: number, b: number, c: number, minDen: number): number {
  assertInt(a, "a");
  assertInt(b, "b");
  const d = effectiveDenominator(c, minDen);
  const p = a * b;
  if (Math.abs(p) <= MAX_SAFE) return truncDiv(p, d);
  return bigMulDiv(a, b, d);
}

/** trunc(a · b / 10.000) (TEC-R81). */
export function mulBp(a: number, b: Bp): number {
  return mulDiv(a, b, BP_ONE, 1);
}

/** trunc(a · 10.000 / b) mit Pflicht-Mindestnenner (TEC-R81, TEC-R82). */
export function divBp(a: number, b: number, minDen: number): Bp {
  return mulDiv(a, BP_ONE, b, minDen);
}

/** Ganzzahlige Division trunc(a / b) mit Pflicht-Mindestnenner. */
export function divInt(a: number, b: number, minDen: number): number {
  return mulDiv(a, 1, b, minDen);
}

/** TEC-R84: einziger Begrenzer. */
export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

interface Table {
  name: string;
  version: number;
  argMin: number;
  argMax: number;
  step: number;
  checksum: string;
  values: number[];
}

export const TABLES = { tanh: tanhTable as Table, invNorm: invNormTable as Table, expNeg: expNegTable as Table, ln: lnTable as Table };

/** Tabellenversion für den Spielstand (TEC-R85). */
export const TABLE_VERSION = TABLES.tanh.version;

/** tanh aus der Tabelle (TEC-R83): Argument zur Null hin auf die Schrittweite abgeschnitten, Rand per clamp. */
export function tanhBp(x: Bp): Bp {
  const t = TABLES.tanh;
  const c = clamp(x, t.argMin, t.argMax);
  const snapped = truncDiv(c, t.step) * t.step;
  return t.values[truncDiv(snapped - t.argMin, t.step)]!;
}

/** exp(−x) aus der Tabelle (TEC-R83): x ab 0, auf die Schrittweite abgeschnitten, über 10 der Rand. */
export function expNegBp(x: Bp): Bp {
  const t = TABLES.expNeg;
  const c = clamp(x, t.argMin, t.argMax);
  return t.values[truncDiv(c, t.step)]!;
}

/** ln(x) aus der Tabelle (TEC-R83): x 0,1–2,0 in bp, außerhalb der Rand. */
export function lnBp(x: Bp): Bp {
  const t = TABLES.ln;
  const c = clamp(x, t.argMin, t.argMax);
  return t.values[truncDiv(c - t.argMin, t.step)]!;
}

/**
 * x^γ = exp(γ · ln x) für x 0,1–2,0 (A22, S03 5.1). Unter 1 über exp(−y) aus der Tabelle, darüber als Kehrwert;
 * Zwischenschritte abgeschnitten.
 */
export function powBp(x: Bp, gamma: Bp): Bp {
  const y = mulBp(lnBp(x), gamma);
  if (y <= 0) return expNegBp(-y);
  return divBp(BP_ONE, Math.max(1, expNegBp(y)), 1);
}

/** Inverse Normalverteilung für Index 0–4.095 (TEC-R86). */
export function invNormBp(index: number): Bp {
  const t = TABLES.invNorm;
  return t.values[clamp(index, t.argMin, t.argMax)]!;
}

/** Median einer Liste ganzer Zahlen; bei gerader Anzahl der abgeschnittene Mittelwert der beiden mittleren. */
export function medianInt(values: readonly number[]): number {
  if (values.length === 0) throw new Error("num: Median einer leeren Liste");
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  if (s.length % 2 === 1) return s[mid]!;
  return truncDiv(s[mid - 1]! + s[mid]!, 2);
}
