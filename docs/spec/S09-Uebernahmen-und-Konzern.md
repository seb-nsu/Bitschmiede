# S09 Übernahmen und Konzern

**Version:** 1.0, Stand 29.10.2026 · **Quelle:** Design-Dokument, Kapitel „Übernahmen und Konzern“, „Firma → Börse und Aktionäre“, „Markt → Rivalen“ · **Prefix:** UEB

## 1 Zweck und Abgrenzung

Übernahmen sind das Spätspiel-System für große Firmen (ab etwa 2005 oder ab einer Firmengröße). Der Spieler kann KI-Firmen kaufen, auch Publisher, Engine-Anbieter, Middleware-Firmen und Plattformhersteller, und führt sie danach als Tochterstudios mit Vorgaben.

- **In 1.0 (Minimalversion):** Komplettkauf, Prüfung ja oder nein mit Wertspanne, Finanzierung per Bargeld oder Kredit, Integrationskapazität, Halteprämien, drei Vorgaben (Autonomie, Genres und Marken, Budget und Umfang), Schließen als einzige Reorganisation, Abschreibung.
- **Später (S13):** weitere Beteiligungsformen, Aktien als Kaufpreis, Earn-outs, Behörde mit Auflagen, Zielklauseln, Fusion, Ausgliederung, Management-Buyout, feindliche Übernahmen, Aktivisten.
- **Nicht hier:** Börse und Aktienkurs (S07), Verhandlungstisch als Oberfläche (S11), Rivalen-Persönlichkeit (S08).
- **Streichliste:** Wird es knapp, wandert das ganze System nach 1.1 (Punkt 1 der Streichliste).

## 2 Begriffe

| Begriff | Bedeutung |
| --- | --- |
| Zielfirma | Die Firma, die gekauft werden soll |
| Wertspanne | Geschätzter Firmenwert als Spanne (unteres Ende, Mitte, oberes Ende); ohne Prüfung breit, mit Prüfung schmal |
| Prüfung (Due Diligence) | Kostenpflichtige Untersuchung, die verborgene Befunde aufdeckt und die Spanne verengt |
| Befund | Verborgener Umstand der Zielfirma (Schulden, Projekt in Schieflage, wechselwillige Schlüsselperson, Rechtsstreit, Technik-Schuld) |
| Kontrollprämie | Aufschlag auf den Wert, den Käufer für die volle Kontrolle zahlen |
| Bieterkampf | Aufschlag, wenn weitere Käufer interessiert sind |
| Integration | Phase nach dem Kauf (12–24 Monate), in der Moral, Abwanderung und Synergien entschieden werden |
| Integrationskapazität | Zahl gleichzeitig laufender Integrationen, die die Konzernführung ohne Malus betreut |
| Vorgabe (Directive) | Regel des Konzerns für ein Tochterstudio |
| Halteprämie | Zahlung an eine Schlüsselperson, damit sie nach dem Kauf bleibt |
| Abschreibung | Differenz zwischen Kaufpreis und späterem Wert, die als einmaliger Verlust gebucht wird |

## 3 Daten

