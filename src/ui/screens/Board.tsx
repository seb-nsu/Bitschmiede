// Design-Brett für ein neues Projekt (S02 Abschnitt 8, PRD-R13, PRD-R14, PRD-R18) mit Wahl der Personen (Konzept 0b, 3.1).
import { useEffect, useState } from "react";
import type { EngineId, LicenseTemplateId, Scope } from "../../sim/model/types";
import type { BoardDraft, BoardPreview, ContractGameOfferView, ProjectView, ViewModel } from "../../sim/view/view";
import type { Sim } from "../useSim";
import { fmtFactor, fmtInt, fmtMoney, fmtPct, fmtScore } from "../format";
import type { Lang, T } from "../texts";
import { HelpLink } from "./Handbook";
import { ProfileBars } from "../viz";
import { Icon } from "../icons";

const AREA_ORDER = ["gameplay", "grafik", "sound", "story", "technik"] as const;

/** 4b.4: Genre und Thema als Kacheln mit Symbol und Trend statt Auswahlliste. */
function TilePicker({ legend, kind, items, value, disabled, onPick, t, lang }: {
  legend: string; kind: "genre" | "theme"; items: { id: string; trendBp: number }[]; value: string; disabled: boolean;
  onPick: (id: string) => void; t: T; lang: Lang;
}) {
  const sorted = [...items].sort((a, b) => t(`${kind}.${a.id}`).localeCompare(t(`${kind}.${b.id}`), lang));
  return (
    <fieldset className={`tiles-pick tiles-${kind}`} disabled={disabled}>
      <legend>{legend}</legend>
      {sorted.map((x) => {
        const trend = trendKey(x.trendBp);
        return (
          <label key={x.id} className={`tile-pick${x.id === value ? " on" : ""}`} title={`${t(`${kind}.${x.id}`)} · ${t(trend)}`}>
            <input type="radio" name={`pick-${kind}`} checked={x.id === value} onChange={() => onPick(x.id)} />
            <Icon kind={kind} id={x.id} size="1.4em" />
            <span>{t(`${kind}.${x.id}`)}</span>
            <span className={`tile-trend ${trend.slice(11)}`} aria-label={t(trend)}>{trend === "form.trend.up" ? "▲" : trend === "form.trend.down" ? "▼" : ""}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

function trendKey(bp: number): string {
  return bp > 10500 ? "form.trend.up" : bp < 9500 ? "form.trend.down" : "form.trend.flat";
}

/** Vorauswahl: nur freie Personen; wer schon an einem Projekt arbeitet, wird nicht stillschweigend abgezogen. */
function defaultPeople(view: ViewModel): number[] {
  return view.people.filter((p) => p.assignment === null).map((p) => p.id);
}

/** Vorauswahl der Plattformen: die des letzten Spiels, soweit noch im Handel; sonst die mit der größten Basis. */
function defaultPlatforms(view: ViewModel, last: string[] | undefined): string[] {
  const active = new Set(view.catalog.platforms.map((p) => p.id));
  const kept = (last ?? []).filter((id) => active.has(id));
  return kept.length > 0 ? kept : view.catalog.platforms.slice(0, 1).map((p) => p.id);
}

function initialDraft(view: ViewModel): BoardDraft {
  const last = view.products[0];
  const people = defaultPeople(view);
  const platforms = defaultPlatforms(view, last?.platforms);
  return last
    ? { genre: last.genre, subgenre: last.subgenre, theme: last.theme, scope: last.scope, features: [...last.features], people, platforms, audience: last.audience, pillars: [...last.pillars] }
    : { ...view.catalog.firstProject, people }; // PRD-R14: auch die Plattform ist vorgewählt
}

/** Etappe 6c.3: Auftragsspiel: Genre, Umfang, Plattform und gegebenenfalls Thema stehen fest. */
function offerDraft(view: ViewModel, o: ContractGameOfferView): BoardDraft {
  const base = initialDraft(view);
  return {
    ...base, genre: o.genre, subgenre: null, theme: o.theme ?? base.theme, scope: o.scope, features: base.features.slice(0, view.catalog.slots[o.scope]),
    platforms: [o.platform], productType: "standard", sourceId: null, brandId: null, ordered: [], contractOfferId: o.id,
    ...(o.audience !== null ? { audience: o.audience } : {}),
  };
}

/** PRD-R41: Umsteuern: Inhalt des laufenden Projekts; Thema, Typ und Personen bleiben. */
function steerDraft(p: ProjectView): BoardDraft {
  return { genre: p.genre, subgenre: p.subgenre, theme: p.theme, scope: p.scope, features: [...p.features], people: [...p.people], platforms: [...p.platforms], steerProjectId: p.id };
}

export function Board({ view, sim, t, lang, onClose, steer, offer }: { view: ViewModel; sim: Sim; t: T; lang: Lang; onClose: (() => void) | null; steer?: ProjectView; offer?: ContractGameOfferView }) {
  const [draft, setDraft] = useState<BoardDraft>(() => (steer ? steerDraft(steer) : offer ? offerDraft(view, offer) : initialDraft(view)));
  const [title, setTitle] = useState(() => t("form.defaultName", { n: view.products.length + view.active.length + 1 }));
  const [preview, setPreview] = useState<BoardPreview | null>(null);
  const { preview: queryPreview } = sim;

  useEffect(() => {
    let current = true;
    void queryPreview(draft).then((p) => {
      if (current) setPreview(p);
    });
    return () => {
      current = false;
    };
  }, [draft, queryPreview, view.week]);

  const slots = view.catalog.slots[draft.scope];
  const subgenres = view.catalog.subgenres.filter((sg) => sg.genre === draft.genre);
  const subgenre = subgenres.find((sg) => sg.id === draft.subgenre);

  // PRD-R12: Eine gesperrte, aber bestellbare Karte wird mit der Wahl beim Engine-Team bestellt.
  const lockedMap = new Map((preview?.locked ?? []).map((l) => [l.id, l]));
  const toggle = (id: string) =>
    setDraft((d) => {
      const ordered = d.ordered ?? [];
      if (d.features.includes(id)) return { ...d, features: d.features.filter((f) => f !== id), ordered: ordered.filter((f) => f !== id) };
      if (d.features.length >= slots) return d;
      return { ...d, features: [...d.features, id], ordered: lockedMap.has(id) ? [...ordered, id] : ordered };
    });
  const setScope = (scope: Scope) =>
    setDraft((d) => {
      const features = d.features.slice(0, view.catalog.slots[scope]);
      return { ...d, scope, features, ordered: (d.ordered ?? []).filter((f) => features.includes(f)) };
    });

  const togglePlatform = (id: string) =>
    setDraft((d) => ({ ...d, platforms: d.platforms.includes(id) ? d.platforms.filter((x) => x !== id) : [...d.platforms, id] }));

  const togglePerson = (id: number) =>
    setDraft((d) => ({ ...d, people: d.people.includes(id) ? d.people.filter((x) => x !== id) : [...d.people, id].sort((a, b) => a - b) }));

  // PRD-R01: Produkttyp. Port, Technik-Update und Remaster übernehmen den Inhalt der Vorlage, Addon Genre und Thema.
  const productType = draft.productType ?? "standard";
  const sourceId = draft.sourceId ?? view.products[0]?.id ?? null;
  const source = view.products.find((p) => p.id === sourceId);
  const typeDef = view.catalog.productTypes.find((x) => x.id === productType);
  const licensedChoice = draft.engine?.startsWith("lizenz:") ? view.catalog.engines.find((x) => x.id === draft.engine) : undefined;
  const types = view.catalog.productTypes.filter((x) => !x.needsNewerEngine || view.engine !== null);
  const chooseType = (type: string, src: number | null) => {
    const def = view.catalog.productTypes.find((x) => x.id === type)!;
    const s = view.products.find((p) => p.id === src);
    const base = { productType: type, sourceId: def.requiresSource ? src : null, ordered: [] as string[] };
    // BTR-R15: MMO, Live-Service und F2P sind neue Spiele ohne Vorlage.
    if (!s || !def.requiresSource) return setDraft((d) => ({ ...d, ...base }));
    const active = s.platforms.filter((id) => view.catalog.platforms.some((pf) => pf.id === id));
    if (def.sameContent) {
      const free = view.catalog.platforms.find((pf) => !s.platforms.includes(pf.id));
      // ANNAHME (Simulation): Ein Technik-Update erscheint auf den Plattformen der Vorlage.
      const platforms = def.requiresNewPlatform ? (free ? [free.id] : []) : def.patch ? [...s.platforms] : active;
      setDraft((d) => ({ ...d, ...base, genre: s.genre, subgenre: s.subgenre, theme: s.theme, scope: s.scope, features: [...s.features], platforms, engine: def.needsNewerEngine ? "eigen" : d.engine }));
    } else {
      const scope = def.fixedScope ?? s.scope;
      setDraft((d) => ({ ...d, ...base, genre: s.genre, subgenre: s.subgenre, theme: s.theme, scope, features: d.features.slice(0, view.catalog.slots[scope]), platforms: active }));
    }
  };
  const locked = typeDef?.sameContent ?? false;
  const needsSource = typeDef?.requiresSource ?? false;
  const fixed = needsSource || offer !== undefined;

  const submit = () => {
    if (steer) {
      sim.input({ type: "steerProject", projectId: steer.id, genre: draft.genre, scope: draft.scope, features: draft.features, platforms: draft.platforms });
      onClose?.();
      return;
    }
    sim.input({
      type: "createProject", title: title.trim() || t("form.defaultName", { n: view.products.length + view.active.length + 1 }), ...draft,
      productType, sourceId: needsSource ? sourceId : null,
      brandId: needsSource ? undefined : draft.brandId ?? null,
    });
    onClose?.();
  };

  return (
    <section className="panel board" aria-labelledby="board-title">
      <div className="studio-head">
        <h2 id="board-title">{steer ? t("form.steerTitle", { project: steer.title }) : t("form.title")}</h2>
        {onClose && <button type="button" onClick={onClose}>{t("form.cancel")}</button>}
      </div>
      {view.products.length === 0 && !steer && <p className="hint">{t("form.firstHint")}</p>}
      {steer && <p className="hint">{t("form.steerHint")}</p>}
      {offer && (
        <p className="hint">{t("form.contractGameHint", {
          client: offer.client, score: fmtScore(offer.minScoreBp, lang), weeks: offer.weeks, platform: t(`platform.${offer.platform}`),
        })}</p>
      )}
      {view.products.length > 0 && !steer && !offer && (
        <fieldset className="scope">
          <legend>{t("form.type")}</legend>
          {types.map(({ id: ty }) => (
            <label key={ty} title={t(`type.${ty}.hint`)}>
              <input type="radio" name="ptype" checked={productType === ty} onChange={() => chooseType(ty, sourceId)} /> {t(`type.${ty}`)}
            </label>
          ))}
          {needsSource && (
            <select value={sourceId ?? ""} onChange={(e) => chooseType(productType, Number(e.target.value))} aria-label={t("form.source")}>
              {view.products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}
        </fieldset>
      )}
      {productType !== "standard" && (source || !needsSource) && <p className="hint">{t(`type.${productType}.hint`)}</p>}
      <div className="board-concept">
        {!steer && (
          <label>
            {t("form.name")}
            <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
          </label>
        )}
        <TilePicker legend={t("form.genre")} kind="genre" value={draft.genre} disabled={fixed} t={t} lang={lang}
          items={view.catalog.genres} onPick={(id) => setDraft((d) => ({ ...d, genre: id, subgenre: null }))} />
        {/* Prüfung Fable 03.11.2026: Untergenre erst nach dem ersten Release, damit das erste Brett schlank bleibt. */}
        {(view.products.length > 0 || draft.subgenre) && <label>
          {t("form.subgenre")}
          <select value={draft.subgenre ?? ""} disabled={fixed || steer !== undefined} onChange={(e) => setDraft((d) => ({ ...d, subgenre: e.target.value || null }))}>
            <option value="">{t("form.noSubgenre")}</option>
            {subgenres.map((sg) => (
              <option key={sg.id} value={sg.id} disabled={!sg.available}>
                {sg.available ? t(`subgenre.${sg.id}`) : t("form.subgenreFrom", { name: t(`subgenre.${sg.id}`), year: sg.fromYear })}
              </option>
            ))}
          </select>
          {subgenre && <small className="muted">{t("form.subgenreThemes", { themes: subgenre.bonusThemes.map((id) => t(`theme.${id}`)).join(", ") })}</small>}
        </label>}
        <TilePicker legend={t("form.theme")} kind="theme" value={draft.theme} disabled={needsSource || (offer?.theme ?? null) !== null || steer !== undefined} t={t} lang={lang}
          items={view.catalog.themes} onPick={(id) => setDraft((d) => ({ ...d, theme: id }))} />
        <fieldset className="scope">
          <legend>{t("form.scope")} <HelpLink id="umfang" t={t} /></legend>
          {view.catalog.scopes.map((s) => (
            <label key={s} title={t(`scope.${s}.hint`)}>
              <input type="radio" name="scope" checked={draft.scope === s} disabled={fixed} onChange={() => setScope(s)} /> {t(`scope.${s}`)}
            </label>
          ))}
        </fieldset>
        {/* Prüfung Fable 03.11.2026: Zielgruppe ab dem zweiten Release, Design-Säulen mit wachsender Firma. */}
        {!steer && view.unlocks.includes("zielgruppe") && (
          <fieldset className="scope">
            <legend>{t("form.audience")} <HelpLink id="passung" t={t} /></legend>
            {view.catalog.audiences.map((a) => {
              const tooOld = (preview?.ageRating ?? 0) > a.maxRating;
              return (
                <label key={a.id} title={tooOld ? t("error.audienceRating") : t(`audience.${a.id}.hint`)}>
                  <input type="radio" name="audience" checked={(draft.audience ?? view.catalog.defaultAudience) === a.id}
                    disabled={needsSource || (offer?.audience ?? null) !== null || tooOld}
                    onChange={() => setDraft((d) => ({ ...d, audience: a.id }))} /> {t(`audience.${a.id}`)}
                </label>
              );
            })}
            {preview && (
              <small className="muted">
                {t("form.audienceEffect", {
                  demand: fmtFactor(preview.audience.demandBp, lang), fit: fmtFactor(preview.audience.genreFitBp, lang), loyalty: fmtFactor(preview.audience.decayBp, lang),
                  expectation: fmtFactor(preview.audience.expectationBp, lang), fans: fmtFactor(preview.audience.fansBp, lang),
                })}
              </small>
            )}
          </fieldset>
        )}
        {!steer && view.unlocks.includes("saeulen") && (
          <fieldset className="scope pillars">
            <legend>{t("form.pillars", { n: view.catalog.maxPillars })} <HelpLink id="saeulen" t={t} /></legend>
            {view.catalog.pillars.map((pl) => {
              const on = (draft.pillars ?? []).includes(pl.id);
              const full = !on && (draft.pillars ?? []).length >= view.catalog.maxPillars;
              const w = pl.genreWeightBp[draft.genre] ?? 10000;
              const effect = preview?.quality?.pillars.find((e) => e.id === pl.id);
              return (
                <label key={pl.id} title={t(`pillar.${pl.id}.hint`)}>
                  <input type="checkbox" checked={on} disabled={needsSource || full}
                    onChange={() => setDraft((d) => {
                      const cur = d.pillars ?? [];
                      return { ...d, pillars: cur.includes(pl.id) ? cur.filter((x) => x !== pl.id) : [...cur, pl.id] };
                    })} /> {t(`pillar.${pl.id}`)}
                  {w >= 11000 ? <span className="pillar-up" title={t("form.pillarPressLikes")}> ▲</span> : w <= 9000 ? <span className="pillar-down" title={t("form.pillarPressDislikes")}> ▼</span> : null}
                  {effect && (
                    <small className={effect.bp < 0 ? "pillar-down" : "pillar-up"}>
                      {" "}{t(effect.bp < 0 ? "form.pillarMiss" : "form.pillarEffect", { share: fmtPct(effect.shareBp, lang), bonus: `${effect.bp >= 0 ? "+" : "−"}${fmtPct(Math.abs(effect.bp), lang)}` })}
                    </small>
                  )}
                </label>
              );
            })}
          </fieldset>
        )}
        {!steer && (view.engine || view.catalog.engines.length > 1) && !(typeDef?.engineSource === "source") && !typeDef?.needsNewerEngine && (
          <label>
            {t("form.engine")}
            <select value={draft.engine ?? (view.engine ? "eigen" : "starter")}
              onChange={(e) => setDraft((d) => ({ ...d, engine: e.target.value as EngineId, licenseTemplate: undefined, ordered: [] }))}>
              {view.catalog.engines.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.id === "eigen" ? t("form.engineOwn", { name: view.engine!.name, major: view.engine!.major, minor: view.engine!.minor })
                    : x.id === "starter" ? t("form.engineStarter") : t("form.engineLicensed", { name: x.name ?? "?" })}
                </option>
              ))}
            </select>
          </label>
        )}
        {!steer && view.engine && view.engine.behind.length > 0 && (draft.engine ?? "eigen") === "eigen" && !(typeDef?.engineSource === "source") && (
          // Abschluss 1.0: Engine-Hinweis schon bei der Planung, nicht erst im Jahresbericht.
          <p className="hint small" role="status">
            {t("form.engineBehind", { modules: view.engine.behind.map((b) => t("engine.behindModule", { module: t(`module.${b.module}`), level: b.level, art: b.art })).join(", ") })}
          </p>
        )}
        {!steer && licensedChoice && (
          <label title={t("form.licenseHint")}>
            {t("form.licenseTemplate")}
            <select value={draft.licenseTemplate ?? licensedChoice.contractTemplate ?? (licensedChoice.templates?.includes("standard") ? "standard" : licensedChoice.templates?.[0] ?? "")}
              disabled={licensedChoice.contractTemplate != null}
              onChange={(e) => setDraft((d) => ({ ...d, licenseTemplate: e.target.value as LicenseTemplateId }))}>
              {(licensedChoice.templates ?? []).map((id) => {
                const m = view.licensing.market.find((x) => x.engineId === licensedChoice.id)?.templates.find((x) => x.id === id);
                return (
                  <option key={id} value={id}>
                    {t(`license.template.${id}`)}{m ? ` · ${t("license.termsShort", { royalty: fmtPct(m.terms.royaltyBp, lang), flat: fmtMoney(m.terms.flatFeeCent, lang) })}` : ""}
                  </option>
                );
              })}
            </select>
          </label>
        )}
        {!steer && view.engine && (draft.engine ?? "eigen") === "eigen" && !(typeDef?.engineSource === "source") && (
          <label title={t(`binding.${draft.binding ?? (draft.scope === "klein" ? "fest" : "mitlaufend")}.hint`)}>
            {t("form.binding")}
            <select value={draft.binding ?? ""} onChange={(e) => setDraft((d) => ({ ...d, binding: e.target.value === "" ? undefined : e.target.value as "fest" | "mitlaufend" }))}>
              <option value="">{t("form.bindingDefault")}</option>
              <option value="fest">{t("binding.fest")}</option>
              <option value="mitlaufend">{t("binding.mitlaufend")}</option>
            </select>
          </label>
        )}
        {!steer && !needsSource && !offer && (view.brands.length > 0 || view.brandMarket.licenses.length > 0) && (
          <label>
            {t("form.brand")}
            <select value={draft.brandId ?? ""} onChange={(e) => setDraft((d) => ({ ...d, brandId: e.target.value === "" ? null : Number(e.target.value) }))}>
              <option value="">{t("form.brandNew")}</option>
              {view.brands.map((b) => <option key={b.id} value={b.id}>{b.name}{b.pauseWeeks > 0 ? ` (${t("brand.tired")})` : ""}</option>)}
              {/* LIZ-M09: lizenzierte fremde Marken, nur im Genre der Lizenz. */}
              {view.brandMarket.licenses.filter((l) => l.genres.includes(draft.genre) && l.gamesMade < l.gamesAllowed).map((l) => (
                <option key={`l${l.id}`} value={l.brandId}>{t("form.brandLicensed", { brand: l.brand })}</option>
              ))}
            </select>
            {preview && preview.brandFans > 0 && <small className="muted">{t("form.brandFans", { n: fmtInt(preview.brandFans, lang) })}</small>}
          </label>
        )}
      </div>

      <fieldset className="people-pick">
        <legend>{t("form.platforms")}</legend>
        {view.catalog.platforms.map((p) => (
          <label key={p.id}>
            <input type="checkbox" checked={draft.platforms.includes(p.id)} onChange={() => togglePlatform(p.id)} />{" "}
            <Icon kind="platform" id={p.type} /> <strong>{t(`platform.${p.id}`)}</strong>
            {draft.platforms[0] === p.id && <span className="badge"> {t("form.lead")}</span>}{" "}
            <span className="muted small">
              {t(`platformType.${p.type}`)} · {t("form.base", { n: fmtInt(Math.round(p.base / 100000) / 10, lang) })} · {t(`medium.${p.medium}`)}
              {p.licenseFeeBp > 0 && <> · {t("form.fee", { pct: fmtPct(p.licenseFeeBp, lang) })}</>}
              {p.certification && <> · {t("form.cert")}</>}
              {p.launchYear !== null
                ? <>{" · "}{t("form.devkit", { year: p.launchYear, lo: p.budgetLo, hi: p.budgetHi })}</>
                : <>{" · "}{t("form.budget", { n: p.budget })}</>}
            </span>
          </label>
        ))}
        {draft.platforms.length > 1 && <p className="muted small">{t("form.extraPlatforms")}</p>}
      </fieldset>

      {!steer && <fieldset className="people-pick">
        <legend>{t("form.people")}</legend>
        {view.people.map((p) => {
          const onContract = p.assignment?.kind === "contract";
          const busy = p.assignment?.kind === "project" ? view.active.find((x) => x.id === p.assignment!.id)?.title : undefined;
          return (
            <label key={p.id} className={onContract ? "muted" : ""}>
              <input type="checkbox" checked={draft.people.includes(p.id)} disabled={onContract} onChange={() => togglePerson(p.id)} />{" "}
              {p.name} <span className="muted small">({t(`area.${p.bestArea}`)} {p.strength[p.bestArea]})</span>
              {onContract && <span className="small"> · {t("team.onContract")}</span>}
              {busy && <span className="small"> · {t("form.personBusy", { project: busy })}</span>}
            </label>
          );
        })}
      </fieldset>}

      <h3>
        {t("form.features")} <span className="muted">{t("form.slots", { n: draft.features.length, max: slots })}</span>
      </h3>
      {/* Playtest-Rückmeldung: Warum nur so viele Karten, und was zählt bei der Wahl. */}
      <p className="small muted">{t("form.slotsHint", { klein: view.catalog.slots.klein, mittel: view.catalog.slots.mittel })}</p>
      <div className="cards">
        {AREA_ORDER.filter((area) => view.products.length > 0 || view.catalog.firstProjectAreas.includes(area)).map((area) => (
          <div className="card-row" key={area}>
            <span className="card-row-label"><Icon kind="area" id={area} /> {t(`area.${area}`)}</span>
            <div className="card-row-cards">
              {view.catalog.features.filter((f) => f.area === area && f.available).map((f) => {
                const selected = draft.features.includes(f.id);
                const full = !selected && draft.features.length >= slots;
                const scaled = Math.round(f.effortByScope[draft.scope] / 10000);
                const lock = lockedMap.get(f.id);
                const blocked = lock !== undefined && lock.orderBlocked !== null && !selected;
                const cost = preview?.cardCost[f.id];
                // Passung: Ändert die Karte die Abweichung vom Genre-Profil um mehr als einen Prozentpunkt?
                const fit = preview?.cardFit[f.id] ?? 0;
                const fitClass = fit > 100 ? "fit-up" : fit < -100 ? "fit-down" : "";
                return (
                  <button
                    key={f.id} type="button" className={`card ${selected ? "card-on" : ""} ${lock ? "card-locked" : ""}`} aria-pressed={selected}
                    disabled={full || locked || blocked} onClick={() => toggle(f.id)}
                    title={cardInfo(f, preview, lock ? t(lock.orderBlocked === null ? "form.card.orderHint" : lock.orderBlocked) : null, t)}
                  >
                    <strong>{t(`feature.${f.id}`)}</strong>
                    {fitClass && <span className={`card-fit ${fitClass}`}>{t(fit > 0 ? (selected ? "form.card.fitHelps" : "form.card.fitUp") : (selected ? "form.card.fitHurts" : "form.card.fitDown"))}</span>}
                    <span className="card-meta">
                      {t("form.card.value", { n: Math.round(f.agedValue / 10000) })}
                      {f.outdated && <span className="age"> {t("form.card.outdated")}</span>} · {t("form.card.effort", { n: scaled })}
                      {f.contentLevel >= 2 && <span className="age"> · {t("form.ageRating", { n: f.contentLevel })}</span>}
                    </span>
                    <span className="card-meta">
                      {cost !== undefined && t("form.card.cost", { n: Math.round(cost / 100) })}
                      {lock && <span className="age"> · {t(lock.orderBlocked === null ? "form.card.order" : "form.card.needs", { module: t(`module.${lock.need.module}`), level: lock.need.level })}</span>}
                    </span>
                    <span className="tags">
                      {f.tags.map((tag) => <span key={tag} className="tag">{t(`tag.${tag}`)}</span>)}
                      {/* Etappe 6c.5: Karte trägt eine gewählte Design-Säule. */}
                      {view.catalog.pillars.filter((pl) => (draft.pillars ?? []).includes(pl.id) && pl.cards.includes(f.id)).map((pl) => (
                        <span key={pl.id} className="tag tag-pillar">◆ {t(`pillar.${pl.id}`)}</span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div className="board-preview">
          <h3>{t("form.profile", { genre: t(`genre.${draft.genre}`) })}</h3>
          <ProfileBars actual={preview.profileActual} expected={preview.profileExpected} t={t} lang={lang} />
          <p className="muted">
            {t("form.deviation", { value: fmtPct(preview.deviationBp, lang) })} · {t("form.ageRating", { n: preview.ageRating })}
          </p>
          <p className="muted small">
            {t("form.teamStrength")}: {AREA_ORDER.map((a) => `${t(`area.${a}`)} ${preview.bestStrength[a]}`).join(" · ")} <HelpLink id="team" t={t} />
          </p>
          <p className="muted small">{t("form.engineFactor", { e: fmtFactor(preview.engineFactorBp, lang) })} <HelpLink id="engine" t={t} /></p>
          {preview.quality && <QualityWaterfall q={preview.quality} t={t} lang={lang} />}
          {preview.versions.map((v) => (
            <div key={v.platform} className="small budget-row">
              <span>{t(`platform.${v.platform}`)}</span>{" "}
              <span className="meter" title={`${Math.round(v.used / 100)} / ${Math.round(v.budget / 100)}`}>
                <span style={{ width: `${Math.min(100, v.budget > 0 ? (v.used / v.budget) * 100 : 100)}%` }} className={v.weak ? "meter-bad" : ""} />
              </span>{" "}
              {t("form.budgetUse", { used: Math.round(v.used / 100), budget: Math.round(v.budget / 100) })}
              {v.dropped.length > 0 && (
                <span className={v.weak ? "error" : "muted"}> · {t(v.weak ? "form.versionWeak" : "form.versionCut", {
                  pct: fmtPct(v.shareBp, lang), features: v.dropped.map((f) => t(`feature.${f}`)).join(", "),
                })}</span>
              )}
            </div>
          ))}
          {(draft.ordered ?? []).length > 0 && <p className="small">{t("form.ordered", { features: (draft.ordered ?? []).map((f) => t(`feature.${f}`)).join(", ") })}</p>}
          {preview.steer && <p>{t("form.steerKept", { pct: fmtPct(preview.steer.keptBp, lang) })}</p>}
          <p>{t("form.estimate", { weeks: fmtInt(preview.weeks, lang), cost: fmtMoney(preview.costCent, lang) })}</p>
          {preview.costCent + preview.printRunCostCent > preview.fundsCent && (
            <p className="error">{t("form.fundsWarning", { funds: fmtMoney(preview.fundsCent, lang), need: fmtMoney(preview.costCent + preview.printRunCostCent, lang) })}</p>
          )}
          {preview.printRun > 0 && !steer && (
            <p className={preview.printRunCostCent > view.moneyCent ? "error" : "muted small"}>
              {t("form.printRun", { units: fmtInt(preview.printRun, lang), cost: fmtMoney(preview.printRunCostCent, lang) })}
            </p>
          )}
          {preview.error && preview.error !== "error.featureCount" && <p className="error">{t(preview.error)}</p>}
          <button type="button" className="primary" disabled={preview.error !== null} data-guide="start" onClick={submit}>{steer ? t("form.steer") : t("form.start")}</button>
        </div>
      )}
    </section>
  );
}

type CatalogFeature = ViewModel["catalog"]["features"][number];

/** Durchschaubarkeit (Spieltest 02.11.2026): Karten-Info mit Engine-Stufe, Aufwand je Bereich, Tags und Synergien. */
function cardInfo(f: CatalogFeature, preview: BoardPreview | null, lockText: string | null, t: T): string {
  const lines: string[] = [];
  if (lockText) lines.push(lockText);
  if (f.requires && f.requires.level > 0) {
    const own = preview?.engineLevels[f.requires.module] ?? 0;
    lines.push(t("form.info.engine", { module: t(`module.${f.requires.module}`), level: f.requires.level, own }));
  } else lines.push(t("form.info.noEngine"));
  const total = Object.values(f.effort).reduce((a, b) => a + b, 0);
  if (total > 0) {
    const parts = (Object.entries(f.effort) as [string, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
      .map(([a, v]) => `${t(`area.${a}`)} ${Math.round((v * 100) / total)} %`);
    lines.push(t("form.info.effort", { list: parts.join(", ") }));
  }
  lines.push(t("form.info.value", { value: Math.round(f.agedValue / 10000), innovation: Math.round(f.innovation / 10000), perf: f.performanceCost }));
  if (f.tags.length > 0) lines.push(t("form.info.tags", { list: f.tags.map((x) => t(`tag.${x}`)).join(", ") }));
  for (const h of preview?.cardSynergy[f.id] ?? []) {
    const other = h.a === f.id ? h.b : h.a;
    lines.push(t(h.bp >= 0 ? "form.info.synergyUp" : "form.info.synergyDown", {
      feature: t(`feature.${other}`), tags: `${t(`tag.${h.tag}`)} + ${t(`tag.${h.otherTag}`)}`, pct: `${h.bp >= 0 ? "+" : ""}${Math.round(h.bp / 100)} %`,
    }));
  }
  return lines.join("\n");
}

/** PRD-R50 als Vorschau im Brett: Kartenwert × Team × Synergie × Profil × Engine; Thema nur, was das Wissensbuch weiß. */
function QualityWaterfall({ q, t, lang }: { q: NonNullable<BoardPreview["quality"]>; t: T; lang: Lang }) {
  const pct = (bp: number) => `${bp >= 10000 ? "+" : "−"}${fmtPct(Math.abs(bp - 10000), lang)}`;
  const cls = (bp: number) => (bp > 10000 ? "wf-pos" : bp < 10000 ? "wf-neg" : "");
  const theme = q.theme
    ? t(q.theme.direction > 0 ? "form.wf.themeGood" : "form.wf.themeBad", { status: t(`knowledge.status.${q.theme.status}`) })
    : t("form.wf.themeUnknown");
  return (
    <details className="small" open>
      <summary>{t("form.wf.title", { index: Math.round(q.indexBp / 10000) })} <HelpLink id="wertung" t={t} /></summary>
      <ul className="wf">
        <li><span>{t("form.wf.cards")}</span> <span>{Math.round(q.cardsBp / 10000)}</span></li>
        <li><span>{t("form.wf.team")}</span> <span className={cls(q.teamBp)}>× {fmtFactor(q.teamBp, lang)}</span></li>
        <li>
          <span>
            {t("form.wf.synergy")}
            {q.synergies.length > 0 ? ` (${q.synergies.map((h) => `${t(`feature.${h.a}`)} + ${t(`feature.${h.b}`)} ${h.bp >= 0 ? "+" : "−"}${Math.abs(Math.round(h.bp / 100))} %`).join(", ")})` : ""}
          </span>{" "}
          <span className={cls(10000 + q.synergyBp)}>{pct(10000 + q.synergyBp)}</span>
        </li>
        <li><span>{t("form.wf.profile")}</span> <span className={cls(q.profileBp)}>× {fmtFactor(q.profileBp, lang)}</span></li>
        {q.pillars.length > 0 && <li><span>{t("form.wf.pillars")}</span> <span className={cls(q.pillarBp)}>× {fmtFactor(q.pillarBp, lang)}</span></li>}
        <li><span>{t("form.wf.engine")}</span> <span className={cls(q.engineBp)}>× {fmtFactor(q.engineBp, lang)}</span></li>
        <li>
          <span>{t("form.wf.theme")}</span>{" "}
          <span className="muted">{theme}{q.subgenreThemeBonusBp > 0 ? ` · ${t("form.wf.subgenreBonus", { pct: fmtPct(q.subgenreThemeBonusBp, lang) })}` : ""}</span>
        </li>
      </ul>
      <p className="muted">{t("form.wf.hint")}</p>
    </details>
  );
}
