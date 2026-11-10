# S10 Ziele, Szenarien, Einstellungen und Modding

**Version:** 1.0, Stand 29.10.2026 · **Quelle:** Design-Dokument, Kapitel „Ziele, Szenarien und Einstellungen“, „Modding und Workshop“, „Die erste Stunde“ · **Prefix:** ZIE

## 1 Zweck und Abgrenzung

Dieses System legt fest, worauf der Spieler hinarbeitet (Meilensteine, Preise, Ziele, Spielende), mit welchen Bedingungen er startet (Starteinstellungen, Szenarien, Schwierigkeit) und wie das Spiel erweitert werden kann (Modding und Workshop).

- **In 1.0:** Meilensteine und Erfolge, Branchenpreise, Ruhmeshalle, langfristige Ziele, Spielende mit Chronik und Vermächtnis-Wertung, sechs Szenarien (Notfall drei), Starteinstellungen, fünf Schwierigkeits-Presets mit Stellschrauben, Schalter, allgemeine Einstellungen, Modding der Stufen Daten, Inhalte und Ereignisse, Workshop.
- **Später:** Code-Mods mit Skript-Schnittstelle, weitere Szenarien, Online-Bestenlisten für Seeds.
- **Nicht hier:** Freischaltung der Systeme im Spielverlauf (S01 und S11), Darstellung von Momenten (S11), Speicherformat im Detail (S12).

## 2 Begriffe

| Begriff | Bedeutung |
| --- | --- |
| Meilenstein | Einmaliges Ziel im Spielverlauf, z. B. „erstes Spiel über 9,0“; zugleich Erfolg (Achievement) |
| Branchenpreis | Jährlicher Preis (Spiel, Engine, Studio des Jahres) mit Wirkung auf Verkäufe und Ruf |
| Ruhmeshalle | Liste der besten eigenen Spiele, Engines und Momente |
| Langfristiges Ziel | Beim Start optional gewähltes Hauptziel |
| Chronik | Zeitleiste der Firmengeschichte aus Jahrbuch-Einträgen (Entität Chronicle) |
| Vermächtnis-Wertung | Punktzahl und Titel am Spielende |
| Preset | Schwierigkeitsgrad als Paket von Stellschrauben |
| Stellschraube | Einzelner Schwierigkeitsparameter |
| Erfolgssperre | Markierung eines Spielstands, in dem Erfolge nicht mehr freigeschaltet werden |
| Mod | Paket, das Daten, Inhalte oder Ereignisse ändert oder ergänzt |
| Ladepipeline | Gemeinsamer Ladeweg für Grundspiel und Mods |

## 3 Daten

| Entität/Feld | Typ | Einheit/Bereich | Bedeutung |
| --- | --- | --- | --- |
| **Goal** |  |  | Meilenstein oder langfristiges Ziel |
| .id, .kind | string, enum | meilenstein, langfristig, szenario, epoche | Art |
| .condition | Ausdruck | Datenformat aus S01 (Bedingungssprache) | Wann erfüllt |
| .progress | number | 0–1 | Fortschritt für Anzeige |
| .reward | {ruf?, geld?, titel?} |  | Belohnung |
| .achievementId | string? |  | Verknüpfter Steam-Erfolg |
| **Award** |  |  | Branchenpreis eines Jahres |
| .year, .category | int, enum | spiel, engine, studio, newcomer, innovation | Kategorie |
| .winnerId, .nominees | Id, Id\[\] |  | Gewinner und Nominierte |
| **Scenario** |  |  | Szenario |
| .startSettings | Settings |  | Startzustand |
| .startState | Patch auf Spielstand |  | Vorgefertigte Firma, Marken, Verträge |
| .goal, .deadline | Goal, int | Spielwoche | Ziel und Frist |
| **Settings** |  |  | Alle Starteinstellungen |
| .startYear | int | 1980, 1990, 2000, 2010, 2020; Sandbox frei 1980–2035 | Startjahr |
| .startProfile | enum | garage, kleinesStudio, etabliertesStudio, engineFirma; Inhalt (Geld, Personal, Engine, Marken, Beziehungen) je Profil und Startjahr aus der Profil-Tabelle in S01 (KRN-R70 ff.) | Startprofil (Publisher später) |
| .region | enum | nordamerika, europa, japan | Heimatregion |
| .startCapital, .startLoan | int | Cent | Startgeld und Startkredit |
| .seed | string | 16 Hex-Zeichen (ZIE-R52) | Seed |
| .endMode | enum | offen, endjahr, zielbedingung | Spielende |
| .endYear | int | 2000–2100 | Endjahr, Standard 2040 |
| .longTermGoal | GoalId? |  | Langfristiges Ziel |
| .preset | enum | entspannt, leicht, normal, schwer, hardcore, eigen | Schwierigkeit |
| .tuning | Tuning |  | Stellschrauben |
| .switches | Switches |  | Schalter |
| .achievementsLocked | bool |  | Erfolgssperre |
| .ironman | bool |  | Ein Spielstand |
| **Tuning** |  |  | Stellschrauben, siehe Abschnitt 5 |
| **Switches** |  |  | Marktzyklen, Lebenszyklen dynamisch, Hersteller als Übernahmeziel, Übernahmen, Wettbewerbsbehörde (später), Geschäftsmodell-Sperren, Sandbox, Ironman, PC-Leistungsklassen, Büro-Darstellung, Ereignisdichte, Presse-Zufall, Entscheidungsdichte |
| **Preferences** |  |  | Allgemeine Einstellungen (pro Gerät, nicht im Spielstand), u. a. Thema, Zahlenformat, Tempo-Knöpfe, Stummschaltung von Mentor und Sprechblasen |
| **ModManifest** (mod.json) |  |  | Siehe Abschnitt 4, Modding |
| **ModState** im Spielstand | {id, version}\[\] |  | Aktive Mods beim Speichern |

