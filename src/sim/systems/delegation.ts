// Delegation, Führungskapazität, Produzenten und Regeln (S07 FRM-R55 bis FRM-R62).
// ANNAHME: Stufen wirken auf Fokus-Karten: „manuell“ fragt immer, „regelbasiert“ wendet aktive Regeln an und fragt sonst,
// „vollautomatisch“ wendet Regeln an und nimmt sonst die Standardoption. Weitere Automatik je Bereich folgt mit ihren Systemen.
import { locationLeadUnits } from "./standorte";
import { type Bp, BP_ONE, clamp, divInt, mulBp, mulDiv } from "../num";
import {
  DELEGATION_AREAS, type DecisionRecord, type DelegationArea, type DelegationLevel, type DelegationParams, type DelegationRule,
  type DelegationState, type GameData, type GameEvent, type GameState, type Person, type Producer, type ProducerBrief, type Project,
  type RuleInput, type RuleValue,
} from "../model/types";
import { isFirstWeekOfMonth } from "../calendar";
import { stream } from "../rng";
import { contractQuality, log, personById } from "./firma";
import { applyDecision, validateDecide } from "./ereignisse";
import { activeProjects, remainingWeeks } from "./produkte/projects";
import { forecast } from "./produkte/forecast";

function P(data: GameData): DelegationParams {
  return data.delegation;
}

export function emptyDelegation(): DelegationState {
  const levels = Object.fromEntries(DELEGATION_AREAS.map((a) => [a, "manuell"])) as Record<DelegationArea, DelegationLevel>;
  return { levels, rules: [], nextRuleId: 1, history: [], producers: [], overloadWarned: false };
}

/** Schlüssel einer Fokus-Karte für Regeln: Ereignisart, bei Katalog-Ereignissen mit Datensatz. */
export function eventKey(e: Pick<GameEvent, "kind" | "defId">): string {
  return e.kind === "katalog" ? `katalog.${e.defId ?? ""}` : e.kind;
}

export function areaOf(data: GameData, key: string): DelegationArea {
  return P(data).eventAreas[key.startsWith("katalog.") ? "katalog" : key] ?? "projekte";
}

/** Mögliche Optionen einer Ereignisart für den Regel-Editor. */
export function optionsFor(data: GameData, key: string): string[] {
  if (key.startsWith("katalog.")) {
    const id = key.slice("katalog.".length);
    return data.catalog.events.find((d) => d.id === id)?.options.map((o) => o.id) ?? [];
  }
  return P(data).eventOptions[key] ?? [];
}

// ---------- Freischaltung und Führungskapazität (FRM-R56 bis FRM-R58) ----------

/** FRM-R56: Delegation ist frei, sobald drei Projekte gleichzeitig laufen (einmal erreicht, bleibt sie frei). */
export function delegationUnlocked(state: GameState): boolean {
  return state.unlocks["delegation"] !== undefined;
}

function producerOf(state: GameState, personId: number | null): Producer | undefined {
  return personId === null ? undefined : state.delegation.producers.find((p) => p.personId === personId);
}

export function producerProjects(state: GameState, personId: number): Project[] {
  return activeProjects(state).filter((p) => p.producerId === personId).sort((a, b) => a.id - b.id);
}

/** FRM-R58: 3 + Studioleitung (+3) + je Produzent seine Projekte + je Direktor 1. ANNAHME: Studioleitung kommt mit Standorten. */
export function leadCapacity(state: GameState, data: GameData): number {
  const c = P(data).capacity;
  const directors = state.people.filter((p) => p.key && P(data).directorRoles.includes(p.key.role)).length;
  const produced = state.delegation.producers.reduce((s, pr) => s + producerProjects(state, pr.personId).length, 0);
  // FRM-R32: Jeder weitere Standort bindet eine Einheit.
  return Math.max(0, c.base + produced + directors * c.director - locationLeadUnits(state, data));
}

