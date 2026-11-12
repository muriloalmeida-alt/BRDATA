// UX-MERCADO-001 — pedido do usuário: "O Mercado pode ser melhor com menos
// scrolls e mais ações. Ao fazer proposta volto pra home. Queria poder
// fazer proposta a qualquer jogador em qualquer tela."
// Lote L3d (12/11/2026, plano "testes sem a tela antiga"): antes pela tela
// antiga. Agora pelo Mercado da v2:
// - 1) a janela de transferências: na v2 fica no topo do Mercado (o
//   Mercado é aberto pelo hub do Clube; o Início não tem o card antigo);
// - 2) os atalhos (Minhas propostas, Minhas vendas, Histórico) acima da lista;
// - 3) a folha de filtros aplica a posição e o botão mostra o contador;
// - 4) ordenar por idade (mais jovens primeiro);
// - 5/5b) o perfil do alvo tem "Fazer proposta", "Pedir empréstimo" e
//   "Comparar"; depois de propor, fica no Mercado ("Proposta enviada.").
// O item 6 antigo (nome de jogador num lance da partida abre o perfil dele)
// não tem equivalente na v2: registrado em docs/carreira-v2/ENTREGA_TESTES_L3.md.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, signup, ensureDailyClaimed, saveNoServidor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  // Pré-temporada: a janela de transferências está aberta.
  await carreiraV2(page, `uxmercado${Date.now()}@teste.com`, { clube: "fla", criarConta: signup, preTemporada: true });
  await ensureDailyClaimed(page);
  const h1 = (t) => page.waitForFunction((t) => (document.querySelector("h1") || {}).textContent === t, t, { timeout: 20000 });

  // 1/2) Janela no topo e atalhos antes da lista.
  await page.goto(base + "/mercado", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mk-list li", { timeout: 20000 });
  const topo = await page.evaluate(() => {
    const list = document.querySelector(".mk-list");
    const atalhos = [...document.querySelectorAll('nav[aria-label="Suas negociações"] .row-title')].map((t) => t.textContent);
    const nav = document.querySelector('nav[aria-label="Suas negociações"]');
    return { janela: (document.querySelector(".mk-window") || {}).textContent || "", atalhos, antes: !!nav && !!(nav.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING) };
  });
  check("1) O Mercado mostra a janela de transferências no topo:", /Aberta/i.test(topo.janela), topo.janela);
  check("2) Atalhos (Minhas propostas, Minhas vendas, Histórico) ficam acima da lista de jogadores:",
    topo.antes && ["Minhas propostas", "Minhas vendas", "Histórico de negociações"].every((a) => topo.atalhos.includes(a)), JSON.stringify(topo.atalhos));

  // 3) Filtros: posição Goleiro, o botão mostra o contador.
  await page.click(".sq-filter");
  await page.waitForSelector("#mf-t", { timeout: 10000 });
  await page.locator('[aria-labelledby="mf-pos"] [role="radio"]', { hasText: "Goleiro" }).click();
  await page.locator('[role="dialog"] .cta', { hasText: "Aplicar filtros" }).click();
  await page.waitForFunction(() => !document.getElementById("mf-t"), null, { timeout: 10000 });
  const f3 = await page.evaluate(() => ({ botao: document.querySelector(".sq-filter").textContent, pos: [...new Set([...document.querySelectorAll(".mk-list .row-sub")].map((s) => s.textContent.split(" · ")[0]))] }));
  check("3) A folha de filtros aplica a posição (só Goleiro) e o botão mostra o contador:", f3.botao === "Filtros (1)" && f3.pos.length === 1 && f3.pos[0] === "Goleiro", JSON.stringify(f3));

  // 4) Ordenar por idade: mais jovens primeiro.
  await page.click(".sq-filter");
  await page.waitForSelector("#mf-t", { timeout: 10000 });
  await page.locator('[role="dialog"] .text-btn', { hasText: "Limpar filtros" }).click();
  await page.waitForFunction(() => !document.getElementById("mf-t"), null, { timeout: 10000 });
  await page.click(".sq-filter");
  await page.waitForSelector("#mf-t", { timeout: 10000 });
  await page.locator('[aria-labelledby="mf-sort"] [role="radio"]', { hasText: "Idade" }).click();
  await page.locator('[role="dialog"] .cta', { hasText: "Aplicar filtros" }).click();
  await page.waitForFunction(() => !document.getElementById("mf-t"), null, { timeout: 10000 });
  const ages = await page.evaluate(() => [...document.querySelectorAll(".mk-list .row-sub")].slice(0, 8).map((s) => Number((/(\d+) anos/.exec(s.textContent) || [])[1])));
  check("4) Ordenar por idade põe os mais jovens primeiro:", ages.length > 1 && ages.every((a, i) => i === 0 || a >= ages[i - 1]), JSON.stringify(ages));

  // 5) Perfil do alvo com as três ações; 5b) propor e continuar no Mercado.
  await page.click(".mk-list a.sp-player >> nth=0");
  await h1("Conheça seu reforço.");
  await page.waitForSelector(".pr .cal-foot .cta", { timeout: 20000 });
  const acoes = await page.evaluate(() => [...document.querySelectorAll(".row-title, .cal-foot .cta")].map((e) => e.textContent));
  check("5) O perfil do jogador de outro clube tem Fazer proposta, Pedir empréstimo e Comparar:",
    ["Fazer proposta", "Pedir empréstimo", "Comparar com meu elenco"].every((a) => acoes.includes(a)), JSON.stringify(acoes));
  const alvo = new URL(page.url());
  await page.click(".pr .cal-foot .cta");
  await h1("Faça sua oferta.");
  await page.waitForFunction(() => Number((document.getElementById("pp-v") || {}).value) > 0, null, { timeout: 20000 });
  await page.click(".pr .cal-foot .cta");
  await h1("Proposta enviada.");
  const s5 = await saveNoServidor(page);
  const onde = await page.evaluate(() => ({ path: location.pathname, voltar: [...document.querySelectorAll(".cal-foot button, .cal-foot a")].map((b) => b.textContent) }));
  check("5b) A proposta fica registrada e o técnico continua no Mercado (não volta ao Início):",
    (s5.pendingOffersOut || []).some((o) => String(o.playerId) === alvo.searchParams.get("id")) && onde.path.startsWith("/mercado") && onde.voltar.includes("Voltar ao mercado"), JSON.stringify(onde));

  check("6) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