## 4 Regeln

**Meilensteine, Preise, Ziele**

- **ZIE-R01** \[1.0\] Meilensteine werden während des Spiels geprüft, sobald ihre Bedingung erfüllt ist, und lösen einen kurzen Moment und einen Chronik-Eintrag aus.
- **ZIE-R02** \[1.0\] Die 1.0-Meilensteine sind: erstes Spiel veröffentlicht, erster Hit (Wertung ≥ 8), erstes Spiel ≥ 9,0, erste eigene Engine, erste Lizenz, erste Lizenz an ein AAA-Studio, Marke in drei Genres, eine Konsole zehn Jahre am Leben gehalten, Launch-Titel einer Konsole, MMO zehn Jahre betrieben, 100 Mitarbeiter, Campus bezogen, Börsengang, erste Übernahme, Engine des Jahres, Studio des Jahres, Branchenführer nach Umsatz, Integration ohne Abwanderung, „Nie eine eigene Engine“ bis 2040 mit Top-3-Umsatz.
- **ZIE-R03** \[1.0\] Branchenpreise werden einmal im Jahr auf der großen Branchenmesse vergeben, in den Kategorien Spiel, Engine, Studio, Newcomer und Innovation; Engine erst ab dem ersten Lizenzmarkt (etwa 1990).
- **ZIE-R04** \[1.0\] Nominiert sind die fünf besten Kandidaten nach Wertung (Spiel), Lizenzzahl und Qualität (Engine), Umsatzwachstum und Ruf (Studio); der Gewinner wird mit dem Zufallsstrom „awards“ aus den drei Besten gezogen, gewichtet nach Punktzahl.
- **ZIE-R05** \[1.0\] Ein Preis erhöht die Wochenverkäufe des Spiels 8 Wochen lang um 20 % und den Ruf der Firma einmalig um 3 Punkte.
- **ZIE-R06** \[1.0\] Beim Start kann der Spieler höchstens ein langfristiges Ziel wählen: Engine-Marktführer, größte Marke, unabhängig bleiben bis 2040 (nach A04: nie über 49 % der eigenen Aktien verkaufen und keine eigene Marke verkaufen; Auslizenzieren im Markenmarkt ist erlaubt, ein Verkauf dort beendet das Ziel), größter Konzern; eigene Konsole kommt mit dem Ausbau (S13).
- **ZIE-R07** \[1.0\] In der Zukunftsepoche (ab 2025) gibt es zusätzliche Ziele: Engine-Standard der Zukunft, Plattform der Zukunft, Film-Franchise, größter Konzern der Branche.

**Spielende**

