/* OFFLINE-001 (13/11/2026) — repositório da carreira no aparelho.

   Decisão do Murilo (13/11): o save do APARELHO é o principal. Com rede e
   conta, uma cópia vai ao servidor (backup). A cópia do servidor só entra
   no aparelho quando o aparelho não jogou nada desde a última cópia
   (avanço só do lado do servidor) ou por importação explícita.

   Usado pela tela (carreira-v2, adapters/gateways.ts) e pelo motor
   (motor/v2.js -> ambiente.armazem). Os dois falam com o mesmo banco
   (IndexedDB "brdata-carreira"), cada um com a sua instância deste módulo.

   Registro por conta: { conta, save, rev, hash, sincronizado, atualizadoEm }
   - rev: conta as gravações no aparelho (revisão esperada em gravar());
   - hash: do save gravado; sincronizado: hash da última cópia confirmada
     com o servidor (enviada ou recebida). hash != sincronizado = o aparelho
     tem progresso que o servidor ainda não tem.

   Sem IndexedDB (testes do motor em Node, navegador que recusa), o
   repositório fica "indisponivel" e quem usa cai no caminho de sempre
   (só o servidor). */

import { SCHEMA_VERSION } from "./estado.js";

const BANCO = "brdata-carreira";
const VERSAO_BANCO = 1;
const LOJA_SAVES = "saves";
const LOJA_PERFIL = "perfil";
export const VERSAO_REGISTRO = 1;

// Hash rápido (FNV-1a 32 bits) do texto do save: igualdade de conteúdo.
export function hashTexto(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0") + ":" + s.length;
}

function prometer(req) {
  return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}

// ---------- Arquivo de exportação (OFFLINE-001, etapa 3) ----------
// { formato, versaoArquivo, exportadoEm, resumo, hash, save }. O hash é do
// texto do save: confere que o arquivo não foi cortado nem alterado. Sem
// dados da conta (e-mail, nome) no arquivo: só a carreira.
export const FORMATO_ARQUIVO = "brdata-carreira";
export const VERSAO_ARQUIVO = 1;
export function montarArquivo(save, agora = Date.now()) {
  return {
    formato: FORMATO_ARQUIVO, versaoArquivo: VERSAO_ARQUIVO, exportadoEm: agora,
    resumo: { clube: save.clubName || null, temporada: save.seasonYear || null, rodada: save.currentRound || null },
    hash: hashTexto(JSON.stringify(save)), save,
  };
}
// Confere um arquivo lido (objeto já do JSON). { ok, save } ou { ok: false, motivo }:
// "formato" (não é um arquivo do jogo), "versao" (de uma versão mais nova do
// jogo), "integridade" (hash não confere), "conteudo" (save sem o essencial).
export function conferirArquivo(arq) {
  if (!arq || typeof arq !== "object" || arq.formato !== FORMATO_ARQUIVO || !arq.save || typeof arq.save !== "object") return { ok: false, motivo: "formato" };
  if (Number(arq.versaoArquivo) > VERSAO_ARQUIVO) return { ok: false, motivo: "versao" };
  if (hashTexto(JSON.stringify(arq.save)) !== arq.hash) return { ok: false, motivo: "integridade" };
  const sv = arq.save;
  if (Number(sv.schemaVersion || 0) > SCHEMA_VERSION) return { ok: false, motivo: "versao" };
  if (sv.clubId == null || !Array.isArray(sv.squad) || !sv.squad.length || typeof sv.currentRound !== "number" || !sv.lineup || !sv.finances) return { ok: false, motivo: "conteudo" };
  return { ok: true, save: sv };
}

