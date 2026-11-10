// Spielstand-Datei (S12 5.5, TEC-R40, TEC-R41, TEC-R44, TEC-R45). Reine Funktionen: Verpacken, Prüfen, Migrieren.
// Komprimieren und Ablegen übernimmt der Worker (src/worker/storage.ts), weil das Browser-APIs braucht.
import type { GameData, GameState, Input } from "./model/types";
import { dateOf } from "./calendar";
import { emptyFuture, fillWorldTables, SCHEMA_VERSION } from "./game";
import { emptyStock } from "./systems/boerse";
import { emptyAcquisitions } from "./systems/uebernahmen";
import { fillOps, newOperations } from "./systems/betrieb";
import { mulDiv, TABLE_VERSION } from "./num";
import { stateChecksum } from "./hash";
import { emptyLicensing } from "./systems/lizenzen";
import { emptyAi } from "./systems/ki/studios";
import { emptyMakers } from "./systems/plattformen";
import { emptyStaff } from "./systems/personal";
import { emptyDelegation } from "./systems/delegation";
import { emptyBrandMarket } from "./systems/markenmarkt";

export const GAME_VERSION = "0.1.0";

export interface SaveMeta {
  schemaVersion: number;
  gameVersion: string;
  tableVersion: number;
  dataChecksum: string;
  mods: { id: string; version: string }[];
  seed: string;
  week: number;
  year: number;
  ironman?: boolean;
  moneyCent: number;
  released: number;
  /** Prüfsumme des Spielstands, damit beschädigte Dateien auffallen. */
  stateChecksum: string;
}

export interface SaveFile {
  meta: SaveMeta;
  state: GameState;
  /** TEC-R45: Eingaben der letzten 52 Wochen zum Nachstellen von Fehlern. */
  inputLog: { week: number; input: Input }[];
}

export class SaveError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

/** TEC-R45: nur die Eingaben der letzten 52 Wochen behalten. */
export function trimInputLog(log: readonly { week: number; input: Input }[], week: number): { week: number; input: Input }[] {
  return log.filter((e) => e.week > week - 52);
}

/** TEC-R40: Schema-Version, Spielversion, Seed, Einstellungen, Mods mit Version und Daten-Prüfsumme. */
export function createSave(state: GameState, data: GameData, inputLog: readonly { week: number; input: Input }[]): SaveFile {
  return {
    meta: {
      schemaVersion: state.schemaVersion,
      gameVersion: GAME_VERSION,
      tableVersion: state.tableVersion,
      dataChecksum: state.dataChecksum,
      mods: [{ id: data.modId, version: data.modVersion }, ...data.mods.map((m) => ({ id: m.id, version: m.version }))],
      seed: state.seed,
      ironman: state.settings.ironman,
      week: state.week,
      year: dateOf(state.startYear, state.week).year,
      moneyCent: state.moneyCent,
      released: state.projects.filter((p) => p.status === "veroeffentlicht").length,
      stateChecksum: stateChecksum(state),
    },
    state: structuredClone(state),
    inputLog: trimInputLog(inputLog, state.week),
  };
}

type AnyState = Record<string, unknown> & { schemaVersion: number };

/**
 * TEC-R41: Je Schema-Version eine Funktion auf die nächste. Version 1 (Etappe 0) wurde nie gespeichert, weil es
 * kein Speichern gab; deshalb beginnt die Kette bei 2. Neue Versionen tragen hier ihre Migration ein.
 */
