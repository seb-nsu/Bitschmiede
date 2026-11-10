# Umsetzungsplan Etappe 4 „Marketing und Release“

**Stand:** 30.10.2026 · **Grundlage:** Design-Dokument „Etappenplan“ (Abnahmekriterium 4 und Zuordnung Etappe 4), S05 (MKT-R, MKT-F, MKT-V), S10 (ZIE-R01–R15), S11, S12 Abschnitt 6

## Abnahme

1. **Marketing und Release:** Hype steuert den Verkaufsstart, die Wertung den Verlauf. Ein Release neben einem großen KI-Titel verkauft sichtbar schlechter (MKT-T01).
2. Dazu aus der Zuordnung des Etappenplans: Interesse als ein Wert, fünf Marketing-Entscheidungen, Autopilot, Messe-Saison, Release-Bildschirm mit Preis und Kopierschutz, Preisaktionen, Vertrieb und Produktion mit Verwertungskette, Ziele, Ruhmeshalle, Preise, Szenarien, Spielende.
3. Technisch: `npm run check` grün, Golden-Runs bewusst neu freigegeben, Headless-Lauf 1980–2040 in höchstens 60 s (TEC-T05), Balancing 1980–2000 mit dem Inhaltsausbau neu eingestellt.
4. Danach: kleiner Playtest mit Testspielern (Abnahme Etappe 1 bis 4 gemeinsam).

## Teilschritte

Jeder Teilschritt endet spielbar, mit Tests je Regel-ID, und wird einzeln gepusht.

| # | Teilschritt | Regeln | Stand |
| --- | --- | --- | --- |
| 4.1 | Interesse und Marketing-Budget: ein Interesse-Wert je Projekt, Wachstum und Zerfall nach MKT-F1, Deckel durch Zielgruppe und Reichweite, Budget in Promille des Entwicklungsbudgets, Autopilot-Ankündigung, Interesse-Term im Startabsatz (MKT-F2), Marketingkosten in den Finanzen, KI-Marketing nach Persönlichkeit | MKT-R01–R04, R06 (Ankündigung), MKT-F1, MKT-F2, MKT-T03, T11–T13, T18 | erledigt |
| 4.2 | Interesse am Release: Enttäuschung mit Spielerwertung, Demo, Creator-Zugang | MKT-R05, R07, R08, MKT-T01, T02 | erledigt |
| 4.3 | Release-Paket: Termin, Preis (digital ab 2000), Plattformen, Auflage, Editionen, Demo, Day-One-Patch, Kopierschutz; vorbelegt, eine Bestätigung; Vorbestellungen, Verschieben, Konkurrent auf der eigenen Woche, KI weicht aus; Release-Bericht | MKT-R09, R12, R14, R22, R27, MKT-T07, T09, T14 | erledigt |
| 4.4 | Piraterie und Kopierschutz: Grundrate je Epoche und Plattform, Stufen mit Haltbarkeit, „Geknackt“, Schutz per Patch entfernen, KI-Wahl | MKT-R28–R34, R55, R56, MKT-F5, MKT-T05, T08, T17 | erledigt |
| 4.5 | Preis nach dem Release: Preiskurve, Preis senken, Rabattwochen ab 2005, Gewöhnung der Marke, Preisschutz-Gutschrift, Regel für Preisaktionen, KI-Faustregel | MKT-R17–R21, MKT-F4, MKT-V05, MKT-T06, MKT-VT02 | erledigt |
| 4.6 | Messe-Saison: Jahresplan je Projekt (nichts, Trailer, Demo), Branchenmesse und Entwicklerkonferenz, Ankündigung auf der Messe ×1,5, KI zeigt ihre zwei stärksten Projekte | MKT-R35–R38, MKT-T10 | erledigt |
| 4.7 | Vertrieb: Vertriebswege (eigen, Distributor, Handelsvertrieb, Shareware, Store), Rückläufer, Rückerstattungen, Beigaben, Hardware-Bundle, Heft-Beilage | MKT-R26, MKT-V04, V06–V13, MKT-VT06, VT07 | erledigt |
| 4.8 | Verwertungskette: Restnachfrage in drei Preisstufen, Complete Edition, Budget-Neuauflage, Sammlung, Klassiker, Lizenz an Budget-Publisher, Abo-Deal ab 2017, Vorschläge statt Pflicht | MKT-R20, R51–R54, MKT-V15–V24, MKT-T16, MKT-VT03–VT05 | erledigt |
| 4.9 | Meilensteine und Ruhmeshalle, langfristiges Ziel beim Start | ZIE-R01, R02, R06, ZIE-T04, T15 | erledigt |
| 4.10 | Branchenpreise auf der Branchenmesse: Spiel, Engine, Studio, Newcomer, Innovation; Nominierung, Ziehung, Verkaufs- und Rufbonus | ZIE-R03–R05, MKT-R39 | erledigt |
| 4.11 | Spielende: Endjahr, Zielbedingung, Insolvenz; Abschluss-Bildschirm mit Chronik, Vermächtnis-Wertung, Titel, Rivalen-Vergleich, Weiterspielen, Export | ZIE-R08–R12, R51, ZIE-T05 | erledigt |
| 4.12 | Szenarien: Garagen-Traum, Rette die Konsole, Vom Lizenznehmer zum Anbieter (Notfall-Umfang nach ZIE-R13) | ZIE-R13–R15, ZIE-T10 | erledigt |
| 4.13 | Oberfläche: Marketing im Projekt, Release-Bildschirm, Messe-Jahreskarte, Preisaktionen, Ziele und Ruhmeshalle im Wissensbuch, Abschluss-Bildschirm, Szenario-Auswahl | S05 Abschnitt 8, S10 Abschnitt 8, S11 | erledigt |
| 4.14 | Balancing 1980–2040 (auch für den Inhaltsausbau), Leistung, Golden-Runs, Doku | MKT-T01, ZIE-T02, TEC-T05 | erledigt; Piraterie-Verlust nach Datenblatt-Kontrollwert, Bots auf Stand Etappe 3, Lauf 1980–2040 in 39 s, UI-Übersicht verbessert; offen: KI-Pleiten (KI-T19) und Vertriebsanteile, siehe OFFENE-FRAGEN |

