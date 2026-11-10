// Zentrale (S11 Bildschirm A): Kacheln mit Ampel und ein Satz (S11), Bühne mit Tischen, Figuren und Requisiten je Büro und Epoche (UI-R70, Plan A, S11 8.3).
import { displayPrefs, reducedMotion } from "../display";
import type { ViewModel } from "../../sim/view/view";
import type { StageView } from "../../sim/view/buehneView";
import { fmtMoney, fmtScore } from "../format";
import type { Lang, T } from "../texts";
import { ProjectPulseList } from "./Pulse";
import { MotivationBox } from "./Motivation";
import type { Sim } from "../useSim";
import { Icon } from "../icons";
import stageGfx from "../../../data/gfx/stage.json";
import { asset, iconForRoom, iconPath } from "../gfx";

type Light = "gruen" | "gelb" | "rot";

/** Kachel: Ampel mit Form (Kreis, Dreieck, Quadrat) statt nur Farbe (UI-R62), Wert und ein Satz. */
function Tile({ title, value, line, light, t }: { title: string; value: string; line: string; light: Light; t: T }) {
  return (
    <div className={`tile tile-${light}`}>
      <span className={`lamp lamp-${light}`} role="img" aria-label={t(`light.${light}`)} />
      <span className="tile-title">{title}</span>
      <strong className="tile-value">{value}</strong>
      <span className="small muted">{line}</span>
    </div>
  );
}

const WINDOWS: Record<string, number> = { garage: 0, etage: 4, buerohaus: 6, gebaeude: 8, campus: 0 };
const PER_TABLE = 8;

/** Figur: Kopf und Körper; müde Figuren legen den Kopf auf den Tisch, gut gelaunte heben die Arme (S11 8.3). */
function Figure({ f, x, y, t, walkTo, back }: { f: StageView["tables"][number]["figures"][number]; x: number; y: number; t: T; walkTo: { x: number; y: number } | null; back: boolean }) {
  const sprite = stageGfx.figures.length > 0 ? stageGfx.figures[f.id % stageGfx.figures.length] : undefined;
  const size = stageGfx.figureSize;
  const cls = `fig${f.tired ? " fig-tired" : ""}${f.crunch ? " fig-crunch" : ""}${f.keyRole ? " fig-key" : ""}`;
  const head = f.tired ? y + 10 : y;
  // 4b.2: Manche Figuren holen sich ab und zu einen Kaffee (fester Takt je Person, reine Anzeige).
  const walk = walkTo && !f.tired && !f.crunch && f.id % 3 === 1;
  return (
    <g className={cls}>
      {walk && (
        <animateTransform attributeName="transform" type="translate" dur="20s" begin={`${f.id % 11}s`} repeatCount="indefinite"
          values={`0 0; ${walkTo.x - x} ${walkTo.y - y}; ${walkTo.x - x} ${walkTo.y - y}; 0 0; 0 0`} keyTimes="0;0.12;0.22;0.34;1" />
      )}
      <title>{f.name}{f.keyRole ? ` · ${t(`role.${f.keyRole}`)}` : ""}{f.tired ? ` · ${t("stage.tired")}` : ""}</title>
      {f.happy && !f.tired && <path d={`M${x - 6} ${y + 10} l-5 -7 M${x + 6} ${y + 10} l5 -7`} className="fig-arms" />}
      {sprite ? (
        // CC0-Figur (data/gfx/stage.json): fester Typ je Person, Rückansicht in der Reihe vor dem Tisch.
        <image href={asset(`${sprite}-${back ? "back" : "front"}.png`)} x={x - size / 2} y={head - 7} width={size} height={size} className="fig-sprite" />
      ) : (
        <>
          <rect x={x - 6} y={y + 8} width="12" height="14" rx="4" className="fig-body" />
          <circle cx={x} cy={head} r="6" className="fig-head" />
        </>
      )}
      {f.keyRole && (sprite
        ? <ellipse cx={x} cy={head + size - 9} rx={size / 3} ry="3" className="fig-ring" />
        : <circle cx={x} cy={head} r="8.5" className="fig-ring" />)}
    </g>
  );
}

