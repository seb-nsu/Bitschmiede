# Prüfbericht 3 (Fable): 360°-Prüfung von Design-Dokument und Spezifikationen

**Geprüfte Grundlage (vollständig gelesen, inklusive aller Tabellen):** Design-Dokument Rev. 124, Überblick mit Glossar und Abgleich A01–A32, S01–S13, Datenblatt, Prüfberichte 1 und 2. Dazu aktuelle Spielerkritik zu den Konkurrenzspielen. Bewusste Entscheidungen (Patente gestrichen, Multiplayer zurückgestellt, feste Grundrisse, Draufsicht in 1.1) gelten nicht als Mangel.

## 1 Gesamturteil

Das Konzept ist in der dritten Fassung reif. Die Specs S01–S13 machen aus dem Design-Dokument eine testbare Grundlage mit rund 530 Regel-IDs und etwa 130 Abnahmetests. Kein anderes Tycoon-Konzept im Genre ist so verzahnt und zugleich so klar auf Delegation, Momente und Lesbarkeit ausgelegt.

Die Qualität hat sich verschoben: Die großen Designfragen sind gelöst, jetzt zeigen sich **Rechen- und Konsistenzfehler**, die Claude Code bei der Umsetzung direkt in Bugs oder Exploits verwandeln würde. Beispiele: Playtest-Spanne und Übernahme-Wertspanne liegen symmetrisch um den wahren Wert, die Mitte verrät also die Wahrheit. Die Börsenerwartung ist die eigene Prognose, also gewinnt Tiefstapeln. Wer nie eine eigene Engine baut, spielt 60 Jahre in Monats-Ticks. Eine Konsole ohne Hits kann beim Start nie wachsen. Der Mindestpreis beim Firmenkauf enthält keine Plattform. Alles ist mit wenig Aufwand reparierbar, muss aber vor Etappe 1 repariert werden.

| Kriterium | Prüfung 1 | Prüfung 2 | Jetzt | Begründung |
| --- | --- | --- | --- | --- |
| Sinnhaftigkeit der Systeme | 8 | 9 | **9** | Jedes System hat eine Spannung und eine Delegationsstufe |
| Spaßpotenzial | 6 | 8 | **8** | Starke Momente auf allen Zeitskalen; Abzug: zu viele Autopiloten in den frühen Jahren, Zufallsrauschen in der Wertung, Spätspiel-Konzern droht Verwaltung |
| Komplexität vs. Bedienung | 4 | 7 | **8** | Zwei Ebenen, Fokus-Karte, Regeln, Produzenten; Abzug: zwei Zeitauflösungen (Monat/Woche) |
| Einstellungen | 3 | 8 | **9** | Vollständig, messbar; kleine Lücken |
| Besser als die Konkurrenz | 7 | 8 | **8** | Auf dem Papier besser bei Tiefe, Lesbarkeit, Automatisierung; Charme und Sog bleiben Behauptung bis zum Prototyp |
| Systemtiefe | 7 | 9 | **9** | – |
| Konsistenz Design-Dokument und Specs | – | 6 | **6,5** | Abgleich-Tabelle gut, aber Specs nicht nachgezogen; rund 25 Zahlenwidersprüche |
| Mathematische Robustheit | – | – | **6** | Divisionen durch null, unbegrenzte Faktoren, Tests, die mit den Startwerten nicht bestehen |
| Realismus des 1.0-Umfangs | – | 5 | **6** | Streichliste und Early Access richtig; Umfang am oberen Rand |
| Umsetzbarkeit mit Claude Code | – | – | **8** | Regel-IDs, Tests, Datendateien vorbildlich; Risiko ist die Festkomma-Arithmetik ohne Numerik-Anhang |
| **Gesamtnote** | **\~6** | **7,5** | **8,2 / 10** | Von „sehr gutes Konzept, das gekürzt werden muss“ zu „baubare Spezifikation, die eine Numerik- und Konsistenzrunde braucht“ |

## 2 Konkurrenzanalyse

| Spiel | Stärken | Belegte Kritik | Dieses Konzept besser? |
| --- | --- | --- | --- |
| Game Dev Story | Charme, sichtbare Menschen, Wertungs-Ritual, Belohnung alle 10–30 s | Keine Tiefe, kein Spätspiel | ● Tiefe. ◐ Belohnungsdichte in den 1980ern noch nicht belegt: zwischen zwei Releases passiert außer Ereignissen wenig |
| Game Dev Tycoon | Einfach und tief, Aha-Moment unter einer Stunde, Mods | Kurz und repetitiv, zu wenig Inhalt, Tutorial, unausgewogene Wirtschaft, klobige UI | ● Aufschlüsselung, Prognose, Wissensbuch, erste Stunde, Startpolster lösen alle fünf. ◐ Wirtschaft nur über Simulationsläufe; Startwerte haben Lücken |
| Mad Games Tycoon 2 | Sog, viele Produktformen, Multiplayer, Steam Deck | Repetitiv, Tutorial, Schwierigkeitssprünge, Lokalisierung, dünnes Spätspiel, Lag | ● Ziele, Krisen, Delegation, kein Bürobau. ◐ Sog nur gleichauf, wenn „Als Nächstes“ so dicht wird. ❌ Multiplayer (bewusst) |
| City Game Studio | Direktoren, Engine-Royalties, Open Source, Updates | Repetitiv und flach, schlechte UI, Lag, keine Konkurrenz, zu schnelle Progression | ● Engine-Tiefe, Rivalen, Varianz. ⚠ Warnung Nr. 1 bleibt: gleiche Systemliste, gescheitert an der Darstellung; die Bildschirme sind noch nicht getestet |
| Software Inc. | Features mit Abhängigkeiten, Design-Dokument, C-Level-Delegation | Verwirrende Tutorials, überladene UI, Mikromanagement | ● Einstieg, Teams, feste Grundrisse; Delegation sogar weiter gedacht |
| Gamebiz 3 | Tiefste Markt- und Hardwaresimulation | Reine Tabellen | ● Weit besser |
| Startup Company | Klarste Karten-UI | Flach, leeres Spätspiel | ● Brett übernommen; ◐ Ruhe der Karten gegen Dichte der Momente abwägen |

