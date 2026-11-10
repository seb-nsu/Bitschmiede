// S06 Live-Produkte (Etappe 5.5 und 5.6): Spielerbasis nach BTR-F1, Churn, Content-Drops, Abo, Season-Pass und F2P.
// Läuft im Tick-Schritt 8 (Betrieb) nach den Verkäufen; der Live-Umsatz wird über sales.weekRevenueCent gebucht.
import { type Bp, BP_ONE, clamp, divBp, divInt, mulBp, mulDiv } from "../num";
import type { GameData, GameState, LiveInput, LiveKind, LiveState, Project } from "../model/types";
import { dateOf, isFirstWeekOfMonth } from "../calendar";
import { anchorValue, ledgerNow, preset } from "./finanzen";
import { competitionFactor, productType, reachableBase, weeklyDemand } from "./markt";
import { initServer, serverStep } from "./server";
import { projectEngineFactor } from "./engine";
import { brandById } from "./marken";
import { log } from "./firma";

const HISTORY = 60;

/** BTR-R15: Art des Live-Produkts laut Produkttyp oder null. */
export function liveKind(data: GameData, project: Pick<Project, "type">): LiveKind | null {
  return productType(data, project.type).live ?? null;
}

/** BTR-R15: Live-Betrieb zum Release. Die Basis beginnt leer; die Käufer der ersten Woche kommen über den Zugang. */
export function initLive(state: GameState, data: GameData, project: Project): LiveState | null {
  const kind = liveKind(data, project);
  if (!kind) return null;
  const s = project.sales;
  const firstWeek = s ? mulBp(weeklyDemand(state, data, project, s.scoreBp, 0, state.week, s.competitionBp ?? undefined), s.demandFactorBp) : 0;
  return {
    server: initServer(state, data, project, firstWeek),
    kind, base: 0, soldSeen: 0, joinedThisMonth: 0, joinedLastMonth: 0,
    churnBp: data.liveService.baseChurnBp[kind],
    churnParts: { baseBp: data.liveService.baseChurnBp[kind], competitionBp: 0, pauseBp: 0, techBp: 0, satisfactionBp: 0 },
    contentProgressBp: 0, lastDropWeek: state.week, drops: 0,
    hardnessBp: data.liveService.defaultHardnessBp, arpuCent: 0, weekRevenueCent: 0, revenueCent: 0, shutdownWeek: null, history: [],
    campaignCent: 0, campaignJoined: 0,
  };
}

export interface ChurnInputs {
  /** Konkurrenz 0–1 (1 − Konkurrenzfaktor des Markts). */
  competitionBp: Bp;
  pauseWeeks: number;
  /** E_rel: Engine-Faktor relativ zum Stand der Technik (höchstens 1). */
  engineRelBp: Bp;
  satisfactionBp: Bp;
  /** a_Analytics (5.8; bis dahin 0). */
  analyticsBp: Bp;
}

/**
 * BTR-F1, BTR-R16, BTR-R17, BTR-T11: c = min(0,5, max(0, c₀ · (1 + c₁ · K + c₂ · Pause + c₃ · (1 − E_rel)) ·
 * (1 − c₄ · (Z − 50) / 50) · (1 − a))). Liefert den Churn und seine Aufschlüsselung (Wasserfall).
 */
export function liveChurn(data: GameData, kind: LiveKind, x: ChurnInputs): { churnBp: Bp; parts: LiveState["churnParts"] } {
  const l = data.liveService;
  const c0 = l.baseChurnBp[kind];
  const pause = clamp(x.pauseWeeks, 0, l.maxPauseWeeks);
  const competition = mulBp(c0, mulBp(l.c1Bp, clamp(x.competitionBp, 0, BP_ONE)));
  const pauseBp = mulBp(c0, l.c2PerWeekBp * pause);
  const tech = mulBp(c0, mulBp(l.c3Bp, BP_ONE - clamp(x.engineRelBp, 0, BP_ONE)));
  const raw = c0 + competition + pauseBp + tech;
  const z = mulDiv(clamp(x.satisfactionBp, 0, BP_ONE) - 5000, BP_ONE, 5000, 1);
  const churn = clamp(mulBp(mulBp(raw, BP_ONE - mulBp(l.c4Bp, z)), BP_ONE - clamp(x.analyticsBp, 0, BP_ONE)), 0, l.maxChurnBp);
  return { churnBp: churn, parts: { baseBp: c0, competitionBp: competition, pauseBp, techBp: tech, satisfactionBp: churn - raw } };
}

