// Übernahmen und Konzern in der Firma-Ansicht (S09 Abschnitt 8; Etappe 6b.6): Zielfirma sondieren, prüfen, bieten,
// Gegenangebot, Töchter mit Integration, Moral, Konto und Vorgaben.
import { useState } from "react";
import type { ViewModel } from "../../sim/view/view";
import type { DealView, SubsidiaryView } from "../../sim/view/konzernView";
import type { Sim } from "../useSim";
import { fmtMoney, fmtPct } from "../format";
import type { Lang, T } from "../texts";

function euros(text: string): number {
  return Math.round(Number(text.replace(/[^0-9]/g, "")) * 100);
}

function Deal({ d, sim, t, lang }: { d: DealView; sim: Sim; t: T; lang: Lang }) {
  const [bid, setBid] = useState(String(Math.round(d.range.mid / 100)));
  const [loan, setLoan] = useState("0");
  return (
    <li className="vcard">
      <strong>{d.studio}</strong>
      <p className="small">{t("konzern.range", { low: fmtMoney(d.range.low, lang), mid: fmtMoney(d.range.mid, lang), high: fmtMoney(d.range.high, lang) })}</p>
      {d.diligence === "laufend" && <p className="small muted">{t("konzern.diligenceRunning", { n: d.diligenceWeeksLeft })}</p>}
      {d.diligence === "fertig" && (
        <p className="small">{d.findings.length > 0 ? t("konzern.findings", { list: d.findings.map((f) => t(`acq.finding.${f}`)).join(", ") }) : t("konzern.noFindings")}</p>
      )}
      {d.bidders > 0 && <p className="small">{t("konzern.bidders", { n: d.bidders })}</p>}
      {d.warn && <p className="small warn">{t("konzern.warn")}</p>}
      {d.phase === "warten" && <p className="small muted">{t("konzern.waiting", { bid: fmtMoney(d.bidCent, lang) })}</p>}
      {d.phase === "gegenangebot" && (
        <div className="vcard-actions small">
          <span>{t("konzern.counter", { counter: fmtMoney(d.counterCent, lang) })}</span>{" "}
          <button type="button" className="primary" onClick={() => sim.input({ type: "acquire", action: "annehmen", dealId: d.id })}>{t("konzern.accept")}</button>
        </div>
      )}
      {d.phase === "sondiert" && (
        <div className="vcard-actions small">
          {d.diligence === "keine" && (
            <button type="button" onClick={() => sim.input({ type: "acquire", action: "pruefen", dealId: d.id })}>{t("konzern.diligence", { cost: fmtMoney(d.diligenceCostCent, lang) })}</button>
          )}{" "}
          <label>{t("konzern.bid")} <input inputMode="numeric" size={12} value={bid} onChange={(e) => setBid(e.target.value)} /></label>{" "}
          <label>{t("konzern.loan")} <input inputMode="numeric" size={10} value={loan} onChange={(e) => setLoan(e.target.value)} /></label>{" "}
          <button
            type="button" className="primary" disabled={d.diligence === "laufend"}
            onClick={() => sim.input({ type: "acquire", action: "bieten", dealId: d.id, bidCent: euros(bid), loanCent: euros(loan), retentionCent: 0 })}
          >{t("konzern.submit")}</button>
        </div>
      )}
      <div className="vcard-actions small">
        <button type="button" onClick={() => sim.input({ type: "acquire", action: "zurueckziehen", dealId: d.id })}>{t("konzern.withdraw")}</button>
      </div>
    </li>
  );
}

