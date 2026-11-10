// Etappe 6c.11 (docs/design/Konzept-Einstieg.md): Lernpfad mit Kapiteln und Freischalt-Karten.
// Reine Anzeige wie der Coach: Ziele werden aus dem Anzeigemodell geprüft, der Fortschritt liegt im Spielstand (Prüfung Fable).
import { useState } from "react";
import type { ViewModel } from "../../sim/view/view";
import type { T } from "../texts";
import type { Sim } from "../useSim";
import type { GuideSeenInput } from "../../sim/model/types";
import { type ArticleId, openHelp } from "./Handbook";
import { displayPrefs } from "../display";

export type GuideTarget = "zentrale" | "projekte" | "firma" | "markt" | "engine" | "finanzen" | "wissensbuch";

interface Chapter {
  id: string;
  /** Kapitel ist erreichbar (System offen, Voraussetzung erfüllt). */
  ready: (v: ViewModel) => boolean;
  done: (v: ViewModel) => boolean;
  /** „Zeig mir“: Ansicht und hervorgehobenes Element (CSS-Selektor). */
  show: { view: GuideTarget; selector: string };
}

const anyProject = (v: ViewModel) => [...v.active, ...v.paused, ...v.products];

export const CHAPTERS: Chapter[] = [
  { id: "erstesSpiel", ready: () => true, done: (v) => anyProject(v).length > 0, show: { view: "projekte", selector: "[data-guide=start]" } },
  { id: "zeit", ready: (v) => anyProject(v).length > 0, done: (v) => v.products.length > 0 || v.active.some((p) => p.progressBp > 0), show: { view: "projekte", selector: ".time" } },
  { id: "playtest", ready: (v) => v.active.some((p) => p.progressBp >= 3000) || v.products.length > 0, done: (v) => v.products.length > 0 || v.active.some((p) => p.playtests.length > 0), show: { view: "projekte", selector: "[data-guide=playtest]" } },
  { id: "release", ready: (v) => v.active.some((p) => p.status === "bereit") || v.products.length > 0, done: (v) => v.products.length > 0, show: { view: "projekte", selector: "[data-guide=release]" } },
  { id: "wertung", ready: (v) => v.products.length > 0, done: (v) => v.products.length >= 2, show: { view: "wissensbuch", selector: ".hb-map" } },
  { id: "wachsen", ready: (v) => v.unlocks.includes("bewerbungen"), done: (v) => v.people.length >= 3, show: { view: "zentrale", selector: ".focus" } },
  { id: "marketing", ready: (v) => v.products.length > 0 && v.active.length > 0, done: (v) => anyProject(v).some((p) => p.marketing.budgetPermille > 0 || p.marketing.spentCent > 0), show: { view: "projekte", selector: ".marketing" } },
  { id: "auftraege", ready: (v) => v.unlocks.includes("auftraege") || v.contractGames.unlocked, done: (v) => v.contracts.length > 0 || anyProject(v).some((p) => p.contractGame !== null), show: { view: "projekte", selector: ".market-offers" } },
  { id: "engine", ready: (v) => v.unlocks.includes("engine"), done: (v) => v.engine !== null, show: { view: "engine", selector: "#engine-title" } },
  { id: "teams", ready: (v) => v.staff.teamsBlocked === null, done: (v) => v.staff.teams.some((x) => x.focus !== null), show: { view: "firma", selector: "[data-guide=teams]" } },
  { id: "groesser", ready: (v) => v.products.length >= 2, done: (v) => v.products.some((p) => p.scope !== "klein"), show: { view: "projekte", selector: ".board-concept" } },
  { id: "marken", ready: (v) => v.unlocks.includes("marken"), done: (v) => v.brands.some((b) => b.titles.length >= 2), show: { view: "markt", selector: ".panel" } },
];

