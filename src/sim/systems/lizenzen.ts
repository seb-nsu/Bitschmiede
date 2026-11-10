// S04 Lizenzmarkt (LIZ-R01 bis LIZ-R19, R21, R25 bis R29, R32, R34, R37, R38) mit der Engine-Wahl der KI (S14 KI-R28,
// KI-R29). Engines im Markt: die Engine des Spielers (ownerId 0), reine Engine-Firmen und die Engines der
// Engine-Spezialisten. KI-Studios ohne Lizenz arbeiten mit ihren Hausmitteln (Stand der Technik vor einigen Jahren).
import { type Bp, BP_ONE, type Cent, clamp, divBp, divInt, mulBp, mulDiv } from "../num";
import {
  type AiStudio, type AiTeam, type GameData, type GameEvent, type GameState, type LicenseConsideration, type LicenseContract,
  type LicenseModel, type LicenseTemplateId, type LicenseTerms, type LicensingParams, type LicensingState, type MarketEngine,
  type ModuleMap, type ProviderStyle, LICENSE_TEMPLATES, MODULES,
} from "../model/types";
import { dateOf, isFirstWeekOfMonth, isFirstWeekOfQuarter, isFirstWeekOfYear } from "../calendar";
import { stream } from "../rng";
import { anchorValue, ledgerNow, payLicense } from "./finanzen";
import { engineFactor, engineTeam, laggedLevels, licenseQuality, ownLevels, researchEffort, starterLevels, stateOfArt } from "./engine";
import { chronicle } from "./katalog";
import { log } from "./firma";
import { addEvent } from "./ereignisse";
import { createStudio, liveStudios, monthlyCost, personMonthCost, teamSizeFor, weeklyCost } from "./ki/studios";
import { aiEngineLag, difficulty, logDecision } from "./ki/entscheidung";
import { applyCooperation, bookStudioQuarter, customerSwitched, remember } from "./ki/rivalen";
import { cloneData } from "../clone";

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

function P(data: GameData): LicensingParams {
  return data.engine.licensing;
}

export function emptyLicensing(): LicensingState {
  return { engines: [], contracts: [], nextEngineId: 1, nextContractId: 1, playerEngineId: null, osBonusUntilWeek: -1, firstRequestDone: false, lastPlayerEngine: null };
}

/** ANNAHME bis zu eigenen KI-Engines mit Forschung: Eine KI-Engine steht auf dem Stand der Technik vor lagYears Jahren. */
export function aiEngineLevels(data: GameData, lagYears: number, year: number): ModuleMap {
  return laggedLevels(data, lagYears, year);
}

// ---------- Referenzwerte und Konditionen ----------

/**
 * S04 5, „typisches Mittel-Budget der Epoche“. ANNAHME: ein Team der Epoche ein Jahr lang (AAA: vier Teams), damit
 * Pauschalen zu den Kosten der Spielwelt passen, solange Teams ab 8 Personen fehlen (3.7).
 */
export function referenceBudget(state: GameState, data: GameData, base: "mittel" | "aaa"): Cent {
  const r = P(data).referenceBudget;
  const team = teamSizeFor(data, yearOf(state)) * personMonthCost(state, data) * r.teamMonths;
  return base === "aaa" ? team * r.aaaTeams : team;
}

/** ANNAHME: erwarteter Netto-Umsatz eines Referenzspiels = Referenzbudget · Faktor (Startwert 4). */
export function referenceRevenue(state: GameState, data: GameData): Cent {
  return mulBp(referenceBudget(state, data, "mittel"), P(data).referenceBudget.revenueFactorBp);
}

/** S04 5 Startvorlagen (LIZ-R04: jeweils Royalty oder Abo), skaliert nach Anbieter-Typ (KI-R29). */
export function templateTerms(state: GameState, data: GameData, id: LicenseTemplateId, style: ProviderStyle): LicenseTerms {
  const def = P(data).templates[id];
  const st = P(data).providerStyles[style];
  const y = yearOf(state);
  return {
    flatFeeCent: mulBp(mulBp(referenceBudget(state, data, def.flatFeeBase), def.flatFeeShareBp), st.flatFactorBp),
    flatFeeUnit: "pro_spiel",
    royaltyBp: mulBp(def.royaltyBp, st.royaltyFactorBp),
    royaltyThresholdCent: def.threshold ? anchorValue(P(data).thresholdAnchorsCent, y) : 0,
    seatFeeCent: def.seat ? anchorValue(P(data).seatFeeAnchorsCent, y) : 0,
    termYears: null,
    exclusivity: { kind: "keine", id: null },
    sourceAccess: def.sourceAccess,
    support: def.support,
    updates: def.updates,
  };
}

/** LIZ-R21: Open Source ohne Pauschale, Royalty und Abo. */
export function freeTerms(): LicenseTerms {
  return {
    flatFeeCent: 0, flatFeeUnit: "pro_spiel", royaltyBp: 0, royaltyThresholdCent: 0, seatFeeCent: 0, termYears: null,
    exclusivity: { kind: "keine", id: null }, sourceAccess: true, support: "keiner", updates: "alle",
  };
}

export function defaultTemplates(state: GameState, data: GameData, style: ProviderStyle): MarketEngine["templates"] {
  const out: MarketEngine["templates"] = {};
  for (const id of P(data).providerStyles[style].templates) out[id] = templateTerms(state, data, id, style);
  return out;
}

/** Jahreskosten einer Lizenz für ein Spiel mit diesem Umsatz und so vielen Arbeitsplätzen (S04 5, Kosten). */
export function termsCost(terms: LicenseTerms, revenueCent: Cent, seats: number): Cent {
  return terms.flatFeeCent + mulBp(Math.max(0, revenueCent - terms.royaltyThresholdCent), terms.royaltyBp) + seats * terms.seatFeeCent;
}

/** LIZ-R07: Royalty nur auf den Teil des kumulierten Umsatzes eines Spiels über der Schwelle. */
export function royaltyDue(terms: LicenseTerms, cumBeforeCent: Cent, revenueCent: Cent): Cent {
  const thr = terms.royaltyThresholdCent;
  const above = Math.max(0, cumBeforeCent + revenueCent - thr) - Math.max(0, cumBeforeCent - thr);
  return mulBp(above, terms.royaltyBp);
}

/** S04 5: Hürde = h₀ + h₁ · Erfahrung / 100 (Erfahrung 0–10.000 bp). */
export function hurdleBp(data: GameData, experienceBp: Bp): Bp {
  const h = P(data).hurdle;
  return h.h0Bp + mulBp(h.h1Bp, clamp(experienceBp, 0, BP_ONE));
}

// ---------- Engines im Markt ----------

export function engineById(state: GameState, id: number | null): MarketEngine | undefined {
  return id === null ? undefined : state.licensing.engines.find((e) => e.id === id);
}

export function playerMarketEngine(state: GameState): MarketEngine | undefined {
  return engineById(state, state.licensing.playerEngineId);
}

function createMarketEngine(state: GameState, data: GameData, ownerId: number, name: string, style: ProviderStyle, lagYears: number, model: LicenseModel): MarketEngine {
  const e: MarketEngine = {
    id: state.licensing.nextEngineId++, ownerId, name, style, lagYears, model,
    templates: defaultTemplates(state, data, style), trustBp: P(data).providerStyles[style].trustStart,
    worsenedQuarter: -1, lastLoss: null, wasOpenSource: false, revenueByYear: [0], lostToPlayer: 0, customersAtYearStart: 0, closed: false,
  };
  state.licensing.engines.push(e);
  return e;
}

