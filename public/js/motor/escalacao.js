/* ===================================================================
   MOTOR — ESCALAÇÃO (demanda FASE1-ESC, 12/11/2026)
   -------------------------------------------------------------------
   Regras da escalação confirmada (docs/carreira-v2/fase1/
   01_Requisitos_Escalacao.md, ESC-01 a ESC-05), num módulo puro: nada
   aqui lê CAREER, DOM, rede ou save. A troca manual da v2 (importada no
   build) e a orientação da comissão técnica (motor/ponte.js) usam a MESMA
   operação de troca (ESC "aplicar a orientação lateral usando a mesma
   operação de troca titular–reserva da escalação manual").

   - Escalação confirmada (ESC-01): 11 titulares e 11 reservas, todos
     distintos, do elenco, disponíveis, com pelo menos um goleiro
     disponível no banco.
   - Troca (ESC-02): promover um reserva leva o antigo titular para a vaga
     aberta no banco; formação e demais posições ficam como estão.
   - Recomposição (ESC-03): se a troca deixa o banco sem goleiro, propõe
     um goleiro disponível de fora da escalação no lugar de um reserva;
     sem candidato, explica o bloqueio. Nunca inventa atleta.
   - Pendências (ESC-03/04): a escalação em edição pode ter pendências
     visíveis (save antigo com banco menor, lesão nova); só a lista válida
     é confirmada.
=================================================================== */

export const TITULARES = 11;
export const RESERVAS = 11;

// Disponível na rodada: sem status, "ok", ou ausência já cumprida (mesma
// regra da v2, domain/lineup.ts isAvailable, e do refreshAvailability da
// versão anterior).
export function disponivel(p, rodada) {
  if (!p) return false;
  if (!p.status || p.status === "ok") return true;
  return p.outUntilRound != null && rodada > p.outUntilRound;
}

const ehGoleiro = (p) => !!p && p.group === "G";
const copia = (l) => ({ ...l, starters: [...(l.starters || [])], bench: [...(l.bench || [])] });

// Pendências da escalação (lista vazia = válida). Cada uma traz o tipo, os
// ids envolvidos e um texto para a tela.
export function validarEscalacao(lineup, elenco, rodada) {
  const l = copia(lineup || {});
  const porId = new Map((elenco || []).map((p) => [p.id, p]));
  const pend = [];
  const titulares = l.starters.filter(Boolean);
  if (l.starters.length !== TITULARES || titulares.length !== TITULARES) {
    pend.push({ tipo: "titulares-incompletos", ids: [], mensagem: `A escalação precisa de ${TITULARES} titulares.` });
  }
  const todos = [...titulares, ...l.bench];
  const repetidos = todos.filter((id, i) => todos.indexOf(id) !== i);
  if (repetidos.length) pend.push({ tipo: "repetido", ids: [...new Set(repetidos)], mensagem: "Um jogador aparece duas vezes na escalação." });
  const fora = todos.filter((id) => !porId.has(id));
  if (fora.length) pend.push({ tipo: "fora-do-elenco", ids: fora, mensagem: "A escalação tem jogador que não está mais no elenco." });
  const titInd = titulares.filter((id) => porId.has(id) && !disponivel(porId.get(id), rodada));
  if (titInd.length) pend.push({ tipo: "titular-indisponivel", ids: titInd, mensagem: "Há titular lesionado ou suspenso." });
  const resInd = l.bench.filter((id) => porId.has(id) && !disponivel(porId.get(id), rodada));
  if (resInd.length) pend.push({ tipo: "reserva-indisponivel", ids: resInd, mensagem: "Há reserva lesionado ou suspenso." });
  if (l.bench.length !== RESERVAS) {
    pend.push({ tipo: "banco-incompleto", ids: [], faltam: RESERVAS - l.bench.length, mensagem: `O banco precisa de ${RESERVAS} reservas (tem ${l.bench.length}).` });
  }
  if (!l.bench.some((id) => ehGoleiro(porId.get(id)) && disponivel(porId.get(id), rodada))) {
    pend.push({ tipo: "banco-sem-goleiro", ids: [], mensagem: "O banco precisa de um goleiro disponível." });
  }
  // Decisão do Murilo (12/11): sem goleiro titular disponível o jogo não começa.
  if (!titulares.some((id) => ehGoleiro(porId.get(id)) && disponivel(porId.get(id), rodada))) {
    pend.push({ tipo: "sem-goleiro-titular", ids: [], mensagem: "Os titulares precisam de um goleiro disponível." });
  }
  return { valida: pend.length === 0, pendencias: pend };
}

