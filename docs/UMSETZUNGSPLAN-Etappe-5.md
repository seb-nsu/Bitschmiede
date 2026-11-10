# Umsetzungsplan Etappe 5 „Live-Betrieb“

**Stand:** 02.11.2026 · **Grundlage:** Design-Dokument „Etappenplan“ (Abnahmekriterium 5 und Zuordnung Etappe 5), S06 (BTR-R, BTR-F, BTR-T), S05 (MKT-R41–R43 Merchandising, MKT-R47–R50 Early Access, V\_Katalog), S07 (FRM-R76, FRM-T32), S02 (PRD-R01, PRD-R02 Produkttypen), S12 Abschnitt 6, Auftrag Projektleitung vom 02.11.2026 („setze alles um, auch Phase 5“), Mitgenommenes aus Etappe 4 und 4b

Leitlinie aus 4b bleibt: ein Entscheidungsspiel, wenige Unterbrechungen, keine neue Ansicht in der Seitenleiste (höchstens 7). Der Betrieb lebt als Unterseite der Projekte und als Karten in der Zentrale.

## Abnahme

1. **Live-Betrieb (Etappenplan):** Ein MMO lässt sich zehn Jahre betreiben (BTR-T02); ohne neue Inhalte steigt der Churn (BTR-T01). DLC und Patches beeinflussen die Community-Zufriedenheit (BTR-T03, BTR-R12).
2. Dazu aus der Zuordnung: Abteilung Betrieb mit vier Töpfen, Analytics, Back-Catalog, Merchandising automatisch, gezielte Personalsuche (FRM-R76).
3. Mitgenommen aus Etappe 4: Early Access (MKT-R47–R50), Serverkapazität im Release-Paket, Zufriedenheit aus dem Kopierschutz wirkt, Online-Spiele beim Kopierschutz (MKT-R34, MKT-T08), Free-to-Play auf dem Smartphone, Meilenstein „MMO zehn Jahre“, Szenario „Live-Service-Rettung“.
4. Keine neue Ansicht in der Seitenleiste; Pflicht-Entscheidungen im Betrieb übernehmen ab drei Live-Services die Produzenten (BTR-T10).
5. Technisch: `npm run check` grün, Golden-Runs bewusst neu freigegeben, Lauf 1980–2040 in höchstens 60 s (TEC-T05), Leistung je Tick unverändert im Rahmen (KRN-T10), Spielstände aus Etappe 4b laden (Migration).

## Teilschritte

Jeder Teilschritt endet spielbar, mit Tests je Regel-ID, und wird einzeln gepusht.

