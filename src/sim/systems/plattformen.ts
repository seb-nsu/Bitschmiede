// Plattformbeziehungen und Devkit-Wellen (S08 MRK-R14 bis MRK-R26, Tabelle 5.4).
// ANNAHME (Annahme 2 der Etappe): feste Lebenszyklen. Starttermine verschieben sich nicht (MRK-R23), und Hersteller
// haben noch kein eigenes Konto und keine eigenen Studios (MRK-R15: Launch-Titel des Herstellers kommen mit dem
// dynamischen Lebenszyklus).
import { type Bp, BP_ONE, type Cent, clamp, divInt, mulBp, mulDiv } from "../num";
import type { AiStudio, GameData, GameEvent, GameState, MakerParams, MakerState, PlatformDef, PlatformSchedule, Project } from "../model/types";
import { dateOf } from "../calendar";
import { stream } from "../rng";
import { anchorValue, ledgerNow } from "./finanzen";
import { chronicle } from "./katalog";
import { log } from "./firma";
import { addEvent } from "./ereignisse";

function M(data: GameData): MakerParams {
  return data.makers;
}

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

function monthsToWeeks(months: number): number {
  return mulDiv(months, 52, 12, 1);
}

export function emptyMakers(): MakerState {
  return { initialized: false, relationBp: {}, schedules: {}, exclusiveOffered: [] };
}

export function makerOf(data: GameData, platformId: string): string | null {
  for (const id of Object.keys(M(data).makers).sort()) if (M(data).makers[id]!.includes(platformId)) return id;
  return null;
}

export function relation(state: GameState, data: GameData, maker: string): Bp {
  return state.makers.relationBp[maker] ?? M(data).relation.startBp;
}

/** Tabelle 5.4: Beziehung ändern, begrenzt auf 0–100. */
export function changeRelation(state: GameState, data: GameData, maker: string | null, delta: Bp): void {
  if (!maker || delta === 0) return;
  state.makers.relationBp[maker] = clamp(relation(state, data, maker) + delta, 0, BP_ONE);
}

function launchWeekOf(state: GameState, p: PlatformDef): number {
  return (p.releaseYear - state.startYear) * 52;
}

/** MRK-R14: Ankündigung 12–24 Monate vor Start; Welle 1 24–18, Welle 2 12–9 Monate vorher, Welle 3 ab Start. */
function initMakers(state: GameState, data: GameData): void {
  const rng = stream(state, "markt");
  const m = M(data);
  for (const p of [...data.platforms].sort((a, b) => a.id.localeCompare(b.id))) {
    // Bestehende Zeitpläne bleiben (Spielstände mit neuen Plattformen in den Daten, Migration 23 → 24).
    if (!makerOf(data, p.id) || state.makers.schedules[p.id]) continue;
    const launchWeek = launchWeekOf(state, p);
    if (launchWeek <= 0) continue;
    const announceWeek = launchWeek - monthsToWeeks(rng.range(m.announceMonths[0], m.announceMonths[1]));
    const wave1Week = launchWeek - monthsToWeeks(rng.range(m.wave1Months[0], m.wave1Months[1]));
    const wave2Week = launchWeek - monthsToWeeks(rng.range(m.wave2Months[0], m.wave2Months[1]));
    // MRK-R18: mit 20 % senkt der Hersteller vor dem Start die Taktrate.
    const cut = rng.uniformBp() < m.clockCut.chanceBp;
    const at = rng.range(Math.max(announceWeek, 0), launchWeek - 1);
    state.makers.schedules[p.id] = {
      announceWeek, wave1Week, wave2Week, launchWeek, clockCutWeek: cut ? at : null, clockCut: false, devkit: 0, launchRequest: "keine", launchChecked: false,
    };
  }
  state.makers.initialized = true;
}

export function schedule(state: GameState, id: string): PlatformSchedule | undefined {
  return state.makers.schedules[id];
}

export function launched(state: GameState, data: GameData, id: string): boolean {
  const p = data.platforms.find((x) => x.id === id);
  return !!p && yearOf(state) >= p.releaseYear;
}

/** Angekündigt (öffentlich) und noch nicht im Handel. */
export function announced(state: GameState, data: GameData, id: string): boolean {
  const s = schedule(state, id);
  return !!s && state.week >= s.announceWeek && !launched(state, data, id);
}

/** MRK-R17: Der Spieler hat ein Devkit für eine Plattform vor dem Start. */
export function playerHasDevkit(state: GameState, id: string): boolean {
  return (schedule(state, id)?.devkit ?? 0) > 0;
}

