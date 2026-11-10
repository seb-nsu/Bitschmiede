// S10 Szenarien (ZIE-R13 bis ZIE-R15): Startzustand als Patch auf ein neues Spiel, Ziel mit Frist.
// ANNAHME (Plan Etappe 4, Annahme 6): Notfall-Umfang nach ZIE-R13 mit drei Szenarien; die KI-Welt entsteht nach dem
// Startjahr wie bisher (KRN-R75), eine Vorgeschichte des eigenen Studios gibt es noch nicht.
import { BP_ONE, clamp, mulBp } from "../num";
import type { GameData, GameState, ScenarioDef, ScenarioState } from "../model/types";
import { dateOf, isFirstWeekOfYear } from "../calendar";
import { stream } from "../rng";
import { AREAS } from "../model/types";
import { chronicle } from "./katalog";
import { drawApplicant, hire, log } from "./firma";
import { engineLeader } from "./ziele";
import { createProject } from "./produkte/projects";
import { releaseProject } from "./produkte/release";
import { activePlatforms } from "./markt";
import { becomeSubsidiary } from "./uebernahmen";
import { studioValue } from "./firmenwert";
import { liveStudios, studioPeople } from "./ki/studios";

export function scenarioDef(data: GameData, id: string | null | undefined): ScenarioDef | null {
  return id ? data.goals.scenarios.find((s) => s.id === id) ?? null : null;
}

export function initialScenario(data: GameData, id: string | null | undefined): ScenarioState | null {
  const def = scenarioDef(data, id);
  if (!def) return null;
  return { id: def.id, status: "laeuft", week: null, plannedEndYear: def.goal.plannedEndYear ?? null, warned: false };
}

/** ZIE-R14: Startzustand des Szenarios (nach den Gründern, vor dem Weltgenerator, damit Rivalen passen). */
export function applyScenarioStart(state: GameState, data: GameData, def: ScenarioDef): void {
  const st = def.start;
  if (st.moneyCent !== undefined) state.moneyCent = st.moneyCent;
  if (st.office) state.office.id = st.office;
  const rng = stream(state, "personal");
  for (let i = 0; i < (st.hires ?? 0); i++) hire(state, data, drawApplicant(state, data, rng));
  if (st.strengthBonus) {
    for (const p of state.people) for (const a of AREAS) p.strength[a] = clamp(p.strength[a] + st.strengthBonus, 0, 100);
  }
  for (const [maker, bp] of Object.entries(st.relations ?? {})) state.makers.relationBp[maker] = bp;
  if (st.reputationBp !== undefined) state.studioReputationBp = st.reputationBp;
  chronicle(state, "log.scenarioStart", { id: def.id });
}

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

function setResult(state: GameState, status: "gewonnen" | "verloren"): void {
  const sc = state.scenario!;
  sc.status = status;
  sc.week = state.week;
  const key = status === "gewonnen" ? "log.scenarioWon" : "log.scenarioLost";
  chronicle(state, key, { id: sc.id });
  log(state, key, { id: sc.id });
}

function bestScore(state: GameState): number {
  return state.projects.reduce((m, p) => (p.status === "veroeffentlicht" && p.result ? Math.max(m, p.result.scoreBp) : m), 0);
}

/**
 * Rette die Konsole (ANNAHME zur Regel): Der Hersteller plant das Aus; jedes Jahr mit mindestens einem eigenen Spiel ab
 * Mindestwertung auf der Plattform verschiebt das geplante Ende auf das Folgejahr. Liegt ein Jahreswechsel hinter dem
 * geplanten Ende, ist die Plattform eingestellt. Der Markt folgt weiter dem festen Lebenszyklus der Daten
 * (dynamische Lebenszyklen kommen später); die Einstellung wirkt als Niederlage.
 */
function platformCheck(state: GameState, def: ScenarioDef): void {
  const sc = state.scenario!;
  const year = yearOf(state);
  const last = year - 1;
  const supported = state.projects.some((p) => p.status === "veroeffentlicht" && p.result && p.result.year === last
    && p.platforms.includes(def.goal.platform!) && p.result.scoreBp >= def.goal.minScoreBp!);
  if (supported && sc.plannedEndYear !== null) {
    const next = Math.max(sc.plannedEndYear, year + 1);
    if (next !== sc.plannedEndYear) log(state, "log.scenarioPlatformExtended", { platform: def.goal.platform!, year: next });
    sc.plannedEndYear = next;
  }
}

