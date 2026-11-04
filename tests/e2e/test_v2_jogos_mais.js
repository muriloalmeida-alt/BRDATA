// Carreira 2.0 — fase 10 do plano de independência (abas Jogos e Mais), pela
// UI real. Estados que o motor só cria jogando muitas rodadas (Copa em
// andamento, premiações, histórico de compras, retrospecto) são preparados no
// save pelo servidor.
//  1) Jogos e Mais: todas as linhas abrem a v2.
//  2) Copa: título pela situação, escolha de fase, ida/volta/agregado.
//  3) Estatísticas: dois seletores e as seções do jogo.
//  4) Retrospecto pelo elenco do adversário; Premiações da temporada.
//  5) Conquistas (7, com detalhe) e Ranking (seu código; código inválido avisa).
//  6) Loja (pacotes e itens; saldo insuficiente bloqueia) e histórico de compras.
//  7) Configurações: notificação e som gravados; editar nome; ajuda com busca.
//  8) Diretoria → pedir mais orçamento: resposta gravada e espera de 4 rodadas.
//  9) Saves: reiniciar (digitando REINICIAR) apaga a carreira e abre a criação.
// 10) 360 px sem rolagem horizontal e alvos ≥ 44 px; nada por /carreira-old.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, serverCareer } = require("./_v2_match");

