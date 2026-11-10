// Prüfsumme des Spielstands für Determinismus- und Golden-Tests (TEC-R04, KRN-R22).
import { hash32 } from "./rng";

/** JSON mit sortierten Schlüsseln, damit die Prüfsumme nicht von der Einfügereihenfolge abhängt (TEC-R09). */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function stateChecksum(state: unknown): string {
  const text = stableStringify(state);
  // Zwei unabhängige 32-Bit-Hashes ergeben 64 Bit.
  return hash32(text).toString(16).padStart(8, "0") + hash32(`#${text}`).toString(16).padStart(8, "0");
}
