// Etappe 6c.6: Phasen-Schwerpunkt (PRD-R20 erweitert; data/base/dev/phasefocus.json).
// ANNAHME: Je Phasengruppe (Pre-Production mit Vertical Slice, Produktion mit Alpha, Beta) eine Wahl zwischen Tempo,
// Qualität und Bugs. Sie wirkt auf die Arbeit, die in dieser Phase geleistet wird: Tempo auf die Leistung, Bugs auf
// neue Bugs; die Qualität als arbeitsgewichteter Mittelwert auf die Teamqualität (wie der Führungsfaktor, FRM-R57),
// sichtbar im Balken „Team“. Konzept und kleine Projekte vor der Produktion haben keine Wahl.
import { type Bp, BP_ONE, divInt } from "../../num";
import type { GameData, PhaseFocusOption, Project, Scope } from "../../model/types";

export function phaseGroup(data: GameData, phase: string): string | null {
  return data.phaseFocus.groups[phase] ?? null;
}

/** Phasengruppen eines Umfangs in ihrer Reihenfolge. */
export function groupsOf(data: GameData, scope: Scope): string[] {
  const out: string[] = [];
  for (const ph of data.projects.phases[scope]) {
    const g = phaseGroup(data, ph.id);
    if (g && !out.includes(g)) out.push(g);
  }
  return out;
}

export function focusOption(data: GameData, project: Pick<Project, "phase" | "phaseFocus">): PhaseFocusOption | null {
  const g = phaseGroup(data, project.phase);
  if (!g) return null;
  const list = data.phaseFocus.options[g] ?? [];
  const id = project.phaseFocus?.[g] ?? data.phaseFocus.default;
  return list.find((o) => o.id === id) ?? null;
}

export function validatePhaseFocus(data: GameData, project: Project | undefined, group: string, focus: string): string | null {
  if (!project || (project.status !== "laeuft" && project.status !== "pausiert")) return "error.unknownProject";
  if (!groupsOf(data, project.scope).includes(group)) return "error.phaseFocus";
  return (data.phaseFocus.options[group] ?? []).some((o) => o.id === focus) ? null : "error.phaseFocus";
}

export function setPhaseFocus(project: Project, group: string, focus: string): void {
  project.phaseFocus = { ...project.phaseFocus, [group]: focus };
}

/** Arbeitsgewichteter Mittelwert des Qualitätsfaktors (wie recordLeadership). */
export function recordPhaseQuality(project: Project, factor: Bp, done: Bp, work: Bp): void {
  if (work <= 0) return;
  const cur = project.phaseQualityBp ?? BP_ONE;
  // In einem Schritt geteilt, damit ein gleichbleibender Faktor genau erhalten bleibt.
  project.phaseQualityBp = divInt(cur * done + factor * work, done + work, 1);
}
