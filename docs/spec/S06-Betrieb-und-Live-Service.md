# S06 Betrieb und Live-Service

**Version:** 1.0, Stand 29.10.2026 · **Quelle:** Design-Dokument, Kapitel Support und Live-Betrieb, Kundenservice, Technik-Update per Patch · **Prefix:** BTR

## 1 Zweck und Abgrenzung

Mit dem Release beginnt der Betrieb: Bugs beheben, Patches liefern, Community halten, Server betreiben, Inhalte nachliefern, Kundenanfragen und Engine-Support beantworten. Diese Spezifikation regelt die Abteilung Betrieb, Community-Zufriedenheit, Live-Produkte (MMO, F2P, Live-Service), Kundenservice und Analytics.

Nicht Teil dieser Spezifikation: Produkttypen als Datensätze (S02), Technik-Update selbst (S03), Lizenzverträge (S04), Verkaufskurve (S05), Personal und Moral (S07).

## 2 Begriffe

| Begriff | Bedeutung |
| --- | --- |
| Abteilung Betrieb | Eine Abteilung mit vier Töpfen: Live-Ops, Kundenservice, Community, Engine-Support |
| Topf | Anteil der Betriebs-Kapazität, per Regler verteilt |
| Zufriedenheit | Community-Zufriedenheit eines Produkts, 0–100 |
| Spielerbasis | Aktive Spieler eines Live-Produkts |
| Churn | Monatlicher Anteil, der ein Live-Produkt verlässt |
| Content-Drop | Season, Erweiterung oder Event für ein Live-Produkt |
| Analytics-Stufe | keine, grundlegend, intensiv |

## 3 Daten

| Entität / Feld | Typ | Einheit / Bereich | Bedeutung |
| --- | --- | --- | --- |
| **Operations** (pro Firma) |  |  |  |
| size | int | Personen | Größe der Abteilung Betrieb |
| split | Map | Topf → % | Live-Ops, Kundenservice, Community, Engine-Support (Summe 100) |
| outsourcedSupport | bool | – | Kundenservice ausgelagert |
| analyticsLevel | Enum | keine, grundlegend, intensiv | Analytics-Stufe |
| **Product.ops** |  |  |  |
| bugsKnown, bugsHidden | int | Anzahl | Gefundene und noch verborgene Bugs |
| bugSeverity | Liste | leicht, mittel, schwer | Schwere |
| satisfaction | int | 0–100 | Community-Zufriedenheit |
| patches | Liste Patch | – | Geplante und gelieferte Patches |
| ticketsOpen | int | Anzahl | Offene Kundenanfragen |
| **LiveService** (für MMO, F2P, Live-Service) |  |  |  |
| playerBase | int | Spieler | Aktive Spielerbasis |
| churnPct | int | Promille pro Monat | Abwanderung |
| monetization | Enum | abo, kauf\_abo, f2p\_shop, season\_pass | Umsatzmodell |
| arpu | int (Cent) | pro Spieler und Monat | Durchschnittsumsatz |
| monetizationIntensity | int | 0–100 | Härte der Monetarisierung |
| contentSchedule | Liste | Woche, Art | Geplante Content-Drops |
| lastContentWeek | Woche | – | Letzter Content-Drop |
| serverCapacity | int | Spieler gleichzeitig | Server-Kapazität |
| serverMode | Enum | eigen, gemietet, cloud | Hauptquelle; die Kapazität kann aus allen drei Quellen gemischt kommen (BTR-R34 bis BTR-R38) |
| serverOwn, serverRented, serverCloud | int | Spieler gleichzeitig | Kapazität je Quelle; serverCapacity ist die Summe |
| rentedPending | Liste {menge, abWoche} | – | Bestellte Miet-Kapazität im Vorlauf |
| peakFactor | int | Basispunkte 20.000–40.000 | Startspitze, beim Release per Seed gezogen |
| capacityRule | int oder aus | Basispunkte, Standard 13.000 | Regel „Kapazität = Bedarf × Faktor“ |
| status | Enum | aktiv, wartung, eingestellt | Betriebsstatus |
| **Patch** |  |  |  |
| productId, size | ID, Enum | klein, groß, day\_one, technik\_update | Art |
| effort | int | Personenwochen | Aufwand |
| fixes | int | Bugs | Behobene Bugs |
| removesProtection | bool | – | Entfernt Kopierschutz (S05) |

