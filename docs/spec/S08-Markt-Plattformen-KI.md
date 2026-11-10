# S08 Markt, Plattformen und KI-Konkurrenz

**Version:** 1.0, Stand 29.10.2026 · **Quelle:** Design-Dokument, Kapitel Markt und KI-Konkurrenz (Plattformen, technischer Fortschritt, dynamischer Lebenszyklus, Rivalen, Plattformbeziehungen, Devkits und Konsolenstart, Krisen und Ereignisketten, Zukunftsepoche, Boom und Krise) · **Prefix:** MRK

## 1 Zweck und Abgrenzung

S08 beschreibt die Welt außerhalb der Firma des Spielers: Plattformen und ihre Hersteller, den Stand der Technik, den dynamischen Lebenszyklus von Konsolen, Devkits, Plattformbeziehungen, Trends und Kundengruppen, die Konkurrenzdichte, alle KI-Studios und Rivalen, Krisen und Ereignisketten, die Zukunftsepoche sowie Boom und Krise.

Nicht in S08: Store-Anteile, Preise, Piraterie und Verkaufskurve (S05), Lizenzentscheidungen der KI im Detail (S04), Übernahmen und Plattformhersteller als Kaufziel (S09), Firmen-Interna der KI (gleiche Regeln wie S07).

## 2 Begriffe

| Begriff | Bedeutung |
| --- | --- |
| Plattform | Konsole, Handheld, Heimcomputer, PC, Mobile oder Cloud mit Leistungsprofil und eigenem Markt |
| Stand der Technik | Jährlich steigender Referenzwert für Leistung und Engine-Modulstufen |
| Rückstand | Abstand einer Plattform zum Stand der Technik und zur Nachfolgegeneration |
| Aktive Basis B | Zahl der Menschen, die eine Plattform derzeit nutzen und Spiele kaufen |
| Attraktivität A | Monatlicher Wert, aus dem Zugang und Schwund der Basis folgen |
| Hits₁₂ | Gewichtete Summe starker Spiele der letzten 12 Monate auf einer Plattform |
| Devkit-Welle | Zeitfenster, in dem ein Hersteller Entwicklergeräte an eine Gruppe von Studios vergibt |
| Beziehungswert | 0–100 pro Plattformhersteller und Firma |
| Konkurrenzdichte | Summe der Release-Gewichte aller angekündigten Spiele einer Woche und Zielgruppe |
| Rivale | Eines von 3–5 benannten KI-Studios mit tieferer Strategie und Beziehung zum Spieler |
| Ereigniskette | Ereignis mit Auslöser, Antwortoptionen, verzögerten Folgen und möglicher Eskalation |
| Marktphase | Boom, normal oder Krise |

## 3 Daten

| Entität.Feld | Typ | Einheit/Bereich | Bedeutung |
| --- | --- | --- | --- |
| Platform.id / name | string | – | Fiktiver Name, angelehnt an reale Geschichte |
| Platform.type | enum | console, handheld, homecomputer, pc, mobile, cloud | Art |
| Platform.manufacturerId | string | – | Hersteller (KI-Firma oder Spieler \[später\]) |
| Platform.announceYear / releaseWeek / endWeek | int | Woche seit 1980 | Ankündigung, Start, Produktionsende |
| Platform.status | enum | announced, active, discontinued | Status |
| Platform.profile | map | 0–100 je cpu, gpu, memory, storage, online, input | Leistungsprofil bei Erscheinen (fest; PC und Mobile: laufend) |
| Platform.medium | enum | cartridge, floppy, cd, dvd, bluray, download | Datenträger |
| Platform.budget | map | Einheiten | Leistungsbudget für Features (S02); bei angekündigten Plattformen als Spanne \[min, max\] |
| Platform.price | int | Cent | Gerätepreis |
| Platform.licenseFee | float | 0–0,3 | Lizenzgebühr pro verkauftem Spiel |
| Platform.base | int | Personen | Aktive Basis B |
| Platform.attractiveness | float | – | A |
| Platform.hits12 | float | – | Hits₁₂ |
| Platform.backwardCompatibleWith | string\[\] | – | Abwärtskompatibilität |
| Platform.devkitWaves | Wave\[\] | 3 | Welle, Startwoche, Empfänger, Gebühr |
| Platform.successorId | string? | – | Geplanter Nachfolger (Roadmap) |
| Platform.pcTiers | map | Anteile Einstieg/Mittel/High-End | Nur bei Schalter PC-Leistungsklassen |
| Company.platformExperience | map | 0–100 je Plattform | Erfahrung mit fester Hardware |
| PlatformRelation.value | int | 0–100 | Beziehung Firma–Hersteller |
| PlatformRelation.history | Entry\[\] | – | Gründe der Änderungen |
| ExclusiveDeal | Objekt | – | Hersteller, Projekt/Marke, Art (dauerhaft, zeitexklusiv), Dauer, Zahlung, Marketing |
| Trend.popularity | map | 0,5–1,5 je Genre und Thema | Beliebtheit |
| Trend.saturation | map | 0–1 je Genre | Übersättigung |
| AudienceSegment.size | map | Personen je Segment und Region | Kinder, Gelegenheitsspieler, Kernspieler, Erwachsene |
| ReleaseCalendar | Entry\[\] | – | Angekündigte Releases aller Firmen mit Woche und Gewicht |
| AIStudio.personality | enum | indie, mid, aaa, engineSpecialist, publisher, manufacturer | Persönlichkeit |
| AIStudio.weights | map | – | Gewichte für Entscheidungen (Kosten, Qualität, Risiko, Marke) |
| AIStudio.favoriteGenres | string\[\] | 1–3 | Lieblingsgenres |
| AIStudio.risk | float | 0–1 | Neigung zu neuen Marken |
| Rival.chief | Person | – | Name, Porträt, Charakter |
| Rival.archetype | enum | engineGiant, brandFactory, indieDarling, platformPartner, acquirer | Archetyp |
| Rival.goals | Goal\[\] | 1–3 | Ziele der nächsten Jahre |
| Rival.relation | int | −100 (Groll) bis +100 (Partnerschaft) | Beziehung zum Spieler |
| Rival.memory | Entry\[\] | – | Abwerbungen, Release-Duelle, Verhandlungen, Übernahmen |
| EventChain | Objekt | – | Typ, Auslöser, Stufe, Optionen, gewählte Option, fällige Folgen, Zustand |
| Market.phase | enum | boom, normal, crisis | Marktphase |
| Market.phaseWeeksLeft | int | Wochen | Restdauer |
| Future.turningPoints | TP\[\] | aus Seed | Wendepunkte ab 2025 |
| Platform.hype | int | bp 0–10.000 | Launch-Hype, fällt über 12 Monate auf 0 |
| Manufacturer.account | Objekt | Cent | Kontostand, Ergebnis je Monat und Geschäftsjahr, Verlustjahre in Folge |
| Auction | Objekt | – | Gegenstand (Marke, Engine), Startpreis, Bieter, Höchstgebot, Fristende |
| Rumor | Objekt | – | Wendepunkt-ID, Erscheinungswoche, Zeitraum, Wahrscheinlichkeit, Fehlalarm ja/nein |
| Bet | Objekt | – | Pin-Woche, Gerücht, Budgetanteil, Ergebnis |

