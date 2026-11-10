// Rivalen (S08 MRK-R45 bis MRK-R52, S14 KI-R15 bis KI-R17, KI-R22, KI-R41 bis KI-R50, KI-R60 bis KI-R67):
// Chef, Ziele, Beziehung und Gedächtnis, Stimmung, Chefwechsel, Bedrohung (Formel 6.4), Gegenzüge, Nachahmer (6.6),
// Release-Duell, Engine-Kampf, Kooperation und Schlagzeilen in der Weltchronik.
import { type Bp, BP_ONE, type Cent, clamp, divBp, divInt, mulBp } from "../../num";
import type {
  AiProject, AiStudio, GameData, GameState, LicenseEventData, MarketEngine, Project, RivalGoal, RivalGoalId, RivalMood, RivalParams,
  RivalState, ThreatDomain,
} from "../../model/types";
import { SCOPES } from "../../model/types";
import type { AiCandidate } from "./projekte";
import { dateOf, isFirstWeekOfQuarter, isFirstWeekOfYear } from "../../calendar";
import { type Rng, stream } from "../../rng";
import { chronicle } from "../katalog";
import { addEvent } from "../ereignisse";
import { createContract, engineById, offerTerms, offeredTemplates } from "../lizenzen";
import { difficulty, holdConference, logDecision } from "./entscheidung";
import { liveStudios, monthlyCost, sizeForTeams, studioPeople, studioRng, teamSizeFor } from "./studios";
import { rivalKeyPeople } from "../personal";

const GOALS: readonly RivalGoalId[] = ["genreFuehrer", "engineImperium", "kritikerliebling", "wachstum", "spielerSchlagen"];
const DOMAINS: readonly ThreatDomain[] = ["genre", "engine"];

function R(data: GameData): RivalParams {
  return data.ai.rivals;
}

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

function monthIndex(state: GameState): number {
  const d = dateOf(state.startYear, state.week);
  return d.year * 12 + d.month;
}

function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

export function rivalStudios(state: GameState): AiStudio[] {
  return state.ai.rivals.map((id) => state.ai.studios.find((s) => s.id === id)).filter((s): s is AiStudio => !!s && s.closedWeek === null && s.rival !== null);
}

function strength(s: AiStudio): Cent {
  return sum(s.revenueByYear) + s.cashCent;
}

// ---------- Auswahl (MRK-R45, KI-R60, KI-R67) ----------

function chiefName(data: GameData, rng: Rng): string {
  const r = R(data);
  return `${r.chiefFirstNames[rng.int(r.chiefFirstNames.length)]!} ${r.chiefLastNames[rng.int(r.chiefLastNames.length)]!}`;
}

function newRivalState(state: GameState, data: GameData, studio: AiStudio, rng: Rng): RivalState {
  const rival: RivalState = {
    chief: { name: chiefName(data, rng), sinceWeek: state.week, goalFailures: 0 }, goals: [], relationBp: 0, relationHistory: [0], memory: [],
    mood: "normal", angeschlagenQuarters: 0, threat: { genre: 0, engine: 0 }, reactAtWeek: { genre: null, engine: null },
    counters: { year: yearOf(state), n: 0 }, lastQuoteMonth: -1,
    // FRM-R68: zwei Schlüsselpersonen, die der Spieler abwerben kann.
    keyPeople: rivalKeyPeople(data, studio.strength, rng),
  };
  studio.rival = rival;
  fillGoals(state, data, studio, 1 + (studioRng(state, studio).uniformBp() < divInt(BP_ONE, 2, 1) ? 1 : 0));
  return rival;
}

/** MRK-R45: die stärksten passenden Studios, mindestens drei verschiedene Archetypen. */
function pickCandidates(state: GameState, data: GameData, n: number): AiStudio[] {
  const taken = new Set(state.ai.rivals);
  const current = rivalStudios(state);
  const pool = liveStudios(state).filter((s) => !taken.has(s.id)).sort((a, b) => strength(b) - strength(a) || a.id - b.id);
  const picked: AiStudio[] = [];
  for (const c of pool) {
    if (picked.length >= n) break;
    const kinds = new Set([...current, ...picked].map((s) => s.archetype));
    const need = Math.max(0, R(data).minArchetypes - kinds.size);
    const slots = n - picked.length;
    if (!kinds.has(c.archetype) || slots > need) picked.push(c);
  }
  return picked;
}

/** Zu Spielbeginn (aus generateWorld): Rivalen der Stufe mit Startstärke (S14 Abschnitt 7, A47 einzige Zahl der Stufe). */
export function chooseRivals(state: GameState, data: GameData): void {
  const rng = stream(state, "welt");
  const step = R(data).startStrength[state.settings.preset] ?? 0;
  for (const s of pickCandidates(state, data, difficulty(state, data).rivals)) {
    state.ai.rivals.push(s.id);
    newRivalState(state, data, s, rng);
    // ANNAHME: Eine Profilstufe = ein Team mehr oder weniger; die Marke für Hardcore kommt mit dem Markenmarkt (3.10).
    if (step < 0 && s.teams.length > 1) s.teams.pop();
    if (step > 0 && s.teams.length > 0) s.teams.push({ id: s.nextTeamId++, size: teamSizeFor(data, yearOf(state)), project: null, retrainWeeks: 0, lastEngineId: null });
    s.size = sizeForTeams(s.teams.length);
  }
}

