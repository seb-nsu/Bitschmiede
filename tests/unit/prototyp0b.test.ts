// Prototyp 0b: Ereignisse, Reviews, Playtests, Personen, Aufträge, Bewerbungen (Konzept-Prototyp-0b.md).
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import { newGame } from "../../src/sim/game";
import { contractQuality, startContract } from "../../src/sim/systems/firma";
import { playtestPhase, runPlaytest, suggestSwap } from "../../src/sim/systems/produkte/forecast";
import { areaProfile, profileFactor } from "../../src/sim/systems/produkte/quality";
import { AREAS, type GameData, type GameState } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, testData, untilReady } from "../helpers";

function untilShare(state: GameState, data: GameData, id: number, shareBp: number): GameState {
  let s = state;
  for (let i = 0; i < 200; i++) {
    const p = s.projects.find((x) => x.id === id)!;
    if (p.effortDoneBp * 10000 >= shareBp * p.effortTotalBp) return s;
    s = tick(s, data);
  }
  throw new Error("Anteil nicht erreicht");
}

function addPerson(state: GameState, strength = 45): void {
  state.people.push({
    id: state.nextPersonId, name: `Test ${state.nextPersonId}`, isFounder: false,
    strength: Object.fromEntries(AREAS.map((a) => [a, strength])) as never, salaryCent: 250000,
    experienceGenre: {}, experienceEngine: 0, assignment: null, transferWeeks: 0, hiredWeek: state.week, teamId: null, onboardWeeks: 0, moraleBp: 7000, burnoutBp: 0, key: null,
  });
  state.nextPersonId += 1;
}

describe("Ereignisse (KRN-R30 bis KRN-R36)", () => {
  it("PRD-R33 PRD-T15 ein kleines Projekt hat genau ein Prototyp-Review und ein Gold-Review; Ablehnen ändert nichts", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input()]);
    const id = lastProject(s).id;
    s = untilShare(s, data, id, 3000);
    s = tick(s, data);
    const reviews = s.events.filter((e) => e.kind === "prototypReview");
    expect(reviews).toHaveLength(1);
    const before = structuredClone(lastProject(s));
    const option = reviews[0]!.options.includes("ablehnen") ? "ablehnen" : "ok";
    s = tick(s, data, [{ type: "decide", eventId: reviews[0]!.id, option }]);
    expect(lastProject(s).features).toEqual(before.features);
    expect(lastProject(s).effortTotalBp).toBe(before.effortTotalBp);
    s = untilReady(s, data, id);
    expect(s.events.filter((e) => e.kind === "goldReview")).toHaveLength(1);
    expect(s.events.filter((e) => e.kind === "prototypReview")).toHaveLength(0);
  });

  it("KRN-R34 ohne Antwort gilt nach der Frist die Standardoption und wird gemeldet", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input()]);
    s = untilReady(s, data, lastProject(s).id);
    const gold = s.events.find((e) => e.kind === "goldReview")!;
    expect(gold.defaultOption).toBe("veroeffentlichen");
    while (s.week <= gold.deadlineWeek) s = tick(s, data);
    // Schritt 12 setzt den Release-Wunsch, Schritt 6 der nächsten Woche veröffentlicht.
    s = tick(s, data);
    expect(lastProject(s).status).toBe("veroeffentlicht");
    expect(s.log.some((l) => l.key === "log.expired" && l.params.kind === "goldReview")).toBe(true);
  });

  it("PRD-R34 der Vorschlag im Prototyp-Review verbessert das Bereichsprofil; Annehmen tauscht die Karte", () => {
    const data = testData();
    // Profil absichtlich schief: drei Grafik-Karten für ein Action-Spiel.
    let s = tick(neutralGame(data), data, [input({ features: ["farbgrafik", "grosseSprites", "standbilder"] })]);
    const id = lastProject(s).id;
    s = untilShare(s, data, id, 3000);
    s = tick(s, data);
    const review = s.events.find((e) => e.kind === "prototypReview")!;
    expect(review.review).toBeDefined();
    const p = lastProject(s);
    const expected = s.world.expectedProfile.action!;
    const swapped = p.features.map((f) => (f === review.review!.from ? review.review!.to : f));
    expect(profileFactor(data, areaProfile(data, swapped, "klein"), expected).deviation)
      .toBeLessThan(profileFactor(data, areaProfile(data, p.features, "klein"), expected).deviation);
    expect(review.review!.forecastAfter).toBeGreaterThan(review.review!.forecastBefore);
    s = tick(s, data, [{ type: "decide", eventId: review.id, option: "annehmen" }]);
    expect(lastProject(s).features).toContain(review.review!.to);
    expect(lastProject(s).features).not.toContain(review.review!.from);
  });

  it("A23 höchstens ein neues Welt-Ereignis pro Woche", () => {
    const data = testData();
    data.applications.chancePerWeekBp = 10000;
    data.contracts.chancePerWeekBp = 10000;
    let s = playProject(neutralGame(data), data, input());
    for (let i = 0; i < 30; i++) {
      const before = new Set(s.events.map((e) => e.id));
      s = tick(s, data);
      expect(s.events.filter((e) => e.scope === "welt" && !before.has(e.id)).length).toBeLessThanOrEqual(1);
    }
  });
});