## 4 Regeln

**Abteilung Betrieb**

- **BTR-R01** \[1.0\] Live-Ops, Kundenservice, Community und Engine-Support sind Töpfe einer einzigen Abteilung Betrieb; der Spieler legt die Größe fest und verteilt die Kapazität per Regler.
- **BTR-R02** \[1.0\] Die Abteilung Betrieb wird freigeschaltet, sobald eins davon eintritt (A11): das erste Online-Produkt erscheint, die erste Engine-Lizenz mit Support wird vergeben (S04), oder es gibt 20 offene Anfragen in einem Monat. Vorher patchen Entwicklungsteams nebenbei, und das Engine-Team beantwortet den Support selbst: jede Anfrage kostet 0,5 Personentage, das Engine-Team arbeitet entsprechend langsamer, höchstens 30 %. Eine Meldung schlägt dann die Abteilung vor.
- **BTR-R03** \[1.0\] Ab drei parallelen Live-Services übernehmen Produzenten die Feinsteuerung der Töpfe (S07 Delegation); der Spieler kann eingreifen.
- **BTR-R04** \[1.0\] Kundenservice kann ausgelagert werden: halbe Kosten pro Anfrage, aber 60 % Wirkung auf die Zufriedenheit.

**Bugs und Patches**

- **BTR-R05** \[1.0\] Jedes Spiel erscheint mit einer Bug-Zahl aus Technik, Testzeit, QA-Kapazität und technischer Schuld (S02/S03); ein Teil ist sofort bekannt, der Rest wird von Spielern nach und nach gefunden.
- **BTR-R06** \[1.0\] Schwere Bugs senken Wertung (bis 4 Wochen nach Release) und Zufriedenheit sichtbar.
- **BTR-R07** \[1.0\] Patches kosten Teamzeit aus der Spieleentwicklung oder aus Live-Ops; ein Patch behebt eine Anzahl Bugs proportional zum Aufwand.
- **BTR-R08** \[1.0\] Ein Day-One-Patch (Teamzeit zwischen Gold und Release, S05) behebt Bugs vor der Wertung; er rettet die Wertung höchstens zu 70 %.
- **BTR-R09** \[1.0\] Ab etwa 2000 sind Patches für Konsolen möglich (vorher nur PC); jeder Konsolen-Patch braucht eine kurze Zertifizierung.
- **BTR-R10** \[1.0\] Ein Technik-Update (S03) ist ein Patch der Art technik\_update mit Neuberechnung des Engine-Faktors; es kann neue Bugs und gebrochene Mods erzeugen.

**Community-Zufriedenheit**

- **BTR-R11** \[1.0\] Jedes Produkt hat eine Zufriedenheit 0–100, Startwert aus der Spielerwertung. Sie wird nach jeder Rechnung auf 0–100 begrenzt (BTR-F3).
- **BTR-R12** \[1.0\] Zufriedenheit steigt durch schnelle Patches, kostenlose Updates, beantwortete Ereignisse, Mod-Support, pünktliche Seasons und beantwortete Kundenanfragen.
- **BTR-R13** \[1.0\] Zufriedenheit sinkt durch lange unbehobene Bugs, zu viele oder zu teure DLC, Verschiebungen nach Vorbestellung, aggressive Monetarisierung, Server-Ausfälle, offene Anfragen und starken Kopierschutz.
- **BTR-R14** \[1.0\] Zufriedenheit wirkt auf Mundpropaganda (Verkaufskurve), Sequel-Startfans, Markenruf und Lizenzverlängerungen (bei Engine-Kunden).

