// Ladepipeline für das Grundspiel (TEC-R31, TEC-R33, TEC-R34).
// Etappe 0 lädt nur data/base; Mods, Operationen und Konflikte kommen mit Etappe 1.
import mod from "../../data/base/mod.json";
import quality from "../../data/base/dev/quality.json";
import bugs from "../../data/base/dev/bugs.json";
import phases from "../../data/base/dev/phases.json";
import projects from "../../data/base/dev/projects.json";
import features from "../../data/base/dev/features.json";
import genres from "../../data/base/dev/genres.json";
import themes from "../../data/base/dev/themes.json";
import subgenres from "../../data/base/dev/subgenres.json";
import synergies from "../../data/base/dev/synergies.json";
import trends from "../../data/base/dev/trends.json";
import sales from "../../data/base/dev/sales.json";
import marketing from "../../data/base/dev/marketing.json";
import release from "../../data/base/dev/release.json";
import piracy from "../../data/base/dev/piracy.json";
import tradeShows from "../../data/base/dev/tradeshows.json";
import distribution from "../../data/base/dev/distribution.json";
import exploitation from "../../data/base/dev/exploitation.json";
import operations from "../../data/base/ops/operations.json";
import liveService from "../../data/base/ops/liveservice.json";
import opsEvents from "../../data/base/ops/events.json";
import merch from "../../data/base/market/merch.json";
import goals from "../../data/base/core/goals.json";
import start from "../../data/base/start/garage.json";
import time from "../../data/base/core/time.json";
import presets from "../../data/base/core/presets.json";
import economy from "../../data/base/core/economy.json";
import marketPhases from "../../data/base/market/phases.json";
import publishers from "../../data/base/market/publishers.json";
import future from "../../data/base/market/future.json";
import acquisitions from "../../data/base/core/acquisitions.json";
import stock from "../../data/base/core/stock.json";
import regions from "../../data/base/core/regions.json";
import market from "../../data/base/market/platforms.json";
import makers from "../../data/base/market/makers.json";
import staff from "../../data/base/staff.json";
import delegation from "../../data/base/delegation.json";
import equipment from "../../data/base/equipment.json";
import offices from "../../data/base/core/offices.json";
import brandMarket from "../../data/base/market/brandmarket.json";
import stage from "../../data/base/stage/config.json";
import productTypes from "../../data/base/dev/producttypes.json";
import catalog from "../../data/base/events/katalog.json";
import chains from "../../data/base/events/chains.json";
import unlocks from "../../data/base/core/unlocks.json";
import { conditionError } from "../sim/systems/katalog";
import events from "../../data/base/dev/events.json";
import playtests from "../../data/base/dev/playtests.json";
import contracts from "../../data/base/dev/contracts.json";
import contractGames from "../../data/base/dev/contractgames.json";
import audiences from "../../data/base/dev/audiences.json";
import pillars from "../../data/base/dev/pillars.json";
import phaseFocus from "../../data/base/dev/phasefocus.json";
import polish from "../../data/base/dev/polish.json";
import localization from "../../data/base/market/localization.json";
import applications from "../../data/base/dev/applications.json";
import engineModules from "../../data/base/engine/modules.json";
import engineFactor from "../../data/base/engine/factor.json";
import engineDebt from "../../data/base/engine/debt.json";
import engineVersions from "../../data/base/engine/versions.json";
import middleware from "../../data/base/engine/middleware.json";
import aiStudios from "../../data/base/ai/studios.json";
import aiNames from "../../data/base/ai/names.json";
import aiDifficulty from "../../data/base/ai/difficulty.json";
import aiTraits from "../../data/base/ai/traits.json";
import aiConsiderations from "../../data/base/ai/considerations.json";
import aiRivals from "../../data/base/ai/rivals.json";
import binding from "../../data/base/engine/binding.json";
import requests from "../../data/base/engine/requests.json";
import licensing from "../../data/base/engine/licensing.json";
import brands from "../../data/base/brands.json";
import techUpdate from "../../data/base/events/techupdate.json";
import { hash32 } from "../sim/rng";
import { loadWithMods, type ModBundle, type ModLoadResult } from "./modding";
import { GAME_VERSION } from "../sim/save";
import {
  AREAS, SCOPES,
  type FeatureDef, type GameData, type GenreDef, type SubgenreDef, type Area, type QualityParams, type GoalParams, type BugParams,
  type AiParams, type MakerParams, type StaffParams, type DelegationParams, type EquipmentParams, type ProjectParams, type SalesParams, type MarketingParams, type ReleaseParams, type PiracyParams, type DistributionParams, type ExploitationParams, type OperationsParams, type LiveServiceParams, type OpsEventParams, type MarketPhaseParams, type PublisherParams, type RegionParams, type FutureParams, type AcquisitionParams, type StockParams, type MerchParams, type StartParams, type SynergyRule, type TimeParams,
  type EventParams, type PlaytestParams, type ContractParams, type ContractGameParams, type AudienceParams, type PillarParams, type PhaseFocusParams, type PolishParams, type LocalizationParams, type ApplicationParams, type BrandParams, type EngineParams, type PerformanceParams, MODULES, type PresetDef, type EconomyParams, type PlatformDef, type MediumDef, type OfficeParams, type BrandMarketParams, type StageParams, type ProductTypeDef, type CatalogParams, type UnlockParams, type ThemeDef, type TrendParams,
} from "../sim/model/types";

