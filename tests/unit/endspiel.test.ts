// Endgame-Themen (Auftrag 04.11.2026): Vermächtnis-Herausforderungen, Nostalgiewelle, Branchen-Standards, Krisen für Große.
import { describe, expect, it } from "vitest";
import type { GameEvent } from "../../src/sim/model/types";
import { applyInputs, validateInput } from "../../src/sim/tick";
import { migrateState } from "../../src/sim/save";
import { buildView } from "../../src/sim/view/view";
import { applyEffects, conditionError, evaluate } from "../../src/sim/systems/katalog";
import { legacy } from "../../src/sim/systems/spielende";
import { averageMonthCosts, endgameStep, serverCrisisBp } from "../../src/sim/systems/endspiel";
import { input, neutralGame, playProject, testData } from "../helpers";

function ev(): GameEvent {
  return { id: 900, kind: "katalog", scope: "welt", projectId: null, createdWeek: 0, deadlineWeek: 4, options: [], defaultOption: "" };
}

describe("Vermächtnis-Herausforderungen", () => {
  it("Höchstens drei gleichzeitig; aufgeben macht Platz", () => {
    const data = testData();
    let s = neutralGame(data);
    const ids = data.goals.endgame.challenges.list.map((c) => c.id);
    for (const id of ids.slice(0, 3)) s = applyInputs(s, data, [{ type: "challenge", id, action: "annehmen" }]);
    expect(s.endgame.challenges.filter((c) => c.status === "aktiv").length).toBe(3);
    expect(validateInput(s, data, { type: "challenge", id: ids[3]!, action: "annehmen" })).toBe("error.challengeLimit");
    s = applyInputs(s, data, [{ type: "challenge", id: ids[0]!, action: "aufgeben" }]);
    expect(validateInput(s, data, { type: "challenge", id: ids[3]!, action: "annehmen" })).toBeNull();
    expect(validateInput(s, data, { type: "challenge", id: "gibtsNicht", action: "annehmen" })).not.toBeNull();
  });

  it("Zählende Größen zählen ab dem Annehmen; erfüllt gibt Ruhmeshalle-Punkte, die in die Vermächtnis-Wertung gehen", () => {
    const data = testData();
    let s = neutralGame(data);
    s.endgame.crisesSurvived = 5;
    s = applyInputs(s, data, [{ type: "challenge", id: "krisenfest", action: "annehmen" }]);
    const c = s.endgame.challenges.find((x) => x.id === "krisenfest")!;
    expect(c.baseline).toBe(5);
    s.week = 4 * 13; // Monatsanfang
    endgameStep(s, data);
    expect(c.status).toBe("aktiv");
    const before = legacy(s, data).totalBp;
    s.endgame.crisesSurvived = 8;
    endgameStep(s, data);
    expect(c.status).toBe("erfuellt");
    const pts = data.goals.endgame.challenges.list.find((x) => x.id === "krisenfest")!.points;
    expect(s.endgame.hallPoints).toBe(pts);
    const after = legacy(s, data);
    expect(after.challengeBp).toBe(pts);
    expect(after.totalBp).toBe(Math.min(10000, before + pts));
    expect(buildView(s, data).endgame.challenges.find((x) => x.id === "krisenfest")!.status).toBe("erfuellt");
  });

  it("Nach dem Ende (Weiterspielen) erfüllt wird vermerkt", () => {
    const data = testData();
    let s = neutralGame(data);
    s = applyInputs(s, data, [{ type: "challenge", id: "krisenfest", action: "annehmen" }]);
    s.ending = { week: 0, reason: "endjahr", legacy: legacy(s, data), milestones: 0, awards: 0, continued: true };
    s.endgame.crisesSurvived = 3;
    s.week = 4 * 13;
    endgameStep(s, data);
    expect(s.endgame.challenges[0]!.afterEnd).toBe(true);
  });
});