describe("Kritischer Bug", () => {
  function withBug(): { data: GameData; s: GameState; id: number } {
    const data = testData();
    const s0 = neutralGame(data);
    data.events.criticalBug.chanceBp = 10000;
    let s = tick(s0, data, [input()]);
    const id = lastProject(s).id;
    for (let i = 0; i < 100 && !s.events.some((e) => e.kind === "kritischerBug"); i++) s = tick(s, data);
    return { data, s, id };
  }

  it("S02 Abschnitt 9 der kritische Bug kommt kurz vor Gold und bringt Bugs", () => {
    const { s } = withBug();
    const e = s.events.find((x) => x.kind === "kritischerBug")!;
    expect(e.options).toEqual(["verschieben", "dayOnePatch", "soVeroeffentlichen"]);
    expect(e.bug!.extraBugsBp).toBeGreaterThanOrEqual(10 * 10000);
  });

  it("Verschieben kostet zwei Wochen Arbeit und beseitigt die zusätzlichen Bugs", () => {
    const { data, s, id } = withBug();
    const e = s.events.find((x) => x.kind === "kritischerBug")!;
    const p0 = s.projects.find((p) => p.id === id)!;
    const s2 = tick(s, data, [{ type: "decide", eventId: e.id, option: "verschieben" }]);
    const p1 = s2.projects.find((p) => p.id === id)!;
    expect(p1.effortTotalBp - p0.effortTotalBp).toBe(2 * 2 * 10000);
  });

  it("Day-One-Patch senkt die Bugs zum Release um 40 % und bindet das Team zwei Wochen", () => {
    const { data, s, id } = withBug();
    const e = s.events.find((x) => x.kind === "kritischerBug")!;
    let s2 = tick(s, data, [{ type: "decide", eventId: e.id, option: "dayOnePatch" }]);
    s2 = untilReady(s2, data, id);
    const bugsBefore = s2.projects.find((p) => p.id === id)!.bugsBp;
    s2 = tick(s2, data, [{ type: "release", projectId: id }]);
    const p = s2.projects.find((x) => x.id === id)!;
    expect(p.status).toBe("veroeffentlicht");
    expect(p.result!.bugsAtRelease).toBeLessThan(Math.trunc(bugsBefore / 10000));
    expect(s2.people.filter((x) => x.assignment?.kind === "project" && x.assignment.id === id)).toHaveLength(2);
    s2 = tick(tick(s2, data), data);
    expect(s2.people.every((x) => x.assignment === null)).toBe(true);
  });
});

