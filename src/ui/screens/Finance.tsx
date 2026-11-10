// Finanzen-Ansicht (FRM-R38, FRM-R39, S11): Monatsbuch als Balken, Kredit, Insolvenzwarnung; Insolvenz-Bildschirm.
import { useState } from "react";
import type { ViewModel } from "../../sim/view/view";
import type { Sim } from "../useSim";
import { fmtMoney, fmtMoneyFull, fmtMoneyShort, fmtPct } from "../format";
import type { Lang, T } from "../texts";

function MonthBars({ view, t, lang }: { view: ViewModel; t: T; lang: Lang }) {
  const months = view.finance.ledger.slice(-12);
  if (months.length === 0) return <p className="muted">{t("finance.noData")}</p>;
  const rows = months.map((m) => {
    const income = m.income.sales + m.income.contracts + (m.income.licenses ?? 0) + (m.income.merch ?? 0) + (m.income.publisher ?? 0) + (m.income.konzern ?? 0) + (m.income.publishing ?? 0);
    const c = m.costs;
    const costs = c.wages + c.rent + c.interest + c.production + c.storage + c.other + c.tax + (c.licenses ?? 0) + (c.marketing ?? 0) + (c.server ?? 0) + (c.writeDown ?? 0) + (c.publishing ?? 0) + (c.bonus ?? 0);
    return { m, income, costs };
  });
  const max = Math.max(1, ...rows.map((r) => Math.max(r.income, r.costs)));
  return (
    <div className="months" role="table" aria-label={t("finance.months")}>
      {rows.map(({ m, income, costs }) => (
        <div key={`${m.year}-${m.month}`} className="month" role="row"
          title={`${t("finance.income")}: ${fmtMoneyFull(income, lang)} · ${t("finance.costs")}: ${fmtMoneyFull(costs, lang)} · ${fmtMoneyFull(income - costs, lang)}`}>
          <div className="month-bars" aria-hidden>
            <div className="mbar mbar-in" style={{ height: `${(income / max) * 100}%` }} />
            <div className="mbar mbar-out" style={{ height: `${(costs / max) * 100}%` }} />
          </div>
          <span className="small muted" role="rowheader">{t(`date.month.${m.month}`).slice(0, 3)} {String(m.year).slice(2)}</span>
          <span className={`small ${income - costs >= 0 ? "wf-pos" : "wf-neg"}`} role="cell">{fmtMoneyShort(income - costs, lang)}</span>
        </div>
      ))}
    </div>
  );
}

function negFactory(lang: Lang) {
  return (cent: number) => (cent === 0 ? fmtMoney(0, lang) : `−${fmtMoney(cent, lang)}`);
}

type Month = ViewModel["finance"]["ledger"][number];

const FINANCE_ROWS: [string, (m: Month) => number, boolean][] = [
  ["finance.sales", (m) => m.income.sales, false],
  ["finance.contracts", (m) => m.income.contracts, false],
  ["finance.licenseIncome", (m) => m.income.licenses ?? 0, false],
  ["finance.merch", (m) => m.income.merch ?? 0, false],
  ["finance.publisherIncome", (m) => m.income.publisher ?? 0, false],
  ["finance.konzernIncome", (m) => m.income.konzern ?? 0, false],
  ["finance.publishingIncome", (m) => m.income.publishing ?? 0, false],
  ["finance.wages", (m) => m.costs.wages, true],
  ["finance.rent", (m) => m.costs.rent, true],
  ["finance.interest", (m) => m.costs.interest, true],
  ["finance.production", (m) => m.costs.production, true],
  ["finance.storage", (m) => m.costs.storage, true],
  ["finance.marketing", (m) => m.costs.marketing ?? 0, true],
  ["finance.licenses", (m) => m.costs.licenses ?? 0, true],
  ["finance.server", (m) => m.costs.server ?? 0, true],
  ["finance.publishingCost", (m) => m.costs.publishing ?? 0, true],
  ["finance.bonus", (m) => m.costs.bonus ?? 0, true],
  ["finance.writeDown", (m) => m.costs.writeDown ?? 0, true],
  ["finance.other", (m) => m.costs.other, true],
  ["finance.tax", (m) => m.costs.tax, true],
];
const ALWAYS = ["finance.sales", "finance.wages", "finance.rent"];