/** Rechner je Epoche (S11 8.3: die Bühne zeigt den Stand der Technik); veraltete Geräte sind sichtbar kaputt (Riss, Rauch). */
function Computer({ x, y, epoch, broken, smoke }: { x: number; y: number; epoch: string; broken: boolean; smoke: boolean }) {
  const scr = `stage-screen pc-screen-${epoch}${broken ? " pc-broken" : ""}`;
  const crack = (sx: number, sy: number, w: number, h: number) => broken && (
    <path d={`M${sx + w * 0.2} ${sy} l${w * 0.25} ${h * 0.45} l${-w * 0.1} ${h * 0.2} l${w * 0.35} ${h * 0.35}`} className="pc-crack" />
  );
  let body: React.ReactNode;
  if (epoch === "80") body = (<>
    <rect x={x - 1} y={y + 1} width="24" height="14" rx="2" className="pc-case pc-case-beige" />
    <rect x={x + 3} y={y + 3} width="16" height="9" rx="2" className={scr} />{crack(x + 3, y + 3, 16, 9)}
    <rect x={x - 3} y={y + 16} width="28" height="4" rx="1" className="pc-case pc-case-beige" />
  </>);
  else if (epoch === "90") body = (<>
    <rect x={x - 2} y={y + 1} width="20" height="16" rx="3" className="pc-case pc-case-beige" />
    <rect x={x + 1} y={y + 3} width="14" height="11" rx="2" className={scr} />{crack(x + 1, y + 3, 14, 11)}
    <rect x={x + 20} y={y + 1} width="7" height="19" rx="1" className="pc-case pc-case-beige" />
    <rect x={x + 21} y={y + 4} width="5" height="2" className="pc-slot" />
  </>);
  else if (epoch === "00") body = (<>
    <rect x={x - 2} y={y + 1} width="26" height="15" rx="2" className="pc-case pc-case-silver" />
    <rect x={x + 1} y={y + 3} width="20" height="11" rx="1" className={scr} />{crack(x + 1, y + 3, 20, 11)}
    <rect x={x + 8} y={y + 16} width="6" height="4" className="pc-case pc-case-silver" />
  </>);
  else if (epoch === "10") body = (<>
    <rect x={x - 4} y={y + 1} width="30" height="15" rx="1" className="pc-case pc-case-black" />
    <rect x={x - 3} y={y + 2} width="28" height="12" className={scr} />{crack(x - 3, y + 2, 28, 12)}
    <rect x={x + 9} y={y + 16} width="4" height="4" className="pc-case pc-case-black" />
  </>);
  else body = (<>
    {[-5, 12].map((dx) => (
      <g key={dx}>
        <rect x={x + dx} y={y + 2} width="15" height="11" rx="1" className="pc-case pc-case-black" />
        <rect x={x + dx + 1} y={y + 3} width="13" height="9" className={scr} />{crack(x + dx + 1, y + 3, 13, 9)}
      </g>
    ))}
    <rect x={x + 8} y={y + 13} width="6" height="7" className="pc-case pc-case-black" />
  </>);
  return (
    <g className="pc">
      {body}
      {broken && smoke && <g className="pc-smoke"><circle cx={x + 6} cy={y} r="3" /><circle cx={x + 10} cy={y - 5} r="4" /></g>}
    </g>
  );
}

/** Tisch mit Projekt-Schild, Mini-Fortschritt und Figurengruppe. */
function Table({ table, x, y, index, epoch, brokenTenths, t, coffee, onOpen }: { table: StageView["tables"][number]; x: number; y: number; index: number; epoch: string; brokenTenths: number; t: T; coffee: { x: number; y: number } | null; onOpen?: () => void }) {
  const label = table.kind === "project" ? table.label : t(`stage.table.${table.kind}`);
  const figs = table.figures.slice(0, PER_TABLE);
  const open = table.kind === "project" && onOpen;
  return (
    <g className={`stage-table stage-table-${table.kind}${open ? " stage-clickable" : ""}`} {...(open ? {
      role: "button", tabIndex: 0, onClick: onOpen, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") onOpen(); },
      "aria-label": t("stage.openProject", { title: table.label }),
    } : {})}>
      {figs.map((f, i) => <Figure key={f.id} f={f} t={t} walkTo={coffee} back={i >= 4} x={x + 20 + (i % 4) * 36} y={i < 4 ? y + 26 : y + 90} />)}
      <rect x={x} y={y + 50} width="150" height="30" rx="4" className="stage-desk" />
      {Array.from({ length: Math.min(4, Math.max(1, figs.length)) }, (_, i) => (
        // Veraltete Hardware: ein fester Anteil der Plätze zeigt ein kaputtes Gerät (gestreut, nicht am Stück).
        <Computer key={i} x={x + 9 + i * 36} y={y + 50} epoch={epoch} broken={((index * 4 + i) * 7) % 10 < brokenTenths} smoke={coffee !== null} />
      ))}
      {table.figures.length > PER_TABLE && <text x={x + 146} y={y + 112} textAnchor="end" className="stage-name">+{table.figures.length - PER_TABLE}</text>}
      <rect x={x} y={y - 6} width="150" height="16" rx="3" className="stage-sign" />
      {table.genre && <Icon kind="genre" id={table.genre} x={x + 3} y={y - 4} size="12" />}
      <text x={x + (table.genre ? 18 : 6)} y={y + 6} className="stage-sign-text">{label.length > 20 ? `${label.slice(0, 19)}…` : label}{table.team ? ` · ${table.team}` : ""}</text>
      {table.progressBp !== null && <rect x={x} y={y + 11} width={Math.round((150 * table.progressBp) / 10000)} height="3" className="stage-progress" />}
      {table.progressBp !== null && (
        <text x={x + 75} y={y + 77} textAnchor="middle" className="stage-status">{Math.round(table.progressBp / 100)} %{table.bugs !== null ? ` · ${table.bugs} Bugs` : ""}</text>
      )}
    </g>
  );
}

