/* ===================================================================
   MOTOR — COPAS DA UEFA (MUNDO-001, M10a, 25/11/2026)
   -------------------------------------------------------------------
   Champions League, Europa League e Conference League de uma edição
   (2026/27 no pacote continental: config/competicoes.json, calendarios.json,
   acesso-e-transferencias.json). As três andam juntas porque os derrotados
   da qualificação descem de copa.

   Módulo puro e serializável, como continental.js:
   - montarEdicao: participantes por fase de entrada (liga, PO, Q3, Q2, Q1),
     coeficiente e associação de cada clube, ano;
   - jogosPendentes / registrarJogo: os jogos com data, fase a fase; as fases
     seguintes (sorteios, fase de liga, mata-mata) são criadas quando as de
     que dependem acabam;
   - premios: créditos com chave única (reprocessar não duplica).

   Regras do pacote:
   - fase de liga: 36 clubes; Champions e Europa League com 4 potes de 9,
     2 adversários de cada pote (1 em casa e 1 fora), 8 rodadas;
     Conference com 6 potes de 6, 1 adversário de cada pote, 6 rodadas
     (casa e fora por par de potes); sem clube da mesma associação e no
     máximo 2 de outra associação; tabela pelos critérios do pacote;
   - 1º ao 8º às oitavas; 9º ao 24º no playoff (blocos 9/10 x 23/24...,
     volta na casa do 9º ao 16º); oitavas por blocos (1/2 x vencedores do
     15/16...), volta na casa do 1º ao 8º; ida e volta por saldo,
     prorrogação e pênaltis; final em jogo único neutro.
   Regras de jogo (o pacote não traz o Anexo A, o Anexo B nem a circular de
   premiação 2026/27; ver docs/mundo/01_Requisitos.md, DEP-2):
   - qualificação num caminho só (sem separar campeões e liga), cabeças de
     chave pelo coeficiente, sem a mesma associação; o derrotado desce pelo
     fluxo do pacote (o 1º listado de cada fase);
   - árvore da chave depois das oitavas pela posição do 1º ao 8º: quartas
     1x8, 4x5, 2x7 e 3x6; semis (1x8)x(4x5) e (2x7)x(3x6); a volta é de quem
     herdou a melhor posição;
   - premiação por fase em EUR (PREMIACAO_UEFA, próxima à de 2024/25).
=================================================================== */
import { rngDaChave } from "./desempate.js";
import { decidirConfronto, mandanteDaPerna, RESOLUCOES as R } from "./fases.js";
import { dataNaEdicao } from "./continental.js";

const S = (x) => String(x);
export const COPAS_UEFA = ["UCL", "UEL", "UECL"];
const QUALI = ["Q1", "Q2", "Q3", "PO"];
const DESEMPATE_DUELO = [R.AGREGADO, R.PRORROGACAO, R.PENALTIS];

// Premiação de jogo, em EUR (o pacote aguarda a circular da edição).
// participacao: na fase de liga; vitoria/empate: por jogo da fase de liga;
// playoff...final: por chegar à fase; campeao: o título.
export const PREMIACAO_UEFA = {
  UCL: { participacao: 18600000, vitoria: 2100000, empate: 700000, playoff_mata_mata: 1000000, oitavas: 11000000, quartas: 12500000, semifinal: 15000000, final: 18500000, campeao: 6500000 },
  UEL: { participacao: 4300000, vitoria: 450000, empate: 150000, playoff_mata_mata: 300000, oitavas: 1750000, quartas: 2600000, semifinal: 4000000, final: 6000000, campeao: 6000000 },
  UECL: { participacao: 3170000, vitoria: 400000, empate: 133000, playoff_mata_mata: 200000, oitavas: 800000, quartas: 1300000, semifinal: 2500000, final: 3500000, campeao: 3500000 },
};

// Para onde desce o derrotado de cada fase de qualificação (fluxos do pacote,
// num caminho só: o 1º fluxo listado de cada fase).
export function fluxosDoPacote(acesso) {
  const out = {};
  for (const [de, para] of (acesso && acesso.UEFA && acesso.UEFA.fluxos_base) || []) {
    const [c1, f1] = de.split("."), [c2, f2] = para.split(".");
    const k = `${c1}:${f1}`;
    if (!out[k]) out[k] = `${c2}:${f2}`;
  }
  return out;
}

