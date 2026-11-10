# Umsetzungsplan Etappe 4b „Spielgefühl“

**Stand:** 02.11.2026 · **Grundlage:** Spieltest nach Etappe 4 („Grundmechaniken gut, aber unklar und zu sehr Excel“), Klarheits-Runde vom 30.10.2026, Dokument „Vergleich GST-Mod und Eigenentwicklung“ vom 02.11.2026 (Auftrag Projektleitung: Punkte ins nächste Arbeitspaket), Prüfungs-Dokument „Vergleich Mod und Eigenentwicklung: Sicht der Prüfung“ vom 02.11.2026 mit vier Punkten „was der Mod der Eigenentwicklung beibringen kann“, S11 (UI-R70 ff. Bühne, UI-R80 ff. Audio), Design-Dokument „Etappenplan“

Eingeschoben zwischen Etappe 4 und 5. Ziel: Das Spiel soll sich wie ein Spiel anfühlen, bevor neue Systeme dazukommen.

**Leitlinie:** Die Eigenentwicklung ist ein Entscheidungsspiel, kein Aufbauspiel in Echtzeit wie Mad Games Tycoon 2, und ahmt es nicht nach. Spielgefühl entsteht hier durch Momente, Tempo und Rhythmus, nicht durch Raumbau oder ein Büro von oben. Die Bühne bleibt ein Bild des Studios, keine Bau-Ebene. Keine neuen Simulationsregeln außer Daten-Nachschub; die Simulation bleibt deterministisch, alle Effekte sind reine Anzeige.

## Abnahme

1. **Spieltest mit zwei Personen über 1980 bis 2020** (je mindestens eine Stunde ohne Erklärung, dazu ein langer Lauf oder ein späteres Szenario, damit das Spätspiel einmal gespielt wird): Beide können sagen, warum ihr zweites Spiel besser war als das erste, und keiner nennt „Excel“ oder „zu viele Unterbrechungen“ als Hauptkritik.
2. Jeder Release, jede Preisverleihung und jede Insolvenz-Warnung ist ein Moment mit eigener Szene, nicht nur eine Berichtszeile.
3. Genres, Themen, Plattformtypen und Feature-Bereiche haben ein Symbol; die Bühne zeigt, woran das Studio arbeitet.
4. Ein Ort statt vieler: Die Seitenleiste hat höchstens 7 Ansichten (heute bis zu 10); keine neue Ansicht vor Etappe 5.
5. Prüftest Lizenzmodell (Design-Dokument): „Dein Engine-Anbieter erhöht die Royalty von 5 auf 12 %“ löst in der Eigenentwicklung eine spürbare Reaktion aus; das Ergebnis liegt neben dem gleichen Test im GST-Mod (Mod als Messinstrument).
6. Geld bleibt knapp: Im Bot-Lauf 1980–2040 liegt die Kasse der Strategie „vernünftig“ in jedem Jahrzehnt bei höchstens 24 Monatskosten im Median, und ein Flop kostet auch nach 2020 spürbar.
7. Technisch: `npm run check` grün, Golden-Runs nur bei Daten-Nachschub bewusst neu freigegeben, Balancing 1980–2000 nach dem Inhaltsausbau neu geprüft, Leistung unverändert (`npm run bench`).

## Teilschritte