/** Prüfung Fable 03.11.2026: Gesehen-Zustand liegt im Spielstand (Eingabe „guideSeen“), nicht mehr im Browser. */
function markSeen(sim: Sim, what: GuideSeenInput["what"], id: string): void {
  sim.input({ type: "guideSeen", what, id });
}

/** Hebt ein Element kurz hervor und scrollt es ins Bild (nach dem Wechsel der Ansicht). */
export function highlight(selector: string): void {
  window.setTimeout(() => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("guide-pulse");
    window.setTimeout(() => el.classList.remove("guide-pulse"), 2600);
  }, 120);
}

export function Guide({ view, sim, t, onShow, here }: { view: ViewModel; sim: Sim; t: T; onShow: (v: GuideTarget) => void; here: GuideTarget }) {
  const mode = view.settings.guide ?? "gefuehrt";
  const skipped = new Set(view.guideSeen.skipped);
  const [listOpen, setListOpen] = useState(false);
  if (mode !== "gefuehrt" || view.guideSeen.hidden) return null;
  const doneCount = CHAPTERS.filter((c) => c.done(view) || skipped.has(c.id)).length;
  const current = CHAPTERS.find((c) => !c.done(view) && !skipped.has(c.id) && c.ready(view));
  const waiting = CHAPTERS.find((c) => !c.done(view) && !skipped.has(c.id));
  if (doneCount === CHAPTERS.length) return null;
  const skip = (id: string) => markSeen(sim, "skipped", id);
  const hideAll = () => markSeen(sim, "hidden", "all");
  // Prüfung Fable 03.11.2026: Der Lernpfad steht in der Zentrale und dort, wohin das aktuelle Kapitel führt, nicht über jeder Ansicht.
  if (here !== "zentrale" && current?.show.view !== here) return null;
  const n = current ? CHAPTERS.indexOf(current) + 1 : null;
  return (
    <aside className="coach guide" aria-label={t("guide.label")}>
      <span className="coach-step">{t("guide.progress", { n: doneCount, max: CHAPTERS.length })}</span>
      <div>
        {current ? (
          <>
            <strong>{t("guide.chapter", { n: n ?? 0, title: t(`guide.${current.id}.title`) })}</strong>
            <p className="small">{t(`guide.${current.id}.text`)}</p>
            <p className="small"><strong>{t("guide.goal")}</strong> {t(`guide.${current.id}.goal`)}</p>
            <div className="vcard-actions small">
              <button type="button" className="primary" onClick={() => { onShow(current.show.view); highlight(current.show.selector); }}>{t("guide.show")}</button>{" "}
              <button type="button" className="linklike" onClick={() => skip(current.id)}>{t("guide.skip")}</button>
            </div>
          </>
        ) : (
          <>
            <strong>{t("guide.waitTitle")}</strong>
            <p className="small">{waiting ? t("guide.wait", { next: t(`guide.${waiting.id}.title`) }) : ""}</p>
          </>
        )}
        <button type="button" className="linklike small" onClick={() => setListOpen(!listOpen)}>{t(listOpen ? "guide.listHide" : "guide.list")}</button>
        {listOpen && (
          <ol className="guide-list small">
            {CHAPTERS.map((c) => {
              const ok = c.done(view) || skipped.has(c.id);
              return <li key={c.id} className={ok ? "done" : c === current ? "now" : ""}>{ok ? "✓ " : ""}{t(`guide.${c.id}.title`)}</li>;
            })}
          </ol>
        )}
      </div>
      <button type="button" className="linklike small" onClick={hideAll}>{t("guide.hide")}</button>
    </aside>
  );
}

