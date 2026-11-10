import { loadBaseData } from "../src/mods/loadBase";
import { DEFAULT_SETTINGS, newGame } from "../src/sim/game";
import { tick } from "../src/sim/tick";
import type { CreateProjectInput, GameData, GameState, Project, Settings } from "../src/sim/model/types";
import { AREAS } from "../src/sim/model/types";

export const SEED_A = "00000000000000a1";
export const SEED_B = "0123456789abcdef";

/** Veränderbare Kopie der Grunddaten für Tests mit eigenen Datensätzen. */
export function testData(): GameData {
  return structuredClone(loadBaseData());
}

/**
 * Spiel mit neutraler Welt: Passung und Trends 1,0, Erwartungsprofile wie in den Daten, alle Personen überall 45.
 * Friert außerdem die Trendbewegung ein, setzt den Epochen-Faktor der Presse auf 1,0 und schaltet kritischen Bug und Ereigniskatalog ab (in den übergebenen Testdaten).
 */
export function neutralGame(data: GameData, seed = SEED_A, settings: Partial<Settings> = {}): GameState {
  data.trends.monthlySdBp = 0;
  data.trends.meanReversionBp = 0;
  data.events.criticalBug.chanceBp = 0;
  data.catalog.chancePerWeekBp = 0;
  // Balancing 1.0: ohne Epochen-Faktor der Presse (neutrale Erwartung).
  data.quality.pressEraAnchors = [[1980, 10000]];
  const s = newGame(data, seed, { ...DEFAULT_SETTINGS, pressRandom: "aus", ...settings });
  for (const g of data.genres) {
    s.world.expectedProfile[g.id] = { ...g.expectedProfile };
    for (const t of data.themes) s.world.themeFit[g.id]![t.id] = 10000;
    s.trends.genre[g.id] = 10000;
  }
  for (const t of data.themes) s.trends.theme[t.id] = 10000;
  for (const p of s.people) for (const a of AREAS) p.strength[a] = 45;
  return s;
}

/** Projekt-Eingabe; ohne Angabe beginnen beide Gründer (Personen 1 und 2). */
export function input(over: Partial<CreateProjectInput> = {}): CreateProjectInput {
  return {
    type: "createProject", title: "Test", genre: "action", theme: "scifi", scope: "klein",
    features: ["grosseSprites", "levelVielfalt", "titelmelodie"], people: [1, 2], platforms: ["fuchs"], ...over,
  };
}

export function lastProject(state: GameState): Project {
  return state.projects[state.projects.length - 1]!;
}

/** Läuft, bis die Produktion des Projekts fertig ist. */
export function untilReady(state: GameState, data: GameData, id: number): GameState {
  let s = state;
  let guard = 0;
  while (s.projects.find((p) => p.id === id)!.status === "laeuft") {
    s = tick(s, data);
    if (guard++ > 600) throw new Error("Projekt wird nicht fertig");
  }
  return s;
}

/** Spielt ein Projekt bis zum Release mit der angegebenen Testzeit nach der Produktion. */
export function playProject(state: GameState, data: GameData, inp: CreateProjectInput, polishWeeks = 3): GameState {
  let s = tick(state, data, [inp]);
  const id = lastProject(s).id;
  s = untilReady(s, data, id);
  for (let i = 0; i < polishWeeks; i++) s = tick(s, data);
  return tick(s, data, [{ type: "release", projectId: id }]);
}
