# Umsetzungsplan Etappe 1 „Kern“

**Stand:** 29.10.2026 · **Grundlage:** Design-Dokument „Etappenplan“, S12 Abschnitt 6, Regel-Digest aller Specs (S01, S02, S05, S07, S08, S10, S11, S12, Datenblatt)

**Hinweis zum Gate:** Laut Design-Dokument beginnt Etappe 1 erst, wenn drei von fünf Testspielern den Prototyp bestehen. Der Auftraggeber hat am 29.10.2026 entschieden, ohne diesen Test weiterzumachen. Der Test sollte nachgeholt werden, sobald Teilschritt 1.7 steht.

## Abnahme

1. Ein Spieler kann **1980 bis 2000** durchspielen, Spiele aus Genre, Thema und Umfang entwickeln, **auf einer Plattform veröffentlichen** und **pleitegehen**. Jede Wertung lässt sich aufschlüsseln.
2. Ein Tester spielt **zwei Stunden ohne Erklärung** und kann sagen, warum sein zweites Spiel besser war.
3. Technisch: `npm run check` grün, Determinismus über 20 Spieljahre, Spielstände laden und migrieren, Headless-Lauf 1980–2000 mit Bericht.

## Teilschritte

Jeder Teilschritt endet spielbar und mit Tests je Regel-ID.

| # | Teilschritt | Regeln | Stand |
| --- | --- | --- | --- |
| 1.1 | Speichern, Laden, Autosave, Export/Import, Migration | TEC-R40–R45, KRN-R50–R54 | erledigt; Autosave alle 13 Wochen und Ironman nachgezogen (KRN-R52, KRN-R54) |
| 1.2 | Pausieren, Fortsetzen, Abbrechen, Archiv; Alterung von Features | PRD-R40–R44, PRD-R16 | erledigt; Umsteuern (PRD-R41) nachgezogen; dazu UI-R66 korrigiert: offene Entscheidungen halten die Zeit an |
| 1.3 | Neues Spiel mit Schwierigkeit und Einstellungen; Finanzen: Gehälter je Epoche, Miete, Kredite, Insolvenzzähler, Startpolster, Insolvenz-Ende; Finanzen-Ansicht | KRN-R70/R71, ZIE-R16–R20, R42–R52, FRM-R37–R41, PRD-R52 | erledigt; Steuern quartalsweise mit Verlustvortrag (A46) und Insolvenzwarnung als Krisen-Ereignis nachgezogen |
| 1.4a | Büro: Garage und Etage ab 1985 (Entscheidung 1) | FRM-R21–R25 | erledigt |
| 1.4 | Plattformen 1980–2000 aus dem Gerüst; Verkäufe über die Zeit statt Einmalbetrag; physische Auflage und Lager; Zertifizierung für Konsolen | S08 (minimal), S05 MKT-F3, Abschnitt 13, PRD-R26 | erledigt (Rückläufer, Piraterie und Vertriebswege offen) |
| 1.5 | Inhalte 1980–2000: Feature-Katalog mit Nachfolgern, neue Karten je Epoche; Produkttypen als Datensätze (Standardspiel, Port, Addon); Gate mittel | PRD-R01–R03, R16, R20–R22 | erledigt (groß/AAA mit Teams in Etappe 3; Umsteuern offen) |
| 1.6 | Ereigniskatalog aus Daten mit Bedingungssprache, Klassen, Cooldown; Freischaltungen; Jahrbuch; Entscheidungsdichte unter 60 % | KRN-R30–R41, KRN-R62, S01 5.2/5.4 | erledigt; Ereignisplaner (S01 5.2) und 7 weitere Ereignisse in 1.8 |
| 1.7 | Oberfläche: Rahmen mit linker Leiste und Fokus-Spalte, Zentrale mit Kacheln und statischer Bühne, Projekte, Finanzen, Zeitleiste, Wissensbuch; Release-Abend; Platzhalter-Töne | S11 4.1 ff., UI-T01 | erledigt (Bühne statisch, Töne als Platzhalter) |
| 1.8 | Balancing 1980–2000 mit Bot-Strategien, Golden-Runs, Leistungsmessung | TEC-R50, TEC-R60, TEC-T05 | erledigt (siehe unten) |
| 1.9 | Abnahme: Zwei-Stunden-Test, Testspieler | Design „Etappenplan“ | offen |

## Ergebnis 1.8 (29.10.2026, `reports/simulate.md`)

