import { describe, expect, it } from "vitest";
import { newBugs, qaFound } from "../../src/sim/systems/produkte/bugs";
import { ageRating, phaseFor } from "../../src/sim/systems/produkte/projects";
import { tick, validateInput } from "../../src/sim/tick";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

describe("Bugs und QA", () => {
  it("PRD-R29 PRD-T13 400 offene Bugs, 20 Pakete, QA-Kapazität 10: 30 gefunden, mit Testlabor 39", () => {
    const data = testData();
    expect(qaFound(data, 400 * 10000, 20 * 10000, 10 * 10000, 0)).toBe(30 * 10000);
    expect(qaFound(data, 400 * 10000, 20 * 10000, 10 * 10000, data.bugs.testLabBonusBp)).toBe(39 * 10000);
  });

  it("PRD-R25 Bugs entstehen pro erledigtem Paket mit b₀ = 0,8 und steigen mit der Innovation", () => {
    const data = testData();
    expect(newBugs(data, 10 * 10000, 0)).toBe(8 * 10000);
    expect(newBugs(data, 10 * 10000, 10000)).toBe(12 * 10000);
    expect(newBugs(data, 10 * 10000, -10000)).toBe(4 * 10000);
  });

  it("PRD-R29 nach der Produktion fällt die Bug-Kurve jede Woche", () => {
    const data = testData();
    let s = tick(neutralGame(data), data, [input()]);
    while (lastProject(s).status === "laeuft") s = tick(s, data);
    const peak = lastProject(s).bugHistory.at(-1)!;
    // Weniger Wochen als die Frist des Gold-Reviews (KRN-R34), sonst veröffentlicht die Standardantwort.
    for (let i = 0; i < 3; i++) s = tick(s, data);
    expect(lastProject(s).status).toBe("bereit");
    const curve = lastProject(s).bugHistory.slice(-3);
    expect(curve[0]!).toBeLessThan(peak);
    for (let i = 1; i < curve.length; i++) expect(curve[i]!).toBeLessThanOrEqual(curve[i - 1]!);
  });

  it("PRD-R29 mehr Testzeit senkt den Bug-Balken", () => {
    const data = testData();
    const quick = lastProject(playProject(neutralGame(data), data, input(), 0)).result!;
    const careful = lastProject(playProject(neutralGame(data), data, input(), 8)).result!;
    const bugBar = (r: typeof quick) => r.bars.find((b) => b.factor === "bugs")!.value;
    expect(bugBar(careful)).toBeGreaterThan(bugBar(quick));
    expect(careful.bugsAtRelease).toBeLessThan(quick.bugsAtRelease);
  });
});

describe("Phasen und Projekt", () => {
  it("PRD-R20 kleine Projekte: Konzept, Produktion, Launch; mittlere: fünf Phasen", () => {
    const data = testData();
    expect(phaseFor(data, "klein", 0, 100)).toBe("konzept");
    expect(phaseFor(data, "klein", 50, 100)).toBe("produktion");
    expect(phaseFor(data, "klein", 100, 100)).toBe("launch");
    const seen = new Set([0, 10, 30, 90, 100].map((d) => phaseFor(data, "mittel", d, 100)));
    expect([...seen]).toEqual(["konzept", "preprod", "produktion", "beta", "launch"]);
  });

  it("PRD-R18 PRD-T14 Freigabe = höchste Inhaltsstufe aus Thema und Features", () => {
    const data = testData();
    expect(ageRating(data, "krimi", ["drastischeEffekte", "titelmelodie", "dialoge"])).toBe(2);
    expect(ageRating(data, "krimi", ["titelmelodie"])).toBe(1);
    expect(ageRating(data, "tiere", ["titelmelodie"])).toBe(0);
  });

  it("PRD-R21 ein kleines Projekt der Garage dauert 3–6 Monate (Umfang-Ankerwert S02)", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input(), 0);
    const p = lastProject(s);
    const weeks = p.result!.week - p.startWeek;
    expect(weeks).toBeGreaterThanOrEqual(13);
    expect(weeks).toBeLessThanOrEqual(26);
  });

  it("FRM-R38 Kasse: jede Bewegung steht im Monatsbuch (Löhne, Miete, Produktion, Verkäufe)", () => {
    const data = testData();
    const s0 = neutralGame(data);
    let s = playProject(s0, data, input());
    for (let i = 0; i < 20; i++) s = tick(s, data);
    const p = lastProject(s);
    expect(p.costCent).toBeGreaterThan(0);
    expect(p.sales!.sold).toBeGreaterThan(0);
    const income = s.finance.ledger.reduce((sum, m) => sum + m.income.sales + m.income.contracts, 0);
    // MKT-R41: Merchandising steht in einer eigenen Zeile.
    const merch = s.finance.ledger.reduce((sum, m) => sum + m.income.merch, 0);
    const costs = s.finance.ledger.reduce((sum, m) => sum + m.costs.wages + m.costs.rent + m.costs.interest + m.costs.production + m.costs.storage + m.costs.marketing, 0);
    expect(s.moneyCent).toBe(s0.moneyCent + income + merch - costs);
    expect(income).toBe(p.sales!.revenueCent);
  });

});

describe("Eingaben", () => {
  it("TEC-R20 der Kern prüft jede Eingabe gegen den Zustand", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(validateInput(s, data, input())).toBeNull();
    expect(validateInput(s, data, input({ features: ["grosseSprites"] }))).toBe("error.featureCount");
    expect(validateInput(s, data, input({ features: ["grosseSprites", "grosseSprites", "titelmelodie"] }))).toBe("error.duplicateFeature");
    expect(validateInput(s, data, input({ genre: "gibtsnicht" }))).toBe("error.unknownGenre");
    expect(validateInput(s, data, { type: "release", projectId: 1 })).toBe("error.unknownProject");
    const running = tick(s, data, [input()]);
    expect(validateInput(running, data, input())).toBe("error.projectLimit");
    expect(validateInput(s, data, input({ people: [] }))).toBe("error.noPeople");
    expect(validateInput(s, data, input({ people: [99] }))).toBe("error.unknownPerson");
    expect(validateInput(running, data, { type: "release", projectId: 1 })).toBe("error.notReady");
  });

  it("TEC-R20 eine ungültige Eingabe ändert nichts", () => {
    const data = testData();
    const s = neutralGame(data);
    const after = tick(s, data, [input({ features: [] })]);
    expect(after.projects).toHaveLength(0);
  });
});
