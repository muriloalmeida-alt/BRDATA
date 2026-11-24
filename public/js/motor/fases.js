/* ===================================================================
   MOTOR — FASES DE FIM DE TEMPORADA (MUNDO-001, etapa M3, 24/11/2026)
   -------------------------------------------------------------------
   Playoffs de acesso, playout, jogos de decisão e confrontos entre
   divisões das ligas europeias, pelo regulamento do pacote (regras de
   cada liga em mundo.json; texto em docs/mundo/pacotes/europa/
   01_Regulamentos_e_Calendario.md).

   Módulo puro e serializável: o "plano" do país é um objeto JSON que vai
   no save e avança perna a perna, no relógio do mundo (relogio.js):
   - montarPosTemporada: monta o plano quando a fase regular das duas
     divisões do país acabou (ordem final de cada uma, já desempatada por
     desempate.js);
   - pernasPendentes: as pernas que podem ser jogadas agora, cada uma com
     a semana relativa (1 = a primeira semana depois do fim da fase
     regular), mandante e se é em campo neutro;
   - registrarPerna: grava o placar; na última perna de um confronto
     empatado, aplica a resolução do regulamento (agregado, pontos na
     eliminatória, prorrogação, pênaltis, melhor campanha), chamando o
     simulador só para a prorrogação e os pênaltis;
   - resultado: campeão, quem sobe e quem desce de cada divisão. A troca de
     clubes entre divisões e o catálogo de 3ª divisão são da virada (M5).

   Não decide quem é elegível: recebe `reservas` (clubes B, que não sobem)
   e o representante da 3ª divisão nos confrontos entre divisões
   (Alemanha e França), sorteado pela virada (M5).
=================================================================== */

// Resoluções de empate (fim do tempo normal da última perna):
const R = {
  AGREGADO: "agregado",
  PONTOS: "pontos", // pontos na eliminatória (Itália)
  PRORROGACAO: "prorrogacao",
  PENALTIS: "penaltis",
  CAMPANHA: "campanha", // melhor colocado na fase regular
  // Itália (final e playout da B): pontos iguais na fase regular ->
  // prorrogação e pênaltis; senão, melhor colocado.
  CAMPANHA_OU_PRORROGACAO: "campanha_ou_prorrogacao",
};

function novoConfronto(plano, etapa, a, b, o) {
  const id = `${etapa}:${plano.confrontos.length + 1}`;
  // Ida e volta: a volta é na casa de `mandoVolta`. Jogo único: na casa de
  // `mando` ou em campo neutro.
  const casaIda = o.pernas === 2 ? (o.mandoVolta === a ? b : a) : (o.neutro ? a : (o.mando ?? a));
  const c = {
    id, etapa, divisao: o.divisao, a, b, pernas: o.pernas, casaIda, neutro: !!o.neutro,
    resolucao: o.resolucao, sementes: { [a]: o.sementes[a], [b]: o.sementes[b] },
    pontosRegulares: { [a]: o.pontosRegulares[a], [b]: o.pontosRegulares[b] },
    semanaRel: o.semanaRel, placares: [], vencedor: null, perdedor: null, como: null, extra: null,
  };
  plano.confrontos.push(c);
  return c;
}

function mandanteDaPerna(c, i) {
  if (i === 0) return c.casaIda;
  return c.casaIda === c.a ? c.b : c.a;
}

// ---------- montar ----------

const posicao = (ordem, pos) => ordem[pos - 1];

// Contexto de uma divisão: ordem (ids, 1º primeiro), pontos por id,
// semente (posição) por id e a lista dos elegíveis para subir.
function divisao(comp, ordem, pontos, reservas) {
  const sementes = Object.fromEntries(ordem.map((id, i) => [id, i + 1]));
  return { comp, ordem, pontos, sementes, elegiveis: ordem.filter((id) => !reservas.has(String(id))) };
}

