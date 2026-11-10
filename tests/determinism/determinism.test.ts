// TEC-R04, KRN-R22, TEC-T01 (kurze Fassung): gleicher Seed und gleiche Eingaben ergeben bitgleiche Spielstände.
import { describe, expect, it } from "vitest";
import { loadBaseData } from "../../src/mods/loadBase";
import { newGame } from "../../src/sim/game";
import { advance, applyInputs, tick } from "../../src/sim/tick";
import { stateChecksum } from "../../src/sim/hash";
import type { GameData, GameState, Input } from "../../src/sim/model/types";
import { botInputs, createBot } from "../../tools/bots";

const WEEKS = 520;
const GENRES = ["action", "rollenspiel", "strategie", "denkspiel", "abenteuer", "simulation"];
const THEMES = ["scifi", "fantasy", "mittelalter", "tiere", "krimi", "wirtschaft"];
const KLEIN = [
  ["grosseSprites", "levelVielfalt", "titelmelodie"],
  ["dialoge", "rundenkampf", "weltkarte"],
  ["gegnerKi", "wirtschaftskreislauf", "farbgrafik"],
];

/** Fester Spielerverlauf: neues Projekt, sobald keins läuft; Release drei Wochen nach Produktionsende. */
function scriptedInputs(state: GameState): Input[] {
  const active = state.projects.find((p) => p.status !== "veroeffentlicht");
  if (!active) {
    const n = state.projects.length;
    return [{
      type: "createProject", title: `Spiel ${n + 1}`, genre: GENRES[n % GENRES.length]!, theme: THEMES[n % THEMES.length]!,
      scope: n % 4 === 3 ? "mittel" : "klein",
      features: n % 4 === 3 ? ["dialoge", "rundenkampf", "weltkarte", "gegnerKi", "standbilder"] : KLEIN[n % KLEIN.length]!,
      people: state.people.filter((p) => p.assignment?.kind !== "contract").map((p) => p.id),
      platforms: [n % 2 === 0 ? "orbis" : "fuchs"].map((id) => (state.week >= 6 * 52 && id === "orbis" ? "standardpc" : id)),
    }];
  }
  // Freie Personen (z. B. nach einem Auftrag) gehen zurück ins laufende Projekt.
  const inputs: Input[] = state.people.filter((p) => p.assignment === null).map((p) => ({ type: "assign", personId: p.id, projectId: active.id }));
  // Entscheidungen: Bewerbungen annehmen, Aufträge mit der letzten Person annehmen, sonst die erste Option.
  for (const e of state.events) {
    if (e.kind === "goldReview") continue;
    const option = e.kind === "bewerbung" ? "einstellen" : e.kind === "auftrag" ? e.options[e.options.length - 2] ?? "ablehnen"
      : e.kind === "nachproduktion" ? "nachproduzieren" : e.options[0]!;
    inputs.push({ type: "decide", eventId: e.id, option });
  }
  if (active.status === "laeuft" && active.playtests.length === 0 && active.phase === "produktion") inputs.push({ type: "playtest", projectId: active.id });
  if (active.status === "bereit" && active.readyWeek !== null && state.week - active.readyWeek >= 3) {
    inputs.push({ type: "release", projectId: active.id });
  }
  return inputs;
}

function run(data: GameData, seed: string, viaApply: boolean): { checksums: string[]; state: GameState } {
  let state = newGame(data, seed);
  const checksums: string[] = [];
  for (let w = 0; w < WEEKS; w++) {
    const inputs = scriptedInputs(state);
    // Weg der Oberfläche: Eingabe sofort anwenden, dann Tick ohne Eingaben; muss dasselbe ergeben.
    state = viaApply ? tick(applyInputs(state, data, inputs), data) : tick(state, data, inputs);
    if ((w + 1) % 52 === 0) checksums.push(stateChecksum(state));
  }
  return { checksums, state };
}

describe("Determinismus", () => {
  const data = loadBaseData();

  it("TEC-R04 TEC-T01 Seed 42: zwei Läufe über 10 Jahre haben nach jedem Jahr dieselbe Prüfsumme", () => {
    const seed = "000000000000002a";
    const a = run(data, seed, false);
    const b = run(data, seed, false);
    expect(a.checksums).toHaveLength(10);
    expect(b.checksums).toEqual(a.checksums);
    expect(a.state.projects.filter((p) => p.status === "veroeffentlicht").length).toBeGreaterThan(10);
  });

  it("TEC-R20 Eingabe sofort anwenden ist gleichwertig zu Schritt 1 des Ticks", () => {
    const seed = "00000000deadbeef";
    expect(run(data, seed, true).checksums).toEqual(run(data, seed, false).checksums);
  });

  it("KRN-R22 ein anderer Seed ergibt einen anderen Verlauf", () => {
    expect(run(data, "0000000000000001", false).checksums.at(-1)).not.toBe(run(data, "0000000000000002", false).checksums.at(-1));
  });

  it("TEC-R89 Etappe 1: 1980–2000 mit Bot zweimal gerechnet ergibt nach jedem Jahr dieselbe Prüfsumme", () => {
    const yearly = (seed: string) => {
      let state = newGame(data, seed);
      const bot = createBot("wachstum", seed);
      const sums: string[] = [];
      for (let w = 0; w < 20 * 52; w++) {
        state = tick(state, data, botInputs(bot, data, state));
        if ((w + 1) % 52 === 0) sums.push(stateChecksum(state));
      }
      return { sums, state };
    };
    const a = yearly("00000000c0ffee00");
    const b = yearly("00000000c0ffee00");
    expect(a.sums).toHaveLength(20);
    expect(b.sums).toEqual(a.sums);
    expect(a.state.gameOver).toBeNull();
  });
});

describe("TEC-T05: Headless-Woche ohne Kopie", () => {
  it("advance schreibt denselben Zustand fort wie tick (Bot „wachstum“, 15 Jahre)", () => {
    const data = loadBaseData();
    const seed = "00000000be0c4000";
    let a = newGame(data, seed);
    let b = newGame(data, seed);
    const botA = createBot("wachstum", seed);
    const botB = createBot("wachstum", seed);
    for (let w = 0; w < 15 * 52; w++) {
      a = tick(a, data, botInputs(botA, data, a));
      b = advance(b, data, botInputs(botB, data, b));
    }
    expect(stateChecksum(b)).toBe(stateChecksum(a));
  });
});