export function FinancePanel({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const f = view.finance;
  const [amount, setAmount] = useState("10000");
  const cents = Math.round(Number(amount.replace(/[^0-9]/g, "")) * 100);
  const last = view.finance.ledger.slice(-12);
  // Prüfung Fable 03.11.2026: „keine Zahl ohne Vergleich“ – die zwölf Monate davor als zweite Spalte.
  const before = view.finance.ledger.length >= 24 ? view.finance.ledger.slice(-24, -12) : null;
  const sum = (sel: (m: (typeof last)[number]) => number, list = last) => list.reduce((s, m) => s + sel(m), 0);
  const neg = negFactory(lang);
  return (
    <section className="panel" aria-labelledby="finance-title">
      <h2 id="finance-title">{t("finance.title")}</h2>
      {f.insolvencyMonths > 0 && (
        <p className="toast" role="alert">{t("finance.insolvencyWarning", { n: f.insolvencyMonths, max: f.toleranceMonths })}</p>
      )}
      {f.inCushion && <p className="hint">{t("finance.cushion")}</p>}
      <h3>{t("finance.months")}</h3>
      <MonthBars view={view} t={t} lang={lang} />
      <p className="muted small"><span className="swatch swatch-in" /> {t("finance.income")} <span className="swatch swatch-out" /> {t("finance.costs")}</p>
      <table className="products finance-table">
        <thead><tr><th>{t("finance.item")}</th><th className="num">{t("finance.now")}</th>{before && <th className="num">{t("finance.before")}</th>}</tr></thead>
        <tbody>
          {/* Übersicht: Posten ohne Betrag in den letzten 12 Monaten entfallen (Verkäufe, Gehälter und Miete bleiben). */}
          {FINANCE_ROWS.map(([key, pick, cost]) => {
            const v = sum(pick);
            if (v === 0 && !ALWAYS.includes(key)) return null;
            const b = before ? sum(pick, before) : null;
            return (
              <tr key={key}>
                <td>{t(key)}</td>
                <td className={`num${cost ? " wf-neg" : ""}`}>{cost ? neg(v) : fmtMoney(v, lang)}</td>
                {b !== null && <td className="num muted">{cost ? neg(b) : fmtMoney(b, lang)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      {sum((m) => m.costs.tax) > 0 && (
        <details className="small">
          <summary>{t("finance.taxWhy")}</summary>
          <p>{t("finance.taxExplain", { rate: fmtPct(f.taxRateBp, lang) })}</p>
        </details>
      )}
      {f.lossCarryCent > 0 && <p className="small muted">{t("finance.lossCarry", { amount: fmtMoney(f.lossCarryCent, lang) })}</p>}
      <h3>{t("finance.loan")}</h3>
      <p className="small">
        {t("finance.loanState", { loan: fmtMoney(f.loanCent, lang), rate: fmtPct(f.loanRateBp, lang), note: f.creditNote })}
        {f.cushionDebtCent > 0 && <> · {t("finance.cushionDebt", { debt: fmtMoney(f.cushionDebtCent, lang) })}</>}
      </p>
      <p className="small muted">{t("finance.limit", { limit: fmtMoney(f.creditLimitCent, lang), rate: fmtPct(f.newLoanRateBp, lang) })}</p>
      <div className="loan-row">
        <label>
          {t("finance.amount")}
          <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <button type="button" disabled={cents <= 0 || f.loanCent + cents > f.creditLimitCent}
          onClick={() => sim.input({ type: "takeLoan", amountCent: cents })}>{t("finance.take")}</button>
        <button type="button" disabled={cents <= 0 || cents > f.loanCent || cents > view.moneyCent}
          onClick={() => sim.input({ type: "repayLoan", amountCent: cents })}>{t("finance.repay")}</button>
      </div>
    </section>
  );
}

/** ZIE-R09, ZIE-R10: Spielende durch Insolvenz; schlicht bis zum Abschluss-Bildschirm in Etappe 4. */