// ---------- sorteios ----------
function embaralhar(lista, rng) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(rng() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; }
  return a;
}

// Qualificação: cabeças de chave (metade de melhor coeficiente) x os outros,
// sem a mesma associação (busca com volta; sem solução, sem a restrição). O
// mando da ida é sorteado.
function paresDaQualificacao(ids, plano, rng) {
  const ord = ids.slice().sort((a, b) => coef(plano, b) - coef(plano, a) || S(a).localeCompare(S(b)));
  const meio = ord.length / 2;
  const cab = embaralhar(ord.slice(0, meio), rng), out = embaralhar(ord.slice(meio), rng);
  const assoc = (x) => plano.associacao[S(x)];
  const usado = new Set(), pares = [];
  function par(i) {
    if (i === cab.length) return true;
    for (const y of out) {
      if (usado.has(y) || (assoc(cab[i]) && assoc(cab[i]) === assoc(y))) continue;
      usado.add(y); pares.push([cab[i], y]);
      if (par(i + 1)) return true;
      usado.delete(y); pares.pop();
    }
    return false;
  }
  if (!par(0)) { pares.length = 0; cab.forEach((x, i) => pares.push([x, out[i]])); }
  return pares;
}
const coef = (plano, id) => plano.coeficiente[S(id)] ?? 0;

