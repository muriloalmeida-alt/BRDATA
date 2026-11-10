/* ===================================================================
   MOTOR — ESTADO E SAVE (plano "sem página escondida", etapa B, 08/11)
   -------------------------------------------------------------------
   O save da carreira mora aqui: o objeto da carreira atual, a versão
   do save (schemaVersion) com as migrações numeradas, a carga e a
   gravação na API.

   - O carreira.js continua usando o nome de sempre, `CAREER`, que é só
     um atalho para carreiraAtual()/definirCarreira() (decisão de 08/11:
     o objeto mora no módulo já nesta etapa).
   - Versão do save (decisão de 08/11, CLAUDE.md §10): o save ganha
     `schemaVersion`. Save sem o campo é a versão 0. Cada migração
     numerada roda uma vez, em ordem, e só sobe a versão.
     A normalização de carga de sempre (migrateCareerDefaults, no
     carreira.js) continua rodando a cada carga, antes destas migrações,
     porque mistura migração antiga com ajustes de carga (objetivos do
     dia, calendário, conquistas). Mudanças novas de estrutura entram
     aqui como migração numerada.
   - Gravação (decisão de 08/11): o módulo grava e devolve o motivo da
     falha ("sessao", "grande", "falha"); os avisos na tela continuam
     no carreira.js.
   Não lê DOM. A rede chega por parâmetro (`pedir`, como o fetchJSON do
   jogo: devolve o JSON ou lança um erro com `status`).
=================================================================== */

// ---------- A carreira atual ----------
let carreira = null;
export function carreiraAtual() { return carreira; }
export function definirCarreira(c) { carreira = c == null ? null : c; return carreira; }

// ---------- Versão do save e migrações numeradas ----------
// Versão atual do save que este jogo escreve.
export const SCHEMA_VERSION = 1;
// MIGRACOES[n] leva o save da versão n-1 para a n (altera no lugar).
export const MIGRACOES = {
  // 1 (08/11): marco inicial. A estrutura da versão 1 é a de hoje, que a
  // normalização de carga (migrateCareerDefaults) já garante; esta
  // migração só registra a versão.
  1: () => {},
};
export function versaoDoSave(save) {
  const v = Number(save && save.schemaVersion);
  return Number.isInteger(v) && v >= 0 ? v : 0;
}
// Aplica, em ordem, as migrações que faltam. Save de uma versão mais nova
// que este jogo (gravado por uma versão futura) não é tocado.
// Devolve as versões aplicadas (vazio = nada a fazer).
export function migrarSave(save) {
  if (!save || typeof save !== "object") return [];
  let v = versaoDoSave(save);
  const aplicadas = [];
  while (v < SCHEMA_VERSION) {
    v++;
    MIGRACOES[v](save);
    aplicadas.push(v);
  }
  if (aplicadas.length) save.schemaVersion = v;
  return aplicadas;
}

