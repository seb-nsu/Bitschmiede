// Neues Spiel: Startprofil Garage 1980 (KRN-R70, Etappe 0 nur dieses Profil) und Welt aus dem Seed (A26, KRN-R81).
import { emptyContractGames } from "./systems/produkte/auftragsspiele";
import { initialMarket } from "./systems/marktphasen";
import { scaleToYear } from "./systems/finanzen";
import { marketQNorm } from "./systems/produkte/release";
import { BP_ONE, clamp, mulBp, mulDiv, TABLE_VERSION } from "./num";
import { newOperations } from "./systems/betrieb";
import { defaultPriceRule } from "./systems/preise";
import { initialGoal } from "./systems/ziele";
import { applyScenarioLive, applyScenarioStart, initialScenario, scenarioDef } from "./systems/szenarien";
import { isValidSeed, stream } from "./rng";
import { emptyStock } from "./systems/boerse";
import { emptyAcquisitions } from "./systems/uebernahmen";
import { AREAS, SCOPES, type AreaMap, type GameData, type GameState, type FutureState, type Settings } from "./model/types";
import { initTrends } from "./systems/markt";
import { createFounders } from "./systems/firma";
import { emptyAi, generateWorld } from "./systems/ki/studios";
import { emptyMakers } from "./systems/plattformen";
import { emptyStaff, promoteKey } from "./systems/personal";
import { emptyDelegation } from "./systems/delegation";
import { emptyBrandMarket } from "./systems/markenmarkt";
import { startOffice } from "./systems/buero";
import { emptyLicensing } from "./systems/lizenzen";
import { evaluate } from "./systems/katalog";
import { initialMotivation } from "./systems/motivation";
import { initialEndgame } from "./systems/endspiel";
import { initialPublishing } from "./systems/publishing";

export const SCHEMA_VERSION = 66;

/** Einstellungen beim Start; ohne Presse-Strenge gilt die des Presets (ZIE-R48). */
export type NewGameSettings = Omit<Settings, "pressStrictness" | "ironman"> & { pressStrictness?: number; ironman?: boolean };

export const DEFAULT_SETTINGS: NewGameSettings = { preset: "normal", pressRandom: "normal", decisionDensity: "normal", founderFocus: "gameplay" };

