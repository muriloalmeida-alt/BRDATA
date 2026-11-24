// VENDA-DISPONIVEL (17/11): "Disponível para venda" no Mercado da v2. A CPU
// põe à venda pelos sinais do jogador (poucos jogos, insatisfação, fim de
// contrato, excedente, salário alto); à venda, o clube aceita a partir de 90%
// do valor e o atleta aceita o salário atual sendo titular ou rotação.
//  1) Filtro "Disponível para venda": só os jogadores à venda da CPU (a lista
//     do motor), cada um com "à venda (motivo)" na linha; conta como filtro.
//  2) Ordem: mais chance primeiro (papel que ele teria no seu time; divisão),
//     depois o maior overall.
//  3) Proposta: abre com o valor que o clube aceita (90%) e o aviso.
//  4) Enviada com papel de rotação e o salário atual, o clube aceita sem
//     contraproposta e o jogador chega ao seu elenco.
//  5) 360 px sem rolagem horizontal.
//  6) Trava de revenda: quem acabou de chegar não pode ser anunciado nesta
//     janela (decisão do Murilo contra o giro "compra a 90% e revende").
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, noMotor, saveNoServidor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  // Pré-temporada: a janela de transferências está aberta.
  await carreiraV2(page, `vendadisp${Date.now()}@teste.com`, { preTemporada: true });
  // Caixa e teto folgados: o teste mede a venda, não as finanças.
  await noMotor(page, (M) => { M.CAREER.finances.wageCap = 1e9; M.CAREER.finances.cash = 1e10; return M.persistir(); });

  // A lista do motor (ponte.mercado) e a ordem esperada.
  const esperado = await noMotor(page, (M) => {
    const C = M.CAREER;
    const info = M.ponte.mercado();
    const jogador = (s) => (C.leagueSquads[s.clubeId] || []).find((p) => String(p.id) === s.id);
    const lista = (info.aVenda || []).map((s) => ({ ...s, nome: jogador(s).name, overall: jogador(s).overall, valor: jogador(s).value, wage: jogador(s).wage }));
    lista.sort((a, b) => (b.chance - a.chance) || (b.overall - a.overall) || (b.valor - a.valor));
    return { n: lista.length, nomes: lista.map((x) => x.nome), motivos: [...new Set(lista.flatMap((x) => x.motivos))], alvo: lista.find((x) => x.papelNoSeuTime !== "reserva") || null };
  });

  // 1) e 2) Filtro e ordem.
  await page.goto(base + "/mercado", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mk-list li", { timeout: 30000 });
  await page.click(".mk-tools .sq-filter");
  await page.waitForSelector("#mf-t");
  await page.click('[aria-labelledby="mf-loan"] [role="radio"]:has-text("Disponível para venda")');
  await page.click('[role="dialog"] .cta');
  await page.waitForSelector("#mf-t", { state: "detached" });
  for (let k = 0; k < 30 && await page.$(".mk-more"); k++) await page.click(".mk-more");
  const l1 = await page.evaluate(() => ({ nomes: [...document.querySelectorAll(".mk-list li .row-title")].map((s) => s.textContent),
    subs: [...document.querySelectorAll(".mk-list li .row-sub")].map((s) => s.textContent), filtros: document.querySelector(".mk-tools .sq-filter").textContent }));
  await page.setViewportSize({ width: 360, height: 780 });
  await page.waitForTimeout(150);
  const w360 = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await page.setViewportSize({ width: 390, height: 844 });
  const curto = (n) => { const p = n.trim().split(/\s+/); return p.length > 1 ? `${p[0][0]}. ${p[p.length - 1]}` : n; };
  const nomeConfere = (tela, motor) => tela === motor || tela === curto(motor) || motor.endsWith(tela.replace(/^.\. /, ""));
  check("1) Filtro 'Disponível para venda': só os à venda da CPU, cada um com 'à venda (motivo)'; conta como filtro:",
    esperado.n > 0 && l1.subs.length === esperado.n && l1.subs.every((s) => /à venda \((insatisfeito|poucos jogos|fim de contrato|excedente|salário alto)/.test(s)) && /Filtros \(1\)/.test(l1.filtros),
    JSON.stringify({ n: esperado.n, linhas: l1.subs.length, motivos: esperado.motivos, filtros: l1.filtros, ex: l1.subs.slice(0, 3) }));
  check("2) Ordem: mais chance primeiro (papel no seu time, divisão), depois o maior overall:",
    l1.nomes.length === esperado.nomes.length && l1.nomes.every((t, i) => nomeConfere(t, esperado.nomes[i])),
    JSON.stringify({ tela: l1.nomes.slice(0, 6), motor: esperado.nomes.slice(0, 6) }));

  // 3) Proposta pelo alvo (seria titular ou rotação no seu time).
  const a = esperado.alvo;
  await page.goto(base + `/mercado/proposta?clube=${encodeURIComponent(a.clubeId)}&id=${encodeURIComponent(a.id)}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#pp-v", { timeout: 30000 });
  await page.waitForFunction(() => Number((document.getElementById("pp-v") || {}).value) > 0, null, { timeout: 15000 });
  const t3 = await page.evaluate(() => ({ valor: Number(document.getElementById("pp-v").value), dica: [...document.querySelectorAll(".mk-hint")].map((e) => e.textContent).find((t) => /À venda/.test(t)) || "" }));
  check("3) A proposta abre com o valor que o clube aceita (90%) e o aviso de 'à venda':",
    t3.valor === a.valorMinimo && /aceita a partir de/.test(t3.dica) && /titular ou rotação/.test(t3.dica), JSON.stringify({ alvo: a, t3 }));

  // 4) Envia (papel de rotação, salário atual) e a negociação resolve.
  await page.click('[role="radio"]:has-text("Rotação")').catch(() => {});
  await page.click(".cal-foot .cta");
  await page.waitForFunction(() => /Proposta enviada/i.test(document.body.innerText) || !!document.querySelector(".inline-error"), null, { timeout: 30000 });
  const r4 = await page.evaluate(async ({ id }) => {
    const E = await import("/js/motor/estado.js");
    const N = await import("/js/motor/negociacao.js");
    const C = E.carreiraAtual();
    const o = (C.pendingOffersOut || []).find((x) => String(x.playerId) === id);
    if (!o) return { erro: "sem proposta", erroTela: (document.querySelector(".inline-error") || {}).textContent || null };
    const papel = o.papel, salario = o.salario, wage = o.marketValue;
    let fica = true, voltas = 0;
    // O item mede o aceite do clube vendedor, não a concorrência: Math.random
    // alto impede a proposta rival (semana.maybeSpawnRivalOffer), que de vez
    // em quando nascia e levava o jogador.
    const r = Math.random; Math.random = () => 0.99;
    try { while (fica && o.status === "pending" && voltas++ < 6) fica = N.resolverProposta(o, C.currentRound); } finally { Math.random = r; }
    return { status: o.status, fica, motivo: o.motivo || null, papel, salario, comprado: C.squad.some((p) => String(p.id) === id), resultado: o.resultado || null, wage, rival: o.rivalOffer ? o.rivalOffer.clubName : null, noClube: (C.leagueSquads[o.clubId] || []).some((p) => String(p.id) === id) };
  }, { id: a.id });
  check("4) Com papel de rotação e o salário atual, o clube aceita sem contraproposta e o jogador chega ao seu elenco:",
    r4.comprado && r4.fica === false && r4.status === "pending", JSON.stringify(r4));

  // 6) Trava de revenda: chegou nesta janela, não pode ser anunciado agora.
  const r6 = await noMotor(page, (M, id) => M.ponte.anunciar(id, 50000000), a.id);
  check("6) Recém-contratado não pode ser anunciado nesta janela (só a partir da próxima):",
    r6 && r6.ok === false && r6.motivo === "recem-contratado" && /próxima janela/.test(r6.mensagem || ""), JSON.stringify(r6));

  check("5) 360 px sem rolagem horizontal na lista:", w360 <= 0, JSON.stringify({ w360 }));
  await browser.close();
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
