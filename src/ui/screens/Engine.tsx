// Engine-Werkstatt (S03 Abschnitt 6, S11): Module mit Stand der Technik und Schuld, Arbeiten des Engine-Teams, Plan, Fremdmodule.
import { useState } from "react";
import type { ViewModel } from "../../sim/view/view";
import type { Sim } from "../useSim";
import { fmtInt, fmtMoney, fmtPct } from "../format";
import type { Lang, T } from "../texts";

function FoundEngine({ view, sim, t }: { view: ViewModel; sim: Sim; t: T }) {
  const [name, setName] = useState(() => t("engine.defaultName"));
  return (
    <section className="panel" aria-labelledby="engine-title">
      <h2 id="engine-title">{t("view.engine")}</h2>
      <p>{t("engine.foundHint")}</p>
      <label>
        {t("engine.name")} <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
      </label>{" "}
      <button type="button" className="primary" disabled={view.foundEngineBlocked !== null || name.trim() === ""}
        title={view.foundEngineBlocked ? t(view.foundEngineBlocked) : undefined}
        onClick={() => sim.input({ type: "foundEngine", name })}>
        {t("engine.found")}
      </button>
    </section>
  );
}

/** S03 EngineTeamPlan: Aufteilung in Prozent; die Summe muss 100 ergeben. */
function PlanEditor({ view, sim, t }: { view: ViewModel; sim: Sim; t: T }) {
  const plan = view.engine!.plan;
  const [parts, setParts] = useState({ researchBp: plan.researchBp / 100, maintenanceBp: plan.maintenanceBp / 100, requestsBp: plan.requestsBp / 100 });
  const sum = parts.researchBp + parts.maintenanceBp + parts.requestsBp;
  return (
    <div className="engine-plan">
      {(["researchBp", "maintenanceBp", "requestsBp"] as const).map((k) => (
        <label key={k}>
          {t(`engine.plan.${k}`)}{" "}
          <input type="number" min={0} max={100} step={5} value={parts[k]} onChange={(e) => setParts({ ...parts, [k]: Math.max(0, Math.round(Number(e.target.value) || 0)) })} /> %
        </label>
      ))}{" "}
      <button type="button" disabled={sum !== 100}
        title={sum !== 100 ? t("error.planSum") : undefined}
        onClick={() => sim.input({ type: "setEnginePlan", plan: { researchBp: parts.researchBp * 100, maintenanceBp: parts.maintenanceBp * 100, requestsBp: parts.requestsBp * 100 } })}>
        {t("engine.plan.apply")}
      </button>
    </div>
  );
}