/** Stufen einer Engine im Markt für ein neues Projekt. */
export function marketEngineLevels(state: GameState, data: GameData, e: MarketEngine): ModuleMap {
  if (e.ownerId === 0) return state.engine ? ownLevels(state.engine) : starterLevels(data, state.startYear);
  return aiEngineLevels(data, e.lagYears, yearOf(state));
}

/** Schlüssel der Stufen für den Zwischenspeicher der Projektwahl. */
export function marketEngineKey(state: GameState, e: MarketEngine): string {
  return e.ownerId === 0 ? `p${state.engine?.major ?? 0}.${state.engine?.minor ?? 0}` : `l${e.lagYears}`;
}

/** ENG-R13: E über alle acht Module. */
export function engineE(state: GameState, data: GameData, levels: ModuleMap): Bp {
  return engineFactor(data, levels, MODULES, yearOf(state)).factorBp;
}

function ownerAlive(state: GameState, e: MarketEngine): boolean {
  if (e.closed) return false;
  if (e.ownerId === 0) return state.engine !== null;
  const s = state.ai.studios.find((x) => x.id === e.ownerId);
  return s !== undefined && s.closedWeek === null;
}

/** LIZ-R01, LIZ-R21: angebotene Vorlagen; „indie“ bietet nur die Indie-Vorlage, Open Source eine freie. */
export function offeredTemplates(state: GameState, data: GameData, e: MarketEngine): LicenseTemplateId[] {
  if (e.model === "hausintern" || !ownerAlive(state, e)) return [];
  const y = yearOf(state);
  const ids = LICENSE_TEMPLATES.filter((id) => e.templates[id] && (id !== "abo" || y >= P(data).seatFromYear));
  if (e.model === "open_source") return ids.slice(0, 1);
  if (e.model === "indie") return ids.filter((id) => id === "indie");
  return ids;
}

export function offerTerms(e: MarketEngine, id: LicenseTemplateId): LicenseTerms {
  return e.model === "open_source" ? freeTerms() : cloneData(e.templates[id]!);
}

export function activeContract(state: GameState, engineId: number, licenseeId: number): LicenseContract | undefined {
  return state.licensing.contracts.find((c) => c.engineId === engineId && c.licenseeId === licenseeId && c.status !== "beendet");
}

/** LIZ-R06: Exklusivität eines anderen Kunden sperrt Genre bzw. Plattform (oder alles) für neue Verträge. */
export function exclusivityBlocks(state: GameState, engineId: number, licenseeId: number, genre: string, platforms: readonly string[]): boolean {
  return state.licensing.contracts.some((c) => c.engineId === engineId && c.licenseeId !== licenseeId && c.status !== "beendet" && (
    c.terms.exclusivity.kind === "voll"
    || (c.terms.exclusivity.kind === "genre" && c.terms.exclusivity.id === genre)
    || (c.terms.exclusivity.kind === "plattform" && platforms.includes(c.terms.exclusivity.id ?? ""))));
}

/** ANNAHME 5 der Etappe: Support gilt als erfüllt, solange ein Engine-Team besteht; KI-Anbieter erfüllen immer. */
export function supportFulfillment(state: GameState, e: MarketEngine): Bp {
  if (e.ownerId !== 0) return BP_ONE;
  // BTR-R27: Mit Abteilung Betrieb beantwortet der Topf Engine-Support die Anfragen; offene senken die Zufriedenheit.
  if (state.unlocks["betrieb"] !== undefined) return state.operations.supportFulfillmentBp;
  return engineTeam(state).length > 0 ? BP_ONE : 0;
}

function supportValue(level: LicenseTerms["support"]): Bp {
  return level === "premium" ? BP_ONE : level === "basis" ? divInt(BP_ONE, 2, 1) : 0;
}

// Reiner Zwischenspeicher: Anteil der Karten eines Jahres, die Stufen erlauben (hängt nur von Daten und Stufen ab).
const fitCache = new WeakMap<GameData, Map<string, Bp>>();

/** S04 5 Passung: Anteil der Karten des Jahres, deren Modulstufe die Engine abdeckt (ANNAHME: alle Karten des Jahres). */
export function engineFit(data: GameData, levels: ModuleMap, year: number): Bp {
  let byKey = fitCache.get(data);
  if (!byKey) {
    byKey = new Map();
    fitCache.set(data, byKey);
  }
  const key = `${year}|${MODULES.map((m) => levels[m]).join(",")}`;
  let fit = byKey.get(key);
  if (fit === undefined) {
    if (byKey.size > 512) byKey.clear();
    const avail = data.features.filter((f) => f.availableFrom <= year);
    fit = divBp(avail.filter((f) => f.requires.level <= levels[f.requires.module]).length, Math.max(1, avail.length), 1);
    byKey.set(key, fit);
  }
  return fit;
}

/** S04 5 Ruf: Vertrauen / 100 plus Bonus für Hits mit dieser Engine im letzten Jahr. */
function reputation(state: GameState, data: GameData, e: MarketEngine): Bp {
  const hits = state.ai.products.filter((p) => p.engineId === e.id && p.scoreBp >= data.brands.hitScoreBp && state.week - p.releaseWeek < 52).length;
  return e.trustBp + Math.min(P(data).hitBonusMaxBp, hits * P(data).hitBonusBp);
}

/** Umschulungsverlust in Wochen voller Leistung (LIZ-R27), relativ zur Referenzdauer = Wechselkosten (0–1). */
export function switchCost(data: GameData): Bp {
  const r = P(data).retrain;
  return divBp(mulBp(r.slowWeeks, BP_ONE - r.slowTempoBp) + mulBp(r.mediumWeeks, BP_ONE - r.mediumTempoBp), r.referenceWeeks, 1);
}

export interface EngineOption {
  /** null = Hausmittel (eigene Werkzeuge ohne Markt-Engine). */
  engineId: number | null;
  template: LicenseTemplateId | null;
  terms: LicenseTerms | null;
  levels: ModuleMap;
  key: string;
  parts: Record<LicenseConsideration, Bp>;
  utilityBp: number;
  /** LIZ-R02: Anfrage an die noch hausinterne Engine des Spielers. */
  request: boolean;
}

/** S04 5: U = w₁·Passung + w₂·Qualität − w₃·Kosten + w₄·Support + w₅·Ruf + w₆·Unabhängigkeit − w₇·Wechselkosten. */
export function engineUtility(data: GameData, studio: AiStudio, parts: Record<LicenseConsideration, Bp>): number {
  const w = P(data).weightsBp[studio.archetype];
  return mulBp(w.passung, parts.passung) + mulBp(w.qualitaet, parts.qualitaet) - mulBp(w.kosten, parts.kosten)
    + mulBp(w.support, parts.support) + mulBp(w.ruf, parts.ruf) + mulBp(w.unabhaengigkeit, parts.unabhaengigkeit)
    - mulBp(w.wechsel, parts.wechsel);
}

