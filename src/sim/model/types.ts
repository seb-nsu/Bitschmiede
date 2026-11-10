// Typen aller Entitäten (S02 Abschnitt 3, S01 Abschnitt 3, S12 TEC-R01).
// Alle Werte sind ganze Zahlen: Geld in Cent, alles andere in bp (1,0 = 10.000), TEC-R80.
// Prüfung Fable 03.11.2026: aufgeteilt nach System in model/parts/; diese Datei bleibt der einzige Einstieg.

export * from "./parts/grundlagen";
export * from "./parts/daten";
export * from "./parts/lizenzmarkt";
export * from "./parts/ki";
export * from "./parts/spielstand";
export * from "./parts/markenmarkt";
export * from "./parts/delegation";
export * from "./parts/projektdaten";
export * from "./parts/ereignisse";
export * from "./parts/betrieb";
export * from "./parts/projekt";
export * from "./parts/zustand";
export * from "./parts/eingaben";
export * from "./parts/motivation";
export * from "./parts/endspiel";
export * from "./parts/publishing";
