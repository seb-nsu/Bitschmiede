// Verbindliche Tick-Reihenfolge (S12 5.2, TEC-R02, TEC-R10, KRN-R10). Ein Tick ist genau eine Woche (KRN-R01).
// Der Prototyp belegt nur die Schritte, die er braucht; die übrigen stehen als Platzhalter an ihrer Stelle.
import { setPhaseFocus, validatePhaseFocus } from "./systems/produkte/phasenfokus";
import { setPolish, validatePolish } from "./systems/produkte/politur";
import { validateLanguages } from "./systems/produkte/lokalisierung";
import { contractGameStep, offerById } from "./systems/produkte/auftragsspiele";
import { aiMarketingStep, announce, applyDemo, clampBudget, creatorAccess, lateEnough, marketingStep } from "./systems/marketing";
import type { GameData, GameState, Input } from "./model/types";
import { stream } from "./rng";
import { setLive, validateSetLive } from "./systems/live";
import { setServer, validateSetServer } from "./systems/server";
import { searchStep, startSearch, validateSearch } from "./systems/suche";
import { earlyAccessStep, startEarlyAccess, validateEarlyAccess } from "./systems/produkte/earlyaccess";
import { operationsStep, planPatch, setOperations, validatePlanPatch, validateSetOperations } from "./systems/betrieb";
import { cloneData } from "./clone";
import { dateOf, isFirstWeekOfMonth, isFirstWeekOfYear } from "./calendar";
import {
  activeProjects, cancelProject, createProject, patchStep, pauseProject, progressProject, resumeProject, steerProject, workingOn,
  validateCreateProject, validateProjectControl, validateSteer,
} from "./systems/produkte/projects";
import { applyReleasePackage, postponeRelease, releaseStep, updateQNorm, validatePostpone, validateReleasePackage } from "./systems/produkte/release";
import { runPlaytest, validatePlaytest } from "./systems/produkte/forecast";
import { monthlyTrends, salesStep } from "./systems/markt";
import { lowerPrice, priceStep, validateSetPrice } from "./systems/preise";
import { tradeShowStep } from "./systems/messe";
import { awardStep } from "./systems/branchenpreise";
import { scenarioStep } from "./systems/szenarien";
import { canContinue, continuePlaying, endingStep, paused } from "./systems/spielende";
import { distributionStep } from "./systems/vertrieb";
import { exploitationStep, reissueStep, subscriptionStep } from "./systems/verwertung";
import { goalStep } from "./systems/ziele";
import { chooseAnnualGoal, motivationStep, validateAnnualGoal } from "./systems/motivation";
import { starSalaryStep } from "./systems/erfolg";
import { endgameStep, setChallenge, validateChallenge } from "./systems/endspiel";
import { moduleOfferStep } from "./systems/middlewareAngebot";
import { buyback, defend, hostileStep, setProtection, validateBuyback, validateDefend } from "./systems/feindlich";
import { publishingDecision, publishingOffer, publishingStep, validatePublishingDeal, validatePublishingOffer } from "./systems/publishing";
import { assignEngine, assignPerson, log, personById, personnelStep, validateMove } from "./systems/firma";
import { financeStep, moveOffice, repayLoan, takeLoan, validateLoan } from "./systems/finanzen";
import { eventStep, validateDecide } from "./systems/ereignisse";
import {
  buyModule, cancelJob, endLicense, engineBehindCheck, engineStep, foundEngine, licenseModule, planResearch, startMajor, validateCancelJob,
  validateEndLicense, validateFoundEngine, validateMajor, validateMiddleware, validatePlan, validatePlanResearch,
} from "./systems/engine";
import { brandMonth } from "./systems/marken";
import { applyEngineUpdates, setBinding, switchMajor, validateBinding, validateRequestPriority, validateSwitchMajor } from "./systems/bindung";
import { marketPhaseStep } from "./systems/marktphasen";
import { applyLocation, validateLocation } from "./systems/standorte";
import { futureStep, placeFutureBet, validateFutureBet } from "./systems/zukunft";
import { acquisitionStep, applyAcquire, applySubsidiary, validateAcquire, validateSubsidiary } from "./systems/uebernahmen";
import { applyIpo, assemblyStep, capitalRaise, setDividend, stockQuarter, validateCapitalRaise, validateDividend, validateIpo } from "./systems/boerse";
import { dealStep, handlePublisherOffer, pitchProject, publisherCancelled, publisherStep, validatePitch, validatePublisherOffer } from "./systems/publisher";
import { historicalStep, platformChronicle, unlockStep, yearbookStep } from "./systems/katalog";
import { closeStudio, generateWorld, studioFinanceStep, studioStep } from "./systems/ki/studios";
import { aiDecisionStep, aiProjectStep, aiSalesStep } from "./systems/ki/projekte";
import { learnFromPlayerReleases, strategyStep } from "./systems/ki/entscheidung";
import { rivalReleaseStep, rivalStep } from "./systems/ki/rivalen";
import {
  appointProducer, createRule, delegationStep, deleteRule, dismissProducer, isProducer, playerDecision, setProjectProducer, toggleRule,
  validateAppoint, validateCreateRule, validateDelegation, validateDismiss, validateProjectProducer, validateRuleId, routineRuleStep } from "./systems/delegation";
