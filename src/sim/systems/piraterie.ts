// S05 Piraterie und Kopierschutz (MKT-R28 bis MKT-R34, MKT-R55, MKT-R56, MKT-F5, Datenblatt §8).
import { type Bp, BP_ONE, mulBp, mulDiv } from "../num";
import type { AiStudio, Brand, GameData, GameState, ProductProtection, Project, ProtectionLevelDef } from "../model/types";
import { dateOf } from "../calendar";
import { stream } from "../rng";
import { anchorValue } from "./finanzen";
import { platformBase, platformById } from "./markt";
import { chronicle } from "./katalog";
import { log } from "./firma";
import { addEvent } from "./ereignisse";

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

export function protectionLevel(data: GameData, id: string): ProtectionLevelDef {
  return data.piracy.levels.find((l) => l.id === id) ?? data.piracy.levels[0]!;
}

/** MKT-R29: Stufen der Epoche. */
export function availableProtections(data: GameData, year: number): ProtectionLevelDef[] {
  return data.piracy.levels.filter((l) => l.fromYear <= year);
}

/**
 * Autopilot (ANNAHME): die stärkste verfügbare Stufe, die höchstens 5 Punkte Zufriedenheit kostet (keine
 * Online-Pflicht, keine Middleware); bei gleicher Stärke die mit weniger Verlust.
 */
export function autopilotProtection(data: GameData, year: number): string {
  const max = data.piracy.autopilotMaxSatisfactionLoss;
  const ok = availableProtections(data, year).filter((l) => -l.satisfaction <= max && l.royaltyBp === undefined);
  return [...ok].sort((a, b) => b.strengthBp - a.strengthBp || b.satisfaction - a.satisfaction || a.id.localeCompare(b.id))[0]!.id;
}

/**
 * S05 Abschnitt 7: Die KI nimmt bei AAA-Studios die stärkste Stufe (Online-Pflicht nur mit dem Zug „draufgaenger“),
 * sonst Store-Schutz; vor dem Store-Schutz die Stufe des Autopiloten (ANNAHME).
 */
export function aiProtection(data: GameData, studio: AiStudio, year: number): string {
  const levels = availableProtections(data, year).filter((l) => l.id !== "online" || studio.traits.includes("draufgaenger"));
  if (studio.archetype === "aaa") return [...levels].sort((a, b) => b.strengthBp - a.strengthBp || a.id.localeCompare(b.id))[0]!.id;
  return levels.some((l) => l.id === "store") ? "store" : autopilotProtection(data, year);
}

/** MKT-R30: Haltbarkeit H aus der Spanne der Stufe (Strom „piraterie“); null = dauerhaft. */
export function newProtection(state: GameState, data: GameData, level: string): ProductProtection {
  const def = protectionLevel(data, level);
  const late = def.lateFromYear !== undefined && yearOf(state) >= def.lateFromYear;
  const span = late ? def.lateHoldWeeks! : def.holdWeeks;
  const hold = span === null ? null : stream(state, "piraterie").range(span[0], span[1]);
  return { level: def.id, holdWeeks: hold, cracked: false, removed: false, offered: false, piracyBp: 0, copies: 0, satisfaction: def.satisfaction * 100 };
}

/** p: Grundrate der Plattformen, gewichtet mit ihrer Basis (ANNAHME für Mehrplattform-Titel). */
export function baseRate(data: GameData, platforms: readonly string[], year: number): Bp {
  let weight = 0;
  let sum = 0;
  for (const id of platforms) {
    const p = platformById(data, id);
    const base = Math.max(1, platformBase(p, year));
    const anchors = data.piracy.baseRateAnchors[p.type] ?? data.piracy.baseRateAnchors["pc"]!;
    sum += mulDiv(base, anchorValue(anchors, year), BP_ONE, 1);
    weight += base;
  }
  return weight === 0 ? 0 : mulDiv(sum, BP_ONE, weight, 1);
}

