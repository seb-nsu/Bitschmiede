// Ereigniskatalog aus Daten (S01 EventDef, Bedingungssprache 5.4, KRN-R30 bis KRN-R38), Freischaltungen (KRN-R40, KRN-R41),
// Chronik (KRN-R61) und Jahrbuch (KRN-R62).
import { type Bp, BP_ONE, clamp, divInt, mulBp } from "../num";
import type { ChainNext, ChainState, Condition, Effect, EventDef, GameData, GameEvent, GameState, Person, Project } from "../model/types";
import { AREAS } from "../model/types";
import { stream } from "../rng";
import { dateOf } from "../calendar";
import { log } from "./firma";
import { scaleToYear, ledgerNow, monthCosts, monthIncome } from "./finanzen";
import { activeProjects, ageRating, progressShare } from "./produkte/projects";
import { freezeDeep } from "../clone";
import { brandStrength } from "./marken";
import { averageMonthCosts, fineFromCash, playerRankEntry } from "./endspiel";

// ---------- Bedingungssprache (S01 5.4) ----------

const COMPARATORS = ["=", "<", "<=", ">", ">="] as const;

export interface ConditionContext {
  state: GameState;
  data: GameData;
  project?: Project;
}

/** Werte, die Bedingungen lesen dürfen. ANNAHME: Geld in ganzen USD, Anteile in bp. */
function fieldValue(ctx: ConditionContext, field: string): number {
  const s = ctx.state;
  const year = dateOf(s.startYear, s.week).year;
  switch (field) {
    case "jahr": return year;
    case "firma.mitarbeiter": return s.people.length;
    case "firma.kasse": return divInt(s.moneyCent, 100, 1);
    case "firma.releases": return s.projects.filter((p) => p.status === "veroeffentlicht").length;
    case "firma.projekte": return activeProjects(s).length;
    case "firma.inhaltsstufe": return contentLevelRecent(ctx);
    case "produkt.verkauftAktiv": return s.projects.filter((p) => p.sales && !p.sales.ended).length;
    case "projekt.anteil": return ctx.project ? progressShare(ctx.project) : -1;
    case "betrieb.ausgeloest": return s.operations?.triggered ? 1 : 0;
    // MRK-R56 (6a.2): Auslöser der Ketten.
    case "firma.crunchWochen": return s.staff.crunchWeeks.filter((w) => s.week - w < 52).length;
    case "marke.staerke": return strongBrandProduct(ctx.state, ctx.data)?.points ?? 0;
    case "produkt.altePlattform": return oldPlatformProducts(ctx.state, ctx.data).length;
    // Endgame-Themen, Krisen für Große: Rang und Umsatzanteil (Rangliste), mittlere Moral (0–100), Live-Produkte mit Servern.
    case "firma.rang": return playerRankEntry(s, ctx.data).rank;
    case "firma.marktanteil": return playerRankEntry(s, ctx.data).shareBp;
    case "firma.moral": return s.people.length === 0 ? 100 : divInt(s.people.reduce((a, p) => a + p.moraleBp, 0), s.people.length * 100, 1);
    case "betrieb.server": return s.projects.filter((p) => p.ops?.live && p.ops.live.shutdownWeek === null).length;
    default: throw new Error(`Unbekanntes Bedingungsfeld ${field}`);
  }
}

function contentLevelRecent(ctx: ConditionContext): number {
  const s = ctx.state;
  return s.projects
    .filter((p) => p.status !== "abgebrochen" && (!p.result || s.week - p.result.week < 52))
    .reduce((m, p) => Math.max(m, ageRating(ctx.data, p.theme, p.features)), 0);
}

export function evaluate(cond: Condition | null, ctx: ConditionContext): boolean {
  if (!cond) return true;
  return Object.entries(cond).every(([key, value]) => {
    if (key === "alle") return (value as Condition[]).every((c) => evaluate(c, ctx));
    if (key === "eines") return (value as Condition[]).some((c) => evaluate(c, ctx));
    if (key === "nicht") return !evaluate(value as Condition, ctx);
    const v = fieldValue(ctx, key);
    return Object.entries(value as Record<string, number>).every(([op, n]) => {
      switch (op) {
        case "=": return v === n;
        case "<": return v < n;
        case "<=": return v <= n;
        case ">": return v > n;
        case ">=": return v >= n;
        default: return false;
      }
    });
  });
}

