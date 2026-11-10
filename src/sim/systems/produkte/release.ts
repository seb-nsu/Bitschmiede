import { freezeDeep } from "../../clone";
// Tick-Schritt 6: Releases der Woche mit Wertung, Wasserfall und Wissensbuch (PRD-R50 bis PRD-R57, UI-R95).
import { languageCost } from "./lokalisierung";
import { audienceOf } from "./zielgruppe";
import { settleContractGame } from "./auftragsspiele";
import { focusByPerson } from "../personal";
import { applyDemo, lateEnough, releaseInterest } from "../marketing";
import { dlcReleased, initOps } from "../betrieb";
import { initLive } from "../live";
import { finishEarlyAccess } from "./earlyaccess";
import { autopilotChannel, channelBlocker, refundRate } from "../vertrieb";
import { expectedUnits, initRemaining, subscriptionOnRelease } from "../verwertung";
import { autopilotProtection, availableProtections, newProtection, protectionLevel } from "../piraterie";
import { type Bp, BP_ONE, type Cent, clamp, divInt, medianInt, mulBp, mulDiv } from "../../num";
import { SCOPES, type GameData, type GameState, type PostponeInput, type Project, type ReleaseInput, type ReleasePlan, type Scope } from "../../model/types";
import { stream } from "../../rng";
import { dateOf } from "../../calendar";
import { agedValue, computeQuality } from "./quality";
import { computeScore, playerQNorm, pressMood, trendOf } from "./score";
import { recordRelease } from "../wissensbuch";
import { projectPeople } from "./projects";
import { assignedTo, log } from "../firma";
import { anchorValue, minScore, payProduction } from "../finanzen";
import { competitionFactor, digitalOnly, grossPrice, platformById, startSales } from "../markt";
import { chronicle } from "../katalog";
import { licenseRoyalty, projectEngineFactor, releaseLicenseFees } from "../engine";
import { dropProjectRequests } from "../bindung";
import { gainPlatformExperience, versionShares } from "../leistung";
import { brandRelease } from "../marken";
import { onLicensedRelease } from "../markenmarkt";
import { addModsEvent } from "../ereignisse";
import { onReleaseStaff } from "../personal";
import { qualityBonus } from "../buero";
import { certThreshold, launched, launchPlatform, onCertification, onPlayerRelease } from "../plattformen";

/**
 * ENG-R71 bis ENG-R73, ENG-R75: Technik-Update als Patch. Die Vorlage bekommt den Engine-Stand des Updates, E wird
 * neu berechnet, die Pressewertung bleibt. Kostenlos: die laufende Nachfrage steigt im Verhältnis neues E / altes E
 * (Plan Etappe 2, Punkt 10). Upgrade: verkauft zum Aufpreis an Besitzer der Vorlage. Mit 25 % Risiko zerstört das
 * Update Mods und Spielstände (Ereigniskette).
 */
function releasePatch(state: GameState, data: GameData, project: Project): void {
  const source = state.projects.find((p) => p.id === project.sourceId)!;
  const year = dateOf(state.startYear, state.week).year;
  const oldE = source.patchedEngineBp ?? source.result!.quality.engineFactorBp;
  const newE = projectEngineFactor(data, project.engine.levels, source.features, year).factorBp;
  const before = { engine: { ...source.engine, levels: { ...source.engine.levels } }, patchedEngineBp: source.patchedEngineBp, demandBp: source.sales?.demandFactorBp ?? BP_ONE };
  source.engine = { ...project.engine, levels: { ...project.engine.levels }, binding: "fest" };
  source.patchedEngineBp = newE;
  const type = data.productTypes.find((t) => t.id === project.type)!;
  if (type.patch === "kostenlos" && source.sales && !source.sales.ended) {
    source.sales.demandFactorBp = mulDiv(source.sales.demandFactorBp, newE, Math.max(1, oldE), 1);
  }
  project.status = "veroeffentlicht";
  project.phase = "launch";
  project.patchedEngineBp = newE;
  // Kein neues Presse-Urteil: das Ergebnis zeigt die Wertung der Vorlage.
  project.result = { ...source.result!, bars: source.result!.bars.map((b) => ({ ...b })), week: state.week, year, units: 0, revenueCent: 0, knowledgeKeys: [], reviews: [] };
  if (type.patch === "upgrade") payProduction(state, startSales(state, data, project, source.result!.scoreBp));
  state.events = state.events.filter((e) => e.projectId !== project.id);
  for (const p of assignedTo(state, project.id)) p.assignment = null;
  log(state, "log.techUpdate", { project: source.title, form: type.id, e: newE });
  chronicle(state, "log.techUpdate", { project: source.title, form: type.id, e: newE });
  // ENG-R75: „Update zerstört Mods und Spielstände“; das Risiko sinkt mit QA-Kapazität (ANNAHME: ohne QA-Abteilung 25 %).
  if (stream(state, "projekte").uniformBp() < data.techUpdate.modsBrokenRiskBp) {
    state.techUndo = [...state.techUndo.filter((u) => u.projectId !== source.id), { projectId: source.id, ...before }];
    addModsEvent(state, data, source.id);
  }
}