**Fazit:** Jede belegte Kritik hat eine Mechanik. Noch nicht besser: Charme und Sog (Beweis erst im Prototyp), Multiplayer (bewusst) und die Gefahr, dass eine Simulation mit 530 Regeln ihre Zahlen doch zeigt, weil die Formeln noch nicht robust sind.

## 3 Systemweise Prüfung

● tragfähig, ◐ tragfähig mit Lücke, ❌ so nicht umsetzbar oder nicht spaßig.

| System | Status | Note | Problem | Lösung Richtung Spaß |
| --- | --- | --- | --- | --- |
| Simulationskern, Zeit (S01) | ❌ | 6 | Monats-Ticks bis zum ersten eigenen Engine-Projekt: Lizenzweg und Bot „nie eigene Engine“ bleiben 60 Jahre im Monatsmodus; Release-Timing, Konkurrenzdichte, Rabattwochen und Devkit-Wellen sind dann unmöglich. 12 × 4,33 ≠ 52 | Immer wöchentlich simulieren; Monat nur als Anzeige-Bündelung (13-Wochen-Quartale, Monate 4/4/5). Umschalten auf Wochen-Anzeige beim ersten Engine-Projekt, beim zweiten Release oder 1985 |
| Ereignisse, Entscheidungsbudget (S01) | ● | 8 | Freischaltung „Lizenzmarkt mit erster Anfrage“ kann durch die Wartezeit-Regel bis 26 Wochen zurückgehalten werden | Freischaltungs-Ereignisse sind selbst der Auslöser; die Wartezeit gilt nur für Systeme ohne eigenes Ereignis |
| Produkte, Qualität, Wertung (S02) | ◐ | 8 | (1) Playtest-Spanne um die wahre Prognose: die Mitte verrät die Wahrheit. (2) Trend-Faktor multipliziert Q um ±50 %. (3) Unerklärtes Rauschen ε. (4) Erwartete Qualität ohne Startwert | (1) Jeder Playtest zieht einen Versatz; Spanne und Versatz schrumpfen mit jeder Phase. (2) Trend wirkt auf Verkäufe, auf die Wertung nur als „Zeitgeist“ ±0,3 im Wasserfall. (3) ε als sichtbarer Balken „Tagesform der Presse“, Einstellung „Presse-Zufall“. (4) Erwartung automatisch am Median des Vorjahres: „besser als der Jahrgang“ |
| Multiplattform (S02) | ◐ | 7 | PRD-R11 (Feature nur, wenn alle Plattformen es können) widerspricht PRD-R61 (abgespeckte Version) | Lead entscheidet; auf weiteren Plattformen wird gestrichen; die Warnung zeigt genau, welche Karten wegfallen |
| Entwicklung, Phasen (S02) | ◐ | 8 | Feature-Freeze „ab Alpha“, aber kleine und mittlere Projekte haben keine Alpha; Umfangsfaktor fehlt | Freeze je Umfang (klein bei 60 % der Produktion, mittel bei Beta, groß/AAA bei Alpha); Faktoren 0,4 / 1 / 2,5 / 5 |
| Marken (S02) | ● | 9 | – | Zusätzlicher Moment „Markenjubiläum“ (10 Jahre) als Vorschlag für Sammlung oder Remaster |
| Engines (S03) | ◐ | 8 | Starter-Engine mit Stufen vor ihrem frühesten Jahr; ENG-T01 mit γ = 0,6 nicht erreichbar; Kopierschutz im Netzwerk-Modul passt nicht zu 1985 | Starter-Engine Rendering 1, Rest 0; γ = 1,2 und Chips sichtbar verblassen lassen; Kopierschutz vor 2000 ohne Modul |
| Lizenzmarkt (S04) | ◐ | 8 | Division durch null im Vertrauensverlust; Wechselhürde nicht normiert; Royalty 3 % gegen Datenblatt 5 % | Nenner mit Referenzkosten; Erfahrung/100; Datenblatt gilt |
| Marketing, Interesse (S05) | ◐ | 7 | Wachstum kleiner als Zerfall: Interesse kann nie proportional wachsen; Startwerte fehlen; Plattformbasis fehlt in V₀; Release-Paket 8 oder 9 Punkte | Wachstum 3 % gegen Zerfall 2 % ab Ankündigung, gedeckelt durch Marktgröße: der „Schneeball“, den Spieler spüren wollen. Basis in V₀; 9 Punkte |
| Release, Preis, Vertrieb (S05) | ◐ | 8 | Nachproduktion, Stückkosten und Zertifizierung widersprechen sich; Early Access und Abo-Deal haben keine Regel | §13 gilt. Early Access mit 5 Regeln (Verkauf ab Beta zu 60–80 %, doppelter Interesse-Zerfall, Patch-Takt, 1.0 als zweiter Release-Abend). Abo-Deal mit Festbetrag und verdrängten Käufen |
| Piraterie (S05 vs. Datenblatt) | ◐ | 7 | Alle Werte widersprechen sich | Datenblatt gilt. Spaß: Schutz schützt das Startfenster, dann wird er sichtbar geknackt (Ticker), Entfernen per Patch ist ein kleiner Community-Moment |
| Betrieb, Live-Service (S06) | ◐ | 7 | Churn unbegrenzt (Spielerbasis negativ); Kundenanfragen explodieren mit absoluten Bugs; Lootbox-Test nicht erreichbar; Bug-Regel mehrdeutig; A11 und A30 fehlen | Churn höchstens 0,5; Anfragen über normierten Bug-Anteil; Faktor 2 %; „−1 je 10 schwere Bugs, höchstens −5“; Abgleich nachziehen. Der Server-Ausfall wird mit der Cloud-Regel eine echte Krisenkette mit Spannung |
| Firma, Teams, Personal (S07) | ◐ | 8 | Höchstens 10 Bewerber pro Monat und Standort; Insolvenz-Toleranz 3 gegen 6; Gehälter nicht nach A20; Großausbauten fehlen; Crunch „vor Gold“ praktisch kostenlos | Bewerber mit Firmengröße skalieren, Akademie als Multiplikator, Pleite-Teams als Angebot („Ein ganzes Team steht vor der Tür“); Crunch kostet Moral pro Woche und summiert sich: eine Versuchung mit Rechnung |
| Delegation, Produzenten (S07) | ● | 9 | Gefahr „das Spiel spielt sich selbst“ | Jährliche **Strategiekonferenz** als nicht delegierbarer Moment: Schwerpunkt-Genre, Engine-Kurs, Plattform-Wette; jede Antwort gibt kleine Boni und eine Schlagzeile |
| Publisher, Finanzen (S07) | ◐ | 7 | Publisher-Deal zu großzügig, „Publisher immer“ wird dominant | Vorschuss 60–80 %, Split vor Recoup 0–10 %, nach Recoup 25–35 %; Spielraum nur mit Verhandlungsmacht: Herzklopfen am Verhandlungstisch |
| Börse (S07) | ❌ | 5 | Erwartung = eigene Prognose: Tiefstapeln verdoppelt den Kurs pro Jahr; Dividende ohne Regel | Erwartung = 70 % Analysten + 30 % Prognose; ständiges Unterbieten senkt die Glaubwürdigkeit. Quartalszahlen werden ein Spiel um Erwartungen |
| Markt, Plattformen (S08) | ◐ | 7 | Neue Konsole kann nie starten (A < 0 ohne Hits); Einstellungstest nicht erreichbar; Flops leben ewig; Zufallsschritt ohne Wert; Division bei negativem Kapital | Launch-Hype-Term und eigene Launch-Titel des Herstellers: die Geschichte „Konsole X startet stark oder verkümmert“. Schwund höher, Sprung beim Nachfolger, absolute Flop-Schwelle |
| KI-Studios, Rivalen (S08) | ◐ | 8 | Release-Duell kann pendeln; Abbruchregel in drei Fassungen | Rivale verschiebt höchstens einmal pro Titel und zahlt dieselben Kosten: „Titan weicht aus“ oder „hält dagegen“ wird ein Moment mit Ende |
| Krisen, Zukunftsepoche (S08) | ● | 8 | Zukunftsepoche noch dünn | Gerüchte 2–3 Jahre vorher im Ticker; die Wette als Pin auf der Zeitleiste |
| Übernahmen (S09) | ◐ | 7 | Wertspanne um den wahren Wert; „oder“ statt „und“; Firmenwert ohne Plattform; negative Werte möglich | Spanne mit Versatz („Die Prüfung zeigt: 30 % überbewertet“); Plattformwert im Preis; Werte begrenzen |
| Ziele, Einstellungen (S10) | ● | 9 | Kleine Zahlenwidersprüche (Slots, Seed, Datum) | S10 gilt, Seed 16 Hex, Datum bis 2100 |
| Oberfläche (S11) | ● | 8 | Ansicht Firma ab Start widerspricht dem Test; Asset-Tabelle 4 statt 5 Größen | Firma ab 8 Mitarbeitern mit Ereignis; 5 × 5 |
| Technik (S12) | ◐ | 7 | Numerik unentschieden: Ganzzahlen laut A22, Fließkomma in TEC-R05, Felder als float; Monatsjob-Woche dreifach definiert; Tabellen für exp, tanh, ln, pow und Normalverteilung fehlen | **Numerik-Anhang** (eine Seite) mit Typ „bp“, Helfern und Tabellen; alle float-Felder umdeklarieren; eine Monatsjob-Regel |
| Ausbau (S13) | ● | 8 | – | Büro-Ansicht ist der teuerste Ausbau mit dem geringsten Spielwert, besser nach Publishing und Middleware |

