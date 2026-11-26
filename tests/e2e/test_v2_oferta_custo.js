// MERCADO-001, etapa 4 (25/11/2026): o custo da oferta na tela de proposta
// da v2 (economia v5, carreira nova) e o orçamento em Finanças. Confere:
//   1) a carreira nova está na economia v5 e a proposta mostra "Paga agora",
//      "Custo mensal total" e "Compromisso total", com os espaços antes e
//      depois;
//   2) "Editar condições": parcelado com entrada de 30% e 12 meses -> o
//      resumo muda, "Paga agora" vira a entrada e o custo mensal soma a
//      parcela ao salário;
//   3) bloqueio: sem caixa livre, o motivo concreto aparece com o valor que
//      falta, e o botão de enviar fica desativado (a proposta não vai);
//   4) proposta parcelada enviada: o motor guarda entrada e meses na oferta;
//   5) Finanças: a seção Orçamento (espaço na folha, orçamento de
//      transferências e parcelas a pagar);
//   6) sem erro na página.
// Evidência mobile: capturas em 390×844 (deviceScaleFactor 2) da oferta e de
// Finanças em docs/economia/evidencias/.
// Uso: node run_parallel.js --isolated-server test_v2_oferta_custo
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, signup, ensureDailyClaimed, noMotor, base } = require("./_v2_carreira");