| Entität/Feld | Typ | Einheit/Bereich | Bedeutung |
| --- | --- | --- | --- |
| **AcquisitionOffer** |  |  | Laufendes Kaufverfahren |
| .id | string |  | Kennung |
| .buyerId, .targetId | CompanyId |  | Käufer und Zielfirma |
| .phase | enum | sondieren, prüfen, bieten, warten, abgeschlossen, gescheitert | Ablauf |
| .valueRange | {low, mid, high} | Cent | Wertspanne beim aktuellen Wissensstand |
| .diligence | enum | keine, laufend, fertig | Prüfung |
| .diligenceWeeksLeft | int | 0–12 | Restdauer der Prüfung |
| .findings | Finding\[\] |  | Aufgedeckte Befunde |
| .bid | int | Cent | Gebotener Preis |
| .financing | {cash, loan} | Cent | Aufteilung der Finanzierung |
| .retentionBonuses | {personId, amount}\[\] | Cent | Halteprämien |
| .directives | Directive |  | Vorgaben ab dem Kauf |
| .competingBidders | CompanyId\[\] | 0–3 | Weitere Bieter |
| **Finding** |  |  | Verborgener Umstand |
| .type | enum | schulden, projekt\_schieflage, wechselwillig, rechtsstreit, technikschuld, positiv\_prototyp | Art |
| .impact | int | Cent | Wirkung auf den Wert (negativ oder positiv) |
| .revealed | bool |  | Ob aufgedeckt |
| **Subsidiary** (Erweiterung von Company) |  |  | Tochterstudio |
| .ownerId | CompanyId |  | Eigentümer |
| .acquiredWeek | int | Spielwoche | Kaufzeitpunkt |
| .purchasePrice | int | Cent | Kaufpreis |
| .bookValue | int | Cent | Aktueller Buchwert |
| .integration | {progress, weeksLeft, state} | 0–100 %, Wochen, enum gut/angespannt/chaos | Integration |
| .culture | enum | 1–3 Merkmale aus FRM-R71 (S07) | Kultur |
| .directives | Directive |  | Vorgaben |
| **Directive** |  |  | Vorgaben an ein Tochterstudio |
| .autonomy | enum | selbststaendig, rahmen, gesteuert | Autonomie \[1.0\] |
| .genresBrands | {allowedGenres\[\], allowedBrands\[\]} | leer = frei | Genres und Marken \[1.0\] |
| .budgetScope | {maxBudget, maxScope} | Cent; klein–AAA | Budget und Umfang \[1.0\] |
| .platforms, .engine, .businessModels, .goals, .staff |  |  | Weitere Vorgaben \[später\] |
| **PlatformOwnership** |  |  | Wenn ein Plattformhersteller gekauft wurde |
| .platformIds | PlatformId\[\] |  | Plattformen im Konzern |
| .successorCancelled | bool | Standard false | Nur durch ausdrücklichen Befehl true |

## 4 Regeln

**Freischaltung und Ablauf**

- **UEB-R01** \[1.0\] Übernahmen sind verfügbar, sobald das Jahr ≥ 2005 ist und die Firma mindestens 150 Mitarbeiter hat (A02). Zusätzlich muss die Option „Übernahmen“ in den Einstellungen an sein.
- **UEB-R02** \[1.0\] Jede KI-Firma kann Ziel sein, auch Publisher, Engine-Anbieter, Middleware-Firmen und Plattformhersteller; Firmen des Spielers selbst sind in 1.0 kein Ziel.
- **UEB-R03** \[1.0\] Ein Kauf durchläuft die Phasen Sondieren → (optional) Prüfen → Bieten → Warten auf Antwort → Abgeschlossen oder Gescheitert.
- **UEB-R04** \[1.0\] In 1.0 gibt es nur den Komplettkauf (100 % der Anteile).
- **UEB-R05** \[1.0\] Beim Sondieren sieht der Spieler eine Wertspanne von ±4.000 bp um einen verschobenen Mittelwert: Mitte = W × (10.000 + o) / 10.000. Der Versatz o wird beim ersten Sondieren einmal aus dem Zufallsstrom „acquisitions“ gezogen (−2.500 bis +2.500 bp) und bleibt für diese Zielfirma fest. Die Mitte verrät also nicht den wahren Wert. Befunde bleiben verborgen.
- **UEB-R06** \[1.0\] Eine Prüfung kostet 150 bp des angezeigten Mittelwerts (mindestens 50.000 USD) und dauert 4–12 Wochen je nach Firmengröße. Sie deckt alle Befunde auf, setzt den Versatz o auf 0 und verengt die Spanne auf ±1.000 bp um den wahren Wert.
- **UEB-R07** \[1.0\] Ohne Prüfung werden Befunde erst nach Abschluss des Kaufs wirksam und erscheinen dann als Ereignis.
- **UEB-R08** \[1.0\] Die Zielfirma nimmt ein Gebot an, wenn es mindestens ihren Mindestpreis erreicht; der Mindestpreis ist der wahre Wert × (1 + Kontrollprämie + Bieterkampf).
- **UEB-R09** \[1.0\] Liegt ein Gebot zwischen 85 % und 100 % des Mindestpreises, macht die Zielfirma ein Gegenangebot; darunter lehnt sie ab und sperrt weitere Gebote für 26 Wochen.
- **UEB-R10** \[1.0\] Pro Zielfirma kann es bis zu drei weitere Bieter geben; jeder weitere Bieter erhöht den Bieterkampf-Aufschlag.

**Finanzierung**

