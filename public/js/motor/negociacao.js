/* ===================================================================
   MOTOR — NEGOCIAÇÃO DO TÉCNICO (FASE1-MER, 13/11/2026)
   -------------------------------------------------------------------
   docs/carreira-v2/fase1/02_Requisitos_Mercado.md e PLANO_MER.md.
   - Compra: a proposta leva valor, parcelas, salário, papel prometido e
     duração. O clube vendedor decide pela reserva com importância,
     cobertura e reposição (mercado.reservaParaProposta); se ele aceita,
     o atleta decide (mercado.avaliacaoAtleta): aceita, pede mais salário
     ou recusa. Só fecha com os dois de acordo (MER-04).
   - Recusa e pedido ficam na lista com o motivo, para a tela mostrar a
     ação seguinte (MER-03).
   - Empréstimo: o clube de origem e o jogador avaliam (MER-05).
   - Determinismo (MER-06): as decisões usam um sorteio com chave (a
     oferta, os termos e a rodada). O mesmo pedido no mesmo estado dá a
     mesma resposta.
   - Idempotência (MER-07): os fechamentos aceitam um id de operação; a
     mesma operação repetida devolve a mesma resposta, sem aplicar de novo.
   A IA CPU x CPU não passa por aqui.
=================================================================== */

import { carreiraAtual, competicaoAtual, timePorId, forcaMediaDoElenco, divisoesDoPais } from "./estado.js";
import * as mercado from "./mercado.js";
import { fairWageFor } from "./temporada.js";
import { fmtBRL, abbreviateName } from "./texto.js";
import { pushNotification } from "./registro.js";
import { ambiente, avisar, leagueSquadFor, marketClub, pushTransferLog, finalizeIncomingPurchase, maybeSpawnRivalOffer, calendarOn, CALENDAR_WINDOW_PHASES, ganchos, pickRandomOtherClub, temVagaCpu, entrarNoElencoCpu, moverCaixaCpu, transferScore, financeiroScore, pickWeightedByScore, minSquadSizeFor, SUBPOS_LABEL, subPositionOf } from "./semana.js";
import { wageBill } from "./financas.js";

export const PAPEIS = ["titular", "rotacao", "reserva"];
export const ANOS = [1, 2, 3, 4, 5];

// Divisão de um clube: 0 = a 1ª do país do save (Série A), 1 = a 2ª, 2 = a 3ª.
export function divisaoDoClube(clubId) {
  const CAREER = carreiraAtual();
  const comp = String(clubId) === String(CAREER.clubId) ? competicaoAtual() : (timePorId(clubId).competitionId || competicaoAtual());
  return Math.max(0, divisoesDoPais().indexOf(comp));
}

// VENDA-DISPONIVEL (17/11): os motivos do clube para vender o jogador
// (vazio = não está à venda). Os jogos de cada jogador só são contados na
// divisão do seu clube.
export function motivosAVendaNoClube(p, clubId) {
  const CAREER = carreiraAtual();
  return mercado.motivosAVenda(p, leagueSquadFor(clubId), {
    rodadas: Math.max(0, (CAREER.currentRound || 1) - 1),
    contaJogos: divisaoDoClube(clubId) === divisaoDoClube(CAREER.clubId),
    temporada: CAREER.seasonYear,
    salarioJusto: fairWageFor(p),
  });
}

// O que o atleta pesa sobre a proposta: papel e divisão de hoje, força dos
// dois clubes e a reputação do técnico.
export function contextoDoAtleta(p, clubId) {
  const CAREER = carreiraAtual();
  return {
    papelAtual: mercado.papelNoElenco(p, leagueSquadFor(clubId)),
    divisaoAtual: divisaoDoClube(clubId),
    divisaoComprador: divisaoDoClube(CAREER.clubId),
    forcaAtual: forcaMediaDoElenco(clubId),
    forcaComprador: forcaMediaDoElenco(CAREER.clubId),
    reputacao: CAREER.reputation == null ? 50 : CAREER.reputation,
    aVenda: motivosAVendaNoClube(p, clubId).length > 0, // VENDA-DISPONIVEL
  };
}

