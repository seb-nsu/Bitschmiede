# S12 Technik, Architektur, Leistung und Tests

**Version:** 1.0, Stand 29.10.2026 · **Quelle:** Design-Dokument → Technik und Architektur, Modding und Workshop, Wechselwirkungen und Balancing, Etappenplan · **Prefix:** TEC

## 1 Zweck und Abgrenzung

Diese Spezifikation legt fest, womit und wie das Spiel gebaut wird: Stack, Ordnerstruktur, Kernregeln der Simulation, verbindliche Tick-Reihenfolge, Worker-Protokoll, Datenformate, Ladepipeline, Spielstände, Leistungsziele, Tests, Auslieferung und die Arbeitsweise mit Claude Code. Spielregeln stehen in S01–S10, die Darstellung in S11.

## 2 Begriffe

| Begriff | Bedeutung |
| --- | --- |
| Kern | Simulationscode ohne UI-Abhängigkeit (src/sim) |
| Tick | Ein Simulationsschritt von genau einer Woche; der Monat ist nur Anzeige (KRN-R01) |
| Monatsjob | Berechnung, die nur in der ersten Woche eines Monats läuft (Plattform-Basis, Trends, Personal; A13) |
| Seed-Strom | Eigener deterministischer Zufallsgenerator je System, abgeleitet aus dem Spiel-Seed |
| Eingabe | Entscheidung oder Einstellung des Spielers als Datenobjekt |
| Anzeigemodell | Aufbereitete Daten für die UI (S11) |
| Anzeige-Delta | Nur die Änderungen des Anzeigemodells seit dem letzten Tick |
| Ladepipeline | Lädt Grundspiel und Mods als Pakete in gleicher Weise |
| Golden-Run | Gespeicherter Referenzverlauf (Seed + Eingaben → erwartete Prüfsummen) |
| Bot-Strategie | Automatischer Spieler für Balancing-Läufe |
| Basispunkt (bp) | Ganzzahliger Festkommawert, 1,0 = 10.000. Jedes „float“ in S01–S13 ist bp (5.9) |
| Nachschlagetabelle | Beim Build erzeugte, versionierte Tabelle für exp, tanh, ln, pow und Normalverteilung (5.9) |

## 3 Stack

| Teil | Wahl | Grund |
| --- | --- | --- |
| Sprache | TypeScript (strict) | Typen fangen Fehler in komplexen Datenmodellen früh ab; Schemas aus Typen |
| Kern | Reines TypeScript im Web Worker | UI friert nie ein; läuft auch in Node für Tests und Massenläufe |
| Oberfläche | React + Vite | Karten, Panels, schnelle Entwicklung, große Bibliothekslandschaft |
| Ziehen/Ablegen | dnd-kit | Barrierefrei, Tastatur- und Controller-Unterstützung |
| Übergänge | Framer Motion | Juice mit wenig Code, respektiert „reduzierte Animationen“ |
| Diagramme | visx bzw. D3-Skalen, d3-sankey | Fächer, Wasserfall, Stream-Graph, Heatmap, Sankey |
| Bühne / Büro-Ansicht | PixiJS (WebGL, Canvas-Fallback) | Viele Animationen bei ≤ 4 ms pro Frame |
| Analysieren-Ebene | TanStack Table | Ein Tabellen-Baustein für alle Ansichten, virtualisiert |
| Audio | Howler.js | Web Audio mit einfachem Mischpult |
| UI-Zustand | Zustand (oder Redux Toolkit) | Ein Store für Anzeigemodell und UI-Zustand |
| Tests | Vitest, fast-check, Playwright | Einheit, Eigenschaften, Oberfläche |
| Spielstände | JSON mit Schema-Version, komprimiert | Einfach, versionierbar, migrierbar |
| Desktop | Tauri (bevorzugt) oder Electron | Steam-Auslieferung ohne Code-Umbau |

## 4 Ordnerstruktur

```
src/
  sim/                Kern, keine UI-Importe (per Lint-Regel erzwungen)
    tick.ts           verbindliche Tick-Reihenfolge
    rng.ts            Seed-Ströme, num.ts Festkomma-Helfer, tables/ Nachschlagetabellen (5.9)
    model/            Typen aller Entitäten (Quelle für JSON Schema)
    systems/          kern, produkte, engines, lizenzen, marketing, betrieb,
                      firma, markt, ki, uebernahmen, ziele, ereignisse
    view/             Aufbau des Anzeigemodells und der Deltas
  worker/             Worker-Einstieg, Protokoll
  ui/                 React-Oberfläche
    screens/          acht Hauptbildschirme
    viz/              Visualisierungs-Bausteine
    stage/            PixiJS-Bühne und Büro-Ansicht
    audio/
  mods/               Ladepipeline, Validierung, Konflikte
data/
  base/               Grundspiel als Mod (mod.json + Daten)
  texts/              Texte (de, en)
  audio/, art/        Assets
tools/
  simulate.ts         Headless-Läufe, Balancing-Berichte; tables.ts erzeugt die Tabellen
  schema.ts           JSON Schema aus Typen
  textcheck.ts        Prüfskript für Texte
tests/
  unit/ property/ golden/ ui/
CLAUDE.md
```

