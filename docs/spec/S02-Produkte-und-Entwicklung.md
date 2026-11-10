# S02 Produkte und Entwicklung

**Version:** 1.0, Stand 29.10.2026 · **Quelle:** Produkte (inkl. Marken, Multiplattform, Entwicklungsprozess), Die erste Stunde · **Prefix:** PRD

## 1 Zweck und Abgrenzung

Diese Spec regelt, was ein Produkt ist, wie ein Projekt entsteht, entwickelt, geprüft, gestoppt und veröffentlicht wird, wie seine Qualität und Wertung entstehen und wie Marken und Plattform-Versionen funktionieren. Nicht hier: Engine-Module und Engine-Bindung (S03), Marketing, Release-Bildschirm, Preis und Verkäufe (S05), Betrieb nach dem Release (S06), Teams und Produzenten (S07).

## 2 Begriffe

| Begriff | Bedeutung |
| --- | --- |
| Projekt | Ein Produkt in Entwicklung |
| Produkt | Ein veröffentlichtes Projekt mit Verkäufen und Lebensdauer |
| Produkttyp | Datensatz mit fünf Parametern, der Geschäftsmodell und Lebensdauer festlegt |
| Design-Dokument (Brett) | Planung eines Projekts aus Konzept-Karten und Feature-Karten |
| Feature | Baustein eines Spiels mit Bereich, Aufwand pro Rolle, Modulbedarf und Leistungsverbrauch |
| Bereich | Gameplay, Grafik, Sound, Story oder Technik |
| Bereichsprofil | Verteilung des Aufwands auf die fünf Bereiche, ergibt sich aus den Features |
| Erwartungsprofil | Vom Genre erwartetes Bereichsprofil |
| Arbeitspaket | Aufwand eines Features für eine Rolle |
| Gate | Prüfpunkt zwischen Phasen; das einzige harte Gate ist der Vertical Slice |
| Feature-Freeze | Je Umfang: klein bei 60 % der Produktion, mittel zu Beginn der Beta, groß und AAA bei Alpha (PRD-R27); danach kosten neue Features mehr und erzeugen mehr Bugs |
| Lead-Plattform | Plattform, deren Leistungsbudget den Umfang bestimmt |
| Marke | Spielwelt, in der mehrere Produkte verschiedener Genres erscheinen |
| Archiv | Abgebrochene Projekte, deren Teile spätere Projekte verbilligen |

## 3 Daten

| Entität/Feld | Typ | Einheit/Bereich | Bedeutung |
| --- | --- | --- | --- |
| **ProductType**.id | string | – | z. B. standard, sequel, dlc, mmo, technikUpdate |
| ProductType.requires | Condition | – | Voraussetzung (z. B. veröffentlichtes Spiel, Online-Modul) |
| ProductType.revenueModel | enum | einmal, abo, kaufAbo, inGame, season, pauschal | Umsatzmodell |
| ProductType.lifetime | {shape: enum, weeks: int} | abfallend, plateau, churn; 4–780 | Form und Länge der Verkaufskurve |
| ProductType.teamShare | float | 0–1 | Anteil Kapazität im Betrieb nach dem Release |
| ProductType.brandEffect | {strength: float, freshness: float} | −1…+1 | Wirkung auf die Marke |
| **Project**.id | id\<Project> | – | Kennung |
| Project.owner | id\<Company> | – | Eigentümer |
| Project.type | id\<ProductType> | – | Produkttyp |
| Project.genre / theme / audience | id | – | Konzept |
| Project.scope | enum | klein, mittel, groß, aaa | Umfang |
| Project.brand | id\<Brand>? | – | Marke |
| Project.features | list\<id\<Feature>> | – | Gewählte Features |
| Project.pendingFeatures | list\<id\<EngineRequest>> | – | Bestellte Features (S03) |
| Project.engine | {engineId, version, binding} | binding: fest, mitlaufend | Engine-Bindung (S03) |
| Project.platforms | list<{platformId, isLead, versionQuality: float, bugs: int, certified: bool}> | – | Zielplattformen |
| Project.phase | enum | konzept, preprod, slice, produktion, alpha, beta, gold, launch | Aktuelle Phase |
| Project.status | enum | laeuft, pausiert, abgebrochen, archiviert, veroeffentlicht | Status |
| Project.workPackages | list<{featureId, role, remaining: float}> | Personenwochen | Offener Aufwand |
| Project.bugs | int | ≥ 0 | Bekannte und unbekannte Bugs |
| Project.budget / spent | int | Cent | Budget und ausgegebenes Geld |
| Project.targetDate | Date | – | Zieltermin |
| Project.playtests | list\<id\<Playtest>> | – | Durchgeführte Playtests |
| Project.publisherDeal | id\<PublisherDeal>? | – | Vertrag (S07) |
| Project.releasePackage | id\<ReleasePackage>? | – | Release-Paket (S05) |
| **Feature**.id | string | – | z. B. offeneWelt, dialogbaum |
| Feature.area | enum | gameplay, grafik, sound, story, technik | Bereich |
| Feature.effort | map\<Rolle, float> | Personenwochen bei Umfang mittel; Faktor je Umfang nach PRD-R28 | Aufwand pro Rolle |
| Feature.requiresModule | {module, level} | – | Engine-Voraussetzung |
| Feature.performanceCost | float | Punkte | Verbrauch am Leistungsbudget |
| Feature.baseValue | float | 0–100 | Grundwert q\_f |
| Feature.innovation / stability / fun | float | −5…+5 | Wirkung auf diese drei Werte |
| Feature.successor | id\<Feature>? | – | Nachfolger, der es ersetzt |
| Feature.availableFrom | int | Jahr | Frühestes Jahr |
| **Genre**.expectedProfile | map\<Bereich, float> | Summe 1 | Erwartungsprofil |
| Genre.themeFit | map\<Theme, float> | 0,5–1,3 | Passung zum Thema |
| **Playtest** | {projectId, date, kind: intern/extern, low: float, high: float, weaknesses: list\<string>} | Wertung 1–10 | Ergebnis |
| **Product** | {projectId, releaseDate, pressScore, userScore, sales, activeUsers, satisfaction} | – | Veröffentlichtes Produkt |
| **Brand** | {name, world, awareness, fansByGenre: map, depth, reputation, fatigue, strength, freshness, owner, licenses} | 0–100 je Wert | Marke |
| **ArchiveEntry** | {projectId, genre, brand, reusable: float} | 0–1 | Wiederverwendbarer Anteil |
| Feature.contentLevel / Theme.contentLevel | int | 0–3 | Inhaltsstufe für die Altersfreigabe |
| Project.ageRating | int | 0–3 | Höchste Inhaltsstufe aus Thema und Features (PRD-R18) |
| Playtest.offset | int | bp einer Wertungsstufe | Versatz dieses Playtests, einmal gezogen (PRD-R31) |
| Product.scoreBreakdown | list<{label, value}> | bp | Wasserfall der Wertung inkl. Zeitgeist und Tagesform der Presse |
| QualityNorm | map<{scope, year}, int> | Q-Punkte | Erwartete Qualität Q\_erw je Umfang und Jahr (PRD-R56) |

