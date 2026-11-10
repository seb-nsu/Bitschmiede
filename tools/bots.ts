// Bot-Strategien für Balancing-Läufe und Golden-Runs (S12 5.7, TEC-R60, TEC-T05).
// Ein Bot spielt wie ein Mensch nur über Eingaben (TEC-R20) und sieht, was die Oberfläche zeigt; Zufall nur aus einem
// eigenen Strom mit Seed, damit Läufe bitgleich wiederholbar sind. Etappe 1 kennt weder Engines noch Marken noch MMOs;
// die Strategien „nur Sequels“, „nur Lizenzen“, „eigene Engine“ und „MMO“ aus S12 folgen mit ihren Systemen.
import { stream, type Rng, type RngHolder } from "../src/sim/rng";
import { dateOf } from "../src/sim/calendar";
import { areaProfile, agedValue, profileFactor } from "../src/sim/systems/produkte/quality";
import { activeProjects, allowedOwnProjects, pausedProjects } from "../src/sim/systems/produkte/projects";
import { contractLevels } from "../src/sim/systems/produkte/auftragsspiele";
import { activePlatforms, platformBase, productionCost } from "../src/sim/systems/markt";
import { creditLimit, monthlyRent, weeklyRent, weeklyWages } from "../src/sim/systems/finanzen";
import { contractQuality, contractTeam, maxPersonsNow, teamContractQuality } from "../src/sim/systems/firma";
import { hardwareFactor, levelPrice } from "../src/sim/systems/buero";
import { validateInput } from "../src/sim/tick";
import { defaultEngineId, engineLevels, missingModule, plannedLevel, projectEngineFactor, stateOfArtMap, validateMiddleware, validatePlanResearch } from "../src/sim/systems/engine";
import { MODULES } from "../src/sim/model/types";
import { leadBlocker, platformAllows } from "../src/sim/systems/leistung";
import { brandStrength, fatigueAfterTitle } from "../src/sim/systems/marken";
import { konzernView } from "../src/sim/view/konzernView";
import type { ContractGameOffer, CreateProjectInput, GameData, GameEvent, GameState, Input, Project, Scope } from "../src/sim/model/types";
import { cardMatches } from "../src/sim/systems/produkte/saeulen";
import { availableLanguages, localizationFactor } from "../src/sim/systems/produkte/lokalisierung";
import { groupsOf } from "../src/sim/systems/produkte/phasenfokus";

export const STRATEGIES = ["vernuenftig", "wachstum", "gierig", "auftraege", "durchschnitt", "zufall", "mmo", "konzern"] as const;
export type StrategyId = (typeof STRATEGIES)[number];

/** Stellgrößen je Strategie; alles Übrige ist gemeinsames Verhalten. */
interface Profile {
  /** Wochen Test nach Produktionsende bis zum Release. */
  polish: [number, number];
  /** Zielgröße des Teams (Einstellungen bis dahin, soweit das Büro reicht). */
  team: number;
  /** Mindestreserve in Wochen Fixkosten, die nach einer Einstellung bleiben muss. */
  hireReserveWeeks: number;
  /** Anteil mittlerer Projekte, sobald das Team und die Kasse es tragen (bp). */
  mediumBp: number;
  /** Umzug in die Etage, sobald möglich und bezahlbar. */
  move: boolean;
  /** Aufträge: „nie“, „frei“ (nur freie Personen), „immer“. */
  contracts: "nie" | "frei" | "immer";
  /** Ports und Addons nach guten Spielen. */
  sequelTypes: boolean;
  /** Playtest in der Produktion (genauere Auflage). */
  playtest: boolean;
  /** Ereignis-Optionen, die Geld kosten, nur über dieser Reserve in Wochen Fixkosten. */
  spendReserveWeeks: number;
  /** Zwei Projekte gleichzeitig, wenn erlaubt. */
  parallel: boolean;
  /** S03: Personen im Engine-Team ab dieser Teamgröße (je Schwelle eine Person); leer = keine eigene Engine. */
  engineFrom: number[];
  /**
   * S12 5.7 „nur Lizenzen“: eigene Engine nur als Hülle, Module vom Middleware-Anbieter, sobald er besser ist.
   * „ergaenzend“: eigenes Engine-Team, aber Module, an denen es gerade nicht forscht, kommen vom Anbieter.
   */
  licenses?: "nur" | "ergaenzend";
  /** FRM-R29: Hardware erneuern unter diesem Faktor (bp). */
  hardwareBelowBp: number;
  /** 5.16 Geld-Balancing: Zielgröße des Teams nach Jahr (wachsende Studios wie im Design: 1990er 15–60 Personen). */
  growth?: [number, number][];
  /** S12 5.7 „MMO“ (Etappe 5.16): mittlere Projekte als Live-Produkt, sobald Typ und Engine es erlauben (eins zur Zeit). */
  live?: boolean;
  /** FRM-R42 bis FRM-R44 (Etappe 6a.9): mittlere und größere Projekte einem Publisher anbieten, das Angebot mit dem höchsten Vorschuss annehmen. */
  publisher?: boolean;
  /** S09, FRM-R51 (Etappe 6b.6): Börsengang, sobald möglich, und Übernahmen kleiner Studios ab der Freischaltung. */
  konzern?: boolean;
}

