// Markenmarkt (S04 Abschnitt 13): eigene Marken anbieten (LIZ-M17), fremde lizenzieren oder kaufen, eigene Lizenzen.
import { useState } from "react";
import type { ViewModel } from "../../sim/view/view";
import type { BrandOfferView } from "../../sim/view/markenmarktView";
import type { BrandTemplate } from "../../sim/model/types";
import type { Sim } from "../useSim";
import { fmtInt, fmtMoney, fmtPct, fmtScore } from "../format";
import type { Lang, T } from "../texts";
import { useLimit } from "../more";

function terms(o: BrandOfferView, t: T, lang: Lang): string {
  if (o.form === "komplettverkauf") return t("brandMarket.price", { price: fmtMoney(o.priceCent, lang) });
  return t("brandMarket.terms", {
    flat: fmtMoney(o.flatCent, lang), royalty: fmtPct(o.royaltyBp, lang), games: o.gamesMax, years: o.years, score: fmtScore(o.minScoreBp, lang),
  });
}

function genres(list: string[], t: T): string {
  return list.map((g) => t(`genre.${g}`)).join(", ");
}

type Own = ViewModel["brandMarket"]["own"][number];

function OwnDeals({ b, sim, t, lang }: { b: Own; sim: Sim; t: T; lang: Lang }) {
  return (
    <li>
      <strong>{b.name}</strong>
      {b.offers.map((o) => (
        <div key={o.id}>
          {t(`brandMarket.form.${o.form}`)}{o.form === "lizenzspiel" && ` (${t(`brandMarket.template.${o.template}`)})`} · {terms(o, t, lang)}
          <span className="muted"> · {t("brandMarket.weeksLeft", { n: o.weeksLeft })}</span>{" "}
          <button type="button" className="linklike" onClick={() => sim.input({ type: "withdrawBrandOffer", offerId: o.id })}>{t("brandMarket.withdraw")}</button>
        </div>
      ))}
      {b.licensees.length > 0 && (
        <div className="muted">
          {t("brandMarket.licensees")}:{" "}
          {b.licensees.map((l) => t("brandMarket.licenseeLine", {
            partner: l.partner, genres: genres(l.genres, t), made: l.gamesMade, allowed: l.gamesAllowed, weeks: l.weeksLeft, income: fmtMoney(l.incomeCent, lang),
          })).join(" · ")}
        </div>
      )}
    </li>
  );
}

/** Eine Eingabezeile für alle eigenen Marken statt Bedienelementen je Marke (Übersichtlichkeit). */
function OfferForm({ own, sim, t, lang, templates }: { own: Own[]; sim: Sim; t: T; lang: Lang; templates: BrandTemplate[] }) {
  const [brandId, setBrandId] = useState(own[0]!.id);
  const [template, setTemplate] = useState<BrandTemplate>("offen");
  const [factor, setFactor] = useState(100);
  const b = own.find((x) => x.id === brandId) ?? own[0]!;
  return (
    <div className="small brand-offer-form">
      <label>
        {t("brandMarket.offerFor")}{" "}
        <select value={b.id} onChange={(e) => setBrandId(Number(e.target.value))}>
          {own.map((x) => <option key={x.id} value={x.id}>{x.name} · {fmtMoney(x.valueCent, lang)}</option>)}
        </select>
      </label>{" "}
      <select value={template} onChange={(e) => setTemplate(e.target.value as BrandTemplate)} aria-label={t("brandMarket.templateLabel")}>
        {templates.map((x) => <option key={x} value={x}>{t(`brandMarket.template.${x}`)}</option>)}
      </select>{" "}
      <button type="button" className="topbar-btn" disabled={b.blocked.lizenzspiel !== null} title={b.blocked.lizenzspiel ? t(b.blocked.lizenzspiel) : undefined}
        onClick={() => sim.input({ type: "offerBrand", brandId: b.id, form: "lizenzspiel", template, genre: null, priceFactorBp: 10000 })}>
        {t("brandMarket.offerLicense")}
      </button>{" "}
      <label>
        {t("brandMarket.priceFactor")}{" "}
        <input type="range" min={50} max={150} step={10} value={factor} onChange={(e) => setFactor(Number(e.target.value))} /> {factor} %
      </label>{" "}
      <button type="button" className="topbar-btn" disabled={b.blocked.komplettverkauf !== null} title={b.blocked.komplettverkauf ? t(b.blocked.komplettverkauf) : undefined}
        onClick={() => sim.input({ type: "offerBrand", brandId: b.id, form: "komplettverkauf", template: "offen", genre: null, priceFactorBp: factor * 100 })}>
        {t("brandMarket.offerSale")}
      </button>
    </div>
  );
}