/** Bühne (UI-R70, Plan A): Kulisse nach Grundriss und Epoche, Tische je Projekt, Requisiten als Symptome (S11 8.3). */
function Stage({ view, t, onOpenProjects }: { view: ViewModel; t: T; onOpenProjects: () => void }) {
  const st = view.stage;
  const cols = 3;
  const w = 540;
  const rows = Math.max(1, Math.ceil(st.tables.length / cols));
  const top = 96;
  const h = top + rows * 130 + 30;
  const p = st.props;
  const old = p.oldHardwarePct !== null;
  // Anteil veralteter Geräte in Zehnteln (Sprechblase nennt dieselbe Zahl in Prozent).
  const brokenTenths = old ? Math.round((100 - (p.oldHardwarePct ?? 100)) / 10) : 0;
  const windows = WINDOWS[st.layout] ?? 4;
  const still = reducedMotion();
  const coffee = { x: w - 48, y: top - 4 };
  return (
    <svg className={`stage stage-${st.layout} stage-${st.epoch}${p.crunch ? " stage-crunching" : ""}`} viewBox={`0 0 ${w} ${h}`} role="img"
      aria-label={t("stage.label", { office: t(`office.${st.office}`), n: view.people.length })}>
      <rect x="0" y="0" width={w} height={h} className="stage-floor" rx="8" />
      <rect x="0" y="0" width={w} height="52" className="stage-wall" rx="8" />
      {st.layout === "garage" && <rect x="20" y="8" width={w - 40} height="36" className="stage-door" rx="3" />}
      {st.layout === "campus" && Array.from({ length: 5 }, (_, i) => <rect key={i} x={20 + i * 104} y="8" width="90" height="36" className="stage-building" rx="2" />)}
      {Array.from({ length: windows }, (_, i) => (
        <rect key={i} x={20 + i * ((w - 40) / windows) + 6} y="12" width={(w - 40) / windows - 12} height="28" className="stage-window" rx="3" />
      ))}
      {p.rooms.map((r, i) => (
        <g key={r}>
          <rect x={w - 70 - i * 64} y="54" width="54" height="22" rx="2" className="stage-roomdoor" />
          <title>{t(`room.${r}`)}</title>
          {iconForRoom(r)
            ? <image href={iconPath(iconForRoom(r)!)} x={w - 51 - i * 64} y="57" width="16" height="16" className="stage-roomicon" />
            : <text x={w - 43 - i * 64} y="69" textAnchor="middle" className="stage-room-text">{t(`room.${r}`).slice(0, 9)}</text>}
          {/* 5.15: Serverraum auf der Bühne, blinkende Lämpchen solange er läuft. */}
          {(r === "serverraum" || r === "rechenzentrum") && [0, 1, 2].map((k) => (
            <rect key={k} x={w - 66 - i * 64 + k * 6} y="57" width="3" height="3" className={still ? "stage-led" : "stage-led stage-led-on"} style={{ animationDelay: `${k * 0.3}s` }} />
          ))}
        </g>
      ))}
      {/* CC0-Pflanzen an der Wand, ab dem ersten richtigen Büro (data/gfx/stage.json). */}
      {st.layout !== "garage" && stageGfx.plants.map((src, i) => (
        <image key={src} href={asset(src)} x={i === 0 ? 4 : w - 4 - stageGfx.plantSize} y={52 - stageGfx.plantSize + 4} width={stageGfx.plantSize} height={stageGfx.plantSize} className="stage-plant" />
      ))}
      {st.tables.length === 0 && <text x={w / 2} y={top + 60} textAnchor="middle" className="stage-name">{t("stage.empty")}</text>}
      <g className="stage-coffee"><title>{t("stage.coffee")}</title>
        <rect x={w - 34} y={top - 14} width="20" height="28" rx="3" />
        <rect x={w - 30} y={top - 8} width="12" height="6" className="stage-coffee-light" />
        {!still && <path d={`M${w - 26} ${top - 18} q 3 -5 0 -10`} className="stage-steam" />}
      </g>
      {st.tables.map((tb, i) => <Table key={`${tb.kind}${i}`} table={tb} index={i} epoch={st.epoch} brokenTenths={brokenTenths} t={t} coffee={still ? null : coffee} onOpen={onOpenProjects} x={20 + (i % cols) * 172} y={top + Math.floor(i / cols) * 130} />)}
      {Array.from({ length: Math.min(6, p.extraDesks) }, (_, i) => (
        <rect key={`x${i}`} x={20 + i * 40} y={h - 24} width="32" height="14" rx="2" className="stage-desk stage-extra"><title>{t("stage.crowded", { n: p.extraDesks })}</title></rect>
      ))}
      {p.boxes && (
        <g className="stage-boxes"><title>{t("stage.boxes")}</title>
          {[[w - 70, h - 38], [w - 40, h - 38], [w - 55, h - 66]].map(([bx, by]) => (
            <image key={`${bx}-${by}`} href={asset(stageGfx.boxes)} x={bx} y={by} width="30" height="30" className="stage-plant" />
          ))}
        </g>
      )}
      {p.crunch && (
        <g className="stage-pizza"><title>{t("stage.crunch")}</title>
          <rect x={w / 2 - 20} y={h - 22} width="26" height="6" /><rect x={w / 2 - 16} y={h - 28} width="26" height="6" />
        </g>
      )}
      {old && !displayPrefs().bubblesMuted && (
        <g className="stage-bubble">
          <rect x="16" y="58" width="200" height="20" rx="10" />
          <text x="116" y="72" textAnchor="middle">{t("stage.oldHardware", { n: 100 - (p.oldHardwarePct ?? 100) })}</text>
        </g>
      )}
      {p.hit && Array.from({ length: 24 }, (_, i) => (
        <rect key={`c${i}`} x={(i * 97) % w} y={10 + ((i * 53) % (h - 20))} width="5" height="5" className={`confetti confetti-${i % 3}`} transform={`rotate(${(i * 37) % 90} ${(i * 97) % w} ${10 + ((i * 53) % (h - 20))})`} />
      ))}
      {st.hidden > 0 && <text x={w - 10} y={h - 8} textAnchor="end" className="stage-name">{t("stage.hidden", { n: st.hidden })}</text>}
    </svg>
  );
}