// Termos da proposta, com padrão para propostas de antes (sem os campos).
export function termosDaProposta(o, p) {
  return {
    salario: Math.max(1, Math.round(o.salario || (p && p.wage) || 1)),
    papel: PAPEIS.includes(o.papel) ? o.papel : "rotacao",
    anos: ANOS.includes(Number(o.anos)) ? Number(o.anos) : 3,
  };
}

// Fim de janela: a última semana dela (o vendedor pede um pouco mais).
export function fimDeJanela() {
  const CAREER = carreiraAtual();
  if (!calendarOn()) return false;
  const w = mercado.windowByCalendar(CAREER.calendar.weeks, CAREER.calendar.idx, CALENDAR_WINDOW_PHASES);
  return !!w.open && w.lastIdx === CAREER.calendar.idx;
}

// Roda `fn` com Math.random trocado pelo sorteio com chave (só trechos
// síncronos). Assim as funções de sempre, que sorteiam por dentro (o
// concorrente, a negociação interna), também ficam determinísticas aqui.
export function comSorteio(chave, fn) {
  const rng = ambiente.rngDaChave(chave);
  const original = Math.random;
  Math.random = rng;
  try { return fn(rng); } finally { Math.random = original; }
}
// A chave do sorteio de uma proposta: muda quando a oferta ou a rodada mudam.
export const chaveDaOferta = (o, round) => `oferta:${o.id}:${o.offerValue}:${o.installments}:${o.salario || 0}:${o.papel || ""}:${o.anos || 0}:${round}`;

// ---------- Compra ----------

// Uma rodada de uma proposta do técnico. Devolve true se ela fica na
// lista (esperando, contraproposta, pedido do atleta ou recusa a mostrar).
export function resolverProposta(o, round) {
  if (o.status !== "pending") return true; // contraproposta, pedido ou recusa: aguardam o técnico
  return comSorteio(chaveDaOferta(o, round), (rng) => {
    maybeSpawnRivalOffer(o);
    o.roundsLeft -= 1;
    if (o.roundsLeft > 0) return true;
    const p = leagueSquadFor(o.clubId).find((x) => String(x.id) === String(o.playerId));
    if (!p) {
      avisar(`${abbreviateName(o.playerName)} não está mais disponível — negociação cancelada.`, { type: "warn" });
      return false;
    }
    if (o.rivalOffer) {
      const mine = mercado.offerEffectiveValue(o.offerValue, o.installments);
      const rival = mercado.offerEffectiveValue(o.rivalOffer.offerValue, o.rivalOffer.installments);
      if (rng() < (mine >= rival ? 0.8 : 0.25)) return fecharComAtleta(o, p, round);
      avisar(`${o.clubName} vendeu ${abbreviateName(o.playerName)} pro ${o.rivalOffer.clubName} — a proposta concorrente venceu.`, { type: "warn" });
      pushTransferLog(`${o.rivalOffer.clubName} venceu a disputa por ${o.playerName} (sua proposta era de ${fmtBRL(o.offerValue)}).`, round);
      return false;
    }
    const aVenda = motivosAVendaNoClube(p, o.clubId).length > 0;
    const r = mercado.reservaParaProposta(p, marketClub(o.clubId), { baseValue: o.marketValue, fimDeJanela: fimDeJanela(), aVenda });
    const usadas = o.counterRounds || 0;
    // VENDA-DISPONIVEL: à venda, a partir da reserva (90%) o clube aceita.
    let d = aVenda && o.offerValue >= r.reserva ? { action: "accept", value: o.offerValue } : mercado.sellerNegotiationDecision(o.offerValue, r.reserva, rng);
    if (d.action === "counter" && usadas >= mercado.MAX_NEGOTIATION_ROUNDS) {
      d = o.offerValue / r.reserva >= 0.85 ? { action: "accept", value: o.offerValue } : { action: "reject", value: null };
    }
    if (d.action === "accept") return fecharComAtleta(o, p, round);
    const motivo = mercado.motivoDoVendedor(r, o.clubName);
    if (d.action === "counter") {
      o.counterValue = d.value;
      o.counterRounds = usadas + 1;
      o.status = "countered";
      o.motivo = motivo;
      avisar({ title: "Contraproposta recebida", detail: `${o.clubName} quer ${fmtBRL(o.counterValue)} por ${abbreviateName(o.playerName)} — veja em Minhas propostas.` }, { type: "warn" });
      return true;
    }
    recusar(o, motivo, "clube", round);
    return true;
  });
}