## 4 Regeln

**Produkttypen**

- PRD-R01 \[1.0\] Jeder Produkttyp ist ein Datensatz mit den fünf Parametern Voraussetzung, Umsatzmodell, Lebensdauer, Teamanteil und Markenwirkung; ein neuer Typ braucht keinen Code.
- PRD-R02 \[1.0\] In 1.0 gibt es die Typen Standardspiel, Sequel, Spin-off, Addon, DLC, MMO, Free-to-Play, Live-Service, Mobile, Remaster, Port, GOTY-Edition, Bundle, Budget-Neuauflage, Retro-Spiel und Technik-Update.
- PRD-R03 \[1.0\] Early Access und Abo-Deal sind Vertriebsformen, die an jeden Typ angehängt werden können; Early Access ist ab 2013 verfügbar, Abo-Deals ab 2017.

**Konzept und Design-Dokument**

- PRD-R10 \[1.0\] Ein Projekt braucht Typ, Genre, Thema, Zielgruppe, Umfang, mindestens eine Plattform und eine Engine (eigene, lizenzierte oder Starter-Engine).
- PRD-R11 \[1.0\] Ein Feature kann nur gewählt werden, wenn die Engine das benötigte Modul in der Stufe hat und die Lead-Plattform das Feature technisch erlaubt; sonst liegt es als gesperrte Karte mit Grund auf dem Brett. Weitere Plattformen, die es nicht erlauben, streichen es (PRD-R61).
- PRD-R12 \[1.0\] Eine gesperrte Feature-Karte kann beim Engine-Team bestellt werden und liegt dann als „ausstehend“ auf dem Brett (Ablauf in S03).
- PRD-R13 \[1.0\] Das Bereichsprofil ergibt sich als Anteil des Aufwands je Bereich an der Summe aller Features; Regler für Bereiche gibt es nicht.
- PRD-R14 \[1.0\] Das erste Projekt eines neuen Spielers (geführter Start) zeigt ein Brett mit nur drei Reihen (Gameplay, Grafik, Sound) und drei vorgewählten Feature-Karten.
- PRD-R15 \[1.0\] Die Summe der Leistungskosten aller Features darf das Leistungsbudget der Lead-Plattform nicht überschreiten.
- PRD-R16 \[1.0\] Ein Feature verliert pro Jahr nach Erscheinen seines Nachfolgers 15 % seines Grundwerts, höchstens bis 30 % des Ausgangswerts.
- PRD-R17 \[1.0\] Folgeversionen (Sequel, Jahresversion, Remaster) übernehmen das Design-Dokument des Vorgängers als Vorlage.
- **PRD-R18** \[1.0\] Jedes Feature und jedes Thema hat eine Inhaltsstufe von 0 bis 3; die Altersfreigabe des Projekts ist die höchste Stufe. Ab Stufe 2 ist die Zielgruppe Kinder ausgeschlossen. Das Brett zeigt die Freigabe live, damit die Entscheidung für eine Schnittfassung (S05) nachvollziehbar ist.

**Entwicklung und Phasen**

