// Markt für Etappe 1: Trends (Zeitgeist), Plattformen mit festen Lebenszyklen (S08 MRK-R11) und Verkäufe nach
// S05 MKT-F2/MKT-F3 mit Interesse (Etappe 4), mit physischer Auflage (S05 Abschnitt 13) und
// digitalem Anteil nach Epoche (MKT-R24, MKT-R25).
import { localizationFactor } from "./produkte/lokalisierung";
import { audienceDemandBp, audienceOf } from "./produkte/zielgruppe";
import { applyPiracy, crackCheck } from "./piraterie";
import { wordOfMouthBp } from "./betrieb";
import { effectivePrice, newPricing, pricingDemandFactor } from "./preise";
import { tradeShelfWeeks } from "./messe";
import { applyReturns, channelNet, channelReach, extrasCost, isShareware } from "./vertrieb";
import { consume, subscriptionFactor, totalRemaining } from "./verwertung";
import { playerAwardFactor } from "./branchenpreise";
import { type Bp, BP_ONE, type Cent, clamp, divBp, divInt, expNegBp, mulBp, mulDiv } from "../num";
import type { GameData, GameState, PlatformDef, ProductSales, Project } from "../model/types";
import type { Rng } from "../rng";
import { dateOf } from "../calendar";
import { trendOf } from "./produkte/score";
import { anchorValue, payLicense, preset } from "./finanzen";
import { brandById, brandSales } from "./marken";
import { payBrandRoyalty } from "./markenmarkt";
import { accrueRoyalty } from "./lizenzen";
import { playerFeeBp } from "./plattformen";
import { futurePlatformBp } from "./zukunft";

/** Startwerte der Trends je Genre und Thema (Strom „markt“). */
export function initTrends(state: GameState, data: GameData, rng: Rng): void {
  const t = data.trends;
  for (const g of data.genres) state.trends.genre[g.id] = clamp(rng.normal(BP_ONE, t.startSdBp), t.minBp, t.maxBp);
  for (const th of data.themes) state.trends.theme[th.id] = clamp(rng.normal(BP_ONE, t.startSdBp), t.minBp, t.maxBp);
}

/** Monatsjob: Zufallsbewegung σ 0,03 mit 5 % Rückkehr zur Mitte (Datenblatt Abschnitt 10). */
export function monthlyTrends(state: GameState, data: GameData, rng: Rng): void {
  const t = data.trends;
  const step = (x: Bp): Bp => clamp(x + rng.normal(0, t.monthlySdBp) - mulBp(x - BP_ONE, t.meanReversionBp), t.minBp, t.maxBp);
  for (const g of data.genres) state.trends.genre[g.id] = step(state.trends.genre[g.id]!);
  for (const th of data.themes) state.trends.theme[th.id] = step(state.trends.theme[th.id]!);
}

// ---------- Plattformen (S08, MRK-R06, MRK-R11) ----------

// TEC-R50: Index je Datensatz (die Daten sind eingefroren, der Index hängt am Feld-Objekt).
const platformIndex = new WeakMap<readonly PlatformDef[], Map<string, PlatformDef>>();

export function platformById(data: GameData, id: string): PlatformDef {
  let index = platformIndex.get(data.platforms);
  if (!index) {
    index = new Map(data.platforms.map((x) => [x.id, x]));
    platformIndex.set(data.platforms, index);
  }
  const p = index.get(id);
  if (!p) throw new Error(`Unbekannte Plattform ${id}`);
  return p;
}

/** MRK-R11 (feste Lebenszyklen): erhältlich vom Erscheinungs- bis zum Einstellungsjahr. */
export function platformActive(p: PlatformDef, year: number): boolean {
  return year >= p.releaseYear && year <= p.endYear;
}

/** Installierte Basis in Personen; nach der Einstellung bleibt der letzte Stand. */
export function platformBase(p: PlatformDef, year: number): number {
  if (year < p.releaseYear) return 0;
  return anchorValue(p.baseAnchors, Math.min(year, p.endYear));
}

