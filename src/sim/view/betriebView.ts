// Anzeigemodell des Betriebs (S06 Abschnitt 8, S11, Etappe 5.15): Abteilung mit vier Töpfen, Produkte im Betrieb,
// Live-Produkte mit Spielerbasis, Churn-Aufschlüsselung und Server-Füllstand.
import type { Bp, Cent } from "../num";
import type { AnalyticsLevel, GameData, GameState, LiveKind, LiveState, OpsPot, PatchSize, Project, SeverityMap } from "../model/types";
import { dateOf } from "../calendar";
import { departmentOpen, departmentWeeklyCost, suggestedSize, validatePlanPatch } from "../systems/betrieb";
import { producersRunOperations } from "../systems/delegation";
import { producerSplit } from "../systems/betriebsdelegation";
import { campaignEfficiency, totalLiveNeed, weeksToDrop } from "../systems/live";
import { anchorValue } from "../systems/finanzen";
import { ownCapacity, serverCapacity } from "../systems/server";

export interface ServerView {
  capacity: number;
  demand: number;
  own: number;
  rented: number;
  ordered: number;
  cloud: number;
  rule: boolean;
  ruleBp: Bp;
  outages: number;
  weekCostCent: Cent;
}

export interface LiveView {
  kind: LiveKind;
  base: number;
  /** Spielerbasis je Monat (Sparkline). */
  history: number[];
  joinedLastMonth: number;
  churnBp: Bp;
  /** BTR-F1 als Wasserfall: Grund-Churn, Konkurrenz, Content-Pause, Technik, Zufriedenheit. */
  churnParts: LiveState["churnParts"];
  arpuCent: Cent;
  weekRevenueCent: Cent;
  revenueCent: Cent;
  hardnessBp: Bp;
  /** BTR-R15: Kampagne je Monat, Zugang daraus im laufenden Monat, Obergrenze, Kosten je Spieler und Wirkung. */
  campaign: { monthlyCent: Cent; joined: number; maxCent: Cent; costPerPlayerCent: Cent; efficiencyBp: Bp };
  drops: number;
  weeksToDrop: number | null;
  shutdown: boolean;
  server: ServerView;
}

export interface OpsProductView {
  id: number;
  title: string;
  type: string;
  satisfactionBp: Bp;
  history: number[];
  known: SeverityMap;
  patch: { size: PatchSize; weeksLeft: number } | null;
  patches: number;
  /** Grund, warum ein kleiner Patch mit den freien Personen gerade nicht geht (null = möglich). */
  patchBlocked: string | null;
  live: LiveView | null;
}

export interface OperationsView {
  /** BTR-R02: Abteilung freigeschaltet. */
  open: boolean;
  /** Mindestens ein Produkt im Betrieb (Unterseite sichtbar). */
  visible: boolean;
  size: number;
  auto: boolean;
  suggested: number;
  splitBp: Record<OpsPot, Bp>;
  splitAuto: boolean;
  /** BTR-R03: Produzenten verteilen die Töpfe gerade; ihre Aufteilung zum Vergleich. */
  producersActive: boolean;
  producerSplitBp: Record<OpsPot, Bp> | null;
  outsourced: boolean;
  analytics: AnalyticsLevel;
  analyticsAvailable: boolean;
  autoPatch: boolean;
  shutdownBelow: number;
  /** Postkorb: offene Anfragen, neue und beantwortete des letzten Monats. */
  backlog: number;
  ticketsLastMonth: number;
  answeredLastMonth: number;
  supportRequests: number;
  supportFulfillmentBp: Bp;
  weeklyCostCent: Cent;
  liveNeed: number;
  ownServerCapacity: number;
  freePeople: number[];
  products: OpsProductView[];
}

function liveView(state: GameState, data: GameData, live: LiveState, project: Project): LiveView {
  const sv = live.server;
  const c = data.liveService.campaign;
  const year = dateOf(state.startYear, state.week).year;
  return {
    kind: live.kind, base: live.base, history: live.history, joinedLastMonth: live.joinedLastMonth,
    churnBp: live.churnBp, churnParts: live.churnParts, arpuCent: live.arpuCent, weekRevenueCent: live.weekRevenueCent,
    revenueCent: live.revenueCent, hardnessBp: live.hardnessBp, drops: live.drops,
    campaign: {
      monthlyCent: live.campaignCent, joined: live.campaignJoined, maxCent: anchorValue(c.maxMonthlyCentAnchors, year),
      costPerPlayerCent: anchorValue(c.costPerPlayerAnchorsCent, year), efficiencyBp: campaignEfficiency(state, data, project, live),
    },
    weeksToDrop: live.shutdownWeek === null ? weeksToDrop(state, data, live) : null, shutdown: live.shutdownWeek !== null,
    server: {
      capacity: serverCapacity(sv), demand: sv.demand, own: sv.own, rented: sv.rented, ordered: sv.orders.reduce((a, o) => a + o.units, 0),
      cloud: sv.cloud, rule: sv.rule, ruleBp: sv.ruleBp, outages: sv.outages, weekCostCent: sv.weekCostCent,
    },
  };
}

function productView(state: GameState, data: GameData, p: Project, free: number[]): OpsProductView {
  const ops = p.ops!;
  return {
    id: p.id, title: p.title, type: p.type, satisfactionBp: ops.satisfactionBp, history: ops.history, known: ops.known,
    patch: ops.patch ? { size: ops.patch.size, weeksLeft: ops.patch.weeksLeft } : null, patches: ops.patches,
    patchBlocked: validatePlanPatch(state, data, { type: "planPatch", projectId: p.id, size: "klein", people: free.slice(0, 2) }),
    live: ops.live ? liveView(state, data, ops.live, p) : null,
  };
}

export function operationsView(state: GameState, data: GameData): OperationsView {
  const ops = state.operations;
  const free = state.people.filter((x) => x.assignment === null).map((x) => x.id).sort((a, b) => a - b);
  const products = state.projects.filter((p) => p.ops && p.status === "veroeffentlicht").sort((a, b) => b.id - a.id)
    .map((p) => productView(state, data, p, free));
  const producersActive = producersRunOperations(state, data);
  return {
    open: departmentOpen(state),
    visible: products.length > 0,
    size: ops.size, auto: ops.auto,
    suggested: suggestedSize(state, data, ops.ticketsLastMonth, ops.supportRequests),
    splitBp: ops.splitBp, splitAuto: ops.splitAuto !== false,
    producersActive, producerSplitBp: producersActive ? producerSplit(state, data) : null,
    outsourced: ops.outsourced, analytics: ops.analytics ?? "keine",
    analyticsAvailable: dateOf(state.startYear, state.week).year >= data.liveService.analytics.fromYear,
    autoPatch: ops.autoPatch !== false, shutdownBelow: ops.shutdownBelow ?? data.liveService.delegation.shutdownBelowPlayers,
    backlog: ops.backlog, ticketsLastMonth: ops.ticketsLastMonth, answeredLastMonth: ops.answeredLastMonth,
    supportRequests: ops.supportRequests, supportFulfillmentBp: ops.supportFulfillmentBp,
    weeklyCostCent: departmentWeeklyCost(state, data),
    liveNeed: totalLiveNeed(state, data),
    ownServerCapacity: ownCapacity(state, data),
    freePeople: free,
    products,
  };
}
