// Etappe 4b.1: Sichtbarer Fortschritt jede Woche. Balken mit Wochenzuwachs, Phasenwechsel als kleiner Moment,
// Köpfe der Leute am Projekt. Reine Anzeige: der Zuwachs ist die Differenz zum vorigen Anzeigemodell.
import { useEffect, useRef, useState } from "react";
import type { ProjectView, ViewModel } from "../../sim/view/view";
import type { T } from "../texts";
import { Icon } from "../icons";

const FLASH_MS = 1800;

function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0] ?? "").join("").slice(0, 2).toUpperCase();
}

/** Zuwachs seit dem letzten Wochen-Tick und ob gerade die Phase gewechselt hat. */
export function useWeekPulse(project: ProjectView): { deltaBp: number; phaseChanged: boolean } {
  const prev = useRef({ progress: project.progressBp, phase: project.phase });
  const [deltaBp, setDelta] = useState(0);
  const [phaseChanged, setPhaseChanged] = useState(false);
  useEffect(() => {
    const p = prev.current;
    if (project.progressBp !== p.progress) setDelta(Math.max(0, project.progressBp - p.progress));
    if (project.phase !== p.phase) {
      setPhaseChanged(true);
      const id = setTimeout(() => setPhaseChanged(false), FLASH_MS);
      prev.current = { progress: project.progressBp, phase: project.phase };
      return () => clearTimeout(id);
    }
    prev.current = { progress: project.progressBp, phase: project.phase };
    return undefined;
  }, [project.progressBp, project.phase]);
  return { deltaBp, phaseChanged };
}

export function Heads({ ids, view }: { ids: number[]; view: ViewModel }) {
  return (
    <span className="heads">
      {ids.slice(0, 6).map((id) => {
        const p = view.people.find((x) => x.id === id);
        return p ? <span key={id} className="head" title={p.name}>{initials(p.name)}</span> : null;
      })}
      {ids.length > 6 && <span className="head head-more">+{ids.length - 6}</span>}
    </span>
  );
}

/** Fortschrittsbalken mit „+3 %“-Marke; der Balken wächst sichtbar (CSS-Übergang). */
export function PulseBar({ project, t, big = false }: { project: ProjectView; t: T; big?: boolean }) {
  const { deltaBp, phaseChanged } = useWeekPulse(project);
  const pct = Math.round(project.progressBp / 100);
  return (
    <div className={`pulse${big ? " pulse-big" : ""}${phaseChanged ? " pulse-phase" : ""}`}>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="progress-bar" style={{ width: `${project.progressBp / 100}%` }} />
      </div>
      <span className="pulse-pct">{pct} %</span>
      {deltaBp > 0 && project.status === "laeuft" && (
        <span key={project.progressBp} className="pulse-delta">+{(deltaBp / 100).toLocaleString(undefined, { maximumFractionDigits: 1 })} %</span>
      )}
      {phaseChanged && <span className="pulse-phase-tag" role="status">{t("pulse.phase", { phase: t(`phase.${project.phase}`) })}</span>}
    </div>
  );
}

/** Zentrale: kompakte Karte je laufendem Projekt. */
export function ProjectPulseList({ view, t, onOpen }: { view: ViewModel; t: T; onOpen: () => void }) {
  if (view.active.length === 0) return null;
  return (
    <div className="pulse-list">
      {view.active.map((p) => (
        <button key={p.id} type="button" className="pulse-card" onClick={onOpen}>
          <span className="pulse-title"><Icon kind="genre" id={p.genre} /> <strong>{p.title}</strong> <span className="muted small">{t(`phase.${p.phase}`)}{p.remainingWeeks !== null && p.status === "laeuft" ? ` · ${t("project.remaining", { n: p.remainingWeeks })}` : ""}</span></span>
          <PulseBar project={p} t={t} />
          <Heads ids={p.people} view={view} />
        </button>
      ))}
    </div>
  );
}
