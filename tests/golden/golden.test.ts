// Golden-Runs (S12 5.7, TEC-R60, TEC-T13): Die gespeicherten Verläufe müssen bitgleich bleiben. Weicht einer ab, hat sich
// Verhalten geändert; ist das gewollt, mit Begründung neu freigeben: npm run golden:update
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GOLDEN_FILE, GOLDEN_RUNS, goldenRun, type GoldenResult } from "../../tools/golden";
import { TABLE_VERSION } from "../../src/sim/num";

const stored = JSON.parse(readFileSync(GOLDEN_FILE, "utf8")) as { tableVersion: number; dataChecksum: string; runs: GoldenResult[] };

describe("Golden-Runs 1980–2000", () => {
  it("TEC-T13 die Tabellenversion entspricht der freigegebenen", () => {
    expect(TABLE_VERSION).toBe(stored.tableVersion);
  });

  for (const run of GOLDEN_RUNS) {
    it(`TEC-R60 ${run.strategy} mit Seed ${run.seed} ergibt die gespeicherten Prüfsummen je Jahrzehnt`, () => {
      const expected = stored.runs.find((r) => r.seed === run.seed && r.strategy === run.strategy);
      expect(expected, "Golden-Run fehlt: npm run golden:update").toBeDefined();
      expect(goldenRun(run.seed, run.strategy)).toEqual(expected);
    });
  }
});