export function criarRepositorio(opts = {}) {
  const idb = opts.indexedDB !== undefined ? opts.indexedDB : (typeof indexedDB !== "undefined" ? indexedDB : null);
  const buscar = opts.fetch || ((...a) => fetch(...a));
  let banco = null;

  function abrir() {
    if (!idb) return Promise.reject(new Error("sem-indexeddb"));
    if (!banco) {
      banco = new Promise((resolve, reject) => {
        const req = idb.open(BANCO, VERSAO_BANCO);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(LOJA_SAVES)) db.createObjectStore(LOJA_SAVES, { keyPath: "conta" });
          if (!db.objectStoreNames.contains(LOJA_PERFIL)) db.createObjectStore(LOJA_PERFIL, { keyPath: "chave" });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => { banco = null; reject(req.error); };
        req.onblocked = () => { banco = null; reject(new Error("banco-bloqueado")); };
      });
    }
    return banco;
  }
  async function lerLoja(loja, chave) {
    const db = await abrir();
    return prometer(db.transaction(loja, "readonly").objectStore(loja).get(chave));
  }
  async function escreverLoja(loja, valor) {
    const db = await abrir();
    const tx = db.transaction(loja, "readwrite");
    tx.objectStore(loja).put(valor);
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error("abortada")); });
  }
  async function apagarLoja(loja, chave) {
    const db = await abrir();
    const tx = db.transaction(loja, "readwrite");
    tx.objectStore(loja).delete(chave);
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  }

  // Pedido ao servidor. Devolve { rede: false } se não houve resposta.
  async function servidor(url, init = {}) {
    try {
      const res = await buscar(url, { credentials: "same-origin", cache: "no-store", ...init, headers: { Accept: "application/json", ...(init.headers || {}) } });
      const corpo = await res.json().catch(() => ({}));
      return { rede: true, ok: res.ok, status: res.status, corpo };
    } catch (_) {
      return { rede: false };
    }
  }

  // Avisa a tela (evento "brdata:copia" na janela) quando a cópia no
  // servidor não foi: a tela mostra o aviso não bloqueante (sessão expirada).
  function avisarCopia(conta, copia) {
    try {
      if (typeof globalThis.dispatchEvent === "function" && typeof CustomEvent === "function") {
        globalThis.dispatchEvent(new CustomEvent("brdata:copia", { detail: { conta, copia } }));
      }
    } catch (_) { /* sem janela */ }
    return copia;
  }

  const repo = {
    // true se o aparelho consegue guardar (IndexedDB abre).
    async disponivel() {
      try { await abrir(); return true; } catch (_) { return false; }
    },

    // ---------- Conta (perfil) ----------
    // Com rede: a conta do servidor (guardada como "último perfil"). Sem rede:
    // o último perfil guardado; sem nenhum, um perfil local. Devolve
    // { user, online, local } ou null (com rede e sem sessão: tela de login).
    async conta() {
      const r = await servidor("/api/auth/me");
      if (r.rede && r.ok) {
        if (r.corpo && r.corpo.authenticated && r.corpo.user) {
          const user = { ...r.corpo.user, id: String(r.corpo.user.id) };
          await escreverLoja(LOJA_PERFIL, { chave: "ultimo", user, quando: Date.now() }).catch(() => {});
          return { user, online: true, local: false };
        }
        return null;
      }
      if (r.rede && r.status === 401) return null;
      const ultimo = await lerLoja(LOJA_PERFIL, "ultimo").catch(() => null);
      if (ultimo && ultimo.user) return { user: ultimo.user, online: false, local: false };
      // Sem nenhuma conta neste aparelho: perfil local (jogar sem login).
      const local = { id: "local", name: "Treinador", local: true, onboardingSeen: false, dailyLogin: null, creditsBR: 0 };
      await escreverLoja(LOJA_PERFIL, { chave: "ultimo", user: local, quando: Date.now() }).catch(() => {});
      return { user: local, online: false, local: true };
    },

    // Nome do treinador no perfil local (sem conta): fica só no aparelho.
    async nomeLocal(nome) {
      const ultimo = await lerLoja(LOJA_PERFIL, "ultimo").catch(() => null);
      if (!ultimo || !ultimo.user || !ultimo.user.local) return null;
      const user = { ...ultimo.user, name: nome };
      await escreverLoja(LOJA_PERFIL, { ...ultimo, user });
      return user;
    },

    // ---------- Save ----------
    async registro(conta) {
      return (await lerLoja(LOJA_SAVES, String(conta)).catch(() => null)) || null;
    },
    // Lê o save da conta, conciliando com o servidor quando há rede.
    // Devolve { career, origem, rev, pendente } (career null = sem carreira).
    async ler(conta) {
      const id = String(conta);
      const reg = await repo.registro(id);
      if (id === "local") return { career: reg ? reg.save : null, origem: "aparelho", rev: reg ? reg.rev : 0, pendente: false };
      const marca = await lerLoja(LOJA_PERFIL, `situacao:${id}`).catch(() => null);
      // Reiniciada sem rede: apaga a do servidor antes de olhar para ela.
      if (!reg && marca && marca.apagarNoServidor) {
        const d = await servidor("/api/career", { method: "DELETE" });
        if (d.rede && d.ok) await escreverLoja(LOJA_PERFIL, { chave: `situacao:${id}`, semCarreira: true, apagarNoServidor: false }).catch(() => {});
        else return { career: null, origem: "aparelho", rev: 0, pendente: true, offline: !d.rede };
      }
      const r = await servidor("/api/career");
      if (!r.rede || !r.ok) {
        // Sem cópia no aparelho e sem saber se a conta tem carreira: erro
        // (com "Tentar novamente"), nunca "sem carreira" — criar uma nova
        // aqui apagaria a do servidor na próxima cópia. Se o aparelho já viu
        // (com rede) que a conta não tinha carreira, a criação pode seguir.
        if (!reg && marca && marca.semCarreira && !(r.rede && r.status === 401)) return { career: null, origem: "aparelho", rev: 0, pendente: false, offline: !r.rede };
        if (!reg) {
          const e = new Error(r.rede && r.status === 401 ? "sessao" : "sem-rede");
          e.status = r.rede ? r.status : 0;
          throw e;
        }
        return { career: reg.save, origem: "aparelho", rev: reg.rev, pendente: reg.hash !== reg.sincronizado, offline: !r.rede };
      }
      const doServidor = (r.corpo && r.corpo.career) || null;
      const hashServidor = doServidor ? hashTexto(JSON.stringify(doServidor)) : null;
      if (!reg) {
        // Carreira começada sem conta neste aparelho (perfil local) e a conta
        // sem carreira no servidor: a carreira passa a ser da conta.
        const local = !doServidor ? await repo.registro("local") : null;
        if (local && local.save) {
          await repo.guardar(id, local.save, { sincronizado: null, rev: 1 });
          await apagarLoja(LOJA_SAVES, "local").catch(() => {});
          await repo.copiarParaServidor(id).catch(() => {});
          return { career: local.save, origem: "aparelho", rev: 1, pendente: false, adotouLocal: true };
        }
        if (doServidor) await repo.guardar(id, doServidor, { sincronizado: hashServidor, rev: 1 });
        // Lembra que a conta não tem carreira (para poder criar sem rede).
        await escreverLoja(LOJA_PERFIL, { chave: `situacao:${id}`, semCarreira: !doServidor, apagarNoServidor: false }).catch(() => {});
        return { career: doServidor, origem: "servidor", rev: doServidor ? 1 : 0, pendente: false };
      }
      const aparelhoMudou = reg.hash !== reg.sincronizado;
      const servidorMudou = hashServidor !== reg.sincronizado;
      if (!aparelhoMudou && servidorMudou) {
        // Avanço só do lado do servidor (outro aparelho, reinício, migração):
        // adota. Nada do aparelho se perde (ele não tinha progresso novo).
        if (!doServidor) { await apagarLoja(LOJA_SAVES, id).catch(() => {}); return { career: null, origem: "servidor", rev: 0, pendente: false }; }
        const novo = await repo.guardar(id, doServidor, { sincronizado: hashServidor, rev: reg.rev + 1 });
        return { career: doServidor, origem: "servidor", rev: novo.rev, pendente: false };
      }
      if (aparelhoMudou && doServidor && hashServidor === reg.hash) {
        // A cópia chegou, mas a resposta se perdeu: já está em dia.
        await escreverLoja(LOJA_SAVES, { ...reg, sincronizado: reg.hash, conflito: null });
        return { career: reg.save, origem: "aparelho", rev: reg.rev, pendente: false };
      }
      if (aparelhoMudou && doServidor && servidorMudou && !reg.conflito) {
        // Os dois avançaram (a conta foi jogada em outro aparelho e este também
        // jogou): vale o aparelho, mas a cópia da conta NÃO é sobrescrita
        // sozinha; o técnico escolhe em Saves qual fica.
        await escreverLoja(LOJA_SAVES, { ...reg, conflito: hashServidor });
        avisarCopia(id, "conflito");
        return { career: reg.save, origem: "aparelho", rev: reg.rev, pendente: true, conflito: true };
      }
      if (aparelhoMudou) {
        // O aparelho avançou (offline, ou backup que falhou): vale o aparelho,
        // e a cópia vai ao servidor (decisão do Murilo, 13/11).
        await repo.copiarParaServidor(id).catch(() => {});
        const atual = await repo.registro(id);
        return { career: reg.save, origem: "aparelho", rev: reg.rev, pendente: !!(atual && atual.hash !== atual.sincronizado) };
      }
      return { career: reg.save, origem: "aparelho", rev: reg.rev, pendente: false };
    },
    // Grava só no aparelho (uso interno e importação).
    async guardar(conta, save, extra = {}) {
      const id = String(conta);
      const ant = await repo.registro(id);
      const hash = hashTexto(JSON.stringify(save));
      const reg = {
        conta: id, versao: VERSAO_REGISTRO, save, hash,
        rev: extra.rev != null ? extra.rev : (ant ? ant.rev + 1 : 1),
        sincronizado: extra.sincronizado !== undefined ? extra.sincronizado : (ant ? ant.sincronizado : null),
        // Hash da cópia da conta que avançou em outro aparelho (ver ler()).
        conflito: extra.conflito !== undefined ? extra.conflito : (ant ? ant.conflito || null : null),
        atualizadoEm: Date.now(),
      };
      await escreverLoja(LOJA_SAVES, reg);
      return reg;
    },
    // Grava a carreira: primeiro no aparelho (confirma), depois a cópia no
    // servidor. `revEsperada` (opcional): recusa se outra gravação veio antes.
    // Devolve { ok, rev, copia: "ok"|"offline"|"sessao"|"outra-conta"|"grande"|"falha"|"local" } ou
    // { ok: false, motivo: "armazenamento"|"conflito"|"outra-aba" }.
    async gravar(conta, save, opts = {}) {
      const id = String(conta);
      // Outra aba tomou a vez desta carreira (Web Lock, adapters/local.ts da v2).
      if (globalThis.__BRDATA_ABA_ATIVA__ === false) return { ok: false, motivo: "outra-aba" };
      let reg;
      try {
        const ant = await repo.registro(id);
        if (opts.revEsperada != null && ant && ant.rev !== opts.revEsperada) return { ok: false, motivo: "conflito", rev: ant.rev };
        reg = await repo.guardar(id, save);
      } catch (e) {
        return { ok: false, motivo: "armazenamento", mensagem: (e && e.message) || null };
      }
      const copia = id === "local" ? "local" : await repo.copiarParaServidor(id);
      return { ok: true, rev: reg.rev, copia };
    },
    // Manda ao servidor a cópia do que está no aparelho (se ainda não foi).
    async copiarParaServidor(conta) {
      const id = String(conta);
      const reg = await repo.registro(id);
      if (!reg) return "ok";
      if (reg.hash === reg.sincronizado) return "ok";
      if (reg.conflito) return avisarCopia(id, "conflito");
      // A sessão do navegador pode ser de outra conta (entrou com outra em
      // outra aba): a cópia só vai se a sessão for a da carreira.
      const me = await servidor("/api/auth/me");
      if (!me.rede) return avisarCopia(id, "offline");
      if (me.status === 401 || (me.ok && !(me.corpo && me.corpo.authenticated))) return avisarCopia(id, "sessao");
      if (!me.ok) return avisarCopia(id, "falha");
      if (!me.corpo.user || String(me.corpo.user.id) !== id) return avisarCopia(id, "outra-conta");
      const r = await servidor("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reg.save) });
      if (!r.rede) return avisarCopia(id, "offline");
      if (r.status === 401) return avisarCopia(id, "sessao");
      if (r.status === 413) return avisarCopia(id, "grande");
      if (!r.ok) return avisarCopia(id, "falha");
      // Só marca sincronizado se o aparelho não gravou outra coisa no meio.
      const agoraReg = await repo.registro(id);
      if (agoraReg && agoraReg.hash === reg.hash) await escreverLoja(LOJA_SAVES, { ...agoraReg, sincronizado: reg.hash });
      return "ok";
    },
    // Apaga a carreira da conta: no aparelho e (com rede) no servidor.
    async apagar(conta) {
      const id = String(conta);
      if (id !== "local") {
        const r = await servidor("/api/career", { method: "DELETE" });
        if (r.rede && r.status === 401) { const e = new Error("sessao"); e.status = 401; throw e; }
        // Sem rede (ou falha): apaga a do servidor quando der (ver ler()).
        await escreverLoja(LOJA_PERFIL, { chave: `situacao:${id}`, semCarreira: true, apagarNoServidor: !(r.rede && r.ok) });
      }
      await apagarLoja(LOJA_SAVES, id).catch(() => {});
      await repo.apagarPartida(id);
      return { ok: true };
    },
    // Versão (updatedAt) do save no aparelho, conciliada com o servidor.
    async versao(conta) {
      const r = await repo.ler(conta);
      return r.career && r.career.updatedAt != null ? Number(r.career.updatedAt) : null;
    },

    // ---------- Exportar / importar (etapa 3) ----------
    async exportar(conta) {
      const reg = await repo.registro(conta);
      return reg && reg.save ? montarArquivo(reg.save) : null;
    },
    // Põe no aparelho a carreira de um arquivo conferido (conferirArquivo).
    // Ela passa a valer e a cópia vai ao servidor na próxima vez (com rede).
    async importar(conta, save) {
      const id = String(conta);
      if (globalThis.__BRDATA_ABA_ATIVA__ === false) return { ok: false, motivo: "outra-aba" };
      try {
        const ant = await repo.registro(id);
        await repo.guardar(id, save, { sincronizado: null, conflito: null, rev: ant ? ant.rev + 1 : 1 });
        await repo.apagarPartida(id);
      } catch (e) { return { ok: false, motivo: "armazenamento" }; }
      const copia = id === "local" ? "local" : await repo.copiarParaServidor(id).catch(() => "falha");
      return { ok: true, copia };
    },
    // A cópia do servidor (para mostrar e, se o técnico pedir, trazer).
    async copiaDoServidor() {
      const r = await servidor("/api/career");
      if (!r.rede) return { ok: false, motivo: "offline" };
      if (r.status === 401) return { ok: false, motivo: "sessao" };
      if (!r.ok) return { ok: false, motivo: "falha" };
      return { ok: true, career: (r.corpo && r.corpo.career) || null };
    },
    // Traz a cópia do servidor para o aparelho por pedido explícito (decisão
    // 1 do Murilo): substitui o que está aqui.
    async trazerDoServidor(conta) {
      const id = String(conta);
      if (globalThis.__BRDATA_ABA_ATIVA__ === false) return { ok: false, motivo: "outra-aba" };
      const c = await repo.copiaDoServidor();
      if (!c.ok) return c;
      if (!c.career) return { ok: false, motivo: "sem-copia" };
      try {
        const ant = await repo.registro(id);
        await repo.guardar(id, c.career, { sincronizado: hashTexto(JSON.stringify(c.career)), conflito: null, rev: ant ? ant.rev + 1 : 1 });
        await repo.apagarPartida(id);
      } catch (e) { return { ok: false, motivo: "armazenamento" }; }
      return { ok: true };
    },
    // Conflito resolvido a favor do aparelho: a cópia da conta passa a ser
    // a deste aparelho (pedido explícito do técnico, em Saves).
    async enviarDoAparelho(conta) {
      const id = String(conta);
      if (globalThis.__BRDATA_ABA_ATIVA__ === false) return { ok: false, motivo: "outra-aba" };
      const reg = await repo.registro(id);
      if (!reg) return { ok: false, motivo: "sem-carreira" };
      try { await escreverLoja(LOJA_SAVES, { ...reg, conflito: null }); } catch (e) { return { ok: false, motivo: "armazenamento" }; }
      const copia = await repo.copiarParaServidor(id);
      return copia === "ok" ? { ok: true } : { ok: false, motivo: copia };
    },
    // Situação da cópia: "em-dia" | "pendente" | "conflito" | "sem-carreira".
    async situacaoDaCopia(conta) {
      const reg = await repo.registro(conta);
      if (!reg) return "sem-carreira";
      if (reg.conflito) return "conflito";
      return reg.hash === reg.sincronizado ? "em-dia" : "pendente";
    },

    // ---------- Partida em andamento (checkpoint) ----------
    // Guardada a cada bloco pelo motor (jogo.js, checkpointPartida). Vale só
    // enquanto o save do aparelho for o mesmo de quando foi guardada: o fim
    // da partida grava o save e a deixa velha (apagada na próxima leitura).
    async guardarPartida(conta, dados) {
      const id = String(conta);
      const reg = await repo.registro(id);
      if (!reg) return false;
      await escreverLoja(LOJA_PERFIL, { chave: `partida:${id}`, baseHash: reg.hash, dados, quando: Date.now() });
      return true;
    },
    async partidaPendente(conta) {
      const id = String(conta);
      const cp = await lerLoja(LOJA_PERFIL, `partida:${id}`).catch(() => null);
      if (!cp) return null;
      const reg = await repo.registro(id);
      if (!reg || reg.hash !== cp.baseHash) { await repo.apagarPartida(id); return null; }
      return cp.dados;
    },
    async apagarPartida(conta) {
      await apagarLoja(LOJA_PERFIL, `partida:${String(conta)}`).catch(() => {});
    },

    // ---------- Catálogo offline (decisão 3 do Murilo, 13/11) ----------
    // Cópia dos clubes, tabelas e elencos do servidor, versionada por deploy
    // (GET /api/career/catalogo-offline). Fica no aparelho para criar e
    // reabrir a carreira sem rede.
    async catalogo() {
      const r = await lerLoja(LOJA_PERFIL, "catalogo").catch(() => null);
      return r ? r.dados : null;
    },
    // Baixa a versão nova, se houver. "atual" | "novo" | "offline" | "falha".
    async atualizarCatalogo() {
      const atual = await repo.catalogo();
      const q = atual && atual.versao ? `?versao=${encodeURIComponent(atual.versao)}` : "";
      const r = await servidor(`/api/career/catalogo-offline${q}`);
      if (!r.rede) return "offline";
      if (!r.ok || !r.corpo || !r.corpo.versao) return "falha";
      if (r.corpo.atual) return "atual";
      await escreverLoja(LOJA_PERFIL, { chave: "catalogo", dados: r.corpo, quando: Date.now() });
      return "novo";
    },

    // Adaptador no formato de fetchJSON (o motor usa estado.carregarSave /
    // gravarSave com `pedir`): só as rotas da carreira passam por aqui.
    pedirDaConta(contaFn) {
      return async (url, init = {}) => {
        const metodo = (init.method || "GET").toUpperCase();
        if (url === "/api/career" && metodo === "GET") {
          const r = await repo.ler(contaFn());
          return { career: r.career };
        }
        if (url === "/api/career" && metodo === "PUT") {
          const save = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
          const r = await repo.gravar(contaFn(), save);
          if (!r.ok) { const e = new Error(r.motivo); e.status = r.motivo === "armazenamento" ? 507 : 409; throw e; }
          return { ok: true, copia: r.copia };
        }
        if (url === "/api/career" && metodo === "DELETE") return repo.apagar(contaFn());
        throw new Error("rota fora do repositório: " + url);
      };
    },
  };
  return repo;
}
