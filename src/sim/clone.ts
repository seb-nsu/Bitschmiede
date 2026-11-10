// Tiefe Kopie des Spielstands für tick(state) → state (TEC-R02). Der Spielstand ist ein reines Datenobjekt aus
// Objekten, Listen und Grundwerten (TEC-R01); dafür ist eine eigene Kopie mehrfach schneller als structuredClone,
// das im Headless-Lauf den Großteil der Rechenzeit kostete (TEC-R50, Messung in tools/bench.ts).
// Eingefrorene Einträge (Protokolle, Chronik, Jahrbücher) ändern sich nie mehr und werden geteilt statt kopiert.
export function cloneData<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  if (Array.isArray(value)) {
    const out = new Array(value.length);
    for (let i = 0; i < value.length; i++) {
      const v: unknown = value[i];
      out[i] = v === null || typeof v !== "object" ? v : cloneData(v);
    }
    return out as T;
  }
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    const v = (value as Record<string, unknown>)[key];
    out[key] = v === null || typeof v !== "object" ? v : cloneData(v);
  }
  return out as T;
}

/** Friert einen fertigen Eintrag samt Unterobjekten ein, damit cloneData ihn teilt (TEC-R50). */
export function freezeDeep<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const v of Object.values(value as Record<string, unknown>)) freezeDeep(v);
  return Object.freeze(value);
}
