// Texte aus data/texts (CLAUDE.md: keine Texte im Code). UI-R92: fehlt ein Text, gilt Englisch, sonst der Schlüssel.
import { TEXTS_DE as de, TEXTS_EN as en } from "./textData";

export type Lang = "de" | "en";

const TEXTS: Record<Lang, Record<string, string>> = { de, en };

export type T = (key: string, params?: Record<string, string | number>) => string;

/** ZIE-R32 Stufe Inhalte: Texte aktiver Mods ergänzen oder ersetzen die des Grundspiels. */
let MOD_TEXTS: Record<Lang, Record<string, string>> = { de: {}, en: {} };

export function setModTexts(texts: { de: Record<string, string>; en: Record<string, string> }): void {
  MOD_TEXTS = { de: { ...texts.de }, en: { ...texts.en } };
}

export function makeT(lang: Lang): T {
  return (key, params) => {
    let text = MOD_TEXTS[lang][key] ?? TEXTS[lang][key] ?? MOD_TEXTS.en[key] ?? TEXTS.en[key] ?? key;
    if (params) for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v));
    return text;
  };
}

const LANG_KEY = "gst.lang";

/** Gewählte Sprache aus dem Browser-Speicher, sonst die Sprache des Browsers (Deutsch nur bei „de…“). */
export function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "de" || stored === "en") return stored;
  } catch {
    // Ohne Speicher gilt die Browsersprache.
  }
  const nav = typeof navigator !== "undefined" ? navigator.language : "de";
  return nav.toLowerCase().startsWith("de") ? "de" : "en";
}

/** Merkt die Sprache und setzt das lang-Attribut der Seite (Vorlesefunktionen, Silbentrennung). */
export function rememberLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Ohne Speicher gilt die Wahl nur für diese Sitzung.
  }
  if (typeof document !== "undefined") document.documentElement.lang = lang;
}

/** Entwicklermodus: Schlüssel, die in einer Sprache fehlen (UI-R92). */
export function missingTexts(lang: Lang): string[] {
  return Object.keys(TEXTS.de).filter((k) => !(k in TEXTS[lang]));
}