export function mediumOf(data: GameData, p: PlatformDef, year: number) {
  let id = p.media[0]![1];
  for (const [from, m] of p.media) if (year >= from) id = m;
  return data.media.find((m) => m.id === id)!;
}

/**
 * MKT-R24: Digitalanteil der Verkäufe im Jahr, nach der Familie der Lead-Plattform.
 * ANNAHME: Ein Anteil je Produkt (Lead-Plattform), wie Datenträger und Gebühr; ohne Wahl des Vertriebswegs (MKT-V07, Etappe 4).
 */
export function digitalShare(data: GameData, platforms: readonly string[], year: number): Bp {
  const lead = platformById(data, platforms[0]!);
  return lead.digitalOnly ? BP_ONE : clamp(anchorValue(data.sales.digitalShareAnchors[lead.type], year), 0, BP_ONE);
}

/** MKT-T09: Ein rein digitales Spiel hat keine Auflage. */
export function digitalOnly(data: GameData, platforms: readonly string[], year: number): boolean {
  return digitalShare(data, platforms, year) >= BP_ONE;
}

/** Vollpreis eines Spiels im Jahr (Datenblatt Abschnitt 1). */
export function priceOf(data: GameData, year: number): Cent {
  return anchorValue(data.sales.priceAnchorsCent, year);
}

export function activePlatforms(data: GameData, year: number): PlatformDef[] {
  return data.platforms.filter((p) => platformActive(p, year));
}

// ---------- Nachfrage (MKT-F2, MKT-F3) ----------

/** Q_rel = Wertung / 7, begrenzt 0,3–1,5. */
export function qRel(data: GameData, scoreBp: Bp): Bp {
  const s = data.sales;
  return clamp(divBp(scoreBp, s.qRelDivisorBp, 1), s.qRelMinBp, s.qRelMaxBp);
}

/** k = k₀ · 7 / max(Wertung, 3), je Woche in bp. */
export function decayK(data: GameData, scoreBp: Bp): Bp {
  return mulDiv(data.sales.decayK0Bp, data.sales.qRelDivisorBp, Math.max(scoreBp, 30000), 1);
}

/** MKT-R11: Weihnachtsquartal ×1,6, Sommerloch (Juli, August) ×0,8. */
export function season(data: GameData, month: number): Bp {
  if (month >= 9) return data.sales.seasonQ4Bp;
  if (month === 6 || month === 7) return data.sales.seasonSummerBp;
  return BP_ONE;
}

/**
 * Erreichbare Käufer: Basis aller Zielplattformen; eingestellte zählen nur mit 5 % (MRK-R06). Eine abgespeckte
 * Version erreicht nur den Anteil ihrer behaltenen Leistungskosten (PRD-R61, Plan Etappe 2 Punkt 8).
 */
export function reachableBase(data: GameData, platforms: readonly string[], year: number, shares?: Record<string, Bp>, state?: GameState): number {
  return platforms.reduce((sum, id) => {
    const p = platformById(data, id);
    // MRK-R57: Plattform-Wendepunkte der Zukunftsepoche heben oder senken die Basis einer neuen Plattformart.
    const base = mulBp(mulBp(platformBase(p, year), shares?.[id] ?? BP_ONE), futurePlatformBp(state, id));
    return sum + (platformActive(p, year) ? base : mulBp(base, data.sales.discontinuedShareBp));
  }, 0);
}

/**
 * MRK-R30: Konkurrenzdichte einer Release-Woche = Summe der Release-Gewichte aller Spiele im Fenster ±2 Wochen:
 * erschienene KI- und Spielerspiele und angekündigte KI-Projekte (geplante Release-Woche). Ohne Kundengruppen zählt
 * der ganze Markt. ANNAHME (Annahme 4 aus Etappe 3): Gewicht = Nachfrage-Faktor des Umfangs · Q_rel der Wertung
 * (angekündigt: Q_rel 1), mal einem Faktor je Release aus den Daten. Ohne KI-Welt gilt die Hintergrund-Konkurrenz
 * der Ankerwerte aus Etappe 1.
 */