## 4 Spaß-Analyse

### Die fünf stärksten Momente

1. **Release-Abend mit Wasserfall und Wissensbuch** – mit automatisch kalibrierter Erwartung heißt die Wertung „besser als der Jahrgang“.
2. **Design-Brett mit lebendem Prognose-Fächer** – Karte ablegen, Balken wächst, gesperrte Karte beim Engine-Team bestellen.
3. **Engine-Platine mit Stand-der-Technik-Linie und Lizenznehmer-Steckleiste** – die Doppelrolle der Engine auf einem Bildschirm; der Preis-Schock des eigenen Anbieters ist der beste Prüftest.
4. **Plattform-Strom, Devkit-Wellen, Launch-Titel, alte Konsole retten** – Geschichten, die kein Konkurrent hat (mit Launch-Hype-Term).
5. **Rivalen mit Gedächtnis am Verhandlungstisch** – der Aufkäufer, der ein Ziel wegkauft, ist ein Moment, den Spieler weitererzählen.

### Die fünf größten Spaß-Risiken

| # | Risiko | Woran man es erkennt | Lösung |
| --- | --- | --- | --- |
| 1 | Vorspul-Simulator in den 1980ern: zwischen zwei Releases kaum Entscheidungen | Tester drücken 20-mal „Bis zum nächsten Ereignis“ | Zwei Meilenstein-Momente pro Projekt auch bei kleinen Spielen (Prototyp-Review, Gold-Review) als Angebot mit Vorher/Nachher; Messgröße: Wochen ohne Angebot unter 60 % |
| 2 | Zwei Zeitauflösungen | „Warum kann ich das Weihnachtsquartal nicht treffen?“ | Immer wöchentlich rechnen |
| 3 | Exploits | Forenbeitrag „so gewinnt man immer“ in Woche 1 | Versatz in Spannen, gemischte Erwartung, Publisher-Startwerte, Crunch mit Rechnung |
| 4 | Rauschen fühlt sich unfair an | „Alles richtig gemacht und trotzdem 6,8“ | Rauschen als benannter Balken, Einstellung, Trend aus Q |
| 5 | Spätspiel wird Verwaltung | Tester beschreibt 2028 mit Zahlen statt Geschichten | Strategiekonferenz, Konkursmasse-Auktionen, Zukunftswetten, Kacheln nur mit Abweichungen ab zwei Studios |