function Sub({ s, sim, t, lang }: { s: SubsidiaryView; sim: Sim; t: T; lang: Lang }) {
  const [amount, setAmount] = useState("0");
  const directives = (patch: Partial<SubsidiaryView["directives"]>) =>
    sim.input({ type: "subsidiary", studioId: s.id, action: "vorgaben", directives: { ...s.directives, ...patch } });
  return (
    <li className="vcard">
      <strong>{s.name}</strong>
      <p className="small">{t("konzern.sub", { people: s.people, cash: fmtMoney(s.cashCent, lang), revenue: fmtMoney(s.revenueLastYearCent, lang) })}</p>
      <p className="small">
        {t("konzern.integration", {
          pct: fmtPct(s.integrationBp, lang), state: t(`konzern.integration.${s.integrationState}`), morale: Math.floor(s.moraleBp / 100), fit: fmtPct(s.cultureFitBp, lang),
        })}
        {s.leaveBp > 0 && ` · ${t("konzern.leave", { pct: fmtPct(s.leaveBp, lang) })}`}
        {s.leftCount > 0 && ` · ${t("konzern.left", { n: s.leftCount })}`}
        {s.synergyBp > 0 && ` · ${t("konzern.synergy", { pct: fmtPct(s.synergyBp, lang) })}`}
      </p>
      {s.integrationBp < 10000 && (
        <p className="small muted">
          {s.retentionCent > 0
            ? t("konzern.retention.now", { amount: fmtMoney(s.retentionCent, lang), weeks: s.retentionWeeksLeft, full: fmtMoney(s.retentionFullCent, lang) })
            : t("konzern.retention.none", { full: fmtMoney(s.retentionFullCent, lang) })}
        </p>
      )}
      <p className="small muted">{t("konzern.book", { price: fmtMoney(s.purchaseCent, lang), book: fmtMoney(s.bookCent, lang) })}</p>
      {/* Prüfung Fable 03.11.2026: zwei Bedienelemente; Höchstumfang bleibt, wie er ist, die Halteprämie läuft automatisch. */}
      <div className="vcard-actions small">
        <label>{t("konzern.autonomy")}{" "}
          <select value={s.directives.autonomy} onChange={(e) => directives({ autonomy: e.target.value as typeof s.directives.autonomy })}>
            {(["selbststaendig", "rahmen", "gesteuert"] as const).map((a) => <option key={a} value={a}>{t(`konzern.autonomy.${a}`)}</option>)}
          </select>
        </label>{" "}
        <label title={t("konzern.flowHint")}>{t("konzern.flow")} <input inputMode="numeric" size={10} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>{" "}
        <button type="button" onClick={() => {
          const cent = euros(amount);
          if (cent === 0) return;
          sim.input({ type: "subsidiary", studioId: s.id, action: amount.trim().startsWith("-") || amount.trim().startsWith("−") ? "entnehmen" : "zuschiessen", amountCent: cent });
        }}>{t("konzern.book.flow")}</button>
      </div>
      <details className="small">
        <summary className="muted">{t("konzern.more")}</summary>
        <button
          type="button"
          onClick={() => { if (window.confirm(t("konzern.closeConfirm", { studio: s.name }))) sim.input({ type: "subsidiary", studioId: s.id, action: "schliessen" }); }}
        >{t("konzern.close")}</button>
      </details>
    </li>
  );
}

export function KonzernPanel({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const k = view.konzern;
  const [target, setTarget] = useState<number | null>(null);
  if (!k.visible) return null;
  const chosen = target ?? k.targets.find((x) => x.blockedWeeks === 0)?.id ?? null;
  return (
    <section className="panel" aria-labelledby="konzern-title">
      <h2 id="konzern-title">{t("konzern.title")}</h2>
      {!k.unlocked ? (
        <p className="small muted">{t("konzern.locked", { year: k.unlockYear, people: k.unlockPeople })}</p>
      ) : (
        <>
          <p className="small">{t("konzern.capacity", { n: k.capacity })}</p>
          <div className="vcard-actions small">
            <label>{t("konzern.target")}{" "}
              <select value={chosen ?? ""} onChange={(e) => setTarget(Number(e.target.value))}>
                {k.targets.map((x) => (
                  <option key={x.id} value={x.id} disabled={x.blockedWeeks > 0}>
                    {x.name} · {x.people} · {t(`archetype.${x.archetype}`)}{x.blockedWeeks > 0 ? ` · ${t("konzern.blocked", { n: x.blockedWeeks })}` : ""}
                  </option>
                ))}
              </select>
            </label>{" "}
            <button type="button" disabled={chosen === null} onClick={() => chosen !== null && sim.input({ type: "acquire", action: "sondieren", targetId: chosen })}>{t("konzern.probe")}</button>
          </div>
          {k.deals.length > 0 && (
            <>
              <h3>{t("konzern.deals")}</h3>
              <ul className="vcards">{k.deals.map((d) => <Deal key={d.id} d={d} sim={sim} t={t} lang={lang} />)}</ul>
            </>
          )}
        </>
      )}
      {k.subsidiaries.length > 0 && (
        <>
          <h3>{t("konzern.subs")}</h3>
          <ul className="vcards">{k.subsidiaries.map((s) => <Sub key={s.id} s={s} sim={sim} t={t} lang={lang} />)}</ul>
        </>
      )}
      {k.aiSubsidiaries > 0 && <p className="small muted">{t("konzern.aiSubs", { n: k.aiSubsidiaries })}</p>}
    </section>
  );
}
