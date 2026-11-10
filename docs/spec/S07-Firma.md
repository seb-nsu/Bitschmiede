# S07 Firma: Teams, Personal, Büro, Finanzen, Publisher, Börse, Delegation

**Version:** 1.0, Stand 29.10.2026 · **Quelle:** Design-Dokument, Kapitel Firma (Teams und Schlüsselpersonen, Standorte, Büro und Ausstattung, Publisher-Verhandlung, Börse und Aktionäre, Auftragsarbeit) und Delegation und Produzenten · **Prefix:** FRM

## 1 Zweck und Abgrenzung

S07 beschreibt alles, was die Firma des Spielers (und jeder KI-Firma) im Inneren ausmacht: Abteilungen, Teams, Schlüsselpersonen, Personalpolitik, Büro und Ausstattung, Standorte, Kosten, Finanzen, Publisher-Verträge, Auftragsarbeit, Börse und Delegation.

Nicht in S07: wie Projekte Fortschritt erzeugen (S02), Engine-Forschung (S03), Lizenzverträge (S04), Marketing und Verkäufe (S05), Live-Betrieb (S06), Markt und KI-Strategie (S08), Übernahmen anderer Firmen (S09), Darstellung von Bühne und Büro-Ansicht (S11).

## 2 Begriffe

| Begriff | Bedeutung |
| --- | --- |
| Abteilung | Fachbereich der Firma mit eigener Kapazität (Spieleentwicklung, Engine-Team, QA, Marketing, Betrieb, Publishing \[später\]) |
| Team | Gruppe von 3–30 Personen mit einem Schwerpunkt; ab 8 Mitarbeitern bildbar, ab etwa 20 die Spieleinheit |
| Schlüsselperson | Benannte Person mit Rolle, Eigenschaften, Loyalität und Geschichte; bleibt immer einzeln sichtbar |
| Führungskapazität | Zahl der Einheiten, die die Firmenleitung direkt steuern kann |
| Einheit (Führung) | Ein Projekt, ein Live-Service, ein Großkunde oder ein Tochterstudio, das manuell geführt wird |
| Grundriss | Fester Büro-Typ aus dem Katalog mit Arbeitsplätzen, Ausstattungsplätzen und Miete |
| Ausstattung | Kaufbares Paket, das ein Büro verbessert; belegt eventuell einen Ausstattungsplatz |
| Recoup | Zeitpunkt, an dem ein Publisher seinen Vorschuss aus den Einnahmen zurückerhalten hat |
| Kreditwürdigkeit | Note A bis E; bestimmt Zins und Kreditrahmen |
| Regel | Wenn-dann-Satz aus dem Satzbaukasten, der eine Entscheidung automatisch trifft |
| Produzent | Schlüsselperson, die Projekte nach Vorgabe führt |

## 3 Daten

| Entität.Feld | Typ | Einheit/Bereich | Bedeutung |
| --- | --- | --- | --- |
| Company.id | string | eindeutig | Kennung; legt auch die KI-Reihenfolge im Tick fest |
| Company.money | int | Cent | Kontostand |
| Company.reputation | int | 0–100 | Ruf bei Spielern und Presse |
| Company.employerReputation | int | 0–100 | Ruf als Arbeitgeber |
| Company.creditRating | enum | A–E | Kreditwürdigkeit |
| Company.loans | Loan\[\] | – | Laufende Kredite |
| Company.policy | Policy | – | Personalpolitik (Gehalt, Crunch, Ausbildung, Arbeitsmodell) |
| Company.leadershipCapacity | int | 3–40 | Führungskapazität |
| Company.locations | Location\[\] | 1–10 | Standorte |
| Company.isPublic | bool | – | Börsennotiert |
| Company.cultureTags | enum\[\] | 1–3 | Kulturmerkmale (FRM-R71) |
| Company.parentId / transferShare | string? / int | – / 0–10.000 bp | Mutterfirma und Gewinnabführung einer Tochter (FRM-R73) |
| Company.strategyGoals | enum\[\] | 0–3 | Jahresziele der Strategiekonferenz (FRM-R67) |
| Department.type | enum | dev, engine, qa, marketing, ops, publishing | Abteilungstyp |
| Department.opsSplit | map | Summe 100 % | Nur Betrieb: Anteile Live-Ops, Kundenservice, Community, Engine-Support |
| Team.size | int | 3–30 | Personen |
| Team.specialty | enum | gameplay, graphics, sound, story, tech, qa, engine, ops | Schwerpunkt |
| Team.strength | int | 0–100 | Durchschnittliches Können |
| Team.experience | map | 0–100 je Genre/Engine/Plattform | Erfahrung |
| Team.morale | int | 0–100 | Moral |
| Team.burnout | int | 0–100 | Erschöpfung |
| Team.leadId | string? | – | Teamleiter (Schlüsselperson) |
| Team.locationId | string | – | Standort |
| Team.assignment | string? | – | Projekt, Engine, Betrieb oder frei |
| Team.transferWeeksLeft | int | 0–8 | Einarbeitung nach Wechsel |
| Employee (bis \~20 MA) | Objekt | – | Einzelperson mit Skill, Gehalt, Zufriedenheit; wird ab Teambildung in Teams zusammengefasst |
| KeyPerson.role | enum | studioLead, creativeDirector, techDirector, producer, star | Rolle |
| KeyPerson.traits | enum\[\] | 2–3 | z. B. perfectionist, teamplayer, diva, visionary |
| KeyPerson.loyalty | int | 0–100 | Bindung an die Firma |
| KeyPerson.salary | int | Cent/Monat | Gehalt |
| KeyPerson.wishes | Wish\[\] | – | Wünsche (Genre, Gehalt, eigenes Studio) |
| Producer.planning / quality / risk / experience / communication | int | 0–100 | Produzenten-Eigenschaften |
| Producer.maxProjects | int | 1–3 | Gleichzeitig geführte Projekte |
| Policy.salaryLevel | enum | below, market, above | Gehaltsniveau |
| Policy.crunch | enum | never, beforeGold, onDemand | Crunch-Regel |
| Policy.trainingBudget | int | Cent/Kopf/Monat | Ausbildungsbudget |
| Policy.workModel | enum | onsite, hybrid, remote | Arbeitsmodell (hybrid/remote ab \~2020) |
| Location.region | enum | na, eu, jp, cn, latam, … | Region |
| Location.wageFactor | float | 0,5–1,6 | Lohnniveau gegenüber Basis |
| Location.talentPool | map | 0–100 je Schwerpunkt | Bewerberangebot |
| Location.subsidy | float | 0–0,3 | Förderanteil auf Lohnkosten |
| Location.taxRate | int | 1.500–3.500 bp | Steuersatz auf Gewinn der Region (FRM-R72) |
| Office.layoutId | string | Katalog | Grundriss |
| Office.workplaces | int | 4–500 | Arbeitsplätze (nach Platzangebot) |
| Office.equipmentSlots | int | 1–10 | Ausstattungsplätze |
| Office.rent | int | Cent/Monat | Miete |
| Office.leaseEnd | date | – | Ende des Mietvertrags |
| Equipment.type | enum | hardware, comfort, soundStudio, testLab, serverRoom, mocap, showroom, canteen, dataCenter, researchLab, qualityCenter, performanceStage, academy | Art |
| Equipment.level | int | 1–5 | Stufe (nur hardware, comfort) |
| Equipment.boughtYear | int | Jahr | Für Veralterung |
| Equipment.slots / copyIndex | int / int | 0–2 / 1–n | Belegte Plätze; Nummer des Raums gleicher Art (ab 2: 7.000 bp Nutzen, FRM-R65) |
| Equipment.upkeep | int | Cent/Monat | Laufende Kosten |
| Loan.amount / rate / termMonths | int / float / int | Cent / %/Jahr / Monate | Kredit |
| PublisherDeal | Objekt | – | Publisher, Vorschuss, Raten, Split vor/nach Recoup, Aufschlag, Laufzeit, IP, Sequel-Option, Meilensteine, Recoup-Stand |
| Contract | Objekt | – | Auftrag: Auftraggeber, Art, Frist, Bezahlung, Qualitätsanforderung, Team |
| Stock | Objekt | – | Anteile, Aktienzahl, Anlegerstimmung (0–100), Zielmarke, Dividendenstufe; Kurs nur abgeleitet |
| DelegationRule | Objekt | – | Bereich, Geltung (Firma/Studio/Marke), Bedingung, Aktion, aktiv, Protokoll |

