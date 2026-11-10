// Franchise-Cockpit (S02 5.5, PRD-R70 bis PRD-R75): sichtbar sind Stärke und Frische, dazu Fans, Titel und Pause.
import type { ViewModel } from "../../sim/view/view";
import { fmtInt, fmtScore } from "../format";
import type { Lang, T } from "../texts";

function Meter({ bp, bad }: { bp: number; bad?: boolean }) {
  return <span className="meter"><span style={{ width: `${bp / 100}%` }} className={bad ? "meter-bad" : ""} /></span>;
}

export function BrandCockpit({ view, t, lang }: { view: ViewModel; t: T; lang: Lang }) {
  // Prüfung Fable 03.11.2026: Karten nur für etablierte Marken (Hit oder Nachfolger); Einzeltitel eingeklappt.
  const main = view.brands.filter((b) => b.established);
  const rest = view.brands.filter((b) => !b.established);
  return (
    <section className="panel" aria-labelledby="brands-title">
      <h2 id="brands-title">{t("view.marken")}</h2>
      {main.length === 0 && <p className="muted">{t("brand.empty")}</p>}
      <div className="vcards">
        {main.map((b) => (
          <article key={b.id} className="vcard" aria-labelledby={`b${b.id}`}>
            <header className="vcard-head">
              <h3 id={`b${b.id}`}>{b.name}</h3>
              <span className="muted small">{t("brand.titles", { n: b.titles.length })} · {t("brand.fans", { n: fmtInt(b.fans, lang) })}</span>
            </header>
            <p className="small">{t("brand.strength")} <Meter bp={b.strengthBp} /> {Math.round(b.strengthBp / 100)}</p>
            <p className="small">{t("brand.freshness")} <Meter bp={b.freshnessBp} bad={b.pauseWeeks > 0} /> {Math.round(b.freshnessBp / 100)}</p>
            <p className="small">
              {b.pauseWeeks > 0 ? <span className="error">{t("brand.pause", { n: b.pauseWeeks })}</span> : <span className="wf-pos">{t("brand.ready")}</span>}
              {b.lastTitleWeeksAgo !== null && <span className="muted"> · {t("brand.lastTitle", { n: b.lastTitleWeeksAgo })}</span>}
            </p>
            <ul className="log small">
              {b.titles.slice(-3).map((x) => <li key={x.id}>{x.title}{x.scoreBp !== null && <span className="muted"> · {fmtScore(x.scoreBp, lang)}</span>}</li>)}
              {b.titles.length > 3 && <li className="muted">{t("brand.moreTitles", { n: b.titles.length - 3 })}</li>}
            </ul>
          </article>
        ))}
      </div>
      {rest.length > 0 && (
        <details className="small">
          <summary>{t("brand.single", { n: rest.length })}</summary>
          <ul className="log">
            {rest.map((b) => (
              <li key={b.id}>{b.name}{b.titles[0]?.scoreBp != null && <span className="muted"> · {fmtScore(b.titles[0].scoreBp, lang)}</span>}
                <span className="muted"> · {t("brand.fans", { n: fmtInt(b.fans, lang) })}</span></li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
