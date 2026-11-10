// Aufträge: Marktplatz für Einzel-, Team- und Auftragsspiele, laufende Aufträge.
// Prüfung Fable 03.11.2026: aus Studio.tsx herausgelöst (eine Datei je Bereich).
import type { ContractGameOfferView, ContractView, ViewModel } from "../../sim/view/view";
import type { Sim } from "../useSim";
import { fmtMoney, fmtScore } from "../format";
import type { Lang, T } from "../texts";
import { body, eventTitle, optionLabel } from "./Focus";
import { Icon } from "../icons";
import { personName } from "./ProjectCard";

export function ContractCard({ contract, view, t, lang }: { contract: ContractView; view: ViewModel; t: T; lang: Lang }) {
  const ok = contract.expectedQuality >= contract.requirement;
  return (
    <article className="vcard vcard-contract">
      <header className="vcard-head">
        <h3>{t("contract.title", { kind: t(`contract.${contract.kind}`) })}</h3>
        <span className="muted small">{t(`client.${contract.client}`)}</span>
      </header>
      <p className="small">
        {t("contract.deadline", { n: contract.weeksLeft })} · {fmtMoney(contract.payCent, lang)} · {t("contract.requirement", { n: contract.requirement })} ·{" "}
        <span className={ok ? "wf-pos" : "wf-neg"}>q {contract.expectedQuality} {ok ? "✓" : "✗"}</span>
      </p>
      <p className="small">{t("project.people")}: {contract.personIds.map((id) => personName(view, id)).join(", ")} ({t(`area.${contract.area}`)})</p>
    </article>
  );
}

/** Etappe 6c.3: Marktplatz der Auftragsspiele mit Vorgaben, Mindestwertung, Frist und Bezahlung. */
export function Marketplace({ view, sim, t, lang, onAccept }: { view: ViewModel; sim: Sim; t: T; lang: Lang; onAccept: (o: ContractGameOfferView) => void }) {
  const m = view.contractGames;
  // Prüfung Fable 03.11.2026: Einzel- und Team-Aufträge, Auftragsspiele und laufende Aufträge auf einer Oberfläche.
  const work = view.events.filter((e) => e.kind === "auftrag");
  if (!m.unlocked && work.length === 0 && view.contracts.length === 0) return null;
  const n = m.offers.length + work.length;
  return (
    <details className="market-offers" open={n > 0}>
      <summary><strong>{t("cgame.title")}</strong> <span className="muted small">{t("cgame.count", { n })}</span></summary>
      {n === 0 && <p className="muted small">{t("cgame.empty")}</p>}
      <ul className="vcards">
        {work.map((e) => (
          <li key={`e${e.id}`} className="vcard">
            <strong>{eventTitle(e, t)}</strong>{" "}
            <span className="muted small">{t("cgame.expires", { n: e.weeksLeft })}</span>
            <p className="small">{body(e, view, t, lang)}</p>
            <div className="vcard-actions small">
              {e.options.map((o) => (
                <button key={o} type="button" className={o === e.defaultOption ? "" : "primary"} onClick={() => sim.input({ type: "decide", eventId: e.id, option: o })}>
                  {optionLabel(e, o, view, t, lang)}
                </button>
              ))}
            </div>
          </li>
        ))}
        {m.offers.map((o) => (
          <li key={o.id} className="vcard">
            <strong>{o.client}</strong>{" "}
            <span className="muted small">{t("cgame.expires", { n: o.expiresWeeks })}</span>
            <p className="small">
              <Icon kind="genre" id={o.genre} /> {t(`genre.${o.genre}`)} · {o.theme ? <><Icon kind="theme" id={o.theme} /> {t(`theme.${o.theme}`)}</> : t("cgame.freeTheme")} · {t(`scope.${o.scope}`)} · {t(`platform.${o.platform}`)}
              {o.audience !== null && <> · {t("cgame.audience", { audience: t(`audience.${o.audience}`) })}</>}
            </p>
            <p className="small">
              {t("cgame.offer", {
                score: fmtScore(o.minScoreBp, lang), weeks: o.weeks, pay: fmtMoney(o.payCent, lang), advance: fmtMoney(o.advanceCent, lang),
                bonus: fmtMoney(o.bonusCent, lang), bonusScore: fmtScore(o.bonusScoreBp, lang), penalty: fmtMoney(o.penaltyCent, lang),
              })}
            </p>
            <div className="vcard-actions small">
              <button type="button" className="primary" disabled={view.newProjectBlocked !== null} title={view.newProjectBlocked ? t(view.newProjectBlocked) : t("cgame.acceptHint")}
                onClick={() => onAccept(o)}>{t("cgame.accept")}</button>{" "}
              <button type="button" onClick={() => sim.input({ type: "declineContractGame", offerId: o.id })}>{t("cgame.decline")}</button>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
