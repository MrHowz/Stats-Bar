import {useState,useSyncExternalStore} from "react";
import OBR from "@owlbear-rodeo/sdk";
import {Button,Alert} from "@mui/material";
import {SettingsPanel} from "./App";
import {getSnapshot,subscribe,saveSettings} from "./store";
import {SETTINGS_MODAL_ID} from "./settings-window";
export default function SettingsWindow(){
 const state=useSyncExternalStore(subscribe,getSnapshot);
 const [closing,setClosing]=useState(false),[error,setError]=useState("");
 const close=async()=>{
  setClosing(true);
  try{ if(state.viewer.role==="GM")await saveSettings({}); if(OBR.isAvailable)await OBR.modal.close(SETTINGS_MODAL_ID);else history.back(); }
  catch(e){setError(e instanceof Error?e.message:String(e));setClosing(false);}
 };
 return <main className="settings-window">
  <header className="settings-heading"><div><h2>ตั้งค่า</h2><span>Pixel Statbar</span></div><Button onClick={()=>void close()} disabled={closing} aria-label="ปิดหน้าตั้งค่า">{closing?"กำลังบันทึก…":"ปิด"}</Button></header>
  {error&&<Alert severity="error">{error}</Alert>}
  {!state.ready?<p className="empty">กำลังเชื่อมต่อ…</p>:state.viewer.role!=="GM"?<p className="empty">เฉพาะ GM เท่านั้น</p>:<SettingsPanel/>}
 </main>;
}
