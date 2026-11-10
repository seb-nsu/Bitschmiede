// Ereignisse und Entscheidungen (S01 KRN-R30 bis KRN-R36, A23, TEC-R13) für Prototyp 0b.
// Projekt-Ereignisse hängen am Projekt und zählen nicht gegen die Obergrenze; Welt-Ereignisse höchstens eines pro Woche.
import { applyAssembly, stockApplicantsBp, stockEventFor } from "./boerse";
import { applyCounterDecision } from "./uebernahmen";
import { applyReleasePackage, postponeRelease } from "./produkte/release";
import { marketingBoost } from "./marketing";
import { removeProtection } from "./piraterie";
import { applyDiscountDecision } from "./preise";
import { applyDistributionDecision } from "./vertrieb";
import { applyReissueDecision, applySubscription } from "./verwertung";
import { BP_ONE, divInt, mulBp } from "../num";
import { digitalOnly, digitalShare, netPerUnit, orderReprint, productionCost, weeklyDemand } from "./markt";
import { applyCatalogDecision, chainStep, forcedCatalog, isUnlocked, projectCatalog, worldCatalog } from "./katalog";
import { anchorValue, ledgerNow, payProduction, scaleToYear } from "./finanzen";
import { dateOf } from "../calendar";
import type { DecideInput, EventKind, GameData, GameEvent, GameState } from "../model/types";
import { stream } from "../rng";
import { rebuildRecommended, startMajor, validateMajor } from "./engine";
import { dropFeature, makeshiftFeature, missedRequests } from "./bindung";
import { versionShares } from "./leistung";
import { brandById, jubileeDue, sellCollection } from "./marken";
import { featureById } from "./produkte/quality";
import { applyLicenseDecision } from "./lizenzen";
import { activeProjects, cancelProject, pauseProject, progressShare } from "./produkte/projects";
import { reviewExtraEffort, suggestSwap } from "./produkte/forecast";
import { assignedTo, drawApplicant, drawContractOffer, log, maxPersonsNow, personById, startContract, contractTeam } from "./firma";
import { applyMakerDecision } from "./plattformen";

import { applyStaffDecision, hireApplicant } from "./personal";
import { applyUpgradeDecision } from "./buero";
import { applyBrandDecision } from "./markenmarkt";
import { applyOpsDecision } from "./betriebsereignisse";
import { phaseEffects } from "./marktphasen";
import { applyPublisherCancel } from "./publisher";
import { applyMerchDecision } from "./merch";
import { applySearchDecision } from "./suche";
import { applyShutdownSuggestion } from "./betriebsdelegation";
import { adoptRoutine } from "./delegation";

export type EventInit = Omit<GameEvent, "id" | "createdWeek" | "deadlineWeek">;

export function addEvent(state: GameState, data: GameData, init: EventInit): GameEvent {
  const event: GameEvent = {
    ...init, id: state.nextEventId, createdWeek: state.week,
    deadlineWeek: state.week + data.events.deadlineWeeks[init.scope],
  };
  state.nextEventId += 1;
  state.events.push(event);
  // Formel 5.7: Skandale wirken auf die Anlegerstimmung des laufenden Quartals.
  stockEventFor(state, data, event);
  return event;
}

function hasOpen(state: GameState, kind: EventKind, projectId: number | null = null): boolean {
  return [...state.events, ...state.eventQueue].some((e) => e.kind === kind && (projectId === null || e.projectId === projectId));
}

function releasedCount(state: GameState): number {
  return state.projects.filter((p) => p.status === "veroeffentlicht").length;
}

/** Personen, die einen Auftrag übernehmen können: alle, die nicht schon an einen Auftrag gebunden sind. */
function contractCandidates(state: GameState): number[] {
  return state.people.filter((p) => p.assignment?.kind !== "contract").map((p) => p.id);
}

// ---------- Auslöser (Tick-Schritt 12) ----------

