import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In dev the API runs separately (npm run api); /api is proxied so the Mini App and API share an origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: { "/api": "http://localhost:3000" },
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 600,
  },
});