## 4 Regeln

### Plattformen und Stand der Technik

- **MRK-R01** \[1.0\] Alle Plattformen kommen aus `data/platforms.json` mit fiktiven Namen; ab 2025 erzeugt die Zukunftsepoche weitere Plattformen aus dem Seed.
- **MRK-R02** \[1.0\] Konsolen und Handhelds haben ein beim Erscheinen festes Leistungsprofil; PC, Mobile und Cloud steigen jedes Jahr mit dem Stand der Technik.
- **MRK-R03** \[1.0\] Der Stand der Technik steigt jedes Jahr um den Wert aus `data/techcurve.json` (Startwert 8 % pro Jahr); der Rückstand einer Plattform ist der relative Abstand ihres Profils dazu.
- **MRK-R04** \[1.0\] Ein Spiel kann nur Features nutzen, die Engine und Plattform beide beherrschen (S02, S03).
- **MRK-R05** \[1.0\] Jede Firma sammelt pro Plattform Erfahrung (+8 je veröffentlichtem Spiel, max. 100); Erfahrung senkt den Leistungsverbrauch der Features auf dieser Plattform um bis zu 25 %.
- **MRK-R06** \[1.0\] Spiele verkaufen sich anteilig zur aktiven Basis ihrer Plattform (S05); eine eingestellte Plattform verkauft neue Spiele nur noch mit 5 % des normalen Absatzes.

### Dynamischer Lebenszyklus

- **MRK-R07** \[1.0\] Jeden Monat berechnet die Simulation für jede aktive Plattform A und B nach Formel 5.1 und 5.2.
- **MRK-R08** \[1.0\] Hits₁₂ zählt jedes Spiel mit Wertung ab 8,0 aller Firmen; das Gewicht klingt linear über 12 Monate auf null ab.
- **MRK-R09** \[1.0\] Steigt A drei Monate in Folge, senkt der Hersteller den Gerätepreis um 10 % oder bringt (ab der 3. Generation, höchstens einmal je Plattform) ein günstigeres Modell heraus; liegt die Basis über Plan, verschiebt er den Nachfolger um 6–12 Monate.
- **MRK-R10** \[1.0\] Der Hersteller stellt Produktion und Lizenzvergabe ein (Ereigniskette Konsolen-Ende), sobald eine Bedingung eintritt: B fällt unter 10 % des Höchststands; B liegt ab Monat 24 unter 2 % der Marktgröße M (Flop); die Plattform ist 15 Jahre alt. Ziel: Flop 2–4 Jahre, Erfolg 8–15 Jahre (Rechenprobe 5.2a).
- **MRK-R11** \[1.0\] Mit Schalter „historisch feste Lebenszyklen“ gelten die Jahre aus der Datendatei, unabhängig von A.
- **MRK-R12** \[1.0\] Abwärtskompatible Nachfolger übernehmen 30 % der Basis der Vorgängerplattform als „alte Spiele spielende Nutzer“ für Back-Catalog-Verkäufe.
- **MRK-R13** \[1.0\] Plattformen eines Herstellers, den der Spieler kauft, laufen nach denselben Regeln weiter; ein geplanter Nachfolger entfällt nur durch den ausdrücklichen Befehl des Spielers (S09).

### Devkits und Konsolenstart

- **MRK-R14** \[1.0\] Jede neue Plattform wird 12–24 Monate vor Start angekündigt; mit der Ankündigung stehen drei Devkit-Wellen fest: Welle 1 (24–18 Monate vor Start), Welle 2 (12–9 Monate), Welle 3 (ab Start).
- **MRK-R15** \[1.0\] Welle 1 erhalten eigene Studios des Herstellers und Firmen mit Beziehung ab 80; sie ist kostenlos, mit Verschwiegenheitspflicht. Der Hersteller bringt selbst 1–2 Launch-Titel aus eigenen Studios heraus; sie zählen wie andere Launch-Titel doppelt in Hits₁₂.
- **MRK-R16** \[1.0\] Welle 2 erhalten Firmen mit Beziehung ab 50 automatisch und andere auf Antrag gegen Gebühr; der Hersteller lehnt Anträge bei Ruf unter 30 ab.
- **MRK-R17** \[1.0\] Ohne Devkit kann ein Projekt eine angekündigte Plattform nicht als Zielplattform wählen.
- **MRK-R18** \[1.0\] Solange eine Plattform angekündigt ist, kennt das Projekt ihr Leistungsbudget nur als Spanne (±15 %); zum Start wird der endgültige Wert festgelegt; mit 20 % Wahrscheinlichkeit tritt vorher das Ereignis „Hersteller senkt die Taktrate“ ein (Budget −10 %).
- **MRK-R19** \[1.0\] Ein Spiel, das in den ersten 8 Wochen nach Plattformstart erscheint, ist Launch-Titel: Konkurrenzdichte −50 %, Interesse +20 %, Beziehung +5; sein Hit-Gewicht zählt doppelt in Hits₁₂.
- **MRK-R20** \[1.0\] Verpasst ein angekündigter Launch-Titel den Start, sinkt die Beziehung um 10.
- **MRK-R21** \[1.0\] Pro neuer Plattform fragt der Hersteller höchstens 3 Firmen nach Launch-Titeln (Ereignis mit Zuschuss, Marketing und Zeitexklusivität); Ablehnen kostet 3 Beziehung.
- **MRK-R22** \[1.0\] Eine Engine muss die neue Plattform über ihr Plattform-Modul unterstützen (Anforderung an das Engine-Team, S03); Lizenznehmer, die zum Start fertig sein wollen, bewerten Engines mit früher Unterstützung höher (S04).
- **MRK-R23** \[1.0\] Der Hersteller kann den Starttermin verschieben (10 % pro Plattform, 2–6 Monate); Devkit-Wellen verschieben sich mit.

