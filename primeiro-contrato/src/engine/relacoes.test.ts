// PC-003: diretoria (negociação, compromissos, bônus), técnico (planos com
// janela), imprensa e torcida (declarações, clássico, reencontro), três rotas
// de carreira, jornada completa e migração v2 → v3.
import test from "node:test";
import assert from "node:assert/strict";
import { catalogoDeTeste } from "./teste-catalogo.ts";
import { abrirJanela, assinarPrimeiroContrato, avancar, decidir, negociar, novaCarreira, sugestoesIniciais } from "./carreira.ts";
import { pedidosDisponiveis, termosDoCaminho } from "./negociacao.ts";
import { migrarSave } from "./save.ts";
import { classico } from "./rivalidades.ts";
import { emEuros } from "./financas.ts";
import type { Carreira, Pedido } from "./estado.ts";
import type { Posicao } from "./posicoes.ts";

const cat = catalogoDeTeste();
const recarregar = (c: Carreira) => migrarSave(JSON.parse(JSON.stringify(c)))!;
type Pol = (x: Carreira) => string;
const primeira: Pol = (x) => x.pendente!.opcoes[0].id;

function ate(c: Carreira, cond: (c: Carreira) => boolean, pol: Pol = primeira, max = 900): Carreira {
  for (let i = 0; i < max && !cond(c); i++) {
    if (c.pendente) c = decidir(cat, c, pol(c));
    else if (c.fase === "temporada") c = avancar(cat, c);
    else if (c.fase === "balanco") c = abrirJanela(cat, c);
    else break;
  }
  return c;
}
const iniciar = (semente: string, pos: Posicao, sug = 1) => {
  const c0 = novaCarreira(cat, { semente, nacionalidade: "BR", numero: 9, posicao: pos });
  return assinarPrimeiroContrato(cat, c0, sugestoesIniciais(cat, c0)[sug]);
};
const emJanela = (x: Carreira) => x.pendente?.tipo === "janela";
/** Ficar/renovar: o caminho do clube atual na janela. */
const caminhoAtual = (x: Carreira) => x.pendente!.opcoes.find((o) => o.id === "ficar" || o.id.startsWith("renovacao:"))?.id;

/** Procura (por semente) uma janela em que o pedido dá a resposta esperada. */
function janelaCom(pedido: Pedido, respostas: string[], alvo: (x: Carreira) => string | undefined = caminhoAtual, pos: Posicao = "MEI") {
  for (let s = 0; s < 120; s++) {
    let c = ate(iniciar(`neg-${pedido}-${s}`, pos, s % 3), emJanela);
    for (let tent = 0; tent < 4 && emJanela(c); tent++) {
      const cam = alvo(c);
      if (cam) {
        const of = termosDoCaminho(cat, c, c.pendente!, cam)!;
        if (pedidosDisponiveis(c, of).includes(pedido)) {
          const n = negociar(cat, c, cam, pedido);
          const neg = n.pendente!.negociacoes?.[cam];
          if (neg && respostas.includes(neg.resposta)) return { antes: c, depois: n, cam, neg };
        }
      }
      c = ate(decidir(cat, c, c.pendente!.opcoes[0].id), emJanela);
    }
  }
  throw new Error(`sem cenário para ${pedido} ${respostas}`);
}

test("A: negociar mais espaço, salvar e recarregar; o clube reabre na rodada combinada com minutos e notas reais", () => {
  const { depois, cam, neg } = janelaCom("espaco", ["aceita"]);
  assert.ok(neg.termos?.revisaoRodada, "termos com rodada de revisão");
  // Reabrir recupera a resposta já calculada; não há segunda negociação.
  const rec = recarregar(depois);
  assert.deepEqual(rec.pendente!.negociacoes![cam], neg);
  assert.equal(negociar(cat, rec, cam, "condicoes"), rec);
  let c = decidir(cat, rec, `${cam}#neg`);
  assert.equal(decidir(cat, c, `${cam}#neg`), c, "duplo toque não duplica");
  const cp = c.compromissos.find((x) => x.tipo === "revisaoPapel" && x.estado === "ativo")!;
  assert.ok(cp && cp.rodadaRevisao === neg.termos!.revisaoRodada);
  assert.equal(c.compromissos.filter((x) => x.tipo === "revisaoPapel").length, 1);
  // Avança até a revisão, recarregando no meio.
  c = recarregar(ate(c, (x) => x.temporada!.jogoAtual >= 3 || !!x.pendente, (x) => x.pendente!.tipo === "revisaoCompromisso" ? "conversar" : primeira(x)));
  c = ate(c, (x) => x.pendente?.tipo === "revisaoCompromisso" || x.fase !== "temporada", (x) => x.pendente!.opcoes[0].id);
  if (c.pendente?.tipo !== "revisaoCompromisso") {
    // Mudou de clube ou a temporada acabou: o compromisso precisa estar encerrado com motivo.
    const fim = c.compromissos.find((x) => x.id === cp.id)!;
    assert.notEqual(fim.estado, "ativo"); return;
  }
  const t = c.temporada!;
  assert.equal(t.jogoAtual + 1, cp.rodadaRevisao, "reabre na rodada prevista");
  const minutos = t.partidas.reduce((s, p) => s + p.minutos, 0);
  assert.match(String(c.pendente!.contexto.evidencia), new RegExp(`${minutos} min`), "devolutiva com os minutos reais");
  const d = decidir(cat, recarregar(c), "conversar");
  const fim = d.compromissos.find((x) => x.id === cp.id)!;
  assert.ok(["cumprido", "naoCumprido", "encerrado"].includes(fim.estado));
  assert.ok(fim.evidencia && d.ultimaConsequencia!.includes(String(minutos)));
});