/** Spieltest-Übersicht „Was gibt es“: einfache Schwellen einer Bedingung mit aktuellem Wert (nur >= und =; Rest ignoriert). */
export interface ConditionNeed { field: string; value: number; current: number }

export function conditionNeeds(cond: Condition | null, ctx: ConditionContext): { any: boolean; needs: ConditionNeed[] } {
  if (!cond) return { any: false, needs: [] };
  const needs: ConditionNeed[] = [];
  let any = false;
  const visit = (c: Condition): void => {
    for (const [key, value] of Object.entries(c)) {
      if (key === "alle" || key === "eines") {
        if (key === "eines") any = true;
        for (const x of value as Condition[]) visit(x);
        continue;
      }
      if (key === "nicht") continue;
      const ops = value as Record<string, number>;
      const n = ops[">="] ?? ops["="];
      if (n !== undefined) needs.push({ field: key, value: n, current: fieldValue(ctx, key) });
    }
  };
  visit(cond);
  return { any, needs };
}

/** TEC-R33: Bedingungen beim Laden prüfen; liefert die erste ungültige Stelle oder null. */
export function conditionError(cond: Condition | null): string | null {
  if (!cond) return null;
  for (const [key, value] of Object.entries(cond)) {
    if (key === "alle" || key === "eines") {
      if (!Array.isArray(value)) return `${key} braucht eine Liste`;
      for (const c of value) {
        const e = conditionError(c as Condition);
        if (e) return e;
      }
      continue;
    }
    if (key === "nicht") {
      const e = conditionError(value as Condition);
      if (e) return e;
      continue;
    }
    if (!["jahr", "firma.mitarbeiter", "firma.kasse", "firma.releases", "firma.projekte", "firma.inhaltsstufe", "produkt.verkauftAktiv", "projekt.anteil", "betrieb.ausgeloest", "firma.crunchWochen", "marke.staerke", "produkt.altePlattform", "firma.rang", "firma.marktanteil", "firma.moral", "betrieb.server"].includes(key)) {
      return `unbekanntes Feld ${key}`;
    }
    for (const op of Object.keys(value as object)) if (!(COMPARATORS as readonly string[]).includes(op)) return `unbekannter Vergleich ${op}`;
  }
  return null;
}

// ---------- Ziele ----------

function newestProduct(state: GameState): Project | undefined {
  return [...state.projects].filter((p) => p.sales && !p.sales.ended).sort((a, b) => b.result!.week - a.result!.week || b.id - a.id)[0];
}

interface Target { project?: Project; person?: Person; product?: Project }

/** MRK-R56 Verfilmungsangebot: stärkste eigene Marke (Punkte 0–100) mit ihrem neuesten Titel. */
function strongBrandProduct(state: GameState, data: GameData): { points: number; product: Project } | null {
  let best: { points: number; product: Project } | null = null;
  for (const b of [...state.brands].filter((x) => x.ownerId === 0).sort((x, y) => x.id - y.id)) {
    const product = [...state.projects].filter((p) => p.brandId === b.id && p.result).sort((x, y) => y.result!.week - x.result!.week || y.id - x.id)[0];
    if (!product) continue;
    const points = divInt(brandStrength(data, b), 100, 1);
    if (!best || points > best.points) best = { points, product };
  }
  return best;
}

/** MRK-R56 Konsolen-Ende: Produkte im Verkauf, deren Plattform nicht mehr hergestellt wird. */
function oldPlatformProducts(state: GameState, data: GameData): Project[] {
  const year = dateOf(state.startYear, state.week).year;
  return state.projects.filter((p) => p.sales && !p.sales.ended
    && p.platforms.some((id) => (data.platforms.find((x) => x.id === id)?.endYear ?? year) < year))
    .sort((a, b) => a.id - b.id);
}