import {
  assignTeam, createTeam, crewWork, dissolveTeam, inQaTeam, qaTeamStep, setTeamFocus, setTeamMembers, validateTeamFocus, validateTeamMembers, firePerson, poach, validateCreateTeam, validateFire, validatePoach, validateStaffPolicy, validateTeamId,
} from "./systems/personal";
import {
  buyLevel, buyRoom, extendOffice, officeStep, sellRoom, validateBuyLevel, validateBuyRoom, validateExtend, validateSellRoom,
} from "./systems/buero";
import { makersStep, requestDevkit, validateRequestDevkit } from "./systems/plattformen";
import {
  brandMarketStep, offerBrand, PLAYER, takeOffer, validateOfferBrand, validateTakeOffer, validateWithdraw, withdrawOffer,
} from "./systems/markenmarkt";
import {
  licenseRequestDone, licensingStep, licensingWeekStep, setLicenseModel, setLicenseTemplate, validateLicenseModel, validateLicenseTemplate,
} from "./systems/lizenzen";

/** TEC-R20: Prüft eine Eingabe gegen den Zustand; null = gültig, sonst Textschlüssel des Fehlers. */
export function validateInput(state: GameState, data: GameData, input: Input): string | null {
  switch (input.type) {
    case "setLive":
      return validateSetLive(state, data, input);
    case "setServer":
      return validateSetServer(state, data, input);
    case "startEarlyAccess":
      return validateEarlyAccess(state, data, input);
    case "pitchPublisher":
      return validatePitch(state, data, input);
    case "location":
      return validateLocation(state, data, input);
    case "futureBet":
      return validateFutureBet(state, data, input);
    case "acquire":
      return validateAcquire(state, data, input);
    case "subsidiary":
      return validateSubsidiary(state, data, input);
    case "ipo":
      return validateIpo(state, data, input);
    case "dividend":
      return validateDividend(state, input);
    case "capitalRaise":
      return validateCapitalRaise(state, data, input);
    case "publisherOffer":
      return validatePublisherOffer(state, data, input);
    case "startSearch":
      return validateSearch(state, data, input);
    case "planPatch":
      return validatePlanPatch(state, data, input);
    case "setOperations":
      return validateSetOperations(state, data, input);
    case "foundEngine":
      return validateFoundEngine(state, input.name);
    case "requestDevkit":
      return validateRequestDevkit(state, data, input.platformId);
    case "setLicenseModel":
      return validateLicenseModel(state, input.model);
    case "setLicenseTemplate":
      return validateLicenseTemplate(state, input.template, input.terms);
    case "createProject":
      return validateCreateProject(state, data, input);
    case "steerProject":
      return validateSteer(state, data, input);
    case "release": {
      const p = state.projects.find((x) => x.id === input.projectId);
      if (!p) return "error.unknownProject";
      if (p.status !== "bereit") return "error.notReady";
      return validateReleasePackage(state, data, p, input);
    }
    case "setPrice":
      return validateSetPrice(state, state.projects.find((x) => x.id === input.projectId), input.priceCent);
    case "continuePlaying":
      return canContinue(state) ? null : "error.locked";
    case "annualGoal":
      return validateAnnualGoal(state, input.index);
    case "challenge":
      return validateChallenge(state, data, input.id, input.action);
    case "setBooth":
      return ["klein", "mittel", "gross"].includes(input.booth) ? null : "error.amount";
    case "setModuleOffer":
      return state.engine ? null : "error.locked";
    case "stockDefense":
      if (!state.stock.listed) return "error.notListed";
      if (input.action === "rueckkauf") return validateBuyback(state, data, input.shareBp ?? 0);
      if (input.action === "abwehr") return validateDefend(state, data);
      return input.action === "schutz" && typeof input.active === "boolean" ? null : "error.unknownOption";
    case "publishingOffer":
      return validatePublishingOffer(state, data, input.pitchId, input.package);
    case "publishingDeal":
      return ["zahlen", "kuerzen", "stoppen"].includes(input.action) ? validatePublishingDeal(state, input.dealId, input.action) : "error.unknownOption";
    case "guideSeen":
      return ["hidden", "skipped", "unlocks", "firsts"].includes(input.what) && typeof input.id === "string" && input.id.length <= 40 ? null : "error.amount";
    case "setPriceRule": {
      const r = input.rule;
      if (!Number.isSafeInteger(r.afterWeeks) || r.afterWeeks < 0 || !Number.isSafeInteger(r.discountBp)) return "error.amount";
      if (r.discountBp < 0 || r.discountBp > data.sales.pricing.ruleMaxDiscountBp) return "error.amount";
      return null;
    }
    case "postponeRelease":
      return validatePostpone(state, state.projects.find((x) => x.id === input.projectId), input);
    case "decide":
      return validateDecide(state, data, input);
    case "playtest":
      return validatePlaytest(state, data, input.projectId);
    case "pauseProject":
    case "cancelProject":
      return validateProjectControl(state, data, input.type, input.projectId);
    case "resumeProject":
      return validateProjectControl(state, data, input.type, input.projectId, input.people);
    case "takeLoan":
    case "repayLoan":
      return validateLoan(state, data, input.type, input.amountCent);
    case "moveOffice":
      return validateMove(state, data, input.office);
    case "buyHardware":
      return validateBuyLevel(state, data, "hardware", input.level);
    case "buyComfort":
      return validateBuyLevel(state, data, "comfort", input.level);
    case "buyRoom":
      return validateBuyRoom(state, data, input.room);
    case "sellRoom":
      return validateSellRoom(state, input.room);
    case "extendOffice":
      return validateExtend(state, data);
    case "offerBrand":
      return validateOfferBrand(state, data, input);
    case "withdrawBrandOffer":
      return validateWithdraw(state, input.offerId);
    case "takeBrandOffer":
      return validateTakeOffer(state, data, input.offerId);
    case "setMarketing": {
      const p = state.projects.find((x) => x.id === input.projectId);
      if (!p || p.status === "veroeffentlicht" || p.status === "abgebrochen") return "error.unknownProject";
      if (input.budgetPermille !== undefined && !Number.isSafeInteger(input.budgetPermille)) return "error.amount";
      if (input.announce && p.marketing.announcedWeek !== null) return "error.alreadyAnnounced";
      // MKT-R07: eine Demo vorab erst ab Beta; MKT-R08: Creator-Zugang ab 2010, einmal, nach der Ankündigung.
      if (input.demo === "vorab" && !lateEnough(data, p)) return "error.tooEarlyPhase";
      if (input.demo !== undefined && p.marketing.demoDone) return "error.demoDone";
      if (input.fairPlan !== undefined && !["auto", "nichts", "trailer", "demo"].includes(input.fairPlan)) return "error.unknownOption";
      if (input.creator) {
        if (dateOf(state.startYear, state.week).year < data.marketing.creatorFromYear) return "error.locked";
        if (p.marketing.creatorUsed) return "error.creatorUsed";
        if (p.marketing.announcedWeek === null || !lateEnough(data, p)) return "error.tooEarlyPhase";
      }
      return null;
    }
    case "setPrintRun": {
      const p = state.projects.find((x) => x.id === input.projectId);
      if (!p || p.status === "veroeffentlicht" || p.status === "abgebrochen") return "error.unknownProject";
      if (input.units !== null && (!Number.isSafeInteger(input.units) || input.units < 0)) return "error.amount";
      return null;
    }
    case "setBinding":
      return validateBinding(state, data, input.projectId, input.binding);
    case "switchMajor":
      return validateSwitchMajor(state, input.projectId);
    case "setRequestPriority":
      return validateRequestPriority(state, input.jobId, input.priority);
    case "licenseModule":
    case "buyModule":
      return validateMiddleware(state, data, input.type, input.vendor);
    case "endLicense":
      return validateEndLicense(state, input.module);
    case "planResearch":
      return validatePlanResearch(state, data, input.module);
    case "cancelEngineJob":
      return validateCancelJob(state, input.jobId);
    case "startMajorVersion":
      return validateMajor(state);
    case "setEnginePlan":
      return state.engine ? validatePlan(input.plan) : "error.noEngine";
    case "setDelegation":
      return validateDelegation(state, input.area, input.level);
    case "createRule":
      return validateCreateRule(state, data, input);
    case "toggleRule":
    case "deleteRule":
      return validateRuleId(state, input.ruleId);
    case "appointProducer":
      return validateAppoint(state, input.personId);
    case "dismissProducer":
      return validateDismiss(state, input.personId);
    case "setProjectProducer":
      return validateProjectProducer(state, input.projectId, input.producerId, input.brief);
    case "createTeam":
      return validateCreateTeam(state, data, input.name, input.personIds);
    case "dissolveTeam":
      return validateTeamId(state, input.teamId);
    case "declineContractGame":
      return offerById(state, input.offerId) ? null : "error.unknownOffer";
    case "setTeamFocus":
      return validateTeamFocus(state, data, input.teamId, input.focus);
    case "setLanguages":
      return validateLanguages(data, state.projects.find((p) => p.id === input.projectId), input.languages, dateOf(state.startYear, state.week).year);
    case "setPolish":
      return validatePolish(state.projects.find((p) => p.id === input.projectId), input.area);
    case "setPhaseFocus":
      return validatePhaseFocus(data, state.projects.find((p) => p.id === input.projectId), input.group, input.focus);
    case "teamMembers":
      return validateTeamMembers(state, data, input.teamId, input.personIds);
    case "assignTeam": {
      const err = validateTeamId(state, input.teamId);
      if (err) return err;
      // Etappe 6c.2: Ein QA-Team arbeitet an keinem Projekt.
      if (state.staff.teams.find((t) => t.id === input.teamId)!.focus === "qa" && (input.engine || input.projectId !== null)) return "error.qaTeam";
      if (input.engine) return state.engine ? null : "error.noEngine";
      if (input.projectId !== null && !activeProjects(state).some((p) => p.id === input.projectId)) return "error.unknownProject";
      return null;
    }
    case "setStaffPolicy":
      return validateStaffPolicy(input.targetSize);
    case "firePerson":
      return validateFire(state, input.personId);
    case "poach":
      return validatePoach(state, data, input.studioId, input.index, input.raiseBp);
    case "assign": {
      const person = personById(state, input.personId);
      if (!person) return "error.unknownPerson";
      if (person.assignment?.kind === "contract") return "error.personBound";
      if (isProducer(state, person)) return "error.isProducer";
      if (inQaTeam(state, person) && (input.engine || input.projectId !== null)) return "error.qaTeam";
      if (input.engine) return state.engine ? null : "error.noEngine";
      if (input.projectId !== null && !activeProjects(state).some((p) => p.id === input.projectId)) return "error.unknownProject";
      return null;
    }
  }
}