/** Hausmittel bzw. eigene Engine eines KI-Studios. */
function homeOption(state: GameState, data: GameData, studio: AiStudio): { engineId: number | null; levels: ModuleMap; key: string } {
  const own = engineById(state, studio.ownEngineId);
  if (own && ownerAlive(state, own)) return { engineId: own.id, levels: marketEngineLevels(state, data, own), key: marketEngineKey(state, own) };
  const lag = aiEngineLag(state, data, data.ai.archetypes[studio.archetype].engineLagYears);
  return { engineId: null, levels: aiEngineLevels(data, lag, yearOf(state)), key: `l${lag}` };
}

/** LIZ-R25, KI-R28: alle Engines, die ein Studio für ein Projekt dieses Teams nehmen kann, mit Nutzwert. */
export function engineOptions(state: GameState, data: GameData, studio: AiStudio, team: AiTeam): EngineOption[] {
  const y = yearOf(state);
  const budget = weeklyCost(state, data, team.size) * P(data).retrain.referenceWeeks * 2;
  const revenue = mulBp(budget, P(data).referenceBudget.revenueFactorBp);
  const current = studio.engineId;
  const wechsel = switchCost(data);
  const out: EngineOption[] = [];
  const home = homeOption(state, data, studio);
  const homeParts: Record<LicenseConsideration, Bp> = {
    passung: engineFit(data, home.levels, y), qualitaet: licenseQuality(data, engineE(state, data, home.levels)), kosten: 0,
    support: divInt(BP_ONE, 2, 1), ruf: divInt(BP_ONE, 2, 1), unabhaengigkeit: BP_ONE, wechsel: current === home.engineId ? 0 : wechsel,
  };
  out.push({ ...home, template: null, terms: null, parts: homeParts, utilityBp: engineUtility(data, studio, homeParts), request: false });
  for (const e of state.licensing.engines) {
    if (e.id === home.engineId || !ownerAlive(state, e)) continue;
    const contract = activeContract(state, e.id, studio.id);
    if (contract?.status === "abwandernd") continue;
    let templates = offeredTemplates(state, data, e);
    let request = false;
    // LIZ-R02: Die hausinterne Engine des Spielers bekommt genau eine Anfrage, danach bleibt sie gesperrt (LIZ-T01).
    if (templates.length === 0 && e.ownerId === 0 && e.model === "hausintern" && !state.licensing.firstRequestDone) {
      templates = P(data).providerStyles.spieler.templates;
      request = true;
    }
    if (templates.length === 0) continue;
    const levels = marketEngineLevels(state, data, e);
    const fit = engineFit(data, levels, y);
    const quality = licenseQuality(data, engineE(state, data, levels));
    const os = e.model === "open_source";
    for (const t of contract ? [contract.template] : templates) {
      const terms = contract ? contract.terms : request ? templateTerms(state, data, t, "spieler") : offerTerms(e, t);
      const parts: Record<LicenseConsideration, Bp> = {
        passung: fit, qualitaet: quality,
        kosten: Math.min(BP_ONE, divBp(termsCost(terms, revenue, team.size), Math.max(1, budget), 1)),
        support: mulBp(supportValue(terms.support), supportFulfillment(state, e)),
        ruf: reputation(state, data, e), unabhaengigkeit: terms.sourceAccess || os ? BP_ONE : 0,
        wechsel: current === e.id ? 0 : wechsel,
      };
      let u = engineUtility(data, studio, parts);
      if (os && state.week < state.licensing.osBonusUntilWeek) u += P(data).trust.osBonusBp;
      out.push({ engineId: e.id, template: t, terms, levels, key: marketEngineKey(state, e), parts, utilityBp: u, request });
    }
  }
  return out;
}

/** LIZ-R26: Wechsel nur, wenn U(neu) ≥ U(alt) · (1 + Hürde); bei negativem U(alt) zählt dessen Betrag. */
export function beatsHurdle(data: GameData, uNew: number, uOld: number, experienceBp: Bp): boolean {
  return uNew - uOld >= mulBp(Math.abs(uOld), hurdleBp(data, experienceBp));
}

// ---------- Verträge und Zahlungen ----------

/** Zahlung an den Lizenzgeber: Spieler (Einnahmestrang Lizenzen, LIZ-R15) oder KI-Studio. */
function payLicensor(state: GameState, c: LicenseContract, cent: Cent): void {
  if (cent <= 0) return;
  const e = engineById(state, c.engineId);
  if (e) e.revenueByYear[0] = (e.revenueByYear[0] ?? 0) + cent;
  if (c.licensorId === 0) {
    state.moneyCent += cent;
    ledgerNow(state).income.licenses += cent;
  } else {
    const s = state.ai.studios.find((x) => x.id === c.licensorId);
    if (s && s.closedWeek === null) {
      s.cashCent += cent;
      s.revenueByYear[0] = (s.revenueByYear[0] ?? 0) + cent;
      bookStudioQuarter(s, cent);
    }
  }
  const last = c.revenueByMonth.length - 1;
  if (last >= 0) c.revenueByMonth[last] = c.revenueByMonth[last]! + cent;
}

/** Zahlung des Lizenznehmers (Spieler: Kosten Lizenzen; KI: Kasse) und Gutschrift beim Lizenzgeber. */
export function chargeLicense(state: GameState, c: LicenseContract, cent: Cent): void {
  if (cent <= 0) return;
  // UEB-R35: Gebühren zwischen Konzern und eigener Tochter entfallen.
  if (sameGroup(state, c.licenseeId, c.licensorId)) return;
  if (c.licenseeId === 0) payLicense(state, cent);
  else {
    const s = state.ai.studios.find((x) => x.id === c.licenseeId);
    if (s) s.cashCent -= cent;
  }
  payLicensor(state, c, cent);
}

export function createContract(state: GameState, data: GameData, e: MarketEngine, licenseeId: number, template: LicenseTemplateId, terms: LicenseTerms): LicenseContract {
  const c: LicenseContract = {
    id: state.licensing.nextContractId++, engineId: e.id, licensorId: e.ownerId, licenseeId, template, terms,
    startWeek: state.week, endWeek: terms.termYears === null ? null : state.week + terms.termYears * 52, status: "zufrieden",
    reason: "license.reason.gut", satisfactionBp: P(data).satisfaction.startBp, owedCent: 0, revenueByMonth: [0],
    fulfilled: 0, rejected: 0, worseningBp: 0, openRequest: null,
  };
  state.licensing.contracts.push(c);
  if (e.ownerId === 0) log(state, "log.licenseNew", { studio: studioName(state, licenseeId), template });
  return c;
}

function endContract(state: GameState, c: LicenseContract): void {
  if (c.status === "beendet") return;
  c.status = "beendet";
  c.endWeek = state.week;
  if (c.licensorId === 0) log(state, "log.licenseEnded", { studio: studioName(state, c.licenseeId) });
}

function studioName(state: GameState, id: number): string {
  return state.ai.studios.find((s) => s.id === id)?.name ?? "";
}

/** LIZ-R07: Royalty eines verkauften Spiels wird bis zur Monatsabrechnung vorgemerkt. */
export function accrueRoyalty(state: GameState, contractId: number | null, cumBeforeCent: Cent, revenueCent: Cent): void {
  if (contractId === null || revenueCent <= 0) return;
  const c = state.licensing.contracts.find((x) => x.id === contractId);
  if (c) c.owedCent += royaltyDue(c.terms, cumBeforeCent, revenueCent);
}