const PROFILES: Record<Exclude<StrategyId, "zufall">, Profile> = {
  vernuenftig: { hardwareBelowBp: 8800, polish: [2, 4], team: 7, hireReserveWeeks: 30, mediumBp: 4000, move: true, contracts: "frei", sequelTypes: true, playtest: true, spendReserveWeeks: 26, parallel: true, engineFrom: [3, 6], growth: [[1985, 7], [1990, 15], [2000, 30], [2010, 45]], publisher: true },
  wachstum: { hardwareBelowBp: 8800, polish: [1, 3], team: 7, hireReserveWeeks: 10, mediumBp: 8000, move: true, contracts: "nie", sequelTypes: true, playtest: true, spendReserveWeeks: 12, parallel: true, engineFrom: [3, 5], growth: [[1985, 10], [1990, 20], [2000, 40], [2010, 60]] },
  gierig: { hardwareBelowBp: 8000, polish: [0, 0], team: 3, hireReserveWeeks: 40, mediumBp: 0, move: false, contracts: "immer", sequelTypes: true, playtest: false, spendReserveWeeks: 999, parallel: true, engineFrom: [], licenses: "nur" },
  auftraege: { hardwareBelowBp: 8000, polish: [2, 3], team: 4, hireReserveWeeks: 20, mediumBp: 0, move: true, contracts: "immer", sequelTypes: false, playtest: false, spendReserveWeeks: 40, parallel: false, engineFrom: [], growth: [[1990, 6], [2000, 8], [2010, 10]] },
  // S12 5.7 „MMO“: wie „wachstum“, aber mit Live-Produkten und ihrem Betrieb.
  konzern: { hardwareBelowBp: 8800, polish: [1, 3], team: 7, hireReserveWeeks: 8, mediumBp: 8000, move: true, contracts: "nie", sequelTypes: true, playtest: true, spendReserveWeeks: 12, parallel: true, engineFrom: [3, 5], growth: [[1985, 10], [1990, 20], [2000, 45], [2005, 70], [2015, 90]], konzern: true },
  mmo: { hardwareBelowBp: 8800, polish: [2, 4], team: 8, hireReserveWeeks: 20, mediumBp: 7000, move: true, contracts: "frei", sequelTypes: false, playtest: true, spendReserveWeeks: 20, parallel: true, engineFrom: [3, 5], live: true, growth: [[1985, 8], [1990, 15], [2000, 30], [2010, 45]] },
  // Durchschnittlicher Spieler: verhält sich wie „vernünftig“, wählt Karten aber nur nach Gefühl (für ZIE-R20).
  durchschnitt: { hardwareBelowBp: 8400, polish: [0, 3], team: 5, hireReserveWeeks: 20, mediumBp: 3000, move: true, contracts: "frei", sequelTypes: false, playtest: false, spendReserveWeeks: 20, parallel: true, engineFrom: [5], licenses: "ergaenzend", publisher: true },
};

export interface Bot {
  strategy: StrategyId;
  holder: RngHolder;
  /** Testwochen je Projekt, beim Anlegen gezogen. */
  polish: Record<number, number>;
  /** Projekte, die schon portiert oder erweitert wurden. */
  derived: number[];
  started: number;
}

export function createBot(strategy: StrategyId, seed: string): Bot {
  return { strategy, holder: { seed, rngStates: {} }, polish: {}, derived: [], started: 0 };
}

/** Zielgröße des Teams im laufenden Jahr (Stufen nach growth, sonst team). */
function teamTarget(p: Profile, state: GameState): number {
  const y = year(state);
  let n = p.team;
  for (const [from, size] of p.growth ?? []) if (y >= from) n = Math.max(n, size);
  return n;
}

function rngOf(bot: Bot): Rng {
  return stream(bot.holder, "ki");
}

