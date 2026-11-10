// 4b.8 Prüftest Lizenzmodell (Design-Dokument „Prüftest ab Etappe 3“, S04 Abschnitt 7, LIZ-R32, LIZ-T06):
// „Dein Engine-Anbieter erhöht die Royalty von 5 auf 12 %“ muss eine spürbare Reaktion auslösen.
// Ablauf je Seed: Spieler-Bot (vernünftig) arbeitet ab der Freischaltung mit der Lizenz-Engine des größten Anbieters.
// Im Prüfjahr erhöht dieser Anbieter die Royalty (+7 Punkte). Vier Arme laufen danach je fünf Jahre weiter:
// ohne Schock, akzeptieren, nachverhandeln, wechseln (eigene Engine bzw. Starter-Engine). Gemessen werden die
// Mehrkosten des Spielers, sein Firmenwert und die Reaktion der KI-Kunden (Wechsel weg vom Anbieter).
// Aufruf: npx tsx tools/prueftest-royalty.ts [-- --seeds 4 --year 1998 --years 5]; Bericht reports/prueftest-royalty.md.
import { mkdirSync, writeFileSync } from "node:fs";
import { loadBaseData } from "../src/mods/loadBase";
import { DEFAULT_SETTINGS, newGame } from "../src/sim/game";
import { tick } from "../src/sim/tick";
import { dateOf } from "../src/sim/calendar";
import { hash32 } from "../src/sim/rng";
import { priceShock, validatePlayerLicense } from "../src/sim/systems/lizenzen";
import type { GameData, GameState, Input } from "../src/sim/model/types";
import { botInputs, createBot, netWorth, type Bot } from "./bots";

type Arm = "ohne" | "akzeptieren" | "nachverhandeln" | "wechsel";
const ARMS: Arm[] = ["ohne", "akzeptieren", "nachverhandeln", "wechsel"];

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

/** Größter Anbieter nach laufenden Verträgen (ohne Spieler-Engine). */
function biggestEngine(state: GameState): number | null {
  const count = new Map<number, number>();
  for (const c of state.licensing.contracts) if (c.status !== "beendet") count.set(c.engineId, (count.get(c.engineId) ?? 0) + 1);
  const list = state.licensing.engines.filter((e) => e.ownerId !== 0).sort((a, b) => (count.get(b.id) ?? 0) - (count.get(a.id) ?? 0) || a.id - b.id);
  return list[0]?.id ?? null;
}

/** Der Bot nimmt für neue Projekte die Lizenz-Engine (Vorlage „standard“), solange der Arm sie nicht verlassen hat. */
function inputs(bot: Bot, data: GameData, state: GameState, engineId: number | null, decide: Arm | null): Input[] {
  const shock = state.events.find((x) => x.kind === "preisschock");
  const own: Input[] = shock && decide && decide !== "ohne" ? [{ type: "decide", eventId: shock.id, option: decide === "wechsel" ? "eigeneEngine" : decide }] : [];
  return [...own, ...botInputs(bot, data, state).filter((i) => !(shock && i.type === "decide" && i.eventId === shock.id))].flatMap((i): Input[] => {
    if (i.type === "createProject" && engineId !== null && !(i.productType && i.productType !== "standard")
      && validatePlayerLicense(state, data, engineId, "standard", i.genre, i.platforms) === null) {
      return [{ ...i, engine: `lizenz:${engineId}`, licenseTemplate: "standard" }];
    }
    return [i];
  });
}

interface Outcome { arm: Arm; royaltyCent: number; worth: number; customersBefore: number; customersAfter: number; switchedAway: number; playerOnLicense: boolean }

function customers(state: GameState, engineId: number): number {
  return state.licensing.contracts.filter((c) => c.engineId === engineId && c.status !== "beendet" && c.licenseeId !== 0).length;
}

function runSeed(data: GameData, seed: string, shockYear: number, years: number): { outcomes: Outcome[]; engine: string; royaltyBefore: number } | null {
  let state = newGame(data, seed, DEFAULT_SETTINGS);
  const bot = createBot("vernuenftig", seed);
  let engineId: number | null = null;
  while (dateOf(state.startYear, state.week).year < shockYear && !state.gameOver) {
    if (engineId === null && state.licensing.engines.length > 0 && dateOf(state.startYear, state.week).year >= 1988) engineId = biggestEngine(state);
    state = tick(state, data, inputs(bot, data, state, engineId, null));
  }
  if (state.gameOver || engineId === null) return null;
  const engine = state.licensing.engines.find((e) => e.id === engineId)!;
  const royaltyBefore = engine.templates.standard?.royaltyBp ?? 0;
  const outcomes: Outcome[] = [];
  for (const arm of ARMS) {
    let s = structuredClone(state);
    const b: Bot = structuredClone(bot);
    const before = customers(s, engineId);
    // KI-Kunden: Studios, die zum Schock mit der Engine arbeiten.
    const others = new Set(s.ai.studios.filter((x) => x.closedWeek === null && x.engineId === engineId).map((x) => x.id));
    if (arm !== "ohne") priceShock(s, data, s.licensing.engines.find((e) => e.id === engineId)!);
    let useLicense: number | null = engineId;
    for (let w = 0; w < years * 52 && !s.gameOver; w++) {
      if (arm === "wechsel" && s.events.every((e) => e.kind !== "preisschock")) useLicense = null;
      s = tick(s, data, inputs(b, data, s, useLicense, arm));
    }
    // Das Kassenbuch hält 60 Monate: Lizenzkosten der Monate seit dem Schock.
    const royalty = s.finance.ledger.slice(-years * 12).reduce((a, m) => a + m.costs.licenses, 0);
    const after = customers(s, engineId);
    const stayed = s.ai.studios.filter((x) => others.has(x.id) && x.closedWeek === null && x.engineId === engineId).length;
    const closed = s.ai.studios.filter((x) => others.has(x.id) && x.closedWeek !== null).length;
    const playerOnLicense = s.projects.some((p) => p.engine.id === `lizenz:${engineId}` && (p.status === "laeuft" || p.status === "bereit"));
    outcomes.push({ arm, royaltyCent: royalty, worth: netWorth(s), customersBefore: before, customersAfter: after, switchedAway: others.size - stayed - closed, playerOnLicense });
  }
  return { outcomes, engine: engine.name, royaltyBefore };
}

