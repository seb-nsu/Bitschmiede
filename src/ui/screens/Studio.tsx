// Vorhaben (Konzept 0b, Abschnitt 4): laufende Projekte, pausierte Projekte und Aufträge.
// Prüfung Fable 03.11.2026: aus Studio.tsx herausgelöst (eine Datei je Bereich).
import type { ContractGameOfferView, ViewModel } from "../../sim/view/view";
import type { Sim } from "../useSim";
import type { Lang, T } from "../texts";
import { ContractCard, Marketplace } from "./Contracts";
import { ProjectCard } from "./ProjectCard";

export function Studio({ view, sim, t, lang, onNewProject, onSteer, onOffer }: { view: ViewModel; sim: Sim; t: T; lang: Lang; onNewProject: () => void; onSteer: (id: number) => void; onOffer: (o: ContractGameOfferView) => void }) {
  return (
    <section className="panel" aria-labelledby="studio-title">
      <div className="studio-head">
        <h2 id="studio-title">{t("studio.title")}</h2>
        <button type="button" className="primary" disabled={view.newProjectBlocked !== null} onClick={onNewProject}
          title={view.newProjectBlocked ? t(view.newProjectBlocked) : undefined}>
          {t("studio.newProject")}
        </button>
      </div>
      {view.newProjectBlocked && <p className="muted small">{t(view.newProjectBlocked)}</p>}
      {view.active.length === 0 && view.contracts.length === 0 && <p className="muted">{t("studio.empty")}</p>}
      <div className="vcards">
        {view.active.map((p) => <ProjectCard key={p.id} project={p} view={view} sim={sim} t={t} lang={lang} onSteer={onSteer} />)}
      </div>
      {view.paused.length > 0 && <PausedList view={view} sim={sim} t={t} />}
      <Marketplace view={view} sim={sim} t={t} lang={lang} onAccept={onOffer} />
      {view.contracts.length > 0 && <div className="vcards">{view.contracts.map((c) => <ContractCard key={`c${c.id}`} contract={c} view={view} t={t} lang={lang} />)}</div>}
    </section>
  );
}

/** PRD-R40: Pausierte Projekte; Fortsetzen mit allen freien Personen. */
function PausedList({ view, sim, t }: { view: ViewModel; sim: Sim; t: T }) {
  const free = view.people.filter((p) => p.assignment === null).map((p) => p.id);
  return (
    <div className="paused">
      <h3>{t("studio.paused")}</h3>
      <ul className="waiting">
        {view.paused.map((p) => (
          <li key={p.id}>
            <strong>{p.title}</strong> <span className="muted small">{Math.round(p.progressBp / 100)} %</span>{" "}
            <button type="button" disabled={free.length === 0 || view.newProjectBlocked !== null}
              title={free.length === 0 ? t("studio.resumeNoFree") : view.newProjectBlocked ? t(view.newProjectBlocked) : t("studio.resumeHint")}
              onClick={() => sim.input({ type: "resumeProject", projectId: p.id, people: free })}>
              {t("studio.resume")}
            </button>{" "}
            <button type="button" className="linklike" onClick={() => sim.input({ type: "cancelProject", projectId: p.id })}>{t("project.cancel")}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

