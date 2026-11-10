// Release-Abend in schlicht (S11 Moment D): Wertungs-Enthüllung, Vergleich, Wasserfall „Warum?“, Wissensbuch-Eintrag.
import { displayPrefs, reducedMotion } from "../display";
import { useEffect, useState } from "react";
import type { KnowledgeView, ProjectView } from "../../sim/view/view";
import { fmtFactor, fmtInt, fmtMoney, fmtPct, fmtQ, fmtScore } from "../format";
import type { Lang, T } from "../texts";
import { Waterfall } from "../viz";
import { KnowledgeLine } from "./Knowledge";
import { type ArticleId, HelpLink, openHelp } from "./Handbook";

const AREA_ORDER = ["gameplay", "grafik", "sound", "story", "technik"] as const;

/** S11: In den 1980ern zeigen die Magazine Prozentwertungen, ab 1990 „von 10“. */
function magazineScore(scoreBp: number, year: number, lang: Lang): string {
  return year < 1990 ? `${Math.round(scoreBp / 1000)} %` : fmtScore(scoreBp, lang);
}

/** Mentor (Design „Die erste Stunde“): kommentiert die ersten fünf Releases in zwei Sätzen, nach dem schwächsten Balken. */
function mentorKey(product: ProjectView): string {
  const bars = product.result!.bars.filter((b) => ["features", "team", "profil", "passung", "saeulen", "bugs"].includes(b.factor));
  const worst = [...bars].sort((a, b) => a.value - b.value)[0];
  return worst && worst.value < 0 ? `mentor.${worst.factor}` : "mentor.good";
}

/** Etappe 6c.11 (Konzept-Einstieg 4): Rückblick aus dem schwächsten Balken, mit dem passenden Handbuch-Artikel. */
const BAR_ARTICLE: Record<string, ArticleId> = { features: "karten", profil: "karten", team: "team", engine: "engine", passung: "passung", saeulen: "saeulen", bugs: "bugs", zeitgeist: "wertung", tagesform: "wertung" };

function costliest(product: ProjectView): { factor: string; article: ArticleId } | null {
  const worst = [...product.result!.bars].filter((b) => b.factor in BAR_ARTICLE && b.value < 0).sort((a, b) => a.value - b.value)[0];
  return worst ? { factor: worst.factor, article: BAR_ARTICLE[worst.factor]! } : null;
}

/** 4b.3: Ein Wort für den Moment; Schwellen wie Hit und Flop der Personalwirkung (staff.json 8,0 und 5,0). */
function verdict(scoreBp: number): "hit" | "good" | "ok" | "flop" {
  return scoreBp >= 80000 ? "hit" : scoreBp >= 65000 ? "good" : scoreBp >= 50000 ? "ok" : "flop";
}

