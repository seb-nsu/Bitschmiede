// ZIE-R39 ohne Steam: packt einen Mod-Ordner zu einer Mod-Datei, die das Spiel im Startbildschirm einliest.
// Aufbau des Ordners: mod.json (Manifest, ZIE-R33), data/<Pfad wie unter data/base>.json (Operationen, ZIE-R34),
// optional texts/de.json und texts/en.json (Stufe Inhalte). Die Mod wird gegen das Grundspiel geprüft (ZIE-R36).
// Aufruf: npm run mod:pack -- <Ordner> [Ausgabedatei]
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { loadData } from "../src/mods/loadBase";
import type { ModBundle } from "../src/mods/modding";

function walk(dir: string): string[] {
  return readdirSync(dir).sort().flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".json") ? [p] : [];
  });
}

const [dir, outArg] = process.argv.slice(2);
if (!dir) {
  console.error("Aufruf: npm run mod:pack -- <Ordner> [Ausgabedatei]");
  process.exit(2);
}
const read = (p: string): unknown => JSON.parse(readFileSync(p, "utf8"));
const bundle: ModBundle = { manifest: read(join(dir, "mod.json")) as ModBundle["manifest"], files: {} };
const dataDir = join(dir, "data");
if (existsSync(dataDir)) {
  for (const f of walk(dataDir)) bundle.files[relative(dataDir, f).split(sep).join("/")] = read(f) as ModBundle["files"][string];
}
for (const lang of ["de", "en"] as const) {
  const p = join(dir, "texts", `${lang}.json`);
  if (existsSync(p)) (bundle.texts ??= {})[lang] = read(p) as Record<string, string>;
}
const result = loadData([bundle]);
for (const e of result.errors) console.error(`Fehler: ${e.file || "mod.json"} (${e.where || "–"}): ${e.problem}`);
if (result.active.length === 0) process.exit(1);
const out = outArg ?? `${bundle.manifest.id}-${bundle.manifest.version}.json`;
writeFileSync(out, `${JSON.stringify(bundle, null, 2)}\n`);
console.log(`Mod ${bundle.manifest.id} ${bundle.manifest.version} geprüft und gepackt: ${out}`);
