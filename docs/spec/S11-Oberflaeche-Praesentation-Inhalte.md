# S11 Oberfläche, Präsentation, Audio und Inhalte

**Version:** 1.0, Stand 29.10.2026 · **Quelle:** Design-Dokument → Spielerlebnis und Bedienung, Oberfläche, Präsentation, Ton und Musik, Büro und Ausstattung · **Prefix:** UI

## 1 Zweck und Abgrenzung

Diese Spezifikation legt fest, wie das Spiel aussieht, sich bedienen lässt, klingt und welche Texte es braucht. Sie beschreibt Bildschirme, Bausteine, Rückmeldung, Barrierefreiheit, Präsentation (Bühne, Büro-Ansicht), Audio und den Content-Plan für Texte.

Nicht enthalten: die Regeln der Systeme selbst (S01–S10), Renderer- und Worker-Technik im Detail (S12). Die Oberfläche liest ausschließlich das Anzeigemodell, das der Worker liefert, und sendet Eingaben zurück; sie rechnet keine Spielregeln.

## 2 Begriffe

| Begriff | Bedeutung |
| --- | --- |
| Rahmen | Fester Bildschirmaufbau: Kopfzeile, linke Leiste, Hauptbereich, rechte Spalte, Fußleiste |
| Erleben-Ebene | Standardebene jeder Ansicht: Dinge, Räume, Vergleiche, eine Entscheidung im Fokus |
| Analysieren-Ebene | Zweite Ebene jeder Ansicht (Taste Tab): Tabelle derselben Objekte, Filter, Formeln, Export |
| Fokus-Karte | Die eine Entscheidung, die gerade im Vordergrund steht, mit Optionen und Vorher/Nachher |
| Warteschlange | Weitere Entscheidungen und Ergebnisse, die als Stapelzahl warten |
| „Als Nächstes“ | Leiste mit den nächsten drei terminierten Ereignissen und Wochenzahl |
| Kachel | Kleinste Darstellung eines Bereichs: Ampel mit Form + ein Satz |
| Bühne | 2D-Darstellung des Firmensitzes mit Teams, Schlüsselpersonen und Requisiten (1.0) |
| Büro-Ansicht | Draufsicht fester Grundrisse mit Ausstattung im Stil von Prison Architect (1.4, S13) |
| Requisite | Sichtbares Ding auf Bühne oder im Büro, das einen Zustand der Simulation anzeigt (Symptom) |
| Diegetik | Informationen erscheinen in der Hülle ihrer Epoche (Fax, Magazin, Website, Feed) |
| Juice | Kurze, abschaltbare Animationen und Töne als Rückmeldung |
| Viz-Baustein | Wiederverwendbare Visualisierung mit einheitlichem Datenformat |

## 3 Daten

Die Oberfläche hält keinen eigenen Spielzustand. Sie hält nur UI-Zustand und das Anzeigemodell.

| Entität/Feld | Typ | Einheit/Bereich | Bedeutung |
| --- | --- | --- | --- |
| ViewModel | Objekt | – | Vom Worker gelieferte, für die Anzeige aufbereitete Daten; wird per Delta aktualisiert (S12) |
| ViewModel.kopf | Objekt | Geld, Ruf, Personen, Datum | Inhalt der Kopfzeile |
| ViewModel.fokus | FocusCard? | – | Aktuelle Fokus-Karte oder leer |
| ViewModel.warteschlange | QueueItem\[\] | 0–n | Wartende Entscheidungen und Ergebnisse |
| ViewModel.alsNaechstes | UpcomingItem\[\] | genau 3 | Nächste terminierte Ereignisse |
| ViewModel.ansichten | ViewId\[\] | – | Freigeschaltete Ansichten in Reihenfolge |
| FocusCard.id | string | – | Verweis auf Entscheidungsangebot (S01) |
| FocusCard.titel, text | string | Textschlüssel | Aus data/texts |
| FocusCard.optionen | Option\[\] | 2–4 | Je Option: Text, Vorher/Nachher-Werte, Kosten |
| FocusCard.wiederkehrend | bool | – | Zeigt Knopf „Nicht mehr fragen – Regel anlegen“ |
| FocusCard.frist | Woche? | – | Für „Später“ |
| QueueItem.klasse | enum | entscheidung, ergebnis, information | Benachrichtigungsklasse |
| QueueItem.buendel | string? | Wochen-ID | Ergebnisse derselben Woche bilden einen Bericht |
| VizValue | Objekt | – | Einheitliches Datenformat aller Viz-Bausteine: {wert, vergleich, verlauf\[\], aufschluesselung\[\]} |
| VizValue.wert | number | – | Aktueller Wert |
| VizValue.vergleich | {label, wert}\[\] | 0–3 | Referenzen (Genre-Schnitt, letztes Spiel, Rivale) |
| VizValue.verlauf | number\[\] | ≤ 104 Punkte | Für Sparkline |
| VizValue.aufschluesselung | {faktor, beitrag, ziel}\[\] | – | Für Wasserfall; ziel = Link auf Objekt |
| VizValue.spanne | {p10, p50, p90}? | – | Für Prognose-Fächer |
| UiState.ansicht | ViewId | – | Aktuelle Ansicht |
| UiState.ebene | enum | erleben, analysieren | Ebene der Ansicht |
| UiState.filter | Objekt | – | Filter je Ansicht (lokal gespeichert) |
| UiState.undo | Zuweisung? | max. 1 | Letzte Zuweisung im aktuellen Tick |
| UiSettings | Objekt | – | Skalierung, Schrift, Thema (hell, dunkel, hoher Kontrast), Zahlenformat (kurz, voll), Farbenblind-Modus, Animationen, Lautstärken, Mentor und Sprechblasen getrennt stumm, Sprache (S10) |
| TextEntry | Objekt | – | Text als Daten (Abschnitt Inhalte) |
| Asset | Objekt | – | Grafik oder Klang mit ID, Epoche, Variante, Datei |

## 4 Regeln

### 4.1 Rahmen und Navigation