function resolveTarget(state: GameState, data: GameData, def: EventDef, pick: (n: number) => number, project?: Project): Target | null {
  switch (def.target) {
    case null: return {};
    case "projekt": {
      const p = project ?? activeProjects(state).filter((x) => x.status === "laeuft").sort((a, b) => a.id - b.id)[0];
      return p ? { project: p } : null;
    }
    case "person": return state.people.length > 0 ? { person: state.people[pick(state.people.length)] } : null;
    case "angestellter": {
      const staff = state.people.filter((p) => !p.isFounder && p.assignment?.kind !== "contract");
      return staff.length > 0 ? { person: staff[pick(staff.length)] } : null;
    }
    case "letztesProdukt": {
      const p = newestProduct(state);
      return p ? { product: p } : null;
    }
    case "starkeMarke": {
      const b = strongBrandProduct(state, data);
      return b ? { product: b.product } : null;
    }
    case "altePlattform": {
      const list = oldPlatformProducts(state, data);
      return list.length > 0 ? { product: list[pick(list.length)] } : null;
    }
  }
}

function makeEvent(state: GameState, data: GameData, def: EventDef, target: Target): GameEvent {
  const event: GameEvent = {
    id: state.nextEventId, kind: "katalog", scope: def.scope === "projekt" ? "projekt" : "welt",
    projectId: target.project?.id ?? null, createdWeek: state.week,
    deadlineWeek: state.week + data.events.deadlineWeeks[def.scope === "projekt" ? "projekt" : "welt"],
    options: def.options.map((o) => o.id), defaultOption: def.options.find((o) => o.isDefault)?.id ?? def.options[0]!.id,
    defId: def.id,
  };
  if (target.person) event.personId = target.person.id;
  if (target.product) event.productId = target.product.id;
  state.nextEventId += 1;
  state.events.push(event);
  return event;
}

function cooldownOk(state: GameState, key: string, cooldown: number): boolean {
  const last = state.eventCooldowns[key];
  return last === undefined || state.week - last >= cooldown;
}

/** Historische Termine (Datenblatt Abschnitt 3): Information in Bericht und Chronik, Entscheidungen als Ereignis. */
export function historicalStep(state: GameState, data: GameData): void {
  const d = dateOf(state.startYear, state.week);
  for (const def of data.catalog.events) {
    if (!def.historical || def.historical.year !== d.year || def.historical.weekOfYear !== d.weekOfYear) continue;
    if (def.class === "information") {
      chronicle(state, "chronicle.info", { id: def.id });
      log(state, "log.info", { id: def.id });
    } else {
      makeEvent(state, data, def, {});
    }
  }
}

/**
 * KRN-R31, KRN-R38, ZIE-R47: Welt-Ereignisse aus dem Katalog. Mit der Wochenchance (· Entscheidungsdichte) wird
 * eines gezogen, gewichtet unter allen, deren Auslöser gilt und deren Abklingzeit vorbei ist (KRN-R36).
 */
export function worldCatalog(state: GameState, data: GameData, density: Bp): boolean {
  const rng = stream(state, "ereignisse");
  const roll = rng.uniformBp();
  const eligible = data.catalog.events.filter((def) =>
    !def.historical && !def.stage && !def.forced && def.class === "entscheidung" && def.scope !== "projekt" && cooldownOk(state, def.id, def.cooldownWeeks)
    && evaluate(def.trigger, { state, data, project: def.target === "projekt" ? activeProjects(state).find((p) => p.status === "laeuft") : undefined }),
  );
  if (eligible.length === 0 || roll >= mulBp(data.catalog.chancePerWeekBp, density)) return false;
  const total = eligible.reduce((s, d) => s + d.weightBp, 0);
  let r = rng.int(total);
  const def = eligible.find((d) => (r -= d.weightBp) < 0)!;
  const target = resolveTarget(state, data, def, (n) => rng.int(n));
  if (!target) return false;
  state.eventCooldowns[def.id] = state.week;
  makeEvent(state, data, def, target);
  return true;
}

