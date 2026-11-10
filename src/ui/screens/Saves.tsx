// Spielstände (TEC-R40 bis TEC-R43): Liste, Speichern, Laden, Löschen, Export und Import als Datei.
import { useEffect, useState } from "react";
import type { Sim } from "../useSim";
import { fmtMoney } from "../format";
import type { Lang, T } from "../texts";

/** KRN-R54: In einer laufenden Ironman-Partie (ironman) speichert der Knopf in den einzigen Platz, Laden ist gesperrt. */
export function SaveDialog({ sim, t, lang, canSave, ironman = false, onClose }: { sim: Sim; t: T; lang: Lang; canSave: boolean; ironman?: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const { listSaves } = sim;
  useEffect(() => listSaves(), [listSaves]);
  const slotName = name.trim().toLowerCase().replace(/[^a-z0-9äöüß-]+/g, "-").slice(0, 30);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    sim.importSave(new Uint8Array(await file.arrayBuffer()));
    onClose();
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="saves-title">
      <div className="panel saves">
        <div className="studio-head">
          <h2 id="saves-title">{t("save.title")}</h2>
          <button type="button" onClick={onClose}>{t("save.close")}</button>
        </div>
        {ironman && (
          <div className="save-new">
            <p className="small">{t("save.ironman")}</p>
            <button type="button" className="primary" onClick={() => sim.save("ironman")}>{t("save.save")}</button>
          </div>
        )}
        {canSave && !ironman && (
          <div className="save-new">
            <label>
              {t("save.name")}
              <input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder={t("save.namePlaceholder")} />
            </label>
            <button type="button" className="primary" disabled={slotName === "" || slotName.startsWith("auto-")} onClick={() => sim.save(slotName)}>
              {t("save.save")}
            </button>
          </div>
        )}
        {sim.slots.length === 0 ? <p className="muted">{t("save.empty")}</p> : (
          <table className="products">
            <thead>
              <tr><th>{t("save.slot")}</th><th>{t("save.when")}</th><th>{t("save.year")}</th><th>{t("money.cash")}</th><th /></tr>
            </thead>
            <tbody>
              {sim.slots.map((s) => (
                <tr key={s.slot}>
                  <td>{s.slot.startsWith("auto-") ? t("save.auto", { n: s.slot.slice(5) }) : s.meta.ironman ? `${t("save.ironmanSlot")} ${s.meta.seed}` : s.slot}<div className="muted small">{t("save.released", { n: s.meta.released })}</div></td>
                  <td className="num">{new Date(s.savedAt).toLocaleString(lang === "de" ? "de-DE" : "en-US")}</td>
                  <td className="num">{s.meta.year}</td>
                  <td className="num">{fmtMoney(s.meta.moneyCent, lang)}</td>
                  <td className="num save-actions">
                    <button type="button" disabled={ironman} onClick={() => { sim.load(s.slot); onClose(); }}>{t("save.load")}</button>
                    <button type="button" onClick={() => sim.exportSave(s.slot)}>{t("save.export")}</button>
                    <button type="button" onClick={() => sim.deleteSave(s.slot)} aria-label={t("save.delete", { slot: s.slot })}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!ironman && (
          <label className="save-import">
            {t("save.import")} <input type="file" accept=".gz,application/gzip" onChange={(e) => void onImport(e.target.files?.[0])} />
          </label>
        )}
      </div>
    </div>
  );
}
