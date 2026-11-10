// Rahmen nach S11 UI-R01: Kopfzeile, linke Leiste, Hauptbereich, rechte Spalte, Fußleiste; Vollbild-Momente als Overlays.
import { useEffect, useMemo, useRef, useState } from "react";
import type { Speed } from "../worker/protocol";
import type { ContractGameOfferView, ViewModel } from "../sim/view/view";
import { useSim } from "./useSim";
import { fmtMoney, fmtMoneyFull } from "./format";
import { applyDisplay, type DisplayPrefs, FONT_SCALES, loadDisplay, saveDisplay, UI_SCALES } from "./display";
import { initialLang, makeT, rememberLang, type Lang, type T } from "./texts";
import { loadPrefs, play, savePrefs, soundForEvent, soundForLog, type AudioPrefs } from "./audio";
import { player, type Mood } from "./music";
import musicData from "../../data/audio/music.json";
import { StartScreen } from "./screens/Start";
import { ModManager } from "./screens/Mods";
import { Board } from "./screens/Board";
import { Studio } from "./screens/Studio";
import { TeamBar } from "./screens/Team";
import { DelegationPanel } from "./screens/Delegation";
import { LocationsPanel } from "./screens/Locations";
import { StockPanel } from "./screens/Stock";
import { PublishingPanel } from "./screens/Publishing";
import { KonzernPanel } from "./screens/Konzern";
import { FocusColumn, ReportLog } from "./screens/Focus";
import { ReleaseReveal } from "./screens/Release";
import { KnowledgeBook, Products } from "./screens/Knowledge";
import { GoalsPanel } from "./screens/Goals";
import { EndgamePanel } from "./screens/Endgame";
import { SaveDialog } from "./screens/Saves";
import { YearbookDialog } from "./screens/Yearbook";
import { FinancePanel } from "./screens/Finance";
import { EndingDialog } from "./screens/Ending";
import { Zentrale } from "./screens/Zentrale";
import { NewsFeed } from "./screens/Feed";
import { FirstTimes, Guide, UnlockCard } from "./screens/Guide";
import { FeedbackDialog } from "./screens/Feedback";
import { type ArticleId, Handbook } from "./screens/Handbook";
import { AwardGala, InsolvencyScene } from "./screens/Moments";
import { Timeline } from "./screens/Timeline";
import { EngineWorkshop } from "./screens/Engine";
import { BrandCockpit } from "./screens/Brands";
import { BrandMarketPanel } from "./screens/BrandMarket";
import { Market } from "./screens/Market";
import { LicensePanels } from "./screens/Licenses";
import { OperationsPage } from "./screens/Operations";

const SPEEDS: Speed[] = ["pause", "0.5x", "1x", "2x", "4x", "bisEreignis"]; // ZIE-R45, KRN-R04
type ViewId = "zentrale" | "projekte" | "firma" | "markt" | "engine" | "finanzen" | "wissensbuch";
type SubId = "projekte" | "betrieb" | "firma" | "konzern" | "markt" | "marken" | "zeitleiste" | "engine" | "lizenzen";

/**
 * UI-R03: nur freigeschaltete Ansichten; UI-T01: 1980 genau Zentrale, Projekte, Finanzen, Wissensbuch.
 * 4b.6 „Ein Ort, nicht neun Fenster“: höchstens 7 Ansichten. Marken und Zeitleiste liegen im Markt, Lizenzen in der Engine.
 */
function availableViews(view: ViewModel): ViewId[] {
  const list: ViewId[] = ["zentrale", "projekte"];
  // S11 UI-R03, 8.1: Ansichten erscheinen mit ihrer Freischaltung (KRN-R40); Firma ab 8 Mitarbeitern (UI-R100).
  if (view.unlocks.includes("firma")) list.push("firma");
  if (subViews(view, "markt").length > 0) list.push("markt");
  if (subViews(view, "engine").length > 0) list.push("engine");
  list.push("finanzen");
  list.push("wissensbuch");
  return list;
}

