# S03 Engines und Technologie

**Version:** 1.0, Stand 29.10.2026 · **Quelle:** Engines und Technologie (inkl. Engine und laufende Projekte, Technik-Update per Patch) · **Prefix:** ENG

## 1 Zweck und Abgrenzung

Diese Spec regelt Engines als Produkt aus Modulen: Forschung, Versionen, Veralterung, technische Schuld, Herkunft der Module, die Bindung laufender Projekte an eine Engine, Anforderungen an das Engine-Team und das Technik-Update veröffentlichter Spiele. Nicht hier: Lizenzverträge und Lizenznehmer (S04), Plattformen und Devkits (S08), Qualitätsformel der Spiele (S02).

## 2 Begriffe

| Begriff | Bedeutung |
| --- | --- |
| Engine | Produkt aus acht Modulen mit Version, eigen oder fremd |
| Modul | Rendering, Audio, Physik, KI, Netzwerk, Werkzeuge, Plattformen, Streaming |
| Stufe | Ausbaustand eines Moduls (0–6), jede mit frühestem Jahr |
| Stand der Technik | Für jedes Modul die höchste Stufe, die im aktuellen Jahr erreichbar ist |
| Engine-Faktor E | Verhältnis der Modulstufen zum Stand der Technik |
| Technische Schuld | Wert 0–100 pro Modul; bremst, erzeugt Bugs, verteuert Updates |
| Hauptversion | Nova 1, Nova 2 …; Neubau mit Umstieg für Kunden |
| Update | Hebt einzelne Module innerhalb einer Hauptversion (Nova 2.3) |
| Herkunft | Selbst entwickelt, lizenziert (Middleware) oder gekauft |
| Engine-Bindung | Fest oder mitlaufend; wie ein Projekt Engine-Updates übernimmt |
| Anforderung | Auftrag an das Engine-Team, ein Modul auf eine Stufe zu heben |
| Technik-Update | Produkttyp, der ein veröffentlichtes Spiel auf eine neuere Engine-Version hebt |

## 3 Daten

| Entität/Feld | Typ | Einheit/Bereich | Bedeutung |
| --- | --- | --- | --- |
| **Engine**.id | id\<Engine> | – | Kennung |
| Engine.owner | id\<Company> | – | Eigentümer |
| Engine.major / minor | int | ≥ 1 / ≥ 0 | Version |
| Engine.modules | map\<ModuleKind, ModuleState> | 8 Einträge | Module |
| Engine.licenseModel | id\<LicenseModel> | – | S04 |
| Engine.roadmap | list<{module, level, eta: Date}> | – | Sichtbare Roadmap (bei Fremd-Engines) |
| **ModuleState**.level | int | 0–6 | Stufe |
| ModuleState.debt | float | 0–100 | Technische Schuld |
| ModuleState.origin | enum | eigen, lizenziert, gekauft | Herkunft |
| ModuleState.vendor | id\<Company>? | – | Anbieter bei Fremdmodul |
| ModuleState.featureLevels | {kopierschutz: int, antiCheat: int} | 0–4 | Feature-Stufen (Netzwerk, Werkzeuge); einfacher Kopierschutz braucht kein Modul (ENG-R33) |
| **ModuleLevelDef** | {kind, level, earliestYear, researchCost: int, researchWeeks: int, requires: list} | Cent, Wochen | Datendatei data/engine/modules.json |
| **EngineRequest**.id | id | – | Kennung |
| EngineRequest.requester | id\<Project> \| id\<LicenseContract> | – | Projekt oder Lizenznehmer |
| EngineRequest.module / level | ModuleKind / int | – | Ziel |
| EngineRequest.deadline | Date | – | Spätestens Feature-Freeze des Projekts (je Umfang nach PRD-R27) |
| EngineRequest.priority | int | 1–5 | Reihenfolge im Engine-Team |
| EngineRequest.status | enum | offen, inArbeit, fertig, verpasst, gestrichen | Status |
| **Project**.engine.binding | enum | fest, mitlaufend | Bindung (S02) |
| Project.engine.version | {major, minor} | – | Stand der Engine im Projekt |
| **EngineTeamPlan** | {research: float, maintenance: float, requests: float} | Anteile, Summe 1 | Aufteilung der Kapazität |
| EngineFamiliarity | {engineId, teamId, since: Date, weeks: int} | 8–16 Wochen | Einarbeitung eigener Teams in eine gekaufte Engine (ENG-R36) |

