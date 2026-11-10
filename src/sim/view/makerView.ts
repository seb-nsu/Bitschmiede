// Anzeigemodell der Hersteller (S08 MRK-R14 bis MRK-R26, S11 Markt-Ansicht „Plattformen und Beziehungen“).
import type { Bp, Cent } from "../num";
import type { GameData, GameState, PlatformSchedule } from "../model/types";
import { announced, devkitFee, launched, relation, validateRequestDevkit } from "../systems/plattformen";

export interface MakerPlatformView {
  id: string;
  launchYear: number;
  devkit: number;
  launchRequest: PlatformSchedule["launchRequest"];
  /** null = Antrag möglich, sonst Sperrgrund (Textschlüssel). */
  requestBlocked: string | null;
  feeCent: Cent;
  clockCut: boolean;
}

export interface MakerView {
  id: string;
  relationBp: Bp;
  platforms: MakerPlatformView[];
}

export function makersView(state: GameState, data: GameData): MakerView[] {
  return Object.keys(data.makers.makers).sort().map((id) => ({
    id, relationBp: relation(state, data, id),
    // Sichtbar sind angekündigte Plattformen und solche, für die der Spieler (verschwiegen) ein Devkit hat.
    platforms: data.makers.makers[id]!.filter((p) => {
      const s = state.makers.schedules[p];
      return s && !launched(state, data, p) && (announced(state, data, p) || s.devkit > 0);
    }).map((p) => {
      const s = state.makers.schedules[p]!;
      return {
        id: p, launchYear: data.platforms.find((x) => x.id === p)!.releaseYear, devkit: s.devkit, launchRequest: s.launchRequest,
        requestBlocked: validateRequestDevkit(state, data, p), feeCent: devkitFee(state, data), clockCut: s.clockCut,
      };
    }),
  }));
}