- PRD-R20 \[1.0\] Kleine Projekte haben die Phasen Konzept, Produktion, Launch; mittlere Konzept, Pre-Production, Produktion, Beta, Launch; große und AAA-Projekte alle acht Phasen.
- PRD-R21 \[1.0\] Arbeitspakete werden pro Woche von den zugewiesenen Teams nach Rolle abgearbeitet; fehlt eine Rolle, bleibt ihr Paket liegen und das Projekt meldet einen Stau.
- PRD-R22 \[1.0\] Das Vertical-Slice-Gate (groß, AAA) und das Ende der Pre-Production (mittel) erzeugen eine Entscheidung: Fortsetzen, Umsteuern, Pausieren oder Abbrechen.
- PRD-R23 \[1.0\] Alpha, Beta und Gold laufen automatisch weiter, außer die Bug-Zahl liegt über der Schwelle der Phase oder der Termin ist gefährdet.
- PRD-R24 \[1.0\] Ein Feature, das nach dem Feature-Freeze hinzukommt, kostet das 2,5-Fache seines Aufwands und erzeugt doppelt so viele Bugs.
- PRD-R25 \[1.0\] Bugs entstehen pro erledigtem Arbeitspaket und werden durch QA-Kapazität und Testzeit vor dem Release gefunden; unbekannte Bugs werden nach dem Release nach und nach entdeckt (S06).
- PRD-R26 \[1.0\] Jede Konsolen-Zielplattform verlangt eine Zertifizierung; sie scheitert, wenn die Bugs dieser Version über der Schwelle des Herstellers liegen, und verschiebt den Termin um 4 Wochen.
- **PRD-R27** \[1.0\] Der Feature-Freeze liegt je Umfang an einem festen Punkt: klein bei 60 % des Produktionsaufwands, mittel zu Beginn der Beta, groß und AAA bei Alpha. Er ist zugleich die Frist für Engine-Anforderungen (S03).
- **PRD-R28** \[1.0\] Der Aufwand eines Features (Feature.effort, Umfang mittel) wird mit dem Umfangsfaktor multipliziert: klein 0,4, mittel 1, groß 2,5, AAA 5.
- **PRD-R29** \[1.0\] QA findet vor dem Release jede Woche einen Anteil der offenen Bugs nach 5.3; ein Testlabor (S07) erhöht ihn um 30 %. Die Bug-Kurve des Projekts zeigt das als fallende Linie.

**Playtests und Meilenstein-Momente**

- PRD-R30 \[1.0\] Playtests sind ab der Pre-Production möglich; intern kosten sie nur Zeit, extern Geld.
- PRD-R31 \[1.0\] Ein Playtest liefert eine Wertungsspanne und die drei größten Schwächen. Jeder Playtest zieht einmal einen Versatz aus dem Zufallsstrom „projekte“; die Spanne liegt um wahre Prognose plus Versatz, nicht um die wahre Prognose. Mit jeder späteren Phase werden Spanne und möglicher Versatz kleiner (5.7). Frühere Spannen bleiben blass sichtbar, der Fächer wird sichtbar schmaler.
- PRD-R32 \[1.0\] Versatz und Spanne sind so bemessen, dass die wahre Wertung in 75–85 % der Fälle innerhalb der angezeigten Spanne liegt. Die Mitte der Spanne verrät die wahre Wertung nicht.
- **PRD-R33** \[1.0\] Jedes Projekt, auch ein kleines, hat zwei Meilenstein-Momente: das Prototyp-Review (nach 30 % des Aufwands) und das Gold-Review (vor dem Release). Sie kommen als Angebot (Klasse Angebot, keine Pflicht) mit Vorher/Nachher auf der Fokus-Karte.
- **PRD-R34** \[1.0\] Das Prototyp-Review bietet einen Vorschlag aus dem Team an, z. B. einen Feature-Tausch, der das Bereichsprofil verbessert; das Gold-Review die Wahl zwischen Day-One-Patch und Termin halten. Ein Produzent entscheidet nach seinem Qualitätsanspruch (S07).

**Pausieren, Umsteuern, Abbrechen**

- PRD-R40 \[1.0\] Ein pausiertes Projekt gibt seine Teams frei, behält seinen Fortschritt und verliert wöchentlich 2 % seines Interesses; die Wiederaufnahme kostet 3 Wochen Einarbeitung.
- PRD-R41 \[1.0\] Umsteuern ändert Umfang, Features, Plattformen oder Genre; erledigte Arbeitspakete bleiben anteilig erhalten (Genrewechsel 30 %, sonst 100 % der betroffenen Pakete).
- PRD-R42 \[1.0\] Ein Abbruch beendet das Projekt; das Interesse fällt auf null, die Moral der beteiligten Teams sinkt um 10, Ruf und Marke sinken leicht, stärker bei bereits angekündigten Projekten.
- PRD-R43 \[1.0\] Ein abgebrochenes Projekt wird archiviert; ein späteres Projekt derselben Marke oder desselben Genres spart bis zu 25 % des Aufwands für gleiche Features.
- PRD-R44 \[1.0\] Die Prognose bei der Abbruch-Entscheidung zeigt nur noch zu investierende Kosten gegen erwarteten Ertrag, nicht das bereits ausgegebene Geld.
- PRD-R45 \[1.0\] Bei Publisher-Projekten folgt der Abbruch dem Vertrag: Vorschuss zurückzahlen oder der Publisher übernimmt Projekt und Marke (S07).

**Qualität und Wertung**