/** KI-R67: Ein ausgeschiedener Rivale wird ersetzt; der Nachrücker erscheint mit einer Vorstellungs-Schlagzeile. */
function replaceRivals(state: GameState, data: GameData): void {
  const alive = rivalStudios(state);
  if (alive.length === state.ai.rivals.length && alive.length >= difficulty(state, data).rivals) return;
  state.ai.rivals = alive.map((s) => s.id);
  const missing = difficulty(state, data).rivals - alive.length;
  if (missing <= 0) return;
  const rng = stream(state, "welt");
  for (const s of pickCandidates(state, data, missing)) {
    state.ai.rivals.push(s.id);
    const r = newRivalState(state, data, s, rng);
    chronicle(state, "log.rival.intro", { studio: s.name, chief: r.chief.name });
  }
}

// ---------- Ziele (KI-R15 bis KI-R17) ----------

function goalAllowed(data: GameData, studio: AiStudio, id: RivalGoalId): boolean {
  const g = R(data).goals[id];
  if (id === "spielerSchlagen") return studio.rival !== null && studio.rival.relationBp <= (g.maxRelationBp ?? 0);
  if (id === "engineImperium" && studio.ownEngineId === null && studio.archetype !== "engine") return false;
  return g.archetypes.includes(studio.archetype);
}

function newGoal(state: GameState, data: GameData, studio: AiStudio, id: RivalGoalId): RivalGoal {
  const base = id === "wachstum" ? Math.max(1, studioPeople(studio)) : 0;
  return { id, sinceWeek: state.week, deadlineWeek: state.week + R(data).goals[id].years * 52, genre: id === "genreFuehrer" ? studio.focusGenres[0] ?? studio.mainGenre : null, base, progress: [] };
}

/** KI-R15: 1–2 Ziele nach Archetyp und Lage; KI-T08: mindestens eines (sonst Wachstum). */
function fillGoals(state: GameState, data: GameData, studio: AiStudio, want: number): void {
  const r = studio.rival!;
  const rng = studioRng(state, studio);
  while (r.goals.length < Math.min(2, want)) {
    const open = GOALS.filter((id) => !r.goals.some((g) => g.id === id) && goalAllowed(data, studio, id));
    // ANNAHME: Ohne passendes Ziel (z. B. Engine-Firma ohne Markt-Engine) bleibt „Wachstum“.
    const id = open.length > 0 ? open[rng.int(open.length)]! : r.goals.some((g) => g.id === "wachstum") ? null : "wachstum";
    if (!id) break;
    r.goals.push(newGoal(state, data, studio, id));
  }
}

/** Anteil einer Engine an allen lizenzierten KI-Projekten. */
function engineShare(state: GameState, engineId: number | null): Bp {
  if (engineId === null) return 0;
  const licensed = state.ai.studios.flatMap((s) => s.teams.map((t) => t.project)).filter((p): p is AiProject => p !== null && p.contractId !== null);
  if (licensed.length === 0) return 0;
  return divBp(licensed.filter((p) => p.engineId === engineId).length, licensed.length, 1);
}

function goalReached(state: GameState, data: GameData, studio: AiStudio, g: RivalGoal): boolean {
  const p = R(data).goals[g.id];
  switch (g.id) {
    case "genreFuehrer": return (g.progress[0] ?? 0) >= (p.consecutiveYears ?? 2);
    case "engineImperium": return engineShare(state, studio.ownEngineId) >= (p.shareBp ?? BP_ONE);
    case "kritikerliebling": {
      // ANNAHME: gleitend über die letzten fünf Titel bis zur Frist.
      return g.progress.length >= (p.titles ?? 5) && divInt(sum(g.progress), g.progress.length, 1) >= (p.scoreBp ?? BP_ONE);
    }
    case "wachstum": return studioPeople(studio) >= mulBp(g.base, p.factorBp ?? 2 * BP_ONE);
    case "spielerSchlagen": return (g.progress[0] ?? 0) >= (p.quarters ?? 4);
  }
}

/** Quartalsprüfung der Ziele: erreicht → Schlagzeile (genau eine, KI-T08), Frist abgelaufen → goalFailures + 1. */
function checkGoals(state: GameState, data: GameData, studio: AiStudio): void {
  const r = studio.rival!;
  const keep: RivalGoal[] = [];
  for (const g of r.goals) {
    const reached = goalReached(state, data, studio, g);
    if (reached === true) {
      chronicle(state, "log.rival.goalReached", { studio: studio.name, goal: g.id });
      quote(state, data, studio, "ziel");
    } else if (state.week >= g.deadlineWeek) {
      r.chief.goalFailures += 1;
      chronicle(state, "log.rival.goalFailed", { studio: studio.name, goal: g.id });
    } else keep.push(g);
  }
  r.goals = keep;
  // KI-R17: Ein neues Ziel kommt auf der nächsten Konferenz; ohne jedes Ziel sofort (KI-T08: immer 1–2).
  if (r.goals.length === 0) fillGoals(state, data, studio, 1);
}

