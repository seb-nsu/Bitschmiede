// Teilschritt 3.9: Büro mit Grundrissen und Ausstattung (S07 FRM-R21 bis FRM-R30, FRM-R65, FRM-R66; S08 MRK-R38).
import { describe, expect, it } from "vitest";
import { tick, validateInput } from "../../src/sim/tick";
import { drawApplicant, hire, maxPersonsNow } from "../../src/sim/systems/firma";
import {
  aiMaybeMove, aiOfficeFor, hardwareFactor, officeDef, officePlaces, officeSlots, overcrowdMorale, qaBonus, slotsOf, placesOf, validateBuyRoom,
} from "../../src/sim/systems/buero";
import { applyDecision } from "../../src/sim/systems/ereignisse";
import { stream } from "../../src/sim/rng";
import { neutralGame, testData } from "../helpers";
import type { GameData, GameState } from "../../src/sim/model/types";

function game(data: GameData, year = 1980): GameState {
  const s = neutralGame(data);
  s.moneyCent = 1e12;
  s.week = (year - s.startYear) * 52;
  s.office.hardware.year = year;
  s.office.upgradeOfferYear = year;
  return s;
}

function fill(s: GameState, data: GameData, n: number): void {
  const rng = stream(s, "personal");
  while (s.people.length < n) hire(s, data, drawApplicant(s, data, rng));
}

describe("Grundrisse (FRM-R21 bis FRM-R23, FRM-R26)", () => {
  it("FRM-T04 Etage mit 15 Plätzen und 18 Personen: Moral −4 je Woche; eine 19. Einstellung wird verhindert", () => {
    const data = testData();
    const s = game(data);
    s.office.id = "etage";
    fill(s, data, 18);
    expect(overcrowdMorale(s, data)).toBe(400);
    expect(maxPersonsNow(s, data)).toBe(18);
    const before = s.people[0]!.moraleBp;
    const t = tick(s, data);
    expect(t.people[0]!.moraleBp).toBe(before - 400);
  });

  it("FRM-T05 Platzangebot „knapp“: eine Garage hat 3 Arbeitsplätze und 1 Ausstattungsplatz", () => {
    const data = testData();
    const s = game(data);
    s.settings.space = "knapp";
    expect(officePlaces(s, data)).toBe(3);
    expect(officeSlots(s, data)).toBe(1);
    s.settings.space = "grosszuegig";
    expect(officePlaces(s, data)).toBe(6);
  });

  it("FRM-R26 Bürohaus: weitere Etage +50 % Plätze, +1 Ausstattungsplatz, +50 % Miete; Campus: weiteres Gebäude +100 Plätze, +2", () => {
    const data = testData();
    const s = game(data, 2005);
    const haus = officeDef(data, "buerohaus");
    expect(placesOf(s, data, haus, 1)).toBe(75);
    expect(slotsOf(s, data, haus, 1)).toBe(5);
    const campus = officeDef(data, "campus");
    expect(placesOf(s, data, campus, 2)).toBe(700);
    expect(slotsOf(s, data, campus, 2)).toBe(14);
    expect(validateInput(s, data, { type: "extendOffice" })).toBe("error.noExtension");
  });
});