/** MKT-F5: Piraterie_t = p · (1 − S_t); S_t = S₀ bis H, danach S_Rest (Store 0,10, sonst 0). */
export function piracyRate(data: GameData, platforms: readonly string[], year: number, prot: ProductProtection | undefined, t: number): Bp {
  const p = baseRate(data, platforms, year);
  if (!prot || prot.removed) return p;
  const def = protectionLevel(data, prot.level);
  const holding = prot.holdWeeks === null || t < prot.holdWeeks;
  return mulBp(p, BP_ONE - (holding ? def.strengthBp : def.restBp));
}

/**
 * Tick-Schritt 7, je Produkt: Kopien sind verlorene Verkäufe (MKT-R28); 1 % der Kopien wird Fan der Marke
 * (MKT-R33). Gibt die gekauften Stück zurück.
 */
export function applyPiracy(data: GameData, year: number, platforms: readonly string[], prot: ProductProtection | undefined, t: number, demand: number, brand: Brand | undefined, genre: string, online = false): number {
  if (!prot) return demand;
  prot.piracyBp = piracyRate(data, platforms, year, prot, t);
  // MKT-R34, MKT-T08: serverseitig geschützte Online-Spiele haben fast keine Piraterie.
  if (online) prot.piracyBp = Math.min(prot.piracyBp, data.piracy.onlineMaxBp);
  const copies = mulBp(demand, prot.piracyBp);
  prot.copies += copies;
  if (brand && copies > 0) brand.fans[genre] = (brand.fans[genre] ?? 0) + mulBp(copies, data.piracy.fansPerCopyBp);
  // ANNAHME (Datenblatt §8: „etwa 20 % Umsatzverlust bei Knacken in der ersten Woche“): Die Grundrate zählt Kopierer
  // unter den möglichen Käufern; nur ein Teil von ihnen hätte gekauft (35 %), das ergibt bei 0,5–0,6 rund 20 %.
  return demand - mulBp(copies, data.piracy.lostSaleBp);
}

/**
 * MKT-R55, MKT-R56: In Woche H + 1 ist der Schutz geknackt (Tickermeldung); hielt er 12 Wochen oder länger,
 * „trotzt den Crackern“ und +1 Studio-Ruf. Danach schlägt der Produzent einmal vor, ihn per Patch zu entfernen.
 */
export function crackCheck(state: GameState, data: GameData, project: Project, t: number): void {
  const prot = project.sales?.protection;
  if (!prot || prot.cracked || prot.removed || prot.holdWeeks === null || prot.level === "keiner") return;
  if (t !== prot.holdWeeks) return;
  prot.cracked = true;
  if (prot.holdWeeks >= data.piracy.defiantHoldWeeks) {
    state.studioReputationBp = Math.min(BP_ONE, state.studioReputationBp + data.piracy.reputationPerMomentBp);
    chronicle(state, "log.protectionDefiant", { project: project.title, weeks: prot.holdWeeks });
  } else chronicle(state, "log.protectionCracked", { project: project.title, weeks: prot.holdWeeks });
  if (!prot.offered && prot.satisfaction < 0) {
    prot.offered = true;
    addEvent(state, data, { kind: "schutzEntfernen", scope: "projekt", projectId: project.id, options: ["entfernen", "behalten"], defaultOption: "behalten" });
  }
}

/** Ticker und Ruf für KI-Produkte: nur das Knacken, ohne Vorschlag (die KI entfernt nichts). */
export function aiCrackCheck(prot: ProductProtection | undefined, t: number): void {
  if (prot && !prot.cracked && prot.holdWeeks !== null && t === prot.holdWeeks) prot.cracked = true;
}

/** MKT-R32, MKT-R56: Schutz per Patch entfernen: Zufriedenheit +50 % des Verlusts, „Danke, Studio!“, Studio-Ruf +1. */
export function removeProtection(state: GameState, data: GameData, project: Project): void {
  const prot = project.sales?.protection;
  if (!prot || prot.removed) return;
  prot.removed = true;
  prot.satisfaction -= mulBp(prot.satisfaction, data.piracy.removeRecoveryBp);
  state.studioReputationBp = Math.min(BP_ONE, state.studioReputationBp + data.piracy.reputationPerMomentBp);
  log(state, "log.protectionRemoved", { project: project.title });
}
