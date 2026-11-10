// Markenmarkt (S04 Abschnitt 13, LIZ-M01 bis LIZ-M29; S02 PRD-R74, PRD-R76; S08 MRK-R65, MRK-R66, MRK-R69).
// ANNAHME: Genre-Lizenz, Crossover, Freigaberecht, Gerücht, Rückkauf und Bieterwettstreit am Verhandlungstisch folgen
// mit dem Verhandlungstisch; Lizenzspiel, Komplettverkauf, KI-Angebot und -Nachfrage und die Konkursmasse sind hier.
import { type Bp, BP_ONE, type Cent, clamp, divBp, divInt, mulBp } from "../num";
import type {
  AiProduct, AiProject, AiStudio, Brand, BrandLicense, BrandMarketParams, BrandMarketState, BrandOffer, BrandOfferInput, BrandTemplate,
  GameData, GameEvent, GameState,
} from "../model/types";
import { dateOf, isFirstWeekOfQuarter, WEEKS_PER_YEAR } from "../calendar";
import { type Rng, stream } from "../rng";
import { log } from "./firma";
import { chronicle } from "./katalog";
import { addEvent } from "./ereignisse";
import { ledgerNow } from "./finanzen";
import { netPerUnit } from "./markt";
import { brandById, fatigueAfterTitle, startFans } from "./marken";
import { onBrandSold } from "./ziele";
import { liveStudios, monthlyCost } from "./ki/studios";

function M(data: GameData): BrandMarketParams {
  return data.brandMarket;
}

function yearOf(state: GameState): number {
  return dateOf(state.startYear, state.week).year;
}

export const PLAYER = 0;
export const NO_OWNER = -1;

export function emptyBrandMarket(): BrandMarketState {
  return { offers: [], licenses: [], nextOfferId: 1, nextLicenseId: 1, unlocked: false };
}

function studioById(state: GameState, id: number): AiStudio | undefined {
  return state.ai.studios.find((s) => s.id === id);
}

export function ownerName(state: GameState, ownerId: number): string {
  if (ownerId === PLAYER) return "";
  return studioById(state, ownerId)?.name ?? "";
}

// ---------- Geldflüsse ----------

/** Zahlung zwischen Studios; der Spieler bucht Lizenzen als Einnahme bzw. Kosten (Strang „Lizenzen“). */
function pay(state: GameState, from: number, to: number, cent: Cent, kind: "licenses" | "other" = "licenses"): void {
  if (cent <= 0) return;
  if (from === PLAYER) {
    state.moneyCent -= cent;
    ledgerNow(state).costs[kind] += cent;
  } else if (from !== NO_OWNER) {
    const s = studioById(state, from);
    if (s) s.cashCent -= cent;
  }
  if (to === PLAYER) {
    state.moneyCent += cent;
    ledgerNow(state).income.licenses += cent;
  } else if (to !== NO_OWNER) {
    const s = studioById(state, to);
    if (s) s.cashCent += cent;
  }
}

// ---------- Formeln LIZ-MF1 bis LIZ-MF3 ----------

function transfer(data: GameData, from: string, to: string): Bp {
  const t = M(data).transferBp;
  if (from === to) return t.same;
  const near = (data.brands.near[from] ?? []).includes(to) || (data.brands.near[to] ?? []).includes(from);
  return near ? t.near : t.far;
}

/** Heimat-Genre: das Genre mit den meisten Fans (bei Gleichstand alphabetisch), ohne Fans das erste Genre. */
export function homeGenre(data: GameData, b: Brand): string {
  const g = Object.keys(b.fans).sort((x, y) => (b.fans[y] ?? 0) - (b.fans[x] ?? 0) || x.localeCompare(y))[0];
  return g ?? data.genres[0]!.id;
}

function fansFor(data: GameData, b: Brand, genre: string): number {
  let sum = 0;
  for (const g of Object.keys(b.fans).sort()) sum += mulBp(b.fans[g]!, transfer(data, g, genre));
  return sum;
}

