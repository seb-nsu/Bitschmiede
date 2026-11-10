// Desktop-Hülle (S12 Abschnitt 3 und 5.8: Electron als Ausweichweg zu Tauri, ohne Umbau des Spiels).
// Liefert den Vite-Build aus dist/ über das eigene Protokoll app:// aus, damit Module-Worker und
// eine strenge Content-Security-Policy funktionieren; file:// wird nicht verwendet.
import { app, BrowserWindow, Menu, net, protocol, shell } from "electron";
import { existsSync } from "node:fs";
import { dirname, join, normalize, relative, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = join(here, "..", "dist");
const SCHEME = "app";
const HOST = "game";

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "worker-src 'self'",
  // React setzt Breiten und Positionen als style-Attribute.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

/** Pfad innerhalb von dist/ auflösen; alles außerhalb wird abgewiesen. */
function resolveInDist(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const target = normalize(join(distDir, decoded === "/" ? "index.html" : decoded));
  const rel = relative(distDir, target);
  if (rel.startsWith("..") || isAbsolute(rel)) return null;
  return target;
}

async function serve(request) {
  const url = new URL(request.url);
  if (url.host !== HOST) return new Response("Not found", { status: 404 });
  const file = resolveInDist(url.pathname);
  if (!file || !existsSync(file)) return new Response("Not found", { status: 404 });
  const res = await net.fetch(pathToFileURL(file).toString());
  const headers = new Headers(res.headers);
  headers.set("Content-Security-Policy", CSP);
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(res.body, { status: res.status, headers });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "Bitschmiede",
    backgroundColor: "#f6f5f2",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Ein fester Seed-Ablauf soll nicht durch Drosselung im Hintergrund verzerrt werden.
      backgroundThrottling: false,
    },
  });
  // Nur das eigene Spiel laden; externe Links gehen in den Standardbrowser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${SCHEME}://${HOST}/`)) event.preventDefault();
  });
  void win.loadURL(`${SCHEME}://${HOST}/index.html`);
  return win;
}

app.whenReady().then(() => {
  if (!existsSync(join(distDir, "index.html"))) {
    console.error("dist/index.html fehlt. Bitte zuerst 'npm run build' ausführen oder 'npm run desktop' nutzen.");
    app.exit(1);
    return;
  }
  protocol.handle(SCHEME, serve);
  Menu.setApplicationMenu(null);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
