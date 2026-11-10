// Teilschritt 1.6: Ereigniskatalog, Bedingungssprache, Freischaltungen, Chronik, Jahrbuch (S01).
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import { applyEffects, conditionError, evaluate } from "../../src/sim/systems/katalog";
import type { GameEvent } from "../../src/sim/model/types";
import { input, neutralGame, playProject, testData } from "../helpers";

function ev(over: Partial<GameEvent> = {}): GameEvent {
  return { id: 99, kind: "katalog", scope: "welt", projectId: null, createdWeek: 0, deadlineWeek: 4, options: ["a"], defaultOption: "a", ...over };
}

describe("Bedingungssprache (S01 5.4)", () => {
  it("S01 5.4 alle, eines, nicht und die Vergleiche", () => {
    const data = testData();
    const state = neutralGame(data);
    const ctx = { state, data };
    expect(evaluate({ alle: [{ jahr: { ">=": 1980 } }, { "firma.mitarbeiter": { "=": 2 } }] }, ctx)).toBe(true);
    expect(evaluate({ alle: [{ jahr: { ">=": 1985 } }, { "firma.mitarbeiter": { "=": 2 } }] }, ctx)).toBe(false);
    expect(evaluate({ eines: [{ jahr: { ">=": 1985 } }, { "firma.mitarbeiter": { "<": 3 } }] }, ctx)).toBe(true);
    expect(evaluate({ nicht: { "firma.releases": { ">": 0 } } }, ctx)).toBe(true);
    expect(evaluate({ "firma.kasse": { ">=": 50000, "<=": 50000 } }, ctx)).toBe(true);
    expect(evaluate(null, ctx)).toBe(true);
  });

  it("TEC-R33 unbekannte Felder und Vergleiche werden beim Laden gemeldet", () => {
    expect(conditionError({ alle: [{ "firma.ruhm": { ">=": 1 } }] })).toMatch(/unbekanntes Feld/);
    expect(conditionError({ jahr: { "!=": 1990 } })).toMatch(/unbekannter Vergleich/);
    expect(conditionError({ alle: [{ jahr: { ">=": 1985 } }] })).toBeNull();
  });
});

describe("Katalog-Ereignisse", () => {
  it("Historisch: Der Crash 1983 erscheint als Information in Bericht und Chronik, ohne Entscheidung", () => {
    const data = testData();
    let s = neutralGame(data);
    s.week = 3 * 52 - 1;
    s = tick(tick(s, data), data);
    expect(s.chronicle.some((c) => c.key === "chronicle.info" && c.params.id === "crash1983")).toBe(true);
    expect(s.events.some((e) => e.defId === "crash1983")).toBe(false);
  });

  it("Historisch: 1990 kommt die Entscheidung zur neuen Rechnergeneration", () => {
    const data = testData();
    let s = neutralGame(data);
    s.week = 10 * 52;
    s = tick(tick(s, data), data);
    expect(s.events.some((e) => e.defId === "hardware1990")).toBe(true);
  });

  it("KRN-R31 A23 mit Katalog höchstens ein neues Welt-Ereignis pro Woche; KRN-R36 Abklingzeit", () => {
    const data = testData();
    let s = playProject(neutralGame(data), data, input());
    data.catalog.chancePerWeekBp = 10000;
    data.applications.chancePerWeekBp = 10000;
    data.contracts.chancePerWeekBp = 10000;
    const seen: Record<string, number[]> = {};
    for (let i = 0; i < 60; i++) {
      const before = new Set(s.events.map((e) => e.id));
      s = tick(s, data);
      const fresh = s.events.filter((e) => e.scope === "welt" && !before.has(e.id));
      expect(fresh.length).toBeLessThanOrEqual(1);
      for (const e of fresh) if (e.defId) (seen[e.defId] ??= []).push(s.week);
      s = tick(s, data, s.events.map((e) => ({ type: "decide" as const, eventId: e.id, option: e.defaultOption })));
    }
    for (const [id, weeks] of Object.entries(seen)) {
      const cd = data.catalog.events.find((d) => d.id === id)!.cooldownWeeks;
      for (let i = 1; i < weeks.length; i++) expect(weeks[i]! - weeks[i - 1]!).toBeGreaterThanOrEqual(cd);
    }
  });

  it("Wirkungen: Geld (aufs Jahr hochgerechnet), Stärke, Gehalt, Weggang, Nachfrage, Aufwand, Bugs", () => {
    const data = testData();
    let s = playProject(neutralGame(data), data, input());
    s = tick(s, data, [input({ title: "Zwei" })]);
    const money = s.moneyCent;
    const product = s.projects[0]!;
    const project = s.projects[1]!;
    const person = s.people[1]!;
    const strength = person.strength.technik;
    const effort = project.effortTotalBp;
    applyEffects(s, data, ev({ projectId: project.id, personId: person.id, productId: product.id }), [
      { type: "geld", cent: -100000 },
      { type: "staerke", who: "alle", area: "technik", points: 3 },
      { type: "gehalt", bp: 2000 },
      { type: "nachfrage", bp: -2000 },
      { type: "aufwand", pwPerPerson: 1 },
    ]);
    expect(s.moneyCent).toBe(money - 100000);
    expect(person.strength.technik).toBe(strength + 3);
    expect(product.sales!.demandFactorBp).toBe(8000);
    expect(project.effortTotalBp).toBe(effort + 2 * 10000);
    applyEffects(s, data, ev({ personId: person.id }), [{ type: "geht" }]);
    expect(s.people.some((p) => p.id === person.id)).toBe(false);
  });
});