**Live-Produkte**

- **BTR-R15** \[1.0\] MMO, F2P und Live-Service haben eine Spielerbasis: Zugang aus Interesse, Wertung und Marketing, monatlicher Abgang durch Churn (BTR-F1).
- **BTR-R16** \[1.0\] Churn sinkt durch neue Inhalte und hohe Zufriedenheit und steigt durch Konkurrenz im selben Genre, Pausen im Content-Rhythmus und veraltete Technik (Engine-Faktor, S03).
- **BTR-R17** \[1.0\] Jede Woche ohne geplanten Content-Drop über den Rhythmus hinaus erhöht den Churn.
- **BTR-R18** \[1.0\] Serverkapazität kommt aus drei Quellen, die sich mischen lassen (A30): eigener Serverraum oder Rechenzentrum (S07), gemietete Kapazität und ab 2010 Cloud. Einzelheiten in BTR-R34 bis BTR-R38.
- **BTR-R19** \[1.0\] Liegt die gleichzeitige Spielerzahl über der Kapazität, entstehen Ausfälle (Zufriedenheit −8, Ereignis „Server-Ausfall“, BTR-R38). Zu viel Kapazität kostet nur Geld.
- **BTR-R20** \[1.0\] F2P-Umsatz = Spielerbasis × ARPU; ARPU steigt mit Monetarisierungs-Härte und Analytics, hohe Härte senkt aber Zufriedenheit und kann ab den 2010ern die Lootbox-Debatte auslösen.
- **BTR-R21** \[1.0\] Abo-Modelle bringen ARPU in Höhe der Abogebühr; Kauf + Abo zusätzlich den Kaufpreis bei Neuzugängen.
- **BTR-R22** \[1.0\] Ein Live-Produkt einzustellen spart alle laufenden Kosten, senkt aber den Ruf bei seinen Spielern und die Markenstärke; die Spielerbasis verschwindet.
- **BTR-R23** \[1.0\] Live-Produkte binden dauerhaft Kapazität im Topf Live-Ops (Teamanteil laut Produkttyp, S02).

**Serverkapazität**

- **BTR-R34** \[1.0\] Eigene Kapazität: Jeder Serverraum liefert eine feste Zahl gleichzeitiger Spieler, ein Rechenzentrum das Zehnfache (S07; weitere Räume mit 70 % Nutzen, A31). Danach fallen nur geringe laufende Kosten an.
- **BTR-R35** \[1.0\] Gemietete Kapazität wird in Blöcken bestellt und steht nach 4 Wochen Vorlauf bereit. Kündigung wirkt zum Monatsende.
- **BTR-R36** \[1.0\] Cloud gibt es ab 2010. Sie wächst automatisch mit, aber um höchstens 50 % pro Woche, und kostet pro Spieler am meisten.
- **BTR-R37** \[1.0\] Die Startkapazität legt der Spieler auf dem Release-Bildschirm fest (Punkt 9 des Release-Pakets, S05). Vorbelegt ist die erwartete Startspitze. Danach steuert die Regel „Kapazität = Bedarf × 1,3“ alle drei Quellen in der Reihenfolge eigen, gemietet, Cloud. Der Spieler kann die Regel ändern oder abschalten.
- **BTR-R38** \[1.0\] In den ersten 2 Wochen nach Release liegt der Bedarf beim 2- bis 4-Fachen des Normalbedarfs (Startspitze, Seed). Ist die Startspitze nicht gedeckt, fällt der Server aus: Zufriedenheit −8, Kette „Server-Ausfall zum Start“. Die Cloud mildert das nur, weil sie pro Woche höchstens um 50 % wächst; wer zu knapp startet, fällt trotzdem aus.

**Kundenservice und Engine-Support**

