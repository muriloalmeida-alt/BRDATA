// FASE1-MER (13/11/2026) — mercado na v2, pelas telas, com as respostas do
// motor (sem a tela antiga):
//  1) MER-01: o Elenco tem "Contratar jogador", que leva ao Mercado.
//  2) MER-02: abrir um jogador e voltar mantém a quantidade carregada e a
//     rolagem da lista.
//  3) MER-03: "Faça sua oferta." tem salário, papel prometido e duração, e o
//     resumo antes de enviar (pago no fechamento, salário, caixa, folha, teto).
//  4) A proposta grava os termos; repetir o envio (toque duplo) não duplica.
//  5) Recusa: a negociação mostra o motivo, "Fazer nova proposta" e
//     "Dispensar"; dispensar tira da lista.
//  6) Pedido de salário: "Aceitar salário pedido" fecha a compra com o
//     salário pedido, a duração e a promessa.
//  7) Empréstimo de entrada: o clube contrapõe com um percentual maior e
//     "Aceitar N% do salário" fecha.
//  8) Sem erro na página e 360 px sem rolagem horizontal.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, signup, ensureDailyClaimed, globaisDoMotor, saveNoServidor, noMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await carreiraV2(page, `v2mer${Date.now()}@teste.com`, { clube: "fla", criarConta: signup, preTemporada: true });
  await ensureDailyClaimed(page);
  const h1 = (t) => page.waitForFunction((t) => (document.querySelector("h1") || {}).textContent === t, t, { timeout: 20000 });
  const overflow = async () => { await page.setViewportSize({ width: 360, height: 780 }); const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); await page.setViewportSize({ width: 390, height: 844 }); return o; };
  const cheio = async () => noMotor(page, async ({ CAREER, persistir }) => { CAREER.finances.cash = 900000000; CAREER.finances.wageCap = 900000000; await persistir(); });
  await cheio();

  // 1) Elenco → Contratar jogador → Mercado.
  await page.goto(base + "/elenco", { waitUntil: "domcontentloaded" });
  await page.locator(".row", { hasText: "Contratar jogador" }).click();
  await h1("Busque seu reforço.");
  check("1) O Elenco tem \"Contratar jogador\" e leva ao Mercado:", new URL(page.url()).pathname === "/mercado", page.url());

  // 2) Carregar mais, rolar, abrir um jogador e voltar.
  await page.waitForSelector(".mk-list li", { timeout: 20000 });
  await page.click(".mk-more");
  await page.waitForFunction(() => document.querySelectorAll(".mk-list li").length > 40, null, { timeout: 10000 });
  const antes = await page.evaluate(() => { const li = document.querySelectorAll(".mk-list li")[50]; li.scrollIntoView(); return { n: document.querySelectorAll(".mk-list li").length, y: Math.round(scrollY) }; });
  await page.click(".mk-list li:nth-child(51) a.sp-player");
  await h1("Conheça seu reforço.");
  await page.locator(".cal-foot .link-back", { hasText: "Voltar ao mercado" }).click();
  await h1("Busque seu reforço.");
  await page.waitForFunction((y) => Math.abs(scrollY - y) < 30, antes.y, { timeout: 5000 }).catch(() => {});
  const depois = await page.evaluate(() => ({ n: document.querySelectorAll(".mk-list li").length, y: Math.round(scrollY) }));
  check("2) Voltar do perfil mantém a quantidade carregada e a rolagem da lista:", depois.n === antes.n && Math.abs(depois.y - antes.y) < 30 && antes.y > 500, JSON.stringify({ antes, depois }));

  // 3) Proposta completa. Alvo: o reserva mais barato de um clube da Série A.
  await globaisDoMotor(page);
  const alvo = async (filtro) => page.evaluate((filtro) => {
    const ja = new Set((CAREER.pendingOffersOut || []).map((o) => String(o.playerId)));
    const l = allMarketPlayers().filter((e) => !e.mine && !ja.has(String(e.p.id)) && e.p.value > 0 && e.p.onLoanFromClubId == null)
      .filter((e) => { const papel = motorMercado().papelNoElenco(e.p, leagueSquadFor(e.club.id)); return filtro === "titular" ? papel === "titular" : papel === "reserva"; })
      .sort((a, b) => a.p.value - b.p.value);
    return { clubId: String(l[0].club.id), id: l[0].p.id, wage: l[0].p.wage };
  }, filtro);
  const a3 = await alvo("reserva");
  await page.goto(base + `/mercado/proposta?clube=${encodeURIComponent(a3.clubId)}&id=${encodeURIComponent(a3.id)}`, { waitUntil: "domcontentloaded" });
  await h1("Faça sua oferta.");
  await page.waitForSelector("#pp-im", { timeout: 20000 });
  const f3 = await page.evaluate(() => ({
    salario: (document.getElementById("pp-s") || {}).value,
    papeis: [...document.querySelectorAll('[aria-labelledby="pp-r"] [role="radio"]')].map((b) => b.textContent),
    anos: [...document.querySelectorAll('[aria-labelledby="pp-y"] [role="radio"]')].map((b) => b.textContent),
    resumo: [...document.querySelectorAll(".mk-impact dt")].map((d) => d.textContent),
  }));
  check("3) \"Faça sua oferta.\" tem salário, papel (Titular/Rotação/Reserva), duração (1–5) e o resumo antes de enviar:",
    Number(f3.salario) === a3.wage && f3.papeis.join() === "Titular,Rotação,Reserva" && f3.anos.join() === "1,2,3,4,5"
    && ["Pago no fechamento", "Salário assumido", "Caixa", "Folha salarial mensal", "Teto da folha"].every((x) => f3.resumo.includes(x)), JSON.stringify(f3));

  // 4) Titular, 4 temporadas, salário 40% maior; toque duplo no enviar.
  await page.locator('[aria-labelledby="pp-r"] [role="radio"]', { hasText: "Titular" }).click();
  await page.locator('[aria-labelledby="pp-y"] [role="radio"]', { hasText: "4" }).click();
  await page.fill("#pp-s", String(Math.round(a3.wage * 1.4)));
  await page.locator(".pr .cal-foot .cta").dblclick();
  await h1("Proposta enviada.");
  const s4 = await saveNoServidor(page);
  const minhas = (s4.pendingOffersOut || []).filter((o) => String(o.playerId) === String(a3.id));
  check("4) A proposta grava salário, papel e duração, e o toque duplo não duplica:",
    minhas.length === 1 && minhas[0].salario === Math.round(a3.wage * 1.4) && minhas[0].papel === "titular" && minhas[0].anos === 4, JSON.stringify(minhas));

  // 5) Recusa: uma proposta baixíssima resolvida pelo motor.
  await globaisDoMotor(page);
  const a5 = await alvo("reserva");
  const id5 = await noMotor(page, async ({ ponte, CAREER, persistir }, a5) => {
    const r = await ponte.fazerProposta(a5.clubId, a5.id, 1000, 1, { salario: a5.wage, papel: "reserva", anos: 1 }, "op-e2e-5");
    const o = CAREER.pendingOffersOut.find((x) => x.id === r.id); o.roundsLeft = 1;
    await persistir();
    return r.id;
  }, a5);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await globaisDoMotor(page);
  await page.evaluate(async () => { resolvePendingOffersOutRound(CAREER.currentRound); await persistCareer(); });
  await page.goto(base + `/mercado/negociacao?id=${encodeURIComponent(id5)}`, { waitUntil: "domcontentloaded" });
  await h1("A negociação continua.");
  await page.waitForSelector("#ng-why", { timeout: 20000 });
  const t5 = await page.evaluate(() => ({ titulo: document.getElementById("ng-why").textContent, motivo: (document.getElementById("ng-why").closest("section").querySelector(".wk-note") || {}).textContent || "",
    acoes: [...document.querySelectorAll(".row-title, .cal-foot button")].map((b) => b.textContent) }));
  await page.locator(".cal-foot .link-back", { hasText: "Dispensar" }).click();
  await page.locator('[role="alertdialog"] .pr-danger-text, [role="dialog"] .pr-danger-text').click();
  await h1("Suas negociações.");
  const s5 = await saveNoServidor(page);
  check("5) Recusa mostra o motivo, \"Fazer nova proposta\" e \"Dispensar\"; dispensar tira da lista:",
    t5.titulo === "Por que recusou" && t5.motivo.length > 10 && t5.acoes.includes("Fazer nova proposta") && t5.acoes.includes("Dispensar")
    && !(s5.pendingOffersOut || []).some((o) => o.id === id5), JSON.stringify(t5));

  // 6) Pedido de salário: o clube aceita (valor de mercado) e o atleta, com
  // salário bem menor que o atual e papel de reserva, pede mais.
  await globaisDoMotor(page);
  const pedido = await page.evaluate(async () => {
    const ja = new Set((CAREER.pendingOffersOut || []).map((o) => String(o.playerId)));
    const lista = allMarketPlayers().filter((e) => !e.mine && !ja.has(String(e.p.id)) && e.p.value > 0 && e.p.onLoanFromClubId == null).sort((a, b) => a.p.value - b.p.value).slice(0, 80);
    for (const e of lista) {
      for (const fator of [0.9, 0.8, 0.7, 0.95]) {
        const t = { salario: Math.round(e.p.wage * fator), papel: "rotacao", anos: 2 };
        const av = motorMercado().avaliacaoAtleta(e.p, t, contextoDoAtleta(e.p, e.club.id));
        if (av.decisao !== "pede") continue;
        const r = submitOfferOut(String(e.club.id), e.p.id, Math.round(e.p.value * 1.3), 1);
        if (!r.ok) continue;
        Object.assign(r.offer, t);
        r.offer.roundsLeft = 1;
        const o = r.offer;
        sorteioNaFaixa(o, CAREER.currentRound, () => true);
        resolvePendingOffersOutRound(CAREER.currentRound);
        const depois = CAREER.pendingOffersOut.find((x) => x.playerId === e.p.id);
        if (depois && depois.status === "pede-salario") { await persistCareer(); return { id: depois.id, playerId: e.p.id, pedido: depois.salarioPedido, anos: 2 }; }
        CAREER.pendingOffersOut = CAREER.pendingOffersOut.filter((x) => x.playerId !== e.p.id);
      }
    }
    return null;
  });
  if (pedido) {
    await page.goto(base + `/mercado/negociacao?id=${encodeURIComponent(pedido.id)}`, { waitUntil: "domcontentloaded" });
    await h1("A negociação continua.");
    const botao = page.locator(".cal-foot .cta", { hasText: "Aceitar salário pedido" });
    await botao.waitFor({ timeout: 20000 });
    await botao.click();
    await page.waitForFunction(() => /Reforço contratado|Coletiva|coletiva/i.test(document.body.textContent) || location.pathname.includes("coletiva"), null, { timeout: 20000 });
    const s6 = await saveNoServidor(page);
    const p6 = (s6.squad || []).find((p) => p.id === pedido.playerId);
    check("6) \"Aceitar salário pedido\" fecha com o salário pedido, a duração e a promessa:",
      !!p6 && p6.wage === pedido.pedido && p6.contractUntil === s6.seasonYear + pedido.anos - 1 && p6.promessa && p6.promessa.papel === "rotacao", JSON.stringify({ pedido, p6: p6 && { wage: p6.wage, contractUntil: p6.contractUntil, promessa: p6.promessa } }));
  } else check("6) \"Aceitar salário pedido\" fecha com o salário pedido, a duração e a promessa:", false, "nenhum caso de pedido de salário encontrado");

  // 7) Empréstimo de entrada com contraproposta de percentual.
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await globaisDoMotor(page);
  const a7 = await page.evaluate(() => {
    for (const e of allMarketPlayers().filter((x) => !x.mine && x.p.onLoanFromClubId == null)) {
      const r = avaliarPedidoDeEmprestimo(String(e.club.id), e.p, "temporada", 50);
      if (r.decisao === "contra") return { clubId: String(e.club.id), id: e.p.id, pct: r.pctPedido };
    }
    return null;
  });
  if (a7) {
    await page.goto(base + `/mercado/emprestimo?clube=${encodeURIComponent(a7.clubId)}&id=${encodeURIComponent(a7.id)}`, { waitUntil: "domcontentloaded" });
    await h1("Combine o empréstimo.");
    await page.locator('[aria-labelledby="ln-p"] [role="radio"]', { hasText: "50%" }).click();
    await page.locator(".cal-foot .cta", { hasText: "Propor empréstimo" }).click();
    const aceitar = page.locator(".cal-foot .cta", { hasText: `Aceitar ${a7.pct}% do salário` });
    await aceitar.waitFor({ timeout: 20000 });
    const aviso = await page.evaluate(() => (document.querySelector(".inline-error") || {}).textContent || "");
    await aceitar.click();
    await h1("Empréstimo fechado.");
    const s7 = await saveNoServidor(page);
    const p7 = (s7.squad || []).find((p) => p.id === a7.id);
    check("7) Empréstimo: o clube pede um percentual maior, com o motivo, e \"Aceitar N% do salário\" fecha:", !!p7 && aviso.includes(`${a7.pct}%`), JSON.stringify({ a7, aviso, chegou: !!p7 }));
  } else check("7) Empréstimo: o clube pede um percentual maior, com o motivo, e \"Aceitar N% do salário\" fecha:", false, "nenhum caso de contraproposta de empréstimo");

  await page.goto(base + "/mercado/propostas", { waitUntil: "domcontentloaded" });
  await h1("Suas negociações.");
  const o8 = await overflow();
  check("8) Sem erro na página e 360 px sem rolagem horizontal:", erros.length === 0 && o8 <= 0, JSON.stringify({ erros: erros.slice(0, 3), o8 }));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
