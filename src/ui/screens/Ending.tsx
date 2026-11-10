// S10 Abschnitt 8, ZIE-R09 bis ZIE-R12: Abschluss-Bildschirm mit Chronik, Vermächtnis-Wertung, Titel, Rivalen-Vergleich,
// Weiterspielen und Export als Text und Bild.
import type { ViewModel } from "../../sim/view/view";
import { fmtMoney, fmtScore } from "../format";
import type { Lang, T } from "../texts";
import { logText } from "./Focus";

type EndingView = NonNullable<ViewModel["ending"]>;

/** Vermächtnis-Punkte 0–100 (gespeichert als Punkte · 100). */
function pts(bp: number, lang: Lang): string {
  return (bp / 100).toLocaleString(lang === "de" ? "de-DE" : "en-US", { maximumFractionDigits: 1 });
}

function chronicleLines(view: ViewModel, t: T, lang: Lang): string[] {
  return view.chronicle.map((c) => `${c.date.year}  ${logText(c, t, lang)}`);
}

function exportLines(view: ViewModel, e: EndingView, t: T, lang: Lang): string[] {
  return [
    t("ending.exportHead", { year: e.date.year, title: t(`ending.title.${e.legacy.title}`), score: pts(e.legacy.totalBp, lang) }),
    ...e.legacy.parts.map((p) => `  ${t(`ending.part.${p.part}`)}: ${p.score}`),
    "",
    t("ending.chronicle"),
    ...chronicleLines(view, t, lang),
  ];
}

function download(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** ZIE-R12: Chronik als Bild (PNG): Text auf eine Leinwand gesetzt. */
function exportPng(lines: string[], name: string): void {
  const lineHeight = 18;
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = Math.min(16000, 40 + lines.length * lineHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#14161a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#e8e6e1";
  ctx.font = "14px system-ui, sans-serif";
  lines.forEach((line, i) => ctx.fillText(line, 20, 30 + i * lineHeight, canvas.width - 40));
  canvas.toBlob((b) => b && download(name, b), "image/png");
}

export function EndingDialog({ view, t, lang, onContinue, onNewGame }: { view: ViewModel; t: T; lang: Lang; onContinue: () => void; onNewGame: () => void }) {
  const e = view.ending;
  if (!e) return null;
  const lines = () => exportLines(view, e, t, lang);
  const file = `chronik-${view.seed}-${e.date.year}`;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="ending-title">
      <div className="panel reveal ending">
        <h2 id="ending-title">{t(`ending.heading.${e.reason}`, { year: e.date.year })}</h2>
        {e.reason === "szenario" && view.goals.scenario && (
          <p className={view.goals.scenario.status === "gewonnen" ? "wf-pos" : "error"}>
            <strong>{t(`scenario.${view.goals.scenario.id}`)}: {t(`goals.scenarioStatus.${view.goals.scenario.status}`)}</strong>
          </p>
        )}
        <p className="ending-title">{t("ending.legacyTitle")}: <strong>{t(`ending.title.${e.legacy.title}`)}</strong></p>

        <h3>{t("ending.legacy", { score: pts(e.legacy.totalBp, lang) })}</h3>
        <div className="waterfall" role="table" aria-label={t("ending.legacy", { score: pts(e.legacy.totalBp, lang) })}>
          {e.legacy.parts.map((p) => (
            <div key={p.part} className="wf-row" role="row">
              <span role="cell">{t(`ending.part.${p.part}`)}</span>
              <span role="cell" className="legacy-track"><span className="legacy-fill" style={{ width: `${p.score}%` }} /></span>
              <span role="cell" className="num">{p.score}</span>
              <span role="cell" className="num wf-pos">+{pts(p.contribution, lang)}</span>
            </div>
          ))}
        </div>
        <p className="small muted">{t("ending.legacyHint")}</p>
        <p>{t("ending.counts", { milestones: e.milestones, awards: e.awards })}</p>

        <h3>{t("ending.rivals")}</h3>
        <table className="products">
          <thead><tr><th>#</th><th>{t("ending.company")}</th><th className="num">{t("ending.revenue")}</th><th className="num">{t("ending.reputation")}</th></tr></thead>
          <tbody>
            {e.rivals.map((r) => (
              <tr key={`${r.rank}`} className={r.player ? "wf-pos" : ""}>
                <td>{r.rank}</td>
                <td>{r.player ? t("brandMarket.you") : r.name}{r.rival && <span className="badge">{t("ending.rival")}</span>}</td>
                <td className="num">{fmtMoney(r.revenueCent, lang)}</td>
                <td className="num">{fmtScore(r.reputationBp, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>{t("ending.chronicle")}</h3>
        <ul className="log log-box" tabIndex={0}>
          {chronicleLines(view, t, lang).map((line, i) => <li key={i}>{line}</li>)}
        </ul>

        <div className="ending-actions">
          {e.canContinue && <button type="button" className="primary" onClick={onContinue} autoFocus>{t("ending.continue")}</button>}
          <button type="button" className={e.canContinue ? "" : "primary"} onClick={onNewGame}>{t("gameover.newGame")}</button>
          <button type="button" onClick={() => download(`${file}.txt`, new Blob([lines().join("\n")], { type: "text/plain" }))}>{t("ending.exportText")}</button>
          <button type="button" onClick={() => exportPng(lines(), `${file}.png`)}>{t("ending.exportPng")}</button>
        </div>
      </div>
    </div>
  );
}
