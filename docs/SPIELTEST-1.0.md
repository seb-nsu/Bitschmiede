# Spieltest 1.0

**Stand:** 03.11.2026 · **Ersetzt:** `docs/SPIELTEST-Etappe-4b.md` (gilt weiter für die Fragen zum Spielgefühl) · **Dauer:** je Person etwa zweieinhalb Stunden

Zwei Personen spielen ohne Erklärung. Wer den Test leitet, schaut zu, schweigt und schreibt mit. Hilfe gibt es nur, wenn jemand länger als fünf Minuten feststeckt; das wird notiert.

## Vorbereitung

- Spiel starten: `npm run dev` und im Browser `http://localhost:5173` öffnen (oder `npm run desktop`).
- Ton an, Lautstärke mittel. Einstellungen unter ⚙ (Ton, Darstellung, Barrierefreiheit).
- Bildschirm mitschneiden, wenn möglich, sonst Bildschirmfotos bei jedem „Moment“ (Release-Abend, Preis-Gala, Insolvenz-Warnung, Jahrbuch).
- Fehler und Ideen meldet jede Person selbst über den Knopf **Feedback** oben rechts. Das Formular füllt Seed, Spielwoche, Sprache und Schwierigkeit vor.

## Ablauf je Person

| Teil | Dauer | Was | Worauf achten |
| --- | --- | --- | --- |
| A | 60 min | Neues Spiel, Einstieg „geführt“, ohne Erklärung | Erstes Spiel ohne Hilfe gestartet? Wird der Lernpfad gelesen oder weggeklickt? Wann wird das zweite Spiel geplant, und warum anders? |
| B | 30 min | Neues Spiel „klassisch“, Schwierigkeit Schwer, Start 1980 | Fühlt sich Schwer härter, aber fair an? Wann wird es knapp? |
| C | 30 min | Szenario nach Wahl (Indie-Durchbruch 2015 oder Konzern-Integration 2020) | Versteht die Person das Ziel? Zeigt das Wissensbuch den Fortschritt verständlich? |
| D | 30 min | Fragebogen und Gespräch | Fragen unten, Antworten wörtlich notieren |

Wer schneller ist, darf Teil A bis 1990 vorspulen (Taste 3 = 4×).

## Beobachtungsbogen (Testleitung)

1. Zeit bis zum ersten Projektstart: ___ min. Hilfe nötig? ja / nein, wobei: ___
2. Wie oft hält das Spiel an, ohne dass die Person etwas entscheiden wollte? Strichliste: ___
3. Release-Abend: Liest die Person die Aufschlüsselung („Warum?“) oder klickt sie weg? ___
4. Welche Ansichten werden geöffnet (Zentrale, Projekte, Firma, Markt, Engine, Finanzen, Wissensbuch)? Welche nie? ___
5. Neue Kacheln: Wird die Freischalt-Karte gelesen? „Zeig mir“ benutzt? ___
6. Engine: Wird eine eigene Engine gegründet? Wann? Taucht der Hinweis „Die Engine fällt zurück“ auf, und reagiert die Person darauf? ___
7. Geld: Wann zum ersten Mal im Minus? Wird ein Kredit oder Auftrag genommen? ___
8. Spontane Aussagen mit Zeitstempel, besonders „Excel“, „zu viele Zahlen“, „wo finde ich …“, „cool“: ___

## Fragebogen (Person)

1. Warum war dein zweites Spiel besser oder schlechter als das erste?
2. Was war der beste Moment? Was der langweiligste?
3. Woran hast du gemerkt, dass ein Spiel gut ankommt, bevor die Wertung kam?
4. Hat dich das Spiel zu oft angehalten, zu selten oder passend?
5. War Schwer zu schwer, zu leicht oder passend? Hat Geld später noch etwas bedeutet?
6. Was hast du nicht verstanden, auch nach einer Weile nicht?
7. Wenn du eine Sache ändern dürftest: welche?
8. Würdest du das Spiel auf itch.io weiterempfehlen? Was müsste dafür besser sein?
9. Schulnote 1–6 für: Verständlichkeit ___, Spannung ___, Aussehen ___, Ton ___.

## Auswertung

- Feedback-Formular (Google Forms) und Beobachtungsbogen zusammenführen; Rückmeldungen mit Datum in `docs/OFFENE-FRAGEN.md` unter „Spieltest 1.0“ eintragen.
- Spielstände (Spielstände → Exportieren) und Bildschirmfotos in den Projektordner legen; ein exportierter Spielstand lässt jeden Fehler nachstellen.

## Vor dem Test geprüft (03.11.2026)

- Durchklick-Skript: Bot-Spielstände 1990, 2005, 2015, 2020 und 2035 in Deutsch und Englisch, jede Ansicht und Unterseite, ohne Skriptfehler. Behoben: Markt-Ansicht blieb beim ersten Öffnen leer; Rohtexte im Bericht bei abgelaufenen Fristen („event.option.…“); fehlende Texte im Fahrplan der Zentrale; Monatsbalken in den Finanzen zu breit für große Beträge; Freischalt-Karten und Lernpfad behielten nach dem Laden einer anderen Partie den alten Stand.
- Spielstände früherer Versionen (Schema 37 bis 57) laden und laufen weiter (fester Test). Autosave auch beim Schließen oder Wechseln des Tabs.
- Breiten 1024 und 820 (Tablet hochkant) ohne waagrechtes Scrollen.
- Balancing mit Bots (`docs/OFFENE-FRAGEN.md`, Abschnitt „Abschluss 1.0“): Normal ohne Pleiten in 9 von 10 Läufen, Schwer etwa 3 bis 4 von 10, Hardcore fast immer.

## Bekannt vor dem Test

- Bots investieren anders als Menschen; das Balancing nach 2000 ist mit echten Spielern noch nicht geprüft.
- Lernpfad und Freischalt-Karten merken sich „schon gesehen“ im Browser, nicht im Spielstand. Auf einem anderen Rechner gilt beim Laden alles bereits Offene als gesehen.
