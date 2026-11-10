# Umsetzungsplan Etappe 6c „Entwicklung ausbauen“

**Stand:** 03.11.2026 · **Etappe gebaut** · **Grundlage:** Auftrag Projektleitung vom 03.11.2026 (Spieltest: mehr Entwicklungstiefe, Fachteams, Auftragsspiele, größere Projekte, Übersicht bei großen Teams; Punkte 1–5 aus dem Vorschlag „Entwicklungstiefe“ übernehmen, „setze dann 6c um“), S02 (PRD-R10, PRD-R18, PRD-R20, PRD-R22, PRD-R27, PRD-R28, Formel 5.1), S07 (FRM-R01 bis FRM-R05, FRM-R48, FRM-R49), S05 (MKT-R10, Interesse und Absatz je Zielgruppe), Design-Dokument „Kosten und Outsourcing“

Leitlinie: Entscheidungen statt Regler (Design-Grundsatz 3). Jede neue Wahl hat eine sichtbare Abwägung und erscheint in der Wertungs-Vorschau oder der Aufschlüsselung. Neue Wahlen kommen mit den Epochen und der Firmengröße, damit der Start einfach bleibt.

## Abnahme

1. Große und AAA-Projekte lassen sich planen, entwickeln und veröffentlichen; ein Studio mit 100+ Personen kann damit rentabel sein.
2. Bei 50+ Personen lassen sich Personen gefiltert und mehrfach ausgewählt frei zu Teams zuordnen; Teams haben einen Schwerpunkt, ein QA-Team senkt Bugs.
3. Auftragsspiele erscheinen auf einem Marktplatz mit Vorgaben und Mindestwertung; Erfüllen zahlt, Verfehlen kostet.
4. Zielgruppe, Design-Säulen, Phasen-Schwerpunkt, Politur je Bereich und Lokalisierung wirken nachvollziehbar und stehen in Vorschau oder Aufschlüsselung.
5. Technisch: `npm run check` grün, Golden-Runs bewusst neu freigegeben, Spielstände aus 6b laden (Migration), Lauf 1980–2040 in höchstens 60 s, keine Bot-Strategie über 60 % Siege (A17).

## Teilschritte

| # | Teilschritt | Regeln | Stand |
| --- | --- | --- | --- |
| 6c.1 | Umfänge groß (ab 1990) und AAA (ab 1998): Aufwand × 2,5 / × 5, acht Phasen mit Vertical-Slice-Gate, Freeze bei Alpha, Erwartung der Presse, Nachfrage, Plätze, Bugs; Projekte im Brett, KI-Studios nach Größe | PRD-R20, PRD-R22, PRD-R27, PRD-R28, PRD-R51, Formel 5.1 | gebaut |
| 6c.2 | Team-Ansicht: Filter, Mehrfachauswahl, Team aus Auswahl, Schwerpunkt je Team (Bonus im Bereich), QA-Team (Fundrate für alle Projekte), Team als Ganzes einem Projekt zuordnen | FRM-R01 bis FRM-R05, PRD-R29 | gebaut |
| 6c.3 | Auftragsspiele: Marktplatz mit 2–4 Angeboten, Vorgaben (Plattform, Genre, Thema, Umfang, Zielgruppe), Mindestwertung, Frist, Vorschuss, Bonus und Strafe; Marke bleibt beim Auftraggeber | FRM-R48, FRM-R49 erweitert | gebaut (Zielgruppe als Vorgabe folgt mit 6c.4) |
| 6c.4 | Zielgruppe (Kinder, Gelegenheit, Kern, Enthusiasten): Marktgröße, Preis, Erwartung, Treue (Verkaufskurve), Altersfreigabe | PRD-R10, PRD-R18, MKT-R10 | gebaut (Preis bleibt Wahl des Spielers, Konkurrenzdichte über alle Releases) |
| 6c.5 | Design-Säulen: zwei aus Innovation, Zugänglichkeit, Spieltiefe, Präsentation, Umfang; Karten mit passenden Tags zählen mehr, die Presse gewichtet die Säulen | PRD-R50 erweitert | gebaut |
| 6c.6 | Phasen-Schwerpunkt: je Phase eine Wahl (Pre-Production, Produktion, Beta) mit Zeit gegen Qualität oder Bugs | PRD-R20 erweitert | gebaut |
| 6c.7 | Politur je Bereich: zusätzliche Wochen für einen Bereich vor Gold, Qualitätsbonus mit abnehmendem Ertrag | PRD-R50 erweitert | gebaut |
| 6c.8 | Lokalisierung: Sprachen je Region, Kosten nach Textmenge, Absatz je Region | MKT-Absatz, FRM-R32 | gebaut (Sprachmärkte statt Regionen, siehe OFFENE-FRAGEN) |
| 6c.10 | Freies Startjahr (Auftrag Projektleitung 03.11.2026): jedes Jahr 1980–2030 wählbar, Stützjahre 1980/1990/2000/2010/2020 als Schnellwahl; zuerst Profil Garage, danach kleines und etabliertes Studio | KRN-R43, KRN-R70 bis KRN-R81 | gebaut (Profil Garage) |
| 6c.11 | Einstieg und Lernpfad (Auftrag Projektleitung 03.11.2026, `docs/design/Konzept-Einstieg.md`): Einstiegsart, Lernpfad mit 12 Kapiteln, Freischalt-Karten, Handbuch, Erste-Male-Hinweise; reine Anzeige | KRN-R40 bis KRN-R43 | gebaut (E1 bis E5; E6 Spieltest offen) |
| 6c.9 | Bots, Balancing, Golden-Runs, Doku, ROADMAP | A17, TEC-T05 | gebaut (Bots wählen Säulen, Bugjagd, Politur und Sprachen; Lauf 1980–2000 mit 20 Seeds: Siege wachstum 50 %, konzern 30 %, mmo 15 %, gierig 5 %) |

## Annahmen (kleinste plausible Lösung, im Code mit `// ANNAHME:` markiert)

1. **Phasen groß/AAA:** Konzept, Pre-Production, Vertical Slice, Produktion, Alpha, Beta; Gold und Launch wie bisher als Abschluss. Das Gate liegt am Ende des Vertical Slice (PRD-R22), der Freeze zu Beginn der Alpha (PRD-R27).
2. **Freischaltung:** groß ab 1990 (Erwartung der Presse startet dort mit 400 Q-Punkten nach PRD-R51 skaliert), AAA ab 1998 (900); Plätze für Karten 7 bzw. 9.
3. **Fachteams:** Ein Team mit Schwerpunkt arbeitet im Schwerpunkt-Bereich mit +10 % Leistung und außerhalb mit −10 %; ein QA-Team arbeitet an keinem Projekt, erhöht aber die Fundrate aller laufenden Projekte nach Größe.
4. **Auftragsspiele** sind Projekte des Spielers mit festen Vorgaben; Marke und IP gehören dem Auftraggeber, Verkäufe gehen an ihn. Bezahlung = Vorschuss bei Annahme + Rest bei Abgabe, Bonus ab Mindestwertung + 1, Strafe bei Verfehlen.
5. **Neue Wahlen wirken über Faktoren, die schon im Wasserfall stehen** (Kartenwert, Profil, Bugs, Absatz), plus einem neuen Faktor „Säulen“; Werte in `data/base`.
