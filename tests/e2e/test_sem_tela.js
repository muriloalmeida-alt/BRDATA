// Plano "sem página escondida", etapa A (07/11): o jogo roda SEM TELA.
// Carrega public/js/data.js, o motor (public/js/motor/) e o carreira.js
// num `vm` do Node com uma tela falsa (_tela_falsa.js) e a API de verdade
// (servidor de testes), e conduz a carreira SÓ pela ponte (BRDATA_PONTE),
// como a v2 faz: cria a carreira, joga a temporada inteira (semanas,
// partidas ao vivo, pós-jogo, Copa, propostas) e vira a temporada.
// Depois joga a mesma carreira duas vezes com o mesmo sorteio, com a
// página desenhando (como antes) e sem tela, e compara os saves: o desenho
// não pode mudar nada do jogo.
// Uso: node tests/e2e/test_sem_tela.js   (servidor em localhost:8787)
//      SEM_TELA_MEDIR=1 mede o tempo gasto desenhando.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { espera, ate, abrirPagina, jogarRodada, criar } = require("./_sem_tela");

const ROOT = path.resolve(__dirname, "../..");
const base = "http://localhost:8787";
const results = [];
function check(name, ok, info) { results.push({ name, ok: !!ok }); console.log(`${name} ${!!ok}${info ? " " + info : ""}`); }
const erros = [];
process.on("unhandledRejection", (e) => erros.push(`promessa: ${e && (e.stack || e.message) || e}`));

const CARREIRA_JS = fs.readFileSync(path.join(ROOT, "public/js/carreira.js"), "utf8");
// "Com tela": o mesmo arquivo, desenhando como antes da etapa A. A
// narração da partida ao vivo (pickCommentary), que só existe no desenho,
// sorteava o texto com o mesmo Math.random do jogo; aqui ela ganha um
// sorteio próprio, para a comparação mostrar que esse era o único efeito
// do desenho no jogo.
const NARRACAO = "let idx = Math.floor(Math.random() * bank.length);";
if (!CARREIRA_JS.includes(NARRACAO) || !CARREIRA_JS.includes("const SEM_TELA = V2_PONTE;")) throw new Error("carreira.js mudou: ajustar test_sem_tela.js");
const CARREIRA_COM_TELA = CARREIRA_JS
  .replace("const SEM_TELA = V2_PONTE;", "const SEM_TELA = false;\nlet __narracaoSeed = 7; const __sorteioNarracao = () => ((__narracaoSeed = (__narracaoSeed * 16807) % 2147483647) / 2147483647);")
  .replace(NARRACAO, "let idx = Math.floor(__sorteioNarracao() * bank.length);");

