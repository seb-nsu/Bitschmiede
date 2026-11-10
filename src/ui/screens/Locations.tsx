// Standorte in der Firma-Ansicht (S07 FRM-R32 bis FRM-R34, FRM-R72; Etappe 6a.6).
import { useState } from "react";
import type { ViewModel } from "../../sim/view/view";
import type { Sim } from "../useSim";
import { fmtMoney, fmtPct } from "../format";
import type { Lang, T } from "../texts";

export function LocationsPanel({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const lv = view.locations;
  const [person, setPerson] = useState<number | null>(null);
  const [target, setTarget] = useState<number>(0);
  const [closing, setClosing] = useState<number | null>(null);
  if (!lv.unlocked) return null;
  return (
    <section className="panel" aria-labelledby="loc-title">
      <h2 id="loc-title">{t("location.title")}</h2>
      <table className="table">
        <thead>
          <tr><th>{t("location.region")}</th><th>{t("location.people")}</th><th>{t("location.wage")}</th><th>{t("location.subsidy")}</th><th>{t("location.tax")}</th><th /></tr>
        </thead>
        <tbody>
          {lv.list.map((l) => (
            <tr key={l.id}>
              <td>{t(`region.${l.region}`)}{l.id === 0 && <span className="muted small"> · {t("location.home")}</span>}{l.ready && <span className="badge"> {t("location.building", { week: l.ready.weekOfYear + 1, year: l.ready.year })}</span>}</td>
              <td>{l.people} / {l.places}</td>
              <td>{fmtPct(l.wageFactorBp, lang)}</td>
              <td>{fmtPct(l.subsidyBp, lang)}</td>
              <td>{fmtPct(l.taxRateBp, lang)}</td>
              <td>{l.id !== 0 && (closing === l.id ? (
                <>
                  <button type="button" className="primary" onClick={() => { sim.input({ type: "location", action: "schliessen", locationId: l.id }); setClosing(null); }}>{t("location.closeConfirm")}</button>
                  <button type="button" onClick={() => setClosing(null)}>{t("form.cancel")}</button>
                </>
              ) : <button type="button" title={t("location.closeHint")} onClick={() => setClosing(l.id)}>{t("location.close")}</button>)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {lv.regions.length > 0 && (
        <div className="vcard-actions">
          {lv.regions.map((r) => (
            <button key={r.id} type="button" disabled={r.blocked !== null} title={r.blocked ? t(r.blocked) : t("location.openHint", { wage: fmtPct(r.wageFactorBp, lang), subsidy: fmtPct(r.subsidyBp, lang), tax: fmtPct(r.taxRateBp, lang) })}
              onClick={() => sim.input({ type: "location", action: "eroeffnen", region: r.id })}>
              {t("location.open", { region: t(`region.${r.id}`), cost: fmtMoney(r.costCent, lang) })}
            </button>
          ))}
        </div>
      )}
      {lv.list.length > 1 && (
        <div className="vcard-actions">
          <label>{t("location.move")}{" "}
            <select value={person ?? ""} onChange={(e) => setPerson(e.target.value === "" ? null : Number(e.target.value))}>
              <option value="">–</option>
              {view.people.map((p) => <option key={p.id} value={p.id}>{p.name} ({t(`region.${lv.list.find((l) => l.id === p.locationId)?.region ?? "na"}`)})</option>)}
            </select>
          </label>
          <select aria-label={t("location.to")} value={target} onChange={(e) => setTarget(Number(e.target.value))}>
            {lv.list.map((l) => <option key={l.id} value={l.id}>{t(`region.${l.region}`)}</option>)}
          </select>
          <button type="button" disabled={person === null} title={t("location.moveHint")} onClick={() => person !== null && sim.input({ type: "location", action: "versetzen", personId: person, locationId: target })}>{t("location.moveDo")}</button>
        </div>
      )}
    </section>
  );
}
