// S05 Abschnitt 13 Vertrieb (MKT-V04, MKT-V06 bis MKT-V13, MKT-R26): Vertriebswege, Rückläufer, Rückerstattungen,
// Beigaben, Shareware, Hardware-Bundle und Heft-Beilage.
import { type Bp, BP_ONE, type Cent, mulBp } from "../num";
import type { ChannelDef, DistributionParams, GameData, GameEvent, GameState, ProductSales, Project } from "../model/types";
import { dateOf, isFirstWeekOfQuarter } from "../calendar";
import { stream } from "../rng";
import { anchorValue, ledgerNow } from "./finanzen";
import { platformBase, platformById } from "./markt";
import { changeRelation, makerOf } from "./plattformen";
import { brandById } from "./marken";
import { log } from "./firma";

function P(data: GameData): DistributionParams {
  return data.distribution;
}

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

export function channelDef(data: GameData, id: string | undefined): ChannelDef | undefined {
  return id === undefined ? undefined : P(data).channels.find((c) => c.id === id);
}

/** MKT-V07 bis MKT-V10: Wege der Epoche; Handelsvertrieb ab 30 Personen, Shareware nur auf Heimcomputer und PC. */
export function channelBlocker(state: GameState, data: GameData, platforms: readonly string[], id: string): string | null {
  const c = channelDef(data, id);
  if (!c) return "error.unknownOption";
  const year = yearOf(state);
  if (year < c.fromYear || year > c.toYear) return "error.locked";
  if (state.people.length < c.minStaff) return "error.teamTooSmall";
  if (c.platformTypes && !platforms.every((p) => c.platformTypes!.includes(platformById(data, p).type))) return "error.platform";
  return null;
}

export function availableChannels(state: GameState, data: GameData, platforms: readonly string[]): string[] {
  return P(data).channels.filter((c) => channelBlocker(state, data, platforms, c.id) === null).map((c) => c.id);
}

/** Autopilot (ANNAHME): der eigene Handelsvertrieb, sobald erlaubt, sonst der Distributor. */
export function autopilotChannel(state: GameState, data: GameData, platforms: readonly string[]): string {
  return channelBlocker(state, data, platforms, "handelsvertrieb") === null ? "handelsvertrieb" : "distributor";
}

/** Erlös je physisch verkauftem Stück über den Vertriebsweg (MKT-V07); null = alter Spielstand ohne Weg. */
export function channelNet(data: GameData, s: ProductSales, priceCent: Cent, factorBp: Bp): Cent | null {
  const c = channelDef(data, s.channel);
  return c ? mulBp(mulBp(priceCent, c.shareBp), factorBp) : null;
}

/** MKT-V08: Anteil des erreichbaren Markts (physisch). */
export function channelReach(data: GameData, s: ProductSales): Bp {
  return channelDef(data, s.channel)?.reachBp ?? BP_ONE;
}

export function isShareware(s: ProductSales): boolean {
  return s.channel === "shareware";
}

/**
 * MKT-R26: Rückerstattungen digital ab 2010: 2 % Grund, +5 % bei kurzen Spielen (ANNAHME: Umfang „klein“ unter 5 h),
 * +5 % bei vielen Bugs (ANNAHME: ab 10 Bugs zum Release).
 */
export function refundRate(state: GameState, data: GameData, p: Project, bugsAtRelease: number): Bp {
  const d = P(data);
  if (yearOf(state) < d.refundFromYear) return 0;
  return d.refundBaseBp + (d.refundShortScopes.includes(p.scope) ? d.refundShortBp : 0) + (bugsAtRelease >= d.refundBugsThreshold ? d.refundBugsBp : 0);
}

/**
 * MKT-V04: Über Distributor oder Handel kommen nach 4 Monaten 30 % der Restware zurück ins eigene Lager. Sie zählt
 * nicht mehr als Ware im Handel (kein Preisschutz) und kostet weiter Lager (ANNAHME).
 */
export function applyReturns(state: GameState, data: GameData, project: Project, t: number): void {
  const s = project.sales!;
  if (t !== P(data).returnsAfterWeeks || !channelDef(data, s.channel)?.returns || s.stock <= 0) return;
  const back = mulBp(s.stock, P(data).returnsShareBp);
  if (back <= 0) return;
  s.stock -= back;
  s.returned = (s.returned ?? 0) + back;
  log(state, "log.returns", { project: project.title, units: back });
}