// Fase de liga: os adversários de cada clube (arestas [mandante, visitante]).
// potes: [[ids]...]; regra: liga do pacote (mandos_por_potes,
// adversarios_por_pote, max_por_outra_associacao).
export function sortearAdversarios(potes, regra, associacao, rng) {
  const k = regra.adversarios_por_pote;
  const assoc = (x) => associacao[S(x)] || null;
  // O limite de adversários de outra associação é afrouxado (+1, depois sem
  // limite) só se o sorteio não achar solução com ele: uma edição com muitos
  // clubes de uma associação (vagas extras e titulares) não pode travar o save.
  const limites = [regra.max_por_outra_associacao ?? 2, (regra.max_por_outra_associacao ?? 2) + 1, Infinity];
  // Tentativas por limite: poucas com o do pacote (quando ele quase não tem
  // solução, cada tentativa custa ~10 ms), mais com o afrouxado.
  const tentativas = [15, 60, 120];
  for (let tentativa = 0; tentativa < tentativas.reduce((x, y) => x + y, 0); tentativa++) {
    const maxOutra = limites[tentativa < tentativas[0] ? 0 : tentativa < tentativas[0] + tentativas[1] ? 1 : 2];
    let orcamento = 6000; // passos de busca por tentativa
    const registro = []; // arestas ligadas no par de potes em curso
    const arestas = new Set(); // "a|b" com a<b
    const viz = new Map(); // id -> Set
    const porAssoc = new Map(); // id -> { assoc: n }
    const chave = (a, b) => (S(a) < S(b) ? `${S(a)}|${S(b)}` : `${S(b)}|${S(a)}`);
    const pode = (a, b) => {
      if (S(a) === S(b) || arestas.has(chave(a, b))) return false;
      const xa = assoc(a), xb = assoc(b);
      if (xa && xa === xb) return false;
      if (xb && ((porAssoc.get(S(a)) || {})[xb] || 0) >= maxOutra) return false;
      if (xa && ((porAssoc.get(S(b)) || {})[xa] || 0) >= maxOutra) return false;
      return true;
    };
    const ligar = (a, b, d) => {
      if (d > 0) registro.push([a, b]);
      const c = chave(a, b);
      if (d > 0) arestas.add(c); else arestas.delete(c);
      for (const [x, y] of [[a, b], [b, a]]) {
        if (!viz.has(S(x))) viz.set(S(x), new Set());
        if (d > 0) viz.get(S(x)).add(S(y)); else viz.get(S(x)).delete(S(y));
        const m = porAssoc.get(S(x)) || {};
        const ay = assoc(y);
        if (ay) m[ay] = (m[ay] || 0) + d;
        porAssoc.set(S(x), m);
      }
    };
    // Emparelhamento perfeito entre p e q (ou dentro de p, se q for null):
    // busca com volta, sempre pelo clube com menos opções (MRV), com orçamento
    // de passos (falha rápido e o sorteio recomeça com outra ordem).
    const emparelhar = (p, q) => {
      const lado = embaralhar(p, rng);
      const livres = new Set((q || p).map(S));
      const idDe2 = new Map([...p, ...(q || [])].map((x) => [S(x), x]));
      const feitos = new Set(); // do lado p já emparelhados
      const opcoes = (x) => [...livres].filter((y) => y !== S(x) && pode(x, idDe2.get(y)));
      const passo = () => {
        if (--orcamento < 0) return false;
        let melhor = null, ops = null;
        for (const x of lado) {
          if (feitos.has(S(x)) || (!q && !livres.has(S(x)))) continue;
          const o = opcoes(x);
          if (!ops || o.length < ops.length) { melhor = x; ops = o; }
          if (ops.length === 0) break;
        }
        if (melhor == null) return true;
        if (!ops.length) return false;
        feitos.add(S(melhor));
        if (!q) livres.delete(S(melhor));
        for (const y of embaralhar(ops, rng)) {
          const b = idDe2.get(y);
          livres.delete(y); if (!q) feitos.add(y);
          ligar(melhor, b, 1);
          if (passo()) return true;
          ligar(melhor, b, -1);
          livres.add(y); if (!q) feitos.delete(y);
        }
        feitos.delete(S(melhor));
        if (!q) livres.add(S(melhor));
        return false;
      };
      return passo();
    };
    // Ciclo que passa por todos do pote (2 adversários do próprio pote): o
    // próximo é o que tem menos saídas (Warnsdorff), com volta e orçamento.
    const cicloNoPote = (p) => {
      const ord = embaralhar(p, rng);
      const caminho = [ord[0]], usado = new Set([S(ord[0])]);
      const saidas = (y) => p.filter((z) => !usado.has(S(z)) && S(z) !== S(y) && pode(y, z)).length;
      function passo() {
        if (--orcamento < 0) return false;
        const ult = caminho[caminho.length - 1];
        if (caminho.length === p.length) {
          if (!pode(ult, caminho[0])) return false;
          ligar(ult, caminho[0], 1);
          return true;
        }
        const cand = embaralhar(p.filter((y) => !usado.has(S(y)) && pode(ult, y)), rng).sort((a, b) => saidas(a) - saidas(b));
        for (const y of cand) {
          usado.add(S(y)); caminho.push(y); ligar(ult, y, 1);
          if (passo()) return true;
          ligar(ult, y, -1); caminho.pop(); usado.delete(S(y));
        }
        return false;
      }
      return passo();
    };
    let ok = true;
    const nP = potes.length;
    const pares = [];
    for (let p = 0; p < nP; p++) for (let q = p; q < nP; q++) pares.push([p, q]);
    for (const [p, q] of embaralhar(pares, rng)) {
      // Cada par de potes tenta algumas vezes (desfazendo o que ligou) antes
      // de recomeçar o sorteio inteiro.
      for (let r = 0; r < 8; r++) {
        registro.length = 0;
        if (p === q) ok = k === 2 ? cicloNoPote(potes[p]) : emparelhar(potes[p], null);
        else ok = emparelhar(potes[p], potes[q]) && (k === 1 || emparelhar(potes[p], potes[q]));
        if (ok) break;
        for (const [x, y] of registro.splice(0)) if (arestas.has(chave(x, y))) ligar(x, y, -1);
        if (orcamento < 0) break;
      }
      if (!ok) break;
    }
    if (!ok) continue;
    // Mandos: por par de grupos de potes, o subgrafo é 2-regular (ciclos);
    // percorrer cada ciclo dá a cada clube 1 jogo em casa e 1 fora.
    const grupoDoPote = [];
    regra.mandos_por_potes.forEach((g, i) => g.forEach((p) => { grupoDoPote[p - 1] = i; }));
    const poteDe = new Map();
    potes.forEach((ids, i) => ids.forEach((x) => poteDe.set(S(x), i)));
    const idDe = new Map(potes.flat().map((x) => [S(x), x]));
    const saida = [];
    const nG = regra.mandos_por_potes.length;
    let valido = true;
    for (let g = 0; g < nG && valido; g++) for (let h = g; h < nG && valido; h++) {
      const noPar = (a, b) => { const ga = grupoDoPote[poteDe.get(a)], gb = grupoDoPote[poteDe.get(b)]; return (ga === g && gb === h) || (ga === h && gb === g); };
      const sub = new Map();
      for (const c of arestas) {
        const [a, b] = c.split("|");
        if (!noPar(a, b)) continue;
        (sub.get(a) || sub.set(a, []).get(a)).push(b);
        (sub.get(b) || sub.set(b, []).get(b)).push(a);
      }
      const visto = new Set();
      for (const ini of [...sub.keys()].sort()) {
        if (visto.has(ini)) continue;
        if (sub.get(ini).length !== 2) { valido = false; break; }
        let ant = null, at = ini;
        do {
          visto.add(at);
          const [u, v] = sub.get(at);
          const nx = ant === null ? u : u === ant ? v : u;
          saida.push([idDe.get(at), idDe.get(nx)]);
          ant = at; at = nx;
        } while (at !== ini);
      }
    }
    if (valido) return saida;
  }
  throw new Error("uefa: sorteio da fase de liga impossível com as restrições");
}

