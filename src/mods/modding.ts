// Mod-Ladepipeline, Stufe Daten (S10 ZIE-R31 bis ZIE-R38). Rein: kein DOM, kein Dateisystem; Dateien kommen als JSON.
// Eine Mod ändert Datensätze über ihre Kennung (add, modify, remove), nie ganze Dateien (ZIE-R34).

/** ZIE-R33: Manifest einer Mod (mod.json). */
export interface ModManifest {
  id: string;
  name: string;
  version: string;
  gameVersion: string;
  author: string;
  description: string;
  dependencies: { id: string; version: string }[];
  conflicts: string[];
  loadAfter: string[];
  tier: "daten" | "inhalte" | "ereignisse" | "code";
  affectsBalance: boolean;
}

/** Änderungen an einer Datei: an einer Liste (Datensätze mit Kennung) oder an Feldern der Datei selbst. */
export interface ModFileOps {
  /** Name der Liste in der Datei (z. B. „platforms“); fehlt er, ist die Datei selbst die Liste oder `set` gilt der Datei. */
  list?: string;
  add?: Record<string, unknown>[];
  modify?: { id: string; set: Record<string, unknown> }[];
  remove?: string[];
  /** Einzelne Felder der Datei (Pfad mit Punkten), z. B. { "seedVariationBp": 1500 }. */
  set?: Record<string, unknown>;
}

/** Eine Mod als Paket: Manifest, Änderungen je Datei (Pfad wie unter data/base) und Texte (Stufe Inhalte). */
export interface ModBundle {
  manifest: ModManifest;
  files: Record<string, ModFileOps | ModFileOps[]>;
  texts?: { de?: Record<string, string>; en?: Record<string, string> };
}

export interface ModError {
  mod: string;
  file: string;
  where: string;
  problem: string;
}

/** ZIE-R35: Zwei Mods ändern dasselbe Feld; die später geladene gewinnt. */
export interface ModConflict {
  file: string;
  record: string;
  field: string;
  first: { mod: string; value: unknown };
  second: { mod: string; value: unknown };
  winner: string;
}

export const CORE_MOD_ID = "base";

/** Datensätze ohne Feld `id` bekommen eine Kennung aus ihren Feldern. */
const ID_OF: Record<string, (r: Record<string, unknown>) => string> = {
  "dev/synergies.json": (r) => `${String(r.a)}+${String(r.b)}`,
};

