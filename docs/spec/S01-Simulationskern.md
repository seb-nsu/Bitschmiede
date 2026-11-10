# S01 Simulationskern: Zeit, Tick, Zufall, Ereignisse, Speichern

**Version:** 1.0, Stand 29.10.2026 · **Quelle:** Kern-Spielschleife, Spielerlebnis und Bedienung, Technik und Architektur · **Prefix:** KRN

## 1 Zweck und Abgrenzung

Der Simulationskern führt die Spielwelt Tick für Tick weiter. Er legt Zeit, Reihenfolge, Zufall, Ereignisse, Freischaltungen und Spielstand fest. Er enthält keine Fachlogik einzelner Systeme; diese stehen in S02 bis S10 und werden vom Kern in fester Reihenfolge aufgerufen. Er läuft ohne Oberfläche in einem Web Worker (siehe S12).

## 2 Begriffe

| Begriff | Bedeutung |
| --- | --- |
| Tick | Ein Simulationsschritt von genau einer Woche. Ein Monat ist nur eine Anzeigebündelung von 4 oder 5 Ticks |
| Tick-Phase | Einer der 13 festen Schritte innerhalb eines Ticks |
| Seed | Startwert des Zufallsgenerators; gleicher Seed und gleiche Eingaben ergeben denselben Verlauf |
| Strom | Unabhängiger Zufallsgenerator pro System, abgeleitet aus dem Seed |
| Eingabe | Eine Entscheidung des Spielers oder einer Regel, die im nächsten Tick angewendet wird |
| Ereignis | Meldung mit Klasse Entscheidung, Ergebnis oder Information |
| Entscheidungsangebot | Ereignis der Klasse Entscheidung, das der Spieler beantworten muss |
| Ereigniskette | Folge von Ereignissen mit Stufen, Optionen und verzögerten Folgen |
| Freischaltung | Ein System oder eine Ansicht, die ab einer Bedingung verfügbar wird |
| Aufschlüsselung | Liste der Teilbeiträge, aus denen ein angezeigter Wert entsteht |
| Anzeige-Delta | Die Änderungen am Anzeigemodell, die der Worker nach jedem Tick an die Oberfläche schickt |
| Anzeigeeinheit | Monat oder Woche; bestimmt nur, wie die Oberfläche Wochen-Ticks bündelt (KRN-R01) |
| Basispunkt (bp) | Ganzzahliger Festkommawert, 1,0 = 10.000 bp. Wo eine Spezifikation „float“ schreibt, ist bp gemeint (S12, Numerik) |
| Startprofil | Ausgangslage des Spielerstudios nach Profil und Startjahr (KRN-R70) |
| Weltgenerator | Erzeugt beim Start KI-Studios, Rivalen, Plattformen, Marken und die Vorgeschichte (KRN-R75) |
| Entscheidungsdichte | Einstellung ruhig, normal oder dicht; ändert nur Angebote, nie Krisen (KRN-R39) |

## 3 Daten

| Entität/Feld | Typ | Einheit/Bereich | Bedeutung |
| --- | --- | --- | --- |
| **GameState**.schemaVersion | int | ≥ 1 | Version des Spielstand-Schemas |
| GameState.seed | string | 16 Hex-Zeichen | Seed des Spielstands |
| GameState.date | {year:int, week:int} | 1980–2100, 1–52 | Aktuelles Datum |
| GameState.displayUnit | enum | monat, woche | Anzeigeeinheit der Zeit (früher tickMode); simuliert wird immer in Wochen-Ticks (KRN-R01) |
| GameState.rngStates | map\<string, uint32\[4\]> | – | Zustand jedes Zufallsstroms |
| GameState.settings | id\<Settings> | – | Einstellungen (S10) |
| GameState.unlocks | set\<UnlockId> | – | Freigeschaltete Systeme und Ansichten |
| GameState.eventQueue | list\<EventInstance> | – | Offene Entscheidungen und Ergebnisse |
| GameState.chains | list\<ChainState> | – | Laufende Ereignisketten |
| GameState.inputs | list\<Input> | – | Eingaben für den nächsten Tick |
| GameState.chronicle | list\<ChronicleEntry> | – | Einträge für Jahrbuch und Spielende |
| **EventDef**.id | string | – | Kennung in data/events/\*.json |
| EventDef.class | enum | entscheidung, ergebnis, information | Klasse |
| EventDef.trigger | Condition | – | Auslösebedingung (siehe 5.4) |
| EventDef.weight | bp | 0–100.000 (entspricht 0–10,0) | Gewicht bei der Auswahl |
| EventDef.cooldownWeeks | int | 0–520 | Mindestabstand bis zur Wiederholung |
| EventDef.options | list\<Option> | 1–4 | Antwortoptionen mit Folgen |
| EventDef.unlockAfter | UnlockId? | – | Nur aktiv, wenn freigeschaltet |
| **EventInstance**.defId | string | – | Verweis auf EventDef |
| EventInstance.createdAt | Date | – | Erzeugungsdatum |
| EventInstance.deadline | Date? | – | Frist für Entscheidungen; danach greift die Standardoption |
| EventInstance.context | map\<string, id> | – | Beteiligte Objekte ({spiel}, {firma} …) |
| **Option**.id | string | – | Kennung |
| Option.effects | list\<Effect> | – | Sofortige Folgen |
| Option.delayed | list<{inWeeks:int, chance:bp, effects:list\<Effect>}> | 1–260 Wochen | Verzögerte Folgen |
| Option.isDefault | bool | – | Wird bei Fristablauf gewählt |
| **ChainDef**.stages | list\<EventDef> | 2–5 | Stufen der Kette |
| ChainState.stage | int | – | Aktuelle Stufe |
| ChainState.memory | map\<string, any> | – | Gewählte Optionen und Werte der Kette |
| **Input**.type | enum | – | Art der Eingabe (z. B. projektStarten, optionWählen) |
| Input.payload | object | – | Daten der Eingabe |
| Input.source | enum | spieler, regel, produzent | Herkunft (für das Regelprotokoll) |
| **Breakdown** | list<{label:string, value:bp oder cent, ref:id?}> | – | Aufschlüsselung eines Werts |
| **ChronicleEntry** | {date, kind, text, refs} | – | Eintrag der Chronik |
| **SaveSlot** | {id, name, date, version, mods, size} | ≤ 5 MB | Metadaten eines Spielstands |
| GameState.startProfile | enum | garage, kleinesStudio, etabliertesStudio, engineFirma | Gewähltes Startprofil (KRN-R70) |
| GameState.decisionDensity | enum | ruhig, normal, dicht | Entscheidungsdichte (KRN-R39) |
| StartProfileDef.money | int | Cent, > 0 | Startgeld je Profil und Startjahr |
| StartProfileDef.engineOffset | int | −2 bis +1 | Engine-Stufen relativ zum Stand der Technik |
| WorldGenDef.studioCount | int | 20–60 | Zahl der KI-Studios beim Start |

