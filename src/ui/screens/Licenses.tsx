// Lizenzmarkt in der Engine-Werkstatt (S04 Abschnitt 8): eigene Engine als Lizenzgeber mit Modell, Vorlagen und
// Kunden; fremde Engines mit Vertrauen, Konditionen und dem eigenen Vertrag. Die volle Steckleiste folgt in 3.11.
import { useState } from "react";
import type { LicenseModel, LicenseTemplateId, LicenseTerms } from "../../sim/model/types";
import type { ViewModel } from "../../sim/view/view";
import type { Sim } from "../useSim";
import { fmtFactor, fmtMoney, fmtPct } from "../format";
import type { Lang, T } from "../texts";
import { useLimit } from "../more";

const MODELS: LicenseModel[] = ["hausintern", "kommerziell", "indie", "open_source"];

function statusLamp(status: string): string {
  return status === "zufrieden" ? "●" : status === "sicher" ? "◐" : status === "gefaehrdet" ? "▲" : status === "abwandernd" ? "✕" : "○";
}

/** Konditionen kurz: nur Bestandteile, die nicht null sind (Übersichtlichkeit). */
function termsText(x: LicenseTerms, t: T, lang: Lang): string {
  const parts: string[] = [];
  if (x.royaltyBp > 0) parts.push(t("license.part.royalty", { royalty: fmtPct(x.royaltyBp, lang) }) + (x.royaltyThresholdCent > 0 ? ` ${t("license.part.threshold", { threshold: fmtMoney(x.royaltyThresholdCent, lang) })}` : ""));
  if (x.flatFeeCent > 0) parts.push(t("license.part.flat", { flat: fmtMoney(x.flatFeeCent, lang) }));
  if (x.seatFeeCent > 0) parts.push(t("license.part.seat", { seat: fmtMoney(x.seatFeeCent, lang) }));
  return parts.length > 0 ? parts.join(", ") : "–";
}

function TemplateEditor({ id, terms, sim, t }: { id: LicenseTemplateId; terms: LicenseTerms; sim: Sim; t: T }) {
  const [royalty, setRoyalty] = useState(String(terms.royaltyBp / 100));
  const [flat, setFlat] = useState(String(Math.round(terms.flatFeeCent / 100)));
  const [existing, setExisting] = useState(false);
  const next: LicenseTerms = {
    ...terms,
    royaltyBp: Math.max(0, Math.min(3000, Math.round(Number(royalty) * 100) || 0)),
    flatFeeCent: Math.max(0, Math.round(Number(flat) || 0) * 100),
  };
  return (
    <tr>
      <th scope="row">{t(`license.template.${id}`)}</th>
      <td><input type="number" min={0} max={30} step={0.5} value={royalty} onChange={(e) => setRoyalty(e.target.value)} aria-label={t("license.royalty")} /> %</td>
      <td><input type="number" min={0} step={1000} value={flat} onChange={(e) => setFlat(e.target.value)} aria-label={t("license.flat")} /></td>
      <td>
        <label className="small"><input type="checkbox" checked={existing} onChange={(e) => setExisting(e.target.checked)} /> {t("license.applyExisting")}</label>{" "}
        <button type="button" className="topbar-btn" title={existing ? t("license.trustWarning") : undefined}
          onClick={() => sim.input({ type: "setLicenseTemplate", template: id, terms: next, applyToExisting: existing })}>{t("license.save")}</button>
      </td>
    </tr>
  );
}

