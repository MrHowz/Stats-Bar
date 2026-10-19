import type { Item, Permission } from "@owlbear-rodeo/sdk";

export const ID = "com.pixel-statbar";
export const STAT_KEY = `${ID}/stats`;
export const SETTINGS_KEY = `${ID}/settings`;
export const OVERLAY_KEY = `${ID}/overlay`;
export type Visibility = "public" | "bar" | "owner" | "gm";
export type StatField = "hp" | "maxHp" | "tempHp" | "ac";
export interface Stats {
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  visibility: Visibility;
  name: string;
  controllerId: string;
}
export interface Settings {
  position: "above" | "below";
  width: number;
  offset: number;
  showNumbers: boolean;
  showNames: boolean;
  decay: boolean;
  segments: number;
}
export interface Viewer {
  role: "GM" | "PLAYER";
  id: string;
  permissions: Permission[];
}
export const DEFAULT_STATS: Stats = {
  hp: 0,
  maxHp: 0,
  tempHp: 0,
  ac: 0,
  visibility: "public",
  name: "",
  controllerId: "",
};
export const DEFAULT_SETTINGS: Settings = {
  position: "above",
  width: 1.5,
  offset: 8,
  showNumbers: true,
  showNames: false,
  decay: true,
  segments: 4,
};
const record = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" ? (v as Record<string, unknown>) : {};
const numeric = (v: unknown, fallback = 0) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.min(99999, Math.max(0, Math.round(v)))
    : fallback;
export function readStats(item: Pick<Item, "metadata">): Stats {
  const s = record(item.metadata[STAT_KEY]);
  const maxHp = numeric(s.maxHp);
  return {
    hp: maxHp > 0 ? Math.min(numeric(s.hp), maxHp) : numeric(s.hp),
    maxHp,
    tempHp: numeric(s.tempHp),
    ac: numeric(s.ac),
    visibility: ["public", "bar", "owner", "gm"].includes(String(s.visibility))
      ? (s.visibility as Visibility)
      : "public",
    name: typeof s.name === "string" ? s.name.slice(0, 60) : "",
    controllerId: typeof s.controllerId === "string" ? s.controllerId : "",
  };
}
export function readSettings(room: unknown, scene?: unknown): Settings {
  const r = { ...record(room), ...record(scene) };
  return {
    position: r.position === "below" ? "below" : "above",
    width:
      typeof r.width === "number" && Number.isFinite(r.width)
        ? Math.max(0.6, Math.min(3, r.width))
        : 1.5,
    offset:
      typeof r.offset === "number" && Number.isFinite(r.offset)
        ? Math.max(0, Math.min(100, r.offset))
        : 8,
    showNumbers: typeof r.showNumbers === "boolean" ? r.showNumbers : true,
    showNames: typeof r.showNames === "boolean" ? r.showNames : false,
    decay: typeof r.decay === "boolean" ? r.decay : true,
    segments: [4, 5, 10].includes(Number(r.segments)) ? Number(r.segments) : 4,
  };
}
export const isToken = (i: Item) =>
  i.type === "IMAGE" &&
  ["CHARACTER", "MOUNT", "PROP"].includes(i.layer) &&
  !i.metadata[OVERLAY_KEY];
export const owns = (i: Item, v: Viewer) =>
  (readStats(i).controllerId || i.createdUserId) === v.id;
export function access(i: Item, v: Viewer): "full" | "bar" | "none" {
  if (v.role === "GM") return "full";
  if (!i.visible) return "none";
  const visibility = readStats(i).visibility;
  if (visibility === "gm") return "none";
  if (visibility === "owner") return owns(i, v) ? "full" : "none";
  return visibility === "bar" && !owns(i, v) ? "bar" : "full";
}
export function canEdit(i: Item, v: Viewer): boolean {
  if (v.role === "GM") return true;
  if (access(i, v) !== "full") return false;
  if (!v.permissions.includes(`${i.layer}_UPDATE` as Permission)) return false;
  if (
    i.layer === "CHARACTER" &&
    v.permissions.includes("CHARACTER_OWNER_ONLY") &&
    i.createdUserId !== v.id
  )
    return false;
  return true;
}
// A small arithmetic parser: no eval, JavaScript, functions, or implicit coercion.
export function calculate(input: string, current: number): number {
  let source = input.replace(/\s+/g, "");
  if (!source || source.length > 80 || !/^[\d.+\-*/()]+$/.test(source))
    throw new Error("ใช้ตัวเลข หรือ +6, -6, 20-5 เท่านั้น");
  if (/^[+\-*/]/.test(source)) source = `${current}${source}`;
  let p = 0;
  function atom(): number {
    if (source[p] === "+") {
      p++;
      return atom();
    }
    if (source[p] === "-") {
      p++;
      return -atom();
    }
    if (source[p] === "(") {
      p++;
      const n = sum();
      if (source[p++] !== ")") throw new Error("วงเล็บไม่ครบ");
      return n;
    }
    const m = source.slice(p).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (!m) throw new Error("รูปแบบตัวเลขไม่ถูกต้อง");
    p += m[0].length;
    return Number(m[0]);
  }
  function product(): number {
    let n = atom();
    while (source[p] === "*" || source[p] === "/") {
      const op = source[p++];
      const b = atom();
      n = op === "*" ? n * b : n / b;
    }
    return n;
  }
  function sum(): number {
    let n = product();
    while (source[p] === "+" || source[p] === "-") {
      const op = source[p++];
      const b = product();
      n = op === "+" ? n + b : n - b;
    }
    return n;
  }
  const value = sum();
  if (p !== source.length || !Number.isFinite(value) || Math.abs(value) > 99999)
    throw new Error("ผลลัพธ์ต้องเป็นตัวเลขไม่เกิน 99,999");
  return Math.round(value);
}
export function editStat(stats: Stats, field: StatField, input: string): Stats {
  const value = Math.max(0, calculate(input, stats[field]));
  const next = { ...stats, [field]: value };
  if (next.maxHp > 0) next.hp = Math.min(next.hp, next.maxHp);
  return next;
}
export function applyAmount(
  stats: Stats,
  kind: "damage" | "heal" | "temp",
  amount: number,
): Stats {
  if (!Number.isFinite(amount) || amount < 0 || amount > 99999)
    throw new Error("จำนวนต้องอยู่ระหว่าง 0–99,999");
  const n = Math.round(amount);
  if (kind === "temp") return { ...stats, tempHp: Math.max(stats.tempHp, n) };
  if (kind === "heal")
    return {
      ...stats,
      hp: stats.maxHp > 0 ? Math.min(stats.maxHp, stats.hp + n) : stats.hp + n,
    };
  return {
    ...stats,
    tempHp: Math.max(0, stats.tempHp - n),
    hp: Math.max(0, stats.hp - Math.max(0, n - stats.tempHp)),
  };
}
export function healthLabel(s: Stats): string {
  if (!s.maxHp) return "ยังไม่ได้ตั้ง HP";
  const p = s.hp / s.maxHp;
  return p === 0
    ? "หมดสภาพ"
    : p <= 0.25
      ? "วิกฤต"
      : p <= 0.5
        ? "บาดเจ็บ"
        : p < 1
          ? "บาดเจ็บเล็กน้อย"
          : "สมบูรณ์";
}
export function displayStats(
  s: Stats,
  mode: "full" | "bar",
  segments: number,
): Stats {
  return mode === "bar"
    ? {
        ...s,
        hp: s.hp > 0 ? Math.ceil((s.hp / Math.max(1, s.maxHp)) * segments) : 0,
        maxHp: segments,
        tempHp: 0,
        ac: 0,
      }
    : s;
}
