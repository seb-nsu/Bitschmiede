// Büro mit Grundrissen und Ausstattung (S07 FRM-R21 bis FRM-R30, FRM-R65, FRM-R66, Tabelle 5.4; S08 MRK-R38).
import { type Bp, BP_ONE, type Cent, clamp, divInt, mulBp, mulDiv } from "../num";
import type { AiStudio, Area, EquipmentEffects, EquipmentParams, GameData, GameState, OfficeDef, OfficeState, RoomDef } from "../model/types";
import { dateOf, isFirstWeekOfMonth } from "../calendar";
import { log } from "./firma";
import { addEvent } from "./ereignisse";
import { anchorValue, ledgerNow, monthlyRent } from "./finanzen";
import { homePeople } from "./standorte";

function E(data: GameData): EquipmentParams {
  return data.equipment;
}

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

export function startOffice(data: GameData, year: number): OfficeState {
  return {
    id: "garage", sinceWeek: 0, moveWeeksLeft: 0, extensions: 0,
    // ANNAHME: Die Garage startet mit Hardware der Startstufe (H = 1,0), bezahlt mit dem Startkapital.
    hardware: { level: E(data).hardware.startLevel, year, paidCent: 0 }, comfort: { level: 0, paidCent: 0 }, rooms: [],
    hardwareSymptomShown: false, upgradeOfferYear: year, moveSuggested: false,
  };
}

export function officeDef(data: GameData, id: string): OfficeDef {
  return data.offices.offices.find((o) => o.id === id) ?? data.offices.offices[0]!;
}

function spaceBp(state: GameState, data: GameData): Bp {
  return data.offices.spaceFactorsBp[state.settings.space ?? "normal"];
}

/** FRM-R22, FRM-R26: Arbeitsplätze mit Platzangebot und Erweiterungen. */
export function placesOf(state: GameState, data: GameData, def: OfficeDef, extensions: number): number {
  const base = Math.max(1, mulBp(def.places, spaceBp(state, data)));
  const x = data.offices.extension;
  if (def.extension === "floor") return base + extensions * mulBp(base, x.floor.placesBp);
  if (def.extension === "building") return base + extensions * mulBp(x.building.places, spaceBp(state, data));
  return base;
}

/** FRM-R22: Ausstattungsplätze, mindestens 1. */
export function slotsOf(state: GameState, data: GameData, def: OfficeDef, extensions: number): number {
  const base = Math.max(1, mulBp(def.slots, spaceBp(state, data)));
  const x = data.offices.extension;
  if (def.extension === "floor") return base + extensions * x.floor.slots;
  if (def.extension === "building") return base + extensions * x.building.slots;
  return base;
}

export function officePlaces(state: GameState, data: GameData): number {
  return placesOf(state, data, officeDef(data, state.office.id), state.office.extensions);
}

export function officeSlots(state: GameState, data: GameData): number {
  return slotsOf(state, data, officeDef(data, state.office.id), state.office.extensions);
}

/** Tabelle 5.4: Miete = Plätze · Miete je Platz · Variante; weitere Etage +50 % (FRM-R26). */
export function officeRent(state: GameState, data: GameData, def: OfficeDef, extensions: number): Cent {
  if (def.extension === "floor") {
    const base = mulBp(monthlyRent(state, data, placesOf(state, data, def, 0)), def.rentFactorBp);
    return base + extensions * mulBp(base, data.offices.extension.floor.rentBp);
  }
  return mulBp(monthlyRent(state, data, placesOf(state, data, def, extensions)), def.rentFactorBp);
}

export function currentRent(state: GameState, data: GameData): Cent {
  return officeRent(state, data, officeDef(data, state.office.id), state.office.extensions);
}

function layoutRank(data: GameData, layout: string): number {
  return E(data).layoutOrder.indexOf(layout);
}

// ---------- Ausstattung (FRM-R27, FRM-R28, FRM-R65, FRM-R66) ----------

/** Preise Stand 2000 · Epochenfaktor (Tabelle 5.4). */
export function epochPrice(state: GameState, data: GameData, cent: Cent): Cent {
  return mulBp(cent, anchorValue(E(data).epochFactorsBp, yearOf(state)));
}

export function roomDef(data: GameData, id: string): RoomDef | undefined {
  return E(data).rooms.find((r) => r.id === id);
}

export function usedSlots(state: GameState, data: GameData, rooms: readonly string[] = state.office.rooms): number {
  return rooms.reduce((s, id) => s + (roomDef(data, id)?.slots ?? 0), 0);
}

