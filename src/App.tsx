import { useRef, useState, useSyncExternalStore } from "react";
import type { Item, Image as OBRImage } from "@owlbear-rodeo/sdk";
import {
  access,
  applyAmount,
  canEdit,
  displayStats,
  editStat,
  healthLabel,
  readStats,
} from "./model";
import type { Settings, StatField, Stats } from "./model";
import { barSvg, svgUrl } from "./art";
import {
  clearError,
  getSnapshot,
  report,
  resetDemo,
  saveSettings,
  select,
  setVisibility,
  subscribe,
  toggleRole,
  updateStats,
} from "./store";

const safely = (p: Promise<unknown>) => void p.catch(report);
const shortName = (i: Item) => readStats(i).name || i.name || "Unnamed token";
function Icon({
  kind,
}: {
  kind: "heart" | "shield" | "spark" | "gear" | "eye" | "cross";
}) {
  const paths = {
    heart: "M3 3h5v3h4V3h5v3h2v7h-4v4h-3v3H8v-3H5v-4H1V6h2z",
    shield: "M3 2h14v12l-7 6-7-6z M7 6h6v6l-3 3-3-3z",
    spark: "M9 0h2v7h7v2h-7v9H9V9H2V7h7z",
    gear: "M7 1h6v4h4v3h3v5h-3v4h-4v3H7v-3H3v-4H0V8h3V5h4z M7 8v5h6V8z",
    eye: "M0 8h3V5h4V3h6v2h4v3h3v5h-3v3h-4v2H7v-2H3v-3H0z M7 7v7h6V7z",
    cross: "M4 2l6 6 6-6 3 3-6 6 6 6-3 3-6-6-6 6-3-3 6-6-6-6z",
  };
  return (
    <svg className="icon" viewBox="0 0 22 22" aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d={paths[kind]} />
    </svg>
  );
}
function Bar({
  stats,
  settings,
  numbers = true,
  segmented = false,
}: {
  stats: Stats;
  settings: Settings;
  numbers?: boolean;
  segmented?: boolean;
}) {
  return (
    <img
      className="pixelbar"
      src={svgUrl(
        barSvg(stats, settings, {
          numbers: numbers && settings.showNumbers,
          segmented,
        }),
      )}
      alt={
        numbers
          ? `HP ${stats.hp}/${stats.maxHp} · Temp HP ${stats.tempHp} · AC ${stats.ac}`
          : "แถบพลังแบบแบ่งช่วง"
      }
    />
  );
}
function StatInput({
  item,
  field,
  label,
  icon,
}: {
  item: Item;
  field: StatField;
  label: string;
  icon: "heart" | "shield" | "spark";
}) {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  const value = readStats(item)[field];
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const cancelled = useRef(false);
  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    if (draft === null) return;
    const input = draft;
    try {
      editStat(readStats(item), field, input);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setDraft(null);
    setError("");
    safely(updateStats([item.id], (s) => editStat(s, field, input)));
  };
  return (
    <label className={`stat-input ${field}`}>
      <span>
        <Icon kind={icon} />
        {label}
      </span>
      <input
        aria-label={`${label} ${shortName(item)}`}
        aria-invalid={!!error}
        title={error || "พิมพ์ค่า หรือ +6 / -6 แล้วกด Enter"}
        value={draft ?? String(value)}
        disabled={!canEdit(item, state.viewer) || state.busy}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setDraft(e.target.value);
          setError("");
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            cancelled.current = true;
            setDraft(null);
            setError("");
            e.currentTarget.blur();
          }
        }}
      />
      {error && <small role="alert">{error}</small>}
    </label>
  );
}
function SettingsPanel() {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  const [scope, setScope] = useState<"room" | "scene">("scene");
  const s = state.settings;
  const change = (p: Partial<Settings>) => safely(saveSettings(p, scope));
  return (
    <section className="settings">
      <h2>ตั้งค่าแถบพลัง</h2>
      <p className="muted">ค่าของ Scene จะมีผลเหนือค่าของห้อง</p>
      <div className="segmented">
        <button
          className={scope === "scene" ? "active" : ""}
          onClick={() => setScope("scene")}
        >
          Scene นี้
        </button>
        <button
          className={scope === "room" ? "active" : ""}
          onClick={() => setScope("room")}
        >
          ทั้งห้อง
        </button>
      </div>
      <label className="setting">
        ตำแหน่ง
        <select
          value={s.position}
          onChange={(e) =>
            change({ position: e.target.value as Settings["position"] })
          }
        >
          <option value="above">เหนือโทเคน</option>
          <option value="below">ใต้โทเคน</option>
        </select>
      </label>
      <label className="setting">
        ความกว้าง <span>{s.width.toFixed(1)}×</span>
        <input
          aria-label="ความกว้างแถบ"
          type="range"
          min="0.6"
          max="3"
          step="0.1"
          value={s.width}
          onChange={(e) => change({ width: Number(e.target.value) })}
        />
      </label>
      <label className="setting">
        ระยะห่าง (ติดลบ = ชิดขึ้น)
        <input
          aria-label="ระยะห่างแถบ"
          type="number"
          min="-100"
          max="100"
          key={s.offset}
          defaultValue={s.offset}
          onBlur={(e) => {
            if (Number.isFinite(e.target.valueAsNumber))
              change({ offset: e.target.valueAsNumber });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </label>
      {(
        [
          ["decay", "กรอบแตกตาม HP"],
          ["showNumbers", "แสดงตัวเลข HP"],
          ["showNames", "แสดงชื่อเหนือแถบ"],
        ] as const
      ).map(([key, label]) => (
        <label className="setting" key={key}>
          {label}
          <input
            type="checkbox"
            checked={s[key]}
            onChange={(e) => change({ [key]: e.target.checked })}
          />
        </label>
      ))}
      <label className="setting">
        จำนวนช่วงที่ผู้เล่นเห็น
        <select
          value={s.segments}
          onChange={(e) => change({ segments: Number(e.target.value) })}
        >
          {[4, 5, 10].map((n) => (
            <option key={n} value={n}>
              {n} ช่วง
            </option>
          ))}
        </select>
      </label>
      {scope === "scene" && (
        <button
          className="wide subtle"
          onClick={() => safely(saveSettings(null, "scene"))}
        >
          ใช้ค่าจากห้อง
        </button>
      )}
      <div className="note">
        Max HP มากกว่า 0 จะแสดงแถบอัตโนมัติ · Temp HP และ AC จะแสดงเมื่อมากกว่า
        0
      </div>
    </section>
  );
}

function Visibility({
  item,
  compact = false,
}: {
  item: Item;
  compact?: boolean;
}) {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  const s = readStats(item);
  return (
    <select
      className="visibility"
      aria-label={`การมองเห็น ${shortName(item)}`}
      title="การมองเห็น: ทั้งหมด / แบ่งช่วง / เจ้าของ / GM"
      disabled={state.viewer.role !== "GM" || state.busy}
      value={s.visibility}
      onChange={(e) =>
        safely(
          setVisibility([item.id], {
            visibility: e.target.value as Stats["visibility"],
          }),
        )
      }
    >
      <option value="public">{compact ? "◉" : "◉ ทั้งหมด"}</option>
      <option value="bar">{compact ? "▥" : "▥ แบ่งช่วง"}</option>
      <option value="owner">{compact ? "♙" : "♙ เจ้าของ"}</option>
      <option value="gm">{compact ? "◆" : "◆ GM"}</option>
    </select>
  );
}
function TokenPicture({ item }: { item: Item }) {
  const [broken, setBroken] = useState(false);
  const url = (item as OBRImage).image?.url;
  return (
    <span className="token-picture">
      {url && !broken ? (
        <img src={url} alt="" onError={() => setBroken(true)} />
      ) : (
        <Icon kind="shield" />
      )}
    </span>
  );
}
function Fields({ item }: { item: Item }) {
  return (
    <>
      <StatInput item={item} field="hp" label="HP" icon="heart" />
      <span className="slash">/</span>
      <StatInput item={item} field="maxHp" label="MAX" icon="heart" />
      <StatInput item={item} field="tempHp" label="TEMP" icon="heart" />
      <StatInput item={item} field="ac" label="AC" icon="shield" />
    </>
  );
}
function CompactEditor({ item }: { item: Item }) {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  const stats = readStats(item);
  const [name, setName] = useState<string | null>(null);
  if (access(item, state.viewer) !== "full")
    return <p className="empty">GM แสดงเฉพาะระดับพลังของโทเคนนี้</p>;
  return (
    <section className="compact-editor">
      <div className="name-line">
        <TokenPicture item={item} />
        <input
          aria-label="ชื่อโทเคน"
          placeholder={item.name}
          value={name ?? stats.name}
          maxLength={60}
          disabled={!canEdit(item, state.viewer)}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name !== null) {
              safely(updateStats([item.id], (s) => ({ ...s, name })));
              setName(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setName(null);
            }
          }}
        />
      </div>
      <Bar stats={stats} settings={state.settings} />
      <div className="compact-fields">
        <Fields item={item} />
      </div>
      <div className="access-line">
        <span>ผู้เล่นเห็น</span>
        <Visibility item={item} />
      </div>
    </section>
  );
}
export default function App() {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  const context = new URLSearchParams(location.search).has("context");
  const [settings, setSettings] = useState(false);
  const [search, setSearch] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [amount, setAmount] = useState("5");
  const visible = state.items.filter((i) => access(i, state.viewer) !== "none");
  const selected = visible.filter((i) => state.selection.includes(i.id));
  const targets = selected.filter((i) => canEdit(i, state.viewer));
  const listed = visible.filter(
    (i) =>
      (!onlySelected || state.selection.includes(i.id)) &&
      shortName(i).toLowerCase().includes(search.toLowerCase()),
  );
  const operate = (kind: "damage" | "heal" | "temp") => {
    const n = Number(amount);
    if (!amount.trim() || !Number.isFinite(n) || n < 0 || n > 99999) {
      report(new Error("ใส่จำนวนระหว่าง 0–99,999"));
      return;
    }
    safely(
      updateStats(
        targets.map((i) => i.id),
        (s) => applyAmount(s, kind, n),
      ),
    );
  };
  return (
    <main className={`stat-app ${context ? "context-app" : "table-app"}`}>
      {!context && (
        <header className="app-header">
          <img src="./icon.svg" alt="" />
          <strong>Pixel Statbar</strong>
          <span>{state.viewer.role}</span>
          <button
            aria-label={settings ? "กลับรายการโทเคน" : "ตั้งค่า"}
            disabled={state.viewer.role !== "GM"}
            onClick={() => setSettings(!settings)}
          >
            <Icon kind={settings ? "cross" : "gear"} />
          </button>
        </header>
      )}
      {state.error && (
        <div role="alert" className="error">
          {state.error}
          <button aria-label="ปิดข้อความ" onClick={clearError}>
            ×
          </button>
        </div>
      )}
      {!state.ready || !state.sceneReady ? (
        <p className="empty">
          {state.ready ? "เปิด Scene เพื่อเริ่มใช้งาน" : "กำลังเชื่อมต่อ…"}
        </p>
      ) : settings && !context ? (
        <SettingsPanel />
      ) : (
        <>
          {context ? (
            selected[0] ? (
              <CompactEditor key={selected[0].id} item={selected[0]} />
            ) : (
              <p className="empty">เลือกโทเคนเพื่อแก้ค่าสถานะ</p>
            )
          ) : (
            <>
              <div className="table-tools">
                <input
                  aria-label="ค้นหาโทเคน"
                  placeholder="ค้นหาโทเคน…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  className={onlySelected ? "active" : ""}
                  onClick={() => setOnlySelected(!onlySelected)}
                  aria-pressed={onlySelected}
                >
                  ที่เลือก ({selected.length})
                </button>
              </div>
              <div
                className="stats-table"
                role="table"
                aria-label="ค่าสถานะโทเคน"
              >
                <div className="stats-row table-head" role="row">
                  <span role="columnheader">
                    <input
                      type="checkbox"
                      aria-label="เลือกทุกโทเคนที่แสดง"
                      checked={
                        listed.length > 0 &&
                        listed.every((i) => state.selection.includes(i.id))
                      }
                      onChange={(e) =>
                        safely(
                          select(
                            e.target.checked
                              ? [
                                  ...new Set([
                                    ...state.selection,
                                    ...listed.map((i) => i.id),
                                  ]),
                                ]
                              : state.selection.filter(
                                  (id) => !listed.some((i) => i.id === id),
                                ),
                          ),
                        )
                      }
                    />{" "}
                    โทเคน
                  </span>
                  <span role="columnheader">สิทธิ์</span>
                  <span role="columnheader">HP</span>
                  <span />
                  <span role="columnheader">MAX</span>
                  <span role="columnheader" className="temp-label">
                    ♥ TEMP
                  </span>
                  <span role="columnheader" className="ac-label">
                    AC
                  </span>
                </div>
                <div className="table-body">
                  {listed.map((item) => {
                    const mode = access(item, state.viewer);
                    return (
                      <div
                        className={`stats-row ${state.selection.includes(item.id) ? "selected" : ""}`}
                        role="row"
                        key={item.id}
                      >
                        <div className="token-cell">
                          <input
                            type="checkbox"
                            aria-label={`เลือก ${shortName(item)}`}
                            checked={state.selection.includes(item.id)}
                            onChange={(e) =>
                              safely(
                                select(
                                  e.target.checked
                                    ? [...state.selection, item.id]
                                    : state.selection.filter(
                                        (id) => id !== item.id,
                                      ),
                                ),
                              )
                            }
                          />
                          <button
                            className="token-name"
                            title={shortName(item)}
                            onClick={() => safely(select([item.id]))}
                          >
                            <TokenPicture item={item} />
                            <span>{shortName(item)}</span>
                          </button>
                        </div>
                        <Visibility item={item} compact />
                        {mode === "full" ? (
                          <Fields item={item} />
                        ) : (
                          <span className="hidden-stats">
                            {healthLabel(
                              displayStats(
                                readStats(item),
                                "bar",
                                state.settings.segments,
                              ),
                            )}{" "}
                            · ซ่อนตัวเลข
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {listed.length === 0 && <p className="empty">ไม่พบโทเคน</p>}
                </div>
              </div>
            </>
          )}
          <section className="batch-bar">
            <div className="batch-label">
              {context ? "ปรับค่า" : "ใช้กับที่เลือก"} · {targets.length} โทเคน
            </div>
            <div className="batch-controls">
              <input
                aria-label="จำนวน Damage หรือ Heal"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button
                className="damage"
                disabled={!targets.length || state.busy}
                onClick={() => operate("damage")}
              >
                − Damage
              </button>
              <button
                className="heal"
                disabled={!targets.length || state.busy}
                onClick={() => operate("heal")}
              >
                + Heal
              </button>
              <button
                className="temp"
                disabled={!targets.length || state.busy}
                onClick={() => operate("temp")}
              >
                ♥ Temp
              </button>
            </div>
            {!context && (
              <p className="hint">
                พิมพ์ +6 / -6 ได้ · Enter บันทึก · Damage หัก Temp ก่อน
              </p>
            )}
          </section>
        </>
      )}
      <footer className="status-line">
        <span>
          {state.busy
            ? "กำลังบันทึก…"
            : state.demo
              ? "โหมดทดลอง"
              : "บันทึกในโทเคน"}
        </span>
        <span>1.1.0</span>
      </footer>
      {state.demo &&
        !context &&
        !new URLSearchParams(location.search).has("panel") && (
          <section className="demo-preview">
            <div className="demo-controls">
              <button onClick={toggleRole}>สลับ GM / Player</button>
              <button onClick={resetDemo}>เริ่มทดลองใหม่</button>
            </div>
            {visible.map((item) => {
              const mode = access(item, state.viewer);
              return (
                <div key={item.id}>
                  <small>{shortName(item)}</small>
                  <Bar
                    stats={displayStats(
                      readStats(item),
                      mode as "full" | "bar",
                      state.settings.segments,
                    )}
                    settings={state.settings}
                    numbers={mode === "full"}
                    segmented={mode === "bar"}
                  />
                </div>
              );
            })}
          </section>
        )}
    </main>
  );
}
