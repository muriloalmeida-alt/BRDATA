// Carreira 2.0 — Entrega A4 (Resultado, pós-jogo e ligação do Pré-jogo).
// Pela UI real: Pré-jogo → Iniciar partida abre a Partida da v2; o voltar do
// sistema no meio do jogo pergunta (Continuar jogando / Sair e simular o
// resto = "Pular para o fim"); Resultado com título pelo placar e gols; Ver
// lances e Ver tabela voltam ao Resultado; Continuar mostra a sequência
// pós-jogo da versão atual na própria sessão e, ao terminar, volta ao Início
// já na rodada seguinte; 360 px.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { passCareerSetup, enterGame } = require("./_startup");
const { skipPreseason } = require("./_calendar_skip");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";

  const email = `v2rs${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Murilo Almeida", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });
  await page.goto(base + "/carreira-old", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForSelector(".m3-club-row", { timeout: 20000 });
  await page.click('.m3-club-row[data-id="fla"]');
  await page.click("#btnConfirmClub");
  await passCareerSetup(page);
  await enterGame(page);
  await skipPreseason(page);
  await page.evaluate(() => persistCareer());
  const before = await page.evaluate(() => ({ round: CAREER.currentRound, me: CAREER.clubName }));
  await page.goto("about:blank");

  const v2 = await ctx.newPage();
  // 1) Pré-jogo → Iniciar partida (v2); voltar no meio do jogo pergunta.
  await v2.goto(base + "/carreira/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  await v2.click(".home-main .cta"); // Preparar partida
  await v2.waitForSelector(".pm-cta", { timeout: 10000 });
  await v2.click(".pm-cta"); // Iniciar partida
  await v2.waitForSelector(".mt-score", { timeout: 40000 });
  await v2.waitForFunction(() => /^(15|30)/.test(document.querySelector(".mt-min")?.textContent || ""), null, { timeout: 20000 });
  await v2.goBack();
  await v2.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
  const ask = await v2.evaluate(() => ({ path: location.pathname, title: document.querySelector("#lv-t").textContent }));
  await v2.click('[role="alertdialog"] .text-btn'); // Continuar jogando
  const m1 = await v2.locator(".mt-min").textContent();
  await v2.waitForFunction((m) => document.querySelector(".mt-min")?.textContent !== m, m1, { timeout: 15000 });
  check("1) Pré-jogo abre a Partida da v2; o voltar do sistema no meio do jogo pergunta 'Sair da partida?' e 'Continuar jogando' segue o jogo:",
    ask.path === "/carreira/partida" && ask.title === "Sair da partida?" && !(await v2.locator('[role="alertdialog"]').count()), JSON.stringify({ ask, m1 }));

  // 2) Voltar de novo → 'Sair e simular o resto' → Resultado gravado.
  await v2.goBack();
  await v2.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
  await v2.click('[role="alertdialog"] .cta');
  await v2.waitForSelector(".rs-title", { timeout: 30000 });
  await v2.waitForSelector('.pz-foot .cta[data-save="saved"]:not([aria-disabled])', { timeout: 20000 });
  const r = await v2.evaluate(() => ({ title: document.querySelector(".rs-title").textContent, line: document.querySelector(".rs-line").textContent, score: document.querySelector(".mt-goals").textContent.split(" - ").map(Number),
    goals: document.querySelectorAll(".rs-goal").length, tag: document.querySelector(".rs-tag").textContent, home: document.querySelector(".mt-team b").textContent }));
  const saved = await v2.evaluate(async () => (await (await fetch("/api/career", { cache: "no-store" })).json()).career);
  const log = saved.matchLog[0];
  const my = log.home ? log.gh : log.ga, their = log.home ? log.ga : log.gh;
  const expTitle = my > their ? `Vitória do ${before.me}.` : my < their ? `Derrota do ${before.me}.` : "Empate.";
  check("2) 'Sair e simular o resto' = Pular para o fim: Resultado com título pelo placar gravado, gols listados e 'Encerrado'; rodada gravada:",
    saved.currentRound === before.round + 1 && r.title === expTitle && r.score[0] === log.gh && r.score[1] === log.ga && r.goals === log.gh + log.ga && /Encerrado/i.test(r.tag), JSON.stringify({ r, log }));

  // 3) Ver lances e Ver tabela voltam ao Resultado (sem sair da partida).
  await v2.click(".rs-links a[href$='tela=lances']");
  await v2.waitForSelector(".ev-list", { timeout: 10000 });
  const evBtn = await v2.locator(".pz-foot .cta").textContent();
  await v2.click(".pz-foot .cta"); await v2.waitForSelector(".rs-title", { timeout: 10000 });
  await v2.click(".rs-links a[href$='tela=tabela']");
  await v2.waitForSelector(".tb-table", { timeout: 10000 });
  const tb = await v2.evaluate(() => ({ cta: document.querySelector(".tb-foot .cta").textContent, me: document.querySelector(".tb-row.is-me .tb-num").textContent, round: document.querySelector(".tb-round").textContent }));
  await v2.click(".tb-foot .cta"); await v2.waitForSelector(".rs-title", { timeout: 10000 });
  check("3) Ver lances ('Voltar ao resultado') e Ver tabela (já com a rodada jogada, 'Voltar ao resultado') voltam ao Resultado:",
    /Voltar ao resultado/.test(evBtn) && /Voltar ao resultado/.test(tb.cta) && tb.round === `Rodada ${before.round}`, JSON.stringify({ evBtn, tb }));

  // 4) 360 px no Resultado.
  await v2.setViewportSize({ width: 360, height: 780 });
  const a = await v2.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className),
  }));
  check("4) Resultado em 360 px sem rolagem horizontal e alvos ≥ 44 px:", a.overflow <= 0 && a.small.length === 0, JSON.stringify(a));
  await v2.setViewportSize({ width: 390, height: 844 });

  // 5) Continuar: sequência pós-jogo da versão atual na mesma sessão → Início.
  await v2.click(".pz-foot .cta");
  await v2.waitForTimeout(1200);
  const frameBox = await v2.evaluate(() => { const f = document.querySelector('iframe[src*="ponte=partida"]'); const r = f && f.getBoundingClientRect(); return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null; });
  const frame = v2.frames().find((f) => f.url().includes("ponte=partida"));
  const firstModal = frame ? await frame.evaluate(() => [...document.querySelectorAll(".ct-modal-overlay.open")].map((o) => o.id)) : [];
  let steps = 0;
  for (let k = 0; k < 40; k++) {
    if (await v2.locator(".home").count()) break;
    const clicked = await frame.evaluate(() => {
      const vis = (id) => { const el = document.getElementById(id); return el && el.offsetParent !== null; };
      const press = document.querySelector("#pressOverlay.open [data-press]"); if (press) { press.click(); return "press"; }
      for (const id of ["btnMatchDetailContinue", "btnNewsContinue", "btnRoundResultsContinue", "btnPlayerOfferDecline", "tabelaModalClose", "btnLiveSkip"]) if (vis(id)) { document.getElementById(id).click(); return id; }
      return null;
    }).catch(() => null);
    if (clicked) steps++;
    await v2.waitForTimeout(500);
  }
  await v2.waitForSelector(".home", { timeout: 20000 });
  const home = await v2.evaluate(() => ({ path: location.pathname, line: document.querySelector(".home-date")?.textContent || "", frames: document.querySelectorAll("iframe").length }));
  check("5) Continuar mostra a sessão da versão atual em tela cheia com a sequência de sempre (notícias, rodada, tabela…) e, ao terminar, volta ao Início na rodada seguinte, sem a ponte:",
    frameBox && frameBox.w === 390 && frameBox.h === 844 && firstModal.length >= 1 && steps >= 1 && home.path === "/carreira/" && home.line.endsWith(`RODADA ${before.round + 1}`) && home.frames === 0,
    JSON.stringify({ frameBox, firstModal, steps, home }));

  await browser.close();
})();
