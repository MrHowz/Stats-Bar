import OBR from "@owlbear-rodeo/sdk";
export const SETTINGS_MODAL_ID="com.pixel-statbar/settings-window";
export async function openSettingsWindow(){
 if(!OBR.isAvailable){location.assign("/?settings=1");return;}
 await OBR.modal.open({id:SETTINGS_MODAL_ID,url:"/?settings=1",width:440,height:540});
}