export const MIGRATIONS: Record<number, (s: AnyState) => AnyState> = {
  // 2 → 3: Pausieren, Abbrechen und Archiv (PRD-R40 bis PRD-R43).
  2: (s) => {
    const projects = (s.projects as Record<string, unknown>[]).map((p) => ({ ...p, resumeWeeksLeft: 0, archiveSavingBp: 0 }));
    return { ...s, projects, archive: [], schemaVersion: 3 };
  },
  // 3 → 4: Schwierigkeit, Entscheidungsdichte und Finanzen (S10, FRM-R37 bis FRM-R41).
  3: (s) => ({
    ...s,
    settings: { preset: "normal", decisionDensity: "normal", ...(s.settings as Record<string, unknown>) },
    finance: { loanCent: 0, creditNote: "C", loanRateBp: 0, cushionDebtCent: 0, cushionRepayCent: 0, insolvencyMonths: 0, ledger: [] },
    gameOver: null,
    schemaVersion: 4,
  }),
  // 4 → 5: Plattformen, Verkäufe, Auflage, Zertifizierung (S05, S08). Alte Projekte erscheinen auf dem Heimcomputer von 1980 (günstigster Datenträger).
  4: (s) => {
    const projects = (s.projects as Record<string, unknown>[]).map((p) => ({
      ...p, platforms: ["fuchs"], printRun: null, certWeeksLeft: null, certPassed: false, certAttempts: 0, sales: null,
    }));
    const finance = s.finance as { ledger: { costs: Record<string, number> }[] };
    const ledger = finance.ledger.map((m) => ({ ...m, costs: { production: 0, storage: 0, ...m.costs } }));
    return { ...s, projects, finance: { ...finance, ledger }, schemaVersion: 5 };
  },
  // 5 → 6: Büros (Entscheidung 1): Alle Spielstände beginnen in der Garage.
  5: (s) => ({ ...s, office: { id: "garage", sinceWeek: 0, moveWeeksLeft: 0 }, schemaVersion: 6 }),
  // 6 → 7: Produkttypen und Gate (PRD-R01, PRD-R22). Bestehende Projekte sind Standardspiele; das Gate gilt als vorbei.
  6: (s) => ({
    ...s,
    projects: (s.projects as Record<string, unknown>[]).map((p) => ({ ...p, type: "standard", sourceId: null, gateOffered: true })),
    schemaVersion: 7,
  }),
  // 7 → 8: Ereigniskatalog, Chronik, Jahrbuch, Freischaltungen (S01); sonstige Kosten im Monatsbuch; Nachfragefaktor.
  7: (s) => {
    const finance = s.finance as { ledger: { costs: Record<string, number> }[] };
    return {
      ...s,
      eventCooldowns: {}, chronicle: [], yearbooks: [], unlocks: {}, unlockWaiting: {},
      finance: { ...finance, ledger: finance.ledger.map((m) => ({ ...m, costs: { other: 0, ...m.costs } })) },
      projects: (s.projects as Record<string, unknown>[]).map((p) => {
        const sales = p.sales as Record<string, unknown> | null;
        return { ...p, sales: sales ? { demandFactorBp: 10000, ...sales } : null };
      }),
      schemaVersion: 8,
    };
  },
  // 8 → 9: Steuern mit Verlustvortrag (A46): Monatsbuch mit Steuerspalte, leerer Verlustvortrag.
  8: (s) => {
    const finance = s.finance as { ledger: { costs: Record<string, number> }[] };
    return {
      ...s,
      finance: { ...finance, lossCarry: [], ledger: finance.ledger.map((m) => ({ ...m, costs: { tax: 0, ...m.costs } })) },
      schemaVersion: 9,
    };
  },
  // 9 → 10: Ironman (KRN-R54, ZIE-R21); bestehende Spielstände sind keine Ironman-Partien.
  9: (s) => ({ ...s, settings: { ...(s.settings as Record<string, unknown>), ironman: false }, schemaVersion: 10 }),
  // 10 → 11: Ereignisplaner (S01 5.2) mit leerer Warteschlange.
  10: (s) => ({ ...s, eventQueue: [], schemaVersion: 11 }),
  // 11 → 12: Engines (S03, Etappe 2). Bisherige Projekte liefen auf der Starter-Engine (Stand der Daten von Schema 12)
  // mit E = 1; ihre Wertungen bekommen einen Engine-Balken 0, damit die Summe der Balken gleich bleibt.
  11: (s) => {
    const starter = { rendering: 1, audio: 0, physik: 0, ki: 0, netzwerk: 0, werkzeuge: 0, plattformen: 0, streaming: 0 };
    const projects = (s.projects as Record<string, unknown>[]).map((p) => {
      const result = p.result as { quality: Record<string, unknown>; bars: { factor: string; value: number }[] } | null;
      const migrated = result ? {
        ...result,
        quality: { ...result.quality, engineModules: [], qEngine: result.quality.qFit },
        bars: result.bars.flatMap((b) => (b.factor === "passung" ? [b, { factor: "engine", value: 0 }] : [b])),
      } : null;
      return {
        ...p, result: migrated, engine: { id: "starter", major: 1, minor: 0, binding: "fest", levels: { ...starter } },
        debtLostWeeksBp: 0, debtWeeksReported: 0, pendingFeatures: [], makeshift: [], waitingForEngine: false,
        versionShareBp: Object.fromEntries((p.platforms as string[]).map((id) => [id, 10000])), brandId: null, patchedEngineBp: null,
        sales: p.sales ? { ...(p.sales as Record<string, unknown>), fanUnitsPerWeek: 0, fanWeeks: 0 } : null,
      };
    });
    const finance = s.finance as { ledger: { costs: Record<string, number> }[] };
    const ledger = finance.ledger.map((m) => ({ ...m, costs: { licenses: 0, ...m.costs } }));
    return { ...s, projects, engine: null, platformExperience: {}, brands: [], nextBrandId: 1, techUndo: [], finance: { ...finance, ledger }, schemaVersion: 12 };
  },
  // 12 → 13: Umsatzbeteiligung lizenzierter Module (ENG-R30); bisher verkaufte Spiele zahlen keine.
  12: (s) => ({
    ...s,
    projects: (s.projects as Record<string, unknown>[]).map((p) => (p.sales ? { ...p, sales: { ...(p.sales as Record<string, unknown>), licenseRoyaltyBp: 0 } } : p)),
    schemaVersion: 13,
  }),
  // 13 → 14: digitaler Anteil der Verkäufe (MKT-R24); bisher war alles physisch.
  13: (s) => ({
    ...s,
    projects: (s.projects as Record<string, unknown>[]).map((p) => (p.sales ? { ...p, sales: { ...(p.sales as Record<string, unknown>), digitalSold: 0 } } : p)),
    schemaVersion: 14,
  }),
  // 14 → 15: KI-Studios (S08); die Welt entsteht im ersten Tick. Bisherige Verkäufe rechnen ihre Konkurrenz neu.
  14: (s) => ({
    ...s,
    projects: (s.projects as Record<string, unknown>[]).map((p) => (p.sales ? { ...p, sales: { ...(p.sales as Record<string, unknown>), competitionBp: null } } : p)),
    ai: { studios: [], products: [], nextStudioId: 1, nextProductId: 1, generated: false, playerRevenueByYear: [0], closures: {} },
    schemaVersion: 15,
  }),
  // 15 → 16: Lizenzmarkt (S04). Die KI-Welt entsteht neu, weil sich ihre Felder in 3.3 und 3.4 geändert haben
  // (ANNAHME: Spielstände aus der Bauphase der Etappe 3 verlieren ihre KI-Studios, nicht aber den Spieler).
  15: (s) => ({
    ...s,
    projects: (s.projects as Record<string, unknown>[]).map((p) => ({ ...p, licenseContractId: null, retrainWeeks: 0 })),
    finance: {
      ...(s.finance as Record<string, unknown>),
      ledger: ((s.finance as { ledger: { income: Record<string, number> }[] }).ledger).map((l) => ({ ...l, income: { ...l.income, licenses: 0 } })),
    },
    ai: { studios: [], products: [], nextStudioId: 1, nextProductId: 1, generated: false, playerRevenueByYear: [0], closures: {} },
    licensing: emptyLicensing(),
    schemaVersion: 16,
  }),
  // 16 → 17: Rivalen (S08 MRK-R45 ff.); KI-Welt und Lizenzmarkt entstehen neu (Bauphase der Etappe 3, ANNAHME wie 15 → 16).
  16: (s) => ({
    ...s,
    ai: emptyAi(),
    licensing: emptyLicensing(),
    schemaVersion: 17,
  }),
  // 17 → 18: Plattformbeziehungen und Devkits (S08 MRK-R14 ff.); Zeitpläne entstehen im ersten Tick.
  17: (s) => ({
    ...s,
    makers: emptyMakers(),
    projects: (s.projects as Record<string, unknown>[]).map((p) => ({ ...p, exclusivePlatform: null })),
    schemaVersion: 18,
  }),
  // 18 → 19: Teams und Schlüsselpersonen (S07 FRM-R01 ff.); Rivalen werden neu gewählt, damit sie Schlüsselpersonen haben.
  18: (s) => ({
    ...s,
    staff: emptyStaff(),
    people: (s.people as Record<string, unknown>[]).map((p) => ({ ...p, teamId: null, onboardWeeks: 0, moraleBp: 7000, burnoutBp: 0, key: null })),
    ai: emptyAi(),
    licensing: emptyLicensing(),
    schemaVersion: 19,
  }),
  // 19 → 20: Delegation, Produzenten und Regeln (S07 FRM-R55 ff.).
  19: (s) => ({
    ...s,
    delegation: emptyDelegation(),
    projects: (s.projects as Record<string, unknown>[]).map((p) => ({ ...p, producerId: null, brief: null, briefWarned: false, leadershipBp: 10000 })),
    schemaVersion: 20,
  }),
  // 20 → 21: Grundrisse und Ausstattung (S07 FRM-R21 ff.); die KI-Welt entsteht neu, damit Studios Büros haben.
  20: (s) => {
    const year = dateOf(s.startYear as number, s.week as number).year;
    return {
      ...s,
      office: {
        ...(s.office as Record<string, unknown>), extensions: 0, hardware: { level: 2, year, paidCent: 0 }, comfort: { level: 0, paidCent: 0 }, rooms: [],
        hardwareSymptomShown: false, upgradeOfferYear: year, moveSuggested: false,
      },
      ai: emptyAi(),
      licensing: emptyLicensing(),
      schemaVersion: 21,
    };
  },
  // 21 → 22: Markenmarkt (S04 LIZ-M01 ff.); Marken gehören dem Spieler, die KI-Welt entsteht neu, damit KI-Marken entstehen.
  21: (s) => ({
    ...s,
    brands: (s.brands as Record<string, unknown>[]).map((b) => ({ ...b, ownerId: 0 })),
    projects: (s.projects as Record<string, unknown>[]).map((p) => ({ ...p, brandLicenseId: null })),
    brandMarket: emptyBrandMarket(),
    ai: emptyAi(),
    licensing: emptyLicensing(),
    schemaVersion: 22,
  }),
  // 22 → 23: Rendering 6 → 12 und Audio 5 → 10 Stufen (Inhaltsausbau nach 3.12); alte Stufen behalten ihr Jahr.
  22: (s) => {
    const engine = s.engine as Record<string, unknown> | null;
    if (engine) {
      const modules = engine.modules as Record<string, Record<string, number>>;
      for (const m of Object.keys(LEVEL_REMAP_23)) {
        modules[m]!.level = remapLevel23(m, modules[m]!.level!);
        modules[m]!.ownLevel = remapLevel23(m, modules[m]!.ownLevel!);
      }
      for (const v of engine.versions as { levels: Record<string, number> }[]) v.levels = remapLevels23(v.levels);
      for (const j of engine.jobs as { module: string | null; level: number }[]) if (j.module) j.level = remapLevel23(j.module, j.level);
    }
    const remapEngine = (e: { levels: Record<string, number> }) => ({ ...e, levels: remapLevels23(e.levels) });
    return {
      ...s,
      projects: (s.projects as { engine: { levels: Record<string, number> } }[]).map((p) => ({ ...p, engine: remapEngine(p.engine) })),
      techUndo: (s.techUndo as { engine: { levels: Record<string, number> } }[]).map((u) => ({ ...u, engine: remapEngine(u.engine) })),
      ai: emptyAi(),
      licensing: emptyLicensing(),
      schemaVersion: 23,
    };
  },
  // 23 → 24: 12 Genres und 35 Themen (Inhaltsausbau); Tabellen füllt loadSave (fillWorldTables), die KI-Welt entsteht
  // neu, Hersteller ergänzen Zeitpläne neuer Plattformen.
  23: (s) => ({
    ...s,
    makers: { ...(s.makers as Record<string, unknown>), initialized: false },
    ai: emptyAi(),
    licensing: emptyLicensing(),
    schemaVersion: 24,
  }),
  // 24 → 25: Untergenres (Inhaltsausbau); bestehende Projekte haben keins.
  24: (s) => ({
    ...s,
    projects: (s.projects as Record<string, unknown>[]).map((p) => ({ ...p, subgenre: null })),
    schemaVersion: 25,
  }),
  // 25 → 26: Interesse und Marketing (S05, Etappe 4.1); laufende Projekte starten ohne Interesse mit Autopilot.
  25: (s) => {
    const finance = s.finance as { ledger: { costs: Record<string, number> }[] } & Record<string, unknown>;
    return {
      ...s,
      projects: (s.projects as Record<string, unknown>[]).map((p) => ({
        ...p,
        marketing: {
          interest: 0, interestPeak: 0, budgetPermille: 300, announcedWeek: null, autoAnnounce: true, lastCostCent: p.costCent, spentCent: 0,
          last: { spendCent: 0, decay: 0, wordOfMouth: 0, reach: 0, brand: 0, capped: 0 },
        },
      })),
      finance: { ...finance, ledger: finance.ledger.map((m) => ({ ...m, costs: { marketing: 0, ...m.costs } })) },
      schemaVersion: 26,
    };
  },
  // 26 → 27: Demo und Creator-Zugang (MKT-R07, MKT-R08, Etappe 4.2).
  26: (s) => ({
    ...s,
    projects: (s.projects as { marketing: Record<string, unknown> }[]).map((p) => ({
      ...p, marketing: { demo: "keine", demoDone: false, creatorWeeksLeft: 0, creatorUsed: false, weaknesses: [], ...p.marketing },
    })),
    schemaVersion: 27,
  }),
  // 27 → 28: Release-Paket (MKT-R09, Etappe 4.3); laufende Releases gehen ohne Paket wie bisher raus.
  27: (s) => ({
    ...s,
    projects: (s.projects as Record<string, unknown>[]).map((p) => ({ releasePlan: null, ...p })),
    schemaVersion: 28,
  }),
  // 28 → 29: Kopierschutz und Studio-Ruf (MKT-R28 ff., Etappe 4.4); bestehende Pakete ohne Schutz.
  28: (s) => ({
    ...s,
    studioReputationBp: 2000,
    projects: (s.projects as { releasePlan: Record<string, unknown> | null }[]).map((p) => ({
      ...p, releasePlan: p.releasePlan ? { protection: "keiner", ...p.releasePlan } : null,
    })),
    schemaVersion: 29,
  }),
  // 29 → 30: Preis nach dem Release (MKT-R17 ff., Etappe 4.5): Gewöhnung der Marken und Standardregel (A12).
  29: (s) => ({
    ...s,
    brands: (s.brands as Record<string, unknown>[]).map((b) => ({ discountHabitBp: 0, ...b })),
    priceRule: { active: true, afterWeeks: 52, discountBp: 2500, followCurve: false },
    schemaVersion: 30,
  }),
  // 30 → 31: Messe-Saison (MKT-R35 ff., Etappe 4.6).
  30: (s) => ({
    ...s,
    projects: (s.projects as { marketing: Record<string, unknown> }[]).map((p) => ({ ...p, marketing: { fairPlan: "auto", fairShownWeek: null, ...p.marketing } })),
    schemaVersion: 31,
  }),
  // 31 → 32: Vertrieb (MKT-V07, Etappe 4.7); bestehende Pakete über den Distributor, ohne Beigaben.
  31: (s) => ({
    ...s,
    projects: (s.projects as { releasePlan: Record<string, unknown> | null }[]).map((p) => ({
      ...p, releasePlan: p.releasePlan ? { channel: "distributor", extras: false, ...p.releasePlan } : null,
    })),
    schemaVersion: 32,
  }),
  // 32 → 33: Verwertungskette (MKT-V15 ff., Etappe 4.8); alte Produkte haben keine Restnachfrage und keine Vorschläge.
  32: (s) => ({ ...s, reissues: [], nextReissueId: 1, schemaVersion: 33 }),
  // 33 → 34: Meilensteine und langfristiges Ziel (ZIE-R01, ZIE-R06, Etappe 4.9); alte Spiele prüfen ab jetzt.
  33: (s) => ({ ...s, milestones: {}, goal: null, schemaVersion: 34 }),
  // 34 → 35: Branchenpreise (ZIE-R03, Etappe 4.10); bisher keine vergeben.
  34: (s) => ({ ...s, awards: [], schemaVersion: 35 }),
  // 35 → 36: Spielende (ZIE-R08, Etappe 4.11); eine alte Insolvenz zeigt die Wertung live (Anzeigemodell).
  35: (s) => ({ ...s, ending: null, schemaVersion: 36 }),
  // 36 → 37: Szenarien (ZIE-R13, Etappe 4.12); alte Spiele sind freie Spiele.
  36: (s) => ({ ...s, scenario: null, schemaVersion: 37 }),
  // 37 → 38: Betrieb (S06, Etappe 5.1); veröffentlichte Spiele bekommen ihren Betrieb beim Laden aus den Daten (fillOps).
  37: (s) => ({ ...s, projects: (s.projects as Record<string, unknown>[]).map((p) => ({ ...p, ops: null })), schemaVersion: 38 }),
  // 38 → 39: Abteilung Betrieb (BTR-R01, Etappe 5.4); gesperrt, bis ein Auslöser eintritt. Aufteilung kommt beim Laden aus den Daten.
  38: (s) => ({ ...s, operations: null, schemaVersion: 39 }),
  // 39 → 40: Live-Produkte (BTR-R15, Etappe 5.6); bisher gab es keine, jeder Betrieb bekommt live: null.
  39: (s) => ({
    ...s,
    projects: (s.projects as Record<string, unknown>[]).map((p) => (p.ops ? { ...p, ops: { ...(p.ops as Record<string, unknown>), live: null } } : p)),
    schemaVersion: 40,
  }),
  // 40 → 41: Server (BTR-R34 ff., Etappe 5.7): Kostenzeile „Server“; Live-Produkte gab es vor Schema 40 nicht.
  40: (s) => {
    const finance = s.finance as { ledger: { costs: Record<string, number> }[] };
    return { ...s, finance: { ...finance, ledger: finance.ledger.map((m) => ({ ...m, costs: { server: 0, ...m.costs } })) }, schemaVersion: 41 };
  },
  // 41 → 42: Analytics (BTR-R28, Etappe 5.8); bisher keine.
  41: (s) => ({ ...s, operations: s.operations ? { ...(s.operations as Record<string, unknown>), analytics: "keine" } : null, schemaVersion: 42 }),
  // 42 → 43: Einnahmenzeile Merchandising (MKT-R41, FRM-R38, Etappe 5.12).
  42: (s) => {
    const finance = s.finance as { ledger: { income: Record<string, number> }[] };
    return { ...s, finance: { ...finance, ledger: finance.ledger.map((m) => ({ ...m, income: { merch: 0, ...m.income } })) }, schemaVersion: 43 };
  },
  // 43 → 44: gezielte Personalsuche (FRM-R76, Etappe 5.13); keine läuft.
  43: (s) => ({ ...s, search: null, schemaVersion: 44 }),
  // 44 → 45: Delegation im Betrieb (BTR-R03, Etappe 5.14); Produzenten-Aufteilung und Patch-Regel an, Schwelle 10.000.
  44: (s) => ({
    ...s,
    operations: s.operations ? { splitAuto: true, autoPatch: true, shutdownBelow: 10000, ...(s.operations as Record<string, unknown>) } : null,
    schemaVersion: 45,
  }),
  // 45 → 46: Ereignisketten (KRN-R32, Etappe 6a.1); keine läuft.
  45: (s) => ({ ...s, chains: [], nextChainId: 1, schemaVersion: 46 }),
  // 46 → 47: Ketten aus Tabelle 5.7 (MRK-R56, Etappe 6a.2); Crunch-Wochen beginnen leer.
  46: (s) => ({ ...s, staff: { ...(s.staff as object), crunchWeeks: [] }, schemaVersion: 47 }),
  // 47 → 48: Marktphasen (MRK-R59, Etappe 6a.3); ab dem nächsten Jahreswechsel gilt die Phase des Jahres.
  47: (s) => ({ ...s, market: { phase: "normal", toYear: 0, prev: "krise" }, schemaVersion: 48 }),
  // 48 → 49: KI-Publisher (FRM-R42, Etappe 6a.4); sie entstehen zum nächsten Jahreswechsel.
  48: (s) => ({ ...s, publishers: [], publisherOffers: [], nextPublisherId: 1, schemaVersion: 49 }),
  // 49 → 50: Standorte (FRM-R32, Etappe 6a.6); alle Personen am Heimatstandort.
  49: (s) => ({ ...s, locations: [], nextLocationId: 1, schemaVersion: 50 }),
  // 50 → 51: Zukunftsepoche (MRK-R57, Etappe 6a.7); die Wendepunkte entstehen beim nächsten Wochenschritt.
  50: (s) => ({ ...s, future: emptyFuture(), schemaVersion: 51 }),
  // 51 → 52: Kampagnen für Live-Produkte (BTR-R15, Etappe 6a.8); keine läuft.
  51: (s) => ({
    ...s,
    projects: (s.projects as { ops?: { live?: object | null } | null }[]).map((p) => (p.ops?.live
      ? { ...p, ops: { ...p.ops, live: { ...p.ops.live, campaignCent: 0, campaignJoined: 0 } } } : p)),
    schemaVersion: 52,
  }),
  // 52 → 53: Börse (FRM-R51, Etappe 6b.2); die Firma ist nicht notiert.
  52: (s) => ({ ...s, stock: emptyStock(), schemaVersion: 53 }),
  // 53 → 54: Übernahmen (UEB-R01, Etappe 6b.3); keine Verhandlung, keine Töchter.
  53: (s) => ({ ...s, acquisitions: emptyAcquisitions(), schemaVersion: 54 }),
  // 54 → 55: Umfänge groß und AAA (Etappe 6c.1). ANNAHME: Erwartung nach Kartenplätzen aus der von „mittel“
  // (7/5 bzw. 9/5); der nächste Jahreswechsel kalibriert sie nach PRD-R56.
  54: (s) => {
    const q = s.qNorm as Record<string, number>;
    return { ...s, qNorm: { ...q, gross: q.gross ?? mulDiv(q.mittel!, 7, 5, 1), aaa: q.aaa ?? mulDiv(q.mittel!, 9, 5, 1) }, schemaVersion: 55 };
  },
  // 55 → 56: Fachteams (Etappe 6c.2); bestehende Teams sind gemischt.
  55: (s) => {
    const staff = s.staff as { teams: { id: number; name: string }[] };
    return { ...s, staff: { ...staff, teams: staff.teams.map((t) => ({ ...t, focus: null })) }, schemaVersion: 56 };
  },
  // 56 → 57: Marktplatz der Auftragsspiele (Etappe 6c.3), leer.
  56: (s) => ({ ...s, contractGames: { offers: [], nextId: 1 }, schemaVersion: 57 }),
  // 57 → 58: Zielgruppe (Etappe 6c.4); bisherige Projekte zielen auf Kernspieler.
  57: (s) => ({ ...s, projects: (s.projects as Record<string, unknown>[]).map((p) => ({ ...p, audience: p.audience ?? "kern" })), schemaVersion: 58 }),
  // 58 → 59: Design-Säulen (Etappe 6c.5). Bisherige Projekte ohne Säulen; ihre Wertungen bekommen einen Säulen-Balken 0,
  // damit die Summe der Balken gleich bleibt.
  58: (s) => ({
    ...s,
    projects: (s.projects as Record<string, unknown>[]).map((p) => {
      const result = p.result as { bars: { factor: string; value: number }[] } | null;
      const migrated = result && !result.bars.some((b) => b.factor === "saeulen")
        ? { ...result, bars: result.bars.flatMap((b) => (b.factor === "passung" ? [b, { factor: "saeulen", value: 0 }] : [b])) }
        : result;
      return { ...p, pillars: p.pillars ?? [], result: migrated };
    }),
    schemaVersion: 59,
  }),
  // 59 → 60: Phasen-Schwerpunkt (Etappe 6c.6); bisherige Projekte arbeiten ausgewogen.
  59: (s) => ({
    ...s,
    projects: (s.projects as Record<string, unknown>[]).map((p) => ({ ...p, phaseFocus: p.phaseFocus ?? {}, phaseQualityBp: p.phaseQualityBp ?? 10000 })),
    schemaVersion: 60,
  }),
  // 60 → 61: Politur je Bereich (Etappe 6c.7); bisher ohne Politur.
  60: (s) => ({
    ...s,
    projects: (s.projects as Record<string, unknown>[]).map((p) => ({ ...p, polishArea: p.polishArea ?? null, polish: p.polish ?? {} })),
    schemaVersion: 61,
  }),
  // 61 → 62: Lokalisierung (Etappe 6c.8); bisher nur Heimatsprache.
  61: (s) => ({ ...s, projects: (s.projects as Record<string, unknown>[]).map((p) => ({ ...p, languages: p.languages ?? [] })), schemaVersion: 62 }),
  // 62 → 63: Prüfung Fable 03.11.2026, Gesehen-Zustand im Spielstand; was offen ist, gilt als gesehen.
  62: (s) => ({
    ...s,
    guideSeen: { hidden: false, skipped: [], unlocks: Object.keys((s.unlocks ?? {}) as Record<string, number>).sort(), firsts: [] },
    schemaVersion: 63,
  }),
  // 63 → 64: Langzeitmotivation (Prüfung Fable 03.11.2026), die Konferenz beginnt mit dem nächsten Jahr; Standgröße (AUS-R21) mittel.
  63: (s) => ({
    ...s,
    motivation: { offers: [], offerDeadlineWeek: 0, annual: null, annualHistory: [], streak: 0, bestStreak: 0, archrival: null, formerRivals: [], epochAnnounced: [], epochTitles: [] },
    fairBooth: "mittel",
    schemaVersion: 64,
  }),
  // 64 → 65: eigenes Publishing (S13 AUS-R40 bis AUS-R43); noch keine Pitches und Verträge.
  // Dazu der Schalter „Module einzeln anbieten“ (AUS-R70), aus.
  64: (s) => ({ ...s, publishing: { pitches: [], deals: [], nextId: 1 }, moduleOffer: { active: false, customers: [] },
    // S13 AUS-R83, AUS-R90: ohne Schutz, ohne Angebot.
    stock: { ...(s.stock as Record<string, unknown>), protection: false, lastBuybackWeek: -999, hostile: null, hostileCooldownUntil: 0 }, schemaVersion: 65 }),
  // 65 → 66: Endgame-Themen (Auftrag 04.11.2026): keine Herausforderungen, keine Krisen.
  65: (s) => ({
    ...s,
    endgame: { challenges: [], hallPoints: 0, rankOneYears: 0, crisesSurvived: 0, serverCrisis: null, lastFineCent: 0 },
    schemaVersion: 66,
  }),
};