- **BTR-R24** \[1.0\] Jedes verkaufte Exemplar erzeugt Kundenanfragen (BTR-F2); reicht die Kapazität nicht, bleiben Anfragen offen und senken die Zufriedenheit.
- **BTR-R25** \[1.0\] Kanäle wechseln automatisch mit der Epoche (Hotline, E-Mail, Foren, soziale Medien, Discord); der Kanal ändert nur die Darstellung.
- **BTR-R26** \[1.0\] Moderation und Kontoschutz bei Online-Spielen laufen im Topf Community; zu wenig Kapazität erhöht die Wahrscheinlichkeit von Cheater-Welle und gehackten Konten (S08 Krisen).
- **BTR-R27** \[1.0\] Engine-Support beantwortet Anfragen von Lizenznehmern (S04); offene Anfragen senken deren Zufriedenheit.

**Analytics**

- **BTR-R28** \[1.0\] Analytics ist ab etwa 2010 verfügbar, in drei Stufen: keine, grundlegend, intensiv.
- **BTR-R29** \[1.0\] Grundlegend senkt den Churn und macht Content gezielter; intensiv erhöht zusätzlich ARPU und die Genauigkeit von Prognosen (Spanne schmaler), erhöht aber das Risiko für Ruf-Ereignisse bei harter Monetarisierung.
- **BTR-R30** \[1.0\] Ohne Analytics laufen F2P und Live-Service „blind“: höherer Churn, schwächere Monetarisierung.

**Lokalisierung im Betrieb**

- **BTR-R31** \[1.0\] Jede lokalisierte Region erhöht die Kundenanfragen um ihren Marktanteil; nicht lokalisierte Regionen erzeugen keine Anfragen, aber auch keine Verkäufe.

**Später**

- **BTR-R32** \[später\] E-Sport als Mechanik (Ligen, Turniere, Sponsoring); in 1.0 nur Ereignis „Eine Liga will dein Spiel“.
- **BTR-R33** \[später\] Server-Hosting für fremde Online-Spiele als Auftragsarbeit.

## 5 Formeln und Startwerte

**BTR-F1 Spielerbasis eines Live-Produkts (monatlich):**

```latex
B_{t+1} = B_t + \text{Zugang}_t - B_t \cdot c_t,\quad c_t = \min\Big(0{,}5,\ \max\Big(0,\ c_0 \cdot \big(1 + c_1 \cdot \text{Konkurrenz} + c_2 \cdot \text{Contentpause} + c_3 \cdot (1 - E_{\text{rel}})\big) \cdot \Big(1 - c_4 \cdot \frac{Z - 50}{50}\Big) \cdot (1 - a_{\text{Analytics}})\Big)\Big)
```

Zugang aus Interesse, Wertung, Marketing und Content-Drops; Z = Zufriedenheit; E\_rel = Engine-Faktor relativ zum Stand der Technik. BTR-F1 ist die maßgebliche Formel für Live-Spielerbasen (A08); andere Specs verweisen hierher. Der Churn c liegt immer zwischen 0 und 0,5 pro Monat, damit eine Basis nie in einem Monat verschwindet oder wächst, weil c negativ wird.

**BTR-F2 Kundenanfragen (monatlich):**

```latex
\text{Anfragen} = \text{Verkäufe}_{\text{Monat}} \cdot (0{,}02 + 0{,}05 \cdot B + 0{,}03 \cdot \text{Online}) + d \cdot B_{\text{live}},\quad B = \min\Big(1,\ \frac{\text{leicht} + 3 \cdot \text{mittel} + 10 \cdot \text{schwer}}{200}\Big)
```

B ist der normierte Bug-Anteil aus den offenen bekannten Bugs (0–1). Online ist 1 für Online-Produkte, sonst 0. B\_live ist die Spielerbasis von Live-Produkten.

**BTR-F3 Zufriedenheit (wöchentlich):**