| # | Teilschritt | Regeln | Stand |
| --- | --- | --- | --- |
| 5.1 | Daten und Modell: `data/base/ops/operations.json` und `liveservice.json` mit den Startwerten aus S06 Abschnitt 5; `Operations` je Firma, `ops` je Produkt (Zufriedenheit, bekannte und verborgene Bugs nach Schwere, offene Anfragen), `live` für Live-Produkte; Migration der Spielstände; Betriebs-Schritt im Tick nach dem Markt | BTR Abschnitt 3, S01 Tick-Reihenfolge | erledigt |
| 5.2 | Bugs nach dem Release und Patches: Anteil bekannt beim Release, Bugfund nach BTR-F4, Schwere, Patch planen (klein, groß) mit Teamzeit, Leistung je Personenwoche, Day-One-Patch rettet höchstens 70 %, Konsolen-Patches ab 2000 mit kurzer Zertifizierung, Technik-Update als Patch-Art | BTR-R05–R10, BTR-F4, BTR-T03, T14 | erledigt |
| 5.3 | Community-Zufriedenheit: Start aus der Spielerwertung, Einflüsse (Patch, kostenloses Update, offene schwere Bugs, DLC-Flut, Kopierschutz aus Etappe 4), Rückkehr ρ, Grenzen 0–100; Wirkung auf Mundpropaganda (Verkaufskurve), Sequel-Startfans, Markenruf | BTR-R11–R14, BTR-F3, BTR-T19 | erledigt (Markenruf und Sequel-Fans mit 5.14; Lizenzverlängerung wirkt über den Engine-Support, BTR-R27) |
| 5.4 | Abteilung Betrieb und Kundenservice: Freischaltung nach A11 (vorher Engine-Team mit Tempo-Malus je Anfrage), Größe und vier Töpfe, Anfragen nach BTR-F2, Rückstand, Auslagern, Kanäle je Epoche, Engine-Support für Lizenznehmer der Spieler-Engine | BTR-R01, R02, R04, R24, R25, R27, BTR-F2, BTR-T04, T12, T18 | erledigt |
| 5.5 | Produkttypen DLC, MMO, Free-to-Play, Live-Service als Datensätze (Umsatzmodell, Lebensdauer, Teamanteil, Markenwirkung); Online-Modul als Voraussetzung | PRD-R01, PRD-R02, BTR-R23 | erledigt |
| 5.6 | Live-Produkte: Spielerbasis nach BTR-F1 mit Zugang aus Interesse, Wertung und Marketing; Churn mit Konkurrenz, Content-Pause, Technik, Zufriedenheit; Content-Drops mit Rhythmus; Abo, Kauf + Abo, F2P mit ARPU und Monetarisierungs-Härte; Einstellen | BTR-R15–R17, R20–R23, BTR-F1, BTR-T01, T02, T08, T11 | erledigt |
| 5.7 | Serverkapazität: eigen (Serverraum, Rechenzentrum), gemietet mit 4 Wochen Vorlauf, Cloud ab 2010 mit höchstens +50 % je Woche; Startkapazität im Release-Paket, Regel „Bedarf × 1,3“, Startspitze 2–4 ×, Ausfall | BTR-R18, R19, R34–R38, BTR-T07, T15–T17 | erledigt bis auf die Anzeige im Release-Paket (mit 5.15) |
| 5.8 | Analytics ab 2010 (keine, grundlegend, intensiv): Churn, ARPU, Prognose-Spanne, Personalkosten; KI-Wahrnehmung mit Analytics | BTR-R28–R30, BTR-T06, KI-R09 | erledigt |
| 5.9 | Ereignisse im Betrieb als einzelne Entscheidungen: schwerer Bug gefunden, Zufriedenheit unter 40, Server-Ausfall zum Start, Cheater-Welle, Lootbox-Debatte ab 2015, Datenleck, Content-Pause zu lang, „Eine Liga will dein Spiel“; Ketten folgen mit Etappe 6a | S06 Abschnitt 9, BTR-R26, BTR-T05, T13 | erledigt |
| 5.10 | KI im Betrieb: Patchen nach Persönlichkeit, Live-Produkte mit Content-Rhythmus nach Teamgröße, Monetarisierung nach Persönlichkeit, Einstellen nach 6 Monaten Verlust; Online-Spiele beim Kopierschutz | S06 Abschnitt 7, MKT-R34, MKT-T08 | erledigt bis auf KI-Patches (kein Bug-Modell für KI-Produkte, OFFENE-FRAGEN) |
| 5.11 | Early Access ab 2013 für PC-Spiele ab Beta: Preis 60–80 %, Interessenzerfall ×2, Zufriedenheit am Patch-Takt, Release 1.0 als zweiter Release-Abend | MKT-R47–R50 | erledigt (Bedienung mit 5.15) |
| 5.12 | Back-Catalog ab 2005 (dauerhafter Katalogabsatz V\_Katalog) und Merchandising: automatischer Monatsertrag je Marke nach Stärke und Welttiefe, einmalige Wahl Fanshop oder Lizenz, zu viel Merch schwächt schwache Marken; Soundtrack und Artbook als kleine Zusatzprodukte | S05 V\_Katalog, MKT-R41–R43 | erledigt |
| 5.13 | Gezielte Personalsuche: Bereich und Mindeststärke, Gebühr und Dauer, 1–3 Kandidaten als Fokus-Karte | FRM-R76, FRM-T32 | erledigt |
| 5.14 | Delegation im Betrieb: Produzenten steuern ab drei Live-Services die Töpfe; Regeln „Zufriedenheit unter 60 → Patch“, „Content nach Rhythmus“, „Spielerbasis unter X und Verlust → Einstellen vorschlagen“ | BTR-R03, BTR-T10, S06 Abschnitt 6 | erledigt (mit dem Rest von 5.3: Markenruf und Sequel-Fans) |
| 5.15 | Anzeigemodell und Oberfläche: Betrieb als Unterseite der Projekte (Trennbalken mit vier Töpfen, Produktkarten mit Zufriedenheit als Gesicht und Sparkline, Bug-Stapel, Postkorb), Live-Produkte mit Spielerbasis und Churn-Aufschlüsselung, Server-Füllstand, Release-Paket Punkt 9, Serverraum auf der Bühne | S06 Abschnitt 8, S11 | erledigt |
| 5.16 | Meilenstein „MMO zehn Jahre“, Szenario „Live-Service-Rettung“, Bot-Strategie mit Live-Produkt, Balancing 1980–2040 (Kasse in Monatskosten mit Geldsenken des Betriebs), Golden-Runs, Leistung, Doku | ZIE-R01, ZIE-R13, BTR-T02, TEC-T05 | erledigt bis auf Geld-Balancing (Entscheidung Projektleitung) und TEC-T05 (siehe OFFENE-FRAGEN) |

## Annahmen für Etappe 5 (kleinste plausible Lösung, im Code mit `// ANNAHME:` markiert)

1. **Keine Regionen:** BTR-R31 (Anfragen je lokalisierter Region) wartet wie MKT-R44 auf das Regionenmodell; bis dahin zählt die ganze Welt als eine Region.
2. **Ketten erst mit 6a:** Ereignisse mit „(Kette)“ in S06 Abschnitt 9 sind in Etappe 5 einzelne Entscheidungen mit sofortiger Wirkung; Folgeglieder kommen mit den Ereignisketten.
3. **Spielerwertung:** Die Spielerwertung aus MKT-R05 (Etappe 4) ist der Startwert der Zufriedenheit (× 10).
4. **Betrieb ohne neue Ansicht:** Die Seitenleiste bleibt bei höchstens 7 Ansichten (4b.6); Betrieb ist eine Unterseite von „Projekte“.

## Mitgenommen (offen, nicht Teil der Abnahme)

- Geld bis 2040 knapp halten (Abnahme 4b Punkt 6, Entscheidung Projektleitung ausstehend); die Geldsenken des Betriebs fließen in 5.16 ein.
- Reaktion der KI-Kunden auf Preis-Schocks (4b.8, Vorschlag in OFFENE-FRAGEN).
- Vertriebsanteile 60/65 % statt 40/50 % (Entscheidung Projektleitung ausstehend).
- KI-Pleiten je Jahrzehnt über dem Ziel (KI-T19).
- Spieltest 4b mit zwei Personen.

## Nicht in Etappe 5

E-Sport als Mechanik, Server-Hosting für Fremde (später); Community-Events (1.1); Publisher-Verträge, Standorte, Ereignisketten, Boom und Krise, Zukunftsepoche (Etappe 6a); Börse und Übernahmen (Etappe 6b); Regionen und Lokalisierung.
