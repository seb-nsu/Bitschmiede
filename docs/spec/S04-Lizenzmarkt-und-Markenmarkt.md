# S04 Lizenzmarkt

**Version:** 1.0, Stand 29.10.2026 · **Quelle:** Design-Dokument, Kapitel Lizenzmarkt, Engines und Technologie, Markt und KI-Konkurrenz · **Prefix:** LIZ

## 1 Zweck und Abgrenzung

Der Lizenzmarkt regelt, wie Engines (ab 1.0 auch Marken, Abschnitt 13; später Middleware) zwischen Firmen gehandelt werden. Der Spieler kann Lizenzgeber sein (eigene Engine anbieten) und Lizenznehmer (fremde Engine nutzen). Beide Wege sind gleichwertig spielbar. KI-Studios nutzen dieselben Regeln.

Nicht Teil dieser Spezifikation: Aufbau und Forschung der Engine (S03), Support-Kapazität der Abteilung Betrieb (S06), Kauf eines Engine-Anbieters (S09), Darstellung des Verhandlungstischs (S11).

## 2 Begriffe

| Begriff | Bedeutung |
| --- | --- |
| Lizenzgeber | Firma, die eine Engine anbietet |
| Lizenznehmer | Firma, die eine fremde Engine für ihre Spiele nutzt |
| Vorlage | Vom Lizenzgeber festgelegtes Vertragspaket, das Anfragen automatisch beantwortet |
| Royalty | Anteil am Netto-Umsatz eines Spiels, das die Engine nutzt |
| Pauschale | Fester Betrag pro Spiel oder pro Jahr |
| Arbeitsplatz-Abo | Jahresgebühr pro Entwickler des Lizenznehmers, ohne Royalty |
| Kundenstatus | Zufrieden, verlängert sicher, gefährdet, wandert ab – immer mit Grund |
| Vertrauenswert | Ruf eines Anbieters für faire, stabile Bedingungen (0–100) |
| Nutzwert U | Bewertung einer Engine durch ein Studio, Grundlage jeder Engine-Wahl |
| Wechselkosten | Zeit und Geld, die ein Engine-Wechsel kostet |

## 3 Daten

| Entität / Feld | Typ | Einheit / Bereich | Bedeutung |
| --- | --- | --- | --- |
| **LicenseOffer** (Angebot einer Engine) |  |  |  |
| engineId | ID | – | Angebotene Engine |
| model | Enum | hausintern, kommerziell, indie, open\_source | Grundmodell |
| templates | Liste LicenseTemplate | 0–3 | Vorlagen Indie, Standard, Premium |
| trust | int | 0–100 | Vertrauenswert des Anbieters |
| roadmap | Liste | Modul, Zielstufe, geplantes Jahr | Für Lizenznehmer sichtbar |
| **LicenseTemplate** |  |  |  |
| name | String | – | Indie, Standard, Premium oder frei |
| terms | LicenseTerms | – | Konditionen (siehe unten) |
| acceptRule | Bedingung | – | Wann Anfragen automatisch angenommen werden |
| **LicenseTerms** |  |  |  |
| flatFee | int (Cent) | ≥ 0 | Pauschale |
| flatFeeUnit | Enum | pro\_spiel, pro\_jahr | Bezug der Pauschale |
| royaltyPct | int | 0–3000 (Basispunkte) | Royalty, 500 = 5 % |
| royaltyThreshold | int (Cent) | ≥ 0 | Umsatz pro Spiel, ab dem Royalty fällig wird |
| seatFeePerYear | int (Cent) | ≥ 0 | Arbeitsplatz-Abo pro Entwickler und Jahr |
| term | Enum + int | ein\_spiel, jahre(n), unbefristet | Laufzeit |
| exclusivity | Enum | keine, genre(g), plattform(p), voll | Exklusivität |
| sourceAccess | bool | – | Quellcode-Zugang |
| supportLevel | Enum | keiner, basis, premium | Support-Pflicht |
| updates | Enum | eingefroren, minor, alle | Welche Versionen geliefert werden |
| **LicenseContract** |  |  |  |
| licensorId, licenseeId | ID | – | Vertragspartner |
| engineId, engineVersion | ID, int | – | Lizenzierte Engine und Version |
| terms | LicenseTerms | – | Vereinbarte Konditionen |
| start, end | Datum | Woche | Laufzeit |
| status | Enum | zufrieden, sicher, gefährdet, abwandernd, beendet | Kundenstatus |
| statusReason | Enum + Text | – | Grund für den Status |
| satisfaction | int | 0–100 | Zufriedenheit des Lizenznehmers |
| revenueHistory | Liste | Cent pro Monat | Einnahmen aus diesem Vertrag |
| openRequests | Liste EngineRequest | – | Anforderungen ans Engine-Team (S03) |
| **BrandLicense** \[1.1\] |  |  |  |
| brandId, licenseeId | ID | – | Marke und Lizenznehmer |
| fee, revenueSharePct | int | Cent, Basispunkte | Gebühr und Umsatzanteil |
| allowedGenres | Liste | – | Erlaubte Genres für Lizenzspiele |

## 4 Regeln

**Angebot und Verträge**

