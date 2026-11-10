// Delegation (S07 FRM-R55 bis FRM-R62): Stufen je Bereich, Führungskapazität als Steckplätze, Produzenten mit Vorgabe,
// Regel-Editor als Satzbaukasten und Regelprotokoll.
import { type ReactNode, useState } from "react";
import type { ViewModel } from "../../sim/view/view";
import type { DelegationArea, DelegationLevel, RuleOp, RuleValue } from "../../sim/model/types";
import type { Sim } from "../useSim";
import { fmtMoney, fmtPct, fmtScore } from "../format";
import type { Lang, T } from "../texts";
import { ruleKeyLabel, ruleOptionLabel } from "./Focus";

const LEVELS: DelegationLevel[] = ["manuell", "regel", "auto"];
const VALUES: RuleValue[] = ["immer", "kasse", "wertung", "staerke", "loyalitaet", "personal"];
const OPS: RuleOp[] = ["unter", "ueber", "gleich"];

/** Übersicht: Solange die Delegation gesperrt ist und keine Regel besteht, bleibt der Bereich eingeklappt. */
function Collapsible({ open, summary, children }: { open: boolean; summary: string; children: ReactNode }) {
  return open ? <>{children}</> : <details><summary className="small">{summary}</summary>{children}</details>;
}