### Plattformbeziehungen und Exklusivität

- **MRK-R24** \[1.0\] Die Beziehung startet bei 50 und ändert sich nach Tabelle 5.4.
- **MRK-R25** \[1.0\] Ab Beziehung 70: Showcase-Plätze und Welle-2-Devkits ohne Gebühr; ab 85: Lizenzgebühr −2 Prozentpunkte und Angebote für Exklusivdeals; unter 30: Devkits erst ab Welle 3, Zertifizierung strenger (+20 % Bug-Schwelle).
- **MRK-R26** \[1.0\] Ein Exklusivdeal zahlt einen festen Betrag und Marketing; während seiner Dauer ist das Spiel auf anderen Plattformen gesperrt; ein Exklusivdeal mit Hersteller X senkt die Beziehung zu seinen Konkurrenten um 5.

### Trends, Kundengruppen und Konkurrenzdichte

- **MRK-R27** \[1.0\] Jedes Genre und jedes Thema hat eine Beliebtheit zwischen 0,5 und 1,5, die sich monatlich als Zufallsbewegung ändert: Schritt σ = 0,03 (300 bp), dazu 5 % (500 bp) des Abstands zum Mittel 1,0 zurück; begrenzt auf 0,5–1,5.
- **MRK-R28** \[1.0\] Ein Hit (Wertung ab 8,5) hebt die Beliebtheit seines Genres und Themas für 6 Monate um 0,1; mehr als 6 Releases eines Genres im Quartal erhöhen dessen Übersättigung und senken die Beliebtheit.
- **MRK-R29** \[1.0\] Kundengruppen wachsen pro Region nach der Kurve in `data/audience.json` (Gelegenheitsspieler wachsen mit Mobile stark).
- **MRK-R30** \[1.0\] Die Konkurrenzdichte einer Woche ist die Summe der Release-Gewichte (Umfang × Interesse) aller Spiele derselben Zielgruppe in einem Fenster von ±2 Wochen; S05 nutzt sie für den Absatz.
- **MRK-R31** \[1.0\] Mit Schalter „PC-Leistungsklassen“ (Standard aus) ist die PC-Basis in drei Klassen geteilt; die Mindestanforderung eines Spiels bestimmt den erreichbaren Anteil.

### KI-Studios

- **MRK-R32** \[1.0\] KI-Studios nutzen dieselben Regeln wie der Spieler (S02–S07); sie haben keine versteckten Boni. Die Schwierigkeit verändert nur ihr Verhalten (Kompetenz und Aggressivität nach S14 Abschnitt 7), nie ihre Zahlen.
- **MRK-R33** \[1.0\] KI-Studios entscheiden im Tick-Schritt KI auf Grundlage des Spielstands der Vorwoche, in fester Reihenfolge nach Firmen-ID, mit eigenem Zufallsstrom je Firma (S01).
- **MRK-R34** \[1.0\] Ein KI-Studio startet ein neues Projekt, wenn ein Team frei wird; es wählt Genre, Thema, Plattform und Umfang mit dem höchsten erwarteten Nutzen (Formel 5.5) aus 20 zufälligen Kandidaten.
- **MRK-R35** \[1.0\] KI-Studios wachsen, schrumpfen, gehen pleite (S07 Insolvenz) und werden gekauft oder fusionieren (S09); jede Pleite bringt Marken und Engines in die Konkursmasse-Auktion (MRK-R65) und Teams als Übernahme-Angebot (S07); was keinen Abnehmer findet, geht auf den Arbeitsmarkt.
- **MRK-R36** \[1.0\] In Boomphasen gründen sich pro Quartal 1–3 neue Studios, in normalen Phasen 0–1, in Krisen keines; Gesamtzahl der KI-Studios zwischen 20 und 60.
- **MRK-R37** \[1.0\] Eine Rangliste führt alle Firmen nach Umsatz, Marktanteil und Ruf.

### KI und die neuen Systeme

- **MRK-R38** \[1.0\] **Büro/Ausstattung:** KI zieht bei 95 % Belegung um, wenn 6 Monatsmieten des neuen Grundrisses vorhanden sind; Ausstattung kauft sie nach S07 Abschnitt 7.
- **MRK-R39** \[1.0\] **Devkits:** KI-Studios mit Beziehung ab 50 nehmen Welle-2-Devkits an, wenn ein Team in den nächsten 12 Monaten frei wird; AAA-Studios und Plattform-Partner beantragen sie auch mit Gebühr.
- **MRK-R40** \[1.0\] **Engine-Anforderungen:** Ein KI-Studio mit eigener Engine bestellt eine Modulstufe, wenn ein geplantes Projekt ein Feature mit Nutzen über Schwelle braucht und die Stufe vor dem Feature-Freeze fertig werden kann; sonst streicht es das Feature.
- **MRK-R41** \[1.0\] **Preisaktionen:** KI senkt den Preis eines Produkts nach 12 Monaten um 25 % und nimmt danach an jeder zweiten Store-Aktion teil; Marken-Fabriken seltener (jede dritte).
- **MRK-R42** \[1.0\] **Kopierschutz:** KI wählt die stärkste Stufe ihrer Epoche mit Zufriedenheitsverlust unter 5 % (PC), auf Konsolen den Store-Schutz; Indie-Studios verzichten ab 2010 mit 50 % Wahrscheinlichkeit.
- **MRK-R43** \[1.0\] **Projektabbruch:** KI bricht am Vertical Slice ab, wenn die Prognose (Mittelwert) mehr als 1,5 unter ihrer Mindestwertung liegt und weniger als 50 % des Budgets ausgegeben sind; sonst steuert sie um (Umfang −1). Dies ist die einzige Fassung der KI-Abbruchregel; andere Specs verweisen hierher.
- **MRK-R44** \[1.0\] **Technik-Update:** KI plant ein Technik-Update für Live-Spiele, die zwei Engine-Versionen zurückliegen, und für Einzelspiele mit Wertung ab 8 beim Generationswechsel.

### Rivalen