/** LIZ-MF1: W = Fans_g · Kaufquote · Preis · (1 − Müdigkeit) · R(n); ANNAHME: über das beste erlaubte Genre. */
export function brandValue(state: GameState, data: GameData, b: Brand, genres: readonly string[], yearsBp: Bp): Cent {
  const fans = Math.max(0, ...genres.map((g) => fansFor(data, b, g)));
  const units = mulBp(mulBp(fans, M(data).buyRateBp), BP_ONE - b.fatigueBp);
  return mulBp(units * netPerUnit(state, data), yearsBp);
}

function yearsFactor(data: GameData, years: number): Bp {
  const t = M(data).yearsFactorBp;
  return t[clamp(years, 1, t.length) - 1]!;
}

/** LIZ-MF2: Royalty r und Pauschale P aus dem Anteil q der Marke am Erfolg. */
export function proposeTerms(state: GameState, data: GameData, b: Brand, template: BrandTemplate, genres: readonly string[], years: number): { royaltyBp: Bp; flatCent: Cent; valueCent: Cent } {
  const m = M(data);
  const r = yearsFactor(data, years);
  const w = brandValue(state, data, b, genres, r);
  const uRef = mulBp(m.refUnits * netPerUnit(state, data), r);
  const q = divBp(w, w + uRef, 1);
  const t = m.templates[template];
  const royaltyBp = Math.min(m.royaltyMaxBp, mulBp(m.royaltyBaseBp + mulBp(m.royaltySpanBp, q), t.royaltyFactorBp));
  return { royaltyBp, flatCent: mulBp(w, t.flatBp), valueCent: w };
}

/** LIZ-MF3: Kaufpreis = W(alle Genres, R = 2,5) · (1 + 0,2 · Welttiefe) · f. */
export function salePrice(state: GameState, data: GameData, b: Brand, factorBp: Bp = BP_ONE): Cent {
  const w = brandValue(state, data, b, data.genres.map((g) => g.id), M(data).saleYearsFactorBp);
  return mulBp(mulBp(w, BP_ONE + mulBp(M(data).depthBonusBp, b.depthBp)), factorBp);
}

/** Erlaubte Genres einer Vorlage (LIZ-M04, Tabelle 13.6). */
export function templateGenres(data: GameData, b: Brand, template: BrandTemplate, genre: string | null): string[] {
  const home = genre ?? homeGenre(data, b);
  if (template === "genreExklusiv") return [home];
  const min = M(data).templates[template].minTransferBp;
  return data.genres.map((g) => g.id).filter((g) => transfer(data, homeGenre(data, b), g) >= min).sort();
}

// ---------- Angebote (LIZ-M04, LIZ-M14, LIZ-M17, LIZ-M20) ----------

function makeOffer(state: GameState, data: GameData, b: Brand, form: BrandOffer["form"], template: BrandTemplate, genre: string | null, priceFactorBp: Bp, weeks: number): BrandOffer {
  const m = M(data);
  const genres = templateGenres(data, b, template, genre);
  const terms = proposeTerms(state, data, b, template, genres, m.licenseYears);
  const offer: BrandOffer = {
    id: state.brandMarket.nextOfferId++, brandId: b.id, ownerId: b.ownerId, form, template, genres, years: m.licenseYears, gamesMax: m.gamesMax,
    flatCent: terms.flatCent, royaltyBp: terms.royaltyBp, minScoreBp: m.templates[template].minScoreBp,
    priceCent: form === "komplettverkauf" ? salePrice(state, data, b, priceFactorBp) : 0, validUntilWeek: state.week + weeks,
  };
  state.brandMarket.offers.push(offer);
  return offer;
}

function activeLicenses(state: GameState, brandId: number): BrandLicense[] {
  return state.brandMarket.licenses.filter((l) => l.brandId === brandId && l.status === "aktiv");
}

/** LIZ-M16: Eigene Projekte mit der Marke müssen vor dem Verkauf fertig oder abgebrochen sein. */
function brandInProduction(state: GameState, b: Brand): boolean {
  if (b.ownerId === PLAYER) return state.projects.some((p) => p.brandId === b.id && (p.status === "laeuft" || p.status === "bereit" || p.status === "pausiert"));
  return state.ai.studios.some((s) => s.id === b.ownerId && s.teams.some((t) => t.project?.brandId === b.id));
}

