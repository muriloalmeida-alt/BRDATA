import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Build vai direto pra public/carreira/ (servido pelo server.js na rota
// /carreira) — sem etapa de build no Dockerfile/deploy. Rodar
// `npm run build` e versionar a saída junto com o código-fonte.
export default defineConfig({
  plugins: [react()],
  base: "/carreira/",
  build: { outDir: "../public/carreira", emptyOutDir: true, assetsDir: "assets" },
  server: { proxy: { "/api": "http://localhost:8787", "/img": "http://localhost:8787", "/js": "http://localhost:8787" } },
});
