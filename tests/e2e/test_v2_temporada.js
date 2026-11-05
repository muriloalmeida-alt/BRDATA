// Carreira 2.0 — fase 5 do plano de independência (temporada e carreira do
// treinador), pela UI real. O fim de temporada é preparado no save pelo
// servidor (como test_board_goals.js): rodada 39 e tabela forçada.
//  1) Início com a temporada encerrada: "Próxima temporada" abre o
//     Encerramento da v2 (posição, meta cumprida, aviso do que acontece).
//  2) "Continuar" avança a temporada (advanceSeason): Nova temporada da v2;
//     save no ano seguinte, rodada 1, histórico +1. Recarregar não repete.
//  3) Proposta ao treinador: linha no Início; "Recusar" tira a proposta do
//     save; "Aceitar e mudar de clube" pede confirmação (Cancelar não muda
//     nada) e, confirmado, a carreira segue no novo clube (primeira
//     entrada), com o clube anterior no histórico do treinador.
//  4) Perfil do treinador (Mais) e Histórico: nome, clube atual, reputação,
//     passagem anterior com o motivo da saída.
//  5) Demissão: 3ª temporada sem meta → "O ciclo terminou."; recarregar o
//     Encerramento leva à demissão sem avançar de novo; "Começar nova
//     carreira" apaga o save do clube e a carreira criada pela v2 mantém o
//     histórico do treinador (com "demissão").
//  6) 360 px sem rolagem horizontal e alvos ≥ 44 px; nada por /carreira-old.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, serverCareer, skipAutoOpen } = require("./_v2_match");