Alle Felder, die in einer Spezifikation als float stehen, speichert der Kern als bp (ganze Zahl, 1,0 = 10.000). Geld ist immer eine ganze Zahl in Cent. Rechenregeln und Tabellen stehen in S12, Abschnitt Numerik.

## 4 Regeln

**Zeit**

- KRN-R01 \[1.0\] Die Simulation rechnet immer in Wochen-Ticks. Bis zur Umschaltung zeigt die Oberfläche Monate an; ein Monats-Schritt bündelt 4 oder 5 Wochen-Ticks. Die Anzeige wechselt dauerhaft auf Wochen beim ersten eigenen Engine-Projekt, beim zweiten Release oder am 1. Januar 1985, je nachdem, was zuerst eintritt. Der Spieler kann auch vorher in den Einstellungen auf Wochen umschalten.
- KRN-R02 \[1.0\] Ein Jahr hat 52 Wochen in vier Quartalen zu je 13 Wochen. Jedes Quartal hat drei Monate mit 4, 4 und 5 Wochen (Januar Wochen 1–4, Februar 5–8, März 9–13, April 14–17 usw.). Der Monat ist nur Anzeige; alle Raten gelten pro Woche.
- KRN-R03 \[1.0\] Tempostufen sind Pause, 1× (1 Anzeigeschritt pro 1,0 s), 2× (0,5 s), 4× (0,25 s) und „Bis zum nächsten Ereignis“. In Monatsanzeige laufen die 4 oder 5 Wochen-Ticks eines Monats gleichmäßig verteilt in dieser Zeit; ein Entscheidungsangebot hält in der betroffenen Woche an.
- KRN-R04 \[1.0\] „Bis zum nächsten Ereignis“ rechnet ohne Wartezeit, bis ein Ereignis der Klasse Entscheidung entsteht oder ein Ergebnis mit Autopause eintrifft.
- KRN-R05 \[1.0\] Jedes Entscheidungsangebot pausiert die Zeit; Ergebnisse pausieren nur, wenn die Autopause dafür eingeschaltet ist; Informationen pausieren nie.
- KRN-R06 \[1.0\] Das Spiel endet nicht automatisch, außer bei Insolvenz oder bei eingestelltem Endjahr beziehungsweise erreichter Zielbedingung (dann Spielende-Bildschirm, Weiterspielen möglich).

**Tick-Reihenfolge**

