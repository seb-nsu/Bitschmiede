# S13 Ausbau nach 1.0

**Version:** 1.1 und später, Stand 29.10.2026 · **Quelle:** Design-Dokument → Umfang von Version 1.0 (Nach 1.0), einzelne „Nach 1.0“-Markierungen in allen Kapiteln · **Prefix:** AUS

## 1 Zweck und Abgrenzung

Diese Spezifikation sammelt alles, was nach 1.0 kommt, damit der Funktionsumfang vollständig beschrieben ist und 1.0 schon die nötigen Andockpunkte hat. Jeder Ausbau hat Zweck, Kernregeln, Abhängigkeiten, groben Aufwand (Personenwochen, PW, für eine Person mit Claude Code, ohne Grafik, falls nicht anders genannt) und eine vorgesehene Version. Die Regeln sind Kurzspezifikationen; vor der Umsetzung wird jede in die jeweilige Haupt-Spezifikation (S02–S12) übernommen und dort ausgearbeitet.

**Grundsatz:** Kein Ausbau darf eine Regel aus 1.0 brechen. 1.0 muss für jeden Ausbau die genannten Andockpunkte bereits enthalten (Abschnitt 4).

## 2 Übersicht und Reihenfolge

| # | Ausbau | Version | Aufwand | Abhängig von |
| --- | --- | --- | --- | --- |
| 1 | Projekt-Zweige der Engine | 1.2 | 3–4 PW | S03 Anforderungen |
| 2 | Weitere Messe-Typen und Standgrößen | 1.2 | 2–3 PW | S05 Messe-Saison |
| 3 | PC-Leistungsklassen als Standard | 1.2 | 2 PW | S08 Plattformen (Schalter existiert) |
| 4 | Eigenes Publishing + Startprofil Publisher | 1.3 | 6–8 PW | S07 Publisher-Verhandlung (gespiegelt), S11 Verhandlungstisch |
| 5 | Co-Entwicklung | 1.3 | 3–4 PW | S07 Auftragsarbeit |
| 6 | Server-Hosting für Fremde | 1.3 | 2–3 PW | S06 Server, S07 Auftragsarbeit |
| 7 | Middleware-Lizenzmarkt | 1.3 | 4–6 PW | S03 Fremdmodule, S04 Vorlagen |
| 8 | Büro-Ansicht von oben | 1.4 | 8–12 PW Code + 3–6 Monate Grafik | S07 Büro, S11 Bühne (Plan A trägt bis dahin) |
| 9 | Übernahme-Vollversion | 1.4 | 8–12 PW | S09 Minimalversion, S07 Börse |
| 10 | Börse-Erweiterungen | 1.4 | 4–5 PW | S07 Börse, Nr. 9 |
| 11 | Fanshop-Lager | 1.4 | 2–3 PW | S05 Merchandising |
| 12 | Film und Serie als Mechanik | 1.4 | 3–4 PW | S05 Merchandising, S02 Marken |
| 13 | E-Sport | 1.5 | 5–7 PW | S06 Live-Service, S05 Messen |
| 14 | Code-Mods (Skript-Schnittstelle) | 1.5 | 6–8 PW | S10 Modding, S12 Ladepipeline |
| 15 | Eigener digitaler Store | 2.0 | 6–8 PW | S08 Vertrieb, S04 |
| 16 | Eigene Konsole | 2.0 | 12–16 PW + Grafik | S08 Plattformen, Devkits, Nr. 15 |
| 17 | Markenmarkt-Erweiterungen (Genre-Lizenzen, Crossover) | später | 3–4 PW | S04 Markenmarkt |
| 18 | Multiplayer (zurückgestellt) | offen | nicht geschätzt | deterministischer Kern (S12) |

**Begründung der Reihenfolge:** Zuerst kleine Vertiefungen mit wenig Risiko. Dann neue Geschäftsbereiche, die vorhandene Bausteine spiegeln (Publishing, Co-Entwicklung, Middleware). Danach die Büro-Ansicht: Sie bringt keine neue Mechanik und bindet den meisten Grafikaufwand; bis dahin trägt die Bühne nach Plan A (S11). Dann das Spätspiel (Übernahmen, Börse, Medien). Zuletzt die großen eigenen Plattformen, die auf fast allem aufbauen. Die Reihenfolge wird nach Early-Access-Rückmeldung neu geprüft.

## 3 Kurzspezifikationen

### 3.1 Büro-Ansicht von oben \[1.4, nach Publishing und Middleware\]