- **LIZ-R01** \[1.0\] Eine Engine kann erst lizenziert werden, wenn ihr Besitzer ein Lizenzmodell außer „hausintern“ gewählt hat.
- **LIZ-R02** \[1.0\] Der Lizenzmarkt wird für den Spieler mit der ersten Lizenzanfrage eines KI-Studios freigeschaltet; die Anfrage ist zugleich das Tutorial.
- **LIZ-R03** \[1.0\] Ein Vertrag besteht aus den Bestandteilen Pauschale, Royalty mit optionaler Schwelle, Arbeitsplatz-Abo, Laufzeit, Exklusivität, Quellcode-Zugang, Support-Level und Updates; jeder Bestandteil darf null bzw. „keiner“ sein.
- **LIZ-R04** \[1.0\] Royalty und Arbeitsplatz-Abo schließen sich in einer Vorlage nicht aus; die Startvorlagen nutzen aber jeweils nur eines von beiden.
- **LIZ-R05** \[1.0\] Ein Lizenzgeber legt bis zu drei Vorlagen fest. Eine Anfrage, die zu einer Vorlage passt, wird je nach Delegationsstufe automatisch angenommen; Abweichungen und Großkunden (erwarteter Jahresumsatz über Schwelle) landen als Fokus-Karte beim Spieler.
- **LIZ-R06** \[1.0\] Exklusivität blockiert neue Verträge im betroffenen Genre bzw. auf der betroffenen Plattform für die Laufzeit; bestehende Verträge bleiben gültig.
- **LIZ-R07** \[1.0\] Royalties werden monatlich auf den Netto-Umsatz (nach Store- bzw. Händleranteil) jedes Spiels berechnet, das mit der lizenzierten Engine veröffentlicht wurde, sobald der kumulierte Umsatz dieses Spiels die Schwelle überschreitet.
- **LIZ-R08** \[1.0\] Das Arbeitsplatz-Abo wird jährlich für die Zahl der Entwickler berechnet, die beim Lizenznehmer an Projekten mit dieser Engine arbeiten.
- **LIZ-R09** \[1.0\] Ein Vertrag mit Updates „alle“ liefert jede neue Engine-Version ohne Zusatzkosten; „minor“ nur Updates innerhalb der Hauptversion; „eingefroren“ keine.
- **LIZ-R10** \[1.0\] Quellcode-Zugang erlaubt dem Lizenznehmer, einzelne Module selbst auszubauen (siehe LIZ-R30); er senkt den Wechselkostenfaktor des Lizenznehmers für diese Engine nicht, erhöht aber seine Unabhängigkeit (Faktor in U).
- **LIZ-R11** \[1.0\] Läuft ein Vertrag aus, entscheidet der Lizenznehmer nach Nutzwert über Verlängerung; ein Lizenznehmer im Status „abwandernd“ verlängert nie.

**Kundenstatus und Support**

- **LIZ-R12** \[1.0\] Jeder Vertrag hat eine Zufriedenheit 0–100, die monatlich aus Support-Erfüllung, Engine-Qualität im Vergleich zum Stand der Technik, Preisänderungen und erfüllten Anforderungen berechnet wird.
- **LIZ-R13** \[1.0\] Der Status folgt aus der Zufriedenheit: ≥ 70 zufrieden, 50–69 verlängert sicher, 30–49 gefährdet, < 30 abwandernd. Er wird immer mit dem größten negativen Einflussfaktor als Grund angezeigt (z. B. „Support-Wartezeit zu lang“, „Konkurrenz-Engine hat Raytracing“).
- **LIZ-R14** \[1.0\] Jeder Vertrag mit Support-Level „basis“ oder „premium“ erzeugt monatlich Support-Anfragen im Topf Engine-Support der Abteilung Betrieb (S06); unbeantwortete Anfragen senken die Zufriedenheit.
- **LIZ-R15** \[1.0\] Die Einnahmen jeder Engine erscheinen in den Finanzen als eigener Einnahmestrang mit Verlauf.

**Preisänderungen und Vertrauen**

- **LIZ-R16** \[1.0\] Ändert ein Lizenzgeber die Konditionen für bestehende Verträge zum Nachteil der Kunden, sinkt sein Vertrauenswert sofort nach der Formel ΔVertrauen (Abschnitt 5, mit Referenzkosten im Nenner), und alle Kunden verlieren Zufriedenheit.
- **LIZ-R17** \[1.0\] Eine zurückgenommene Verschlechterung stellt nur die Hälfte des Vertrauensverlusts wieder her.
- **LIZ-R18** \[1.0\] Vertrauen steigt langsam (+1 pro Quartal ohne Verschlechterung, bis 100).
- **LIZ-R19** \[1.0\] Sinkt das Vertrauen eines großen Anbieters unter 40, steigt der Nutzwert von Open-Source-Engines für alle Studios für 2 Jahre um einen Bonus.
- **LIZ-R20** \[1.0\] Plattformbetreiber mit eigener Engine können die Royalty für Verkäufe im eigenen Store erlassen.

* **LIZ-R37** \[1.0\] Alle Zufriedenheiten (Verträge, Lizenznehmer, Markenlizenzen) und alle Vertrauenswerte werden nach jeder Rechnung auf 0–100 begrenzt. Bei 0 endet nichts automatisch; der Status folgt LIZ-R13.
* **LIZ-R38** \[1.0\] Wird etwas Kostenloses kostenpflichtig (alter Preis null), sinkt das Vertrauen fest um 30. Bei Rückkehr von Open Source zu Gebühren kommen nach LIZ-R24 weitere 10 hinzu (zusammen 40).

**Open Source**

- **LIZ-R21** \[1.0\] Eine Engine unter Open Source erhebt keine Pauschale, keine Royalty und kein Abo; jedes Studio darf sie nutzen.
- **LIZ-R22** \[1.0\] Open Source bringt Ertrag über bezahlten Support (Premium-Support-Verträge), kommerzielle Premium-Module (z. B. Konsolen-Plattformmodul) und Community-Beiträge, die die Forschungskosten der Module senken.
- **LIZ-R23** \[1.0\] Open Source erhöht den Ruf als Arbeitgeber und die Zahl der Bewerber mit Engine-Erfahrung.
- **LIZ-R24** \[1.0\] Wechselt eine Engine von Open Source zurück zu Gebühren, sinkt der Vertrauenswert um 40 Punkte (30 nach LIZ-R38 plus 10 für den Bruch).

**Engine-Wahl der Studios**

- **LIZ-R25** \[1.0\] Jedes Studio bewertet beim Start eines Projekts alle verfügbaren Engines (eigene und lizenzierbare) mit dem Nutzwert U und wählt die höchste, sofern sie die Wechsel-Hürde übertrifft (LIZ-R26).
- **LIZ-R26** \[1.0\] Ein Studio wechselt von seiner aktuellen Engine nur, wenn U(neu) ≥ U(alt) · (1 + Hürde); die Hürde steigt mit der Erfahrung seiner Teams in der aktuellen Engine.
- **LIZ-R27** \[1.0\] Ein Engine-Wechsel kostet das Studio Umschulungszeit (Teams arbeiten einige Wochen langsamer) und Geld; laufende Projekte bleiben auf ihrer Engine, außer sie werden migriert (S03).
- **LIZ-R28** \[1.0\] Große KI-Studios ab einer Teamgröße können eine eigene Engine bauen und werden dadurch Lizenzgeber.

**Lizenzweg des Spielers**

