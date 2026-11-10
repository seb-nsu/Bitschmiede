# S05 Marketing, Release und Vertrieb

**Version:** 1.0, Stand 29.10.2026 · **Quelle:** Design-Dokument, Kapitel Marketing und Release, Der Release, Markt (Vertrieb, Piraterie und Kopierschutz), Messen, Merchandising, Lokalisierung · **Prefix:** MKT

## 1 Zweck und Abgrenzung

Diese Spezifikation regelt alles zwischen „Spiel ist fertig genug, um darüber zu reden“ und „Geld kommt an“: Interesse, Marketing, Release-Entscheidungen, Verkaufskurve, Preis über die Lebenszeit, Vertrieb (physisch und digital), Piraterie und Kopierschutz, Messen, Merchandising, Lokalisierung und Altersfreigaben.

Nicht Teil dieser Spezifikation: Qualität und Wertung (S02), Betrieb nach dem Release (S06), Plattform-Basis und Konkurrenzkalender als Marktmodell (S08), Darstellung der Bildschirme (S11).

## 2 Begriffe

| Begriff | Bedeutung |
| --- | --- |
| Interesse | Genau ein Wert pro Projekt: vorgemerkte Interessenten (Vorbestellungen, Hype, Wishlists je Epoche) |
| Marketing-Autopilot | Verteilt ein Budget automatisch auf die Kanäle der Epoche |
| Release-Paket | Bündel aller Release-Entscheidungen auf einem Bildschirm |
| Konkurrenzdichte | Summe der angekündigten Releases derselben Zielgruppe in einer Woche, gewichtet nach Größe |
| Verkaufskurve | Verkäufe pro Woche nach dem Release |
| Rabattwoche | Feste Store-Aktion im Kalender (ab etwa 2005) |
| Gewöhnung | Fans warten auf Rabatte, wenn eine Marke zu oft rabattiert |
| Auflage | Physisch produzierte Stückzahl (bis etwa 2010) |
| Piraterie-Rate | Anteil möglicher Käufer, die kopieren statt kaufen |
| Messe-Saison | Einmal jährlich festgelegt: welches Projekt wie gezeigt wird |

## 3 Daten

| Entität / Feld | Typ | Einheit / Bereich | Bedeutung |
| --- | --- | --- | --- |
| **Project.marketing** |  |  |  |
| interest | int | Personen | Vorgemerkte Interessenten |
| interestPeak | int | Personen | Höchstwert (für Enttäuschung) |
| budgetPct | int | 0–1500 (Promille des Entwicklungsbudgets, Standard 300) | Marketing-Budget |
| channelSplit | Map | Kanal → % | Nur bei manueller Steuerung |
| announced | Datum oder leer | Woche | Ankündigung |
| creatorAccess | bool | – | Früher Zugang für Creator (ab 2010) |
| demo | Enum | keine, vorab, zum\_release | Demo |
| **ReleasePackage** |  |  |  |
| date | Woche | – | Release-Termin |
| price | int (Cent) | – | Vollpreis |
| platforms | Liste | Lead + weitere | Zielplattformen |
| printRun | int | Stück | Physische Auflage (bis \~2010) |
| editions | Liste | standard, deluxe, sammler | Editionen mit Preis und Stückzahl |
| dayOnePatch | int | Wochen Teamzeit | Zwischen Gold und Release |
| copyProtection | Enum | keiner, abfrage, datentraeger, aktivierung, online\_pflicht, store | Kopierschutz |
| preorders | bool | – | Vorbestellungen geöffnet |
| **Product.sales** |  |  |  |
| weeklySales | Liste | Stück pro Woche | Verlauf |
| currentPrice | int (Cent) | – | Aktueller Preis |
| priceEvents | Liste PriceEvent | – | Rabatte, Bundles |
| piracyRate | int | Promille | Aktuelle Piraterie-Rate |
| protectionStrength | int | 0–1000 | Aktuelle Schutzwirkung |
| stock, warehouseCost | int | Stück, Cent | Lager bei physischer Auflage |
| refunds | int | Stück | Rückerstattungen |
| regions | Liste | Regionenpakete | Lokalisierte Regionen |
| ageRatings | Map | Region → Freigabe | Altersfreigaben |
| **PriceEvent** |  |  |  |
| productId, week | ID, Woche | – | Produkt und Zeitpunkt |
| kind | Enum | rabatt, bundle, budget, abo\_deal | Art |
| discountPct | int | 0–90 | Rabatt |
| **Brand.discountHabit** | int | 0–1000 | Gewöhnung der Fans an Rabatte |
| **TradeShowPlan** (pro Jahr) | Map | Projekt → nichts, trailer, demo | Messe-Saison |
| **Merch** (pro Marke) | Enum | eigen, lizenz | Fanshop oder Lizenz an Partner |

## 4 Regeln

**Interesse und Marketing**

- **MKT-R01** \[1.0\] Jedes Projekt hat genau einen Interesse-Wert; Hype, Vorbestellungen und Wishlists sind nur Darstellungen dieses Werts je Epoche.
- **MKT-R02** \[1.0\] Interesse wächst wöchentlich proportional zum vorhandenen Interesse und zu den Marketing-Ausgaben und zerfällt ohne Maßnahmen langsam (Formel MKT-F1).
- **MKT-R03** \[1.0\] Vor der Ankündigung wächst Interesse nur durch Marke und Ruf, nicht durch Marketing.
- **MKT-R04** \[1.0\] Standardmäßig legt der Spieler nur einen Prozentsatz des Entwicklungsbudgets fest; der Autopilot verteilt ihn auf die Kanäle der Epoche. Manuelle Kanalsteuerung ist optional.
- **MKT-R05** \[1.0\] Ist das Interesse zum Release höher, als die Wertung rechtfertigt (Erwartungslücke über Schwelle), fällt die Spielerwertung unter die Pressewertung und die Marke verliert Stärke (Enttäuschung).
- **MKT-R06** \[1.0\] Die fünf Marketing-Entscheidungen sind: Zeitpunkt der Ankündigung, Auftritt auf der Messe, Demo, früher Zugang für Creator (ab 2010), Vorbestellungen und Preis (digital ab 2000).
- **MKT-R07** \[1.0\] Eine Demo zeigt die aktuelle Prognose: über dem Genre-Schnitt steigt Interesse, darunter sinkt es.
- **MKT-R08** \[1.0\] Creator-Zugang verdoppelt den Interesse-Zuwachs der Woche, macht aber die drei größten Schwächen öffentlich (Interesse −, wenn eine Schwäche schwer ist).

