# Spezifikation – Überblick und Glossar

**Stand:** 29.10.2026 · **Gilt für:** Early Access, 1.0, 1.1 und spätere Versionen

Die Spezifikation legt fest, **was gebaut wird**. Das Game Studio Tycoon – Design-Dokument erklärt, **warum**. Bei einem Widerspruch gilt die Spezifikation; der Widerspruch wird im Design-Dokument nachgezogen. Die `CLAUDE.md` des Projekts verweist auf diese Tabs.

## Die Spezifikationen

| Nr. | Tab | Inhalt | Prefix |
| --- | --- | --- | --- |
| S01 | S01 Simulationskern | Zeitmodell, Tick-Reihenfolge, Zufall, Ereignisse, Freischaltungen, Spielstand | KRN |
| S02 | S02 Produkte und Entwicklung | Produkttypen, Design-Dokument, Features, Qualität, Phasen, Playtests, Abbruch, Multiplattform, Marken | PRD |
| S03 | S03 Engines und Technologie | Module, Forschung, Schuld, Fremdmodule, Engine-Bindung, Anforderungen, Technik-Update | ENG |
| S04 | S04 Lizenzmarkt | Verträge, Vorlagen, Kundenstatus, Open Source, Nutzwert der KI, Lizenzweg | LIZ |
| S05 | S05 Marketing, Release und Vertrieb | Interesse, Marketing, Release-Bildschirm, Verkauf, Preise, Piraterie, Messen, Merchandising, Lokalisierung | MKT |
| S06 | S06 Betrieb und Live-Service | Abteilung Betrieb, Patches, Community, MMO, F2P, Live-Service, Kundenservice, Analytics | BTR |
| S07 | S07 Firma | Teams, Schlüsselpersonen, Personal, Büro und Ausstattung, Standorte, Finanzen, Publisher, Aufträge, Börse, Delegation | FRM |
| S08 | S08 Markt, Plattformen und KI | Plattformen, Lebenszyklus, Devkits, Beziehungen, Trends, KI-Studios, Rivalen, Krisen, Zukunft | MRK |
| S09 | S09 Übernahmen und Konzern | Übernahmen (1.0-Minimalversion und Vollversion), Konzern | UEB |
| S10 | S10 Ziele, Einstellungen, Modding | Ziele, Preise, Spielende, Szenarien, Einstellungen, Schwierigkeit, Modding | ZIE |
| S11 | S11 Oberfläche, Präsentation, Inhalte | Oberfläche, Bildschirme, Visualisierungen, Bühne, Audio, Texte und Inhalte | UI |
| S12 | S12 Technik und Architektur | Stack, Architektur, Worker, Datenformate, Spielstand, Leistung, Tests, CLAUDE.md | TEC |
| S13 | S13 Ausbau nach 1.0 | Alles nach 1.0 mit Kurzspezifikation und Reihenfolge | AUS |
| S14 | S14 KI-System | Denken der KI: Wahrnehmung, Ziele, Strategiekonferenz, Nutzwert und Auswahl, Gegenzüge, Nachahmer, Lernen, Charakterzüge, Schwierigkeitsparameter, Ausgleich | KI |
| – | Datenblatt Startwerte | Ankerwerte je Epoche und reale Marktgeschichte als Gerüst | – |

## Konventionen

