import type { Settings, Stats } from "./model.ts";

export const ART_WIDTH = 928;
export const ART_PATH = "/bars-v3/";
export interface BarPart {
  key: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  color?: string;
}

// Only public artwork filenames enter URLs. Names and exact values stay in
// local Owlbear text, rather than being sent to an image generation service.
export function hostedBarParts(
  stats: Stats,
  settings: Settings,
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
    const stage = !settings.decay
      ? 0
      : p === 0
        ? 4
        : p <= 0.25
          ? 3
          : p <= 0.5
            ? 2
            : p < 1
              ? 1
              : 0;
    add("frame", `frame-${stage}-${Math.round(177 * p)}`, 0, top, 928, 184);
    if (options.segmented)
      add("segments", `segments-${settings.segments}`, 0, top, 928, 184);
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
      stats.ac > 0 ? 672 : 796,
      badgeY,
      112,
      112,
      String(stats.tempHp),
      Math.min(40, 128 / String(stats.tempHp).length),
      "#f3fff0",
    );
  if (stats.ac > 0)
    add(
      "ac",
      "ac",
      796,
      badgeY,
      112,
      112,
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
  return parts;
}

export function barHeight(stats: Stats, hasName: boolean): number {
  return (
    (hasName ? 56 : 0) +
    (stats.tempHp > 0 || stats.ac > 0 ? (stats.maxHp > 0 ? 284 : 112) : 184)
  );
}
