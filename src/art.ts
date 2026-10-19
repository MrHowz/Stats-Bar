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
  options: { numbers?: boolean; segmented?: boolean; name?: string } = {},
): string {
  const p = s.maxHp > 0 ? Math.min(1, Math.max(0, s.hp / s.maxHp)) : 0;
  const stage = settings.decay
    ? p === 0
      ? 4
      : p <= 0.25
        ? 3
        : p <= 0.5
          ? 2
          : p < 1
            ? 1
            : 0
    : 0;
  const top = options.name ? 14 : 0;
  let shape =
    '<path fill="#080c0e" d="M10 4h5V2h7v3h9v3h9V6h12v3h10V5h10v3h12V4h10v4h13V3h10v5h13V5h10v3h13V2h10v6h12V4h10v4h13V5h12v4h12v5h6v20h-5v5h-9v4h-12v-3h-13v4h-12v-4h-13v3h-12v-3h-13v4h-12v-4h-13v3h-12v-4h-13v4h-12v-3H75v4H63v-4H51v-2H39v4h-9v4H14v-4H8v-7H3V16h4V8h3z"/>';
  shape +=
    '<path fill="#5f7c89" d="M11 9h6V6h5v3h10v5h9v-4h11v3h11V9h8v3h13V8h8v4h15V7h8v5h15V9h8v3h15V6h8v6h14V8h8v4h15V9h10v4h13v5h6v13h-5v4h-10v4h-9v-3h-15v4h-9v-4h-15v3h-9v-3h-15v4h-9v-4h-15v3h-9v-4H89v4h-10v-3H64v4h-10v-4H40v-3h-8v7H17v-4h-7v-7H7V18h4z"/>';
  shape +=
    '<path fill="#95aab1" d="M11 10h6V7h5v4h10v4h-3v-2H15v5h-4zM43 10h8v4h-8zM64 9h7v4h-7zM85 8h7v4h-7zM108 7h7v5h-7zM131 9h7v4h-7zM154 6h7v5h-7zM176 8h7v5h-7zM199 9h9v5h-9zM214 14h7v5h5v7h-4v-6h-8z"/>';
  shape +=
    '<path fill="#405862" d="M13 32h17v6H17v-3h-4zM41 31h13v4H41zM64 33h15v4H64zM90 32h12v4H90zM116 33h15v4h-15zM142 32h13v4h-13zM168 33h15v4h-15zM194 32h15v4h-15zM214 27h8v7h-8z"/>';
  shape += rect(39, 15, 181, 16, "#06080a");
  const fill = Math.round(177 * p);
  if (fill) {
    shape +=
      rect(41, 17, fill, 12, "#ba1724") +
      rect(41, 17, fill, 4, "#ec4546") +
      rect(41, 21, fill, 5, "#d8232f") +
      rect(41, 28, fill, 1, "#841d28");
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
    shape += `<text x="130" y="26.5" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="10" fill="#fff8ec" stroke="#180c0c" stroke-width="2" paint-order="stroke" shape-rendering="auto">${s.hp} / ${s.maxHp}</text>`;
  let badges = "";
  if (s.tempHp > 0)
    badges += `<path d="M42 45h51v13H42z" fill="#101e26" stroke="#649baa" stroke-width="1"/><text x="67.5" y="54" text-anchor="middle" font-family="monospace" font-size="8" fill="#b9e8ed">+${s.tempHp} TMP</text>`;
  if (s.ac > 0)
    badges += `<path d="M185 45h35v11l-5 3h-25l-5-3z" fill="#24221c" stroke="#b5a576" stroke-width="1"/><text x="202.5" y="54" text-anchor="middle" font-family="monospace" font-size="8" fill="#f1db9e">${s.ac} AC</text>`;
  const name = options.name
    ? `<text x="116" y="10" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#fff5df" stroke="#10171a" stroke-width="3" paint-order="stroke">${esc(options.name.slice(0, 32))}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="928" height="${(60 + top) * 4}" viewBox="0 0 232 ${60 + top}" shape-rendering="crispEdges">${name}<g transform="translate(0 ${top})">${s.maxHp > 0 ? shape : ""}${badges}</g></svg>`;
}
export const svgUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const cache = new Map<string, string>();
export async function rasterize(svg: string): Promise<string> {
  const cached = cache.get(svg);
  if (cached) return cached;
  const img = new Image();
  img.src = svgUrl(svg);
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  const url = c.toDataURL("image/png");
  if (cache.size > 128) cache.delete(cache.keys().next().value!);
  cache.set(svg, url);
  return url;
}