// Rodadas: cada rodada é um emparelhamento perfeito dos jogos que faltam
// (busca com volta; recomeça se uma rodada final travar).
export function distribuirRodadas(jogos, nRodadas, rng) {
  for (let tentativa = 0; tentativa < 300; tentativa++) {
    const resto = embaralhar(jogos.map((j, i) => ({ j, i })), rng);
    const rodadas = [];
    let ok = true;
    for (let r = 0; r < nRodadas && ok; r++) {
      const porClube = new Map();
      for (const x of resto) for (const id of x.j) (porClube.get(S(id)) || porClube.set(S(id), []).get(S(id))).push(x);
      const clubes = [...porClube.keys()];
      const usados = new Set(), escolha = [];
      let passos = 0;
      function passo() {
        if (usados.size === clubes.length) return true;
        if (++passos > 20000) return false;
        // O clube livre com menos opções primeiro.
        let ops = null;
        for (const c of clubes) {
          if (usados.has(c)) continue;
          const o = porClube.get(c).filter((x) => !usados.has(S(x.j[0])) && !usados.has(S(x.j[1])));
          if (!ops || o.length < ops.length) ops = o;
          if (ops.length === 0) break;
        }
        for (const x of ops) {
          usados.add(S(x.j[0])); usados.add(S(x.j[1])); escolha.push(x);
          if (passo()) return true;
          escolha.pop(); usados.delete(S(x.j[0])); usados.delete(S(x.j[1]));
        }
        return false;
      }
      ok = passo();
      if (!ok) break;
      rodadas.push(escolha.map((x) => x.i));
      const tirar = new Set(escolha.map((x) => x.i));
      for (let k = resto.length - 1; k >= 0; k--) if (tirar.has(resto[k].i)) resto.splice(k, 1);
    }
    if (ok && rodadas.length === nRodadas) return rodadas;
  }
  throw new Error("uefa: rodadas da fase de liga sem solução");
}

// ---------- plano ----------
// o = { ano, chave, regras: { UCL, UEL, UECL } (competicoes.json),
//   calendario: { UCL, UEL, UECL } (calendarios.json), acesso
//   (acesso-e-transferencias.json), participantes: { UCL: { liga, PO, Q3, Q2,
//   Q1 } ... }, coeficiente: { id: número (maior = melhor) },
//   associacao: { id: código }, premiacao? (PREMIACAO_UEFA) }
export function montarEdicao(o) {
  const plano = {
    ano: o.ano, chave: o.chave || `uefa:${o.ano}`, anoDoPacote: Number(String(o.regras.UCL.edicao).slice(0, 4)) || 2026,
    regras: Object.fromEntries(COPAS_UEFA.map((c) => [c, o.regras[c]])), calendario: Object.fromEntries(COPAS_UEFA.map((c) => [c, o.calendario[c]])),
    premiacao: o.premiacao || PREMIACAO_UEFA, fluxos: fluxosDoPacote(o.acesso),
    participantes: Object.fromEntries(COPAS_UEFA.map((c) => [c, Object.fromEntries(["liga", ...QUALI].map((f) => [f, ((o.participantes[c] || {})[f] || []).slice()]))])),
    coeficiente: o.coeficiente || {}, associacao: o.associacao || {},
    jogos: [], confrontos: [], ligas: {}, marcos: {}, premios: [], resultado: null,
  };
  avancar(plano);
  return plano;
}

