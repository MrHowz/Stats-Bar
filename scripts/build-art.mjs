import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { barSvg, badgeShape } from "../src/art.ts";
import { DEFAULT_SETTINGS, DEFAULT_STATS } from "../src/model.ts";

const folder = new URL("../public/bars-v3/", import.meta.url);
await mkdir(folder, { recursive: true });
const jobs = [];
function add(name, svg) {
  jobs.push(async () => {
    const data = await sharp(Buffer.from(svg)).png().toBuffer();
    await writeFile(new URL(name + ".png", folder), data);
  });
}
for (let stage = 0; stage < 5; stage++) {
  for (let fill = 0; fill <= 177; fill++) {
    add(
      `frame-${stage}-${fill}`,
      barSvg({ ...DEFAULT_STATS, hp: fill, maxHp: 177 }, DEFAULT_SETTINGS, {
        numbers: false,
        decayStage: stage,
      }),
    );
  }
}
const svg = (width, height, body = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width / 4} ${height / 4}" shape-rendering="crispEdges">${body}</svg>`;
for (const count of [4, 5, 10]) {
  let lines = "";
  for (let i = 1; i < count; i++)
    lines += `<rect x="${41 + Math.round((177 * i) / count)}" y="16" width="2" height="15" fill="#0b1012"/>`;
  add(`segments-${count}`, svg(928, 184, lines));
}
add("hp", svg(712, 64));
add("name", svg(928, 56));
add("temp", svg(112, 112, badgeShape("temp")));
add("ac", svg(112, 112, badgeShape("ac")));
// Bounded concurrency avoids excessive memory use on Cloudflare builds.
for (let start = 0; start < jobs.length; start += 16)
  await Promise.all(jobs.slice(start, start + 16).map((job) => job()));
console.log(`Generated ${jobs.length} hosted PNG assets`);