- **UI-R01** \[1.0\] Jeder Bildschirm zeigt Kopfzeile, linke Leiste, Hauptbereich, rechte Spalte und Fußleiste; nur Vollbild-Momente (Release-Abend, Jahrbuch, Epochen-Intro, Verhandlungstisch, Spielende) blenden den Rahmen aus.
- **UI-R02** \[1.0\] Die Kopfzeile zeigt Studio-Name, Geld mit Richtungspfeil, Ruf, Personenzahl und Datum. Simuliert wird immer wöchentlich; GameState.displayUnit (S01) bestimmt nur die Anzeige: zuerst Monate (4/4/5 Wochen je Quartal), ab dem ersten Engine-Projekt, dem zweiten Release oder 1985 Wochen (UI-R107).
- **UI-R03** \[1.0\] Die linke Leiste zeigt nur freigeschaltete Ansichten; nicht freigeschaltete sind ausgeblendet, nicht ausgegraut.
- **UI-R04** \[1.0\] Eine neu freigeschaltete Ansicht blitzt einmal kurz auf und erhält ein Abzeichen „neu“, bis sie geöffnet wurde.
- **UI-R05** \[1.0\] Die rechte Spalte (Fokus-Karte, Warteschlange, „Als Nächstes“, Ticker) ist auf jedem Rahmen-Bildschirm sichtbar; unter 1600 px Breite ist sie einklappbar, unter 1280 px erscheint die Fokus-Karte als Overlay.
- **UI-R06** \[1.0\] Die Fußleiste zeigt Pause, 0,5×, 1×, 2×, 4× als Knöpfe, „Bis zum nächsten Ereignis“ und den Jahresbalken mit Markern (Messen, Weihnachtsquartal, eigene Releases).
- **UI-R07** \[1.0\] Tastatur: Leertaste Pause, 0 Tempo 0,5×, 1/2/3 Tempo, N nächstes Ereignis, Tab Ebene wechseln, Strg+K Befehlspalette, Esc zurück; alle Kürzel sind in den Einstellungen änderbar.

### 4.2 Zwei Ebenen

- **UI-R10** \[1.0\] Jede Ansicht hat eine Erleben- und eine Analysieren-Ebene; Tab wechselt zwischen beiden, die Auswahl bleibt erhalten.
- **UI-R11** \[1.0\] Die Erleben-Ebene enthält keine Tabelle mit mehr als fünf Spalten (Trennregel).
- **UI-R12** \[1.0\] Jedes Objekt der Erleben-Ebene existiert als Zeile in der Analysieren-Ebene derselben Ansicht.
- **UI-R13** \[1.0\] Die Analysieren-Ebene nutzt einen gemeinsamen Tabellen-Baustein mit Sortieren, Filtern, Spaltenwahl, CSV-Export und Formel-Tooltip.
- **UI-R14** \[1.0\] Alle Spielfunktionen sind auf der Erleben-Ebene erreichbar; die Analysieren-Ebene ist optional.

### 4.3 Neun Prinzipien als Regeln

- **UI-R20** \[1.0\] Dinge statt Zahlen: Spiele sind Karten mit Cover, Engine-Module Chips, Teams Figurengruppen, Verträge Dokumente mit Siegel, Plattformen Geräte-Silhouetten; Zahlen stehen auf dem Ding.
- **UI-R21** \[1.0\] Jeder Bereich nutzt genau eine räumliche Metapher: Zentrale = Bühne, Zeit = Strom, Technik = Platine, Marke = Stammbaum, Markt = Wetterkarte und Plattform-Strom, Firma = Organigramm.
- **UI-R22** \[1.0\] Jede Ziehen-Aktion hat eine gleichwertige Menü-Alternative (Kontextmenü „Zuweisen“, Tastatur).
- **UI-R23** \[1.0\] Offenlegung in drei Stufen: Kachel → Karte (höchstens fünf Werte mit Vergleich) → Tabelle oder Formel; jede Stufe ist genau einen Klick tiefer.
- **UI-R24** \[1.0\] Diegetik: Meldungen, Wertungen und Nachrichten erscheinen in der Hülle der aktuellen Epoche (Abschnitt Präsentation).
- **UI-R25** \[1.0\] Keine angezeigte Zahl ohne Richtung oder Vergleich: jede Kennzahl hat Pfeil, Sparkline oder mindestens eine Referenz.
- **UI-R26** \[1.0\] Ursache ist ein Klick entfernt: Jede Veränderung über 10 % ist mit einem Wasserfall verlinkt, dessen Balken auf das verursachende Objekt verlinken.
- **UI-R27** \[1.0\] Alles, was dauert (Projekte, Verträge, Kampagnen, Plattformleben, Devkit-Wellen), liegt als Balken auf dem Zeitstrom.
- **UI-R28** \[1.0\] Es gibt immer höchstens eine Fokus-Karte; alles andere wartet in der Warteschlange.

### 4.4 Fokus, Warteschlange, Benachrichtigungen

- **UI-R30** \[1.0\] Drei Klassen: Entscheidung → Fokus-Karte, pausiert die Zeit; Ergebnis → Warteschlange mit Abzeichen, pausiert nur, wenn eingestellt; Information → Ticker und Posteingang, pausiert nie.
- **UI-R31** \[1.0\] Ergebnisse derselben Spielwoche werden zu einem Wochenbericht mit Reitern gebündelt; ein Release erzeugt genau einen Release-Bericht.
- **UI-R32** \[1.0\] Jede Fokus-Karte zeigt pro Option die Folgen als Vorher/Nachher der betroffenen Werte (mit Spanne, wenn unsicher).
- **UI-R33** \[1.0\] Jede Fokus-Karte hat „Warum?“ (öffnet Aufschlüsselung) und „Später“ (legt in die Warteschlange, mit Frist, nach der die Standardoption greift).
- **UI-R34** \[1.0\] Wiederkehrende Entscheidungen zeigen „Nicht mehr fragen – Regel anlegen“; der Knopf öffnet den Regel-Editor mit vorausgefüllter Bedingung (S07).
- **UI-R35** \[1.0\] Delegierte Entscheidungen erscheinen nur als Information mit Abzeichen (Produzent oder Regel) und Link zum Regelprotokoll.
- **UI-R36** \[1.0\] „Als Nächstes“ zeigt immer die drei nächsten terminierten Ereignisse mit verbleibenden Wochen; ein Klick springt zum Objekt.
- **UI-R37** \[1.0\] Jede Kategorie von Meldungen lässt sich stummschalten; Entscheidungen lassen sich nicht stummschalten, nur delegieren.

