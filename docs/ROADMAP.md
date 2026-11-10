# Roadmap bis 2.0

**Stand:** 03.11.2026 · **Quellen:** Design-Dokument „Etappenplan“ und „Umfang von Version 1.0“, S12 Abschnitt 6, S13 (Ausbau nach 1.0), Umsetzungspläne der Etappen, `docs/OFFENE-FRAGEN.md`

Reihenfolge: Etappen bis 6c ergeben den Umfang von 1.0; alle sind gebaut. Danach folgen Updates nach S13. Aufwände für Versionen nach 1.0 stammen aus S13 (Personenwochen, PW, eine Person mit Claude Code, ohne Grafik).

## Gebaut

| Etappe | Inhalt | Stand |
| --- | --- | --- |
| 0, 0b | Prototyp der Kernschleife | abgeschlossen |
| 1 Kern | Projekte, Wertung mit Aufschlüsselung, Finanzen, Bühne, Speichern | gebaut |
| 2 Engines | Module, technische Schuld, Fremdmodule, Marken mit Cockpit | gebaut |
| 3 KI und Lizenzen | KI-Studios, Rivalen, Lizenzmarkt, Teams, Produzenten, Büro | gebaut |
| 4 Marketing und Release | Interesse, Messen, Release-Paket, Vertrieb, Preisaktionen, Ziele, Szenarien, Spielende | gebaut |
| 4b Spielgefühl | Bühne mit Leben, Momente, Symbole, Musik, 15 Genres und 60 Themen, starker Start | gebaut, Spieltest steht aus |
| 5 Live-Betrieb | Bugs und Patches, Zufriedenheit, Abteilung Betrieb, DLC, MMO, F2P, Live-Service, Server, Analytics, Betriebs-Ereignisse, Early Access, Back-Catalog, Merchandising, Personalsuche, Delegation im Betrieb, Szenario „Live-Service-Rettung“ | gebaut am 02.11.2026 |
| 6a Ausbau I | Ereignisketten, Marktphasen mit Crash 1983–85, Publisher-Verhandlung, Standorte, Zukunftsepoche ab 2025 mit Wette und Zielen, Live-Kampagnen, Lauf 1980–2040 in 42 s | gebaut am 02.11.2026 |
| 6b Ausbau II | Firmenwert mit Aufschlüsselung, Börsengang mit Anlegerstimmung, Dividende, Kapitalerhöhung und Hauptversammlung, Übernahmen (Sondieren, Prüfung, Gebot, Gegenangebot, Integration, Töchter mit Vorgaben), KI-Konzerne kaufen, Meilensteine, Bot „konzern“ | gebaut am 02.11.2026 |
| 6c Entwicklung ausbauen | Umfänge groß und AAA, Fachteams mit Schwerpunkt und QA-Team, Personenliste mit Filter und Mehrfachauswahl, Marktplatz für Auftragsspiele, Zielgruppe, Design-Säulen, Schwerpunkt je Phase, Politur je Bereich, Lokalisierung in Sprachmärkte, freies Startjahr 1980–2030 (Garage), Einstieg mit Einstiegsart, Lernpfad, Freischalt-Karten, Handbuch und Zusammenhangs-Karte, Feedback-Formular, Sprache wird gemerkt | gebaut am 03.11.2026 |

## Offen aus den gebauten Etappen

| Punkt | Was fehlt | Wann |
| --- | --- | --- |
| Spieltest | zwei Personen nach `docs/SPIELTEST-1.0.md` (ersetzt den Plan aus 4b, enthält den Einstieg aus 6c) | vor Early Access |
| Feedback-Versand | Empfänger für E-Mail oder GitHub-Issue in `data/config/feedback.json` | Entscheidung Projektleitung |
| Startprofile | „kleines Studio“ und „etabliertes Studio“ für das freie Startjahr (KRN-R70) | nach dem Spieltest |
| Geld bis 2040 | Korridor „Mittel“ entschieden; globale Hebel scheitern, Vorschlag: Wertungen stauchen, dann Löhne +15 % | nach dem Spieltest |
| Vertriebsanteile | 60/65 % bleiben (Entscheidung Projektleitung 03.11.2026) | erledigt |
| Auftragsstudio bis 2040 | entschieden: soll überleben; Aufträge ab 2000 besser bezahlt, reicht aber nicht; Vorschlag Team-Aufträge | eigener Schritt |
| Schwelle Börse und Übernahmen | entschieden: 60 Personen, Börse ab 2000 (umgesetzt) | erledigt |
| Engine-Einarbeitung nach Kauf (UEB-R40), Plattformhersteller als Ziel (UEB-R31 bis R33) | Tochter-Engine nutzt der Spieler ohne Einarbeitung; Hersteller sind keine Firmen | mit großen Projekten bzw. eigener Konsole |
| KI-Pleiten, KI-Kunden bei Preis-Schocks | KI-T19, Vorschlag zu 4b.8 | Balancing nach dem Spieltest |
| Englische Texte | alle Schlüssel übersetzt, Oberfläche in Englisch durchgeklickt (03.11.2026) | erledigt |

## Bis 1.0

| Schritt | Inhalt | Abnahme |
| --- | --- | --- |
| Early Access | nach dem Spieltest 4b und dem Geld-Balancing; Steam-Seite, Spielstände mit Migration | Spieltest bestanden |
| 1.0 | endgültige Grafik und Musik, alle sechs Szenarien (gebaut 03.11.2026), Balancing 1980–2040, Barrierefreiheit (Einstellungen gebaut 03.11.2026), Mod-Unterstützung für Daten (gebaut 03.11.2026, Anleitung `docs/MODDING.md`) | Abnahmekriterien 1–6 des Etappenplans |

## Nach 1.0 (S13)

| Version | Inhalt | Aufwand |
| --- | --- | --- |
| 1.1 | Büro-Ansicht von oben und weitere \[1.1\]-Regeln (erstes großes Update); Community-Events | laut S13 erst 1.4, Reihenfolge nach Early-Access-Rückmeldung |
| 1.2 | Weitere Messe-Typen und Standgrößen (Projekt-Zweige der Engine gestrichen, PC-Leistungsklassen zurückgestellt: Entscheidung Projektleitung 03.11.2026) | 2–3 PW |
| 1.3 | Eigenes Publishing mit Startprofil Publisher, Co-Entwicklung, Server-Hosting für Fremde, Middleware-Lizenzmarkt | 15–21 PW |
| 1.4 | Büro-Ansicht von oben, Übernahme-Vollversion, Börse-Erweiterungen, Fanshop-Lager, Film und Serie | 25–36 PW plus 3–6 Monate Grafik |
| 1.5 | E-Sport; Code-Mods (Skript-Schnittstelle) nach hinten geschoben (Entscheidung Projektleitung 03.11.2026) | 11–15 PW |
| 2.0 | Eigener digitaler Store, eigene Konsole | 18–24 PW plus Grafik |
| später | PC-Leistungsklassen (im Hinterkopf, nach dem Spieltest prüfen), Markenmarkt-Erweiterungen (Genre-Lizenzen, Crossover), Regionen und Lokalisierung, benannte Stars statt Arbeitsmarktpool (nach dem Spieltest prüfen) | – |
| zurückgestellt | Multiplayer, freier Bürobau, Patente | – |

**Widerspruch in den Quellen:** S12 nennt die Büro-Ansicht als 1.1, S13 und das Design-Dokument als 1.4. Vorschlag: S13 gilt (Grafikaufwand), 1.1 wird ein Balancing- und Komfort-Update nach Early-Access-Rückmeldung.