export function validateOfferBrand(state: GameState, data: GameData, input: BrandOfferInput): string | null {
  if (!state.brandMarket.unlocked) return "error.brandMarketLocked";
  const b = brandById(state, input.brandId);
  if (!b || b.ownerId !== PLAYER) return "error.unknownBrand";
  if (!(input.template in M(data).templates)) return "error.unknownOption";
  if (input.genre !== null && !data.genres.some((g) => g.id === input.genre)) return "error.unknownOption";
  if (input.priceFactorBp < BP_ONE - divInt(BP_ONE, 2, 1) || input.priceFactorBp > BP_ONE + divInt(BP_ONE, 2, 1)) return "error.amount";
  if (state.brandMarket.offers.some((o) => o.brandId === b.id && o.form === input.form)) return "error.offerExists";
  if (input.form === "komplettverkauf" && brandInProduction(state, b)) return "error.brandInProduction";
  return null;
}

export function offerBrand(state: GameState, data: GameData, input: BrandOfferInput): void {
  const b = brandById(state, input.brandId)!;
  makeOffer(state, data, b, input.form, input.template, input.genre, input.priceFactorBp, M(data).offerWeeks);
}

export function validateWithdraw(state: GameState, offerId: number): string | null {
  const o = state.brandMarket.offers.find((x) => x.id === offerId);
  return o && o.ownerId === PLAYER ? null : "error.unknownOffer";
}

export function withdrawOffer(state: GameState, offerId: number): void {
  state.brandMarket.offers = state.brandMarket.offers.filter((o) => o.id !== offerId);
}

function grudge(state: GameState, data: GameData, studioId: number): boolean {
  return (studioById(state, studioId)?.rival?.relationBp ?? 0) <= M(data).grudgeBp;
}

/** Kann dieses Studio das Angebot jetzt annehmen? (Geld, Lizenzgrenze, Groll gegen den Spieler, LIZ-M07, LIZ-M23) */
function takeBlocked(state: GameState, data: GameData, o: BrandOffer, buyerId: number): string | null {
  if (o.ownerId === buyerId) return "error.ownOffer";
  const cost = o.form === "komplettverkauf" ? o.priceCent : o.flatCent;
  const cash = buyerId === PLAYER ? state.moneyCent : studioById(state, buyerId)?.cashCent ?? 0;
  if (cash < cost) return "error.noMoney";
  const b = brandById(state, o.brandId);
  if (!b || b.ownerId !== o.ownerId) return "error.unknownOffer";
  if (o.form === "lizenzspiel") {
    if (activeLicenses(state, b.id).length >= M(data).maxActiveLicenses) return "error.licenseLimit";
    if (activeLicenses(state, b.id).some((l) => l.licenseeId === buyerId)) return "error.offerExists";
  } else if (brandInProduction(state, b)) return "error.brandInProduction";
  if (buyerId === PLAYER && o.ownerId !== PLAYER && grudge(state, data, o.ownerId)) return "error.grudge";
  return null;
}

export function validateTakeOffer(state: GameState, data: GameData, offerId: number): string | null {
  if (!state.brandMarket.unlocked) return "error.brandMarketLocked";
  const o = state.brandMarket.offers.find((x) => x.id === offerId);
  if (!o) return "error.unknownOffer";
  return takeBlocked(state, data, o, PLAYER);
}