function applyInputsInPlace(state: GameState, data: GameData, inputs: readonly Input[]): void {
  for (const input of inputs) {
    if (validateInput(state, data, input) !== null) continue;
    switch (input.type) {
      case "foundEngine":
        foundEngine(state, data, input.name);
        log(state, "log.engineFounded", { engine: input.name.trim().slice(0, 40) });
        break;
      case "requestDevkit":
        requestDevkit(state, data, input.platformId);
        break;
      case "setDelegation":
        state.delegation.levels[input.area] = input.level;
        break;
      case "createRule":
        createRule(state, data, input);
        break;
      case "toggleRule":
        toggleRule(state, input.ruleId);
        break;
      case "deleteRule":
        deleteRule(state, input.ruleId);
        break;
      case "appointProducer":
        appointProducer(state, data, input.personId);
        break;
      case "dismissProducer":
        dismissProducer(state, input.personId);
        break;
      case "setProjectProducer":
        setProjectProducer(state, input.projectId, input.producerId, input.brief);
        break;
      case "createTeam":
        createTeam(state, input.name, input.personIds);
        break;
      case "dissolveTeam":
        dissolveTeam(state, input.teamId);
        break;
      case "declineContractGame":
        state.contractGames.offers = state.contractGames.offers.filter((o) => o.id !== input.offerId);
        break;
      case "setTeamFocus":
        setTeamFocus(state, data, input.teamId, input.focus);
        break;
      case "setLanguages":
        state.projects.find((p) => p.id === input.projectId)!.languages = [...input.languages].sort();
        break;
      case "setPolish":
        setPolish(state.projects.find((p) => p.id === input.projectId)!, input.area);
        break;
      case "setPhaseFocus":
        setPhaseFocus(state.projects.find((p) => p.id === input.projectId)!, input.group, input.focus);
        break;
      case "teamMembers":
        setTeamMembers(state, data, input.teamId, input.personIds);
        break;
      case "assignTeam":
        assignTeam(state, data, input.teamId, input.projectId, input.engine === true);
        break;
      case "setStaffPolicy":
        state.staff.salary = input.salary;
        state.staff.crunch = input.crunch;
        state.staff.targetSize = input.targetSize;
        break;
      case "firePerson":
        firePerson(state, data, input.personId);
        break;
      case "poach":
        poach(state, data, input.studioId, input.index, input.raiseBp);
        break;
      case "setLicenseModel":
        setLicenseModel(state, data, input.model);
        break;
      case "setLicenseTemplate":
        setLicenseTemplate(state, data, input.template, input.terms, input.applyToExisting);
        break;
      case "createProject":
        createProject(state, data, input);
        break;
      case "steerProject":
        steerProject(state, data, input);
        log(state, "log.steered", { project: state.projects.find((p) => p.id === input.projectId)!.title });
        break;
      case "release": {
        const p = state.projects.find((x) => x.id === input.projectId)!;
        // MKT-R09: Release-Paket bestätigen (fehlende Punkte vom Autopiloten, MKT-T07).
        applyReleasePackage(state, data, p, input);
        // Die Entscheidung übers Gold-Review ist damit getroffen.
        state.events = state.events.filter((e) => !(e.kind === "goldReview" && e.projectId === p.id));
        break;
      }
      case "decide":
        playerDecision(state, data, state.events.find((e) => e.id === input.eventId)!, input.option);
        break;
      case "playtest":
        runPlaytest(state, data, state.projects.find((p) => p.id === input.projectId)!);
        break;
      case "assign":
        if (input.engine) assignEngine(state, data, personById(state, input.personId)!);
        else assignPerson(state, data, personById(state, input.personId)!, input.projectId);
        break;
      case "setBinding":
        setBinding(state, data, input.projectId, input.binding);
        break;
      case "switchMajor":
        switchMajor(state, data, input.projectId);
        break;
      case "setRequestPriority":
        state.engine!.jobs.find((j) => j.id === input.jobId)!.priority = input.priority;
        break;
      case "licenseModule":
        licenseModule(state, data, input.vendor);
        break;
      case "buyModule":
        buyModule(state, data, input.vendor);
        break;
      case "endLicense":
        endLicense(state, input.module);
        break;
      case "planResearch":
        planResearch(state, data, input.module);
        break;
      case "cancelEngineJob":
        // LIZ-R34: Eine abgebrochene Anforderung eines Lizenznehmers gilt als abgelehnt.
        licenseRequestDone(state, state.engine!.jobs.find((j) => j.id === input.jobId)?.licensees, false);
        cancelJob(state, input.jobId);
        break;
      case "startMajorVersion":
        startMajor(state, data);
        break;
      case "setEnginePlan":
        state.engine!.plan = { ...input.plan };
        break;
      case "pauseProject":
        pauseProject(state, state.projects.find((p) => p.id === input.projectId)!);
        break;
      case "cancelProject": {
        const project = state.projects.find((p) => p.id === input.projectId)!;
        cancelProject(state, data, project);
        // FRM-R47: Ein Publisher-Projekt fragt nach Rückzahlung oder Übergabe.
        publisherCancelled(state, data, project);
        break;
      }
      case "pitchPublisher":
        pitchProject(state, data, input);
        break;
      case "location":
        applyLocation(state, data, input);
        break;
      case "futureBet":
        placeFutureBet(state, input);
        break;
      case "acquire":
        applyAcquire(state, data, input);
        break;
      case "subsidiary":
        applySubsidiary(state, data, input, (st) => closeStudio(state, data, st));
        break;
      case "ipo":
        applyIpo(state, data, input);
        break;
      case "dividend":
        setDividend(state, input);
        break;
      case "capitalRaise":
        capitalRaise(state, data, input);
        break;
      case "publisherOffer":
        handlePublisherOffer(state, data, input);
        break;
      case "resumeProject":
        resumeProject(state, data, state.projects.find((p) => p.id === input.projectId)!, input.people);
        break;
      case "takeLoan":
        takeLoan(state, data, input.amountCent);
        break;
      case "repayLoan":
        repayLoan(state, input.amountCent);
        break;
      case "moveOffice":
        moveOffice(state, data, input.office);
        break;
      case "buyHardware":
        buyLevel(state, data, "hardware", input.level);
        break;
      case "buyComfort":
        buyLevel(state, data, "comfort", input.level);
        break;
      case "buyRoom":
        buyRoom(state, data, input.room);
        break;
      case "sellRoom":
        sellRoom(state, data, input.room);
        break;
      case "extendOffice":
        extendOffice(state);
        break;
      case "offerBrand":
        offerBrand(state, data, input);
        break;
      case "withdrawBrandOffer":
        withdrawOffer(state, input.offerId);
        break;
      case "takeBrandOffer":
        takeOffer(state, data, input.offerId, PLAYER);
        break;
      case "setPrintRun":
        state.projects.find((x) => x.id === input.projectId)!.printRun = input.units;
        break;
      case "setLive":
        setLive(state, data, input);
        break;
      case "setServer":
        setServer(state, data, input);
        break;
      case "startEarlyAccess":
        startEarlyAccess(state, data, input);
        break;
      case "startSearch":
        startSearch(state, data, input);
        break;
      case "planPatch":
        planPatch(state, data, input);
        break;
      case "setOperations":
        setOperations(state, input);
        break;
      case "setPrice":
        lowerPrice(state, data, state.projects.find((x) => x.id === input.projectId)!, input.priceCent);
        break;
      case "continuePlaying":
        continuePlaying(state);
        break;
      case "annualGoal":
        chooseAnnualGoal(state, input.index);
        break;
      case "challenge":
        setChallenge(state, data, input.id, input.action);
        break;
      case "setBooth":
        state.fairBooth = input.booth;
        break;
      case "setModuleOffer":
        state.moduleOffer.active = input.active;
        break;
      case "stockDefense":
        if (input.action === "rueckkauf") buyback(state, data, input.shareBp!);
        else if (input.action === "abwehr") defend(state, data);
        else setProtection(state, input.active!);
        break;
      case "publishingOffer":
        publishingOffer(state, data, input.pitchId, input.package);
        break;
      case "publishingDeal":
        publishingDecision(state, data, input.dealId, input.action);
        break;
      case "guideSeen": {
        // Prüfung Fable 03.11.2026: Gesehen-Zustand gehört in den Spielstand (Spieltest an zwei Rechnern).
        const g = state.guideSeen;
        if (input.what === "hidden") g.hidden = true;
        else if (!g[input.what].includes(input.id)) g[input.what] = [...g[input.what], input.id].sort();
        break;
      }
      case "setPriceRule":
        state.priceRule = { active: input.rule.active, afterWeeks: input.rule.afterWeeks, discountBp: input.rule.discountBp, followCurve: input.rule.followCurve };
        break;
      case "postponeRelease":
        postponeRelease(state, data, state.projects.find((x) => x.id === input.projectId)!, input.week);
        break;
      case "setMarketing": {
        const p = state.projects.find((x) => x.id === input.projectId)!;
        // MKT-T18: 1.501 wird auf 1.500 begrenzt.
        if (input.budgetPermille !== undefined) p.marketing.budgetPermille = clampBudget(data, input.budgetPermille);
        if (input.autoAnnounce !== undefined) p.marketing.autoAnnounce = input.autoAnnounce;
        if (input.announce) announce(state, p);
        if (input.demo !== undefined) {
          p.marketing.demo = input.demo;
          if (input.demo === "vorab") applyDemo(state, data, p);
        }
        if (input.creator) creatorAccess(state, data, p);
        if (input.fairPlan !== undefined) p.marketing.fairPlan = input.fairPlan;
        break;
      }
    }
  }
  // FRM-R60: Regeln, Produzenten und Automatik werden im Schritt Eingaben ausgewertet.
  delegationStep(state, data);
}

