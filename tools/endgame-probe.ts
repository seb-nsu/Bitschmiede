// Prüfhilfe Endgame-Themen: Herausforderungen und Krisen einer Bot-Partie
// (npx tsx tools/endgame-probe.ts <strategie> <bisJahr> [seed]).
import { loadBaseData } from "../src/mods/loadBase";
import { newGame, DEFAULT_SETTINGS } from "../src/sim/game";
import { tick } from "../src/sim/tick";
import { dateOf } from "../src/sim/calendar";
import { playerRankEntry } from "../src/sim/systems/endspiel";
import { botInputs, createBot, type StrategyId } from "./bots";
const [strategy, toYear, seedArg] = process.argv.slice(2);
const data = loadBaseData();
const seed = seedArg ?? "00000000000000a1";
let s = newGame(data, seed, { ...DEFAULT_SETTINGS, endYear: 2100 });
const bot = createBot(strategy as StrategyId, seed);
const crises: string[] = [];
const seen = new Set<number>();
let lastYear = 0;
while (dateOf(s.startYear, s.week).year < Number(toYear) && !s.gameOver) {
  s = tick(s, data, botInputs(bot, data, s));
  for (const e of s.events) {
    if (seen.has(e.id) || !e.defId || !["kartellverfahren", "datenleck", "massenkuendigung", "speicherkrise", "stromkrise"].includes(e.defId)) continue;
    seen.add(e.id);
    crises.push(`${dateOf(s.startYear, s.week).year}:${e.defId}`);
  }
  const y = dateOf(s.startYear, s.week).year;
  if (y !== lastYear && y % 5 === 0) {
    lastYear = y;
    const r = playerRankEntry(s, data);
    console.log(y, "rank", r.rank, "share", r.shareBp, "people", s.people.length, "cash", Math.round(s.moneyCent / 100));
  }
}
const g = s.endgame;
console.log("challenges", g.challenges.map((c) => `${c.id}:${c.status}${c.doneWeek !== null ? "@" + dateOf(s.startYear, c.doneWeek).year : ""}`).join(" "), "hall", g.hallPoints);
console.log("rankOneYears", g.rankOneYears, "lastFine", Math.round(g.lastFineCent / 100), "crisesSurvived", g.crisesSurvived, "crises", crises.join(" "));
console.log("ending", s.ending?.reason, s.ending?.legacy.totalBp, "gameOver", JSON.stringify(s.gameOver));