/**
 * ANNAHME: KI-Studios haben zu jedem Hersteller die Startbeziehung 50, bekommen also Welle 2; Welle 1 bekommt, wer auf
 * diese Plattform wettet (Plattform-Wette der Konferenz, KI-R21: Partner).
 */
export function aiHasDevkit(state: GameState, studio: AiStudio, id: string): boolean {
  const s = schedule(state, id);
  if (!s) return false;
  return state.week >= s.wave2Week || (studio.platformBet === id && state.week >= s.wave1Week);
}

/** Plattformen, die vor dem Start mit Devkit wählbar sind (Spieler oder KI-Studio). */
export function devkitPlatforms(state: GameState, data: GameData, studio: AiStudio | null): string[] {
  return Object.keys(state.makers.schedules).sort().filter((id) => !launched(state, data, id) && (studio ? aiHasDevkit(state, studio, id) : playerHasDevkit(state, id)));
}

/** MRK-R18: Budget −10 % nach der Taktsenkung. */
export function budgetFactor(state: GameState | undefined, data: GameData, id: string): Bp {
  return state?.makers.schedules[id]?.clockCut ? BP_ONE - M(data).clockCut.cutBp : BP_ONE;
}

/** MRK-R19: Release in den ersten 8 Wochen nach dem Start einer Hersteller-Plattform. */
export function launchPlatform(state: GameState, data: GameData, platforms: readonly string[], week: number): string | null {
  for (const id of platforms) {
    const p = data.platforms.find((x) => x.id === id);
    if (!p || !makerOf(data, id)) continue;
    const start = launchWeekOf(state, p);
    if (start > 0 && week >= start && week < start + M(data).launchWeeks) return id;
  }
  return null;
}

export function devkitFee(state: GameState, data: GameData): Cent {
  return anchorValue(M(data).devkitFeeAnchorsCent, yearOf(state));
}

/** Ruf des Spielers wie in der Rangliste: Ø der letzten fünf Wertungen; ohne Release neutral (ANNAHME). */
function playerReputation(state: GameState, data: GameData): Bp {
  const scores = state.projects.filter((p) => p.result).sort((a, b) => a.result!.week - b.result!.week || a.id - b.id).slice(-5).map((p) => p.result!.scoreBp);
  return scores.length === 0 ? data.quality.scoreBaseBp : divInt(scores.reduce((a, b) => a + b, 0), scores.length, 1);
}

// ---------- Devkit-Antrag (MRK-R16, MRK-R25) ----------

export function validateRequestDevkit(state: GameState, data: GameData, platformId: string): string | null {
  const s = schedule(state, platformId);
  if (!s || launched(state, data, platformId) || state.week < s.announceWeek) return "error.unknownPlatform";
  if (s.devkit > 0) return "error.devkitHave";
  if (state.week < s.wave2Week) return "error.devkitWave";
  if (relation(state, data, makerOf(data, platformId)!) < M(data).relation.lowBp) return "error.devkitRelation";
  if (playerReputation(state, data) < M(data).relation.minReputationBp) return "error.devkitReputation";
  if (devkitFee(state, data) > Math.max(0, state.moneyCent)) return "error.notEnoughMoney";
  return null;
}

export function requestDevkit(state: GameState, data: GameData, platformId: string): void {
  deliver(state, data, platformId, 2, devkitFee(state, data));
}

function deliver(state: GameState, data: GameData, platformId: string, wave: number, feeCent: Cent): void {
  const s = schedule(state, platformId)!;
  s.devkit = wave;
  if (feeCent > 0) {
    state.moneyCent -= feeCent;
    ledgerNow(state).costs.other += feeCent;
  }
  log(state, wave === 1 ? "log.devkitSecret" : "log.devkit", { platform: platformId, cost: feeCent });
}

/** MRK-R58: Welle-1-Devkit aus der Wette auf die Zukunft (ohne Gebühr). */
export function deliverDevkit(state: GameState, data: GameData, platformId: string, wave: number): void {
  deliver(state, data, platformId, wave, 0);
}

// ---------- Wochenschritt ----------

