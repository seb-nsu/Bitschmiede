// Verhandlungstisch für Publisher (S07 FRM-R42 bis FRM-R47, S11 „Verhandlungstisch“; Etappe 6a.5).
import { useState } from "react";
import type { ProjectView } from "../../sim/view/view";
import type { PublisherOfferView } from "../../sim/view/publisherView";
import type { NumericTerm, PublisherTerms } from "../../sim/model/types";
import type { Sim } from "../useSim";
import { fmtMoney, fmtPct } from "../format";
import type { Lang, T } from "../texts";

const TERMS: NumericTerm[] = ["advanceBp", "splitBeforeBp", "splitAfterBp", "markupBp", "termYears"];

function fmtTerm(k: NumericTerm, v: number, lang: Lang, t: T): string {
  return k === "termYears" ? t("publisher.years", { n: v }) : fmtPct(v, lang);
}

export function PublisherBlock({ project, sim, t, lang }: { project: ProjectView; sim: Sim; t: T; lang: Lang }) {
  const pv = project.publisher;
  if (!pv) return null;
  if (pv.deal) {
    const d = pv.deal;
    return (
      <p className="small publisher-deal">
        <span className="badge">{t("publisher.deal", { publisher: d.publisher })}</span>{" "}
        {t("publisher.dealLine", {
          paid: fmtMoney(d.paidCent, lang), advance: fmtMoney(d.advanceCent, lang),
          before: fmtPct(d.terms.splitBeforeBp, lang), after: fmtPct(d.terms.splitAfterBp, lang),
          recouped: fmtMoney(d.recoupedCent, lang), target: fmtMoney(d.recoupTargetCent, lang),
        })}
        {d.terms.ipPublisher && <span className="muted"> · {t("publisher.ipAtPublisher")}</span>}
        {d.nextRate && <span className="muted"> · {t("publisher.nextRate", { phase: t(`phase.${d.nextRate.phase}`), amount: fmtMoney(d.nextRate.amountCent, lang), week: d.nextRate.due.weekOfYear + 1, year: d.nextRate.due.year })}</span>}
        {d.misses > 0 && <span className="error"> · {t("publisher.misses", { n: d.misses })}</span>}
        {d.stopped && <span className="error"> · {t("publisher.stopped")}</span>}
      </p>
    );
  }
  return (
    <details className="pc-more" open={pv.offers.length > 0}>
      <summary>{t("publisher.title")} {pv.offers.length > 0 && <span className="badge">{t("publisher.offers", { n: pv.offers.length })}</span>}</summary>
      {pv.offers.length === 0 && (
        <div className="vcard-actions">
          {(["konzept", "slice"] as const).map((mode) => (
            <button key={mode} type="button" disabled={pv.pitch[mode] !== null} title={pv.pitch[mode] ? t(pv.pitch[mode]!) : t(`publisher.pitchHint.${mode}`)}
              onClick={() => sim.input({ type: "pitchPublisher", projectId: project.id, mode })}>
              {t(`publisher.pitch.${mode}`)}
            </button>
          ))}
        </div>
      )}
      {pv.offers.map((o) => <OfferCard key={o.id} offer={o} sim={sim} t={t} lang={lang} />)}
    </details>
  );
}

function OfferCard({ offer, sim, t, lang }: { offer: PublisherOfferView; sim: Sim; t: T; lang: Lang }) {
  const [draft, setDraft] = useState<PublisherTerms>(offer.terms);
  const set = (k: keyof PublisherTerms, v: number | boolean) => setDraft({ ...draft, [k]: v });
  const changed = (Object.keys(draft) as (keyof PublisherTerms)[]).some((k) => draft[k] !== offer.terms[k]);
  return (
    <section className="nego" aria-label={offer.publisher}>
      <header className="nego-head">
        <strong>{offer.publisher}</strong>
        <span className="muted small"> · {t(`publisher.personality.${offer.personality}`)} · {t("publisher.reputation", { n: Math.round(offer.reputationBp / 100) })}</span>
        <span className="nego-patience" title={t("publisher.patienceHint")}>{"●".repeat(offer.patience)}</span>
      </header>
      <p className="muted small">
        {t("publisher.budget", { budget: fmtMoney(offer.budgetCent, lang), advance: fmtMoney(offer.advanceCent, lang) })}
        {" · "}{t("publisher.expires", { week: offer.expires.weekOfYear + 1, year: offer.expires.year })}
      </p>
      <table className="nego-terms">
        <tbody>
          {TERMS.map((k) => {
            const [lo, hi] = offer.ranges[k];
            const [rlo, rhi] = offer.room[k];
            const step = k === "termYears" ? 1 : 100;
            const over = draft[k] < rlo || draft[k] > rhi;
            return (
              <tr key={k}>
                <th scope="row">{t(`publisher.term.${k}`)}</th>
                <td>
                  <input type="range" min={lo} max={hi} step={step} value={draft[k]} aria-label={t(`publisher.term.${k}`)}
                    onChange={(e) => set(k, Number(e.target.value))} />
                </td>
                <td className={over ? "error" : ""}>{fmtTerm(k, draft[k], lang, t)}</td>
                <td className="muted small">{t("publisher.room", { lo: fmtTerm(k, rlo, lang, t), hi: fmtTerm(k, rhi, lang, t) })}</td>
              </tr>
            );
          })}
          <tr>
            <th scope="row">{t("publisher.term.ip")}</th>
            <td colSpan={3}>
              <label><input type="checkbox" checked={!draft.ipPublisher} disabled={offer.ipFixed} onChange={(e) => set("ipPublisher", !e.target.checked)} /> {t("publisher.keepIp")}</label>
              {offer.ipFixed && <span className="muted small"> · {t("error.ipFixed")}</span>}
            </td>
          </tr>
          <tr>
            <th scope="row">{t("publisher.term.sequel")}</th>
            <td colSpan={3}><label><input type="checkbox" checked={!draft.sequelOption} onChange={(e) => set("sequelOption", !e.target.checked)} /> {t("publisher.noSequelOption")}</label></td>
          </tr>
        </tbody>
      </table>
      <p className="muted small">{t("publisher.left", { n: Math.round(offer.leftBp / 100) })}</p>
      <div className="vcard-actions">
        <button type="button" disabled={!changed} onClick={() => sim.input({ type: "publisherOffer", offerId: offer.id, action: "fordern", terms: draft })}>{t("publisher.demand")}</button>
        <button type="button" className="primary" disabled={changed} title={changed ? t("publisher.demandFirst") : ""} onClick={() => sim.input({ type: "publisherOffer", offerId: offer.id, action: "annehmen" })}>{t("publisher.accept")}</button>
        <button type="button" onClick={() => sim.input({ type: "publisherOffer", offerId: offer.id, action: "ablehnen" })}>{t("publisher.reject")}</button>
        {changed && <button type="button" onClick={() => setDraft(offer.terms)}>{t("publisher.reset")}</button>}
      </div>
    </section>
  );
}
