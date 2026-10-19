import type SDK from "@owlbear-rodeo/sdk";
import type { buildImage as ImageFactory } from "@owlbear-rodeo/sdk";
import type { Image as OBRImage, Item } from "@owlbear-rodeo/sdk";
import {
  OVERLAY_KEY,
  SETTINGS_KEY,
  access,
  displayStats,
  isToken,
  readSettings,
  readStats,
} from "./model.ts";
import { barSvg } from "./art.ts";

export function createRenderer(
  OBR: typeof SDK,
  buildImage: typeof ImageFactory,
  rasterize: (svg: string) => Promise<string>,
) {
  let active = false,
    epoch = 0,
    running = false,
    queued = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const signatures = new Map<string, string>();
  const boundsCache = new Map<
    string,
    {
      key: string;
      bounds: Awaited<ReturnType<typeof OBR.scene.items.getItemBounds>>;
    }
  >();
  function schedule() {
    queued = true;
    clearTimeout(timer);
    timer = setTimeout(() => void flush(), 80);
  }
  async function render(generation: number) {
    if (!active) return;
    const [items, local, role, id, room, scene, dpi] = await Promise.all([
      OBR.scene.items.getItems(),
      OBR.scene.local.getItems(),
      OBR.player.getRole(),
      OBR.player.getId(),
      OBR.room.getMetadata(),
      OBR.scene.getMetadata(),
      OBR.scene.grid.getDpi(),
    ]);
    if (!active || epoch !== generation) return;
    const settings = readSettings(room[SETTINGS_KEY], scene[SETTINGS_KEY]);
    const overlays = local.filter((i) => i.metadata[OVERLAY_KEY]) as OBRImage[];
    const byToken = new Map(overlays.map((i) => [i.attachedTo, i]));
    const keep = new Set<string>(),
      add: Item[] = [],
      updates: OBRImage[] = [];
    for (const token of items.filter(isToken)) {
      const mode = access(token, { role, id, permissions: [] });
      const raw = readStats(token);
      if (
        mode === "none" ||
        (mode === "bar" && !raw.maxHp) ||
        (!raw.maxHp && !raw.tempHp && !raw.ac)
      )
        continue;
      const stats = displayStats(raw, mode, settings.segments);
      const name = settings.showNames ? stats.name || token.name : undefined;
      const svg = barSvg(stats, settings, {
        numbers: mode === "full" && settings.showNumbers,
        segmented: mode === "bar",
        name,
      });
      // Bounds include token transforms, so a rotated or mirrored token stays aligned.
      const transformKey = JSON.stringify([
        token.position,
        token.scale,
        token.rotation,
        (token as OBRImage).image,
        (token as OBRImage).grid,
        dpi,
      ]);
      let cached = boundsCache.get(token.id);
      if (cached?.key !== transformKey) {
        cached = {
          key: transformKey,
          bounds: await OBR.scene.items.getItemBounds([token.id]),
        };
        boundsCache.set(token.id, cached);
      }
      const bounds = cached.bounds;
      const width = Math.max(dpi * 0.5, bounds.width) * settings.width;
      const height = (width * (name ? 74 : 60)) / 232;
      const position = {
        x: bounds.center.x - width / 2,
        y:
          settings.position === "above"
            ? bounds.min.y - height - settings.offset
            : bounds.max.y + settings.offset,
      };
      const signature = JSON.stringify([
        svg,
        position,
        width,
        dpi,
        token.visible,
      ]);
      const existing = byToken.get(token.id);
      if (existing) {
        keep.add(existing.id);
        if (signatures.get(existing.id) === signature) continue;
      }
      const imageUrl = await rasterize(svg);
      if (!active || epoch !== generation) return;
      const item = buildImage(
        {
          url: imageUrl,
          mime: "image/png",
          width: 928,
          height: (name ? 74 : 60) * 4,
        },
        { dpi, offset: { x: 0, y: 0 } },
      )
        .name("Pixel Statbar")
        .layer("ATTACHMENT")
        .position(position)
        .scale({ x: width / 928, y: width / 928 })
        .locked(true)
        .disableHit(true)
        .attachedTo(token.id)
        .disableAttachmentBehavior(["ROTATION", "SCALE", "COPY"])
        .visible(token.visible)
        .metadata({ [OVERLAY_KEY]: true })
        .build();
      if (existing) {
        const replacement = { ...item, id: existing.id };
        updates.push(replacement);
        signatures.set(existing.id, signature);
      } else {
        add.push(item);
        signatures.set(item.id, signature);
      }
    }
    if (!active || epoch !== generation) return;
    const remove = overlays.filter((i) => !keep.has(i.id)).map((i) => i.id);
    if (remove.length) {
      await OBR.scene.local.deleteItems(remove);
      remove.forEach((id) => signatures.delete(id));
    }
    if (!active || epoch !== generation) return;
    if (updates.length) {
      const map = new Map(updates.map((i) => [i.id, i]));
      await OBR.scene.local.updateItems(
        updates.map((i) => i.id),
        (drafts) => {
          for (const draft of drafts) Object.assign(draft, map.get(draft.id));
        },
      );
    }
    if (!active || epoch !== generation) return;
    if (add.length) await OBR.scene.local.addItems(add);
    for (const key of boundsCache.keys())
      if (!items.some((i) => i.id === key)) boundsCache.delete(key);
  }
  async function flush() {
    if (running || !active) return;
    running = true;
    try {
      while (queued && active) {
        queued = false;
        await render(epoch);
      }
    } catch (e) {
      signatures.clear();
      console.error("Pixel Statbar rendering failed", e);
      await OBR.notification
        .show("Pixel Statbar: ไม่สามารถวาดแถบได้ ลองเปิด Scene ใหม่", "ERROR")
        .catch(() => {});
    } finally {
      running = false;
    }
  }

  return {
    setReady(value: boolean) {
      active = value;
      epoch++;
      signatures.clear();
      boundsCache.clear();
      if (value) schedule();
    },
    schedule,
    async flushNow() {
      clearTimeout(timer);
      queued = true;
      await flush();
    },
  };
}