function scheduleStep(state: GameState, data: GameData, id: string, s: PlatformSchedule): void {
  const m = M(data);
  const maker = makerOf(data, id)!;
  const rel = relation(state, data, maker);
  if (state.week === s.announceWeek) {
    chronicle(state, "log.platformAnnounced", { platform: id, maker, year: data.platforms.find((p) => p.id === id)!.releaseYear });
  }
  if (s.clockCutWeek !== null && !s.clockCut && state.week >= s.clockCutWeek) {
    s.clockCut = true;
    chronicle(state, "log.platformClockCut", { platform: id, maker });
  }
  if (launched(state, data, id)) return;
  // MRK-R15, MRK-R16, MRK-R25: Welle 1 ab 80 (kostenlos, verschwiegen), Welle 2 ab 50 automatisch, ab 70 ohne Gebühr.
  if (s.devkit === 0 && state.week >= s.wave1Week && rel >= m.relation.wave1Bp) deliver(state, data, id, 1, 0);
  if (s.devkit === 0 && state.week >= s.wave2Week && rel >= m.relation.wave2AutoBp) {
    const fee = rel >= m.relation.wave2FreeBp ? 0 : devkitFee(state, data);
    if (fee <= Math.max(0, state.moneyCent)) deliver(state, data, id, 2, fee);
  }
  // MRK-R21: höchstens drei Launch-Anfragen je Plattform; der Spieler ist dabei ab Beziehung 60 (ANNAHME).
  if (state.week === Math.max(0, s.wave2Week) && s.launchRequest === "keine" && rel >= m.relation.launchAskBp && state.ai.generated) {
    s.launchRequest = "angefragt";
    addEvent(state, data, {
      kind: "launchAnfrage", scope: "welt", projectId: null, options: ["zusagen", "ablehnen"], defaultOption: "ablehnen",
      platformDeal: { platform: id, maker, payCent: anchorValue(m.launchSubsidyAnchorsCent, yearOf(state)), projectId: null },
    });
  }
}

/** MRK-R20: Zugesagter Launch-Titel verpasst? Prüfung am Ende des Launch-Fensters. */
function launchCheck(state: GameState, data: GameData, id: string, s: PlatformSchedule): void {
  if (s.launchChecked || state.week < s.launchWeek + M(data).launchWeeks) return;
  s.launchChecked = true;
  if (s.launchRequest !== "zugesagt") return;
  const done = state.projects.some((p) => p.result && p.platforms.includes(id) && p.result.week >= s.launchWeek && p.result.week < s.launchWeek + M(data).launchWeeks);
  if (done) return;
  changeRelation(state, data, makerOf(data, id), M(data).deltas.missedLaunch);
  log(state, "log.launchMissed", { platform: id });
}

/** MRK-R26, MRK-R25: Ab Beziehung 85 bietet der Hersteller für ein laufendes Projekt einmal einen Exklusivdeal an. */
function exclusiveOffers(state: GameState, data: GameData): void {
  if (dateOf(state.startYear, state.week).weekOfMonth !== 0) return;
  const m = M(data);
  for (const p of [...state.projects].sort((a, b) => a.id - b.id)) {
    if (p.status !== "laeuft" || p.exclusivePlatform !== null || p.type !== "standard") continue;
    for (const id of p.platforms) {
      const maker = makerOf(data, id);
      const key = `${p.id}:${maker}`;
      if (!maker || state.makers.exclusiveOffered.includes(key) || relation(state, data, maker) < m.relation.premiumBp) continue;
      state.makers.exclusiveOffered.push(key);
      const pay = mulBp(anchorValue(m.exclusive.payAnchorsCent, yearOf(state)), m.exclusive.scopeBp[p.scope]);
      addEvent(state, data, {
        kind: "exklusivdeal", scope: "projekt", projectId: p.id, options: ["annehmen", "ablehnen"], defaultOption: "ablehnen",
        platformDeal: { platform: id, maker, payCent: pay, projectId: p.id },
      });
      return;
    }
  }
}

/** Tick-Schritt 2 (Kalender und Plattformen). */
export function makersStep(state: GameState, data: GameData): void {
  if (!state.makers.initialized) initMakers(state, data);
  for (const id of Object.keys(state.makers.schedules).sort()) {
    const s = state.makers.schedules[id]!;
    scheduleStep(state, data, id, s);
    launchCheck(state, data, id, s);
  }
  exclusiveOffers(state, data);
}

// ---------- Entscheidungen ----------

