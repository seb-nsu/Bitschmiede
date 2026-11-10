// Mod-Verwaltung im Startbildschirm (S10 ZIE-R31 bis ZIE-R39): Mod-Dateien einlesen, an- und abschalten, Reihenfolge,
// Fehler mit Datei und Stelle, Konflikte mit Feld, Werten und Gewinner, Hinweis auf die Erfolgssperre.
// ANNAHME (ZIE-R39 ohne Steam): Der „Mod-Ordner“ ist im Browser der Speicher des Browsers; Mods kommen als eine
// JSON-Datei (Paket), die `npm run mod:pack` aus einem Ordner baut.
import { useEffect, useRef, useState } from "react";
import type { ModBundle } from "../../mods/modding";
import type { Sim } from "../useSim";
import type { T } from "../texts";

interface Stored {
  bundle: ModBundle;
  enabled: boolean;
}

const KEY = "gst.mods";

function readStored(): Stored[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored[]).filter((x) => x && x.bundle && x.bundle.manifest) : [];
  } catch {
    return [];
  }
}

function writeStored(list: Stored[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Ohne Speicher gelten die Mods nur für diese Sitzung.
  }
}

function fmtValue(v: unknown): string {
  const s = JSON.stringify(v);
  return s.length > 40 ? `${s.slice(0, 37)}…` : s;
}

export function ModManager({ sim, t }: { sim: Sim; t: T }) {
  const [list, setList] = useState<Stored[]>(readStored);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { setMods } = sim;

  useEffect(() => {
    writeStored(list);
    setMods(list.filter((x) => x.enabled).map((x) => x.bundle));
  }, [list, setMods]);

  const importFiles = async (files: FileList | null) => {
    if (!files) return;
    setImportError(null);
    let next = [...list];
    for (const file of [...files]) {
      try {
        const bundle = JSON.parse(await file.text()) as ModBundle;
        if (!bundle || typeof bundle !== "object" || !bundle.manifest || typeof bundle.manifest.id !== "string") throw new Error("manifest");
        const at = next.findIndex((x) => x.bundle.manifest.id === bundle.manifest.id);
        // Gleiche Kennung: neue Version ersetzt die alte an ihrem Platz.
        if (at >= 0) next[at] = { bundle, enabled: next[at]!.enabled };
        else next = [...next, { bundle, enabled: true }];
      } catch {
        setImportError(t("mods.importError", { file: file.name }));
      }
    }
    setList(next);
    if (fileRef.current) fileRef.current.value = "";
  };

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setList(next);
  };

  const result = sim.mods;
  const balance = result?.active.some((m) => m.affectsBalance) ?? false;
  return (
    <details className="panel mods" open={list.length > 0}>
      <summary><strong>{t("mods.title")}</strong>{result && result.active.length > 0 ? ` · ${t("mods.activeCount", { n: result.active.length })}` : ""}</summary>
      <p className="small muted">{t("mods.intro")}</p>
      <label className="small">{t("mods.import")}{" "}
        <input ref={fileRef} type="file" accept=".json,application/json" multiple onChange={(e) => void importFiles(e.target.files)} />
      </label>
      {importError && <p className="error small" role="alert">{importError}</p>}
      {list.length === 0 ? <p className="small muted">{t("mods.none")}</p> : (
        <ol className="mod-list">
          {list.map((x, i) => {
            const m = x.bundle.manifest;
            const active = result?.active.some((a) => a.id === m.id) ?? false;
            const errors = result?.errors.filter((e) => e.mod === m.id) ?? [];
            return (
              <li key={m.id} className="vcard small">
                <label>
                  <input type="checkbox" checked={x.enabled} onChange={(e) => setList(list.map((y, k) => (k === i ? { ...y, enabled: e.target.checked } : y)))} />{" "}
                  <strong>{m.name}</strong> {m.version} · {m.author} · {t(`mods.tier.${m.tier}`)}
                  {m.affectsBalance ? ` · ${t("mods.balance")}` : ` · ${t("mods.cosmetic")}`}
                </label>
                <p className="muted">{m.description}</p>
                <p>
                  {!x.enabled ? <span className="muted">{t("mods.off")}</span>
                    : active ? <span className="wf-pos">{t("mods.loaded")}</span>
                    : errors.length > 0 ? <span className="error">{t("mods.failed")}</span>
                    : <span className="muted">{t("mods.waiting")}</span>}
                </p>
                {errors.length > 0 && (
                  <ul className="error">
                    {errors.map((e, k) => <li key={k}>{t("mods.error", { file: e.file || "–", where: e.where || "–", problem: e.problem })}</li>)}
                  </ul>
                )}
                <div className="vcard-actions">
                  <button type="button" disabled={i === 0} aria-label={t("mods.up", { name: m.name })} onClick={() => move(i, -1)}>▲</button>{" "}
                  <button type="button" disabled={i === list.length - 1} aria-label={t("mods.down", { name: m.name })} onClick={() => move(i, 1)}>▼</button>{" "}
                  <button type="button" onClick={() => setList(list.filter((_, k) => k !== i))}>{t("mods.remove")}</button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {result && result.conflicts.length > 0 && (
        <>
          <h3 className="small">{t("mods.conflicts")}</h3>
          <ul className="small">
            {result.conflicts.map((c, k) => (
              <li key={k}>{t("mods.conflict", {
                file: c.file, record: c.record || "–", field: c.field, a: c.first.mod, va: fmtValue(c.first.value), b: c.second.mod, vb: fmtValue(c.second.value), winner: c.winner,
              })}</li>
            ))}
          </ul>
        </>
      )}
      {balance && <p className="small">{t("mods.achievementLock")}</p>}
      <p className="small muted">{t("mods.order")}</p>
    </details>
  );
}
