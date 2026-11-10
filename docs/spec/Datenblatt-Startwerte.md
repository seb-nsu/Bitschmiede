# Datenblatt: Startwerte und Marktgeschichte

**Stand:** 29.10.2026 · **Gilt für:** alle Specs · **Dateien:** `data/anchors.json`, `data/platforms.json`, `data/market.json`

Das Datenblatt hält die Ankerwerte, aus denen alle Specs ihre Startwerte ableiten, und die reale Marktgeschichte als Gerüst für die fiktiven Plattformen. Alle Zahlen sind Startwerte fürs Balancing. Geld ist US-Dollar nominal. **\[R\]** = aus der Recherche belegt (Quellen am Ende), **\[S\]** = Schätzung oder Ableitung, **\[F\]** = Fortschreibung in die Zukunft (ab 2026).

## 1 Ankerwerte je Epoche

Zwischen den Stützjahren wird linear interpoliert.

| Wert | 1980 | 1990 | 2000 | 2010 | 2020 | 2030 \[F\] | 2040 \[F\] |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Kosten pro Person und Monat inkl. Nebenkosten (USD) | 2.500 | 4.000 | 6.500 | 8.500 | 13.000 | 15.500 | 18.000 |
| Durchschnittsgehalt pro Jahr, USA (Referenz) | \~20.000 \[R\] | \~50.000 \[S\] | \~61.000 \[R, 2001\] | \~81.000 \[R\] | \~140.000 \[R, 2024\] | – | – |
| Vollpreis eines Spiels | 30 | 50 | 50 | 60 | 70 | 80 | 90 |
| Indie-Preis | – | – | 10–20 | 10–20 | 15–25 | 15–30 | 20–30 |
| Team eines kleinen Spiels | 1–3 | 3–8 | 5–15 | 5–20 | 5–20 | 5–20 | 5–20 |
| Team eines AAA-Spiels | – | 30–100 | 50–150 | 100–250 | 150–500 | 200–600 | 200–600 |
| Budget eines AAA-Spiels (Entwicklung) | – | 2–5 Mio. | 10–40 Mio. | 40–100 Mio. | 150–300 Mio. | 250–400 Mio. | 300–500 Mio. |
| Entwicklungsdauer AAA | – | 1–2 Jahre | 2–3 Jahre | 2–3 Jahre | 4–6 Jahre | 4–6 Jahre | 3–5 Jahre (KI-Werkzeuge) |
| Marketing AAA im Verhältnis zur Entwicklung | 0,2 | 0,3 | 0,5 | 0,8 | 0,5–1,0 | 0,7 | 0,7 |
| Miete pro Arbeitsplatz und Monat | 150 | 250 | 400 | 600 | 900 | 1.100 | 1.300 |
| Digitalanteil Konsole | 0 | 0 | 0 | 0,10 | 0,60 | 0,90 | 0,95 |
| Digitalanteil PC | 0 | 0 | 0,05 | 0,50 | 0,95 | 0,98 | 0,98 |
| Store-Anteil digital | – | – | 0,30 | 0,30 | 0,30 (Staffel bis 0,20; ein Konkurrenz-Store 0,12) | 0,25 | 0,25 |

- **Burn-Rate zur Kontrolle:** Die Branche rechnet um 2010–2017 mit etwa 10.000 USD pro Kopf und Monat inklusive Miete und Overhead \[R\]. Kosten pro Person plus Miete im Spiel liegen 2010 bei 9.100 und 2015 bei etwa 11.600 USD; das passt.
- **Personalanteil:** 60–80 % eines Entwicklungsbudgets sind Personal und personennaher Overhead \[S\]; Outsourcing kann bei AAA bis 40 % erreichen \[R\].
- **Physischer Verkauf:** Vom Endpreis bleiben dem Publisher etwa 45–55 %: Händler 20–30 %, Plattformgebühr auf Konsolen etwa 12 % (7–10 USD pro Disc), Herstellung und Vertrieb \[R, 2006\]. Die Specs führen das vereinfacht als „Händler- und Herstellungsanteil \~50 %“.
- **Abgleich mit den Specs:** Die Recherche hebt die Kosten pro Person ab 2020 an (vorher 11.000 und 13.000 für 2020 und 2030). Es gelten die Werte dieser Tabelle (siehe Abgleich A20).

