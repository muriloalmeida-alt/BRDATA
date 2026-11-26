import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// App independente (PC-001). O build vai direto para public/primeiro-contrato/,
// servido pelo server.js na rota /primeiro-contrato. Rodar `npm run build` e
// versionar a saída junto com o código-fonte (mesmo modelo da carreira-v2).
export default defineConfig({
  plugins: [react()],
  base: "/primeiro-contrato/",
  build: { outDir: "../public/primeiro-contrato", emptyOutDir: true, assetsDir: "assets" },
  server: { proxy: { "/img": "http://localhost:8787" } },
});
