// Fokus-Spalte (A23, S11): eine Entscheidung im Vordergrund, weitere in der Warteschlange; darunter der Bericht.
import { useState } from "react";
import type { EventView, ViewModel } from "../../sim/view/view";
import type { Sim } from "../useSim";
import { fmtFactor, fmtInt, fmtMoney, fmtPct, fmtScore } from "../format";
import type { Lang, T } from "../texts";
import { GfxIcon, iconForEvent, iconForLog } from "../gfx";

function catalogParams(e: EventView): Record<string, string> {
  return { project: e.projectTitle ?? "", person: e.personName ?? "", product: e.productTitle ?? "" };
}

export function optionLabel(e: EventView, option: string, view: ViewModel, t: T, lang: Lang = "de"): string {
  if (e.kind === "katalog") return t(`event.katalog.${e.defId}.option.${option}`);
  if (option.startsWith("annehmen:") && e.offer) {
    const id = option.slice("annehmen:".length);
    const person = view.people.find((p) => String(p.id) === id);
    const q = e.offer.quality[id] ?? 0;
    const project = person?.assignment?.kind === "project" ? view.active.find((p) => p.id === person.assignment!.id) : undefined;
    const label = t("event.auftrag.option.annehmen", { person: person?.name ?? "?", q, mark: q >= e.offer.requirement ? "✓" : "✗" });
    return project ? `${label} · ${t("event.auftrag.leaves", { project: project.title })}` : label;
  }
  if (option === "annehmenTeam" && e.offer) {
    // Team-Auftrag (Entscheidung Projektleitung 03.11.2026): das vorgeschlagene Team und seine Qualität.
    const q = e.offer.teamQuality ?? 0;
    return t("event.auftrag.option.annehmenTeam", { people: (e.offer.teamNames ?? []).join(", "), q, mark: q >= e.offer.requirement ? "✓" : "✗" });
  }
  if (option.startsWith("einstellen:") && e.candidates) {
    const c = e.candidates[Number(option.slice("einstellen:".length))];
    return c ? t("event.suche.option.einstellen", { name: c.name, area: t(`area.${c.focus}`), strength: c.strength[c.focus], salary: fmtMoney(c.salaryCent, lang) }) : option;
  }
  return t(`event.${e.kind}.option.${option}`);
}

export function eventTitle(e: EventView, t: T): string {
  if (e.kind === "katalog") return t(`event.katalog.${e.defId}.title`, catalogParams(e));
  if (e.kind === "auftrag" && e.offer) return t("event.auftrag.title", { kind: t(`contract.${e.offer.kind}`) });
  if (e.kind === "bewerbung" && e.applicant) return t("event.bewerbung.title", { name: e.applicant.name });
  return t(`event.${e.kind}.title`, { project: e.projectTitle ?? "", brand: e.brandName ?? "", product: e.productTitle ?? "", person: e.personName ?? "" });
}