/** Pauschale pro Spiel bei Projektstart (S04 LicenseTerms.flatFeeUnit). */
export function chargeProjectStart(state: GameState, c: LicenseContract): void {
  if (c.terms.flatFeeUnit === "pro_spiel") chargeLicense(state, c, c.terms.flatFeeCent);
}

/** Erwartete Jahreseinnahmen aus einem Vertrag mit einem KI-Studio (für die Großkunden-Schwelle). */
function expectedPerYear(state: GameState, data: GameData, studio: AiStudio, terms: LicenseTerms): Cent {
  const revenue = Math.max(studio.revenueByYear[1] ?? 0, studio.revenueByYear[0] ?? 0);
  const teams = Math.max(1, studio.teams.length);
  return termsCost({ ...terms, flatFeeCent: terms.flatFeeCent * teams }, revenue, studio.teams.reduce((s, t) => s + t.size, 0));
}

function hasLicenseEvent(state: GameState, kind: GameEvent["kind"], studioId: number): boolean {
  return [...state.events, ...state.eventQueue].some((e) => e.kind === kind && e.license?.studioId === studioId);
}

export interface EngineChoice {
  engineId: number | null;
  contractId: number | null;
  levels: ModuleMap;
  key: string;
}

/**
 * KI-R28, LIZ-R25 bis LIZ-R27: Engine-Wahl eines KI-Studios beim Projektstart. Die beste Option gilt nur, wenn sie die
 * Hürde gegen die aktuelle übertrifft. Eine Anfrage an den Spieler (Tutorial oder Großkunde) wartet auf seine
 * Entscheidung; bis dahin nimmt das Studio die beste andere Option.
 */
export function chooseEngine(state: GameState, data: GameData, studio: AiStudio, team: AiTeam): EngineChoice {
  const options = engineOptions(state, data, studio, team);
  const current = options.filter((o) => o.engineId === studio.engineId).sort((a, b) => b.utilityBp - a.utilityBp)[0] ?? options[0]!;
  const sorted = [...options].sort((a, b) => b.utilityBp - a.utilityBp || (a.engineId ?? 0) - (b.engineId ?? 0) || (a.template ?? "").localeCompare(b.template ?? ""));
  for (const o of sorted) {
    if (o.engineId === current.engineId || !beatsHurdle(data, o.utilityBp, current.utilityBp, studio.engineExperienceBp)) break;
    // Rückkehr zum Hausmittel (engineId null) braucht keinen Vertrag.
    const e = engineById(state, o.engineId);
    if (e && !activeContract(state, e.id, studio.id)) {
      if (e.ownerId === 0) {
        if (!offerToPlayer(state, data, studio, e, o)) continue;
      } else createContract(state, data, e, studio.id, o.template!, o.terms!);
    }
    return switchTo(state, data, studio, o);
  }
  return useOption(state, studio, current);
}

/** LIZ-R02, LIZ-R05: Anfrage an den Spieler. true = Vertrag sofort (passt zur Vorlage, kein Großkunde). */
function offerToPlayer(state: GameState, data: GameData, studio: AiStudio, e: MarketEngine, o: EngineOption): boolean {
  const info = { engineId: e.id, studioId: studio.id, template: o.template!, terms: o.terms!, contractId: null, perYearCent: expectedPerYear(state, data, studio, o.terms!), genre: studio.mainGenre };
  if (o.request) {
    state.licensing.firstRequestDone = true;
    state.unlocks.lizenzmarkt ??= state.week;
    addEvent(state, data, { kind: "lizenzanfrage", scope: "welt", projectId: null, options: ["annehmen", "ablehnen"], defaultOption: "ablehnen", license: info });
    return false;
  }
  const playerRevenue = Math.max(state.ai.playerRevenueByYear[1] ?? 0, state.ai.playerRevenueByYear[0] ?? 0, referenceRevenue(state, data));
  if (info.perYearCent > mulBp(playerRevenue, P(data).bigCustomerShareBp)) {
    if (!hasLicenseEvent(state, "grosskunde", studio.id)) {
      addEvent(state, data, { kind: "grosskunde", scope: "welt", projectId: null, options: ["rabatt", "quellcode", "exklusiv", "ablehnen"], defaultOption: "rabatt", license: info });
    }
    return false;
  }
  createContract(state, data, e, studio.id, o.template!, o.terms!);
  return true;
}

function switchTo(state: GameState, data: GameData, studio: AiStudio, o: EngineOption): EngineChoice {
  const old = engineById(state, studio.engineId);
  const e = engineById(state, o.engineId);
  if (old && e?.ownerId === 0) old.lostToPlayer += 1;
  customerSwitched(state, data, old, e);
  // Der alte Vertrag nimmt keine neuen Spiele mehr, sobald kein Team mehr damit arbeitet; Royalties laufen weiter.
  if (old) {
    const c = activeContract(state, old.id, studio.id);
    if (c && !studio.teams.some((t) => t.project?.contractId === c.id)) endContract(state, c);
  }
  studio.engineId = o.engineId;
  studio.engineExperienceBp = 0;
  logDecision(data, studio, {
    week: state.week, domain: "engine", choice: e?.name ?? "-", utilityBp: o.utilityBp,
    reasons: topReasons(o.parts), viaGut: false,
  });
  return useOption(state, studio, o);
}

function topReasons(parts: Record<LicenseConsideration, Bp>): string[] {
  return (Object.keys(parts) as LicenseConsideration[]).filter((k) => k !== "kosten" && k !== "wechsel")
    .sort((a, b) => parts[b] - parts[a] || a.localeCompare(b)).slice(0, 3).map((k) => `license.factor.${k}`);
}

function useOption(state: GameState, studio: AiStudio, o: EngineOption): EngineChoice {
  if (o.engineId === null) return { engineId: null, contractId: null, levels: o.levels, key: o.key };
  const own = studio.ownEngineId === o.engineId;
  if (own) studio.engineId = o.engineId;
  const c = own ? undefined : activeContract(state, o.engineId, studio.id);
  if (!own && !c) {
    // Ohne Vertrag (etwa nach einem Konkurs des Anbieters) bleiben die Hausmittel.
    return { engineId: null, contractId: null, levels: o.levels, key: o.key };
  }
  return { engineId: o.engineId, contractId: c?.id ?? null, levels: o.levels, key: o.key };
}

// ---------- Monatsschritt ----------

/** LIZ-R12: Faktoren der Zufriedenheit eines Monats in bp-Punkten (100 Punkte = 10.000). */
export function satisfactionFactors(state: GameState, data: GameData, c: LicenseContract, marketE: Bp): Record<string, number> {
  const z = P(data).satisfaction;
  const e = engineById(state, c.engineId)!;
  const support = c.terms.support === "keiner" ? z.neutralSupportBp : supportFulfillment(state, e);
  return {
    support: mulDiv(z.z1, support - z.neutralSupportBp, 100, 1),
    technik: mulDiv(z.z2, engineE(state, data, marketEngineLevels(state, data, e)) - marketE, 100, 1),
    anforderungen: c.fulfilled * z.z3 * 100 - c.rejected * z.rejectBp,
    preis: -mulDiv(z.z4, c.worseningBp, 100, 1),
    zeit: -z.z5Bp,
  };
}