/** Ist ein Bereich gerade in Gebrauch (dann zählt er manuell geführt als Einheit)? ANNAHME je Bereich. */
function areaInUse(state: GameState, data: GameData, area: DelegationArea): boolean {
  if (area === "personal") return state.people.length >= data.staff.teamMinStaff;
  if (area === "lizenzen") return state.licensing.contracts.some((c) => c.status !== "beendet");
  return false;
}

/** FRM-R57: manuell geführte Einheiten = Projekte ohne Produzent + manuelle Bereiche in Gebrauch. */
export function manualUnits(state: GameState, data: GameData): { projects: number[]; areas: DelegationArea[] } {
  const lv = state.delegation.levels;
  const projects = lv.projekte === "auto" ? [] : activeProjects(state).filter((p) => p.producerId === null).map((p) => p.id).sort((a, b) => a - b);
  const areas = DELEGATION_AREAS.filter((a) => a !== "projekte" && lv[a] === "manuell" && areaInUse(state, data, a));
  return { projects, areas };
}

/** FRM-R57: Tempo und Qualität manueller Einheiten −5 % je Einheit über der Kapazität; erst ab Freischaltung (ANNAHME). */
export function overloadFactor(state: GameState, data: GameData): Bp {
  if (!delegationUnlocked(state)) return BP_ONE;
  const u = manualUnits(state, data);
  const excess = u.projects.length + u.areas.length - leadCapacity(state, data);
  return excess <= 0 ? BP_ONE : clamp(BP_ONE - excess * P(data).overloadPerUnitBp, 0, BP_ONE);
}

/** Führungsfaktor eines Projekts in dieser Woche (Produzent = keine manuelle Einheit). */
export function leadershipFactor(state: GameState, data: GameData, project: Project): Bp {
  if (project.producerId !== null || state.delegation.levels.projekte === "auto") return BP_ONE;
  return overloadFactor(state, data);
}

/** Arbeitsgewichteter Mittelwert des Führungsfaktors; wirkt beim Release auf die Teamqualität. */
export function recordLeadership(project: Project, factor: Bp, done: Bp, work: Bp): void {
  if (work <= 0) return;
  project.leadershipBp = mulDiv(project.leadershipBp, done, done + work, 1) + mulDiv(factor, work, done + work, 1);
}

// ---------- Werte für Bedingungen ----------

/** Werte einer Fokus-Karte für die Bedingung (ganze Zahlen; Kasse in Tausend USD, Wertung in Zehnteln). */
export function eventValues(state: GameState, data: GameData, e: GameEvent): Partial<Record<RuleValue, number>> {
  const v: Partial<Record<RuleValue, number>> = { immer: 0, kasse: divInt(state.moneyCent, 100000, 1), personal: state.people.length };
  const project = e.projectId === null ? undefined : state.projects.find((p) => p.id === e.projectId);
  if (project && project.status === "laeuft") v.wertung = divInt(forecast(state, data, project).scoreBp, 1000, 1);
  if (e.applicant) v.staerke = e.applicant.strength[e.applicant.focus];
  const person = e.personId === undefined ? undefined : personById(state, e.personId);
  if (person?.key) v.loyalitaet = divInt(person.key.loyaltyBp, 100, 1);
  return v;
}

function brandOf(state: GameState, e: GameEvent): number | null {
  const project = e.projectId === null ? undefined : state.projects.find((p) => p.id === e.projectId);
  if (project) return project.brandId;
  if (e.productId !== undefined) return state.projects.find((p) => p.id === e.productId)?.brandId ?? null;
  return e.brandId ?? null;
}

function objectOf(state: GameState, e: GameEvent): string {
  const project = e.projectId === null ? undefined : state.projects.find((p) => p.id === e.projectId);
  if (project) return project.title;
  if (e.personId !== undefined) return personById(state, e.personId)?.name ?? "";
  if (e.applicant) return e.applicant.name;
  return "";
}