/** Nach einem Release eines Rivalen (Kritikerliebling zählt die nächsten Titel). */
export function rivalReleased(state: GameState, data: GameData, studio: AiStudio, scoreBp: Bp): void {
  const r = studio.rival;
  if (!r) return;
  for (const g of r.goals) if (g.id === "kritikerliebling") g.progress = [...g.progress, scoreBp].slice(-(R(data).goals.kritikerliebling.titles ?? 5));
  if (scoreBp >= R(data).copycat.hitScoreBp) quote(state, data, studio, "hit");
  else if (scoreBp < data.brands.flopScoreBp) quote(state, data, studio, "flop");
}

/** KI-R16: Zielbeitrag einer Projekt-Option (0 oder 10.000 bp, Kurve „Stufe“ bzw. linear). */
export function goalContribution(state: GameState, data: GameData, studio: AiStudio, c: Pick<AiCandidate, "genre" | "scope">, qualityRatioBp: Bp): Bp {
  const r = studio.rival;
  if (!r) return 0;
  let best = 0;
  for (const g of r.goals) {
    if (g.id === "genreFuehrer" && c.genre === g.genre) best = BP_ONE;
    if (g.id === "kritikerliebling" && qualityRatioBp >= BP_ONE) best = BP_ONE;
    if (g.id === "wachstum" && SCOPES.indexOf(c.scope) >= 1) best = BP_ONE;
    if (g.id === "spielerSchlagen" && c.genre === playerTopGenre(state)) best = BP_ONE;
  }
  return best;
}

/** KI-R13 mit Ziel: Der Genre-Führer hält sein Ziel-Genre als Schwerpunkt; KI-R22: Schlagzeile der Konferenz. */
export function rivalConference(state: GameState, data: GameData, studio: AiStudio): void {
  const r = studio.rival;
  if (!r) return;
  const g = r.goals.find((x) => x.id === "genreFuehrer");
  if (g?.genre && !studio.focusGenres.includes(g.genre)) studio.focusGenres = [g.genre, ...studio.focusGenres].slice(0, 2);
  fillGoals(state, data, studio, r.goals.length === 0 ? 1 : 2);
  chronicle(state, "log.rival.conference", { studio: studio.name, genre: studio.focusGenres[0] ?? studio.mainGenre });
}

// ---------- Beziehung und Gedächtnis (MRK-R46) ----------

export function remember(state: GameState, data: GameData, studio: AiStudio, event: keyof RivalParams["memory"], valueBp?: Bp): void {
  const r = studio.rival;
  if (!r || event === "maxEntries") return;
  const v = valueBp ?? R(data).memory[event];
  r.relationBp = clamp(r.relationBp + v, -BP_ONE, BP_ONE);
  r.memory = [...r.memory, { week: state.week, event, valueBp: v }].slice(-R(data).memory.maxEntries);
}

function decayRelation(data: GameData, studio: AiStudio): void {
  const r = studio.rival!;
  const p = R(data).relation;
  const rate = r.relationBp < 0 && studio.traits.includes("nachtragend") ? p.decayNachtragendBp : p.decayBp;
  r.relationBp -= mulBp(r.relationBp, rate);
}

// ---------- Stimmung und Chefwechsel (KI-R61 bis KI-R63) ----------

function moodOf(state: GameState, data: GameData, studio: AiStudio): RivalMood {
  const r = studio.rival!;
  const month = monthlyCost(state, data, studio);
  const quarters = studio.revenueByQuarter.slice(1, 5);
  const revenue = sum(quarters);
  const cost4 = 12 * month;
  if (revenue < cost4 && studio.cashCent < data.ai.considerations.savingsMonths * month) return "angeschlagen";
  const weak = quarters.slice(0, 2).filter((q) => q < 3 * month).length >= 2;
  const deadline = r.goals.some((g) => g.deadlineWeek - state.week <= 52);
  if (weak || deadline) return "unterDruck";
  const scores = studio.lastScores.length > 0 ? divInt(sum(studio.lastScores), studio.lastScores.length, 1) : 0;
  if (revenue >= mulBp(cost4, R(data).mood.confidentRevenueBp) && scores >= data.quality.scoreBaseBp) return "selbstbewusst";
  return "normal";
}

