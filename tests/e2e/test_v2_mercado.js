// Carreira 2.0 — fase 8 do plano de independência (mercado), pela UI real,
// conferindo o save a cada passo. Respostas de clubes (contraproposta,
// propostas pelo anúncio, proposta por um jogador seu) são preparadas no save
// pelo servidor, porque o motor só as gera ao simular rodadas.
//  1) Mercado: lista de reforços (sem os seus), janela aberta, filtro Goleiro.
//  2) Perfil do alvo → Fazer proposta (valor livre, 2x) → "Proposta enviada.";
//     save com a proposta.
//  3) Negociação: aumentar com valor livre (também na contraproposta) grava;
//     aceitar a contraproposta abre "Confirme seu reforço." com o impacto e,
//     confirmada, o jogador chega e o caixa cai a 1ª parcela.
//  4) Desistir de uma proposta (com confirmação) a retira do save.
//  5) Ficha → "Colocar à venda" → anúncio gravado; Minhas vendas.
//  6) Propostas recebidas: recusar só uma; escolher outra → confirmar → venda.
//  7) Empréstimo de entrada (75% do salário) e de saída (clube sorteado, taxa).
//  8) Histórico em abas; proposta pendente pelo Mercado → Aceitar.
//  9) 360 px sem rolagem horizontal e alvos ≥ 44 px; nada por /carreira-old.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, serverCareer } = require("./_v2_match");

