# Konzept Einstieg und Lernpfad

**Stand:** 03.11.2026 · **Auftrag:** Projektleitung, 03.11.2026: „Entwerfe auch passend ein Tutorial und/oder einen Einstieg, damit die Lernkurve nicht so hoch ist.“ · **Grundlage:** Design-Dokument „Die erste Stunde: schmaler Einstieg“ und „Einstiegsarten“, S01 KRN-R40 bis KRN-R43 (Freischaltung), KRN-R70 (Startprofil und Startjahr), Coach aus dem Spieltest nach Etappe 4

## 1. Was es heute gibt

| Baustein | Wirkung | Lücke |
| --- | --- | --- |
| Coach (5 Schritte) | Ein Hinweis zur Zeit bis zum zweiten Release: Konzept, Zeit starten, Playtest, Release, Ergebnis | Endet nach Spiel 2, gerade wenn die vielen Systeme erst kommen |
| Freischaltung nach Fortschritt | Höchstens ein System je Release, zwei je Jahr; zuerst als Ereignis (KRN-R41, KRN-R42) | Das Ereignis sagt, *dass* etwas neu ist, aber nicht, *wozu* und *wo* |
| Wissensbuch | Passungen, Kartenwerte, „Wie entsteht eine Wertung?“ | Nachschlagewerk, kein Lernweg |
| Wasserfälle und Tooltips | Jede Zahl hat eine Aufschlüsselung | Man muss wissen, dass man danach suchen kann |
| Startpolster, Mindestwertung | Leicht und Entspannt verzeihen Fehler | Wirkt unsichtbar |

Seit 6b und 6c sind viele Systeme dazugekommen: Teams mit Schwerpunkt und QA, groß und AAA, Auftragsspiele, Publisher, Börse, Übernahmen. Der Coach erklärt davon nichts. Die Lernkurve steigt also nicht am Anfang, sondern ab etwa Spiel 3.

## 2. Ziel

1. Das erste Spiel ist in unter 20 Minuten veröffentlicht, und der Spieler kann sagen, warum die Wertung so ausfiel (Messlatte aus dem Design-Dokument).
2. Jedes neue System wird in dem Moment erklärt, in dem es auftaucht: was es bringt, was es kostet, wo es steht. Drei Sätze und ein „Zeig mir“.
3. Wer das Spiel kennt, kann alles abschalten. Nichts davon ändert die Simulation (reine Anzeige, wie der Coach).

## 3. Vorschlag in vier Bausteinen

### 3.1 Einstiegsart beim Start

Der Startbildschirm fragt zuerst nach der Einstiegsart, danach nach den bisherigen Einstellungen:

| Einstiegsart | Für wen | Was anders ist |
| --- | --- | --- |
| 🧭 **Geführt** (Standard beim ersten Spiel) | Neue Spieler | 1980, Garage, Schwierigkeit Leicht, Lernpfad an, Freischaltung nach Fortschritt |
| 🎯 **Klassisch** | Wer das Genre kennt | Freie Wahl von Jahr und Schwierigkeit, Lernpfad aus, Freischalt-Karten an |
| 🔓 **Frei** | Kenner | Alle Systeme sofort offen (KRN-R43), keine Hinweise |

Das freie Startjahr (6c.10) gehört zu „Klassisch“ und „Frei“. Beim geführten Start ist das Jahr fest, damit der Lernpfad zu den vorhandenen Plattformen und Karten passt.

### 3.2 Lernpfad statt Coach

Der Coach wird zu einem Lernpfad mit Kapiteln. Jedes Kapitel hat ein kleines Ziel, das sich aus dem Anzeigemodell prüfen lässt, einen Hinweis und einen Knopf „Zeig mir“, der das passende Element hervorhebt. Er steht als schmale Karte über der Fokus-Spalte und lässt sich einklappen. Ein erreichtes Ziel hakt sich selbst ab.

| # | Kapitel | Ziel (prüfbar) | Was der Spieler lernt | Kommt mit |
| --- | --- | --- | --- | --- |
| 1 | Das erste Spiel | Projekt gestartet | Genre, Thema, Plattform, drei Karten | Start |
| 2 | Die Zeit läuft | 4 Wochen vergangen | Tempo, Pause, Ereignisse in der Fokus-Spalte | Kapitel 1 |
| 3 | Playtest | ein Playtest gemacht | Prognose und Schwächen vor dem Release | 30 % Fortschritt |
| 4 | Release und Wertung | Spiel veröffentlicht, Aufschlüsselung geöffnet | Wertung = Karten · Team · Passung · Bugs, gegen die Erwartung der Presse | Spiel fertig |
| 5 | Besser machen | Spiel 2 mit höherer Wertung oder besserer Passung | Wissensbuch, Passung Genre–Thema, Trend | erster Release |
| 6 | Wachsen | dritte Person eingestellt | Bewerbungen, Gehalt, Stärke je Bereich | Bewerbungen frei |
| 7 | Marketing | Marketing für ein Projekt gesetzt | Interesse, Ankündigung, Verkaufskurve | Spiel 2 |
| 8 | Aufträge | ersten Auftrag oder Auftragsspiel angenommen | Geld zwischen den eigenen Spielen | Aufträge frei |
| 9 | Eigene Engine | Engine gegründet oder bewusst übersprungen | Modulstufen, Karten brauchen Technik | Engine frei |
| 10 | Teams | erstes Team gebildet, Schwerpunkt gesetzt | Filter, Mehrfachauswahl, Fachteam, QA-Team | 8 Personen |
| 11 | Größere Projekte | ein mittleres Projekt veröffentlicht | Gate, Freeze, Phasen | Spiel 3 |
| 12 | Marken | Nachfolger veröffentlicht | Fans, Müdigkeit, Marke pflegen | Marken frei |

