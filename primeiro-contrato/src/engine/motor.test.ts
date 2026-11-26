// Testes do motor do Primeiro Contrato (PC-001). Cobrem os critérios de aceite
// do PROJETO.md: determinismo, decisões divergentes, decisão pendente após
// recarregar, efeito gravado uma vez, empréstimo com retorno, aposentadoria só
// com confirmação, calendário, métricas por posição e busca.
import test from "node:test";
import assert from "node:assert/strict";
import { catalogoDeTeste } from "./teste-catalogo.ts";
import { abrirJanela, assinarPrimeiroContrato, avancar, decidir, novaCarreira, propostaInicial, sugestoesIniciais, totais, CONFIG } from "./carreira.ts";
import { buscarClubes, forcaClube, jogosDaTemporada } from "./catalogo.ts";
import { POSICOES, POS } from "./posicoes.ts";
import { migrarSave } from "./save.ts";
import { intervaloMinutos } from "./elenco.ts";
import { sugerirNacionalidade } from "./atleta.ts";
import type { Carreira } from "./estado.ts";
import { jogarAutomatico } from "./simular-lote.test.ts";

const cat = catalogoDeTeste();
const recarregar = (c: Carreira) => migrarSave(JSON.parse(JSON.stringify(c)))!;

function ate(c: Carreira, cond: (c: Carreira) => boolean, politica = (x: Carreira) => x.pendente!.opcoes[0].id): Carreira {
  for (let i = 0; i < 600 && !cond(c); i++) {
    if (c.pendente) c = decidir(cat, c, politica(c));
    else if (c.fase === "temporada") c = avancar(cat, c);
    else if (c.fase === "balanco") c = abrirJanela(cat, c);
    else break;
  }
  return c;
}

test("as 11 posições do 4–2–3–1, com nome por extenso", () => {
  assert.equal(POSICOES.length, 11);
  assert.deepEqual(POSICOES.map((p) => p.sigla), ["CA", "PE", "MEI", "PD", "VOL E", "VOL D", "LE", "ZAG E", "ZAG D", "LD", "GOL"]);
  for (const p of POSICOES) assert.ok(p.nome.length >= 4);
});

test("catálogo: 795 clubes, busca sem acento, filtros e clubes fora do Brasil em várias divisões", () => {
  assert.equal(cat.clubes.length, 795);
  assert.ok(buscarClubes(cat, { texto: "sao paulo" }).some((c) => c.nome === "São Paulo"));
  assert.ok(buscarClubes(cat, { texto: "atletico" }).length >= 2);
  assert.ok(buscarClubes(cat, { pais: "Inglaterra" }).every((c) => cat.liga(c.ligaId)!.pais === "Inglaterra"));
  const terceira = buscarClubes(cat, { pais: "Itália" }).find((c) => cat.liga(c.ligaId)!.divisao === 3)!;
  const primeira = buscarClubes(cat, { texto: "barcelona" })[0];
  for (const id of [terceira.id, primeira.id]) {
    let c = novaCarreira(cat, { semente: "fora", nacionalidade: "BR", numero: 9, posicao: "CA" });
    c = assinarPrimeiroContrato(cat, c, id);
    assert.equal(c.fase, "temporada");
    assert.equal(c.vinculo!.clubeId, id);
  }
  for (const cl of cat.clubes) assert.ok(cat.liga(cl.ligaId), `inscrição sem liga: ${cl.id}`);
});

test("primeiro contrato: clube forte recebe como promessa, clube fraco dá mais minutos", () => {
  const c = novaCarreira(cat, { semente: "papel", nacionalidade: "BR", numero: 8, posicao: "MEI" });
  const forte = [...cat.clubes].sort((a, b) => forcaClube(cat, b.id) - forcaClube(cat, a.id))[0];
  const fraco = [...cat.clubes].sort((a, b) => forcaClube(cat, a.id) - forcaClube(cat, b.id))[0];
  const pf = propostaInicial(cat, c, forte.id), pr = propostaInicial(cat, c, fraco.id);
  assert.equal(pf.papel, "Promessa");
  assert.ok(pr.previsao[1] > pf.previsao[1]);
  assert.ok(pf.previsao[0] < pf.previsao[1], "previsão em intervalo");
  const sug = sugestoesIniciais(cat, c);
  assert.equal(sug.length, 3);
  assert.equal(new Set(sug.map((id) => propostaInicial(cat, c, id).papel)).size >= 2, true);
});

test("determinismo: mesma semente e mesmas decisões = mesma carreira", () => {
  const a = jogarAutomatico("det-1", "CA");
  const b = jogarAutomatico("det-1", "CA");
  assert.deepEqual(a, b);
});

