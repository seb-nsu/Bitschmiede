# S14 KI-System und Schwierigkeit

**Version:** 1.0, Stand 29.10.2026 · **Quelle:** Design-Dokument, Abschnitte Markt (KI-Studios, Rivalen, KI-System und Schwierigkeit) und Ziele (Schwierigkeit) · **Prefix:** KI

## 1 Zweck und Abgrenzung

S14 beschreibt, wie KI-Firmen denken: was sie wissen, welche Ziele sie verfolgen, wie sie Optionen bewerten und auswählen, wie sie auf den Spieler reagieren, wie sie lernen und Fehler machen und wie all das mit dem Schwierigkeitsgrad skaliert. S14 ist maßgeblich für das *Wie* jeder KI-Entscheidung. Die einzelnen Handlungen (Projekt starten, Lizenz vergeben, Marke anbieten, umziehen) und ihre Regeln stehen weiter in S02–S09; S08 MRK-R32 bis R52 und R69 sind Anwendungen dieses Systems.

Nicht in S14: Plattformhersteller als Wirtschaftsakteure (S08, MRK-R67), Ereignisketten (S08) und die Ziele des Spielers (S10).

**Leitgedanken:**

1. **Fair:** Die KI spielt nach denselben Regeln und Zahlen wie der Spieler. Schwierigkeit verändert Kompetenz und Haltung der KI, nie Kosten, Qualität oder Umsätze.
2. **Lesbar:** Jede wichtige Entscheidung eines Rivalen lässt sich mit „Warum?“ aufschlüsseln.
3. **Menschlich:** KI-Firmen haben Charakter, verfolgen Ziele, irren sich plausibel und erzeugen so Geschichten.
4. **Begrenzt:** Gegenzüge gegen den Spieler sind pro Jahr gedeckelt; die KI ist ein Gegner, kein Verfolger.

## 2 Begriffe

| Begriff | Bedeutung |
| --- | --- |
| Akteur | Jede KI-Firma (Studio, Publisher, Engine-Firma). Plattformhersteller sind eigene Akteure nach S08. |
| Rivale | Einer von 3–5 benannten Akteuren mit Chef, Zielen, Beziehung und Gedächtnis (S08 MRK-R45). |
| Archetyp | Grundhaltung: Indie, Mittelklasse, AAA, Engine-Spezialist, Publisher; Rivalen zusätzlich Engine-Riese, Marken-Fabrik, Indie-Liebling, Plattform-Partner, Aufkäufer. |
| Charakterzug | Eigenschaft des Chefs, die Gewichte und Bauchentscheidungen verschiebt. |
| Option | Eine mögliche Handlung mit konkreten Parametern, z. B. „Rollenspiel, Fantasy, PC, groß“. |
| Erwägung | Ein Bewertungsfaktor einer Option, über eine Antwortkurve auf 0–1 abgebildet. |
| Nutzwert U | Gewichtete Summe der Erwägungen einer Option. |
| Überzeugung | Was ein Akteur über den Markt glaubt (z. B. Beliebtheit eines Genres); kann falsch sein. |
| Bedrohung | Wie stark der Spieler die Ziele eines Akteurs in einer Domäne gefährdet (0–1). |
| Gegenzug | Eine Handlung, die sich gezielt gegen den Spieler richtet. |
| Bauchentscheidung | Eine bewusst nicht optimale Wahl, die aus einem Charakterzug folgt. |
| Kompetenz | Sammelbegriff für die Schwierigkeitsparameter in Abschnitt 7. |

## 3 Architektur

Die KI arbeitet in drei Ebenen mit eigenem Takt. Jede Ebene setzt den Rahmen für die darunter.

| Ebene | Takt | Wer | Entscheidet |
| --- | --- | --- | --- |
| Strategisch | jährlich, Wochen 1–4 gestaffelt | Rivalen und Akteure ab 50 Mitarbeitern; kleinere alle 2 Jahre mit Vorlage | Ziele, Schwerpunkt-Genres, Engine-Kurs, Plattform-Wette, Budgetverteilung |
| Taktisch | monatlich, nach Firmen-ID auf die vier Wochen verteilt | alle Akteure | Projekte, Engine-Arbeit, Lizenzen, Marken, Personal, Finanzen, Übernahmen, Devkits |
| Operativ | wöchentlich, nur bei Anlass | alle Akteure mit laufendem Anlass | Release-Termin, Preise, Krisenantwort, Reaktion auf Spielerzüge |

Jede Entscheidung läuft gleich ab: **Wahrnehmen** (Überzeugungen lesen) → **Optionen erzeugen** (Kandidaten) → **bewerten** (Nutzwert) → **auswählen** (Softmax mit Temperatur oder Bauchentscheidung) → **handeln** (Regeln aus S02–S09) → **protokollieren** (Gründe für „Warum?“).

## 4 Daten

| Objekt | Felder |
| --- | --- |
| AiProfile | archetype, traits\[2\], weights (je Domäne), riskBp, favGenres\[\], engineStrategy, reserveMonths |
| AiMind | goals\[1–2\], plans {engine, brandCadence, platformBet, budgetSplit}, beliefs {genre×thema → bp, plattform → bp, marktgröße → Cent}, threat {domäne → bp}, mood, countersThisYear, reactionQueue\[\], lastConference |
| AiMemory | Liste aus (Woche, Ereignis, Gegenüber, Wert), verfallend nach S08 Tabelle 5.6 |
| AiChief | name, portrait, traits\[2\], since, goalFailures |
| AiDecisionLog | week, actorId, domain, choice, utilityBp, topReasons\[3\], viaGut (ja/nein) |
| AiDifficulty | alle Parameter aus Abschnitt 7, aus Preset oder „Eigen“ |

Dateien: `data/ai/archetypes.json`, `data/ai/traits.json`, `data/ai/goals.json`, `data/ai/considerations.json`, `data/ai/difficulty.json`. Alle Zahlen in bp bzw. Cent (A22, A40). Mods können Archetypen, Charakterzüge und Ziele ergänzen.

## 5 Regeln

### 5.1 Grundsätze