- **LIZ-R29** \[1.0\] Großkunden (Spieler oder KI) können am Verhandlungstisch bessere Konditionen, Quellcode-Zugang oder Genre-Exklusivität aushandeln; der Spielraum des Anbieters ist als Balken sichtbar.
- **LIZ-R30** \[1.0\] Mit Quellcode-Zugang kann der Spieler einzelne Module der fremden Engine selbst ausbauen; diese Module gehören ihm, bleiben aber an die fremde Engine gebunden.
- **LIZ-R31** \[1.0\] Mit Premium-Support kann ein Lizenznehmer Wünsche zur Roadmap einreichen; der Anbieter erfüllt sie mit einer Wahrscheinlichkeit nach Kundengröße und Beziehung.
- **LIZ-R32** \[1.0\] Ein Preis-Schock des eigenen Anbieters (z. B. Royalty von 5 auf 12 %) erzeugt eine Fokus-Karte mit den Optionen: akzeptieren, nachverhandeln, Wechsel planen, eigene Engine starten.
- **LIZ-R33** \[1.0\] Kauft der Spieler seinen Engine-Anbieter (S09), gehen Engine und alle Lizenzverträge auf ihn über.

**Anforderungen und Marken**

- **LIZ-R34** \[1.0\] Lizenznehmer der eigenen Engine stellen Anforderungen ans Engine-Team (EngineRequest, S03); erfüllte Anforderungen erhöhen die Zufriedenheit, abgelehnte senken sie leicht.
- **LIZ-R35** \[1.0\] Marken werden auf dem Markenmarkt lizenziert oder verkauft, wie Engines auf dem Lizenzmarkt. Alle Regeln stehen in Abschnitt 13 (LIZ-M01 ff.).
- **LIZ-R36** \[später\] Werkzeuge und Middleware bekommen einen eigenen Lizenzmarkt mit denselben Vertragsbestandteilen (S13).

## 5 Formeln und Startwerte

**Nutzwert einer Engine für ein Studio:**

```latex
U = w_1 \cdot \text{Passung} + w_2 \cdot \text{Qualität} - w_3 \cdot \text{Kosten} + w_4 \cdot \text{Support} + w_5 \cdot \text{Ruf} + w_6 \cdot \text{Unabhängigkeit} - w_7 \cdot \text{Wechselkosten}
```

- **Passung** (0–1): Anteil der Features des geplanten Projekts, die die Engine-Module abdecken.
- **Qualität** (0–1): (E − 0,3) / 0,85, begrenzt auf 0–1. E ist der Engine-Faktor aus S03 (Spanne 0,3–1,15).
- **Kosten** (0–1): erwartete Gesamtkosten (Pauschale + Royalty beim erwarteten Umsatz + Abo) geteilt durch das Projektbudget, gekappt bei 1.
- **Support** (0–1): Support-Level und aktuelle Support-Erfüllung des Anbieters.
- **Ruf** (0–1): Vertrauenswert / 100, plus Bonus für erfolgreiche Spiele mit dieser Engine im letzten Jahr.
- **Unabhängigkeit** (0 oder 1): Quellcode-Zugang oder Open Source.
- **Wechselkosten** (0–1): 0 für die aktuelle Engine, sonst Umschulungsaufwand relativ zur Studiogröße.

**Gewichte nach Studio-Persönlichkeit:**

| Persönlichkeit | w₁ Passung | w₂ Qualität | w₃ Kosten | w₄ Support | w₅ Ruf | w₆ Unabh. | w₇ Wechsel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Indie | 1,0 | 0,5 | 1,5 | 0,5 | 0,3 | 0,4 | 0,6 |
| Mittelklasse | 1,0 | 0,8 | 1,0 | 0,7 | 0,5 | 0,3 | 0,8 |
| AAA | 1,0 | 1,4 | 0,5 | 1,0 | 0,6 | 0,6 | 1,0 |
| Engine-Spezialist | 0,8 | 1,2 | 0,6 | 0,4 | 0,4 | 1,0 | 1,2 |
| Publisher | 1,0 | 0,9 | 0,9 | 0,8 | 0,8 | 0,2 | 0,7 |

**Wechsel-Hürde:**

```latex
\text{Hürde} = h_0 + h_1 \cdot \text{Erfahrung}_{\text{aktuelle Engine}} / 100
```

**Zufriedenheit eines Lizenznehmers (monatlich):**

```latex
Z_{t+1} = \text{clamp}_{0}^{100}\big(Z_t + z_1 \cdot (\text{Supporterfüllung} - 0{,}8) + z_2 \cdot (E - E_{\text{Markt}}) + z_3 \cdot \text{erfüllteAnforderungen} - z_4 \cdot \text{Preisverschlechterung} - z_5\big)
```

**Vertrauensverlust bei Preisänderung:**

```latex
\Delta \text{Vertrauen} = -v_1 \cdot \frac{\text{Kosten}_{\text{neu}} - \text{Kosten}_{\text{alt}}}{\max(\text{Kosten}_{\text{alt}},\ \text{Referenzkosten}_{\text{Epoche}})}
```

Referenzkosten der Epoche = Jahreskosten der Vorlage Standard für ein Spiel mit Mittel-Budget der Epoche. Der Nenner wird damit nie null. Sonderfall: War der alte Preis null (kostenlos, Open Source, unter der Indie-Schwelle) und kostet es nun etwas, gilt fest ΔVertrauen = −30 (LIZ-R38). Vertrauen und Zufriedenheit werden nach jeder Rechnung auf 0–100 begrenzt (LIZ-R37).

| Parameter | Startwert | Bereich | Datei |
| --- | --- | --- | --- |
| Vorlage Indie | Royalty 5 % ab 1 Mio. USD Umsatz pro Spiel, Basis-Support, keine Exklusivität, Updates minor | frei | data/licensing.json |
| Vorlage Standard | Pauschale 10 % des typischen Mittel-Budgets der Epoche pro Spiel + Royalty 5 %, Basis-Support, Updates minor | frei | data/licensing.json |
| Vorlage Premium | Einzelverhandlung, Startvorschlag Pauschale 5 % des AAA-Budgets + Royalty 2 %, Premium-Support, Quellcode optional | frei | data/licensing.json |
| Arbeitsplatz-Abo (ab 2005 verfügbar) | 2.000 USD pro Entwickler und Jahr (2010), mit Epoche skaliert | 500–5.000 | data/licensing.json |
| Großkunden-Schwelle | erwarteter Jahresumsatz aus dem Vertrag > 5 % des eigenen Jahresumsatzes | 1–20 % | data/licensing.json |
| h₀, h₁ | 0,10; 0,30 | 0–0,5; 0–1 | data/licensing.json |
| z₁ … z₅ | 20; 30; 4; 40; 0,5 | – | data/licensing.json |
| v₁ | 60 | 20–100 | data/licensing.json |
| Vertrauensanstieg | +1 pro Quartal | 0–3 | data/licensing.json |
| Open-Source-Bonus bei Vertrauen < 40 | +0,15 auf U für 2 Jahre | 0–0,3 | data/licensing.json |
| Community-Beitrag Open Source | Forschungskosten der Module −15 % | 0–30 % | data/licensing.json |
| Umschulung bei Engine-Wechsel | 4 Wochen 50 % Tempo, danach 4 Wochen 80 % | – | data/licensing.json |
| Support-Anfragen pro Vertrag | 2 pro Monat (Basis), 5 (Premium), +50 % in den ersten 3 Monaten | – | data/licensing.json |
| Eigene Engine für KI-Studios | ab 80 Mitarbeitern und 3 Jahren Gewinn | – | data/ai.json |
| Referenzkosten der Epoche | Jahreskosten Vorlage Standard für ein Mittel-Budget-Spiel der Epoche | – | data/licensing.json |
| Vertrauensverlust von null auf etwas | −30 fest (Open Source zurück zu Gebühren: −40) | 10–50 | data/licensing.json |