/**
 * S01 5.1, TEC-R13: Krisen (forced) werden nicht ausgelost. Gilt ihr Auslöser und ist die Abklingzeit vorbei, kommen
 * sie sofort und belegen den Platz des Welt-Angebots dieser Woche. Bei mehreren gewinnt die kleinste ID.
 */
export function forcedCatalog(state: GameState, data: GameData): boolean {
  const def = data.catalog.events.find((d) => d.forced && !d.stage && cooldownOk(state, d.id, d.cooldownWeeks) && evaluate(d.trigger, { state, data }));
  if (!def) return false;
  const target = resolveTarget(state, data, def, () => 0);
  if (!target) return false;
  state.eventCooldowns[def.id] = state.week;
  makeEvent(state, data, def, target);
  return true;
}

/** Projekt-Ereignisse aus dem Katalog (Betatest, Endspurt): je Projekt mit Wochenchance = Gewicht · Katalogchance. */
export function projectCatalog(state: GameState, data: GameData): void {
  const rng = stream(state, "ereignisse");
  for (const project of activeProjects(state).filter((p) => p.status === "laeuft").sort((a, b) => a.id - b.id)) {
    for (const def of data.catalog.events.filter((d) => d.scope === "projekt" && !d.stage)) {
      const roll = rng.uniformBp();
      const key = `${def.id}:${project.id}`;
      if (!cooldownOk(state, key, def.cooldownWeeks) || !evaluate(def.trigger, { state, data, project })) continue;
      if (roll >= mulBp(def.weightBp, data.catalog.chancePerWeekBp)) continue;
      state.eventCooldowns[key] = state.week;
      makeEvent(state, data, def, { project });
    }
  }
}

// ---------- Wirkungen ----------

function bestArea(p: Person) {
  return AREAS.reduce((b, a) => (p.strength[a] > p.strength[b] ? a : b), AREAS[0]);
}