- **KI-R01** \[1.0\] Akteure nutzen ausschließlich die Handlungen und Zahlen, die auch dem Spieler offenstehen. Es gibt keine Boni auf Kosten, Qualität, Verkäufe oder Zinsen, auf keiner Stufe.
- **KI-R02** \[1.0\] Die einzige Stellschraube außerhalb des Verhaltens ist die Startstärke der Rivalen im Welt-Generator (Abschnitt 7, S01 KRN-R70 ff.).
- **KI-R03** \[1.0\] Jede Entscheidung folgt dem Ablauf aus Abschnitt 3; ausgewählt wird nach Formel 6.2.
- **KI-R04** \[1.0\] Jede Entscheidung von Rivalen und jede Entscheidung mit Wirkung auf den Spieler schreibt einen AiDecisionLog-Eintrag mit den drei stärksten Erwägungen.
- **KI-R05** \[1.0\] Akteure entscheiden auf dem Stand der Vorwoche, in fester Reihenfolge nach Firmen-ID, mit dem Zufallsstrom „ki“ je Firma (S01, MRK-R33).
- **KI-R06** \[1.0\] Geschäftsmodell-Sperren und Einstellungen des Spielstands gelten auch für die KI (S10 ZIE-R23).

### 5.2 Wissen und Wahrnehmung

- **KI-R07** \[1.0\] Eigene Werte kennt ein Akteur exakt. Über Markt und andere Firmen weiß er nur, was öffentlich ist: Wertungen, Verkaufscharts, Ankündigungen, Messen, Ticker, Lizenzpreise.
- **KI-R08** \[1.0\] Öffentliche Größen sieht ein Akteur mit einem Wahrnehmungsfehler nach Formel 6.3. Der Fehler wird je Quartal und Größe einmal gezogen, nicht wöchentlich neu.
- **KI-R09** \[1.0\] Eigene Analytics-Stufe eines Akteurs halbiert den Wahrnehmungsfehler je Stufe, mindestens bis auf den Wert der Schwierigkeitsstufe Hardcore.
- **KI-R10** \[1.0\] Pläne des Spielers (unangekündigte Projekte, Verhandlungen) kennt kein Akteur. Angekündigte Titel, Messeauftritte und Gerüchte sieht er wie der Spieler.
- **KI-R11** \[1.0\] Spielerzüge erreichen die operative Ebene eines Akteurs erst nach der Reaktionszeit der Stufe (Abschnitt 7) über die reactionQueue.
- **KI-R12** \[1.0\] Überzeugungen starten aus dem Seed (S02, Vorlieben je Seed) mit dem Wahrnehmungsfehler und werden nur durch Lernen (5.7) verändert.

### 5.3 Strategische Ebene

- **KI-R13** \[1.0\] Jeder Rivale und jeder Akteur ab 50 Mitarbeitern hält einmal im Jahr eine Strategiekonferenz (Woche 1–4, nach Firmen-ID gestaffelt). Sie entscheidet: zwei Schwerpunkt-Genres, Engine-Kurs (bauen, lizenzieren, wechseln, Generation beginnen), Plattform-Wette und Budgetverteilung auf Projekte, Engine, Marketing, Übernahmen und Rücklage (Summe 10.000 bp).
- **KI-R14** \[1.0\] Akteure unter 50 Mitarbeitern übernehmen die Vorlage ihres Archetyps und prüfen sie alle zwei Jahre.
- **KI-R15** \[1.0\] Jeder Rivale hat 1–2 aktive Ziele aus dem Katalog (Tabelle 6.7), gewählt nach Archetyp-Gewichten und Charakterzügen. Jedes Ziel hat eine messbare Bedingung und eine Frist von 5–10 Jahren.
- **KI-R16** \[1.0\] Ein aktives Ziel addiert zu jeder Option, die zu ihm beiträgt, die Erwägung „Zielbeitrag“ mit Gewicht w\_z (Formel 6.1).
- **KI-R17** \[1.0\] Erreicht ein Rivale ein Ziel, erscheint eine Schlagzeile; er wählt auf der nächsten Strategiekonferenz ein neues. Läuft die Frist ab, zählt goalFailures um eins hoch.
- **KI-R18** \[1.0\] Der Planungshorizont der Stufe (Abschnitt 7) begrenzt, wie weit Pläne vorausschauen: Ein Akteur mit Horizont 1 Jahr beginnt eine Engine-Generation erst, wenn die neue Hardware angekündigt ist; mit 5 Jahren beginnt er, sobald das Gerücht erscheint.
- **KI-R19** \[1.0\] Engine-Plan: Ein Akteur mit eigener Engine plant die nächste Generation so, dass sie zum erwarteten Start der nächsten Plattformgeneration fertig ist (Überzeugung über den Starttermin, Formel 6.3).
- **KI-R20** \[1.0\] Marken-Kadenz: Jede Marke eines Akteurs bekommt einen Takt (Hauptreihe alle 2–4 Jahre nach Archetyp); unterschreitet die Frische 40, legt er eine Pause ein, außer der Charakterzug „Zahlenmensch“ überwiegt.
- **KI-R21** \[1.0\] Plattform-Wette: Die Konferenz wählt eine Plattform mit Vorrang für die nächsten Projekte und Devkit-Bewerbungen; Plattform-Partner wählen immer die Plattform ihres Partners.
- **KI-R22** \[1.0\] Die Konferenz eines Rivalen erzeugt eine Schlagzeile mit seinem Schwerpunkt („Nova setzt voll auf Rollenspiele“), sichtbar ohne Analytics.
- **KI-R23** \[1.0\] Budgetverteilung begrenzt die taktische Ebene: Übersteigt eine Option den Topf, ist sie nur wählbar, wenn ihr Nutzwert den der besten Option im Topf um 20 % übertrifft.
- **KI-R24** \[1.0\] Schwankt die Kasse um mehr als 30 % gegenüber der Konferenz, führt der Akteur eine außerordentliche Konferenz durch (höchstens einmal pro Jahr).

### 5.4 Taktische Ebene