function matches(rule: DelegationRule, key: string, brandId: number | null, values: Partial<Record<RuleValue, number>>): boolean {
  if (!rule.active || rule.eventKey !== key) return false;
  if (rule.brandId !== null && rule.brandId !== brandId) return false;
  const x = values[rule.condition.value];
  if (x === undefined) return false;
  if (rule.condition.value === "immer") return true;
  if (rule.condition.op === "unter") return x < rule.condition.number;
  if (rule.condition.op === "ueber") return x > rule.condition.number;
  return x === rule.condition.number;
}

/** „annehmen“ bei Aufträgen: die freie Person mit der höchsten erreichbaren Qualität (ANNAHME). */
function concreteOption(state: GameState, data: GameData, e: GameEvent, option: string): string | null {
  if (e.options.includes(option)) return option;
  if (e.kind === "auftrag" && option === "annehmen" && e.offer) {
    // Team-Auftrag: die Regel „annehmen“ nimmt das vorgeschlagene Team.
    if (e.options.includes("annehmenTeam")) return "annehmenTeam";
    const offer = e.offer;
    const best = e.options.filter((o) => o.startsWith("annehmen:"))
      .map((o) => ({ o, q: contractQuality(data, personById(state, Number(o.slice("annehmen:".length)))!, offer.area) }))
      .sort((a, b) => b.q - a.q || a.o.localeCompare(b.o))[0];
    return best?.o ?? null;
  }
  return null;
}

// ---------- Protokoll (FRM-R61, FRM-R62) ----------

function record(state: GameState, data: GameData, e: GameEvent, option: string, by: DecisionRecord["by"], ruleId: number | null): void {
  const h = state.delegation.history;
  h.push({
    week: state.week, eventKey: eventKey(e), option: option.startsWith("annehmen:") ? "annehmen" : option, by, ruleId,
    object: objectOf(state, e), brandId: brandOf(state, e), values: eventValues(state, data, e),
  });
  const from = state.week - P(data).historyWeeks;
  while (h.length > 0 && h[0]!.week < from) h.shift();
}

/** Spieler-Antwort über die Eingabe „decide“: protokollieren, dann anwenden. */
export function playerDecision(state: GameState, data: GameData, e: GameEvent, option: string): void {
  record(state, data, e, option, "spieler", null);
  applyDecision(state, data, e, option);
  adoptRoutine(state, data, e, option);
}

/**
 * Prüfung Fable 03.11.2026 (FRM-R61): Routine-Karten (Verwertung, Abo, Kopierschutz, Gehaltsforderung) fragen nur beim
 * ersten Mal. Die Antwort des Spielers, nach abgelaufener Frist die Routine-Antwort, wird zur Regel „immer“; der Spieler
 * kann sie unter Delegation ändern oder löschen. Gelöschte Regeln kommen nicht wieder, solange eine Regel zur Karte fehlt
 * und sie erneut beantwortet wird.
 */
export function adoptRoutine(state: GameState, data: GameData, e: GameEvent, option: string | null): void {
  const key = eventKey(e);
  const routine = P(data).routine[key];
  if (routine === undefined || state.delegation.rules.some((r) => r.eventKey === key)) return;
  if (state.delegation.rules.length >= P(data).maxRules) return;
  const chosen = (option ?? routine).startsWith("annehmen") ? "annehmen" : option ?? routine;
  if (!optionsFor(data, key).includes(chosen)) return;
  state.delegation.rules.push({
    id: state.delegation.nextRuleId++, eventKey: key, condition: { value: "immer", op: "gleich", number: 0 }, option: chosen,
    brandId: null, active: true, createdWeek: state.week,
  });
  log(state, "log.routineRule", { card: key, choice: chosen });
}

/** FRM-R61: Nach zwei gleichen Antworten des Spielers schlägt die nächste Karte eine Regel mit dieser Option vor. */
export function suggestedRule(state: GameState, data: GameData, e: GameEvent): string | null {
  const key = eventKey(e);
  const mine = state.delegation.history.filter((r) => r.eventKey === key && r.by === "spieler");
  const n = P(data).suggestAfter;
  if (mine.length < n) return null;
  const last = mine.slice(-n);
  const option = last[0]!.option;
  if (!last.every((r) => r.option === option)) return null;
  if (state.delegation.rules.some((r) => r.active && r.eventKey === key)) return null;
  return concreteOption(state, data, e, option) ? option : null;
}