test("A: contraproposta rejeitada mantém a original; proposta retirada expira", () => {
  const rec = janelaCom("condicoes", ["recusa"], (x) => x.pendente!.opcoes[0].id);
  assert.ok(rec.depois.pendente!.opcoes.some((o) => o.id === rec.cam), "original continua válida");
  assert.ok(!rec.depois.pendente!.opcoes.some((o) => o.id === `${rec.cam}#neg`));
  const ret = janelaCom("condicoes", ["retirada"], (x) => x.pendente!.opcoes.find((o) => o.id.startsWith("transferencia:"))?.id);
  assert.ok(!ret.depois.pendente!.opcoes.some((o) => o.id === ret.cam), "proposta retirada sai da janela");
  assert.equal(decidir(cat, ret.depois, ret.cam), ret.depois, "não dá para assinar proposta expirada");
});

test("A: bônus por jogos é pago uma única vez, só com a condição cumprida", () => {
  const { depois, cam, neg } = janelaCom("condicoes", ["alternativa"], caminhoAtual);
  assert.ok(neg.termos?.bonus, "contraproposta com bônus");
  let c = decidir(cat, depois, `${cam}#neg`);
  const meta = c.vinculo!.bonus!.jogos;
  c = ate(c, (x) => x.fase === "balanco");
  const h = c.historico[c.historico.length - 1];
  assert.equal(!!h.bonusPago, h.jogos >= meta, "paga só com a condição");
  const c2 = ate(abrirJanela(cat, c), (x) => x.historico.length > c.historico.length);
  assert.equal(c2.historico.filter((x) => x.bonusPago).length, h.bonusPago ? 1 : 0, "pagamento único");
});

test("A: pedir empréstimo autorizado gera destinos elegíveis; o retorno mantém vínculo e passagem", () => {
  const { depois, neg } = janelaCom("emprestimo", ["aceita"]);
  const emp = depois.pendente!.ofertas!.filter((o) => o.tipo === "emprestimo");
  assert.ok(/Autorizado/.test(neg.razao));
  if (!emp.length) return; // sem destino com vaga e orçamento: a razão diz isso
  const origem = depois.vinculo!.clubeId;
  let c = decidir(cat, depois, emp[0].id);
  assert.equal(c.emprestimo!.origemId, origem);
  c = recarregar(ate(c, (x) => x.fase === "balanco"));
  assert.equal(c.emprestimo, null);
  assert.equal(c.vinculo!.clubeId, origem);
  assert.ok(c.historico[c.historico.length - 1].emprestimo, "passagem preservada");
});

test("A: plano do técnico tem janela de 4 partidas elegíveis e devolutiva com os jogos da janela", () => {
  for (let s = 0; s < 60; s++) {
    let c = ate(iniciar(`plano-${s}`, "VOLE", s % 3), (x) => x.pendente?.tipo === "revisaoPlano" || x.historico.length >= 4);
    if (c.pendente?.tipo !== "revisaoPlano") continue;
    const pl = c.planos.find((x) => x.estado === "ativo")!;
    const t = c.temporada!;
    const janela = t.partidas.filter((p) => p.rodada - 1 >= pl.inicio && p.situacao !== "indisponivel").slice(0, 4);
    assert.equal(janela.length, 4);
    assert.equal(Number(c.pendente.contexto.minutos), janela.reduce((x, p) => x + p.minutos, 0));
    assert.equal(pl.criterio.chave, "defensivas", "volante: desarmes e interceptações");
    const conf = c.atleta.confianca;
    const d = decidir(cat, c, c.pendente.opcoes[0].id);
    const fim = d.planos.find((x) => x.id === pl.id)!;
    assert.notEqual(fim.estado, "ativo");
    if (fim.estado === "amostraInsuficiente") assert.equal(d.atleta.confianca, conf, "amostra insuficiente sem penalização");
    return;
  }
  assert.fail("nenhuma revisão de plano em 60 carreiras");
});