- KRN-R10 \[1.0\] Jeder Tick durchläuft genau diese Phasen in dieser Reihenfolge: 1 Eingaben und Regeln anwenden · 2 Kalender (Datum, Freischaltungen, geplante Termine: Messen, Konsolenstarts, Devkit-Wellen, Store-Aktionen) · 3 KI-Entscheidungen · 4 Forschung und Engine · 5 Projekte · 6 Releases der Woche · 7 Markt · 8 Betrieb · 9 Lizenzen · 10 Finanzen · 11 Personal · 12 Ereignisse · 13 Berichte, Chronik, Autosave-Punkte, Anzeige-Delta.
- KRN-R11 \[1.0\] KI-Entscheidungen in Phase 3 sehen nur den Stand nach Abschluss des vorigen Ticks; Firmen entscheiden in aufsteigender Reihenfolge ihrer Firmen-ID.
- KRN-R12 \[1.0\] Monatliche Jobs (Plattformbasis, Trends, Personalwerte, Entscheidungen kleiner KI-Studios) laufen im Wochen-Tick, der den Monatsersten enthält, also in der ersten Woche jedes Monats (Abgleich A13); Rivalen entscheiden jede Woche. Quartalsweise Jobs (Börse, Gewinnabführung der Töchter) laufen in der ersten Woche des Quartals (Wochen 1, 14, 27, 40). Jährliche Jobs: Preise und Messe-Saison in Woche 1, Jahrbuch in Woche 52 (KRN-R62). Awards werden in der Woche der Branchenmesse vergeben (Datum aus data/calendar), die Nominierungen 4 Wochen vorher.
- KRN-R13 \[1.0\] Konkurrieren mehrere Firmen um dasselbe Gut (Mitarbeiter, Firma, Exklusivdeal, Lizenzkunde), gewinnt das höchste Gebot, bei Gleichstand die bessere Beziehung, danach die kleinere Firmen-ID.
- KRN-R14 \[1.0\] Ein System darf in seiner Phase nur seine eigenen Daten schreiben; Wirkungen auf andere Systeme werden als Effekte gesammelt und in deren Phase angewendet.

**Zufall und Determinismus**

- KRN-R20 \[1.0\] Jeder Zufall stammt aus einem benannten Strom, der aus Seed und Systemname abgeleitet wird (rng.fork("markt")).
- KRN-R21 \[1.0\] Ein neues System bekommt einen eigenen Strom und verändert dadurch die Zufallsfolgen anderer Systeme nicht.
- KRN-R22 \[1.0\] Gleicher Seed, gleiche Einstellungen, gleiche Mods und gleiche Eingaben ergeben einen bitgleichen Spielstand nach jedem Tick.
- KRN-R23 \[1.0\] Geld wird als ganze Zahl in Cent gerechnet; alle übrigen Werte (Anteile, Faktoren, Gewichte) sind ganze Zahlen in Basispunkten (1,0 = 10.000); nach jedem Rechenschritt wird abgeschnitten. Exponential- und Potenzfunktionen kommen aus Tabellen. Fließkomma gibt es nur in der Oberfläche (siehe Abgleich A22).
- KRN-R24 \[1.0\] Iteration über Sammlungen erfolgt stets in sortierter ID-Reihenfolge, nie in Einfügereihenfolge einer Map.

**Ereignisse**

- KRN-R30 \[1.0\] Es gibt drei Klassen: Entscheidung (braucht Antwort), Ergebnis (Bericht über etwas Geschehenes), Information (Ticker).
- KRN-R31 \[1.0\] Pro Woche entsteht höchstens ein Entscheidungsangebot; weitere Kandidaten bleiben bis zu 4 Wochen im Kandidatenpool und verfallen danach.
- KRN-R32 \[1.0\] Laufende Ereignisketten haben Vorrang vor neuen Einzelereignissen und belegen den Wochenplatz, statt zusätzlich zu kommen.
- KRN-R33 \[1.0\] Entscheidungen, die zu einer aktiven Delegationsregel passen, werden von der Regel beantwortet und erscheinen nur im Regelprotokoll.
- KRN-R34 \[1.0\] Jede Entscheidung hat eine Standardoption; bei Fristablauf wird sie gewählt und als Ergebnis gemeldet.
- KRN-R35 \[1.0\] Ergebnisse derselben Woche zum selben Objekt werden zu einem Bericht mit Reitern gebündelt (z. B. Release-Bericht).
- KRN-R36 \[1.0\] Ein Ereignis mit Cooldown kann frühestens nach Ablauf erneut entstehen.
- KRN-R37 \[1.0\] Verzögerte Folgen werden beim Wählen der Option mit festem Zieldatum und gezogenem Zufallswert eingeplant, damit Speichern und Laden sie nicht verändern.
- KRN-R38 \[1.0\] Die Ereignisdichte aus den Einstellungen skaliert die Gewichte zufälliger Ereignisse, nicht die historischen Termine.
- KRN-R39 \[1.0\] Die Einstellung Entscheidungsdichte (ruhig, normal, dicht) skaliert nur die Zahl der Entscheidungsangebote: ruhig 0,7×, normal 1,0×, dicht 1,3× der Zielbereiche aus 5.2. Krisen, Ketten-Stufen, Projekt-Gates, Pflicht-Entscheidungen und historische Termine bleiben unverändert. Die Messgröße „Wochen ohne Angebot“ gilt für normal.

**Freischaltungen**