/** BTR-R17: Wochen ohne Content-Drop über den Rhythmus hinaus. */
export function pauseWeeks(state: GameState, data: GameData, live: LiveState): number {
  return Math.max(0, state.week - live.lastDropWeek - data.liveService.rhythmWeeks[live.kind]);
}

/** E_rel des Produkts: Engine-Faktor heute (nach Technik-Update der gepatchte Stand), höchstens 1. */
function engineRel(state: GameState, data: GameData, project: Project): Bp {
  const year = dateOf(state.startYear, state.week).year;
  return Math.min(BP_ONE, projectEngineFactor(data, project.engine.levels, project.features, year).factorBp);
}

/** BTR-F1: Churn eines Live-Produkts aus dem aktuellen Zustand. */
export function churnOf(state: GameState, data: GameData, project: Project): { churnBp: Bp; parts: LiveState["churnParts"] } {
  const live = project.ops!.live!;
  return liveChurn(data, live.kind, {
    competitionBp: BP_ONE - competitionFactor(state, data, state.week, project.id),
    pauseWeeks: pauseWeeks(state, data, live),
    engineRelBp: engineRel(state, data, project),
    satisfactionBp: project.ops!.satisfactionBp,
    // BTR-R29: Analytics senkt den Churn (a).
    analyticsBp: data.liveService.analytics.churnBp[state.operations.analytics ?? "keine"],
  });
}

/** BTR-R20, BTR-R21: Umsatz je Spieler und Monat (Abo, Season-Pass, F2P nach Härte), mit Einnahmen-Faktor des Presets. */
export function arpuOf(state: GameState, data: GameData, live: LiveState): number {
  const l = data.liveService;
  const year = dateOf(state.startYear, state.week).year;
  let cent: number;
  if (live.kind === "mmo") cent = anchorValue(l.subscriptionAnchorsCent, year);
  else if (live.kind === "liveService") cent = anchorValue(l.seasonArpuAnchorsCent, year);
  else cent = mulBp(anchorValue(l.f2pArpuByHardnessCent, live.hardnessBp), anchorValue(l.f2pArpuYearAnchorsBp, year));
  // BTR-R29, BTR-R30: F2P und Live-Service ohne Analytics monetarisieren schwächer, intensiv stärker.
  if (live.kind !== "mmo") cent = mulBp(cent, l.analytics.arpuBp[state.operations.analytics ?? "keine"]);
  return mulBp(cent, preset(state, data).revenueFactorBp);
}

/** BTR-R23: Live-Ops-Bedarf eines Produkts in Personen: typische Teamgröße des Umfangs · Teamanteil des Typs. */
export function liveNeed(data: GameData, project: Project): number {
  const live = project.ops?.live;
  if (!live || live.shutdownWeek !== null) return 0;
  return Math.max(1, mulBp(data.liveService.teamByScope[project.scope] ?? 1, productType(data, project.type).teamShare));
}

/** Live-Ops-Bedarf aller laufenden Live-Produkte des Spielers (Personen). */
export function totalLiveNeed(state: GameState, data: GameData): number {
  return state.projects.reduce((a, p) => a + liveNeed(data, p), 0);
}

/**
 * BTR-R23: Anteil des Content-Rhythmus, den der Topf Live-Ops schafft (0–1). ANNAHME: Ohne Abteilung Betrieb
 * schafft das Entwicklungsteam nebenher den in noDepartmentRatioBp gesetzten Anteil.
 */
export function liveOpsRatio(state: GameState, data: GameData): Bp {
  const need = totalLiveNeed(state, data);
  if (need === 0) return BP_ONE;
  if (state.unlocks["betrieb"] === undefined) return data.liveService.noDepartmentRatioBp;
  const capacity = state.operations.size * state.operations.splitBp.liveops;
  return Math.min(BP_ONE, mulDiv(capacity, 1, need, 1));
}

/**
 * Wöchentlicher Live-Betrieb: Zugang aus den Verkäufen (BTR-R15), Content-Fortschritt und Drops (BTR-R17), Umsatz
 * (BTR-R20, BTR-R21). Liefert den Einfluss auf die Zufriedenheit dieser Woche (Drop, Härte).
 */
