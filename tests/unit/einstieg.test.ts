// Etappe 6c.11: Einstiegsart und Fahrplan (KRN-R40, KRN-R43; docs/design/Konzept-Einstieg.md).
import { describe, expect, it } from "vitest";
import { newGame, DEFAULT_SETTINGS } from "../../src/sim/game";
import { buildView } from "../../src/sim/view/view";
import { neutralGame, testData } from "../helpers";

describe("Einstieg (Etappe 6c.11)", () => {
  it("KRN-R43 Im freien Start sind alle Systeme sofort offen, im geführten keines", () => {
    const data = testData();
    const free = newGame(data, "00000000000000aa", { ...DEFAULT_SETTINGS, guide: "frei" });
    for (const sys of data.unlocks.systems) expect(free.unlocks[sys.id]).toBe(0);
    const guided = newGame(data, "00000000000000aa", { ...DEFAULT_SETTINGS, guide: "gefuehrt" });
    expect(Object.keys(guided.unlocks)).toHaveLength(0);
  });

  it("KRN-R40 Der Fahrplan zeigt auch Teams, Auftragsspiele, groß, AAA, Börse und Übernahmen mit ihren Schwellen", () => {
    const data = testData();
    const v = buildView(neutralGame(data), data);
    const ids = v.roadmap.map((r) => r.id);
    for (const id of ["teams", "auftragsspiele", "gross", "aaa", "boerse", "uebernahmen"]) expect(ids).toContain(id);
    const aaa = v.roadmap.find((r) => r.id === "aaa")!;
    expect(aaa.unlocked).toBe(false);
    expect(aaa.needs[0]).toMatchObject({ field: "jahr", value: 1998 });
  });
});
