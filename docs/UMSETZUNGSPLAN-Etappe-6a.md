# Umsetzungsplan Etappe 6a „Ausbau I“

**Stand:** 02.11.2026 · **Grundlage:** Design-Dokument „Etappenplan“ (Abnahmekriterium 6, Zuordnung 6a), S01 (KRN-R32 Ketten), S07 (FRM-R32–R34, R42–R47, R72, Tabelle 5.8), S08 (MRK-R36, R53–R61, Tabellen 5.7 und 5.8), S10 (ZIE-R07), Auftrag Projektleitung vom 02.11.2026 („mache dann auch gleich mit Phase 6 weiter“), Mitgenommenes aus Etappe 5 (`docs/ROADMAP.md`)

Leitlinie bleibt: ein Entscheidungsspiel, wenige Unterbrechungen, höchstens 7 Ansichten. Ketten belegen den wöchentlichen Platz statt zusätzlich zu kommen (KRN-R32, MRK-R54).

## Abnahme

1. **Ausbau (Etappenplan, Teil 6a):** Publisher-Deals und Ereignisse funktionieren: Ein Projekt lässt sich anbieten, verhandeln, über Meilensteine finanzieren und nach Recoup abrechnen; Ketten laufen mit verzögerten Folgen und zweiter Stufe.
2. Marktphasen Boom, normal, Krise mit dem Crash 1983–85 wirken auf KI, Zins, Gehälter und Gründungen.
3. Standorte ab 1995 oder 60 Personen mit Lohnfaktor, Förderung und regionaler Steuer.
4. Zukunftsepoche ab 2025: 4–6 Wendepunkte aus dem Seed, mindestens zwei Zukunfts-Ketten, Ziele der Zukunftsepoche.
5. Technisch: `npm run check` grün, Golden-Runs bewusst neu freigegeben, Spielstände aus Etappe 5 laden (Migration), Lauf 1980–2040 wieder in höchstens 60 s (TEC-T05).

## Teilschritte

| # | Teilschritt | Regeln | Stand |
| --- | --- | --- | --- |
| 6a.1 | Ketten-Kern: ChainDef in `data/base/events/chains.json`, ChainState mit Stufe und Gedächtnis, verzögerte Folgen bis 12 Wochen, Eskalation; Ketten belegen den Wochenplatz (Krise vor Chance vor Information) | KRN-R32, MRK-R53–R55 | erledigt (Stufen sind Katalog-Ereignisse mit `stage` in `katalog.json` statt einer eigenen `chains.json`; Meldungen wirken sofort) |
| 6a.2 | Ketten aus Tabelle 5.7: Crunch-Enthüllung, Leak, Klon-Spiel, Konsolen-Ende, Verfilmungsangebot, DRM-Protest, Taktrate, Launch-Titel; die Betriebs-Ereignisse aus 5.9 bekommen ihre Folgestufen | MRK-R56, S06 Abschnitt 9 | erledigt (DRM-Protest, Mods, Taktrate und Launch-Titel bleiben einzelne Ereignisse, siehe OFFENE-FRAGEN) |
| 6a.3 | Marktphasen: Boom 2–4, normal 3–6, Krise 1–3 Jahre aus dem Seed, Crash 1983–85, Schalter Marktzyklen; Wirkung auf KI-Budgets, Entlassungen, Gründungen, Zins, Gehaltsniveau, Bewerber | MRK-R36, MRK-R59, MRK-R60 | erledigt (Anzeige im Markt; Publisher-Vorliebe mit 6a.4) |
| 6a.4 | Publisher I: KI-Publisher je Epoche mit Kapital, Ruf und Persönlichkeit; Projekt anbieten (Konzept oder Vertical Slice), bis zu drei Angebote, Verhandlung mit Spielraum und Geduld | FRM-R42–R44, Tabelle 5.8 | erledigt |
| 6a.5 | Publisher II: Raten je Meilenstein, verfehlte Meilensteine (Kürzen, Auflagen, Stopp), Split vor und nach Recoup, IP und Sequel-Option, Abbruch; Verhandlungstisch in der Oberfläche | FRM-R45–R47 | erledigt (Bots nutzen Publisher noch nicht, siehe 6a.9) |
| 6a.6 | Standorte: Freischaltung, Aufbau 6 Monate, Lohnfaktor und Förderung, Schließen, regionale Steuer mit Verlustvortrag | FRM-R32–R34, FRM-R72 | erledigt (Talentpool und Ruf je Region mit dem Arbeitgeber-Ruf später) |
| 6a.7 | Zukunftsepoche: Wendepunkte aus dem Seed, neue Plattformarten, Zukunfts-Ketten (KI-Werkzeug-Welle, letzte Konsolengeneration, Regulierungswelle), Wette auf die Zukunft, Ziele ab 2025 | MRK-R57, MRK-R58, ZIE-R07 | erledigt (Ziele als Meilensteine; KI-Firmen wetten nicht) |
| 6a.8 | Mitgenommen: Kampagnen für Live-Produkte (Zugang aus Marketing, BTR-R15) und Szenario-Ziel „verdoppeln“; Laufzeit 1980–2040 unter 60 s (Zustand nicht mehr ganz kopieren) | BTR-R15, TEC-T05 | erledigt (Laufzeit 42 s mit `advance` ohne Kopie für Headless-Läufe) |
| 6a.9 | Oberfläche, Balancing 1980–2040, Golden-Runs, Leistung, Doku | S11, TEC-T05 | erledigt (Bots nutzen Publisher; Auftragsstudio und Geld-Korridor siehe OFFENE-FRAGEN) |

## Annahmen (kleinste plausible Lösung, im Code mit `// ANNAHME:` markiert)

1. **Regionen:** Standorte bekommen eine Region aus fünf (na, eu, jp, cn, latam) nur für Lohnfaktor, Förderung und Steuer; Märkte und Lokalisierung nach Regionen bleiben später.
2. **Publisher ohne eigenes Publishing:** KI-Publisher sind eigene Firmen ohne Studios; sie finanzieren Spieler-Projekte und KI-Projekte über die bestehende KI-Schicht. Eigenes Publishing des Spielers ist 1.3 (S13).
3. **Ketten als Daten:** Wirkungen der Ketten nutzen eine kleine Liste von Effekt-Arten (Geld, Ruf, Arbeitgeber-Ruf, Interesse, Zufriedenheit, Moral, Tempo); neue Effekt-Arten nur, wenn eine Kette sie braucht.

## Nicht in 6a

Börse und Übernahmen (Etappe 6b); eigenes Publishing, Co-Entwicklung, Server-Hosting (1.3); E-Sport (1.5); eigene Konsole (2.0).
