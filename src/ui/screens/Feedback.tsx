// Feedback-Formular im Spiel (Wunsch Projektleitung 03.11.2026). Reine Oberfläche: Der Text geht per E-Mail, als
// GitHub-Issue oder über die Zwischenablage an das Team; Empfänger in data/config/feedback.json.
import { useState } from "react";
import config from "../../../data/config/feedback.json";
import type { ViewModel } from "../../sim/view/view";
import type { Lang, T } from "../texts";

const KINDS = ["fehler", "idee", "balancing", "bedienung", "text", "lob"] as const;
type Kind = (typeof KINDS)[number];

export function FeedbackDialog({ view, where, t, lang, onClose }: { view: ViewModel | null; where: string; t: T; lang: Lang; onClose: () => void }) {
  const [kind, setKind] = useState<Kind>("fehler");
  const [place, setPlace] = useState(where);
  const [severity, setSeverity] = useState(3);
  const [text, setText] = useState("");
  const [stars, setStars] = useState(0);
  const [contact, setContact] = useState("");
  const [attach, setAttach] = useState(true);
  const [copied, setCopied] = useState(false);

  const context = view
    // Abschluss 1.0: mehr Kontext für Fehlerberichte (Stand der Firma, Ironman, Fenstergröße).
    ? `seed ${view.seed} · ${view.date.year} W${view.date.weekOfYear + 1} · ${lang} · ${t(`preset.${view.settings.preset}`)}` +
      ` · ${view.people.length}P · ${Math.round(view.moneyCent / 100)} $${view.settings.ironman ? " · ironman" : ""} · ${window.innerWidth}×${window.innerHeight}`
    : `${lang} · ${t("feedback.noGame")}`;
  const subject = `[${t(`feedback.kind.${kind}`)}] ${place}`;
  const body = [
    `${t("feedback.kindLabel")}: ${t(`feedback.kind.${kind}`)}`,
    `${t("feedback.where")}: ${place}`,
    kind === "fehler" ? `${t("feedback.severity")}: ${severity}/5` : null,
    stars > 0 ? `${t("feedback.stars")}: ${"★".repeat(stars)}${"☆".repeat(5 - stars)}` : null,
    contact ? `${t("feedback.contact")}: ${contact}` : null,
    "",
    text,
    "",
    attach ? `— ${context}` : null,
  ].filter((x) => x !== null).join("\n");
  const empty = text.trim().length === 0;
  // Formular-Dienst (Wunsch Projektleitung 03.11.2026): öffnet das Formular mit vorausgefüllten Feldern.
  const formLink = (() => {
    if (!config.formUrl) return null;
    const f = config.formFields as Record<string, string>;
    const values: Record<string, string> = {
      kind: (config.formKindLabels as Record<string, string>)[kind] ?? kind, where: place, severity: kind === "fehler" ? String(severity) : "",
      description: text, stars: stars > 0 ? String(stars) : "", contact, context: attach ? context : "",
    };
    // Mehrere Werte mit derselben Feldnummer werden in diesem einen Feld zusammengefasst.
    const byField = new Map<string, string[]>();
    for (const [k, v] of Object.entries(values)) if (f[k] && v) byField.set(f[k]!, [...(byField.get(f[k]!) ?? []), v]);
    const q = [...byField].map(([id, v]) => `${encodeURIComponent(id)}=${encodeURIComponent(v.join(" · "))}`);
    return `${config.formUrl}${config.formUrl.includes("?") ? "&" : "?"}${["usp=pp_url", ...q].join("&")}`;
  })();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="fb-title" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="reveal panel feedback" onSubmit={(e) => e.preventDefault()}>
        <h2 id="fb-title">{t("feedback.title")}</h2>
        <p className="muted small">{t("feedback.intro")}</p>
        <fieldset className="scope">
          <legend>{t("feedback.kindLabel")}</legend>
          {KINDS.map((k) => (
            <label key={k}><input type="radio" name="fb-kind" checked={kind === k} onChange={() => setKind(k)} /> {t(`feedback.kind.${k}`)}</label>
          ))}
        </fieldset>
        <label>{t("feedback.where")} <input type="text" value={place} onChange={(e) => setPlace(e.target.value)} /></label>
        {kind === "fehler" && (
          <label>
            {t("feedback.severity")} <input type="range" min={1} max={5} value={severity} onChange={(e) => setSeverity(Number(e.target.value))} />{" "}
            <span className="small">{t(`feedback.severity.${severity}`)}</span>
          </label>
        )}
        <label>
          {t("feedback.text")}
          <textarea rows={6} value={text} placeholder={t(kind === "fehler" ? "feedback.textBug" : "feedback.textOther")} onChange={(e) => setText(e.target.value)} />
        </label>
        <div role="group" aria-label={t("feedback.stars")} className="small">
          {t("feedback.stars")}{" "}
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" className="linklike star" aria-pressed={stars >= n} aria-label={t("feedback.starN", { n })} onClick={() => setStars(stars === n ? 0 : n)}>
              {stars >= n ? "★" : "☆"}
            </button>
          ))}
        </div>
        <label>{t("feedback.contact")} <input type="text" value={contact} placeholder={t("feedback.contactHint")} onChange={(e) => setContact(e.target.value)} /></label>
        <label className="small"><input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} /> {t("feedback.attach")} <span className="muted">({context})</span></label>
        <div className="vcard-actions">
          {formLink && (
            <a className={`button primary${empty ? " disabled" : ""}`} aria-disabled={empty} target="_blank" rel="noreferrer" href={empty ? undefined : formLink}>{t("feedback.form")}</a>
          )}{" "}
          {config.email && (
            <a className={`button primary${empty ? " disabled" : ""}`} aria-disabled={empty}
              href={empty ? undefined : `mailto:${config.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>{t("feedback.mail")}</a>
          )}
          {config.issueUrl && (
            <a className={`button${config.email ? "" : " primary"}${empty ? " disabled" : ""}`} aria-disabled={empty} target="_blank" rel="noreferrer"
              href={empty ? undefined : `${config.issueUrl}?title=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>{t("feedback.issue")}</a>
          )}
          <button type="button" className={config.email || config.issueUrl || config.formUrl ? "" : "primary"} disabled={empty} onClick={() => void copy()}>{t(copied ? "feedback.copied" : "feedback.copy")}</button>
          <button type="button" onClick={onClose}>{t("feedback.close")}</button>
        </div>
      </form>
    </div>
  );
}