describe("Angebot und Platz 1", () => {
  it("Ein Lebenswerk wird nur angeboten, solange weniger als die Hälfte erreicht ist", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    expect(validateInput(s, data, { type: "challenge", id: "jedeEpoche", action: "annehmen" })).toBeNull();
    const decades = data.goals.endgame.challenges.decades;
    for (const [i, d] of decades.entries()) {
      const p = structuredClone(s.projects[0]!);
      p.id = 900 + i;
      p.result!.year = d;
      p.result!.scoreBp = data.brands.hitScoreBp;
      s.projects.push(p);
    }
    expect(validateInput(s, data, { type: "challenge", id: "jedeEpoche", action: "annehmen" })).toBe("error.challengeTooLate");
    expect(buildView(s, data).endgame.challenges.find((c) => c.id === "jedeEpoche")!.offered).toBe(false);
  });

  it("Platz 1 zählt erst ab rankFromYear", () => {
    const data = testData();
    const s = neutralGame(data);
    s.week = 51;
    endgameStep(s, data);
    expect(s.endgame.rankOneYears).toBe(0);
  });
});

describe("Krisen für Große", () => {
  it("Neue Bedingungsfelder sind gültig und lesbar", () => {
    const data = testData();
    const s = neutralGame(data);
    for (const f of ["firma.rang", "firma.marktanteil", "firma.moral", "betrieb.server"]) expect(conditionError({ [f]: { ">=": 0 } })).toBeNull();
    const leak = data.catalog.events.find((d) => d.id === "massenkuendigung")!;
    expect(leak.options.find((o) => o.isDefault)!.id).toBe("gehalt");
    expect(evaluate({ "betrieb.server": { "=": 0 } }, { state: s, data })).toBe(true);
    expect(evaluate({ "firma.moral": { ">=": 0 } }, { state: s, data })).toBe(true);
    for (const id of ["kartellverfahren", "datenleck", "massenkuendigung", "speicherkrise", "stromkrise"]) {
      expect(data.catalog.events.find((d) => d.id === id)?.chain).toBe("krise");
    }
  });

  it("Strafe an der Kasse, Beträge in Monatskosten, Kündigungswelle, Serverkosten und Zählung", () => {
    const data = testData();
    const s = neutralGame(data);
    s.moneyCent = 1_000_000;
    s.finance.ledger = [{ year: 2000, month: 0, income: { sales: 0, contracts: 0, licenses: 0, merch: 0 }, costs: { wages: 50_000, rent: 0, interest: 0, production: 0, storage: 0, other: 0, tax: 0, licenses: 0, marketing: 0, server: 0 } }];
    applyEffects(s, data, ev(), [{ type: "strafeKasse", bp: 2000 }]);
    expect(s.moneyCent).toBe(800_000);
    expect(s.endgame.lastFineCent).toBe(200_000);
    const cost = averageMonthCosts(s);
    applyEffects(s, data, ev(), [{ type: "geldMonatskosten", bp: 20000 }]);
    expect(s.moneyCent).toBe(800_000 - 2 * cost);
    const staff = s.people.filter((p) => !p.isFounder).length;
    applyEffects(s, data, ev(), [{ type: "kuendigung", bp: 10000 }]);
    expect(s.people.filter((p) => !p.isFounder).length).toBe(0);
    expect(s.people.length).toBeGreaterThan(0);
    expect(staff).toBeGreaterThanOrEqual(0);
    applyEffects(s, data, ev(), [{ type: "serverKosten", bp: 6000, weeks: 26 }, { type: "krisenfest" }]);
    expect(serverCrisisBp(s)).toBe(16000);
    expect(s.endgame.crisesSurvived).toBe(1);
    s.week += 26;
    expect(serverCrisisBp(s)).toBe(10000);
  });
});

describe("Migration 65 → 66", () => {
  it("Ältere Stände bekommen leere Endgame-Daten", () => {
    const data = testData();
    const old = structuredClone(neutralGame(data)) as unknown as Record<string, unknown> & { schemaVersion: number };
    delete old.endgame;
    old.schemaVersion = 65;
    const g = migrateState(old).endgame;
    expect(g.challenges).toEqual([]);
    expect(g.hallPoints).toBe(0);
    expect(g.serverCrisis).toBeNull();
    expect(Object.keys(g).sort()).toEqual(Object.keys(neutralGame(data).endgame).sort());
  });
});