// Início do jogo (decisão do Murilo, 12/11/2026): a partida só começa com
// a escalação válida (11 titulares + 11 reservas, todos disponíveis, goleiro
// entre os titulares e no banco). Devolve null (pode começar) ou o motivo.
export function bloqueioInicio(lineup, elenco, rodada) {
  const v = validarEscalacao(lineup, elenco, rodada);
  return v.valida ? null : { motivo: "escalacao", pendencias: v.pendencias };
}

// "Completar automaticamente" (bloqueio do início): corrige só as vagas com
// problema e mantém o resto como o técnico deixou.
// - tira da escalação quem saiu do elenco, quem aparece repetido e quem está
//   lesionado ou suspenso;
// - põe um goleiro disponível no gol se não houver (a vaga de goleiro da
//   formação, `grupos`, ou a 1ª);
// - preenche cada vaga titular vazia com o melhor disponível do grupo da
//   vaga (do banco ou de fora), depois de qualquer grupo;
// - completa o banco até 11, com goleiro, com os melhores de fora.
// Prefere o elenco principal (e emprestados) à base, como a escalação
// automática. Nunca inventa atleta: com elenco curto, sobra pendência.
// `grupos`: o grupo de cada vaga da formação ("G", "D", "M", "F").
// Devolve { lineup, mudou, valida, pendencias }.
export function completarEscalacao(lineup, elenco, rodada, grupos) {
  const l = copia(lineup || {});
  const porId = new Map((elenco || []).map((p) => [p.id, p]));
  const ok = (id) => porId.has(id) && disponivel(porId.get(id), rodada);
  const antes = JSON.stringify([l.starters, l.bench]);
  const vistos = new Set();
  const manter = (id) => { if (!id || !ok(id) || vistos.has(id)) return false; vistos.add(id); return true; };
  l.starters = Array.from({ length: TITULARES }, (_, i) => (manter(l.starters[i]) ? l.starters[i] : null));
  l.bench = l.bench.filter(manter);
  const base = (p) => (p.origin === "base" ? 1 : 0);
  const ordem = (a, b) => base(a) - base(b) || (b.overall || 0) - (a.overall || 0);
  const livres = (grp) => (elenco || []).filter((p) => disponivel(p, rodada) && !l.starters.includes(p.id) && (!grp || p.group === grp)).sort(ordem);
  const tirarDoBanco = (id) => { l.bench = l.bench.filter((x) => x !== id); };
  const vagaDoGol = Math.max(0, (grupos || []).indexOf("G"));
  // Goleiro titular.
  if (!l.starters.some((id) => id && ehGoleiro(porId.get(id)))) {
    const g = livres("G")[0];
    if (g) {
      const vaga = l.starters[vagaDoGol] == null ? vagaDoGol : l.starters.findIndex((id) => id == null);
      const alvo = vaga >= 0 ? vaga : vagaDoGol;
      const sai = l.starters[alvo];
      tirarDoBanco(g.id);
      l.starters[alvo] = g.id;
      if (sai && l.bench.length < RESERVAS) l.bench.push(sai);
    }
  }
  // Vagas titulares vazias.
  l.starters.forEach((id, i) => {
    if (id) return;
    const grp = (grupos || [])[i];
    const p = (grp && livres(grp)[0]) || livres(null).filter((x) => !ehGoleiro(x))[0] || livres(null)[0];
    if (p) { tirarDoBanco(p.id); l.starters[i] = p.id; }
  });
  // Banco: goleiro e depois até 11.
  const naEscalacao = () => new Set([...l.starters.filter(Boolean), ...l.bench]);
  const deFora = (grp) => (elenco || []).filter((p) => disponivel(p, rodada) && !naEscalacao().has(p.id) && (!grp || p.group === grp)).sort(ordem);
  if (!l.bench.some((id) => ehGoleiro(porId.get(id)))) {
    const g = deFora("G")[0];
    if (g) {
      if (l.bench.length >= RESERVAS) {
        const sai = l.bench.map((id) => porId.get(id)).filter((p) => !ehGoleiro(p)).sort((a, b) => (a.overall || 0) - (b.overall || 0))[0];
        if (sai) tirarDoBanco(sai.id);
      }
      if (l.bench.length < RESERVAS) l.bench.push(g.id);
    }
  }
  // Banco maior que 11 (save muito antigo): saem os reservas de linha de menor overall.
  while (l.bench.length > RESERVAS) {
    const temOutroGoleiro = (id) => l.bench.some((x) => x !== id && ehGoleiro(porId.get(x)));
    const sai = l.bench.map((id) => porId.get(id)).filter((p) => !ehGoleiro(p) || temOutroGoleiro(p.id)).sort((a, b) => (a.overall || 0) - (b.overall || 0))[0];
    tirarDoBanco(sai.id);
  }
  while (l.bench.length < RESERVAS) {
    const p = deFora(null)[0];
    if (!p) break;
    l.bench.push(p.id);
  }
  const v = validarEscalacao(l, elenco, rodada);
  return { lineup: l, mudou: JSON.stringify([l.starters, l.bench]) !== antes, valida: v.valida, pendencias: v.pendencias };
}