- KRN-R40 \[1.0\] Ein System wird freigeschaltet, wenn seine Bedingung erfüllt ist (Ereignis, Firmengröße, Jahr oder Spielfortschritt); die Bedingungen stehen in data/unlocks.json.
- KRN-R41 \[1.0\] Pro Release wird höchstens ein neues System freigeschaltet, pro Jahr höchstens zwei. Hat ein System ein eigenes Auslöse-Ereignis (z. B. erste Lizenzanfrage, erstes Publisher-Angebot, erste Engine-Anforderung), ist dieses Ereignis selbst die Freischaltung: Das System ist in derselben Woche offen und wartet nicht. Es zählt gegen die Grenzen; ist eine Grenze erreicht, wartet stattdessen das nächste System ohne eigenes Ereignis. Nur Systeme ohne eigenes Ereignis warten auf den nächsten Release, spätestens 26 Wochen.
- KRN-R42 \[1.0\] Jede Freischaltung erscheint zuerst als Ereignis mit Entscheidung, nicht als neues Menü.
- KRN-R43 \[1.0\] Im freien Start sind alle Systeme sofort offen, die zu Jahr und Startprofil passen; im späten Start werden die Freischaltungen bis zum Startjahr im Schnelldurchlauf vergeben.

**Spielstand**

- KRN-R50 \[1.0\] Der Spielstand ist ein reines Datenobjekt; ein Tick ist die Funktion tick(state, eingaben) → neuerState.
- KRN-R51 \[1.0\] Jeder Spielstand trägt schemaVersion; für jede Erhöhung gibt es eine Migrationsfunktion, die ältere Stände schrittweise hebt.
- KRN-R52 \[1.0\] Autosave erfolgt nach jedem Jahresrückblick und im eingestellten Intervall (Standard: alle 13 Wochen) in einen rotierenden Slot (Standard: 5 Slots).
- KRN-R53 \[1.0\] Ein Spielstand speichert aktive Mods mit Version; fehlende Mods lösen beim Laden eine Warnung aus, ihre Datensätze fallen auf Ersatzwerte zurück.
- KRN-R54 \[1.0\] Spielstände lassen sich als Datei exportieren und importieren; Ironman erlaubt nur einen Slot und kein manuelles Laden.

**Aufschlüsselung und Chronik**

- KRN-R60 \[1.0\] Jede Berechnung, deren Ergebnis der Spieler sieht, liefert eine Aufschlüsselung mit mindestens den drei größten Beiträgen und einem Rest.
- KRN-R61 \[1.0\] Jeder Release, jede Krise, jede Freischaltung, jede Übernahme und jeder Konsolenstart erzeugt einen Chronik-Eintrag.
- KRN-R62 \[1.0\] In der letzten Woche des Jahres (Woche 52, Phase 13) entsteht ein Jahrbuch aus den Chronik-Einträgen des Jahres, einschließlich der Awards der Branchenmesse; es löst einen Autosave und einen natürlichen Haltepunkt aus.

**Startprofile und Weltgenerator**

- KRN-R70 \[1.0\] Beim Start wählt der Spieler ein Startprofil (Garage, kleines Studio, etabliertes Studio, Engine-Firma) und ein Startjahr. Die Tabelle nennt die Werte für 1980, 1990, 2000, 2010 und 2020. Zwischenjahre und freie Startjahre aus Szenarien (A01) interpolieren linear; Geld wird auf 10.000 USD gerundet, Personal auf ganze Köpfe.
- KRN-R71 \[1.0\] Die Werte gelten für Schwierigkeit Normal. Andere Stufen ändern nur das Startgeld (Faktor aus S10). Das Geld reicht für etwa 10 Monate Personalkosten (Garage), 6 Monate (kleines Studio) und 9 Monate (etabliertes Studio, Engine-Firma) nach A20.
- KRN-R72 \[1.0\] Engine-Stufen sind relativ zum Stand der Technik des Startjahres laut Datenblatt: 0 = aktueller Stand, −1 = eine Stufe darunter, +1 = eine darüber. „Keine“ heißt keine eigene Engine; ab 2000 gibt es eine günstige Lizenz-Engine einer KI-Firma.
- KRN-R73 \[1.0\] Startmarken sind eigene Marken mit Stärke 0–100 und einem fiktiven Erstling in der Chronik. Plattformbeziehungen liegen zwischen −100 und +100; ab +40 liegt ein Devkit vor, sobald es Devkits gibt.
- KRN-R74 \[1.0\] Startmitarbeiter entstehen aus dem Strom personal nach der Startverteilung aus S07. Die Engine-Firma beginnt zusätzlich mit einem Lizenzkunden (KI-Studio).
- KRN-R75 \[1.0\] Der Weltgenerator erzeugt KI-Studios nach Startjahr: 1980 20, 1990 30, 2000 45, 2010 55, ab 2020 60, jeweils ±10 %, höchstens 60. Größen: 60 % klein, 30 % mittel, 10 % groß. Ab 1990 gibt es mindestens eine reine Engine-Firma, ab 2000 mindestens zwei.
- KRN-R76 \[1.0\] Jede Persönlichkeit aus S09 kommt vor. Keine Persönlichkeit stellt mehr als 35 % der Studios, keine weniger als 10 % (bei 20 Studios mindestens 2).
- KRN-R77 \[1.0\] 3–5 Studios werden Rivalen: mindestens eines größer, eines gleich groß und eines kleiner als der Spieler; mindestens zwei teilen ein Hauptgenre mit ihm. Rivalen entscheiden wöchentlich (KRN-R12).
- KRN-R78 \[1.0\] Plattformen stammen nur aus dem Plattform-Gerüst des Datenblatts. Alle im Startjahr verkauften Plattformen starten mit der installierten Basis laut Gerüst; angekündigte stehen im Kalender. Namen sind fiktiv.
- KRN-R79 \[1.0\] Jedes KI-Studio erhält 0–3 Marken, insgesamt etwa 0,8 Marken pro Studio. Die Stärke wächst mit dem Alter des Studios bis höchstens 80. KI-Marken können im Markenmarkt angeboten werden.
- KRN-R80 \[1.0\] Der Generator schreibt eine Vorgeschichte aus 6–12 Chronik-Einträgen der 5–10 Jahre vor dem Start (Gründungen, größte Hits, Plattformstarts, Übernahmen). Sie erscheint zum Start als Chronik-Doppelseite und dient als Briefing: links die Welt (Plattformen, Marktführer, Rivalen), rechts das eigene Studio (Profil, Stärken, Vorschlag für die ersten Schritte).
- KRN-R81 \[1.0\] Der Weltgenerator nutzt den eigenen Strom welt. Gleicher Seed, gleiches Profil und gleiches Startjahr ergeben dieselbe Welt. Beim späten Start gilt zusätzlich KRN-R43.

