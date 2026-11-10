// Anzeigemodell der Übernahmen und Töchter (S09 Abschnitt 8; Etappe 6b.3 bis 6b.6): Zielfirmen, laufende Verhandlungen
// mit angezeigter Wertspanne, Töchter mit Integration, Moral, Konto und Vorgaben.
import { type Bp, BP_ONE, type Cent } from "../num";
import type { Directives, GameData, GameState } from "../model/types";
import { dateOf } from "../calendar";
import {
  acquisitionsUnlocked, acquisitionWarning, diligenceCost, fullRetentionCent, integrationCapacity, leaveChance, shownRange, subsidiaries, synergyBp,
} from "../systems/uebernahmen";
import { liveStudios, studioPeople } from "../systems/ki/studios";

export interface DealView {
  id: number;
  studio: string;
  phase: "sondiert" | "warten" | "gegenangebot";
  diligence: "keine" | "laufend" | "fertig";
  diligenceWeeksLeft: number;
  diligenceCostCent: Cent;
  /** UEB-R05, UEB-R06: angezeigte Spanne; der wahre Wert und der Mindestpreis bleiben verborgen. */
  range: { low: Cent; mid: Cent; high: Cent };
  findings: string[];
  bidders: number;
  bidCent: Cent;
  counterCent: Cent;
  /** UEB-R12: Warnung, wenn ein Gebot in Höhe der Mitte das Bargeld unter drei Monatskosten drückt. */
  warn: boolean;
}

export interface SubsidiaryView {
  id: number;
  name: string;
  people: number;
  cashCent: Cent;
  purchaseCent: Cent;
  bookCent: Cent;
  integrationBp: Bp;
  integrationState: "gut" | "angespannt" | "chaos";
  moraleBp: Bp;
  cultureFitBp: Bp;
  leaveBp: Bp;
  synergyBp: Bp;
  directives: Directives;
  revenueLastYearCent: Cent;
  /** UEB-R19: Abgänge seit dem Kauf, laufende Halteprämie, Wochen bis zu ihrem Ende und Betrag für den vollen Abschlag. */
  leftCount: number;
  retentionCent: Cent;
  retentionWeeksLeft: number;
  retentionFullCent: Cent;
}

export interface KonzernView {
  visible: boolean;
  unlocked: boolean;
  unlockYear: number;
  unlockPeople: number;
  capacity: number;
  targets: { id: number; name: string; people: number; archetype: string; blockedWeeks: number }[];
  deals: DealView[];
  subsidiaries: SubsidiaryView[];
  /** Schlagzeilen der Welt: Zahl der KI-Töchter. */
  aiSubsidiaries: number;
}

export function konzernView(state: GameState, data: GameData): KonzernView {
  const a = data.acquisitions;
  const year = dateOf(state.startYear, state.week).year;
  const live = liveStudios(state);
  const open = state.acquisitions.deals.filter((d) => d.phase === "sondiert" || d.phase === "warten" || d.phase === "gegenangebot");
  const deals: DealView[] = [];
  for (const d of [...open].sort((x, y) => x.id - y.id)) {
    const s = live.find((x) => x.id === d.targetId);
    if (!s) continue;
    const range = shownRange(state, data, d);
    const t = state.acquisitions.targets[String(s.id)];
    deals.push({
      id: d.id, studio: s.name, phase: d.phase as DealView["phase"], diligence: d.diligence, diligenceWeeksLeft: d.diligenceWeeksLeft,
      diligenceCostCent: diligenceCost(state, data, d), range,
      findings: d.diligence === "fertig" ? (t?.findings ?? []).map((f) => f.type) : [],
      bidders: d.bidders.length, bidCent: d.bidCent, counterCent: d.counterCent,
      warn: acquisitionWarning(state, data, range.mid),
    });
  }
  return {
    visible: year >= a.unlockYear,
    unlocked: acquisitionsUnlocked(state, data),
    unlockYear: a.unlockYear,
    unlockPeople: a.unlockPeople,
    capacity: integrationCapacity(state, data, 0),
    targets: live.filter((s) => !s.parent && !open.some((d) => d.targetId === s.id)).sort((x, y) => x.name.localeCompare(y.name) || x.id - y.id).map((s) => ({
      id: s.id, name: s.name, people: studioPeople(s), archetype: s.archetype,
      blockedWeeks: Math.max(0, (state.acquisitions.targets[String(s.id)]?.blockedUntil ?? 0) - state.week),
    })),
    deals,
    subsidiaries: subsidiaries(state, 0).map((s) => {
      const p = s.parent!;
      return {
        id: s.id, name: s.name, people: studioPeople(s), cashCent: s.cashCent, purchaseCent: p.purchaseCent, bookCent: p.bookCent,
        integrationBp: p.integration.progressBp, integrationState: p.integration.state, moraleBp: p.moraleBp, cultureFitBp: p.cultureFitBp,
        leaveBp: p.integration.progressBp >= BP_ONE ? 0 : leaveChance(state, data, s), synergyBp: synergyBp(data, s), directives: p.directives,
        revenueLastYearCent: s.revenueByYear[1] ?? 0,
        leftCount: p.leftCount,
        retentionCent: state.week < p.retentionUntilWeek ? p.retentionCent : 0,
        retentionWeeksLeft: Math.max(0, p.retentionUntilWeek - state.week),
        retentionFullCent: fullRetentionCent(state, data, s),
      };
    }),
    aiSubsidiaries: live.filter((s) => s.parent && s.parent.ownerId !== 0).length,
  };
}