- **MRK-R45** \[1.0\] Zu Spielbeginn werden 3–5 Rivalen bestimmt (Standard 4), mindestens drei verschiedene Archetypen; scheidet ein Rivale aus, rückt das stärkste passende KI-Studio nach.
- **MRK-R46** \[1.0\] Die Beziehung ändert sich durch Ereignisse aus dem Gedächtnis (Tabelle 5.6); sie klingt pro Jahr um 10 % Richtung 0 ab.
- **MRK-R47** \[1.0\] **Release-Duell:** Liegt ein eigener großer Release in einem Zeitfenster von ±4 Wochen, legt ein Rivale mit Groll (≤ −30) seinen Titel mit 50 % auf dieselbe Woche, ein Rivale mit Respekt weicht aus. Ein Rivale verschiebt jeden Titel höchstens einmal und zahlt dafür dieselben 10 % Interesse wie der Spieler bei einer Verschiebung (S05).
- **MRK-R48** \[1.0\] **Abwerbung:** Rivale mit Groll macht Schlüsselpersonen des Spielers doppelt so häufig Angebote (S07 FRM-R11).
- **MRK-R49** \[1.0\] **Engine-Kampf:** Gewinnt der Spieler einen Lizenzkunden eines Engine-Riesen, senkt dieser seine Royalty um 1–2 Prozentpunkte oder bietet Quellcode-Zugang an.
- **MRK-R50** \[1.0\] **Kooperation:** Ab der Kooperationsschwelle der Stufe (S14 Abschnitt 7, Normal +40) bieten Rivalen einmal pro Jahr Co-Publishing oder eine Lizenz zum Freundschaftspreis (−20 %) an.
- **MRK-R51** \[1.0\] **Aufkäufer:** bietet um dieselben Übernahmeziele wie der Spieler und kauft sie ihm weg; ein Angriff auf die Firma des Spielers erst mit feindlichen Übernahmen \[später\].
- **MRK-R52** \[1.0\] Jede Rivalen-Entscheidung von Gewicht erzeugt eine Schlagzeile im Ticker.

### Krisen und Ereignisketten

- **MRK-R53** \[1.0\] Ereignisketten sind Daten in `data/events/*.json` mit Auslöser, 2–3 Optionen, verzögerten Folgen und Eskalationsstufen; die Ereignisdichte ist einstellbar (S10).
- **MRK-R54** \[1.0\] Eine Kette belegt den Platz des wöchentlichen Entscheidungsangebots (höchstens eines pro Woche, S01); hängen mehrere an, gilt die Reihenfolge Krise vor Chance vor Information.
- **MRK-R55** \[1.0\] Folgen einer gewählten Option können bis zu 12 Wochen verzögert eintreten und eine zweite Stufe auslösen (z. B. Leak: Schweigen → zweite Welle).
- **MRK-R56** \[1.0\] In 1.0 gibt es diese Ketten (Tabelle 5.7); reicht die Zeit nicht, bleiben fünf: Crunch-Enthüllung, Leak, Server-Ausfall, Klon-Spiel, Konsolen-Ende.

### Zukunftsepoche, Boom und Krise

- **MRK-R57** \[1.0\] Ab 2025 erzeugt der Seed 4–6 Wendepunkte bis 2040 aus der Tabelle der Zukunftsentwicklungen (Technik, Plattformen, Werkzeuge, Regulierung, Markt); je Seed treten mindestens zwei der drei Zukunfts-Ketten auf.
- **MRK-R58** \[1.0\] Wette auf die Zukunft: Der Spieler setzt einen Pin auf der Zeitleiste auf ein Gerücht (MRK-R68) und legt einen Budgetanteil fest. Tritt der Wendepunkt im Fenster ±12 Monate um den Pin ein, erhält die Firma Plattform-Erfahrung 30 und Welle-1-Devkits der neuen Plattformart. Investieren Firmen zusammen über 20 % ihres Budgets in eine neue Plattformart (VR, Cloud), steigt die Wahrscheinlichkeit, dass diese zum Massenmarkt wird, um bis zu 30 %.
- **MRK-R59** \[1.0\] Der Markt durchläuft Phasen: Boom (2–4 Jahre), normal (3–6 Jahre), Krise (1–3 Jahre); ein historischer Crash liegt 1983–85 (außer Schalter Marktzyklen aus).
- **MRK-R60** \[1.0\] In der Krise sinken Budgets der KI um 20 %, Publisher bevorzugen bestehende Marken, KI-Studios entlassen 10–20 %, und der Arbeitsmarkt hat mehr gute Bewerber; im Boom ist Kapital billiger (Zins −1 Prozentpunkt) und Gehaltsniveau +5 %.
- **MRK-R61** \[1.0\] Live-Service-Spiele, die in den ersten 12 Monaten eingestellt werden, geben ihrem Nachfolger einen Interesse-Malus von 30 %.

### Ergänzungen nach Prüfung 3

- **MRK-R62** \[1.0\] Launch-Hype: Jede Plattform startet mit Hype 10.000 bp; er fällt linear über 12 Monate auf 0 und geht mit a₀ in A ein (5.1).
- **MRK-R63** \[1.0\] Nachfolger: Erscheint der Nachfolger, steigt der Rückstand der alten Plattform um 1,0, ihr Schwund springt um +50 % (×1,5 vor der Begrenzung auf d\_max), und ihre Hits zählen nur noch zur Hälfte in Hits₁₂.
- **MRK-R64** \[1.0\] Lebensdauer: Ziel ist Flop 2–4 Jahre und Erfolg 8–15 Jahre. Die drei Einstellgründe stehen in MRK-R10; die Rechenprobe 5.2a belegt die Werte.
- **MRK-R65** \[1.0\] Konkursmasse-Auktion: Geht ein Studio pleite, versteigert der Insolvenzverwalter jede Marke und jede Engine einzeln als Welt-Ereignis (A23). Frist ist eine Woche, Startpreis nach 5.9. Es bieten 2–3 KI-Firmen und auf Wunsch der Spieler. Das Höchstgebot gewinnt.
- **MRK-R66** \[1.0\] Nach der Auktion: Eine ersteigerte Marke kann der Käufer sofort im Markenmarkt anbieten (S04). Eine unverkaufte Marke geht zum Startpreis −25 % in den Markenmarkt. Eine unverkaufte Engine wird eingestellt; Lizenznehmer behalten ihre Lizenz ohne Updates. Teams gehen als Übernahme-Angebot an Firmen mit freiem Platz (S07), sonst auf den Arbeitsmarkt.
- **MRK-R67** \[1.0\] Hersteller-Konto: Jeder Plattformhersteller führt ein Konto nach Formel 5.10. Schreibt er zwei Geschäftsjahre in Folge Verlust, tritt das Ereignis „Hersteller zieht sich zurück“ ein: Die Plattform endet nach 6–12 Monaten, ein geplanter Nachfolger entfällt, der Hersteller wird Publisher oder Kaufziel (S09).
- **MRK-R68** \[1.0\] Gerüchte-Vorphase: Jeder Zukunftswendepunkt (MRK-R57) erscheint 24–36 Monate vorher als Gerücht im Ticker, mit Art und unscharfem Zeitraum. Analytics macht den Zeitraum genauer und zeigt eine Eintrittswahrscheinlichkeit (5.11). 15 % der Gerüchte sind Fehlalarme.
- **MRK-R69** \[1.0\] KI im Markenmarkt (Regeln in S04): Marken-Fabriken bieten Marken, die sie 3 Jahre nicht genutzt haben, zur Lizenz an. Indies und Mittelklasse lizenzieren ein, wenn w\_m · Marke in Formel 5.5 die Lizenzkosten übersteigt. Publisher kaufen Marken auch ganz.

