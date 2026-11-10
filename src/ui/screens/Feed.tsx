// Spieltest nach Etappe 4: Meldungen laufen nebenher. Neue Berichtszeilen und Entscheidungen, die nicht anhalten,
// erscheinen kurz am Rand und verschwinden von selbst; der Bericht und die Entscheidungen bleiben die Quelle.
import { useEffect, useRef, useState } from "react";
import type { ViewModel } from "../../sim/view/view";
import type { Lang, T } from "../texts";
import { eventTitle, logText } from "./Focus";
import { GfxIcon, iconForEvent, iconForLog, type GfxIconName } from "../gfx";

const SHOW_MS = 6000;
const MAX = 3;
/** Routinezeilen bleiben im Bericht. */
const QUIET = new Set(["log.expired"]);

interface Item { id: string; text: string; kind: "log" | "decision"; icon: GfxIconName | null }

function logId(l: ViewModel["log"][number]): string {
  return `${l.week}|${l.key}|${JSON.stringify(l.params)}`;
}

export function NewsFeed({ view, t, lang }: { view: ViewModel; t: T; lang: Lang }) {
  const [items, setItems] = useState<Item[]>([]);
  const seen = useRef<{ log: Set<string>; events: Set<number> } | null>(null);

  useEffect(() => {
    const logIds = view.log.map(logId);
    if (seen.current === null) {
      // Beim Laden nichts nachmelden.
      seen.current = { log: new Set(logIds), events: new Set(view.events.map((e) => e.id)) };
      return;
    }
    const s = seen.current;
    const fresh: Item[] = [];
    view.log.forEach((l, i) => {
      if (!s.log.has(logIds[i]!) && !QUIET.has(l.key)) fresh.push({ id: `l${logIds[i]}`, text: logText(l, t, lang), kind: "log", icon: iconForLog(l.key) });
    });
    for (const e of view.events) {
      if (!s.events.has(e.id) && !e.pauses) fresh.push({ id: `e${e.id}`, text: t("feed.decision", { title: eventTitle(e, t), n: e.weeksLeft }), kind: "decision", icon: iconForEvent(e.kind) });
    }
    s.log = new Set(logIds);
    s.events = new Set(view.events.map((e) => e.id));
    if (fresh.length === 0) return;
    setItems((cur) => [...cur, ...fresh.reverse()].slice(-MAX));
    const ids = new Set(fresh.map((f) => f.id));
    setTimeout(() => setItems((cur) => cur.filter((x) => !ids.has(x.id))), SHOW_MS);
  }, [view.log, view.events, t, lang]);

  if (items.length === 0) return null;
  return (
    <div className="feed" role="status" aria-live="polite">
      {items.map((it) => <div key={it.id} className={`feed-item feed-${it.kind}`}><GfxIcon name={it.icon} />{it.kind === "decision" && !it.icon ? "◆ " : ""}{it.text}</div>)}
    </div>
  );
}
