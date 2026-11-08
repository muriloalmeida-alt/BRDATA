/* Onde contas, sessões e carreiras ficam guardadas (plano
   docs/ops/PLANO_POSTGRES.md, 08/11).

   Os módulos (users.js, sessions.js, careerStore.js) continuam com o Map
   em memória como fonte de leitura e chamam `agendar()` depois de cada
   mudança, como antes chamavam o scheduleWrite. Daqui para baixo:

   - Sem DATABASE_URL (ou antes de iniciar o banco): arquivo JSON inteiro,
     com escrita atrasada (debouncedPersist.js) — exatamente como sempre.
   - Com o banco iniciado: uma tabela por módulo (chave, dados json — o
     tipo json guarda o texto como veio, sem reordenar chaves).
     Na mesma janela de atraso, grava SÓ os registros que mudaram (cada
     um comparado ao que foi gravado da última vez, por um resumo) e
     apaga os que sumiram, numa transação.

   Subida com banco (iniciar): cria as tabelas, faz a cópia única
   conferida dos arquivos para as tabelas vazias (os arquivos não são
   tocados) e carrega a memória a partir do banco. Se a conferência
   falhar, lança erro: o servidor não sobe com dados pela metade. */
const crypto = require("crypto");
const fs = require("fs");
const { isDeepStrictEqual } = require("util");
const { scheduleWrite, DEBOUNCE_MS } = require("./debouncedPersist");
const db = require("./db");

// { nome, tabela, arquivo, dir, obter(): Map, substituir(Map) }
const registros = [];
let bancoAtivo = false;

const resumo = (texto) => crypto.createHash("sha1").update(texto).digest("hex");
const identificador = (t) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(t)) throw new Error(`nome de tabela inválido: ${t}`);
  return t;
};

function registrar(cfg) {
  const reg = { ...cfg, gravados: new Map(), timer: null, rodando: null, denovo: false };
  registros.push(reg);
  return { agendar: () => agendar(reg) };
}

function agendar(reg) {
  if (!bancoAtivo) {
    scheduleWrite(reg.arquivo, reg.dir, () => JSON.stringify(Object.fromEntries(reg.obter())));
    return;
  }
  // Mesma janela fixa do arquivo: a 1ª mudança abre, as seguintes entram junto.
  if (reg.timer) return;
  reg.timer = setTimeout(() => { reg.timer = null; descarregar(reg); }, DEBOUNCE_MS);
  reg.timer.unref?.();
}

// Grava no banco o que mudou desde a última gravação. Uma de cada vez por
// tabela; mudança que chega durante uma gravação sai na próxima.
function descarregar(reg) {
  if (reg.rodando) { reg.denovo = true; return reg.rodando; }
  reg.rodando = (async () => {
    const mudou = [];
    const atuais = new Map();
    for (const [chave, valor] of reg.obter()) {
      const texto = JSON.stringify(valor);
      const h = resumo(texto);
      atuais.set(chave, h);
      if (reg.gravados.get(chave) !== h) mudou.push([chave, texto, h]);
    }
    const sumiu = [...reg.gravados.keys()].filter((k) => !atuais.has(k));
    if (!mudou.length && !sumiu.length) return;
    const t = identificador(reg.tabela);
    const cliente = await db.conexao().connect();
    try {
      await cliente.query("BEGIN");
      for (const [chave, texto] of mudou) {
        await cliente.query(`INSERT INTO ${t} (chave, dados, atualizado_em) VALUES ($1, $2::json, now())
          ON CONFLICT (chave) DO UPDATE SET dados = EXCLUDED.dados, atualizado_em = now()`, [chave, texto]);
      }
      if (sumiu.length) await cliente.query(`DELETE FROM ${t} WHERE chave = ANY($1::text[])`, [sumiu]);
      await cliente.query("COMMIT");
      mudou.forEach(([chave, , h]) => reg.gravados.set(chave, h));
      sumiu.forEach((k) => reg.gravados.delete(k));
    } catch (err) {
      await cliente.query("ROLLBACK").catch(() => {});
      console.error(`[persistencia] falha ao gravar ${reg.nome} no banco (tenta de novo):`, err.message);
      reg.denovo = true;
    } finally {
      cliente.release();
    }
  })().finally(() => {
    reg.rodando = null;
    if (reg.denovo) { reg.denovo = false; agendar(reg); }
  });
  return reg.rodando;
}