## 4 Regeln

### Abteilungen und Teams

- **FRM-R01** \[1.0\] Jede Firma hat die Abteilungen Spieleentwicklung, Engine-Team, QA, Marketing und Betrieb; eine Abteilung ohne Personal hat Kapazität null.
- **FRM-R02** \[1.0\] Bis 7 Mitarbeiter arbeiten alle als Einzelpersonen; ab 8 Mitarbeitern kann der Spieler Teams bilden; ab 20 Mitarbeitern werden neue Einstellungen automatisch einem Team zugeordnet und Einzelpersonen sind nur noch als Schlüsselpersonen sichtbar.
- **FRM-R03** \[1.0\] Teamleistung pro Woche = Größe mit abnehmendem Ertrag (siehe 5.1) × Stärke × Moral-Faktor × Burnout-Faktor × Ausstattungs-Faktor.
- **FRM-R04** \[1.0\] Wird ein Team einem neuen Projekt oder Standort zugewiesen, arbeitet es 4 Wochen (Standortwechsel: 8 Wochen) mit linear steigender Leistung von 50 % auf 100 %.
- **FRM-R05** \[1.0\] Teams lernen: Pro Woche an einem Projekt steigt die Erfahrung mit dessen Genre, Engine und Plattform um 0,5 Punkte bis 100; Stärke steigt durch Mentoring, wenn mindestens 25 % des Teams eine Stärke über dem Teamschnitt +15 haben.
- **FRM-R06** \[1.0\] Burnout steigt pro Crunch-Woche um 6 und pro Woche mit Auslastung über 100 % um 2; ohne beides sinkt er um 3 pro Woche. Ab Burnout 60 verliert ein Team pro Monat mit 10 % Wahrscheinlichkeit eine Person.
- **FRM-R07** \[1.0\] Moral sinkt durch Crunch (−3 pro Crunch-Woche), Flops (Wertung unter 5), Entlassungen, enge Vorgaben und Enge im Büro. Sie steigt durch Hits (Wertung ab 8), Gehalt über Markt, Komfort-Ausstattung und Projekte im Lieblingsgenre der Teamleitung.
- **FRM-R08** \[1.0\] Entlassungen sparen ab dem Folgemonat Gehalt, kosten aber sofort 3 Monatsgehälter Abfindung pro Person, senken die Moral aller Teams am Standort um 10 und den Arbeitgeber-Ruf um 2 je 10 % der Belegschaft.

### Schlüsselpersonen

- **FRM-R09** \[1.0\] Jede Schlüsselperson hat genau eine Rolle, 2–3 Eigenschaften und eine Loyalität; Rollen wirken nur, wenn sie besetzt sind (z. B. ohne Technischen Direktor kein Bonus auf Engine-Forschung).
- **FRM-R10** \[1.0\] Loyalität sinkt durch Gehalt unter Markt, unerfüllte Wünsche (nach 12 Monaten), Crunch und Abwerbeangebote; sie steigt durch Erfüllung von Wünschen, Gehaltserhöhung, Erfolge und Halteboni.
- **FRM-R11** \[1.0\] Liegt die Loyalität unter 40, erhält die Person bei jedem Monats-Tick mit 15 % Wahrscheinlichkeit ein Abwerbeangebot (bei Groll eines Rivalen doppelt); unter 20 kündigt sie mit 10 % Wahrscheinlichkeit pro Monat.
- **FRM-R12** \[1.0\] Ein Abwerbeangebot ist eine Fokus-Karte mit den Optionen Gegenangebot (Gehalt +20 %), Halteprämie (einmalig) oder Gehenlassen.
- **FRM-R13** \[1.0\] Schlüsselpersonen erzeugen Geschichten aus einer Ereignisliste (Lieblingsgenre-Wunsch, Gehaltsforderung nach Hit, Wunsch nach eigenem Studio); pro Person höchstens eine Geschichte pro Spieljahr.
- **FRM-R14** \[1.0\] Legendäre Entwickler (Stärke ab 90) erscheinen höchstens 2 pro Spieljahr auf dem Markt; ihr Wechsel erzeugt eine Schlagzeile.
- **FRM-R68** \[1.0\] Aktives Abwerben: Der Spieler kann einer Schlüsselperson einer anderen Firma ein Angebot machen. Aufschlag a = Gehaltsplus in bp (0–10.000). Erfolgschance in bp = clamp(5.000 + 2 × a − 100 × Loyalität, 0, 9.000). Pro Person ist höchstens ein Versuch pro Spieljahr möglich. Jeder Versuch erhöht den Groll der betroffenen Firma um 10 (S08), ein gelungener um 20.

### Personalpolitik und Bewerber

- **FRM-R15** \[1.0\] Die Personalpolitik gilt firmenweit; nur Schlüsselpersonen werden einzeln verhandelt.
- **FRM-R16** \[1.0\] Gehaltsniveau unter Markt spart 15 % Lohnkosten, senkt die Bewerberqualität um 15 Punkte und erhöht die Kündigungen; über Markt kostet 15 % mehr und hebt die Bewerberqualität um 10 Punkte.
- **FRM-R17** \[1.0\] Crunch-Regel „vor Gold“ erhöht die Teamleistung in den letzten 8 Wochen vor Gold um 25 %; „bei Bedarf“ erlaubt Crunch jederzeit, wenn ein Termin in Gefahr ist; jede Crunch-Woche erhöht Bugs um 5 % (siehe S02) und zählt für die Ereigniskette Crunch-Enthüllung (S08).
- **FRM-R18** \[1.0\] Das Arbeitsmodell hybrid oder remote ist ab 2020 verfügbar; hybrid halbiert, remote viertelt den Platzbedarf, vergrößert den Talentpool um 30 % bzw. 60 % und senkt den Mentoring-Effekt um 25 % bzw. 50 %.
- **FRM-R19** \[1.0\] Der Arbeitgeber-Ruf (0–100) ergibt sich aus Gehaltsniveau, Crunch-Historie der letzten 3 Jahre, Entlassungen, Erfolgen, Ausstattung (Kantine) und Open-Source-Engine (S04); er bestimmt Zahl und Qualität der Bewerber.
- **FRM-R20** \[1.0\] Einstellungen laufen automatisch nach Personalpolitik, sobald der Spieler eine Zielgröße pro Abteilung oder Team setzt; pro Monat können höchstens Talentpool × Bewerberfaktor Personen eingestellt werden.
- **FRM-R69** \[1.0\] Eine Akademie (Großausbau) erhöht die Bewerber am Standort um 3.000 bp und ihre Qualität um 5 Punkte (Formel 5.3). Zusätzlich bildet sie pro Quartal 2 Nachwuchskräfte mit Stärke 45 aus, die ohne Einstellungsgrenze eintreten.
- **FRM-R70** \[1.0\] Wird eine KI-Firma insolvent, erscheinen ihre Teams als Team-Angebote (Größe, Stärke, Erfahrung, Lohnforderung). Ein Angebot gilt 4 Wochen. Eine Annahme übernimmt das ganze Team ohne Einstellungsgrenze nach FRM-R20, mit Einarbeitung nach FRM-R04. Firmen mit höherem Arbeitgeber-Ruf sehen das Angebot zuerst.
- **FRM-R71** \[1.0\] Studiokultur: Jede Firma und jede Tochter trägt 1–3 Kulturmerkmale aus der Liste kreativ, technikgetrieben, Crunch-Kultur, familiär, Konzern, Indie-Geist. Merkmale entstehen aus dem Verlauf der letzten 3 Jahre (z. B. Crunch-Kultur ab 6 Crunch-Monaten, Konzern ab 200 Mitarbeitern) und werden jährlich neu bestimmt. Jedes Merkmal ändert Moral, Bewerber oder Arbeitgeber-Ruf um feste Werte aus data/culture.json; S09 nutzt die Merkmale für den Kultur-Fit.
- **FRM-R76** \[1.0, Etappe 5\] Gezielte Suche: Der Spieler beauftragt eine Personalsuche mit Bereich (Gameplay, Grafik, Sound, Story, Technik) und Mindeststärke m (40–90). Sie kostet Gebühr = 2 Monatsgehälter auf Marktniveau × (1 + (m − 40) / 25) und dauert 2 + (m − 40) / 10 Wochen (abgeschnitten). Danach erscheinen 1–3 Kandidaten mit Stärke im Bereich ≥ m als Fokus-Karte (Frist 4 Wochen); ihre Zahl folgt der Bewerberformel (5.3) mit Talentpool und Arbeitgeber-Ruf, mindestens 1, wenn m ≤ Bewerberqualität + 20, sonst mit 50 % Wahrscheinlichkeit keiner (Gebühr bleibt fällig). Höchstens eine Suche gleichzeitig; Einstellungen daraus zählen gegen die Grenze nach FRM-R20. Herkunft: Spieltest nach Etappe 4 („kann ich auch selbst suchen?“).