## 6 Entscheidungen des Spielers

| Entscheidung | Wann | Optionen | Standard / Delegation |
| --- | --- | --- | --- |
| Lizenzmodell der Engine | Bei Freischaltung, jederzeit änderbar | hausintern, kommerziell, indie-freundlich, Open Source | hausintern bis zur ersten Anfrage |
| Vorlagen festlegen | Erste Anfrage, danach jederzeit | Konditionen je Vorlage | Startvorlagen vorbelegt |
| Anfrage außerhalb der Vorlage | Bei Eingang | annehmen, ablehnen, verhandeln | Regel: „Wenn Anfrage zur Vorlage passt und Kunde kein Rivale, dann annehmen“ |
| Großkunden-Verhandlung | Bei Eingang | Verhandlungstisch | immer beim Spieler, außer vollautomatisch |
| Anforderung eines Lizenznehmers | Bei Eingang | annehmen (Engine-Team), ablehnen, gegen Gebühr | Regel möglich |
| Konditionen ändern | jederzeit | Preise, Laufzeiten, Updates | – (Warnung mit Vertrauensfolge) |
| Engine-Wahl (Lizenzweg) | Projektstart | eigene, fremde, Open Source | Vorschlag nach U |
| Reaktion auf Preis-Schock | Ereignis | akzeptieren, nachverhandeln, Wechsel planen, eigene Engine | – |
| Marke lizenzieren oder anbieten \[1.0, Abschnitt 13\] | Anfrage oder aktiv | Konditionen, Genres | – |

## 7 KI-Verhalten

- KI-Studios wählen Engines nach U (Gewichte nach Persönlichkeit) und wechseln nur über die Hürde.
- KI-Lizenzgeber legen Vorlagen nach Persönlichkeit fest: Engine-Spezialisten günstig und breit, AAA-Studios teuer und exklusiv.
- Ein Engine-Rivale reagiert auf Kundenverluste: Senkt den Preis um 20–40 % oder bietet Quellcode-Zugang an, wenn er in einem Jahr mehr als 20 % seiner Kunden an den Spieler verliert.
- KI-Anbieter lösen Preis-Schocks aus, wenn ihr Umsatz zwei Jahre stagniert und ihr Marktanteil über 30 % liegt (Wahrscheinlichkeit pro Jahr nach KI-Aggressivität).
- KI-Lizenznehmer stellen Anforderungen, wenn ihr geplantes Projekt ein Feature braucht, das die Engine nicht kann, und sie Support basis oder premium haben.
- Lizenznehmer, die stark wachsen, bauen ab der Schwelle eine eigene Engine und kündigen danach.

## 8 Oberfläche

- **Erleben:** Ansicht Lizenzen als Steckleiste je Engine: jeder Kunde eine Karte mit Statuslampe (Form + Farbe), Grund in einem Satz, Umsatz-Sparkline. Ab mehr als zehn Kunden Gruppen nach Vorlage; Großkunden bleiben Karten. Vorlagen als drei Vertragskarten mit Siegel. Großkunden und Preis-Schocks am Verhandlungstisch (S11).
- **Lizenzweg:** Eigener Anbieter als Karte mit Vertrauenswert, Roadmap als Zeitstrom, Konditionen und „Was wäre wenn“-Vergleich mit Alternativen nach U.
- **Analysieren:** Tabelle aller Verträge mit Konditionen, Umsatz, Zufriedenheit, Verlauf; Export.
- **Finanzen:** Jede Engine ist ein eigener Strang im Sankey.

## 9 Ereignisse und Meldungen

| Ereignis | Klasse | Inhalt |
| --- | --- | --- |
| Erste Lizenzanfrage | Entscheidung | Tutorial: „Ein Studio fragt nach deiner Engine. Lizenzieren?“ |
| Großkunde fragt an | Entscheidung | Verhandlungstisch |
| Kunde gefährdet | Ergebnis | Kunde, Grund, Vorschlag |
| Kunde wandert ab | Ergebnis | Kunde, Grund, Ziel-Engine |
| Preis-Schock des Anbieters | Entscheidung | neue Konditionen, Mehrkosten, Optionen |
| Rivale senkt Engine-Preise | Information | Schlagzeile |
| Lizenznehmer baut eigene Engine | Information | Schlagzeile, Vertragsende |
| Lizenznehmer-Spiel wird Hit | Information | „Gebaut mit deiner Engine“, Ruf + |

## 10 Schnittstellen

| System | Richtung | Inhalt |
| --- | --- | --- |
| S01 Kern | ← | Monatlicher Lizenz-Schritt in der Tick-Reihenfolge (nach Betrieb) |
| S02 Produkte | ← | Projekte mit Engine-Wahl, Umsatz pro Spiel für Royalties |
| S03 Engines | ↔ | Engine-Faktor, Module, Versionen, EngineRequest |
| S05 Vertrieb | ← | Netto-Umsatz nach Store- und Händleranteil |
| S06 Betrieb | → | Support-Anfragen im Topf Engine-Support |
| S07 Firma | → | Einnahmen, Kosten, Ruf als Arbeitgeber |
| S08 Markt/KI | ↔ | Engine-Wahl der KI, Rivalen, Persönlichkeiten |
| S09 Übernahmen | ← | Übergang von Verträgen beim Kauf |
| S10 Ziele | → | Ziele „meistlizenzierte Engine“, „Engine des Jahres“ |
| S11 Oberfläche | → | Steckleiste, Verhandlungstisch |

## 11 Abnahmetests

