// UX-MERCADO-001 — pedido do usuário: "O Mercado pode ser melhor com
// menos scrolls e mais ações. As indicações de olheiros estão
// escondidas. Ao fazer proposta volto pra home. Queria poder fazer
// proposta a qualquer jogador em qualquer tela ao clicar no nome dele."
// Cobre: atalhos no topo do Mercado, filtros em bottom sheet +
// ordenação, card "Mercado" no Início, card de jogador de outro clube
// com ações (proposta sem voltar pra home) e nome clicável em lance de
// partida (playerLinkHTML).
const { chromium } = require("playwright-core");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";
  const email = `uxmercado001${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "UX Mercado Teste", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });
  await page.goto(base + "/carreira.html", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForTimeout(300);
  await page.click(".m3-club-row");
  await page.waitForTimeout(150);
  await page.click("#btnConfirmClub");
  await page.click("#btnOnboardSkip", { timeout: 2000 }).catch(() => {});
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  for (let i = 0; i < 6; i++) { await page.click("#btnWizardSkip", { timeout: 2500 }).catch(() => {}); await page.waitForTimeout(300); }
  await page.click("#btnClaimDailyLogin", { timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(500);
  let ok = true;
  const check = (label, cond, extra) => { console.log(label, !!cond, extra !== undefined ? JSON.stringify(extra) : ""); ok = ok && !!cond; };

  // 1) Card "Mercado" no Início com status da janela.
  const home = await page.evaluate(() => ({
    visible: !!document.getElementById("marketSummaryCard") && document.getElementById("marketSummaryCard").offsetParent !== null,
    text: document.getElementById("marketSummaryText").textContent,
  }));
  check("1) Card 'Mercado' no Início mostra a janela:", home.visible && /Janela/.test(home.text), home);

  // 2) Atalhos (Indicações/Propostas/Vendas/Histórico) ANTES da lista.
  await page.click(".m3-nav-item[data-panel='mercado']");
  await page.waitForTimeout(400);
  const order = await page.evaluate(() => {
    const list = document.getElementById("marketList");
    return ["btnOpenScoutSuggestions", "btnOpenMyOffers", "btnOpenMySales", "btnOpenTransferHistory"]
      .every((id) => document.getElementById(id).compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  check("2) Atalhos do Mercado ficam acima da lista de jogadores:", order);

  // 3) Filtros num bottom sheet; aplicar filtra por posição.
  await page.click("#btnMarketFilters");
  await page.waitForTimeout(300);
  await page.selectOption('[data-filter-src="marketPosFilter"]', "G");
  await page.click('[data-filters-act="apply"]');
  await page.waitForTimeout(300);
  const filtered = await page.evaluate(() => ({
    positions: [...new Set([...document.querySelectorAll("#marketList .mt-pos-chip")].map((e) => e.textContent))],
    badge: document.getElementById("marketFiltersCount").textContent,
    sheetOpen: !!document.querySelector(".m3-bottom-sheet-overlay"),
  }));
  check("3) Bottom sheet de filtros aplica posição (só GOL) e mostra contador:", filtered.positions.length === 1 && filtered.positions[0] === "GOL" && filtered.badge === "1" && !filtered.sheetOpen, filtered);
  await page.click("#btnMarketFilters");
  await page.waitForTimeout(300);
  await page.click('[data-filters-act="clear"]');
  await page.waitForTimeout(300);

  // 4) Ordenar por idade (mais jovens primeiro).
  await page.selectOption("#marketSort", "age");
  await page.waitForTimeout(300);
  // ids podem se repetir entre clubes de divisões diferentes (achado
  // registrado no handoff) — identifica pelo par jogador+clube do card.
  const ages = await page.evaluate(() => [...document.querySelectorAll("#marketList [data-openplayer]")].slice(0, 6)
    .map((el) => { const f = allMarketPlayers().find(({ p, club }) => p.id === el.dataset.openplayer && String(club.id) === el.dataset.club); return f ? f.p.age : null; }));
  check("4) Ordenação 'Mais jovens' ordena por idade crescente:", ages.every((a, i) => i === 0 || a >= ages[i - 1]), ages);

  // 5) Card de jogador de outro clube tem ações; proposta enviada dele
  // NÃO leva pra home.
  const target = await page.evaluate(() => {
    const el = [...document.querySelectorAll("#marketList [data-openplayer]")].find((e) => !CAREER.squad.some((p) => p.id === e.dataset.openplayer));
    return el ? el.dataset.openplayer : null;
  });
  await page.click(`#marketList [data-openplayer="${target}"]`);
  await page.waitForTimeout(300);
  const acts = await page.evaluate(() => [...document.querySelectorAll("[data-ext-act]")].map((b) => b.dataset.extAct));
  check("5) Card de jogador de outro clube tem Fazer proposta / Pedir empréstimo / Comparar:", ["offer", "loan", "compare"].every((a) => acts.includes(a)), acts);
  await page.click('[data-ext-act="offer"]');
  await page.waitForSelector("#btnOfferConfirm", { timeout: 5000 });
  await page.click("#btnOfferConfirm");
  await page.waitForTimeout(400);
  const after = await page.evaluate((id) => ({
    pending: (CAREER.pendingOffersOut || []).some((o) => o.playerId === id),
    mercadoActive: document.getElementById("panel-mercado").classList.contains("active"),
    centralActive: document.getElementById("panel-central").classList.contains("active"),
  }), target);
  check("5b) Proposta enviada pelo card fica registrada e o técnico continua no Mercado (não volta pra home):", after.pending && after.mercadoActive && !after.centralActive, after);

  // 6) Nome em lance de partida é link pro perfil (com ações).
  const other = await page.evaluate(() => { const f = allMarketPlayers().find(({ p, mine }) => !mine); return { id: f.p.id, name: f.p.name }; });
  await page.evaluate((o) => {
    const box = document.createElement("div");
    box.id = "uxMercadoEventProbe";
    box.innerHTML = matchEventsSummaryHTML([{ type: "gol", player: o.name, playerId: o.id }]);
    window.__probeName = o.name;
    document.getElementById("panel-mercado").prepend(box);
  }, other);
  await page.click("#uxMercadoEventProbe [data-playerlink]");
  await page.waitForTimeout(300);
  const linkOpened = await page.evaluate(() => ({
    actions: document.querySelectorAll("[data-ext-act]").length,
    rightPlayer: [...document.querySelectorAll(".m3-dialog .mt-player-hero-info b")].some((b) => b.textContent === window.__probeName.toUpperCase()),
  }));
  check("6) Nome de jogador num lance abre o perfil CERTO com ações de negociação:", linkOpened.actions >= 3 && linkOpened.rightPlayer, linkOpened);

  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.log("FATAL:", e.message); process.exit(1); });
