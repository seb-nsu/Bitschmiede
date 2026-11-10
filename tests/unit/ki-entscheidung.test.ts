// Teilschritt 3.3: KI-Entscheidungen nach S14 (KI-T02, KI-T07, KI-T10, KI-T18, KI-R23, KI-R32, MRK-R43).
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import { newGame, DEFAULT_SETTINGS } from "../../src/sim/game";
import { stream } from "../../src/sim/rng";
import { creditLimit, liveStudios, monthlyCost } from "../../src/sim/systems/ki/studios";
import { admissible, checkAiProject, chooseProject, startAiProject } from "../../src/sim/systems/ki/projekte";
import type { RatedCandidate } from "../../src/sim/systems/ki/projekte";
import {
  belief, genreThemeKey, learnFromRelease, planBudget, reserveCent, selectOption,
} from "../../src/sim/systems/ki/entscheidung";
import { SEED_A, testData } from "../helpers";
import type { AiBudget, AiDifficulty, GameState } from "../../src/sim/model/types";

function draws(diff: AiDifficulty, n: number): { better: number; gut: number } {
  const data = testData();
  const rng = stream({ seed: SEED_A, rngStates: {} }, "ki");
  let better = 0;
  let gut = 0;
  for (let i = 0; i < n; i++) {
    const c = selectOption(data, diff, [{ utilityBp: 5000, gutBp: 0 }, { utilityBp: 6000, gutBp: 0 }], rng)!;
    if (c.index === 1) better++;
    if (c.viaGut) gut++;
  }
  return { better, gut };
}

function sum(b: AiBudget): number {
  return Object.values(b).reduce((a, x) => a + x, 0);
}

describe("Auswahl mit Temperatur (S14 6.2)", () => {
  it("KI-T02 Abstand 1.000 bp: τ = 200 wählt die bessere in ≥ 99 %, τ = 2.500 in 55–65 %", () => {
    const data = testData();
    const base = data.ai.difficulty.normal!;
    expect(draws({ ...base, temperatureBp: 200, gutBp: 0 }, 10000).better).toBeGreaterThanOrEqual(9900);
    const warm = draws({ ...base, temperatureBp: 2500, gutBp: 0 }, 10000).better;
    expect(warm).toBeGreaterThanOrEqual(5500);
    expect(warm).toBeLessThanOrEqual(6500);
  });

  it("KI-T18 Bauchentscheidungen: Entspannt 20–30 %, Hardcore 1–3 %", () => {
    const data = testData();
    const relaxed = draws(data.ai.difficulty.entspannt!, 10000).gut;
    expect(relaxed).toBeGreaterThanOrEqual(2000);
    expect(relaxed).toBeLessThanOrEqual(3000);
    const hard = draws(data.ai.difficulty.hardcore!, 10000).gut;
    expect(hard).toBeGreaterThanOrEqual(100);
    expect(hard).toBeLessThanOrEqual(300);
  });
});

describe("Lernen (S14 6.7)", () => {
  function learn(preset: string): number[] {
    const data = testData();
    const s = newGame(data, SEED_A, { ...DEFAULT_SETTINGS, preset });
    const genre = data.genres[0]!.id;
    const theme = data.themes[0]!.id;
    for (const g of data.genres) s.trends.genre[g.id] = 10000;
    for (const t of data.themes) s.trends.theme[t.id] = 10000;
    for (const st of liveStudios(s)) st.beliefs.genreTheme[genreThemeKey(data, genre, theme)] = 10000;
    // Das Genre wird dauerhaft doppelt so beliebt; zehn neutrale Releases werden beobachtet.
    s.trends.genre[genre] = 20000;
    for (let i = 0; i < 10; i++) learnFromRelease(s, data, { genre, theme, platforms: ["orbis"], scoreBp: data.quality.scoreBaseBp }, null);
    return liveStudios(s).map((st) => belief(data, st, genre, theme));
  }

  it("KI-T07 Entspannt lernt nicht, Normal erreicht nach zehn Releases mindestens 65 % des neuen Werts", () => {
    expect(learn("entspannt").every((b) => b === 10000)).toBe(true);
    expect(learn("normal").every((b) => b >= 13000)).toBe(true);
  });

  it("KI-R52 ein eigener Flop macht zwei Jahre risikoscheu, eigene Releases zählen doppelt", () => {
    const data = testData();
    const s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    const [a, b] = liveStudios(s);
    const genre = data.genres[0]!.id;
    const theme = data.themes[0]!.id;
    a!.beliefs.genreTheme[genreThemeKey(data, genre, theme)] = 10000;
    b!.beliefs.genreTheme[genreThemeKey(data, genre, theme)] = 10000;
    learnFromRelease(s, data, { genre, theme, platforms: [], scoreBp: data.quality.scoreMinBp }, a!.id);
    // Rundung in bp: höchstens 1 Abweichung.
    expect(Math.abs(10000 - belief(data, a!, genre, theme) - 2 * (10000 - belief(data, b!, genre, theme)))).toBeLessThanOrEqual(1);
    expect(a!.riskShyUntilWeek).toBe(s.week + data.ai.considerations.flopRiskWeeks);
    expect(b!.riskShyUntilWeek).toBeLessThanOrEqual(s.week);
  });
});

