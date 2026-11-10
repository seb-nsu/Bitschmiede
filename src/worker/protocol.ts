// Worker-Protokoll (S12 5.3), Teilmenge für Etappe 0. Nur Typen; UI und Worker teilen sie.
import type { Input } from "../sim/model/types";
import type { NewGameSettings } from "../sim/game";
import type { BoardDraft, BoardPreview, ViewModel } from "../sim/view/view";
import type { SlotInfo } from "./storage";
import type { ModBundle, ModConflict, ModError } from "../mods/modding";

export type Speed = "pause" | "0.5x" | "1x" | "2x" | "4x" | "bisEreignis";

export type ToWorker =
  | { type: "start"; seed: string; settings: NewGameSettings }
  | { type: "input"; input: Input }
  | { type: "time"; speed: Speed }
  /** Spieltest: bei jeder Entscheidung anhalten (UI-R66) oder nur bei wichtigen. */
  | { type: "pauseMode"; all: boolean }
  /** Partie verlassen (zurück zum Startbildschirm). */
  /** Zurück zum Startbildschirm; save: vorher in einen Autosave-Platz sichern (Ironman sichert immer). */
  | { type: "close"; save?: boolean }
  /** KRN-R52 ergänzend: Autosave, wenn das Fenster verborgen oder geschlossen wird. */
  | { type: "autosave" }
  | { type: "query"; id: number; kind: "board"; draft: BoardDraft }
  | { type: "save"; slot: string }
  | { type: "load"; slot: string }
  | { type: "listSaves" }
  | { type: "deleteSave"; slot: string }
  | { type: "exportSave"; slot: string }
  | { type: "importSave"; bytes: Uint8Array }
  /** ZIE-R35: aktive Mods in der Reihenfolge des Spielers (nur auf dem Startbildschirm). */
  | { type: "mods"; mods: ModBundle[] };

export type PauseReason = "user" | "decision" | "release" | "limit" | "yearbook" | "ending" | "awards" | "insolvency";

export type FromWorker =
  /** ANNAHME: Etappe 0 schickt das ganze (kleine) Anzeigemodell statt Teilbäumen; Deltas nach TEC-R21 ab Etappe 1. */
  | { type: "delta"; view: ViewModel; speed: Speed }
  | { type: "paused"; reason: PauseReason }
  | { type: "events"; events: { kind: "release"; projectId: number }[] }
  /** KRN-R62: Jahrbuch als Haltepunkt. */
  | { type: "yearbook"; year: number }
  | { type: "queryResult"; id: number; result: BoardPreview }
  | { type: "error"; code: string }
  | { type: "saves"; slots: SlotInfo[] }
  /** Was der Startbildschirm vor dem Spielstart braucht: Presets aus den Daten. */
  | { type: "catalog"; presets: string[]; defaultPreset: string; goals: string[]; scenarios: { id: string; startYear: number; deadlineYear: number }[]; startYears: { range: [number, number]; quick: number[] } }
  | { type: "saved"; slot: string }
  | { type: "loaded"; warnings: string[] }
  | { type: "exported"; slot: string; bytes: Uint8Array }
  /** ZIE-R35, ZIE-R36: Ergebnis des Ladens: geladene Mods, Fehler, Konflikte und Texte der Mods. */
  | { type: "mods"; active: ModInfo[]; errors: ModError[]; conflicts: ModConflict[]; texts: { de: Record<string, string>; en: Record<string, string> } };

export interface ModInfo { id: string; name: string; version: string; affectsBalance: boolean }
