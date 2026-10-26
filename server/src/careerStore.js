/* Save de carreira do "Modo Técnico" (Elifoot-like) — 1 carreira ativa
   por conta (ver decisão do usuário: "1 clube escolhido, resto é
   CPU"). Diferente de users.js/contentStore.js, este módulo NÃO
   entende nada de futebol: guarda o blob JSON inteiro que o front-end
   (public/js/carreira.js) monta e recalcula sozinho (elenco gerado,
   escalação, tabela da carreira, notícias...) — o "estado do jogo"
   inteiro vive no cliente, o backend só persiste pra sobreviver a
   troca de aba/dispositivo, com o mesmo espírito zero-dependência do
   resto do backend.

   Isso é seguro porque é um jogo SOLO sem placar competitivo entre
   contas (cada um só pode ler/escrever a própria carreira, ver guard
   de login em server.js) — não tem problema nenhum o cliente ser
   "dono da verdade" do save aqui, ao contrário de dado financeiro
   (users.js) ou de conteúdo público (contentStore.js).

   MESMO AVISO de users.js/sessions.js: em host com sistema de
   arquivos efêmero (Railway sem Volume anexado), esse arquivo é
   apagado a cada novo deploy — quem estiver com uma carreira em
   andamento perde o progresso. CAREER-PG-001: com DATABASE_URL
   configurada, o save vai pro Postgres (ver createPgBackend) e esse
   aviso deixa de valer pras carreiras. */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { scheduleWrite } = require("./debouncedPersist");

const DATA_DIR = path.join(__dirname, "..", "data");
const FILE = path.join(DATA_DIR, "careers.json");

// Generoso o bastante pra um elenco de ~50 jogadores (principal + base)
// com histórico de rodadas e notícias, mas impede que uma conta
// comprometida (ou um bug no cliente) escreva um blob gigante sem
// limite nenhum.
//
// AJUSTE (pedido do usuário: "o mercado deve trazer jogadores das 3
// ligas para que transações possam ser feitas entre os 60 times das
// Séries A, B e C") — BUG CORRIGIDO antes de publicar: uma carreira
// "multi" nova (elenco dos 59 outros times das 3 divisões, não só os
// 19 da própria — ver CAREER.marketScope em carreira.js) já nasce em
// ~500KB (medido de verdade, mesmo depois de encolher o elenco dos
// times de OUTRA divisão — ver MAX_LEAGUE_SQUAD_OTHER_DIVISION em
// carreira.js), estourando os 400KB de antes na 1ª tentativa de
// salvar. Levantado pra 768KB — mesma margem de crescimento ao longo
// de uma temporada (resultados/notícias/transferências acumulando)
// que uma carreira "single" sempre teve sob o limite antigo, só
// recalibrada pro tamanho de criação maior da carreira "multi"
// (carreira "single", de antes desta mudança, continua exatamente do
// mesmo tamanho de sempre — a folga só cresceu, nada fica mais
// apertado pra ela).
//
// SAVE-LIMIT-001 (relato real do usuário: "o save ficou muito grande,
// devo convencer o jogador a desistir do jogo?") — mesmo depois do
// ajuste acima, uma carreira "multi" de verdade nasce em ~560KB (73%
// do limite) e uma medição real de 4 temporadas simuladas (mesma
// pipeline de produção — resolveRoundInstant/advanceSeason — ver
// tests/e2e/sim_save_growth.js) achou o campo `leagueSquads` (elenco
// dos 59 outros clubes) respondendo por ~79% do total — não uma das
// estruturas acumulativas (news/log/histórico), todas já bem capadas
// pelos *_MAX de carreira.js. Isso é dado altamente repetitivo (mesmas
// chaves de jogador repetidas ~1300+ vezes) — medido de verdade, gzip
// nível 6 comprime esse blob em **92-93%** (560KB -> ~42KB). A partir
// desta demanda, MAX_BYTES passa a valer sobre o tamanho COMPRIMIDO
// (não o JSON bruto) — na prática, o teto efetivo de JSON bruto sobe
// de ~768KB pra ~10MB (768KB / ~0.075 de razão de compressão medida),
// eliminando o cenário relatado sem precisar mexer no número em si.
//
// CAREER-PG-001 — com Postgres (ver createPgBackend abaixo) o teto
// comprimido sobe pra 8MB (~100MB de JSON bruto na razão medida):
// cada carreira é uma linha própria, não infla mais um arquivo único
// com todas as contas. Continua existindo como trava contra blob
// infinito (bug no cliente / conta comprometida), não como limite de
// jogo. Modo arquivo (sem DATABASE_URL) mantém os 768KB de sempre.
const MAX_BYTES = (process.env.DATABASE_URL ? 8 * 1024 : 768) * 1024;

