// Markt (S11 Bildschirm F, S08 Abschnitt 8, S14 Abschnitt 9): Plattform-Strom, Hersteller und Devkits, Rangliste,
// Rivalen-Karten mit „Warum?“, Ticker und das Regal des Markenmarkts.
import type { ViewModel } from "../../sim/view/view";
import { fmtInt, fmtMoney, fmtPct, fmtScore } from "../format";
import type { Lang, T } from "../texts";
import type { Sim } from "../useSim";
import { logText } from "./Focus";
import { BrandShelf } from "./BrandMarket";
import { useState } from "react";

export function Market({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  return (
    <section className="panel" aria-labelledby="market-title">
      <h2 id="market-title">{t("view.markt")}</h2>
      <p className={`market-phase phase-${view.marketPhase}`}>
        {t("marketPhase.label")}: <strong>{t(`marketPhase.${view.marketPhase}`)}</strong> · {t(`marketPhase.hint.${view.marketPhase}`)}
      </p>
      {/* Prüfung Fable 03.11.2026: die gesuchte Zahl (Platz, Marktanteil) oben; Hersteller nur mit Neuigkeit; Rivalen als Zeilen. */}
      <Position view={view} t={t} lang={lang} />
      <Future view={view} sim={sim} t={t} lang={lang} />
      <Ranking view={view} t={t} lang={lang} />
      <PlatformStream view={view} t={t} lang={lang} />
      <FairYear view={view} sim={sim} t={t} lang={lang} />
      <Makers view={view} sim={sim} t={t} lang={lang} />
      <Rivals view={view} sim={sim} t={t} lang={lang} />
      <BrandShelf view={view} sim={sim} t={t} lang={lang} />
    </section>
  );
}

/** S05 Abschnitt 8: Messe-Saison als Jahreskarte mit Projekt-Slots (MKT-R35) und den letzten Branchenpreisen (ZIE-R03). */
function FairYear({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const slots = view.active.filter((p) => p.status === "laeuft" || p.status === "bereit");
  const fair = slots[0]?.marketing.fair ?? null;
  const lastYear = view.goals.awards[0]?.year ?? null;
  const awards = view.goals.awards.filter((a) => a.year === lastYear);
  return (
    <>
      <h3>{t("fairYear.title")}</h3>
      <div className="fair-year">
        <div className="fair-slot">
          <strong>{fair ? t(fair.trade ? "fairYear.trade" : "fairYear.fair", { week: fair.date.weekOfYear + 1, year: fair.date.year }) : t("fairYear.noProjects")}</strong>
          {slots.length === 0 ? <p className="small muted">{t("fairYear.empty")}</p> : (
            <ul className="small">
              {slots.map((p) => (
                <li key={p.id}>
                  {p.title}{" "}
                  <select aria-label={t("fairYear.plan", { title: p.title })} value={p.marketing.fairPlan}
                    onChange={(e) => sim.input({ type: "setMarketing", projectId: p.id, fairPlan: e.target.value as typeof p.marketing.fairPlan })}>
                    <option value="auto">{t("fair.auto", { show: t(`fair.${p.marketing.fair.suggestion}`) })}</option>
                    {(["nichts", "trailer", "demo"] as const).map((f) => <option key={f} value={f}>{t(`fair.${f}`)}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          )}
          <p className="small">
            {t("booth.label")}{" "}
            <select aria-label={t("booth.label")} value={view.fairBooth.size} onChange={(e) => sim.input({ type: "setBooth", booth: e.target.value as typeof view.fairBooth.size })}>
              {view.fairBooth.options.map((o) => (
                <option key={o.size} value={o.size}>{t(`booth.${o.size}`, { effect: Math.round(o.effectBp / 100), cost: fmtMoney(o.costCent, lang) })}</option>
              ))}
            </select>
          </p>
          <p className="small muted">{t(fair?.trade ? "fair.tradeHint" : "fair.hint")} {t("booth.hint")}</p>
        </div>
        <div className="fair-slot">
          <strong>{lastYear === null ? t("fairYear.noAwards") : t("fairYear.awards", { year: lastYear })}</strong>
          <ul className="small">
            {awards.map((a) => (
              <li key={a.category} className={a.player ? "wf-pos" : ""}>{a.player ? "🏆 " : ""}{t(`award.${a.category}`)}: {a.player && !a.name ? t("goals.awardYou") : a.name}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

/** Prüfung Fable 03.11.2026: Platz und Marktanteil des Spielers als erste Zeile der Markt-Ansicht. */
function Position({ view, t, lang }: { view: ViewModel; t: T; lang: Lang }) {
  const me = view.ranking.entries.find((e) => e.player);
  if (!me) return null;
  return (
    <p className="market-position">
      {t("market.position", { rank: me.rank, n: view.ranking.studios + 1, share: fmtPct(me.shareBp, lang), revenue: fmtMoney(me.revenueCent, lang) })}
    </p>
  );
}

/** Plattform-Strom (Plan A): aktive Plattformen als Bänder, Breite = aktive Basis, mit Gebühr und Lebensende. */
function PlatformStream({ view, t, lang }: { view: ViewModel; t: T; lang: Lang }) {
  const list = [...view.catalog.platforms].sort((a, b) => b.base - a.base);
  const max = Math.max(1, ...list.map((p) => p.base));
  const total = list.reduce((s, p) => s + p.base, 0);
  return (
    <>
      <h3>{t("market.platforms")}</h3>
      <ul className="stream small">
        {list.map((p) => (
          <li key={p.id}>
            <span className="stream-name">{t(`platform.${p.id}`)}</span>
            <span className="stream-track"><span className={`stream-band tl-${p.type}`} style={{ width: `${Math.max(2, Math.round((p.base / max) * 100))}%` }} /></span>
            <span className="muted">
              {t("form.base", { n: fmtInt(Math.round(p.base / 100000) / 10, lang) })} · {fmtPct(Math.round((p.base * 10000) / Math.max(1, total)), lang)}
              {p.licenseFeeBp > 0 && <> · {t("form.fee", { pct: fmtPct(p.licenseFeeBp, lang) })}</>}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** MRK-R37, S11 Ansicht F: Rangliste nach Umsatz, Marktanteil und Ruf. */
function Ranking({ view, t, lang }: { view: ViewModel; t: T; lang: Lang }) {
  return (
    <>
      <h3>{t("ranking.title", { n: view.ranking.studios })}</h3>
      <table className="ledger">
        <thead>
          <tr><th>#</th><th>{t("ranking.firm")}</th><th>{t("ranking.people")}</th><th>{t("ranking.revenue")}</th><th>{t("ranking.share")}</th><th>{t("ranking.reputation")}</th></tr>
        </thead>
        <tbody>
          {view.ranking.entries.map((e) => (
            <tr key={e.id} className={e.player ? "ranking-you" : undefined}>
              <td>{e.rank}</td>
              <th scope="row">{e.player ? t("ranking.you") : e.name}{e.archetype && <span className="muted small"> · {t(`archetype.${e.archetype}`)}</span>}</th>
              <td>{fmtInt(e.people, lang)}</td>
              <td>{fmtMoney(e.revenueCent, lang)}</td>
              <td>{fmtPct(e.shareBp, lang)}</td>
              <td>{e.releases > 0 ? fmtScore(e.reputationBp, lang) : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** S14 Abschnitt 9, KI-R66: Rivalen-Karten mit Chef, Stimmung, Ziel, Beziehung und den letzten Zügen; Ticker (MRK-R52). */
function Rivals({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  if (view.rivals.length === 0) return null;
  return (
    <>
      <h3>{t("rival.title")}</h3>
      <div className="rival-lines">
        {view.rivals.map((r) => (
          <details key={r.id} className="rival-line" aria-label={r.name}>
            <summary>
              <strong>{r.name}</strong> <span className="muted small">· {t(`archetype.${r.archetype}`)} · {t("rival.chief", { chief: r.chief, mood: t(`rival.mood.${r.mood}`) })}</span>
              {r.goals && <span className="small"> · {t("rival.goals", { goals: r.goals.map((g) => t(`rival.goal.${g}`)).join(", ") })}</span>}
              {Math.round(r.relationBp / 100) !== 0 && <span className="small"> · {t("rival.relation", { n: Math.round(r.relationBp / 100) })}</span>}
            </summary>
            <p className="small muted">{r.traits.map((x) => t(`trait.${x}`)).join(" · ")}</p>
            <RelationBar values={r.relationHistory} label={t("rival.relation", { n: Math.round(r.relationBp / 100) })} />
            {r.keyPeople.length > 0 && (
              <ul className="small rival-moves">
                {r.keyPeople.map((k) => (
                  <li key={k.index}>
                    {k.name} <span className="muted">· {t(`role.${k.role}`)} {k.strength}</span>{" "}
                    <button type="button" className="linklike" disabled={k.blocked !== null}
                      title={k.blocked ? t(k.blocked) : t("rival.poachHint", { pct: Math.round(k.chanceBp / 100), raise: k.raiseBp / 100 })}
                      onClick={() => sim.input({ type: "poach", studioId: r.id, index: k.index, raiseBp: k.raiseBp })}>
                      {t("rival.poach")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {r.moves.length > 0 && (
              <ul className="small rival-moves">
                {groupMoves(r.moves).slice(0, 3).map((m, i) => (
                  <li key={i}>
                    {t(`rival.move.${m.domain}`)}{m.count > 1 && <span className="muted"> ×{m.count}</span>}{" "}
                    <span className="muted">– {t("rival.why")}: {m.reasons.map((x) => t(x)).join(", ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </details>
        ))}
      </div>
      {view.rivalTicker.length > 0 && (
        <>
          <h4>{t("rival.ticker")}</h4>
          <ul className="small">
            {view.rivalTicker.map((c, i) => <li key={i}>{c.date.year}: {logText(c, t, lang)}</li>)}
          </ul>
        </>
      )}
    </>
  );
}

type Move = ViewModel["rivals"][number]["moves"][number];

/** Gleiche Züge mit gleichen Gründen hintereinander zu einer Zeile mit Anzahl zusammenfassen (Übersichtlichkeit). */
function groupMoves(moves: Move[]): (Move & { count: number })[] {
  const out: (Move & { count: number })[] = [];
  for (const m of moves) {
    const last = out[out.length - 1];
    if (last && last.domain === m.domain && last.reasons.join() === m.reasons.join()) last.count++;
    else out.push({ ...m, count: 1 });
  }
  return out;
}

/** Beziehung −100 bis +100 als Balken mit Verlauf je Quartal. */
function RelationBar({ values, label }: { values: number[]; label: string }) {
  const w = 120;
  const h = 24;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const y = (v: number) => h / 2 - (v / 10000) * (h / 2);
  const points = values.map((v, i) => `${i * step},${y(v)}`).join(" ");
  return (
    <p className="small rival-relation">
      <svg width={w} height={h} role="img" aria-label={label}>
        <line x1="0" x2={w} y1={h / 2} y2={h / 2} className="tl-grid" />
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>{" "}
      {label}
    </p>
  );
}

/** S08 MRK-R14 bis MRK-R25: Beziehung je Hersteller, angekündigte Plattformen, Devkit-Stand und Antrag. */
function Makers({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  // Prüfung Fable 03.11.2026: nur Hersteller mit Beziehung abseits von 50 oder einer angekündigten Plattform.
  const makers = view.makers.filter((m) => m.relationBp !== 5000 || m.platforms.length > 0);
  if (makers.length === 0) return null;
  return (
    <>
      <h3>{t("maker.title")}</h3>
      <table className="ledger">
        <thead>
          <tr><th>{t("maker.name")}</th><th>{t("maker.relation")}</th><th>{t("maker.upcoming")}</th></tr>
        </thead>
        <tbody>
          {makers.map((m) => (
            <tr key={m.id}>
              <th scope="row">{t(`maker.${m.id}`)}</th>
              <td>{Math.round(m.relationBp / 100)}</td>
              <td>
                {m.platforms.length === 0 && <span className="muted">–</span>}
                {m.platforms.map((p) => (
                  <div key={p.id} className="small">
                    <strong>{t(`platform.${p.id}`)}</strong> ({p.launchYear}){" · "}
                    {p.devkit > 0 ? t("maker.devkitWave", { n: p.devkit }) : t("maker.noDevkit")}
                    {p.clockCut && <> · {t("maker.clockCut")}</>}
                    {p.launchRequest === "zugesagt" && <> · {t("maker.launchPromised")}</>}
                    {p.devkit === 0 && (
                      <>
                        {" "}
                        <button type="button" disabled={p.requestBlocked !== null} title={p.requestBlocked ? t(p.requestBlocked) : undefined}
                          onClick={() => sim.input({ type: "requestDevkit", platformId: p.id })}>
                          {t("maker.request", { fee: fmtMoney(p.feeCent, lang) })}
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small muted">{t("maker.legend")}</p>
    </>
  );
}

/**
 * MRK-R57, MRK-R68: Gerüchte mit unscharfem Zeitraum und eingetretene Wendepunkte; MRK-R58: Pin und Einsatz für die
 * Wette auf die Zukunft. Erscheint erst mit dem ersten Gerücht.
 */
function Future({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const f = view.future;
  if (f.points.length === 0) return null;
  const month = (d: { month: number; year: number }) => `${t(`date.month.${d.month}`).slice(0, 3)} ${d.year}`;
  return (
    <>
      <h3>{t("future.title")}</h3>
      <p className="small muted">{t("future.hint", { months: f.windowMonths })}</p>
      <ul className="future-list">
        {f.points.map((p) => (
          <li key={p.id} className={`future-${p.status}`}>
            <strong>{t(`future.${p.defId}`)}</strong> <span className="small muted">({t(`future.area.${p.area}`)})</span>{" "}
            {p.status === "geruecht"
              ? t("future.rumor", { from: month(p.from), to: month(p.to) })
              : t(`future.status.${p.status}${p.hit === null ? "" : p.hit ? ".hit" : ".miss"}`, { date: month(p.from) })}
            {p.chanceBp !== null ? ` · ${t("future.chance", { chance: fmtPct(p.chanceBp, lang) })}` : ""}
            {p.bet ? <span className="small"> · {t(`future.bet.${p.bet.result}`, { pin: month(p.bet.pin), stake: fmtMoney(p.bet.stakeCent, lang) })}</span> : null}
            {p.canBet && p.pins.length > 0 ? <BetForm point={p} view={view} sim={sim} t={t} lang={lang} month={month} /> : null}
          </li>
        ))}
      </ul>
    </>
  );
}

function BetForm({ point, view, sim, t, lang, month }: {
  point: ViewModel["future"]["points"][number]; view: ViewModel; sim: Sim; t: T; lang: Lang; month: (d: { month: number; year: number }) => string;
}) {
  const f = view.future;
  const pins = point.pins.map((p) => ({ week: p.week, label: month(p.date) }));
  const stakes = [500, 1000, 1500, 2000].filter((bp) => bp <= f.maxStakeBp);
  const [pin, setPin] = useState(pins[0]?.week ?? point.toWeek);
  const [stake, setStake] = useState(stakes[0] ?? f.maxStakeBp);
  return (
    <div className="future-bet small">
      <label>{t("future.pin")}{" "}
        <select value={pin} onChange={(e) => setPin(Number(e.target.value))}>
          {pins.map((p) => <option key={p.week} value={p.week}>{p.label}</option>)}
        </select>
      </label>{" "}
      <label>{t("future.stake")}{" "}
        <select value={stake} onChange={(e) => setStake(Number(e.target.value))}>
          {stakes.map((bp) => <option key={bp} value={bp}>{fmtPct(bp, lang)}</option>)}
        </select>
      </label>{" "}
      <button type="button" onClick={() => sim.input({ type: "futureBet", pointId: point.id, pinWeek: pin, stakeBp: stake })}>{t("future.betButton")}</button>
    </div>
  );
}
