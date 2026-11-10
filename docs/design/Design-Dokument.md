# Game Studio Tycoon – Design-Dokument

Oct 29, 2026

Dieses Dokument begründet die Entscheidungen. Die verbindliche Grundlage für die Umsetzung steht im Tab Spezifikation mit je einer Spezifikation pro System (S01–S13) und dem Datenblatt der Startwerte.

## Vision und Zielgruppe

Eine Wirtschaftssimulation über ein Spielestudio von 1980 bis 2040, in der Technologie, Produkte und Markt echt ineinandergreifen. Gebaut wird nichts: Es gibt keinen freien Bürobau, sondern feste Grundrisse, die mit Ausstattungspaketen eingerichtet werden. Zu sehen gibt es trotzdem viel: eine Bühne mit den Menschen des Studios, Karten, Zeitströme und Diagramme statt Zahlenkolonnen.

**Zielgruppe:** Spieler von Game Dev Tycoon, Mad Games Tycoon 2 und City Game Studio, denen diese Spiele zu flach geworden sind. Sie wollen Entscheidungen mit Folgen, Karten, Zeitachsen und Diagramme statt Bauen, und eine Simulation, die sie durchschauen können.

**Was es von den Vorbildern unterscheidet:**

| Thema | MGT2 / City Game Studio | Dieses Spiel |
| --- | --- | --- |
| Engine | Liste von Features, einmal gebaut | Module mit Stufen, Wartung, technischer Schuld und Veralterung |
| Lizenzen | Prozentsatz einstellen, fertig | Verhandelte Verträge, Support-Pflichten, Wechselkosten für Lizenznehmer |
| Spiel und Engine | Lose verbunden | Spiel-Features setzen Engine-Module voraus |
| Nach dem Release | Wenige Updates | Patches, DLC, Live-Service, Community als eigener Wert |
| Konkurrenz | Kulisse | KI-Studios mit eigener Strategie, die wachsen, wechseln und pleitegehen |

**Vorbild für das Entwicklungsgeschäft: Software Inc.** Von dort übernimmt das Spiel die Idee, dass Produkte aus Features mit eigenen Kosten bestehen, die von anderer Software abhängen (Engine, Werkzeuge, Middleware). Ebenso übernommen: Werkzeuge als eigene Produkte, Lizenzen sowie Auftragsarbeit für andere Firmen. Anders als in Software Inc. dreht sich alles um Spiele, und es gibt keinen Bürobau.

**Vorbild für Abläufe und Zahlen: die reale Spieleentwicklung heute.** Phasen, Kosten, Publisher-Verträge, Store-Gebühren, Marketing und Risiken orientieren sich an der heutigen Praxis. Die Recherche dazu steht im Tab Analyse: reale Spieleentwicklung.

**Design-Säulen:**

1. **Technik ist ein Geschäft.** Die Engine ist Werkzeug und Produkt zugleich. Jede Lizenz macht Geld und stärkt einen Konkurrenten.
2. **Entscheidungen haben Folgen über Jahre.** Wer heute an Wartung spart, zahlt später mit technischer Schuld. Wer ein MMO startet, muss es jahrelang betreiben.
3. **Durchschaubar statt zufällig.** Jede Wertung, jeder Umsatz lässt sich im Spiel aufschlüsseln. Der Spieler lernt das System, statt Regler zu raten.
4. **Einrichten statt bauen.** Es gibt keinen freien Bürobau, keine Wände und keine Wegfindung. Das Büro wählt man aus festen Grundrissen, Ausstattung kauft man als Pakete, die sich selbst aufstellen. Kapazität kommt aus Mitarbeitern, Teams, Budget und Ausstattung.

&#91;embedded content: Das Spiel auf einen Blick · 8 Systeme\]

Jedes dieser Systeme hat unten einen eigenen Abschnitt.

## Kern-Spielschleife

Das Spiel läuft immer in Wochen-Ticks. Der Kalender hat Quartale zu 13 Wochen mit Monaten zu 4, 4 und 5 Wochen; Monatsjobs laufen in der Woche, in die der Monatserste fällt. In den frühen Jahren bündelt die Anzeige vier oder fünf Wochen zu einem Monat, damit die Lernphase nicht zu lang wird. Auf Wochenanzeige schaltet das Spiel beim ersten Engine-Projekt, beim zweiten Release oder 1985, je nachdem, was zuerst eintritt. Der Spieler steuert die Zeit mit Pause, 0,5×, 1×, 2×, 4× und „Bis zum nächsten Ereignis“; Entscheidungen pausieren automatisch, Ergebnisse auf Wunsch (siehe Spielerlebnis und Oberfläche).

**Pro Woche berechnet die Simulation in fester Reihenfolge:**

1. Fortschritt aller Projekte (Spiele, Engines, Patches, DLC) aus Teamleistung.
2. Verkäufe und laufende Einnahmen aller veröffentlichten Produkte, inklusive Lizenzgebühren.
3. Laufende Kosten: Gehälter, Server, Support, Marketing, Kredite.
4. Entscheidungen der KI-Studios (neue Projekte, Engine-Wahl, Lizenzanfragen).
5. Marktentwicklung: Trends, Plattform-Marktanteile, Ereignisse.
6. Meldungen an den Spieler: Angebote, Probleme, Ergebnisse.

**Die Entscheidungsebenen des Spielers:**

| Ebene | Typische Entscheidung | Rhythmus |
| --- | --- | --- |
| Strategie | Welche Plattformen, eigene Engine oder Lizenz, Self-Publishing oder Publisher | Jahre |
| Portfolio | Nächstes Projekt, Sequel oder neue Marke, DLC oder Nachfolger | Monate |
| Projekt | Genre, Umfang, Budget, Team, Release-Termin | Wochen |
| Betrieb | Patch priorisieren, Kampagne starten, Lizenzanfrage annehmen | Tage bis Wochen |

**Rückmeldung:** Jedes Ergebnis lässt sich aufschlüsseln. Eine Wertung von 7,4 zeigt, wie viel Engine-Qualität, Teamleistung, Genre-Passung, Bugs, Zeitgeist und Tagesform der Presse beigetragen haben. Ein Umsatzeinbruch zeigt, ob Konkurrenz, Plattform-Niedergang oder schlechte Bewertungen schuld sind.

## Spielerlebnis und Bedienung

Das Spiel darf sich nie wie eine Tabelle mit Jahreszahlen anfühlen. Die Prüfung durch Claude Fable hat genau das als größtes Risiko benannt; die folgenden Regeln gelten deshalb ab Etappe 1.

**Gewollte Unsicherheit:** „Durchschaubar statt zufällig“ heißt nicht, dass alles bekannt ist. Unsicherheit gibt es bewusst an vier Stellen, und jede lässt sich mit Aufwand verringern: Wertung vor dem Release (Playtests), Zustand einer Firma vor dem Kauf (Due Diligence), Pläne der Konkurrenz (Messen, Gerüchte, Rivalen-Nachrichten) und Zukunft des Marktes (Trends, Analytics). Alles, was schon passiert ist, lässt sich dagegen vollständig aufschlüsseln.

**Die Spielerschleife im Kleinen:**

- Zeit läuft standardmäßig **bis zum nächsten Ereignis**; dazu Pause, 1×, 2× und 4×.
- Simuliert wird immer wöchentlich. Bis zum ersten Engine-Projekt, zweiten Release oder 1985 zeigt die Oberfläche nur Monate; die Lernphase in den frühen Jahren wird so nicht zu lang, und die Zahlen bleiben vergleichbar.
- **Ereignis-Warteschlange mit Fokus:** Es steht immer höchstens eine Entscheidung im Vordergrund; weitere warten in einer Liste. Eine Release-Woche erzeugt keine zwölf Popups, sondern einen Release-Bericht.
- **Drei Meldungsklassen:** Entscheidung nötig (pausiert), Ergebnis (pausiert optional), Information (Nachrichtenticker). Jede Kategorie lässt sich stummschalten.

**Momente statt Zahlen:**

- **Wertungs-Enthüllung:** Kritiken erscheinen einzeln mit Zitaten aus fiktiven Magazinen, danach der Durchschnitt mit Vergleich zum Genre und zum eigenen letzten Spiel.
- **Schlüsselpersonen mit Gesicht:** Ab 8 Mitarbeitern lassen sich Teams bilden, ab etwa 20 werden sie zur Einheit; einzelne Schlüsselpersonen (Leiter, Stars, Gründer) bleiben mit Namen, Porträt und kleinen Geschichten sichtbar.
- **Ruhmeshalle und Preise** als sichtbarer Fortschritt (siehe Ziele).
- **Firmensitz als Bühne:** Kein Bürobau, aber eine Bühne: Der Firmensitz wächst mit der Firma (Garage, Etage, eigenes Gebäude, Campus), und auf ihm arbeiten die Teams sichtbar (siehe Präsentation und Oberfläche). Das ersetzt das Fortschrittsgefühl des Bauens ohne Verwaltung.
- **Strategiekonferenz:** Einmal im Jahr, nicht delegierbar. Drei Fragen (Schwerpunkt-Genre, Engine-Kurs, Plattform-Wette) mit kleinen Boni und einer Schlagzeile; zählt als Pflicht-Entscheidung.
- **Meilenstein-Momente:** Jedes Projekt, auch ein kleines, hat zwei Reviews: beim Prototyp (z. B. Feature-Tausch) und bei Gold (Day-One-Patch oder Termin halten), jeweils mit Vorher-Nachher-Prognose. Ziel: In den 1980ern vergehen weniger als 60 % der Wochen ohne Entscheidungsangebot.
- **Konkursmasse-Auktion:** Geht ein Studio pleite, kommen Marken und Engine unter den Hammer, mit zwei bis drei KI-Bietern und einer Woche Frist; das Team steht als Ganzes vor der Tür.
- **Gerüchte und Wetten:** Große Wendepunkte kündigen sich zwei bis drei Jahre vorher im Ticker an; der Spieler setzt einen Pin auf die Zeitleiste und wird bei Treffer belohnt.
- **Kleine Community-Momente:** Ticker „Dein Spiel wurde geknackt“ mit Patch zum Entfernen des Kopierschutzes, Markenjubiläum nach 10 Jahren mit Vorschlag für Sammlung oder Remaster, Hauptversammlung für Börsenfirmen.

**Informationsdarstellung:**

- **Dashboard pro Epoche:** 1980 vier Zahlen (Geld, Projekt, Fans, Plattform); später Kacheln pro Bereich mit Ampel und „Aufmerksamkeit nötig“.
- **Zeitleiste als zentrales Element:** eigene und fremde Releases, Plattformstarts, Messen und Vertragsenden auf einer Achse; unverzichtbar für das Release-Timing.
- **Aufschlüsselung als Wasserfall:** Jede Wertung und jeder Umsatz zeigt den Beitrag jedes Faktors als Grafik, nicht als Formel.
- **Keine Zahl ohne Vergleich:** „7,4 (Genre-Schnitt 6,9; dein letztes Spiel 6,1)“.
- **Ein Klick zur Ursache:** „Umsatz −30 %: Konkurrenztitel X“ führt direkt zu Titel X.
- **Symptome statt unsichtbarer Werte:** Technische Schuld zeigt sich als „Projekt X drei Wochen langsamer: Schuld im Modul Rendering“.
- **Prognose vor dem Release:** Ein Playtest schätzt die Wertung mit Spanne; Transparenz gibt es dadurch vor und nicht nur nach dem Release.

**Einführung neuer Systeme:**

- Jedes neue System erscheint zuerst als Ereignis mit Entscheidung, nicht als neues Menü. Beispiel: „Ein Studio fragt nach deiner Engine. Lizenzieren?“ ist das Tutorial für den Lizenzmarkt.
- Ein **Wissensbuch** füllt sich nach jedem Release mit ein bis zwei Erkenntnissen („Rollenspiele brauchen Story: dein Anteil 10 %, erwartet 30 %“).
- Wer später als 1980 startet, bekommt ein kurzes Briefing über die Systeme, die bis dahin dazugekommen sind, und eine generierte Vorgeschichte (Marke, Engine-Stand, Ruf).

**Vereinfachungen aus der Prüfung:**

- **Ein Interesse-Wert:** Hype, Interesse und Wishlists sind ein Wert, der je nach Epoche anders dargestellt wird.
- **Marken mit zwei sichtbaren Werten:** Stärke und Frische; Bekanntheit, Fans pro Genre, Welttiefe, Ruf und Müdigkeit rechnen im Hintergrund. Dafür ein **Franchise-Cockpit** mit der Zeitleiste aller Titel einer Marke.
- **Multiplattform:** Standard ist „Lead-Plattform plus weitere“; Versionen laufen automatisch, Einzelsteuerung nur auf Wunsch.
- **Phasen nach Umfang:** Kleine Spiele haben drei Phasen, AAA-Spiele alle acht. Der Vertical Slice ist das einzige harte Gate, die übrigen laufen automatisch.
- **Entwicklungsbereiche aus Features:** Gameplay, Grafik, Sound, Story und Technik werden nicht mehr separat verteilt, sondern ergeben sich aus den gewählten Features.
- **Leistungsbudget pro Plattform:** Jede Plattform hat ein Budget an Rechenleistung; Features verbrauchen es. Das verhindert, dass man einfach alles einbaut.
- **Eine Abteilung „Betrieb“:** Kundenservice, Live-Ops und Engine-Support teilen sich eine Abteilung; der Spieler verteilt ihre Kapazität per Regler.

**Hauptansichten:** Das Spiel kommt mit wenigen, festen Ansichten aus; alles andere sind Details, die aus ihnen heraus geöffnet werden.

| Ansicht | Inhalt | Ab wann |
| --- | --- | --- |
| Zentrale | Bühne mit Teams und Schlüsselpersonen (der Firmensitz), Kacheln mit Ampel, Fokus-Spalte mit Ereignis-Warteschlange | Start |
| Projekte | Design-Brett, laufende Projekte mit Phase, Fortschritt und Prognose-Fächer; Portfolio-Wand im Spätspiel | Start |
| Finanzen | Geldfluss als Sankey, Einnahmen pro Quelle und pro Engine, Kredite, Börse | Start (Börse nach dem Börsengang) |
| Zeitleiste | Zeitstrom mit eigenen und fremden Releases, Plattformen, Devkit-Wellen, Messen, Vertragsenden | nach dem ersten Release |
| Markt | Plattform-Strom, Trend-Wetterkarte, Rangliste, Rivalen | nach dem ersten Release |
| Marken | Stammbaum der Welt mit allen Titeln, Stärke und Frische | erste Marke |
| Technik | Engine-Platine mit Modulen, Schuld, Forschung und Anforderungen der Projekte | erstes Engine-Projekt |
| Lizenzen | Lizenznehmer und -geber mit Status und Einnahmen | erste Lizenz |
| Firma | Organigramm mit Teams, Schlüsselpersonen, Standorten, Personalpolitik, Delegation | Start (Teams ab 8 Personen) |
| Wissensbuch | Gelerntes, Glossar, Formeln | Start |

Neue Ansichten erscheinen erst, wenn das zugehörige System zum ersten Mal relevant wird; bis dahin sind sie ausgeblendet, nicht ausgegraut.

### Die erste Stunde: schmaler Einstieg

Das Ziel: In unter 60 Minuten hat ein neuer Spieler sein erstes Spiel veröffentlicht, die Wertung gesehen, verstanden, warum sie so ausfiel, und mit dem zweiten Spiel etwas besser gemacht. Bis dahin sieht er nur drei Ansichten: Zentrale, Projekte und Finanzen.

| ⏱ Minute | Was passiert | Was der Spieler lernt | Noch verborgen |
| --- | --- | --- | --- |
| 0–5 | Gründung 1980 in der Garage: zwei Personen, Gründer mit einer Stärke wählen. Erstes Projekt: ein kleines Spiel mit nur Genre, Thema, Plattform und einem kleinen Design-Brett mit drei Reihen (Gameplay, Grafik, Sound) und drei vorgewählten Feature-Karten statt Reglern. Eine fertige Starter-Engine ist vorhanden. | Ein Spiel ist eine Kombination aus wenigen Entscheidungen | Engines, Lizenzen, Marketing, Features |
| 5–15 | Entwicklung im Zeitraffer, zwei Ereignisse mit Entscheidung (z. B. „Kritischer Bug: zwei Wochen verschieben oder so veröffentlichen?“) | Zeit gegen Qualität | Phasen-Details, technische Schuld |
| 15–25 | Release: Wertungen erscheinen einzeln, dann die Verkaufskurve und der erste Eintrag im Wissensbuch | Genre und Thema müssen passen, die Wertung hat Gründe | Analytics, Community |
| 25–40 | Zweites Spiel: drei Features wählbar, erste Einstellung einer dritten Person, ein einziger Marketing-Regler | Team und Marketing wirken | Teams, Kanäle, Publisher |
| 40–60 | Ein Ereignis öffnet den nächsten Bereich: Auftragsarbeit oder „Ein Studio fragt nach deiner Engine“. Meilenstein „Erster Hit“ (Wertung ab 8) mit Belohnung | Es gibt mehr als nur eigene Spiele | Übernahmen, Börse, Konzern |

**Freischaltung nach Fortschritt, nicht nach Zeit:** Eigene Engine-Entwicklung nach dem zweiten Release, Lizenzmarkt mit der ersten Anfrage, Publisher-Verhandlung mit dem ersten Angebot, Marken mit dem ersten Nachfolger, Teams ab acht Mitarbeitern, Delegation ab dem dritten parallelen Projekt, Börse und Übernahmen erst ab 2005 und 150 Mitarbeitern. Pro Release kommt höchstens ein neues System dazu.

**Einstiegsarten:**

- 🧭 **Geführter Start** (Standard beim ersten Spiel): Freischaltung wie oben, ein Mentor kommentiert die ersten fünf Releases in je zwei Sätzen.
- 🔓 **Freier Start:** alle Systeme sofort offen, für Kenner des Genres.
- ⏩ **Später Start** (z. B. 2000): Briefing und generierte Vorgeschichte wie oben beschrieben, Freischaltung im Schnelldurchlauf.

**Sicherheitsnetz für Einsteiger:** Auf den leichten Stufen kann die Firma in den ersten Spieljahren nicht pleitegehen (Startpolster: Leicht 2 Jahre, Entspannt 3 Jahre), und ein Spiel mit guter Passung von Genre und Thema bekommt dort nie unter 5. So führt der erste Fehler zu einer Erkenntnis statt zum Neustart.

**Messlatte für Playtests:** 80 % der neuen Testspieler veröffentlichen ihr erstes Spiel in unter 20 Minuten und können danach in eigenen Worten sagen, warum die Wertung so ausfiel. Wer das nicht schafft, zeigt eine Lücke im Einstieg, nicht beim Spieler. Zweite Messlatte: Ein Tester findet die Ursache eines Umsatzeinbruchs in unter 30 Sekunden.

### Freischaltungen im Normalverlauf

Nach der ersten Stunde kommen die übrigen Systeme in einem festen Rhythmus dazu, ausgelöst durch Fortschritt, nicht durch Zeit. Die Zeitangaben gelten für einen Start 1980 auf „Normal“.

| Spielzeit | Spieljahre | Was neu dazukommt |
| --- | --- | --- |
| Stunde 0–1 | 1980–1982 | Erstes und zweites Spiel, Feature-Karten, Marketing-Regler, Auftragsarbeit |
| Stunde 1–2 | 1982–1985 | Eigene Engine (nach dem zweiten Release), Zeitleiste und Markt (nach dem ersten Release), erstes Publisher-Angebot, Teams ab 8 Personen |
| Stunde 2–4 | 1985–1990 | Lizenzmarkt (erste Anfrage), Marken (erster Nachfolger), Markenmarkt (erste eigene Marke oder erste Anfrage, frühestens etwa 1985), Strategiekonferenz (erstes volles Jahr mit Teams), Playtests (erstes mittleres Projekt), Umzug in die Etage mit Ausstattung, Messen |
| Stunde 4–6 | 1990–1995 | Delegation und Produzenten (drittes paralleles Projekt), Multiplattform, Devkits, Anforderungen ans Engine-Team, Rivalen, Tonstudio und Testlabor |
| Stunde 6–10 | 1995–2005 | Online-Spiele und MMO, Abteilung Betrieb, zweiter Standort, Lokalisierung, Online-Aktivierung als Kopierschutz, digitaler Back-Catalog |
| ab Stunde 10 | ab 2005 | Analytics, Free-to-Play, Preisaktionen, Early Access, Börse, Übernahmen, später die Zukunftsepoche |

Regeln: Höchstens ein neues System pro Release und höchstens zwei pro Spieljahr. Systeme mit eigenem Auslöse-Ereignis (z. B. die erste Lizenzanfrage) erscheinen genau mit diesem Ereignis und warten nicht; nur Systeme ohne eigenes Ereignis warten, bis die Regel sie zulässt.

### Präsentation, Ton und Musik

Game Dev Story lebt von sichtbaren Menschen und kleinen Feiermomenten. Ohne Bürobau gibt es trotzdem etwas zu sehen: eine **Studio-Ansicht** als Bühne, nicht als Bauplan.

- 👥 **Sichtbare Menschen:** Teams erscheinen als kleine Figuren an ihren Tischen; die Kulisse wechselt automatisch mit Größe und Epoche (Garage, Etage, Studio-Gebäude, Campus). Gebaut wird nichts.
- 💬 **Schlüsselpersonen** haben Porträts und kurze Sprechblasen zu Stimmung, Ideen und Ärger („Ich hätte da eine Idee für ein Weltraum-Spiel …“). Ein Klick führt zur Entscheidung.
- 🎉 **Feiermomente:** Release-Abend mit Countdown, Wertungen, die einzeln aufgedeckt werden, Jahresrückblick mit Awards, Auftritt auf der Messebühne. Jeder Moment dauert höchstens fünf Sekunden und ist abschaltbar.

**Diegetik nach Epoche:** Informationen kommen in der Hülle ihrer Zeit. 1985 Fax, Brief und Magazin-Cover, 1998 E-Mail und Website, 2015 Dashboard und Social-Feed, 2030 Holo-Feed. Dahinter steckt dasselbe Datenmodell; nur die Darstellung wechselt. Das trägt das Zeitgefühl ohne zusätzlichen Text.

| 🔊 Ebene | Inhalt | Zweck |
| --- | --- | --- |
| 🎵 Musik | Epochen-Soundtrack: Chiptune in den 80ern, Tracker und MIDI in den 90ern, orchestral und elektronisch ab 2000, synthetisch in der Zukunftsepoche. Jedes Stück hat Schichten für ruhig, angespannt (Crunch, Krise) und festlich | Zeitgefühl und Stimmung ohne Text |
| 🔔 Ereignistöne | Kurze Signaturen für Hit, Flop, Krise, Wertung, neue Konsole | Man hört, was passiert ist, auch ohne hinzusehen |
| 🖱 Oberfläche | Dezente Klicks, Kassenklang bei großen Einnahmen (gedrosselt, nie bei jedem Verkauf) | Rückmeldung auf Eingaben |
| 🏢 Atmosphäre | Tastaturen, Gespräche, Telefon, je nach Studiogröße lauter oder leiser | Das Studio wirkt lebendig |

- **Einstellungen:** getrennte Regler für Musik, Ereignistöne, Oberfläche und Atmosphäre; Töne pro Benachrichtigungsart abschaltbar; Musik bei Pause dämpfen.
- **Umfang 1.0:** zwei bis drei Musikstücke pro Epoche mit Stimmungsschichten, rund 20 Ereignistöne, keine Sprachausgabe (zu teuer und schwer zu lokalisieren).
- **Technik:** Web Audio über eine kleine Audio-Schicht (z. B. Howler.js); die Simulation meldet Ereignisse, die Audio-Schicht entscheidet, was klingt. Alle Klänge liegen als Daten vor und lassen sich per Mod austauschen.
- **Zeitplan:** Platzhalter-Töne ab dem ersten spielbaren Stand, weil Rückmeldung den Spielspaß früh prägt; die endgültige Musik kommt vor 1.0.

**Grafikstil und Umfang:** ein einfacher, konsequenter Stil aus flachen Vektorfiguren, damit Claude Code die Assets als SVG erzeugen und Modder sie ersetzen können.

| Asset | Umfang 1.0 | Hinweis |
| --- | --- | --- |
| Kulissen der Bühne | 4 Größen × 5 Epochen = 20 (Notfall: 8) | Garage, Etage, Gebäude, Campus |
| Porträts | Aus Teilen generiert: Köpfe, Frisuren, Kleidung je Epoche, rund 150 Teile | Jede Schlüsselperson einmalig |
| Figuren-Animationen | Sitzen, tippen, jubeln, durchhängen, laufen | Nur auf der Bühne |
| Cover-Generator | Layout-Vorlagen je Genre und Epoche | Für Spiele, Magazine, Chronik |
| Plattform-Silhouetten | Rund 25 | Fiktive Geräte |
| Medien-Vorlagen | Magazin, Website, Feed je Epoche | Diegetik |
| Symbole | Rund 120 | Ampeln immer mit Form |

**Texte und Inhalte:** Charme entsteht vor allem durch Texte. Umfang für 1.0:

| Inhalt | Menge 1.0 | Hinweis |
| --- | --- | --- |
| Einzelne Ereignisse | rund 150 | dazu 10 Ereignisketten |
| Magazin-Zitate | rund 400 Bausteine | nach Bereich, Epoche, Lob oder Kritik |
| Sprechblasen der Schlüsselpersonen | rund 300 | nach Eigenschaft und Anlass |
| Schlagzeilen-Vorlagen | rund 120 | Ticker und Rivalen |
| Wissensbuch | rund 80 Einträge | Erkenntnisse, Glossar, Formeln |
| Namensgeneratoren | 5 | Firmen, Spiele, Personen, Magazine, Plattformen |

- **Tonfall:** leicht augenzwinkernd, nie zynisch, keine echten Namen von Firmen, Produkten oder Personen.
- **Format:** Texte liegen als Daten in `data/texts/` mit Platzhaltern (`{spiel}`, `{genre}`), Bedingungen und Gewicht. So lassen sie sich übersetzen und per Mod ergänzen.
- **Sprachen:** Deutsch und Englisch in 1.0.
- **Arbeitsweise:** Claude Code erstellt Entwürfe nach diesen Regeln, ein Mensch redigiert jeden Text vor der Aufnahme.

### Der Sog: „Nur noch eine Woche“

Mad Games Tycoon 2 fesselt, weil immer gleich etwas fertig wird. Das Spiel baut diesen Sog bewusst und fair auf:

- ⏳ **Überlappende Zyklen:** Projekte, Forschung, Messen, Konsolen-Starts und Verträge laufen versetzt. Eine Leiste **„Als Nächstes“** zeigt die nächsten drei Ereignisse mit Wochenzahl („Wertung von Projekt X in 2 Wochen“).
- 🌾 **Erntemomente auf allen Zeitskalen:** Woche (Fortschritt), Monat (Bericht), Release (Wertung), Jahr (Rückblick, Rangliste, Awards), Epoche (neue Technik, neue Geschäftsmodelle).
- 🏆 **Langfristige Ziele:** Meilensteine und Erfolge, eine Ruhmeshalle der eigenen Spiele, eine Chronik jeder Marke und der direkte Vergleich mit den Rivalen.
- 🆕 **Neues Spielzeug pro Epoche:** Online, Mobile, Free-to-Play, VR und Cloud verändern das Spiel alle paar Spieljahre spürbar.
- 📨 **Ruhiger Takt:** Pro Woche kommt höchstens ein Entscheidungsangebot; Krisenketten belegen diesen Platz, statt zusätzlich zu kommen. Projekt-Gates laufen getrennt davon und gehen nie verloren. Mit Delegation werden es weniger.
- ⏩ **Kein Leerlauf:** „Vorspulen bis zum nächsten Ereignis“ ersetzt Warten.
- 🛑 **Saubere Haltepunkte:** Nach dem Jahresrückblick wird automatisch gespeichert und eine natürliche Pause angeboten. Der Sog soll aus Neugier entstehen, nicht aus Zwang: keine Belohnungen fürs tägliche Einloggen, keine künstlichen Wartezeiten.

## Oberfläche

Die größte belegte Gefahr des Genres ist eine „schönere Excel“: City Game Studio hat fast dieselbe Systemliste wie dieses Spiel und wird von Spielern vor allem für seine verwirrende Oberfläche kritisiert. Dieses Kapitel legt fest, wie das Spiel aussieht und sich bedienen lässt. Alle Skizzen in voller Größe stehen im Tab Prüfbericht 2 (Fable).

### Zwei Ebenen: Erleben und Analysieren

Tabellen sind das richtige Werkzeug zum Analysieren und das falsche zum Entscheiden und Erleben. Jede Ansicht hat deshalb zwei Ebenen; ein Tastendruck (Tab) wechselt zwischen ihnen.