- **LIZ-T01** Gegeben eine eigene Engine mit Modell „hausintern“, wenn ein KI-Studio eine Engine sucht, dann bekommt es keine Lizenz und wählt eine andere Engine.
- **LIZ-T02** Gegeben Vorlage Indie (5 % ab 1 Mio.), wenn ein Spiel 800.000 USD netto umsetzt, dann fließt keine Royalty; bei 1,5 Mio. fließen 25.000 USD.
- **LIZ-T03** Gegeben ein Kunde mit Support basis und 0 % Support-Kapazität, wenn 6 Monate vergehen, dann ist sein Status „gefährdet“ oder schlechter mit Grund „Support-Wartezeit zu lang“.
- **LIZ-T04** Gegeben ein Anbieter mit Vertrauen 80, wenn er die Royalty für Bestandskunden von 5 auf 12 % erhöht, dann sinkt sein Vertrauen um mindestens 40 Punkte und bei Rücknahme steigt es um höchstens die Hälfte wieder.
- **LIZ-T05** Gegeben zwei Engines mit U-Differenz 5 %, wenn ein Studio mit hoher Erfahrung in der schlechteren arbeitet, dann wechselt es nicht.
- **LIZ-T06** Gegeben der Spieler als Lizenznehmer, wenn sein Anbieter einen Preis-Schock auslöst, dann erscheint genau eine Fokus-Karte mit vier Optionen und den Mehrkosten pro Jahr.
- **LIZ-T07** Gegeben eine Open-Source-Engine mit 10 Nutzern, dann sinken die Forschungskosten ihrer Module um den Community-Beitrag.
- **LIZ-T08** Gegeben Exklusivität Genre Rennspiel für Kunde A, wenn Kunde B für ein Rennspiel anfragt, dann wird die Anfrage abgelehnt.
- **LIZ-T09** Simulationslauf: Die Bot-Strategie „nie eigene Engine“ erreicht in mindestens einem Viertel der Läufe einen Platz unter den Top 5 (Balancing-Kennzahl).
- **LIZ-T10** Gegeben der Spieler kauft seinen Engine-Anbieter, dann gehören ihm danach alle Verträge dieser Engine und die Einnahmen erscheinen in seinen Finanzen.

* **LIZ-T11** Gegeben ein Kunde mit Zufriedenheit 95 und alle Faktoren positiv, wenn ein Monat vergeht, dann ist die Zufriedenheit höchstens 100; bei Zufriedenheit 3 und allen Faktoren negativ ist sie danach mindestens 0.
* **LIZ-T12** Gegeben eine kostenlose Engine mit Vertrauen 70, wenn der Anbieter 2 % Royalty einführt, dann sinkt das Vertrauen auf genau 40 und es entsteht keine Division durch null.
* **LIZ-T13** Gegeben Erfahrung 100 mit der aktuellen Engine, dann ist die Hürde 0,10 + 0,30 · 1 = 0,40; bei Erfahrung 0 ist sie 0,10.
* **LIZ-T14** Gegeben E = 1,15, dann ist Qualität 1,0; bei E = 0,3 ist sie 0; bei E = 0,725 ist sie 0,5.
* **LIZ-T15** Gegeben Vorlage Standard, dann beträgt die Royalty 5 % (Datenblatt).

## 12 Spätere Versionen

- **Später:** Genre-Lizenz und Crossover auf dem Markenmarkt (LIZ-M03). Lizenzspiel und Komplettverkauf sind ab 1.0 drin.
- **Später (S13):** eigener Lizenzmarkt für Werkzeuge und Middleware; Projekt-Zweige mit Rückführung (S03); Patente bleiben gestrichen.

## 13 Markenmarkt

**Prefix:** LIZ-M (Regeln), LIZ-MF (Formeln), LIZ-MT (Tests). **Status:** 1.0 für Lizenzspiel und Komplettverkauf.

### 13.1 Zweck und Abgrenzung

Marken werden gehandelt wie Engines. Jedes Studio kann eigene Marken anbieten, fremde Marken lizenzieren oder ganz kaufen. Der Spieler und die KI nutzen dieselben Regeln. Der Markt soll Geschichten erzeugen: die vergessene Kultmarke, die ein kleines Studio wiederbelebt, der Bieterkampf um einen Hit, der Rückkauf der eigenen ersten Marke.

Verträge nutzen dieselbe Vertragsmaske wie Engine-Lizenzen (Pauschale, Royalty, Laufzeit, Exklusivität). Es gibt keine zweite Vertragsmechanik. Marken selbst (Fans, Ruf, Müdigkeit, Welttiefe) definiert S10.

### 13.2 Begriffe

| Begriff | Bedeutung |
| --- | --- |
| Inhaber | Studio, dem die Marke gehört. |
| Lizenznehmer | Studio, das ein Lizenzspiel mit der Marke entwickelt. |
| Lizenzspiel | Ein Spiel mit fremder Marke unter Vertrag. |
| Komplettverkauf | Die Marke wechselt dauerhaft den Inhaber. |
| Markenbörse | Katalog aller offenen Markenangebote im Reiter „Marken“. |
| Mindestwertung | Wertung, die ein Lizenzspiel erreichen muss (Qualitätsklausel). |
| Freigaberecht | Recht des Inhabers, den Release eines Lizenzspiels kurz aufzuhalten. |
| Stärke | Summe der Fans der Marke. |
| Frische | 1 − Müdigkeit der Marke (S10). |
| Markenwert W | Erwarteter Markenanteil am Umsatz über die Laufzeit (LIZ-MF1). |

### 13.3 Daten

**BrandOffer:** id, brandId, ownerId, form (lizenzspiel, komplettverkauf, genre, crossover), vorlage (offen, genreExklusiv, premium, einzeln), genres\[\], plattformen\[\], laufzeitWochen, spieleMax (1–3), pauschaleCent, royaltyBp (500–2000), mindestwertung (0–100), freigabe (ja/nein), autoAnnahme (ja/nein), preisCent (nur Komplettverkauf), gueltigBisWoche.

**BrandLicense:** id, offerId, brandId, ownerId, licenseeId, startWoche, endWoche, spieleErlaubt, spieleGemacht, pauschaleCent, royaltyBp, mindestwertung, freigabe, zufriedenheit (0–100), einnahmenCent, verstoesse, status (aktiv, abgelaufen, entzogen, zurueckgekauft).

Beide liegen im Spielstand unter `market.brands`. Vorlagen und Startwerte liegen in `data/brandmarket.json`.

### 13.4 Regeln

**Freischaltung und Formen**