export function body(e: EventView, view: ViewModel, t: T, lang: Lang): string {
  switch (e.kind) {
    case "katalog":
      return t(`event.katalog.${e.defId}.body`, catalogParams(e));
    case "gate": {
      // PRD-R22 mit der Abbruch-Prognose aus PRD-R44: nur Restkosten gegen erwarteten Ertrag.
      const o = view.active.find((p) => p.id === e.projectId)?.outlook;
      return t("event.gate.body", { cost: o ? fmtMoney(o.remainingCostCent, lang) : "?", revenue: o ? fmtMoney(o.expectedRevenueCent, lang) : "?" });
    }
    case "prototypReview":
      return e.review
        ? t("event.prototypReview.body", {
          from: t(`feature.${e.review.from}`), to: t(`feature.${e.review.to}`),
          before: fmtScore(e.review.forecastBefore, lang), after: fmtScore(e.review.forecastAfter, lang),
        })
        : t("event.prototypReview.bodyOk");
    case "kritischerBug":
      return t("event.kritischerBug.body", { n: e.extraBugs ?? 0 });
    case "goldReview":
      return t("event.goldReview.body");
    case "releaseDuell":
      return t("event.releaseDuell.body", { studio: e.duelStudio ?? "?" });
    case "schutzEntfernen":
      return t("event.schutzEntfernen.body");
    case "rabattwoche":
      return t("event.rabattwoche.body");
    case "verwertung": {
      const r = e.reissue;
      return r ? t(`event.verwertung.body.${r.kind}`, {
        project: e.projectTitle ?? "", units: fmtInt(r.units, lang), price: fmtMoney(r.priceCent, lang), fee: fmtMoney(r.licenseFeeCent, lang),
        platform: e.platformDeal ? t(`platform.${e.platformDeal.platform}`) : "", n: r.sourceIds.length,
      }) : "";
    }
    case "aboDeal": {
      const d = e.subscription;
      return d ? t("event.aboDeal.body", { project: e.projectTitle ?? "", pay: fmtMoney(d.feeCent, lang), units: fmtInt(d.units, lang) }) : "";
    }
    case "hardwareBundle":
    case "heftBeilage": {
      const d = e.platformDeal;
      return d ? t(`event.${e.kind}.body`, { platform: t(`platform.${d.platform}`), maker: d.maker ? t(`maker.${d.maker}`) : "", pay: fmtMoney(d.payCent, lang), project: e.projectTitle ?? "" }) : "";
    }
    case "anforderungVerpasst":
      return t("event.anforderungVerpasst.body", { feature: t(`feature.${e.featureId ?? ""}`), module: t(`module.${e.module ?? "rendering"}`) });
    case "schwererBug":
    case "serverAusfall":
    case "cheaterWelle":
    case "lootboxDebatte":
    case "datenleck":
    case "ligaAnfrage":
      return t(`event.${e.kind}.body`, { product: e.productTitle ?? "", cost: fmtMoney(e.opsCostCent ?? 0, lang), gap: fmtInt(e.opsGap ?? 0, lang) });
    case "modsKaputt":
      return t("event.modsKaputt.body", { product: e.productTitle ?? "" });
    case "einstellenVorschlag":
      return t("event.einstellenVorschlag.body", { product: e.productTitle ?? "" });
    case "publisherAbbruch":
      return t("event.publisherAbbruch.body", { project: e.projectTitle ?? "" });
    case "gegenangebot":
      return t("event.gegenangebot.body", {
        studio: e.counter?.studio ?? "?", bid: fmtMoney(e.counter?.bidCent ?? 0, lang), counter: fmtMoney(e.counter?.cent ?? 0, lang),
      });
    case "hauptversammlung":
      return t(`event.hauptversammlung.body.${e.stockDemand ?? "sparprogramm"}`);
    case "suche":
      return t("event.suche.body", { n: e.candidates?.length ?? 0 });
    case "merchWahl":
      return t("event.merchWahl.body", { brand: e.brandName ?? "" });
    case "markenjubilaeum":
      return t("event.markenjubilaeum.body", { brand: e.brandName ?? "" });
    case "neubau":
      return t("event.neubau.body", { module: t(`module.${e.module ?? "rendering"}`) });
    case "launchAnfrage":
    case "exklusivdeal": {
      const d = e.platformDeal;
      return d ? t(`event.${e.kind}.body`, { platform: t(`platform.${d.platform}`), maker: t(`maker.${d.maker}`), pay: fmtMoney(d.payCent, lang), project: e.projectTitle ?? "" }) : "";
    }
    case "hardwareUpgrade":
      return e.upgrade ? t(e.upgrade.level === null ? "event.hardwareUpgrade.bodyBroke" : "event.hardwareUpgrade.body", {
        h: Math.round(e.upgrade.factorBp / 100), level: e.upgrade.level ?? 0, cost: fmtMoney(e.upgrade.costCent, lang),
      }) : "";
    case "markenanfrage":
    case "konkursmasse": {
      const d = e.brandDeal;
      if (!d) return "";
      return t(`event.${e.kind}.body`, {
        brand: d.brand, studio: d.studio, price: fmtMoney(d.priceCent, lang), bid: fmtMoney(d.aiBidCent, lang),
        royalty: fmtPct(d.royaltyBp, lang), template: d.template ? t(`brandMarket.template.${d.template}`) : "",
        genres: d.genres.map((g) => t(`genre.${g}`)).join(", "),
      });
    }
    case "abwerbung":
    case "gehaltsforderung":
      return t(`event.${e.kind}.body`, { person: e.personName ?? "", studio: e.poachFrom ?? "", project: e.projectTitle ?? "" });
    case "kooperation":
    case "lizenzanfrage":
    case "grosskunde":
    case "preisschock": {
      const l = e.license;
      if (!l) return "";
      return t(`event.${e.kind}.body`, {
        studio: l.studioName, engine: l.engineName, template: t(`license.template.${l.template}`), royalty: fmtPct(l.terms.royaltyBp, lang),
        flat: fmtMoney(l.terms.flatFeeCent, lang), threshold: fmtMoney(l.terms.royaltyThresholdCent, lang), perYear: fmtMoney(l.perYearCent, lang),
        genre: l.genre ? t(`genre.${l.genre}`) : "",
      });
    }
    case "auftrag":
      return e.offer
        ? t((e.offer.team ?? 1) > 1 ? "event.auftrag.bodyTeam" : "event.auftrag.body", {
          client: t(`client.${e.offer.client}`), weeks: e.offer.weeks, pay: fmtMoney(e.offer.payCent, lang),
          req: e.offer.requirement, area: t(`area.${e.offer.area}`), n: e.offer.team ?? 1,
        })
        : "";
    case "bewerbung": {
      const a = e.applicant;
      if (!a) return "";
      const base = Math.min(...Object.values(a.strength));
      return t("event.bewerbung.body", { area: t(`area.${a.focus}`), focus: a.strength[a.focus], base, salary: fmtMoney(a.salaryCent, lang) });
    }
    case "nachproduktion":
      return e.reorder
        ? t("event.nachproduktion.body", {
          units: e.reorder.units.toLocaleString(lang === "de" ? "de-DE" : "en-US"), cost: fmtMoney(e.reorder.costCent, lang), weeks: e.reorder.leadWeeks,
          expected: e.reorder.expectedUnits.toLocaleString(lang === "de" ? "de-DE" : "en-US"), revenue: fmtMoney(e.reorder.expectedRevenueCent, lang),
        })
        : "";
  }
}

