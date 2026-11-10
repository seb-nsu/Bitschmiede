// Anzeigemodell der Bühne (S11 UI-R70, Abschnitt 8.3): Kulisse nach Grundriss und Epoche, Tische je Projekt mit Schild
// und Fortschritt, Figuren mit Zustand, Schlüsselpersonen mit Porträt und Requisiten als Symptome der Simulation.
import { type Bp, divInt, mulBp } from "../num";
import type { GameData, GameState, Person } from "../model/types";
import { dateOf } from "../calendar";
import { hardwareFactor, officeDef, officePlaces } from "../systems/buero";
import { crunchingPeople } from "../systems/personal";

export interface StageFigure {
  id: number;
  name: string;
  /** Rolle der Schlüsselperson (Porträt) oder null. */
  keyRole: string | null;
  tired: boolean;
  happy: boolean;
  crunch: boolean;
}

export interface StageTable {
  kind: "project" | "contract" | "engine" | "frei";
  /** Projekt-Schild: Titel des Projekts bzw. leer für Auftrag, Engine und freie Plätze. */
  label: string;
  team: string | null;
  progressBp: Bp | null;
  /** 4b.2: Monitor am Projekttisch zeigt offene Bugs; Genre für das Symbol am Schild. */
  bugs: number | null;
  genre: string | null;
  figures: StageFigure[];
}

export interface StageView {
  layout: string;
  office: string;
  epoch: string;
  places: number;
  tables: StageTable[];
  /** Figuren über der Höchstzahl (UI: „+n“). */
  hidden: number;
  props: {
    crunch: boolean;
    burnout: number;
    /** Tempo der Hardware in Prozent, wenn sie veraltet ist (Röhrenmonitore, Statusblase). */
    oldHardwarePct: number | null;
    /** Zusatztische im Gang bei Überbelegung. */
    extraDesks: number;
    rooms: string[];
    boxes: boolean;
    hit: boolean;
  };
}

function figure(data: GameData, p: Person, crunch: Set<number>): StageFigure {
  const s = data.stage;
  return {
    id: p.id, name: p.name, keyRole: p.key?.role ?? null, tired: p.burnoutBp >= s.tiredBurnoutBp, happy: p.moraleBp >= s.happyMoraleBp, crunch: crunch.has(p.id),
  };
}

export function stageView(state: GameState, data: GameData): StageView {
  const s = data.stage;
  const year = dateOf(state.startYear, state.week).year;
  const epoch = [...s.epochs].reverse().find((e) => year >= e.from)?.id ?? s.epochs[0]!.id;
  const crunch = crunchingPeople(state, data);
  const people = [...state.people].sort((a, b) => a.id - b.id);
  const shown = people.slice(0, s.maxFigures);
  const tables: StageTable[] = [];
  const team = (ids: number[]) => {
    const t = state.staff.teams.find((x) => ids.length > 0 && ids.every((id) => state.people.find((p) => p.id === id)?.teamId === x.id));
    return t?.name ?? null;
  };
  for (const pr of [...state.projects].filter((p) => p.status === "laeuft" || p.status === "bereit").sort((a, b) => a.id - b.id)) {
    const crew = shown.filter((p) => p.assignment?.kind === "project" && p.assignment.id === pr.id);
    tables.push({
      kind: "project", label: pr.title, team: team(crew.map((p) => p.id)), progressBp: divInt(pr.effortDoneBp * 10000, Math.max(1, pr.effortTotalBp), 1),
      bugs: pr.bugHistory[pr.bugHistory.length - 1] ?? 0, genre: pr.genre,
      figures: crew.map((p) => figure(data, p, crunch)),
    });
  }
  const contract = shown.filter((p) => p.assignment?.kind === "contract");
  if (contract.length > 0) tables.push({ kind: "contract", label: "", team: null, progressBp: null, bugs: null, genre: null, figures: contract.map((p) => figure(data, p, crunch)) });
  const engine = shown.filter((p) => p.assignment?.kind === "engine");
  if (engine.length > 0) tables.push({ kind: "engine", label: "", team: team(engine.map((p) => p.id)), progressBp: null, bugs: null, genre: null, figures: engine.map((p) => figure(data, p, crunch)) });
  const free = shown.filter((p) => p.assignment === null);
  if (free.length > 0) tables.push({ kind: "frei", label: "", team: null, progressBp: null, bugs: null, genre: null, figures: free.map((p) => figure(data, p, crunch)) });

  const def = officeDef(data, state.office.id);
  const places = officePlaces(state, data);
  const h = hardwareFactor(data, state.office.hardware.level, state.office.hardware.year, year);
  const sales = state.projects.filter((p) => p.sales && !p.sales.ended).map((p) => p.sales!);
  return {
    layout: def.layout, office: state.office.id, epoch, places, tables, hidden: Math.max(0, people.length - s.maxFigures),
    props: {
      crunch: crunch.size > 0,
      burnout: people.filter((p) => p.burnoutBp >= s.tiredBurnoutBp).length,
      oldHardwarePct: h < s.oldHardwareBp ? divInt(h, 100, 1) : null,
      extraDesks: Math.max(0, people.length - places),
      rooms: [...new Set(state.office.rooms)].sort(),
      boxes: sales.some((x) => x.stock > 0 && (x.shelfLost || x.stock > mulBp(x.sold + x.stock, s.boxesStockShareBp))),
      hit: state.projects.some((p) => p.result && state.week - p.result.week < s.hitWeeks && p.result.scoreBp >= data.brands.hitScoreBp),
    },
  };
}
