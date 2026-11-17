// PARIDADE-CPU · E0 (17/11/2026) — confirma no motor de hoje os achados
// A1–A12 e A14 do plano (docs/paridade-cpu/PLANO_DESENVOLVIMENTO.md, seção 2). O
// A13 (limite do save) sai do paridade_baseline.js.
// Sob demanda, fora da suíte padrão: cada etapa da paridade MUDA de propósito
// o que este roteiro confere. Quando uma etapa corrige um achado, o item dele
// passa a falhar ("não confirmado"), e o relatório da etapa registra isso.
// Sem navegador, pela ponte (_sem_tela.js), num servidor isolado com o
// catálogo real congelado.
// Uso (da raiz; porta 8787 livre): node tests/sim/paridade_achados.js
const { subirServidor, derrubarServidor } = require("./_servidor");

const resultado = [];
function achado(id, texto, ok, evidencia) {
  resultado.push({ id, texto, confirmado: !!ok, evidencia });
  console.log(`${id}) ${texto}: ${ok ? "confirmado" : "NÃO confirmado"}\n   ${JSON.stringify(evidencia)}`);
}
const SEED = 11;

// Código rodado dentro da página (window.BRDATA_MOTOR).
const MOTOR = "const M = window.BRDATA_MOTOR, E = M.estado, F = M.fechamento, C = E.carreiraAtual();";
// Um clube CPU da sua divisão que, na rodada dada, joga contra outro CPU.
const CLUBE_CPU = (rodada) => `(() => { ${MOTOR} const fx = (C.schedule[${rodada}] || []).find((f) => String(f.home) !== String(C.clubId) && String(f.away) !== String(C.clubId)); return fx; })()`;
const soma = (campo) => `((lista) => lista.reduce((s, p) => s + (p.${campo} || 0), 0))`;

async function novaPagina() {
  const { abrirPagina } = require("../e2e/_sem_tela");
  const pg = await abrirPagina({ semente: SEED });
  if (!pg.pronta) throw new Error("ponte não ficou pronta");
  const comp = await pg.P.escolherCompeticao("brasileirao");
  await pg.P.criarCarreira(comp.clubes[0].id);
  pg.ler = (codigo) => JSON.parse(pg.rodar(`JSON.stringify(${codigo})`, "achados"));
  return pg;
}