export function releaseProject(state: GameState, data: GameData, project: Project): void {
  if (data.productTypes.find((t) => t.id === project.type)?.patch) {
    releasePatch(state, data, project);
    return;
  }
  const rng = stream(state, "projekte");
  // Day-One-Patch: Die Presse testet die gepatchte Fassung; das Team bleibt danach gebunden (S05, vereinfacht).
  if (project.dayOnePatch) project.bugsBp -= mulBp(project.bugsBp, data.events.dayOnePatch.bugReductionBp);
  const quality = computeQuality(data, state, {
    ...project, people: projectPeople(state, data, project), engineLevels: project.engine.levels, makeshift: project.makeshift, equipment: qualityBonus(state, data),
    focus: focusByPerson(state),
  });
  // Etappe 6c.4: Die Presse misst an der Erwartung der Zielgruppe (Enthusiasten strenger, Kinder milder).
  const qNormBp = mulBp(playerQNorm(data, state, project.scope), audienceOf(data, project.audience).expectationBp);
  const trendBp = trendOf(state, project.genre, project.theme);
  const mood = pressMood(data, state, rng);
  const score = computeScore(data, quality, qNormBp, trendBp, mood, minScore(state, data, quality.themeFitBp));
  const year = dateOf(state.startYear, state.week).year;
  project.status = "veroeffentlicht";
  project.phase = "launch";
  // PRD-R61: Versionen mit dem Stand der Plattform-Erfahrung beim Release; danach wächst die Erfahrung (MRK-R05).
  project.versionShareBp = versionShares(data, state, project.features, project.platforms);
  gainPlatformExperience(data, state, project.platforms);
  project.result = {
    week: state.week,
    year,
    quality,
    qNormBp,
    trendBp,
    baseBp: score.baseBp,
    bars: score.bars,
    scoreBp: score.scoreBp,
    bugsAtRelease: divInt(project.bugsBp, BP_ONE, 1),
    units: 0,
    revenueCent: 0,
    knowledgeKeys: [],
  };
  project.result.knowledgeKeys = recordRelease(state, project, quality, score.bars, trendBp);
  // S11: drei Magazine, Einzelwertung = Gesamtwertung ± Streuung 0,3, auf ganze Zehntel; eigener Strom (KRN-R21).
  const press = stream(state, "presse");
  project.result.reviews = data.quality.magazines.map((magazine) => ({
    magazine,
    scoreBp: clamp(divInt(press.normal(score.scoreBp, data.quality.magazineSpreadBp), 1000, 1) * 1000, data.quality.scoreMinBp, data.quality.scoreMaxBp),
  }));
  // TEC-R50: Qualität, Balken und Magazinwertungen ändern sich nach dem Release nie mehr; eingefroren teilt sie die Kopie.
  freezeDeep(project.result.quality);
  freezeDeep(project.result.bars);
  freezeDeep(project.result.reviews);
  state.releases.push(freezeDeep({ year, scope: project.scope, q: quality.q }));
  // MKT-V10: Die freie Shareware-Episode steigert das Interesse (ANNAHME +50 %).
  if (project.releasePlan?.channel === "shareware") {
    project.marketing.interest = mulBp(project.marketing.interest, BP_ONE + data.distribution.shareware.interestBp);
  }
  // MKT-R05, MKT-R07: Demo zum Release, Interesse einfrieren, Enttäuschung; die Spielerwertung steuert die Kurve.
  const hype = releaseInterest(state, data, project, score.scoreBp);
  project.result.userScoreBp = hype.userScoreBp;
  project.result.interestAtRelease = hype.interest;
  project.result.fairInterest = hype.fair;
  if (hype.userScoreBp < score.scoreBp) log(state, "log.disappointment", { project: project.title, score: hype.userScoreBp });
  // Etappe 6c.3: Herstellung und Verkauf eines Auftragsspiels trägt der Auftraggeber; abgerechnet wird die Wertung.
  const production = startSales(state, data, project, hype.userScoreBp);
  if (!project.contractGame) payProduction(state, production);
  // Etappe 6c.8: Übersetzungen werden beim Release bezahlt.
  if (project.languages.length > 0) payProduction(state, project.languages.length * languageCost(data, project, dateOf(state.startYear, state.week).year));
  settleContractGame(state, data, project, score.scoreBp);
  // MKT-V16: Restnachfrage in drei Preisstufen aus dem erwarteten Absatz; MKT-R51: Abo-Angebot zum Release.
  project.sales!.expectedUnits = expectedUnits(state, data, project, hype.userScoreBp);
  project.sales!.remaining = initRemaining(state, data, project, project.sales!.expectedUnits);
  const fans = brandRelease(state, data, project, score.scoreBp);
  // MKT-V06: Beigaben binden die Fans (ANNAHME: +5 % Fan-Käufe).
  // Etappe 6c.4: Fanbindung der Zielgruppe.
  const fanWeek = mulBp(fans.perWeek, audienceOf(data, project.audience).fansBp);
  project.sales!.fanUnitsPerWeek = project.releasePlan?.extras ? mulBp(fanWeek, BP_ONE + data.distribution.extras.fansBp) : fanWeek;
  // MKT-R26: Rückerstattungsquote nach Länge und Bugs.
  project.sales!.refundBp = refundRate(state, data, project, project.result.bugsAtRelease);
  project.sales!.fanWeeks = fans.weeks;
  // LIZ-M05, LIZ-M12: Qualitätsklausel und Müdigkeit eines Lizenzspiels (Port und Addon zählen nicht als Spiel).
  if (project.type === "standard") onLicensedRelease(state, data, project.brandLicenseId, score.scoreBp);
  releaseLicenseFees(state, data, project);
  project.sales!.licenseRoyaltyBp = licenseRoyalty(state, data, project);
  // MKT-R29, MKT-R31: Kopierschutz aus dem Paket; die Middleware kostet eine Umsatzbeteiligung (ANNAHME 2 %).
  if (project.releasePlan) {
    // MKT-V06: Beigaben wirken wie die Handbuch- oder Codeabfrage, wenn sonst kein Schutz gewählt ist.
    const level = project.releasePlan.extras && project.releasePlan.protection === "keiner" ? data.distribution.extras.protectionAs : project.releasePlan.protection;
    project.sales!.protection = newProtection(state, data, level);
    project.sales!.licenseRoyaltyBp += protectionLevel(data, level).royaltyBp ?? 0;
  }
  dropProjectRequests(state, project.id);
  // BTR-R05, BTR-R11: Betrieb beginnt mit dem Release (Bugs nach Schwere, Zufriedenheit aus der Spielerwertung).
  project.ops = initOps(data, project);
  // BTR-R15: MMO, Live-Service und F2P bekommen eine Spielerbasis.
  project.ops.live = initLive(state, data, project);
  dlcReleased(state, data, project);
  // MKT-R50: 1.0 nach dem Early Access.
  finishEarlyAccess(state, data, project);
  // MRK-R19: Launch-Titel haben −50 % Konkurrenzdichte und +20 % Interesse (ANNAHME bis Etappe 4: Nachfrage).
  if (launchPlatform(state, data, project.platforms, state.week)) {
    project.result.launchTitle = true;
    project.sales!.competitionBp = competitionFactor(state, data, state.week, project.id, data.makers.launchDensityBp);
    project.sales!.demandFactorBp = mulBp(project.sales!.demandFactorBp, data.makers.launchInterestBp);
  }
  subscriptionOnRelease(state, data, project);
  onPlayerRelease(state, data, project, score.scoreBp);
  onReleaseStaff(state, data, project, score.scoreBp);
  state.events = state.events.filter((e) => e.projectId !== project.id);
  if (project.dayOnePatch) project.patchWeeksLeft = data.events.dayOnePatch.weeks;
  else for (const p of assignedTo(state, project.id)) p.assignment = null;
  log(state, "log.released", { project: project.title, score: score.scoreBp });
  chronicle(state, "log.released", { project: project.title, score: score.scoreBp });
}