## 4 Regeln

**Module, Forschung, Versionen**

- ENG-R01 \[1.0\] Jede Engine hat acht Module; jede Stufe hat ein frühestes Jahr, Forschungskosten, Forschungsdauer und Voraussetzungen aus data/engine/modules.json.
- ENG-R02 \[1.0\] Eine Stufe kann erst ab ihrem frühesten Jahr erforscht werden; wer sie als Erster erreicht, ist Vorreiter und bekommt im Lizenzmarkt einen Vorteil (S04).
- ENG-R03 \[1.0\] Forschung läuft über die Kapazität des Engine-Teams; ohne Engine-Team gibt es keine Forschung.
- ENG-R04 \[1.0\] Ein Update hebt einzelne Module, erhöht die Unterversion und kostet etwa ein Drittel einer neuen Hauptversion.
- ENG-R05 \[1.0\] Eine neue Hauptversion setzt die Schuld aller neu gebauten Module auf 5 und zwingt Lizenznehmer zum Umstieg (S04).
- ENG-R06 \[1.0\] Die Starter-Engine (Rendering Stufe 1, alle anderen Module Stufe 0) steht jeder neuen Firma kostenlos zur Verfügung und wird nicht weiterentwickelt.

**Engine-Faktor und Veralterung**

- ENG-R10 \[1.0\] Der Engine-Faktor E wird je Projekt aus den Modulstufen seiner Engine-Version im Verhältnis zum Stand der Technik im Release-Jahr berechnet (5.1).
- ENG-R11 \[1.0\] Nur Module, die das Projekt durch seine Features nutzt, zählen für E; ungenutzte Module sind neutral.
- ENG-R12 \[1.0\] Bei Live-Produkten (MMO, F2P, Live-Service) wird E jeden Monat neu berechnet und wirkt auf die Abwanderung (S06).
- **ENG-R13** \[1.0\] Für den Lizenzmarkt (S04) gilt die Lizenzqualität L = (E − 0,3) / 0,85; sie bildet E ∈ \[0,3; 1,15\] auf 0 bis 1 ab und wird mit allen acht Modulen berechnet (5.1).

**Technische Schuld**

- ENG-R20 \[1.0\] Jedes Update erhöht die Schuld der geänderten Module um 8 Punkte; Wartung senkt sie um die eingesetzte Wartungskapazität.
- ENG-R21 \[1.0\] Schuld verlangsamt Arbeitspakete, die das Modul nutzen, erhöht deren Bugs und verteuert Updates des Moduls (5.2).
- ENG-R22 \[1.0\] Schuld wirkt als Symptom sichtbar („Projekt X drei Wochen langsamer: Schuld im Modul Rendering“), sobald sie einen Projekttermin um mindestens eine Woche verschiebt.
- ENG-R23 \[1.0\] Ab Schuld 80 in einem Modul empfiehlt das Spiel eine neue Hauptversion; Updates dieses Moduls kosten dann das Doppelte.

**Herkunft der Module**

