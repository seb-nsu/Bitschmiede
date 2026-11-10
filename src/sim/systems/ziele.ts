// S10 Meilensteine, Ruhmeshalle und langfristige Ziele (ZIE-R01, ZIE-R02, ZIE-R06).
// ANNAHME: Die Bedingungen stehen je Meilenstein im Code (eine Bedingungssprache für Ziele gibt es noch nicht);
// Schwellen kommen aus data/base/core/goals.json. Meilensteine geben keinen Bonus, nur Moment und Chronik.
import { BP_ONE } from "../num";
import type { GameData, GameState, LongTermGoal, MilestoneDef, Project } from "../model/types";
import { dateOf, isFirstWeekOfMonth, isFirstWeekOfYear } from "../calendar";
import { chronicle } from "./katalog";
import { log } from "./firma";
import { ranking } from "./ki/rangliste";
import { liveStudios } from "./ki/studios";

const PLAYER = 0;

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

function releasedGames(state: GameState): Project[] {
  return state.projects.filter((p) => p.status === "veroeffentlicht" && p.result);
}

/** ZIE-R06: Startwert des langfristigen Ziels aus den Einstellungen. */
export function initialGoal(data: GameData, id: string | null | undefined): LongTermGoal | null {
  return id && data.goals.longTermGoals.includes(id) ? { id, status: "offen", week: null } : null;
}

/** ZIE-R01: Meilenstein einmal festhalten, mit Moment (Protokoll) und Chronik. */
export function reachMilestone(state: GameState, id: string): void {
  if (state.milestones[id] !== undefined) return;
  state.milestones[id] = state.week;
  chronicle(state, "log.milestone", { id });
  log(state, "log.milestone", { id });
}

function playerLicenses(state: GameState): { aaa: boolean; any: boolean } {
  const engine = state.licensing.playerEngineId;
  const sold = state.licensing.contracts.filter((c) => c.engineId === engine && c.licenseeId !== PLAYER);
  const aaa = sold.some((c) => state.ai.studios.find((s) => s.id === c.licenseeId)?.archetype === "aaa");
  return { aaa, any: sold.length > 0 };
}

function brandGenres(state: GameState): number {
  let best = 0;
  for (const b of state.brands.filter((x) => x.ownerId === PLAYER)) {
    const genres = new Set(state.projects.filter((p) => p.brandId === b.id && p.status === "veroeffentlicht").map((p) => p.genre));
    best = Math.max(best, genres.size);
  }
  return best;
}

function futureWeek(state: GameState, m: MilestoneDef): number {
  return ((m.fromYear ?? state.startYear) - state.startYear) * 52;
}

/** Wöchentlich prüfbare Meilensteine; teure Prüfungen (Rangliste) nur zum Jahreswechsel. */
function check(state: GameState, data: GameData, m: MilestoneDef): boolean {
  const games = releasedGames(state);
  switch (m.id) {
    case "ersterRelease":
      return games.length > 0;
    case "ersterHit":
    case "ersteNeun":
      return games.some((p) => p.result!.scoreBp >= m.scoreBp!);
    case "ersteEngine":
      return state.engine !== null;
    case "ersteLizenz":
      return playerLicenses(state).any;
    case "ersteLizenzAaa":
      return playerLicenses(state).aaa;
    case "markeDreiGenres":
      return brandGenres(state) >= m.count!;
    case "launchTitel":
      return games.some((p) => p.result!.launchTitle === true);
    case "mmoZehnJahre":
      // ZIE-R02: ein MMO des Spielers läuft seit zehn Jahren und ist nicht eingestellt.
      return state.projects.some((p) => p.ops?.live?.kind === "mmo" && p.ops.live.shutdownWeek === null && p.result !== null
        && state.week - p.result.week >= m.weeks!);
    case "hundertMitarbeiter":
      return state.people.length >= m.count!;
    case "campus":
      return state.office.id.startsWith("campus");
    // ZIE-R02 (Etappe 6b.6): Börsengang, erste Übernahme, Integration ohne Abwanderung.
    case "boersengang":
      return state.stock.listed;
    case "ersteUebernahme":
      return state.ai.studios.some((x) => x.parent?.ownerId === 0);
    case "integration":
      return state.ai.studios.some((x) => x.parent?.ownerId === 0 && x.parent.integration.progressBp >= BP_ONE && x.parent.leftCount === 0);
    case "branchenfuehrer":
      return isFirstWeekOfYear(state.week) && ranking(state, data, "")[0]?.player === true && games.length > 0;
    case "nieEigeneEngine":
      return isFirstWeekOfYear(state.week) && yearOf(state) > m.year! && !state.milestones["ersteEngine"]
        && ranking(state, data, "").findIndex((e) => e.player) < m.count!;
    // ZIE-R07: Ziele der Zukunftsepoche (ANNAHME zu den Messgrößen, siehe OFFENE-FRAGEN Etappe 6a).
    case "engineStandardZukunft":
      return engineLeader(state);
    case "plattformDerZukunft":
      return games.filter((p) => p.result!.week >= futureWeek(state, m) && p.result!.scoreBp >= m.scoreBp!
        && p.platforms.some((x) => m.platforms!.includes(x))).length >= m.count!;
    case "filmFranchise":
      return isFirstWeekOfMonth(state.startYear, state.week)
        && state.chronicle.some((c) => c.key === "chronicle.info" && c.params.id === "filmErfolg" && c.week >= futureWeek(state, m));
    case "groessterKonzernZukunft":
      return isFirstWeekOfYear(state.week) && liveStudios(state).length > 0 && ranking(state, data, "")[0]?.player === true;
    default:
      // Engine des Jahres, Studio des Jahres: über die Branchenpreise (4.10).
      return false;
  }
}

