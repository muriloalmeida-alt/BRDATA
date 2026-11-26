// PC-002: temporada visível (placares, partidas, classificação), eventos de
// treinador e imprensa, persistência da reprodução e migração v1 → v2.
import test from "node:test";
import assert from "node:assert/strict";
import { catalogoDeTeste } from "./teste-catalogo.ts";
import { abrirJanela, assinarPrimeiroContrato, avancar, CONFIG, decidir, marcarExibidos, novaCarreira, resumoTemporada, sugestoesIniciais, tabelaDaTemporada } from "./carreira.ts";
import { classificacao, montarCalendario, resultadosDaRodada } from "./calendario.ts";
import { migrarSave } from "./save.ts";
import type { Carreira, Partida } from "./estado.ts";
import { jogarAutomatico } from "./simular-lote.test.ts";

const cat = catalogoDeTeste();
const recarregar = (c: Carreira) => migrarSave(JSON.parse(JSON.stringify(c)))!;
const iniciar = (semente: string, pos: "CA" | "MEI" | "GOL" | "ZAGD" = "CA", i = 1) => {
  const c0 = novaCarreira(cat, { semente, nacionalidade: "BR", numero: 9, posicao: pos });
  return assinarPrimeiroContrato(cat, c0, sugestoesIniciais(cat, c0)[i]);
};
function ate(c: Carreira, cond: (c: Carreira) => boolean, pol = (x: Carreira) => x.pendente!.opcoes[0].id) {
  for (let i = 0; i < 800 && !cond(c); i++) {
    if (c.pendente) c = decidir(cat, c, pol(c));
    else if (c.fase === "temporada") c = avancar(cat, c);
    else if (c.fase === "balanco") c = abrirJanela(cat, c);
    else break;
  }
  return c;
}

test("rodízio: cada clube joga uma vez por rodada e enfrenta todos no turno", () => {
  const liga = cat.ligas.find((l) => l.id === "premier_league")!;
  const ids = cat.clubesDaLiga(liga.id).map((c) => c.id);
  const cal = montarCalendario(cat, "s", 2027, liga.id, ids, liga.rodadas!);
  assert.equal(cal.rodadas.length, 38);
  for (const rod of cal.rodadas) {
    const vistos = rod.flatMap((x) => [x.mandante, x.visitante]);
    assert.equal(new Set(vistos).size, ids.length);
  }
  const turno = cal.rodadas.slice(0, 19).flat();
  for (const a of ids) assert.equal(new Set(turno.filter((x) => x.mandante === a || x.visitante === a).map((x) => (x.mandante === a ? x.visitante : x.mandante))).size, 19);
  // Mesmos placares a cada cálculo (mesma fonte).
  assert.deepEqual(resultadosDaRodada(cat, "s", cal, 5), resultadosDaRodada(cat, "s", cal, 5));
});

test("temporada inteira: totais = soma das partidas; gols do atleta cabem no placar; tabela e campanha batem", () => {
  for (const pos of ["CA", "MEI", "GOL", "ZAGD"] as const) {
    const c = ate(iniciar("cons-" + pos, pos), (x) => x.historico.length >= 1);
    const h = c.historico[0];
    const ps = h.partidas!;
    assert.equal(h.origem, "jogo-a-jogo");
    assert.equal(ps.length, h.jogosTotal);
    assert.equal(new Set(ps.map((p) => p.chave)).size, ps.length, "chave estável e única por partida");
    assert.equal(ps.filter((p) => p.minutos > 0).length, h.jogos);
    assert.equal(ps.reduce((s, p) => s + p.minutos, 0), h.minutos);
    assert.equal(ps.reduce((s, p) => s + p.gols, 0), h.stats.gols);
    assert.equal(ps.reduce((s, p) => s + p.assistencias, 0), h.stats.assistencias);
    assert.equal(ps.filter((p) => p.semSofrer).length, h.stats.semSofrer);
    assert.equal(ps.filter((p) => p.situacao === "titular").length, h.titularidades);
    for (const p of ps) {
      assert.ok(p.gols + p.assistencias <= p.golsPro, `gols+assist ≤ gols do time (${p.chave})`);
      if (p.semSofrer) assert.equal(p.golsContra, 0);
      if (p.situacao === "banco" || p.situacao === "indisponivel") assert.equal(p.minutos, 0);
    }
    const camp = { v: ps.filter((p) => p.golsPro > p.golsContra).length, e: ps.filter((p) => p.golsPro === p.golsContra).length, d: ps.filter((p) => p.golsPro < p.golsContra).length };
    assert.equal(h.campanha!.v, camp.v); assert.equal(h.campanha!.e, camp.e); assert.equal(h.campanha!.d, camp.d);
    assert.equal(h.campanha!.gp, ps.reduce((s, p) => s + p.golsPro, 0));
    // Classificação: 3 pontos por vitória, posição do clube, título só com formato verificado.
    const tab = tabelaDaTemporada(cat, { ...c, temporada: c.temporada! }, h.jogosTotal);
    const totalJogos = tab.reduce((s, l) => s + l.j, 0);
    assert.equal(totalJogos, (tab.length / 2) * 2 * h.jogosTotal);
    assert.equal(tab.reduce((s, l) => s + l.v, 0), tab.reduce((s, l) => s + l.d, 0));
    if (h.simplificada) assert.equal(h.posicaoLiga, null);
    else assert.equal(h.posicaoLiga, tab.findIndex((l) => l.clubeId === h.clubeId) + 1);
    assert.equal(h.titulo, h.posicaoLiga === 1);
  }
});