export function applyMakerDecision(state: GameState, data: GameData, event: GameEvent, option: string): void {
  const d = event.platformDeal;
  if (!d) return;
  const s = schedule(state, d.platform);
  if (event.kind === "launchAnfrage") {
    if (!s) return;
    if (option !== "zusagen") {
      s.launchRequest = "abgelehnt";
      changeRelation(state, data, d.maker, M(data).deltas.rejectLaunch);
      return;
    }
    s.launchRequest = "zugesagt";
    if (s.devkit === 0) deliver(state, data, d.platform, 2, 0);
    return;
  }
  if (event.kind === "exklusivdeal") {
    const p = state.projects.find((x) => x.id === d.projectId);
    if (option !== "annehmen" || !p || p.status !== "laeuft") return;
    p.exclusivePlatform = d.platform;
    p.platforms = [d.platform];
    p.versionShareBp = { [d.platform]: p.versionShareBp[d.platform] ?? BP_ONE };
    state.moneyCent += d.payCent;
    ledgerNow(state).income.contracts += d.payCent;
    // Tabelle 5.4: Exklusivdeal mit einem Konkurrenzhersteller −5 bei allen anderen.
    for (const maker of Object.keys(M(data).makers).sort()) if (maker !== d.maker) changeRelation(state, data, maker, M(data).deltas.rivalExclusive);
    log(state, "log.exclusiveDeal", { project: p.title, platform: d.platform, pay: d.payCent });
  }
}

// ---------- Folgen von Releases und Zertifizierung (Tabelle 5.4) ----------

/** Release des Spielers: Hit, Flop, schwache Version, Launch-Titel (mit Zuschuss bei Zusage), Exklusivtitel. */
export function onPlayerRelease(state: GameState, data: GameData, p: Project, scoreBp: Bp): void {
  const m = M(data);
  const makers = new Set<string>();
  for (const id of p.platforms) {
    const maker = makerOf(data, id);
    if (!maker) continue;
    // PRD-R61: Eine abgespeckte Version zählt als schwache Version.
    if ((p.versionShareBp[id] ?? BP_ONE) < BP_ONE - data.performance.weakVersionThresholdBp) changeRelation(state, data, maker, m.deltas.weakVersion);
    if (makers.has(maker)) continue;
    makers.add(maker);
    if (scoreBp >= m.hitScoreBp) changeRelation(state, data, maker, m.deltas.hit);
    else if (scoreBp < m.flopScoreBp) changeRelation(state, data, maker, m.deltas.flop);
  }
  const launch = launchPlatform(state, data, p.platforms, state.week);
  if (launch) {
    changeRelation(state, data, makerOf(data, launch), m.deltas.launch);
    const s = schedule(state, launch);
    if (s?.launchRequest === "zugesagt" && !s.launchChecked) {
      const pay = anchorValue(m.launchSubsidyAnchorsCent, yearOf(state));
      state.moneyCent += pay;
      ledgerNow(state).income.contracts += pay;
      s.launchChecked = true;
      log(state, "log.launchSubsidy", { project: p.title, platform: launch, pay });
    }
  }
  if (p.exclusivePlatform) changeRelation(state, data, makerOf(data, p.exclusivePlatform), m.deltas.exclusive);
}

/** Zertifizierung im ersten Versuch +1, gescheitert −4 (je Hersteller einer Zielplattform). */
export function onCertification(state: GameState, data: GameData, p: Project, passed: boolean): void {
  const makers = [...new Set(p.platforms.map((id) => makerOf(data, id)).filter((x): x is string => x !== null))].sort();
  for (const maker of makers) {
    if (passed && p.certAttempts === 1) changeRelation(state, data, maker, M(data).deltas.certFirst);
    if (!passed) changeRelation(state, data, maker, M(data).deltas.certFail);
  }
}

/** MRK-R25: unter 30 strengere Zertifizierung (ANNAHME: 80 % der Bug-Schwelle). */
export function certThreshold(state: GameState, data: GameData, p: Pick<Project, "platforms">, base: number): number {
  const low = p.platforms.some((id) => {
    const maker = makerOf(data, id);
    return maker !== null && relation(state, data, maker) < M(data).relation.lowBp;
  });
  return low ? mulBp(base, M(data).strictCertBp) : base;
}

/** MRK-R25: ab 85 Plattformgebühr −2 Prozentpunkte (nur für den Spieler). */
export function playerFeeBp(state: GameState, data: GameData, p: PlatformDef): Bp {
  const maker = makerOf(data, p.id);
  if (!maker || relation(state, data, maker) < M(data).relation.premiumBp) return p.licenseFeeBp;
  return Math.max(0, p.licenseFeeBp - M(data).licenseCutBp);
}

/** MRK-R26: Ein Spiel mit Exklusivdeal ist für andere Plattformen gesperrt (Ports), bis die Frist abläuft. */
export function exclusiveLocked(state: GameState, data: GameData, source: Project): boolean {
  return source.exclusivePlatform !== null && (!source.result || state.week < source.result.week + M(data).exclusive.weeks);
}