- PRD-R50 \[1.0\] Die Qualität Q wird nach 5.1 berechnet und mit ihrer Aufschlüsselung gespeichert.
- PRD-R51 \[1.0\] Die Pressewertung ergibt sich aus Q im Verhältnis zur Erwartung des Umfangs in der Epoche; ein AAA-Spiel braucht für dieselbe Wertung mehr Q als ein kleines Spiel. Die Erwartung wird automatisch aus dem Vorjahr kalibriert (PRD-R56).
- PRD-R52 \[1.0\] Auf den Stufen Entspannt und Leicht (A03) bekommt ein Spiel mit Genre-Thema-Passung ≥ 1,0 nie unter 5,0.
- PRD-R53 \[1.0\] Die Spielerwertung weicht von der Pressewertung ab, wenn das Interesse zum Release höher war als die Qualität rechtfertigt (Enttäuschung, S05).
- **PRD-R54** \[1.0\] Der Trend von Genre und Thema geht nicht in Q ein. Er wirkt voll auf die Startverkäufe (V₀, S05) und auf die Wertung nur als Zeitgeist-Bonus von höchstens ±0,3 (5.2), der im Wasserfall als eigener Balken „Zeitgeist“ erscheint.
- **PRD-R55** \[1.0\] Der Zufallsanteil der Pressewertung erscheint im Wasserfall als eigener Balken „Tagesform der Presse“. Er wird aus der Tabelle der inversen Normalverteilung (Numerik-Anhang S12) mit dem Zufallsstrom „projekte“ gezogen; seine Stärke folgt der Einstellung Presse-Zufall (aus, gering, normal).
- **PRD-R56** \[1.0\] Die erwartete Qualität Q\_erw je Umfang ist der Median von Q aller Releases dieses Umfangs im Vorjahr (alle Studios). Gibt es weniger als fünf solche Releases, gilt der Vorjahreswert plus 3 %. Für 1980 und für das erste Jahr eines Umfangs gelten die Startwerte aus 5.2.
- **PRD-R57** \[1.0\] Die Einstellung Presse-Strenge verschiebt Q\_erw um 8 % je Stufe nach oben oder unten.

**Multiplattform**

- PRD-R60 \[1.0\] Ein Projekt hat genau eine Lead-Plattform; jede weitere Plattform kostet Anpassungsaufwand nach 5.4.
- PRD-R61 \[1.0\] Die Lead-Plattform entscheidet über die Features (PRD-R11). Weitere Plattformen streichen automatisch jedes Feature, das sie technisch nicht unterstützen, und bekommen bei kleinerem Leistungsbudget eine abgespeckte Version; fällt mehr als 25 % der Leistungskosten weg, warnt das Spiel vor einer schwachen Version. Die Warnung zeigt die gestrichenen Feature-Karten je Plattform.
- PRD-R62 \[1.0\] Bugs, Wertung, Zertifizierung und Plattformgebühr gelten je Plattform; eine Version unter 6,0 senkt die Wertung der übrigen Versionen um 0,2.
- PRD-R63 \[1.0\] Eine angekündigte Konsole kann nur Zielplattform werden, wenn die Firma ein Devkit hat (S08).

**Marken**

- PRD-R70 \[1.0\] Sichtbar sind nur Stärke und Frische; Bekanntheit, Fans pro Genre, Welttiefe, Ruf und Müdigkeit rechnen intern.
- PRD-R71 \[1.0\] Startfans eines neuen Markentitels ergeben sich nach 5.5 aus den Fans je Genre, der Genre-Übertragung, dem Ruf und der Müdigkeit.
- PRD-R72 \[1.0\] Ein Titel unter 6,0 senkt den Ruf der Marke; ein Titel ab 8,0 steigert Bekanntheit und Fans im eigenen Genre.
- PRD-R73 \[1.0\] Jeder Titel innerhalb von 18 Monaten nach dem letzten erhöht die Müdigkeit; ohne neuen Titel sinkt sie um 2 Punkte pro Monat.
- PRD-R74 \[1.0\] Marken gehören einer Firma, gehen bei Übernahmen mit und können lizenziert werden (S04, S09).
- **PRD-R75** \[1.0\] Zehn Jahre nach dem ersten Titel einer Marke erscheint die Vorschlag-Karte „Markenjubiläum“ mit den Optionen Sammlung, Remaster oder nichts (S05); sie ist keine Pflicht.
- **PRD-R76** \[1.0\] Marken lassen sich über den Markenmarkt (S04, Abschnitt Marken) lizenzieren, kaufen und verkaufen. Ein Lizenzspiel startet mit den Startfans der fremden Marke nach 5.5; neue Fans und Rufänderungen bleiben bei der Marke und damit beim Eigentümer.

## 5 Formeln und Startwerte

**5.1 Qualität**

```latex
Q = \Big(\textstyle\sum_f q_f \cdot T_f\Big)\cdot \text{Profil}_{\text{Genre}} \cdot E \cdot P_{\text{Genre,Thema}} \cdot (1 - B)
```

q\_f = Grundwert des Features (nach Alterung), T\_f = Ausführung durch das Team (Teamstärke im Bereich/100 × (1 + 0,2 × Erfahrung mit Genre und Engine)), E = Engine-Faktor (S03), P = Genre-Thema-Passung und B = Anteil verbliebener Bugs. Der Trend (S08) steht bewusst nicht in Q: Er wirkt auf die Startverkäufe (S05) und als Zeitgeist-Bonus auf die Wertung (5.2, PRD-R54).