export class DataError extends Error {
  constructor(file: string, where: string, problem: string) {
    super(`${file} (${where}): ${problem}`);
  }
}

function byId<T extends { id: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function isInt(x: unknown): x is number {
  return typeof x === "number" && Number.isSafeInteger(x);
}

/** TEC-R33: Prüft die Daten und meldet Datei und Stelle. */
export function validate(data: GameData): void {
  const themeIds = new Set(data.themes.map((t) => t.id));
  for (const g of data.genres) {
    let sum = 0;
    for (const a of AREAS) {
      const v = g.expectedProfile[a];
      if (!isInt(v) || v < 0) throw new DataError("dev/genres.json", `${g.id}.expectedProfile.${a}`, "keine ganze Zahl ≥ 0");
      sum += v;
    }
    if (sum !== 10000) throw new DataError("dev/genres.json", `${g.id}.expectedProfile`, `Summe ${sum} statt 10000`);
    for (const t of themeIds) {
      if (!isInt(g.themeFit[t])) throw new DataError("dev/genres.json", `${g.id}.themeFit.${t}`, "fehlt");
    }
  }
  const genreIds = new Set(data.genres.map((g) => g.id));
  for (const sg of data.subgenres) {
    if (!genreIds.has(sg.genre)) throw new DataError("dev/subgenres.json", sg.id, `unbekanntes Genre ${sg.genre}`);
    if (genreIds.has(sg.id)) throw new DataError("dev/subgenres.json", sg.id, "ID gleich einem Genre");
    let shift = 0;
    for (const [a, v] of Object.entries(sg.profileShiftBp)) {
      if (!AREAS.includes(a as Area) || !isInt(v)) throw new DataError("dev/subgenres.json", `${sg.id}.profileShiftBp.${a}`, "unbekannter Bereich oder keine ganze Zahl");
      shift += v;
    }
    if (shift !== 0) throw new DataError("dev/subgenres.json", `${sg.id}.profileShiftBp`, `Summe ${shift} statt 0`);
    for (const [t, v] of Object.entries(sg.themeBonusBp)) {
      if (!themeIds.has(t) || !isInt(v)) throw new DataError("dev/subgenres.json", `${sg.id}.themeBonusBp.${t}`, "unbekanntes Thema oder keine ganze Zahl");
    }
  }
  const tagSet = new Set<string>();
  for (const f of data.features) {
    if (!AREAS.includes(f.area)) throw new DataError("dev/features.json", f.id, `unbekannter Bereich ${f.area}`);
    let total = 0;
    for (const [area, v] of Object.entries(f.effort)) {
      if (!AREAS.includes(area as never)) throw new DataError("dev/features.json", `${f.id}.effort.${area}`, "unbekannter Bereich");
      if (!isInt(v) || v <= 0) throw new DataError("dev/features.json", `${f.id}.effort.${area}`, "Aufwand muss > 0 sein");
      total += v;
    }
    if (total <= 0) throw new DataError("dev/features.json", f.id, "kein Aufwand");
    for (const k of ["baseValue", "innovation", "stability", "fun", "contentLevel", "availableFrom"] as const) {
      if (!isInt(f[k])) throw new DataError("dev/features.json", `${f.id}.${k}`, "keine ganze Zahl");
    }
    f.tags.forEach((t) => tagSet.add(t));
    if (f.successor !== undefined) {
      const next = data.features.find((x) => x.id === f.successor);
      if (!next) throw new DataError("dev/features.json", `${f.id}.successor`, `unbekanntes Feature ${f.successor}`);
      if (next.availableFrom <= f.availableFrom) throw new DataError("dev/features.json", `${f.id}.successor`, "Nachfolger muss später erscheinen");
    }
  }
  for (const f of data.features) {
    const need = f.requires;
    if (!need || !MODULES.includes(need.module)) throw new DataError("dev/features.json", `${f.id}.requires`, "unbekanntes Modul");
    if (!isInt(f.performanceCost) || f.performanceCost < 0) throw new DataError("dev/features.json", `${f.id}.performanceCost`, "keine ganze Zahl ≥ 0");
    if (!isInt(need.level) || need.level < 0 || need.level >= data.engine.modules[need.module].length) throw new DataError("dev/features.json", `${f.id}.requires.level`, "Stufe gibt es nicht");
    if (data.engine.modules[need.module][need.level]!.earliestYear > f.availableFrom) throw new DataError("dev/features.json", `${f.id}.requires`, "Modulstufe erst nach dem Feature erreichbar");
  }
  for (const m of MODULES) {
    const levels = data.engine.modules[m];
    if (!levels || levels.length === 0 || levels[0]!.earliestYear > data.start.startYear) throw new DataError("engine/modules.json", m, "Stufe 0 muss ab Spielbeginn bestehen");
    for (let l = 1; l < levels.length; l++) {
      if (levels[l]!.earliestYear < levels[l - 1]!.earliestYear) throw new DataError("engine/modules.json", `${m}.${l}`, "frühestes Jahr darf nicht sinken");
      for (const r of levels[l]!.requires ?? []) {
        if (!MODULES.includes(r.module) || r.level >= data.engine.modules[r.module].length) throw new DataError("engine/modules.json", `${m}.${l}.requires`, "unbekannte Voraussetzung");
      }
    }
    if (!isInt(data.engine.starter[m]) || data.engine.starter[m] >= levels.length) throw new DataError("engine/modules.json", `starter.${m}`, "Stufe gibt es nicht");
  }
  for (const g of data.genres) {
    for (const n of data.brands.near[g.id] ?? []) if (!data.genres.some((x) => x.id === n)) throw new DataError("brands.json", `near.${g.id}`, `unbekanntes Genre ${n}`);
  }
  for (const v of data.engine.middleware.vendors) {
    if (!MODULES.includes(v.module)) throw new DataError("engine/middleware.json", v.id, "unbekanntes Modul");
    for (const k of ["fromYear", "lagYears", "licenseFeeCent", "royaltyBp", "buyPerPwCent", "debtBp"] as const) if (!isInt(v[k]) || v[k] < 0) throw new DataError("engine/middleware.json", `${v.id}.${k}`, "keine ganze Zahl ≥ 0");
    if (v.feeModel !== "groesse" && v.feeModel !== "beteiligung") throw new DataError("engine/middleware.json", `${v.id}.feeModel`, "groesse oder beteiligung");
  }
  for (const s of data.synergies) {
    if (!tagSet.has(s.a) || !tagSet.has(s.b)) throw new DataError("dev/synergies.json", `${s.a}+${s.b}`, "unbekanntes Merkmal");
  }
  const fp = data.start.firstProject;
  if (fp.features.length !== data.projects.featureSlots[fp.scope] || !fp.features.every((id) => data.features.some((f) => f.id === id))) {
    throw new DataError("start/garage.json", "firstProject.features", "Karten unbekannt oder Anzahl passt nicht zum Umfang");
  }
  const mediaIds = new Set(data.media.map((m) => m.id));
  for (const p of data.platforms) {
    if (p.media.length === 0 || p.media.some(([, m]) => !mediaIds.has(m))) throw new DataError("market/platforms.json", `${p.id}.media`, "unbekannter Datenträger");
    if (p.endYear < p.releaseYear) throw new DataError("market/platforms.json", p.id, "endYear vor releaseYear");
    if (p.performanceAnchors && p.performanceAnchors.length === 0) throw new DataError("market/platforms.json", `${p.id}.performanceAnchors`, "leer");
    if (p.priceBp !== undefined && (!isInt(p.priceBp) || p.priceBp <= 0)) throw new DataError("market/platforms.json", `${p.id}.priceBp`, "muss positiv sein");
    if (!data.sales.digitalShareAnchors[p.type]) throw new DataError("dev/sales.json", `digitalShareAnchors.${p.type}`, "fehlt");
    if (p.media.some(([, m]) => data.media.find((x) => x.id === m)!.minBatch <= 0) && !p.digitalOnly && !data.sales.digitalShareAnchors[p.type].every(([, v]) => v >= 10000)) {
      throw new DataError("market/platforms.json", `${p.id}.media`, "Datenträger ohne Mindestcharge nur bei rein digitalen Plattformen");
    }
    if (!isInt(p.performance) || (p.type !== "pc" && !p.performanceAnchors && p.performance <= 0)) throw new DataError("market/platforms.json", `${p.id}.performance`, "Leistungsbudget fehlt");
  }
  // MRK-R14: Hersteller führen nur Plattformen mit Zertifizierung, jede höchstens einmal.
  const seen = new Set<string>();
  for (const [maker, ids] of Object.entries(data.makers.makers)) {
    for (const id of ids) {
      const p = data.platforms.find((x) => x.id === id);
      if (!p || !p.certification || seen.has(id)) throw new DataError("market/makers.json", `makers.${maker}`, `Plattform ${id} unbekannt, ohne Zertifizierung oder doppelt`);
      seen.add(id);
    }
  }
  // KRN-R75, KRN-R76: KI-Daten.
  const ai = data.ai;
  for (const size of ["klein", "mittel", "gross"] as const) {
    if (!ai.sizeArchetypes[size]?.length || ai.sizeArchetypes[size].some((o) => !ai.archetypes[o.id])) throw new DataError("ai/studios.json", `sizeArchetypes.${size}`, "unbekannter Archetyp");
    if (!isInt(ai.teamsBySize[size]) || ai.teamsBySize[size] < 1) throw new DataError("ai/studios.json", `teamsBySize.${size}`, "mindestens 1");
  }
  for (const [id, a] of Object.entries(ai.archetypes)) {
    const b = a.budgetBp;
    if (b.projekte + b.engine + b.marketing + b.uebernahmen + b.ruecklage !== 10000) throw new DataError("ai/studios.json", `archetypes.${id}.budgetBp`, "Summe muss 10000 sein (KI-T10)");
    const traits = ai.traitsByArchetype[id as keyof typeof ai.traitsByArchetype];
    if (!traits || traits.length < 2 || traits.some((t) => !ai.traits[t])) throw new DataError("ai/traits.json", `byArchetype.${id}`, "mindestens zwei bekannte Charakterzüge");
  }
  for (const p of data.presets) if (!ai.difficulty[p.id]) throw new DataError("ai/difficulty.json", p.id, "Preset ohne KI-Schwierigkeit");
  if (ai.minStudios > ai.maxStudios || ai.minStudios < 1) throw new DataError("ai/studios.json", "minStudios", "zwischen 1 und maxStudios");
  if (ai.names.first.length === 0 || ai.names.second.length === 0 || ai.names.suffix.length === 0) throw new DataError("ai/names.json", "first/second/suffix", "leer");
  for (const e of data.catalog.events) {
    const err = conditionError(e.trigger);
    if (err) throw new DataError("events/katalog.json", `${e.id}.trigger`, err);
    if (e.class === "entscheidung" && (e.options.length === 0 || e.options.filter((o) => o.isDefault).length !== 1)) {
      throw new DataError("events/katalog.json", `${e.id}.options`, "Entscheidung braucht Optionen und genau eine Standardoption (KRN-R34)");
    }
    // MRK-R55: Folgestufen gibt es, sind als Stufe markiert und kommen nach 0 bis 12 Wochen.
    for (const next of [e.next, ...e.options.map((o) => o.next)].flat()) {
      if (!next) continue;
      const stage = data.catalog.events.find((d) => d.id === next.def);
      if (!stage?.stage) throw new DataError("events/katalog.json", `${e.id}.next`, `Folgestufe ${next.def} fehlt oder ist nicht als stage markiert`);
      if (next.delayWeeks[0] < 0 || next.delayWeeks[1] > 12 || next.delayWeeks[0] > next.delayWeeks[1]) {
        throw new DataError("events/katalog.json", `${e.id}.next.delayWeeks`, "0 bis 12 Wochen (MRK-R55)");
      }
    }
  }
  for (const [key, next] of Object.entries(data.opsEvents.chains)) {
    for (const n of [next].flat()) {
      if (!data.catalog.events.find((d) => d.id === n.def)?.stage) throw new DataError("ops/events.json", `chains.${key}`, `Folgestufe ${n.def} fehlt oder ist nicht als stage markiert`);
    }
  }
  // MRK-R57: Wendepunkte kennen ihre Plattformen und Ketten; genug Ketten- und andere Wendepunkte für jede Anzahl.
  {
    const f = data.future;
    for (const p of f.points) {
      for (const id of [...(p.platforms ?? []), ...Object.keys(p.hit ?? {}), ...Object.keys(p.miss ?? {})]) {
        if (!data.platforms.some((x) => x.id === id)) throw new DataError("market/future.json", `${p.id}.platforms`, `unbekannte Plattform ${id}`);
      }
      if (p.chain && !data.catalog.events.find((d) => d.id === p.chain)?.stage) throw new DataError("market/future.json", `${p.id}.chain`, `Stufe ${p.chain} fehlt`);
      if (p.years[0] > p.years[1] || p.years[0] < f.fromYear || p.years[0] > f.lastYear) throw new DataError("market/future.json", `${p.id}.years`, "Zeitraum ab fromYear");
    }
    const chains = f.points.filter((p) => p.chain).length;
    if (f.chainCount[1] > chains || f.count[1] - f.chainCount[0] > f.points.length - chains || f.count[0] < f.chainCount[1]) {
      throw new DataError("market/future.json", "count", "zu wenige Wendepunkte für count und chainCount");
    }
  }
  for (const u of data.unlocks.systems) {
    const err = conditionError(u.condition);
    if (err) throw new DataError("core/unlocks.json", `${u.id}.condition`, err);
  }
  if (!data.productTypes.some((p) => p.id === "standard")) throw new DataError("dev/producttypes.json", "standard", "Standardspiel fehlt");
  if (!data.presets.some((p) => p.id === "normal")) throw new DataError("core/presets.json", "normal", "Preset Normal fehlt");
  for (const a of [data.economy.salaryAnchorsCent, data.economy.rentPerPlaceAnchorsCent]) {
    for (let i = 1; i < a.length; i++) if (a[i]![0] <= a[i - 1]![0]) throw new DataError("core/economy.json", "Anker", "Jahre müssen steigen");
  }
  for (const k of data.contracts.kinds) {
    if (!AREAS.includes(k.area)) throw new DataError("dev/contracts.json", k.id, `unbekannter Bereich ${k.area}`);
  }
  if (data.applications.firstNames.length === 0) throw new DataError("dev/applications.json", "firstNames", "leer");
  for (const s of SCOPES) {
    const list = data.projects.phases[s];
    if (!list || list.length === 0 || list[list.length - 1]!.untilBp !== 10000) {
      throw new DataError("dev/phases.json", `phases.${s}`, "letzte Phase muss bei 10000 enden");
    }
  }
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object") {
    Object.values(o).forEach(deepFreeze);
    Object.freeze(o);
  }
  return o;
}

