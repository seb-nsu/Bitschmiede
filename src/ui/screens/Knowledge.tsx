// Wissensbuch (UI-R95 bis UI-R97) und Liste der bisherigen Projekte mit Vergleich zum vorigen.
import { Fragment, useState } from "react";
import type { KnowledgeView, ProjectView } from "../../sim/view/view";
import { fmtBar, fmtInt, fmtMoney, fmtPct, fmtScore } from "../format";
import type { Lang, T } from "../texts";
import { Waterfall } from "../viz";
import { QualityDetails } from "./Release";
import { useLimit } from "../more";
import type { Sim } from "../useSim";
import type { ViewModel } from "../../sim/view/view";

export function knowledgeText(e: KnowledgeView, t: T, lang: Lang): string {
  const r = e.ref;
  const params: Record<string, string | number> = {
    feature: r.feature ? t(`feature.${r.feature}`) : "",
    area: r.area ? t(`area.${r.area}`) : "",
    genre: r.genre ? t(`genre.${r.genre}`) : "",
    theme: r.theme ? t(`theme.${r.theme}`) : "",
    scope: r.scope ? t(`scope.${r.scope}`) : "",
    actual: e.params.actual !== undefined ? fmtPct(e.params.actual, lang) : "",
    expected: e.params.expected !== undefined ? fmtPct(e.params.expected, lang) : "",
    bugs: e.params.bugs ?? "",
    module: r.module ? t(`module.${r.module}`) : "",
    level: e.params.level ?? "",
    art: e.params.art ?? "",
  };
  return t(`knowledge.${e.factor}.${e.direction > 0 ? "up" : "down"}`, params);
}

export function KnowledgeLine({ entry, t, lang }: { entry: KnowledgeView; t: T; lang: Lang }) {
  return (
    <li className={`knowledge knowledge-${entry.status}`}>
      <span>{knowledgeText(entry, t, lang)}</span>{" "}
      <span className={`badge badge-${entry.status}`}>{t(`knowledge.status.${entry.status}`)}</span>
      {entry.status === "umstritten" && <span className="muted"> {t("knowledge.count", { up: entry.up, down: entry.down })}</span>}
    </li>
  );
}

const TOPICS: KnowledgeView["factor"][] = ["passung", "zeitgeist", "profil", "features", "team", "engine", "bugs"];

function KnowledgeTopic({ factor, entries, t, lang }: { factor: KnowledgeView["factor"]; entries: KnowledgeView[]; t: T; lang: Lang }) {
  const { shown, toggle } = useLimit(entries, 5, t);
  return (
    <>
      <h3 className="small">{t(`knowledge.topic.${factor}`)} <span className="muted">({entries.length})</span></h3>
      <ul className="knowledge-list">{shown.map((e) => <KnowledgeLine key={e.key} entry={e} t={t} lang={lang} />)}</ul>
      {toggle}
    </>
  );
}

export function KnowledgeBook({ entries, t, lang }: { entries: KnowledgeView[]; t: T; lang: Lang }) {
  const sorted = [...entries].sort((a, b) => b.lastWeek - a.lastWeek || (a.key < b.key ? -1 : 1));
  // Prüfung Fable 03.11.2026: nach Thema gruppiert; gleich lautende Einträge (z. B. „Dein Team ist stark in Technik“) nur einmal, der jüngste zählt.
  const seen = new Set<string>();
  const unique = sorted.filter((e) => {
    const text = knowledgeText(e, t, lang);
    if (seen.has(text)) return false;
    seen.add(text);
    return true;
  });
  const topics = [...TOPICS, ...[...new Set(unique.map((e) => e.factor))].filter((f) => !TOPICS.includes(f)).sort()];
  return (
    <section className="panel" aria-labelledby="kb-title">
      <h2 id="kb-title">{t("knowledge.title")}</h2>
      {unique.length === 0 ? <p className="muted">{t("knowledge.empty")}</p> : topics.map((f) => {
        const list = unique.filter((e) => e.factor === f);
        return list.length === 0 ? null : <KnowledgeTopic key={f} factor={f} entries={list} t={t} lang={lang} />;
      })}
    </section>
  );
}