### 4.5 Bedienung und Komfort

- **UI-R40** \[1.0\] Die letzte Zuweisung (Team verschoben, Karte abgelegt, Regler verstellt) lässt sich bis zum Ende des aktuellen Ticks rückgängig machen (Strg+Z); Zeit lässt sich nicht zurückdrehen.
- **UI-R41** \[1.0\] Die Befehlspalette (Strg+K) findet alle Objekte (Projekte, Marken, Engines, Firmen, Personen) und alle Befehle per Volltext.
- **UI-R42** \[1.0\] Die Portfolio-Wand zeigt alle Projekte als Karten im Raster, gruppierbar nach Studio, Marke oder Phase, mit Filter-Chips „Aufmerksamkeit nötig“, „Release in weniger als 8 Wochen“, „ohne Produzent“.
- **UI-R43** \[1.0\] Der Verhandlungstisch ist ein einziger Baustein für Publisher-Deals, Lizenz-Großkunden und Übernahmen: Wertspanne der Gegenseite, Spielraum als Spannen-Balken pro Punkt, Reaktion als Porträt mit Stimmung.
- **UI-R44** \[1.0\] Kacheln der Zentrale zeigen ab drei Studios nur noch Abweichungen von Plan oder Normalbereich.

### 4.6 Juice

- **UI-R50** \[1.0\] Jede Juice-Animation dauert höchstens fünf Sekunden und ist überspringbar; Vollbild-Momente höchstens 20 Sekunden.
- **UI-R51** \[1.0\] „Reduzierte Animationen“ ersetzt alle Juice-Animationen durch Standbilder und zeigt Momente in einem Schritt.
- **UI-R52** \[1.0\] Zahlen zählen hoch statt zu springen (max. 0,8 s); der Kassenklang ertönt nur bei Einnahmen über 5 % des Kontostands und höchstens einmal pro Woche.

### 4.7 Barrierefreiheit und Eingabe

- **UI-R60** \[1.0\] Farbe trägt nie allein Bedeutung: Ampeln haben Formen (● ◐ ▲ ✖), Diagramme haben im Farbenblind-Modus Muster. Das Thema „Hoher Kontrast“ hat mindestens 7:1 Textkontrast, 3 px Fokusrahmen und doppelt so dicke Diagrammlinien (S10 ZIE-R42).
- **UI-R61** \[1.0\] Mindestschrift 13 px bei 100 % Skalierung auf 1280 × 800; UI-Skalierung (75–200 %) und Schriftgröße sind getrennt einstellbar.
- **UI-R62** \[1.0\] Breakpoints: ab 1600 px drei Spalten; 1280–1599 px rechte Spalte einklappbar; unter 1280 px Fokus-Karte als Overlay; Mindestbreite 1024 px.
- **UI-R63** \[1.0\] Jede Ansicht ist vollständig per Tastatur bedienbar; Karten, Chips, Tische und Knoten sind fokussierbar mit sichtbarem Fokusrahmen.
- **UI-R64** \[1.0\] Jedes Diagramm hat einen Ein-Satz-Text für Screenreader (aria-label) und eine Tabellen-Alternative (Analysieren-Ebene).
- **UI-R65** \[1.0\] Controller und Steam Deck: Steuerkreuz springt zwischen fokussierbaren Elementen, Schultertasten wechseln Ansicht, Trigger öffnen die rechte Spalte, Start = Pause, Select = Befehlspalette; Ziehen wird zu „Aufnehmen–Bewegen–Ablegen“ mit Einrasten.
- **UI-R66** \[1.0\] Alle Fokus-Karten pausieren; nichts läuft ab, während eine Entscheidung offen ist.

### 4.8 Präsentation

- **UI-R70** \[1.0\] Die Zentrale zeigt die Bühne: Kulisse nach Grundriss-Größe und Epoche, Teams mit Projekt-Schild, Schlüsselpersonen mit Porträt. Plan A für den Early Access ist ein statisches Epochenbild je Grundriss-Größe mit Porträts und Team-Schildern als Ebenen darüber; animierte Figurengruppen kommen danach.
- **UI-R71** \[1.0\] Zustände der Simulation erscheinen als Requisiten (Tabelle Abschnitt 8.3); jede Requisite ist anklickbar und führt zur Ursache.
- **UI-R72** \[1.0\] Einen Tisch auf ein anderes Projekt-Schild zu ziehen, weist das Team um (mit Einarbeitungszeit als Vorher/Nachher).
- **UI-R73** \[1.0\] Schlüsselpersonen zeigen höchstens eine Sprechblase gleichzeitig; ein Klick öffnet die zugehörige Entscheidung oder Information.
- **UI-R74** \[1.4\] Die Einstellung „Büro-Darstellung“ wählt zwischen Bühne und Büro-Ansicht von oben; beide lesen dieselben Daten.
- **UI-R75** \[1.4\] In der Büro-Ansicht wird nichts frei platziert; ein Klick auf einen Raum öffnet dessen Ausstattung und Upgrade.
- **UI-R76** \[1.0\] Diegetik: Die Hülle von Meldungen und Wertungen wechselt mit der Epoche (Tabelle Abschnitt 8.4), das Datenmodell bleibt gleich.

### 4.9 Audio

- **UI-R80** \[1.0\] Vier getrennte Lautstärkeregler: Musik, Ereignistöne, Oberfläche, Atmosphäre; dazu Gesamtlautstärke und „Musik bei Pause dämpfen“.
- **UI-R81** \[1.0\] Musik wechselt Stimmungsschichten (ruhig, angespannt, festlich) mit 2 s Überblendung; angespannt bei Crunch oder aktiver Krise, festlich bei Hit und Award.
- **UI-R82** \[1.0\] Die Audio-Schicht entscheidet anhand der Ereignisse des Workers, was klingt; die Simulation kennt keine Klänge.
- **UI-R83** \[1.0\] Ereignistöne sind pro Benachrichtigungsart abschaltbar; gleiche Töne werden innerhalb von 2 s nicht wiederholt.

