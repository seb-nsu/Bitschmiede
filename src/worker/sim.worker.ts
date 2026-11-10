// Worker-Einstieg: hält Spielstand und Daten, rechnet Ticks und schickt das Anzeigemodell (S12 5.3).
/// <reference lib="webworker" />
import { loadBaseData, loadData } from "../mods/loadBase";
import { newGame } from "../sim/game";
import { applyInputs, tick, validateInput } from "../sim/tick";
import { paused } from "../sim/systems/spielende";
import { weeksInMonth } from "../sim/calendar";
import { boardPreview, buildView } from "../sim/view/view";
import type { GameData, GameEvent, GameState, Input } from "../sim/model/types";
import type { FromWorker, PauseReason, Speed, ToWorker } from "./protocol";
import { createSave, ironmanSlot, isAutosaveWeek, loadSave, SaveError } from "../sim/save";
import { decompress, deleteSlot, listSlots, nextAutosaveSlot, readSlot, writeSlot } from "./storage";

declare const self: DedicatedWorkerGlobalScope;

let data = loadBaseData();
let state: GameState | null = null;
let speed: Speed = "pause";
let pauseAll = false;

/**
 * UI-R66 sagt: jede Entscheidung hält an. ANNAHME (Spieltest, OFFENE-FRAGEN): Standardmäßig halten nur die Weichen aus
 * `time.pauseOnEvents` an; alle anderen Angebote laufen mit Frist und Standardantwort weiter. Einstellbar.
 */
function blocking(e: GameEvent): boolean {
  return pauseAll || data.time.pauseOnEvents.includes(e.kind);
}
let timer: ReturnType<typeof setTimeout> | null = null;
let lastPost = 0;
/** Eingabeprotokoll mit Woche, damit ein Verlauf nachgespielt werden kann (TEC-R45, später im Spielstand). */
const inputLog: { week: number; input: Input }[] = [];

/** TEC-R22: höchstens 10 Anzeigemodelle pro Sekunde. */
const MIN_POST_INTERVAL = 100;
/** „Bis zum nächsten Ereignis“ rechnet höchstens so viele Wochen am Stück. */
const MAX_FAST_FORWARD_WEEKS = 520;

type RunSpeed = keyof GameData["time"]["speedFactorBp"];

function isRunSpeed(s: Speed): s is RunSpeed {
  return s in data.time.speedFactorBp;
}

/**
 * KRN-R03: 1× = ein Anzeigeschritt pro Sekunde (data/base/core/time.json). In Monatsanzeige verteilen sich die
 * 4 oder 5 Wochen-Ticks gleichmäßig auf diese Zeit, in Wochenanzeige dauert eine Woche den ganzen Schritt.
 */
function msPerWeek(s: RunSpeed): number {
  const step = (data.time.msPerDisplayStep * 10000) / data.time.speedFactorBp[s];
  if (!state || state.displayUnit === "woche") return step;
  return step / weeksInMonth(state.startYear, state.week);
}

function post(msg: FromWorker): void {
  self.postMessage(msg);
}

function postView(force = false): void {
  if (!state) return;
  const now = performance.now();
  if (!force && now - lastPost < MIN_POST_INTERVAL) return;
  lastPost = now;
  post({ type: "delta", view: buildView(state, data), speed });
}

function setSpeed(next: Speed, reason: PauseReason = "user"): void {
  speed = next;
  if (timer) clearTimeout(timer);
  timer = null;
  if (speed === "pause") {
    post({ type: "paused", reason });
    postView(true);
    return;
  }
  // UI-R66: Solange eine haltende Entscheidung offen ist, läuft nichts ab.
  if (state && state.events.some(blocking)) {
    speed = "pause";
    post({ type: "paused", reason: "decision" });
    postView(true);
    return;
  }
  if (speed === "bisEreignis") {
    runUntilEvent();
    return;
  }
  schedule();
  postView(true);
}

function schedule(): void {
  if (!isRunSpeed(speed)) return;
  timer = setTimeout(() => {
    if (!step()) schedule();
  }, msPerWeek(speed));
}

/**
 * Ein Wochen-Tick. KRN-R05: Jede neue Entscheidung pausiert; ein Release pausiert für die Enthüllung.
 * Gibt true zurück, wenn pausiert wurde.
 */