test("decisões divergentes produzem carreiras diferentes e coerentes", () => {
  const base = ate(assinarPrimeiroContrato(cat, novaCarreira(cat, { semente: "div", nacionalidade: "BR", numero: 7, posicao: "PD" }), sugestoesIniciais(cat, novaCarreira(cat, { semente: "div", nacionalidade: "BR", numero: 7, posicao: "PD" }))[2]), (c) => c.pendente?.tipo === "perdaEspaco");
  assert.equal(base.pendente?.tipo, "perdaEspaco", "uma promessa em clube forte perde espaço");
  const treino = decidir(cat, base, "treinar");
  const emp = decidir(cat, base, "emprestimo");
  assert.ok(treino.temporada!.bonusAvaliacao > base.temporada!.bonusAvaliacao, "treino afeta a próxima avaliação");
  assert.equal(emp.interesseEmprestimo, true, "empréstimo marca interesse");
  const fimT = ate(treino, (c) => c.fase === "balanco");
  const fimE = ate(emp, (c) => c.fase === "balanco");
  assert.notDeepEqual(fimT.historico, fimE.historico);
});

test("decisão pendente sobrevive ao recarregar com as mesmas opções, e o efeito grava uma vez", () => {
  let c = assinarPrimeiroContrato(cat, novaCarreira(cat, { semente: "pend", nacionalidade: "AR", numero: 5, posicao: "VOLE" }), sugestoesIniciais(cat, novaCarreira(cat, { semente: "pend", nacionalidade: "AR", numero: 5, posicao: "VOLE" }))[0]);
  c = ate(c, (x) => !!x.pendente);
  const salvo = recarregar(c);
  assert.deepEqual(salvo.pendente, c.pendente);
  assert.equal(avancar(cat, salvo), salvo, "com pendência, avançar não simula nada");
  const op = salvo.pendente!.opcoes[0].id;
  const d1 = decidir(cat, salvo, op);
  const d2 = decidir(cat, d1, op);
  assert.equal(d2, d1, "repetir a resposta não aplica de novo");
  assert.equal(d1.decisoes.filter((d) => d.chave === c.pendente!.chave).length, 1);
  assert.ok(d1.ultimaConsequencia);
});

test("temporada: jogos e minutos limitados ao calendário; métricas por posição", () => {
  for (const pos of ["GOL", "CA", "ZAGD", "MEI"] as const) {
    let c = assinarPrimeiroContrato(cat, novaCarreira(cat, { semente: "cal-" + pos, nacionalidade: "BR", numero: 1, posicao: pos }), sugestoesIniciais(cat, novaCarreira(cat, { semente: "cal-" + pos, nacionalidade: "BR", numero: 1, posicao: pos }))[0]);
    c = ate(c, (x) => x.historico.length >= 3);
    for (const h of c.historico) {
      const liga = cat.liga(h.ligaId);
      assert.equal(h.jogosTotal, jogosDaTemporada(liga).jogos);
      assert.ok(h.jogos <= h.jogosTotal && h.minutos <= h.jogosTotal * 90);
      if (pos === "GOL") { assert.equal(h.stats.gols, 0); assert.ok(h.stats.defesas > 0 || h.jogos === 0); }
      if (h.simplificada) assert.equal(h.posicaoLiga, null, "sem formato verificado, sem classificação nem título");
    }
    if (pos === "CA") assert.ok(totais(c).gols > 0);
  }
});

test("empréstimo: mantém a origem, volta no fim e preserva a passagem", () => {
  let achou: Carreira | null = null;
  for (let s = 0; s < 60 && !achou; s++) {
    const c = jogarAutomatico("emp" + s, "CA", 2, (x) => {
      const p = x.pendente!;
      if (p.tipo === "perdaEspaco") return "emprestimo";
      if (p.tipo === "janela") return p.ofertas?.find((o) => o.tipo === "emprestimo")?.id ?? (p.opcoes.find((o) => o.id === "ficar") ?? p.opcoes[0]).id;
      if (p.tipo === "aposentadoria") return "encerrar";
      return p.opcoes[0].id;
    });
    if (c.historico.some((h) => h.emprestimo)) achou = c;
  }
  assert.ok(achou, "alguma carreira passou por empréstimo");
  const i = achou.historico.findIndex((h) => h.emprestimo);
  const passagem = achou.historico[i];
  assert.ok(passagem.origemNome, "clube de origem gravado");
  assert.ok(achou.marcos.some((m) => m.tipo === "retorno"), "retorno registrado");
  assert.equal(passagem.clubeNome === passagem.origemNome, false);
});