describe("Strategiekonferenz und Finanzen (KI-R13, KI-R14, KI-R23, KI-R32)", () => {
  it("KI-T10 jede Konferenz verteilt genau 10.000 bp, auch bei Sparsam und knapper Kasse", () => {
    const data = testData();
    let s: GameState = newGame(data, SEED_A, DEFAULT_SETTINGS);
    for (let w = 0; w < 120; w++) s = tick(s, data);
    const studios = liveStudios(s);
    expect(studios.some((st) => st.log.some((e) => e.domain === "konferenz" && e.week > 0))).toBe(true);
    for (const st of studios) {
      expect(sum(st.budgetBp)).toBe(10000);
      st.traits = ["sparsam"];
      st.cashCent = 0;
      const b = planBudget(s, data, st);
      expect(sum(b)).toBe(10000);
      expect(b.ruecklage).toBe(data.ai.archetypes[st.archetype].budgetBp.ruecklage + 2000);
    }
  });

  function rated(costCent: number, utilityBp: number): RatedCandidate {
    return { c: { genre: "action", theme: "scifi", scope: "klein", platforms: [], features: [], engineLevels: {} as never }, costCent, utilityBp, gutBp: 0, scoreBp: 0, values: {} as never, reasons: [], engine: { engineId: null, contractId: null, levels: {} as never, key: "" } };
  }

  it("KI-R32 Veto: über die Kreditlinie nie; unter der Rücklage nur mit Nutzwert über 0,6", () => {
    const data = testData();
    const s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    const st = liveStudios(s)[0]!;
    st.budgetBp = { ...st.budgetBp, projekte: 10000 };
    const reserve = reserveCent(s, data, st);
    expect(reserve).toBe(data.ai.archetypes[st.archetype].reserveMonths * monthlyCost(s, data, st) + (st.traits.includes("sparsam") ? 2 * monthlyCost(s, data, st) : 0));
    st.cashCent = reserve + 1000;
    const credit = creditLimit(s, data, st);
    const ok = admissible(s, data, st, [rated(st.cashCent + credit + 1, 9500), rated(st.cashCent + 1, 9000), rated(2000, 5000), rated(2000, 6500), rated(500, 4000)]);
    expect(ok.map((o) => o.utilityBp)).toEqual([9000, 6500, 4000]);
  });

  it("KI-R32 ANNAHME: Passt nichts zur Rücklage-Regel, nimmt die KI ein Projekt in der Kreditlinie statt das Team leer laufen zu lassen", () => {
    const data = testData();
    const s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    const st = liveStudios(s)[0]!;
    st.budgetBp = { ...st.budgetBp, projekte: 10000 };
    st.cashCent = 1000;
    const credit = creditLimit(s, data, st);
    const ok = admissible(s, data, st, [rated(st.cashCent + credit + 1, 5000), rated(credit, 3000)]);
    expect(ok.map((o) => o.utilityBp)).toEqual([3000]);
  });

  it("KI-R23 über dem Projekttopf nur mit 20 % mehr Nutzwert als die beste Option im Topf", () => {
    const data = testData();
    const s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    const st = liveStudios(s)[0]!;
    st.cashCent = 1_000_000_000_000;
    st.budgetBp = { ...st.budgetBp, projekte: 5000 };
    const pot = 500_000_000_000;
    const ok = admissible(s, data, st, [rated(pot, 5000), rated(pot + 1, 5999), rated(pot + 1, 6000)]);
    expect(ok.map((o) => o.utilityBp)).toEqual([5000, 6000]);
  });

  it("KI-R04 jede Projektwahl steht mit drei Gründen im Protokoll (höchstens 50 Einträge)", () => {
    const data = testData();
    const s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    const st = liveStudios(s)[0]!;
    for (let i = 0; i < 60; i++) chooseProject(s, data, st, st.teams[0]!, stream(s, "ki"));
    expect(st.log.length).toBe(data.ai.considerations.logSize);
    const last = st.log[st.log.length - 1]!;
    expect(last.domain).toBe("projekt");
    expect(last.reasons.length).toBe(3);
  });
});

describe("Projektprüfung (MRK-R43, KI-R37)", () => {
  function setup(costShare: number) {
    const data = testData();
    for (const a of Object.values(data.ai.archetypes)) a.minScoreBp = 100000;
    const s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    const st = liveStudios(s)[0]!;
    const team = st.teams[0]!;
    const c = chooseProject(s, data, st, team, stream(s, "ki"))!.c;
    const p = startAiProject(s, data, st, team, { ...c, scope: "mittel", features: data.features.filter((f) => f.availableFrom <= 1980).slice(0, data.projects.featureSlots.mittel).map((f) => f.id) });
    p.effortDoneBp = p.effortTotalBp * 3 / 10;
    p.costCent = costShare;
    return { data, s, st, team };
  }

  it("bei schwacher Prognose wird früh abgebrochen", () => {
    const { data, s, st, team } = setup(0);
    checkAiProject(s, data, st, team);
    expect(team.project).toBeNull();
    expect(st.log[st.log.length - 1]!.domain).toBe("abbruch");
  });

  it("nach mehr als der Hälfte des Budgets wird ein mittleres Projekt auf klein umgesteuert", () => {
    const { data, s, st, team } = setup(1e13);
    checkAiProject(s, data, st, team);
    expect(team.project!.scope).toBe("klein");
    expect(team.project!.features.length).toBe(data.projects.featureSlots.klein);
    expect(st.log[st.log.length - 1]!.domain).toBe("umsteuern");
  });
});