// Onde está o jogador na escalação.
function localizar(l, id) {
  if (!id) return null;
  const t = l.starters.indexOf(id);
  if (t >= 0) return { tipo: "titular", idx: t };
  const r = l.bench.indexOf(id);
  return r >= 0 ? { tipo: "reserva", idx: r } : null;
}
function colocar(l, loc, id) {
  if (loc.tipo === "titular") l.starters[loc.idx] = id;
  else if (id) l.bench[loc.idx] = id;
  else l.bench.splice(loc.idx, 1);
}

// Troca titular–reserva (ESC-02), a mesma operação da escalação manual e
// da orientação da comissão. `alvo`: { tipo: "titular", vaga },
// { tipo: "reserva", id } ou { tipo: "banco-vazio" }. `saiEsperado`: quem estava no alvo quando a
// tela (ou a sugestão) foi montada; se mudou, devolve conflito sem tocar
// em nada (sugestão vencida, outra aba, toque repetido). Quem entra vindo
// do banco deixa a vaga para quem sai; quem entra de fora da escalação
// tira quem sai da escalação. Devolve { lineup } (cópia) ou { conflito }.
export function trocar(lineup, elenco, rodada, { alvo, saiEsperado, entraId }) {
  const l = copia(lineup || {});
  // Vaga vazia no banco (save antigo com banco menor, ESC-04): só entra
  // jogador de FORA da escalação (tirar um titular abriria outra vaga).
  if (alvo && alvo.tipo === "banco-vazio") {
    const entra = (elenco || []).find((p) => p.id === entraId);
    if (l.bench.length >= RESERVAS) return { conflito: "O banco já está completo." };
    if (!entra) return { conflito: "Esse jogador não está mais no elenco." };
    if (!disponivel(entra, rodada)) return { conflito: "Esse jogador está lesionado ou suspenso." };
    if (localizar(l, entraId)) return { conflito: "Esse jogador já está na escalação." };
    l.bench.push(entraId);
    return { lineup: l };
  }
  const loc = alvo && alvo.tipo === "titular" ? (alvo.vaga >= 0 && alvo.vaga < l.starters.length ? { tipo: "titular", idx: alvo.vaga } : null) : localizar(l, alvo && alvo.id);
  if (!loc) return { conflito: "A escalação mudou. Revise e tente de novo." };
  const sai = loc.tipo === "titular" ? l.starters[loc.idx] || null : l.bench[loc.idx];
  const entra = (elenco || []).find((p) => p.id === entraId);
  if (sai !== (saiEsperado ?? null)) return { conflito: "A escalação mudou. Revise e tente de novo." };
  if (!entra) return { conflito: "Esse jogador não está mais no elenco." };
  if (!disponivel(entra, rodada)) return { conflito: "Esse jogador está lesionado ou suspenso." };
  const origem = localizar(l, entraId);
  if (origem && origem.tipo === loc.tipo && origem.idx === loc.idx) return { lineup: l }; // já está lá
  if (origem) colocar(l, origem, sai);
  colocar(l, loc, entraId);
  return { lineup: l };
}