**Release**

- **MKT-R09** \[1.0\] Alle Release-Entscheidungen liegen in einem Release-Paket mit neun Punkten: Termin, Preis, Plattformen, Auflage, Editionen, Demo, Day-One-Patch, Kopierschutz, Serverkapazität (nur Online-Spiele, S06 und A30). Jeder Punkt ist vom Autopiloten oder Produzenten vorbelegt; der Spieler bestätigt einmal.
- **MKT-R10** \[1.0\] Jede Woche hat eine Konkurrenzdichte aus allen angekündigten Releases derselben Zielgruppe; der Start-Absatz sinkt mit der Dichte (Formel MKT-F2).
- **MKT-R11** \[1.0\] Saison-Effekt: Das Weihnachtsquartal hat Markt-Faktor 1,6 und höhere Konkurrenz, das Sommerloch 0,8.
- **MKT-R12** \[1.0\] Verschieben nach der Ankündigung kostet 10 % Interesse pro Verschiebung (nach Vorbestellungen 20 %) und senkt die Bugs entsprechend der zusätzlichen Zeit.
- **MKT-R13** \[1.0\] Konsolen-Releases brauchen eine bestandene Zertifizierung (S02). Sie dauert 4 Wochen ab Gold. Scheitert sie, verschiebt sich der Termin um weitere 4 Wochen.
- **MKT-R14** \[1.0\] KI-Studios kündigen Termine an und weichen großen Releases aus oder legen gezielt dagegen (Rivalen, S08).

**Verkauf und Preis**

- **MKT-R15** \[1.0\] Die Verkäufe pro Woche folgen der Verkaufskurve MKT-F3: Start durch Interesse und Marktgröße, Abfall durch Wertung.
- **MKT-R16** \[1.0\] Spiele verkaufen sich anteilig zur aktiven Basis jeder Plattform (S08).
- **MKT-R17** \[1.0\] Nach dem Release schlägt das Spiel eine Preiskurve vor; der Spieler kann den Preis jederzeit senken. Erhöhen ist nicht möglich.
- **MKT-R18** \[1.0\] Ab etwa 2005 gibt es feste Rabattwochen der Stores (4 pro Jahr) als Kalenderereignisse; ein Rabatt erzeugt einen kurzfristigen Absatzsprung (MKT-F4).
- **MKT-R19** \[1.0\] Jeder Rabatt erhöht die Gewöhnung der Marke; hohe Gewöhnung senkt die Vollpreis-Käufe künftiger Spiele derselben Marke. Gewöhnung baut sich langsam ab.
- **MKT-R20** \[1.0\] Bundles, Budget-Neuauflagen und Abo-Deals sind PriceEvents bzw. Produkttypen (S02) mit eigenem Verkaufsimpuls. Abo-Deals regeln MKT-R51 bis MKT-R54.
- **MKT-R21** \[1.0\] Preisaktionen lassen sich per Regel delegieren („Nach 12 Monaten 30 % Rabatt in jeder Store-Aktion“).

**Early Access**

- **MKT-R47** \[1.0\] Ab etwa 2013 kann ein PC-Spiel ab Beta in den Early Access gehen. Es verkauft dann zu 60–80 % des geplanten Preises (Standard 70 %).
- **MKT-R48** \[1.0\] Während des Early Access zerfällt das Interesse doppelt so schnell (2 · δ). Verkäufe verbrauchen die Restnachfrage der Stufe „voll“ (MKT-V16).
- **MKT-R49** \[1.0\] Die Zufriedenheit der Early-Access-Käufer hängt am Patch-Takt: ein Update alle 4 Wochen oder öfter hebt sie, eine Pause über 8 Wochen senkt sie (Startwerte). Bugs zählen nur halb, solange das Spiel im Early Access ist.
- **MKT-R50** \[1.0\] Der Release von 1.0 ist ein zweiter Release-Abend mit neuer Wertung, eigenem Release-Bericht und neuem Startabsatz nach MKT-F2. Ab dann gilt der volle Preis. Liegt die neue Wertung unter der Early-Access-Wertung, sinkt die Markenstärke wie bei einer Enttäuschung (MKT-R05).

**Abo-Deal**

- **MKT-R51** \[1.0\] Ab 2017 bieten Abo-Dienste Deals an: für ein neues Spiel zum Release oder für einen Katalogtitel. Das Angebot erscheint als Fokus-Karte oder wird per Regel angenommen.
- **MKT-R52** \[1.0\] Der Festbetrag ist erwartete Verkäufe × 30 % × Preis. Er fließt beim Start des Deals.
- **MKT-R53** \[1.0\] Während des Deals (12 Monate) entfallen 40 % der Vollpreis-Verkäufe.
- **MKT-R54** \[1.0\] Der Deal hebt die Bekanntheit: Die Marke gewinnt Fans in Höhe von 5 % der erwarteten Verkäufe. Das macht Abo-Deals für junge Marken und für den Vorlauf einer Fortsetzung reizvoll.

**Vertrieb**

- **MKT-R22** \[1.0\] Bis etwa 2010 legt der Spieler beim Release die physische Auflage fest; eine Empfehlung aus Vorbestellungen und Interesse ist vorbelegt.
- **MKT-R23** \[1.0\] Zu kleine Auflage: Verkäufe über dem Bestand gehen verloren, Nachproduktion dauert so lange wie der Vorlauf des Datenträgers (MKT-V01; Abschnitt 13 ist maßgeblich). Zu große Auflage: Lagerkosten pro Monat und später Ramschpreise.
- **MKT-R24** \[1.0\] Der Digitalanteil steigt über die Epochen (Datenblatt); ab etwa 2015 entfällt die Auflage für die meisten Spiele.
- **MKT-R25** \[1.0\] Physisch behält der Handel \~50 % des Preises, digital der Store 30 % (20 % ab einer Umsatzschwelle pro Spiel); Plattformgebühren für Konsolen kommen hinzu (S08).
- **MKT-R26** \[1.0\] Rückerstattungen (digital ab 2010) steigen bei kurzen oder fehlerhaften Spielen und senken den Erlös.
- **MKT-R27** \[1.0\] Editionen: Deluxe erhöht den Durchschnittspreis, die Sammler-Edition ist eine eigene kleine Auflage mit hohem Preis, Lager- und Produktionsrisiko.

