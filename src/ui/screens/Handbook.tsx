// Etappe 6c.11 (docs/design/Konzept-Einstieg.md, 3.4 und 3.5): Handbuch mit Zusammenhangs-Karte und einem Artikel je System.
// Reine Anzeige: freigeschaltet wird ein Artikel mit seinem System (aus dem Anzeigemodell).
import { useEffect, useState } from "react";
import type { ViewModel } from "../../sim/view/view";
import type { T } from "../texts";
import { ScoreChain } from "./Knowledge";

export type ArticleId =
  | "karten" | "team" | "engine" | "passung" | "saeulen" | "phasen" | "politur" | "bugs" | "umfang"
  | "wertung" | "verkauf" | "lokalisierung"
  | "geld" | "auftraege" | "marken" | "wachstum";

const GROUPS: { id: "input" | "result" | "money"; articles: ArticleId[] }[] = [
  { id: "input", articles: ["karten", "team", "engine", "passung", "saeulen", "phasen", "politur", "bugs", "umfang"] },
  { id: "result", articles: ["wertung", "verkauf", "lokalisierung"] },
  { id: "money", articles: ["geld", "auftraege", "marken", "wachstum"] },
];

/** Ein Artikel ist offen, sobald sein System im Spiel auftaucht. */
export function articleOpen(v: ViewModel, id: ArticleId): boolean {
  switch (id) {
    case "engine": return v.unlocks.includes("engine") || v.engine !== null;
    case "auftraege": return v.unlocks.includes("auftraege") || v.contractGames.unlocked;
    case "marken": return v.unlocks.includes("marken");
    case "wachstum": return v.unlocks.includes("publisher");
    default: return true;
  }
}

/** Öffnet einen Handbuch-Artikel von überall (App hört auf das Ereignis und wechselt ins Wissensbuch). */
export function openHelp(id: ArticleId): void {
  window.dispatchEvent(new CustomEvent<ArticleId>("gst-help", { detail: id }));
}

/** „?“ an einer Kennzahl: öffnet den passenden Handbuch-Artikel (Konzept 4). */
export function HelpLink({ id, t, before }: { id: ArticleId; t: T; before?: () => void }) {
  return (
    <button type="button" className="help-link" aria-label={t("hb.open", { title: t(`hb.${id}.title`) })} title={t("hb.open", { title: t(`hb.${id}.title`) })}
      onClick={() => { before?.(); openHelp(id); }}>?</button>
  );
}

export function Handbook({ view, t, article }: { view: ViewModel; t: T; article: ArticleId | null }) {
  const [open, setOpen] = useState<ArticleId | null>(article);
  useEffect(() => {
    if (article === null) return;
    window.setTimeout(() => document.getElementById(`hb-${article}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, [article]);
  const pick = (id: ArticleId) => {
    setOpen(id);
    window.setTimeout(() => document.getElementById(`hb-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  };
  const shown = open;
  return (
    <section className="panel handbook" aria-labelledby={article ? "hb-title" : "hb-title-inline"}>
      <h2 id={article ? "hb-title" : "hb-title-inline"}>{t("hb.title")}</h2>
      <p className="muted small">{t("hb.intro")}</p>
      <ScoreChain t={t} />
      <h3>{t("hb.map")}</h3>
      <div className="hb-map" role="list">
        {GROUPS.map((g, i) => (
          <div key={g.id} className="hb-map-group" role="listitem">
            {i > 0 && <span className="hb-map-arrow" aria-hidden="true">→</span>}
            <div className="hb-map-col">
              <strong className="small">{t(`hb.group.${g.id}`)}</strong>
              {g.articles.map((id) => {
                const ok = articleOpen(view, id);
                return (
                  <button key={id} type="button" className={`hb-node${ok ? "" : " locked"}${shown === id ? " on" : ""}`} onClick={() => pick(id)} title={ok ? undefined : t("hb.locked")}>
                    {t(`hb.${id}.title`)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="muted small">{t("hb.loop")}</p>
      {GROUPS.flatMap((g) => g.articles).map((id) => {
        const ok = articleOpen(view, id);
        return (
          <details key={id} id={`hb-${id}`} className="hb-article" open={shown === id} onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) setOpen(id); }}>
            <summary>{t(`hb.${id}.title`)}{ok ? "" : ` · ${t("hb.locked")}`}</summary>
            <dl>
              {(["what", "how", "mistakes", "where"] as const).map((part) => (
                <div key={part}>
                  <dt>{t(`hb.${part}`)}</dt>
                  <dd>{t(`hb.${id}.${part}`)}</dd>
                </div>
              ))}
            </dl>
          </details>
        );
      })}
    </section>
  );
}
