// Etappe 6c.7: Politur je Bereich (PRD-R50 erweitert; data/base/dev/polish.json).
// ANNAHME: Nach der Produktion (Status „bereit“) kann das Team einen Bereich polieren. Jede Woche mit Personen am
// Projekt holt einen festen Anteil der Lücke bis zum Höchstbonus auf (abnehmender Ertrag); der Bonus hebt den Wert
// aller Karten dieses Bereichs wie die Ausstattung (Tabelle 5.4) und steht damit im Balken „Team“. In Wochen mit
// Politur findet das Team nur einen Teil der Bugs.
import { type Bp, mulBp } from "../../num";
import { AREAS, type Area, type GameData, type Project } from "../../model/types";

export function validatePolish(project: Project | undefined, area: Area | null): string | null {
  if (!project || (project.status !== "laeuft" && project.status !== "bereit")) return "error.unknownProject";
  return area === null || AREAS.includes(area) ? null : "error.unknownArea";
}

export function setPolish(project: Project, area: Area | null): void {
  project.polishArea = area;
}

/** Eine Woche Politur: Lücke zum Höchstbonus schrumpft um rateBp. */
export function polishWeek(data: GameData, project: Project): void {
  const area = project.polishArea;
  if (!area) return;
  const cur = project.polish[area] ?? 0;
  project.polish = { ...project.polish, [area]: cur + mulBp(data.polish.maxBonusBp - cur, data.polish.rateBp) };
}

/** Anteil der normalen Bugsuche in einer Woche (Politur bindet das Team). */
export function bugFindShare(data: GameData, project: Project): Bp {
  return project.polishArea ? data.polish.bugFindShareBp : 10000;
}