export function validateBuyRoom(state: GameState, data: GameData, id: string): string | null {
  const r = roomDef(data, id);
  if (!r) return "error.unknownRoom";
  if (yearOf(state) < r.from) return "error.roomLocked";
  if (layoutRank(data, officeDef(data, state.office.id).layout) < layoutRank(data, r.minLayout)) return "error.officeTooSmallForRoom";
  // FRM-R65: Nur Kapazitätsräume dürfen mehrfach gebaut werden.
  if (state.office.rooms.includes(id) && !E(data).capacityRooms.includes(id)) return "error.roomExists";
  if (usedSlots(state, data) + r.slots > officeSlots(state, data)) return "error.noSlot";
  if (state.moneyCent < epochPrice(state, data, r.priceCent)) return "error.noMoney";
  return null;
}

export function buyRoom(state: GameState, data: GameData, id: string): void {
  const price = epochPrice(state, data, roomDef(data, id)!.priceCent);
  state.moneyCent -= price;
  ledgerNow(state).costs.other += price;
  state.office.rooms.push(id);
  log(state, "log.roomBought", { room: id, cost: price });
}

export function validateSellRoom(state: GameState, id: string): string | null {
  return state.office.rooms.includes(id) ? null : "error.unknownRoom";
}

/** Verkauf zum halben Kaufpreis (wie beim Umzug, FRM-R24). Der zuletzt gekaufte Raum dieser Art geht. */
export function sellRoom(state: GameState, data: GameData, id: string): void {
  const i = state.office.rooms.lastIndexOf(id);
  state.office.rooms.splice(i, 1);
  const back = divInt(epochPrice(state, data, roomDef(data, id)!.priceCent), 2, 1);
  state.moneyCent += back;
  ledgerNow(state).costs.other -= back;
}

/** Kaufpreis einer Hardware- bzw. Komfortstufe: Plätze · Stufe · Preis je Platz und Stufe (ANNAHME: die ganze Stufe neu). */
export function levelPrice(state: GameState, data: GameData, kind: "hardware" | "comfort", level: number): Cent {
  const per = kind === "hardware" ? E(data).hardware.perPlaceLevelCent : E(data).comfort.perPlaceLevelCent;
  return epochPrice(state, data, officePlaces(state, data) * level * per);
}

export function validateBuyLevel(state: GameState, data: GameData, kind: "hardware" | "comfort", level: number): string | null {
  const max = kind === "hardware" ? E(data).hardware.maxLevel : E(data).comfort.maxLevel;
  if (!Number.isInteger(level) || level < 1 || level > max) return "error.amount";
  // Gleiche Hardware-Stufe darf erneuert werden (gegen Veralterung); Komfort nur nach oben.
  if (kind === "comfort" && level <= state.office.comfort.level) return "error.amount";
  if (state.moneyCent < levelPrice(state, data, kind, level)) return "error.noMoney";
  return null;
}

export function buyLevel(state: GameState, data: GameData, kind: "hardware" | "comfort", level: number): void {
  const price = levelPrice(state, data, kind, level);
  state.moneyCent -= price;
  ledgerNow(state).costs.other += price;
  if (kind === "hardware") {
    state.office.hardware = { level, year: yearOf(state), paidCent: price };
    state.office.hardwareSymptomShown = false;
  } else state.office.comfort = { level, paidCent: price };
  log(state, kind === "hardware" ? "log.hardwareBought" : "log.comfortBought", { level, cost: price });
}

/** FRM-R26: weitere Etage (Bürohaus, eigenes Gebäude) oder weiteres Gebäude (Campus). */
export function validateExtend(state: GameState, data: GameData): string | null {
  if (officeDef(data, state.office.id).extension === null) return "error.noExtension";
  return null;
}

export function extendOffice(state: GameState): void {
  state.office.extensions += 1;
  log(state, "log.officeExtended", { n: state.office.extensions });
}

// ---------- Wirkungen ----------

/** FRM-R65: Summe einer Wirkung; der erste Raum gleicher Art voll, jeder weitere mit 70 %. Dazu die Eigenschaft des Grundrisses. */
function effectSum(state: GameState, data: GameData, pick: (e: EquipmentEffects) => number | undefined): number {
  const seen: Record<string, number> = {};
  let sum = pick(officeDef(data, state.office.id).trait ?? {}) ?? 0;
  for (const id of state.office.rooms) {
    const r = roomDef(data, id);
    const v = r ? pick(r.effects) ?? 0 : 0;
    const n = seen[id] ?? 0;
    seen[id] = n + 1;
    sum += n === 0 ? v : mulBp(v, E(data).copyFactorBp);
  }
  return sum;
}