## 5 Regeln

### 5.1 Kern

- **TEC-R01** \[1.0\] Der Spielstand ist ein reines, serialisierbares Datenobjekt ohne Klasseninstanzen und Funktionen.
- **TEC-R02** \[1.0\] Ein Tick ist eine Funktion `tick(state, eingaben) → state`; sie hat keine Seiteneffekte außer dem Rückgabewert.
- **TEC-R03** \[1.0\] Zufall entsteht nur aus Seed-Strömen; jedes System hat einen eigenen Strom (`rng.stream("markt")`), damit ein neues System die Ergebnisse anderer nicht verändert.
- **TEC-R04** \[1.0\] Gleicher Seed, gleiche Mods und gleiche Eingaben ergeben bitgleich denselben Spielstand.
- **TEC-R05** \[1.0\] Geld ist eine ganze Zahl in Cent, alle übrigen Werte sind bp (1,0 = 10.000). Gerechnet wird nur mit den Helfern aus 5.9; jeder Schritt schneidet zur Null hin ab. Fließkomma gibt es nur in der Oberfläche (A22).
- **TEC-R06** \[1.0\] Alle Balancing-Werte stehen in data/, nie im Code; der Code kennt nur Parameternamen.
- **TEC-R07** \[1.0\] Jede für den Spieler sichtbare Berechnung liefert ihre Aufschlüsselung mit (Faktor, Beitrag, Ziel-Objekt).
- **TEC-R08** \[1.0\] Kern-Code importiert nichts aus ui/ oder worker/; ein Lint-Regelsatz prüft das im CI.
- **TEC-R09** \[1.0\] Iteration über Sammlungen erfolgt in stabiler Reihenfolge (nach ID), nie nach Einfügereihenfolge von Hash-Maps.

### 5.2 Tick-Reihenfolge (verbindlich)

| # | Schritt | Inhalt | Rhythmus |
| --- | --- | --- | --- |
| 1 | Eingaben und Regeln | Entscheidungen des Spielers anwenden, danach Delegationsregeln und Produzenten | jeder Tick |
| 2 | Kalender | Datum, Epochen-Freischaltungen, geplante Termine (Messen, Konsolenstarts, Devkit-Wellen, Store-Aktionen) | jeder Tick |
| 3 | KI | Entscheidungen aller KI-Firmen auf dem Stand der Vorwoche, sortiert nach Firmen-ID | jeder Tick |
| 4 | Forschung und Engine | Modulfortschritt, Anforderungen, Schuld, Updates | jeder Tick |
| 5 | Projekte | Fortschritt, Bugs, Phasen, Gates, Playtests, Engine-Bindung | jeder Tick |
| 6 | Releases | Wertungen und Verkaufsstart der Releases dieser Woche | jeder Tick |
| 7 | Markt | Interesse, Konkurrenzdichte, Verkäufe, Piraterie; Plattform-Basis und Trends | Tick; Basis/Trends monatlich |
| 8 | Betrieb | Live-Services, Churn, Support, Server | jeder Tick |
| 9 | Lizenzen | Gebühren, Kundenstatus, Anfragen | jeder Tick |
| 10 | Finanzen | Einnahmen, Kosten, Kredite, Insolvenzprüfung; Börse | Tick; Börse quartalsweise |
| 11 | Personal | Moral, Burnout, Loyalität, Abwerbung, Bewerber | monatlich |
| 12 | Ereignisse | Auslöser prüfen, Ketten fortschreiben, höchstens ein Entscheidungsangebot erzeugen | jeder Tick |
| 13 | Abschluss | Berichte, Chronik, Autosave-Punkt, Anzeige-Delta | jeder Tick |

**Begründung:** Eingaben zuerst, damit Spielerentscheidungen sofort wirken. KI auf dem Stand der Vorwoche, damit die KI-Reihenfolge keine Rolle spielt und KI und Spieler gleich informiert sind. Technik vor Projekten, damit eine fertige Engine-Stufe im selben Tick nutzbar ist. Releases vor dem Markt, damit Erstverkäufe in derselben Woche zählen. Finanzen nach allen Einnahmen und Kosten. Ereignisse zuletzt, damit sie den vollständigen Zustand der Woche sehen.