```
 ERLEBEN (Standard)                 ANALYSIEREN (Taste Tab)
 Dinge: Karten, Chips, Figuren  ->  Zeilen: Tabelle derselben Objekte
 Räume: Bühne, Platine, Strom   ->  Filter, Sortierung, Export
 Vergleiche, Fächer, Ampeln     ->  genaue Zahlen, Formeln, Verlauf
 Eine Entscheidung im Fokus     ->  alle Daten gleichzeitig
```

Erleben ist immer der Einstieg. Niemand muss die Analysieren-Ebene öffnen, um gut zu spielen; Experten, Modder und Balancing leben dort. **Trennregel:** Auf der Erleben-Ebene gibt es keine Tabelle mit mehr als fünf Spalten.

### Neun Prinzipien

| # | Prinzip | Konkret |
| --- | --- | --- |
| 1 | Dinge statt Zahlen | Spiel = Karte mit Cover, Engine-Modul = Chip, Team = Figurengruppe, Vertrag = Dokument mit Siegel, Plattform = Geräte-Silhouette. Zahlen stehen auf dem Ding |
| 2 | Eine räumliche Metapher pro Bereich | Studio = Bühne, Zeit = Strom, Technik = Platine, Marke = Stammbaum, Markt = Wetterkarte, Konzern = Organigramm |
| 3 | Direkte Manipulation | Team auf Projekt ziehen, Feature-Karte aufs Brett, Release-Pin auf eine Woche, Kapazität als Trennbalken; jedes Ziehen hat eine Menü-Alternative |
| 4 | Drei Stufen der Offenlegung | Kachel (Ampel + ein Satz) → Karte (fünf Werte mit Vergleich) → Tabelle oder Formel |
| 5 | Diegetik nach Epoche | Fax und Magazin, E-Mail und Website, Dashboard und Feed (siehe Präsentation) |
| 6 | Keine Zahl ohne Richtung und Vergleich | Pfeil, Sparkline oder Referenz (Genre-Schnitt, letztes Spiel, Rivale) |
| 7 | Ursache ist ein Klick entfernt | „−30 %“ → Wasserfall → Konkurrenztitel → sein Studio |
| 8 | Zeit ist sichtbar | Alles, was dauert, liegt als Balken auf dem Zeitstrom und wird dort verschoben |
| 9 | Ein Fokus, eine Entscheidung | Eine Fokus-Karte mit Optionen und Vorher/Nachher; alles andere wartet als Stapelzahl |

### Rahmen

```
+------------------------------------------------------------------------+
| Studio-Name   1,24 M +   Ruf 62   14 Pers.   KW 12 . März 1994          |
+---------+------------------------------------------+-------------------+
| Zentrale|                                          | > FOKUS           |
| Projekte|             HAUPTBEREICH                 | Ein Studio fragt  |
| Finanzen|   (Bühne, Brett, Platine, Strom,         | nach deiner Engine|
| Zeit    |    Stammbaum, Organigramm ...)           | [Vorlage Indie]   |
| Markt   |                                          | [Verhandeln]      |
| ...     |                                          | Warten: 2         |
|         |                                          | ALS NÄCHSTES      |
|         |                                          | * Wertung in 2 W. |
+---------+------------------------------------------+-------------------+
|  Pause  1x  2x  4x   >| Bis zum nächsten Ereignis       Jahr: KW 12/52  |
+------------------------------------------------------------------------+
```

- **Linke Leiste:** nur freigeschaltete Ansichten; 1980 sind es drei. Neue Einträge blitzen kurz auf.
- **Rechte Spalte** (auf jedem Bildschirm): Fokus-Karte, Warteschlange, „Als Nächstes“, Ticker.
- **Fußleiste:** Zeit und Jahresbalken mit Markern (Messe, Weihnachtsquartal, eigene Releases).
- **Tastatur:** Leertaste Pause, 1/2/3 Tempo, N nächstes Ereignis, Tab Analysieren, Strg+K Befehlspalette, Esc zurück.

### Die acht Hauptbildschirme

| Bildschirm | Metapher | Was man anfasst |
| --- | --- | --- |
| 🏠 Zentrale | Bühne mit Teams an Tischen, Schlüsselpersonen mit Sprechblasen; Kacheln darunter | Tisch auf ein anderes Projekt-Schild ziehen = Team umsetzen; Sprechblase anklicken = Entscheidung. Symptome werden Requisiten (Server-Raum, Messestand, Kisten bei Überauflage, dunkles Büro bei Crunch) |
| 🧩 Projekt anlegen | Design-Dokument als Brett | Konzept-Karten in Slots, Feature-Karten in fünf Bereichsreihen ziehen; Balken „ist gegen erwartet“ wächst live; gesperrte Karten zeigen das fehlende Modul und lassen sich beim Engine-Team bestellen |
| 🛠 Laufendes Projekt | Phasenstrecke und Kanban je Rolle | Stau als Stapel, fehlende Rolle als leere Spalte; Prognose-Fächer werden mit jedem Playtest schmaler, alte bleiben blass sichtbar |
| 🎉 Release-Abend | Magazine kippen nacheinander um | Wertung mit Vergleich, darunter der Wasserfall „Warum?“ mit klickbaren Balken; danach zeichnet sich die Verkaufskurve vor dem Prognoseband |
| ⚙ Engine-Werkstatt | Platine mit Modul-Chips | Linie „Stand der Technik“ über den Chips, Rost für Schuld, Ketten-Symbol für Fremdmodule; Chip ziehen = Forschung einplanen; Anforderungen und Lizenznehmer als Steckleisten |
| 🌐 Markt | Plattform-Strom und Trend-Wetterkarte | Stream-Graph der Plattformen, Konkurrenzdichte als Spur, eigener Release-Pin ziehbar; Rangliste bewusst als Tabelle |
| 🏷 Marken | Stammbaum der Welt | Titel als Knoten auf der Zeitachse, Genres als Äste, Fans als Ringe; Müdigkeit als „Pause empfohlen bis …“ |
| 🏢 Firma und Konzern | Organigramm und Verhandlungstisch | Teams zwischen Studios ziehen, Führungskapazität als Steckplätze, Vorgaben als Chips; ein Verhandlungstisch für Publisher, Lizenz-Großkunden und Übernahmen; Finanzen als Sankey |

Die acht Bildschirme decken alle zehn Ansichten aus „Spielerlebnis und Bedienung“ ab: Finanzen, Lizenzen und Zeitleiste nutzen dieselben Bausteine (Sankey, Steckleiste, Zeitstrom), das Wissensbuch ist eine Karten-Liste.

**Das Brett beim Anlegen eines Projekts** ist der wichtigste Bildschirm des Spiels:

```
+-------------------+-----------------------------------+-------------------+
| KONZEPT           | DESIGN-DOKUMENT (Brett)           | PROGNOSE          |
| [RPG] [Fantasy] ok| Gameplay ########.. erwartet ###  |  5  6  7  8  9    |
| [Kernziel][PC]    |  [Offene Welt] [Partysystem] [+]  |  ..::##::..       |
|                   | Grafik   ####...... erwartet #### |   6,9 - 7,8       |
| FEATURE-STAPEL    |  [3D] [+]  ! unter Erwartung      | Genre-Schnitt 6,9 |
| [Dialogbaum]      | Story    ##........ erwartet #####| Budget PC  80 %   |
| [Shader] gesperrt:|  [+]  ! RPG braucht Story         | 1,8 M . 64 Wochen |
|  Rendering 5      |  [Zerstörung] bestellt, ausstehend| mit/ohne Bestellung|
| [Bestellen]       | Sound / Technik ...               | [Starten] [Pitch] |
+-------------------+-----------------------------------+-------------------+
```

Beim ersten Spiel hat das Brett nur drei Reihen (Gameplay, Grafik, Sound) und drei vorgewählte Karten.

### Wo Tabellen richtig sind

| Als Tabelle richtig | Regel |
| --- | --- |
| Rangliste der Studios | Darf auf der Hauptebene stehen; Spieler lieben Ranglisten |
| Ruhmeshalle, Chronik | Als Karten-Liste mit Covern |
| Analysieren-Ebene jeder Ansicht | Ein gemeinsamer Tabellen-Baustein: sortieren, filtern, Spalten wählen, exportieren, Formel im Tooltip |
| Mehr als zehn Lizenznehmer | Gruppen nach Vorlage; Einzelkunden in der Tabelle, Großkunden als Karten |
| Jahresabschluss | Sankey zuerst, Tabelle per Tab |
| Regelprotokoll | Chronologische Liste mit Link zur Regel |

### Visualisierungen statt Zahlenkolonnen

| Visualisierung | Wo | Ersetzt |
| --- | --- | --- |
| Prognose-Fächer | Wertung, Verkäufe, Firmenwert vor der Prüfung, Kurs | „6,8 bis 7,9“ als Text |
| Wasserfall | Wertung, Umsatzänderung, Kursbewegung, Integrationskosten | Formeln |
| Ist-gegen-Erwartet-Balken | Bereichsprofil, Preis, Aktionärsziel | Regler |
| Stream-Graph | Plattform-Basen, Marktanteile, Einnahmequellen | Diagramm mit zehn Linien |
| Heatmap mit Formen | Trends nach Genre und Thema, Konkurrenzdichte | Trendliste |
| Spannen-Balken | Verhandlungen | Zahleneingabe |
| Ampel mit Form (● ◐ ▲ ✖) | Kacheln, Lizenznehmer, Moral | Prozentzahlen |
| Sparkline neben jeder Zahl | Überall | Verlaufstabelle |
| Stufenpunkte und Stand-der-Technik-Linie | Engine-Module | „Stufe 3 von 6“ |
| Rost auf dem Chip | Technische Schuld | Prozentwert |
| Zeitstrom mit ziehbaren Pins | Release, Kampagnen, Vertragsenden, Devkit-Wellen | Datumsfelder |
| Vorher/Nachher auf der Fokus-Karte | Jede Entscheidung | Folgen erst im Nachhinein |

### Rückmeldung und Benachrichtigungen

- **Juice, sparsam und abschaltbar** (höchstens fünf Sekunden): Zahlen zählen hoch, Phasenwechsel lassen Balken pulsen, die Bühne jubelt oder hängt durch; Kassenklang nur bei Beträgen über 5 % des Kontostands.
- **Drei Klassen:** Entscheidung → Fokus-Karte (pausiert); Ergebnis → Warteschlange mit Abzeichen; Information → Ticker und Posteingang. Mehrere Ergebnisse einer Woche werden zu einem Bericht mit Reitern gebündelt.
- **Jede Karte** hat „Warum?“ (→ Aufschlüsselung), „Später“ (mit Frist) und bei wiederkehrenden Entscheidungen „Nicht mehr fragen – Regel anlegen“ (siehe Delegation).
- **Rückgängig:** Die letzte Zuweisung (Team verschoben, Karte abgelegt) lässt sich im selben Tick zurücknehmen; Zeit selbst lässt sich nicht zurückdrehen.

### Spätspiel bedienbar halten

| Problem | Lösung |
| --- | --- |
| Viele Projekte, Studios und Marken | **Portfolio-Wand:** Projektkarten im Raster, Farbe = Status, gruppierbar nach Studio, Marke oder Phase; Filter-Chips wie „Aufmerksamkeit nötig“, „Release in weniger als 8 Wochen“, „ohne Produzent“ |
| Zu viele Fokus-Karten | Delegations-Abzeichen auf Karten („Produzentin Lea“, „Regel: Patch unter 60“), Filter „nur meine“ |
| Überblick verloren | Monatsbericht in fünf Sätzen; Kacheln der Zentrale zeigen nur Abweichungen |
| Etwas Bestimmtes finden | **Befehlspalette** (Strg+K): „Nova 2 Wartung erhöhen“, „Aetheria Cockpit“, „Pixel Forge“ |
| Bühne wird voll | Ab dem Campus erscheinen Studios als Gebäude-Kacheln; ein Klick zoomt in ein Studio |

### Barrierefreiheit und Eingabe

- Farbe trägt nie allein Bedeutung: Ampeln mit Form, Diagramme (auch Fächer und Stream-Graph) mit Mustern im Farbenblind-Modus.
- Mindestens 13 px Schrift bei 100 % auf 1280 × 800 (Steam Deck). Drei Breiten: ab 1600 drei Spalten, 1280 bis 1599 mit einklappbarer rechter Spalte, darunter die Fokus-Karte als Overlay.
- Jede Ansicht ist per Tastatur bedienbar; Karten sind fokussierbar.
- Jedes Diagramm hat eine Tabellen-Alternative (die Analysieren-Ebene) und einen Ein-Satz-Text für Screenreader („Plattform X: Basis fällt seit 14 Monaten“).
- Controller und Steam Deck: Karten-Raster per Steuerkreuz, Leisten auf den Schultertasten, Zeit auf Start und Select; Ziehen als Stick-Bewegung mit Einrasten.
- Reduzierte Animationen zeigen Momente als Standbild; alle Fokus-Karten pausieren, nichts läuft ab, während man liest.

### Was die Konkurrenz lehrt

| Spiel | Übernehmen | Vermeiden |
| --- | --- | --- |
| Game Dev Story | Wenige Bildschirme, Wertungs-Ritual, sichtbare Mitarbeiter | Keine Analyse-Ebene |
| Game Dev Tycoon | Balken, die sich live füllen; Berichte nach dem Release | Regler ohne Erklärung, Wertung ohne Aufschlüsselung |
| Mad Games Tycoon 2 | Dichte Rückmeldung | Dutzende Fenster, Datenlisten pro Raum |
| City Game Studio | Direktoren, Zeitstrahl | Verschachtelte Dialoge, von Spielern als unintuitiv bewertet |
| Software Inc. | Design-Dokument als Baukasten, Delegation als Befreiung | Überladene Bildschirme, jede Entscheidung ein Formular |
| Startup Company | Komponenten per Drag & Drop, ruhige Karten | Keine Momente |
| Two Point Hospital, Prison Architect | Symptome als Requisiten, Ampel-Overlays, Benachrichtigungsstapel | – |

## Delegation und Produzenten

Ohne Delegation ist die Tiefe nicht beherrschbar. Jeder Bereich lässt sich in drei Stufen steuern, und die Führungskapazität der Firma zeigt, wann der Spieler delegieren muss.

| Stufe | Was der Spieler tut | Typisch für |
| --- | --- | --- |
| Manuell | Jede Entscheidung selbst | Erstes Projekt, eigene Lieblingsmarke |
| Regelbasiert | Regeln setzen („Patch, wenn Zufriedenheit unter 60“, „Standardvertrag für Lizenzkunden unter X Umsatz“) | Mittelgroße Firma |
| Vollautomatisch | Nur Ziele und Budget vorgeben | Konzern, Tochterstudios |

- **Produzenten:** Sobald Delegation freigeschaltet ist (ab dem dritten parallelen Projekt), führt ein Produzent ein Projekt nach Vorgabe (Genre, Marke, Budget, Zielwertung) und meldet nur das Gate am Vertical Slice und Abweichungen. Die Qualität des Produzenten bestimmt die Qualität der Ausführung.
- **Führungskapazität:** Die Firmenleitung kann nur eine begrenzte Zahl von Einheiten direkt steuern (Projekte, Live-Services, Großkunden, Tochterstudios). Wer mehr will, stellt Führungskräfte ein. Das Spiel sagt so von selbst, wann Delegation nötig ist.
- **Autopiloten:** Marketing läuft standardmäßig mit einem Budget-Prozentsatz; Lizenzanfragen, die zum Standardvertrag passen, werden automatisch angenommen; Merchandising ist ein automatischer Markenertrag mit einer Entscheidung (eigen oder Lizenz).
- **Personalpolitik statt Einzel-Recruiting:** Gehaltsniveau, Crunch-Regel und Ausbildung werden als Firmenprofil festgelegt; einzeln eingestellt werden nur Schlüsselpersonen.
- **Messbar:** Die Zahl der Pflicht-Entscheidungen pro Spieljahr darf 2030 nicht höher sein als 2000 (siehe Balancing).

**Produzenten im Detail:**

| Eigenschaft | Wirkung |
| --- | --- |
| Planung | Wie gut Budget und Termin eingehalten werden |
| Qualitätsanspruch | Wie viel Feinschliff vor dem Release; hoher Anspruch verschiebt eher |
| Risikofreude | Wie viele neue oder teure Features gewählt werden |
| Erfahrung | Mit Genres, Marken und Plattformen; senkt Fehlentscheidungen |
| Kommunikation | Wie früh Probleme gemeldet werden |

- **Vorgaben:** Genre oder Marke, Umfang, Budget, Zieltermin, Mindestwertung (Prognose) und erlaubte Geschäftsmodelle.
- **Berichte:** Der Produzent meldet sich nur am Vertical Slice (Fortsetzen, Umsteuern, Stoppen) und wenn eine Vorgabe in Gefahr ist („Termin nur mit Crunch zu halten“, „Prognose unter Mindestwertung“). Der Spieler kann jederzeit eingreifen und das Projekt manuell übernehmen.
- **Kosten und Grenzen:** Gute Produzenten sind teuer und selten; jeder führt nur eine begrenzte Zahl von Projekten gleichzeitig.

**Regeln (Stufe „regelbasiert“):** Regeln sind einfache Wenn-dann-Sätze aus Vorlagen.

| Bereich | Beispielregel |
| --- | --- |
| Patches | Wenn Zufriedenheit unter 60, dann Patch mit höchster Priorität |
| DLC | Wenn Spielerbasis über X und letzter DLC älter als 6 Monate, dann DLC planen |
| Lizenzen | Wenn Anfrage zur Vorlage passt und Kunde kein Rivale, dann annehmen |
| Live-Service | Wenn Churn über Y, dann Content-Drop vorziehen |
| Personal | Wenn Team-Moral unter 40, dann Crunch beenden |
| Marketing | Wenn Interesse 8 Wochen vor Release unter Ziel, dann Budget um 20 % erhöhen |

Regeln gelten pro Bereich, Marke oder Studio; ein Protokoll zeigt, welche Regel wann gegriffen hat.

**„Nicht mehr fragen – Regel anlegen“:** Jede wiederkehrende Fokus-Karte hat diesen Knopf. Er macht aus der gerade getroffenen Entscheidung eine Regel mit vorausgefüllter Bedingung. So lernt der Spieler die regelbasierte Delegation nebenbei, statt ein Menü dafür zu suchen.

**Regel-Editor als Satzbaukasten:** Regeln werden nicht in einer Formularmaske gebaut, sondern als Satz mit Auswahlfeldern: „Wenn \[Spiel oder Bereich\] \[Wert\] \[unter oder über\] \[Zahl\], dann \[Aktion\].“ Jede Regel zeigt daneben, wie oft sie im letzten Jahr gegriffen hätte.

## Produkte

Jedes Produkt hat einen Typ, der bestimmt, wie es Geld verdient und wie lange es lebt. Spiele bestehen aus Genre, Thema, Zielgruppe, Umfang und Features; die Features setzen passende Engine-Module voraus.

**Produkttypen:**

| Typ | Voraussetzung | Einnahmen | Lebensdauer | Besonderheit |
| --- | --- | --- | --- | --- |
| Standardspiel | Engine + Plattform | Einmalverkauf | 1–3 Jahre, fallend | Basis aller Marken |
| Sequel | Erfolgreiches Vorgängerspiel | Einmalverkauf | wie Standard | Startet mit Fans des Vorgängers; enttäuscht es, leidet die Marke |
| Spin-off | Bestehende Marke | Einmalverkauf | kürzer | Neues Genre mit bekanntem Namen |
| Addon | Veröffentlichtes Spiel | Einmalverkauf | 6–12 Monate | Großer Inhalt, verlängert das Hauptspiel |
| DLC | Veröffentlichtes Spiel | Kleiner Einmalverkauf | Monate | Günstig; zu viele DLC senken die Community-Zufriedenheit |
| MMO | Server, Online-Engine-Modul | Abo oder Kauf + Abo | 5–15 Jahre | Laufende Server- und Content-Kosten; Spieler wandern ab ohne Updates |
| Free-to-Play | Online-Modul, Shop-System | In-Game-Käufe | Jahre | Hohe Reichweite, Umsatz hängt an Bindung und Monetarisierung |
| Live-Service | Online-Modul | Kauf + Season-Pässe | Jahre | Seasons im festen Rhythmus |
| Mobile | Mobile-Plattform | Kauf oder F2P | kurz bis lang | Kleine Teams, großer Markt, viel Konkurrenz |
| Remaster | Altes eigenes Spiel | Einmalverkauf | kurz | Günstig, lebt von Nostalgie |
| Port | Veröffentlichtes Spiel | Einmalverkauf | wie Original | Kosten hängen davon ab, ob die Engine die Zielplattform kann |

Dazu kommen zwei Vertriebsformen, die jeden Produkttyp betreffen können: **Early Access** (ab etwa 2013; Verkauf ab der Beta zu 60–80 % des Preises; bringt früh Geld und Rückmeldung, aber das Interesse zerfällt doppelt so schnell, die Zufriedenheit hängt am Patch-Takt, und Version 1.0 ist ein zweiter Release-Abend mit neuer Wertung) und **Abo-Deals** (ab etwa 2017; eine Plattform zahlt für die Aufnahme in ihr Abo einmalig erwartete Verkäufe × 30 % × Preis; dafür fallen 40 % der Vollpreiskäufe weg, die Bekanntheit steigt; Spezifikation S05).

**Produkttypen als Datensätze:** Alle Produktformen sind kein eigenes System, sondern Einträge in einer Datendatei mit fünf Parametern. Neue Formen (auch per Mod) brauchen keinen neuen Code.

| Parameter | Bedeutung | Beispiel DLC | Beispiel MMO |
| --- | --- | --- | --- |
| Voraussetzung | Was vorhanden sein muss | veröffentlichtes Spiel | Online-Modul, Server |
| Umsatzmodell | Wie Geld fließt | kleiner Einmalkauf | Abo oder Kauf + Abo |
| Lebensdauer | Form der Verkaufskurve | Monate | 5–15 Jahre mit Churn |
| Teamanteil | Wie viel Kapazität es bindet | klein, kurz | dauerhaft (Betrieb) |
| Markenwirkung | Effekt auf Stärke und Frische | leicht positiv, bei zu vielen negativ | stark, bei Abschaltung negativ |

**Weitere Formen aus den Vorbildern** (ebenfalls als Datensätze): GOTY-Edition (alle DLC gebündelt, neuer Verkaufsimpuls), Bundle (mehrere eigene Spiele), Budget-Neuauflage (alter Titel zum kleinen Preis), Retro-Spiel (bewusst alte Technik, günstig, Nostalgie-Bonus). Early Access ist erst ab etwa 2013 verfügbar. Wie Editionen, Neuauflagen, Sammlungen und Budget-Reihen wirken, steht unter Vertrieb und Produktion.

**Back-Catalog:** Ab etwa 2005 verkaufen sich digitale Alt-Titel dauerhaft in kleinen Mengen weiter, verstärkt durch Rabattaktionen, neue Teile der Marke und Remaster. Ein großer Katalog ist so ein stiller Ertrag und ein Grund, Marken zu pflegen.

**Marken und Spielwelten:** Eine Marke ist eine Spielwelt mit Namen, Setting, Figuren und Geschichte. Mehrere Spiele können in derselben Welt spielen, auch in ganz verschiedenen Genres: eine Action-Hauptreihe, ein Strategie-Ableger, ein MMO in der Welt, ein Mobile-Spiel.

| Wert der Marke | Wirkung | Für den Spieler |
| --- | --- | --- |
| Bekanntheit | Startinteresse jedes neuen Spiels der Marke; wächst mit jedem erfolgreichen Titel | intern, fließt in die Stärke |
| Fans pro Genre | Fans der Action-Reihe kaufen nicht automatisch das Strategiespiel; nur ein Teil wechselt das Genre | intern, im Cockpit als Fanringe angedeutet |
| Welttiefe | Steigt durch gute Story und Lore; macht Ableger in anderen Genres glaubwürdiger | intern, fließt in die Stärke |
| Ruf | Ein schwacher Teil schadet allen künftigen Spielen der Marke | intern, fließt in die Stärke |
| Markenmüdigkeit | Zu viele Titel in kurzer Zeit senken das Interesse; Pausen lassen sie abklingen | sichtbar als Frische, mit Empfehlung „Pause bis …“ |
| **Stärke** und **Frische** | Die zwei Werte, die der Spieler sieht und steuert | sichtbar |

```latex
\text{Startfans} = \sum_g \text{Fans}_g \cdot \text{Übertragung}(g \rightarrow g_{neu}) \cdot \text{Ruf} \cdot (1 - \text{Müdigkeit})
```

- Die Übertragung hängt davon ab, wie nah die Genres beieinander liegen: Action zu Action-Rollenspiel überträgt viel, Action zu Aufbaustrategie wenig.
- Ein erfolgreicher Ableger erschließt der Marke eine neue Fangruppe, die künftige Spiele dieses Genres trägt.
- Marken sind Vermögen: Sie gehen bei Übernahmen mit, werden auf dem Markenmarkt lizenziert, gekauft und verkauft (siehe Lizenzmarkt, Abschnitt Markenmarkt) und bringen später Merchandise sowie Film- oder Serienrechte.
- In Publisher-Verträgen wird geregelt, wem die Marke gehört.

**Gleichzeitiger Release auf mehreren Plattformen:** Ein Projekt kann von Anfang an mehrere Zielplattformen haben und überall am selben Tag erscheinen.

- **Aufwand:** Jede zusätzliche Plattform kostet Anpassungsarbeit. Sie sinkt, wenn die Engine ein starkes Plattform-Modul hat (plattformübergreifend), und steigt mit dem Leistungsabstand zwischen den Plattformen.
- **Technik:** Entweder richtet sich das Spiel nach der schwächsten Plattform, oder jede Version wird einzeln angepasst; dann sieht die Version auf starker Hardware besser aus, kostet aber mehr Zeit.
- **Pro Version getrennt:** Bugs, Wertung, Zertifizierung und Plattformgebühren gelten je Plattform. Eine schwache Version kann den Ruf des ganzen Spiels beschädigen.
- **Cross-Gen:** Beim Generationswechsel kann ein Spiel für alte und neue Konsolen gleichzeitig erscheinen.
- **Exklusivität als Alternative:** Hersteller bieten Geld oder Marketing für Exklusivität, dauerhaft oder zeitlich begrenzt. Das bringt sichere Einnahmen, kostet aber den Markt der anderen Plattformen.
- Späte Ports bleiben möglich, wenn ein Spiel zuerst nur auf einer Plattform erscheint.

**Leistungsbudget pro Plattform:** Jede Plattform hat ein Budget an Rechenleistung, Speicher und Datenträgerplatz. Jedes Feature verbraucht davon; Plattform-Erfahrung und gute Engine-Module senken den Verbrauch. Bei der Lead-Plattform bestimmt das Budget, was ins Spiel passt. Weitere Plattformen mit kleinerem Budget bekommen automatisch eine abgespeckte Version; fällt zu viel weg, warnt das Spiel vor einer schwachen Version, die den Ruf des ganzen Spiels beschädigen kann.

**Bausteine eines Spiels:**

- **Genre und Subgenre** (z. B. Rollenspiel, Action-Rollenspiel): bestimmen Kernpublikum und welche Features erwartet werden.
- **Thema** (Fantasy, Sci-Fi, Sport …): passt mehr oder weniger gut zum Genre; Trends verschieben die Beliebtheit.
- **Zielgruppe** (Kinder, Gelegenheitsspieler, Kernspieler, Erwachsene): beeinflusst Altersfreigabe und Marktgröße.
- **Umfang** (klein, mittel, groß, AAA): bestimmt Teamgröße, Budget, Zahl der Phasen und Erwartungen der Presse.
- **Features** (3D-Grafik, Online-Koop, offene Welt, Sprachausgabe …): jedes Feature gehört zu einem Bereich (Gameplay, Grafik, Sound, Story, Technik), braucht ein Engine-Modul ab einer Stufe und verbraucht Leistungsbudget der Plattform.
- **Bereichsprofil statt Regler:** Die Verteilung auf Gameplay, Grafik, Sound, Story und Technik ergibt sich aus den gewählten Features. Jedes Genre erwartet ein Profil (Rollenspiel: viel Story; Rennspiel: viel Technik); die Abweichung zeigt das Design-Dokument sofort an.

**Qualitätsformel (Grundidee):**

```latex
Q = \Big(\textstyle\sum_f q_f \cdot T_f\Big) \cdot \text{Profil}_{\text{Genre}} \cdot E \cdot P_{\text{Genre,Thema}} \cdot (1 - B)
```

- q\_f = Grundwert des Features f (höher, je moderner), T\_f = Ausführung durch das Team (Teamstärke im Bereich des Features, Erfahrung mit Genre und Engine)
- Profil = wie gut das Bereichsprofil aus den Features zur Erwartung des Genres passt
- E = Engine-Faktor (Modulstufen im Verhältnis zum Stand der Technik)
- P = Passung von Genre und Thema
- B = Anteil verbliebener Bugs beim Release
- Der Trend steckt nicht mehr in Q: Er wirkt voll auf die Verkäufe (V₀) und auf die Wertung nur als sichtbarer Zeitgeist-Balken (±0,3). So wird ein gutes Spiel im falschen Jahr nicht schlecht bewertet, nur schlechter verkauft.