- **Regel-IDs:** Jede Regel hat eine ID aus Prefix und Nummer (z. B. `PRD-R07`), jeder Abnahmetest ebenso (`PRD-T03`). Tests im Code tragen die ID im Namen, damit jede Regel nachweisbar geprüft ist.
- **Versionen:** Jede Regel ist markiert: **\[1.0\]** gehört in Early Access und 1.0, **\[1.1\]** kommt mit dem ersten großen Update, **\[später\]** steht in S13. Was nicht markiert ist, gilt ab 1.0.
- **Einheiten:** Geld in US-Dollar nominal, intern als ganze Zahl in Cent. Zeit in Wochen (Tick), Monaten oder Jahren. Prozente als Bruch 0–1 in den Daten, als Prozent in der Oberfläche.
- **Startwerte:** Alle Zahlen sind Startwerte fürs Balancing. Sie stehen im Code nie fest, sondern in `data/*.json`; die Tabellen nennen jeweils die Datei.
- **Verbindliche Querschnitte:** Tick-Reihenfolge und Zufall (S01), Leistungsziele (S12), Entscheidungsbudget (S01 und Design-Dokument), Freischaltplan (S01).
- **Änderungen:** Eine Regel wird nie still geändert. Neue Fassung, alte als ersetzt markieren, Datum dazu.

## Versionen im Überblick

| Version | Inhalt | Wann |
| --- | --- | --- |
| Prototyp | Kernschleife ohne Bühne, Spaß-Test | Etappe 0 |
| Early Access | Alles mit \[1.0\] aus Etappe 1–4 | nach Etappe 4 |
| 1.0 | Alle \[1.0\]-Regeln aus Etappe 1–6 | nach Etappe 6 |
| 1.1 | Büro-Ansicht von oben und weitere \[1.1\]-Regeln | erstes großes Update |
| Später | Ausbau laut S13 | nach Reihenfolge in S13 |

## Abgleich zwischen den Spezifikationen

Beim Schreiben der Spezifikationen sind Fragen zwischen den Systemen aufgekommen. Diese Entscheidungen gelten für alle Specs; wo eine Spec etwas anderes sagt, gilt diese Tabelle.