// Uma conta nova e a página /carreira/motor dela, sem navegador.
(async () => {
  // ---------- 1. Uma carreira inteira sem tela ----------
  const pg = await abrirPagina({ medir: !!process.env.SEM_TELA_MEDIR });
  check("1) A ponte fica pronta sem navegador (login, boot e motor):", pg.pronta && pg.P, erros.slice(0, 2).join(" | "));
  if (!pg.P) { console.log("FATAL: sem BRDATA_PONTE"); process.exit(1); }
  const { P, api } = pg;
  const criada = await criar(P);
  const salvo0 = await api("/api/career");
  check("2) Cria a carreira pela ponte e o servidor guarda o save:", criada && criada.ok && salvo0 && salvo0.career, JSON.stringify(criada));

  const r1 = await jogarRodada(P);
  const depois1 = await api("/api/career");
  check("3) Uma rodada inteira pela ponte (semana, partida ao vivo, pós-jogo) e o save avança:",
    r1.ok && depois1.career && depois1.career.currentRound === 2, r1.passos.join(" "));

  const falhas = [];
  let rodadas = 1;
  while (rodadas < 38) {
    const r = await jogarRodada(P);
    if (!r.ok) { falhas.push(`rodada ${rodadas + 1}: ${r.passos.join(" ")}`); break; }
    rodadas++;
  }
  const fimTemporada = await api("/api/career");
  check("4) A temporada inteira (38 rodadas) pela ponte, com o save no servidor depois da 38ª:",
    !falhas.length && fimTemporada.career && fimTemporada.career.currentRound === 39, falhas.join(" | ") || `rodadas=${rodadas}`);

  const virada = await P.proximaTemporada();
  const novo = await api("/api/career");
  check("5) A virada de temporada pela ponte grava a temporada nova (rodada 1, ano +1):",
    virada && virada.ok && novo.career && novo.career.currentRound === 1 && novo.career.seasonYear === fimTemporada.career.seasonYear + 1,
    JSON.stringify(virada && { ok: virada.ok, demitido: virada.demitido, ano: virada.ano, motivo: virada.motivo }));

  const r2 = await jogarRodada(P);
  check("6) Depois da virada, a 1ª rodada da temporada nova também roda pela ponte:", r2.ok, r2.passos.join(" "));

  // Substituição e tática ao vivo pela ponte, sem tela (antes elas passavam
  // pelo modal desta página).
  {
    const ler = (expr) => JSON.parse(pg.rodar(`JSON.stringify(${expr}) || "null"`, "ler"));
    await P.avancarSemana(true);
    await P.escalarAutomaticamente(); // titulares e banco completos, como o técnico faria
    const i = P.iniciar();
    P.pausar();
    const antes = ler("{ starters: CAREER.lineup.starters, bench: CAREER.lineup.bench, formation: CAREER.lineup.formation, tactics: CAREER.lineup.tactics }");
    const sai = antes.starters.find(Boolean);
    const entra = ler("CAREER.lineup.bench.find((id) => (CAREER.squad.find((p) => p.id === id) || {}).status === 'ok')");
    const sub = P.substituir(sai, entra);
    const formacao = antes.formation === "4-4-2" ? "4-3-3" : "4-4-2";
    const tat = P.aplicarTatica({ formacao, eixos: { pressao: 5, ritmo: 1, estiloPasse: 9 } });
    const depois = ler("{ starters: CAREER.lineup.starters, bench: CAREER.lineup.bench, formation: CAREER.lineup.formation, tactics: CAREER.lineup.tactics, subs: LIVE_MATCH && LIVE_MATCH.subsUsed, pausada: LIVE_MATCH && LIVE_MATCH.paused, penal: LIVE_MATCH && LIVE_MATCH.formationPenaltyChunksLeft, lance: LIVE_MATCH && LIVE_MATCH.events.filter((e) => e.type === 'substituicao').length }");
    const estado = P.estado();
    const okSub = sub.ok && depois.starters.includes(entra) && !depois.starters.includes(sai) && depois.bench.includes(sai) && depois.subs === 1 && depois.lance === 1;
    const okTat = tat.ok && depois.formation === formacao && depois.tactics.pressao === 5 && depois.tactics.ritmo === 1
      && depois.tactics.estiloPasse === (antes.tactics.estiloPasse || 3) && depois.tactics.linhaDefensiva === (antes.tactics.linhaDefensiva || 3) && depois.penal > 0;
    const okEventos = (estado.eventos || []).some((e) => e.tipo === "substituicao" && e.meu);
    P.pularParaFim();
    const est = await ate(() => { const e = P.estado(); return e.fase === "encerrada" && e.gravada != null ? e : null; }, 60000);
    let etapa = P.iniciarPosJogo();
    for (let n = 0; etapa && etapa.ok !== false && etapa.etapa !== "fim" && n < 12; n++) {
      if (etapa.etapa === "coletiva") etapa = await P.responderColetiva(null);
      else if (etapa.etapa === "noticias" || etapa.etapa === "resultados") etapa = P.concluirEtapa(etapa.etapa);
      else if (etapa.etapa === "proposta") etapa = await P.responderProposta("recusar");
      else break;
    }
    P.encerrarPosJogo();
    const gravado = (await api("/api/career")).career;
    check("7) Substituição e tática ao vivo pela ponte, sem tela: troca feita, eixo inválido ignorado, custo de familiaridade, partida parada, lance na ponte e tudo gravado:",
      i.ok && okSub && okTat && depois.pausada && okEventos && est && est.gravada && gravado.lineup.formation === formacao && gravado.lineup.tactics.pressao === 5,
      JSON.stringify({ sub, tat, okSub, okTat, pausada: depois.pausada, okEventos, gravada: est && est.gravada }));
  }

  // ---------- Etapa B: o save mora em motor/estado.js, com versão ----------
  {
    const mesmoObjeto = pg.rodar("CAREER === window.BRDATA_MOTOR.estado.carreiraAtual() && !!CAREER", "estado");
    const salvo = (await api("/api/career")).career;
    check("8) O save mora no módulo de estado (CAREER é o mesmo objeto) e a carreira grava com schemaVersion 1:",
      mesmoObjeto && salvo.schemaVersion === 1, JSON.stringify({ mesmoObjeto, schemaVersion: salvo.schemaVersion }));
    // Save antigo: o mesmo save, sem o campo, gravado direto na API.
    const antigo = { ...salvo }; delete antigo.schemaVersion;
    const put = await fetch(base + "/api/career", { method: "PUT", headers: { "Content-Type": "application/json", cookie: [...pg.sessao.cookies].map(([k, v]) => `${k}=${v}`).join("; ") }, body: JSON.stringify(antigo) });
    const semCampo = (await api("/api/career")).career.schemaVersion === undefined;
    const pg2 = await abrirPagina({ sessao: pg.sessao });
    const naMemoria = pg2.rodar("CAREER && CAREER.schemaVersion", "estado");
    const r = await jogarRodada(pg2.P);
    const depois = (await api("/api/career")).career;
    check("9) Save antigo (sem schemaVersion) abre migrado para a versão 1 e é gravado assim na próxima jogada, sem perder nada:",
      put.ok && semCampo && naMemoria === 1 && r.ok && depois.schemaVersion === 1 && depois.version === 1 && depois.currentRound === salvo.currentRound + 1,
      JSON.stringify({ put: put.status, semCampo, naMemoria, rodada: r.ok, gravado: depois.schemaVersion }));
  }

  // ---------- 2. O desenho não muda o jogo ----------
  // Mesma carreira, mesmo sorteio: com a página desenhando (como antes) e
  // sem tela. Os saves têm de ser iguais (fora os carimbos de hora).
  const RODADAS = 8;
  async function jogarCom(codigo) {
    const p = await abrirPagina({ codigo, semente: 20261107 });
    if (!p.P) return null;
    await criar(p.P);
    for (let k = 0; k < RODADAS; k++) { const r = await jogarRodada(p.P); if (!r.ok) return { erro: r.passos.join(" ") }; }
    return (await p.api("/api/career")).career;
  }
  // Fora da comparação: carimbos de hora (…At, ts) e a hora no id das notificações.
  const volatil = /At$|^ts$/;
  const limpa = (x) => JSON.parse(JSON.stringify(x, (k, v) => (volatil.test(k) && typeof v === "number" ? 0 : typeof v === "string" ? v.replace(/^ntf_\d+_/, "ntf_") : v)));
  const comTela = await jogarCom(CARREIRA_COM_TELA);
  const semTela = await jogarCom(process.env.SEM_TELA_CONTROLE ? CARREIRA_COM_TELA : CARREIRA_JS);
  let diff = "";
  if (comTela && semTela && !comTela.erro && !semTela.erro) {
    const a = limpa(comTela), b = limpa(semTela);
    diff = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).join(",");
  } else diff = JSON.stringify({ comTela: comTela && comTela.erro, semTela: semTela && semTela.erro });
  check(`10) Mesma carreira e mesmo sorteio (${RODADAS} rodadas): o save sem tela é idêntico ao da página desenhando:`,
    comTela && semTela && !comTela.erro && !semTela.erro && diff === "", diff ? `diferem: ${diff}` : `rodada ${semTela && semTela.currentRound}`);

  // ---------- O que a lógica ainda pediu da tela ----------
  console.log("\nO que a lógica pediu da tela (carreira sem tela):");
  console.log("  cliques:", JSON.stringify([...new Set(pg.sinais.cliques)]));
  console.log("  leituras:", JSON.stringify([...pg.sinais.leituras].sort((a, b) => b[1] - a[1]).slice(0, 15)));
  if (pg.desenho.size) {
    const tot = [...pg.desenho.values()].reduce((a, d) => ({ n: a.n + d.n, ms: a.ms + d.ms }), { n: 0, ms: 0 });
    console.log(`  desenho: ${tot.n} chamadas, ${Math.round(tot.ms)} ms;`, JSON.stringify([...pg.desenho].sort((a, b) => b[1].ms - a[1].ms).slice(0, 12).map(([k, d]) => [k, d.n, Math.round(d.ms)])));
  }
  if (erros.length) console.log("Erros:", erros.slice(0, 5).join("\n"));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} ok`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
