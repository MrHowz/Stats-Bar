import { test } from "node:test";
import assert from "node:assert/strict";
import type { Item } from "@owlbear-rodeo/sdk";
import {
  DEFAULT_STATS,
  STAT_KEY,
  access,
  applyAmount,
  calculate,
  canEdit,
  displayStats,
  editStat,
  readSettings,
  readStats,
} from "../src/model.ts";
const stats = { ...DEFAULT_STATS, hp: 20, maxHp: 40, tempHp: 5, ac: 16 };
test("inline expressions are relative only with leading operators", () => {
  assert.equal(calculate("-6", 20), 14);
  assert.equal(calculate("+6", 20), 26);
  assert.equal(calculate("20-5", 80), 15);
  assert.equal(calculate("(4+6)*2", 0), 20);
  assert.equal(calculate("/2", 20), 10);
  assert.equal(calculate("0", 20), 0);
});
test("rejects code, malformed expressions, infinities and oversized input", () => {
  for (const input of [
    "window.alert(1)",
    "NaN",
    "2**3",
    "3/0",
    "2x",
    "(3+2",
    "4;5",
    "",
    "999999",
    "2 3foo",
  ])
    assert.throws(() => calculate(input, 20));
});
test("damage spends temporary HP, then clamps HP at zero", () => {
  assert.deepEqual(applyAmount(stats, "damage", 3), { ...stats, tempHp: 2 });
  assert.deepEqual(applyAmount(stats, "damage", 8), {
    ...stats,
    tempHp: 0,
    hp: 17,
  });
  assert.equal(applyAmount(stats, "damage", 90).hp, 0);
});
test("heal caps at max, temp grants do not stack, direct HP edits preserve temp", () => {
  assert.equal(applyAmount(stats, "heal", 50).hp, 40);
  assert.equal(applyAmount(stats, "temp", 3).tempHp, 5);
  assert.equal(applyAmount(stats, "temp", 9).tempHp, 9);
  assert.deepEqual(editStat(stats, "hp", "-6"), { ...stats, hp: 14 });
  assert.equal(editStat(stats, "maxHp", "10").hp, 10);
  assert.throws(() => applyAmount(stats, "damage", -1));
});
const item = (visibility = "public", visible = true) =>
  ({
    id: "t",
    type: "IMAGE",
    layer: "CHARACTER",
    createdUserId: "owner",
    visible,
    metadata: { [STAT_KEY]: { ...stats, visibility } },
  }) as Item;
const owner = {
  role: "PLAYER" as const,
  id: "owner",
  permissions: ["CHARACTER_UPDATE", "CHARACTER_OWNER_ONLY"] as const,
};
const viewer = { ...owner, permissions: [...owner.permissions] };
test("GM, owner, segmented and hidden-token visibility", () => {
  assert.equal(access(item("gm"), viewer), "none");
  assert.equal(access(item("owner"), viewer), "full");
  assert.equal(access(item("owner"), { ...viewer, id: "other" }), "none");
  assert.equal(access(item("bar"), { ...viewer, id: "other" }), "bar");
  assert.equal(access(item("public", false), viewer), "none");
  assert.equal(access(item("gm", false), { ...viewer, role: "GM" }), "full");
});
test("edits enforce layer permission, ownership, and visibility", () => {
  assert.equal(canEdit(item(), viewer), true);
  assert.equal(canEdit(item(), { ...viewer, id: "other" }), false);
  assert.equal(canEdit(item(), { ...viewer, permissions: [] }), false);
  assert.equal(
    canEdit(item("bar"), {
      ...viewer,
      id: "other",
      permissions: ["CHARACTER_UPDATE"],
    }),
    false,
  );
  assert.equal(canEdit(item("gm"), viewer), false);
});
test("segmented output cannot expose exact hp, AC, or temp values", () => {
  const result = displayStats({ ...stats, hp: 13 }, "bar", 4);
  assert.equal(result.hp, 2);
  assert.equal(result.maxHp, 4);
  assert.equal(result.ac, 0);
  assert.equal(result.tempHp, 0);
  assert.equal(displayStats({ ...stats, hp: 0 }, "bar", 4).hp, 0);
});
test("untrusted metadata is normalized and scene settings override room settings", () => {
  assert.equal(
    readStats({
      metadata: {
        [STAT_KEY]: {
          hp: NaN,
          maxHp: -3,
          tempHp: Infinity,
          visibility: "invalid",
        },
      },
    }).hp,
    0,
  );
  const s = readSettings({ width: 2, decay: false }, { showNames: true });
  assert.equal(s.width, 2);
  assert.equal(s.decay, false);
  assert.equal(s.showNames, true);
  assert.equal(readSettings({ width: Infinity }).width, 1.5);
  assert.equal(readSettings({ offset: -20 }).offset, -20);
  assert.equal(readSettings({ offset: -999 }).offset, -100);
  assert.equal(readSettings({ offset: 999 }).offset, 100);
});
