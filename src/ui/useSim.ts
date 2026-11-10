// Verbindung zum Worker: sendet nur Eingaben und Zeitbefehle, liest nur das Anzeigemodell (TEC-R20, TEC-R21).
import { useCallback, useEffect, useRef, useState } from "react";
import type { Input } from "../sim/model/types";
import type { NewGameSettings } from "../sim/game";
import type { BoardDraft, BoardPreview, ViewModel } from "../sim/view/view";
import type { FromWorker, ModInfo, PauseReason, Speed, ToWorker } from "../worker/protocol";
import type { ModBundle, ModConflict, ModError } from "../mods/modding";
import { setModTexts } from "./texts";
import type { SlotInfo } from "../worker/storage";

export interface ScenarioInfo { id: string; startYear: number; deadlineYear: number }

export interface Sim {
  view: ViewModel | null;
  speed: Speed;
  pauseReason: PauseReason | null;
  error: string | null;
  /** Projekt-IDs frischer Releases, deren Enthüllung noch nicht gezeigt wurde (KRN-R35: nacheinander). */
  revealQueue: number[];
  start(seed: string, settings: NewGameSettings): void;
  input(input: Input): void;
  time(speed: Speed): void;
  pauseMode(all: boolean): void;
  preview(draft: BoardDraft): Promise<BoardPreview>;
  clearReveal(): void;
  clearError(): void;
  presets: string[];
  /** ZIE-R06: wählbare langfristige Ziele. */
  goals: string[];
  scenarios: ScenarioInfo[];
  /** Etappe 6c.10: wählbare Startjahre. */
  startYears: { range: [number, number]; quick: number[] };
  /** Jahr des Jahrbuchs, das gerade gezeigt werden soll (KRN-R62). */
  yearbookYear: number | null;
  clearYearbook(): void;
  /** Zurück zum Startbildschirm (nach Insolvenz oder „Spiel beenden“); save: vorher sichern. */
  reset(save?: boolean): void;
  /** Spielstände (TEC-R40 ff.). */
  slots: SlotInfo[];
  notice: { key: string; params?: Record<string, string> } | null;
  clearNotice(): void;
  save(slot: string): void;
  load(slot: string): void;
  listSaves(): void;
  deleteSave(slot: string): void;
  exportSave(slot: string): void;
  importSave(bytes: Uint8Array): void;
  /** ZIE-R35: Mods in Spielerreihenfolge an den Worker; das Ergebnis kommt in `mods`. */
  setMods(mods: ModBundle[]): void;
  mods: { active: ModInfo[]; errors: ModError[]; conflicts: ModConflict[] } | null;
}

export function useSim(): Sim {
  const worker = useRef<Worker | null>(null);
  const queries = useRef(new Map<number, (r: BoardPreview) => void>());
  const nextQuery = useRef(1);
  const [view, setView] = useState<ViewModel | null>(null);
  const [speed, setSpeed] = useState<Speed>("pause");
  const [pauseReason, setPauseReason] = useState<PauseReason | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealQueue, setRevealQueue] = useState<number[]>([]);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [startYears, setStartYears] = useState<{ range: [number, number]; quick: number[] }>({ range: [1980, 1980], quick: [1980] });
  const [presets, setPresets] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [yearbookYear, setYearbookYear] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ key: string; params?: Record<string, string> } | null>(null);
  const [mods, setModsState] = useState<Sim["mods"]>(null);

  useEffect(() => {
    const w = new Worker(new URL("../worker/sim.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (ev: MessageEvent<FromWorker>) => {
      const msg = ev.data;
      switch (msg.type) {
        case "delta":
          setView(msg.view);
          setSpeed(msg.speed);
          if (msg.speed !== "pause") setPauseReason(null);
          break;
        case "paused":
          setSpeed("pause");
          setPauseReason(msg.reason);
          break;
        case "events":
          setRevealQueue((q) => [...q, ...msg.events.filter((e) => e.kind === "release").map((e) => e.projectId)]);
          break;
        case "queryResult":
          queries.current.get(msg.id)?.(msg.result);
          queries.current.delete(msg.id);
          break;
        case "error":
          setError(msg.code);
          break;
        case "saves":
          setSlots(msg.slots);
          break;
        case "yearbook":
          setYearbookYear(msg.year);
          break;
        case "catalog":
          setPresets(msg.presets);
          setGoals(msg.goals);
          setScenarios(msg.scenarios);
          setStartYears(msg.startYears);
          break;
        case "mods":
          setModTexts(msg.texts);
          setModsState({ active: msg.active, errors: msg.errors, conflicts: msg.conflicts });
          break;
        case "saved":
          setNotice({ key: "save.done", params: { slot: msg.slot } });
          break;
        case "loaded":
          setRevealQueue([]);
          setNotice(msg.warnings.length > 0 ? { key: msg.warnings[0]! } : { key: "save.loaded" });
          break;
        case "exported": {
          // Download über einen Blob-Link; funktioniert im Browser und in der Electron-Hülle.
          const url = URL.createObjectURL(new Blob([msg.bytes as BlobPart], { type: "application/gzip" }));
          const a = document.createElement("a");
          a.href = url;
          a.download = `bitschmiede-${msg.slot}.json.gz`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          break;
        }
      }
    };
    worker.current = w;
    // KRN-R52 ergänzend: beim Verbergen oder Schließen des Fensters sichern.
    const hide = () => { if (document.visibilityState === "hidden") w.postMessage({ type: "autosave" } satisfies ToWorker); };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", hide);
      w.terminate();
    };
  }, []);

  const send = useCallback((msg: ToWorker) => worker.current?.postMessage(msg), []);

  return {
    view, speed, pauseReason, error, revealQueue,
    start: useCallback((seed, settings) => send({ type: "start", seed, settings }), [send]),
    input: useCallback((input) => send({ type: "input", input }), [send]),
    time: useCallback((s) => send({ type: "time", speed: s }), [send]),
    pauseMode: useCallback((all) => send({ type: "pauseMode", all }), [send]),
    preview: useCallback((draft) => new Promise<BoardPreview>((resolve) => {
      const id = nextQuery.current++;
      queries.current.set(id, resolve);
      send({ type: "query", id, kind: "board", draft });
    }), [send]),
    clearReveal: useCallback(() => setRevealQueue((q) => q.slice(1)), []),
    clearError: useCallback(() => setError(null), []),
    slots, notice, presets, goals, scenarios, startYears, yearbookYear,
    clearYearbook: useCallback(() => setYearbookYear(null), []),
    reset: useCallback((save?: boolean) => {
      send({ type: "close", save: save === true });
      setView(null);
      setRevealQueue([]);
      setPauseReason(null);
    }, [send]),
    clearNotice: useCallback(() => setNotice(null), []),
    save: useCallback((slot) => send({ type: "save", slot }), [send]),
    load: useCallback((slot) => send({ type: "load", slot }), [send]),
    listSaves: useCallback(() => send({ type: "listSaves" }), [send]),
    deleteSave: useCallback((slot) => send({ type: "deleteSave", slot }), [send]),
    exportSave: useCallback((slot) => send({ type: "exportSave", slot }), [send]),
    importSave: useCallback((bytes) => send({ type: "importSave", bytes }), [send]),
    setMods: useCallback((list) => send({ type: "mods", mods: list }), [send]),
    mods,
  };
}
