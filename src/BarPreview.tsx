import type { Settings, Stats } from "./model";
import { ART_WIDTH, barHeight, hostedBarParts } from "./hosted-art";

// Use the same image parts, placement and fill scale as the live Owlbear overlay.
export default function BarPreview({stats, settings, numbers = true}: {
  stats: Stats; settings: Settings; numbers?: boolean;
}) {
  const height = barHeight(stats, false);
  const parts = hostedBarParts(stats, settings, {numbers: numbers && settings.showNumbers, segmented: false}, location.origin);
  return <div className={`bar-preview bar-preview-${stats.style}`} role="img"
    aria-label={numbers ? `HP ${stats.hp}/${stats.maxHp} · Temp HP ${stats.tempHp} · AC ${stats.ac}` : "แถบ HP แบบซ่อนตัวเลข"}
    style={{aspectRatio: `${ART_WIDTH} / ${height}`}}>
    {parts.map(p => <img key={p.key} src={p.url} alt="" draggable={false} style={{
      left: `${p.x / ART_WIDTH * 100}%`, top: `${p.y / height * 100}%`,
      width: `${p.width * (p.glyphScale ?? 1) * (p.scaleX ?? 1) / ART_WIDTH * 100}%`,
      height: `${p.height * (p.glyphScale ?? 1) / height * 100}%`,
      zIndex: p.zIndex ?? (p.glyphScale ? 3 : p.key === "fill" ? 1 : 0),
    }}/>)}
  </div>;
}