Die Wertung ergibt sich aus Q im Vergleich zur **erwarteten Qualität** Q\_erw: Ein AAA-Spiel mit gleicher Qualität wie ein kleines Indie-Spiel bekommt schlechtere Kritiken. Q\_erw kalibriert sich selbst: Es ist der Median-Q aller Releases des Vorjahres in derselben Umfangsklasse, sodass die Messlatte mit der Branche steigt. Zur Wertung kommen zwei sichtbare Balken im Wasserfall: **Zeitgeist** (Trend des Genres, ±0,3) und **Tagesform der Presse** (Zufall, Standardabweichung 0,3; Einstellung Presse-Zufall: aus, gering 0,15, normal 0,3). Presse-Strenge verschiebt Q\_erw um ±8 % je Stufe. Spezifikation: S02, PRD-R54 bis R57.

**Warum es kein festes Rezept gibt:** Game Dev Tycoon lässt sich mit einem Wiki lösen, weil Genre-Thema-Paare und Reglerpositionen fest sind. Hier entsteht Qualität aus Zusammenspiel, und vier Dinge verhindern eine Komplettlösung:

- **Feature-Synergien:** Jede Feature-Karte trägt Merkmale (z. B. offene Welt, Story, Physik, Online). Passende Merkmale verstärken sich (offene Welt mit Streaming und Fahrzeugen), unpassende kosten (Online-Zwang bei einem Story-Spiel). Die Wirkung hängt zusätzlich an der Teamstärke im Bereich und an der Engine-Stufe: Ein anspruchsvolles Feature mit schwachem Team oder alter Engine schadet mehr, als es nützt.
- **Vorlieben je Seed:** Jeder Seed verschiebt die Passung von Genre und Thema und die Genre-Erwartungen um bis zu ±20 %. Was in einem Spielstand ein Hit ist, ist im nächsten nur gut.
- **Abnutzung:** Wiederholt der Spieler dieselbe Kombination, sinkt die Innovation, und die Presse erwartet mehr („wie der Vorgänger“). Erfolgreiche Kombinationen kopiert die KI, bis der Markt gesättigt ist.
- **Wandel der Epochen:** Erwartungen an Bereichsprofil und Features verschieben sich mit Technik und Trends; ein Rezept von 1995 trägt 2005 nicht mehr.

Das Wissensbuch speichert deshalb, was der Spieler in diesem Spielstand gelernt hat, mit Sicherheitsgrad („vermutlich“, „bestätigt in drei Spielen“), und keine allgemeingültige Lösung.

**Wie das Wissensbuch entsteht:** Nach jedem Release werden der größte positive und der größte negative Balken des Wertungs-Wasserfalls zu Einträgen. Der Sicherheitsgrad zählt die bestätigenden Releases: einer heißt „vermutlich“, drei „bestätigt“. Widerspricht ein neuer Release einem Eintrag, wird er „umstritten“; das ist ein eigener kleiner Moment, weil sich der Markt gedreht haben könnte.

**Entwicklungsprozess (nach Vorbild von Software Inc.):** Jedes Projekt beginnt mit einem Design-Dokument und durchläuft feste Phasen. Der Spieler plant Features statt Regler zu schieben.

&#91;embedded content: Entwicklungsphasen · 8 Phasen mit Gates\]

Features, die nach dem Feature-Freeze noch hinzukommen, kosten überproportional Zeit und erzeugen mehr Bugs. Das ist in der Realität der häufigste Grund für Verschiebungen.

**Phasen nach Umfang:**

| Umfang | Phasen | Gate |
| --- | --- | --- |
| Klein | Konzept → Produktion → Launch | keins; der Spieler sieht nur den Fortschritt |
| Mittel | Konzept → Pre-Production → Produktion → Beta → Launch | Ende der Pre-Production (vereinfachter Slice) |
| Groß und AAA | alle acht Phasen | Vertical Slice als einziges hartes Gate; Alpha, Beta und Gold laufen automatisch, außer es gibt ein Problem |

Zertifizierung kommt bei jedem Umfang dazu, sobald eine Konsole Zielplattform ist.

**Projekt pausieren, umsteuern oder abbrechen:** Echte Studios stoppen Projekte ständig. Im Spiel ist das jederzeit möglich und am Vertical Slice die naheliegende Frage.

| Entscheidung | Was passiert | Kosten |
| --- | --- | --- |
| ⏸ Pausieren | Teams werden frei, das Projekt bleibt mit allem Fortschritt liegen | Interesse sinkt langsam, die Engine-Version veraltet, Wiederaufnahme kostet einige Wochen Einarbeitung |
| 🔀 Umsteuern | Umfang verkleinern, Features streichen, Plattformen ändern oder Genre wechseln | Je später, desto teurer; fertige Arbeitspakete bleiben anteilig erhalten |
| ⏹ Abbrechen | Das Projekt endet | Ausgegebenes Geld ist weg, Moral des Teams sinkt, angekündigtes Interesse fällt auf null, Ruf und Marke leiden leicht (stärker, wenn schon angekündigt) |

- **Prototyp archivieren:** Ein abgebrochenes Projekt landet im Archiv. Design-Dokument und fertige Arbeitspakete senken die Kosten eines späteren Projekts mit derselben Marke oder demselben Genre.
- **Keine Sunk-Cost-Falle in der Anzeige:** Die Prognose zeigt bei dieser Entscheidung nur das, was noch zu investieren ist, gegen den erwarteten Ertrag, nicht das bereits Ausgegebene.
- **Publisher-Projekte:** Ein Abbruch folgt dem Vertrag: Vorschuss zurückzahlen oder der Publisher übernimmt Projekt und Marke.
- **Produzenten** schlagen am Vertical Slice von sich aus Umsteuern oder Abbruch vor, wenn die Prognose unter der Mindestwertung liegt.

**Playtests und Prognose:** Ab der Pre-Production kann der Spieler Playtests ansetzen (intern kostenlos, aber ungenau; extern mit Testern teurer, aber genauer). Ein Playtest liefert eine **Wertungsprognose mit Spanne** (z. B. 6,8 bis 7,9) und die drei größten Schwächen („Story zu dünn für ein Rollenspiel“, „Technik unter dem Stand der Konkurrenz“). Jeder Playtest liegt um einen eigenen, zufälligen Versatz daneben; die Spanne enthält die wahre Wertung in vier von fünf Fällen. Je später der Test, desto kleiner Versatz und Spanne, und der Prognose-Fächer wird sichtbar schmaler. So lernt der Spieler vor dem Release, nicht erst danach.

**Physische Auflage (bis etwa 2010):** Beim Release legt der Spieler einmal die Auflage fest; eine Empfehlung aus Vorbestellungen und Interesse ist vorbelegt. Zu wenig bedeutet verlorene Verkäufe in den ersten Wochen, zu viel bedeutet Lagerkosten und spätere Ramschpreise. Nachproduktion ist möglich, dauert aber Wochen. Mit dem Wachstum des Digitalvertriebs schrumpft diese Entscheidung und verschwindet ab etwa 2015 für die meisten Spiele.

- **Features mit Abhängigkeiten:** Ein Feature verlangt ein Engine-Modul ab einer Stufe, oft auch ein Werkzeug (z. B. Gesichtsanimation braucht ein Animations-Tool) oder eine Middleware.
- **Feature-Evolution:** Features haben Nachfolger, die sie ersetzen (8-Bit-Musik → gesampelte Musik → orchestrale Musik). Alte Features wirken mit der Zeit weniger.
- **Innovation, Stabilität, Spielspaß:** Jedes Feature verschiebt diese drei Werte. Viele neue Features erhöhen Innovation, aber auch Bugs; bewährte Features machen das Spiel stabil, aber unauffällig.
- **Arbeitspakete:** Jedes Feature ist ein Arbeitspaket mit Aufwand pro Rolle. Fehlen Grafiker, staut sich die Arbeit sichtbar, statt dass das Projekt pauschal langsamer wird.
- **Versionen und Marken:** Ein Spiel kann Folgeversionen bekommen (Sequel, Jahresversion, Remaster), die das Design-Dokument des Vorgängers übernehmen und erweitern.

**Feature-Freeze und Plattformen:** Wann keine neuen Features mehr dazukommen, hängt am Umfang: kleine Spiele bei 60 % der Produktion, mittlere zu Beginn der Beta, große und AAA-Spiele bei Alpha. Der Aufwand eines Features skaliert mit dem Umfang (klein 0,4, mittel 1, groß 2,5, AAA 5). Bei Multiplattform entscheidet die Lead-Plattform über die Features; auf weiteren Plattformen fallen nicht unterstützte Karten weg, und die Warnung zeigt, welche.

**Altersfreigabe:** Jedes Feature und Thema hat eine Inhaltsstufe von 0 bis 3; die Freigabe ist das Maximum. Ab Stufe 2 fällt die Zielgruppe Kinder weg, dafür steigt das Interesse bei Erwachsenen. Die Jugendschutz-Debatte als Ereignis kann Stufen verschärfen.

**Qualitätssicherung:** Vor dem Release findet QA pro Woche einen Teil der offenen Bugs (15 %, gedeckelt durch die QA-Kapazität im Verhältnis zur Projektgröße; ein Testlabor bringt +30 %). Der Spieler sieht das als fallende Bug-Kurve und entscheidet, wann sie flach genug ist.

## Engines und Technologie

Eine Engine ist ein eigenes Produkt aus Modulen. Jedes Modul hat eine Stufe; die Stufen bestimmen, welche Spiel-Features möglich sind und wie gut die Spiele technisch werden.

**Module (Startauswahl):**

| Modul | Stufen (Beispiele) | Schaltet frei |
| --- | --- | --- |
| Rendering | Text → 2D-Sprites → 2,5D → 3D → Shader → Raytracing | Grafikstil, Grafik-Obergrenze |
| Audio | Piepser → 8-Bit → Samples → Raumklang → 3D-Audio | Musik, Sprachausgabe |
| Physik | keine → einfach → Rigid Body → Destruction | Fahrzeuge, zerstörbare Umgebung |
| KI | Skripte → Zustandsautomaten → Wegfindung → lernende Gegner | Gegnerverhalten, offene Welten |
| Netzwerk | keins → LAN → Online → Massively Multiplayer | Koop, Online, MMO, Live-Service |
| Werkzeuge | Code → Editor → Level-Editor → Mod-Support | Entwicklungstempo, Modding |
| Plattformen | eine → mehrere → plattformübergreifend | Ports billiger oder unmöglich |
| Streaming | Laden → Hintergrund-Streaming | Offene Welten ohne Ladezeiten |

**Forschung:** Neue Modulstufen werden erforscht, nicht einfach freigeschaltet. Jede Stufe hat ein frühestes Jahr (Stand der Technik), Forschungskosten und Voraussetzungen. Wer früh forscht, ist Vorreiter und kann diese Technik exklusiv lizenzieren.

**Engine-Versionen:** Eine Engine bekommt Versionen (z. B. Nova 1, Nova 2). Ein Update hebt einzelne Module an und ist billiger als eine neue Engine. Wie laufende und veröffentlichte Spiele an neue Versionen kommen, regeln die Abschnitte „Engine und laufende Projekte“ und „Technik-Update per Patch“ weiter unten.

**Veralterung:** Der Engine-Faktor E vergleicht die Modulstufen mit dem Stand der Technik. Eine Engine, die 2005 Spitze war, liefert 2012 sichtbar schwächere Spiele.

**Technische Schuld:** Jedes Update erhöht die Schuld, jede Wartung senkt sie.

- Hohe Schuld verlangsamt Entwicklung, erhöht Bugs und macht Updates teurer.
- Ab einem Grenzwert lohnt nur noch eine neue Engine (Neubau), die Lizenznehmer aber zum Umstieg zwingt.
- Der Spieler entscheidet laufend: Teams auf neue Features oder auf Aufräumen setzen?

**Eigene Engine oder Lizenz?** Beides ist dauerhaft gleichwertig spielbar.

- Eigene Engine: hohe Fixkosten, volle Kontrolle, Lizenzeinnahmen möglich.
- Fremde Engine: sofort verfügbar, Gebühren pro Spiel, abhängig vom Anbieter (Preiserhöhungen, Einstellung des Supports).

**Fremdmodule und Middleware:** Werkzeuge und Middleware sind kein eigener Produkttyp, sondern Engine-Module fremder Herkunft. Jedes Modul einer Engine kann selbst entwickelt, gekauft oder lizenziert sein. So bleibt es bei einem System, und die Entscheidung „selbst bauen oder einkaufen“ gibt es auf Modulebene.

| Herkunft | Vorteil | Nachteil |
| --- | --- | --- |
| Selbst entwickelt | Volle Kontrolle, kann lizenziert werden, Vorsprung bleibt im Haus | Forschungs- und Wartungskosten, technische Schuld |
| Lizenziertes Fremdmodul (Middleware) | Sofort auf hoher Stufe, keine Forschung | Gebühr pro Spiel oder Jahr, abhängig vom Anbieter |
| Gekauft (Rechte erworben) | Einmalpreis, danach eigenes Modul | Teuer, bringt eventuell fremde technische Schuld mit |

- Das Engine-Modul „Werkzeuge“ deckt Editoren, Animations- und Audio-Tools ab; höhere Stufen beschleunigen die Arbeit der passenden Teams.
- Kopierschutz und Anti-Cheat sind Feature-Stufen im Modul Netzwerk bzw. Werkzeuge oder lizenzierte Middleware, kein eigenes Produkt. Die Regeln stehen unter Markt → Piraterie und Kopierschutz.
- Spezialisierte KI-Firmen bieten einzelne Module an (z. B. Physik oder Netzwerk); sie verkaufen nur Middleware und sind daher frühe Übernahmeziele.
- Eine eigene Engine mit lizenzierten Fremdmodulen kostet ihre Lizenznehmer indirekt mit; das senkt ihren Preisspielraum.
- In 1.0 kauft oder lizenziert der Spieler Fremdmodule von KI-Middleware-Firmen. Nach 1.0 kann er eigene Module auch einzeln anbieten; das nutzt denselben Lizenzvertrag mit dem Umfang „Modul“ statt „Engine“, also kein zweites System.

### Engine und laufende Projekte

In der Realität wächst eine Engine oft während der Entwicklung eines Spiels mit: Das Spiel braucht etwas Neues, das Engine-Team baut es. Das Spiel bildet das über zwei Dinge ab: eine **Engine-Bindung** pro Projekt und **Anforderungen** an das Engine-Team.

| Bindung | Was passiert | Vorteil | Nachteil |
| --- | --- | --- | --- |
| 📌 Fest | Das Projekt bleibt auf der Engine-Version, mit der es gestartet ist | Stabil, keine Überraschungen, keine Integrationskosten | Technik veraltet während langer Projekte; neue Module fehlen |
| 🔄 Mitlaufend | Jedes neue Update der Engine fließt automatisch ins Projekt, bis zum Feature-Freeze | Immer der neueste Stand; neue Module sofort nutzbar | Jedes Update kostet Integrationszeit und bringt Bugs; Termine werden unsicherer |

- **Standard:** Kleine und mittlere Projekte sind fest, große und AAA-Projekte mitlaufend. Der Spieler kann die Bindung jederzeit bis zum Feature-Freeze wechseln.
- **Feature-Freeze als Grenze:** Danach kommen nur noch Fehlerbehebungen der Engine ins Projekt. Ein späteres Engine-Update kostet so viel wie ein Feature nach dem Freeze (siehe Entwicklungsprozess).
- **Hauptversion wechseln** (z. B. Nova 1 auf Nova 2): kostet umso mehr, je weiter das Projekt ist. In Konzept und Pre-Production fast nichts, in der Produktion einige Wochen, ab Alpha nur noch mit Verschiebung.

**Anforderungen an das Engine-Team:** Eine gesperrte Feature-Karte im Design-Dokument (z. B. „Zerstörung braucht Physik 4“) lässt sich direkt beim Engine-Team **bestellen**.

1. Die Anforderung erscheint auf der Engine-Platine als Auftrag mit Modul, Zielstufe und gewünschtem Termin (spätestens Feature-Freeze des Projekts).
2. Im Projekt liegt die Feature-Karte als „ausstehend“ auf dem Brett; die Prognose zeigt zwei Fächer, mit und ohne das Feature.
3. Ist die Stufe rechtzeitig fertig, wird das Feature normal eingebaut. Wird sie es nicht, wählt der Spieler: Feature streichen, Projekt verschieben oder das Projekt baut eine eigene Notlösung (schneller, aber mit technischer Schuld).
4. Mehrere Projekte können dieselbe Anforderung stellen; das Engine-Team priorisiert nach Regel oder Spieler. Konflikte („zwei Projekte, ein Engine-Team“) sind gewollt: Hier entsteht die Spannung zwischen Engine und Spielen.

- **Fremde Engine:** Der Anbieter hat eine sichtbare Roadmap. Mit Premium-Support kann der Spieler Wünsche einreichen, die der Anbieter mit einer Wahrscheinlichkeit erfüllt; mit Quellcode-Zugang kann er das Modul selbst ausbauen (siehe Lizenzweg).
- **Lizenznehmer** der eigenen Engine stellen ebenfalls Anforderungen. Erfüllen bindet Kunden und bringt Ruf, kostet aber Engine-Kapazität, die den eigenen Spielen fehlt.
- **Nach 1.0:** Projekt-Zweige. Ein Projekt baut ein Modul lokal selbst aus (schneller als über das Engine-Team), muss es danach aber zurückführen; ohne Rückführung steigt die technische Schuld, weil zwei Fassungen der Engine gepflegt werden.

### Technik-Update per Patch

Ein veröffentlichtes Spiel kann auf eine neuere Engine-Version gehoben werden. Das ist sinnvoll und real üblich, aber nicht für jedes Spiel: Live-Spiele müssen technisch mithalten, große Einzelspiele bekommen beim Konsolenwechsel ein „Next-Gen-Update“, kleine Spiele lohnen den Aufwand fast nie.

| Form | Preis für Spieler | Wirkung | Risiko |
| --- | --- | --- | --- |
| 🆓 Kostenloses Update | gratis | Zufriedenheit und Spielerwertung steigen, Back-Catalog-Verkäufe erhalten einen Impuls, Live-Spiele verlieren weniger Spieler | Kosten ohne direkte Einnahme |
| 💶 Kostenpflichtiges Upgrade | kleiner Aufpreis | Einnahmen von Bestandskäufern | Kritik, wenn das Update klein wirkt |
| 💿 Als Remaster | Vollpreis, eigenes Produkt | Neue Pressewertung, neuer Verkaufsstart | Teuer; Spieler erwarten deutlich mehr als ein Update |

- **Aufwand** hängt vom Versionsabstand und der Größe des Spiels ab; ein Sprung über zwei Hauptversionen kostet fast so viel wie ein Remaster.
- **Wirkung:** Der Engine-Faktor E des Produkts wird neu berechnet. Bei Live-Spielen wirkt E laufend auf die Abwanderung: Ein MMO auf veralteter Technik verliert jedes Jahr mehr Spieler. Die Pressewertung von damals bleibt, die Spielerwertung kann steigen.
- **Plattformen:** Ein Update kann neue Plattformen mitbringen (Port auf die neue Konsolengeneration), wenn die neue Engine-Version sie unterstützt.
- **Risiko:** Neue Bugs und gebrochene Mods (Ereignis „Update zerstört Mods und Spielstände“ mit Antwortoptionen). QA-Kapazität senkt das Risiko.
- **Umsetzung:** Das Technik-Update ist ein weiterer Produkttyp-Datensatz (Voraussetzung: veröffentlichtes Spiel und neuere Engine-Version), kein eigenes System. Delegationsregel möglich: „Wenn ein Live-Spiel zwei Versionen hinter der Engine liegt, dann Technik-Update planen.“

## Lizenzmarkt

Engines werden über Verträge gehandelt, nicht über einen festen Prozentsatz. Der Spieler kann Engines anbieten, lizenzieren und Verträge nachverhandeln; KI-Studios tun dasselbe untereinander.

**Vertragsbestandteile:**

| Bestandteil | Optionen | Wirkung |
| --- | --- | --- |
| Pauschale | 0 bis hoch, pro Spiel oder pro Jahr | Planbare Einnahme, schreckt kleine Studios ab |
| Royalty | 0–30 % vom Umsatz, optional erst ab einer Umsatzschwelle | Verdient an Hits mit, nichts an Flops |
| Laufzeit | ein Spiel, mehrere Jahre, unbefristet | Bindung gegen Flexibilität |
| Exklusivität | keine, pro Genre, pro Plattform, vollständig | Höherer Preis; blockiert andere Kunden |
| Quellcode-Zugang | nein, ja | Lizenznehmer können eigene Module bauen und werden unabhängiger |
| Support-Level | keiner, Basis, Premium | Kostet eigene Mitarbeiter; schlechter Support senkt Zufriedenheit |
| Updates | eingefroren, Minor-Updates, alle Versionen | Ältere Versionen veralten, Kunden drängen auf Upgrades |
| Abo pro Arbeitsplatz | Jahresgebühr pro Entwickler des Kunden, keine Royalty | Planbar für beide Seiten; große Teams zahlen viel, Hits bringen nichts extra |

**Vertragsvorlagen:** Der Spieler verhandelt nicht jeden Vertrag einzeln. Er legt drei Vorlagen fest, die für die meisten Anfragen gelten.

| Vorlage | Typische Kunden | Inhalt (Beispiel) |
| --- | --- | --- |
| Indie | Kleine Studios | Royalty erst ab Umsatzschwelle, Basis-Support, keine Exklusivität |
| Standard | Mittelgroße Studios | Pauschale + Royalty, Basis-Support, Minor-Updates |
| Premium | AAA-Studios, Publisher | Individuell; Einzelverhandlung, Premium-Support, optional Quellcode |

- Anfragen, die zu einer Vorlage passen, werden je nach Delegationsstufe automatisch angenommen; nur Abweichungen und Großkunden landen beim Spieler.
- **Lizenznehmer-Übersicht:** Jeder Kunde hat einen Status (zufrieden, verlängert sicher, gefährdet, wandert ab) mit Grund („Support-Wartezeit zu lang“, „Konkurrenz-Engine hat Raytracing“). Die Einnahmen jeder Engine stehen in einer eigenen Spalte der Finanzübersicht, mit Verlauf.

**Wie Open Source Geld bringt:** Eine offene Engine kostet keine Lizenzgebühr, bringt aber auf drei Wegen Ertrag:

- **Support- und Service-Verträge:** Studios zahlen für garantierten Support, Anpassungen und frühe Updates.
- **Premium-Module:** Einzelne Module (z. B. Konsolen-Plattformmodul) bleiben kommerziell.
- **Indirekter Nutzen:** Community-Beiträge senken die Forschungskosten der Module, der Ruf als Arbeitgeber steigt, und wer die Engine kennt, ist ein leichter einzustellender Bewerber.

Dafür verliert der Spieler die Kontrolle: Konkurrenten nutzen die Engine kostenlos, und ein Rückweg zu Gebühren kostet viel Vertrauen.

**Lizenzmodelle als Voreinstellungen:** Hausintern (keine Vergabe), kommerziell (Pauschale + Royalty), Indie-freundlich (Royalty erst ab Schwelle) und Open Source (keine Gebühren; bringt Ruf, Community-Beiträge zu Modulen und Bewerber).

**Preismodelle nach realem Vorbild:** Royalty erst ab einer Umsatzschwelle pro Spiel (wie Unreal), Abo pro Arbeitsplatz ohne Royalty (wie Unity) und Open Source ohne Gebühren (wie Godot). Jeder Anbieter hat einen **Vertrauenswert**: Ändert er die Bedingungen für bestehende Kunden zu deren Nachteil, sinkt das Vertrauen stark, Kunden wandern ab und Open-Source-Engines gewinnen, selbst wenn die Änderung zurückgenommen wird. Plattformbetreiber mit eigener Engine können die Engine-Gebühr für Verkäufe im eigenen Store erlassen.

**Wie KI-Studios eine Engine wählen:** Jedes Studio bewertet alle verfügbaren Engines mit einem Nutzwert.

```latex
U = w_1 \cdot \text{Passung} + w_2 \cdot \text{Qualität} - w_3 \cdot \text{Kosten} + w_4 \cdot \text{Support} + w_5 \cdot \text{Ruf} - w_6 \cdot \text{Wechselkosten}
```

- **Passung:** Hat die Engine die Module, die das geplante Spiel braucht?
- **Kosten:** Pauschale plus erwartete Royalties beim erwarteten Umsatz des Studios.
- **Wechselkosten:** Ein Studio, das schon mit einer Engine arbeitet, wechselt nur bei deutlichem Vorteil (Teams müssen umlernen).
- Die Gewichte w hängen von der Studio-Persönlichkeit ab: Ein Indie-Studio achtet auf Kosten, ein AAA-Studio auf Qualität.
- Große KI-Studios können ab einer Größe eine eigene Engine bauen und werden so selbst zum Konkurrenten im Lizenzmarkt.

**Folgen für den Spieler:**

- Lizenzeinnahmen sind eine eigene Spalte in der Finanzübersicht; jedes Spiel mit der eigenen Engine ist in den Charts markiert.
- Lizenznehmer werden durch die Engine stärker und konkurrieren mit den eigenen Spielen. Exklusivität und Genre-Sperren sind das Gegenmittel.
- Lizenznehmer melden Probleme. Unbeantwortete Anfragen senken die Zufriedenheit; unzufriedene Kunden verlängern nicht und schaden dem Ruf.
- Ein Engine-Neubau zwingt Kunden zum Umstieg; ein Teil wechselt dabei zur Konkurrenz.
- Der Spieler kann eine Engine-Firma kaufen und bekommt ihre Engine samt Verträgen.

**Der Lizenzweg als vollwertige Strategie:** Wer keine eigene Engine baut, spielt trotzdem am Kern, nur von der anderen Seite. Damit beide Wege gleichwertig sind, hat auch der Lizenzweg eigene Entscheidungen und Höhepunkte:

- **Verhandlungsmacht:** Große Kunden handeln bessere Konditionen aus, verlangen Quellcode-Zugang oder Exklusivität in ihrem Genre.
- **Anbieterwechsel als Drama:** Erhöht der Anbieter die Preise oder fällt technisch zurück, steht ein Wechsel an. Er kostet Umschulungszeit und verschiebt laufende Projekte, kann aber eine Engine mit besserer Technik bringen.
- **Preis-Schocks:** Anbieter können Bedingungen ändern (z. B. Royalty von 5 auf 12 %). Das ist zugleich der Prüftest, ob das Engine-System spürbar ist.
- **Eigene Module dazubauen:** Mit Quellcode-Zugang kann der Spieler einzelne Module selbst entwickeln und sie in die fremde Engine einbauen, ein Zwischenweg zur eigenen Engine.
- **Den Anbieter kaufen:** Die größte Wendung des Lizenzwegs ist die Übernahme des eigenen Engine-Anbieters samt aller seiner Kunden.

Die Simulationsläufe prüfen, dass die Bot-Strategie „nie eine eigene Engine“ gewinnen kann (siehe Balancing).

### Markenmarkt

Wie Engines werden auch Marken gehandelt. Studios, die KI wie der Spieler, bieten ihre Spielwelten auf einer **Markenbörse** an: zur Lizenz für ein Spiel oder zum Kauf. Das Grundgefühl ist dasselbe wie beim Engine-Markt: Man verdient an einem Vermögen, das andere nutzen, und setzt dafür seinen Ruf aufs Spiel. Spezifikation: S04, Abschnitt Markenmarkt (Regeln LIZ-M).

| Angebotsform | Was passiert | Umfang |
| --- | --- | --- |
| Lizenzspiel | Ein Studio entwickelt ein Spiel in der fremden Welt. Pauschale plus Umsatzanteil (5–20 %), festgelegte Genres, Plattformen und Laufzeit, Mindestwertung als Qualitätsklausel, Freigaberecht des Inhabers. | 1.0 |
| Markenverkauf | Die Marke wechselt komplett den Besitzer, mit Fans, Ruf und Welttiefe. | 1.0 |
| Genre-Lizenz über Jahre | Ein Spezialist darf alle Spiele eines Genres in der Welt machen, z. B. die Strategie-Ableger. | nach 1.0 |
| Crossover und Gastauftritt | Zwei Marken in einem Spiel; beide Fangruppen werden angesprochen. | nach 1.0 |
| Merchandise, Film, Serie | Besteht schon (Messen, Kultur und Merchandise). | 1.0 |

**Die Markenbörse:** Ein Reiter „Marken“ in der Markt-Ansicht zeigt alle angebotenen Marken als Regal mit Wappen. Die Größe zeigt die Stärke, die Farbe die Frische, Fanringe die Fans pro Genre. Dazu kommen Preisvorstellung und Bedingungen. Eigene Marken bietet der Spieler mit denselben Vorlagen an wie Engines (Offen, Genre-exklusiv, Premium); passende Anfragen kann er automatisch annehmen lassen. Verhandelt wird am Verhandlungstisch.

