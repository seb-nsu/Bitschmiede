// Teilschritt 3.5: Rivalen (S08 MRK-R45 bis MRK-R52, S14 KI-R15 bis KI-R17, KI-R41 bis KI-R50, KI-R60 bis KI-R67).
import { describe, expect, it } from "vitest";
import { tick } from "../../src/sim/tick";
import { newGame, DEFAULT_SETTINGS } from "../../src/sim/game";
import {
  closeYear, copycatDemand, customerSwitched, duelHold, goalContribution, rivalStep, rivalStudios, rollCopycats,
} from "../../src/sim/systems/ki/rivalen";
import { SEED_A, testData } from "../helpers";
import type { AiProject, AiStudio, GameData, GameState, MarketEngine, Project } from "../../src/sim/model/types";

function started(data: GameData, preset = "normal", weeks = 1, marketCycles = true): GameState {
  let s = newGame(data, SEED_A, { ...DEFAULT_SETTINGS, preset, marketCycles } as typeof DEFAULT_SETTINGS);
  // Ohne Bot würde der Spieler pleitegehen und die Welt anhalten.
  s.moneyCent = 1e13;
  for (let i = 0; i < weeks; i++) s = tick(s, data);
  return s;
}

function aiProject(over: Partial<AiProject> = {}): AiProject {
  return {
    genre: "action", theme: "fantasy", scope: "klein", platforms: [], features: [], engineLevels: {} as AiProject["engineLevels"], effortTotalBp: 1, effortDoneBp: 1,
    bugsBp: 0, startWeek: 0, plannedReleaseWeek: 0, polishWeeksLeft: 0, certWeeksLeft: 0, costCent: 0, checked: true, expectedScoreBp: 50000,
    engineId: null, contractId: null, copyOf: null, holdUntilWeek: 0, duel: "keins", duelWith: null, demandBp: 10000, ...over,
  };
}

function playerProject(over: Partial<Project>): Project {
  return { id: 900, title: "Testspiel", genre: "action", theme: "fantasy", scope: "mittel", status: "bereit", result: null, brandId: null, ...over } as Project;
}

describe("Auswahl und Chef (MRK-R45, KI-R60, KI-R15)", () => {
  it("MRK-R45 Normal: vier Rivalen aus mindestens drei Archetypen, jeder mit Chef und 1–2 Zielen", () => {
    const data = testData();
    const s = started(data);
    const rivals = rivalStudios(s);
    expect(rivals).toHaveLength(4);
    expect(new Set(rivals.map((r) => r.archetype)).size).toBeGreaterThanOrEqual(3);
    for (const r of rivals) {
      expect(r.rival!.chief.name).toMatch(/\S+ \S+/);
      expect(r.rival!.goals.length).toBeGreaterThanOrEqual(1);
      expect(r.rival!.goals.length).toBeLessThanOrEqual(2);
    }
  });

  it("MRK-R45 Entspannt: drei Rivalen", () => {
    const data = testData();
    expect(rivalStudios(started(data, "entspannt"))).toHaveLength(3);
  });

  it("KI-R67 Scheidet ein Rivale aus, rückt ein anderes Studio mit Vorstellungs-Schlagzeile nach", () => {
    const data = testData();
    const s = started(data);
    const gone = rivalStudios(s)[0]!;
    gone.closedWeek = s.week;
    rivalStep(s, data);
    const now = rivalStudios(s);
    expect(now).toHaveLength(4);
    expect(now.map((r) => r.id)).not.toContain(gone.id);
    expect(s.chronicle.filter((c) => c.key === "log.rival.intro")).toHaveLength(1);
  });
});

