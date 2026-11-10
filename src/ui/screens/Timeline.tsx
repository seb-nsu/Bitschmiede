// Zeitleiste (S11, Zeitstrom UI-R27): Plattform-Lebenszeiten, eigene Releases mit Wertung, Chronik-Marken.
import { useEffect, useRef } from "react";
import type { ViewModel } from "../../sim/view/view";
import { fmtScore } from "../format";
import type { Lang, T } from "../texts";
import { logText } from "./Focus";

const YEAR_W = 90;
const ROW_H = 22;

export function Timeline({ view, t, lang }: { view: ViewModel; t: T; lang: Lang }) {
  const first = Math.min(view.date.year, ...view.timeline.platforms.map((p) => Math.max(p.releaseYear, 1980)), 1980);
  const last = view.date.year + 2;
  const years = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const x = (year: number, week = 0) => (year - first) * YEAR_W + (week / 52) * YEAR_W;
  const platforms = view.timeline.platforms.filter((p) => p.releaseYear <= last && p.endYear >= first);
  const releasesY = platforms.length * ROW_H + 30;
  const foreignY = releasesY + 44;
  const chronicleY = foreignY + 40;
  const height = chronicleY + 40;
  const tl = view.timeline;
  const width = years.length * YEAR_W + 20;
  // Prüfung Fable 03.11.2026: beim Öffnen die letzten fünf und die nächsten zwei Jahre zeigen, nicht 1980.
  const scroller = useRef<HTMLDivElement>(null);
  const startX = x(Math.max(first, view.date.year - 5));
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = startX;
  }, [startX]);
  return (
    <section className="panel" aria-labelledby="timeline-title">
      <h2 id="timeline-title">{t("view.zeitleiste")}</h2>
      <div className="timeline-scroll" ref={scroller}>
        <svg width={width} height={height} className="timeline" role="img" aria-label={t("view.zeitleiste")}>
          {years.map((y) => (
            <g key={y}>
              <line x1={x(y)} x2={x(y)} y1={0} y2={height} className="tl-grid" />
              <text x={x(y) + 4} y={14} className="tl-year">{y}</text>
            </g>
          ))}
          <line x1={x(view.date.year, view.date.weekOfYear)} x2={x(view.date.year, view.date.weekOfYear)} y1={0} y2={height} className="tl-now" />
          {platforms.map((p, i) => (
            <g key={p.id}>
              <rect x={x(Math.max(p.releaseYear, first))} y={22 + i * ROW_H} width={Math.max(4, x(Math.min(p.endYear + 1, last + 1)) - x(Math.max(p.releaseYear, first)))}
                height={ROW_H - 6} rx="3" className={`tl-platform tl-${p.type}`} />
              <text x={x(Math.max(p.releaseYear, first)) + 4} y={22 + i * ROW_H + 12} className="tl-label">{t(`platform.${p.id}`)}</text>
            </g>
          ))}
          {view.products.map((p) => p.result && (
            <g key={p.id}>
              <circle cx={x(p.result.year, p.result.week % 52)} cy={releasesY} r="7" className={p.result.scoreBp >= 70000 ? "tl-hit" : p.result.scoreBp < 50000 ? "tl-flop" : "tl-release"} />
              <text x={x(p.result.year, p.result.week % 52)} y={releasesY + 22} textAnchor="middle" className="tl-label">{fmtScore(p.result.scoreBp, lang)}</text>
              <title>{p.title}</title>
            </g>
          ))}
          {/* Prüfung Fable 03.11.2026: fremde Hits (gefüllt) und angekündigte fremde Releases (hohl), Messen und Auftragsenden. */}
          {tl.fairs.map((f) => (
            <g key={`f${f.year}`}>
              <line x1={x(f.year, f.week)} x2={x(f.year, f.week)} y1={18} y2={height} className="tl-fair" />
              <title>{t(f.trade ? "timeline.tradeFair" : "timeline.fair", { year: f.year })}</title>
            </g>
          ))}
          {tl.foreign.map((p, i) => (
            <g key={`a${i}`}>
              <circle cx={x(p.year, p.week)} cy={foreignY} r="5" className={p.scoreBp === null ? "tl-foreign-planned" : "tl-foreign"} />
              <title>{p.scoreBp === null
                ? t("timeline.foreignPlanned", { studio: p.studio, genre: t(`genre.${p.genre}`) })
                : t("timeline.foreignHit", { studio: p.studio, genre: t(`genre.${p.genre}`), score: fmtScore(p.scoreBp, lang) })}</title>
            </g>
          ))}
          {tl.contractEnds.map((c, i) => (
            <g key={`c${i}`}>
              <rect x={x(c.year, c.week) - 4} y={releasesY - 18} width="8" height="8" className="tl-contract" />
              <title>{t("timeline.contractEnd", { client: c.client })}</title>
            </g>
          ))}
          {view.chronicle.filter((c) => c.key === "chronicle.info").map((c, i) => (
            <g key={i}>
              <rect x={x(c.date.year, c.date.weekOfYear) - 5} y={chronicleY - 5} width="10" height="10" transform={`rotate(45 ${x(c.date.year, c.date.weekOfYear)} ${chronicleY})`} className="tl-info" />
              <title>{logText(c, t, lang)}</title>
            </g>
          ))}
        </svg>
      </div>
      <p className="small muted">{t("timeline.legend")}</p>
    </section>
  );
}