**Was eine Marke wert ist:** Der Wert ist der Umsatz, den ihre Fans in den nächsten Jahren erwarten lassen.

```latex
W = \sum_{g} \text{Fans}_g \cdot \text{Kaufquote} \cdot \text{Preis} \cdot \text{Übertragung}(g) \cdot \text{Frische} \cdot \text{Restjahre}
```

Daraus schlägt das Spiel Kaufpreis und Umsatzanteil vor. Alle Startwerte stehen in S04.

**Wer was davon hat:**

- **Lizenznehmer:** Die Fans der Marke tragen sein Spiel von Anfang an; er gewinnt Ruf als Studio. Fans und Markenruf wachsen aber bei der Marke, nicht bei ihm.
- **Inhaber:** Geld ohne eigenes Team, und die Marke bleibt im Gespräch. Das Risiko: Ein schwaches Lizenzspiel senkt Ruf und Frische der Marke, ein starker Lizenznehmer wird Konkurrent im Genre. Qualitätsklausel und Freigaberecht schützen; wer die Freigabe verweigert, verliert Vertrauen.
- **Vertrauen** wirkt wie beim Engine-Markt: Wer Bedingungen nachträglich verschärft oder Lizenzen ohne Grund entzieht, bekommt weniger Anfragen.

**Wie die KI handelt:**

- Sie bietet eine Marke an, wenn sie ruht (drei Jahre kein Projekt), wenn das Studio Geld braucht oder für Genres außerhalb seiner Stärke.
- Marken-Fabriken lizenzieren aus; Indie-Studios und Spezialisten lizenzieren ein.
- Rivalen mit Groll verkaufen oder lizenzieren dem Spieler nichts.
- Plattformhersteller kaufen Marken für Exklusivtitel.

**Momente:**

- **Wiederbelebung einer Kult-Marke:** Eine Marke mit hoher Stärke ruht seit Jahren. Das erste Spiel nach der Pause bekommt einen Nostalgie-Bonus auf das Interesse.
- **Bieterwettstreit:** Zwei oder drei Studios wollen dieselbe Marke; am Verhandlungstisch wird geboten.
- **Gerücht:** „Rivale will deine Marke kaufen“ erscheint im Ticker, bevor das Angebot kommt.
- **Rückkauf:** Eine verkaufte Marke lässt sich zurückkaufen, meist teurer.
- **Konkursmasse:** Marken pleitegegangener Studios kommen über eine Auktion auf den Markt (siehe Markt, Krisen).

**Delegation und Freischaltung:** Eine Regel nimmt Lizenzanfragen an, wenn Genre, Mindestwertung und Umsatzanteil passen. Der Markenmarkt erscheint mit der ersten eigenen Marke oder der ersten Anfrage, frühestens etwa 1985.

**Balancing:** Ein Markenkauf soll sich erst nach zwei bis drei Spielen lohnen. Lizenzeinnahmen sollen im Mittel höchstens 25 % des Umsatzes eines Inhabers ausmachen, damit reiner Markenhandel keine überlegene Strategie wird.

## Marketing und Release

Marketing baut Hype auf, und Hype bestimmt die Verkäufe der ersten Wochen. Wie lange ein Spiel danach verkauft, entscheiden Wertung und Mundpropaganda.

**Interesse als ein Wert:** Jedes Projekt hat genau einen Wert für Interesse, gemessen in vorgemerkten Interessenten. Je nach Epoche heißt und sieht er anders aus: Vorbestellungen bei Händlern (1980er und 1990er), Hype in Magazinen (1990er und 2000er), Wishlists und Follower (ab den 2010ern). Interesse wächst proportional zum vorhandenen Interesse und sinkt langsam, wenn nichts passiert. Zu viel Interesse bei schwacher Qualität führt zu Enttäuschung: Die Spielerwertung fällt unter die der Presse, und die Marke verliert Stärke.

**Marketing-Autopilot:** Standardmäßig legt der Spieler nur einen Prozentsatz des Entwicklungsbudgets für Marketing fest. Der Autopilot verteilt ihn über die Kanäle der Epoche (Anzeigen, Presse, Trailer, Influencer, bezahlte Werbung). Einzelmaßnahmen lassen sich auf Wunsch selbst steuern.

**Die fünf echten Marketing-Entscheidungen:**

| Entscheidung | Was auf dem Spiel steht | Verfügbar ab |
| --- | --- | --- |
| Zeitpunkt der Ankündigung | Früh: mehr Zeit für Interesse, aber feste Erwartungen und Gefahr einer Verschiebung. Spät: weniger Interesse, dafür Überraschung | immer |
| Was auf der Jahresmesse gezeigt wird | Trailer, spielbare Demo oder nichts (siehe Messen) | 1980 (Handel), später Publikum |
| Demo veröffentlichen | Zeigt Qualität; eine schwache Demo schadet. Ab den 2010ern auch auf Demo-Festivals | 1990 |
| Früher Zugang für Creator | Starke Reichweite, aber Creator sehen auch die Schwächen | 2010 |
| Vorbestellungen und Preis | Frühe Einnahmen und Bindung; Verschiebungen kosten danach Vertrauen | 2000 (digital) |

**Release-Timing:**

- Jede Woche hat eine Konkurrenzdichte aus allen angekündigten Spielen derselben Zielgruppe. Neben einem großen Titel sinkt der eigene Absatz deutlich.
- Saison-Effekte: Weihnachtsquartal mit hohem Absatz und hoher Konkurrenz, Sommerloch mit wenig von beidem.
- Verschieben ist möglich: kostet Hype und Vertrauen, senkt aber Bugs.
- KI-Studios kündigen ihre Termine an und reagieren auf die des Spielers.

**Verkaufskurve:**

```latex
V(t) = V_0 \cdot e^{-k\,t},\quad V_0 \sim \text{Hype} \cdot \text{Marktgröße},\quad k \sim \frac{1}{\text{Wertung}}
```

Interesse bestimmt den Start, die Wertung bestimmt, wie langsam die Kurve fällt. Preissenkungen, Bundles und Rabattaktionen setzen kurzfristig neue Impulse.

### Der Release

Alles, was zum Release entschieden wird, liegt auf einem Bildschirm statt verstreut in mehreren Bereichen. Jeder Punkt ist vorbelegt (vom Autopiloten oder Produzenten); der Spieler ändert nur, was ihn interessiert, und bestätigt einmal.

| Punkt | Inhalt | Vorschlag kommt aus |
| --- | --- | --- |
| 📅 Termin | Pin auf dem Zeitstrom mit Konkurrenzdichte und Saison | Release-Timing, angekündigte Konkurrenz |
| 💶 Preis | Balken „unser Preis gegen Erwartung“ für Genre, Umfang und Epoche | Marktdaten, Wertungsprognose |
| 🎮 Plattformen | Lead plus weitere, mit Zertifizierungsstatus und Versionsqualität | Projekt, Leistungsbudget |
| 📦 Auflage | Physische Stückzahl (bis etwa 2010) | Vorbestellungen und Interesse |
| 🎁 Editionen | Standard, Deluxe, Sammler-Edition | Größe des Spiels, Stärke der Marke |
| 🎮 Demo | Vorab, zum Release oder keine | Prognose |
| 🩹 Day-One-Patch | Teamzeit zwischen Gold und Release | Bug-Stand |
| 🔒 Kopierschutz | Stufe nach Epoche und Plattform | Piraterie und Kopierschutz |
| 🖥 Serverkapazität | Kapazität zum Start bei Online-Spielen | Interesse, Standard 1,5-fache Prognose |

**Preis über die Lebenszeit:** Nach dem Release schlägt das Spiel eine Preiskurve vor. Ab etwa 2005 gibt es feste Rabattwochen der Stores als Kalenderereignisse auf der Zeitleiste. Ein Rabatt bringt einen kurzen Absatzsprung; zu häufige Rabatte gewöhnen die Fans aber daran zu warten und senken die Vollpreis-Käufe künftiger Spiele der Marke. Dazu kommen Bundles, Budget-Neuauflagen und Abo-Deals (siehe Produkte). Preisaktionen lassen sich per Regel delegieren („Nach 12 Monaten 30 % Rabatt in jeder Store-Aktion“).

## Vertrieb und Produktion

Vom fertigen Spiel bis zum Käufer gibt es drei Fragen: Wie wird es hergestellt, über welche Wege kommt es zum Kunden, und wie wird es über die Jahre weiter verwertet? Bis etwa 2010 ist das ein eigenes Geschäft mit Risiko, danach verschiebt es sich in die Stores und in Neuauflagen.

### Produktion (physisch, bis etwa 2015)

| Datenträger | Zeit | Stückkosten inkl. Verpackung | Vorlauf | Besonderheit |
| --- | --- | --- | --- | --- |
| 📼 Kassette | 1980–1990 | 1–2 USD | 2 Wochen | billig, leicht zu kopieren |
| 💾 Diskette | 1982–1997 | 1,50–3 USD pro Diskette | 2 Wochen | große Spiele brauchen mehrere Disketten |
| 🎮 Modul | 1980–2001 | 10–25 USD | 8–12 Wochen | der Hersteller fertigt selbst und verlangt Vorauszahlung; hohes Risiko |
| 💿 CD | 1993–2005 | 1–2 USD | 2–3 Wochen | billig, viel Platz |
| 📀 DVD | 2000–2015 | 1–2 USD | 2–3 Wochen |  |
| 💿 Blu-ray oder Karte | ab 2006 | 2–4 USD, Karte 5–10 USD | 3–6 Wochen | Karten sind teurer, aber schneller |

- **Auflage:** Beim Release legt der Spieler die Auflage fest, mit Empfehlung aus Vorbestellungen und Interesse. Jede Charge hat eine Mindestmenge; Nachproduktion dauert so lange wie der Vorlauf des Datenträgers.
- **Plattformgebühr bei Fertigung:** Auf Konsolen wird die Lizenzgebühr pro gefertigtem Stück fällig, nicht pro verkauftem. Eine zu große Modul-Auflage ist deshalb doppelt teuer.
- **Lager und Rückläufer:** Lager kostet pro Monat. Der Handel gibt unverkaufte Ware nach drei bis sechs Monaten zurück oder verlangt bei einer Preissenkung eine Gutschrift (Preisschutz).
- **Beigaben:** Handbuch, Karte und kleine Extras (in den 80ern und 90ern üblich) kosten etwas mehr, stärken die Fanbindung und wirken als schwacher Kopierschutz.
- **Delegation:** Regel „Auflage = Empfehlung“ ist Standard; der Spieler greift nur bei großen Spielen ein.

### Vertriebswege

| Weg | Zeit | Erlös beim Studio | Reichweite | Besonderheit |
| --- | --- | --- | --- | --- |
| 📮 Eigenvertrieb (Versand, Anzeigen) | 1980–1990 | 70–80 % | klein | typisch für die Garage |
| 🚚 Distributor | 1980–2010 | 35–45 % | groß | übernimmt Lager, Handel und Rückläufer gegen Anteil |
| 🏬 Eigener Handelsvertrieb | ab mittlerem Studio | 45–55 % | groß | braucht ein Vertriebsteam im Marketing und Händlerbeziehungen |
| 🤝 Publisher | immer | laut Vertrag | sehr groß | siehe Publisher-Verhandlung |
| 🆓 Shareware | 1988–2000 | 70–90 % der Registrierungen | mittel | erste Episode gratis, Rest gegen Bezahlung; 1–5 % der Spieler zahlen |
| 🛒 Digitale Stores | PC ab etwa 2004, Konsole ab 2006, Mobile ab 2008 | 70–88 % | weltweit | Hervorhebung im Store hängt an Wertung, Beziehung und Aktionen |
| 📦 Hardware-Bundle | ab 1985 | Festbetrag pro Gerät | riesig | Hersteller bietet es Hits an; stärkt Plattform und Marke |
| 📰 Heft-Beilage | 1985–2005 | kleiner Festbetrag | groß | für alte Titel; steigert die Bekanntheit der Marke |
| 🔁 Abo-Katalog | ab 2017 | Festbetrag | sehr groß | siehe Abo-Deal |

- **Regalplatz:** Bis etwa 2010 verteilt der Handel Regalplatz nach Interesse, Ruf und Handelsmesse. Schwache Titel verschwinden nach einigen Wochen aus dem Regal.
- **Regionen:** Bis etwa 2005 erscheinen Spiele oft zeitversetzt in Japan, Nordamerika und Europa; die Lokalisierung bestimmt den Termin. Danach ist ein weltweiter Release Standard.

### Verwertung über die Jahre: Editionen, Neuauflagen, Sammlungen

| Form | Wann | Voraussetzung | Wirkung | Risiko |
| --- | --- | --- | --- | --- |
| Standard und Deluxe (Gold) | zum Release | Deluxe: Extras, ab etwa 2008 Season Pass | höherer Durchschnittspreis | Deluxe ohne echten Inhalt bringt Kritik |
| Sammler-Edition | zum Release | großes Spiel, viel Interesse | hoher Preis, Fanbindung | eigene Auflage, Lagerrisiko |
| Game of the Year oder Complete Edition | 9–24 Monate nach Release | Wertung ab 8 oder ein Preis; mehrere DLC | neuer Verkaufsstart mit allem Inhalt | senkt Vollpreis- und DLC-Käufe; zu früh erzieht Fans zum Warten |
| Budget-Reihe (Klassiker-Programm) | ab 12–24 Monaten | auf Konsolen Mindestverkäufe im Herstellerprogramm, auf PC eine eigene Budget-Linie | Preis 20–30 USD, neue Käufergruppe | im Übermaß Ruf als Billiganbieter |
| Spielesammlung | ab 3 Jahren | mehrere eigene Titel einer Marke oder Epoche | bündelt die Restnachfrage, Nostalgie | Markenmüdigkeit, schwächt Einzeltitel |
| Klassiker-Sammlung auf neuer Plattform | ab 10 Jahren | kleiner Port-Aufwand | Nostalgie-Bonus, neuer Markt | schwache Wertung, wenn lieblos |
| Remaster | ab 5 Jahren | Technik-Update oder Port | neue Wertung und neuer Start | Erwartung höher |
| Remake | ab 10 Jahren | neues Projekt mit Marke und Design-Dokument des Originals | volle Neuentwicklung mit Fan-Bonus | teuer |
| Lizenz an Budget-Publisher | ab 3 Jahren | alter Titel | Festbetrag plus kleiner Anteil, kein Aufwand | kein Einfluss mehr auf den Preis |
| Hardware-Bundle | jederzeit bei Hits | Angebot des Herstellers | Festbetrag pro Konsole, riesige Verbreitung | verdrängte Vollpreisverkäufe; mehr Fans für den Nachfolger |

**Wie Neuauflagen wirken:** Jedes Spiel hat eine Restnachfrage in drei Preisstufen: Vollpreis, Mittelpreis und Budget. Eine Neuauflage senkt den Preis in die nächste Stufe und erschließt deren Käufer; jede Stufe lässt sich nur einmal richtig ernten. Eine Sammlung fasst die Restnachfrage mehrerer Titel zusammen, mit einem Abschlag für Überschneidung. Wer zu schnell verbilligt, verliert dauerhaft Vollpreiskäufer bei den nächsten Spielen der Marke.

- Alle Formen sind Produkttyp-Datensätze, kein eigenes System. Sie erscheinen als Vorschlag-Karte („Zeit für eine Game-of-the-Year-Edition“), nie als Pflicht-Entscheidung, und lassen sich per Regel delegieren („Nach 24 Monaten in die Budget-Reihe“).
- Im Marken-Stammbaum erscheinen Neuauflagen als kleine Knoten am Original.
- KI-Studios nutzen dieselben Formen; Marken-Fabriken verwerten stärker, Indie-Studios setzen auf Rabatte und Sammlungen.

## Support und Live-Betrieb

Mit dem Release beginnt der Betrieb: Bugs beheben, Server betreiben, Inhalte nachliefern und die Community halten. Diese Arbeit bindet Teams, die dann für neue Projekte fehlen.

**Bugs und Patches:**

- Jedes Spiel erscheint mit einer Bug-Zahl aus Technik, Testzeit und technischer Schuld der Engine.
- Spieler finden Bugs nach und nach; schwere Bugs senken Wertung und Zufriedenheit sichtbar.
- Patches kosten Teamzeit. Ein Day-One-Patch rettet die Wertung teilweise, aber nicht ganz.

**Community-Zufriedenheit (0–100, pro Marke):**

| Steigt durch | Sinkt durch |
| --- | --- |
| Schnelle Patches | Lange unbehobene Bugs |
| Kostenlose Updates | Zu viele oder zu teure DLC |
| Gute Kommunikation (Ereignisse beantworten) | Verschiebungen nach Vorbestellung |
| Mod-Support | Aggressive Monetarisierung in F2P |
| Pünktliche Seasons | Server-Ausfälle |

Zufriedenheit wirkt auf Sequel-Verkäufe, Mundpropaganda und den Wert der Marke.

**MMO, F2P und Live-Service:**

- **Spielerbasis:** Neue Spieler kommen über Hype, Wertung und Marketing; jeden Monat wandert ein Anteil ab (Churn).
- **Churn** sinkt durch neue Inhalte und hohe Zufriedenheit und steigt durch Konkurrenz im selben Genre.
- **Server:** Kapazität mieten oder eigene Rechenzentren betreiben. Zu wenig Kapazität führt zu Ausfällen, zu viel kostet Geld.
- **Content-Plan:** Seasons, Erweiterungen und Events im festen Rhythmus; jede Pause erhöht den Churn.
- **Abschalten:** Ein Spiel einzustellen spart Kosten, schadet aber dem Ruf bei dessen Spielern.

**Serverkapazität:** Jedes Online-Produkt hat einen Bedarf (Spieler mal Last). Drei Quellen decken ihn:

| Quelle | Ab wann | Kosten | Reaktion |
| --- | --- | --- | --- |
| Eigener Serverraum oder Rechenzentrum (Ausstattung) | Online-Zeit | einmalig, danach günstig pro Einheit | fest; wächst nur durch Ausbau |
| Gemietete Kapazität mit Vertrag | Online-Zeit | monatlich, mittel | muss vier Wochen vorher bestellt werden |
| Cloud nach Bedarf | ab etwa 2010 | teuer pro Einheit | wächst pro Woche um höchstens 50 % |

- **Warum Server ausfallen:** In der Startwoche ist der Bedarf zwei- bis viermal so hoch wie im Normalbetrieb. Reicht eigene und gemietete Kapazität nicht und kann die Cloud nicht schnell genug wachsen (vor 2010 gibt es sie gar nicht), fällt der Dienst teilweise aus (Krisenkette „Server-Ausfall zum Start“).
- **Keine Klick-Arbeit:** Der Spieler entscheidet einmal auf dem Release-Bildschirm über die Kapazität zum Start, mit Vorschlag aus dem Interesse (Standard: 1,5-fache Prognose). Danach steuert eine Regel („Kapazität = Bedarf × 1,3“) automatisch nach.
- **Skalierung:** Ein Serverraum reicht für ein kleines Online-Spiel. Wer ein Millionen-MMO betreibt, braucht ein Rechenzentrum (Großausbau) oder Miete und Cloud.

**Engine-Support:** Lizenznehmer erzeugen Support-Anfragen (siehe Lizenzmarkt). Sie laufen über den Topf Engine-Support der Abteilung Betrieb.

**Abteilung Betrieb:** Live-Ops, Kundenservice, Community und Engine-Support teilen sich eine Abteilung. Der Spieler legt ihre Größe fest und verteilt die Kapazität per Regler auf die Töpfe; ab drei parallelen Live-Services übernehmen Produzenten die Steuerung.

**Analytics (ab etwa 2010):** Eine Analytics-Abteilung wertet Spielerdaten aus.

| Stufe | Wirkung | Kehrseite |
| --- | --- | --- |
| Keine | Live-Service und F2P laufen „blind“ | Churn höher, Monetarisierung schwach |
| Grundlegend | Churn sinkt, Content wird gezielter | Kosten |
| Intensiv | Monetarisierung steigt deutlich, Prognosen werden genauer | Risiko für den Ruf, wenn sie aggressiv genutzt wird (z. B. Lootbox-Debatte als Ereignis) |

Analytics macht F2P und Live-Service erst planbar und ist zugleich ein Beispiel für eine Epoche, die neue Werkzeuge mit neuen Risiken bringt.

## Messen, Kundenservice und weitere Geschäftsbereiche

Rund um die Spiele entstehen eigene Geschäftsbereiche, die Geld kosten oder bringen und auf Ruf, Hype und Marken wirken. Jeder Bereich hat eine eigene Abteilung oder kann ausgelagert werden.

&#91;embedded content: Weitere Geschäftsbereiche · 8 Bereiche\]

### Messen und Showcases

Messen sind feste Termine im Jahr. Was dort gezeigt wird, wirkt auf Hype, Handel, Publisher und Lizenzkunden.

| Veranstaltung | Epoche | Wirkung |
| --- | --- | --- |
| Handelsmesse | 1980er–1990er | Händler bestellen Stückzahlen; entscheidet über die Regalplätze |
| Große Branchenmesse | ab Mitte der 1990er | Großer Hype-Sprung, Presse-Termine, Ankündigungen |
| Publikumsmesse | ab den 2000ern | Spielbare Demos für Fans; Warteschlangen zeigen das Interesse |
| Entwicklerkonferenz | durchgehend | Bewerber, neue Lizenzkunden für Engine und Middleware, Vorträge steigern den Ruf |
| Demo-Festival | ab den 2010ern | Mehrmals im Jahr, verstärkt vorhandenes Interesse (siehe Marketing) |
| Digitaler Showcase | ab den 2020ern | Trailer-Premieren; ab einer Firmengröße ein eigener Showcase |

- **Eine Messe-Saison pro Jahr:** Einmal im Jahr legt der Spieler die Messe-Saison fest: pro Projekt, ob und wie es gezeigt wird, als Trailer (sicher, mittlere Wirkung), spielbare Demo (stark, aber riskant bei schwachem Stand) oder gar nicht (spart Geld). Das Marketing verteilt diese Wahl automatisch auf die Veranstaltungen des Jahres und erledigt Standgröße und Termine nach Budget. In 1.0 gibt es zwei Veranstaltungstypen: die große Branchenmesse (in den 1980ern als Handelsmesse) und die Entwicklerkonferenz; die übrigen folgen nach 1.0.
- **Ankündigungen** auf Messen wirken stärker als außerhalb, legen aber Erwartungen fest.
- **Entwicklerkonferenz:** Ein Vortrag über die eigene Engine bringt Ruf und Lizenzanfragen.
- **Preise:** Auf großen Veranstaltungen werden die Branchenpreise vergeben (siehe Ziele).

### Kundenservice (Teil der Abteilung Betrieb)

Kundenservice ist kein eigenes System, sondern ein Kapazitätstopf der Abteilung Betrieb (neben Live-Ops und Engine-Support). Jedes verkaufte Spiel erzeugt Anfragen; reicht die Kapazität nicht, sinkt die Zufriedenheit.

```latex
\text{Anfragen} \sim \text{Verkäufe} \cdot (a + b \cdot \text{Bugs} + c \cdot \text{Online-Anteil})
```

- Der Spieler stellt nur die Aufteilung der Betriebs-Kapazität ein und wählt eigen oder ausgelagert (günstiger, schlechtere Qualität).
- Kanäle wechseln automatisch mit der Epoche (Hotline, E-Mail, Foren, soziale Medien, Discord).
- Moderation und Kontoschutz bei Online-Spielen laufen im selben Topf; Betrug oder gehackte Konten erscheinen als Ereignis (siehe Krisen).

### Merchandising und Medien

Aus erfolgreichen Marken entsteht ein Geschäft neben den Spielen. Die Nachfrage hängt von Bekanntheit, Welttiefe und Fans der Marke ab.

| Produkt | Voraussetzung | Besonderheit |
| --- | --- | --- |
| Soundtrack | jedes Spiel mit Musik | günstig, kleine Einnahmen |
| Artbook | Spiel mit starker Grafik | kleine Auflage, stärkt Fans |
| Figuren, Plüsch, Kleidung | bekannte Marke | eigener Fanshop oder Lizenz an Hersteller |
| Sammler-Edition | großes Spiel mit vielen Vorbestellungen | hoher Preis, Lager- und Produktionsrisiko |
| Bücher, Comics, Brettspiele | Welttiefe | Lizenz an Verlage |
| Film oder Serie | sehr bekannte Marke | Lizenz an ein Studio; Erfolg stärkt die Marke, ein Flop schadet ihr |

- **In Version 1.0 automatisch:** Merchandising ist ein Ertrag jeder Marke, abhängig von Stärke und Welttiefe. Der Spieler trifft eine Entscheidung pro Marke: eigener Fanshop (höhere Marge, etwas Risiko) oder Lizenz an Partner (sicherer Anteil).
- Sammler-Editionen sind eine Option beim Release großer Spiele, mit Auflage wie bei der physischen Auflage.
- Zu viel Merchandise bei einer schwachen Marke senkt deren Stärke.
- **Nach 1.0:** Einzelprodukte, Fanshop-Lager und Film oder Serie als Mechanik. In 1.0 kommt eine Verfilmung nur als Ereignis vor („Ein Filmstudio will deine Marke“), mit Folgen für die Marke.

### Lokalisierung, Freigaben, E-Sport und Community

- **Lokalisierung:** Regionenpakete statt Einzelsprachen (Nordamerika, Europa, Japan, China, Lateinamerika). Jedes Paket kostet Zeit und Geld und öffnet einen Markt mit eigenen Genre-Vorlieben. Untertitel sind günstig, eine Vertonung teurer, aber wirksamer.
- **Altersfreigaben:** werden automatisch berechnet. Der Spieler entscheidet nur, wenn eine Freigabe die Zielgruppe stark einschränkt oder ein Land das Spiel ablehnt: Schnittfassung ja oder nein.
- **E-Sport:** nach Version 1.0; in 1.0 nur als Ereignis („Eine Liga will dein Spiel“).
- **Community:** ist Teil der Abteilung Betrieb; Creator-Zugang ist eine Marketing-Entscheidung, Mod-Werkzeuge sind eine Stufe des Engine-Moduls Werkzeuge.

## Firma

Die Firma besteht aus Abteilungen mit Teams. Kapazität entsteht durch Einstellen, Ausbilden und Ausstattung, nicht durch Bauen; mehr Mitarbeiter brauchen ein passendes Büro (siehe Büro und Ausstattung).

**Abteilungen:**

| Abteilung | Aufgabe |
| --- | --- |
| Spieleentwicklung (mehrere Teams) | Spiele, Addons, DLC, Patches, Technik-Updates |
| Engine-Team | Forschung, Module, Wartung, Anforderungen der Projekte und Lizenznehmer |
| QA | Findet Bugs vor dem Release; ihre Kapazität senkt die Bug-Zahl beim Release. Playtests messen dagegen die Qualität, nicht die Bugs |
| Marketing | Kampagnen, Messen, Presse |
| Betrieb | Live-Ops, Kundenservice, Community und Engine-Support als Töpfe einer Abteilung |
| Publishing (nach 1.0) | Spiele fremder Studios veröffentlichen |

**Mitarbeiter** sind in Teams und Schlüsselpersonen organisiert:

### Teams und Schlüsselpersonen

Ab 8 Mitarbeitern kann der Spieler Teams bilden; bis etwa 20 sieht er jede Person auch einzeln. Danach werden **Teams** zur Spieleinheit, und nur noch **Schlüsselpersonen** bleiben einzeln sichtbar. So bleibt das Spiel mit 300 Mitarbeitern genauso bedienbar wie mit drei.

**Teams:**

| Wert | Bedeutung |
| --- | --- |
| Größe | Anzahl Personen; mehr Leute bringen abnehmenden Ertrag |
| Spezialisierung | Schwerpunkt (Gameplay, Grafik, Sound, Story, Technik, QA, Engine, Betrieb) |
| Stärke | Durchschnittliches Können im Schwerpunkt (0–100) |
| Erfahrung | Mit einem Genre, einer Engine, einer Plattform; senkt Kosten und Bugs |
| Moral | Zufriedenheit; sinkt durch Crunch, Flops, harte Vorgaben, Entlassungen |
| Leitung | Optional eine Schlüsselperson als Teamleiter mit Bonus |

- Teams wachsen durch Einstellungen nach der Personalpolitik und lernen durch Projekte. Juniors werden automatisch besser, wenn erfahrene Leute im Team sind (Mentoring).
- Teams lassen sich zwischen Projekten und Standorten verschieben; ein Wechsel kostet einige Wochen Einarbeitung.
- Burnout entsteht aus langem Crunch und hoher Last; ein ausgebranntes Team arbeitet langsamer und verliert Leute. Jede Crunch-Woche kostet 3 Moral, und Crunch-Monate zählen über alle Projekte zusammen; auch der Crunch kurz vor Gold ist damit nicht kostenlos.