describe("Ausstattung (FRM-R27 bis FRM-R30, FRM-R65, FRM-R66)", () => {
  it("FRM-T06 Hardware Stufe 3 von 1994: H im Jahr 2000 = 1,05 × 0,76 = 0,80, das Symptom erscheint", () => {
    const data = testData();
    expect(hardwareFactor(data, 3, 1994, 2000)).toBe(7980);
    expect(hardwareFactor(data, 2, 1980, 1980)).toBe(10000);
    expect(hardwareFactor(data, 1, 1980, 2040)).toBe(7000);
    let s = game(data, 1997);
    s.office.hardware = { level: 3, year: 1994, paidCent: 0 };
    while (!s.log.some((l) => l.key === "log.hardwareOld")) s = tick(s, data);
    expect(s.log.find((l) => l.key === "log.hardwareOld")!.params.year).toBe(1994);
  });

  it("FRM-T08 Tonstudio 1988 gesperrt (ab 1990); FRM-R28 Mindestgröße Etage", () => {
    const data = testData();
    const s = game(data, 1988);
    s.office.id = "etage";
    expect(validateBuyRoom(s, data, "tonstudio")).toBe("error.roomLocked");
    const t = game(data, 1990);
    expect(validateBuyRoom(t, data, "tonstudio")).toBe("error.officeTooSmallForRoom");
    t.office.id = "etage";
    expect(validateBuyRoom(t, data, "tonstudio")).toBeNull();
  });

  it("FRM-T16 Zwei Testlabore: QA +3.000 + 2.100 = 5.100 bp, je ein Ausstattungsplatz", () => {
    const data = testData();
    let s = game(data, 1995);
    s.office.id = "etage_gewerbepark";
    s = tick(s, data, [{ type: "buyRoom", room: "testlabor" }]);
    s = tick(s, data, [{ type: "buyRoom", room: "testlabor" }]);
    expect(s.office.rooms).toEqual(["testlabor", "testlabor"]);
    expect(qaBonus(s, data)).toBe(5100);
    expect(validateBuyRoom(s, data, "tonstudio")).toBeNull();
    // Nur Kapazitätsräume dürfen mehrfach gebaut werden.
    s = tick(s, data, [{ type: "buyRoom", room: "showroom" }]);
    expect(validateBuyRoom(s, data, "showroom")).not.toBeNull();
  });

  it("FRM-T17 Campus mit 10 Plätzen: 5 Großausbauten passen, kein weiterer Raum; Rechenzentrum im Bürohaus gesperrt", () => {
    const data = testData();
    let s = game(data, 2012);
    s.office.id = "buerohaus";
    expect(validateBuyRoom(s, data, "rechenzentrum")).toBe("error.officeTooSmallForRoom");
    s.office.id = "campus";
    for (const r of ["rechenzentrum", "forschungslabor", "qualitaetszentrum", "performanceCapture", "akademie"]) s = tick(s, data, [{ type: "buyRoom", room: r }]);
    expect(s.office.rooms).toHaveLength(5);
    expect(validateBuyRoom(s, data, "tonstudio")).toBe("error.noSlot");
  });

  it("FRM-R30 zur neuen Epoche ein Upgrade-Angebot; „aufrüsten“ kauft die höchste bezahlbare Stufe", () => {
    const data = testData();
    let s = game(data, 1989);
    s.office.upgradeOfferYear = 1980;
    while (!s.events.some((x) => x.kind === "hardwareUpgrade") && s.week < (1991 - s.startYear) * 52) s = tick(s, data);
    const e = s.events.find((x) => x.kind === "hardwareUpgrade")!;
    expect(e).toBeDefined();
    applyDecision(s, data, e, "aufruesten");
    expect(s.office.hardware).toMatchObject({ level: 5, year: 1990 });
  });

  it("FRM-R24 Umzug: Räume ziehen mit, was nicht passt, wird zum halben Preis verkauft", () => {
    const data = testData();
    let s = game(data, 1995);
    s.office.id = "etage_gewerbepark";
    s = tick(s, data, [{ type: "buyRoom", room: "testlabor" }, { type: "buyRoom", room: "tonstudio" }, { type: "buyRoom", room: "showroom" }]);
    expect(s.office.rooms).toHaveLength(3);
    s = tick(s, data, [{ type: "moveOffice", office: "etage" }]);
    expect(s.office.rooms).toEqual(["testlabor", "tonstudio"]);
    expect(s.log.some((l) => l.key === "log.roomSold")).toBe(true);
  });
});

describe("KI-Büros (MRK-R38)", () => {
  it("zieht bei 95 % Belegung um, wenn Kaution und 6 Monatsmieten da sind", () => {
    const data = testData();
    const s = game(data, 1990);
    while (s.ai.studios.length === 0) Object.assign(s, tick(s, data));
    const studio = s.ai.studios[0]!;
    studio.officeId = "garage";
    studio.cashCent = 0;
    aiMaybeMove(s, data, studio, 4);
    expect(studio.officeId).toBe("garage");
    studio.cashCent = 1e10;
    aiMaybeMove(s, data, studio, 4);
    expect(studio.officeId).toBe(aiOfficeFor(s, data, 5).id);
    expect(studio.officeId).not.toBe("garage");
  });
});
