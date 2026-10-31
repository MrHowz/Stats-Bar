import {createRoot} from "react-dom/client";
import BarPreview from "../src/BarPreview";
import {DEFAULT_SETTINGS, DEFAULT_STATS, displayStats} from "../src/model";
import "../src/style.css";
const examples = [
  {hp:27,maxHp:38,tempHp:16,ac:15},
  {hp:0,maxHp:38,tempHp:0,ac:0},
  {hp:99999,maxHp:99999,tempHp:99999,ac:99999},
];
createRoot(document.getElementById("root")!).render(<div style={{background:"#202434",color:"white",padding:24,fontFamily:"sans-serif",display:"grid",gridTemplateColumns:"repeat(2,440px)",gap:24}}>
  {(["pixel"] as const).map(style => <div key={style}>
    <h2>Classic</h2>
    {examples.map((s,i) => <div key={i} style={{padding:"16px 0",minHeight:180}}><BarPreview stats={{...DEFAULT_STATS,...s,style}} settings={DEFAULT_SETTINGS}/></div>)}
    <div style={{padding:"16px 0"}}><h3>Hidden numbers</h3><BarPreview stats={displayStats({...DEFAULT_STATS,...examples[0],style},"bar")} settings={DEFAULT_SETTINGS} numbers={false}/></div>
  </div>)}
</div>);