export function competitionDensity(state: GameState, data: GameData, week: number, excludeProjectId: number | null = null): Bp {
  const s = data.sales;
  if (!state.ai.generated) return anchorValue(s.competitionDensityAnchors, dateOf(state.startYear, week).year);
  const w = data.ai.densityWindowWeeks;
  let sum = 0;
  for (const p of state.ai.products) {
    if (p.releaseWeek >= week - w && p.releaseWeek <= week + w) sum += mulBp(s.scopeDemandBp[p.scope], qRel(data, p.scoreBp));
  }
  for (const st of state.ai.studios) {
    if (st.closedWeek !== null) continue;
    for (const t of st.teams) {
      const r = t.project?.plannedReleaseWeek;
      if (r !== undefined && r >= week - w && r <= week + w) sum += s.scopeDemandBp[t.project!.scope];
    }
  }
  for (const p of state.projects) {
    if (p.id === excludeProjectId || !p.result || p.status !== "veroeffentlicht" || !p.sales) continue;
    if (p.result.week >= week - w && p.result.week <= week + w) sum += mulBp(s.scopeDemandBp[p.scope], qRel(data, p.result.scoreBp));
  }
  return mulBp(sum, data.ai.densityPerReleaseBp);
}

/** MKT-F2, MKT-R10: Faktor 1 / (1 + κ · Konkurrenzdichte) in der Release-Woche. */
export function competitionFactor(state: GameState, data: GameData, week: number, excludeProjectId: number | null = null, densityBp: Bp = BP_ONE): Bp {
  const density = mulBp(competitionDensity(state, data, week, excludeProjectId), densityBp);
  return divBp(BP_ONE, BP_ONE + mulBp(data.sales.competitionKappaBp, density), 1);
}

/**
 * Wochennachfrage t Wochen nach dem Release:
 * V(t) = (c_M · Basis · Q_rel · Umfang + c_I · I) · Trend · Saison · Konkurrenz · e^(−k·t) (MKT-F2, MKT-F3).
 * ANNAHME: Die Basis wird jede Woche neu gelesen, damit wachsende und schrumpfende Plattformen wirken (MKT-R16).
 */
export type DemandSubject = Pick<Project, "platforms" | "genre" | "theme" | "scope"> & {
  id?: number; type?: string; sourceId?: number | null; versionShareBp?: Record<string, Bp>;
  /** Etappe 6c.4: Zielgruppe (fehlt = Standard, z. B. KI-Produkte). */
  audience?: string;
  /** Etappe 6c.8: übersetzte Sprachen (fehlt = nur Heimatsprache). */
  languages?: readonly string[];
  /** MKT-F2: Interesse zum Release (KI-Produkt) oder Marketing des Spielerprojekts. */
  interest?: number; marketing?: { interest: number };
};

/** MKT-F2: Interesse eines Produkts (Personen). */
export function interestOf(p: DemandSubject): number {
  return p.interest ?? p.marketing?.interest ?? 0;
}

/** BTR-R20: kostenloses Live-Produkt (F2P): nur Download, Umsatz aus In-Game-Käufen. */
export function freeToPlay(data: GameData, p: { type?: string }): boolean {
  return productType(data, p.type).live === "f2p";
}

export function productType(data: GameData, id: string | undefined) {
  return data.productTypes.find((x) => x.id === (id ?? "standard")) ?? data.productTypes.find((x) => x.id === "standard")!;
}

