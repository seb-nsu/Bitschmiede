// S06 Abschnitt 7 (Etappe 5.10): KI im Betrieb. KI-Live-Produkte mit Spielerbasis (BTR-F1), Content-Rhythmus nach
// Teamgröße, Monetarisierung nach Persönlichkeit, Reaktion auf die Lootbox-Debatte, Einstellen nach 6 Verlustmonaten.
import { BP_ONE, clamp, divInt, mulBp, mulDiv } from "../../num";
import type { AiLive, AiProduct, AiStudio, GameData, GameState, LiveKind } from "../../model/types";
import { LIVE_KINDS } from "../../model/types";
import { dateOf, isFirstWeekOfMonth } from "../../calendar";
import type { Rng } from "../../rng";
import { anchorValue } from "../finanzen";
import { liveChurn } from "../live";
import { lootboxRisk } from "../betriebsereignisse";
import { chronicle } from "../katalog";

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

/** Live-Arten, die es in diesem Jahr gibt (Jahr des Produkttyps; Netzwerk-Stufe der KI-Engines folgt der Epoche). */
function availableKinds(state: GameState, data: GameData): LiveKind[] {
  const y = yearOf(state);
  return LIVE_KINDS.filter((k) => {
    const t = data.productTypes.find((x) => x.live === k);
    return t !== undefined && y >= (t.fromYear ?? 0) && y >= data.liveService.ai.fromYear[k];
  });
}

/** ANNAHME: Ein KI-Release wird mit einer Chance nach Größe ein Live-Produkt; die Art wird gleichverteilt gezogen. */
export function rollAiLive(state: GameState, data: GameData, studio: AiStudio, rng: Rng): AiLive | null {
  const kinds = availableKinds(state, data);
  if (kinds.length === 0) return null;
  if (rng.uniformBp() >= data.liveService.ai.chanceBp[studio.size]) return null;
  const kind = kinds[rng.int(kinds.length)]!;
  return { kind, base: 0, hardnessBp: data.liveService.ai.hardnessBp[studio.archetype], missed: 0, nextDropWeek: state.week + data.liveService.rhythmWeeks[kind], lossMonths: 0 };
}

/** Umsatz je Spieler und Monat für die KI (ohne Preset-Faktor, Analytics nach Größe). */
function aiArpu(state: GameState, data: GameData, studio: AiStudio, live: AiLive): number {
  const l = data.liveService;
  const y = yearOf(state);
  if (live.kind === "mmo") return anchorValue(l.subscriptionAnchorsCent, y);
  const analytics = y >= l.analytics.fromYear ? l.analytics.aiLevel[studio.size] : "keine";
  const cent = live.kind === "liveService"
    ? anchorValue(l.seasonArpuAnchorsCent, y)
    : mulBp(anchorValue(l.f2pArpuByHardnessCent, live.hardnessBp), anchorValue(l.f2pArpuYearAnchorsBp, y));
  return mulBp(cent, l.analytics.arpuBp[analytics]);
}

/** Laufende Kosten je Monat: Live-Ops-Team (Teamanteil) und gemietete Server für den Bedarf × 1,3. */
function aiMonthlyCost(state: GameState, data: GameData, p: AiProduct, live: AiLive, salaryCent: number): number {
  const l = data.liveService;
  const type = data.productTypes.find((t) => t.live === live.kind);
  const people = Math.max(1, mulBp(l.teamByScope[p.scope] ?? 1, type?.teamShare ?? 0));
  const servers = mulBp(mulBp(live.base, l.server.concurrentBp), l.server.ruleBp);
  return people * salaryCent + servers * anchorValue(l.server.rentCentAnchors, yearOf(state));
}

/**
 * Wöchentlich für ein KI-Live-Produkt: Zugang aus den Verkäufen, Content-Drop mit Wahrscheinlichkeit nach Teamgröße,
 * monatlich Churn, Lootbox-Reaktion und Verlust-Zählung. Liefert den Live-Umsatz der Woche.
 */
export function aiLiveWeek(state: GameState, data: GameData, studio: AiStudio, p: AiProduct, sold: number, salaryCent: number, rng: Rng): number {
  const live = p.live!;
  const l = data.liveService;
  live.base += sold;
  // S06 7: Rhythmus halten mit Wahrscheinlichkeit nach Teamgröße; zwei Fehlschläge machen den Churn sichtbar höher.
  if (state.week >= live.nextDropWeek) {
    live.nextDropWeek = state.week + l.rhythmWeeks[live.kind];
    if (rng.uniformBp() < l.ai.keepRhythmBp[studio.size]) live.missed = 0;
    else live.missed += 1;
  }
  const revenue = mulDiv(live.base * aiArpu(state, data, studio, live), 12, 52, 1);
  if (!isFirstWeekOfMonth(state.startYear, state.week)) return revenue;
  const y = yearOf(state);
  const c = liveChurn(data, live.kind, {
    competitionBp: l.ai.competitionBp,
    pauseWeeks: live.missed >= 2 ? live.missed * l.rhythmWeeks[live.kind] : 0,
    engineRelBp: BP_ONE,
    satisfactionBp: clamp(divInt(p.userScoreBp ?? p.scoreBp, 10, 1), 0, BP_ONE),
    analyticsBp: y >= l.analytics.fromYear ? l.analytics.churnBp[l.analytics.aiLevel[studio.size]] : 0,
  });
  live.base -= mulBp(live.base, c.churnBp);
  // S06 7: Auf die Lootbox-Debatte reagiert die KI mit Abschwächen.
  const intensive = y >= l.analytics.fromYear && l.analytics.aiLevel[studio.size] === "intensiv";
  if (live.kind === "f2p" && rng.uniformBp() < lootboxRisk(state, data, live.hardnessBp, intensive)) {
    live.hardnessBp = Math.max(0, live.hardnessBp - data.opsEvents.lootbox.softenBp);
    chronicle(state, "log.aiLootbox", { studio: studio.name });
  }
  const profit = mulDiv(revenue, 52, 12, 1) - aiMonthlyCost(state, data, p, live, salaryCent);
  live.lossMonths = profit < 0 ? live.lossMonths + 1 : 0;
  return revenue;
}

/** S06 7: Nach 6 Monaten Verlust stellt die KI ein; liefert true, wenn das Produkt eingestellt wurde. */
export function aiLiveShutdown(state: GameState, data: GameData, studio: AiStudio, p: AiProduct): boolean {
  const live = p.live;
  if (!live || live.lossMonths < data.liveService.ai.shutdownLossMonths) return false;
  chronicle(state, "log.aiLiveShutdown", { studio: studio.name, players: live.base });
  p.live = null;
  return true;
}

/** Laufende Kosten der KI-Live-Produkte je Woche (für die Kasse des Studios). */
export function aiLiveWeeklyCost(state: GameState, data: GameData, p: AiProduct, salaryCent: number): number {
  return p.live ? mulDiv(aiMonthlyCost(state, data, p, p.live, salaryCent), 12, 52, 1) : 0;
}
