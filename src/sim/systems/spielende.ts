// S10 Spielende (ZIE-R08 bis ZIE-R11, ZIE-R51) und Vermächtnis-Wertung (S10 Abschnitt 5).
import { type Bp, BP_ONE, clamp, medianInt, mulDiv } from "../num";
import type { Ending, EndMode, GameData, GameState, Legacy, LegacyPart } from "../model/types";
import { dateOf } from "../calendar";
import { chronicle } from "./katalog";
import { log } from "./firma";
import { ranking } from "./ki/rangliste";
import { liveStudios } from "./ki/studios";

const PLAYER = 0;
const PARTS: LegacyPart[] = ["marken", "engines", "umsatz", "preise", "rivalen", "ruf"];

export function endMode(state: GameState): EndMode {
  return state.settings.endMode ?? "endjahr";
}

/** ZIE-R51: Endjahr zwischen 2000 und 2100, Standard 2040. */
export function endYear(state: GameState, data: GameData): number {
  const l = data.goals.legacy;
  return clamp(state.settings.endYear ?? l.defaultEndYear, l.minEndYear, l.lastYear);
}

function brandFans(state: GameState, ownerId: number): number {
  let sum = 0;
  for (const b of state.brands) if (b.ownerId === ownerId) for (const v of Object.values(b.fans)) sum += v;
  return sum;
}

/** Alle je vergebenen Lizenzen auf Engines des Eigentümers. */
function engineLicenses(state: GameState, ownerId: number): number {
  const own = new Set(state.licensing.engines.filter((e) => e.ownerId === ownerId).map((e) => e.id));
  return state.licensing.contracts.filter((c) => own.has(c.engineId) && c.licenseeId !== ownerId).length;
}

function awardsWon(state: GameState, ownerId: number): number {
  return state.awards.filter((a) => a.nominees[a.winner]!.ownerId === ownerId).length;
}

/** Teilwert 0–100: so gut wie die beste KI-Firma oder besser = 100. */
function partScore(player: number, best: number): number {
  if (best <= 0) return player > 0 ? 100 : 0;
  return Math.min(100, mulDiv(Math.max(0, player), 100, best, 1));
}

/**
 * Vermächtnis-Wertung V = Σ Gewicht · Teilwert (S10 Abschnitt 5), Ergebnis in Punkten · 100 (0–10.000).
 * ANNAHME zu den Messgrößen: Marken = Fans aller eigenen Marken; Engines = je vergebene Lizenzen auf eigene Engines;
 * Umsatz und Ruf wie in der Rangliste (MRK-R37); Preise = gewonnene Branchenpreise; Rivalen = Anteil der Rivalen
 * (ohne Rivalen: aller KI-Firmen), die in der Rangliste hinter dem Spieler liegen.
 */
export function legacy(state: GameState, data: GameData): Legacy {
  const rank = ranking(state, data, "");
  const studios = liveStudios(state);
  const me = rank.find((e) => e.player)!;
  const others = rank.filter((e) => !e.player);
  const measure = (part: LegacyPart, id: number): number => {
    const entry = rank.find((e) => e.player === (id === PLAYER) && e.id === id);
    switch (part) {
      case "marken": return brandFans(state, id);
      case "engines": return engineLicenses(state, id);
      case "umsatz": return entry?.revenueCent ?? 0;
      case "preise": return awardsWon(state, id);
      case "ruf": return entry?.reputationBp ?? 0;
      case "rivalen": return 0;
    }
  };
  const rivalIds = new Set(studios.filter((s) => s.rival !== null).map((s) => s.id));
  const field = rivalIds.size > 0 ? others.filter((e) => rivalIds.has(e.id)) : others;
  const myIndex = rank.indexOf(me);
  const beaten = field.filter((e) => rank.indexOf(e) > myIndex).length;
  const weights = data.goals.legacy.weights;
  const parts = PARTS.map((part) => {
    if (part === "rivalen") {
      const score = field.length === 0 ? 100 : mulDiv(beaten, 100, field.length, 1);
      return { part, player: beaten, best: field.length, score, contribution: mulDiv(weights[part], score, 100, 1) };
    }
    const player = measure(part, PLAYER);
    const best = studios.reduce((m, s) => Math.max(m, measure(part, s.id)), 0);
    const score = partScore(player, best);
    return { part, player, best, score, contribution: mulDiv(weights[part], score, 100, 1) };
  });
  // Endgame-Themen: erfüllte Vermächtnis-Herausforderungen zählen als Ruhmeshalle-Punkte dazu (gedeckelt).
  const challengeBp = state.endgame.hallPoints;
  const totalBp: Bp = Math.min(BP_ONE, parts.reduce((s, p) => s + p.contribution, 0) + challengeBp);
  return { parts, totalBp, challengeBp, title: legacyTitle(parts, me.revenueCent, rank.map((e) => e.revenueCent)) };
}