export function ReleaseReveal({ product, knowledge, onClose, t, lang, releasedCount }: {
  product: ProjectView; knowledge: KnowledgeView[]; onClose: () => void; t: T; lang: Lang; releasedCount: number;
}) {
  const [stage, setStage] = useState(reducedMotion() ? 2 : 0);
  const mags = product.result?.reviews?.length ?? 0;
  useEffect(() => {
    if (stage >= 2) return;
    const id = setTimeout(() => setStage((s) => s + 1), stage === 0 ? 1600 : 700 * Math.max(1, mags) + 900);
    return () => clearTimeout(id);
  }, [stage, mags]);
  const r = product.result!;
  const worst = costliest(product);
  const entries = r.knowledgeKeys.map((k) => knowledge.find((e) => e.key === k)).filter((e): e is KnowledgeView => !!e);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="reveal-title">
      <div className="reveal panel">
        <h2 id="reveal-title">{product.title}</h2>
        {stage === 0 && <p className="press">{t("release.pressJudges")}</p>}
        {stage >= 1 && r.reviews && (
          <div className="magazines">
            {r.reviews.map((m, i) => (
              <div key={m.magazine} className="magazine" style={{ animationDelay: `${i * 0.7}s` }}>
                <span className="magazine-name">{t(`magazine.${m.magazine}`)}</span>
                <strong>{magazineScore(m.scoreBp, r.year, lang)}</strong>
              </div>
            ))}
          </div>
        )}
        {stage >= 2 && (
          <div className="score-block">
            <div className={`score-big score-${verdict(r.scoreBp)}`}>{fmtScore(r.scoreBp, lang)} <HelpLink id="wertung" t={t} before={onClose} /></div>
            <div className="muted">
              {product.previous
                ? t("release.vsPrevious", { score: fmtScore(product.previous.scoreBp, lang), title: product.previous.title })
                : t("release.first")}
            </div>
          </div>
        )}
        {stage >= 2 && (
          <>
            <p className={`verdict verdict-${verdict(r.scoreBp)}`}>{t(`release.verdict.${verdict(r.scoreBp)}`)}</p>
            {releasedCount <= 5 && !displayPrefs().mentorMuted && <p className="mentor"><strong>{t("mentor.name")}:</strong> {t(mentorKey(product))}</p>}
            {worst && (
              <p className="small review-line">
                {t("release.costliest", { bar: t(`bar.${worst.factor}`) })}{" "}
                <button type="button" className="linklike" onClick={() => { onClose(); openHelp(worst.article); }}>{t("release.costliestHelp")}</button>
              </p>
            )}
            <p className="muted">{t("release.sales", { units: fmtInt(r.units, lang), revenue: fmtMoney(r.revenueCent, lang), stock: fmtInt(product.sales?.stock ?? 0, lang) })}</p>
            {entries.length > 0 && (
              <>
                <h3>{t("release.knowledge")}</h3>
                <ul className="knowledge-list">{entries.map((e) => <KnowledgeLine key={e.key} entry={e} t={t} lang={lang} />)}</ul>
              </>
            )}
            {/* 4b.3: erst der Moment, die Aufschlüsselung auf Wunsch. */}
            <details className="why" open={releasedCount <= 2}>
              <summary>{t("release.why")}</summary>
              <Waterfall baseBp={r.baseBp} bars={r.bars} scoreBp={r.scoreBp} previous={product.previous?.bars ?? null} t={t} lang={lang} />
              <QualityDetails product={product} t={t} lang={lang} />
            </details>
            <button type="button" className="primary" onClick={onClose} autoFocus>{t("release.continue")}</button>
          </>
        )}
      </div>
    </div>
  );
}

/** Analysieren-Ebene in klein: Aufschlüsselung von Q als Tabelle (S02 Abschnitt 8). */
export function QualityDetails({ product, t, lang }: { product: ProjectView; t: T; lang: Lang }) {
  const r = product.result!;
  const q = r.quality;
  return (
    <details className="details">
      <summary>{t("release.details")}</summary>
      <p>{t("release.qLine", { q: fmtQ(q.q, lang), qNorm: fmtQ(r.qNormBp, lang) })}</p>
      <table>
        <thead>
          <tr><th>{t("detail.feature")}</th><th>{t("detail.area")}</th><th>{t("detail.base")}</th><th>{t("detail.team")}</th><th>{t("detail.value")}</th></tr>
        </thead>
        <tbody>
          {q.contributions.map((c) => (
            <tr key={c.featureId}>
              <td>{t(`feature.${c.featureId}`)}</td><td>{t(`area.${c.area}`)}</td>
              <td>{fmtQ(c.baseValue, lang)}</td><td>{fmtFactor(c.teamBp, lang)}</td><td>{fmtQ(c.valueBp, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {t("detail.synergy")}:{" "}
        {q.synergies.length === 0
          ? t("detail.synergy.none")
          : q.synergies.map((s) => `${t(`feature.${s.a}`)} + ${t(`feature.${s.b}`)} (${s.bp > 0 ? "+" : "−"}${fmtPct(Math.abs(s.bp), lang)})`).join(", ")}
      </p>
      <table>
        <thead><tr><th>{t("detail.area")}</th><th>{t("detail.actual")}</th><th>{t("detail.expected")}</th></tr></thead>
        <tbody>
          {AREA_ORDER.map((a) => (
            <tr key={a}><td>{t(`area.${a}`)}</td><td>{fmtPct(q.profileActual[a], lang)}</td><td>{fmtPct(q.profileExpected[a], lang)}</td></tr>
          ))}
        </tbody>
      </table>
      <p>
        {t("detail.profileFactor")} {fmtFactor(q.profileFactorBp, lang)} · {t("detail.fit")} {fmtFactor(q.themeFitBp, lang)} ·{" "}
        {t("detail.bugShare")} {fmtPct(q.bugShareBp, lang)}
      </p>
    </details>
  );
}
