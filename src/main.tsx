import VisibilityPopover from "./VisibilityPopover";
import { PluginTheme } from "./PluginTheme";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
document.documentElement.classList.toggle(
  "context",
  new URLSearchParams(location.search).has("context"),
);
createRoot(document.getElementById("root")!).render(
  <PluginTheme>
    {new URLSearchParams(location.search).has("visibility") ? <VisibilityPopover /> : <App />}
  </PluginTheme>,
);