- ENG-R30 \[1.0\] Ein Modul kann selbst entwickelt, lizenziert (Gebühr pro Spiel oder Jahr) oder gekauft (Einmalpreis) sein; Werkzeuge und Middleware sind Module fremder Herkunft, kein eigener Produkttyp.
- ENG-R31 \[1.0\] Ein lizenziertes Fremdmodul startet auf der Stufe des Anbieters, hat keine eigene Forschung und folgt der Roadmap des Anbieters.
- ENG-R32 \[1.0\] Ein gekauftes Modul übernimmt die Schuld des Verkäufers.
- ENG-R33 \[1.0\] Einfacher Kopierschutz (Stufen ohne Online-Bezug gemäß S05) ist eine reine Release-Option ohne Modul; vor 2000 gibt es nur diese. Online-Aktivierung und Online-Pflicht sind Feature-Stufen im Modul Netzwerk und verlangen Netzwerk ≥ 2. Anti-Cheat ist eine Feature-Stufe im Modul Werkzeuge. Netzwerk-Kopierschutz und Anti-Cheat können auch als Middleware lizenziert werden.
- ENG-R34 \[später\] Ein eigener Lizenzmarkt nur für Middleware.
- **ENG-R36** \[1.0\] Eine gekaufte Engine (Firmenkauf, S09) ist sofort nutzbar, aber eigene Teams arbeiten damit zuerst 30 % langsamer. Der Abzug sinkt linear über die Einarbeitungszeit D (5.5): 8 Wochen plus 1 Woche je Modul auf Stufe 4 oder höher, höchstens 16. Teams der gekauften Tochter können als Mentoren helfen und verkürzen D um 25 % (A29). Die Engine-Leiste zeigt den Abzug und das Ende der Einarbeitung.

**Engine-Bindung laufender Projekte**

- ENG-R40 \[1.0\] Jedes Projekt ist entweder fest (bleibt auf seiner Version) oder mitlaufend (übernimmt jedes Update der Engine bis zum Feature-Freeze).
- ENG-R41 \[1.0\] Standard: klein und mittel fest, groß und AAA mitlaufend; der Spieler kann bis zum Feature-Freeze wechseln.
- ENG-R42 \[1.0\] Ein mitlaufendes Projekt zahlt pro übernommenem Update Integrationszeit und neue Bugs nach 5.3.
- ENG-R43 \[1.0\] Nach dem Feature-Freeze kommen nur Fehlerbehebungen der Engine ins Projekt; ein Engine-Update danach kostet so viel wie ein Feature nach dem Freeze (S02).
- ENG-R44 \[1.0\] Der Wechsel auf eine neue Hauptversion kostet nach Phase: Konzept und Pre-Production 0–1 Woche, Produktion 3–8 Wochen, ab Alpha nur mit Verschiebung (mindestens 8 Wochen).

**Anforderungen an das Engine-Team**

- ENG-R50 \[1.0\] Ein Projekt kann eine fehlende Modulstufe bestellen; die Anforderung bekommt als Frist den geplanten Feature-Freeze des Projekts. Der Freeze liegt je Umfang an einem anderen Punkt (PRD-R27): klein bei 60 % der Produktion, mittel zu Beginn der Beta, groß und AAA bei Alpha.
- ENG-R51 \[1.0\] Mehrere Anforderungen an dieselbe Stufe werden zusammengefasst; die früheste Frist gilt.
- ENG-R52 \[1.0\] Das Engine-Team arbeitet Anforderungen nach Priorität ab (Spieler oder Regel), bei Gleichstand nach Frist, danach nach ID.
- ENG-R53 \[1.0\] Ist eine Anforderung zum Feature-Freeze nicht fertig, entsteht eine Entscheidung: Feature streichen, Projekt verschieben oder Notlösung im Projekt (Feature mit 70 % Wirkung und +15 Schuld im Modul).
- ENG-R54 \[1.0\] Lizenznehmer mit Premium-Support können Anforderungen an die Engine des Spielers stellen; Erfüllen erhöht deren Zufriedenheit um 10, Ablehnen senkt sie um 5.
- ENG-R55 \[1.0\] Bei einer fremden Engine kann der Spieler mit Premium-Support Wünsche einreichen; der Anbieter erfüllt sie mit 40 % Wahrscheinlichkeit innerhalb von 26 Wochen; mit Quellcode-Zugang kann der Spieler das Modul selbst ausbauen.
- ENG-R56 \[später\] Projekt-Zweige: Ein Projekt baut ein Modul lokal aus und muss es zurückführen, sonst steigt die Schuld um 2 pro Monat.

**Neubau und Lizenznehmer**