- **TEC-R10** \[1.0\] Die Schritte laufen in genau dieser Reihenfolge; jeder Schritt liest den Zustand nach dem vorherigen Schritt, außer KI (Schritt 3), die einen Schnappschuss vom Ende der Vorwoche liest.
- **TEC-R11** \[1.0\] Konflikt bei gleichzeitigen Geboten (Lizenz, Übernahme, Schlüsselperson, Devkit-Platz): höchstes Gebot gewinnt, bei Gleichstand die bessere Beziehung, dann die niedrigere Firmen-ID.
- **TEC-R12** \[1.0\] Konflikt bei gleicher Ressource (Engine-Team, Ausstattungsplatz): Priorität des Spielers bzw. der Regel, dann frühere Anforderung, dann Projekt-ID.
- **TEC-R13** \[1.0\] Schritt 12 erzeugt höchstens ein Welt-Entscheidungsangebot pro Woche (A23). Projekt-Gates hängen am Projekt und zählen nicht gegen diese Obergrenze. Weitere Welt-Ereignisse warten nach Priorität und verfallen nach 2–4 Wochen mit der angezeigten Standardantwort; Krisenketten belegen den Platz statt zusätzlich zu kommen.
- **TEC-R14** \[1.0\] Monatsjobs laufen im Wochen-Tick, der den Monatsersten enthält, also in der ersten Woche jedes Monats im Kalender 4/4/5 (Wochen 1, 5, 9, 14, 18, 22, …), an ihrer Stelle in der Reihenfolge. Quartalsjobs laufen in den Wochen 1, 14, 27 und 40 (A13, KRN-R12).

### 5.3 Worker-Protokoll

| Richtung | Nachricht | Inhalt |
| --- | --- | --- |
| UI → Worker | `start` | Seed, Einstellungen, Mod-Liste |
| UI → Worker | `load` / `save` | Spielstand-Datei bzw. Anforderung |
| UI → Worker | `input` | Eingabe-Objekt (Entscheidung, Zuweisung, Regel, Einstellung) mit Ziel-Tick |
| UI → Worker | `time` | Pause, Tempo 1/2/4, bis zum nächsten Ereignis, einen Anzeigeschritt vor (Woche oder Monat) |
| UI → Worker | `undo` | Letzte Zuweisung im laufenden Tick zurücknehmen |
| UI → Worker | `query` | Analysieren-Ebene: Tabellendaten, Aufschlüsselung eines Werts |
| Worker → UI | `delta` | Anzeige-Delta nach jedem Tick |
| Worker → UI | `events` | Ereignisse für Audio und Juice (Hit, Flop, Freischaltung …) |
| Worker → UI | `paused` | Grund der Pause (Entscheidung, Ergebnis, Haltepunkt) |
| Worker → UI | `error` | Fehler mit Code, Mod-Bezug, Spielstand bleibt erhalten |

- **TEC-R20** \[1.0\] Die UI sendet nur Eingaben, nie Zustandsänderungen; der Worker validiert jede Eingabe gegen den aktuellen Zustand.
- **TEC-R21** \[1.0\] Der Worker liefert pro Tick nur ein Anzeige-Delta (geänderte Teilbäume mit Pfad); der volle Zustand wird nur bei Laden und auf Anfrage übertragen.
- **TEC-R22** \[1.0\] Bei 4× Tempo bündelt der Worker Deltas, sodass die UI höchstens 10 Deltas pro Sekunde erhält.
- **TEC-R23** \[1.0\] Eingaben tragen eine laufende Nummer; Undo nimmt nur die letzte Eingabe vom Typ Zuweisung im laufenden Tick zurück.

### 5.4 Datenformate, Schema und Ladepipeline

- **TEC-R30** \[1.0\] Die TypeScript-Typen in sim/model sind die einzige Quelle; tools/schema.ts erzeugt daraus JSON Schemas für Daten, Mods und Spielstände.
- **TEC-R31** \[1.0\] Das Grundspiel liegt als Paket data/base mit mod.json vor und wird über dieselbe Ladepipeline geladen wie jeder Mod.
- **TEC-R32** \[1.0\] Mods ändern Datensätze per ID mit den Operationen hinzufügen, Felder ändern, entfernen; Konflikte (gleiches Feld) löst die Ladereihenfolge, der später geladene gewinnt und wird gemeldet.
- **TEC-R33** \[1.0\] Jede Datei wird beim Laden gegen ihr Schema geprüft; ein fehlerhafter Mod wird mit Datei und Stelle gemeldet und deaktiviert, das Spiel startet weiter.
- **TEC-R34** \[1.0\] Die zusammengeführten Daten werden nach dem Laden eingefroren (unveränderlich) und erhalten eine Prüfsumme, die im Spielstand gespeichert wird.

