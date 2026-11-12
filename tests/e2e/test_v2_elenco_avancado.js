// Carreira 2.0 — fase 7 do plano de independência (elenco avançado), pela UI
// real, conferindo o save a cada passo. Alguns jogadores são preparados no
// save (fim de contrato, banco, moral) pelo servidor.
//  1) Elenco: busca por nome e filtros (posição) da v2.
//  2) Perfil → "Contrato e ações" → Ficha completa; renovar fora do último ano
//     fica inativo com o motivo.
//  3) Renovar (último ano, salário sugerido, 2 anos) → "Proposta aceita.";
//     o save tem o novo contrato.
//  4) Renovar com moral baixa (Contratos) → "Proposta recusada." com o motivo
//     → coletiva avulsa → resposta grava o efeito → volta aos Contratos.
//  5) Conversa (jogador insatisfeito) → "Conversa encerrada." com o efeito
//     real na moral, gravado.
//  6) Mais ações: tirar do banco; dispensar com confirmação.
//  7) Comparar com outro do elenco (mesma posição).
//  8) Tabela → clube adversário → elenco → jogador → "Comparar com o meu".
//  9) 360 px sem rolagem horizontal e alvos ≥ 44 px; nada por /carreira-old.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, serverCareer } = require("./_v2_carreira");