**Startprofile** (data/start/profiles.json, Schwierigkeit Normal):

| Profil | Startjahr | Geld (USD) | Personal / Teams | Engine-Stufen | Marken (Stärke) | Plattformbeziehungen | Ruf (0–100) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Garage | 1980 | 50.000 | 2 / 1 | keine | – | keine | 5 |
| Garage | 1990 | 80.000 | 2 / 1 | keine | – | keine | 5 |
| Garage | 2000 | 130.000 | 2 / 1 | keine (Lizenz-Engine −1) | – | keine | 5 |
| Garage | 2010 | 170.000 | 2 / 1 | keine (Lizenz-Engine −1) | – | Store-Zugang PC und Mobil | 5 |
| Garage | 2020 | 250.000 | 2 / 1 | keine (Lizenz-Engine 0) | – | Store-Zugang PC und Mobil | 5 |
| Kleines Studio | 1980 | 100.000 | 6 / 1 | eigene −1 | 1 (25) | 1 Plattform +20 | 15 |
| Kleines Studio | 1990 | 200.000 | 8 / 1 | eigene −1 | 1 (30) | 1 Plattform +30 | 20 |
| Kleines Studio | 2000 | 450.000 | 12 / 1 | eigene −1 | 1 (30) | 1 Plattform +30 | 20 |
| Kleines Studio | 2010 | 750.000 | 15 / 2 | Lizenz-Engine 0 | 1 (35) | 2 Plattformen +30 | 20 |
| Kleines Studio | 2020 | 1.500.000 | 20 / 2 | Lizenz-Engine 0 | 1 (35) | 2 Plattformen +30 | 20 |
| Etabliertes Studio | 1980 | 350.000 | 15 / 2 | eigene 0 | 2 (50, 30) | 2 Plattformen +40 | 40 |
| Etabliertes Studio | 1990 | 1.100.000 | 30 / 3 | eigene 0 | 2 (55, 30) | 2 Plattformen +45 | 45 |
| Etabliertes Studio | 2000 | 3.500.000 | 60 / 4 | eigene 0 | 2 (60, 35) | 3 Plattformen +45 | 50 |
| Etabliertes Studio | 2010 | 6.000.000 | 80 / 5 | eigene 0 | 2 (60, 35) | 3 Plattformen +45 | 50 |
| Etabliertes Studio | 2020 | 14.000.000 | 120 / 6 | eigene 0 | 2 (65, 40) | 3 Plattformen +50 | 55 |
| Engine-Firma | 1980 | 200.000 | 8 / 1 Engine-Team | eigene, +1 in 2 Modulen, sonst 0 | keine | 1 Plattform +20 | 25 |
| Engine-Firma | 1990 | 550.000 | 15 / 1 Engine-Team, 1 Spielteam | eigene, +1 in 2 Modulen | keine | 2 Plattformen +30 | 30 |
| Engine-Firma | 2000 | 1.800.000 | 30 / 2 Engine-Teams, 1 Spielteam | eigene, +1 in 2 Modulen | 1 Technikdemo (15) | 2 Plattformen +35 | 30 |
| Engine-Firma | 2010 | 3.000.000 | 40 / 2 Engine-Teams, 1 Spielteam | eigene, +1 in 2 Modulen | 1 Technikdemo (15) | 3 Plattformen +35 | 30 |
| Engine-Firma | 2020 | 7.000.000 | 60 / 3 Engine-Teams, 1 Spielteam | eigene, +1 in 2 Modulen | 1 Technikdemo (15) | 3 Plattformen +35 | 35 |