function projectTriggers(state: GameState, data: GameData): void {
  for (const project of activeProjects(state).sort((a, b) => a.id - b.id)) {
    // PRD-R33: Prototyp-Review bei 30 % des Aufwands, als Angebot.
    if (project.status === "laeuft" && !project.reviewOffered && progressShare(project) >= data.events.prototypeReviewAtBp) {
      project.reviewOffered = true;
      const swap = suggestSwap(state, data, project);
      addEvent(state, data, swap
        ? { kind: "prototypReview", scope: "projekt", projectId: project.id, options: ["annehmen", "ablehnen"], defaultOption: "ablehnen", review: swap }
        : { kind: "prototypReview", scope: "projekt", projectId: project.id, options: ["ok"], defaultOption: "ok" });
    }
    // PRD-R22: Gate am Ende der Pre-Production (mittel) bzw. des Vertical Slice (groß, AAA; Etappe 6c.1).
    // Umsteuern setzt das Projekt fort; die Oberfläche öffnet dazu das Brett (PRD-R41).
    const pre = data.projects.phases[project.scope].find((x) => x.id === data.projects.gatePhase[project.scope]);
    if (project.status === "laeuft" && pre && !project.gateOffered && progressShare(project) >= pre.untilBp) {
      project.gateOffered = true;
      addEvent(state, data, { kind: "gate", scope: "projekt", projectId: project.id, options: ["fortsetzen", "umsteuern", "pausieren", "abbrechen"], defaultOption: "fortsetzen" });
    }
    // ENG-R53, ENG-T05: Anforderung zum Freeze nicht fertig: Pflicht-Entscheidung je Karte.
    for (const featureId of missedRequests(data, project)) {
      if (state.events.some((e) => e.kind === "anforderungVerpasst" && e.projectId === project.id && e.featureId === featureId)) continue;
      addEvent(state, data, {
        kind: "anforderungVerpasst", scope: "projekt", projectId: project.id, options: ["streichen", "verschieben", "notloesung"],
        defaultOption: "streichen", featureId, module: featureById(data, featureId).requires.module,
      });
    }
    // S02 Abschnitt 9: Kette „Kritischer Bug kurz vor Gold“.
    if (project.criticalBugPending) {
      project.criticalBugPending = false;
      const cb = data.events.criticalBug;
      const extra = Math.max(cb.minExtraBugs * 10000, mulBp(project.bugsBp, cb.extraShareBp));
      project.bugsBp += extra;
      addEvent(state, data, {
        kind: "kritischerBug", scope: "projekt", projectId: project.id,
        options: ["verschieben", "dayOnePatch", "soVeroeffentlichen"], defaultOption: "verschieben", bug: { extraBugsBp: extra },
      });
    }
    // PRD-R33: Gold-Review, sobald die Produktion fertig ist. Standard laut S02 Abschnitt 6: Termin halten.
    if (project.status === "bereit" && !project.goldOffered && !project.releaseRequested) {
      project.goldOffered = true;
      addEvent(state, data, {
        kind: "goldReview", scope: "projekt", projectId: project.id,
        options: ["veroeffentlichen", "testen", "dayOnePatch"], defaultOption: "veroeffentlichen",
      });
    }
  }
}

/**
 * S05 Abschnitt 9: „Auflage ausverkauft“ als Entscheidung mit Empfehlung (Nachfrage der nächsten Wochen), wenn der
 * Bestand leer ist, keine Nachproduktion unterwegs ist und noch Nachfrage besteht.
 */
