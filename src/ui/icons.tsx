// 4b.4: Eigene Symbole für Genres, Themen, Plattformtypen und Bereiche (UI-R60: Form statt nur Farbe).
// Linien-Glyphen im 24er-Raster, ohne Vorlagen echter Marken. Fehlt ein Symbol, zeigt der Kreis den Anfangsbuchstaben.

/** Kreis als Pfad. */
const c = (x: number, y: number, r: number): string => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

const GENRE: Record<string, string[]> = {
  abenteuer: [c(12, 12, 9), "M12 6l2.5 6-2.5 6-2.5-6z"],
  action: ["M13 2L5 14h6l-1 8 8-12h-6z"],
  denkspiel: ["M9 18h6M10 21h4", "M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"],
  rollenspiel: ["M12 2l8.7 5v10L12 22l-8.7-5V7z", "M12 2v20M3.3 7l17.4 10M20.7 7L3.3 17"],
  simulation: [c(12, 12, 3.5), "M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"],
  strategie: ["M5 21V3", "M5 4h12l-3 4 3 4H5"],
  rennspiel: ["M4 21V4", "M4 4h16v10H4", "M8 4v10M12 4v10M16 4v10M4 9h16"],
  sportspiel: [c(12, 12, 9), "M12 3v18M3 12h18", "M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8"],
  jumpnrun: ["M3 20h5M16 20h5", "M6 17c2-9 10-9 12 0", "M15 14l3 3 3-3"],
  shooter: [c(12, 12, 8), c(12, 12, 2), "M12 1v5M12 18v5M1 12h5M18 12h5"],
  kampfspiel: ["M7 4l10 16M17 4L7 20", c(12, 12, 9)],
  aufbauspiel: ["M3 21h18", "M5 21V10l7-6 7 6v11", "M10 21v-6h4v6"],
  brettspiel: ["M3 3h18v18H3z", "M3 9h18M3 15h18M9 3v18M15 3v18"],
  lernspiel: ["M2 8l10-5 10 5-10 5z", "M6 10v5c3 3 9 3 12 0v-5", "M22 8v6"],
  musikspiel: ["M9 18V5l12-2v13", c(6, 18, 3), c(18, 16, 3)],
};