export function LicensePanels({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const l = view.licensing;
  const own = l.own;
  const { shown, toggle } = useLimit(l.market, 8, t);
  // Prüfung Fable 03.11.2026: Die Qualitätsspalte nur, wenn sie streut; sonst sagt sie nichts.
  const showQuality = new Set(l.market.map((e) => Math.round(e.factorBp / 100))).size > 1;
  return (
    <>
      {own && (own.model !== "hausintern" || l.unlocked) && (
        <section className="panel" aria-labelledby="license-own-title">
          <h2 id="license-own-title">{t("license.ownTitle")}</h2>
          <p className="small">
            <label>{t("license.model")}{" "}
              <select value={own.model} onChange={(e) => sim.input({ type: "setLicenseModel", model: e.target.value as LicenseModel })}>
                {MODELS.map((m) => <option key={m} value={m}>{t(`license.model.${m}`)}</option>)}
              </select>
            </label>{" "}
            · {t("license.trust", { n: Math.round(own.trustBp / 100) })} · {t("license.revenue12", { cent: fmtMoney(own.revenue12Cent, lang) })}
          </p>
          {/* Prüfung Fable 03.11.2026 (LIZ-R01): eine Vorlage mit Royalty und Pauschale; Indie, Premium und Abo laufen mit der Voreinstellung. */}
          <table className="ledger">
            <thead>
              <tr><th>{t("license.col.template")}</th><th>{t("license.royalty")}</th><th>{t("license.flat")}</th><th /></tr>
            </thead>
            <tbody>
              {own.templates.filter((x) => x.id === "standard").map((x) => <TemplateEditor key={`${x.id}-${x.terms.royaltyBp}-${x.terms.flatFeeCent}`} id={x.id} terms={x.terms} sim={sim} t={t} />)}
            </tbody>
          </table>
          <p className="small muted">{t("license.presetsHint")}</p>
          {/* S13 AUS-R70 (Prüfung Fable: Schalter an der Lizenzvorlage statt eigenem Markt). */}
          <p className="small">
            <label>
              <input type="checkbox" checked={own.moduleOffer.active} onChange={(e) => sim.input({ type: "setModuleOffer", active: e.target.checked })} />{" "}
              {t("license.moduleOffer")}
            </label>
            <span className="muted"> · {t("license.moduleOfferHint")}</span>
          </p>
          {own.moduleOffer.customers.length > 0 && (
            <p className="small">{t("license.moduleCustomers")}: {own.moduleOffer.customers.map((c) => `${c.studio} (${t(`module.${c.module}`)}, ${fmtMoney(c.feeCent, lang)})`).join(" · ")}</p>
          )}
          <h3>{t("license.customers", { n: own.contracts.filter((c) => c.status !== "beendet").length })}</h3>
          {own.contracts.length === 0 && <p className="muted">{t("license.noCustomers")}</p>}
          {own.contracts.length > 0 && (
            <table className="ledger">
              <thead>
                <tr><th>{t("license.col.customer")}</th><th>{t("license.col.template")}</th><th>{t("license.col.status")}</th><th>{t("license.col.satisfaction")}</th><th>{t("license.col.revenue")}</th></tr>
              </thead>
              <tbody>
                {own.contracts.map((c) => (
                  <tr key={c.id}>
                    <th scope="row">{c.partner}</th>
                    <td>{t(`license.template.${c.template}`)} · {fmtPct(c.terms.royaltyBp, lang)}</td>
                    <td><span aria-hidden>{statusLamp(c.status)}</span> {t(`license.status.${c.status}`)} · <span className="muted">{t(c.reason)}</span></td>
                    <td>{Math.round(c.satisfactionBp / 100)}</td>
                    <td className="num">{fmtMoney(c.revenue12Cent, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
      <section className="panel" aria-labelledby="license-market-title">
        <h2 id="license-market-title">{t("license.marketTitle")}</h2>
        <p className="muted small">{t("license.marketHint", { pct: fmtPct(l.licensedShareBp, lang) })}</p>
        {l.market.length === 0 && <p className="muted">{t("license.noMarket")}</p>}
        {l.market.length > 0 && (
          <table className="ledger">
            <thead>
              <tr><th>{t("license.col.engine")}</th>{showQuality && <th>{t("license.col.quality")}</th>}<th>{t("license.col.trust")}</th><th>{t("license.col.offers")}</th><th>{t("license.col.contract")}</th></tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.id}>
                  <th scope="row">{e.name} <span className="muted small">({t(`license.style.${e.style}`)}, {t("license.customersShort", { n: e.customers })})</span></th>
                  {showQuality && <td>{fmtFactor(e.factorBp, lang)}</td>}
                  <td>{Math.round(e.trustBp / 100)}</td>
                  <td className="small">
                    {e.templates.map((x) => <div key={x.id}>{t(`license.template.${x.id}`)}: {termsText(x.terms, t, lang)}</div>)}
                  </td>
                  <td className="small">{e.contract ? `${t(`license.template.${e.contract.template}`)} · ${fmtPct(e.contract.terms.royaltyBp, lang)} · ${t(`license.status.${e.contract.status}`)}` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {toggle}
      </section>
    </>
  );
}