/** Option einer Regel als Text (auch ohne offene Karte, für den Regel-Editor). */
export function ruleOptionLabel(key: string, option: string, t: T): string {
  if (key.startsWith("katalog.")) return t(`event.katalog.${key.slice("katalog.".length)}.option.${option}`);
  if (key === "auftrag" && option === "annehmen") return t("rule.bestPerson");
  return t(`event.${key}.option.${option}`);
}

/** Titel einer Ereignisart für den Regel-Editor. */
export function ruleKeyLabel(key: string, t: T): string {
  if (key.startsWith("katalog.")) return t(`event.katalog.${key.slice("katalog.".length)}.title`, {});
  return t(`event.${key}.short`);
}

export function FocusColumn({ view, sim, t, lang, onSteer }: { view: ViewModel; sim: Sim; t: T; lang: Lang; onSteer?: (projectId: number) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  // Prüfung Fable 03.11.2026: Auftragsangebote stehen mit den Auftragsspielen auf dem Marktplatz (eine Oberfläche).
  const events = view.events.filter((e) => e.kind !== "auftrag");
  const focus = events.find((e) => e.id === selected) ?? events[0];
  const waiting = events.filter((e) => e !== focus);
  return (
    <section className="panel focus" aria-labelledby="focus-title" aria-live="polite">
      <h2 id="focus-title">{t("focus.title")}</h2>
      {!focus && <p className="muted">{t("focus.empty")}</p>}
      {focus && (
        <div className="focus-card">
          <h3><GfxIcon name={iconForEvent(focus.kind)} />{eventTitle(focus, t)}</h3>
          <p>{body(focus, view, t, lang)}</p>
          <div className="focus-options">
            {focus.options.map((o) => (
              <button key={o} type="button" className={o === focus.defaultOption ? "" : "primary"}
                onClick={() => {
                  setSelected(null);
                  sim.input({ type: "decide", eventId: focus.id, option: o });
                  // PRD-R22: „Umsteuern“ am Gate öffnet das Brett zum Umsteuern (PRD-R41).
                  if (focus.kind === "gate" && o === "umsteuern" && focus.projectId !== null) onSteer?.(focus.projectId);
                }}>
                {optionLabel(focus, o, view, t, lang)}
              </button>
            ))}
          </div>
          {focus.suggestRule && (
            <p className="small">
              <button type="button" className="linklike" title={t("rule.suggestHint", { option: ruleOptionLabel(focus.eventKey, focus.suggestRule, t) })}
                onClick={() => {
                  setSelected(null);
                  sim.input({ type: "createRule", eventKey: focus.eventKey, condition: { value: "immer", op: "gleich", number: 0 }, option: focus.suggestRule!, brandId: null, answerEventId: focus.id });
                }}>
                {t("rule.suggest")}
              </button>
            </p>
          )}
          <p className="muted small">
            {t("focus.deadline", { n: Math.max(0, focus.weeksLeft) })} · {t("focus.default", { option: optionLabel(focus, focus.defaultOption, view, t, lang) })}
          </p>
        </div>
      )}
      {waiting.length > 0 && (
        <>
          <h3>{t("focus.waiting", { n: waiting.length })}</h3>
          <ul className="waiting">
            {waiting.map((e) => (
              <li key={e.id}><button type="button" className="linklike" onClick={() => setSelected(e.id)}><GfxIcon name={iconForEvent(e.kind)} />{eventTitle(e, t)}</button></li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function logText(l: ViewModel["log"][number], t: T, lang: Lang): string {
  const p = l.params;
  const params: Record<string, string | number> = { ...p };
  if ((l.key === "log.info" || l.key === "chronicle.info") && typeof p.id === "string") return t(`event.katalog.${p.id}.title`);
  // ZIE-R01, ZIE-R06: Meilensteine und Ziele.
  if (l.key === "log.milestone" && typeof p.id === "string") params.id = t(`milestone.${p.id}`);
  if (l.key.startsWith("log.hostile") && p.raider === "") params.raider = t("hostile.fund");
  if (l.key === "log.profitShare" && typeof p.share === "number") params.share = `${p.share / 100} %`;
  if (l.key === "log.buyback" && typeof p.share === "number") params.share = `${p.share / 100} %`;
  if (l.key === "log.moduleLicense" && typeof p.module === "string") params.module = t(`module.${p.module}`);
  // Prüfung Fable 03.11.2026: Jahresziele und Epochen-Fragen.
  if (l.key.startsWith("log.annual") && typeof p.id === "string") params.id = t(`annual.name.${p.id}`);
  if (l.key.startsWith("log.epoch") && typeof p.id === "string") {
    params.title = t(`epoch.${p.id}.title${p.tier ?? 0}`);
    params.id = t(`epoch.${p.id}.question`);
  }
  // Endgame-Themen: Herausforderungen.
  if (l.key.startsWith("log.challenge") && typeof p.id === "string") params.id = t(`challenge.${p.id}.title`);
  if (l.key === "log.challengeDone" && typeof p.points === "number") params.points = p.points / 100;
  if (l.key.startsWith("log.scenario") && typeof p.id === "string") params.id = t(`scenario.${p.id}`);
  // MRK-R57, MRK-R68: Wendepunkte der Zukunftsepoche.
  if (l.key.startsWith("log.future") && typeof p.id === "string") params.id = t(`future.${p.id}`);
  if (l.key === "log.gameEnd" && typeof p.why === "string") params.why = t(`ending.reason.${p.why}`);
  // ZIE-R03: Branchenpreise.
  if (l.key.startsWith("log.award") && typeof p.category === "string") params.category = t(`award.${p.category}`);
  if ((l.key === "log.goalReached" || l.key === "log.goalFailed") && typeof p.id === "string") params.id = t(`goal.${p.id}`);
  if (typeof p.platform === "string") params.platform = t(`platform.${p.platform}`);
  if (typeof p.maker === "string") params.maker = t(`maker.${p.maker}`);
  if (typeof p.system === "string") params.system = t(`unlock.${p.system}`);
  if (typeof p.client === "string") params.client = t(`client.${p.client}`);
  if (typeof p.kind === "string") params.kind = l.key === "log.expired" ? t(`event.${p.kind}.short`) : t(`contract.${p.kind}`);
  if (typeof p.office === "string") params.office = t(`office.${p.office}`);
  if (typeof p.room === "string") params.room = t(`room.${p.room}`);
  if (typeof p.module === "string") params.module = t(`module.${p.module}`);
  if (typeof p.vendor === "string") params.vendor = t(`vendor.${p.vendor}`);
  if (typeof p.feature === "string") params.feature = t(`feature.${p.feature}`);
  if (typeof p.pay === "number") params.pay = fmtMoney(p.pay, lang);
  if (typeof p.amount === "number") params.amount = fmtMoney(p.amount, lang);
  if (typeof p.cost === "number") params.cost = fmtMoney(p.cost, lang);
  if (typeof p.e === "number") params.e = fmtFactor(p.e, lang);
  if (typeof p.form === "string") params.form = t(`type.${p.form}`);
  if (typeof p.revenue === "number") params.revenue = fmtMoney(p.revenue, lang);
  if (typeof p.price === "number") params.price = fmtMoney(p.price, lang);
  if (typeof p.show === "string") params.show = t(`fair.${p.show}`);
  if (typeof p.phase === "string") params.phase = t(`marketPhase.${p.phase}`);
  if (typeof p.region === "string") params.region = t(`region.${p.region}`);
  if (typeof p.finding === "string") params.finding = t(`acq.finding.${p.finding}`);
  // S04 Abschnitt 13: Ein leerer Name im Markenmarkt ist das eigene Studio.
  for (const k of ["owner", "licensee", "buyer"]) if (p[k] === "") params[k] = t("brandMarket.you");
  if (typeof p.units === "number") params.units = p.units.toLocaleString(lang === "de" ? "de-DE" : "en-US");
  if (typeof p.score === "number") params.score = fmtScore(p.score, lang);
  if (typeof p.from === "string") params.from = t(`feature.${p.from}`);
  if (typeof p.to === "string") params.to = t(`feature.${p.to}`);
  if (typeof p.option === "string") {
    // Texte der Optionen stehen je Ereignis (event.<art>.option.<option>); event.option.<option> nur als Rückfall.
    const specific = typeof p.def === "string" ? `event.katalog.${p.def}.option.${p.option}` : typeof p.kind === "string" ? `event.${p.kind}.option.${p.option}` : null;
    const text = specific ? t(specific) : specific;
    params.option = text !== null && text !== specific ? text : t(`event.option.${p.option}`);
  }
  if (typeof p.reason === "string") params.reason = t(p.reason);
  if (typeof p.template === "string") params.template = t(`license.template.${p.template}`);
  if (typeof p.royalty === "number") params.royalty = fmtPct(p.royalty, lang);
  if (typeof p.genre === "string") params.genre = t(`genre.${p.genre}`);
  if (typeof p.card === "string") {
    params.card = ruleKeyLabel(p.card, t);
    if (typeof p.choice === "string") params.choice = ruleOptionLabel(p.card, p.choice, t);
  }
  if (typeof p.area === "string") params.area = t(`area.${p.area}`);
  if (typeof p.theme === "string") params.theme = t(`theme.${p.theme}`);
  if (typeof p.goal === "string") params.goal = t(`rival.goal.${p.goal}`);
  if (typeof p.mood === "string") params.mood = t(`rival.mood.${p.mood}`);
  return t(l.key, params);
}

export function ReportLog({ view, t, lang }: { view: ViewModel; t: T; lang: Lang }) {
  return (
    <section className="panel" aria-labelledby="log-title">
      <h2 id="log-title">{t("log.title")}</h2>
      {view.log.length === 0 ? <p className="muted">{t("log.empty")}</p> : (
        <ul className="log log-box" tabIndex={0} aria-labelledby="log-title">
          {view.log.map((l, i) => <li key={`${l.week}-${i}`}><span className="muted small">{t("log.week", { n: l.date.weekOfYear + 1, year: l.date.year })}</span> <GfxIcon name={iconForLog(l.key)} />{logText(l, t, lang)}</li>)}
        </ul>
      )}
    </section>
  );
}