test("B: gol em clássico cadastrado gera a cena de imprensa com manchete fiel ao que foi dito", () => {
  assert.equal(classico("1024", "1095"), "Fla-Flu");
  assert.equal(classico("1024", "3931"), null);
  for (let s = 0; s < 40; s++) {
    const c0 = novaCarreira(cat, { semente: `cl-${s}`, nacionalidade: "BR", numero: 9, posicao: "CA" });
    const clube = ["1024", "303", "800000086", "847030102"][s % 4];
    let c = ate(assinarPrimeiroContrato(cat, c0, clube), (x) => x.pendente?.tipo === "classico" || x.historico.length >= 6,
      (x) => (x.pendente!.tipo === "janela" ? caminhoAtual(x) ?? x.pendente!.opcoes[0].id : x.pendente!.opcoes[0].id));
    if (c.pendente?.tipo !== "classico") continue;
    const p = c.temporada!.partidas[c.temporada!.partidas.length - 1];
    assert.ok(p.gols > 0 && classico(c.temporada!.clubeId, p.adversarioId), "fato registrado: gol contra rival cadastrado");
    c = decidir(cat, c, "grupo");
    assert.ok(c.manchetes.some((m) => m.texto.includes("Clássico se ganha junto")));
    return;
  }
  assert.fail("nenhum gol em clássico em 40 carreiras");
});

test("B: declaração de permanência reaparece após transferência; o ex-clube reage no reencontro", () => {
  let achouDecl = false, achouReencontro = false;
  for (let s = 0; s < 150 && !(achouDecl && achouReencontro); s++) {
    let c = iniciar(`decl-${s}`, (["CA", "MEI", "PD"] as const)[s % 3], s % 3);
    let disse = false;
    c = ate(c, (x) => x.historico.length >= 9, (x) => {
      const p = x.pendente!;
      if (p.tipo === "rumor") { disse = true; return "ficar"; }
      if (p.tipo === "janela") {
        const tr = p.opcoes.find((o) => o.id.startsWith("transferencia:"));
        if (disse && tr) return tr.id; // sai depois de dizer que ficava
        return caminhoAtual(x) ?? p.opcoes[0].id;
      }
      return p.opcoes[0].id;
    });
    if (c.declaracoes.some((d) => d.tipo === "permanencia" && d.reapareceu)) {
      achouDecl = true;
      assert.ok(c.manchetes.some((m) => /disse: ".*" Agora assina com o/.test(m.texto)));
      const saiu = Object.values(c.torcida).some((t) => t.saida === "ruim");
      assert.ok(saiu, "a torcida lembra da saída depois da promessa");
    }
    const reenc = c.historico.flatMap((h) => h.partidas ?? []).find((p) => p.recepcao);
    if (reenc) {
      achouReencontro = true;
      assert.equal(reenc.mandante, false, "reencontro no estádio do ex-clube");
      assert.ok(c.torcida[reenc.adversarioId]?.saida, "ex-clube com saída registrada");
    }
  }
  assert.ok(achouDecl, "declaração reapareceu");
  assert.ok(achouReencontro, "reencontro com recepção");
});

test("C: três rotas com mesma semente e potencial — vantagens e custos plausíveis", () => {
  const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const res: Record<string, { min: number[]; nivel: number[]; rep: number[]; sal: number[]; ofertas: number[] }> = {};
  for (const rota of ["titular", "banco", "emprestimo"]) {
    res[rota] = { min: [], nivel: [], rep: [], sal: [], ofertas: [] };
    for (let s = 0; s < 30; s++) {
      const c0 = novaCarreira(cat, { semente: `rota-${s}`, nacionalidade: "BR", numero: 8, posicao: "MEI" });
      const sug = sugestoesIniciais(cat, c0);
      let ofertas = 0;
      const c = ate(assinarPrimeiroContrato(cat, c0, rota === "titular" ? sug[2] : sug[0]), (x) => x.historico.length >= 6, (x) => {
        const p = x.pendente!;
        if (p.tipo === "perdaEspaco") return rota === "emprestimo" ? "emprestimo" : "treinar";
        if (p.tipo === "janela") {
          ofertas += (p.ofertas ?? []).filter((o) => o.tipo !== "renovacao").length;
          if (rota === "emprestimo") { const e = p.ofertas?.find((o) => o.tipo === "emprestimo"); if (e) return e.id; }
          return caminhoAtual(x) ?? p.opcoes[0].id;
        }
        if (["planoTreinador", "adaptacao", "vagaAberta", "boasEntradas"].includes(p.tipo)) return p.opcoes[p.opcoes.length - 1].id;
        return p.opcoes[0].id;
      });
      const hs = c.historico.slice(0, 6);
      res[rota].min.push(hs.reduce((x, h) => x + h.minutos, 0));
      res[rota].nivel.push(c.atleta.nivel);
      res[rota].rep.push(c.atleta.reputacao);
      res[rota].sal.push(Math.round(emEuros(c.historico[0]?.salario)));
      res[rota].ofertas.push(ofertas);
    }
  }
  const r = Object.fromEntries(Object.entries(res).map(([k, v]) => [k, { minutos: med(v.min), nivel: med(v.nivel), reputacao: med(v.rep), salario: med(v.sal), ofertas: med(v.ofertas) }]));
  console.log(JSON.stringify(r));
  assert.ok(r.titular.minutos > r.banco.minutos, "titular joga mais");
  assert.ok(r.titular.nivel >= r.banco.nivel, "minutos de qualidade evoluem mais");
  assert.ok(r.emprestimo.minutos > r.banco.minutos, "empréstimo dá minutos");
  assert.ok(r.banco.salario >= r.titular.salario, "no primeiro contrato, o banco no clube maior paga mais (em euros)");
  assert.ok(r.banco.ofertas >= 1 && r.titular.reputacao > r.banco.reputacao, "titularidade constrói reputação; o clube maior expõe o atleta ao mercado");
});

