import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { ESLint } from "eslint";
import { dateOf, isFirstWeekOfMonth, weeksInMonth } from "../../src/sim/calendar";
import { stream, initialRngState } from "../../src/sim/rng";
import { newGame } from "../../src/sim/game";
import { loadBaseData, validate, DataError } from "../../src/mods/loadBase";
import { AREAS } from "../../src/sim/model/types";
import { input, playProject, SEED_A, SEED_B, testData } from "../helpers";

describe("Kalender", () => {
  it("KRN-R02 Monate zu 4, 4 und 5 Wochen, 52 Wochen im Jahr", () => {
    const lengths = new Array<number>(12).fill(0);
    for (let w = 0; w < 52; w++) lengths[dateOf(1980, w).month]! += 1;
    expect(lengths).toEqual([4, 4, 5, 4, 4, 5, 4, 4, 5, 4, 4, 5]);
    expect(dateOf(1980, 52)).toEqual({ year: 1981, weekOfYear: 0, month: 0, weekOfMonth: 0 });
  });

  it("KRN-R03 die Wochen eines Monats verteilen sich auf einen Anzeigeschritt (4, 4, 5)", () => {
    let sum = 0;
    for (let w = 0; w < 52; w++) if (isFirstWeekOfMonth(1980, w)) sum += weeksInMonth(1980, w);
    expect(sum).toBe(52);
    expect(weeksInMonth(1980, 8)).toBe(5);
    expect(weeksInMonth(1980, 12)).toBe(5);
    expect(weeksInMonth(1980, 13)).toBe(4);
  });

  it("TEC-R14 Monatsjobs in den Wochen 1, 5, 9, 14, 18, 22 …", () => {
    const firsts = [];
    for (let w = 0; w < 26; w++) if (isFirstWeekOfMonth(1980, w)) firsts.push(w + 1);
    expect(firsts).toEqual([1, 5, 9, 14, 18, 22]);
  });
});

describe("Zufall", () => {
  it("KRN-R20 KRN-R21 KRN-T06 ein Strom ändert die Folge eines anderen nicht", () => {
    const a = { seed: SEED_A, rngStates: {} };
    const b = { seed: SEED_A, rngStates: {} };
    stream(b, "markt").u32();
    stream(b, "markt").u32();
    const pa = stream(a, "projekte");
    const pb = stream(b, "projekte");
    for (let i = 0; i < 20; i++) expect(pa.u32()).toBe(pb.u32());
  });

  it("TEC-R86 gleichverteilt in bp liegt in 0–9.999, Normalverteilung aus invNorm", () => {
    const h = { seed: SEED_B, rngStates: {} };
    const r = stream(h, "projekte");
    for (let i = 0; i < 2000; i++) {
      const u = r.uniformBp();
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(10000);
      const n = r.normal(0, 3000);
      expect(Number.isSafeInteger(n)).toBe(true);
      expect(Math.abs(n)).toBeLessThanOrEqual(11005);
    }
  });

  it("KRN-R20 verschiedene Seeds und Ströme ergeben verschiedene Startzustände", () => {
    expect(initialRngState(SEED_A, "markt")).not.toEqual(initialRngState(SEED_B, "markt"));
    expect(initialRngState(SEED_A, "markt")).not.toEqual(initialRngState(SEED_A, "projekte"));
  });
});

