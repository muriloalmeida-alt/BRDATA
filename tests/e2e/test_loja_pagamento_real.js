// Loja com pagamento de verdade (item 7 da lista de melhorias), na carreira
// oficial (/loja, v2). Roda no perfil "loja-creditos" do run_parallel.js:
// antes do servidor subir, _grant_test_credits.js cria a conta
// LOJA_TEST_EMAIL e credita LOJA_TEST_CREDITS pela mesma addCredits() que o
// webhook do Mercado Pago chama.
// L6a (sem a tela antiga): mesmas checagens do teste anterior, pela v2.
//  1) Pacote: a confirmação mostra o Mercado Pago e o aviso de redirecionamento.
//  2) "Pagar" chama /api/loja/checkout de verdade (sem token nesta sandbox:
//     502, o caminho de erro esperado) e não sai da Loja.
//  3) Item sem saldo: a compra fica bloqueada.
//  4) A conta de teste sobe com o saldo concedido de verdade.
//  5) Comprar "Reset de Moral" debita (5000 − 120 = 4880), põe a moral do
//     elenco em 90 e registra no Histórico de compras.
//  6) "Desconto de Contratação" sugere 15% a menos na próxima proposta.
//  7) Volta do Checkout Pro (?status=approved) limpa a URL e mostra o status.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, saveNoServidor, globaisDoMotor, base } = require("./_v2_carreira");