const base = "http://localhost:8787";

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  await newCareer(page, `v2mk${Date.now()}@teste.com`);
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
  await go("/");
  await v2.waitForSelector(".home", { timeout: 20000 });
  // Caixa folgado e teto alto para as compras do teste (o motor checa os
  // dois) e janela aberta (a carreira nova começa com ela fechada): a semana
  // atual passa a ser de pré-temporada, uma das fases de janela do calendário.
  const prep = await put(`
    c.finances.cash = 500000000; c.finances.wageCap = 50000000;
    if (c.calendar) c.calendar.weeks[c.calendar.idx].p = "pre";
    const clubs = Object.keys(c.leagueSquads).filter((id) => id !== String(c.clubId));
    const pick = (i) => { const sq = c.leagueSquads[clubs[i]]; const p = sq.slice().sort((a, b) => a.overall - b.overall)[0]; return { club: clubs[i], id: p.id, name: p.name, value: p.value, wage: p.wage }; };
    return { a: pick(0), b: pick(1), d: pick(2), e: pick(3), mine: c.squad.filter((p) => p.origin === "principal").map((p) => p.id), gk: c.squad.length };
  `);

  // 1) Lista e filtro.
  await go("/mercado", "Busque seu reforço.");
  await v2.waitForSelector(".mk-list li", { timeout: 30000 });
  const l1 = await v2.evaluate(() => ({ window: document.querySelector(".mk-window").textContent, count: document.querySelector(".sq-count").textContent }));
  await v2.click(".sq-filter");
  await v2.waitForSelector("#mf-t");
  await v2.locator('[aria-labelledby="mf-pos"] .pr-seg-btn', { hasText: "Goleiro" }).click();
  await v2.click('[role="dialog"] .cta');
  await v2.waitForFunction(() => document.querySelector(".sq-filter").textContent === "Filtros (1)");
  const gks = await v2.evaluate(() => [...document.querySelectorAll(".mk-list .row-sub")].every((s) => s.textContent.startsWith("Goleiro")));
  await at360("mercado");
  await v2.click(".sq-filter"); await v2.click('[role="dialog"] .text-btn');
  check("1) Mercado: reforços com janela aberta e filtro de posição (Goleiro):", /Janela aberta/.test(l1.window) && /Mostrando 40 de \d+/.test(l1.count) && gks, JSON.stringify({ l1, gks }));

  // 2) Fazer proposta.
  const offerValue = Math.round(prep.a.value * 0.9 / 1000) * 1000;
  await go(`/mercado/alvo?clube=${encodeURIComponent(prep.a.club)}&id=${encodeURIComponent(prep.a.id)}`, "Conheça seu reforço.");
  await at360("alvo");
  await v2.click(".pr .cal-foot .cta");
  await waitH1("Faça sua oferta.");
  await v2.fill("#pp-v", String(offerValue));
  await v2.locator('[aria-labelledby="pp-n"] .pr-seg-btn', { hasText: "2x" }).click();
  await at360("proposta");
  await v2.click(".pr .cal-foot .cta");
  await waitH1("Proposta enviada.");
  const s2 = await serverCareer(v2);
  const o2 = (s2.pendingOffersOut || []).find((o) => o.playerId === prep.a.id);
  check("2) Perfil do alvo → Fazer proposta (valor livre, 2x) → 'Proposta enviada.'; save com a proposta:",
    !!o2 && o2.offerValue === offerValue && o2.installments === 2 && o2.status === "pending", JSON.stringify(o2));

  // 3) Contraproposta: aumentar (valor livre) e depois aceitar com confirmação.
  const counter = Math.round(prep.a.value * 1.1 / 1000) * 1000;
  await put(`const o = c.pendingOffersOut.find((x) => x.id === arg.id); o.status = "countered"; o.counterValue = arg.v;`, { id: o2.id, v: counter });
  await go(`/mercado/negociacao?id=${encodeURIComponent(o2.id)}`, "A negociação continua.");
  await v2.waitForSelector("#ng-c");
  await at360("negociacao");
  await v2.locator("button.pr-row", { hasText: "Aumentar proposta" }).click();
  await v2.waitForSelector("#rs-t");
  const raised = offerValue + 50000;
  await v2.fill("#rs-v", String(raised));
  await v2.click('[role="dialog"] .sp-sheet-cta');
  await v2.waitForSelector(".pr-ok", { timeout: 30000 });
  const s3a = await serverCareer(v2);
  const o3 = s3a.pendingOffersOut.find((o) => o.id === o2.id);
  await put(`const o = c.pendingOffersOut.find((x) => x.id === arg.id); o.status = "countered"; o.counterValue = arg.v;`, { id: o2.id, v: counter });
  await go(`/mercado/negociacao?id=${encodeURIComponent(o2.id)}`, "A negociação continua.");
  const cash0 = (await serverCareer(v2)).finances.cash;
  await v2.click(".pr .cal-foot .cta");
  await v2.waitForSelector("#cc-t");
  const sheet3 = await v2.evaluate(() => [...document.querySelectorAll('[role="dialog"] .wk-item dt')].map((d) => d.textContent));
  await v2.click('[role="dialog"] .sp-sheet-cta');
  await v2.waitForFunction(() => ["Reforço contratado.", "Sua vez de falar."].includes((document.querySelector("h1") || {}).textContent), null, { timeout: 30000 });
  const s3 = await serverCareer(v2);
  const per = Math.round(counter / 2 / 1000) * 1000;
  check("3) Negociação: aumentar com valor livre grava; contraproposta aceita → 'Confirme seu reforço.' com o impacto → jogador no elenco, caixa −1ª parcela:",
    o3.offerValue === raised && o3.status === "pending" && sheet3.includes("Caixa") && sheet3.includes("Folha salarial mensal")
    && s3.squad.some((p) => p.id === prep.a.id) && s3.finances.cash === cash0 - per && !(s3.pendingOffersOut || []).some((o) => o.id === o2.id),
    JSON.stringify({ o3: [o3.offerValue, o3.status], sheet3, cash: [cash0, s3.finances.cash, per] }));

  // 4) Desistir.
  await go(`/mercado/proposta?clube=${encodeURIComponent(prep.b.club)}&id=${encodeURIComponent(prep.b.id)}`, "Faça sua oferta.");
  await v2.click(".pr .cal-foot .cta");
  await waitH1("Proposta enviada.");
  await go("/mercado/propostas", "Suas negociações.");
  await v2.click(".wk-sec a.pr-row >> nth=0");
  await waitH1("A negociação continua.");
  await v2.click(".pr .cal-foot .link-back");
  await v2.waitForSelector("#qt-t");
  await v2.click('[role="alertdialog"] .text-btn');
  await waitH1("Suas negociações.");
  const s4 = await serverCareer(v2);
  check("4) Desistir (com confirmação) retira a proposta do save:", !(s4.pendingOffersOut || []).some((o) => o.playerId === prep.b.id), JSON.stringify(s4.pendingOffersOut || []));

  // 5) Colocar à venda pela ficha.
  const sell = s4.squad.filter((p) => p.origin === "principal" && p.id !== prep.a.id)[2];
  await go(`/elenco/ficha?id=${encodeURIComponent(sell.id)}&tela=numeros`, "A temporada em números.");
  await v2.locator("button.pr-row", { hasText: "Colocar à venda" }).click();
  await v2.waitForSelector("#ls-t");
  await at360("anunciar");
  await v2.fill("#ls-v", String(sell.value + 100000));
  await v2.click('[role="dialog"] .sp-sheet-cta');
  await v2.waitForSelector(".pr-ok", { timeout: 30000 });
  const s5 = await serverCareer(v2);
  const l5 = (s5.pendingListings || []).find((l) => l.playerId === sell.id);
  check("5) Ficha → 'Colocar à venda' → anúncio gravado com o valor pedido:", !!l5 && l5.askingValue === sell.value + 100000, JSON.stringify(l5));

  // 6) Propostas recebidas: recusar só uma, escolher outra.
  await put(`const l = c.pendingListings.find((x) => x.id === arg.id);
    l.offers = [{ id: "lo1", clubId: arg.c1, clubName: "Clube Um", value: 3000000, installments: 1, round: 1 }, { id: "lo2", clubId: arg.c2, clubName: "Clube Dois", value: 4000000, installments: 2, round: 1 }];`, { id: l5.id, c1: prep.d.club, c2: prep.e.club });
  await go("/mercado/vendas", "Jogadores no mercado.");
  await at360("vendas");
  await v2.locator("a.pr-row", { hasText: "Propostas recebidas" }).click();
  await waitH1("Escolha a melhor oferta.");
  await at360("ofertas");
  await v2.click(".mk-offer >> nth=0");
  await v2.click(".mk-reject");
  await v2.waitForSelector(".pr-ok", { timeout: 30000 });
  const after1 = (await serverCareer(v2)).pendingListings.find((l) => l.id === l5.id).offers.map((o) => o.id);
  const cash6 = (await serverCareer(v2)).finances.cash;
  await v2.click(".mk-offer >> nth=0");
  await v2.click(".pr .cal-foot .cta");
  await v2.waitForSelector("#cv-t");
  await v2.click('[role="dialog"] .sp-sheet-cta');
  await v2.waitForFunction(() => ["Venda concluída.", "Sua vez de falar."].includes((document.querySelector("h1") || {}).textContent), null, { timeout: 30000 });
  const s6 = await serverCareer(v2);
  check("6) Recusar só uma proposta mantém o anúncio; escolher outra → confirmar → vendido, caixa +1ª parcela:",
    after1.join() === "lo2" && !s6.squad.some((p) => p.id === sell.id) && s6.finances.cash === cash6 + 2000000 && !(s6.pendingListings || []).some((l) => l.id === l5.id),
    JSON.stringify({ after1, cash: [cash6, s6.finances.cash] }));

  // 7) Empréstimos: entrada (75%) e saída (clube sorteado; tenta de novo se ninguém quiser).
  await go(`/mercado/emprestimo?clube=${encodeURIComponent(prep.d.club)}&id=${encodeURIComponent(prep.d.id)}`, "Combine o empréstimo.");
  await v2.locator('[aria-labelledby="ln-p"] .pr-seg-btn', { hasText: "75%" }).click();
  await at360("emprestimo-entrada");
  await v2.click(".pr .cal-foot .cta");
  await waitH1("Empréstimo fechado.");
  const s7a = await serverCareer(v2);
  const in7 = s7a.squad.find((p) => p.id === prep.d.id);
  const out = s7a.squad.filter((p) => p.origin === "principal" && p.overall < 70)[0] || s7a.squad.filter((p) => p.origin === "principal").slice(-1)[0];
  let prepOk = false;
  for (let i = 0; i < 6 && !prepOk; i++) {
    await go(`/mercado/emprestimo?id=${encodeURIComponent(out.id)}`, "Combine o empréstimo.");
    await v2.waitForFunction(() => document.querySelector(".pr .wk-item") || document.querySelector(".pr .inline-error"), null, { timeout: 30000 });
    prepOk = await v2.evaluate(() => !!document.querySelector(".pr .wk-item"));
  }
  const prep7 = await v2.evaluate(() => [...document.querySelectorAll(".pr .wk-item dt")].map((d) => d.textContent));
  await v2.click(".pr .cal-foot .cta");
  await waitH1("Empréstimo fechado.");
  const s7 = await serverCareer(v2);
  const lent = Object.values(s7.leagueSquads).flat().find((p) => p.id === out.id);
  check("7) Empréstimo de entrada (75% do salário) e de saída (clube interessado e taxa, sem campo de %):",
    !!in7 && in7.origin === "loan" && in7.wage === Math.round(prep.d.wage * 0.75 / 100) * 100 && prepOk && prep7.includes("Clube interessado") && prep7.includes("Taxa que você recebe")
    && !s7.squad.some((p) => p.id === out.id) && !!lent && String(lent.onLoanFromClubId) === String(s7.clubId),
    JSON.stringify({ in7: in7 && [in7.origin, in7.wage], prep7, lent: !!lent }));

  // 8) Histórico e proposta pendente.
  await go("/mercado/historico", "O mercado do clube.");
  const tabs = {};
  for (const t of ["Compras", "Vendas", "Empréstimos"]) { await v2.locator(".pr-tab", { hasText: t }).click(); tabs[t] = await v2.locator(".mk-log").count(); }
  await at360("historico");
  const po = s7.squad.filter((p) => p.origin === "principal")[4];
  await put(`c.pendingOffer = { playerId: arg.id, playerName: arg.name, clubId: arg.club, clubName: "Clube Três", fee: 1234000, round: c.currentRound };`, { id: po.id, name: po.name, club: prep.e.club });
  await go("/mercado", "Busque seu reforço.");
  await v2.locator("a.pr-row", { hasText: "Clube Três quer" }).click();
  await waitH1("Uma oferta chegou.");
  const cash8 = (await serverCareer(v2)).finances.cash;
  await v2.click(".pr .cal-foot .cta");
  await waitH1("Venda concluída.");
  const s8 = await serverCareer(v2);
  check("8) Histórico em abas (compras, vendas, empréstimos) e proposta pendente pelo Mercado → Aceitar → vendido:",
    tabs.Compras >= 2 && tabs.Vendas >= 1 && tabs["Empréstimos"] >= 2 && !s8.pendingOffer && !s8.squad.some((p) => p.id === po.id) && s8.finances.cash === cash8 + 1234000,
    JSON.stringify({ tabs, cash: [cash8, s8.finances.cash] }));

  check("9) 360 px sem rolagem horizontal e alvos ≥ 44 px; nada por /carreira-old:",
    Object.values(sizes).every((s) => s.overflow <= 0 && s.small.length === 0) && !visited.some((p) => p.startsWith("/carreira-old")),
    JSON.stringify({ sizes, old: visited.filter((p) => p.startsWith("/carreira-old")) }));

  await browser.close();
})();
