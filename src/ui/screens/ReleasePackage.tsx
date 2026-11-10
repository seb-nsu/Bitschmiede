// S05 Abschnitt 8, MKT-R09, MKT-R27: Release-Paket, vorbelegt vom Autopiloten, eine Bestätigung.
// Termin, Preis, Editionen, Vorbestellungen, Kopierschutz, Vertriebsweg und Beigaben (MKT-V06 bis MKT-V10).
import { useState } from "react";
import type { ProjectView } from "../../sim/view/view";
import type { Sim } from "../useSim";
import { fmtInt, fmtMoney, fmtPct } from "../format";
import type { Lang, T } from "../texts";

const DELAYS = [0, 4, 8, 13, 26];

export function ReleasePackageDialog({ project, sim, t, lang, onClose }: { project: ProjectView; sim: Sim; t: T; lang: Lang; onClose: () => void }) {
  const pkg = project.releasePackage!;
  const d = pkg.defaults;
  const [delay, setDelay] = useState(0);
  const [price, setPrice] = useState(d.priceCent);
  const [deluxe, setDeluxe] = useState(d.deluxe);
  const [collector, setCollector] = useState(d.collectorUnits);
  const [preorders, setPreorders] = useState(d.preorders);
  const [protection, setProtection] = useState(d.protection);
  const [channel, setChannel] = useState(d.channel ?? "distributor");
  const [extras, setExtras] = useState(d.extras ?? false);
  const [dayOne, setDayOne] = useState(project.dayOnePatch);
  // Punkt 9 (BTR-R37): Startkapazität der Server für Live-Produkte.
  const [servers, setServers] = useState(pkg.server?.suggested ?? 0);
  const priceOk = price >= pkg.priceMinCent && price <= pkg.priceMaxCent;
  const prot = pkg.protections.find((p) => p.id === protection);
  const ch = pkg.channels.find((c) => c.id === channel);
  const confirm = () => {
    sim.input({
      type: "release", projectId: project.id, week: d.week + delay, priceCent: price, deluxe, collectorUnits: collector, preorders,
      protection, channel, extras, dayOnePatch: dayOne,
      ...(pkg.server ? { serverCapacity: servers } : {}),
    });
    onClose();
  };
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby={`rp${project.id}`}>
      <div className="panel reveal release-package">
        <h2 id={`rp${project.id}`}>{t("pkg.title", { title: project.title })}</h2>
        <p className="small muted">{t("pkg.hint")}</p>

        <div className="pkg-grid">
          <label>
            {t("pkg.date")}
            <select value={delay} onChange={(e) => setDelay(Number(e.target.value))}>
              {DELAYS.map((w) => <option key={w} value={w}>{w === 0 ? t("pkg.earliest", { week: pkg.earliest.weekOfYear + 1, year: pkg.earliest.year }) : t("pkg.later", { n: w })}</option>)}
            </select>
            {pkg.sameWeek > 0 && delay === 0 && <span className="small error">{t("pkg.sameWeek", { n: pkg.sameWeek })}</span>}
          </label>

          <label>
            {t("pkg.price")}
            {pkg.priceEditable ? (
              <input type="number" min={Math.ceil(pkg.priceMinCent / 100)} max={Math.floor(pkg.priceMaxCent / 100)} value={Math.round(price / 100)}
                onChange={(e) => setPrice(Math.round(Number(e.target.value) * 100))} aria-invalid={!priceOk} />
            ) : <span>{fmtMoney(price, lang)} <span className="small muted">({t("pkg.priceFixed")})</span></span>}
            {pkg.priceEditable && <span className="small muted">{t("pkg.priceRange", { min: fmtMoney(pkg.priceMinCent, lang), max: fmtMoney(pkg.priceMaxCent, lang), std: fmtMoney(d.priceCent, lang) })}</span>}
          </label>

          <label>
            {t("pkg.protection")}
            <select value={protection} onChange={(e) => setProtection(e.target.value)}>
              {pkg.protections.map((p) => <option key={p.id} value={p.id}>{t(`protection.${p.id}`)}{p.id === d.protection ? ` (${t("pkg.auto")})` : ""}</option>)}
            </select>
            {prot && (
              <span className="small muted">
                {t("pkg.protectionInfo", { strength: fmtPct(prot.strengthBp, lang), hold: prot.holdWeeks ? `${prot.holdWeeks[0]}–${prot.holdWeeks[1]}` : "∞" })}
                {prot.satisfaction < 0 && ` · ${t("pkg.satisfaction", { n: -prot.satisfaction })}`}
                {prot.royaltyBp !== null && ` · ${t("pkg.royalty", { share: fmtPct(prot.royaltyBp, lang) })}`}
              </span>
            )}
          </label>

          {pkg.physical && (
            <label>
              {t("pkg.channel")}
              <select value={channel} onChange={(e) => setChannel(e.target.value)}>
                {pkg.channels.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.blocker !== null}>
                    {t(`channel.${c.id}`)}{c.id === d.channel ? ` (${t("pkg.auto")})` : ""}{c.blocker ? ` – ${t(c.blocker)}` : ""}
                  </option>
                ))}
              </select>
              {ch && <span className="small muted">{t("pkg.channelInfo", { share: fmtPct(ch.shareBp, lang), reach: fmtPct(ch.reachBp, lang) })}{ch.returns ? ` · ${t("pkg.returns")}` : ""}</span>}
            </label>
          )}
        </div>

        <fieldset className="pkg-options">
          <legend>{t("pkg.options")}</legend>
          <label className="check"><input type="checkbox" checked={preorders} onChange={(e) => setPreorders(e.target.checked)} /> {t("pkg.preorders")}</label>
          <label className="check"><input type="checkbox" checked={dayOne} onChange={(e) => setDayOne(e.target.checked)} /> {t("pkg.dayOne")}</label>
          {pkg.physical && <label className="check" title={t("pkg.extrasHint", { share: fmtPct(pkg.extrasCostBp, lang) })}><input type="checkbox" checked={extras} onChange={(e) => setExtras(e.target.checked)} /> {t("pkg.extras")}</label>}
          {pkg.editionsAvailable && <label className="check"><input type="checkbox" checked={deluxe} onChange={(e) => setDeluxe(e.target.checked)} /> {t("pkg.deluxe")}</label>}
          {pkg.editionsAvailable && pkg.collectorMax > 0 && (
            <label>
              {t("pkg.collector")}
              <input type="number" min={0} max={pkg.collectorMax} step={1000} value={collector} onChange={(e) => setCollector(Math.max(0, Math.min(pkg.collectorMax, Math.round(Number(e.target.value)))))} />
              <span className="small muted">{t("pkg.collectorMax", { n: fmtInt(pkg.collectorMax, lang) })}</span>
            </label>
          )}
        </fieldset>
        {pkg.server && (
          <fieldset className="pkg-options">
            <legend>{t("pkg.server")}</legend>
            <label>
              {t("pkg.serverRent")}
              <input type="number" min={0} step={pkg.server.rentBlock} value={servers} onChange={(e) => setServers(Math.max(0, Math.round(Number(e.target.value))))} />
              <span className="small muted">{t("pkg.serverHint", { suggested: fmtInt(pkg.server.suggested, lang), own: fmtInt(pkg.server.own, lang) })}</span>
            </label>
          </fieldset>
        )}

        <div className="ending-actions">
          <button type="button" className="primary" disabled={!priceOk} onClick={confirm} autoFocus>{t("pkg.confirm")}</button>
          <button type="button" onClick={onClose}>{t("pkg.cancel")}</button>
        </div>
      </div>
    </div>
  );
}
