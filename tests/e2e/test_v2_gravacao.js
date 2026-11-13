// Carreira 2.0 — AUD-02: falha ao gravar o resultado da partida.
// OFFLINE-001 (13/11/2026): o save principal mora no aparelho (IndexedDB),
// com cópia no servidor (decisão do Murilo). Pela UI real, servidor isolado,
// conta descartável:
//  1) Falha ao gravar no aparelho: o Resultado mostra a falha e "Tentar
//     salvar novamente" (sem "Continuar"); nada gravado (aparelho e
//     servidor); o pós-jogo fica bloqueado.
//  2) Toques repetidos com a falha: uma tentativa por toque.
//  3) Aparelho de volta, servidor fora do ar: grava no aparelho (save =
//     memória, sem efeito em dobro) e "Continuar" segue; a cópia vai ao
//     servidor na gravação seguinte, quando ele volta.
//  4) Resposta perdida da cópia (o servidor gravou, o navegador não soube):
//     o resultado já está no aparelho; reabrir manda a mesma cópia — a
//     rodada não anda duas vezes.
//  5) Sessão expirada (logout): o resultado fica no aparelho e "Continuar"
//     segue; um aviso que pode ser fechado pede para entrar de novo; OUTRA
//     conta é recusada e nada é gravado nela; com a mesma conta, a cópia vai.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, signup, serverCareer, motorNaPagina, continueToHome, sameSave, iniciarPeloPreJogo, falharArmazenamento, saveNoAparelho, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  // Conta B (só para o caso de identidade), num contexto à parte.
  const ctxB = await browser.newContext();
  const pB = await ctxB.newPage();
  const emailB = `v2grvB${Date.now()}@teste.com`;
  await signup(pB, emailB);
  await ctxB.close();

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  const emailA = `v2grvA${Date.now()}@teste.com`;
  await newCareer(page, emailA);
  const before = await serverCareer(page);
  await page.goto("about:blank");

  const v2 = await ctx.newPage();
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  // Interceptação do PUT /api/career (a cópia no servidor).
  let mode = "pass";
  let puts = 0;
  await v2.route((u) => new URL(u).pathname === "/api/career", async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    puts++;
    if (mode === "abort") return route.abort("failed");
    if (mode === "lost") { await route.fetch(); return route.abort("failed"); } // gravou no servidor; a resposta se perde
    return route.continue();
  });
  const frameCareer = async () => { await motorNaPagina(v2); return v2.evaluate(() => JSON.parse(JSON.stringify(__motor.estado.carreiraAtual()))); };
  const btn = () => v2.evaluate(() => { const b = document.querySelector(".pz-foot .cta"); return { save: b.dataset.save, text: b.textContent.trim(), aria: b.getAttribute("aria-disabled"), err: document.querySelector(".pz-foot .inline-error")?.textContent || "" }; });
  const ateOFim = async (antesDoFim) => {
    await v2.goto(base + "/", { waitUntil: "domcontentloaded" });
    await v2.waitForSelector(".home", { timeout: 15000 });
    await v2.click(".home-main .cta");
    await iniciarPeloPreJogo(v2);
    await v2.waitForSelector(".mt-skip", { timeout: 40000 });
    await antesDoFim();
    await v2.click(".mt-skip");
    await v2.waitForSelector(".rs-title", { timeout: 30000 });
  };

  // 1) Falha ao gravar no aparelho.
  await ateOFim(() => falharArmazenamento(v2, true));
  await v2.waitForSelector('.pz-foot .cta[data-save="failed"]', { timeout: 20000 });
  const b1 = await btn();
  const fail360 = await (async () => {
    await v2.setViewportSize({ width: 360, height: 780 });
    await v2.waitForTimeout(100);
    const r = await v2.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, btnH: document.querySelector(".pz-foot .cta").getBoundingClientRect().height }));
    await v2.setViewportSize({ width: 390, height: 844 });
    return r;
  })();
  check("1b) Rodapé de falha em 360 px sem rolagem horizontal e botão ≥ 44 px:", fail360.overflow <= 0 && fail360.btnH >= 44, JSON.stringify(fail360));
  const s1 = await serverCareer(v2);
  const d1 = await saveNoAparelho(v2);
  const mem1 = await frameCareer();
  const blocked = await v2.evaluate(() => __motor.ponte.iniciarPosJogo());
  check("1) Falha no aparelho: Resultado mostra a falha e 'Tentar salvar novamente' (sem 'Continuar'); nada gravado (aparelho e servidor); pós-jogo bloqueado na ponte:",
    b1.text === "Tentar salvar novamente" && /Não foi possível salvar o resultado/.test(b1.err) && s1.currentRound === before.currentRound
      && d1 && d1.save.currentRound === before.currentRound
      && mem1.currentRound === before.currentRound + 1 && blocked.ok === false && blocked.motivo === "nao-salvo",
    JSON.stringify({ b1, server: s1.currentRound, aparelho: d1 && d1.save.currentRound, mem: mem1.currentRound, blocked }));

  // 2) Toques repetidos: uma tentativa por toque.
  const t0 = await v2.evaluate(() => window.__tentativasSave);
  await v2.evaluate(() => { const b = document.querySelector(".pz-foot .cta"); b.click(); b.click(); b.click(); });
  await v2.waitForTimeout(300);
  await v2.waitForSelector('.pz-foot .cta[data-save="failed"]', { timeout: 20000 });
  const tentativas = (await v2.evaluate(() => window.__tentativasSave)) - t0;
  const mem2 = await frameCareer();
  check("2) 3 toques seguidos em 'Tentar salvar novamente': 1 só tentativa, falha mostrada de novo, save em memória intacto (sem simular de novo):",
    tentativas === 1 && sameSave(mem1, mem2), JSON.stringify({ tentativas }));

  // 3) Aparelho de volta, servidor fora do ar: grava no aparelho e segue.
  await falharArmazenamento(v2, false);
  mode = "abort";
  await v2.click(".pz-foot .cta");
  await v2.waitForSelector('.pz-foot .cta[data-save="saved"]:not([aria-disabled])', { timeout: 20000 });
  const s3 = await serverCareer(v2);
  const d3 = await saveNoAparelho(v2);
  const log = d3.save.matchLog[0];
  const score = await v2.evaluate(() => document.querySelector(".mt-goals").textContent.split(" - ").map(Number));
  check("3) Servidor fora do ar: grava no aparelho (= save em memória, 1 rodada a mais, mesmo placar, sem efeito em dobro), 'Continuar' disponível, servidor ainda sem a rodada:",
    d3.save.currentRound === before.currentRound + 1 && sameSave(d3.save, mem1) && log && score[0] === log.gh && score[1] === log.ga
      && d3.save.matchLog.length === before.matchLog.length + 1 && (await btn()).text === "Continuar" && s3.currentRound === before.currentRound && d3.hash !== d3.sincronizado,
    JSON.stringify({ round: d3.save.currentRound, servidor: s3.currentRound, score, log: log && [log.gh, log.ga] }));
  mode = "pass";
  const steps3 = await continueToHome(v2);
  const home3 = await v2.evaluate(() => ({ line: document.querySelector(".home-date")?.textContent || "", frames: document.querySelectorAll("iframe").length }));
  const s3b = await serverCareer(v2);
  const d3b = await saveNoAparelho(v2);
  check("3b) 'Continuar' segue o pós-jogo até o Início na rodada seguinte; com o servidor de volta, a cópia chega (servidor = aparelho):",
    steps3.length >= 1 && home3.line.endsWith(`RODADA ${before.currentRound + 1}`) && home3.frames === 0 && sameSave(s3b, d3b.save) && d3b.hash === d3b.sincronizado,
    JSON.stringify({ steps3, home3, servidor: s3b.currentRound, aparelho: d3b.save.currentRound }));

  // 4) Resposta perdida da cópia depois de o servidor gravar.
  const before4 = await serverCareer(v2);
  await ateOFim(async () => { mode = "lost"; });
  await v2.waitForSelector('.pz-foot .cta[data-save="saved"]:not([aria-disabled])', { timeout: 20000 });
  const s4a = await serverCareer(v2);
  const d4a = await saveNoAparelho(v2);
  mode = "pass";
  await v2.goto(base + "/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".pz-foot .cta, .home", { timeout: 20000 });
  await v2.waitForTimeout(500);
  const s4b = await serverCareer(v2);
  const d4b = await saveNoAparelho(v2);
  check("4) Resposta perdida: o resultado já está no aparelho e 'Continuar' segue; reabrir manda a mesma cópia (a rodada anda 1 vez só):",
    d4a.save.currentRound === before4.currentRound + 1 && s4a.currentRound === before4.currentRound + 1 && sameSave(s4a, d4a.save)
      && s4b.currentRound === before4.currentRound + 1 && sameSave(s4b, d4b.save) && d4b.hash === d4b.sincronizado
      && s4b.matchLog.length === before4.matchLog.length + 1,
    JSON.stringify({ before: before4.currentRound, after: [s4a.currentRound, s4b.currentRound] }));
  if (await v2.locator('.pz-foot .cta[data-save="saved"]').count()) await continueToHome(v2);

  // 5) Sessão expirada (logout de verdade antes do fim da partida).
  const before5 = await serverCareer(v2);
  await ateOFim(() => v2.evaluate(() => fetch("/api/auth/logout", { method: "POST" })));
  await v2.waitForSelector('.pz-foot .cta[data-save="saved"]', { timeout: 30000 });
  await v2.waitForSelector("#lg-t", { timeout: 15000 });
  const b5 = await btn();
  const d5 = await saveNoAparelho(v2);
  const sheet = await v2.evaluate(() => ({ focusEmail: document.activeElement?.type === "email", title: document.querySelector("#lg-t")?.textContent, lead: document.querySelector("#lg-d")?.textContent, cancel: !![...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent === "Cancelar") }));
  const sizes = {};
  for (const w of [360, 430]) {
    await v2.setViewportSize({ width: w, height: 780 });
    await v2.waitForTimeout(100);
    sizes[w] = await v2.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      small: [...document.querySelectorAll('[role="dialog"] a, [role="dialog"] button, [role="dialog"] input')].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className || el.type),
      sheetFits: document.querySelector('[role="dialog"]').getBoundingClientRect().width <= innerWidth,
    }));
  }
  await v2.setViewportSize({ width: 390, height: 844 });
  check("5) Folha de login em 360 e 430 px: sem rolagem horizontal, cabe na tela e alvos ≥ 44 px:",
    [360, 430].every((w) => sizes[w].overflow <= 0 && sizes[w].small.length === 0 && sizes[w].sheetFits), JSON.stringify(sizes));
  // Outra conta: recusada, e nada é gravado nela.
  await v2.fill('[role="dialog"] input[type="email"]', emailB);
  await v2.fill('[role="dialog"] input[type="password"]', "senha123");
  const putsB = puts;
  await v2.click('[role="dialog"] button[type="submit"]');
  await v2.waitForSelector('[role="dialog"] .inline-error', { timeout: 10000 });
  const errB = await v2.locator('[role="dialog"] .inline-error').textContent();
  const careerB = await serverCareer(v2); // sessão agora é a da conta B
  // Uma cópia pedida agora (sessão da conta B) não vai: a sessão é de outra conta.
  const copiaB = await v2.evaluate(async (conta) => { const m = await import("/js/motor/repositorio.js"); return m.criarRepositorio().copiarParaServidor(conta); }, d5.conta);
  const careerB2 = await serverCareer(v2);
  check("5a) Sessão expirada: o resultado fica no aparelho e 'Continuar' segue; o aviso (que pode ser fechado) pede para entrar de novo; com OUTRA conta, recusa e não grava nada nela:",
    b5.text === "Continuar" && d5.save.currentRound === before5.currentRound + 1 && sheet.title === "Sua sessão expirou." && /salvo neste aparelho/.test(sheet.lead) && sheet.cancel && sheet.focusEmail
      && /outra conta/.test(errB) && careerB === null && copiaB === "outra-conta" && careerB2 === null && puts === putsB,
    JSON.stringify({ b5, sheet, errB, careerB: !!careerB, copiaB, putsDelta: puts - putsB }));
  // Mesma conta: a cópia vai.
  await v2.fill('[role="dialog"] input[type="email"]', emailA);
  await v2.fill('[role="dialog"] input[type="password"]', "senha123");
  await v2.click('[role="dialog"] button[type="submit"]');
  await v2.waitForFunction(() => !document.querySelector("#lg-t"), null, { timeout: 15000 });
  await v2.waitForTimeout(500);
  const s5 = await serverCareer(v2);
  const mem5 = await frameCareer();
  check("5b) Com a mesma conta: a folha fecha e a cópia chega ao servidor (1 rodada a mais, = save em memória):",
    s5.currentRound === before5.currentRound + 1 && sameSave(s5, mem5),
    JSON.stringify({ round: [before5.currentRound, s5.currentRound] }));

  await browser.close();
})();