- **Zweck:** Das wachsende Büro wie in Game Dev Tycoon als sichtbarer Fortschritt.
- **AUS-R01** Die Büro-Ansicht zeigt den aktuellen Grundriss als stilisierte Draufsicht (wie Prison Architect) mit Figuren an Arbeitsplätzen und Räumen für belegte Ausstattungsplätze.
- **AUS-R02** Nichts wird frei platziert; Möbel sind Epochen-Skins fester Plätze; ein Klick auf einen Raum öffnet Ausstattung und Upgrade.
- **AUS-R03** Bühne und Büro-Ansicht lesen dieselben Daten; die Einstellung „Büro-Darstellung“ schaltet um, ohne den Spielstand zu ändern.
- **Abhängigkeiten:** Office/Equipment-Daten (S07), PixiJS-Renderer (S11/S12).
- **Aufwand:** 8–12 PW Code, 3–6 Monate Grafik (5 Größen × 2–3 Varianten, 60–100 Möbel-Skins, Figuren-Animationen).

**Isometrische Ansicht \[später\]:** Nur mit beauftragten 2D-Grafikern. Claude Code kann konsistente isometrische Möbel und Figurenanimationen in vielen Varianten nicht zuverlässig erzeugen; die Draufsicht dagegen schon (Abgleich A21).

### 3.2 Projekt-Zweige der Engine \[1.2\]

- **Zweck:** Ein Projekt baut ein Modul lokal aus, schneller als über das Engine-Team.
- **AUS-R10** Ein Projekt kann einen Zweig eines Moduls eröffnen; die Stufe gilt nur für dieses Projekt.
- **AUS-R11** Solange der Zweig nicht zurückgeführt ist, steigt die technische Schuld der Engine pro Monat um einen festen Betrag.
- **AUS-R12** Die Rückführung kostet Engine-Team-Zeit abhängig vom Stufenabstand; danach steht die Stufe allen Projekten zur Verfügung.
- **Abhängigkeiten:** Engine-Bindung, Anforderungen (S03).

### 3.3 Weitere Messe-Typen und Standgrößen \[1.2\]

- **AUS-R20** Zusätzlich zu Branchenmesse und Entwicklerkonferenz: Publikumsmesse, Demo-Festival, digitaler Showcase, eigener Showcase ab Firmengröße.
- **AUS-R21** Standgröße (klein, mittel, groß) ist eine Option der Messe-Saison; größer = mehr Interesse und Kosten.
- **Abhängigkeiten:** Messe-Saison (S05).

### 3.4 PC-Leistungsklassen als Standard \[1.2\]

- **AUS-R30** Der in 1.0 vorhandene Schalter wird standardmäßig eingeschaltet; die PC-Basis teilt sich in Einstieg, Mittelklasse, High-End.
- **AUS-R31** Die Mindestanforderungen eines Spiels bestimmen den erreichbaren Anteil der PC-Basis.

### 3.5 Eigenes Publishing und Startprofil Publisher \[1.3\]

- **Zweck:** Der Spieler veröffentlicht Spiele von KI-Studios.
- **AUS-R40** KI-Studios pitchen Projekte mit Konzept oder Vertical Slice; der Spieler bietet am Verhandlungstisch Vorschuss, Raten, Split, Laufzeit, IP und Sequel-Option (gespiegelte Publisher-Verhandlung).
- **AUS-R41** Das Studio erreicht Meilensteine mit der Wahrscheinlichkeit seiner Fähigkeiten; verfehlte Meilensteine erlauben Kürzen, Auflagen oder Stoppen.
- **AUS-R42** Die Abteilung Publishing übernimmt Marketing und Vertrieb der fremden Spiele; ihre Größe begrenzt die Zahl gleichzeitiger Titel.
- **AUS-R43** Startprofil Publisher: Start mit Kapital, Publishing-Abteilung und zwei Partnerstudios, ohne eigene Entwicklung.
- **Abhängigkeiten:** PublisherDeal (S07), Verhandlungstisch (S11).

### 3.6 Co-Entwicklung \[1.3\]

- **AUS-R50** Ein Auftrag „Co-Entwicklung“ bindet ein gemischtes Team für einen Teil eines fremden Projekts gegen Festpreis plus Umsatzbeteiligung.
- **AUS-R51** Die Qualität des Beitrags fließt anteilig in die Wertung des fremden Spiels und in den Ruf des Spielers.

### 3.7 Server-Hosting für Fremde \[1.3\]