## 5 Formeln und Startwerte

### 5.1 Attraktivität

```latex
A = a_0 \cdot \text{Hype} + a_1 \cdot \text{Hits}_{12} + a_2 \cdot \text{Bibliothek} - a_3 \cdot \text{Preis}_{rel} - a_4 \cdot \text{Rückstand}
```

Hype ist beim Plattformstart 1,0 (10.000 bp) und fällt linear über 12 Monate auf 0 (MRK-R62). a₀ = 0,05 (500 bp). Der Term trägt den Start, bevor Hits und Bibliothek wirken.

### 5.2 Aktive Basis (monatlich)

```latex
B_{t+1} = B_t + \max(0,\ M - B_t) \cdot m \cdot \max(0, A) - B_t \cdot \text{clamp}\big(d_0 + d_1 \cdot \text{Rückstand} - d_2 \cdot \text{Hits}_{12},\ d_{min},\ d_{max}\big)
```

Neukäufer kommen nur aus dem ungesättigten Markt (M − B) und nur bei positiver Attraktivität; m = monatliche Kaufrate (Startwert 0,3 = 3.000 bp; mit 0,03 blieb jede Basis unter 2 % von M, Rechenprobe 5.2a). Der Schwund ist begrenzt (d\_min = 0,002, d\_max = 0,15 pro Monat). Die Basis bleibt so immer zwischen 0 und M.

| Parameter | Startwert | Bereich | Datei |
| --- | --- | --- | --- |
| a₁ Gewicht Hits | 0,040 | 0,01–0,1 | data/platformcurve.json |
| a₂ Gewicht Bibliothek (Zahl der Spiele ab Wertung 6, log) | 0,010 | 0–0,05 | data/platformcurve.json |
| a₃ Gewicht Preis relativ zum Epochenschnitt | 0,020 | 0–0,1 | data/platformcurve.json |
| a₄ Gewicht Rückstand | 0,030 | 0–0,1 | data/platformcurve.json |
| M Marktgröße der Zielgruppe | aus data/audience.json | – | data/audience.json |
| d₀ natürlicher Schwund pro Monat | 0,8 % | 0,3–2 % | data/platformcurve.json |
| d₁ Schwund durch Rückstand | 3 % (300 bp) je Rückstand 1,0 | 1–5 % | data/platformcurve.json |
| d₂ Bremse durch Hits | 0,3 % je Hit-Einheit | 0–1 % | data/platformcurve.json |
| Abklingzeit Hits | 12 Monate linear | 6–18 | data/platformcurve.json |
| Einstellschwelle | 10 % des Höchststands | 5–20 % | data/platformcurve.json |
| Stand der Technik | +8 %/Jahr | 4–15 % | data/techcurve.json |
| a₀ Gewicht Launch-Hype | 0,05 (500 bp) | 0–0,15 | data/platformcurve.json |
| m Kaufrate pro Monat | 0,3 (3.000 bp) | 0,1–0,6 | data/platformcurve.json |
| Schwund-Sprung bei Nachfolger | +50 % (×1,5) | +20–100 % | data/platformcurve.json |
| Rückstand-Sprung bei Nachfolger | +1,0 | 0,5–1,5 | data/platformcurve.json |
| Hits der alten Plattform nach Nachfolger | 50 % | 25–100 % | data/platformcurve.json |
| Flop-Schwelle | 2 % von M ab Monat 24 | 1–5 % | data/platformcurve.json |
| Höchstalter | 15 Jahre | 12–20 | data/platformcurve.json |
| Trend σ / Rückkehr zum Mittel | 0,03 / 5 % pro Monat | 0,01–0,06 / 2–10 % | data/trends.json |

Zielkorridor: Flop 2–4 Jahre; Konsole ohne Hits mit Nachfolger nach 6 Jahren 7–9 Jahre; Erfolg 8–15 Jahre, nie über 15 (MRK-R10). Nachweis in 5.2a.

### 5.2a Rechenprobe Lebensdauer

Annahmen: M = 1; Rückstand = 1 − 1/1,08^Jahre, ab Nachfolger +1,0; 2 Spiele pro Monat (nach Nachfolger 0,5), Bibliothek = ln(1 + Spiele); Preis\_rel 1,0, ab Monat 24 0,8; Startwerte aus der Tabelle. Monatlich nach 5.1 und 5.2, Einstellung nach MRK-R10.

| Fall | Nachfolger nach | Ende nach | Grund |
| --- | --- | --- | --- |
| Flop (Preis 2–3 × Schnitt, schwacher Hype) | 3–4 Jahren | 2,0 Jahren | unter 2 % von M ab Monat 24 |
| Ohne Hits | 5 / 6 / 7 Jahren | 7,4 / 8,4 / 9,3 Jahren | unter 10 % des Höchststands |
| 1 Hit-Einheit dauerhaft | 7 / 8 / 10 Jahren | 10,5 / 11,4 / 13,2 Jahren | unter 10 % des Höchststands |
| 2–3 Hit-Einheiten dauerhaft | 9–10 Jahren | 15 Jahren | Höchstalter |

Der Hersteller plant den Nachfolger 6–8 Jahre nach Start; ohne Hits wählt er 6 Jahre (Abschnitt 7). Damit besteht MRK-T02. Der Sprung beim Nachfolger trägt das Ende: Schwund ohne Hits steigt von etwa 2 % auf etwa 7,7 % pro Monat. S12 rechnet diese Probe als Regressionstest nach (Ganzzahlen nach A22).

### 5.3 Devkits