export function applyEffects(state: GameState, data: GameData, event: GameEvent, effects: readonly Effect[]): void {
  const year = dateOf(state.startYear, state.week).year;
  const project = event.projectId === null ? undefined : state.projects.find((p) => p.id === event.projectId);
  const person = event.personId === undefined ? undefined : state.people.find((p) => p.id === event.personId);
  const product = event.productId === undefined ? undefined : state.projects.find((p) => p.id === event.productId);
  const pay = (cent: number) => {
    const amount = scaleToYear(data, cent, year);
    state.moneyCent += amount;
    if (amount < 0) ledgerNow(state).costs.other -= amount;
  };
  for (const e of effects) {
    switch (e.type) {
      case "geld": pay(e.cent); break;
      case "geldJePerson": pay(e.cent * state.people.length); break;
      case "trend": {
        if (!project) break;
        const t = data.trends;
        const map = e.on === "genre" ? state.trends.genre : state.trends.theme;
        const key = e.on === "genre" ? project.genre : project.theme;
        map[key] = clamp((map[key] ?? BP_ONE) + e.bp, t.minBp, t.maxBp);
        break;
      }
      case "staerke": {
        const who = e.who === "alle" ? state.people : person ? [person] : [];
        for (const p of who) {
          const area = e.area === "beste" ? bestArea(p) : e.area;
          p.strength[area] = Math.min(100, p.strength[area] + e.points);
        }
        break;
      }
      case "gehalt":
        for (const p of e.who === "alle" ? state.people : person ? [person] : []) p.salaryCent += mulBp(p.salaryCent, e.bp);
        break;
      case "geht":
        if (person) {
          state.people = state.people.filter((p) => p.id !== person.id);
          log(state, "log.personLeft", { person: person.name });
          chronicle(state, "log.personLeft", { person: person.name });
        }
        break;
      case "bugs": if (project) project.bugsBp = Math.max(0, project.bugsBp + mulBp(project.bugsBp, e.bp)); break;
      case "aufwand": {
        if (!project) break;
        const people = Math.max(1, state.people.filter((p) => p.assignment?.kind === "project" && p.assignment.id === project.id).length);
        project.effortTotalBp = Math.max(project.effortDoneBp + 1, project.effortTotalBp + e.pwPerPerson * people * data.start.workPerPersonWeekBp);
        break;
      }
      case "nachfrage": if (product?.sales) product.sales.demandFactorBp = Math.max(0, product.sales.demandFactorBp + e.bp); break;
      case "ruf": state.studioReputationBp = clamp(state.studioReputationBp + e.bp, 0, BP_ONE); break;
      case "moral": for (const p of state.people) p.moraleBp = clamp(p.moraleBp + e.bp, 0, BP_ONE); break;
      case "interesse": if (project) project.marketing.interest = Math.max(0, project.marketing.interest + mulBp(project.marketing.interest, e.bp)); break;
      case "zufriedenheit": if (product?.ops) product.ops.satisfactionBp = clamp(product.ops.satisfactionBp + e.bp, 0, BP_ONE); break;
      case "spieler": if (product?.ops?.live) product.ops.live.base = Math.max(0, product.ops.live.base + mulBp(product.ops.live.base, e.bp)); break;
      case "markenRuf": case "markenBekanntheit": {
        const brand = product?.brandId == null ? undefined : state.brands.find((b) => b.id === product.brandId);
        if (!brand) break;
        if (e.type === "markenRuf") brand.reputationBp = clamp(brand.reputationBp + e.bp, 0, BP_ONE);
        else brand.awarenessBp = clamp(brand.awarenessBp + e.bp, 0, BP_ONE);
        break;
      }
      case "crunchRegel": state.staff.crunch = e.rule; break;
      // 6a.7 (MRK-R57): Wirkungen der Zukunfts-Ketten.
      case "werkzeugTempo": state.future.toolSpeedBp = e.bp; break;
      case "plattformErfahrung": state.platformExperience[e.platform] = clamp((state.platformExperience[e.platform] ?? 0) + e.bp, 0, BP_ONE); break;
      case "haerte":
        for (const p of state.projects) if (p.ops?.live) p.ops.live.hardnessBp = clamp(p.ops.live.hardnessBp + e.bp, 0, BP_ONE);
        break;
      case "nachfrageAlle":
        for (const p of state.projects) if (p.sales) p.sales.demandFactorBp = Math.max(0, p.sales.demandFactorBp + mulBp(p.sales.demandFactorBp, e.bp));
        break;
      // Endgame-Themen, Krisen für Große.
      case "strafeKasse": case "geldMonatskosten": {
        const cost = e.type === "strafeKasse" ? fineFromCash(state, e.bp) : mulBp(averageMonthCosts(state), e.bp);
        state.moneyCent -= cost;
        ledgerNow(state).costs.other += cost;
        if (e.type === "strafeKasse") {
          state.endgame.lastFineCent = cost;
          log(state, "log.fine", { cost });
        }
        break;
      }
      case "kuendigung": {
        const staff = state.people.filter((p) => !p.isFounder).sort((a, b) => a.moraleBp - b.moraleBp || a.id - b.id);
        const leaving = new Set(staff.slice(0, mulBp(staff.length, e.bp)).map((p) => p.id));
        state.people = state.people.filter((p) => !leaving.has(p.id));
        if (leaving.size > 0) log(state, "log.massExit", { n: leaving.size });
        break;
      }
      case "serverKosten":
        state.endgame.serverCrisis = e.weeks > 0 ? { costBp: BP_ONE + e.bp, untilWeek: state.week + e.weeks } : null;
        break;
      case "zufriedenheitAlle":
        for (const p of state.projects) if (p.ops?.live && p.ops.live.shutdownWeek === null) p.ops.satisfactionBp = clamp(p.ops.satisfactionBp + e.bp, 0, BP_ONE);
        break;
      case "krisenfest": state.endgame.crisesSurvived += 1; break;
    }
  }
}

export function applyCatalogDecision(state: GameState, data: GameData, event: GameEvent, option: string): void {
  const def = data.catalog.events.find((d) => d.id === event.defId);
  const opt = def?.options.find((o) => o.id === option);
  if (!def || !opt) return;
  applyEffects(state, data, event, opt.effects);
  if (opt.next) scheduleStage(state, data, event, `${def.id}:${option}`, opt.next);
}