function addJogo(plano, j) {
  const jogo = { id: `${j.copa}:${plano.jogos.length + 1}`, gh: null, ga: null, ...j };
  plano.jogos.push(jogo);
  return jogo;
}
const data = (plano, copa, fase, i) => dataNaEdicao(plano.calendario[copa][fase][i], plano.ano, plano.anoDoPacote);

function criarDuelo(plano, copa, fase, a, b, casaIda, extra = {}) {
  const c = {
    id: `${copa}:${fase}:${plano.confrontos.length + 1}`, copa, etapa: fase, a, b, pernas: 2, casaIda, neutro: false,
    resolucao: DESEMPATE_DUELO, sementes: { [a]: 1, [b]: 2 }, pontosRegulares: { [a]: 0, [b]: 0 },
    semanaRel: 0, placares: [], vencedor: null, perdedor: null, como: null, extra: null, ...extra,
  };
  plano.confrontos.push(c);
  for (let i = 0; i < 2; i++) {
    const casa = mandanteDaPerna(c, i);
    addJogo(plano, { copa, fase, rodada: i + 1, data: data(plano, copa, fase, i), casa, fora: casa === a ? b : a, conf: c.id, perna: i + 1 });
  }
  return c;
}

const duelos = (plano, copa, fase) => plano.confrontos.filter((c) => c.copa === copa && c.etapa === fase);
const pronta = (plano, copa, fase) => { const d = duelos(plano, copa, fase); return d.every((c) => c.vencedor != null); };
const criada = (plano, copa, fase) => !!plano.marcos[`${copa}:${fase}`];
const marcar = (plano, copa, fase) => { plano.marcos[`${copa}:${fase}`] = true; };

// ---------- jogar ----------
// O número do jogo (ordem de criação), no fim do id "<copa>:<n>".
const numDoJogo = (j) => Number(j.id.slice(j.id.lastIndexOf(":") + 1));
export function jogosPendentes(plano, ate) {
  return plano.jogos.filter((j) => j.gh == null && (ate == null || j.data <= ate))
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0) || numDoJogo(a) - numDoJogo(b));
}

export function registrarJogo(plano, jogoId, placar, sim) {
  const j = plano.jogos.find((x) => x.id === jogoId);
  if (!j) throw new Error(`uefa: jogo inexistente ${jogoId}`);
  if (j.gh != null) throw new Error(`uefa: jogo já jogado ${jogoId}`);
  j.gh = placar.gh; j.ga = placar.ga;
  if (j.fase === "liga") {
    premiarJogoDaLiga(plano, j);
    // Jogo da fase de liga só muda alguma fase quando é o último dela.
    if (--plano.marcos[`${j.copa}:ligaFaltam`] > 0) return j;
  }
  if (j.conf) {
    const c = plano.confrontos.find((x) => x.id === j.conf);
    c.placares.push({ casa: j.casa, fora: j.fora, gh: j.gh, ga: j.ga });
    if (c.placares.length === c.pernas) { decidirConfronto(c, sim); if (c.extra) j.extra = c.extra; }
  }
  avancar(plano);
  return j;
}

export function concluida(plano) { return plano.resultado != null; }

export function jogarTudo(plano, sim) {
  for (let g = 0; g < 4000 && !concluida(plano); g++) {
    const [j] = jogosPendentes(plano);
    if (!j) throw new Error(`uefa: parou (marcos ${Object.keys(plano.marcos).join(",")})`);
    registrarJogo(plano, j.id, sim.jogar(j), sim);
  }
  if (!concluida(plano)) throw new Error("uefa: não termina");
  return plano.resultado;
}