| Parameter | Startwert | Bereich | Datei |
| --- | --- | --- | --- |
| Welle 1 / 2 / 3 | 24–18 / 12–9 / 0 Monate vor Start | – | data/devkits.json |
| Beziehung für Welle 1 / Welle 2 automatisch | 80 / 50 | 60–95 / 30–70 | data/devkits.json |
| Gebühr Welle 2 pro Team (2000) | 20.000 USD | × Epochenfaktor | data/devkits.json |
| Budget-Unsicherheit vor Start | ±15 % | 5–30 % | data/devkits.json |
| Chance „Taktrate gesenkt“ | 20 % | 0–40 % | data/devkits.json |
| Launch-Fenster | 8 Wochen | 4–12 | data/devkits.json |
| Launch-Bonus Konkurrenzdichte / Interesse / Beziehung | −50 % / +20 % / +5 | – | data/devkits.json |

### 5.4 Plattformbeziehung

| Ereignis | Änderung |
| --- | --- |
| Hit (ab 8) auf der Plattform | +5 |
| Flop (unter 5) oder schwache Version | −3 |
| Exklusiv-/Zeitexklusivtitel | +10 |
| Exklusivdeal mit Konkurrenzhersteller | −5 |
| Zertifizierung im ersten Versuch / gescheitert | +1 / −4 |
| Launch-Titel / verpasster Launch | +5 / −10 |
| Abgelehnte Launch-Anfrage | −3 |
| Rückzug von der Plattform innerhalb von 2 Jahren nach Start | −8 |

### 5.5 Projektwahl der KI

```latex
U_{projekt} = w_q \cdot \hat{Q} \cdot \text{Trend} + w_m \cdot \text{Marke} - w_k \cdot \frac{\text{Kosten}}{\max(\text{Kapital},\ \text{Mindestkapital}_{Epoche})} - w_r \cdot \text{Risiko} + w_p \cdot \text{Basis}_{plattform}
```

| Persönlichkeit | w\_q | w\_m | w\_k | w\_r | w\_p |
| --- | --- | --- | --- | --- | --- |
| Indie | 0,8 | 0,2 | 1,2 | 0,6 | 0,3 |
| Mittelklasse | 1,0 | 0,6 | 1,0 | 0,8 | 0,6 |
| AAA | 1,2 | 1,0 | 0,6 | 0,9 | 1,0 |
| Engine-Spezialist | 0,9 | 0,4 | 0,9 | 0,7 | 0,6 |
| Publisher | 0,7 | 1,2 | 0,8 | 1,0 | 0,8 |

Datei `data/ai.json`. KI-Aggressivität (S10) skaliert w\_q und die Zahl der Kandidaten. Mindestkapital der Epoche steht in data/ai.json (1980: 50.000 USD, ×2 je Jahrzehnt); so bleibt der Kostenterm bei fast pleiten Studios endlich.

### 5.6 Rivalenbeziehung

| Ereignis | Änderung |
| --- | --- |
| Spieler wirbt Schlüsselperson ab | −25 |
| Release-Duell vom Spieler gewonnen / verloren | −10 / +5 |
| Lizenzkunde gewonnen / verloren | −10 / +5 |
| Faire Lizenzverhandlung, Kooperation | +15 |
| Spieler kauft Firma, die der Rivale wollte | −20 |
| Jährliches Abklingen | 10 % Richtung 0 |

### 5.7 Ereignisketten in 1.0

| Kette | Auslöser | Optionen | Folgen (Beispiele) |
| --- | --- | --- | --- |
| Crunch-Enthüllung | 3+ Crunch-Monate in 12 Monaten | Entschuldigen und Regel ändern / schweigen / dementieren | Arbeitgeber-Ruf −10 bis −25, bei Dementi zweite Welle möglich |
| Leak | Zufall, häufiger bei Teams > 50 | früher ankündigen / ignorieren / rechtlich vorgehen | Interesse ±, Ruf −5 bei Klage |
| Server-Ausfall zum Start | Kapazität < Spitzenlast | Entschädigung / Kapazität teuer erhöhen / aussitzen | Zufriedenheit, Kosten |
| Lootbox-Debatte | Monetarisierung intensiv, ab 2010 | abschaffen / abschwächen / verteidigen | Umsatz gegen Ruf |
| Klon-Spiel | Eigener Hit | klagen / ignorieren / schnell nachlegen | Kosten, Interesse |
| Cheater-Welle | Online-Spiel ohne Anti-Cheat-Stufe | aufrüsten / Bann-Welle / nichts tun | Churn, Kosten |
| Datenleck | Online-Dienste ab 2010 | offenlegen und entschädigen / still beheben | Ruf, bei Entdeckung doppelt |
| Verfilmungsangebot | Marke mit Stärke ≥ 80 | annehmen / ablehnen / Mitsprache verlangen | Marke ± je Erfolg des Films |
| Konsolen-Ende | Plattform eingestellt | portieren / Spiel einstellen / Restbestand verkaufen | Kosten, Back-Catalog |
| DRM-Protest | Ständige Online-Pflicht | Schutz entfernen / beibehalten | Zufriedenheit |
| Update zerstört Mods und Spielstände | Technik-Update ohne genügend QA | Hotfix / Entschuldigung / nichts | Zufriedenheit |
| Hersteller senkt Taktrate | Angekündigte Plattform, 20 % | Features kürzen / Version abspecken / verschieben | Budget −10 % |
| Hersteller sucht Launch-Titel | Neue Plattform | annehmen / ablehnen | Zuschuss, Beziehung |

### 5.8 Zukunfts-Ketten

| Kette | Optionen |
| --- | --- |
| KI-Werkzeug-Welle | voll einsetzen (Tempo +30 %, Moral −5, Ruf-Risiko) / maßvoll (+12 %) / verzichten („handgemacht“: Interesse +10 % bei Kernspielern) |
| Letzte Konsolengeneration | Exklusivpartner der Cloud / plattformneutral / eigene Plattform \[später\] |
| Regulierungswelle | Monetarisierung umbauen / Region verlassen / anfechten |

### 5.9 Konkursmasse-Auktion

```latex
\text{Startpreis} = 0{,}5 \cdot \text{Buchwert}, \quad \text{Gebot}_{max}(KI) = \min(\text{Bewertung}_{KI},\ 0{,}4 \cdot \text{Kapital}_{KI})
```

Buchwert einer Marke ist ihr Markenwert (S04). Buchwert einer Engine ist die Summe ihrer Modulkosten × 0,5^(Alter in Jahren / 3). Bieter sind die 2–3 KI-Firmen mit der höchsten Bewertung über dem Startpreis; Rivalen gehen vor. Gebotsschritt 5 % des Startpreises. Ein Rivale mit Groll bewertet 10 % höher, wenn der Spieler mitbietet. Der Spieler setzt ein Höchstgebot; die Simulation bietet für ihn bis dorthin.

