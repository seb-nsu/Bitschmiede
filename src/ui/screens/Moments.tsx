// 4b.3: Momente als Szene statt Zeile. Preis-Gala auf der Messe (ZIE-R03 bis ZIE-R05) und Insolvenz-Warnung (FRM-R40).
// Erst der Moment, die Zahlen dahinter bleiben im Wissensbuch bzw. in den Finanzen.
import { reducedMotion } from "../display";
import { useEffect, useState } from "react";
import type { ViewModel } from "../../sim/view/view";
import { fmtMoney } from "../format";
import type { Lang, T } from "../texts";

type Gala = NonNullable<ViewModel["goals"]["gala"]>;

/** Kategorie für Kategorie: Nominierte, kurze Pause, Umschlag, Gewinner. */
export function AwardGala({ gala, t, onClose }: { gala: Gala; t: T; onClose: () => void }) {
  // Schritt 2·i = Kategorie i nominiert, 2·i+1 = Gewinner von i bekannt.
  const total = gala.categories.length * 2;
  const [step, setStep] = useState(reducedMotion() ? total : 0);
  useEffect(() => {
    if (step >= total) return;
    const id = setTimeout(() => setStep((s) => s + 1), step % 2 === 0 ? 1500 : 900);
    return () => clearTimeout(id);
  }, [step, total]);
  const won = gala.categories.filter((c) => c.nominees[c.winner]?.player).length;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="gala-title">
      <div className="panel reveal gala">
        <h2 id="gala-title">{t("gala.title", { year: gala.year })}</h2>
        <p className="muted small">{t("gala.intro")}</p>
        {gala.categories.map((c, i) => {
          if (step < 2 * i) return null;
          const revealed = step > 2 * i;
          return (
            <section key={c.category} className="gala-cat">
              <h3>🏆 {t(`award.${c.category}`)}</h3>
              <ol className="gala-nominees">
                {c.nominees.map((n, j) => (
                  <li key={j} className={`${n.player ? "gala-you" : ""}${revealed && j === c.winner ? " gala-winner" : ""}${revealed && j !== c.winner ? " gala-loser" : ""}`}>
                    {n.player ? (n.name ? `${n.name} (${t("gala.you")})` : t("gala.you")) : n.name || "–"}
                    {revealed && j === c.winner && <strong> · {t("gala.wins")}</strong>}
                  </li>
                ))}
              </ol>
              {!revealed && <p className="press">{t("gala.envelope")}</p>}
            </section>
          );
        })}
        {step >= total && (
          <>
            <p className={won > 0 ? "wf-pos" : "muted"}><strong>{won > 0 ? t("gala.wonCount", { n: won }) : t("gala.noWin")}</strong></p>
            {won > 0 && <p className="small muted">{t("gala.effect")}</p>}
            <button type="button" className="primary" onClick={onClose} autoFocus>{t("gala.continue")}</button>
          </>
        )}
        {step < total && <button type="button" className="linklike small" onClick={() => setStep(total)}>{t("gala.skip")}</button>}
      </div>
    </div>
  );
}

/** Erste Insolvenz-Warnung: wie viel Zeit bleibt und die drei wirksamsten Gegenmittel. */
export function InsolvencyScene({ view, t, lang, onClose }: { view: ViewModel; t: T; lang: Lang; onClose: () => void }) {
  const f = view.finance;
  const left = Math.max(0, f.toleranceMonths - f.insolvencyMonths);
  const credit = Math.max(0, f.creditLimitCent - f.loanCent);
  const remedies = [
    credit > 0 ? t("insolvency.credit", { amount: fmtMoney(credit, lang) }) : null,
    view.unlocks.includes("auftraege") ? t("insolvency.contract") : null,
    view.active.length > 1 ? t("insolvency.pause") : null,
    t("insolvency.release"),
    view.people.length > 2 ? t("insolvency.staff", { cost: fmtMoney(view.weeklyCostCent * 4, lang) }) : null,
  ].filter((x): x is string => x !== null).slice(0, 3);
  return (
    <div className="overlay" role="alertdialog" aria-modal="true" aria-labelledby="insolvency-title">
      <div className="panel reveal insolvency-scene">
        <div className="insolvency-clock" aria-hidden="true">{left}</div>
        <h2 id="insolvency-title">{t("insolvency.title")}</h2>
        <p>{t("insolvency.text", { left, cash: fmtMoney(view.moneyCent, lang), cost: fmtMoney(view.weeklyCostCent * 4, lang) })}</p>
        <h3>{t("insolvency.remedies")}</h3>
        <ol>{remedies.map((r) => <li key={r}>{r}</li>)}</ol>
        <button type="button" className="primary" onClick={onClose} autoFocus>{t("insolvency.continue")}</button>
      </div>
    </div>
  );
}