export function DelegationPanel({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const d = view.delegation;
  const used = d.units.projects.length + d.units.areas.length;
  return (
    <section className="panel" aria-labelledby="delegation-title">
      <h2 id="delegation-title">{t("delegation.title")}</h2>
      {!d.unlocked && <p className="muted small">{t("delegation.locked", { n: d.unlockProjects })}</p>}
      <Collapsible open={d.unlocked || d.rules.length > 0} summary={t("delegation.more")}>
      <p className="small">
        {t("delegation.capacity", { used, capacity: d.capacity })}{" "}
        <span aria-hidden="true">{Array.from({ length: Math.max(used, d.capacity) }, (_, i) => (i < d.capacity ? (i < used ? "■" : "□") : "▲")).join("")}</span>
        {d.factorBp < 10000 && <span className="error"> · {t("delegation.overload", { pct: fmtPct(10000 - d.factorBp, lang) })}</span>}
      </p>
      <table className="small">
        <tbody>
          {(Object.keys(d.levels) as DelegationArea[]).map((a) => (
            <tr key={a}>
              <td>{t(`delegation.area.${a}`)}</td>
              <td>
                {LEVELS.map((l) => (
                  <label key={l} className="chip">
                    <input type="radio" name={`lvl-${a}`} checked={d.levels[a] === l} disabled={l !== "manuell" && !d.unlocked}
                      onChange={() => sim.input({ type: "setDelegation", area: a, level: l })} /> {t(`delegation.level.${l}`)}
                  </label>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Producers view={view} sim={sim} t={t} lang={lang} />
      <RuleEditor view={view} sim={sim} t={t} />
      {d.rules.length > 0 && (
        <>
          <h3>{t("rule.list")}</h3>
          <ul className="small">
            {d.rules.map((r) => (
              <li key={r.id} className={r.active ? "" : "muted"}>
                {ruleSentence(view, r, t)}{" "}
                <span className="muted">· {t("rule.hits", { fired: r.fired, would: r.wouldHave })}</span>{" "}
                <button type="button" className="linklike" onClick={() => sim.input({ type: "toggleRule", ruleId: r.id })}>{t(r.active ? "rule.pause" : "rule.resume")}</button>{" "}
                <button type="button" className="linklike" onClick={() => sim.input({ type: "deleteRule", ruleId: r.id })}>{t("rule.delete")}</button>
              </li>
            ))}
          </ul>
        </>
      )}
      {d.log.length > 0 && (
        <>
          <h3>{t("rule.log")}</h3>
          <ul className="small">
            {d.log.map((h, i) => (
              <li key={i}>
                {t("rule.logLine", {
                  week: h.week, by: t(`rule.by.${h.by}`), rule: h.ruleId ?? "–", kind: ruleKeyLabel(h.eventKey, t), object: h.object || "–",
                  option: ruleOptionLabel(h.eventKey, h.option, t),
                })}
              </li>
            ))}
          </ul>
        </>
      )}
      </Collapsible>
    </section>
  );
}

function ruleSentence(view: ViewModel, r: ViewModel["delegation"]["rules"][number], t: T): string {
  const cond = r.condition.value === "immer" ? t("rule.always") : t("rule.cond", { value: t(`rule.value.${r.condition.value}`), op: t(`rule.op.${r.condition.op}`), n: r.condition.number });
  const scope = r.brandId === null ? t("rule.scope.firma") : t("rule.scope.marke", { brand: view.delegation.brands.find((b) => b.id === r.brandId)?.name ?? "?" });
  return t("rule.sentence", { kind: ruleKeyLabel(r.eventKey, t), cond, option: ruleOptionLabel(r.eventKey, r.option, t), scope });
}

/** FRM-R60: Satzbaukasten „Wenn [Karte] und [Wert] [unter/über/gleich] [Zahl], dann [Option]“, gültig für Firma oder Marke. */
function RuleEditor({ view, sim, t }: { view: ViewModel; sim: Sim; t: T }) {
  const d = view.delegation;
  const [key, setKey] = useState(d.eventKeys[0]?.key ?? "");
  const [value, setValue] = useState<RuleValue>("immer");
  const [op, setOp] = useState<RuleOp>("unter");
  const [num, setNum] = useState("0");
  const [brand, setBrand] = useState("");
  const options = d.eventKeys.find((k) => k.key === key)?.options ?? [];
  const [option, setOption] = useState("");
  const chosen = options.includes(option) ? option : options[0] ?? "";
  return (
    <div className="small rule-editor">
      <h3>{t("rule.new")}</h3>
      {t("rule.if")}{" "}
      <select value={key} onChange={(e) => setKey(e.target.value)} aria-label={t("rule.kind")}>
        {d.eventKeys.map((k) => <option key={k.key} value={k.key}>{ruleKeyLabel(k.key, t)}</option>)}
      </select>{" "}
      <select value={value} onChange={(e) => setValue(e.target.value as RuleValue)} aria-label={t("rule.valueLabel")}>
        {VALUES.map((v) => <option key={v} value={v}>{v === "immer" ? t("rule.always") : t(`rule.value.${v}`)}</option>)}
      </select>{" "}
      {value !== "immer" && (
        <>
          <select value={op} onChange={(e) => setOp(e.target.value as RuleOp)} aria-label={t("rule.opLabel")}>
            {OPS.map((o) => <option key={o} value={o}>{t(`rule.op.${o}`)}</option>)}
          </select>{" "}
          <input inputMode="numeric" size={6} value={num} onChange={(e) => setNum(e.target.value)} aria-label={t("rule.number")} />{" "}
        </>
      )}
      {t("rule.then")}{" "}
      <select value={chosen} onChange={(e) => setOption(e.target.value)} aria-label={t("rule.optionLabel")}>
        {options.map((o) => <option key={o} value={o}>{ruleOptionLabel(key, o, t)}</option>)}
      </select>{" "}
      <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label={t("rule.scopeLabel")}>
        <option value="">{t("rule.scope.firma")}</option>
        {d.brands.map((b) => <option key={b.id} value={b.id}>{t("rule.scope.marke", { brand: b.name })}</option>)}
      </select>{" "}
      <button type="button" disabled={chosen === ""}
        onClick={() => sim.input({
          type: "createRule", eventKey: key, option: chosen, brandId: brand === "" ? null : Number(brand),
          condition: { value, op, number: Math.trunc(Number(num)) || 0 },
        })}>
        {t("rule.create")}
      </button>
      <p className="muted">{t("rule.valueHint")}</p>
    </div>
  );
}

/** FRM-R58, FRM-R59: Produzenten ernennen, Projekte mit Vorgabe übergeben. */
function Producers({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const d = view.delegation;
  const [project, setProject] = useState("");
  const [producer, setProducer] = useState("");
  const [minScore, setMinScore] = useState("");
  const [budget, setBudget] = useState("");
  const [weeks, setWeeks] = useState("");
  const free = view.active.filter((p) => !d.producers.some((pr) => pr.projects.some((x) => x.id === p.id)));
  return (
    <div className="small">
      <h3>{t("producer.title")}</h3>
      {d.producers.map((pr) => (
        <div key={pr.personId}>
          <strong>{pr.name}</strong>{" "}
          <span className="muted">
            {(["planning", "quality", "risk", "experience", "communication"] as const).map((k) => `${t(`producer.attr.${k}`)} ${pr.attrs[k]}`).join(" · ")}
            {" · "}{t("producer.load", { n: pr.projects.length, max: pr.maxProjects })}
          </span>{" "}
          <button type="button" className="linklike" onClick={() => sim.input({ type: "dismissProducer", personId: pr.personId })}>{t("producer.dismiss")}</button>
          <ul>
            {pr.projects.map((p) => (
              <li key={p.id}>
                {p.title}
                {p.brief && (
                  <span className="muted"> · {[
                    p.brief.minScoreBp !== null ? t("producer.briefScore", { s: fmtScore(p.brief.minScoreBp, lang) }) : null,
                    p.brief.budgetCent !== null ? t("producer.briefBudget", { b: fmtMoney(p.brief.budgetCent, lang) }) : null,
                    p.brief.targetWeek !== null ? t("producer.briefWeek", { w: p.brief.targetWeek }) : null,
                  ].filter(Boolean).join(" · ")}</span>
                )}
                {p.risk && <span className="error"> · {t(p.risk)}</span>}{" "}
                <button type="button" className="linklike" onClick={() => sim.input({ type: "setProjectProducer", projectId: p.id, producerId: null, brief: null })}>{t("producer.takeBack")}</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {d.candidates.length > 0 && (
        <p>
          {d.candidates.map((c) => (
            <button key={c.personId} type="button" className="topbar-btn" disabled={c.blocked !== null} title={c.blocked ? t(c.blocked) : t("producer.appointHint")}
              onClick={() => sim.input({ type: "appointProducer", personId: c.personId })}>
              {t("producer.appoint", { name: c.name })}
            </button>
          ))}
        </p>
      )}
      {d.producers.length > 0 && free.length > 0 && (
        <p>
          <select value={project} onChange={(e) => setProject(e.target.value)} aria-label={t("producer.project")}>
            <option value="">{t("producer.project")}</option>
            {free.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>{" "}
          <select value={producer} onChange={(e) => setProducer(e.target.value)} aria-label={t("producer.title")}>
            <option value="">{t("producer.title")}</option>
            {d.producers.map((p) => <option key={p.personId} value={p.personId}>{p.name}</option>)}
          </select>{" "}
          <input size={4} placeholder={t("producer.minScore")} value={minScore} onChange={(e) => setMinScore(e.target.value)} />{" "}
          <input size={8} placeholder={t("producer.budget")} value={budget} onChange={(e) => setBudget(e.target.value)} />{" "}
          <input size={4} placeholder={t("producer.weeks")} value={weeks} onChange={(e) => setWeeks(e.target.value)} />{" "}
          <button type="button" disabled={project === "" || producer === ""}
            onClick={() => sim.input({
              type: "setProjectProducer", projectId: Number(project), producerId: Number(producer),
              brief: {
                minScoreBp: minScore.trim() === "" ? null : Math.round(Number(minScore.replace(",", ".")) * 10) * 1000,
                budgetCent: budget.trim() === "" ? null : Math.round(Number(budget.replace(/[^0-9]/g, ""))) * 100,
                targetWeek: weeks.trim() === "" ? null : view.week + Math.round(Number(weeks)),
              },
            })}>
            {t("producer.hand")}
          </button>
        </p>
      )}
    </div>
  );
}