**Piraterie und Kopierschutz**

- **MKT-R28** \[1.0\] Die Piraterie-Rate eines Produkts ergibt sich aus Grundrate der Epoche, Plattformfaktor und Schutzwirkung (MKT-F5); Kopien sind verlorene Verkäufe.
- **MKT-R29** \[1.0\] Verfügbare Schutzstufen hängen von der Epoche ab: Abfrage (1980er), Datenträger (1990er), Aktivierung (ab 2000), Online-Pflicht (ab 2010), Store-Schutz (ab 2005), starke Middleware (ab 2014). Wirkung und Haltbarkeit stehen im Datenblatt §8.
- **MKT-R30** \[1.0\] Jede Stufe hält bis zum Knacken. Die Haltbarkeit H in Wochen zieht der Seed aus der Spanne des Datenblatts. Danach wirkt die Stufe nicht mehr; nur der Store-Schutz wirkt dauerhaft mit 0,10 (Bequemlichkeit).
- **MKT-R31** \[1.0\] Starke Stufen kosten Zufriedenheit (S06), ggf. Lizenzgebühr (Middleware) und bei Online-Pflicht Leistungsbudget (S02); Online-Pflicht kann das Ereignis „DRM-Protest“ auslösen.
- **MKT-R32** \[1.0\] Ein Patch kann den Schutz entfernen; die Zufriedenheit erholt sich um 50 % des Verlusts.
- **MKT-R33** \[1.0\] Kopien erhöhen die Bekanntheit der Marke leicht.
- **MKT-R34** \[1.0\] Online-Spiele, F2P und Live-Service haben fast keine Piraterie.

* **MKT-R55** \[1.0\] Wird ein Schutz geknackt (Woche H + 1), erscheint im Ticker „Geknackt: \[Titel\] nach \[H\] Wochen“. Hielt der Schutz 12 Wochen oder länger, lautet die Meldung „\[Titel\] trotzt den Crackern“ und gibt Studio-Ruf +1 bei Technik-Fans.
* **MKT-R56** \[1.0\] Nach dem Knacken schlägt der Produzent einmal vor, den Schutz per Patch zu entfernen. Tut der Spieler das, läuft ein kleiner Community-Moment: Forum-Meldung „Danke, \[Studio\]!“, Zufriedenheit +50 % des Schutzverlusts (MKT-R32), Studio-Ruf +1. Der Moment kommt höchstens einmal je Titel.

**Messen**

- **MKT-R35** \[1.0\] Einmal im Jahr legt der Spieler die Messe-Saison fest: pro Projekt nichts, Trailer oder spielbare Demo. Das Marketing verteilt die Wahl automatisch auf die Veranstaltungen des Jahres.
- **MKT-R36** \[1.0\] In 1.0 gibt es zwei Veranstaltungstypen: die große Branchenmesse (bis Mitte der 1990er als Handelsmesse, die Regalplätze und Vorbestellungen beeinflusst) und die Entwicklerkonferenz (Bewerber, Lizenzanfragen, Ruf).
- **MKT-R37** \[1.0\] Eine Demo auf der Messe wirkt stärker als ein Trailer, schadet aber, wenn die Prognose unter dem Genre-Schnitt liegt.
- **MKT-R38** \[1.0\] Ankündigungen auf Messen wirken 1,5-mal stärker als außerhalb.
- **MKT-R39** \[1.0\] Auf der Branchenmesse werden die Jahrespreise vergeben (S10); Preise erhöhen Verkäufe und Ruf.
- **MKT-R40** \[später\] Publikumsmesse, Demo-Festival, digitaler Showcase und Standgrößen als eigene Entscheidungen.

**Merchandising, Lokalisierung, Freigaben**

- **MKT-R41** \[1.0\] Merchandising ist ein automatischer monatlicher Ertrag jeder Marke, abhängig von Stärke und Welttiefe; pro Marke entscheidet der Spieler einmal: eigener Fanshop (höhere Marge, Risiko) oder Lizenz an Partner (sicherer Anteil).
- **MKT-R42** \[1.0\] Zu viel Merchandise bei schwacher Marke senkt deren Stärke.
- **MKT-R43** \[1.0\] Soundtrack und Artbook sind kleine Zusatzprodukte; Sammler-Editionen siehe MKT-R27.
- **MKT-R44** \[1.0\] Lokalisierung erfolgt in Regionenpaketen (Nordamerika, Europa, Japan, China, Lateinamerika); jedes Paket kostet Zeit und Geld und öffnet einen Markt mit eigenen Genre-Vorlieben. Untertitel sind günstig, Vertonung teurer und wirksamer.
- **MKT-R45** \[1.0\] Altersfreigaben werden automatisch berechnet; nur wenn eine Freigabe die Zielgruppe stark einschränkt oder ein Land ablehnt, entscheidet der Spieler über eine Schnittfassung.
- **MKT-R46** \[später\] Fanshop-Lager, Einzelprodukte, Film und Serie als Mechanik (in 1.0 nur Ereignis).

## 5 Formeln und Startwerte

**MKT-F1 Interesse (wöchentlich):**

```latex
I_{t+1} = \min\Big(I_{\max},\ I_t \cdot (1 - \delta) + g \cdot I_t \cdot \frac{M_t}{M_t + M_{1/2}} + b \cdot M_t + \text{Marke} + \text{Ereignisse}\Big),\quad I_{\max} = \text{Marktgröße}_{\text{Zielgruppe}} \cdot \text{Reichweite}
```