### 4.10 Inhalte und Texte

- **UI-R90** \[1.0\] Kein angezeigter Text steht im Code; alle Texte liegen in data/texts/ mit Schlüssel, Sprache, Platzhaltern, Bedingungen und Gewicht.
- **UI-R91** \[1.0\] Aus mehreren passenden Textvarianten wählt ein eigener Zufallsstrom „texts“ nach Gewicht; derselbe Text erscheint nicht zweimal innerhalb von 8 Spielwochen.
- **UI-R92** \[1.0\] Fehlt ein Text in der gewählten Sprache, erscheint Englisch, sonst der Schlüssel; der Entwicklermodus listet fehlende Texte.
- **UI-R93** \[1.0\] Texte enthalten keine echten Firmen-, Marken-, Spiele- oder Personennamen.
- **UI-R94** \[1.0\] Namensgeneratoren erzeugen Firmen, Spiele, Personen, Magazine und Plattformen aus Bausteinen je Epoche und Region; Kollisionen mit vorhandenen Namen werden verworfen.

### 4.11 Ergänzungen nach Prüfung 3

- **UI-R95** \[1.0\] Wissensbuch aus Releases: Nach jedem Release werden der größte positive und der größte negative Balken des Wasserfalls zu Einträgen (Faktor, Richtung, Bezug auf Genre, Thema, Plattform oder Feature).
- **UI-R96** \[1.0\] Sicherheitsgrad = Zahl der Releases, die den Eintrag bestätigen (gleicher Faktor, Bezug und Richtung): 1–2 „vermutlich“, ab 3 „bestätigt“.
- **UI-R97** \[1.0\] Zeigt ein Release denselben Faktor mit Gegenrichtung, wird der Eintrag „umstritten“ und zeigt beide Zählungen. Er verlässt diesen Zustand, sobald eine Seite zwei Releases Vorsprung hat.
- **UI-R98** \[1.0\] Strategiekonferenz: einmal im Jahr nach dem Jahrbuch ein Vollbild-Moment am Konferenztisch mit den Schlüsselpersonen. Er zeigt Ziele, Lage und Vorschläge; die Entscheidungen selbst kommen aus den Systemen (S01, S07).
- **UI-R99** \[1.0\] Meilenstein-Momente pro Projekt: Bei jedem Gate (Vertical Slice, Alpha, Beta, Gold) spielt die Bühne einen Moment von höchstens 5 s am Tisch des Teams, danach ein Eintrag auf dem Zeitstrom.
- **UI-R100** \[1.0\] Die Ansicht Firma (H) wird mit dem 8. Mitarbeiter freigeschaltet. Das Freischaltungs-Ereignis „Das Studio wächst“ erklärt Organigramm und Teams in einem Satz.
- **UI-R101** \[1.0\] Markenmarkt: Die Markt-Ansicht (F) hat den Reiter „Marken“. Ein Regal zeigt die Wappen aller angebotenen Marken (S04); Größe = Stärke, Farbe = Frische (mit Form für Farbenblinde). Ein Klick öffnet Angebot und Verhandlungstisch.
- **UI-R102** \[1.0\] Konkursmasse-Auktion (S08 MRK-R65): Karte mit Countdown, Startpreis, Bietern und eigenem Höchstgebot; Ausgang als Ticker-Zeile.
- **UI-R103** \[1.0\] Wird der Kopierschutz eines Spiels geknackt (S05), meldet der Ticker „geknackt nach N Tagen“ mit Link auf das Spiel.
- **UI-R104** \[1.0\] Der Wertungs-Wasserfall hat immer die Balken „Zeitgeist“ (Trend-Faktor, S08) und „Tagesform der Presse“ (Presse-Zufall, S10), auch wenn sie null sind.
- **UI-R105** \[1.0\] Vor dem Release zeigt das laufende Projekt (C) und der Release-Bildschirm die Bug-Kurve mit Prognose bis zum Termin und der Zertifizierungsschwelle.
- **UI-R106** \[1.0\] Kultur-Tags des Studios (aus S07, z. B. „Tüftler“, „Crunch-Kultur“) stehen als Chips im Organigramm und im Jahrbuch.
- **UI-R107** \[1.0\] Anzeige-Takt: Die Simulation läuft immer in Wochen. GameState.displayUnit (S01) zeigt zuerst Monate (Quartal 4/4/5 Wochen) und schaltet beim ersten Engine-Projekt, beim zweiten Release oder 1985 auf Wochen um. Der Wechsel ist eine Information im Ticker, kein Takt-Wechsel.
- **UI-R108** \[1.0\] Börse (S07 FRM-R51 bis R54, R74, R75): Die Firma-Ansicht zeigt die Anlegerstimmung 0–100 als Balken mit sichtbarer Quartals-Zielmarke; der Kurs ist nur Anzeige ohne Formel-Tooltip; die Dividende hat drei Stufen als Schalter. Die Hauptversammlung ist ein jährlicher Moment.

## 5 Formeln, Kennzahlen und Startwerte

| Parameter | Startwert | Bereich | Datei |
| --- | --- | --- | --- |
| Maximale Spalten auf Erleben-Ebene | 5 | fest | ui/rules.json |
| Wochenbericht bündelt ab | 2 Ergebnissen | 2–5 | ui/notifications.json |
| Frist „Später“ | 4 Wochen | 1–12 | ui/notifications.json |
| Juice-Höchstdauer | 5 s | 0–5 | ui/juice.json |
| Vollbild-Moment Höchstdauer | 20 s | 5–30 | ui/juice.json |
| Hochzählen | 0,8 s | 0–2 | ui/juice.json |
| Kassenklang-Schwelle | 5 % des Kontostands | 1–20 % | ui/juice.json |
| Text-Wiederholsperre | 8 Wochen | 0–26 | ui/texts.json |
| Ursache-Link ab Änderung | 10 % | 5–25 % | ui/rules.json |
| Abweichung für Kacheln (ab 3 Studios) | ± 15 % vom Plan | 5–30 % | ui/rules.json |
| Mindestschrift | 13 px | 12–16 | ui/theme.json |
| UI-Skalierung | 100 % | 75–200 % | Einstellungen |
| Musik-Überblendung | 2 s | 0,5–5 | audio/mixer.json |
| Bühne Figuren max. sichtbar | 40 | 10–80 | stage/config.json |

