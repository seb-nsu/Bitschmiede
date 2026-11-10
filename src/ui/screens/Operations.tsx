// S06 Abschnitt 8, S11 (Etappe 5.15): Betrieb als Unterseite der Projekte. Trennbalken mit vier Töpfen, Postkorb,
// Produktkarten mit Zufriedenheit als Gesicht, Sparkline und Bug-Stapel; Live-Produkte mit Spielerbasis,
// Churn-Aufschlüsselung (BTR-F1), Server-Füllstand und Steuerung.
import { useState } from "react";
import type { ViewModel } from "../../sim/view/view";
import type { LiveView, OperationsView, OpsProductView } from "../../sim/view/betriebView";
import type { AnalyticsLevel, OpsPot } from "../../sim/model/types";
import type { Sim } from "../useSim";
import { fmtInt, fmtMoney, fmtPct } from "../format";
import type { Lang, T } from "../texts";
import { Sparkline } from "../viz";
import { useLimit } from "../more";

const POTS: OpsPot[] = ["liveops", "service", "community", "support"];
const LEVELS: AnalyticsLevel[] = ["keine", "grundlegend", "intensiv"];

/** Zufriedenheit als Gesicht (S06 Abschnitt 8). */
function face(bp: number): string {
  if (bp >= 8000) return "😄";
  if (bp >= 6000) return "🙂";
  if (bp >= 4000) return "😐";
  if (bp >= 2000) return "🙁";
  return "😠";
}

function SplitBar({ split, t, lang }: { split: Record<OpsPot, number>; t: T; lang: Lang }) {
  return (
    <div className="ops-split" role="img" aria-label={POTS.map((k) => `${t(`ops.pot.${k}`)} ${fmtPct(split[k], lang)}`).join(", ")}>
      {POTS.map((k) => split[k] > 0 && (
        <span key={k} className={`ops-pot ops-pot-${k}`} style={{ flexGrow: split[k] }} title={`${t(`ops.pot.${k}`)} ${fmtPct(split[k], lang)}`}>
          {split[k] >= 1500 ? t(`ops.pot.${k}`) : ""}
        </span>
      ))}
    </div>
  );
}

