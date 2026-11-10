# Analyse: Wie Spiele heute entwickelt werden

Stand Oct 29, 2026

## Entwicklungsphasen heute

Moderne Spieleentwicklung läuft über Meilensteine mit Freigaben (Gates): Ein Projekt darf erst in die nächste Phase, wenn Studioleitung und Publisher zustimmen. Der wichtigste Prüfpunkt ist der Vertical Slice, der beweist, dass das Team das Spiel in Zielqualität bauen kann.

| Phase | Inhalt | Typische Dauer | Was am Ende stehen muss |
| --- | --- | --- | --- |
| Konzept | Idee, Pitch, erste Prototypen | Wochen bis Monate | Freigabe (Greenlight) für die Vorproduktion |
| Pre-Production | Kleines Team beweist das Konzept, Game-Design-Dokument, Technikwahl | Monate | Vertical Slice |
| Vertical Slice | Ein kurzer, voll ausgearbeiteter Abschnitt in Endqualität | ca. 6–10 Wochen | Freigabe für die Produktion; Basis für Pitch und Marketing |
| Production (Pre-Alpha) | Großteil der Inhalte; Features kommen hinzu oder werden gestrichen | 6–18 Monate (Indie/AA), Jahre bei AAA | Alle Systeme vorhanden |
| Alpha | Feature-Freeze, Bug-Triage | 1–3 Monate | Spiel vollständig spielbar |
| Beta | Content-Freeze, Optimierung, Bugfixing, Altersfreigaben, Plattformanforderungen | 1–3 Monate | Release Candidate |
| Gold / Zertifizierung | Einreichung bei den Plattformen | 1–2 Wochen | Gold Master |
| Launch und Live-Ops | Veröffentlichung, Patches, DLC, Inhalte-Rhythmus | Monate bis Jahre | — |