- **UEB-R11** \[1.0\] Der Kaufpreis wird aus Bargeld und Kredit bezahlt; der Kredit folgt den Kreditregeln aus S07 (Zins nach Kreditwürdigkeit).
- **UEB-R12** \[1.0\] Ein Kauf, der das Bargeld unter die Kosten von drei Monaten drückt, löst vor dem Bestätigen eine Warnung aus.
- **UEB-R13** \[später\] Aktien als Kaufpreis sind nach einem Börsengang möglich und verwässern den eigenen Anteil.
- **UEB-R14** \[später\] Fremdfinanzierung durch Investoren hat Bedingungen (Kennzahlen); werden sie verfehlt, drohen Zwangsverkäufe.

**Nach dem Kauf**

- **UEB-R15** \[1.0\] Mit dem Abschluss gehen Marken, Engines, Lizenzverträge (als Lizenzgeber und -nehmer), laufende Projekte, Teams, Büros, Standorte und Schulden der Zielfirma auf den Käufer über.
- **UEB-R16** \[1.0\] Jede gekaufte Firma startet eine Integration von 52 Wochen (klein) bis 104 Wochen (groß).
- **UEB-R17** \[1.0\] Die Integrationskapazität ist 1 plus die Zahl der Führungskräfte mit Rolle Studioleitung im Konzern, höchstens 4.
- **UEB-R18** \[1.0\] Laufen mehr Integrationen als die Kapazität, sinkt in allen laufenden Integrationen die Moral jede Woche um 0,5 Punkte, und Termine verschieben sich um 10 %.
- **UEB-R19** \[1.0\] Jede Schlüsselperson der Zielfirma hat nach dem Kauf eine Wechselneigung; eine Halteprämie senkt sie für 104 Wochen.
- **UEB-R20** \[1.0\] Kultur-Fit: Verglichen werden die Kulturmerkmale der Zielfirma mit denen des Käufers, auch wenn der Käufer der Spieler ist (FRM-R71). Fit = gemeinsame Merkmale / Merkmale der Zielfirma (0–10.000 bp). Liegt der Fit unter 5.000 bp, verlängert sich die Integration um 25 % und die Moral sinkt einmalig um 10 Punkte. Fehlpassung in Formel 5.3 = 10.000 − Fit.
- **UEB-R21** \[1.0\] Synergien (gemeinsame Engine, QA, Marketing, Vertrieb) senken die laufenden Kosten der Tochter um bis zu 10 %, wirken aber erst ab 50 % Integrationsfortschritt.
- **UEB-R22** \[1.0\] Doppelte Abteilungen (z. B. zwei Marketing-Teams) kosten bis zum Abschluss der Integration voll weiter.
- **UEB-R23** \[1.0\] Fällt der Buchwert einer Tochter unter 60 % des Kaufpreises, wird die Differenz zum Jahresende abgeschrieben; das senkt den Jahresgewinn und, bei Börsennotierung, den Kurs.
- **UEB-R40** \[1.0\] Engine-Einarbeitung (A29): Eine gekaufte Engine ist ab dem Abschluss für alle Teams des Konzerns nutzbar. Teams ohne Erfahrung mit ihr arbeiten zuerst 3.000 bp langsamer. Der Malus sinkt linear auf 0, über 8 Wochen bei gleicher Engine-Generation, sonst über 16 Wochen. Ein Tochter-Team als Mentor halbiert die Restdauer (abgeschnitten); es verliert in dieser Zeit 2.000 bp eigener Leistung.
- **UEB-R41** \[1.0\] Tochterkonto (A29): Jede Tochter führt ein eigenes Konto und führt quartalsweise 7.000 bp ihres Quartalsgewinns an die Mutter ab (einstellbar, Regeln in FRM-R73). Das Budget aus der Vorgabe „Budget und Umfang“ wird vom Tochterkonto bezahlt. Die Mutter kann Geld zuschießen oder entnehmen; eine Entnahme senkt die Moral der Tochter um 5 Punkte.

**Vorgaben**

- **UEB-R24** \[1.0\] In 1.0 gibt es drei Vorgaben: Autonomie (selbstständig, mit Rahmen, gesteuert), Genres und Marken (erlaubte Listen), Budget und Umfang (Obergrenzen).
- **UEB-R25** \[1.0\] Selbstständige Studios wählen Projekte selbst nach ihrer KI-Persönlichkeit; gesteuerte Studios brauchen für jedes neue Projekt die Freigabe des Spielers (eine Fokus-Karte, delegierbar).
- **UEB-R26** \[1.0\] Je enger die Vorgaben, desto niedriger die Moral (gesteuert: −10 Punkte dauerhaft) und desto geringer die Streuung der Ergebnisse (gesteuert: Varianz der Wertung −30 %).
- **UEB-R27** \[später\] Weitere Vorgaben: Plattformen, Engine-Pflicht, Geschäftsmodelle, Ziele, Personal; Zielklauseln koppeln Autonomie an Ergebnisse.

