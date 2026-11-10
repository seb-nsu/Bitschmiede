// Etappe 6c.3: Marktplatz für Auftragsspiele (FRM-R48, FRM-R49 erweitert).
// ANNAHME (Plan 6c, Annahme 4): Ein Auftragsspiel ist ein Projekt des Spielers mit festen Vorgaben (Genre, Thema, Umfang,
// Plattform). Marke und Verkäufe gehören dem Auftraggeber; das Studio bekommt Vorschuss bei Annahme, den Rest bei
// Abgabe mit mindestens der Mindestwertung, dazu einen Bonus ab Mindestwertung + 1,0. Wer die Mindestwertung oder die
// Frist verfehlt, bekommt den Rest nicht und zahlt eine Vertragsstrafe; ein Abbruch kostet ebenfalls die Strafe.
import { type Bp, BP_ONE, type Cent, divInt, mulBp, mulDiv } from "../../num";
import {
  type ContractGameDeal, type ContractGameOffer, type ContractGameState, type CreateProjectInput, type GameData, type GameState, MODULES, type ModuleMap,
  type Project, SCOPES, type Scope,
} from "../../model/types";
import { dateOf, isFirstWeekOfMonth } from "../../calendar";
import { type Rng, stream } from "../../rng";
import { cachedChoiceContext } from "../ki/projekte";
import { laggedLevels } from "../engine";
import { personMonthCost } from "../ki/studios";
import { ledgerNow } from "../finanzen";
import { log } from "../firma";

export function emptyContractGames(): ContractGameState {
  return { offers: [], nextId: 1 };
}

const C = (data: GameData) => data.contractGames;

function released(state: GameState): number {
  return state.projects.filter((p) => p.result !== null && p.type === "standard").length;
}

export function contractGamesUnlocked(state: GameState, data: GameData): boolean {
  return released(state) >= C(data).unlockAfterReleases;
}

function between(rng: Rng, range: readonly [number, number]): number {
  return rng.range(range[0], range[1]);
}

/** Durchschnittlicher Aufwand einer Karte des Jahres im Umfang mittel (Personenwochen in bp). */
function averageFeatureEffort(data: GameData, year: number): Bp {
  const fs = data.features.filter((f) => f.availableFrom <= year);
  if (fs.length === 0) return BP_ONE;
  let sum = 0;
  for (const f of fs) for (const v of Object.values(f.effort)) sum += v;
  return divInt(sum, fs.length, 1);
}

/** Geschätzte Wochen mit dem Bezugsteam: Kartenplätze · Aufwand · Umfangsfaktor / Team + Politur. */
export function estimatedWeeks(data: GameData, year: number, scope: Scope): number {
  const effort = mulBp(data.projects.featureSlots[scope] * averageFeatureEffort(data, year), data.projects.scopeEffortFactorBp[scope]);
  const capacity = Math.max(1, C(data).teamRef[scope] * data.start.workPerPersonWeekBp);
  return divInt(effort + capacity - 1, capacity, 1) + C(data).polishWeeks;
}

function pickScope(state: GameState, data: GameData, rng: Rng, year: number): Scope {
  const open = SCOPES.filter((s) => data.projects.scopeFromYear[s] <= year);
  const total = open.reduce((sum, s) => sum + C(data).scopeWeightBp[s], 0);
  let roll = rng.int(Math.max(1, total));
  for (const s of open) {
    roll -= C(data).scopeWeightBp[s];
    if (roll < 0) return s;
  }
  return open[0]!;
}

/** Neues Angebot: Vorgaben aus dem Jahr, Preis = geschätzte Kosten des Bezugsteams · Marge (Strom „auftragsspiele“). */
export function drawOffer(state: GameState, data: GameData, rng: Rng): ContractGameOffer | null {
  const c = C(data);
  const year = dateOf(state.startYear, state.week).year;
  const platforms = cachedChoiceContext(data, year, 0).platforms;
  if (platforms.length === 0) return null;
  const scope = pickScope(state, data, rng, year);
  const genre = data.genres[rng.int(data.genres.length)]!.id;
  const theme = rng.uniformBp() < c.themeChanceBp ? data.themes[rng.int(data.themes.length)]!.id : null;
  const platform = platforms[rng.int(platforms.length)]!;
  // Etappe 6c.4: Zielgruppe als Vorgabe; Kinder nur, wenn das Thema es zulässt (PRD-R18).
  const pick = rng.uniformBp() < c.audienceChanceBp ? data.audiences.list[rng.int(data.audiences.list.length)]! : null;
  const themeLevel = theme === null ? 0 : data.themes.find((x) => x.id === theme)?.contentLevel ?? 0;
  const audience = pick && themeLevel <= pick.maxRating ? pick.id : undefined;
  const weeksEst = estimatedWeeks(data, year, scope);
  const costCent = mulDiv(weeksEst * c.teamRef[scope], personMonthCost(state, data) * 12, 52, 1);
  // Stufen zu 1.000 € und Wertungen zu 0,5 (5.000 bp) für eine ruhige Anzeige.
  const payCent = divInt(mulBp(costCent, between(rng, c.marginBp)), 100000, 1) * 100000;
  const advanceCent = mulBp(payCent, c.advanceBp);
  return {
    id: state.contractGames.nextId++,
    client: c.clients[rng.int(c.clients.length)]!,
    genre, theme, scope, platform,
    ...(audience !== undefined ? { audience } : {}),
    minScoreBp: divInt(between(rng, c.minScoreBp[scope]), 5000, 1) * 5000,
    weeks: mulBp(weeksEst, between(rng, c.deadlineSlackBp)),
    payCent,
    advanceCent,
    bonusCent: mulBp(payCent, c.bonusBp),
    penaltyCent: mulBp(payCent, c.penaltyBp),
    expiresWeek: state.week + between(rng, c.expiresWeeks),
  };
}

