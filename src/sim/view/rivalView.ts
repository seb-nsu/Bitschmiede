// Anzeigemodell der Rivalen (S14 Abschnitt 9, KI-R65, KI-R66): Karte mit Chef, Charakterzügen, Stimmung, Ziel (falls
// bekannt), Beziehung mit Verlauf und den letzten fünf Zügen; Ticker der Rivalen-Schlagzeilen (MRK-R52).
import { type Bp, divInt } from "../num";
import { WEEKS_PER_YEAR } from "../calendar";
import type { AiArchetype, AiDecision, GameData, GameState, LogEntry, RivalGoalId, RivalMood } from "../model/types";
import { rivalStudios } from "../systems/ki/rivalen";
import { poachChance, validatePoach } from "../systems/personal";

export interface RivalView {
  id: number;
  name: string;
  archetype: AiArchetype;
  chief: string;
  traits: string[];
  mood: RivalMood;
  /** KI-R65: null = „Ziel unbekannt“. */
  goals: RivalGoalId[] | null;
  relationBp: Bp;
  relationHistory: Bp[];
  moves: AiDecision[];
  /** FRM-R68: Schlüsselpersonen mit Erfolgschance bei 20 % Aufschlag; blocked = Fehlerschlüssel. */
  keyPeople: { index: number; name: string; role: string; strength: number; raiseBp: Bp; chanceBp: Bp; blocked: string | null }[];
}

/** Vorgeschlagener Gehaltsaufschlag beim Abwerben (Anzeige; die Eingabe trägt ihren eigenen Wert). */
export const POACH_RAISE_BP = 2000;

export function rivalsView(state: GameState, data: GameData): RivalView[] {
  return rivalStudios(state).map((s) => {
    const r = s.rival!;
    // KI-R65: bekannt ab Beziehung +40 (Analytics, Messen und Gerüchte folgen mit ihren Systemen).
    const known = r.relationBp >= data.ai.rivals.relation.knownGoalBp;
    return {
      id: s.id, name: s.name, archetype: s.archetype, chief: r.chief.name, traits: [...s.traits], mood: r.mood,
      goals: known ? r.goals.map((g) => g.id) : null, relationBp: r.relationBp, relationHistory: [...r.relationHistory, r.relationBp],
      moves: s.log.filter((l) => l.domain !== "projekt" && l.domain !== "engine").slice(-5).reverse(),
      keyPeople: r.keyPeople.map((k, index) => ({
        index, name: k.name, role: k.role, strength: k.strength, raiseBp: POACH_RAISE_BP, chanceBp: poachChance(data, POACH_RAISE_BP, k.loyaltyBp),
        blocked: validatePoach(state, data, s.id, index, POACH_RAISE_BP),
      })),
    };
  });
}

/** MRK-R52: die letzten Schlagzeilen und Zitate der Rivalen. */
export function rivalTicker(state: GameState, n = 8): LogEntry[] {
  // Prüfung Fable 03.11.2026: höchstens eine Schlagzeile je Studio und Jahr (die jüngste), keine gleich lautenden Zeilen.
  const out: LogEntry[] = [];
  const seen = new Set<string>();
  const all = state.chronicle.filter((c) => c.key.startsWith("log.rival.") || c.key.startsWith("quote."));
  for (let i = all.length - 1; i >= 0 && out.length < n; i--) {
    const c = all[i]!;
    const who = String(c.params.studio ?? "");
    const year = divInt(c.week, WEEKS_PER_YEAR, 1);
    const k1 = `${who}|${year}`;
    const k2 = `${c.key}|${JSON.stringify(c.params)}`;
    if ((who !== "" && seen.has(k1)) || seen.has(k2)) continue;
    seen.add(k1);
    seen.add(k2);
    out.push(c);
  }
  return out;
}