- **ZIE-R08** \[1.0\] Das Spiel endet nach der Einstellung Spielende: offen (nie), Endjahr (Standard 2040) oder Zielbedingung (langfristiges Ziel oder Szenario-Ziel erreicht).
- **ZIE-R09** \[1.0\] Ein Spiel endet außerdem bei Insolvenz (Regeln S07); dann zeigt der Abschluss-Bildschirm die Chronik bis zur Insolvenz.
- **ZIE-R10** \[1.0\] Am Spielende öffnet sich der Abschluss-Bildschirm mit Chronik, Vermächtnis-Wertung, Titel und dem Vergleich mit den Rivalen; „Weiterspielen“ ist immer möglich (außer nach Insolvenz).
- **ZIE-R11** \[1.0\] Erfolge werden zum Endzeitpunkt festgehalten; weiterspielen kann weitere Meilensteine, aber keine szenariogebundenen Erfolge mehr freischalten.
- **ZIE-R12** \[1.0\] Die Chronik lässt sich als Bild (PNG) und als Text exportieren.

**Szenarien**

- **ZIE-R13** \[1.0\] 1.0 enthält sechs Szenarien; fehlt Zeit, bleiben Garagen-Traum, Rette die Konsole und Vom Lizenznehmer zum Anbieter.
- **ZIE-R14** \[1.0\] Ein Szenario setzt Startzustand und Schwierigkeit fest; der Spieler kann nur das Preset ändern.
- **ZIE-R15** \[1.0\] Ein Szenario ist gewonnen, wenn das Ziel bis zur Frist erreicht ist, und verloren bei Fristablauf oder Insolvenz.

**Starteinstellungen und Schwierigkeit**

- **ZIE-R16** \[1.0\] Startjahre sind 1980, 1990, 2000, 2010 und 2020; in der Sandbox jedes Jahr von 1980 bis 2035. Bei spätem Start erzeugt das Spiel eine Vorgeschichte (S01) und ein Briefing (S11).
- **ZIE-R17** \[1.0\] Der Seed ist im Startbildschirm sichtbar, kopierbar und frei eingebbar; gleicher Seed und gleiche Einstellungen ergeben dieselbe Welt.
- **ZIE-R18** \[1.0\] Das Preset wird beim Start gewählt; jede Stellschraube lässt sich danach ändern, setzt aber die Erfolgssperre für diesen Spielstand, außer bei Änderungen in Richtung schwerer. Presse-Zufall und Entscheidungsdichte sperren keine Erfolge, auch nicht auf „aus“ oder „ruhig“.
- **ZIE-R19** \[1.0\] Jedes Preset hat einen Ein-Satz-Text, der beschreibt, was einen erwartet (Abschnitt 5).
- **ZIE-R20** \[1.0\] In 100 Simulationsläufen pro Preset mit derselben Bot-Strategie unterscheiden sich die Ergebnisse messbar: Insolvenzquote und Median-Umsatz müssen streng monoton mit der Schwierigkeit verlaufen.
- **ZIE-R21** \[1.0\] Ironman erlaubt nur einen Spielstand pro Partie mit Autosave; Erfolge mit dem Zusatz „Ironman“ gibt es nur dort.
- **ZIE-R22** \[1.0\] Die Sandbox setzt die Erfolgssperre und erlaubt freie Startjahre, unbegrenztes Geld als Option und Entwicklerbefehle.
- **ZIE-R23** \[1.0\] Geschäftsmodell-Sperren (z. B. kein F2P, keine Lootboxen) gelten auch für KI-Studios, damit der Markt fair bleibt.
- **ZIE-R24** \[1.0\] PC-Leistungsklassen sind standardmäßig aus; eingeschaltet teilen sie die PC-Basis in drei Klassen (S08).
- **ZIE-R25** \[1.0\] Die Einstellung Büro-Darstellung wählt Bühne (1.0) oder Büro-Ansicht von oben (ab 1.4, nach Publishing und Middleware, S13); sie ändert keine Spielwerte.

**Allgemeine Einstellungen**

- **ZIE-R26** \[1.0\] Allgemeine Einstellungen gelten pro Gerät, nicht pro Spielstand, und sind jederzeit änderbar, ohne Erfolge zu sperren.
- **ZIE-R27** \[1.0\] Die Autopause-Übersicht listet jede Meldungsklasse und jeden Ereignistyp mit Schalter pausieren/nicht pausieren; Entscheidungen pausieren immer.
- **ZIE-R28** \[1.0\] Verliert das Spielfenster den Fokus, pausiert das Spiel (abschaltbar).
- **ZIE-R29** \[1.0\] Autosave läuft standardmäßig nach jedem Jahresrückblick und alle 13 Spielwochen in 5 rotierende Slots (Standard; gilt für alle Specs).
- **ZIE-R30** \[1.0\] Telemetrie ist standardmäßig aus und nur per ausdrücklicher Zustimmung aktiv.

