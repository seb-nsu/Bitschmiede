// S06 Serverkapazität (Etappe 5.7): eigen, gemietet, Cloud; Startspitze, Regel „Bedarf × 1,3“, Ausfälle.
// BTR-R18, BTR-R19, BTR-R34 bis BTR-R38 (A30). Läuft im Tick-Schritt 8 nach dem Zugang der Live-Produkte.
import { serverCrisisBp } from "./endspiel";
import { type Bp, BP_ONE, clamp, divInt, mulBp, mulDiv } from "../num";
import type { GameData, GameState, Project, ServerInput, ServerState } from "../model/types";
import { dateOf, isFirstWeekOfMonth } from "../calendar";
import { anchorValue, ledgerNow } from "./finanzen";
import { stream } from "../rng";
import { log } from "./firma";
import { startOutage } from "./betriebsereignisse";

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

/** BTR-R34, FRM-R65: eigene Kapazität aller Serverräume und Rechenzentren; jeder weitere Raum gleicher Art mit 70 %. */
export function ownCapacity(state: GameState, data: GameData): number {
  const v = data.liveService.server;
  const seen: Record<string, number> = {};
  let units = 0;
  for (const id of state.office.rooms) {
    const u = v.roomUnitsBp[id];
    if (u === undefined) continue;
    const n = seen[id] ?? 0;
    seen[id] = n + 1;
    units += n === 0 ? u : mulBp(u, data.equipment.copyFactorBp);
  }
  return mulBp(anchorValue(v.roomCapacityAnchors, yearOf(state)), units);
}

/** Auf ganze Mietblöcke aufrunden. */
function blocks(data: GameData, n: number): number {
  const b = data.liveService.server.rentBlock;
  return n <= 0 ? 0 : divInt(n + b - 1, b, 1) * b;
}

/** BTR-R38: Bedarf = 10 % der Spielerbasis; in den ersten Wochen × Startspitze. */
export function serverDemand(state: GameState, data: GameData, base: number, server: ServerState): number {
  const v = data.liveService.server;
  const normal = mulBp(base, v.concurrentBp);
  return state.week - server.startWeek < v.peakWeeks ? mulBp(normal, server.peakBp) : normal;
}

/**
 * BTR-R37: Server zum Release. Startspitze aus dem Seed (2–4 ×); die Startkapazität aus dem Paket wird vorab gemietet,
 * ohne Angabe die erwartete Startspitze (ANNAHME: Nachfrage der ersten Woche · 10 % · Spitze, abzüglich eigener Kapazität).
 */
export function initServer(state: GameState, data: GameData, project: Project, expectedFirstWeek: number): ServerState {
  const v = data.liveService.server;
  const peakBp = v.peakMinBp + mulDiv(stream(state, "betrieb").uniformBp(), v.peakMaxBp - v.peakMinBp, BP_ONE, 1);
  const own = ownCapacity(state, data);
  const chosen = project.releasePlan?.serverCapacity;
  const expected = mulBp(mulBp(expectedFirstWeek, v.concurrentBp), peakBp);
  const rented = chosen ?? blocks(data, expected - own);
  return {
    own: 0, rented, orders: [], cloud: 0, rule: true, ruleBp: v.ruleBp, peakBp, startWeek: state.week,
    demand: 0, outages: 0, lastOutageWeek: null, weekCostCent: 0,
  };
}

/** Release-Paket Punkt 9 (S05, BTR-R37): Vorschlag der Startkapazität bei mittlerer Startspitze, abzüglich eigener Kapazität. */
export function suggestedStartServer(state: GameState, data: GameData, expectedFirstWeek: number): number {
  const v = data.liveService.server;
  const peakBp = mulDiv(v.peakMinBp + v.peakMaxBp, 1, 2, 1);
  return blocks(data, mulBp(mulBp(expectedFirstWeek, v.concurrentBp), peakBp) - ownCapacity(state, data));
}

/** Gesamtkapazität eines Produkts diese Woche. */
export function serverCapacity(server: ServerState): number {
  return server.own + server.rented + server.cloud;
}

/** BTR-R36, BTR-T16: Die Cloud wächst je Woche um höchstens 50 % (von null mit einem kleinen Startblock). */
export function cloudStep(data: GameData, cloud: number, wanted: number): number {
  const v = data.liveService.server;
  if (wanted <= cloud) return Math.max(0, wanted);
  const max = cloud === 0 ? v.cloudStartUnits : cloud + mulBp(cloud, v.cloudGrowthBp);
  return Math.min(wanted, max);
}

/**
 * Wöchentlicher Server-Schritt aller Live-Produkte nach ID: eigene Kapazität verteilen, Regel anwenden (eigen, gemietet,
 * Cloud), Ausfall prüfen, Kosten buchen. Liefert je Projekt den Zufriedenheits-Einfluss (BTR-R19: Ausfall −8).
 */
