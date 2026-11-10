// Numerik gegen Dezimal-Referenz (S12 5.7 „Numerik“, TEC-R81 bis TEC-R86).
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import Decimal from "decimal.js";
import { clamp, divBp, divInt, invNormBp, medianInt, mulBp, mulDiv, tanhBp, TABLES } from "../../src/sim/num";
import { buildTanh, checksum, invNormRef, tanhRef } from "../../tools/tables";

Decimal.set({ precision: 60, rounding: Decimal.ROUND_DOWN });

const big = fc.integer({ min: -1_000_000_000_000, max: 1_000_000_000_000 });
const mid = fc.integer({ min: -100_000_000, max: 100_000_000 });

function refMulDiv(a: number, b: number, c: number, minDen: number): number {
  const mag = Math.max(Math.abs(c), minDen);
  const d = c < 0 ? -mag : mag;
  const r = new Decimal(a).times(b).div(d).trunc().toNumber();
  return r === 0 ? 0 : r;
}

describe("TEC-R81 Helfer gegen Dezimal-Referenz", () => {
  it("TEC-R81 mulBp schneidet zur Null ab", () => {
    fc.assert(fc.property(big, mid, (a, b) => {
      const expected = refMulDiv(a, b, 10000, 1);
      if (!Number.isSafeInteger(expected)) {
        expect(() => mulBp(a, b)).toThrow();
        return;
      }
      expect(mulBp(a, b)).toBe(expected);
    }));
  });
  it("TEC-R81 divBp schneidet zur Null ab", () => {
    fc.assert(fc.property(big, mid, fc.integer({ min: 1, max: 1000 }), (a, b, m) => {
      const expected = refMulDiv(a, 10000, b, m);
      if (!Number.isSafeInteger(expected)) {
        expect(() => divBp(a, b, m)).toThrow();
        return;
      }
      expect(divBp(a, b, m)).toBe(expected);
    }));
  });
  it("TEC-R81 mulDiv nutzt BigInt bei großen Zwischenprodukten", () => {
    fc.assert(fc.property(big, big, mid, (a, b, c) => {
      const expected = refMulDiv(a, b, c, 1);
      if (!Number.isSafeInteger(expected)) {
        expect(() => mulDiv(a, b, c, 1)).toThrow();
        return;
      }
      expect(mulDiv(a, b, c, 1)).toBe(expected);
    }));
  });
  it("TEC-R80 Ergebnisse sind immer sichere ganze Zahlen", () => {
    fc.assert(fc.property(mid, mid, fc.integer({ min: -5000, max: 5000 }), (a, b, c) => {
      const r = mulDiv(a, b, c, 7);
      expect(Number.isSafeInteger(r)).toBe(true);
      expect(Object.is(r, -0)).toBe(false);
    }));
  });
  it("divInt teilt ganzzahlig", () => {
    expect(divInt(7, 2, 1)).toBe(3);
    expect(divInt(-7, 2, 1)).toBe(-3);
  });
});

describe("TEC-T12 Abschneiden und Mindestnenner", () => {
  it("TEC-T12 mulBp(−15.001, 3) = −4 und divBp(7, 0, 1) = 70.000", () => {
    expect(mulBp(-15001, 3)).toBe(-4);
    expect(divBp(7, 0, 1)).toBe(70000);
  });
  it("TEC-R82 Null im Nenner zählt als positiv und nutzt den Mindestnenner", () => {
    expect(divBp(-7, 0, 2)).toBe(-35000);
    expect(divBp(7, -1, 2)).toBe(-35000);
  });
  it("TEC-R82 Mindestnenner unter 1 ist ein Fehler", () => {
    expect(() => divBp(1, 1, 0)).toThrow();
  });
});

describe("TEC-R84 clamp", () => {
  it("TEC-R84 begrenzt auf den Bereich", () => {
    fc.assert(fc.property(mid, (x) => {
      const r = clamp(x, -100, 100);
      expect(r).toBeGreaterThanOrEqual(-100);
      expect(r).toBeLessThanOrEqual(100);
    }));
  });
});

describe("TEC-R83 und TEC-R85 Tabellen", () => {
  it("TEC-R85 Prüfsummen stimmen", () => {
    expect(checksum(TABLES.tanh.values)).toBe(TABLES.tanh.checksum);
    expect(checksum(TABLES.invNorm.values)).toBe(TABLES.invNorm.checksum);
  });
  it("TEC-R85 die tanh-Tabelle entspricht dem Generator", () => {
    const fresh = buildTanh();
    expect(fresh.checksum).toBe(TABLES.tanh.checksum);
  });
  it("TEC-R83 tanh: Argument zur Null hin auf die Schrittweite, ohne Interpolation", () => {
    fc.assert(fc.property(fc.integer({ min: -50000, max: 50000 }), (x) => {
      const snapped = Math.trunc(x / 10) * 10;
      const expected = tanhRef(snapped).times(10000).trunc().toNumber();
      expect(tanhBp(x)).toBe(expected === 0 ? 0 : expected);
    }), { numRuns: 300 });
  });
  it("TEC-R83 tanh: außerhalb des Bereichs gilt der Rand", () => {
    expect(tanhBp(900000)).toBe(tanhBp(50000));
    expect(tanhBp(-900000)).toBe(tanhBp(-50000));
  });
  it("TEC-R86 invNorm stimmt an Stichproben mit der Referenz", () => {
    for (const i of [0, 1, 100, 1000, 2047]) {
      expect(invNormBp(i)).toBe(invNormRef(i).times(10000).trunc().toNumber());
    }
    expect(invNormBp(4095)).toBe(-invNormBp(0));
  });
});

describe("medianInt", () => {
  it("liefert den Median", () => {
    expect(medianInt([5, 1, 3])).toBe(3);
    expect(medianInt([4, 1, 3, 2])).toBe(2);
  });
});