- **KI-R25** \[1.0\] **Projekte:** Wird ein Team frei, erzeugt der Akteur K Kandidaten (Stufe) aus Genre, Thema, Plattform, Umfang und Marke und bewertet sie mit Formel 6.1; die Erwägungen erweitern S08 Formel 5.5 um Zielbeitrag, Schwerpunkt, Konkurrenzdichte und Bedrohung.
- **KI-R26** \[1.0\] Schwerpunkt-Genres der Konferenz erhalten +0,15 auf die Erwägung „Schwerpunkt“; Lieblingsgenres +0,1.
- **KI-R27** \[1.0\] Die Erwägung „Konkurrenzdichte“ nutzt die angekündigten Titel im geplanten Zeitfenster; dicht besetzte Fenster senken den Nutzwert.
- **KI-R28** \[1.0\] **Engine:** Akteure mit eigener Engine bestellen Modulstufen nach MRK-R40 und folgen dem Engine-Plan; Akteure ohne eigene Engine wählen ihre Lizenz mit dem Nutzwert aus S04 und wechseln, wenn der Nutzen einer anderen Engine den eigenen um die Wechselhürde übersteigt.
- **KI-R29** \[1.0\] **Lizenzgeber:** Engine-Firmen setzen ihre Vorlagen (S04) nach Archetyp: Engine-Riese mit niedriger Royalty und hoher Reichweite, Spezialist mit hoher Royalty und Premium-Support. Preisänderungen folgen der Bedrohung in der Domäne Engine-Markt (5.6).
- **KI-R30** \[1.0\] **Marken:** Ableger in neue Genres wählt ein Akteur nur bei Welttiefe ab 50 oder mit Charakterzug „Visionär“. Markenmarkt nach MRK-R69 und S04.
- **KI-R31** \[1.0\] **Personal:** Akteure stellen nach Projektbedarf ein, mit Gehaltsniveau nach Archetyp (Indie 90 %, Mittelklasse 100 %, AAA 115 % des Epochenmittels). Crunch setzen sie ein, wenn ein Termin sonst um mehr als 4 Wochen reißt; Charakterzug „Perfektionist“ verschiebt stattdessen.
- **KI-R32** \[1.0\] **Finanzen:** Jeder Akteur hält eine Rücklage von reserveMonths Monatskosten (Indie 3, Mittelklasse 4, AAA 6, Publisher 6; „Sparsam“ +2). Unter dem Ziel nimmt er Kredit nur für Projekte mit Nutzwert über 0,6; unter 2 Monaten startet er ein Sparprogramm (Einstellungsstopp, schwächstes Projekt pausieren, dann Entlassungen).
- **KI-R33** \[1.0\] **Börse:** Akteure gehen bei erfüllten Bedingungen (S07 FRM-R51) an die Börse, wenn ein Ziel Wachstum oder Konsolidierung verlangt oder die Konferenz Übernahmen budgetiert; ihre Anlegerstimmung folgt denselben Regeln wie beim Spieler.
- **KI-R34** \[1.0\] **Übernahmen:** Akteure mit Übernahme-Budget prüfen quartalsweise Ziele nach S09; Aufkäufer immer, andere nur bei Zielbeitrag. Gebote folgen der Bewertung mit Wahrnehmungsfehler; eine Prüfung kauft auch die KI.
- **KI-R35** \[1.0\] **Devkits und Plattformen:** nach MRK-R39, mit Vorrang für die Plattform-Wette.
- **KI-R36** \[1.0\] **Live-Service:** Akteure mit Live-Spielen verteilen ihre Betriebskapazität nach der größten Zufriedenheitslücke und planen Technik-Updates nach MRK-R44.
- **KI-R37** \[1.0\] **Projektabbruch** ausschließlich nach MRK-R43.

### 5.5 Operative Ebene

- **KI-R38** \[1.0\] **Release-Termin:** Ein Akteur wählt den Termin im Fenster ±8 Wochen um den geplanten mit dem besten Nutzwert aus Konkurrenzdichte, Saison (Weihnachtsquartal nur für große Titel günstig) und Bedrohung; Release-Duelle nach MRK-R47.
- **KI-R39** \[1.0\] **Preise:** Preiskurve nach MRK-R41; Akteure unter der Rücklage-Grenze nehmen an jeder Store-Aktion teil.
- **KI-R40** \[1.0\] **Krisenantwort:** Bei eigenen Krisen (Bugs, Server, Skandal) wählt der Akteur die Antwort mit dem besten Nutzwert; Charakterzüge verschieben die Wahl („Diplomat“ entschuldigt sich, „Draufgänger“ sitzt aus). Die Antwort erscheint im Ticker.
- **KI-R41** \[1.0\] **Reaktionen:** Spielerzüge aus der reactionQueue lösen eine Prüfung auf Gegenzug aus (5.6); ohne Gegenzug bleibt nur der Eintrag im Gedächtnis.

### 5.6 Spielerbezug: Bedrohung, Gegenzüge, Nachahmer

- **KI-R42** \[1.0\] Jeder Rivale und jeder Akteur ab 50 Mitarbeitern berechnet quartalsweise die Bedrohung durch den Spieler je Domäne (Genre, Engine-Markt, Plattform, Übernahmen, Personal, Marken) nach Formel 6.4.
- **KI-R43** \[1.0\] Ab einer Bedrohung von 3.000 bp in einer Domäne nimmt der Akteur passende Gegenzüge (Tabelle 6.5) in seine Kandidaten auf. Ihr Nutzwert enthält die Erwägung „Bedrohung“ mit dem Gewicht 0,5 × KI-Aggressivität.
- **KI-R44** \[1.0\] Jeder Akteur führt höchstens so viele Gegenzüge pro Jahr gegen den Spieler aus, wie die Stufe erlaubt (Abschnitt 7); „Nachtragend“ +1, „Diplomat“ −1. Alle Akteure zusammen höchstens dreimal so viele wie ein einzelner Rivale.
- **KI-R45** \[1.0\] Gegenzüge sind normale Handlungen nach S02–S09 (z. B. Preissenkung einer Engine-Lizenz, Release-Duell, Abwerbeangebot, Gegengebot bei einer Übernahme, Konkurrenztitel im Genre, Kauf einer Marke vor dem Spieler). Sie kosten den Akteur dasselbe wie den Spieler.
- **KI-R46** \[1.0\] Jeder Gegenzug erzeugt eine Schlagzeile mit erkennbarem Bezug („Als Antwort auf …“) und einen „Warum?“-Eintrag. Verdeckte Gegenzüge gibt es nicht.
- **KI-R47** \[1.0\] **Nachahmer:** Erzielt der Spieler einen Hit (Wertung ab 8,5 oder Platz 1–10 der Jahresverkäufe), würfelt jeder Akteur mit Formel 6.6, ob er ein ähnliches Spiel (gleiches Genre, gleiches oder nahes Thema) beginnt; höchstens so viele Nachahmer je Hit, wie die Stufe erlaubt.
- **KI-R48** \[1.0\] Ein Nachahmer kündigt sein Spiel 26–78 Wochen nach dem Hit an (Ticker: „Nova kündigt ein Weltraum-Rollenspiel an – klingt vertraut?“). Die Konkurrenzdichte im Genre steigt sichtbar.
- **KI-R49** \[1.0\] Erscheint ein Nachahmer innerhalb von 104 Wochen nach dem Original, bekommt er −10 % Startinteresse („Abklatsch“), außer seine Qualität übertrifft die des Originals; dann gibt es „Besser als das Original“ +5 %. Das Original des Spielers bekommt +5 % Fanbindung für den nächsten Teil.
- **KI-R50** \[1.0\] Kooperationen (MRK-R50) werden ab der Kooperationsschwelle der Stufe angeboten; die Schwelle ersetzt den festen Wert +40.

