// Börse in der Firma-Ansicht (S07 FRM-R51 bis FRM-R54, FRM-R74, FRM-R75; Etappe 6b.2): Börsengang mit Bedingungen,
// Anlegerstimmung mit Zielmarke, Kurs, Dividende und der Wasserfall des Firmenwerts (S09).
import { useState } from "react";
import type { ViewModel } from "../../sim/view/view";
import type { Sim } from "../useSim";
import { fmtMoney, fmtPct } from "../format";
import type { Lang, T } from "../texts";

export function StockPanel({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const s = view.stock;
  const [share, setShare] = useState(2000);
  if (!s.visible) return null;
  const v = s.value;
  return (
    <section className="panel" aria-labelledby="stock-title">
      <h2 id="stock-title">{t("stock.title")}</h2>
      <details className="small">
        <summary>{t("stock.value", { value: fmtMoney(v.totalCent, lang) })}</summary>
        <ul className="wf">
          {(["earningsCent", "brandsCent", "techCent", "teamCent"] as const).map((k) => (
            <li key={k}><span>{t(`value.${k}`)}</span> <span className="wf-pos">+{fmtMoney(v[k], lang)}</span></li>
          ))}
          <li><span>{t("value.debtCent")}</span> <span className="wf-neg">−{fmtMoney(v.debtCent, lang)}</span></li>
        </ul>
      </details>
      {!s.listed ? (
        <>
          {s.blockers.length > 0 ? (
            <ul className="small muted">
              {s.blockers.map((b) => <li key={b}>{t(b, { revenue: fmtMoney(s.minRevenueCent, lang) })}</li>)}
            </ul>
          ) : <p className="small">{t("stock.ready")}</p>}
          <div className="vcard-actions small">
            <label>{t("stock.share")}{" "}
              <select value={share} onChange={(e) => setShare(Number(e.target.value))}>
                {s.proceeds.map((p) => <option key={p.shareBp} value={p.shareBp}>{fmtPct(p.shareBp, lang)} · {fmtMoney(p.cent, lang)}</option>)}
              </select>
            </label>{" "}
            <button type="button" className="primary" disabled={s.blockers.length > 0} onClick={() => sim.input({ type: "ipo", shareBp: share })}>{t("stock.ipo")}</button>
          </div>
        </>
      ) : (
        <>
          <p>
            <strong>{t("stock.sentiment", { n: s.sentiment })}</strong> · {t(`stock.mood.${s.mood}`)} · {t("stock.price", { price: fmtMoney(s.priceCent, lang) })}
            {" · "}{t("stock.own", { pct: fmtPct(s.ownShareBp, lang) })}
          </p>
          <p className="small">{t(s.basis === "umsatz" ? "stock.targetRevenue" : "stock.target", { target: fmtMoney(s.targetCent, lang) })}{s.savings ? ` · ${t("stock.savings")}` : ""}</p>
          {s.history.length > 0 && (
            <table className="table small">
              <thead><tr><th>{t("stock.quarter")}</th><th>{t(s.basis === "umsatz" ? "stock.revenue" : "stock.profit")}</th><th>{t("stock.sentimentShort")}</th><th>{t("stock.priceShort")}</th></tr></thead>
              <tbody>
                {s.history.slice(-6).reverse().map((h) => (
                  <tr key={h.label}><td>{h.label}</td><td>{fmtMoney(s.basis === "umsatz" ? h.revenueCent ?? 0 : h.profitCent, lang)}</td><td>{h.sentiment}</td><td>{fmtMoney(h.priceCent, lang)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {s.hostile && (
            <div className="callout" role="alert">
              <strong>{t("hostile.bid", { raider: s.hostile.raider || t("hostile.fund"), price: fmtMoney(s.hostile.priceCent, lang) })}</strong>
              <p className="small">{t("hostile.explain", { n: s.hostile.weeksLeft, majority: fmtPct(s.majorityBp, lang) })}</p>
              <button type="button" className="primary" onClick={() => sim.input({ type: "stockDefense", action: "abwehr" })}>{t("hostile.defend", { cost: fmtMoney(s.hostile.defendCent, lang) })}</button>
            </div>
          )}
          {s.ownShareBp <= s.majorityBp && !s.hostile && <p className="small error">{t("hostile.risk", { majority: fmtPct(s.majorityBp, lang) })}</p>}
          <div className="vcard-actions small">
            <label>
              <input type="checkbox" checked={s.protection} onChange={(e) => sim.input({ type: "stockDefense", action: "schutz", active: e.target.checked })} />{" "}
              {t("hostile.protection")}
            </label>
            <span className="muted"> {t("hostile.protectionHint")}</span>
          </div>
          <div className="vcard-actions small">
            {t("hostile.buyback")}{" "}
            {s.buyback.map((b) => (
              <button key={b.shareBp} type="button" onClick={() => sim.input({ type: "stockDefense", action: "rueckkauf", shareBp: b.shareBp })}>
                {fmtPct(b.shareBp, lang)} · {fmtMoney(b.costCent, lang)}
              </button>
            ))}
          </div>
          <div className="vcard-actions small">
            <label>{t("stock.dividend")}{" "}
              <select value={s.dividend} onChange={(e) => sim.input({ type: "dividend", level: e.target.value as typeof s.dividend })}>
                {(["keine", "niedrig", "hoch"] as const).map((l) => <option key={l} value={l}>{t(`stock.dividend.${l}`)}</option>)}
              </select>
            </label>
          </div>
        </>
      )}
    </section>
  );
}