| # | Frage | Entscheidung | Betrifft |
| --- | --- | --- | --- |
| A01 | Startjahre von Szenarien | Szenarien haben ein eigenes, freies Startjahr (z. B. 2018). Das freie Startjahr der Sandbox gilt ebenso. Die festen Startjahre 1980–2020 gelten nur für das normale Spiel. | S01, S10 |
| A02 | Freischaltung von Börse und Übernahmen | Ab 2005 und mindestens 150 Mitarbeitern. Börsengang zusätzlich: drei Jahre Gewinn, Jahresumsatz ab 50 Mio. USD, Kreditnote B oder besser. | S07, S09, S01 |
| A03 | Mindestwertung 5 bei guter Passung | Gilt nur auf den Stufen Entspannt und Leicht. | S02, S10 |
| A04 | Ziel „unabhängig bleiben“ in 1.0 | Bis 2040 nie mehr als 49 % der eigenen Aktien verkaufen und keine eigene Marke an einen Publisher abgeben. Ab feindlichen Übernahmen (S13) zusätzlich: nicht übernommen werden. | S10 |
| A05 | Bedingungen und Zufallsströme | S01 definiert die Bedingungssprache für Ereignisse, Freischaltungen, Ziele und Regeln. Zufallsströme: kalender, ki, engine, projekte, markt, betrieb, lizenzen, marken, finanzen, personal, ereignisse, awards, acquisitions, welt. Ein neues System bekommt einen eigenen Strom. | S01, S10, S12 |
| A06 | Abo-Deals | Verfügbar ab 2017. | S02, S05, S08 |
| A07 | Release-Paket | Neun Felder (Termin, Preis, Plattformen, Auflage, Editionen, Demo, Day-One-Patch, Kopierschutz, Serverkapazität zum Start) definiert S05; S02 verweist nur darauf. | S02, S05 |
| A08 | Abwanderung bei veralteter Technik | Live-Spiele bekommen einen Zuschlag auf die monatliche Abwanderung von 0,02 × (1 − E), wobei E der Engine-Faktor des Produkts ist. Das Technik-Update setzt E neu. | S03, S06 |
| A09 | Stufen von Kopierschutz und Anti-Cheat | Kopierschutz-Stufen und ihre Wirkung stehen in S05, Anti-Cheat-Stufen (keiner, einfach, serverseitig, tiefgreifend) in S06. Technisch sind beide Feature-Stufen nach S03. | S03, S05, S06 |
| A10 | Abo pro Arbeitsplatz | Als Lizenzmodell ab 2005. | S04 |
| A11 | Freischaltung der Abteilung Betrieb | Mit dem ersten Online-Produkt, der ersten Lizenz mit Support oder ab 20 offenen Anfragen im Monat. | S06, S07, S11 |
| A12 | Rabattwochen und Entscheidungsbudget | Standardregel ab Start aktiv: „Nach 12 Monaten an jeder Store-Aktion mit 25 % Rabatt teilnehmen.“ Rabattwochen erzeugen deshalb keine Entscheidungsangebote, außer der Spieler schaltet die Regel ab. | S05, S01 |
| A13 | Monatliche und quartalsweise Schritte | Simuliert wird immer wöchentlich (A33). Monatliche Berechnungen laufen im Wochen-Tick, in den der Monatserste fällt; quartalsweise im ersten Wochen-Tick des Quartals; jährliche in Woche 52. Kleine KI-Studios entscheiden monatlich, Rivalen wöchentlich. | S01, S04, S06, S12 |
| A14 | Schwierigkeitsstufen und Schalter | Fünf Stufen: Entspannt, Leicht, Normal, Schwer, Hardcore, dazu „Eigen“. Der Schalter „historisch feste Lebenszyklen“ gehört zu den weiteren Schaltern in S10. | S07, S08, S10 |
| A15 | Freischaltung von Standorten | Ab etwa 1995 und mindestens 60 Mitarbeitern; passt zum Freischaltplan. | S07, S01 |
| A16 | Ansichten und Bildschirme | Zehn Ansichten, acht Hauptbildschirme: Finanzen, Zeitleiste und Lizenzen sind Unteransichten mit denselben Bausteinen. | S11 |
| A17 | Leistung und Balancing | Der Back-Catalog wird als ein gemeinsamer Block gerechnet. Keine Bot-Strategie darf in mehr als 60 % der Seeds gewinnen. | S12, Balancing |
| A18 | Versionen nach 1.0 | Die Reihenfolge und die Versionsnummern 1.2 bis 2.0 in S13 sind ein Vorschlag; sie werden nach dem Early Access anhand der Rückmeldungen festgelegt. | S13 |
| A19 | Konsolen-Lebensdauer | Nach der Marktgeschichte: erfolgreiche Konsolen 8–15 Jahre bis zum Produktionsende, Flops 2–4 Jahre (Datenblatt, Abschnitt 4). | S08 |
| A20 | Kosten pro Person ab 2020 | Nach der Recherche gelten 13.000 USD (2020), 15.500 (2030) und 18.000 (2040) pro Person und Monat inklusive Nebenkosten. Wo eine Spec 11.000 oder 13.000 nennt, gilt das Datenblatt. | alle, Datenblatt |
| A21 | Büro-Ansicht (Version 1.4) | Draufsicht im Stil von Prison Architect statt Isometrie, weil sie sich aus Code und SVG erzeugen lässt. Isometrie nur später mit externen 2D-Grafikern. Sie folgt nach Publishing und Middleware (S13); bis dahin gilt die Bühne mit statischem Epochenbild. | S07, S11, S13 |
| A22 | Determinismus | Der Kern rechnet alle Werte als ganze Zahlen: Geld in Cent, Anteile und Faktoren in Basispunkten (1,0 = 10.000), Abschneiden nach jedem Schritt; Exponential- und Potenzfunktionen aus Tabellen. Fließkomma nur in der Oberfläche. | S01, S12, alle |
| A23 | Ereignisse und Obergrenze | Zwei Warteschlangen: Projekt-Gates hängen am Projekt und zählen nicht gegen die Obergrenze; Welt-Ereignisse haben Priorität und ein Verfallsdatum von 2–4 Wochen, höchstens eines pro Woche rückt in den Fokus. Bei Verfall gilt die angezeigte Standardantwort, der Wochenbericht nennt sie. | S01, S11 |
| A24 | Börse | Vereinfacht (Entscheidung des Autors): Die Börse hat einen Wert, die Anlegerstimmung 0–100, mit sichtbarer Quartals-Zielmarke (Vorjahresquartal + 5 %). Der Kurs ist nur Anzeige: Firmenwert ÷ Aktien × (0,7 + 0,6 × Stimmung/100). Es gibt keine Analysten, keine Prognose und keine Kursformel. Die Dividende hat 3 Stufen. Übernahmen bleiben unverändert (S07 FRM-R51–R54, R74, R75, Formel 5.7). | S07 |
| A25 | Plattformbasis | Neukäufer nur aus dem ungesättigten Markt und bei positiver Attraktivität; Schwund zwischen 0,002 und 0,15 pro Monat begrenzt (S08). | S08 |
| A26 | Kein festes Rezept | Features tragen Merkmale mit Synergien und Konflikten; Teamstärke und Engine-Stufe wirken auf jedes Feature; der Seed verschiebt Passung und Erwartungen um bis zu ±20 %; Wiederholung senkt die Innovation; das Wissensbuch speichert Erkenntnisse mit Sicherheitsgrad. | S02, S10, S11 |
| A27 | Standorte und Projekte | Teams mehrerer Standorte arbeiten gemeinsam an Projekten; je weiterer Standort 5 % Koordinationsaufwand, ab 6 Stunden Zeitunterschied 10 %. Förderungen gelten für die Lohnkosten der Teams dieses Standorts an förderfähigen Projekten. | S07, S02 |
| A28 | Fremdmodule und Middleware | In 1.0 kauft oder lizenziert der Spieler Fremdmodule von KI-Firmen. Nach 1.0 bietet er eigene Module einzeln an, mit demselben Lizenzvertrag und dem Umfang „Modul“; es gibt keinen zweiten Lizenzmarkt. | S03, S04, S13 |
| A29 | Mutter und Tochter | Jede Tochter hat ein eigenes Konto und führt quartalsweise einen einstellbaren Gewinnanteil ab (Standard 70 %). Eine gekaufte Engine ist sofort nutzbar, die eigenen Teams arbeiten damit aber zuerst 30 % langsamer, abnehmend über 8–16 Wochen; Tochter-Teams können als Mentoren helfen. | S09, S03 |
| A30 | Serverkapazität | Drei Quellen: eigener Serverraum oder Rechenzentrum, gemietete Kapazität (vier Wochen Vorlauf), Cloud ab 2010 (+50 % pro Woche). Kapazität zum Start auf dem Release-Bildschirm, danach Regel „Bedarf × 1,3“. Ausfall, wenn die Startspitze (2–4-facher Bedarf) nicht gedeckt ist. | S05, S06, S07 |
| A31 | Ausstattung | Kapazitätsräume (Tonstudio, Testlabor, Serverraum, Rechenzentrum) mehrfach, jeder weitere mit 70 % Nutzen; fünf Großausbauten mit zwei Plätzen (Rechenzentrum, Forschungslabor, Qualitätszentrum, Performance-Capture-Bühne, Akademie). | S07 |
| A32 | Vertrieb und Produktion | Neuer Abschnitt 13 in S05: Datenträger und Fertigung, Vertriebswege, Restnachfrage in drei Preisstufen, Editionen und Neuauflagen. Neue Produkttyp-Datensätze für S02: Complete Edition, Budget-Reihe, Sammlung, Klassiker-Sammlung, Remake, Lizenz an Budget-Publisher, Hardware-Bundle, Heft-Beilage, Shareware. | S02, S05, S08 |
| A33 | Zeitmodell | Simuliert wird immer wöchentlich. Der Kalender hat Quartale zu 13 Wochen und Monate zu 4, 4 und 5 Wochen; der Monat ist nur eine Anzeige (GameState.displayUnit). Die Anzeige schaltet beim ersten Engine-Projekt, beim zweiten Release oder 1985 auf Wochen, je nachdem, was zuerst eintritt. | S01, S11, S12 |
| A34 | Wertung | Der Trend steckt nicht mehr in Q. Er wirkt voll auf die Verkäufe (V₀) und auf die Wertung nur als Balken Zeitgeist (±0,3). Dazu kommt der Balken Tagesform der Presse (σ 0 / 0,15 / 0,3 je nach Einstellung Presse-Zufall). Q\_erw ist der Median-Q des Vorjahres je Umfang; Presse-Strenge verschiebt ihn um ±8 % je Stufe. | S02, S05, S10, S11 |
| A35 | Unsicherheit mit Versatz | Playtests und Firmenbewertungen ziehen je einen Versatz, und die Spanne liegt um den verschobenen Wert. Weitere Tests bzw. die Prüfung verkleinern Versatz und Spanne. Die Spanne enthält den wahren Wert in 80 % der Fälle. | S02, S09 |
| A36 | Lebenszyklus der Plattformen | Attraktivität mit Launch-Hype (fällt über 12 Monate auf 0), d₁ = 3 %, beim Erscheinen des Nachfolgers +50 % Schwund. Flop ist eine Basis unter 2 % der Marktgröße nach 24 Monaten. Die Kaufrate m steigt auf 0,3, sonst wächst keine Plattform über 2 % (Rechnung in S08, 5.2a). Das Datenblatt übernimmt diesen Wert. | S08, Datenblatt |
| A37 | Markenmarkt | S04 (LIZ-M) ist maßgeblich für Angebote, Verträge und Markenwert. S09 bewertet Marken beim Firmenkauf mit derselben Markenwert-Formel. Die KI-Regeln stehen in S08 (MRK-R69), Genre-Lizenzen und Crossover in S13. Merchandise- und Medienlizenzen bleiben in S05. | S02, S04, S08, S09, S13 |
| A38 | Konkursmasse | Die Auktion ist ein Welt-Ereignis in S08 (MRK-R65/R66). Nicht versteigerte Marken gehen in den Markenmarkt (S04), das Team wird als Angebot nach S07 übergeben. | S04, S07, S08 |
| A39 | Startprofile und Welt | Die Profiltabelle und der Welt-Generator in S01 (KRN-R70–R81) sind maßgeblich, S10 verweist darauf. A05 erhält die neuen Zufallsströme „welt“ und „marken“. | S01, S10 |
| A40 | Numerik | S12, Abschnitt 5.9 (TEC-R80–R89) ist maßgeblich. Es gilt eine Rundungsregel: Abschneiden Richtung null. Jede Division hat einen Mindestnenner, Funktionen kommen aus versionierten Tabellen. Wo eine Spec float nennt, sind bp gemeint. Die Tabellenbereiche werden in Etappe 0 gegen alle Formeln geprüft. | alle |
| A41 | Freischaltung | Systeme mit eigenem Auslöse-Ereignis erscheinen mit diesem Ereignis. Nur Systeme ohne eigenes Ereignis warten auf die Regel „ein System pro Release, zwei pro Jahr“. | S01, S11 |
| A42 | Studio-Kultur | S07 legt drei Merkmale aus Entscheidungen fest: Crunch-Haltung aus der Crunch-Regel und den Crunch-Wochen, Genre-Treue aus dem Anteil des häufigsten Genres, Offenheit aus Open-Source-Lizenzen und Modding, Gehaltsniveau aus der Personalpolitik. S09 nutzt sie für die Kulturpassung, S11 zeigt sie an. | S07, S09, S11 |
| A43 | Feature-Freeze und Plattformen | Freeze je Umfang: klein bei 60 % der Produktion, mittel zu Beginn der Beta, groß und AAA bei Alpha. Feature-Aufwand × 0,4 / 1 / 2,5 / 5. Über Features entscheidet die Lead-Plattform. Anforderungen an das Engine-Team sind bis zum Freeze möglich. | S02, S03 |
| A44 | Neue Einstellungen | S10 ist maßgeblich (ZIE-R42–R52): hoher Kontrast, Zahlenformat, getrennte Stummschaltung, Tempo 0,5×, Presse-Zufall, Entscheidungsdichte. Presse-Zufall und Entscheidungsdichte sperren keine Erfolge. Die Entscheidungsdichte wirkt nur auf Angebote, nicht auf Krisen. | S01, S02, S10, S11 |
| A45 | Gerüchte und Analytics | Ohne Analytics nennt ein Gerücht nur das Jahrzehnt. Analytics Stufe 1 nennt das Jahr ±2, Stufe 2 das Jahr ±1 und die betroffenen Genres. | S06, S08 |
| A46 | Steuern und Konten | Gewinnsteuer je Region 20–35 %, quartalsweise, mit Verlustvortrag; Förderungen als Steuergutschrift. Plattformhersteller führen ein eigenes Konto (S08, MRK-R67), Töchter ebenfalls (Abführung Standard 70 %). | S07, S08, S09 |
| A47 | KI-System und Schwierigkeit | S14 ist maßgeblich für das Denken der KI; MRK-R32–R52 und R69 sind Anwendungen davon. Die Schwierigkeit wirkt über Kompetenz und Aggressivität und ändert nie Zahlen; einzige Ausnahme ist die Startstärke der Rivalen. Die feste Kooperationsschwelle +40 (MRK-R50) gilt nur auf Normal; die anderen Stufen nutzen S14 Abschnitt 7. S10 übernimmt die Preset-Spalten. | S08, S10, S11, S14 |

