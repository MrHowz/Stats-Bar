import { GLYPHS, glyphSvgBody, glyphFile } from "../src/pixel-font.ts";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { barSvg, badgeShape } from "../src/art.ts";
import { DEFAULT_SETTINGS, DEFAULT_STATS } from "../src/model.ts";

const folder = new URL("../public/bars-v7/", import.meta.url);
await mkdir(folder, { recursive: true });
const jobs = [];
function add(name, svg) {
  jobs.push(async () => {
    const data = await sharp(Buffer.from(svg)).png().toBuffer();
    await writeFile(new URL(name + ".png", folder), data);
  });
}
add("frame", barSvg({...DEFAULT_STATS, hp:0, maxHp:100}, DEFAULT_SETTINGS, {numbers:false}));
const svg = (width, height, body = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width / 4} ${height / 4}" shape-rendering="crispEdges">${body}</svg>`;
add("fill", svg(708,80,'<rect width="177" height="20" fill="#ba1724"/><rect width="177" height="5" fill="#ec4546"/><rect y="5" width="177" height="12" fill="#d8232f"/><rect y="18" width="177" height="2" fill="#841d28"/>'));
for (const char of Object.keys(GLYPHS)) add(`digit-${glyphFile(char)}`, svg(28, 36, glyphSvgBody(char)));
add("hp", svg(712, 64));
add("name", svg(928, 56));
add("temp", svg(192, 192, `<g transform="scale(${12/7})">${badgeShape("temp")}</g>`));
add("ac", svg(192, 192, `<g transform="scale(${12/7})">${badgeShape("ac")}</g>`));
// Bounded concurrency avoids excessive memory use on Cloudflare builds.
for (let start = 0; start < jobs.length; start += 16)
  await Promise.all(jobs.slice(start, start + 16).map((job) => job()));
console.log(`Generated ${jobs.length} hosted PNG assets`);
