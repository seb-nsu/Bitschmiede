// Headless-Lauf der KI-Welt 1980–2040 ohne Spieler (S08 MRK-T07, S14 KI-R58, KI-R80, S12 TEC-T05).
// Aufruf: npm run world -- [Seed] ; Bericht in reports/world.md.
import { writeFileSync } from "node:fs";
import { loadBaseData } from "../src/mods/loadBase";
import { DEFAULT_SETTINGS, newGame } from "../src/sim/game";
import { advance } from "../src/sim/tick";
import { competitionDensity } from "../src/sim/systems/markt";
import { marketQNorm } from "../src/sim/systems/produkte/release";
import { topShare } from "../src/sim/systems/ki/rangliste";
import { liveStudios, monthlyCost, studioPeople } from "../src/sim/systems/ki/studios";

const data = loadBaseData();
const seed = process.argv[2] ?? "00000000000000a1";
let s = newGame(data, seed, DEFAULT_SETTINGS);
// Der Spieler bleibt untätig und kann nicht pleitegehen.
s.moneyCent = 1e15;
const rows: string[] = [];
const t0 = performance.now();
let lastProducts = 0;
// MRK-R19, Datenblatt Abschnitt 5: Launch-Titel je Plattform (Ziel 12–20 bei einer großen Konsole).
const launchTitles: string[] = [];
// KI-T15: Zeit je Tick; KI-T19: Studios, die je Jahrzehnt am Markt waren; MRK-T07: kleinste und größte Zahl.
const tickMs: number[] = [];
const seenByDecade: Record<string, Set<number>> = {};
let minStudios = Infinity;
let maxStudios = 0;
for (let w = 0; w < 60 * 52; w++) {
  const t1 = performance.now();
  s = advance(s, data);
  tickMs.push(performance.now() - t1);
  const decade = String(1980 + Math.floor(w / 520) * 10);
  const liveNow = liveStudios(s);
  minStudios = Math.min(minStudios, liveNow.length);
  maxStudios = Math.max(maxStudios, liveNow.length);
  const seen = (seenByDecade[decade] ??= new Set());
  for (const x of liveNow) seen.add(x.id);
  for (const [id, sc] of Object.entries(s.makers.schedules)) {
    if (s.week !== sc.launchWeek + data.makers.launchWeeks) continue;
    const n = s.ai.products.filter((p) => p.platforms.includes(id) && p.releaseWeek >= sc.launchWeek && p.releaseWeek < s.week).length;
    launchTitles.push(`${id} ${n}`);
  }
  if (w % 260 !== 259) continue;
  const year = 1980 + Math.floor((w + 1) / 52);
  const live = liveStudios(s);
  const releases = s.ai.nextProductId - 1 - lastProducts;
  lastProducts = s.ai.nextProductId - 1;
  const revenue = live.reduce((a, x) => a + (x.revenueByYear[1] ?? 0), 0);
  const cost = live.reduce((a, x) => a + 12 * monthlyCost(s, data, x), 0);
  const projects = s.ai.studios.flatMap((x) => x.teams.map((tm) => tm.project)).filter((p) => p !== null);
  const licensed = projects.length === 0 ? 0 : (100 * projects.filter((p) => p!.contractId !== null).length) / projects.length;
  const engines = s.licensing.engines.filter((e) => !e.closed && e.model !== "hausintern").length;
  const contracts = s.licensing.contracts.filter((c) => c.status !== "beendet").length;
  const trust = s.licensing.engines.filter((e) => !e.closed && e.ownerId !== 0).map((e) => Math.round(e.trustBp / 100)).join("/");
  rows.push(`| ${year} | ${licensed.toFixed(0)} % | ${engines} | ${contracts} | ${trust} | ${live.length} | ${live.reduce((a, x) => a + studioPeople(x), 0)} | ${releases} | ${(competitionDensity(s, data, s.week) / 10000).toFixed(1)} | ${(s.qNorm.klein / 10000).toFixed(0)} / ${(marketQNorm(data, s, "klein", year) / 10000).toFixed(0)} | ${(topShare(s, data) / 100).toFixed(1)} % | ${(revenue / Math.max(1, cost)).toFixed(1)} |`);
}
const ms = (performance.now() - t0) / (60 * 52);
const closures = Object.entries(s.ai.closures).map(([d, n]) => `${d}er: ${n} von ${seenByDecade[d]?.size ?? 0} (${Math.round((100 * n) / Math.max(1, seenByDecade[d]?.size ?? 0))} %)`).join(", ") || "keine";
const sortedMs = [...tickMs].sort((a, b) => a - b);
const medianMs = sortedMs[Math.floor(sortedMs.length / 2)]!;
const worstMs = sortedMs[sortedMs.length - 1]!;
// LIZ-MT11: Markenlizenzen zwischen KI-Studios und Marken, die die KI gegründet hat.
const aiLicenses = s.brandMarket.licenses.filter((l) => l.licenseeId !== 0 && l.ownerId !== 0).length;
const aiBrands = s.brands.filter((b) => b.ownerId !== 0).length;
const report = [
  `# KI-Welt 1980–2040 ohne Spieler (Seed ${seed})`, "",
  "| Jahr | Lizenz-Anteil | Engines im Markt | Verträge | Vertrauen | Studios | Personen | Releases (5 J.) | Konkurrenzdichte | Q_erw klein (Median / Referenz) | größter Marktanteil | Umsatz / Kosten |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ...rows, "",
  `Pleiten je Jahrzehnt: ${closures} (KI-R58, KI-T19: Ziel 5–20 % der Studios, die im Jahrzehnt am Markt waren).`, "",
  `KI-Studios zwischen ${minStudios} und ${maxStudios} (MRK-T07: 20–60).`, "",
  `Markenmarkt: ${aiBrands} Marken in KI-Hand, ${aiLicenses} Markenlizenzen unter KI-Studios (LIZ-MT11: im Mittel mindestens 5).`, "",
  `Launch-Titel der KI je Plattform (MRK-R19, Datenblatt: 12–20 bei einer großen Konsole): ${launchTitles.join(", ")}.`, "",
  `Ø ${ms.toFixed(2)} ms je Wochen-Tick inklusive KI, Median ${medianMs.toFixed(2)} ms, schlechtester Tick ${worstMs.toFixed(1)} ms (KI-R80, KI-T15: höchstens 12 ms Median und 25 ms im schlechtesten Tick für die KI; TEC-T05: Lauf in höchstens 60 s, hier ${((ms * 60 * 52) / 1000).toFixed(1)} s).`, "",
].join("\n");
writeFileSync("reports/world.md", report);
console.log(report);