/** FRM-R62: Wie oft eine Regel im letzten Spieljahr gegriffen hat (gegriffen) bzw. hätte (alle passenden Karten). */
export function ruleHits(state: GameState, rule: DelegationRule): { fired: number; wouldHave: number } {
  const h = state.delegation.history;
  return {
    fired: h.filter((r) => r.ruleId === rule.id).length,
    wouldHave: h.filter((r) => matches({ ...rule, active: true }, r.eventKey, r.brandId, r.values)).length,
  };
}

// ---------- Regeln anlegen und verwalten (FRM-R60) ----------

export function validateCreateRule(state: GameState, data: GameData, input: RuleInput): string | null {
  if (state.delegation.rules.length >= P(data).maxRules) return "error.tooManyRules";
  if (!optionsFor(data, input.eventKey).includes(input.option)) return "error.unknownOption";
  if (!Number.isInteger(input.condition.number)) return "error.amount";
  if (input.brandId !== null && !state.brands.some((b) => b.id === input.brandId)) return "error.unknownBrand";
  if (input.answerEventId !== undefined) {
    const e = state.events.find((x) => x.id === input.answerEventId);
    if (!e || eventKey(e) !== input.eventKey) return "error.unknownEvent";
  }
  return null;
}

/** Legt die Regel an; „Nicht mehr fragen“ beantwortet die offene Karte gleich mit und hebt den Bereich auf „regelbasiert“. */
export function createRule(state: GameState, data: GameData, input: RuleInput): void {
  const rule: DelegationRule = {
    id: state.delegation.nextRuleId++, eventKey: input.eventKey, condition: { ...input.condition }, option: input.option,
    brandId: input.brandId, active: true, createdWeek: state.week,
  };
  state.delegation.rules.push(rule);
  const area = areaOf(data, input.eventKey);
  if (state.delegation.levels[area] === "manuell") state.delegation.levels[area] = "regel";
  if (input.answerEventId === undefined) return;
  const e = state.events.find((x) => x.id === input.answerEventId)!;
  const option = concreteOption(state, data, e, input.option);
  if (option && validateDecide(state, data, { type: "decide", eventId: e.id, option }) === null) playerDecision(state, data, e, option);
}

export function validateRuleId(state: GameState, ruleId: number): string | null {
  return state.delegation.rules.some((r) => r.id === ruleId) ? null : "error.unknownRule";
}

export function toggleRule(state: GameState, ruleId: number): void {
  const r = state.delegation.rules.find((x) => x.id === ruleId)!;
  r.active = !r.active;
}

export function deleteRule(state: GameState, ruleId: number): void {
  state.delegation.rules = state.delegation.rules.filter((r) => r.id !== ruleId);
}

/** FRM-R55: Stufen „regelbasiert“ und „vollautomatisch“ erst nach der Freischaltung (FRM-R56); „manuell“ immer. */
export function validateDelegation(state: GameState, area: string, level: string): string | null {
  if (!(DELEGATION_AREAS as readonly string[]).includes(area) || !["manuell", "regel", "auto"].includes(level)) return "error.unknownOption";
  if (level !== "manuell" && !delegationUnlocked(state)) return "error.delegationLocked";
  return null;
}

// ---------- Produzenten (FRM-R58, FRM-R59) ----------

export function validateAppoint(state: GameState, personId: number): string | null {
  const p = personById(state, personId);
  if (!p) return "error.unknownPerson";
  if (!delegationUnlocked(state)) return "error.delegationLocked";
  if (!p.key) return "error.notKeyPerson";
  if (producerOf(state, personId)) return "error.isProducer";
  if (p.assignment?.kind === "contract") return "error.personBound";
  return null;
}