### 5.5 Spielstände

- **TEC-R40** \[1.0\] Jeder Spielstand enthält Schema-Version, Spielversion, Seed, Einstellungen, aktive Mods mit Version und Daten-Prüfsumme.
- **TEC-R41** \[1.0\] Für jede Schema-Version gibt es eine Migrationsfunktion auf die nächste; alte Spielstände werden schrittweise migriert und nie überschrieben, bevor die Migration erfolgreich war.
- **TEC-R42** \[1.0\] Spielstände werden als JSON mit gzip (Browser: CompressionStream) gespeichert; Ziel ≤ 5 MB im Jahr 2040.
- **TEC-R43** \[1.0\] Autosave nach jedem Jahresrückblick und im eingestellten Intervall; rotierend über die eingestellte Zahl an Slots; Ironman nutzt genau einen Slot.
- **TEC-R44** \[1.0\] Fehlt beim Laden ein Mod, fallen dessen Objekte auf Ersatzobjekte zurück (z. B. Genre „Unbekannt“), und der Spieler wird gewarnt; der Spielstand bleibt ladbar.
- **TEC-R45** \[1.0\] Ein Spielstand speichert zusätzlich das Eingabeprotokoll der letzten 52 Wochen, damit Fehler reproduziert werden können (abschaltbar).

### 5.6 Leistung

| Ziel | Wert | Messmethode |
| --- | --- | --- |
| Wochen-Tick | ≤ 50 ms (2040, 60 Studios, 3.000 Produkte) | Benchmark-Spielstand, Median von 200 Ticks im Worker, Mittelklasse-PC (Referenz: 6 Kerne, 16 GB, 2020er-Generation) |
| Monatsjobs | ≤ 150 ms | wie oben, nur Wochen-Ticks mit Monatsjobs |
| Spielstand | ≤ 5 MB komprimiert | Benchmark-Spielstand 2040 |
| Laden | ≤ 3 s | Kaltstart bis bedienbare Zentrale |
| UI | 60 fps | Playwright-Trace beim Ansichtswechsel und Scrollen |
| Bühne | ≤ 4 ms pro Frame | PixiJS-Ticker, 40 Figuren, 60 s |
| Headless-Lauf 1980–2040 | ≤ 60 s | tools/simulate.ts in Node, ohne UI |

- **TEC-R50** \[1.0\] Jedes Ziel hat einen automatischen Benchmark im CI; eine Verschlechterung um mehr als 15 % gegenüber dem Hauptzweig lässt den Lauf scheitern.
- **TEC-R51** \[1.0\] Produkte ohne nennenswerte Verkäufe (unter 1 % des Spitzenwerts, älter als 3 Jahre) werden in einer Sammelrechnung als Back-Catalog-Block gerechnet statt einzeln.
- **TEC-R52** \[1.0\] Kleine KI-Studios (außerhalb der Rivalen) entscheiden monatlich statt wöchentlich, außer bei Ereignissen, die sie direkt betreffen.

### 5.7 Tests

| Art | Was | Werkzeug | Wann |
| --- | --- | --- | --- |
| Einheitstests | Mindestens ein Test je Regel-ID aus S01–S10 (Testname enthält die ID, z. B. `PRD-R12`) | Vitest | jeder Commit |
| Eigenschaftstests | Invarianten: alle Kernwerte sind ganze Zahlen (Cent oder bp, Number.isSafeInteger), keine negativen Bestandswerte, Summe der Marktanteile = 10.000 bp, Prognose-Spanne enthält den Mittelwert | fast-check | jeder Commit |
| Determinismus | Gleicher Seed + gleiche Eingaben → gleiche Prüfsumme nach 520 Wochen; zweimal hintereinander und in Browser und Node. Nächtlich über 60 Spieljahre (TEC-R89) | Vitest + Node | jeder Commit |
| Golden-Runs | 5 gespeicherte Verläufe (Seeds × Bot-Strategien) mit Prüfsummen je Jahrzehnt; Änderungen müssen bewusst neu freigegeben werden | Vitest | jeder Commit |
| Migrationstests | Jeder frühere Spielstand im Archiv lädt und läuft 52 Wochen weiter | Vitest | jeder Commit |
| Balancing-Läufe | 1980–2040, je Bot-Strategie 20 Seeds; Bericht mit den Kennzahlen aus Balancing (Insolvenzen, Marktanteil, Lizenz-Engine-Anteil, Wertung, Geld, Entscheidungen pro Jahr, Anteil Wochen ohne Entscheidungsangebot) | tools/simulate.ts | nächtlich |
| Leistungs-Benchmarks | Ziele aus 5.6 | Node + Playwright | jeder Merge |
| UI-Tests | Abnahmetests aus S11 (Tastatur, Controller-Simulation, Breakpoints, reduzierte Animationen) | Playwright | jeder Merge |
| Text- und Mod-Prüfung | Schema, Platzhalter, Sperrliste echter Namen, fehlende Übersetzungen | tools/textcheck.ts | jeder Commit |
| Numerik | Helfer gegen Referenz in Dezimal-Arithmetik, Abschneiden zur Null, Mindestnenner, Prüfsummen der Tabellen | Vitest + fast-check | jeder Commit |
| Determinismus 60 Jahre | 3 Seeds, 1980–2040, Node gegen Chromium und Firefox im Worker; Prüfsumme nach jedem Jahr | Node + Playwright | nächtlich |

