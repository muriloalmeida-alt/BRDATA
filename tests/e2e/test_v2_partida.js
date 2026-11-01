// Carreira 2.0 — Entrega A1 (ponte + Partida, /carreira-v2/partida). Pela UI
// real: Pré-jogo abre a Partida da v2 (ligado na A4); sem partida em
// andamento; ?iniciar=1 começa a partida pelo motor da versão atual (ponte
// invisível), placar/minuto/lances; Pausar/Retomar; intervalo; velocidade;
// Pular para o fim; rodada gravada como sempre (rodada avança, matchLog e
// tabela com o placar mostrado); modo ponte em silêncio e sem marcar
// onboarding; versão atual normal sem a ponte; 360 px.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { passCareerSetup, enterGame, waitForBoot } = require("./_startup");
const { skipPreseason } = require("./_calendar_skip");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";

  const email = `v2mt${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Murilo Almeida", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });
  await page.goto(base + "/carreira", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForSelector(".m3-club-row", { timeout: 20000 });
  await page.click('.m3-club-row[data-id="fla"]');
  await page.click("#btnConfirmClub");
  await passCareerSetup(page);
  await enterGame(page);
  await skipPreseason(page);
  await page.evaluate(() => persistCareer());
  const noPonte = await page.evaluate(() => typeof window.BRDATA_PONTE === "undefined" && !V2_PONTE);
  const before = await page.evaluate(() => ({ round: CAREER.currentRound, log: (CAREER.matchLog || []).length, me: String(CAREER.clubId) }));
  const meBefore = await page.evaluate(async () => (await (await fetch("/api/auth/me")).json()).user);
  await page.goto("about:blank");

  // 1) Pré-jogo ainda abre a versão atual; /partida sem início não começa nada.
  const v2 = await ctx.newPage();
  await v2.goto(base + "/carreira-v2/pre-jogo", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".pm-cta", { timeout: 15000 });
  const preHref = await v2.locator(".pm-cta").getAttribute("href");
  await v2.goto(base + "/carreira-v2/partida", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".state", { timeout: 40000 });
  await v2.waitForFunction(() => /Nenhuma partida/.test(document.querySelector(".state")?.textContent || ""), null, { timeout: 40000 }).catch(() => {});
  const none = await v2.locator(".state").textContent();
  check("1) Pré-jogo abre a Partida da v2 (?iniciar=1, ligado na A4); /partida sem início não começa partida; versão atual normal sem a ponte:",
    preHref === "/carreira-v2/partida?iniciar=1" && /Nenhuma partida em andamento/.test(none) && noPonte, JSON.stringify({ preHref, none, noPonte }));

  // 2) ?iniciar=1 começa a partida pela ponte; endereço limpo; placar e lances.
  await v2.goto(base + "/carreira-v2/partida?iniciar=1", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".mt-score", { timeout: 40000 });
  const url2 = new URL(v2.url());
  await v2.waitForFunction(() => /^(15|30)/.test(document.querySelector(".mt-min")?.textContent || ""), null, { timeout: 20000 });
  const r2 = await v2.evaluate(() => ({ kicker: document.querySelector(".mt-kicker").textContent, items: document.querySelectorAll(".mt-tl-item").length, start: [...document.querySelectorAll(".mt-tl-item")].pop().textContent }));
  check("2) Partida começa pela ponte: endereço sem ?iniciar, cabeçalho da rodada, minuto avança e lances terminam em 'Início da partida':",
    url2.pathname === "/carreira-v2/partida" && url2.search === "" && r2.kicker === `Brasileirão Série A · Rodada ${before.round}` && r2.items >= 1 && /Início da partida/.test(r2.start), JSON.stringify({ search: url2.search, r2 }));

  // 3) Pausar segura o minuto (abre a Pausa — A2); voltar mostra 'Retomar'; velocidade 2×.
  await v2.click(".mt-actions .mt-primary");
  await v2.waitForSelector(".pz-title", { timeout: 5000 });
  const m1 = await v2.locator(".pz-min").textContent();
  await v2.waitForTimeout(2500);
  const m2 = await v2.locator(".pz-min").textContent();
  await v2.goBack();
  await v2.waitForFunction(() => document.querySelector(".mt-actions .mt-primary")?.textContent.includes("Retomar"), null, { timeout: 5000 });
  await v2.click(".mt-speed-btn:has-text('2×')");
  const sp = await v2.locator(".mt-speed-btn.is-on").textContent();
  await v2.click(".mt-actions .mt-primary");
  check("3) Pausar segura o minuto; de volta à partida o botão é 'Retomar'; velocidade 2× marcada; Retomar continua:", m1 === m2 && sp === "2×", JSON.stringify({ m1, m2, sp }));

  // 4) Intervalo para sozinho no 45' (Pausa abre sozinha) até 'Começar 2º tempo'.
  await v2.waitForFunction(() => document.querySelector(".pz-title")?.textContent === "Intervalo", null, { timeout: 30000 });
  await v2.waitForTimeout(2000);
  const ht = await v2.evaluate(() => ({ period: document.querySelector(".pz-min").textContent, btn: document.querySelector(".pz-foot .mt-primary").textContent }));
  await v2.click(".pz-foot .mt-primary");
  await v2.waitForFunction(() => document.querySelector(".mt-period")?.textContent === "2º tempo", null, { timeout: 20000 });
  check("4) Intervalo segura a partida até 'Começar 2º tempo'; depois segue no 2º tempo:", ht.period === "Intervalo" && /Começar 2º tempo/.test(ht.btn), JSON.stringify(ht));

  // 5) Pular para o fim → Encerrado; rodada gravada como sempre.
  await v2.click(".mt-skip");
  await v2.waitForSelector(".rs-title", { timeout: 30000 }); // Resultado (A4)
  await v2.waitForTimeout(1500);
  const shown = await v2.evaluate(() => document.querySelector(".mt-goals").textContent.split(" - ").map(Number));
  const after = await v2.evaluate(async () => (await (await fetch("/api/career", { cache: "no-store" })).json()).career);
  const last = after.matchLog[0];
  const myRow = after.standings[before.me];
  check("5) Pular para o fim → Resultado; rodada gravada pelo motor de sempre (rodada +1, matchLog e tabela com o placar mostrado):",
    after.currentRound === before.round + 1 && after.matchLog.length === before.log + 1 && last.round === before.round && last.gh === shown[0] && last.ga === shown[1] && myRow.j === 1
      && (await v2.locator(".pz-foot .cta").textContent()).includes("Continuar"), JSON.stringify({ shown, last, round: after.currentRound, j: myRow.j }));

  // 6) Modo ponte: sem som e sem marcar onboarding/assistente.
  const frame = v2.frames().find((f) => f.url().includes("ponte=partida"));
  const silent = frame ? await frame.evaluate(() => sfxCtx() === null && V2_PONTE === true) : false;
  const meAfter = await v2.evaluate(async () => (await (await fetch("/api/auth/me")).json()).user);
  check("6) Ponte em silêncio e sem alterar onboarding da conta:", silent && meAfter.onboardingSeen === meBefore.onboardingSeen, JSON.stringify({ silent, before: meBefore.onboardingSeen, after: meAfter.onboardingSeen }));

  // 7) 360 px: sem rolagem horizontal, alvos ≥ 44 px (tela encerrada).
  await v2.setViewportSize({ width: 360, height: 780 });
  const a = await v2.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className),
  }));
  check("7) 360 px sem rolagem horizontal e alvos ≥ 44 px:", a.overflow <= 0 && a.small.length === 0, JSON.stringify(a));

  await browser.close();
})();
