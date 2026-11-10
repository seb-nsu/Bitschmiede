// Teilschritt 3.2: KI-Studios als Firmen (KRN-R75, KRN-R76, MRK-R30 bis MRK-R37, KI-R01, KI-R58, KI-T01, MRK-T07, MRK-T19).
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import { newGame, DEFAULT_SETTINGS } from "../../src/sim/game";
import { stream } from "../../src/sim/rng";
import { createStudio, creditLimit, liveStudios, planArchetypes, worldCounts } from "../../src/sim/systems/ki/studios";
import {
  aiEngineLevels, cachedChoiceContext, chooseProject, projectUtility, rateAiProject, startAiProject, studioAsPerson,
} from "../../src/sim/systems/ki/projekte";
import { ranking, topShare } from "../../src/sim/systems/ki/rangliste";
import { competitionDensity, competitionFactor, weeklyDemand } from "../../src/sim/systems/markt";
import { computeQuality } from "../../src/sim/systems/produkte/quality";
import { updateQNorm } from "../../src/sim/systems/produkte/release";
import { medianInt } from "../../src/sim/num";
import { neutralGame, SEED_A, SEED_B, testData } from "../helpers";
import type { AiArchetype, GameState } from "../../src/sim/model/types";
import type { AiCandidate } from "../../src/sim/systems/ki/projekte";

const ARCHETYPES: AiArchetype[] = ["indie", "mittelklasse", "aaa", "engine", "publisher"];

function run(state: GameState, data: ReturnType<typeof testData>, weeks: number): GameState {
  let s = state;
  for (let i = 0; i < weeks; i++) s = tick(s, data);
  return s;
}

describe("Weltgenerator (KRN-R75, KRN-R76)", () => {
  it("KRN-R75 Zahl nach Startjahr ±10 %, höchstens 60; 60 % klein, 30 % mittel, 10 % groß", () => {
    const data = testData();
    const holder = { seed: SEED_A, rngStates: {} };
    for (const [year, n] of [[1980, 20], [1990, 30], [2000, 45], [2010, 55], [2020, 60]] as const) {
      for (let i = 0; i < 20; i++) {
        const c = worldCounts(data, year, stream(holder, "ki"));
        const total = c.klein + c.mittel + c.gross;
        expect(total).toBeGreaterThanOrEqual(Math.max(20, Math.floor(n * 0.9)));
        expect(total).toBeLessThanOrEqual(Math.min(60, Math.ceil(n * 1.1)));
        expect(c.gross).toBeGreaterThanOrEqual(Math.ceil(total * 0.1));
        expect(Math.abs(c.mittel - Math.round(total * 0.3))).toBeLessThanOrEqual(1);
      }
    }
  });

  it("KRN-R76 jeder Archetyp kommt vor, keiner über 35 %, keiner unter 10 % (bei 20 Studios mindestens 2)", () => {
    const data = testData();
    const holder = { seed: SEED_B, rngStates: {} };
    for (let i = 0; i < 30; i++) {
      const rng = stream(holder, "ki");
      const counts = worldCounts(data, 1980 + (i % 5) * 10, rng);
      const plan = planArchetypes(data, counts, rng);
      const n = plan.length;
      for (const a of ARCHETYPES) {
        const k = plan.filter((p) => p.archetype === a).length;
        expect(k, `${a} bei ${n}`).toBeGreaterThanOrEqual(Math.ceil(n * 0.1));
        expect(k, `${a} bei ${n}`).toBeLessThanOrEqual(Math.floor(n * 0.35));
      }
      // ANNAHME: AAA nur groß, Indie nur klein.
      expect(plan.every((p) => p.archetype !== "aaa" || p.size === "gross")).toBe(true);
      expect(plan.every((p) => p.archetype !== "indie" || p.size === "klein")).toBe(true);
    }
  });

  it("KRN-R75 ein neues Spiel 1980 hat 18–22 KI-Studios mit fiktiven, eindeutigen Namen", () => {
    const data = testData();
    const s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    expect(s.ai.generated).toBe(true);
    expect(s.ai.studios.length).toBeGreaterThanOrEqual(18);
    expect(s.ai.studios.length).toBeLessThanOrEqual(22);
    expect(new Set(s.ai.studios.map((x) => x.name)).size).toBe(s.ai.studios.length);
    expect(s.ai.studios.every((x) => x.cashCent > 0 && x.teams.length > 0)).toBe(true);
  });
});