**Reorganisation**

- **UEB-R28** \[1.0\] Die einzige Reorganisation in 1.0 ist das Schließen eines Tochterstudios: Kosten sinken sofort, Marken und Engines bleiben im Konzern, laufende Projekte werden abgebrochen (Regeln aus S02).
- **UEB-R29** \[1.0\] Schließen kostet Ruf als Arbeitgeber (−5 bis −20 je nach Größe und Erfolg des Studios) und Ruf in der Region des Standorts.
- **UEB-R30** \[später\] Zusammenlegen, Teams verschieben, Verkaufen, Ausgliedern, Management-Buyout.

**Besondere Ziele**

- **UEB-R31** \[1.0\] Kauft der Spieler einen Plattformhersteller, laufen dessen Plattformen unverändert weiter; geplante Nachfolger erscheinen wie vorgesehen, ihr Lebenszyklus folgt weiter den Marktregeln aus S08.
- **UEB-R32** \[1.0\] Eine geplante Plattform entfällt nur, wenn der Spieler sie über den eigenen Befehl „Plattform einstellen“ ausdrücklich streicht; der Befehl zeigt vorher die Folgen für Ruf, Lizenznehmer und betroffene Studios und verlangt eine Bestätigung.
- **UEB-R33** \[1.0\] Als Eigentümer eines Plattformherstellers kann der Spieler Preis der Konsole, Lizenzgebühr und Exklusivtitel beeinflussen; die Regeln dafür liefert S08.
- **UEB-R34** \[1.0\] Kauft der Spieler einen Engine-Anbieter, übernimmt er dessen Engine, alle Lizenzverträge und den Vertrauenswert; die Lizenznehmer bleiben Kunden, reagieren aber auf Preisänderungen nach den Regeln aus S04.
- **UEB-R35** \[1.0\] Kauft der Spieler seinen eigenen Engine-Anbieter, entfallen künftige Gebühren an diesen für eigene Spiele.
- **UEB-R42** \[1.0\] Einzelne Marken kauft der Spieler in 1.0 über den Markenmarkt (S04), nicht über eine Übernahme. Wer nur eine Marke will, muss die Firma also nicht kaufen. Der Markenwert M in Formel W nutzt dieselbe Bewertung wie der Markenmarkt, damit beide Wege nicht auseinanderlaufen.

**KI und Balancing**

- **UEB-R36** \[1.0\] KI-Konzerne kaufen nach denselben Regeln und können sich übernehmen (zu viele Integrationen, Kreditlast).
- **UEB-R37** \[1.0\] Ein Aufkäufer-Rivale bietet in 1.0 um dieselben Zielfirmen wie der Spieler, greift aber nicht die Firma des Spielers an.
- **UEB-R38** \[später\] Feindliche Übernahmen, Aktivisten und Schutz durch eigenen Aktienanteil (setzt Börse voraus).
- **UEB-R39** \[1.0\] In Simulationsläufen zerbricht in höchstens 1 von 5 Läufen ein KI-Konzern an zu vielen Käufen, in mindestens 1 von 20 Läufen passiert es.

## 5 Formeln und Startwerte

**Wahrer Wert einer Firma:**

```latex
W = E_{\text{Ertrag}} + M_{\text{Marken}} + T_{\text{Technik}} + H_{\text{Plattform}} + P_{\text{Team}} - S_{\text{Schulden}} + \sum \text{Befunde}
```

- E = Durchschnittsgewinn der letzten 3 Jahre × Ertragsmultiplikator (bei Verlust: 0).
- M = Summe über Marken: Stärke × Markenfaktor × Marktgröße der Epoche.
- T = Summe über Engines: Lizenzumsatz des letzten Jahres × Engine-Multiplikator + Forschungswert der Module.
- P = Mitarbeiterzahl × Jahresgehalt der Epoche × Teamfaktor × (Durchschnittsstärke / 50).
- H = Summe über eigene Plattformen: Lizenz- und Hardware-Ertrag des letzten Jahres × Plattform-Multiplikator (Start 4) × Restlebensdauer-Anteil (0–10.000 bp, aus dem Lebenszyklus in S08). Ohne Plattform ist H = 0.
- Im Kern rechnen alle Faktoren in bp und alle Beträge in Cent, abgeschnitten nach jedem Schritt (A22).