**UI-Kennzahlen** (geprüft im Balancing und in UI-Tests):

| Kennzahl | Ziel |
| --- | --- |
| Klicks pro Spielwoche 2030 im Vergleich zu 2000 | nicht höher |
| Zeit, um die Ursache eines Umsatzeinbruchs zu finden | unter 30 s |
| Erstes Spiel veröffentlicht (neue Tester) | 80 % unter 20 min |
| Bildrate UI | 60 fps |
| Bühne pro Frame | ≤ 4 ms |

## 6 Entscheidungen des Spielers

Die Oberfläche selbst erzeugt keine Spielentscheidungen. Sie stellt die Entscheidungen der Systeme dar. Einstellungen der Oberfläche (Ebene, Filter, Lautstärken, Büro-Darstellung, Animationen) sind keine Spielentscheidungen und kosten keine Zeit.

## 8 Oberfläche

### 8.1 Ansichten und Freischaltung

| Ansicht | Metapher | Ab wann | Hauptbildschirm |
| --- | --- | --- | --- |
| Zentrale | Bühne + Kacheln | Start | A |
| Projekte | Brett, Phasenstrecke, Portfolio-Wand | Start | B, C |
| Finanzen | Sankey | Start | (Teil von H) |
| Zeitleiste | Zeitstrom | nach dem ersten Release | (Teil von F) |
| Markt | Plattform-Strom, Wetterkarte | nach dem ersten Release | F |
| Marken | Stammbaum | erste Marke | G |
| Technik | Platine | erstes Engine-Projekt | E |
| Lizenzen | Steckleiste | erste Lizenz | (Teil von E) |
| Firma | Organigramm | ab 8 Mitarbeitern, mit Freischaltungs-Ereignis „Das Studio wächst“ (UI-R100) | H |
| Wissensbuch | Buch | Start | – |

Der Release-Abend (D) ist ein Vollbild-Moment, keine Ansicht. Zehn Ansichten führen zu acht Hauptbildschirmen; Finanzen, Zeitleiste und Lizenzen sind Unteransichten.

### 8.2 Die acht Hauptbildschirme

| # | Bildschirm | Elemente | Interaktionen | Tastatur | Controller |
| --- | --- | --- | --- | --- | --- |
| A | Zentrale | Bühne (Canvas), Kacheln mit Ampel und einem Satz, Requisiten | Tisch auf Projekt-Schild ziehen; Sprechblase/Requisite anklicken; Kachel öffnet Ansicht | Pfeile zwischen Tischen, Enter öffnet, Z zuweisen | Steuerkreuz zwischen Tischen, A öffnet, X zuweisen |
| B | Projekt anlegen (Brett) | Konzept-Slots, Feature-Stapel, fünf Bereichsreihen mit Ist-gegen-Erwartet-Balken, Prognose-Fächer, Leistungsbudget-Füllstände, Kosten/Dauer/Team, Konkurrenzdichte am Termin | Karten in Slots/Reihen ziehen; gesperrte Karte „Bestellen“ (Engine-Anforderung); Pitch an Publisher | Pfeile im Stapel, Enter legt in passende Reihe, B bestellt | A aufnehmen, Steuerkreuz Ziel, A ablegen |
| C | Laufendes Projekt | Phasenstrecke mit Gate-Raute, Kanban je Rolle, Prognose-Fächer (alte blass), Bugs-Sparkline, Budget-Balken, Interesse-Kurve | Team zuweisen, Playtest ansetzen, Feature nachziehen (Warnung nach Freeze), Engine-Bindung wechseln, pausieren/umsteuern/abbrechen | P Playtest, T Team | Menü auf Y |
| D | Release-Abend | Magazin-Cover kippen nacheinander, Gesamtwertung mit drei Vergleichen, Wasserfall „Warum?“, Wissensbuch-Eintrag, danach Verkaufskurve vor Prognoseband | Balken anklicken → Objekt; überspringen | Leertaste weiter, Esc überspringen | A weiter, B überspringen |
| E | Engine-Werkstatt | Modul-Chips mit Stufenpunkten, Linie „Stand der Technik“, Rost für Schuld, Ketten-Symbol für Fremdmodule, Anforderungsleiste, Lizenznehmer-Steckleiste mit Statuslampe, Wartung-Feature-Trennbalken, blockierte Spiel-Features | Chip ziehen = Forschung einplanen; Anforderung priorisieren; Trennbalken verschieben | Pfeile zwischen Chips, F forschen | Steuerkreuz, Stick verschiebt Trennbalken |
| F | Markt und Zeitleiste | Stream-Graph der Plattformen (Breite = aktive Basis), Devkit-Wellen, Konkurrenzdichte-Spur, eigene Pins, Trend-Wetterkarte, Rangliste (Tabelle), Rivalen-Karten, Reiter „Marken“ mit Markenmarkt-Regal (UI-R101), Gerüchte als blasse Marker, Auktionskarten | Release-Pin ziehen; Zeitraum zoomen; Rivale öffnen | +/- zoomen, Pfeile verschieben | Trigger zoomen |
| G | Marken | Wappen, Stärke und Frische, Stammbaum auf Zeitachse, Genre-Äste, Fanringe, Merch-Ertrag, Empfehlung „Pause bis …“ | Neuer Titel in dieser Welt; Lizenz vergeben; Merch eigen/Lizenz | N neuer Titel | Menü auf Y |
| H | Firma und Konzern | Organigramm mit Studio-Knoten, Team-Karten, Führungskapazität als Steckplätze, Vorgaben- und Regel-Chips, Personalpolitik-Schalter, Kultur-Tags des Studios, Büro und Ausstattung, Finanzen als Sankey | Teams zwischen Knoten ziehen; Regel-Chips bearbeiten; Ausstattung kaufen; Verhandlungstisch öffnen | Pfeile im Organigramm | Steuerkreuz |

