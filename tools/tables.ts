// TEC-R85: Erzeugt die Nachschlagetabellen (S12 5.9) mit Dezimal-Arithmetik hoher Genauigkeit.
// Aufruf: npm run tables. Ergebnis: src/sim/tables/*.json mit Version und Prüfsumme.
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Decimal from "decimal.js";

Decimal.set({ precision: 50, rounding: Decimal.ROUND_DOWN });

export const TABLE_VERSION = 2;
const BP = new Decimal(10000);

export interface TableFile {
  name: string;
  version: number;
  argMin: number;
  argMax: number;
  step: number;
  checksum: string;
  values: number[];
}

export function checksum(values: number[]): string {
  return createHash("sha256").update(JSON.stringify(values)).digest("hex");
}

/** Abschneiden zur Null hin, Ergebnis in bp. */
function toBp(x: Decimal): number {
  const v = x.times(BP).trunc().toNumber();
  return v === 0 ? 0 : v;
}

export function tanhRef(xBp: number): Decimal {
  return new Decimal(xBp).div(BP).tanh();
}

export function buildTanh(): TableFile {
  const argMin = -50000;
  const argMax = 50000;
  const step = 10;
  const values: number[] = [];
  for (let x = argMin; x <= argMax; x += step) values.push(toBp(tanhRef(x)));
  return { name: "tanh", version: TABLE_VERSION, argMin, argMax, step, checksum: checksum(values), values };
}

const SQRT_2PI = new Decimal(2).times(Decimal.acos(-1)).sqrt();

function pdf(x: Decimal): Decimal {
  return x.pow(2).neg().div(2).exp().div(SQRT_2PI);
}

/** Verteilungsfunktion der Standardnormalverteilung über die Reihe Φ(x) = ½ + φ(x)·Σ x^(2n+1)/(2n+1)!! */
function cdf(x: Decimal): Decimal {
  let term = x;
  let sum = x;
  const x2 = x.pow(2);
  const eps = new Decimal("1e-45");
  for (let n = 1; n < 2000; n++) {
    term = term.times(x2).div(2 * n + 1);
    sum = sum.plus(term);
    if (term.abs().lt(eps)) break;
  }
  return new Decimal(0.5).plus(pdf(x).times(sum));
}

/** Startwert nach Acklam (Fließkomma), danach Newton in Dezimal-Arithmetik. */
function acklam(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const q = Math.sqrt(-2 * Math.log(p < 0.5 ? p : 1 - p));
  if (p < 0.02425 || p > 1 - 0.02425) {
    const v = (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
    return p < 0.5 ? v : -v;
  }
  const r = (p - 0.5) * (p - 0.5);
  return (
    ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * (p - 0.5)) /
    (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1)
  );
}

export function invNormRef(index: number): Decimal {
  const p = new Decimal(index).plus(0.5).div(4096);
  let x = new Decimal(acklam(p.toNumber()));
  for (let i = 0; i < 6; i++) {
    x = x.minus(cdf(x).minus(p).div(pdf(x)));
  }
  return x;
}

/** exp(−x) für x 0–10 in Schritten von 0,001 (S12 5.9): Verfall und Abklingen. */
export function expNegRef(xBp: number): Decimal {
  return new Decimal(xBp).div(BP).neg().exp();
}

export function buildExpNeg(): TableFile {
  const argMin = 0;
  const argMax = 100000;
  const step = 10;
  const values: number[] = [];
  for (let x = argMin; x <= argMax; x += step) values.push(toBp(expNegRef(x)));
  return { name: "expNeg", version: TABLE_VERSION, argMin, argMax, step, checksum: checksum(values), values };
}

/** ln(x) für x 0,1–2,0 in Schritten von 0,0001 (S12 5.9, A22): Potenzen x^γ = exp(γ · ln x) im Engine-Faktor (S03 5.1). */
export function lnRef(xBp: number): Decimal {
  return new Decimal(xBp).div(BP).ln();
}

export function buildLn(): TableFile {
  const argMin = 1000;
  const argMax = 20000;
  const step = 1;
  const values: number[] = [];
  for (let x = argMin; x <= argMax; x += step) values.push(toBp(lnRef(x)));
  return { name: "ln", version: TABLE_VERSION, argMin, argMax, step, checksum: checksum(values), values };
}

export function buildInvNorm(): TableFile {
  const values: number[] = new Array<number>(4096);
  // Symmetrie: Φ⁻¹(1 − p) = −Φ⁻¹(p); so sind beide Hälften exakt gespiegelt.
  for (let i = 0; i < 2048; i++) {
    const v = toBp(invNormRef(i));
    values[i] = v;
    values[4095 - i] = v === 0 ? 0 : -v;
  }
  return { name: "invNorm", version: TABLE_VERSION, argMin: 0, argMax: 4095, step: 1, checksum: checksum(values), values };
}

function main(): void {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "sim", "tables");
  for (const table of [buildTanh(), buildInvNorm(), buildExpNeg(), buildLn()]) {
    writeFileSync(join(dir, `${table.name}.json`), JSON.stringify(table) + "\n");
    console.log(`${table.name}: ${table.values.length} Einträge, Prüfsumme ${table.checksum.slice(0, 16)}…`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