/** Lizenz schließen (Pauschale sofort) bzw. Marke kaufen (LIZ-M14: alles geht mit, laufende Lizenzen auch). */
export function takeOffer(state: GameState, data: GameData, offerId: number, buyerId: number): void {
  const o = state.brandMarket.offers.find((x) => x.id === offerId)!;
  const b = brandById(state, o.brandId)!;
  if (o.form === "lizenzspiel") {
    pay(state, buyerId, o.ownerId, o.flatCent);
    state.brandMarket.licenses.push({
      id: state.brandMarket.nextLicenseId++, brandId: b.id, ownerId: o.ownerId, licenseeId: buyerId, genres: [...o.genres],
      startWeek: state.week, endWeek: state.week + o.years * WEEKS_PER_YEAR, gamesAllowed: o.gamesMax, gamesMade: 0,
      flatCent: o.flatCent, royaltyBp: o.royaltyBp, minScoreBp: o.minScoreBp, incomeCent: o.flatCent, status: "aktiv",
    });
    // Ein Angebot „offen“ bleibt für weitere Lizenznehmer stehen (bis LIZ-M07); die anderen Vorlagen sind vergeben.
    if (o.template !== "offen" || activeLicenses(state, b.id).length >= M(data).maxActiveLicenses) withdrawOffer(state, o.id);
    if (o.ownerId === PLAYER || buyerId === PLAYER) log(state, "log.brandLicensed", { brand: b.name, owner: ownerName(state, o.ownerId), licensee: ownerName(state, buyerId) });
    return;
  }
  pay(state, buyerId, o.ownerId, o.priceCent, "other");
  transferBrand(state, b, buyerId);
  chronicle(state, "log.brandSold", { brand: b.name, buyer: ownerName(state, buyerId), price: o.priceCent });
  if (o.ownerId === PLAYER || buyerId === PLAYER) log(state, "log.brandSold", { brand: b.name, buyer: ownerName(state, buyerId), price: o.priceCent });
}

function transferBrand(state: GameState, b: Brand, to: number): void {
  // ZIE-R06: Ein Verkauf einer eigenen Marke beendet „unabhängig bleiben“.
  if (b.ownerId === PLAYER && to !== PLAYER) onBrandSold(state);
  b.ownerId = to;
  state.brandMarket.offers = state.brandMarket.offers.filter((x) => x.brandId !== b.id);
  for (const l of activeLicenses(state, b.id)) {
    if (l.licenseeId === to) l.status = "abgelaufen";
    else l.ownerId = to;
  }
}

// ---------- Lizenzspiele (LIZ-M05, LIZ-M09 bis LIZ-M12, PRD-R76) ----------

/** Gültige Lizenz eines Studios für eine Marke und ein Genre. */
export function usableLicense(state: GameState, licenseeId: number, brandId: number, genre: string): BrandLicense | undefined {
  return state.brandMarket.licenses.find((l) => l.licenseeId === licenseeId && l.brandId === brandId && l.status === "aktiv"
    && l.genres.includes(genre) && l.gamesMade < l.gamesAllowed && state.week < l.endWeek);
}

/** Marken, die der Spieler für ein neues Spiel wählen darf: eigene und lizenzierte (je Genre). */
export function validatePlayerBrand(state: GameState, brandId: number | null | undefined, genre: string): string | null {
  if (brandId == null) return null;
  const b = brandById(state, brandId);
  if (!b) return "error.unknownBrand";
  if (b.ownerId === PLAYER) return null;
  return usableLicense(state, PLAYER, brandId, genre) ? null : "error.noBrandLicense";
}

/** LIZ-M05, LIZ-M12: nach dem Release eines Lizenzspiels Qualitätsklausel und Müdigkeit. */
export function onLicensedRelease(state: GameState, data: GameData, licenseId: number | null | undefined, scoreBp: Bp): void {
  const l = licenseId == null ? undefined : state.brandMarket.licenses.find((x) => x.id === licenseId);
  if (!l) return;
  l.gamesMade += 1;
  const b = brandById(state, l.brandId);
  const m = M(data);
  if (b && (scoreBp < m.weakScoreBp || scoreBp < l.minScoreBp)) {
    b.fatigueBp = clamp(b.fatigueBp + m.weakExtraFatigueBp, 0, BP_ONE);
  }
  if (scoreBp < l.minScoreBp && l.status === "aktiv") {
    const penalty = m.penaltyFlatTimes * l.flatCent;
    pay(state, l.licenseeId, l.ownerId, penalty);
    l.incomeCent += penalty;
    l.status = "entzogen";
    if (l.licenseeId === PLAYER || l.ownerId === PLAYER) log(state, "log.brandLicenseRevoked", { brand: b?.name ?? "", cost: penalty });
  }
}