// O clube aceitou o valor: agora o atleta decide (MER-04). Devolve true se
// a proposta fica na lista (pedido de salário ou recusa).
export function fecharComAtleta(o, p, round) {
  const t = termosDaProposta(o, p);
  const a = mercado.avaliacaoAtleta(p, t, contextoDoAtleta(p, o.clubId));
  o.clubeAceitou = true;
  if (a.decisao === "aceita") {
    const res = finalizeIncomingPurchase({ ...o, salario: t.salario, papel: t.papel, anos: t.anos });
    o.resultado = res;
    return false;
  }
  if (a.decisao === "pede") {
    o.status = "pede-salario";
    o.salarioPedido = a.salarioPedido;
    o.motivo = `O ${o.clubName} aceitou o valor. ${abbreviateName(o.playerName)} pede ${fmtBRL(a.salarioPedido)} de salário por mês.`;
    avisar({ title: "O jogador pede mais", detail: o.motivo }, { type: "warn" });
    return true;
  }
  recusar(o, a.motivo, "atleta", round);
  return true;
}

function recusar(o, motivo, quem, round) {
  o.status = "recusada";
  o.motivo = motivo;
  o.recusadoPor = quem;
  o.respondidaEm = round;
  const quemTexto = quem === "atleta" ? abbreviateName(o.playerName) : o.clubName;
  avisar(`${quemTexto} recusou sua proposta: ${motivo}`, { type: "warn" });
  pushTransferLog(`${quem === "atleta" ? o.playerName : o.clubName} recusou sua proposta de ${fmtBRL(o.offerValue)} por ${o.playerName}. ${motivo}`, round);
  pushNotification("proposta", `${quemTexto} recusou sua proposta por ${abbreviateName(o.playerName)}.`);
}

// Aceitar a contraproposta do clube: o valor fecha e o atleta decide.
// Devolve { comprado, texto?, atleta? } e tira da lista só se fechou ou falhou.
export function aceitarContraDoClube(offerId) {
  const CAREER = carreiraAtual();
  const o = (CAREER.pendingOffersOut || []).find((x) => x.id === offerId);
  if (!o || o.counterValue == null) return null;
  const p = leagueSquadFor(o.clubId).find((x) => String(x.id) === String(o.playerId));
  o.offerValue = o.counterValue;
  o.counterValue = null;
  o.status = "pending";
  if (!p) {
    CAREER.pendingOffersOut = CAREER.pendingOffersOut.filter((x) => x.id !== offerId);
    return { comprado: false, texto: `${abbreviateName(o.playerName)} não está mais disponível.` };
  }
  const fica = fecharComAtleta(o, p, CAREER.currentRound);
  if (!fica) {
    CAREER.pendingOffersOut = CAREER.pendingOffersOut.filter((x) => x.id !== offerId);
    return { comprado: !!(o.resultado && o.resultado.ok), texto: o.resultado && !o.resultado.ok ? o.resultado.texto : null };
  }
  return { comprado: false, texto: o.motivo, atleta: { decisao: o.status === "pede-salario" ? "pede" : "recusa", salarioPedido: o.salarioPedido || null } };
}

// Aceitar o salário pedido pelo atleta: fecha (o clube já tinha aceitado).
export function aceitarSalarioPedido(offerId) {
  const CAREER = carreiraAtual();
  const o = (CAREER.pendingOffersOut || []).find((x) => x.id === offerId);
  if (!o || o.status !== "pede-salario" || !o.salarioPedido) return null;
  const p = leagueSquadFor(o.clubId).find((x) => String(x.id) === String(o.playerId));
  o.salario = o.salarioPedido;
  o.salarioPedido = null;
  o.status = "pending";
  if (!p) {
    CAREER.pendingOffersOut = CAREER.pendingOffersOut.filter((x) => x.id !== offerId);
    return { comprado: false, texto: `${abbreviateName(o.playerName)} não está mais disponível.` };
  }
  const fica = fecharComAtleta(o, p, CAREER.currentRound);
  if (!fica) {
    CAREER.pendingOffersOut = CAREER.pendingOffersOut.filter((x) => x.id !== offerId);
    return { comprado: !!(o.resultado && o.resultado.ok), texto: o.resultado && !o.resultado.ok ? o.resultado.texto : null };
  }
  return { comprado: false, texto: o.motivo };
}

