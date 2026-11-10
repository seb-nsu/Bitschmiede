# Konzept: Prototyp-Schritt 0b – Entscheidungen im Projekt und mehrere Projekte gleichzeitig

**Stand:** 29.10.2026 · **Status:** umgesetzt (29.10.2026); Entscheidungen E1–E6 wie vorgeschlagen, Abweichungen und Annahmen in `docs/OFFENE-FRAGEN.md`, Abschnitt „Prototyp-Schritt 0b“ · **Bezug:** S01 (Ereignisse, Zeit), S02 (Reviews, Playtests), S07 (Personen, Aufträge), S11 (Fokus-Spalte), Design-Dokument „Die erste Stunde“

## 1 Warum dieser Schritt

Der Prototyp aus Etappe 0 zeigt, dass Wertung und Wasserfall verständlich sind. Beim Spielen fallen aber zwei Lücken auf:

1. **Zwischen Start und Release passiert nichts.** Man entscheidet am Anfang (Genre, Thema, Karten) und am Ende (wann veröffentlichen), dazwischen schaut man zu. S01 verlangt, dass in den 1980ern weniger als 60 % der Wochen ohne Entscheidung vergehen; heute sind es über 90 %.
2. **Wie mehrere Projekte gleichzeitig aussehen, ist offen.** Die Dokumente beschreiben den Anfang (ein Projekt) und das Spätspiel (Produzenten ab dem dritten Projekt, Portfolio-Wand), aber nicht die Phase dazwischen: zwei bis sieben Personen, ein bis zwei Projekte und Aufträge, alles noch selbst gesteuert.

Schritt 0b soll beides spielbar machen, bevor Etappe 1 in die Breite geht.

**Testfragen:** Fühlt sich die Zeit zwischen Projektstart und Release gefüllt an? Behält man bei zwei laufenden Vorhaben den Überblick, und sind die Entscheidungen zwischen ihnen interessant?

## 2 Entscheidungen im Projekt

Alles hier steht bereits in der Spezifikation; neu ist nur, dass es in den Prototyp kommt.

| Moment | Wann | Wahl | Regel |
| --- | --- | --- | --- |
| **Prototyp-Review** | bei 30 % des Aufwands | Das Team schlägt einen Karten-Tausch vor, der das Bereichsprofil verbessert; Vorher-/Nachher-Prognose. Annehmen kostet etwas Zeit, Ablehnen ändert nichts. | PRD-R33, R34 |
| **Playtest** | jederzeit ab Produktion, auf Knopfdruck | Intern: kostet 1 Woche Fortschritt. Ergebnis: Wertungsspanne mit Versatz und die drei größten Schwächen. Spätere Tests sind genauer. | PRD-R30–R32 |
| **Kritischer Bug** | zufällig in den letzten Wochen | 2 Wochen verschieben / Day-One-Patch / so veröffentlichen | S02 Abschnitt 9 |
| **Gold-Review** | Produktion fertig | Termin halten oder Day-One-Patch (ersetzt den heutigen Hinweis „weiter testen?“) | PRD-R33, R34 |
| **Release** | nach Gold-Review | wie heute: Enthüllung, Wasserfall, Wissensbuch | – |

Jede Entscheidung hat eine Standardoption und eine Frist (KRN-R34); läuft sie ab, gilt der Standard und der Wochenbericht nennt ihn.

## 3 Mehrere Vorhaben gleichzeitig

### 3.1 Personen statt Pool

Bis 7 Mitarbeiter arbeiten laut S07 als Einzelpersonen (FRM-R02). Das nutzt 0b:

- Jede Person hat einen Namen (fiktiv, aus Bausteinen), eine Stärke je Bereich, ein Gehalt und eine Zuordnung: **Projekt**, **Auftrag** oder **frei**.
- Der Fortschritt eines Projekts ist die Summe der zugeordneten Personen.
- Die Teamstärke T_f eines Features ist die Stärke der besten zugeordneten Person im Bereich der Karte. **Damit wird die Zuordnung eine echte Entscheidung:** Die Grafikerin gehört an das grafiklastige Spiel.
- Umsetzen kostet 1 Woche Einarbeitung (vereinfacht nach FRM-R04).

