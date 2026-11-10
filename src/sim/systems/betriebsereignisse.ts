// S06 Abschnitt 9 (Etappe 5.9): Ereignisse im Betrieb; Folgestufen als Ketten (MRK-R56, Etappe 6a.2).
// Auslöser im Tick-Schritt 8 (Betrieb); Antworten über die Entscheidungen (Tick-Schritt 1, applyDecision).
import { scheduleStage } from "./katalog";
import { type Bp, BP_ONE, clamp, divInt, mulBp, mulDiv } from "../num";
import type { GameData, GameEvent, GameState, Project } from "../model/types";
import { dateOf, isFirstWeekOfMonth } from "../calendar";
import { stream } from "../rng";
import { ledgerNow, scaleToYear } from "./finanzen";
import { brandById } from "./marken";
import { log } from "./firma";
import { addEvent } from "./ereignisse";
import { serverCapacity } from "./server";

function year(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

function open(state: GameState, kind: GameEvent["kind"], productId: number): boolean {
  return [...state.events, ...state.eventQueue].some((e) => e.kind === kind && e.productId === productId);
}

function pay(state: GameState, cent: number): void {
  state.moneyCent -= cent;
  ledgerNow(state).costs.other += cent;
}

function satisfy(project: Project, deltaBp: Bp): void {
  if (project.ops) project.ops.satisfactionBp = clamp(project.ops.satisfactionBp + deltaBp, 0, BP_ONE);
}

/** BTR-R26: Anteil der Community-Kapazität am Bedarf (0–1); ohne Abteilung 0. */
export function communityCoverage(state: GameState, data: GameData): Bp {
  const players = state.projects.reduce((a, p) => a + (p.ops?.live && p.ops.live.shutdownWeek === null ? p.ops.live.base : 0), 0);
  if (players === 0) return BP_ONE;
  if (state.unlocks["betrieb"] === undefined) return 0;
  const capacity = mulDiv(state.operations.size * state.operations.splitBp.community, data.opsEvents.cheater.playersPerCommunityPerson, BP_ONE, 1);
  return Math.min(BP_ONE, mulDiv(capacity, BP_ONE, players, 1));
}

/** BTR-R26: Risiko je Monat = Grundrisiko · (1 + Faktor · fehlende Community-Abdeckung). */
export function cheaterRisk(state: GameState, data: GameData): Bp {
  const c = data.opsEvents.cheater;
  return mulBp(c.baseRiskBp, BP_ONE + mulBp(c.uncoveredFactorBp, BP_ONE - communityCoverage(state, data)));
}

/** BTR-T13: Lootbox-Risiko je Monat = 2 % · max(0, Härte − 60) / 10, ab 2015; intensive Analytics erhöht es (BTR-R29). */
export function lootboxRisk(state: GameState, data: GameData, hardnessBp: Bp, intensive = state.operations.analytics === "intensiv"): Bp {
  const l = data.opsEvents.lootbox;
  if (year(state) < l.fromYear) return 0;
  const over = Math.max(0, hardnessBp - l.fromHardnessBp);
  const risk = mulDiv(l.perTenPointsBp, over, 1000, 1);
  return intensive ? mulBp(risk, l.intensiveFactorBp) : risk;
}

/** Schwerer Bug gefunden (S06 Abschnitt 9): als Entscheidung, höchstens einmal je Abstand und Produkt. */
export function severeBugFound(state: GameState, data: GameData, project: Project, found: number): void {
  const b = data.opsEvents.severeBug;
  if (found <= 0 || project.ops!.patch || open(state, "schwererBug", project.id)) return;
  const last = project.ops!.lastSevereEventWeek ?? -b.cooldownWeeks;
  if (state.week - last < b.cooldownWeeks) return;
  project.ops!.lastSevereEventWeek = state.week;
  addEvent(state, data, {
    kind: "schwererBug", scope: "projekt", projectId: null, productId: project.id, options: ["sofort", "naechsterPatch", "ignorieren"],
    defaultOption: "naechsterPatch", opsCostCent: scaleToYear(data, b.hotfixCentPerBug, year(state)) * project.ops!.known.schwer,
  });
}

/** BTR-R38: Server-Ausfall zum Start (Kette in 6a) als einzelne Entscheidung. */
export function startOutage(state: GameState, data: GameData, project: Project): void {
  if (open(state, "serverAusfall", project.id)) return;
  const sv = project.ops!.live!.server;
  const cent = scaleToYear(data, data.opsEvents.outage.compensationCentPerPlayer, year(state));
  const options = ["entschaedigen", ...(year(state) >= data.liveService.server.cloudFromYear ? ["cloud"] : []), "miete", "aussitzen"];
  addEvent(state, data, {
    kind: "serverAusfall", scope: "projekt", projectId: null, productId: project.id, options, defaultOption: "miete",
    opsCostCent: mulBp(project.ops!.live!.base, data.liveService.server.concurrentBp) * cent, opsGap: Math.max(0, sv.demand - serverCapacity(sv)),
  });
}

/**
 * Monatliche Auslöser (Strom „betrieb“, nach ID): Cheater-Welle (BTR-R26), Lootbox-Debatte (BTR-R20, BTR-T05),
 * Datenleck, „Eine Liga will dein Spiel“; dazu Ergebnis-Meldungen (Zufriedenheit unter 40, Content-Pause zu lang).
 */
export function opsEventStep(state: GameState, data: GameData): void {
  const e = data.opsEvents;
  const monthly = isFirstWeekOfMonth(state.startYear, state.week);
  for (const p of [...state.projects].sort((a, b) => a.id - b.id)) {
    const ops = p.ops;
    if (!ops || p.status !== "veroeffentlicht") continue;
    // Ergebnis „Zufriedenheit unter 40“: einmal beim Unterschreiten.
    const low = ops.satisfactionBp < e.lowSatisfactionBp;
    if (low && !ops.lowWarned) log(state, "log.satisfactionLow", { project: p.title, z: divInt(ops.satisfactionBp, 100, 1) });
    ops.lowWarned = low;
    const live = ops.live;
    if (!live || live.shutdownWeek !== null) continue;
    // Ergebnis „Content-Pause zu lang“: in der ersten Woche über dem Rhythmus.
    if (state.week - live.lastDropWeek === data.liveService.rhythmWeeks[live.kind] + 1) log(state, "log.contentPause", { project: p.title });
    if (!monthly) continue;
    const rng = stream(state, "betrieb");
    if (rng.uniformBp() < cheaterRisk(state, data) && !open(state, "cheaterWelle", p.id)) {
      addEvent(state, data, {
        kind: "cheaterWelle", scope: "projekt", projectId: null, productId: p.id, options: ["antiCheat", "bannWelle", "nichts"],
        defaultOption: "bannWelle", opsCostCent: scaleToYear(data, e.cheater.antiCheatCent, year(state)),
      });
    }
    if (live.kind === "f2p" && rng.uniformBp() < lootboxRisk(state, data, live.hardnessBp) && !open(state, "lootboxDebatte", p.id)) {
      addEvent(state, data, { kind: "lootboxDebatte", scope: "projekt", projectId: null, productId: p.id, options: ["abschaffen", "abschwaechen", "verteidigen"], defaultOption: "abschwaechen" });
    }
    if (year(state) >= e.leak.fromYear && rng.uniformBp() < mulBp(e.leak.baseRiskBp, BP_ONE + mulBp(e.cheater.uncoveredFactorBp, BP_ONE - communityCoverage(state, data)))
      && !open(state, "datenleck", p.id)) {
      const cent = scaleToYear(data, e.leak.compensationCentPerPlayer, year(state));
      addEvent(state, data, {
        kind: "datenleck", scope: "projekt", projectId: null, productId: p.id, options: ["offenlegen", "stillBeheben"], defaultOption: "offenlegen",
        opsCostCent: mulBp(live.base, e.leak.affectedBp) * cent,
      });
    }
    const competitive = e.league.genres.includes(p.genre);
    if (competitive && !ops.leagueOffered && year(state) >= e.league.fromYear && live.base >= e.league.minPlayers && rng.uniformBp() < e.league.riskBp) {
      ops.leagueOffered = true;
      addEvent(state, data, { kind: "ligaAnfrage", scope: "projekt", projectId: null, productId: p.id, options: ["zustimmen", "ablehnen"], defaultOption: "zustimmen" });
    }
  }
}

/** Antworten auf die Betriebs-Ereignisse (S06 Abschnitt 9). ANNAHME: Wirkungen sofort, Folgeglieder kommen mit 6a. */
export function applyOpsDecision(state: GameState, data: GameData, event: GameEvent, option: string): void {
  const p = state.projects.find((x) => x.id === event.productId);
  if (!p?.ops) return;
  const e = data.opsEvents;
  const live = p.ops.live;
  const brand = brandById(state, p.brandId);
  switch (event.kind) {
    case "schwererBug":
      if (option === "sofort") {
        pay(state, event.opsCostCent ?? 0);
        p.ops.known.schwer = 0;
        satisfy(p, e.severeBug.hotfixSatisfactionBp);
      }
      if (option === "ignorieren") satisfy(p, -e.severeBug.ignoreSatisfactionBp);
      break;
    case "serverAusfall": {
      const sv = live?.server;
      if (!sv) break;
      if (option === "entschaedigen") {
        pay(state, event.opsCostCent ?? 0);
        satisfy(p, e.outage.compensationSatisfactionBp);
      }
      // BTR-R36: Die Cloud wächst auch hier um höchstens 50 % je Woche; zugeschaltet wird ab sofort (ANNAHME: Startblock).
      if (option === "cloud") sv.cloud = Math.max(sv.cloud, Math.min(event.opsGap ?? 0, sv.cloud + mulBp(Math.max(sv.cloud, data.liveService.server.cloudStartUnits), data.liveService.server.cloudGrowthBp)));
      if (option === "miete") sv.orders.push({ week: state.week + data.liveService.server.rentLeadWeeks, units: event.opsGap ?? 0 });
      if (option === "aussitzen") satisfy(p, -e.outage.sitOutSatisfactionBp);
      break;
    }
    case "cheaterWelle":
      if (option === "antiCheat") {
        pay(state, event.opsCostCent ?? 0);
        satisfy(p, e.cheater.antiCheatSatisfactionBp);
      }
      if (option === "bannWelle" && live) {
        live.base -= mulBp(live.base, e.cheater.banShareBp);
        satisfy(p, e.cheater.banSatisfactionBp);
      }
      if (option === "nichts") satisfy(p, -e.cheater.ignoreSatisfactionBp);
      break;
    case "lootboxDebatte":
      if (!live) break;
      if (option === "abschaffen") {
        live.hardnessBp = Math.min(live.hardnessBp, data.liveService.defaultHardnessBp);
        satisfy(p, e.lootbox.abolishSatisfactionBp);
      }
      if (option === "abschwaechen") live.hardnessBp = Math.max(0, live.hardnessBp - e.lootbox.softenBp);
      if (option === "verteidigen") {
        satisfy(p, -e.lootbox.defendSatisfactionBp);
        if (brand) brand.reputationBp = Math.max(0, brand.reputationBp - e.lootbox.defendReputationBp);
      }
      break;
    case "datenleck":
      if (option === "offenlegen") {
        pay(state, event.opsCostCent ?? 0);
        satisfy(p, -e.leak.discloseSatisfactionBp);
      }
      // MRK-R56 (6a.2): Still beheben fliegt als Folgestufe auf (Chance und Verzögerung in ops/events.json, chains).
      break;
    case "ligaAnfrage":
      if (option === "zustimmen") {
        if (live) live.base += mulBp(live.base, e.league.playersBp);
        if (brand) brand.awarenessBp = Math.min(BP_ONE, brand.awarenessBp + e.league.awarenessBp);
      }
      break;
    default:
      return;
  }
  log(state, "log.opsDecision", { project: p.title, kind: event.kind, option });
  // MRK-R55, MRK-R56: Folgestufe der Betriebs-Kette.
  const next = e.chains[`${event.kind}:${option}`];
  if (next) scheduleStage(state, data, { projectId: null, productId: p.id }, `${event.kind}:${option}`, next);
}