### 5.7 Lernen

- **KI-R51** \[1.0\] Nach jedem Release, das ein Akteur sieht (eigene, fremde, die des Spielers), passt er seine Überzeugung zu Genre × Thema und Plattform nach Formel 6.7 an.
- **KI-R52** \[1.0\] Eigene Releases zählen doppelt (Lernrate ×2, höchstens 4.000 bp). Ein Flop senkt zusätzlich die Risikobereitschaft für zwei Jahre um 20 %.
- **KI-R53** \[1.0\] Mit Lernrate 0 (Stufe Entspannt) bleiben Überzeugungen auf dem Startstand; die KI verpasst dann Trendwechsel sichtbar.
- **KI-R54** \[1.0\] Lernen verändert nur Überzeugungen, nie Gewichte oder Archetyp; Strategiewechsel entstehen über Konferenz und Chefwechsel.

### 5.8 Fehler und Menschlichkeit

- **KI-R55** \[1.0\] Die Auswahl nach Formel 6.2 ist bewusst nicht immer optimal: Die Temperatur der Stufe bestimmt, wie oft eine zweit- oder drittbeste Option gewählt wird.
- **KI-R56** \[1.0\] Bei strategischen und taktischen Entscheidungen trifft ein Akteur mit der Wahrscheinlichkeit der Stufe eine Bauchentscheidung: Er wählt unter den fünf besten Optionen die, die am besten zu seinen Charakterzügen passt (Tabelle 6.9). Bauchentscheidungen sind plausibel, nie absurd.
- **KI-R57** \[1.0\] Typische Fehler entstehen aus den Regeln und werden nicht vorgeschrieben: Überhype („Showman“), zu früher Release mit Bugs („Draufgänger“), Marke überstrapaziert („Zahlenmensch“), falsche Plattform-Wette („Visionär“), zu kleines Marketing („Sparsam“).
- **KI-R58** \[1.0\] Kein Akteur wird vor der Pleite geschützt. Ziel ist ein lebendiger Markt mit 5–20 % KI-Pleiten je Jahrzehnt auf jeder Stufe.
- **KI-R59** \[1.0\] Bauchentscheidungen werden im Log markiert (viaGut) und im „Warum?“ als „Bauchgefühl des Chefs“ erklärt.

### 5.9 Rivalen als Figuren

- **KI-R60** \[1.0\] Jeder Rivale hat einen Chef mit Namen, Porträt und zwei Charakterzügen (Tabelle 6.9), gewählt passend zum Archetyp mit Zufall aus dem Strom „welt“.
- **KI-R61** \[1.0\] Die Stimmung des Chefs ergibt sich aus den letzten vier Quartalen: selbstbewusst (Umsatz und Wertungen über Erwartung), normal, unter Druck (zwei schwache Quartale oder Zielfrist im letzten Jahr), angeschlagen (Verlust und Rücklage unter Ziel).
- **KI-R62** \[1.0\] Stimmung wirkt auf das Risiko: selbstbewusst −10 % Risikogewicht, unter Druck +10 %, angeschlagen +25 % und Sparprogramm-Prüfung jeden Monat.
- **KI-R63** \[1.0\] **Chefwechsel:** Nach zwei verfehlten Zielen oder einem Jahr „angeschlagen“ tritt der Chef mit 30 % je Quartal zurück. Der neue Chef bekommt neue Charakterzüge, führt sofort eine außerordentliche Konferenz durch, und die Beziehung zum Spieler rückt zur Hälfte Richtung 0.
- **KI-R64** \[1.0\] Zitate im Ticker werden aus Vorlagen je Charakterzug und Anlass erzeugt (Hit, Flop, Gegenzug, Ziel erreicht, Chefwechsel); höchstens ein Zitat je Rivale und Monat.
- **KI-R65** \[1.0\] Das Ziel eines Rivalen ist dem Spieler bekannt, wenn eine dieser Bedingungen gilt: Beziehung ab +40, eigene Analytics ab Stufe 1, gemeinsamer Messeauftritt im laufenden Jahr oder ein Gerücht dazu im Ticker. Sonst zeigt die Rivalen-Karte „Ziel unbekannt“.
- **KI-R66** \[1.0\] Die Rivalen-Karte zeigt Chef, Charakterzüge, Stimmung, Archetyp, Ziel (falls bekannt), Beziehung mit Verlauf, die letzten fünf Züge mit „Warum?“ und, ab Analytics Stufe 2, vermutete Absichten (Schwerpunkt, Plattform-Wette, nächster Titel).
- **KI-R67** \[1.0\] Scheidet ein Rivale aus, rückt nach MRK-R45 ein Akteur nach; er bekommt einen Chef, Ziele und eine Beziehung von 0 und erscheint mit einer Vorstellungs-Schlagzeile.
- **KI-R68** \[später\] Allianzen zwischen Rivalen außerhalb des Ausgleichs, Rivalen-Gespräche am Verhandlungstisch, Chef wechselt zu einer anderen Firma.

### 5.10 Anpassung an die Schwierigkeit