// Desligamento: grava tudo que está pendente (arquivo: síncrono, como
// antes; banco: espera as gravações).
async function descarregarTudo() {
  if (!bancoAtivo) return;
  for (const reg of registros) {
    if (reg.timer) { clearTimeout(reg.timer); reg.timer = null; }
    await descarregar(reg);
    if (reg.rodando) await reg.rodando;
  }
}

function lerArquivo(arquivo) {
  if (!fs.existsSync(arquivo)) return null;
  return JSON.parse(fs.readFileSync(arquivo, "utf8"));
}

// Cópia única conferida: arquivo -> tabela vazia, uma vez por tabela.
async function copiarDoArquivo(cliente, reg) {
  const t = identificador(reg.tabela);
  const marco = await cliente.query("SELECT registros FROM migracoes_arquivo WHERE tabela = $1", [reg.tabela]);
  if (marco.rowCount) return null;
  const total = Number((await cliente.query(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n);
  let doArquivo;
  try { doArquivo = lerArquivo(reg.arquivo); } catch (err) { throw new Error(`[persistencia] ${reg.nome}: arquivo ${reg.arquivo} ilegível (${err.message}) — nada foi copiado`); }
  const entradas = doArquivo ? Object.entries(doArquivo) : [];
  if (total > 0) {
    // Tabela já tem dados sem o marco (não deveria acontecer): não copia
    // por cima; só registra o marco e avisa.
    console.warn(`[persistencia] ${reg.nome}: tabela ${t} já tinha ${total} registros sem marco de migração — arquivo não copiado.`);
    await cliente.query("INSERT INTO migracoes_arquivo (tabela, registros, em) VALUES ($1, $2, now())", [reg.tabela, 0]);
    return { copiados: 0, aviso: "tabela-ja-tinha-dados" };
  }
  await cliente.query("BEGIN");
  try {
    for (const [chave, valor] of entradas) {
      await cliente.query(`INSERT INTO ${t} (chave, dados, atualizado_em) VALUES ($1, $2::json, now())`, [chave, JSON.stringify(valor)]);
    }
    // Conferência: mesma quantidade e o mesmo conteúdo, registro a registro.
    const lidos = await cliente.query(`SELECT chave, dados FROM ${t}`);
    const doBanco = new Map(lidos.rows.map((r) => [r.chave, r.dados]));
    if (doBanco.size !== entradas.length) throw new Error(`quantidade diferente: arquivo ${entradas.length}, banco ${doBanco.size}`);
    for (const [chave, valor] of entradas) {
      if (!doBanco.has(chave) || !isDeepStrictEqual(doBanco.get(chave), JSON.parse(JSON.stringify(valor)))) throw new Error(`registro diferente: ${chave}`);
    }
    await cliente.query("INSERT INTO migracoes_arquivo (tabela, registros, em) VALUES ($1, $2, now())", [reg.tabela, entradas.length]);
    await cliente.query("COMMIT");
  } catch (err) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw new Error(`[persistencia] ${reg.nome}: a cópia do arquivo para o banco não conferiu (${err.message}) — nada foi gravado; o arquivo segue intacto`);
  }
  return { copiados: entradas.length };
}

// Subida com banco: tabelas, cópia conferida e carga da memória.
// Devolve o resumo por módulo (para o log).
async function iniciar() {
  if (!db.bancoConfigurado()) return null;
  const cliente = await db.conexao().connect();
  const resultado = {};
  try {
    await cliente.query(`CREATE TABLE IF NOT EXISTS migracoes_arquivo (tabela text PRIMARY KEY, registros integer NOT NULL, em timestamptz NOT NULL)`);
    for (const reg of registros) {
      const t = identificador(reg.tabela);
      await cliente.query(`CREATE TABLE IF NOT EXISTS ${t} (chave text PRIMARY KEY, dados json NOT NULL, atualizado_em timestamptz NOT NULL DEFAULT now())`);
      const copia = await copiarDoArquivo(cliente, reg);
      const lidos = await cliente.query(`SELECT chave, dados FROM ${t}`);
      const mapa = new Map(lidos.rows.map((r) => [r.chave, r.dados]));
      reg.substituir(mapa);
      reg.gravados = new Map([...mapa].map(([k, v]) => [k, resumo(JSON.stringify(v))]));
      resultado[reg.nome] = { carregados: mapa.size, copiadosDoArquivo: copia ? copia.copiados : null, aviso: (copia && copia.aviso) || null };
    }
  } finally {
    cliente.release();
  }
  bancoAtivo = true;
  return resultado;
}

function usandoBanco() { return bancoAtivo; }

module.exports = { registrar, iniciar, descarregarTudo, usandoBanco };
