import OBR from "@owlbear-rodeo/sdk";
import type { Item, Metadata } from "@owlbear-rodeo/sdk";
import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  STAT_KEY,
  SETTINGS_KEY,
  isToken,
  canEdit,
  readStats,
  readSettings,
} from "./model";
import type { Settings, Stats, Viewer } from "./model";

export interface State {
  ready: boolean;
  sceneReady: boolean;
  demo: boolean;
  items: Item[];
  selection: string[];
  viewer: Viewer;
  settings: Settings;
  roomSettings: unknown;
  sceneSettings: unknown;
  error: string;
  busy: boolean;
}
const demo = !OBR.isAvailable;
const demoPermissions: Viewer["permissions"] = [
  "CHARACTER_UPDATE",
  "PROP_UPDATE",
  "MOUNT_UPDATE",
  "CHARACTER_OWNER_ONLY",
];
function demoItems(): Item[] {
  return [
    {
      name: "Aldric · The Iron Warden",
      hp: 42,
      maxHp: 56,
      tempHp: 8,
      ac: 18,
      visibility: "public",
      owner: "preview-player",
    },
    {
      name: "Mira · Moonweaver",
      hp: 32,
      maxHp: 32,
      tempHp: 0,
      ac: 14,
      visibility: "public",
      owner: "preview-player",
    },
    {
      name: "Hollow Knight",
      hp: 18,
      maxHp: 48,
      tempHp: 0,
      ac: 16,
      visibility: "bar",
      owner: "gm",
    },
    {
      name: "Mossbound Revenant",
      hp: 6,
      maxHp: 40,
      tempHp: 0,
      ac: 12,
      visibility: "bar",
      owner: "gm",
    },
    {
      name: "Fallen Sentinel",
      hp: 0,
      maxHp: 36,
      tempHp: 0,
      ac: 15,
      visibility: "gm",
      owner: "gm",
    },
  ].map(
    (s, i) =>
      ({
        id: `demo-${i}`,
        type: "IMAGE",
        name: s.name,
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        layer: "CHARACTER",
        createdUserId: s.owner,
        visible: true,
        locked: false,
        zIndex: 0,
        lastModified: "",
        lastModifiedUserId: "",
        metadata: { [STAT_KEY]: { ...DEFAULT_STATS, ...s, name: s.name } },
      }) as Item,
  );
}
let initialItems = demoItems();
if (demo) {
  try {
    const saved = JSON.parse(
      localStorage.getItem("pixel-statbar-demo") || "null",
    );
    if (Array.isArray(saved) && saved.length === 5)
      initialItems = initialItems.map((i, n) => ({
        ...i,
        metadata: {
          [STAT_KEY]: readStats({ metadata: { [STAT_KEY]: saved[n] } }),
        },
      }));
  } catch {
    /* Preview storage is optional. */
  }
}
let state: State = {
  ready: demo,
  sceneReady: demo,
  demo,
  items: demo ? initialItems : [],
  selection: demo ? ["demo-0"] : [],
  viewer: { role: "GM", id: "preview-player", permissions: demoPermissions },
  settings: DEFAULT_SETTINGS,
  roomSettings: undefined,
  sceneSettings: undefined,
  error: "",
  busy: false,
};
const listeners = new Set<() => void>();
export const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const getSnapshot = () => state;
function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  for (const fn of listeners) fn();
}
export const report = (err: unknown) =>
  set({ error: err instanceof Error ? err.message : String(err) });
