import { GLYPHS, glyphSvgBody, glyphFile } from "../src/pixel-font.ts";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
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
// Source artwork is kept separately so a clean Cloudflare build can reproduce it.
const flameFolder = new URL("../public/styles/green-flame-v1/", import.meta.url);
await mkdir(flameFolder, {recursive:true});
jobs.push(async () => {
  await writeFile(new URL("frame.png",flameFolder), await sharp(fileURLToPath(new URL("../artwork/green-flame/frame.png",import.meta.url))).resize(928,309).png().toBuffer());
});
const flameSvg = (w,h,body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const channel = '<path d="M0 0H565L594 22 565 44H0Z" fill="white"/>';
jobs.push(async () => {
  const texture = await sharp(fileURLToPath(new URL("../artwork/green-flame/fill.png",import.meta.url))).resize(594,44,{fit:"fill"}).toBuffer();
  const fill = await sharp(texture).ensureAlpha().composite([{input:Buffer.from(flameSvg(594,44,channel)),blend:"dest-in"}]).png().toBuffer();
  await writeFile(new URL("fill.png",flameFolder),fill);
});
function flameAdd(name,w,h,body) {
  jobs.push(async()=>writeFile(new URL(name+".png",flameFolder),await sharp(Buffer.from(flameSvg(w,h,body))).png().toBuffer()));
}
flameAdd("track",594,44,channel.replace('fill="white"','fill="#07180f"'));
flameAdd("hp",594,36,"");
const metal = '<defs><linearGradient id="metal" x2="0" y2="1"><stop stop-color="#eee4c5"/><stop offset=".45" stop-color="#9ba290"/><stop offset="1" stop-color="#3e5149"/></linearGradient><linearGradient id="inner" x2="0" y2="1"><stop stop-color="#234f3b"/><stop offset="1" stop-color="#0b231b"/></linearGradient></defs>';
flameAdd("temp",192,192,metal+'<path d="M96 177 21 105C-21 43 45-8 96 41c51-49 117 2 75 64Z" fill="url(#metal)" stroke="#101c15" stroke-width="10"/><path d="M96 158 35 99c-27-42 14-69 44-36l17 17 17-17c30-33 71-6 44 36Z" fill="#349a50"/><path d="M41 74q10-24 29-4" fill="none" stroke="#9de67a" stroke-width="8" stroke-linecap="round"/>');
flameAdd("ac",192,192,metal+'<path d="M96 8 177 36 166 112q-17 42-70 69-53-27-70-69L15 36Z" fill="url(#metal)" stroke="#101c15" stroke-width="10"/><path d="m96 30 59 21-9 54q-12 30-50 53-38-23-50-53l-9-54Z" fill="url(#inner)" stroke="#bec6aa" stroke-width="3"/>');
// Bounded concurrency avoids excessive memory use on Cloudflare builds.
for (let start = 0; start < jobs.length; start += 16)
  await Promise.all(jobs.slice(start, start + 16).map((job) => job()));
console.log(`Generated ${jobs.length} hosted PNG assets`);