### Büro und Ausstattung

- **FRM-R21** \[1.0\] Jeder Standort hat genau ein Büro aus dem Grundriss-Katalog; ein Grundriss legt Arbeitsplätze, Ausstattungsplätze, Miete und eine Eigenschaft fest.
- **FRM-R22** \[1.0\] Die Einstellung Platzangebot multipliziert Arbeits- und Ausstattungsplätze aller Grundrisse mit 1,5 (großzügig), 1,0 (normal) oder 0,75 (knapp), abgerundet, mindestens 1 Ausstattungsplatz.
- **FRM-R23** \[1.0\] Belegt eine Firma mehr Personen als Arbeitsplätze, sinkt die Moral aller Teams am Standort um 1 Punkt pro Woche je 5 % Überbelegung; mehr als 20 % Überbelegung ist nicht möglich (Einstellungen pausieren).
- **FRM-R24** \[1.0\] Ein Umzug kostet eine Kaution von 3 Monatsmieten des neuen Grundrisses und senkt die Leistung aller Teams des Standorts für 2 Wochen auf 70 %; Ausstattung zieht mit, überschüssige Pakete werden zum halben Kaufpreis verkauft.
- **FRM-R25** \[1.0\] Mietverträge laufen 24 Monate; ein Auszug vor Ende kostet die halbe Restmiete als Ablöse.
- **FRM-R26** \[1.0\] Im Bürohaus und im eigenen Gebäude kann eine weitere Etage angemietet werden (+50 % Arbeitsplätze, +1 Ausstattungsplatz, +50 % Miete); auf dem Campus ein weiteres Gebäude (+100 Arbeitsplätze, +2 Ausstattungsplätze).
- **FRM-R27** \[1.0\] Spezialausstattung belegt Ausstattungsplätze; Hardware und Komfort belegen keinen Platz und gelten für das ganze Büro. Kapazitätsräume (Tonstudio, Testlabor, Serverraum, Rechenzentrum) dürfen mehrfach gebaut werden (FRM-R65). Großausbauten belegen 2 Plätze (FRM-R66).
- **FRM-R28** \[1.0\] Jede Ausstattung ist erst ab ihrem Verfügbarkeitsjahr und ihrer Mindestgröße kaufbar (Tabelle 5.4).
- **FRM-R29** \[1.0\] Hardware veraltet: Ihr Faktor sinkt pro Jahr seit Kauf um 4 Prozentpunkte gegenüber dem Stand der Technik; fällt er unter 90 %, erscheint das Symptom „Teams x % langsamer: Arbeitsplätze von JJJJ“.
- **FRM-R30** \[1.0\] Mit jedem Epochenwechsel (1990, 2000, 2010, 2020, 2030) erscheint einmalig ein Upgrade-Angebot für Hardware als Entscheidungsangebot.
- **FRM-R31** \[1.1\] Die Büro-Ansicht von oben zeigt dieselben Daten wie die Bühne; sie fügt keine Regeln hinzu.
- **FRM-R65** \[1.0\] Kapazitätsräume (Tonstudio, Testlabor, Serverraum, Rechenzentrum) dürfen mehrfach gebaut werden. Der erste Raum wirkt voll (10.000 bp), jeder weitere mit 7.000 bp seines Nutzens. Jeder Raum belegt eigene Plätze und kostet eigene Unterhaltung.
- **FRM-R66** \[1.0\] Fünf Großausbauten belegen je 2 Ausstattungsplätze: Rechenzentrum, Forschungslabor, Qualitätszentrum, Performance-Capture-Bühne und Akademie (Tabelle 5.4). Ein Großausbau ersetzt den kleineren Raum gleicher Art nicht; beide wirken nach FRM-R65 zusammen.

### Standorte

- **FRM-R32** \[1.0\] Standorte sind ab etwa 1995 bzw. ab 60 Mitarbeitern freigeschaltet; ein neuer Standort kostet 6 Monate Aufbau (Leistung 50 %), ein Büro und 1 Einheit Führungskapazität.
- **FRM-R33** \[1.0\] Lohnkosten eines Teams = Personen × Basisgehalt der Epoche × Lohnfaktor des Standorts × Gehaltsniveau × (1 − Förderung).
- **FRM-R34** \[1.0\] Das Schließen eines Standorts kostet Abfindungen nach FRM-R08 und senkt den Ruf in der Region um 10.
- **FRM-R72** \[1.0\] Regionale Steuern: Jede Region hat einen Steuersatz auf Gewinn (Location.taxRate, 1.500–3.500 bp). Der Jahresgewinn wird nach Lohnkosten auf die Standorte verteilt und dort besteuert. Verluste werden bis zu 5 Jahre vorgetragen. Die Steuer wird im Januar für das Vorjahr gebucht.

### Kosten und Outsourcing

- **FRM-R35** \[1.0\] Outsourcing (Grafik, Animation, QA, Ports) liefert Kapazität sofort ohne Einstellung, kostet aber das 1,6-Fache der Lohnkosten gleicher Kapazität und hat eine um 10 Punkte geringere Qualität als ein eigenes Team gleicher Stärke.
- **FRM-R36** \[1.0\] Eigene Spezialausstattung ersetzt Outsourcing: Mit Tonstudio entfallen externe Sound-Aufnahmekosten, mit Testlabor steigt die eigene QA-Kapazität um 30 %.

### Finanzen

- **FRM-R37** \[1.0\] Alle Geldbeträge sind ganze Zahlen in Cent; Rundung erfolgt immer nach unten zugunsten der Kosten.
- **FRM-R38** \[1.0\] Die Finanzübersicht führt Einnahmen getrennt nach Verkäufen, DLC, Abos, In-Game-Käufen, Lizenzen pro Engine, Aufträgen, Merchandising und Publishing \[später\] sowie Kosten nach Gehältern, Miete, Ausstattung, Server, Marketing, Lizenzgebühren, Outsourcing und Zinsen.
- **FRM-R39** \[1.0\] Kredite sind jederzeit bis zum Kreditrahmen aufnehmbar; Zins und Rahmen hängen von der Kreditwürdigkeit ab (Tabelle 5.6), die monatlich aus Eigenkapital, Gewinn der letzten 12 Monate und Schuldenquote neu berechnet wird.
- **FRM-R40** \[1.0\] Ist der Kontostand negativ, läuft ein Insolvenzzähler in Monaten. Erreicht er die Insolvenz-Toleranz der Einstellungen (Standard auf Normal: 6 Monate), endet das Spiel für den Spieler. Eine KI-Firma wird aufgelöst oder verkauft (S08, S09).
- **FRM-R41** \[1.0\] Startpolster: Auf Entspannt kann die Firma in den ersten 36 Spielmonaten (3 Jahre) nicht insolvent werden, auf Leicht in den ersten 24 Spielmonaten (2 Jahre). Der Kontostand wird bei 0 gehalten. Offene Kosten werden als zinsloser Kredit gebucht.
- **FRM-R73** \[1.0\] Tochterkonto (A29): Jede Tochter hat ein eigenes Konto. Am Quartalsende führt sie den Anteil transferShare ihres Quartalsgewinns an die Mutter ab (Standard 7.000 bp, einstellbar 0–10.000). Verluste trägt zuerst das Tochterkonto. Ist es negativ, kann die Mutter Geld zuschießen; sonst läuft für die Tochter ein eigener Insolvenzzähler nach FRM-R40.

