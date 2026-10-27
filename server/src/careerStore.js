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
   andamento perde o progresso. */

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
const MAX_BYTES = 768 * 1024;

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

// Cap. 7 / Tela 02 (Gerenciamento de saves) — cada conta passa a ter
// até MAX_SLOTS carreiras, uma delas ATIVA. /api/career (GET/PUT/DELETE)
// continua operando só na ativa, então o cliente antigo segue
// funcionando sem mudança nenhuma. Registro por conta:
//   { active: "s1", slots: { s1: { __gz } }, meta: { s1: {...} } }
// `meta` é um resumo pequeno (clube, competição, temporada, rodada,
// data) gravado a cada save — alimenta a lista de saves e a
// popularidade das competições (Cap. 1 / Tela 03) sem descomprimir
// carreira nenhuma.
const MAX_SLOTS = 3;
let store = new Map(); // userId -> registro de slots (acima)

function metaOf(data) {
  if (!data || typeof data !== "object") return null;
  return {
    clubId: String(data.clubId || ""), clubName: String(data.clubName || "").slice(0, 60),
    clubLogo: typeof data.clubLogo === "string" ? data.clubLogo.slice(0, 300) : null,
    competitionId: String(data.competitionId || "brasileirao"),
    seasonYear: Number(data.seasonYear) || null, currentRound: Number(data.currentRound) || null,
    updatedAt: Number(data.updatedAt) || Date.now(),
  };
}
// Normaliza qualquer formato já gravado em disco: objeto cru (pré-
// compressão), envelope { __gz } (pré-slots) ou registro de slots.
function normalizeRecord(entry) {
  if (!entry) return null;
  if (entry.slots && typeof entry.slots === "object") {
    if (!entry.meta) entry.meta = {};
    for (const [id, env] of Object.entries(entry.slots)) {
      if (env && !env.__gz) entry.slots[id] = compressToEnvelope(env).envelope;
      if (!entry.meta[id]) entry.meta[id] = metaOf(decompressEnvelope(entry.slots[id]));
    }
    return entry;
  }
  const data = decompressEnvelope(entry);
  const env = entry.__gz ? entry : compressToEnvelope(entry).envelope;
  return { active: "s1", slots: { s1: env }, meta: { s1: metaOf(data) } };
}

function load() {
  try {
    if (fs.existsSync(FILE)) {
      const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
      store = new Map();
      // Migração transparente: arquivo escrito antes dos slots (envelope
      // { __gz } ou, ainda mais antigo, objeto cru) vira o slot "s1"
      // ativo, em memória; o próximo persist() já grava no formato novo.
      // Nenhum dado perdido, nada muda pro cliente.
      let migrated = 0;
      for (const [userId, entry] of Object.entries(raw)) {
        if (entry && !entry.slots) migrated++;
        const rec = normalizeRecord(entry);
        if (rec) store.set(userId, rec);
      }
      if (migrated) console.log(`[careerStore] ${migrated} carreira(s) migrada(s) pro formato de slots.`);
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

load();

function getCareer(userId) {
  const rec = store.get(userId);
  if (!rec || !rec.active) return null;
  return decompressEnvelope(rec.slots[rec.active]);
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

function saveCareer(userId, data) {
  if (!isValidCareerShape(data)) {
    const err = new Error("Formato de save inválido.");
    err.status = 400;
    throw err;
  }
  const first = compressToEnvelope(data);
  if (first.compressedBytes <= MAX_BYTES) {
    putActive(userId, first.envelope, data);
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
    const retry = compressToEnvelope(pruned);
    if (retry.compressedBytes <= MAX_BYTES) {
      putActive(userId, retry.envelope, pruned);
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

function putActive(userId, envelope, data) {
  let rec = store.get(userId);
  if (!rec) { rec = { active: "s1", slots: {}, meta: {} }; store.set(userId, rec); }
  if (!rec.active) rec.active = nextSlotId(rec);
  rec.slots[rec.active] = envelope;
  rec.meta[rec.active] = metaOf(data);
  persist();
}
function nextSlotId(rec) {
  for (let i = 1; i <= MAX_SLOTS; i++) if (!rec.slots[`s${i}`]) return `s${i}`;
  return null;
}

// "Apagar e reiniciar" (comportamento de sempre): apaga só a carreira
// ATIVA — o slot continua ativo e vazio, o próximo save o preenche.
function deleteCareer(userId) {
  const rec = store.get(userId);
  if (!rec || !rec.active || !rec.slots[rec.active]) return false;
  delete rec.slots[rec.active];
  delete rec.meta[rec.active];
  persist();
  return true;
}

// ---------- Gerenciamento de saves (Cap. 7 / Tela 02) ----------
function listSlots(userId) {
  const rec = store.get(userId);
  const out = [];
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const id = `s${i}`;
    const filled = !!(rec && rec.slots[id]);
    out.push({ id, active: !!rec && rec.active === id, empty: !filled, meta: filled ? rec.meta[id] : null });
  }
  // Conta sem registro nenhum: o slot 1 é o "ativo" implícito (é onde o
  // 1º save vai cair, ver putActive).
  if (!rec) out[0].active = true;
  return { maxSlots: MAX_SLOTS, slots: out };
}
function slotError(msg, status) { const e = new Error(msg); e.status = status; return e; }
function validSlotId(id) { return /^s[1-9]$/.test(id) && Number(id.slice(1)) <= MAX_SLOTS; }
// Troca a carreira ativa. Slot vazio também pode ser ativado — é assim
// que o cliente começa uma carreira NOVA sem apagar as outras (o
// próximo save cai nele).
function activateSlot(userId, slotId) {
  if (!validSlotId(slotId)) throw slotError("Slot inválido.", 400);
  let rec = store.get(userId);
  if (!rec) { rec = { active: null, slots: {}, meta: {} }; store.set(userId, rec); }
  rec.active = slotId;
  persist();
  return listSlots(userId);
}
function deleteSlot(userId, slotId) {
  if (!validSlotId(slotId)) throw slotError("Slot inválido.", 400);
  const rec = store.get(userId);
  if (!rec || !rec.slots[slotId]) throw slotError("Esse save não existe.", 404);
  delete rec.slots[slotId];
  delete rec.meta[slotId];
  persist();
  return listSlots(userId);
}
// Quantas carreiras (todas as contas, todos os slots) existem por
// competição — dado real pro selo "Mais popular" (Cap. 1 / Tela 03).
function competitionPopularity() {
  const counts = {};
  for (const rec of store.values()) {
    for (const m of Object.values(rec.meta || {})) {
      if (m && m.competitionId) counts[m.competitionId] = (counts[m.competitionId] || 0) + 1;
    }
  }
  return counts;
}

module.exports = { getCareer, saveCareer, deleteCareer, listSlots, activateSlot, deleteSlot, competitionPopularity, MAX_SLOTS };