// ---------- Ereignisketten (KRN-R32, MRK-R53 bis MRK-R55) ----------

const CHAIN_RANK = { krise: 0, chance: 1, information: 2 } as const;

/** MRK-R55: Folgestufe mit Chance und Verzögerung (0–12 Wochen) einplanen; die Ziele gehen mit. */
export function scheduleStage(state: GameState, data: GameData, from: Pick<GameEvent, "projectId" | "productId" | "personId" | "chainMemory">, step: string, nextOrList: ChainNext | ChainNext[]): void {
  const rng = stream(state, "ereignisse");
  const roll = rng.uniformBp();
  // Alternativen: eine Zufallszahl über die aufsummierten Chancen; ohne Chance gilt der Rest.
  let acc = 0;
  const next = (Array.isArray(nextOrList) ? nextOrList : [nextOrList]).find((n) => {
    acc += n.chanceBp ?? BP_ONE;
    return roll < acc;
  });
  if (!next) return;
  const delay = rng.range(next.delayWeeks[0], next.delayWeeks[1]);
  if (!data.catalog.events.some((d) => d.id === next.def)) return;
  const chain: ChainState = { id: state.nextChainId, defId: next.def, dueWeek: state.week + delay, projectId: from.projectId, memory: [...(from.chainMemory ?? []), step] };
  if (from.productId !== undefined) chain.productId = from.productId;
  if (from.personId !== undefined) chain.personId = from.personId;
  state.nextChainId += 1;
  state.chains.push(chain);
}

function rankOf(data: GameData, defId: string): number {
  const def = data.catalog.events.find((d) => d.id === defId);
  return def?.class === "information" ? CHAIN_RANK.information : CHAIN_RANK[def?.chain ?? "chance"];
}

/**
 * KRN-R32, MRK-R54: fällige Stufen. Meldungen (ohne Entscheidung) treten sofort ein; von den Entscheidungen kommt
 * höchstens eine je Woche (Krise vor Chance, dann die älteste) und belegt den Wochenplatz. Liefert, ob er belegt ist.
 */
export function chainStep(state: GameState, data: GameData): boolean {
  const due = state.chains.filter((c) => c.dueWeek <= state.week)
    .sort((a, b) => rankOf(data, a.defId) - rankOf(data, b.defId) || a.dueWeek - b.dueWeek || a.id - b.id);
  let taken = false;
  for (const c of due) {
    const def = data.catalog.events.find((d) => d.id === c.defId)!;
    const target: GameEvent = { id: 0, kind: "katalog", scope: "welt", projectId: c.projectId, createdWeek: state.week, deadlineWeek: state.week, options: [], defaultOption: "", chainMemory: c.memory };
    if (c.productId !== undefined) target.productId = c.productId;
    if (c.personId !== undefined) target.personId = c.personId;
    if (def.class === "information") {
      state.chains = state.chains.filter((x) => x.id !== c.id);
      applyEffects(state, data, target, def.effects ?? []);
      // Meldungen der Kette erscheinen wie historische Informationen in Bericht und Chronik.
      log(state, "log.info", { id: def.id });
      chronicle(state, "chronicle.info", { id: def.id });
      if (def.next) scheduleStage(state, data, target, def.id, def.next);
      continue;
    }
    if (taken) continue;
    // Ziele, die es nicht mehr gibt, beenden die Kette (Projekt abgebrochen, Person gegangen).
    const gone = (c.projectId !== null && !state.projects.some((p) => p.id === c.projectId))
      || (c.personId !== undefined && !state.people.some((p) => p.id === c.personId));
    state.chains = state.chains.filter((x) => x.id !== c.id);
    if (gone) continue;
    const event = makeEvent(state, data, def, {
      project: c.projectId === null ? undefined : state.projects.find((p) => p.id === c.projectId),
      person: c.personId === undefined ? undefined : state.people.find((p) => p.id === c.personId),
      product: c.productId === undefined ? undefined : state.projects.find((p) => p.id === c.productId),
    });
    event.chainMemory = c.memory;
    taken = true;
  }
  return taken;
}