(async () => {
  const srv = await subirServidor({ DATA_PROVIDER: "frozen" });
  try {
    const { jogarRodada } = require("../e2e/_sem_tela");
    // Duas carreiras iguais (mesma seed, mesmo clube).
    const a = await novaPagina();
    const b = await novaPagina();
    const fx = a.ler(CLUBE_CPU(1));
    const X = String(fx.home);

    // A2 — escalação da CPU: molde fixo 1-4-4-2, sem banco, ignora condição.
    const a2 = a.ler(`(() => { ${MOTOR}
      const sq = C.leagueSquads[${JSON.stringify(X)}].map((p) => ({ ...p }));
      const xi = F.pickCpuXI(sq);
      const grupos = xi.reduce((o, p) => (o[p.group] = (o[p.group] || 0) + 1, o), {});
      const melhorD = xi.find((p) => p.group === "D");
      melhorD.condition = 5;
      const xi2 = F.pickCpuXI(sq);
      return { molde: F.CPU_XI_MIX, grupos, tamanho: xi.length, elenco: sq.length, exausto: { condicao: 5, escaladoMesmoAssim: xi2.some((p) => p.id === melhorD.id) } };
    })()`);
    achado("A2", "A CPU escala pelo molde fixo 1-4-4-2 por overall, sem banco e sem olhar a condição",
      a2.tamanho === 11 && JSON.stringify(a2.grupos) === JSON.stringify({ G: 1, D: 4, M: 4, F: 2 }) && a2.exausto.escaladoMesmoAssim, a2);

    // A1 — força da CPU: o placar do jogo CPU × CPU não muda com o elenco.
    // Na carreira B, o elenco de X vira overall 30 (atk/def 20); mesma seed.
    b.rodar(`(() => { ${MOTOR} C.leagueSquads[${JSON.stringify(X)}].forEach((p) => { p.overall = 30; p.atk = 20; p.def = 20; }); })()`, "achados");
    const ra = await jogarRodada(a.P), rb = await jogarRodada(b.P);
    const placar = (pg) => pg.ler(`(() => { ${MOTOR} const r = (C.resultsByRound[1] || []).find((x) => String(x.home) === ${JSON.stringify(X)} || String(x.away) === ${JSON.stringify(X)}); return r ? [r.gh, r.ga] : null; })()`);
    const pa = placar(a), pb = placar(b);
    achado("A1", "A força da CPU é só a do clube: com o elenco inteiro rebaixado a overall 30, o mesmo jogo (mesma seed) dá o mesmo placar",
      ra.ok && rb.ok && pa && pb && pa[0] === pb[0] && pa[1] === pb[1], { clube: X, placarNormal: pa, placarElencoRebaixado: pb });

    // A3 — ao vivo, o XI da CPU não muda (só sai expulso).
    await a.P.avancarSemana(true);
    let i = a.P.iniciar();
    if (i && i.motivo === "escalacao") { await a.P.escalarAutomaticamente(true); i = a.P.iniciar(); }
    const xiInicio = a.ler(`(() => { ${MOTOR} const lm = E.partidaAtual(); window.__lm = lm; return lm && lm.cpuXI ? lm.cpuXI.map((p) => p.id) : null; })()`);
    a.P.pularParaFim();
    const { ate } = require("../e2e/_sem_tela");
    await ate(() => { const e = a.P.estado(); return e.fase === "encerrada" && e.gravada != null; }, 60000);
    const a3 = a.ler(`(() => { ${MOTOR} const lm = window.__lm; return { xiFim: lm.cpuXI.map((p) => p.id), expulsosCpu: lm.expulsosCpu || 0, trocasCpu: (lm.events || []).filter((e) => !e.mine && /sub/i.test(e.type || "")).length }; })()`);
    achado("A3", "Na partida ao vivo, o XI da CPU fica o mesmo do início ao fim (só o expulso sai); nenhuma substituição da CPU",
      xiInicio && a3.trocasCpu === 0 && a3.xiFim.every((id) => xiInicio.includes(id)) && xiInicio.length - a3.xiFim.length === a3.expulsosCpu,
      { inicio: xiInicio.length, fim: a3.xiFim.length, expulsosCpu: a3.expulsosCpu, trocasCpu: a3.trocasCpu });
    // Termina a rodada 2.
    let etapa = a.P.iniciarPosJogo();
    for (let n = 0; etapa && etapa.ok !== false && etapa.etapa !== "fim" && n < 12; n++) {
      if (etapa.etapa === "coletiva") etapa = await a.P.responderColetiva(etapa.respostas[0].letra);
      else if (etapa.etapa === "noticias" || etapa.etapa === "resultados") etapa = a.P.concluirEtapa(etapa.etapa);
      else if (etapa.etapa === "proposta") etapa = await a.P.responderProposta("recusar");
      else break;
    }
    a.P.encerrarPosJogo();

    // A4 / A5 — condição e lesão da CPU: um reserva cansado e um lesionado
    // que já deveria voltar, contra o mesmo caso no seu elenco.
    const prep = a.ler(`(() => { ${MOTOR}
      const fx3 = (C.schedule[C.currentRound] || []).find((f) => String(f.home) !== String(C.clubId) && String(f.away) !== String(C.clubId));
      const Y = String(fx3.home), sq = C.leagueSquads[Y];
      const xi = new Set(F.pickCpuXI(sq).map((p) => p.id));
      const res = sq.filter((p) => !xi.has(p.id) && p.status === "ok");
      res[0].condition = 50;
      res[1].status = "contundido"; res[1].outUntilRound = C.currentRound; res[1].injurySeverity = "leve";
      const meusRes = C.squad.filter((p) => !C.lineup.starters.includes(p.id) && p.status === "ok");
      meusRes[0].condition = 50;
      meusRes[1].status = "contundido"; meusRes[1].outUntilRound = C.currentRound; meusRes[1].injurySeverity = "leve";
      return { Y, cansado: res[0].id, lesionado: res[1].id, meuCansado: meusRes[0].id, meuLesionado: meusRes[1].id, rodada: C.currentRound };
    })()`);
    for (let n = 0; n < 3; n++) await jogarRodada(a.P);
    const depois = a.ler(`(() => { ${MOTOR}
      const sq = C.leagueSquads[${JSON.stringify(prep.Y)}];
      const p = (id) => sq.find((x) => x.id === id) || C.squad.find((x) => x.id === id) || {};
      return { rodada: C.currentRound, cpuCansado: p(${JSON.stringify(prep.cansado)}).condition, cpuLesionado: p(${JSON.stringify(prep.lesionado)}).status,
        meuCansado: p(${JSON.stringify(prep.meuCansado)}).condition, meuLesionado: p(${JSON.stringify(prep.meuLesionado)}).status };
    })()`);
    achado("A4", "A condição do jogador da CPU não se recupera: o reserva com 50 de condição continua com 50 depois de 3 rodadas (o seu se recupera)",
      depois.cpuCansado === 50 && depois.meuCansado > 50, { rodadas: [prep.rodada, depois.rodada], cpu: depois.cpuCansado, seu: depois.meuCansado });
    achado("A5", "Lesão da CPU não acaba durante a temporada: o lesionado que já deveria voltar continua fora depois de 3 rodadas (o seu volta)",
      depois.cpuLesionado === "contundido" && depois.meuLesionado === "ok", { cpu: depois.cpuLesionado, seu: depois.meuLesionado });

    // A6 — outras divisões: só o placar (nenhum jogador joga).
    const fotoJogadores = (pg) => pg.ler(`(() => { ${MOTOR}
      const outra = Object.values(C.otherDivisions || {})[0];
      const idsOutra = new Set(Object.keys(outra.standings || {}).length ? (Array.isArray(outra.standings) ? outra.standings.map((r) => String(r.id)) : Object.keys(outra.standings)) : []);
      const sqOutra = Object.entries(C.leagueSquads).filter(([id]) => idsOutra.has(String(id))).flatMap(([, s]) => s);
      const idsMinha = new Set((Array.isArray(C.standings) ? C.standings.map((r) => String(r.id)) : Object.keys(C.standings)).filter((id) => id !== String(C.clubId)));
      const sqMinha = Object.entries(C.leagueSquads).filter(([id]) => idsMinha.has(String(id))).flatMap(([, s]) => s);
      const f = (l) => ({ jogos: ${soma("apps")}(l), gols: ${soma("goalsCareer")}(l), amarelos: ${soma("yellowCards")}(l), condicao: ${soma("condition")}(l) });
      return { outra: f(sqOutra), minha: f(sqMinha), clubesOutra: idsOutra.size };
    })()`);
    const f0 = fotoJogadores(a);
    await jogarRodada(a.P);
    const f1 = fotoJogadores(a);
    achado("A6", "Outras divisões fecham a rodada só com o placar: nenhum jogador delas joga, marca, leva cartão ou cansa (na sua divisão, sim)",
      JSON.stringify(f0.outra) === JSON.stringify(f1.outra) && (f1.minha.gols !== f0.minha.gols || f1.minha.condicao !== f0.minha.condicao),
      { outraAntes: f0.outra, outraDepois: f1.outra, minhaAntes: f0.minha, minhaDepois: f1.minha });

    // A7 — Copa simulada entre dois clubes da CPU: ninguém leva cartão nem cansa.
    const a7 = a.ler(`(() => { ${MOTOR}
      const ids = (Array.isArray(C.standings) ? C.standings.map((r) => String(r.id)) : Object.keys(C.standings)).filter((id) => id !== String(C.clubId)).slice(0, 2);
      const l = () => ids.flatMap((id) => C.leagueSquads[id]);
      const f = () => ({ amarelos: ${soma("yellowCards")}(l()), condicao: ${soma("condition")}(l()), gols: ${soma("goalsCareer")}(l()) });
      const antes = f();
      const r = F.simulateCupLeg(ids[0], ids[1], C.currentRound);
      return { antes, depois: f(), placar: r && [r.gh, r.ga] };
    })()`);
    achado("A7", "Na Copa simulada, só o seu lado leva cartão e desgaste: num jogo de Copa entre dois clubes da CPU, nenhum jogador muda",
      JSON.stringify(a7.antes) === JSON.stringify(a7.depois), a7);

    // A9 — mercado CPU × CPU: 0 a 2 transferências sorteadas por rodada.
    const a9 = a.ler(`(() => { ${MOTOR} const fonte = M.semana.simulateAiTransfers.toString(); return { sorteioPorRodada: /Math\\.random\\(\\) < 0\\.35/.test(fonte) && /Math\\.random\\(\\) < 0\\.08/.test(fonte), usaAvaliadoresDaFase1: /reservaParaProposta|avaliacaoAtleta/.test(fonte) }; })()`);
    achado("A9", "O mercado CPU × CPU tem fluxo próprio sorteado (35% de 1 e 8% de 2 transferências por rodada) e não usa os avaliadores de você × CPU",
      a9.sorteioPorRodada && !a9.usaAvaliadoresDaFase1, a9);

    // A10 — orçamento da CPU derivado na hora (folha × 1,35; caixa = 6 × teto).
    const a10 = a.ler(`(() => { ${MOTOR}
      const id = Object.keys(C.leagueSquads)[0], sq = C.leagueSquads[id];
      const b = M.mercado.clubBudget({ squad: sq });
      const folha = sq.reduce((s, p) => s + (p.wage || 0), 0);
      const chaves = Object.keys(C).filter((k) => /financ|budget|caixa|cash/i.test(k));
      return { teto: b.wageCap, esperadoTeto: Math.round(folha * 1.35 / 1000) * 1000, caixa: b.cash, esperadoCaixa: Math.round(b.wageCap * 6 / 1000) * 1000, chavesDeFinancasNoSave: chaves };
    })()`);
    achado("A10", "A CPU não tem caixa nem folha guardados: o orçamento é derivado da folha na hora (teto = folha × 1,35; caixa = 6 × teto)",
      a10.teto === a10.esperadoTeto && a10.caixa === a10.esperadoCaixa && a10.chavesDeFinancasNoSave.every((k) => ["finances", "financeLedger", "cashHistory"].includes(k)), a10);

    // A11 — moral da CPU parada em 70 depois de 6 rodadas.
    const a11 = a.ler(`(() => { ${MOTOR}
      const todos = Object.values(C.leagueSquads).flat();
      const minhas = new Set(C.squad.map((p) => p.morale));
      return { jogadoresCpu: todos.length, moralDiferenteDe70: todos.filter((p) => p.morale !== 70).length, valoresNoSeuElenco: minhas.size, rodada: C.currentRound };
    })()`);
    achado("A11", "A CPU não tem moral: depois de 6 rodadas, todo jogador da CPU segue com moral 70 (no seu elenco, ela varia)",
      a11.moralDiferenteDe70 === 0 && a11.valoresNoSeuElenco > 1, a11);

    // A8 — Série D: grupo fixo; o elenco é gerado sob demanda, sempre igual,
    // e só vai para o save quando o clube enfrenta você na Copa.
    const a8 = a.ler(`(() => { ${MOTOR}
      const d = (C.serieDPool || [])[0], gerar = E.ganchosMundo.elencoGerado;
      const e1 = gerar(d).map((p) => p.id + ":" + p.overall).join(","), e2 = gerar(d).map((p) => p.id + ":" + p.overall).join(",");
      return { poolSerieD: (C.serieDPool || []).length, elencoGeradoIgual: e1 === e2, jogadores: gerar(d).length, guardadosNoSave: Object.keys(C.elencosSerieD || {}).length,
        soAdversarioDaCopa: /materializarAdversarioDaCopa/.test(Object.keys(F).join(",")) };
    })()`);
    achado("A8", "Série D: clubes de um grupo fixo (serieDPool), elenco gerado sob demanda e sempre igual; só vai para o save o adversário do seu time na Copa",
      a8.poolSerieD > 0 && a8.elencoGeradoIgual && a8.soAdversarioDaCopa, a8);

    // A12 — aceitar outro clube recomeça o mundo da carreira.
    const a12a = a.ler(`(() => { ${MOTOR}
      const ids = (Array.isArray(C.standings) ? C.standings.map((r) => String(r.id)) : Object.keys(C.standings)).filter((id) => id !== String(C.clubId));
      const novo = ids[0], outro = ids[1];
      C.clubProposals = [{ clubId: novo, clubName: "?", reputationRequired: 0, budgetOffered: 1000000, seasonYear: C.seasonYear }];
      return { novo, outro, anterior: String(C.clubId), rodada: C.currentRound, jogosOutro: ${soma("apps")}(C.leagueSquads[outro]), golsOutro: ${soma("goalsCareer")}(C.leagueSquads[outro]), pontos: (Array.isArray(C.standings) ? C.standings : Object.values(C.standings)).reduce((s, r) => s + (r.pts || 0), 0) };
    })()`);
    const aceite = await a.P.aceitarPropostaClube();
    const a12b = a.ler(`(() => { ${MOTOR} const sq = C.leagueSquads[${JSON.stringify(a12a.outro)}] || []; return { clube: String(C.clubId), rodada: C.currentRound, jogosOutro: ${soma("apps")}(sq), golsOutro: ${soma("goalsCareer")}(sq), pontos: (Array.isArray(C.standings) ? C.standings : Object.values(C.standings)).reduce((s, r) => s + (r.pts || 0), 0) }; })()`);
    achado("A12", "Aceitar outro clube monta uma carreira nova: rodada, tabela e números dos jogadores dos outros clubes recomeçam",
      aceite && aceite.ok && a12b.clube === a12a.novo && a12b.rodada === 1 && a12b.pontos === 0 && a12b.golsOutro < a12a.golsOutro,
      { aceite: aceite && aceite.ok, antes: a12a, depois: a12b });

    // A14 — elencos da CPU se esvaziam na virada: sai quem tem contrato
    // vencido (sem renovação) e os gerados para repor nascem com contrato
    // contado do ano do catálogo (temporadaReal), não do ano da carreira.
    // Na carreira B (a do A1), duas viradas.
    const fotoCpu = () => b.ler(`(() => { ${MOTOR}
      const t = Object.values(C.leagueSquads).flat();
      return { ano: C.seasonYear, jogadores: t.length, reais: t.filter((p) => p.real).length, overall: Math.round(t.reduce((s, p) => s + p.overall, 0) / t.length * 10) / 10,
        geradosComContratoJaVencido: t.filter((p) => !p.real && p.contractUntil < C.seasonYear).length };
    })()`);
    const v0 = fotoCpu();
    for (let virada = 0; virada < 2; virada++) {
      for (let g = 0; g < 45 && b.ler(`(() => { ${MOTOR} return C.currentRound <= Object.keys(C.schedule).length; })()`); g++) await jogarRodada(b.P);
      await b.P.proximaTemporada();
    }
    const v2 = fotoCpu();
    achado("A14", "Os elencos da CPU encolhem e enfraquecem a cada virada: quem tem contrato vencido sai sem renovar e os repostos nascem com contrato já vencido",
      v2.jogadores < v0.jogadores && v2.overall < v0.overall && v2.geradosComContratoJaVencido > 0, { inicio: v0, depoisDeDuasViradas: v2 });
  } finally {
    await derrubarServidor(srv);
  }
  const ok = resultado.filter((r) => r.confirmado).length;
  console.log(`\n${ok}/${resultado.length} achados confirmados no motor de hoje.`);
  process.exit(ok === resultado.length ? 0 : 1);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
