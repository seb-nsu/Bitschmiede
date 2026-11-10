// Lange Listen kürzen (Übersichtlichkeit): zeigt die ersten n Einträge und einen Schalter „Alle anzeigen“.
import { type ReactNode, useState } from "react";
import type { T } from "./texts";

export function useLimit<X>(items: X[], limit: number, t: T): { shown: X[]; toggle: ReactNode } {
  const [all, setAll] = useState(false);
  if (items.length <= limit) return { shown: items, toggle: null };
  return {
    shown: all ? items : items.slice(0, limit),
    toggle: (
      <button type="button" className="linklike small more" onClick={() => setAll(!all)}>
        {all ? t("more.less") : t("more.all", { n: items.length })}
      </button>
    ),
  };
}