/** Schritt 1 einzeln, z. B. wenn der Spieler in der Pause entscheidet; gleichwertig zu tick(state, inputs) bis Schritt 1. */
export function applyInputs(state: GameState, data: GameData, inputs: readonly Input[]): GameState {
  const s = cloneData(state);
  applyInputsInPlace(s, data, inputs);
  return s;
}

/** ZIE-R09, ZIE-R10: Nach der Insolvenz geht es nicht weiter; am Spielende nur mit „Weiterspielen“. */
function halted(state: GameState, inputs: readonly Input[]): boolean {
  return !!state.gameOver || (paused(state) && !(canContinue(state) && inputs.some((i) => i.type === "continuePlaying")));
}

/** tick(state, inputs) → state ohne Seiteneffekte (TEC-R02). */
export function tick(state: GameState, data: GameData, inputs: readonly Input[] = []): GameState {
  if (halted(state, inputs)) return state;
  return weekInPlace(cloneData(state), data, inputs);
}

/**
 * TEC-T05: dieselbe Woche wie tick, aber ohne Kopie; der übergebene Zustand wird fortgeschrieben. Nur für Headless-Läufe
 * (Balancing, KI-Welt), die den alten Zustand nicht mehr brauchen; Ergebnis und Prüfsumme sind gleich (TEC-T05 Test).
 */
