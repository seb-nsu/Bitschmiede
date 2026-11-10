# Umsetzungsplan Etappe 2 „Engines“

**Stand der Umsetzung:** Teilschritte 2.1 bis 2.9 erledigt (29.10.2026). Offen ist die Abnahme mit Testspielern; Balancing-Fragen stehen in `docs/OFFENE-FRAGEN.md`, Abschnitt Etappe 2.

**Stand:** 29.10.2026 · **Grundlage:** Design-Dokument „Etappenplan“ (Zuordnung Etappe 2), S03 (ENG), S02 (PRD-R11, R12, R15, R27, R61, R70–R75, 5.5), S08 (MRK-R02, MRK-R04, MRK-R05), S12 Abschnitt 6

## Abnahme

1. **Engines:** Spiel-Features setzen Engine-Module voraus. Eine veraltete Engine liefert spürbar schlechtere Spiele; technische Schuld bremst messbar (Abnahmekriterium 2 des Design-Dokuments).
2. Dazu aus der Zuordnung des Etappenplans: Fremdmodule, Leistungsbudget pro Plattform, Symptome technischer Schuld, Marken mit Franchise-Cockpit, Engine-Bindung und Anforderungen, Technik-Update per Patch.
3. Technisch: `npm run check` grün, Golden-Runs neu freigegeben und begründet, Headless-Lauf 1980–2000 mit Bots, die forschen.

## Teilschritte

| # | Teilschritt | Regeln | Stand |
| --- | --- | --- | --- |
| 2.1 | Engine-Modell und Daten: acht Module mit Stufen und frühestem Jahr, Stand der Technik, Starter-Engine, eigene Engine, Engine-Faktor E im Projekt und im Wasserfall, Lizenzqualität L; Features mit Modulbedarf, gesperrte Karten | ENG-R01, R02, R06, R10, R11, R13, PRD-R10, R11, MRK-R04, ENG-T01, T09, T12, PRD-T03 | erledigt |
| 2.2 | Engine-Team und Forschung: Personen im Engine-Team, Trennbalken Forschung/Wartung/Anforderungen, Forschung je Stufe, Updates (Unterversion), Hauptversion, Schuld mit Tempo, Bugs, Updatekosten und Symptom-Meldung, Neubau-Empfehlung | ENG-R03–R05, R20–R23, ENG-T02 | erledigt |
| 2.3 | Fremdmodule: Middleware lizenzieren (Gebühr je Spiel) oder kaufen (Einmalpreis, Schuld des Verkäufers) | ENG-R30–R32, ENG-T07 | erledigt |
| 2.4 | Engine-Bindung und Anforderungen: Projekt-Stand der Engine, fest oder mitlaufend, Integration, Hauptversion wechseln, Feature-Freeze je Umfang, Bestellung gesperrter Karten, Zusammenfassen, Priorität, Pflicht-Entscheidung bei verpasster Frist | ENG-R40–R44, R50–R53, PRD-R12, R27, ENG-T03–T05, T13 | erledigt |
| 2.5 | Leistungsbudget je Plattform: Budget und Modul-Obergrenze je Plattform, Verbrauch je Feature, Plattform-Erfahrung, abgespeckte Versionen mit Warnung | PRD-R11, R15, R61, MRK-R02, MRK-R05, PRD-T17 | erledigt |
| 2.6 | Marken mit Franchise-Cockpit: Marke beim Anlegen, Startfans, Müdigkeit, Ruf, Stärke und Frische, Jubiläum | PRD-R70–R73, R75, S02 5.5, PRD-T09 | erledigt |
| 2.7 | Technik-Update per Patch: kostenlos, Upgrade, Remaster; Aufwand nach Versionsabstand; Risiko „Update zerstört Mods“ | ENG-R70–R73, R75 | erledigt |
| 2.8 | Oberfläche: Engine-Werkstatt (Platine), Brett mit gesperrten Karten, Leistungsbudget und Engine-Wahl, Engine-Leiste im Projekt, Franchise-Cockpit, Technik-Update | S03 Abschnitt 8, S11 Ansicht E, UI-R20 | erledigt |
| 2.9 | Bots mit Engine-Strategien, Balancing 1980–2000, Golden-Runs, Doku | TEC-R60, ENG-T08 (Form für 1980–2000) | erledigt |

## Annahmen für Etappe 2 (kleinste plausible Lösung, im Code mit `// ANNAHME:` markiert)