// ---------- Empréstimo ----------

// Pedido de empréstimo de um jogador de outro clube (o técnico recebe).
export function avaliarPedidoDeEmprestimo(clubId, p, duracao, pct) {
  const CAREER = carreiraAtual();
  const principal = CAREER.squad.filter((x) => x.origin !== "base");
  return mercado.avaliacaoEmprestimo(p, { duracao, pct }, {
    papelNaOrigem: mercado.papelNoElenco(p, leagueSquadFor(clubId)),
    rosterOrigem: leagueSquadFor(clubId),
    papelNoDestino: mercado.papelNoElenco(p, [...principal, p]),
    disponivel: mercado.precisaDeMinutos(p, leagueSquadFor(clubId)), // EMPRESTIMO-DISPONIVEL
  });
}

// Empréstimo de um jogador seu: o jogador avalia o papel no destino.
export function jogadorAceitaIrEmprestado(p, buyerId) {
  const CAREER = carreiraAtual();
  const aqui = mercado.papelNoElenco(p, CAREER.squad.filter((x) => x.origin !== "base"));
  const la = mercado.papelNoElenco(p, leagueSquadFor(buyerId));
  if (aqui === "titular" && la !== "titular") return { ok: false, motivo: `${abbreviateName(p.name)} é titular e não aceita ir para ser ${la === "rotacao" ? "rotação" : "reserva"}.` };
  return { ok: true, papelNoDestino: la };
}

// ---------- Idempotência (MER-07) ----------

// Repetir a mesma operação (mesmo opId) devolve a mesma resposta, sem
// aplicar de novo. Guarda as últimas 30 no save.
// `fn` aplica a operação SEM gravar e devolve a resposta; aqui ela é
// registrada (se ok) e o save é gravado uma vez, já com o registro.
export async function comOperacao(opId, fn) {
  const CAREER = carreiraAtual();
  if (opId) {
    const ja = (CAREER.mercadoOps || []).find((x) => x.id === String(opId));
    if (ja) return { ...ja.r, repetida: true };
  }
  const r = await fn();
  if (!r || !r.ok) return r;
  if (opId) {
    const feitas = CAREER.mercadoOps = CAREER.mercadoOps || [];
    feitas.push({ id: String(opId), r });
    if (feitas.length > 30) feitas.splice(0, feitas.length - 30);
  }
  const g = await ambiente.gravar();
  return g.ok ? r : g;
}

// A rodada das propostas (motor/semana.js) chama a negociação daqui.
ganchos.resolverProposta = resolverProposta;