describe("Ziele (KI-R15 bis KI-R17, KI-T08)", () => {
  it("KI-T08 Jeder Rivale hat über zehn Jahre jederzeit 1–2 Ziele; ein erreichtes Ziel gibt genau eine Schlagzeile", () => {
    const data = testData();
    let s = started(data);
    for (let w = 0; w < 520; w++) {
      s = tick(s, data);
      for (const r of rivalStudios(s)) {
        expect(r.rival!.goals.length).toBeGreaterThanOrEqual(1);
        expect(r.rival!.goals.length).toBeLessThanOrEqual(2);
      }
    }
    // Erzwungen: Wachstum mit Ausgangswert 1 ist sofort erreicht, die Schlagzeile kommt genau einmal.
    const r = rivalStudios(s)[0]!;
    r.rival!.goals = [{ id: "wachstum", sinceWeek: s.week, deadlineWeek: s.week + 260, genre: null, base: 1, progress: [] }];
    const count = () => s.chronicle.filter((c) => c.key === "log.rival.goalReached" && c.params.studio === r.name).length;
    const n0 = count();
    for (let w = 0; w < 30; w++) s = tick(s, data);
    expect(count()).toBe(n0 + 1);
  });

  it("KI-R16 Zielbeitrag: Genre-Führer zählt Optionen im Ziel-Genre", () => {
    const data = testData();
    const s = started(data);
    const r = rivalStudios(s)[0]!;
    r.rival!.goals = [{ id: "genreFuehrer", sinceWeek: 0, deadlineWeek: 999, genre: "strategie", base: 0, progress: [] }];
    expect(goalContribution(s, data, r, { genre: "strategie", scope: "klein" }, 5000)).toBe(10000);
    expect(goalContribution(s, data, r, { genre: "action", scope: "klein" }, 5000)).toBe(0);
  });
});

describe("Beziehung, Stimmung und Chef (MRK-R46, KI-R61 bis KI-R63)", () => {
  it("MRK-R46 Beziehung klingt pro Jahr 10 % ab, Groll eines Nachtragenden nur 5 %", () => {
    const data = testData();
    const s = started(data);
    const [a, b] = rivalStudios(s) as [AiStudio, AiStudio];
    a.traits = ["perfektionist", "sparsam"];
    b.traits = ["nachtragend", "sparsam"];
    a.rival!.relationBp = -5000;
    b.rival!.relationBp = -5000;
    closeYear(s, data);
    expect(a.rival!.relationBp).toBe(-4500);
    expect(b.rival!.relationBp).toBe(-4750);
  });

  it("KI-R63 Nach zwei verfehlten Zielen tritt der Chef zurück; Beziehung halbiert, neue Konferenz", () => {
    const data = testData();
    let s = started(data);
    const r = rivalStudios(s)[0]!;
    const chief = r.rival!.chief.name;
    let changed = false;
    for (let q = 0; q < 40 && !changed; q++) {
      r.rival!.chief.goalFailures = 2;
      r.rival!.relationBp = -6000;
      // Der Rivale soll nicht pleitegehen, bevor der Chef wechselt.
      s.ai.studios.find((x) => x.id === r.id)!.cashCent = 1e12;
      for (let w = 0; w < 13; w++) s = tick(s, data);
      const now = s.ai.studios.find((x) => x.id === r.id)!;
      if (now.rival!.chief.name !== chief || s.chronicle.some((c) => c.key === "log.rival.chiefChange" && c.params.studio === r.name)) {
        changed = true;
        expect(s.chronicle.some((c) => c.key === "log.rival.chiefChange" && c.params.studio === r.name)).toBe(true);
        expect(now.log.some((l) => l.domain === "chefwechsel" && l.reasons.length >= 2)).toBe(true);
      }
      Object.assign(r, now);
    }
    expect(changed).toBe(true);
  });
});

/** Dauerhaft hohe Bedrohung im Genre „action“ nur für den ersten Rivalen; die Rivalen-Schritte ohne den Rest des Ticks. */
function countersInYear(preset: string, traits: string[]): { counters: number; headlines: number; reasons: number[] } {
  const data = testData();
  const s = started(data, preset);
  const rivals = rivalStudios(s);
  const a = rivals[0]!;
  const genres = data.genres.map((g) => g.id).filter((g) => g !== "action");
  for (const r of rivals) {
    r.traits = r === a ? traits : ["perfektionist", "sparsam"];
    r.focusGenres = r === a ? ["action", genres[0]!] : [genres[1]!, genres[2]!];
    r.favGenres = r === a ? [] : [genres[3]!];
    r.rival!.goals = [{ id: "wachstum", sinceWeek: 0, deadlineWeek: 99999, genre: null, base: 99999, progress: [] }];
  }
  let counters = 0;
  let headlines = 0;
  const reasons: number[] = [];
  for (let w = 1; w < 104; w++) {
    s.week = w;
    s.ai.quarterGenre = { player: { action: 1e12 }, all: { action: 1e12 } };
    a.forced = null;
    a.rival!.chief.goalFailures = 0;
    a.rival!.angeschlagenQuarters = 0;
    const logBefore = a.log.length;
    const chronBefore = s.chronicle.length;
    rivalStep(s, data);
    if (w >= 52) {
      const fresh = a.log.slice(logBefore).filter((l) => l.domain === "gegenzug");
      counters += fresh.length;
      for (const l of fresh) reasons.push(l.reasons.length);
      headlines += s.chronicle.slice(chronBefore).filter((c) => c.key === "log.rival.counterGenre" && c.params.studio === a.name).length;
    }
  }
  return { counters, headlines, reasons };
}

