// Projektkarte (Konzept 0b, Abschnitt 4): Status, Kennzahlen, Engine, Marketing und Auflage eines Projekts.
// Prüfung Fable 03.11.2026: aus Studio.tsx herausgelöst (eine Datei je Bereich).
import { useState } from "react";
import type { ProjectView, ViewModel } from "../../sim/view/view";
import type { Sim } from "../useSim";
import { fmtFactor, fmtInt, fmtMoney, fmtPct, fmtScore } from "../format";
import type { Lang, T } from "../texts";
import { HelpLink } from "./Handbook";
import { BugCurve } from "../viz";
import { ReleasePackageDialog } from "./ReleasePackage";
import { Heads, PulseBar } from "./Pulse";
import { Icon } from "../icons";
import { PublisherBlock } from "./Negotiation";

const BUDGET_STEPS = [0, 100, 200, 300, 500, 800, 1000, 1500];

const POLISH_AREAS = ["gameplay", "grafik", "sound", "story", "technik"] as const;

export function personName(view: ViewModel, id: number): string {
  return view.people.find((p) => p.id === id)?.name ?? "?";
}

export function ProjectCard({ project, view, sim, t, lang, onSteer }: { project: ProjectView; view: ViewModel; sim: Sim; t: T; lang: Lang; onSteer?: (id: number) => void }) {
  const ready = project.status === "bereit";
  const readyIndex = ready ? project.bugHistory.length - 1 - project.readyWeeks : null;
  const lastTest = project.playtests[project.playtests.length - 1];
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  return (
    <article className="vcard" aria-labelledby={`p${project.id}`}>
      <header className="vcard-head">
        <h3 id={`p${project.id}`}>{project.title}</h3>
        <span className="muted small"><Icon kind="genre" id={project.genre} /> {t(`genre.${project.genre}`)}{project.subgenre ? ` (${t(`subgenre.${project.subgenre}`)})` : ""} · <Icon kind="theme" id={project.theme} /> {t(`theme.${project.theme}`)} · {t(`scope.${project.scope}`)} · {t(`audience.${project.audience}`)}</span>
      </header>
      <p className="muted small">{project.features.map((f) => t(`feature.${f}`)).join(", ")} · {project.platforms.map((id) => t(`platform.${id}`)).join(" + ")}</p>
      {project.contractGame && (
        <p className="small">
          <span className="badge">{t("cgame.badge", { client: project.contractGame.client })}</span>{" "}
          {t("cgame.terms", {
            score: fmtScore(project.contractGame.minScoreBp, lang), bonusScore: fmtScore(project.contractGame.bonusScoreBp, lang),
            final: fmtMoney(project.contractGame.finalCent, lang), bonus: fmtMoney(project.contractGame.bonusCent, lang), penalty: fmtMoney(project.contractGame.penaltyCent, lang),
          })}{" "}
          <span className={project.contractGame.weeksLeft < 0 ? "error" : "muted"}>
            {project.contractGame.weeksLeft >= 0 ? t("cgame.weeksLeft", { n: project.contractGame.weeksLeft }) : t("cgame.late", { n: -project.contractGame.weeksLeft })}
          </span>
        </p>
      )}
      <EngineLine project={project} sim={sim} t={t} lang={lang} />
      <ol className="phases">
        {project.phases.map((ph) => <li key={ph} className={ph === project.phase ? "phase-on" : ""}>{t(`phase.${ph}`)}</li>)}
      </ol>
      {/* Prüfung Fable 03.11.2026: Schwerpunkt je Phase aus der Oberfläche genommen; Politur je Bereich bleibt. */}
      {(project.status === "bereit" || project.status === "laeuft") && (
        <p className="small polish-line">
          <label>
            {t("polish.label")} <HelpLink id="politur" t={t} />{" "}
            <select value={project.polishArea ?? ""} onChange={(e) => sim.input({ type: "setPolish", projectId: project.id, area: (e.target.value || null) as ProjectView["polishArea"] })}>
              <option value="">{t("polish.none")}</option>
              {POLISH_AREAS.map((a) => <option key={a} value={a}>{t(`area.${a}`)}</option>)}
            </select>
          </label>{" "}
          <span className="muted">
            {project.status === "laeuft" && project.polishArea ? t("polish.later") : ""}
            {POLISH_AREAS.filter((a) => (project.polish[a] ?? 0) > 0).map((a) => `${t(`area.${a}`)} +${fmtPct(project.polish[a] ?? 0, lang)}`).join(" · ")}
          </span>
        </p>
      )}
      {project.localization && !project.contractGame && (
        <details className="pc-more">
          <summary>
            {t("loc.title")} <HelpLink id="lokalisierung" t={t} />{" "}
            <span className="muted small">
              {[project.localization.home, ...project.languages].map((l) => t(`lang.${l}`)).join(", ")}
              {project.languages.length > 0 && ` · ${t("loc.summary", { factor: fmtFactor(project.localization.factorBp, lang), cost: fmtMoney(project.localization.costCent, lang) })}`}
            </span>
          </summary>
          <div className="small loc-options">
            {project.localization.options.map((o) => {
              const on = project.languages.includes(o.id);
              return (
                <label key={o.id}>
                  <input type="checkbox" checked={on}
                    onChange={() => sim.input({ type: "setLanguages", projectId: project.id, languages: on ? project.languages.filter((x) => x !== o.id) : [...project.languages, o.id] })} />{" "}
                  {t(`lang.${o.id}`)} <span className="muted">{t("loc.option", { gain: fmtPct(o.gainBp, lang), cost: fmtMoney(o.costCent, lang) })}</span>
                </label>
              );
            })}
          </div>
          <p className="muted small">{t("loc.hint")}</p>
        </details>
      )}
      <PulseBar project={project} t={t} big />
      <ProjectStats project={project} t={t} lang={lang} />
      <p className="small">
        {project.people.length === 0 ? <span className="error">{t("project.people")}: {t("project.nobody")}</span> : <Heads ids={project.people} view={view} />}
        {project.playtestRunning && <span className="badge"> {t("project.playtestRunning")}</span>}
        {project.dayOnePatch && <span className="badge"> {t("project.dayOnePatch")}</span>}
        {project.earlyAccess && !project.earlyAccess.ended && (
          <span className="badge" title={t("project.earlyAccessInfo", { revenue: fmtMoney(project.earlyAccess.revenueCent, lang), updates: project.earlyAccess.updates })}>
            {" "}{t("project.earlyAccessRunning", { sold: project.earlyAccess.sold, z: Math.round(project.earlyAccess.satisfactionBp / 100) })}
          </span>
        )}
        {project.resumeWeeksLeft > 0 && <span className="badge"> {t("project.resuming", { n: project.resumeWeeksLeft })}</span>}
        {project.archiveSavingBp > 0 && <span className="muted small"> · {t("project.archiveSaving", { n: Math.round(project.archiveSavingBp / 10000) })}</span>}
        <span className="muted"> · {t("project.cost")}: {fmtMoney(project.costCent, lang)}</span>
      </p>
      {lastTest && lastTest.weaknesses.length > 0 && (
        <p className="muted small">{t("project.weaknesses")}: {lastTest.weaknesses.map((w) => t(`bar.${w}`)).join(", ")}</p>
      )}
      {project.bugHistory.length >= 2 && (
        <details className="pc-more">
          <summary>{t("project.bugCurve")}</summary>
          <figure className="bugfig">
            <BugCurve history={project.bugHistory} readyIndex={readyIndex} />
          </figure>
        </details>
      )}
      {!project.sales && (
        <details className="pc-more">
          <summary>{t("project.launchSettings")} <span className="muted small">{launchSummary(project, t, lang)}</span></summary>
          <Marketing project={project} sim={sim} t={t} lang={lang} />
          {project.digitalOnly ? <p className="muted small">{t("project.digitalOnly")}</p> : <PrintRun project={project} sim={sim} t={t} lang={lang} />}
        </details>
      )}
      <PublisherBlock project={project} sim={sim} t={t} lang={lang} />
      {project.certification && (project.certification.weeksLeft !== null || project.certification.attempts > 0) && (
        <p className="small">
          <span className="badge">{project.certification.passed ? t("project.certPassed") : t("project.certRunning", { n: project.certification.weeksLeft ?? 0 })}</span>
          {project.certification.attempts > 1 && <span className="muted"> · {t("project.certAttempts", { n: project.certification.attempts })}</span>}
        </p>
      )}
      <div className="vcard-actions">
        {project.status === "laeuft" && (
          <button type="button" disabled={project.playtestBlocked !== null} title={project.playtestBlocked ? t(project.playtestBlocked) : t("project.playtestHint")}
            data-guide="playtest" onClick={() => sim.input({ type: "playtest", projectId: project.id })}>
            {t("project.playtest")}
          </button>
        )}
        {ready && (
          <>
            <span className="muted small">{t("project.testing", { n: project.readyWeeks })}</span>
            {project.releasePlanned ? (
              <span className="badge">{t("pkg.planned", { week: project.releasePlanned.weekOfYear + 1, year: project.releasePlanned.year })}</span>
            ) : (
              <>
                <button type="button" className="primary" data-guide="release" onClick={() => setPackageOpen(true)}>{t("project.release")}</button>
                <button type="button" title={t("pkg.quickHint")} onClick={() => sim.input({ type: "release", projectId: project.id })}>{t("pkg.quick")}</button>
              </>
            )}
          </>
        )}
        {project.earlyAccessBlocked !== undefined && !project.earlyAccess && (
          <button type="button" disabled={project.earlyAccessBlocked !== null} title={project.earlyAccessBlocked ? t(project.earlyAccessBlocked) : t("project.earlyAccessHint")}
            onClick={() => sim.input({ type: "startEarlyAccess", projectId: project.id })}>
            {t("project.earlyAccess")}
          </button>
        )}
        {onSteer && project.productType === "standard" && (
          <button type="button" title={t("project.steerHint")} onClick={() => onSteer(project.id)}>{t("project.steer")}</button>
        )}
        <button type="button" onClick={() => sim.input({ type: "pauseProject", projectId: project.id })}>{t("project.pause")}</button>
        <button type="button" onClick={() => setConfirmCancel(true)}>{t("project.cancel")}</button>
      </div>
      {packageOpen && project.releasePackage && <ReleasePackageDialog project={project} sim={sim} t={t} lang={lang} onClose={() => setPackageOpen(false)} />}
      {confirmCancel && project.outlook && (
        <div className="confirm" role="alertdialog" aria-label={t("project.cancelTitle")}>
          <p>
            <strong>{t("project.cancelTitle")}</strong> {t("project.cancelOutlook", {
              cost: fmtMoney(project.outlook.remainingCostCent, lang), revenue: fmtMoney(project.outlook.expectedRevenueCent, lang),
            })}
          </p>
          <p className="muted small">{t("project.cancelArchive")}</p>
          <div className="vcard-actions">
            <button type="button" className="primary" onClick={() => sim.input({ type: "cancelProject", projectId: project.id })}>{t("project.cancelConfirm")}</button>
            <button type="button" onClick={() => setConfirmCancel(false)}>{t("form.cancel")}</button>
          </div>
        </div>
      )}
    </article>
  );
}

