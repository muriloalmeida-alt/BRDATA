// FASE1-ESC (12/11/2026) — escalação 11 + 11 e orientação da comissão, pelas
// telas da v2 e pelo motor dela (docs/carreira-v2/fase1/01_Requisitos_Escalacao.md).
//  1) Aceite 1: promover um reserva de linha troca as vagas (o antigo titular
//     vai para a vaga dele no banco); ids únicos e 11 + 11 depois de reabrir.
//  2) Aceite 2: a troca que tira o único goleiro do banco pede confirmar a
//     recomposição (as duas trocas numa gravação); sem goleiro disponível,
//     o motivo aparece e nada é gravado.
//  3) Aceite 3: falha de escrita (no aparelho, OFFLINE-001) mantém a escalação inteira anterior (tela e
//     servidor); toque duplo grava uma vez só.
//  4) Aceite 2 / ESC-04: save antigo com banco menor abre em revisão (o que
//     falta e as vagas vazias); a vaga vazia só aceita quem está fora.
//  5) ESC (orientação lateral): a sugestão da comissão usa a mesma troca, traz
//     a recomposição quando precisa e, se a gravação falha, a escalação
//     confirmada volta inteira.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, saveNoServidor, base, falharArmazenamento } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  let puts = 0;
  page.on("request", (r) => { if (r.method() === "PUT" && new URL(r.url()).pathname === "/api/career") puts++; });
  await newCareer(page, `v2esc${Date.now()}@teste.com`);

  // Preparação (dado de teste): escalação 11 + 11 com um goleiro no banco e
  // um 3º goleiro fora da escalação, todos disponíveis.
  const prep = await noMotor(page, async ({ CAREER, persistir }) => {
    const l = CAREER.lineup, na = new Set([...l.starters, ...l.bench]);
    const gks = CAREER.squad.filter((p) => p.group === "G");
    let fora = gks.find((p) => !na.has(p.id));
    if (!fora) { // elenco com 2 goleiros: um 3º, de teste, fora da escalação
      fora = { ...gks[0], id: gks[0].id + "_t3", name: "Goleiro Teste", overall: gks[0].overall - 10 };
      CAREER.squad.push(fora);
    }
    CAREER.squad.forEach((p) => { if (p.group === "G") { p.status = "ok"; p.outUntilRound = null; } });
    await persistir();
    return { gkFora: fora.id, gkBanco: l.bench.find((id) => CAREER.squad.find((p) => p.id === id).group === "G"), bench: l.bench.length };
  });
  const nomeDe = async (id) => noMotor(page, ({ CAREER }, id) => CAREER.squad.find((p) => p.id === id).name, id);
  const lineupServidor = async () => (await saveNoServidor(page)).lineup;
  // Falha de escrita simulada: PUT /api/career abortado (mesmo predicado no
  // route e no unroute, que compara a função por referência).
  const abrirEscalacao = async () => { await page.goto(base + "/escalacao", { waitUntil: "domcontentloaded" }); await page.waitForSelector(".lu-slot", { timeout: 20000 }); };
  const escolher = async (vaga, id) => {
    await page.click(`.lu-slot[href$="vaga=${vaga}"]`);
    await page.waitForSelector(".qs-opt", { timeout: 10000 });
    const nome = await nomeDe(id);
    await page.click(`button.qs-opt[aria-label^="${nome},"]`);
  };

  // 1) Aceite 1.
  await abrirEscalacao();
  const l0 = await lineupServidor();
  const reserva = await noMotor(page, ({ CAREER }) => CAREER.lineup.bench.find((id) => CAREER.squad.find((p) => p.id === id).group === "F"));
  const idxReserva = l0.bench.indexOf(reserva);
  await escolher(9, reserva);
  await page.click(".qs-foot .cta");
  await page.waitForSelector(".lu-slot", { timeout: 15000 });
  await page.goto(base + "/", { waitUntil: "domcontentloaded" }); // reabre: o motor relê o save
  const l1 = await noMotor(page, ({ CAREER }) => CAREER.lineup);
  const ids1 = [...l1.starters, ...l1.bench];
  check("1) Promover reserva de linha: entra na vaga, o antigo titular vai para a vaga dele no banco; ids únicos e 11 + 11 depois de reabrir:",
    l1.starters[9] === reserva && l1.bench[idxReserva] === l0.starters[9] && new Set(ids1).size === 22 && l1.starters.length === 11 && l1.bench.length === 11,
    JSON.stringify({ reserva, saiu: l0.starters[9], banco: l1.bench[idxReserva], unicos: new Set(ids1).size }));

  // 2) Aceite 2: recomposição com confirmação conjunta.
  await abrirEscalacao();
  const putsA = puts;
  await escolher(10, prep.gkBanco);
  await page.click(".qs-foot .cta");
  await page.waitForSelector('[role="alertdialog"]', { timeout: 10000 });
  const sheet = await page.evaluate(() => ({ t: document.querySelector("#qs-rec-t").textContent, d: document.querySelector("#qs-rec-d").textContent }));
  const putsAntesConfirmar = puts - putsA;
  await page.click('[role="alertdialog"] .cta');
  await page.waitForSelector(".lu-slot", { timeout: 15000 });
  const l2 = await lineupServidor();
  check("2) Troca que tira o único goleiro do banco: pede confirmar a recomposição (nada gravado antes); confirmada, grava as duas (goleiro fora entra no banco, 11 + 11):",
    putsAntesConfirmar === 0 && /goleiro/i.test(sheet.t) && sheet.d.includes((await nomeDe(prep.gkFora)).split(" ").pop()) && l2.starters[10] === prep.gkBanco && l2.bench.includes(prep.gkFora) && l2.bench.length === 11 && puts - putsA === 1,
    JSON.stringify({ sheet, putsAntesConfirmar, puts: puts - putsA }));

  // 2b) Sem goleiro disponível fora da escalação: bloqueio explicado, nada
  // gravado. Prepara pelo motor: o goleiro reserva volta ao banco, um
  // atacante volta à vaga 10 e os goleiros de fora ficam suspensos.
  await noMotor(page, async ({ CAREER, persistir }, { gkFora, gkBanco }) => {
    const l = CAREER.lineup;
    // gkBanco volta ao banco (no lugar de gkFora), o atacante volta à vaga 10.
    const ata = CAREER.squad.find((p) => p.group === "F" && !l.starters.includes(p.id) && !l.bench.includes(p.id) && p.status === "ok");
    l.bench[l.bench.indexOf(gkFora)] = gkBanco;
    l.starters[10] = ata.id;
    // Todos os goleiros fora da escalação ficam suspensos.
    CAREER.squad.filter((p) => p.group === "G" && !l.starters.includes(p.id) && !l.bench.includes(p.id)).forEach((f) => { f.status = "suspenso"; f.outUntilRound = CAREER.currentRound + 2; });
    await persistir();
  }, prep);
  await abrirEscalacao();
  const putsB = puts;
  await escolher(10, prep.gkBanco);
  await page.click(".qs-foot .cta");
  await page.waitForSelector(".qs-foot .inline-error", { timeout: 10000 });
  const msgB = await page.textContent(".qs-foot .inline-error");
  check("2b) Sem goleiro disponível para o banco: a troca é bloqueada com o motivo e nada é gravado:", /goleiro/i.test(msgB) && puts === putsB, JSON.stringify({ msgB, puts: puts - putsB }));

  // 3) Aceite 3: falha de escrita e toque duplo.
  await abrirEscalacao();
  const l3 = await lineupServidor();
  const outro = await noMotor(page, ({ CAREER }) => CAREER.lineup.bench.find((id) => CAREER.squad.find((p) => p.id === id).group === "M"));
  // OFFLINE-001: a falha de escrita é a do aparelho (o save principal); a
  // cópia no servidor que falha não é erro para o técnico.
  await falharArmazenamento(page, true);
  await escolher(5, outro);
  await page.click(".qs-foot .cta");
  await page.waitForSelector(".qs-foot .inline-error", { timeout: 10000 });
  await falharArmazenamento(page, false);
  const l3b = await lineupServidor();
  check("3) Falha de escrita: erro na tela e a escalação inteira anterior no servidor:", JSON.stringify(l3b.starters) === JSON.stringify(l3.starters) && JSON.stringify(l3b.bench) === JSON.stringify(l3.bench), "");
  const putsC = puts;
  await page.evaluate(() => { const b = document.querySelector(".qs-foot .cta"); b.click(); b.click(); });
  await page.waitForSelector(".lu-slot", { timeout: 15000 });
  await page.waitForTimeout(500);
  const l3c = await lineupServidor();
  const ids3 = [...l3c.starters, ...l3c.bench];
  check("3b) Toque duplo em Confirmar: grava uma vez só, sem duplicata nem vaga perdida:", puts - putsC === 1 && l3c.starters[5] === outro && new Set(ids3).size === 22 && l3c.bench.length === 11, JSON.stringify({ puts: puts - putsC }));

  // 4) Save antigo com banco menor (7, sem goleiro): revisão.
  await noMotor(page, async ({ CAREER, persistir }) => {
    const l = CAREER.lineup;
    l.bench = l.bench.filter((id) => CAREER.squad.find((p) => p.id === id).group !== "G").slice(0, 7);
    await persistir();
  });
  await abrirEscalacao();
  const rev = await page.evaluate(() => ({ issues: [...document.querySelectorAll(".lu-issues li")].map((li) => li.textContent), vazias: document.querySelectorAll(".lu-res--empty").length }));
  await page.click(".lu-res--empty");
  await page.waitForSelector(".qs-opt", { timeout: 10000 });
  const opcoesForaOk = await page.evaluate(() => [...document.querySelectorAll(".qs-opt")].every((b) => !/titular|no banco/.test(b.getAttribute("aria-label"))));
  await page.click(`button.qs-opt[aria-label^="${await nomeDe(prep.gkBanco)},"]`);
  await page.click(".qs-foot .cta");
  await page.waitForSelector(".lu-slot", { timeout: 15000 });
  const l4 = await lineupServidor();
  check("4) Save antigo (banco 7, sem goleiro): abre em revisão com o que falta e 4 vagas vazias; a vaga vazia só oferece quem está fora e grava o goleiro no banco:",
    rev.issues.some((t) => /11 reservas/.test(t)) && rev.issues.some((t) => /goleiro/.test(t)) && rev.vazias === 4 && opcoesForaOk && l4.bench.length === 8 && l4.bench.includes(prep.gkBanco),
    JSON.stringify({ rev, opcoesForaOk, banco: l4.bench.length }));

  // 5) Orientação da comissão: titular do gol lesionado, goleiro reserva
  // assume, o lesionado vai para o banco → a sugestão traz a recomposição.
  const s5 = await noMotor(page, async ({ CAREER, persistir, virada, ponte }, { gkFora }) => {
    CAREER.lineup = { ...CAREER.lineup, ...virada.autoLineup(CAREER.squad, CAREER.lineup.formation, false) };
    CAREER.squad.forEach((p) => { if (p.group === "G") { p.status = "ok"; p.outUntilRound = null; } });
    const gk = CAREER.squad.find((p) => p.id === CAREER.lineup.starters[0]);
    gk.status = "contundido"; gk.outUntilRound = CAREER.currentRound + 3;
    await persistir();
    if (!CAREER.technicalStaff || !CAREER.technicalStaff.hired) await ponte.executar("contratarComissao");
    const sug = await ponte.comissaoSugestoes();
    const item = (sug.itens || []).find((i) => i.categoria === "escalacao");
    return { item, gkFora, antes: JSON.parse(JSON.stringify({ s: CAREER.lineup.starters, b: CAREER.lineup.bench })) };
  }, prep);
  const rec = s5.item && s5.item.detalhe && s5.item.detalhe.recomposicao;
  // Falha de gravação ao aplicar: a escalação confirmada volta inteira.
  await falharArmazenamento(page, true);
  const falha = await noMotor(page, async ({ CAREER, ponte }, chave) => {
    const r = await ponte.comissaoAplicar("escalacao", chave);
    return { ok: r.ok, s: CAREER.lineup.starters, b: CAREER.lineup.bench };
  }, s5.item && s5.item.chave);
  await falharArmazenamento(page, false);
  const aplicado = await noMotor(page, async ({ CAREER, ponte, escalacao: _ }, chave) => {
    const r = await ponte.comissaoAplicar("escalacao", chave);
    return { ok: r.ok, s: CAREER.lineup.starters, b: CAREER.lineup.bench };
  }, s5.item && s5.item.chave).catch((e) => ({ erro: String(e) }));
  const valida = await noMotor(page, async ({ CAREER }) => {
    const E = await import("/js/motor/escalacao.js");
    return E.validarEscalacao(CAREER.lineup, CAREER.squad, CAREER.currentRound).valida;
  });
  check("5) Orientação da comissão: troca o goleiro lesionado pelo reserva e traz a recomposição (o 3º goleiro no banco); falha de gravação devolve a escalação confirmada; aplicada, a escalação fica válida:",
    s5.item && s5.item.estado === "mudanca" && rec && rec.entra === prep.gkFora && /no banco/.test(s5.item.resumo)
      && !falha.ok && JSON.stringify(falha.s) === JSON.stringify(s5.antes.s) && JSON.stringify(falha.b) === JSON.stringify(s5.antes.b)
      && aplicado.ok && aplicado.b.includes(prep.gkFora) && valida,
    JSON.stringify({ item: s5.item && { estado: s5.item.estado, resumo: s5.item.resumo, rec }, falhaOk: falha.ok, aplicadoOk: aplicado.ok, valida }));

  // 7) Início do jogo bloqueado (decisão do Murilo, 12/11): sem goleiro
  // titular o motor não começa a partida; com titular lesionado, o Pré-jogo
  // mostra o que falta e "Completar automaticamente" no lugar de "Iniciar
  // partida"; completar troca só a vaga com problema e libera o início.
  const s7 = await noMotor(page, async ({ CAREER, persistir, virada, ponte }) => {
    CAREER.lineup = { ...CAREER.lineup, ...virada.autoLineup(CAREER.squad, CAREER.lineup.formation, false) };
    const l = CAREER.lineup;
    const gk = l.starters[0], linha = l.bench.find((id) => CAREER.squad.find((p) => p.id === id).group !== "G");
    l.bench = l.bench.map((id) => (id === linha ? gk : id)); l.starters[0] = linha; // jogador de linha no gol
    const semGoleiro = ponte.iniciar();
    l.bench = l.bench.map((id) => (id === gk ? linha : id)); l.starters[0] = gk;
    const lesionado = CAREER.squad.find((p) => p.id === l.starters[5]);
    lesionado.status = "contundido"; lesionado.outUntilRound = CAREER.currentRound + 2;
    await persistir();
    return { semGoleiro, lesionado: lesionado.id, starters: [...l.starters] };
  });
  await page.goto(base + "/pre-jogo", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".pm-blocked", { timeout: 20000 });
  const tela7 = await page.evaluate(() => ({ itens: [...document.querySelectorAll(".pm-blocked li")].map((li) => li.textContent), iniciar: !!document.querySelector('a[href$="partida?iniciar=1"]'), cta: (document.querySelector(".pm-cta") || {}).textContent }));
  await page.click("button.pm-cta");
  await page.waitForSelector('a[href$="partida?iniciar=1"]', { timeout: 20000 });
  const l7 = await lineupServidor();
  const valida7 = await noMotor(page, async ({ CAREER }) => {
    const E = await import("/js/motor/escalacao.js");
    return E.validarEscalacao(CAREER.lineup, CAREER.squad, CAREER.currentRound).valida;
  });
  check("7) Início bloqueado: sem goleiro titular o motor recusa; com titular lesionado o Pré-jogo lista a pendência e troca \"Iniciar partida\" por \"Completar automaticamente\", que troca só essa vaga e libera o início:",
    s7.semGoleiro && s7.semGoleiro.motivo === "escalacao" && (s7.semGoleiro.pendencias || []).some((p) => p.tipo === "sem-goleiro-titular")
      && tela7.itens.some((t) => /lesionado ou suspenso/.test(t)) && !tela7.iniciar && /Completar automaticamente/.test(tela7.cta)
      && !l7.starters.includes(s7.lesionado) && l7.starters.every((id, i) => i === 5 || id === s7.starters[i]) && valida7,
    JSON.stringify({ semGoleiro: s7.semGoleiro, tela7, l7: l7.starters, valida7 }));

  check("6) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
