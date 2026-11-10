// Leistungsbudget je Plattform (S02 PRD-R11, PRD-R15, PRD-R61; S08 MRK-R02, MRK-R04, MRK-R05).
import { type Bp, BP_ONE, divBp, mulBp } from "../num";
import type { GameData, GameState, ModuleKind, PlatformDef } from "../model/types";
import { dateOf } from "../calendar";
import { featureById } from "./produkte/quality";
import { anchorValue } from "./finanzen";
import { stateOfArt } from "./engine";
import { budgetFactor } from "./plattformen";

function year(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

/** MRK-R02: Konsolen, Handhelds und Heimcomputer haben ein festes Budget; der PC wächst mit dem Jahr. */
export function platformBudget(data: GameData, p: PlatformDef, y: number, state?: GameState): number {
  if (p.type === "pc") return anchorValue(data.performance.pcAnchors, y);
  // MRK-R18: nach einer Taktsenkung −10 %.
  return mulBp(p.performanceAnchors ? anchorValue(p.performanceAnchors, y) : p.performance, budgetFactor(state, data, p.id));
}

/** Plan Etappe 2 Punkt 7: Eine Plattform erlaubt Modulstufen bis zum Stand der Technik ihres Erscheinens (PC: des Jahres). */
export function platformCap(data: GameData, p: PlatformDef, module: ModuleKind, y: number): number {
  // Plattformen von vor dem Spielbeginn können, was es 1980 gibt.
  return stateOfArt(data, module, p.type === "pc" || p.performanceAnchors ? y : Math.max(p.releaseYear, data.start.startYear));
}

/** PRD-R11: Erlaubt die Plattform die Karte technisch? */
export function platformAllows(data: GameData, p: PlatformDef, featureId: string, y: number): boolean {
  const need = featureById(data, featureId).requires;
  return need.level <= platformCap(data, p, need.module, y);
}

/** MRK-R05: Erfahrung senkt den Verbrauch auf dieser Plattform um bis zu 25 %. */
export function experienceSaving(data: GameData, state: GameState, platformId: string): Bp {
  return mulBp(state.platformExperience[platformId] ?? 0, data.performance.experienceSavingMaxBp);
}

/** Verbrauch einer Karte auf einer Plattform (Punkte · 100, damit die Ersparnis nicht verloren geht). */
export function featureCost(data: GameData, state: GameState, featureId: string, platformId: string): number {
  return mulBp(featureById(data, featureId).performanceCost * 100, BP_ONE - experienceSaving(data, state, platformId));
}

export function totalCost(data: GameData, state: GameState, features: readonly string[], platformId: string): number {
  return features.reduce((s, id) => s + featureCost(data, state, id, platformId), 0);
}

export interface PlatformVersion {
  platform: string;
  /** Budget und Verbrauch in Punkten · 100. */
  budget: number;
  used: number;
  /** Gestrichene Karten: technisch nicht möglich oder für das Budget zu teuer. */
  dropped: string[];
  /** Anteil der behaltenen Leistungskosten. */
  shareBp: Bp;
  weak: boolean;
}

/**
 * PRD-R61: Jede Plattform streicht Karten, die sie technisch nicht kann, und bei zu kleinem Budget die teuersten
 * (ANNAHME: teuerste zuerst, bei Gleichstand nach ID), bis die Version passt. Über 25 % Verlust ist sie schwach.
 */
export function platformVersions(data: GameData, state: GameState, features: readonly string[], platforms: readonly string[]): PlatformVersion[] {
  const y = year(state);
  return platforms.map((id) => {
    const p = data.platforms.find((x) => x.id === id)!;
    const budget = platformBudget(data, p, y, state) * 100;
    const full = totalCost(data, state, features, id);
    const dropped = features.filter((f) => !platformAllows(data, p, f, y));
    const kept = features.filter((f) => !dropped.includes(f))
      .sort((a, b) => featureCost(data, state, b, id) - featureCost(data, state, a, id) || (a < b ? -1 : 1));
    let used = totalCost(data, state, kept, id);
    while (used > budget && kept.length > 0) {
      const f = kept.shift()!;
      dropped.push(f);
      used -= featureCost(data, state, f, id);
    }
    const shareBp = full > 0 ? divBp(used, full, 1) : BP_ONE;
    return { platform: id, budget, used, dropped: dropped.sort(), shareBp, weak: BP_ONE - shareBp > data.performance.weakVersionThresholdBp };
  });
}

/** PRD-R11, PRD-R15: Die Lead-Plattform muss jede Karte erlauben, und die Summe muss ins Budget passen. */
export function leadBlocker(data: GameData, state: GameState, features: readonly string[], lead: string): string | null {
  const p = data.platforms.find((x) => x.id === lead);
  if (!p) return "error.unknownPlatform";
  const y = year(state);
  if (features.some((f) => !platformAllows(data, p, f, y))) return "error.platformCannot";
  if (totalCost(data, state, features, lead) > platformBudget(data, p, y, state) * 100) return "error.overBudget";
  return null;
}

export function versionShares(data: GameData, state: GameState, features: readonly string[], platforms: readonly string[]): Record<string, Bp> {
  return Object.fromEntries(platformVersions(data, state, features, platforms).map((v) => [v.platform, v.shareBp]));
}

/** MRK-R05: +8 Erfahrung je veröffentlichtem Spiel und Plattform, höchstens 100. */
export function gainPlatformExperience(data: GameData, state: GameState, platforms: readonly string[]): void {
  for (const id of platforms) {
    state.platformExperience[id] = Math.min(BP_ONE, (state.platformExperience[id] ?? 0) + data.performance.experiencePerReleaseBp);
  }
}