const base = "http://localhost:8787";

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  await newCareer(page, `v2temp${Date.now()}@teste.com`);
  await page.close();

  const v2 = await ctx.newPage();
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const visited = [];
  v2.on("framenavigated", (f) => { if (f === v2.mainFrame()) visited.push(new URL(f.url()).pathname); });
  const sizes = {};
  const at360 = async (k) => {
    await v2.setViewportSize({ width: 360, height: 780 });
    sizes[k] = await v2.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth,
      small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className) }));
    await v2.setViewportSize({ width: 390, height: 844 });
  };
  const waitH1 = (t) => v2.waitForFunction((t) => (document.querySelector("h1") || {}).textContent === t, t, { timeout: 40000 });
  // Uma carreira nova (ao aceitar outro clube) abre o assistente de início: pula.
  const home = async () => { await v2.goto(base + "/", { waitUntil: "domcontentloaded" }); await skipAutoOpen(v2); await v2.waitForSelector(".home", { timeout: 20000 }); };
  await v2.goto(base + "/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 20000 });
  // Edita o save pelo servidor (a v2 relê ao navegar com recarga).
  const patch = (fn, arg) => v2.evaluate(async ({ src, arg }) => {
    const c = (await (await fetch("/api/career", { cache: "no-store" })).json()).career;
    new Function("c", "arg", src)(c, arg);
    await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
  }, { src: `(${fn})(c, arg)`, arg });
  const endSeason = (rank) => patch((c, rank) => {
    Object.keys(c.standings).forEach((id, i) => {
      const s = c.standings[id];
      if (String(id) === String(c.clubId)) { s.pts = rank === "first" ? 999 : -999; s.v = rank === "first" ? 38 : 0; s.j = 38; s.sg = rank === "first" ? 100 : -100; s.gp = rank === "first" ? 100 : 0; }
      else { s.pts = rank === "first" ? i : 500 - i; s.j = 38; }
    });
    c.currentRound = 39;
  }, rank);

  // 1) Encerramento.
  await endSeason("first");
  const s0 = await serverCareer(v2);
  await home();
  const cta = await v2.evaluate(() => { const a = document.querySelector(".home-main .cta"); return [a.textContent.trim(), a.getAttribute("href"), document.querySelector(".home-title").textContent]; });
  await v2.click(".home-main .cta");
  await waitH1("Temporada encerrada.");
  const e1 = await v2.evaluate(() => ({ pos: document.querySelector(".se-pos")?.textContent, goal: document.querySelector(".se-goal .row-title")?.textContent, met: !!document.querySelector(".se-met"),
    warn: document.querySelector(".se-warn").textContent, links: [...document.querySelectorAll(".row .row-title")].map((t) => t.textContent) }));
  await at360("encerramento");
  check("1) Temporada encerrada: 'Próxima temporada' abre o Encerramento da v2 (1º, meta cumprida, aviso da virada, classificação e histórico):",
    cta[0] === "Próxima temporada" && cta[1] === "/temporada" && cta[2] === "Temporada encerrada." && e1.pos === "1º" && e1.met && e1.goal === s0.boardGoal.label
      && e1.warn.includes(`temporada ${s0.seasonYear + 1} começa`) && e1.links.includes("Ver classificação") && e1.links.includes("Ver histórico"),
    JSON.stringify({ cta, e1 }));

  // 2) Nova temporada.
  await v2.click(".se .cal-foot .cta");
  await waitH1(`Temporada ${s0.seasonYear + 1}.`);
  const n2 = await v2.evaluate(() => ({ secs: [...document.querySelectorAll(".wk-sec .kicker-caps")].map((k) => k.textContent), rows: [...document.querySelectorAll(".wk-item dt")].map((d) => d.textContent) }));
  const s2 = await serverCareer(v2);
  await at360("nova-temporada");
  await v2.reload({ waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 20000 });
  const s2b = await serverCareer(v2);
  check("2) Continuar avança a temporada: Nova temporada da v2 (virada, objetivo, temporada anterior, base, finanças); save no ano seguinte, rodada 1; recarregar não repete:",
    n2.secs.join("|") === `Virada de temporada|Objetivo da diretoria|Temporada ${s0.seasonYear}|Base e elenco|Finanças` && n2.rows.includes("Elenco envelhecido") && n2.rows.includes("Teto salarial")
      && s2.seasonYear === s0.seasonYear + 1 && s2.currentRound === 1 && (s2.seasonHistory || []).length === (s0.seasonHistory || []).length + 1 && s2b.seasonYear === s2.seasonYear && (s2b.seasonHistory || []).length === (s2.seasonHistory || []).length,
    JSON.stringify({ n2, year: [s0.seasonYear, s2.seasonYear, s2b.seasonYear], round: s2.currentRound }));

  // 3) Proposta ao treinador.
  const other = Object.keys(s2.standings).find((id) => String(id) !== String(s2.clubId));
  const offer = (o) => patch((c, o) => { c.clubProposals = [{ clubId: o, clubName: "?", reputationRequired: 40, budgetOffered: 9_500_000, seasonYear: c.seasonYear }]; }, o);
  await offer(other);
  await patch((c) => { c.clubProposals[0].clubName = (c.divisionTeams && Object.values(c.divisionTeams).flat().find((t) => String(t.id) === String(c.clubProposals[0].clubId)) || {}).name || "Outro"; });
  const otherName = (await serverCareer(v2)).clubProposals[0].clubName;
  await home();
  await v2.click('.home-list a.row[href$="/proposta-clube"]');
  await waitH1("Um novo caminho.");
  const p3 = await v2.evaluate(() => [...document.querySelectorAll(".wk-item")].map((r) => [r.querySelector("dt").textContent, r.querySelector("dd").textContent]));
  await at360("proposta-clube");
  await v2.click(".co .cal-foot .link-back"); // Recusar
  await v2.waitForSelector(".home", { timeout: 20000 });
  const s3a = await serverCareer(v2);
  await offer(other);
  await patch((c, n) => { c.clubProposals[0].clubName = n; }, otherName);
  await home();
  await v2.click('.home-list a.row[href$="/proposta-clube"]');
  await waitH1("Um novo caminho.");
  await v2.click(".co .cal-foot .cta");
  await v2.waitForSelector("#co-t", { timeout: 5000 });
  const sheet = await v2.evaluate(() => ({ t: document.querySelector("#co-t").textContent, d: document.querySelector("#co-d").textContent }));
  await v2.click('[role="dialog"] .text-btn'); // Cancelar
  const s3b = await serverCareer(v2);
  await v2.click(".co .cal-foot .cta");
  await v2.waitForSelector("#co-t", { timeout: 5000 });
  await v2.click('[role="dialog"] .cta');
  await v2.waitForSelector(".ac-hero", { timeout: 60000 });
  const first = await v2.evaluate(() => ({ url: location.pathname, text: document.querySelector(".ac-hero")?.textContent || "" }));
  const s3 = await serverCareer(v2);
  check("3) Proposta ao treinador: clube, orçamento e clube atual; Recusar tira a proposta; Aceitar confirma (Cancelar não muda) e a carreira segue no novo clube, com o anterior no histórico:",
    p3.some((r) => r[0].includes(otherName)) && p3.some((r) => r[0] === "Orçamento para salários" && r[1] === "R$ 9,5 mi") && p3.some((r) => r[0] === "Posição atual")
      && (s3a.clubProposals || []).length === 0 && sheet.t === "Mudar de clube?" && sheet.d.includes(otherName) && String(s3b.clubId) === String(s2.clubId)
      && first.url === "/nova/pronto" && String(s3.clubId) === String(other) && s3.clubHistory[0].clubName === s2.clubName && s3.clubHistory[0].reason === "accepted_proposal",
    JSON.stringify({ p3, s3a: s3a.clubProposals, sheet, first, club: [s2.clubId, s3.clubId], hist: s3.clubHistory }));

  // 4) Perfil e histórico.
  await home();
  await v2.click('.tabbar .tab[href$="/mais"]');
  await v2.waitForURL(/\/mais$/);
  await v2.click('.hb-row[href$="/perfil"]');
  await waitH1("Perfil do treinador.");
  const p4 = await v2.evaluate(() => ({ name: document.querySelector(".cp-name").textContent, role: document.querySelector(".cp-role").textContent, rep: document.querySelector(".wk-item dd").textContent }));
  await at360("perfil");
  await v2.click('.row[href$="/historico"]');
  await waitH1("Sua história no jogo.");
  const h4 = await v2.evaluate(() => [...document.querySelectorAll(".nw-item")].map((i) => i.textContent));
  await at360("historico");
  check("4) Perfil (pelo Mais) e Histórico: nome, 'Treinador do <novo clube>', reputação com status; passagem anterior com o motivo da saída:",
    p4.name === "Murilo Almeida" && p4.role === `Treinador do ${s3.clubName}` && /^\d+ · \S+/.test(p4.rep) && h4.some((t) => t.includes(s2.clubName) && t.includes("Saiu por proposta de outro clube")),
    JSON.stringify({ p4, h4 }));

  // 5) Demissão.
  await endSeason("last");
  await patch((c) => { c.negativeSeasonsStreak = 2; });
  const s5a = await serverCareer(v2);
  await home();
  await v2.click(".home-main .cta");
  await waitH1("Temporada encerrada.");
  await v2.click(".se .cal-foot .cta");
  await waitH1("O ciclo terminou.");
  const d5 = await v2.evaluate(() => ({ reason: document.querySelector(".dm-reason").textContent, rows: [...document.querySelectorAll(".wk-item dt")].map((d) => d.textContent) }));
  await at360("demissao");
  const s5b = await serverCareer(v2);
  await v2.goto(base + "/temporada", { waitUntil: "domcontentloaded" });
  await waitH1("O ciclo terminou.");
  const s5c = await serverCareer(v2);
  await v2.click(".dm .cal-foot .cta");
  await v2.waitForSelector('.ac-opt[role="radio"]', { timeout: 40000 });
  const gone = await v2.evaluate(async () => (await (await fetch("/api/career", { cache: "no-store" })).json()).career);
  await v2.locator(".ac-opt").first().click();
  await v2.click(".ac-foot .cta");
  await v2.waitForSelector(".ac-club", { timeout: 40000 });
  await v2.locator(".ac-club").first().click();
  await v2.click(".ac-foot .cta");
  await v2.waitForSelector(".ac-form .cta", { timeout: 20000 });
  await v2.click(".ac-form .cta");
  await v2.waitForSelector(".ac-hero", { timeout: 60000 });
  const s5 = await serverCareer(v2);
  check("5) Demissão: 'O ciclo terminou.' com motivo e passagem; recarregar o Encerramento volta à demissão sem avançar de novo; a nova carreira mantém o histórico (com a demissão):",
    /3 temporadas seguidas sem cumprir a meta/.test(d5.reason) && d5.rows.join("|") === "Jogos|Vitórias|Títulos" && s5b.negativeSeasonsStreak === 3 && s5b.seasonYear === s5a.seasonYear
      && (s5c.seasonHistory || []).length === (s5b.seasonHistory || []).length && !gone
      && s5 && (s5.clubHistory || []).some((h) => h.clubName === s3.clubName && h.reason === "dismissed") && (s5.clubHistory || []).some((h) => h.clubName === s2.clubName),
    JSON.stringify({ d5, streak: s5b.negativeSeasonsStreak, hist: [(s5b.seasonHistory || []).length, (s5c.seasonHistory || []).length], gone: !!gone, newHist: s5 && s5.clubHistory }));

  check("6) 360 px sem rolagem horizontal e alvos ≥ 44 px; nada por /carreira-old:",
    Object.values(sizes).every((s) => s.overflow <= 0 && s.small.length === 0) && !visited.some((p) => p.startsWith("/carreira-old")),
    JSON.stringify({ sizes, old: visited.filter((p) => p.startsWith("/carreira-old")) }));

  await browser.close();
})();