function productTriggers(state: GameState, data: GameData): void {
  for (const p of [...state.projects].sort((a, b) => a.id - b.id)) {
    const s = p.sales;
    if (!s || s.ended || s.stock > 0 || s.orders.length > 0 || s.soldOutOffered) continue;
    // MKT-T09: Rein digitale Spiele haben keine Auflage, also auch keine Nachproduktion.
    if (digitalOnly(data, p.platforms, dateOf(state.startYear, state.week).year)) continue;
    if (weeklyDemand(state, data, p, s.scoreBp, state.week + 1 - s.startWeek, state.week + 1, s.competitionBp ?? undefined) === 0) continue;
    s.soldOutOffered = true;
    let units = 0;
    for (let i = 1; i <= data.sales.recommendWeeks; i++) units += weeklyDemand(state, data, p, s.scoreBp, state.week + i - s.startWeek, state.week + i, s.competitionBp ?? undefined);
    const physicalBp = BP_ONE - digitalShare(data, p.platforms, dateOf(state.startYear, state.week).year);
    units = mulBp(units, physicalBp);
    const c = productionCost(state, data, p, 1);
    const batch = Math.max(c.minBatch, divInt(units + c.minBatch - 1, c.minBatch, 1) * c.minBatch);
    // Erwarteter Absatz der Charge: Restnachfrage des nächsten Jahres ab Lieferung, höchstens die Charge.
    let remaining = 0;
    for (let i = c.leadWeeks; i < c.leadWeeks + 52; i++) remaining += weeklyDemand(state, data, p, s.scoreBp, state.week + i - s.startWeek, state.week + i, s.competitionBp ?? undefined);
    const expectedUnits = Math.min(mulBp(remaining, physicalBp), batch);
    addEvent(state, data, {
      kind: "nachproduktion", scope: "projekt", projectId: p.id, options: ["nachproduzieren", "nein"], defaultOption: "nein",
      reorder: {
        units: batch, costCent: productionCost(state, data, p, batch).costCent, leadWeeks: c.leadWeeks,
        expectedUnits, expectedRevenueCent: expectedUnits * netPerUnit(state, data, p.type, p.platforms),
      },
    });
  }
}

/** Welt-Ereignisse: höchstens maxWorldEventsPerWeek neue pro Woche (A23). Erst nach dem ersten Release. */
function worldTriggers(state: GameState, data: GameData, slotTaken: boolean): void {
  const rng = stream(state, "ereignisse");
  let budget = data.events.maxWorldEventsPerWeek - (slotTaken ? 1 : 0);
  const released = releasedCount(state);
  const a = data.applications;
  // Beide Zufallszahlen werden immer gezogen, damit der Strom nicht vom Verlauf abhängt.
  const rollApplication = rng.uniformBp();
  const rollContract = rng.uniformBp();
  // ZIE-R47: Die Entscheidungsdichte skaliert nur Angebote.
  const density = data.economy.decisionDensityBp[state.settings.decisionDensity];
  // Krisen haben Vorrang vor Angeboten (S01 5.1); die Zufallszahlen oben sind trotzdem gezogen.
  if (budget > 0 && forcedCatalog(state, data)) budget -= 1;
  if (budget > 0 && state.people.length < maxPersonsNow(state, data) && !hasOpen(state, "bewerbung") && isUnlocked(state, "bewerbungen") && released >= a.firstAfterReleases) {
    // „Die erste Stunde“: Die erste Bewerbung kommt planmäßig nach dem ersten Release.
    // MRK-R60: In der Krise hat der Arbeitsmarkt mehr gute Bewerber (ANNAHME: Wochenchance × 1,5).
    if (state.counters.applications === 0 || rollApplication < mulBp(mulBp(mulBp(a.chancePerWeekBp, density), phaseEffects(state, data).applicationsBp), stockApplicantsBp(state, data))) {
      state.counters.applications += 1;
      addEvent(state, data, {
        kind: "bewerbung", scope: "welt", projectId: null, options: ["einstellen", "ablehnen"], defaultOption: "ablehnen",
        applicant: drawApplicant(state, data, stream(state, "personal")),
      });
      budget -= 1;
    }
  }
  const c = data.contracts;
  if (budget > 0 && !hasOpen(state, "auftrag") && isUnlocked(state, "auftraege") && released >= c.unlockAfterReleases && contractCandidates(state).length > 0) {
    // Entscheidung Projektleitung 02.11.2026: Ab 2000 kommen Aufträge häufiger.
    const epochBp = c.epoch ? anchorValue(c.epoch.chanceBp, dateOf(state.startYear, state.week).year) : BP_ONE;
    if (state.counters.contractOffers === 0 || rollContract < mulBp(mulBp(c.chancePerWeekBp, density), epochBp)) {
      state.counters.contractOffers += 1;
      const offer = drawContractOffer(state, data, rng);
      // Team-Auftrag: ein Knopf für das vorgeschlagene Team; ohne genug freie Leute nur Ablehnen.
      const team = offer.team !== undefined && offer.team > 1;
      addEvent(state, data, {
        kind: "auftrag", scope: "welt", projectId: null,
        options: team
          ? [...(contractCandidates(state).length >= offer.team! ? ["annehmenTeam"] : []), "ablehnen"]
          : [...contractCandidates(state).map((id) => `annehmen:${id}`), "ablehnen"],
        defaultOption: "ablehnen",
        offer,
      });
      budget -= 1;
    }
  }
  // S01: Katalog-Ereignisse füllen die Woche, wenn noch kein Welt-Angebot entstanden ist (A23: höchstens eines).
  if (budget > 0) worldCatalog(state, data, density);
}