**Schlüsselpersonen:**

| Rolle | Wirkung |
| --- | --- |
| Studioleitung | Führungskapazität, Moral, Kultur |
| Creative Director | Qualität und Innovation der Projekte, Markenpflege |
| Technischer Direktor | Engine-Forschung, technische Schuld |
| Produzent | Führt Projekte nach Vorgabe (siehe Delegation) |
| Star-Entwickler | Starker Bonus in einem Bereich; zieht Fans und Bewerber an |

- Jede Schlüsselperson hat Namen, Porträt, zwei bis drei Eigenschaften (z. B. Perfektionist, Teamplayer, Diva, Visionär) und eine **Loyalität**. Niedrige Loyalität führt zu Abwerbeangeboten der Konkurrenz und zu Kündigungen.
- Schlüsselpersonen erzeugen kleine Geschichten: Sie wünschen sich ein Projekt in ihrem Lieblingsgenre, fordern mehr Gehalt nach einem Hit oder wollen ein eigenes Studio gründen (Spin-off-Angebot).
- Legendäre Entwickler sind selten auf dem Markt und teuer; ihr Wechsel ist eine Nachricht in der Branche.

**Personalpolitik (Firmenprofil statt Einzel-Recruiting):**

| Stellschraube | Wirkung |
| --- | --- |
| Gehaltsniveau | Unter, auf oder über Markt; bestimmt Bewerberqualität und Abwanderung |
| Crunch-Regel | Nie, nur vor Gold, bei Bedarf; mehr Tempo gegen Moral, Bugs und Ruf als Arbeitgeber |
| Ausbildung | Budget pro Kopf; hebt die Teamstärke langsam |
| Arbeitsmodell | Vor Ort, hybrid, remote (ab etwa 2020); ändert Talentpool, Kosten und Teamzusammenhalt |

Der **Ruf als Arbeitgeber** entsteht aus Gehalt, Crunch, Entlassungen und Erfolgen und bestimmt, wie viele gute Bewerber kommen.

**Bewerber** wachsen mit der Firma: Ihre Zahl steigt mit dem Faktor (1 + Mitarbeiter ÷ 100), eine Akademie wirkt als Multiplikator. Geht ein KI-Studio pleite, steht sein Team als Ganzes vor der Tür („Ein ganzes Team sucht Arbeit“) und lässt sich auf einen Schlag übernehmen.

**Studio-Kultur:** Die Firma des Spielers trägt drei sichtbare Kultur-Merkmale, die aus seinen Entscheidungen entstehen, etwa Crunch-Haltung, Genre-Treue, Offenheit (Open Source, Modding) und Gehaltsniveau. Sie wirken auf Bewerber, auf die Erwartung der Presse und auf die Kulturpassung bei Übernahmen. Wer seine Kultur bricht, verliert kurz Moral und bekommt eine Schlagzeile.

### Standorte

Jedes Studio hat einen Standort; neue Standorte können eröffnet oder per Übernahme gewonnen werden.

| Eigenschaft | Wirkung |
| --- | --- |
| Lohnniveau | Kosten pro Person |
| Talentpool | Zahl und Qualität der Bewerber, Schwerpunkte (z. B. viel Grafik-Talent) |
| Förderung | Steuergutschriften oder Zuschüsse für Spieleentwicklung, teils an Bedingungen gebunden |
| Region | Nähe zu einem Markt, kulturelle Passung für Lokalisierung |

- Ein zweiter Standort kostet Aufbauzeit und Führungskapazität.
- Standortzusagen bei Übernahmen beziehen sich auf diese Standorte; eine Schließung kostet Ruf in der Region.

**Standorte und Projekte:** Teams verschiedener Standorte können gemeinsam an einem Projekt arbeiten, etwa Engine-Spezialisten am teuren Hauptsitz und ein Grafik-Team an einem günstigen Standort.

- Jeder weitere beteiligte Standort kostet 5 % Koordinationsaufwand auf das Projekt, bei mehr als sechs Stunden Zeitunterschied 10 %.
- Förderungen gelten für die Lohnkosten der Teams dieses Standorts, die an förderfähigen Projekten arbeiten (z. B. 20 % Steuergutschrift, wenn das Projekt eine Bedingung wie einen Kulturtest erfüllt). Die Wahl des Standorts macht ein Projekt so spürbar günstiger oder teurer.
- Standorte haben Schwerpunkte im Talentpool; Teams wachsen dort im passenden Bereich schneller.
- Outsourcing an Fremdfirmen folgt denselben Regeln (Koordinationsaufschlag), ohne feste Kosten.

### Büro und Ausstattung

Das wachsende Büro ist in Game Dev Tycoon das sichtbarste Fortschrittsgefühl. Dieses Spiel übernimmt das, ohne Bauen: Jeder Standort hat ein Büro aus einem **Katalog fester Grundrisse**, und das Büro wird mit **Ausstattungspaketen** eingerichtet, die sich selbst aufstellen. Der Spieler entscheidet selten (Umzug, neue Epoche, neues Paket), aber jede Entscheidung ist sichtbar.

**Grundrisse nach Größe:**

| Größe | Arbeitsplätze | Ausstattungsplätze | Typisch |
| --- | --- | --- | --- |
| 🏠 Garage | bis 4 | 1 | Start 1980 |
| 🏢 Etage | bis 15 | 2 | erstes richtiges Studio |
| 🏬 Bürohaus | bis 50 | 4 | mittleres Studio, mehrere Teams |
| 🏛 Eigenes Gebäude | bis 150 | 6 | großes Studio, AAA-Projekte |
| 🌳 Campus | bis 500, um Gebäude erweiterbar | 10 | Konzernzentrale |

**Mehrere „Maps“ pro Größe:** Jede Größe hat zwei bis drei Grundriss-Varianten mit eigenem Charakter, abhängig von Standort und Epoche. Beispiel für die Etage:

| Variante | Miete | Besonderheit |
| --- | --- | --- |
| Altbau-Etage | niedrig | Komfort etwas schlechter, dafür Charme (kleiner Moral-Bonus für kreative Teams) |
| Gewerbepark | mittel | Neutral, ein zusätzlicher Ausstattungsplatz |
| Loft in der Innenstadt (ab den 2000ern) | hoch | Besserer Ruf als Arbeitgeber, mehr gute Bewerber |

Alle Grundrisse sind Datensätze (Größe, Plätze, Miete, Eigenschaft, Optik) und damit per Mod erweiterbar.

**Regeln:**

- **Umzug** in einen größeren oder anderen Grundriss kostet ein bis zwei Wochen Tempo und eine Kaution; die Ausstattung zieht mit, soweit Plätze frei sind. Mietverträge haben eine Laufzeit, ein vorzeitiger Auszug kostet Ablöse.
- **Ausbau ohne Umzug:** Im Bürohaus und eigenen Gebäude lässt sich eine weitere Etage anmieten, auf dem Campus ein weiteres Gebäude.
- **Enge:** Bis zu 20 % mehr Mitarbeiter als Arbeitsplätze sind möglich, kosten aber Moral. Remote- und Hybridarbeit (ab etwa 2020, siehe Personalpolitik) senken den Platzbedarf.
- **Mehrere Standorte** haben je ein eigenes Büro mit eigener Ausstattung.
- **Delegation:** Regel „Wenn das Büro zu 90 % belegt ist, dann größeres Büro vorschlagen“; die Studioleitung schlägt passende Pakete vor.

**Ausstattung:**

| Ausstattung | Wirkung | Ab wann | Plätze | Mehrfach |
| --- | --- | --- | --- | --- |
| 💻 Arbeitsplatz-Hardware (Stufen) | Mehr Tempo, weniger Bugs; veraltet mit dem Stand der Technik wie eine Engine | immer | keiner, gilt fürs ganze Büro | – |
| 🪑 Komfort (Stühle, Licht, Ruhezonen) | Mehr Moral, weniger Burnout | immer | keiner, Stufen fürs ganze Büro | – |
| 🎙 Tonstudio | Bessere Sound-Features, Sprachaufnahmen im Haus statt extern | 1990er | 1 | ja |
| 🧪 Testlabor | Mehr QA-Kapazität, genauere interne Playtests | 1990er | 1 | ja |
| 🗄 Serverraum | Eigene Serverkapazität (siehe Serverkapazität) | Online-Zeit | 1 | ja |
| 🎬 Motion-Capture-Studio | Bessere Animations-Features, Bonus für Story-lastige Spiele | etwa 2000 | 1 | nein |
| 🤝 Showroom und Konferenzraum | Bonus am Verhandlungstisch (Publisher, Lizenzen, Übernahmen) | Etage | 1 | nein |
| 🍽 Kantine und Freizeitbereich | Besserer Ruf als Arbeitgeber, mehr gute Bewerber | eigenes Gebäude | 1 | nein |
| 🏭 Rechenzentrum (Großausbau) | Dreifache Kapazität eines Serverraums, günstiger pro Einheit | ab 2005, eigenes Gebäude | 2 | ja |
| 🔬 Forschungslabor (Großausbau) | Engine-Forschung 15 % schneller | ab 1995, Bürohaus | 2 | nein |
| 👥 Qualitätszentrum (Großausbau) | Externe Playtests mit Fokusgruppen im Haus: genauer und günstiger | ab 2000, eigenes Gebäude | 2 | nein |
| 🎭 Performance-Capture-Bühne (Großausbau) | Ersetzt Motion-Capture: Körper, Gesicht und Stimme zugleich | ab 2010 | 2 | nein |
| 🎓 Akademie (Großausbau) | Ausbildung im Haus: Teamstärke wächst schneller, mehr Bewerber | eigenes Gebäude | 2 | nein |

- Jedes Paket kostet einmalig und laufend. Weil Ausstattungsplätze knapp sind, entsteht eine echte Abwägung, z. B. Tonstudio oder Testlabor, wenn nur ein Platz frei ist.
- Spezialräume konkurrieren mit Outsourcing: Ein eigenes Tonstudio lohnt erst ab einer gewissen Zahl von Projekten.
- Veraltete Hardware zeigt sich als Symptom („Teams 10 % langsamer: Arbeitsplätze von 1994“); eine neue Epoche bringt ein Ereignis mit Upgrade-Angebot.

**Mehrfach und groß:** Kapazitätsräume (Tonstudio, Testlabor, Serverraum, Rechenzentrum) lassen sich mehrfach einrichten; jeder weitere bringt 70 % des Nutzens des vorherigen. Großausbauten belegen zwei Plätze und ersetzen teils kleinere Räume. So bleibt die Abwägung auch auf dem Campus mit zehn Plätzen bestehen: viele kleine Kapazitätsräume oder wenige große Spezialräume.

**Darstellung:**

- **In 1.0** zeigt die Bühne den Grundriss als Kulisse; Ausstattung erscheint als Requisite (Tür zum Tonstudio, Serverschrank, Kantine im Hintergrund).
- **Ab 1.4** gibt es eine **Büro-Ansicht von oben** im Stil von Prison Architect oder SimAirport: stilisierte Draufsicht des festen Grundrisses, Räume als Flächen mit Symbolen, Mitarbeiter als einfache Figuren an ihren Tischen. Ein Klick auf einen Raum öffnet dessen Upgrade. Frei platziert wird nichts. Sie kommt nach Publishing und Middleware, weil diese mehr Spieltiefe bringen; bis dahin bleibt die Bühne.
- **Warum von oben und nicht isometrisch:** Eine Draufsicht lässt sich aus Code und SVG erzeugen. Hunderte isometrische Möbel und Figurenanimationen, die wie aus einem Guss wirken, kann Claude Code nicht zuverlässig liefern. Eine isometrische Ansicht bleibt eine Option für später, nur mit eingekauften 2D-Grafikern (S13).
- Beide Ansichten nutzen denselben PixiJS-Renderer und dieselben Daten; die Einstellung „Büro-Darstellung“ wählt zwischen ihnen. Die Simulation ist davon nicht berührt.
- **Aufwand der Büro-Ansicht:** etwa 2–3 Monate Code und 1–2 Monate Grafik: Raum-Symbole, Möbel als flache Formen mit Epochen-Farben, Figuren als einfache Silhouetten mit wenigen Zuständen (sitzen, gehen, jubeln).
- **Bewusst nicht:** freier Bau, Wände ziehen, Möbel einzeln platzieren. Das ist bei Mad Games Tycoon 2 und Software Inc. die Quelle von Mikromanagement und Leistungsproblemen im Spätspiel.

**Kosten und Outsourcing:** Gehälter machen den Großteil der Kosten aus, real 60–80 %. Für Spitzen kann der Spieler Arbeit an Outsourcing-Firmen vergeben (Grafik, Animation, QA, Ports): teurer pro Monat, aber ohne feste Einstellung und sofort verfügbar. Erwartete Teamgrößen und Budgets steigen über die Epochen stark, von einer Handvoll Leuten in den 1980ern bis zu Hunderten bei heutigen AAA-Spielen.

**Finanzen:**

- Übersicht mit Einnahmen (Verkäufe, DLC, Abos, In-Game-Käufe, Lizenzen, Publishing) und Kosten (Gehälter, Miete, Server, Marketing, Lizenzgebühren, Zinsen).
- Kredite mit Zinsen nach Kreditwürdigkeit; bei zu hohen Schulden droht die Insolvenz.
- **Publisher-Deals:** Ein Publisher zahlt einen Vorschuss und Marketing, behält aber einen Großteil der Einnahmen, bis der Vorschuss wieder eingespielt ist. Mit Erfolgen werden die Konditionen besser.
- **Self-Publishing:** Erst ab genug Fans und Kapital sinnvoll; dann bleibt der volle Umsatz.
- **Eigenes Publishing:** Nach 1.0 kann der Spieler selbst Verträge mit KI-Studios schließen (eigenes Publishing).
- **Übernahmen und Börse:** Firmen kaufen oder Anteile erwerben; eine übernommene Firma bringt Marken, Engines, Verträge und Mitarbeiter mit.

**Steuern:** Auf den Gewinn fällt quartalsweise eine einfache Gewinnsteuer je Region an (20–35 %), Verluste werden mit späteren Gewinnen verrechnet. Förderungen wirken als Steuergutschrift darauf. Steuern erscheinen als eigener Strang im Geldfluss-Diagramm. Jede Tochter hat ein eigenes Konto und führt standardmäßig 70 % ihres Gewinns ab.

### Publisher-Verhandlung

Ein Publisher-Deal entsteht in einer kurzen Verhandlung mit sichtbarem Spielraum statt durch ein starres Angebot. Dafür gibt es einen Verhandlungstisch, der genauso für Lizenz-Großkunden und Übernahmen dient (siehe Oberfläche).

1. **Pitch:** Der Spieler bietet ein Projekt an, mit Konzept oder (stärker) einem Vertical Slice. Bis zu drei Publisher antworten mit Interesse oder Absage.
2. **Erstangebot:** Jeder interessierte Publisher nennt Vorschuss, Raten pro Meilenstein, Split vor und nach dem Recoup, Aufschlag, Laufzeit, IP-Rechte und eine mögliche Sequel-Option.
3. **Drei Verhandlungsrunden:** Der Spieler fordert bei einzelnen Punkten mehr; jeder Publisher hat einen sichtbaren **Spielraum** (z. B. Balken für den Split). Überzieht der Spieler, kann der Publisher abspringen.

**Verhandlungsmacht** ergibt sich aus Ruf, Qualität des Slices oder der Playtest-Prognose, Stärke der Marke und Konkurrenzangeboten. Wer zwei Angebote hat, verhandelt besser.

**Publisher-Persönlichkeiten:** Manche sind großzügig beim Vorschuss, aber hart bei den IP-Rechten; andere lassen die Marke beim Studio, zahlen aber wenig vorab. Die Parameter selbst folgen realen Verträgen (siehe Analyse-Tab).

**Während der Laufzeit:** Die nächste Rate fließt erst nach erreichtem Meilenstein; verfehlt das Studio einen Meilenstein, kann der Publisher Zahlungen kürzen, Auflagen machen oder das Projekt stoppen. Nach dem Recoup verdient das Studio deutlich mehr pro Verkauf.

### Börse und Aktionäre

Ab einer gewissen Größe kann der Spieler an die Börse gehen. Das bringt einmalig viel Kapital, aber ab dann gibt es Erwartungen von außen. Die Börse ist bewusst einfach gehalten: ein Wert, eine sichtbare Zielmarke, wenige klare Folgen. Sie soll Druck erzeugen, keine Finanzsimulation sein.

**Voraussetzungen und Ablauf:** ab 2005, mindestens 150 Mitarbeiter, drei Jahre Gewinn, ein Jahresumsatz ab 50 Mio. USD und eine Kreditnote von B oder besser. Der Spieler wählt den Anteil, den er verkauft (z. B. 20–49 %), und den Zeitpunkt; ein Börsengang in einer Krise bringt deutlich weniger Geld.

**Umfang in 1.0:** Börsengang, Anlegerstimmung mit Quartals-Zielmarke, Hauptversammlung, Dividende in drei Stufen, Kapitalerhöhung und Aktien als Teil des Kaufpreises bei Übernahmen. Nach 1.0: Aktienrückkauf, Delisting und aktivistische Investoren. Übernahmen anderer Firmen bleiben vollständig erhalten (siehe Übernahmen und Konzern); die Börse liefert dafür nur zusätzliche Mittel.

**Anlegerstimmung (0–100):** Der einzige Börsenwert, den der Spieler steuern muss. Startwert 60 nach dem Börsengang. Jedes Quartal zeigt der Firmen-Bildschirm eine **Zielmarke**: Gewinn des Vorjahresquartals plus 5 %; lag dort ein Verlust, gilt der halbierte Verlust als Ziel.

| Anlass | Stimmung |
| --- | --- |
| Ziel erreicht | +5 |
| Ziel um mehr als 20 % übertroffen | +10 |
| Ziel verfehlt | −5 |
| Ziel um mehr als 20 % verfehlt | −10 |
| Verlust, obwohl ein Gewinn das Ziel war | −15 |
| Hit (Wertung ab 9) / Flop (unter 5) | +5 / −5 |
| Verschiebung eines angekündigten Titels | −3 |
| Skandal (Crunch, Datenleck, Lootbox) | −5 bis −10 |
| Übernahme abgeschlossen, Rekordumsatz | je +3 |

Die 20 % beziehen sich auf |Ziel| + 5 % des Quartalsumsatzes, damit ein Ziel nahe null keine Sprünge erzeugt. Jedes Quartal rückt die Stimmung um 10 % des Abstands zurück Richtung 50; sie bleibt zwischen 0 und 100.

**Kurs:** Kurs = Firmenwert ÷ Aktienzahl × (0,7 + 0,6 × Stimmung ÷ 100). Der Firmenwert kommt aus der Bewertung in Übernahmen und Konzern. Der Kurs ist reine Anzeige (Kurve im Firmen-Bildschirm, Ticker-Meldung bei ±10 % im Quartal), keine eigene Simulation.

**Folgen der Stimmung:**

| Stimmung | Folge |
| --- | --- |
| 0–29 unruhig | Die Hauptversammlung stellt eine Forderung (Sparprogramm, Projekt streichen, Sparte verkaufen); Ablehnen kostet −10. KI-Konzerne führen die Firma als Übernahmeziel. |
| 30–69 ruhig | Keine Wirkung. |
| 70–100 begeistert | Kapitalerhöhung möglich (bis 10 % neue Aktien, einmal pro Jahr, danach −5 Stimmung). Übernahmen können zu bis zu 50 % mit eigenen Aktien bezahlt werden. Bewerber +10 %. |

**Dividende:** Schalter mit drei Stufen: keine, niedrig (20 % des Jahresgewinns) oder hoch (50 %). Wirkung pro Quartal auf die Stimmung: 0, +1 oder +3. Wer eine laufende Dividende senkt, verliert einmalig 8 Punkte. Damit steht Kasse gegen Ruhe.

**Hauptversammlung:** Einmal im Jahr als kurzer Moment (Saal, Abstimmung, Schlagzeile). Sie zeigt Stimmung und Jahreszahlen. Liegt die Stimmung unter 30, stellt sie eine Forderung als Pflicht-Entscheidung.

**Was bewusst fehlt:** keine Analystenschätzung, keine eigene Prognose, kein Orderbuch, kein Handel mit fremden Aktien. Die Spannung „Quartal liefern oder langfristig bauen“ entsteht allein durch die sichtbare Zielmarke.

Die Börse ist damit ein Spätspiel-Werkzeug für große Firmen: viel Geld und schnellere Übernahmen gegen Druck in jedem Quartal.

**Auftragsarbeit und Deals (nach Vorbild von Software Inc.):** Gerade am Anfang lebt ein Studio oft von Aufträgen anderer Firmen. Aufträge kommen als Angebote mit Bezahlung, Frist und Qualitätsanforderung; ihre Zahl und Größe hängen vom Ruf ab.

| Auftrag | Wer gebraucht wird | Gegenleistung | In 1.0 |
| --- | --- | --- | --- |
| Port eines fremden Spiels | Programmierer | Festpreis, Plattform-Erfahrung | ✅ |
| Grafik- oder Sound-Auftrag | Grafiker, Sound | Festpreis | ✅ |
| QA für ein fremdes Spiel | QA | Festpreis, kurze Laufzeit | ✅ |
| Engine-Anpassung für einen Lizenznehmer | Engine-Team | Festpreis, höhere Kundenbindung | ✅ |
| Co-Entwicklung | gemischtes Team | Festpreis + Umsatzbeteiligung | nach 1.0 |
| Server-Hosting für fremde Online-Spiele | Betrieb | Laufende Einnahmen pro Kapazität | nach 1.0 |

Verpasste Fristen oder schlechte Qualität kosten Ruf und verringern künftige Angebote.

## Übernahmen und Konzern

Übernahmen sind ein eigenes Spielsystem mit Unsicherheit, Finanzierung, Genehmigung, Integration und Ausstieg. Der Spieler kann jede Firma kaufen, auch Publisher, Engine-Anbieter und Konsolenhersteller, aber jeder Kauf hat Folgen über Jahre. Die realen Vorbilder stehen im Tab Analyse: Übernahmen.

**Umfang in Version 1.0:** Komplettkauf mit Prüfung ja oder nein, Finanzierung per Bargeld oder Kredit, Integrationskapazität, Halteprämien und drei Vorgaben (Autonomie, Genres und Marken, Budget). Alles Weitere in diesem Abschnitt (weitere Beteiligungsformen, Aktien als Kaufpreis, Earn-outs, Behörde mit Auflagen, Zielklauseln, Ausgliederung, Management-Buyout, feindliche Übernahmen) folgt nach 1.0.

**Beteiligungsformen** (● hoch, ○ niedrig; in 1.0 nur der Komplettkauf, die übrigen Formen nach 1.0):

| Form | Kontrolle | Kosten | Integrationsaufwand | Sinnvoll für |
| --- | --- | --- | --- | --- |
| Partnerschaft / Co-Publishing | ●○○○ | ●○○○ | ○○○○ | Eine Firma testen, bevor man sie kauft |
| Minderheitsbeteiligung | ●○○○ | ●○○○ | ○○○○ | Dividende, Einblick, Vorkaufsrecht |
| Mehrheitsbeteiligung | ●●●○ | ●●○○ | ●○○○ | Steuerung zum geringeren Preis; Minderheitsaktionäre reden mit |
| Komplettkauf | ●●●● | ●●●○ | ●●●○ | Volle Kontrolle über Marken, Engines und Team |
| Fusion | ●●●○ | ●●○○ (Aktien statt Geld) | ●●●● | Zwei ähnlich große Firmen; Führung wird geteilt |
| Kauf einzelner Werte | ●●●● über das Gekaufte | ●○○○ bis ●●○○ | ●○○○ | Nur eine Marke, eine Engine oder ein Team übernehmen |

&#91;embedded content: Ablauf einer Übernahme · 7 Schritte\]

**Bewertung und Prüfung:** Der Spieler sieht zunächst nur eine geschätzte Spanne für den Wert einer Firma. Eine Prüfung (Due Diligence) kostet Zeit und Geld und deckt verborgene Punkte auf: Schulden, ein Projekt in Schieflage, wechselwillige Schlüsselpersonen, laufende Rechtsstreitigkeiten. Wer ohne Prüfung kauft, spart Zeit, riskiert aber böse Überraschungen.

```latex
\text{Preis} = (\text{Ertragswert} + \text{Marken} + \text{Technik} + \text{Team}) \cdot (1 + \text{Kontrollprämie} + \text{Bieterkampf})
```

Je mehr andere Bieter interessiert sind, desto höher der Aufschlag. Liegt der Kaufpreis weit über dem späteren Wert, muss der Spieler den Unterschied abschreiben; das drückt Gewinn, Aktienkurs und Kreditwürdigkeit.

**Finanzierung:**

- **Bargeld:** sicher, aber es fehlt danach für eigene Projekte.
- **Eigene Aktien:** (nach 1.0) schont das Geld, verwässert aber den eigenen Anteil (nur nach einem Börsengang).
- **Kredit:** schnell, aber mit Zinsen und Bedingungen. Verfehlt der Konzern vereinbarte Kennzahlen, drohen Zwangsverkäufe und Sparprogramme.
- **Investoren:** Externe Geldgeber können Zusagen kurzfristig zurückziehen. Wer darauf baut, braucht einen Plan B.

**Angebot und Verhandlung:** Neben dem Preis verhandelt der Spieler am Verhandlungstisch (siehe Oberfläche) Halteprämien für Schlüsselpersonen und Zusagen wie Autonomie oder den Erhalt eines Standorts; Earn-outs (Teile des Preises fließen erst, wenn Ziele erreicht werden) kommen nach 1.0. Gebrochene Zusagen kosten später Ruf und Moral. KI-Firmen können Gegenangebote machen; die Zielfirma kann ablehnen oder einen anderen Käufer suchen.

**Wettbewerbsbehörde:** Nach 1.0: Ab einem bestimmten Marktanteil in einem Bereich (Plattformen, Publishing, Engines, ein Genre) prüft eine Behörde den Kauf. Mögliche Ergebnisse:

| Ergebnis | Beispiel |
| --- | --- |
| Freigabe | Kleiner Marktanteil |
| Freigabe mit Auflagen | Rechte an Dritte abgeben, eine Marke für eine Frist auf allen Plattformen halten, einen Teil der Firma verkaufen |
| Verzögerung | Vertiefte Prüfung über Monate; der Kauf kann in dieser Zeit platzen |
| Verbot | Marktbeherrschung; der Spieler kann ein neues Angebot mit Zugeständnissen machen |

Auflagen sind bindend: Verstößt der Spieler dagegen, folgen Strafen.

**Integration:** In den ersten Monaten nach dem Kauf entscheidet sich, ob er sich lohnt.

- **Integrationskapazität:** Die Konzernführung kann nur eine begrenzte Zahl von Integrationen gleichzeitig betreuen. Wer mehr kauft, riskiert Chaos: sinkende Moral, verpasste Termine, Abwanderung.
- **Kulturpassung:** Jede Firma hat eine Kultur (z. B. kreativ und unabhängig, effizient und zahlengetrieben). Passt sie schlecht zum Käufer, verläuft die Integration schwieriger.
- **Schlüsselpersonen:** Wichtige Entwickler haben eine Wechselneigung; Halteprämien, Autonomie und gute Behandlung senken sie.
- **Synergien:** Gemeinsame Engine, QA, Marketing und Vertrieb senken Kosten, wirken aber erst nach einer Anlaufzeit. Doppelte Abteilungen kosten bis zur Zusammenlegung.

**Geld und Technik zwischen Mutter und Tochter:**

- Jede Tochter hat ein eigenes Konto. Quartalsweise führt sie einen einstellbaren Anteil ihres Gewinns an die Mutter ab (Standard 70 %); der Rest bleibt für ihre Projekte im Rahmen der Budgetvorgabe. Die Mutter kann Kapital zuschießen. Verluste der Tochter treffen die Mutter erst, wenn das Konto der Tochter leer ist.
- Eine gekaufte Engine steht den eigenen Teams sofort zur Verfügung, aber mit null Erfahrung: Wie bei der Plattform-Erfahrung arbeiten sie zuerst langsamer (Tempo −30 %, sinkt über 8–16 Wochen auf null). Teams der Tochter lassen sich als Mentoren abstellen und verkürzen die Einarbeitung.
- Marken der Tochter kann die Mutter nutzen; Rechte und Erlöse folgen der Vorgabe „Genres und Marken“.

**Vorgaben an Tochterstudios:**

| Vorgabe | Beispiele |
| --- | --- |
| Autonomie | Selbstständig, mit Rahmenvorgaben oder voll gesteuert |
| Genres und Marken | Nur Action, nur eigene Marken, Ableger der Marke X |
| Plattformen | Alle Plattformen, nur eigene Konsole, zeitexklusiv |
| Engine | Konzern-Engine Pflicht oder freie Wahl |
| Budget und Umfang | Maximales Budget pro Projekt, Indie bis AAA |
| Geschäftsmodell | Kein F2P, Live-Service erlaubt, Abo-Deals erlaubt |
| Ziele | Umsatzziel, Mindestwertung, Release-Rhythmus |
| Personal | Einstellungsstopp, Austausch zwischen Studios, kein Crunch |