- **AUS-R60** Eigene Rechenzentren mit freier Kapazität können an KI-Studios vermietet werden (laufende Einnahme pro Kapazitätseinheit).
- **AUS-R61** Ausfälle treffen eigene und fremde Spiele gleichermaßen und kosten Ruf bei Kunden.

### 3.8 Middleware-Lizenzmarkt \[1.3\]

- **AUS-R70** Einzelne selbst entwickelte Module können ohne die ganze Engine lizenziert werden (Vorlagen wie bei Engines).
- **AUS-R71** KI-Studios bewerten Middleware nach demselben Nutzwert wie Engines, nur für das jeweilige Modul.

### 3.9 Übernahme-Vollversion \[1.4\]

- **AUS-R80** Weitere Beteiligungsformen: Partnerschaft, Minderheits- und Mehrheitsbeteiligung, Fusion, Kauf einzelner Werte.
- **AUS-R81** Earn-outs, Aktien als Kaufpreis, Wettbewerbsbehörde mit Freigabe, Auflagen, Verzögerung oder Verbot.
- **AUS-R82** Zielklauseln für Autonomie, Reorganisation (zusammenlegen, verschieben, verkaufen, ausgliedern, Management-Buyout).
- **AUS-R83** Feindliche Übernahmen gegen den Spieler (nur wenn börsennotiert) und durch den Spieler.
- **Abhängigkeiten:** S09 Minimalversion, Börse.

### 3.10 Börse-Erweiterungen \[1.4\]

- **AUS-R90** Aktivistische Aktionäre, Übernahmeschutz, Kapitalerhöhung, Aktienrückkauf, Delisting.
- **AUS-R91** Unter 50 % eigener Anteil kann ein Rivale die Mehrheit kaufen (verknüpft mit AUS-R83).

### 3.11 Fanshop-Lager \[1.4\]

- **AUS-R100** Eigener Fanshop mit Einzelprodukten, Auflage und Lagerkosten wie bei der physischen Auflage; Restposten senken die Marge.

### 3.12 Film und Serie als Mechanik \[1.4\]

- **AUS-R110** Statt nur als Ereignis: Lizenzvertrag mit Mitsprache-Stufe; Qualität des Films aus Studio-Wahl und Mitsprache; Erfolg stärkt, Flop schwächt die Marke.

### 3.13 E-Sport \[1.5\]

- **AUS-R120** Kompetitive Online-Spiele können eine Liga erhalten; Kosten für Preisgelder und Organisation, Erträge aus Sponsoring und Übertragungsrechten.
- **AUS-R121** E-Sport senkt den Churn des Spiels und steigert dessen Bekanntheit; schlechtes Balancing (Ereignis) schadet.

### 3.14 Code-Mods \[1.5\]

- **AUS-R130** Eine Skript-Schnittstelle in einer Sandbox im Worker (z. B. QuickJS) mit festen Einstiegspunkten: Wochen-Tick, Release, Vertrag, Ereignis, eigene Ansicht.
- **AUS-R131** Skripte haben keinen Zugriff auf Netzwerk und Dateisystem und nur deterministischen Zufall über einen eigenen Seed-Strom.
- **AUS-R132** Spielstände mit Code-Mods sind markiert; Erfolge sind dort abgeschaltet.

### 3.15 Eigener digitaler Store \[2.0\]

- **AUS-R140** Der Spieler kann ab etwa 2005 einen eigenen Store für PC eröffnen; er behält den Store-Anteil eigener Spiele und erhält Anteile fremder Verkäufe.
- **AUS-R141** Ein Store braucht Kundenbasis (Exklusivtitel, Rabattaktionen, Kundenservice) und bindet Betriebskapazität.

### 3.16 Eigene Konsole \[2.0\]

- **Zweck:** Der Spieler wird Plattformhersteller.
- **AUS-R150** Eine Konsole wird aus Komponenten entworfen (Prozessor, Grafik, Speicher, Datenträger, Online, Controller) mit Kosten, Leistung und Erscheinungsjahr; daraus ergeben sich Leistungsprofil und Herstellkosten.
- **AUS-R151** Der Spieler legt Preis, Lizenzgebühr und Starttermin fest und verteilt Devkits in Wellen selbst (gleiche Regeln wie S08, gespiegelt).
- **AUS-R152** Die Konsole folgt denselben Regeln für Attraktivität und Lebenszyklus wie alle Plattformen; ohne starke Spiele stirbt sie früh.
- **AUS-R153** KI-Studios entscheiden über Unterstützung nach Basis, Gebühr, Beziehung und Devkit-Zugang.
- **Abhängigkeiten:** Plattformen und Devkits (S08), eigener Store (3.15), Plattformbeziehungen.
- **Aufwand:** 12–16 PW Code plus Grafik für Komponenten und Silhouetten.