- **KI-R69** \[1.0\] Die Schwierigkeit wirkt auf die KI über zwei getrennte Achsen: **Kompetenz** (wie gut die KI entscheidet: Kandidaten, Temperatur, Wahrnehmung, Lernen, Reaktionszeit, Planungshorizont, Bauchentscheidungen) und **Aggressivität** (wie sehr sie sich gegen den Spieler richtet: Gewicht der Bedrohung, Gegenzüge, Nachahmer, Kooperationsschwelle). Dazu kommen Zahl der Akteure und Startstärke der Rivalen.
- **KI-R70** \[1.0\] Jedes Preset setzt alle Parameter nach Abschnitt 7. Unter „Eigen“ stellt der Spieler Kompetenz, Aggressivität, Zahl der Akteure und Ausgleich getrennt in fünf Stufen ein; jede Stufe übernimmt die Spalte des gleichnamigen Presets.
- **KI-R71** \[1.0\] Kompetenz und Aggressivität gelten für alle Akteure gleich. Rivalen erhalten zusätzlich die Startstärke ihrer Stufe.
- **KI-R72** \[1.0\] Die Stufe ist ab Spielstart fest. Wird sie später geändert, gilt S10 (Erfolge für diesen Spielstand gesperrt), außer bei einer Senkung von Aggressivität oder Ausgleich, die nie sperrt.
- **KI-R73** \[1.0\] Das Preset beschreibt die KI in einem Satz im Startbildschirm, z. B. Normal: „Die Konkurrenz spielt solide, lernt aus Fehlern und antwortet auf deine Erfolge, aber nicht sofort.“
- **KI-R74** \[1.0\] Die Wirkung jeder Stufe muss in Simulationsläufen messbar sein (Test KI-T13, KI-T14); eine Stufe, die nichts ändert, gilt als Fehler.

### 5.11 Ausgleich

- **KI-R75** \[1.0\] Der Ausgleich hat zwei Einstellungen: aus und sanft. Er verändert nur Verhaltensparameter, nie Zahlen des Spiels, und höchstens um eine Stufe.
- **KI-R76** \[1.0\] **Branche formiert sich:** Liegt die Führung des Spielers F (Formel 6.8) vier Quartale in Folge bei mindestens 2,0, nutzen alle Rivalen die Kompetenz und Aggressivität der nächsthöheren Stufe, dürfen sich zu zweit absprechen (gemeinsame Release-Planung, gegenseitige Lizenz zum Freundschaftspreis), und Fusionen zwischen KI-Firmen werden doppelt so wahrscheinlich. Er endet, wenn F unter 1,5 fällt.
- **KI-R77** \[1.0\] **Atempause:** Auf Entspannt und Leicht pausieren alle Gegenzüge und die Kooperationsschwelle sinkt um 20, wenn F vier Quartale in Folge höchstens 0,3 beträgt. Sie endet ab F = 0,5.
- **KI-R78** \[1.0\] Beide Zustände zeigt die Markt-Ansicht als Hinweis mit Erklärung („Die Branche formiert sich gegen dich“, „Die Konkurrenz lässt dir Luft“). Ausgleich sperrt keine Erfolge.
- **KI-R79** \[1.0\] Standard: Ausgleich sanft auf Entspannt und Leicht, aus auf Normal, Schwer und Hardcore.

## 6 Formeln und Tabellen

Alle Werte in bp (1,0 = 10.000), Abschneiden Richtung null, Funktionen aus den Tabellen in S12 Abschnitt 5.9.

### 6.1 Nutzwert einer Option

```latex
U(o) = \frac{\sum_k w_k \cdot f_k\big(x_k(o)\big)}{\sum_k w_k}, \qquad w_k = w_k^{\text{Archetyp}} \cdot m_k^{\text{Charakter}} \cdot m_k^{\text{Stimmung}} \;(+\, w_z \text{ für den Zielbeitrag})
```

f\_k ist eine Antwortkurve aus `considerations.json` (linear, logistisch, invers, Stufe), die den Rohwert auf 0–10.000 bp abbildet. U liegt damit zwischen 0 und 10.000 bp. Eine Option mit einem **Veto** (Geld reicht nicht für Rücklage plus Kosten, Team fehlt, Plattform gesperrt) wird vor der Bewertung verworfen. w\_z = 3.000 bp je aktivem Ziel, zu dem die Option beiträgt.

**Erwägungen der Projektwahl** (erweitert S08 Formel 5.5, deren Gewichte w\_q, w\_m, w\_k, w\_r, w\_p die Archetyp-Gewichte liefern):

| Erwägung | Rohwert | Kurve |
| --- | --- | --- |
| Qualität | Q̂ / Q\_erw (Überzeugung) | logistisch, Mitte 1,0 |
| Trend | Überzeugung zur Beliebtheit Genre × Thema | linear |
| Marke | Stärke × Übertragung × Frische | linear |
| Kosten | Kosten / max(Kapital, Mindestkapital) | invers |
| Risiko | Neuheit, Umfang gegenüber Teamgröße | invers |
| Plattform | erwartete Basis zum Release | logistisch |
| Konkurrenzdichte | angekündigte Titel im Fenster ±8 Wochen | invers |
| Schwerpunkt | Schwerpunkt-Genre +1,5, Lieblingsgenre +1,0 | Stufe |
| Zielbeitrag | Beitrag zu einem aktiven Ziel | Stufe |
| Bedrohung | Bedrohung in der Domäne (nur Gegenzüge) | linear |

### 6.2 Auswahl mit Temperatur

```latex
P(o_i) = \frac{\exp\big((U_i - U_{\max}) / \tau\big)}{\sum_{j \in \text{Top 8}} \exp\big((U_j - U_{\max}) / \tau\big)}
```

Nur die acht besten Kandidaten gehen in die Auswahl. τ kommt aus Abschnitt 7 (in bp des Nutzwerts). Mit der Wahrscheinlichkeit der Bauchentscheidung wird stattdessen unter den fünf besten die Option mit dem höchsten Charakter-Wert gewählt (Tabelle 6.9).

### 6.3 Wahrnehmung

```latex
\hat{x} = x \cdot \text{clamp}\big(1 + \sigma_{\text{eff}} \cdot z,\ 1 - 2\sigma_{\text{eff}},\ 1 + 2\sigma_{\text{eff}}\big), \qquad \sigma_{\text{eff}} = \max\big(\sigma_{\text{Hardcore}},\ \sigma_W / 2^{\text{Analytics}}\big)
```