## Glossar

| Begriff | Bedeutung | Spec |
| --- | --- | --- |
| Tick | Ein Rechenschritt der Simulation; eine Woche, am Anfang ein Monat | S01 |
| Entscheidungsangebot | Eine Fokus-Karte, die eine Antwort verlangt oder anbietet; höchstens eine pro Woche | S01 |
| Pflicht-Entscheidung | Ein Angebot, ohne dessen Antwort ein Vorgang nicht weitergeht | S01 |
| Ereigniskette | Mehrstufiges Ereignis mit Auslöser, Optionen, Folgen und Verzögerung | S01, S08 |
| Seed | Startwert des Zufalls; gleicher Seed und gleiche Eingaben ergeben denselben Verlauf | S01 |
| Aufschlüsselung | Die Liste der Faktoren, aus denen ein angezeigter Wert entsteht | S01, S11 |
| Produkttyp | Datensatz mit fünf Parametern, der eine Produktform beschreibt | S02 |
| Design-Brett | Bildschirm zum Anlegen eines Projekts mit Konzept- und Feature-Karten | S02, S11 |
| Bereichsprofil | Verteilung auf Gameplay, Grafik, Sound, Story, Technik, die sich aus den Features ergibt | S02 |
| Vertical Slice | Spielbarer Ausschnitt in Endqualität; das einzige harte Gate | S02 |
| Feature-Freeze | Ab hier kosten neue Features und Engine-Updates überproportional | S02, S03 |
| Playtest | Schätzung der Wertung mit Spanne vor dem Release | S02 |
| Prognose-Fächer | Darstellung der Wertungs- oder Verkaufsspanne | S02, S11 |
| Marke | Spielwelt mit Stärke und Frische; trägt Fans über Genres | S02 |
| Leistungsbudget | Rechenleistung, Speicher und Platz einer Plattform, die Features verbrauchen | S02, S08 |
| Modul | Baustein einer Engine mit Stufen (Rendering, Audio, Physik, KI, Netzwerk, Werkzeuge, Plattformen, Streaming) | S03 |
| Engine-Faktor E | Modulstufen im Verhältnis zum Stand der Technik | S03 |
| Technische Schuld | Wert, der durch Updates wächst und Tempo und Bugs verschlechtert | S03 |
| Fremdmodul | Lizenziertes oder gekauftes Modul fremder Herkunft (Middleware) | S03 |
| Engine-Bindung | Fest oder mitlaufend: wie ein Projekt neue Engine-Versionen übernimmt | S03 |
| Anforderung | Bestellung einer Modulstufe beim Engine-Team durch ein Projekt oder einen Lizenznehmer | S03 |
| Technik-Update | Hebt ein veröffentlichtes Spiel auf eine neuere Engine-Version | S03 |
| Vertragsvorlage | Indie, Standard oder Premium; gilt automatisch für passende Lizenzanfragen | S04 |
| Vertrauenswert | Wie verlässlich ein Engine-Anbieter seine Bedingungen hält | S04 |
| Lizenzweg | Spielweise mit fremder Engine und eigenen Entscheidungen | S04 |
| Interesse | Ein Wert für Vorbestellungen, Hype und Wishlists, je nach Epoche dargestellt | S05 |
| Release-Bildschirm | Alle Release-Entscheidungen auf einem Bildschirm | S05 |
| Konkurrenzdichte | Wie viele angekündigte Spiele derselben Zielgruppe in einer Woche erscheinen | S05 |
| Piraterie-Rate | Anteil möglicher Käufer, die kopieren statt kaufen | S05 |
| Messe-Saison | Eine Jahresentscheidung, welche Projekte wie gezeigt werden | S05 |
| Abteilung Betrieb | Live-Ops, Kundenservice, Community und Engine-Support als Töpfe | S06 |
| Churn | Monatliche Abwanderung aus einem Online-Spiel | S06 |
| Team | Spieleinheit aus mehreren Personen mit Stärke, Erfahrung und Moral | S07 |
| Schlüsselperson | Einzeln sichtbare Person mit Rolle, Eigenschaften und Loyalität | S07 |
| Grundriss | Fester Büroplan mit Arbeits- und Ausstattungsplätzen | S07 |
| Ausstattung | Paket, das einen Platz belegt und eine Wirkung hat (z. B. Tonstudio) | S07 |
| Führungskapazität | Wie viele Einheiten die Firmenleitung direkt steuern kann | S07 |
| Produzent | Schlüsselperson, die Projekte nach Vorgaben führt | S07 |
| Regel (Delegation) | Wenn-dann-Satz, der eine Entscheidung automatisch trifft | S07 |
| Recoup | Zeitpunkt, an dem ein Publisher seinen Vorschuss wieder eingespielt hat | S07 |
| Attraktivität A | Monatlicher Wert einer Plattform aus Hits, Bibliothek, Preis und Rückstand | S08 |
| Devkit-Welle | Zeitfenster, in dem ein Hersteller Entwicklergeräte vergibt | S08 |
| Beziehungswert | 0–100 zwischen Spieler und Plattformhersteller | S08 |
| Rivale | Benanntes KI-Studio mit Strategie, Gedächtnis und Beziehung zum Spieler | S08 |
| Integrationskapazität | Wie viele Übernahmen der Konzern gleichzeitig verkraftet | S09 |
| Vorgabe | Richtlinie an ein Tochterstudio (Autonomie, Genres, Budget …) | S09 |
| Vermächtnis-Wertung | Abschlusswertung am Spielende mit Titel | S10 |
| Platzangebot | Einstellung, die Plätze pro Grundriss skaliert | S07, S10 |
| Erleben-Ebene | Standardansicht mit Karten, Diagrammen und Bühne | S11 |
| Analysieren-Ebene | Tabellenansicht derselben Objekte (Taste Tab) | S11 |
| Fokus-Karte | Die eine Entscheidung, die gerade im Vordergrund steht | S11 |
| Bühne | Ansicht des Firmensitzes mit Teams, Personen und Requisiten | S11 |
| Anzeige-Delta | Änderungen am Anzeigemodell, die der Worker pro Tick an die Oberfläche schickt | S12 |
