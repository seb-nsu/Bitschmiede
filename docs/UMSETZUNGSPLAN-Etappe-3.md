# Umsetzungsplan Etappe 3 „KI und Lizenzen“

**Stand:** 30.10.2026 · **Grundlage:** Design-Dokument „Etappenplan“ (Abnahmekriterium 3 und Zuordnung Etappe 3), S14 (KI), S08 (MRK-R14–R52, R65, R66, R69), S04 (LIZ-R, LIZ-M), S07 (FRM-R01–R14, R21–R30, R55–R68), S01 (KRN-R75–R79), S12 Abschnitt 6

## Abnahme

1. **KI und Lizenzen:** Mindestens 20 KI-Studios entwickeln eigenständig Spiele. Sie lizenzieren die Engine des Spielers nach dem Nutzwert, und Lizenzeinnahmen erscheinen in den Finanzen. Ein Simulationslauf ohne Spieler bleibt 60 Jahre stabil (MRK-T07).
2. **Prüftest aus dem Design-Dokument:** „Dein Engine-Anbieter erhöht die Royalty von 5 auf 12 %“ löst eine spürbare Reaktion aus (LIZ-R32).
3. Dazu aus der Zuordnung des Etappenplans: Vertragsvorlagen, Lizenzweg mit Preis-Schocks und Anbieterwechsel, Rivalen, Plattformbeziehungen, Teams und Schlüsselpersonen, Produzenten und Regeln, Devkit-Wellen, Markt-Ansicht, Bühne mit Figuren, Büro mit Grundrissen und Ausstattung.
4. Technisch: `npm run check` grün, Golden-Runs bewusst neu freigegeben, Headless-Lauf 1980–2040 mit KI-Studios in höchstens 60 s (TEC-T05), KI höchstens 12 ms je Wochen-Tick (KI-R80).

## Teilschritte

Jeder Teilschritt endet spielbar, mit Tests je Regel-ID, und wird einzeln gepusht.

| # | Teilschritt | Regeln | Stand |
| --- | --- | --- | --- |
| 3.1 | Welt bis 2040: Plattformen, Features, Medien und Preise für 2000–2040 als Daten (fiktive Namen), damit ein Lauf über 60 Jahre Inhalt hat | MRK-R01, MRK-R11, KRN-R78 | erledigt |
| 3.2 | KI-Studios als Firmen: Weltgenerator, Teams als Größe und Stärke, Projekte über dieselben Formeln wie beim Spieler, Releases im gemeinsamen Markt (echter Median für Q_erw, Konkurrenzdichte aus angekündigten Titeln), Gründung und Pleite, Rangliste | KRN-R75–R79, MRK-R32–R37, KI-R01, KI-R58, KI-T01, MRK-T07, MRK-T19 | erledigt |
| 3.3 | KI-Entscheidungen nach S14: Nutzwert mit Antwortkurven, Auswahl mit Temperatur, Wahrnehmungsfehler, Lernen, Archetypen, Charakterzüge, Schwierigkeitsparameter, Entscheidungsprotokoll mit „Warum?“, Strategiekonferenz, Rücklage, Projektabbruch | KI-R03–R32, KI-R37, KI-R51–R59, KI-R69–R74, KI-R80–R84, MRK-R43, KI-T02, KI-T07, KI-T10, KI-T18 | erledigt |
| 3.4 | Engine-Lizenzmarkt: KI-Engine-Firmen mit Vorlagen; Spieler als Lizenznehmer (fremde Engine im Brett, Royalty, Preis-Schock mit Fokus-Karte, Wechsel); Spieler als Lizenzgeber (Lizenzmodell, Vorlagen, Anfragen der KI nach Nutzwert, Verträge, Zufriedenheit, Vertrauen, Einnahmestrang); Engine-Wahl der KI | LIZ-R01–R19, R21, R25–R29, R32, R34, R37, R38, KI-R28, KI-R29 | erledigt |
| 3.5 | Rivalen: Chef, Charakterzüge, Ziele, Beziehung und Gedächtnis, Stimmung, Chefwechsel, Schlagzeilen im Ticker, Release-Duell, Nachahmer, Gegenzüge mit Obergrenze, Bedrohung | MRK-R45–R52, KI-R13–R22, KI-R42–R50, KI-R60–R67, KI-T05, KI-T06, KI-T08, KI-T17 | erledigt |
| 3.6 | Plattformbeziehungen und Devkit-Wellen: Beziehung je Hersteller, Ankündigung, drei Wellen, Launch-Titel, Launch-Anfrage, Plattform nur mit Devkit | MRK-R14–R26, MRK-T03–T05 | erledigt |
| 3.7 | Teams und Schlüsselpersonen: Teams ab 8 Personen, Teamleistung, Einarbeitung, Lernen, Moral und Burnout, Einstellen nach Zielgröße, Schlüsselpersonen mit Rolle und Loyalität, Abwerben in beide Richtungen | FRM-R01–R14, R15, R16, R20, R68 | erledigt |
| 3.8 | Produzenten und Regeln: Delegationsstufen, Führungskapazität, Produzenten mit Vorgabe, Regel-Editor, „Nicht mehr fragen – Regel anlegen“ | FRM-R55–R62 | erledigt |
| 3.9 | Büro mit Grundrissen und Ausstattung: Bürohaus, Gebäude, Campus, weitere Etage, Hardware und Komfort, Kapazitätsräume, Veralterung, Upgrade-Angebot | FRM-R21–R30, R65, MRK-R38 | erledigt |
| 3.10 | Markenmarkt: Marken lizenzieren und kaufen (Lizenzspiel mit Startfans der fremden Marke, Qualitätsklausel), KI-Angebote und -Nachfrage, Konkursmasse bei KI-Pleiten | PRD-R74, PRD-R76, LIZ-M01 ff., MRK-R65, MRK-R66, MRK-R69 | erledigt |
| 3.11 | Oberfläche: Markt-Ansicht (Rangliste, Rivalen-Karten mit „Warum?“, Ticker, Plattformen und Beziehungen), Lizenz-Ansicht, Teams, Büro, Bühne mit Figuren | S11, S14 Abschnitt 9, S08 Abschnitt 8 | erledigt |
| 3.12 | Balancing 1980–2040 mit KI, Leistung, Golden-Runs, Doku | KI-T13, KI-T14, KI-T15, KI-T19, MRK-T07, TEC-T05 | erledigt |

