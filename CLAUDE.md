# Bitschmiede – Projektregeln für Claude Code

Wirtschaftssimulation über ein Spiele- und Engine-Studio von 1980 bis 2040. Sprache der Dokumente und der Spieltexte: Deutsch (Englisch folgt über `data/texts`). Code, Bezeichner und Commit-Nachrichten: Englisch, Regel-IDs bleiben wie in der Spezifikation.

## Quellen und Vorrang

1. `docs/spec/S00-Uebersicht-und-Abgleich.md`, Tabelle „Abgleich zwischen den Spezifikationen“ (A01–A47): entscheidet Widersprüche.
2. `docs/spec/S01` bis `S14` und `Datenblatt-Startwerte.md`: verbindlich, was gebaut wird.
3. `docs/design/Design-Dokument.md`: erklärt, warum. Bei Widerspruch gilt die Spezifikation.
4. `docs/analyse/` und `docs/archiv/`: Hintergrund, nicht verbindlich.

Regeln haben IDs (z. B. `PRD-R31`, `KRN-R01`, `TEC-R81`), Tests ebenfalls (`PRD-T10`). Nenne sie in Testnamen, Code-Kommentaren an der Umsetzungsstelle und Commit-Nachrichten. Markierungen: `[1.0]` bauen, `[1.1]` und `[später]` nicht bauen, solange nicht ausdrücklich beauftragt.

Dateipfade unter `data/` in den Specs (z. B. `data/dev/quality.json`) liegen im Grundspiel-Mod: `data/base/dev/quality.json`.

## Arbeite nur an der aktuellen Etappe

Aktuelle Etappe: **Abschluss 1.0** (Gesamtbild: `docs/ROADMAP.md`). Etappe 1 „Kern“, 2 „Engines“, 3 „KI und Lizenzen“, 4 „Marketing und Release“, 4b „Spielgefühl“, 5 „Live-Betrieb“, 6a „Ausbau I“, 6b „Ausbau II“ und 6c „Entwicklung ausbauen“ (`docs/UMSETZUNGSPLAN-Etappe-1.md` bis `-6c.md`) sind gebaut; der Spieltest mit zwei Personen (`docs/SPIELTEST-Etappe-4b.md`) steht noch aus. Etappe 0 und 0b (`docs/STARTAUFTRAG-Etappe-0.md`, `docs/design/Konzept-Prototyp-0b.md`) sind abgeschlossen. Baue nichts aus späteren Etappen vor, auch wenn es in der Spezifikation steht. Etappenplan: Design-Dokument, Abschnitt „Etappenplan“, und S12 Abschnitt 6.

## Architektur (S12)

- `src/sim` ist reiner Kern: keine Importe aus `ui/` oder `worker/`, keine Seiteneffekte, kein DOM.
- `tick(state, inputs) -> state`; die Reihenfolge steht nur in `src/sim/tick.ts` (S12, Tick-Reihenfolge).
- Simuliert wird immer wöchentlich; der Monat ist nur Anzeige (A33, KRN-R01 ff.).
- Zufall nur über `rng.stream("<system>")` mit Seed; nie `Math.random`, nie `Date.now` im Kern. Iteration immer nach ID sortiert.
- Geld in ganzen Cent, alle anderen Werte in bp (1,0 = 10.000). Rechnen nur mit `src/sim/num.ts` (mulBp, divBp mit Mindestnenner, mulDiv, clamp, Tabellen). In `src/sim` außerhalb von `num.ts` verboten: `Math.exp/pow/log/sqrt/random`, Fließkomma-Literale, der Operator `/` (TEC-R80–R89). Ein Lint-Regelsatz erzwingt das.
- Alle Balancing-Zahlen in `data/base/**/*.json`, nie im Code.
- Jede Berechnung, die der Spieler sieht, liefert ihre Aufschlüsselung (Wasserfall).
- Die UI liest nur das Anzeigemodell und sendet Eingaben an den Worker.
- Keine Texte im Code: `data/texts/de`, `data/texts/en`.

## Arbeitsweise

- Eine Aufgabe = ein System oder ein Bildschirm. Reihenfolge: Typen in `src/sim/model` und Daten in `data/base` → Regeln mit Tests je Regel-ID → Anzeigemodell → UI.
- Vor jedem Commit: `npm run check` (lint, typecheck, test, determinism, golden). Ändert sich Verhalten bewusst, Golden-Runs mit `npm run golden:update` neu freigeben und im Commit begründen.
- Balancing prüfen mit `npm run simulate` (Bot-Strategien 1980–2000, Bericht `reports/simulate.md`), Leistung mit `npm run bench`. Kleine Commits, je Schritt einer.
- Weicht die Umsetzung von der Spezifikation ab oder fehlt dort etwas: nicht still erfinden. Trage es in `docs/OFFENE-FRAGEN.md` ein (Datei, Regel-ID, Vorschlag) und nimm die kleinste plausible Annahme, im Code mit `// ANNAHME:` markiert.
- Balancing-Werte sind Startwerte aus dem Datenblatt; Änderungen nach Simulationsläufen mit kurzer Begründung im Commit.
- Spielstände mit Schema-Version; Änderung am Schema = Migration schreiben.

## Verboten

- Echte Firmen-, Marken-, Spiele-, Konsolen- oder Personennamen in Daten und Texten.
- Multiplayer-Code, freier Bürobau, Patente (gestrichen bzw. zurückgestellt).