- **Bot-Strategien** (`tools/bots.ts`): vernünftig, wachstum, gierig, auftraege, durchschnitt, zufall. Sie spielen nur über Eingaben und haben einen eigenen Zufallsstrom. Nur Sequels, nur Lizenzen, eigene Engine und MMO folgen mit ihren Systemen.
- **Headless-Lauf** 1980–2000: 40 Seeds je Strategie und 20 je Preset, 400 Läufe in etwa 58 s mit 4 Threads. Der Tick ist dreimal schneller, seit der Spielstand ohne structuredClone kopiert wird (0,9 ms je Woche im Jahr 2000).
- **Wertung** bleibt über 20 Jahre stabil (vernünftig 7,0 → 7,8, durchschnitt 5,5–5,8): Q_erw folgt ohne fremde Releases einer Marktreferenz aus Katalog und Branchenstärke.
- **Geld**: vernünftig im Median 1,7 Mio. USD 1985, 3,9 Mio. 1990, 8,7 Mio. 1999. Gedämpft durch die Konkurrenzdichte nach MKT-F2 als Ankerwerte und den Plattform-Abstand nach PRD-R60. Ende der 1980er etwa doppelt über dem Korridor des Design-Dokuments (bis 2 Mio.), siehe `OFFENE-FRAGEN.md`.
- **Sieger je Seed**: vernünftig 55 %, wachstum 38 %, auftraege 8 % (keine Strategie über 60 %, A17).
- **Entscheidungen** in den 1980ern: 49–53 % Wochen ohne neue Entscheidung (kein Seed über 60 %, KRN-T12), 25–28 Angebote und 8–10 Pflicht-Entscheidungen pro Jahr (KRN-T11).
- **Schwierigkeit** (ZIE-R20): Median-Umsatz fällt streng von Entspannt bis Hardcore; die Insolvenzquote steigt, aber nicht streng (0 % auf Entspannt und Leicht, 100 % auf Hardcore). Siehe `OFFENE-FRAGEN.md`.
- **Golden-Runs** (`tests/golden`, 5 Verläufe mit Prüfsummen je Jahrzehnt), **Determinismus** über 20 Jahre mit Bot und **Leistungsmessung** (`npm run bench`, Vergleich mit lokaler Basis, ±15 %) gehören zu `npm run check` bzw. stehen als Befehl bereit. Ein CI-Lauf ist noch nicht eingerichtet (TEC-R60 bleibt bis dahin Handarbeit).

## Entscheidungen, die vor 1.4 und 1.5 nötig sind (alle sechs Vorschläge am 29.10.2026 angenommen)

Die Specs lassen hier Lücken oder widersprechen sich. Vorschläge in Klammern.

1. **Garage und Personenzahl:** Die Garage hat 4 Arbeitsplätze, mehr als 20 % Überbelegung ist verboten (FRM-R23). Damit passen höchstens 4 Personen hinein, Prototyp 0b erlaubt 7. Büro und Umzug stehen erst in Etappe 3. (Vorschlag: In Etappe 1 einen einfachen Umzug Garage → Etage ab 1985 vorziehen, ohne Ausstattung; bis dahin höchstens 4 Personen.)
2. **Marktgröße in Käufern:** Das Datenblatt nennt den Markt nur in Mrd. USD, die Plattformen nur mit Gesamtverkäufen. Für Startverkäufe und Basis fehlt die Zahl der Käufer. (Vorschlag: Käufer = Marktumsatz ÷ Vollpreis × Faktor, Basis aus dem typischen Erfolg der Plattform-Familie, beides in Daten und per Headless-Lauf abgeglichen.)
3. **Marketing-Regler 1980:** „Die erste Stunde“ sieht einen Marketing-Regler beim zweiten Spiel vor, Marketing ist aber Etappe 4. (Vorschlag: In Etappe 1 kein Marketing; Startverkäufe nur aus Wertung, Plattform und Trend.)
4. **Leistungsbudget je Plattform** (PRD-R11, R15): steht im Etappenplan in Etappe 2. (Vorschlag: in Etappe 2 lassen.)
5. **Inhalt 1980–2000 ohne Engines:** Engines kommen erst in Etappe 2; ohne sie wächst die Qualität nur über neue Feature-Karten. (Vorschlag: Feature-Katalog mit Nachfolgern je Epoche als Stellgröße; Q_erw kalibriert sich daran.)
6. **Insolvenz-Ende:** Der Abschluss-Bildschirm kommt laut Plan erst in Etappe 4. (Vorschlag: In Etappe 1 ein schlichter Insolvenz-Bildschirm mit Chronik und „Neues Spiel“.)

Kleinere Lücken (Insolvenzzähler fortlaufend oder kumuliert, Kreditlaufzeit, Steuertermin, Mietinterpolation, Autosave-Slots 1–10 oder 1–20) entscheidet die Umsetzung mit der kleinsten plausiblen Annahme und trägt sie in `docs/OFFENE-FRAGEN.md` ein.

## Nicht in Etappe 1

KI-Studios und Rivalen, Engines und Module, Marken, Teams ab 8 Personen und Schlüsselpersonen, Marketing und Interesse, Release-Bildschirm mit Preis und Kopierschutz, Devkits, Plattformbeziehungen, Publisher, Börse, Übernahmen.