function maybeChangeChief(state: GameState, data: GameData, studio: AiStudio): void {
  const r = studio.rival!;
  const p = R(data).chiefChange;
  if (r.chief.goalFailures < p.goalFailures && r.angeschlagenQuarters < p.angeschlagenQuarters) return;
  if (studioRng(state, studio).uniformBp() >= p.chanceBp) return;
  const old = r.chief.name;
  const rng = stream(state, "welt");
  const pool = [...data.ai.traitsByArchetype[studio.archetype]];
  const traits: string[] = [];
  while (traits.length < 2 && pool.length > 0) traits.push(pool.splice(rng.int(pool.length), 1)[0]!);
  traits.sort();
  r.chief = { name: chiefName(data, rng), sinceWeek: state.week, goalFailures: 0 };
  r.angeschlagenQuarters = 0;
  studio.traits = traits;
  r.relationBp = divInt(r.relationBp, 2, 1);
  chronicle(state, "log.rival.chiefChange", { studio: studio.name, old, chief: r.chief.name });
  logDecision(data, studio, {
    week: state.week, domain: "chefwechsel", choice: r.chief.name, utilityBp: 0,
    reasons: [r.mood === "angeschlagen" ? "ai.reason.verluste" : "ai.reason.ziele", "ai.reason.stimmung"], viaGut: false,
  });
  // KI-R63: sofort eine außerordentliche Konferenz.
  holdConference(state, data, studio);
  quote(state, data, studio, "chefwechsel");
}

// ---------- Zitate (KI-R64) ----------

export function quote(state: GameState, data: GameData, studio: AiStudio, occasion: "hit" | "flop" | "gegenzug" | "ziel" | "chefwechsel"): void {
  const r = studio.rival;
  if (!r || r.lastQuoteMonth === monthIndex(state) || studio.traits.length === 0) return;
  void data;
  r.lastQuoteMonth = monthIndex(state);
  const trait = studio.traits[studioRng(state, studio).int(studio.traits.length)]!;
  chronicle(state, `quote.${trait}.${occasion}`, { studio: studio.name, chief: r.chief.name });
}

// ---------- Umsätze je Quartal und Genre (für 6.4, Ziele, Stimmung) ----------

/** Tick-Schritt 7 und 10: Umsatz einer Firma (0 = Spieler) in einem Genre buchen. */
export function bookGenreRevenue(state: GameState, firmId: number, genre: string, revenue: Cent): void {
  if (revenue === 0) return;
  const q = state.ai.quarterGenre;
  if (firmId === 0) q.player[genre] = (q.player[genre] ?? 0) + revenue;
  q.all[genre] = (q.all[genre] ?? 0) + revenue;
  const y = (state.ai.yearGenre[genre] ??= {});
  y[String(firmId)] = (y[String(firmId)] ?? 0) + revenue;
}

function playerTopGenre(state: GameState): string | null {
  const last = state.ai.playerShares[0]?.genre ?? {};
  let best: string | null = null;
  for (const g of Object.keys(last).sort()) if (best === null || last[g]! > last[best]!) best = g;
  return best;
}

function closeQuarter(state: GameState, data: GameData): void {
  const q = state.ai.quarterGenre;
  const genre: Record<string, Bp> = {};
  for (const g of Object.keys(q.all).sort()) if (q.all[g]! > 0) genre[g] = divBp(q.player[g] ?? 0, q.all[g]!, 1);
  const licensedShare = playerEngineShare(state);
  state.ai.playerShares = [{ genre, engine: licensedShare }, ...state.ai.playerShares].slice(0, R(data).threat.historyQuarters);
  state.ai.quarterGenre = { player: {}, all: {} };
}

function playerEngineShare(state: GameState): Bp {
  return engineShare(state, state.licensing.playerEngineId);
}

/** Genre-Führer des abgelaufenen Jahres (Zielkatalog „Genre-Führer“). */
export function closeYear(state: GameState, data: GameData): void {
  const leaders: Record<string, number> = {};
  for (const g of Object.keys(state.ai.yearGenre).sort()) {
    const firms = state.ai.yearGenre[g]!;
    let best = -1;
    let bestRevenue = 0;
    for (const id of Object.keys(firms).sort((a, b) => Number(a) - Number(b))) {
      if (firms[id]! > bestRevenue) {
        best = Number(id);
        bestRevenue = firms[id]!;
      }
    }
    if (best >= 0) leaders[g] = best;
  }
  state.ai.genreLeaders = [leaders, ...state.ai.genreLeaders].slice(0, 2);
  state.ai.yearGenre = {};
  for (const s of rivalStudios(state)) {
    for (const g of s.rival!.goals) if (g.id === "genreFuehrer" && g.genre) g.progress = [leaders[g.genre] === s.id ? (g.progress[0] ?? 0) + 1 : 0];
    decayRelation(data, s);
  }
}

// ---------- Bedrohung (KI-R42, Formel 6.4) ----------

function overlap(data: GameData, studio: AiStudio, genre: string): Bp {
  const t = R(data).threat;
  if (studio.focusGenres.includes(genre) || studio.rival?.goals.some((g) => g.genre === genre)) return t.overlapFocusBp;
  return studio.favGenres.includes(genre) ? t.overlapFavBp : t.overlapOtherBp;
}

function threatValue(share: Bp, old: Bp, overlapBp: Bp, relationBp: Bp): Bp {
  const growth = clamp(divBp(share - old, Math.max(old, divInt(BP_ONE, 10, 1)), 1), -BP_ONE, BP_ONE);
  return clamp(mulBp(mulBp(mulBp(share, BP_ONE + growth), overlapBp), BP_ONE + Math.max(0, -relationBp)), 0, BP_ONE);
}