```latex
\text{Profil}_{\text{Genre}} = 1 - \alpha \cdot \tfrac{1}{2}\sum_b \big|\text{ist}_b - \text{erwartet}_b\big|
```

**5.2 Pressewertung**

```latex
\text{Wertung} = \text{clamp}\Big(1,\ 10,\ 5{,}5 + 4{,}5 \cdot \tanh\big(k \cdot (\tfrac{Q}{Q_{\text{erw}}(\text{Umfang, Jahr})} - 1)\big) + Z + \varepsilon\Big),\quad Z = \text{clamp}(-0{,}3;\ 0{,}3;\ T - 1),\quad \varepsilon = \sigma \cdot \Phi^{-1}(u)
```

T = Trend-Faktor von Genre und Thema (S08), Z = Zeitgeist-Balken im Wasserfall. ε = Balken „Tagesform der Presse“: u wird aus dem Zufallsstrom „projekte“ gezogen, Φ⁻¹ kommt aus der Tabelle der inversen Normalverteilung (Numerik-Anhang S12); σ folgt der Einstellung Presse-Zufall: aus 0, gering 0,15, normal 0,3 (Standard).

Q\_erw(Umfang, Jahr) = Median von Q aller Releases dieses Umfangs im Vorjahr · (1 + 0,08 · s), s = Stufe der Presse-Strenge (Standard 0, je Stufe ±8 %). Bei weniger als fünf Releases im Vorjahr gilt der Vorjahreswert · 1,03. Startwerte (Q-Punkte, Ankerwerte für den Abgleich in Etappe 0): klein 60 und mittel 150 im Jahr 1980, groß 400 im ersten Jahr mit großen Projekten, AAA 900 ab 1998. So passt sich die Erwartung selbst an Stand der Technik und Feature-Angebot an, und die Durchschnittswertung bleibt über die Jahrzehnte stabil.

**5.3 Bugs**

```latex
\text{Bugs}_{\text{neu}} = \text{Pakete} \cdot b_0 \cdot (1 + \text{Schuld}) \cdot (1 + 0{,}5\cdot\text{Innovation}),\qquad B = \frac{\text{Bugs}_{\text{offen}}}{\text{Bugs}_{\text{offen}} + c_B},\qquad \text{Gefunden}_{\text{Woche}} = \text{Bugs}_{\text{offen}} \cdot 0{,}15 \cdot \min\Big(1,\ \tfrac{\text{QA-Kapazität}}{\text{Pakete}}\Big) \cdot (1 + 0{,}3 \cdot \text{Testlabor})
```

QA-Kapazität = Arbeitspakete pro Woche, die QA-Rollen prüfen können (S07); Pakete = offene Arbeitspakete des Projekts; Testlabor = 1, wenn der Standort ein Testlabor hat, sonst 0. Gefundene Bugs werden bekannt und von den Teams behoben; nur unbekannte Bugs gehen beim Release an S06. Die Bug-Kurve zeigt offene Bugs als fallende Linie (PRD-R29).

**5.4 Plattform-Anpassung**

```latex
\text{Aufwand}_p = \text{Aufwand}_{\text{Lead}} \cdot \big(a_0 + a_1 \cdot \text{Leistungsabstand}_p\big)\cdot (1 - m_{\text{Plattformmodul}})
```

**5.5 Startfans einer Marke**

```latex
\text{Startfans} = \sum_g \text{Fans}_g \cdot \text{Übertragung}(g \rightarrow g_{\text{neu}}) \cdot \tfrac{\text{Ruf}}{100} \cdot \big(1 - \tfrac{\text{Müdigkeit}}{100}\big)
```

**5.6 Umfang, Feature-Freeze und Altersfreigabe**

Aufwand eines Features = Feature.effort · Umfangsfaktor (klein 0,4, mittel 1, groß 2,5, AAA 5). Freeze: klein bei 60 % des Produktionsaufwands, mittel zu Beginn der Beta, groß und AAA bei Alpha. Altersfreigabe = max(Inhaltsstufe des Themas, höchste Inhaltsstufe der Features); ab 2 ist die Zielgruppe Kinder gesperrt.

**5.7 Playtest-Versatz**

Anzeige = \[W + v − S; W + v + S\], v gleichverteilt in \[−V; +V\], einmal je Playtest aus dem Strom „projekte“, W = Prognose ohne Tagesform der Presse. Phasenwerte S / V intern: Pre-Production 1,2 / 1,5, Produktion 0,8 / 1,0, Beta 0,4 / 0,5; extern beide halbiert. Da S/V = 0,8, liegt W in 80 % der Fälle in der Spanne; die Mitte der Spanne ist um v verschoben und verrät W nicht.