## 2 Marktgröße

Die Simulation kennt keine Spielhallen. Marktgröße meint deshalb Konsole, Handheld, PC und Mobile. Die Werte sind nominal modelliert aus einer inflationsbereinigten Reihe (Pelham Smithers) und nominalen Newzoo-Werten \[S\].

| Jahr | Markt (Mrd. USD) | Konsole + Handheld | PC | Mobile | Ereignis im Spiel |
| --- | --- | --- | --- | --- | --- |
| 1980 | 3 | 3 | – | – | Start, Heimcomputer kommen |
| 1982 | 4 | 3,7 | 0,3 | – | Höhepunkt vor dem Crash |
| 1985 | 1,5 | 0,3 | 1,2 | – | Tiefpunkt nach dem Crash |
| 1990 | 6,5 | 4,3 | 2,2 | – | Konsolen erholt |
| 1995 | 10 | 5 | 5 | – | CD und 3D |
| 2000 | 20 | 13 | 5 | 2 | Online-Zeit beginnt |
| 2005 | 33 | 19 | 8 | 6 | Digitaler Vertrieb auf PC |
| 2010 | 55 | 26 | 13 | 16 | Smartphones |
| 2015 | 80 | 22 | 25 | 33 | Mobile größer als Konsole |
| 2020 | 160 | 45 | 37 | 77 | Boom |
| 2022 | 184 | 52 | 41 | 92 | Erster Rückgang |
| 2025 | 200 | 45 | 44 | 113 | Erholung \[R\] |
| 2030 \[F\] | 240 | 50 | 50 | 140 | Zukunftsepoche |
| 2040 \[F\] | 300 | Seed-abhängig | Seed-abhängig | Seed-abhängig | Zukunftsepoche |

## 3 Zyklen und Krisen

| Ereignis | Zeit | Wirkung real | Im Spiel |
| --- | --- | --- | --- |
| Crash | 1983–1985 | US-Konsolenumsatz −97 %, Atari verliert über 500 Mio. USD; Heimcomputer wachsen weiter \[R\] | Historisches Ereignis „Crash“: Konsolenmarkt fällt über zwei Jahre auf 10 %, Heimcomputer +20 %; Studios mit vielen schwachen Spielen trifft es zuerst |
| Erholung | 1986–1989 | Eine neue Konsole mit strenger Zertifizierung holt den Markt zurück \[R\] | Neuer Hersteller mit hoher Zertifizierungshürde |
| Finanzkrise | 2008–2009 | US-Markt −8 % im Folgejahr, zunächst krisenfest \[R\] | Krise im Marktzyklus: Kredite teurer, Publisher vorsichtiger |
| Boom | 2020–2021 | Starkes Wachstum, viele Übernahmen \[R\] | Boomphase: Geld leicht verfügbar, Bewertungen hoch |
| Entlassungswellen | 2022–2025 | rund 45.000 Stellen, gescheiterte Live-Service-Spiele, AAA-Budgets über 200 Mio. USD \[R\] | Krise: Budgets sinken, Live-Service-Fehlschläge häufiger |

Ab 2026 erzeugt der Seed die Zyklen (siehe S08, Boom und Krise).

## 4 Plattform-Gerüst

Die fiktiven Plattformen werden aus diesem Gerüst erzeugt: Jede reale Generation liefert eine Familie mit Erscheinungsjahr, Preis, Lebensdauer und typischem Erfolg. Namen und Hersteller sind fiktiv; Erfolg und Lebensdauer ergeben sich im Spiel dynamisch (S08), die Tabelle liefert die Startwerte.

