// Etappe 6c.4: Zielgruppe (PRD-R10, PRD-R18, MKT-R10; data/base/dev/audiences.json).
// ANNAHME (Plan 6c, Annahme 5): Die Zielgruppe wirkt über Faktoren, die schon im Wasserfall stehen: Nachfrage
// (Marktgröße · Passung zum Genre), Abfall der Verkaufskurve (Treue), Erwartung der Presse (Q_erw) und Fanbindung.
// Der Preis bleibt die Wahl des Spielers; die Konkurrenzdichte zählt weiter alle Releases (MKT-R10 vereinfacht).
import { type Bp, BP_ONE, mulBp } from "../../num";
import type { AudienceDef, GameData } from "../../model/types";

export function audienceOf(data: GameData, id: string | undefined | null): AudienceDef {
  return data.audiences.list.find((a) => a.id === (id ?? data.audiences.default))
    ?? data.audiences.list.find((a) => a.id === data.audiences.default)!;
}

/** Marktgröße der Zielgruppe mal Passung zum Genre. */
export function audienceDemandBp(data: GameData, id: string | undefined | null, genre: string): Bp {
  const a = audienceOf(data, id);
  return mulBp(a.demandBp, a.genreFitBp[genre] ?? BP_ONE);
}

/** PRD-R18: Eine Altersfreigabe über der Grenze der Zielgruppe sperrt sie (Kinder ab Stufe 2). */
export function validateAudience(data: GameData, id: string | undefined, rating: number): string | null {
  if (id === undefined) return null;
  const a = data.audiences.list.find((x) => x.id === id);
  if (!a) return "error.unknownAudience";
  return rating > a.maxRating ? "error.audienceRating" : null;
}