## Annahmen für Etappe 4 (kleinste plausible Lösung, im Code mit `// ANNAHME:` markiert)

1. **Keine Regionen:** Lokalisierung, Regionenpakete und regionale Termine (MKT-R44, MKT-V14) brauchen ein Regionenmodell, das es noch nicht gibt. Der Markt bleibt eine Welt; die Regionen kommen mit dem Ausbau.
2. **Ohne Betrieb:** Early Access (MKT-R47–R50) hängt am Patch-Takt und an der Zufriedenheit aus S06 und kommt mit Etappe 5. Serverkapazität im Release-Paket entfällt bis dahin (nur Online-Spiele). Zufriedenheitskosten des Kopierschutzes werden als Wert am Produkt gespeichert und wirken ab Etappe 5.
3. **Merchandising, Soundtrack und Artbook** (MKT-R41–R43) gehören laut Etappenplan zu Etappe 5.
4. **Altersfreigaben** bleiben automatisch (wie bisher); die Schnittfassung (MKT-R45) folgt mit den Regionen.
5. **Kanalsteuerung:** Nur der Autopilot verteilt das Budget (MKT-R04 erlaubt das); manuelle Kanäle kommen später.
6. **Szenarien mit spätem Start:** Startzustände als Daten-Patch auf ein neues Spiel im Startjahr; die KI-Welt entsteht nach Startjahr wie bisher (KRN-R75). Szenarien mit MMO oder Konzern (Live-Service-Rettung, Konzern-Integration) brauchen Etappe 5 und 6b.

## Nicht in Etappe 4

Live-Betrieb, Early Access, Merchandising, Back-Catalog als eigener Strang (Etappe 5); Publisher-Verträge, Standorte, Ereignisketten, Boom und Krise, Zukunftsepoche mit ihren Zielen (Etappe 6a); Börse, Übernahmen und die daran hängenden Meilensteine (Etappe 6b); Modding-Oberfläche und Workshop.