function step(anyEvent = false): boolean {
  if (!state) return false;
  const weekBefore = state.week;
  const yearbooksBefore = state.yearbooks.length;
  const awardsBefore = state.awards.length;
  const insolvencyBefore = state.finance.insolvencyMonths;
  const unreleased = new Set(state.projects.filter((p) => p.status !== "veroeffentlicht").map((p) => p.id));
  state = tick(state, data);
  const released = state.projects.filter((p) => unreleased.has(p.id) && p.status === "veroeffentlicht").map((p) => p.id);
  const yearbook = state.yearbooks.length > yearbooksBefore;
  // KRN-R52, ZIE-R29: Autosave nach dem Jahrbuch und alle 13 Wochen.
  if (isAutosaveWeek(data, state.week, yearbook)) void autosave();
  // ZIE-R10: Am Spielende hält die Zeit an (Abschluss-Bildschirm).
  if (paused(state)) {
    setSpeed("pause", "ending");
    return true;
  }
  // KRN-R62: Das Jahrbuch ist ein Haltepunkt.
  if (yearbook) {
    post({ type: "yearbook", year: state.yearbooks[state.yearbooks.length - 1]!.year });
    if (released.length === 0) {
      setSpeed("pause", "yearbook");
      return true;
    }
  }
  if (released.length > 0) {
    post({ type: "events", events: released.map((projectId) => ({ kind: "release" as const, projectId })) });
    setSpeed("pause", "release");
    return true;
  }
  // 4b.3: Momente als Szene. Die Preis-Gala hält an, wenn der Spieler nominiert ist; die erste Insolvenz-Warnung immer.
  const newAwards = state.awards.slice(awardsBefore);
  if (newAwards.some((a) => a.nominees.some((n) => n.ownerId === 0))) {
    setSpeed("pause", "awards");
    return true;
  }
  if (insolvencyBefore === 0 && state.finance.insolvencyMonths > 0) {
    setSpeed("pause", "insolvency");
    return true;
  }
  // Neu erschienen sind Entscheidungen mit der Woche dieses Ticks (auch solche, die der Ereignisplaner verschoben hatte).
  if (state.events.some((e) => e.createdWeek === weekBefore && (anyEvent || blocking(e)))) {
    setSpeed("pause", "decision");
    return true;
  }
  postView();
  return false;
}

/** KRN-R04: „Bis zum nächsten Ereignis“ rechnet ohne Wartezeit bis zur nächsten Entscheidung oder zum Release. */
function runUntilEvent(): void {
  if (!state) return;
  for (let i = 0; i < MAX_FAST_FORWARD_WEEKS; i++) {
    if (step(true)) return;
  }
  setSpeed("pause", "limit");
}

/** Woche des letzten Autosaves; ein verborgenes Fenster sichert nur, wenn seitdem Zeit vergangen ist. */
let lastAutosaveWeek = -1;

async function autosave(): Promise<void> {
  if (!state) return;
  lastAutosaveWeek = state.week;
  await saveTo(state, [...inputLog]);
}

async function saveTo(s: GameState, log: { week: number; input: Input }[]): Promise<void> {
  try {
    // KRN-R54: Eine Ironman-Partie hat genau einen Platz.
    const slot = s.settings.ironman ? ironmanSlot(s.seed) : await nextAutosaveSlot(data.time.autosaveSlots);
    await writeSlot(slot, createSave(s, data, log));
  } catch {
    // Ein fehlgeschlagener Autosave darf das Spiel nicht anhalten.
  }
}

/** KRN-R54: Während einer laufenden Ironman-Partie wird nichts geladen. */
function ironmanRunning(): boolean {
  return state !== null && state.settings.ironman && state.gameOver === null;
}

async function postSlots(): Promise<void> {
  post({ type: "saves", slots: await listSlots() });
}

async function load(bytes: Uint8Array): Promise<void> {
  const result = loadSave(await decompress(bytes), data);
  setSpeed("pause");
  state = result.state;
  inputLog.length = 0;
  inputLog.push(...result.inputLog);
  post({ type: "loaded", warnings: result.warnings });
  postView(true);
}