### 5.10 Hersteller-Konto

```latex
\text{Ergebnis}_{Monat} = \text{Marge}_{HW} \cdot \text{Geräte}_{neu} + \text{Lizenzgebühr} \cdot \text{Spielumsätze} - \text{Fixkosten}
```

| Parameter | Startwert | Bereich | Datei |
| --- | --- | --- | --- |
| Marge pro Gerät | −1.500 bp des Gerätepreises | −3.000 bis 0 bp | data/manufacturers.json |
| Anstieg der Marge | +500 bp pro Jahr, höchstens +2.000 bp | – | data/manufacturers.json |
| Geräte\_neu | Neukäufer aus 5.2 | – | – |
| Spielumsätze | Umsätze aller Spiele der Plattform (S05) | – | – |
| Fixkosten | je Generation, in Cent | – | data/manufacturers.json |
| Rückzug | 2 Geschäftsjahre Verlust in Folge | 1–3 | data/manufacturers.json |

### 5.11 Gerüchte und Wette

| Parameter | Startwert | Bereich |
| --- | --- | --- |
| Vorlauf des Gerüchts | 24–36 Monate | 12–48 |
| Unschärfe ohne Analytics | ±24 Monate | – |
| Unschärfe mit Analytics Stufe 1 / 2 | ±12 / ±6 Monate, ab Stufe 2 mit Wahrscheinlichkeit in 10-%-Schritten | – |
| Fehlalarme | 15 % (1.500 bp) | 0–30 % |
| Trefferfenster der Wette (Pin) | ±12 Monate | 6–24 |
| Lohn bei Treffer | Plattform-Erfahrung 30, Welle-1-Devkits | – |

Datei data/future.json.

## 6 Entscheidungen des Spielers

| Entscheidung | Wann | Optionen | Standard/Delegation |
| --- | --- | --- | --- |
| Devkit beantragen | Welle 2 ohne Automatik | beantragen (Gebühr) / warten | Regel möglich |
| Launch-Anfrage des Herstellers | Ereignis | annehmen / ablehnen | manuell |
| Exklusivdeal | Angebot | annehmen / verhandeln / ablehnen | manuell |
| Antwort auf Ereigniskette | Ereignis | 2–3 Optionen | Regel für wiederkehrende Ketten möglich |
| Reaktion auf Rivalen | Ereignis (Kooperation, Duell) | annehmen / ausweichen / ignorieren | manuell |
| Investition in neue Plattformart | Zukunftsepoche | Budgetanteil | manuell |

## 7 KI-Verhalten

Maßgeblich für das Denken der KI ist S14 KI-System (Wahrnehmung, Ziele, Strategiekonferenz, Nutzwert und Auswahl, Bedrohung und Gegenzüge, Nachahmer, Lernen, Charakterzüge, Schwierigkeitsparameter, Ausgleich). Die Regeln MRK-R32 bis MRK-R52 und MRK-R69 sowie Formel 5.5 sind Anwendungen davon; Formel 5.5 liefert die Archetyp-Gewichte. Plattformhersteller sind KI-Akteure mit eigener Ökonomie (Konto nach MRK-R67 und Formel 5.10: Hardwareverkauf, Lizenzgebühren, Generationen) und reagieren nach MRK-R09/R10/R14–R23. Hersteller planen den Nachfolger 6–8 Jahre nach Start, angepasst an A.

## 8 Oberfläche

- **Erleben:** Markt-Ansicht mit Plattform-Strom (Stream-Graph, Breite = Basis), Devkit-Wellen-Markern, Konkurrenzdichte-Spur und ziehbarem Release-Pin; Trend-Wetterkarte (Genre × Thema mit Wettersymbolen und Pfeilen); Rivalen als Porträtkarten mit Beziehungsgesicht und letzter Schlagzeile; Rangliste bewusst als Tabelle.
- **Analysieren:** Plattformtabelle mit A, B, Rückstand, Hits₁₂, Formel-Tooltip; Trendverläufe; Rivalen-Gedächtnis als Liste.

Ergänzt nach Prüfung 3: Auktionskarte mit Countdown, Startpreis, Bietern und eigenem Höchstgebot; Gerüchte als blasse Marker auf der Zeitleiste, die Wette als Pin; Hersteller-Ampel im Plattform-Strom (grün Gewinn, gelb ein Verlustjahr, rot Rückzug droht); Markenmarkt-Reiter „Marken“ (S11).

## 9 Ereignisse und Meldungen

Alle Ketten aus 5.7 und 5.8 sowie: Plattform angekündigt (Information), Devkit-Welle (Ergebnis/Entscheidung), Preis gesenkt oder günstiges Modell (Information), Nachfolger verschoben (Information), Plattform eingestellt (Kette), Marktphase wechselt (Ergebnis), Rivalen-Schlagzeilen (Information), Rivale bietet Kooperation (Entscheidung), neues Studio gegründet oder pleite (Information), Konkursmasse-Auktion (Welt-Ereignis, Frist 1 Woche), Hersteller zieht sich zurück (Information), Gerücht im Ticker (Information), Gerücht bestätigt oder geplatzt (Information), Marke im Markenmarkt angeboten (Information, S04).

## 10 Schnittstellen

| System | Richtung | Inhalt |
| --- | --- | --- |
| S01 Kern | ↔ | Tick-Schritte KI und Markt (Plattformbasis und Trends monatlich), Zufallsströme, Ereignis-Warteschlange |
| S02 Produkte | → | Leistungsbudget (auch als Spanne), Trend-Faktor, Plattform-Erfahrung |
| S03 Engines | → | Stand der Technik, Plattform-Modul als Anforderung |
| S04 Lizenzen | → | Nutzwert-Bonus für frühe Plattformunterstützung, Engine-Rivale; Konkursmasse-Marken und KI-Angebot und -Nachfrage im Markenmarkt (MRK-R69) |
| S05 Marketing/Vertrieb | → | Konkurrenzdichte, aktive Basis, Launch-Bonus, Showcase-Plätze, Exklusivdeals |
| S06 Betrieb | → | Cheater-Welle, Server-Ausfall, Datenleck |
| S07 Firma | ↔ | Abwerbung, Krisen-Entlassungen, Arbeitsmarkt, Zinsen im Boom, Teams aus Konkursmasse als Angebot |
| S09 Übernahmen | ↔ | Hersteller als Kaufziel, Aufkäufer-Rivale, Konsolidierung |
| S10 Einstellungen | ← | KI-Aggressivität und -Anzahl, Ereignisdichte, Marktzyklen, feste Lebenszyklen, PC-Leistungsklassen |
| S11 Oberfläche | → | Markt-Ansicht, Zeitstrom, Schlagzeilen-Texte |
| S12 Technik | → | Entitäten Platform, PlatformRelation, Rival, EventChain, Market |
| S13 Ausbau | → | Eigene Konsole und eigener Store |