/** Spieltest „Was gibt es“: freigeschaltete Bereiche und was als Nächstes kommt, mit Fortschritt zur Schwelle. */
function progressOf(it: ViewModel["roadmap"][number]): number {
  if (it.waiting) return 2;
  const n = it.needs[0];
  return n ? Math.min(1, n.current / Math.max(1, n.value)) : 0;
}

function Roadmap({ view, t }: { view: ViewModel; t: T }) {
  // Prüfung Fable 03.11.2026: nur die nächsten drei geschlossenen Bereiche; die offenen als eine Zeile; ab der fünften Freischaltung eingeklappt.
  const done = view.roadmap.filter((i) => i.unlocked);
  const locked = view.roadmap.filter((i) => !i.unlocked).sort((a, b) => progressOf(b) - progressOf(a) || a.id.localeCompare(b.id));
  const items = locked.slice(0, 3);
  return (
    <details className="roadmap" open={done.length < 5 && locked.length > 0}>
      <summary><strong>{t("roadmap.title")}</strong> <span className="muted small">{t("roadmap.count", { n: done.length, max: view.roadmap.length })}</span></summary>
      {done.length > 0 && <p className="small muted">✓ {done.map((i) => t(`unlock.${i.id}`)).join(" · ")}</p>}
      <ul className="roadmap-list">
        {items.map((it) => (
          <li key={it.id} className={it.unlocked ? "rm-on" : "rm-off"}>
            <span className="rm-icon" aria-label={t(it.unlocked ? "roadmap.open" : "roadmap.locked")}>{it.unlocked ? "✓" : "○"}</span>
            <div>
              <strong>{t(`unlock.${it.id}`)}</strong>
              <span className="small muted rm-desc">{t(`roadmap.desc.${it.id}`)}</span>
              {!it.unlocked && (
                <span className="small rm-need">
                  {it.waiting ? t("roadmap.waiting")
                    : it.needs.length === 0 ? t(`roadmap.hint.${it.id}`)
                    : it.needs.map((n) => t(`roadmap.need.${n.field}`, { cur: Math.min(n.current, n.value), n: n.value })).join(` ${t(it.any ? "roadmap.or" : "roadmap.and")} `)}
                </span>
              )}
              {!it.unlocked && !it.waiting && it.needs[0] && it.needs[0].field !== "jahr" && (
                <span className="rm-bar"><span style={{ width: `${Math.min(100, (it.needs[0].current / Math.max(1, it.needs[0].value)) * 100)}%` }} /></span>
              )}
            </div>
          </li>
        ))}
      </ul>
      {locked.length > items.length && <p className="small muted">{t("roadmap.later", { n: locked.length - items.length })}</p>}
    </details>
  );
}