function recordId(file: string, r: Record<string, unknown>): string | null {
  const f = ID_OF[file];
  if (f) return f(r);
  return typeof r.id === "string" ? r.id : null;
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function kind(x: unknown): string {
  if (Array.isArray(x)) return "array";
  if (x === null) return "null";
  if (typeof x === "number") return Number.isSafeInteger(x) ? "int" : "number";
  return typeof x;
}

class OpError extends Error {
  constructor(readonly file: string, readonly where: string, problem: string) {
    super(problem);
  }
}

const SEMVER = /^\d+\.\d+\.\d+$/;

/** ZIE-R33: Prüft das Manifest; liefert Fehler mit Feldname. */
export function manifestErrors(m: unknown): { where: string; problem: string }[] {
  const out: { where: string; problem: string }[] = [];
  if (!isObject(m)) return [{ where: "mod.json", problem: "kein Objekt" }];
  const str = (k: string) => {
    if (typeof m[k] !== "string" || (m[k] as string).length === 0) out.push({ where: k, problem: "Text fehlt" });
  };
  ["id", "name", "version", "gameVersion", "author", "description"].forEach(str);
  if (typeof m.id === "string" && !/^[a-z0-9][a-z0-9_-]{0,40}$/.test(m.id)) out.push({ where: "id", problem: "nur a–z, 0–9, - und _ (1 bis 41 Zeichen)" });
  if (m.id === CORE_MOD_ID) out.push({ where: "id", problem: "„base“ ist das Grundspiel" });
  if (typeof m.version === "string" && !SEMVER.test(m.version)) out.push({ where: "version", problem: "SemVer wie 1.0.0" });
  if (!Array.isArray(m.dependencies) || m.dependencies.some((d) => !isObject(d) || typeof d.id !== "string" || typeof d.version !== "string")) {
    out.push({ where: "dependencies", problem: "Liste aus { id, version }" });
  }
  for (const k of ["conflicts", "loadAfter"]) {
    if (!Array.isArray(m[k]) || (m[k] as unknown[]).some((x) => typeof x !== "string")) out.push({ where: k, problem: "Liste aus Kennungen" });
  }
  if (!["daten", "inhalte", "ereignisse", "code"].includes(m.tier as string)) out.push({ where: "tier", problem: "daten, inhalte, ereignisse oder code" });
  if (typeof m.affectsBalance !== "boolean") out.push({ where: "affectsBalance", problem: "true oder false" });
  return out;
}

function parseVersion(v: string): [number, number, number] | null {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function cmp(a: [number, number, number], b: [number, number, number]): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/**
 * Versionsbereich: „*“, „1.2.3“ (genau), „>=1.2.0“, „>=1.0.0 <2.0.0“ (mehrere Bedingungen mit Leerzeichen), „^1.2.0“
 * (gleiche Hauptversion, mindestens diese) oder „~1.2.0“ (gleiche Nebenversion). ANNAHME: kleine SemVer-Teilmenge.
 */
export function satisfies(version: string, range: string): boolean {
  const v = parseVersion(version);
  if (!v) return false;
  return range.trim().split(/\s+/).every((part) => {
    if (part === "*" || part === "") return true;
    const op = /^(>=|<=|>|<|\^|~|=)?(.+)$/.exec(part)!;
    const r = parseVersion(op[2]!);
    if (!r) return false;
    const c = cmp(v, r);
    switch (op[1]) {
      case ">=": return c >= 0;
      case "<=": return c <= 0;
      case ">": return c > 0;
      case "<": return c < 0;
      case "^": return c >= 0 && v[0] === r[0];
      case "~": return c >= 0 && v[0] === r[0] && v[1] === r[1];
      default: return c === 0;
    }
  });
}

/**
 * ZIE-R35: Ladereihenfolge. Abhängigkeiten und loadAfter laden vor der Mod; sonst gilt die Reihenfolge des Spielers.
 * Mods mit fehlender Abhängigkeit, Konflikt oder Kreis werden abgeschaltet und gemeldet.
 */
export function orderMods(mods: readonly ModBundle[], gameVersion: string): { order: ModBundle[]; errors: ModError[] } {
  const errors: ModError[] = [];
  const err = (mod: string, where: string, problem: string) => errors.push({ mod, file: "mod.json", where, problem });
  let pool: ModBundle[] = [];
  const seen = new Set<string>();
  for (const m of mods) {
    const id = m.manifest.id;
    if (seen.has(id)) {
      err(id, "id", "doppelt geladen");
      continue;
    }
    seen.add(id);
    if (!satisfies(gameVersion, m.manifest.gameVersion)) {
      err(id, "gameVersion", `passt nicht zur Spielversion ${gameVersion}`);
      continue;
    }
    pool.push(m);
  }
  // Abhängigkeiten und Konflikte, bis sich nichts mehr ändert (eine abgeschaltete Mod kann andere mitnehmen).
  for (let changed = true; changed;) {
    changed = false;
    const ids = new Map(pool.map((m) => [m.manifest.id, m.manifest.version]));
    const next: ModBundle[] = [];
    for (const m of pool) {
      const missing = m.manifest.dependencies.find((d) => !ids.has(d.id) || !satisfies(ids.get(d.id)!, d.version));
      const clash = m.manifest.conflicts.find((c) => ids.has(c));
      if (missing) err(m.manifest.id, "dependencies", `braucht ${missing.id} ${missing.version}`);
      else if (clash) err(m.manifest.id, "conflicts", `verträgt sich nicht mit ${clash}`);
      else {
        next.push(m);
        continue;
      }
      changed = true;
    }
    pool = next;
  }
  // Stabile topologische Sortierung: immer die erste Mod (Spielerreihenfolge), deren Vorgänger schon geladen sind.
  const order: ModBundle[] = [];
  const placed = new Set<string>();
  const present = new Set(pool.map((m) => m.manifest.id));
  const before = (m: ModBundle) => [...m.manifest.dependencies.map((d) => d.id), ...m.manifest.loadAfter].filter((id) => present.has(id));
  let rest = [...pool];
  while (rest.length > 0) {
    const i = rest.findIndex((m) => before(m).every((id) => placed.has(id)));
    if (i < 0) {
      for (const m of rest) err(m.manifest.id, "loadAfter", "Kreis in Abhängigkeiten oder loadAfter");
      break;
    }
    const m = rest[i]!;
    order.push(m);
    placed.add(m.manifest.id);
    rest = rest.filter((_, k) => k !== i);
  }
  return { order, errors };
}

function getPath(o: Record<string, unknown>, path: string): unknown {
  let cur: unknown = o;
  for (const k of path.split(".")) {
    if (!isObject(cur) && !Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function setPath(o: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let cur: Record<string, unknown> = o;
  for (const k of keys.slice(0, -1)) cur = cur[k] as Record<string, unknown>;
  cur[keys[keys.length - 1]!] = value;
}

/** Ein geänderter Wert muss die Art des alten behalten (Zahl bleibt ganze Zahl, Liste bleibt Liste); neue Felder sind frei. */
function checkValue(file: string, where: string, old: unknown, value: unknown): void {
  if (old === undefined || old === null || value === null) return;
  if (kind(old) !== kind(value) && !(kind(old) === "int" && kind(value) === "number")) {
    throw new OpError(file, where, `erwartet ${kind(old)}, bekommen ${kind(value)}`);
  }
  if (kind(old) === "int" && kind(value) !== "int") throw new OpError(file, where, "erwartet eine ganze Zahl");
}

/** Felder, die jeder Datensatz einer Liste hat: ein neuer Datensatz braucht sie mit derselben Art (ZIE-R36, ANNAHME). */
function checkRecord(file: string, list: Record<string, unknown>[], r: Record<string, unknown>, where: string): void {
  if (list.length === 0) return;
  const common = Object.keys(list[0]!).filter((k) => list.every((x) => k in x));
  for (const k of common) {
    if (!(k in r)) throw new OpError(file, `${where}.${k}`, "Pflichtfeld fehlt");
    checkValue(file, `${where}.${k}`, list[0]![k], r[k]);
  }
}

interface Written {
  mod: string;
  value: unknown;
}

/** Wendet die Änderungen einer Mod auf die Dateien an (in place). Wirft OpError bei der ersten fehlerhaften Stelle. */
function applyMod(files: Record<string, unknown>, mod: ModBundle, written: Map<string, Written>, conflicts: ModConflict[]): void {
  const id = mod.manifest.id;
  const note = (file: string, record: string, field: string, value: unknown) => {
    const key = `${file}|${record}|${field}`;
    const prev = written.get(key);
    if (prev && prev.mod !== id && JSON.stringify(prev.value) !== JSON.stringify(value)) {
      conflicts.push({ file, record, field, first: { mod: prev.mod, value: prev.value }, second: { mod: id, value }, winner: id });
    }
    written.set(key, { mod: id, value });
  };
  for (const [file, raw] of Object.entries(mod.files)) {
    if (!(file in files)) throw new OpError(file, "", "unbekannte Datei");
    for (const [n, entry] of (Array.isArray(raw) ? raw : [raw]).entries()) {
      const at = Array.isArray(raw) ? `[${n}]` : "";
      if (!isObject(entry)) throw new OpError(file, at, "kein Objekt");
      const ops = entry as ModFileOps;
      const unknownKey = Object.keys(ops).find((k) => !["list", "add", "modify", "remove", "set"].includes(k));
      if (unknownKey) throw new OpError(file, `${at}.${unknownKey}`, "unbekannte Operation (add, modify, remove, set)");
      const root = files[file] as Record<string, unknown> | unknown[];
      if (ops.set) {
        if (Array.isArray(root)) throw new OpError(file, `${at}.set`, "Datei ist eine Liste; set gilt nur für Dateien mit Feldern");
        for (const [path, value] of Object.entries(ops.set)) {
          const old = getPath(root, path);
          const parent = path.includes(".") ? getPath(root, path.slice(0, path.lastIndexOf("."))) : root;
          if (!isObject(parent)) throw new OpError(file, `${at}.set.${path}`, "Pfad gibt es nicht");
          if (ops.list === undefined && Array.isArray(old) && old.some((x) => isObject(x) && "id" in x)) {
            throw new OpError(file, `${at}.set.${path}`, "Listen mit Kennungen ändert man mit list, add, modify, remove (ZIE-R34)");
          }
          checkValue(file, `${at}.set.${path}`, old, value);
          setPath(root, path, structuredClone(value));
          note(file, "", path, value);
        }
      }
      if (!ops.add && !ops.modify && !ops.remove) continue;
      const list = (ops.list === undefined ? root : (root as Record<string, unknown>)[ops.list]) as Record<string, unknown>[];
      if (!Array.isArray(list)) throw new OpError(file, `${at}.list`, ops.list === undefined ? "Datei ist keine Liste; list angeben" : `keine Liste ${ops.list}`);
      const listName = ops.list ?? "";
      const find = (rid: string) => list.findIndex((r) => recordId(file, r) === rid);
      for (const [i, rid] of (ops.remove ?? []).entries()) {
        const k = find(rid);
        if (k < 0) throw new OpError(file, `${at}.remove[${i}]`, `Datensatz ${rid} fehlt`);
        list.splice(k, 1);
        note(file, `${listName}:${rid}`, "*", "entfernt");
      }
      for (const [i, m] of (ops.modify ?? []).entries()) {
        if (!isObject(m) || typeof m.id !== "string" || !isObject(m.set)) throw new OpError(file, `${at}.modify[${i}]`, "erwartet { id, set }");
        const k = find(m.id);
        if (k < 0) throw new OpError(file, `${at}.modify[${i}]`, `Datensatz ${m.id} fehlt`);
        const rec = list[k]!;
        for (const [path, value] of Object.entries(m.set)) {
          if (path === "id") throw new OpError(file, `${at}.modify[${i}].set.id`, "die Kennung bleibt");
          const parent = path.includes(".") ? getPath(rec, path.slice(0, path.lastIndexOf("."))) : rec;
          if (!isObject(parent)) throw new OpError(file, `${at}.modify[${i}].set.${path}`, "Pfad gibt es nicht");
          checkValue(file, `${at}.modify[${i}].set.${path}`, getPath(rec, path), value);
          setPath(rec, path, structuredClone(value));
          note(file, `${listName}:${m.id}`, path, value);
        }
      }
      for (const [i, r] of (ops.add ?? []).entries()) {
        if (!isObject(r)) throw new OpError(file, `${at}.add[${i}]`, "kein Objekt");
        const rid = recordId(file, r);
        if (rid === null) throw new OpError(file, `${at}.add[${i}].id`, "Kennung fehlt");
        if (find(rid) >= 0) throw new OpError(file, `${at}.add[${i}]`, `Datensatz ${rid} gibt es schon; modify benutzen`);
        checkRecord(file, list, r, `${at}.add[${i}]`);
        list.push(structuredClone(r));
        note(file, `${listName}:${rid}`, "*", "neu");
      }
    }
  }
}

export interface ModLoadResult<T> {
  data: T;
  /** Dateien nach allen geladenen Mods. */
  files: Record<string, unknown>;
  /** Geladene Mods in Ladereihenfolge (ohne das Grundspiel). */
  active: ModManifest[];
  errors: ModError[];
  conflicts: ModConflict[];
  texts: { de: Record<string, string>; en: Record<string, string> };
}

/**
 * ZIE-R31 bis ZIE-R36: Grundspiel-Dateien plus Mods → Daten. `build` setzt die Dateien zu Spieldaten zusammen und wirft
 * bei ungültigen Daten (Prüfung des Grundspiels). Eine Mod, die dabei scheitert, wird gemeldet und abgeschaltet; das
 * Spiel startet ohne sie.
 */
export function loadWithMods<F extends Record<string, unknown>, T>(
  base: F, mods: readonly ModBundle[], gameVersion: string, build: (files: F) => T,
): ModLoadResult<T> {
  const errors: ModError[] = [];
  const valid: ModBundle[] = [];
  for (const m of mods) {
    const id = isObject(m) && isObject(m.manifest) && typeof m.manifest.id === "string" ? m.manifest.id : "?";
    const problems = isObject(m) ? manifestErrors(m.manifest) : [{ where: "", problem: "kein Mod-Paket" }];
    if (isObject(m) && !isObject(m.files)) problems.push({ where: "files", problem: "Objekt mit Dateipfaden fehlt" });
    if (isObject(m) && m.manifest?.tier === "code") problems.push({ where: "tier", problem: "Code-Mods kommen später" });
    if (problems.length > 0) {
      for (const p of problems) errors.push({ mod: id, file: "mod.json", ...p });
      continue;
    }
    valid.push(m);
  }
  const ordered = orderMods(valid, gameVersion);
  errors.push(...ordered.errors);
  let files = structuredClone(base);
  let data = build(structuredClone(files));
  const active: ModManifest[] = [];
  const conflicts: ModConflict[] = [];
  let written = new Map<string, Written>();
  const texts = { de: {} as Record<string, string>, en: {} as Record<string, string> };
  for (const m of ordered.order) {
    const trialFiles = structuredClone(files);
    const trialWritten = new Map(written);
    const trialConflicts: ModConflict[] = [];
    try {
      applyMod(trialFiles, m, trialWritten, trialConflicts);
      data = build(structuredClone(trialFiles));
    } catch (e) {
      const file = e instanceof OpError ? e.file : "";
      const where = e instanceof OpError ? e.where : "";
      errors.push({ mod: m.manifest.id, file, where, problem: e instanceof Error ? e.message : String(e) });
      continue;
    }
    files = trialFiles;
    written = trialWritten;
    conflicts.push(...trialConflicts);
    active.push(m.manifest);
    for (const lang of ["de", "en"] as const) Object.assign(texts[lang], m.texts?.[lang] ?? {});
  }
  return { data, files, active, errors, conflicts, texts };
}
