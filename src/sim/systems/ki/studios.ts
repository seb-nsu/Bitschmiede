// KI-Studios als Firmen (S01 KRN-R75, KRN-R76; S08 MRK-R32 bis MRK-R37; S14 KI-R01, KI-R05, KI-R58).
// ANNAHME (Annahme 1 aus Etappe 3): Ein Studio hat Teams als Größe und einen Bestwert je Bereich statt einzelner Personen.
import { synergyBp } from "../uebernahmen";
import { type Bp, BP_ONE, type Cent, clamp, divInt, mulBp, mulDiv } from "../../num";
import { AREAS, type AiArchetype, type AiSize, type AiStudio, type AiWorld, type AreaMap, type GameData, type GameState } from "../../model/types";
import { dateOf, isFirstWeekOfMonth, isFirstWeekOfYear } from "../../calendar";
import { dropFirmStream, firmStream, type Rng, stream } from "../../rng";
import { anchorValue } from "../finanzen";
import { chronicle } from "../katalog";
import { difficulty, holdConference, initBeliefs, logDecision } from "./entscheidung";
import { bookGenreRevenue, chooseRivals } from "./rivalen";
import { aiMaxPeople, aiMaybeMove, aiOfficeFor, aiRent } from "../buero";
import { onStudioClosed } from "../markenmarkt";
import { phaseEffects, phaseSalaryBp } from "../marktphasen";

const SIZES: readonly AiSize[] = ["gross", "mittel", "klein"];

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

/** Leere KI-Welt; sie entsteht im ersten Tick (generateWorld). */
export function emptyAi(): AiWorld {
  return {
    studios: [], products: [], nextStudioId: 1, nextProductId: 1, generated: false, playerRevenueByYear: [0], closures: {},
    rivals: [], playerRevenueByQuarter: [0], playerShares: [], copycats: {}, countersAll: { year: 0, n: 0 },
    quarterGenre: { player: {}, all: {} }, yearGenre: {}, genreLeaders: [],
  };
}

export function liveStudios(state: GameState): AiStudio[] {
  return state.ai.studios.filter((s) => s.closedWeek === null);
}

export function studioRng(state: GameState, studio: AiStudio): Rng {
  return firmStream(state, "ki", studio.id);
}

/** Personen je Team im Jahr (ANNAHME: höchstens 7 wie beim Spieler bis zu den Teams aus 3.7). */
export function teamSizeFor(data: GameData, year: number): number {
  return anchorValue(data.ai.teamSizeAnchors, year);
}

export function studioPeople(studio: AiStudio): number {
  return studio.engineStaff + studio.teams.reduce((s, t) => s + t.size, 0);
}

/** KI-R01: Kosten je Person und Monat und Miete je Platz wie beim Spieler, ohne Faktor des Presets. */
export function personMonthCost(state: GameState, data: GameData): Cent {
  const y = yearOf(state);
  // MRK-R60: Gehaltsniveau der Marktphase gilt auch für die KI.
  return mulBp(anchorValue(data.economy.salaryAnchorsCent, y), phaseSalaryBp(state, data)) + anchorValue(data.economy.rentPerPlaceAnchorsCent, y);
}

export function monthlyCost(state: GameState, data: GameData, studio: AiStudio): Cent {
  // MRK-R38: dazu die Miete des KI-Büros.
  return studioPeople(studio) * personMonthCost(state, data) + aiRent(state, data, studio);
}

export function weeklyCost(state: GameState, data: GameData, people: number): Cent {
  return mulDiv(people * personMonthCost(state, data), 12, 52, 1);
}

/** MRK-R35: Größe nach Zahl der Teams. */
export function sizeForTeams(teams: number): AiSize {
  if (teams >= 4) return "gross";
  return teams >= 2 ? "mittel" : "klein";
}

