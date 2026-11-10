// Spielstand für Tests und den UI-Durchlauf: ein Bot spielt bis zum Jahr, das Ergebnis lässt sich unter
// „Spielstände → Importieren“ laden. Aufruf: npm run playsave -- <strategie> <jahr> <datei.json.gz> [seed]
import { gzipSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { loadBaseData } from "../src/mods/loadBase";
import { newGame, DEFAULT_SETTINGS } from "../src/sim/game";
import { tick } from "../src/sim/tick";
import { createSave } from "../src/sim/save";
import { dateOf } from "../src/sim/calendar";
import type { Input } from "../src/sim/model/types";
import { botInputs, createBot, type StrategyId } from "./bots";
const [strategy, yearArg, out, seedArg] = process.argv.slice(2);
const data = loadBaseData();
const seed = seedArg ?? "00000000000000a1";
let s = newGame(data, seed, { ...DEFAULT_SETTINGS });
const bot = createBot(strategy as StrategyId, seed);
const log: { week: number; input: Input }[] = [];
while (dateOf(s.startYear, s.week).year < Number(yearArg) && !s.gameOver) {
  const inputs = botInputs(bot, data, s);
  for (const i of inputs) log.push({ week: s.week, input: i });
  s = tick(s, data, inputs);
}
writeFileSync(out!, gzipSync(JSON.stringify(createSave(s, data, log))));
console.log(out, dateOf(s.startYear, s.week).year, s.people.length, s.gameOver ?? "");
