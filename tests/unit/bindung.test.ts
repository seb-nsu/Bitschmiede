import { describe, expect, it } from "vitest";
import { freezeShare, freezeWeek, majorSwitchWeeks } from "../../src/sim/systems/bindung";
import { tick } from "../../src/sim/tick";
import type { GameData, GameState, Input } from "../../src/sim/model/types";
import { input as baseInput, lastProject, neutralGame, testData } from "../helpers";

const input: typeof baseInput = (o = {}) => baseInput({ platforms: ["standardpc"], ...o });

function withEngine(data: GameData, year = 1990): GameState {
  const s0 = neutralGame(data);
  s0.week = (year - 1980) * 52;
  s0.unlocks["engine"] = 0;
  s0.moneyCent = 10_000_000_00;
  return tick(s0, data, [{ type: "foundEngine", name: "Kern" }]);
}

function run(s: GameState, data: GameData, n: number, inputs: Input[] = []): GameState {
  let x = tick(s, data, inputs);
  for (let i = 1; i < n; i++) x = tick(x, data);
  return x;
}


describe("Feature-Freeze", () => {
  it("PRD-R27 klein bei 60 % der Produktion, mittel zu Beginn der Beta", () => {
    const data = testData();
    expect(freezeShare(data, "klein")).toBe(1000 + 5400);
    expect(freezeShare(data, "mittel")).toBe(8000);
  });

  it("ENG-T13 Anforderungen eines kleinen und eines mittleren Projekts: Frist am jeweiligen Freeze", () => {
    const data = testData();
    const s0 = withEngine(data);
    s0.people.push({ ...s0.people[0]!, id: 3, name: "C.", assignment: null });
    s0.people.push({ ...s0.people[0]!, id: 4, name: "D.", assignment: null });
    s0.nextPersonId = 5;
    const s = tick(s0, data, [
      input({ features: ["grosseSprites", "levelVielfalt", "pointAndClick"], ordered: ["pointAndClick"], people: [1, 2] }),
      input({ scope: "mittel", features: ["grosseSprites", "levelVielfalt", "titelmelodie", "punktejagd", "dialogbaum"], ordered: ["dialogbaum"], people: [3, 4] }),
    ]);
    const [small, medium] = s.projects;
    expect(small!.pendingFeatures).toEqual(["pointAndClick"]);
    // ENG-R51: beide brauchen KI 1; eine zusammengefasste Anforderung mit der früheren Frist.
    const jobs = s.engine!.jobs.filter((j) => j.kind === "anforderung");
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.projects).toEqual([small!.id, medium!.id]);
    expect(jobs[0]!.deadlineWeek).toBe(Math.min(freezeWeek(s, data, small!), freezeWeek(s, data, medium!)));
  });
});

describe("Anforderungen", () => {
  it("ENG-T04 Zwei Projekte mit Anforderung an dieselbe Stufe: eine Anforderung, früheste Frist", () => {
    const data = testData();
    const s0 = withEngine(data);
    const s1 = tick(s0, data, [input({ features: ["grosseSprites", "levelVielfalt", "pointAndClick"], ordered: ["pointAndClick"], people: [1] })]);
    const deadline1 = s1.engine!.jobs[0]!.deadlineWeek!;
    s1.people.push({ ...s1.people[0]!, id: 3, name: "C.", assignment: null });
    s1.nextPersonId = 4;
    const s2 = tick(s1, data, [input({ features: ["grosseSprites", "levelVielfalt", "dialogbaum"], ordered: ["dialogbaum"], people: [2, 3] })]);
    const jobs = s2.engine!.jobs.filter((j) => j.kind === "anforderung");
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.projects).toHaveLength(2);
    expect(jobs[0]!.deadlineWeek).toBeLessThanOrEqual(deadline1);
  });

  it("PRD-R12 Bestellung nur beim eigenen Engine-Team", () => {
    const data = testData();
    const s0 = withEngine(data);
    expect(tick(s0, data, [input({ features: ["grosseSprites", "levelVielfalt", "pointAndClick"], ordered: ["pointAndClick"], engine: "starter" })]).projects).toHaveLength(0);
    // Ohne Bestellung bleibt die gesperrte Karte verboten.
    expect(tick(s0, data, [input({ features: ["grosseSprites", "levelVielfalt", "pointAndClick"] })]).projects).toHaveLength(0);
  });

  it("ENG-R50 Fertige Anforderung: Das feste Projekt bekommt die Stufe, die Karte ist nicht mehr ausstehend", () => {
    const data = testData();
    const s0 = withEngine(data);
    s0.people.push({ ...s0.people[0]!, id: 3, name: "C.", assignment: null });
    s0.nextPersonId = 4;
    let s = tick(s0, data, [
      { type: "assign", personId: 3, projectId: null, engine: true },
      input({ scope: "mittel", features: ["grosseSprites", "levelVielfalt", "titelmelodie", "punktejagd", "dialogbaum"], ordered: ["dialogbaum"], people: [1, 2] }),
    ]);
    s.engine!.jobs[0]!.effortBp = 100000;
    for (let i = 0; i < 200 && lastProject(s).pendingFeatures.length > 0; i++) s = tick(s, data);
    const p = lastProject(s);
    expect(p.engine.binding).toBe("fest");
    expect(p.engine.levels.ki).toBe(1);
    expect(p.pendingFeatures).toEqual([]);
    expect(s.log.some((l) => l.key === "log.requestDone")).toBe(true);
  });

  it("ENG-T05 Nicht rechtzeitig fertig: am Freeze eine Pflicht-Entscheidung mit drei Optionen; der Fortschritt wartet", () => {
    const data = testData();
    const s0 = withEngine(data);
    // Ohne Engine-Team wird die Anforderung nie fertig.
    let s = tick(s0, data, [input({ features: ["grosseSprites", "levelVielfalt", "pointAndClick"], ordered: ["pointAndClick"] })]);
    for (let i = 0; i < 100 && !s.events.some((e) => e.kind === "anforderungVerpasst"); i++) s = tick(s, data);
    const e = s.events.find((x) => x.kind === "anforderungVerpasst")!;
    expect(e.options).toEqual(["streichen", "verschieben", "notloesung"]);
    expect(e.featureId).toBe("pointAndClick");
    const p = lastProject(s);
    expect(p.effortDoneBp).toBe(Math.trunc((p.effortTotalBp * freezeShare(data, "klein")) / 10000));
    // Notlösung: Karte bleibt mit 70 % Wirkung, +15 Schuld im Modul KI; danach geht es weiter.
    const s2 = run(s, data, 3, [{ type: "decide", eventId: e.id, option: "notloesung" }]);
    expect(lastProject(s2).makeshift).toEqual(["pointAndClick"]);
    expect(s2.engine!.modules.ki.debtBp).toBe(1500);
    expect(lastProject(s2).effortDoneBp).toBeGreaterThan(p.effortDoneBp);
  });

  it("ENG-R53 Streichen: Karte fällt weg, die Anforderung wird zur normalen Forschung", () => {
    const data = testData();
    let s = tick(withEngine(data), data, [input({ features: ["grosseSprites", "levelVielfalt", "pointAndClick"], ordered: ["pointAndClick"] })]);
    for (let i = 0; i < 100 && !s.events.some((e) => e.kind === "anforderungVerpasst"); i++) s = tick(s, data);
    const e = s.events.find((x) => x.kind === "anforderungVerpasst")!;
    const s2 = tick(s, data, [{ type: "decide", eventId: e.id, option: "streichen" }]);
    expect(lastProject(s2).features).toEqual(["grosseSprites", "levelVielfalt"]);
    expect(s2.engine!.jobs[0]!.kind).toBe("forschung");
  });
});