/** 4b.6: Unterseiten einer zusammengelegten Ansicht, je nach Freischaltung. */
function subViews(view: ViewModel, v: ViewId): SubId[] {
  const out: SubId[] = [];
  // 5.15, S06 Abschnitt 8: Betrieb ist eine Unterseite der Projekte, sobald ein Spiel im Betrieb ist.
  if (v === "projekte" && view.operations.visible) out.push("projekte", "betrieb");
  // Prüfung Fable 03.11.2026: Börse und Übernahmen als eigene Unterseite der Firma, wie Betrieb bei den Projekten.
  if (v === "firma" && (view.stock.visible || view.konzern.visible || view.publishing.visible)) out.push("firma", "konzern");
  if (v === "markt") {
    if (view.unlocks.includes("markt")) out.push("markt");
    if (view.unlocks.includes("marken")) out.push("marken");
    if (view.unlocks.includes("zeitleiste")) out.push("zeitleiste");
  }
  if (v === "engine") {
    if (view.unlocks.includes("engine")) out.push("engine");
    if (view.licensing.unlocked) out.push("lizenzen");
  }
  return out;
}

function SubTabs({ items, current, onPick, t }: { items: SubId[]; current: SubId; onPick: (s: SubId) => void; t: T }) {
  if (items.length < 2) return null;
  return (
    <div className="subtabs" role="tablist">
      {items.map((s) => (
        <button key={s} type="button" role="tab" aria-selected={s === current} className={s === current ? "on" : ""} onClick={() => onPick(s)}>{t(`view.${s}`)}</button>
      ))}
    </div>
  );
}

/** UI-R37: „Als Nächstes“ zeigt genau die drei nächsten Termine. */
function nextUp(view: ViewModel, t: T): { weeks: number; text: string }[] {
  const items: { weeks: number; text: string }[] = [];
  for (const p of view.active) {
    if (p.remainingWeeks !== null && p.status === "laeuft") items.push({ weeks: p.remainingWeeks, text: t("next.ready", { title: p.title }) });
    if (p.certification?.weeksLeft != null) items.push({ weeks: p.certification.weeksLeft, text: t("next.cert", { title: p.title }) });
  }
  for (const c of view.contracts) items.push({ weeks: c.weeksLeft, text: t("next.contract", { kind: t(`contract.${c.kind}`) }) });
  items.push({ weeks: 51 - view.date.weekOfYear, text: t("next.yearbook", { year: view.date.year }) });
  return items.sort((a, b) => a.weeks - b.weeks).slice(0, 3);
}

/** UI-R06: Jahresbalken mit Markern für Termine des laufenden Jahres. */
function YearBar({ view, t }: { view: ViewModel; t: T }) {
  const marks = nextUp(view, t).filter((m) => view.date.weekOfYear + m.weeks <= 51);
  return (
    <div className="yearbar" aria-label={t("footer.year", { year: view.date.year })}>
      <div className="yearbar-fill" style={{ width: `${((view.date.weekOfYear + 1) / 52) * 100}%` }} />
      {marks.map((m, i) => <span key={i} className="yearbar-mark" title={m.text} style={{ left: `${((view.date.weekOfYear + m.weeks) / 52) * 100}%` }} />)}
    </div>
  );
}

/** Spiel beenden: mit oder ohne Sichern zurück zum Startbildschirm; dort beginnt ein neues Spiel oder lädt ein Stand. */
function QuitDialog({ ironman, t, onQuit, onClose }: { ironman: boolean; t: T; onQuit: (save: boolean) => void; onClose: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="quit-title">
      <div className="panel saves">
        <div className="studio-head">
          <h2 id="quit-title">{t("quit.title")}</h2>
          <button type="button" onClick={onClose}>{t("save.close")}</button>
        </div>
        <p className="small">{t(ironman ? "quit.ironman" : "quit.body")}</p>
        <div className="focus-options">
          <button type="button" className="primary" onClick={() => onQuit(true)}>{t("quit.save")}</button>
          {!ironman && <button type="button" onClick={() => onQuit(false)}>{t("quit.noSave")}</button>}
          <button type="button" onClick={onClose}>{t("quit.cancel")}</button>
        </div>
      </div>
    </div>
  );
}