### 3.17 Multiplayer \[zurückgestellt\]

Der Multiplayer ist auf Wunsch zurückgestellt. Es gibt keine Regeln, nur Architektur-Anforderungen, die 1.0 bereits erfüllt:

- **AUS-R160** Der Kern bleibt deterministisch (S12 TEC-R04); ein gemeinsamer Lauf wäre als Lockstep über ausgetauschte Eingabeprotokolle möglich.
- **AUS-R161** Eingaben sind vollständige, serialisierbare Objekte mit Ziel-Tick (S12 Worker-Protokoll).
- **AUS-R162** Der Spieler ist im Datenmodell eine Firma unter vielen (keine Sonderrolle außer Eingabequelle).

### 3.18 Markenmarkt-Erweiterungen \[später\]

- **Zweck:** Der Markenmarkt (S04) bekommt längere und feinere Verträge.
- **AUS-R170** Genre-Lizenz: Eine Marke wird für ein ganzes Genre über 2–5 Jahre lizenziert, nicht nur für einen Titel. Der Lizenznehmer darf in der Laufzeit beliebig viele Titel bringen; die Markenmüdigkeit trägt der Lizenzgeber mit.
- **AUS-R171** Crossover und Gastauftritt: Eine Figur oder Welt einer fremden Marke erscheint gegen Gebühr in einem eigenen Spiel. Beide Marken gewinnen Frische, wenn das Spiel gut bewertet wird; ein Flop schadet beiden.
- **Abhängigkeiten:** Markenmarkt und Lizenzvertrag (S04), Markenstärke und Frische (S02), KI-Verhalten im Markenmarkt (S08 MRK-R69).

## 4 Andockpunkte, die 1.0 schon enthalten muss

| Ausbau | Andockpunkt in 1.0 |
| --- | --- |
| Büro-Ansicht | Office und Equipment als Daten, Bühne in PixiJS |
| Projekt-Zweige | Engine-Bindung und Anforderungen pro Projekt |
| Messe-Typen | Veranstaltungen als Datensätze, Messe-Saison |
| PC-Leistungsklassen | Schalter und Felder in Platform |
| Publishing | PublisherDeal symmetrisch modelliert (Geber/Nehmer beliebige Firma) |
| Co-Entwicklung, Hosting | Aufträge als Datensätze, Server-Kapazität pro Firma |
| Middleware | Module mit Herkunft und Lizenzmodell |
| Übernahmen, Börse | Company mit Eigentümern und Anteilen, Directive-Objekt |
| Fanshop, Film | Merchandising pro Marke, Ereignis Verfilmung |
| E-Sport | Online-Spiele mit Spielerbasis und Zufriedenheit |
| Code-Mods | Ladepipeline, Einstiegspunkte im Tick benannt |
| Store, Konsole | Platform als Datensatz mit Hersteller = beliebige Firma; Store-Anteil als Parameter |
| Markenmarkt-Erweiterungen | Markenlizenz als Vertrag mit Umfang und Laufzeit (S04); Marken-Auftritt als Datensatz |
| Multiplayer | Determinismus, Eingabeprotokoll |

## 5 Abnahmetests (übergreifend)

- **AUS-T01** Gegeben ein Spielstand aus 1.0, wenn er in einer Version mit Ausbau geladen wird, dann läuft er ohne Verlust weiter; neue Systeme starten mit neutralen Werten.
- **AUS-T02** Gegeben ein Ausbau ist aktiv, wenn die Golden-Runs ohne Nutzung des Ausbaus laufen, dann bleiben die Ergebnisse der 1.0-Systeme gleich.
- **AUS-T03** Gegeben ein Ausbau, wenn Balancing-Läufe mit allen Bot-Strategien laufen, dann gewinnt keine Strategie in mehr als 60 % der Seeds.

## Änderungen nach Prüfung 3

- Büro-Ansicht in der Reihenfolge hinter Publishing und Middleware eingeordnet (Nr. 8, Version 1.4); Begründung ergänzt. Bis dahin trägt die Bühne nach Plan A (S11).
- Neu: Markenmarkt-Erweiterungen \[später\] mit Genre-Lizenzen über Jahre und Crossover/Gastauftritt (3.18, Nr. 17, Andockpunkt in Abschnitt 4); Verweis auf S04.