function Department({ ops, sim, t, lang }: { ops: OperationsView; sim: Sim; t: T; lang: Lang }) {
  const [size, setSize] = useState(ops.size);
  const [split, setSplit] = useState<Record<OpsPot, number>>(ops.splitBp);
  const [editSplit, setEditSplit] = useState(false);
  const [threshold, setThreshold] = useState(ops.shutdownBelow);
  const splitSum = POTS.reduce((a, k) => a + split[k], 0);
  if (!ops.open) {
    return (
      <section className="panel" aria-labelledby="ops-title">
        <h2 id="ops-title">{t("ops.title")}</h2>
        <p className="muted small">{t("ops.locked")}</p>
      </section>
    );
  }
  return (
    <section className="panel" aria-labelledby="ops-title">
      <h2 id="ops-title">{t("ops.title")}</h2>
      <p className="small">
        <strong>{t("ops.inbox")}:</strong> {t("ops.inboxLine", { open: fmtInt(ops.backlog, lang), fresh: fmtInt(ops.ticketsLastMonth, lang), done: fmtInt(ops.answeredLastMonth, lang) })}
        {ops.supportRequests > 0 && <> · {t("ops.support", { n: fmtInt(ops.supportRequests, lang), pct: fmtPct(ops.supportFulfillmentBp, lang) })}</>}
      </p>
      <div className="vcard-actions small">
        <label>
          {t("ops.size")}{" "}
          <input type="number" min={0} max={200} value={ops.auto ? ops.suggested : size} disabled={ops.auto} onChange={(e) => setSize(Number(e.target.value))}
            onBlur={() => !ops.auto && size !== ops.size && sim.input({ type: "setOperations", size })} style={{ width: "4.5rem" }} />
        </label>
        <label><input type="checkbox" checked={ops.auto} onChange={(e) => sim.input({ type: "setOperations", auto: e.target.checked })} /> {t("ops.auto", { n: ops.suggested })}</label>
        <span className="muted">{t("ops.cost", { cost: fmtMoney(ops.weeklyCostCent, lang) })}</span>
      </div>
      <SplitBar split={ops.splitBp} t={t} lang={lang} />
      <div className="vcard-actions small">
        <label>
          <input type="checkbox" checked={ops.splitAuto} onChange={(e) => sim.input({ type: "setOperations", splitAuto: e.target.checked })} />{" "}
          {ops.producersActive ? t("ops.splitProducers") : t("ops.splitProducersLater")}
        </label>
        <button type="button" className="linklike" onClick={() => { setSplit(ops.splitBp); setEditSplit(!editSplit); }}>{t("ops.splitEdit")}</button>
      </div>
      {editSplit && (
        <div className="vcard-actions small">
          {POTS.map((k) => (
            <label key={k}>
              {t(`ops.pot.${k}`)}{" "}
              <input type="number" min={0} max={100} value={Math.round(split[k] / 100)} style={{ width: "3.5rem" }}
                onChange={(e) => setSplit({ ...split, [k]: Math.round(Number(e.target.value)) * 100 })} /> %
            </label>
          ))}
          <button type="button" className="primary" disabled={splitSum !== 10000} title={splitSum !== 10000 ? t("error.split") : undefined}
            onClick={() => { sim.input({ type: "setOperations", splitBp: split }); setEditSplit(false); }}>{t("ops.apply")}</button>
        </div>
      )}
      <div className="vcard-actions small">
        <label><input type="checkbox" checked={ops.outsourced} onChange={(e) => sim.input({ type: "setOperations", outsourced: e.target.checked })} /> {t("ops.outsourced")}</label>
        {ops.analyticsAvailable && (
          <label>
            {t("ops.analytics")}{" "}
            <select value={ops.analytics} onChange={(e) => sim.input({ type: "setOperations", analytics: e.target.value as AnalyticsLevel })}>
              {LEVELS.map((l) => <option key={l} value={l}>{t(`ops.analytics.${l}`)}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="vcard-actions small">
        <label><input type="checkbox" checked={ops.autoPatch} onChange={(e) => sim.input({ type: "setOperations", autoPatch: e.target.checked })} /> {t("ops.autoPatch")}</label>
        <label>
          {t("ops.shutdownBelow")}{" "}
          <input type="number" min={0} step={1000} value={threshold} style={{ width: "6rem" }} onChange={(e) => setThreshold(Number(e.target.value))}
            onBlur={() => threshold !== ops.shutdownBelow && sim.input({ type: "setOperations", shutdownBelow: Math.max(0, Math.round(threshold)) })} />
        </label>
      </div>
    </section>
  );
}

function BugStack({ known, t }: { known: OpsProductView["known"]; t: T }) {
  const all = known.leicht + known.mittel + known.schwer;
  if (all === 0) return <span className="muted">{t("ops.noBugs")}</span>;
  return (
    <span className="ops-bugs" aria-label={t("ops.bugs", { a: known.leicht, b: known.mittel, c: known.schwer })}>
      {(["schwer", "mittel", "leicht"] as const).map((k) => known[k] > 0 && (
        <span key={k} className={`ops-bug ops-bug-${k}`} title={t(`ops.severity.${k}`)}>{known[k]}</span>
      ))}
    </span>
  );
}

function LiveBlock({ id, live, sim, t, lang }: { id: number; live: LiveView; sim: Sim; t: T; lang: Lang }) {
  const [rent, setRent] = useState(live.server.rented);
  const [hardness, setHardness] = useState(live.hardnessBp);
  const [campaign, setCampaign] = useState(Math.round(live.campaign.monthlyCent / 100));
  const [confirm, setConfirm] = useState(false);
  if (live.shutdown) return <p className="muted small">{t("ops.live.shutdown")}</p>;
  const s = live.server;
  const fill = s.capacity === 0 ? (s.demand > 0 ? 1 : 0) : Math.min(1, s.demand / s.capacity);
  const parts = live.churnParts;
  return (
    <div className="ops-live">
      <p className="small">
        <strong>{t("ops.live.base", { n: fmtInt(live.base, lang) })}</strong> · {t("ops.live.joined", { n: fmtInt(live.joinedLastMonth, lang) })}
        {" · "}{t("ops.live.revenue", { week: fmtMoney(live.weekRevenueCent, lang), arpu: fmtMoney(live.arpuCent, lang) })}
      </p>
      {live.history.length >= 2 && <Sparkline values={live.history} label={t("ops.live.history")} />}
      <details className="small">
        <summary>{t("ops.live.churn", { pct: fmtPct(live.churnBp, lang) })}</summary>
        <ul className="ops-churn">
          {(["baseBp", "competitionBp", "pauseBp", "techBp", "satisfactionBp"] as const).map((k) => (
            <li key={k}><span>{t(`ops.churn.${k}`)}</span> <span>{parts[k] >= 0 ? "+" : ""}{fmtPct(parts[k], lang)}</span></li>
          ))}
        </ul>
      </details>
      <p className="small">
        {live.weeksToDrop === null ? t("ops.live.noDrop") : t("ops.live.drop", { n: live.weeksToDrop, drops: live.drops })}
      </p>
      <div className="small">
        {t("ops.server", { demand: fmtInt(s.demand, lang), capacity: fmtInt(s.capacity, lang) })}
        <div className={`ops-fill${fill >= 1 ? " ops-fill-full" : ""}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fill * 100)}>
          <span style={{ width: `${Math.round(fill * 100)}%` }} />
        </div>
        <span className="muted">{t("ops.serverParts", { own: fmtInt(s.own, lang), rented: fmtInt(s.rented, lang), cloud: fmtInt(s.cloud, lang), ordered: fmtInt(s.ordered, lang), cost: fmtMoney(s.weekCostCent, lang) })}</span>
        {s.outages > 0 && <span className="error"> · {t("ops.outages", { n: s.outages })}</span>}
      </div>
      <div className="vcard-actions small">
        <label><input type="checkbox" checked={s.rule} onChange={(e) => sim.input({ type: "setServer", projectId: id, rule: e.target.checked })} /> {t("ops.serverRule", { pct: fmtPct(s.ruleBp, lang) })}</label>
        {!s.rule && (
          <>
            <input type="number" min={0} step={1000} value={rent} style={{ width: "6rem" }} onChange={(e) => setRent(Number(e.target.value))} aria-label={t("ops.rent")} />
            <button type="button" onClick={() => sim.input({ type: "setServer", projectId: id, rented: Math.max(0, Math.round(rent)) })}>{t("ops.rent")}</button>
          </>
        )}
      </div>
      {live.kind === "f2p" && (
        <label className="small">
          {t("ops.hardness", { n: Math.round(hardness / 100) })}{" "}
          <input type="range" min={0} max={100} value={Math.round(hardness / 100)} onChange={(e) => setHardness(Number(e.target.value) * 100)}
            onPointerUp={() => sim.input({ type: "setLive", projectId: id, hardnessBp: hardness })} onKeyUp={() => sim.input({ type: "setLive", projectId: id, hardnessBp: hardness })} />
        </label>
      )}
      {/* BTR-R15: Kampagne für das laufende Live-Produkt (Budget je Monat → Zugang). */}
      <div className="small">
        <label>
          {t("ops.campaign")}{" "}
          <input type="number" min={0} max={Math.floor(live.campaign.maxCent / 100)} step={10000} value={campaign} style={{ width: "7rem" }}
            onChange={(e) => setCampaign(Number(e.target.value))} aria-label={t("ops.campaign")} />
        </label>{" "}
        <button type="button" onClick={() => sim.input({ type: "setLive", projectId: id, campaignCent: Math.max(0, Math.min(live.campaign.maxCent, Math.round(campaign) * 100)) })}>{t("ops.campaignSet")}</button>
        <div className="muted">{t("ops.campaignInfo", {
          month: fmtMoney(live.campaign.monthlyCent, lang), n: fmtInt(live.campaign.joined, lang), cost: fmtMoney(live.campaign.costPerPlayerCent, lang),
          pct: fmtPct(live.campaign.efficiencyBp, lang), max: fmtMoney(live.campaign.maxCent, lang),
        })}</div>
      </div>
      <div className="vcard-actions small">
        {confirm ? (
          <>
            <span>{t("ops.shutdownConfirm")}</span>
            <button type="button" className="primary" onClick={() => sim.input({ type: "setLive", projectId: id, shutdown: true })}>{t("ops.shutdown")}</button>
            <button type="button" onClick={() => setConfirm(false)}>{t("form.cancel")}</button>
          </>
        ) : <button type="button" onClick={() => setConfirm(true)}>{t("ops.shutdown")}</button>}
      </div>
    </div>
  );
}

function ProductCard({ p, free, sim, t, lang }: { p: OpsProductView; free: number[]; sim: Sim; t: T; lang: Lang }) {
  const patch = (size: "klein" | "gross", n: number) => sim.input({ type: "planPatch", projectId: p.id, size, people: free.slice(0, n) });
  return (
    <article className="vcard" aria-labelledby={`ops${p.id}`}>
      <header className="vcard-head">
        <h3 id={`ops${p.id}`}><span aria-hidden="true">{face(p.satisfactionBp)}</span> {p.title}</h3>
        <span className="muted small">{t(`type.${p.type}`)} · {t("ops.satisfaction", { n: Math.round(p.satisfactionBp / 100) })}</span>
      </header>
      {p.history.length >= 2 && <Sparkline values={p.history} max={10000} label={t("ops.satisfactionHistory")} />}
      <p className="small">{t("ops.knownBugs")}: <BugStack known={p.known} t={t} /></p>
      <div className="vcard-actions small">
        {p.patch
          ? <span className="badge">{t("ops.patchRunning", { size: t(`ops.patch.${p.patch.size}`), n: p.patch.weeksLeft })}</span>
          : (
            <>
              <button type="button" disabled={p.patchBlocked !== null} title={p.patchBlocked ? t(p.patchBlocked) : undefined} onClick={() => patch("klein", 2)}>{t("ops.patchSmall")}</button>
              <button type="button" disabled={p.patchBlocked !== null || free.length < 2} title={p.patchBlocked ? t(p.patchBlocked) : undefined} onClick={() => patch("gross", 4)}>{t("ops.patchBig")}</button>
            </>
          )}
        {p.patches > 0 && <span className="muted">{t("ops.patches", { n: p.patches })}</span>}
      </div>
      {p.live && <LiveBlock id={p.id} live={p.live} sim={sim} t={t} lang={lang} />}
    </article>
  );
}

/** Prüfung Fable 03.11.2026: Ein Produkt braucht Aufmerksamkeit, wenn es live ist, gepatcht wird, schwere oder mittlere Bugs hat oder die Zufriedenheit unter 60 liegt. */
function needsAttention(p: OpsProductView): boolean {
  return p.live !== null || p.patch !== null || p.known.schwer > 0 || p.known.mittel > 0 || p.satisfactionBp < 6000;
}

type OpsFilter = "aufmerksamkeit" | "live" | "alle";

export function OperationsPage({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const ops = view.operations;
  const [filter, setFilter] = useState<OpsFilter>("aufmerksamkeit");
  // Prüfung Fable 03.11.2026: 110 Produktkarten 2020 waren eine 13.000 Bildpunkte hohe Seite; Filter und „Alle anzeigen“.
  const list = ops.products
    .filter((p) => filter === "alle" || (filter === "live" ? p.live !== null : needsAttention(p)))
    .sort((a, b) => Number(b.live !== null) - Number(a.live !== null) || a.satisfactionBp - b.satisfactionBp || a.id - b.id);
  const { shown, toggle } = useLimit(list, 12, t);
  return (
    <>
      <Department ops={ops} sim={sim} t={t} lang={lang} />
      <section className="panel" aria-labelledby="ops-products">
        <h2 id="ops-products">{t("ops.products")}</h2>
        {ops.products.length === 0 ? <p className="muted small">{t("ops.none")}</p> : (
          <>
            <div className="vcard-actions small" role="group" aria-label={t("ops.filter")}>
              {(["aufmerksamkeit", "live", "alle"] as const).map((f) => (
                <button key={f} type="button" aria-pressed={filter === f} className={filter === f ? "primary" : ""} onClick={() => setFilter(f)}>
                  {t(`ops.filter.${f}`, { n: f === "alle" ? ops.products.length : ops.products.filter(f === "live" ? (p) => p.live !== null : needsAttention).length })}
                </button>
              ))}
            </div>
            {list.length === 0 && <p className="muted small">{t("ops.filter.empty")}</p>}
            <div className="cards ops-cards">
              {shown.map((p) => <ProductCard key={p.id} p={p} free={ops.freePeople} sim={sim} t={t} lang={lang} />)}
            </div>
            {toggle}
          </>
        )}
      </section>
    </>
  );
}