/** competitionBp: Konkurrenzfaktor des Releases, wenn bekannt (gespeichert oder für Prognosen einmal berechnet). */
export function weeklyDemand(state: GameState, data: GameData, p: DemandSubject, scoreBp: Bp, t: number, week: number, competitionBp?: Bp): number {
  const d = dateOf(state.startYear, week);
  const s = data.sales;
  const type = productType(data, p.type);
  // PRD-R01: Addons verkaufen an die Besitzer der Vorlage, alle anderen an die Basis der Plattformen.
  const owners = type.demand === "besitzer" ? state.projects.find((x) => x.id === p.sourceId)?.sales?.sold ?? 0 : 0;
  let v = type.demand === "besitzer" ? mulBp(owners, type.ownerShareBp) : mulBp(reachableBase(data, p.platforms, d.year, p.versionShareBp, state), s.spontaneousBp);
  v = mulBp(v, qRel(data, scoreBp));
  v = mulBp(v, s.scopeDemandBp[p.scope]);
  // Balancing Spätspiel: Erwartung je Umfang und Jahr (die Konkurrenzdichte rechnet weiter mit scopeDemandBp).
  v = mulBp(v, anchorValue(s.scopeEraAnchors[p.scope], d.year));
  // Etappe 6c.4: Marktgröße der Zielgruppe und ihre Passung zum Genre.
  v = mulBp(v, audienceDemandBp(data, p.audience, p.genre));
  // Etappe 6c.8: Übersetzungen erschließen die Sprachmärkte.
  v = mulBp(v, localizationFactor(data, p.languages, d.year));
  // MKT-F2: c_I · I_Release. ANNAHME: Das Interesse ist schon auf die erreichbare Basis gedeckelt (MKT-F1) und wird
  // deshalb nicht noch einmal mit der Reichweite multipliziert; Q_rel wirkt über den Abfall der Kurve.
  v += mulBp(interestOf(p), data.marketing.startWeekShareBp);
  v = mulBp(v, trendOf(state, p.genre, p.theme));
  v = mulBp(v, season(data, d.month));
  v = mulBp(v, competitionBp ?? competitionFactor(state, data, week - t, p.id ?? null));
  // PRD-R01: Reichweite des Typs (F2P: kostenlos erreicht mehr Spieler).
  v = mulBp(v, type.reachBp ?? BP_ONE);
  // Etappe 6c.4: Treue der Zielgruppe verlängert oder verkürzt die Kurve.
  return mulBp(v, expNegBp(mulBp(mulBp(decayK(data, scoreBp), type.decayFactorBp), audienceOf(data, p.audience).decayBp) * t));
}

/** MKT-R22: Auflage-Empfehlung = Nachfrage der ersten Wochen, auf die Mindestcharge aufgerundet. */
export function recommendedPrintRun(state: GameState, data: GameData, p: DemandSubject, scoreBp: Bp): number {
  let sum = 0;
  const year = dateOf(state.startYear, state.week).year;
  if (digitalOnly(data, p.platforms, year)) return 0;
  const competition = competitionFactor(state, data, state.week, p.id ?? null);
  for (let t = 0; t < data.sales.recommendWeeks; t++) sum += weeklyDemand(state, data, p, scoreBp, t, state.week + t, competition);
  sum = mulBp(sum, BP_ONE - digitalShare(data, p.platforms, year));
  const medium = mediumOf(data, platformById(data, p.platforms[0]!), year);
  return Math.max(medium.minBatch, divInt(sum + medium.minBatch - 1, medium.minBatch, 1) * medium.minBatch);
}

/**
 * Kosten einer Fertigung: Stückkosten des Datenträgers der Lead-Plattform plus Plattformgebühr je Stück (MKT-V03).
 * ANNAHME: Eine gemeinsame Auflage für alle Zielplattformen; Datenträger und Gebühr der Lead-Plattform.
 */
export function productionCost(state: GameState, data: GameData, project: Pick<Project, "platforms"> & { type?: string; sales?: { priceCent?: Cent } | null }, units: number): { costCent: Cent; leadWeeks: number; minBatch: number } {
  const year = dateOf(state.startYear, state.week).year;
  const lead = platformById(data, project.platforms[0]!);
  const medium = mediumOf(data, lead, year);
  // MRK-R25: Ab Beziehung 85 zahlt der Spieler 2 Punkte weniger Plattformgebühr (KI-Produkte tragen eine studioId).
  const feeBp = (project as { studioId?: number }).studioId === undefined ? playerFeeBp(state, data, lead) : lead.licenseFeeBp;
  const fee = mulBp(project.sales?.priceCent ?? grossPrice(data, project, year), feeBp);
  return { costCent: units * (medium.unitCostCent + fee), leadWeeks: medium.leadWeeks, minBatch: medium.minBatch };
}