| Parameter | Startwert | Bereich | Datei |
| --- | --- | --- | --- |
| Profil-Gewicht α | 0,8 | 0,4–1,2 | data/dev/quality.json |
| Steilheit k der Wertung | 1,6 | 1–3 | data/dev/quality.json |
| Bugs pro Arbeitspaket b₀ | 0,8 | 0,3–2 | data/dev/bugs.json |
| Bug-Halbwert c\_B | 200 (klein) bis 4.000 (AAA) | – | data/dev/bugs.json |
| Aufschlag Feature nach Freeze | 2,5 × Aufwand, 2 × Bugs | 1,5–4 | data/dev/phases.json |
| Plattform-Anpassung a₀ / a₁ | 0,15 / 0,35 | – | data/dev/platforms.json |
| Abzug starkes Plattformmodul m | 0,5 | 0–0,8 | data/dev/platforms.json |
| Warnschwelle schwache Version | 25 % Leistungsverlust | 10–40 % | data/dev/platforms.json |
| Alterung eines Features | −15 % pro Jahr, min. 30 % | – | data/dev/features.json |
| Interesseverlust bei Pause | 2 % pro Woche | 0–5 % | data/dev/projects.json |
| Einarbeitung nach Pause | 3 Wochen | 1–8 | data/dev/projects.json |
| Archiv-Ersparnis | bis 25 % | 0–50 % | data/dev/projects.json |
| Moralverlust bei Abbruch | −10 | −20…0 | data/dev/projects.json |
| Playtest-Spanne (Pre-Prod / Produktion / Beta) | Spanne ±1,2 / ±0,8 / ±0,4, Versatz bis ±1,5 / ±1,0 / ±0,5 intern; extern beides halbiert (5.7) | – | data/dev/playtests.json |
| Kosten externer Playtest | 2 % des Projektbudgets, min. 5.000 | – | data/dev/playtests.json |
| Zertifizierungs-Schwelle | 50 offene Bugs je 10 Mio. Budget | – | data/platforms/\*.json |
| Verschiebung bei gescheiterter Zertifizierung | 4 Wochen | 2–8 | data/dev/phases.json |
| Markenmüdigkeit pro Titel innerhalb 18 Monaten | +15 | 5–30 | data/brands.json |
| Abbau der Müdigkeit | −2 pro Monat | – | data/brands.json |
| Genre-Übertragung (gleich / nah / fern) | 0,9 / 0,6 / 0,2 | – | data/genres.json |
| Zeitgeist-Bonus | ±0,3 | 0–0,5 | data/dev/quality.json |
| Presse-Zufall σ (aus / gering / normal) | 0 / 0,15 / 0,3 | – | data/dev/quality.json |
| Presse-Strenge je Stufe | ±8 % auf Q\_erw | 4–15 % | data/dev/quality.json |
| Q\_erw-Start (klein / mittel / groß / AAA) | 60 / 150 / 400 / 900 | Abgleich Etappe 0 | data/dev/quality.json |
| Umfangsfaktor Feature-Aufwand (klein / mittel / groß / AAA) | 0,4 / 1 / 2,5 / 5 | – | data/dev/phases.json |
| QA-Fundrate pro Woche / Bonus Testlabor | 0,15 / +30 % | 0,05–0,3 / 0–50 % | data/dev/bugs.json |
| Dauer der Zertifizierung | 4 Wochen | 2–8 | data/platforms/\*.json |
| Zeitpunkt Prototyp-Review | 30 % des Aufwands | 20–40 % | data/dev/phases.json |
| Markenjubiläum | 10 Jahre nach dem ersten Titel | – | data/brands.json |

**Umfang (Ankerwerte, Teamgröße und Dauer):**

| Umfang | Dauer | Team 1980 | Team 2000 | Team 2020 | Phasen |
| --- | --- | --- | --- | --- | --- |
| Klein | 3–6 Monate | 1–3 | 3–8 | 3–15 | 3 |
| Mittel | 9–15 Monate | 3–6 | 10–30 | 20–60 | 5 |
| Groß | 18–30 Monate | – | 30–80 | 60–150 | 8 |
| AAA | 36–60 Monate | – | 80–150 (ab 1998) | 150–500 | 8 |

## 6 Entscheidungen des Spielers

| Entscheidung | Wann | Optionen | Standard/Delegation |
| --- | --- | --- | --- |
| Projekt anlegen | jederzeit | Typ, Konzept, Umfang, Features, Plattformen, Engine, Marke | Produzent nach Vorgabe |
| Feature bestellen | gesperrte Karte | bestellen oder nicht | Produzent nach Risikofreude |
| Teams zuweisen | jederzeit | Team ziehen oder Menü | Produzent |
| Gate | Vertical Slice bzw. Ende Pre-Production | Fortsetzen, Umsteuern, Pausieren, Abbrechen | Pflicht-Entscheidung; Produzent schlägt vor |
| Playtest ansetzen | ab Pre-Production | intern, extern | Regel „je Phase ein interner Test“ |
| Feature nach Freeze nachziehen | ab Feature-Freeze (PRD-R27) | ja, nein | nein |
| Pausieren, umsteuern, abbrechen | jederzeit | – | manuell |
| Lead-Plattform und weitere | Konzept, bis Alpha änderbar | Plattformen wählen | Vorschlag nach Marktanteil |
| Marke zuordnen | Konzept | neue oder bestehende Marke | neue Marke |
| Prototyp-Review | 30 % des Aufwands | Vorschlag annehmen (z. B. Feature-Tausch), ablehnen | Angebot; Produzent nach Qualitätsanspruch |
| Gold-Review | vor dem Release | Day-One-Patch, Termin halten | Angebot; Termin halten |
| Markenjubiläum | 10 Jahre nach dem ersten Titel | Sammlung, Remaster, nichts | Vorschlag; nichts |
| Fremde Marke nutzen | Konzept | Lizenz oder Kauf über den Markenmarkt (S04) | keine |