/** Steht in dieser Woche schon eine neue Entscheidung an (Projekt-Ereignis, Gate, Welt-Angebot)? */
function busyWeek(state: GameState): boolean {
  return state.events.some((e) => e.createdWeek === state.week);
}

/**
 * S01 5.2 Ereignisplaner: Ein Welt-Angebot, das in einer schon belegten Woche entsteht, wartet auf die nächste freie
 * Woche, höchstens plannerMaxDelayWeeks; dann kommt es trotzdem. Frist und Woche zählen ab dem Erscheinen.
 * Krisen (forced) warten nie. Liefert, ob diese Woche ein wartendes Angebot erschienen ist.
 */
function releaseQueued(state: GameState, data: GameData): boolean {
  const next = state.eventQueue[0];
  if (!next) return false;
  if (busyWeek(state) && state.week - next.createdWeek < data.events.plannerMaxDelayWeeks) return false;
  state.eventQueue.shift();
  next.createdWeek = state.week;
  next.deadlineWeek = state.week + data.events.deadlineWeeks.welt;
  state.events.push(next);
  return true;
}

function deferNewWorldEvents(state: GameState, data: GameData, before: ReadonlySet<number>, busy: boolean): void {
  if (!busy) return;
  const fresh = state.events.filter((e) => !before.has(e.id) && e.scope === "welt" && !isForced(data, e));
  if (fresh.length === 0) return;
  state.events = state.events.filter((e) => !fresh.includes(e));
  state.eventQueue.push(...fresh);
}

function isForced(data: GameData, e: GameEvent): boolean {
  return e.defId !== undefined && data.catalog.events.some((d) => d.id === e.defId && d.forced === true);
}

/** Tick-Schritt 12: abgelaufene Entscheidungen mit Standardantwort schließen (KRN-R34), dann Auslöser prüfen. */
/** ENG-R75, S03 Abschnitt 9: Kette „Update zerstört Mods und Spielstände“: entschädigen, zurücksetzen, Modder unterstützen. */
export function addModsEvent(state: GameState, data: GameData, productId: number): void {
  addEvent(state, data, { kind: "modsKaputt", scope: "projekt", projectId: null, options: ["entschaedigen", "zuruecksetzen", "modder"], defaultOption: "zuruecksetzen", productId });
}

/** PRD-R75: Vorschlag „Markenjubiläum“ zehn Jahre nach dem ersten Titel (keine Pflicht). */
function brandTriggers(state: GameState, data: GameData): void {
  for (const b of jubileeDue(state, data)) {
    b.jubileeOffered = true;
    addEvent(state, data, { kind: "markenjubilaeum", scope: "projekt", projectId: null, options: ["sammlung", "remaster", "nichts"], defaultOption: "nichts", brandId: b.id });
  }
}