/** Monatlich: abgelaufene Angebote fallen weg, mit Glück kommt ein neues dazu. */
export function contractGameStep(state: GameState, data: GameData): void {
  const m = state.contractGames;
  m.offers = m.offers.filter((o) => o.expiresWeek > state.week);
  if (!isFirstWeekOfMonth(state.startYear, state.week) || !contractGamesUnlocked(state, data)) return;
  const rng = stream(state, "auftragsspiele");
  if (m.offers.length >= C(data).maxOffers || rng.uniformBp() >= C(data).newOfferChanceBp) return;
  const offer = drawOffer(state, data, rng);
  if (offer) m.offers.push(offer);
}

export function offerById(state: GameState, id: number | null | undefined): ContractGameOffer | undefined {
  return id == null ? undefined : state.contractGames.offers.find((o) => o.id === id);
}

/**
 * Balancing 1.0 (Entscheidung Projektleitung 03.11.2026): Bei einem Auftragsspiel stellt der Auftraggeber seine Technik;
 * je Modul gilt die bessere Stufe aus eigener Engine und dem Stand der Technik vor clientTechLagYears. So bleibt ein
 * Auftragsstudio ohne eigene Engine bis 2040 möglich. Ohne Angebot bleiben die Stufen unverändert.
 */
export function contractLevels(state: GameState, data: GameData, levels: ModuleMap, offerId: number | null | undefined): ModuleMap {
  if (offerId == null) return levels;
  const client = laggedLevels(data, data.contractGames.clientTechLagYears, dateOf(state.startYear, state.week).year);
  return Object.fromEntries(MODULES.map((m) => [m, Math.max(levels[m], client[m])])) as ModuleMap;
}

/** Vorgaben des Angebots; null = erfüllt. */
export function validateContractOffer(state: GameState, input: CreateProjectInput): string | null {
  if (input.contractOfferId == null) return null;
  const o = offerById(state, input.contractOfferId);
  if (!o || o.expiresWeek <= state.week) return "error.unknownOffer";
  if ((input.productType ?? "standard") !== "standard") return "error.contractGameType";
  if (input.brandId != null) return "error.contractGameBrand";
  if (input.genre !== o.genre || input.scope !== o.scope || (o.theme !== null && input.theme !== o.theme)) return "error.contractGameSpec";
  if (o.audience !== undefined && (input.audience ?? "kern") !== o.audience) return "error.contractGameSpec";
  if (!input.platforms.includes(o.platform)) return "error.contractGamePlatform";
  return null;
}

/** Annahme mit dem Projektstart: Vorschuss fließt, das Angebot verlässt den Marktplatz. */
export function acceptContractGame(state: GameState, project: Project, offerId: number): void {
  const o = offerById(state, offerId)!;
  state.contractGames.offers = state.contractGames.offers.filter((x) => x.id !== offerId);
  const deal: ContractGameDeal = {
    offerId: o.id, client: o.client, minScoreBp: o.minScoreBp, deadlineWeek: state.week + o.weeks,
    finalCent: o.payCent - o.advanceCent, bonusCent: o.bonusCent, penaltyCent: o.penaltyCent, status: "laeuft",
  };
  project.contractGame = deal;
  project.brandId = null;
  book(state, o.advanceCent);
  log(state, "log.contractGameAccepted", { client: o.client, project: project.title, pay: o.advanceCent });
}

function book(state: GameState, cent: Cent): void {
  state.moneyCent += cent;
  const l = ledgerNow(state);
  if (cent >= 0) l.income.contracts += cent;
  else l.costs.other -= cent;
}

/** Abgabe beim Release: Rest und Bonus oder Strafe. */
export function settleContractGame(state: GameState, data: GameData, project: Project, scoreBp: Bp): void {
  const d = project.contractGame;
  if (!d || d.status !== "laeuft") return;
  const onTime = state.week <= d.deadlineWeek;
  if (onTime && scoreBp >= d.minScoreBp) {
    const bonus = scoreBp >= d.minScoreBp + C(data).bonusMarginBp;
    d.status = bonus ? "bonus" : "erfuellt";
    book(state, d.finalCent + (bonus ? d.bonusCent : 0));
    log(state, bonus ? "log.contractGameBonus" : "log.contractGameDone", { client: d.client, project: project.title, pay: d.finalCent + (bonus ? d.bonusCent : 0) });
  } else {
    d.status = "verfehlt";
    book(state, -d.penaltyCent);
    log(state, onTime ? "log.contractGameMissed" : "log.contractGameLate", { client: d.client, project: project.title, pay: d.penaltyCent });
  }
}

/** Abbruch eines Auftragsspiels: Vertragsstrafe. */
export function cancelContractGame(state: GameState, project: Project): void {
  const d = project.contractGame;
  if (!d || d.status !== "laeuft") return;
  d.status = "verfehlt";
  book(state, -d.penaltyCent);
  log(state, "log.contractGameCancelled", { client: d.client, project: project.title, pay: d.penaltyCent });
}

/** Verkäufe eines Auftragsspiels gehören dem Auftraggeber. */
export function ownRevenue(project: Project, revenue: Cent): Cent {
  return project.contractGame ? 0 : revenue;
}