**Bot-Strategien:** nur Sequels, nur Lizenzen (nie eigene Engine), immer eigene Engine, nur MMO/Live-Service, Engine-Anbieter (viele Lizenzen), zufällig, „gieriger Spieler“ (maximiert kurzfristigen Gewinn). Keine Strategie darf in mehr als 60 % der Seeds gewinnen. Kennzahl Entscheidungsdichte: In den 1980ern liegt der Anteil Wochen ohne Entscheidungsangebot oder Projekt-Gate je Seed unter 60 % (Einstellung normal, KRN-T12).

- **TEC-R60** \[1.0\] Ein Merge in den Hauptzweig ist nur möglich, wenn Einheits-, Eigenschafts-, Determinismus-, Golden-, Migrations- und Textprüfungen grün sind.
- **TEC-R61** \[1.0\] Jede Regel-ID in S01–S10 ist mindestens einem Test zugeordnet; ein Skript meldet Regeln ohne Test.

### 5.8 CI, Telemetrie, Auslieferung

- **CI:** GitHub Actions mit Stufen Lint (inkl. Kern-Importsperre) → Typprüfung → Tests → Benchmarks → Build (Web und Desktop) → nächtliche Balancing-Läufe mit Bericht als Artefakt.
- **TEC-R70** \[1.0\] Telemetrie ist ausschließlich Opt-in, anonym, abschaltbar und sendet nur aggregierte Spielkennzahlen (Spielzeit, Freischaltungen, Abbrüche, Absturzberichte); keine Spielstände ohne ausdrückliche Zustimmung.
- **Desktop:** Tauri (kleine Pakete, nativer Dateizugriff); Electron als Ausweichweg, falls Steamworks-Anbindung unter Tauri zu aufwändig ist. Ziele: Windows, Linux (Steam Deck), macOS.
- **Steam-Integration:** Workshop (Abonnieren, automatische Updates, Sammlungen), Erfolge (aus S10, keine bei Balancing-Mods), Cloud-Save (Slots synchronisiert), Rich Presence (Jahr, Firmenname). Ohne Steam: Mod-Ordner und lokale Spielstände.
- **TEC-R71** \[1.0\] Steam-Funktionen sind über eine Plattform-Schicht gekapselt; das Spiel läuft vollständig ohne Steam (Web, DRM-frei).
- **Versionierung:** Semantische Versionen; jede Version nennt Schema-Version und Daten-Prüfsumme des Grundspiels.

### 5.9 Numerik (Festkomma, verbindlich)

Dieser Abschnitt setzt Abgleich A22 um und gilt für alle Spezifikationen: Wo dort „float“, Faktor, Anteil oder Prozent steht, rechnet der Kern in bp. Die Helfer liegen in src/sim/num.ts.