### Publisher-Verträge

- **FRM-R42** \[1.0\] Der Spieler kann ein Projekt mit Konzept (ab Konzeptphase) oder mit Vertical Slice anbieten; es antworten bis zu 3 KI-Publisher, je nach Ruf, Prognose und Marke mit Interesse oder Absage.
- **FRM-R43** \[1.0\] Jeder interessierte Publisher nennt ein Angebot mit Vorschuss, Raten pro Meilenstein, Split vor und nach Recoup, Aufschlag, Laufzeit, IP-Rechten und Sequel-Option; jeder Punkt hat einen sichtbaren Spielraum.
- **FRM-R44** \[1.0\] Fordert der Spieler bei einem Punkt mehr als den sichtbaren Spielraum, sinkt die Geduld des Publishers; bei Geduld 0 zieht er das Angebot zurück.
- **FRM-R45** \[1.0\] Bis zum Recoup erhält das Studio nur den Split vor Recoup (Standard 20 %); danach den Split nach Recoup (Standard 50 %).
- **FRM-R46** \[1.0\] Die nächste Rate fließt erst bei erreichtem Meilenstein (Phasenende in S02); verfehlt das Studio einen Meilenstein um mehr als 4 Wochen, wählt der Publisher Kürzen (−20 % der Rate), Auflagen (Pflicht-Playtest) oder Stopp (bei zwei verfehlten Meilensteinen).
- **FRM-R47** \[1.0\] Bricht der Spieler ein Publisher-Projekt ab, muss er den erhaltenen Vorschuss zurückzahlen oder der Publisher übernimmt Projekt und Marke (Wahl des Spielers).

### Auftragsarbeit

- **FRM-R48** \[1.0\] Aufträge erscheinen als Angebote; Zahl und Größe hängen vom Ruf ab (Ruf 0–20: 1 Angebot pro Quartal, ab 60: 3).
- **FRM-R49** \[1.0\] Ein angenommener Auftrag bindet ein Team bis zur Frist. Erreichte Qualität q = Stärke × Erfahrung / 100 (beide 0–100, q also 0–100, abgeschnitten). Das Ergebnis erfüllt den Auftrag, wenn q ≥ Anforderung (0–100). Verfehlen kostet 30 % der Bezahlung (3.000 bp) und 3 Ruf.
- **FRM-R50** \[1.0\] In 1.0 gibt es Aufträge für Port, Grafik/Sound, QA und Engine-Anpassung für Lizenznehmer; Co-Entwicklung und Server-Hosting für Fremde kommen später.

### Börse

- **FRM-R51** \[1.0\] Börsengang ist möglich ab 2005, mit mindestens 150 Mitarbeitern, 3 Jahren Gewinn in Folge, Jahresumsatz ab 50 Mio. USD (inflationsbereinigt per Epochenfaktor) und Kreditwürdigkeit B oder besser. Der Spieler wählt Anteil (20–49 %) und Zeitpunkt; der Erlös ist Firmenwert × Anteil × (0,7 + 0,6 × Marktstimmung), in einer Krise also deutlich weniger. Danach startet die Anlegerstimmung bei 60.
- **FRM-R52** \[1.0\] Die Börse hat genau einen gesteuerten Wert, die Anlegerstimmung S (ganze Zahl 0–100). Jedes Quartal wird S nach Formel 5.7 fortgeschrieben: Zielmarke gegen Gewinn, Ereignisse, Dividende und Rückkehr zur Mitte. Die Zielmarke ist vor Quartalsbeginn sichtbar. Es gibt keine Analystenschätzung und keine Prognose des Spielers.
- **FRM-R53** \[1.0\] Einmal im Jahr (letzte Woche des Geschäftsjahres) findet eine Hauptversammlung statt. Liegt S unter 30, stellt sie eine Forderung als Pflicht-Entscheidung: Sparprogramm (Kosten −10 % für 4 Quartale, Moral −5), ein Projekt streichen oder eine Sparte verkaufen. Annehmen gibt +8 Stimmung, Ablehnen −10.
- **FRM-R54** \[1.0\] Dividende ist ein Schalter mit drei Stufen: keine, niedrig (20 % des Jahresgewinns) oder hoch (50 %), ausgezahlt quartalsweise zu einem Viertel und nur bei Gewinn. Wirkung je Quartal auf S: 0 / +1 / +3. Senken der Stufe kostet einmalig −8. Kapitalerhöhung (bis 10 % neue Aktien, höchstens einmal pro Jahr, nur bei S ≥ 70, danach −5) und Aktien als bis zu 50 % des Kaufpreises bei Übernahmen (nur bei S ≥ 70) sind in 1.0. Aktivisten, Aktienrückkauf, Übernahmeschutz und Delisting kommen später.
- **FRM-R74** \[1.0\] Der Kurs ist reine Anzeige: Kurs = Firmenwert W (Formel aus S09) ÷ Aktienzahl × (0,7 + 0,6 × S ÷ 100). Er wird quartalsweise berechnet; eine Veränderung von mindestens ±10 % erzeugt eine Ticker-Meldung.
- **FRM-R75** \[1.0\] Folgen der Stimmung: S unter 30 („unruhig“) macht die Firma für KI-Konzerne zum Übernahmeziel und löst R53 aus; S von 30 bis 69 („ruhig“) hat keine Wirkung; S ab 70 („begeistert“) erlaubt Kapitalerhöhung und Aktien als Kaufpreis (R54) und gibt Bewerbern +10 %.

### Delegation

- **FRM-R55** \[1.0\] Jeder Bereich (Projekte, Patches, DLC, Lizenzen, Live-Service, Personal, Marketing, Büro) läuft in einer von drei Stufen: manuell, regelbasiert oder vollautomatisch.
- **FRM-R56** \[1.0\] Delegation ist freigeschaltet, sobald drei Projekte gleichzeitig laufen.
- **FRM-R57** \[1.0\] Jede manuell geführte Einheit belegt 1 Führungskapazität; übersteigen die Einheiten die Kapazität, sinken Tempo und Qualität aller manuellen Einheiten um 5 % je überzähliger Einheit, und das Spiel schlägt eine Führungskraft vor.
- **FRM-R58** \[1.0\] Führungskapazität = 3 + Studioleitung (+3) + je Produzent (+Projekte des Produzenten) + je Direktor (+1).
- **FRM-R59** \[1.0\] Ein Produzent führt bis zu maxProjects Projekte nach Vorgabe (Genre/Marke, Umfang, Budget, Zieltermin, Mindestwertung, erlaubte Geschäftsmodelle) und meldet sich nur am Vertical Slice und bei gefährdeter Vorgabe.
- **FRM-R60** \[1.0\] Regeln bestehen aus „Wenn \[Bereich/Objekt\] \[Wert\] \[unter/über/gleich\] \[Zahl\], dann \[Aktion\]“; jede Regel gilt für Firma, Studio oder Marke und wird beim Tick-Schritt Eingaben (S01) ausgewertet.
- **FRM-R61** \[1.0\] Jede wiederkehrende Fokus-Karte (gleicher Typ mindestens zweimal) zeigt „Nicht mehr fragen – Regel anlegen“; der Knopf legt eine Regel mit der gerade gewählten Option und vorausgefüllter Bedingung an.
- **FRM-R62** \[1.0\] Jede ausgelöste Regel wird im Protokoll mit Woche, Regel, Objekt und Aktion gespeichert; der Regel-Editor zeigt, wie oft eine Regel im letzten Spieljahr gegriffen hätte.
- **FRM-R63** \[1.0\] Die Zahl der Pflicht-Entscheidungen pro Spieljahr liegt bei 10–12, mit voller Delegation bei höchstens 8 (Balancing-Kennzahl, S12).
- **FRM-R64** \[später\] Eigenes Publishing: Der Spieler schließt Verträge mit KI-Studios mit spiegelverkehrten Parametern aus FRM-R43 und hat dann eine Abteilung Publishing.
- **FRM-R67** \[1.0\] Strategiekonferenz: Jedes Jahr im Januar erscheint eine Fokus-Karte mit bis zu 3 Jahreszielen (Wachstum, Qualität, Rendite, Engine, Ruf, Kosten senken). Produzenten, Studioleitung und vollautomatische Bereiche richten ihre Standardantworten ein Jahr lang danach aus. Die Konferenz zählt als eine Pflicht-Entscheidung; ohne Antwort gelten die Ziele des Vorjahres.