// CAREER-PG-001 — teto do CORPO do PUT /api/career (JSON bruto, antes
// de comprimir — ver readBody em server.js). Era o 1MB genérico de
// todas as rotas: uma carreira "multi" já nasce em ~560KB brutos e
// cresce ao longo das temporadas, então esse era o próximo limite
// "invisível" a estourar, mesmo com o armazenamento resolvido.
const MAX_BODY_BYTES = 16 * 1024 * 1024;

// SAVE-LIMIT-001 — última linha de defesa: se MESMO comprimido o save
// ainda estourar MAX_BYTES (não encontrado em nenhuma medição real,
// mas "não pode existir em nenhum cenário" é categórico), poda
// histórico não-essencial antes de recusar salvar — nunca elenco,
// contrato, escalação, tabela ou finanças (estado de jogo ATIVO,
// intocável). Ordem: o que menos importa pro jogo em andamento
// primeiro. Muta uma CÓPIA, nunca o objeto que o cliente enviou.
function pruneNonEssentialHistory(data) {
  let touched = false;
  const cut = (key, keep) => {
    if (Array.isArray(data[key]) && data[key].length > keep) { data[key] = data[key].slice(0, keep); touched = true; }
  };
  cut("newsFeed", 20);
  cut("transferLog", 20);
  cut("financeLedger", 20);
  cut("clubHistory", 10);
  cut("seasonHistory", 10);
  cut("seasonAwards", 10);
  cut("leagueChampions", 10);
  cut("cashHistory", 4);
  cut("notifications", 20);
  // resultsByRound já é só {rodada atual, rodada anterior} em uso
  // normal (ver finishRoundTail em carreira.js) — como último recurso,
  // fica só com a rodada mais recente.
  if (data.resultsByRound && typeof data.resultsByRound === "object") {
    const keys = Object.keys(data.resultsByRound).map(Number).filter((n) => !Number.isNaN(n));
    if (keys.length > 1) {
      const maxKey = Math.max(...keys);
      data.resultsByRound = { [maxKey]: data.resultsByRound[maxKey] };
      touched = true;
    }
  }
  return touched;
}

// SAVE-LIMIT-001 — cada carreira fica guardada em memória/disco já
// comprimida (envelope { __gz: "<base64 de gzip>" }), não o objeto
// bruto — ganho duplo: 1) o próprio limite de tamanho passa a valer
// sobre o comprimido (ver MAX_BYTES acima); 2) o arquivo agregado
// (`careers.json`, TODAS as contas juntas) fica ~92-95% menor no
// disco, o que também acelera a escrita síncrona documentada abaixo
// (menos bytes pra gravar).
function compressToEnvelope(data) {
  const json = JSON.stringify(data);
  const gz = zlib.gzipSync(Buffer.from(json, "utf8"));
  return { envelope: { __gz: gz.toString("base64") }, compressedBytes: gz.length };
}
function decompressEnvelope(entry) {
  if (!entry) return null;
  if (entry.__gz) return JSON.parse(zlib.gunzipSync(Buffer.from(entry.__gz, "base64")).toString("utf8"));
  return entry; // formato antigo (pré-compressão) — ver load()
}

let store = new Map(); // userId -> envelope comprimido { __gz } (só no modo arquivo)

function loadFile() {
  try {
    if (fs.existsSync(FILE)) {
      const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
      store = new Map(Object.entries(raw));
      // Migração transparente: arquivo escrito antes desta demanda
      // guarda o objeto de carreira CRU (sem __gz) — comprime agora,
      // em memória, pra normalizar; o próximo persist() já grava no
      // formato novo. Nenhum dado perdido, nenhuma mudança visível
      // pro cliente (getCareer segue devolvendo o objeto descomprimido
      // de sempre).
      let migrated = 0;
      for (const [userId, entry] of store) {
        if (entry && !entry.__gz) {
          store.set(userId, compressToEnvelope(entry).envelope);
          migrated++;
        }
      }
      if (migrated) console.log(`[careerStore] ${migrated} carreira(s) migrada(s) pro formato comprimido.`);
    }
  } catch (err) {
    console.error("[careerStore] falha ao carregar arquivo local:", err.message);
  }
}