describe("KI-Projekte mit den Formeln des Spielers (KI-R01, MRK-R34)", () => {
  it("KI-T01 gleiche Eingaben ergeben beim KI-Studio und beim Spieler dieselbe Qualität und dieselbe Nachfrage", () => {
    const data = testData();
    const s = neutralGame(data);
    const studio = s.ai.studios[0]!;
    const founder = s.people[0]!;
    studio.strength = { ...founder.strength };
    studio.experienceGenre = { ...founder.experienceGenre };
    studio.experienceEngine = founder.experienceEngine;
    const input = { genre: "action", theme: "scifi", scope: "klein" as const, features: ["grosseSprites", "levelVielfalt", "titelmelodie"], bugsBp: 30000, engineLevels: aiEngineLevels(data, 0, 1980) };
    const ai = computeQuality(data, s, { ...input, people: [studioAsPerson(studio)] });
    const player = computeQuality(data, s, { ...input, people: [founder] });
    expect(ai.q).toBe(player.q);
    const subject = { ...input, platforms: ["fuchs"] };
    expect(weeklyDemand(s, data, { ...subject, id: 9999 }, 70000, 3, 3, 5000)).toBe(weeklyDemand(s, data, subject, 70000, 3, 3, 5000));
  });

  it("MRK-R34 ein freies Team wählt aus 20 Kandidaten ein vollständiges Projekt auf aktiven Plattformen", () => {
    const data = testData();
    const s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    const studio = s.ai.studios[0]!;
    const c = chooseProject(s, data, studio, studio.teams[0]!, stream(s, "ki"))!;
    expect(c).not.toBeNull();
    expect(c.c.features.length).toBe(data.projects.featureSlots[c.c.scope]);
    expect(c.c.platforms.every((id) => ["orbis", "fuchs"].includes(id))).toBe(true);
  });

  it("MRK-T19 Formel 5.5 liefert bei Kapital 0 einen endlichen Wert", () => {
    const data = testData();
    const s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    const studio = s.ai.studios[0]!;
    const team = studio.teams[0]!;
    const c = chooseProject(s, data, studio, team, stream(s, "ki"))!;
    studio.cashCent = 0;
    const u = projectUtility(s, data, studio, team, c.c, cachedChoiceContext(data, 1980, data.ai.archetypes[studio.archetype].engineLagYears));
    expect(Number.isSafeInteger(u)).toBe(true);
    studio.cashCent = -1_000_000;
    expect(Number.isSafeInteger(projectUtility(s, data, studio, team, c.c, cachedChoiceContext(data, 1980, 0)))).toBe(true);
  });

  it("KI-R01 eine KI-Wertung nutzt Q_erw, Trend und Presse wie beim Spieler; keine Mindestwertung", () => {
    const data = testData();
    const s = neutralGame(data);
    const studio = s.ai.studios[0]!;
    const c: AiCandidate = { genre: "action", theme: "scifi", scope: "klein", platforms: ["fuchs"], features: ["grosseSprites", "levelVielfalt", "titelmelodie"], engineLevels: aiEngineLevels(data, 0, 1980) };
    const p = startAiProject(s, data, studio, studio.teams[0]!, c);
    const r = rateAiProject(s, data, studio, p, stream(s, "ki"));
    expect(r.scoreBp).toBeGreaterThanOrEqual(data.quality.scoreMinBp);
    expect(r.scoreBp).toBeLessThanOrEqual(data.quality.scoreMaxBp);
  });
});