## 7 KI-Verhalten

KI-Studios legen Projekte über dieselben Daten an. Genre und Thema wählen sie nach Lieblingsgenres, Trend und Risiko; Features nach Budget und Risikofreude bis zum Leistungsbudget. Über einen Abbruch entscheiden sie nach MRK-R43 (S08); diese Spec führt keine eigene Abbruchregel für KI-Studios. Sie pausieren nicht, sondern brechen ab oder setzen fort. Marken pflegen sie nach Persönlichkeit (Marken-Fabrik: Titel alle 12–18 Monate trotz Müdigkeit; Indie-Liebling: neue Marken). Playtests nutzen sie bei großen Projekten einmal pro Phase.

## 8 Oberfläche

- **Projekt anlegen** (Brett): Konzept-Karten, Feature-Stapel, fünf Bereichsreihen mit Balken „ist gegen erwartet“, Prognose-Fächer, Leistungsbudget je Plattform, Kosten, Dauer, Team, voraussichtliche Release-Woche, Altersfreigabe mit der höchsten Inhaltsstufe als Grund. Gesperrte Karten zeigen das fehlende Modul und „Bestellen“.
- **Laufendes Projekt:** Phasenstrecke mit Gate-Raute, Kanban je Rolle mit Stau, Bug-Kurve (fällt durch QA), Freeze-Markierung je Umfang, Budget, Prognose-Fächer je Playtest, Knöpfe Playtest, Feature nachziehen, Teams, Pausieren, Abbrechen.
- **Marken:** Stammbaum mit Titeln auf der Zeitachse, Stärke und Frische, „Pause empfohlen bis …“.
- **Analysieren:** Feature-Tabelle (Aufwand je Rolle, Modul, Leistung, Wirkung), Aufschlüsselung von Q und Wertung als Tabelle mit Formel; der Wertungs-Wasserfall hat eigene Balken „Zeitgeist“ und „Tagesform der Presse“, Marken-Werte intern.
- **Portfolio-Wand** im Spätspiel (S11).

## 9 Ereignisse und Meldungen

- Gate erreicht (Entscheidung), Stau in einer Rolle (Ergebnis), Termin gefährdet (Entscheidung: verschieben, Crunch, Features streichen), Zertifizierung gescheitert (Ergebnis), Playtest-Ergebnis (Ergebnis), schwache Plattform-Version (Ergebnis), Projekt abgebrochen (Chronik).
- Ketten: „Kritischer Bug kurz vor Gold“ (verschieben, Day-One-Patch, so veröffentlichen).
- Angebote: Prototyp-Review und Gold-Review (PRD-R33, R34). Vorschlag: Markenjubiläum (PRD-R75).

## 10 Schnittstellen

| Richtung | System | Inhalt |
| --- | --- | --- |
| liest | S03 | Modulstufen, Engine-Faktor E, Schuld, Bindung, Anforderungen |
| liest | S07 | Teams, Stärke, Erfahrung, Moral, Produzenten, QA-Kapazität, Publisher-Vertrag |
| liest | S08 | Plattformen, Leistungsbudget, Devkits, Trends, Erwartungsniveau |
| schreibt an | S05 | Fertiges Projekt, Wertung, Interesse-Basis, Release-Paket |
| schreibt an | S06 | Unbekannte Bugs, Produkttyp für den Betrieb |
| schreibt an | S01 | Ereignisse, Chronik, Aufschlüsselungen |
| schreibt an | S10 | Erfolge (z. B. erstes Spiel über 9,0) |
| liest | S04 | Markenlizenzen und Markenkäufe aus dem Markenmarkt |
| liest | S12 | Tabellen für tanh und die inverse Normalverteilung (Numerik-Anhang) |

## 11 Abnahmetests