export function advance(state: GameState, data: GameData, inputs: readonly Input[] = []): GameState {
  if (halted(state, inputs)) return state;
  return weekInPlace(state, data, inputs);
}

function weekInPlace(s: GameState, data: GameData, inputs: readonly Input[]): GameState {

  // 1 Eingaben und Regeln
  applyInputsInPlace(s, data, inputs);

  // 2 Kalender: jährliche Kalibrierung von Q_erw in Woche 1 (PRD-R56, KRN-R12); historische Termine; Plattform-Chronik
  if (isFirstWeekOfYear(s.week) && s.week > 0) updateQNorm(s, data);
  // Balancing 1.0: Hinweis, wenn die eigene Engine zurückfällt.
  if (isFirstWeekOfYear(s.week) && s.week > 0) engineBehindCheck(s, data);
  // Balancing Spätspiel (Entscheidung Projektleitung 04.11.2026): Stars verlangen mehr, wenn das Studio reich ist.
  if (isFirstWeekOfYear(s.week) && s.week > 0) starSalaryStep(s, data);
  historicalStep(s, data);
  // MRK-R59: Marktphase zum Jahreswechsel, vor der KI (Budgets, Gründungen, Teamgrößen).
  marketPhaseStep(s, data);
  // MRK-R57, MRK-R68: Wendepunkte und Gerüchte der Zukunftsepoche (nach der Phase, damit Markt-Wendepunkte sie setzen).
  futureStep(s, data);
  publisherStep(s, data);
  platformChronicle(s, data);
  makersStep(s, data);

  // 3 KI (S08 MRK-R33, S14 KI-R05): Jahreswechsel, Gründungen, freie Teams wählen Projekte. Die Schritte 1 und 2
  // ändern nichts, was die KI liest, außer der Woche; deshalb ist der Stand hier gleich dem Ende der Vorwoche (TEC-R10).
  if (!s.ai.generated) generateWorld(s, data);
  studioStep(s, data);
  licensingWeekStep(s, data);
  strategyStep(s, data);
  rivalStep(s, data);
  aiDecisionStep(s, data);

  // 4 Forschung und Engine (S03): Engine-Team, Updates, Wartung
  const engineUpdates = engineStep(s, data);
  for (const u of engineUpdates) licenseRequestDone(s, u.job?.licensees, true);
  applyEngineUpdates(s, data, engineUpdates);

  // 5 Projekte, nach ID (TEC-R09); Day-One-Patches veröffentlichter Projekte
  for (const p of [...s.projects].sort((a, b) => a.id - b.id)) {
    if (p.status === "veroeffentlicht") patchStep(s, p);
    else if (p.status === "laeuft" || p.status === "bereit") progressProject(s, data, p);
  }
  // Etappe 6c.2: Das QA-Team testet alle laufenden Projekte.
  qaTeamStep(s, data, s.projects, (p) => crewWork(s, data, workingOn(s, p.id), false, false));

  // 6 Releases (KI-Projekte rechnen Fortschritt und Release in einem Schritt, nach den Spielerprojekten)
  releaseStep(s, data);
  learnFromPlayerReleases(s, data);
  rivalReleaseStep(s, data);
  aiProjectStep(s, data);
  // S13 AUS-R40 bis AUS-R43: eigenes Publishing nach den KI-Projekten.
  publishingStep(s, data);

  // 7 Markt: Trends monatlich (TEC-R14), Platzhalter-Verkäufe der Releases dieser Woche
  if (isFirstWeekOfMonth(s.startYear, s.week)) monthlyTrends(s, data, stream(s, "markt"));
  brandMonth(s, data);
  // MKT-F1: Interesse der Projekte in Entwicklung (Spieler, dann KI), vor den Verkäufen.
  marketingStep(s, data);
  aiMarketingStep(s, data);
  // MKT-R35 bis MKT-R38: Branchenmesse und Entwicklerkonferenz.
  tradeShowStep(s, data);
  // ZIE-R03, MKT-R39: Branchenpreise auf der Messe.
  awardStep(s, data);
  // MKT-R17 bis MKT-R21, MRK-R41: Preiskurve und Rabattwochen vor den Verkäufen.
  priceStep(s, data);
  salesStep(s, data);
  // MKT-R47 bis MKT-R49: Early-Access-Verkäufe vor dem Release von 1.0.
  earlyAccessStep(s, data);
  aiSalesStep(s, data);
  // MKT-V12, MKT-V13: Angebote für Hardware-Bundle und Heft-Beilage.
  distributionStep(s, data);
  // MKT-V15 bis MKT-V24, MKT-R51: Verwertungen verkaufen, Vorschläge und Abo-Angebote.
  reissueStep(s, data);
  exploitationStep(s, data);
  subscriptionStep(s, data);

  // 8 Betrieb (S06): Bugfund, Patches, Zufriedenheit · 9 Lizenzen: Markenmarkt (S04 Abschnitt 13)
  operationsStep(s, data);
  brandMarketStep(s, data);

  // 10 Finanzen inklusive Abrechnung der Aufträge; vorher die Raten der Publisher-Verträge (FRM-R46)
  dealStep(s, data);
  financeStep(s, data);
  // FRM-R52, FRM-R53: Quartalszahlen der Börse und Hauptversammlung nach dem Finanz-Schritt.
  stockQuarter(s, data);
  // S13 AUS-R83, AUS-R90, AUS-R91: Verwässerung, feindliches Angebot, Schutz.
  hostileStep(s, data);
  assemblyStep(s, data);
  studioFinanceStep(s, data);
  // UEB-R01 bis UEB-R41: Übernahmen, Integration und Töchter nach dem Konto der KI-Studios.
  acquisitionStep(s, data);
  licensingStep(s, data);
  // S13 AUS-R70, AUS-R71: eigene Module einzeln an KI-Studios.
  moduleOfferStep(s, data);

  // 11 Personal
  personnelStep(s, data);
  // FRM-R76: gezielte Personalsuche liefert ihre Kandidaten.
  searchStep(s, data);
  officeStep(s, data);

  // 12 Ereignisse; Etappe 6c.3: Marktplatz der Auftragsspiele
  eventStep(s, data);
  contractGameStep(s, data);

  // 13 Abschluss: Routine-Regeln (Prüfung Fable, FRM-R61), Freischaltungen (KRN-R41), Jahrbuch (KRN-R62), Anzeigeeinheit nach KRN-R01, dann die nächste Woche
  routineRuleStep(s, data);
  unlockStep(s, data);
  // ZIE-R01, ZIE-R06: Meilensteine und langfristiges Ziel.
  goalStep(s, data);
  // ZIE-R15: Szenario-Ziel und Frist.
  scenarioStep(s, data);
  yearbookStep(s);
  // Prüfung Fable 03.11.2026: Jahresziel, Erzrivale, Epochen nach dem Jahrbuch (Jahreswechsel in Woche 51).
  motivationStep(s, data);
  // Endgame-Themen (Auftrag 04.11.2026): Platz-1-Jahre, Serverkrise, Herausforderungen.
  endgameStep(s, data);
  const released = s.projects.filter((p) => p.status === "veroeffentlicht").length;
  const ownEngineProject = s.projects.some((p) => p.engine.id === "eigen");
  if (released >= 2 || ownEngineProject || dateOf(s.startYear, s.week).year >= 1985) s.displayUnit = "woche";
  s.week += 1;
  // ZIE-R08, ZIE-R09, ZIE-R51: Spielende nach dem Wochenwechsel prüfen.
  endingStep(s, data);
  return s;
}