## 11 Abnahmetests

- **MRK-T01** Gegeben zwei gleiche Konsolen, eine mit 3 Hits in den letzten 12 Monaten, eine ohne, dann schrumpft die Basis der ersten nach 24 Monaten deutlich langsamer.
- **MRK-T02** Gegeben die Startwerte aus 5.2: Eine Konsole unter 2 % von M ab Monat 24 wird nach 2–4 Jahren eingestellt; eine Konsole ohne Hits mit Nachfolger nach 6 Jahren nach 7–9 Jahren; mit dauerhaft mindestens einer Hit-Einheit nicht vor 9 und spätestens nach 15 Jahren (Rechenprobe 5.2a).
- **MRK-T03** Gegeben Beziehung 85, dann erhält die Firma Welle-1-Devkits; mit Beziehung 40 erst auf Antrag ab Welle 2.
- **MRK-T04** Gegeben ein Projekt ohne Devkit, dann ist die angekündigte Plattform nicht wählbar.
- **MRK-T05** Gegeben ein Release 4 Wochen nach Plattformstart, dann gilt es als Launch-Titel und die Konkurrenzdichte halbiert sich.
- **MRK-T06** Gegeben Schalter „historisch feste Lebenszyklen“, dann endet jede Plattform im Jahr aus der Datendatei, unabhängig von Hits.
- **MRK-T07** Gegeben ein Simulationslauf 1980–2040 ohne Spieler, dann liegt die Zahl der KI-Studios immer zwischen 20 und 60 und keine Firma hat dauerhaft über ein Drittel Marktanteil.
- **MRK-T08** Gegeben ein Rivale mit Groll −50 und ein eigener AAA-Release, dann legt er in mindestens 40 % von 100 Seeds seinen Titel in das ±4-Wochen-Fenster.
- **MRK-T09** Gegeben eine Leak-Kette mit Option Schweigen, dann tritt in einem Teil der Seeds nach bis zu 12 Wochen eine zweite Welle ein.
- **MRK-T10** Gegeben gleicher Seed und gleiche Eingaben, dann treffen alle KI-Studios dieselben Entscheidungen in derselben Reihenfolge.
- **MRK-T11** Gegeben eine KI mit Prognose 2 unter Mindestwertung am Vertical Slice und 30 % Budget ausgegeben, dann bricht sie das Projekt ab.
- **MRK-T12** Gegeben 2025 bis 2040 mit verschiedenen Seeds, dann treten jeweils 4–6 Wendepunkte und mindestens zwei Zukunfts-Ketten auf.

* **MRK-T13** Gegeben ein Plattformstart ohne Spiele, dann ist A in Monat 1 höher als in Monat 13, nur durch den Hype-Term.
* **MRK-T14** Gegeben ein Nachfolger erscheint, dann steigt der Schwund der alten Plattform im selben Monat um 50 %, solange d\_max nicht greift.
* **MRK-T15** Gegeben ein KI-Studio geht mit zwei Marken und einer Engine pleite, dann starten drei Auktionen mit einer Woche Frist und 2–3 Bietern; unverkaufte Marken stehen danach im Markenmarkt.
* **MRK-T16** Gegeben ein Hersteller mit zwei Verlustjahren in Folge, dann tritt „Hersteller zieht sich zurück“ ein und kein Nachfolger erscheint.
* **MRK-T17** Gegeben ein Wendepunkt im Jahr X, dann erscheint das Gerücht 24–36 Monate vorher; ein Pin mit Abstand unter 12 Monaten gilt als Treffer.
* **MRK-T18** Gegeben ein Rivale hat seinen Titel einmal verschoben, dann verschiebt er ihn kein zweites Mal und verliert 10 % Interesse.
* **MRK-T19** Gegeben ein KI-Studio mit Kapital 0, dann liefert Formel 5.5 einen endlichen Wert.

## 12 Spätere Versionen

- **\[später\]** Eigene Konsole und eigener digitaler Store des Spielers (S13): Der Spieler verteilt Devkits, legt Lizenzgebühren fest und erlebt den Lebenszyklus als Hersteller.
- **\[später\]** Feindliche Übernahme der Spielerfirma durch den Aufkäufer-Rivalen (S09).
- **\[später\]** Weitere Ketten (E-Sport-Liga, Regulierung pro Land), Regionen mit eigenen Plattformen in der Zukunftsepoche.
- **Zurückgestellt:** Multiplayer (Rivalen als menschliche Spieler).

## Änderungen nach Prüfung 3

- A erhält den Launch-Hype-Term a₀ · Hype (MRK-R62); der Hersteller bringt eigene Launch-Titel in Welle 1 (MRK-R15).
- d₁ = 3 %; beim Nachfolger Rückstand +1,0, Schwund +50 %, Hits halb (MRK-R63). Basisformel nach A25 unverändert; Kaufrate m von 0,03 auf 0,3, weil die Basis sonst nie über 2 % von M wächst.
- Einstellung zusätzlich bei Flop (unter 2 % von M ab Monat 24) und mit 15 Jahren (MRK-R10). Lebensdauer Flop 2–4, Erfolg 8–15 Jahre; MRK-T02 neu gefasst und mit Rechenprobe 5.2a belegt.
- Trend: σ = 0,03 pro Monat, 5 % Rückkehr zum Mittel (MRK-R27).
- Kostenterm in 5.5 mit max(Kapital, Mindestkapital der Epoche).
- Release-Duell: Rivale verschiebt höchstens einmal pro Titel und zahlt 10 % Interesse (MRK-R47).
- MRK-R43 ist die einzige Fassung der KI-Abbruchregel. KI-Umzug bei 95 % Belegung und 6 Monatsmieten bestätigt (MRK-R38).
- Neu: Konkursmasse-Auktion (MRK-R65, R66, 5.9), Hersteller-Konto mit Rückzug (MRK-R67, 5.10), Gerüchte-Vorphase und Wette als Pin (MRK-R68, R58, 5.11), KI im Markenmarkt (MRK-R69, S04).
- Tests MRK-T13 bis T19 ergänzt.
