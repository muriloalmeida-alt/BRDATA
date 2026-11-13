// Pedido de orçamento à diretoria (lote L4a, sem a tela antiga). Antes eram
// dois testes sem verificação (test_board e test_board_deny só imprimiam);
// agora as mesmas situações viram verificações, pela tela da v2
// ("Peça reforço.", /diretoria/orcamento) e pelo motor na página da v2:
//  1) Na briga pelo título (1º), o pedido pela tela é aprovado: teto e caixa
//     sobem (caixa = 3 × aumento do teto), lançamento "diretoria" no extrato
//     e a resposta aparece na tela.
//  2) Logo depois, a tela mostra a espera ("pode pedir de novo em 4
//     rodadas") e o botão fica inativo; o motor recusa com "espera".
//  3) Meio da tabela (10º): com o sorteio fora dos 15%, a diretoria nega e
//     nada muda no caixa nem no teto (o test_board_deny forçava o 10º e
//     só imprimia o resultado de 5 pedidos).
//  4) Zona de rebaixamento: aprovado sempre (com qualquer sorteio).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `board${Date.now()}@teste.com`);

  // Coloca o clube na posição `pos` (1 = líder, 20 = lanterna) e zera a espera.
  const posicao = (pos) => noMotor(page, async ({ CAREER, persistir }, pos) => {
    const ids = Object.keys(CAREER.standings).filter((id) => String(id) !== String(CAREER.clubId));
    ids.forEach((id, i) => { CAREER.standings[id].pts = 100 - i * 3; });
    // Entre o (pos-1)º e o posº dos outros: fica exatamente em `pos`.
    CAREER.standings[CAREER.clubId].pts = 100 - (pos - 1) * 3 + 1;
    CAREER.lastBoardRequestRound = null;
    return persistir();
  }, pos);

  // 1) Briga pelo título, pela tela.
  await posicao(1);
  const antes = await noMotor(page, ({ CAREER }) => ({ cap: CAREER.finances.wageCap, cash: CAREER.finances.cash, ledger: (CAREER.financeLedger || []).length }));
  await page.goto(base + "/diretoria/orcamento", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (document.querySelector("h1") || {}).textContent === "Peça reforço.", null, { timeout: 30000 });
  await page.click(".cal-foot .cta");
  await page.waitForFunction(() => /Pedido aprovado\.|Pedido negado\./.test((document.querySelector("h1") || {}).textContent || ""), null, { timeout: 20000 });
  const tela1 = await page.evaluate(() => ({ h1: document.querySelector("h1").textContent, texto: document.body.innerText }));
  const depois = await noMotor(page, ({ CAREER }) => ({ cap: CAREER.finances.wageCap, cash: CAREER.finances.cash, ultimo: (CAREER.financeLedger || [])[0] || null, ledger: (CAREER.financeLedger || []).length, decisao: CAREER.boardDecision, last: CAREER.lastBoardRequestRound, round: CAREER.currentRound }));
  const aumento = depois.cap - antes.cap;
  check("1) Briga pelo título (1º): pedido pela tela aprovado; teto e caixa sobem (caixa = 3 × aumento), lançamento da diretoria no extrato e a resposta na tela:",
    tela1.h1 === "Pedido aprovado." && aumento > 0 && depois.cash - antes.cash === aumento * 3 && (depois.ledger === antes.ledger + 1 || depois.ledger === 60)
      && depois.ultimo && depois.ultimo.type === "diretoria" && /^✅/.test(depois.decisao) && /briga pelo título/.test(tela1.texto) && depois.last === depois.round,
    JSON.stringify({ h1: tela1.h1, aumento, caixa: depois.cash - antes.cash, ultimo: depois.ultimo }));

  // 2) Espera: tela e motor.
  await page.goto(base + "/diretoria/orcamento", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".sp-why", { timeout: 20000 });
  const tela2 = await page.evaluate(() => ({ espera: document.querySelector(".sp-why").textContent, inativo: document.querySelector(".cal-foot .cta").getAttribute("aria-disabled") }));
  const motor2 = await noMotor(page, async ({ ponte }) => ponte.pedirOrcamento());
  check("2) Logo depois: a tela mostra a espera de 4 rodadas e o botão fica inativo; o motor recusa com 'espera':",
    tela2.espera === "Você pode pedir de novo em 4 rodadas." && tela2.inativo === "true" && motor2.ok === false && motor2.motivo === "espera" && motor2.espera === 4,
    JSON.stringify({ tela2, motor2 }));

  // 3) Meio da tabela, sorteio fora dos 15%: negado, nada muda.
  await posicao(10);
  const r3 = await noMotor(page, async ({ CAREER, ponte }) => {
    const antes = { cap: CAREER.finances.wageCap, cash: CAREER.finances.cash };
    const rnd = Math.random; Math.random = () => 0.5;
    try {
      const r = await ponte.pedirOrcamento();
      return { r, antes, depois: { cap: CAREER.finances.wageCap, cash: CAREER.finances.cash }, decisao: CAREER.boardDecision };
    } finally { Math.random = rnd; }
  });
  check("3) Meio da tabela (10º), sorteio fora dos 15%: a diretoria nega e nada muda no caixa nem no teto:",
    r3.r.ok && r3.r.aprovado === false && r3.r.posicao === 10 && r3.antes.cap === r3.depois.cap && r3.antes.cash === r3.depois.cash && /^❌/.test(r3.decisao) && /10º lugar não justifica/.test(r3.decisao),
    JSON.stringify(r3));

  // 4) Zona de rebaixamento: aprovado mesmo com o sorteio no máximo.
  await posicao(19);
  const r4 = await noMotor(page, async ({ ponte }) => {
    const rnd = Math.random; Math.random = () => 0.999;
    try { return await ponte.pedirOrcamento(); } finally { Math.random = rnd; }
  });
  check("4) Zona de rebaixamento (19º): aprovado mesmo com o sorteio no máximo, com aumento do teto:", r4.ok && r4.aprovado === true && r4.posicao === 19 && r4.aumentoTeto > 0, JSON.stringify(r4));

  check("5) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