/** MKT-V06: Beigaben kosten 30 % mehr je Stück (ANNAHME). */
export function extrasCost(data: GameData, unitCostCent: Cent, units: number): Cent {
  return units * mulBp(unitCostCent, P(data).extras.unitCostBp);
}

/** Einmalige Einnahme aus Vertriebs-Angeboten (Bundle, Beilage), im Monatsbuch unter Verkäufen. */
function earn(state: GameState, cent: Cent): void {
  state.moneyCent += cent;
  ledgerNow(state).income.sales += cent;
}

function bundlePlatform(data: GameData, p: Project): string | null {
  return p.platforms.find((id) => makerOf(data, id) !== null) ?? null;
}

/** MKT-V12: Festbetrag = Gebühr je Gerät · 0,5 % der Basis (ANNAHME: so viele Geräte gehen mit dem Spiel als Bundle). */
export function bundlePay(state: GameState, data: GameData, platformId: string): Cent {
  const b = P(data).bundle;
  const year = yearOf(state);
  return mulBp(platformBase(platformById(data, platformId), year), b.devicesShareBp) * anchorValue(b.feeCentAnchors, year);
}

/** MKT-V13: Heft-Beilage für Titel ab 2 Jahren, 1985–2005, je Quartal mit 25 % Chance für einen Titel (ANNAHME). */
function coverMountCandidates(state: GameState, data: GameData): Project[] {
  const c = P(data).coverMount;
  return state.projects
    .filter((p) => p.sales && !p.sales.coverMounted && state.week - p.sales.startWeek >= c.minAgeWeeks)
    .filter((p) => p.platforms.some((id) => c.platformTypes.includes(platformById(data, id).type)))
    .sort((a, b) => a.id - b.id);
}

/** Tick-Schritt 7 nach den Verkäufen: Angebote für Hardware-Bundle und Heft-Beilage. */
export function distributionStep(state: GameState, data: GameData): void {
  const d = P(data);
  for (const p of [...state.projects].sort((a, b) => a.id - b.id)) {
    const s = p.sales;
    if (!s || s.ended || s.bundleOffered || !p.result || state.week - s.startWeek !== d.bundle.afterWeeks) continue;
    if (p.result.scoreBp < d.bundle.minScoreBp) continue;
    const platform = bundlePlatform(data, p);
    if (platform === null) continue;
    s.bundleOffered = true;
    // Prüfung Fable 03.11.2026: Bundle und Beilage ohne Entscheidungsfenster; das Angebot wird angenommen und steht im Bericht.
    applyDistributionDecision(state, data, "hardwareBundle", { platform, maker: makerOf(data, platform)!, payCent: bundlePay(state, data, platform), projectId: p.id }, "annehmen", p);
  }
  const year = yearOf(state);
  if (!isFirstWeekOfQuarter(state.week) || year < d.coverMount.fromYear || year > d.coverMount.toYear) return;
  const rng = stream(state, "vertrieb");
  const roll = rng.uniformBp();
  const pick = coverMountCandidates(state, data);
  if (pick.length === 0 || roll >= d.coverMount.chancePerQuarterBp) return;
  const p = pick[rng.range(0, pick.length - 1)]!;
  if (state.events.some((e) => e.kind === "heftBeilage")) return;
  applyDistributionDecision(state, data, "heftBeilage", { platform: p.platforms[0]!, maker: "", payCent: anchorValue(d.coverMount.feeCentAnchors, year), projectId: p.id }, "annehmen", p);
}

/** Entscheidungen zu Bundle und Beilage. */
export function applyDistributionDecision(
  state: GameState, data: GameData, kind: "hardwareBundle" | "heftBeilage", deal: GameEvent["platformDeal"], option: string, project: Project | undefined,
): void {
  if (option !== "annehmen" || !project?.sales || !deal) return;
  earn(state, deal.payCent);
  if (kind === "hardwareBundle") {
    // MKT-V12: Die Plattform gewinnt an Attraktivität; ANNAHME: Basis ist fest, deshalb steigt die Beziehung zum Hersteller.
    changeRelation(state, data, deal.maker, P(data).bundle.relationBp);
    log(state, "log.bundle", { project: project.title, platform: deal.platform, pay: deal.payCent });
  } else {
    project.sales.coverMounted = true;
    const b = brandById(state, project.brandId);
    if (b) b.awarenessBp = Math.min(BP_ONE, b.awarenessBp + P(data).coverMount.awarenessBp);
    log(state, "log.coverMount", { project: project.title, pay: deal.payCent });
  }
}