```latex
Z_{t+1} = \text{clamp}_{0}^{100}\Big(Z_t + \sum \text{positiveEinflüsse} - \sum \text{negativeEinflüsse} + \rho \cdot (Z_{\text{Ziel}} - Z_t)\Big)
```

Z\_Ziel = Spielerwertung × 10; ρ = langsame Rückkehr zum Zielwert.

**BTR-F4 Bugfund nach Release:**

```latex
\text{gefunden}_t = \text{verborgen}_t \cdot f \cdot \frac{\text{Spieler}_t}{\text{Spieler}_t + S_{1/2}}
```

| Parameter | Startwert | Bereich | Datei |
| --- | --- | --- | --- |
| Bugs bekannt beim Release | 40 % (Rest verborgen) | 20–60 % | data/operations.json |
| f Bugfund | 25 % der verborgenen pro Woche bei voller Spielerzahl | 5–50 % | data/operations.json |
| Patch-Leistung | 3 Bugs pro Personenwoche (1990), mit Werkzeug-Modul steigend | – | data/operations.json |
| Day-One-Patch-Rettung | max. 70 % der Bug-Wirkung auf die Wertung | 0–100 % | data/operations.json |
| a, b, c, d (Anfragen) | 0,02; 0,05 (auf normiertes B); 0,03; 0,005 pro Spieler | – | data/operations.json |
| Anfragen pro Person Kundenservice | 400 pro Monat (2000), mit Epoche +30 % pro Jahrzehnt durch Werkzeuge | – | data/operations.json |
| Auslagerung | 50 % Kosten, 60 % Wirkung | – | data/operations.json |
| c₀ Grund-Churn | MMO 4 %, Live-Service 6 %, F2P 10 % pro Monat | 1–20 % | data/liveservice.json |
| c₁ … c₄ | 0,5; 0,1 pro Woche Pause; 0,8; 0,4 | – | data/liveservice.json |
| Content-Rhythmus | MMO 26 Wochen, Live-Service 12, F2P 8 | – | data/liveservice.json |
| Analytics-Wirkung a | grundlegend 10 %, intensiv 20 % Churn-Senkung; intensiv ARPU +25 % | – | data/liveservice.json |
| Analytics-Kosten | grundlegend 3 Personen, intensiv 8 Personen (2010) | – | data/liveservice.json |
| ARPU F2P | 1,50 USD pro Monat (2010), mit Härte bis 4 USD | – | data/liveservice.json |
| Abogebühr MMO | 13 USD (2000), 15 USD (2010) | – | data/liveservice.json |
| Lootbox-Debatte | Risiko pro Monat = 2 % × max(0, Härte − 60)/10, ab 2015 | – | data/events.json |
| Server gemietet | 0,40 USD pro gleichzeitigem Spieler und Monat (2005), sinkt 10 % pro Jahr | – | data/liveservice.json |
| Server eigen | Serverraum (S07) + 0,15 USD pro Spieler und Monat | – | data/liveservice.json |
| Gleichzeitige Spieler | Bedarf = 10 % der Spielerbasis; Startspitze in den ersten 2 Wochen = Bedarf × 2–4 (Seed) | – | data/liveservice.json |
| Einstellen eines Live-Produkts | Markenstärke −10, Ruf −5 bei Spielerbasis > 100.000 | – | data/liveservice.json |
| Zufriedenheit: Einflüsse | Patch +3, kostenloses Update +5, Season pünktlich +2, −1 je 10 offene schwere Bugs pro Woche, höchstens −5, DLC über 3 pro Jahr −4 je DLC, Ausfall −8, offene Anfragen −1 pro 10 % Rückstand | – | data/operations.json |
| ρ Rückkehr | 2 % pro Woche | 0–10 % | data/operations.json |
| Kapazität Serverraum / Rechenzentrum | 5.000 / 50.000 gleichzeitige Spieler (2000), Verdopplung alle 5 Jahre | – | data/liveservice.json |
| Miete: Block und Vorlauf | Blöcke zu 10.000 gleichzeitigen Spielern, 4 Wochen Vorlauf | 2–8 Wochen | data/liveservice.json |
| Cloud | ab 2010; 0,80 USD pro gleichzeitigem Spieler und Monat (2010), sinkt 10 % pro Jahr; Wachstum höchstens +50 % pro Woche | Wachstum 20–100 % | data/liveservice.json |
| Startspitze / Kapazitätsregel | 2–4 × Bedarf in den ersten 2 Wochen; Regel Bedarf × 1,3 | Regel 1,0–2,0 | data/liveservice.json |
| Freischaltung Betrieb | erstes Online-Produkt, erste Lizenz mit Support oder 20 offene Anfragen pro Monat; vorher 0,5 Personentage Engine-Team je Anfrage, höchstens −30 % Tempo | Schwelle 10–50 | data/operations.json |
| Churn-Grenzen | 0 ≤ c ≤ 0,5 pro Monat | fest | data/liveservice.json |