function year(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

function weeklyCost(state: GameState, data: GameData): number {
  return weeklyWages(state, data) + weeklyRent(state, data);
}

function freeCredit(state: GameState, data: GameData): number {
  return Math.max(0, creditLimit(state, data).limitCent - state.finance.loanCent);
}

function pickDistinct(rng: Rng, ids: readonly string[], n: number): string[] {
  const pool = [...ids];
  const out: string[] = [];
  while (out.length < n && pool.length > 0) out.push(pool.splice(rng.int(pool.length), 1)[0]!);
  return out;
}

/** Plattform mit der größten Basis, deren Mindest-Erstauflage die Kasse deckt. */
function bestPlatforms(data: GameData, state: GameState, count: number): string[] {
  const y = year(state);
  const list = activePlatforms(data, y).sort((a, b) => platformBase(b, y) - platformBase(a, y) || (a.id < b.id ? -1 : 1));
  const affordable = list.filter((pf) => {
    const c = productionCost(state, data, { platforms: [pf.id] }, 1);
    return c.minBatch * c.costCent <= Math.max(0, state.moneyCent);
  });
  const pool = affordable.length > 0 ? affordable : list.slice(-1);
  // Weitere Plattformen nur vom selben Typ wie die Lead-Plattform: ein anderer Typ kostet 50 % statt 15 % Aufwand.
  const chosen = [pool[0]!, ...pool.slice(1).filter((p) => p.type === pool[0]!.type)].slice(0, count);
  return chosen.map((p) => p.id);
}

/** PRD-R11: Karten, die es gibt, die die Engine neuer Projekte beherrscht und die die Lead-Plattform erlaubt. */
function usableFeatures(data: GameData, state: GameState, lead?: string): string[] {
  const y = year(state);
  const levels = engineLevels(state, data, defaultEngineId(state));
  const p = lead ? data.platforms.find((x) => x.id === lead) : undefined;
  return data.features
    .filter((f) => f.availableFrom <= y && missingModule(data, levels, f.id) === null && (!p || platformAllows(data, p, f.id, y)))
    .map((f) => f.id);
}

/** Freie Personen: weder an einem Projekt noch an einem Auftrag. */
function idle(state: GameState): number[] {
  return state.people.filter((p) => p.assignment === null).map((p) => p.id);
}

/**
 * Konzept, wie es das Brett zeigt: Genre zufällig, Thema aus den drei besten Passungen der Grunddaten (das Wissen,
 * das ein Spieler nach einigen Releases hat), Karten nach Grundwert (gealtert) mal Profil-Passung.
 */
function designProject(bot: Bot, data: GameData, state: GameState, scope: Scope, people: number[], platforms: string[], offer?: ContractGameOffer): CreateProjectInput {
  const rng = rngOf(bot);
  const y = year(state);
  if (offer) return contractDesign(bot, data, state, offer, people);
  // S02 Marken: Wer eine Marke mit Fans und wenig Müdigkeit hat, setzt sie im Genre ihrer meisten Fans fort.
  const brand = bot.strategy === "durchschnitt" ? undefined : state.brands
    .filter((b) => b.titles.length > 0 && fatigueAfterTitle(data, state, b) <= data.brands.pauseFatigueBp && Object.keys(b.fans).length > 0)
    .sort((a, b) => brandStrength(data, b) - brandStrength(data, a) || a.id - b.id)[0];
  const useBrand = brand !== undefined && rng.int(2) === 0;
  const fanGenre = brand ? Object.keys(brand.fans).sort((a, b) => brand.fans[b]! - brand.fans[a]! || (a < b ? -1 : 1))[0] : undefined;
  const genre = useBrand && fanGenre ? data.genres.find((g) => g.id === fanGenre)! : data.genres[rng.int(data.genres.length)]!;
  const themes = [...data.themes].sort((a, b) => genre.themeFit[b.id]! - genre.themeFit[a.id]! || (a.id < b.id ? -1 : 1)).slice(0, bot.strategy === "durchschnitt" ? 5 : 3);
  const theme = themes[rng.int(themes.length)]!.id;
  const ids = usableFeatures(data, state, platforms[0]);
  const levels = engineLevels(state, data, defaultEngineId(state));
  const fits = (cand: string[]) => leadBlocker(data, state, cand, platforms[0]!) === null;
  const slots = data.projects.featureSlots[scope];
  let best: string[] = pickDistinct(rng, ids, slots);
  let bestQ = -1;
  // Der durchschnittliche Spieler vergleicht nur wenige Zusammenstellungen.
  const tries = bot.strategy === "durchschnitt" ? 3 : 300;
  for (let i = 0; i < tries; i++) {
    const cand = pickDistinct(rng, ids, slots);
    if (!fits(cand)) continue;
    const value = cand.reduce((sum, id) => sum + agedValue(data, data.features.find((f) => f.id === id)!, y), 0);
    const e = bot.strategy === "durchschnitt" ? 10000 : projectEngineFactor(data, levels, cand, y).factorBp;
    const q = profileFactor(data, areaProfile(data, cand, scope), state.world.expectedProfile[genre.id]!).factor * value * e;
    if (q > bestQ) {
      bestQ = q;
      best = cand;
    }
  }
  bot.started += 1;
  // Etappe 6c.9: Bots außer dem durchschnittlichen Spieler wählen Design-Säulen, die ihre Karten tragen und die Presse
  // im Genre schätzt (höchstens zwei).
  const pillars = bot.strategy === "durchschnitt" ? [] : pickPillars(data, genre.id, best, y);
  return {
    type: "createProject", title: `Projekt ${bot.started}`, genre: genre.id, theme, scope, features: best, people, platforms, brandId: useBrand ? brand!.id : null,
    ...(pillars.length > 0 ? { pillars } : {}),
  };
}

/** Mittlere Wertung der letzten drei Releases (0 ohne Release): Maßstab, ob eine Mindestwertung erreichbar ist. */
function recentScore(state: GameState): number {
  const r = state.projects.filter((p) => p.result).slice(-3).map((p) => p.result!.scoreBp);
  return r.length === 0 ? 0 : Math.trunc(r.reduce((a, b) => a + b, 0) / r.length);
}

/** Etappe 6c.3: Auftragsspiel nach den Vorgaben des Angebots, Karten wie beim eigenen Konzept. */
function contractDesign(bot: Bot, data: GameData, state: GameState, o: ContractGameOffer, people: number[]): CreateProjectInput {
  const rng = rngOf(bot);
  const y = year(state);
  const genre = data.genres.find((g) => g.id === o.genre)!;
  const theme = o.theme ?? [...data.themes].sort((a, b) => genre.themeFit[b.id]! - genre.themeFit[a.id]! || (a.id < b.id ? -1 : 1))[0]!.id;
  // Der Auftraggeber stellt Technik (contractLevels): Karten nach den besseren Stufen.
  const levels = contractLevels(state, data, engineLevels(state, data, defaultEngineId(state)), o.id);
  const plat = data.platforms.find((x) => x.id === o.platform);
  const ids = data.features
    .filter((f) => f.availableFrom <= y && missingModule(data, levels, f.id) === null && (!plat || platformAllows(data, plat, f.id, y)))
    .map((f) => f.id);
  const slots = data.projects.featureSlots[o.scope];
  let best: string[] = pickDistinct(rng, ids, slots);
  let bestQ = -1;
  for (let i = 0; i < 300; i++) {
    const cand = pickDistinct(rng, ids, slots);
    if (leadBlocker(data, state, cand, o.platform) !== null) continue;
    const value = cand.reduce((sum, id) => sum + agedValue(data, data.features.find((f) => f.id === id)!, y), 0);
    const q = profileFactor(data, areaProfile(data, cand, o.scope), state.world.expectedProfile[genre.id]!).factor * value * projectEngineFactor(data, levels, cand, y).factorBp;
    if (q > bestQ) {
      bestQ = q;
      best = cand;
    }
  }
  bot.started += 1;
  return {
    type: "createProject", title: `Auftrag ${bot.started}`, genre: o.genre, theme, scope: o.scope, features: best, people,
    platforms: [o.platform], brandId: null, contractOfferId: o.id, ...(o.audience ? { audience: o.audience } : {}),
  };
}

function pickPillars(data: GameData, genre: string, features: readonly string[], y: number): string[] {
  const value = (id: string) => agedValue(data, data.features.find((f) => f.id === id)!, y);
  const total = features.reduce((sum, id) => sum + value(id), 0);
  return data.pillars.list
    .map((pl) => ({
      id: pl.id,
      weight: pl.genreWeightBp[genre] ?? 10000,
      share: total === 0 ? 0 : features.filter((id) => cardMatches(pl, data.features.find((f) => f.id === id)!)).reduce((sum, id) => sum + value(id), 0) * 10000 / total,
    }))
    .filter((x) => x.share >= data.pillars.targetShareBp && x.weight >= 10000)
    .sort((a, b) => b.weight - a.weight || (a.id < b.id ? -1 : 1))
    .slice(0, data.pillars.maxPillars)
    .map((x) => x.id);
}

function randomProject(bot: Bot, data: GameData, state: GameState, people: number[]): CreateProjectInput {
  const rng = rngOf(bot);
  const y = year(state);
  const scope: Scope = rng.int(2) === 0 ? "klein" : "mittel";
  const platforms = activePlatforms(data, y);
  bot.started += 1;
  return {
    type: "createProject", title: `Projekt ${bot.started}`,
    genre: data.genres[rng.int(data.genres.length)]!.id,
    theme: data.themes[rng.int(data.themes.length)]!.id,
    scope, features: pickDistinct(rng, usableFeatures(data, state), data.projects.featureSlots[scope]),
    people, platforms: [platforms[rng.int(platforms.length)]!.id],
  };
}

/** Port oder Addon eines guten Spiels, wenn freigeschaltet und noch nicht geschehen. */
function derivedProject(bot: Bot, data: GameData, state: GameState, people: number[]): CreateProjectInput | null {
  if (state.unlocks["produkttypen"] === undefined) return null;
  const y = year(state);
  const hits = state.projects
    .filter((p) => p.result && p.type === "standard" && p.result.scoreBp >= 70000 && !bot.derived.includes(p.id) && state.week - p.result.week < 52)
    .sort((a, b) => b.result!.scoreBp - a.result!.scoreBp || a.id - b.id);
  const hit = hits[0];
  if (!hit) return null;
  bot.derived.push(hit.id);
  const others = activePlatforms(data, y).filter((pf) => !hit.platforms.includes(pf.id)).sort((a, b) => platformBase(b, y) - platformBase(a, y));
  bot.started += 1;
  // Ein Port lohnt nur auf eine Plattform mit mindestens halb so großer Basis wie die Vorlage.
  const leadBase = platformBase(data.platforms.find((p) => p.id === hit.platforms[0])!, y);
  if (others[0] && platformBase(others[0], y) * 2 >= leadBase) {
    return { type: "createProject", title: `Projekt ${bot.started}`, genre: hit.genre, theme: hit.theme, scope: hit.scope, features: [...hit.features], people, platforms: [others[0].id], productType: "port", sourceId: hit.id };
  }
  const features = hit.features.slice(0, data.projects.featureSlots.klein);
  const platforms = hit.platforms.filter((id) => activePlatforms(data, y).some((p) => p.id === id));
  if (platforms.length === 0) return null;
  return { type: "createProject", title: `Projekt ${bot.started}`, genre: hit.genre, theme: hit.theme, scope: "klein", features, people, platforms, productType: "addon", sourceId: hit.id };
}

/** Kosten bis zum Release grob: Löhne der Personen über die Dauer plus Erstauflage. */
function canAfford(state: GameState, data: GameData, people: number, weeks: number): boolean {
  const wage = state.people.length > 0 ? Math.trunc(weeklyWages(state, data) / state.people.length) : 0;
  return wage * people * weeks + weeklyRent(state, data) * weeks <= state.moneyCent + freeCredit(state, data);
}

function newProjects(bot: Bot, data: GameData, state: GameState, p: Profile | null): Input[] {
  const out: Input[] = [];
  const free = idle(state);
  if (free.length === 0) return out;
  const running = activeProjects(state).length;
  const allowed = allowedOwnProjects(state, data);
  if (running >= allowed) {
    // Freie Personen helfen zuerst einem Projekt ohne Personen, sonst dem mit dem größten Restaufwand.
    const staffed = (x: Project) => state.people.some((o) => o.assignment?.kind === "project" && o.assignment.id === x.id);
    const target = activeProjects(state).sort((a, b) => Number(staffed(a)) - Number(staffed(b))
      || (b.effortTotalBp - b.effortDoneBp) - (a.effortTotalBp - a.effortDoneBp) || a.id - b.id)[0];
    if (target) for (const id of free) out.push({ type: "assign", personId: id, projectId: target.id });
    return out;
  }
  // Pausierte Projekte zuerst fortsetzen.
  const paused = pausedProjects(state)[0];
  if (paused) return [{ type: "resumeProject", projectId: paused.id, people: free }];
  // Ohne Parallelbetrieb kommen freie Personen ins laufende Projekt.
  if (running > 0 && p && !p.parallel) {
    const target = activeProjects(state).find((x) => x.status === "laeuft");
    if (target) for (const id of free) out.push({ type: "assign", personId: id, projectId: target.id });
    return out;
  }
  // Ein zweites Projekt erst ab zwei freien Personen.
  if (running > 0 && free.length < 2) {
    const target = activeProjects(state).find((x) => x.status === "laeuft");
    if (target) for (const id of free) out.push({ type: "assign", personId: id, projectId: target.id });
    return out;
  }
  if (!p) return [randomProject(bot, data, state, free)];
  const rng = rngOf(bot);
  if (p.sequelTypes && rng.int(3) === 0) {
    const d = derivedProject(bot, data, state, free);
    if (d && validateInput(state, data, d) === null) return [d];
  }
  // Etappe 6c.3: Das Auftragsstudio nimmt Auftragsspiele, für die das freie Team mindestens so groß ist wie das Bezugsteam der Frist
  // (sonst ist die Frist nicht zu halten), das mit der niedrigsten Mindestwertung.
  if (p.contracts === "immer") {
    const offer = state.contractGames.offers
      .filter((o) => o.expiresWeek > state.week && free.length >= (data.contractGames.teamRef[o.scope] ?? 99) && o.minScoreBp <= recentScore(state))
      .sort((a, b) => a.minScoreBp - b.minScoreBp || a.id - b.id)[0];
    if (offer) {
      const d = designProject(bot, data, state, offer.scope, free, [offer.platform], offer);
      if (validateInput(state, data, d) === null) return [d];
    }
  }
  const medium = free.length >= 3 && rng.uniformBp() < p.mediumBp && canAfford(state, data, free.length, 40);
  const multi = p === PROFILES.wachstum && free.length >= 4 ? 2 : 1;
  // Balancing Spätspiel (04.11.2026): Wer Leute und Geld hat, macht ab den 1990ern große und ab 2000 AAA-Spiele, weil kleine
  // und mittlere Spiele dann weniger Käufer erreichen (sales.json scopeEraAnchors). Der Durchschnittsspieler bleibt klein.
  const big = medium && p !== PROFILES.durchschnitt && year(state) >= data.projects.scopeFromYear.gross && free.length >= 10 && canAfford(state, data, free.length, 120);
  const aaa = big && year(state) >= 2000 && free.length >= 25 && canAfford(state, data, free.length, 200);
  const scope: Scope = aaa ? "aaa" : big ? "gross" : medium ? "mittel" : "klein";
  const d = designProject(bot, data, state, scope, free, bestPlatforms(data, state, multi));
  // BTR-R15: Die MMO-Strategie macht aus einem mittleren Projekt ein Live-Produkt, wenn keins läuft.
  if (p.live && medium && !state.projects.some((x) => x.ops?.live && x.ops.live.shutdownWeek === null)
    && !activeProjects(state).some((x) => data.productTypes.find((t) => t.id === x.type)?.live)) {
    for (const type of ["liveService", "mmo", "f2p"]) {
      const live = { ...d, productType: type };
      if (validateInput(state, data, live) === null) return [live];
    }
  }
  return validateInput(state, data, d) === null ? [d] : [];
}

/** Antwort auf ein Katalog-Ereignis: Geld ausgeben nur mit Reserve, sonst Standard. */
function catalogAnswer(e: GameEvent, state: GameState, data: GameData, p: Profile, strategy: StrategyId): string {
  const rich = state.moneyCent > weeklyCost(state, data) * p.spendReserveWeeks;
  const pick = (opt: string) => (e.options.includes(opt) ? opt : e.defaultOption);
  switch (e.defId) {
    case "insolvenzwarnung": return pick(strategy === "gierig" ? "gehaltsverzicht" : "privateinlage");
    case "abwerbung": return pick(strategy === "gierig" ? "gehenLassen" : "halten");
    case "endspurt": return pick(strategy === "gierig" ? "crunch" : "normal");
    case "betatest": return pick("annehmen");
    case "interview": return pick("zusagen");
    default: {
      if (!rich) return e.defaultOption;
      // Mit Reserve: die erste Option, die nicht der Standard ist (meist die aktive, kostenpflichtige).
      return e.options.find((o) => o !== e.defaultOption) ?? e.defaultOption;
    }
  }
}

function answers(bot: Bot, data: GameData, state: GameState, p: Profile | null): Input[] {
  const out: Input[] = [];
  const rng = rngOf(bot);
  const reserve = weeklyCost(state, data);
  let people = state.people.length;
  for (const e of [...state.events].sort((a, b) => a.id - b.id)) {
    let option: string | null = null;
    if (!p) {
      if (e.kind === "goldReview") continue;
      option = e.options[rng.int(e.options.length)]!;
    } else {
      switch (e.kind) {
        case "goldReview":
          continue;
        // S06 Abschnitt 6: Einstellen-Vorschlag der Produzenten nehmen Bots an (Verlust bei kleiner Basis).
        case "einstellenVorschlag":
          option = "einstellen";
          break;
        case "prototypReview":
          option = !e.review ? "ok" : e.review.forecastAfter > e.review.forecastBefore ? "annehmen" : "ablehnen";
          break;
        case "kritischerBug":
          option = bot.strategy === "gierig" ? "soVeroeffentlichen" : "verschieben";
          break;
        case "gate":
          option = "fortsetzen";
          break;
        // S09 UEB-R08: Gegenangebote beantwortet der Konzern-Bot über seine Übernahme-Eingaben.
        case "gegenangebot":
          continue;
        case "nachproduktion":
          option = e.reorder && e.reorder.expectedRevenueCent > e.reorder.costCent ? "nachproduzieren" : "nein";
          break;
        case "bewerbung": {
          const salary = e.applicant ? Math.trunc((e.applicant.salaryCent * 12) / 52) : 0;
          const ok = people < Math.min(teamTarget(p, state), maxPersonsNow(state, data))
            && state.moneyCent + freeCredit(state, data) > (reserve + salary) * p.hireReserveWeeks;
          option = ok ? "einstellen" : "ablehnen";
          if (ok) people += 1;
          break;
        }
        case "auftrag": {
          option = "ablehnen";
          if (p.contracts === "nie" || !e.offer) break;
          // Team-Auftrag: annehmen, wenn das vorgeschlagene Team die Anforderung schafft und (außer bei „immer“) frei ist.
          if ((e.offer.team ?? 1) > 1) {
            const team = contractTeam(state, data, e.offer);
            // Nie die letzte Person eines Projekts (wie bei Einzelaufträgen); außer bei „immer“ nur freie Leute.
            const lastOfProject = team.some((x) => x.assignment?.kind === "project"
              && state.people.filter((o) => o.assignment?.kind === "project" && o.assignment.id === x.assignment!.id && !team.includes(o)).length === 0);
            const free = !lastOfProject && (team.every((x) => x.assignment === null) || p.contracts === "immer");
            if (e.options.includes("annehmenTeam") && team.length > 0 && free && teamContractQuality(data, team, e.offer.area) >= e.offer.requirement) option = "annehmenTeam";
            break;
          }
          const candidates = state.people
            .filter((x) => x.assignment?.kind !== "contract" && (p.contracts === "immer" || x.assignment === null))
            .filter((x) => contractQuality(data, x, e.offer!.area) >= e.offer!.requirement)
            .sort((a, b) => contractQuality(data, b, e.offer!.area) - contractQuality(data, a, e.offer!.area) || a.id - b.id);
          // Nie die letzte Person eines Projekts: sonst testet niemand, und die Zertifizierung scheitert immer wieder.
          const pick = candidates.find((x) => x.assignment === null
            || (x.assignment.kind === "project" && state.people.filter((o) => o.assignment?.kind === "project" && o.assignment.id === x.assignment!.id).length > 1));
          if (pick) option = `annehmen:${pick.id}`;
          break;
        }
        case "katalog":
          option = catalogAnswer(e, state, data, p, bot.strategy);
          break;
        case "neubau":
          option = state.moneyCent > reserve * p.spendReserveWeeks ? "jetzt" : "spaeter";
          break;
      }
    }
    if (option && e.options.includes(option)) out.push({ type: "decide", eventId: e.id, option });
  }
  return out;
}

function finance(data: GameData, state: GameState, p: Profile | null): Input[] {
  if (!p) return [];
  const weekly = weeklyCost(state, data);
  const room = freeCredit(state, data);
  if (state.moneyCent < weekly * 4 && room > 0) return [{ type: "takeLoan", amountCent: Math.min(room, weekly * 12) }];
  // Tilgen, wenn die Kasse ein halbes Jahr Kosten übersteigt.
  const spare = state.moneyCent - weekly * 26;
  if (state.finance.loanCent > 0 && spare > 0) return [{ type: "repayLoan", amountCent: Math.min(spare, state.finance.loanCent) }];
  return [];
}

/** FRM-R29: Hardware erneuern, sobald sie spürbar bremst und die Kasse danach noch ein halbes Jahr trägt. */
function hardware(data: GameData, state: GameState, p: Profile | null): Input[] {
  if (!p) return [];
  const y = year(state);
  const h = hardwareFactor(data, state.office.hardware.level, state.office.hardware.year, y);
  if (h >= p.hardwareBelowBp) return [];
  const level = state.office.hardware.level;
  const price = levelPrice(state, data, "hardware", level);
  return state.moneyCent - price > weeklyCost(state, data) * 26 ? [{ type: "buyHardware", level }] : [];
}

function office(data: GameData, state: GameState, p: Profile | null): Input[] {
  if (!p || !p.move) return [];
  if (state.people.length < maxPersonsNow(state, data) || teamTarget(p, state) <= state.people.length) return [];
  // Wachsende Studios: Garage → Etage → Bürohaus → Gebäude → Campus, sobald das Team die Plätze füllt.
  const chain: [string, string][] = [["garage", "etage"], ["etage", "buerohaus"], ["buerohaus", "gebaeude"], ["gebaeude", "campus"]];
  const next = chain.find(([from]) => state.office.id === from || (from !== "garage" && state.office.id.startsWith(from)))?.[1] ?? null;
  if (!next) return [];
  const target = data.offices.offices.find((o) => o.id === next)!;
  const deposit = data.offices.depositMonths * monthlyRent(state, data, target.places);
  const input: Input = { type: "moveOffice", office: next };
  return state.moneyCent > deposit + weeklyCost(state, data) * 26 && validateInput(state, data, input) === null ? [input] : [];
}

function projectControl(bot: Bot, data: GameData, state: GameState, p: Profile | null): Input[] {
  const out: Input[] = [];
  const rng = rngOf(bot);
  for (const pr of activeProjects(state).sort((a, b) => a.id - b.id)) {
    if (bot.polish[pr.id] === undefined) bot.polish[pr.id] = p ? p.polish[0] + rng.int(p.polish[1] - p.polish[0] + 1) : rng.int(7);
    if (pr.status === "bereit" && pr.readyWeek !== null && state.week - pr.readyWeek >= bot.polish[pr.id]!) {
      out.push({ type: "release", projectId: pr.id });
    }
    if (p?.playtest && shouldPlaytest(pr) && validateInput(state, data, { type: "playtest", projectId: pr.id }) === null) {
      out.push({ type: "playtest", projectId: pr.id });
    }
    if (p && bot.strategy !== "durchschnitt") out.push(...developmentChoices(data, state, pr));
  }
  return out;
}

/**
 * Etappe 6c.9: Wahlen aus 6c.6 bis 6c.8. Ab mittlerem Umfang Bugjagd in der Beta; nach der Produktion den Bereich mit
 * dem meisten Kartenwert polieren; vor dem Release Sprachen mit mindestens 5 % Nachfrage-Zuwachs (klein: 8 %).
 */
function developmentChoices(data: GameData, state: GameState, pr: Project): Input[] {
  const out: Input[] = [];
  if (pr.contractGame) return out;
  if (pr.status === "laeuft" && groupsOf(data, pr.scope).includes("beta") && pr.phaseFocus.beta === undefined) {
    out.push({ type: "setPhaseFocus", projectId: pr.id, group: "beta", focus: "bugjagd" });
  }
  if (pr.status === "bereit" && pr.polishArea === null && pr.features.length > 0) {
    const y = year(state);
    const byArea = new Map<string, number>();
    for (const id of pr.features) {
      const f = data.features.find((x) => x.id === id)!;
      byArea.set(f.area, (byArea.get(f.area) ?? 0) + agedValue(data, f, y));
    }
    const area = [...byArea.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]![0];
    out.push({ type: "setPolish", projectId: pr.id, area: area as Project["polishArea"] & string });
  }
  if (pr.status === "bereit" && pr.languages.length === 0) {
    const y = year(state);
    const min = pr.scope === "klein" ? 800 : 500;
    const langs = availableLanguages(data, y).filter((l) => localizationFactor(data, [l], y) - 10000 >= min);
    if (langs.length > 0) out.push({ type: "setLanguages", projectId: pr.id, languages: langs });
  }
  return out.filter((i) => validateInput(state, data, i) === null);
}

function shouldPlaytest(p: Project): boolean {
  return p.status === "laeuft" && p.playtests.length === 0 && p.phase === "produktion";
}

/**
 * S03: eigene Engine gründen, sobald freigeschaltet; Engine-Team nach Teamgröße besetzen (freie Personen zuerst);
 * Forschung am Modul mit dem größten Rückstand zum Stand der Technik.
 */
function engineWork(bot: Bot, data: GameData, state: GameState, p: Profile | null): Input[] {
  if (!p || (p.engineFrom.length === 0 && !p.licenses) || state.unlocks["engine"] === undefined) return [];
  if (!state.engine) return [{ type: "foundEngine", name: "Kern" }];
  const researching = new Set(state.engine.jobs.map((j) => j.module));
  const vendor = p.licenses && data.engine.middleware.vendors
    .find((v) => (p.licenses === "nur" || !researching.has(v.module)) && validateMiddleware(state, data, "licenseModule", v.id) === null);
  if (p.licenses === "nur") return vendor ? [{ type: "licenseModule", vendor: vendor.id }] : [];
  const out: Input[] = vendor ? [{ type: "licenseModule", vendor: vendor.id }] : [];
  // Balancing 1.0: Das Engine-Team wächst mit der Firma (etwa jede siebte Person), sonst fällt die eigene Engine ab
  // 2000 weit hinter den Stand der Technik zurück und die Wertungen sinken (Lauf 1980–2040).
  const want = Math.max(p.engineFrom.filter((n) => state.people.length >= n).length, p.engineFrom.length > 0 ? Math.trunc(state.people.length / 7) : 0);
  const team = state.people.filter((x) => x.assignment?.kind === "engine");
  if (team.length < want) {
    const free = state.people.filter((x) => x.assignment === null).slice(0, want - team.length);
    for (const x of free) out.push({ type: "assign", personId: x.id, projectId: null, engine: true });
  }
  if (state.engine.jobs.length < 2) {
    // Zuerst das Modul, dessen nächste Stufe die wertvollste gesperrte Karte freischaltet; sonst der größte Rückstand.
    const y = year(state);
    const art = stateOfArtMap(data, y);
    const unlockValue = (m: (typeof MODULES)[number]) => {
      const next = plannedLevel(state.engine!, m) + 1;
      return data.features.filter((f) => f.availableFrom <= y && f.requires.module === m && f.requires.level === next)
        .reduce((best, f) => Math.max(best, agedValue(data, f, y)), 0);
    };
    const options = MODULES.map((m) => ({ m, gap: art[m] - plannedLevel(state.engine!, m), value: unlockValue(m) }))
      .filter((x) => x.gap > 0 && validatePlanResearch(state, data, x.m) === null)
      .sort((a, b) => b.value - a.value || b.gap - a.gap || MODULES.indexOf(a.m) - MODULES.indexOf(b.m));
    if (options[0]) out.push({ type: "planResearch", module: options[0].m });
  }
  return out;
}

/** Eingaben des Bots für die kommende Woche. */
export function botInputs(bot: Bot, data: GameData, state: GameState): Input[] {
  const p = bot.strategy === "zufall" ? null : PROFILES[bot.strategy];
  const engine = engineWork(bot, data, state, p);
  // Wer ins Engine-Team geht, steht für neue Projekte nicht mehr zur Verfügung.
  const toEngine = new Set(engine.flatMap((i) => (i.type === "assign" ? [i.personId] : [])));
  const view = toEngine.size === 0 ? state : { ...state, people: state.people.map((x) => (toEngine.has(x.id) ? { ...x, assignment: { kind: "engine" as const, id: 0 } } : x)) };
  const out: Input[] = [
    ...answers(bot, data, state, p),
    ...finance(data, state, p),
    ...office(data, state, p),
    ...hardware(data, state, p),
    ...engine,
    ...projectControl(bot, data, state, p),
    ...newProjects(bot, data, view, p),
  ];
  return [...out, ...patches(data, state, p, out), ...publisherDeals(data, state, p), ...konzernMoves(data, state, p)];
}

/**
 * S09, FRM-R51 (Etappe 6b.6): Der Konzern-Bot wächst wie „wachstum“, geht mit 30 % an die Börse, sobald es geht, und
 * hält höchstens drei Töchter: das kleinste sondierbare Studio, nach Prüfung, Gebot 1,35 × Mitte der Spanne, wenn
 * danach ein Jahr Fixkosten bleibt; Gegenangebote nimmt er unter derselben Bedingung an. Mit den Schwellen aus A02
 * (150 Personen) erreicht er Börse und Übernahmen nicht (OFFENE-FRAGEN 6b.6).
 */
function konzernMoves(data: GameData, state: GameState, p: Profile | null): Input[] {
  if (!p?.konzern) return [];
  const out: Input[] = [];
  const ipo: Input = { type: "ipo", shareBp: 3000 };
  if (!state.stock.listed && validateInput(state, data, ipo) === null) out.push(ipo);
  // S13 AUS-R83, AUS-R90: wehrt Angebote ab und kauft zurück, sobald der eigene Anteil unter 55 % sinkt.
  if (state.stock.hostile) out.push({ type: "stockDefense", action: "abwehr" });
  const st = state.stock;
  if (st.listed && st.shares > 0 && (st.shares - st.publicShares) * 100 < st.shares * 55) out.push({ type: "stockDefense", action: "rueckkauf", shareBp: 500 });
  // Endgame-Themen: nimmt die ersten drei Herausforderungen an, sobald sie angeboten werden.
  for (const c of data.goals.endgame.challenges.list.slice(0, data.goals.endgame.challenges.maxActive)) {
    if (!state.endgame.challenges.some((x) => x.id === c.id)) out.push({ type: "challenge", id: c.id, action: "annehmen" });
  }
  const k = konzernView(state, data);
  // S13 AUS-R40 bis AUS-R42: verlegt Pitches ab erwarteter Wertung 7,0 mit ausgewogenem Paket, wenn zwei Jahresreserven
  // übrig bleiben; bei verfehltem Meilenstein wird gekürzt.
  const reserve = 52 * (weeklyWages(state, data) + weeklyRent(state, data));
  for (const x of state.publishing.pitches) {
    const advance = mulDivTool(x.budgetCent, data.publishers.own.packages.ausgewogen.advanceBp, 10000);
    const ok = x.shownScoreBp >= 70000 && state.moneyCent - advance > 2 * reserve;
    out.push({ type: "publishingOffer", pitchId: x.id, package: ok ? "ausgewogen" : null });
  }
  for (const d of state.publishing.deals) if (d.decision) out.push({ type: "publishingDeal", dealId: d.id, action: "kuerzen" });
  if (!k.unlocked) return out.filter((i) => validateInput(state, data, i) === null);
  for (const d of k.deals) {
    if (d.phase === "gegenangebot") {
      out.push({ type: "acquire", action: state.moneyCent - d.counterCent > reserve ? "annehmen" : "zurueckziehen", dealId: d.id });
    } else if (d.phase === "sondiert" && d.diligence === "keine") {
      out.push({ type: "acquire", action: "pruefen", dealId: d.id });
    } else if (d.phase === "sondiert" && d.diligence === "fertig") {
      const bid = mulDivTool(d.range.mid, 135, 100);
      out.push(state.moneyCent - bid > reserve ? { type: "acquire", action: "bieten", dealId: d.id, bidCent: bid } : { type: "acquire", action: "zurueckziehen", dealId: d.id });
    }
  }
  if (k.deals.length === 0 && k.subsidiaries.length < 3 && state.moneyCent > 2 * reserve) {
    const t = [...k.targets].filter((x) => x.blockedWeeks === 0).sort((a, b) => a.people - b.people || a.id - b.id)[0];
    if (t) out.push({ type: "acquire", action: "sondieren", targetId: t.id });
  }
  return out.filter((i) => validateInput(state, data, i) === null);
}

function mulDivTool(a: number, b: number, c: number): number {
  return Math.floor((a * b) / c);
}

/**
 * FRM-R42 bis FRM-R44: Bots mit Publisher-Profil bieten jedes laufende Projekt ab „mittel“ einmal als Konzept an und
 * nehmen das Angebot mit dem höchsten Vorschuss ohne Verhandlung an (bei Gleichstand das ältere).
 */
function publisherDeals(data: GameData, state: GameState, p: Profile | null): Input[] {
  if (!p?.publisher) return [];
  const out: Input[] = [];
  const offers = [...state.publisherOffers].sort((a, b) => b.terms.advanceBp - a.terms.advanceBp || a.id - b.id);
  const taken = new Set<number>();
  for (const o of offers) {
    if (taken.has(o.projectId)) continue;
    taken.add(o.projectId);
    out.push({ type: "publisherOffer", offerId: o.id, action: "annehmen" });
  }
  for (const pr of [...state.projects].sort((a, b) => a.id - b.id)) {
    if (pr.scope === "klein" || taken.has(pr.id)) continue;
    const pitch: Input = { type: "pitchPublisher", projectId: pr.id, mode: "konzept" };
    if (validateInput(state, data, pitch) === null) out.push(pitch);
  }
  return out;
}

/**
 * BTR-R07 (Etappe 5): Bots patchen ein veröffentlichtes Spiel mit vielen bekannten schweren Bugs, wenn nach allen
 * anderen Eingaben noch Personen frei sind (gierig patcht nie).
 */
function patches(data: GameData, state: GameState, p: Profile | null, before: Input[]): Input[] {
  if (!p || !p.playtest) return [];
  const used = new Set(before.flatMap((i) => (i.type === "createProject" ? i.people : i.type === "assign" ? [i.personId] : [])));
  const free = state.people.filter((x) => x.assignment === null && !used.has(x.id)).map((x) => x.id).slice(0, 2);
  if (free.length === 0) return [];
  const target = [...state.projects].filter((x) => x.ops && !x.ops.patch && x.ops.known.schwer >= 5).sort((a, b) => b.ops!.known.schwer - a.ops!.known.schwer || a.id - b.id)[0];
  if (!target) return [];
  const input: Input = { type: "planPatch", projectId: target.id, size: "klein", people: free };
  return validateInput(state, data, input) === null ? [input] : [];
}

/** Firmenwert für den Vergleich der Strategien: Kasse minus Kredite; insolvent zählt nie als Sieg. */
export function netWorth(state: GameState): number {
  return state.moneyCent - state.finance.loanCent - state.finance.cushionDebtCent;
}