/** Endpreis: Vollpreis des Jahres × Produkttyp × Preisfaktor der Lead-Plattform (ANNAHME, Smartphone). */
export function grossPrice(data: GameData, p: { type?: string; platforms?: readonly string[] }, year: number): Cent {
  const price = mulBp(priceOf(data, year), productType(data, p.type).priceBp);
  const lead = p.platforms?.[0];
  return lead ? mulBp(price, platformById(data, lead).priceBp ?? BP_ONE) : price;
}

/** Erlös je physisch verkauftem Stück: Preis abzüglich Händler- und Vertriebsanteil (MKT-R25), mit Einnahmen-Faktor des Presets. */
export function netPerUnit(state: GameState, data: GameData, type?: string, platforms?: readonly string[], factorBp: Bp = preset(state, data).revenueFactorBp, priceCent?: Cent): Cent {
  const price = priceCent ?? grossPrice(data, { type, platforms }, dateOf(state.startYear, state.week).year);
  return mulBp(mulBp(price, BP_ONE - data.sales.retailShareBp), factorBp);
}

/** MKT-R25: Erlös je digital verkauftem Stück; der Store behält 30 %, ab der Umsatzschwelle je Spiel 20 %. */
export function digitalNetPerUnit(
  state: GameState, data: GameData, p: { type?: string; platforms: readonly string[]; sales?: { priceCent?: Cent } | null }, revenueSoFar: Cent, factorBp: Bp = preset(state, data).revenueFactorBp,
): Cent {
  const s = data.sales;
  const share = revenueSoFar >= s.storeThresholdCent ? s.storeShareReducedBp : s.storeShareBp;
  const price = p.sales?.priceCent ?? grossPrice(data, p, dateOf(state.startYear, state.week).year);
  return mulBp(mulBp(price, BP_ONE - share), factorBp);
}

/** Durchschnittlicher Erlös je Stück aus physischem und digitalem Anteil (Prognosen). */
export function blendedNetPerUnit(state: GameState, data: GameData, p: { type?: string; platforms: readonly string[] }): Cent {
  const d = digitalShare(data, p.platforms, dateOf(state.startYear, state.week).year);
  return mulBp(netPerUnit(state, data, p.type, p.platforms), BP_ONE - d) + mulBp(digitalNetPerUnit(state, data, p, 0), d);
}

/** Erwarteter Ertrag bei einer Wertung über die ganze Laufzeit (Abbruch-Prognose, PRD-R44). */
export function expectedRevenue(state: GameState, data: GameData, project: Project, scoreBp: Bp): Cent {
  let units = 0;
  const competition = competitionFactor(state, data, state.week, project.id);
  for (let t = 0; t < 104; t++) units += weeklyDemand(state, data, project, scoreBp, t, state.week + t, competition);
  return units * blendedNetPerUnit(state, data, project);
}

/**
 * Wertung, mit der die Auflage-Empfehlung rechnet: Mitte des letzten Playtests, sonst ein neutraler Wert.
 * ANNAHME: Ohne Interesse und Vorbestellungen (Etappe 4) kennt das Studio die wahre Wertung vor dem Release nicht.
 */
export function printRunScore(data: GameData, project: Project): Bp {
  const t = project.playtests[project.playtests.length - 1];
  return t ? divInt(t.lowBp + t.highBp, 2, 1) : data.sales.neutralForecastBp;
}

