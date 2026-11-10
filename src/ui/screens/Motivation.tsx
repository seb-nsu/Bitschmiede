// Langzeitmotivation (Prüfung Fable 03.11.2026): Strategiekonferenz, Jahresziel, Erzrivale und Epochen-Frage in der Zentrale,
// Serie, Epochentitel und Rivalen-Bilanz im Wissensbuch (Ruhmeshalle).
import type { ViewModel } from "../../sim/view/view";
import type { AnnualGoalView } from "../../sim/view/motivationView";
import type { Sim } from "../useSim";
import { fmtInt, fmtMoney, fmtPct, fmtScore } from "../format";
import type { Lang, T } from "../texts";

function value(g: AnnualGoalView, n: number, lang: Lang, t: T): string {
  if (g.kind === "wertung" || g.kind === "wertungTrend") return n > 0 ? fmtScore(n, lang) : "–";
  if (g.kind === "umsatz") return fmtMoney(n, lang);
  if (g.kind === "rangliste") return n > 0 ? t("annual.place", { n }) : "–";
  return fmtInt(n, lang);
}

export function goalText(g: AnnualGoalView, lang: Lang, t: T): string {
  return t(`annual.${g.id}`, {
    target: value(g, g.target, lang, t),
    genre: g.param ? t(`genre.${g.param}`) : "",
    platform: g.param ? t(`platform.${g.param}`) : "",
  });
}

function rewardText(g: AnnualGoalView, lang: Lang, t: T): string {
  return t(`annual.reward.${g.reward.kind}`, { n: g.reward.kind === "ruf" ? fmtInt(g.reward.bp / 100, lang) : fmtPct(g.reward.bp, lang) });
}

/** Zentrale: Konferenz-Karte (Wahl) oder drei Zeilen zum laufenden Jahr, Rivalen und Jahrzehnt. */
export function MotivationBox({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const m = view.motivation;
  if (m.offers.length > 0) {
    return (
      <div className="callout conference" role="group" aria-labelledby="conference-title">
        <strong id="conference-title">{t("conference.title", { year: m.offers[0]!.year })}</strong>
        <p className="small muted">{t("conference.hint", { week: (m.deadline?.weekOfYear ?? 0) + 1 })}</p>
        <div className="conference-offers">
          {m.offers.map((g, i) => (
            <button key={g.id} type="button" className={i === 0 ? "primary" : ""} onClick={() => sim.input({ type: "annualGoal", index: i })}>
              {goalText(g, lang, t)}
              <span className="small muted"> · {rewardText(g, lang, t)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  const g = m.annual;
  const a = m.archrival;
  const e = m.epoch;
  if (!g && !a && !e) return null;
  return (
    <ul className="motivation small">
      {g && (
        <li>
          <strong>{t("annual.label", { year: g.year })}:</strong> {goalText(g, lang, t)}
          {" · "}
          {g.status === "offen"
            ? <span className="muted">{t("annual.now", { now: value(g, g.now, lang, t) })}</span>
            : <span className={g.status === "erreicht" ? "wf-pos" : "error"}>{t(`annual.status.${g.status}`)}</span>}
          {m.streak > 1 && <span className="badge">{t("annual.streak", { n: m.streak })}</span>}
        </li>
      )}
      {a && (
        <li>
          <strong>{t("archrival.label")}:</strong> {a.name}
          {a.next && <span className="muted"> · {t("archrival.next", { genre: t(`genre.${a.next.genre}`), month: a.next.date.month + 1, year: a.next.date.year })}</span>}
          {" · "}{t("archrival.record", { wins: a.wins, losses: a.losses })}
        </li>
      )}
      {e && (
        <li>
          <strong>{t("epoch.label", { from: e.from, to: e.to })}:</strong> {t(`epoch.${e.id}.question`)}
          <span className="muted"> · {e.rank
            ? t("epoch.rankNow", { n: e.value > 0 ? e.value : "–", next: e.tiers[e.tier] ?? e.tiers[e.tiers.length - 1]! })
            : t("epoch.now", { n: e.value, next: e.tiers[e.tier] ?? e.tiers[e.tiers.length - 1]! })}</span>
          {e.tier > 0 && <span className="badge">{t(`epoch.${e.id}.title${e.tier}`)}</span>}
        </li>
      )}
    </ul>
  );
}

/** Wissensbuch, Ruhmeshalle: Serie der Jahresziele, Epochentitel, Erzrivalen. */
export function MotivationHall({ view, t }: { view: ViewModel; t: T }) {
  const m = view.motivation;
  const done = m.history.filter((h) => h.status === "erreicht").length;
  return (
    <>
      <h3>{t("annual.hallTitle")}</h3>
      {m.history.length === 0 ? <p className="muted">{t("annual.hallEmpty")}</p> : (
        <p className="small">{t("annual.hallLine", { done, total: m.history.length, best: m.bestStreak })}</p>
      )}
      {m.epochTitles.length > 0 && (
        <>
          <h3>{t("epoch.hallTitle")}</h3>
          <ul className="milestones">
            {m.epochTitles.map((x) => (
              <li key={x.id} className={x.tier > 0 ? "" : "muted"}>
                {x.tier > 0 ? "★".repeat(x.tier) + " " + t(`epoch.${x.id}.title${x.tier}`) : "○ " + t("epoch.missed")}
                <span className="small muted"> · {t(`epoch.${x.id}.question`)} ({x.to - 9}–{x.to})</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {(m.archrival || m.formerRivals.length > 0) && (
        <>
          <h3>{t("archrival.hallTitle")}</h3>
          <ul className="milestones">
            {m.archrival && <li>{t("archrival.hallNow", { name: m.archrival.name, year: m.archrival.sinceYear, wins: m.archrival.wins, losses: m.archrival.losses })}</li>}
            {m.formerRivals.map((r, i) => (
              <li key={i} className="muted">{t(`archrival.hallEnd.${r.end}`, { name: r.name, year: r.year, wins: r.wins, losses: r.losses })}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