- **LIZ-M01** \[1.0\] Der Reiter „Marken“ erscheint, sobald der Spieler eine eigene Marke besitzt oder die erste Markenanfrage eines KI-Studios eintrifft. Frühestens 1985. Vorher handeln nur KI-Studios untereinander.
- **LIZ-M02** \[1.0\] Es gibt vier Angebotsformen: Lizenzspiel \[1.0\], Komplettverkauf \[1.0\], Genre-Lizenz \[später\], Crossover \[später\].
- **LIZ-M03** \[später\] Genre-Lizenz: ein Studio darf alle Spiele eines Genres mit der Marke machen, für 5 Jahre. Crossover: zwei Marken in einem Spiel, Fans beider zählen, Royalty an beide Inhaber.

**Lizenzspiel**

- **LIZ-M04** \[1.0\] Ein Lizenzspiel-Angebot enthält: Pauschale, Royalty 5–20 % vom Nettoumsatz, erlaubte Genres und Plattformen, Laufzeit 1–5 Jahre, höchstens 1–3 Spiele, Mindestwertung und Freigaberecht ja/nein.
- **LIZ-M05** \[1.0\] Qualitätsklausel: Liegt die Wertung eines Lizenzspiels unter der Mindestwertung, zahlt der Lizenznehmer eine Strafe von 2 × Pauschale. Die Rechte fallen sofort an den Inhaber zurück (Status „entzogen“). Das Spiel bleibt im Handel.
- **LIZ-M06** \[1.0\] Freigaberecht: Liegt die Prognose 4 Wochen vor Release unter der Mindestwertung, darf der Inhaber den Release einmal um bis zu 8 Wochen aufhalten. Der Lizenznehmer poliert in dieser Zeit weiter. KI-Inhaber nutzen das Recht, wenn die Prognose mehr als 5 Punkte unter der Mindestwertung liegt.
- **LIZ-M07** \[1.0\] Eine Marke hat höchstens 2 aktive Lizenzen zugleich. Bei Vorlage Genre-exklusiv gilt höchstens eine Lizenz je Genre.
- **LIZ-M08** \[1.0\] Der Inhaber darf die Marke weiter selbst nutzen. Ausnahme: Premium-Verträge mit Exklusivität sperren das lizenzierte Genre für den Inhaber während der Laufzeit.

**Wirkung auf Lizenznehmer und Marke**

- **LIZ-M09** \[1.0\] Die Fans der Marke zählen für das Lizenzspiel voll als Startfans, gewichtet mit der Genre-Übertragung (LIZ-MF1).
- **LIZ-M10** \[1.0\] Neue Fans und Ruf aus dem Lizenzspiel wachsen bei der Marke, also beim Inhaber, nicht beim Lizenznehmer.
- **LIZ-M11** \[1.0\] Der Lizenznehmer gewinnt Studio-Ruf aus der Wertung wie bei einem eigenen Spiel.
- **LIZ-M12** \[1.0\] Jedes Lizenzspiel erhöht die Müdigkeit der Marke wie ein Serienteil (S10). Ein schwaches Lizenzspiel (Wertung unter 60 oder unter der Mindestwertung) senkt den Ruf der Marke wie ein eigenes und erhöht die Müdigkeit zusätzlich um 0,10.
- **LIZ-M13** \[1.0\] Die Zufriedenheit einer Markenlizenz (0–100) steigt mit guten Wertungen und sinkt mit Freigabe-Stopps. Bei Zufriedenheit unter 30 verlängert die KI nicht.

**Komplettverkauf**

- **LIZ-M14** \[1.0\] Ein Komplettverkauf überträgt die Marke mit allen Fans, Ruf, Welttiefe, Figuren und Müdigkeit. Laufende Lizenzen gehen mit; die Einnahmen fließen ab der Folgewoche an den Käufer.
- **LIZ-M15** \[1.0\] Der Preisvorschlag folgt LIZ-MF3. Der Verkäufer kann ihn um ±50 % ändern. KI-Käufer zahlen höchstens den eigenen Markenwert × 1,2.
- **LIZ-M16** \[1.0\] Der Verkäufer verliert die Marke vollständig. Eigene Projekte mit der Marke müssen vor dem Verkauf fertig oder abgebrochen sein.

**Markenbörse und Delegation**

- **LIZ-M17** \[1.0\] Die Markenbörse zeigt alle offenen Angebote aller Studios. Der Spieler stellt eigene Marken mit einer Vorlage ein: Offen, Genre-exklusiv oder Premium (Werte in 13.6).
- **LIZ-M18** \[1.0\] Offen und Genre-exklusiv nehmen passende Anfragen automatisch an, wenn das anfragende Studio Studio-Ruf von mindestens 40 hat. Der Wochenbericht nennt jede Annahme. Premium erzeugt immer eine Verhandlung.
- **LIZ-M19** \[1.0\] Delegationsregel: Der Spieler kann festlegen „Anfragen für Genre X mit Mindestwertung Y annehmen“. Die Regel zählt nicht gegen das Entscheidungsbudget.
- **LIZ-M20** \[1.0\] Ein Angebot läuft nach 26 Wochen ab, wenn niemand es annimmt. Der Spieler bekommt dann einen Hinweis mit dem Grund (zu teuer, Marke zu müde, kein passendes Studio).

**KI-Verhalten**

- **LIZ-M21** \[1.0\] Ein KI-Studio bietet eine Marke an, wenn mindestens eins gilt: die Marke ruht seit 3 Jahren oder länger; das Studio hat weniger als 6 Monatskosten in der Kasse; die Genres der Marke liegen außerhalb seiner Stärke (Genre-Erfahrung unter 40).
- **LIZ-M22** \[1.0\] Persönlichkeit (S08): Marken-Fabriken lizenzieren aus, bis zu 2 Lizenzen je Marke. Indies lizenzieren ein; sie fragen eine passende Marke mit 30 % Wahrscheinlichkeit pro Jahr an. Andere Typen handeln nach LIZ-MF4.
- **LIZ-M23** \[1.0\] Rivalen mit Groll 50 oder mehr (S08) lehnen Anfragen des Spielers ab und bieten ihm nichts an. Ausnahme Geldnot: dann bieten sie mit 50 % Aufschlag an.
- **LIZ-M24** \[1.0\] Jedes KI-Studio prüft einmal pro Quartal die Markenbörse und die Marken des Spielers. Es fragt an, wenn LIZ-MF4 einen Gewinn ergibt.

**Spaß-Momente**