- ENG-R60 \[1.0\] Beim Neubau einer Hauptversion wechselt ein Teil der Lizenznehmer zur Konkurrenz (S04); laufende Spiele der Lizenznehmer bleiben auf der alten Version.

**Technik-Update per Patch**

- ENG-R70 \[1.0\] Ein veröffentlichtes Spiel kann ein Technik-Update bekommen, wenn eine neuere Engine-Version derselben Engine existiert.
- ENG-R71 \[1.0\] Es gibt drei Formen: kostenlos, kostenpflichtiges Upgrade (Aufpreis 10–20 % des Vollpreises) und Remaster (eigenes Produkt zum Vollpreis mit neuer Pressewertung).
- ENG-R72 \[1.0\] Der Aufwand hängt vom Versionsabstand und dem Umfang des Spiels ab (5.4); zwei Hauptversionen Abstand kosten 80 % eines Remasters.
- ENG-R73 \[1.0\] Nach dem Update wird E des Produkts neu berechnet; die Pressewertung bleibt, die Spielerwertung kann steigen.
- ENG-R74 \[1.0\] Ein Technik-Update kann neue Plattformen mitbringen, wenn die neue Engine-Version sie unterstützt.
- ENG-R75 \[1.0\] Mit 25 % Wahrscheinlichkeit (gesenkt durch QA-Kapazität) löst ein Update das Ereignis „Update zerstört Mods und Spielstände“ aus.

## 5 Formeln und Startwerte

**5.1 Engine-Faktor**

```latex
E = \frac{1}{|M_P|}\sum_{m \in M_P} \Big(\frac{\text{Stufe}_m + 1}{\text{Stand}_m(\text{Jahr}) + 1}\Big)^{\gamma},\qquad E \in [0{,}3;\ 1{,}15]
```

M\_P = vom Projekt genutzte Module. Ein Vorreiter-Modul über dem Stand der Technik bringt bis zu +15 %. Potenz und Bruch werden nach A22 als Tabelle gerechnet (Numerik-Anhang S12). Für den Lizenzmarkt: L = (E − 0,3) / 0,85 mit allen acht Modulen (ENG-R13).

Prüfrechnung zu ENG-T01 (γ = 1,2): Eine Engine auf dem Stand von 2005 (Rendering 4, Audio 4, Physik 3, KI 3, Netzwerk 3, Werkzeuge 3, Plattformen 2, Streaming 1) gegen den Stand 2012 (5, 5, 4, 3, 4, 4, 3, 2) ergibt die Verhältnisse 5/6, 5/6, 4/5, 1, 4/5, 4/5, 3/4, 2/3 und hoch 1,2 die Werte 0,80; 0,80; 0,77; 1,00; 0,77; 0,77; 0,71; 0,61. Mittel über alle acht Module: E = 0,78. Mit dem alten γ = 0,6 wären es 0,88; deshalb wurde γ erhöht.

**5.2 Schuld**

```latex
\text{Tempo}_m = 1 - 0{,}004 \cdot \text{Schuld}_m,\qquad \text{Bugs}_m = 1 + 0{,}01 \cdot \text{Schuld}_m,\qquad \text{Updatekosten}_m = K \cdot (1 + 0{,}01 \cdot \text{Schuld}_m)
```

**5.3 Integration mitlaufender Projekte**

```latex
\text{Integration} = w_i \cdot \text{Umfangsfaktor} \cdot |\Delta\text{Module}|\ \text{Wochen},\qquad \text{Bugs}_{\text{Update}} = 0{,}05 \cdot \text{Bugs}_{\text{Projekt}}
```

**5.4 Technik-Update**

```latex
\text{Aufwand} = \text{Aufwand}_{\text{Remaster}} \cdot \min\big(1,\ 0{,}4 \cdot \Delta\text{Hauptversion} + 0{,}1 \cdot \Delta\text{Unterversion}\big)
```

**5.5 Einarbeitung in eine gekaufte Engine**

Tempo = 1 − 0,3 · max(0, 1 − w / D), w = Wochen seit dem Kauf, D = min(16, 8 + Anzahl Module mit Stufe ≥ 4), mit Mentoren der Tochter D · 0,75. Das Tempo wirkt auf alle Arbeitspakete eigener Teams, die die Engine nutzen, zusätzlich zur Schuld (5.2).