z ist ein Wert der Standardnormalverteilung aus der Tabelle der inversen Normalverteilung, je Akteur, Größe und Quartal einmal gezogen (Strom „ki“).

### 6.4 Bedrohung

```latex
T_d = \text{clamp}\Big(A_d \cdot \big(1 + G_d\big) \cdot \ddot{U}_d \cdot \Big(1 + \frac{\max(0, -B)}{100}\Big),\ 0,\ 1\Big)
```

A\_d = Anteil des Spielers in der Domäne (Umsatzanteil im Genre, Anteil der lizenzierten Projekte, Anteil der Top-Titel einer Plattform, Zahl gemeinsamer Übernahmeziele / 3, abgeworbene Schlüsselpersonen / 3, Markenkäufe im Schwerpunkt / 2). G\_d = Wachstum dieses Anteils über vier Quartale (−1 bis +1). Ü\_d = Überschneidung mit dem Akteur: 1,0 bei Ziel oder Schwerpunkt, 0,5 bei Lieblingsgenre, 0,2 sonst. B = Beziehung zum Spieler (−100 bis +100).

### 6.5 Gegenzüge je Domäne

| Domäne | Gegenzüge (Regeln in) |
| --- | --- |
| Genre | Konkurrenztitel im Genre mit Termin nahe am Spieler (S02, KI-R38); Marketing-Schub +50 % (S05); Release-Duell (MRK-R47) |
| Engine-Markt | Royalty −1 bis −3 Punkte, Quellcode-Zugang, Exklusivvertrag mit einem Kunden des Spielers (S04, MRK-R49) |
| Plattform | Exklusivdeal mit dem Hersteller, Launch-Titel-Zusage (S08) |
| Übernahmen | Gegengebot bis zum eigenen Wert plus 10 % (S09, MRK-R51) |
| Personal | Abwerbeangebot an eine Schlüsselperson des Spielers mit niedriger Loyalität (S07, MRK-R48) |
| Marken | Gebot auf eine Marke, für die der Spieler verhandelt (S04, LIZ-M); keine Lizenz an den Spieler |

### 6.6 Nachahmer

```latex
p_i = p_0 \cdot \text{Affinität}_i(g) \cdot \big(1 - \text{Sättigung}_g\big) \cdot \Big(1 + \frac{\max(0, -B_i)}{100}\Big)
```

p₀ = Nachahmer-Grundchance der Stufe. Affinität = 1,0 bei Schwerpunkt, 0,6 bei Lieblingsgenre, 0,1 sonst. Sättigung = angekündigte Titel im Genre ÷ 10, höchstens 1. Gewürfelt wird in Reihenfolge der Firmen-ID, bis die Höchstzahl der Stufe erreicht ist.

### 6.7 Lernen

```latex
b_{t+1} = b_t + \lambda \cdot (r - b_t), \qquad r = \text{clamp}\Big(\tfrac{1}{2}\cdot\frac{\text{Wertung}}{\text{Wertung}_{\text{erw}}} + \tfrac{1}{2}\cdot\frac{\text{Verkäufe}}{\text{Verkäufe}_{\text{erw}}},\ 0,\ 2\Big)
```

b = Überzeugung zur Beliebtheit (Genre × Thema bzw. Plattform), 1,0 = durchschnittlich. λ = Lernrate der Stufe, für eigene Releases ×2.

**Zielkatalog:**

| Ziel | Bedingung | Frist | Bevorzugt von |
| --- | --- | --- | --- |
| Genre-Führer | Platz 1 im Umsatz eines Genres, zwei Jahre in Folge | 6 Jahre | AAA, Marken-Fabrik |
| Engine-Imperium | mindestens 30 % der lizenzierten Projekte | 8 Jahre | Engine-Riese, Engine-Spezialist |
| Kritikerliebling | Durchschnittswertung ab 8,5 über die nächsten fünf Titel | 7 Jahre | Indie-Liebling, Indie |
| Markenpflege | eine eigene Marke mit Stärke ab 80 | 6 Jahre | Marken-Fabrik |
| Plattform-Champion | mindestens 25 % der Top-Titel einer Plattform | 6 Jahre | Plattform-Partner |
| Wachstum | Mitarbeiterzahl verdoppeln | 5 Jahre | Mittelklasse, Aufkäufer |
| Konsolidierer | drei Übernahmen | 8 Jahre | Aufkäufer, Publisher |
| Börsengang | an die Börse gehen | 6 Jahre | AAA, Publisher |
| Den Spieler schlagen | vier Quartale mehr Umsatz als der Spieler | 5 Jahre | jeder Rivale mit Beziehung bis −50 |

### 6.8 Führung des Spielers (Ausgleich)

```latex
F = \frac{\sum_{8\,Q} \text{Umsatz}_{\text{Spieler}}}{\max\big(\sum_{8\,Q} \text{Umsatz}_{\text{beste KI}},\ \text{Mindestumsatz}_{\text{Epoche}}\big)}
```

Mindestumsatz der Epoche = 10 × Mindestkapital (S08, data/ai.json), damit F in leeren Märkten endlich bleibt.

### 6.9 Charakterzüge

| Charakterzug | Wirkung auf Gewichte | Typische Bauchentscheidung |
| --- | --- | --- |
| Visionär | Risiko −30 %, neue Technik und neue Genres +20 % | Wette auf eine neue Plattform oder Technik |
| Zahlenmensch | Kosten +30 %, Marke +20 % | Fortsetzung trotz Müdigkeit |
| Perfektionist | Qualität +30 %, Risiko +10 % | Verschieben statt Crunch |
| Draufgänger | Risiko −40 %, Bedrohung +30 % | Release-Duell suchen, früher Release |
| Diplomat | Gegenzüge −1 je Jahr, Kooperation +30 % | Entschuldigung in Krisen, Kooperationsangebot |
| Nachtragend | Groll klingt nur 5 % je Jahr ab, Gegenzüge +1 je Jahr | Gegenzug auch bei geringer Bedrohung |
| Sparsam | Rücklage +2 Monate, Kosten +20 % | Zu kleines Marketing |
| Showman | Marketing +30 % | Überhype, großer Messeauftritt |