// ---------- fases ----------
// Quem alimenta uma fase: a fase anterior da mesma copa e os fluxos que descem nela.
function alimentadores(plano, copa, fase) {
  const out = [];
  const i = QUALI.indexOf(fase);
  if (i > 0) out.push([copa, QUALI[i - 1], "vencedor"]);
  if (fase === "liga") out.push([copa, "PO", "vencedor"]);
  for (const [de, para] of Object.entries(plano.fluxos)) if (para === `${copa}:${fase}`) { const [c, f] = de.split(":"); out.push([c, f, "perdedor"]); }
  return out;
}
function entrantes(plano, copa, fase) {
  const ids = plano.participantes[copa][fase].slice();
  for (const [c, f, lado] of alimentadores(plano, copa, fase)) for (const d of duelos(plano, c, f)) ids.push(d[lado]);
  return ids;
}
const prontosAlimentadores = (plano, copa, fase) => alimentadores(plano, copa, fase).every(([c, f]) => criada(plano, c, f) && pronta(plano, c, f));

function avancar(plano) {
  for (let guarda = 0; guarda < 50; guarda++) {
    let mudou = false;
    for (const copa of COPAS_UEFA) {
      for (const fase of QUALI) {
        if (criada(plano, copa, fase) || !prontosAlimentadores(plano, copa, fase)) continue;
        const ids = entrantes(plano, copa, fase);
        if (ids.length % 2) throw new Error(`uefa: ${copa} ${fase} com número ímpar de clubes (${ids.length})`);
        const rng = rngDaChave(`${plano.chave}:${copa}:${fase}`);
        for (const [a, b] of paresDaQualificacao(ids, plano, rng)) criarDuelo(plano, copa, fase, a, b, rng() < 0.5 ? a : b);
        marcar(plano, copa, fase); mudou = true;
      }
      if (!criada(plano, copa, "liga") && prontosAlimentadores(plano, copa, "liga")) { criarLiga(plano, copa); mudou = true; }
      if (criada(plano, copa, "liga") && !criada(plano, copa, "playoff_mata_mata") && ligaTerminou(plano, copa)) { criarPlayoff(plano, copa); mudou = true; }
      if (criada(plano, copa, "playoff_mata_mata") && !criada(plano, copa, "oitavas") && pronta(plano, copa, "playoff_mata_mata")) { criarOitavas(plano, copa); mudou = true; }
      for (const [fase, ant] of [["quartas", "oitavas"], ["semifinal", "quartas"]]) {
        if (criada(plano, copa, ant) && !criada(plano, copa, fase) && pronta(plano, copa, ant)) { criarChave(plano, copa, fase, ant); mudou = true; }
      }
      if (criada(plano, copa, "semifinal") && !criada(plano, copa, "final") && pronta(plano, copa, "semifinal")) { criarFinal(plano, copa); mudou = true; }
      if (criada(plano, copa, "final") && pronta(plano, copa, "final") && !plano.marcos[`${copa}:campeao`]) {
        const f = duelos(plano, copa, "final")[0];
        plano.marcos[`${copa}:campeao`] = f.vencedor;
        creditar(plano, copa, f.vencedor, "campeao", plano.premiacao[copa].campeao, `${copa}:final`);
        mudou = true;
      }
    }
    if (COPAS_UEFA.every((c) => plano.marcos[`${c}:campeao`]) && !plano.resultado) {
      const fin = (c) => duelos(plano, c, "final")[0];
      plano.resultado = {
        campeoes: Object.fromEntries(COPAS_UEFA.map((c) => [c, fin(c).vencedor])),
        vices: Object.fromEntries(COPAS_UEFA.map((c) => [c, fin(c).perdedor])),
      };
    }
    if (!mudou) return;
  }
}