| Familie | Jahre | Startpreis | Datenträger | Typischer Erfolg | Lebensdauer Erfolg / Flop | Reales Vorbild |
| --- | --- | --- | --- | --- | --- | --- |
| Konsole Gen. 2 | 1977–1982 | 175–300 | Modul | 2–30 Mio. | 15 / 3 Jahre | Atari 2600, Intellivision, ColecoVision |
| Heimcomputer | 1977–1987 | 300–1.300 (fallend) | Kassette, Diskette | 2–17 Mio. | 12 / 5 Jahre | C64, ZX Spectrum, Apple II, Amiga, Atari ST |
| PC (fortlaufend) | ab 1981, Spiele ab \~1987 dominant | – | Diskette → CD → Download | wächst laufend | unbegrenzt | IBM-kompatibler PC |
| Konsole Gen. 3 | 1985–1986 | 180–200 | Modul | 10–62 Mio. | 10 / 5 Jahre | NES, Master System |
| Konsole Gen. 4 | 1989–1991 | 190–200 | Modul | 10–49 Mio. | 8 / 5 Jahre | Genesis, SNES, TurboGrafx |
| Handheld 1 | 1989–1991 | 90–180 | Modul | 2–119 Mio. | 14 / 5 Jahre | Game Boy, Game Gear, Lynx |
| Konsole Gen. 5 | 1995–1996 | 200–400 | CD oder Modul | 9–102 Mio. | 11 / 3 Jahre | PlayStation, N64, Saturn |
| Konsole Gen. 6 | 1999–2001 | 200–300 | DVD | 9–160 Mio. | 12 / 2 Jahre | PS2, Xbox, GameCube, Dreamcast |
| Handheld 2 | 2001–2005 | 100–250 | Modul, UMD | 80–154 Mio. | 9 / – | GBA, DS, PSP |
| Konsole Gen. 7 | 2005–2006 | 250–600 | DVD, Blu-ray | 85–102 Mio. | 11 / – | Xbox 360, PS3, Wii |
| Smartphone | ab 2008 | – | Download | Massenmarkt | unbegrenzt | App-Stores |
| Handheld 3 | 2011–2012 | 250 | Karte | 10–76 Mio. | 9 / 7 Jahre | 3DS, PS Vita |
| Konsole Gen. 8 | 2012–2013 | 300–500 | Blu-ray, Download | 14–117 Mio. | 8 / 4 Jahre | PS4, Xbox One, Wii U |
| Hybrid | 2017 | 300 | Karte, Download | \~155 Mio. | 9+ / – | Switch |
| Konsole Gen. 9 | 2020 | 300–500 | Blu-ray, Download | 25–90 Mio. (laufend) | laufend | PS5, Xbox Series |
| Hybrid 2 | 2025 | 450–500 | Karte, Download | laufend | laufend | Switch 2 |
| Zukunft | ab 2026 \[F\] | Seed | Download, Cloud | Seed | Seed | VR, Cloud, neue Handhelds (S08 Zukunftsepoche) |

- **Muster:** Eine Generation dauert 5–7 Jahre, die Produktion erfolgreicher Geräte 8–15 Jahre. Flops werden nach 2–4 Jahren eingestellt. Erfolgreiche Geräte bekommen Preissenkungen und günstigere Modelle \[R\]. Zielkorridor für S08 deshalb: Erfolg 8–15 Jahre, Flop 2–4 Jahre (siehe Abgleich A19).
- **Wendepunkt PC:** Ab etwa 1988 dominiert der IBM-kompatible PC, die Heimcomputer-Ära endet 1993/94 \[R\].
- **Abwärtskompatibilität** gibt es real uneinheitlich; im Spiel hat jede Familie eine Chance von 50 %, dass ihr Nachfolger die alte Basis teilweise mitnimmt.

## 5 Devkits und Launch-Titel

| Wert | Real | Startwert im Spiel |
| --- | --- | --- |
| Vorlauf für eigene Studios und große Partner | 18–30 Monate (Xbox 360 \~20, PS4 12–21, PS5 \~30) \[R\] | Welle 1: 24–18 Monate vor Start |
| Breite Verteilung an Dritte | 6–12 Monate vorher \[S\] | Welle 2: 12–9 Monate vor Start |
| Revisionen bis zum finalen Kit | 3–4 \[S\] | Leistungsbudget bis 6 Monate vor Start nur als Spanne |
| Launch-Titel einer großen Konsole | 7–29, meist 15–20 \[R\] | Ziel 12–20 Spiele zum Start, KI füllt auf |

## 6 Budgets, Teams und Dauer nach Epoche

