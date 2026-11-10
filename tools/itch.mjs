/* global process */
// Packs dist/ as a ZIP for a browser upload (itch.io: "This file will be played in the browser").
// Run `npm run itch`; it builds first. Uses `zip` if present, otherwise `tar -a` (Windows 10+, macOS).
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const out = join(root, "release", "bitschmiede-web.zip");
if (!existsSync(join(dist, "index.html"))) throw new Error("dist/index.html fehlt – erst bauen (npm run build).");
execSync(`node -e "require('fs').mkdirSync('release',{recursive:true})"`, { cwd: root });
if (existsSync(out)) rmSync(out);
const has = (cmd) => { try { execSync(`${cmd} --version`, { stdio: "ignore" }); return true; } catch { return false; } };
if (has("zip")) execSync(`zip -qr "${out}" .`, { cwd: dist, stdio: "inherit" });
else execSync(`tar -a -c -f "${out}" *`, { cwd: dist, stdio: "inherit", shell: true });
process.stdout.write(`Fertig: ${out}\n`);