- **LIZ-M25** \[1.0\] Kult-Revival: Ruht eine Marke 8 Jahre oder länger und hat sie Müdigkeit unter 0,2 und mindestens 100.000 Fans, trägt sie das Abzeichen „Kult“. Das nächste Spiel der Marke bekommt +25 % Startfans. Die Presse meldet das Revival, egal wer es macht.
- **LIZ-M26** \[1.0\] Bieterwettstreit: Wollen zwei oder mehr Studios dieselbe Marke als Komplettkauf oder Premium-Lizenz, öffnet der Verhandlungstisch (S09) eine Auktion mit 3 Runden. Jede Runde hebt das Mindestgebot um 10 %. Der Spieler sieht die Gegner als Wappen am Tisch.
- **LIZ-M27** \[1.0\] Gerücht: Plant ein KI-Studio, eine Marke des Spielers zu kaufen, läuft 4 Wochen vorher die Tickermeldung „Gerücht: \[Rivale\] will deine Marke \[Name\] kaufen“. Der Spieler kann vorbeugen (Lizenz vergeben, Fortsetzung ankündigen) oder auf das Angebot warten.
- **LIZ-M28** \[1.0\] Rückkauf: Der Spieler kann eine früher verkaufte eigene Marke zurückkaufen. Preis nach LIZ-MF3 mit Faktor 1,3. Gelingt es, meldet das Ereignis „Heimkehr“ +10 % Fans.
- **LIZ-M29** \[1.0\] Verwaiste Marken: Geht ein Studio pleite, versteigert die Konkursmasse-Auktion (S08) seine Marken einzeln. Startgebot 40 % von W. Ohne Gebot ruht die Marke 2 Jahre und kommt dann erneut in die Auktion.

**Oberfläche**

- **LIZ-M30** \[1.0\] Reiter „Marken“ in der Markt-Ansicht, neben „Engines“. Die Marken stehen als Wappen in einem Regal. Größe zeigt die Stärke in drei Stufen (unter 100.000 Fans, bis 1 Mio., darüber). Farbe zeigt die Frische: grün ab 0,7, gelb 0,4–0,7, grau darunter. Abzeichen für Kult, verwaist und Angebot neu. Filter: Genre, Form, Vorlage, Inhaber.
- **LIZ-M31** \[1.0\] Ein Klick auf ein Wappen öffnet die Markenkarte: Fans je Genre, Müdigkeit, Wert W, Royalty-Vorschlag, Mindestwertung, laufende Lizenzen und Lizenzspiele mit Wertung. Eigene Marken haben den Knopf „Anbieten“ mit den drei Vorlagen.

### 13.5 Formeln

Alle Werte als ganze Zahlen: Geld in Cent, Faktoren in Basispunkten, Abschneiden nach jedem Schritt (A22).

**LIZ-MF1 Markenwert:**

```latex
W = \sum_{g \in G} \text{Fans}_g \cdot \text{Kaufquote} \cdot \text{Preis} \cdot \ddot{U}(g) \cdot (1 - \text{Müdigkeit}) \cdot R(n)
```

G sind die im Angebot erlaubten Genres. Fans\_g kommt aus dem Fanprofil der Marke (S10); ohne Profil zählen alle Fans im Heimat-Genre. Preis ist der Vollpreis der Epoche (S05). Ü(g) ist die Genre-Übertragung. R(n) ist der Restjahre-Faktor für n Jahre Laufzeit, aus einer Tabelle.

**LIZ-MF2 Royalty- und Pauschalen-Vorschlag:**

```latex
q = \frac{W}{W + U_{\text{ref}} \cdot R(n)}, \qquad r = \min\big(20\,\%,\ (5\,\% + 15\,\% \cdot q) \cdot m_{\text{Vorlage}}\big), \qquad P = p_{\text{Vorlage}} \cdot W
```

U\_ref ist der erwartete Umsatz eines Mittel-Budget-Spiels der Epoche ohne Marke. q ist der Anteil der Marke am Erfolg.

**LIZ-MF3 Kaufpreis:**

```latex
\text{Preis}_{\text{Kauf}} = W\big|_{G = \text{alle},\ R = 2{,}5} \cdot \Big(1 + 0{,}2 \cdot \frac{\text{Welttiefe}}{100}\Big) \cdot f
```

f = 1,0 normal, 1,3 beim Rückkauf, 0,4 als Startgebot in der Konkursmasse-Auktion.

**LIZ-MF4 KI-Entscheidung:**

```latex
\text{Gewinn} = \text{Umsatz}_{\text{mit Marke}} \cdot (1 - r) - P - \text{Umsatz}_{\text{ohne Marke}}
```

Die KI fragt an oder nimmt an, wenn Gewinn > 0 und ihre Genre-Erfahrung mindestens 40 ist. Sie bietet an, wenn LIZ-M21 gilt und P + erwartete Royalty über dem eigenen Gewinn mit der Marke in der Laufzeit liegen.

### 13.6 Startwerte

| Parameter | Startwert | Bereich | Datei |
| --- | --- | --- | --- |
| Kaufquote | 2.500 bp (25 %) | 1.000–4.000 | data/brandmarket.json |
| Ü(g) Heimat / verwandt / fremd | 10.000 / 6.000 / 2.500 bp | je 0–10.000 | data/brandmarket.json |
| R(n) für 1 / 2 / 3 / 4 / 5 Jahre | 5.000 / 9.000 / 12.500 / 15.500 / 18.000 bp | – | data/brandmarket.json |
| R Komplettverkauf | 25.000 bp | 15.000–40.000 | data/brandmarket.json |
| Vorlage Offen | m = 1,0; p = 10 %; Mindestwertung 60; alle Genres mit Ü ≥ 0,6; automatische Annahme | – | data/brandmarket.json |
| Vorlage Genre-exklusiv | m = 1,2; p = 15 %; Mindestwertung 70; ein Genre; automatische Annahme | – | data/brandmarket.json |
| Vorlage Premium | m = 1,4; p = 20 %; Mindestwertung 80; Freigaberecht; Verhandlung | – | data/brandmarket.json |
| Royalty-Spanne | 500–2.000 bp | fest | data/brandmarket.json |
| Strafe Qualitätsklausel | 2 × Pauschale | 1–4 × | data/brandmarket.json |
| Freigabe-Stopp | höchstens 8 Wochen, einmal je Spiel | 4–12 | data/brandmarket.json |
| Müdigkeit schwaches Lizenzspiel | +0,10 zusätzlich | 0–0,3 | data/brandmarket.json |
| Auto-Annahme ab Studio-Ruf | 40 | 20–70 | data/brandmarket.json |
| Kult-Schwelle | 8 Jahre Ruhe, Müdigkeit < 0,2, ≥ 100.000 Fans | – | data/brandmarket.json |
| Kult-Bonus | +25 % Startfans | 10–50 % | data/brandmarket.json |
| Angebotsdauer | 26 Wochen | 8–52 | data/brandmarket.json |
| Freischaltung | erste eigene Marke oder erste Anfrage, frühestens 1985 | – | data/brandmarket.json |