I = Interesse in Personen. M = Marketing-Ausgaben der Woche in Cent. M₁/₂ = Ausgaben für halbe Wirkung. δ = Zerfall 2 % pro Woche. g = Mundpropaganda 3 % pro Woche, erst ab der Ankündigung (vorher g = 0). b = direkte Reichweite pro Dollar. Netto-Wachstum entsteht nur, wenn g · M/(M + M₁/₂) > δ, also bei M > 2 · M₁/₂. Interesse wächst nie über die erreichbare Zielgruppe I\_max. Startwerte in der Tabelle unten.

**MKT-F2 Start-Absatz:**

```latex
V_0 = \big(c_I \cdot I_{\text{Release}} + c_M \cdot \text{Marktgröße}_{\text{Zielgruppe}} \cdot Q_{\text{rel}}\big) \cdot \text{Trend}_{\text{Genre}} \cdot \text{Reichweite} \cdot \text{Saison} \cdot \frac{1}{1 + \kappa \cdot \text{Konkurrenzdichte}},\quad \text{Reichweite} = \min\Big(1,\ \frac{\sum \text{Basis}_{\text{Plattform}}}{\text{Marktgröße}_{\text{Zielgruppe}}}\Big)
```

Q\_rel = Wertungsprognose / 7, begrenzt auf 0,3–1,5. Der Genre-Trend (S08) steht jetzt hier als eigener Faktor und nicht mehr in Q. Die Summe läuft über die aktiven Basen der Release-Plattformen (S08).

**MKT-F3 Verkaufskurve (pro Woche t nach Release):**

```latex
V(t) = V_0 \cdot e^{-k\,t} + V_{\text{Katalog}},\quad k = k_0 \cdot \frac{7}{\max(\text{Wertung}, 3)}
```

V\_Katalog = dauerhafter Back-Catalog-Absatz ab etwa 2005 (S02).

Der Kern rechnet e^{−kt} über eine Tabelle in Basispunkten mit Abschneiden nach jedem Schritt (A22).

**MKT-F4 Rabattwoche:**

```latex
V_{\text{Rabatt}} = V(t) \cdot \big(1 + r_1 \cdot \text{Rabatt}\big) \cdot (1 - \text{Gewöhnung}_{\text{Marke}} \cdot r_2)
```

**MKT-F5 Piraterie:**

```latex
\text{Piraterie}_t = p_{\text{Epoche, Plattform}} \cdot (1 - S_t),\quad S_t = \begin{cases} S_0 & t \le H \\ S_{\text{Rest}} & t > H \end{cases}
```

p, S₀ und die Spanne für H stammen aus dem Datenblatt §8. S\_Rest ist 0,10 für Store-Schutz und 0 für alle anderen Stufen. In Woche H + 1 erscheint die Tickermeldung „Geknackt“ (MKT-R55).

**Netto-Erlös pro Verkauf:**

```latex
\text{Netto} = \text{Preis} \cdot (1 - \text{Anteil}_{\text{Handel/Store}}) - \text{Plattformgebühr} - \text{Stückkosten}_{\text{physisch}}
```

| Parameter | Startwert | Bereich | Datei |
| --- | --- | --- | --- |
| Vollpreis nach Epoche | 1980: 30, 1990: 50, 2000: 50, 2010: 60, 2020: 70, 2030: 80 USD; Indie 10–25 | – | data/prices.json |
| Marketing-Budget Standard | 30 % des Entwicklungsbudgets (AAA 50–100 %) | 0–150 % | data/marketing.json |
| δ Zerfall Interesse | 2 % pro Woche | 0–10 % | data/marketing.json |
| g Mundpropaganda | 3 % pro Woche ab der Ankündigung (vorher 0) | 0–5 % | data/marketing.json |
| Enttäuschungsschwelle | Interesse über 1,5 × dem zur Wertung passenden Wert | 1,2–2,5 | data/marketing.json |
| Enttäuschungsfolge | Spielerwertung −0,5 bis −2, Markenstärke −5 bis −15 | – | data/marketing.json |
| κ Konkurrenzdichte | 0,5 | 0–1,5 | data/release.json |
| Saison | Q4 × 1,6; Sommer × 0,8; sonst 1,0 | – | data/release.json |
| Verschiebung | −10 % Interesse (−20 % nach Vorbestellungen) | – | data/release.json |
| k₀ Abfall der Verkaufskurve | 0,12 pro Woche bei Wertung 7 | 0,05–0,3 | data/sales.json |
| Rabattwochen | 4 pro Jahr ab 2005 | 0–8 | data/sales.json |
| r₁, r₂ | 3,0; 0,5 | – | data/sales.json |
| Gewöhnung | +50 pro Rabatt über 30 %, −10 pro Monat | 0–1000 | data/sales.json |
| Handelsanteil physisch | 50 % (bis 2010) | 40–60 % | data/distribution.json |
| Store-Anteil digital | 30 %, 20 % ab 10 Mio. USD Umsatz pro Spiel | 12–30 % | data/distribution.json |
| Rückerstattung | 2 % Grund, +5 % bei Spielzeit < 5 h, +5 % bei vielen Bugs | – | data/distribution.json |
| Bekanntheit durch Kopien | +1 % der Kopien als Fans der Marke | 0–5 % | data/piracy.json |
| Messe-Wirkung | Trailer +15 % Interesse, Demo +30 % (−20 % bei Prognose unter Genre-Schnitt) | – | data/tradeshows.json |
| Merch-Ertrag | Stärke × Welttiefe × Fans × 0,02 USD pro Monat; eigen 2 × Marge mit Risiko ±30 %, Lizenz 1 × sicher | – | data/merch.json |
| Lokalisierung | Untertitel 3 % des Budgets pro Region, Vertonung 8 % | – | data/localization.json |
| Marktanteil der Regionen | Nordamerika 40 %, Europa 30 %, Japan 20 %, Rest 10 % (1990); verschiebt sich nach Datenblatt | – | data/regions.json |
| b direkte Reichweite | 25 Personen pro 100 USD (1990), mit dem Preisindex der Epoche skaliert | 5–100 | data/marketing.json |
| M₁/₂ halbe Wirkung | 1 % des Mittel-Budgets der Epoche pro Woche | 0,2–5 % | data/marketing.json |
| c\_I Anteil Interessierte in der Startwoche | 0,10 | 0,05–0,25 | data/sales.json |
| c\_M Spontankäufer | 0,0005 der Zielgruppe pro Startwoche bei Q\_rel = 1 | 0,0001–0,002 | data/sales.json |
| Q\_rel | Wertungsprognose / 7 | 0,3–1,5 | data/sales.json |
| Trend des Genres | aus S08 | 0,5–1,5 | data/market.json |
| Reichweite | Σ Basis der Release-Plattformen / Marktgröße, höchstens 1 | 0–1 | data/sales.json |
| Stückkosten, Lagerkosten, Nachproduktion | siehe Abschnitt 13.3 (maßgeblich) | – | data/media.json |
| p Grundrate (Datenblatt §8) | Heimcomputer 1980er 0,60; PC 1990er 0,50; PC 2000er 0,50; PC 2010er 0,20; PC ab 2020 0,10; Konsole 0,05 (Modchip-Jahre 1997–2002: 0,20); Handheld 0,10 (um 2008: 0,30); Mobile 0,10; Online, F2P, Live 0,01 | – | data/piracy.json |
| S₀ / Haltbarkeit H je Stufe (Datenblatt §8) | keiner 0; Handbuch- oder Codeabfrage 0,20 / 1–4 Wo.; Datenträger 0,30 / 1–2; Aktivierung 0,60 / 1–4; Online-Pflicht 0,80 / 4–12; starke Middleware 0,80 / 4 (ab 2019: 1); Store-Schutz 0,10 / dauerhaft | – | data/piracy.json |
| Zufriedenheit je Stufe | keiner 0; Abfrage −1; Datenträger −3; Aktivierung −5; Online-Pflicht −12; Middleware −4; Store 0 | – | data/piracy.json |
| Early Access | ab 2013; Preis 60–80 % (Standard 70 %); Zerfall δ × 2; Patch alle ≤ 4 Wochen +2 Zufriedenheit pro Monat, Pause > 8 Wochen −3 | – | data/release.json |
| Abo-Deal | ab 2017; Festbetrag = erwartete Verkäufe × 30 % × Preis; verdrängt 40 % der Vollpreis-Verkäufe; Laufzeit 12 Monate; Fans der Marke + 5 % der erwarteten Verkäufe | Festbetrag 20–40 %, Verdrängung 20–60 % | data/release.json |
| Community-Moment Schutz entfernt | Zufriedenheit +50 % des Schutzverlusts, Studio-Ruf +1, Meldung „Danke“ | – | data/piracy.json |

