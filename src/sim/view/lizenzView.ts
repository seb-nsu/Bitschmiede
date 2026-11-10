// Anzeigemodell des Lizenzmarkts (S04 Abschnitt 8): eigene Engine als Lizenzgeber, Engines im Markt, Verträge.
import { type Bp, type Cent, divBp } from "../num";
import type { EngineId, GameData, GameEvent, GameState, LicenseContract, LicenseModel, LicenseStatus, LicenseTemplateId, LicenseTerms, ModuleMap } from "../model/types";
import {
  activeContract, engineFactorOf, marketEngineLevels, offeredTemplates, offerTerms, playerMarketEngine, referenceRevenue, satisfactionFactors,
  marketE, termsCost,
} from "../systems/lizenzen";
import { teamSizeFor } from "../systems/ki/studios";
import { dateOf } from "../calendar";

export interface LicenseContractView {
  id: number;
  partner: string;
  template: LicenseTemplateId;
  terms: LicenseTerms;
  status: LicenseStatus;
  reason: string;
  satisfactionBp: Bp;
  revenue12Cent: Cent;
  /** Einnahmen je Monat (letzte 12) für die Sparkline. */
  months: Cent[];
}

export interface MarketEngineView {
  id: number;
  engineId: EngineId;
  name: string;
  owner: string;
  style: string;
  model: LicenseModel;
  trustBp: Bp;
  factorBp: Bp;
  customers: number;
  templates: { id: LicenseTemplateId; terms: LicenseTerms; costPerGameCent: Cent }[];
  /** Vertrag des Spielers mit dieser Engine (Lizenzweg). */
  contract: LicenseContractView | null;
}

export interface LicensingView {
  unlocked: boolean;
  own: {
    model: LicenseModel;
    trustBp: Bp;
    templates: { id: LicenseTemplateId; terms: LicenseTerms }[];
    contracts: LicenseContractView[];
    revenue12Cent: Cent;
    /** S13 AUS-R70: Module einzeln anbieten (Schalter), Kunden mit Modul und Jahresgebühr. */
    moduleOffer: { active: boolean; customers: { studio: string; module: string; feeCent: Cent }[] };
  } | null;
  market: MarketEngineView[];
  /** Kennzahl „Anteil Lizenz-Engines“ (Datenblatt Abschnitt 7) an den laufenden KI-Projekten. */
  licensedShareBp: Bp;
}

export interface LicenseEventView {
  engineName: string;
  studioName: string;
  template: LicenseTemplateId;
  terms: LicenseTerms;
  perYearCent: Cent;
  genre: string;
}

function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function studioName(state: GameState, id: number, playerName: string): string {
  return id === 0 ? playerName : state.ai.studios.find((s) => s.id === id)?.name ?? "?";
}

function contractView(state: GameState, data: GameData, c: LicenseContract, partnerId: number, playerName: string): LicenseContractView {
  void data;
  return {
    id: c.id, partner: studioName(state, partnerId, playerName), template: c.template, terms: c.terms, status: c.status, reason: c.reason,
    satisfactionBp: c.satisfactionBp, revenue12Cent: sum(c.revenueByMonth.slice(-12)), months: c.revenueByMonth.slice(-12),
  };
}

export function licensingView(state: GameState, data: GameData, playerName: string): LicensingView {
  const pe = playerMarketEngine(state);
  const own = pe
    ? {
      model: pe.model, trustBp: pe.trustBp,
      templates: (Object.keys(pe.templates) as LicenseTemplateId[]).sort().map((id) => ({ id, terms: pe.templates[id]! })),
      contracts: state.licensing.contracts.filter((c) => c.engineId === pe.id).sort((a, b) => a.id - b.id).map((c) => contractView(state, data, c, c.licenseeId, playerName)),
      revenue12Cent: sum(state.licensing.contracts.filter((c) => c.engineId === pe.id).map((c) => sum(c.revenueByMonth.slice(-12)))),
      moduleOffer: {
        active: state.moduleOffer.active,
        customers: state.moduleOffer.customers.map((c) => ({ studio: state.ai.studios.find((s) => s.id === c.studioId)?.name ?? "", module: c.module, feeCent: c.feeCent })),
      },
    }
    : null;
  const revenue = referenceRevenue(state, data);
  const seats = teamSizeFor(data, dateOf(state.startYear, state.week).year);
  const market = state.licensing.engines.filter((e) => e.ownerId !== 0 && !e.closed).sort((a, b) => a.id - b.id).map((e) => {
    const c = activeContract(state, e.id, 0);
    return {
      id: e.id, engineId: `lizenz:${e.id}` as EngineId, name: e.name, owner: studioName(state, e.ownerId, playerName), style: e.style, model: e.model,
      trustBp: e.trustBp, factorBp: engineFactorOf(state, data, e),
      customers: state.licensing.contracts.filter((x) => x.engineId === e.id && x.status !== "beendet").length,
      templates: offeredTemplates(state, data, e).map((id) => {
        const terms = offerTerms(e, id);
        return { id, terms, costPerGameCent: termsCost(terms, revenue, seats) };
      }),
      contract: c ? contractView(state, data, c, e.ownerId, playerName) : null,
    };
  });
  const projects = state.ai.studios.flatMap((s) => s.teams.map((t) => t.project)).filter((p) => p !== null);
  const licensed = projects.filter((p) => p!.contractId !== null).length;
  return {
    unlocked: state.unlocks.lizenzmarkt !== undefined, own, market,
    licensedShareBp: projects.length === 0 ? 0 : divBp(licensed, projects.length, 1),
  };
}

export function licenseEventView(state: GameState, e: GameEvent, playerName: string): LicenseEventView | undefined {
  const l = e.license;
  if (!l) return undefined;
  return {
    engineName: state.licensing.engines.find((x) => x.id === l.engineId)?.name ?? "?", studioName: studioName(state, l.studioId, playerName),
    template: l.template, terms: l.terms, perYearCent: l.perYearCent, genre: l.genre,
  };
}

/** PRD-R10 mit S04 Lizenzweg: wählbare fremde Engines für ein neues Projekt. */
export function licensedEngineChoices(state: GameState, data: GameData): { id: EngineId; levels: ModuleMap; name: string; templates: LicenseTemplateId[]; contractTemplate: LicenseTemplateId | null }[] {
  return state.licensing.engines.filter((e) => e.ownerId !== 0 && offeredTemplates(state, data, e).length > 0).sort((a, b) => a.id - b.id).map((e) => ({
    id: `lizenz:${e.id}` as EngineId, levels: marketEngineLevels(state, data, e), name: e.name, templates: offeredTemplates(state, data, e),
    contractTemplate: activeContract(state, e.id, 0)?.template ?? null,
  }));
}

/** LIZ-R12, LIZ-R13: Faktoren der Zufriedenheit für die Erklärung eines Kundenstatus. */
export function contractFactors(state: GameState, data: GameData, c: LicenseContract): Record<string, number> {
  return satisfactionFactors(state, data, c, marketE(state, data));
}