export function EngineWorkshop({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const e = view.engine;
  if (!e) return <FoundEngine view={view} sim={sim} t={t} />;
  const pw = (bp: number) => fmtInt(Math.round(bp / 10000), lang);
  return (
    <>
      <section className="panel" aria-labelledby="engine-title">
        <div className="studio-head">
          <h2 id="engine-title">{t("engine.title", { name: e.name, major: e.major, minor: e.minor })}</h2>
          <button type="button" disabled={e.majorBlocked !== null} title={e.majorBlocked ? t(e.majorBlocked) : t("engine.majorHint")}
            onClick={() => sim.input({ type: "startMajorVersion" })}>
            {t("engine.major", { n: e.major + 1, pw: pw(e.majorEffortBp) })}
          </button>
        </div>
        <p className="small">
          {t("engine.team", { n: e.team.length, cap: pw(e.capacityBp) })}{" "}
          {e.team.length > 0 && <span className="muted">({e.team.map((id) => view.people.find((p) => p.id === id)?.name ?? "?").join(", ")})</span>}
          {e.team.length === 0 && <span className="error"> {t("engine.noTeam")}</span>}
        </p>
        {e.behind.length > 0 && (
          <p className="error" role="status">
            {t("engine.behind", { n: e.behindLevels, modules: e.behind.map((b) => t("engine.behindModule", { module: t(`module.${b.module}`), level: b.level, art: b.art })).join(", ") })}
          </p>
        )}
        {e.rebuild && <p className="hint">{t("engine.rebuild", { module: t(`module.${e.rebuild}`) })}</p>}
        <PlanEditor key={`${e.plan.researchBp}-${e.plan.maintenanceBp}`} view={view} sim={sim} t={t} />
        <table className="ledger engine-modules">
          <thead>
            <tr>
              <th>{t("engine.col.module")}</th><th>{t("engine.col.level")}</th><th>{t("engine.col.debt")}</th>
              <th>{t("engine.col.origin")}</th><th>{t("engine.col.next")}</th>
            </tr>
          </thead>
          <tbody>
            {e.modules.map((m) => (
              <tr key={m.module}>
                <th scope="row">{t(`module.${m.module}`)}</th>
                <td className={m.level < m.art ? "wf-neg" : ""}>
                  {t("engine.levelOf", { level: m.level, art: m.art, max: m.max })}
                  {m.planned > m.level && <span className="muted small"> → {m.planned}</span>}
                </td>
                <td>
                  <span className="meter" title={fmtPct(m.debtBp, lang)}><span style={{ width: `${m.debtBp / 100}%` }} className={m.debtBp >= 8000 ? "meter-bad" : ""} /></span>{" "}
                  {Math.round(m.debtBp / 100)}
                </td>
                <td className="small">{t(`origin.${m.origin}`)}{m.vendor && <> · {t(`vendor.${m.vendor}`)}</>}</td>
                <td>
                  {m.next && (
                    <button type="button" className="topbar-btn" disabled={m.next.blocked !== null} title={m.next.blocked ? t(m.next.blocked) : undefined}
                      onClick={() => sim.input({ type: "planResearch", module: m.module })}>
                      {t("engine.research", { level: m.next.level, pw: pw(m.next.effortBp) })}
                    </button>
                  )}
                  {m.origin === "lizenziert" && (
                    <button type="button" className="linklike" onClick={() => sim.input({ type: "endLicense", module: m.module })}>{t("engine.endLicense")}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel" aria-labelledby="jobs-title">
        <h2 id="jobs-title">{t("engine.jobs")}</h2>
        {e.jobs.length === 0 && <p className="muted">{t("engine.noJobs")}</p>}
        <ul className="waiting">
          {e.jobs.map((j) => (
            <li key={j.id}>
              <strong>{j.kind === "hauptversion" ? t("engine.job.major", { n: j.level }) : t(`engine.job.${j.kind}`, { module: t(`module.${j.module}`), level: j.level })}</strong>{" "}
              <span className="muted small">
                {t("engine.job.progress", { done: pw(j.doneBp), total: pw(j.effortBp) })}
                {j.projects.length > 0 && <> · {t("engine.job.for", { projects: j.projects.join(", ") })}</>}
                {j.weeksToDeadline !== null && <> · {t("engine.job.deadline", { n: j.weeksToDeadline })}</>}
              </span>{" "}
              {j.kind === "anforderung" && (
                <select aria-label={t("engine.job.priority")} value={j.priority} onChange={(ev) => sim.input({ type: "setRequestPriority", jobId: j.id, priority: Number(ev.target.value) })}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{t("engine.job.prio", { n })}</option>)}
                </select>
              )}{" "}
              <button type="button" className="linklike" onClick={() => sim.input({ type: "cancelEngineJob", jobId: j.id })}>{t("engine.job.cancel")}</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="mw-title">
        <h2 id="mw-title">{t("engine.middleware")}</h2>
        <p className="muted small">{t("engine.middlewareHint")}</p>
        <table className="ledger">
          <thead>
            <tr><th>{t("engine.col.vendor")}</th><th>{t("engine.col.module")}</th><th>{t("engine.col.level")}</th><th>{t("engine.col.fee")}</th><th>{t("engine.col.buy")}</th><th /></tr>
          </thead>
          <tbody>
            {e.middleware.map((v) => (
              <tr key={v.vendor}>
                <th scope="row">{t(`vendor.${v.vendor}`)}{v.active && <span className="badge"> {t("engine.inUse")}</span>}</th>
                <td>{t(`module.${v.module}`)}</td>
                <td>{v.level ?? "–"}</td>
                <td>
                  {v.feeModel === "groesse"
                    ? t("engine.feeBySize", { klein: fmtMoney(v.feeKleinCent, lang), mittel: fmtMoney(v.feeMittelCent, lang) })
                    : t("engine.feeRoyalty", { fee: fmtMoney(v.feeMittelCent, lang), pct: fmtPct(v.royaltyBp, lang) })}
                </td>
                <td>{fmtMoney(v.buyCent, lang)}</td>
                <td>
                  <button type="button" className="topbar-btn" disabled={v.licenseBlocked !== null} title={v.licenseBlocked ? t(v.licenseBlocked) : undefined}
                    onClick={() => sim.input({ type: "licenseModule", vendor: v.vendor })}>{t("engine.license")}</button>{" "}
                  <button type="button" className="topbar-btn" disabled={v.buyBlocked !== null} title={v.buyBlocked ? t(v.buyBlocked) : undefined}
                    onClick={() => sim.input({ type: "buyModule", vendor: v.vendor })}>{t("engine.buy")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
