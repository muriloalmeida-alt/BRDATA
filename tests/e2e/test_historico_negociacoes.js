// Histórico de negociações: começa vazio; uma compra e uma venda de verdade
// aparecem nele, cada uma na sua classificação.
// Lote L3c (12/11/2026, plano "testes sem a tela antiga"): antes a timeline
// da tela antiga (#transferHistoryOverlay). Agora a tela "Histórico de
// negociações" da v2 (/mercado/historico), com as abas Compras, Vendas e
// Empréstimos; a compra e a venda pelos comandos do motor que as telas de
// mercado da v2 usam (fazerProposta, anunciar) e as regras de resposta.
// Saíram, por serem só da tela antiga: o contador no botão do histórico e o
// card "Transferências recentes" (item 3) e o "Fechar" do rodapé (item 4).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, signup, ensureDailyClaimed, globaisDoMotor, noMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  // Pré-temporada: a janela de transferências está aberta.
  await carreiraV2(page, `historico${Date.now()}@teste.com`, { clube: "fla", criarConta: signup, preTemporada: true });
  await ensureDailyClaimed(page);
  const h1 = (t) => page.waitForFunction((t) => (document.querySelector("h1") || {}).textContent === t, t, { timeout: 20000 });

  // 1) Vazio no início.
  await page.goto(base + "/mercado/historico", { waitUntil: "domcontentloaded" });
  await h1("Seu histórico começa.");
  const vazio = await page.evaluate(() => (document.querySelector(".wk-note") || {}).textContent || "");
  check("1) O histórico abre vazio, sem nenhuma negociação ainda:", /Ainda não há compras, vendas ou empréstimos/.test(vazio), vazio);

  // 2) Uma compra (proposta pelo valor de mercado, aceita) e uma venda
  // (anúncio do mais barato do elenco, com proposta e aceite).
  await globaisDoMotor(page);
  const compra = await noMotor(page, async ({ CAREER, ponte, semana }) => {
    CAREER.finances.wageCap = 999999999; CAREER.finances.cash = 999999999;
    const l = semana.allMarketPlayers().filter((e) => !e.mine && e.p.value > 0).sort((a, b) => a.p.value - b.p.value);
    const e = l[Math.floor(l.length / 2)];
    const r = await ponte.fazerProposta(String(e.club.id), e.p.id, e.p.value, 1);
    const orig = Math.random; Math.random = () => 0.01;
    try { semana.resolvePendingOffersOutRound(CAREER.currentRound); semana.resolvePendingOffersOutRound(CAREER.currentRound); } finally { Math.random = orig; }
    return { ok: r.ok, id: e.p.id, comprado: CAREER.squad.some((p) => p.id === e.p.id) };
  });
  const venda = await noMotor(page, async ({ CAREER, ponte, semana, clube, persistir }) => {
    const p = CAREER.squad.filter((x) => x.origin === "principal").sort((a, b) => a.value - b.value)[0];
    const r = await ponte.anunciar(p.id, p.value);
    const listing = CAREER.pendingListings.find((x) => String(x.playerId) === String(p.id));
    // Rodadas de exposição do anúncio até chegar proposta (sorteio normal).
    let rounds = 0;
    while (listing && !listing.offers.length && rounds < 200) { rounds++; semana.maybeSpawnListingOffer(listing); }
    const ofertas = listing ? listing.offers.length : 0;
    if (ofertas) clube.acceptListingOffer(listing.id, listing.offers[0].id);
    await persistir();
    return { ok: r.ok, rounds, ofertas, vendido: !CAREER.squad.some((x) => x.id === p.id) };
  });
  check("2a) Anúncio recebe proposta em rodadas de exposição normais:", venda.ok && venda.ofertas > 0, JSON.stringify(venda));

  await page.goto(base + "/mercado/historico", { waitUntil: "domcontentloaded" });
  await h1("O mercado do clube.");
  const aba = async (nome) => {
    await page.locator('[role="tab"]', { hasText: nome }).click();
    return page.evaluate(() => [...document.querySelectorAll('[role="tabpanel"] .mk-log dd')].map((d) => d.textContent));
  };
  const compras = await aba("Compras");
  const vendas = await aba("Vendas");
  check("2) A compra e a venda de verdade aparecem no histórico, cada uma na sua aba (Compras/Vendas):",
    compra.ok && compra.comprado && venda.vendido && compras.length >= 1 && vendas.length >= 1, JSON.stringify({ compra, compras, vendas }));

  check("3) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
