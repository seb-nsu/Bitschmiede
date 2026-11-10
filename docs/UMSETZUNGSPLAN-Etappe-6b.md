# Umsetzungsplan Etappe 6b „Ausbau II“

**Stand:** 02.11.2026 · **Grundlage:** Design-Dokument „Etappenplan“ (Zuordnung 6b, „In 1.0 vereinfacht“), S07 (FRM-R51 bis FRM-R54, FRM-R73 bis FRM-R75, Formel 5.7), S09 (UEB-R01 bis UEB-R42, Formeln 5), S00 A02, A29, A35, Auftrag Projektleitung vom 02.11.2026 („mache dann auch gleich mit Phase 6 weiter“)

Leitlinie: Börse und Übernahmen sind Spätspiel-Systeme für große Firmen (ab 2005 und 150 Personen, A02). Die Börse hat genau einen gesteuerten Wert (Anlegerstimmung), Übernahmen kennen nur den Komplettkauf. Beides bleibt ein Entscheidungsspiel mit wenigen Karten.

## Abnahme

1. **Ausbau (Etappenplan, Teil 6b):** Übernahmen funktionieren: Sondieren mit versetzter Wertspanne, Prüfung, Gebot mit Gegenangebot oder Sperre, Kauf, Integration, Tochter mit Konto und Vorgaben, Schließen. Keine Bot-Strategie gewinnt immer (A17).
2. Börsengang ab 2005 mit den Bedingungen aus FRM-R51; Anlegerstimmung je Quartal nach Formel 5.7 mit Dividende, Kapitalerhöhung und Hauptversammlung.
3. KI-Konzerne kaufen nach denselben Regeln und können sich übernehmen (UEB-R36, UEB-R39).
4. Technisch: `npm run check` grün, Golden-Runs bewusst neu freigegeben, Spielstände aus Etappe 6a laden (Migration), Lauf 1980–2040 in höchstens 60 s (TEC-T05).

## Teilschritte

| # | Teilschritt | Regeln | Stand |
| --- | --- | --- | --- |
| 6b.1 | Firmenwert W einer KI-Firma und der eigenen Firma (Ertrag, Marken, Technik, Team, Schulden, Befunde) mit Aufschlüsselung; Daten `data/base/core/acquisitions.json` | S09 Formel 5, UEB-R42, A37 | erledigt (ohne Forschungswert und Plattformwert, siehe OFFENE-FRAGEN) |
| 6b.2 | Börse: Börsengang mit Bedingungen, Anteil und Erlös; Anlegerstimmung je Quartal (Zielmarke, Ereignisse, Dividende, Rückkehr zur Mitte); Kurs als Anzeige; Dividende, Kapitalerhöhung, Hauptversammlung | FRM-R51 bis FRM-R54, FRM-R74, FRM-R75, Formel 5.7 | erledigt |
| 6b.3 | Übernahme-Ablauf: Freischaltung, Sondieren mit Versatz, Prüfung mit Befunden, Gebot, Gegenangebot, Sperre, weitere Bieter, Finanzierung aus Bargeld und Kredit, Warnung | UEB-R01 bis UEB-R12 | erledigt |
| 6b.4 | Tochter: Übergang von Marken, Engine und Verträgen, Integration mit Kapazität und Überlast, Kultur-Fit, Abwanderung und Halteprämie, Synergien, Tochterkonto mit Abführung, Vorgaben, Abschreibung, Schließen | UEB-R15 bis UEB-R29, UEB-R34, UEB-R35, UEB-R40, UEB-R41, FRM-R73 | erledigt (ohne Engine-Einarbeitung UEB-R40, siehe OFFENE-FRAGEN) |
| 6b.5 | KI-Übernahmen: Käufer je Quartal, Bieterkampf mit dem Spieler, Überdehnung, Schlagzeilen | UEB-R36, UEB-R37, UEB-R39, S09 Abschnitt 7 | erledigt |
| 6b.6 | Oberfläche (Börse und Konzern in der Firma, Zielfirma in der Rangliste), Meilensteine Börsengang, erste Übernahme, Integration, Bots, Balancing, Golden-Runs, Doku | S09 Abschnitt 8, ZIE-R02 | erledigt (Zielfirma über die Liste im Konzern-Bereich statt in der Rangliste; Schwelle 150 Personen siehe OFFENE-FRAGEN) |

## Annahmen (kleinste plausible Lösung, im Code mit `// ANNAHME:` markiert)

1. **Ziele:** Kaufbar sind KI-Studios (auch Engine-Firmen). Plattformhersteller und Publisher sind in den Daten keine Firmen mit Konto und Teams; UEB-R31 bis UEB-R33 bleiben offen, bis Hersteller Firmen werden (OFFENE-FRAGEN).
2. **Tochter bleibt KI-Studio:** Eine gekaufte Firma bleibt als KI-Studio mit eigenem Konto in der Welt und gehört dem Spieler. Ihre Marken, Engine und Verträge gehen damit in den Konzern über, ohne die Datensätze umzuschreiben; Gebühren des Spielers an die eigene Tochter entfallen (UEB-R35).
3. **Personen:** KI-Studios haben keine einzelnen Personen. Wechselneigung und Halteprämie wirken auf die Teams der Tochter: Je Quartal verliert sie mit Wahrscheinlichkeit q ein Team-Mitglied je Team.
4. **Kultur:** Die Studiokultur (FRM-R71) wird für den Kultur-Fit in der kleinsten Form bestimmt: Merkmale aus Größe, Crunch-Wochen und Engine-Schwerpunkt; die übrigen Wirkungen der Kultur folgen mit dem Arbeitgeber-Ruf.

## Nicht in 6b

Weitere Beteiligungsformen, Aktien als Kaufpreis, Earn-outs, Behörde, feindliche Übernahmen, Aktivisten (S13); eigenes Publishing, Co-Entwicklung (1.3); eigene Konsole (2.0).