### 3.2 Aufträge als erstes paralleles Vorhaben

Das Design-Dokument nennt für die 1980er „1–2 kleine Projekte gleichzeitig, Aufträge“. Aufträge (FRM-R49) sind der sanfte Einstieg in Parallelität:

- Ein Auftrag kommt als Angebot: Auftraggeber, Art (z. B. Lernprogramm, Umsetzung eines fremden Spiels), Frist 4–10 Wochen, Bezahlung, Anforderung 0–100.
- Annehmen bindet die zugeordneten Personen bis zur Frist. Erfüllt ist er, wenn q = Stärke × Erfahrung / 100 die Anforderung erreicht; sonst 30 % weniger Geld.
- **Der Zielkonflikt:** sicheres Geld jetzt gegen langsamer fertig werdendes eigenes Spiel.

### 3.3 Zwei eigene Spiele

- Ab der dritten Person darf ein zweites eigenes Projekt starten, wenn jedes mindestens eine Person hat.
- Releases verschiedener Projekte kommen als getrennte Enthüllungen; fallen sie in dieselbe Woche, entsteht ein Release-Bericht mit Reitern (KRN-R35).

### 3.4 Bewerbungen

- Etwa zweimal pro Jahr kommt eine Bewerbung als Angebot: Bereich, Stärke, Gehaltsforderung. Einstellen erhöht die Kapazität und die Wochenkosten.
- Die erste Bewerbung kommt planmäßig zum zweiten Projekt, wie es „Die erste Stunde“ vorsieht.

## 4 Bildschirm