describe("Bedrohung und Gegenzüge (KI-R42 bis KI-R46)", () => {
  it("KI-T05 Normal: genau zwei Gegenzüge im Jahr", () => {
    expect(countersInYear("normal", ["perfektionist", "sparsam"]).counters).toBe(2);
  });

  it("KI-T05 Nachtragend: drei Gegenzüge im Jahr", () => {
    expect(countersInYear("normal", ["nachtragend", "sparsam"]).counters).toBe(3);
  });

  it("KI-T05 Entspannt: keine Gegenzüge", () => {
    expect(countersInYear("entspannt", ["nachtragend", "sparsam"]).counters).toBe(0);
  });

  it("KI-T17 Jeder Gegenzug hat mindestens zwei Gründe und eine Schlagzeile", () => {
    const r = countersInYear("normal", ["perfektionist", "sparsam"]);
    expect(r.headlines).toBe(r.counters);
    for (const n of r.reasons) expect(n).toBeGreaterThanOrEqual(2);
  });

  it("KI-T17 Jeder Eintrag im Protokoll eines Rivalen hat mindestens zwei Gründe", () => {
    const data = testData();
    const s = started(data, "normal", 260);
    for (const r of rivalStudios(s)) for (const l of r.log) expect(l.reasons.length, `${l.domain}`).toBeGreaterThanOrEqual(2);
  });
});

describe("Nachahmer (KI-R47 bis KI-R49, Formel 6.6)", () => {
  // Die Welt hat 1980 nur 20 Studios (Datenblatt); KI-T06 gilt für die volle Welt, deshalb im Jahr 2010.
  function copycats(preset: string, weeks: number): number[] {
    const data = testData();
    // KI-T06 prüft die Nachahmer, nicht die Marktphasen (MRK-R59): Die Welt läuft ohne Zyklen.
    const s = started(data, preset, weeks, false);
    const out: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const p = playerProject({ id: 10000 + i, genre: data.genres[i % data.genres.length]!.id, theme: data.themes[(i * 7) % data.themes.length]!.id });
      rollCopycats(s, data, p);
      out.push(s.ai.copycats[String(p.id)]!);
      for (const st of s.ai.studios) st.forced = null;
    }
    return out;
  }

  it("KI-T06 Normal: 1.000 Hits ergeben im Mittel 0,8–1,8 Nachahmer, nie mehr als zwei", () => {
    const n = copycats("normal", 1560);
    const mean = n.reduce((a, b) => a + b, 0) / n.length;
    expect(mean).toBeGreaterThanOrEqual(0.8);
    expect(mean).toBeLessThanOrEqual(1.8);
    expect(Math.max(...n)).toBeLessThanOrEqual(2);
  });

  it("KI-T06 Entspannt: keine Nachahmer", () => {
    expect(Math.max(...copycats("entspannt", 1))).toBe(0);
  });

  it("KI-R49 Abklatsch −10 %, besser als das Original +5 % (innerhalb von 104 Wochen)", () => {
    const data = testData();
    const s = started(data);
    s.projects.push(playerProject({ id: 77, status: "veroeffentlicht", result: { week: s.week, quality: { q: 50000 } } as Project["result"] }));
    expect(copycatDemand(s, data, aiProject({ copyOf: 77 }), 40000)).toBe(9000);
    expect(copycatDemand(s, data, aiProject({ copyOf: 77 }), 60000)).toBe(10500);
    s.week += 105;
    expect(copycatDemand(s, data, aiProject({ copyOf: 77 }), 40000)).toBe(10000);
  });
});