const usd = (cent: number) => Math.round(cent / 100).toLocaleString("de-DE");

function main(): void {
  const data = loadBaseData();
  const seeds = arg("seeds", 4);
  const shockYear = arg("year", 1998);
  const years = arg("years", 5);
  const lines = [
    `# Prüftest Lizenzmodell: Royalty 5 → 12 % (4b.8)`, "",
    `Daten ${data.modId} ${data.modVersion} (Prüfsumme ${data.checksum}) · ${seeds} Seeds · Schock Anfang ${shockYear}, danach ${years} Jahre · Spieler-Bot „vernünftig“ auf der Lizenz-Engine des größten Anbieters (Vorlage „standard“).`,
    "", "Arme: **ohne** Schock, **akzeptieren**, **nachverhandeln** (LIZ-R32: halbe Erhöhung zurück), **wechsel** (Vertrag beenden, neue Projekte mit eigener bzw. Starter-Engine).", "",
    "| Seed | Anbieter | Royalty vorher | Arm | Lizenzkosten Spieler | Firmenwert am Ende | Δ zu ohne | KI-Kunden vorher → nachher | KI-Kunden gewechselt |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  const deltas: Record<Arm, number[]> = { ohne: [], akzeptieren: [], nachverhandeln: [], wechsel: [] };
  const switched: Record<Arm, number[]> = { ohne: [], akzeptieren: [], nachverhandeln: [], wechsel: [] };
  const royalties: Record<Arm, number[]> = { ohne: [], akzeptieren: [], nachverhandeln: [], wechsel: [] };
  for (let i = 0; i < seeds; i++) {
    const seed = hash32(`royalty${i}`).toString(16).padStart(8, "0") + hash32(`test${i}`).toString(16).padStart(8, "0");
    const t0 = performance.now();
    const r = runSeed(data, seed, shockYear, years);
    console.log(`Seed ${seed}: ${((performance.now() - t0) / 1000).toFixed(0)} s`);
    if (!r) {
      lines.push(`| ${seed} | – | – | – | Spieler vor ${shockYear} pleite oder keine Lizenz-Engine | | | | |`);
      continue;
    }
    const base = r.outcomes.find((o) => o.arm === "ohne")!;
    for (const o of r.outcomes) {
      deltas[o.arm].push(o.worth - base.worth);
      switched[o.arm].push(o.switchedAway);
      royalties[o.arm].push(o.royaltyCent);
      lines.push(`| ${seed} | ${r.engine} | ${(r.royaltyBefore / 100).toFixed(1)} % | ${o.arm} | ${usd(o.royaltyCent)} | ${usd(o.worth)} | ${o.arm === "ohne" ? "–" : usd(o.worth - base.worth)} | ${o.customersBefore} → ${o.customersAfter} | ${o.switchedAway} |`);
    }
  }
  const avg = (v: number[]) => (v.length === 0 ? 0 : v.reduce((a, b) => a + b, 0) / v.length);
  lines.push("", "## Mittel über die Seeds", "", "| Arm | Lizenzkosten Spieler | Δ Firmenwert zu ohne | KI-Kunden gewechselt |", "| --- | --- | --- | --- |");
  for (const a of ARMS) lines.push(`| ${a} | ${usd(avg(royalties[a]))} | ${a === "ohne" ? "–" : usd(avg(deltas[a]))} | ${avg(switched[a]).toFixed(1)} |`);
  lines.push("", "Spürbar heißt (Design-Dokument): Der Schock kostet beim Akzeptieren deutlich (Δ Firmenwert negativ und größer als die Streuung), " +
    "Nachverhandeln oder Wechsel ist für einen Teil der Seeds besser, und KI-Kunden wechseln häufiger als ohne Schock.", "");
  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/prueftest-royalty.md", lines.join("\n"));
  console.log(lines.join("\n"));
}

main();