## 5 Formeln und Startwerte

**5.1 Auswahl des wöchentlichen Entscheidungsangebots**

```latex
P(e) = \frac{w_e \cdot d \cdot r_e}{\sum_k w_k \cdot d \cdot r_k},\qquad r_e = \min\Big(1,\ \frac{t_{\text{seit letztem}}}{\text{cooldown}_e}\Big)
```

w = Gewicht des Ereignisses, d = Ereignisdichte aus den Einstellungen, r = Abklingfaktor. Ketten-Ereignisse und historische Termine sind von der Auslosung ausgenommen und haben Vorrang.

**5.2 Entscheidungsbudget pro Spieljahr**

```latex
N_{\text{Angebote}} \le 52,\qquad N_{\text{Pflicht}} \in [10, 12]\ \text{(1980er: } [8, 12]\text{; volle Delegation: } \le 8),\qquad \frac{W_{\text{ohne Angebot}}}{52} < 0{,}6\ \text{(1980er)}
```

W ohne Angebot = Wochen eines Jahres, in denen weder ein Entscheidungsangebot noch ein Projekt-Gate ansteht. Die Messgröße gilt für die 1980er bei Entscheidungsdichte normal. Damit sie hält, verteilt der Ereignisplaner: Steht in einer Woche schon ein Angebot oder Gate an, rückt ein neues Angebot in die nächste freie Woche, höchstens 2 Wochen später.

**5.3 Zufallsströme**

```latex
\text{seed}_{\text{System}} = \text{hash32}(\text{seed} \,\|\, \text{Systemname}),\quad \text{Generator: xoshiro128**}
```

**5.4 Bedingungen** sind deklarativ: `{"alle": [{"jahr": {">=": 1985}}, {"firma.mitarbeiter": {">=": 8}}]}` mit den Operatoren alle, eines, nicht und den Vergleichen =, <, <=, >, >=.

| Parameter | Startwert | Bereich | Datei |
| --- | --- | --- | --- |
| Sekunden pro Anzeigeschritt bei 1× | 1,0 | 0,5–2,0 | data/core/time.json |
| Monatsanzeige bis | erstes Engine-Projekt, zweiter Release oder 1985 | – | data/core/time.json |
| Max. Entscheidungsangebote pro Woche | 1 | 1 | data/core/events.json |
| Verfall von Kandidaten | 4 Wochen | 1–12 | data/core/events.json |
| Frist einer Entscheidung | 4 Wochen | 1–12 | data/core/events.json |
| Angebote pro Jahr, Zielbereich 1980er | 15–25 | – | data/core/events.json |
| Angebote pro Jahr, Zielbereich 1990er | 25–35 | – | data/core/events.json |
| Angebote pro Jahr, Zielbereich ab 2000 | 30–45 | – | data/core/events.json |
| Ereignisdichte (Normal) | 1,0 | 0,25–2,0 | data/settings/presets.json |
| Max. Wartezeit einer Freischaltung | 26 Wochen | 4–52 | data/unlocks.json |
| Autosave-Intervall | 13 Wochen | 4–52 | data/core/save.json |
| Autosave-Slots | 5 | 1–10 | data/core/save.json |
| Max. Größe Spielstand (komprimiert) | 5 MB | – | Leistungsziel (S12) |
| Entscheidungsdichte | normal (1,0×) | ruhig 0,7× · dicht 1,3× | data/settings/presets.json |
| Anteil Wochen ohne Angebot, 1980er | < 60 % | – | data/core/events.json |
| Max. Verschiebung eines Angebots in eine freie Woche | 2 Wochen | 0–4 | data/core/events.json |

**Freischaltplan im Normalverlauf** (data/unlocks.json, Richtwerte für das Balancing):

| Spielzeit | Spieljahre | Neu verfügbar |
| --- | --- | --- |
| 0–1 Stunde | 1980–1982 | Erstes und zweites Spiel, Features, Marketing-Regler, Auftragsarbeit |
| 1–2 Stunden | 1982–1985 | Eigene Engine, Zeitleiste und Markt, Publisher-Angebot, Teams ab 8 Mitarbeitern |
| 2–4 Stunden | 1985–1990 | Lizenzmarkt, Marken, Playtests, Etage mit Ausstattung, Messen |
| 4–6 Stunden | 1990–1995 | Delegation und Produzenten, Multiplattform, Devkits, Engine-Anforderungen, Rivalen, Tonstudio und Testlabor |
| 6–10 Stunden | 1995–2005 | Online und MMO, Betrieb, Standorte, Lokalisierung, Online-Aktivierung, digitaler Back-Catalog |
| ab 10 Stunden | ab 2005 | Analytics, F2P, Preisaktionen, Early Access, Börse, Übernahmen, Zukunftsepoche |

## 6 Entscheidungen des Spielers

