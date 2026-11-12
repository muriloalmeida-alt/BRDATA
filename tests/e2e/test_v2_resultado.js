// Carreira 2.0 — Entrega A4 (Resultado, pós-jogo e ligação do Pré-jogo).
// Pela UI real: Pré-jogo → Iniciar partida abre a Partida da v2; o voltar do
// sistema no meio do jogo pergunta (Continuar jogando / Sair e simular o
// resto = "Pular para o fim"); Resultado com título pelo placar e gols; Ver
// lances e Ver tabela voltam ao Resultado; Continuar segue o pós-jogo nas
// telas da v2 (fase 4) e, ao terminar, volta ao Início já na rodada
// seguinte; 360 px.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";

  const email = `v2rs${Date.now()}@teste.com`;
  // Conta e carreira pelo motor da v2 (sem a tela antiga), já na rodada 1.
  await newCareer(page, email);
  const before = await noMotor(page, ({ CAREER }) => ({ round: CAREER.currentRound, me: CAREER.clubName }));
  await page.goto("about:blank");

  const v2 = await ctx.newPage();
  // 1) Pré-jogo → Iniciar partida (v2); voltar no meio do jogo pergunta.
  await v2.goto(base + "/", { waitUntil: "domcontentloaded" });
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
    ask.path === "/partida" && ask.title === "Sair da partida?" && !(await v2.locator('[role="alertdialog"]').count()), JSON.stringify({ ask, m1 }));

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
  const evBtn = await v2.locator(".pz-foot .link-back").textContent();
  await v2.click(".pz-foot .link-back"); await v2.waitForSelector(".rs-title", { timeout: 10000 });
  await v2.click(".rs-links a[href$='tela=tabela']");
  await v2.waitForSelector(".tb-table", { timeout: 10000 });
  const tb = await v2.evaluate(() => ({ cta: document.querySelector(".tb-foot .link-back").textContent, me: document.querySelector(".tb-row.is-me .tb-num").textContent, round: document.querySelector(".tb-round").textContent }));
  await v2.click(".tb-foot .link-back"); await v2.waitForSelector(".rs-title", { timeout: 10000 });
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

  // 5) Continuar: pós-jogo da v2 (fase 4), etapa por etapa, com o motor
  // sempre escondido, até o Início na rodada seguinte.
  const seen = [];
  const hidden = () => v2.evaluate(() => [...document.querySelectorAll("iframe")].every((f) => f.getBoundingClientRect().width <= 1 && f.getAttribute("aria-hidden") === "true"));
  let allHidden = true;
  await v2.click(".pz-foot .cta");
  for (let k = 0; k < 80; k++) {
    if (await v2.locator(".home").count()) break;
    const st = await v2.evaluate(() => ({ path: location.pathname, h1: (document.querySelector("h1") || {}).textContent || "", answer: !!document.querySelector(".pj-answer"), effect: !!document.querySelector(".pj-effect"), live: !!document.querySelector(".mt-skip"), ready: !!document.querySelector('.pz-foot .cta[data-save="saved"]:not([aria-disabled])') }));
    allHidden = allHidden && await hidden();
    if (st.live) { await v2.click(".mt-skip"); seen.push("copa"); }
    else if (st.ready) await v2.click(".pz-foot .cta");
    else if (st.answer) { if (!st.effect) { seen.push("coletiva"); await v2.click(".pj-answer"); } else await v2.click(".pj .cal-foot .cta"); }
    else if (st.path === "/pos-jogo" && st.h1) { if (seen[seen.length - 1] !== st.h1) seen.push(st.h1); await v2.click(st.h1 === "Uma oferta chegou." ? ".pj .cal-foot .link-back" : ".pj .cal-foot .cta"); }
    await v2.waitForTimeout(400);
  }
  await v2.waitForSelector(".home", { timeout: 20000 });
  const home = await v2.evaluate(() => ({ path: location.pathname, line: document.querySelector(".home-date")?.textContent || "", frames: document.querySelectorAll("iframe").length, shown: [...document.querySelectorAll("iframe")].filter((f) => f.getBoundingClientRect().width > 1 || f.getAttribute("aria-hidden") !== "true").length }));
  check("5) Continuar: pós-jogo nas telas da v2 (notícias da rodada e resultados, mais coletiva/Copa/proposta quando houver), motor sempre escondido; termina no Início na rodada seguinte:",
    allHidden && seen.includes("Nos bastidores.") && seen.includes("A disputa continua.") && seen.indexOf("Nos bastidores.") < seen.indexOf("A disputa continua.") && home.path === "/" && home.line.endsWith(`RODADA ${before.round + 1}`) && home.frames <= 1 && home.shown === 0,
    JSON.stringify({ seen, home, allHidden }));

  await browser.close();
})();