/**
 * Live-Service-Rettung (S06 Abschnitt 10 → S10): Das Studio betreibt zum Start ein MMO mit hohem Churn. Das Spiel wird
 * angelegt und sofort veröffentlicht (echte Wertung aus Team und Engine), danach auf den Stand eines alten Produkts
 * gesetzt. ANNAHME: Verkaufskurve beendet, Zufriedenheit niedrig, letzter Content-Drop vor pauseWeeks Wochen; die
 * Server-Regel deckt den Bedarf. Läuft nach dem Weltgenerator, damit Markt und Konkurrenz stehen; Geld danach fest.
 */
export function applyScenarioLive(state: GameState, data: GameData, def: ScenarioDef): void {
  applyScenarioSubsidiaries(state, data, def);
  const lp = def.start.liveProduct;
  if (!lp) return;
  const p = createProject(state, data, {
    type: "createProject", title: lp.title, genre: lp.genre, theme: lp.theme, scope: lp.scope, features: lp.features,
    people: state.people.map((x) => x.id).sort((a, b) => a - b), platforms: [(activePlatforms(data, dateOf(state.startYear, state.week).year).find((x) => x.type === "pc") ?? activePlatforms(data, dateOf(state.startYear, state.week).year)[0]!).id], productType: lp.type,
  });
  p.effortDoneBp = p.effortTotalBp;
  p.status = "bereit";
  releaseProject(state, data, p);
  for (const x of state.people) if (x.assignment?.kind === "project" && x.assignment.id === p.id) x.assignment = null;
  // Das Studio betreibt das MMO seit Jahren: Die Abteilung Betrieb ist schon da (BTR-R02), Größe nach Last.
  state.unlocks["betrieb"] = state.week;
  state.operations.triggered = true;
  const live = p.ops!.live!;
  // Das MMO ist ageWeeks alt: Die Verkaufskurve läuft in ihrem Ausläufer weiter (neue Spieler kommen nur noch langsam).
  const sales = p.sales!;
  sales.startWeek = state.week - lp.ageWeeks;
  sales.scoreBp = lp.scoreBp;
  p.result!.scoreBp = lp.scoreBp;
  p.result!.userScoreBp = lp.scoreBp;
  sales.weekRevenueCent = 0;
  p.marketing.interest = 0;
  live.base = lp.players;
  live.soldSeen = p.sales!.sold;
  live.history = [lp.players];
  live.lastDropWeek = state.week - lp.pauseWeeks;
  live.server.startWeek = state.week - data.liveService.server.peakWeeks;
  p.ops!.satisfactionBp = lp.satisfactionBp;
  p.ops!.history = [lp.satisfactionBp];
  if (def.start.moneyCent !== undefined) state.moneyCent = def.start.moneyCent;
  const sc = state.scenario!;
  sc.liveProductId = p.id;
  sc.startPlayers = lp.players;
}

/**
 * Konzern-Integration (ZIE-R13, S09 UEB-R15 bis UEB-R19): Der Konzern hat gerade drei Studios gekauft, alle drei stehen
 * am Anfang ihrer Integration. ANNAHME: Gekauft sind die ersten KI-Studios nach ID mit passender Größe, ohne Publisher
 * und AAA-Häuser; Kaufpreis = Firmenwert, keine Halteprämie, keine verdeckten Befunde. Läuft nach dem Weltgenerator.
 */
function applyScenarioSubsidiaries(state: GameState, data: GameData, def: ScenarioDef): void {
  const sub = def.start.subsidiaries;
  if (!sub) return;
  const picks = liveStudios(state)
    .filter((s) => !s.parent && s.archetype !== "publisher" && s.archetype !== "aaa")
    .filter((s) => studioPeople(s) >= sub.minPeople && studioPeople(s) <= sub.maxPeople)
    .sort((a, b) => a.id - b.id)
    .slice(0, sub.count);
  for (const s of picks) {
    const price = studioValue(state, data, s).totalCent;
    becomeSubsidiary(state, data, s, 0, price, 0, []);
    chronicle(state, "log.acqDone", { studio: s.name, amount: price });
  }
  state.scenario!.subsidiaryIds = picks.map((s) => s.id);
}