const base = "http://localhost:8787";

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  await newCareer(page, `v2jm${Date.now()}@teste.com`);
  await page.close();

  const v2 = await ctx.newPage();
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const visited = [];
  v2.on("framenavigated", (f) => { if (f === v2.mainFrame()) visited.push(new URL(f.url()).pathname); });
  const sizes = {};
  const at360 = async (k) => {
    await v2.setViewportSize({ width: 360, height: 780 });
    sizes[k] = await v2.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth,
      small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className) }));
    await v2.setViewportSize({ width: 390, height: 844 });
  };
  const waitH1 = (t) => v2.waitForFunction((t) => (document.querySelector("h1") || {}).textContent === t, t, { timeout: 30000 });
  const go = async (p, h1) => { await v2.goto(base + p, { waitUntil: "domcontentloaded" }); if (h1) await waitH1(h1); };
  const put = (fn, arg) => v2.evaluate(async ({ src, arg }) => {
    const c = (await (await fetch("/api/career", { cache: "no-store" })).json()).career;
    const out = new Function("c", "arg", src)(c, arg);
    await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
    return out;
  }, { src: fn, arg });
  await go("/carreira/");
  await v2.waitForSelector(".home", { timeout: 20000 });
  const ids = await put(`
    const others = Object.keys(c.standings).filter((id) => id !== String(c.clubId));
    const [a, b] = others;
    c.cup = { active: true, expanded: true, phase: "qf", humanAlive: true, seeds: [], ties: {
      r32: [{ home: c.clubId, away: a, leg1: { gh: 2, ga: 0 }, leg2: { gh: 1, ga: 1 }, winner: c.clubId }],
      r16: [{ home: b, away: c.clubId, leg1: { gh: 1, ga: 2 }, leg2: { gh: 0, ga: 0 }, winner: c.clubId }],
      qf: [{ home: c.clubId, away: a, leg1: { gh: null, ga: null }, leg2: { gh: null, ga: null } }] } };
    c.matchLog = [{ seasonYear: c.seasonYear, round: 3, opponentId: a, home: true, gh: 2, ga: 1 }, { seasonYear: c.seasonYear - 1, round: 20, opponentId: a, home: false, gh: 0, ga: 0 }];
    c.seasonAwards = [{ seasonYear: c.seasonYear - 1, brasileirao: { campeao: c.clubId, vice: a, artilheiro: { jogadorId: "x", nome: "Teste Artilheiro", clubeId: c.clubId, clubeName: c.clubName, valor: 19 }, assistencias: null, melhorJogador: null }, copaDoBrasil: { disputou: false } }];
    c.purchaseHistory = [{ icon: "🎁", name: "Recompensa diária", detail: "Moral do elenco", valueLabel: "+1", valueType: "credit", ts: Date.now() }];
    return { a, b, club: c.clubId };`);

  // 1) Hubs.
  await go("/carreira/jogos");
  await v2.waitForSelector(".hb-row", { timeout: 20000 });
  const jogos = await v2.evaluate(() => [...document.querySelectorAll("a.hb-row")].map((a) => a.getAttribute("href")));
  await go("/carreira/mais");
  await v2.waitForSelector(".hb-row", { timeout: 20000 });
  const mais = await v2.evaluate(() => [...document.querySelectorAll("a.hb-row")].map((a) => a.getAttribute("href")));
  check("1) Jogos e Mais: todas as linhas abrem telas da v2 (nenhuma ↗):",
    ["/carreira/copa", "/carreira/estatisticas"].every((h) => jogos.includes(h)) && ["/carreira/conquistas", "/carreira/premiacoes", "/carreira/ranking", "/carreira/loja", "/carreira/configuracoes", "/carreira/ajuda", "/carreira/saves"].every((h) => mais.includes(h))
    && ![...jogos, ...mais].some((h) => h.startsWith("/carreira-old")), JSON.stringify({ jogos, mais }));

  // 2) Copa.
  await go("/carreira/copa", "A caminho da taça.");
  await at360("copa");
  const c2a = await v2.evaluate(() => document.querySelector(".pr-select").textContent);
  await v2.click(".pr-select");
  await v2.locator('[role="dialog"] .pr-opt', { hasText: "Oitavas de final" }).click();
  await v2.waitForFunction(() => document.querySelector(".pr-select").textContent.includes("Oitavas"));
  const c2 = await v2.evaluate(() => Object.fromEntries([...document.querySelectorAll(".wk-item")].map((i) => [i.querySelector("dt").textContent, i.querySelector("dd").textContent])));
  check("2) Copa: 'A caminho da taça.', fase atual (Quartas) e, nas Oitavas, ida 2 × 1, volta 0 × 0, agregado 2 × 1 (do seu ponto de vista):",
    /Quartas/.test(c2a) && c2.Ida === "2 × 1" && c2.Volta === "0 × 0" && c2.Agregado === "2 × 1", JSON.stringify({ c2a, c2 }));

  // 3) Estatísticas.
  await go("/carreira/estatisticas", "O jogo em números.");
  await at360("estatisticas");
  const s3a = await v2.evaluate(() => [...document.querySelectorAll(".wk-sec .kicker-caps")].map((h) => h.textContent));
  await v2.locator(".pr-tab", { hasText: "Campeonato" }).click();
  await v2.locator(".pr-tab", { hasText: "Histórico" }).click();
  await v2.waitForFunction(() => location.search.includes("historico"));
  const s3b = await v2.evaluate(() => [...document.querySelectorAll(".wk-sec .kicker-caps")].map((h) => h.textContent));
  check("3) Estatísticas: Meu time × Temporada (retrospecto, gols, disciplina, mandante × visitante e mais); Campeonato × Histórico (campeões):",
    s3a.slice(0, 4).join("|") === "Retrospecto|Gols|Disciplina e defesa|Mandante × visitante" && s3b[0] === "Campeões", JSON.stringify({ s3a, s3b }));

  // 4) Retrospecto e Premiações.
  await go(`/carreira/clube-elenco?id=${encodeURIComponent(ids.a)}`, "Conheça o adversário.");
  await v2.locator("a.pr-row", { hasText: "Histórico do duelo" }).click();
  await waitH1("O histórico do duelo.");
  await at360("retrospecto");
  const h4 = await v2.evaluate(() => ({ rows: [...document.querySelectorAll(".wk-item dd")].map((d) => d.textContent), games: document.querySelectorAll(".gm-game").length }));
  await go("/carreira/premiacoes", "Quem fez a diferença.");
  await at360("premiacoes");
  const p4 = await v2.evaluate(() => document.body.innerText);
  check("4) Retrospecto pelo elenco do adversário (1V 1E 0D, 2 jogos); Premiações com o artilheiro e o seu título:",
    h4.rows.slice(0, 3).join(",") === "1,1,0" && h4.games === 2 && /Teste Artilheiro|T\. Artilheiro/.test(p4) && /19 gols/.test(p4) && /1× Brasileirão/.test(p4), JSON.stringify({ h4 }));

  // 5) Conquistas e Ranking.
  await go("/carreira/conquistas", "Sua vitrine.");
  await v2.waitForSelector(".mo-badge", { timeout: 30000 });
  const n5 = await v2.locator(".mo-badge").count();
  await v2.click(".mo-badge >> nth=0");
  await v2.waitForSelector("#ac-t");
  const det = await v2.textContent('[role="dialog"]');
  await v2.click('[role="dialog"] .text-btn');
  await at360("conquistas");
  await go("/carreira/ranking", "Veja sua posição.");
  await v2.waitForSelector(".mo-rank, .wk-sec[role=tabpanel] .wk-note", { timeout: 30000 });
  await at360("ranking");
  const code = await v2.evaluate(() => { const i = [...document.querySelectorAll(".wk-item")].find((x) => x.querySelector("dt").textContent === "Seu código"); return i ? i.querySelector("dd").textContent : null; });
  const me5 = await v2.locator(".mo-rank.is-me").count();
  await v2.fill("#rk-c", "ZZZZZZ");
  await v2.click(".mo-add .sq-filter");
  await v2.waitForSelector(".inline-error", { timeout: 15000 });
  check("5) Conquistas: as 7 do jogo, com detalhe e progresso; Ranking: sua linha publicada, seu código e erro com código inválido:",
    n5 === 7 && /Progresso|Desbloqueada/.test(det) && !!code && me5 === 1, JSON.stringify({ n5, code, me5 }));

  // 6) Loja.
  await go("/carreira/loja", "Mais opções de jogo.");
  await v2.waitForSelector(".mo-item", { timeout: 30000 });
  await at360("loja");
  const shop = await v2.evaluate(() => ({ items: document.querySelectorAll(".mo-item").length, saldo: document.querySelector(".mk-big").textContent }));
  await v2.locator(".mo-item", { hasText: "Reset de Moral" }).locator("button").click();
  await v2.waitForSelector("#lj-t");
  const blocked = await v2.evaluate(() => document.querySelector('[role="dialog"] .sp-sheet-cta').getAttribute("aria-disabled"));
  await v2.click('[role="dialog"] .text-btn');
  await go("/carreira/loja/historico", "Suas compras.");
  await v2.waitForFunction(() => !document.querySelector(".state"), null, { timeout: 30000 });
  const hist = await v2.evaluate(() => document.body.innerText.includes("Recompensa diária"));
  check("6) Loja: 5 pacotes + 6 itens, saldo 0 bloqueia a compra de item; histórico de compras:",
    shop.items === 11 && /^0 créditos/.test(shop.saldo) && blocked === "true" && hist, JSON.stringify({ shop, blocked, hist }));

  // 7) Configurações, perfil e ajuda.
  await go("/carreira/configuracoes", "Do seu jeito.");
  await v2.waitForSelector(".mo-toggle", { timeout: 30000 });
  await at360("configuracoes");
  const before = (await serverCareer(v2)).notificationSettings || { partida: true, loja: false, lesao: true };
  await v2.locator(".mo-toggle", { hasText: "Alertas de lesão" }).click();
  await v2.waitForSelector(".pr-ok", { timeout: 30000 });
  const after = (await serverCareer(v2)).notificationSettings;
  await v2.locator(".mo-toggle", { hasText: "Efeitos sonoros" }).click();
  await v2.waitForFunction(() => document.querySelector(".pr-ok") && /Efeitos sonoros/.test(document.querySelector(".pr-ok").textContent), null, { timeout: 30000 });
  const sfx = await v2.evaluate(() => localStorage.getItem("mt_sfx_enabled"));
  await go("/carreira/configuracoes/perfil", "Seu nome no jogo.");
  await v2.waitForSelector("#ep-n");
  await v2.fill("#ep-n", "Treinador Teste V2");
  await v2.click(".pr .cal-foot .cta");
  await v2.waitForSelector(".pr-ok", { timeout: 30000 });
  const name = await v2.evaluate(async () => (await (await fetch("/api/auth/me")).json()).user.name);
  await go("/carreira/ajuda", "Como podemos ajudar?");
  await v2.fill("#hp-q", "fadiga");
  const faq = await v2.locator(".mo-faq").count();
  await at360("ajuda");
  check("7) Configurações: alerta de lesão e som gravados; nome do treinador salvo na conta; ajuda com busca:",
    after.lesao === !before.lesao && sfx !== null && name === "Treinador Teste V2" && faq === 1, JSON.stringify({ before, after, sfx, name, faq }));

  // 8) Orçamento.
  await go("/carreira/diretoria");
  await v2.waitForSelector(".bd-link", { timeout: 20000 });
  await v2.locator("a.bd-link", { hasText: "Pedir mais orçamento" }).click();
  await waitH1("Peça reforço.");
  await at360("orcamento");
  await v2.click(".pr .cal-foot .cta");
  await v2.waitForFunction(() => ["Pedido aprovado.", "Pedido negado."].includes((document.querySelector("h1") || {}).textContent), null, { timeout: 30000 });
  await v2.waitForSelector(".pr .cal-foot .sp-why", { timeout: 30000 });
  const o8 = await v2.evaluate(() => ({ h1: document.querySelector("h1").textContent, wait: (document.querySelector(".sp-why") || {}).textContent || "", dis: document.querySelector(".pr .cal-foot .cta").getAttribute("aria-disabled") }));
  const s8 = await serverCareer(v2);
  check("8) Diretoria → 'Pedir mais orçamento': resposta gravada (decisão e rodada) e espera de 4 rodadas:",
    s8.lastBoardRequestRound === s8.currentRound && !!s8.boardDecision && /4 rodadas/.test(o8.wait) && o8.dis === "true", JSON.stringify({ o8, last: s8.lastBoardRequestRound }));

  // 9) Saves.
  await go("/carreira/saves", "Sua carreira salva.");
  await at360("saves");
  await v2.locator("button.pr-row", { hasText: "Reiniciar carreira" }).click();
  await v2.waitForSelector("#sv-t");
  const lockedBefore = await v2.evaluate(() => document.querySelector('[role="alertdialog"] .text-btn').disabled);
  await v2.fill('[role="alertdialog"] input', "reiniciar");
  await v2.click('[role="alertdialog"] .text-btn');
  await v2.waitForFunction(() => location.pathname !== "/carreira/saves" && !document.querySelector(".home") && document.querySelector("h1"), null, { timeout: 30000 });
  const h9 = await v2.evaluate(() => document.querySelector("h1").textContent);
  const gone = await v2.evaluate(async () => (await (await fetch("/api/career", { cache: "no-store" })).json()).career);
  check("9) Saves: reiniciar só depois de digitar REINICIAR; apaga a carreira e abre a criação da v2:", lockedBefore === true && !gone && !/carreira-old/.test(v2.url()), JSON.stringify({ lockedBefore, gone: !!gone, url: v2.url(), h9 }));

  check("10) 360 px sem rolagem horizontal e alvos ≥ 44 px; nada por /carreira-old:",
    Object.values(sizes).every((s) => s.overflow <= 0 && s.small.length === 0) && !visited.some((p) => p.startsWith("/carreira-old")),
    JSON.stringify({ sizes, old: visited.filter((p) => p.startsWith("/carreira-old")) }));

  await browser.close();
})();
