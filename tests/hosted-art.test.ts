import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { hostedBarParts } from "../src/hosted-art.ts";
import { DEFAULT_STATS, DEFAULT_SETTINGS, displayStats } from "../src/model.ts";

test("all health levels use real decodable hosted PNGs with matching dimensions", async () => {
  for (const decay of [true, false]) {
    for (let hp = 0; hp <= 400; hp++) {
      const parts = hostedBarParts(
        { ...DEFAULT_STATS, hp, maxHp: 400 },
        { ...DEFAULT_SETTINGS, decay },
        { numbers: true, segmented: false },
        "https://stats-bar.pages.dev",
      );
      for (const part of parts) {
        assert.match(
          part.url,
          /^https:\/\/stats-bar\.pages\.dev\/bars-v2\/[a-z0-9-]+\.png$/,
        );
        assert.ok(part.url.length < 2048);
        const bytes = await readFile(
          new URL(`../public${new URL(part.url).pathname}`, import.meta.url),
        );
        const decoded = await sharp(bytes)
          .raw()
          .toBuffer({ resolveWithObject: true });
        assert.equal(decoded.info.width, part.width);
        assert.equal(decoded.info.height, part.height);
      }
    }
  }
});
test("labels remain local; segmented health omits exact HP, AC and temporary HP", () => {
  const stats = {
    ...DEFAULT_STATS,
    hp: 17,
    maxHp: 53,
    tempHp: 99999,
    ac: 99999,
  };
  const name = "ตัวละครทดสอบ <Knight> & ♥";
  const full = hostedBarParts(
    stats,
    DEFAULT_SETTINGS,
    { numbers: true, segmented: false, name },
    "https://stats-bar.pages.dev",
  );
  assert.equal(full.find((p) => p.key === "hp")?.text, "17 / 53");
  assert.equal(full.find((p) => p.key === "name")?.text, name);
  assert.equal(new Set(full.map((p) => p.key)).size, full.length);
  assert.ok(full.every((p) => !p.url.includes("?")));
  for (const segments of [4, 5, 10]) {
    const parts = hostedBarParts(
      displayStats(stats, "bar", segments),
      { ...DEFAULT_SETTINGS, segments },
      { numbers: false, segmented: true },
      "https://stats-bar.pages.dev",
    );
    assert.deepEqual(
      parts.map((p) => p.key),
      ["frame", "segments"],
    );
    assert.ok(parts.every((p) => p.text === undefined));
  }
  const badges = hostedBarParts(
    { ...stats, maxHp: 0 },
    DEFAULT_SETTINGS,
    { numbers: true, segmented: false },
    "https://stats-bar.pages.dev",
  );
  assert.deepEqual(
    badges.map((p) => p.key),
    ["temp", "ac"],
  );
});