## 5 Formeln und Startwerte

### 5.1 Teamleistung

```latex
L_{team} = n^{0{,}85} \cdot \frac{S}{100} \cdot \big(0{,}6 + 0{,}4 \cdot \tfrac{M}{100}\big) \cdot \big(1 - 0{,}5 \cdot \max(0, \tfrac{B-40}{60})\big) \cdot H \cdot E_{einarb}
```

n = Teamgröße, S = Stärke, M = Moral, B = Burnout, H = Hardware-Faktor des Büros, E\_einarb = Einarbeitungsfaktor (0,5–1).

### 5.2 Lohnkosten

```latex
K_{lohn} = n \cdot G_{epoche} \cdot f_{standort} \cdot f_{niveau} \cdot (1 - F_{förder})
```

### 5.3 Ruf als Arbeitgeber und Bewerber

```latex
R_{AG} = 50 + 15 \cdot g + 10 \cdot e - 4 \cdot c_{3J} - 2 \cdot \tfrac{Entl.}{10\,\%} + 5 \cdot k + 8 \cdot o \quad (\text{begrenzt auf } 0..100)
```

g = Gehaltsniveau (−1/0/+1), e = Erfolge der letzten 3 Jahre (0–1), c = Crunch-Monate der letzten 3 Jahre, summiert über alle Projekte (Crunch in zwei Projekten im selben Monat zählt 2), k = Kantine vorhanden (0/1), o = Open-Source-Engine (0/1). Im Kern in bp: 0–1 = 0–10.000, Abschneiden nach jedem Schritt (A22).

```latex
\text{Bewerber/Monat} = \text{Talentpool} \cdot \tfrac{R_{AG}}{100} \cdot 0{,}1 \cdot w_{modell} \cdot (1 + 0{,}3 \cdot a), \qquad \text{Bewerberqualität} = 40 + 0{,}4 \cdot R_{AG} + \Delta_{gehalt} + 5 \cdot a
```

a = Akademie am Standort (0/1). w\_modell = 1,0 / 1,3 / 1,6 (vor Ort / hybrid / remote). Kernrechnung in bp: Bewerber = Talentpool × R\_AG × 1.000 × w × (10.000 + 3.000 × a) / 10^10, abgeschnitten. Teams insolventer Firmen kommen zusätzlich als Team-Angebote (FRM-R70), nicht über diese Formel.

### 5.4 Grundrisse und Ausstattung

| Grundriss (Varianten) | Arbeitsplätze | Ausstattungsplätze | Miete pro Arbeitsplatz (1980 / 2020) | Mindest-Jahr |
| --- | --- | --- | --- | --- |
| Garage | 4 | 1 | 150 / 900 | 1980 |
| Etage (Altbau, Gewerbepark, Loft ab 2000) | 15 | 2 (Gewerbepark 3) | 150 / 900 (Altbau ×0,8, Loft ×1,4) | 1980 |
| Bürohaus (Standard, Bahnhofsnähe, Technologiepark) | 50 | 4 | 150 / 900 | 1985 |
| Eigenes Gebäude (Neubau, Umbau Fabrik, Glasturm ab 2000) | 150 | 6 | 140 / 850 | 1990 |
| Campus (Vorstadt, Innenstadt-Block) | 500 (+100 je Gebäude) | 10 | 130 / 800 | 2000 |

Zwischenjahre werden linear interpoliert; ab 2020 steigen die Mieten um 2 % pro Jahr. Grundrisse stehen in `data/offices.json`.

| Ausstattung | Kauf (2000) | Laufend/Monat (2000) | Wirkung | Ab Jahr | Mindestgröße |
| --- | --- | --- | --- | --- | --- |
| Hardware Stufe 1–5 | 3.000 je Arbeitsplatz und Stufe | 1 % des Kaufpreises | H = 0,9 + 0,05 × Stufe, abzüglich Veralterung; Bugs −2 % je Stufe | 1980 | Garage |
| Komfort Stufe 1–5 | 1.500 je Arbeitsplatz und Stufe | 1 % | Moral +2 je Stufe, Burnout-Zuwachs −10 % je Stufe | 1980 | Garage |
| Tonstudio | 250.000 | 4.000 | Sound-Features +10 % Qualität, keine externen Aufnahmekosten | 1990 | Etage |
| Testlabor | 200.000 | 5.000 | QA-Kapazität +30 %, interne Playtest-Spanne −20 % | 1990 | Etage |
| Serverraum | 400.000 | 15.000 | Eigene Server statt Miete (S06), Ausfallrisiko −30 % | 1995 | Bürohaus |
| Motion-Capture-Studio | 1.200.000 | 20.000 | Animations-Features +15 %, Story-Bonus +5 % | 2000 | Eigenes Gebäude |
| Showroom und Konferenzraum | 300.000 | 6.000 | Spielraum am Verhandlungstisch +10 % | 1985 | Etage |
| Kantine und Freizeit | 800.000 | 25.000 | Arbeitgeber-Ruf +5, Moral +3 | 1995 | Eigenes Gebäude |
| Rechenzentrum (2 Plätze) | 2.000.000 | 60.000 | Serverkapazität wie 4 Serverräume (S06), Ausfallrisiko −50 % | 2005 | Eigenes Gebäude |
| Forschungslabor (2 Plätze) | 1.500.000 | 40.000 | Engine-Forschung +20 % (S03) | 2000 | Eigenes Gebäude |
| Qualitätszentrum (2 Plätze) | 1.000.000 | 30.000 | QA-Kapazität +60 %, Bugs −10 % | 2005 | Eigenes Gebäude |
| Performance-Capture-Bühne (2 Plätze) | 2.500.000 | 50.000 | Animations-Features +25 %, Story-Bonus +10 % | 2010 | Campus |
| Akademie (2 Plätze) | 1.200.000 | 35.000 | Bewerber +30 %, Qualität +5, 2 Nachwuchskräfte pro Quartal (FRM-R69) | 1995 | Eigenes Gebäude |

Preise anderer Jahre: × Epochenfaktor (1980 0,4; 1990 0,7; 2000 1,0; 2010 1,25; 2020 1,5; 2030 1,7). Datei `data/equipment.json`.

```latex
H = \big(0{,}9 + 0{,}05 \cdot \text{Stufe}\big) \cdot \big(1 - 0{,}04 \cdot \max(0, \text{Jahr} - \text{Kaufjahr})\big), \quad H \ge 0{,}7
```

### 5.5 Teams und Personal