// Performance (pedido do usuário: "o jogo está lento") — este é o
// arquivo de save mais quente do backend inteiro (50+ pontos no
// cliente chamam persistCareer() a cada ação de verdade — comprar,
// treinar, simular rodada...) e também o maior (uma conta "multi" já
// nasce acima de 500KB, ~40KB comprimido). Escrita síncrona do arquivo
// INTEIRO a cada PUT media ~100-125ms de verdade (medido: curl direto,
// sem overhead de browser, comparado a ~0.5ms de um GET que não
// escreve nada) e BLOQUEIA o event loop, travando qualquer outra
// requisição em andamento nesse meio-tempo — não escala com a base de
// contas. Ver debouncedPersist.js pro raciocínio completo do
// trade-off aceito. (gzipSync/gunzipSync em si são baratos pro
// tamanho real de uma carreira — ~1-2ms medido pra ~560KB — não pesam
// nesse orçamento.)
function persist() {
  scheduleWrite(FILE, DATA_DIR, () => JSON.stringify(Object.fromEntries(store)));
}

// CAREER-PG-001 (pedido do usuário: "mudar a forma de gravar carreira
// para postgres, com isso não teremos problemas de espaço") — com
// DATABASE_URL configurada (Railway preenche sozinho ao anexar um
// Postgres ao serviço), cada carreira vira 1 linha da tabela `careers`,
// guardada no MESMO formato comprimido de antes (gzip em BYTEA, não
// JSONB — o blob continua opaco pro backend, ver aviso no topo, e
// comprimido ocupa ~92-95% menos). Resolve de vez os 2 problemas do
// arquivo único: 1) disco efêmero do Railway apagando todo save a cada
// deploy sem Volume; 2) `careers.json` com TODAS as contas num blob só,
// reescrito inteiro a cada save. Sem DATABASE_URL (dev local, suíte
// E2E) continua no arquivo de sempre — nenhuma mudança de comportamento.
const pg = process.env.DATABASE_URL ? createPgBackend(process.env.DATABASE_URL) : null;

function createPgBackend(connectionString) {
  const { Pool } = require("pg");
  // SSL: Postgres interno do Railway (*.railway.internal) não usa TLS;
  // a URL pública (proxy) usa — PGSSLMODE=require / ?sslmode=require na
  // própria URL ligam. rejectUnauthorized:false porque o certificado do
  // proxy do Railway é autoassinado.
  const wantsSsl = /sslmode=require/.test(connectionString) || process.env.PGSSLMODE === "require";
  const pool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX) || 5,
    ssl: wantsSsl ? { rejectUnauthorized: false } : undefined,
  });
  pool.on("error", (err) => console.error("[careerStore] erro no pool do Postgres:", err.message));

  const ready = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS careers (
      user_id    TEXT PRIMARY KEY,
      data_gz    BYTEA NOT NULL,
      raw_bytes  INTEGER NOT NULL,
      gz_bytes   INTEGER NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    // Migração única do arquivo antigo (se o host tiver Volume e ainda
    // existir careers.json): importa só quem ainda não tem linha no
    // banco (ON CONFLICT DO NOTHING) — nunca sobrescreve um save mais
    // novo já gravado no Postgres. Depois o arquivo é renomeado (não
    // apagado — fica como backup): sem isso, uma carreira apagada pelo
    // técnico ("Reiniciar") voltaria do arquivo no próximo boot.
    if (fs.existsSync(FILE)) {
      loadFile();
      let imported = 0;
      for (const [userId, entry] of store) {
        const data = decompressEnvelope(entry);
        if (!isValidCareerShape(data)) continue;
        const json = Buffer.from(JSON.stringify(data), "utf8");
        const gz = zlib.gzipSync(json);
        const r = await pool.query(
          "INSERT INTO careers (user_id, data_gz, raw_bytes, gz_bytes) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO NOTHING",
          [userId, gz, json.length, gz.length]
        );
        imported += r.rowCount;
      }
      store = new Map(); // não fica segurando todas as carreiras em memória à toa
      fs.renameSync(FILE, `${FILE}.migrated-to-pg`);
      if (imported) console.log(`[careerStore] ${imported} carreira(s) importada(s) de careers.json pro Postgres.`);
    }
    console.log("[careerStore] gravando carreiras no Postgres.");
  })();
  // Falha de conexão no boot não derruba o processo (resto do site
  // segue no ar) — cada chamada abaixo reaguarda `ready` e devolve o
  // erro pro cliente (500), visível no toast de "não deu pra salvar".
  ready.catch((err) => console.error("[careerStore] falha ao preparar o Postgres:", err.message));

  // Saves do MESMO usuário são enfileirados (nunca 2 em paralelo): com
  // pool de várias conexões, 2 PUTs seguidos poderiam commitar fora de
  // ordem e o save mais VELHO ganhar. Fila por usuário mantém a ordem
  // de chegada (a mesma garantia que o Map síncrono dava de graça).
  const queues = new Map(); // userId -> Promise da última operação
  function serialize(userId, fn) {
    const prev = queues.get(userId) || Promise.resolve();
    const next = prev.catch(() => {}).then(fn);
    queues.set(userId, next);
    const cleanup = () => { if (queues.get(userId) === next) queues.delete(userId); };
    next.then(cleanup, cleanup);
    return next;
  }

  return {
    async get(userId) {
      await ready;
      const r = await pool.query("SELECT data_gz FROM careers WHERE user_id = $1", [userId]);
      if (!r.rowCount) return null;
      return JSON.parse(zlib.gunzipSync(r.rows[0].data_gz).toString("utf8"));
    },
    set(userId, gz, rawBytes) {
      return serialize(userId, async () => {
        await ready;
        await pool.query(
          `INSERT INTO careers (user_id, data_gz, raw_bytes, gz_bytes, updated_at) VALUES ($1, $2, $3, $4, now())
           ON CONFLICT (user_id) DO UPDATE SET data_gz = EXCLUDED.data_gz, raw_bytes = EXCLUDED.raw_bytes,
             gz_bytes = EXCLUDED.gz_bytes, updated_at = now()`,
          [userId, gz, rawBytes, gz.length]
        );
      });
    },
    del(userId) {
      return serialize(userId, async () => {
        await ready;
        const r = await pool.query("DELETE FROM careers WHERE user_id = $1", [userId]);
        return r.rowCount > 0;
      });
    },
    async close() {
      await Promise.allSettled([...queues.values()]);
      await pool.end();
    },
  };
}