test("D: jornada — reserva, empréstimo, ganha espaço, volta com histórico intacto e renegocia o papel", () => {
  for (let s = 0; s < 80; s++) {
    const c0 = novaCarreira(cat, { semente: `jor-${s}`, nacionalidade: "BR", numero: 7, posicao: "PD" });
    let c = assinarPrimeiroContrato(cat, c0, sugestoesIniciais(cat, c0)[0]);
    // 1) começa reserva e pede empréstimo; 2) vai emprestado.
    c = ate(c, (x) => !!x.emprestimo || x.historico.length >= 3, (x) => {
      const p = x.pendente!;
      if (p.tipo === "perdaEspaco") return "emprestimo";
      if (p.tipo === "janela") return p.ofertas?.find((o) => o.tipo === "emprestimo")?.id ?? caminhoAtual(x) ?? p.opcoes[0].id;
      return p.opcoes[0].id;
    });
    if (!c.emprestimo) continue;
    const origem = c.emprestimo.origemId;
    const antes = c.historico.length;
    // 3) temporada no empréstimo; 4) volta ao clube de origem.
    c = recarregar(ate(c, (x) => x.fase === "balanco" && x.historico.length > antes));
    const passagem = c.historico[c.historico.length - 1];
    if (!passagem.emprestimo || passagem.participacao < 0.4) continue; // precisa ganhar espaço
    assert.equal(c.vinculo!.clubeId, origem);
    assert.equal(passagem.jogos, passagem.partidas!.filter((p) => p.minutos > 0).length, "balanço = jogo a jogo");
    // 5) renegocia o papel no clube de origem.
    c = ate(c, emJanela);
    if (!emJanela(c)) continue;
    const cam = caminhoAtual(c);
    if (!cam) continue;
    const n = negociar(cat, c, cam, "espaco");
    const neg = n.pendente!.negociacoes![cam];
    assert.ok(neg.razao.length > 10, "a diretoria responde com razão");
    const op = neg.termos ? `${cam}#neg` : cam;
    c = decidir(cat, n, op);
    assert.equal(c.vinculo!.clubeId, origem, "segue no clube de origem");
    assert.ok(c.historico.some((h) => h.emprestimo && h.clubeId === passagem.clubeId), "histórico do empréstimo intacto");
    return;
  }
  assert.fail("nenhuma jornada completa em 80 sementes");
});

test("migração v2 → v3: relações neutras, vínculo sem salário (não mapeado), pendência preservada", () => {
  const c = ate(iniciar("mig3", "CA"), (x) => !!x.pendente && x.fase === "temporada");
  const v2 = JSON.parse(JSON.stringify(c));
  v2.schema = 2;
  for (const k of ["compromissos", "planos", "declaracoes", "torcida", "manchetes"]) delete v2[k];
  delete v2.vinculo.salario; delete v2.vinculo.bonus; delete v2.temporada.ausencia; delete v2.temporada.reforco;
  const m = migrarSave(v2)!;
  assert.equal(m.schema, 3);
  assert.deepEqual(m.compromissos, []); assert.deepEqual(m.torcida, {});
  assert.equal(m.vinculo!.salario, null);
  assert.deepEqual(m.pendente, JSON.parse(JSON.stringify(c.pendente)));
  const fim = ate(m, (x) => x.historico.length >= 2);
  assert.ok(fim.historico.length >= 2, "a carreira migrada continua");
});
