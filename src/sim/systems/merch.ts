// S05 Merchandising (Etappe 5.12): MKT-R41, MKT-R42. Automatischer Monatsertrag je Marke des Spielers nach Stärke,
// Welttiefe und Fans; einmal je Marke die Wahl Fanshop (doppelte Marge, ±30 %) oder Lizenz (sicher).
import { BP_ONE, clamp, mulBp } from "../num";
import type { Brand, GameData, GameEvent, GameState } from "../model/types";
import { isFirstWeekOfMonth } from "../calendar";
import { stream } from "../rng";
import { ledgerNow } from "./finanzen";
import { brandStrength } from "./marken";
import { log } from "./firma";

function fans(b: Brand): number {
  return Object.keys(b.fans).sort().reduce((a, k) => a + (b.fans[k] ?? 0), 0);
}

/** MKT-R41, Startwerte: Ertrag je Monat = Stärke × Welttiefe × Fans × 0,02 USD (vor Faktor und Risiko). */
export function merchBase(data: GameData, b: Brand): number {
  return mulBp(mulBp(fans(b), brandStrength(data, b)), b.depthBp) * data.merch.centPerFanMonth;
}

/** Monatsjob (Tick-Schritt 8): Wahl anbieten, Ertrag buchen, schwache Marken mit Fanshop leiden (MKT-R42). */
export function merchStep(state: GameState, data: GameData): void {
  if (!isFirstWeekOfMonth(state.startYear, state.week)) return;
  const m = data.merch;
  let total = 0;
  for (const b of [...state.brands].sort((x, y) => x.id - y.id)) {
    // FRM-R43: Liegt die IP beim Publisher, gehört ihm der Merch-Ertrag.
    if (b.ownerId !== 0 || b.publisherId != null) continue;
    const strength = brandStrength(data, b);
    if (!b.merch) {
      if (!b.merchOffered && strength >= m.minStrengthBp && b.titles.length > 0) {
        b.merchOffered = true;
        // Prüfung Fable 03.11.2026: Merchandising läuft als automatische Lizenz-Einnahme der Marke, ohne Wahlfenster.
        b.merch = "lizenz";
        log(state, "log.merchChosen", { brand: b.name, option: b.merch });
      }
      continue;
    }
    let cent = merchBase(data, b);
    if (b.merch === "lizenz") cent = mulBp(cent, m.licenseFactorBp);
    else {
      // Fanshop: doppelte Marge mit ±30 % Risiko (Strom „marken“).
      const swing = stream(state, "marken").range(-m.ownRiskBp, m.ownRiskBp);
      cent = mulBp(mulBp(cent, m.ownFactorBp), BP_ONE + swing);
      // MKT-R42: Zu viel Merch bei schwacher Marke senkt ihre Stärke (über den Ruf).
      if (strength < m.weakStrengthBp) b.reputationBp = clamp(b.reputationBp - m.weakReputationLossBp, 0, BP_ONE);
    }
    b.merchLastMonthCent = Math.max(0, cent);
    total += b.merchLastMonthCent;
  }
  if (total > 0) {
    state.moneyCent += total;
    ledgerNow(state).income.merch += total;
  }
}

export function applyMerchDecision(state: GameState, event: GameEvent, option: string): void {
  const b = state.brands.find((x) => x.id === event.brandId);
  if (!b) return;
  b.merch = option === "eigen" ? "eigen" : "lizenz";
  log(state, "log.merchChosen", { brand: b.name, option: b.merch });
}