## 7 Schwierigkeitsparameter

Grundsatz (KI-R01): Die Schwierigkeit verändert Kompetenz und Haltung der KI, nie die Zahlen des Spiels. Einzige Ausnahme ist die Startstärke der Rivalen.

| Parameter | Entspannt | Leicht | Normal | Schwer | Hardcore |
| --- | --- | --- | --- | --- | --- |
| **Kompetenz** |  |  |  |  |  |
| Kandidaten je Entscheidung | 8 | 12 | 20 | 30 | 40 |
| Auswahl-Temperatur τ | 2.500 bp | 1.500 bp | 800 bp | 400 bp | 200 bp |
| Wahrnehmungsfehler σ\_W | 30 % | 20 % | 12 % | 6 % | 3 % |
| Lernrate λ | 0 | 500 bp | 1.000 bp | 1.500 bp | 2.000 bp |
| Reaktionszeit auf Spielerzüge | 16 Wochen | 10 Wochen | 6 Wochen | 3 Wochen | 1 Woche |
| Planungshorizont | 1 Jahr | 2 Jahre | 3 Jahre | 4 Jahre | 5 Jahre |
| Bauchentscheidungen | 25 % | 15 % | 10 % | 5 % | 2 % |
| **Aggressivität** |  |  |  |  |  |
| KI-Aggressivität (Gewicht der Bedrohung × 0,5) | 0,5 | 0,75 | 1,0 | 1,25 | 1,5 |
| Gegenzüge je Akteur und Jahr | 0 | 1 | 2 | 3 | 4 |
| Nachahmer-Grundchance p₀ | 0 | 5 % | 10 % | 15 % | 20 % |
| Höchstzahl Nachahmer je Hit | 0 | 1 | 2 | 3 | 4 |
| Kooperationsschwelle (Beziehung) | +20 | +30 | +40 | +50 | +60 |
| **Welt** |  |  |  |  |  |
| Zahl der KI-Studios (Höchstwert) | 30 | 40 | 50 | 55 | 60 |
| Rivalen | 3 | 3 | 4 | 5 | 5 |
| Startstärke der Rivalen | Profil eine Stufe kleiner | wie Profil | wie Profil | Profil eine Stufe größer | eine Stufe größer plus eine Marke |
| Ausgleich (Standard) | sanft | sanft | aus | aus | aus |

In Worten: Auf **Entspannt** sieht die KI den Markt unscharf, lernt nicht, reagiert erst nach Monaten und greift den Spieler nie gezielt an. Auf **Normal** spielt sie solide, lernt aus Releases und antwortet auf Erfolge mit Verzögerung. Auf **Hardcore** liest sie den Markt fast exakt, plant fünf Jahre voraus, reagiert binnen einer Woche, kopiert Hits und nutzt jeden erlaubten Gegenzug.

## 8 Einstellungen und Entscheidungen des Spielers

| Einstellung | Werte | Wo |
| --- | --- | --- |
| Preset | Entspannt, Leicht, Normal, Schwer, Hardcore, Eigen | Spielstart (S10) |
| KI-Kompetenz | 5 Stufen (Spalten aus Abschnitt 7) | Eigen |
| KI-Aggressivität | 5 Stufen | Eigen; Senken jederzeit ohne Erfolgssperre |
| Zahl der KI-Studios | 5 Stufen | Eigen, nur beim Start |
| Ausgleich | aus, sanft | Eigen; Senken jederzeit ohne Erfolgssperre |
| Zahl der Rivalen | 3–5 | Eigen, nur beim Start |

Im Spiel trifft der Spieler keine eigenen KI-Entscheidungen. Er beeinflusst die KI über die Beziehung zu Rivalen (faire Verträge, Kooperation, Abwerben, Duelle), über Informationen (Analytics, Messen) und über seine Domänen-Anteile, die die Bedrohung bestimmen.

## 9 Oberfläche

- **Rivalen-Karte** (Markt-Ansicht, Erleben): Chef mit Porträt und Stimmungs-Gesicht, zwei Charakterzüge als Symbole, Archetyp, Ziel oder „Ziel unbekannt“, Beziehungsbalken mit Verlauf, die letzten fünf Züge (KI-R66).
- **„Warum?“:** Jede Rivalen-Schlagzeile und jeder Gegenzug hat ein Fragezeichen. Es zeigt die drei stärksten Erwägungen als kurze Sätze („Rollenspiele sind Novas Schwerpunkt“, „Dein Erfolg im Genre bedroht Novas Ziel“, „Bauchgefühl des Chefs“).
- **Bedrohungsanzeige:** In der Analysieren-Ebene eine Tabelle Rivale × Domäne mit der geschätzten Bedrohung; ohne Analytics nur grob (niedrig, mittel, hoch).
- **Ausgleich-Hinweis:** Banner in der Markt-Ansicht nach KI-R78.
- **Startbildschirm:** Ein Satz je Preset zur KI (KI-R73); unter „Eigen“ zwei Regler Kompetenz und Aggressivität mit Vorschau-Satz.

## 10 Ereignisse und Ticker

| Anlass | Ticker-Beispiel |
| --- | --- |
| Strategiekonferenz eines Rivalen | „Nova setzt voll auf Rollenspiele und die neue Konsole“ |
| Ziel erreicht | „Byteforge lizenziert inzwischen jedes dritte Spiel“ |
| Gegenzug | „Als Antwort auf deinen Engine-Erfolg senkt Titan die Lizenzgebühr“ |
| Nachahmer | „Nova kündigt ein Weltraum-Rollenspiel an – klingt vertraut?“ |
| Chefwechsel | „Nach zwei Flops: Neue Chefin bei Nova will zurück zu den Wurzeln“ |
| Bauchentscheidung mit Folgen | „Showman-Chef verspricht ›das größte Spiel aller Zeiten‹“ |
| Ausgleich | „Die Branche formiert sich: Nova und Byteforge stimmen Termine ab“ |

## 11 Leistung und Determinismus

