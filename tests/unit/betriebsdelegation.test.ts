// Etappe 5.14: Delegation im Betrieb (S06 Abschnitt 6, BTR-R03, BTR-T10).
import { describe, expect, it } from "vitest";
import { applyInputs } from "../../src/sim/tick";
import { addEvent } from "../../src/sim/systems/ereignisse";
import { delegationStep, producersRunOperations } from "../../src/sim/systems/delegation";
import { opsDelegationStep, producerSplit } from "../../src/sim/systems/betriebsdelegation";
import { setOperations } from "../../src/sim/systems/betrieb";
import { brandMonth, satisfactionDelta } from "../../src/sim/systems/marken";
import { initLive } from "../../src/sim/systems/live";
import { isFirstWeekOfMonth } from "../../src/sim/calendar";
import { migrateState } from "../../src/sim/save";
import { OPS_POTS, type GameData, type GameState } from "../../src/sim/model/types";
import { input, lastProject, neutralGame, playProject, testData } from "../helpers";

/** Ein veröffentlichtes Live-Service-Spiel plus `extra` Kopien; Woche auf einen Monatsanfang gestellt. */
function liveStudio(data: GameData, extra: number, base = 50000): GameState {
  const s = playProject(neutralGame(data), data, input());
  const p = lastProject(s);
  p.type = "liveService";
  p.ops!.live = initLive(s, data, p)!;
  p.ops!.live.base = base;
  p.sales!.ended = true;
  p.ops!.patch = null;
  for (const x of s.people) x.assignment = null;
  for (let i = 1; i <= extra; i++) s.projects.push({ ...structuredClone(p), id: p.id + 100 * i, title: `${p.title} ${i}` });
  while (!isFirstWeekOfMonth(s.startYear, s.week)) s.week += 1;
  return s;
}

function withProducer(s: GameState): GameState {
  const person = s.people.find((x) => !x.isFounder) ?? s.people[0]!;
  s.delegation.producers.push({ personId: person.id, attrs: { planning: 60, quality: 60, risk: 50, experience: 60, communication: 60 }, maxProjects: 3 });
  return s;
}

describe("Produzenten im Betrieb (BTR-R03, BTR-T10)", () => {
  it("BTR-T10: drei Live-Services und ein Produzent: Betriebskarten entscheidet der Produzent mit dem Standard", () => {
    const data = testData();
    const s = withProducer(liveStudio(data, 2));
    expect(producersRunOperations(s, data)).toBe(true);
    const p = lastProject(s);
    const e = addEvent(s, data, { kind: "schwererBug", scope: "projekt", projectId: null, productId: p.id, options: ["hotfix", "naechsterPatch"], defaultOption: "hotfix" });
    delegationStep(s, data);
    expect(s.events.some((x) => x.id === e.id)).toBe(false);
    expect(s.delegation.history.at(-1)).toMatchObject({ by: "produzent" });
  });

  it("BTR-R03: unter drei Live-Services bleibt der Betrieb beim Spieler", () => {
    const data = testData();
    const s = withProducer(liveStudio(data, 1));
    expect(producersRunOperations(s, data)).toBe(false);
  });

  it("BTR-T10: die Töpfe folgen der Last; jeder hat den Mindestanteil, die Summe ist 100 %", () => {
    const data = testData();
    const s = withProducer(liveStudio(data, 2));
    opsDelegationStep(s, data);
    const split = producerSplit(s, data);
    expect(s.operations.splitBp).toEqual(split);
    expect(OPS_POTS.reduce((a, k) => a + split[k], 0)).toBe(10000);
    for (const k of OPS_POTS) expect(split[k]).toBeGreaterThanOrEqual(data.liveService.delegation.minPotBp);
    expect(split.liveops).toBeGreaterThan(data.liveService.delegation.minPotBp);
  });

  it("BTR-R03: eine eigene Aufteilung des Spielers schaltet die Produzenten-Aufteilung ab", () => {
    const data = testData();
    const s = withProducer(liveStudio(data, 2));
    const own = { liveops: 2500, service: 2500, community: 2500, support: 2500 };
    setOperations(s, { type: "setOperations", splitBp: own });
    expect(s.operations.splitAuto).toBe(false);
    opsDelegationStep(s, data);
    expect(s.operations.splitBp).toEqual(own);
  });
});