// Recomposição do banco (ESC-03): sem goleiro disponível no banco, propõe
// o melhor goleiro disponível de FORA da escalação (nunca um titular nem
// atleta inventado), no lugar do reserva indisponível ou, se não houver,
// do reserva de linha de menor overall; com banco incompleto, só entra.
// Devolve null (banco já tem goleiro), { entra, sai } ou { bloqueio }.
export function recomposicaoGoleiro(lineup, elenco, rodada) {
  const l = copia(lineup || {});
  const porId = new Map((elenco || []).map((p) => [p.id, p]));
  if (l.bench.some((id) => ehGoleiro(porId.get(id)) && disponivel(porId.get(id), rodada))) return null;
  const na = new Set([...l.starters.filter(Boolean), ...l.bench]);
  const candidato = (elenco || []).filter((p) => ehGoleiro(p) && disponivel(p, rodada) && !na.has(p.id))
    .sort((a, b) => (b.overall || 0) - (a.overall || 0))[0];
  if (!candidato) {
    return { bloqueio: "sem-goleiro", mensagem: "Não há goleiro disponível fora da escalação para o banco. Desfaça a troca ou recupere um goleiro antes de confirmar." };
  }
  if (l.bench.length < RESERVAS) return { entra: candidato.id, sai: null };
  const reservas = l.bench.map((id) => porId.get(id)).filter(Boolean);
  const sai = reservas.find((p) => !disponivel(p, rodada))
    || reservas.filter((p) => !ehGoleiro(p)).sort((a, b) => (a.overall || 0) - (b.overall || 0))[0];
  return sai ? { entra: candidato.id, sai: sai.id } : { bloqueio: "sem-vaga", mensagem: "Não há reserva para dar lugar ao goleiro." };
}

// Aplica uma recomposição proposta (cópia). Confere que ela ainda vale.
export function aplicarRecomposicao(lineup, elenco, rodada, { entra, sai }) {
  const l = copia(lineup || {});
  const p = (elenco || []).find((x) => x.id === entra);
  if (!p || !ehGoleiro(p) || !disponivel(p, rodada) || l.starters.includes(entra) || l.bench.includes(entra)) {
    return { conflito: "A sugestão de goleiro não vale mais. Revise e tente de novo." };
  }
  if (sai == null) {
    if (l.bench.length >= RESERVAS) return { conflito: "O banco já está completo." };
    l.bench.push(entra);
    return { lineup: l };
  }
  const i = l.bench.indexOf(sai);
  if (i < 0) return { conflito: "A sugestão de goleiro não vale mais. Revise e tente de novo." };
  l.bench[i] = entra;
  return { lineup: l };
}

// Troca + recomposição numa operação só (confirmação conjunta, ESC-03):
// aplica a troca; se ela tirou o goleiro disponível do banco, aplica a
// recomposição pedida (`recomposicao`) ou devolve a proposta sem gravar
// nada. Sem goleiro para recompor: bloqueia se a escalação era válida
// (a troca a quebraria); se já tinha pendência, a troca passa e a
// pendência continua visível (a edição pode ter pendências).
// Devolve { lineup, valida } | { precisaRecompor, proposta } | { bloqueio } | { conflito }.
export function trocarComRecomposicao(lineup, elenco, rodada, pedido) {
  const t = trocar(lineup, elenco, rodada, pedido);
  if (t.conflito) return t;
  let l = t.lineup;
  const antesTinhaGoleiro = !recomposicaoGoleiro(lineup, elenco, rodada);
  const prop = recomposicaoGoleiro(l, elenco, rodada);
  if (prop && antesTinhaGoleiro) {
    if (prop.bloqueio) {
      if (validarEscalacao(lineup, elenco, rodada).valida) return { bloqueio: prop.bloqueio, mensagem: prop.mensagem };
      return { lineup: l, valida: false };
    }
    const pedida = pedido.recomposicao;
    if (!pedida) return { precisaRecompor: true, proposta: prop };
    const r = aplicarRecomposicao(l, elenco, rodada, pedida);
    if (r.conflito) return r;
    l = r.lineup;
  }
  return { lineup: l, valida: validarEscalacao(l, elenco, rodada).valida };
}