export function liveWeek(state: GameState, data: GameData, project: Project, ratioBp: Bp): Bp {
  const live = project.ops!.live!;
  if (live.shutdownWeek !== null) return 0;
  const l = data.liveService;
  let influence = 0;
  const sold = project.sales?.sold ?? 0;
  const joined = Math.max(0, sold - live.soldSeen);
  live.soldSeen = sold;
  live.base += joined;
  live.joinedThisMonth += joined;
  campaignWeek(state, data, project, live);
  // BTR-R17: Content-Fortschritt; ein Drop holt Spieler zurück und hebt die Zufriedenheit.
  live.contentProgressBp += ratioBp;
  if (live.contentProgressBp >= l.rhythmWeeks[live.kind] * BP_ONE) {
    live.contentProgressBp = 0;
    live.lastDropWeek = state.week;
    live.drops += 1;
    // BTR-R29: Mit Analytics wird Content gezielter (mehr Rückkehrer je Drop).
    const back = mulBp(mulBp(live.base, l.dropJoinBp), l.analytics.dropJoinBp[state.operations.analytics ?? "keine"]);
    live.base += back;
    live.joinedThisMonth += back;
    influence += l.dropSatisfactionBp;
    log(state, "log.contentDrop", { project: project.title, n: live.drops });
  }
  // BTR-R20: Härte über der Schwelle kostet Zufriedenheit (nur F2P).
  if (live.kind === "f2p" && live.hardnessBp > l.hardnessSatisfactionFromBp) {
    influence -= mulDiv(l.hardnessSatisfactionMaxBp, live.hardnessBp - l.hardnessSatisfactionFromBp, BP_ONE - l.hardnessSatisfactionFromBp, 1);
  }
  live.arpuCent = arpuOf(state, data, live);
  // Monatlicher Umsatz je Spieler, auf die Woche umgelegt (12 Monate = 52 Wochen).
  const revenue = mulDiv(live.base * live.arpuCent, 12, 52, 1);
  live.weekRevenueCent = revenue;
  live.revenueCent += revenue;
  const s = project.sales;
  if (s && revenue > 0) {
    // Nach dem Ende der Verkaufskurve bucht nur noch der Live-Umsatz.
    s.weekRevenueCent = s.ended ? revenue : s.weekRevenueCent + revenue;
    s.revenueCent += revenue;
  } else if (s?.ended) s.weekRevenueCent = 0;
  return influence;
}

/**
 * BTR-R15: Wirkung einer Kampagne je Woche: Budget / Kosten je Spieler, gedämpft durch den Anteil der erreichbaren
 * Basis, der schon spielt, und getragen von der Zufriedenheit (Mundpropaganda). ANNAHME: Wirkung = max(minEfficiency,
 * 1 − Basis / (capShare · erreichbare Basis)) · Zufriedenheit / 50 (in den Grenzen aus den Daten).
 */
export function campaignEfficiency(state: GameState, data: GameData, project: Project, live: LiveState): Bp {
  const c = data.liveService.campaign;
  const year = dateOf(state.startYear, state.week).year;
  const cap = mulBp(reachableBase(data, project.platforms, year, project.versionShareBp, state), c.capShareBp);
  const reach = clamp(BP_ONE - divBp(live.base, cap, 1), c.minEfficiencyBp, BP_ONE);
  const sat = clamp(divBp(project.ops?.satisfactionBp ?? c.satisfactionPivotBp, c.satisfactionPivotBp, 1), c.satisfactionFactorBp[0], c.satisfactionFactorBp[1]);
  return mulBp(reach, sat);
}

/** BTR-R15: wöchentliche Kampagnenkosten (Monat = 52/12 Wochen) und der Zugang daraus. */
export function campaignWeek(state: GameState, data: GameData, project: Project, live: LiveState): number {
  if (live.campaignCent <= 0) return 0;
  const c = data.liveService.campaign;
  const year = dateOf(state.startYear, state.week).year;
  const cost = mulDiv(live.campaignCent, 12, 52, 1);
  state.moneyCent -= cost;
  ledgerNow(state).costs.marketing += cost;
  const perPlayer = anchorValue(c.costPerPlayerAnchorsCent, year);
  const joined = mulDiv(mulBp(cost, campaignEfficiency(state, data, project, live)), 1, perPlayer, 1);
  live.base += joined;
  live.joinedThisMonth += joined;
  live.campaignJoined += joined;
  return joined;
}