export function needsCertification(data: GameData, project: Project): boolean {
  return project.platforms.some((id) => platformById(data, id).certification);
}

/**
 * Tick-Schritt 6. PRD-R26, MKT-R13: Konsolen-Zielplattformen verlangen eine Zertifizierung von 4 Wochen ab Gold;
 * liegen die offenen Bugs dann über der Schwelle, scheitert sie und verschiebt den Release um 4 Wochen (MKT-T14).
 * ANNAHME: Schwelle als feste Zahl offener Bugs (data: certification.thresholdBugs), weil „50 je 10 Mio. Budget“
 * bei Budgets der 1980er unter einem Bug läge.
 */
export function releaseStep(state: GameState, data: GameData): void {
  const cert = data.sales.certification;
  for (const p of [...state.projects].sort((a, b) => a.id - b.id)) {
    if (p.status !== "bereit" || !p.releaseRequested) continue;
    // MRK-R17: Vor dem Plattformstart wartet der Release (Zertifizierung läuft schon).
    const waiting = p.platforms.some((id) => !launched(state, data, id));
    if (needsCertification(data, p) && !p.certPassed) {
      if (p.certWeeksLeft === null) {
        p.certWeeksLeft = cert.weeks;
        p.certAttempts += 1;
        log(state, "log.certStarted", { project: p.title });
        continue;
      }
      p.certWeeksLeft -= 1;
      if (p.certWeeksLeft > 0) continue;
      // MRK-R25: Unter Beziehung 30 prüft der Hersteller strenger.
      if (divInt(p.bugsBp, BP_ONE, 1) > certThreshold(state, data, p, cert.thresholdBugs)) {
        p.certWeeksLeft = cert.failDelayWeeks;
        p.certAttempts += 1;
        onCertification(state, data, p, false);
        log(state, "log.certFailed", { project: p.title, bugs: divInt(p.bugsBp, BP_ONE, 1) });
        continue;
      }
      p.certPassed = true;
      p.certWeeksLeft = null;
      onCertification(state, data, p, true);
    }
    if (waiting) continue;
    // MKT-R09: Termin aus dem Release-Paket.
    if (p.releasePlan && state.week < p.releasePlan.week) continue;
    releaseProject(state, data, p);
  }
}

