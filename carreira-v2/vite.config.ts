import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Build vai direto pra public/carreira-v2/ (servido pelo server.js na rota
// /carreira-v2) — sem etapa de build no Dockerfile/deploy. Rodar
// `npm run build` e versionar a saída junto com o código-fonte.
export default defineConfig({
  plugins: [react()],
  base: "/carreira-v2/",
  build: { outDir: "../public/carreira-v2", emptyOutDir: true, assetsDir: "assets" },
  server: { proxy: { "/api": "http://localhost:8787", "/img": "http://localhost:8787", "/js": "http://localhost:8787" } },
});