## 5 Fehlende Funktionen, Bereiche und Abläufe

| Lücke | Lösung Richtung Spaß |
| --- | --- |
| Aktives Abwerben durch den Spieler | Befehl „Angebot machen“ auf KI-Schlüsselpersonen: Gehalt +20–40 %, Chance nach Loyalität und Ruf; Groll des Rivalen als sichtbarer Preis |
| Konkursmasse | Auktion von Marken und Engines pleitegegangener Studios mit 2–3 KI-Bietern und einer Woche Frist |
| Early Access und Abo-Deal | Regeln siehe oben |
| Wissensbuch-Erzeugung | Nach jedem Release werden der größte positive und negative Wasserfall-Balken zu Einträgen; Sicherheitsgrad aus bestätigenden Releases; widersprüchliche Einträge werden „umstritten“ |
| Startprofile und Welt-Generator | Profil-Tabelle (Geld, Mitarbeiter, Engine-Stufen, Marken, Beziehungen) und Generator für KI-Studios, Rivalen, Plattformen; Vorgeschichte als Chronik-Doppelseite beim Start |
| Altersfreigabe | Inhaltsstufe 0–3 je Feature und Thema; Freigabe = Maximum |
| QA vor dem Release | Formel für gefundene Bugs pro Woche; sichtbar als fallende Bug-Kurve |
| Plattformhersteller-Ökonomie | Hersteller-Konto aus Hardware-Marge und Lizenzgebühren; zwei Jahre Verlust bedeuten Rückzug; Plattformwert im Kaufpreis |
| Steuern | Einfache Gewinnsteuer je Region (20–35 %); macht Standorte und Förderung bedeutsam |
| Studio-Kultur des Spielers | Drei sichtbare Kultur-Tags aus Entscheidungen; wirken auf Bewerber, Presse-Erwartung und Integration |
| Vorphase der Zukunft | Gerüchte im Ticker, Wette als Pin |
| Dividende | Eine Zahl pro Jahr mit Kurs- und Kassenwirkung |

## 6 Widersprüche und technische Probleme