/** T_d je Domäne; genre liefert auch das bedrohte Genre. */
export function threatOf(state: GameState, data: GameData, studio: AiStudio): { genre: Bp; engine: Bp; genreId: string | null } {
  const now = state.ai.playerShares[0];
  const old = state.ai.playerShares[4] ?? state.ai.playerShares[state.ai.playerShares.length - 1];
  const rel = studio.rival?.relationBp ?? 0;
  let genre = 0;
  let genreId: string | null = null;
  for (const g of Object.keys(now?.genre ?? {}).sort()) {
    const v = threatValue(now!.genre[g]!, old?.genre[g] ?? 0, overlap(data, studio, g), rel);
    if (v > genre) {
      genre = v;
      genreId = g;
    }
  }
  // ANNAHME: Im Engine-Markt ist nur ein Akteur mit eigener Engine im Markt betroffen (Überschneidung 1,0, sonst 0).
  const own = engineById(state, studio.ownEngineId);
  const engine = own && !own.closed && now ? threatValue(now.engine, old?.engine ?? 0, BP_ONE, rel) : 0;
  return { genre, engine, genreId };
}

function counterQuota(state: GameState, data: GameData, studio: AiStudio): number {
  const base = difficulty(state, data).countersPerYear;
  if (base === 0) return 0;
  const c = R(data).counters;
  return Math.max(0, base + (studio.traits.includes("nachtragend") ? c.extraNachtragend : 0) - (studio.traits.includes("diplomat") ? c.lessDiplomat : 0));
}

function threshold(data: GameData, studio: AiStudio): Bp {
  // Tabelle 6.9: „Nachtragend“ antwortet auch auf geringe Bedrohung (ANNAHME: halbe Schwelle).
  const t = R(data).threat.thresholdBp;
  return studio.traits.includes("nachtragend") ? divInt(t, 2, 1) : t;
}

export function quarterStep(state: GameState, data: GameData): void {
  closeQuarter(state, data);
  const reaction = difficulty(state, data).reactionWeeks;
  for (const s of liveStudios(state)) s.revenueByQuarter = [0, ...s.revenueByQuarter].slice(0, 8);
  for (const s of rivalStudios(state)) {
    const r = s.rival!;
    r.relationHistory = [...r.relationHistory, r.relationBp].slice(-R(data).relation.historyQuarters);
    const t = threatOf(state, data, s);
    r.threat = { genre: t.genre, engine: t.engine };
    for (const d of DOMAINS) {
      // KI-R41: Die Reaktion folgt nach der Reaktionszeit der Stufe; unter der Schwelle verfällt sie.
      if (r.threat[d] >= threshold(data, s)) r.reactAtWeek[d] ??= state.week + reaction;
      else r.reactAtWeek[d] = null;
    }
    const before = r.mood;
    r.mood = moodOf(state, data, s);
    r.angeschlagenQuarters = r.mood === "angeschlagen" ? r.angeschlagenQuarters + 1 : 0;
    if (before !== r.mood && r.mood !== "normal") chronicle(state, "log.rival.mood", { studio: s.name, chief: r.chief.name, mood: r.mood });
    checkGoals(state, data, s);
    maybeChangeChief(state, data, s);
    // Den Spieler schlagen: Quartale mit mehr Umsatz als der Spieler.
    for (const g of r.goals) if (g.id === "spielerSchlagen" && (s.revenueByQuarter[1] ?? 0) > (state.ai.playerRevenueByQuarter[1] ?? 0)) g.progress = [(g.progress[0] ?? 0) + 1];
  }
  state.ai.playerRevenueByQuarter = [0, ...state.ai.playerRevenueByQuarter].slice(0, 8);
}

// ---------- Gegenzüge (KI-R43 bis KI-R46, MRK-R52) ----------

function counterAllowed(state: GameState, data: GameData, studio: AiStudio): boolean {
  const y = yearOf(state);
  const r = studio.rival!;
  if (r.counters.year !== y) r.counters = { year: y, n: 0 };
  if (state.ai.countersAll.year !== y) state.ai.countersAll = { year: y, n: 0 };
  return r.counters.n < counterQuota(state, data, studio)
    && state.ai.countersAll.n < R(data).counters.allActorsFactor * difficulty(state, data).countersPerYear;
}

export function counterStep(state: GameState, data: GameData): void {
  const aggression = difficulty(state, data).aggressionBp;
  for (const s of rivalStudios(state)) {
    const r = s.rival!;
    for (const d of DOMAINS) {
      const at = r.reactAtWeek[d];
      if (at === null || at > state.week) continue;
      r.reactAtWeek[d] = null;
      if (r.threat[d] < threshold(data, s) || !counterAllowed(state, data, s)) continue;
      const done = d === "genre" ? genreCounter(state, data, s) : engineCounter(state, data, s);
      if (!done) continue;
      r.counters.n += 1;
      state.ai.countersAll.n += 1;
      const reasons = ["ai.reason.bedrohung", d === "genre" ? "ai.reason.genreAnteil" : "ai.reason.engineAnteil"];
      if (s.traits.includes("nachtragend")) reasons.push("ai.reason.nachtragend");
      logDecision(data, s, { week: state.week, domain: "gegenzug", choice: done, utilityBp: mulBp(r.threat[d], divInt(aggression, 2, 1)), reasons, viaGut: false });
      quote(state, data, s, "gegenzug");
    }
  }
}