/** ENG-R23: Neubau-Empfehlung als Entscheidung (Projekt-Platz, zählt nicht gegen Welt-Angebote). */
function engineTriggers(state: GameState, data: GameData): void {
  const module = rebuildRecommended(state, data);
  if (!module || hasOpen(state, "neubau")) return;
  state.engine!.lastRecommendWeek = state.week;
  addEvent(state, data, { kind: "neubau", scope: "projekt", projectId: null, options: ["jetzt", "spaeter"], defaultOption: "spaeter", module });
}

export function eventStep(state: GameState, data: GameData): void {
  for (const e of [...state.events].sort((a, b) => a.id - b.id)) {
    if (state.week < e.deadlineWeek) continue;
    // Eine Option kann ungültig geworden sein (z. B. Person nicht mehr frei); dann gilt der Standard.
    applyDecision(state, data, e, e.defaultOption);
    adoptRoutine(state, data, e, null);
    // Katalog-Ereignisse tragen ihre eigene Optionsbezeichnung; die Anzeige braucht dafür die Definition.
    log(state, "log.expired", e.defId ? { kind: e.kind, def: e.defId, option: e.defaultOption } : { kind: e.kind, option: e.defaultOption });
  }
  projectTriggers(state, data);
  engineTriggers(state, data);
  brandTriggers(state, data);
  projectCatalog(state, data);
  productTriggers(state, data);
  // Ein wartendes Angebot belegt den Welt-Platz dieser Woche (A23); neue Welt-Angebote warten, wenn die Woche belegt ist.
  // KRN-R32, MRK-R54: eine fällige Ketten-Stufe geht vor und belegt den Platz; wartende Angebote warten dann weiter.
  const chained = chainStep(state, data);
  const released = chained ? false : releaseQueued(state, data);
  const busy = chained || busyWeek(state);
  const before = new Set(state.events.map((e) => e.id));
  worldTriggers(state, data, released || chained);
  deferNewWorldEvents(state, data, before, busy);
}

/** Einmalige Kosten aus einer Entscheidung, im Monatsbuch unter „Sonstiges“. */
function payCatalogCost(state: GameState, cent: number): void {
  state.moneyCent -= cent;
  ledgerNow(state).costs.other += cent;
}

// ---------- Antworten (Tick-Schritt 1) ----------

export function validateDecide(state: GameState, data: GameData, input: DecideInput): string | null {
  const event = state.events.find((e) => e.id === input.eventId);
  if (!event) return "error.unknownEvent";
  if (!event.options.includes(input.option)) return "error.unknownOption";
  if (input.option.startsWith("annehmen:")) {
    const person = personById(state, Number(input.option.slice("annehmen:".length)));
    if (!person) return "error.unknownPerson";
    if (person.assignment?.kind === "contract") return "error.personBound";
  }
  if (event.kind === "bewerbung" && input.option === "einstellen" && state.people.length >= maxPersonsNow(state, data)) return "error.teamFull";
  // FRM-R76: Einstellungen aus der Suche zählen gegen dieselbe Grenze.
  if (event.kind === "suche" && input.option.startsWith("einstellen:") && state.people.length >= maxPersonsNow(state, data)) return "error.teamFull";
  return null;
}

