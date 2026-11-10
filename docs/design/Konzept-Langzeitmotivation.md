# Konzept: Langzeitmotivation

**Stand:** 03.11.2026 · **Anlass:** Prüfung durch Fable (`Pruefung-Fable-Spiel-1.0.md`, Abschnitte 1, 2 und 6), Wunsch Projektleitung: „Hauptproblem ist die Langzeitmotivation.“

## Befund

Ab etwa 1990 trägt das Spiel nicht mehr, aus vier Gründen:

1. **Kein Druck.** Geld häuft sich (Bot „vernünftig“ 2030: 1 Mrd. USD bei 45 Personen), Niederlagen gibt es kaum noch.
2. **Kein Rhythmus.** Das Jahr des Spielers hat einen Rückblick (Jahrbuch), aber keinen Ausblick und kein Ziel. Die Strategiekonferenz aus dem Design fehlt.
3. **Kein Gegner.** Rivalen sind Zeilen in einer Liste; niemand reagiert spürbar auf den Spieler.
4. **Nichts Neues.** Nach der letzten Freischaltung (um 1995) ändert sich das Spiel nicht mehr, nur die Zahlen werden größer.

Mehr Systeme lösen das nicht. Die Lösung setzt deshalb fast ganz auf vorhandene Bausteine (Ereignisse, Ziele, KI-Studios, Übernahmen, Zukunftsepoche, Ruhmeshalle) und gibt ihnen einen Takt.

## Vorschlag: drei Takte

### Takt 1 · Jahr: Strategiekonferenz mit Jahreszielen

Einmal im Jahr (Woche 2) liegt eine Karte mit **drei Jahreszielen** zur Wahl, gezogen aus dem Zustand des Studios. Der Spieler nimmt eines an.

- Beispiele: „Ein Spiel mit mindestens 8,0 in {Genre im Trend}“, „Zwei Releases auf {neuer Plattform}“, „Engine-Modul {X} auf Stand der Technik“, „Platz {n−1} in der Rangliste“, „Umsatz +20 % gegen das Vorjahr“, „Keine Kündigung wegen Burnout“.
- Belohnung je nach Schwierigkeit: Ruf, Fans einer Marke, Anlegerstimmung, ein besonders guter Bewerber oder ein Branchenpreis-Bonus. Nie Geld, denn Geld ist nicht knapp.
- Ein verfehltes Ziel kostet nichts außer einer Schlagzeile. Drei erfüllte Ziele in Folge ergeben eine **Serie** in der Ruhmeshalle.
- Das ist die Strategiekonferenz aus dem Design-Dokument, in der Form „Ziel statt Bonus“.

### Takt 2 · Jahrzehnt: Epochen mit eigener Frage

Jedes Jahrzehnt hat eine **Epochen-Frage**, die im Jahrbuch angekündigt und am Ende ausgewertet wird. Grundlage sind vorhandene Daten (Plattformen, Zukunftsepoche, Marktphasen):

| Epoche | Frage | Was sie umwirft |
| --- | --- | --- |
| 1980er | Überlebst du die Garage? | – |
| 1990er | Schaffst du den Sprung auf 3D? | Wechsel auf 3D-Plattformen, Engine-Module veralten schneller |
| 2000er | Online oder Laden? | Digitaler Vertrieb, Live-Service, Abwanderung des Handels |
| 2010er | Mobil und Gratis? | F2P, kleine Teams gegen Konzerne |
| 2020er | Wem gehört die Branche? | Konzerne kaufen, feindliche Übernahmen (1.4) |
| 2030er | Zukunftswette | Wendepunkte der Zukunftsepoche |

Am Ende des Jahrzehnts vergibt das Jahrbuch einen **Epochentitel** (z. B. „Pionier der 3D-Zeit“) nach den Zahlen des Jahrzehnts. Die Titel sammeln sich in der Ruhmeshalle und fließen in die Vermächtnis-Wertung.

### Takt 3 · Gegner: ein Erzrivale

Ab dem ersten Hit wählt das Spiel das KI-Studio, das dem Spieler in Genre und Größe am nächsten ist, zum **Erzrivalen**. Fällt er zurück, übernimmt der nächste.

- Er reagiert sichtbar: Release-Duelle im selben Monat (gibt es als Ereignis), Abwerben von Schlüsselpersonen (gibt es), Kampfpreise, und ab Börsengang ein feindliches Übernahmeangebot (1.4, AUS-R83).
- Eine eigene Zeile in der Zentrale: „{Rivale}: nächstes Spiel {Genre}, {Monat}; Bilanz gegen dich 3:2“.
- Duelle zählen in eine Rivalen-Bilanz, die im Jahrbuch steht.

## Dazu: Geld wieder knapp machen

Ohne Druck tragen auch Ziele nicht. Laut Fable ohne neue Systeme, nur mit Daten:

- Kassendruck-Abgabe weg (sie erklärt sich nicht).
- Löhne ab 1995 steiler als der Umsatz, AAA-Aufwand ×5 spürbar teurer.
- KI-Studios 1980 größer (6 bis 12 Personen), damit die 80er nicht nebenbei gewonnen werden.
- Ausgaben mit Sinn: Publishing (1.3) und Übernahmen sind die Stellen, an denen Geld zu Einfluss wird.

## Umfang und Reihenfolge

| Baustein | Neu oder vorhanden | Aufwand |
| --- | --- | --- |
| Strategiekonferenz mit drei Jahreszielen | neu (Ereignis, Zieltypen aus Daten) | 2–3 Tage |
| Epochen-Fragen und Epochentitel | neu (Daten, Jahrbuch-Seite) | 1–2 Tage |
| Erzrivale mit Bilanz | aus vorhandener KI und vorhandenen Ereignissen | 1–2 Tage |
| Geld knapp machen | nur Daten, Bot-Läufe | 1 Tag |

**Empfehlung:** Mit Takt 1 (Jahresziele) und dem Geld anfangen, dann den Erzrivalen und zuletzt die Epochen-Fragen. Jeder Baustein ist für sich spielbar. Ob das reicht, zeigt erst der Spieltest.
