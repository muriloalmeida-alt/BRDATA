// Ajudantes para testes NOVOS de regra do jogo, sem navegador (plano "sem
// página escondida"). Carregam public/js/data.js, o motor (public/js/motor/)
// e o jogo (public/js/carreira.js, no modo ponte, sem tela) num `vm` do
// Node, com uma tela falsa e a API de verdade (servidor de testes), e
// conduzem a carreira SÓ pela ponte (BRDATA_PONTE), como a v2 faz.
// A tela antiga (carreira.html, /carreira-old) está descontinuada desde
// 09/11: teste novo não deve clicar nela (ver tests/e2e/README.md).
// Uso:
//   const { abrirPagina, criar, jogarRodada } = require("./_sem_tela");
//   const pg = await abrirPagina();          // conta nova, ponte pronta
//   await criar(pg.P);                       // carreira na Série A
//   const r = await jogarRodada(pg.P);       // semana, partida, pós-jogo
//   const save = (await pg.api("/api/career")).career;
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { criarJanela } = require("./_tela_falsa");
const { motorCode } = require("./_motor_vm");

const ROOT = path.resolve(__dirname, "../..");
const base = "http://localhost:8787";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function ate(cond, ms = 30000, passo = 20) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const v = await cond(); if (v) return v; await espera(passo); }
  return null;
}

const MOTOR = motorCode();
const DATA_JS = fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8");
const CARREIRA_JS = fs.readFileSync(path.join(ROOT, "public/js/carreira.js"), "utf8");

async function abrirPagina({ codigo = CARREIRA_JS, semente = null, medir = false, sessao = null } = {}) {
  const cookies = sessao ? sessao.cookies : new Map();
  const cookie = () => [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  const setCookie = (sc) => { const kv = sc.split(";")[0]; const i = kv.indexOf("="); cookies.set(kv.slice(0, i).trim(), kv.slice(i + 1)); };
  const api = async (url, body) => {
    const res = await fetch(base + url, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", cookie: cookie() }, body: body ? JSON.stringify(body) : undefined });
    (res.headers.getSetCookie ? res.headers.getSetCookie() : []).forEach(setCookie);
    return res.json().catch(() => null);
  };
  if (!sessao) {
    const email = `semtela${Date.now()}${Math.floor(Math.random() * 1e6)}@teste.com`;
    await api("/api/auth/signup", { name: "Sem Tela", email, password: "senha123", phone: "11999999999", plan: "freemium" });
    await api("/api/auth/login", { email, password: "senha123" });
  }

  const { win, documento, sinais } = criarJanela({ base, cookie, setCookie });
  const ctx = vm.createContext(win);
  const rodar = (c, arquivo) => vm.runInContext(c, ctx, { filename: arquivo });
  if (semente != null) {
    // Mesmo sorteio nas duas páginas (Math.random da página).
    rodar(`(() => { let a = ${semente} >>> 0; Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`, "semente");
  }
  rodar("window.BRDATA_MOTOR = {};\n" + MOTOR, "motor");
  rodar(DATA_JS, "data.js");
  rodar(codigo, "carreira.js");
  // Mede quanto é desenho de tela: chamadas e tempo de render*, show*, toast...
  const desenho = new Map();
  if (medir) {
    Object.getOwnPropertyNames(win).filter((k) => /^(render[A-Z]|show[A-Z]|toast$|open[A-Z]\w*(Screen|Sheet|Modal)$)/.test(k) && typeof win[k] === "function").forEach((k) => {
      const f = win[k];
      win[k] = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { const d = desenho.get(k) || { n: 0, ms: 0 }; d.n++; d.ms += performance.now() - t0; desenho.set(k, d); } };
    });
  }
  documento.dispatchEvent(new win.Event("DOMContentLoaded"));
  const pronta = await ate(() => rodar("PONTE.pronta", "estado"), 30000);
  return { P: win.BRDATA_PONTE, pronta, api, sinais, desenho, rodar, sessao: { cookies } };
}

// Uma rodada como a v2: semana até o jogo, partida ao vivo até o fim e o
// pós-jogo (coletiva, notícias, resultados, Copa, proposta).
async function jogarRodada(P) {
  const passos = [];
  const s = await P.avancarSemana(true);
  passos.push(`semana:${s && s.ok ? "ok" : s && s.motivo}`);
  const i = P.iniciar();
  passos.push(`iniciar:${i && i.ok ? (i.aoVivo ? "ao-vivo" : "direto") : i && i.motivo}`);
  if (!i || !i.ok) return { ok: false, passos };
  P.pularParaFim();
  const est = await ate(() => { const e = P.estado(); return e.fase === "encerrada" && e.gravada != null ? e : null; }, 60000);
  passos.push(`fim:${est ? (est.gravada ? "gravada" : est.erroGravacao) : "timeout"}`);
  if (!est || !est.gravada) return { ok: false, passos };
  let etapa = P.iniciarPosJogo();
  passos.push(`pos:${etapa.ok ? etapa.etapa : etapa.motivo}`);
  for (let n = 0; etapa && etapa.ok !== false && etapa.etapa !== "fim" && n < 12; n++) {
    if (etapa.etapa === "coletiva") etapa = await P.responderColetiva(etapa.respostas[0].letra);
    else if (etapa.etapa === "noticias" || etapa.etapa === "resultados") etapa = P.concluirEtapa(etapa.etapa);
    else if (etapa.etapa === "proposta") etapa = await P.responderProposta("recusar");
    else if (etapa.etapa === "copa") {
      const c = P.iniciarPernaCopa();
      if (c.ok && c.aoVivo) { P.pularParaFim(); await ate(() => { const e = P.estado(); return e.fase === "encerrada" && e.gravada != null; }, 60000); }
      etapa = P.posJogo();
    } else break;
    passos.push(`pos:${etapa && etapa.ok === false ? etapa.motivo : etapa.etapa}`);
  }
  P.encerrarPosJogo();
  return { ok: !!etapa && etapa.etapa === "fim", passos };
}
async function criar(P) {
  const comp = await P.escolherCompeticao("brasileirao");
  const clube = comp && comp.ok ? comp.clubes[0] : null;
  return clube ? P.criarCarreira(clube.id) : null;
}

module.exports = { base, espera, ate, abrirPagina, jogarRodada, criar, CARREIRA_JS };