// plano = montarPosTemporada({ pais, comps: [d1, d2], ordens: { comp: [ids] },
//   pontos: { comp: { id: pts } }, reservas: [ids], representanteTerceira, chave })
export function montarPosTemporada(o) {
  const [c1, c2] = o.comps;
  const reservas = new Set((o.reservas || []).map(String));
  const D1 = divisao(c1, o.ordens[c1.id], o.pontos[c1.id], reservas);
  const D2 = divisao(c2, o.ordens[c2.id], o.pontos[c2.id], reservas);
  const plano = {
    pais: o.pais, chave: o.chave || "", d1: c1.id, d2: c2.id,
    ordens: { [c1.id]: D1.ordem, [c2.id]: D2.ordem },
    confrontos: [], passos: [], fixos: { campeao: {}, sobem: { [c2.id]: [], terceira: [] }, descem: { [c1.id]: [], [c2.id]: [] } },
    representanteTerceira: o.representanteTerceira ?? null,
  };
  const r1 = c1.regras || {}, r2 = c2.regras || {};

  // ---- 1ª divisão: título, queda direta, decisões (Itália), barrage ----
  plano.fixos.campeao[c1.id] = posicao(D1.ordem, 1);
  const quedaD1 = new Set(r1.down || []);
  for (const d of r1.decisionMatches || []) {
    const [p1, p2] = d.positions;
    const x = posicao(D1.ordem, p1), y = posicao(D1.ordem, p2);
    if (d.ifEqualPoints && D1.pontos[x] === D1.pontos[y]) {
      // Decisão: a ordem já põe na frente o melhor do confronto direto, que
      // é o mandante (jogo único) ou recebe a volta.
      const titulo = p1 === 1;
      if (titulo) delete plano.fixos.campeao[c1.id];
      if (!titulo) quedaD1.delete(p2);
      novoConfronto(plano, titulo ? "decisao-titulo" : "decisao-queda", x, y, {
        divisao: c1.id, pernas: d.legs, mando: x, mandoVolta: x, semanaRel: 1,
        resolucao: titulo ? [R.PENALTIS] : [R.AGREGADO, R.PENALTIS],
        sementes: D1.sementes, pontosRegulares: D1.pontos,
      });
    }
  }
  for (const p of [...quedaD1].sort((a, b) => a - b)) plano.fixos.descem[c1.id].push(posicao(D1.ordem, p));

  // ---- 2ª divisão: campeão, acesso direto (elegíveis), queda direta ----
  plano.fixos.campeao[c2.id] = posicao(D2.ordem, 1); // título honorífico, mesmo de clube B
  const diretos = (r2.up || []).length;
  plano.fixos.sobem[c2.id].push(...D2.elegiveis.slice(0, diretos));
  const quedaD2 = new Set(r2.down || []);

  const pp = r2.promotionPlayoff;
  const ip1 = r1.interDivisionPlayoff;
  const ip2 = r2.interDivisionPlayoff;
  // Semente no playoff: posição entre os elegíveis restantes (3 = o 1º depois
  // dos que subiram direto), como manda a regra espanhola de reposição.
  const restantes = D2.elegiveis.slice(diretos);
  const sementePlayoff = (pos) => restantes[pos - diretos - 1];

  if (pp && pp.skipIfThirdAheadOfFourthByMoreThan != null) {
    // Itália: 3º sobe direto se abrir mais de 14 pontos sobre o 4º.
    const t = sementePlayoff(3), q = sementePlayoff(4);
    if (D2.pontos[t] - D2.pontos[q] > pp.skipIfThirdAheadOfFourthByMoreThan) {
      plano.fixos.sobem[c2.id].push(t);
      plano.passos.push({ tipo: "italia-terceiro-direto", id: t });
    } else plano.passos.push({ tipo: "playoff", formato: "italia" });
  } else if (pp && pp.eliminators && pp.semifinalByes && pp.finalVenue) {
    plano.passos.push({ tipo: "playoff", formato: "efl" });
  } else if (pp && pp.semifinals && !pp.eliminators) {
    plano.passos.push({ tipo: "playoff", formato: "espanha" });
  } else if (pp && pp.qualifier) {
    plano.passos.push({ tipo: "playoff", formato: "franca" });
  }

  // Playout da B italiana: 16º x 17º se a diferença for de até 4 pontos.
  const po = r2.relegationPlayout;
  if (po) {
    const p16 = posicao(D2.ordem, po.positions[0]), p17 = posicao(D2.ordem, po.positions[1]);
    if (D2.pontos[p16] - D2.pontos[p17] > po.directRelegationOf17thIfGapAbove) quedaD2.add(po.positions[1]);
    else {
      novoConfronto(plano, "playout", p16, p17, {
        divisao: c2.id, pernas: 2, mandoVolta: p16, semanaRel: 1,
        resolucao: [R.PONTOS, R.AGREGADO, R.CAMPANHA_OU_PRORROGACAO],
        sementes: D2.sementes, pontosRegulares: D2.pontos,
      });
    }
  }
  for (const p of [...quedaD2].sort((a, b) => a - b)) plano.fixos.descem[c2.id].push(posicao(D2.ordem, p));

  // Barrage 1ª x 2ª (Alemanha: 16º x 3º elegível; França: 16º x vencedor do
  // playoff da L2, montado depois do playoff).
  if (ip1) {
    const de16 = posicao(D1.ordem, ip1.upperPosition);
    if (ip1.lowerPosition) {
      const terceiro = restantes[0];
      plano.passos.push({ tipo: "barrage-d1", alto: de16, baixo: terceiro });
    } else plano.passos.push({ tipo: "barrage-d1-apos-playoff", alto: de16 });
  }
  // Barrage 2ª x catálogo de 3ª (Alemanha e França).
  if (ip2 && plano.representanteTerceira != null) {
    plano.passos.push({ tipo: "barrage-d2", alto: posicao(D2.ordem, ip2.upperPosition) });
  } else if (ip2) {
    // Sem representante (catálogo sem elegível): o 16º fica.
    plano.passos.push({ tipo: "barrage-d2-sem-representante" });
  }

  plano.D = { [c1.id]: { pontos: D1.pontos, sementes: D1.sementes }, [c2.id]: { pontos: D2.pontos, sementes: D2.sementes } };
  plano.restantes = restantes;
  avancar(plano);
  return plano;
}

