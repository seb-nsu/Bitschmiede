// Teilschritt 4.9: Meilensteine, Ruhmeshalle, langfristiges Ziel (ZIE-R01, ZIE-R02, ZIE-R06, ZIE-T04, ZIE-T15).
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import { goalStep, hallOfFame, initialGoal } from "../../src/sim/systems/ziele";
import { newBrand } from "../../src/sim/systems/marken";
import { brandMarketStep, PLAYER, takeOffer } from "../../src/sim/systems/markenmarkt";
import { generateWorld, liveStudios } from "../../src/sim/systems/ki/studios";
import { newGame } from "../../src/sim/game";
import { migrateState } from "../../src/sim/save";
import type { GameData, GameState } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, SEED_A, testData } from "../helpers";

function marketGame(data: GameData): GameState {
  const s = neutralGame(data, SEED_A, { longTermGoal: "unabhaengig" });
  s.moneyCent = 1e12;
  s.week = (1986 - s.startYear) * 52 + 1;
  s.office.hardware.year = 1986;
  s.office.upgradeOfferYear = 1986;
  generateWorld(s, data);
  for (const st of s.ai.studios) st.cashCent = 1e12;
  return s;
}

describe("Meilensteine (ZIE-R01, ZIE-R02)", () => {
  it("ZIE-T04 Wertung 9,2: „erstes Spiel ab 9,0“ wird einmal ausgelöst und steht in der Chronik", () => {
    const data = testData();
    let s = playProject(neutralGame(data), data, input());
    expect(s.milestones["ersterRelease"]).toBeDefined();
    lastProject(s).result!.scoreBp = 92000;
    s = tick(s, data);
    const week = s.milestones["ersteNeun"];
    expect(week).toBeDefined();
    expect(s.milestones["ersterHit"]).toBeDefined();
    s = tick(tick(s, data), data);
    expect(s.milestones["ersteNeun"]).toBe(week);
    expect(s.chronicle.filter((c) => c.key === "log.milestone" && c.params.id === "ersteNeun")).toHaveLength(1);
  });

  it("ZIE-R02 Meilensteine späterer Etappen werden nie ausgelöst; 100 Mitarbeiter schon", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    while (s.people.length < 100) s.people.push({ ...s.people[0]!, id: s.people.length + 500 });
    goalStep(s, data);
    expect(s.milestones["hundertMitarbeiter"]).toBe(s.week);
    for (const m of data.goals.milestones.filter((x) => x.later)) expect(s.milestones[m.id]).toBeUndefined();
  });

  it("Ruhmeshalle: beste eigene Spiele nach Wertung", () => {
    const data = testData();
    let s = playProject(neutralGame(data), data, input({ title: "Eins" }));
    s = playProject(s, data, input({ title: "Zwei" }));
    s.projects[0]!.result!.scoreBp = 60000;
    s.projects[1]!.result!.scoreBp = 85000;
    expect(hallOfFame(s, data).games.map((p) => p.title)).toEqual(["Zwei", "Eins"]);
  });
});

describe("Langfristiges Ziel (ZIE-R06)", () => {
  it("Höchstens ein Ziel; unbekannte Ziele gibt es nicht", () => {
    const data = testData();
    expect(initialGoal(data, null)).toBeNull();
    expect(initialGoal(data, "eigeneKonsole")).toBeNull();
    expect(newGame(data, SEED_A, { preset: "normal", pressRandom: "aus", decisionDensity: "normal", founderFocus: "gameplay", longTermGoal: "groessteMarke" }).goal)
      .toEqual({ id: "groessteMarke", status: "offen", week: null });
  });

  it("ZIE-T15 „Unabhängig bleiben“: Auslizenzieren lässt das Ziel offen, ein Verkauf verfehlt es", () => {
    const data = testData();
    let s = marketGame(data);
    const b = newBrand(s, data, "Testmarke");
    b.fans["action"] = 1_000_000;
    b.titles.push(999);
    b.firstTitleWeek = s.week - 52;
    b.lastTitleWeek = s.week - 52;
    brandMarketStep(s, data);
    const buyer = liveStudios(s)[0]!;
    s = tick(s, data, [{ type: "offerBrand", brandId: b.id, form: "lizenzspiel", template: "offen", genre: null, priceFactorBp: 10000 }]);
    const lic = s.brandMarket.offers.find((o) => o.brandId === b.id && o.ownerId === PLAYER)!;
    takeOffer(s, data, lic.id, buyer.id);
    expect(s.goal!.status).toBe("offen");
    s = tick(s, data, [{ type: "offerBrand", brandId: b.id, form: "komplettverkauf", template: "offen", genre: null, priceFactorBp: 10000 }]);
    const sale = s.brandMarket.offers.find((o) => o.brandId === b.id && o.ownerId === PLAYER && o.form === "komplettverkauf");
    expect(sale).toBeDefined();
    takeOffer(s, data, sale!.id, liveStudios(s)[1]!.id);
    expect(s.goal!.status).toBe("verfehlt");
  });

  it("Migration 33 → 34: keine Meilensteine, kein Ziel", () => {
    const data = testData();
    const s = tick(neutralGame(data), data, [input()]);
    const old = structuredClone(s) as unknown as Record<string, unknown> & { schemaVersion: number };
    old.schemaVersion = 33;
    delete old.milestones;
    delete old.goal;
    const m = migrateState(old);
    expect(m.milestones).toEqual({});
    expect(m.goal).toBeNull();
  });
});