export function Zentrale({ view, sim, t, lang, onOpenProjects }: { view: ViewModel; sim: Sim; t: T; lang: Lang; onOpenProjects: () => void }) {
  const f = view.finance;
  const weeksLeft = view.weeklyCostCent > 0 ? Math.floor(view.moneyCent / view.weeklyCostCent) : 99;
  const cash: Light = f.insolvencyMonths > 0 ? "rot" : weeksLeft < 8 ? "gelb" : "gruen";
  const next = [...view.active].filter((p) => p.remainingWeeks !== null).sort((a, b) => (a.remainingWeeks ?? 0) - (b.remainingWeeks ?? 0))[0];
  const last = view.products[0];
  const lead = view.catalog.platforms[0];
  return (
    <section className="panel" aria-labelledby="zentrale-title">
      <h2 id="zentrale-title">{t("view.zentrale")}</h2>
      <div className="tiles">
        <Tile t={t} title={t("tile.cash")} value={fmtMoney(view.moneyCent, lang)} light={cash}
          line={f.insolvencyMonths > 0 ? t("finance.insolvencyShort", { n: f.insolvencyMonths, max: f.toleranceMonths }) : t("tile.cashLine", { n: Math.max(0, weeksLeft) })} />
        <Tile t={t} title={t("tile.projects")} value={String(view.active.length)} light={view.active.some((p) => p.people.length === 0) ? "gelb" : "gruen"}
          line={next ? t("tile.projectsLine", { title: next.title, n: next.remainingWeeks ?? 0 })
            : view.active.length > 0 ? t("tile.projectsIdle", { n: view.active.length }) : t("tile.projectsNone")} />
        <Tile t={t} title={t("tile.team")} value={t("tile.teamValue", { n: view.people.length })} light={view.people.some((p) => p.assignment === null) ? "gelb" : "gruen"}
          line={t("tile.teamLine", { free: view.people.filter((p) => p.assignment === null).length, max: view.maxPersons })} />
        <Tile t={t} title={t("tile.last")} value={last?.result ? fmtScore(last.result.scoreBp, lang) : "–"}
          light={!last?.result ? "gelb" : last.result.scoreBp >= 60000 ? "gruen" : last.result.scoreBp >= 45000 ? "gelb" : "rot"}
          line={last ? last.title : t("tile.lastNone")} />
        {lead && (
          <Tile t={t} title={t("tile.platform")} value={t(`platform.${lead.id}`)} light="gruen"
            line={t("form.base", { n: (Math.round(lead.base / 100000) / 10).toLocaleString(lang === "de" ? "de-DE" : "en-US") })} />
        )}
      </div>
      <MotivationBox view={view} sim={sim} t={t} lang={lang} />
      <ProjectPulseList view={view} t={t} onOpen={onOpenProjects} />
      <Stage view={view} t={t} onOpenProjects={onOpenProjects} />
      <Roadmap view={view} t={t} />
    </section>
  );
}