## Annahmen für Etappe 3 (kleinste plausible Lösung, im Code mit `// ANNAHME:` markiert)

1. **KI-Firmen in vereinfachter Form:** Eine KI-Firma hat Konto, Teams (Größe und Stärke je Bereich statt einzelner Personen), Erfahrung, Engine oder Lizenz, Marken und Projekte. Qualität, Wertung, Verkäufe und Kosten rechnen dieselben Funktionen wie beim Spieler (KI-R01, KI-T01). Einzelne Personen, Büros und Ausstattung der KI kommen nur, wo eine Regel sie braucht (z. B. Schlüsselpersonen der Rivalen für das Abwerben).
2. **Feste Lebenszyklen:** Plattformen behalten die Jahre aus den Daten (Schalter MRK-R11 an). Der dynamische Lebenszyklus (MRK-R07–R10, R62–R64, R67) bleibt für später.
3. **Kein Markt-Zyklus:** Boom und Krise (MRK-R59, R60) kommen mit Etappe 6a; die Gründungsrate folgt der normalen Phase.
4. **Ohne Marketing:** Interesse und Hype kommen mit Etappe 4. Bis dahin ist das Release-Gewicht für die Konkurrenzdichte Umfang × Wertungserwartung.
5. **Ohne Betrieb:** Support-Anfragen (LIZ-R14) und Arbeitsplatz-Abo (LIZ-R08, ab 2005) laufen vereinfacht: Support-Erfüllung gilt als erfüllt, solange ein Engine-Team besteht.
6. **Kein Verhandlungstisch:** Großkunden verhandeln über eine Fokus-Karte mit drei Gegenangeboten statt über den Verhandlungstisch aus S11.

## Nicht in Etappe 3

Marketing, Hype, Messen und Release-Bildschirm (Etappe 4); Live-Betrieb, Analytics und Support-Abteilung (Etappe 5); Publisher-Verträge, Standorte, Ereignisketten, Boom und Krise, Zukunftsepoche (Etappe 6a); Börse und Übernahmen (Etappe 6b); dynamischer Plattform-Lebenszyklus mit Hersteller-Konto.
