// Wissensbuch aus Releases (S11 UI-R95 bis UI-R97, A26).
import type {
  Area, GameState, KnowledgeEntry, KnowledgeFactor, Project, QualityBreakdown, ScoreBar,
} from "../model/types";
import { AREAS } from "../model/types";

export type KnowledgeStatus = "vermutlich" | "bestaetigt" | "umstritten";

interface Candidate {
  key: string;
  factor: KnowledgeFactor;
  ref: KnowledgeEntry["ref"];
  /** +1 oder −1: Richtung der Erkenntnis (beim Profil: +1 = Bereich braucht mehr Anteil). */
  direction: 1 | -1;
  params: Record<string, number>;
  value: number;
}

function byValueThenKey(a: { value: number; key: string }, b: { value: number; key: string }): number {
  return a.value - b.value || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
}

function candidateFor(bar: ScoreBar, project: Project, qb: QualityBreakdown, trendBp: number): Candidate | null {
  if (bar.value === 0) return null;
  const sign: 1 | -1 = bar.value > 0 ? 1 : -1;
  const sorted = [...qb.contributions].sort((a, b) => a.valueBp - b.valueBp || (a.featureId < b.featureId ? -1 : 1));
  switch (bar.factor) {
    case "features": {
      const c = sign > 0 ? sorted[sorted.length - 1]! : sorted[0]!;
      return { key: `features:${c.featureId}`, factor: "features", ref: { feature: c.featureId }, direction: sign, params: { value: c.valueBp }, value: bar.value };
    }
    case "team": {
      const byTeam = [...qb.contributions].sort((a, b) => a.teamBp - b.teamBp || (a.area < b.area ? -1 : 1));
      const c = sign > 0 ? byTeam[byTeam.length - 1]! : byTeam[0]!;
      return { key: `team:${c.area}`, factor: "team", ref: { area: c.area }, direction: sign, params: { team: c.teamBp }, value: bar.value };
    }
    case "profil": {
      let worst: Area = AREAS[0];
      let worstDiff = -1;
      for (const a of AREAS) {
        const d = Math.abs(qb.profileActual[a] - qb.profileExpected[a]);
        if (d > worstDiff) {
          worst = a;
          worstDiff = d;
        }
      }
      const needsMore = qb.profileActual[worst] < qb.profileExpected[worst];
      return {
        key: `profil:${project.genre}:${worst}`, factor: "profil", ref: { genre: project.genre, area: worst },
        direction: needsMore ? 1 : -1,
        params: { actual: qb.profileActual[worst], expected: qb.profileExpected[worst] }, value: bar.value,
      };
    }
    case "passung":
      return { key: `passung:${project.genre}:${project.theme}`, factor: "passung", ref: { genre: project.genre, theme: project.theme }, direction: sign, params: {}, value: bar.value };
    case "engine": {
      // ENG-R10: das Modul mit dem kleinsten (bei negativem Balken) bzw. größten Beitrag zu E.
      const mods = [...qb.engineModules].sort((a, b) => a.factorBp - b.factorBp || (a.module < b.module ? -1 : 1));
      const m = sign > 0 ? mods[mods.length - 1] : mods[0];
      if (!m) return null;
      return { key: `engine:${m.module}`, factor: "engine", ref: { module: m.module }, direction: sign, params: { level: m.level, art: m.art }, value: bar.value };
    }
    case "bugs":
      return { key: `bugs:${project.scope}`, factor: "bugs", ref: { scope: project.scope }, direction: -1, params: { bugs: project.bugHistory[project.bugHistory.length - 1] ?? 0 }, value: bar.value };
    case "zeitgeist":
      return { key: `zeitgeist:${project.genre}:${project.theme}`, factor: "zeitgeist", ref: { genre: project.genre, theme: project.theme }, direction: sign, params: { trend: trendBp }, value: bar.value };
    default:
      // ANNAHME: „Tagesform der Presse“ ist reiner Zufall und wird kein Eintrag; „Begrenzung“ ebenso nicht.
      return null;
  }
}

/** UI-R95: Größter positiver und größter negativer Balken werden zu Einträgen oder Bestätigungen. */
export function recordRelease(state: GameState, project: Project, qb: QualityBreakdown, bars: ScoreBar[], trendBp: number): string[] {
  const candidates = bars.map((b) => candidateFor(b, project, qb, trendBp)).filter((c): c is Candidate => c !== null);
  const positives = candidates.filter((c) => c.value > 0).sort(byValueThenKey);
  const negatives = candidates.filter((c) => c.value < 0).sort(byValueThenKey);
  const chosen = [positives[positives.length - 1], negatives[0]].filter((c): c is Candidate => c !== undefined);
  for (const c of chosen) {
    let entry = state.knowledge.find((e) => e.key === c.key);
    if (!entry) {
      entry = { key: c.key, factor: c.factor, ref: c.ref, up: 0, down: 0, params: {}, firstWeek: state.week, lastWeek: state.week };
      state.knowledge.push(entry);
      state.knowledge.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    }
    if (c.direction > 0) entry.up += 1;
    else entry.down += 1;
    entry.params = c.params;
    entry.lastWeek = state.week;
  }
  return chosen.map((c) => c.key);
}

/** UI-R96, UI-R97: Sicherheitsgrad und „umstritten“, bis eine Seite zwei Releases Vorsprung hat. */
export function knowledgeStatus(entry: KnowledgeEntry): { status: KnowledgeStatus; direction: 1 | -1; count: number } {
  const direction: 1 | -1 = entry.up >= entry.down ? 1 : -1;
  const count = Math.max(entry.up, entry.down);
  if (entry.up > 0 && entry.down > 0 && Math.abs(entry.up - entry.down) < 2) return { status: "umstritten", direction, count };
  return { status: count >= 3 ? "bestaetigt" : "vermutlich", direction, count };
}
