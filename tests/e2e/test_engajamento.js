// Retenção/engajamento (BRDataRetencaoEspecificacao), na carreira oficial
// (v2): recompensa diária com sequência, conquistas permanentes e ranking.
// L6a (sem a tela antiga): mesmas checagens do teste anterior, pela v2.
// Os objetivos diários/semanais/da temporada (itens 3 a 5 do teste
// anterior) não têm tela na v2: ver ENTREGA_TESTES_L6.md (lacuna em aberto).
//  1) Recompensa diária abre sozinha na carreira nova: 7 dias, hoje é o dia 1.
//  2) "Receber" aplica o prêmio do dia 1 (R$ 500 no caixa); receber de novo
//     no mesmo dia é recusado ("ja-recebida") e a tela mostra "Já recebida".
//  6) Conquistas: as 7 do catálogo, 0 desbloqueadas; o filtro "Títulos"
//     mostra só as 2 de título.
//  7) Detalhe de conquista bloqueada: progresso e sem "Compartilhar".
//  8) Promover 5 da base (ação do Elenco da v2) desbloqueia "Joia da Base";
//     o detalhe mostra a data e o botão de compartilhar.
//  9) Ranking: seu código de amigo e a sua linha (você) na lista geral.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { base, contaNova, noMotor, saveNoServidor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await contaNova(page, `engaj${Date.now()}@teste.com`);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  // Carreira nova sem receber a recompensa (tutorial e assistente vistos).
  const criada = await noMotor(page, async (M) => {
    const c = await M.ponte.escolherCompeticao("brasileirao");
    if (!c.ok) return c;
    const r = await M.ponte.criarCarreira(c.clubes[0].id);
    if (!r.ok) return r;
    await fetch("/api/account/onboarding-seen", { method: "POST" });
    return M.ponte.assistenteVisto();
  }, null, { comCarreira: false });
  if (!criada || criada.ok === false) throw new Error("criar carreira: " + JSON.stringify(criada));

  // 1) Recompensa diária abre sozinha.
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/recompensa$/, { timeout: 30000 });
  await page.waitForSelector(".rw-days", { timeout: 20000 });
  const t1 = await page.evaluate(() => ({ dias: document.querySelectorAll(".rw-day").length, hoje: [...document.querySelectorAll(".rw-day")].findIndex((d) => d.classList.contains("is-today")) + 1, rotulo: document.querySelector(".rw-days").getAttribute("aria-label") }));
  check("1) A recompensa diária abre sozinha na carreira nova: 7 dias, hoje é o dia 1:", t1.dias === 7 && t1.hoje === 1 && t1.rotulo === "Sequência: dia 1 de 7", JSON.stringify(t1));

  // 2) Receber aplica R$ 500; de novo no mesmo dia é recusado.
  const caixaAntes = (await saveNoServidor(page)).finances.cash;
  await page.locator("button.cta", { hasText: "Receber" }).click();
  await page.waitForFunction(() => ![...document.querySelectorAll("button.cta")].some((b) => /Receb/.test(b.textContent)), null, { timeout: 20000 });
  let caixaDepois = caixaAntes;
  for (let i = 0; i < 20 && caixaDepois === caixaAntes; i++) { caixaDepois = (await saveNoServidor(page)).finances.cash; if (caixaDepois === caixaAntes) await page.waitForTimeout(300); }
  const deNovo = await noMotor(page, (M) => M.ponte.receberRecompensa());
  await page.goto(base + "/recompensa", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".rw-state", { timeout: 20000 });
  await page.waitForFunction(() => /Já recebida/.test(document.querySelector(".rw-state").textContent), null, { timeout: 15000 }).catch(() => {});
  const estado = await page.evaluate(() => ({ texto: document.querySelector(".rw-state").textContent, botao: [...document.querySelectorAll("button.cta")].some((b) => /Receber/.test(b.textContent)) }));
  check("2) 'Receber' aplica o prêmio do dia 1 (R$ 500 no caixa); de novo no mesmo dia é recusado:",
    caixaDepois - caixaAntes === 500 && deNovo && deNovo.motivo === "ja-recebida" && /Já recebida hoje/.test(estado.texto) && !estado.botao,
    JSON.stringify({ caixaAntes, caixaDepois, deNovo, ...estado }));

  // 6) Conquistas.
  const abrirConquistas = async () => {
    await page.goto(base + "/conquistas", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".mo-badge", { timeout: 30000 });
  };
  await abrirConquistas();
  const t6 = await page.evaluate(() => ({ total: document.querySelectorAll(".mo-badge").length, abertas: document.querySelectorAll(".mo-badge:not(.is-locked)").length, sub: document.querySelector(".screen-sub").textContent }));
  await page.locator('.cl-filters [role="radio"]', { hasText: "Títulos" }).click();
  const titulos = await page.evaluate(() => [...document.querySelectorAll(".mo-badge b")].map((b) => b.textContent));
  check("6) Conquistas: as 7 do catálogo, 0 desbloqueadas no início:", t6.total === 7 && t6.abertas === 0 && t6.sub === "0 de 7 conquistas desbloqueadas.", JSON.stringify(t6));
  check("6b) O filtro 'Títulos' mostra só as 2 de título (Campeão Brasileiro e Copa):", titulos.length === 2, JSON.stringify(titulos));

  // 7) Detalhe bloqueado.
  await page.locator('.cl-filters [role="radio"]', { hasText: "Todas" }).click();
  await page.locator(".mo-badge", { hasText: "Ídolo" }).click();
  await page.waitForSelector("#ac-t");
  const t7 = await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); return { titulo: d.querySelector("#ac-t").textContent, texto: d.innerText, compartilhar: !!d.querySelector(".sp-sheet-cta") }; });
  check("7) Detalhe da conquista bloqueada: progresso e sem botão de compartilhar:", /Ídolo/.test(t7.titulo) && /Progresso/.test(t7.texto) && !t7.compartilhar, JSON.stringify(t7));
  await page.click('[role="dialog"] .text-btn');

  // 8) Promover 5 da base pela ação do Elenco da v2 (comando acaoJogador).
  const promo = await noMotor(page, async (M) => {
    const base5 = M.CAREER.squad.filter((p) => p.origin === "base").slice(0, 5).map((p) => p.id);
    M.CAREER.finances.wageCap = Math.max(M.CAREER.finances.wageCap, 1e9); // só para o teto não barrar a promoção
    for (const id of base5) await M.ponte.acaoJogador(id, "promote");
    const e = (M.CAREER.achievements || []).find((a) => a.achievementId === "ach_joia_base");
    return { n: base5.length, e, salvo: await M.persistir() };
  });
  await abrirConquistas();
  const t8 = await page.evaluate(() => ({ abertas: [...document.querySelectorAll(".mo-badge:not(.is-locked) b")].map((b) => b.textContent) }));
  await page.locator(".mo-badge", { hasText: "Joia da Base" }).click();
  await page.waitForSelector("#ac-t");
  const t8b = await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); return { texto: d.innerText, compartilhar: (d.querySelector(".sp-sheet-cta") || {}).textContent || null }; });
  check("8) Promover 5 da base desbloqueia 'Joia da Base':", promo.n === 5 && promo.e && promo.e.currentProgress === 5 && !!promo.e.unlockedAt && t8.abertas.includes("Joia da Base"), JSON.stringify({ promo, t8 }));
  check("8b) O detalhe mostra a data de desbloqueio e o botão de compartilhar:", /Desbloqueada em/.test(t8b.texto) && /Compartilhar/.test(t8b.compartilhar || ""), JSON.stringify(t8b));
  await page.click('[role="dialog"] .text-btn');

  // 9) Ranking.
  const code = await page.evaluate(async () => (await (await fetch("/api/friends")).json()).friendCode);
  await page.goto(base + "/ranking", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mo-rank, .wk-note", { timeout: 30000 });
  await page.waitForSelector(".mo-rank.is-me", { timeout: 15000 }).catch(() => {});
  const t9 = await page.evaluate((code) => ({ eu: document.querySelectorAll(".mo-rank.is-me").length, nome: ((document.querySelector(".mo-rank.is-me b") || {}).textContent || ""), codigo: document.body.innerText.includes(code) }), code);
  check("9) Ranking: seu código de amigo e a sua linha (você) na lista geral:", !!code && t9.codigo && t9.eu === 1 && /\(você\)/.test(t9.nome), JSON.stringify({ code, ...t9 }));

  await browser.close();
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