## 6 Entscheidungen des Spielers

| Entscheidung | Wann | Optionen | Standard / Delegation |
| --- | --- | --- | --- |
| Marketing-Budget | Projektstart, jederzeit | Prozent des Budgets | 30 %, Produzent |
| Ankündigung | ab Pre-Production | jetzt, später | Autopilot: 12 Monate vor Termin (AAA 24) |
| Messe-Saison | einmal im Jahr | pro Projekt nichts, Trailer, Demo | Vorschlag nach Prognose |
| Demo | ab Beta | vorab, zum Release, keine | Vorschlag nach Prognose |
| Creator-Zugang | ab 2010, 4 Wochen vor Release | ja, nein | nein |
| Release-Paket | bei Gold oder Termin | neun Punkte | vorbelegt, eine Bestätigung |
| Verschieben | jederzeit nach Ankündigung | neuer Termin | Produzent schlägt vor |
| Preis senken / Rabatt | nach Release, Rabattwochen | Prozent | Regel möglich |
| Kopierschutz entfernen | nach Release | Patch ja/nein | Regel: „Nach 6 Monaten entfernen“ |
| Merchandising | einmal pro Marke | eigen, Lizenz | Lizenz |
| Regionenpakete | Projektstart oder Port | Regionen, Untertitel/Vertonung | Vorschlag nach Genre-Vorlieben |
| Schnittfassung | bei Ablehnung | ja, nein | – |

## 7 KI-Verhalten

- KI-Studios setzen Marketing nach Persönlichkeit (Indie 10–20 %, AAA 60–100 %) und kündigen Termine an.
- KI wählt Release-Wochen mit geringer Konkurrenzdichte; Rivalen legen gezielt auf die Woche des Spielers, wenn ihr Titel stärker prognostiziert ist (S08).
- KI senkt Preise nach Faustregel (nach 6 Monaten −20 %, nach 12 Monaten −40 %) und nimmt an Rabattwochen mit Wahrscheinlichkeit 50 % teil.
- KI wählt Kopierschutz nach Epoche: die stärkste verfügbare Stufe bei AAA-PC-Spielen, sonst Store-Schutz; Online-Pflicht nur bei aggressiver Persönlichkeit.
- KI-Auflage = 80 % der Empfehlung (vorsichtig).
- KI zeigt auf Messen ihre zwei stärksten Projekte.

## 8 Oberfläche

- **Erleben:** Interesse als Kurve mit Epochen-Hülle (Vorbestellungen, Magazin-Hype, Wishlists). Release-Bildschirm mit neun Feldern: Termin als Pin auf dem Zeitstrom mit Konkurrenzdichte-Spur, Preis als Balken „unser Preis gegen Erwartung“, Plattform-Chips mit Zertifizierungsstatus, Auflage als Kisten-Stapel mit Empfehlung, Editionen als Karten, Serverkapazität als Rack-Balken mit der erwarteten Startspitze. Nach dem Release zeichnet sich die Verkaufskurve vor dem Prognoseband. Messe-Saison als Jahreskarte mit Projekt-Slots.
- **Analysieren:** Tabellen für Verkäufe pro Woche, Region und Plattform, Preis-Historie, Piraterie-Rate, Lager.
- Ursachen-Link: Ein Umsatzeinbruch führt per Wasserfall zur Ursache (Konkurrenztitel, Plattform-Niedergang, Wertung, Rabatt-Gewöhnung).

## 9 Ereignisse und Meldungen