if (!pg) loadFile();

// Mesma interface nos 2 modos, agora assíncrona (Postgres exige) —
// server.js aguarda cada chamada.
async function getCareer(userId) {
  if (pg) return pg.get(userId);
  return decompressEnvelope(store.get(userId));
}

// Validação BEM rasa de propósito (ver aviso no topo: o cliente é dono
// da verdade do formato) — só confere que "parece" um save de carreira
// de verdade (clubId + elenco como array) antes de aceitar, pra um
// bug no front-end não conseguir apagar um save bom com lixo/`null`
// por engano, e o limite de tamanho acima.
function isValidCareerShape(data) {
  return !!data && typeof data === "object"
    && typeof data.clubId === "string" && data.clubId
    && Array.isArray(data.squad);
}

function compressForStore(data) {
  const json = Buffer.from(JSON.stringify(data), "utf8");
  return { gz: zlib.gzipSync(json), rawBytes: json.length };
}

async function writeCompressed(userId, { gz, rawBytes }) {
  if (pg) return pg.set(userId, gz, rawBytes);
  store.set(userId, { __gz: gz.toString("base64") });
  persist();
}

async function saveCareer(userId, data) {
  if (!isValidCareerShape(data)) {
    const err = new Error("Formato de save inválido.");
    err.status = 400;
    throw err;
  }
  const first = compressForStore(data);
  if (first.gz.length <= MAX_BYTES) {
    await writeCompressed(userId, first);
    return data;
  }
  // SAVE-LIMIT-001 — última linha de defesa antes do beco sem saída:
  // poda histórico não-essencial (NUNCA elenco/contrato/escalação/
  // tabela/finanças) de uma CÓPIA (nunca o objeto do caller) e tenta
  // salvar de novo, uma vez. Não encontrado em nenhuma medição real
  // (ver tests/e2e/sim_save_growth.js), mas "não pode existir em
  // nenhum cenário" é categórico — isso garante que sempre existe uma
  // saída automática antes de recusar.
  const pruned = JSON.parse(JSON.stringify(data));
  if (pruneNonEssentialHistory(pruned)) {
    const retry = compressForStore(pruned);
    if (retry.gz.length <= MAX_BYTES) {
      await writeCompressed(userId, retry);
      // Devolve o que foi de fato salvo (podado) — persistCareer() no
      // cliente não consome a resposta hoje (o estado ativo do jogo
      // nunca foi tocado), mas fica correto pra quem vier a depender
      // disso no futuro.
      return pruned;
    }
  }
  const err = new Error("Save da carreira grande demais mesmo após poda automática de histórico.");
  err.status = 413;
  throw err;
}

async function deleteCareer(userId) {
  if (pg) return pg.del(userId);
  const existed = store.delete(userId);
  if (existed) persist();
  return existed;
}

// Desligamento limpo (SIGTERM/SIGINT, ver server.js): espera os saves
// em andamento terminarem antes de fechar o pool. No modo arquivo não
// faz nada — flushAllSync() de debouncedPersist.js já cobre.
async function close() {
  if (pg) await pg.close();
}

const storageBackend = pg ? "postgres" : "file";

module.exports = { getCareer, saveCareer, deleteCareer, close, storageBackend, MAX_BODY_BYTES };
