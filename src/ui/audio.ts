// Platzhalter-Töne (Design „Etappenplan“, S11 8.7): per WebAudio erzeugt, Klänge als Daten in data/audio/sounds.json.
// UI-R82: Die Audio-Schicht entscheidet anhand der Worker-Ereignisse; die Simulation kennt keine Klänge.
// UI-R80, UI-R83: Regler Gesamt, Ereignistöne, Oberfläche; gleiche Töne nicht innerhalb von 2 s.
import sounds from "../../data/audio/sounds.json";
import { sample } from "./samples";

export type SoundId = keyof typeof sounds.sounds;
type Channel = "events" | "ui";

export interface AudioPrefs {
  master: number;
  /** UI-R80: vier Regler Musik, Ereignistöne, Oberfläche, Atmosphäre; dazu Gesamt und „Musik bei Pause dämpfen“. */
  music: number;
  events: number;
  ui: number;
  atmo: number;
  dampOnPause: boolean;
  muted: boolean;
  /** UI-R66 auf Wunsch: bei jeder Entscheidung anhalten statt nur bei wichtigen. */
  pauseAll: boolean;
}

const PREFS_KEY = "gst.audio";
export const DEFAULT_PREFS: AudioPrefs = { master: 0.7, music: 0.5, events: 0.8, ui: 0.5, atmo: 0.4, dampOnPause: true, muted: false, pauseAll: false };

/** S10 Preferences: pro Gerät, nicht im Spielstand. */
export function loadPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<AudioPrefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: AudioPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    // Ohne Speicher gelten die Einstellungen nur für diese Sitzung.
  }
}

let ctx: AudioContext | null = null;

/** Gemeinsamer Audio-Kontext für Töne und Musik; null, wenn das Gerät keinen hat. */
export function audioContext(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

/** UI-R82: Ton zu einer Berichtszeile oder einem Ereignis, als Daten in data/audio/sounds.json. */
export function soundForLog(key: string): SoundId | null {
  return ((sounds.logSounds as Record<string, string>)[key] as SoundId | undefined) ?? null;
}
export function soundForEvent(kind: string): SoundId | null {
  return ((sounds.eventSounds as Record<string, string>)[kind] as SoundId | undefined) ?? null;
}
const lastPlayed = new Map<SoundId, number>();
let preloaded = false;

export function play(id: SoundId, prefs: AudioPrefs): void {
  if (prefs.muted) return;
  const def = sounds.sounds[id];
  const channel = sounds.channels[id] as Channel;
  const volume = prefs.master * prefs[channel] * def.gain;
  if (volume <= 0) return;
  const now = performance.now();
  if ((lastPlayed.get(id) ?? -Infinity) > now - sounds.minGapMs) return;
  lastPlayed.set(id, now);
  try {
    ctx ??= new AudioContext();
    if (!preloaded) {
      preloaded = true;
      for (const d of Object.values(sounds.sounds)) sample(ctx, (d as { file?: string }).file);
    }
    // CC0-Datei, falls angegeben und geladen; sonst der erzeugte Platzhalter-Ton.
    const buf = sample(ctx, (def as { file?: string }).file);
    if (buf) {
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buf;
      gain.gain.value = volume * ((def as { fileGain?: number }).fileGain ?? 1);
      src.connect(gain).connect(ctx.destination);
      src.start();
      return;
    }
    const start = ctx.currentTime;
    def.notes.forEach((freq, i) => {
      if (freq <= 0) return;
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = def.type as OscillatorType;
      osc.frequency.value = freq;
      const t0 = start + (i * def.noteMs) / 1000;
      const t1 = t0 + def.noteMs / 1000;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t1);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t0);
      osc.stop(t1 + 0.02);
    });
  } catch {
    // Kein Audio (z. B. ohne Nutzerinteraktion oder ohne Gerät): still bleiben.
  }
}
