// Carreira 2.0 — AUD-02: falha ao gravar o resultado da partida.
// Pela UI real, com o PUT final interceptado neste navegador (servidor
// isolado, conta descartável):
//  1) Falha de rede: o Resultado mostra a falha e "Tentar salvar novamente"
//     (sem "Continuar"); nada foi gravado; o pós-jogo fica bloqueado.
//  2) 5xx + toques repetidos: um único PUT por tentativa.
//  3) Restaurada a conexão: grava; o save do servidor é exatamente o save em
//     memória (uma rodada a mais, mesmo placar, mesmo caixa/extrato — sem
//     efeito em dobro); "Continuar" segue o pós-jogo até o Início.
//  4) Resposta perdida (o servidor gravou, o navegador não soube): repetir
//     grava o mesmo conteúdo — a rodada não anda duas vezes.
//  5) Sessão expirada de verdade (logout): "Entrar para salvar"; login com
//     OUTRA conta é recusado e não grava nada nela; com a mesma conta, grava.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, signup, serverCareer, playV2MatchToEnd, ponteFrame, continueToHome, sameSave } = require("./_v2_match");

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
  // Interceptação do PUT /api/career (vale para o quadro da ponte também).
  let mode = "pass";
  let puts = 0;
  await v2.route((u) => new URL(u).pathname === "/api/career", async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    puts++;
    if (mode === "abort") return route.abort("failed");
    if (mode === "500") return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "falha simulada" }) });
    if (mode === "lost") { await route.fetch(); return route.abort("failed"); } // gravou no servidor; a resposta se perde
    return route.continue();
  });
  const frameCareer = () => ponteFrame(v2).evaluate(() => JSON.parse(JSON.stringify(CAREER)));
  const btn = () => v2.evaluate(() => { const b = document.querySelector(".pz-foot .cta"); return { save: b.dataset.save, text: b.textContent.trim(), aria: b.getAttribute("aria-disabled"), err: document.querySelector(".pz-foot .inline-error")?.textContent || "" }; });

  // 1) Falha de rede no PUT final.
  mode = "abort";
  await playV2MatchToEnd(v2);
  await v2.waitForSelector('.pz-foot .cta[data-save="failed"]', { timeout: 20000 });
  const b1 = await btn();
  const s1 = await serverCareer(v2);
  const mem1 = await frameCareer();
  const blocked = await ponteFrame(v2).evaluate(() => BRDATA_PONTE.continuarPosJogo());
  check("1) Falha de rede: Resultado mostra a falha e 'Tentar salvar novamente' (sem 'Continuar'); nada gravado; pós-jogo bloqueado na ponte:",
    b1.text === "Tentar salvar novamente" && /Não foi possível salvar o resultado/.test(b1.err) && s1.currentRound === before.currentRound
      && mem1.currentRound === before.currentRound + 1 && blocked.ok === false && blocked.motivo === "nao-salvo",
    JSON.stringify({ b1, server: s1.currentRound, mem: mem1.currentRound, blocked }));

  // 2) 5xx e toques repetidos: uma gravação por tentativa.
  mode = "500";
  const puts0 = puts;
  await v2.evaluate(() => { const b = document.querySelector(".pz-foot .cta"); b.click(); b.click(); b.click(); });
  await v2.waitForTimeout(300);
  await v2.waitForSelector('.pz-foot .cta[data-save="failed"]', { timeout: 20000 });
  const putsRetry = puts - puts0;
  const mem2 = await frameCareer();
  check("2) 5xx com 3 toques seguidos em 'Tentar salvar novamente': 1 só PUT, falha mostrada de novo, save em memória intacto (sem simular de novo):",
    putsRetry === 1 && sameSave(mem1, mem2), JSON.stringify({ putsRetry }));

  // 3) Conexão restaurada: grava exatamente o save em memória.
  mode = "pass";
  await v2.click(".pz-foot .cta");
  await v2.waitForSelector('.pz-foot .cta[data-save="saved"]:not([aria-disabled])', { timeout: 20000 });
  const s3 = await serverCareer(v2);
  const log = s3.matchLog[0];
  const score = await v2.evaluate(() => document.querySelector(".mt-goals").textContent.split(" - ").map(Number));
  check("3) Restaurada a conexão: grava; servidor = save em memória (1 rodada a mais, mesmo placar, caixa e extrato sem duplicar):",
    s3.currentRound === before.currentRound + 1 && sameSave(s3, mem1) && log && score[0] === log.gh && score[1] === log.ga
      && s3.matchLog.length === before.matchLog.length + 1 && (await btn()).text === "Continuar",
    JSON.stringify({ round: s3.currentRound, cash: [before.finances.cash, s3.finances.cash], ledger: [(before.financeLedger || []).length, (s3.financeLedger || []).length], score, log: log && [log.gh, log.ga] }));
  const steps3 = await continueToHome(v2);
  const home3 = await v2.evaluate(() => ({ line: document.querySelector(".home-date")?.textContent || "", frames: document.querySelectorAll("iframe").length }));
  check("3b) 'Continuar' segue o pós-jogo até o Início na rodada seguinte, sem a ponte:",
    steps3.length >= 1 && home3.line.endsWith(`RODADA ${before.currentRound + 1}`) && home3.frames === 0, JSON.stringify({ steps3, home3 }));

  // 4) Resposta perdida depois de o servidor gravar.
  const before4 = await serverCareer(v2);
  mode = "lost";
  await playV2MatchToEnd(v2);
  await v2.waitForSelector('.pz-foot .cta[data-save="failed"]', { timeout: 20000 });
  const s4a = await serverCareer(v2);
  const mem4 = await frameCareer();
  mode = "pass";
  await v2.click(".pz-foot .cta");
  await v2.waitForSelector('.pz-foot .cta[data-save="saved"]:not([aria-disabled])', { timeout: 20000 });
  const s4b = await serverCareer(v2);
  check("4) Resposta perdida: o servidor já tinha gravado; repetir grava o mesmo conteúdo (a rodada anda 1 vez só, sem efeito em dobro):",
    s4a.currentRound === before4.currentRound + 1 && s4b.currentRound === before4.currentRound + 1 && sameSave(s4a, mem4) && sameSave(s4b, mem4)
      && s4b.matchLog.length === before4.matchLog.length + 1,
    JSON.stringify({ before: before4.currentRound, after: [s4a.currentRound, s4b.currentRound] }));
  await continueToHome(v2);

  // 5) Sessão expirada (logout de verdade antes do fim da partida).
  const before5 = await serverCareer(v2);
  await v2.goto("http://localhost:8787/carreira/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  await v2.click(".home-main .cta");
  await v2.waitForSelector(".pm-cta", { timeout: 10000 });
  await v2.click(".pm-cta");
  await v2.waitForSelector(".mt-skip", { timeout: 40000 });
  await v2.evaluate(() => fetch("/api/auth/logout", { method: "POST" }));
  await v2.click(".mt-skip");
  await v2.waitForSelector('.pz-foot .cta[data-save="session"]', { timeout: 30000 });
  const b5 = await btn();
  const shownLegacyLogin = await ponteFrame(v2).evaluate(() => !document.getElementById("screenLoginRequired").classList.contains("hidden"));
  await v2.click(".pz-foot .cta"); // Entrar para salvar
  await v2.waitForSelector('[role="dialog"] input[type="email"]', { timeout: 5000 });
  const sheet = await v2.evaluate(() => ({ focusEmail: document.activeElement?.type === "email", rootInert: document.getElementById("root").hasAttribute("inert"), title: document.querySelector("#lg-t")?.textContent }));
  // Outra conta: recusada, e nada é gravado nela.
  await v2.fill('[role="dialog"] input[type="email"]', emailB);
  await v2.fill('[role="dialog"] input[type="password"]', "senha123");
  const putsB = puts;
  await v2.click('[role="dialog"] button[type="submit"]');
  await v2.waitForSelector('[role="dialog"] .inline-error', { timeout: 10000 });
  const errB = await v2.locator('[role="dialog"] .inline-error').textContent();
  const careerB = await serverCareer(v2); // sessão agora é a da conta B
  const ponteB = await ponteFrame(v2).evaluate(() => BRDATA_PONTE.salvarDeNovo());
  const careerB2 = await serverCareer(v2);
  check("5a) Sessão expirada: 'Entrar para salvar' abre o login da v2 (foco no e-mail, fundo inerte); a tela de login do motor não aparece; com OUTRA conta, recusa e não grava nada nela (nem pela ponte):",
    b5.text === "Entrar para salvar" && /sessão expirou/.test(b5.err) && !shownLegacyLogin && sheet.focusEmail && sheet.rootInert
      && /outra conta/.test(errB) && careerB === null && ponteB.ok === false && ponteB.motivo === "outra-conta" && careerB2 === null && puts === putsB,
    JSON.stringify({ b5, shownLegacyLogin, sheet, errB, careerB: !!careerB, ponteB, putsDelta: puts - putsB }));
  // Mesma conta: grava.
  await v2.fill('[role="dialog"] input[type="email"]', emailA);
  await v2.fill('[role="dialog"] input[type="password"]', "senha123");
  await v2.click('[role="dialog"] button[type="submit"]');
  await v2.waitForSelector('.pz-foot .cta[data-save="saved"]:not([aria-disabled])', { timeout: 20000 });
  const s5 = await serverCareer(v2);
  const mem5 = await frameCareer();
  check("5b) Com a mesma conta: a folha fecha, o resultado é gravado (1 rodada a mais) e 'Continuar' fica disponível:",
    !(await v2.locator('[role="dialog"]').count()) && s5.currentRound === before5.currentRound + 1 && sameSave(s5, mem5),
    JSON.stringify({ round: [before5.currentRound, s5.currentRound] }));

  await browser.close();
})();