Neue Einstellungen und Angleich (Prüfung 3)

- **ZIE-R42** \[1.0\] Thema: hell, dunkel oder hoher Kontrast. Hoher Kontrast hat mindestens 7:1 Textkontrast, keine Information nur über Farbe und dickere Linien in Diagrammen (S11).
- **ZIE-R43** \[1.0\] Zahlenformat: kurz (1,2 Mio. USD) oder voll (1.234.567 USD). Es gilt für alle Anzeigen; Tooltips zeigen immer den vollen Wert.
- **ZIE-R44** \[1.0\] Mentor und Sprechblasen sind getrennt stummschaltbar. Stumm heißt: kein Ton und kein Aufpoppen; die Inhalte bleiben im Wissensbuch und im Protokoll.
- **ZIE-R45** \[1.0\] Tempo-Knöpfe: Pause, 0,5×, 1×, 2×, 4×. 0,5× ist ein eigener Knopf, kein verstecktes Menü.
- **ZIE-R46** \[1.0\] Presse-Zufall (im Spielstand): aus, gering oder normal. Die Streuung der Pressewertung aus S05 gilt mit 0 %, 50 % oder 100 %. Keine Stufe sperrt Erfolge.
- **ZIE-R47** \[1.0\] Entscheidungsdichte (im Spielstand): ruhig, normal oder dicht. Sie wirkt nur auf Angebote (Welt-Ereignisse der Klassen Chance und Information, A23) mit Faktor ×0,6, ×1 oder ×1,4. Krisen und Projekt-Gates bleiben gleich. Keine Stufe sperrt Erfolge.
- **ZIE-R48** \[1.0\] Presse-Strenge hat fünf Stufen. Jede Stufe verschiebt die erwartete Qualität um 8 % (800 bp): −16 %, −8 %, 0, +8 %, +16 % (S05). Ein leichterer Wert als im Preset sperrt Erfolge (ZIE-R18).
- **ZIE-R49** \[1.0\] Startprofile kommen aus der Profil-Tabelle in S01 (KRN-R70 ff.): Garage, kleines Studio, etabliertes Studio, Engine-Firma. S10 legt nur den Startgeld-Faktor je Preset fest.
- **ZIE-R50** \[1.0\] S10 ist maßgeblich für Insolvenz-Toleranz und Startpolster (Tabelle in Abschnitt 5). Andere Specs verweisen hierher.
- **ZIE-R51** \[1.0\] Der Kalender reicht bis Ende 2100. Das Endjahr liegt zwischen 2000 und 2100. Ende 2100 endet jedes Spiel mit dem Abschluss-Bildschirm, ohne Weiterspielen.
- **ZIE-R52** \[1.0\] Der Seed hat 16 Hex-Zeichen. Freie Eingaben werden mit einem festen Hash in 16 Hex-Zeichen umgewandelt; der Startbildschirm zeigt das Ergebnis.

**Modding**

- **ZIE-R31** \[1.0\] Das Grundspiel wird als Mod „core“ über dieselbe Ladepipeline geladen wie jede andere Mod.
- **ZIE-R32** \[1.0\] Mods gibt es in vier Stufen: Daten (JSON), Inhalte (Bilder, Audio, Texte), Ereignisse (deklaratives Format) \[alle 1.0\] und Code (Skript-Schnittstelle in einer Sandbox) \[später\].
- **ZIE-R33** \[1.0\] Jede Mod hat eine Datei mod.json mit den Feldern id, name, version (SemVer), gameVersion (Bereich), author, description, dependencies (id + Versionsbereich), conflicts (id\[\]), loadAfter (id\[\]), tier (daten, inhalte, ereignisse, code), affectsBalance (bool).
- **ZIE-R34** \[1.0\] Mods ändern Datensätze über deren Kennung mit den Operationen add, modify (einzelne Felder) und remove; ganze Dateien werden nie ersetzt.
- **ZIE-R35** \[1.0\] Die Ladereihenfolge ist: core, dann Abhängigkeiten, dann loadAfter-Angaben, dann die Reihenfolge des Spielers; ändern zwei Mods dasselbe Feld, gewinnt die später geladene, und die Konfliktanzeige nennt Feld, beide Werte und Gewinner.
- **ZIE-R36** \[1.0\] Jede Datei wird beim Laden gegen das JSON Schema geprüft; eine fehlerhafte Mod wird mit Datei und Stelle gemeldet und abgeschaltet, das Spiel startet ohne sie.
- **ZIE-R37** \[1.0\] Fehlt beim Laden eines Spielstands eine Mod, warnt das Spiel; Datensätze aus der fehlenden Mod fallen auf Ersatz zurück (z. B. Genre „Unbekannt“), der Spielstand bleibt ladbar.
- **ZIE-R38** \[1.0\] Mods mit affectsBalance = false (kosmetisch: Bilder, Musik, Namen, Übersetzungen) lassen Erfolge an; jede andere aktive Mod setzt die Erfolgssperre.
- **ZIE-R39** \[1.0\] Mods werden über den Steam Workshop abonniert, automatisch installiert und aktualisiert; ohne Steam gibt es einen Mod-Ordner.
- **ZIE-R40** \[1.0\] Das Spiel enthält keine echten Firmen-, Konsolen- oder Spielenamen; Namenspakete der Community ersetzen fiktive Namen über die Stufe Daten.
- **ZIE-R41** \[1.0\] Der Entwicklermodus lädt Mods ohne Neustart neu und zeigt einen Datenbrowser.

