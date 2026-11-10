# Mods erstellen (Stufe Daten und Texte)

Regeln: S10 ZIE-R31 bis ZIE-R39. Code: `src/mods/modding.ts` (Pipeline), `src/mods/loadBase.ts` (Grundspiel als Mod „base“), `src/ui/screens/Mods.tsx` (Verwaltung im Startbildschirm), `tools/modpack.ts` (Packen und Prüfen).

## Aufbau eines Mod-Ordners

```
meine-mod/
  mod.json                 Manifest (Pflicht)
  data/dev/genres.json     Änderungen an data/base/dev/genres.json
  data/start/garage.json   Änderungen an data/base/start/garage.json
  texts/de.json            Texte (optional), z. B. Namen neuer Karten
  texts/en.json
```

Ein vollständiges Beispiel liegt in `docs/mods/beispiel-mod/`, gepackt in `docs/mods/beispiel-mod-1.0.0.json`.

Packen und prüfen: `npm run mod:pack -- meine-mod`. Das Werkzeug lädt die Mod gegen das Grundspiel, meldet Fehler mit Datei und Stelle und schreibt `meine-mod-1.0.0.json`. Diese Datei liest man im Startbildschirm unter „Mods“ ein.

## Manifest (ZIE-R33)

| Feld | Bedeutung |
| --- | --- |
| id | Kennung aus a–z, 0–9, `-`, `_` (nicht „base“) |
| name, author, description | Anzeige im Startbildschirm |
| version | SemVer, z. B. `1.0.0` |
| gameVersion | Bereich der Spielversion, z. B. `>=0.1.0 <1.0.0`, `^0.1.0`, `*` |
| dependencies | `[{ "id": "andere-mod", "version": "^1.0.0" }]`, laden vorher |
| conflicts | Kennungen, mit denen die Mod nicht zusammen läuft |
| loadAfter | Kennungen, nach denen die Mod lädt, falls vorhanden |
| tier | `daten` oder `inhalte` (`ereignisse` wie `daten`; `code` kommt später) |
| affectsBalance | `false` nur für rein kosmetische Mods (Texte, Namen); sonst sperrt die Mod Erfolge (ZIE-R38) |

## Operationen (ZIE-R34)

Eine Mod ersetzt nie ganze Dateien. Jede Datei unter `data/` enthält ein Objekt (oder eine Liste solcher Objekte):

```json
{
  "list": "platforms",
  "add": [ { "id": "neu", "...": "alle Felder wie in den anderen Datensätzen" } ],
  "modify": [ { "id": "abenteuer", "set": { "themeFit.archaeologie": 13000 } } ],
  "remove": [ "alteKennung" ],
  "set": { "startMoneyCent": 7500000 }
}
```

- `list` nennt die Liste in der Datei (z. B. `platforms` in `market/platforms.json`, `events` in `events/katalog.json`). Ist die Datei selbst eine Liste (Genres, Themen, Karten), fällt `list` weg.
- `add` legt neue Datensätze an. Jedes Feld, das alle vorhandenen Datensätze haben, ist Pflicht und muss dieselbe Art haben.
- `modify` ändert einzelne Felder eines Datensatzes; Pfade mit Punkten erreichen verschachtelte Felder. Die Kennung bleibt.
- `remove` entfernt Datensätze über die Kennung. Synergien haben keine Kennung; dort gilt `a+b`, z. B. `action+optik`.
- `set` ändert Felder der Datei selbst (Startwerte, Parameter). Listen mit Kennungen ändert man nur mit `add`, `modify`, `remove`.

Zahlen bleiben ganze Zahlen: Geld in Cent, alle anderen Werte in bp (1,0 = 10.000).

## Laden, Fehler und Konflikte (ZIE-R35 bis ZIE-R37)

- Reihenfolge: Grundspiel, dann Abhängigkeiten und `loadAfter`, dann die Liste im Startbildschirm von oben nach unten.
- Ändern zwei Mods dasselbe Feld, gilt die später geladene; der Startbildschirm nennt Datei, Datensatz, Feld, beide Werte und den Gewinner.
- Eine fehlerhafte Mod (falsches Manifest, unbekannte Datei oder Kennung, falsche Art eines Werts, ungültige Daten nach der Prüfung des Grundspiels) wird mit Datei und Stelle gemeldet und abgeschaltet; das Spiel startet ohne sie.
- Mods gelten ab der nächsten Partie. Ein Spielstand merkt sich seine Mods; fehlt beim Laden eine, warnt das Spiel, und Genres, Themen, Plattformen oder Karten daraus fallen auf Ersatz zurück.

## Texte (Stufe Inhalte)

`texts/de.json` und `texts/en.json` enthalten Schlüssel wie in `data/texts`: `feature.<id>`, `genre.<id>`, `theme.<id>`, `platform.<id>` und so weiter. Sie ergänzen oder ersetzen die Texte des Grundspiels. Echte Firmen-, Marken-, Spiele- oder Personennamen gehören in keine Mod des Grundspiels.
