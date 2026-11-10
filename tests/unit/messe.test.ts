// Teilschritt 4.6: Messe-Saison (MKT-R35 bis MKT-R38, MKT-T10).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { fairFactor, isTradeFair, nextFairWeek, showProject, tradeShelfWeeks } from "../../src/sim/systems/messe";
import { migrateState } from "../../src/sim/save";
import { dateOf } from "../../src/sim/calendar";
import type { GameData, GameState } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, testData, untilReady } from "../helpers";

/** Ein fertiges, angekündigtes Projekt mit 10.000 Interessenten. */
function readyGame(data: GameData): { s: GameState; id: number } {
  let s = tick(neutralGame(data), data, [input()]);
  const id = lastProject(s).id;
  s = untilReady(s, data, id);
  const p = s.projects.find((x) => x.id === id)!;
  p.marketing.announcedWeek = s.week - 1;
  p.marketing.interest = 10000;
  return { s, id };
}

describe("Messe-Saison (MKT-R35 bis MKT-R38)", () => {
  it("MKT-T10 Messe-Demo mit Prognose unter dem Genre-Schnitt: Interesse sinkt um 20 %", () => {
    const data = testData();
    data.marketing.genreAverageDefaultBp = 100000;
    const { s, id } = readyGame(data);
    const p = s.projects.find((x) => x.id === id)!;
    showProject(s, data, p, "demo");
    expect(p.marketing.interest).toBe(8000);
  });

  it("MKT-R37 Demo über dem Genre-Schnitt +30 %, Trailer +15 %", () => {
    const data = testData();
    data.marketing.genreAverageDefaultBp = 0;
    const { s, id } = readyGame(data);
    const p = s.projects.find((x) => x.id === id)!;
    showProject(s, data, p, "demo");
    expect(p.marketing.interest).toBe(13000);
    showProject(s, data, p, "trailer");
    expect(p.marketing.interest).toBe(14950);
    showProject(s, data, p, "nichts");
    expect(p.marketing.interest).toBe(14950);
  });

  it("MKT-R38 Ankündigung auf der Messe wirkt 1,5-mal stärker", () => {
    const data = testData();
    expect(fairFactor(data, "trailer", true, false)).toBe(11500);
    expect(fairFactor(data, "trailer", true, true)).toBe(12250);
    expect(fairFactor(data, "demo", false, true)).toBe(7000);
    const { s, id } = readyGame(data);
    const p = s.projects.find((x) => x.id === id)!;
    p.marketing.announcedWeek = null;
    p.marketing.interest = 0;
    showProject(s, data, p, "trailer");
    expect(p.marketing.announcedWeek).toBe(s.week);
    expect(p.marketing.interest).toBeGreaterThan(0);
  });

  it("MKT-R35 Plan je Projekt: gilt auf der Branchenmesse und fällt danach auf den Vorschlag zurück", () => {
    const data = testData();
    const { s, id } = readyGame(data);
    expect(validateInput(s, data, { type: "setMarketing", projectId: id, fairPlan: "bühne" as never })).toBe("error.unknownOption");
    let s2 = tick(s, data, [{ type: "setMarketing", projectId: id, fairPlan: "nichts" }]);
    expect(s2.projects.find((x) => x.id === id)!.marketing.fairPlan).toBe("nichts");
    // Bis zur Messe vorspulen, ohne dass das Projekt erscheint.
    const fair = nextFairWeek(s2, data);
    s2.week = fair;
    const before = s2.projects.find((x) => x.id === id)!.marketing;
    before.fairPlan = "trailer";
    const interest = before.interest;
    s2 = tick(s2, data);
    const after = s2.projects.find((x) => x.id === id)!.marketing;
    expect(after.fairShownWeek).toBe(fair);
    expect(after.fairPlan).toBe("auto");
    expect(after.interest).toBeGreaterThan(interest);
  });

  it("MKT-R36 Handelsmesse bis 1995: gezeigte Titel behalten den Regalplatz 4 Wochen länger", () => {
    const data = testData();
    expect(isTradeFair(data, 1995)).toBe(true);
    expect(isTradeFair(data, 1996)).toBe(false);
    const { s, id } = readyGame(data);
    const p = s.projects.find((x) => x.id === id)!;
    expect(tradeShelfWeeks(s, data, p)).toBe(0);
    p.marketing.fairShownWeek = s.week - 10;
    expect(tradeShelfWeeks(s, data, p)).toBe(4);
    p.marketing.fairShownWeek = s.week - 60;
    expect(tradeShelfWeeks(s, data, p)).toBe(0);
    p.marketing.fairShownWeek = s.week - 10;
    const released = tick(s, data, [{ type: "release", projectId: id }]);
    expect(released.projects.find((x) => x.id === id)!.sales!.shelfExtraWeeks).toBe(4);
  });

  it("MKT-R36 Entwicklerkonferenz ab 1988: Ruf +0,5 für Studios mit einem Release", () => {
    const data = testData();
    let s = playProject(neutralGame(data), data, input());
    s.startYear = 1990 - dateOf(0, s.week).year;
    s.week += (data.tradeShows.conferenceWeekOfYear - dateOf(s.startYear, s.week).weekOfYear + 52) % 52;
    const rep = s.studioReputationBp;
    s = tick(s, data);
    expect(s.studioReputationBp).toBe(rep + 50);
  });

  it("S05 Abschnitt 7: KI-Studios zeigen ihre zwei stärksten Projekte", () => {
    const data = testData();
    let s = neutralGame(data);
    for (let i = 0; i < 30; i++) s = tick(s, data);
    s.week = nextFairWeek(s, data);
    const studio = [...s.ai.studios].sort((a, b) => b.teams.filter((tm) => tm.project).length - a.teams.filter((tm) => tm.project).length)[0]!;
    const projects = studio.teams.map((tm) => tm.project!).filter(Boolean);
    expect(projects.length).toBeGreaterThan(0);
    for (const p of projects) p.interest = 10000;
    const after = tick(s, data).ai.studios.find((st) => st.id === studio.id)!;
    const boosted = after.teams.map((tm) => tm.project).filter((x) => x && (x.interest ?? 0) > 11000);
    expect(boosted.length).toBe(Math.min(2, projects.length));
  });

  it("Migration 30 → 31: Messe-Plan „auto“", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    const old = structuredClone(s) as unknown as Record<string, unknown> & { schemaVersion: number };
    old.schemaVersion = 30;
    for (const p of old.projects as { marketing: Record<string, unknown> }[]) {
      delete p.marketing.fairPlan;
      delete p.marketing.fairShownWeek;
    }
    const m = migrateState(old);
    expect(m.projects[0]!.marketing.fairPlan).toBe("auto");
    expect(m.projects[0]!.marketing.fairShownWeek).toBeNull();
  });
});