### 8.3 Bühne, Requisiten und Büro-Ansicht

| Zustand (Simulation) | Requisite / Darstellung |
| --- | --- |
| Grundriss und Epoche | Kulisse: Garage, Etage, Bürohaus, Gebäude, Campus in fünf Epochen-Looks |
| Team arbeitet an Projekt | Figurengruppe am Tisch mit Projekt-Schild und Mini-Fortschritt |
| Crunch | Abgedunkeltes Büro, Pizzakartons, müde Figuren |
| Hohe Moral / Hit | Jubel, Konfetti (Juice) |
| Burnout | Leere Stühle, Figur mit Kopf auf dem Tisch |
| Erstes Online-Spiel, Serverraum | Serverschrank mit Auslastungsanzeige |
| Messewoche | Messestand-Kisten am Eingang |
| Überauflage | Kisten im Lager |
| Ausstattung (Tonstudio, Testlabor, Motion-Capture, Showroom, Kantine) | Tür bzw. Raum im Hintergrund |
| Veraltete Hardware | Röhrenmonitore, Statusblase „Teams 10 % langsamer“ |
| Enge (überbelegt) | Zusatztische im Gang |
| Ab Campus | Studios als Gebäude-Kacheln; Klick zoomt hinein |

**Büro-Ansicht \[1.4\]:** stilisierte Draufsicht des festen Grundrisses je Variante (wie Prison Architect oder SimAirport); Räume als Flächen mit Symbolen, Figuren als einfache Silhouetten an Arbeitsplätzen, Möbel als flache Formen mit Epochen-Farben. Alles lässt sich aus Code und SVG erzeugen; eine isometrische Ansicht gibt es nur später mit externen Grafikern (S13, Abgleich A21). Gleicher PixiJS-Renderer wie die Bühne, gleiche Daten, keine freie Platzierung.

### 8.4 Diegetik nach Epoche

| Epoche | Meldungen | Wertungen | Nachrichten | Interesse heißt |
| --- | --- | --- | --- | --- |
| 1980er | Brief, Fax | Heft-Cover mit Prozentwertung | Branchenblatt | Vorbestellungen |
| 1990er | Fax, E-Mail | Heft-Cover mit Wertung von 10 | Magazin-Seite | Vorbestellungen, Hype |
| 2000er | E-Mail | Website mit Wertungskasten | Website-Schlagzeile | Hype |
| 2010er | Dashboard-Karte | Video-Thumbnail und Durchschnittswert | Social-Feed | Wishlists, Follower |
| ab 2025 | Holo-Feed | Feed-Karte mit Bewertungs-Aggregat | Feed | Follower |

### 8.5 Visualisierungs-Bausteine

Alle Bausteine bekommen ihre Daten als VizValue {wert, vergleich, verlauf\[\], aufschluesselung\[\], spanne?}.

| Baustein | Einsatz | Technik |
| --- | --- | --- |
| Prognose-Fächer (p10–p90) | Wertung, Verkäufe, Firmenwert, Anlegerstimmung | SVG/visx |
| Wasserfall | Wertung, Umsatzänderung, Anlegerstimmung, Integrationskosten | SVG/visx |
| Ist-gegen-Erwartet-Balken | Bereichsprofil, Preis, Anlegerstimmung gegen Quartals-Zielmarke | SVG |
| Stream-Graph | Plattform-Basen, Marktanteile, Einnahmequellen | SVG/D3, virtualisiert |
| Heatmap mit Formen | Trends, Konkurrenzdichte | SVG |
| Spannen-Balken | Verhandlungstisch | SVG |
| Ampel mit Form | Kacheln, Status | DOM |
| Sparkline | Neben jeder Zahl | SVG |
| Stufenpunkte + Stand-der-Technik-Linie, Rost-Overlay | Engine-Chips | SVG |
| Zeitstrom mit Pins | Zeitleiste, Release-Termin | SVG, Canvas-Fallback ab 3.000 Elementen |
| Sankey | Finanzen | d3-sankey |

### 8.6 Grafikstil und Assets

Flache Vektorgrafik, ein konsequenter Stil, alle Assets als SVG (Bühne als Texturen aus SVG gerendert), damit Claude Code sie erzeugen und Modder sie ersetzen können.

| Asset | Umfang 1.0 | Notfall | Hinweis |
| --- | --- | --- | --- |
| Kulissen | 5 Größen × 5 Epochen = 25 statische Bilder (Plan A) | 8 | Bühne |
| Porträt-Teile | \~150 (Köpfe, Frisuren, Kleidung je Epoche) | 80 | Generator |
| Figuren-Animationen | sitzen, tippen, jubeln, durchhängen, laufen | keine (Plan A: Porträts); nach dem Early Access | Bühne |
| Cover-Vorlagen | je Genre × Epoche (\~40) | 15 | Spiele, Magazine, Chronik |
| Plattform-Silhouetten | \~25 | 15 | fiktiv |
| Medien-Vorlagen | Magazin, Website, Feed je Epoche (\~12) | 5 | Diegetik |
| Symbole | \~120 | 80 | Ampeln immer mit Form |
| Büro-Ansicht \[1.4\] | 5 Größen × 2–3 Varianten, Möbel 60–100 Formen × 5 Epochen-Farbsätze | – | Draufsicht als SVG |

### 8.7 Audio

| Ebene | Inhalt 1.0 | Auslöser |
| --- | --- | --- |
| Musik | 2–3 Stücke je Epoche (5 Epochen), je drei Stimmungsschichten | Epoche, Crunch/Krise, Hit/Award |
| Ereignistöne | \~20 Signaturen (Hit, Flop, Krise, Wertung, neue Konsole, Freischaltung …) | Worker-Ereignisse |
| Oberfläche | Klicks, Ablegen, Fehler, Kasse | Eingaben |
| Atmosphäre | Tastaturen, Gespräche, Telefon nach Studiogröße | Bühne aktiv |