/** ZIE-R26, ZIE-R42 bis ZIE-R44, UI-R60, UI-R61: Darstellung und Barrierefreiheit, pro Gerät. */
function DisplaySettings({ display, setDisplay, t }: { display: DisplayPrefs; setDisplay: (d: DisplayPrefs) => void; t: T }) {
  const pick = <K extends keyof DisplayPrefs>(key: K, options: readonly DisplayPrefs[K][], label: (o: DisplayPrefs[K]) => string) => (
    <label className="audio-row">
      {t(`display.${String(key)}`)}{" "}
      <select value={String(display[key])} onChange={(e) => setDisplay({ ...display, [key]: options.find((o) => String(o) === e.target.value)! })}>
        {options.map((o) => <option key={String(o)} value={String(o)}>{label(o)}</option>)}
      </select>
    </label>
  );
  const check = (key: "colorblind" | "mentorMuted" | "bubblesMuted") => (
    <label className="audio-row">
      <input type="checkbox" checked={display[key]} onChange={(e) => setDisplay({ ...display, [key]: e.target.checked })} /> {t(`display.${key}`)}
    </label>
  );
  return (
    <fieldset className="settings-section">
      <legend>{t("display.title")}</legend>
      {pick("theme", ["system", "hell", "dunkel", "kontrast"] as const, (o) => t(`display.theme.${o}`))}
      {pick("uiScale", UI_SCALES, (o) => `${o} %`)}
      {pick("fontScale", FONT_SCALES, (o) => `${o} %`)}
      {pick("motion", ["system", "reduziert", "voll"] as const, (o) => t(`display.motion.${o}`))}
      {pick("numbers", ["voll", "kurz"] as const, (o) => t(`display.numbers.${o}`))}
      {check("colorblind")}
      {check("mentorMuted")}
      {check("bubblesMuted")}
      <p className="small muted">{t("display.hint")}</p>
    </fieldset>
  );
}

function AudioSettings({ prefs, setPrefs, display, setDisplay, t, onClose }: {
  prefs: AudioPrefs; setPrefs: (p: AudioPrefs) => void; display: DisplayPrefs; setDisplay: (d: DisplayPrefs) => void; t: T; onClose: () => void;
}) {
  const slider = (key: "master" | "music" | "events" | "ui" | "atmo") => (
    <label key={key} className="audio-row">
      {t(`audio.${key}`)}
      <input type="range" min={0} max={100} value={Math.round(prefs[key] * 100)} onChange={(e) => setPrefs({ ...prefs, [key]: Number(e.target.value) / 100 })} />
    </label>
  );
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="audio-title">
      <div className="panel saves">
        <div className="studio-head">
          <h2 id="audio-title">{t("audio.title")}</h2>
          <button type="button" onClick={onClose}>{t("save.close")}</button>
        </div>
        {(["master", "music", "events", "ui", "atmo"] as const).map(slider)}
        <label className="audio-row">
          <input type="checkbox" checked={prefs.dampOnPause} onChange={(e) => setPrefs({ ...prefs, dampOnPause: e.target.checked })} /> {t("audio.dampOnPause")}
        </label>
        <label className="audio-row">
          <input type="checkbox" checked={prefs.muted} onChange={(e) => setPrefs({ ...prefs, muted: e.target.checked })} /> {t("audio.mute")}
        </label>
        <label className="audio-row">
          <input type="checkbox" checked={prefs.pauseAll} onChange={(e) => setPrefs({ ...prefs, pauseAll: e.target.checked })} /> {t("audio.pauseAll")}
        </label>
        <p className="small muted">{t("audio.pauseHint")}</p>
        <p className="small muted">{t("audio.keys")}</p>
        <DisplaySettings display={display} setDisplay={setDisplay} t={t} />
      </div>
    </div>
  );
}