describe("Ereignisplaner (S01 5.2)", () => {
  it("S01 5.2 ein Welt-Angebot in einer belegten Woche rückt in die nächste freie Woche, höchstens 2 Wochen später", () => {
    const data = testData();
    let s = playProject(neutralGame(data), data, input());
    data.contracts.chancePerWeekBp = 10000;
    data.applications.chancePerWeekBp = 0;
    s.counters.applications = 1;
    // Der Vorschlag „Kopierschutz entfernen“ (MKT-R56) soll die Wochen hier nicht belegen.
    s.projects[0]!.sales!.protection!.offered = true;
    // Ein Projekt-Ereignis belegt die Woche: das Auftrags-Angebot wartet.
    s = tick(s, data, [input({ title: "Zwei" })]);
    s.events = [];
    s.eventQueue = [];
    s.projects[1]!.effortDoneBp = s.projects[1]!.effortTotalBp - 1;
    const week = s.week;
    s = tick(s, data);
    expect(s.events.some((e) => e.kind === "goldReview" && e.createdWeek === week)).toBe(true);
    expect(s.events.some((e) => e.scope === "welt")).toBe(false);
    expect(s.eventQueue).toHaveLength(1);
    // In der nächsten Woche ohne neues Projekt-Ereignis erscheint es mit neuer Woche und Frist.
    s = tick(s, data);
    const offer = s.events.find((e) => e.kind === "auftrag")!;
    expect(offer.createdWeek).toBe(week + 1);
    expect(offer.deadlineWeek).toBe(week + 1 + data.events.deadlineWeeks.welt);
    expect(s.eventQueue).toHaveLength(0);
  });
});

describe("Krisen (S01 5.1, S07 Abschnitt 9)", () => {
  it("S07 Insolvenzwarnung: kommt ohne Auslosung, sobald die Kasse im Minus ist, und belegt den Wochenplatz", () => {
    const data = testData();
    let s = neutralGame(data);
    s.moneyCent = -100;
    s = tick(s, data);
    const warn = s.events.filter((e) => e.defId === "insolvenzwarnung");
    expect(warn).toHaveLength(1);
    expect(s.events.filter((e) => e.scope === "welt")).toHaveLength(1);
    // Abklingzeit 13 Wochen: nach der Antwort nicht sofort wieder.
    s = tick(s, data, [{ type: "decide", eventId: warn[0]!.id, option: "durchhalten" }]);
    expect(s.events.some((e) => e.defId === "insolvenzwarnung")).toBe(false);
  });

  it("S07 Insolvenzwarnung: Gehaltsverzicht senkt alle Gehälter um 15 %", () => {
    const data = testData();
    let s = neutralGame(data);
    s.moneyCent = -100;
    s = tick(s, data);
    const before = s.people.map((p) => p.salaryCent);
    const warn = s.events.find((e) => e.defId === "insolvenzwarnung")!;
    s = tick(s, data, [{ type: "decide", eventId: warn.id, option: "gehaltsverzicht" }]);
    expect(s.people.map((p) => p.salaryCent)).toEqual(before.map((c) => c - Math.trunc((c * 1500) / 10000)));
  });
});

describe("Freischaltungen (KRN-R40, KRN-R41)", () => {
  it("KRN-R41 Systeme mit eigenem Ereignis sofort; sonst höchstens eines je Release", () => {
    const data = testData();
    let s = playProject(neutralGame(data), data, input());
    s = tick(s, data);
    expect(s.unlocks.auftraege).toBeDefined();
    expect(s.unlocks.bewerbungen).toBeDefined();
    expect(s.unlocks.zeitleiste).toBeDefined();
    expect(s.unlocks.produkttypen).toBeUndefined();
    s = playProject(s, data, input({ title: "Zwei" }));
    s = tick(s, data);
    expect(s.unlocks.produkttypen).toBeDefined();
  });

  it("KRN-R41 ohne Release spätestens nach 26 Wochen", () => {
    const data = testData();
    let s = playProject(neutralGame(data), data, input());
    for (let i = 0; i < 27; i++) s = tick(s, data);
    expect(s.unlocks.produkttypen).toBeDefined();
  });
});

describe("Chronik und Jahrbuch (KRN-R61, KRN-R62)", () => {
  it("KRN-R62 in Woche 52 entsteht das Jahrbuch mit Releases, Einnahmen und Kosten", () => {
    const data = testData();
    let s = playProject(neutralGame(data), data, input());
    while (s.week <= 51) s = tick(s, data);
    expect(s.yearbooks).toHaveLength(1);
    const y = s.yearbooks[0]!;
    expect(y.year).toBe(1980);
    expect(y.releases).toHaveLength(1);
    expect(y.costsCent).toBeGreaterThan(0);
    expect(y.chronicle.some((c) => c.key === "log.released")).toBe(true);
  });

  it("KRN-R61 neue Plattformen erscheinen in der Chronik ihres Startjahres", () => {
    const data = testData();
    let s = neutralGame(data);
    s.week = 5 * 52 - 1;
    s = tick(tick(s, data), data);
    expect(s.chronicle.some((c) => c.key === "log.platformNew" && c.params.platform === "nova")).toBe(true);
  });
});