## 5 Formeln und Startwerte

**Vermächtnis-Wertung am Spielende:**

```latex
V = 0{,}25 \cdot S_{\text{Marken}} + 0{,}20 \cdot S_{\text{Engines}} + 0{,}20 \cdot S_{\text{Umsatz}} + 0{,}15 \cdot S_{\text{Preise}} + 0{,}10 \cdot S_{\text{Rivalen}} + 0{,}10 \cdot S_{\text{Ruf}}
```

Jeder Teilwert S liegt zwischen 0 und 100 und wird gegen die beste KI-Firma desselben Laufs normiert (100 = so gut wie die beste KI oder besser). Der Titel richtet sich nach dem stärksten Teilwert: „Die Marken-Schmiede“ (Marken), „Der Engine-Riese“ (Engines), „Der Branchenprimus“ (Umsatz), „Der Preissammler“ (Preise), „Der Rivalen-Bezwinger“ (Rivalen), „Der ewige Indie“ (Ruf hoch, Umsatz unter Median).

**Schwierigkeits-Presets:**

| Stellschraube | Entspannt | Leicht | Normal | Schwer | Hardcore |
| --- | --- | --- | --- | --- | --- |
| Startgeld Garage 1980 (USD); Faktor ×3 / ×2 / ×1 / ×0,6 / ×0,3 auf die Profil-Tabelle S01 | 150.000 | 100.000 | 50.000 | 30.000 | 15.000 |
| Einnahmen-Multiplikator | 1,3 | 1,15 | 1,0 | 0,9 | 0,8 |
| Kosten-Multiplikator | 0,8 | 0,9 | 1,0 | 1,1 | 1,25 |
| Kreditzins-Aufschlag / Kreditrahmen | −2 % / ×2 | −1 % / ×1,5 | 0 / ×1 | +2 % / ×0,75 | +4 % / ×0,5 |
| Presse-Strenge (Verschiebung der erwarteten Qualität, 800 bp je Stufe) | −16 % | −8 % | 0 | +8 % | +16 % |
| Markenmüdigkeit / Trendtempo | ×0,6 / ×0,8 | ×0,8 / ×0,9 | ×1 / ×1 | ×1,2 / ×1,15 | ×1,4 / ×1,3 |
| Bug-Rate / Wachstum technischer Schuld | ×0,6 / ×0,6 | ×0,8 / ×0,8 | ×1 / ×1 | ×1,2 / ×1,2 | ×1,4 / ×1,4 |
| Insolvenz-Toleranz (Monate im Minus; maßgeblich, ZIE-R50) | 18 | 12 | 6 | 4 | 2 |
| Startpolster (keine Insolvenz; maßgeblich, ZIE-R50) | 3 Jahre | 2 Jahre | – | – | – |
| Mindestwertung bei guter Passung | 5,0 | 5,0 | – | – | – |
| KI-Aggressivität / Zahl der KI-Studios | 0,5 / 30 | 0,75 / 40 | 1,0 / 50 | 1,25 / 55 | 1,5 / 60 |
| Ereignisdichte historisch / zufällig | ×1 / ×0,5 | ×1 / ×0,75 | ×1 / ×1 | ×1 / ×1,25 | ×1 / ×1,5 |
| Platzangebot der Büros | großzügig (×1,5) | großzügig (×1,5) | normal (×1) | normal (×1) | knapp (×0,75) |
| KI-Kompetenz (S14 Abschnitt 7: Kandidaten, Temperatur, Wahrnehmung, Lernen, Reaktionszeit, Horizont) | Stufe 1 | Stufe 2 | Stufe 3 | Stufe 4 | Stufe 5 |
| Gegenzüge je Akteur und Jahr / Nachahmer je Hit | 0 / 0 | 1 / 1 | 2 / 2 | 3 / 3 | 4 / 4 |
| Rivalen / Startstärke | 3 / eine Stufe kleiner | 3 / Profil | 4 / Profil | 5 / eine Stufe größer | 5 / größer plus Marke |
| Ausgleich (S14 5.11) | sanft | sanft | aus | aus | aus |