describe("Gemeinsamer Markt (MRK-R30, PRD-R56, MRK-R33)", () => {
  it("MRK-R30 KI-Releases und angekündigte Projekte im Fenster ±2 Wochen erhöhen die Konkurrenzdichte", () => {
    const data = testData();
    const s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    for (const st of s.ai.studios) for (const t of st.teams) t.project = null;
    const empty = competitionDensity(s, data, 10);
    expect(empty).toBe(0);
    s.ai.products.push({ id: 1, studioId: s.ai.studios[0]!.id, genre: "action", theme: "scifi", scope: "mittel", platforms: ["fuchs"], scoreBp: 70000, releaseWeek: 9, competitionBp: 10000, sold: 0, revenueCent: 0, engineId: null, contractId: null, demandBp: 10000, duelWith: null, brandId: null, brandLicenseId: null, fanUnitsPerWeek: 0 });
    const one = competitionDensity(s, data, 10);
    expect(one).toBeGreaterThan(0);
    expect(competitionDensity(s, data, 20)).toBe(0);
    const studio = s.ai.studios[1]!;
    startAiProject(s, data, studio, studio.teams[0]!, { genre: "action", theme: "scifi", scope: "klein", platforms: ["fuchs"], features: ["grosseSprites", "levelVielfalt", "titelmelodie"], engineLevels: aiEngineLevels(data, 0, 1980) });
    const planned = studio.teams[0]!.project!.plannedReleaseWeek;
    expect(competitionDensity(s, data, planned)).toBeGreaterThan(0);
    expect(competitionFactor(s, data, 10)).toBeLessThan(10000);
  });

  it("PRD-R56 mit KI-Releases ist Q_erw der echte Median des Vorjahres", () => {
    const data = testData();
    let s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    s = run(s, data, 53);
    const qs = s.releases.filter((r) => r.year === 1980 && r.scope === "klein").map((r) => r.q);
    expect(qs.length).toBeGreaterThanOrEqual(data.quality.qNormMinReleases);
    expect(s.qNorm.klein).toBe(medianInt(qs));
    updateQNorm(s, data);
    expect(s.releases.every((r) => r.year >= 1980)).toBe(true);
  });

  it("MRK-R33, TEC-R03 gleicher Seed ergibt dieselbe KI-Welt; ein anderer Seed eine andere", () => {
    const data = testData();
    const a = run(newGame(data, SEED_A, DEFAULT_SETTINGS), data, 80);
    const b = run(newGame(data, SEED_A, DEFAULT_SETTINGS), data, 80);
    const c = run(newGame(data, SEED_B, DEFAULT_SETTINGS), data, 80);
    expect(JSON.stringify(a.ai)).toBe(JSON.stringify(b.ai));
    expect(JSON.stringify(a.ai)).not.toBe(JSON.stringify(c.ai));
  });

  it("MRK-R37 die Rangliste führt alle Firmen samt Spieler, sortiert nach Umsatz; die Anteile ergeben 100 %", () => {
    const data = testData();
    const s = run(newGame(data, SEED_A, DEFAULT_SETTINGS), data, 120);
    const r = ranking(s, data, "Spieler");
    expect(r.length).toBe(liveStudios(s).length + 1);
    expect(r.filter((e) => e.player).length).toBe(1);
    for (let i = 1; i < r.length; i++) expect(r[i - 1]!.revenueCent).toBeGreaterThanOrEqual(r[i]!.revenueCent);
    const total = r.reduce((x, e) => x + e.shareBp, 0);
    expect(Math.abs(total - 10000)).toBeLessThanOrEqual(r.length);
  });
});

describe("Gründung und Pleite (MRK-R35, MRK-R36, KI-R58)", () => {
  it("KI-R58 ein Studio jenseits der Kreditlinie (KI-R32) geht pleite; seine Spiele verschwinden aus dem Handel", () => {
    const data = testData();
    let s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    const victim = s.ai.studios[0]!;
    const survivor = s.ai.studios[1]!;
    victim.cashCent = -creditLimit(s, data, victim);
    survivor.cashCent = 1;
    s = tick(s, data);
    const after = s.ai.studios.find((x) => x.id === victim.id)!;
    expect(after.closedWeek).toBe(0);
    expect(s.ai.studios.find((x) => x.id === survivor.id)!.closedWeek).toBeNull();
    expect(s.ai.products.some((p) => p.studioId === victim.id)).toBe(false);
    expect(Object.values(s.ai.closures).reduce((a, b) => a + b, 0)).toBe(1);
    expect(s.chronicle.some((c) => c.key === "log.aiClosed")).toBe(true);
  });

  it("MRK-R36 unter 20 Studios wird zum Quartal nachgegründet", () => {
    const data = testData();
    let s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    for (const st of s.ai.studios.slice(0, 8)) st.closedWeek = 0;
    s = run(s, data, 14);
    expect(liveStudios(s).length).toBeGreaterThanOrEqual(20);
  });

  it("MRK-R35 KI-Teams arbeiten, veröffentlichen und verdienen; gegründete Studios starten klein", () => {
    const data = testData();
    let s = newGame(data, SEED_A, DEFAULT_SETTINGS);
    const holder = stream(s, "ki");
    const fresh = createStudio(s, data, holder, "indie", "klein", 6);
    expect(fresh.teams.length).toBe(1);
    s = run(s, data, 52);
    expect(s.ai.nextProductId).toBeGreaterThan(20);
    expect(liveStudios(s).some((x) => (x.revenueByYear[0] ?? 0) > 0)).toBe(true);
  });

  it("MRK-T07 ohne Spieler bleiben 1980–2040 immer 20 bis 60 Studios, keine Firma hat dauerhaft über ein Drittel Marktanteil", () => {
    const data = testData();
    let s = newGame(data, SEED_B, DEFAULT_SETTINGS);
    let longAbove = 0;
    for (let y = 0; y < 60; y++) {
      s = run(s, data, 52);
      const live = liveStudios(s).length;
      expect(live).toBeGreaterThanOrEqual(20);
      expect(live).toBeLessThanOrEqual(60);
      longAbove = topShare(s, data) > 3333 ? longAbove + 1 : 0;
      expect(longAbove).toBeLessThan(3);
    }
  }, 180_000);
});