| Parameter | Startwert | Bereich | Datei |
| --- | --- | --- | --- |
| Basisgehalt pro Person/Monat 1980 / 1990 / 2000 / 2010 / 2020 / 2030 / 2040 | 2.500 / 4.000 / 6.500 / 8.500 / 13.000 / 15.500 / 18.000 USD | linear interpoliert | data/economy.json |
| Gehaltsfaktor unter / auf / über Markt | 0,85 / 1,0 / 1,15 | 0,7–1,3 | data/staff.json |
| Größenexponent Teamleistung | 0,85 | 0,7–1,0 | data/staff.json |
| Schwelle Teambildung / Teams als Einheit | 8 / 20 Mitarbeiter | 5–25 | data/staff.json |
| Einarbeitung Projekt / Standort | 4 / 8 Wochen | 1–12 | data/staff.json |
| Erfahrungsgewinn pro Woche | 0,5 | 0,1–2 | data/staff.json |
| Burnout pro Crunch-Woche / Abbau pro Woche | +6 / −3 | 1–10 | data/staff.json |
| Crunch-Leistungsbonus | +25 % | 10–40 % | data/staff.json |
| Abfindung | 3 Monatsgehälter | 0–6 | data/staff.json |
| Abwerbe-Chance pro Monat (Loyalität < 40) | 15 % | 0–50 % | data/staff.json |
| Outsourcing-Kostenfaktor / Qualitätsabschlag | 1,6 / −10 | 1,2–2,5 | data/staff.json |
| Startgeld Normal (Garage 1980) | 50.000 USD | 10.000–500.000 | data/settings.json |
| Moralverlust pro Crunch-Woche | −3 | 0–10 | data/staff.json |
| Insolvenz-Toleranz Normal | 6 Monate | 1–12 | data/settings.json |
| Startpolster Entspannt / Leicht | 36 / 24 Monate | 0–60 | data/settings.json |
| Nutzen jedes weiteren Kapazitätsraums | 7.000 bp | 5.000–10.000 bp | data/equipment.json |
| Gewinnabführung Tochter | 7.000 bp | 0–10.000 bp | data/finance.json |
| Steuersatz je Region (na / eu / jp / cn / latam) | 2.500 / 3.000 / 3.000 / 2.500 / 3.000 bp | 1.500–3.500 bp | data/regions.json |

### 5.6 Kredite

| Kreditwürdigkeit | Zins p. a. | Kreditrahmen | Bedingung (vereinfacht) |
| --- | --- | --- | --- |
| A | 4 % | 2 × Jahresumsatz | Eigenkapital > 50 %, Gewinn |
| B | 6 % | 1 × Jahresumsatz | Gewinn oder Eigenkapital > 30 % |
| C | 9 % | 0,5 × Jahresumsatz | ausgeglichen |
| D | 14 % | 0,2 × Jahresumsatz | Verlust |
| E | – | 0 | Insolvenzzähler läuft |

Garage 1980: fester Startkredit bis 50.000 USD zu 9 %. Insolvenz-Toleranz Standard auf Normal 6 Monate. Startpolster Entspannt 36 Monate, Leicht 24 Monate. Datei `data/finance.json`.

### 5.7 Börse (Anlegerstimmung)

```latex
\begin{aligned}
\text{Ziel}_q &= \begin{cases} G_{q-4} \cdot 1{,}05 & G_{q-4} \ge 0 \\ G_{q-4} \cdot 0{,}5 & G_{q-4} < 0 \end{cases} \\
a_q &= \frac{G_q - \text{Ziel}_q}{|\text{Ziel}_q| + 0{,}05 \cdot U_q} \\
\Delta_{\text{Ziel}} &= \begin{cases} +10 & a_q \ge 0{,}2 \\ +5 & 0 \le a_q < 0{,}2 \\ -5 & -0{,}2 < a_q < 0 \\ -10 & a_q \le -0{,}2 \\ -15 & G_q < 0 \le \text{Ziel}_q \ (\text{ersetzt die anderen Fälle}) \end{cases} \\
S_{q+1} &= \text{clamp}\big(S_q + \Delta_{\text{Ziel}} + \Delta_{\text{Ereignisse}} + \Delta_{\text{Dividende}} + \lfloor 0{,}1 \cdot (50 - S_q) \rfloor,\ 0,\ 100\big) \\
\text{Kurs}_q &= \frac{W_q}{\text{Aktien}} \cdot \Big(0{,}7 + 0{,}6 \cdot \frac{S_q}{100}\Big)
\end{aligned}
```

G = Quartalsgewinn, U = Quartalsumsatz, W = Firmenwert (S09). Der Nenner von a ist nie null, weil 5 % des Umsatzes dazukommen; ein Ziel nahe null erzeugt so keine Sprünge. Die Rundung von 0,1 × (50 − S) erfolgt nach der Festkomma-Regel (Abschneiden Richtung null). Im ersten Jahr nach dem Börsengang gilt als Vorjahresquartal das entsprechende Quartal vor dem Börsengang.

Δ Ereignisse je Quartal: Hit (Wertung ab 9) +5, Flop (unter 5) −5, Verschiebung eines angekündigten Titels −3, Skandal −5 bis −10 (Crunch-Enthüllung −10, Datenleck −8, Lootbox −5), Übernahme abgeschlossen +3, Rekordumsatz +3; Boom +2, Krise −3. Summe der Ereignisse höchstens ±15 je Quartal. Δ Dividende nach FRM-R54.

### 5.8 Publisher-Standardangebot

| Parameter | Startwert | Spielraum | Datei |
| --- | --- | --- | --- |
| Vorschuss | 100 % des Budgets | 60–130 % | data/publishers.json |
| Split vor / nach Recoup | 20 % / 50 % | 10–35 % / 35–70 % | data/publishers.json |
| Aufschlag auf Vorschuss | 10 % | 0–25 % | data/publishers.json |
| Laufzeit | 5 Jahre | 3–10 | data/publishers.json |
| IP beim Publisher | ja | ja/nein | data/publishers.json |
| Geduld | 3 Forderungen | 1–5 | data/publishers.json |
| KI-Publisher im Markt 1980 / 1990 / 2000 / ab 2010 | 3 / 5 / 7 / 8 | 2–12 | data/publishers.json |
| Startkapital je KI-Publisher 1980 | 2.000.000 USD (× Epochenfaktor) | 0,5–3 × | data/publishers.json |
| Startruf KI-Publisher | 40–70 (Seed) | 0–100 | data/publishers.json |
| Interesse-Schwelle (Prognose × Markenstärke × Studioruf) | 3.000 bp | 1.000–6.000 bp | data/publishers.json |
| Höchstbudget je Vertrag | 2.500 bp des Publisher-Kapitals | 1.000–5.000 bp | data/publishers.json |

## 6 Entscheidungen des Spielers

| Entscheidung | Wann | Optionen | Standard/Delegation |
| --- | --- | --- | --- |
| Team bilden, auflösen, umsetzen | ab 8 MA, jederzeit | Zuordnung per Ziehen oder Menü | Produzent/Regel |
| Zielgröße pro Abteilung | jederzeit | Zahl | Studioleitung schlägt vor |
| Personalpolitik | jederzeit | Gehalt, Crunch, Ausbildung, Arbeitsmodell | einmal festlegen |
| Schlüsselperson einstellen | Angebot auf dem Markt | annehmen, verhandeln, ablehnen | manuell |
| Abwerbeangebot | Ereignis | Gegenangebot, Halteprämie, gehen lassen | Regel möglich |
| Entlassung | jederzeit | Zahl, Standort | manuell |
| Büro wählen, umziehen, ausbauen | jederzeit, Vorschlag bei 90 % Belegung | Grundriss und Variante | Regel „Vorschlag bei 90 %“ |
| Ausstattung kaufen, verkaufen, aufrüsten | jederzeit, Angebot beim Epochenwechsel | Paket, Stufe | Studioleitung schlägt vor |
| Standort eröffnen, schließen | ab Freischaltung | Region | manuell |
| Outsourcing | jederzeit | Bereich, Umfang, Dauer | Produzent |
| Kredit aufnehmen, tilgen | jederzeit | Betrag, Laufzeit | Regel möglich |
| Publisher-Deal | Angebot | Verhandlungstisch | manuell |
| Auftrag annehmen | Angebot | annehmen, ablehnen, Team | Regel möglich |
| Börsengang, Dividende, Kapitalerhöhung | ab Bedingungen, quartalsweise, jährlich | Anteil, Zeitpunkt, Dividendenstufe, Umfang der Kapitalerhöhung | Finanzvorstand \[später\] |
| Delegationsstufe je Bereich, Regeln, Produzenten | ab drittem parallelen Projekt | Stufe, Regel, Vorgabe | – |

