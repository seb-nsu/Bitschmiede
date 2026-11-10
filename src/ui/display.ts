// Darstellung und Barrierefreiheit (S10 ZIE-R26, ZIE-R42 bis ZIE-R44; S11 UI-R60, UI-R61, UI-T10): pro Gerät, nie im
// Spielstand. Gesetzt wird über Attribute am <html>-Element; die Regeln stehen in styles.css.
import { setNumberMode } from "./format";

export type ThemeSetting = "system" | "hell" | "dunkel" | "kontrast";
export type MotionSetting = "system" | "reduziert" | "voll";

export interface DisplayPrefs {
  /** ZIE-R42: hell, dunkel, hoher Kontrast; „system“ folgt dem Betriebssystem. */
  theme: ThemeSetting;
  /** UI-R61: Skalierung der ganzen Oberfläche in Prozent (75–200). */
  uiScale: number;
  /** UI-R61: Schriftgröße getrennt davon in Prozent (85–150). */
  fontScale: number;
  /** UI-T10: reduzierte Animationen. */
  motion: MotionSetting;
  /** UI-R60: Farbenblind-Modus mit Mustern und Formen. */
  colorblind: boolean;
  /** ZIE-R43: kurz (1,2 Mio. $) oder voll. */
  numbers: "kurz" | "voll";
  /** ZIE-R44: Mentor und Sprechblasen getrennt stumm (kein Aufpoppen, Inhalte bleiben im Wissensbuch). */
  mentorMuted: boolean;
  bubblesMuted: boolean;
}

export const DEFAULT_DISPLAY: DisplayPrefs = {
  theme: "system", uiScale: 100, fontScale: 100, motion: "system", colorblind: false, numbers: "voll", mentorMuted: false, bubblesMuted: false,
};

export const UI_SCALES = [75, 90, 100, 110, 125, 150, 175, 200];
export const FONT_SCALES = [85, 100, 115, 130, 150];

const KEY = "gst.display";
let current: DisplayPrefs = DEFAULT_DISPLAY;

export function loadDisplay(): DisplayPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_DISPLAY, ...(JSON.parse(raw) as Partial<DisplayPrefs>) } : DEFAULT_DISPLAY;
  } catch {
    return DEFAULT_DISPLAY;
  }
}

export function saveDisplay(p: DisplayPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Ohne Speicher gelten die Einstellungen nur für diese Sitzung.
  }
}

/** Setzt Thema, Skalierung, Schrift, Bewegung, Muster und Zahlenformat für die ganze Seite. */
export function applyDisplay(p: DisplayPrefs): void {
  current = p;
  setNumberMode(p.numbers);
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = p.theme;
  root.dataset.motion = reducedMotion() ? "reduziert" : "voll";
  root.dataset.colorblind = p.colorblind ? "an" : "aus";
  root.style.setProperty("--ui-scale", String(p.uiScale / 100));
  // Die Schrift skaliert über die Wurzelgröße (alle Größen in rem), die Oberfläche zusätzlich über zoom.
  root.style.fontSize = `${p.fontScale}%`;
}

export function displayPrefs(): DisplayPrefs {
  return current;
}

/** UI-T10: reduzierte Animationen aus der Einstellung, sonst aus dem Betriebssystem. */
export function reducedMotion(): boolean {
  if (current.motion !== "system") return current.motion === "reduziert";
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
