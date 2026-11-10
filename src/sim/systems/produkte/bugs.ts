// Bugs und QA nach S02 5.3 (PRD-R25, PRD-R29).
import { type Bp, BP_ONE, clamp, divBp, divInt, mulBp } from "../../num";
import type { GameData } from "../../model/types";
import { featureById } from "./quality";

/**
 * Innovation des Projekts für die Bug-Formel.
 * ANNAHME: Mittelwert der Feature-Innovation (−5…+5 Punkte) geteilt durch 5, also −1…+1.
 */
export function projectInnovation(data: GameData, featureIds: readonly string[]): Bp {
  if (featureIds.length === 0) return 0;
  const sum = featureIds.reduce((s, id) => s + featureById(data, id).innovation, 0);
  return clamp(divInt(sum, featureIds.length * data.bugs.innovationScalePoints, 1), -BP_ONE, BP_ONE);
}

/**
 * PRD-R25: Bugs_neu = Pakete · b₀ · (1 + Schuld) · (1 + 0,5 · Innovation).
 * ANNAHME: Ein Arbeitspaket ist eine erledigte Personenwoche; Schuld ist in Etappe 0 null (keine Engines).
 */
export function newBugs(data: GameData, workDoneBp: Bp, innovationBp: Bp, bugRateBp: Bp = BP_ONE): Bp {
  const debtBp = 0;
  // S10: Bug-Rate des Presets wirkt auf b₀.
  const perWork = mulBp(mulBp(workDoneBp, data.bugs.bugsPerPackageBp), bugRateBp);
  return mulBp(mulBp(perWork, BP_ONE + debtBp), BP_ONE + mulBp(data.bugs.innovationWeightBp, innovationBp));
}

/** PRD-R29: Gefunden = offen · 0,15 · min(1, QA-Kapazität / Pakete) · (1 + 0,3 · Testlabor). */
export function qaFound(data: GameData, openBugsBp: Bp, openPackagesBp: Bp, qaCapacityBp: Bp, qaBonusBp: Bp): Bp {
  const coverage = clamp(divBp(qaCapacityBp, openPackagesBp, 1), 0, BP_ONE);
  // FRM-T16: QA-Kapazität aus Testlabor und Qualitätszentrum (Tabelle 5.4, FRM-R65).
  const lab = BP_ONE + qaBonusBp;
  return mulBp(mulBp(mulBp(openBugsBp, data.bugs.qaFindRateBp), coverage), lab);
}