## 7 KI-Verhalten

- KI-Firmen nutzen dieselben Regeln: Teams, Personalpolitik nach Persönlichkeit (Indie: unter Markt, kein Crunch; AAA: über Markt, Crunch vor Gold), Büros, Kredite und Insolvenz.
- **Büro:** Eine KI zieht um, sobald die Belegung 95 % erreicht und ihr Geld die Kaution plus 6 Monatsmieten des nächsten Grundrisses deckt. Sie wählt die günstigste Variante; Marken-Fabriken und AAA-Studios wählen die mit Arbeitgeber-Bonus. Der Spieler erhält seinen Vorschlag schon bei 90 %.
- **Ausstattung:** Eine KI kauft das Paket mit dem höchsten Nutzen für ihre Lieblingsgenres (z. B. Story-lastig → Motion-Capture), sobald Kaufpreis < 5 % des Jahresumsatzes; Hardware rüstet sie auf, wenn H < 0,85.
- **Personal:** KI-Firmen werben Schlüsselpersonen nach FRM-R68 ab, Rivalen bei Groll doppelt so oft (S08). Sie übernehmen Team-Angebote insolventer Firmen (FRM-R70), wenn die Lohnkosten unter 10 % ihres Jahresumsatzes bleiben.
- **Publisher:** KI-Publisher bewerten Angebote nach Prognose × Markenstärke × Ruf des Studios und verhandeln nach ihrer Persönlichkeit (großzügig beim Vorschuss, hart bei IP oder umgekehrt).
- **Börse:** Große KI-Firmen gehen bei Erfüllen der Bedingungen mit 50 % Wahrscheinlichkeit pro Jahr an die Börse.

## 8 Oberfläche

- **Erleben:** Organigramm mit Studio-Knoten und Team-Karten (Ziehen = Umsetzen), Führungskapazität als Steckplätze, Schlüsselpersonen als Porträt-Karten mit Loyalitätsanzeige, Personalpolitik als Schalterleiste, Büro auf der Bühne (Grundriss als Kulisse, Ausstattung als Requisiten), Büro-Katalog als Karten mit Belegungsbalken, Finanzen als Sankey, Verhandlungstisch für Publisher, Regel-Editor als Satzbaukasten.
- **Analysieren:** Tabellen aller Teams und Personen, Lohnkosten je Standort, Kreditliste, Regelprotokoll, Kursverlauf.
- **\[1.1\]** Büro-Ansicht von oben (S11), umschaltbar mit der Bühne.

## 9 Ereignisse und Meldungen

| Ereignis | Klasse | Auslöser |
| --- | --- | --- |
| Abwerbeangebot | Entscheidung | FRM-R11 |
| Schlüsselperson wünscht Projekt / Gehalt / eigenes Studio | Entscheidung | FRM-R13 |
| Legendärer Entwickler auf dem Markt | Entscheidung | FRM-R14 |
| Büro fast voll | Ergebnis | Belegung ≥ 90 % |
| Hardware veraltet | Information | FRM-R29 |
| Hardware-Upgrade zur neuen Epoche | Entscheidung | FRM-R30 |
| Burnout im Team | Ergebnis | Burnout ≥ 60 |
| Insolvenzwarnung | Entscheidung | Kontostand negativ |
| Publisher kürzt / stoppt | Entscheidung | FRM-R46 |
| Auftragsangebot | Entscheidung | FRM-R48 |
| Quartalszahlen, Hauptversammlung | Ergebnis/Entscheidung | FRM-R52/53 |
| Führungskapazität überschritten | Ergebnis | FRM-R57 |

## 10 Schnittstellen

| System | Richtung | Inhalt |
| --- | --- | --- |
| S01 Kern | ↔ | Tick-Schritte Personal (monatlich), Finanzen (wöchentlich, Börse quartalsweise), Regeln im Schritt Eingaben |
| S02 Produkte | → | Teamleistung, Erfahrung, Crunch-Bugs, Produzenten-Vorgaben; ← Meilensteine, Wertungen für Moral |
| S03 Engines | → | Engine-Team-Kapazität, Technischer Direktor |
| S04 Lizenzen | → | Engine-Support-Topf, Showroom-Bonus; ← Lizenzeinnahmen, Open-Source-Ruf |
| S05 Marketing | → | Marketingbudget; ← Verkaufserlöse |
| S06 Betrieb | → | Betriebs-Abteilung und Aufteilung, Serverraum |
| S08 Markt/KI | ↔ | Abwerbung durch Rivalen, Boom und Krise (Entlassungswellen), Arbeitgeber-Ruf in der Rangliste |
| S09 Übernahmen | ↔ | Kultur, Standorte, Integration von Teams, Aktienrückkauf \[später\] |
| S10 Einstellungen | ← | Platzangebot, Startgeld, Kreditrahmen, Insolvenz-Toleranz, Startpolster |
| S11 Oberfläche | → | Organigramm, Bühne, Büro-Ansicht \[1.1\], Verhandlungstisch, Regel-Editor |
| S12 Technik | → | Entitäten Company, Team, KeyPerson, Office, Equipment, Loan, PublisherDeal, Contract, Stock, DelegationRule |
| S13 Ausbau | → | Eigenes Publishing, Co-Entwicklung, Server-Hosting für Fremde, Aktivisten, Delisting |

## 11 Abnahmetests

