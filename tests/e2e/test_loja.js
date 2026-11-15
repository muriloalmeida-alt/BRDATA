// Loja da carreira oficial (/loja, v2): catálogo (5 pacotes de Créditos BR
// + 6 itens em 3 grupos), saldo da conta, confirmação de compra de pacote e
// de item. O pagamento de verdade (Mercado Pago nos pacotes, débito real de
// créditos nos itens) tem cobertura própria em test_loja_pagamento_real.js;
// este arquivo cobre o catálogo e a confirmação.
// L6a (sem a tela antiga): mesmas checagens do teste anterior, pela v2.
//  1) Conta nova começa com 0 créditos (lido do servidor).
//  2) 5 pacotes; Ouro é o "melhor valor"; preços com centavos.
//  3) 6 itens em 3 grupos, incluindo Uniforme Alternativo.
//  4) Confirmação do Pacote Ouro: 4.480 créditos, R$ 34,90, Mercado Pago.
//  5) "Pagar" chama /api/loja/checkout (sem token aqui: erro) e não muda o saldo.
//  6) Confirmação de item mostra preço e saldo em créditos; sem saldo, bloqueia.
//  7) Cancelar fecha a confirmação.
//  8) Conta freemium abre a Loja sem trava de plano.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await carreiraV2(page, `loja${Date.now()}@teste.com`);
  const norm = (s) => String(s || "").replace(/ /g, " ").trim();
  const conta = () => page.evaluate(async () => (await (await fetch("/api/auth/me", { cache: "no-store" })).json()).user || null);

  // 1) Saldo da conta no servidor.
  const me = await conta();
  check("1) Conta nova começa com 0 créditos (ledger no servidor):", !!me && (me.creditsBR || 0) === 0, JSON.stringify(me && { creditsBR: me.creditsBR }));

  // 2) Loja: pacotes.
  await page.goto(base + "/loja", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mo-item", { timeout: 30000 });
  const cat = await page.evaluate(() => {
    const secs = [...document.querySelectorAll("section.wk-sec")];
    const rows = (s) => [...s.querySelectorAll(".mo-item")].map((r) => ({ t: r.querySelector(".row-title").textContent, b: r.querySelector("button").textContent }));
    const pac = secs.find((s) => /Pacotes de créditos/.test((s.querySelector("h2") || {}).textContent || ""));
    const itens = secs.filter((s) => /^Itens com créditos/.test((s.querySelector("h2") || {}).textContent || ""));
    return { saldo: document.querySelector(".mk-big").textContent, pacotes: pac ? rows(pac) : [], grupos: itens.map((s) => ({ h: s.querySelector("h2").textContent, itens: rows(s) })) };
  });
  const precos = cat.pacotes.map((p) => norm(p.b));
  const destaque = cat.pacotes.filter((p) => /melhor valor/.test(p.t)).map((p) => p.t);
  check("2) Loja mostra o saldo e os 5 pacotes de créditos:", /^0 créditos/.test(cat.saldo) && cat.pacotes.length === 5, JSON.stringify(cat.pacotes));
  check("2b) Pacote Ouro é o destacado (melhor valor):", destaque.length === 1 && /Ouro/.test(destaque[0]), JSON.stringify(destaque));
  check("2c) Preços em reais com centavos (não arredonda R$ 4,90 para R$ 5):", precos.includes("R$ 4,90") && precos.includes("R$ 149,90"), JSON.stringify(precos));

  // 3) Itens com créditos.
  const nomes = cat.grupos.flatMap((g) => g.itens.map((i) => i.t));
  check("3) 6 itens com créditos em 3 grupos:", cat.grupos.length === 3 && nomes.length === 6 && cat.grupos.every((g) => g.itens.every((i) => /^\d+ créditos$/.test(norm(i.b)))), JSON.stringify(cat.grupos));
  check("3b) Inclui Uniforme Alternativo:", nomes.some((n) => n.includes("Uniforme Alternativo")), JSON.stringify(nomes));

  // 4) Confirmação do Pacote Ouro.
  await page.locator(".mo-item", { hasText: "Ouro" }).locator("button").click();
  await page.waitForSelector("#lj-t");
  const pkg = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return { titulo: d.querySelector("#lj-t").textContent, texto: d.innerText, cta: d.querySelector(".sp-sheet-cta").textContent };
  });
  check("4) Confirmação do Pacote Ouro com 4.480 créditos, R$ 34,90 e Mercado Pago:",
    /Ouro/.test(pkg.titulo) && /4\.480/.test(pkg.texto) && norm(pkg.cta) === "Pagar R$ 34,90" && /Mercado Pago/.test(pkg.texto), JSON.stringify(pkg));

  // 5) Pagar chama o checkout de verdade; sem token do Mercado Pago aqui o
  // servidor responde erro, a tela avisa, fica na Loja e o saldo não muda.
  const resp = page.waitForResponse((r) => r.url().includes("/api/loja/checkout"));
  await page.click('[role="dialog"] .sp-sheet-cta');
  const r5 = await resp;
  await page.waitForSelector(".inline-error", { timeout: 15000 }).catch(() => {});
  const tela5 = await page.evaluate(() => ({
    path: location.pathname, sheet: !!document.querySelector("#lj-t"),
    erro: ((document.querySelector(".inline-error") || {}).textContent || "").trim(),
    saldo: document.querySelector(".mk-big").textContent,
  }));
  const me5 = await conta();
  check("5) Pagar chama /api/loja/checkout (erro sem token), avisa, fica na Loja e não muda o saldo:",
    r5.status() >= 400 && tela5.path === "/loja" && !tela5.sheet && tela5.erro.length > 0 && /^0 créditos/.test(tela5.saldo) && (me5.creditsBR || 0) === 0,
    JSON.stringify({ status: r5.status(), ...tela5, creditsBR: me5.creditsBR }));

  // 6) Confirmação de item: preço e saldo em créditos; sem saldo, bloqueia.
  await page.locator(".mo-item", { hasText: "Reset de Moral" }).locator("button").click();
  await page.waitForSelector("#lj-t");
  const boost = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return { titulo: d.querySelector("#lj-t").textContent, texto: d.innerText, cta: d.querySelector(".sp-sheet-cta").textContent, bloqueado: d.querySelector(".sp-sheet-cta").getAttribute("aria-disabled") };
  });
  check("6) Confirmação do item mostra preço e saldo em créditos:",
    /Reset de Moral/.test(boost.titulo) && /Preço\s*\d+ créditos/.test(boost.texto) && /Seu saldo\s*0 créditos/.test(boost.texto) && /^Comprar por \d+ créditos$/.test(norm(boost.cta)), JSON.stringify(boost));
  check("6b) Aviso fala do saldo de créditos (sem texto de outra loja, ex.: Google Play) e bloqueia sem saldo:",
    /Saldo insuficiente/.test(boost.texto) && !/Google Play/i.test(boost.texto) && boost.bloqueado === "true", JSON.stringify(boost));

  // 7) Cancelar fecha.
  await page.click('[role="dialog"] .text-btn');
  await page.waitForSelector("#lj-t", { state: "detached", timeout: 5000 }).catch(() => {});
  check("7) Cancelar fecha a confirmação:", !(await page.$("#lj-t")));

  // 8) Plano freemium sem trava.
  check("8) Conta freemium abriu a Loja sem trava de plano:", !!me && me.plan === "freemium" && cat.pacotes.length === 5, me && me.plan);

  await browser.close();
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
