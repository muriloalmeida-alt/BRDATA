import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Carreira 2.0 roda em rota paralela, servida pelo mesmo server.js (estático
// de public/, sem passo de build no deploy): o build vai pra
// public/carreira-v2/ e scripts/publish-entry.mjs move o HTML de entrada pra
// public/carreira-v2.html (pasta sem index não é servida — ver serveStatic).
export default defineConfig({
  plugins: [react()],
  base: "/carreira-v2/",
  build: { outDir: "../public/carreira-v2", emptyOutDir: true, assetsInlineLimit: 0 },
  server: { proxy: { "/api": "http://localhost:8787", "/img": "http://localhost:8787" } },
});
