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
import { ART_WIDTH, barHeight } from "./hosted-art.ts";
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
    queued = false,
    revision = 0,
    auditQueued = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  let repairTimer: ReturnType<typeof setTimeout> | undefined;
  const drift = new Map<string,{key:string;dx:number;dy:number}>();
  const signatures = new Map<string, string>();
  const boundsCache = new Map<
    string,
    {
      key: string;
      bounds: Awaited<ReturnType<typeof OBR.scene.items.getItemBounds>>;
    }
  >();
  function reconcile() {
    if (!active) return;
    revision++;
    boundsCache.clear();
    auditQueued = true;
    queued = true;
    void flush();
  }
  function schedule() {
    if (!active) return;
    revision++;
    queued = true;
    // Throttle rather than restarting a debounce timer on every remote snapshot.
    if (!timer) timer = setTimeout(() => { timer = undefined; void flush(); }, 40);
    clearTimeout(settleTimer);
    clearTimeout(repairTimer);
    // Re-read settled scene geometry after the interaction and network interpolation.
    settleTimer = setTimeout(reconcile, 350);
    repairTimer = setTimeout(reconcile, 1000);
  }
  async function render(generation: number, snapshot: number, audit: boolean) {
    const stale = () => {
      if (!active || epoch !== generation || revision !== snapshot) {
        return true;
      }
      return false;
    };
    if (!active) return;
    const [items, local, role, id, room, dpi] = await Promise.all([
      OBR.scene.items.getItems(),
      OBR.scene.local.getItems(),
      OBR.player.getRole(),
      OBR.player.getId(),
      OBR.room.getMetadata(),
      OBR.scene.grid.getDpi(),
    ]);
    if (stale()) return;
    const pendingSignatures = new Map<string,string>();
    const settings = readSettings(room[SETTINGS_KEY]);
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
      const stats = displayStats(raw, mode);
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
      const height = (width * barHeight(stats, !!name)) / ART_WIDTH;
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
        token.rotation,
        token.scale,
        bounds.height,
        width,
        dpi,
        token.visible,
      ]);
      const existingParts = byToken.get(token.id) ?? [];
      const unchanged = existingParts.length > 0 && existingParts.every((part) => signatures.get(part.id) === signature);
      if (unchanged && !audit) {
        existingParts.forEach((part) => keep.add(part.id));
        continue;
      }
      const tiles = await makeParts(stats, settings, options);
      if (stale()) return;
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
        const target = {
          x: position.x + (tile.x * width) / ART_WIDTH,
          y: position.y + (tile.y * width) / ART_WIDTH,
        };
        if (existing && unchanged) {
          const dx = target.x - existing.position.x, dy = target.y - existing.position.y;
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
            drift.delete(existing.id);
            continue;
          }
          const previous = drift.get(existing.id);
          // Require the same mismatch at two quiet checkpoints, rather than
          // snapping to an interpolated network position after every drag.
          if (!previous || previous.key !== transformKey || Math.abs(previous.dx-dx)>1 || Math.abs(previous.dy-dy)>1) {
            drift.set(existing.id,{key:transformKey,dx,dy});
            continue;
          }
          drift.delete(existing.id);
        }
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
          .position(target)
          .scale({
            x: (width / ART_WIDTH) * (tile.glyphScale ?? 1) * (tile.scaleX ?? 1),
            y: (width / ART_WIDTH) * (tile.glyphScale ?? 1),
          })
          .zIndex(
            tile.glyphScale ? 3 : tile.key === "name" ? 2 : tile.key === "fill" ? 1 : 0,
          )
          .textItemType("TEXT")
          .textType("PLAIN")
          .plainText(tile.key === "name" ? (tile.text ?? "") : "")
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
          pendingSignatures.set(existing.id, signature);
        } else {
          add.push(item);
          pendingSignatures.set(item.id, signature);
        }
      }
    }
    if (stale()) return;
    const remove = overlays.filter((i) => !keep.has(i.id)).map((i) => i.id);
    if (remove.length) {
      await OBR.scene.local.deleteItems(remove);
      remove.forEach((id) => { signatures.delete(id); drift.delete(id); });
    }
    if (stale()) return;
    if (updates.length) {
      const map = new Map(updates.map((i) => [i.id, i]));
      await OBR.scene.local.updateItems(
        updates.map((i) => i.id),
        (drafts) => {
          for (const draft of drafts) Object.assign(draft, map.get(draft.id));
        },
      );
    }
    if (stale()) return;
    if (add.length) await OBR.scene.local.addItems(add);
    for (const [id,signature] of pendingSignatures) signatures.set(id,signature);
    for (const key of boundsCache.keys())
      if (!items.some((i) => i.id === key)) boundsCache.delete(key);
  }
  async function flush() {
    if (running || !active) return;
    running = true;
    try {
      while (queued && active) {
        queued = false;
        const audit = auditQueued; auditQueued = false;
        await render(epoch, revision, audit);
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
      revision++;
      clearTimeout(timer); timer = undefined;
      clearTimeout(settleTimer);
      clearTimeout(repairTimer);
      signatures.clear();
      drift.clear();
      boundsCache.clear();
      if (value) schedule();
    },
    schedule,
    reconcile,
    async flushNow(repair: boolean | "audit" = false) {
      clearTimeout(timer); timer = undefined;
      if (repair === true) { signatures.clear(); boundsCache.clear(); }
      if (repair === "audit") { auditQueued = true; boundsCache.clear(); }
      queued = true;
      await flush();
    },
  };
}