export function Products({ products, reissues, rule, year, sim, t, lang }: {
  products: ProjectView[]; reissues: ViewModel["reissues"]; rule: ViewModel["priceRule"]; year: number; sim: Sim; t: T; lang: Lang;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const { shown, toggle } = useLimit(products, 10, t);
  return (
    <section className="panel" aria-labelledby="products-title">
      <h2 id="products-title">{t("products.title")}</h2>
      {products.length === 0 ? <p className="muted">{t("products.empty")}</p> : (
        <table className="products">
          <thead>
            <tr>
              <th />
              <th>{t("products.score")}</th>
              <th>{t("products.delta")}</th>
              <th>{t("products.weeks")}</th>
              <th>{t("products.sold")}</th>
              <th>{t("products.revenue")}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => {
              const r = p.result!;
              const delta = p.previous ? r.scoreBp - p.previous.scoreBp : null;
              const isOpen = open === p.id;
              return (
                <ProductRow key={p.id} p={p} isOpen={isOpen} onToggle={() => setOpen(isOpen ? null : p.id)} sim={sim} t={t} lang={lang}
                  cells={[
                    fmtScore(r.scoreBp, lang),
                    delta === null ? "–" : fmtBar(delta, lang),
                    t("project.weeks", { n: p.weeksRunning }),
                    fmtInt(p.sales?.sold ?? 0, lang),
                    fmtMoney(p.sales?.revenueCent ?? 0, lang),
                  ]}
                  deltaClass={delta === null ? "" : delta > 0 ? "wf-pos" : delta < 0 ? "wf-neg" : ""}
                />
              );
            })}
          </tbody>
        </table>
      )}
      {toggle}
      {reissues.length > 0 && (
        <>
          <h3>{t("reissue.title")}</h3>
          <ul className="log small">
            {reissues.slice(0, 10).map((r) => (
              <li key={r.id}>
                {t(`reissue.${r.kind}`)}: {r.title}{r.sourceIds.length > 1 ? ` +${r.sourceIds.length - 1}` : ""} · {t("reissue.line", { sold: fmtInt(r.sold, lang), units: fmtInt(r.units, lang), revenue: fmtMoney(r.revenueCent, lang) })}
                {r.licensed && <span className="muted"> · {t("reissue.licensed")}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      {products.length > 0 && year >= rule.fromYear && <PriceRuleEditor rule={rule} sim={sim} t={t} lang={lang} />}
    </section>
  );
}

/** MKT-R21, A12: Regel für Preisaktionen (Standard: nach 12 Monaten 25 % in jeder Store-Aktion); MKT-R17 Preiskurve. */
function PriceRuleEditor({ rule, sim, t, lang }: { rule: ViewModel["priceRule"]; sim: Sim; t: T; lang: Lang }) {
  const set = (over: Partial<ViewModel["priceRule"]>) => {
    const r = { ...rule, ...over };
    sim.input({ type: "setPriceRule", rule: { active: r.active, afterWeeks: r.afterWeeks, discountBp: r.discountBp, followCurve: r.followCurve } });
  };
  return (
    <div className="price-rule">
      <h3>{t("price.rule.title")}</h3>
      <label className="small">
        <input type="checkbox" checked={rule.active} onChange={(e) => set({ active: e.target.checked })} /> {t("price.rule.active")}
      </label>
      {rule.active && (
        <p className="small">
          <label>
            {t("price.rule.after")}{" "}
            <select value={rule.afterWeeks} onChange={(e) => set({ afterWeeks: Number(e.target.value) })}>
              {[26, 52, 104].map((w) => <option key={w} value={w}>{t("price.rule.months", { n: Math.round((w * 12) / 52) })}</option>)}
            </select>
          </label>{" "}
          <label>
            {t("price.rule.discount")}{" "}
            <select value={rule.discountBp} onChange={(e) => set({ discountBp: Number(e.target.value) })}>
              {[1000, 2500, 3000, 5000, 7500].filter((d) => d <= rule.maxDiscountBp).map((d) => <option key={d} value={d}>{fmtPct(d, lang)}</option>)}
            </select>
          </label>
        </p>
      )}
      <label className="small">
        <input type="checkbox" checked={rule.followCurve} onChange={(e) => set({ followCurve: e.target.checked })} /> {t("price.rule.curve")}
      </label>
      <p className="muted small">{t("price.rule.hint")}</p>
    </div>
  );
}

function ProductRow({ p, isOpen, onToggle, cells, deltaClass, sim, t, lang }: {
  p: ProjectView; isOpen: boolean; onToggle: () => void; cells: string[]; deltaClass: string; sim: Sim; t: T; lang: Lang;
}) {
  const r = p.result!;
  return (
    <>
      <tr className="product-row">
        <td>
          <button type="button" className="linklike" aria-expanded={isOpen} onClick={onToggle}>
            {isOpen ? "▾" : "▸"} {p.title}
          </button>
          <div className="muted small">{t(`genre.${p.genre}`)}{p.subgenre ? ` (${t(`subgenre.${p.subgenre}`)})` : ""} · {t(`theme.${p.theme}`)} · {t(`scope.${p.scope}`)}</div>
        </td>
        <td className="num strong">{cells[0]}</td>
        <td className={`num ${deltaClass}`}>{cells[1]}</td>
        <td className="num">{cells[2]}</td>
        <td className="num">{cells[3]}</td>
        <td className="num">{cells[4]}</td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={6}>
            {p.sales && <SalesSummary product={p} t={t} lang={lang} />}
            {p.sales?.pricing && !p.sales.ended && <PriceControl product={p} sim={sim} t={t} lang={lang} />}
            {p.previous && <p className="muted">{t("products.compare")}: {p.previous.title}</p>}
            <Waterfall baseBp={r.baseBp} bars={r.bars} scoreBp={r.scoreBp} previous={p.previous?.bars ?? null} t={t} lang={lang} />
            <QualityDetails product={p} t={t} lang={lang} />
          </td>
        </tr>
      )}
    </>
  );
}

/** Verkäufe nach dem Release (MKT-F3): Stück je Woche, Bestand, verlorene Nachfrage, Regalverlust. */
function SalesSummary({ product, t, lang }: { product: ProjectView; t: T; lang: Lang }) {
  const s = product.sales!;
  const max = Math.max(1, ...s.weekly);
  const w = 240;
  const step = s.weekly.length > 1 ? w / (s.weekly.length - 1) : w;
  const points = s.weekly.map((v, i) => `${(i * step).toFixed(1)},${(48 - (v / max) * 44).toFixed(1)}`).join(" ");
  return (
    <div className="sales">
      <svg viewBox={`0 0 ${w} 50`} className="salescurve" role="img" aria-label={t("products.curve")}>
        <polyline points={points} className="salescurve-line" />
      </svg>
      <p className="small">
        {t("products.salesLine", { sold: fmtInt(s.sold, lang), stock: fmtInt(s.stock, lang), lost: fmtInt(s.lost, lang) })}
        {s.shelfLost && <span className="badge"> {t("products.shelfLost")}</span>}
        {s.ended && <span className="muted"> · {t("products.ended")}</span>}
      </p>
      {s.channel && (
        <p className="small muted">
          {t("products.channel", { channel: t(`channel.${s.channel}`) })}
          {(s.returned ?? 0) > 0 && <> · {t("products.returned", { units: fmtInt(s.returned ?? 0, lang) })}</>}
          {(s.refundBp ?? 0) > 0 && <> · {t("products.refunds", { rate: fmtPct(s.refundBp ?? 0, lang) })}</>}
        </p>
      )}
      {s.remaining && (
        <p className="small muted">
          {t("products.remaining", { voll: fmtInt(s.remaining.voll, lang), mittel: fmtInt(s.remaining.mittel, lang), budget: fmtInt(s.remaining.budget, lang) })}
          {s.subscriptionUntil !== undefined && <> · {t("products.subscription")}</>}
          {s.priceLocked && <> · {t("products.priceLocked")}</>}
        </p>
      )}
      {s.protection && (
        <p className="small muted">
          {t("products.piracy", {
            level: t(`protection.${s.protection.level}`), copies: fmtInt(s.protection.copies, lang), rate: fmtPct(s.protection.piracyBp, lang),
          })}
          {s.protection.cracked && <span className="badge"> {t("products.cracked")}</span>}
          {s.protection.removed && <span className="muted"> · {t("products.protectionRemoved")}</span>}
        </p>
      )}
    </div>
  );
}

/** MKT-R17: Preis senken (nie erhöhen), Vorschlag nach der Preiskurve; MKT-V05: Gutschrift für Ware im Handel. */
function PriceControl({ product, sim, t, lang }: { product: ProjectView; sim: Sim; t: T; lang: Lang }) {
  const s = product.sales!;
  const pr = s.pricing!;
  const current = s.priceCent ?? pr.releasePriceCent;
  const [usd, setUsd] = useState(() => String(Math.floor((product.suggestedPriceCent ?? current) / 100)));
  const cents = Math.round(Number(usd.replace(/[^0-9]/g, "")) * 100);
  const valid = cents > 0 && cents < current;
  const credit = valid ? s.stock * (current - cents) : 0;
  return (
    <div className="price-control small">
      <p>
        {t("price.line", { price: fmtMoney(current, lang), release: fmtMoney(pr.releasePriceCent, lang), discounts: pr.discounts })}
        {pr.discountBp > 0 && <span className="badge"> {t("price.onSale", { pct: fmtPct(pr.discountBp, lang) })}</span>}
        {pr.protectionCreditCent > 0 && <span className="muted"> · {t("price.credits", { amount: fmtMoney(pr.protectionCreditCent, lang) })}</span>}
      </p>
      {product.suggestedPriceCent !== null && product.suggestedPriceCent < current && (
        <p className="hint">{t("price.suggest", { price: fmtMoney(product.suggestedPriceCent, lang) })}</p>
      )}
      <label>
        {t("price.new")} <input inputMode="numeric" value={usd} onChange={(e) => setUsd(e.target.value)} size={5} />
      </label>{" "}
      <button type="button" disabled={!valid} onClick={() => sim.input({ type: "setPrice", projectId: product.id, priceCent: cents })}>
        {t("price.lower")}
      </button>
      {credit > 0 && <span className="muted"> {t("price.creditPreview", { amount: fmtMoney(credit, lang) })}</span>}
    </div>
  );
}

/** Durchschaubarkeit (Spieltest 02.11.2026): „Wie entsteht eine Wertung?“ als Kette (PRD-R50, PRD-R54, Verkauf). */
const CHAIN = ["karten", "synergie", "profil", "team", "engine", "thema", "bugs", "wertung", "verkauf"] as const;

/** Prüfung Fable 03.11.2026: Die Zusammenhangs-Karte steht im Handbuch (Nachschlagewerk), nicht im Wissensbuch. */
export function ScoreChain({ t }: { t: T }) {
  return (
    <details className="small">
      <summary>{t("chain.title")}</summary>
      <p>{t("chain.intro")}</p>
      <div className="chain">
        {CHAIN.map((k, i) => (
          <Fragment key={k}>
            {i > 0 && <span className="chain-arrow" aria-hidden="true">{k === "wertung" || k === "verkauf" ? "→" : "×"}</span>}
            <div className="chain-step"><strong>{t(`chain.${k}`)}</strong>{t(`chain.${k}.text`)}</div>
          </Fragment>
        ))}
      </div>
      <p className="muted">{t("chain.outro")}</p>
    </details>
  );
}