// ---------- Chronik, Freischaltungen, Jahrbuch ----------

export function chronicle(state: GameState, key: string, params: Record<string, string | number>): void {
  state.chronicle.push(freezeDeep({ week: state.week, key, params }));
  if (state.chronicle.length > 600) state.chronicle.splice(0, state.chronicle.length - 600);
}

/** KRN-R61: Konsolenstarts und Produktionsenden in der ersten Woche des Jahres. */
export function platformChronicle(state: GameState, data: GameData): void {
  const d = dateOf(state.startYear, state.week);
  if (d.weekOfYear !== 0) return;
  for (const p of data.platforms) {
    if (p.releaseYear === d.year && d.year > state.startYear) {
      chronicle(state, "log.platformNew", { platform: p.id });
      log(state, "log.platformNew", { platform: p.id });
    }
    if (p.endYear + 1 === d.year) {
      chronicle(state, "log.platformEnd", { platform: p.id });
      log(state, "log.platformEnd", { platform: p.id });
    }
  }
}

export function isUnlocked(state: GameState, id: string): boolean {
  return state.unlocks[id] !== undefined;
}

/**
 * KRN-R40, KRN-R41, A41: Systeme mit eigenem Auslöse-Ereignis sind sofort offen. Die übrigen warten auf den nächsten
 * Release, höchstens 26 Wochen; höchstens eines je Release und zwei je Jahr.
 */
export function unlockStep(state: GameState, data: GameData): void {
  const u = data.unlocks;
  const year = dateOf(state.startYear, state.week).year;
  const releasedThisWeek = state.projects.some((p) => p.result?.week === state.week);
  const lastRelease = Math.max(-1, ...state.projects.filter((p) => p.result).map((p) => p.result!.week));
  const thisYear = Object.entries(state.unlocks).filter(([id, w]) => dateOf(state.startYear, w).year === year && !u.systems.find((x) => x.id === id)?.ownEvent).length;
  const sinceRelease = Object.entries(state.unlocks).filter(([id, w]) => w >= lastRelease && lastRelease >= 0 && !u.systems.find((x) => x.id === id)?.ownEvent).length;
  for (const sys of u.systems) {
    if (isUnlocked(state, sys.id) || !evaluate(sys.condition, { state, data })) continue;
    if (sys.ownEvent) {
      state.unlocks[sys.id] = state.week;
      continue;
    }
    if (state.unlockWaiting[sys.id] === undefined) state.unlockWaiting[sys.id] = state.week;
    const waited = state.week - state.unlockWaiting[sys.id]!;
    if (!(releasedThisWeek || waited >= u.maxWaitWeeks)) continue;
    // Die Wartezeit von 26 Wochen sticht die Grenze „eines je Release“, nicht die Jahresgrenze.
    if (thisYear >= u.perYear || (sinceRelease >= 1 && waited < u.maxWaitWeeks)) continue;
    state.unlocks[sys.id] = state.week;
    delete state.unlockWaiting[sys.id];
    chronicle(state, "log.unlock", { system: sys.id });
    log(state, "log.unlock", { system: sys.id });
    break;
  }
}

/** KRN-R62: Jahrbuch in Woche 52: Releases, Einnahmen, Kosten, Personen, Chronik des Jahres. */
export function yearbookStep(state: GameState): boolean {
  const d = dateOf(state.startYear, state.week);
  if (d.weekOfYear !== 51) return false;
  const months = state.finance.ledger.filter((m) => m.year === d.year);
  const income = months.reduce((s, m) => s + monthIncome(m), 0);
  const costs = months.reduce((s, m) => s + monthCosts(m), 0);
  state.yearbooks.push(freezeDeep({
    year: d.year,
    releases: state.projects.filter((p) => p.result?.year === d.year).map((p) => ({ title: p.title, scoreBp: p.result!.scoreBp })),
    incomeCent: income,
    costsCent: costs,
    people: state.people.length,
    chronicle: state.chronicle.filter((c) => dateOf(state.startYear, c.week).year === d.year),
  }));
  return true;
}