describe("Engine-Bindung", () => {
  it("ENG-R41 Klein und mittel sind standardmäßig fest gebunden", () => {
    const data = testData();
    const s = tick(withEngine(data), data, [input()]);
    expect(lastProject(s).engine.binding).toBe("fest");
  });

  it("ENG-T03 Mitlaufendes Projekt übernimmt ein Update vor dem Freeze mit Integrationszeit, danach nicht mehr", () => {
    const data = testData();
    const s0 = withEngine(data);
    s0.people.push({ ...s0.people[0]!, id: 3, name: "C.", assignment: null });
    s0.nextPersonId = 4;
    s0.engine!.plan = { researchBp: 10000, maintenanceBp: 0, requestsBp: 0 };
    let s = tick(s0, data, [
      { type: "assign", personId: 3, projectId: null, engine: true },
      { type: "planResearch", module: "werkzeuge" },
      input({ scope: "mittel", features: ["grosseSprites", "levelVielfalt", "titelmelodie", "punktejagd", "texteingabe"], people: [1, 2], binding: "mitlaufend" }),
    ]);
    const before = lastProject(s).effortTotalBp;
    // Kurze Forschung, damit sie sicher vor dem Freeze fertig wird.
    s.engine!.jobs[0]!.effortBp = 100000;
    for (let i = 0; i < 200 && s.engine!.modules.werkzeuge.level === 0; i++) s = tick(s, data);
    const p = lastProject(s);
    expect(p.engine.levels.werkzeuge).toBe(1);
    // Integration: eine Woche der Besetzung (zwei Personen, leicht gebremst durch die neue Schuld im Modul).
    expect(p.effortTotalBp).toBeGreaterThan(before + 19000);
    expect(p.effortTotalBp).toBeLessThanOrEqual(before + 20000);
    expect(s.log.some((l) => l.key === "log.integrated")).toBe(true);

    // Nach dem Freeze: kein Update mehr.
    const frozen = structuredClone(s);
    const fp = lastProject(frozen);
    fp.effortDoneBp = Math.trunc((fp.effortTotalBp * 8500) / 10000);
    frozen.engine!.jobs = [];
    let f = tick(frozen, data, [{ type: "planResearch", module: "physik" }]);
    for (let i = 0; i < 200 && f.engine!.modules.physik.level === 0; i++) f = tick(f, data);
    expect(lastProject(f).engine.levels.physik).toBe(0);
  });

  it("ENG-R44 Wechsel auf die neue Hauptversion kostet nach Phase", () => {
    const data = testData();
    const s = tick(withEngine(data), data, [input({ scope: "mittel", features: ["grosseSprites", "levelVielfalt", "titelmelodie", "punktejagd", "texteingabe"] })]);
    const p = lastProject(s);
    expect(majorSwitchWeeks(data, p)).toBe(0);
    p.effortDoneBp = Math.trunc((p.effortTotalBp * 1000) / 10000);
    p.phase = "preprod";
    expect(majorSwitchWeeks(data, p)).toBe(1);
    p.effortDoneBp = Math.trunc((p.effortTotalBp * 5000) / 10000);
    p.phase = "produktion";
    expect(majorSwitchWeeks(data, p)).toBe(5);
    p.effortDoneBp = Math.trunc((p.effortTotalBp * 8500) / 10000);
    p.phase = "beta";
    expect(majorSwitchWeeks(data, p)).toBe(8);
  });
});