// ---------- Carga e gravação ----------
// Lê o save da conta. Sem save, ou se a leitura falhar, devolve null (como
// o jogo sempre fez: cai na escolha de competição).
export async function carregarSave(pedir) {
  try {
    const r = await pedir("/api/career");
    return (r && r.career) || null;
  } catch (_) {
    return null;
  }
}
// Grava o save (marca updatedAt antes, como sempre). Devolve { ok: true } ou
// { ok: false, motivo, status, mensagem }:
//   "sessao" (401) — só resolve entrando de novo;
//   "grande" (413) — o servidor não conseguiu reduzir o save;
//   "falha"        — rede ou outro erro (tentar de novo pode resolver).
export async function gravarSave(save, pedir, agora = Date.now) {
  if (!save) return { ok: false, motivo: "sem-carreira" };
  save.updatedAt = agora();
  try {
    await pedir("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(save) });
    return { ok: true };
  } catch (err) {
    const status = err && err.status;
    return {
      ok: false,
      motivo: status === 401 ? "sessao" : status === 413 ? "grande" : "falha",
      status: status || null,
      mensagem: (err && err.message) || null,
    };
  }
}

// ---------- O mundo da carreira (etapa C1, 09/11) ----------
// Fora do save, mas parte do jogo: os times da liga atual, todos os times
// das divisões e a competição atual. O carreira.js usa os nomes de sempre
// (LEAGUE_TEAMS, ALL_TEAMS_FLAT, CURRENT_COMPETITION_ID) como atalho.
const mundo = { ligaAtual: [], todosTimes: [], competicaoAtual: "brasileirao" };
export function ligaAtual() { return mundo.ligaAtual; }
export function definirLigaAtual(lista) { mundo.ligaAtual = lista; return lista; }
export function todosTimes() { return mundo.todosTimes; }
export function definirTodosTimes(lista) { mundo.todosTimes = lista; return lista; }
export function competicaoAtual() { return mundo.competicaoAtual; }
// Etapa D1 (09/11): a partida ao vivo em andamento (LIVE_MATCH), nunca
// gravada no save. null fora de partida.
let partida = null;
export function partidaAtual() { return partida; }
export function definirPartida(p) { partida = p == null ? null : p; return partida; }
// Etapa D2 (09/11): a coletiva de imprensa aguardando resposta
// ({ entry, roundPlayed }) e se ela faz parte do fluxo pós-jogo. Nunca gravadas.
let coletiva = null, coletivaNoPosJogo = false;
export function coletivaPendente() { return coletiva; }
export function definirColetivaPendente(c) { coletiva = c == null ? null : c; return coletiva; }
export function coletivaEncadeada() { return coletivaNoPosJogo; }
export function definirColetivaEncadeada(v) { coletivaNoPosJogo = !!v; return coletivaNoPosJogo; }
// Etapa G1b (10/11): o resumo da rodada jogada, entre o detalhe do jogo e os
// resultados da rodada (PENDING_ROUND_SUMMARY). Nunca gravado.
let resumo = null;
export function resumoDaRodada() { return resumo; }
export function definirResumoDaRodada(r) { resumo = r == null ? null : r; return resumo; }
// Etapa G1c1 (10/11): o que a página guardava em variáveis e o jogo usa — a conta
// logada (ME, de /api/auth/me), a fonte de dados (LIVE_MODE, real ou exemplo, e
// por competição), a temporada real dos dados (LIVE_SEASON) e a herança do
// técnico que trocou de clube (TECHNICIAN_CARRY). Nunca gravados no save.
const pagina = { conta: null, modoReal: false, modoRealPorCompeticao: {}, temporadaReal: new Date().getFullYear(), herancaDoTecnico: null };
export function conta() { return pagina.conta; }
export function definirConta(v) { pagina.conta = v; return v; }
export function modoReal() { return pagina.modoReal; }
export function definirModoReal(v) { pagina.modoReal = v; return v; }
export function modoRealPorCompeticao() { return pagina.modoRealPorCompeticao; }
export function definirModoRealPorCompeticao(v) { pagina.modoRealPorCompeticao = v; return v; }
export function temporadaReal() { return pagina.temporadaReal; }
export function definirTemporadaReal(v) { pagina.temporadaReal = v; return v; }
export function herancaDoTecnico() { return pagina.herancaDoTecnico; }
export function definirHerancaDoTecnico(v) { pagina.herancaDoTecnico = v; return v; }
export function definirCompeticaoAtual(id) { mundo.competicaoAtual = id; return id; }

// Time pelo id: primeiro a liga atual (com a competição atual), depois os
// outros; sem achar, um time genérico (como sempre foi).
export function timePorId(id) {
  const own = mundo.ligaAtual.find((t) => String(t.id) === String(id));
  if (own) return { ...own, competitionId: mundo.competicaoAtual };
  const other = mundo.todosTimes.find((t) => String(t.id) === String(id));
  if (other) return other;
  return { id, name: `Time #${id}`, short: String(id).slice(0, 3).toUpperCase(), c1: "#8892A0", c2: "#333" };
}
export function mediaOverall(lista) {
  if (!lista.length) return 0;
  return lista.reduce((s, p) => s + p.overall, 0) / lista.length;
}
// Força média do elenco de um clube (o seu: só o principal).
export function forcaMediaDoElenco(clubId) {
  if (String(clubId) === String(carreira.clubId)) return mediaOverall(carreira.squad.filter((p) => p.origin === "principal"));
  return mediaOverall(carreira.leagueSquads[String(clubId)] || []);
}