| Parameter | Startwert | Bereich | Datei |
| --- | --- | --- | --- |
| Exponent γ im Engine-Faktor | 1,2 | 0,8–1,6 | data/engine/factor.json |
| Vorreiter-Bonus max. | +15 % | 0–30 % | data/engine/factor.json |
| Schuld pro Update | +8 je geändertem Modul | 3–15 | data/engine/debt.json |
| Wartung | −1 Schuld pro Personenwoche | – | data/engine/debt.json |
| Schwelle Neubau-Empfehlung | 80 | 60–95 | data/engine/debt.json |
| Kosten Update | ca. 1/3 einer neuen Hauptversion | – | data/engine/versions.json |
| Integration w\_i (klein / mittel / groß / AAA) | 0,5 / 1 / 2 / 3 Wochen je Modul | – | data/engine/binding.json |
| Hauptversion wechseln (Produktion) | 3–8 Wochen | – | data/engine/binding.json |
| Notlösung bei verpasster Anforderung | 70 % Wirkung, +15 Schuld | – | data/engine/requests.json |
| Erfüllungschance Wunsch an Fremdanbieter | 40 % in 26 Wochen | 10–70 % | data/engine/requests.json |
| Aufpreis kostenpflichtiges Upgrade | 15 % des Vollpreises | 10–20 % | data/products/types.json |
| Risiko „Update zerstört Mods“ | 25 % × (1 − QA-Anteil) | 5–40 % | data/events/techupdate.json |
| Lizenzqualität L | (E − 0,3) / 0,85 | 0–1 | data/engine/factor.json |
| Einarbeitung gekaufte Engine | −30 % Tempo, abnehmend über 8–16 Wochen; Mentoren −25 % Dauer | 15–45 % | data/engine/onboarding.json |
| Netzwerk-Mindeststufe Online-Kopierschutz | 2 | – | data/engine/modules.json |

**Modulstufen mit frühestem Jahr (Startwerte):**

| Modul | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Rendering | Text 1980 | 2D-Sprites 1980 | 2,5D 1990 | 3D 1995 | Shader 2002 | Physikalisch basiert 2012 | Raytracing 2020 |
| Audio | Piepser 1980 | 8-Bit 1982 | Samples 1988 | CD-Audio 1993 | Raumklang 2000 | 3D-Audio 2012 | – |
| Physik | keine 1980 | einfach 1985 | Rigid Body 1998 | Ragdoll 2004 | Destruction 2010 | Simulation 2028 | – |
| KI | Skripte 1980 | Zustände 1985 | Wegfindung 1992 | Verhaltensbäume 2004 | Lernende Gegner 2018 | Generative Inhalte 2028 | – |
| Netzwerk | keins 1980 | LAN 1993 | Online 1997 | Massively Multiplayer 1999 | Cloud-Dienste 2010 | Streaming-Server 2020 | – |
| Werkzeuge | Code 1980 | Editor 1985 | Level-Editor 1993 | Mod-Support 1998 | Visuelles Scripting 2008 | KI-Werkzeuge 2026 | – |
| Plattformen | eine 1980 | mehrere 1988 | plattformübergreifend 2000 | Mobile 2008 | Cloud 2019 | – | – |
| Streaming | Laden 1980 | Hintergrund-Streaming 2001 | Offene Welt ohne Ladezeiten 2006 | SSD-Streaming 2020 | – | – | – |

Forschungskosten pro Stufe (Startwert): 40 Personenwochen × 1,8^Stufe, skaliert mit dem Gehaltsniveau des Jahres; Dauer mindestens 8 Wochen.

## 6 Entscheidungen des Spielers