async function handleStorage(msg: ToWorker): Promise<void> {
  switch (msg.type) {
    case "save": {
      if (!state) return;
      const slot = state.settings.ironman ? ironmanSlot(state.seed) : msg.slot;
      await writeSlot(slot, createSave(state, data, inputLog));
      post({ type: "saved", slot });
      await postSlots();
      break;
    }
    case "load": {
      if (ironmanRunning()) throw new SaveError("save.ironman", msg.slot);
      const bytes = await readSlot(msg.slot);
      if (!bytes) throw new SaveError("save.missing", msg.slot);
      await load(bytes);
      break;
    }
    case "listSaves":
      await postSlots();
      break;
    case "deleteSave":
      await deleteSlot(msg.slot);
      await postSlots();
      break;
    case "exportSave": {
      const bytes = await readSlot(msg.slot);
      if (bytes) post({ type: "exported", slot: msg.slot, bytes });
      break;
    }
    case "importSave":
      if (ironmanRunning()) throw new SaveError("save.ironman", "import");
      await load(msg.bytes);
      break;
  }
}

function handleInput(input: Input): void {
  if (!state) return;
  const error = validateInput(state, data, input);
  if (error) {
    post({ type: "error", code: error });
    return;
  }
  inputLog.push({ week: state.week, input });
  state = applyInputs(state, data, [input]);
  // Ein Release geschieht im nächsten Tick (Schritt 6); sofort rechnen, damit die Enthüllung folgt.
  if (state.projects.some((p) => p.status === "bereit" && p.releaseRequested)) {
    step();
    return;
  }
  postView(true);
}

function postCatalog(): void {
  post({ type: "catalog", presets: data.presets.map((p) => p.id), defaultPreset: "normal", goals: [...data.goals.longTermGoals],
    scenarios: data.goals.scenarios.map((x) => ({ id: x.id, startYear: x.startYear, deadlineYear: x.deadlineYear })),
    // Etappe 6c.10: freies Startjahr.
    startYears: { range: data.start.startYearRange, quick: data.start.startYearQuick } });
}
postCatalog();

self.onmessage = (ev: MessageEvent<ToWorker>) => {
  const msg = ev.data;
  try {
    switch (msg.type) {
      case "mods": {
        // ZIE-R31 bis ZIE-R36: Mods gelten ab der nächsten Partie; während einer Partie bleiben die Daten fest.
        if (state) {
          post({ type: "error", code: "mods.running" });
          break;
        }
        const r = loadData(msg.mods);
        data = r.data;
        post({ type: "mods", active: r.active.map((m) => ({ id: m.id, name: m.name, version: m.version, affectsBalance: m.affectsBalance })), errors: r.errors, conflicts: r.conflicts, texts: r.texts });
        postCatalog();
        break;
      }
      case "start":
        state = newGame(data, msg.seed, msg.settings);
        inputLog.length = 0;
        setSpeed("pause");
        break;
      case "input":
        handleInput(msg.input);
        break;
      case "time":
        setSpeed(msg.speed);
        break;
      case "pauseMode":
        pauseAll = msg.all;
        break;
      case "close":
        // Zurück zum Startbildschirm: die Partie ist beendet, Laden ist wieder erlaubt. Ironman sichert immer (KRN-R54).
        if (state && (msg.save === true || (state.settings.ironman && state.gameOver === null))) {
          const done = saveTo(state, [...inputLog]);
          void done.then(() => postSlots());
        }
        state = null;
        speed = "pause";
        if (timer) clearTimeout(timer);
        timer = null;
        break;
      case "autosave":
        // KRN-R52 ergänzend (Abschluss 1.0): Wer den Tab schließt oder wechselt, verliert höchstens die laufende Woche.
        if (state && state.gameOver === null && state.week > 0 && state.week !== lastAutosaveWeek) void autosave().then(() => postSlots());
        break;
      case "query":
        if (state) post({ type: "queryResult", id: msg.id, result: boardPreview(state, data, msg.draft) });
        break;
      default:
        handleStorage(msg).catch((e: unknown) => post({ type: "error", code: e instanceof SaveError ? e.code : "save.failed" }));
    }
  } catch (e) {
    post({ type: "error", code: e instanceof Error ? e.message : String(e) });
  }
};