## 6 Entscheidungen des Spielers

| Entscheidung | Wann | Optionen | Standard / Delegation |
| --- | --- | --- | --- |
| Größe der Abteilung Betrieb | ab Freischaltung, jederzeit | Personen | Vorschlag nach Last |
| Aufteilung der Töpfe | jederzeit | Regler | Produzenten ab drei Live-Services |
| Kundenservice auslagern | jederzeit | eigen, ausgelagert | eigen |
| Patch planen | jederzeit nach Release | Größe, Team | Regel: „Wenn Zufriedenheit unter 60, dann Patch“ |
| Content-Drop planen | Live-Produkte | Art, Termin | Regel nach Rhythmus |
| Monetarisierungs-Härte | F2P, Live-Service | 0–100 | 40 |
| Server mieten / eigen | Live-Produkte | Kapazität je Quelle: eigen, gemietet, Cloud | Startkapazität im Release-Paket (S05), danach Regel „Bedarf × 1,3“ |
| Analytics-Stufe | ab 2010 | keine, grundlegend, intensiv | grundlegend bei Live-Produkten |
| Produkt einstellen | jederzeit | ja, nein | Regel: „Wenn Spielerbasis unter X und Verlust, dann vorschlagen“ |

## 7 KI-Verhalten

- KI-Studios patchen nach Persönlichkeit: AAA und Mittelklasse, wenn Zufriedenheit unter 60 fällt; Indie langsamer.
- KI-Live-Produkte halten den Content-Rhythmus mit Wahrscheinlichkeit nach Teamgröße; scheitern sie zweimal, steigt ihr Churn sichtbar.
- KI setzt Monetarisierungs-Härte nach Persönlichkeit (aggressive Publisher 70, Indie 30) und reagiert auf die Lootbox-Debatte mit Abschwächen.
- KI stellt Live-Produkte ein, wenn sie 6 Monate Verlust schreiben.
- KI-Abteilungen Betrieb wachsen mit der Last; KI lagert Kundenservice aus, wenn sie Kosten priorisiert.

## 8 Oberfläche

- **Erleben:** Pro Produkt eine Karte mit Zufriedenheit als Gesicht + Sparkline, Bug-Stapel nach Schwere, offene Anfragen als Postkorb. Abteilung Betrieb als ein Trennbalken mit vier Töpfen. Live-Produkte mit Spielerbasis als Kurve, Churn als Abfluss, Content-Plan als Pins auf dem Zeitstrom. Server-Auslastung als Füllstand in drei Farben (eigen, gemietet, Cloud) mit der Startspitze als Linie; auf der Bühne erscheint ein Serverraum.
- **Analysieren:** Tabellen für Bugs, Patches, Anfragen pro Kanal, Churn-Aufschlüsselung (Konkurrenz, Pause, Technik, Zufriedenheit).