/** Alte Stufe → neue Stufe gleichen Jahres (Migration 22 → 23). */
const LEVEL_REMAP_23: Record<string, number[]> = { rendering: [0, 1, 3, 5, 7, 9, 11], audio: [0, 1, 3, 4, 6, 8] };

function remapLevel23(module: string, level: number): number {
  const map = LEVEL_REMAP_23[module];
  return map ? (map[level] ?? level) : level;
}

function remapLevels23(levels: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(levels).map(([m, l]) => [m, remapLevel23(m, l)]));
}

/** KRN-R54, ZIE-R21: Der einzige Platz einer Ironman-Partie, benannt nach dem Seed. */
export function ironmanSlot(seed: string): string {
  return `ironman-${seed}`;
}

/** KRN-R52, ZIE-R29: Autosave nach dem Jahrbuch und alle autosaveIntervalWeeks Wochen. */
export function isAutosaveWeek(data: GameData, week: number, yearbook: boolean): boolean {
  return yearbook || (week > 0 && week % data.time.autosaveIntervalWeeks === 0);
}

export const OLDEST_SUPPORTED_SCHEMA = 2;

export function migrateState(raw: AnyState): GameState {
  let s = raw;
  if (s.schemaVersion < OLDEST_SUPPORTED_SCHEMA) {
    throw new SaveError("save.tooOld", `Schema-Version ${s.schemaVersion} wird nicht mehr unterstützt`);
  }
  if (s.schemaVersion > SCHEMA_VERSION) {
    throw new SaveError("save.tooNew", `Schema-Version ${s.schemaVersion} ist neuer als das Spiel (${SCHEMA_VERSION})`);
  }
  while (s.schemaVersion < SCHEMA_VERSION) {
    const step = MIGRATIONS[s.schemaVersion];
    if (!step) throw new SaveError("save.noMigration", `Keine Migration von Version ${s.schemaVersion}`);
    // TEC-R41: auf einer Kopie migrieren; das Original bleibt unverändert, bis alles geklappt hat.
    s = step(structuredClone(s));
  }
  return s as unknown as GameState;
}