/** LIZ-R13: Status aus der Zufriedenheit. */
export function statusFor(data: GameData, satisfactionBp: Bp): LicenseContract["status"] {
  const s = P(data).statusBp;
  return satisfactionBp >= s.zufrieden ? "zufrieden" : satisfactionBp >= s.sicher ? "sicher" : satisfactionBp >= s.gefaehrdet ? "gefaehrdet" : "abwandernd";
}

/** Mittleres E der Engines im Markt (für den Vergleich mit dem Stand der Technik, LIZ-R12). */
export function marketE(state: GameState, data: GameData): Bp {
  const open = state.licensing.engines.filter((e) => ownerAlive(state, e) && e.model !== "hausintern");
  if (open.length === 0) return BP_ONE;
  return divInt(open.reduce((s, e) => s + engineE(state, data, marketEngineLevels(state, data, e)), 0), open.length, 1);
}

function updateSatisfaction(state: GameState, data: GameData, c: LicenseContract, mE: Bp): void {
  const f = satisfactionFactors(state, data, c, mE);
  const sum = Object.values(f).reduce((a, b) => a + b, 0);
  // LIZ-R37: nach jeder Rechnung auf 0–100 begrenzt.
  c.satisfactionBp = clamp(c.satisfactionBp + sum, 0, BP_ONE);
  const before = c.status;
  c.status = statusFor(data, c.satisfactionBp);
  const worst = Object.entries(f).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0]!;
  c.reason = worst[1] < 0 ? `license.reason.${worst[0]}` : "license.reason.gut";
  c.fulfilled = 0;
  c.rejected = 0;
  c.worseningBp = 0;
  if (c.licensorId === 0 && before !== c.status && (c.status === "gefaehrdet" || c.status === "abwandernd")) {
    log(state, c.status === "gefaehrdet" ? "log.licenseAtRisk" : "log.licenseLeaving", { studio: studioName(state, c.licenseeId), reason: c.reason });
  }
}

/** LIZ-R34: Lizenznehmer der Spieler-Engine bestellen Modulstufen beim Engine-Team (Support basis oder premium). */
function licenseeRequests(state: GameState, data: GameData, c: LicenseContract): void {
  if (c.licensorId !== 0 || c.terms.support === "keiner" || !state.engine) return;
  const rng = stream(state, "lizenzen");
  const roll = rng.uniformBp();
  if (c.openRequest !== null && state.engine.jobs.some((j) => j.id === c.openRequest)) return;
  c.openRequest = null;
  if (roll >= P(data).requests.chancePerMonthBp[c.terms.support]) return;
  const y = yearOf(state);
  const engine = state.engine;
  let best: { m: (typeof MODULES)[number]; gap: number } | null = null;
  for (const m of MODULES) {
    const gap = stateOfArt(data, m, y) - engine.modules[m].level;
    if (gap > 0 && engine.modules[m].origin !== "lizenziert" && (best === null || gap > best.gap)) best = { m, gap };
  }
  if (!best) return;
  const level = engine.modules[best.m].level + 1;
  const existing = engine.jobs.find((j) => j.kind === "anforderung" && j.module === best!.m && j.level === level);
  if (existing) {
    existing.licensees = [...(existing.licensees ?? []), c.id];
    c.openRequest = existing.id;
    return;
  }
  const job = {
    id: engine.nextJobId++, kind: "anforderung" as const, module: best.m, level, effortBp: researchEffort(data, best.m, level), doneBp: 0,
    weeksWorked: 0, projects: [], licensees: [c.id], deadlineWeek: state.week + P(data).requests.deadlineWeeks, priority: P(data).requests.priority,
  };
  engine.jobs.push(job);
  c.openRequest = job.id;
  log(state, "log.licenseRequest", { studio: studioName(state, c.licenseeId), module: best.m, level });
}

/** LIZ-R34: erfüllte Anforderung (fertige Arbeit) oder abgelehnte (abgebrochene). */
export function licenseRequestDone(state: GameState, licensees: readonly number[] | undefined, fulfilled: boolean): void {
  for (const id of licensees ?? []) {
    const c = state.licensing.contracts.find((x) => x.id === id);
    if (!c) continue;
    if (fulfilled) c.fulfilled += 1;
    else c.rejected += 1;
    c.openRequest = null;
  }
}

/** Monatlicher Lizenz-Schritt (S04 Schnittstelle S01): Abrechnung, Zufriedenheit, Anforderungen, Vertrauen. */
export function licensingMonthStep(state: GameState, data: GameData): void {
  const mE = marketE(state, data);
  for (const c of [...state.licensing.contracts].sort((a, b) => a.id - b.id)) {
    chargeLicense(state, c, c.owedCent);
    c.owedCent = 0;
    if (c.status !== "beendet") {
      updateSatisfaction(state, data, c, mE);
      licenseeRequests(state, data, c);
      if (c.endWeek !== null && state.week >= c.endWeek) renewOrEnd(state, data, c);
    }
    c.revenueByMonth = [...c.revenueByMonth, 0].slice(-24);
  }
  // Verträge ohne laufende Projekte und Spiele im Handel fallen aus der Liste (Spielstand klein halten).
  const used = new Set<number>();
  for (const p of state.ai.products) if (p.contractId !== null) used.add(p.contractId);
  for (const s of state.ai.studios) for (const t of s.teams) if (t.project?.contractId) used.add(t.project.contractId);
  for (const p of state.projects) if (p.licenseContractId !== null && !(p.sales?.ended ?? false)) used.add(p.licenseContractId);
  state.licensing.contracts = state.licensing.contracts.filter((c) => c.status !== "beendet" || used.has(c.id) || c.owedCent > 0);
  if (isFirstWeekOfQuarter(state.week)) quarterlyTrust(state, data);
}

/** LIZ-R11: Bei Laufzeitende verlängert ein Kunde, der nicht abwandert, um dieselbe Laufzeit. */
function renewOrEnd(state: GameState, data: GameData, c: LicenseContract): void {
  if (c.status === "abwandernd" || c.terms.termYears === null) endContract(state, c);
  else c.endWeek = state.week + c.terms.termYears * 52;
  void data;
}

/** LIZ-R18, LIZ-R19: Vertrauen +1 je Quartal ohne Verschlechterung; großer Anbieter unter 40 stärkt Open Source. */
function quarterlyTrust(state: GameState, data: GameData): void {
  const q = divInt(state.week, 13, 1);
  const t = P(data).trust;
  const total = state.licensing.contracts.filter((c) => c.status !== "beendet").length;
  for (const e of state.licensing.engines) {
    if (e.worsenedQuarter < q - 1) e.trustBp = clamp(e.trustBp + t.gainPerQuarterBp, 0, BP_ONE);
    const customers = state.licensing.contracts.filter((c) => c.engineId === e.id && c.status !== "beendet").length;
    const big = total > 0 && divBp(customers, total, 1) >= t.bigProviderShareBp;
    if (big && e.trustBp < t.osBonusBelowBp && state.week >= state.licensing.osBonusUntilWeek) state.licensing.osBonusUntilWeek = state.week + t.osBonusWeeks;
  }
}