Ab Kapitel 12 endet der Lernpfad. Was danach kommt (Publisher, Börse, Übernahmen, Live-Betrieb, AAA), erklären die Freischalt-Karten.

### 3.3 Freischalt-Karte

Jede Freischaltung (KRN-R42) bekommt zusätzlich zum bisherigen Ereignis eine kurze Karte mit fester Form:

> **Neu: Auftragsspiele**
> Verlage bestellen Spiele mit Vorgaben und Mindestwertung. Du bekommst einen Vorschuss, den Rest bei Abgabe, und bei Verfehlen zahlst du eine Strafe.
> **Lohnt sich, wenn** deine Teams gerade frei sind und du Geld brauchst.
> **Kostet** dich die eigene Marke und die Verkäufe.
> [Zeig mir] [Im Handbuch] [Verstanden]

Die Texte stehen in `data/texts` (Schlüssel `unlock.<id>.what`, `.when`, `.cost`). „Zeig mir“ öffnet die Ansicht und hebt den Bereich hervor.

### 3.4 Handbuch im Wissensbuch

Das Wissensbuch bekommt einen Reiter **Handbuch** mit einem Artikel je System. Jeder Artikel hat höchstens zehn Zeilen und folgt derselben Form: Wozu · Wie es wirkt (mit der Formel in Worten) · Typische Fehler · Wo in der Oberfläche. Freigeschaltet wird ein Artikel mit seinem System. Der bestehende Abschnitt „Wie entsteht eine Wertung?“ wird der erste Artikel.

### 3.5 Übersicht über Umfang und Zusammenhänge (Ergänzung Projektleitung 03.11.2026)

- **Fahrplan „Was kommt noch“** in der Zentrale: alle Systeme als Symbole, freigeschaltete farbig, kommende grau mit ihrer Bedingung („ab 8 Personen“, „nach dem 2. Release“, „ab 1990“). Er zeigt den Umfang des Spiels, ohne alles auf einmal zu öffnen.
- **Zusammenhangs-Karte** als erster Handbuch-Artikel: Karten, Team, Engine, Passung, Bugs → Wertung → Interesse und Verkäufe → Geld → Personal, Engine und Büro. Jeder Knoten öffnet seinen Artikel; freigeschaltete Knoten sind hervorgehoben.

## 4. Kleine Hilfen, die sofort wirken

- **Fragezeichen an Kennzahlen:** Wertung, Erwartung der Presse, Passung und Bugs bekommen ein „?“, das den passenden Handbuch-Artikel öffnet.
- **Erste-Male-Hinweise:** Beim ersten Gate, ersten Freeze, ersten Crunch und ersten negativen Kontostand erscheint ein Satz zur Einordnung (einmal je Partie).
- **Empfehlung statt leerer Wahl:** Wo der Spieler wählen muss und es eine vernünftige Standardwahl gibt, ist sie vorgewählt und als „empfohlen“ markiert (wie heute beim ersten Projekt, Etappe 4b.10).
- **Rückblick nach dem Release:** Ein Satz „Das hat am meisten gekostet“ aus dem schwächsten Balken der Aufschlüsselung, mit Link ins Handbuch.

## 5. Umsetzung

Alles ist reine Anzeige: Lernpfad und Karten lesen das Anzeigemodell und speichern ihren Fortschritt im Browser (wie der Coach), nicht im Spielstand. Damit bleiben Golden-Runs und Determinismus unberührt.

| Schritt | Inhalt | Aufwand |
| --- | --- | --- |
| E1 | Einstiegsart auf dem Startbildschirm (Geführt, Klassisch, Frei) | klein |
| E2 | Lernpfad mit 12 Kapiteln, Ziele aus dem Anzeigemodell, „Zeig mir“ mit Hervorhebung | mittel |
| E3 | Freischalt-Karten für alle Systeme in `data/base/core/unlocks.json` | klein bis mittel (Texte) |
| E4 | Handbuch-Reiter mit einem Artikel je System, „?“ an den Kennzahlen | mittel (Texte) |
| E5 | Erste-Male-Hinweise und Rückblick nach dem Release | klein |
| E6 | Spieltest mit zwei neuen Personen gegen die Messlatten aus Abschnitt 2 | – |

Einordnung: als Schritt **6c.11** nach den übrigen 6c-Schritten, weil der Lernpfad Teams, Auftragsspiele und große Projekte erklären soll, die 6c gerade baut. E6 lässt sich mit dem ausstehenden Spieltest aus `docs/SPIELTEST-Etappe-4b.md` verbinden.

## 6. Entscheidungen

1. **Ton des Mentors:** sachliche Tipps; eine Figur ist für später vorgemerkt.
2. **Belohnung für Kapitel:** keine, damit der Lernpfad das Balancing nicht berührt.
3. **Vorrang:** Der Einstieg kommt direkt nach 6c.4 (Projektleitung: „so bequem und einfach wie möglich“).