/**
 * Titel nach dem stärksten Teilwert; „Der ewige Indie“ nur bei Ruf vorn und Umsatz unter dem Median (S10 Abschnitt 5).
 * ANNAHME: Gleichstand nach der Reihenfolge der Gewichte; Ruf vorn ohne Indie-Bedingung nimmt den zweitstärksten Teil.
 */
function legacyTitle(parts: Legacy["parts"], revenue: number, all: number[]): string {
  const sorted = [...parts].sort((a, b) => b.score - a.score || PARTS.indexOf(a.part) - PARTS.indexOf(b.part));
  for (const p of sorted) {
    if (p.part !== "ruf") return p.part;
    if (revenue < medianInt(all)) return "ruf";
  }
  return sorted[0]!.part;
}

function end(state: GameState, data: GameData, reason: Ending["reason"]): void {
  state.ending = {
    week: state.week, reason, legacy: legacy(state, data),
    milestones: Object.keys(state.milestones).length, awards: awardsWon(state, PLAYER), continued: false,
  };
  chronicle(state, "log.gameEnd", { why: reason });
  log(state, "log.gameEnd", { why: reason });
}

/**
 * Tick-Schritt 13 nach dem Wochenwechsel: ZIE-R08 Endjahr (die letzte Woche des Endjahrs ist vergangen) oder
 * erreichtes Ziel; ZIE-R51 Ende 2100 ohne Weiterspielen; ZIE-R09 Insolvenz hält die Wertung fest.
 */
export function endingStep(state: GameState, data: GameData): void {
  const year = dateOf(state.startYear, state.week).year;
  if (state.gameOver && !state.ending) {
    end(state, data, state.gameOver.reason);
    return;
  }
  if (year > data.goals.legacy.lastYear && state.ending?.reason !== "kalender") {
    end(state, data, "kalender");
    return;
  }
  if (state.ending) return;
  // ZIE-R15: Ein Szenario endet mit Sieg oder Niederlage (Ergebnis pausiert).
  if (state.scenario && state.scenario.status !== "laeuft") {
    end(state, data, "szenario");
    return;
  }
  const mode = endMode(state);
  if (mode === "endjahr" && year > endYear(state, data)) end(state, data, "endjahr");
  if (mode === "zielbedingung" && state.goal?.status === "erreicht") end(state, data, "ziel");
}

/** ZIE-R10: Weiterspielen ist möglich, außer nach Insolvenz und nach dem Ende des Kalenders. */
export function canContinue(state: GameState): boolean {
  const e = state.ending;
  return e !== null && !e.continued && e.reason !== "insolvenz" && e.reason !== "kalender" && e.reason !== "uebernahme";
}

/** Das Spiel steht, solange der Abschluss-Bildschirm offen ist. */
export function paused(state: GameState): boolean {
  return state.gameOver !== null || (state.ending !== null && !state.ending.continued);
}

export function continuePlaying(state: GameState): void {
  if (canContinue(state)) state.ending!.continued = true;
}