| Ereignis | Klasse | Inhalt |
| --- | --- | --- |
| Release-Bericht | Ergebnis | Wertungen, erste Verkäufe, Vergleich mit Prognose |
| Konkurrent legt Release auf deine Woche | Entscheidung | verschieben, halten, Marketing erhöhen |
| Auflage ausverkauft | Entscheidung | nachproduzieren ja/nein |
| Rabattwoche steht an | Information (Entscheidung, wenn keine Regel) | teilnehmen, Rabatthöhe |
| DRM-Protest | Entscheidung (Kette) | Schutz entfernen, verteidigen, abschwächen |
| Kopierschutz geknackt | Information | Tickermeldung „Geknackt“, Piraterie steigt, Vorschlag „Schutz per Patch entfernen“ (MKT-R55, MKT-R56) |
| Messe-Saison | Entscheidung (jährlich) | Projekte und Auftrittsart |
| Branchenpreis gewonnen | Ergebnis | Preis, Wirkung |
| Freigabe abgelehnt | Entscheidung | Schnittfassung ja/nein |
| Verfilmungsangebot | Entscheidung (Kette, S08) | annehmen, ablehnen, Mitsprache |
| Early Access endet (1.0) | Ergebnis | zweiter Release-Abend, neue Wertung, Vergleich mit Early-Access-Wertung |
| Abo-Angebot | Entscheidung (Regel möglich) | Festbetrag, verdrängte Verkäufe, neue Fans; annehmen oder ablehnen |
| Danke, Studio! | Ergebnis | Schutz per Patch entfernt; Zufriedenheit und Ruf steigen |

## 10 Schnittstellen

| System | Richtung | Inhalt |
| --- | --- | --- |
| S01 Kern | ← | Markt-Schritt im Tick: Interesse, Konkurrenzdichte, Verkäufe, Piraterie |
| S02 Produkte | ← | Wertung, Prognose, Bugs, Editionen, Back-Catalog, Zertifizierung |
| S03 Engines | ← | Kopierschutz als Feature-Stufe oder Middleware |
| S04 Lizenzen | → | Netto-Umsatz für Royalties |
| S06 Betrieb | → | Zufriedenheit durch Kopierschutz, Rückerstattungen, Kundenservice-Anfragen aus Verkäufen |
| S07 Firma | → | Einnahmen, Lager- und Marketingkosten, Publisher-Anteile |
| S08 Markt | ↔ | Plattform-Basis, Marktgröße, Konkurrenzkalender, Rivalen-Termine |
| S10 Ziele | → | Branchenpreise, Ruhmeshalle |
| S11 Oberfläche | → | Release-Bildschirm, Zeitstrom, Messe-Karte |

## 11 Abnahmetests

- **MKT-T01** Gegeben zwei gleiche Spiele, eines mit Release neben einem großen KI-Titel, dann verkauft dieses in den ersten 4 Wochen sichtbar weniger (mindestens 25 %).
- **MKT-T02** Gegeben Interesse doppelt so hoch wie zur Wertung passend, dann liegt die Spielerwertung unter der Pressewertung und die Markenstärke sinkt.
- **MKT-T03** Gegeben ein Spiel ohne Marketing nach der Ankündigung, dann sinkt das Interesse über 26 Wochen um mindestens 30 %.
- **MKT-T04** Gegeben eine Auflage von 50 % der Nachfrage, dann gehen Verkäufe verloren, bis die Nachproduktion nach dem Vorlauf des Datenträgers eintrifft (CD: 3 Wochen).
- **MKT-T05** Gegeben ein PC-Spiel 2005 mit Aktivierung, dann ist die Piraterie-Rate in Woche 1 deutlich niedriger als in Woche 12.
- **MKT-T06** Gegeben eine Marke, die bei jedem Titel jede Rabattwoche nutzt, dann verkauft ihr nächster Titel zum Vollpreis weniger als ein vergleichbarer Titel einer Marke ohne Rabatte.
- **MKT-T07** Gegeben ein Release-Paket ohne Änderung, dann ist jeder der neun Punkte vorbelegt und eine Bestätigung genügt.
- **MKT-T08** Gegeben ein Online-Spiel, dann ist die Piraterie-Rate höchstens 1 %.
- **MKT-T09** Gegeben das Jahr 2016, dann gibt es für ein rein digitales Spiel keine Auflagen-Entscheidung.
- **MKT-T10** Gegeben eine Messe-Demo mit Prognose unter Genre-Schnitt, dann sinkt das Interesse.

* **MKT-T11** Gegeben eine Zielgruppe von 2 Mio. Personen bei Reichweite 0,5 und sehr hohes Marketing über 104 Wochen, dann übersteigt das Interesse nie 1 Mio.
* **MKT-T12** Gegeben ein Projekt vor der Ankündigung mit Marketing-Ausgaben, dann ist g = 0 und Interesse wächst nur durch Marke und Ruf.
* **MKT-T13** Gegeben zwei gleiche Spiele, eines auf Plattformen mit 25 % Reichweite und eines mit voller Reichweite, dann beträgt der Startabsatz des ersten höchstens 25 % des zweiten.
* **MKT-T14** Gegeben Gold in Woche 10 für eine Konsole, dann ist der Release frühestens in Woche 14; scheitert die Zertifizierung, frühestens in Woche 18.
* **MKT-T15** Gegeben ein Spiel im Early Access zu 70 % des Preises, wenn 1.0 erscheint, dann gibt es einen zweiten Release-Bericht mit neuer Wertung und ab dann den vollen Preis.
* **MKT-T16** Gegeben ein Abo-Deal mit 100.000 erwarteten Verkäufen und Preis 6.000 Cent, dann beträgt der Festbetrag 180.000.000 Cent, und die Vollpreis-Verkäufe sinken im Deal-Jahr um 40 %.
* **MKT-T17** Gegeben ein PC-Spiel 1995 mit Datenträger-Schutz und H = 2, dann ist die Piraterie-Rate in Woche 1 und 2 genau 0,35, ab Woche 3 genau 0,50, und in Woche 3 erscheint die Meldung „Geknackt“.
* **MKT-T18** Gegeben budgetPct = 1500, dann wird der Wert angenommen; 1501 wird auf 1500 begrenzt.

## 12 Spätere Versionen

- **1.1:** Publikumsmesse und Demo-Festival als eigene Veranstaltungen; Marken-Lizenzen für Merchandising im Detail.
- **Später (S13):** digitaler Showcase mit eigener Show, Standgrößen, Fanshop-Lager und Einzelprodukte, Film und Serie als Mechanik, eigener digitaler Store des Spielers.

