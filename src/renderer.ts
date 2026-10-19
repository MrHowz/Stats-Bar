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
  type Stats,
  type Settings,
} from "./model.ts";
import { ART_WIDTH } from "./hosted-art.ts";
import type { BarPart } from "./hosted-art.ts";

export function createRenderer(
  OBR: typeof SDK,
  buildImage: typeof ImageFactory,
  makeParts: (
    stats: Stats,
    settings: Settings,
    options: { numbers: boolean; segmented: boolean; name?: string },
  ) => BarPart[] | Promise<BarPart[]>,
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
    const byToken = new Map<string, OBRImage[]>();
    for (const overlay of overlays) {
      const key = overlay.attachedTo ?? "";
      const parts = byToken.get(key) ?? [];
      parts.push(overlay);
      byToken.set(key, parts);
    }
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
      const options = {
        numbers: mode === "full" && settings.showNumbers,
        segmented: mode === "bar",
        name,
      };
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
        stats,
        settings,
        options,
        position,
        width,
        dpi,
        token.visible,
      ]);
      const existingParts = byToken.get(token.id) ?? [];
      if (
        existingParts.length &&
        existingParts.every((part) => signatures.get(part.id) === signature)
      ) {
        existingParts.forEach((part) => keep.add(part.id));
        continue;
      }
      const tiles = await makeParts(stats, settings, options);
      if (!active || epoch !== generation) return;
      for (const tile of tiles) {
        if (tile.url.length > 2048)
          throw new Error("Image URL exceeds Owlbear's 2048-character limit");
        const existing = existingParts.find((part) => {
          const metadata = part.metadata[OVERLAY_KEY];
          return (
            typeof metadata === "object" &&
            metadata !== null &&
            (metadata as { part?: string }).part === tile.key
          );
        });
        if (existing) keep.add(existing.id);
        const item = buildImage(
          {
            url: tile.url,
            mime: "image/png",
            width: tile.width,
            height: tile.height,
          },
          { dpi, offset: { x: 0, y: 0 } },
        )
          .name("Pixel Statbar")
          .layer("ATTACHMENT")
          .position({
            x: position.x + (tile.x * width) / ART_WIDTH,
            y: position.y + (tile.y * width) / ART_WIDTH,
          })
          .scale({ x: width / ART_WIDTH, y: width / ART_WIDTH })
          .zIndex(tile.text ? 2 : tile.key === "segments" ? 1 : 0)
          .textItemType("TEXT")
          .textType("PLAIN")
          .plainText(tile.text ?? "")
          .textWidth(tile.width)
          .textHeight(tile.height)
          .textPadding(0)
          .fontFamily(tile.key === "name" ? "sans-serif" : "monospace")
          .fontSize(tile.fontSize ?? 32)
          .fontWeight(700)
          .textLineHeight(1)
          .textAlign("CENTER")
          .textAlignVertical("MIDDLE")
          .textFillColor(tile.color ?? "#fff8ec")
          .textFillOpacity(1)
          .textStrokeColor("#10171a")
          .textStrokeOpacity(1)
          .textStrokeWidth(tile.key === "hp" || tile.key === "name" ? 4 : 0)
          .locked(true)
          .disableHit(true)
          .attachedTo(token.id)
          .disableAttachmentBehavior(["ROTATION", "SCALE", "COPY"])
          .visible(token.visible)
          .metadata({ [OVERLAY_KEY]: { part: tile.key } })
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
      const detail =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "error" in e
            ? String(
                (e.error as { message?: string })?.message ?? "Unknown error",
              )
            : String(e);
      await OBR.notification
        .show(`Pixel Statbar: วาดแถบไม่ได้ — ${detail.slice(0, 180)}`, "ERROR")
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
