# Texte

Spieltexte liegen je Sprache in `data/texts/<de|en>/<gruppe>.json`. Die Gruppe ergibt sich aus dem Präfix des Schlüssels (Teil vor dem ersten Punkt). Präfixe, die hier nicht stehen, gehören nach `allgemein.json`. `src/ui/textData.ts` fügt alle Dateien zusammen.

| Gruppe | Präfixe |
| --- | --- |
| ereignisse | `event`, `chain`, `quote`, `coach` |
| bericht | `log`, `chronicle`, `feed`, `pulse`, `yearbook`, `milestone` |
| fehler | `error` |
| projekte | `booth`, `form`, `feature`, `theme`, `subgenre`, `genre`, `project`, `pkg`, `release`, `products`, `scope`, `audience`, `pillar`, `phaseFocus`, `phase`, `polish`, `brief`, `cgame`, `contract`, `client`, `reissue`, `protection`, `price`, `marketing`, `fair`, `fairYear`, `channel`, `loc`, `type`, `origin`, `medium`, `magazine`, `detail`, `bar`, `tag`, `area`, `ops` |
| firma | `hostile`, `publishing`, `konzern`, `stock`, `office`, `room`, `team`, `staff`, `people`, `producer`, `delegation`, `rule`, `location`, `region`, `search`, `role`, `keytrait`, `trait`, `acq`, `value`, `finance`, `money`, `insolvency`, `gameover` |
| markt | `platform`, `platformType`, `maker`, `rival`, `ranking`, `brandMarket`, `brand`, `market`, `marketPhase`, `future`, `timeline`, `ai`, `archetype`, `award`, `gala`, `publisher`, `vendor` |
| engine | `engine`, `license`, `module`, `binding` |
| hilfe | `challenge`, `crisis`, `endgame`, `conference`, `annual`, `archrival`, `epoch`, `hb`, `guide`, `unlock`, `roadmap`, `first`, `mentor`, `knowledge`, `goals`, `goal`, `scenario`, `ending`, `light`, `stage`, `tile`, `next`, `focus` |
