// Etappe 6c.8: Lokalisierung (MKT-Absatz erweitert; data/base/market/localization.json).
// ANNAHME: Der Absatz verteilt sich auf Sprachmärkte mit Anteilen je Jahr. Ohne Übersetzung kauft ein Markt nur einen
// Teil (Reichweite ohne Übersetzung); jede Übersetzung hebt ihn auf 100 %. Der Faktor ist auf „nur Heimatsprache“
// normiert, damit Spiele ohne Lokalisierung so verkaufen wie bisher. Kosten je Sprache nach Umfang und Textmenge
// (Karten mit Erzählung oder Inhalt), fällig beim Release. KI-Produkte sind nicht lokalisiert.
import { type Bp, BP_ONE, type Cent, divBp, mulBp } from "../../num";
import type { GameData, Project } from "../../model/types";
import { featureById } from "./quality";
import { anchorValue, scaleToYear } from "../finanzen";

const L = (data: GameData) => data.localization;

export function availableLanguages(data: GameData, year: number): string[] {
  return L(data).languages.filter((l) => l.fromYear <= year).map((l) => l.id);
}

/** Nachfragefaktor der gewählten Sprachen gegenüber „nur Heimatsprache“ (1,0). */
export function localizationFactor(data: GameData, languages: readonly string[] | undefined, year: number): Bp {
  if (!languages || languages.length === 0) return BP_ONE;
  const home = anchorValue(L(data).homeShareAnchors, year);
  let base = home;
  let withLoc = home;
  for (const l of L(data).languages) {
    const share = anchorValue(l.shareAnchors, year);
    const without = mulBp(share, l.unlocalizedBp);
    base += without;
    withLoc += languages.includes(l.id) && l.fromYear <= year ? share : without;
  }
  return divBp(withLoc, base, 1);
}

/** Kosten einer Sprache: Umfang · (1 + Aufschlag je Textkarte), aufs Lohnniveau des Jahres. */
export function languageCost(data: GameData, project: Pick<Project, "scope" | "features">, year: number): Cent {
  const textCards = project.features.filter((id) => featureById(data, id).tags.some((t) => L(data).textTags.includes(t))).length;
  return scaleToYear(data, mulBp(L(data).costCent[project.scope], BP_ONE + textCards * L(data).textCardBp), year);
}

export function validateLanguages(data: GameData, project: Project | undefined, languages: readonly string[], year: number): string | null {
  if (!project || (project.status !== "laeuft" && project.status !== "bereit")) return "error.unknownProject";
  if (project.contractGame) return "error.contractGameLanguages";
  const open = availableLanguages(data, year);
  if (new Set(languages).size !== languages.length || !languages.every((l) => open.includes(l))) return "error.unknownLanguage";
  return null;
}
