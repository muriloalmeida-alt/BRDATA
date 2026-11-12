// Carreira 2.0 — AUD-03: Tabela aberta pelo Resultado preserva a sessão da
// partida (a ponte guarda o pós-jogo pendente — inclusive a perna da Copa).
// Rodada 3 = ida da 1ª fase da Copa (CUP_ROUNDS_EXPANDED.fase1.ida): o
// clube (Cuiabá, fora dos cabeças de chave) tem a perna ao vivo pendente
// no pós-jogo dessa rodada.
//  1) Resultado → Ver tabela → Série B → Série C → Série A: continua na rota
//     da partida, mesma sessão do motor (sem quadro), foco fica na aba.
//  2) Tocar num clube pergunta antes de sair; "Voltar ao resultado" mantém
//     tudo.
//  3) Voltar ao Resultado (placar igual); Ver lances → voltar; o voltar do
//     sistema no Resultado pergunta antes de sair.
//  4) Continuar: pós-jogo completo COM a perna da Copa ao vivo; Início na
//     rodada 4; perna gravada, nada pendente, nenhum quadro.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, serverCareer, motorNaPagina, continueToHome, noMotor, jogarRodadaV2 } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  await newCareer(page, `v2tbp${Date.now()}@teste.com`, "cui");
  const inCup = await noMotor(page, ({ CAREER }) => (CAREER.cup.ties.fase1 || []).some((t) => String(t.home) === String(CAREER.clubId) || String(t.away) === String(CAREER.clubId)));
  // Duas rodadas pela ponte do motor da v2 (proposta por jogador: recusa).
  for (let i = 0; i < 2; i++) { const r = await jogarRodadaV2(page); if (!r.ok) throw new Error("rodada: " + r.passos.join(" ")); }
  const before = await serverCareer(page);
  check("0) Preparação: rodada 3 (ida da 1ª fase da Copa) e o clube está na 1ª fase:", before.currentRound === 3 && inCup, JSON.stringify({ round: before.currentRound, inCup }));
  await page.close();

  const v2 = await ctx.newPage();
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await v2.goto("http://localhost:8787/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  await v2.click(".home-main .cta");
  await v2.waitForSelector(".pm-cta", { timeout: 10000 });
  await v2.click(".pm-cta");
  await v2.waitForSelector(".mt-skip", { timeout: 40000 });
  await v2.click(".mt-skip");
  await v2.waitForSelector('.pz-foot .cta[data-save="saved"]:not([aria-disabled])', { timeout: 30000 });
  const score0 = await v2.locator(".mt-goals").textContent();
  // Marca a carreira na memória do motor (módulo na página, etapa G2c; antes,
  // o quadro da ponte): se a sessão for reaberta, a carreira é recarregada e
  // a marca some. A marca não é enumerável, então não vai para o save.
  await motorNaPagina(v2);
  await v2.evaluate(() => { Object.defineProperty(__motor.estado.carreiraAtual(), "__marca", { value: "original", configurable: true }); });
  const pending = await v2.evaluate(() => { const CAREER = __motor.estado.carreiraAtual(); return { cupLeg: !!(CAREER.cup && CAREER.cup.pendingLiveLeg), resumo: true }; });
  const ponteState = async () => v2.evaluate(() => ({ path: location.pathname, search: location.search, frames: document.querySelectorAll("iframe").length, marca: (__motor.estado.carreiraAtual() || {}).__marca || null }));

  // 1) Trocar de divisão dentro da partida.
  await v2.click(".rs-links a[href$='tela=tabela']");
  await v2.waitForSelector(".tb-table", { timeout: 10000 });
  const tabs = await v2.locator(".tb-switch [role=tab]").allTextContents();
  const seen = [];
  for (const label of ["Série B", "Série C", "Série A"]) {
    await v2.locator(".tb-switch [role=tab]", { hasText: label }).click();
    await v2.waitForFunction((l) => document.querySelector(".tb-switch [aria-selected=true]")?.textContent === l, label, { timeout: 5000 });
    seen.push({ label, comp: await v2.locator(".tb-comp").textContent(), focusTab: await v2.evaluate(() => document.activeElement?.getAttribute("role") === "tab" && document.activeElement.textContent), ...(await ponteState()) });
  }
  check("1) Série B → Série C → Série A pela Tabela do Resultado: fica em /partida?tela=tabela, mesma sessão do motor, tabela da divisão certa e foco na aba:",
    tabs.length === 3 && pending.cupLeg && seen.every((s) => s.path === "/partida" && s.search.startsWith("?tela=tabela") && s.frames === 0 && s.marca === "original" && s.focusTab === s.label && s.comp.includes(s.label.replace("Série A", "Série A")))
      && seen[0].search.includes("divisao=") && !seen[2].search.includes("divisao="),
    JSON.stringify({ tabs, pending, seen }));

  // 2) Tocar num clube: pergunta antes de sair.
  await v2.locator(".tb-row:not(.is-me)").first().click();
  await v2.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
  const ask = await v2.evaluate(() => ({ title: document.querySelector("#lv-t").textContent, text: document.querySelector("#lv-d").textContent, leave: document.querySelector('[role="alertdialog"] .text-btn').textContent, focus: document.activeElement?.textContent }));
  await v2.click('[role="alertdialog"] .cta'); // Voltar ao resultado (fica)
  await v2.waitForTimeout(200);
  const after2 = await ponteState();
  check("2) Tocar num clube na Tabela do Resultado pergunta antes de sair (foco em ficar); ficar mantém a Tabela e a mesma sessão:",
    ask.title === "Sair do resultado?" && /Copa/.test(ask.text) && /elenco do/.test(ask.leave) && /Voltar ao resultado/.test(ask.focus)
      && !(await v2.locator('[role="alertdialog"]').count()) && after2.path === "/partida" && after2.frames === 0 && after2.marca === "original",
    JSON.stringify({ ask, after2 }));

  // 3) Voltar ao Resultado, Ver lances, voltar do sistema no Resultado.
  await v2.click(".tb-foot .link-back");
  await v2.waitForSelector(".rs-title", { timeout: 10000 });
  const score3 = await v2.locator(".mt-goals").textContent();
  await v2.click(".rs-links a[href$='tela=lances']");
  await v2.waitForSelector(".ev-list", { timeout: 10000 });
  await v2.click(".pz-foot .link-back");
  await v2.waitForSelector(".rs-title", { timeout: 10000 });
  await v2.goBack();
  await v2.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
  const ask3 = await v2.locator("#lv-t").textContent();
  await v2.keyboard.press("Escape");
  await v2.waitForTimeout(200);
  const after3 = await ponteState();
  check("3) Voltar ao resultado com o mesmo placar; Ver lances volta; o voltar do sistema no Resultado pergunta e Escape fica:",
    score3 === score0 && ask3 === "Sair do resultado?" && !(await v2.locator('[role="alertdialog"]').count()) && (await v2.locator(".rs-title").count()) === 1
      && after3.path === "/partida" && after3.search === "" && after3.frames === 0 && after3.marca === "original",
    JSON.stringify({ score0, score3, ask3, after3 }));

  // 4) Continuar: pós-jogo completo, com a perna da Copa ao vivo.
  const steps = await continueToHome(v2);
  const saved = await serverCareer(v2);
  const home = await v2.evaluate(() => ({ line: document.querySelector(".home-date")?.textContent || "", frames: document.querySelectorAll("iframe").length, shown: [...document.querySelectorAll("iframe")].filter((f) => f.getBoundingClientRect().width > 1 || f.getAttribute("aria-hidden") !== "true").length }));
  const tie = (saved.cup.ties.fase1 || []).find((t) => String(t.home) === String(saved.clubId) || String(t.away) === String(saved.clubId));
  check("4) Continuar: pós-jogo completo com a perna da Copa ao vivo; Início na rodada 4; ida gravada, nada pendente, sem quadro:",
    steps.includes("copa") && home.line.endsWith("RODADA 4") && home.frames === 0 && home.shown === 0 && saved.currentRound === 4 && !saved.cup.pendingLiveLeg && tie && tie.leg1.gh != null,
    JSON.stringify({ steps, home, round: saved.currentRound, pending: saved.cup.pendingLiveLeg, leg1: tie && tie.leg1 }));

  await browser.close();
})();
