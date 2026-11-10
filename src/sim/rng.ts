// Benannte Zufallsströme (S01 5.3, KRN-R20, KRN-R21, TEC-R03, TEC-R86, A05).
// seed_System = hash32(seed ‖ Systemname), Generator xoshiro128**.
import { type Bp, invNormBp, mulBp, mulDiv } from "./num";

/** A05 (ergänzt um welt und marken, A39). */
export const STREAM_NAMES = [
  "kalender", "ki", "engine", "projekte", "markt", "betrieb", "lizenzen", "marken",
  "finanzen", "personal", "ereignisse", "awards", "acquisitions", "welt",
  // A05: Ein neues System bekommt einen eigenen Strom; „presse“ für die Einzelwertungen der Magazine (S11 Release-Abend).
  "presse",
  // S05 MKT-R30: Haltbarkeit des Kopierschutzes.
  "piraterie",
  // S05 MKT-R36: Bewerber der Entwicklerkonferenz.
  "messe",
  // S05 MKT-V13: Angebote für Heft-Beilagen.
  "vertrieb",
  // S07 FRM-R42 bis R47: KI-Publisher (Etappe 6a.4).
  "publisher",
  // S08 MRK-R57: Wendepunkte der Zukunftsepoche (Etappe 6a.7).
  "zukunft",
  // Etappe 6c.3: Marktplatz der Auftragsspiele.
  "auftragsspiele",
  // Prüfung Fable 03.11.2026: Jahresziele der Strategiekonferenz.
  "ziele",
] as const;
export type StreamName = (typeof STREAM_NAMES)[number];

export type RngState = [number, number, number, number];

export interface RngHolder {
  seed: string;
  rngStates: Record<string, RngState>;
}

const TWO_POW_32 = 4294967296;
const SEED_PATTERN = /^[0-9a-f]{16}$/;

export function isValidSeed(seed: string): boolean {
  return SEED_PATTERN.test(seed);
}

/** FNV-1a über die Zeichen, danach fmix32 aus MurmurHash3. */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

function splitmix32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
}

export function initialRngState(seed: string, name: string): RngState {
  const next = splitmix32(hash32(`${seed}|${name}`));
  const s: RngState = [next(), next(), next(), next()];
  if ((s[0] | s[1] | s[2] | s[3]) === 0) s[0] = 1;
  return s;
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

/** Ein Schritt xoshiro128**; verändert s und liefert uint32. */
function nextU32(s: RngState): number {
  const result = Math.imul(rotl(Math.imul(s[1], 5) >>> 0, 7), 9) >>> 0;
  const t = (s[1] << 9) >>> 0;
  s[2] = (s[2] ^ s[0]) >>> 0;
  s[3] = (s[3] ^ s[1]) >>> 0;
  s[1] = (s[1] ^ s[2]) >>> 0;
  s[0] = (s[0] ^ s[3]) >>> 0;
  s[2] = (s[2] ^ t) >>> 0;
  s[3] = rotl(s[3], 11);
  return result;
}

export interface Rng {
  u32(): number;
  /** Gleichverteilt 0–9.999 bp (TEC-R86). */
  uniformBp(): Bp;
  /** Gleichverteilt 0 … n−1. */
  int(n: number): number;
  /** Gleichverteilt lo … hi (inklusive). */
  range(lo: number, hi: number): number;
  /** Mittelwert + mulBp(invNorm[i], Streuung), i aus 0–4.095 (TEC-R86). */
  normal(mean: number, sd: number): number;
}

/** Liefert den Strom; sein Zustand liegt im übergebenen Objekt und wird dort fortgeschrieben. */
export function stream(holder: RngHolder, name: StreamName): Rng {
  return streamByKey(holder, name);
}

/** KI-R05, MRK-R33: eigener Strom je Firma (Schlüssel „ki#7“); entfällt mit der Firma (dropStream). */
export function firmStream(holder: RngHolder, name: StreamName, id: number): Rng {
  return streamByKey(holder, `${name}#${id}`);
}

export function dropFirmStream(holder: RngHolder, name: StreamName, id: number): void {
  delete holder.rngStates[`${name}#${id}`];
}

function streamByKey(holder: RngHolder, key: string): Rng {
  let s = holder.rngStates[key];
  if (!s) {
    s = initialRngState(holder.seed, key);
    holder.rngStates[key] = s;
  }
  const state = s;
  const rng: Rng = {
    u32: () => nextU32(state),
    uniformBp: () => mulDiv(nextU32(state), 10000, TWO_POW_32, 1),
    int: (n) => mulDiv(nextU32(state), n, TWO_POW_32, 1),
    range: (lo, hi) => lo + rng.int(hi - lo + 1),
    normal: (mean, sd) => mean + mulBp(invNormBp(nextU32(state) >>> 20), sd),
  };
  return rng;
}