In 1.0 gibt es drei Vorgaben (Autonomie, Genres und Marken, Budget und Umfang), die übrigen nach 1.0. Je enger die Vorgaben, desto berechenbarer das Studio, aber desto geringer Moral und Kreativität. Selbstständige Studios überraschen eher positiv und negativ.

**Zielklauseln:** Nach 1.0: Statt fester Vorgaben kann der Spieler Autonomie an Ziele knüpfen. Erreicht das Studio sie, bleibt es selbstständig; verfehlt es sie, geht die Kontrolle automatisch stärker an den Konzern über.

**Reorganisation und Ausstieg (in 1.0 nur Schließen, alles andere nach 1.0):**

- **Zusammenlegen:** Zwei Studios werden eines; spart Kosten, kostet Moral und eventuell eine Marke.
- **Verschieben:** Teams oder Projekte wechseln zwischen Studios.
- **Verkaufen:** An KI-Firmen oder Investoren, ganz oder in Teilen.
- **Ausgliedern:** Ein Studio wird wieder eigenständig oder an die Börse gebracht; der Spieler kann Anteile behalten.
- **Management-Buyout:** Die Studioleitung kauft ihr Studio zurück; bringt Ruf und meist einen fairen Preis.
- **Schließen:** Spart sofort Kosten, kostet aber deutlich Ruf, besonders bei einem Studio mit erfolgreichen Spielen. Marken und Engines bleiben im Konzern.

**Plattformhersteller bleiben aktiv:** Kauft der Spieler einen Konsolenhersteller, laufen dessen Plattformen unverändert weiter. Geplante Nachfolger erscheinen wie vorgesehen, und der Lebenszyklus folgt weiterhin den Marktregeln (siehe Markt). Der Spieler kann Einfluss nehmen, etwa auf Preis, Exklusivtitel oder Lizenzgebühren, soweit keine Behördenauflage dagegensteht. Eine geplante Konsole fällt nur weg, wenn er sie ausdrücklich manuell einstellt; dafür gibt es einen eigenen Befehl mit Rückfrage, der die Folgen für Ruf, Lizenznehmer und Studios dieser Plattform anzeigt.

**KI-Firmen kaufen auch:** KI-Konzerne verfolgen eigene Übernahme-Strategien und können sich dabei auch übernehmen. Nach 1.0 kann die Firma des Spielers, wenn sie an der Börse ist, selbst Ziel einer feindlichen Übernahme werden. Schutz bieten ein großer eigener Aktienanteil, gute Ergebnisse oder ein befreundeter Käufer.

**Balancing:** Übernahmen dürfen keine Abkürzung sein. Kontrollprämie, Integrationskosten, Abwanderung und Kreditrisiko sorgen dafür, dass sich ein Kauf nur mit Plan lohnt. In den Simulationsläufen wird zusätzlich gemessen, wie oft Konzerne an zu vielen Käufen zerbrechen; das sollte vorkommen, aber nicht die Regel sein.

## Markt und KI-Konkurrenz

Der Markt ist eine eigene Simulation, die auch ohne den Spieler weiterläuft. KI-Studios und KI-Publisher nutzen dieselben Regeln wie der Spieler und haben keine versteckten Vorteile. **Ausnahme Plattformhersteller:** Sie folgen einer eigenen Ökonomie (Hardware-Verkauf, Lizenzgebühren, Generationen) und sind daher Marktakteure mit eigenen Regeln, keine Spielerkopien. Auch ihre Regeln sind im Spiel einsehbar.

**Plattformen:**

- Jede Plattform hat Erscheinungsjahr, Leistungsklasse, installierte Basis, Lizenzgebühr und Lebenszyklus (Wachstum, Höhepunkt, Niedergang).
- Spiele verkaufen sich anteilig zur aktiven Basis; eine sterbende Plattform zieht ihre Spiele mit.
- Fiktive Namen mit Anlehnung an echte Geschichte (Heimcomputer, Konsolen-Generationen, Handhelds, PC, Mobile, Cloud). Alle Plattformdaten kommen aus Datendateien und sind modbar.
- Später: eigene Plattform oder eigener digitaler Shop als Ausbau.

**Technischer Fortschritt der Plattformen:**

- Jede Plattform hat ein Leistungsprofil: Rechenleistung, Grafik, Speicher, Datenträger (Modul, Diskette, CD, DVD, Blu-ray, Download), Online-Fähigkeit und Eingabegeräte.
- Der Stand der Technik steigt jedes Jahr. **Konsolen** sind beim Erscheinen festgelegt und fallen dadurch Jahr für Jahr zurück. **PCs** entwickeln sich laufend weiter.
- Optional (Schalter in den Einstellungen, Standard aus): Die PC-Basis ist in Leistungsklassen geteilt (Einstieg, Mittelklasse, High-End). Die Mindestanforderungen eines Spiels bestimmen, welchen Anteil des PC-Markts es erreicht: Wer nur High-End anspricht, hat die beste Grafik, aber den kleinsten Markt.
- Ein Spiel kann nur Features nutzen, die sowohl die Engine als auch die Plattform beherrschen. 3D braucht ein 3D-Modul in der Engine und eine 3D-fähige Plattform.
- **Plattform-Erfahrung:** Jedes Studio sammelt pro Plattform Erfahrung mit jedem veröffentlichten Spiel. Erfahrung holt mehr aus der festen Hardware heraus, sodass späte Spiele einer Konsolengeneration besser aussehen als frühe.
- Ports auf schwächere Plattformen kosten Anpassungsaufwand und senken die Grafikqualität; ist der Abstand zu groß, ist der Port unmöglich.
- Neue Generationen werden ein bis zwei Jahre vorher angekündigt. Studios mit guten Beziehungen zum Hersteller bekommen früher Devkits und können zum Start fertig sein. Abwärtskompatibilität hält Teile der alten Basis aktiv.

**Dynamischer Lebenszyklus:** Wie lange eine Plattform lebt, steht nicht fest. Sie lebt so lange, wie Menschen sie kaufen und nutzen wollen, und das hängt vor allem an ihren Spielen.

Jeden Monat berechnet die Simulation die Attraktivität A jeder Plattform und daraus die Veränderung der aktiven Basis B:

```latex
A = a_1 \cdot \text{Hits}_{12} + a_2 \cdot \text{Bibliothek} - a_3 \cdot \text{Preis} - a_4 \cdot \text{Rückstand}
```

```latex
B_{t+1} = B_t + \max(0,\ M - B_t) \cdot m \cdot \max(0, A) - B_t \cdot \text{clamp}\big(d_0 + d_1 \cdot \text{Rückstand} - d_2 \cdot \text{Hits}_{12},\ d_{min},\ d_{max}\big)
```

Neukäufer kommen nur aus dem noch nicht erreichten Markt (M − B) und nur bei positiver Attraktivität; m ist die monatliche Kaufrate. Der Schwund ist nach unten und oben begrenzt (Startwerte d\_min = 0,002 und d\_max = 0,15 pro Monat). So bleibt die Basis immer zwischen null und der Marktgröße: Viele Hits bremsen den Schwund, erzeugen aber kein Wachstum aus sich selbst heraus.

**Start und Ende einer Plattform:** In den ersten zwölf Monaten trägt ein Launch-Hype die Attraktivität; er fällt linear auf null, und der Hersteller bringt eigene Launch-Titel mit. Erscheint der Nachfolger, springt der Schwund um die Hälfte. Eine Plattform, deren Basis nach 24 Monaten unter 2 % der Marktgröße liegt, gilt als Flop und wird eingestellt. Zielkorridor: Erfolge laufen 8–15 Jahre, Flops 2–4 Jahre.

- Hits₁₂ = Qualität und Anzahl starker Spiele der letzten zwölf Monate, egal ob vom Spieler oder von KI-Studios. Ein Hit wirkt stark und klingt über ein Jahr ab.
- Bibliothek = Größe und Qualität des gesamten Spielekatalogs.
- Rückstand = Abstand der Leistung zum aktuellen Stand der Technik und zur Nachfolgegeneration.
- M = Marktgröße der Zielgruppe; d₀ = natürlicher Schwund.
- Erscheinen für eine alte Konsole weiterhin hervorragende Spiele, gleichen die Hits den wachsenden Rückstand aus: Die Basis schrumpft langsamer oder wächst sogar wieder.

**Reaktion der Hersteller:** Hersteller sind KI-Akteure und reagieren auf diese Zahlen.

- Läuft eine Konsole dank starker Spiele gut, senkt der Hersteller den Preis, bringt ein günstigeres Modell heraus oder verschiebt den Nachfolger.
- Fällt die Basis unter eine Schwelle, stellt der Hersteller Produktion und Lizenzvergabe ein. Danach verkaufen sich neue Spiele für die Plattform kaum noch.
- Der Rückstand wächst unaufhaltsam. Selbst die besten Spiele verlängern das Leben einer Konsole daher um Jahre, nicht um Jahrzehnte.

**Folgen für den Spieler:**

- Eine alte Konsole kann eine bewusste Strategie sein: wenig Konkurrenz, günstige Entwicklung, viel Plattform-Erfahrung und eine treue Basis.
- Der Spieler kann eine Plattform mit eigenen Hits gezielt am Leben halten, etwa wenn er dort eine starke Marke oder einen Exklusivvertrag hat.
- Engines, die ältere Plattformen weiter unterstützen, bleiben im Lizenzmarkt länger wertvoll.
- Dieselben Regeln gelten später für eine eigene Konsole des Spielers: Ohne starke Spiele, eigene oder fremde, stirbt sie früh.

**Vertrieb:** Jeder Store behält einen Anteil, real 12–30 %, teils gestaffelt nach Umsatz. Regionale Preise und Rückerstattungen senken den Erlös weiter; Rückerstattungen steigen bei kurzen oder fehlerhaften Spielen. Für Konsolen-Releases gilt eine Zertifizierung, die bei zu vielen Bugs scheitert und den Termin verschiebt.

**Piraterie und Kopierschutz:** Ein Teil der möglichen Käufer kopiert ein Spiel, statt es zu kaufen. Wie groß dieser Teil ist, hängt von Epoche, Plattform und Kopierschutz ab.

| Schutz | Epoche | Wirkung | Kehrseite |
| --- | --- | --- | --- |
| Keiner | immer | – | Volle Piraterie-Rate |
| Handbuch- oder Codeabfrage | 1980er | Schwach, lange haltbar | Kaum Ärger |
| Datenträger-Schutz | 1990er | Mittel | Probleme mit manchen Laufwerken, kleiner Zufriedenheitsverlust |
| Online-Aktivierung | ab 2000er | Stark in den ersten Wochen | Zufriedenheit sinkt, Lizenzgebühr bei Middleware |
| Ständige Online-Pflicht | ab 2010er | Sehr stark | Deutlicher Zufriedenheitsverlust, Ereignis „DRM-Protest“ möglich, kostet Leistungsbudget |
| Store-Schutz der Plattform | ab 2005 | Schwach, aber ohne Kosten | – |

- **Formel:** Piraterie-Rate = Grundrate der Epoche × Plattformfaktor (PC hoch, Konsolen und Handhelds niedrig, Online-Spiele, F2P und Live-Service fast null) × (1 − Schutzwirkung). Die Grundrate sinkt mit dem Digitalvertrieb.
- **Schutz wird geknackt:** Die Schutzwirkung fällt nach einigen Wochen stark ab. Kopierschutz schützt also vor allem das Verkaufsfenster am Anfang.
- **Nach dem Start entfernen:** Ein Patch kann den Schutz später entfernen; das bringt Zufriedenheit zurück und kostet kaum noch Verkäufe.
- **Kleiner Nebeneffekt:** Kopien steigern die Bekanntheit einer Marke leicht.
- **Entscheidung:** Einmal pro Release auf dem Release-Bildschirm, mit Vorschlag aus Epoche und Plattform; per Regel delegierbar. Alle Werte stehen in Datendateien.

**Trends:** Jedes Genre und Thema hat eine Beliebtheit, die langsam schwankt. Erfolgreiche Spiele lösen kurze Wellen aus; Übersättigung durch zu viele ähnliche Spiele drückt sie wieder. Kundengruppen wachsen über die Jahrzehnte unterschiedlich (z. B. Gelegenheitsspieler mit Mobile). Die Beliebtheit bewegt sich jeden Monat ein wenig zufällig und kehrt langsam zum Mittel zurück. Trends wirken auf Verkäufe, auf die Wertung nur als Zeitgeist (±0,3).

**KI-Studios:**

| Eigenschaft | Bedeutung |
| --- | --- |
| Persönlichkeit | Indie, Mittelklasse, AAA, Engine-Spezialist, Publisher; legt Gewichte für Entscheidungen fest |
| Lieblingsgenres | Wo das Studio stark ist und bleibt |
| Geld und Teams | Begrenzen Umfang und Anzahl der Projekte |
| Risiko | Wie oft es neue Marken statt Sequels wagt |
| Engine-Strategie | Lizenziert, baut eigene oder wechselt nach Nutzwert (siehe Lizenzmarkt) |

KI-Studios wachsen, schrumpfen, werden gekauft, fusionieren oder gehen pleite. Neue Studios gründen sich, wenn ein Markt boomt. Eine Rangliste zeigt Umsatz, Marktanteil und Ruf aller Firmen.

**KI und die neueren Systeme:** KI-Studios nutzen jedes System, das auch der Spieler hat. Für die neueren Systeme gelten diese Regeln:

| System | Wie die KI entscheidet |
| --- | --- |
| Büro und Ausstattung | Zieht um, wenn das Büro zu 95 % belegt ist und Kaution plus sechs Monatsmieten des neuen Grundrisses vorhanden sind; kauft Ausstattung passend zur Persönlichkeit (AAA-Studio: Motion-Capture, Indie: Komfort) |
| Devkits | Bewirbt sich, wenn die Beziehung zum Hersteller mindestens „gut“ ist und ein passendes Projekt geplant ist; Plattform-Partner-Rivalen nehmen Launch-Deals fast immer an |
| Engine-Anforderungen | Bestellt eine Modulstufe, wenn sie für ein geplantes Feature fehlt und vor dem Feature-Freeze fertig werden kann; sonst streicht sie das Feature |
| Preisaktionen | Folgt einer festen Preiskurve je Persönlichkeit; Marken-Fabriken rabattieren seltener als Indie-Studios |
| Kopierschutz | Wählt die stärkste verfügbare Stufe bei PC-Spielen mit hohem Interesse, sonst den Store-Schutz |
| Projektabbruch | Bricht am Vertical Slice ab, wenn die Prognose mehr als 1,5 Punkte unter der eigenen Mindestwertung liegt und weniger als die Hälfte des Budgets ausgegeben ist; sonst verkleinert sie den Umfang um eine Stufe |
| Technik-Update | Hebt Live-Spiele an, sobald sie zwei Engine-Versionen zurückliegen und die Spielerbasis groß genug ist |

Die genauen Schwellen stehen in der Spezifikation S08 und in den Datendateien.

**Ereignisse:** Zufällige und historische Ereignisse mit klaren Folgen: Marktcrash, neue Plattform-Generation, Jugendschutz-Debatte, Hardware-Knappheit, Abwerbeangebote, Leaks und Skandale. Jedes Ereignis bietet dem Spieler wenn möglich eine Entscheidung statt nur einer Meldung.

### Rivalen

Die KI arbeitet in zwei Schichten. Alle Studios folgen einer einfachen Heuristik aus Persönlichkeit und Nutzwert. **Drei bis fünf benannte Rivalen** haben eine tiefere Strategie und eine Beziehung zum Spieler; sie machen die Konkurrenz erlebbar.

| Eigenschaft | Bedeutung |
| --- | --- |
| Gründer oder Chef | Name, Porträt, Charakter (z. B. Tech-Visionär, Zahlenmensch, Kreativer) |
| Archetyp | Engine-Riese, Marken-Fabrik, Indie-Liebling, Plattform-Partner, Aufkäufer |
| Ziele | Was der Rivale in den nächsten Jahren erreichen will (z. B. Marktführer im Rollenspiel) |
| Beziehung zum Spieler | Respekt, Groll oder Partnerschaft; verändert sich durch Ereignisse |
| Gedächtnis | Merkt sich Abwerbungen, Release-Duelle, Lizenzverhandlungen, Übernahmen |

**Was Rivalen tun:**

- **Release-Duelle:** Sie legen große Titel gezielt auf die Woche des Spielers oder weichen aus. Ein Rivale verschiebt höchstens einmal pro Titel und verliert dabei wie der Spieler 10 % Interesse.
- **Abwerben:** Sie machen Schlüsselpersonen des Spielers Angebote, besonders bei Groll. Umgekehrt kann der Spieler selbst abwerben: ein Angebot an eine KI-Schlüsselperson mit 20–40 % mehr Gehalt; die Chance hängt an ihrer Loyalität und am eigenen Ruf als Arbeitgeber, der Preis ist sichtbarer Groll des Rivalen.
- **Engine-Kampf:** Ein Engine-Rivale senkt Preise, wenn der Spieler Kunden gewinnt, oder lockt mit Quellcode-Zugang.
- **Angebote:** Bei Respekt bieten sie Kooperationen, Co-Publishing oder Lizenzen zu Freundschaftspreisen an.
- **Übernahmen:** Ein Aufkäufer-Rivale bietet um dieselben Firmen wie der Spieler und kauft ihm Übernahmeziele weg. Einen Angriff auf die Firma des Spielers selbst gibt es erst mit feindlichen Übernahmen nach 1.0.
- **Nachrichten:** Ihre Entscheidungen erscheinen als Schlagzeilen („Nova Interactive sichert sich Exklusivrechte an der nächsten Konsole“).

Rivalen können aufsteigen, scheitern oder gekauft werden; dann rückt ein neues Studio in die Rolle. So bleibt die Konkurrenz über 60 Jahre persönlich.

### KI-System und Schwierigkeit

Die Konkurrenz soll sich wie eine Branche voller Menschen anfühlen: Firmen mit Chefs, Zielen und Eigenheiten, die kluge Züge machen, sich irren und auf den Spieler reagieren. Dabei gilt eine feste Regel: **Die KI spielt nach denselben Zahlen wie der Spieler.** Schwierigkeit macht sie klüger und angriffslustiger, nie reicher. Spezifikation: S14 KI-System.

**Drei Ebenen des Denkens:**

| Ebene | Takt | Was entschieden wird |
| --- | --- | --- |
| Strategie | einmal im Jahr, eigene Strategiekonferenz | Ziele, zwei Schwerpunkt-Genres, Engine-Kurs, Plattform-Wette, Budget für Projekte, Engine, Marketing, Übernahmen und Rücklage |
| Taktik | monatlich | Projekte, Engine-Arbeit, Lizenzen, Marken, Personal, Finanzen, Übernahmen |
| Reaktion | wöchentlich bei Anlass | Release-Termine, Preise, Krisen, Antworten auf Spielerzüge |

Jede Entscheidung läuft gleich ab: Die Firma schaut auf den Markt, so wie sie ihn sieht, sammelt Möglichkeiten, bewertet sie nach ihren Gewichten und wählt, meist die beste, manchmal die zweitbeste, manchmal aus dem Bauch.

**Was eine KI-Firma ausmacht:**

- **Wissen:** Sie kennt nur öffentliche Informationen (Wertungen, Charts, Ankündigungen, Messen), und das mit einem Wahrnehmungsfehler. Pläne des Spielers kennt sie nie.
- **Ziele:** Jeder Rivale verfolgt ein bis zwei Ziele mit Frist, etwa „Genre-Führer im Rollenspiel“, „Engine-Imperium“, „Kritikerliebling“ oder bei tiefem Groll „Den Spieler schlagen“. Ziele lenken seine Entscheidungen und sind für den Spieler sichtbar, wenn er gute Beziehungen, Analytics oder Gerüchte hat.
- **Pläne:** Engine-Generationen werden auf die nächste Konsolengeneration hin geplant, Marken bekommen einen Takt mit Pausen, und eine Plattform-Wette bestimmt die Devkit-Bewerbungen.
- **Lernen:** Jeder Release, auch der des Spielers, verschiebt die Überzeugungen der Firma über Genres und Plattformen. Wer nicht lernt, verpasst Trendwechsel sichtbar.
- **Charakter:** Der Chef eines Rivalen hat zwei Charakterzüge (Visionär, Zahlenmensch, Perfektionist, Draufgänger, Diplomat, Nachtragend, Sparsam, Showman) und eine Stimmung. Daraus entstehen plausible Fehler: der Showman überhypt, der Zahlenmensch melkt die Marke, der Perfektionist verschiebt. Nach zwei verfehlten Zielen kann der Chef gehen; der Nachfolger ändert den Kurs.

**Wie die KI auf den Spieler reagiert:** Jede größere Firma misst, wie stark der Spieler ihre Ziele bedroht, getrennt nach Genre, Engine-Markt, Plattform, Übernahmen, Personal und Marken. Wird die Bedrohung groß, wählt sie Gegenzüge: Konkurrenztitel zum gleichen Termin, Preissenkung der Engine, Exklusivdeal, Gegengebot, Abwerbeangebot, Gebot auf eine begehrte Marke. Gegenzüge sind gedeckelt, kosten die KI dasselbe wie den Spieler und erscheinen immer offen im Ticker. Landet der Spieler einen Hit, kündigen Nachahmer nach einigen Monaten ähnliche Spiele an; erscheinen sie zu früh, wirken sie wie ein Abklatsch, und das Original gewinnt an Fanbindung.

**Lesbarkeit:** Jede Rivalen-Schlagzeile hat ein „Warum?“ mit den drei stärksten Gründen („Rollenspiele sind Novas Schwerpunkt“, „Dein Erfolg bedroht Novas Ziel“, „Bauchgefühl des Chefs“). Die Rivalen-Karte zeigt Chef, Charakterzüge, Stimmung, Ziel, Beziehung und die letzten Züge.

**Anpassung an die Schwierigkeit** über zwei Achsen, Kompetenz (wie gut die KI entscheidet) und Aggressivität (wie sehr sie sich gegen den Spieler richtet):

|  | Entspannt | Leicht | Normal | Schwer | Hardcore |
| --- | --- | --- | --- | --- | --- |
| Blick auf den Markt | unscharf (±30 %) | ±20 % | ±12 % | ±6 % | fast exakt (±3 %) |
| Lernt aus Releases | nein | langsam | ja | schnell | sehr schnell |
| Reaktion auf Spielerzüge | nach 16 Wochen | 10 Wochen | 6 Wochen | 3 Wochen | 1 Woche |
| Plant voraus | 1 Jahr | 2 Jahre | 3 Jahre | 4 Jahre | 5 Jahre |
| Bauchentscheidungen | 25 % | 15 % | 10 % | 5 % | 2 % |
| Gegenzüge je Firma und Jahr | keine | 1 | 2 | 3 | 4 |
| Nachahmer je Hit | keine | höchstens 1 | 2 | 3 | 4 |
| Rivalen und Startstärke | 3, etwas kleiner | 3 | 4 | 5, etwas größer | 5, größer und mit Zusatzmarke |
| Ausgleich | sanft | sanft | aus | aus | aus |

Unter „Eigen“ lassen sich Kompetenz, Aggressivität, Zahl der Studios und Ausgleich getrennt einstellen. Wer eine kluge, aber friedliche Konkurrenz will, wählt hohe Kompetenz und niedrige Aggressivität.

**Ausgleich (optional, ohne Zahlentricks):** Zieht der Spieler weit davon (doppelt so viel Umsatz wie die beste KI über zwei Jahre), formiert sich die Branche: Rivalen spielen eine Stufe stärker, stimmen Termine ab und fusionieren eher. Liegt ein Einsteiger auf Entspannt oder Leicht weit zurück, lässt ihm die Konkurrenz Luft und verzichtet auf Gegenzüge. Beides wird angezeigt und sperrt keine Erfolge.

**Messlatte:** In Simulationsläufen landet ein solider Referenz-Bot bis 2010 unter den Top 3 in 85–95 % der Läufe auf Entspannt, 45–55 % auf Normal und 10–20 % auf Hardcore. Gleichzeitig gehen auf jeder Stufe je Jahrzehnt 5–20 % der KI-Studios pleite, damit der Markt lebendig bleibt.

### Plattformbeziehungen

Zu jedem Plattformhersteller hat der Spieler einen Beziehungswert von 0 bis 100.

| Steigt durch | Sinkt durch |
| --- | --- |
| Hits auf der Plattform | Flops und schwache Versionen |
| Exklusiv- und Zeitexklusivtitel | Exklusivdeals mit der Konkurrenz |
| Hohe Zertifizierungsquote | Mehrfach gescheiterte Zertifizierung |
| Unterstützung zum Konsolenstart | Früher Rückzug von der Plattform |

| Beziehung | Nutzen |
| --- | --- |
| Gut | Frühe Devkits (Spiele zum Konsolenstart möglich), Plätze im Showcase des Herstellers |
| Sehr gut | Geringere Lizenzgebühren, Angebote für Exklusivdeals und Marketing-Unterstützung |
| Schlecht | Späte Devkits, strengere Zertifizierung, keine Showcase-Plätze |

Der Wert verbindet Plattformen, Marketing und Exklusivität: Wer einem Hersteller treu ist, bekommt Vorteile, verliert aber Spielraum bei den anderen.

**Konto der Plattformhersteller:** Jeder Hersteller rechnet mit Hardware-Marge × verkaufte Geräte + Lizenzgebühr × Spieleverkäufe. Zwei Jahre Verlust in Folge führen zum Rückzug-Ereignis (Plattform wird eingestellt oder verkauft). Gekaufte Hersteller bringen diesen Plattformwert in den Firmenwert ein.

### Devkits und Konsolenstart

Konsolen geben vor ihrer Veröffentlichung Entwicklergeräte (Devkits) an Partner heraus, damit zum Start Spiele bereitstehen. Ohne Devkit kann ein Projekt eine angekündigte Konsole nicht als Zielplattform wählen.

| Welle | Zeitpunkt | Wer bekommt sie | Bedingungen |
| --- | --- | --- | --- |
| 1 | 24–18 Monate vor Start | Eigene Studios des Herstellers und Partner mit sehr guter Beziehung | Kostenlos, mit Verschwiegenheitspflicht; oft an Launch-Deals geknüpft |
| 2 | 12–9 Monate vor Start | Studios mit guter Beziehung oder auf Antrag gegen Gebühr | Gebühr pro Team; der Hersteller prüft Ruf und Plattform-Erfahrung |
| 3 | ab Start | Alle Studios | Normale Lizenzgebühr |

- **Frühe Devkits sind unfertig:** Das Leistungsbudget der neuen Konsole ist anfangs nur als Spanne bekannt und kann sich bis zur endgültigen Hardware ändern (Ereignis „Hersteller senkt die Taktrate“: Budget minus 10 %). Plattform-Erfahrung beginnt bei null, deshalb sehen Launch-Spiele schwächer aus als spätere.
- **Launch-Titel lohnen sich:** wenig Konkurrenz, große Aufmerksamkeit, Marketing-Hilfe des Herstellers und ein Beziehungsbonus. Ein starker Launch-Titel zählt voll in die Attraktivität der Konsole (Hits₁₂) und hilft ihr ins Leben.
- **Risiken:** Die Basis ist zum Start noch klein, der Hersteller kann den Starttermin verschieben, und ein Launch-Titel, der den Start verpasst, kostet Beziehung.
- **Hersteller fragen aktiv an:** Ereignis „Der Hersteller sucht Launch-Titel“ mit Angebot (Zuschuss, Marketing, Zeitexklusivität). Ablehnen ist möglich, kostet aber etwas Beziehung.
- **Engines brauchen die Konsole auch:** Das Plattform-Modul der Engine muss die neue Konsole unterstützen; das ist eine Anforderung an das Engine-Team (siehe Engine und laufende Projekte). Wer sie früh erfüllt, gewinnt Lizenzkunden, die ebenfalls zum Start fertig sein wollen.
- **Zeitleiste:** Angekündigte Konsolen erscheinen mit Markern für die Devkit-Wellen. KI-Studios bekommen Devkits nach denselben Regeln.
- **Eigene Konsole (Ausbau):** Der Spieler verteilt dann selbst Devkits und entscheidet, wen er zum Start dabeihaben will.

### Krisen und Ereignisketten

Krisen und besondere Ereignisse sind kein Dauersystem, sondern Ketten mit Entscheidungen. Jede Kette hat einen Auslöser, zwei bis drei Antwortoptionen, mögliche Eskalation und Folgen für Ruf, Moral, Marke oder Geld.