/** FRM-R29, Formel in 5.4: H = (0,9 + 0,05 · Stufe) · (1 − 0,04 · Jahre seit Kauf), mindestens 0,7. */
export function hardwareFactor(data: GameData, level: number, boughtYear: number, year: number): Bp {
  const h = E(data).hardware;
  const age = clamp(BP_ONE - h.agePerYearBp * Math.max(0, year - boughtYear), 0, BP_ONE);
  return Math.max(h.minBp, mulBp(h.baseBp + h.perLevelBp * level, age));
}

export function officeHardware(state: GameState, data: GameData): Bp {
  return hardwareFactor(data, state.office.hardware.level, state.office.hardware.year, yearOf(state));
}

/** Moral-Punkte aus Komfort (+2 je Stufe), Kantine (+3) und Grundriss-Eigenschaft (FRM-R07). */
export function moraleBonusPoints(state: GameState, data: GameData): number {
  return state.office.comfort.level * E(data).comfort.moralePerLevel + effectSum(state, data, (e) => e.moralePoints);
}

/** Komfort: Burnout-Zuwachs −10 % je Stufe. */
export function burnoutGainFactor(state: GameState, data: GameData): Bp {
  return Math.max(0, BP_ONE - state.office.comfort.level * E(data).comfort.burnoutPerLevelBp);
}

/** QA-Kapazität (Testlabor +30 %, Qualitätszentrum +60 %; FRM-T16). */
export function qaBonus(state: GameState, data: GameData): Bp {
  return effectSum(state, data, (e) => e.qaBp);
}

/** Interne Playtest-Spanne (Testlabor −20 %). */
export function playtestSpreadFactor(state: GameState, data: GameData): Bp {
  return Math.max(0, BP_ONE + effectSum(state, data, (e) => e.playtestSpreadBp));
}

/** Engine-Forschung (Forschungslabor +20 %, Technologiepark). */
export function researchFactor(state: GameState, data: GameData): Bp {
  return BP_ONE + effectSum(state, data, (e) => e.researchBp);
}

/** Bugs: Hardware −2 % je Stufe über der Startstufe (ANNAHME, damit der Start gleich bleibt), Qualitätszentrum −10 %. */
export function bugFactor(state: GameState, data: GameData): Bp {
  const h = E(data).hardware;
  const hw = (state.office.hardware.level - h.startLevel) * h.bugsPerLevelBp;
  return Math.max(0, BP_ONE - hw + effectSum(state, data, (e) => e.bugsBp));
}

export function hireQualityPoints(state: GameState, data: GameData): number {
  return effectSum(state, data, (e) => e.hireQualityPoints);
}

/** Qualitätsboni je Bereich und für Animations-Features (Tonstudio, Motion-Capture, Performance-Capture). */
export function qualityBonus(state: GameState, data: GameData): { areas: Partial<Record<Area, Bp>>; features: Record<string, Bp> } {
  const areas: Partial<Record<Area, Bp>> = {};
  for (const a of ["gameplay", "grafik", "sound", "story", "technik"] as const) {
    const v = effectSum(state, data, (e) => e.areaQuality?.[a]);
    if (v !== 0) areas[a] = v;
  }
  const anim = effectSum(state, data, (e) => e.featureQuality);
  const features: Record<string, Bp> = {};
  if (anim !== 0) for (const f of E(data).animationFeatures) features[f] = anim;
  return { areas, features };
}

// ---------- Wochen- und Monatsschritt ----------

/** Laufende Kosten im Monat: Hardware und Komfort 1 % des Kaufpreises, Räume ihre Unterhaltung. */
export function monthlyUpkeep(state: GameState, data: GameData): Cent {
  const e = E(data);
  let sum = mulBp(state.office.hardware.paidCent, e.hardware.upkeepBp) + mulBp(state.office.comfort.paidCent, e.comfort.upkeepBp);
  for (const id of state.office.rooms) sum += epochPrice(state, data, roomDef(data, id)?.upkeepCent ?? 0);
  return sum;
}

/** FRM-R23: Moral −1 je Woche je angefangene 5 % Überbelegung (abgeschnitten). */
export function overcrowdMorale(state: GameState, data: GameData): Bp {
  const places = officePlaces(state, data);
  const over = state.people.length - places;
  if (over <= 0) return 0;
  const share = mulDiv(over, BP_ONE, places, 1);
  return divInt(share, data.offices.overcrowdStepBp, 1) * data.offices.overcrowdMoralePerStepBp;
}