describe("Regeln im Betrieb (S06 Abschnitt 6)", () => {
  it("Zufriedenheit unter 60 und bekannte Bugs: mit der Abteilung Betrieb wird ein kleiner Patch geplant", () => {
    const data = testData();
    const s = liveStudio(data, 0);
    const p = lastProject(s);
    p.ops!.satisfactionBp = 5000;
    p.ops!.known = { leicht: 5, mittel: 0, schwer: 0 };
    opsDelegationStep(s, data);
    expect(p.ops!.patch).toBeNull();
    s.unlocks["betrieb"] = s.week;
    opsDelegationStep(s, data);
    expect(p.ops!.patch).not.toBeNull();
    expect(p.ops!.patch!.size).toBe("klein");
  });

  it("ohne die Regel kein Auto-Patch", () => {
    const data = testData();
    const s = liveStudio(data, 0);
    s.unlocks["betrieb"] = s.week;
    s.operations.autoPatch = false;
    const p = lastProject(s);
    p.ops!.satisfactionBp = 5000;
    p.ops!.known = { leicht: 5, mittel: 0, schwer: 0 };
    opsDelegationStep(s, data);
    expect(p.ops!.patch).toBeNull();
  });

  it("Spielerbasis unter der Schwelle und Verlust: Einstellen wird vorgeschlagen, einmal", () => {
    const data = testData();
    const s = liveStudio(data, 0, 500);
    const p = lastProject(s);
    p.ops!.live!.weekRevenueCent = 0;
    p.ops!.live!.server.startWeek = s.week - 100;
    opsDelegationStep(s, data);
    opsDelegationStep(s, data);
    const cards = [...s.events, ...s.eventQueue].filter((e) => e.kind === "einstellenVorschlag");
    expect(cards).toHaveLength(1);
    const after = applyInputs(s, data, [{ type: "decide", eventId: cards[0]!.id, option: "einstellen" }]);
    expect(lastProject(after).ops!.live!.shutdownWeek).not.toBeNull();
  });

  it("Migration 44 → 45: Betrieb bekommt Produzenten-Aufteilung, Patch-Regel und Schwelle", () => {
    const data = testData();
    const s = playProject(neutralGame(data), data, input());
    const old = structuredClone(s) as unknown as Record<string, unknown>;
    old.schemaVersion = 44;
    const ops = old.operations as Record<string, unknown>;
    delete ops.splitAuto;
    delete ops.autoPatch;
    delete ops.shutdownBelow;
    const m = migrateState(old as never);
    expect(m.operations).toMatchObject({ splitAuto: true, autoPatch: true, shutdownBelow: 10000 });
  });
});

describe("Zufriedenheit wirkt auf die Marke (BTR-R14)", () => {
  it("BTR-R14: hohe Zufriedenheit hebt den Markenruf im Monat, niedrige senkt ihn", () => {
    const data = testData();
    for (const [z, sign] of [[9000, 1], [3000, -1]] as const) {
      const s = liveStudio(data, 0);
      const p = lastProject(s);
      const b = s.brands.find((x) => x.id === p.brandId)!;
      p.ops!.satisfactionBp = z;
      const before = b.reputationBp = 5000;
      brandMonth(s, data);
      expect(Math.sign(b.reputationBp - before)).toBe(sign);
    }
  });

  it("BTR-R14: Zufriedenheit des Vorgängers verändert die Startfans im Verhältnis 1 ± 0,2 · Δ", () => {
    const data = testData();
    const s = liveStudio(data, 0);
    const p = lastProject(s);
    const b = s.brands.find((x) => x.id === p.brandId)!;
    p.ops!.satisfactionBp = data.operations.satisfaction.neutralBp * 2;
    expect(satisfactionDelta(s, data, b, null)).toBe(10000);
    expect(satisfactionDelta(s, data, b, p.id)).toBe(0);
  });
});