describe("Release-Duell (MRK-R47)", () => {
  it("Groll: mit etwa 50 % Duell auf den Termin des Spielers, höchstens eine Verschiebung", () => {
    const data = testData();
    const s = started(data);
    s.projects.push(playerProject({}));
    const r = rivalStudios(s)[0]!;
    r.rival!.relationBp = -5000;
    let duels = 0;
    for (let i = 0; i < 200; i++) {
      const p = aiProject({ interest: 10000 });
      const hold = duelHold(s, data, r, p);
      if (p.duel === "duell") {
        duels += 1;
        expect(hold).toBe(true);
        expect(p.interest).toBe(9000);
        // Kein zweites Verschieben: Die Entscheidung steht.
        duelHold(s, data, r, p);
        expect(p.interest).toBe(9000);
      } else expect(p.duel).toBe("geprueft");
    }
    expect(duels).toBeGreaterThan(70);
    expect(duels).toBeLessThan(130);
    // S05 Abschnitt 9: Der Spieler bekommt die Entscheidung „Konkurrent legt Release auf deine Woche“.
    expect(s.events.some((e) => e.kind === "releaseDuell" && e.options.join() === "halten,verschieben,marketing")).toBe(true);
  });

  it("Respekt: weicht aus und zahlt 10 % Interesse", () => {
    const data = testData();
    const s = started(data);
    s.projects.push(playerProject({}));
    const r = rivalStudios(s)[0]!;
    r.rival!.relationBp = 5000;
    const p = aiProject({ interest: 10000 });
    expect(duelHold(s, data, r, p)).toBe(true);
    expect(p.duel).toBe("ausgewichen");
    expect(p.interest).toBe(9000);
    s.week = p.holdUntilWeek;
    expect(duelHold(s, data, r, p)).toBe(false);
  });

  it("Ohne großen Release des Spielers kein Duell", () => {
    const data = testData();
    const s = started(data);
    const r = rivalStudios(s)[0]!;
    r.rival!.relationBp = -5000;
    const p = aiProject();
    expect(duelHold(s, data, r, p)).toBe(false);
    expect(p.duel).toBe("keins");
  });
});

describe("Engine-Kampf (MRK-R49) und Gedächtnis", () => {
  it("Gewinnt der Spieler einen Kunden eines Engine-Riesen, senkt dieser die Royalty um 1–2 Punkte", () => {
    const data = testData();
    const s = started(data);
    const owner = s.ai.studios[0]!;
    const riese = { id: 501, ownerId: owner.id, name: "Riese", style: "riese", closed: false, templates: { standard: { royaltyBp: 800 } } } as unknown as MarketEngine;
    const mine = { id: 502, ownerId: 0, name: "Meine", style: "spieler", closed: false, templates: {} } as unknown as MarketEngine;
    customerSwitched(s, data, riese, mine);
    const cut = 800 - riese.templates.standard!.royaltyBp;
    expect(cut).toBeGreaterThanOrEqual(100);
    expect(cut).toBeLessThanOrEqual(200);
    expect(s.chronicle.some((c) => c.key === "log.rival.engineFight")).toBe(true);
  });

  it("MRK-R46 Lizenzkunde gewonnen −10, verloren +5 (Rivale als Anbieter)", () => {
    const data = testData();
    const s = started(data);
    const r = rivalStudios(s)[0]!;
    const theirs = { id: 601, ownerId: r.id, name: "X", style: "spezialist", closed: false, templates: {} } as unknown as MarketEngine;
    const mine = { id: 602, ownerId: 0, name: "Y", style: "spieler", closed: false, templates: {} } as unknown as MarketEngine;
    customerSwitched(s, data, theirs, mine);
    expect(r.rival!.relationBp).toBe(-1000);
    customerSwitched(s, data, mine, theirs);
    expect(r.rival!.relationBp).toBe(-500);
    expect(r.rival!.memory.map((m) => m.event)).toEqual(["licenseWon", "licenseLost"]);
  });
});