**Mindestpreis der Zielfirma:**

```latex
P_{\min} = W \cdot (1 + k_{\text{Kontrolle}} + b \cdot n_{\text{Bieter}}) \cdot f_{\text{Stimmung}}
```

f\_Stimmung = 0,9 im Abschwung, 1,0 normal, 1,2 im Boom (Marktzyklus aus S08).

**Wechselneigung einer Schlüsselperson nach dem Kauf** (Wahrscheinlichkeit zu gehen, pro Quartal):

```latex
q = \text{clamp}\Big(q_0 + q_{\text{Kultur}} \cdot \text{Fehlpassung} + q_{\text{Vorgabe}} \cdot \text{Enge} - q_{\text{Prämie}} \cdot \min\!\Big(1, \frac{\text{Prämie}}{\text{Jahresgehalt}}\Big),\ 0,\ 1\Big)
```

**Integrationsfortschritt pro Woche:**

```latex
\Delta I = \frac{100}{D} \cdot \max\Big(0,\ 1 - c_{\text{Überlast}} \cdot \max(0,\, n_{\text{Integr}} - K)\Big)
```

D = Integrationsdauer in Wochen, K = Integrationskapazität. Der Fortschritt sinkt nie (ΔI ≥ 0); ab 4 Integrationen über K steht er still. Die Wechselneigung q bleibt zwischen 0 und 10.000 bp, auch bei hoher Prämie.

| Parameter | Startwert | Bereich | Datei |
| --- | --- | --- | --- |
| Freischaltung Jahr / Mindestgröße | 2005 / 150 Mitarbeiter | 1995–2015 / 50–500 | data/acquisitions.json |
| Ertragsmultiplikator | 8 | 5–15 | data/acquisitions.json |
| Markenfaktor | 0,6 | 0,2–1,5 | data/acquisitions.json |
| Engine-Multiplikator | 6 | 3–10 | data/acquisitions.json |
| Plattform-Multiplikator | 4 | 2–8 | data/acquisitions.json |
| Teamfaktor (Jahresgehälter pro Person) | 0,5 | 0,2–1,0 | data/acquisitions.json |
| Wertspanne ohne / mit Prüfung | ±4.000 bp um versetzte Mitte (Versatz ±2.500 bp) / ±1.000 bp um den wahren Wert | 20–60 % / 5–20 % | data/acquisitions.json |
| Prüfungskosten | 1,5 % des Mittelwerts, mind. 50.000 USD | 0,5–3 % | data/acquisitions.json |
| Prüfungsdauer | 4 Wochen (unter 50 Pers.) bis 12 Wochen (über 500) | 2–16 | data/acquisitions.json |
| Kontrollprämie k | 0,30 | 0,15–0,50 | data/acquisitions.json |
| Bieterkampf b je weiterem Bieter | 0,10 | 0,05–0,25 | data/acquisitions.json |
| Gegenangebots-Fenster | 85–100 % des Mindestpreises | 70–95 % | data/acquisitions.json |
| Sperre nach Ablehnung | 26 Wochen | 13–52 | data/acquisitions.json |
| Integrationsdauer | 52 (unter 50 Pers.), 78 (50–300), 104 (über 300) Wochen | 26–156 | data/acquisitions.json |
| Integrationskapazität | 1 + Studioleitungen, max. 4 | 1–6 | data/acquisitions.json |
| Überlast-Malus c | 0,25 je Integration über K | 0,1–0,5 | data/acquisitions.json |
| q₀ / q\_Kultur / q\_Vorgabe / q\_Prämie | 0,04 / 0,08 / 0,06 / 0,08 | je 0–0,2 | data/acquisitions.json |
| Synergie max. | 10 % der laufenden Kosten, ab 50 % Integration | 0–20 % | data/acquisitions.json |
| Abschreibungsschwelle | Buchwert unter 60 % des Kaufpreises | 40–80 % | data/acquisitions.json |
| Moral gesteuert / Kultur-Fehlpassung | −10 dauerhaft / −10 einmalig | 0 bis −25 | data/acquisitions.json |
| Ruf beim Schließen | −5 (klein, erfolglos) bis −20 (groß, erfolgreich) |  | data/acquisitions.json |
| Engine-Einarbeitung (Malus / Dauer) | 3.000 bp / 8 Wochen (gleiche Engine-Generation) bis 16 Wochen (fremde) | 1.000–5.000 bp / 4–26 | data/acquisitions.json |
| Gewinnabführung Tochter | 7.000 bp pro Quartal | 0–10.000 bp | data/finance.json (S07) |
| Versatz der Wertspanne o | −2.500 bis +2.500 bp, gleichverteilt | 0–4.000 bp | data/acquisitions.json |