- TEC-R80 \[1.0\] Kernwerte sind nur ganze Zahlen. Geld hat den Typ cent (ganze Cent). Anteile, Faktoren, Gewichte, Wahrscheinlichkeiten und Exponenten haben den Typ bp (1,0 = 10.000; 3 % = 300). Felder, die eine Spezifikation als float nennt, sind bp.
- TEC-R81 \[1.0\] Multipliziert und geteilt wird nur über Helfer: mulBp(a, b) = trunc(a · b / 10.000), divBp(a, b, minNenner) = trunc(a · 10.000 / b), mulDiv(a, b, c, minNenner) = trunc(a · b / c). Es gibt genau eine Rundungsregel: Abschneiden zur Null hin. Überschreitet ein Zwischenprodukt 2^53, rechnet der Helfer intern mit BigInt; das Ergebnis bleibt gleich.
- TEC-R82 \[1.0\] Division durch null ist verboten. Jeder Teil-Helfer verlangt einen Mindestnenner und rechnet mit max(|b|, minNenner) und dem Vorzeichen von b (null zählt als positiv). Ein Aufruf ohne Mindestnenner ist ein Typfehler.
- TEC-R83 \[1.0\] exp, tanh, ln, pow und die inverse Normalverteilung kommen nur aus den Nachschlagetabellen unten. Der Index ist das Argument, abgeschnitten auf die Schrittweite; es gibt keine Interpolation. Argumente außerhalb des Bereichs werden mit clamp auf den Rand gesetzt.
- TEC-R84 \[1.0\] clamp(x, lo, hi) ist der einzige Begrenzer. Jede Formel mit Grenzen (Schwund, Anteile, Kurs, Moral) nutzt ihn.
- TEC-R85 \[1.0\] tools/tables.ts erzeugt die Tabellen beim Build mit Dezimal-Arithmetik hoher Genauigkeit und legt sie als JSON in src/sim/tables/ ab, mit Versionsnummer und Prüfsumme. Die Tabellenversion steht im Spielstand. Eine neue Version gilt wie eine Schema-Änderung: Golden-Runs müssen bewusst neu freigegeben werden.
- TEC-R86 \[1.0\] Zufall: Ein Strom liefert uint32. Gleichverteilt in bp ist trunc(u · 10.000 / 2^32). Für eine Normalverteilung zieht der Strom einen Index 0–4.095 in die Tabelle invNorm; Wert = Mittelwert + mulBp(invNorm\[i\], Streuung).
- TEC-R87 \[1.0\] In src/sim sind außerhalb von num.ts verboten: Math.exp, Math.pow, Math.log, Math.sqrt, Math.random, Fließkomma-Literale und der Operator / . Ein Lint-Regelsatz prüft das im CI. Ganzzahlige Produkte (Menge × Preis in Cent) sind erlaubt, Eigenschaftstests prüfen Number.isSafeInteger.
- TEC-R88 \[1.0\] Erst das Anzeigemodell rechnet bp und Cent in Anzeigewerte um (Prozent mit einer Nachkommastelle, Faktoren mit zwei, Geld nach Sprache).
- TEC-R89 \[1.0\] Der Determinismus-Test läuft nächtlich über 60 Spieljahre (1980–2040, 3.120 Wochen) mit 3 Seeds, einmal in Node und einmal je Browser (Chromium, Firefox) im Worker, vor einem Release auch in der Tauri-WebView. Die Prüfsummen müssen nach jedem Spieljahr gleich sein. Pro Commit läuft die kurze Fassung über 10 Jahre (TEC-T01).

**Nachschlagetabellen** (src/sim/tables/, erzeugt von tools/tables.ts):

| Tabelle | Argument | Bereich und Schritt | Einträge | Verwendung |
| --- | --- | --- | --- | --- |
| exp(−x) | x in bp | 0–10,0 in Schritten von 0,001 | 10.001 | Verfall, Abklingen, Hype, Trends |
| tanh(x) | x in bp | −5,0 bis +5,0 in Schritten von 0,001 | 10.001 | Sättigung (Attraktivität, Interesse) |
| ln(x) | x in bp | 0,01–100 in Schritten von 0,01; außerhalb x = m · 10^k mit ln 10 als Konstante | 10.000 | Ruf, Preis-Elastizität, Skalen |
| pow(x; 0,6) | x in bp | 0–100 in Schritten von 0,01 | 10.001 | Skaleneffekte (Teamgröße, Budget) |
| pow(x; 0,85) | x in bp | 0–100 in Schritten von 0,01 | 10.001 | Kostenkurven, Abnutzung |
| pow(x; e) weitere | x in bp | wie oben; je Exponent eine eigene Tabelle aus data/base/numerics.json | 10.001 | nur bei Bedarf, per Datenänderung |
| invNorm(p) | Index 0–4.095 | p = (i + 0,5) / 4.096 | 4.096 | Streuung von Wertungen, Verkäufen, Fähigkeiten |
| clamp(x, lo, hi) | – | Funktion, keine Tabelle | – | alle Grenzen |

## 6 Arbeitsweise mit Claude Code

**Etappen:** 0 Prototyp (3–4 Wochen) → 1 Kern → 2 Engines → 3 KI und Lizenzen → 4 Marketing und Release (danach Early Access) → 5 Live-Betrieb → 6a/6b Ausbau → 1.0 → 1.1 Büro-Ansicht. Jede Etappe endet mit einem spielbaren Stand und ihren Abnahmekriterien.

