// Grundtypen: Bereiche, Umfang, Module (S02 Abschnitt 3, TEC-R80).
// Teil von src/sim/model/types.ts (Prüfung Fable 03.11.2026: Aufteilung nach System); Importe immer über „../model/types“.

export const AREAS = ["gameplay", "grafik", "sound", "story", "technik"] as const;
export type Area = (typeof AREAS)[number];

/** Etappe 0 baut nur klein und mittel (Startauftrag Punkt 5). */
export const SCOPES = ["klein", "mittel", "gross", "aaa"] as const;
export type Scope = (typeof SCOPES)[number];

export type AreaMap<T = number> = Record<Area, T>;
export type ScopeMap<T = number> = Record<Scope, T>;

export type PressRandom = "aus" | "gering" | "normal";

/** S03: acht Module jeder Engine (ENG-R01). */
export const MODULES = ["rendering", "audio", "physik", "ki", "netzwerk", "werkzeuge", "plattformen", "streaming"] as const;
export type ModuleKind = (typeof MODULES)[number];
export type ModuleMap<T = number> = Record<ModuleKind, T>;

export interface ModuleNeed {
  module: ModuleKind;
  level: number;
}
