// CC0-Motive für Meldungen, Entscheidungen und Räume (data/gfx/icons.json, Lizenzen in public/CREDITS.md).
// Einfarbige Kacheln dienen als Maske; gefärbt wird in der Textfarbe, damit sie in allen Darstellungen lesbar bleiben (UI-R60).
import gfx from "../../data/gfx/icons.json";

export type GfxIconName = keyof typeof gfx.icons;

/** Pfad unter public/ mit Basis-URL des Spiels. */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

export function iconForEvent(kind: string): GfxIconName | null {
  return ((gfx.events as Record<string, string>)[kind] as GfxIconName | undefined) ?? null;
}

export function iconForRoom(room: string): GfxIconName | null {
  return ((gfx.rooms as Record<string, string>)[room] as GfxIconName | undefined) ?? null;
}

/** Berichtszeile: erster passender Eintrag in „logs“ (Teilwort, mit ^ als Anfang des Schlüssels ohne „log.“). */
export function iconForLog(key: string): GfxIconName | null {
  const k = key.replace(/^(log|chronicle)\./, "");
  for (const [pattern, icon] of gfx.logs) {
    const hit = pattern!.startsWith("^") ? k.startsWith(pattern!.slice(1)) : k.includes(pattern!);
    if (hit) return icon as GfxIconName;
  }
  return null;
}

export function iconPath(name: GfxIconName): string {
  return asset(gfx.icons[name]);
}

/** Motiv als Inline-Element; ohne Zuordnung ein leerer Platzhalter gleicher Breite, damit Listen bündig bleiben. */
export function GfxIcon({ name }: { name: GfxIconName | null }) {
  if (!name) return <span className="gfx-icon gfx-icon-none" aria-hidden="true" />;
  const url = `url("${iconPath(name)}")`;
  return <span className={`gfx-icon gfx-icon-${name}`} aria-hidden="true" style={{ maskImage: url, WebkitMaskImage: url }} />;
}
