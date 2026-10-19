import { test } from "node:test";
import assert from "node:assert/strict";
import type SDK from "@owlbear-rodeo/sdk";
import type {
  Image,
  Item,
  buildImage as ImageFactory,
} from "@owlbear-rodeo/sdk";
import { createRenderer } from "../src/renderer.ts";
import { DEFAULT_STATS, STAT_KEY, OVERLAY_KEY } from "../src/model.ts";

function fixture() {
  let role: "GM" | "PLAYER" = "GM",
    counter = 0,
    adds = 0,
    updates = 0;
  let items = [
    {
      id: "token",
      type: "IMAGE",
      layer: "CHARACTER",
      name: "Knight",
      visible: true,
      createdUserId: "gm",
      position: { x: 100, y: 100 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      metadata: {
        [STAT_KEY]: {
          ...DEFAULT_STATS,
          hp: 18,
          maxHp: 48,
          ac: 16,
          visibility: "bar",
        },
      },
      image: { width: 150, height: 150, url: "token.png" },
      grid: { dpi: 150, offset: { x: 0, y: 0 } },
    } as Item,
  ];
  let local: Item[] = [];
  const rendered: string[] = [];
  const api = {
    player: { getRole: async () => role, getId: async () => "player" },
    room: { getMetadata: async () => ({}) },
    scene: {
      getMetadata: async () => ({}),
      grid: { getDpi: async () => 150 },
      items: {
        getItems: async () => structuredClone(items),
        getItemBounds: async () => {
          const p = items[0].position;
          return {
            min: p,
            max: { x: p.x + 150, y: p.y + 150 },
            center: { x: p.x + 75, y: p.y + 75 },
            width: 150,
            height: 150,
          };
        },
      },
      local: {
        getItems: async () => structuredClone(local),
        addItems: async (values: Item[]) => {
          for (const value of values) {
            assert.ok((value as Image).image.url.length <= 2048);
          }
          adds += values.length;
          local.push(...values);
        },
        deleteItems: async (ids: string[]) => {
          local = local.filter((i) => !ids.includes(i.id));
        },
        updateItems: async (ids: string[], fn: (i: Item[]) => void) => {
          updates++;
          fn(local.filter((i) => ids.includes(i.id)));
        },
      },
    },
    notification: {
      show: async (message: string) => {
        throw new Error(message);
      },
    },
  } as unknown as typeof SDK;
  const builder = ((image: Image["image"], grid: Image["grid"]) => {
    const data: Record<string, unknown> = {
      id: `overlay-${++counter}`,
      type: "IMAGE",
      image,
      grid,
    };
    const proxy = new Proxy(
      {},
      {
        get: (_, key: string) =>
          key === "build"
            ? () => data
            : (value: unknown) => {
                data[key] = value;
                return proxy;
              },
      },
    );
    return proxy;
  }) as typeof ImageFactory;
  const renderer = createRenderer(api, builder, async (svg) => {
    rendered.push(svg);
    return [
      { url: `render:${rendered.length}`, x: 0, y: 0, width: 464, height: 120 },
    ];
  });
  return {
    renderer,
    getItems: () => items,
    getLocal: () => local,
    counts: () => ({ adds, updates }),
    rendered,
    setRole: (r: "GM" | "PLAYER") => {
      role = r;
    },
    deleteToken: () => {
      items = [];
    },
    api,
    builder,
  };
}
test("renderer attaches one local bar, reuses it for HP and movement, and cleans up removed tokens", async () => {
  const f = fixture();
  f.renderer.setReady(true);
  await f.renderer.flushNow();
  assert.equal(f.getLocal().length, 1);
  const bar = f.getLocal()[0];
  assert.equal(bar.attachedTo, "token");
  assert.equal(bar.disableHit, true);
  assert.ok(bar.metadata[OVERLAY_KEY]);
  assert.ok(bar.disableAttachmentBehavior?.includes("ROTATION"));
  const position = { ...bar.position };
  await f.renderer.flushNow();
  assert.deepEqual(f.counts(), { adds: 1, updates: 0 });
  (f.getItems()[0].metadata[STAT_KEY] as { hp: number }).hp = 10;
  await f.renderer.flushNow();
  assert.deepEqual(f.counts(), { adds: 1, updates: 1 });
  assert.equal(f.getLocal()[0].id, bar.id);
  f.getItems()[0].position.x += 100;
  await f.renderer.flushNow();
  assert.equal(f.getLocal()[0].position.x, position.x + 100);
  f.deleteToken();
  await f.renderer.flushNow();
  assert.equal(f.getLocal().length, 0);
  f.renderer.setReady(false);
});
test("role changes replace exact stats with segmented health and remove GM-only overlays", async () => {
  const f = fixture();
  f.renderer.setReady(true);
  await f.renderer.flushNow();
  assert.match(f.rendered.at(-1)!, />18 \/ 48</);
  f.setRole("PLAYER");
  await f.renderer.flushNow();
  assert.doesNotMatch(f.rendered.at(-1)!, /18 \/ 48|16 AC/);
  (f.getItems()[0].metadata[STAT_KEY] as { visibility: string }).visibility =
    "gm";
  await f.renderer.flushNow();
  assert.equal(f.getLocal().length, 0);
  f.renderer.setReady(false);
});
test("closing a scene while rendering discards pending overlays", async () => {
  const f = fixture();
  let release!: () => void;
  let started!: () => void;
  const entered = new Promise<void>((r) => {
    started = r;
  });
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const renderer = createRenderer(f.api, f.builder, async () => {
    started();
    await gate;
    return [{ url: "png", x: 0, y: 0, width: 464, height: 120 }];
  });
  renderer.setReady(true);
  const flush = renderer.flushNow();
  await entered;
  renderer.setReady(false);
  release();
  await flush;
  assert.equal(f.getLocal().length, 0);
});

test("tiled bars reuse matching pieces, remove obsolete pieces and migrate legacy overlays", async () => {
  const f = fixture();
  let widths = [232, 232];
  const renderer = createRenderer(f.api, f.builder, async () => {
    let x = 0;
    return widths.map((width) => {
      const tile = { url: `png:${width}`, x, y: 0, width, height: 120 };
      x += width;
      return tile;
    });
  });
  f.getLocal().push({
    id: "legacy-bar",
    type: "IMAGE",
    attachedTo: "token",
    metadata: { [OVERLAY_KEY]: true },
  } as Item);
  renderer.setReady(true);
  await renderer.flushNow();
  assert.equal(f.getLocal().length, 2);
  assert.ok(!f.getLocal().some((item) => item.id === "legacy-bar"));
  const first = f.getLocal()[0];
  const second = f.getLocal()[1] as Image;
  assert.equal(second.position.x - first.position.x, 112.5);
  assert.equal(second.position.y, first.position.y);
  widths = [116, 116, 116, 116];
  (f.getItems()[0].metadata[STAT_KEY] as { hp: number }).hp--;
  await renderer.flushNow();
  assert.equal(f.getLocal().length, 4);
  assert.equal(f.getLocal()[0].id, first.id);
  widths = [464];
  (f.getItems()[0].metadata[STAT_KEY] as { hp: number }).hp--;
  await renderer.flushNow();
  assert.equal(f.getLocal().length, 1);
  assert.equal(f.getLocal()[0].id, first.id);
  f.deleteToken();
  await renderer.flushNow();
  assert.equal(f.getLocal().length, 0);
  renderer.setReady(false);
});