/** Spieltest: die wichtigsten Projektzahlen als Kacheln mit Symbol und Trend statt einer Textzeile. */
function Stat({ icon, label, value, sub, tone }: { icon: string; label: string; value: string; sub?: string; tone?: "good" | "bad" | "" }) {
  return (
    <div className={`pstat${tone ? ` pstat-${tone}` : ""}`}>
      <span className="pstat-icon" aria-hidden="true">{icon}</span>
      <span className="pstat-label">{label}</span>
      <strong className="pstat-value">{value}</strong>
      {sub && <span className="pstat-sub">{sub}</span>}
    </div>
  );
}

function ProjectStats({ project, t, lang }: { project: ProjectView; t: T; lang: Lang }) {
  const h = project.bugHistory;
  const prev = h.length >= 2 ? h[h.length - 2]! : project.bugs;
  const bugTrend = project.bugs > prev ? "▲" : project.bugs < prev ? "▼" : "";
  const test = project.playtests[project.playtests.length - 1];
  const m = project.marketing;
  return (
    <div className="pstats">
      <Stat icon="⏱" label={t("project.stat.time")} value={project.status === "laeuft" ? (project.remainingWeeks === null ? "–" : t("project.stat.weeks", { n: project.remainingWeeks })) : t(`phase.${project.phase}`)}
        sub={project.status === "laeuft" && project.remainingWeeks === null ? t("project.nobody") : undefined} />
      <Stat icon="★" label={t("project.stat.forecast")} value={test ? `${fmtScore(test.lowBp, lang)}–${fmtScore(test.highBp, lang)}` : "?"}
        sub={test ? undefined : t("project.stat.forecastNone")} tone={test ? (test.highBp >= 70000 ? "good" : test.highBp < 50000 ? "bad" : "") : ""} />
      <Stat icon="✖" label={t("project.bugs")} value={`${fmtInt(project.bugs, lang)} ${bugTrend}`} tone={bugTrend === "▼" ? "good" : bugTrend === "▲" ? "bad" : ""}
        sub={bugTrend === "▼" ? t("project.stat.bugsDown") : bugTrend === "▲" ? t("project.stat.bugsUp") : undefined} />
      {!project.sales && <Stat icon="♥" label={t(`marketing.${m.label}`)} value={fmtInt(m.interest, lang)} sub={m.announcedWeek === null ? t("project.stat.notAnnounced") : undefined} />}
    </div>
  );
}

