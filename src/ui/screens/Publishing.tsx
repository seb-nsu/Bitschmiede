// Eigenes Publishing (S13 AUS-R40 bis AUS-R43): Pitches der KI-Studios mit drei Paketen, laufende Verträge mit Meilensteinen.
import type { ViewModel } from "../../sim/view/view";
import type { Sim } from "../useSim";
import { fmtMoney, fmtPct, fmtScore } from "../format";
import type { Lang, T } from "../texts";

export function PublishingPanel({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const p = view.publishing;
  if (!p.visible) return null;
  const full = p.used >= p.slots;
  return (
    <section className="panel" aria-labelledby="publishing-title">
      <h2 id="publishing-title">{t("publishing.title")}</h2>
      <p className="small muted">{t("publishing.hint", { used: p.used, slots: p.slots })}</p>
      {p.pitches.length === 0 && <p className="muted small">{t("publishing.noPitches")}</p>}
      {p.pitches.map((x) => (
        <div key={x.id} className="callout">
          <strong>{t("publishing.pitch", { studio: x.studio, genre: t(`genre.${x.genre}`), scope: t(`scope.${x.scope}`) })}</strong>
          <p className="small">
            {t(`publishing.mode.${x.mode}`, { score: fmtScore(x.shownScoreBp, lang), noise: fmtScore(x.noiseBp, lang) })}
            {" · "}{t("publishing.budget", { budget: fmtMoney(x.budgetCent, lang) })}
            {" · "}{t("publishing.weeksLeft", { n: x.weeksLeft })}
          </p>
          <div className="pub-actions">
            {x.packages.map((k) => (
              <button key={k.id} type="button" disabled={full} onClick={() => sim.input({ type: "publishingOffer", pitchId: x.id, package: k.id })}>
                {t(`publishing.package.${k.id}`, { advance: fmtMoney(k.advanceCent, lang), share: fmtPct(10000 - k.studioShareBp, lang), accept: fmtPct(k.acceptBp, lang) })}
              </button>
            ))}
            <button type="button" onClick={() => sim.input({ type: "publishingOffer", pitchId: x.id, package: null })}>{t("publishing.decline")}</button>
          </div>
        </div>
      ))}
      {p.deals.length > 0 && (
        <table className="table small">
          <thead><tr><th>{t("publishing.colStudio")}</th><th>{t("publishing.colStatus")}</th><th>{t("publishing.colPaid")}</th><th>{t("publishing.colIncome")}</th><th /></tr></thead>
          <tbody>
            {p.deals.map((d) => (
              <tr key={d.id}>
                <td>{d.studio} · {t(`genre.${d.genre}`)}{d.scoreBp !== null && <> · {fmtScore(d.scoreBp, lang)}</>}</td>
                <td>{t(`publishing.status.${d.status}`)}{d.decision && <strong className="error"> · {t("publishing.missed")}</strong>}</td>
                <td>{fmtMoney(d.paidCent, lang)} / {fmtMoney(d.advanceCent, lang)}</td>
                <td>{fmtMoney(d.incomeCent, lang)} <span className="muted">({fmtPct(10000 - d.studioShareBp, lang)})</span></td>
                <td>
                  {d.decision && (
                    <>
                      <button type="button" onClick={() => sim.input({ type: "publishingDeal", dealId: d.id, action: "zahlen" })}>{t("publishing.pay")}</button>
                      <button type="button" onClick={() => sim.input({ type: "publishingDeal", dealId: d.id, action: "kuerzen" })}>{t("publishing.cut")}</button>
                    </>
                  )}
                  {d.status === "laeuft" && <button type="button" onClick={() => sim.input({ type: "publishingDeal", dealId: d.id, action: "stoppen" })}>{t("publishing.stop")}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