/** Gegenzug Genre: Konkurrenztitel im Genre des Spielers (Tabelle 6.5); das nächste freie Team nimmt es. */
function genreCounter(state: GameState, data: GameData, studio: AiStudio): string | null {
  if (studio.teams.length === 0 || studio.forced) return null;
  const genre = threatOf(state, data, studio).genreId;
  if (!genre) return null;
  const last = [...state.projects].filter((p) => p.genre === genre && p.result).sort((a, b) => b.result!.week - a.result!.week || b.id - a.id)[0];
  studio.forced = { genre, theme: null, fromWeek: state.week, copyOf: null };
  chronicle(state, "log.rival.counterGenre", { studio: studio.name, genre, project: last?.title ?? "" });
  return `genre:${genre}`;
}

/** Gegenzug Engine-Markt: Royalty −1 bis −3 Punkte (Tabelle 6.5, MRK-R49). */
function engineCounter(state: GameState, data: GameData, studio: AiStudio): string | null {
  const e = engineById(state, studio.ownEngineId);
  if (!e || e.closed) return null;
  const c = R(data).counters;
  const cut = cutRoyalty(e, studioRng(state, studio).range(c.royaltyCutMinBp, c.royaltyCutMaxBp));
  if (cut === 0) return null;
  chronicle(state, "log.rival.counterEngine", { studio: studio.name, engine: e.name, royalty: cut });
  return `royalty:-${cut}`;
}

function cutRoyalty(e: MarketEngine, cutBp: Bp): Bp {
  let applied = 0;
  for (const tpl of Object.values(e.templates)) {
    if (!tpl || tpl.royaltyBp === 0) continue;
    const c = Math.min(cutBp, tpl.royaltyBp);
    tpl.royaltyBp -= c;
    applied = Math.max(applied, c);
  }
  return applied;
}

// ---------- Engine-Kampf und Gedächtnis aus dem Lizenzmarkt (MRK-R49) ----------

/** Ein KI-Studio wechselt die Engine: vom Rivalen zum Spieler oder umgekehrt. */
export function customerSwitched(state: GameState, data: GameData, oldEngine: MarketEngine | undefined, newEngine: MarketEngine | undefined): void {
  if (!oldEngine || !newEngine || oldEngine.id === newEngine.id) return;
  const oldOwner = state.ai.studios.find((s) => s.id === oldEngine.ownerId);
  const newOwner = state.ai.studios.find((s) => s.id === newEngine.ownerId);
  if (newEngine.ownerId === 0 && oldOwner) {
    if (oldOwner.rival) remember(state, data, oldOwner, "licenseWon");
    // MRK-R49: Ein Engine-Riese senkt seine Royalty um 1–2 Punkte.
    if (oldEngine.style === "riese" && !oldEngine.closed) {
      const f = R(data).engineFight;
      const cut = cutRoyalty(oldEngine, studioRng(state, oldOwner).range(f.cutMinBp, f.cutMaxBp));
      if (cut > 0) chronicle(state, "log.rival.engineFight", { studio: oldOwner.name, engine: oldEngine.name, royalty: cut });
    }
  }
  if (oldEngine.ownerId === 0 && newOwner?.rival) remember(state, data, newOwner, "licenseLost");
}

// ---------- Nachahmer (KI-R47 bis KI-R49, Formel 6.6) ----------

function affinity(data: GameData, studio: AiStudio, genre: string): Bp {
  const c = R(data).copycat;
  if (studio.focusGenres.includes(genre)) return c.affinityFocusBp;
  return studio.favGenres.includes(genre) ? c.affinityFavBp : c.affinityOtherBp;
}

/**
 * p_i = p₀ · Affinität · (1 − Sättigung) · (1 + max(0, −B)/100).
 * ANNAHME: Die Sättigung zählt angekündigte Titel mit Genre und Thema des Hits; mit allen Titeln des Genres wäre sie
 * bei rund 50 Studios und sechs Genres immer voll und es gäbe nie Nachahmer (KI-T06).
 */
export function copycatChance(state: GameState, data: GameData, studio: AiStudio, genre: string, theme: string): Bp {
  const c = R(data).copycat;
  const announced = state.ai.studios.reduce((n, s) => n + s.teams.filter((t) => t.project?.genre === genre && t.project.theme === theme).length, 0);
  const saturation = Math.min(BP_ONE, divBp(announced, c.saturationTitles, 1));
  const rel = studio.rival?.relationBp ?? 0;
  return mulBp(mulBp(mulBp(difficulty(state, data).copycatChanceBp, affinity(data, studio, genre)), BP_ONE - saturation), BP_ONE + Math.max(0, -rel));
}