## 13 Ergänzung: Vertrieb, Produktion und Verwertung

**Version:** 1.0, Stand 29.10.2026 · **Quelle:** Design-Dokument, Kapitel „Vertrieb und Produktion“ · **Prefix:** MKT-V (Regeln), MKT-VT (Tests)

### 13.1 Daten

| Entität/Feld | Typ | Einheit/Bereich | Bedeutung |
| --- | --- | --- | --- |
| Medium.id | enum | kassette, diskette, modul, cd, dvd, bluray, karte | Datenträger |
| Medium.jahre | {von:int, bis:int} | Jahr | Verfügbarkeit |
| Medium.stueckkosten | int | Cent | inkl. Verpackung und Handbuch |
| Medium.vorlauf | int | Wochen | Fertigungsdauer |
| Medium.mindestCharge | int | Stück | kleinste Menge pro Auftrag |
| Fertigungsauftrag | {produkt, plattform, menge, faelligAb} | – | Charge in Fertigung |
| Lager | {produkt, menge, kostenProMonat} | – | Bestand beim Studio |
| Vertriebsweg.id | enum | eigen, distributor, handelsvertrieb, publisher, shareware, store, bundle, beilage, abo | Weg zum Kunden |
| Vertriebsweg.erloesanteil | int | Basispunkte | Anteil beim Studio |
| Vertriebsweg.reichweite | int | Basispunkte | Anteil des erreichbaren Markts |
| Produkt.restnachfrage | {voll:int, mittel:int, budget:int} | Personen | Restnachfrage je Preisstufe |
| Produkt.verwertungen | list\<id\<Product>> | – | Editionen, Neuauflagen, Sammlungen zu diesem Produkt |
| Produkt.regionen | list<{region, termin}> | Woche | Release je Region |

### 13.2 Regeln

**Produktion**

- **MKT-V01** \[1.0\] Physische Ware entsteht nur durch Fertigungsaufträge; ein Auftrag ist nach dem Vorlauf des Datenträgers verfügbar.
- **MKT-V02** \[1.0\] Jeder Auftrag hat mindestens die Mindestcharge des Datenträgers.
- **MKT-V03** \[1.0\] Auf Konsolen wird die Plattformgebühr pro gefertigtem Stück bei Auftragserteilung fällig; bei Modulen zusätzlich die volle Vorauszahlung der Stückkosten.
- **MKT-V04** \[1.0\] Nicht verkaufte Ware erzeugt monatliche Lagerkosten; über Distributor oder Handel gibt der Handel nach 3–6 Monaten einen Teil unverkaufter Ware zurück (Rückläufer).
- **MKT-V05** \[1.0\] Senkt der Spieler den Preis, solange Ware im Handel liegt, schuldet er dem Handel eine Gutschrift (Preisschutz) für den Bestand.
- **MKT-V06** \[1.0\] Beigaben (Handbuch, Karte, Extras) erhöhen die Stückkosten, die Fanbindung der Marke und wirken als Kopierschutz der Stufe „Handbuch- oder Codeabfrage“.

**Vertriebswege**

- **MKT-V07** \[1.0\] Jedes Release hat genau einen physischen Vertriebsweg (eigen, Distributor, eigener Handelsvertrieb oder Publisher) und optional digitale Wege nach Epoche.
- **MKT-V08** \[1.0\] Eigenvertrieb erreicht höchstens 15 % des Markts; Distributor und Handelsvertrieb erreichen 90 %.
- **MKT-V09** \[1.0\] Ein eigener Handelsvertrieb ist erst ab 30 Mitarbeitern möglich und braucht ein Vertriebsteam in der Marketing-Abteilung.
- **MKT-V10** \[1.0\] Shareware (1988–2000): Die erste Episode ist kostenlos und steigert das Interesse; 1–5 % der Spieler kaufen das volle Spiel.
- **MKT-V11** \[1.0\] Regalplatz: Bis 2010 verliert ein physischer Titel nach 8 Wochen Regalplatz, wenn seine Wochenverkäufe unter 20 % der Startwoche fallen; ab dann halbieren sich die physischen Verkäufe.
- **MKT-V12** \[1.0\] Hardware-Bundle: Ein Hersteller bietet ein Bundle an, wenn ein Spiel eine Wertung ab 8,5 hat und auf seiner Plattform erschienen ist; das Studio erhält einen Festbetrag pro Gerät, die Plattform einen Bonus auf die Attraktivität.
- **MKT-V13** \[1.0\] Heft-Beilage (1985–2005): nur für Titel ab 2 Jahren; Festbetrag, Bekanntheit der Marke steigt.
- **MKT-V14** \[1.0\] Regionen: Bis 2005 kann jede Region einen eigenen Termin haben; eine Region ohne Lokalisierung startet höchstens mit 30 % ihres Markts.

**Verwertung**

- **MKT-V15** \[1.0\] Editionen, Neuauflagen und Sammlungen sind Produkttyp-Datensätze (S02) mit eigenem Release und Bezug auf ihr Original.
- **MKT-V16** \[1.0\] Jedes Spiel hat eine Restnachfrage in drei Preisstufen. Verkäufe zum Vollpreis verbrauchen zuerst die Stufe „voll“; eine Neuauflage in einer niedrigeren Stufe erschließt deren Restnachfrage.
- **MKT-V17** \[1.0\] Game of the Year oder Complete Edition erfordert Wertung ab 8 oder einen Branchenpreis sowie mindestens zwei DLC, frühestens 9 Monate nach Release.
- **MKT-V18** \[1.0\] Erscheint eine Complete Edition früher als 12 Monate nach Release, sinkt die Vollpreis-Restnachfrage künftiger Spiele der Marke um 10 % (Gewöhnung ans Warten).
- **MKT-V19** \[1.0\] Budget-Reihe auf Konsolen erfordert die Mindestverkäufe des Herstellerprogramms; auf PC eine eigene Budget-Linie. Mehr als ein Drittel der eigenen Titel in Budget-Reihen senkt den Ruf.
- **MKT-V20** \[1.0\] Eine Spielesammlung bündelt die Restnachfrage aller enthaltenen Titel mit dem Faktor 0,6 und erhöht die Markenmüdigkeit wie ein halber neuer Titel.
- **MKT-V21** \[1.0\] Klassiker-Sammlungen auf neuen Plattformen sind ab 10 Jahren nach Release möglich und erhalten einen Nostalgie-Bonus auf die Restnachfrage.
- **MKT-V22** \[1.0\] Remake ist ein neues Projekt (S02), das Marke und Design-Dokument des Originals übernimmt und mit den Fans der Marke startet.
- **MKT-V23** \[1.0\] Lizenz an einen Budget-Publisher: Festbetrag plus 10 % Anteil; der Spieler verliert die Preishoheit für diesen Titel.
- **MKT-V24** \[1.0\] Verwertungen erscheinen als Vorschlag (Klasse Ergebnis), nie als Pflicht-Entscheidung, und sind per Regel delegierbar.