/** Royalty auf den Netto-Umsatz einer Woche an den Inhaber (LIZ-M04). */
export function payBrandRoyalty(state: GameState, licenseId: number | null | undefined, weekRevenueCent: Cent): void {
  if (licenseId == null || weekRevenueCent <= 0) return;
  const l = state.brandMarket.licenses.find((x) => x.id === licenseId);
  if (!l) return;
  const cent = mulBp(weekRevenueCent, l.royaltyBp);
  pay(state, l.licenseeId, l.ownerId, cent);
  l.incomeCent += cent;
}

// ---------- KI-Marken (MRK-R69, LIZ-M21, LIZ-M22, LIZ-M24) ----------

function uniqueBrandName(state: GameState, data: GameData, rng: Rng): string {
  const used = new Set(state.brands.map((b) => b.name));
  const free = M(data).names.filter((n) => !used.has(n));
  if (free.length > 0) return free[rng.int(free.length)]!;
  const base = M(data).names[rng.int(M(data).names.length)]!;
  let i = 2;
  while (used.has(`${base} ${i}`)) i += 1;
  return `${base} ${i}`;
}

/** KI-Projekt: Lizenzmarke für das Genre, sonst eine eigene Marke mit Fans im Genre, die nicht zu müde ist. */
export function aiChooseBrand(state: GameState, data: GameData, studio: AiStudio, project: AiProject): void {
  const lic = state.brandMarket.licenses.find((l) => l.licenseeId === studio.id && l.status === "aktiv" && l.genres.includes(project.genre)
    && l.gamesMade < l.gamesAllowed && state.week < l.endWeek);
  if (lic) {
    project.brandId = lic.brandId;
    project.brandLicenseId = lic.id;
    return;
  }
  const own = state.brands.filter((b) => b.ownerId === studio.id && (b.fans[project.genre] ?? 0) > 0 && b.fatigueBp < data.brands.pauseFatigueBp)
    .sort((a, b) => (b.fans[project.genre] ?? 0) - (a.fans[project.genre] ?? 0) || a.id - b.id)[0];
  project.brandId = own?.id ?? null;
  project.brandLicenseId = null;
}

/** Release eines KI-Spiels: Marke wie beim Spieler fortschreiben; ein Hit ohne Marke gründet eine (MRK-R69). */
export function aiBrandRelease(state: GameState, data: GameData, studio: AiStudio, p: AiProject, product: AiProduct, rng: Rng): void {
  let b = brandById(state, p.brandId);
  if (!b && product.scoreBp >= M(data).aiBrandFromScoreBp) {
    b = {
      id: state.nextBrandId++, name: uniqueBrandName(state, data, rng), ownerId: studio.id, foundedWeek: state.week,
      awarenessBp: data.brands.awarenessStartBp, reputationBp: data.brands.reputationStartBp, depthBp: 0, fatigueBp: 0, discountHabitBp: 0,
      fans: {}, titles: [], firstTitleWeek: state.week, lastTitleWeek: null, jubileeOffered: true,
    };
    state.brands.push(b);
  }
  if (!b) return;
  product.brandId = b.id;
  product.brandLicenseId = p.brandLicenseId ?? null;
  const pr = data.brands;
  b.fatigueBp = fatigueAfterTitle(data, state, b);
  const fans = startFans(data, b, p.genre);
  b.lastTitleWeek = state.week;
  b.depthBp = Math.min(BP_ONE, b.depthBp + pr.depthPerTitleBp);
  b.awarenessBp = Math.min(BP_ONE, b.awarenessBp + pr.awarenessPerTitleBp);
  if (product.scoreBp >= pr.hitScoreBp) {
    b.awarenessBp = Math.min(BP_ONE, b.awarenessBp + pr.awarenessHitBp);
    b.reputationBp = Math.min(BP_ONE, b.reputationBp + pr.reputationHitBp);
  }
  if (product.scoreBp < pr.flopScoreBp) b.reputationBp = Math.max(0, b.reputationBp - pr.reputationFlopBp);
  product.fanUnitsPerWeek = divInt(mulBp(fans, pr.fanBuyRateBp), Math.max(1, pr.fanBuyWeeks), 1);
  onLicensedRelease(state, data, p.brandLicenseId, product.scoreBp);
}

