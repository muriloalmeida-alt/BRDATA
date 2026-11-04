// Carreira 2.0 — Entrega 06 (Elenco + Perfil, /carreira/elenco). Pela UI
// real: aba Elenco da v2; seções e contagens iguais às da versão atual
// (principal + emprestados por posição, base à parte); situação real
// (titular/reserva/lesionado com retorno); Perfil com dados esportivos e
// sem idade/salário; "Contrato e ações" abre a ficha da versão atual;
// navegação Elenco ↔ Perfil ↔ Escalação; nada gravado; 360 px.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { ensureDailyClaimed } = require("./_v2_match");
const { passCareerSetup, enterGame, waitForBoot } = require("./_startup");
const { skipPreseason } = require("./_calendar_skip");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";

  const email = `v2sq${Date.now()}@teste.com`;
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
  await ensureDailyClaimed(page);
  await skipPreseason(page);
  // Um titular lesionado para conferir a situação real.
  const fx = await page.evaluate(() => {
    const p = CAREER.squad.find((x) => x.id === CAREER.lineup.starters[2]);
    p.status = "contundido"; p.outUntilRound = CAREER.currentRound + 3;
    return persistCareer().then(() => ({
      hurtId: p.id, back: p.outUntilRound,
      main: CAREER.squad.filter((x) => x.origin === "principal" || x.origin === "loan").length,
      base: CAREER.squad.filter((x) => x.origin === "base").length,
      striker: CAREER.lineup.starters.map((id) => CAREER.squad.find((x) => x.id === id)).find((x) => x && x.group === "F"),
    }));
  });

  // 1) Aba Elenco (v2) a partir do Início; seções e contagens.
  const v2 = await ctx.newPage();
  const writes = [];
  v2.on("request", (r) => { if (r.url().includes("/api/career") && r.method() !== "GET") writes.push(r.method()); });
  await v2.goto(base + "/carreira/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  await v2.click('.tab[href="/carreira/elenco"]');
  await v2.waitForSelector(".sq-row", { timeout: 10000 });
  const sq = await v2.evaluate(() => ({
    path: location.pathname, title: document.querySelector(".sq-title").textContent,
    heads: [...document.querySelectorAll(".sq-head")].map((h) => h.textContent),
    perSec: [...document.querySelectorAll(".sq-sec")].map((s) => s.querySelectorAll(".sq-row").length),
  }));
  const mainShown = sq.perSec.slice(0, sq.heads.indexOf("Base") >= 0 ? sq.heads.indexOf("Base") : undefined).reduce((a, b) => a + b, 0);
  const baseShown = sq.heads.indexOf("Base") >= 0 ? sq.perSec[sq.heads.indexOf("Base")] : 0;
  check("1) Aba Elenco abre o Elenco da v2: Goleiros/Defesa/Meio-campo/Ataque + Base, mesmas contagens da versão atual:",
    sq.path === "/carreira/elenco" && sq.title === "Elenco" && JSON.stringify(sq.heads.slice(0, 4)) === JSON.stringify(["Goleiros", "Defesa", "Meio-campo", "Ataque"])
      && mainShown === fx.main && baseShown === fx.base, JSON.stringify({ sq, fx: { main: fx.main, base: fx.base } }));

  // 2) Situação real: lesionado com retorno (vermelho) e titular.
  const sit = await v2.evaluate(({ hurtId, strikerId }) => {
    const row = (id) => document.querySelector(`.sq-row[href$="id=${encodeURIComponent(id)}"]`);
    const h = row(hurtId), s = row(strikerId);
    return { hurt: h.querySelector(".sq-sit").textContent, danger: h.querySelector(".sq-sit").classList.contains("sq-sit--danger"), striker: s.querySelector(".sq-sit").textContent, ovr: s.querySelector("text").textContent };
  }, { hurtId: fx.hurtId, strikerId: fx.striker.id });
  check("2) Situação sob o nome: 'Lesionado · volta na rodada N' em vermelho; titular como 'Titular'; overall na camisa:",
    sit.hurt === `Lesionado · volta na rodada ${fx.back}` && sit.danger && sit.striker === "Titular" && sit.ovr === String(fx.striker.overall), JSON.stringify(sit));

  // 3) Perfil: dados esportivos, sem idade/salário.
  await v2.click(`.sq-row[href$="id=${encodeURIComponent(fx.striker.id)}"]`);
  await v2.waitForSelector(".pf-hero", { timeout: 10000 });
  const pf = await v2.evaluate(() => ({
    name: document.querySelector(".pf-name").textContent, pos: document.querySelector(".pf-pos").textContent, club: document.querySelector(".pf-club").textContent,
    facts: Object.fromEntries([...document.querySelectorAll(".pf-fact")].map((f) => [f.querySelector("dt").textContent, f.querySelector("dd").textContent])),
    text: document.body.innerText, legacy: document.querySelector(".pf-legacy").getAttribute("href"),
  }));
  const parts = fx.striker.name.trim().split(/\s+/);
  const short = parts.length > 1 ? `${parts[0][0].toUpperCase()}. ${parts[parts.length - 1]}` : fx.striker.name;
  check("3) Perfil: nome, 'Ataque', 'No elenco do Flamengo', overall/atributos/jogos iguais ao save, sem idade nem salário:",
    pf.name === short && pf.pos === "Ataque" && pf.club === "No elenco do Flamengo" && pf.facts["Overall"] === String(fx.striker.overall) && pf.facts["Ataque"] === String(fx.striker.atk)
      && pf.facts["Situação"] === "Titular" && pf.facts["Jogos"] === String(fx.striker.apps || 0) && !/anos|Salário|R\$/.test(pf.text) && pf.legacy === `/carreira/elenco/ficha?id=${encodeURIComponent(fx.striker.id)}`, JSON.stringify(pf.facts));

  // 4) Navegação: Ver escalação → Escalação v2; voltar; Voltar ao elenco.
  await v2.click('.pf-foot a.cta[href="/carreira/escalacao"]');
  await v2.waitForSelector(".lu-pitch", { timeout: 10000 });
  await v2.goBack(); await v2.waitForSelector(".pf-hero", { timeout: 10000 });
  await v2.click(".pf-foot .link-back");
  await v2.waitForSelector(".sq-row", { timeout: 10000 });
  const navOk = new URL(v2.url()).pathname === "/carreira/elenco";
  await v2.click('.cal-foot a.cta[href="/carreira/escalacao"]');
  await v2.waitForSelector(".lu-pitch", { timeout: 10000 });
  await v2.click('.lu-more[href="/carreira/elenco"]');
  await v2.waitForSelector(".sq-row", { timeout: 10000 });
  check("4) Perfil → Ver escalação → voltar → 'Voltar ao elenco'; Elenco → Ajustar escalação → 'Ver elenco' volta ao Elenco:", navOk && new URL(v2.url()).pathname === "/carreira/elenco", v2.url());

  // 5) Jogador inexistente → Elenco; 360 px; nada gravado.
  await v2.goto(base + "/carreira/elenco/jogador?id=nao-existe", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".sq-row", { timeout: 15000 });
  const redirected = new URL(v2.url()).pathname === "/carreira/elenco";
  await v2.setViewportSize({ width: 360, height: 780 });
  const audit = () => v2.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className),
  }));
  const a1 = await audit();
  await v2.goto(base + "/carreira/elenco/jogador?id=" + encodeURIComponent(fx.hurtId), { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".pf-hero", { timeout: 15000 });
  const a2 = await audit();
  const hurtSit = await v2.evaluate(() => [...document.querySelectorAll(".pf-fact")].find((f) => f.querySelector("dt").textContent === "Situação").querySelector("dd").className);
  check("5) Jogador inexistente volta ao Elenco; 360 px sem rolagem horizontal e alvos ≥ 44 px; situação de lesão em vermelho no Perfil; nada gravado:",
    redirected && [a1, a2].every((a) => a.overflow <= 0 && a.small.length === 0) && hurtSit === "sq-sit--danger" && writes.length === 0, JSON.stringify({ redirected, a1, a2, hurtSit, writes }));

  // 6) "Contrato e ações do jogador" abre a ficha completa da v2 (fase 7).
  await v2.click(".pf-legacy");
  await v2.waitForFunction(() => (document.querySelector("h1") || {}).textContent === "Conheça seu jogador.", null, { timeout: 15000 });
  const det = await v2.evaluate(() => ({ path: location.pathname + location.search, name: document.querySelector(".sp-player .row-title")?.textContent }));
  check("6) 'Contrato e ações do jogador' abre a ficha completa da v2 do mesmo jogador:", det.path.startsWith("/carreira/elenco/ficha?id=") && !!det.name, JSON.stringify(det));

  await browser.close();
})();
