// Texte aus data/texts je Sprache, nach Ansicht aufgeteilt (Prüfung Fable 03.11.2026). Neue Schlüssel gehören in die
// Datei ihres Präfixes (siehe GROUPS in docs/TEXTE.md); Präfixe ohne Gruppe stehen in allgemein.json.

import de_ereignisse from "../../data/texts/de/ereignisse.json";
import de_bericht from "../../data/texts/de/bericht.json";
import de_fehler from "../../data/texts/de/fehler.json";
import de_projekte from "../../data/texts/de/projekte.json";
import de_firma from "../../data/texts/de/firma.json";
import de_markt from "../../data/texts/de/markt.json";
import de_engine from "../../data/texts/de/engine.json";
import de_hilfe from "../../data/texts/de/hilfe.json";
import de_allgemein from "../../data/texts/de/allgemein.json";
import en_ereignisse from "../../data/texts/en/ereignisse.json";
import en_bericht from "../../data/texts/en/bericht.json";
import en_fehler from "../../data/texts/en/fehler.json";
import en_projekte from "../../data/texts/en/projekte.json";
import en_firma from "../../data/texts/en/firma.json";
import en_markt from "../../data/texts/en/markt.json";
import en_engine from "../../data/texts/en/engine.json";
import en_hilfe from "../../data/texts/en/hilfe.json";
import en_allgemein from "../../data/texts/en/allgemein.json";

export const TEXTS_DE: Record<string, string> = { ...de_ereignisse, ...de_bericht, ...de_fehler, ...de_projekte, ...de_firma, ...de_markt, ...de_engine, ...de_hilfe, ...de_allgemein };
export const TEXTS_EN: Record<string, string> = { ...en_ereignisse, ...en_bericht, ...en_fehler, ...en_projekte, ...en_firma, ...en_markt, ...en_engine, ...en_hilfe, ...en_allgemein };