## 9 Ereignisse und Meldungen

| Ereignis | Klasse | Inhalt |
| --- | --- | --- |
| Schwerer Bug gefunden | Entscheidung oder Regel | sofort patchen, mit nächstem Patch, ignorieren |
| Zufriedenheit unter 40 | Ergebnis | Ursache, Vorschlag |
| Server-Ausfall zum Start | Entscheidung (Kette) | Entschädigung, Cloud zuschalten (ab 2010) oder Miete bestellen (4 Wochen Vorlauf), aussitzen |
| Cheater-Welle | Entscheidung (Kette) | Anti-Cheat aufrüsten, Bann-Welle, nichts tun |
| Lootbox-Debatte | Entscheidung (Kette) | abschaffen, abschwächen, verteidigen |
| Datenleck | Entscheidung (Kette) | offenlegen und entschädigen, still beheben |
| Update zerstört Mods und Spielstände | Entscheidung | Hotfix, Kompatibilitätsmodus, aussitzen |
| Content-Pause zu lang | Ergebnis | Churn steigt |
| Eine Liga will dein Spiel | Entscheidung (Ereignis) | zustimmen, ablehnen (E-Sport als Mechanik später) |

## 10 Schnittstellen

| System | Richtung | Inhalt |
| --- | --- | --- |
| S01 Kern | ← | Betriebs-Schritt im Tick nach dem Markt |
| S02 Produkte | ← | Bugs beim Release, Produkttypen, Teamanteil |
| S03 Engines | ← | Engine-Faktor für Churn, Technik-Update, Anti-Cheat-Stufe |
| S04 Lizenzen | ↔ | Support-Anfragen, Zufriedenheit der Lizenznehmer |
| S05 Vertrieb | ↔ | Verkäufe erzeugen Anfragen; Zufriedenheit wirkt auf Mundpropaganda; Kopierschutz auf Zufriedenheit |
| S07 Firma | ↔ | Personal der Abteilung, Kosten, Serverraum im Büro, Produzenten |
| S08 Markt | ← | Konkurrenz im Genre, Krisen-Ketten |
| S10 Ziele | → | Szenario „Live-Service-Rettung“ |
| S11 Oberfläche | → | Produktkarten, Trennbalken, Content-Pins |

## 11 Abnahmetests

- **BTR-T01** Gegeben ein MMO ohne Content-Drop über 52 Wochen, dann ist der Churn am Ende höher als am Anfang und die Spielerbasis kleiner.
- **BTR-T02** Gegeben ein MMO mit pünktlichen Content-Drops und Zufriedenheit 75, dann lässt es sich 10 Jahre mit Gewinn betreiben (Abnahmekriterium Etappe 5).
- **BTR-T03** Gegeben ein Spiel mit 100 offenen schweren Bugs, wenn 8 Wochen kein Patch kommt, dann sinkt die Zufriedenheit um mindestens 20.
- **BTR-T04** Gegeben Kundenservice-Kapazität unter der Hälfte der Anfragen, dann wächst der Rückstand und die Zufriedenheit sinkt.
- **BTR-T05** Gegeben ein F2P-Spiel mit Härte 90 ab 2015, dann tritt in einem Simulationsjahr mit Wahrscheinlichkeit > 50 % die Lootbox-Debatte auf.
- **BTR-T06** Gegeben Analytics „intensiv“, dann ist der Churn niedriger und der ARPU höher als ohne Analytics.
- **BTR-T07** Gegeben gleichzeitige Spieler über der Server-Kapazität, dann tritt ein Ausfall auf und die Zufriedenheit sinkt.
- **BTR-T08** Gegeben ein Live-Produkt mit Spielerbasis 500.000, wenn es eingestellt wird, dann sinkt die Markenstärke.
- **BTR-T09** Gegeben ein Technik-Update auf ein zwei Versionen altes MMO, dann sinkt dessen Churn im Folgejahr.
- **BTR-T10** Gegeben drei Live-Services, dann übernehmen Produzenten die Topf-Steuerung und die Zahl der Pflicht-Entscheidungen im Betrieb sinkt.