/** Summe der besten Grundwerte (gealtert) für so viele Karten, wie der Umfang hat. */
function catalogTop(data: GameData, scope: Scope, year: number): Bp {
  const values = data.features.filter((f) => f.availableFrom <= year).map((f) => agedValue(data, f, year)).sort((a, b) => b - a);
  return values.slice(0, data.projects.featureSlots[scope]).reduce((s, v) => s + v, 0);
}

/**
 * ANNAHME (PRD-R56 ohne KI-Studios): Marktreferenz für Q_erw = Startwert · Fortschritt des Katalogs (beste Karten) ·
 * Fortschritt der Teamstärke der Branche (data: marketStrengthAnchors) · typischer Engine-Faktor der Branche
 * (data: marketEngineAnchors), jeweils gegenüber dem Startjahr der Daten (1980). Etappe 6c.10: Bezug ist das Datenjahr,
 * nicht das Startjahr der Partie, damit ein späterer Start die Erwartung seines Jahres vorfindet.
 */
export function marketQNorm(data: GameData, state: GameState, scope: Scope, year: number): Bp {
  const q = data.quality;
  const base = data.start.startYear;
  const catalog = mulDiv(q.qNormStartBp[scope], catalogTop(data, scope, year), Math.max(1, catalogTop(data, scope, base)), 1);
  const a = q.marketStrengthAnchors;
  const strength = mulDiv(catalog, anchorValue(a, year), Math.max(1, anchorValue(a, base)), 1);
  return mulDiv(strength, anchorValue(q.marketEngineAnchors, year), Math.max(1, anchorValue(q.marketEngineAnchors, base)), 1);
}