/** Wöchentlich: neue Fans bei der Marke (beim Inhaber, LIZ-M10). */
export function aiBrandSales(state: GameState, data: GameData, product: AiProduct, sold: number): void {
  const b = brandById(state, product.brandId);
  if (!b || sold <= 0) return;
  b.fans[product.genre] = (b.fans[product.genre] ?? 0) + mulBp(sold, data.brands.fanShareOfBuyersBp);
}

function aiReputation(studio: AiStudio): number {
  return studio.lastScores.length === 0 ? 0 : divInt(divInt(studio.lastScores.reduce((a, b) => a + b, 0), studio.lastScores.length, 1), 1000, 1);
}

/** LIZ-MF4: Gewinn = Umsatz_mit · (1 − r) − P − Umsatz_ohne, mit Umsatz_ohne = Referenzumsatz und Fan-Käufern als Plus (ANNAHME). */
function licenseGain(state: GameState, data: GameData, o: BrandOffer, genre: string): Cent {
  const b = brandById(state, o.brandId)!;
  const net = netPerUnit(state, data);
  const without = M(data).refUnits * net;
  const withBrand = without + mulBp(startFans(data, b, genre), data.brands.fanBuyRateBp) * net;
  return mulBp(withBrand, BP_ONE - o.royaltyBp) - o.flatCent - without;
}

/** LIZ-M21: KI bietet an (Ruhe ≥ 3 Jahre → Lizenz; Geldnot → Komplettverkauf). */
function aiOffers(state: GameState, data: GameData, studio: AiStudio): void {
  const m = M(data);
  const month = monthlyCost(state, data, studio);
  for (const b of state.brands.filter((x) => x.ownerId === studio.id).sort((x, y) => x.id - y.id)) {
    if (state.brandMarket.offers.some((o) => o.brandId === b.id)) continue;
    if (studio.cashCent < m.aiOfferCashMonths * month && !brandInProduction(state, b)) {
      makeOffer(state, data, b, "komplettverkauf", "offen", null, BP_ONE, m.offerWeeks);
      continue;
    }
    const resting = b.lastTitleWeek === null || state.week - b.lastTitleWeek >= m.aiOfferRestYears * WEEKS_PER_YEAR;
    const factory = m.factoryArchetypes.includes(studio.archetype);
    if ((resting || factory) && activeLicenses(state, b.id).length < m.maxActiveLicenses && Object.keys(b.fans).length > 0) {
      makeOffer(state, data, b, "lizenzspiel", factory ? "offen" : "genreExklusiv", null, BP_ONE, m.offerWeeks);
    }
  }
}