| # | Stelle | Problem | Lösung |
| --- | --- | --- | --- |
| 1 | KRN-R01 | Monats-Ticks bis zum ersten Engine-Projekt; wöchentliche Regeln unerreichbar | Immer wöchentlich rechnen, Monat nur als Anzeige |
| 2 | KRN-R02 | 12 × 4,33 ≠ 52, Datum driftet | 13-Wochen-Quartale, Monate 4/4/5 |
| 3 | A22, KRN-R23 vs. TEC-R05, FRM-R37 | Ganzzahlen vs. Fließkomma, zwei Rundungsarten, Felder als float | Numerik-Anhang zu S12, eine Rundungsregel, Typ bp |
| 4 | KRN-R12 vs. TEC-R14 vs. A13 | Monatsjob in erster, letzter oder Monatsersten-Woche | A13 gilt |
| 5 | KRN-R12, KRN-R62, ZIE-R03 | Jahrbuch und Preise zu verschiedenen Zeitpunkten | Jahrbuch letzte Woche, Preise auf der Messe, Nominierung 4 Wochen vorher |
| 6 | KRN-T11 | Pflicht-Entscheidungen 10–12 auch in den 1980ern, Design sagt 8–10 | 8–12 |
| 7 | KRN-R52 vs. ZIE-R29 | 3 gegen 5 Autosave-Slots | 5 |
| 8 | Seed | 16 Hex gegen 12 Zeichen | 16 Hex |
| 9 | GameState.date | endet 2040, Test spielt 2041 | bis 2100 |
| 10 | PRD-R52 vs. A03 | Mindestwertung 5 auch im geführten Start | A03 gilt |
| 11 | PRD-R11 vs. PRD-R61 | Feature nur auf allen Plattformen vs. abgespeckte Version | Lead entscheidet |
| 12 | PRD-R31/R32 | Spanne um die wahre Prognose | Versatz je Playtest |
| 13 | PRD 5.1 | Q × Trend (0,5–1,5) | Trend in V₀, Zeitgeist ±0,3 |
| 14 | PRD 5.2 | Erwartete Qualität ohne Startwert | Kalibrierung am Vorjahres-Median |
| 15 | PRD 5.2 | Rauschen ε ohne Tabelle und unerklärt | Inverse-CDF-Tabelle, Wasserfall-Balken, Einstellung |
| 16 | Feature-Freeze | Kleine und mittlere Projekte ohne Alpha | Freeze je Umfang |
| 17 | Feature.effort | Umfangsfaktor fehlt | 0,4 / 1 / 2,5 / 5 |
| 18 | ENG-R06 | Starter-Engine mit Stufen vor frühestem Jahr | Rendering 1, sonst 0 |
| 19 | ENG 5.1 vs. ENG-T01 | γ = 0,6 ergibt E ≈ 0,90 statt ≤ 0,8 | γ = 1,2 |
| 20 | ENG-R33 | Kopierschutz im Netzwerk-Modul 1985 | Vor 2000 ohne Modul |
| 21 | ENG-R11 vs. LIZ 5 | E-Bereich 0,3–1,15 vs. Qualität 0–1 | Qualität = (E − 0,3)/0,85 |
| 22 | LIZ 5 | Division durch null im Vertrauensverlust | Nenner mit Referenzkosten |
| 23 | LIZ 5 | Wechselhürde nicht normiert | Erfahrung/100 |
| 24 | LIZ Vorlage Standard | 3 % gegen Datenblatt 5 % | Datenblatt gilt |
| 25 | Zufriedenheiten | ohne Grenzen | 0–100 begrenzen |
| 26 | MKT-F1 | Wachstum < Zerfall; Startwerte fehlen | 3 % ab Ankündigung; Werte nachtragen |
| 27 | MKT-F2 vs. MKT-R16 | Plattformbasis fehlt | Faktor Basis/Marktgröße |
| 28 | A07 vs. A30 | Release-Paket 8 oder 9 Punkte | 9 |
| 29 | MKT-R23 vs. MKT-V01 | Nachproduktion 4 Wochen vs. Vorlauf | §13 gilt |
| 30 | MKT §5 vs. §13.3 | Stückkosten verschieden | §13.3 gilt |
| 31 | MKT 5 vs. Datenblatt §8 | Piraterie-Werte verschieden | Datenblatt gilt |
| 32 | PRD-R26 vs. MKT-R13 | Zertifizierung 4 vs. 2–4 Wochen | 4 |
| 33 | MKT budgetPct | Promille-Bereich passt nicht zur Tabelle | 0–1500 |
| 34 | A08 vs. BTR-F1 | Churn-Zuschlag additiv vs. multiplikativ | BTR-F1 gilt |
| 35 | BTR-F1 | Churn unbegrenzt | höchstens 0,5 |
| 36 | BTR-F2 | Anfragen mit absoluten Bugs explodieren | normierter Bug-Anteil |
| 37 | BTR Lootbox | Test nicht erreichbar | 2 % statt 1 % |
| 38 | BTR Zufriedenheit | „−1 pro Woche“ mehrdeutig | −1 je 10 schwere Bugs, höchstens −5 |
| 39 | BTR-R18 vs. A30 | Cloud fehlt | S06 nachziehen |
| 40 | BTR-R02 vs. A11 | Lizenz mit Support fehlt als Auslöser | nachziehen; vorher beantwortet das Engine-Team mit Tempo-Malus |
| 41 | FRM-R40 vs. S10 | Insolvenz-Toleranz 3 vs. 6 | S10 gilt |
| 42 | FRM-R41 vs. S10 | Startpolster 24 Monate vs. 3/2 Jahre | S10 gilt |
| 43 | S07 5.5 vs. A20 | Gehälter 2020/2030 | Datenblatt gilt |
| 44 | S07 5.4 vs. Datenblatt | Miete Garage 100 vs. 150 | Datenblatt gilt |
| 45 | S07 Equipment vs. A31 | Großausbauten und Mehrfach fehlen | nachziehen |
| 46 | FRM-R58 | Führungskapazität mindestens 3, Feld ab 2 | 3–40 |
| 47 | FRM-R49 | Skalen nicht normiert | beide 0–1 |
| 48 | FRM-R52 | Tiefstapel-Exploit | gemischte Erwartung |
| 49 | FRM-T15 | ohne Quartalsumsatz nicht nachrechenbar | Testwerte fest angeben |
| 50 | Design vs. S07, MRK-R38 | KI-Umzug 90 %/12 Monate vs. 95 %/6 Monate | Design nachziehen |
| 51 | Design, S02, MRK-R43 | KI-Abbruchregel in drei Fassungen | MRK-R43 gilt |
| 52 | MRK 5.1/5.2 | Neue Konsole startet nie | Launch-Hype-Term |
| 53 | MRK-T02 | Einstellung erst nach 10–11 Jahren | d₁ = 3 %, Nachfolger-Sprung |
| 54 | MRK-R10 | Flops leben ewig | absolute Schwelle |
| 55 | S08 vs. A19 | 14 vs. 15 Jahre | 15 |
| 56 | MRK-R27 | Zufallsschritt ohne Wert | σ 0,03, Rückkehr 5 % |
| 57 | MRK 5.5 | Kosten/Kapital bei Kapital ≤ 0 | Mindestkapital |
| 58 | MRK-R47 | Release-Duell pendelt | einmal pro Titel, gleiche Kosten |
| 59 | UEB-R01 vs. A02 | „oder“ vs. „und“ | und |
| 60 | UEB-R05 | Spanne um den wahren Wert | Versatz |
| 61 | UEB 5 | Firmenwert ohne Plattform | Plattformwert H |
| 62 | UEB 5 | Integrationsfortschritt und Wechselneigung negativ | ab 0 begrenzen |
| 63 | UEB-T08 vs. LIZ-R07 | Gebühren wöchentlich vs. monatlich | ab nächstem Monat |
| 64 | S11 8.1 vs. UI-T01 | Firma ab Start | ab 8 Mitarbeitern |
| 65 | Design Asset-Tabelle | 4 statt 5 Größen | 5 × 5 |