// Cria as etapas que já podem existir (as que dependem só do que acabou).
function avancar(plano) {
  const d1 = plano.d1, d2 = plano.d2;
  const S2 = plano.D[d2].sementes, P2 = plano.D[d2].pontos;
  const S1 = plano.D[d1].sementes, P1 = plano.D[d1].pontos;
  const sem = (...ids) => Object.fromEntries(ids.map((id) => [id, S2[id] ?? S1[id] ?? 99]));
  const pts = (...ids) => Object.fromEntries(ids.map((id) => [id, P2[id] ?? P1[id] ?? 0]));
  const r = plano.restantes; // elegíveis do playoff, em ordem (semente 3 = r[0])
  const etapa = (nome) => plano.confrontos.filter((c) => c.etapa === nome);
  const pronta = (nome) => etapa(nome).length > 0 && etapa(nome).every((c) => c.vencedor != null);
  const criada = (nome) => etapa(nome).length > 0;
  const ultimaSemana = () => Math.max(0, ...plano.confrontos.map((c) => c.semanaRel + c.pernas - 1));
  const playoff = plano.passos.find((p) => p.tipo === "playoff");

  if (playoff && !criada("pp-1")) {
    const f = playoff.formato;
    if (f === "efl" || f === "italia") {
      // Eliminatórias em jogo único na casa do melhor: 5º x 8º e 6º x 7º.
      for (const [x, y] of [[r[2], r[5]], [r[3], r[4]]]) {
        novoConfronto(plano, "pp-1", x, y, { divisao: d2, pernas: 1, mando: x, semanaRel: 1,
          resolucao: f === "efl" ? [R.AGREGADO, R.PRORROGACAO, R.PENALTIS] : [R.AGREGADO, R.PRORROGACAO, R.CAMPANHA],
          sementes: sem(x, y), pontosRegulares: pts(x, y) });
      }
    } else if (f === "espanha") {
      for (const [x, y] of [[r[0], r[3]], [r[1], r[2]]]) {
        novoConfronto(plano, "pp-1", x, y, { divisao: d2, pernas: 2, mandoVolta: x, semanaRel: 1,
          resolucao: [R.AGREGADO, R.PRORROGACAO, R.CAMPANHA], sementes: sem(x, y), pontosRegulares: pts(x, y) });
      }
    } else if (f === "franca") {
      // 4º x 5º em jogo único na casa do 4º; empate vai aos pênaltis.
      novoConfronto(plano, "pp-1", r[1], r[2], { divisao: d2, pernas: 1, mando: r[1], semanaRel: 1,
        resolucao: [R.AGREGADO, R.PENALTIS], sementes: sem(r[1], r[2]), pontosRegulares: pts(r[1], r[2]) });
    }
  }
  if (playoff && pronta("pp-1") && !criada("pp-2") && !criada("pp-final")) {
    const f = playoff.formato;
    const venc = etapa("pp-1").map((c) => c.vencedor);
    const s = ultimaSemana() + 1;
    if (f === "efl") {
      // 3º enfrenta o vencedor pior colocado; 4º, o outro. Volta na casa do melhor.
      const [pior, melhor] = [...venc].sort((x, y) => S2[y] - S2[x]);
      for (const [x, y] of [[r[0], pior], [r[1], melhor]]) {
        novoConfronto(plano, "pp-2", x, y, { divisao: d2, pernas: 2, mandoVolta: x, semanaRel: s,
          resolucao: [R.AGREGADO, R.PRORROGACAO, R.PENALTIS], sementes: sem(x, y), pontosRegulares: pts(x, y) });
      }
    } else if (f === "italia") {
      // 3º x vencedor de 6º x 7º; 4º x vencedor de 5º x 8º.
      const v58 = etapa("pp-1")[0].vencedor, v67 = etapa("pp-1")[1].vencedor;
      for (const [x, y] of [[r[0], v67], [r[1], v58]]) {
        novoConfronto(plano, "pp-2", x, y, { divisao: d2, pernas: 2, mandoVolta: x, semanaRel: s,
          resolucao: [R.PONTOS, R.AGREGADO, R.CAMPANHA], sementes: sem(x, y), pontosRegulares: pts(x, y) });
      }
    } else if (f === "espanha") {
      const [x, y] = [...venc].sort((p, q) => S2[p] - S2[q]);
      novoConfronto(plano, "pp-final", x, y, { divisao: d2, pernas: 2, mandoVolta: x, semanaRel: s,
        resolucao: [R.AGREGADO, R.PRORROGACAO, R.CAMPANHA], sementes: sem(x, y), pontosRegulares: pts(x, y) });
    } else if (f === "franca") {
      // O 3º recebe o vencedor em jogo único.
      novoConfronto(plano, "pp-final", r[0], venc[0], { divisao: d2, pernas: 1, mando: r[0], semanaRel: s,
        resolucao: [R.AGREGADO, R.PENALTIS], sementes: sem(r[0], venc[0]), pontosRegulares: pts(r[0], venc[0]) });
    }
  }
  if (playoff && (playoff.formato === "efl" || playoff.formato === "italia") && pronta("pp-2") && !criada("pp-final")) {
    const [x, y] = etapa("pp-2").map((c) => c.vencedor).sort((p, q) => S2[p] - S2[q]);
    const s = ultimaSemana() + 1;
    if (playoff.formato === "efl") {
      novoConfronto(plano, "pp-final", x, y, { divisao: d2, pernas: 1, neutro: true, semanaRel: s,
        resolucao: [R.AGREGADO, R.PRORROGACAO, R.PENALTIS], sementes: sem(x, y), pontosRegulares: pts(x, y) });
    } else {
      novoConfronto(plano, "pp-final", x, y, { divisao: d2, pernas: 2, mandoVolta: x, semanaRel: s,
        resolucao: [R.PONTOS, R.AGREGADO, R.CAMPANHA_OU_PRORROGACAO], sementes: sem(x, y), pontosRegulares: pts(x, y) });
    }
  }

  // Barrage 1ª x 2ª.
  for (const p of plano.passos) {
    if (p.tipo === "barrage-d1" && !criada("barrage-d1")) {
      novoBarrage(plano, "barrage-d1", p.alto, p.baixo, 1, d1);
    }
    if (p.tipo === "barrage-d1-apos-playoff" && pronta("pp-final") && !criada("barrage-d1")) {
      novoBarrage(plano, "barrage-d1", p.alto, etapa("pp-final")[0].vencedor, ultimaSemana() + 1, d1);
    }
    if (p.tipo === "barrage-d2" && !criada("barrage-d2")) {
      novoBarrage(plano, "barrage-d2", p.alto, plano.representanteTerceira, 1, d2);
    }
  }
}

