// Visualisierungs-Bausteine für Etappe 0: Wertungs-Wasserfall, Bereichsprofil, Bug-Kurve.
import type { AreaMap, ScoreBar } from "../sim/model/types";
import { fmtBar, fmtPct, fmtScore } from "./format";
import type { Lang, T } from "./texts";

const AREA_ORDER = ["gameplay", "grafik", "sound", "story", "technik"] as const;

interface WaterfallProps {
  baseBp: number;
  bars: ScoreBar[];
  scoreBp: number;
  /** Balken des vorigen Projekts für die Spalte „zum vorigen“. */
  previous?: ScoreBar[] | null;
  t: T;
  lang: Lang;
}

/**
 * Wasserfall der Wertung (S11, UI-R104): Ausgangswert, ein Balken je Faktor, Wertung.
 * Zeitgeist und Tagesform erscheinen immer, auch bei 0; die Begrenzung nur, wenn sie wirkt.
 */
export function Waterfall({ baseBp, bars, scoreBp, previous, t, lang }: WaterfallProps) {
  const rows = bars.filter((b) => b.factor !== "begrenzung" || b.value !== 0);
  const levels: number[] = [baseBp];
  for (const b of rows) levels.push(levels[levels.length - 1]! + b.value);
  const lo = Math.max(0, Math.floor(Math.min(...levels, scoreBp) / 10000) - 1) * 10000;
  const hi = Math.min(10, Math.ceil(Math.max(...levels, scoreBp) / 10000) + 1) * 10000;
  const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const width = (a: number, b: number) => `${(Math.abs(b - a) / (hi - lo)) * 100}%`;
  const ticks: number[] = [];
  for (let v = lo; v <= hi; v += 10000) ticks.push(v);

  return (
    <div className="waterfall" role="table" aria-label={t("release.waterfall")}>
      <div className="wf-row wf-head" role="row">
        <span role="columnheader" />
        <div className="wf-axis" aria-hidden>
          {ticks.map((v) => (
            <span key={v} className="wf-tick" style={{ left: pos(v) }}>{v / 10000}</span>
          ))}
        </div>
        <span role="columnheader" />
        {previous !== undefined && <span role="columnheader" className="wf-cmp">{previous ? t("products.delta") : ""}</span>}
      </div>
      <div className="wf-row" role="row" title={t("bar.start.hint")}>
        <span role="rowheader">{t("bar.start")}</span>
        <div className="wf-track"><div className="wf-bar wf-base" style={{ left: 0, width: pos(baseBp) }} /></div>
        <span className="wf-val" role="cell">{fmtScore(baseBp, lang)}</span>
        {previous !== undefined && <span className="wf-cmp" role="cell" />}
      </div>
      {rows.map((b, i) => {
        const from = levels[i]!;
        const level = levels[i + 1]!;
        const prev = previous?.find((p) => p.factor === b.factor);
        const delta = prev ? b.value - prev.value : null;
        const cls = b.value > 0 ? "wf-pos" : b.value < 0 ? "wf-neg" : "wf-zero";
        return (
          <div className="wf-row" role="row" key={b.factor} title={t(`bar.${b.factor}.hint`)}>
            <span role="rowheader">{t(`bar.${b.factor}`)}</span>
            <div className="wf-track">
              <div className={`wf-bar ${cls}`} style={{ left: pos(Math.min(from, level)), width: width(from, level) }} />
            </div>
            <span className={`wf-val ${cls}`} role="cell">{fmtBar(b.value, lang)}</span>
            {previous !== undefined && (
              <span className={`wf-cmp ${delta && delta > 0 ? "wf-pos" : delta && delta < 0 ? "wf-neg" : ""}`} role="cell">
                {delta === null ? "" : fmtBar(delta, lang)}
              </span>
            )}
          </div>
        );
      })}
      <div className="wf-row wf-total" role="row">
        <span role="rowheader">{t("bar.total")}</span>
        <div className="wf-track"><div className="wf-bar wf-sum" style={{ left: 0, width: pos(scoreBp) }} /></div>
        <span className="wf-val" role="cell">{fmtScore(scoreBp, lang)}</span>
        {previous !== undefined && <span className="wf-cmp" role="cell" />}
      </div>
    </div>
  );
}

export function ProfileBars({ actual, expected, t, lang }: { actual: AreaMap; expected: AreaMap; t: T; lang: Lang }) {
  return (
    <div className="profile">
      <div className="profile-legend">
        <span className="swatch swatch-actual" /> {t("form.profile.actual")}
        <span className="swatch swatch-expected" /> {t("form.profile.expected")}
      </div>
      {AREA_ORDER.map((a) => (
        <div className="profile-row" key={a}>
          <span className="profile-label">{t(`area.${a}`)}</span>
          <div className="profile-track">
            <div className="profile-bar profile-actual" style={{ width: `${actual[a] / 100}%` }} />
            <div className="profile-mark" style={{ left: `${expected[a] / 100}%` }} title={`${t("form.profile.expected")} ${fmtPct(expected[a], lang)}`} />
          </div>
          <span className="profile-val">{fmtPct(actual[a], lang)} / {fmtPct(expected[a], lang)}</span>
        </div>
      ))}
    </div>
  );
}

export function BugCurve({ history, readyIndex }: { history: number[]; readyIndex: number | null }) {
  if (history.length < 2) return <svg className="bugcurve" viewBox="0 0 200 50" aria-hidden />;
  const max = Math.max(1, ...history);
  const x = (i: number) => (i / (history.length - 1)) * 200;
  const y = (v: number) => 48 - (v / max) * 44;
  const points = history.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className="bugcurve" viewBox="0 0 200 50" role="img" aria-label={`Bugs: ${history[history.length - 1]}`}>
      {readyIndex !== null && readyIndex < history.length && (
        <line x1={x(readyIndex)} x2={x(readyIndex)} y1={0} y2={50} className="bugcurve-mark" />
      )}
      <polyline points={points} className="bugcurve-line" />
    </svg>
  );
}

/** S06 Abschnitt 8: kleine Verlaufslinie (Zufriedenheit, Spielerbasis). */
export function Sparkline({ values, max, label }: { values: number[]; max?: number; label: string }) {
  const top = Math.max(1, max ?? Math.max(...values));
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * 120;
  const y = (v: number) => 22 - (v / top) * 20;
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 120 24" role="img" aria-label={label}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
