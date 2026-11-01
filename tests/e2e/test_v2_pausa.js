// Carreira 2.0 — Entrega A2 (Pausa e intervalo na Partida da v2). Pela UI
// real, partida jogada pela ponte: Pausar abre a Pausa (?tela=pausa) e
// segura o minuto; Revisar time mostra a escalação ao vivo (igual à do
// save antes do jogo); voltar do sistema retorna sem perder a partida;
// Retomar volta a jogar; no intervalo a Pausa abre sozinha com "Começar 2º
// tempo"; Ajustes também abre a Pausa; a partida termina e grava; 360 px.
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

  const email = `v2pz${Date.now()}@teste.com`;
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
  const saved = await page.evaluate(() => ({ round: CAREER.currentRound, formation: CAREER.lineup.formation, gk: CAREER.squad.find((p) => p.id === CAREER.lineup.starters[0]).overall, bench: CAREER.lineup.bench.length }));
  await page.goto("about:blank");

  const v2 = await ctx.newPage();
  await v2.goto(base + "/carreira-v2/partida?iniciar=1", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".mt-score", { timeout: 40000 });
  await v2.waitForFunction(() => /^(15|30)/.test(document.querySelector(".mt-min")?.textContent || ""), null, { timeout: 20000 });

  // 1) Pausar → Pausa; minuto parado; linhas da prancha.
  await v2.click(".mt-actions .mt-primary");
  await v2.waitForSelector(".pz-title", { timeout: 10000 });
  const p1 = await v2.evaluate(() => ({ search: location.search, title: document.querySelector(".pz-title").textContent, min: document.querySelector(".pz-min").textContent,
    rows: [...document.querySelectorAll(".pz-row .row-title")].map((r) => r.textContent), soon: document.querySelectorAll(".pz-row[aria-disabled='true']").length, cta: document.querySelector(".pz-foot .mt-primary").textContent }));
  await v2.waitForTimeout(2500);
  const min2 = await v2.locator(".pz-min").textContent();
  check("1) Pausar abre a Pausa (?tela=pausa) com Revisar time / Substituir / Ajustar tática / Lances (A3) e 'Retomar partida'; minuto parado:",
    p1.search === "?tela=pausa" && p1.title === "Partida pausada" && JSON.stringify(p1.rows) === JSON.stringify(["Revisar time", "Substituir jogador", "Ajustar tática", "Lances da partida"]) && p1.soon === 0 && /Retomar partida/.test(p1.cta) && min2 === p1.min, JSON.stringify({ p1, min2 }));

  // 2) Revisar time: escalação ao vivo = a do save antes do jogo.
  await v2.click(".pz-row[href$='tela=time']");
  await v2.waitForSelector(".pm-pitch", { timeout: 10000 });
  const t = await v2.evaluate(() => ({ search: location.search, slots: document.querySelectorAll(".pm-pitch .lu-slot").length, links: document.querySelectorAll(".pm-pitch a").length,
    formation: document.querySelector(".pm-formation").getAttribute("aria-label"), gk: [...document.querySelectorAll(".pm-pitch .lu-slot")].pop().querySelector("text").textContent, bench: document.querySelectorAll(".pz-bench-row").length }));
  check("2) Revisar time: 11 titulares só leitura, formação, goleiro e banco iguais aos da escalação em campo:",
    t.search === "?tela=time" && t.slots === 11 && t.links === 0 && t.formation === `Formação ${saved.formation}` && t.gk === String(saved.gk) && t.bench === saved.bench, JSON.stringify({ t, saved }));

  // 3) Voltar do sistema → Pausa → Partida (ainda pausada, mesma partida); Retomar.
  await v2.goBack(); await v2.waitForSelector(".pz-title", { timeout: 10000 });
  await v2.goBack(); await v2.waitForSelector(".mt-score", { timeout: 10000 });
  const back = await v2.evaluate(() => ({ search: location.search, btn: document.querySelector(".mt-actions .mt-primary").textContent, min: document.querySelector(".mt-min").textContent }));
  await v2.click(".mt-actions .mt-secondary"); // Ajustes → Pausa
  await v2.waitForSelector(".pz-title", { timeout: 10000 });
  await v2.click(".pz-foot .mt-primary"); // Retomar partida
  await v2.waitForSelector(".mt-score", { timeout: 10000 });
  const resumed = await v2.evaluate(() => ({ search: location.search, btn: document.querySelector(".mt-actions .mt-primary").textContent }));
  check("3) Voltar do sistema retorna à Partida sem perder o jogo (ainda pausada); Ajustes abre a Pausa; 'Retomar partida' volta a jogar:",
    back.search === "" && /Retomar/.test(back.btn) && back.min === p1.min && resumed.search === "" && /Pausar/.test(resumed.btn), JSON.stringify({ back, resumed }));

  // 4) Intervalo: a Pausa abre sozinha; Começar 2º tempo.
  await v2.waitForSelector(".pz-title", { timeout: 40000 });
  const ht = await v2.evaluate(() => ({ title: document.querySelector(".pz-title").textContent, min: document.querySelector(".pz-min").textContent, cta: document.querySelector(".pz-foot .mt-primary").textContent }));
  await v2.click(".pz-foot .mt-primary");
  await v2.waitForFunction(() => document.querySelector(".mt-period")?.textContent === "2º tempo", null, { timeout: 20000 });
  check("4) No intervalo a Pausa abre sozinha ('Intervalo', 'Começar 2º tempo') e o 2º tempo começa ao tocar:", ht.title === "Intervalo" && ht.min === "Intervalo" && /Começar 2º tempo/.test(ht.cta), JSON.stringify(ht));

  // 5) 360 px na Pausa; fim e gravação.
  await v2.setViewportSize({ width: 360, height: 780 });
  await v2.click(".mt-actions .mt-primary");
  await v2.waitForSelector(".pz-title", { timeout: 10000 });
  const a = await v2.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className),
  }));
  await v2.click(".pz-foot .mt-primary");
  await v2.waitForSelector(".mt-score", { timeout: 10000 });
  await v2.click(".mt-skip");
  await v2.waitForFunction(() => document.querySelector(".mt-period")?.textContent === "Encerrado", null, { timeout: 30000 });
  await v2.waitForTimeout(1500);
  const after = await v2.evaluate(async () => (await (await fetch("/api/career", { cache: "no-store" })).json()).career.currentRound);
  check("5) Pausa em 360 px sem rolagem horizontal e alvos ≥ 44 px; partida termina e a rodada é gravada:", a.overflow <= 0 && a.small.length === 0 && after === saved.round + 1, JSON.stringify({ a, after }));

  await browser.close();
})();