/** LIZ-M22, LIZ-M24, MRK-R69: KI fragt an bzw. kauft; Angebote des Spielers mit Premium werden zur Fokus-Karte. */
function aiDemand(state: GameState, data: GameData, studio: AiStudio, rng: Rng): void {
  const m = M(data);
  // Indies fragen mit 30 % im Jahr an, die anderen seltener (je Quartal ein Viertel davon).
  const chance = studio.archetype === "indie" ? m.indieChancePerYearBp : m.aiDemandChancePerYearBp;
  if (rng.uniformBp() >= divInt(chance, 4, 1)) return;
  for (const o of [...state.brandMarket.offers].sort((a, b) => a.id - b.id)) {
    if (!state.brandMarket.offers.includes(o) || takeBlocked(state, data, o, studio.id) !== null) continue;
    if (o.ownerId === PLAYER && grudge(state, data, studio.id)) continue;
    if (o.form === "komplettverkauf") {
      if (!m.buyerArchetypes.includes(studio.archetype)) continue;
      const b = brandById(state, o.brandId)!;
      if (o.priceCent > mulBp(salePrice(state, data, b), m.aiBuyMaxValueBp)) continue;
      if (studio.cashCent < o.priceCent + m.aiBuyCashMonths * monthlyCost(state, data, studio)) continue;
      takeOffer(state, data, o.id, studio.id);
      return;
    }
    const genre = o.genres.find((g) => (studio.experienceGenre[g] ?? 0) >= m.aiExperienceMinBp);
    if (!genre || licenseGain(state, data, o, genre) <= 0) continue;
    if (o.ownerId === PLAYER) {
      // LIZ-M18: Offen und Genre-exklusiv nehmen automatisch an (Studio-Ruf ≥ 40), Premium fragt den Spieler.
      if (m.templates[o.template].autoAccept && aiReputation(studio) >= m.autoAcceptReputation) {
        takeOffer(state, data, o.id, studio.id);
        return;
      }
      if (!m.templates[o.template].autoAccept && !state.events.some((e) => e.kind === "markenanfrage" && e.brandDeal?.offerId === o.id)) {
        addEvent(state, data, {
          kind: "markenanfrage", scope: "welt", projectId: null, options: ["annehmen", "ablehnen"], defaultOption: "ablehnen",
          brandDeal: { brandId: o.brandId, offerId: o.id, studioId: studio.id, priceCent: o.flatCent, aiBidCent: 0, aiBidderId: null },
        });
      }
      continue;
    }
    takeOffer(state, data, o.id, studio.id);
    return;
  }
}

// ---------- Konkursmasse (MRK-R65, MRK-R66, LIZ-M29) ----------

/** Höchstgebote der KI: 2–3 Studios, je min(Bewertung, 40 % des Kapitals). */
function aiBids(state: GameState, data: GameData, b: Brand, startCent: Cent, rng: Rng): { bidderId: number | null; bestCent: Cent; secondCent: Cent } {
  const a = M(data).auction;
  const pool = liveStudios(state).filter((s) => s.id !== b.ownerId).sort((x, y) => x.id - y.id);
  const n = Math.min(pool.length, rng.range(a.biddersMin, a.biddersMax));
  const value = salePrice(state, data, b);
  const bids: { id: number; cent: Cent }[] = [];
  for (let i = 0; i < n; i++) {
    const s = pool.splice(rng.int(pool.length), 1)[0]!;
    const cent = Math.min(value, mulBp(Math.max(0, s.cashCent), a.aiMaxCashBp));
    if (cent >= startCent) bids.push({ id: s.id, cent });
  }
  bids.sort((x, y) => y.cent - x.cent || x.id - y.id);
  return { bidderId: bids[0]?.id ?? null, bestCent: bids[0]?.cent ?? 0, secondCent: bids[1]?.cent ?? startCent };
}

/** MRK-R65: Pleite eines KI-Studios: jede Marke einzeln in die Auktion; Lizenzen des Studios enden. */
export function onStudioClosed(state: GameState, data: GameData, studio: AiStudio): void {
  for (const l of state.brandMarket.licenses) if (l.licenseeId === studio.id && l.status === "aktiv") l.status = "abgelaufen";
  state.brandMarket.offers = state.brandMarket.offers.filter((o) => o.ownerId !== studio.id);
  const rng = stream(state, "marken");
  for (const b of state.brands.filter((x) => x.ownerId === studio.id).sort((x, y) => x.id - y.id)) {
    b.ownerId = NO_OWNER;
    const start = salePrice(state, data, b, M(data).auction.startFactorBp);
    const bid = aiBids(state, data, b, start, rng);
    if (state.brandMarket.unlocked) {
      // Der Spieler kann mitbieten: Zuschlag mit 5 % über dem besten KI-Gebot (mindestens dem Startpreis).
      const win = Math.max(start, bid.bidderId === null ? start : bid.bestCent + mulBp(bid.bestCent, M(data).auction.winStepBp));
      const e = addEvent(state, data, {
        kind: "konkursmasse", scope: "welt", projectId: null, options: ["bieten", "verzichten"], defaultOption: "verzichten",
        brandDeal: { brandId: b.id, offerId: null, studioId: studio.id, priceCent: win, aiBidCent: Math.max(start, bid.secondCent), aiBidderId: bid.bidderId },
      });
      e.deadlineWeek = state.week + 1;
    } else settleAuction(state, data, b, bid.bidderId, Math.max(start, bid.secondCent), start);
  }
}