/** Ein Produzent arbeitet nicht mehr selbst mit; Eigenschaften gezogen, Gehalt +20 % (ANNAHME). */
export function appointProducer(state: GameState, data: GameData, personId: number): void {
  const p = personById(state, personId)!;
  const pr = P(data).producer;
  const rng = stream(state, "personal");
  const draw = () => rng.range(pr.attrMin, pr.attrMax);
  const attrs = { planning: draw(), quality: draw(), risk: draw(), experience: draw(), communication: draw() };
  state.delegation.producers.push({ personId, attrs, maxProjects: attrs.experience >= pr.expertFrom ? pr.expertMaxProjects : pr.maxProjects });
  state.delegation.producers.sort((a, b) => a.personId - b.personId);
  p.assignment = null;
  p.transferWeeks = 0;
  p.salaryCent = mulBp(p.salaryCent, BP_ONE + pr.salaryRaiseBp);
  log(state, "log.producerAppointed", { person: p.name });
}

export function validateDismiss(state: GameState, personId: number): string | null {
  return producerOf(state, personId) ? null : "error.notProducer";
}

export function dismissProducer(state: GameState, personId: number): void {
  state.delegation.producers = state.delegation.producers.filter((p) => p.personId !== personId);
  for (const pr of state.projects) if (pr.producerId === personId) pr.producerId = null;
}

export function isProducer(state: GameState, person: Person): boolean {
  return producerOf(state, person.id) !== undefined;
}

export function validateProjectProducer(state: GameState, projectId: number, producerId: number | null, brief: ProducerBrief | null): string | null {
  const project = activeProjects(state).find((p) => p.id === projectId);
  if (!project) return "error.unknownProject";
  if (producerId === null) return null;
  const pr = producerOf(state, producerId);
  if (!pr) return "error.notProducer";
  if (project.producerId !== producerId && producerProjects(state, producerId).length >= pr.maxProjects) return "error.producerFull";
  if (brief && ((brief.minScoreBp !== null && brief.minScoreBp < 0) || (brief.budgetCent !== null && brief.budgetCent < 0))) return "error.amount";
  return null;
}

export function setProjectProducer(state: GameState, projectId: number, producerId: number | null, brief: ProducerBrief | null): void {
  const project = state.projects.find((p) => p.id === projectId)!;
  project.producerId = producerId;
  project.brief = producerId === null ? null : brief;
  project.briefWarned = false;
}

/** FRM-R59: Ist die Vorgabe gefährdet (Prognose unter Mindestwertung, Kosten über Budget, Termin nicht zu halten)? */
export function briefAtRisk(state: GameState, data: GameData, project: Project): string | null {
  const b = project.brief;
  if (!b || project.status !== "laeuft") return null;
  if (b.minScoreBp !== null && forecast(state, data, project).scoreBp < b.minScoreBp) return "brief.score";
  const left = remainingWeeks(state, data, project);
  if (b.targetWeek !== null && (left === null || state.week + left > b.targetWeek)) return "brief.date";
  if (b.budgetCent !== null && project.costCent > b.budgetCent) return "brief.budget";
  return null;
}

// ---------- Auswertung im Tick-Schritt Eingaben (FRM-R59, FRM-R60) ----------

function decideBy(state: GameState, data: GameData, e: GameEvent, option: string, by: DecisionRecord["by"], rule: DelegationRule | null): boolean {
  const concrete = concreteOption(state, data, e, option);
  if (!concrete || validateDecide(state, data, { type: "decide", eventId: e.id, option: concrete }) !== null) return false;
  record(state, data, e, concrete, by, rule?.id ?? null);
  applyDecision(state, data, e, concrete);
  log(state, by === "regel" ? "log.ruleFired" : by === "produzent" ? "log.producerDecided" : "log.autoDecided", {
    rule: rule?.id ?? 0, card: eventKey(e), choice: concrete.startsWith("annehmen:") ? "annehmen" : concrete, object: objectOf(state, e),
  });
  return true;
}

const OPS_AREAS: readonly DelegationArea[] = ["liveService", "patches"];