## 7 Einstellungen

Über dem Genre-Standard. Was fehlt oder unklar ist:

| Punkt | Empfehlung |
| --- | --- |
| Hoher Kontrast | zusätzliches Darstellungsthema |
| Presse-Zufall | aus / gering / normal |
| Entscheidungsdichte | ruhig / normal / dicht, wirkt nur auf Angebote, nicht auf Krisen |
| Presse-Strenge | als Verschiebung der erwarteten Qualität definieren |
| Startprofile | Inhalt festlegen (siehe Abschnitt 5) |
| Zahlenformat kurz/voll | kleine Komfortoption |
| Mentor und Sprechblasen getrennt stummschaltbar | Komfort |
| Tempo 0,5× | als Knopf |

## 8 Umfang und Umsetzbarkeit

| Abschnitt | Prüfung 2 | Jetzt | Warum |
| --- | --- | --- | --- |
| Etappe 0 Prototyp | 3–4 Wochen | 4–6 Wochen | Numerik-Anhang und Wochen-Kern gehören in den Prototyp |
| Etappe 1 Kern | 4–6 Monate | 5–6 | Rahmen, Brett, Release-Abend, Worker, Determinismus |
| Etappe 2 Engines | 2–3 | 2–3 | – |
| Etappe 3 KI, Lizenzen, Teams, Büro | 4–6 | 5–7 | Umfangreichste Etappe |
| Etappe 4 Marketing, Release, Vertrieb | 2–3 | 3–4 | Vertrieb und Verwertung neu |
| **Early Access** | – | **nach 15–20 Monaten** | wenn Etappe 3 nicht überläuft |
| Etappe 5 Betrieb | 2 | 2–3 | – |
| Etappe 6a/6b | 4–5 | 4–5 | – |
| Querschnitt | 3–4 | 4–5 | Zwei Sprachen, Workshop, Controller, Balancing |
| **Summe bis 1.0** | 21–29 | **26–36 Monate** | nebenberuflich etwa das Doppelte |