## 6 Entscheidungen des Spielers

| Entscheidung | Wann | Optionen | Standard/Delegation |
| --- | --- | --- | --- |
| Sondieren | jederzeit, aus Rangliste, Firmenkarte oder Angebot | Ziel ansehen, Wertspanne lesen | – |
| Prüfen | nach dem Sondieren | ja (Kosten, Wochen) oder nein | Vorschlag: ja ab Ziel über 10 % des eigenen Werts |
| Bieten | nach Sondieren oder Prüfung | Preis, Finanzierung Bargeld/Kredit, Halteprämien | Vorschlag: Mitte der Spanne × 1,3 |
| Gegenangebot beantworten | wenn die Zielfirma es macht | annehmen, nachbessern, zurückziehen | Fokus-Karte, pausiert |
| Vorgaben festlegen | beim Abschluss, jederzeit änderbar | Autonomie, Genres und Marken, Budget und Umfang | Vorschlag nach Kultur der Firma |
| Halteprämien | beim Bieten und während der Integration | Betrag pro Schlüsselperson | Vorschlag: 50 % Jahresgehalt für Leitungen und Stars |
| Projekt eines gesteuerten Studios freigeben | bei jedem neuen Projekt | freigeben, ändern, ablehnen | delegierbar per Regel |
| Tochter schließen | jederzeit | mit Bestätigung und Folgenanzeige | nie automatisch |
| Plattform einstellen | nur bei gekauftem Hersteller | eigener Befehl mit Rückfrage | nie automatisch |

## 7 KI-Verhalten

- **Wer kauft:** KI-Firmen mit Persönlichkeit AAA, Publisher oder Archetyp „Aufkäufer“ prüfen einmal pro Quartal Ziele, wenn ihr Bargeld plus Kreditrahmen mindestens 1,5 × den Mindestpreis deckt.
- **Was gekauft wird:** Ziele werden nach Nutzen sortiert: Marke im Lieblingsgenre, Engine mit Lizenzumsatz, Middleware-Modul, das der eigenen Engine fehlt, Studio mit hoher Teamstärke und niedrigem Preis.
- **Wie geboten wird:** Gebot = Mindestschätzung × (1,0 bis 1,4 nach Risikofreude). Vorsichtige KI prüft immer, riskante selten.
- **Grenzen:** Eine KI startet keine neue Übernahme, solange ihre Integrationen über der Kapazität liegen – außer der Archetyp „Aufkäufer“, der dieses Risiko bewusst eingeht und daran scheitern kann.
- **Als Ziel:** Eine Zielfirma lehnt Gebote unter dem Mindestpreis ab; ein Rivale mit Groll gegen den Spieler verlangt +15 % vom Spieler und bevorzugt andere Käufer bei gleichem Preis.
- **Bieterkampf:** Bietet der Spieler um eine Firma, prüft jeder interessierte KI-Konzern einmal, ob er mitbietet (Wahrscheinlichkeit nach Nutzen).

## 8 Oberfläche

- **Erleben:** Die Zielfirma erscheint als Karte mit Wappen, Marken, Engine und Wertspanne als Prognose-Fächer (breit ohne, schmal mit Prüfung). Gebote laufen am **Verhandlungstisch** (S11): Spannen-Balken für Preis und Halteprämien, Porträt des Gegenübers mit Stimmung, Vorher/Nachher für Bargeld und Kredit.
- **Konzern:** Tochterstudios im Organigramm der Firma-Ansicht mit Integrationsbalken, Kultur-Symbol, Autonomie-Drehknopf und Vorgaben als Chips. Integrationsampel gut/angespannt/Chaos mit Form.
- **Analysieren:** Tabelle aller Tochterfirmen mit Kaufpreis, Buchwert, Gewinn, Integration, Abwanderung; Wasserfall des Firmenwerts (Ertrag, Marken, Technik, Team, Schulden, Befunde).
- **Plattform einstellen:** Eigener Dialog mit Folgenliste und zweistufiger Bestätigung.

## 9 Ereignisse und Meldungen