### 13.3 Formeln und Startwerte

```latex
V_{\text{Neuauflage}} = \sum_{s \le s_{\text{Preis}}} R_s \cdot i \cdot \text{Aufmerksamkeit},\quad R_{s} \leftarrow R_{s} - V_s
```

R\_s = Restnachfrage der Preisstufe s, i = Impulsfaktor der Verwertungsform, Aufmerksamkeit aus Marketing und Marke.

| Parameter | Startwert | Bereich | Datei |
| --- | --- | --- | --- |
| Stückkosten Kassette / Diskette / Modul / CD / DVD / Blu-ray / Karte | 150 / 200 / 1.800 / 150 / 120 / 300 / 750 Cent | ±50 % | data/media.json |
| Vorlauf Kassette / Diskette / Modul / CD / DVD / Blu-ray / Karte | 2 / 2 / 10 / 3 / 3 / 4 / 4 Wochen | 1–12 | data/media.json |
| Mindestcharge | 1.000 Stück (Modul 10.000) | – | data/media.json |
| Lagerkosten | 2 Cent pro Stück und Monat | 1–10 | data/media.json |
| Rückläuferanteil nach 4 Monaten | 30 % des Restbestands | 10–50 % | data/distribution.json |
| Erlösanteil eigen / Distributor / Handelsvertrieb / Shareware / Store | 75 / 40 / 50 / 80 / 70–88 % | – | data/distribution.json |
| Anteil der Restnachfrage voll / mittel / budget beim Release | 50 / 30 / 20 % | – | data/distribution.json |
| Impulsfaktor GOTY / Budget / Sammlung / Klassiker / Bundle | 0,6 / 0,5 / 0,4 / 0,3 / 1,0 | 0–1 | data/producttypes.json |
| Bundle-Festbetrag | 3 USD pro Gerät (1985), 8 USD (2010) | – | data/distribution.json |
| Shareware-Kaufquote | 3 % | 1–5 % | data/distribution.json |

### 13.4 Abnahmetests

- **MKT-VT01** Gegeben eine Modul-Auflage von 100.000 Stück, wenn der Auftrag erteilt wird, dann werden Plattformgebühr und Stückkosten sofort fällig, und die Ware ist nach 10 Wochen verfügbar.
- **MKT-VT02** Gegeben 20.000 unverkaufte Stück im Handel, wenn der Spieler den Preis um 10 USD senkt, dann entsteht eine Preisschutz-Gutschrift von 200.000 USD.
- **MKT-VT03** Gegeben ein Spiel mit Wertung 8,6 und zwei DLC nach 10 Monaten, dann erscheint der Vorschlag „Complete Edition“; vor 9 Monaten erscheint er nicht.
- **MKT-VT04** Gegeben eine Complete Edition 10 Monate nach Release, dann sinkt die Vollpreis-Restnachfrage des nächsten Titels der Marke um 10 %.
- **MKT-VT05** Gegeben eine Sammlung aus drei Titeln mit je 100.000 Restnachfrage, dann beträgt ihr Potenzial 180.000.
- **MKT-VT06** Gegeben ein physischer Titel, dessen Wochenverkäufe in Woche 8 unter 20 % der Startwoche liegen, dann halbieren sich ab Woche 9 seine physischen Verkäufe.
- **MKT-VT07** Gegeben ein Spiel mit Wertung 8,7 auf Plattform X, dann bietet der Hersteller von X ein Hardware-Bundle an, und die Attraktivität von X steigt bei Annahme.

### 13.5 Spätere Versionen

- &#91;später\] Fanshop-Lager für Merchandise mit eigener Fertigung (S13).
- &#91;später\] Eigener digitaler Store als Vertriebsweg (S13).

## Änderungen nach Prüfung 3

- MKT-F1: Mundpropaganda g = 3 % pro Woche erst ab der Ankündigung, Zerfall δ = 2 %, Deckel I\_max = Marktgröße × Reichweite. Fehlende Startwerte für b, M₁/₂, c\_I, c\_M und Q\_rel ergänzt.
- MKT-F2: neuer Faktor Reichweite = Σ Basis der Plattformen / Marktgröße. Der Genre-Trend steht jetzt hier statt in Q\_rel.
- MKT-F3 und MKT-F5: Exponentialterme über Tabellen (A22). Piraterie als Stufenfunktion bis zum Knacken; Werte aus Datenblatt §8 übernommen, alte Tabellenzeilen ersetzt.
- Release-Paket hat neun Punkte, neu ist Serverkapazität (A30, S06). Regel, Entscheidungstabelle, Oberfläche und Test angepasst.
- Abschnitt 13 ist maßgeblich für Stückkosten, Lagerkosten und Nachproduktion; die alten Zeilen in Abschnitt 5 sind entfernt, MKT-R23 und MKT-T04 verweisen auf den Vorlauf des Datenträgers.
- Zertifizierung dauert 4 Wochen, ein Fehlschlag kostet weitere 4 Wochen (MKT-R13).
- budgetPct reicht von 0 bis 1.500 Promille.
- Neue Regeln MKT-R47 bis MKT-R50 (Early Access) und MKT-R51 bis MKT-R54 (Abo-Deal).
- Neue Regeln MKT-R55 und MKT-R56: Tickermeldung „Geknackt“ und Community-Moment beim Entfernen des Schutzes.
- Neue Ereignisse und Tests MKT-T11 bis MKT-T18. MKT-T08 prüft jetzt „höchstens 1 %“.