function uniqueName(state: GameState, data: GameData, rng: Rng): string {
  const n = data.ai.names;
  const taken = new Set(state.ai.studios.map((s) => s.name));
  for (let i = 0; i < 30; i++) {
    const name = n.first[rng.int(n.first.length)]! + n.second[rng.int(n.second.length)]! + n.suffix[rng.int(n.suffix.length)]!;
    if (!taken.has(name)) return name;
  }
  return `${n.first[rng.int(n.first.length)]!}${n.second[rng.int(n.second.length)]!} ${state.ai.nextStudioId}`;
}

/** Teamstärke: Branche des Jahres (wie Q_erw ohne Median) plus Abstand des Archetyps und Streuung je Studio und Bereich. */
function drawStrength(state: GameState, data: GameData, archetype: AiArchetype, rng: Rng): AreaMap {
  const base = rng.normal(anchorValue(data.quality.marketStrengthAnchors, yearOf(state)) + data.ai.strengthShift + data.ai.archetypes[archetype].strengthOffset, data.ai.strengthSd);
  const out = {} as AreaMap;
  for (const a of AREAS) out[a] = clamp(rng.normal(base, data.ai.areaSd), 1, 100);
  return out;
}

export function createStudio(state: GameState, data: GameData, rng: Rng, archetype: AiArchetype, size: AiSize, cashMonths: number): AiStudio {
  const y = yearOf(state);
  const genre = data.genres[rng.int(data.genres.length)]!.id;
  // S14 AiProfile: zwei verschiedene Charakterzüge passend zum Archetyp, Lieblingsgenres mit dem Hauptgenre.
  const pool = [...data.ai.traitsByArchetype[archetype]];
  const traits = [pool.splice(rng.int(pool.length), 1)[0]!, pool.splice(rng.int(pool.length), 1)[0]!].sort();
  const others = data.genres.map((g) => g.id).filter((g) => g !== genre);
  const favGenres = [genre];
  while (favGenres.length < data.ai.considerations.favoriteGenres && others.length > 0) favGenres.push(others.splice(rng.int(others.length), 1)[0]!);
  const studio: AiStudio = {
    id: state.ai.nextStudioId++,
    name: uniqueName(state, data, rng),
    archetype,
    size,
    officeId: "garage",
    foundedWeek: state.week,
    closedWeek: null,
    cashCent: 0,
    strength: drawStrength(state, data, archetype, rng),
    experienceGenre: { [genre]: rng.range(0, 3000) },
    experienceEngine: rng.range(0, 3000),
    mainGenre: genre,
    teams: [],
    nextTeamId: 1,
    releases: 0,
    revenueByYear: [0],
    lastScores: [],
    traits,
    favGenres,
    focusGenres: [...favGenres],
    platformBet: null,
    budgetBp: { ...data.ai.archetypes[archetype].budgetBp },
    lastConferenceWeek: -1,
    conferenceCashCent: 0,
    extraConferenceYear: 0,
    beliefs: { genreTheme: [], platform: {} },
    perception: { quarter: -1, z: {} },
    riskShyUntilWeek: 0,
    log: [],
    engineId: null,
    ownEngineId: null,
    engineExperienceBp: 0,
    engineStaff: 0,
    profitYears: 0,
    revenueByQuarter: [0],
    rival: null,
    forced: null,
  };
  for (let i = 0; i < data.ai.teamsBySize[size]; i++) studio.teams.push({ id: studio.nextTeamId++, size: teamSizeFor(data, y), project: null, retrainWeeks: 0, lastEngineId: null });
  studio.officeId = aiOfficeFor(state, data, studioPeople(studio)).id;
  studio.cashCent = cashMonths * monthlyCost(state, data, studio);
  initBeliefs(state, data, studio, rng);
  state.ai.studios.push(studio);
  holdConference(state, data, studio);
  return studio;
}

/** Aufrunden von n · Anteil. */
function ceilShare(n: number, shareBp: Bp): number {
  return divInt(n * shareBp + BP_ONE - 1, BP_ONE, 1);
}