/** Erstauflage zum Release: gefertigt während Gold und Zertifizierung, bezahlt beim Release (ANNAHME). */
export function startSales(state: GameState, data: GameData, project: Project, scoreBp: Bp): Cent {
  // MKT-V02: Ein Fertigungsauftrag erreicht mindestens die Mindestcharge.
  const minBatch = productionCost(state, data, project, 0).minBatch;
  // MKT-T09: Rein digitale Spiele haben keine Auflage.
  // MKT-V10: Shareware verschickt die Vollversion einzeln, ohne Auflage.
  // BTR-R20: Free-to-Play wird nur heruntergeladen (kein Preis, keine Auflage).
  const units = digitalOnly(data, project.platforms, dateOf(state.startYear, state.week).year) || project.releasePlan?.channel === "shareware" || freeToPlay(data, project)
    ? 0
    : Math.max(project.printRun ?? recommendedPrintRun(state, data, project, printRunScore(data, project)), minBatch);
  project.sales = {
    startWeek: state.week, scoreBp, stock: units, sold: 0, lost: 0, revenueCent: 0, weekRevenueCent: 0,
    weekly: [], firstWeekUnits: 0, shelfLost: false, orders: [], soldOutOffered: false, ended: false, demandFactorBp: BP_ONE,
    fanUnitsPerWeek: 0, fanWeeks: 0, licenseRoyaltyBp: 0, digitalSold: 0,
    competitionBp: competitionFactor(state, data, state.week, project.id),
  };
  // MKT-R36: Handelsmesse.
  const shelf = tradeShelfWeeks(state, data, project);
  if (shelf > 0) project.sales.shelfExtraWeeks = shelf;
  const plan = project.releasePlan;
  if (!plan) return productionCost(state, data, project, units).costCent;
  // MKT-R09, MKT-R27: Preis des Pakets mit Deluxe-Anteil; der Preis gegen den Standard verschiebt die Nachfrage.
  const r = data.release;
  const standard = grossPrice(data, project, dateOf(state.startYear, state.week).year);
  project.sales.priceCent = plan.deluxe ? mulBp(plan.priceCent, BP_ONE + r.deluxeAvgPriceBp) : plan.priceCent;
  project.sales.demandFactorBp = priceDemandFactor(data, plan.priceCent, standard);
  // MKT-R17 bis MKT-R19: Preis zum Release und Gewöhnung der Marke für Preissenkungen und Rabattwochen.
  project.sales.pricing = newPricing(state, project, project.sales.priceCent, standard);
  // MKT-V07: Vertriebsweg; MKT-V06: Beigaben verteuern jedes Stück.
  project.sales.channel = plan.channel;
  let cost = productionCost(state, data, project, units).costCent;
  const leadMedium = mediumOf(data, platformById(data, project.platforms[0]!), dateOf(state.startYear, state.week).year);
  if (plan.extras) cost += extrasCost(data, leadMedium.unitCostCent, units);
  if (plan.collectorUnits > 0 && units > 0) {
    project.sales.collector = { stock: plan.collectorUnits, sold: 0, priceCent: mulBp(plan.priceCent, r.collectorPriceBp) };
    const unit = mediumOf(data, platformById(data, project.platforms[0]!), dateOf(state.startYear, state.week).year).unitCostCent;
    cost += plan.collectorUnits * mulBp(unit, r.collectorUnitCostBp);
  }
  return cost;
}

/** ANNAHME (MKT-R09 Preis): Nachfrage · (1 + ε · (1 − Preis / Standard)), ε = 1,5, mindestens 0,25. */
export function priceDemandFactor(data: GameData, priceCent: Cent, standardCent: Cent): Bp {
  const r = data.release;
  const delta = BP_ONE - mulDiv(priceCent, BP_ONE, Math.max(1, standardCent), 1);
  return Math.max(r.priceDemandMinBp, BP_ONE + mulBp(r.priceElasticityBp, delta));
}

/** Nachproduktion: bezahlt bei Auftrag, verfügbar nach dem Vorlauf des Datenträgers (MKT-V01, MKT-R23). */
export function orderReprint(state: GameState, data: GameData, project: Project, units: number): Cent {
  const c = productionCost(state, data, project, units);
  project.sales!.orders.push({ arrivalWeek: state.week + c.leadWeeks, units });
  project.sales!.soldOutOffered = false;
  return c.costCent;
}