Keine Sprachausgabe in 1.0. Alle Klänge sind Daten (data/audio/) und per Mod austauschbar.

### 8.8 Inhalte und Texte

**Content-Plan 1.0:**

| Inhalt | Menge 1.0 | Aufbau |
| --- | --- | --- |
| Einzelereignisse | \~150 | Auslöser, 2–3 Optionen, Folgen (S01, S08) |
| Ereignisketten | 10 (Notfall 5) | Stufen mit Verzögerung |
| Magazin-Zitat-Bausteine | \~400 | Bereich (Gameplay, Grafik, Sound, Story, Technik, Bugs, Innovation) × Epoche × Lob/Kritik |
| Sprechblasen | \~300 | Rolle × Stimmung × Anlass |
| Schlagzeilen-Vorlagen | \~120 | Rivalen, Markt, Plattformen, Krisen |
| Wissensbuch-Einträge | \~80 | Erkenntnis, Glossar, Formel |
| Mentor-Kommentare | \~40 | erste fünf Releases |
| Jahrbuch-Bausteine | \~60 | Rubriken, Überschriften |
| Fokus-Karten-Texte | je Entscheidungsart 3–5 Varianten | Titel, Text, Optionen |
| Namensgeneratoren | 5 | Firmen, Spiele, Personen, Magazine, Plattformen; je Epoche und Region |

**Tonfall:** leicht augenzwinkernd, warm, nie zynisch oder herablassend; kurze Sätze; Insider-Anspielungen auf Branchengeschichte ohne echte Namen.

**Textformat** (data/texts/\<bereich>.json):

```json
{
  "key": "review.story.praise",
  "lang": { "de": "{spiel} erzählt eine Geschichte, die man nicht vergisst.", "en": "{spiel} tells a story you won't forget." },
  "bedingungen": { "epoche": ["1990", "2000"], "genre": ["rpg", "adventure"], "bereichMin": 0.7 },
  "gewicht": 1.0
}
```

Platzhalter: {spiel}, {studio}, {genre}, {thema}, {plattform}, {person}, {marke}, {zahl}, {jahr}. Mengenformen über ICU-Plural.

**Sprachen:** Deutsch und Englisch in 1.0, vollständig. Weitere Sprachen als Mod oder später.

**Lokalisierungsregeln:** Keine zusammengesetzten Sätze aus Fragmenten; Platzhalter benannt; Länge im Deutschen bis +35 % einplanen; Zahlen-, Datums- und Währungsformat nach Einstellung; Wortspiele nur, wenn es eine Übersetzung mit eigenem Witz gibt.

**Arbeitsablauf:** Claude Code erstellt Entwürfe je Bereich nach Vorlage und Tonfall-Leitfaden → Prüfskript (Schema, Platzhalter, Verbot echter Namen, Länge) → Mensch redigiert und markiert „freigegeben“ → nur freigegebene Texte gehen in Releases.

## 9 Ereignisse und Meldungen

| Auslöser (vom Worker) | Darstellung | Klasse |
| --- | --- | --- |
| Entscheidungsangebot | Fokus-Karte, pausiert | Entscheidung |
| Release | Release-Abend, danach Release-Bericht | Ergebnis |
| Wochenergebnisse (≥ 2) | Wochenbericht mit Reitern | Ergebnis |
| Neue Ansicht freigeschaltet | Aufblitzen in der Leiste, Ticker | Information |
| Jahreswechsel | Jahrbuch-Doppelseite, Autosave-Hinweis, Haltepunkt-Angebot | Ergebnis |
| Epochenwechsel | Epochen-Intro (Kulisse, Musik, neues System) | Ergebnis |
| Delegierte Entscheidung | Tickerzeile mit Abzeichen | Information |
| Spielende | Abschluss-Bildschirm mit Chronik | Ergebnis |
| Jahresanfang nach Jahrbuch | Strategiekonferenz (Vollbild-Moment) | Ergebnis |
| Projekt-Gate erreicht | Meilenstein-Moment am Team-Tisch | Ergebnis |
| Konkursmasse-Auktion | Auktionskarte mit Countdown | Entscheidung (Welt-Ereignis, Frist 1 Woche) |
| Spiel geknackt | Tickerzeile „geknackt nach N Tagen“ | Information |
| 8. Mitarbeiter | Freischaltung „Das Studio wächst“, Ansicht Firma | Information |
| displayUnit wechselt auf Wochen | Tickerzeile, Kopfzeile zeigt Wochen | Information |
| Hauptversammlung (börsennotiert) | Moment mit Stimmungsbalken und Zielmarke | Ergebnis |

## 10 Schnittstellen

| System | Liefert an S11 | Erhält von S11 |
| --- | --- | --- |
| S01 Kern | Anzeigemodell, Entscheidungsangebote, Zeitstatus | Eingaben, Zeitsteuerung |
| S02 Produkte | Projekte, Prognosen (VizValue mit spanne), Aufschlüsselungen | Brett-Belegung, Abbruch/Pause |
| S03 Engines | Module, Stufen, Schuld, Anforderungen | Forschung, Prioritäten, Bestellungen |
| S04 Lizenzen | Kundenstatus, Einnahmen | Vorlagen, Verhandlungstisch-Eingaben |
| S05 Marketing | Interesse, Release-Paket, Termine | Release-Bildschirm-Werte, Pin-Verschiebung |
| S06 Betrieb | Live-Kennzahlen, Töpfe | Kapazitätsregler |
| S07 Firma | Teams, Personen, Büro, Regeln, Finanzen | Zuweisungen, Regeln, Ausstattung |
| S08 Markt | Plattformen, Trends, Rivalen, Schlagzeilen | Zoom/Filter (nur UI) |
| S09 Übernahmen | Ziele, Wertspannen | Verhandlungstisch-Eingaben |
| S10 Ziele/Einstellungen | Erfolge, UI-Einstellungen, Mods (Texte, Assets) | Einstellungsänderungen |
| S12 Technik | Worker-Protokoll, Anzeige-Delta | Nachrichten an den Worker |

## 11 Abnahmetests

