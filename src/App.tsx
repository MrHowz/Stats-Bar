import { useRef, useState, useSyncExternalStore } from "react";
import type { Item } from "@owlbear-rodeo/sdk";
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
    <label className={`stat-input ${field === "hp" ? "hp" : ""}`}>
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
        ระยะห่าง
        <input
          aria-label="ระยะห่างแถบ"
          type="number"
          min="0"
          max="100"
          value={s.offset}
          onChange={(e) => change({ offset: Number(e.target.value) })}
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
function Editor({ item }: { item: Item }) {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  const s = readStats(item);
  const editable = canEdit(item, state.viewer);
  const full = access(item, state.viewer) === "full";
  const [name, setName] = useState<string | null>(null);
  if (!full)
    return (
      <div className="empty">
        <Icon kind="eye" />
        <h3>แสดงเฉพาะระดับพลัง</h3>
        <p>GM ซ่อนตัวเลขและการแก้ไขของโทเคนนี้</p>
      </div>
    );
  return (
    <section className="editor">
      <div className="section-label">
        <span>SELECTED TOKEN</span>
        <span className="tag">{item.layer.toLowerCase()}</span>
      </div>
      <div className="token-heading">
        <div className="avatar">
          <Icon kind="shield" />
        </div>
        <div>
          <h2>{shortName(item)}</h2>
          <span
            className={`health-status ${s.hp === 0 ? "dead" : s.hp / s.maxHp <= 0.25 ? "critical" : ""}`}
          >
            <i />
            {healthLabel(s)}
          </span>
        </div>
      </div>
      <div className="bar-preview">
        <Bar stats={s} settings={state.settings} />
      </div>
      <div className="stat-grid">
        <StatInput item={item} field="hp" label="HP" icon="heart" />
        <StatInput item={item} field="maxHp" label="MAX HP" icon="heart" />
        <StatInput item={item} field="tempHp" label="TEMP HP" icon="spark" />
        <StatInput item={item} field="ac" label="AC" icon="shield" />
      </div>
      <p className="input-hint">
        <kbd>+6</kbd> รักษา <span>·</span> <kbd>-6</kbd> ลด HP <span>·</span>{" "}
        <kbd>Tab</kbd> ช่องถัดไป
      </p>
      {editable && (
        <div className="quick-actions">
          <button
            onClick={() =>
              safely(updateStats([item.id], (v) => applyAmount(v, "damage", 1)))
            }
          >
            −1 Damage
          </button>
          <button
            onClick={() =>
              safely(updateStats([item.id], (v) => applyAmount(v, "heal", 1)))
            }
          >
            +1 Heal
          </button>
          <button
            onClick={() =>
              safely(updateStats([item.id], (v) => ({ ...v, hp: v.maxHp })))
            }
          >
            เติม HP
          </button>
        </div>
      )}
      <details className="token-options">
        <summary>
          ชื่อและการมองเห็น <span>⌄</span>
        </summary>
        <label>
          ชื่อโทเคน
          <input
            aria-label="ชื่อโทเคน"
            maxLength={60}
            value={name ?? s.name}
            placeholder={item.name}
            disabled={!editable}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name !== null) {
                safely(
                  updateStats([item.id], (v) => ({
                    ...v,
                    name: name.slice(0, 60),
                  })),
                );
                setName(null);
              }
            }}
          />
        </label>
        {state.viewer.role === "GM" && (
          <>
            <label>
              ผู้เล่นมองเห็น
              <select
                aria-label="การมองเห็น"
                value={s.visibility}
                onChange={(e) =>
                  safely(
                    setVisibility([item.id], {
                      visibility: e.target.value as Stats["visibility"],
                    }),
                  )
                }
              >
                <option value="public">ตัวเลขทั้งหมด</option>
                <option value="bar">
                  เฉพาะแถบแบ่งช่วง (เจ้าของเห็นตัวเลข)
                </option>
                <option value="owner">เฉพาะเจ้าของและ GM</option>
                <option value="gm">เฉพาะ GM</option>
              </select>
            </label>
            <p className="muted small">
              เจ้าของอ้างอิงจากผู้สร้างโทเคนใน Owlbear Rodeo
            </p>
          </>
        )}
      </details>
      {!editable && (
        <p className="note">ดูได้อย่างเดียว ตามสิทธิ์ของห้องและโทเคน</p>
      )}
    </section>
  );
}
function Encounter({ items }: { items: Item[] }) {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  return (
    <div className="encounter">
      <div className="map-caption">
        <span className="live-dot" /> LIVE PREVIEW{" "}
        <span>คลิกโทเคนเพื่อทดลอง</span>
      </div>
      <div className="map-grid">
        <div className="map-rune r1">✥</div>
        <div className="map-rune r2">✥</div>
        {items.slice(0, 5).map((item, n) => {
          const s = readStats(item);
          const mode = access(item, state.viewer);
          if (mode === "none") return null;
          return (
            <button
              className={`map-token token-${n} ${state.selection.includes(item.id) ? "selected" : ""}`}
              key={item.id}
              onClick={() => safely(select([item.id]))}
            >
              <div className="map-bar">
                <Bar
                  stats={displayStats(s, mode, state.settings.segments)}
                  settings={state.settings}
                  numbers={mode === "full"}
                  segmented={mode === "bar"}
                />
              </div>
              <div className={`portrait portrait-${n}`}>
                <span>{["♜", "✦", "♞", "♟", "♜"][n]}</span>
              </div>
              <span className="map-token-name">
                {shortName(item).split(" · ")[0]}
              </span>
            </button>
          );
        })}
      </div>
      <div className="map-footer">
        <span>STONE & HEART</span>
        <span>กรอบหินที่เปลี่ยนไปตามการต่อสู้</span>
      </div>
    </div>
  );
}
export default function App() {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  const [tab, setTab] = useState<"tokens" | "settings">("tokens");
  const [filter, setFilter] = useState<"all" | "selected">("all");
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("5");
  const context = new URLSearchParams(location.search).has("context");
  const showcase =
    state.demo &&
    !context &&
    !new URLSearchParams(location.search).has("panel");
  const visible = state.items.filter((i) => access(i, state.viewer) !== "none");
  const selected = visible.filter((i) => state.selection.includes(i.id));
  const active = selected[0];
  const listed = visible.filter(
    (i) =>
      (filter === "all" || state.selection.includes(i.id)) &&
      shortName(i).toLowerCase().includes(search.toLowerCase()),
  );
  const targets = selected.filter((i) => canEdit(i, state.viewer));
  const operation = (kind: "damage" | "heal" | "temp") => {
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
    <main className={showcase ? "demo-shell" : "embedded"}>
      {showcase && (
        <header className="demo-header">
          <a className="brand" href="./">
            <img src="./icon.svg" alt="" />
            <span>
              PIXEL <b>STATBAR</b>
            </span>
          </a>
          <span className="demo-label">
            OWLBEAR RODEO EXTENSION <i /> v1.0.1
          </span>
        </header>
      )}
      {showcase && (
        <div className="demo-intro">
          <div className="eyebrow">EVERY HIT TELLS A STORY</div>
          <h1>
            A little heart.
            <br />
            <em>A lot of adventure.</em>
          </h1>
          <p>
            แถบพลังพิกเซล กรอบหิน และทุกรอยแผลของการผจญภัย
            <br />
            ลองเลือกโทเคนแล้วปรับ HP เพื่อดูการเปลี่ยนแปลง
          </p>
        </div>
      )}
      <div className="workspace">
        <div className="panel">
          <header className="panel-header">
            <div className="panel-title">
              <img src="./icon.svg" alt="" />
              <div>
                <strong>PIXEL STATBAR</strong>
                <small>
                  {state.demo
                    ? "PREVIEW SANDBOX"
                    : state.sceneReady
                      ? "OWLBEAR RODEO"
                      : "WAITING FOR SCENE"}
                </small>
              </div>
            </div>
            <span className="role">{state.viewer.role}</span>
            <button
              className={`icon-button ${tab === "settings" ? "on" : ""}`}
              title="ตั้งค่า"
              aria-label="ตั้งค่า"
              disabled={state.viewer.role !== "GM" || !state.sceneReady}
              onClick={() => setTab(tab === "settings" ? "tokens" : "settings")}
            >
              <Icon kind="gear" />
            </button>
          </header>
          {state.error && (
            <div role="alert" className="error">
              {state.error}
              <button aria-label="ปิดข้อความ" onClick={clearError}>
                ×
              </button>
            </div>
          )}
          {!state.ready ? (
            <div className="empty">กำลังเชื่อมต่อ Owlbear Rodeo…</div>
          ) : !state.sceneReady ? (
            <div className="empty">
              <Icon kind="heart" />
              <h3>เปิด Scene เพื่อเริ่มต้น</h3>
              <p>เลือกโทเคน แล้วกำหนด Max HP เพื่อสร้างแถบพลัง</p>
            </div>
          ) : tab === "settings" && state.viewer.role === "GM" ? (
            <SettingsPanel />
          ) : (
            <>
              {active ? (
                <Editor key={active.id} item={active} />
              ) : (
                <div className="empty">
                  <Icon kind="heart" />
                  <h3>เลือกโทเคนของคุณ</h3>
                  <p>
                    เลือกบนแผนที่หรือจากรายการด้านล่าง
                    <br />
                    คลิกขวา → Pixel Statbar เพื่อแก้ค่าสถานะ
                  </p>
                </div>
              )}
              {!context && (
                <section className="roster">
                  <div className="roster-title">
                    <h3>
                      โทเคนใน Scene <span>{visible.length}</span>
                    </h3>
                    <button
                      className="text-button"
                      onClick={() =>
                        safely(
                          select(
                            listed
                              .filter((i) => canEdit(i, state.viewer))
                              .map((i) => i.id),
                          ),
                        )
                      }
                    >
                      เลือกทั้งหมด
                    </button>
                  </div>
                  <div className="roster-tools">
                    <div className="segmented">
                      <button
                        className={filter === "all" ? "active" : ""}
                        onClick={() => setFilter("all")}
                      >
                        ทั้งหมด
                      </button>
                      <button
                        className={filter === "selected" ? "active" : ""}
                        onClick={() => setFilter("selected")}
                      >
                        ที่เลือก ({selected.length})
                      </button>
                    </div>
                    <input
                      aria-label="ค้นหาโทเคน"
                      className="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="ค้นหาชื่อ…"
                    />
                  </div>
                  <div className="token-list">
                    {listed.length === 0 ? (
                      <p className="muted empty-list">ไม่พบโทเคน</p>
                    ) : (
                      listed.map((item, n) => {
                        const s = readStats(item);
                        const mode = access(item, state.viewer);
                        return (
                          <div
                            className={`token-row ${state.selection.includes(item.id) ? "selected" : ""}`}
                            key={item.id}
                          >
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
                              className="token-row-main"
                              onClick={() => safely(select([item.id]))}
                            >
                              <span className={`mini-avatar color-${n % 4}`}>
                                <Icon kind="shield" />
                              </span>
                              <span className="row-name">
                                {shortName(item)}
                                <small>
                                  {s.visibility === "gm"
                                    ? "GM only"
                                    : s.visibility === "bar"
                                      ? "Segmented for players"
                                      : s.visibility === "owner"
                                        ? "Owner & GM"
                                        : s.maxHp
                                          ? "Public stats"
                                          : "ตั้ง Max HP เพื่อเริ่ม"}
                                </small>
                              </span>
                              <span className="row-hp">
                                {mode === "full" ? (
                                  <>
                                    {s.hp}
                                    <small> / {s.maxHp}</small>
                                  </>
                                ) : (
                                  healthLabel(
                                    displayStats(
                                      s,
                                      "bar",
                                      state.settings.segments,
                                    ),
                                  )
                                )}
                              </span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              )}
              <section className="batch">
                <div className="section-label">
                  <span>QUICK ACTIONS</span>
                  <span>{targets.length} โทเคนที่แก้ไขได้</span>
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
                    onClick={() => operation("damage")}
                  >
                    − Damage
                  </button>
                  <button
                    className="heal"
                    disabled={!targets.length || state.busy}
                    onClick={() => operation("heal")}
                  >
                    + Heal
                  </button>
                  <button
                    className="temp"
                    disabled={!targets.length || state.busy}
                    onClick={() => operation("temp")}
                  >
                    + Temp
                  </button>
                </div>
                <p className="small muted">
                  Damage หัก Temp HP ก่อน · Heal ไม่เกิน Max HP
                </p>
              </section>
            </>
          )}
          <footer className="panel-footer">
            <span className="live-dot" />
            {state.busy
              ? "กำลังบันทึก…"
              : state.demo
                ? "โหมดทดลอง · บันทึกเฉพาะเครื่องนี้"
                : state.ready
                  ? "เชื่อมต่อแล้ว · บันทึกในโทเคน"
                  : "กำลังเชื่อมต่อ…"}
            <span>1.0.1</span>
          </footer>
        </div>
        {showcase && (
          <div className="preview-side">
            <Encounter items={visible} />
            <div className="preview-tools">
              <button onClick={toggleRole}>
                <Icon kind="eye" /> มุมมอง{" "}
                {state.viewer.role === "GM" ? "Player" : "GM"}
              </button>
              <button onClick={resetDemo}>↺ เริ่มทดลองใหม่</button>
            </div>
            <div className="install-note">
              <span>01</span>
              <div>
                <h3>Ready for your next encounter.</h3>
                <p>
                  อัปโหลดโฟลเดอร์ dist ไปยังโฮสต์ HTTPS แล้วเพิ่ม URL ของ
                  manifest.json ใน Owlbear Rodeo
                </p>
                <a href="./manifest.json" target="_blank" rel="noreferrer">
                  ดู Extension manifest ↗
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
      {showcase && (
        <footer className="demo-footer">
          <span>BUILT FOR SMALL HEROES & BIG ADVENTURES</span>
          <span>Pixel Statbar · Independent Owlbear Rodeo extension</span>
        </footer>
      )}
    </main>
  );
}
