/* Exporta contas, sessões e carreiras do Postgres para arquivos JSON no
   mesmo formato de server/data (users.json, sessions.json, careers.json).
   É o caminho para voltar atrás (plano docs/ops/PLANO_POSTGRES.md):
   depois da migração as gravações vão só para o banco, e o arquivo para
   no tempo.

   Não sobrescreve nada: grava numa pasta nova
   (server/data/exportado-AAAA-MM-DD-HHMMSS/, ou a pasta passada como
   argumento, que precisa estar vazia ou não existir). Para voltar ao
   arquivo: confira a pasta, copie os 3 arquivos para server/data e tire
   a DATABASE_URL do serviço.

   Como rodar (no host com a DATABASE_URL, na pasta server/):
     node scripts/exportar-postgres.js [pasta-de-destino] */
const fs = require("fs");
const path = require("path");
const db = require("../src/db");

const ARQUIVOS = { contas: "users.json", sessoes: "sessions.json", carreiras: "careers.json" };

async function exportar(destino) {
  if (!db.bancoConfigurado()) throw new Error("DATABASE_URL não configurada.");
  if (fs.existsSync(destino) && fs.readdirSync(destino).length) throw new Error(`a pasta ${destino} não está vazia.`);
  fs.mkdirSync(destino, { recursive: true });
  const resumo = {};
  for (const [tabela, arquivo] of Object.entries(ARQUIVOS)) {
    const existe = await db.conexao().query("SELECT to_regclass($1) AS t", [tabela]);
    const linhas = existe.rows[0].t ? (await db.conexao().query(`SELECT chave, dados FROM ${tabela} ORDER BY chave`)).rows : [];
    const obj = Object.fromEntries(linhas.map((r) => [r.chave, r.dados]));
    fs.writeFileSync(path.join(destino, arquivo), JSON.stringify(obj));
    resumo[arquivo] = linhas.length;
  }
  return resumo;
}

if (require.main === module) {
  const agora = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const destino = path.resolve(process.argv[2] || path.join(__dirname, "..", "data", `exportado-${agora.slice(0, 8)}-${agora.slice(8)}`));
  exportar(destino)
    .then((r) => { console.log(`Exportado para ${destino}:`, Object.entries(r).map(([a, n]) => `${a} ${n}`).join(", ")); return db.encerrar(); })
    .catch((err) => { console.error("Falha ao exportar:", err.message); db.encerrar().finally(() => process.exit(1)); });
}

module.exports = { exportar };