- **UI-T01** Gegeben ein neuer Spielstand 1980, wenn das Spiel startet, dann zeigt die linke Leiste genau Zentrale, Projekte, Finanzen und Wissensbuch-Zugang.
- **UI-T02** Gegeben drei offene Entscheidungen, wenn die Woche endet, dann ist genau eine Fokus-Karte sichtbar und die Warteschlange zeigt 2.
- **UI-T03** Gegeben eine beliebige Ansicht der Erleben-Ebene, wenn alle Tabellen gezählt werden, dann hat keine mehr als fünf Spalten.
- **UI-T04** Gegeben ein Umsatzeinbruch von 30 % durch einen Konkurrenztitel, wenn ein Tester ihn untersucht, dann erreicht er den Titel mit höchstens drei Klicks und in unter 30 s (Median von 5 Testern).
- **UI-T05** Gegeben ein Team auf Projekt A, wenn es per Tastatur ohne Maus auf Projekt B verschoben wird, dann gelingt das mit der Menü-Alternative.
- **UI-T06** Gegeben eine Zuweisung im aktuellen Tick, wenn Strg+Z gedrückt wird, dann ist der vorherige Zustand wiederhergestellt; nach dem nächsten Tick ist Undo leer.
- **UI-T07** Gegeben Farbenblind-Modus aktiv, wenn ein Stream-Graph angezeigt wird, dann hat jede Serie ein eigenes Muster.
- **UI-T08** Gegeben 1280 × 800 und 100 %, wenn alle Ansichten geöffnet werden, dann ist keine Schrift kleiner als 13 px und es gibt keinen horizontalen Bildlauf.
- **UI-T09** Gegeben ein Spielstand 2030 mit 12 Projekten, wenn eine Spielwoche mit Delegation gespielt wird, dann sind die Klicks nicht höher als in einem Vergleichsstand 2000.
- **UI-T10** Gegeben reduzierte Animationen, wenn ein Release stattfindet, dann erscheint der Release-Abend als ein Standbild ohne Animation.
- **UI-T11** Gegeben Sprache Deutsch und ein fehlender deutscher Text, wenn er angezeigt werden soll, dann erscheint der englische Text und der Entwicklermodus listet ihn.
- **UI-T12** Gegeben alle Textdateien, wenn das Prüfskript läuft, dann findet es keine echten Markennamen aus der Sperrliste und keine undefinierten Platzhalter.
- **UI-T13** Gegeben die Bühne mit 40 Figuren, wenn sie 60 s läuft, dann liegt die Renderzeit pro Frame im Mittel unter 4 ms.
- **UI-T14** Gegeben ein Controller, wenn ein neues Projekt komplett angelegt und gestartet wird, dann gelingt das ohne Maus und Tastatur.
- **UI-T15** \[1.4\] Gegeben Büro-Darstellung „Büro-Ansicht“, wenn umgeschaltet wird, dann bleibt der Spielstand unverändert und alle Teams sind an Arbeitsplätzen sichtbar.

* **UI-T16** Gegeben ein Studio mit 7 Mitarbeitern, wenn der 8. eingestellt wird, dann erscheint „Das Studio wächst“ und die Ansicht Firma ist freigeschaltet.
* **UI-T17** Gegeben ein Release, dann entstehen genau zwei Wissensbuch-Einträge oder Bestätigungen; nach drei bestätigenden Releases steht ein Eintrag auf „bestätigt“, nach einem widersprechenden auf „umstritten“.
* **UI-T18** Gegeben Thema „Hoher Kontrast“, wenn alle Ansichten geprüft werden, dann hat jeder Text mindestens 7:1 Kontrast.
* **UI-T19** Gegeben die Fußleiste, dann gibt es einen Knopf 0,5×, und Taste 0 wählt ihn.
* **UI-T20** Gegeben ein Start 1980 ohne Engine-Projekt, dann zeigt die Kopfzeile Monate; nach dem zweiten Release Wochen, und der Spielstand ist bei gleichen Eingaben identisch mit einem Lauf, der immer Wochen zeigt.
* **UI-T21** Gegeben eine börsennotierte Firma, dann zeigt die Firma-Ansicht die Anlegerstimmung mit Zielmarke und keine Kursformel.

## 12 Spätere Versionen

- **1.4**: Büro-Ansicht von oben mit Grundriss-Varianten und Möbeln in Epochen-Farben; sie kommt nach Publishing und Middleware (Reihenfolge in S13). Nach dem Early Access: animierte Figuren auf der Bühne statt Plan A.
- **Später:** Sprachausgabe für Mentor und Schlüsselpersonen; weitere Sprachen; frei gestaltbare Dashboards in der Analysieren-Ebene; Replay der Chronik als animierte Zeitreise; Streamer-Modus (große Schrift, ausgeblendete Zahlen).

## Änderungen nach Prüfung 3

- Ansicht Firma ab 8 Mitarbeitern mit Freischaltungs-Ereignis (UI-R100); Asset-Tabelle mit 5 Größen × 5 Epochen als statischen Bildern.
- Bühne: Plan A für den Early Access ist das statische Epochenbild mit Porträts; Figuren kommen danach (UI-R70). Büro-Ansicht auf Version 1.4 nach Publishing und Middleware (S13).
- Wissensbuch-Regeln: zwei Einträge pro Release, Sicherheitsgrad, „umstritten“ (UI-R95 bis R97).
- Neue Momente und Elemente: Strategiekonferenz, Meilenstein-Momente, Konkursmasse-Auktion, Markenmarkt-Reiter „Marken“, Ticker „geknackt“, Wasserfall-Balken „Zeitgeist“ und „Tagesform der Presse“, Bug-Kurve vor dem Release, Kultur-Tags (UI-R98 bis R106).
- Einstellungen aus S10 übernommen: hoher Kontrast, Zahlenformat, Tempo 0,5×, getrennte Stummschaltung.
- Angleich an S01 und S07: Simulation immer wöchentlich, GameState.displayUnit nur Anzeige (UI-R107); Börse als Anlegerstimmung mit Zielmarke und Hauptversammlung als Moment (UI-R108).
- Tests UI-T16 bis T21 ergänzt.
