/* Conexão com o Postgres (plano docs/ops/PLANO_POSTGRES.md, 08/11).
   Só existe com a variável DATABASE_URL; sem ela, o servidor guarda
   tudo em arquivo, como sempre (ver persistencia.js).
   SSL: segue a própria URL (ex.: ?sslmode=require). Na rede interna do
   Railway (postgres.railway.internal) não precisa. */
let pool = null;

function urlDoBanco() {
  return process.env.DATABASE_URL || "";
}
function bancoConfigurado() {
  return !!urlDoBanco();
}
function conexao() {
  if (!pool) {
    const { Pool } = require("pg");
    pool = new Pool({ connectionString: urlDoBanco(), max: 5 });
    pool.on("error", (err) => console.error("[db] erro numa conexão ociosa:", err.message));
  }
  return pool;
}
async function encerrar() {
  if (pool) { const p = pool; pool = null; await p.end(); }
}

module.exports = { bancoConfigurado, conexao, encerrar };
