import { glyphFile } from "./pixel-font.ts";
import type { Settings, Stats } from "./model.ts";

export const ART_WIDTH = 928;
export const ART_PATH = "/bars-v6/";
export interface BarPart {
  key: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  glyphScale?: number;
  fontSize?: number;
  color?: string;
}

// Only public artwork filenames enter URLs. Names and exact values stay in
// local Owlbear text, rather than being sent to an image generation service.
export function hostedBarParts(
  stats: Stats,
  _settings: Settings,
  options: { numbers: boolean; segmented: boolean; name?: string },
  origin: string,
): BarPart[] {
  const top = options.name ? 56 : 0;
  const parts: BarPart[] = [];
  const add = (
    key: string,
    file: string,
    x: number,
    y: number,
    width: number,
    height: number,
    text?: string,
    fontSize = 32,
    color = "#fff8ec",
  ) => {
    const url = new URL(ART_PATH + file + ".png", origin).href;
    if (!/^https?:\/\//.test(url) || url.length > 2048)
      throw new Error("Invalid hosted artwork URL");
    parts.push({ key, url, x, y, width, height, text, fontSize, color });
  };
  if (stats.maxHp > 0) {
    const p = Math.min(1, Math.max(0, stats.hp / stats.maxHp));
    const stage = 0;
    add("frame", `frame-${stage}-${Math.round(177 * p)}`, 0, top, 928, 184);
    if (options.numbers)
      add(
        "hp",
        "hp",
        164,
        top + 60,
        712,
        64,
        `${stats.hp} / ${stats.maxHp}`,
        40,
      );
  }
  const badgeY = top + (stats.maxHp > 0 ? 172 : 0);
  if (stats.tempHp > 0)
    add(
      "temp",
      "temp",
      stats.ac > 0 ? 516 : 720,
      badgeY,
      192,
      192,
      String(stats.tempHp),
      Math.min(40, 128 / String(stats.tempHp).length),
      "#f3fff0",
    );
  if (stats.ac > 0)
    add(
      "ac",
      "ac",
      720,
      badgeY,
      192,
      192,
      String(stats.ac),
      Math.min(40, 128 / String(stats.ac).length),
      "#f1f6ff",
    );
  if (options.name)
    add(
      "name",
      "name",
      0,
      0,
      928,
      56,
      options.name.slice(0, 32),
      40,
      "#fff5df",
    );
  // Static glyph images keep pixel numerals identical on every player's device.
  for (const label of parts.filter((part) => part.text)) {
    if (!label.text || label.key === "name") continue;
    const text = label.text;
    const scale = Math.min((label.key === "hp" ? 64 : 80) / 36, (label.width - 28) / (text.length * 28));
    [...text].forEach((char, i) => {
      if (char === " ") return;
      parts.push({
        key: `${label.key}-digit-${i}`,
        url: new URL(`${ART_PATH}digit-${glyphFile(char)}.png`, origin).href,
        x:
          label.x +
          (label.width - text.length * 28 * scale) / 2 +
          i * 28 * scale,
        y: label.y + (label.height - 36 * scale) / 2,
        width: 28,
        height: 36,
        glyphScale: scale,
      });
    });
  }
  return parts;
}

export function barHeight(stats: Stats, hasName: boolean): number {
  return (
    (hasName ? 56 : 0) +
    (stats.tempHp > 0 || stats.ac > 0 ? (stats.maxHp > 0 ? 364 : 192) : 184)
  );
}