export function applyDecision(state: GameState, data: GameData, event: GameEvent, option: string): void {
  state.events = state.events.filter((e) => e.id !== event.id);
  const project = event.projectId === null ? undefined : state.projects.find((p) => p.id === event.projectId);
  switch (event.kind) {
    case "launchAnfrage":
    case "exklusivdeal":
      applyMakerDecision(state, data, event, option);
      break;
    case "hardwareUpgrade":
      applyUpgradeDecision(state, data, option);
      break;
    case "markenanfrage":
    case "konkursmasse":
      applyBrandDecision(state, data, event, option);
      break;
    case "abwerbung":
    case "gehaltsforderung":
      applyStaffDecision(state, data, event.kind, event.personId, option);
      break;
    case "kooperation":
    case "lizenzanfrage":
    case "grosskunde":
    case "preisschock":
      applyLicenseDecision(state, data, event, option);
      break;
    case "prototypReview":
      if (option === "annehmen" && project && event.review && project.status === "laeuft") {
        const features = project.features.map((f) => (f === event.review!.from ? event.review!.to : f)).sort();
        project.effortTotalBp = Math.max(project.effortDoneBp + data.events.reviewReworkEffortBp, project.effortTotalBp + reviewExtraEffort(data, project, features));
        project.features = features;
        project.versionShareBp = versionShares(data, state, features, project.platforms);
        log(state, "log.reviewAccepted", { project: project.title, from: event.review.from, to: event.review.to });
      }
      break;
    case "goldReview":
      if (!project || project.status !== "bereit") break;
      // MKT-R09: Das Gold-Review bestätigt das vorbelegte Release-Paket.
      if (option === "veroeffentlichen") applyReleasePackage(state, data, project, {});
      if (option === "dayOnePatch") applyReleasePackage(state, data, project, { dayOnePatch: true });
      break;
    case "hardwareBundle":
    case "heftBeilage":
      // MKT-V12, MKT-V13: Festbetrag für Bundle bzw. Beilage.
      applyDistributionDecision(state, data, event.kind, event.platformDeal, option, project);
      break;
    case "verwertung":
      // MKT-V24: Vorschlag einer Verwertung.
      applyReissueDecision(state, data, event, option);
      break;
    case "aboDeal":
      if (option === "annehmen") applySubscription(state, data, event, project);
      break;
    case "rabattwoche":
      // MKT-R18, A12: ohne Regel entscheidet der Spieler über die nächste Store-Aktion.
      applyDiscountDecision(state, option);
      break;
    case "schutzEntfernen":
      if (project && option === "entfernen") removeProtection(state, data, project);
      break;
    case "releaseDuell":
      // S05 Abschnitt 9: Konkurrent legt Release auf deine Woche: verschieben, halten oder Marketing erhöhen.
      if (!project || project.status === "veroeffentlicht") break;
      if (option === "verschieben" && project.releasePlan && event.duel) {
        postponeRelease(state, data, project, Math.max(project.releasePlan.week, event.duel.week) + data.ai.rivals.duel.windowWeeks + 1);
      }
      if (option === "marketing") marketingBoost(state, data, project);
      break;
    case "kritischerBug":
      if (!project || project.status === "veroeffentlicht") break;
      if (option === "verschieben") {
        const people = Math.max(1, assignedTo(state, project.id).length);
        project.effortTotalBp += data.events.criticalBug.delayWeeks * people * data.start.workPerPersonWeekBp;
        project.bugsBp = Math.max(0, project.bugsBp - (event.bug?.extraBugsBp ?? 0));
        if (project.status === "bereit") {
          project.status = "laeuft";
          project.readyWeek = null;
          project.goldOffered = false;
          state.events = state.events.filter((e) => !(e.kind === "goldReview" && e.projectId === project.id));
        }
      }
      if (option === "dayOnePatch") project.dayOnePatch = true;
      break;
    case "auftrag":
      if (option.startsWith("annehmen:") && event.offer) {
        const person = personById(state, Number(option.slice("annehmen:".length)));
        if (person && person.assignment?.kind !== "contract") {
          startContract(state, event.offer, person);
          log(state, "log.contractStarted", { client: event.offer.client, kind: event.offer.kind, person: person.name });
        }
      }
      if (option === "annehmenTeam" && event.offer) {
        const team = contractTeam(state, data, event.offer);
        if (team.length > 0) {
          startContract(state, event.offer, team[0]!, team);
          log(state, "log.contractTeamStarted", { client: event.offer.client, kind: event.offer.kind, n: team.length });
        }
      }
      break;
    case "katalog":
      applyCatalogDecision(state, data, event, option);
      break;
    case "gate":
      if (project && option === "pausieren") pauseProject(state, project);
      if (project && option === "abbrechen") cancelProject(state, data, project);
      break;
    case "nachproduktion":
      if (option === "nachproduzieren" && project?.sales && event.reorder) {
        payProduction(state, orderReprint(state, data, project, event.reorder.units));
        log(state, "log.reprint", { project: project.title, units: event.reorder.units });
      }
      break;
    case "anforderungVerpasst":
      if (!project || !event.featureId || !project.pendingFeatures.includes(event.featureId)) break;
      if (option === "streichen") dropFeature(state, data, project, event.featureId);
      if (option === "verschieben") project.waitingForEngine = true;
      if (option === "notloesung") makeshiftFeature(state, data, project, event.featureId);
      log(state, "log.requestMissed", { project: project.title, feature: event.featureId, option });
      break;
    case "schwererBug":
    case "serverAusfall":
    case "cheaterWelle":
    case "lootboxDebatte":
    case "datenleck":
    case "ligaAnfrage":
      applyOpsDecision(state, data, event, option);
      break;
    case "merchWahl":
      applyMerchDecision(state, event, option);
      break;
    case "suche":
      applySearchDecision(state, data, event, option);
      break;
    case "einstellenVorschlag":
      applyShutdownSuggestion(state, data, event.productId, option);
      break;
    case "publisherAbbruch":
      applyPublisherCancel(state, event, option);
      break;
    case "hauptversammlung":
      applyAssembly(state, data, event, option);
      break;
    case "gegenangebot":
      applyCounterDecision(state, data, event, option);
      break;
    case "modsKaputt": {
      const product = state.projects.find((p) => p.id === event.productId);
      const undo = state.techUndo.find((u) => u.projectId === event.productId);
      state.techUndo = state.techUndo.filter((u) => u.projectId !== event.productId);
      if (!product) break;
      const year = dateOf(state.startYear, state.week).year;
      const t = data.techUpdate;
      if (option === "entschaedigen") payCatalogCost(state, scaleToYear(data, t.compensationCent, year));
      if (option === "modder") {
        payCatalogCost(state, scaleToYear(data, t.modderCostCent, year));
        if (product.sales) product.sales.demandFactorBp = mulBp(product.sales.demandFactorBp, t.modderDemandBp);
      }
      if (option === "zuruecksetzen" && undo) {
        product.engine = undo.engine;
        product.patchedEngineBp = undo.patchedEngineBp;
        if (product.sales) product.sales.demandFactorBp = undo.demandBp;
      }
      log(state, "log.modsBroken", { project: product.title, option });
      break;
    }
    case "markenjubilaeum": {
      const b = brandById(state, event.brandId);
      if (!b) break;
      if (option === "sammlung") sellCollection(state, data, b);
      // ANNAHME: „Remaster“ erinnert an das Technik-Update (Produkttyp Remaster) und stärkt die Bekanntheit etwas.
      if (option === "remaster") {
        b.awarenessBp = Math.min(10000, b.awarenessBp + data.brands.awarenessPerTitleBp);
        log(state, "log.jubileeRemaster", { brand: b.name });
      }
      break;
    }
    case "neubau":
      if (option === "jetzt" && validateMajor(state) === null) {
        startMajor(state, data);
        log(state, "log.majorPlanned", { engine: state.engine!.name });
      }
      break;
    case "bewerbung":
      if (option === "einstellen" && event.applicant && state.people.length < maxPersonsNow(state, data)) {
        hireApplicant(state, data, event.applicant);
        log(state, "log.hired", { person: event.applicant.name });
      }
      break;
  }
}