function settleAuction(state: GameState, data: GameData, b: Brand, winner: number | null, priceCent: Cent, startCent: Cent): void {
  if (winner !== null && (winner === PLAYER || studioById(state, winner)?.closedWeek === null)) {
    pay(state, winner, NO_OWNER, priceCent, "other");
    transferBrand(state, b, winner);
    chronicle(state, "log.brandAuctioned", { brand: b.name, buyer: ownerName(state, winner), price: priceCent });
    return;
  }
  // MRK-R66: unverkauft zum Startpreis −25 % in den Markenmarkt.
  const offer = makeOffer(state, data, b, "komplettverkauf", "offen", null, BP_ONE, M(data).auction.unsoldOfferWeeks);
  offer.priceCent = mulBp(startCent, BP_ONE - M(data).auction.unsoldDiscountBp);
}

export function applyBrandDecision(state: GameState, data: GameData, event: GameEvent, option: string): void {
  const d = event.brandDeal;
  if (!d) return;
  if (event.kind === "markenanfrage") {
    const o = d.offerId === null ? undefined : state.brandMarket.offers.find((x) => x.id === d.offerId);
    if (option === "annehmen" && o && takeBlocked(state, data, o, d.studioId) === null) takeOffer(state, data, o.id, d.studioId);
    return;
  }
  const b = brandById(state, d.brandId);
  if (!b || b.ownerId !== NO_OWNER) return;
  const start = salePrice(state, data, b, M(data).auction.startFactorBp);
  if (option === "bieten" && state.moneyCent >= d.priceCent) settleAuction(state, data, b, PLAYER, d.priceCent, start);
  else settleAuction(state, data, b, d.aiBidderId, d.aiBidCent, start);
}

// ---------- Quartalsschritt ----------

/** LIZ-M01 Freischaltung; LIZ-M20 Ablauf; KI-Angebote und -Nachfrage einmal im Quartal (LIZ-M24). */
export function brandMarketStep(state: GameState, data: GameData): void {
  const bm = state.brandMarket;
  if (!bm.unlocked && yearOf(state) >= M(data).fromYear && state.brands.some((b) => b.ownerId === PLAYER && b.titles.length > 0)) {
    bm.unlocked = true;
    log(state, "log.brandMarketOpen");
  }
  for (const l of bm.licenses) if (l.status === "aktiv" && state.week >= l.endWeek) l.status = "abgelaufen";
  const expired = bm.offers.filter((o) => state.week >= o.validUntilWeek);
  for (const o of expired) {
    if (o.ownerId === PLAYER) log(state, "log.brandOfferExpired", { brand: brandById(state, o.brandId)?.name ?? "" });
    // Konkursmasse ohne Käufer kommt erneut auf den Markt (LIZ-M29 sinngemäß).
    const b = brandById(state, o.brandId);
    if (o.ownerId === NO_OWNER && b) {
      const again = makeOffer(state, data, b, "komplettverkauf", "offen", null, BP_ONE, M(data).auction.unsoldOfferWeeks);
      again.priceCent = mulBp(o.priceCent, BP_ONE - M(data).auction.unsoldDiscountBp);
    }
  }
  bm.offers = bm.offers.filter((o) => !expired.includes(o));
  if (!isFirstWeekOfQuarter(state.week)) return;
  const rng = stream(state, "marken");
  for (const s of liveStudios(state)) {
    aiOffers(state, data, s);
    aiDemand(state, data, s, rng);
  }
}

/** Marken des Spielers (eigene) und lizenzierte fremde Marken mit ihrer Lizenz, für Brett und Cockpit. */
export function playerLicenses(state: GameState): BrandLicense[] {
  return state.brandMarket.licenses.filter((l) => l.licenseeId === PLAYER && l.status === "aktiv");
}