describe("Standgröße der Branchenmesse (S13 AUS-R21, Prüfung Fable: nur die Standgröße)", () => {
  it("AUS-R21 Großer Stand: mehr Interesse und höhere Kosten; ohne Auftritt kostet der Stand nichts", () => {
    const data = testData();
    const run = (booth: "klein" | "gross", plan: "trailer" | "nichts") => {
      const { s, id } = readyGame(data);
      let s2 = tick(s, data, [{ type: "setBooth", booth }]);
      expect(s2.fairBooth).toBe(booth);
      s2.week = nextFairWeek(s2, data);
      s2.projects.find((x) => x.id === id)!.marketing.fairPlan = plan;
      const m0 = s2.finance.ledger.reduce((a, m) => a + m.costs.marketing, 0);
      s2 = tick(s2, data);
      return { interest: s2.projects.find((x) => x.id === id)!.marketing.interest, marketing: s2.finance.ledger.reduce((a, m) => a + m.costs.marketing, 0) - m0 };
    };
    const small = run("klein", "trailer");
    const big = run("gross", "trailer");
    const none = run("gross", "nichts");
    expect(big.interest).toBeGreaterThan(small.interest);
    expect(big.marketing).toBeGreaterThan(small.marketing);
    expect(none.marketing).toBeLessThan(big.marketing);
    expect(fairFactor(data, "trailer", true, false, data.tradeShows.booths.gross.effectBp)).toBeGreaterThan(fairFactor(data, "trailer", true, false));
  });
});