| # | Teilschritt | Regeln | Stand |
| --- | --- | --- | --- |
| 4b.1 | Sichtbarer Fortschritt jede Woche: Projektkarte füllt sich Woche für Woche mit Zuwachs („+3 %“), Phasenwechsel als kleiner Moment, Mitarbeiter sichtbar am Projekt (Köpfe auf der Karte und am Tisch der Bühne) | PRD-R20 ff., UI-R70 | erledigt |
| 4b.2 | Bühne mit Leben: Figuren gehen zwischen Tisch, Kaffee und Tür; Monitore zeigen den Projektstand (Fortschritt, Bug-Zahl); Jubel und Konfetti bei Hits, Pizza und Dunkelheit beim Crunch, müde Figuren; Tisch je Projekt mit Genre-Symbol; Klick auf einen Tisch öffnet das Projekt | UI-R70–R75, S11 8.3 | erledigt |
| 4b.3 | Momente als Szene statt Zeile, erst der Moment, dann auf Wunsch die Aufschlüsselung: Release-Abend mit Spannung und Ton (Wertungen der Magazine nacheinander, dann Gesamtwertung; Wasserfall hinter „Warum?“); Branchenpreis-Gala auf der Messe (Nominierte, Umschlag, Gewinner); Insolvenz-Warnung als Szene mit Monaten bis zum Ende und den drei wirksamsten Gegenmitteln | MKT-R39, ZIE-R03–R05, FRM-R40, UI-R30 ff. | erledigt |
| 4b.4 | Bilder und Symbole für Genres, Themen, Plattformtypen und Feature-Bereiche (eigene SVG-Symbole, keine echten Marken), im Konzeptbrett, auf Projektkarten, im Markt und in der Zeitleiste | UI-R60 (Form statt nur Farbe) | erledigt |
| 4b.5 | Platzhalter-Musik je Epoche (WebAudio, als Daten in `data/audio`), mehr Ereignistöne (Messe, Preis, Bug-Fund, Crunch), Lautstärke getrennt einstellbar | UI-R80–R83 | erledigt |
| 4b.6 | Ein Ort statt vieler Fenster: Ansichten zusammenlegen (z. B. Lizenzen in Engine, Markenmarkt in Marken, Zeitleiste in Markt, Ziele ins Wissensbuch), höchstens 7 in der Seitenleiste; Zentrale und Fokus-Spalte als Mittelpunkt | UI-R01 ff., UI-R100 | erledigt |
| 4b.7 | Geld, das bis 2040 etwas bedeutet: Bot-Lauf 1980–2040 mit Kennzahl „Kasse in Monatskosten“ je Jahrzehnt im Bericht `reports/simulate.md`; bei Bedarf Kosten und Preise je Epoche im Datenblatt nachstellen | Datenblatt, TEC-R80 ff. | offen |
| 4b.8 | Prüftest Lizenzmodell: Royalty 5 → 12 % als wiederholbarer Bot-Lauf (Spieler auf Lizenz-Engine, Reaktion von Spieler-Bot und KI-Kunden: Wechsel, Nachverhandeln, eigene Engine), Ergebnis in `reports/`; Vergleich mit demselben Test im GST-Mod (Messung im Mod-Thread) | LIZ-R, Design-Dokument „Prüftest ab Etappe 3“ | erledigt |
| 4b.9 | Inhaltsbreite über Daten: Themen 35 → etwa 60, Genres 12 → etwa 15 mit Untergenres; je neues Genre Erwartungsprofil und Passung zu allen Themen; keine neuen Regeln; danach Balancing 1980–2000 | PRD-R10, Datenblatt | erledigt |
| 4b.10 | Starker Start: Das erste Projekt ist mit einer Kombination vorbelegt, die im Startjahr im Trend liegt und gut passt (heute ist Action vorgewählt, obwohl „aus der Mode“); gilt auch für Szenarien mit spätem Start | KRN-R70 ff., PRD-R10 | erledigt |
| 4b.11 | Spieltest mit zwei Personen über 1980–2020, Rückmeldungen auswerten, kleine Korrekturen | Abnahme | vorbereitet (`docs/SPIELTEST-Etappe-4b.md`), Test mit Personen offen |

## Annahmen (im Code mit `// ANNAHME:` markiert)

1. **Grafik bleibt Platzhalter mit Charme:** SVG und CSS, keine Grafikdateien von außen. Endgültige Grafik und Musik bleiben bei 1.0 (Etappenplan).
2. **Momente pausieren:** Release, Preis und Insolvenz-Warnung sind Haltepunkte wie das Jahrbuch; alle anderen Meldungen laufen nebenher (Klarheits-Runde, Abweichung von UI-R66 in OFFENE-FRAGEN).
3. **Bewegung nur in der Anzeige:** Wege der Figuren entstehen im UI aus dem Anzeigemodell und einem festen Muster je Person; sie wirken nicht auf die Simulation. Bei „Bewegung reduzieren“ steht alles still.

## Mitgenommen aus Etappe 4 (offen, nicht Teil der Abnahme)

- Vertriebsanteile 60/65 % statt 40/50 % laut Spezifikation (Entscheidung Projektleitung ausstehend).
- KI-Pleiten 25–39 % je Jahrzehnt statt 5–20 % (KI-T19).

## Nicht in Etappe 4b

Neue Systeme (Live-Betrieb, Early Access, gezielte Personalsuche FRM-R76 → Etappe 5), Büro-Ansicht von oben (1.4), endgültige Grafik und Musik (1.0).