export function serverStep(state: GameState, data: GameData, projects: readonly Project[]): Map<number, Bp> {
  const v = data.liveService.server;
  const out = new Map<number, Bp>();
  const year = yearOf(state);
  let ownLeft = ownCapacity(state, data);
  const month = isFirstWeekOfMonth(state.startYear, state.week);
  let cost = 0;
  for (const p of projects) {
    const live = p.ops!.live!;
    const sv = live.server;
    if (live.shutdownWeek !== null) {
      sv.rented = 0;
      sv.cloud = 0;
      sv.own = 0;
      sv.orders = [];
      sv.weekCostCent = 0;
      continue;
    }
    // BTR-R35, BTR-T17: bestellte Miete steht nach dem Vorlauf bereit.
    for (const o of sv.orders.filter((x) => x.week <= state.week)) sv.rented += o.units;
    sv.orders = sv.orders.filter((x) => x.week > state.week);
    sv.demand = serverDemand(state, data, live.base, sv);
    const target = sv.rule ? mulBp(sv.demand, sv.ruleBp) : sv.demand;
    sv.own = Math.min(ownLeft, target);
    ownLeft -= sv.own;
    if (sv.rule) {
      const pending = sv.orders.reduce((a, o) => a + o.units, 0);
      const gap = target - sv.own - sv.rented - pending;
      // BTR-R37: Reihenfolge eigen, gemietet, Cloud. Mehr Miete wird bestellt; Überschuss zum Monatsende gekündigt.
      if (gap > 0) sv.orders.push({ week: state.week + v.rentLeadWeeks, units: blocks(data, gap) });
      const surplus = sv.own + sv.rented - target;
      if (month && surplus >= v.rentBlock && pending === 0) sv.rented -= divInt(surplus, v.rentBlock, 1) * v.rentBlock;
      sv.cloud = year >= v.cloudFromYear ? cloudStep(data, sv.cloud, Math.max(0, target - sv.own - sv.rented)) : 0;
    } else if (year < v.cloudFromYear) sv.cloud = 0;
    // BTR-R19, BTR-R38: Bedarf über der Kapazität → Ausfall.
    if (sv.demand > serverCapacity(sv)) {
      sv.outages += 1;
      sv.lastOutageWeek = state.week;
      out.set(p.id, -v.outageSatisfactionBp);
      log(state, "log.serverOutage", { project: p.title, demand: sv.demand, capacity: serverCapacity(sv) });
      // BTR-R38: Ausfall zum Start → Entscheidung (Kette mit 6a).
      if (state.week - sv.startWeek < v.peakWeeks) startOutage(state, data, p);
    }
    // Preise je gleichzeitigem Spieler und Monat, auf die Woche umgelegt.
    const monthly = sv.rented * anchorValue(v.rentCentAnchors, year) + sv.cloud * anchorValue(v.cloudCentAnchors, Math.max(year, v.cloudFromYear))
      + sv.own * anchorValue(v.ownCentAnchors, year);
    // Endgame-Themen: Speicher- und Stromkrise verteuern alle Server.
    sv.weekCostCent = mulBp(mulDiv(monthly, 12, 52, 1), serverCrisisBp(state));
    cost += sv.weekCostCent;
  }
  if (cost > 0) {
    state.moneyCent -= cost;
    ledgerNow(state).costs.server += cost;
  }
  return out;
}

/** BTR-R35, BTR-R37: Eingaben prüfen. */
export function validateSetServer(state: GameState, data: GameData, input: ServerInput): string | null {
  const project = state.projects.find((p) => p.id === input.projectId);
  if (!project) return "error.unknownProject";
  const live = project.ops?.live;
  if (!live || project.status !== "veroeffentlicht") return "error.notLive";
  if (live.shutdownWeek !== null) return "error.liveShutdown";
  if (input.rented !== undefined && (!Number.isSafeInteger(input.rented) || input.rented < 0)) return "error.amount";
  const v = data.liveService.server;
  if (input.ruleBp !== undefined && (!Number.isSafeInteger(input.ruleBp) || input.ruleBp < v.ruleMinBp || input.ruleBp > v.ruleMaxBp)) return "error.amount";
  return null;
}

/** BTR-R35: mehr Miete wird in Blöcken mit Vorlauf bestellt, weniger sofort gekündigt (ANNAHME: Kündigung wirkt sofort). */
export function setServer(state: GameState, data: GameData, input: ServerInput): void {
  const sv = state.projects.find((p) => p.id === input.projectId)!.ops!.live!.server;
  if (input.rule !== undefined) sv.rule = input.rule;
  if (input.ruleBp !== undefined) sv.ruleBp = input.ruleBp;
  if (input.rented === undefined) return;
  const pending = sv.orders.reduce((a, o) => a + o.units, 0);
  const wanted = blocks(data, input.rented);
  if (wanted > sv.rented + pending) sv.orders.push({ week: state.week + data.liveService.server.rentLeadWeeks, units: wanted - sv.rented - pending });
  else {
    sv.orders = [];
    sv.rented = clamp(wanted, 0, sv.rented);
  }
}
