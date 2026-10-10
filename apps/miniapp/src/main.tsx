import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { DemoBattle } from "./screens/DemoBattle.tsx";
import { Gallery } from "./screens/Gallery.tsx";
import { GameProvider } from "./state.tsx";
import { initTelegram } from "./telegram.ts";
import "@fontsource/pixelify-sans/400.css";
import "@fontsource/pixelify-sans/500.css";
import "./styles.css";

initTelegram();
// Canvas text needs the pixel font loaded before the first frame draws.
void document.fonts?.load('8px "Pixelify Sans"');

const root = createRoot(document.getElementById("root")!);
if (import.meta.env.DEV && location.hash === "#gallery") {
  root.render(<Gallery />);
} else if (import.meta.env.DEV && location.hash.startsWith("#demo")) {
  root.render(<DemoBattle />);
} else {
  root.render(
    <StrictMode>
      <GameProvider>
        <App />
      </GameProvider>
    </StrictMode>,
  );
}