| Entscheidung | Wann | Optionen | Standard/Delegation |
| --- | --- | --- | --- |
| Zeit steuern | jederzeit | Pause, 1×, 2×, 4×, bis zum nächsten Ereignis | 1× |
| Entscheidungsangebot beantworten | wenn eines ansteht | Optionen des Ereignisses, „Später“, „Nicht mehr fragen – Regel anlegen“ | Standardoption bei Fristablauf |
| Autopause | Einstellungen | je Ereignisklasse und Bereich ein/aus | Entscheidung ein, Ergebnis aus |
| Speichern, Laden, Exportieren | jederzeit außer Ironman | Slot wählen | Autosave |

## 7 KI-Verhalten

KI-Firmen bekommen keine Ereignisse über die Oberfläche, sondern entscheiden in Phase 3 über dieselben Eingabe-Typen wie der Spieler. Ereignisse, die eine KI-Firma betreffen (z. B. Leak bei einem KI-Studio), werden mit ihrer Persönlichkeit entschieden und als Information gemeldet. KI-Firmen nutzen eigene Zufallsströme (rng.fork("ki/\<firmenId>")), damit Hinzufügen einer Firma andere Firmen nicht verändert.

## 8 Oberfläche

- **Rahmen** (S11): Fußleiste mit Zeitsteuerung und Jahresbalken; rechte Spalte mit Fokus-Karte, Warteschlange, „Als Nächstes“ und Ticker.
- **Erleben:** Die Fokus-Karte zeigt eine Entscheidung mit Optionen und Vorher/Nachher; „Als Nächstes“ zeigt die nächsten drei geplanten Termine mit Wochenzahl.
- **Analysieren:** Ereignisprotokoll und Regelprotokoll als Tabelle; jede Aufschlüsselung als Tabelle mit Formel.
- **Speichern-Dialog** mit Slots, Datum, Spielversion und aktiven Mods.

## 9 Ereignisse und Meldungen

- Freischaltungs-Ereignisse (je System eines, siehe 5).
- Jahresrückblick (Jahrbuch) als Ergebnis mit Haltepunkt.
- „Spielstand mit fehlenden Mods“ beim Laden.
- „Neue Epoche“ als Information mit kurzem Intro (S11).
- Chronik-Doppelseite „Vorgeschichte“ zum Spielstart als Briefing (KRN-R80).
- Award-Nominierungen 4 Wochen vor der Branchenmesse, Awards in der Messewoche (KRN-R12).

## 10 Schnittstellen

| Richtung | System | Inhalt |
| --- | --- | --- |
| ruft auf | S02–S09 | Je System eine Phasenfunktion in der Reihenfolge aus KRN-R10 |
| liest | S10 | Einstellungen, Ereignisdichte, Autopause, Ironman, Mods |
| liefert an | S07 | Delegationsregeln beantworten Entscheidungen (KRN-R33) |
| liefert an | S11 | Anzeige-Delta, Fokus-Karte, Warteschlange, Chronik |
| liefert an | S12 | Determinismus, Leistungsmessung pro Phase |
| liefert an | S10 | Chronik für Spielende und Vermächtnis-Wertung |

## 11 Abnahmetests

