// Gera o snapshot publicado do catálogo (imutável por versão) e o ponteiro da
// versão ativa. Uso: node scripts/importar-catalogo.mjs [versao]
// Lê catalogo-fonte/*.json; grava public/catalogo/<versao>.json e ativo.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { montarSnapshot } from "./catalogo-lib.mjs";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicoBrdata = path.join(raiz, "..", "public");
const versao = process.argv[2] || "2026.11-1";
const clubes = JSON.parse(fs.readFileSync(path.join(raiz, "catalogo-fonte/touchline-clubes.json"), "utf8"));
const escudos = JSON.parse(fs.readFileSync(path.join(raiz, "catalogo-fonte/escudos-touchline.json"), "utf8"));
// Mapa id → escudo local gerado no BRDATA (scripts/escudos_catalogo.js).
const crestsTs = fs.readFileSync(path.join(raiz, "..", "carreira-v2/src/domain/crests.ts"), "utf8");
const escudoLocalPorId = Object.fromEntries([...crestsTs.matchAll(/^\s*"([^"]+)":\s*"(\/img\/[^"]+)",?$/gm)].map((m) => [m[1], m[2]]));
const { snapshot, relatorio } = montarSnapshot(clubes, escudos, {
  versao, temporada: "2026", geradoEm: "2026-11-26", escudoLocalPorId,
  existeArquivo: (p) => fs.existsSync(path.join(publicoBrdata, p)),
});
if (relatorio.erros.length) {
  console.error("Snapshot inválido:\n" + relatorio.erros.join("\n"));
  process.exit(1);
}
const destino = path.join(raiz, "public/catalogo");
fs.mkdirSync(destino, { recursive: true });
const arquivo = path.join(destino, `${versao}.json`);
if (fs.existsSync(arquivo) && fs.readFileSync(arquivo, "utf8") !== JSON.stringify(snapshot)) {
  console.error(`A versão ${versao} já foi publicada com outro conteúdo. Versões são imutáveis: use uma versão nova.`);
  process.exit(1);
}
fs.writeFileSync(arquivo, JSON.stringify(snapshot));
fs.writeFileSync(path.join(destino, "ativo.json"), JSON.stringify({ versao, arquivo: `${versao}.json` }));
console.log(JSON.stringify({ ...relatorio, avisos: relatorio.avisos.length }, null, 2));