| Ereigniskette | Auslöser | Antwortoptionen (Beispiele) |
| --- | --- | --- |
| Crunch-Enthüllung | Lange Crunch-Phasen | Entschuldigen und Regel ändern, schweigen, dementieren |
| Leak | Zufällig, häufiger bei großen Teams | Früher ankündigen, ignorieren, rechtlich vorgehen |
| Server-Ausfall zum Start | Zu wenig Kapazität | Entschädigung, Kapazität teuer erhöhen, aussitzen |
| Lootbox-Debatte | Aggressive Monetarisierung, ab den 2010ern | Abschaffen, abschwächen, verteidigen |
| Klon-Spiel | Erfolgreiches eigenes Spiel | Klagen, ignorieren, schneller nachlegen |
| Cheater-Welle | Online-Spiel ohne gutes Anti-Cheat | Anti-Cheat aufrüsten, Bann-Welle, nichts tun |
| Datenleck | Online-Dienste, ab den 2010ern | Offenlegen und entschädigen, still beheben |
| Verfilmungsangebot | Sehr starke Marke | Annehmen, ablehnen, Mitsprache verlangen |
| Konsolen-Ende | Hersteller stellt Plattform ein | Portieren, Spiel einstellen, Restbestand verkaufen |

Antworten haben verzögerte Folgen: Wer bei einem Leak schweigt, kann Wochen später von einer zweiten Welle getroffen werden. Die Dichte der Ereignisse ist einstellbar.

In 1.0 sind alle Ketten reine Ereignisse ohne eigenes System dahinter. Die Cheater-Welle setzt ein Online-Spiel voraus und hängt an der Anti-Cheat-Stufe im Modul Netzwerk, das Datenleck an Online-Diensten ab etwa 2010, das Verfilmungsangebot an einer sehr starken Marke. Dazu kommen die Ereignisse „DRM-Protest“ (Kopierschutz), „Update zerstört Mods und Spielstände“ (Technik-Update) und „Hersteller senkt die Taktrate“ (Devkits). Reicht die Zeit nicht, bleiben fünf Ketten (siehe Streichliste).

**Konkursmasse-Auktion:** Geht ein KI-Studio pleite, wird seine Konkursmasse versteigert: Marken und Engine mit Startpreis, zwei bis drei KI-Bieter, eine Woche Frist. Nicht verkaufte Marken landen danach auf dem Markenmarkt, das Team kommt als Angebot zum Spieler. So wird aus einer Pleite der Konkurrenz eine Gelegenheit statt einer Zeile in der Rangliste.

### Die Zukunftsepoche (2025–2040)

Ab der Gegenwart gibt es keine historischen Vorgaben mehr. Damit diese Phase nicht leer wirkt, erzeugt das Spiel aus dem Seed eine plausible Zukunft mit eigenen Wendepunkten.

| Bereich | Mögliche Entwicklungen |
| --- | --- |
| Technik | Neue Engine-Stufen (z. B. vollständig simulierte Welten, KI-gestützte Inhalte), neue Konsolengeneration oder ihr Ende zugunsten von Cloud-Gaming |
| Plattformen | VR/AR als Massenmarkt oder Nische, Streaming-Abos als Hauptvertrieb, neue Handhelds |
| Werkzeuge | KI-Werkzeuge mit Tempo-Bonus, aber Risiken für Ruf und Moral |
| Regulierung | Lootbox-Verbote, Abo-Regeln, Plattform-Auflagen in einzelnen Regionen |
| Markt | Konsolidierungswelle, Indie-Boom oder Krise, neue Zielgruppen |

Welche Entwicklungen eintreten, hängt vom Seed und teilweise vom Spieler ab: Wer stark in VR investiert, kann den Markt mitziehen. Dazu kommen Ziele, die nur in dieser Epoche möglich sind, etwa eine Marke als Film-Franchise oder die Stellung als größter Konzern der Branche.

**Ereignisketten der Zukunftsepoche** (je Seed treten mindestens zwei auf):

| Kette | Auslöser | Antwortoptionen |
| --- | --- | --- |
| KI-Werkzeug-Welle | Neue Werkzeuge machen Teams deutlich schneller | Voll einsetzen (Tempo, aber Moral und Ruf in Gefahr), maßvoll einsetzen, verzichten und „handgemacht“ als Marketing nutzen |
| Letzte Konsolengeneration | Ein Hersteller kündigt an, künftig nur noch über die Cloud zu liefern | Exklusivpartner der Cloud werden, plattformneutral bleiben, eigene Plattform aufbauen (Ausbau) |
| Regulierungswelle | Lootbox-Verbote und Abo-Regeln in einzelnen Regionen | Monetarisierung umbauen, Region verlassen, Regeln anfechten |

**Ziele nur für diese Epoche:** „Engine-Standard der Zukunft“ (2040 läuft die Hälfte aller neuen Spiele auf der eigenen Engine) und „Plattform der Zukunft“ (eine neue Plattform wie VR oder Cloud mit eigenen Hits zum Massenmarkt machen), zusätzlich zu Film-Franchise und größtem Konzern der Branche.

**Gerüchte-Vorphase:** Jeder große Wendepunkt kündigt sich zwei bis drei Jahre vorher im Ticker an, zunächst vage, mit Analytics genauer. Der Spieler kann eine Wette als Pin auf die Zeitleiste setzen („Bis 2032 kommt das Neuro-Interface“); bei Treffer gibt es Ruf und einen Eintrag in der Chronik.

### Boom und Krise

Der Markt läuft in Zyklen. In Boomphasen gibt es leicht Geld, Studios wachsen und kaufen zu; in Krisen sinken Budgets, Publisher setzen auf bewährte Marken und es gibt Entlassungswellen. Entlassungen sparen Kosten, senken aber Ruf und Moral der übrigen Mitarbeiter. Live-Service-Spiele scheitern häufig früh; ihre Nachfolger starten mit einem Malus.

## Wechselwirkungen und Balancing

Alle Systeme hängen an einem Kreislauf: Geld bezahlt Teams, Teams bauen Engine und Spiele, Verkäufe und Lizenzen bringen Geld zurück. Die Engine sitzt doppelt im Kreislauf, als Grundlage der eigenen Spiele und als Produkt für KI-Studios, die dadurch zu stärkeren Konkurrenten werden.

&#91;embedded content: Systemüberblick · 10 Bausteine, ein Geldkreislauf\]

Community-Zufriedenheit und Ruf wirken quer dazu: Sie verstärken oder bremsen Verkäufe, Sequels und Lizenzverlängerungen.

**Zentrale Spannungen, die das Balancing tragen muss:**

- Engine-Lizenzen bringen sicheres Geld, machen aber Konkurrenten stärker.
- Wartung kostet heute Teamzeit, Verzicht kostet später Qualität und Tempo.
- Live-Service bringt stetige Einnahmen, bindet aber Teams für Jahre.
- Hype steigert den Start, zu viel Hype bei schwacher Qualität beschädigt die Marke.
- Publisher-Deals senken das Risiko, kosten aber den Großteil des Gewinns.

**Alle Stellschrauben in Datendateien:** Gewichte, Kurven, Preise und Schwellen stehen nicht im Code, sondern in Konfigurationsdateien. So lässt sich balancieren, ohne Code anzufassen, und Mods werden später leicht.

**Automatische Simulationsläufe:** Ein Testmodus lässt das Spiel ohne Oberfläche 1980 bis 2040 durchlaufen, mit einfachen Bot-Strategien für den Spieler (nur Sequels, nur Lizenzen, nur MMOs, zufällig). Nach jedem Lauf entsteht ein Bericht.

**Kennzahlen pro Lauf:**

| Kennzahl | Gesund, wenn … |
| --- | --- |
| Insolvenzen der KI-Studios pro Jahrzehnt | einige, aber nicht die Mehrheit |
| Marktanteil des größten Studios | selten dauerhaft über ein Drittel |
| Anteil der Spiele mit Lizenz-Engine | schwankt über die Epochen |
| Ergebnis der Bot-Strategien | keine Strategie gewinnt in mehr als 60 % der Seeds |
| Durchschnittliche Wertung | bleibt über die Jahrzehnte stabil, steigt nicht endlos |
| Geld des Spielers über die Zeit | weder sofortiger Reichtum noch dauerhafter Mangel |

Weicht eine Kennzahl ab, wird nur an den Datendateien gedreht und der Lauf wiederholt.

**Zusätzliche Kennzahlen gegen tote Phasen:** Entscheidungsangebote pro Spieljahr, Anteil der Wochen ohne Entscheidung, Zahl der verschiedenen Entscheidungstypen (soll über die Jahrzehnte steigen) und der Pflicht-Entscheidungen (soll flach bleiben), Spannweite der Ergebnisse bei gleicher Strategie. Außerdem muss die Bot-Strategie „nie eine eigene Engine“ ebenso gewinnen können wie „immer eigene Engine“, mit spürbar anderem Verlauf. Für die Oberfläche gelten zwei Kennzahlen: Die Zahl der Klicks pro Spielwoche darf 2030 nicht höher sein als 2000, und ein Tester findet die Ursache eines Umsatzeinbruchs in unter 30 Sekunden.

### Spielerreise pro Jahrzehnt

Die Zielkorridore zeigen, wie ein guter Spieler auf „Normal“ typischerweise wächst. Simulationsläufe mit den Bot-Strategien sollen grob in diesen Korridoren landen; ein deutlich schnellerer oder langsamerer Verlauf ist ein Hinweis fürs Balancing.

| Jahrzehnt | Firmengröße | Büro | Vermögen | Typisches Geschäft | Neue Spannung |
| --- | --- | --- | --- | --- | --- |
| 1980er | 2–15 Personen | Garage → Etage | 50.000 bis 2 Mio. USD | 1–2 kleine Projekte gleichzeitig, Aufträge, erste eigene Engine | Erster Hit, Überleben |
| 1990er | 15–60 | Bürohaus | 2–20 Mio. | Eigene Engine mit ersten Lizenzen, erste Marke, Konsolen, 3D | Engine bauen oder lizenzieren? |
| 2000er | 60–200 | Eigenes Gebäude | 20–200 Mio. | Online und MMO, mehrere Plattformen, Produzenten, zweiter Standort | Live-Betrieb gegen neue Projekte |
| 2010er | 200–600 | Campus | 0,2–2 Mrd. | F2P und Live-Service, Analytics, Börse möglich, erste Übernahmen | Wachstum jedes Quartal |
| 2020er und später | 600–3.000 (Konzern) | mehrere Standorte | ab 2 Mrd. | Konzern mit Tochterstudios, Zukunftsepoche | Vorgaben, Integration, neue Plattformen |

### Entscheidungsbudget

Jedes neue System bringt Entscheidungen mit. Damit die Summe nicht überfordert, gilt ein Budget pro Spieljahr; die Simulationsläufe zählen mit.

| Epoche | Entscheidungsangebote pro Jahr | davon Pflicht | Typische Arten | Was delegiert oder vorgeschlagen wird |
| --- | --- | --- | --- | --- |
| 1980er | 15–25 | 8–10 | Projekt, Release, Auftrag, Umzug | kaum etwas |
| 1990er | 25–35 | 10–12 | + Engine, Lizenzen, Marken, Messe-Saison, Ausstattung | Lizenzen per Vorlage, Release per Vorschlag |
| 2000er | 30–40 | 10–12 | + Live-Betrieb, Plattformen, Devkits, Standorte | Produzenten, Betrieb per Regler |
| 2010er | 35–45 | 10–12 | + F2P, Analytics, Preisaktionen, Börse | Regeln für Patches, Preise, Kopierschutz |
| 2020er und später | 35–45 | 10–12 | + Konzern, Übernahmen, Zukunft | vollautomatische Tochterstudios |

- **Obergrenze:** höchstens ein Entscheidungsangebot pro Woche, also höchstens 52 im Jahr.
- **Pflicht** sind Entscheidungen, die ohne Antwort nicht weitergehen (Vertical Slice, Release bestätigen, Krisen). Ihre Zahl bleibt über alle Epochen flach; mit voller Delegation sinkt sie auf höchstens 8.
- **Neue Entscheidungen** aus Erweiterungen müssen in diese Tabelle passen: entweder ersetzen sie eine bestehende, oder sie kommen mit Vorschlag und Delegationsregel.

**Zwei Warteschlangen:** Die Obergrenze von einem Angebot pro Woche darf nichts Wichtiges verschlucken. Deshalb gibt es zwei getrennte Wege:

- **Projekt-Gates** (Vertical Slice, Release bestätigen, Zertifizierung gescheitert) hängen am Projekt. Sie zählen nicht gegen die Obergrenze; das Projekt wartet sichtbar („wartet auf deine Entscheidung“), bis der Spieler antwortet. Mit Produzent entscheidet dieser nach Vorgabe. Gates zählen weiter zu den Pflicht-Entscheidungen.
- **Welt-Ereignisse** (Krisen, Angebote, Anfragen, Devkits) kommen in eine Warteschlange mit Priorität und Verfallsdatum von zwei bis vier Wochen. Pro Woche rückt höchstens eines in den Fokus, das dringendste zuerst; Krisen haben Vorrang.
- Läuft ein Angebot ab, gilt die angezeigte Standardantwort (z. B. Devkit-Angebot abgelehnt), und der Wochenbericht nennt es. Nichts verschwindet unbemerkt.

## Konkurrenzanalyse

Kein bestehendes Spiel vereint ein tiefes Engine-Geschäft, Marken über Genres hinweg und Live-Betrieb ohne Bürobau. Jedes Vorbild hat aber eine Stärke, die das neue Spiel mindestens erreichen muss.

**Funktionen im Vergleich** (● stark, ◐ teilweise, – fehlt; Einschätzung aus der Recherche und Kenntnis der Spiele, nicht in jedem Detail geprüft):

| Funktion | Game Dev Story | Game Dev Tycoon | Mad Games Tycoon 2 | City Game Studio | Software Inc. | Gamebiz 3 | Dieses Spiel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Genre-Thema-Kombinationen | ● | ● | ● | ● | ◐ | ● | ● |
| Engine selbst bauen | – | ◐ | ● | ◐ | ● | – | ● |
| Engine lizenzieren (beide Richtungen) | – | – | ● | ● | ● | – | ● |
| Eigene Konsole | ● | ● | ● | ● | ◐ | ● | ◐ (Ausbau) |
| Viele Produkttypen (MMO, F2P, DLC …) | ◐ | ◐ | ● | ◐ | ◐ | ◐ | ● |
| Fremde Spiele veröffentlichen | – | – | ● | ● | – | ● | ◐ (nach 1.0) |
| Marken über mehrere Genres | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ● |
| Live-Service-Betrieb | – | ◐ | ◐ | ◐ | ◐ | – | ● |
| Automatisierung im Spätspiel | – | – | ◐ | ● | ◐ | – | ● |
| Mod-Unterstützung | – | ● | ◐ | ● | ● | – | ● |
| Bürobau | – | – | ● | ◐ | ● | – | ◐ feste Grundrisse statt Bau |

**Was übernommen werden muss:**

| Vorbild | Stärke | Umsetzung im Spiel |
| --- | --- | --- |
| Game Dev Story | Charme, kurze Erfolgserlebnisse, Ehrungen | Wertungs-Enthüllung als Moment mit Presse-Zitaten; Ruhmeshalle und Branchenpreise; Nachrichtenticker |
| Game Dev Tycoon | Lernen aus Berichten, klare Kombinationen | Nach jedem Spiel ein Bericht, was gut und schlecht passte; ein Wissensbuch, das sich mit Erfahrung füllt |
| Game Dev Tycoon | Riesige Mod-Szene | Alle Daten modbar, Workshop-Unterstützung ab Release, echte Namen als Mod statt im Spiel |
| Mad Games Tycoon 2 | Viele Produktformen | Zusätzlich GOTY-Editionen, Bundles, Budget-Neuauflagen und Retro-Spiele |
| Mad Games Tycoon 2 | Physische Produktion | Physische Auflage als eine Zahl pro Release bis etwa 2010 (zu wenig kostet Verkäufe, zu viel bringt Lager und Ramschpreise); danach wird digital wichtiger |
| Mad Games Tycoon 2 | Fanshop, Kopierschutz, Anti-Cheat | Merchandise aus Marken; Piraterie-Rate abhängig von Epoche, Plattform und Kopierschutz (siehe Markt); Anti-Cheat für Online-Spiele |
| City Game Studio | Engine-Royalties und Open Source | Bereits im Lizenzmarkt; zusätzlich klare Einnahmen-Anzeige pro Engine, deren Fehlen dort kritisiert wird |
| City Game Studio | Studio-Direktoren | Produzenten, die Projekte nach Vorgaben selbst führen; der Spieler steuert Strategie statt jedes Detail |
| City Game Studio | Devkits, Exklusivverträge, digitaler Store | Gehört zur eigenen Plattform im Ausbau |
| City Game Studio | Schwierigkeitsgrade bis Hardcore, Sandbox | Mehrere Schwierigkeitsgrade, frei wählbares Startjahr, Sandbox und Szenarien |
| Software Inc. | Features mit Abhängigkeiten, Frameworks | Bereits im Entwicklungsprozess und Lizenzmarkt |
| Gamebiz 3 | Tiefe Hardware-Entwicklung | Eigene Konsole aus Komponenten mit Kosten, Leistung und Kühlung (Ausbau) |
| Startup Company | Klarste Karten-Oberfläche im Genre: Komponenten werden per Drag & Drop zu Features | Design-Brett mit Feature-Karten beim Anlegen eines Projekts (siehe Oberfläche) |
| Game Dev Tycoon | Wachsendes Büro als sichtbarer Fortschritt | Feste Grundrisse mit Ausstattungspaketen; Büro-Ansicht von oben ab 1.4 (siehe Büro und Ausstattung) |

**Was vermieden werden muss** (Kritik an den Vorbildern):

- **Gleiche Spiele bei gleichen Eingaben:** Bei City Game Studio kritisieren Spieler, dass zwei Spiele mit gleichem Genre, Thema und gleichen Features identisch abschneiden. Gegenmittel: Feature-Auswahl, Team, Engine und Plattform-Versionen machen jedes Spiel anders.
- **Zu simple Engine-Entwicklung** (ebenfalls Kritik an City Game Studio): Module, Stufen, Wartung und technische Schuld sind hier das Herzstück.
- **Zu starke Lizenzeinnahmen am Anfang:** Ein Spieler überlebte dort nur dank Engine-Royalties trotz zehn Flops. Gegenmittel: Lizenznehmer werden stärker, Vertrauen und Support-Pflichten kosten.
- **Bauen als Pflicht:** MGT2 und Software Inc. werden zur Büro-Simulation; hier gibt es keinen freien Bürobau, sondern feste Grundrisse mit Ausstattungspaketen wie in Game Dev Tycoon.
- **Fummelige Mods:** MGT2 hat keinen Workshop, Mods überschreiben sich gegenseitig. Hier gibt es von Beginn an eine saubere Mod-Schnittstelle.

## Funktioniert das als Spiel?

Ja, das Konzept kann als Spiel funktionieren. Die Nachfrage ist belegt, und der eigene Kern ist klar: Engine, Marken und Plattformen als ein zusammenhängendes Geschäft. Ob es Spaß macht, hängt an drei Bedingungen, nicht an der Zahl der Systeme.

**Was dafür spricht:**

- **Belegte Nachfrage:** MGT2 ist auf Steam mit 94 % positiven Bewertungen sehr gut bewertet, City Game Studio ebenfalls „Sehr positiv“. Spieler wünschen sich in Foren ausdrücklich tiefere Simulationen.
- **Klares Alleinstellungsmerkmal:** Kein Spiel verbindet Engine-Lizenzmarkt, Marken über Genres, dynamische Plattformen und Live-Betrieb.
- **Eingebaute Geschichten:** Die alte Konsole, die dank eigener Hits Jahre länger lebt; der Lizenznehmer, der mit der eigenen Engine zum Rivalen wird; die Marke, die vom Action-Spiel zum MMO wächst. Solche Momente entstehen aus den Systemen.
- **Natürliche Einführung durch die Geschichte:** 1980 gibt es nur kleine Spiele auf einer Plattform. Engines, Lizenzen, Online, Live-Service und Abos kommen erst mit den Jahrzehnten dazu.

**Die drei Bedingungen:**

1. **Schrittweise Einführung:** Neue Systeme erscheinen erst, wenn sie historisch aufkommen oder die Firma groß genug ist. Wer 1980 startet, lernt das Spiel nebenbei; wer 2010 startet, bekommt eine kurze Einführung.
2. **Lesbarkeit:** Jede Zahl lässt sich aufschlüsseln, jeder Erfolg und Flop hat einen sichtbaren Grund. Ohne das wirkt die Tiefe wie Zufall.
3. **Druck im Spätspiel:** Das größte Problem des Genres ist das langweilige Spätspiel, wenn man reich ist. Gegenmittel: AAA-Budgets wachsen schneller als die Einnahmen, Krisen und Übernahmeversuche treffen auch Große, Lizenznehmer werden Rivalen, und optionale Ziele wie Börsengang oder Aktionärserwartungen setzen neue Maßstäbe.

**Risiken und Gegenmittel:**

| Risiko | Gegenmittel |
| --- | --- |
| Überforderung durch zu viele Systeme | Schrittweise Einführung; Produzenten und Direktoren übernehmen Routine |
| Tabellen-Gefühl statt Spiel | Wertungs-Momente, Nachrichten, Ehrungen, sichtbare Verkaufskurven |
| Eine Strategie dominiert | Automatische Simulationsläufe mit Bot-Strategien (siehe Balancing) |
| KI-Konkurrenz wirkt dumm oder unfair | Gleiche Regeln für KI und Spieler; Persönlichkeiten mit nachvollziehbaren Zielen |
| Umfang für ein kleines Team zu groß | Etappenplan; nach Etappe 3 prüfen, ob der Kern trägt, bevor Live-Betrieb und Ausbau kommen |

**Die Prüfung im Prototyp:** Drei Fragen entscheiden, ob es weitergeht. Macht ein einzelnes Projekt in Etappe 1 Spaß? Ist die Frage „Engine selbst bauen oder lizenzieren?“ in Etappe 3 wirklich spannend? Erzählen Testläufe eigene Geschichten, an die man sich erinnert?

## Ziele, Szenarien und Einstellungen

Das Spätspiel wird nicht durch höhere Kosten spannend, sondern durch Ziele. Dazu kommen Einstellungen, die einzeln regelbar sind und messbar etwas ändern.

**Ziele im freien Spiel:**

- **Ruhmeshalle:** Meilensteine wie erstes Spiel über 9,0, erste eigene Engine, erste Lizenz an ein AAA-Studio, Marke in drei Genres, Konsole zehn Jahre am Leben gehalten.
- **Branchenpreise:** Jährlich „Spiel des Jahres“, „Engine des Jahres“, „Studio des Jahres“; Preise steigern Verkäufe und Ruf.
- **Börsengang und Aktionäre:** Ab einer Firmengröße möglich; die Regeln stehen unter Firma → Börse und Aktionäre.
- **Persönliche Ziele:** Optional wählbar beim Start (Engine-Marktführer, größte Marke, eigene Konsole, unabhängig bleiben).

**Spielende und Chronik:** Erreicht der Spieler das Endjahr oder seine Zielbedingung, öffnet sich ein Abschluss-Bildschirm.

- **Chronik** als Zeitleiste der Firma: Gründung, Hits, Flops, Engines, Konsolen, Krisen und Wendepunkte, gesammelt aus den Jahrbüchern.
- **Vermächtnis-Wertung** aus Marken, Engines, Preisen, Umsatz und dem Vergleich mit den Rivalen, mit einem Titel („Der Engine-Riese“, „Die Marken-Schmiede“, „Der ewige Indie“).
- **Weiterspielen** ist immer möglich; Erfolge werden zum Endzeitpunkt festgehalten.
- Die Chronik lässt sich als Bild oder Text exportieren und teilen.

**Szenarien (Auswahl):**

| Szenario | Start | Ziel |
| --- | --- | --- |
| Garagen-Traum | 1980, zwei Personen | Bis 1995 ein Spiel über 9,0 |
| Rette die Konsole | 2004, Studio mit Exklusivvertrag | Die Plattform bis 2012 am Leben halten |
| Vom Lizenznehmer zum Anbieter | 1998, Studio mit fremder Engine | In zehn Jahren die meistlizenzierte Engine |
| Indie-Durchbruch | 2015, fünf Personen | Ein Spiel mit 500.000 Interessenten zum Release |
| Konzern-Integration | 2020, Konzern nach drei Käufen | Integration ohne Abwanderung von Schlüsselpersonen |
| Live-Service-Rettung | 2018, MMO mit hohem Churn | Spielerbasis in zwei Jahren verdoppeln |

**Einstellungen beim Spielstart:**

- Startjahr (1980, 1990, 2000, 2010, 2020; frei in der Sandbox), mit generierter Vorgeschichte bei spätem Start.
- Startprofil: Garage, kleines Studio, etabliertes Studio oder Engine-Firma; das Startprofil Publisher kommt nach 1.0 zusammen mit dem eigenen Publishing. Jedes Profil legt je Startjahr Geld, Teams, Engine-Stand, null bis zwei Marken, Plattform-Beziehungen und Ruf fest (S01, KRN-R70 ff.). Der Welt-Generator erzeugt je Epoche 20–60 KI-Studios mit gemischten Persönlichkeiten, darunter 3–5 Rivalen, und schreibt die Vorgeschichte als Chronik-Doppelseite, die zugleich das Briefing ist.
- Startkapital und Startkredit, Region (Nordamerika, Europa, Japan mit eigenen Startplattformen und Vorlieben).
- Seed (anzeigbar, kopierbar, teilbar) und Spielende (offen, festes Endjahr, Zielbedingung).

**Schwierigkeit als Preset und einzeln einstellbar:**

| Stellschraube | Wirkung |
| --- | --- |
| Startgeld, Einnahmen, Kosten | Multiplikatoren |
| Kreditzins und Kreditrahmen | Wie leicht man sich verschulden kann |
| Presse-Strenge | Verschiebt die erwartete Qualität um ±8 % je Stufe |
| Markenmüdigkeit, Trendgeschwindigkeit | Wie schnell sich der Markt dreht |
| Bug-Rate, Wachstum der technischen Schuld | Wie verzeihend die Technik ist |
| Insolvenz-Toleranz | Monate im Minus bis zum Ende (Normal 6); Startpolster ohne Insolvenz: Entspannt 3 Jahre, Leicht 2 Jahre |
| KI-Kompetenz, KI-Aggressivität, Zahl der Studios, Ausgleich | Wie gut die Konkurrenz entscheidet und wie sehr sie sich gegen den Spieler richtet (siehe KI-System und Schwierigkeit) |
| Ereignisdichte | Getrennt für historische und zufällige Ereignisse |
| Platzangebot der Büros | Großzügig, normal oder knapp: Arbeits- und Ausstattungsplätze pro Grundriss mal 1,5, 1 oder 0,75 |
| Presse-Zufall | Aus, gering oder normal: Streuung der Tagesform der Presse 0, 0,15 oder 0,3 Wertungspunkte; „aus“ sperrt keine Erfolge |
| Entscheidungsdichte | Ruhig, normal oder dicht: Zahl der Angebote pro Jahr; Krisen und Pflicht-Entscheidungen bleiben gleich |

Jedes Preset muss in den Simulationsläufen messbar anders enden; ein schwerer Grad, der nichts ändert, ist eine bekannte Kritik an den Vorbildern. Das Preset wird beim Start gewählt und gilt für den Spielstand; einzelne Stellschrauben lassen sich später ändern, schalten aber Erfolge für diesen Spielstand ab. Jedes Preset beschreibt in einem Satz, was einen erwartet, z. B. „Normal: Ein guter Spieler übersteht die 90er, ein sehr guter führt 2010 die Engine-Charts an.“

**Weitere Schalter:** Marktzyklen, PC-Leistungsklassen, dynamische oder historisch feste Konsolen-Lebenszyklen, Plattformhersteller als Übernahmeziel, Wettbewerbsbehörde, Geschäftsmodell-Sperren (z. B. kein F2P), Sandbox, Ironman (ein Spielstand, Erfolge nur hier), Büro-Darstellung (Bühne oder ab 1.4 Büro-Ansicht).

**Allgemeine Einstellungen:**

- Zeit und Speichern: Tempo 0,5× bis 4×, Auto-Pause je Ereignisklasse (als eigene Übersicht), Pause bei Fokusverlust, Taste „eine Woche vor“, Autosave-Intervall mit 5 rotierenden Slots, Export und Import, Cloud-Save.
- Mods: Mod-Verwaltung mit Ladereihenfolge und Konfliktanzeige, Workshop ab Release, echte Namen als Mod-Paket.
- Darstellung: Sprache, UI-Skalierung und Schriftgröße getrennt, hell, dunkel und hoher Kontrast, Farbenblind-Modi (Diagramme mit Mustern), Zahlenformat kurz (1,2 Mio.) oder voll, Währungsformat, reduzierte Animationen.
- Hilfe: Tutorial geführt, als Hinweise oder aus; Mentor und Sprechblasen der Figuren getrennt stummschaltbar; Wissensbuch immer verfügbar; Tooltips mit Formel-Aufschlüsselung für Fortgeschrittene; Meldungsdichte.
- Bedienung: Tastatur-Kürzel, Controller- und Steam-Deck-Unterstützung.
- Telemetrie nur als Opt-in.