export function rollCopycats(state: GameState, data: GameData, p: Project): void {
  const max = difficulty(state, data).copycatsPerHit;
  state.ai.copycats[String(p.id)] = 0;
  if (max === 0) return;
  const c = R(data).copycat;
  let n = 0;
  for (const s of liveStudios(state)) {
    if (n >= max) break;
    if (s.teams.length === 0 || s.forced) continue;
    const rng = studioRng(state, s);
    if (rng.uniformBp() >= copycatChance(state, data, s, p.genre, p.theme)) continue;
    s.forced = { genre: p.genre, theme: p.theme, fromWeek: state.week + rng.range(c.announceMinWeeks, c.announceMaxWeeks), copyOf: p.id };
    n += 1;
  }
  state.ai.copycats[String(p.id)] = n;
  // KI-R49: Das Original bekommt +5 % Fanbindung für den nächsten Teil (ANNAHME: sofort auf die Fans der Marke).
  const brand = p.brandId === null ? undefined : state.brands.find((b) => b.id === p.brandId);
  if (n > 0 && brand) for (const k of Object.keys(brand.fans).sort()) brand.fans[k] = mulBp(brand.fans[k]!, c.originalFansBp);
}

/** Projekt eines erzwungenen Gegenzugs oder Nachahmers ist gestartet: Schlagzeile (KI-R46, KI-R48) und Protokoll. */
export function forcedStarted(state: GameState, data: GameData, studio: AiStudio, project: AiProject, utilityBp: Bp): void {
  const f = studio.forced!;
  studio.forced = null;
  project.copyOf = f.copyOf;
  if (f.copyOf === null) return;
  const original = state.projects.find((p) => p.id === f.copyOf);
  chronicle(state, "log.rival.copycat", { studio: studio.name, genre: project.genre, theme: project.theme, project: original?.title ?? "" });
  logDecision(data, studio, {
    week: state.week, domain: "nachahmer", choice: `${project.genre}/${project.theme}`, utilityBp,
    reasons: ["ai.reason.hitDesSpielers", "ai.reason.trend"], viaGut: false,
  });
}

/** KI-R49: Nachfrage-Faktor eines Nachahmers beim Release. */
export function copycatDemand(state: GameState, data: GameData, project: AiProject, qualityQ: Bp): Bp {
  if (project.copyOf === null) return BP_ONE;
  const c = R(data).copycat;
  const original = state.projects.find((p) => p.id === project.copyOf);
  if (!original?.result || state.week - original.result.week > c.windowWeeks) return BP_ONE;
  return qualityQ > original.result.quality.q ? c.betterBp : c.penaltyBp;
}

// ---------- Release-Duell (MRK-R47) ----------

function bigPlayerRelease(state: GameState, data: GameData): Project | undefined {
  const w = R(data).duel.windowWeeks;
  const min = SCOPES.indexOf(R(data).duel.minScope);
  return [...state.projects].sort((a, b) => a.id - b.id).find((p) => SCOPES.indexOf(p.scope) >= min
    && (p.status === "bereit" || (p.result !== null && state.week - p.result.week <= w)));
}

/** Vor dem Release eines Rivalen-Titels: true = diese Woche zurückhalten. */
export function duelHold(state: GameState, data: GameData, studio: AiStudio, p: AiProject): boolean {
  const r = studio.rival;
  if (!r) return false;
  const d = R(data).duel;
  if (p.duel === "keins") {
    const x = bigPlayerRelease(state, data);
    if (!x) return false;
    p.duel = "geprueft";
    const rng = studioRng(state, studio);
    if (r.relationBp <= R(data).relation.grudgeBp && rng.uniformBp() < d.chanceBp) {
      p.duel = "duell";
      p.duelWith = x.id;
      // Warten auf den Termin des Spielers ist eine Verschiebung und kostet 10 % Interesse (S05 MKT-R12).
      if (!x.result) {
        p.holdUntilWeek = state.week + d.windowWeeks;
        p.interest = mulBp(p.interest ?? 0, BP_ONE - d.shiftCostBp);
        // S05 Abschnitt 9: „Konkurrent legt Release auf deine Woche“ als Entscheidung für den Spieler.
        addEvent(state, data, {
          kind: "releaseDuell", scope: "projekt", projectId: x.id, options: ["halten", "verschieben", "marketing"], defaultOption: "halten",
          duel: { studioId: studio.id, week: x.releasePlan?.week ?? state.week },
        });
      }
      chronicle(state, "log.rival.duel", { studio: studio.name, project: x.title });
      logDecision(data, studio, { week: state.week, domain: "duell", choice: x.title, utilityBp: 0, reasons: ["ai.reason.groll", "ai.reason.dichte"], viaGut: false });
    } else if (r.relationBp >= R(data).relation.respectBp) {
      p.duel = "ausgewichen";
      p.holdUntilWeek = state.week + d.dodgeWeeks;
      p.interest = mulBp(p.interest ?? 0, BP_ONE - d.shiftCostBp);
      chronicle(state, "log.rival.dodge", { studio: studio.name, project: x.title });
      logDecision(data, studio, { week: state.week, domain: "duell", choice: "ausweichen", utilityBp: 0, reasons: ["ai.reason.respekt", "ai.reason.dichte"], viaGut: false });
    }
  }
  if (state.week >= p.holdUntilWeek) return false;
  if (p.duel === "duell") return !state.projects.find((x) => x.id === p.duelWith)?.result;
  return p.duel === "ausgewichen";
}

