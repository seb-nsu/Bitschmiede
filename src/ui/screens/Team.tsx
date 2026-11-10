// Team-Leiste, Personalsuche, Personalpolitik und Büro-Ausstattung.
// Prüfung Fable 03.11.2026: aus Studio.tsx herausgelöst (eine Datei je Bereich).
import { useState } from "react";
import type { ViewModel } from "../../sim/view/view";
import type { Area, TeamFocus } from "../../sim/model/types";
import { PeopleList } from "./People";
import type { Sim } from "../useSim";
import { fmtMoney, fmtPct } from "../format";
import type { Lang, T } from "../texts";

export function TeamBar({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const moves = view.office.options.filter((o) => o.blocked !== "error.officeLocked");
  return (
    <section className="panel team" aria-labelledby="team-title">
      <h2 id="team-title">{t("team.title", { n: view.people.length, max: view.maxPersons })}</h2>
      <p className="small muted">
        {t("office.current", { office: t(`office.${view.office.id}`), places: view.office.places, rent: fmtMoney(view.office.monthlyRentCent, lang) })}
        {view.office.moveWeeksLeft > 0 && <span className="badge"> {t("office.moving", { n: view.office.moveWeeksLeft })}</span>}
      </p>
      {moves.length > 0 && (
        <details className="small">
          <summary>{t("office.moveOptions", { n: moves.length })}</summary>
          {moves.map((o) => (
            <p key={o.id} className="small">
              <button type="button" className="topbar-btn" disabled={o.blocked !== null} title={o.blocked ? t(o.blocked) : undefined}
                onClick={() => sim.input({ type: "moveOffice", office: o.id })}>
                {t("office.move", { office: t(`office.${o.id}`) })}
              </button>{" "}
              <span className="muted">{t("office.moveHint", { places: o.places, rent: fmtMoney(o.monthlyRentCent, lang), deposit: fmtMoney(o.depositCent, lang) })} · {t("office.slotsShort", { n: o.slots })}</span>
            </p>
          ))}
        </details>
      )}
      <OfficeEquipment view={view} sim={sim} t={t} lang={lang} />
      <PeopleList view={view} sim={sim} t={t} lang={lang} />
      <StaffPanel view={view} sim={sim} t={t} lang={lang} />
    </section>
  );
}

/** FRM-R76: gezielte Personalsuche mit Bereich und Mindeststärke; die Kandidaten kommen als Fokus-Karte. */
function SearchForm({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const st = view.staff;
  const [area, setArea] = useState<Area>(view.staff.searchAreas[0]!);
  const [min, setMin] = useState(60);
  const opt = st.searchOptions.find((o) => o.minStrength === min) ?? st.searchOptions[0];
  if (st.search) return <p className="small">{t("search.running", { area: t(`area.${st.search.area}`), min: st.search.minStrength, n: Math.max(0, st.search.weeksLeft) })}</p>;
  return (
    <p className="small">
      <strong>{t("search.title")}</strong>{" "}
      <select aria-label={t("search.area")} value={area} onChange={(e) => setArea(e.target.value as Area)}>
        {st.searchAreas.map((a) => <option key={a} value={a}>{t(`area.${a}`)}</option>)}
      </select>{" "}
      <select aria-label={t("search.min")} value={min} onChange={(e) => setMin(Number(e.target.value))}>
        {st.searchOptions.map((o) => <option key={o.minStrength} value={o.minStrength}>{t("search.minOption", { m: o.minStrength })}</option>)}
      </select>{" "}
      {opt && <span className="muted">{t("search.cost", { fee: fmtMoney(opt.feeCent, lang), n: opt.weeks })}</span>}{" "}
      <button type="button" onClick={() => sim.input({ type: "startSearch", area, minStrength: min })}>{t("search.start")}</button>
    </p>
  );
}

/** FRM-R02, FRM-R04: Teams bilden, zuordnen, auflösen; FRM-R15 bis FRM-R17, FRM-R20: Personalpolitik. */
function StaffPanel({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const st = view.staff;
  const [target, setTarget] = useState(st.targetSize === null ? "" : String(st.targetSize));
  const policy = (patch: Partial<{ salary: typeof st.salary; crunch: typeof st.crunch; targetSize: number | null }>) =>
    sim.input({ type: "setStaffPolicy", salary: st.salary, crunch: st.crunch, targetSize: st.targetSize, ...patch });
  const focusHint = (f: TeamFocus) => f === "qa"
    ? t("team.focus.qaHint", { pct: fmtPct(st.teamFocus.qaFindRateBp, lang) })
    : f === null ? t("team.focus.mixedHint") : t("team.focus.areaHint", { area: t(`area.${f}`), plus: fmtPct(st.teamFocus.inAreaBp, lang), minus: fmtPct(-st.teamFocus.outAreaBp, lang) });
  return (
    <div className="staff">
      <h3>{t("staff.policy")}</h3>
      <p className="small">
        <label>{t("staff.salary")}{" "}
          <select value={st.salary} onChange={(e) => policy({ salary: e.target.value as typeof st.salary })}>
            {(["unter", "markt", "ueber"] as const).map((x) => <option key={x} value={x}>{t(`staff.salary.${x}`)}</option>)}
          </select>
        </label>{" "}
        <label>{t("staff.crunch")}{" "}
          <select value={st.crunch} onChange={(e) => policy({ crunch: e.target.value as typeof st.crunch })}>
            {(["nie", "vorGold", "beiBedarf"] as const).map((x) => <option key={x} value={x}>{t(`staff.crunch.${x}`)}</option>)}
          </select>
        </label>{" "}
        <label title={t("staff.targetHint")}>{t("staff.target")}{" "}
          <input inputMode="numeric" size={4} value={target} onChange={(e) => setTarget(e.target.value)}
            onBlur={() => policy({ targetSize: target.trim() === "" ? null : Math.max(1, Math.floor(Number(target)) || 1) })} />
        </label>
      </p>
      <SearchForm view={view} sim={sim} t={t} lang={lang} />
      <h3 data-guide="teams">{t("staff.teams")}</h3>
      {st.teamsBlocked ? <p className="muted small">{t(st.teamsBlocked)}</p> : (
        <>
          {st.teams.map((tm) => {
            const first = view.people.find((p) => p.id === tm.members[0]);
            const value = first?.assignment?.kind === "project" ? String(first.assignment.id) : first?.assignment?.kind === "engine" ? "engine" : "";
            return (
              <p key={tm.id} className="small">
                <strong>{tm.name}</strong> ({tm.members.length}) · {t("team.moraleBurnout", { m: Math.round(tm.moraleBp / 100), b: Math.round(tm.burnoutBp / 100) })}{" "}
                <label title={focusHint(tm.focus)}>{t("team.focus")}{" "}
                  <select value={tm.focus ?? ""} onChange={(e) => sim.input({ type: "setTeamFocus", teamId: tm.id, focus: e.target.value === "" ? null : (e.target.value as TeamFocus) })}>
                    <option value="">{t("team.focus.mixed")}</option>
                    {st.searchAreas.map((a) => <option key={a} value={a}>{t(`area.${a}`)}</option>)}
                    <option value="qa">{t("team.focus.qa")}</option>
                  </select>
                </label>{" "}
                <span className="muted">{t("team.strength", { n: tm.strength })}</span>{" "}
                {tm.focus !== "qa" && <select aria-label={t("staff.assignTeam", { name: tm.name })} value={value}
                  onChange={(e) => sim.input(e.target.value === "engine"
                    ? { type: "assignTeam", teamId: tm.id, projectId: null, engine: true }
                    : { type: "assignTeam", teamId: tm.id, projectId: e.target.value === "" ? null : Number(e.target.value) })}>
                  <option value="">{t("team.free")}</option>
                  {view.engine && <option value="engine">{t("team.engine")}</option>}
                  {view.active.map((pr) => <option key={pr.id} value={pr.id}>{pr.title}</option>)}
                </select>}{" "}
                <button type="button" className="linklike" onClick={() => sim.input({ type: "dissolveTeam", teamId: tm.id })}>{t("staff.dissolve")}</button>
              </p>
            );
          })}
          {st.teams.length === 0 && <p className="muted small">{t("people.teamHint")}</p>}
        </>
      )}
    </div>
  );
}

/** FRM-R26 bis FRM-R30, Tabelle 5.4: Ausbau, Hardware, Komfort und Räume. */
function OfficeEquipment({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const o = view.office;
  const old = o.hardware.factorBp < 9000;
  return (
    <details className="small office-eq">
      <summary>
        {t("office.equipment", { used: o.usedSlots, slots: o.slots, upkeep: fmtMoney(o.upkeepCent, lang) })}{" · "}
        <span className={old ? "error" : ""}>{t("office.hardware", { level: o.hardware.level, h: Math.round(o.hardware.factorBp / 100), year: o.hardware.year })}</span>
        {" · "}{t("office.comfort", { level: o.comfort.level })}
      </summary>
      <p>
        {t("office.buyHardware")}{" "}
        {o.hardware.offers.map((x) => (
          <button key={x.level} type="button" className="topbar-btn" disabled={x.blocked !== null} title={x.blocked ? t(x.blocked) : t("office.hardwareHint")}
            onClick={() => sim.input({ type: "buyHardware", level: x.level })}>
            {x.level} · {fmtMoney(x.costCent, lang)}
          </button>
        ))}
      </p>
      <p>
        {t("office.buyComfort")}{" "}
        {o.comfort.offers.filter((x) => x.level > o.comfort.level).map((x) => (
          <button key={x.level} type="button" className="topbar-btn" disabled={x.blocked !== null} title={x.blocked ? t(x.blocked) : t("office.comfortHint")}
            onClick={() => sim.input({ type: "buyComfort", level: x.level })}>
            {x.level} · {fmtMoney(x.costCent, lang)}
          </button>
        ))}
      </p>
      {o.extendBlocked === null && (
        <p>
          <button type="button" className="topbar-btn" onClick={() => sim.input({ type: "extendOffice" })}>{t("office.extend")}</button>{" "}
          <span className="muted">{t("office.extendHint", { n: o.extensions })}</span>
        </p>
      )}
      {o.rooms.length > 0 && (
        <p>
          {o.rooms.map((r) => (
            <span key={r.id} className="chip">
              {t(`room.${r.id}`)}{r.count > 1 ? ` ×${r.count}` : ""}{" "}
              <button type="button" className="linklike" title={t("office.sellHint")} onClick={() => sim.input({ type: "sellRoom", room: r.id })}>{t("office.sell")}</button>
            </span>
          ))}
        </p>
      )}
      <ul className="waiting">
        {o.shop.filter((r) => r.blocked !== "error.roomLocked").map((r) => (
          <li key={r.id}>
            <button type="button" className="topbar-btn" disabled={r.blocked !== null} title={r.blocked ? t(r.blocked) : undefined}
              onClick={() => sim.input({ type: "buyRoom", room: r.id })}>
              {t(`room.${r.id}`)}
            </button>{" "}
            <span className="muted">{t(`room.${r.id}.effect`)} · {fmtMoney(r.priceCent, lang)} · {t("office.upkeep", { cost: fmtMoney(r.upkeepCent, lang) })} · {t("office.slotsShort", { n: r.slots })}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