- **KI-R80** \[1.0\] Die KI darf je Wochen-Tick höchstens 12 ms der 50 ms aus S12 verbrauchen (60 Akteure, Referenzrechner).
- **KI-R81** \[1.0\] Taktische Entscheidungen werden nach Firmen-ID auf die vier Wochen eines Monats verteilt, strategische auf die Wochen 1–4 des Jahres; operative laufen nur bei Anlass.
- **KI-R82** \[1.0\] Kandidaten werden aus einer vorberechneten Liste je Epoche gezogen; die Bewertung nutzt nur Tabellenfunktionen (S12, 5.9).
- **KI-R83** \[1.0\] Gleicher Seed, gleiche Stufe und gleiche Spielerzüge ergeben identische KI-Entscheidungen auf allen Plattformen.
- **KI-R84** \[1.0\] Das Entscheidungsprotokoll hält je Akteur die letzten 50 Einträge; ältere entfallen, Chronik-Einträge bleiben.

## 12 Schnittstellen

| Spec | Beziehung |
| --- | --- |
| S01 | Tick-Schritt KI, Zufallsstrom „ki“ je Firma, Strom „welt“ für Chefs, Welt-Generator (Startstärke) |
| S02–S07 | Handlungen und Zahlen, die die KI nutzt; keine eigenen KI-Regeln dort außer Verweisen |
| S04 | Lizenz- und Markenmarkt: Vorlagen der KI-Lizenzgeber, Markenhandel (LIZ-M) |
| S08 | MRK-R32–R52 und R69 sind Anwendungen von S14; Formel 5.5 liefert die Archetyp-Gewichte; Beziehungstabelle 5.6 gilt weiter |
| S09 | Übernahmen durch KI, Gegengebote |
| S10 | Presets, Einstellungen „Eigen“, Erfolgssperren |
| S11 | Rivalen-Karte, „Warum?“, Bedrohungsanzeige, Ausgleich-Banner |
| S12 | Leistungsbudget, Numerik, Determinismus-Test |

## 13 Abnahmetests

- **KI-T01** Ein KI-Projekt und ein Spielerprojekt mit identischen Eingaben ergeben identische Qualität, Kosten und Verkäufe (keine Boni).
- **KI-T02** Zwei Optionen mit Abstand 1.000 bp: Bei τ = 200 bp wählt die KI die bessere in mindestens 99 % von 10.000 Ziehungen, bei τ = 2.500 bp in 55–65 %.
- **KI-T03** Auf Hardcore liegt die geschätzte Marktgröße im Mittel über 1.000 Akteur-Quartale innerhalb ±3 % des wahren Werts, auf Entspannt streut sie mit einer Standardabweichung von 25–35 %.
- **KI-T04** Der Spieler senkt in Woche w seine Engine-Royalty: Auf Normal reagiert kein Akteur vor Woche w + 6, auf Hardcore frühestens in w + 1.
- **KI-T05** Bei dauerhaft hoher Bedrohung führt ein Rivale auf Normal pro Jahr genau zwei Gegenzüge aus, mit „Nachtragend“ drei; auf Entspannt keinen.
- **KI-T06** 1.000 Hits des Spielers auf Normal ergeben im Mittel 0,8–1,8 Nachahmer je Hit und nie mehr als zwei; auf Entspannt keinen.
- **KI-T07** Ein Genre wird nach Spielstart dauerhaft doppelt so beliebt: Auf Entspannt bleibt die Überzeugung unverändert, auf Normal erreicht sie nach zehn beobachteten Releases mindestens 65 % des neuen Werts.
- **KI-T08** Jeder Rivale hat jederzeit 1–2 aktive Ziele; das Erreichen eines Ziels erzeugt genau eine Schlagzeile.
- **KI-T09** Nach zwei verfehlten Zielen tritt der Chef in 100.000 simulierten Quartalen mit 28–32 % je Quartal zurück; der Nachfolger hält binnen einer Woche eine außerordentliche Konferenz.
- **KI-T10** Jede Strategiekonferenz verteilt das Budget mit einer Summe von genau 10.000 bp.
- **KI-T11** Ausgleich sanft: F ≥ 2,0 über vier Quartale aktiviert „Branche formiert sich“, F < 1,5 beendet ihn; auf „aus“ passiert beides nie.
- **KI-T12** Ausgleich aktiv und inaktiv ergeben für dieselben Projekte identische Qualität, Kosten und Preise (nur Verhalten ändert sich).
- **KI-T13** 100 Läufe je Stufe mit dem Referenz-Bot „solider Spieler“: Er liegt 2010 unter den Top 3 nach Umsatz in 85–95 % (Entspannt), 70–80 %, 45–55 %, 25–35 % und 10–20 % (Hardcore) der Läufe.
- **KI-T14** Der Median-Umsatz der besten KI-Firma steigt von Stufe zu Stufe streng.
- **KI-T15** Die KI braucht mit 60 Akteuren höchstens 12 ms je Wochen-Tick (Median), 25 ms im schlechtesten Tick.
- **KI-T16** Gleicher Seed und gleiche Eingaben ergeben in Node, Chromium und Firefox identische Entscheidungsprotokolle über 60 Spieljahre.
- **KI-T17** Jeder Rivalen-Eintrag im Protokoll hat mindestens zwei Gründe; jeder Gegenzug hat eine Schlagzeile.
- **KI-T18** Auf Entspannt sind 20–30 % der strategischen und taktischen Entscheidungen Bauchentscheidungen, auf Hardcore 1–3 %.
- **KI-T19** Auf jeder Stufe gehen je Jahrzehnt 5–20 % der KI-Studios pleite.
- **KI-T20** Wirbt der Spieler eine Schlüsselperson eines Rivalen ab (−25), steigt dessen Wahrscheinlichkeit für ein Release-Duell gegen den nächsten großen Titel des Spielers messbar.

## 14 Spätere Erweiterungen

- &#91;später\] Allianzen und Absprachen zwischen Rivalen auch ohne Ausgleich, mit Kartellbehörde als Gegenspieler.
- &#91;später\] Gespräche mit Rivalen-Chefs am Verhandlungstisch (Waffenstillstand, Terminabsprache, gemeinsame Engine).
- &#91;später\] Chefs wechseln die Firma und nehmen Charakterzüge und Groll mit.
- &#91;später\] Feindliche Übernahmen gegen die Firma des Spielers (S09).
- &#91;später\] Multiplayer: menschliche Mitspieler ersetzen Rivalen; die KI füllt die übrigen Plätze.