function launchSummary(project: ProjectView, t: T, lang: Lang): string {
  const m = project.marketing;
  return [
    `${t("marketing.budget")} ${fmtPct(m.budgetPermille * 10, lang)}`,
    m.fairPlan === "auto" ? null : t(`fair.${m.fairPlan}`),
    project.digitalOnly ? null : `${t("project.printRunShort")} ${fmtInt(project.printRun ?? project.recommendedPrintRun, lang)}`,
  ].filter(Boolean).join(" · ");
}

/** PRD-R10, ENG-R41, ENG-R44, ENG-R53, PRD-R61: Engine-Zeile der Projektkarte. */
function EngineLine({ project, sim, t, lang }: { project: ProjectView; sim: Sim; t: T; lang: Lang }) {
  const e = project.engine;
  const weak = project.versions.filter((v) => v.weak || v.dropped.length > 0);
  return (
    <div className="small engine-line">
      <span>
        {e.id === "eigen" ? t("project.engineOwn", { major: e.major, minor: e.minor }) : t("project.engineStarter")} · E {fmtFactor(e.factorBp, lang)}
      </span>
      {e.frozen && <span className="badge"> {t("project.frozen")}</span>}
      {e.switchWeeks !== null && (
        <button type="button" className="topbar-btn" title={t("project.switchMajorHint")} onClick={() => sim.input({ type: "switchMajor", projectId: project.id })}>
          {t("project.switchMajor", { n: e.switchWeeks })}
        </button>
      )}
      {project.brandName && <span className="muted"> · {t("project.brand", { brand: project.brandName })}</span>}
      {project.pendingFeatures.length > 0 && (
        <div>{t("project.pending", { features: project.pendingFeatures.map((f) => t(`feature.${f}`)).join(", ") })}</div>
      )}
      {project.makeshift.length > 0 && <div className="muted">{t("project.makeshift", { features: project.makeshift.map((f) => t(`feature.${f}`)).join(", ") })}</div>}
      {project.waitingForEngine && <div className="error">{t("project.waitingForEngine")}</div>}
      {weak.map((v) => (
        <div key={v.platform} className={v.weak ? "error" : "muted"}>
          {t(v.weak ? "project.versionWeak" : "project.versionCut", { platform: t(`platform.${v.platform}`), pct: fmtPct(v.shareBp, lang) })}
        </div>
      ))}
    </div>
  );
}