/** BTR-R03: Produzenten übernehmen den Betrieb ab drei laufenden Live-Produkten, sofern es einen Produzenten gibt. */
export function producersRunOperations(state: GameState, data: GameData): boolean {
  const live = state.projects.filter((p) => p.ops?.live && p.ops.live.shutdownWeek === null).length;
  return live >= data.liveService.delegation.producersFromLive && state.delegation.producers.length > 0;
}

/**
 * Prüfung Fable 03.11.2026 (FRM-R61): Routine-Karten mit Regel entscheiden noch in der Woche, in der sie entstehen
 * (Tick-Schritt 13), damit sie die Zeit nicht anhalten (UI-R66) und nicht als Entscheidung zählen.
 */
export function routineRuleStep(state: GameState, data: GameData): void {
  const routine = P(data).routine;
  for (const e of [...state.events].sort((a, b) => a.id - b.id)) {
    const key = eventKey(e);
    if (routine[key] === undefined || !state.events.includes(e)) continue;
    const values = eventValues(state, data, e);
    const brand = brandOf(state, e);
    const rule = [...state.delegation.rules].sort((a, b) => a.id - b.id).find((r) => matches(r, key, brand, values));
    if (rule) decideBy(state, data, e, rule.option, "regel", rule);
  }
}

/** Tick-Schritt 1: Regeln, Produzenten und Automatik beantworten offene Karten; Vorgaben und Überlastung melden. */
export function delegationStep(state: GameState, data: GameData): void {
  // Entlassene oder abgeworbene Produzenten verlassen ihre Projekte.
  for (const pr of [...state.delegation.producers]) if (!personById(state, pr.personId)) dismissProducer(state, pr.personId);
  if (!delegationUnlocked(state) && activeProjects(state).length >= P(data).unlockProjects) {
    state.unlocks["delegation"] = state.week;
    log(state, "log.delegationUnlocked");
  }
  for (const e of [...state.events].sort((a, b) => a.id - b.id)) {
    if (!state.events.includes(e)) continue;
    const key = eventKey(e);
    const level = state.delegation.levels[areaOf(data, key)];
    // Prüfung Fable 03.11.2026: Routine-Regeln gelten auch vor der Delegation (die Karte kam schon einmal).
    if (level !== "manuell" || P(data).routine[key] !== undefined) {
      const values = eventValues(state, data, e);
      const brand = brandOf(state, e);
      const rule = [...state.delegation.rules].sort((a, b) => a.id - b.id).find((r) => matches(r, key, brand, values));
      if (rule && decideBy(state, data, e, rule.option, "regel", rule)) continue;
    }
    // FRM-R59: Der Produzent meldet sich nur am Vertical Slice (Gate) und bei gefährdeter Vorgabe.
    const project = e.projectId === null ? undefined : state.projects.find((p) => p.id === e.projectId);
    if (project?.producerId != null && e.kind !== "gate" && briefAtRisk(state, data, project) === null) {
      if (decideBy(state, data, e, e.defaultOption, "produzent", null)) continue;
    }
    // BTR-R03, BTR-T10: Ab drei Live-Services entscheiden Produzenten die Pflicht-Entscheidungen im Betrieb.
    if (producersRunOperations(state, data) && OPS_AREAS.includes(areaOf(data, key))) {
      if (decideBy(state, data, e, e.defaultOption, "produzent", null)) continue;
    }
    if (level === "auto") decideBy(state, data, e, e.defaultOption, "auto", null);
  }
  if (!isFirstWeekOfMonth(state.startYear, state.week)) return;
  for (const project of activeProjects(state).filter((p) => p.producerId !== null)) {
    const risk = briefAtRisk(state, data, project);
    if (risk && !project.briefWarned) log(state, "log.briefAtRisk", { project: project.title, reason: risk });
    project.briefWarned = risk !== null;
  }
  // FRM-R57: Das Spiel schlägt bei Überlastung eine Führungskraft vor.
  const over = overloadFactor(state, data) < BP_ONE;
  if (over && !state.delegation.overloadWarned) log(state, "log.leadOverload");
  state.delegation.overloadWarned = over;
}

