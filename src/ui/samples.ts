// Audiodateien (CC0-Pakete, Lizenzen in public/CREDITS.md): laden bei Bedarf und dekodieren einmal. Fehlt eine Datei oder
// kann das Gerät sie nicht dekodieren, bleibt es bei den erzeugten Platzhalter-Tönen.
const cache = new Map<string, AudioBuffer | null | Promise<AudioBuffer | null>>();

/** Fertig dekodierte Datei oder null; der erste Aufruf startet das Laden im Hintergrund. */
export function sample(ctx: AudioContext, path: string | undefined): AudioBuffer | null {
  if (!path) return null;
  const hit = cache.get(path);
  if (hit instanceof AudioBuffer || hit === null) return hit;
  if (!hit) {
    const url = `${import.meta.env.BASE_URL}${path}`;
    const p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((b) => ctx.decodeAudioData(b))
      .catch(() => null)
      .then((buf) => {
        cache.set(path, buf);
        return buf;
      });
    cache.set(path, p);
  }
  return null;
}

/** Lädt eine Datei vor (z. B. Musik der nächsten Stimmung), ohne zu warten. */
export function preload(ctx: AudioContext, path: string | undefined): void {
  sample(ctx, path);
}