/** MKT-R01 bis MKT-R06: Interesse in der Form der Epoche, Budget in Prozent der Entwicklungskosten, Ankündigung. */
function Marketing({ project, sim, t, lang }: { project: ProjectView; sim: Sim; t: T; lang: Lang }) {
  const m = project.marketing;
  const announced = m.announcedWeek !== null;
  const steps = BUDGET_STEPS.filter((v) => v <= m.maxPermille);
  return (
    <div className="marketing small">
      <p className="mk-head">
        <strong>{t(`marketing.${m.label}`)}:</strong> {fmtInt(m.interest, lang)}
        {m.last.capped > 0 && <span className="muted"> · {t("marketing.capped")}</span>}
      </p>
      <div className="mk-grid">
      <label>
        {t("marketing.budget")}{" "}
        <select value={m.budgetPermille} onChange={(e) => sim.input({ type: "setMarketing", projectId: project.id, budgetPermille: Number(e.target.value) })}>
          {[...new Set([...steps, m.budgetPermille])].sort((a, b) => a - b).map((v) => <option key={v} value={v}>{fmtPct(v * 10, lang)}</option>)}
        </select>
      </label>{" "}
      <label>
        {t("marketing.demo")}{" "}
        <select value={m.demo} disabled={m.demoDone} onChange={(e) => sim.input({ type: "setMarketing", projectId: project.id, demo: e.target.value as ProjectView["marketing"]["demo"] })}>
          {(["keine", "vorab", "zumRelease"] as const).map((d) => <option key={d} value={d} disabled={d === "vorab" && !m.lateEnough}>{t(`marketing.demo.${d}`)}</option>)}
        </select>
      </label>{" "}
      <label title={t(m.fair.trade ? "fair.tradeHint" : "fair.hint")}>
        {t("fair.label", { week: m.fair.date.weekOfYear + 1, year: m.fair.date.year })}{" "}
        <select value={m.fairPlan} onChange={(e) => sim.input({ type: "setMarketing", projectId: project.id, fairPlan: e.target.value as ProjectView["marketing"]["fairPlan"] })}>
          <option value="auto">{t("fair.auto", { show: t(`fair.${m.fair.suggestion}`) })}</option>
          {(["nichts", "trailer", "demo"] as const).map((f) => <option key={f} value={f}>{t(`fair.${f}`)}</option>)}
        </select>
      </label>
      </div>
      {m.creatorAvailable && !m.creatorUsed && (
        <button type="button" disabled={!announced || !m.lateEnough} title={t("marketing.creatorHint")}
          onClick={() => sim.input({ type: "setMarketing", projectId: project.id, creator: true })}>{t("marketing.creator")}</button>
      )}
      {m.weaknesses.length > 0 && <span className="muted"> {t("marketing.weaknesses", { list: m.weaknesses.map((f) => t(`bar.${f}`)).join(", ") })}</span>}{" "}
      {announced
        ? <span className="muted">{t("marketing.announced", { spent: fmtMoney(m.spentCent, lang) })}</span>
        : (
          <>
            <button type="button" onClick={() => sim.input({ type: "setMarketing", projectId: project.id, announce: true })}>{t("marketing.announceNow")}</button>{" "}
            <label className="muted">
              <input type="checkbox" checked={m.autoAnnounce} onChange={(e) => sim.input({ type: "setMarketing", projectId: project.id, autoAnnounce: e.target.checked })} />{" "}
              {t("marketing.autopilot")}
            </label>
          </>
        )}
    </div>
  );
}

/** MKT-R22: Erstauflage vor dem Release; leer = Empfehlung. Kosten werden beim Release fällig. */
function PrintRun({ project, sim, t, lang }: { project: ProjectView; sim: Sim; t: T; lang: Lang }) {
  const [value, setValue] = useState(project.printRun === null ? "" : String(project.printRun));
  if (project.sales) return null;
  const commit = () => {
    const n = Number(value.replace(/[^0-9]/g, ""));
    sim.input({ type: "setPrintRun", projectId: project.id, units: value.trim() === "" || !Number.isFinite(n) ? null : n });
  };
  return (
    <div className="printrun small">
      <label>
        {t("project.printRun")}{" "}
        <input inputMode="numeric" value={value} placeholder={fmtInt(project.recommendedPrintRun, lang)} onChange={(e) => setValue(e.target.value)} onBlur={commit} />
      </label>{" "}
      <span className="muted">{t("project.printRunHint", { rec: fmtInt(project.recommendedPrintRun, lang), cost: fmtMoney(project.printRunCostCent, lang) })}</span>
    </div>
  );
}
