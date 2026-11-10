// Startet die Desktop-Hülle. Entfernt ELECTRON_RUN_AS_NODE, das manche Umgebungen (z. B. Erweiterungen
// in VS Code) setzen; damit liefe Electron sonst als reines Node.js und öffnete kein Fenster.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const electronBinary = require("electron");
const projectDir = join(dirname(fileURLToPath(import.meta.url)), "..");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, [projectDir, ...process.argv.slice(2)], { stdio: "inherit", env });
child.on("exit", (code) => process.exit(code ?? 0));
