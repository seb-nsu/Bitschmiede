// TEC-R88: Erst die Oberfläche rechnet bp und Cent in Anzeigewerte um.
import type { Lang } from "./texts";

const locale = (lang: Lang) => (lang === "de" ? "de-DE" : "en-US");

/** Wertung mit einer Nachkommastelle, z. B. 7,4. */
export function fmtScore(bp: number, lang: Lang): string {
  return (Math.trunc(bp / 1000) / 10).toLocaleString(locale(lang), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Balken mit Vorzeichen und zwei Nachkommastellen, z. B. +0,35 oder −1,20. */
export function fmtBar(bp: number, lang: Lang): string {
  const v = (bp / 10000).toLocaleString(locale(lang), { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "always" });
  return v.replace("-", "−");
}

/** Faktoren mit zwei Nachkommastellen. */
export function fmtFactor(bp: number, lang: Lang): string {
  return (bp / 10000).toLocaleString(locale(lang), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Prozent mit einer Nachkommastelle. */
export function fmtPct(bp: number, lang: Lang): string {
  return (bp / 10000).toLocaleString(locale(lang), { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

/** ZIE-R43: Zahlenformat kurz (1,2 Mio. $) oder voll (1.234.567 $); gesetzt von den Darstellungs-Einstellungen. */
let numberMode: "kurz" | "voll" = "voll";

export function setNumberMode(mode: "kurz" | "voll"): void {
  numberMode = mode;
}

/** Geld im gewählten Format; kurz erst ab 10.000 $, darunter bleibt es genau. */
export function fmtMoney(cent: number, lang: Lang): string {
  if (numberMode === "kurz" && Math.abs(cent) >= 1_000_000) {
    return (cent / 100).toLocaleString(locale(lang), { style: "currency", currency: "USD", notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 });
  }
  return fmtMoneyFull(cent, lang);
}

/** Immer kurz (ab 10.000 $), für enge Stellen wie Monatsbalken; der volle Wert gehört dann in den Tooltip. */
export function fmtMoneyShort(cent: number, lang: Lang): string {
  if (Math.abs(cent) < 1_000_000) return fmtMoneyFull(cent, lang);
  return (cent / 100).toLocaleString(locale(lang), { style: "currency", currency: "USD", notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 });
}

/** ZIE-R43: Tooltips zeigen immer den vollen Wert. */
export function fmtMoneyFull(cent: number, lang: Lang): string {
  return (cent / 100).toLocaleString(locale(lang), { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function fmtInt(n: number, lang: Lang): string {
  return n.toLocaleString(locale(lang));
}

/** Q-Punkte mit einer Nachkommastelle. */
export function fmtQ(bp: number, lang: Lang): string {
  return (bp / 10000).toLocaleString(locale(lang), { maximumFractionDigits: 1 });
}