### 13.7 Ereignisse

| Ereignis | Auslöser | Wirkung |
| --- | --- | --- |
| Markenanfrage | KI-Studio fragt eine Spieler-Marke an (LIZ-M24) | Fokus-Karte mit Angebot, außer eine Vorlage oder Regel nimmt automatisch an |
| Kult-Revival | Kult-Marke bekommt ein neues Spiel | Pressemeldung, +25 % Startfans |
| Bieterwettstreit | zwei oder mehr Interessenten (LIZ-M26) | Auktion am Verhandlungstisch, 3 Runden |
| Gerücht | KI plant Kauf einer Spieler-Marke (LIZ-M27) | Tickermeldung 4 Wochen vorher |
| Heimkehr | Rückkauf gelingt (LIZ-M28) | +10 % Fans, Meldung |
| Verwaiste Marke | Konkurs eines Studios (LIZ-M29) | Auktion mit Startgebot 40 % von W |
| Lizenz entzogen | Wertung unter Mindestwertung (LIZ-M05) | Strafe, Rechte zurück, Meldung an beide |

### 13.8 Schnittstellen

| Spec | Liefert oder nutzt |
| --- | --- |
| S10 Marken | Fans, Fanprofil je Genre, Ruf, Müdigkeit, Welttiefe, Serienteil-Müdigkeit |
| S05 Marketing und Vertrieb | Vollpreis der Epoche, Nettoumsatz, Abzug der Royalty |
| S08 Konkurrenz | Persönlichkeiten (Marken-Fabrik, Indie), Groll, Konkursmasse-Auktion |
| S09 Übernahmen | Verhandlungstisch und Auktion |
| S07 Finanzen | Buchungszeile „Markenlizenzen“, Kasse für Geldnot |
| S11 Oberfläche | Reiter „Marken“, Fokus-Karten, Wochenbericht, Delegationsregeln |

### 13.9 Abnahmetests

- **LIZ-MT01** Gegeben 1.000.000 Fans im Heimat-Genre, Kaufquote 2.500 bp, Preis 4.000 Cent, Müdigkeit 3.000 bp, Laufzeit 2 Jahre, dann ist W = 630.000.000 Cent (6,3 Mio. USD).
- **LIZ-MT02** Gegeben W = 6,3 Mio. USD und U\_ref · R = 9 Mio. USD, dann ist q = 4.117 bp und der Royalty-Vorschlag bei Vorlage Offen 1.117 bp; bei Premium 1.563 bp.
- **LIZ-MT03** Gegeben Mindestwertung 70 und ein Lizenzspiel mit Wertung 64, dann zahlt der Lizenznehmer 2 × Pauschale, die Lizenz hat Status „entzogen“ und ein zweites Spiel ist nicht erlaubt.
- **LIZ-MT04** Gegeben ein Lizenznehmer ohne eigene Fans, wenn er ein Lizenzspiel im Heimat-Genre veröffentlicht, dann starten alle Markenfans als Startfans, und neue Fans landen bei der Marke des Inhabers.
- **LIZ-MT05** Gegeben ein Lizenzspiel mit Wertung 50, dann sinkt der Ruf der Marke wie bei einem eigenen Spiel und die Müdigkeit steigt um den Serienteil-Wert plus 0,10.
- **LIZ-MT06** Gegeben ein Rivale mit Groll 60 und ohne Geldnot, wenn der Spieler seine Marke anfragt, dann lehnt er ab.
- **LIZ-MT07** Gegeben die Regel „Rollenspiel ab Mindestwertung 75 annehmen“, wenn eine passende Anfrage eines Studios mit Ruf 50 kommt, dann wird sie ohne Fokus-Karte angenommen und das Entscheidungsbudget bleibt gleich.
- **LIZ-MT08** Gegeben ein Komplettverkauf einer Marke mit einer laufenden Lizenz, dann fließen die Royalties ab der Folgewoche an den Käufer.
- **LIZ-MT09** Gegeben 1983 und keine eigene Marke, dann ist der Reiter „Marken“ verborgen; gegeben 1986 und die erste Markenanfrage, dann ist er sichtbar.
- **LIZ-MT10** Gegeben ein Konkurs mit einer Marke mit W = 2 Mio. USD, dann startet ihre Auktion bei 800.000 USD.
- **LIZ-MT11** Simulationslauf über 1985–2040: Pro Lauf entstehen im Mittel mindestens 5 Markenlizenzen unter KI-Studios und mindestens ein Kult-Revival (Balancing-Kennzahl).

### 13.10 Spätere Versionen

- Genre-Lizenz und Crossover (LIZ-M03).
- Markenpakete: mehrere Marken in einem Verkauf.
- Lizenzen an Filme und Merchandise-Partner außerhalb der Spielebranche.

## Änderungen nach Prüfung 3

- ΔVertrauen: Nenner ist jetzt max(Kosten\_alt, Referenzkosten der Epoche). Neuer Sonderfall „von null auf etwas“ mit festen −30 (LIZ-R38). LIZ-R16 und LIZ-R24 verweisen darauf.
- Wechsel-Hürde rechnet mit Erfahrung / 100 (Erfahrung 0–100, Hürde 0,10–0,40).
- Vorlage Standard: Royalty 5 % wie im Datenblatt.
- Qualität im Nutzwert: (E − 0,3) / 0,85, begrenzt auf 0–1.
- Alle Zufriedenheiten und Vertrauenswerte werden auf 0–100 begrenzt (LIZ-R37, Formel Z mit clamp).
- Neue Startwerte: Referenzkosten der Epoche, Vertrauensverlust von null auf etwas.
- Neue Tests LIZ-T11 bis LIZ-T15.
- Neuer Abschnitt 13 Markenmarkt mit LIZ-M01 bis LIZ-M31, Formeln LIZ-MF1 bis LIZ-MF4, Startwerten und Tests LIZ-MT01 bis LIZ-MT11. LIZ-R35 und die Entscheidungstabelle verweisen auf 1.0. Genre-Lizenz und Crossover bleiben für später.
