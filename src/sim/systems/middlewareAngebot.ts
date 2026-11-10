// S13 3.7 Middleware-Lizenzmarkt (AUS-R70, AUS-R71, Ausbaustufe 1.3; Prüfung Fable 03.11.2026: als Schalter an der
// bestehenden Lizenzvorlage, kein eigener Markt). KI-Studios mit Hausmitteln lizenzieren einzelne Module der eigenen Engine.
// ANNAHME (AUS-R71 vereinfacht): Ein Studio kauft, wenn das Modul mindestens minLevelGap Stufen über seinen Hausmitteln
// liegt, mit Chance je Jahr und wenn die Kasse die Gebühr für cashYears Jahre trägt; Gebühr = Vorsprung · feePerLevelCent.
import type { Cent } from "../num";
import type { AiStudio, GameData, GameState, ModuleKind, ModuleMap } from "../model/types";
import { MODULES } from "../model/types";
import { dateOf, isFirstWeekOfYear } from "../calendar";
import { stream } from "../rng";
import { ledgerNow, scaleToYear } from "./finanzen";
import { aiEngineLevels } from "./lizenzen";
import { aiEngineLag } from "./ki/entscheidung";
import { liveStudios } from "./ki/studios";
import { log } from "./firma";

const PLAYER = 0;

function O(data: GameData) {
  return data.engine.middleware.playerOffer;
}

/** Stufen der neuesten eigenen Engine-Version. */
function playerLevels(state: GameState): ModuleMap | null {
  const v = state.engine?.versions[state.engine.versions.length - 1];
  return v ? v.levels : null;
}

function homeLevels(state: GameState, data: GameData, s: AiStudio, year: number): ModuleMap {
  return aiEngineLevels(data, aiEngineLag(state, data, data.ai.archetypes[s.archetype].engineLagYears), year);
}

/** AUS-R70: Stufen der Hausmittel mit den lizenzierten Modulen des Spielers (für die Projektwahl der KI). */
export function middlewareLevels(state: GameState, studioId: number, base: ModuleMap): { levels: ModuleMap; key: string } | null {
  const mine = state.moduleOffer.customers.filter((c) => c.studioId === studioId);
  if (mine.length === 0) return null;
  const levels = { ...base };
  for (const c of mine) levels[c.module] = Math.max(levels[c.module], c.level);
  return { levels, key: mine.map((c) => `${c.module}${c.level}`).sort().join(",") };
}

function fee(state: GameState, data: GameData, gap: number): Cent {
  return scaleToYear(data, O(data).feePerLevelCent * gap, dateOf(state.startYear, state.week).year);
}

function collect(state: GameState, s: AiStudio, amount: Cent): void {
  s.cashCent -= amount;
  state.moneyCent += amount;
  ledgerNow(state).income.licenses += amount;
}

/** Tick-Schritt 10 (nach dem Lizenzmarkt), einmal im Jahr: verlängern, neue Kunden, Gebühren. */
export function moduleOfferStep(state: GameState, data: GameData): void {
  if (!isFirstWeekOfYear(state.week)) return;
  const year = dateOf(state.startYear, state.week).year;
  const own = playerLevels(state);
  const offer = state.moduleOffer;
  const studios = new Map(liveStudios(state).map((s) => [s.id, s]));
  // Verlängern: nur, solange der Schalter an ist und das Studio mit Hausmitteln arbeitet; die Stufe folgt der Engine.
  offer.customers = offer.active && own ? offer.customers.filter((c) => {
    const s = studios.get(c.studioId);
    return s && s.engineId === null && s.parent?.ownerId !== PLAYER && own[c.module] - homeLevels(state, data, s, year)[c.module] >= O(data).minLevelGap;
  }) : [];
  if (!offer.active || !own) return;
  const rng = stream(state, "lizenzen");
  for (const s of [...studios.values()].sort((a, b) => a.id - b.id)) {
    if (s.engineId !== null || s.parent?.ownerId === PLAYER) continue;
    const home = homeLevels(state, data, s, year);
    const owned = offer.customers.filter((c) => c.studioId === s.id);
    const candidates = MODULES.filter((m) => own[m] - home[m] >= O(data).minLevelGap && !owned.some((c) => c.module === m))
      .sort((a, b) => own[b] - home[b] - (own[a] - home[a]) || a.localeCompare(b));
    for (const m of candidates.slice(0, Math.max(0, O(data).maxModulesPerStudio - owned.length))) {
      const f = fee(state, data, own[m] - home[m]);
      if (rng.uniformBp() >= O(data).chanceBp || s.cashCent < f * O(data).cashYears) continue;
      offer.customers.push({ studioId: s.id, module: m as ModuleKind, level: own[m], feeCent: f, year });
      log(state, "log.moduleLicense", { studio: s.name, module: m });
    }
  }
  for (const c of offer.customers) {
    const s = studios.get(c.studioId)!;
    c.level = own[c.module];
    c.feeCent = fee(state, data, Math.max(1, own[c.module] - homeLevels(state, data, s, year)[c.module]));
    collect(state, s, c.feeCent);
  }
}

export function moduleOfferIncome(state: GameState): Cent {
  return state.moduleOffer.customers.reduce((a, c) => a + c.feeCent, 0);
}