| Epoche | Team | Dauer | Budget | Beispiele |
| --- | --- | --- | --- | --- |
| 1978–1984 | 1 Person, später kleine Teams | 6 Wochen bis 12 Monate | wenige 10.000 USD \[S\] | Konsolenspiele von Einzelentwicklern \[R\] |
| 1985–1989 | 1–6 | \~12 Monate | 0,1–1 Mio. USD | ein großer Plattformer \~0,8 Mio. USD \[R\] |
| 1990er | 10–50, AAA bis 100 | 1–2 Jahre | 1–5 Mio. USD, Spitzen 40 Mio. | großes 3D-Rollenspiel \~40 Mio. USD \[R\] |
| 2000–2005 | 20–100 | 1–3 Jahre | 1–6 Mio. USD, Spitzen 40 Mio. | \[R\] |
| 2005–2012 | 50–200 | 2–3 Jahre | 18–28 Mio. USD Durchschnitt, AAA 40–100 Mio. | Marketing teils das Dreifache der Entwicklung \[R\] |
| 2013–2019 | 100–400 | 3–4 Jahre | 50–150 Mio. USD | 400 Personen × 36 Monate × 10.000 USD ≈ 144 Mio. \[R\] |
| 2020–2026 | Kern 150–300, mit Outsourcing über 1.000 | 4–6 Jahre | 200–315 Mio. USD | AAA in Nordamerika ab 300 Mio. USD \[R\] |

## 7 Engine-Lizenzen

| Zeit | Reales Modell | Startwert für KI-Anbieter im Spiel |
| --- | --- | --- |
| 1990er | Pauschale bis 350.000 USD pro Titel; anfangs auch \~10 % Royalty auf den Großhandelspreis \[R\] | Pauschale 100.000–350.000, optional Royalty 5–10 % |
| um 2002 | 250.000 USD Garantie gegen 5 % Royalty; kleine Engines 100 USD pro Entwickler \[R\] | Standard: Pauschale + 5 %; Indie-Engines pro Arbeitsplatz |
| 2000er | sechs- bis siebenstellige Lizenzen für AAA \[S\] | Premium-Vorlage 0,5–1 Mio. pro Titel |
| ab 2015 | Kostenlos, 5 % Royalty ab einer Umsatzschwelle (heute 1 Mio. USD) \[R\] | Royalty 5 % ab Schwelle, Schwelle steigt mit der Epoche |
| ab 2005 | Abo pro Arbeitsplatz, z. B. \~2.000 USD pro Jahr, gratis unter einer Umsatzgrenze \[R\] | Abo 1.500–2.500 pro Arbeitsplatz und Jahr |
| 2023–2024 | Geplante Gebühr pro Installation führt zu Protest und wird zurückgenommen \[R\] | Vorbild für das Ereignis „Preis-Schock“ und den Vertrauenswert (S04) |
| 2012 → 2024 | Eigene Engines bei Neuerscheinungen auf Steam von 71 % auf 13 %; bei verkauften Kopien 41 % \[R\] | Kennzahl „Anteil Lizenz-Engines“ soll in diese Richtung laufen |

## 8 Piraterie

| Epoche und Plattform | Grundrate (Anteil möglicher Käufer) | Hinweis |
| --- | --- | --- |
| Heimcomputer 1980er | 0,60 | real 50–90 % geschätzt \[S\] |
| PC 1990er | 0,50 | Handbuch- und Codeabfragen \[R\] |
| PC 2000er | 0,50 | einzelne Titel 80–90 % \[R\] |
| PC 2010er | 0,20 | Digitalvertrieb und Abo-Modelle senken die Rate \[S\] |
| PC ab 2020 | 0,10 | \[S\] |
| Konsolen | 0,05–0,20 | höher bei Modchip-Epochen (Ende 1990er) \[S\] |
| Handhelds um 2008 | 0,30 | Flashkarten \[R\] |
| Online-Spiele, F2P, Live-Service | 0,00–0,02 | serverseitig geschützt |

| Schutzstufe | Wirkung | Haltbarkeit bis zum Knacken |
| --- | --- | --- |
| Handbuch- oder Codeabfrage | 0,20 | 1–4 Wochen |
| Datenträger-Schutz | 0,30 | 1–2 Wochen |
| Online-Aktivierung | 0,60 | 1–4 Wochen |
| Ständige Online-Pflicht | 0,80 | 4–12 Wochen |
| Starke Middleware (ab 2014) | 0,80 | anfangs \~4 Wochen, ab 2019 Ø \~1 Woche \[R\] |
| Store-Schutz | 0,10 | sofort |