## Modding und Workshop

Game Dev Tycoon lebt seit Jahren von seiner Mod-Szene; bei Mad Games Tycoon 2 überschreiben sich Mods gegenseitig. Hier ist Modding von Anfang an Teil der Architektur: **Das Grundspiel ist selbst ein Mod.** Alle Inhalte werden über dieselbe Ladepipeline geladen, die auch Mods benutzen. Was das Spiel kann, kann damit auch ein Mod.

| Stufe | Was sich ändern lässt | Wie | In 1.0 |
| --- | --- | --- | --- |
| 📄 Daten | Genres, Themen, Plattformen, Features, Engine-Module, Produkttypen, Messen, Namen, Balancing-Werte | JSON-Dateien | ✅ |
| 🎨 Inhalte | Porträts, Logos, Plattform-Symbole, Musik, Töne, Übersetzungen | Bild-, Audio- und Textdateien | ✅ |
| 📜 Ereignisse | Eigene Ereignisse und Ereignisketten mit Bedingungen, Optionen und Folgen | Deklaratives Format, kein Code | ✅ |
| ⚙ Code | Neue Regeln, eigene Ansichten | Skript-Schnittstelle in einer Sandbox mit festen Einstiegspunkten (Wochen-Tick, Release, Vertrag) | Nach 1.0 |

**Aufbau eines Mods:** ein Ordner mit einer Beschreibungsdatei `mod.json` (Kennung, Name, Version, passende Spielversion, Abhängigkeiten, bekannte Konflikte, Ladeposition) und den Dateien. Mods **ergänzen und ändern Datensätze über ihre Kennung**, statt ganze Dateien zu ersetzen (hinzufügen, Felder ändern, entfernen). Zwei Mods, die verschiedene Felder desselben Genres ändern, vertragen sich deshalb.

**Mod-Verwaltung im Spiel:**

- Liste mit Ein/Aus, Ladereihenfolge per Ziehen, Abhängigkeiten werden automatisch mitgeladen.
- ⚠ **Konfliktanzeige:** Ändern zwei Mods dasselbe Feld, zeigt das Spiel Feld, beide Werte und welcher gewinnt (der später geladene).
- 🛡 **Prüfung beim Laden:** Jede Datei wird gegen ein Schema geprüft. Fehler erscheinen mit Datei und Stelle; ein defekter Mod wird abgeschaltet, das Spiel stürzt nicht ab.
- 💾 **Spielstände** merken sich aktive Mods mit Version. Fehlt beim Laden ein Mod, warnt das Spiel; Dinge aus dem fehlenden Mod fallen auf einen Ersatz zurück (z. B. Genre „Unbekannt“), statt den Spielstand zu zerstören.
- 🏆 **Erfolge:** Kosmetische Mods (Bilder, Musik, Namen, Übersetzungen) lassen Erfolge an; Mods, die Balancing oder Regeln ändern, schalten sie für diesen Spielstand ab.

**Workshop ab Release:** Mods werden über den Steam Workshop abonniert und automatisch installiert und aktualisiert; Mod-Sammlungen lassen sich teilen. Für Versionen ohne Steam gibt es einen einfachen Mod-Ordner.

**Werkzeuge für Modder:**

- Eine Mod-Vorlage und eine Dokumentation aller Datenformate, die automatisch aus den TypeScript-Typen erzeugt wird (JSON Schema) und dadurch nie veraltet.
- Ein Entwicklermodus mit Datenbrowser und Neuladen der Mods ohne Neustart.
- Ein Testlauf mit dem vorhandenen Simulationswerkzeug: Ein Mod lässt sich 1980 bis 2040 ohne Oberfläche durchspielen und liefert einen Balancing-Bericht.

**Echte Namen:** Das Spiel verwendet fiktive Firmen und Konsolen. Namenspakete der Community ersetzen sie über die Stufe Daten, ohne dass das Spiel selbst echte Marken enthält.

**Zeitplan:** Die gemeinsame Ladepipeline steht ab der ersten Etappe, weil sie sich später kaum nachrüsten lässt. Mod-Verwaltung, Schema-Prüfung, Ereignisformat und Workshop kommen vor 1.0, die Code-Schnittstelle danach.

## Umfang von Version 1.0

Die Prüfung empfiehlt, den Umfang für Version 1.0 etwa zu halbieren: Ein tiefes Spiel ist mit einem kleinen Team erreichbar, ein breites nicht. Die Systeme bleiben im Dokument, werden aber zeitlich eingeordnet.

| Kategorie | Inhalt |
| --- | --- |
| Kern von 1.0 | Spielerlebnis und Bedienung, Produkte als Datensätze, Entwicklung mit Vertical Slice, Marken, Multiplattform (Lead plus weitere), Engines, Lizenzmarkt mit Vorlagen, Marketing mit einem Interesse-Wert, Betrieb und Live-Service, Firma mit Teams, Publisher-Verträge, Markt mit 3–5 benannten Rivalen, Delegation und Produzenten, Ziele, Szenarien, Einstellungen, Oberfläche mit Erleben- und Analysieren-Ebene, Release-Bildschirm, Vertrieb und Produktion mit Editionen, Neuauflagen und Sammlungen, Projekte pausieren und abbrechen, Engine-Bindung von Projekten mit Anforderungen ans Engine-Team, Devkits vor dem Konsolenstart |
| In 1.0 vereinfacht | Übernahmen als Minimalversion (Komplettkauf, Prüfung ja oder nein, Integrationskapazität, drei Vorgaben), Messen als Messe-Saison mit zwei Veranstaltungstypen, Merchandising automatisch, Börsengang mit Aktionärserwartung, physische Auflage als eine Zahl pro Release bis etwa 2010 |
| Klein ergänzt | Plattform-Beziehungswert (frühe Devkits, Gebühren, Showcase-Plätze), Standort mit Lohnniveau und Förderung, Analytics ab 2010, Krisen als Ereignisketten mit Antwortoptionen, Back-Catalog-Verkäufe, Büro aus festen Grundrissen mit Ausstattungspaketen, Kopierschutz als eine Release-Entscheidung, Technik-Update per Patch, Preisaktionen, Spielende mit Chronik |
| Nach 1.0 | Eigene Module einzeln als Middleware anbieten (derselbe Lizenzvertrag mit Umfang „Modul“), E-Sport, Film und Serie als Mechanik, Fanshop-Lager, Messe-Standgrößen, Server-Hosting für Fremde, Co-Entwicklung, Übernahme-Vollversion (Fusion, Ausgliederung, Management-Buyout, feindliche Übernahmen, Behörde mit Auflagen), eigene Konsole, Multiplayer, eigenes Publishing mit Startprofil Publisher, Projekt-Zweige der Engine, weitere Messe-Typen, PC-Leistungsklassen als Standard, Büro-Ansicht von oben (1.4) |
| Weggelassen | Datenschutz und Nachhaltigkeit als Systeme |

**Aufwand:** Die dritte Prüfung schätzt 26–36 Monate in Vollzeit für ein bis zwei Personen mit Claude Code bis 1.0, den Early Access nach 15–20 Monaten; nebenberuflich etwa das Doppelte. Die Oberfläche macht etwa 40 % davon aus. Die vereinfachte Börse spart gegenüber dem früheren Entwurf etwa zwei bis drei Wochen, der Markenmarkt kostet etwa drei bis vier Wochen, weil er Verträge, Verhandlungstisch und Vertrauen vom Engine-Markt wiederverwendet.

**Streichliste, falls es klemmt** (in dieser Reihenfolge, ohne neue Priorisierungsrunde):

1. Börse nach 1.1; Übernahmen bleiben in 1.0, finanziert über Kasse und Kredit.
2. Standorte, Analytics und die Details der Zukunftsepoche; Messen bleiben bei zwei Typen.
3. Krisenketten auf fünf, Szenarien auf drei.
4. Bühne als statisches Epochenbild mit Porträts; Figuren nach 1.0.
5. Markenmarkt ohne Börse-Katalog: nur Anfragen und Angebote am Verhandlungstisch, Regal-Ansicht nach 1.0.

**Nie gestrichen**, weil sie das Spiel von der Konkurrenz unterscheiden: Engine-Module mit technischer Schuld, Lizenzmarkt mit Vorlagen und Lizenzweg, Marken-Cockpit, dynamische Plattformen, Delegation.

**Early Access nach Etappe 4:** Statt erst nach Etappe 6 erscheint das Spiel nach Etappe 4 im Early Access auf Steam. Mad Games Tycoon 2, City Game Studio und Software Inc. sind alle so groß geworden; laufende Updates werden in deren Reviews durchweg gelobt. Etappe 5 und 6 entstehen dann mit Rückmeldung der Spieler.

Die Architektur bleibt für alles offen, was nach 1.0 kommt; insbesondere erlaubt der deterministische Kern mit Seed später einen Multiplayer.

## Etappenplan

Das Spiel entsteht in einer Prototyp-Etappe und sechs Etappen. Jede endet mit einem spielbaren Stand; die nächste beginnt erst, wenn die Abnahmekriterien erfüllt sind.

**Etappe 0: Prototyp der Kernschleife (3–4 Wochen).** Vor der teuren Etappe 1 entsteht ein schlichter Prototyp ohne Bühne und ohne schöne Oberfläche: Projekt anlegen (Genre, Thema, drei Feature-Karten), entwickeln, veröffentlichen, Wertung mit Aufschlüsselung sehen, zweites Projekt besser machen.

- **Frage, die er beantwortet:** Macht ein einzelnes Projekt Spaß, und versteht man, warum das zweite besser wurde?
- **Bestanden, wenn** drei von fünf Testspielern freiwillig ein drittes Projekt beginnen und den Grund für ihre Wertung in eigenen Worten nennen können.
- **Nicht bestanden:** Formel, Feature-Auswahl oder Aufschlüsselung überarbeiten und erneut testen, bevor Etappe 1 beginnt.
- Der Code des Prototyps darf weggeworfen werden; Datenformate und die Qualitätsformel werden übernommen.

&#91;embedded content: Etappenplan · Prototyp, 6 Etappen, Early Access nach Etappe 4\]

**Abnahmekriterien:**

1. **Kern:** Ein Spieler kann 1980 bis 2000 durchspielen, Spiele aus Genre, Thema und Umfang entwickeln, auf einer Plattform veröffentlichen und pleitegehen. Jede Wertung lässt sich aufschlüsseln.
2. **Engines:** Spiel-Features setzen Engine-Module voraus. Eine veraltete Engine liefert spürbar schlechtere Spiele; technische Schuld bremst messbar.
3. **KI und Lizenzen:** Mindestens 20 KI-Studios entwickeln eigenständig Spiele. Sie lizenzieren die Engine des Spielers nach dem Nutzwert, und Lizenzeinnahmen erscheinen in den Finanzen. Ein Simulationslauf ohne Spieler bleibt 60 Jahre stabil.
4. **Marketing und Release:** Hype steuert den Verkaufsstart, die Wertung den Verlauf. Ein Release neben einem großen KI-Titel verkauft sichtbar schlechter.
5. **Live-Betrieb:** Ein MMO lässt sich zehn Jahre betreiben; ohne neue Inhalte steigt der Churn. DLC und Patches beeinflussen die Community-Zufriedenheit.
6. **Ausbau:** Publisher-Deals, Übernahmen und Ereignisse funktionieren. Die Bot-Strategien aus dem Balancing gewinnen jeweils nicht immer.

Oberfläche, Speichern und Laden gehören ab Etappe 1 dazu, ebenso Platzhalter-Töne und die Bühne als statisches Bild. Figuren auf der Bühne kommen in Etappe 3, endgültige Grafik und Musik vor 1.0.

**Anpassungen nach der Prüfung:** Spielerlebnis und Bedienung gehören in Etappe 1, Marken mit Franchise-Cockpit in Etappe 2, Produzenten und Delegation in Etappe 3, Ziele, Szenarien und Einstellungen in Etappe 4. Etappe 6 wird geteilt: 6a mit Publisher-Deals, Ereignissen und Krisen, 6b mit Übernahmen. Zusätzliches Abnahmekriterium für Etappe 1: Ein Tester spielt zwei Stunden ohne Erklärung und kann sagen, warum sein zweites Spiel besser war als das erste. Ab Etappe 3 gilt der Prüftest „Dein Engine-Anbieter erhöht die Royalty von 5 auf 12 %“: Er muss eine spürbare Reaktion auslösen.

**Zuordnung der neuen Systeme zu den Etappen:**

| Etappe | Neue oder umgebaute Systeme |
| --- | --- |
| 1 Kern | Spielerschleife mit Ereignis-Warteschlange, Rahmen mit Fokus-Spalte, Einstiegsansichten Zentrale, Projekte und Finanzen plus Zeitleiste, Bühne als statisches Bild, Projekt pausieren und abbrechen; Produkttypen als Datensätze; Features mit Bereichsprofil; Phasen nach Umfang; Playtests; Wissensbuch; physische Auflage; Einstellungen beim Start und Schwierigkeit |
| 2 Engines | Fremdmodule, Leistungsbudget pro Plattform, Symptome technischer Schuld, Marken mit Franchise-Cockpit, Engine-Bindung und Anforderungen, Technik-Update per Patch |
| 3 KI und Lizenzen | Vertragsvorlagen, Lizenzweg mit Preis-Schocks und Anbieterwechsel, Rivalen, Plattformbeziehungen, Teams und Schlüsselpersonen, Produzenten und Regeln, Devkit-Wellen, Markt-Ansicht, Bühne mit Figuren, Büro mit Grundrissen und Ausstattung |
| 4 Marketing und Release | Interesse als ein Wert, fünf Marketing-Entscheidungen, Autopilot, Messe-Saison, Release-Bildschirm mit Preis und Kopierschutz, Preisaktionen, Vertrieb und Produktion mit Verwertungskette, Ziele, Ruhmeshalle, Preise, Szenarien, Spielende; danach Early Access |
| 4b Spielgefühl (nach dem Spieltest eingeschoben) | Bühne mit Leben, Momente als Szene (Release-Abend, Preis-Gala, Insolvenz-Warnung), Symbole, Platzhalter-Musik, Inhaltsbreite über Daten, starker Start; Spieltest mit zwei Personen |
| 5 Live-Betrieb | Abteilung Betrieb, Analytics, Back-Catalog, Merchandising automatisch; gezielte Personalsuche (FRM-R76, aus dem Spieltest nach Etappe 4) |
| 6a Ausbau I | Publisher-Verhandlung, Standorte, Krisen und Ereignisketten, Boom und Krise, Zukunftsepoche |
| 6b Ausbau II | Börse und Aktionäre, Übernahmen als Minimalversion |

## Technik und Architektur

Empfehlung: TypeScript im Browser, mit einem Simulationskern, der völlig ohne Oberfläche läuft. So lässt sich die Simulation in Tests und Massenläufen prüfen, und die Oberfläche bleibt austauschbar.

**Stack:**

| Teil | Wahl | Grund |
| --- | --- | --- |
| Sprache | TypeScript | Typen fangen Fehler in komplexen Datenmodellen früh ab |
| Simulationskern | Reines TypeScript in einem Web Worker, ohne UI-Abhängigkeiten | Läuft im Browser und in Node für Testläufe |
| Oberfläche | React mit Vite; dnd-kit für Ziehen und Ablegen, Framer Motion für Übergänge | Karten, Panels und direkte Manipulation; das DOM bleibt barrierefrei und controller-fähig |
| Diagramme | SVG mit visx oder D3-Skalen, d3-sankey | Fächer, Wasserfall, Stream-Graph, Heatmap und Sankey, die fertige Diagramm-Bibliotheken nicht sauber können |
| Bühne | PixiJS (WebGL) mit fokussierbaren DOM-Overlays | Die einzige Ansicht mit vielen laufenden Animationen |
| Analysieren-Ebene | Ein Tabellen-Baustein (z. B. TanStack Table) | Einmal bauen, in jeder Ansicht nutzen |
| Audio | Howler.js über einen Ereignisbus aus dem Worker | Simulation meldet, die Audio-Schicht entscheidet |
| Zustand in der UI | Zustand oder Redux Toolkit | Ein Ort für das Anzeigemodell |
| Tests | Vitest | Schnell, passt zu Vite |
| Spielstände | JSON, im Browser gespeichert und als Datei exportierbar | Einfach, versionierbar |
| Desktop später | Tauri oder Electron | Ohne den Code umzubauen |

Alternative: Godot mit GDScript oder C#, wenn später mehr Grafik dazukommen soll. Für eine Simulation aus Karten, Diagrammen und einer Bühne ist der Web-Stack mit PixiJS schneller umgesetzt.

**Grundregeln für den Kern:**

- Der Spielstand ist ein reines Datenobjekt; ein Tick ist eine Funktion `tick(state, entscheidungen) → neuerState`.
- Zufall nur über einen Zufallsgenerator mit Seed. Gleicher Seed, gleiche Entscheidungen ergeben den gleichen Verlauf, damit Fehler reproduzierbar sind.
- Alle Werte für Balancing in JSON-Dateien unter `data/`, nie fest im Code.
- Jede Berechnung, die der Spieler sieht, liefert ihre Aufschlüsselung mit (z. B. die Teilfaktoren einer Wertung).

**Ergänzungen aus der Prüfung:**

- Der Simulationskern läuft ab Etappe 1 in einem Web Worker, damit die Oberfläche bei langen Berechnungen nicht einfriert.
- Jeder Spielstand trägt eine Schema-Version; für jede neue Version gibt es eine Migrationsfunktion.
- Geld wird in ganzen Zahlen gerechnet (z. B. Cent), damit der Verlauf mit gleichem Seed exakt reproduzierbar bleibt.
- KI in zwei Schichten: einfache Heuristik für alle Studios, tiefere Strategie für 3–5 benannte Rivalen.

**Ergänzungen aus der zweiten Prüfung:**

- Der Worker liefert pro Tick nur die Änderungen am Anzeigemodell, nicht den ganzen Spielstand; sonst bremst die Oberfläche bei 4× Tempo.
- Alle Diagramme bekommen ihre Daten im selben Format `{wert, vergleich, verlauf[], aufschlüsselung[]}`. So ist „keine Zahl ohne Vergleich“ ein Baustein statt einer Disziplin.
- Grafik ist der Engpass, nicht Code: einfacher Vektorstil, Assets als SVG, damit Claude Code sie erzeugen und Modder sie ersetzen können (siehe Präsentation).
- Grober Aufwand laut Prüfung: Die Oberfläche macht etwa 40 % des Gesamtaufwands aus.

**Reihenfolge eines Ticks** (verbindlich; Details in S01 und S12):

1. Eingaben anwenden: Entscheidungen des Spielers, Delegationsregeln.
2. Kalender: Datum, Freischaltungen, geplante Termine (Messen, Konsolenstarts, Devkit-Wellen, Store-Aktionen).
3. KI-Entscheidungen auf dem Stand der Vorwoche, in fester Reihenfolge nach Firmen-ID.
4. Forschung und Engine: Anforderungen, Module, Schuld.
5. Projekte: Fortschritt, Bugs, Phasen, Gates, Playtests.
6. Releases der Woche.
7. Markt: Interesse, Konkurrenzdichte, Verkäufe, Piraterie; monatlich Plattformbasis und Trends.
8. Betrieb: Live-Services, Abwanderung, Support, Server.
9. Lizenzen: Gebühren, Kundenstatus.
10. Finanzen: Kosten, Einnahmen, Kredite, Insolvenzprüfung; quartalsweise Börse.
11. Personal (monatlich): Moral, Burnout, Loyalität, Abwerbung, Bewerber.
12. Ereignisse: Auslöser prüfen, Ketten fortschreiben, Welt-Ereignisse in die Warteschlange stellen und höchstens eines in den Fokus holen; Projekt-Gates laufen getrennt (siehe Entscheidungsbudget).
13. Berichte, Chronik, Autosave-Punkte, Änderungen ans Anzeigemodell.

Konflikte (zwei Gebote um dieselbe Firma, zwei Studios um denselben Devkit-Platz) entscheidet das höhere Gebot, dann die bessere Beziehung, dann die Firmen-ID. Jedes System hat einen eigenen Zufallsstrom aus dem Seed, damit ein neues System den Verlauf der anderen nicht verändert.

**Leistungsziele:**

| Messgröße | Ziel |
| --- | --- |
| Wochen-Tick im Jahr 2040 (60 Studios, 3.000 Produkte, Mittelklasse-PC) | höchstens 50 ms |
| Monatsberechnungen (Plattformen, Trends, Personal) | höchstens 150 ms |
| Oberfläche | 60 Bilder pro Sekunde; Bühne höchstens 4 ms pro Bild |
| Spielstand | höchstens 5 MB komprimiert |
| Laden eines Spielstands | höchstens 3 Sekunden |
| Simulationslauf 1980–2040 ohne Oberfläche | höchstens 60 Sekunden |

Die Ziele werden ab Etappe 1 mit einem Testspielstand von 2040 gemessen; eine Überschreitung blockiert den Abschluss einer Etappe.

**Festkomma statt Fließkomma:** Damit der Verlauf in Browser, Node-Tests und Desktop-Version exakt gleich bleibt, rechnet der Simulationskern nicht nur Geld, sondern alle Werte als ganze Zahlen: Geld in Cent, Anteile und Faktoren in Basispunkten (1,0 = 10.000), nach jedem Rechenschritt abgeschnitten. Exponentialkurven und Potenzen kommen aus vorberechneten Tabellen statt aus `Math.exp` oder `Math.pow`. Fließkomma gibt es nur in der Oberfläche. Ein Determinismus-Test vergleicht Läufe in Node und im Browser über 60 Spieljahre; jede Abweichung blockiert den Abschluss einer Etappe.

**Datenmodell (Kern-Entitäten):**

| Entität | Wichtige Felder |
| --- | --- |
| Company | Geld, Ruf, Fans, Abteilungen, Marken, Engines, Verträge, Plattform-Erfahrung, Persönlichkeit (bei KI) |
| Employee | Fähigkeiten, Eigenschaften, Gehalt, Zufriedenheit, Team |
| Engine | Version, Modulstufen, technische Schuld, Lizenzmodell |
| EngineModule | Typ, Stufe, frühestes Jahr, Voraussetzungen |
| Project | Typ, Genre, Thema, Umfang, Features, Engine, Fortschritt, Bugs, Hype |
| Product | Veröffentlichtes Projekt: Wertung, Verkäufe, Spielerbasis, Zufriedenheit |
| LicenseContract | Lizenzgeber, Lizenznehmer, Engine, Konditionen, Laufzeit, Support-Level |
| Platform | Hersteller, Leistungsprofil, Erscheinungsjahr, aktive Basis, Attraktivität, Hits der letzten 12 Monate, Preis, Gebühr, Status (angekündigt, aktiv, eingestellt) |
| Market | Trends pro Genre und Thema, Konkurrenzkalender, Ereignisse |

Dazu kommen für das Entwicklungsgeschäft: **Feature** (Kosten pro Rolle, Wirkung auf Innovation, Stabilität und Spielspaß, Abhängigkeiten, Nachfolger), **Tool** (Werkzeug oder Middleware mit Lizenzmodell) und **Contract** (Auftraggeber, Art, Frist, Bezahlung, Qualitätsanforderung).

Für Marken und Plattformen: **Brand** (Name, Welt, Bekanntheit, Fans pro Genre, Welttiefe, Ruf, Müdigkeit, Eigentümer, Lizenzen), **BrandOffer** (Marke, Anbieter, Angebotsform, Vorlage, Preisvorstellung, Bedingungen, Laufzeit) und **BrandLicense** (Marke, Inhaber, Lizenznehmer, Pauschale, Umsatzanteil, Genres, Plattformen, Mindestwertung, Freigabestatus, Ende). Ein **Project** hat eine Liste von Zielplattformen mit je eigener Version, Bugs und Wertung.

Für Übernahmen: **Company** bekommt zusätzlich Eigentümer, Beteiligungen und ein **Directive**-Objekt (Autonomie, erlaubte Genres, Marken, Plattformen, Engine-Pflicht, Budgetgrenze, Geschäftsmodelle, Ziele, Personalregeln). Jede **Platform** hat einen eigenen Roadmap-Eintrag für Nachfolger, der nur durch eine ausdrückliche Einstellung des Spielers entfällt.

Für die KI: **AiProfile** (Archetyp, Charakterzüge, Gewichte, Rücklage-Ziel), **AiMind** (Ziele, Pläne, Überzeugungen, Bedrohung, Stimmung, Gegenzüge des Jahres), **AiChief** (Name, Porträt, Charakterzüge, verfehlte Ziele) und **AiDecisionLog** (Entscheidung, Nutzwert, drei Gründe, Bauchentscheidung ja oder nein); Einzelheiten in S14.

Aus der Prüfung kommen hinzu:

| Entität | Wichtige Felder |
| --- | --- |
| Team | Größe, Spezialisierung, Stärke, Erfahrung (Genre, Engine, Plattform), Moral, Leitung, Standort |
| KeyPerson | Name, Rolle, Eigenschaften, Loyalität, Gehalt, Geschichte |
| Location | Lohnniveau, Talentpool, Förderung, Region |
| Producer | Planung, Qualitätsanspruch, Risikofreude, Erfahrung, Kommunikation, betreute Projekte |
| DelegationRule | Bereich, Bedingung, Aktion, Gültigkeit, Protokoll |
| ProductType | Voraussetzung, Umsatzmodell, Lebensdauer, Teamanteil, Markenwirkung (Datendatei) |
| Playtest | Projekt, Zeitpunkt, Art, Prognose mit Spanne, Schwächen |
| PublisherDeal | Publisher, Vorschuss, Raten, Splits, Aufschlag, Laufzeit, IP, Sequel-Option, Meilensteine |
| LicenseTemplate | Name, Konditionen, Annahmeregel |
| Rival | Chef, Archetyp, Ziele, Beziehung, Gedächtnis |
| PlatformRelation | Hersteller, Wert, Verlauf |
| EventChain | Auslöser, Stufen, Optionen, Folgen, Zustand |
| Stock | Aktienanteile, Kurs, Erwartung, Prognose, Aktionäre |
| Goal und Scenario | Bedingungen, Fortschritt, Belohnung; Startzustand und Ziel eines Szenarios |
| Settings | Alle Start- und Schwierigkeitsparameter, Schalter, Seed |

Aus der zweiten Prüfung: **Project** bekommt Engine-Bindung (fest oder mitlaufend), offene Anforderungen, einen Status (läuft, pausiert, abgebrochen, archiviert) und ein Release-Paket (Termin, Preis, Plattformen, Auflage, Editionen, Demo, Kopierschutz). **Platform** bekommt Devkit-Wellen mit Empfängern. Neu sind **EngineRequest** (Projekt oder Lizenznehmer, Modul, Zielstufe, Frist, Status), **PriceEvent** (Produkt, Woche, Rabatt, Art) und **Chronicle** (Einträge für Jahrbuch und Spielende). Das Technik-Update ist ein Eintrag in der Produkttyp-Datendatei.

Für Büro und Ausstattung: **Office** (Standort, Grundriss, Größe, Arbeitsplätze, Ausstattungsplätze, Miete, Vertragslaufzeit) und **Equipment** (Typ, Stufe, Kaufjahr, Wirkung, laufende Kosten). Die Grundrisse selbst sind ein Katalog in einer Datendatei.

**Ordnerstruktur:**

```
src/
  sim/            Simulationskern, keine UI
    tick.ts       Reihenfolge eines Wochen-Ticks
    systems/      engines, licensing, development, sales, marketing, liveops, finance, market, ai
    model/        Typen der Entitäten
    rng.ts        Zufallsgenerator mit Seed
  ui/             React-Oberfläche
  data/           JSON: Genres, Themen, Plattformen, Module, Balancing-Werte
tools/
  simulate.ts     Massenläufe ohne UI, schreibt Berichte
tests/
CLAUDE.md         Projektregeln für Claude Code
```

**Arbeiten mit Claude Code:**

1. Dieses Dokument ins Projekt legen und in `CLAUDE.md` die Grundregeln oben festhalten (Kern ohne UI, Werte in `data/`, Seed-Zufall, Tests für jedes System).
2. Pro Etappe eine Aufgabe stellen, nicht das ganze Spiel auf einmal. Zuerst Datenmodell und Tick, dann ein System nach dem anderen.
3. Zu jedem System Tests schreiben lassen, die ein konkretes Verhalten prüfen (z. B. veraltete Engine senkt Wertung).
4. Ab Etappe 3 regelmäßig `tools/simulate.ts` laufen lassen und die Kennzahlen aus dem Balancing-Abschnitt prüfen.
5. Änderungen in Git versionieren, damit sich ein misslungener Schritt zurücknehmen lässt.
