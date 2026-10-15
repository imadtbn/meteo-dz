import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// The public GitHub Pages site reads Open-Meteo directly. The legacy tRPC,
// authentication and React Query providers were unused on its public routes.
const root = document.getElementById("root");
if (!root) throw new Error("The application root was not found.");
createRoot(root).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js").catch(() => {
      console.warn("[PWA] Service worker registration was skipped.");
    });
  }, { once: true });
}