const EVID = path.resolve(__dirname, "../../docs/economia/evidencias");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  // Pré-temporada: a janela de transferências está aberta.
  await carreiraV2(page, `ofertacusto${Date.now()}@teste.com`, { clube: "fla", criarConta: signup, preTemporada: true });
  await ensureDailyClaimed(page);

  // Um alvo de valor médio de outro clube, sem proposta.
  const alvo = await noMotor(page, async ({ estado, semana }) => {
    const C = estado.carreiraAtual();
    const l = semana.allMarketPlayers().filter((e) => !e.mine && e.p.value > 0).sort((a, b) => a.p.value - b.p.value);
    const e = l[Math.floor(l.length / 2)];
    return { versao: C.economia && C.economia.versao, clubId: String(e.club.id), playerId: e.p.id, value: e.p.value };
  });
  const h1 = (t) => page.waitForFunction((t) => (document.querySelector("h1") || {}).textContent === t, t, { timeout: 20000 });
  const abrir = async () => {
    await page.goto(base + `/mercado/proposta?clube=${encodeURIComponent(alvo.clubId)}&id=${encodeURIComponent(alvo.playerId)}`, { waitUntil: "domcontentloaded" });
    await h1("Faça sua oferta.");
    await page.waitForSelector(".mk-cost", { timeout: 20000 });
  };
  const linhas = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll(".mk-cost .wk-item")].map((d) => [d.querySelector("dt").textContent, d.querySelector("dd").textContent])));

  // 1) Os três números e os espaços.
  await abrir();
  const r1 = await linhas();
  check("1) Economia v5 e a oferta com Paga agora, Custo mensal total e Compromisso total (e os espaços antes → depois):",
    alvo.versao >= 5 && r1["Paga agora"] && /\/mês/.test(r1["Custo mensal total"] || "") && r1["Compromisso total"] && r1["Espaço na folha (mês)"] && /→/.test(r1["Caixa livre para entradas"] || ""), JSON.stringify({ versao: alvo.versao, r1 }));
  await page.screenshot({ path: path.join(EVID, "oferta_a_vista.png"), fullPage: true });

  // 2) Editar condições: parcelado, 30% de entrada, 12 meses.
  await page.click(".mk-terms .pr-row");
  await page.waitForSelector("#ts-t");
  await page.locator('[aria-labelledby="ts-m"] .pr-seg-btn', { hasText: "Parcelado" }).click();
  await page.locator('[aria-labelledby="ts-e"] .pr-seg-btn', { hasText: "30%" }).click();
  await page.locator('[aria-labelledby="ts-n"] .pr-seg-btn', { hasText: "12m" }).click();
  await page.locator(".sp-sheet-cta", { hasText: "Aplicar" }).click();
  await page.waitForFunction(() => /Entrada de 30% \+ 12 meses/.test((document.querySelector(".mk-terms .row-title") || {}).textContent || ""), null, { timeout: 10000 });
  await page.waitForFunction((a) => /parcela/.test([...document.querySelectorAll(".mk-cost .wk-note")].map((n) => n.textContent).join(" ")) && (document.querySelector(".mk-cost .wk-item dd") || {}).textContent !== a, r1["Paga agora"], { timeout: 10000 });
  const r2 = await linhas();
  const notas = await page.evaluate(() => [...document.querySelectorAll(".mk-cost .wk-note")].map((n) => n.textContent));
  check("2) Parcelado (30% + 12 meses): Paga agora vira a entrada e o custo mensal soma salário e parcela:",
    r2["Paga agora"] !== r1["Paga agora"] && r2["Custo mensal total"] !== r1["Custo mensal total"] && /por 12 meses/.test(notas[0]), JSON.stringify({ r2, notas }));
  await page.screenshot({ path: path.join(EVID, "oferta_parcelada.png"), fullPage: true });

  // 3) Bloqueio: sem caixa livre (o motor recalcula a prévia ao mudar o valor).
  await noMotor(page, async ({ estado }) => { estado.carreiraAtual().finances.cash = 1000; });
  await page.fill("#pp-v", String(alvo.value + 1000));
  await page.waitForSelector(".mk-block", { timeout: 15000 });
  const bloqueio = await page.textContent(".mk-block");
  const desativado = await page.getAttribute(".pr .cal-foot .cta", "aria-disabled");
  const antes = await noMotor(page, async ({ estado }) => (estado.carreiraAtual().pendingOffersOut || []).length);
  await page.click(".pr .cal-foot .cta", { force: true }); // desativado: o toque não envia
  await page.waitForTimeout(400);
  const depois = await noMotor(page, async ({ estado }) => (estado.carreiraAtual().pendingOffersOut || []).length);
  check("3) Sem caixa: o motivo concreto com o valor que falta, e enviar fica desativado:",
    /caixa livre/i.test(bloqueio) && /R\$/.test(bloqueio) && desativado === "true" && depois === antes, JSON.stringify({ bloqueio, desativado, antes, depois }));
  await page.screenshot({ path: path.join(EVID, "oferta_bloqueada.png"), fullPage: true });

  // 4) Com caixa de novo, a proposta parcelada vai com entrada e meses.
  await noMotor(page, async ({ estado }) => { const C = estado.carreiraAtual(); C.finances.cash = 500000000; C.economia.clube.orcamentoTransferencias = 500000000; });
  await page.fill("#pp-v", String(alvo.value));
  await page.waitForFunction(() => !document.querySelector(".mk-block"), null, { timeout: 15000 });
  await page.click(".pr .cal-foot .cta");
  await h1("Proposta enviada.");
  const oferta = await noMotor(page, async ({ estado }, id) => (estado.carreiraAtual().pendingOffersOut || []).find((o) => String(o.playerId) === String(id)) || null, alvo.playerId);
  check("4) Proposta parcelada enviada com a entrada (30%) e os meses (12):",
    !!oferta && oferta.meses === 12 && Math.abs(oferta.entrada - Math.round(alvo.value * 0.3 / 1000) * 1000) <= 1000, JSON.stringify(oferta && { entrada: oferta.entrada, meses: oferta.meses, valor: oferta.offerValue }));

  // 5) Finanças: Orçamento.
  await page.goto(base + "/financas", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".fn-budget", { timeout: 20000 });
  const orc = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll(".fn-budget .bd-item")].map((d) => [d.querySelector("dt").textContent, d.querySelector("dd").textContent])));
  check("5) Finanças mostra o Orçamento (espaço na folha, transferências da temporada, parcelas a pagar):",
    /R\$/.test(orc["Espaço na folha"] || "") && /R\$/.test(orc["Orçamento de transferências"] || "") && orc["Parcelas a pagar"] != null, JSON.stringify(orc));
  await page.screenshot({ path: path.join(EVID, "financas_orcamento.png"), fullPage: true });

  check("6) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
