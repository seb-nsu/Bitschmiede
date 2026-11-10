# Ton und Musik

- `sfx/`: Ereignis- und Oberflächentöne. In `data/audio/sounds.json` je Ton `"file": "audio/sfx/<name>.ogg"` (optional `"fileGain"`). Ohne Datei spielt der erzeugte Platzhalter-Ton.
- `music/`: Musik je Epoche und Stimmung. In `data/audio/music.json` unter `"tracks": { "80": { "ruhig": "audio/music/<name>.ogg" } }`; fehlt eine Stimmung, gilt „ruhig“ der Epoche, fehlt die Epoche, spielt der Sequenzer.
- Jede Datei braucht einen Eintrag in `public/CREDITS.md` (nur CC0).
