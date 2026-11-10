// Zählt neue Ereignisse je Art in den 1980ern für eine Bot-Strategie (Prüfhilfe Balancing).
import { loadBaseData } from "../src/mods/loadBase";
import { newGame, DEFAULT_SETTINGS } from "../src/sim/game";
import { tick } from "../src/sim/tick";
import { dateOf } from "../src/sim/calendar";
import { botInputs, createBot, type StrategyId } from "./bots";
const [strategy, toYear, ...seeds] = process.argv.slice(2);
const data = loadBaseData();
const counts: Record<string, number> = {};
for (const seed of seeds.length ? seeds : ["00000000000000a1", "00000000000000a2", "00000000000000a3"]) {
  let s = newGame(data, seed, { ...DEFAULT_SETTINGS });
  const bot = createBot(strategy as StrategyId, seed);
  let seen = s.nextEventId;
  while (dateOf(s.startYear, s.week).year < Number(toYear) && !s.gameOver) {
    s = tick(s, data, botInputs(bot, data, s));
    for (const e of [...s.events, ...s.eventQueue]) if (e.id >= seen) { const k = e.kind === "katalog" ? `katalog.${e.defId}` : e.kind; counts[k] = (counts[k] ?? 0) + 1; }
    seen = s.nextEventId;
  }
}
const n = seeds.length || 3;
const years = Number(toYear) - 1980;
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(k.padEnd(28), (v / n / years).toFixed(2));