// ---------- Vertrauen bei Preisänderungen ----------

/** Jahreskosten der Konditionen für ein Referenzspiel der Epoche (Nenner und Vergleich in ΔVertrauen). */
export function referenceCost(state: GameState, data: GameData, terms: LicenseTerms): Cent {
  return termsCost(terms, referenceRevenue(state, data), teamSizeFor(data, yearOf(state)));
}

/**
 * LIZ-R16, LIZ-R38, S04 5: ΔVertrauen = −v₁ · (Kosten_neu − Kosten_alt) / max(Kosten_alt, Referenzkosten); war die
 * Lizenz kostenlos, fest −30. LIZ-R17: Eine Rücknahme auf den alten Preis bringt die Hälfte zurück. Liefert den Anteil
 * der Verschlechterung (bp) für die Zufriedenheit (z₄).
 */
export function changeTerms(state: GameState, data: GameData, e: MarketEngine, oldTerms: LicenseTerms, newTerms: LicenseTerms): Bp {
  const t = P(data).trust;
  const before = referenceCost(state, data, oldTerms);
  const after = referenceCost(state, data, newTerms);
  if (after > before) {
    const ref = referenceCost(state, data, templateTerms(state, data, "standard", "spieler"));
    const loss = before === 0 ? t.fromZeroLossBp : mulDiv(t.v1 * 100, after - before, Math.max(before, ref), 1);
    e.trustBp = clamp(e.trustBp - loss, 0, BP_ONE);
    e.worsenedQuarter = divInt(state.week, 13, 1);
    e.lastLoss = { lossBp: loss, costBeforeCent: before };
    return divBp(after - before, Math.max(before, ref, 1), 1);
  }
  if (e.lastLoss && after <= e.lastLoss.costBeforeCent) {
    e.trustBp = clamp(e.trustBp + divInt(e.lastLoss.lossBp, 2, 1), 0, BP_ONE);
    e.lastLoss = null;
  }
  return 0;
}

// ---------- Jahresschritt ----------

/** S04 Abschnitt 7: Preis-Schock eines KI-Anbieters (Umsatz stagniert, Marktanteil > 30 %; je Jahr nach Aggressivität). */
export function priceShock(state: GameState, data: GameData, e: MarketEngine): void {
  const add = P(data).priceShock.royaltyAddBp;
  for (const id of LICENSE_TEMPLATES) {
    const tpl = e.templates[id];
    if (tpl && tpl.royaltyBp > 0) tpl.royaltyBp += add;
  }
  let first = true;
  for (const c of state.licensing.contracts.filter((x) => x.engineId === e.id && x.status !== "beendet").sort((a, b) => a.id - b.id)) {
    if (c.terms.royaltyBp === 0) continue;
    const old = structuredClone(c.terms);
    c.terms.royaltyBp += add;
    // Der Vertrauensverlust trifft den Anbieter einmal, die Verschlechterung jeden Kunden.
    const w = first ? changeTerms(state, data, e, old, c.terms) : divBp(referenceCost(state, data, c.terms) - referenceCost(state, data, old), Math.max(1, referenceCost(state, data, old)), 1);
    first = false;
    c.worseningBp = Math.max(c.worseningBp, w);
    if (c.licenseeId === 0) {
      // LIZ-R32, LIZ-T06: genau eine Fokus-Karte mit vier Optionen und den Mehrkosten pro Jahr.
      const revenue = playerRevenueWith(state, c.id) || referenceRevenue(state, data);
      addEvent(state, data, {
        kind: "preisschock", scope: "welt", projectId: null, options: ["akzeptieren", "nachverhandeln", "wechsel", "eigeneEngine"], defaultOption: "akzeptieren",
        license: { engineId: e.id, studioId: e.ownerId, template: c.template, terms: structuredClone(c.terms), contractId: c.id, perYearCent: mulBp(revenue, add), genre: "" },
      });
    }
  }
  chronicle(state, "log.priceShock", { engine: e.name, royalty: e.templates.standard?.royaltyBp ?? add });
}

/** Netto-Umsatz der letzten 52 Wochen aus Spielen des Spielers mit diesem Vertrag. */
function playerRevenueWith(state: GameState, contractId: number): Cent {
  return state.projects.filter((p) => p.licenseContractId === contractId && p.sales)
    .reduce((s, p) => s + p.sales!.revenueCent, 0);
}

/** S04 Abschnitt 7: Wer in einem Jahr mehr als 20 % seiner Kunden an den Spieler verliert, senkt die Preise um 20–40 %. */
function lossReaction(state: GameState, data: GameData, e: MarketEngine): void {
  const r = P(data).lossReaction;
  if (e.customersAtYearStart === 0 || divBp(e.lostToPlayer, e.customersAtYearStart, 1) <= r.lostShareBp) return;
  const cut = stream(state, "lizenzen").range(r.cutMinBp, r.cutMaxBp);
  const keep = BP_ONE - cut;
  for (const id of LICENSE_TEMPLATES) {
    const tpl = e.templates[id];
    if (!tpl) continue;
    tpl.royaltyBp = mulBp(tpl.royaltyBp, keep);
    tpl.flatFeeCent = mulBp(tpl.flatFeeCent, keep);
  }
  chronicle(state, "log.engineRivalCut", { engine: e.name, cut: divInt(cut, 100, 1) });
}

/** Neue Preise der Epoche für neue Verträge der KI-Anbieter (bestehende Verträge behalten ihre Konditionen). */
function reprice(state: GameState, data: GameData, e: MarketEngine): void {
  const fresh = defaultTemplates(state, data, e.style);
  for (const id of LICENSE_TEMPLATES) {
    const tpl = e.templates[id];
    const f = fresh[id];
    if (!tpl || !f) continue;
    tpl.flatFeeCent = f.flatFeeCent;
    tpl.royaltyThresholdCent = f.royaltyThresholdCent;
    tpl.seatFeeCent = f.seatFeeCent;
  }
}

/** LIZ-R08: Arbeitsplatz-Abo jährlich für die Entwickler, die mit der Engine arbeiten. */
function seatFees(state: GameState): void {
  for (const c of state.licensing.contracts.filter((x) => x.status !== "beendet" && (x.terms.seatFeeCent > 0 || x.terms.flatFeeUnit === "pro_jahr"))) {
    let seats: number;
    if (c.licenseeId === 0) {
      const ids = new Set(state.projects.filter((p) => p.licenseContractId === c.id && (p.status === "laeuft" || p.status === "bereit")).map((p) => p.id));
      seats = state.people.filter((p) => p.assignment?.kind === "project" && ids.has(p.assignment.id)).length;
    } else {
      const s = state.ai.studios.find((x) => x.id === c.licenseeId);
      seats = s ? s.teams.filter((t) => t.project?.contractId === c.id).reduce((a, t) => a + t.size, 0) : 0;
    }
    chargeLicense(state, c, seats * c.terms.seatFeeCent + (c.terms.flatFeeUnit === "pro_jahr" ? c.terms.flatFeeCent : 0));
  }
}