/** Franchise-Cockpit: eigene Marken anbieten (LIZ-M17) mit Angeboten und Lizenznehmern. */
export function BrandMarketPanel({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const m = view.brandMarket;
  const deals = m.own.filter((b) => b.offers.length > 0 || b.licensees.length > 0);
  return (
    <section className="panel" aria-labelledby="brandmarket-title">
      <h2 id="brandmarket-title">{t("brandMarket.title")}</h2>
      {!m.unlocked && <p className="muted small">{t("brandMarket.locked", { year: m.fromYear })}</p>}
      {m.unlocked && m.own.length > 0 && (
        <>
          <h3>{t("brandMarket.own")}</h3>
          <OfferForm own={m.own} sim={sim} t={t} lang={lang} templates={m.templates} />
          {deals.length > 0 && (
            <>
              <h3>{t("brandMarket.ownDeals")}</h3>
              <ul className="small">{deals.map((b) => <OwnDeals key={b.id} b={b} sim={sim} t={t} lang={lang} />)}</ul>
            </>
          )}
        </>
      )}
      {m.unlocked && <p className="small muted">{t("brandMarket.shelfHint")}</p>}
    </section>
  );
}

/** S11 Bildschirm F, UI-R101: Regal des Markenmarkts mit fremden Angeboten und den eigenen Lizenzen fremder Marken. */
export function BrandShelf({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const m = view.brandMarket;
  // Prüfung Fable 03.11.2026: Angebote in den eigenen Genres zuerst, Standard fünf Zeilen.
  const mine = (o: BrandOfferView) => o.genres.some((g) => m.ownGenres.includes(g));
  const sorted = [...m.market].sort((a, b) => Number(mine(b)) - Number(mine(a)) || b.fans - a.fans || a.id - b.id);
  const { shown, toggle } = useLimit(sorted, 5, t);
  if (!m.unlocked) return null;
  return (
    <>
      <h3>{t("brandMarket.offers")}</h3>
      {m.market.length === 0 ? <p className="muted small">{t("brandMarket.noOffers")}</p> : (
        <table className="small details shelf">
          <thead>
            <tr>
              <th>{t("brandMarket.col.brand")}</th><th>{t("brandMarket.col.owner")}</th><th className="num">{t("brandMarket.col.fans")}</th>
              <th>{t("brandMarket.col.form")}</th><th>{t("brandMarket.col.terms")}</th><th className="num">{t("brandMarket.col.weeks")}</th><th />
            </tr>
          </thead>
          <tbody>
            {shown.map((o) => (
              <tr key={o.id}>
                <td><strong>{o.brand}</strong></td>
                <td className="muted">{o.owner || "–"}</td>
                <td className="num" title={t("brandMarket.strength", { s: Math.round(o.strengthBp / 100) })}>{fmtInt(o.fans, lang)}</td>
                <td title={o.form === "lizenzspiel" ? genres(o.genres, t) : undefined}>
                  {t(`brandMarket.form.${o.form}`)}{o.form === "lizenzspiel" && <span className="muted"> · {t(`brandMarket.template.${o.template}`)}</span>}
                </td>
                <td>{terms(o, t, lang)}</td>
                <td className="num">{o.weeksLeft}</td>
                <td>
                  <button type="button" className="topbar-btn" disabled={o.blocked !== null} title={o.blocked ? t(o.blocked) : undefined}
                    onClick={() => sim.input({ type: "takeBrandOffer", offerId: o.id })}>
                    {t(o.form === "lizenzspiel" ? "brandMarket.take" : "brandMarket.buy")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {toggle}
      {m.licenses.length > 0 && (
        <>
          <h3>{t("brandMarket.licenses")}</h3>
          <ul className="small">
            {m.licenses.map((l) => (
              <li key={l.id}>{t("brandMarket.licenseLine", {
                brand: l.brand, partner: l.partner || "–", genres: genres(l.genres, t), made: l.gamesMade, allowed: l.gamesAllowed, weeks: l.weeksLeft,
                royalty: fmtPct(l.royaltyBp, lang), score: fmtScore(l.minScoreBp, lang),
              })}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