export const clearError = () => set({ error: "" });
let loadVersion = 0;
async function refresh() {
  const version = ++loadVersion;
  const sceneReady = await OBR.scene.isReady();
  const [role, id, permissions, selection, room, scene, items] =
    await Promise.all([
      OBR.player.getRole(),
      OBR.player.getId(),
      OBR.room.getPermissions(),
      OBR.player.getSelection(),
      OBR.room.getMetadata(),
      sceneReady ? OBR.scene.getMetadata() : Promise.resolve({} as Metadata),
      sceneReady ? OBR.scene.items.getItems() : Promise.resolve([]),
    ]);
  if (version !== loadVersion) return;
  set({
    ready: true,
    sceneReady,
    viewer: { role, id, permissions },
    selection: selection || [],
    items: items.filter(isToken),
    roomSettings: room[SETTINGS_KEY],
    sceneSettings: scene[SETTINGS_KEY],
    settings: readSettings(room[SETTINGS_KEY], scene[SETTINGS_KEY]),
  });
}
if (!demo)
  OBR.onReady(() => {
    void refresh().catch(report);
    OBR.scene.onReadyChange(() => {
      set({ items: [], sceneReady: false });
      void refresh().catch(report);
    });
    OBR.scene.items.onChange((items) => set({ items: items.filter(isToken) }));
    OBR.player.onChange((p) =>
      set({
        selection: p.selection || [],
        viewer: { ...state.viewer, role: p.role, id: p.id },
      }),
    );
    OBR.room.onPermissionsChange((permissions) =>
      set({ viewer: { ...state.viewer, permissions } }),
    );
    OBR.room.onMetadataChange((m) =>
      set({
        roomSettings: m[SETTINGS_KEY],
        settings: readSettings(m[SETTINGS_KEY], state.sceneSettings),
      }),
    );
    OBR.scene.onMetadataChange((m) =>
      set({
        sceneSettings: m[SETTINGS_KEY],
        settings: readSettings(state.roomSettings, m[SETTINGS_KEY]),
      }),
    );
  });
let writes: Promise<void> = Promise.resolve();
export function updateStats(ids: string[], fn: (stats: Stats) => Stats) {
  const run = async () => {
    set({ busy: true, error: "" });
    try {
      if (state.demo) {
        set({
          items: state.items.map((i) =>
            ids.includes(i.id) && canEdit(i, state.viewer)
              ? {
                  ...i,
                  metadata: { ...i.metadata, [STAT_KEY]: fn(readStats(i)) },
                }
              : i,
          ),
        });
        try {
          localStorage.setItem(
            "pixel-statbar-demo",
            JSON.stringify(state.items.map(readStats)),
          );
        } catch {
          /* In-memory preview still works. */
        }
      } else {
        // Recheck role, permissions and current values at write time, not from a stale UI selection.
        const [role, id, permissions] = await Promise.all([
          OBR.player.getRole(),
          OBR.player.getId(),
          OBR.room.getPermissions(),
        ]);
        await OBR.scene.items.updateItems(ids, (drafts) => {
          for (const item of drafts)
            if (isToken(item) && canEdit(item, { role, id, permissions }))
              item.metadata[STAT_KEY] = fn(readStats(item));
        });
      }
    } catch (e) {
      report(e);
      throw e;
    } finally {
      set({ busy: false });
    }
  };
  const result = writes.then(run);
  writes = result.catch(() => {});
  return result;
}
export async function setVisibility(
  ids: string[],
  patch: Partial<Pick<Stats, "visibility" | "controllerId">>,
) {
  if (state.viewer.role !== "GM") throw new Error("เฉพาะ GM เท่านั้น");
  if (!demo && (await OBR.player.getRole()) !== "GM")
    throw new Error("เฉพาะ GM เท่านั้น");
  return updateStats(ids, (s) => ({ ...s, ...patch }));
}
export async function select(ids: string[]) {
  if (demo) set({ selection: ids });
  else await OBR.player.select(ids, true);
}
export function toggleRole() {
  if (demo)
    set({
      viewer: {
        ...state.viewer,
        role: state.viewer.role === "GM" ? "PLAYER" : "GM",
      },
    });
}
export function resetDemo() {
  if (demo) {
    set({
      items: demoItems(),
      selection: ["demo-0"],
      viewer: { ...state.viewer, role: "GM" },
    });
    localStorage.removeItem("pixel-statbar-demo");
  }
}
export async function saveSettings(
  patch: Partial<Settings> | null,
  scope: "room" | "scene",
) {
  if (state.viewer.role !== "GM") throw new Error("เฉพาะ GM เท่านั้น");
  const previous = scope === "room" ? state.roomSettings : state.sceneSettings;
  const next =
    patch === null
      ? undefined
      : {
          ...(previous && typeof previous === "object" ? previous : {}),
          ...patch,
        };
  if (demo) {
    const room = scope === "room" ? next : state.roomSettings;
    const scene = scope === "scene" ? next : state.sceneSettings;
    set({
      roomSettings: room,
      sceneSettings: scene,
      settings: readSettings(room, scene),
    });
  } else {
    if ((await OBR.player.getRole()) !== "GM")
      throw new Error("เฉพาะ GM เท่านั้น");
    await OBR[scope].setMetadata({ [SETTINGS_KEY]: next });
  }
}
