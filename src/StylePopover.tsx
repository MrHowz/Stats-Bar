import { useState, useSyncExternalStore } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { Alert, Box, Button, ButtonBase, Typography } from "@mui/material";
import { canEdit, DEFAULT_SETTINGS, DEFAULT_STATS, readStats, type BarStyle } from "./model";
import { getSnapshot, subscribe, updateStats } from "./store";
import BarPreview from "./BarPreview";

export const STYLE_LABELS: Record<BarStyle, string> = {pixel: "คลาสสิก"};
const POPOVER_ID = "com.pixel-statbar/style";
export async function openStylePopover(tokenId: string) {
  const url = `/?style=1&token=${encodeURIComponent(tokenId)}`;
  if (!OBR.isAvailable) { location.assign(url); return; }
  const [width, height] = await Promise.all([OBR.viewport.getWidth(), OBR.viewport.getHeight()]);
  await OBR.popover.open({id: POPOVER_ID, url, width: 380, height: 280,
    anchorReference: "POSITION", anchorPosition: {left: width / 2, top: height / 2},
    transformOrigin: {horizontal: "CENTER", vertical: "CENTER"}});
}
export default function StylePopover() {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const item = state.items.find(i => i.id === new URLSearchParams(location.search).get("token"));
  const close = () => { if (OBR.isAvailable) void OBR.popover.close(POPOVER_ID); else history.back(); };
  const choose = async (style: BarStyle) => {
    if (!item || busy || !canEdit(item, state.viewer)) return;
    setBusy(true); setError("");
    try { await updateStats([item.id], s => ({...s, style})); close(); }
    catch (e) {setError(e instanceof Error ? e.message : String(e)); setBusy(false);}
  };
  return <Box className="style-window" sx={{p: 2, bgcolor: "background.paper", minHeight: "100dvh"}}>
    <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
      <Typography variant="h6" sx={{flex: 1}}>สไตล์ Stat Bar</Typography><Button onClick={close}>ปิด</Button>
    </Box>
    <Typography noWrap color="text.secondary" sx={{fontSize: 13, mb: 2}}>
      {item ? readStats(item).name || item.name : state.ready ? "ไม่พบโทเคนใน Scene" : "กำลังโหลด…"}
    </Typography>
    {error && <Alert severity="error">{error}</Alert>}
    <Box role="group" aria-label="เลือกสไตล์สำหรับโทเคนนี้" sx={{display: "grid", gap: 1.5}}>
      {(Object.entries(STYLE_LABELS) as [BarStyle, string][]).map(([style, label]) => {
        const selected = !!item && readStats(item).style === style;
        return <ButtonBase key={style} aria-label={label} aria-pressed={selected}
          disabled={!item || busy || !canEdit(item, state.viewer)} onClick={() => void choose(style)}
          sx={{display: "block", textAlign: "left", width: "100%", border: "1px solid",
            borderColor: selected ? "primary.main" : "divider", bgcolor: selected ? "action.selected" : "action.hover", borderRadius: 2, p: 1.5}}>
          <Box sx={{display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1}}>
            <Typography sx={{fontSize: 14}}>{label}</Typography>
            <Typography sx={{fontSize: 12, color: "primary.main"}}>{selected ? "ใช้อยู่" : "เลือก"}</Typography>
          </Box>
          <div className="style-sample"><BarPreview stats={{...DEFAULT_STATS, hp: 75, maxHp: 100, style}} settings={DEFAULT_SETTINGS}/></div>
        </ButtonBase>;
      })}
    </Box>
    <Typography color="text.secondary" sx={{fontSize: 12, mt: 1.5}}>เปลี่ยนเฉพาะโทเคนนี้ · ค่าสถานะยังเหมือนเดิม</Typography>
  </Box>;
}