/** BTR-F1 monatlich: B(t+1) = B + Zugang − B · c (der Zugang ist schon wöchentlich gebucht). */
export function liveMonth(state: GameState, data: GameData, project: Project): void {
  const live = project.ops!.live!;
  if (live.shutdownWeek !== null) return;
  const c = churnOf(state, data, project);
  live.churnBp = c.churnBp;
  live.churnParts = c.parts;
  live.base -= mulBp(live.base, c.churnBp);
  live.joinedLastMonth = live.joinedThisMonth;
  live.joinedThisMonth = 0;
  live.campaignJoined = 0;
  live.history = [...live.history, live.base].slice(-HISTORY);
}

/** Tick-Schritt 8: alle Live-Produkte des Spielers nach ID; liefert je Projekt den Zufriedenheits-Einfluss. */
export function liveStep(state: GameState, data: GameData): Map<number, Bp> {
  const out = new Map<number, Bp>();
  const ratio = liveOpsRatio(state, data);
  const month = isFirstWeekOfMonth(state.startYear, state.week);
  const lives = [...state.projects].sort((a, b) => a.id - b.id).filter((p) => p.ops?.live && p.status === "veroeffentlicht");
  for (const p of lives) {
    if (month) liveMonth(state, data, p);
    out.set(p.id, liveWeek(state, data, p, ratio));
  }
  // BTR-R18, BTR-R19: Server nach dem Zugang dieser Woche.
  for (const [id, v] of serverStep(state, data, lives)) out.set(id, (out.get(id) ?? 0) + v);
  return out;
}

/** BTR-R20, BTR-R22: Härte (0–100) nur für F2P; Einstellen nur für laufende Live-Produkte. */
export function validateSetLive(state: GameState, data: GameData, input: LiveInput): string | null {
  const project = state.projects.find((p) => p.id === input.projectId);
  if (!project) return "error.unknownProject";
  const live = project.ops?.live;
  if (!live || project.status !== "veroeffentlicht") return "error.notLive";
  if (live.shutdownWeek !== null) return "error.liveShutdown";
  if (input.hardnessBp !== undefined) {
    if (live.kind !== "f2p") return "error.notF2p";
    if (!Number.isSafeInteger(input.hardnessBp) || input.hardnessBp < 0 || input.hardnessBp > BP_ONE) return "error.amount";
  }
  if (input.campaignCent !== undefined) {
    const max = anchorValue(data.liveService.campaign.maxMonthlyCentAnchors, dateOf(state.startYear, state.week).year);
    if (!Number.isSafeInteger(input.campaignCent) || input.campaignCent < 0 || input.campaignCent > max) return "error.amount";
  }
  return null;
}

/** BTR-R22: Einstellen spart alle laufenden Kosten, kostet den Ruf der Marke bei ihren Spielern; die Basis verschwindet. */
export function setLive(state: GameState, data: GameData, input: LiveInput): void {
  const project = state.projects.find((p) => p.id === input.projectId)!;
  const live = project.ops!.live!;
  if (input.hardnessBp !== undefined) live.hardnessBp = input.hardnessBp;
  if (input.campaignCent !== undefined) live.campaignCent = input.campaignCent;
  if (!input.shutdown) return;
  const l = data.liveService;
  const brand = brandById(state, project.brandId);
  // ANNAHME: „Markenstärke −10“ wirkt über die Bekanntheit, weil die Stärke aus Bekanntheit, Ruf und Tiefe folgt.
  if (brand && live.base > 0) brand.awarenessBp = Math.max(0, brand.awarenessBp - l.shutdownAwarenessBp);
  if (brand && live.base > l.shutdownReputationFromPlayers) brand.reputationBp = Math.max(0, brand.reputationBp - l.shutdownReputationBp);
  log(state, "log.liveShutdown", { project: project.title, players: live.base });
  live.base = 0;
  live.campaignCent = 0;
  live.shutdownWeek = state.week;
  live.weekRevenueCent = 0;
  if (project.sales) {
    project.sales.ended = true;
    project.sales.weekRevenueCent = 0;
  }
}

/** Durchschnitt (Anzeige): Wochen bis zum nächsten Drop bei der aktuellen Live-Ops-Quote. */
export function weeksToDrop(state: GameState, data: GameData, live: LiveState): number | null {
  const ratio = liveOpsRatio(state, data);
  if (ratio <= 0) return null;
  const left = data.liveService.rhythmWeeks[live.kind] * BP_ONE - live.contentProgressBp;
  return divInt(left + ratio - 1, ratio, 1);
}
