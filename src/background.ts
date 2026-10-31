import OBR, { buildImage } from "@owlbear-rodeo/sdk";
import { ID } from "./model";
import { hostedBarParts } from "./hosted-art";
import { createRenderer } from "./renderer";
const renderer = createRenderer(OBR, buildImage, (stats, settings, options) =>
  hostedBarParts(stats, settings, options, location.origin),
);
OBR.onReady(() => {
  // Refresh the toolbar icon for rooms that already installed an older manifest.
  void OBR.action.setIcon("/stat-bar-icon-v2.svg").catch(console.error);
  void OBR.contextMenu
    .create({
      id: `${ID}/edit`,
      icons: ["CHARACTER"].map((layer) => ({
        icon: "/stat-bar-icon-v2.svg",
        label: "Stat Bar",
        filter: {
          every: [
            { key: "type", value: "IMAGE" },
            { key: "layer", value: layer },
          ],
        },
      })),
      embed: { url: "/index.html?context=1", height: 194 },
    })
    .catch(console.error);
  OBR.scene.onReadyChange(renderer.setReady);
  void OBR.scene.isReady().then(renderer.setReady);
  OBR.scene.items.onChange(renderer.schedule);
  OBR.scene.grid.onChange(renderer.schedule);
  OBR.player.onChange(renderer.schedule);
  OBR.room.onMetadataChange(renderer.schedule);
});
