// S10 Abschnitt 8: Meilensteine als Karten, langfristiges Ziel und Ruhmeshalle im Wissensbuch (ZIE-R01, ZIE-R02, ZIE-R06), Branchenpreise (ZIE-R03).
import type { ViewModel } from "../../sim/view/view";
import { fmtInt, fmtScore } from "../format";
import type { Lang, T } from "../texts";
import { MotivationHall } from "./Motivation";

export function GoalsPanel({ view, t, lang }: { view: ViewModel; t: T; lang: Lang }) {
  const g = view.goals;
  const reached = g.milestones.filter((m) => m.week !== null).length;
  return (
    <section className="panel" aria-labelledby="goals-title">
      <h2 id="goals-title">{t("goals.title")}</h2>
      {g.scenario && (
        <p>
          <strong>{t("goals.scenario")}:</strong> {t(`scenario.${g.scenario.id}`)} · {t(`scenario.${g.scenario.id}.goal`, { year: g.scenario.deadlineYear })}
          {" · "}<span className={g.scenario.status === "verloren" ? "error" : g.scenario.status === "gewonnen" ? "wf-pos" : "muted"}>{t(`goals.scenarioStatus.${g.scenario.status}`)}</span>
          {g.scenario.players && g.scenario.status === "laeuft" && (
            <span className="small muted"> · {t("goals.players", { now: fmtInt(g.scenario.players.now, lang), target: fmtInt(g.scenario.players.target, lang) })}</span>
          )}
          {g.scenario.interest && g.scenario.status === "laeuft" && (
            <span className="small muted"> · {t("goals.interest", { released: fmtInt(g.scenario.interest.released, lang), running: fmtInt(g.scenario.interest.running, lang), target: fmtInt(g.scenario.interest.target, lang) })}</span>
          )}
          {g.scenario.integration && g.scenario.status === "laeuft" && (
            <span className="small muted"> · {t("goals.integration", { done: g.scenario.integration.done, total: g.scenario.integration.total, left: g.scenario.integration.left, max: g.scenario.integration.maxLeft })}</span>
          )}
          {g.scenario.plannedEndYear !== null && g.scenario.status === "laeuft" && g.scenario.platform && (
            <span className="small muted"> · {t("goals.plannedEnd", { platform: t(`platform.${g.scenario.platform}`), year: g.scenario.plannedEndYear })}</span>
          )}
        </p>
      )}
      {g.goal && (
        <p>
          <strong>{t("goals.longTerm")}:</strong> {t(`goal.${g.goal.id}`)} · <span className={g.goal.status === "verfehlt" ? "error" : g.goal.status === "erreicht" ? "wf-pos" : "muted"}>{t(`goals.status.${g.goal.status}`)}</span>
          <span className="small muted"> · {t(`goal.${g.goal.id}.hint`)}</span>
        </p>
      )}
      <h3>{t("goals.milestones", { n: reached, total: g.milestones.length })}</h3>
      {/* Übersicht: erreichte Meilensteine stehen offen, die offenen eingeklappt. */}
      {reached > 0 && (
        <ul className="milestones">
          {g.milestones.filter((m) => m.week !== null).map((m) => (
            <li key={m.id}>
              ✓ {t(`milestone.${m.id}`)}
              {m.date && <span className="small muted"> · {t("log.week", { n: m.date.weekOfYear + 1, year: m.date.year })}</span>}
            </li>
          ))}
        </ul>
      )}
      {reached < g.milestones.length && (
        <details>
          <summary className="small">{t("goals.openMilestones", { n: g.milestones.length - reached })}</summary>
          <ul className="milestones">
            {g.milestones.filter((m) => m.week === null).map((m) => <li key={m.id} className="muted">○ {t(`milestone.${m.id}`)}</li>)}
          </ul>
        </details>
      )}
      <h3>{t("goals.hall")}</h3>
      {g.hallOfFame.length === 0 ? <p className="muted">{t("goals.hallEmpty")}</p> : (
        <ol className="hall">
          {g.hallOfFame.map((p) => (
            <li key={p.id}>
              <strong>{fmtScore(p.scoreBp, lang)}</strong> {p.title} <span className="small muted">({p.year}, {t("goals.sold", { n: fmtInt(p.sold, lang) })})</span>
              {p.awards.map((a) => <span key={a} className="badge">🏆 {t(`award.${a}`)}</span>)}
            </li>
          ))}
        </ol>
      )}
      <MotivationHall view={view} t={t} />
      <h3>{t("goals.awards")}</h3>
      <p className="small">{t("goals.awardsWon", { n: g.playerAwards })}</p>
      {g.awards.length === 0 ? <p className="muted">{t("goals.awardsNone")}</p> : (
        <ul className="awards">
          {g.awards.map((a, i) => (
            <li key={i} className={a.player ? "wf-pos" : a.playerNominated ? "" : "muted"}>
              {a.player ? "🏆 " : ""}{t("goals.awardYear", { year: a.year, category: t(`award.${a.category}`), name: a.player && !a.name ? t("goals.awardYou") : a.name })}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