* **BTR-T11** Gegeben Konkurrenz, Contentpause und Technik alle maximal und Zufriedenheit 0, dann ist der Churn genau 0,5; bei Zufriedenheit 100 und Analytics intensiv ist er nie negativ.
* **BTR-T12** Gegeben 10.000 Verkäufe im Monat, ein Offline-Spiel und 20 offene schwere Bugs (B = 1), dann entstehen 700 Anfragen; ohne Bugs 200.
* **BTR-T13** Gegeben ein F2P-Spiel mit Härte 90 im Jahr 2016, dann beträgt das Risiko der Lootbox-Debatte 6 % pro Monat; bei Härte 60 oder weniger 0.
* **BTR-T14** Gegeben 35 offene schwere Bugs, dann sinkt die Zufriedenheit pro Woche um 3; bei 120 schweren Bugs um höchstens 5.
* **BTR-T15** Gegeben ein Online-Spiel mit Normalbedarf 20.000, Startspitze 3 × und Startkapazität 40.000, dann fällt der Server in Woche 1 aus und die Zufriedenheit sinkt um 8.
* **BTR-T16** Gegeben 2012 und Cloud-Kapazität 10.000 bei Bedarf 40.000, dann ist die Cloud nach 1 Woche bei 15.000 und nach 4 Wochen bei höchstens 50.625.
* **BTR-T17** Gegeben eine Miet-Bestellung in Woche 10, dann steht die Kapazität ab Woche 14 bereit.
* **BTR-T18** Gegeben kein Online-Produkt, keine Lizenz mit Support und 19 offene Anfragen im Monat, dann ist die Abteilung Betrieb gesperrt; bei der ersten Lizenz mit Support wird sie freigeschaltet.
* **BTR-T19** Gegeben Zufriedenheit 98 und Einflüsse +10 in einer Woche, dann ist sie danach 100; bei 4 und −10 ist sie 0.

## 12 Spätere Versionen

- **1.1:** Community-Events (Fan-Treffen, Livestreams) als eigene Content-Art; Spielerräte als Feedback-Kanal.
- **Später (S13):** E-Sport als Mechanik mit Ligen, Turnieren und Sponsoren; Server-Hosting für fremde Online-Spiele; eigene Cloud-Plattform.

## Änderungen nach Prüfung 3

- BTR-F1 ist maßgeblich für Live-Spielerbasen (A08). Der Churn c ist auf 0 bis 0,5 begrenzt.
- BTR-F2 neu: Anfragen = Verkäufe × (0,02 + 0,05 · B + 0,03 · Online) + d · B\_live, mit normiertem Bug-Anteil B.
- Lootbox-Risiko mit Faktor 2 % pro 10 Punkte Härte über 60. Damit erfüllt BTR-T05 seine 50 %.
- Zufriedenheit: −1 je 10 offene schwere Bugs pro Woche, höchstens −5. Alle Zufriedenheiten sind auf 0–100 begrenzt (BTR-R11, BTR-F3).
- Serverkapazität nach A30: drei Quellen (eigen, gemietet mit 4 Wochen Vorlauf, Cloud ab 2010 mit +50 % pro Woche), Startkapazität im Release-Paket, danach Regel „Bedarf × 1,3“, Ausfall bei ungedeckter Startspitze von 2–4 × Bedarf. Neue Regeln BTR-R34 bis BTR-R38, neue Datenfelder und Startwerte; BTR-R18, BTR-R19, Entscheidungen, Ereignisse und Oberfläche angepasst.
- Freischaltung der Abteilung Betrieb nach A11 (BTR-R02), vorher Engine-Team mit Tempo-Malus.
- Neue Tests BTR-T11 bis BTR-T19.