/**
 * PRD-R56: Q_erw je Umfang = Median-Q aller Releases des Vorjahres; unter fünf Releases Vorjahreswert · 1,03.
 * ANNAHME: Solange es keine fremden Releases gibt, gilt mindestens die Marktreferenz des Vorjahres; sonst stiege die
 * Wertung mit wachsendem Team und neuen Karten endlos (Headless-Lauf 1980–2000).
 * Läuft in der ersten Woche jedes Jahres (Kalender-Schritt, KRN-R12).
 */
export function updateQNorm(state: GameState, data: GameData): void {
  const year = dateOf(state.startYear, state.week).year;
  // Nur das Vorjahr zählt; ältere Releases fallen heraus, damit der Spielstand nicht wächst.
  state.releases = state.releases.filter((r) => r.year >= year - 1);
  for (const scope of SCOPES) {
    const qs = state.releases.filter((r) => r.year === year - 1 && r.scope === scope).map((r) => r.q);
    state.qNorm[scope] = qs.length >= data.quality.qNormMinReleases
      ? medianInt(qs)
      : Math.max(mulBp(state.qNorm[scope], data.quality.qNormFallbackGrowthBp), marketQNorm(data, state, scope, year - 1));
  }
}

// ---------- Release-Paket (MKT-R09, MKT-R12, MKT-R27) ----------