/** Dateien des Grundspiels nach Pfad (ZIE-R31: das Grundspiel ist die Mod „base“). */
export const BASE_FILES = {
  "dev/quality.json": quality,
  "dev/bugs.json": bugs,
  "dev/phases.json": phases,
  "dev/projects.json": projects,
  "dev/features.json": features,
  "dev/genres.json": genres,
  "dev/themes.json": themes,
  "dev/subgenres.json": subgenres,
  "dev/synergies.json": synergies,
  "dev/trends.json": trends,
  "dev/sales.json": sales,
  "dev/marketing.json": marketing,
  "dev/release.json": release,
  "dev/piracy.json": piracy,
  "dev/tradeshows.json": tradeShows,
  "dev/distribution.json": distribution,
  "dev/exploitation.json": exploitation,
  "ops/operations.json": operations,
  "ops/liveservice.json": liveService,
  "ops/events.json": opsEvents,
  "market/merch.json": merch,
  "core/goals.json": goals,
  "start/garage.json": start,
  "core/time.json": time,
  "core/presets.json": presets,
  "core/economy.json": economy,
  "market/phases.json": marketPhases,
  "market/publishers.json": publishers,
  "market/future.json": future,
  "core/acquisitions.json": acquisitions,
  "core/stock.json": stock,
  "core/regions.json": regions,
  "market/platforms.json": market,
  "market/makers.json": makers,
  "staff.json": staff,
  "delegation.json": delegation,
  "equipment.json": equipment,
  "core/offices.json": offices,
  "market/brandmarket.json": brandMarket,
  "stage/config.json": stage,
  "dev/producttypes.json": productTypes,
  "events/katalog.json": catalog,
  "events/chains.json": chains,
  "core/unlocks.json": unlocks,
  "dev/events.json": events,
  "dev/playtests.json": playtests,
  "dev/contracts.json": contracts,
  "dev/contractgames.json": contractGames,
  "dev/audiences.json": audiences,
  "dev/pillars.json": pillars,
  "dev/phasefocus.json": phaseFocus,
  "dev/polish.json": polish,
  "market/localization.json": localization,
  "dev/applications.json": applications,
  "engine/modules.json": engineModules,
  "engine/factor.json": engineFactor,
  "engine/debt.json": engineDebt,
  "engine/versions.json": engineVersions,
  "engine/middleware.json": middleware,
  "ai/studios.json": aiStudios,
  "ai/names.json": aiNames,
  "ai/difficulty.json": aiDifficulty,
  "ai/traits.json": aiTraits,
  "ai/considerations.json": aiConsiderations,
  "ai/rivals.json": aiRivals,
  "engine/binding.json": binding,
  "engine/requests.json": requests,
  "engine/licensing.json": licensing,
  "brands.json": brands,
  "events/techupdate.json": techUpdate,
};
export type DataFiles = typeof BASE_FILES;