/**
 * ZIE-R37: Projekte, deren Genre, Thema, Plattform oder Karte es in den geladenen Daten nicht mehr gibt (Mod fehlt),
 * bekommen Ersatz. ANNAHME: Ersatz ist der erste Datensatz nach ID (statt eines eigenen Datensatzes „Unbekannt“);
 * unbekannte Karten fallen weg. Liefert die Zahl der ersetzten Angaben.
 */
export function fallbackRecords(state: GameState, data: GameData): number {
  const genres = new Set(data.genres.map((g) => g.id));
  const themes = new Set(data.themes.map((t) => t.id));
  const platforms = new Set(data.platforms.map((p) => p.id));
  const features = new Set(data.features.map((f) => f.id));
  let n = 0;
  for (const p of state.projects) {
    if (!genres.has(p.genre)) { p.genre = data.genres[0]!.id; n++; }
    if (!themes.has(p.theme)) { p.theme = data.themes[0]!.id; n++; }
    const keepP = p.platforms.filter((x) => platforms.has(x));
    if (keepP.length !== p.platforms.length) { n += p.platforms.length - keepP.length; p.platforms = keepP.length > 0 ? keepP : [data.platforms[0]!.id]; }
    const keepF = p.features.filter((x) => features.has(x));
    if (keepF.length !== p.features.length) { n += p.features.length - keepF.length; p.features = keepF; }
  }
  return n;
}