/** Tick-Schritt 11: Überbelegung, Unterhaltung, Veralterung, Upgrade-Angebot, Umzugsvorschlag. */
export function officeStep(state: GameState, data: GameData): void {
  const loss = overcrowdMorale(state, data);
  if (loss > 0) for (const p of state.people) p.moraleBp = clamp(p.moraleBp - loss, 0, BP_ONE);
  if (!isFirstWeekOfMonth(state.startYear, state.week) || state.week === 0) return;
  const upkeep = monthlyUpkeep(state, data);
  state.moneyCent -= upkeep;
  ledgerNow(state).costs.rent += upkeep;
  const y = yearOf(state);
  const h = officeHardware(state, data);
  // FRM-R29: Symptom unter 90 %.
  if (h < E(data).hardware.symptomBelowBp && !state.office.hardwareSymptomShown) {
    state.office.hardwareSymptomShown = true;
    log(state, "log.hardwareOld", { pct: divInt(BP_ONE - h, 100, 1), year: state.office.hardware.year });
  }
  // FRM-R30: einmal je Epochenwechsel ein Upgrade-Angebot.
  const epoch = [...E(data).upgradeYears].reverse().find((x) => x <= y);
  if (epoch !== undefined && state.office.upgradeOfferYear < epoch && !state.events.some((e) => e.kind === "hardwareUpgrade")) {
    state.office.upgradeOfferYear = epoch;
    addEvent(state, data, { kind: "hardwareUpgrade", scope: "welt", projectId: null, options: ["aufruesten", "ablehnen"], defaultOption: "aufruesten" });
  }
  // S07 Abschnitt 7: Umzugsvorschlag ab 90 % Belegung.
  const full = mulDiv(homePeople(state), BP_ONE, officePlaces(state, data), 1) >= data.offices.suggestMoveBp;
  if (full && !state.office.moveSuggested) log(state, "log.moveSuggested");
  state.office.moveSuggested = full;
}

/** FRM-R30: Upgrade auf die höchste bezahlbare Stufe, mindestens die bisherige. */
export function upgradeLevel(state: GameState, data: GameData): number | null {
  for (let l = E(data).hardware.maxLevel; l >= Math.max(1, state.office.hardware.level); l--) {
    if (validateBuyLevel(state, data, "hardware", l) === null) return l;
  }
  return null;
}

export function applyUpgradeDecision(state: GameState, data: GameData, option: string): void {
  if (option !== "aufruesten") return;
  const l = upgradeLevel(state, data);
  if (l !== null) buyLevel(state, data, "hardware", l);
}

/** FRM-R24: Beim Umzug ziehen Räume mit; was keinen Platz hat, wird zum halben Preis verkauft. */
export function moveEquipment(state: GameState, data: GameData): void {
  const slots = officeSlots(state, data);
  while (usedSlots(state, data) > slots) {
    const id = state.office.rooms[state.office.rooms.length - 1]!;
    sellRoom(state, data, id);
    log(state, "log.roomSold", { room: id });
  }
}

// ---------- KI-Büros (MRK-R38) ----------

/** KI-Grundriss: die günstigste Variante des kleinsten Grundrisses, der passt (ANNAHME: Standardvarianten). */
export function aiOfficeFor(state: GameState, data: GameData, people: number): OfficeDef {
  const y = yearOf(state);
  const fit = data.offices.offices
    .filter((o) => o.availableFrom <= y && placesOf(state, data, o, 0) >= people)
    .sort((a, b) => layoutRank(data, a.layout) - layoutRank(data, b.layout) || a.rentFactorBp - b.rentFactorBp || a.id.localeCompare(b.id));
  return fit[0] ?? [...data.offices.offices].sort((a, b) => b.places - a.places || a.id.localeCompare(b.id))[0]!;
}

export function aiRent(state: GameState, data: GameData, studio: AiStudio): Cent {
  return officeRent(state, data, officeDef(data, studio.officeId), 0);
}

/** Höchstzahl Personen im KI-Büro (Plätze + 20 % Überbelegung). */
export function aiMaxPeople(state: GameState, data: GameData, studio: AiStudio): number {
  const p = placesOf(state, data, officeDef(data, studio.officeId), 0);
  return p + mulBp(p, data.offices.overcrowdingMaxBp);
}

/** MRK-R38: Umzug ab 95 % Belegung, wenn Kaution plus 6 Monatsmieten des neuen Grundrisses vorhanden sind. */
export function aiMaybeMove(state: GameState, data: GameData, studio: AiStudio, people: number): void {
  const places = placesOf(state, data, officeDef(data, studio.officeId), 0);
  if (mulDiv(people, BP_ONE, places, 1) < data.offices.aiMoveBp) return;
  const next = aiOfficeFor(state, data, places + 1);
  if (next.id === studio.officeId || layoutRank(data, next.layout) <= layoutRank(data, officeDef(data, studio.officeId).layout)) return;
  const rent = officeRent(state, data, next, 0);
  const deposit = data.offices.depositMonths * rent;
  if (studio.cashCent < deposit + data.offices.aiMoveRentMonths * rent) return;
  studio.cashCent -= deposit;
  studio.officeId = next.id;
}
