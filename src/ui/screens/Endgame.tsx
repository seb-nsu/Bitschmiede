// Endgame-Themen (Auftrag 04.11.2026, Bewertung Fable): Vermächtnis-Herausforderungen und Krisen im Wissensbuch neben der
// Ruhmeshalle.
import type { ViewModel } from "../../sim/view/view";
import type { Sim } from "../useSim";
import { fmtMoney, fmtPct } from "../format";
import type { Lang, T } from "../texts";

export function EndgamePanel({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const e = view.endgame;
  const full = e.activeCount >= e.maxActive;
  return (
    <section className="panel" aria-labelledby="endgame-title">
      <h2 id="endgame-title">{t("endgame.title")}</h2>
      <h3>{t("challenge.heading", { points: (e.hallPoints / 100).toString(), n: e.activeCount, max: e.maxActive })}</h3>
      <p className="small muted">{t("challenge.explain")}</p>
      <ul className="milestones">
        {e.challenges.map((c) => (
          <li key={c.id} className={c.status === "offen" || c.status === "aufgegeben" ? "muted" : ""}>
            {c.status === "erfuellt" ? "★ " : c.status === "aktiv" ? "◐ " : "○ "}
            <strong>{t(`challenge.${c.id}.title`)}</strong>
            <span className="small muted"> · {t(`challenge.${c.id}.goal`, { n: c.target, year: e.rankFromYear })} · {t("challenge.points", { points: (c.points / 100).toString() })}</span>
            {c.status === "aktiv" && <span className="small"> · {t("challenge.progress", { now: Math.min(c.now, c.target), target: c.target })}</span>}
            {c.status === "erfuellt" && <span className="small wf-pos"> · {t(c.afterEnd ? "challenge.doneAfterEnd" : "challenge.done", { year: c.doneYear ?? 0 })}</span>}
            {" "}
            {(c.status === "offen" || c.status === "aufgegeben") && (c.offered ? (
              <button type="button" className="small" disabled={full} onClick={() => sim.input({ type: "challenge", id: c.id, action: "annehmen" })}>{t("challenge.accept")}</button>
            ) : <span className="small muted">{t("challenge.tooLate")}</span>)}
            {c.status === "aktiv" && (
              <button type="button" className="small" onClick={() => sim.input({ type: "challenge", id: c.id, action: "aufgeben" })}>{t("challenge.drop")}</button>
            )}
          </li>
        ))}
      </ul>
      {(e.serverCrisisUntilYear !== null || e.crisesSurvived > 0 || e.lastFineCent > 0) && (
        <>
          <h3>{t("crisis.heading")}</h3>
          {e.serverCrisisUntilYear !== null && <p className="small error">{t("crisis.server", { pct: fmtPct(e.serverCrisisBp - 10000, lang), year: e.serverCrisisUntilYear })}</p>}
          <p className="small muted">{t("crisis.survived", { n: e.crisesSurvived })}{e.lastFineCent > 0 ? " · " + t("crisis.lastFine", { cost: fmtMoney(e.lastFineCent, lang) }) : ""}</p>
        </>
      )}
    </section>
  );
}
