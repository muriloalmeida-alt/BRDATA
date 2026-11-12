// Testa o fornecedor "frozen" (catálogo real congelado) de ponta a ponta
// na carreira: servidor precisa estar rodando com DATA_PROVIDER=frozen +
// ENABLED_COMPETITIONS=serie_b,serie_c.
// Lote L2 do plano "testes sem a tela antiga": a escolha de competição e
// de clube e a criação passam pelo motor da v2 (os mesmos comandos das
// telas de criação da v2); antes, pela tela antiga.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { contaNova, noMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await contaNova(page, `frozen${Date.now()}@teste.com`);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });

  // 1) health confirma hasKey:true com provider frozen.
  const health = await page.evaluate(() => fetch("/api/health").then((r) => r.json()));
  check("1) /api/health reporta hasKey:true, provider frozen:", health.hasKey === true && health.provider === "frozen", JSON.stringify(health));

  // 2) Escolher Brasileirão: a lista de clubes vem em modo AO VIVO (dado
  // real congelado) e tem o Corinthians.
  const escolha = await noMotor(page, async ({ ponte, estado }) => {
    const c = await ponte.escolherCompeticao("brasileirao");
    return { ok: c.ok, nomes: (c.clubes || []).map((x) => x.nome), ids: (c.clubes || []).map((x) => x.id), modoReal: estado.modoReal() };
  }, null, { comCarreira: false });
  check("2) Escolha do Clube em modo AO VIVO (dado real congelado), lista tem Corinthians:", escolha.ok && escolha.modoReal === true && escolha.nomes.some((n) => n.includes("Corinthians")), escolha.modoReal);

  // 3) Criar carreira no Corinthians (id 303, real, tem Yuri Alberto/
  // Gabriel Paulista no elenco real) e confirmar elenco real.
  const criada = await noMotor(page, ({ ponte }) => ponte.criarCarreira("303"), null, { comCarreira: false });
  const squadNames = await noMotor(page, ({ CAREER }) => CAREER.squad.map((p) => p.name));
  const hasRealPlayer = squadNames.some((n) => n.includes("Yuri Alberto") || n.includes("Gabriel Paulista") || n.includes("Garro"));
  check("3) Elenco do Corinthians tem jogador real de verdade (Yuri Alberto/Gabriel Paulista/Garro):", criada.ok && hasRealPlayer, JSON.stringify(squadNames.slice(0, 8)));

  // 4) competitionId gravado na carreira (no servidor).
  const compId = await page.evaluate(async () => (await (await fetch("/api/career", { cache: "no-store" })).json()).career.competitionId);
  check("4) competitionId gravado na carreira:", compId === "brasileirao", compId);
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