/** Konzern-Integration: Abgänge in den Start-Töchtern und ob alle noch zum Konzern gehören und fertig integriert sind. */
export function integrationStatus(state: GameState, ids: readonly number[]): { left: number; owned: boolean; done: boolean } {
  const subs = ids.map((id) => state.ai.studios.find((s) => s.id === id));
  const owned = subs.every((s) => s !== undefined && s.closedWeek === null && s.parent?.ownerId === 0);
  return {
    left: subs.reduce((n, s) => n + (s?.parent?.leftCount ?? 0), 0),
    owned,
    done: owned && subs.every((s) => s!.parent!.integration.progressBp >= BP_ONE),
  };
}

/** Indie-Durchbruch: höchstes Interesse zum Release eines eigenen Spiels. */
function bestInterest(state: GameState): number {
  return state.projects.reduce((m, p) => (p.status === "veroeffentlicht" && p.result ? Math.max(m, p.result.interestAtRelease ?? 0) : m), 0);
}

/** Tick-Schritt 13 nach den Meilensteinen: Ziel, Frist und Insolvenz prüfen (ZIE-R15). */
export function scenarioStep(state: GameState, data: GameData): void {
  const sc = state.scenario;
  if (!sc || sc.status !== "laeuft") return;
  const def = scenarioDef(data, sc.id)!;
  if (state.gameOver) {
    setResult(state, "verloren");
    return;
  }
  const d = dateOf(state.startYear, state.week);
  // Spielwoche 51 ist die letzte des Jahres; geprüft wird nach dieser Woche (Wochenwechsel folgt im Tick).
  const lastWeekOfDeadline = d.year === def.deadlineYear && d.weekOfYear === 51;
  switch (def.goal.kind) {
    case "spielerbasisSteigern": {
      // Live-Service-Rettung: Spielerbasis des Produkts ≥ Start · Faktor (verdoppeln; seit 6a.8 mit Kampagnen, BTR-R15).
      const live = state.projects.find((p) => p.id === sc.liveProductId)?.ops?.live;
      if (live && live.shutdownWeek === null && live.base >= mulBp(sc.startPlayers ?? 0, def.goal.factorBp!)) setResult(state, "gewonnen");
      if (live?.shutdownWeek != null) setResult(state, "verloren");
      break;
    }
    case "spielWertung":
      if (bestScore(state) >= def.goal.scoreBp!) setResult(state, "gewonnen");
      break;
    case "interesseRelease":
      // Indie-Durchbruch: ein eigenes Spiel mit mindestens goal.interest Interessenten zum Release.
      if (bestInterest(state) >= def.goal.interest!) setResult(state, "gewonnen");
      break;
    case "integrationOhneAbwanderung": {
      // Konzern-Integration: alle Start-Töchter fertig integriert, höchstens maxLeft Abgänge; Schließen oder Verlust verliert.
      const st = integrationStatus(state, sc.subsidiaryIds ?? []);
      if (st.left > def.goal.maxLeft! || !st.owned) setResult(state, "verloren");
      else if (st.done) setResult(state, "gewonnen");
      break;
    }
    case "engineMarktfuehrer":
      if (isFirstWeekOfYear(state.week) || lastWeekOfDeadline) {
        if (engineLeader(state)) setResult(state, "gewonnen");
      }
      break;
    case "plattformErhalten":
      if (isFirstWeekOfYear(state.week) && d.year > state.startYear) {
        platformCheck(state, def);
        if (sc.plannedEndYear !== null && d.year > sc.plannedEndYear) setResult(state, "verloren");
      }
      // ZIE-T10: Bleibt die Plattform bis zum Ende des Fristjahres aktiv, ist das Szenario gewonnen.
      if (lastWeekOfDeadline && sc.status === "laeuft" && (sc.plannedEndYear ?? 0) >= def.deadlineYear) setResult(state, "gewonnen");
      break;
  }
  if (sc.status !== "laeuft") return;
  // S10 Abschnitt 7: Hinweis 52 Wochen vor der Frist.
  if (!sc.warned && d.year === def.deadlineYear && d.weekOfYear === 0) {
    sc.warned = true;
    log(state, "log.scenarioYearLeft", { id: sc.id });
  }
  if (lastWeekOfDeadline) setResult(state, "verloren");
}