/** Tick-Schritt 13: Meilensteine und langfristiges Ziel prüfen. */
export function goalStep(state: GameState, data: GameData): void {
  for (const m of data.goals.milestones) {
    if (m.later || state.milestones[m.id] !== undefined || (m.fromYear !== undefined && yearOf(state) < m.fromYear)) continue;
    if (check(state, data, m)) reachMilestone(state, m.id);
  }
  goalProgress(state, data);
}

function setGoal(state: GameState, status: "erreicht" | "verfehlt"): void {
  const g = state.goal;
  if (!g || g.status !== "offen") return;
  g.status = status;
  g.week = state.week;
  chronicle(state, status === "erreicht" ? "log.goalReached" : "log.goalFailed", { id: g.id });
  log(state, status === "erreicht" ? "log.goalReached" : "log.goalFailed", { id: g.id });
}

/**
 * ZIE-R06 (ANNAHME zu den Messgrößen): Engine-Marktführer = die eigene Engine hat die meisten laufenden Lizenzen;
 * größte Marke = eine eigene Marke hat die meisten Fans aller Marken; größter Konzern = Platz 1 der Rangliste nach
 * Umsatz (Konzerne kommen mit Etappe 6b); unabhängig = bis Ende 2040 keine eigene Marke verkauft (Börse folgt mit 6b).
 */
function goalProgress(state: GameState, data: GameData): void {
  const g = state.goal;
  if (!g || g.status !== "offen" || !isFirstWeekOfMonth(state.startYear, state.week)) return;
  switch (g.id) {
    case "engineMarktfuehrer":
      if (engineLeader(state)) setGoal(state, "erreicht");
      break;
    case "groessteMarke": {
      const fans = (b: (typeof state.brands)[number]) => Object.values(b.fans).reduce((s, v) => s + v, 0);
      const sorted = [...state.brands].sort((a, b) => fans(b) - fans(a) || a.id - b.id);
      if (sorted[0] && sorted[0].ownerId === PLAYER && fans(sorted[0]) > 0) setGoal(state, "erreicht");
      break;
    }
    case "groessterKonzern":
      if (isFirstWeekOfYear(state.week) && liveStudios(state).length > 0 && ranking(state, data, "")[0]?.player === true) setGoal(state, "erreicht");
      break;
    case "unabhaengig":
      if (yearOf(state) > data.goals.goalEndYear) setGoal(state, "erreicht");
      break;
  }
}

/** Die eigene Engine hat mehr laufende Lizenzen als jede andere (Ziel und Szenario „Vom Lizenznehmer zum Anbieter“). */
export function engineLeader(state: GameState): boolean {
  const counts = new Map<number, number>();
  for (const c of state.licensing.contracts) if (c.status !== "beendet") counts.set(c.engineId, (counts.get(c.engineId) ?? 0) + 1);
  const own = state.licensing.playerEngineId;
  const mine = own === null ? 0 : counts.get(own) ?? 0;
  return mine > 0 && [...counts.entries()].every(([id, n]) => id === own || n < mine);
}

/** ZIE-R06, ZIE-T15: Der Verkauf einer eigenen Marke beendet „unabhängig bleiben“; Auslizenzieren nicht. */
export function onBrandSold(state: GameState): void {
  if (state.goal?.id === "unabhaengig") setGoal(state, "verfehlt");
}

/** Ruhmeshalle: die besten eigenen Spiele nach Wertung, dazu Engine und Momente (Meilensteine). */
export function hallOfFame(state: GameState, data: GameData): { games: Project[]; milestones: [string, number][] } {
  const games = [...releasedGames(state)].sort((a, b) => b.result!.scoreBp - a.result!.scoreBp || a.result!.week - b.result!.week || a.id - b.id)
    .slice(0, data.goals.hallOfFameSize);
  const milestones = Object.entries(state.milestones).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
  return { games, milestones };
}
