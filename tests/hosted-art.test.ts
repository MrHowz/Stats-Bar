import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { hostedBarParts, barHeight } from "../src/hosted-art.ts";
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
          /^https:\/\/stats-bar\.pages\.dev\/bars-v3\/[a-z0-9-]+\.png$/,
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

test("pixel heart and shield stay together at the right, and hidden badges leave no gap", async () => {
  const stats = { ...DEFAULT_STATS, hp: 10, maxHp: 10, tempHp: 8, ac: 18 };
  const options = { numbers: true, segmented: false };
  const parts = hostedBarParts(
    stats,
    DEFAULT_SETTINGS,
    options,
    "https://example.com",
  );
  const heart = parts.find((p) => p.key === "temp")!;
  const shield = parts.find((p) => p.key === "ac")!;
  assert.equal(heart.y, shield.y);
  assert.ok(heart.x + heart.width < shield.x);
  assert.ok(shield.x + shield.width <= 928);
  assert.equal(barHeight(stats, false), shield.y + shield.height);
  for (const part of [heart, shield]) {
    const bytes = await readFile(
      new URL(`../public${new URL(part.url).pathname}`, import.meta.url),
    );
    const image = await sharp(bytes)
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(image.info.width, part.width);
    assert.equal(image.info.height, part.height);
  }
  const alone = hostedBarParts(
    { ...stats, ac: 0 },
    DEFAULT_SETTINGS,
    options,
    "https://example.com",
  );
  assert.equal(alone.find((p) => p.key === "temp")!.x, shield.x);
  assert.equal(barHeight({ ...stats, tempHp: 0, ac: 0 }, false), 184);
  assert.equal(barHeight(stats, true), barHeight(stats, false) + 56);
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
