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
  const stage =
    options.decayStage ??
    (settings.decay
      ? p === 0
        ? 4
        : p <= 0.25
          ? 3
          : p <= 0.5
            ? 2
            : p < 1
              ? 1
              : 0
      : 0);
  const top = options.name ? 14 : 0;
  // Slim stepped stone frame; the red channel occupies most of its height.
  let shape = '<path fill="#080c0e" d="M10 7h23v3h188v4h6v20h-6v4H33v3H10v-4H5V11h5z"/>';
  shape += '<path fill="#5f7c89" d="M11 10h20v3h188v4h5v14h-5v4H31v3H11v-4H8V14h3z"/>';
  shape += '<path fill="#95aab1" d="M12 10h18v3h189v3H33v-1H12z"/>';
  shape += '<path fill="#405862" d="M11 32h20v3h188v-3h5v3h-5v2H31v2H11z"/>';
  shape += rect(39, 11, 181, 24, "#06080a");
  const fill = Math.round(177 * p);
  if (fill) {
    shape +=
      rect(41, 13, fill, 20, "#ba1724") +
      rect(41, 13, fill, 5, "#ec4546") +
      rect(41, 18, fill, 12, "#d8232f") +
      rect(41, 31, fill, 2, "#841d28");
  }
  if (options.segmented)
    for (let i = 1; i < settings.segments; i++)
      shape += rect(
        41 + Math.round((177 * i) / settings.segments),
        16,
        2,
        15,
        "#0b1012",
      );
  shape +=
    '<path fill="#070b0e" d="M13 15h7v3h4v-3h7v4h3v9h-4v4h-4v4h-5v-4h-4v-4h-5v-9h1z"/><path fill="' +
    (p === 0 ? "#682633" : "#e42a39") +
    '" d="M15 18h4v4h7v-4h4v9h-4v4h-4v2h-2v-5h-5z"/>';
  if (p > 0) shape += rect(15, 18, 4, 4, "#ff6b68");
  if (stage > 0)
    shape += '<path fill="#080c0e" d="M20 17h3v5h-3v4h4v5h-3v-4h-4v-5h3z"/>';
  // Erosion is drawn in pixel steps; it never obscures the remaining filled HP.
  const breaks = [
    { x: 213, t: 1 },
    { x: 169, t: 2 },
    { x: 118, t: 2 },
    { x: 78, t: 3 },
    { x: 47, t: 4 },
    { x: 192, t: 3 },
  ];
  for (const b of breaks)
    if (stage >= b.t) {
      shape += `<path fill="#080c0e" d="M${b.x} 5h5v7h5v6h-4v13h4v5h-5v7h-6v-8h-4v-7h4V16h-4v-5h5z"/>`;
      if (stage >= 3)
        shape +=
          rect(b.x + 6, 33, 3, 3, "#688a3b") +
          rect(b.x + 3, 9, 3, 2, "#88a747");
    }
  const numbers = options.numbers ?? settings.showNumbers;
  if (numbers && s.maxHp > 0)
    shape += pixelText(`${s.hp} / ${s.maxHp}`, 130, 23, 174, 11);
  let badges = "";
  const badgeY = s.maxHp > 0 ? 43 : 0;
  if (s.tempHp > 0) {
    const x = s.ac > 0 ? 168 : 199;
    badges += `<g transform="translate(${x} ${badgeY})">${badgeShape("temp")}${pixelText(String(s.tempHp), 14, 14, 21, 11)}</g>`;
  }
  if (s.ac > 0)
    badges += `<g transform="translate(199 ${badgeY})">${badgeShape("ac")}${pixelText(String(s.ac), 14, 14, 21, 11)}</g>`;
  const name = options.name
    ? `<text x="116" y="10" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#fff5df" stroke="#10171a" stroke-width="3" paint-order="stroke">${esc(options.name.slice(0, 32))}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="928" height="${((s.tempHp || s.ac ? badgeY + 28 : 46) + top) * 4}" viewBox="0 0 232 ${(s.tempHp || s.ac ? badgeY + 28 : 46) + top}" shape-rendering="crispEdges">${name}<g transform="translate(0 ${top})">${s.maxHp > 0 ? shape : ""}${badges}</g></svg>`;
}
export const svgUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function badgeShape(kind: "temp" | "ac"): string {
  if (kind === "temp")
    return '<path fill="#080c0e" d="M3 3h8v3h6V3h8v3h3v12h-4v4h-4v4h-4v2h-4v-2H8v-4H4v-4H0V6h3z"/><path fill="#5f7c89" d="M4 5h6v4h8V5h6v3h2v9h-4v4h-4v4h-4v1h-2v-3H9v-4H5v-4H2V8h2z"/><path fill="#4d9a52" d="M5 7h4v5h10V7h4v10h-4v4h-4v3h-2v-3h-3v-4H6v-3H4V9h1z"/><path fill="#94d879" d="M5 7h4v4H5zM19 7h4v3h-4z"/><path fill="#285b36" d="M8 17h3v4h4v2h-2v-2h-3v-2H8z"/>';
  return '<path fill="#080c0e" d="M4 0h20v3h4v17h-4v4h-5v3H9v-3H4v-4H0V3h4z"/><path fill="#5f7c89" d="M5 3h18v3h2v12h-4v4h-4v2h-6v-2H7v-4H3V6h2z"/><path fill="#95aab1" d="M5 3h18v3H6v11H3V6h2z"/><path fill="#344e68" d="M7 7h14v11h-4v3h-6v-3H7z"/><path fill="#6587a4" d="M7 7h14v3H10v8H7z"/><path fill="#405862" d="M7 19h4v3h6v2h-6v-2H7z"/>';
}