export interface LoadResult {
  state: GameState;
  inputLog: { week: number; input: Input }[];
  /** Hinweise für den Spieler (Textschlüssel), z. B. geänderte Daten oder Tabellen. */
  warnings: string[];
}

/** Prüft und migriert eine gelesene Datei. Wirft SaveError bei unbrauchbaren Dateien. */
export function loadSave(file: unknown, data: GameData): LoadResult {
  if (!file || typeof file !== "object" || !("meta" in file) || !("state" in file)) {
    throw new SaveError("save.invalid", "Keine Spielstand-Datei");
  }
  const f = file as SaveFile;
  const warnings: string[] = [];
  if (f.meta.schemaVersion === f.state.schemaVersion && stateChecksum(f.state) !== f.meta.stateChecksum) {
    throw new SaveError("save.corrupt", "Prüfsumme des Spielstands stimmt nicht");
  }
  const state = migrateState(f.state as unknown as AnyState);
  fillWorldTables(state, data);
  fillOps(state, data);
  state.operations ??= newOperations(data);
  // ZIE-R37: Fehlt eine Mod des Spielstands, warnt das Spiel; Datensätze daraus fallen auf Ersatz zurück.
  const active = new Set([data.modId, ...data.mods.map((m) => m.id)]);
  if ((f.meta.mods ?? []).some((m) => !active.has(m.id))) warnings.push("save.modMissing");
  if (fallbackRecords(state, data) > 0) warnings.push("save.modFallback");
  // TEC-R44 sinngemäß: andere Daten oder Tabellen sind kein Fehler, aber der Verlauf ist nicht mehr bitgleich.
  if (state.dataChecksum !== data.checksum) warnings.push("save.dataChanged");
  if (state.tableVersion !== TABLE_VERSION) warnings.push("save.tablesChanged");
  // Ab jetzt läuft der Spielstand mit den aktuellen Daten und Tabellen weiter.
  state.dataChecksum = data.checksum;
  state.tableVersion = TABLE_VERSION;
  return { state, inputLog: f.inputLog ?? [], warnings };
}