test("liga com formato verificado: classificação e título", () => {
  let achou = false;
  for (let s = 0; s < 30 && !achou; s++) {
    const c0 = novaCarreira(cat, { semente: "ver" + s, nacionalidade: "BR", numero: 9, posicao: "CA" });
    const clube = cat.clubesDaLiga("premier_league")[s % 20];
    const c = ate(assinarPrimeiroContrato(cat, c0, clube.id), (x) => x.historico.length >= 1);
    const h = c.historico[0];
    assert.equal(h.simplificada, false);
    assert.ok(h.posicaoLiga! >= 1 && h.posicaoLiga! <= 20);
    if (h.titulo) { achou = true; assert.ok(c.marcos.some((m) => m.tipo === "titulo")); }
  }
  assert.ok(achou, "algum título em 30 temporadas da Premier League");
});

test("reprodução: ponteiro persistido não muda resultados (normal, acelerada, pulada)", () => {
  const politica = (x: Carreira) => x.pendente!.opcoes[0].id;
  // Pulada: nunca marca exibição.
  const pulada = ate(iniciar("rep"), (x) => x.historico.length >= 2, politica);
  // Normal/acelerada: marca a exibição jogo a jogo, recarregando no meio.
  let c = iniciar("rep");
  for (let i = 0; i < 800 && c.historico.length < 2; i++) {
    if (c.temporada && c.temporada.exibidos < c.temporada.partidas.length) {
      c = recarregar(marcarExibidos(c, c.temporada.exibidos + (i % 3 === 0 ? 3 : 1)));
      continue;
    }
    if (c.pendente) c = decidir(cat, c, politica(c));
    else if (c.fase === "temporada") c = avancar(cat, c);
    else if (c.fase === "balanco") c = abrirJanela(cat, c);
  }
  assert.deepEqual(c.historico, pulada.historico);
  assert.deepEqual(c.decisoes, pulada.decisoes);
  assert.deepEqual(c.atleta, pulada.atleta);
});

test("recarregar no meio da temporada não duplica jogos, consequências nem balanço", () => {
  let c = iniciar("dup", "MEI", 0);
  c = ate(c, (x) => !!x.pendente && x.fase === "temporada");
  const salvo = recarregar(c);
  const d1 = decidir(cat, salvo, salvo.pendente!.opcoes[0].id);
  const d1b = decidir(cat, recarregar(d1), salvo.pendente!.opcoes[0].id);
  assert.equal(d1b.decisoes.length, d1.decisoes.length);
  const a1 = avancar(cat, recarregar(d1));
  const a2 = avancar(cat, recarregar(d1));
  assert.deepEqual(a1, a2);
  const n0 = c.historico.length;
  const fim = ate(a1, (x) => x.fase === "balanco");
  assert.equal(fim.historico.length, n0 + 1);
  assert.equal(abrirJanela(cat, abrirJanela(cat, fim)).historico.length, n0 + 1);
  const chaves = fim.historico[n0].partidas!.map((p: Partida) => p.chave);
  assert.equal(new Set(chaves).size, chaves.length);
  // Totais até um ponto da reprodução = soma das partidas mostradas.
  const meio = Math.floor(fim.temporada!.partidas.length / 2);
  const r = resumoTemporada(fim, meio)!;
  assert.equal(r.minutos, fim.temporada!.partidas.slice(0, meio).reduce((s, p) => s + p.minutos, 0));
});

