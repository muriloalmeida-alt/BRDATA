// Carreira 2.0 — Entrega 07 (Diretoria, /diretoria). Pela UI
// real: Início → Objetivo → Diretoria; meta igual à da versão atual;
// pré-temporada sem posição; depois de 1 rodada, posição e "Dentro da
// meta" com o critério da versão atual (boardGoalMet); outros objetivos;
// temporadas anteriores; Ver classificação; Voltar ao clube; nada gravado.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { signup, carreiraV2, ensureDailyClaimed, pularPreTemporada, jogarRodadaV2, noMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";

  const email = `v2bd${Date.now()}@teste.com`;
  // Conta e carreira pelo motor da v2 (sem a tela antiga), ainda na pré-temporada.
  await carreiraV2(page, email, { clube: "fla", preTemporada: true, criarConta: signup });
  await ensureDailyClaimed(page);
  const goal = await noMotor(page, ({ CAREER }) => CAREER.boardGoal.label);

  const v2 = await ctx.newPage();
  const writes = [];
  v2.on("request", (r) => { if (r.url().includes("/api/career") && r.method() !== "GET") writes.push(r.method()); });
  const read = () => v2.evaluate(() => ({
    path: location.pathname, title: document.querySelector(".cal-title").textContent, lead: document.querySelector(".cal-lead").textContent,
    items: [...document.querySelectorAll(".bd-item")].map((i) => [...i.querySelectorAll("dd")].map((d) => d.textContent)),
    objectives: document.querySelectorAll("#bd-obj ~ ul .bd-row").length,
    history: [...document.querySelectorAll("#bd-hist ~ ul .bd-row")].map((r) => r.textContent),
    text: document.body.innerText,
  }));

  // 1) Pré-temporada: Início → Objetivo → Diretoria, meta real, sem posição.
  await v2.goto(base + "/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  await v2.click('a.row[href="/diretoria"]');
  await v2.waitForSelector(".bd-list", { timeout: 10000 });
  const pre = await read();
  check("1) Início → Diretoria (pré-temporada): meta igual à da versão atual e 'Temporada ainda não começou', sem barra nem %:",
    pre.path === "/diretoria" && pre.title === "Diretoria" && pre.lead === "O que o clube espera." && pre.items[0][0] === goal
      && pre.items[1][0] === "Temporada ainda não começou" && pre.items[1].length === 1 && !/%|confian/i.test(pre.text), JSON.stringify(pre.items));

  // 2) Depois de 1 rodada: posição e "Dentro da meta" pelo critério da versão atual.
  await pularPreTemporada(page);
  // Uma rodada pela ponte do motor da v2 (proposta por jogador: recusa).
  { const r = await jogarRodadaV2(page); if (!r.ok) throw new Error("rodada: " + r.passos.join(" ")); }
  const legacy = await noMotor(page, ({ CAREER, fechamento, temporada }) => {
    const pos = fechamento.myLeaguePosition();
    return { pos, met: temporada.boardGoalMet(pos, CAREER.boardGoal), objectives: ((CAREER.objectives && CAREER.objectives.season) || []).length };
  });
  writes.length = 0;
  await v2.reload({ waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".bd-list", { timeout: 15000 });
  const r1 = await read();
  check("2) Depois de 1 rodada: 'Nº na tabela' e 'Dentro da meta' exatamente quando a versão atual considera a meta em dia; outros objetivos:",
    r1.items[1][0] === `${legacy.pos}º na tabela` && (r1.items[1][1] === "Dentro da meta") === legacy.met && r1.objectives === legacy.objectives, JSON.stringify({ items: r1.items, legacy }));

  // 3) Temporadas anteriores (histórico gravado no fim de temporada pela versão atual).
  await page.evaluate(async () => {
    const c = (await (await fetch("/api/career", { cache: "no-store" })).json()).career;
    c.seasonHistory = [{ year: c.seasonYear - 1, position: 7, points: 55, goalLabel: "Terminar entre os 10 primeiros", goalWasMet: true }, { year: c.seasonYear - 2, position: 15, points: 40, goalLabel: "Terminar entre os 12 primeiros", goalWasMet: false }];
    await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
  });
  writes.length = 0;
  await v2.reload({ waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".bd-list", { timeout: 15000 });
  const r2 = await read();
  check("3) Temporadas anteriores: ano, posição final, meta e Cumprida/Não cumprida:",
    r2.history.length === 2 && /· 7º lugar/.test(r2.history[0]) && /Terminar entre os 10 primeiros · Cumprida$/.test(r2.history[0]) && /Não cumprida$/.test(r2.history[1]), JSON.stringify(r2.history));

  // 4) Ver classificação → Tabela; voltar; 360 px; Voltar ao clube; nada gravado.
  await v2.click('.bd-link[href="/tabela"]');
  await v2.waitForSelector(".tb-table", { timeout: 10000 });
  await v2.goBack(); await v2.waitForSelector(".bd-list", { timeout: 10000 });
  await v2.setViewportSize({ width: 360, height: 780 });
  const a = await v2.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className),
  }));
  await v2.click(".cal-foot .link-back");
  await v2.waitForURL(/\/clube$/, { timeout: 10000 });
  check("4) Ver classificação abre a Tabela; 360 px sem rolagem horizontal e alvos ≥ 44 px; Voltar ao clube → tela Clube (P7); nada gravado:",
    a.overflow <= 0 && a.small.length === 0 && new URL(v2.url()).pathname === "/clube" && writes.length === 0, JSON.stringify({ a, writes, url: v2.url() }));

  await browser.close();
})();