**Risiken:** (1) Numerik ohne Anhang, (2) zwei Zeitauflösungen, (3) Grafik der Bühne – das statische Epochenbild sollte Plan A für den Early Access sein, (4) etwa 15 Startwerte, mit denen die eigenen Tests nicht bestehen, (5) rund 1.300 Textbausteine in zwei Sprachen mit Redaktion: 2–3 Monate, die im Plan fehlen.

## 9 Empfehlungen

### Muss (vor Etappe 0/1)

| # | Empfehlung | Ziel |
| --- | --- | --- |
| M1 | Immer wöchentlich simulieren; Monat nur als Anzeige; Umschaltkriterium erweitern | S01, S12 |
| M2 | Numerik-Anhang: Typ bp, Helfer, Tabellen, eine Rundungsregel; float-Felder umdeklarieren | S12, alle |
| M3 | Spannen mit Versatz (Playtests, Übernahme-Wert) | S02, S09 |
| M4 | Börsenerwartung gemischt mit Glaubwürdigkeit; Dividende | S07 |
| M5 | Trend aus Q; ε als Wasserfall-Balken; erwartete Qualität automatisch kalibrieren | S02, S08 |
| M6 | Launch-Hype-Term; Schwund und Nachfolger-Sprung; Flop-Schwelle | S08 |
| M7 | Alle 65 Widersprüche bereinigen | S05, S06, S07, S09, Überblick |
| M8 | Unbegrenzte Faktoren begrenzen | S06, S09 |
| M9 | Publisher-Startwerte senken | S07 |
| M10 | Starter-Engine, Kopierschutz ohne Modul, γ | S03 |

### Sollte (vor Early Access)

| # | Empfehlung | Ziel |
| --- | --- | --- |
| S1 | Zwei Meilenstein-Momente je Projekt; Wochen ohne Angebot unter 60 % | S02, S01 |
| S2 | Jährliche Strategiekonferenz | S07, S11 |
| S3 | Aktives Abwerben; Konkursmasse-Auktion | S07, S08 |
| S4 | Early Access und Abo-Deal mit Regeln | S05 |
| S5 | Startprofile und Welt-Generator; Vorgeschichte als Chronik | S01, S10 |
| S6 | Wissensbuch-Erzeugung als Regeln | S11 |
| S7 | Feature-Freeze und Umfangsfaktor | S02 |
| S8 | Lead entscheidet bei Multiplattform | S02 |
| S9 | Release-Duell einmal pro Titel | S08 |
| S10 | Einstellungen ergänzen | S10 |
| S11 | Bewerber mit Firmengröße; Pleite-Teams als Angebot | S07 |
| S12 | Statisches Epochenbild als Plan A für den Early Access | S11, Etappenplan |

### Kann (nach Early Access)

| # | Empfehlung | Ziel |
| --- | --- | --- |
| K1 | Studio-Kultur des Spielers | S07, S09 |
| K2 | Steuern; Plattformhersteller-Konto und Plattformwert | S07, S08, S09 |
| K3 | Gerüchte-Vorphase und Zukunftswetten | S08 |
| K4 | Altersfreigabe; QA-Formel | S02, S05 |
| K5 | Büro-Ansicht hinter Publishing und Middleware | S13 |
| K6 | Markenjubiläum, Tempo 0,5×, Zahlenformat | S02, S10, S11 |

## Quellen (Spielerkritik)