function novoBarrage(plano, etapa, alto, baixo, semanaRel, divisaoAlta) {
  const S = plano.D[divisaoAlta].sementes;
  // Volta na casa do clube da divisão de cima (França: o 16º; Alemanha: o
  // regulamento usa o menor descanso, que na simulação é igual para os dois,
  // e depois sorteio; o jogo usa o sorteio pela chave do plano).
  let mandoVolta = alto;
  if (plano.pais === "DE") mandoVolta = sorteio(`${plano.chave}:${etapa}`) < 0.5 ? alto : baixo;
  novoConfronto(plano, etapa, alto, baixo, {
    divisao: divisaoAlta, pernas: 2, mandoVolta, semanaRel,
    resolucao: [R.AGREGADO, R.PRORROGACAO, R.PENALTIS],
    sementes: { [alto]: S[alto], [baixo]: 99 }, pontosRegulares: { [alto]: 0, [baixo]: 0 },
  });
}

function sorteio(chave) {
  let h = 2166136261;
  for (const c of String(chave)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

// ---------- jogar ----------

export function pernasPendentes(plano) {
  const out = [];
  for (const c of plano.confrontos) {
    if (c.vencedor != null) continue;
    const i = c.placares.length;
    const casa = mandanteDaPerna(c, i);
    out.push({ confronto: c.id, etapa: c.etapa, perna: i + 1, pernas: c.pernas, casa, fora: casa === c.a ? c.b : c.a, neutro: c.neutro, semanaRel: c.semanaRel + i });
  }
  return out.sort((x, y) => x.semanaRel - y.semanaRel || x.confronto.localeCompare(y.confronto));
}

// placar = { gh, ga } do tempo normal, do ponto de vista do mandante da perna.
// sim = { prorrogacao({ casa, fora, neutro }) -> { gh, ga }, penaltis({ casa, fora }) -> id }.
export function registrarPerna(plano, confrontoId, placar, sim) {
  const c = plano.confrontos.find((x) => x.id === confrontoId);
  if (!c) throw new Error(`fases: confronto inexistente ${confrontoId}`);
  if (c.vencedor != null) throw new Error(`fases: confronto já decidido ${confrontoId}`);
  const i = c.placares.length;
  const casa = mandanteDaPerna(c, i);
  c.placares.push({ casa, fora: casa === c.a ? c.b : c.a, gh: placar.gh, ga: placar.ga });
  if (c.placares.length === c.pernas) decidir(c, sim);
  avancar(plano);
  return c;
}

function decidir(c, sim) {
  const gols = { [c.a]: 0, [c.b]: 0 }, pts = { [c.a]: 0, [c.b]: 0 };
  for (const p of c.placares) {
    gols[p.casa] += p.gh; gols[p.fora] += p.ga;
    if (p.gh > p.ga) pts[p.casa] += 3; else if (p.gh < p.ga) pts[p.fora] += 3; else { pts[p.casa]++; pts[p.fora]++; }
  }
  const ultima = c.placares[c.placares.length - 1];
  const fim = (venc, como) => { c.vencedor = venc; c.perdedor = venc === c.a ? c.b : c.a; c.como = como; };
  const prorrogar = () => {
    const pr = sim.prorrogacao({ casa: ultima.casa, fora: ultima.fora, neutro: c.neutro });
    c.extra = { ...(c.extra || {}), prorrogacao: pr };
    gols[ultima.casa] += pr.gh; gols[ultima.fora] += pr.ga;
  };
  const penaltis = () => {
    const v = sim.penaltis({ casa: ultima.casa, fora: ultima.fora });
    if (v !== c.a && v !== c.b) throw new Error(`fases: vencedor dos pênaltis fora do confronto (${v})`);
    c.extra = { ...(c.extra || {}), penaltis: v };
    return v;
  };
  const melhorCampanha = () => (c.sementes[c.a] <= c.sementes[c.b] ? c.a : c.b);
  for (const r of c.resolucao) {
    if (r === R.AGREGADO && gols[c.a] !== gols[c.b]) return fim(gols[c.a] > gols[c.b] ? c.a : c.b, c.pernas === 2 ? "agregado" : "placar");
    if (r === R.PONTOS && pts[c.a] !== pts[c.b]) return fim(pts[c.a] > pts[c.b] ? c.a : c.b, "pontos");
    if (r === R.PRORROGACAO) {
      prorrogar();
      if (gols[c.a] !== gols[c.b]) return fim(gols[c.a] > gols[c.b] ? c.a : c.b, "prorrogacao");
    }
    if (r === R.PENALTIS) return fim(penaltis(), "penaltis");
    if (r === R.CAMPANHA) return fim(melhorCampanha(), "campanha");
    if (r === R.CAMPANHA_OU_PRORROGACAO) {
      if (c.pontosRegulares[c.a] !== c.pontosRegulares[c.b]) return fim(melhorCampanha(), "campanha");
      prorrogar();
      if (gols[c.a] !== gols[c.b]) return fim(gols[c.a] > gols[c.b] ? c.a : c.b, "prorrogacao");
      return fim(penaltis(), "penaltis");
    }
  }
  throw new Error(`fases: confronto ${c.id} sem decisão (resolução ${c.resolucao.join(",")})`);
}

export function concluido(plano) {
  return pernasPendentes(plano).length === 0;
}

// Joga tudo de uma vez (testes e pré-simulação). sim.jogar({ casa, fora, neutro }) -> { gh, ga }.
export function jogarTudo(plano, sim) {
  for (let guarda = 0; guarda < 100 && !concluido(plano); guarda++) {
    const [p] = pernasPendentes(plano);
    registrarPerna(plano, p.confronto, sim.jogar(p), sim);
  }
  if (!concluido(plano)) throw new Error("fases: plano não termina");
  return resultado(plano);
}

// { campeao: { liga: id }, sobem: { d2: [ids], terceira: [ids] },
//   descem: { d1: [ids], d2: [ids] } }. "sobem.terceira" = representante do
// catálogo que ganhou o barrage (sobe para a 2ª).
export function resultado(plano) {
  if (!concluido(plano)) throw new Error("fases: plano ainda em andamento");
  const out = JSON.parse(JSON.stringify(plano.fixos));
  const d1 = plano.d1, d2 = plano.d2;
  const um = (etapa) => plano.confrontos.find((c) => c.etapa === etapa) || null;
  const dt = um("decisao-titulo");
  if (dt) out.campeao[d1] = dt.vencedor;
  const dq = um("decisao-queda");
  if (dq) out.descem[d1].push(dq.perdedor);
  const fin = um("pp-final");
  const temBarrageAposPlayoff = plano.passos.some((p) => p.tipo === "barrage-d1-apos-playoff");
  if (fin && !temBarrageAposPlayoff) out.sobem[d2].push(fin.vencedor);
  const po = um("playout");
  if (po) out.descem[d2].push(po.perdedor);
  const b1 = um("barrage-d1");
  if (b1 && b1.vencedor !== b1.a) { out.descem[d1].push(b1.a); out.sobem[d2].push(b1.b); }
  const b2 = um("barrage-d2");
  if (b2 && b2.vencedor !== b2.a) { out.descem[d2].push(b2.a); out.sobem.terceira.push(b2.b); }
  for (const k of [d1, d2]) out.descem[k] = [...new Set(out.descem[k])];
  return out;
}

export const RESOLUCOES = R;