Zur Kontrolle: Ein Modell schätzt etwa 20 % Umsatzverlust, wenn ein Spiel in der ersten Woche geknackt wird; hält der Schutz mindestens 12 Wochen, ist der Effekt vernachlässigbar \[R\]. Die Werte oben sind so gewählt, dass das Spiel diese Größenordnung trifft.

## 9 Abweichungen zu den Specs

| Punkt | Spec bisher | Datenblatt | Entscheidung |
| --- | --- | --- | --- |
| Kosten pro Person 2020 / 2030 | 11.000 / 13.000 | 13.000 / 15.500 | Datenblatt gilt (A20) |
| Konsolen-Lebensdauer | 6–14 Jahre | Erfolg 8–15, Flop 2–4 | Datenblatt gilt (A19) |
| Händlermarge physisch | \~50 % | Händler 20–30 % + Plattform \~12 % + Herstellung | vereinfachter Wert \~50 % bleibt, Aufteilung für die Aufschlüsselung |
| Abo pro Arbeitsplatz | ab 2005 | real ab den 2000ern | passt |

## 10 Startwerte nach Prüfung 3

Diese Werte sind mit Prüfbericht 3 dazugekommen. Fast alle sind Schätzungen \[S\] und werden in Etappe 0 und in den Simulationsläufen geprüft. Maßgeblich ist jeweils die genannte Spec; dieses Blatt sammelt sie an einer Stelle.

| Wert | Startwert | Spec | Art |
| --- | --- | --- | --- |
| Kaufrate der Plattformbasis m | 0,3 je Monat (vorher 0,03) | S08, 5.2a | \[S\], nachgerechnet |
| Grundschwund d₁ | 3 % je Monat, +50 % ab Nachfolger | S08 | \[S\] |
| Flop-Schwelle | Basis unter 2 % der Marktgröße nach 24 Monaten | S08 | \[S\] |
| Trend-Zufallsbewegung | σ 0,03 je Monat, 5 % Rückkehr zum Mittel | S08 | \[S\] |
| Tagesform der Presse | σ 0 / 0,15 / 0,3 Wertungspunkte | S02, S10 | \[S\] |
| Zeitgeist | höchstens ±0,3 Wertungspunkte | S02 | \[S\] |
| Q\_erw 1980 bzw. erstes Jahr | klein 60, mittel 150, groß 400, AAA 900 (ab 1998) | S02 | \[S\] |
| Presse-Strenge | ±8 % auf Q\_erw je Stufe | S02, S10 | \[S\] |
| Early Access | ab 2013, Preis 60–80 %, Interessenzerfall ×2 | S05 | \[R\] Zeitpunkt, \[S\] Werte |
| Abo-Deal | ab 2017, Festbetrag = erwartete Verkäufe × 30 % × Preis, verdrängt 40 % | S05 | \[S\] |
| Lizenzspiel einer Marke | Umsatzanteil 5–20 % plus Pauschale nach Epoche | S04, LIZ-M | \[R\] Spanne, \[S\] Pauschale |
| Anlegerstimmung | Start 60, Zielmarke Vorjahresquartal +5 %, Rückkehr 10 % zur Mitte | S07 | \[S\] |
| Dividende | niedrig 20 %, hoch 50 % des Jahresgewinns | S07 | \[S\] |
| Gewinnsteuer | 20–35 % je Region, quartalsweise | S07 | \[R\] Spanne |
| Abführung der Töchter | 70 % des Gewinns | S07, S09 | \[S\] |
| Abwerben durch den Spieler | Gehalt +20–40 % | S07 | \[S\] |
| Crunch | −3 Moral je Woche, Monate über alle Projekte summiert | S07 | \[S\] |
| Einarbeitung gekaufte Engine | −30 % Tempo, läuft über 8–16 Wochen aus | S03, S09 | \[S\] |
| Versatz Firmenbewertung | ±25 % vor der Prüfung | S09 | \[S\] |
| QA-Fundrate | 15 % der offenen Bugs je Woche, Testlabor +30 % | S02 | \[S\] |
| Cloud-Kapazität | ab 2010, +50 % Kosten je Woche gegenüber Miete | S06 | \[S\] |
| Piraterie Mobile | 0,10 | S05 | \[S\] |
| Interesse und Marketing (b, M½, c\_I, c\_M) | Startwerte in S05, Tabelle MKT-F1/F2 | S05 | \[S\] |