**Etappe 0 – Prototyp:** Nur Kernschleife (Projekt anlegen mit Genre, Thema und drei Feature-Karten, entwickeln, Wertung mit Aufschlüsselung, zweites Projekt), schlichte Oberfläche ohne Bühne, Kern bereits im Worker mit Seed. Frage: Macht ein einzelnes Projekt Spaß? Ergebnis entscheidet über Etappe 1.

**Vorgehen je Aufgabe:**

1. Eine Aufgabe = ein System oder ein Bildschirm, mit Verweis auf die Regel-IDs der Spezifikation.
2. Zuerst Typen in sim/model und Daten in data/base, dann Regeln mit Tests je Regel-ID, dann Anzeigemodell, zuletzt UI.
3. Nach jeder Aufgabe: Tests, Determinismus, Golden-Runs; bei Balancing-Änderungen tools/simulate.ts.
4. Änderungen an Regeln zuerst in der Spezifikation, dann im Code.
5. Jeder Schritt als eigener Commit; misslungene Schritte per Git zurücknehmen.

**Vorschlag CLAUDE.md:**

```markdown
# Game Studio Tycoon – Projektregeln

## Quellen
- Spezifikation: Tabs S01–S13 + Datenblatt (verbindlich). Design-Dokument = Begründung.
- Regel-IDs (z. B. PRD-R12) in Commit-Nachrichten und Testnamen nennen.

## Architektur
- src/sim ist reiner Kern: keine Importe aus ui/ oder worker/, keine Seiteneffekte.
- tick(state, eingaben) -> state; Reihenfolge nur in src/sim/tick.ts (S12 5.2).
- Zufall nur über rng.stream("<system>"); nie Math.random, nie Date.now im Kern.
- Geld in ganzen Cent, alle anderen Werte in bp (1,0 = 10.000); rechnen nur mit src/sim/num.ts (mulBp, divBp mit Mindestnenner, Tabellen). Kein Math.exp/pow/log und kein / im Kern. Iteration immer nach ID sortiert.
- Alle Zahlen für Balancing in data/base/*.json, nie im Code.
- Jede sichtbare Berechnung liefert ihre Aufschlüsselung.
- UI liest nur das Anzeigemodell und sendet Eingaben an den Worker.
- Kein Text im Code: data/texts, de und en.

## Arbeitsweise
- Eine Aufgabe pro Etappe/Teilsystem. Erst Typen und Daten, dann Regeln + Tests, dann Anzeige, dann UI.
- Vor jedem Commit: npm run check (lint, typecheck, test, determinism, golden).
- Balancing-Änderungen: npm run simulate und Bericht prüfen.
- Golden-Runs nur bewusst neu freigeben (npm run golden:update) mit Begründung.
- Schema geändert? Migration schreiben und Schema-Version erhöhen.

## Verboten
- Echte Firmen-, Marken-, Spiele- oder Personennamen in Daten und Texten.
- Freier Bürobau, Multiplayer-Code (zurückgestellt).
```

## 7 Schnittstellen

| System | Bezug zu S12 |
| --- | --- |
| S01 Kern | Tick-Reihenfolge, Seed-Ströme, Ereignis-Warteschlange, Spielstand |
| S02–S09 | Jedes System ist ein Modul in sim/systems mit eigenem Seed-Strom und Tests je Regel-ID |
| S10 Modding | Ladepipeline, Schemas, Mod-Konflikte, Workshop |
| S11 Oberfläche | Worker-Protokoll, Anzeige-Delta, Leistungsziele für UI und Bühne |
| S13 Ausbau | Architektur-Anforderungen für spätere Inhalte (u. a. Determinismus für Multiplayer) |

## 8 Abnahmetests