/**
 * Tick-Schritt 7: Verkäufe aller Produkte dieser Woche. Der digitale Anteil (MKT-R24) verkauft ohne Bestand; physisch
 * wird höchstens der Bestand verkauft, der Rest ist verloren. MKT-V11: Nach 8 Wochen unter 20 % der Startwoche halbiert
 * der Regalverlust die physische Nachfrage.
 */
export function salesStep(state: GameState, data: GameData): void {
  for (const p of [...state.projects].sort((a, b) => a.id - b.id)) {
    const s = p.sales;
    if (!s || s.ended) continue;
    // MKT-F4: In der Rabattwoche gilt der rabattierte Preis.
    const price = effectivePrice(s);
    const year = dateOf(state.startYear, state.week).year;
    const factor = preset(state, data).revenueFactorBp;
    // MKT-V07: Erlös über den Vertriebsweg (alte Spielstände ohne Weg: Handelsanteil wie bisher).
    const net = channelNet(data, s, price ?? grossPrice(data, p, year), factor) ?? netPerUnit(state, data, p.type, p.platforms, undefined, price);
    const shareware = isShareware(s);
    // MKT-V10: Shareware-Käufer zahlen über den Weg (80 %) abzüglich der Diskette; MKT-R26: Rückerstattungen digital.
    const digitalNet = shareware
      ? net - mediumOf(data, platformById(data, p.platforms[0]!), year).unitCostCent
      : mulBp(digitalNetPerUnit(state, data, { type: p.type, platforms: p.platforms, sales: { priceCent: price } }, s.revenueCent), BP_ONE - (s.refundBp ?? 0));
    s.weekRevenueCent = 0;
    for (const o of s.orders.filter((x) => x.arrivalWeek <= state.week)) s.stock += o.units;
    s.orders = s.orders.filter((x) => x.arrivalWeek > state.week);
    const t = state.week - s.startWeek;
    s.competitionBp ??= competitionFactor(state, data, s.startWeek, p.id);
    let demand = mulBp(weeklyDemand(state, data, p, s.scoreBp, t, state.week, s.competitionBp), s.demandFactorBp);
    // MKT-F4, MKT-R19: Rabattwoche und Gewöhnung der Marke.
    demand = mulBp(demand, pricingDemandFactor(state, data, s, p.brandId));
    // BTR-R14: Mundpropaganda aus der Community-Zufriedenheit.
    demand = mulBp(demand, wordOfMouthBp(data, p));
    // PRD-R71: Startfans der Marke kaufen in den ersten Wochen zusätzlich.
    if (t < s.fanWeeks) demand += s.fanUnitsPerWeek;
    // S05 V_Katalog: dauerhafter Back-Catalog-Absatz ab 2005 für Spiele ab Wertung 5 (ANNAHME: 0,5 % der Startwoche, digital).
    const catalog = catalogUnits(data, s, year);
    // MKT-R28, MKT-F5: Kopien sind verlorene Verkäufe; MKT-R55: geknackt in Woche H + 1.
    demand = applyPiracy(data, dateOf(state.startYear, state.week).year, p.platforms, s.protection, t, demand, brandById(state, p.brandId), p.genre, productType(data, p.type).requiresModule?.module === "netzwerk");
    crackCheck(state, data, p, t);
    // MKT-R53: Während eines Abo-Deals entfallen 40 % der Vollpreis-Verkäufe.
    demand = mulBp(demand, subscriptionFactor(data, s, state.week));
    // ZIE-R05: Branchenpreis +20 % für 8 Wochen.
    demand = mulBp(demand, playerAwardFactor(data, s, state.week));
    // MKT-V16: Mehr als die Restnachfrage aller Stufen kauft niemand.
    if (s.remaining) demand = Math.min(demand, totalRemaining(s.remaining));
    // MKT-V10: Bei Shareware spielen viele die freie Episode; ein Teil kauft das volle Spiel (ohne Bestand).
    // BTR-R20: Free-to-Play lädt jeder herunter, der will.
    const digital = shareware ? mulBp(demand, data.distribution.shareware.buyersBp) : freeToPlay(data, p) ? demand : mulBp(demand, digitalShare(data, p.platforms, year)) + catalog;
    const extraDigital = shareware || freeToPlay(data, p) ? 0 : catalog;
    // MKT-V08: Der Vertriebsweg erreicht nur einen Teil des Handels.
    let physical = shareware ? 0 : mulBp(demand - digital + extraDigital, channelReach(data, s));
    if (s.shelfLost) physical = mulBp(physical, data.sales.shelfFactorBp);
    // MKT-V04: Rückläufer aus dem Handel.
    applyReturns(state, data, p, t);
    const physicalSold = Math.min(physical, s.stock);
    const sold = physicalSold + digital;
    s.stock -= physicalSold;
    s.sold += sold;
    if (s.remaining) consume(s.remaining, sold);
    s.digitalSold += digital;
    s.lost += physical - physicalSold;
    s.weekRevenueCent = physicalSold * net + digital * digitalNet;
    // MKT-R43: Soundtrack und Artbook als kleine Zusatzprodukte (ANNAHME: 3 % der Käufer zu 15 % des Preises).
    if (year >= data.merch.extras.fromYear && sold > 0) s.weekRevenueCent += mulBp(sold, data.merch.extras.attachBp) * mulBp(price ?? grossPrice(data, p, year), data.merch.extras.priceBp);
    // MKT-R27: Die Sammler-Edition verkauft sich an einen kleinen Teil der Käufer, solange Bestand da ist.
    if (s.collector && s.collector.stock > 0) {
      const units = Math.min(s.collector.stock, mulBp(demand, data.release.collectorShareBp));
      s.collector.stock -= units;
      s.collector.sold += units;
      s.weekRevenueCent += units * netPerUnit(state, data, p.type, p.platforms, undefined, s.collector.priceCent);
    }
    // LIZ-R07: Royalty der fremden Engine auf den Netto-Umsatz über der Schwelle.
    accrueRoyalty(state, p.licenseContractId, s.revenueCent, s.weekRevenueCent);
    s.revenueCent += s.weekRevenueCent;
    // ENG-R30: Umsatzbeteiligung der lizenzierten Module geht wöchentlich an die Anbieter.
    if (s.licenseRoyaltyBp > 0 && s.weekRevenueCent > 0) payLicense(state, mulBp(s.weekRevenueCent, s.licenseRoyaltyBp));
    // LIZ-M04: Royalty des Lizenzspiels an den Inhaber der Marke.
    payBrandRoyalty(state, p.brandLicenseId, s.weekRevenueCent);
    if (s.weekly.length < 156) s.weekly.push(sold);
    brandSales(state, data, p, sold);
    if (t === 0) s.firstWeekUnits = sold;
    // MKT-V11; MKT-R36: Titel von der Handelsmesse behalten den Regalplatz länger.
    if (!s.shelfLost && t >= data.sales.shelfAfterWeeks + (s.shelfExtraWeeks ?? 0) && sold < mulBp(s.firstWeekUnits, data.sales.shelfThresholdBp)) s.shelfLost = true;
    if (t >= data.sales.minSalesWeeks && digital + physical === 0) s.ended = true;
    if (p.result && t === 0) {
      p.result.units = sold;
      p.result.revenueCent = s.weekRevenueCent;
    }
  }
}

/** S05 V_Katalog: Back-Catalog-Absatz je Woche (dauerhaft, digital) ab 2005. */
export function catalogUnits(data: GameData, s: ProductSales, year: number): number {
  const c = data.merch.catalog;
  if (year < c.fromYear || s.scoreBp < c.minScoreBp) return 0;
  return mulBp(s.firstWeekUnits, c.shareBp);
}

/** Lagerkosten je Monat für alle Bestände (MKT-V04). */
export function storageCost(state: GameState, data: GameData): Cent {
  return state.projects.reduce((sum, p) => sum + (p.sales && !p.sales.ended ? (p.sales.stock + (p.sales.returned ?? 0)) * data.sales.storageCentPerUnitMonth : 0), 0);
}