const THEME: Record<string, string[]> = {
  antike: ["M4 21h16M5 18h14M6 5h12M4 3h16", "M8 5v13M12 5v13M16 5v13"],
  bauernhof: ["M3 21V10l9-7 9 7v11z", "M9 21v-6h6v6M9 15l6 6M15 15l-6 6"],
  cyberpunk: ["M4 4h6v6H4zM14 14h6v6h-6z", "M10 7h4v10M7 10v7h7"],
  dinosaurier: [c(12, 16, 4), "M8 12L5 4M12 11V3M16 12l3-8"],
  endzeit: [c(12, 12, 2), "M12 3a9 9 0 0 1 7.8 4.5L13.7 11M4.2 7.5A9 9 0 0 1 12 3M4.2 16.5l6.1-3.5M19.8 16.5l-6.1-3.5M12 21v-7"],
  fantasy: ["M12 2l2.4 7.3H22l-6.2 4.5 2.4 7.2L12 16.5 5.8 21l2.4-7.2L2 9.3h7.6z"],
  geister: ["M5 21V10a7 7 0 0 1 14 0v11l-2.3-2-2.4 2-2.3-2-2.3 2-2.4-2z", c(9.5, 10, 1), c(14.5, 10, 1)],
  horror: ["M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z", c(12, 12, 3)],
  krieg: ["M4 4l16 16M20 4L4 20", "M3 17l4 4M17 3l4 4M21 17l-4 4M7 3L3 7"],
  krimi: [c(10, 10, 6), "M14.5 14.5L21 21"],
  luftfahrt: ["M2 13l20-6-6 13-3-6z", "M13 14l-3 4"],
  maerchen: ["M3 18h18L19 7l-4 5-3-7-3 7-4-5z", "M3 21h18"],
  mafia: ["M3 16h18", "M6 16l1-8h10l1 8", "M7 12h10"],
  medizin: ["M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"],
  mittelalter: ["M4 21V8h3V5h3v3h4V5h3v3h3v13z", "M10 21v-5a2 2 0 0 1 4 0v5"],
  musik: ["M9 18V5l12-2v13", c(6, 18, 3), c(18, 16, 3)],
  mythologie: ["M12 2v20", "M6 6v4a6 6 0 0 0 12 0V6", "M6 6l-2 2M18 6l2 2M12 2l-2 3M12 2l2 3"],
  ninja: ["M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z", c(12, 12, 1.5)],
  piraten: [c(12, 5, 2), "M12 7v14", "M5 14a7 7 0 0 0 14 0", "M8 11h8"],
  politik: ["M4 21h16M6 18h12", "M7 18v-6h10v6", "M12 12V6M9 6h6", c(12, 4, 1)],
  rennsport: [c(12, 12, 9), c(12, 12, 3), "M12 3v6M12 15v6M3 12h6M15 12h6"],
  roboter: ["M5 8h14v11H5z", c(9, 13, 1.5), c(15, 13, 1.5), "M12 8V4", c(12, 3, 1), "M9 17h6"],
  romantik: ["M12 21s-9-5.4-9-11.5A5 5 0 0 1 12 6a5 5 0 0 1 9 3.5C21 15.6 12 21 12 21z"],
  schule: ["M3 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H3z", "M21 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z"],
  scifi: [c(12, 12, 5), "M2.5 15c2 2 17 -4 19-6.5S14 6 12 7"],
  spionage: [c(12, 9, 4), "M10 13l-2 8h8l-2-8"],
  sport: ["M7 4h10v5a5 5 0 0 1-10 0z", "M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4", "M12 14v4M8 21h8"],
  superhelden: ["M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z", "M9 10l3 5 3-5"],
  tiere: [c(12, 16, 4), c(6, 10, 2), c(10, 6, 2), c(14, 6, 2), c(18, 10, 2)],
  unterwasser: ["M2 12c4-6 12-6 16 0-4 6-12 6-16 0z", "M18 12l4-4v8z", c(7, 11, 1)],
  weltraum: ["M12 2c4 3 5 8 4 13H8C7 10 8 5 12 2z", "M8 15l-3 4h4M16 15l3 4h-4", c(12, 9, 2)],
  western: ["M12 21V4a2 2 0 0 1 4 0v17", "M12 10H8a2 2 0 0 1-2-2V6M16 13h2a2 2 0 0 0 2-2V8", "M8 21h12"],
  wirtschaft: ["M3 21h18M3 3v18", "M6 16l4-5 3 3 6-8", "M15 6h4v4"],
  zeitreise: ["M6 2h12M6 22h12", "M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10"],
  zombies: ["M8 21v-9l-2-6M11 12V3M14 12V4M17 13V6", "M8 12h9v5a4 4 0 0 1-4 4H8"],
  ausserirdische: ["M12 3c-5 0-8 4-8 8 0 5 5 10 8 10s8-5 8-10c0-4-3-8-8-8z", "M7 11c1.5 0 3 1 3 3-1.5 0-3-1-3-3zM17 11c-1.5 0-3 1-3 3 1.5 0 3-1 3-3z"],
  vampire: ["M3 6c3 0 5 2 9 2s6-2 9-2l-3 6H6z", "M9 12l1 4 1-4M13 12l1 4 1-4"],
  drachen: ["M4 18c2-6 6-9 12-10l4-4v6l-3 1c-1 4-4 7-9 8", "M8 14l-4-2M14 9l1-5"],
  samurai: ["M4 20L20 4", "M16 4h4v4", "M6 15l3 3"],
  wikinger: ["M6 10a6 6 0 0 1 12 0v4H6z", "M6 10L3 4M18 10l3-6", "M12 14v6"],
  eisenbahn: ["M5 3h14v12H5z", "M5 10h14", c(8, 13, 1), c(16, 13, 1), "M7 15l-3 6M17 15l3 6M6 19h12"],
  kochen: ["M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z", "M2 11h20", "M9 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4"],
  mode: ["M12 6a2 2 0 1 1 2-2", "M12 6v2l9 6v2H3v-2l9-6"],
  zirkus: ["M3 20V10l9-7 9 7v10", "M3 10h18", "M8 20v-6h8v6"],
  dschungel: ["M12 21V10", "M12 10C9 4 4 5 3 8c3-1 6 0 9 2zM12 10c3-6 8-5 9-2-3-1-6 0-9 2zM12 10c-1-5-5-7-7-6 2 1 5 3 7 6z"],
  arktis: ["M12 2v20M3.3 7l17.4 10M20.7 7L3.3 17", "M9 4l3 2 3-2M9 20l3-2 3 2"],
  wueste: ["M2 20h20", "M5 20l5-9 4 5 2-3 4 7", c(17, 6, 2)],
  grossstadt: ["M3 21V9h5v12M8 21V3h7v18M15 21v-9h6v9", "M10 7h3M10 11h3M10 15h3"],
  insel: ["M2 19c4-3 16-3 20 0", "M12 18V8", "M12 8c-2-3-6-3-8-1 3 0 6 0 8 1zM12 8c2-3 6-3 8-1-3 0-6 0-8 1z"],
  hacker: ["M3 4h18v12H3z", "M7 8l3 2-3 2M12 12h4", "M8 20h8M12 16v4"],
  magie: ["M4 20L16 8", "M16 3v3M16 10v3M11 8h3M18 8h3", "M13 5l1.5 1.5M19 11l-1.5-1.5"],
  steampunk: [c(12, 12, 4), "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"],
  archaeologie: ["M3 21l8-8", "M11 13l3-3 4 4-3 3z", "M14 10l2-6 4 4-6 2"],
  bergbau: ["M3 21l10-10", "M9 5c4-2 8-1 11 3-3-1-6-1-8 0z"],
  seefahrt: ["M3 16h18l-3 4H6z", "M12 16V3", "M12 4l6 9h-6z"],
  feuerwehr: ["M12 22c-4 0-7-3-7-7 0-5 5-7 5-12 3 2 4 5 4 7 1-1 2-2 2-3 2 2 3 5 3 8 0 4-3 7-7 7z"],
  polizei: ["M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z", "M12 8l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z"],
  freizeitpark: [c(12, 10, 7), "M12 3v14M5 10h14M7 5l10 10M17 5L7 15", "M8 21l4-4 4 4"],
  pferde: ["M7 21v-6l-3-3 3-6 5-2 3 3h4l1 3-3 1-2 4v6", "M10 5l-1-3"],
  katastrophen: ["M3 12h4l3-8 4 16 3-8h4"],
};

