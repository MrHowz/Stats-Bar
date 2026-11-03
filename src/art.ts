import { pixelText } from "./pixel-font.ts";
import type { Settings, Stats } from "./model.ts";

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
const rect = (x: number, y: number, w: number, h: number, c: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
export function barSvg(
  s: Stats,
  settings: Settings,
  options: {
    numbers?: boolean;
    segmented?: boolean;
    name?: string;
    decayStage?: number;
  } = {},
): string {
  const p = s.maxHp > 0 ? Math.min(1, Math.max(0, s.hp / s.maxHp)) : 0;
  const top = options.name ? 14 : 0;
  // The original layout is retained, with a thinner continuous metal rim.
  let shape = '<path fill="#0a131e" d="M31 10h190l6 6v15l-6 6H31Z"/>';
  shape += '<path fill="#718d9d" d="M32 12h188l4 4v14l-4 5H32Z"/>';
  shape += '<path fill="#c5d6df" d="M33 12h187l3 3H33Z"/>';
  shape += '<path fill="#354c60" d="M33 32h187l4-3v3l-4 3H33Z"/>';
  shape += rect(39, 12, 181, 22, "#0c1722");
  shape += rect(41, 13, 177, 1, "#223546");
  const fill = 177 * p;
  if (fill) shape += `<g transform="translate(41 13)">${hpFillShape(fill)}</g>`;
  shape += '<path fill="#0a131e" d="M13 6h16l7 7v20l-7 7H13l-7-7V13Z"/>';
  shape += '<path fill="#708c9d" d="M14 8h14l6 6v18l-6 6H14l-6-6V14Z"/>';
  shape += '<path fill="#c5d6df" d="M14 8h14l4 4H15l-5 5v14H8V14Z"/>';
  shape += '<path fill="#3c5367" d="m8 31 6 7h14l6-6v-5l-5 7H15l-7-6Z"/>';
  shape += '<path fill="#243c4c" d="M16 12h10l5 5v12l-5 5H16l-5-5V17Z"/>';
  shape += '<path shape-rendering="geometricPrecision" fill="#0d1822" d="M21 32.5c-3-2.4-10-7-10-12.4a5.5 5.5 0 0 1 10-3.1 5.5 5.5 0 0 1 10 3.1c0 5.4-7 10-10 12.4Z"/>';
  shape += '<path shape-rendering="geometricPrecision" fill="#f04758" d="M21 30c-3-2.4-8-6-8-10a3.6 3.6 0 0 1 6.5-2.1l1.5 1.8 1.5-1.8A3.6 3.6 0 0 1 29 20c0 4-5 7.6-8 10Z"/>';
  shape += '<path shape-rendering="geometricPrecision" fill="none" stroke="#ffadb4" stroke-width="1.2" stroke-linecap="round" d="M15.2 20c0-1.7 1.2-2.6 2.5-1.8"/>';
  const numbers = options.numbers ?? settings.showNumbers;
  if (numbers && s.maxHp > 0)
    shape += pixelText(`${s.hp} / ${s.maxHp}`, 130, 23, 174, 16);
  let badges = "";
  const badgeY = s.maxHp > 0 ? 43 : 0;
  if (s.tempHp > 0) {
    const x = s.ac > 0 ? 129 : 180;
    badges += `<g transform="translate(${x} ${badgeY}) scale(${12/7})" shape-rendering="geometricPrecision">${badgeShape("temp")}${pixelText(String(s.tempHp), 14, 14, 18.6666666667, 11.6666666667)}</g>`;
  }
  if (s.ac > 0)
    badges += `<g transform="translate(180 ${badgeY}) scale(${12/7})" shape-rendering="geometricPrecision">${badgeShape("ac")}${pixelText(String(s.ac), 14, 14, 18.6666666667, 11.6666666667)}</g>`;
  const name = options.name
    ? `<text x="116" y="10" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#fff5df" stroke="#10171a" stroke-width="3" paint-order="stroke">${esc(options.name.slice(0, 32))}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="928" height="${((s.tempHp || s.ac ? badgeY + 48 : 46) + top) * 4}" viewBox="0 0 232 ${(s.tempHp || s.ac ? badgeY + 48 : 46) + top}" shape-rendering="crispEdges">${name}<g transform="translate(0 ${top})">${s.maxHp > 0 ? shape : ""}${badges}</g></svg>`;
}
export const svgUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function badgeShape(kind: "temp" | "ac"): string {
  const rim = `<defs><linearGradient id="${kind}-rim" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#e0edf2"/><stop offset=".4" stop-color="#91acbb"/><stop offset="1" stop-color="#425d72"/></linearGradient><linearGradient id="${kind}-face" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${kind === "temp" ? "#78c995" : "#749cbc"}"/><stop offset=".5" stop-color="${kind === "temp" ? "#3d9564" : "#3c6384"}"/><stop offset="1" stop-color="${kind === "temp" ? "#1e5740" : "#223f5b"}"/></linearGradient></defs>`;
  if (kind === "temp") {
    const heart = "M14 26.8C10.5 24.4 1.3 18.2 1.3 10a7.1 7.1 0 0 1 12.7-4.3A7.1 7.1 0 0 1 26.7 10c0 8.2-9.2 14.4-12.7 16.8Z";
    return rim + `<path d="${heart}" fill="url(#temp-rim)" stroke="#0b1923" stroke-width="1.2"/><path d="${heart}" transform="translate(14 14) scale(.82) translate(-14 -14)" fill="url(#temp-face)" stroke="#24543e" stroke-width=".5"/><path d="M4.9 9.3c.2-3.1 3.1-4.6 5.5-2.7" fill="none" stroke="#c1edc8" stroke-width=".8" stroke-linecap="round"/>`;
  }
  return rim + '<path d="M14 1.2c4.3 2.3 8.5 2.8 12 3v9.2c0 6.4-5.8 10.5-12 13.4C7.8 23.9 2 19.8 2 13.4V4.2c3.5-.2 7.7-.7 12-3Z" fill="url(#ac-rim)" stroke="#0b1923" stroke-width="1.2"/><path d="M14 4.3c3.3 1.5 6.6 2.1 9.2 2.4v6.5c0 4.8-4.1 8-9.2 10.6-5.1-2.6-9.2-5.8-9.2-10.6V6.7c2.6-.3 5.9-.9 9.2-2.4Z" fill="url(#ac-face)" stroke="#375c78" stroke-width=".5"/><path d="M5.9 11.5V7.8c2.8-.4 5.3-1.1 8.1-2.3" fill="none" stroke="#c1d8e8" stroke-width=".8" stroke-linecap="round"/>';
}

export function hpFillShape(width = 177): string {
  return `<defs><linearGradient id="hp-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f36571"/><stop offset=".2" stop-color="#ea3a4d"/><stop offset=".65" stop-color="#d7273c"/><stop offset="1" stop-color="#a91930"/></linearGradient></defs><rect width="${width}" height="20" fill="url(#hp-fill)"/><rect y="1" width="${width}" height="1" fill="#ffa0a8" fill-opacity=".65"/><rect y="18" width="${width}" height="2" fill="#86192d" fill-opacity=".6"/>`;
}
