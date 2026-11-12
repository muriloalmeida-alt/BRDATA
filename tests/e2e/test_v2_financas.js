// Carreira 2.0 — Entrega 08 (Finanças, /financas). Pela UI real:
// Início → Finanças; saldo e folha × teto iguais aos da versão atual;
// últimas movimentações = extrato da versão atual (mesma ordem) com "Ver
// extrato completo"; saldo negativo em vermelho e folha acima do teto;
// Ver elenco e Ver mercado (v2, fase 8); extrato e clube (v2, fase 9);
// nada gravado; 360 px.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, jogarRodadaV2 } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";

  const email = `v2fn${Date.now()}@teste.com`;
  // Conta e carreira pelo motor da v2 (sem a tela antiga), já na rodada 1.
  await newCareer(page, email);
  // Duas rodadas pela ponte do motor da v2 (proposta por jogador: recusa).
  for (let i = 0; i < 2; i++) { const r = await jogarRodadaV2(page); if (!r.ok) throw new Error("rodada: " + r.passos.join(" ")); }
  // Extrato com mais de 5 lançamentos (formato de pushLedger da versão atual).
  await noMotor(page, (M) => { for (let i = 0; i < 4; i++) M.semana.pushLedger("estadio", `Lançamento de teste ${i + 1}`, -(i + 1) * 10000, M.CAREER.currentRound - 1); return M.persistir(); });
  // Valores pelas funções do motor (as mesmas que a tela antiga chamava).
  const legacy = await noMotor(page, ({ CAREER, clube, financas }) => ({
    cash: clube.fmtBRLShort(CAREER.finances.cash), bill: clube.fmtBRLShort(financas.wageBill(CAREER.squad)), cap: clube.fmtBRLShort(CAREER.finances.wageCap),
    ledger: CAREER.financeLedger.map((t) => t.label),
  }));

  const v2 = await ctx.newPage();
  const writes = [];
  v2.on("request", (r) => { if (r.url().includes("/api/career") && r.method() !== "GET") writes.push(r.method()); });
  const read = () => v2.evaluate(() => ({
    path: location.pathname, cash: document.querySelector(".fn-cash dd").textContent, neg: document.querySelector(".fn-cash dd").classList.contains("is-neg"),
    wage: document.querySelector(".fn-wage").textContent, over: !!document.querySelector(".fn-over"),
    tx: [...document.querySelectorAll(".fn-tx-label")].map((x) => x.textContent), more: !!document.querySelector(".fn-ledger ~ .tb-more"),
    links: [...document.querySelectorAll(".fn-links a, .fn-legacy")].map((a) => a.getAttribute("href")), text: document.body.innerText,
  }));

  // 1) Início → Finanças: saldo e folha × teto iguais aos da versão atual.
  await v2.goto(base + "/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  await v2.click('a.row[href="/financas"]');
  await v2.waitForSelector(".fn-cash", { timeout: 10000 });
  const r1 = await read();
  check("1) Início → Finanças: saldo (lima) e 'folha de teto' iguais aos da versão atual, sem gráficos:",
    r1.path === "/financas" && r1.cash === legacy.cash && !r1.neg && r1.wage === `${legacy.bill} de ${legacy.cap}` && !r1.over && !document_hasChart(r1.text), JSON.stringify({ r1: { cash: r1.cash, wage: r1.wage }, legacy: { cash: legacy.cash, bill: legacy.bill, cap: legacy.cap } }));
  function document_hasChart(t) { return /%/.test(t); }

  // 2) Últimas movimentações = 5 primeiras do extrato atual; "Ver extrato
  // completo" abre o Extrato da v2 (fase 9) com todos os lançamentos.
  const r2a = r1.tx;
  await v2.click('.fn-ledger ~ a.tb-more[href="/extrato"]');
  await v2.waitForFunction(() => (document.querySelector("h1") || {}).textContent === "Cada movimento conta.", null, { timeout: 15000 });
  const r2 = await v2.evaluate(() => [...document.querySelectorAll(".wk-item dt")].map((d) => d.textContent.split(" · ").slice(1).join(" · ")));
  const rounds = await v2.locator(".wk-sec .kicker-caps", { hasText: "Rodada" }).count();
  await v2.goBack(); await v2.waitForSelector(".fn-cash", { timeout: 10000 });
  check("2) Últimas 5 movimentações na mesma ordem do extrato atual; 'Ver extrato completo' abre o Extrato da v2 com todas, por rodada:",
    JSON.stringify(r2a) === JSON.stringify(legacy.ledger.slice(0, 5)) && r1.more && JSON.stringify(r2) === JSON.stringify(legacy.ledger) && rounds >= 1, JSON.stringify({ r2a, all: r2.length, legacy: legacy.ledger.length, rounds }));

  // 3) Saldo negativo em vermelho; folha acima do teto.
  await page.evaluate(async () => {
    const c = (await (await fetch("/api/career", { cache: "no-store" })).json()).career;
    c.finances.cash = -450000; c.finances.wageCap = 1000;
    await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
  });
  writes.length = 0;
  await v2.reload({ waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".fn-cash", { timeout: 15000 });
  const r3 = await read();
  check("3) Saldo negativo em vermelho ('-R$ 450 mil') e aviso 'Acima do teto salarial':", r3.cash === "-R$ 450 mil" && r3.neg && r3.over, JSON.stringify({ cash: r3.cash, neg: r3.neg, over: r3.over }));

  // 4) Atalhos; 360 px; nada gravado.
  await v2.setViewportSize({ width: 360, height: 780 });
  const a = await v2.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className),
  }));
  await v2.click('.fn-links a[href="/elenco"]');
  await v2.waitForSelector(".sq-row", { timeout: 10000 });
  await v2.goBack(); await v2.waitForSelector(".fn-cash", { timeout: 10000 });
  check("4) Atalhos (elenco, mercado, patrocínios, estádio, comissão e pedido de orçamento, todos na v2); 360 px sem rolagem e alvos ≥ 44 px; nada gravado:",
    JSON.stringify(r3.links) === JSON.stringify(["/elenco", "/mercado", "/patrocinios", "/estadio", "/comissao", "/diretoria/orcamento"]) && a.overflow <= 0 && a.small.length === 0 && writes.length === 0, JSON.stringify({ links: r3.links, a, writes }));

  // 5) Ver mercado abre o Mercado da v2 (fase 8); Voltar ao clube → tela Clube.
  await page.goto("about:blank");
  await v2.click('.fn-links a[href="/mercado"]');
  await v2.waitForFunction(() => (document.querySelector("h1") || {}).textContent === "Busque seu reforço.", null, { timeout: 30000 });
  const mk = { path: new URL(v2.url()).pathname };
  await v2.goto(base + "/financas", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".fn-cash", { timeout: 15000 });
  await v2.click(".cal-foot .link-back");
  await v2.waitForURL(/\/clube$/, { timeout: 10000 });
  check("5) 'Ver mercado' abre o Mercado da v2 ('Busque seu reforço.'); 'Voltar ao clube' → tela Clube (P7):",
    mk.path === "/mercado" && new URL(v2.url()).pathname === "/clube", JSON.stringify({ mk, url: v2.url() }));

  await browser.close();
})();