function criarLiga(plano, copa) {
  const regra = plano.regras[copa].liga;
  const ids = entrantes(plano, copa, "liga");
  if (ids.length !== regra.clubes) throw new Error(`uefa: fase de liga da ${copa} com ${ids.length} clubes (esperado ${regra.clubes})`);
  const ord = ids.slice().sort((a, b) => coef(plano, b) - coef(plano, a) || S(a).localeCompare(S(b)));
  const potes = Array.from({ length: regra.potes }, (_, i) => ord.slice(i * regra.clubes_por_pote, (i + 1) * regra.clubes_por_pote));
  const rng = rngDaChave(`${plano.chave}:${copa}:liga`);
  const confrontos = sortearAdversarios(potes, regra, plano.associacao, rng);
  const rodadas = distribuirRodadas(confrontos, regra.rodadas, rng);
  rodadas.forEach((idx, r) => {
    for (const i of idx) {
      const [casa, fora] = confrontos[i];
      addJogo(plano, { copa, fase: "liga", rodada: r + 1, data: data(plano, copa, "liga", r), casa, fora });
    }
  });
  plano.ligas[copa] = { potes, ordem: null };
  plano.marcos[`${copa}:ligaFaltam`] = confrontos.length;
  marcar(plano, copa, "liga");
  for (const id of ids) creditar(plano, copa, id, "participacao", plano.premiacao[copa].participacao, `${copa}:liga`);
}

const ligaTerminou = (plano, copa) => plano.marcos[`${copa}:ligaFaltam`] === 0;

// Tabela da fase de liga (em andamento ou final), pelos critérios do pacote.
export function tabelaDaLiga(plano, copa) {
  const L = plano.ligas[copa];
  if (!L) return [];
  const linhas = new Map();
  for (const id of L.potes.flat()) linhas.set(S(id), { id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, gpFora: 0, vFora: 0, pts: 0, adv: [] });
  for (const j of plano.jogos) {
    if (j.copa !== copa || j.fase !== "liga") continue;
    const h = linhas.get(S(j.casa)), a = linhas.get(S(j.fora));
    h.adv.push(S(j.fora)); a.adv.push(S(j.casa));
    if (j.gh == null) continue;
    h.j++; a.j++; h.gp += j.gh; h.gc += j.ga; a.gp += j.ga; a.gc += j.gh; a.gpFora += j.ga;
    if (j.gh > j.ga) { h.v++; h.pts += 3; a.d++; } else if (j.gh < j.ga) { a.v++; a.vFora++; a.pts += 3; h.d++; } else { h.e++; a.e++; h.pts++; a.pts++; }
  }
  const lista = [...linhas.values()];
  for (const l of lista) {
    l.sg = l.gp - l.gc;
    l.ptsAdv = l.adv.reduce((s, x) => s + linhas.get(x).pts, 0);
    l.sgAdv = l.adv.reduce((s, x) => s + (linhas.get(x).gp - linhas.get(x).gc), 0);
    l.gpAdv = l.adv.reduce((s, x) => s + linhas.get(x).gp, 0);
  }
  lista.sort((x, y) => y.pts - x.pts || y.sg - x.sg || y.gp - x.gp || y.gpFora - x.gpFora || y.v - x.v || y.vFora - x.vFora
    || y.ptsAdv - x.ptsAdv || y.sgAdv - x.sgAdv || y.gpAdv - x.gpAdv || coef(plano, y.id) - coef(plano, x.id) || S(x.id).localeCompare(S(y.id)));
  return lista.map(({ adv, ...l }) => l);
}

// Playoff: blocos do pacote (9/10 x 23/24...): sorteio dentro do bloco; volta
// na casa do 9º ao 16º.
function criarPlayoff(plano, copa) {
  const ordem = tabelaDaLiga(plano, copa).map((l) => l.id);
  plano.ligas[copa].ordem = ordem;
  const mm = plano.regras[copa].mata_mata;
  const rng = rngDaChave(`${plano.chave}:${copa}:playoff`);
  const pos = (p) => ordem[p - 1];
  for (const [cima, baixo] of mm.playoff_blocos) {
    const b = embaralhar(baixo, rng);
    cima.forEach((p, i) => {
      const a = pos(p), x = pos(b[i]);
      criarDuelo(plano, copa, "playoff_mata_mata", a, x, x, { posicao: p });
    });
  }
  marcar(plano, copa, "playoff_mata_mata");
  for (const c of duelos(plano, copa, "playoff_mata_mata")) for (const id of [c.a, c.b]) creditar(plano, copa, id, "playoff_mata_mata", plano.premiacao[copa].playoff_mata_mata, `${copa}:playoff_mata_mata`);
}