export function App() {
  const sim = useSim();
  // Sprache wird gemerkt; beim ersten Start gilt die Sprache des Browsers.
  const [lang, setLang] = useState<Lang>(initialLang);
  useEffect(() => rememberLang(lang), [lang]);
  const [boardOpen, setBoardOpen] = useState(false);
  // PRD-R41: Projekt, das gerade umgesteuert wird.
  const [steerId, setSteerId] = useState<number | null>(null);
  const [savesOpen, setSavesOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [offer, setOffer] = useState<ContractGameOfferView | null>(null);
  const [current, setCurrent] = useState<ViewId>("zentrale");
  // Etappe 6c.11: „?“-Links und Rückblick öffnen einen Handbuch-Artikel im Wissensbuch.
  const [helpArticle, setHelpArticle] = useState<ArticleId | null>(null);
  useEffect(() => {
    const onHelp = (e: Event) => {
      // Als Fenster über der Ansicht, damit ein halb ausgefülltes Brett nicht verloren geht.
      setHelpArticle((e as CustomEvent<ArticleId>).detail);
    };
    window.addEventListener("gst-help", onHelp);
    return () => window.removeEventListener("gst-help", onHelp);
  }, []);
  const [subPick, setSubPick] = useState<Partial<Record<ViewId, SubId>>>({});
  const [prefs, setPrefsState] = useState<AudioPrefs>(loadPrefs);
  // ZIE-R42 bis ZIE-R44: Darstellung pro Gerät; wirkt sofort auf die ganze Seite.
  const [display, setDisplayState] = useState<DisplayPrefs>(() => {
    const d = loadDisplay();
    applyDisplay(d);
    return d;
  });
  const setDisplay = (d: DisplayPrefs) => {
    applyDisplay(d);
    saveDisplay(d);
    setDisplayState(d);
  };
  // 4b.3: gesehene Momente (Preisjahr, Insolvenz-Beginn), damit eine Szene nur einmal erscheint.
  const [seenGala, setSeenGala] = useState(-1);
  const [seenInsolvency, setSeenInsolvency] = useState(-1);
  const t = useMemo(() => makeT(lang), [lang]);
  const { view } = sim;
  const revealId = sim.revealQueue[0];
  const reveal = view && revealId !== undefined ? view.products.find((p) => p.id === revealId) : undefined;
  const firstStart = view !== null && view.products.length === 0 && view.active.length === 0 && view.contracts.length === 0;
  const showBoard = view !== null && view.newProjectBlocked === null && (boardOpen || firstStart);
  const steering = view && steerId !== null ? view.active.find((p) => p.id === steerId && (p.status === "laeuft" || p.status === "bereit")) : undefined;
  const views = view ? availableViews(view) : [];
  const shown: ViewId = firstStart ? "projekte" : views.includes(current) ? current : "zentrale";
  const subs = view ? subViews(view, shown) : [];
  // Gewählte Unterseite, sonst die erste freigeschaltete (vorher blieb der Markt ohne Auswahl leer).
  const picked = subPick[shown];
  const sub: SubId | null = subs.length === 0 ? null : picked !== undefined && subs.includes(picked) ? picked : subs[0]!;
  const setPrefs = (p: AudioPrefs) => {
    setPrefsState(p);
    savePrefs(p);
  };

  // UI-R82: Töne aus Worker-Ereignissen (Release, neue Entscheidung, Freischaltung, Jahrbuch).
  const seen = useRef({ events: 0, reveal: -1, unlocks: 0, yearbook: -1, eventIds: new Set<number>(), crunch: false, log: new Set<string>(), ready: false });
  useEffect(() => {
    if (!view) return;
    const s = seen.current;
    if (revealId !== undefined && revealId !== s.reveal) {
      const score = view.products.find((p) => p.id === revealId)?.result?.scoreBp ?? 0;
      play(score >= 80000 ? "hit" : score < 50000 ? "flop" : "release", prefs);
    } else if (view.events.length > s.events) play("decision", prefs);
    else if (view.unlocks.length > s.unlocks) play("unlock", prefs);
    else if (sim.yearbookYear !== null && sim.yearbookYear !== s.yearbook) play("yearbook", prefs);
    else {
      // 4b.5: mehr Ereignistöne (Messe, Preis, Bug-Fund, Crunch) aus neuen Berichtszeilen, Ereignissen und der Bühne.
      const freshLog = view.log.find((l) => !s.log.has(`${l.week}|${l.key}`) && soundForLog(l.key));
      const freshEvent = view.events.find((e) => !s.eventIds.has(e.id) && soundForEvent(e.kind));
      if (s.ready && freshLog) play(soundForLog(freshLog.key)!, prefs);
      else if (freshEvent) play(soundForEvent(freshEvent.kind)!, prefs);
      else if (view.stage.props.crunch && !s.crunch) play("crunch", prefs);
    }
    seen.current = {
      ...s, events: view.events.length, reveal: revealId ?? -1, unlocks: view.unlocks.length, yearbook: sim.yearbookYear ?? -1,
      eventIds: new Set(view.events.map((e) => e.id)), crunch: view.stage.props.crunch, log: new Set(view.log.map((l) => `${l.week}|${l.key}`)), ready: true,
    };
  }, [view, revealId, sim.yearbookYear, prefs]);

  // 4b.5, UI-R81: Musik je Epoche, Stimmung angespannt bei Crunch oder Krise, festlich bei Hit und Preis-Gala.
  const paused = sim.speed === "pause";
  const mood: Mood = !view ? "ruhig"
    : sim.pauseReason === "awards" || view.stage.props.hit ? "festlich"
    : view.stage.props.crunch || sim.pauseReason === "insolvency" || view.events.some((e) => e.kind === "kritischerBug") ? "angespannt" : "ruhig";
  const epoch = view?.stage.epoch ?? "80";
  useEffect(() => {
    if (!view) return;
    const base = prefs.muted ? 0 : prefs.master;
    const musicVol = base * prefs.music * (paused && prefs.dampOnPause ? musicData.pauseDamp : 1);
    player.update(epoch, mood, musicVol, base * prefs.atmo);
  }, [view, epoch, mood, paused, prefs]);
  useEffect(() => () => player.stop(), []);

  // UI-R07: Leertaste Pause/1×, 0 = 0,5×, 1/2/3 = 1×/2×/4×, N = nächstes Ereignis, Esc schließt Momente.
  const { pauseMode } = sim;
  useEffect(() => pauseMode(prefs.pauseAll), [pauseMode, prefs.pauseAll]);

  const { time, speed, clearReveal, clearYearbook } = sim;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")) return;
      if (e.key === "Escape") {
        clearReveal();
        clearYearbook();
        setSavesOpen(false);
        setAudioOpen(false);
        setHelpArticle(null);
        setFeedbackOpen(false);
        return;
      }
      if (!view || view.events.length > 0 || reveal) return;
      const map: Record<string, Speed> = { "0": "0.5x", "1": "1x", "2": "2x", "3": "4x", n: "bisEreignis", N: "bisEreignis" };
      if (e.key === " ") {
        e.preventDefault();
        time(speed === "pause" ? "1x" : "pause");
      } else if (map[e.key]) time(map[e.key]!);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, reveal, time, speed, clearReveal, clearYearbook]);

  const dateLabel = view
    ? view.displayUnit === "woche"
      ? `${t("date.week", { n: view.date.weekOfYear + 1 })}, ${view.date.year}`
      : `${t(`date.month.${view.date.month}`)} ${view.date.year}`
    : "";
  const lastMonth = view?.finance.ledger[view.finance.ledger.length - 1];
  const trend = lastMonth ? lastMonth.income.sales + lastMonth.income.contracts + (lastMonth.income.licenses ?? 0) + (lastMonth.income.merch ?? 0) - Object.values(lastMonth.costs).reduce((a, b) => a + b, 0) : 0;

  if (!view) {
    return (
      <div className="app">
        <header className="topbar"><div><h1>{t("app.title")}</h1><span className="muted small">{t("app.subtitle")}</span></div>
          <div>
            <button type="button" className="topbar-btn" onClick={() => setFeedbackOpen(true)}>{t("feedback.button")}</button>{" "}
            <button type="button" className="topbar-btn" onClick={() => setAudioOpen(true)} aria-label={t("audio.title")} title={t("audio.title")}>⚙</button>{" "}
            <label className="lang"><span className="sr-only">{t("app.language")}</span>
              <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}><option value="de">DE</option><option value="en">EN</option></select>
            </label>
          </div>
        </header>
        {feedbackOpen && <FeedbackDialog view={null} where={t("feedback.startScreen")} t={t} lang={lang} onClose={() => setFeedbackOpen(false)} />}
        <main className="start-wrap">
          <StartScreen t={t} startYears={sim.startYears} presets={sim.presets} goals={sim.goals} scenarios={sim.scenarios} onLoad={() => setSavesOpen(true)} onStart={(settings, seed) => sim.start(seed, settings)} />
          <ModManager sim={sim} t={t} />
        </main>
        {savesOpen && <SaveDialog sim={sim} t={t} lang={lang} canSave={false} onClose={() => setSavesOpen(false)} />}
        {audioOpen && <AudioSettings prefs={prefs} setPrefs={setPrefs} display={display} setDisplay={setDisplay} t={t} onClose={() => setAudioOpen(false)} />}
      </div>
    );
  }

  const blocked = view.events.some((e) => prefs.pauseAll || e.pauses);
  return (
    <div className="frame">
      <header className="topbar">
        <div><h1>{t("app.title")}</h1><span className="muted small">{t(`office.${view.office.id}`)} · {t("header.people", { n: view.people.length })}</span></div>
        <div className="date" aria-live="polite">{dateLabel}</div>
        <div className="money">
          {t("money.cash")}: <strong className={view.moneyCent < 0 ? "wf-neg" : ""} title={fmtMoneyFull(view.moneyCent, lang)}>{fmtMoney(view.moneyCent, lang)}</strong>
          <span className={trend >= 0 ? "wf-pos" : "wf-neg"} aria-label={t(trend >= 0 ? "header.up" : "header.down")}> {trend >= 0 ? "▲" : "▼"}</span>
          {view.finance.insolvencyMonths > 0 && (
            <span className="badge badge-umstritten"> {t("finance.insolvencyShort", { n: view.finance.insolvencyMonths, max: view.finance.toleranceMonths })}</span>
          )}
        </div>
        <div className="header-actions">
          <button type="button" className="topbar-btn" onClick={() => setSavesOpen(true)}>{t("save.menu")}</button>
          <button type="button" className="topbar-btn" onClick={() => { sim.time("pause"); setFeedbackOpen(true); }} title={t("feedback.hint")}>{t("feedback.button")}</button>
          <button type="button" className="topbar-btn" onClick={() => { sim.time("pause"); setQuitOpen(true); }} title={t("quit.hint")}>{t("quit.menu")}</button>
          <button type="button" className="topbar-btn" onClick={() => setAudioOpen(true)} aria-label={t("audio.title")} title={t("audio.title")}>⚙</button>
          <label className="lang"><span className="sr-only">{t("app.language")}</span>
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}><option value="de">DE</option><option value="en">EN</option></select>
          </label>
        </div>
      </header>

      <nav className="sidebar" aria-label={t("tabs.label")}>
        {views.map((v) => (
          <button key={v} type="button" aria-current={shown === v ? "page" : undefined} className={shown === v ? "on" : ""} onClick={() => setCurrent(v)}>
            {t(`view.${v}`)}
            {v === "finanzen" && view.finance.insolvencyMonths > 0 && <span className="dot" aria-label={t("finance.alert")} />}
          </button>
        ))}
      </nav>

      <main className="main">
        {/* Prüfung Fable 03.11.2026: Hinweise am Rand statt über den Kacheln. */}
        <div className="toasts">
          {sim.error && <div className="toast" role="alert">{t(sim.error)} <button type="button" className="linklike" onClick={sim.clearError}>×</button></div>}
          {sim.notice && <div className="toast info" role="status">{t(sim.notice.key, sim.notice.params)} <button type="button" className="linklike" onClick={sim.clearNotice}>×</button></div>}
          {sim.pauseReason === "limit" && <div className="toast info">{t("time.limit")}</div>}
        </div>
        {/* Etappe 6c.11: Lernpfad statt Coach, dazu Freischalt-Karten (docs/design/Konzept-Einstieg.md). */}
        <UnlockCard key={`u-${view.seed}`} here={shown} view={view} sim={sim} t={t} onShow={(v) => setCurrent(views.includes(v) ? v : "projekte")} />
        <FirstTimes key={`f-${view.seed}`} view={view} sim={sim} t={t} />
        <Guide key={`g-${view.seed}`} here={shown} view={view} sim={sim} t={t} onShow={(v) => setCurrent(views.includes(v) ? v : "projekte")} />
        {shown === "zentrale" && <Zentrale view={view} sim={sim} t={t} lang={lang} onOpenProjects={() => setCurrent("projekte")} />}
        {sub && <SubTabs items={subs} current={sub} onPick={(x) => setSubPick((p) => ({ ...p, [shown]: x }))} t={t} />}
        {shown === "projekte" && sub === "betrieb" && <OperationsPage view={view} sim={sim} t={t} lang={lang} />}
        {shown === "projekte" && sub !== "betrieb" && (
          <>
            {steering
              ? <Board key={`steer${steering.id}`} view={view} sim={sim} t={t} lang={lang} steer={steering} onClose={() => setSteerId(null)} />
              : showBoard
                ? <Board key={`${view.products.length}:${offer?.id ?? ""}`} view={view} sim={sim} t={t} lang={lang} offer={offer ?? undefined}
                  onClose={firstStart ? null : () => { setBoardOpen(false); setOffer(null); }} />
                : <Studio view={view} sim={sim} t={t} lang={lang} onNewProject={() => { setOffer(null); setBoardOpen(true); }} onSteer={setSteerId}
                  onOffer={(o) => { setOffer(o); setBoardOpen(true); }} />}
            {!views.includes("firma") && <TeamBar view={view} sim={sim} t={t} lang={lang} />}
            {!views.includes("firma") && <DelegationPanel view={view} sim={sim} t={t} lang={lang} />}
            <Products products={view.products} reissues={view.reissues} rule={view.priceRule} year={view.date.year} sim={sim} t={t} lang={lang} />
          </>
        )}
        {shown === "firma" && sub !== "konzern" && (
          <>
            <TeamBar view={view} sim={sim} t={t} lang={lang} />
            <DelegationPanel view={view} sim={sim} t={t} lang={lang} />
            <LocationsPanel view={view} sim={sim} t={t} lang={lang} />
          </>
        )}
        {shown === "firma" && sub === "konzern" && (
          <>
            <StockPanel view={view} sim={sim} t={t} lang={lang} />
            <KonzernPanel view={view} sim={sim} t={t} lang={lang} />
            <PublishingPanel view={view} sim={sim} t={t} lang={lang} />
          </>
        )}
        {sub === "markt" && <Market view={view} sim={sim} t={t} lang={lang} />}
        {sub === "lizenzen" && <LicensePanels view={view} sim={sim} t={t} lang={lang} />}
        {sub === "engine" && <EngineWorkshop view={view} sim={sim} t={t} lang={lang} />}
        {sub === "marken" && (
          <>
            <BrandCockpit view={view} t={t} lang={lang} />
            <BrandMarketPanel view={view} sim={sim} t={t} lang={lang} />
          </>
        )}
        {sub === "zeitleiste" && <Timeline view={view} t={t} lang={lang} />}
        {shown === "finanzen" && <FinancePanel view={view} sim={sim} t={t} lang={lang} />}
        {shown === "wissensbuch" && (
          <>
            <GoalsPanel view={view} t={t} lang={lang} />
            <EndgamePanel view={view} sim={sim} t={t} lang={lang} />
            <Handbook view={view} t={t} article={null} />
            <KnowledgeBook entries={view.knowledge} t={t} lang={lang} />
          </>
        )}
      </main>

      <aside className="rightcol">
        <FocusColumn view={view} sim={sim} t={t} lang={lang} onSteer={setSteerId} />
        <section className="panel" aria-labelledby="next-title">
          <h2 id="next-title">{t("next.title")}</h2>
          <ul className="log">{nextUp(view, t).map((n, i) => <li key={i}><span className="muted small">{t("next.in", { n: n.weeks })}</span> {n.text}</li>)}</ul>
        </section>
        <ReportLog view={view} t={t} lang={lang} />
      </aside>

      <footer className="footbar">
        <div className="time" role="group" aria-label={t("time.group")}>
          {SPEEDS.map((s) => (
            <button key={s} type="button" aria-pressed={sim.speed === s} className={sim.speed === s ? "on" : ""}
              disabled={s !== "pause" && blocked} title={s !== "pause" && blocked ? t("time.decideFirst") : undefined}
              onClick={() => sim.time(s)}>
              {t(`time.${s}`)}
            </button>
          ))}
        </div>
        <YearBar view={view} t={t} />
      </footer>

      <NewsFeed view={view} t={t} lang={lang} />
      {view.ending && <EndingDialog view={view} t={t} lang={lang} onContinue={() => sim.input({ type: "continuePlaying" })} onNewGame={sim.reset} />}
      {!reveal && sim.yearbookYear !== null && <YearbookDialog view={view} t={t} lang={lang} onClose={sim.clearYearbook} />}
      {!reveal && sim.pauseReason === "awards" && view.goals.gala && view.goals.gala.year !== seenGala && (
        <AwardGala gala={view.goals.gala} t={t} onClose={() => setSeenGala(view.goals.gala!.year)} />
      )}
      {!reveal && sim.pauseReason === "insolvency" && seenInsolvency !== view.date.year * 100 + view.date.weekOfYear && view.finance.insolvencyMonths > 0 && (
        <InsolvencyScene view={view} t={t} lang={lang} onClose={() => setSeenInsolvency(view.date.year * 100 + view.date.weekOfYear)} />
      )}
      {savesOpen && <SaveDialog sim={sim} t={t} lang={lang} canSave ironman={view.settings.ironman && !view.gameOver} onClose={() => setSavesOpen(false)} />}
      {feedbackOpen && <FeedbackDialog view={view} where={t(`view.${shown}`)} t={t} lang={lang} onClose={() => setFeedbackOpen(false)} />}
      {quitOpen && <QuitDialog ironman={view.settings.ironman} t={t} onClose={() => setQuitOpen(false)} onQuit={(save) => { setQuitOpen(false); sim.reset(save); }} />}
      {audioOpen && <AudioSettings prefs={prefs} setPrefs={setPrefs} display={display} setDisplay={setDisplay} t={t} onClose={() => setAudioOpen(false)} />}
      {helpArticle && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="hb-title" onClick={(e) => { if (e.target === e.currentTarget) setHelpArticle(null); }}>
          <div className="reveal panel hb-dialog">
            <Handbook key={helpArticle} view={view} t={t} article={helpArticle} />
            <button type="button" className="primary" autoFocus onClick={() => setHelpArticle(null)}>{t("hb.close")}</button>
          </div>
        </div>
      )}
      {reveal && <ReleaseReveal product={reveal} knowledge={view.knowledge} onClose={sim.clearReveal} t={t} lang={lang} releasedCount={view.products.length} />}
    </div>
  );
}