/** Freischalt-Karte (Konzept 3.3): je neuem System einmal „Was, wann lohnt es, was kostet es, wo“. */
export function UnlockCard({ view, sim, t, onShow, here }: { view: ViewModel; sim: Sim; t: T; onShow: (v: GuideTarget) => void; here: GuideTarget }) {
  const seen = new Set(view.guideSeen.unlocks);
  if ((view.settings.guide ?? "gefuehrt") === "frei") return null;
  const fresh = view.unlocks.find((id) => !seen.has(id) && t(`unlock.${id}.what`) !== `unlock.${id}.what`);
  if (!fresh) return null;
  const close = () => markSeen(sim, "unlocks", fresh);
  const target = UNLOCK_TARGET[fresh];
  // Prüfung Fable 03.11.2026: Freischalt-Karten nur in der Zentrale und in der Ansicht, zu der sie gehören.
  if (here !== "zentrale" && target?.view !== here) return null;
  return (
    <aside className="coach unlock-card" aria-label={t("unlock.label")}>
      <span className="coach-step">{t("unlock.new")}</span>
      <div>
        <strong>{t(`unlock.${fresh}`)}</strong>
        <p className="small">{t(`unlock.${fresh}.what`)}</p>
        <p className="small"><strong>{t("unlock.when")}</strong> {t(`unlock.${fresh}.when`)}</p>
        <p className="small"><strong>{t("unlock.cost")}</strong> {t(`unlock.${fresh}.cost`)}</p>
        <div className="vcard-actions small">
          {target && <button type="button" className="primary" onClick={() => { onShow(target.view); highlight(target.selector); close(); }}>{t("guide.show")}</button>}{" "}
          <button type="button" onClick={close}>{t("unlock.ok")}</button>
        </div>
      </div>
    </aside>
  );
}

const UNLOCK_TARGET: Record<string, { view: GuideTarget; selector: string }> = {
  auftraege: { view: "projekte", selector: ".market-offers" },
  bewerbungen: { view: "zentrale", selector: ".focus" },
  zeitleiste: { view: "markt", selector: ".panel" },
  markt: { view: "markt", selector: ".panel" },
  produkttypen: { view: "projekte", selector: ".studio-head" },
  engine: { view: "engine", selector: "#engine-title" },
  marken: { view: "markt", selector: ".panel" },
  firma: { view: "firma", selector: "[data-guide=teams]" },
  publisher: { view: "projekte", selector: ".vcard" },
  delegation: { view: "firma", selector: ".panel" },
  lizenzmarkt: { view: "engine", selector: ".panel" },
};

/** Erste-Male-Hinweise (Konzept 4): einmal je Partie ein Satz zur Einordnung, mit Link ins Handbuch. */
const FIRST_TIMES: { id: string; when: (v: ViewModel) => boolean; article: ArticleId }[] = [
  { id: "gate", when: (v) => v.events.some((e) => e.kind === "gate"), article: "umfang" },
  { id: "freeze", when: (v) => v.active.some((p) => p.engine.frozen), article: "engine" },
  { id: "crunch", when: (v) => v.staff.crunch !== "nie", article: "team" },
  { id: "minus", when: (v) => v.moneyCent < 0, article: "geld" },
];

export function FirstTimes({ view, sim, t }: { view: ViewModel; sim: Sim; t: T }) {
  const seen = new Set(view.guideSeen.firsts);
  // ZIE-R44: Mentor stumm heißt kein Aufpoppen; die Inhalte stehen im Handbuch.
  if ((view.settings.guide ?? "gefuehrt") === "frei" || displayPrefs().mentorMuted) return null;
  const hit = FIRST_TIMES.find((f) => !seen.has(f.id) && f.when(view));
  if (!hit) return null;
  const close = () => markSeen(sim, "firsts", hit.id);
  return (
    <aside className="coach first-time" aria-label={t("first.label")}>
      <span className="coach-step">{t("first.tag")}</span>
      <div>
        <strong>{t(`first.${hit.id}.title`)}</strong>
        <p className="small">{t(`first.${hit.id}.text`)}</p>
        <div className="vcard-actions small">
          <button type="button" onClick={() => { close(); openHelp(hit.article); }}>{t("first.more")}</button>{" "}
          <button type="button" className="primary" onClick={close}>{t("unlock.ok")}</button>
        </div>
      </div>
    </aside>
  );
}