// ---------- PARIDADE-CPU · E3, PR2: mercado CPU × CPU (CPU-07, V06, A9) ----------
// O mesmo do seu mercado, com a CPU dos dois lados:
// 1) o comprador olha poucos vendedores (4 clubes sorteados) e ranqueia os
//    jogadores pela necessidade, adequação, caixa e contexto (transferScore);
// 2) o vendedor pede a reserva da regra do seu mercado (papel, cobertura,
//    reposição; "à venda" pelos mesmos motivos), e o comprador só paga até o
//    teto dele (caixa e 1,5× o valor);
// 3) o atleta decide pela mesma regra (papel no destino, divisão, força,
//    salário): aceita, pede mais salário (cabendo na folha) ou recusa;
// 4) elenco cheio só compra com um excedente para dispensar (agentes livres).
// Roda nas janelas, como antes.
// Volume (decisão do Murilo 21/11, "Moderado"): 6 tentativas por semana de
// janela, ~20–30 transferências por temporada.
export const MERCADO_CPU = { tentativas: 6, vendedores: 4, candidatos: 8 };
export function contextoDoAtletaEntreClubes(p, deId, paraId) {
  return {
    papelAtual: mercado.papelNoElenco(p, leagueSquadFor(deId)),
    divisaoAtual: divisaoDoClube(deId),
    divisaoComprador: divisaoDoClube(paraId),
    forcaAtual: forcaMediaDoElenco(deId),
    forcaComprador: forcaMediaDoElenco(paraId),
    reputacao: 50,
    aVenda: motivosAVendaNoClube(p, deId).length > 0,
  };
}
export function negociacaoCpu(p, deId, paraId) {
  const comprador = marketClub(paraId), vendedorSq = leagueSquadFor(deId);
  if (vendedorSq.length <= minSquadSizeFor(deId)) return { ok: false, motivo: "vendedor sem peças" };
  if (!temVagaCpu(paraId)) return { ok: false, motivo: "sem vaga" };
  const aVenda = motivosAVendaNoClube(p, deId).length > 0;
  const r = mercado.reservaParaProposta(p, marketClub(deId), { aVenda });
  const teto = mercado.buyerHardCap(p, comprador);
  if (r.reserva > teto) return { ok: false, motivo: "acima do teto do comprador", reserva: r.reserva, teto };
  const papel = mercado.papelNoElenco(p, leagueSquadFor(paraId));
  const a = mercado.avaliacaoAtleta(p, { salario: p.wage, papel, anos: 3 }, contextoDoAtletaEntreClubes(p, deId, paraId));
  if (a.decisao === "recusa") return { ok: false, motivo: "atleta recusou", atleta: a.motivo };
  const salario = a.decisao === "pede" ? a.salarioPedido : p.wage;
  const { wageCap } = mercado.clubBudget(comprador);
  if (wageBill(leagueSquadFor(paraId)) + salario > wageCap) return { ok: false, motivo: "folha do comprador" };
  return { ok: true, preco: r.reserva, salario, papel, aVenda };
}
export function mercadoCpuDaRodada(round) {
  const CAREER = carreiraAtual();
  const count = MERCADO_CPU.tentativas;
  const feitas = [];
  for (let i = 0; i < count; i++) {
    const comprador = pickRandomOtherClub(CAREER.clubId);
    if (!comprador || !temVagaCpu(comprador.id)) continue;
    const vendedores = [];
    for (let k = 0; k < MERCADO_CPU.vendedores; k++) {
      const v = pickRandomOtherClub(comprador.id);
      if (v && String(v.id) !== String(CAREER.clubId) && !vendedores.some((x) => String(x.id) === String(v.id))) vendedores.push(v);
    }
    const compradorSq = leagueSquadFor(comprador.id);
    // O clube comprador montado uma vez (média, ambição e caixa ficam em
    // cache nele): o mesmo resultado de financeiroScore/transferScore por id.
    const clube = marketClub(comprador.id);
    const cands = vendedores.flatMap((v) => leagueSquadFor(v.id)
      .filter((p) => p.onLoanFromClubId == null && mercado.financeiroScore(p, compradorSq, clube) > 0)
      .map((p) => ({ item: { p, v }, score: mercado.transferScore(p, clube) })))
      .sort((a, b) => b.score - a.score).slice(0, MERCADO_CPU.candidatos);
    if (!cands.length) continue;
    const { p, v } = pickWeightedByScore(cands);
    const n = negociacaoCpu(p, v.id, comprador.id);
    if (!n.ok) continue;
    const sq = leagueSquadFor(v.id);
    sq.splice(sq.indexOf(p), 1);
    p.wage = n.salario;
    p.contractUntil = CAREER.seasonYear + 2;
    entrarNoElencoCpu(comprador.id, p);
    moverCaixaCpu(comprador.id, -n.preco); moverCaixaCpu(v.id, n.preco);
    pushTransferLog(`${comprador.name} contratou ${p.name} (${SUBPOS_LABEL[subPositionOf(p)]}) do ${v.name} por ${fmtBRL(n.preco)}.`, round);
    feitas.push({ jogador: p.id, de: String(v.id), para: String(comprador.id), preco: n.preco });
  }
  return feitas;
}
ganchos.mercadoCpu = mercadoCpuDaRodada;
