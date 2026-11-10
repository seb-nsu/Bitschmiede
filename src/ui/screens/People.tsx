// Etappe 6c.2: Personal-Liste für große Studios (FRM-R01 bis FRM-R05): Filter, Mehrfachauswahl, Sammelaktionen
// (Projekt zuordnen, in ein Team, neues Team, aus dem Team lösen) und Zuordnung je Person.
import { useState } from "react";
import type { PersonView, ViewModel } from "../../sim/view/view";
import type { Area } from "../../sim/model/types";
import type { Sim } from "../useSim";
import { fmtMoney } from "../format";
import type { Lang, T } from "../texts";

type Where = "alle" | "frei" | "engine" | "auftrag" | "ohneTeam" | `p${number}` | `t${number}`;

function assignmentValue(p: PersonView): string {
  return p.assignment?.kind === "project" ? String(p.assignment.id) : p.assignment?.kind === "engine" ? "engine" : "";
}

function matches(p: PersonView, area: Area | "alle", where: Where, query: string, minStrength: number): boolean {
  if (query.trim() !== "" && !p.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
  if (area !== "alle" && p.strength[area] < minStrength) return false;
  if (area === "alle" && minStrength > 0 && p.strength[p.bestArea] < minStrength) return false;
  if (where === "alle") return true;
  if (where === "frei") return p.assignment === null;
  if (where === "engine") return p.assignment?.kind === "engine";
  if (where === "auftrag") return p.assignment?.kind === "contract";
  if (where === "ohneTeam") return p.teamId === null;
  if (where.startsWith("p")) return p.assignment?.kind === "project" && p.assignment.id === Number(where.slice(1));
  return p.teamId === Number(where.slice(1));
}

export function PeopleList({ view, sim, t, lang }: { view: ViewModel; sim: Sim; t: T; lang: Lang }) {
  const st = view.staff;
  const AREAS = st.searchAreas;
  const [area, setArea] = useState<Area | "alle">("alle");
  const [where, setWhere] = useState<Where>("alle");
  const [query, setQuery] = useState("");
  const [minStrength, setMinStrength] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [teamName, setTeamName] = useState("");
  const teamName_ = (id: number | null) => st.teams.find((x) => x.id === id)?.name;
  const qaTeam = (id: number | null) => st.teams.find((x) => x.id === id)?.focus === "qa";
  const visible = view.people
    .filter((p) => matches(p, area, where, query, minStrength))
    .sort((a, b) => (area === "alle" ? 0 : b.strength[area] - a.strength[area]) || a.id - b.id);
  const sel = picked.filter((id) => view.people.some((p) => p.id === id));
  const selPeople = view.people.filter((p) => sel.includes(p.id));
  const movable = selPeople.filter((p) => p.assignment?.kind !== "contract" && !qaTeam(p.teamId));
  const allVisible = visible.length > 0 && visible.every((p) => sel.includes(p.id));
  const toggle = (id: number, on: boolean) => setPicked(on ? [...sel, id] : sel.filter((x) => x !== id));
  const assignAll = (value: string) => {
    for (const p of movable) {
      sim.input(value === "engine"
        ? { type: "assign", personId: p.id, projectId: null, engine: true }
        : { type: "assign", personId: p.id, projectId: value === "" ? null : Number(value) });
    }
  };
  const showFilters = view.people.length >= 8;
  return (
    <div className="people">
      {showFilters && (
        <div className="people-filter small">
          <input aria-label={t("people.search")} placeholder={t("people.search")} value={query} size={12} onChange={(e) => setQuery(e.target.value)} />{" "}
          <label>{t("people.area")}{" "}
            <select value={area} onChange={(e) => setArea(e.target.value as Area | "alle")}>
              <option value="alle">{t("people.all")}</option>
              {AREAS.map((a) => <option key={a} value={a}>{t(`area.${a}`)}</option>)}
            </select>
          </label>{" "}
          <label>{t("people.min")}{" "}
            <select value={minStrength} onChange={(e) => setMinStrength(Number(e.target.value))}>
              {[0, 40, 50, 60, 70, 80, 90].map((m) => <option key={m} value={m}>{m === 0 ? t("people.all") : `≥ ${m}`}</option>)}
            </select>
          </label>{" "}
          <label>{t("people.where")}{" "}
            <select value={where} onChange={(e) => setWhere(e.target.value as Where)}>
              <option value="alle">{t("people.all")}</option>
              <option value="frei">{t("team.free")}</option>
              {view.engine && <option value="engine">{t("team.engine")}</option>}
              <option value="auftrag">{t("team.onContract")}</option>
              {view.active.map((pr) => <option key={pr.id} value={`p${pr.id}`}>{pr.title}</option>)}
              {st.teams.length > 0 && <option value="ohneTeam">{t("people.noTeam")}</option>}
              {st.teams.map((tm) => <option key={tm.id} value={`t${tm.id}`}>{t("people.inTeam", { team: tm.name })}</option>)}
            </select>
          </label>{" "}
          <span className="muted">{t("people.count", { n: visible.length, total: view.people.length })}</span>
        </div>
      )}
      {showFilters && (
        <div className="people-bulk small">
          <label>
            <input type="checkbox" checked={allVisible}
              onChange={(e) => setPicked(e.target.checked ? [...new Set([...sel, ...visible.map((p) => p.id)])] : sel.filter((id) => !visible.some((p) => p.id === id)))} />{" "}
            {t("people.selectVisible")}
          </label>{" "}
          {sel.length > 0 && (
            <>
              <strong>{t("people.selected", { n: sel.length })}</strong>{" "}
              <select aria-label={t("people.assignSelected")} value="-" onChange={(e) => { if (e.target.value !== "-") assignAll(e.target.value); }} disabled={movable.length === 0}>
                <option value="-">{t("people.assignSelected")}</option>
                <option value="">{t("team.free")}</option>
                {view.engine && <option value="engine">{t("team.engine")}</option>}
                {view.active.map((pr) => <option key={pr.id} value={pr.id}>{pr.title}</option>)}
              </select>{" "}
              {!st.teamsBlocked && (
                <>
                  <select aria-label={t("people.toTeam")} value="-"
                    onChange={(e) => { if (e.target.value !== "-") sim.input({ type: "teamMembers", teamId: e.target.value === "" ? null : Number(e.target.value), personIds: sel }); }}>
                    <option value="-">{t("people.toTeam")}</option>
                    {st.teams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
                    <option value="">{t("people.removeFromTeam")}</option>
                  </select>{" "}
                  <input value={teamName} placeholder={t("staff.teamName")} size={12} onChange={(e) => setTeamName(e.target.value)} />{" "}
                  <button type="button" disabled={teamName.trim() === "" || selPeople.some((p) => p.teamId !== null) || sel.length < 2}
                    title={selPeople.some((p) => p.teamId !== null) ? t("error.inTeam") : undefined}
                    onClick={() => { sim.input({ type: "createTeam", name: teamName, personIds: sel }); setTeamName(""); setPicked([]); }}>
                    {t("staff.createTeam")}
                  </button>{" "}
                </>
              )}
              <button type="button" className="linklike" onClick={() => setPicked([])}>{t("people.clear")}</button>
            </>
          )}
        </div>
      )}
      <ul className="team-list">
        {visible.map((p) => {
          const onContract = p.assignment?.kind === "contract";
          const inQa = qaTeam(p.teamId);
          return (
            <li key={p.id} className="person">
              {showFilters && <input type="checkbox" aria-label={p.name} checked={sel.includes(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} />}
              <span className="person-name">{p.name}</span>
              <span className="muted small" title={AREAS.map((a) => `${t(`area.${a}`)} ${p.strength[a]}`).join(", ")}>
                {area === "alle" ? `${t(`area.${p.bestArea}`)} ${p.strength[p.bestArea]}` : `${t(`area.${area}`)} ${p.strength[area]}`} · {fmtMoney(p.salaryCent, lang)}{t("team.perMonth")}
              </span>
              {p.teamId !== null && <span className="badge">{teamName_(p.teamId)}</span>}
              {onContract ? (
                <span className="badge">{t("team.onContract")}</span>
              ) : inQa ? (
                <span className="badge">{t("team.focus.qa")}</span>
              ) : (
                <select aria-label={t("team.assign", { name: p.name })} value={assignmentValue(p)}
                  onChange={(e) => sim.input(e.target.value === "engine"
                    ? { type: "assign", personId: p.id, projectId: null, engine: true }
                    : { type: "assign", personId: p.id, projectId: e.target.value === "" ? null : Number(e.target.value) })}>
                  <option value="">{t("team.free")}</option>
                  {view.engine && <option value="engine">{t("team.engine")}</option>}
                  {view.active.map((pr) => <option key={pr.id} value={pr.id}>{pr.title}</option>)}
                </select>
              )}
              {p.transferWeeks > 0 && <span className="muted small">{t("team.transfer", { n: p.transferWeeks })}</span>}
              {p.onboardWeeks > 0 && <span className="muted small">{t("team.onboarding", { n: p.onboardWeeks })}</span>}
              {p.key && (
                <span className="badge" title={p.key.traits.map((x) => t(`keytrait.${x}`)).join(", ")}>
                  {t(`role.${p.key.role}`)}{!p.isFounder && ` · ${t("team.loyalty", { n: Math.round(p.key.loyaltyBp / 100) })}`}
                </span>
              )}
              <span className="muted small">{t("team.moraleBurnout", { m: Math.round(p.moraleBp / 100), b: Math.round(p.burnoutBp / 100) })}</span>
              {p.fireBlocked === null && (
                <button type="button" className="linklike small" title={t("team.fireHint", { n: st.severanceMonths, cost: fmtMoney(st.severanceMonths * p.salaryCent, lang) })}
                  onClick={() => sim.input({ type: "firePerson", personId: p.id })}>
                  {t("team.fire")}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
