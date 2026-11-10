// Etappe 6c.4: Zielgruppe (PRD-R10, PRD-R18, PRD-T14, MKT-F2).
import { describe, expect, it } from "vitest";
import { validateInput } from "../../src/sim/tick";
import { weeklyDemand } from "../../src/sim/systems/markt";
import { migrateState } from "../../src/sim/save";
import { boardPreview } from "../../src/sim/view/view";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

describe("Zielgruppe (Etappe 6c.4)", () => {
  it("PRD-R18 PRD-T14 Ab Altersfreigabe 2 ist die Zielgruppe Kinder gesperrt", () => {
    const data = testData();
    const s = neutralGame(data);
    expect(validateInput(s, data, input({ audience: "kinder" }))).toBeNull();
    const rough = input({ audience: "kinder", features: ["drastischeEffekte", "levelVielfalt", "titelmelodie"] });
    expect(validateInput(s, data, rough)).toBe("error.audienceRating");
    expect(validateInput(s, data, { ...rough, audience: "kern" })).toBeNull();
    expect(validateInput(s, data, input({ audience: "senioren" }))).toBe("error.unknownAudience");
    const p = boardPreview(s, data, { ...rough, audience: "kinder" });
    expect(p.ageRating).toBe(2);
  });

  it("MKT-F2 Marktgröße und Genre-Passung der Zielgruppe wirken auf die Nachfrage, die Treue auf den Abfall", () => {
    const data = testData();
    const s = neutralGame(data);
    const base = { platforms: ["fuchs"], genre: "denkspiel", theme: "scifi", scope: "klein" as const };
    const kern = weeklyDemand(s, data, { ...base, audience: "kern" }, 70000, 0, s.week);
    const casual = weeklyDemand(s, data, { ...base, audience: "gelegenheit" }, 70000, 0, s.week);
    // Gelegenheit: Markt 1,3 · Denkspiel 1,2 = 1,56.
    expect(casual / kern).toBeGreaterThan(1.5);
    expect(casual / kern).toBeLessThan(1.62);
    const kernLate = weeklyDemand(s, data, { ...base, audience: "kern" }, 70000, 20, s.week);
    const fanLate = weeklyDemand(s, data, { ...base, genre: "action", audience: "enthusiasten" }, 70000, 20, s.week);
    const fanEarly = weeklyDemand(s, data, { ...base, genre: "action", audience: "enthusiasten" }, 70000, 0, s.week);
    const kernEarly = weeklyDemand(s, data, { ...base, genre: "action", audience: "kern" }, 70000, 0, s.week);
    // Enthusiasten: kleiner Start, aber flachere Kurve.
    expect(fanEarly).toBeLessThan(kernEarly);
    expect(fanLate / fanEarly).toBeGreaterThan(kernLate / kern);
  });

  it("PRD-R10 Die Presse misst an der Erwartung der Zielgruppe", () => {
    const data = testData();
    const kern = lastProject(playProject(neutralGame(data), data, input({ audience: "kern" })));
    const fans = lastProject(playProject(neutralGame(data), data, input({ audience: "enthusiasten" })));
    expect(fans.audience).toBe("enthusiasten");
    expect(fans.result!.qNormBp).toBe(Math.trunc((kern.result!.qNormBp * 11000) / 10000));
  });

  it("TEC-R44 Migration 57 → 58: bisherige Projekte zielen auf Kernspieler", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const old = JSON.parse(JSON.stringify({ ...s, schemaVersion: 57 })) as { projects: Record<string, unknown>[] };
    for (const p of old.projects) delete p.audience;
    const m = migrateState(old as never);
    expect(m.projects[0]!.audience).toBe("kern");
  });
});