| Ereignis | Auslöser | Klasse |
| --- | --- | --- |
| „Eine Firma steht zum Verkauf“ | KI-Firma in Geldnot oder Gründer will aussteigen | Entscheidung |
| „Weiterer Bieter aufgetaucht“ | KI bietet mit | Ergebnis |
| „Gegenangebot von …“ | Gebot im Fenster 85–100 % | Entscheidung |
| „Befund nach dem Kauf: …“ | Kauf ohne Prüfung mit verborgenem Befund | Ergebnis |
| „Schlüsselperson will gehen“ | Wechselneigung ausgelöst | Entscheidung (Prämie, gehen lassen) |
| „Integration gerät ins Stocken“ | Zustand wechselt zu Chaos | Ergebnis |
| „Abschreibung zum Jahresende“ | Buchwert unter Schwelle | Information mit Wasserfall |
| Schlagzeile „Konzern X kauft Studio Y“ | KI-Kauf | Information (Ticker) |

## 10 Schnittstellen

| System | Richtung | Inhalt |
| --- | --- | --- |
| S01 Kern | nutzt | Quartals-Job für KI-Kaufprüfung, Wochen-Job für Integration, Ereignis-Warteschlange (max. 1 Angebot/Woche) |
| S02 Produkte | schreibt | Projekte wechseln den Eigentümer; Abbruch beim Schließen |
| S03 Engines | schreibt | Engines und Module wechseln den Eigentümer |
| S04 Lizenzen | schreibt | Verträge gehen mit; Vertrauenswert des Anbieters bleibt |
| S05 Marketing | liest | Marken-Bekanntheit für den Wert |
| S07 Firma | liest/schreibt | Geld, Kredit, Kreditwürdigkeit, Teams, Schlüsselpersonen, Büros, Standorte, Ruf als Arbeitgeber, Abschreibung im Abschluss, Aktienkurs |
| S08 Markt/KI | liest/schreibt | Marktzyklus, Rivalen-Beziehung und Gedächtnis, Plattformhersteller und Nachfolger-Roadmap |
| S10 Ziele | meldet | Erfolge (erste Übernahme, Integration ohne Abwanderung), Szenario „Konzern-Integration“ |
| S11 Oberfläche | nutzt | Verhandlungstisch, Organigramm, Prognose-Fächer, Wasserfall |
| S12 Technik | – | Eigener Zufallsstrom „acquisitions“ |
| S13 Ausbau | erweitert | Beteiligungsformen, Behörde, feindliche Übernahmen |

## 11 Abnahmetests