/**
 * KRN-R76: Archetypen je Größe so verteilen, dass jeder seinen Mindestanteil erreicht und keiner über 35 % liegt.
 * Reihenfolge der Größen: groß, mittel, klein (die seltenen Plätze zuerst).
 */
export function planArchetypes(data: GameData, counts: Record<AiSize, number>, rng: Rng): { archetype: AiArchetype; size: AiSize }[] {
  const n = counts.gross + counts.mittel + counts.klein;
  const cap = Math.max(1, mulDiv(n, data.ai.maxArchetypeShareBp, BP_ONE, 1));
  const used: Record<string, number> = {};
  const out: { archetype: AiArchetype; size: AiSize }[] = [];
  const add = (archetype: AiArchetype, size: AiSize) => {
    out.push({ archetype, size });
    used[archetype] = (used[archetype] ?? 0) + 1;
  };
  for (const size of SIZES) {
    let left = counts[size];
    const options = data.ai.sizeArchetypes[size];
    for (const o of options) {
      const take = Math.min(left, Math.max(0, ceilShare(n, o.minShareBp) - (used[o.id] ?? 0)));
      for (let i = 0; i < take; i++) add(o.id, size);
      left -= take;
    }
    for (; left > 0; left--) {
      const open = options.filter((o) => (used[o.id] ?? 0) < cap);
      add((open.length > 0 ? open[rng.int(open.length)]! : options[0]!).id, size);
    }
  }
  // Mischen, damit die Firmen-IDs nicht nach Größe geordnet sind.
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** KRN-R75: Zahl und Größen der Studios nach Startjahr. */
export function worldCounts(data: GameData, year: number, rng: Rng): Record<AiSize, number> {
  const a = data.ai;
  const v = a.countVariationBp;
  const n = clamp(mulBp(anchorValue(a.countAnchors, year), BP_ONE + rng.range(-v, v)), a.minStudios, a.maxStudios);
  const gross = ceilShare(n, a.sizeSharesBp.gross);
  const mittel = Math.min(n - gross, divInt(n * a.sizeSharesBp.mittel + 5000, BP_ONE, 1));
  return { gross, mittel, klein: n - gross - mittel };
}

/** KRN-R75, KRN-R76: Weltgenerator für die KI-Studios (Strom „ki“). */
export function generateWorld(state: GameState, data: GameData): void {
  const rng = stream(state, "ki");
  // ANNAHME: Die Stufe begrenzt die Zahl (S14 Abschnitt 7, „Zahl der KI-Studios“); die Größenanteile bleiben.
  const counts = worldCounts(data, yearOf(state), rng);
  const cap = maxStudios(state, data);
  while (counts.klein + counts.mittel + counts.gross > cap) {
    if (counts.klein > 0) counts.klein -= 1;
    else counts.mittel -= 1;
  }
  const plan = planArchetypes(data, counts, rng);
  const [lo, hi] = data.ai.startCashMonths;
  for (const p of plan) createStudio(state, data, rng, p.archetype, p.size, rng.range(lo, hi));
  state.ai.generated = true;
  chooseRivals(state, data);
}

/** MRK-R36 mit S14 Abschnitt 7: Höchstzahl der Stufe, nie über der Obergrenze der Daten. */
export function maxStudios(state: GameState, data: GameData): number {
  return Math.max(data.ai.minStudios, Math.min(data.ai.maxStudios, difficulty(state, data).maxStudios));
}

export function closeStudio(state: GameState, data: GameData, studio: AiStudio): void {
  studio.closedWeek = state.week;
  for (const t of studio.teams) t.project = null;
  // KI-R80 (Leistung): Geschlossene Studios bleiben für Namen und Verträge im Zustand, aber ohne Protokoll und Erwartungen.
  studio.log = [];
  studio.beliefs = { genreTheme: [], platform: {} };
  studio.perception = { quarter: studio.perception.quarter, z: {} };
  // ANNAHME: Die Spiele verschwinden aus dem Handel; die Marken gehen in die Konkursmasse (MRK-R65).
  state.ai.products = state.ai.products.filter((p) => p.studioId !== studio.id);
  dropFirmStream(state, "ki", studio.id);
  const decade = String(yearOf(state) - (yearOf(state) % 10));
  state.ai.closures[decade] = (state.ai.closures[decade] ?? 0) + 1;
  chronicle(state, "log.aiClosed", { studio: studio.name });
  onStudioClosed(state, data, studio);
}

/**
 * MRK-R36: Gründungen je Quartal nach Marktphase (Boom 1–3, normal 0–1, Krise keine); unter dem Minimum wird
 * nachgegründet. ANNAHME: Neue Studios sind klein, mit einem Archetyp der kleinen Größe.
 */
function foundingStep(state: GameState, data: GameData): void {
  const d = dateOf(state.startYear, state.week);
  if (!isFirstWeekOfMonth(state.startYear, state.week) || d.month % 3 !== 0) return;
  const rng = stream(state, "ki");
  const live = liveStudios(state).length;
  const [lo, hi] = phaseEffects(state, data).foundPerQuarter;
  const room = Math.max(0, maxStudios(state, data) - live);
  // Wie vor 6a.3: gezogen wird nur bei Platz, und normal heißt „Zufallszahl unter 50 % → eine Gründung“.
  const found = room > 0 ? Math.min(room, hi - mulDiv(rng.uniformBp(), hi - lo + 1, BP_ONE, 1)) : 0;
  foundStudios(state, data, found);
}

function foundStudios(state: GameState, data: GameData, n: number): void {
  const rng = stream(state, "ki");
  const options = data.ai.sizeArchetypes.klein;
  for (let i = 0; i < n; i++) {
    const s = createStudio(state, data, rng, options[rng.int(options.length)]!.id, "klein", data.ai.foundCashMonths);
    chronicle(state, "log.aiFounded", { studio: s.name });
  }
}

/** MRK-R36, MRK-T07: Unter dem Minimum wird sofort nachgegründet, nicht erst zum nächsten Quartal (4b.9). */
function refillToMinimum(state: GameState, data: GameData): void {
  if (!state.ai.generated) return;
  foundStudios(state, data, Math.max(0, data.ai.minStudios - liveStudios(state).length));
}

/**
 * MRK-R35: Jahreswechsel. Teams bekommen die Größe der Epoche, die Stärke folgt der Branche, Umsätze rücken ein Jahr
 * weiter. Wer genug Rücklage hat, gründet ein weiteres Team; wer knapp ist, löst eines auf (ANNAHME).
 */
function yearStep(state: GameState, data: GameData): void {
  const y = yearOf(state);
  const drift = anchorValue(data.quality.marketStrengthAnchors, y) - anchorValue(data.quality.marketStrengthAnchors, y - 1);
  const keep = data.ai.historyYears + 1;
  state.ai.playerRevenueByYear = [0, ...state.ai.playerRevenueByYear].slice(0, keep);
  for (const s of liveStudios(state)) {
    s.revenueByYear = [0, ...s.revenueByYear].slice(0, keep);
    for (const a of AREAS) s.strength[a] = clamp(s.strength[a] + drift, 1, 100);
    // MRK-R60: In der Krise entlassen KI-Studios 10–20 % (ANNAHME: alle 15 %, über die Teamgröße der Krise).
    for (const t of s.teams) t.size = Math.max(1, mulBp(teamSizeFor(data, y), phaseEffects(state, data).aiTeamSizeBp));
    // MRK-R38: Umzug ab 95 % Belegung; ein neues Team braucht Platz im Büro (Plätze + 20 %).
    aiMaybeMove(state, data, s, studioPeople(s));
    const month = monthlyCost(state, data, s);
    const fits = studioPeople(s) + teamSizeFor(data, y) <= aiMaxPeople(state, data, s);
    if (fits && s.cashCent > data.ai.growCashMonths * month && s.teams.length < data.ai.archetypes[s.archetype].maxTeams) {
      s.teams.push({ id: s.nextTeamId++, size: teamSizeFor(data, y), project: null, retrainWeeks: 0, lastEngineId: null });
    }
    s.size = sizeForTeams(s.teams.length);
    const reserve = data.ai.payoutAboveMonths * monthlyCost(state, data, s);
    if (s.cashCent > reserve) s.cashCent = reserve;
  }
}

/**
 * KI-R32: Unter der Grenze des Sparprogramms (2 Monatskosten) löst ein Studio monatlich ein Team auf: zuerst ein
 * freies, sonst das mit dem geringsten Fortschritt. Ein Studio mit einem Team kann nur noch hoffen.
 */
function savingsStep(state: GameState, data: GameData): void {
  if (!isFirstWeekOfMonth(state.startYear, state.week)) return;
  for (const s of liveStudios(state)) {
    if (s.teams.length <= 1 || s.cashCent >= data.ai.considerations.savingsMonths * monthlyCost(state, data, s)) continue;
    const progress = (i: number) => {
      const p = s.teams[i]!.project;
      return p ? divInt(p.effortDoneBp * BP_ONE, Math.max(1, p.effortTotalBp), 1) : -1;
    };
    let drop = 0;
    for (let i = 1; i < s.teams.length; i++) if (progress(i) < progress(drop)) drop = i;
    s.teams.splice(drop, 1);
    s.size = sizeForTeams(s.teams.length);
    logDecision(data, s, { week: state.week, domain: "sparprogramm", choice: String(s.teams.length), utilityBp: 0, reasons: ["ai.reason.ruecklage", "ai.reason.kosten"], viaGut: false });
  }
}

/** Tick-Schritt 3 (Rahmen): Jahreswechsel, Sparprogramm und Gründungen. */
export function studioStep(state: GameState, data: GameData): void {
  if (isFirstWeekOfYear(state.week) && state.week > 0) yearStep(state, data);
  savingsStep(state, data);
  foundingStep(state, data);
}

/** KI-R32: Kreditlinie eines Studios (ANNAHME: feste Monatskosten-Zahl statt Bankgespräch; Kapitalmarkt in Etappe 6b). */
export function creditLimit(state: GameState, data: GameData, studio: AiStudio): Cent {
  return data.ai.creditMonths * monthlyCost(state, data, studio);
}

/**
 * Tick-Schritt 10 für die KI: Wochenkosten der Teams; jenseits der Kreditlinie ist das Studio pleite (KI-R58: kein
 * Schutz). KI-R32: Ein negativer Kontostand kostet monatlich Zinsen.
 */
export function studioFinanceStep(state: GameState, data: GameData): void {
  const month = isFirstWeekOfMonth(state.startYear, state.week);
  for (const s of liveStudios(state)) {
    // UEB-R21: Synergien senken die laufenden Kosten einer integrierten Tochter.
    const cost = mulBp(weeklyCost(state, data, studioPeople(s)) + mulDiv(aiRent(state, data, s), 12, 52, 1), BP_ONE - synergyBp(data, s));
    s.cashCent -= cost;
    if (month && s.cashCent < 0) s.cashCent -= mulBp(-s.cashCent, data.ai.creditInterestPerMonthBp);
    for (const t of s.teams) if (t.project) t.project.costCent += weeklyCost(state, data, t.size);
    if (s.cashCent < -creditLimit(state, data, s)) closeStudio(state, data, s);
  }
  refillToMinimum(state, data);
  let week = 0;
  for (const p of [...state.projects].sort((a, b) => a.id - b.id)) {
    if (!p.sales || p.sales.ended) continue;
    week += p.sales.weekRevenueCent;
    bookGenreRevenue(state, 0, p.genre, p.sales.weekRevenueCent);
  }
  state.ai.playerRevenueByYear[0] = (state.ai.playerRevenueByYear[0] ?? 0) + week;
  state.ai.playerRevenueByQuarter[0] = (state.ai.playerRevenueByQuarter[0] ?? 0) + week;
}