test("treinador e imprensa: plano de pré-temporada, disputa por vaga, entrevista e rumor com limite", () => {
  const tipos = new Map<string, Carreira>();
  const exigidos = ["planoTreinador", "perdaEspaco", "entrevista", "rumor"];
  for (let s = 0; s < 120 && !exigidos.every((x) => tipos.has(x)); s++) {
    let c = iniciar("ev" + s, s % 2 ? "MEI" : "CA", s % 3);
    for (let i = 0; i < 600 && c.historico.length < 6; i++) {
      if (c.pendente) {
        if (!tipos.has(c.pendente.tipo)) tipos.set(c.pendente.tipo, c);
        c = decidir(cat, c, c.pendente.opcoes[(s + i) % c.pendente.opcoes.length].id);
      } else if (c.fase === "temporada") c = avancar(cat, c);
      else if (c.fase === "balanco") c = abrirJanela(cat, c);
      if (c.temporada) assert.ok(c.temporada.interrupcoes <= CONFIG.interrupcoesPorTemporada);
    }
  }
  for (const t of ["planoTreinador", "perdaEspaco", "entrevista", "rumor"]) assert.ok(tipos.has(t), `evento ${t} ocorreu`);
  // Plano: só na pré-temporada (rodada 0).
  assert.equal(tipos.get("planoTreinador")!.temporada!.jogoAtual, 0);
  // Entrevista: referência à partida de origem no registro.
  const ent = tipos.get("entrevista")!;
  const p = ent.temporada!.partidas.find((x) => x.chave === ent.pendente!.contexto.partida)!;
  assert.ok(p.marcos.includes("golDecisivo") || (p.nota ?? 0) >= 8);
  // Mesmas opções depois de recarregar; efeito uma vez.
  const rec = recarregar(ent);
  assert.deepEqual(rec.pendente, ent.pendente);
  const amb = decidir(cat, rec, "ambicao");
  assert.ok(amb.atleta.reputacao > ent.atleta.reputacao && amb.atleta.expectativa === ent.atleta.expectativa + 1);
  assert.equal(decidir(cat, amb, "ambicao"), amb);
  // Rumor: interesse concreto vira proposta na janela, se couber no orçamento.
  const rum = decidir(cat, tipos.get("rumor")!, "ficar");
  assert.equal(rum.rumor!.resposta, "ficar");
  const jan = ate(rum, (x) => x.fase === "janela" || x.fase === "aposentadoria" || x.fase === "encerrada");
  if (jan.fase === "janela") {
    const of = jan.pendente!.ofertas!.find((o) => o.clubeId === rum.rumor!.clubeId);
    if (of) {
      const foi = decidir(cat, jan, of.id);
      assert.match(foi.ultimaConsequencia!, /repercutiu mal/);
      assert.equal(foi.rumor, null);
    }
  }
});

test("migração v1 → v2: temporada em andamento continua sem perder pendência; histórico vira 'resumo'", () => {
  const c = ate(iniciar("migr"), (x) => x.historico.length >= 1 && x.fase === "temporada" && x.temporada!.jogoAtual > 5);
  const v1 = JSON.parse(JSON.stringify(c));
  v1.schema = 1;
  delete v1.rumor;
  for (const k of ["confianca", "reputacao", "cobertura", "expectativa"]) delete v1.atleta[k];
  for (const h of v1.historico) { delete h.origem; delete h.partidas; delete h.campanha; delete h.titularidades; }
  for (const k of ["participantes", "partidas", "exibidos", "interrupcoes", "origemParcial"]) delete v1.temporada[k];
  const m = migrarSave(v1)!;
  assert.equal(m.schema, 3);
  assert.equal(m.historico[0].origem, "resumo");
  assert.equal(m.temporada!.origemParcial, c.temporada!.jogoAtual);
  assert.ok(m.atleta.reputacao >= 0 && m.atleta.confianca === 0.5);
  assert.deepEqual(m.pendente, JSON.parse(JSON.stringify(c.pendente)));
  const fim = ate(m, (x) => x.historico.length >= 2);
  const h = fim.historico[1];
  assert.equal(h.origem, "resumo", "temporada que começou antes da migração mantém a origem parcial");
  assert.equal(h.partidas!.length, h.jogosTotal - c.temporada!.jogoAtual);
});

test("determinismo com eventos novos", () => {
  assert.deepEqual(jogarAutomatico("det-v2", "MEI"), jogarAutomatico("det-v2", "MEI"));
  void classificacao;
});