| Preset | Ein-Satz-Beschreibung |
| --- | --- |
| Entspannt | Zum Ausprobieren: Fehler kosten wenig, und die Firma überlebt fast alles. |
| Leicht | Ein Einsteiger kommt gut durch die 80er und lernt dabei alle Systeme kennen. |
| Normal | Ein guter Spieler übersteht die 90er, ein sehr guter führt 2010 die Engine-Charts an. |
| Schwer | Jeder Flop tut weh, die KI kämpft um jeden Kunden, Kredite sind teuer. |
| Hardcore | Ein schwacher Release kann das Ende sein; nur für Kenner. |

| Parameter | Startwert | Bereich | Datei |
| --- | --- | --- | --- |
| Preis-Verkaufsbonus / Dauer | +20 % / 8 Wochen | 0–50 % / 4–26 | data/goals.json |
| Preis-Rufbonus | +3 | 0–10 | data/goals.json |
| Nominierte / Gewinner-Ziehung | 5 / aus den 3 Besten |  | data/goals.json |
| Gewichte der Vermächtnis-Wertung | 0,25 / 0,20 / 0,20 / 0,15 / 0,10 / 0,10 | Summe 1 | data/goals.json |
| Autosave-Intervall / Slots | 13 Wochen + Jahresende / 5 | 4–52 / 1–20 | data/settings.json |
| Presets (Tabelle oben) |  |  | data/presets.json |

## 6 Entscheidungen des Spielers

| Entscheidung | Wann | Optionen | Standard/Delegation |
| --- | --- | --- | --- |
| Startjahr, Profil, Region, Kapital, Seed | Neues Spiel | Werte aus Abschnitt 3 | 1980, Garage, Europa, Preset-Wert, Zufalls-Seed |
| Preset und Stellschrauben | Neues Spiel; Stellschrauben auch später | fünf Presets oder eigen | Normal (Erstspieler: Leicht vorgeschlagen) |
| Langfristiges Ziel | Neues Spiel | eins oder keins | keins |
| Spielende | Neues Spiel | offen, Endjahr, Zielbedingung | Endjahr 2040 |
| Schalter | Neues Spiel | Abschnitt 4 | Standardwerte |
| Szenario wählen | Hauptmenü | sechs Szenarien | – |
| Weiterspielen | Am Spielende | ja/nein | – |
| Mods aktivieren und ordnen | Hauptmenü | Ein/Aus, Reihenfolge | Workshop-Abos aktiv |
| Allgemeine Einstellungen | jederzeit | Abschnitt 4 | Standardwerte |

Keine dieser Entscheidungen erscheint als Fokus-Karte im laufenden Spiel; sie belasten das Entscheidungsbudget nicht.

## 7 KI-Verhalten

- KI-Studios und Rivalen können Branchenpreise gewinnen und werden nach denselben Kriterien nominiert.
- Das Preset setzt KI-Kompetenz, KI-Aggressivität, Zahl der Studios, Rivalen und Ausgleich nach S14 Abschnitt 7. Unter „Eigen“ sind Kompetenz, Aggressivität, Zahl und Ausgleich getrennt einstellbar; Senken von Aggressivität oder Ausgleich sperrt keine Erfolge (S14 KI-R72).
- Geschäftsmodell-Sperren gelten für die KI genauso.
- KI-Firmen haben keine Meilensteine; ihre Leistung dient nur als Vergleich in Rangliste und Vermächtnis-Wertung.

## 8 Oberfläche