/** Ausgang des Duells beim Release des Rivalen (der Spieler-Titel ist dann draußen): Gedächtnis. */
export function duelResult(state: GameState, data: GameData, studio: AiStudio, duelWith: number | null, scoreBp: Bp): void {
  if (duelWith === null || !studio.rival) return;
  const x = state.projects.find((p) => p.id === duelWith);
  if (!x?.result) return;
  const playerWon = x.result.scoreBp > scoreBp;
  remember(state, data, studio, playerWon ? "duelWon" : "duelLost");
  chronicle(state, playerWon ? "log.rival.duelLost" : "log.rival.duelWon", { studio: studio.name, project: x.title });
}

// ---------- Kooperation (MRK-R50, KI-R50) ----------

function cooperationStep(state: GameState, data: GameData): void {
  const threshold = difficulty(state, data).cooperationThreshold * 100;
  for (const s of rivalStudios(state)) {
    // Einmal im Jahr, nach Firmen-ID gestaffelt.
    if (dateOf(state.startYear, state.week).weekOfYear !== 20 + (s.id % 8)) continue;
    const need = threshold + (s.traits.includes("diplomat") ? R(data).cooperationDiplomatBp : 0);
    if (s.rival!.relationBp < need) continue;
    // ANNAHME: Co-Publishing kommt mit den Publisher-Verträgen (Etappe 6a); bis dahin bietet nur ein Rivale mit
    // eigener Engine im Markt eine Lizenz zum Freundschaftspreis an.
    const e = engineById(state, s.ownEngineId);
    if (!e || e.closed || state.licensing.contracts.some((c) => c.engineId === e.id && c.licenseeId === 0 && c.status !== "beendet")) continue;
    const template = offeredTemplates(state, data, e).includes("standard") ? "standard" : offeredTemplates(state, data, e)[0];
    if (!template) continue;
    const terms = offerTerms(e, template);
    terms.royaltyBp = mulBp(terms.royaltyBp, BP_ONE - R(data).cooperationDiscountBp);
    terms.flatFeeCent = mulBp(terms.flatFeeCent, BP_ONE - R(data).cooperationDiscountBp);
    addEvent(state, data, {
      kind: "kooperation", scope: "welt", projectId: null, options: ["annehmen", "ablehnen"], defaultOption: "ablehnen",
      license: { engineId: e.id, studioId: s.id, template, terms, contractId: null, perYearCent: 0, genre: "" },
    });
    logDecision(data, s, { week: state.week, domain: "kooperation", choice: e.name, utilityBp: s.rival!.relationBp, reasons: ["ai.reason.beziehung", "ai.reason.engineAnteil"], viaGut: false });
    chronicle(state, "log.rival.cooperation", { studio: s.name, engine: e.name });
  }
}

export function applyCooperation(state: GameState, data: GameData, info: LicenseEventData, option: string): void {
  const s = state.ai.studios.find((x) => x.id === info.studioId);
  const e = engineById(state, info.engineId);
  if (option !== "annehmen" || !s || s.closedWeek !== null || !e || e.closed) return;
  createContract(state, data, e, 0, info.template, structuredClone(info.terms));
  remember(state, data, s, "cooperation");
}

// ---------- Tick ----------

/** Tick-Schritt 3: Nachrücker, Quartal (Bedrohung, Stimmung, Ziele, Chef), Jahr (Abklingen, Genre-Führer), Gegenzüge. */
export function rivalStep(state: GameState, data: GameData): void {
  if (!state.ai.generated) return;
  if (isFirstWeekOfYear(state.week) && state.week > 0) closeYear(state, data);
  if (isFirstWeekOfQuarter(state.week) && state.week > 0) quarterStep(state, data);
  replaceRivals(state, data);
  counterStep(state, data);
  cooperationStep(state, data);
}

/** Tick-Schritt 6: Hits des Spielers in dieser Woche rufen Nachahmer (KI-R47). */
export function rivalReleaseStep(state: GameState, data: GameData): void {
  for (const p of [...state.projects].sort((a, b) => a.id - b.id)) {
    if (p.result?.week !== state.week || p.status !== "veroeffentlicht") continue;
    if (p.result.scoreBp >= R(data).copycat.hitScoreBp && state.ai.copycats[String(p.id)] === undefined) rollCopycats(state, data, p);
  }
}

/** Umsatz eines KI-Studios im laufenden Quartal (Stimmung, „Den Spieler schlagen“). */
export function bookStudioQuarter(studio: AiStudio, revenue: Cent): void {
  studio.revenueByQuarter[0] = (studio.revenueByQuarter[0] ?? 0) + revenue;
}
