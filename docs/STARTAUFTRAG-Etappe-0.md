# Startauftrag: Etappe 0 – Prototyp der Kernschleife

Diesen Text als erste Nachricht an Claude Code geben (oder: „Lies docs/STARTAUFTRAG-Etappe-0.md und setze ihn um.“).

---

Lies zuerst `CLAUDE.md`, dann im Design-Dokument die Abschnitte „Kern-Spielschleife“, „Spielerlebnis“ (bis „Die erste Stunde“), „Produkte“ und „Etappenplan“, danach S02 (Abschnitte 4 und 5), S12 (Abschnitte 4, 5.9 und 6) und den Abgleich in S00. Mach dir einen Plan und zeig ihn mir, bevor du Code schreibst.

**Ziel von Etappe 0:** Ein schlichter, spielbarer Prototyp, der eine Frage beantwortet: *Macht ein einzelnes Projekt Spaß, und versteht man, warum das zweite besser wurde?* Ohne Bühne, ohne schöne Oberfläche, ohne Markt, KI, Engines, Marketing.

**Umfang:**

1. **Grundgerüst:** Vite + React + TypeScript (strict), Vitest, ESLint mit der Numerik-Sperre für `src/sim` (TEC-R87), Ordnerstruktur nach S12 Abschnitt 4 (nur die Teile, die Etappe 0 braucht). `npm run check` führt lint, typecheck und test aus.
2. **Numerik (S12 5.9):** `src/sim/num.ts` mit Typen `cent` und `bp`, `mulBp`, `divBp` und `mulDiv` mit Pflicht-Mindestnenner, `clamp`; `tools/tables.ts` erzeugt die Tabellen für `tanh` und `invNorm` (weitere später) als versioniertes JSON mit Prüfsumme. Eigenschaftstests gegen eine Dezimal-Referenz.
3. **Zufall:** `src/sim/rng.ts` mit Seed (16 Hex-Zeichen) und benannten Strömen (A05).
4. **Daten:** Ein kleiner Satz fiktiver Genres (6), Themen (8), Features (etwa 20, mit Bereichsprofil und Merkmalen) und ein Startjahr 1980, alle Zahlen in `data/base/dev/*.json` nach S02 Abschnitt 5 und Datenblatt.
5. **Kernschleife:** Projekt anlegen (Genre, Thema, Umfang klein oder mittel, drei Feature-Karten), Wochen-Ticks mit Fortschritt und Bugs, Veröffentlichen, Qualität Q (S02 5.1), Pressewertung mit Zeitgeist und Tagesform der Presse (S02 5.2, A34), Q_erw aus den Startwerten.
6. **Aufschlüsselung:** Wertung als Wasserfall (Genre-Passung, Features, Team, Bugs, Zeitgeist, Tagesform der Presse) und ein Eintrag im Wissensbuch nach den Regeln aus S11 (größter positiver und negativer Balken).
7. **Oberfläche:** Eine schlichte Seite: Projekt-Formular, Fortschrittsanzeige, Wertungs-Enthüllung, Wasserfall, Liste der bisherigen Projekte mit Vergleich zum vorigen. Zeitsteuerung Pause, 1×, 4× und „bis zum Release“. Der Kern läuft bereits im Web Worker.
8. **Headless-Lauf:** `tools/simulate.ts` spielt 1.000 Projekte mit zufälligen Entscheidungen und schreibt die Verteilung der Wertungen; Ziel: Mittelwert um 6, Spanne 3–9 bei vernünftigen Entscheidungen.
9. **Determinismus:** Gleicher Seed und gleiche Eingaben ergeben identische Ergebnisse (Test in Node).

**Nicht bauen:** Markt und Verkäufe (höchstens eine grobe Platzhalterzahl), KI-Studios, Engines, Marketing, Finanzen über eine einfache Kasse hinaus, Speichern, Bühne, Ton.

**Fertig, wenn:**

- `npm run check` grün ist und `npm run simulate` einen Bericht schreibt,
- ich im Browser drei Projekte hintereinander spielen kann und nach jedem Release sehe, warum die Wertung so ausfiel,
- offene Punkte in `docs/OFFENE-FRAGEN.md` stehen.

**Danach (nicht von dir zu erledigen):** Fünf Testspieler; bestanden, wenn drei von fünf freiwillig ein drittes Projekt beginnen und den Grund ihrer Wertung in eigenen Worten nennen. Sonst Formel, Feature-Auswahl oder Aufschlüsselung überarbeiten.