## Quellen

- [Liste meistverkaufter Konsolen (Wikipedia)](https://en.wikipedia.org/wiki/List_of_best-selling_game_consoles)
- [Konsolenpreise inflationsbereinigt (Daglow)](https://daglowslaws.com/the-secret-history-of-video-game-console-prices-adjusted-for-inflation-updated-2024/)
- [Marktanteile PC-Hersteller 1980er (Wikipedia)](https://en.wikipedia.org/wiki/Market_share_of_personal_computer_vendors)
- [Umsatz nach Plattform 1970–2022 (Visual Capitalist)](https://www.visualcapitalist.com/video-game-industry-revenues-by-platform)
- [Newzoo: Markt 2024](https://gameworldobserver.com/2025/06/26/newzoo-in-2024-the-global-video-game-market-generated-182-7-billion-which-is-below-projections)
- [Markt 2025 über 200 Mrd. USD (PocketGamer.biz)](https://www.pocketgamer.biz/global-games-revenue-surpasses-200bn-for-the-first-time-mobile-generates-113bn/)
- [Crash 1983 (Wikipedia)](https://en.wikipedia.org/wiki/Video_game_crash_of_1983)
- [US-Markt 2009 (Game Developer)](https://www.gamedeveloper.com/pc/npd-u-s-game-market-declines-8-in-2009)
- [Entlassungen 2022–2026 (Wikipedia)](https://en.wikipedia.org/wiki/2022%E2%80%932026_video_game_industry_layoffs)
- [Teuerste Spiele (Wikipedia)](https://en.wikipedia.org/wiki/List_of_most_expensive_video_games_to_develop)
- [10.000 USD pro Kopf und Monat (Game Developer)](https://www.gamedeveloper.com/business/opinion-10-000-is-the-magic-number)
- [AAA-Budgets ab 300 Mio. USD (Game World Observer)](https://gameworldobserver.com/2026/03/26/report-budgets-for-aaa-games-in-the-us-and-canada-now-amount-to-at-least-300-million)
- [Gehälter 2010 (GameSpot)](https://www.gamespot.com/articles/us-game-devs-average-near-81000-in-2010-survey/1100-6310472/)
- [Aufteilung eines 60-USD-Spiels (Engadget)](https://www.engadget.com/2006/12/20/where-the-60-for-new-games-goes/)
- [Steam-Staffelung (Fortune)](https://fortune.com/2018/12/01/steam-valve-developer-revenue-agreement)
- [Digitalanteil PC 2013 (PC Gamer)](https://www.pcgamer.com/au/analyst-says-digital-sales-made-up-92-percent-of-pc-game-market-in-2013)
- [Unreal Engine 1 (Wikipedia)](https://en.wikipedia.org/wiki/Unreal_Engine_1)
- [Quake-III-Lizenz (GameSpot)](https://www.gamespot.com/articles/quake-iii-licensing-info/1100-2643889/)
- [UE4 kostenlos (Epic)](https://www.unrealengine.com/blog/ue4-is-free)
- [Unity Runtime Fee zurückgenommen (The Register)](https://www.theregister.com/2024/09/12/unity_cancel_runtime_fees/)
- [Kopierschutz der 80er (Vintage Computing)](https://www.vintagecomputing.com/index.php/archives/174/old-school-copy-protection-schemes)
- [Denuvo (Wikipedia)](https://en.wikipedia.org/wiki/Denuvo)
- [Xbox-360-Devkits (Game Developer)](https://www.gamedeveloper.com/game-platforms/next-gen-xbox-dev-kits-ship)
- [Launch-Titel im Vergleich (GameSpot)](https://gamespot.com/articles/how-do-ps5-and-xbox-series-xs-current-launch-lineups-compare-to-previous-generations/1100-6481256/)
