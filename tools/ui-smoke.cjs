/* global require, process, console, document, window, getComputedStyle, localStorage */
// Spieltest-Vorbereitung: lädt Bot-Spielstände (npm run playsave) im Browser und klickt jede Ansicht samt Unterseiten
// durch. Meldet Skriptfehler, Rohtexte (fehlende Übersetzungen), NaN/undefined, waagrechten Bildlauf und zu breite
// Elemente. Voraussetzung: npm run dev auf Port 5199 (URL), Spielstände in SAVE_DIR.
// Aufruf: SAVES=konzern-2020,mmo-2015 LANG_UI=en npm run ui:smoke
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chromium } = require("playwright");
const LANG = process.env.LANG_UI || "de";
const saves = (process.env.SAVES || "konzern-1990,konzern-2005,mmo-2015,konzern-2020,konzern-2035").split(",");
const W = Number(process.env.W || 1280), H = Number(process.env.H || 800);
(async () => {
  const b = await chromium.launch();
  const report = [];
  for (const sv of saves) {
    const p = await b.newPage({ viewport: { width: W, height: H } });
    const errs = [];
    p.on("pageerror", (e) => errs.push("pageerror " + String(e).slice(0, 300)));
    p.on("console", (m) => { if (m.type() === "error") errs.push("console " + m.text().slice(0, 300)); });
    try {
      await p.goto(process.env.URL || "http://localhost:5199/");
      await p.evaluate((l) => { localStorage.clear(); localStorage.setItem("gst.lang", l); }, LANG);
      await p.reload();
      await p.waitForSelector(".start");
      await p.click(".start button.primary");
      await p.waitForSelector(".sidebar", { timeout: 15000 });
      // Spielstände öffnen und importieren
      await p.locator(".topbar button").first().click();
      await p.setInputFiles(".save-import input[type=file]", `${process.env.SAVE_DIR || "saves"}/${sv}.json.gz`);
      await p.waitForTimeout(2500);
      const closeOverlays = async () => {
        for (let k = 0; k < 6; k++) {
          const o = p.locator(".overlay button.primary, .overlay .studio-head button, [role=dialog] button.primary");
          if (!(await o.count())) break;
          await o.first().click({ timeout: 2000 }).catch(() => {});
          await p.waitForTimeout(200);
        }
      };
      await closeOverlays();
      const top = (await p.locator(".topbar").innerText()).replace(/\n/g, " | ").slice(0, 140);
      const views = [];
      const navCount = await p.locator(".sidebar button").count();
      for (let i = 0; i < navCount; i++) {
        await closeOverlays();
        const nav = p.locator(".sidebar button").nth(i);
        const name = (await nav.innerText()).trim().split("\n")[0];
        await nav.click({ timeout: 5000 }).catch(() => errs.push("navclick " + name));
        await p.waitForTimeout(400);
        const subs = await p.locator(".subtabs button").count();
        for (let j = 0; j < Math.max(1, subs); j++) {
          let sub = "";
          if (subs) { const sb = p.locator(".subtabs button").nth(j); sub = (await sb.innerText()).trim(); await sb.click({ timeout: 5000 }).catch(() => errs.push("subclick " + sub)); await p.waitForTimeout(300); }
          const info = await p.evaluate(() => {
            const main = document.querySelector(".main");
            const txt = main?.innerText || "";
            const over = [...document.querySelectorAll(".main *")].filter((el) => {
              const cs = getComputedStyle(el); if (cs.overflow === "hidden" || cs.textOverflow === "ellipsis") return false;
              return el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && cs.overflowX !== "auto" && cs.overflowX !== "scroll";
            }).slice(0, 5).map((el) => el.tagName + "." + el.className.toString().slice(0, 30) + " " + el.scrollWidth + ">" + el.clientWidth);
            return {
              scroll: document.documentElement.scrollWidth > window.innerWidth + 1,
              len: txt.length,
              keys: [...new Set((document.body.innerText.match(/\b[a-z]+(\.[a-zA-Z0-9]+){1,4}\b/g) || []).filter((k) => !/^\d|\.(de|com|io|org|png|json|gz)$/.test(k)))].slice(0, 8),
              bad: (txt.match(/.{0,30}(NaN|undefined|\[object Object\]|Infinity|null \$).{0,20}/g) || []).slice(0, 3),
              over,
            };
          });
          await p.screenshot({ path: `${process.env.SHOT_DIR || "reports/ui-smoke"}/${LANG}-${W}-${sv}-${i}-${j}.png`, fullPage: true });
          views.push({ name, sub, ...info });
        }
      }
      report.push({ sv, top, errs: [...new Set(errs)].slice(0, 12), problems: views.filter((v) => v.scroll || v.bad.length || v.keys.length || v.len < 60 || v.over.length), all: views.map((v) => v.name + (v.sub ? "/" + v.sub : "")).join(", ") });
    } catch (e) { report.push({ sv, fatal: String(e).slice(0, 400), errs: [...new Set(errs)] }); }
    await p.close().catch(() => {});
  }
  console.log(JSON.stringify(report, null, 1));
  await b.close();
})();
