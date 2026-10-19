import OBR, { buildImage } from "@owlbear-rodeo/sdk";
import { ID } from "./model";
import { rasterize } from "./art";
import { createRenderer } from "./renderer";
const renderer = createRenderer(OBR, buildImage, rasterize);
OBR.onReady(() => {
  void OBR.contextMenu
    .create({
      id: `${ID}/edit`,
      icons: ["CHARACTER", "MOUNT", "PROP"].map((layer) => ({
        icon: "/icon.svg",
        label: "Pixel Statbar · แก้ไขค่าสถานะ",
        filter: {
          every: [
            { key: "type", value: "IMAGE" },
            { key: "layer", value: layer },
          ],
        },
      })),
      embed: { url: "/index.html?context=1", height: 530 },
    })
    .catch(console.error);
  OBR.scene.onReadyChange(renderer.setReady);
  void OBR.scene.isReady().then(renderer.setReady);
  OBR.scene.items.onChange(renderer.schedule);
  OBR.scene.grid.onChange(renderer.schedule);
  OBR.player.onChange(renderer.schedule);
  OBR.scene.onMetadataChange(renderer.schedule);
  OBR.room.onMetadataChange(renderer.schedule);
});