async function login(page, email) {
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  const r = await page.evaluate(async ({ email }) => (await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) })).status, { email });
  if (r !== 200) throw new Error("login " + r);
}
const conta = (page) => page.evaluate(async () => (await (await fetch("/api/auth/me", { cache: "no-store" })).json()).user || null);
const sheet = (page) => page.evaluate(() => {
  const d = document.querySelector('[role="dialog"]');
  return d && { titulo: d.querySelector("#lj-t").textContent, texto: d.innerText, cta: d.querySelector(".sp-sheet-cta").textContent, bloqueado: d.querySelector(".sp-sheet-cta").getAttribute("aria-disabled") };
});
async function abrirItem(page, nome) {
  await page.goto(base + "/loja", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mo-item", { timeout: 30000 });
  await page.locator(".mo-item", { hasText: nome }).locator("button").click();
  await page.waitForSelector("#lj-t");
}
async function comprar(page, nome) {
  await abrirItem(page, nome);
  // O saldo vem da conta, lida depois do catálogo: espera ele chegar ao sheet.
  await page.waitForFunction(() => !/Seu saldo\s*0 créditos/.test((document.querySelector('[role="dialog"]') || {}).innerText || ""), null, { timeout: 15000 });
  await page.click('[role="dialog"] .sp-sheet-cta');
  await page.waitForSelector("#lj-t", { state: "detached", timeout: 15000 });
  await page.waitForSelector(".pr-ok, .inline-error", { timeout: 15000 });
  return page.evaluate(() => ((document.querySelector(".pr-ok, .inline-error") || {}).textContent || "").trim());
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    headless: true,
    args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await carreiraV2(page, `lojareal${Date.now()}@teste.com`);

  // 1) Pacote: rail de pagamento certo.
  await abrirItem(page, "Bronze");
  const s1 = await sheet(page);
  check("1) Confirmação do pacote mostra o Mercado Pago e avisa que vai para a página dele:",
    /Mercado Pago \(cartão ou Pix\)/.test(s1.texto) && /página segura do Mercado Pago/.test(s1.texto) && /^Pagar R\$/.test(s1.cta.replace(/ /g, " ")), JSON.stringify(s1));

  // 2) Checkout de verdade: 502 sem token, fica na Loja com erro.
  const resp = page.waitForResponse((r) => r.url().includes("/api/loja/checkout"));
  await page.click('[role="dialog"] .sp-sheet-cta');
  const r2 = await resp;
  await page.waitForSelector(".inline-error", { timeout: 15000 }).catch(() => {});
  const t2 = await page.evaluate(() => ({ path: location.pathname, erro: ((document.querySelector(".inline-error") || {}).textContent || "").trim() }));
  check("2) \"Pagar\" chama /api/loja/checkout de verdade (502 sem token nesta sandbox) e não sai da Loja:",
    r2.status() === 502 && t2.path === "/loja" && t2.erro.length > 0, JSON.stringify({ status: r2.status(), ...t2 }));

  // 3) Item sem saldo: bloqueado.
  await abrirItem(page, "Reset de Moral");
  const s3 = await sheet(page);
  check("3) Sem saldo suficiente, a compra do item fica bloqueada:", /créditos/.test(s3.texto) && s3.bloqueado === "true" && /Saldo insuficiente/.test(s3.texto), JSON.stringify(s3));
  await page.click('[role="dialog"] .text-btn');
  await page.close();

  // 4) Conta com saldo concedido antes do servidor subir.
  const p2 = await browser.newPage({ viewport: { width: 390, height: 900 } });
  p2.on("dialog", (d) => d.dismiss());
  p2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const email2 = process.env.LOJA_TEST_EMAIL;
  const esperado = Number(process.env.LOJA_TEST_CREDITS || 5000);
  if (!email2) throw new Error("LOJA_TEST_EMAIL ausente: rode pelo perfil loja-creditos do run_parallel.js");
  await carreiraV2(p2, email2, { criarConta: login });
  const me4 = await conta(p2);
  check("4) Saldo de teste concedido de verdade (addCredits, a mesma função do webhook):", me4 && me4.creditsBR === esperado, JSON.stringify(me4 && { creditsBR: me4.creditsBR }));
  await p2.goto(base + "/loja", { waitUntil: "domcontentloaded" });
  await p2.waitForFunction((n) => (document.querySelector(".mk-big") || {}).textContent === `${n.toLocaleString("pt-BR")} créditos`, esperado, { timeout: 15000 }).catch(() => {});
  const saldoTela = await p2.evaluate(() => (document.querySelector(".mk-big") || {}).textContent);

  // 5) Reset de Moral: débito real, efeito na carreira, histórico.
  const msg5 = await comprar(p2, "Reset de Moral");
  const me5 = await conta(p2);
  const c5 = await saveNoServidor(p2);
  const morais = (c5.squad || []).filter((p) => p.origin !== "loan").map((p) => p.morale);
  await p2.goto(base + "/loja/historico", { waitUntil: "domcontentloaded" });
  await p2.waitForSelector(".wk-item, .wk-note", { timeout: 30000 });
  const hist = await p2.evaluate(() => ((document.querySelector(".wk-item dt") || {}).textContent || ""));
  check("5) Comprar \"Reset de Moral\" debita de verdade (5000 − 120 = 4880), põe a moral em 90 e registra no histórico:",
    /^5\.000 créditos/.test(saldoTela) && me5.creditsBR === esperado - 120 && morais.length > 0 && morais.every((m) => m === 90)
      && c5.purchaseHistory && c5.purchaseHistory[0] && c5.purchaseHistory[0].name === "Reset de Moral" && /Reset de Moral/.test(hist) && /Reset de Moral/.test(msg5),
    JSON.stringify({ saldoTela, msg5, creditsBR: me5.creditsBR, morais: [...new Set(morais)], hist0: c5.purchaseHistory && c5.purchaseHistory[0] && c5.purchaseHistory[0].name, hist }));

  // 6) Desconto de Contratação: a próxima proposta sugere 15% a menos.
  const msg6 = await comprar(p2, "Desconto de Contratação");
  await globaisDoMotor(p2);
  const alvo = await p2.evaluate(() => {
    const l = allMarketPlayers().filter((e) => !e.mine && e.p.value > 0 && e.p.onLoanFromClubId == null).sort((a, b) => a.p.value - b.p.value);
    return { clubId: String(l[0].club.id), id: l[0].p.id, value: l[0].p.value };
  });
  await p2.goto(base + `/mercado/proposta?clube=${encodeURIComponent(alvo.clubId)}&id=${encodeURIComponent(alvo.id)}`, { waitUntil: "domcontentloaded" });
  await p2.waitForSelector("#pp-v", { timeout: 30000 });
  await p2.waitForFunction(() => Number((document.getElementById("pp-v") || {}).value) > 0, null, { timeout: 15000 }).catch(() => {});
  const t6 = await p2.evaluate(() => ({ valor: Number(document.getElementById("pp-v").value), dica: [...document.querySelectorAll(".mk-hint")].map((e) => e.textContent).find((t) => /Desconto/.test(t)) || "" }));
  const esperado6 = Math.round(alvo.value * 0.85);
  check("6) \"Desconto de Contratação\" sugere 15% a menos na próxima proposta:",
    /15%/.test(msg6) && t6.valor === esperado6 && /Desconto de contratação de 15%/.test(t6.dica), JSON.stringify({ msg6, alvo, esperado6, ...t6 }));

  // 7) Volta do Checkout Pro: URL limpa e status na tela. O saldo só muda
  // pelo webhook (sem credencial do Mercado Pago aqui).
  await p2.goto(`${base}/loja?status=approved&payment_id=123&external_reference=credits:x:bronze`, { waitUntil: "domcontentloaded" });
  await p2.waitForSelector(".mo-pay", { timeout: 30000 }).catch(() => {});
  const t7 = await p2.evaluate(() => ({ url: location.pathname + location.search, status: ((document.querySelector(".mo-pay") || {}).textContent || "") }));
  check("7) Volta do Checkout Pro limpa a URL e mostra o status do pagamento:",
    t7.url === "/loja" && /Pagamento aprovado/.test(t7.status), JSON.stringify(t7));

  await browser.close();
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