/** Setzt die Dateien zu Spieldaten zusammen, prüft, friert ein und berechnet die Prüfsumme (TEC-R33, TEC-R34). */
export function buildData(F: DataFiles, mods: GameData["mods"] = []): GameData {
  const raw = {
    features: byId(structuredClone(F["dev/features.json"]) as FeatureDef[]),
    genres: byId(structuredClone(F["dev/genres.json"]) as GenreDef[]),
    subgenres: byId(structuredClone(F["dev/subgenres.json"]) as unknown as SubgenreDef[]),
    themes: byId(structuredClone(F["dev/themes.json"]) as ThemeDef[]),
    synergies: structuredClone(F["dev/synergies.json"]) as SynergyRule[],
    quality: structuredClone(F["dev/quality.json"]) as QualityParams,
    bugs: structuredClone(F["dev/bugs.json"]) as BugParams,
    projects: { ...structuredClone(F["dev/phases.json"]), ...structuredClone(F["dev/projects.json"]) } as ProjectParams,
    start: structuredClone(F["start/garage.json"]) as StartParams,
    trends: structuredClone(F["dev/trends.json"]) as TrendParams,
    sales: structuredClone(F["dev/sales.json"]) as SalesParams,
    marketing: structuredClone(F["dev/marketing.json"]) as unknown as MarketingParams,
    release: structuredClone(F["dev/release.json"]) as ReleaseParams,
    piracy: structuredClone(F["dev/piracy.json"]) as unknown as PiracyParams,
    tradeShows: structuredClone(F["dev/tradeshows.json"]),
    distribution: structuredClone(F["dev/distribution.json"]) as unknown as DistributionParams,
    exploitation: structuredClone(F["dev/exploitation.json"]) as unknown as ExploitationParams,
    operations: structuredClone(F["ops/operations.json"]) as unknown as OperationsParams,
    liveService: structuredClone(F["ops/liveservice.json"]) as unknown as LiveServiceParams,
    opsEvents: structuredClone(F["ops/events.json"]) as unknown as OpsEventParams,
    marketPhases: structuredClone(F["market/phases.json"]) as unknown as MarketPhaseParams,
    publishers: structuredClone(F["market/publishers.json"]) as unknown as PublisherParams,
    regions: structuredClone(F["core/regions.json"]) as unknown as RegionParams,
    future: structuredClone(F["market/future.json"]) as unknown as FutureParams,
    acquisitions: structuredClone(F["core/acquisitions.json"]) as unknown as AcquisitionParams,
    stock: structuredClone(F["core/stock.json"]) as unknown as StockParams,
    merch: structuredClone(F["market/merch.json"]) as MerchParams,
    goals: structuredClone(F["core/goals.json"]) as GoalParams,
    time: structuredClone(F["core/time.json"]) as TimeParams,
    presets: structuredClone(F["core/presets.json"]) as PresetDef[],
    economy: structuredClone(F["core/economy.json"]) as unknown as EconomyParams,
    platforms: byId(structuredClone(F["market/platforms.json"].platforms) as PlatformDef[]),
    makers: structuredClone(F["market/makers.json"]) as unknown as MakerParams,
    staff: structuredClone(F["staff.json"]) as unknown as StaffParams,
    delegation: structuredClone(F["delegation.json"]) as unknown as DelegationParams,
    equipment: structuredClone(F["equipment.json"]) as unknown as EquipmentParams,
    performance: structuredClone(F["market/platforms.json"].performance) as PerformanceParams,
    media: byId(structuredClone(F["market/platforms.json"].media) as MediumDef[]),
    offices: structuredClone(F["core/offices.json"]) as OfficeParams,
    brandMarket: structuredClone(F["market/brandmarket.json"]) as unknown as BrandMarketParams,
    stage: structuredClone(F["stage/config.json"]) as StageParams,
    productTypes: byId(structuredClone(F["dev/producttypes.json"]) as ProductTypeDef[]),
    catalog: { ...(structuredClone(F["events/katalog.json"]) as CatalogParams), events: byId(structuredClone([...catalog.events, ...chains.events]) as CatalogParams["events"]) },
    unlocks: structuredClone(F["core/unlocks.json"]) as UnlockParams,
    events: structuredClone(F["dev/events.json"]) as EventParams,
    playtests: structuredClone(F["dev/playtests.json"]) as PlaytestParams,
    contracts: structuredClone(F["dev/contracts.json"]) as unknown as ContractParams,
    contractGames: structuredClone(F["dev/contractgames.json"]) as unknown as ContractGameParams,
    audiences: structuredClone(F["dev/audiences.json"]) as unknown as AudienceParams,
    pillars: structuredClone(F["dev/pillars.json"]) as unknown as PillarParams,
    phaseFocus: structuredClone(F["dev/phasefocus.json"]) as unknown as PhaseFocusParams,
    polish: structuredClone(F["dev/polish.json"]) as PolishParams,
    localization: structuredClone(F["market/localization.json"]) as unknown as LocalizationParams,
    applications: structuredClone(F["dev/applications.json"]) as ApplicationParams,
    brands: structuredClone(F["brands.json"]) as BrandParams,
    techUpdate: structuredClone(F["events/techupdate.json"]),
    ai: {
      ...structuredClone(F["ai/studios.json"]), names: structuredClone(F["ai/names.json"]), difficulty: structuredClone(F["ai/difficulty.json"]), traits: structuredClone(F["ai/traits.json"].traits),
      traitsByArchetype: structuredClone(F["ai/traits.json"].byArchetype), considerations: structuredClone(F["ai/considerations.json"]), rivals: structuredClone(F["ai/rivals.json"]),
    } as unknown as AiParams,
    engine: { ...structuredClone(F["engine/modules.json"]), factor: structuredClone(F["engine/factor.json"]), debt: structuredClone(F["engine/debt.json"]), versions: structuredClone(F["engine/versions.json"]), middleware: { vendors: byId(structuredClone(F["engine/middleware.json"].vendors) as EngineParams["middleware"]["vendors"]), feeScopeBp: structuredClone(F["engine/middleware.json"].feeScopeBp), playerOffer: structuredClone((F["engine/middleware.json"] as { playerOffer?: unknown }).playerOffer) }, binding: structuredClone(F["engine/binding.json"]), requests: structuredClone(F["engine/requests.json"]), licensing: structuredClone(F["engine/licensing.json"]) } as unknown as EngineParams,
  };
  const checksum = hash32(JSON.stringify(raw)).toString(16).padStart(8, "0");
  const data: GameData = { modId: mod.id, modVersion: mod.version, mods, checksum, ...raw };
  validate(data);
  return deepFreeze(data);
}

/** Nur das Grundspiel (Tests, Werkzeuge). */
export function loadBaseData(): GameData {
  return buildData(BASE_FILES);
}

/**
 * ZIE-R31 bis ZIE-R36: Grundspiel plus Mods über dieselbe Pipeline. Fehlerhafte Mods werden gemeldet und abgeschaltet.
 * Die Prüfsumme der Daten ändert sich mit jeder Mod, die Daten ändert; Spielstände merken sich die Mods (TEC-R40).
 */
export function loadData(mods: readonly ModBundle[]): ModLoadResult<GameData> {
  const result = loadWithMods(BASE_FILES as unknown as Record<string, unknown>, mods, GAME_VERSION, (files) => buildData(files as unknown as DataFiles));
  if (result.active.length === 0) return result;
  const active = result.active.map((m) => ({ id: m.id, version: m.version, affectsBalance: m.affectsBalance }));
  return { ...result, data: buildData(result.files as unknown as DataFiles, active) };
}
