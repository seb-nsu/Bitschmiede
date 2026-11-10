// S06 Abschnitt 6, BTR-R03 (Etappe 5.14): Delegation im Betrieb. Produzenten verteilen ab drei Live-Services die Töpfe
// nach Last; Regeln „Zufriedenheit unter 60 → Patch“ und „Spielerbasis unter X und Verlust → Einstellen vorschlagen“.
import { type Bp, BP_ONE, mulBp, mulDiv } from "../num";
import type { GameData, GameState, OpsPot, Project } from "../model/types";
import { OPS_POTS } from "../model/types";
import { dateOf, isFirstWeekOfMonth } from "../calendar";
import { anchorValue, preset } from "./finanzen";
import { addEvent } from "./ereignisse";
import { producersRunOperations } from "./delegation";
import { liveNeed, totalLiveNeed } from "./live";
import { departmentOpen, planPatch, validatePlanPatch } from "./betrieb";
import { setLive } from "./live";
import { log } from "./firma";

/**
 * BTR-R03: Aufteilung nach Last. Live-Ops nach Teamanteil, Kundenservice nach Anfragen, Community nach Spielern,
 * Engine-Support nach Support-Anfragen; jeder Topf mit Mindestanteil, Summe genau 100 % (Rest an den Kundenservice).
 */
export function producerSplit(state: GameState, data: GameData): Record<OpsPot, Bp> {
  const d = data.liveService.delegation;
  const ops = state.operations;
  const year = dateOf(state.startYear, state.week).year;
  const perService = anchorValue(data.operations.department.ticketsPerPersonMonthAnchors, year);
  const players = state.projects.reduce((a, p) => a + (p.ops?.live && p.ops.live.shutdownWeek === null ? p.ops.live.base : 0), 0);
  const load: Record<OpsPot, number> = {
    liveops: totalLiveNeed(state, data) * BP_ONE,
    service: mulDiv(ops.ticketsLastMonth, BP_ONE, Math.max(1, perService), 1),
    community: mulDiv(players, BP_ONE, Math.max(1, data.opsEvents.cheater.playersPerCommunityPerson), 1),
    support: mulDiv(ops.supportRequests, BP_ONE, Math.max(1, data.operations.department.supportPerPersonMonth), 1),
  };
  const sum = OPS_POTS.reduce((a, k) => a + load[k], 0);
  const free = BP_ONE - d.minPotBp * OPS_POTS.length;
  const out = {} as Record<OpsPot, Bp>;
  for (const k of OPS_POTS) out[k] = d.minPotBp + (sum === 0 ? 0 : mulDiv(load[k], free, sum, 1));
  out.service += BP_ONE - OPS_POTS.reduce((a, k) => a + out[k], 0);
  return out;
}

/** Monatliche Betriebskosten eines Live-Produkts (Live-Ops-Personen und Server). */
export function liveMonthlyCost(state: GameState, data: GameData, p: Project): number {
  const year = dateOf(state.startYear, state.week).year;
  const salary = mulBp(anchorValue(data.economy.salaryAnchorsCent, year), preset(state, data).costFactorBp);
  return liveNeed(data, p) * salary + mulDiv(p.ops!.live!.server.weekCostCent, 52, 12, 1);
}

/** Freie Personen für einen Auto-Patch (nach ID, höchstens patchPeople). */
function freePeople(state: GameState, n: number): number[] {
  return state.people.filter((x) => x.assignment === null).map((x) => x.id).sort((a, b) => a - b).slice(0, n);
}

/** Monatsjob (Tick-Schritt 8): Produzenten-Aufteilung, Patch-Regel, Einstellen-Vorschlag. */
export function opsDelegationStep(state: GameState, data: GameData): void {
  if (!isFirstWeekOfMonth(state.startYear, state.week)) return;
  const d = data.liveService.delegation;
  const ops = state.operations;
  // BTR-R03, BTR-T10: Produzenten steuern die Töpfe, solange der Spieler die Aufteilung nicht selbst gesetzt hat.
  if (ops.splitAuto !== false && producersRunOperations(state, data)) ops.splitBp = producerSplit(state, data);
  const deptOpen = departmentOpen(state);
  for (const p of [...state.projects].sort((a, b) => a.id - b.id)) {
    if (!p.ops || p.status !== "veroeffentlicht") continue;
    // Regel „Wenn Zufriedenheit unter 60, dann Patch“ (S06 Abschnitt 6). ANNAHME: Regeln im Betrieb gibt es mit der Abteilung.
    if (deptOpen && ops.autoPatch !== false && !p.ops.patch && p.ops.satisfactionBp < d.patchBelowBp && p.ops.known.leicht + p.ops.known.mittel + p.ops.known.schwer > 0) {
      const people = freePeople(state, d.patchPeople);
      const input = { type: "planPatch" as const, projectId: p.id, size: "klein" as const, people };
      if (people.length > 0 && validatePlanPatch(state, data, input) === null) {
        planPatch(state, data, input);
        log(state, "log.autoPatch", { project: p.title });
      }
    }
    // Regel „Wenn Spielerbasis unter X und Verlust, dann Einstellen vorschlagen“.
    const live = p.ops.live;
    if (!live || live.shutdownWeek !== null || live.base >= (ops.shutdownBelow ?? d.shutdownBelowPlayers)) continue;
    const loss = mulDiv(live.weekRevenueCent, 52, 12, 1) < liveMonthlyCost(state, data, p);
    const open = [...state.events, ...state.eventQueue].some((e) => e.kind === "einstellenVorschlag" && e.productId === p.id);
    if (loss && !open && state.week - (live.server.startWeek ?? 0) >= d.shutdownMinWeeks) {
      addEvent(state, data, { kind: "einstellenVorschlag", scope: "projekt", projectId: null, productId: p.id, options: ["einstellen", "weiter"], defaultOption: "weiter" });
    }
  }
}

export function applyShutdownSuggestion(state: GameState, data: GameData, productId: number | undefined, option: string): void {
  const p = state.projects.find((x) => x.id === productId);
  if (option !== "einstellen" || !p?.ops?.live || p.ops.live.shutdownWeek !== null) return;
  setLive(state, data, { type: "setLive", projectId: p.id, shutdown: true });
}