- **FRM-T01** Gegeben eine Firma mit 7 Mitarbeitern, wenn der Spieler ein Team bilden will, dann ist die Aktion gesperrt; mit 8 Mitarbeitern ist sie möglich.
- **FRM-T02** Gegeben ein Team mit Moral 80 und eines mit Moral 30 sonst gleich, wenn beide eine Woche arbeiten, dann leistet das erste rund 1,28-mal so viel (Formel 5.1: 0,92 gegen 0,72).
- **FRM-T03** Gegeben Crunch-Regel „bei Bedarf“ und 10 Crunch-Wochen, dann liegt der Burnout des Teams bei mindestens 60 und es erscheint eine Burnout-Meldung.
- **FRM-T04** Gegeben eine Etage mit 15 Arbeitsplätzen und 18 Personen, dann sinkt die Moral pro Woche um 4; eine 19. Einstellung wird verhindert.
- **FRM-T05** Gegeben Platzangebot „knapp“, dann hat eine Garage 3 Arbeitsplätze und 1 Ausstattungsplatz.
- **FRM-T06** Gegeben Hardware Stufe 3 gekauft 1994, dann ist H im Jahr 2000 = 1,05 × 0,76 = 0,80 und das Symptom „Arbeitsplätze von 1994“ erscheint.
- **FRM-T07** Gegeben ein Umzug, dann sinkt die Leistung aller Teams des Standorts 2 Wochen auf 70 % und die Kaution beträgt 3 Monatsmieten.
- **FRM-T08** Gegeben ein Tonstudio im Jahr 1988, dann ist der Kauf gesperrt (ab 1990).
- **FRM-T09** Gegeben ein negativer Kontostand über 6 Monate auf Normal, dann endet das Spiel mit Insolvenz; nach 5 Monaten noch nicht. Auf Leicht tritt in den ersten 24 Monaten keine Insolvenz ein, auf Entspannt in den ersten 36 Monaten nicht.
- **FRM-T10** Gegeben ein Publisher-Deal mit Vorschuss 1 Mio. und 20 % vor Recoup, wenn das Spiel 3 Mio. Nettoerlös macht, dann erhält das Studio vor Recoup 20 % und nach Recoup 50 % des jeweiligen Anteils.
- **FRM-T11** Gegeben zwei verfehlte Meilensteine, dann stoppt der Publisher das Projekt oder macht Auflagen; eine Reaktion bleibt nie aus.
- **FRM-T12** Gegeben 6 manuelle Einheiten bei Kapazität 4, dann sinken Tempo und Qualität aller manuellen Einheiten um 10 %.
- **FRM-T13** Gegeben eine zweimal gleich beantwortete Fokus-Karte, dann zeigt die dritte den Knopf „Nicht mehr fragen – Regel anlegen“, und die angelegte Regel trifft die vierte Entscheidung automatisch und steht im Protokoll.
- **FRM-T14** Gegeben ein Simulationslauf mit Bot „volle Delegation“, dann liegen die Pflicht-Entscheidungen pro Jahr 2000–2030 bei höchstens 8.
- **FRM-T15** Gegeben S = 60, Gewinn im Vorjahresquartal 1.000.000 USD (Ziel 1.050.000), U = 4.000.000 USD, G = 1.400.000 USD, keine Ereignisse, keine Dividende. Dann ist a = 350.000 ÷ 1.250.000 = 2.800 bp, Δ Ziel = +10, Rückkehr −1, also S = 69. Mit G = −200.000 USD gilt Δ Ziel = −15 und S = 44.
- **FRM-T28** Firmenwert 500 Mio. USD, 10 Mio. Aktien: Bei S = 50 beträgt der Kurs 50 USD, bei S = 100 beträgt er 65 USD, bei S = 0 beträgt er 35 USD.
- **FRM-T29** Dividende wird von hoch auf niedrig gesenkt: S sinkt im selben Quartal einmalig um 8 und steigt danach um 1 je Quartal statt um 3.
- **FRM-T30** Hauptversammlung bei S = 25: Es entsteht genau eine Pflicht-Entscheidung; Ablehnen ergibt S = 15, Annehmen S = 33 (vor Rückkehr zur Mitte).
- **FRM-T31** Kapitalerhöhung bei S = 65 ist gesperrt; bei S = 72 ist sie möglich, danach ist S = 67 und eine zweite Erhöhung im selben Jahr gesperrt.
- **FRM-T32** Gegeben eine Suche „Grafik ab 60“ bei Marktgehalt 1.500 USD, dann kostet sie 3.000 × 1,8 = 5.400 USD und dauert 4 Wochen; jeder vorgeschlagene Kandidat hat Grafik ≥ 60; während sie läuft, ist eine zweite Suche gesperrt.
- **FRM-T16** Gegeben zwei Testlabore im selben Büro, dann steigt die QA-Kapazität um 3.000 + 2.100 = 5.100 bp (+51 %), und beide belegen je einen Ausstattungsplatz.
- **FRM-T17** Gegeben ein Campus mit 10 Plätzen, dann passen 5 Großausbauten (je 2 Plätze), aber kein weiterer Raum; ein Rechenzentrum im Bürohaus ist gesperrt (Mindestgröße Eigenes Gebäude).
- **FRM-T18** Gegeben ein Team mit Moral 70 und 4 Crunch-Wochen ohne andere Einflüsse, dann hat es danach Moral 58. Crunch in zwei Projekten im selben Monat erhöht c in Formel 5.3 um 2.
- **FRM-T19** Gegeben ein Abwerbeangebot mit Aufschlag 2.000 bp an eine Person mit Loyalität 60, dann beträgt die Erfolgschance 3.000 bp. Bei Loyalität 95 und Aufschlag 0 beträgt sie 0. Ein zweiter Versuch im selben Jahr ist gesperrt.
- **FRM-T20** Gegeben Talentpool 100, R\_AG 50, vor Ort, dann kommen 5 Bewerber pro Monat; mit Akademie 6 (6,5 abgeschnitten).
- **FRM-T21** Gegeben eine insolvente KI-Firma mit 3 Teams, dann erscheinen 3 Team-Angebote für 4 Wochen; ein angenommenes Team arbeitet 4 Wochen mit steigender Leistung von 50 % auf 100 %.
- **FRM-T22** Gegeben Jahresgewinn 1.000.000 USD, zwei Standorte mit Lohnkosten 60/40 und Steuersätzen 3.000 und 2.000 bp, dann beträgt die Steuer 180.000 + 80.000 = 260.000 USD. Bei einem Verlust im Vorjahr von 400.000 USD sinkt die Bemessung auf 600.000 USD.
- **FRM-T23** Gegeben eine Tochter mit Quartalsgewinn 500.000 USD und Abführung 7.000 bp, dann fließen 350.000 USD an die Mutter und 150.000 USD bleiben auf dem Tochterkonto.
- **FRM-T24** Gegeben eine Strategiekonferenz ohne Antwort bis zum Verfall, dann gelten die Ziele des Vorjahres, und die Karte zählt als eine Pflicht-Entscheidung.
- **FRM-T25** Gegeben das Jahr 2035, dann beträgt das Basisgehalt 16.750 USD pro Person und Monat (linear zwischen 15.500 und 18.000). Eine Garage kostet 1980 150 USD pro Arbeitsplatz.
- **FRM-T26** Gegeben ein Auftrag mit Anforderung 40 und ein Team mit Stärke 80 und Erfahrung 50, dann ist q = 40 und der Auftrag erfüllt; bei Anforderung 41 verfehlt.
- **FRM-T27** Gegeben 1980, dann gibt es 3 KI-Publisher mit Startruf zwischen 40 und 70; ein Angebot unter der Interesse-Schwelle von 3.000 bp erhält nur Absagen.

## 12 Spätere Versionen

- **\[1.1\]** Büro-Ansicht von oben mit sichtbaren Räumen; Klick auf einen Raum öffnet dessen Ausstattung.
- **\[später\]** Eigenes Publishing mit Abteilung Publishing und Startprofil Publisher; Co-Entwicklung und Server-Hosting für Fremde als Aufträge; Börse mit Aktivisten, Aktienrückkauf, Übernahmeschutz und Delisting; Finanzvorstand als Schlüsselperson, der die Dividendenstufe delegiert übernimmt.
- **Bewusst nicht:** freier Bürobau, Wände, einzeln platzierbare Möbel.

## Änderungen nach Prüfung 3

- Insolvenz-Toleranz auf Normal 6 Monate (FRM-R40, FRM-T09). Startpolster Entspannt 3 Jahre, Leicht 2 Jahre (FRM-R41).
- Basisgehälter 2020 13.000, 2030 15.500, 2040 18.000 USD (Tabelle 5.5). Garagenmiete 1980 150 USD pro Arbeitsplatz (Tabelle 5.4).
- Ausstattung nach A31: Equipment.type erweitert, Kapazitätsräume mehrfach mit 7.000 bp Nutzen ab dem zweiten (FRM-R27, FRM-R65), fünf Großausbauten mit 2 Plätzen (FRM-R66, Tabelle 5.4).
- Führungskapazität 3–40. Auftragsprüfung mit Skalen 0–100 (FRM-R49). FRM-T15 mit festen Werten für E, G und U.
- Publisher-Startwerte ergänzt (Tabelle 5.8).
- Crunch −3 Moral pro Woche (FRM-R07); Crunch-Monate über alle Projekte summiert (Formel 5.3).
- Neu: Strategiekonferenz (FRM-R67), aktives Abwerben (FRM-R68), Akademie in der Bewerberformel (FRM-R69, Formel 5.3), Teams insolventer Firmen als Angebote (FRM-R70), Studiokultur (FRM-R71), regionale Steuern (FRM-R72), Tochterkonto mit 7.000 bp Abführung (FRM-R73). Tests FRM-T16 bis FRM-T27.
- KI-Umzug bei 95 % Belegung, wenn Kaution plus 6 Monatsmieten gedeckt sind (Kapitel 7).
- Börse vereinfacht (Entscheidung des Autors): ein Wert Anlegerstimmung mit sichtbarer Zielmarke statt Kursformel, Erwartung und Prognose (FRM-R51–R54, R74, R75, Formel 5.7, Tests FRM-T15, T28–T31). Übernahmen bleiben unverändert (S09).
