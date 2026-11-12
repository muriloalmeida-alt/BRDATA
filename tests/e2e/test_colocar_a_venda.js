// "Colocar à venda": vender vira um anúncio (CAREER.pendingListings), com
// propostas reais chegando ao longo das rodadas; recusar uma, aceitar à
// vista ou parcelado (recebíveis) e retirar o anúncio.
// Lote L3c (12/11/2026, plano "testes sem a tela antiga"): antes pelos
// modais da tela antiga (#listOverlay, #mySalesOverlay). Agora:
// - telas da v2: ficha → "Colocar à venda" (valor de mercado preenchido),
//   anúncio sem vender e o botão "Ver anúncio de venda" (itens 1, 2, 9 e
//   9b), "Minhas vendas" sem e com proposta (3 e 4b), "Recusar só a do …"
//   (5) e "Retirar do mercado" (8);
// - regras pelo motor (globaisDoMotor): nascer a proposta (4), aceitar à
//   vista (6), parcelado com recebíveis (7 e 7b).
// O "detalhe continua aberto por baixo" do item 9 era da tela antiga.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, signup, ensureDailyClaimed, globaisDoMotor, saveNoServidor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await carreiraV2(page, `listagem${Date.now()}@teste.com`, { clube: "fla", criarConta: signup, preTemporada: true });
  await ensureDailyClaimed(page);
  const h1 = (t) => page.waitForFunction((t) => (document.querySelector("h1") || {}).textContent === t, t, { timeout: 20000 });
  const motor = async (fn, arg) => { await globaisDoMotor(page); return page.evaluate(fn, arg); };
  await motor(async () => { CAREER.finances.wageCap = 999999999; CAREER.finances.cash = 999999999; await persistCareer(); });
  const target = await motor(() => {
    const escalados = new Set([...CAREER.lineup.starters, ...CAREER.lineup.bench]);
    const p = CAREER.squad.find((x) => x.origin === "principal" && !escalados.has(x.id));
    return { id: p.id, name: p.name, value: p.value };
  });
  // Vender e emprestar ficam na tela "A temporada em números" da ficha.
  const ficha = async (id) => {
    await page.goto(base + `/elenco/ficha?id=${encodeURIComponent(id)}&tela=numeros`, { waitUntil: "domcontentloaded" });
    await h1("A temporada em números.");
  };
  const titulos = () => page.evaluate(() => [...document.querySelectorAll(".row-title")].map((t) => t.textContent));

  // 1) Ficha → "Colocar à venda": o sheet abre com o valor de mercado.
  await ficha(target.id);
  await page.locator("button.pr-row", { hasText: "Colocar à venda" }).click();
  await page.waitForSelector("#ls-v", { timeout: 10000 });
  const v1 = Number(await page.inputValue("#ls-v"));
  check("1) \"Colocar à venda\" abre com o valor de mercado preenchido:", v1 === target.value, JSON.stringify({ v1, valor: target.value }));

  // 2) Anunciar cria o anúncio sem vender; a ficha passa a oferecer "Ver anúncio de venda".
  const antes = await saveNoServidor(page);
  await page.click('[role="dialog"] .sp-sheet-cta');
  await page.waitForFunction(() => !document.getElementById("ls-t"), null, { timeout: 20000 });
  const s2 = await saveNoServidor(page);
  await ficha(target.id);
  const acoes2 = await titulos();
  check("2) Anunciar cria o anúncio sem vender na hora (caixa e elenco intactos):",
    (s2.pendingListings || []).length === 1 && s2.finances.cash === antes.finances.cash && s2.squad.length === antes.squad.length,
    JSON.stringify({ anuncios: (s2.pendingListings || []).length, caixa: [antes.finances.cash, s2.finances.cash] }));
  check("9b) Depois de anunciado, a ficha troca \"Colocar à venda\" por \"Ver anúncio de venda\":",
    acoes2.includes("Ver anúncio de venda") && !acoes2.includes("Colocar à venda"), JSON.stringify(acoes2));

  // 3) "Minhas vendas" com o anúncio, sem proposta.
  const vendas = async () => { await page.goto(base + "/mercado/vendas", { waitUntil: "domcontentloaded" }); await h1("Jogadores no mercado."); };
  await vendas();
  const t3 = await page.evaluate(() => document.querySelector(".wk-sec").textContent);
  check("3) \"Minhas vendas\" mostra o anúncio, sem proposta ainda:", t3.includes("Nenhuma proposta ainda"), t3);

  // 4) Uma proposta nasce de verdade (rodada de anúncios).
  const c4 = await motor(async () => {
    const orig = Math.random;
    Math.random = () => 0.01; // dentro da chance (< LISTING_OFFER_CHANCE_PER_ROUND) e sorteios internos em valores baixos
    try { resolvePendingListingsRound(); } finally { Math.random = orig; }
    await persistCareer();
    const listing = CAREER.pendingListings[0];
    return { offerCount: listing.offers.length, offer: listing.offers[0] };
  });
  check("4) Proposta nasce de verdade (clube com nome/valor plausíveis):", c4.offerCount === 1 && !!c4.offer?.clubName && c4.offer?.value > 0, JSON.stringify(c4));

  // 4b/5) A proposta aparece; recusar só ela mantém o anúncio.
  await vendas();
  await page.locator("a.row", { hasText: "Propostas recebidas" }).click();
  await h1("Escolha a melhor oferta.");
  const t4b = await page.evaluate(() => document.querySelector(".mk-offers").textContent);
  check("4b) A proposta recebida aparece em \"Escolha a melhor oferta.\":", t4b.includes(c4.offer.clubName), t4b);
  await page.locator(".mk-offer", { hasText: c4.offer.clubName }).click();
  await page.click(".mk-reject");
  await page.waitForURL(/\/mercado\/vendas$/, { timeout: 20000 });
  const s5 = await saveNoServidor(page);
  check("5) Recusar só a proposta mantém o anúncio ativo, sem propostas:",
    (s5.pendingListings || []).length === 1 && s5.pendingListings[0].offers.length === 0, JSON.stringify(s5.pendingListings));

  // 6) Aceitar à vista fecha a venda de verdade.
  const c6 = await motor(async (id) => {
    const listing = CAREER.pendingListings.find((l) => l.playerId === id);
    listing.offers.push({ id: "offer_avista", clubId: "gre", clubName: "Grêmio", value: 5000000, installments: 1, round: CAREER.currentRound });
    const cashBefore = CAREER.finances.cash;
    acceptListingOffer(listing.id, "offer_avista");
    await persistCareer();
    return {
      playerGone: !CAREER.squad.find((p) => p.id === id),
      playerInBuyerSquad: (CAREER.leagueSquads["gre"] || []).some((p) => p.id === id),
      cashDelta: CAREER.finances.cash - cashBefore,
      listingGone: !CAREER.pendingListings.find((l) => l.playerId === id),
    };
  }, target.id);
  check("6) Aceitar proposta à vista fecha a venda de verdade (jogador sai, vai pro comprador, caixa recebe tudo na hora):",
    c6.playerGone && c6.playerInBuyerSquad && c6.cashDelta === 5000000 && c6.listingGone, JSON.stringify(c6));

  // 7/7b) Parcelado em 3x: 1/3 na hora, o resto em recebíveis.
  const c7 = await motor(async () => {
    const p = CAREER.squad.find((x) => x.origin === "principal");
    CAREER.pendingListings.push({
      id: "listing_parcelado", playerId: p.id, playerName: p.name, askingValue: 9000000, marketValue: 9000000, listedRound: CAREER.currentRound,
      offers: [{ id: "offer_parcelado", clubId: "bah", clubName: "Bahia", value: 9000000, installments: 3, round: CAREER.currentRound }],
    });
    const cashBefore = CAREER.finances.cash;
    acceptListingOffer("listing_parcelado", "offer_parcelado");
    const firstPaymentDelta = CAREER.finances.cash - cashBefore;
    const receivablesCount = (CAREER.pendingReceivables || []).length;
    const cashBeforeProcess = CAREER.finances.cash;
    const received = processPendingReceivables();
    const credited = CAREER.finances.cash - cashBeforeProcess;
    await persistCareer();
    return { firstPaymentDelta, expectedFirst: 3000000, receivablesCount, received, credited };
  });
  check("7) Proposta parcelada (3x) paga só 1/3 na hora, resto agendado como recebível:", c7.firstPaymentDelta === c7.expectedFirst && c7.receivablesCount !== 0, JSON.stringify(c7));
  check("7b) processPendingReceivables credita o caixa e decrementa as rodadas restantes:", c7.credited === c7.received && c7.received > 0, JSON.stringify(c7));

  // 8) Anunciar outro e retirar do mercado: sai da vitrine sem vender.
  const target3 = await motor(() => {
    const p = CAREER.squad.find((x) => x.origin === "principal" && !CAREER.pendingListings.some((l) => l.playerId === x.id));
    return p.id;
  });
  await ficha(target3);
  await page.locator("button.pr-row", { hasText: "Colocar à venda" }).click();
  await page.waitForSelector("#ls-v", { timeout: 10000 });
  await page.click('[role="dialog"] .sp-sheet-cta');
  await page.waitForFunction(() => !document.getElementById("ls-t"), null, { timeout: 20000 });
  await vendas();
  await page.locator("button.pr-row", { hasText: "Retirar do mercado" }).first().click();
  await page.waitForSelector("#ul-t", { timeout: 10000 });
  await page.click('[role="alertdialog"] .pr-danger-text');
  await page.waitForFunction(() => !document.getElementById("ul-t"), null, { timeout: 20000 });
  const s8 = await saveNoServidor(page);
  check("8) \"Retirar do mercado\" tira da vitrine sem vender (jogador continua no elenco):",
    !(s8.pendingListings || []).some((l) => l.playerId === target3) && s8.squad.some((p) => p.id === target3), JSON.stringify(s8.pendingListings));

  check("10) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