1. **Engine-Team ohne Teams:** Bis Teams in Etappe 3 kommen, ist das Engine-Team die Menge der Personen mit Zuordnung „Engine“. Ihre Wochenleistung ist dieselbe wie im Projekt (`workPerPersonWeekBp`). Ohne Person im Engine-Team gibt es keine Forschung (ENG-R03).
2. **Forschungsaufwand:** „40 Personenwochen × 1,8^Stufe, skaliert mit dem Gehaltsniveau“ wird als Aufwand in Personenwochen gelesen. Die Kosten entstehen über die Gehälter der Personen im Engine-Team und steigen so mit dem Gehaltsniveau. Mindestdauer 8 Wochen.
3. **Eine eigene Engine:** Der Spieler gründet höchstens eine eigene Engine. Sie startet auf den Stufen der Starter-Engine mit Version 1.0. Fremde ganze Engines kommen mit dem Lizenzmarkt (S04, Etappe 3).
4. **Update = fertige Forschung:** Jede fertige Modulstufe ist ein Update mit neuer Unterversion (ENG-R04) und +8 Schuld im Modul (ENG-R20). Eine Hauptversion baut alle eigenen Module neu: Aufwand 30 % der Summe ihrer Forschungsaufwände, danach Schuld 5 (ENG-R05).
5. **Fremdmodule ohne KI-Firmen:** Middleware-Angebote kommen bis zu den KI-Studios aus Daten (fiktive Anbieter, Stufe nach Jahr). Lizenz kostet eine Gebühr je veröffentlichtem Spiel, Kauf einen Einmalpreis mit der Schuld des Anbieters.
6. **Anforderung im festen Projekt:** Eine erfüllte Anforderung hebt das Modul im anfordernden Projekt auch bei fester Bindung, ohne Integrationszeit, weil sie für dieses Projekt gebaut wurde.
7. **Plattform erlaubt Feature:** Eine Plattform erlaubt jede Modulstufe bis zum Stand der Technik ihres Erscheinungsjahres; PC folgt dem aktuellen Jahr (MRK-R02). Das Leistungsbudget steht je Plattform in den Daten, der PC wächst über Ankerwerte.
8. **Abgespeckte Version:** Wertung und Verkäufe gelten noch für das ganze Produkt (PRD-R62 je Plattform kommt mit Etappe 4). Eine Plattform mit abgespeckter Version verkauft im Verhältnis der behaltenen Leistungskosten; über 25 % Verlust warnt das Brett.
9. **Marken:** Stärke und Frische sind aus Bekanntheit, Ruf und Müdigkeit abgeleitet. Startfans kaufen in den ersten Wochen zusätzlich zur Basis. Markenmarkt und Lizenzen (PRD-R74, R76) kommen mit S04 in Etappe 3.
10. **Technik-Update ohne Spielerwertung:** Die Spielerwertung kommt mit dem Betrieb (Etappe 5). Ein kostenloses Update hebt deshalb die laufende Nachfrage im Verhältnis von neuem zu altem E; ein Upgrade verkauft an Besitzer; ein Remaster ist ein eigenes Produkt mit neuer Pressewertung. Ohne QA-Abteilung ist das Risiko „Update zerstört Mods“ 25 %.

## Nicht in Etappe 2

Lizenzmarkt für Engines und Lizenznehmer (S04, ENG-R54, R55, R60), Vorreiter-Vorteil im Lizenzmarkt (ENG-R02, nur Meldung), gekaufte Engines durch Übernahme (ENG-R36), Kopierschutz am Release (ENG-R33, Etappe 4), Live-Produkte (ENG-R12, Etappe 5), KI-Studios, Markenmarkt, Schlüsselpersonen (Technischer Direktor), Teams, Forschungslabor.

## Ergebnis

- Daten: `data/base/engine/` (Module, Faktor, Schuld, Versionen, Middleware, Bindung, Anforderungen), `data/base/brands.json`, `data/base/events/techupdate.json`; Features mit Modulbedarf und Leistungskosten, Plattformen mit Leistungsbudget, Produkttypen Technik-Update, Upgrade und Remaster.
- Kern: `src/sim/systems/engine.ts`, `bindung.ts`, `leistung.ts`, `marken.ts`; Spielstand-Schema 12 mit Migration 11 → 12.
- Oberfläche: Engine-Werkstatt und Franchise-Cockpit (Freischaltung „engine“ ab zwei Releases oder 1982, „marken“ ab drei Releases), Brett mit Engine-Wahl, Bindung, Marke, gesperrten und bestellbaren Karten, Leistungsbudget je Plattform; Engine-Zeile in der Projektkarte; Engine-Team in der Team-Leiste.
- Headless-Lauf 1980–2000 mit forschenden Bots und einem Lizenz-Bot: `reports/simulate.md`.
