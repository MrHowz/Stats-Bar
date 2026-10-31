import { useState, useSyncExternalStore } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { Box, MenuList, MenuItem, Typography, Alert, Button } from "@mui/material";
import { getSnapshot, subscribe, setVisibility } from "./store";
import { readStats, type Visibility } from "./model";
export const VISIBILITY_LABELS: Record<Visibility,string> = {
 public:"ทุกคนเห็นค่าสถานะ", bar:"ผู้เล่นอื่นเห็นเฉพาะแถบ HP", gm:"เฉพาะ GM"
};
const POPOVER_ID = "com.pixel-statbar/visibility";
export async function openVisibilityPopover(tokenId:string) {
 const url = `/?visibility=1&token=${encodeURIComponent(tokenId)}`;
 if (!OBR.isAvailable) { location.assign(url); return; }
 const [width,height] = await Promise.all([OBR.viewport.getWidth(),OBR.viewport.getHeight()]);
 await OBR.popover.open({id:POPOVER_ID,url,width:320,height:228,anchorReference:"POSITION",anchorPosition:{left:width/2,top:height/2},transformOrigin:{horizontal:"CENTER",vertical:"CENTER"}});
}
export default function VisibilityPopover() {
 const state=useSyncExternalStore(subscribe,getSnapshot);
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const tokenId=new URLSearchParams(location.search).get("token");
 const item=state.items.find(i=>i.id===tokenId);
 const close=()=>{if(OBR.isAvailable) void OBR.popover.close(POPOVER_ID);else history.back();};
 const choose=async (visibility:Visibility)=>{
  if(!item || busy || state.viewer.role!=="GM")return;
  setBusy(true);setError("");
  try {await setVisibility([item.id],{visibility});close();}
  catch(e){setError(e instanceof Error?e.message:String(e));setBusy(false);}
 };
 return <Box sx={{p:1,bgcolor:"background.paper",minHeight:"100vh"}}>
  <Box sx={{display:"flex",alignItems:"center",px:1,gap:1}}><Typography variant="subtitle1" sx={{flex:1}}>ประเภท</Typography><Button onClick={close}>ปิด</Button></Box>
  <Typography noWrap sx={{px:1,color:"text.secondary",fontSize:12}}>{item ? readStats(item).name || item.name : state.ready ? "ไม่พบโทเคนใน Scene" : "กำลังโหลด…"}</Typography>
  {error && <Alert severity="error">{error}</Alert>}
  <MenuList aria-label="ประเภทการแสดงค่าสถานะ">
   {(Object.entries(VISIBILITY_LABELS) as [Visibility,string][]).map(([value,label])=><MenuItem key={value} selected={!!item&&readStats(item).visibility===value} disabled={!item||busy||state.viewer.role!=="GM"} onClick={()=>void choose(value)} sx={{minHeight:40,fontSize:14}}>{label}</MenuItem>)}
  </MenuList>
 </Box>;
}
