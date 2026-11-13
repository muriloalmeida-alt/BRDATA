// GE-BALANCE-001 (issue #26) — mecanismo "adversário motivado"
// (opponentMotivationMod): os degraus da função pura, o aviso pré-partida
// (princípio de explicabilidade, CLAUDE.md §45) e que uma carreira nova (sem
// sequência) continua sem esse bônus.
// Lote L4c (sem a tela antiga): pelo motor na página da v2. O aviso antes da
// partida é o evento "aviso" do motor (antes, o toast da tela antiga). A v2
// ainda não mostra esse aviso na tela: registrado no relatório do L4
// (docs/carreira-v2/ENTREGA_TESTES_L4.md) para decisão.
//  1) Degraus de opponentMotivationMod.
//  2) Carreira nova (sem sequência): a partida começa sem o aviso.
//  3) Sequência de 14 jogos invicto: o aviso "Adversário motivado" (com 14)
//     sai antes da partida.
//  4) A partida com o adversário motivado termina e grava (rodada avança).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor, noMotor, jogarRodadaV2 } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `gebalance001${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  const steps = await page.evaluate(() => {
    const out = {};
    [0, 4, 5, 7, 8, 11, 12, 20].forEach((s) => { CAREER.currentUnbeatenStreak = s; out[s] = opponentMotivationMod(); });
    CAREER.currentUnbeatenStreak = 0;
    return out;
  });
  const stepsOk = steps[0] === 1 && steps[4] === 1 && steps[5] === 1.04 && steps[7] === 1.04
    && steps[8] === 1.08 && steps[11] === 1.08 && steps[12] === 1.12 && steps[20] === 1.12;
  check("1) Degraus de opponentMotivationMod batem com a especificação:", stepsOk, JSON.stringify(steps));

  // Começa a partida da semana com a sequência `seq` e devolve os avisos
  // emitidos ao começar; depois termina a partida (pular para o fim).
  const partida = (seq) => noMotor(page, async ({ CAREER, ponte }, seq) => {
    const { ouvir } = await import("/js/motor/eventos.js");
    const ate = async (cond, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = cond(); if (v) return v; await new Promise((r) => setTimeout(r, 50)); } return null; };
    await ponte.avancarSemana(true);
    CAREER.currentUnbeatenStreak = seq;
    const avisos = [];
    const sair = ouvir("aviso", (a) => avisos.push(a));
    let i = ponte.iniciar();
    if (i && i.motivo === "escalacao") { await ponte.completarEscalacao(); i = ponte.iniciar(); }
    sair();
    const rodada = CAREER.currentRound;
    ponte.pularParaFim();
    const fim = await ate(() => { const e = ponte.estado(); return e.fase === "encerrada" && e.gravada != null ? e : null; });
    return { iniciou: !!(i && i.ok), avisos, rodada, gravada: fim && fim.gravada };
  }, seq);

  // 2) Sem sequência.
  const p2 = await partida(0);
  check("2) Carreira nova (sem sequência): a partida começa sem o aviso 'Adversário motivado':",
    p2.iniciou && !p2.avisos.some((a) => a.titulo === "Adversário motivado"), JSON.stringify(p2.avisos));
  // Fecha o pós-jogo desta rodada antes da próxima.
  await noMotor(page, async ({ ponte }) => {
    let etapa = ponte.iniciarPosJogo();
    for (let n = 0; etapa && etapa.ok !== false && etapa.etapa !== "fim" && n < 12; n++) {
      if (etapa.etapa === "coletiva") etapa = await ponte.responderColetiva(etapa.respostas[0].letra);
      else if (etapa.etapa === "noticias" || etapa.etapa === "resultados") etapa = ponte.concluirEtapa(etapa.etapa);
      else if (etapa.etapa === "proposta") etapa = await ponte.responderProposta("recusar");
      else break;
    }
    ponte.encerrarPosJogo();
  });

  // 3 e 4) Sequência de 14.
  const p3 = await partida(14);
  const aviso = p3.avisos.find((a) => a.titulo === "Adversário motivado");
  check("3) Sequência de 14 jogos invicto: o aviso 'Adversário motivado' (com o 14) sai antes da partida:", p3.iniciou && !!aviso && /14/.test(aviso.detalhe || ""), JSON.stringify(p3.avisos));
  const depois = await noMotor(page, ({ CAREER }) => CAREER.currentRound);
  check("4) A partida com o adversário motivado termina e grava (rodada avançou):", p3.gravada === true && depois === p3.rodada + 1, JSON.stringify({ gravada: p3.gravada, antes: p3.rodada, depois }));

  check("5) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