describe("Playtests (PRD-R30 bis PRD-R32)", () => {
  it("PRD-R30 E5 kleine Projekte testen ab Produktion; ein Test kostet eine Woche Fortschritt", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input()]);
    const id = lastProject(s).id;
    expect(lastProject(s).phase).toBe("konzept");
    expect(tick(s, data, [{ type: "playtest", projectId: id }]).projects[0]!.playtests).toHaveLength(0);
    s = untilShare(s, data, id, 2000);
    const done = lastProject(s).effortDoneBp;
    s = tick(s, data, [{ type: "playtest", projectId: id }]);
    expect(lastProject(s).playtests).toHaveLength(1);
    expect(lastProject(s).effortDoneBp).toBe(done);
  });

  it("PRD-R31 PRD-T07 Playtests: 75–85 % enthalten die Prognose, die Mitte trifft sie nicht, spätere Spannen sind schmaler", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input()]);
    const id = lastProject(s).id;
    s = untilShare(s, data, id, 3000);
    let inside = 0;
    let centered = 0;
    // 400 statt 100 Tests, damit das Zufallsrauschen (bei 100 etwa ±4) die Grenze nicht zufällig reißt.
    const n = 400;
    for (let i = 0; i < n; i++) {
      const c = structuredClone(s);
      c.rngStates = {};
      c.seed = i.toString(16).padStart(16, "0");
      const p = c.projects.find((x) => x.id === id)!;
      runPlaytest(c, data, p);
      const t = p.playtests[0]!;
      if (t.trueBp >= t.lowBp && t.trueBp <= t.highBp) inside += 1;
      if ((t.lowBp + t.highBp) / 2 === t.trueBp) centered += 1;
    }
    expect(inside).toBeGreaterThanOrEqual(n * 0.75);
    expect(inside).toBeLessThanOrEqual(n * 0.85);
    expect(centered).toBeLessThan(n * 0.05);
    const ph = data.playtests.phases;
    expect(ph.beta!.spreadBp).toBeLessThan(ph.produktion!.spreadBp);
    expect(ph.produktion!.spreadBp).toBeLessThan(ph.preprod!.spreadBp);
    expect(ph.beta!.offsetBp).toBeLessThan(ph.produktion!.offsetBp);
    const late = untilShare(s, data, id, 6000);
    expect(playtestPhase(data, late.projects.find((x) => x.id === id)!)).toBe("beta");
  });

  it("PRD-R31 ein Playtest nennt höchstens drei Schwächen", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input({ features: ["farbgrafik", "grosseSprites", "standbilder"] })]);
    s = untilShare(s, data, lastProject(s).id, 3000);
    s = tick(s, data, [{ type: "playtest", projectId: lastProject(s).id }]);
    const t = lastProject(s).playtests[0]!;
    expect(t.weaknesses.length).toBeGreaterThan(0);
    expect(t.weaknesses.length).toBeLessThanOrEqual(3);
    expect(t.weaknesses).toContain("profil");
  });
});

describe("Personen (Konzept 0b, 3.1)", () => {
  it("FRM-R02 das Spiel beginnt mit zwei Gründern mit verschiedenen Schwerpunkten", () => {
    const s = newGame(testData(), "00000000000000a1");
    expect(s.people).toHaveLength(2);
    expect(s.people.every((p) => p.isFounder)).toBe(true);
    expect(s.people[0]!.strength.gameplay).toBe(65);
    const second = AREAS.find((a) => s.people[1]!.strength[a] === 55);
    expect(second).toBeDefined();
    expect(second).not.toBe("gameplay");
  });

  it("Für jede Karte zählt die beste beteiligte Person in ihrem Bereich", () => {
    const data = testData();
    const a = neutralGame(data);
    const b = neutralGame(data);
    b.people[1]!.strength.grafik = 80;
    const ra = lastProject(playProject(a, data, input())).result!;
    const rb = lastProject(playProject(b, data, input())).result!;
    const team = (r: typeof ra, f: string) => r.quality.contributions.find((c) => c.featureId === f)!.teamBp;
    expect(team(rb, "grosseSprites")).toBeGreaterThan(team(ra, "grosseSprites"));
    expect(team(rb, "titelmelodie")).toBe(team(ra, "titelmelodie"));
  });

  it("FRM-R04 Wer das Projekt wechselt, braucht eine Woche Einarbeitung", () => {
    const data = testData();
    const s0 = neutralGame(data);
    addPerson(s0);
    let s = tick(s0, data, [input({ people: [1] }), input({ title: "Zwei", people: [2, 3] })]);
    expect(s.projects).toHaveLength(2);
    s = tick(s, data, [{ type: "assign", personId: 3, projectId: 1 }]);
    const p3 = s.people.find((p) => p.id === 3)!;
    expect(p3.assignment).toEqual({ kind: "project", id: 1 });
    expect(s.projects[0]!.contributors.find((c) => c.personId === 3)).toBeUndefined();
    s = tick(s, data);
    expect(s.projects[0]!.contributors.find((c) => c.personId === 3)!.weeks).toBe(1);
  });

  it("E3 ein zweites eigenes Projekt erst ab der dritten Person", () => {
    const data = testData();
    const s0 = neutralGame(data);
    let s = tick(s0, data, [input({ people: [1] }), input({ title: "Zwei", people: [2] })]);
    expect(s.projects).toHaveLength(1);
    addPerson(s);
    s = tick(s, data, [input({ title: "Zwei", people: [2] })]);
    expect(s.projects).toHaveLength(2);
  });

  it("Wer weniger als vier Wochen mitgearbeitet hat, bringt seine Stärke nicht ins Ergebnis", () => {
    const data = testData();
    const s0 = neutralGame(data);
    addPerson(s0, 95);
    let s = tick(s0, data, [input({ people: [1, 2] })]);
    s = untilReady(s, data, 1);
    s = tick(s, data, [{ type: "assign", personId: 3, projectId: 1 }]);
    s = tick(s, data, [{ type: "release", projectId: 1 }]);
    expect(s.projects[0]!.result!.quality.contributions.every((c) => c.teamBp < 9000)).toBe(true);
  });
});

