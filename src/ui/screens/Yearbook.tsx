// KRN-R62, S11: Jahrbuch zum Jahresende als Haltepunkt: Releases, Zahlen, Chronik des Jahres.
import type { ViewModel } from "../../sim/view/view";
import { fmtMoney, fmtScore } from "../format";
import type { Lang, T } from "../texts";
import { logText } from "./Focus";

export function YearbookDialog({ view, t, lang, onClose }: { view: ViewModel; t: T; lang: Lang; onClose: () => void }) {
  const y = view.yearbook;
  if (!y) return null;
  const best = [...y.releases].sort((a, b) => b.scoreBp - a.scoreBp)[0];
  const others = y.chronicle.filter((c) => c.key !== "log.released");
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="yb-title">
      <div className="panel reveal">
        <h2 id="yb-title">{t("yearbook.title", { year: y.year })}</h2>
        <h3>{t("yearbook.releases")}</h3>
        {y.releases.length === 0 ? <p className="muted">{t("yearbook.none")}</p> : (
          <ul className="log">{y.releases.map((r, i) => <li key={i}>{r.title} · {fmtScore(r.scoreBp, lang)}</li>)}</ul>
        )}
        {best && <p>{t("yearbook.best", { title: best.title, score: fmtScore(best.scoreBp, lang) })}</p>}
        <table className="products finance-table">
          <tbody>
            <tr><td>{t("yearbook.income")}</td><td className="num">{fmtMoney(y.incomeCent, lang)}</td></tr>
            <tr><td>{t("yearbook.costs")}</td><td className="num">{fmtMoney(y.costsCent, lang)}</td></tr>
            <tr><td><strong>{t("yearbook.result")}</strong></td><td className={`num ${y.incomeCent - y.costsCent >= 0 ? "wf-pos" : "wf-neg"}`}><strong>{fmtMoney(y.incomeCent - y.costsCent, lang)}</strong></td></tr>
            <tr><td>{t("yearbook.people")}</td><td className="num">{y.people}</td></tr>
          </tbody>
        </table>
        {others.length > 0 && (
          <>
            <h3>{t("yearbook.chronicle")}</h3>
            <ul className="log">{others.map((c, i) => <li key={i}>{logText({ ...c, date: view.date }, t, lang)}</li>)}</ul>
          </>
        )}
        <button type="button" className="primary" onClick={onClose} autoFocus>{t("yearbook.continue", { year: y.year + 1 })}</button>
      </div>
    </div>
  );
}