- **Neues Spiel:** ein Bildschirm mit Karten für Startjahr, Profil und Region, darunter Preset-Karten mit Ein-Satz-Beschreibung; „Erweitert“ klappt Stellschrauben, Schalter und Seed auf.
- **Ziele:** Meilensteine als Karten mit Fortschrittsbalken im Wissensbuch; Ruhmeshalle als Karten-Liste mit Covern.
- **Preise:** Verleihung als Moment auf der Messebühne (höchstens fünf Sekunden), danach Eintrag im Jahrbuch.
- **Spielende:** Abschluss-Bildschirm mit Chronik als Zeitstrom, Vermächtnis-Wertung als Wasserfall, Titel, Rivalen-Vergleich, Export.
- **Mod-Verwaltung:** Liste mit Schalter, Reihenfolge per Ziehen, Konfliktsymbol pro Mod; Klick zeigt Feld, Werte und Gewinner. Analysieren-Ebene: Tabelle aller Datensätze mit Herkunfts-Mod.
- **Erfolgssperre:** Ein Schloss-Symbol in der Kopfzeile zeigt, dass in diesem Spielstand keine Erfolge mehr freigeschaltet werden, mit Grund im Tooltip.

Ergänzt nach Prüfung 3: Presse-Zufall und Entscheidungsdichte stehen im Neues-Spiel-Bildschirm unter „Erweitert“, mit dem Hinweis „sperrt keine Erfolge“. Thema, Zahlenformat, Stummschaltung und Tempo-Knöpfe liegen in den allgemeinen Einstellungen; das Thema zeigt eine Vorschau.

## 9 Ereignisse und Meldungen

| Meldung | Auslöser | Klasse |
| --- | --- | --- |
| „Meilenstein erreicht: …“ | Bedingung erfüllt | Ergebnis mit kurzem Moment |
| „Nominiert für …“ | Jahresende vor der Messe | Information |
| „Ausgezeichnet: …“ | Preisvergabe | Ergebnis mit Moment |
| „Szenario: noch 12 Monate“ | 52 Wochen vor Frist | Information |
| „Szenario gewonnen/verloren“ | Ziel erreicht oder Frist abgelaufen | Ergebnis (pausiert) |
| „Mod fehlt / Mod fehlerhaft“ | Beim Laden | Dialog vor Spielstart |
| „Erfolge in diesem Spielstand gesperrt“ | Stellschraube erleichtert, Balance-Mod aktiv, Sandbox | Information mit Rückfrage vor der Änderung |

## 10 Schnittstellen

| System | Richtung | Inhalt |
| --- | --- | --- |
| S01 Kern | nutzt | Bedingungssprache für Ziele und Ereignisse, Seed, Zufallsstrom „awards“, Vorgeschichte bei spätem Start, Ladepipeline |
| S02 Produkte | liest | Wertungen, Releases, Marken für Meilensteine und Preise |
| S03 Engines | liest | Engine-Qualität und Lizenzen für „Engine des Jahres“ |
| S04 Lizenzen | liest | Lizenzzahlen |
| S05 Marketing | schreibt | Verkaufsbonus durch Preise; Messe als Ort der Verleihung |
| S07 Firma | liest/schreibt | Startgeld, Kredit, Insolvenz-Toleranz und Startpolster (S10 maßgeblich), Ruf, Büro-Platzangebot |
| S08 Markt/KI | schreibt | KI-Aggressivität, Zahl der Studios, Ereignisdichte, Lebenszyklus-Schalter, PC-Leistungsklassen |
| S09 Übernahmen | schreibt | Schalter Übernahmen und Hersteller als Ziel |
| S11 Oberfläche | nutzt | Momente, Wissensbuch, Abschluss-Bildschirm, Büro-Darstellung, Thema, Zahlenformat, Tempo, Stummschaltung |
| S12 Technik | nutzt | Speicherformat (Settings, ModState), JSON Schema, Workshop-Anbindung |
| S13 Ausbau | erweitert | Code-Mods, Ziel „eigene Konsole“ |

## 11 Abnahmetests