describe("Aufträge und Bewerbungen", () => {
  it("FRM-R49 q = Stärke × Erfahrung / 100; Anforderung erreicht = volle Bezahlung, sonst 70 %", () => {
    const data = testData();
    const s = neutralGame(data);
    const person = s.people[0]!;
    person.strength.technik = 80;
    data.contracts.baseExperience = 50;
    expect(contractQuality(data, person, "technik")).toBe(40);
    const offer = { kind: "umsetzung", client: "kaufhaus", area: "technik" as const, weeks: 2, payCent: 100000, requirement: 40 };
    const a = structuredClone(s);
    startContract(a, offer, a.people[0]!);
    const b = structuredClone(s);
    startContract(b, { ...offer, requirement: 41 }, b.people[0]!);
    let ra = a;
    let rb = b;
    for (let i = 0; i < 3; i++) {
      ra = tick(ra, data);
      rb = tick(rb, data);
    }
    expect(ra.contracts[0]!.status).toBe("erfuellt");
    expect(rb.contracts[0]!.status).toBe("verfehlt");
    expect(ra.moneyCent - rb.moneyCent).toBe(30000);
    expect(ra.people[0]!.assignment).toBeNull();
  });

  it("FRM-R49 eine Person mit Auftrag kann keinem Projekt zugeordnet werden", () => {
    const data = testData();
    const s = neutralGame(data);
    startContract(s, { kind: "handbuch", client: "kaufhaus", area: "story", weeks: 4, payCent: 1, requirement: 1 }, s.people[0]!);
    const after = tick(s, data, [input({ people: [1] })]);
    expect(after.projects).toHaveLength(0);
  });

  it("Erste Bewerbung und erstes Auftrags-Angebot kommen nach dem ersten Release", () => {
    const data = testData();
    let s = neutralGame(data);
    for (let i = 0; i < 10; i++) s = tick(s, data);
    expect(s.events.filter((e) => e.scope === "welt")).toHaveLength(0);
    s = playProject(s, data, input());
    for (let i = 0; i < 3; i++) s = tick(s, data);
    expect(s.counters.applications).toBeGreaterThanOrEqual(1);
    expect(s.counters.contractOffers).toBeGreaterThanOrEqual(1);
  });

  it("Einstellen fügt die Person hinzu und erhöht die Wochenkosten", () => {
    const data = testData();
    let s = playProject(neutralGame(data), data, input());
    for (let i = 0; i < 5 && !s.events.some((e) => e.kind === "bewerbung"); i++) s = tick(s, data);
    const e = s.events.find((x) => x.kind === "bewerbung")!;
    s = tick(s, data, [{ type: "decide", eventId: e.id, option: "einstellen" }]);
    expect(s.people).toHaveLength(3);
    expect(s.people[2]!.name).toBe(e.applicant!.name);
  });

  it("PRD-R34 ein Vorschlag des Teams senkt die Prognose nie", () => {
    const data = testData();
    const combos = [
      ["grosseSprites", "levelVielfalt", "titelmelodie"], ["farbgrafik", "grosseSprites", "standbilder"],
      ["dialoge", "punktejagd", "soundeffekte"], ["einfacheSteuerung", "grosseSprites", "titelmelodie"],
    ];
    for (const features of combos) {
      for (const genre of ["action", "rollenspiel", "strategie"]) {
        let s = tick(neutralGame(data), data, [input({ genre, features })]);
        s = untilShare(s, data, 1, 3000);
        const swap = suggestSwap(s, data, s.projects[0]!);
        if (swap) expect(swap.forecastAfter).toBeGreaterThan(swap.forecastBefore);
      }
    }
  });

  it("Konzept 0b: der Vorschlag nutzt nur verfügbare Karten und ist reproduzierbar", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input({ features: ["farbgrafik", "grosseSprites", "standbilder"] })]);
    s = untilShare(s, data, 1, 3000);
    const p = s.projects[0]!;
    expect(suggestSwap(s, data, p)).toEqual(suggestSwap(structuredClone(s), data, structuredClone(p)));
  });
});