- PRD-T01 Gegeben ein Rollenspiel mit 10 % Story-Anteil und Erwartung 30 %, wenn es veröffentlicht wird, dann zeigt die Aufschlüsselung einen negativen Profilbeitrag und das Wissensbuch einen Eintrag dazu.
- PRD-T02 Gegeben zwei Spiele mit gleichem Genre, Thema und Features, aber verschiedenen Teams und Engines, wenn sie veröffentlicht werden, dann unterscheiden sich ihre Wertungen messbar.
- PRD-T03 Gegeben ein Feature mit Modulbedarf Physik 4 und eine Engine mit Physik 2, wenn das Brett geöffnet wird, dann ist die Karte gesperrt und bestellbar.
- PRD-T04 Gegeben ein AAA-Projekt am Vertical Slice, wenn die Phase endet, dann entsteht eine Pflicht-Entscheidung mit vier Optionen.
- PRD-T05 Gegeben ein abgebrochenes Rollenspiel, wenn später ein Rollenspiel mit gleichen Features startet, dann sinkt dessen Aufwand um bis zu 25 %.
- PRD-T06 Gegeben ein Projekt, das nach dem Freeze ein Feature erhält, wenn es fertig wird, dann hat es das 2,5-Fache an Aufwand und doppelt so viele Bugs für dieses Feature.
- PRD-T07 Gegeben 100 Playtests derselben Phase, wenn die Prognose ohne Tagesform der Presse mit der angezeigten Spanne verglichen wird, dann liegen 75–85 davon in der Spanne, die Mitte der Spanne trifft die Prognose nicht systematisch, und Spanne und Versatz sind in jeder späteren Phase kleiner.
- PRD-T08 Gegeben eine Weitere-Plattform mit 40 % Leistungsverlust, wenn das Projekt veröffentlicht wird, dann wurde vorher gewarnt und die Gesamtwertung sinkt um 0,2.
- PRD-T09 Gegeben drei Titel einer Marke in 12 Monaten, wenn ein vierter erscheint, dann ist dessen Startinteresse durch Müdigkeit sichtbar kleiner.
- PRD-T10 Gegeben ein Headless-Lauf 1980–2040, wenn die Durchschnittswertung je Jahrzehnt gemessen wird, dann bleibt sie zwischen 6,0 und 7,0, und Q\_erw je Umfang entspricht jedes Jahr dem Median des Vorjahres. Mit Presse-Strenge eine Stufe höher sinkt der Durchschnitt um 0,3 bis 0,8.
- **PRD-T11** Gegeben zwei gleiche Spiele, eines im Trend (T = 1,4), eines außer Trend (T = 0,7), wenn beide veröffentlicht werden, dann ist ihr Q gleich, der Zeitgeist-Balken +0,3 bzw. −0,3, und die Startverkäufe unterscheiden sich voll nach Trend.
- **PRD-T12** Gegeben Presse-Zufall aus, wenn dasselbe Spiel mit zwei Seeds veröffentlicht wird, dann ist die Wertung gleich und der Balken „Tagesform der Presse“ 0.
- **PRD-T13** Gegeben ein Projekt mit 400 offenen Bugs, 20 Paketen und QA-Kapazität 10 ohne Testlabor, wenn eine Woche vergeht, dann werden 30 Bugs gefunden; mit Testlabor 39.
- **PRD-T14** Gegeben ein Spiel mit Thema Stufe 1 und einem Feature Stufe 2, wenn das Brett geöffnet wird, dann zeigt es Freigabe 2 und die Zielgruppe Kinder ist gesperrt.
- **PRD-T15** Gegeben ein kleines Projekt, wenn es fertig wird, dann gab es genau ein Prototyp-Review und ein Gold-Review als Angebot, und Ablehnen ändert nichts am Projekt.
- **PRD-T16** Gegeben ein Feature mit 10 Personenwochen, wenn es in einem AAA-Projekt gewählt wird, dann kostet es 50 Personenwochen, in einem kleinen 4.
- **PRD-T17** Gegeben eine Lead-Plattform, die ein Feature erlaubt, und eine weitere, die es nicht erlaubt, wenn das Feature gewählt wird, dann ist es wählbar, die weitere Version verliert es, und die Warnung zeigt die Karte.
- **PRD-T18** Gegeben ein Spiel auf Lizenz einer fremden Marke, wenn es Fans gewinnt, dann gehören diese Fans der Marke und ihrem Eigentümer.

## 12 Spätere Versionen

- &#91;1.1\] Jahresversionen (Sport) als eigener Rhythmus mit Lizenzkosten für Ligen.
- &#91;später\] Co-Entwicklung mit KI-Studios (geteilte Arbeitspakete, siehe S13).
- &#91;später\] Feinere Entwicklungsbereiche neben Features (z. B. Leveldesign als eigene Disziplin).
- &#91;später\] Marken-Lizenzen an Film- und Serienstudios als Mechanik statt Ereignis (S13).

## Änderungen nach Prüfung 3

- **Playtests (M3):** Jeder Playtest zieht einen Versatz; die Spanne liegt um Prognose plus Versatz, beide schrumpfen je Phase (PRD-R31, R32, 5.7, PRD-T07).
- **Qualität und Wertung (M5):** Trend aus Q entfernt, wirkt auf V₀ und als Zeitgeist ±0,3 (PRD-R54, 5.1, 5.2, PRD-T11); ε als Balken „Tagesform der Presse“ aus Tabelle, σ 0 / 0,15 / 0,3 (PRD-R55, PRD-T12); Q\_erw als Median des Vorjahres je Umfang mit Startwerten 1980 (PRD-R56); Presse-Strenge ±8 % je Stufe (PRD-R57, PRD-T10).
- **Widersprüche:** Mindestwertung nur Entspannt/Leicht (PRD-R52); Lead-Plattform entscheidet, weitere streichen Features mit Anzeige (PRD-R11, R61, PRD-T17); Freeze je Umfang (PRD-R27, Begriffe); Umfangsfaktor für Feature-Aufwand (PRD-R28, PRD-T16); Zertifizierung 4 Wochen (Parameter).
- **Meilensteine (S1):** Prototyp-Review und Gold-Review als Angebot für jedes Projekt (PRD-R33, R34, PRD-T15).
- **Altersfreigabe und QA (K4):** Inhaltsstufen 0–3 (PRD-R18, PRD-T14); QA-Fundrate und Bug-Kurve (PRD-R29, 5.3, PRD-T13).
- **Markenjubiläum (K6):** PRD-R75.
- **KI-Abbruch:** nur Verweis auf MRK-R43 (Abschnitt 7).
- **Markenmarkt:** Lizenz und Kauf fremder Marken über S04, Fans bleiben bei der Marke (PRD-R76, PRD-T18).