- **UEB-T01** Gegeben das Jahr 2004 und 120 Mitarbeiter, wenn der Spieler eine Firma sondieren will, dann ist der Befehl gesperrt mit Grund.
- **UEB-T02** Gegeben eine Zielfirma mit wahrem Wert 10 Mio. USD und Versatz o = +2.000 bp, wenn der Spieler sondiert, dann liegt die Mitte bei 12 Mio. und die Spanne zwischen 7,2 und 16,8 Mio. Nach der Prüfung liegt sie zwischen 9 und 11 Mio.
- **UEB-T03** Gegeben eine Prüfung, wenn sie abgeschlossen ist, dann sind alle Befunde sichtbar und die Spanne beträgt höchstens ±10 %.
- **UEB-T04** Gegeben ein Gebot von 90 % des Mindestpreises, dann kommt ein Gegenangebot; bei 80 % eine Ablehnung und eine Sperre von 26 Wochen.
- **UEB-T05** Gegeben ein gekaufter Konsolenhersteller mit angekündigtem Nachfolger, wenn der Spieler nichts tut, dann erscheint der Nachfolger zum geplanten Termin.
- **UEB-T06** Gegeben ein gekaufter Konsolenhersteller, wenn der Spieler „Plattform einstellen“ wählt und abbricht, dann bleibt die Plattform unverändert.
- **UEB-T07** Gegeben drei laufende Integrationen bei Kapazität 2, dann sinkt die Moral in allen dreien wöchentlich und der Fortschritt ist um 25 % langsamer.
- **UEB-T08** Gegeben ein gekaufter Engine-Anbieter mit 10 Lizenznehmern, dann zahlen alle 10 ihre Gebühren ab dem nächsten Monats-Tick an den Spieler; Gebühren des laufenden Monats gehen noch an den Verkäufer.
- **UEB-T09** Gegeben eine Tochter mit Buchwert 50 % des Kaufpreises am Jahresende, dann erscheint eine Abschreibung im Jahresabschluss.
- **UEB-T10** Gegeben 100 Simulationsläufe 1980–2040, dann zerbricht in 5–20 Läufen mindestens ein KI-Konzern an zu vielen Käufen.
- **UEB-T11** Gegeben das Jahr 2010 und 120 Mitarbeiter, dann ist Sondieren gesperrt; mit 150 Mitarbeitern ist es möglich.
- **UEB-T12** Gegeben 100 Zielfirmen mit Seed-Versatz, dann liegt die Mitte der Spanne nicht bei allen auf dem wahren Wert, aber der wahre Wert liegt immer in der Spanne (Versatz ≤ 2.500 bp < Breite 4.000 bp).
- **UEB-T13** Gegeben ein Konsolenhersteller mit 1 Mio. USD Lizenz- und Hardware-Ertrag, Multiplikator 4 und Restlebensdauer 5.000 bp, dann ist H = 2 Mio. USD und W steigt um diesen Betrag.
- **UEB-T14** Gegeben 7 Integrationen bei Kapazität 2, dann ist ΔI = 0 und nie negativ. Gegeben eine Halteprämie gleich dem Jahresgehalt und q\_0 = 400 bp, dann ist q = 0, nicht negativ.
- **UEB-T15** Gegeben eine Firma des Spielers mit den Merkmalen kreativ und familiär und eine Zielfirma mit kreativ, Konzern und Crunch-Kultur, dann ist der Fit 3.333 bp, die Integration verlängert sich um 25 % und die Moral sinkt um 10.
- **UEB-T16** Gegeben eine gekaufte fremde Engine, dann arbeiten Teams des Spielers damit in Woche 1 mit 7.000 bp Leistung, nach 8 Wochen mit 8.500 bp und nach 16 Wochen mit 10.000 bp.
- **UEB-T17** Gegeben eine Tochter mit 1 Mio. USD Quartalsgewinn, dann fließen 700.000 USD an die Mutter, 300.000 USD bleiben auf dem Tochterkonto.
- **UEB-T18** Gegeben eine Marke einer KI-Firma auf dem Markenmarkt (S04), dann kann der Spieler sie kaufen, ohne die Firma zu sondieren; ihr Preis entspricht dem Anteil M dieser Marke in W.

## 12 Spätere Versionen

| Funktion | Version | Kurzbeschreibung |
| --- | --- | --- |
| Partnerschaft, Minderheits- und Mehrheitsbeteiligung, Kauf einzelner Werte (außer Marken: in 1.0 über den Markenmarkt, S04) | später | Kontrolle und Kosten abgestuft (Tabelle im Design-Dokument) |
| Aktien als Kaufpreis | später | Nach Börsengang, verwässert den Anteil |
| Earn-outs | später | Teile des Preises fließen erst bei Zielerreichung |
| Wettbewerbsbehörde | später | Freigabe, Auflagen, Verzögerung, Verbot ab Marktanteil |
| Zielklauseln und weitere Vorgaben | später | Autonomie an Ergebnisse gekoppelt; Plattformen, Engine-Pflicht, Geschäftsmodelle, Personal |
| Fusion, Ausgliederung, Verkauf, Management-Buyout, Zusammenlegen | später | Weitere Reorganisationen |
| Feindliche Übernahmen, Aktivisten, Übernahmeschutz | später | Setzt Börse voraus; der Spieler kann selbst Ziel werden |

Details stehen in S13 Ausbau nach 1.0.

## Änderungen nach Prüfung 3

- Freischaltung nur ab 2005 und 150 Mitarbeitern (UEB-R01, A02). Test UEB-T11.
- Wertspanne mit festem Seed-Versatz ±2.500 bp; die Prüfung setzt die Mitte auf den wahren Wert (UEB-R05, UEB-R06, UEB-T02, UEB-T12).
- Plattformwert H im Firmenwert W (Formel 5, UEB-T13).
- Integrationsfortschritt und Wechselneigung nach unten bei 0 begrenzt (Formeln 5, UEB-T14).
- UEB-T08: Lizenzgebühren ab dem nächsten Monats-Tick.
- Kultur-Fit nutzt die Kulturmerkmale aus S07, auch die des Spielers (UEB-R20, UEB-T15).
- Neu: Engine-Einarbeitung −3.000 bp über 8–16 Wochen (UEB-R40, UEB-T16), Tochterkonto mit 7.000 bp Abführung (UEB-R41, UEB-T17), Marken einzeln über den Markenmarkt in S04 (UEB-R42, UEB-T18).
- Zahlen in bp und Cent nach A22.