const base = "http://localhost:8787";

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  await newCareer(page, `v2el${Date.now()}@teste.com`);
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
  await go("/");
  await v2.waitForSelector(".home", { timeout: 20000 });

  // Preparação no save: R (renova), M (moral baixa, renovação recusada), T (insatisfeito no banco).
  const prep = await v2.evaluate(async () => {
    const c = (await (await fetch("/api/career", { cache: "no-store" })).json()).career;
    const pros = c.squad.filter((p) => p.origin === "principal");
    const [r, m, t] = [pros[3], pros[4], pros[5]];
    r.contractUntil = c.seasonYear; r.morale = 70;
    m.contractUntil = c.seasonYear; m.morale = 20;
    t.contractUntil = c.seasonYear + 2; t.benchStreak = 4; t.morale = 50; t.lastTalkRound = null;
    await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
    return { r: r.id, rName: r.name, rWage: r.wage, m: m.id, mName: m.name, t: t.id, tMorale: 50, year: c.seasonYear, other: pros.find((p) => p.contractUntil > c.seasonYear && p.id !== t.id).id, gk: c.squad.filter((p) => p.group === "G").length, pressLog: (c.pressLog || []).length };
  });

  // 1) Busca e filtros.
  await go("/elenco");
  await v2.waitForSelector(".sq-tools", { timeout: 20000 });
  await v2.fill("#sq-q", prep.rName.split(" ")[0]);
  const search = await v2.evaluate(() => [...document.querySelectorAll(".sq-name")].map((n) => n.textContent));
  await v2.fill("#sq-q", "");
  await v2.click(".sq-filter");
  await v2.waitForSelector("#ft-t");
  await v2.locator('[aria-labelledby="ft-pos"] .pr-seg-btn', { hasText: "Goleiro" }).click();
  await v2.click('[role="dialog"] .cta');
  await v2.waitForSelector(".sq-count");
  const gk = await v2.evaluate(() => ({ n: document.querySelectorAll(".sq-row").length, btn: document.querySelector(".sq-filter").textContent }));
  await at360("elenco");
  check("1) Elenco: busca por nome e filtro de posição (Goleiro) da v2:", search.length >= 1 && gk.n === prep.gk && gk.btn === "Filtros (1)", JSON.stringify({ search, gk, expected: prep.gk }));
  await v2.click(".sq-filter");
  await v2.click('[role="dialog"] .text-btn'); // Limpar filtros

  // 2) Perfil → Ficha; renovar inativo fora do último ano.
  await go(`/elenco/jogador?id=${encodeURIComponent(prep.other)}`);
  await v2.waitForSelector(".pf-legacy", { timeout: 20000 });
  await v2.click(".pf-legacy");
  await waitH1("Conheça seu jogador.");
  const f2 = await v2.evaluate(() => ({ facts: [...document.querySelectorAll(".wk-item dt")].map((d) => d.textContent), renew: document.querySelector(".pr .cal-foot .cta").getAttribute("aria-disabled"), why: document.querySelector(".sp-why")?.textContent || "" }));
  await at360("ficha");
  check("2) Perfil → Ficha completa: idade, potencial, moral, contrato; renovar inativo com o motivo:",
    ["Idade", "Potencial", "Moral", "Salário mensal", "Término", "Valor de mercado"].every((l) => f2.facts.includes(l)) && f2.renew === "true" && /último ano de contrato/.test(f2.why), JSON.stringify(f2));

  // 3) Renovar (aceita).
  await go(`/elenco/ficha?id=${encodeURIComponent(prep.r)}`, "Conheça seu jogador.");
  await v2.click(".pr .cal-foot .cta");
  await v2.waitForSelector("#rn-t");
  const sug = await v2.inputValue("#rn-w");
  await at360("renovar");
  await v2.click('[role="dialog"] .sp-sheet-cta');
  await v2.waitForSelector("#rn-r");
  const r3 = await v2.textContent("#rn-r");
  const s3 = await serverCareer(v2);
  const p3 = s3.squad.find((p) => p.id === prep.r);
  check("3) Renovar no último ano, salário sugerido e 2 anos: 'Proposta aceita.'; save com contrato até +2 e o novo salário:",
    r3 === "Proposta aceita." && p3.contractUntil === prep.year + 2 && p3.wage === Number(sug), JSON.stringify({ r3, sug, wage: p3.wage, until: p3.contractUntil }));
  await v2.click('[role="dialog"] .text-btn');

  // 4) Renovação recusada → coletiva avulsa (pelos Contratos).
  await go("/contratos", "Cuide da continuidade.");
  await v2.locator('.pr-tab', { hasText: "Vencendo" }).click();
  const venc = await v2.evaluate(() => [...document.querySelectorAll(".sp-player .row-title")].map((t) => t.textContent));
  await at360("contratos");
  await v2.locator("li", { has: v2.locator(".row-title", { hasText: prep.mName.split(" ").slice(-1)[0] }) }).locator("button.pr-row").click();
  await v2.waitForSelector("#rn-t");
  await v2.click('[role="dialog"] .sp-sheet-cta');
  await v2.waitForSelector("#rn-r");
  const r4 = await v2.evaluate(() => ({ t: document.querySelector("#rn-r").textContent, why: document.querySelector(".sp-reason")?.textContent }));
  await v2.click('[role="dialog"] .cta'); // Continuar → coletiva
  await waitH1("Sua vez de falar.");
  await v2.click(".pj-answer");
  await v2.waitForSelector(".pj-effect");
  await v2.click(".pj .cal-foot .cta");
  await waitH1("Cuide da continuidade.");
  const s4 = await serverCareer(v2);
  const m4 = s4.squad.find((p) => p.id === prep.m);
  check("4) Moral baixa: 'Proposta recusada.' com o motivo → coletiva avulsa → resposta gravada → volta aos Contratos; contrato não muda:",
    venc.length >= 1 && r4.t === "Proposta recusada." && /infeliz no clube/.test(r4.why) && (s4.pressLog || []).length === prep.pressLog + 1 && m4.contractUntil === prep.year,
    JSON.stringify({ venc, r4, press: [prep.pressLog, (s4.pressLog || []).length], until: m4.contractUntil }));

  // 5) Conversa.
  await go(`/elenco/ficha?id=${encodeURIComponent(prep.t)}`, "Conheça seu jogador.");
  await v2.click('.pr .cal-foot a.link-back');
  await waitH1("Abra o diálogo.");
  await at360("conversa");
  await v2.locator(".pj-answer", { hasText: "Ouvir e apoiar" }).click();
  await waitH1("Conversa encerrada.");
  const c5 = await v2.evaluate(() => ({ fx: document.querySelector(".wk-item dd").textContent, txt: document.querySelector(".dm-reason").textContent }));
  const s5 = await serverCareer(v2);
  const t5 = s5.squad.find((p) => p.id === prep.t);
  check("5) Conversa com jogador insatisfeito: 'Ouvir e apoiar' → reação e efeito +12 na moral, gravados (1x por rodada):",
    c5.fx === "+12" && t5.morale === prep.tMorale + 12 && t5.lastTalkRound === s5.currentRound && /ouvido/.test(c5.txt), JSON.stringify({ c5, morale: t5.morale, last: t5.lastTalkRound }));

  // 6) Mais ações: banco e dispensa.
  // (o banco costuma estar cheio — 11 — então o teste tira um reserva do banco)
  const benchId = s5.lineup.bench[0];
  await go(`/elenco/ficha?id=${encodeURIComponent(benchId)}`, "Conheça seu jogador.");
  await v2.locator("button.pr-row", { hasText: "Tirar do banco" }).click();
  await v2.waitForSelector(".pr-ok", { timeout: 30000 });
  const benchOk = !(await serverCareer(v2)).lineup.bench.includes(benchId);
  const rel = s5.squad.filter((p) => p.origin === "base")[0];
  await go(`/elenco/ficha?id=${encodeURIComponent(rel.id)}`, "Conheça seu jogador.");
  await v2.locator("button.pr-row", { hasText: "Dispensar" }).click();
  await v2.waitForSelector("#fa-t");
  const ask6 = await v2.textContent("#fa-t");
  await v2.click('[role="alertdialog"] .text-btn');
  await v2.waitForURL(/\/elenco$/, { timeout: 15000 });
  const s6 = await serverCareer(v2);
  check("6) Mais ações: 'Tirar do banco' grava; 'Dispensar' pede confirmação e tira o jogador do elenco:",
    benchOk === true && ask6 === "Dispensar?" && !s6.squad.some((p) => p.id === rel.id), JSON.stringify({ benchOk, ask6 }));

  // 7) Comparar.
  await go(`/elenco/comparar?a=${encodeURIComponent(prep.r)}`, "Compare lado a lado.");
  await v2.click(".pr .cal-foot .cta");
  await v2.click('[role="dialog"] .pr-opt >> nth=0');
  await v2.waitForSelector(".sp-cmp");
  const c7 = await v2.evaluate(() => ({ cols: document.querySelectorAll(".sp-cmp-col").length, rows: [...document.querySelectorAll(".wk-item dt")].map((d) => d.textContent), verdict: document.querySelector(".wk-note")?.textContent || "" }));
  await at360("comparar");
  check("7) Comparar: dois jogadores lado a lado, atributos, salário, valor e o veredito de custo-benefício:",
    c7.cols === 2 && c7.rows.join("|") === "Ataque|Defesa|Físico|Salário mensal|Valor de mercado" && /custo-benefício/.test(c7.verdict), JSON.stringify(c7));

  // 8) Outro clube.
  await go("/tabela");
  await v2.waitForSelector(".tb-row", { timeout: 15000 });
  await v2.locator(".tb-row:not(.is-me)").first().click();
  await waitH1("Conheça o adversário.");
  await at360("outro-clube");
  await v2.click(".sp-player >> nth=0");
  await v2.waitForFunction(() => location.pathname === "/clube-elenco/jogador");
  await v2.locator(".row", { hasText: "Comparar com o meu" }).click();
  await waitH1("Compare lado a lado.");
  await v2.click(".pr .cal-foot .cta");
  const pool = await v2.locator('[role="dialog"] .pr-opt').count();
  if (pool) { await v2.click('[role="dialog"] .pr-opt >> nth=0'); await v2.waitForSelector(".sp-cmp"); }
  check("8) Tabela → clube adversário → jogador → 'Comparar com o meu':", pool === 0 || (await v2.locator(".sp-cmp-col").count()) === 2, JSON.stringify({ pool }));

  check("9) 360 px sem rolagem horizontal e alvos ≥ 44 px; nada por /carreira-old:",
    Object.values(sizes).every((s) => s.overflow <= 0 && s.small.length === 0) && !visited.some((p) => p.startsWith("/carreira-old")),
    JSON.stringify({ sizes, old: visited.filter((p) => p.startsWith("/carreira-old")) }));

  await browser.close();
})();