Eine Ansicht statt heute zwei Zustände (Brett oder laufendes Projekt). Skizze:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Game Studio Tycoon   März 1981   Kasse 23.400 $   ⏸ 0,5× 1× 2× 4×  ⏭ nächstes Ereignis │
├──────────────────────────── Vorhaben ─────────────────────────┬──── Fokus ──────────┤
│ ┌ Sternenjäger · Action · klein ───────────────────────────┐ │ Prototyp-Review     │
│ │ Produktion ▓▓▓▓▓▓▓░░░░ 62 %      Bugs 12   ~6 Wochen     │ │ Sternenjäger, 30 %  │
│ │ Prognose 5,8 – 7,2 (Playtest vor 3 Wochen)  [Playtest]   │ │                     │
│ │ ● Anna  Gameplay 65                                      │ │ Vorschlag des Teams:│
│ └──────────────────────────────────────────────────────────┘ │ Titelmelodie →      │
│ ┌ Auftrag · Lernprogramm für einen Schulbuchverlag ────────┐ │ Mehrstimmige Musik  │
│ │ Frist in 5 Wochen · 9.000 $ · Anforderung 35 · q ≈ 41 ✓  │ │ Prognose 6,1 → 6,5  │
│ │ ● Ben   Grafik 60                                        │ │                     │
│ └──────────────────────────────────────────────────────────┘ │ [Annehmen] [Nein]   │
│ [+ Neues Projekt]                                            │ Frist: 3 Wochen     │
│                                                              ├── wartet (2) ───────┤
│                                                              │ · Bewerbung Grafik  │
│                                                              │ · Auftrag: Umsetzung│
├─────────────── Team ─────────────────────────────────────────┴─────────────────────┤
│ Anna (Gameplay 65) ▸ Sternenjäger   Ben (Grafik 60) ▸ Auftrag   frei: –   [Zuordnen] │
└───────────────────────────────────────────────────────────────────────────────────┘
```

- **Vorhaben-Karten** links: Phase, Fortschritt, Bugs, Restzeit, letzte Prognose, zugeordnete Personen.
- **Fokus-Spalte** rechts: genau eine Entscheidung im Vordergrund, weitere in der Warteschlange (A23, S11).
- **Team-Leiste** unten: Personen mit Zuordnung; Zuordnen per Auswahl (Ziehen erst in Etappe 1).
- Das Brett für ein neues Projekt öffnet sich als eigene Seite, Liste der Projekte und Wissensbuch bleiben wie heute.

## 5 Zeit

- **Tempo:** Seit dem letzten Commit gilt KRN-R03: 1× = ein Anzeigeschritt pro Sekunde, dazu 0,5× und 2× (ZIE-R45). Vorher lief die Wochenanzeige viermal zu schnell.
- **„Bis zum nächsten Ereignis“** ersetzt „Bis zum Release“ und hält bei jeder Entscheidung (KRN-R04, KRN-R05). Damit ist es der Standard-Weg zu spielen: Man springt von Entscheidung zu Entscheidung.
- **Monatsanzeige am Anfang:** Laut KRN-R01 zeigt das Spiel bis zum zweiten Release Monate an. Ein Monat vergeht bei 1× also in einer Sekunde, ein kleines Projekt in etwa 4 Sekunden ohne Entscheidungen. Mit den Entscheidungen aus Abschnitt 2 und 3 wird die Zeit vor allem durch Pausen bestimmt; ob die Monatsanzeige dann noch zu schnell wirkt, zeigt der Test (Frage E4).

## 6 Erwartete Entscheidungsdichte

Ein kleines Projekt dauert 12–16 Wochen. Darin: Prototyp-Review, ein bis zwei Playtests, Gold-Review, gelegentlich ein kritischer Bug, dazu Auftrags-Angebote und Bewerbungen. Das sind 5–7 Entscheidungen pro Projekt. Mit Fristen von 2–4 Wochen, in denen eine Entscheidung ansteht, ergibt das grob 40–50 % der Wochen mit Entscheidung und trifft das Ziel aus S01 (< 60 % ohne). `npm run simulate` misst den Wert künftig je Bot.

## 7 Entscheidungen für dich

| # | Frage | Vorschlag |
| --- | --- | --- |
| E1 | Personen einzeln zuordnen (3.1) oder Kapazität per Prozent auf Projekte verteilen? | einzeln, wie FRM-R02; Prozent-Regler erst mit Teams ab 8 Personen |
| E2 | Aufträge als erstes paralleles Vorhaben? | ja |
| E3 | Zwei eigene Spiele parallel schon in 0b? | ja, ab der dritten Person |
| E4 | Monatsanzeige bis zum zweiten Release behalten (KRN-R01) oder von Anfang an Wochen? | behalten und im Test beobachten; Umschalten ist eine Datenänderung |
| E5 | Playtests bei kleinen Projekten: Die Spec erlaubt sie „ab Pre-Production“, die kleine Projekte nicht haben. | ab Produktion |
| E6 | Zieltermin mit Ereignis „Termin gefährdet“ (verschieben, Crunch, Features streichen)? | nicht in 0b; braucht Ankündigung und Interesse aus Etappe 4 |

## 8 Nicht in 0b

Plattformen, echter Markt, Marketing, Speichern, Engines, KI-Studios, Teams ab 8 Personen, Produzenten, Gates großer Projekte. Die Bühne bleibt weg; die Oberfläche bleibt schlicht.

## 9 Umsetzung (nach Freigabe)

In kleinen, je spielbaren Commits, jeweils mit Tests je Regel-ID:

1. Ereignis-System mit Warteschlange, Fristen und Standardoption (KRN-R30–R36) und Fokus-Spalte.
2. Prototyp-Review, Gold-Review und kritischer Bug als erste Ereignisse.
3. Playtests mit Versatz (PRD-R30–R32, PRD-T07).
4. Personen mit Zuordnung, Teamstärke je Person, Einarbeitung.
5. Aufträge (FRM-R49) und Bewerbungen.
6. Zweites eigenes Projekt, Release-Bericht, neue Hauptansicht.
7. `tools/simulate.ts` misst Entscheidungsdichte und Wertungen mit mehreren Vorhaben; Kalibrierung.

Danach folgt wieder ein Test mit Spielern, diesmal mit den Testfragen aus Abschnitt 1.