describe("Welt und Spielstand", () => {
  it("A26 der Seed verschiebt Passung und Erwartungsprofile, Profile summieren sich auf 10.000", () => {
    const data = loadBaseData();
    const a = newGame(data, SEED_A);
    const b = newGame(data, SEED_B);
    expect(a.world.themeFit).not.toEqual(b.world.themeFit);
    for (const s of [a, b]) {
      for (const g of data.genres) {
        const p = s.world.expectedProfile[g.id]!;
        expect(AREAS.reduce((sum, ar) => sum + p[ar], 0)).toBe(10000);
        for (const t of data.themes) {
          const fit = s.world.themeFit[g.id]![t.id]!;
          const base = g.themeFit[t.id]!;
          expect(fit).toBeGreaterThanOrEqual(Math.max(5000, Math.trunc(base * 0.8) - 1));
          expect(fit).toBeLessThanOrEqual(Math.min(13000, Math.ceil(base * 1.2) + 1));
        }
      }
    }
  });

  it("TEC-R01 der Spielstand ist ein reines, serialisierbares Datenobjekt", () => {
    const data = testData();
    const s = playProject(newGame(data, SEED_A), data, input());
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it("TEC-R80 alle Kernwerte sind sichere ganze Zahlen (Eigenschaftstest)", () => {
    const data = testData();
    fc.assert(fc.property(fc.stringMatching(/^[0-9a-f]{16}$/), fc.constantFrom("klein", "mittel"), (seed, scope) => {
      const features = scope === "klein" ? input().features : ["grosseSprites", "levelVielfalt", "titelmelodie", "dialoge", "gegnerKi"];
      // Genug Geld, damit kein Seed vor dem Release insolvent wird (die Hardware altert ab dem zweiten Jahr, FRM-R29).
      const g = newGame(data, seed);
      g.moneyCent = 100_000_000;
      const s = playProject(g, data, input({ scope, features }));
      const check = (v: unknown): void => {
        if (typeof v === "number") expect(Number.isSafeInteger(v)).toBe(true);
        else if (v && typeof v === "object") Object.values(v).forEach(check);
      };
      check(s);
      expect(s.projects[0]!.bugsBp).toBeGreaterThanOrEqual(0);
    }), { numRuns: 15 });
  });

  it("TEC-R33 fehlerhafte Daten werden mit Datei und Stelle gemeldet", () => {
    const data = testData();
    data.genres[0]!.expectedProfile.story += 1;
    expect(() => validate(data)).toThrow(DataError);
    expect(() => validate(data)).toThrow(/dev\/genres\.json \(abenteuer\.expectedProfile\)/);
  });

  it("TEC-R34 die geladenen Daten sind eingefroren und haben eine Prüfsumme", () => {
    const data = loadBaseData();
    expect(Object.isFrozen(data.features[0])).toBe(true);
    expect(data.checksum).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("Lint-Sperren", () => {
  const eslint = new ESLint();
  async function errors(code: string, file: string): Promise<string[]> {
    const [res] = await eslint.lintText(code, { filePath: file });
    return res!.messages.map((m) => m.message);
  }

  it("TEC-R87 TEC-T14 Math.pow, Fließkomma-Literale und '/' im Kern schlagen fehl", async () => {
    expect((await errors("export const a = Math.pow(2, 3);\n", "src/sim/x.ts")).join()).toMatch(/TEC-R87/);
    expect((await errors("export const a = 0.5;\n", "src/sim/x.ts")).join()).toMatch(/TEC-R87/);
    expect((await errors("export const f = (a: number) => a / 2;\n", "src/sim/x.ts")).join()).toMatch(/TEC-R87/);
    expect((await errors("export const r = Math.random();\n", "src/sim/x.ts")).join()).toMatch(/TEC-R87/);
    expect(await errors("export const a = 10000;\n", "src/sim/x.ts")).toEqual([]);
  });

  it("TEC-R87 num.ts darf Fließkomma nutzen", async () => {
    expect(await errors("export const a = 0.5 / 2;\n", "src/sim/num.ts")).toEqual([]);
  });

  it("TEC-R08 TEC-T08 Kern importiert nichts aus ui/, UI importiert aus dem Kern nur Typen", async () => {
    expect((await errors("import { x } from \"../ui/App\";\nexport const y = x;\n", "src/sim/x.ts")).join()).toMatch(/TEC-R08/);
    expect((await errors("import { tick } from \"../sim/tick\";\nexport const t = tick;\n", "src/ui/x.ts")).join()).toMatch(/TEC-T08/);
    expect(await errors("import type { GameState } from \"../sim/model/types\";\nexport type S = GameState;\n", "src/ui/x.ts")).toEqual([]);
  });
});