Quellen zu Phasen und Dauern: [Game-Ace](https://game-ace.com/blog/game-development-stages/), [PC Tech Magazine](https://pctechmag.com/2026/06/unity-production-milestones-what-each-stage-should-deliver/), [CG Spectrum](https://cgspectrum.com/blog/game-development-process).

**Wichtige Beobachtungen:**

- Die Engine wird meist zu Beginn der Produktion festgelegt, weil ein späterer Wechsel teuer ist.
- Am häufigsten verzögern sich die Übergänge Alpha → Beta und Beta → Gold. Der Grund: Frühere Phasen sind nicht wirklich abgeschlossen, etwa wenn in der Beta noch Features hinzukommen.
- Jede Phase hat ihr typisches Risiko: unklarer Umfang in der Vorproduktion, Durchsatz in der Produktion, Altlasten an Bugs in der QA, Zertifizierung und Serverkapazität beim Launch, ein stockender Inhalte-Rhythmus im Live-Betrieb.
- Neben dem Vertical Slice gibt es oft weitere Zwischenstände, mit denen Publisher den Fortschritt prüfen und Zahlungen freigeben.

## Teams, Budgets und Entwicklungszeiten

Die Kosten eines Spiels sind vor allem Personalkosten: Teamgröße mal Monate. Bei AAA-Spielen machen Gehälter rund 70 % des Budgets aus ([Innovecs](https://www.innovecsgames.com/blog/what-are-aaa-games/)), allgemein werden 60–80 % genannt.

| Klasse | Teamgröße | Entwicklungszeit | Budget (Entwicklung) | Finanzierung |
| --- | --- | --- | --- | --- |
| Indie | 1–20 | 6 Monate bis 3 Jahre | ca. 50.000 bis 750.000 US-Dollar | eigenes Geld, Förderung, kleiner Publisher |
| AA | 20–150 | 2–4 Jahre | niedriger zweistelliger Millionenbetrag (wenig öffentliche Zahlen) | mittelgroßer Publisher oder Plattform-Deal |
| AAA | 200 bis über 1.000 | 4–7 Jahre | meist 80–300 Mio. US-Dollar, Spitzentitel darüber | großer Publisher oder Plattformhersteller |

Quellen: [Innovecs](https://www.innovecsgames.com/blog/what-are-aaa-games/), [Nasty Rodent](https://nastyrodent.com/game-development-cost/), [Wikipedia: Layoffs 2022–2025](https://en.wikipedia.org/wiki/2022%E2%80%932025_video_game_industry_layoffs).

- **Die Kosten explodieren:** Ein großes AAA-Spiel kostete um 2000 etwa 1–4 Mio. US-Dollar, heute über 200 Mio. ([Wikipedia](https://en.wikipedia.org/wiki/Video_game_development)). Laut britischer Wettbewerbsbehörde CMA nannte ein großer Publisher 90–180 Mio. Entwicklung plus 50–150 Mio. Marketing für ein einzelnes Spiel.
- **Marketing kann so teuer sein wie die Entwicklung.**
- **Ein AAA-Spiel ist nie ein einzelnes Studio:** Interne Studios, externe Partner und Outsourcing-Firmen arbeiten zusammen, von Grafik und Animation bis QA.
- **Folge der Kosten:** Publisher setzen stärker auf bewährte Marken mit weniger Risiko.
- **Engine-Verbreitung:** In der GDC-Umfrage 2026 nannten 42 % Unreal als Haupt-Engine, 30 % Unity; bei AA- und AAA-Studios liegt Unreal noch deutlicher vorn ([GDC](https://gdconf.com/article/gdc-2026-state-of-the-game-industry-reveals-impact-of-layoffs-generative-ai-and-more/), [Outlook Respawn](https://respawn.outlookindia.com/amp/story/gaming/gaming-originals/2026-gdc-survey-exposes-workforce-strain-and-technological-shifts)).

## Engines und Middleware heute

Drei Engines prägen den Markt, und sie verlangen auf drei völlig verschiedene Arten Geld: Unreal über Umsatzbeteiligung, Unity über Abos pro Arbeitsplatz, Godot gar nicht. Große Häuser setzen zusätzlich auf eigene Engines.

| Engine | Lizenzmodell | Stärke | Besonderheit |
| --- | --- | --- | --- |
| Unreal Engine (Epic) | Kostenlos; 5 % Royalty auf den Umsatz pro Titel über 1 Mio. US-Dollar | Fotorealistische AA- und AAA-Spiele | Quellcode verfügbar; Verkäufe im Epic Games Store sind royalty-frei |
| Unity | Kostenlos unter 200.000 US-Dollar Umsatz, darüber Pro-Abo pro Arbeitsplatz (2.310 US-Dollar pro Jahr) | Mobile und plattformübergreifend | Ruf durch die Runtime-Fee-Krise beschädigt |
| Godot | Open Source (MIT), keine Gebühren | Schnelles Iterieren, kleine Spiele | Starker Zulauf nach der Unity-Krise |
| Eigene Engines | Nur intern | Volle Kontrolle, auf die eigenen Spiele zugeschnitten | Hohe Fixkosten |

Quelle zu Preisen: [Tech Insider](https://tech-insider.org/unity-vs-unreal-vs-godot-2026/).

**Die Unity-Runtime-Fee als Lehrstück:** Im September 2023 kündigte Unity eine Gebühr pro Installation an. Entwickler reagierten empört, Projekte wechselten öffentlich zu Godot und Unreal. Im September 2024 strich Unity die Gebühr, bevor sie je erhoben wurde, und erhöhte stattdessen die Abo-Preise ([Unity](https://unity.com/blog/unity-is-canceling-the-runtime-fee), [Stray Spark](https://www.strayspark.studio/blog/unity-engine-2026-state-comeback-runtime-fee-aftermath)). Seitdem planen viele Studios mit der Frage, was passiert, wenn ihre Engine die Bedingungen wieder ändert.

**Was das für die Simulation bedeutet:**

- Engine-Anbieter konkurrieren über das Preismodell, nicht nur über die Technik.
- Vertrauen ist ein eigener Wert. Ein Anbieter, der Bedingungen rückwirkend verschlechtert, verliert Kunden auch dann, wenn er die Änderung zurücknimmt.
- Plattform und Engine können gebündelt werden: Epic verzichtet auf die Royalty für Verkäufe im eigenen Store.
- Open-Source-Engines sind eine echte Kraft am Markt und profitieren von Fehlern der kommerziellen Anbieter.

## Finanzierung und Publishing

Ein Publisher-Deal ist im Kern ein Kredit: Der Publisher zahlt einen Vorschuss in Raten gegen erreichte Meilensteine und holt ihn sich aus den späteren Einnahmen zurück (Recoup). Erst danach verdient der Entwickler richtig.

**Typischer Indie-Deal (nicht mobil):**

| Bestandteil | Typischer Wert |
| --- | --- |
| Vorschuss | Durchschnitt rund 318.000 US-Dollar über 30 analysierte Verträge; 18 % ohne Vorschuss; Spanne 100.000 bis 2 Mio. |
| Auszahlung | In Raten gegen Meilensteine |
| Split vor dem Recoup | Oft 60/40 oder 70/30 zugunsten des Publishers; in 42 % der Verträge erhält der Publisher 100 %, bis der Vorschuss zurück ist |
| Split nach dem Recoup | Entwickler meist 50–70 % |
| Ohne Vorschuss | Entwickler erhält im Schnitt rund 70 % |
| Laufzeit | Im Schnitt knapp 7 Jahre mit Vorschuss, gut 4 Jahre ohne |
| Aufschlag | Manche Publisher holen Vorschuss plus Aufschlag zurück, z. B. Raw Fury mit 15 % |

Quellen: [PC Gamer zu Voyer Law](https://links.kronis.dev/q5gvf), [Steam Page Analyzer](https://www.steampageanalyzer.com/blog/indie-game-publisher-vs-self-publishing), [GameDev Reports zu Voyer Law 2025](https://gamedevreports.substack.com/p/voyer-law-publishing-agreements-in), [GameDiscoverCo](https://newsletter.gamediscover.co/p/what-makes-for-a-good-game-publishing).

**Weitere Punkte aus der Praxis:**

- Ein Vorschuss ist kein Geschenk, sondern ein Kredit, der über einen schlechteren Umsatzanteil bezahlt wird.
- Das Zurückholen kann ein bis drei Jahre nach dem Release dauern.
- Kosten für Marketing, Lokalisierung oder Portierung werden oft zusätzlich vom Umsatz abgezogen.
- Kritische Klauseln: Rechte an der Marke (IP), eine Option des Publishers auf das Sequel zu gleichen Bedingungen.
- Fairer gelten Deals, bei denen der Entwickler schon während des Recoups einen kleinen Anteil erhält, etwa 20 %.
- Bei AAA-Spielen finanzieren große Publisher oder Plattformhersteller die Entwicklung meist komplett; das Studio ist dann oft Teil des Konzerns.

## Plattformen und Vertrieb

Vom Verkaufspreis kommt beim Entwickler deutlich weniger an: Stores behalten 12–30 %, dazu kommen regionale Preise, Rückerstattungen und Steuern. Abo-Dienste ersetzen bei manchen Spielen den Verkauf durch eine feste Zahlung.

| Store | Anteil des Stores | Besonderheit |
| --- | --- | --- |
| Steam | 30 % bis 10 Mio. US-Dollar Umsatz, 25 % bis 50 Mio., 20 % darüber | Größter PC-Store; Rückgabe bis 14 Tage und unter 2 Stunden Spielzeit |
| Epic Games Store | 12 % pauschal | Keine Unreal-Royalty auf Verkäufe dort |
| GOG | etwa 30 % | DRM-frei |
| PlayStation, Xbox, Nintendo | etwa 30 % | Zusätzlich Zertifizierung und Plattformanforderungen |

Quellen: [Steam Page Analyzer](https://www.steampageanalyzer.com/blog/steam-revenue-share-explained), [Wayline](https://www.wayline.io/blog/understanding-game-revenue-shares-indie-devs), [Tech Insider](https://tech-insider.org/steam-vs-epic-vs-gog-2026/).

**Was vom Preis übrig bleibt:** Regionale Preise senken den Erlös pro Verkauf im Schnitt um 20–25 %, Rückerstattungen um weitere Prozente. Nach Store-Anteil, regionalen Preisen, Rückerstattungen und Steuern bleibt pro Verkauf deutlich weniger als der Listenpreis ([Steam Page Analyzer](https://www.steampageanalyzer.com/blog/steam-revenue-share-explained)).

**Abo-Dienste (Game Pass, PlayStation Plus):**

- Der Entwickler erhält statt Verkaufserlösen eine vertraglich festgelegte Zahlung, teils mit Raten oder Leistungsboni ([Final Boss](https://finalboss.io/game-pass-profitability-laydens-impossible-verdict-goes-too-far)).
- Vorteil: Das Risiko sinkt, die Zahlung kommt sicher, und das Spiel erreicht viele Spieler.
- Nachteil: Spieler, die gekauft hätten, spielen im Abo. Microsoft hat selbst eingeräumt, dass die Aufnahme ins Abo Käufe verdrängen kann ([Niche Gamer](https://nichegamer.com/xbox-studio-leaders-reportedly-think-game-pass-devalues-their-games/)).
- Trend 2026: Das neue Call of Duty erscheint erstmals seit der Übernahme durch Microsoft nicht am ersten Tag im Game Pass, um Vollpreisverkäufe zu schützen ([Tech Insider](https://tech-insider.org/call-of-duty-day-one-game-pass-2026/)). Sony nimmt große eigene Spiele ohnehin erst später ins Abo.
- Kleinere Spiele profitieren eher von der Sichtbarkeit; große Titel verlieren eher Umsatz.

**Zertifizierung:** Vor dem Release prüfen Konsolenhersteller jedes Spiel gegen ihre Anforderungen. Zertifizierung und Serverkapazität gelten als die größten Risiken beim Launch ([Game-Ace](https://game-ace.com/blog/game-development-stages/)).

**Konsolenzyklen (Überblick, ohne Quelle):** Generationen laufen grob sechs bis acht Jahre. Zur Mitte erscheinen oft stärkere Modelle (Pro-Versionen) oder günstigere Slim-Modelle. Große Spiele erscheinen in der Übergangszeit häufig noch für beide Generationen (Cross-Gen), bis die alte Basis zu klein wird.

## Marketing heute

Auf dem PC dreht sich Marketing um Wishlists: Steam zeigt Spiele mit vielen Wishlists und Interaktionen prominenter an, und Wishlists werden zum Start zu Käufen. Wer früh Aufmerksamkeit sammelt, bekommt mehr davon.

**Kennzahlen aus der Praxis (Steam, Indie):**

| Kennzahl | Typischer Wert | Quelle |
| --- | --- | --- |
| Wishlists, die am ersten Tag kaufen | Median rund 12 % | [Steam Page Analyzer](https://www.steampageanalyzer.com/blog/do-steam-demos-increase-sales) |
| Demo-Spieler, die danach wishlisten | Median rund 19 %, gut sind 20 % und mehr | [Steam Page Analyzer](https://www.steampageanalyzer.com/blog/do-steam-demos-increase-sales) |
| Wishlists während Steam Next Fest, Median | einige Hundert; Top 5 % rund 7.000 | [Steam Page Analyzer](https://www.steampageanalyzer.com/blog/how-to-get-steam-wishlists) |
| Zusammenhang Wishlists vor dem Fest → Zuwachs im Fest | sehr stark (Korrelation 0,825) | [Ziva](https://ziva.sh/blogs/steam-next-fest-2026) |

**Werkzeuge des Marketings heute:**

- **Demo-Festivals** wie Steam Next Fest dreimal im Jahr (Februar, Juni, Oktober). Sie verstärken vorhandene Aufmerksamkeit, starten aber selten welche aus dem Nichts ([Ziva](https://ziva.sh/blogs/steam-next-fest-2026)).
- **Demos** wirken vor allem indirekt: Sie bringen Wishlists, und Streamer greifen sie auch nach Festivals noch auf.
- **Streamer und Influencer:** besonders wirksam, weil Zuschauer das Spiel in Aktion sehen.
- **Showcases** großer Firmen und Messen mit Trailer-Premieren.
- **Bezahlte Werbung** auf Social-Media-Plattformen; die Wirkung schwankt stark nach Kanal.
- **Store-Seite:** Kapsel-Bild, Trailer und Screenshots entscheiden, ob Besucher wishlisten.

**Was das für die Simulation bedeutet:** Hype braucht eine Vorgeschichte. Aufmerksamkeit wächst proportional zur vorhandenen Aufmerksamkeit, Festivals verstärken sie, und die Qualität einer Demo entscheidet, wie viel davon hängen bleibt.

## Geschäftsmodelle

Das klassische Vollpreisspiel ist heute nur noch ein Modell unter mehreren. Viele große Spiele verdienen einen erheblichen Teil ihres Geldes erst nach dem Kauf. Bei Sony machten Live-Service-Spiele in einem Quartal 40 % des Umsatzes mit eigener Software aus, aufs Jahr gerechnet etwa 20–30 % ([TechRadar](https://www.techradar.com/gaming/playstation/after-concords-flop-sony-admits-its-live-service-plan-is-not-entirely-going-smoothly-but-says-it-will-continue-and-learn-from-its-mistakes)).

| Modell | Wie es Geld verdient | Typisch für | Hauptrisiko |
| --- | --- | --- | --- |
| Premium (Vollpreis) | Einmalkauf, später Rabatte | Story-Spiele, Indie, AAA-Einzelspieler | Verkäufe fallen nach dem Start schnell ab |
| Premium + DLC/Erweiterungen | Kauf plus kostenpflichtige Inhalte | Rollenspiele, Strategie | DLC-Müdigkeit, Ruf bei zu viel Bezahlinhalt |
| Free-to-Play | In-Game-Käufe (Kosmetik, Währung) | Shooter, Mobile, Online-Spiele | Nur ein kleiner Teil der Spieler zahlt; Bindung ist alles |
| Battle Pass / Seasons | Saison-Pässe im festen Rhythmus | Live-Service, F2P | Inhalte müssen pünktlich kommen |
| Abo (MMO) | Monatliche Gebühr | Klassische MMOs | Abwanderung, hohe Betriebskosten |
| Early Access | Verkauf während der Entwicklung | Indie, Simulation, Survival | Spieler verlieren das Interesse, bevor 1.0 erscheint |
| Abo-Deal (Game Pass usw.) | Feste Zahlung der Plattform | Indie bis AAA | Verdrängte Verkäufe, begrenzter Gewinn bei Hits |

**Beobachtungen:**

- Live-Service lohnt sich nur für wenige Gewinner; viele Versuche werden schnell eingestellt (siehe Risiken).
- Ein zweiter Teil eines Live-Service-Spiels ist laut Branchenbeobachtern fast nie so erfolgreich wie der erste ([Dead Game](https://deadgame.substack.com/p/concord-didnt-fail-in-a-vacuum)).
- Remaster, Remakes und Ports bringen bei geringerem Risiko verlässliche Einnahmen.
- Merchandise und Lizenzen (Film, Serie) sind Zusatzeinnahmen für starke Marken; bei vielen Publisher-Deals ist auch daran ein Anteil vereinbart ([GameDev Reports](https://gamedevreports.substack.com/p/voyer-law-publishing-agreements-in)).

## Risiken der Branche

Die Branche steckt in einer Phase der Konsolidierung: Umsätze sind hoch, aber Budgets, Entlassungen und Fehlschläge sind es auch. Laut einer Schätzung sind seit 2022 rund 45.000 Stellen weggefallen, obwohl der weltweite Spieleumsatz nahe am Höchststand liegt ([Tech Times](https://www.techtimes.com/articles/329556/20261027/ghost-yotei-made-sony-fortune-2026-then-sucker-punch-cut-10-its-staff.htm)).

**Entlassungen:** In der GDC-Umfrage 2026 gaben 28 % an, in den letzten zwei Jahren entlassen worden zu sein, in den USA 33 %. Die Hälfte berichtete von Entlassungen beim aktuellen oder letzten Arbeitgeber in den letzten zwölf Monaten ([GDC](https://gdconf.com/article/gdc-2026-state-of-the-game-industry-reveals-impact-of-layoffs-generative-ai-and-more/)). Als Ursache gilt unter anderem, dass Firmen den Boom der Pandemiezeit für dauerhaft hielten und zu stark expandierten ([PC Gamer](https://www.pcgamer.com/gaming-industry/one-third-of-us-games-industry-workers-were-laid-off-in-the-last-2-years-gdc-survey-says/)).

**Gescheiterte Live-Service-Spiele:** Sonys Concord wurde 2024 nur Tage nach dem Start abgeschaltet, das Studio danach geschlossen; die Kosten werden auf mehrere hundert Millionen US-Dollar geschätzt ([Neowin](https://www.neowin.net/news/sony-shuts-down-concord-developer-firewalk-studios/), [Film Stories](https://filmstories.co.uk/features/concord-sony-hero-shooters-struggles-highlights-the-risks-of-live-service-games/)). Sony strich danach weitere geplante Live-Service-Projekte. 2026 wurden mindestens 15 Live-Service-Spiele komplett eingestellt, darunter Anthem ([Gamesfuze](https://gamesfuze.com/game-news/how-many-live-service-games-have-actually-shut-down-in-2026/)).

**Budget-Explosion:** Steigende Kosten führen zu weniger Risiko, mehr Fortsetzungen bewährter Marken, Verschiebungen und Einstellungen von Projekten ([Wikipedia](https://en.wikipedia.org/wiki/2022%E2%80%932025_video_game_industry_layoffs)).

**Arbeitsbedingungen:** 82 % der US-Befragten befürworten Gewerkschaften ([Variety](https://variety.com/2026/gaming/news/one-third-video-game-workers-laid-off-2025-1236644512/)). Crunch, also lange Überstundenphasen vor dem Release, bleibt ein bekanntes Problem.

**Generative KI:** 36 % nutzen sie bei der Arbeit, aber 52 % halten ihren Einfluss auf die Branche für negativ, nach 30 % im Vorjahr ([GDC](https://gdconf.com/article/gdc-2026-state-of-the-game-industry-reveals-impact-of-layoffs-generative-ai-and-more/), [Outlook Respawn](https://respawn.outlookindia.com/gaming/gaming-originals/2026-gdc-survey-exposes-workforce-strain-and-technological-shifts)).

## Folgerungen für das Design

Die wichtigste Lehre: Reale Spieleentwicklung ist ein Geschäft mit Freigaben, Krediten und Wahrscheinlichkeiten, nicht nur mit Qualität. Diese Punkte übernimmt das Design-Dokument.

| Realität | Mechanik im Spiel |
| --- | --- |
| Meilensteine mit Freigaben, Vertical Slice als Prüfpunkt | Projekte durchlaufen Phasen mit Gates; ein schwacher Vertical Slice kann zur Einstellung führen, bei Publisher-Deals hängt die nächste Rate daran |
| Neue Features in späten Phasen verzögern den Release | Ein Feature nach dem Feature-Freeze kostet überproportional Zeit und Bugs |
| 60–80 % der Kosten sind Gehälter | Kosten entstehen fast nur aus Teamgröße mal Monaten; Outsourcing als flexible, aber teurere Kapazität |
| Budgets steigen über Jahrzehnte stark | Erwartete Teamgröße, Umfang und Marketingkosten wachsen mit den Epochen |
| Engines mit Royalty, Abo pro Arbeitsplatz oder Open Source | Diese drei Preismodelle stehen im Lizenzmarkt zur Wahl |
| Unity-Runtime-Fee-Krise | Vertrauen in einen Engine-Anbieter ist ein eigener Wert; verschlechterte Bedingungen lösen Abwanderung aus |
| Epic bündelt Store und Engine | Plattformbetreiber können Engine-Gebühren für Verkäufe im eigenen Store erlassen |
| Publisher-Vorschuss in Raten, Recoup, Split vor und nach dem Recoup | Publisher-Verträge bekommen genau diese Parameter, dazu Aufschlag, Laufzeit, IP-Rechte und Sequel-Option |
| Gestaffelte Store-Anteile, regionale Preise, Rückerstattungen | Nettoerlös pro Verkauf wird realistisch berechnet; Rückerstattungen steigen bei kurzen oder fehlerhaften Spielen |
| Abo-Deals mit fester Zahlung | Plattformen bieten Abo-Deals an: sicheres Geld gegen verdrängte Verkäufe |
| Zertifizierung bei Konsolen | Vor einem Konsolen-Release steht eine Prüfung, die bei vielen Bugs scheitert und den Termin verschiebt |
| Wishlists, Festivals, Demos | Hype wächst proportional zum vorhandenen Hype; Demo-Festivals mehrmals im Jahr; Demo-Qualität bestimmt, wie viel hängen bleibt |
| Viele Live-Service-Spiele scheitern schnell | Harte Abwanderung ohne Inhalte, frühe Abschaltung möglich, Nachfolger von Live-Service-Spielen mit Malus |
| Überexpansion und Entlassungen | Der Markt kennt Boom- und Krisenphasen; Entlassungen sparen Geld, kosten aber Ruf und Moral |
| Early Access | Eigener Produkttyp: früh Geld und Rückmeldung, aber Risiko, dass das Interesse vor 1.0 erlischt |
| Generative KI als Werkzeug | Ab den 2020ern ein Werkzeug mit Tempo-Bonus, aber Risiko für Ruf und Mitarbeiterzufriedenheit |

Die Änderungen sind in den passenden Abschnitten des Design-Dokuments eingetragen.

## Quellen

- [Game-Ace: Game Development Stages](https://game-ace.com/blog/game-development-stages/)
- [PC Tech Magazine: Unity Production Milestones](https://pctechmag.com/2026/06/unity-production-milestones-what-each-stage-should-deliver/)
- [CG Spectrum: Game Development Process](https://cgspectrum.com/blog/game-development-process)
- [Innovecs: What Are AAA Games](https://www.innovecsgames.com/blog/what-are-aaa-games/)
- [Nasty Rodent: Game Development Cost](https://nastyrodent.com/game-development-cost/)
- [Wikipedia: Video game development](https://en.wikipedia.org/wiki/Video_game_development)
- [Wikipedia: 2022–2025 video game industry layoffs](https://en.wikipedia.org/wiki/2022%E2%80%932025_video_game_industry_layoffs)
- [GDC: State of the Game Industry 2026](https://gdconf.com/article/gdc-2026-state-of-the-game-industry-reveals-impact-of-layoffs-generative-ai-and-more/)
- [Outlook Respawn: GDC-Umfrage 2026](https://respawn.outlookindia.com/gaming/gaming-originals/2026-gdc-survey-exposes-workforce-strain-and-technological-shifts)
- [PC Gamer: Entlassungen laut GDC-Umfrage](https://www.pcgamer.com/gaming-industry/one-third-of-us-games-industry-workers-were-laid-off-in-the-last-2-years-gdc-survey-says/)
- [Variety: GDC-Umfrage 2026](https://variety.com/2026/gaming/news/one-third-video-game-workers-laid-off-2025-1236644512/)
- [Tech Times: Sucker Punch und Branchenlage](https://www.techtimes.com/articles/329556/20261027/ghost-yotei-made-sony-fortune-2026-then-sucker-punch-cut-10-its-staff.htm)
- [Tech Insider: Unity vs Unreal vs Godot 2026](https://tech-insider.org/unity-vs-unreal-vs-godot-2026/)
- [Unity: Cancelling the Runtime Fee](https://unity.com/blog/unity-is-canceling-the-runtime-fee)
- [Stray Spark: Unity 2026](https://www.strayspark.studio/blog/unity-engine-2026-state-comeback-runtime-fee-aftermath)
- [PC Gamer zu Voyer Law: gute und schlechte Publisher-Deals](https://links.kronis.dev/q5gvf)
- [GameDev Reports: Voyer Law 2025](https://gamedevreports.substack.com/p/voyer-law-publishing-agreements-in)
- [GameDiscoverCo: Gute Publisher-Deals](https://newsletter.gamediscover.co/p/what-makes-for-a-good-game-publishing)
- [Steam Page Analyzer: Publisher vs. Self-Publishing](https://www.steampageanalyzer.com/blog/indie-game-publisher-vs-self-publishing)
- [Steam Page Analyzer: Steam Revenue Share](https://www.steampageanalyzer.com/blog/steam-revenue-share-explained)
- [Steam Page Analyzer: Demos und Verkäufe](https://www.steampageanalyzer.com/blog/do-steam-demos-increase-sales)
- [Steam Page Analyzer: Wishlists gewinnen](https://www.steampageanalyzer.com/blog/how-to-get-steam-wishlists)
- [Wayline: Revenue Shares](https://www.wayline.io/blog/understanding-game-revenue-shares-indie-devs)
- [Tech Insider: Steam vs Epic vs GOG 2026](https://tech-insider.org/steam-vs-epic-vs-gog-2026/)
- [Final Boss: Game Pass Profitability](https://finalboss.io/game-pass-profitability-laydens-impossible-verdict-goes-too-far)
- [Niche Gamer: Game Pass und Studio-Leitungen](https://nichegamer.com/xbox-studio-leaders-reportedly-think-game-pass-devalues-their-games/)
- [Tech Insider: Call of Duty ohne Day-One-Game-Pass](https://tech-insider.org/call-of-duty-day-one-game-pass-2026/)
- [Ziva: Steam Next Fest 2026](https://ziva.sh/blogs/steam-next-fest-2026)
- [TechRadar: Sony und Live-Service](https://www.techradar.com/gaming/playstation/after-concords-flop-sony-admits-its-live-service-plan-is-not-entirely-going-smoothly-but-says-it-will-continue-and-learn-from-its-mistakes)
- [Dead Game: Concord](https://deadgame.substack.com/p/concord-didnt-fail-in-a-vacuum)
- [Neowin: Firewalk geschlossen](https://www.neowin.net/news/sony-shuts-down-concord-developer-firewalk-studios/)
- [Film Stories: Concord und Live-Service-Risiken](https://filmstories.co.uk/features/concord-sony-hero-shooters-struggles-highlights-the-risks-of-live-service-games/)
- [Gamesfuze: Live-Service-Abschaltungen 2026](https://gamesfuze.com/game-news/how-many-live-service-games-have-actually-shut-down-in-2026/)
