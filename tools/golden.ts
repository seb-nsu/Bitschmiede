// Golden-Runs (S12 5.7, TEC-R60, TEC-T13): fünf gespeicherte Verläufe 1980–2000 aus Seed und Bot-Strategie mit Prüfsummen
// je Jahrzehnt. Eine Änderung an Regeln, Daten oder Tabellen ändert sie; neu freigeben nur bewusst mit Begründung:
// npm run golden:update
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBaseData } from "../src/mods/loadBase";
import { newGame } from "../src/sim/game";
import { tick } from "../src/sim/tick";
import { stateChecksum } from "../src/sim/hash";
import { dateOf } from "../src/sim/calendar";
import { TABLE_VERSION } from "../src/sim/num";
import { botInputs, createBot, netWorth, type StrategyId } from "./bots";

export const GOLDEN_RUNS: { seed: string; strategy: StrategyId }[] = [
  { seed: "0000000000000001", strategy: "vernuenftig" },
  { seed: "0000000000000002", strategy: "wachstum" },
  { seed: "0000000000000003", strategy: "gierig" },
  { seed: "0000000000000004", strategy: "auftraege" },
  { seed: "0000000000000005", strategy: "durchschnitt" },
];

export const GOLDEN_YEARS = 20;

export interface GoldenResult {
  seed: string;
  strategy: StrategyId;
  /** Prüfsumme des Spielstands am Ende jedes Jahrzehnts (Woche 52 von 1989 und 1999). */
  checksums: Record<string, string>;
  /** Lesbare Kennzahlen am Ende, damit eine Abweichung sofort einzuordnen ist. */
  releases: number;
  netWorthCent: number;
  people: number;
  week: number;
}

export function goldenRun(seed: string, strategy: StrategyId): GoldenResult {
  const data = loadBaseData();
  let state = newGame(data, seed);
  const bot = createBot(strategy, seed);
  const checksums: Record<string, string> = {};
  for (let w = 0; w < GOLDEN_YEARS * 52 && !state.gameOver; w++) {
    state = tick(state, data, botInputs(bot, data, state));
    const d = dateOf(state.startYear, state.week - 1);
    if (d.weekOfYear === 51 && (d.year + 1) % 10 === 0) checksums[String(d.year)] = stateChecksum(state);
  }
  return {
    seed, strategy, checksums,
    releases: state.projects.filter((p) => p.result).length,
    netWorthCent: netWorth(state), people: state.people.length, week: state.week,
  };
}

export const GOLDEN_FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "tests", "golden", "golden.json");

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const data = loadBaseData();
  const runs = GOLDEN_RUNS.map((r) => goldenRun(r.seed, r.strategy));
  const file = { tableVersion: TABLE_VERSION, dataChecksum: data.checksum, years: GOLDEN_YEARS, runs };
  writeFileSync(GOLDEN_FILE, JSON.stringify(file, null, 2) + "\n");
  for (const r of runs) console.log(`${r.strategy} ${r.seed}: ${r.releases} Releases, ${Math.round(r.netWorthCent / 100)} USD, ${JSON.stringify(r.checksums)}`);
  console.log(`Golden-Runs neu freigegeben: ${GOLDEN_FILE}`);
}