- KRN-T01 Gegeben Seed A und eine aufgezeichnete Eingabefolge, wenn das Spiel zweimal 1980–2000 läuft, dann sind beide Spielstände nach jedem Tick bitgleich.
- KRN-T02 Gegeben ein Spielstand in Monatsanzeige, wenn ein Monats-Schritt läuft, dann laufen genau 4 oder 5 Wochen-Ticks nach dem Kalender 4/4/5, und der Spielstand ist bitgleich zum selben Lauf in Wochenanzeige. Gegeben 1983 ohne Engine-Projekt, wenn der zweite Release erscheint, dann wechselt die Anzeige dauerhaft auf Wochen; ohne beides geschieht das am 1. Januar 1985.
- KRN-T03 Gegeben drei Entscheidungs-Kandidaten in derselben Woche, wenn die Ereignisphase läuft, dann entsteht genau ein Entscheidungsangebot.
- KRN-T04 Gegeben eine Delegationsregel, die zu einem Ereignis passt, wenn das Ereignis entsteht, dann erscheint es nicht als Fokus-Karte, sondern im Regelprotokoll.
- KRN-T05 Gegeben eine Entscheidung mit Frist, wenn die Frist ohne Antwort abläuft, dann wird die Standardoption angewendet und als Ergebnis gemeldet.
- KRN-T06 Gegeben ein neues System mit eigenem Strom, wenn es hinzugefügt wird, dann bleiben die Zufallsfolgen aller anderen Ströme unverändert.
- KRN-T07 Gegeben zwei erfüllte Freischaltungen ohne eigenes Ereignis, wenn ein Release erscheint, dann wird nur eine freigeschaltet und die zweite spätestens 26 Wochen später. Gegeben das System Lizenzmarkt, wenn die erste Lizenzanfrage entsteht, dann ist es in derselben Woche offen, ohne auf einen Release zu warten.
- KRN-T08 Gegeben ein Spielstand der schemaVersion n−1, wenn er geladen wird, dann wird er migriert und läuft ohne Fehler weiter.
- KRN-T09 Gegeben eine gewählte Option mit verzögerter Folge, wenn vor dem Zieldatum gespeichert und geladen wird, dann tritt die Folge mit demselben Ergebnis ein.
- KRN-T10 Gegeben das Jahr 2040 mit 60 Studios und 3.000 Produkten, wenn ein Wochen-Tick läuft, dann dauert er höchstens 50 ms (S12).
- KRN-T11 Gegeben ein Headless-Lauf mit Bot-Strategie, wenn die Pflicht-Entscheidungen pro Jahr gezählt werden, dann liegen sie in den 1980ern zwischen 8 und 12 und ab 1990 bis 2040 zwischen 10 und 12.
- KRN-T12 Gegeben ein Headless-Lauf 1980–1989 mit Bot-Strategie und Entscheidungsdichte normal, wenn die Wochen gezählt werden, dann liegt der Anteil Wochen ohne Entscheidungsangebot oder Projekt-Gate unter 60 %.
- KRN-T13 Gegeben der Kalender 4/4/5, dann gehört Woche 9 zum März, Woche 14 ist die erste Woche des zweiten Quartals, und monatliche Jobs laufen genau in den Wochen 1, 5, 9, 14, 18, 22, 27, … 49.
- KRN-T14 Gegeben Entscheidungsdichte ruhig, wenn eine Krise ausgelöst wird, dann erscheint sie mit derselben Wahrscheinlichkeit und Frist wie bei normal; nur die Zahl der übrigen Angebote sinkt auf etwa 70 %.
- KRN-T15 Gegeben Startprofil kleines Studio, Startjahr 1990 und Seed A, wenn das Spiel startet, dann hat das Studio 200.000 USD, 8 Mitarbeiter in einem Team, eine eigene Engine eine Stufe unter Stand der Technik und eine Marke der Stärke 30; ein zweiter Start mit Seed A ergibt dieselbe Welt.
- KRN-T16 Gegeben Startjahr 2000 und Seed A, wenn die Welt erzeugt wird, dann gibt es 41–49 KI-Studios, 3–5 Rivalen, nur Plattformen aus dem Gerüst, die 2000 verkauft werden, und die Chronik-Doppelseite zeigt 6–12 Einträge.
- KRN-T17 Gegeben die Branchenmesse in Woche 23, dann erscheinen die Nominierungen in Woche 19 und die Awards in Woche 23; das Jahrbuch entsteht in Woche 52 und nennt die Awards.

## 12 Spätere Versionen

- &#91;1.1\] Wiederholung (Replay) eines Spielstands aus Seed und Eingabeprotokoll, z. B. für Fehlerberichte.
- &#91;später\] Multiplayer auf Basis des deterministischen Kerns (zurückgestellt, siehe S13).
- &#91;später\] Code-Mods mit Einstiegspunkten in einzelne Tick-Phasen (siehe S10).

## Änderungen nach Prüfung 3

- Zeitmodell: Die Simulation läuft immer wöchentlich, der Monat ist nur Anzeige; Kalender 4/4/5; Wochenanzeige ab erstem Engine-Projekt, zweitem Release oder 1985 (KRN-R01, KRN-R02, KRN-R03, Begriff Tick, GameState.displayUnit statt tickMode, KRN-T02, KRN-T13).
- Kalenderjobs nach A13 in der ersten Woche des Monats bzw. Quartals; Jahrbuch in Woche 52; Awards zur Branchenmesse, Nominierungen 4 Wochen vorher (KRN-R12, KRN-R62, KRN-T17).
- Freischaltung: Ein eigenes Auslöse-Ereignis schaltet sofort frei; die Wartezeit von 26 Wochen gilt nur für Systeme ohne Ereignis (KRN-R41, KRN-T07).
- Pflicht-Entscheidungen in den 1980ern 8–12 (5.2, KRN-T11); Autosave 5 Slots (KRN-R52); Datum bis 2100; Seed bleibt 16 Hex-Zeichen.
- Zahlen: EventDef.weight, Option.delayed.chance und Breakdown.value als bp; Hinweis „float = bp“ unter den Daten; Rechenregeln in S12, Numerik (KRN-R23).
- Neue Einstellung Entscheidungsdichte, wirkt nur auf Angebote (KRN-R39, KRN-T14); Messgröße „Anteil Wochen ohne Angebot < 60 % in den 1980ern“ (5.2, KRN-T12).
- Neu: Startprofile und Weltgenerator mit Vorgeschichte als Chronik-Doppelseite (KRN-R70 bis KRN-R81, KRN-T15, KRN-T16, Abschnitt 9).
- Offen: Die Werte der Startprofile sind erste Richtwerte für das Balancing. S11 muss displayUnit statt tickMode lesen. Der Strom welt ergänzt die Liste aus A05.
