import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
document.documentElement.classList.toggle(
  "context",
  new URLSearchParams(location.search).has("context"),
);
createRoot(document.getElementById("root")!).render(<App />);
