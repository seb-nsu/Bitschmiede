// Etappe 6c.5: Design-Säulen (PRD-R50 erweitert; data/base/dev/pillars.json).
// ANNAHME (Plan 6c, Annahme 5): Bis zu zwei Säulen je Projekt. Eine Säule zählt, wenn Karten mit passenden Tags
// (bei Innovation: Innovationswert ab Schwelle) einen Anteil am Kartenwert tragen; voller Bonus ab dem Zielanteil,
// gewichtet mit der Vorliebe der Presse für das Genre. Unter dem Mindestanteil gilt das Versprechen als gebrochen
// (Abzug). Der Faktor steht als eigener Balken „Säulen“ im Wasserfall. KI-Studios wählen keine Säulen.
import { type Bp, BP_ONE, clamp, divBp, mulBp } from "../../num";
import type { FeatureContribution, FeatureDef, GameData, PillarDef, PillarEffect } from "../../model/types";

export function pillarOf(data: GameData, id: string): PillarDef | undefined {
  return data.pillars.list.find((p) => p.id === id);
}

export function cardMatches(pillar: PillarDef, feature: FeatureDef): boolean {
  if (pillar.minInnovation !== undefined && feature.innovation >= pillar.minInnovation) return true;
  return feature.tags.some((t) => pillar.tags.includes(t));
}

/** Höchstens maxPillars verschiedene, bekannte Säulen. */
export function validatePillars(data: GameData, pillars: readonly string[] | undefined): string | null {
  if (pillars === undefined) return null;
  if (pillars.length > data.pillars.maxPillars) return "error.pillarsTooMany";
  if (new Set(pillars).size !== pillars.length) return "error.pillarsTooMany";
  return pillars.every((p) => pillarOf(data, p)) ? null : "error.unknownPillar";
}

/** Wirkung je Säule: Anteil der passenden Karten am Kartenwert, Gewicht der Presse und Beitrag zum Faktor. */
export function pillarEffects(
  data: GameData, pillars: readonly string[] | undefined, genre: string, contributions: readonly FeatureContribution[],
  feature: (id: string) => FeatureDef,
): { effects: PillarEffect[]; factorBp: Bp } {
  const P = data.pillars;
  const total = contributions.reduce((s, c) => s + c.valueBp, 0);
  const effects: PillarEffect[] = [];
  for (const id of [...(pillars ?? [])].sort()) {
    const def = pillarOf(data, id);
    if (!def) continue;
    const matched = contributions.filter((c) => cardMatches(def, feature(c.featureId))).reduce((s, c) => s + c.valueBp, 0);
    const shareBp = divBp(matched, total, 1);
    const weightBp = def.genreWeightBp[genre] ?? BP_ONE;
    const bp = shareBp < P.minShareBp ? P.missBp : mulBp(mulBp(P.bonusBp, weightBp), Math.min(BP_ONE, divBp(shareBp, P.targetShareBp, 1)));
    effects.push({ id, shareBp, weightBp, bp });
  }
  const factorBp = clamp(BP_ONE + effects.reduce((s, e) => s + e.bp, 0), 0, BP_ONE * 2);
  return { effects, factorBp };
}