- **ZIE-T01** Gegeben zwei neue Spiele mit gleichem Seed und gleichen Einstellungen, wenn beide mit denselben Entscheidungen 10 Jahre laufen, dann sind die Spielstände identisch.
- **ZIE-T02** Gegeben je 100 Bot-Läufe pro Preset, dann steigt die Insolvenzquote von Entspannt bis Hardcore streng und der Median-Umsatz fällt streng.
- **ZIE-T03** Gegeben ein Normal-Spiel, wenn der Spieler das Startgeld nachträglich erhöht, dann ist die Erfolgssperre gesetzt; erhöht er die Presse-Strenge, dann nicht.
- **ZIE-T04** Gegeben ein Spiel mit Wertung 9,2, dann wird „erstes Spiel ≥ 9,0“ einmal ausgelöst und erscheint in der Chronik.
- **ZIE-T05** Gegeben Endjahr 2040, wenn die letzte Woche 2040 vergeht, dann öffnet sich der Abschluss-Bildschirm, und „Weiterspielen“ führt ins Jahr 2041; mit Endjahr 2100 gibt es kein Weiterspielen.
- **ZIE-T06** Gegeben zwei Mods, die dasselbe Feld eines Genres ändern, dann gilt der Wert der später geladenen, und die Konfliktanzeige nennt beide.
- **ZIE-T07** Gegeben eine Mod mit ungültigem JSON, dann startet das Spiel ohne diese Mod und meldet Datei und Zeile.
- **ZIE-T08** Gegeben ein Spielstand mit einem Genre aus einer Mod, die entfernt wurde, dann lädt der Spielstand und das Genre heißt „Unbekannt“.
- **ZIE-T09** Gegeben nur kosmetische Mods, dann bleiben Erfolge aktiv; mit einer Balance-Mod nicht.
- **ZIE-T10** Gegeben das Szenario „Rette die Konsole“, wenn die Plattform bis 2012 aktiv bleibt, dann ist das Szenario gewonnen.

* **ZIE-T11** Gegeben Presse-Zufall „aus“, wenn dasselbe Spiel zweimal veröffentlicht wird, dann ist die Wertung gleich und Erfolge bleiben aktiv.
* **ZIE-T12** Gegeben Entscheidungsdichte „ruhig“, dann sinkt die Zahl der Angebote über 10 Jahre um 30–50 %, die Zahl der Krisen bleibt gleich.
* **ZIE-T13** Gegeben Presse-Strenge eine Stufe höher, dann steigt die erwartete Qualität um genau 800 bp.
* **ZIE-T14** Gegeben die Seed-Eingabe „abc“, dann zeigt der Startbildschirm 16 Hex-Zeichen, und dieselbe Eingabe ergibt dieselbe Welt.
* **ZIE-T15** Gegeben Ziel „unabhängig bleiben“, wenn der Spieler eine Marke auslizenziert, dann bleibt das Ziel offen; verkauft er sie, ist es verfehlt.
* **ZIE-T16** Gegeben Zahlenformat „kurz“, dann zeigt jede Anzeige 1,2 Mio. USD und der Tooltip 1.234.567 USD.

## 12 Spätere Versionen

| Funktion | Version | Kurzbeschreibung |
| --- | --- | --- |
| Code-Mods | später | Skript-Schnittstelle in einer Sandbox mit festen Einstiegspunkten (Wochen-Tick, Release, Vertrag) |
| Weitere Szenarien | 1.1 | Z. B. „Der Crash von 1983“, „Mobile-Goldrausch 2009“ |
| Seed-Herausforderungen und Bestenlisten | später | Gleicher Seed für alle, Vergleich der Vermächtnis-Wertung |
| Startprofil Publisher | später | Mit eigenem Publishing (S13) |
| Langfristiges Ziel „eigene Konsole“ | später | Mit eigener Plattform (S13) |
| Wettbewerbsbehörde als Schalter | später | Mit der Vollversion der Übernahmen (S09, S13) |

## Änderungen nach Prüfung 3

- Angleich: 5 Autosave-Slots (ZIE-R29), Seed 16 Hex-Zeichen (ZIE-R52), Kalender und Endjahr bis 2100 (ZIE-R51). S10 ist maßgeblich für Insolvenz-Toleranz und Startpolster (ZIE-R50).
- Neue Einstellungen: Thema „Hoher Kontrast“, Zahlenformat, getrennte Stummschaltung von Mentor und Sprechblasen, Tempo-Knopf 0,5×, Presse-Zufall, Entscheidungsdichte (ZIE-R42 bis R47).
- Presse-Strenge als Verschiebung der erwarteten Qualität um 8 % je Stufe (ZIE-R48, Preset-Tabelle).
- Presse-Zufall und Entscheidungsdichte sperren keine Erfolge (ZIE-R18).
- Startprofile verweisen auf die Profil-Tabelle in S01; Enum an S01 angeglichen; Startgeld als Faktor je Preset (ZIE-R49).
- Ziel „unabhängig bleiben“ nach A04 geprüft und um den Markenmarkt ergänzt: Auslizenzieren erlaubt, Verkauf beendet das Ziel (ZIE-R06).
- Tests ZIE-T11 bis T16 ergänzt.