// Oitavas: 1/2 x vencedores dos duelos do 15/16 (blocos do pacote); a volta
// na casa do 1º ao 8º. A posição do duelo (1–8) guia a chave.
function criarOitavas(plano, copa) {
  const ordem = plano.ligas[copa].ordem;
  const mm = plano.regras[copa].mata_mata;
  const rng = rngDaChave(`${plano.chave}:${copa}:oitavas`);
  const vencedorDoPlayoff = (p) => duelos(plano, copa, "playoff_mata_mata").find((c) => c.posicao === p).vencedor;
  for (const [cima, baixo] of mm.oitavas_blocos) {
    const b = embaralhar(baixo, rng);
    cima.forEach((p, i) => {
      const a = ordem[p - 1], x = vencedorDoPlayoff(b[i]);
      criarDuelo(plano, copa, "oitavas", a, x, x, { posicao: p });
    });
  }
  marcar(plano, copa, "oitavas");
  premiarFase(plano, copa, "oitavas");
}

// Árvore depois das oitavas (regra de jogo, sem o Anexo B no pacote).
const ARVORE = { quartas: [[1, 8], [4, 5], [2, 7], [3, 6]], semifinal: [[1, 4], [2, 3]] };
function criarChave(plano, copa, fase, ant) {
  const vem = duelos(plano, copa, ant);
  const porPos = (p) => vem.find((c) => c.posicao === p);
  for (const [p, q] of ARVORE[fase]) {
    const x = porPos(p), y = porPos(q);
    // A volta é de quem herdou a melhor posição (p < q).
    criarDuelo(plano, copa, fase, x.vencedor, y.vencedor, y.vencedor, { posicao: p });
  }
  marcar(plano, copa, fase);
  premiarFase(plano, copa, fase);
}
function criarFinal(plano, copa) {
  const [s1, s2] = duelos(plano, copa, "semifinal");
  const c = {
    id: `${copa}:final:${plano.confrontos.length + 1}`, copa, etapa: "final", a: s1.vencedor, b: s2.vencedor, pernas: 1, casaIda: s1.vencedor, neutro: true,
    resolucao: [R.AGREGADO, R.PRORROGACAO, R.PENALTIS], sementes: { [s1.vencedor]: 1, [s2.vencedor]: 2 }, pontosRegulares: { [s1.vencedor]: 0, [s2.vencedor]: 0 },
    semanaRel: 0, placares: [], vencedor: null, perdedor: null, como: null, extra: null, posicao: 1,
  };
  plano.confrontos.push(c);
  addJogo(plano, { copa, fase: "final", rodada: 1, data: data(plano, copa, "final", 0), casa: c.a, fora: c.b, conf: c.id, perna: 1, neutro: true });
  marcar(plano, copa, "final");
  premiarFase(plano, copa, "final");
}

// ---------- premiação ----------
function creditar(plano, copa, clube, tipo, valor, ref) {
  if (!(valor > 0)) return;
  const chave = `${copa}|${ref}|${S(clube)}|${tipo}`;
  if (plano.premios.some((p) => p.chave === chave)) return;
  plano.premios.push({ chave, copa, clube, tipo, valorEUR: valor });
}
function premiarFase(plano, copa, fase) {
  for (const c of duelos(plano, copa, fase)) for (const id of [c.a, c.b]) creditar(plano, copa, id, fase, plano.premiacao[copa][fase], `${copa}:${fase}`);
}
function premiarJogoDaLiga(plano, j) {
  const pr = plano.premiacao[j.copa];
  if (j.gh === j.ga) { creditar(plano, j.copa, j.casa, "empate", pr.empate, j.id); creditar(plano, j.copa, j.fora, "empate", pr.empate, j.id); }
  else creditar(plano, j.copa, j.gh > j.ga ? j.casa : j.fora, "vitoria", pr.vitoria, j.id);
}
export function premiosDoClube(plano, clube) {
  return plano.premios.filter((p) => S(p.clube) === S(clube));
}