- [VaporLens: Mad Games Tycoon 2](https://vaporlens.app/app/1342330/mad_games_tycoon_2.md)
- [VaporLens: City Game Studio](https://vaporlens.app/app/726840/city_game_studio_your_game_dev_adventure_begins)
- [VaporLens: Software Inc.](https://vaporlens.app/app/362620/software_inc/stats/details)
- [VaporLens: Game Dev Tycoon](https://vaporlens.app/app/239820/game_dev_tycoon.md)
- [Steam-Community: Mad Games Tycoon 2](https://steamcommunity.com/app/1342330/discussions/0/3192493519700283368)
- [Steam-Community: Software Inc.](https://steamcommunity.com/app/362620/discussions/0/3117024613289520969)

## Umsetzungsstatus (29.10.2026)

Alle Punkte dieses Berichts sind in Design-Dokument, Spezifikationen, Datenblatt und Abgleich (A33–A46) eingearbeitet. Jeder Spec-Tab endet mit dem Abschnitt „Änderungen nach Prüfung 3“. Neue Zahlen sind Schätzungen und stehen gesammelt im Datenblatt, Abschnitt 10.

| Punkt | Umsetzung | Wo |
| --- | --- | --- |
| M1 Zeitmodell | Immer wöchentlich, Monat nur Anzeige (4/4/5 Wochen), Umschalten bei erstem Engine-Projekt, zweitem Release oder 1985 | S01, S12, A33, Design: Kern-Spielschleife |
| M2 Numerik | Neuer Abschnitt 5.9 mit bp, Cent, einer Rundungsregel, Mindestnennern und Funktionstabellen; Lint gegen Fließkomma | S12 TEC-R80–R89, A40 |
| M3 Versatz | Playtests und Firmenbewertung mit Versatz, Spanne schrumpft | S02 PRD-R31/R32, S09, A35 |
| M4 Börse | **Geändert nach Entscheidung des Autors:** statt Analysten, Prognose und Glaubwürdigkeit eine Anlegerstimmung 0–100 mit sichtbarer Zielmarke; Kurs nur Anzeige; Dividende in 3 Stufen; Übernahmen unverändert | S07 FRM-R51–R54, R74, R75, 5.7; A24; Design: Börse |
| M5 Wertung | Trend aus Q; Zeitgeist ±0,3 und Tagesform der Presse als Balken; Q\_erw als Median des Vorjahres; Presse-Strenge ±8 % | S02 PRD-R54–R57, A34 |
| M6 Plattformen | Launch-Hype, d₁ 3 %, Sprung beim Nachfolger, Flop-Schwelle; Kaufrate m auf 0,3 korrigiert (nachgerechnet) | S08 5.2a, A36, Datenblatt 10 |
| M7 Widersprüche | Alle 65 Zeilen in den betroffenen Specs bereinigt (S01–S13, Abgleich A05, A07, A13, A21, A24) | alle Specs |
| M8 Begrenzungen | Churn ≤ 0,5, normierter Bug-Anteil, Zufriedenheiten 0–100, Integration und Wechselneigung ≥ 0, Mindestkapital im Nenner | S04, S06, S08, S09 |
| M9 Publisher | Vorschuss 60–80 %, Split 0–10 % vor und 25–35 % nach Recoup | S07 |
| M10 Engine-Start | Starter-Engine Rendering 1, sonst 0; γ = 1,2 (2005er Engine 2012: E = 0,78); Kopierschutz vor 2000 ohne Modul | S03 |
| S1 Meilenstein-Momente | Prototyp- und Gold-Review für jedes Projekt; Ziel < 60 % Wochen ohne Angebot | S02, S01, S11 |
| S2 Strategiekonferenz | Jährlich, drei Fragen, Pflicht-Entscheidung | S07 FRM-R67, S11 |
| S3 Abwerben, Konkursmasse | Aktives Abwerben; Auktion der Konkursmasse; Teams als Angebot | S07, S08 MRK-R65/R66, A38 |
| S4 Early Access, Abo | Regeln mit Zahlen | S05 MKT-R47–R54 |
| S5 Startprofile, Welt | Profiltabelle 4 × 5 Startjahre, Welt-Generator, Chronik als Briefing | S01 KRN-R70–R81, A39 |
| S6 Wissensbuch | Einträge aus Wasserfall-Balken, Sicherheitsgrad, „umstritten“ | S11, Design: Produkte |
| S7 Freeze und Umfang | Freeze je Umfang, Faktoren 0,4/1/2,5/5 | S02, S03, A43 |
| S8 Lead-Plattform | Lead-Plattform entscheidet über Features | S02 |
| S9 Release-Duell | Höchstens einmal pro Titel, kostet 10 % Interesse | S08 MRK-R47 |
| S10 Einstellungen | Hoher Kontrast, Presse-Zufall, Entscheidungsdichte, Presse-Strenge als Formel | S10 ZIE-R42–R52, A44 |
| S11 Bewerber | Skalierung mit Firmengröße, Akademie, Teams aus Pleiten | S07 |
| S12 Bühne | Statisches Epochenbild als Plan A für den Early Access | S11 |
| K1 Studio-Kultur | Drei Merkmale aus Entscheidungen | S07, S09, A42 |
| K2 Steuern, Herstellerkonto | Gewinnsteuer 20–35 %; Konto der Hersteller mit Rückzug | S07, S08 MRK-R67, A46 |
| K3 Gerüchte | Vorphase 2–3 Jahre, Wette als Pin | S08 MRK-R68, A45 |
| K4 Altersfreigabe, QA | Inhaltsstufen 0–3; QA-Fundrate mit Bug-Kurve | S02 |
| K5 Büro-Ansicht | Nach Publishing und Middleware (Version 1.4) | S13, A21, Design |
| K6 Kleinigkeiten | Markenjubiläum, Tempo 0,5×, Zahlenformat | S02, S10 |
| Fehlende Funktionen | Alle zwölf eingebaut (siehe Zeilen oben); Dividende vereinfacht | mehrere |
| Umfang | Schätzung 26–36 Monate bis 1.0, Early Access nach 15–20 Monaten; Streichliste angepasst | Design: Umfang |
| Neu: Markenmarkt | Auf Wunsch des Autors ergänzt: Lizenzspiel und Verkauf in 1.0, Genre-Lizenz und Crossover später; Markenbörse, Wertformel, KI, Momente | S04 Abschnitt 13 (LIZ-M01–M31), S08 MRK-R69, S09, S11 UI-R101, S13, A37, Design: Lizenzmarkt |

**Noch offen für das Balancing:**

- Startwerte der Profile, Steuersätze, Preise der Großausbauten und die Interesse-Werte b, M½, c\_I und c\_M sind geschätzt.
- Die Tabellenbereiche der Numerik (z. B. ln und pow bis 100) werden in Etappe 0 gegen alle Formeln geprüft.
- Die Plattform-Lebensdauer ist nur für die Annahme „Nachfolger nach 6 Jahren“ nachgerechnet.
