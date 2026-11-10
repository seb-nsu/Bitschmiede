// Headless-Lauf 1980–2000 mit Bot-Strategien (S12 5.7 Balancing-Läufe, TEC-T05, TEC-T15, KRN-T11, KRN-T12, ZIE-R20).
// Schreibt reports/simulate.md und reports/simulate.json. Rechnet parallel in Worker-Threads.
// Aufruf: npm run simulate [-- --seeds 20 --years 20 --preset-seeds 20 --threads 4]
import { mkdirSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";
import { loadBaseData } from "../src/mods/loadBase";
import { newGame, DEFAULT_SETTINGS } from "../src/sim/game";
import { advance } from "../src/sim/tick";
import { ranking } from "../src/sim/systems/ki/rangliste";
import { hash32 } from "../src/sim/rng";
import { dateOf } from "../src/sim/calendar";
import { subsidiaries } from "../src/sim/systems/uebernahmen";
import { botInputs, createBot, netWorth, STRATEGIES, type StrategyId } from "./bots";

/** ZIE-R20: Presets vergleichen ein durchschnittlicher und ein guter Spieler (gute Bots überleben Entspannt bis Normal immer). */
const PRESET_STRATEGIES: StrategyId[] = ["durchschnitt", "vernuenftig"];

interface Job {
  strategy: StrategyId;
  seed: string;
  seedIndex: number;
  preset: string;
  weeks: number;
}

interface YearRow {
  year: number;
  netWorth: number;
  people: number;
  office: string;
  incomeCent: number;
  contractIncomeCent: number;
  releases: number;
  /** Neue Entscheidungen im Jahr: alle, Welt-Angebote, Pflicht (Projekt-Ereignisse und Krisen). */
  offers: number;
  world: number;
  mandatory: number;
  /** Wochen ohne neue Entscheidung (S01 5.2). */
  quietWeeks: number;
  /** 4b.7: Kasse am Jahresende und laufende Kosten je Monat (Löhne, Miete, Zinsen, Lager, Sonstiges) im Jahr. */
  cashCent: number;
  monthlyCostCent: number;
}

/** 4b.7: laufende Monatskosten eines Jahres aus dem Kassenbuch (es hält die letzten 60 Monate). */
function closeYear(row: YearRow, state: { moneyCent: number; finance: { ledger: { year: number; costs: Record<string, number> }[] } }): void {
  const months = state.finance.ledger.filter((m) => m.year === row.year);
  const run = months.map((m) => (m.costs.wages ?? 0) + (m.costs.rent ?? 0) + (m.costs.interest ?? 0) + (m.costs.storage ?? 0) + (m.costs.other ?? 0) + (m.costs.server ?? 0));
  row.cashCent = state.moneyCent;
  row.monthlyCostCent = run.length > 0 ? run.reduce((a, b) => a + b, 0) / run.length : 0;
}

interface RunResult {
  job: Job;
  insolvent: boolean;
  insolventYear: number | null;
  years: YearRow[];
  scores: { year: number; scoreBp: number; scope: string; type: string }[];
  finalNetWorth: number;
  totalIncomeCent: number;
  /** KI-T13, KI-T14: Platz des Spielers nach Umsatz und Umsatz der besten KI-Firma am Ende (MRK-R37). */
  rank: number;
  bestAiCent: number;
  ticks: number;
  ms: number;
  /** Abschluss 1.0: genutzte Systeme (Börse, Töchter, Spieltests, Politur). */
  ipoYear: number | null;
  subsidiaries: number;
  playtests: number;
  polished: number;
}

function play(job: Job): RunResult {
  const data = loadBaseData();
  const started = performance.now();
  let state = newGame(data, job.seed, { ...DEFAULT_SETTINGS, preset: job.preset });
  const bot = createBot(job.strategy, job.seed);
  const years: YearRow[] = [];
  let row: YearRow | null = null;
  let ticks = 0;
  for (let w = 0; w < job.weeks && !state.gameOver; w++) {
    const y = dateOf(state.startYear, state.week).year;
    if (!row || row.year !== y) {
      if (row) closeYear(row, state);
      row = { year: y, netWorth: 0, people: 0, office: "", incomeCent: 0, contractIncomeCent: 0, releases: 0, offers: 0, world: 0, mandatory: 0, quietWeeks: 0, cashCent: 0, monthlyCostCent: 0 };
      years.push(row);
    }
    const week = state.week;
    state = advance(state, data, botInputs(bot, data, state));
    ticks += 1;
    // Neu sind Entscheidungen mit der Woche dieses Ticks; der Bot beantwortet sie erst im nächsten Tick.
    const fresh = state.events.filter((e) => e.createdWeek === week);
    const created = fresh.length;
    row.offers += created;
    row.world += fresh.filter((e) => e.scope === "welt").length;
    // Pflicht: Entscheidungen, die das Projekt selbst verlangt (Reviews, Gate, Bug, Nachproduktion), und Krisen.
    row.mandatory += fresh.filter((e) => (e.scope === "projekt" && e.kind !== "katalog") || (e.defId !== undefined && data.catalog.events.find((d) => d.id === e.defId)?.forced)).length;
    if (created === 0) row.quietWeeks += 1;
    row.netWorth = netWorth(state);
    row.people = state.people.length;
    row.office = state.office.id;
  }
  if (row && !state.gameOver) closeYear(row, state);
  for (const yb of state.yearbooks) {
    const r = years.find((x) => x.year === yb.year);
    if (r) {
      r.incomeCent = yb.incomeCent;
      r.releases = yb.releases.length;
    }
  }
  for (const r of years) {
    r.contractIncomeCent = state.finance.ledger.filter((m) => m.year === r.year).reduce((s, m) => s + m.income.contracts, 0);
  }
  const table = ranking(state, data, "");
  const rank = table.findIndex((e) => e.player) + 1;
  const bestAiCent = table.find((e) => !e.player)?.revenueCent ?? 0;
  const scores = state.projects.filter((p) => p.result).map((p) => ({ year: p.result!.year, scoreBp: p.result!.scoreBp, scope: p.scope, type: p.type }));
  return {
    job, insolvent: state.gameOver !== null,
    insolventYear: state.gameOver ? dateOf(state.startYear, state.gameOver.week).year : null,
    years, scores, finalNetWorth: netWorth(state),
    totalIncomeCent: state.yearbooks.reduce((s, y) => s + y.incomeCent, 0),
    rank, bestAiCent,
    ticks, ms: performance.now() - started,
    ipoYear: state.stock.ipoWeek !== null ? dateOf(state.startYear, state.stock.ipoWeek).year : null,
    subsidiaries: subsidiaries(state, 0).length,
    playtests: state.projects.reduce((a, p) => a + p.playtests.length, 0),
    polished: state.projects.filter((p) => p.polishArea !== null).length,
  };
}

// ---------- Auswertung ----------

function quantile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

const usd = (cent: number) => Math.round(cent / 100).toLocaleString("de-DE");
const pct = (x: number) => `${(x * 100).toFixed(0)} %`;
const score = (bp: number) => (bp / 10000).toFixed(2);

function yearValue(r: RunResult, year: number, pick: (y: YearRow) => number): number | null {
  const row = r.years.find((y) => y.year === year);
  if (row) return pick(row);
  return null;
}

function report(results: RunResult[], opts: { seeds: number; years: number; presetSeeds: number; secs: number; threads: number }, data: ReturnType<typeof loadBaseData>): string[] {
  const main = results.filter((r) => r.job.preset === "normal");
  const startYear = 1980;
  const endYear = startYear + opts.years;
  const lines: string[] = [
    `# Headless-Lauf ${startYear}–${endYear} (Schwierigkeit Normal)`, "",
    `Daten ${data.modId} ${data.modVersion} (Prüfsumme ${data.checksum}) · ${opts.seeds} Seeds je Strategie · ${opts.presetSeeds} Seeds je Preset · ` +
    `${results.length} Läufe, ${results.reduce((s, r) => s + r.ticks, 0)} Wochen-Ticks · ${opts.secs.toFixed(1)} s mit ${opts.threads} Threads ` +
    `(TEC-T05: ≤ 60 s für 1980–2040)`, "",
    "Strategien (S12 5.7, soweit Etappe 2 sie kennt): **vernünftig** (ausgewogen, Aufträge nur mit freien Leuten, eigene Engine ab 3 Personen), **wachstum** (schnell einstellen, " +
    "mittlere Projekte, mehrere Plattformen), **gierig** (kurzfristiger Gewinn: kleine Spiele ohne Test, alle Aufträge, kleines Team, „nur Lizenzen“: Module vom Middleware-Anbieter), " +
    "**auftraege** (Auftragsstudio mit nebenher kleinen Spielen, Starter-Engine), **durchschnitt** (wie vernünftig, Karten nach Gefühl, Engine-Team ab 5 Personen, lizenziert Module, an denen es nicht forscht), **zufall**, **mmo** (wie wachstum, mittlere Projekte als Live-Produkt, sobald Typ und Engine es erlauben), **konzern** (wie wachstum, Börsengang sobald möglich, kauft bis zu drei kleine Studios). Nur Sequels folgen mit ihrem System.", "",
  ];

  // 1 Überblick
  lines.push("## Überblick je Strategie", "");
  const checkYears = [1985, 1990, 1995, endYear - 1];
  lines.push(`| Strategie | insolvent | ${checkYears.map((y) => `Firmenwert ${y} (Median)`).join(" | ")} | Personen ${endYear - 1} | Etage bis 1990 | Releases | Wertung Ø | Aufträge am Umsatz |`);
  lines.push(`| --- | --- | ${checkYears.map(() => "---").join(" | ")} | --- | --- | --- | --- | --- |`);
  for (const s of STRATEGIES) {
    const rs = main.filter((r) => r.job.strategy === s);
    if (rs.length === 0) continue;
    const worth = checkYears.map((y) => usd(quantile(rs.map((r) => yearValue(r, y, (x) => x.netWorth) ?? 0), 0.5)));
    const people = quantile(rs.map((r) => yearValue(r, endYear - 1, (x) => x.people) ?? 0), 0.5);
    const etage = rs.filter((r) => r.years.some((y) => y.year <= 1990 && y.office === "etage")).length / rs.length;
    const releases = quantile(rs.map((r) => r.scores.length), 0.5);
    const sc = mean(rs.flatMap((r) => r.scores.map((x) => x.scoreBp)));
    const income = rs.reduce((a, r) => a + r.years.reduce((b, y) => b + y.incomeCent, 0), 0);
    const contracts = rs.reduce((a, r) => a + r.years.reduce((b, y) => b + y.contractIncomeCent, 0), 0);
    lines.push(`| ${s} | ${pct(rs.filter((r) => r.insolvent).length / rs.length)} | ${worth.join(" | ")} | ${people} | ${pct(etage)} | ${releases} | ${score(sc)} | ${income > 0 ? pct(contracts / income) : "–"} |`);
  }
  lines.push("", "Firmenwert = Kasse − Kredite (in USD, nominal). Zielkorridor 1980er laut Design „Spielerreise“: 50.000 bis 2 Mio. USD, 2–15 Personen. " +
    "Die 1990er (15–60 Personen, 2–20 Mio.) sind bis Etappe 2 nicht erreichbar, weil Teams ab 8 Personen erst in Etappe 3 kommen.", "");

  // 1a Genutzte Systeme (Abschluss 1.0)
  lines.push("## Genutzte Systeme", "");
  lines.push("| Strategie | Börsengang | Jahr (Median) | Töchter am Ende (Median) | Spieltests je Release | Releases mit Politur |", "| --- | --- | --- | --- | --- | --- |");
  for (const s of STRATEGIES) {
    const rs = main.filter((r) => r.job.strategy === s);
    if (rs.length === 0) continue;
    const ipo = rs.filter((r) => r.ipoYear !== null);
    const rel = rs.reduce((a, r) => a + r.scores.length, 0);
    lines.push(`| ${s} | ${pct(ipo.length / rs.length)} | ${ipo.length > 0 ? quantile(ipo.map((r) => r.ipoYear!), 0.5) : "–"} | ${quantile(rs.map((r) => r.subsidiaries), 0.5)} | ` +
      `${rel > 0 ? (rs.reduce((a, r) => a + r.playtests, 0) / rel).toFixed(2) : "–"} | ${rel > 0 ? pct(rs.reduce((a, r) => a + r.polished, 0) / rel) : "–"} |`);
  }
  lines.push("");

  // 1b Kasse in Monatskosten (4b.7)
  lines.push("## Kasse in Monatskosten (4b.7: Geld, das bis 2040 etwas bedeutet)", "");
  lines.push("Kasse am Ende des Jahrzehnts geteilt durch die laufenden Kosten eines Monats (Löhne, Miete, Zinsen, Lager, Sonstiges), Median der überlebenden Läufe. " +
    "Ziel (Abnahme 4b, Punkt 6): für „vernünftig“ höchstens 24 Monate, sonst bedeutet Geld nichts mehr.", "");
  const decadeEnds: number[] = [];
  for (let y = startYear + 9; y < endYear; y += 10) decadeEnds.push(y);
  if (decadeEnds[decadeEnds.length - 1] !== endYear - 1) decadeEnds.push(endYear - 1);
  lines.push(`| Strategie | ${decadeEnds.map((y) => `${y}`).join(" | ")} |`, `| --- | ${decadeEnds.map(() => "---").join(" | ")} |`);
  for (const s of STRATEGIES) {
    const rs = main.filter((r) => r.job.strategy === s);
    if (rs.length === 0) continue;
    lines.push(`| ${s} | ${decadeEnds.map((y) => {
      const v = rs.map((r) => r.years.find((x) => x.year === y)).filter((x): x is YearRow => !!x && x.monthlyCostCent > 0).map((x) => x.cashCent / x.monthlyCostCent);
      if (v.length === 0) return "–";
      const m = quantile(v, 0.5);
      return `${m.toFixed(1)}${s === "vernuenftig" && m > 24 ? " 🔴" : ""} (${v.length})`;
    }).join(" | ")} |`);
  }
  lines.push("");

  // 2 Sieger
  lines.push("## Sieger je Seed (S12 5.7, A17: keine Strategie über 60 %)", "");
  const wins: Record<string, number> = {};
  for (let i = 0; i < opts.seeds; i++) {
    const contenders = main.filter((r) => r.job.seedIndex === i && !r.insolvent);
    const best = contenders.sort((a, b) => b.finalNetWorth - a.finalNetWorth)[0];
    if (best) wins[best.job.strategy] = (wins[best.job.strategy] ?? 0) + 1;
  }
  lines.push("| Strategie | Siege | Anteil |", "| --- | --- | --- |");
  for (const s of STRATEGIES) {
    const share = (wins[s] ?? 0) / opts.seeds;
    lines.push(`| ${s} | ${wins[s] ?? 0} | ${pct(share)}${share > 0.6 ? " 🔴" : ""} |`);
  }
  lines.push("");

  // 3 Entscheidungsdichte
  lines.push("## Entscheidungen (S01 5.2, KRN-T11, KRN-T12, TEC-T15)", "");
  lines.push("Wochen ohne neue Entscheidung in den 1980ern je Seed (Ziel unter 60 %), Angebote und Pflicht-Entscheidungen pro Jahr (1980er: 15–25 Angebote, davon 8–12 Pflicht).", "");
  lines.push("| Strategie | ohne Entscheidung Ø | schlechtester Seed | Seeds über 60 % | Angebote/Jahr 1980er | Welt/Jahr 1980er | Pflicht/Jahr 1980er | Angebote/Jahr 1990er | Pflicht/Jahr 1990er |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const s of STRATEGIES) {
    const rs = main.filter((r) => r.job.strategy === s);
    if (rs.length === 0) continue;
    const decade = (r: RunResult, from: number) => r.years.filter((y) => y.year >= from && y.year < from + 10);
    const quiet = rs.map((r) => {
      const ys = decade(r, 1980);
      const weeks = ys.length * 52;
      return weeks > 0 ? ys.reduce((a, y) => a + y.quietWeeks, 0) / weeks : 1;
    });
    const perYear = (from: number, pick: (y: YearRow) => number) => mean(rs.flatMap((r) => decade(r, from).map(pick)));
    const over = quiet.filter((q) => q >= 0.6).length;
    lines.push(`| ${s} | ${pct(mean(quiet))}${mean(quiet) >= 0.6 ? " 🔴" : ""} | ${pct(Math.max(...quiet))} | ${over} von ${rs.length}${over > 0 ? " 🔴" : ""} | ` +
      `${perYear(1980, (y) => y.offers).toFixed(1)} | ${perYear(1980, (y) => y.world).toFixed(1)} | ${perYear(1980, (y) => y.mandatory).toFixed(1)} | ${perYear(1990, (y) => y.offers).toFixed(1)} | ${perYear(1990, (y) => y.mandatory).toFixed(1)} |`);
  }
  lines.push("", "Gezählt werden neue Entscheidungen der Woche (Welt-Angebote, Projekt-Ereignisse, Gates, Krisen); Pflicht = Reviews, Gate, kritischer Bug, Nachproduktion und Krisen. " +
    "Der Bot antwortet sofort; im Spiel hält jede offene Entscheidung die Zeit an (UI-R66).", "");

  // 4 Wertung über die Zeit
  lines.push("## Wertung über die Zeit (Design „Balancing“: stabil, steigt nicht endlos)", "");
  const buckets: [number, number][] = [];
  for (let y = startYear; y < endYear; y += 5) buckets.push([y, Math.min(endYear, y + 5)]);
  lines.push(`| Strategie | ${buckets.map(([a, b]) => `${a}–${b - 1}`).join(" | ")} |`, `| --- | ${buckets.map(() => "---").join(" | ")} |`);
  for (const s of STRATEGIES) {
    const rs = main.filter((r) => r.job.strategy === s);
    if (rs.length === 0) continue;
    lines.push(`| ${s} | ${buckets.map(([a, b]) => {
      const v = rs.flatMap((r) => r.scores.filter((x) => x.year >= a && x.year < b).map((x) => x.scoreBp));
      return v.length > 0 ? `${score(mean(v))} (${v.length})` : "–";
    }).join(" | ")} |`);
  }
  lines.push("");

  // 5 Verteilung (vernünftig)
  const reasonable = main.filter((r) => r.job.strategy === "vernuenftig").flatMap((r) => r.scores.map((x) => x.scoreBp));
  if (reasonable.length > 0) {
    lines.push("## Verteilung der Wertungen (vernünftig; Startauftrag: Mittelwert um 6, Spanne 3–9)", "");
    const inRange = reasonable.filter((x) => x >= 30000 && x <= 90000).length / reasonable.length;
    lines.push(`Releases ${reasonable.length} · Mittelwert **${score(mean(reasonable))}** · 5 % ${score(quantile(reasonable, 0.05))} · Median ${score(quantile(reasonable, 0.5))} · 95 % ${score(quantile(reasonable, 0.95))} · in 3–9: ${pct(inRange)}`, "");
    lines.push("| Wertung | Anteil |", "| --- | --- |");
    for (let b = 1; b <= 10; b++) {
      const c = reasonable.filter((x) => (b === 10 ? x >= 100000 : x >= b * 10000 && x < (b + 1) * 10000)).length / reasonable.length;
      lines.push(`| ${b}${b < 10 ? `–${b + 1}` : ""} | ${"█".repeat(Math.round(c * 60))} ${(c * 100).toFixed(1)} % |`);
    }
    lines.push("");
  }

  // 6 Presets
  if (opts.presetSeeds > 0) lines.push("## Schwierigkeit (ZIE-R20: Insolvenzquote und Median-Umsatz streng monoton)", "");
  for (const strategy of opts.presetSeeds > 0 ? PRESET_STRATEGIES : []) {
    const presetRuns = results.filter((r) => r.job.strategy === strategy && r.job.seedIndex < opts.presetSeeds);
    lines.push(`Strategie **${strategy}**, gleiche ${opts.presetSeeds} Seeds je Preset; Umsatz = Einnahmen über den ganzen Lauf.`, "");
    lines.push("| Preset | insolvent | Median-Umsatz | Median-Firmenwert am Ende | unter den Top 3 am Ende (KI-T13) | beste KI-Firma, Median-Umsatz (KI-T14) |", "| --- | --- | --- | --- | --- | --- |");
    const order = data.presets.map((p) => p.id);
    const rows = order.map((id) => {
      const rs = presetRuns.filter((r) => r.job.preset === id);
      return {
        id, insolvency: rs.filter((r) => r.insolvent).length / Math.max(1, rs.length), revenue: quantile(rs.map((r) => r.totalIncomeCent), 0.5),
        worth: quantile(rs.map((r) => r.finalNetWorth), 0.5), top3: rs.filter((r) => !r.insolvent && r.rank <= 3).length / Math.max(1, rs.length),
        bestAi: quantile(rs.map((r) => r.bestAiCent), 0.5),
      };
    });
    for (const r of rows) lines.push(`| ${r.id} | ${pct(r.insolvency)} | ${usd(r.revenue)} | ${usd(r.worth)} | ${pct(r.top3)} | ${usd(r.bestAi)} |`);
    const strictInsolvency = rows.every((r, i) => i === 0 || r.insolvency > rows[i - 1]!.insolvency);
    const monoInsolvency = rows.every((r, i) => i === 0 || r.insolvency >= rows[i - 1]!.insolvency);
    const monoRevenue = rows.every((r, i) => i === 0 || r.revenue < rows[i - 1]!.revenue);
    lines.push("", `Insolvenzquote streng steigend: **${strictInsolvency ? "ja" : monoInsolvency ? "nicht fallend" : "nein"}**${monoInsolvency ? "" : " 🔴"} · ` +
      `Median-Umsatz streng fallend: **${monoRevenue ? "ja" : "nein"}**${monoRevenue ? "" : " 🔴"}`, "");
  }

  // 7 Leistung
  const tickMs = results.reduce((s, r) => s + r.ms, 0) / Math.max(1, results.reduce((s, r) => s + r.ticks, 0));
  lines.push("## Leistung (S12 5.6)", "", `Ø ${tickMs.toFixed(2)} ms je Wochen-Tick inklusive Bot (KRN-T10: ≤ 50 ms im Jahr 2040 mit KI-Studios). Einzelmessung: \`npm run bench\`.`, "");
  return lines;
}

// ---------- Ablauf ----------

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

function seedFor(i: number): string {
  return hash32(`sim${i}`).toString(16).padStart(8, "0") + hash32(`seed${i}`).toString(16).padStart(8, "0");
}

function jobs(seeds: number, years: number, presetSeeds: number, presets: string[]): Job[] {
  const out: Job[] = [];
  // 4b.7: --strategies vernuenftig,gierig beschränkt einen Prüflauf auf einzelne Strategien.
  const i = process.argv.indexOf("--strategies");
  const only = i >= 0 ? new Set(process.argv[i + 1]!.split(",")) : null;
  for (const strategy of STRATEGIES.filter((x) => !only || only.has(x))) {
    for (let i = 0; i < seeds; i++) out.push({ strategy, seed: seedFor(i), seedIndex: i, preset: "normal", weeks: years * 52 });
  }
  for (const strategy of PRESET_STRATEGIES) {
    for (const preset of presets.filter((p) => p !== "normal")) {
      for (let i = 0; i < presetSeeds; i++) out.push({ strategy, seed: seedFor(i), seedIndex: i, preset, weeks: years * 52 });
    }
  }
  return out;
}

async function runParallel(list: Job[], threads: number): Promise<RunResult[]> {
  const results: RunResult[] = new Array(list.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(threads, list.length) }, () => new Promise<void>((resolve, reject) => {
    // Der Worker lädt diese Datei über die Programmier-Schnittstelle von tsx, damit TypeScript auch dort läuft.
    const boot = `import("tsx/esm/api").then((m) => { m.register(); return import(${JSON.stringify(import.meta.url)}); });`;
    const w = new Worker(boot, { eval: true, workerData: { worker: true } });
    const feed = () => {
      if (next >= list.length) {
        void w.terminate();
        resolve();
        return;
      }
      const index = next++;
      w.postMessage({ index, job: list[index] });
    };
    w.on("message", (msg: { index: number; result: RunResult }) => {
      results[msg.index] = msg.result;
      feed();
    });
    w.on("error", reject);
    feed();
  }));
  await Promise.all(workers);
  return results;
}

async function main(): Promise<void> {
  const seeds = arg("seeds", 20);
  const years = arg("years", 20);
  const presetSeeds = Math.min(seeds, arg("preset-seeds", 20));
  const threads = arg("threads", Math.max(1, Math.min(8, cpus().length)));
  const data = loadBaseData();
  const started = performance.now();
  const list = jobs(seeds, years, presetSeeds, data.presets.map((p) => p.id));
  const results = threads > 1 ? await runParallel(list, threads) : list.map(play);
  const secs = (performance.now() - started) / 1000;
  const lines = report(results, { seeds, years, presetSeeds, secs, threads }, data);
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "reports");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "simulate.md"), lines.join("\n"));
  writeFileSync(join(dir, "simulate.json"), JSON.stringify(results.map((r) => ({ ...r, ms: undefined }))));
  console.log(lines.join("\n"));
  console.log(`\nBericht: reports/simulate.md (${secs.toFixed(1)} s)`);
}

if (!isMainThread && (workerData as { worker?: boolean } | null)?.worker) {
  parentPort!.on("message", (msg: { index: number; job: Job }) => parentPort!.postMessage({ index: msg.index, result: play(msg.job) }));
} else {
  void main();
}
