// Leistungsmessung (S12 5.6, TEC-R50, TEC-T03, TEC-T04 in der Etappe-1-Form): Benchmark-Spielstand 2000 aus einem
// Bot-Lauf, dann 200 Wochen-Ticks, Speichern und Laden. Vergleicht mit reports/bench-baseline.json (lokal, nicht im
// Repository, weil maschinenabhängig) und scheitert bei mehr als 15 % Verschlechterung des Medians.
// Aufruf: npm run bench [-- --update] [-- --late]   (--update schreibt die Vergleichsbasis neu; --late misst das Spätspiel:
// Bot „konzern“ bis 2035, Benchmark-Spielstand nahe TEC-T03, eigene Vergleichsbasis; dauert etwa eine Minute länger)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { loadBaseData } from "../src/mods/loadBase";
import { newGame } from "../src/sim/game";
import { tick } from "../src/sim/tick";
import { isFirstWeekOfMonth } from "../src/sim/calendar";
import { createSave, loadSave } from "../src/sim/save";
import { botInputs, createBot } from "./bots";

const SEED = "00000000be0c4000";
const LATE = process.argv.includes("--late");
const WARMUP_YEARS = LATE ? 55 : 20;
const STRATEGY = LATE ? "konzern" : "wachstum";
const TICKS = 200;
/** TEC-R50: erlaubte Verschlechterung gegenüber der Vergleichsbasis. */
const TOLERANCE = 1.15;

interface BenchResult {
  medianMs: number;
  p95Ms: number;
  monthlyMedianMs: number;
  saveBytes: number;
  saveGzipBytes: number;
  loadMs: number;
  projects: number;
}

function quantile(values: number[], p: number): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
}

function bench(): BenchResult {
  const data = loadBaseData();
  let state = newGame(data, SEED);
  const bot = createBot(STRATEGY, SEED);
  for (let w = 0; w < WARMUP_YEARS * 52; w++) state = tick(state, data, botInputs(bot, data, state));
  const all: number[] = [];
  const monthly: number[] = [];
  for (let i = 0; i < TICKS; i++) {
    const inputs = botInputs(bot, data, state);
    const monthJob = isFirstWeekOfMonth(state.startYear, state.week);
    const t0 = performance.now();
    state = tick(state, data, inputs);
    const ms = performance.now() - t0;
    all.push(ms);
    if (monthJob) monthly.push(ms);
  }
  const json = JSON.stringify(createSave(state, data, []));
  const t0 = performance.now();
  loadSave(JSON.parse(json), data);
  const loadMs = performance.now() - t0;
  return {
    medianMs: quantile(all, 0.5), p95Ms: quantile(all, 0.95), monthlyMedianMs: quantile(monthly, 0.5),
    saveBytes: json.length, saveGzipBytes: gzipSync(json).byteLength, loadMs, projects: state.projects.length,
  };
}

function main(): void {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "reports");
  mkdirSync(dir, { recursive: true });
  const baselineFile = join(dir, LATE ? "bench-late-baseline.json" : "bench-baseline.json");
  const r = bench();
  const lines = [
    LATE ? "# Leistungsmessung Spätspiel" : "# Leistungsmessung (Etappe 1)", "",
    `Benchmark-Spielstand: Bot „${STRATEGY}“, Seed ${SEED}, ${WARMUP_YEARS} Jahre (Jahr ${1980 + WARMUP_YEARS}, ${r.projects} Projekte), danach ${TICKS} Wochen-Ticks.`, "",
    "| Kennzahl | Wert | Ziel (S12 5.6, für 2040 mit KI-Studios) |", "| --- | --- | --- |",
    `| Wochen-Tick Median | ${r.medianMs.toFixed(2)} ms | ≤ 50 ms (TEC-T03) |`,
    `| Wochen-Tick 95 % | ${r.p95Ms.toFixed(2)} ms | – |`,
    `| Tick mit Monatsjobs Median | ${r.monthlyMedianMs.toFixed(2)} ms | ≤ 150 ms (TEC-T03) |`,
    `| Spielstand | ${(r.saveBytes / 1024).toFixed(0)} KB, gzip ${(r.saveGzipBytes / 1024).toFixed(0)} KB | ≤ 5 MB (TEC-T04) |`,
    `| Laden (Prüfen und Migrieren) | ${r.loadMs.toFixed(1)} ms | ≤ 3 s (TEC-T04) |`, "",
  ];
  let failed = false;
  if (process.argv.includes("--update") || !existsSync(baselineFile)) {
    writeFileSync(baselineFile, JSON.stringify(r, null, 2));
    lines.push(`Vergleichsbasis geschrieben: reports/${LATE ? "bench-late-baseline.json" : "bench-baseline.json"}.`);
  } else {
    const base = JSON.parse(readFileSync(baselineFile, "utf8")) as BenchResult;
    const ratio = r.medianMs / base.medianMs;
    failed = ratio > TOLERANCE;
    lines.push(`Gegenüber der Vergleichsbasis: Median ${(ratio * 100).toFixed(0)} % (TEC-R50: höchstens ${(TOLERANCE * 100).toFixed(0)} %)${failed ? " 🔴" : ""}.`);
  }
  writeFileSync(join(dir, LATE ? "bench-late.md" : "bench.md"), lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  if (failed) process.exit(1);
}

main();