test("empréstimo passo a passo: destino separado da origem e retorno após recarregar", () => {
  for (let s = 0; s < 80; s++) {
    let c = assinarPrimeiroContrato(cat, novaCarreira(cat, { semente: "pp" + s, nacionalidade: "BR", numero: 9, posicao: "CA" }), sugestoesIniciais(cat, novaCarreira(cat, { semente: "pp" + s, nacionalidade: "BR", numero: 9, posicao: "CA" }))[2]);
    c = ate(c, (x) => x.fase === "janela" || x.fase === "encerrada", (x) => (x.pendente!.tipo === "perdaEspaco" ? "emprestimo" : x.pendente!.opcoes[0].id));
    const of = c.pendente?.ofertas?.find((o) => o.tipo === "emprestimo");
    if (!of) continue;
    const origem = c.vinculo!.clubeId;
    c = recarregar(decidir(cat, c, of.id));
    assert.equal(c.emprestimo!.clubeId, of.clubeId);
    assert.equal(c.emprestimo!.origemId, origem);
    assert.equal(c.temporada!.clubeId, of.clubeId);
    c = recarregar(ate(c, (x) => x.fase === "balanco"));
    assert.equal(c.emprestimo, null);
    assert.equal(c.vinculo!.clubeId, origem, "volta ao clube de origem");
    return;
  }
  assert.fail("nenhuma proposta de empréstimo em 80 sementes");
});

test("aposentadoria só encerra depois da confirmação; limite de idade sem 'mais um ano'", () => {
  let c = jogarAutomatico("apos", "ZAGE", 0, (x) => x.pendente!.tipo === "aposentadoria" ? (x.pendente!.opcoes.some((o) => o.id === "continuar") ? "continuar" : "encerrar") : x.pendente!.opcoes[0].id);
  assert.ok(c.decisoes.some((d) => d.tipo === "aposentadoria" && d.opcao === "continuar"), "jogou mais um ano antes");
  assert.equal(c.fase, "encerrada");
  const idade = c.ano - c.atleta.anoNascimento;
  assert.ok(idade >= CONFIG.idadeAposentadoriaVoluntaria && idade <= CONFIG.idadeLimite);
  // Antes de confirmar, a carreira não termina.
  let d = assinarPrimeiroContrato(cat, novaCarreira(cat, { semente: "apos2", nacionalidade: "BR", numero: 4, posicao: "ZAGD" }), sugestoesIniciais(cat, novaCarreira(cat, { semente: "apos2", nacionalidade: "BR", numero: 4, posicao: "ZAGD" }))[0]);
  d = ate(d, (x) => x.fase === "aposentadoria");
  assert.equal(d.fase, "aposentadoria");
  assert.notEqual(d.fase, "encerrada");
  const salvo = recarregar(d);
  assert.deepEqual(salvo.pendente!.opcoes.map((o) => o.id).includes("encerrar"), true);
  assert.equal(decidir(cat, salvo, "encerrar").fase, "encerrada");
});

test("primeira convocação é marco único", () => {
  for (let s = 0; s < 40; s++) {
    const c = jogarAutomatico("conv" + s, "CA", 0);
    if (c.convocado) {
      assert.equal(c.marcos.filter((m) => m.tipo === "convocacao").length, 1);
      assert.equal(c.decisoes.filter((d) => d.tipo === "convocacao").length, 1);
      return;
    }
  }
  assert.fail("nenhuma convocação em 40 carreiras");
});

test("save: migra v0, recusa versão futura e lixo", () => {
  const c = jogarAutomatico("mig", "LD");
  const v0 = JSON.parse(JSON.stringify(c));
  delete v0.schema; delete v0.chavesUsadas;
  const m = migrarSave(v0)!;
  assert.equal(m.schema, 3);
  assert.deepEqual(m.chavesUsadas, []);
  assert.equal(migrarSave({ ...c, schema: 99 }), null);
  assert.equal(migrarSave("x"), null);
  assert.equal(migrarSave({ schema: 1 }), null);
});

test("utilitários: intervalo de minutos e nacionalidade sugerida", () => {
  assert.deepEqual(intervaloMinutos(0.55), [45, 65]);
  assert.deepEqual(intervaloMinutos(0), [0, 10]);
  assert.equal(sugerirNacionalidade(["pt-BR"]), "BR");
  assert.equal(sugerirNacionalidade(["es-AR", "es"]), "AR");
  assert.equal(sugerirNacionalidade(["fr-CA"]), "FR");
  assert.equal(sugerirNacionalidade(["zz"]), "BR");
  assert.equal(POS.MEI.nome, "Meia");
});