function yearNow(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

/** Frühester Termin: jetzt, bei Konsolen nach der Zertifizierung (MKT-R13, MKT-T14). */
export function earliestReleaseWeek(state: GameState, data: GameData, p: Project): number {
  if (!needsCertification(data, p) || p.certPassed) return state.week;
  return state.week + (p.certWeeksLeft ?? data.sales.certification.weeks);
}

/** Standardpreis des Projekts im laufenden Jahr (Vollpreis · Produkttyp · Plattform). */
export function standardPrice(state: GameState, data: GameData, p: Project): Cent {
  return grossPrice(data, p, yearNow(state));
}

/** MKT-R09, MKT-T07: das vorbelegte Paket. Vorbestellungen sind offen, sobald das Spiel angekündigt ist. */
export function defaultPlan(state: GameState, data: GameData, p: Project): ReleasePlan {
  return {
    week: earliestReleaseWeek(state, data, p), priceCent: standardPrice(state, data, p), deluxe: false, collectorUnits: 0,
    preorders: p.marketing.announcedWeek !== null, postponements: 0, protection: autopilotProtection(data, yearNow(state)),
    channel: autopilotChannel(state, data, p.platforms), extras: false,
  };
}

export function validateReleasePackage(state: GameState, data: GameData, p: Project, input: ReleaseInput): string | null {
  const r = data.release;
  const year = yearNow(state);
  if (input.week !== undefined && (!Number.isSafeInteger(input.week) || input.week < state.week)) return "error.releaseWeek";
  if (input.priceCent !== undefined) {
    const standard = standardPrice(state, data, p);
    if (!Number.isSafeInteger(input.priceCent)) return "error.amount";
    // MKT-R06: einen eigenen Preis gibt es erst ab 2000.
    if (year < r.priceFromYear && input.priceCent !== standard) return "error.priceLocked";
    if (input.priceCent < mulBp(standard, r.priceMinBp) || input.priceCent > mulBp(standard, r.priceMaxBp)) return "error.priceRange";
  }
  if (input.deluxe && year < r.deluxeFromYear) return "error.locked";
  if (input.collectorUnits !== undefined) {
    if (!Number.isSafeInteger(input.collectorUnits) || input.collectorUnits < 0 || input.collectorUnits > r.collectorMaxUnits) return "error.amount";
    if (input.collectorUnits > 0 && digitalOnly(data, p.platforms, year)) return "error.digitalOnly";
  }
  if (input.printRun !== undefined && input.printRun !== null && (!Number.isSafeInteger(input.printRun) || input.printRun < 0)) return "error.amount";
  if (input.demo === "vorab" && !lateEnough(data, p)) return "error.tooEarlyPhase";
  // MKT-R29: nur Stufen der Epoche.
  if (input.protection !== undefined && !availableProtections(data, year).some((l) => l.id === input.protection)) return "error.locked";
  // MKT-V07 bis MKT-V10: Vertriebsweg der Epoche; MKT-V06: Beigaben nur mit Datenträger.
  if (input.channel !== undefined) {
    const blocked = channelBlocker(state, data, p.platforms, input.channel);
    if (blocked) return blocked;
  }
  if (input.extras && digitalOnly(data, p.platforms, year)) return "error.digitalOnly";
  // BTR-R37: Startkapazität nur für Live-Produkte.
  if (input.serverCapacity !== undefined && input.serverCapacity !== null) {
    if (!Number.isSafeInteger(input.serverCapacity) || input.serverCapacity < 0) return "error.amount";
    if (!data.productTypes.find((t) => t.id === p.type)?.live) return "error.notLive";
  }
  return null;
}

/** MKT-R09: Paket bestätigen; fehlende Punkte bleiben beim Autopiloten. */
export function applyReleasePackage(state: GameState, data: GameData, p: Project, input: Partial<ReleaseInput>): void {
  const plan = defaultPlan(state, data, p);
  if (input.week !== undefined) plan.week = Math.max(plan.week, input.week);
  if (input.priceCent !== undefined) plan.priceCent = input.priceCent;
  if (input.deluxe !== undefined) plan.deluxe = input.deluxe;
  if (input.collectorUnits !== undefined) plan.collectorUnits = input.collectorUnits;
  if (input.preorders !== undefined) plan.preorders = input.preorders;
  if (input.protection !== undefined) plan.protection = input.protection;
  if (input.channel !== undefined) plan.channel = input.channel;
  if (input.extras !== undefined) plan.extras = input.extras;
  if (input.serverCapacity !== undefined) plan.serverCapacity = input.serverCapacity;
  p.releasePlan = plan;
  p.releaseRequested = true;
  if (input.printRun !== undefined) p.printRun = input.printRun;
  if (input.dayOnePatch !== undefined) p.dayOnePatch = input.dayOnePatch;
  if (input.demo !== undefined && !p.marketing.demoDone) {
    p.marketing.demo = input.demo;
    if (input.demo === "vorab") applyDemo(state, data, p);
  }
}

export function validatePostpone(state: GameState, p: Project | undefined, input: PostponeInput): string | null {
  if (!p || !p.releasePlan || p.status === "veroeffentlicht") return "error.unknownProject";
  if (!Number.isSafeInteger(input.week) || input.week <= p.releasePlan.week) return "error.releaseWeek";
  return null;
}

/** MKT-R12: Verschieben nach der Ankündigung kostet 10 % Interesse, nach Vorbestellungen 20 %. */
export function postponeRelease(state: GameState, data: GameData, p: Project, week: number): void {
  const plan = p.releasePlan!;
  plan.week = week;
  plan.postponements += 1;
  if (p.marketing.announcedWeek !== null) {
    const cost = plan.preorders ? data.release.postponePreorderInterestBp : data.release.postponeInterestBp;
    p.marketing.interest = mulBp(p.marketing.interest, BP_ONE - cost);
  }
  log(state, "log.postponed", { project: p.title, week });
}