| Entscheidung | Wann | Optionen | Standard/Delegation |
| --- | --- | --- | --- |
| Engine bauen oder lizenzieren | Projektstart, Strategie | eigene, fremde, Starter-Engine | Starter-Engine bis zur Freischaltung |
| Forschung einplanen | jederzeit | Modul und Zielstufe | Technischer Direktor nach Regel |
| Kapazität teilen | jederzeit | Trennbalken Forschung, Wartung, Anforderungen | 50 / 25 / 25 |
| Herkunft eines Moduls | beim Bau oder später | eigen, lizenzieren, kaufen | eigen |
| Neue Hauptversion | ab Schuld-Empfehlung oder jederzeit | jetzt, später | Empfehlung als Entscheidung |
| Engine-Bindung | Projektstart bis Freeze | fest, mitlaufend | nach Umfang |
| Feature bestellen | gesperrte Karte | bestellen, nicht | Produzent |
| Verpasste Anforderung | Feature-Freeze | streichen, verschieben, Notlösung | Pflicht-Entscheidung |
| Priorität von Anforderungen | bei Konflikt | Reihenfolge | Regel „eigene Projekte vor Lizenznehmern“ |
| Technik-Update | veröffentlichtes Spiel | kostenlos, Upgrade, Remaster, keins | Regel „Live-Spiel zwei Versionen zurück → Update“ |

## 7 KI-Verhalten

KI-Studios mit Strategie „eigene Engine“ forschen nach Lieblingsgenres (Rollenspiel: KI und Streaming; Rennspiel: Physik und Rendering) und bauen ab Schuld 85 neu. Studios mit Lizenz-Strategie wählen Engines nach Nutzwert (S04). Die Bindung wählen KI-Studios wie der Standard (nach Umfang). Verpasste Anforderungen lösen sie nach Risikofreude: vorsichtig streichen, riskant Notlösung. Live-Spiele der KI bekommen ein kostenloses Technik-Update, sobald sie zwei Hauptversionen zurückliegen und noch mindestens 20 % ihrer Spitzenbasis haben.

## 8 Oberfläche

- **Engine-Werkstatt (Platine):** acht Modul-Chips mit Stufenpunkten, Linie „Stand der Technik“, Rost für Schuld, Ketten-Symbol für Fremdmodule; Steckleisten für Anforderungen (mit Frist und Projekt) und Lizenznehmer; Trennbalken für die Kapazität; unten blockierte Spiel-Features.
- **Im Projekt:** Engine-Leiste mit Version, Bindung und ausstehenden Anforderungen; im Brett ausstehende Karten mit zwei Prognose-Fächern.
- **Analysieren:** Tabelle Module × Stufe × Schuld × Herkunft × Kosten; Forschungsbaum; Anforderungsliste; Einnahmen pro Engine (S04).

## 9 Ereignisse und Meldungen

- Forschung fertig (Ergebnis), Vorreiter-Meldung (Information), Schuld-Symptom (Ergebnis), Neubau empfohlen (Entscheidung), Anforderung verpasst (Entscheidung), Anforderung eines Lizenznehmers (Entscheidung), Anbieter-Roadmap geändert (Information), „Update zerstört Mods und Spielstände“ (Kette: entschädigen, zurücksetzen, Modder unterstützen).

## 10 Schnittstellen

| Richtung | System | Inhalt |
| --- | --- | --- |
| liefert an | S02 | Modulstufen, E, Schuld, Bindung, Status von Anforderungen |
| liefert an | S04 | Engines, Versionen, Roadmap, Vorreiter-Status |
| liefert an | S06 | E für Live-Produkte, Technik-Update |
| liest | S07 | Kapazität des Engine-Teams, Technischer Direktor, QA |
| liest | S08 | Stand der Technik pro Jahr, Plattform-Unterstützung (Devkits) |
| liest | S05 | Kopierschutz-Stufe pro Release |

## 11 Abnahmetests