const PLATFORM: Record<string, string[]> = {
  pc: ["M3 4h18v12H3z", "M8 20h8M12 16v4"],
  konsole: ["M6 8h12a4 4 0 0 1 4 4v2a3 3 0 0 1-5.4 1.8L15 14H9l-1.6 1.8A3 3 0 0 1 2 14v-2a4 4 0 0 1 4-4z", "M7 11v2M6 12h2", c(16, 11, 0.6), c(18, 13, 0.6)],
  handheld: ["M6 2h12v20H6z", "M8 4h8v7H8z", c(12, 16, 1.5)],
  heimcomputer: ["M2 9h20v9H2z", "M5 12h2M9 12h2M13 12h2M17 12h2M7 15h10"],
  mobil: ["M7 2h10v20H7z", "M11 19h2"],
};

const AREA: Record<string, string[]> = {
  gameplay: [c(12, 12, 9), "M10 8l6 4-6 4z"],
  grafik: ["M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.6-1.2.2-2.5 1.6-2.5H18a3 3 0 0 0 3-3c0-5.5-4-10.5-9-10.5z", c(7.5, 11, 1), c(10, 7, 1), c(15, 7.5, 1)],
  sound: ["M4 9h4l5-4v14l-5-4H4z", "M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"],
  story: ["M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2z", "M5 19a2 2 0 0 1 2-2h12M9 7h6M9 11h6"],
  technik: ["M7 7h10v10H7z", "M10 7V3M14 7V3M10 21v-4M14 21v-4M3 10h4M3 14h4M17 10h4M17 14h4"],
};

const SETS = { genre: GENRE, theme: THEME, platform: PLATFORM, area: AREA } as const;
export type IconKind = keyof typeof SETS;

export function iconPaths(kind: IconKind, id: string): string[] | null {
  return SETS[kind][id] ?? null;
}

/** Symbol in Textgröße; `label` macht es für Screenreader lesbar, sonst ist es Schmuck. */
export function Icon({ kind, id, label, size = "1.1em", x, y }: { kind: IconKind; id: string; label?: string; size?: string; x?: number; y?: number }) {
  const paths = iconPaths(kind, id);
  return (
    <svg className={`icon icon-${kind}`} viewBox="0 0 24 24" x={x} y={y} width={size} height={size} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {paths ? paths.map((d, i) => <path key={i} d={d} />) : (
        <>
          <circle cx="12" cy="12" r="10" />
          <text x="12" y="16" textAnchor="middle" fontSize="11" stroke="none" fill="currentColor">{id.slice(0, 1).toUpperCase()}</text>
        </>
      )}
    </svg>
  );
}