- **TEC-T01** Gegeben Seed 42 und ein aufgezeichnetes Eingabeprotokoll über 10 Spieljahre, wenn der Lauf zweimal sowie einmal in Node und einmal im Browser ausgeführt wird, dann sind alle Prüfsummen gleich.
- **TEC-T02** Gegeben ein neues System mit eigenem Seed-Strom, wenn es hinzugefügt wird, dann ändern sich die Ergebnisse der übrigen Systeme in den Golden-Runs nicht (außer, wo sie das neue System bewusst lesen).
- **TEC-T03** Gegeben der Benchmark-Spielstand 2040, wenn 200 Wochen-Ticks laufen, dann ist der Median ≤ 50 ms und ein Wochen-Tick mit Monatsjobs ≤ 150 ms.
- **TEC-T04** Gegeben der Benchmark-Spielstand 2040, wenn gespeichert wird, dann ist die Datei ≤ 5 MB und lädt in ≤ 3 s.
- **TEC-T05** Gegeben ein Headless-Lauf 1980–2040, wenn tools/simulate.ts läuft, dann ist er in ≤ 60 s fertig und schreibt einen Bericht mit allen Balancing-Kennzahlen.
- **TEC-T06** Gegeben ein Spielstand der Schema-Version n−2, wenn er geladen wird, dann wird er über zwei Migrationen aktualisiert und läuft 52 Wochen ohne Fehler.
- **TEC-T07** Gegeben ein Mod mit Schemafehler, wenn das Spiel startet, dann wird der Mod mit Datei und Stelle gemeldet, deaktiviert, und das Spiel startet.
- **TEC-T08** Gegeben eine UI-Komponente, die etwas aus src/sim importiert, das kein Typ ist, wenn der Linter läuft, dann schlägt er fehl (und umgekehrt für Kern-Importe aus ui/).
- **TEC-T09** Gegeben 4× Tempo, wenn 10 s gespielt wird, dann erhält die UI höchstens 100 Deltas und bleibt bei 60 fps.
- **TEC-T10** Gegeben kein Steam-Client, wenn die Desktop-Version startet, dann sind alle Spielfunktionen nutzbar; nur Workshop, Erfolge und Cloud-Save fehlen.
- TEC-T11 Gegeben 3 Seeds und ein Bot-Lauf 1980–2040, wenn er in Node, Chromium und Firefox läuft, dann sind die Prüfsummen nach jedem der 60 Spieljahre gleich.
- TEC-T12 Gegeben mulBp(−15.001, 3) und divBp(7, 0, 1), wenn sie rechnen, dann ist das Ergebnis −4 (abgeschnitten zur Null) bzw. 70.000 (Mindestnenner 1) und es entsteht kein NaN oder Infinity.
- TEC-T13 Gegeben eine geänderte Tabelle in tools/tables.ts, wenn gebaut wird, dann ändern sich Tabellenversion und Prüfsumme, und die Golden-Runs schlagen bis zur bewussten Freigabe fehl.
- TEC-T14 Gegeben eine Kern-Datei mit Math.pow oder einem Fließkomma-Literal außerhalb von num.ts, wenn der Linter läuft, dann schlägt er fehl.
- TEC-T15 Gegeben die nächtlichen Balancing-Läufe, wenn der Bericht entsteht, dann nennt er je Bot-Strategie den Anteil Wochen ohne Entscheidungsangebot in den 1980ern; über 60 % markiert der Bericht rot.

## 9 Spätere Versionen

- **1.1:** Büro-Ansicht im selben PixiJS-Renderer (keine Änderung am Kern).
- **Später:** Skript-Schnittstelle für Code-Mods in einer Sandbox (z. B. QuickJS im Worker) mit festen Einstiegspunkten; Konsolen-Portierung (Controller-Unterstützung ist vorbereitet); Multiplayer nur, wenn der deterministische Kern erhalten bleibt (Lockstep über Eingabeprotokolle, siehe S13).

## Änderungen nach Prüfung 3

- Zeitmodell: Ein Tick ist immer eine Woche, der Monat nur Anzeige (Begriff Tick, Worker-Nachricht time, KRN-R01).
- Monatsjobs in der ersten Woche des Monats, Quartalsjobs in den Wochen 1, 14, 27, 40 (Begriff Monatsjob, TEC-R14, Leistungsziel Monatsjobs, TEC-T03).
- Numerik nach A22: neuer Abschnitt 5.9 mit Typen cent und bp, Helfern mit Abschneiden zur Null und Mindestnenner, Nachschlagetabellen und Lint-Sperre (TEC-R05, TEC-R80 bis TEC-R89, TEC-T12 bis TEC-T14, CLAUDE.md). Jedes „float“ in allen Spezifikationen ist bp.
- Determinismus über 60 Spieljahre in Node und Browsern (TEC-R89, TEC-T11, Testtabelle).
- Kennzahl „Anteil Wochen ohne Entscheidungsangebot < 60 % in den 1980ern“ in Balancing-Läufen und Bot-Strategien (TEC-T15).
- Ereignis-Obergrenze nach A23: Projekt-Gates zählen nicht mit, Welt-Ereignisse verfallen nach 2–4 Wochen (TEC-R13). Ordnerstruktur nennt num.ts, tables/ und tools/tables.ts.
- Offen: Die Tabellenbereiche (z. B. ln bis 100, pow bis 100) sind an den tatsächlichen Wertebereichen der Formeln aus S02–S09 zu prüfen.