- ENG-T01 Gegeben eine Engine, die 2005 in allen acht Modulen auf dem Stand der Technik war und nicht weiterentwickelt wird, wenn 2012 ein Spiel damit erscheint, das alle Module nutzt, dann ist E = 0,78 (≤ 0,8, Prüfrechnung in 5.1) und die Wertung sichtbar niedriger.
- ENG-T02 Gegeben drei Updates ohne Wartung, wenn ein Projekt das Modul nutzt, dann verschiebt sich sein Termin und das Symptom wird gemeldet.
- ENG-T03 Gegeben ein mitlaufendes Projekt, wenn vor dem Freeze ein Update erscheint, dann übernimmt es das Update mit Integrationszeit; nach dem Freeze nicht mehr.
- ENG-T04 Gegeben zwei Projekte mit Anforderung an dieselbe Stufe, wenn die Anforderungen entstehen, dann gibt es eine zusammengefasste Anforderung mit der früheren Frist.
- ENG-T05 Gegeben eine nicht rechtzeitig fertige Anforderung, wenn der Feature-Freeze erreicht wird, dann entsteht eine Pflicht-Entscheidung mit drei Optionen.
- ENG-T06 Gegeben ein MMO auf einer Engine zwei Hauptversionen zurück, wenn ein kostenloses Technik-Update erscheint, dann sinkt seine Abwanderung im Folgejahr messbar.
- ENG-T07 Gegeben ein gekauftes Modul mit Schuld 60, wenn es eingebaut wird, dann hat es Schuld 60.
- ENG-T08 Gegeben der Bot „nie eine eigene Engine“ und der Bot „immer eigene Engine“, wenn 20 Läufe 1980–2040 laufen, dann gewinnt jeder mindestens 25 % der Läufe.
- **ENG-T09** Gegeben eine neue Firma 1980, wenn sie die Starter-Engine öffnet, dann hat Rendering Stufe 1 und jedes andere Modul Stufe 0.
- **ENG-T10** Gegeben ein Release 1995, wenn Kopierschutz gewählt wird, dann sind nur Stufen ohne Online-Bezug wählbar, ohne Modulbedarf; Online-Aktivierung ist erst mit Netzwerk ≥ 2 wählbar.
- **ENG-T11** Gegeben eine gekaufte Engine mit zwei Modulen auf Stufe ≥ 4, wenn ein eigenes Team sie nutzt, dann arbeitet es in Woche 0 mit 70 % Tempo, in Woche 5 mit 85 % und ab Woche 10 mit vollem Tempo.
- **ENG-T12** Gegeben E = 1,15 bzw. E = 0,3, wenn die Lizenzqualität berechnet wird, dann ist sie 1 bzw. 0.
- **ENG-T13** Gegeben ein kleines und ein AAA-Projekt, die dieselbe Modulstufe bestellen, wenn die Anforderungen entstehen, dann hat die des kleinen Projekts die Frist bei 60 % seiner Produktion und die des AAA-Projekts bei Alpha.

## 12 Spätere Versionen

- &#91;1.1\] Feinere Roadmap-Verhandlung mit Fremdanbietern (bezahlte Priorität).
- &#91;später\] Projekt-Zweige mit Rückführung (ENG-R56).
- &#91;später\] Eigener Middleware-Lizenzmarkt (ENG-R34).
- &#91;später\] Engine-Unterstützung für eine eigene Konsole des Spielers (S13).

## Änderungen nach Prüfung 3

- **Starter-Engine:** Rendering 1, alle anderen Module 0 (ENG-R06, ENG-T09).
- **Veralterung:** γ von 0,6 auf 1,2; Prüfrechnung 2005 → 2012 ergibt E = 0,78 (5.1, Parameter, ENG-T01).
- **Kopierschutz:** ohne Modul als reine Release-Option, vor 2000 nur diese; Online-Aktivierung und Online-Pflicht verlangen Netzwerk ≥ 2 (ENG-R33, ENG-T10).
- **Lizenzqualität für S04:** L = (E − 0,3) / 0,85 (ENG-R13, ENG-T12).
- **Frist von Anforderungen:** folgt dem Feature-Freeze je Umfang aus S02 (ENG-R50, PRD-R27, ENG-T13).
- **Gekaufte Engine (A29):** −30 % Tempo, abnehmend über 8–16 Wochen, Mentoren der Tochter verkürzen (ENG-R36, 5.5, ENG-T11).