export function newGame(data: GameData, seed: string, settings: NewGameSettings = DEFAULT_SETTINGS): GameState {
  const presetDef = data.presets.find((p) => p.id === settings.preset);
  if (!presetDef) throw new Error(`Unbekanntes Preset ${settings.preset}`);
  if (!isValidSeed(seed)) throw new Error("Seed muss aus 16 Hex-Zeichen bestehen");
  const s = data.start;
  // ZIE-R14: Ein Szenario setzt Startjahr und Startzustand fest; der Spieler wählt nur das Preset.
  const scenario = scenarioDef(data, settings.scenario);
  if (scenario) settings = { ...settings, longTermGoal: null, endMode: "offen" };
  // Etappe 6c.10, KRN-R70: freies Startjahr im Profil Garage, begrenzt auf die Spanne der Daten.
  const startYear = scenario?.startYear ?? clamp(settings.startYear ?? s.startYear, s.startYearRange[0], s.startYearRange[1]);
  const state: GameState = {
    schemaVersion: SCHEMA_VERSION,
    tableVersion: TABLE_VERSION,
    dataChecksum: data.checksum,
    seed,
    settings: { ...settings, pressStrictness: settings.pressStrictness ?? presetDef.pressStrictness, ironman: settings.ironman ?? false },
    week: 0,
    startYear,
    displayUnit: "monat",
    rngStates: {},
    // KRN-R71: andere Stufen ändern nur das Startgeld (Faktor aus S10).
    // Etappe 6c.10: Startgeld aufs Lohnniveau des Startjahres (1980 unverändert).
    // S13 AUS-R43: Profil Publisher startet mit mehr Kapital.
    moneyCent: mulBp(scaleToYear(data, mulBp(s.startMoneyCent, presetDef.startMoneyFactorBp), startYear),
      settings.profile === "publisher" ? data.publishers.own.profile.startMoneyFactorBp : BP_ONE),
    people: [],
    nextPersonId: 1,
    contracts: [],
    nextContractId: 1,
    events: [],
    eventQueue: [],
    nextEventId: 1,
    counters: { applications: 0, contractOffers: 0 },
    log: [],
    finance: { loanCent: 0, creditNote: "C", loanRateBp: 0, cushionDebtCent: 0, cushionRepayCent: 0, insolvencyMonths: 0, ledger: [], lossCarry: [] },
    gameOver: null,
    office: startOffice(data, startYear),
    eventCooldowns: {},
    chains: [], market: initialMarket(data, startYear), publishers: [], publisherOffers: [], nextPublisherId: 1, locations: [], nextLocationId: 1,
    nextChainId: 1,
    chronicle: [],
    yearbooks: [],
    unlocks: {},
    unlockWaiting: {},
    guideSeen: { hidden: false, skipped: [], unlocks: [], firsts: [] },
    motivation: initialMotivation(),
    endgame: initialEndgame(),
    fairBooth: "mittel",
    publishing: initialPublishing(),
    moduleOffer: { active: false, customers: [] },
    world: { themeFit: {}, expectedProfile: {} },
    trends: { genre: {}, theme: {} },
    qNorm: { klein: 0, mittel: 0, gross: 0, aaa: 0 },
    releases: [],
    projects: [],
    nextProjectId: 1,
    knowledge: [],
    archive: [],
    engine: null,
    platformExperience: {},
    brands: [],
    nextBrandId: 1,
    techUndo: [],
    ai: emptyAi(),
    licensing: emptyLicensing(),
    makers: emptyMakers(),
    staff: emptyStaff(),
    delegation: emptyDelegation(),
    brandMarket: emptyBrandMarket(),
    studioReputationBp: data.marketing.studioReputationStartBp,
    priceRule: defaultPriceRule(data),
    operations: newOperations(data),
    future: emptyFuture(),
    stock: emptyStock(),
    acquisitions: emptyAcquisitions(),
    contractGames: emptyContractGames(),
    reissues: [],
    nextReissueId: 1,
    milestones: {},
    awards: [],
    ending: null,
    scenario: initialScenario(data, settings.scenario),
    goal: initialGoal(data, settings.longTermGoal),
  };
  // Etappe 6c.10: Erwartung der Presse zum Startjahr (Marktreferenz; 1980 = Startwert der Daten).
  for (const scope of SCOPES) state.qNorm[scope] = marketQNorm(data, state, scope, startYear);

  // A26: Der Seed verschiebt Passung und Erwartungen um bis zu ±20 %.
  const welt = stream(state, "welt");
  const v = data.quality.seedVariationBp;
  for (const g of data.genres) {
    const fit: Record<string, number> = {};
    for (const t of data.themes) {
      const f = BP_ONE + welt.range(-v, v);
      fit[t.id] = clamp(mulBp(g.themeFit[t.id]!, f), data.quality.themeFitMinBp, data.quality.themeFitMaxBp);
    }
    state.world.themeFit[g.id] = fit;
    const factors = {} as AreaMap;
    for (const a of AREAS) factors[a] = BP_ONE + welt.range(-v, v);
    state.world.expectedProfile[g.id] = normalizeProfile(g.expectedProfile, factors);
  }
  initTrends(state, data, stream(state, "markt"));
  createFounders(state, data, stream(state, "personal"));
  // FRM-R09: Gründer sind von Beginn an Schlüsselpersonen.
  for (const p of state.people) promoteKey(state, data, p, stream(state, "personal"));
  if (scenario) applyScenarioStart(state, data, scenario);
  // KRN-R75: KI-Studios nach Startjahr.
  generateWorld(state, data);
  if (scenario) applyScenarioLive(state, data, scenario);
  // ZIE-R14, Abschluss 1.0: Ein Szenario startet mit einem fertigen Studio; Systeme, deren Bedingung zum Start schon
  // erfüllt ist, sind sofort offen (ANNAHME, sonst hielte die Freischalt-Taktung einen Konzern monatelang klein).
  if (scenario) {
    for (const sys of data.unlocks.systems) if (!sys.ownEvent && evaluate(sys.condition, { state, data })) state.unlocks[sys.id] ??= state.week;
  }
  // KRN-R43, Etappe 6c.11: Im freien Start sind alle Systeme sofort offen; eigene Auslöser (Lizenzmarkt) bleiben Ereignisse.
  if (settings.guide === "frei") {
    for (const sys of data.unlocks.systems) state.unlocks[sys.id] ??= state.week;
    state.unlocks["delegation"] ??= state.week;
  }
  // Was beim Start schon offen ist, braucht keine Freischalt-Karte.
  state.guideSeen.unlocks = Object.keys(state.unlocks).sort();
  return state;
}

/** S08 MRK-R57: Zukunftsepoche ohne Wendepunkte; sie entstehen drei Jahre vor fromYear (Gerüchte-Vorlauf). */
export function emptyFuture(): FutureState {
  return { generated: false, points: [], bets: [], nextPointId: 1, toolSpeedBp: 0, platformBp: {} };
}

/** Profil · Faktoren, normiert auf Summe 10.000; der Rundungsrest geht an den Bereich mit dem größten Anteil. */
/**
 * Spielstände aus der Zeit vor neuen Genres oder Themen in den Daten (Inhaltsausbau, Migration 23 → 24): fehlende
 * Passungen, Erwartungsprofile und Trends bekommen die Datenwerte ohne Seed-Verschiebung und einen neutralen Trend.
 */
export function fillWorldTables(state: GameState, data: GameData): void {
  const neutral = {} as AreaMap;
  for (const a of AREAS) neutral[a] = BP_ONE;
  for (const g of data.genres) {
    const fit = (state.world.themeFit[g.id] ??= {});
    for (const t of data.themes) fit[t.id] ??= clamp(g.themeFit[t.id]!, data.quality.themeFitMinBp, data.quality.themeFitMaxBp);
    state.world.expectedProfile[g.id] ??= normalizeProfile(g.expectedProfile, neutral);
    state.trends.genre[g.id] ??= BP_ONE;
  }
  for (const t of data.themes) state.trends.theme[t.id] ??= BP_ONE;
}

export function normalizeProfile(profile: AreaMap, factors: AreaMap): AreaMap {
  const raw = {} as AreaMap;
  for (const a of AREAS) raw[a] = mulBp(profile[a], factors[a]);
  const total = AREAS.reduce((sum, a) => sum + raw[a], 0);
  const out = {} as AreaMap;
  for (const a of AREAS) out[a] = mulDiv(raw[a], BP_ONE, total, 1);
  const rest = BP_ONE - AREAS.reduce((sum, a) => sum + out[a], 0);
  let largest: (typeof AREAS)[number] = AREAS[0];
  for (const a of AREAS) if (out[a] > out[largest]) largest = a;
  out[largest] += rest;
  return out;
}