export function licensingYearStep(state: GameState, data: GameData): void {
  const ps = P(data).priceShock;
  const keep = ps.stagnantYears + 2;
  const rng = stream(state, "lizenzen");
  const total = state.licensing.contracts.filter((c) => c.status !== "beendet").length;
  const aggression = difficulty(state, data).aggressionBp;
  for (const e of [...state.licensing.engines].sort((a, b) => a.id - b.id)) {
    e.revenueByYear = [0, ...e.revenueByYear].slice(0, keep);
    if (!ownerAlive(state, e) || e.ownerId === 0) continue;
    const customers = state.licensing.contracts.filter((c) => c.engineId === e.id && c.status !== "beendet").length;
    reprice(state, data, e);
    lossReaction(state, data, e);
    const last = e.revenueByYear[1] ?? 0;
    const earlier = e.revenueByYear[ps.stagnantYears + 1];
    const roll = rng.uniformBp();
    if (earlier !== undefined && last <= earlier && total > 0 && divBp(customers, total, 1) > ps.minShareBp && roll < mulBp(ps.chancePerYearBp, aggression)) {
      priceShock(state, data, e);
    }
    e.lostToPlayer = 0;
    e.customersAtYearStart = customers;
  }
  seatFees(state);
  ownEngines(state, data);
}

/** LIZ-R28: KI-Studios ab 80 Personen und drei Gewinnjahren bauen eine eigene Engine und werden Lizenzgeber. */
function ownEngines(state: GameState, data: GameData): void {
  const o = P(data).ownEngine;
  for (const s of liveStudios(state)) {
    if (s.ownEngineId !== null) continue;
    const people = s.teams.reduce((a, t) => a + t.size, 0);
    if (s.archetype !== "engine" && (people < o.minPeople || s.profitYears < o.profitYears)) continue;
    // Prüfung Fable 03.11.2026 (LIZ-R28): Jede KI-Engine hat ihren eigenen Rückstand; sonst stehen 2020 alle auf Qualität 1,00.
    const lag = data.ai.archetypes[s.archetype].engineLagYears + stream(state, "lizenzen").range(0, o.lagSpreadYears);
    const e = createMarketEngine(state, data, s.id, s.name, "spezialist", lag, "kommerziell");
    s.ownEngineId = e.id;
    if (s.archetype !== "engine") chronicle(state, "log.aiOwnEngine", { studio: s.name });
  }
}

/** Reine Engine-Firmen (ab 1990 eine, ab 2000 zwei; Plan Etappe 3): Engine-Riesen ohne eigene Spiele. */
function engineFirms(state: GameState, data: GameData): void {
  const f = P(data).engineFirms;
  const want = anchorValue(f.countAnchors, yearOf(state));
  const have = state.licensing.engines.filter((e) => e.style === "riese" && ownerAlive(state, e)).length;
  for (let i = have; i < want; i++) {
    const rng = stream(state, "ki");
    const s = createStudio(state, data, rng, "engine", "klein", 0);
    s.teams = [];
    s.engineStaff = f.staff;
    s.size = "klein";
    s.cashCent = f.startCashMonths * monthlyCost(state, data, s);
    const e = createMarketEngine(state, data, s.id, s.name, "riese", f.lagYears, "kommerziell");
    s.ownEngineId = e.id;
    chronicle(state, "log.engineFirmFounded", { studio: s.name });
  }
}

/** Engines pleite gegangener Anbieter verlassen den Markt; ihre Verträge enden (ANNAHME, bis zur Konkursmasse 3.10). */
function closeDeadEngines(state: GameState): void {
  for (const e of state.licensing.engines) {
    if (e.closed || e.ownerId === 0) continue;
    const s = state.ai.studios.find((x) => x.id === e.ownerId);
    if (s && s.closedWeek === null) continue;
    e.closed = true;
    for (const c of state.licensing.contracts.filter((x) => x.engineId === e.id)) endContract(state, c);
    for (const st of state.ai.studios) if (st.engineId === e.id) st.engineId = null;
  }
  state.licensing.engines = state.licensing.engines.filter((e) => !e.closed || state.licensing.contracts.some((c) => c.engineId === e.id));
}

/** Tick-Schritt 3 vor den KI-Entscheidungen: Spieler-Engine im Markt, Engine-Firmen, eigene Engines, Konkurse. */
export function licensingWeekStep(state: GameState, data: GameData): void {
  if (state.engine && state.licensing.playerEngineId === null) {
    const e = createMarketEngine(state, data, 0, state.engine.name, "spieler", 0, "hausintern");
    state.licensing.playerEngineId = e.id;
  }
  const pe = playerMarketEngine(state);
  if (pe && state.engine) pe.name = state.engine.name;
  closeDeadEngines(state);
  if (isFirstWeekOfYear(state.week) || state.week === 0) {
    engineFirms(state, data);
    ownEngines(state, data);
  }
}

/** Tick-Schritt 10 (nach Betrieb): Monats- und Jahresschritt des Lizenzmarkts. */
export function licensingStep(state: GameState, data: GameData): void {
  if (isFirstWeekOfYear(state.week) && state.week > 0) licensingYearStep(state, data);
  if (isFirstWeekOfMonth(state.startYear, state.week)) licensingMonthStep(state, data);
}

// ---------- Spieler als Lizenzgeber ----------

export function validateLicenseModel(state: GameState, model: LicenseModel): string | null {
  if (!playerMarketEngine(state)) return "error.noEngine";
  if (!["hausintern", "kommerziell", "indie", "open_source"].includes(model)) return "error.amount";
  return null;
}

/** S04 Abschnitt 6: Lizenzmodell. LIZ-R24, LIZ-R38: Open Source zurück zu Gebühren kostet 40 Punkte Vertrauen. */
export function setLicenseModel(state: GameState, data: GameData, model: LicenseModel): void {
  const e = playerMarketEngine(state)!;
  if (e.model === "open_source" && model !== "open_source" && model !== "hausintern") {
    const t = P(data).trust;
    e.trustBp = clamp(e.trustBp - t.fromZeroLossBp - t.openSourceReturnExtraBp, 0, BP_ONE);
    e.worsenedQuarter = divInt(state.week, 13, 1);
  }
  if (model === "open_source") e.wasOpenSource = true;
  e.model = model;
  if (model !== "hausintern") state.unlocks.lizenzmarkt ??= state.week;
}

export function validateLicenseTemplate(state: GameState, template: LicenseTemplateId, terms: LicenseTerms | null): string | null {
  if (!playerMarketEngine(state)) return "error.noEngine";
  if (!LICENSE_TEMPLATES.includes(template)) return "error.amount";
  if (!terms) return null;
  const ints = [terms.flatFeeCent, terms.royaltyBp, terms.royaltyThresholdCent, terms.seatFeeCent];
  if (ints.some((x) => !Number.isSafeInteger(x) || x < 0) || terms.royaltyBp > 3000) return "error.amount";
  if (terms.termYears !== null && (!Number.isInteger(terms.termYears) || terms.termYears < 1 || terms.termYears > 20)) return "error.amount";
  return null;
}

/** S04 Abschnitt 6 „Konditionen ändern“: für Bestandskunden mit Vertrauensfolge (LIZ-R16, LIZ-R17). */
export function setLicenseTemplate(state: GameState, data: GameData, template: LicenseTemplateId, terms: LicenseTerms | null, applyToExisting: boolean): void {
  const e = playerMarketEngine(state)!;
  if (terms === null) delete e.templates[template];
  else e.templates[template] = structuredClone(terms);
  if (!applyToExisting || terms === null) return;
  let w: Bp | null = null;
  for (const c of state.licensing.contracts.filter((x) => x.engineId === e.id && x.template === template && x.status !== "beendet").sort((a, b) => a.id - b.id)) {
    const old = c.terms;
    c.terms = { ...structuredClone(terms), exclusivity: old.exclusivity };
    w ??= changeTerms(state, data, e, old, c.terms);
    c.worseningBp = Math.max(c.worseningBp, w);
  }
}

// ---------- Spieler als Lizenznehmer ----------

export function parseLicensedEngine(id: string | undefined): number | null {
  if (!id?.startsWith("lizenz:")) return null;
  const n = Number(id.slice("lizenz:".length));
  return Number.isSafeInteger(n) ? n : null;
}

/** Vorlage, die ein Spieler-Projekt bekommt: gewählt, sonst „standard“, sonst die erste angebotene. */
export function playerTemplate(state: GameState, data: GameData, e: MarketEngine, wanted: LicenseTemplateId | undefined): LicenseTemplateId | null {
  const c = activeContract(state, e.id, 0);
  if (c) return c.template;
  const offered = offeredTemplates(state, data, e);
  if (wanted) return offered.includes(wanted) ? wanted : null;
  return offered.includes("standard") ? "standard" : offered[0] ?? null;
}

export function validatePlayerLicense(state: GameState, data: GameData, engineId: number, template: LicenseTemplateId | undefined, genre: string, platforms: readonly string[]): string | null {
  const e = engineById(state, engineId);
  if (!e || e.ownerId === 0 || !ownerAlive(state, e)) return "error.noEngine";
  const c = activeContract(state, e.id, 0);
  if (c?.status === "beendet") return "error.licenseEnded";
  const t = playerTemplate(state, data, e, template);
  if (!t) return "error.licenseTemplate";
  if (exclusivityBlocks(state, e.id, 0, genre, platforms)) return "error.licenseExclusive";
  const fee = c ? c.terms.flatFeeCent : offerTerms(e, t).flatFeeCent;
  if (fee > Math.max(0, state.moneyCent)) return "error.notEnoughMoney";
  return null;
}

/**
 * S04 Lizenzweg beim Projektstart: Vertrag anlegen oder weiterführen, Pauschale zahlen; LIZ-R27: Wechselt der Spieler
 * die Engine, arbeitet das Projekt einige Wochen langsamer.
 */
export function startPlayerProject(state: GameState, data: GameData, project: { id: number; engine: { id: string }; licenseContractId: number | null; retrainWeeks: number }, template: LicenseTemplateId | undefined): void {
  const engineId = parseLicensedEngine(project.engine.id);
  if (engineId !== null) {
    const e = engineById(state, engineId)!;
    let c = activeContract(state, e.id, 0);
    if (!c) {
      const t = playerTemplate(state, data, e, template)!;
      c = createContract(state, data, e, 0, t, offerTerms(e, t));
    }
    project.licenseContractId = c.id;
    chargeProjectStart(state, c);
  }
  // ANNAHME: Umschulung nur beim Wechsel zu oder von einer fremden Engine; Starter- und eigene Engine kennt das Team.
  const last = state.licensing.lastPlayerEngine;
  if (last !== null && last !== project.engine.id && (last.startsWith("lizenz:") || project.engine.id.startsWith("lizenz:"))) project.retrainWeeks = 1;
  state.licensing.lastPlayerEngine = project.engine.id;
}

/** LIZ-R27: Tempo in der Umschulung (4 Wochen 50 %, 4 Wochen 80 %); Woche 0 = keine Umschulung. */
export function retrainTempo(data: GameData, week: number): Bp {
  const r = P(data).retrain;
  if (week <= 0) return BP_ONE;
  if (week <= r.slowWeeks) return r.slowTempoBp;
  if (week <= r.slowWeeks + r.mediumWeeks) return r.mediumTempoBp;
  return BP_ONE;
}

export function retrainDone(data: GameData, week: number): boolean {
  const r = P(data).retrain;
  return week > r.slowWeeks + r.mediumWeeks;
}

// ---------- Entscheidungen ----------

export function applyLicenseDecision(state: GameState, data: GameData, event: GameEvent, option: string): void {
  const info = event.license;
  if (!info) return;
  const e = engineById(state, info.engineId);
  const studio = state.ai.studios.find((s) => s.id === info.studioId);
  switch (event.kind) {
    case "lizenzanfrage":
    case "grosskunde": {
      if (option === "ablehnen" || !e || !studio || studio.closedWeek !== null) return;
      if (event.kind === "lizenzanfrage") {
        e.model = "kommerziell";
        state.unlocks.lizenzmarkt ??= state.week;
      }
      const terms = structuredClone(info.terms);
      const bc = P(data).bigCustomer;
      if (option === "rabatt") terms.royaltyBp = mulBp(terms.royaltyBp, BP_ONE - bc.discountBp);
      if (option === "quellcode") terms.sourceAccess = true;
      if (option === "exklusiv") {
        terms.exclusivity = { kind: "genre", id: info.genre };
        terms.royaltyBp += bc.exclusiveRoyaltyAddBp;
      }
      if (exclusivityBlocks(state, e.id, studio.id, info.genre, [])) return;
      createContract(state, data, e, studio.id, info.template, terms);
      const old = engineById(state, studio.engineId);
      if (old && old.id !== e.id) old.lostToPlayer += 1;
      customerSwitched(state, data, old, e);
      // S08 Tabelle 5.6: faire Lizenzverhandlung mit einem Rivalen.
      if (studio.rival) remember(state, data, studio, "fairLicense");
      studio.engineId = e.id;
      studio.engineExperienceBp = 0;
      return;
    }
    case "preisschock": {
      const c = state.licensing.contracts.find((x) => x.id === info.contractId);
      if (!c) return;
      const add = P(data).priceShock.royaltyAddBp;
      if (option === "nachverhandeln") c.terms.royaltyBp -= mulBp(add, P(data).renegotiateBackBp);
      if (option === "wechsel" || option === "eigeneEngine") {
        // ANNAHME: Wer den Wechsel plant, zahlt für die Spiele mit dieser Engine die alten Konditionen, nimmt sie aber
        // für neue Projekte nicht mehr.
        c.terms.royaltyBp = Math.max(0, c.terms.royaltyBp - add);
        endContract(state, c);
        if (option === "eigeneEngine" && !state.engine) log(state, "log.licenseOwnEngineHint", {});
      }
      return;
    }
    case "kooperation":
      applyCooperation(state, data, info, option);
      return;
    default:
      return;
  }
}

/** E einer Engine im Markt mit ihren aktuellen Stufen. */
export function engineFactorOf(state: GameState, data: GameData, e: MarketEngine): Bp {
  return engineE(state, data, marketEngineLevels(state, data, e));
}

/** UEB-R35: Gehören Lizenznehmer und Lizenzgeber zum selben Konzern (Mutter oder Tochter)? */
function sameGroup(state: GameState, a: number, b: number): boolean {
  const owner = (id: number): number => (id === 0 ? 0 : state.ai.studios.find((x) => x.id === id)?.parent?.ownerId ?? id);
  return owner(a) === owner(b);
}
