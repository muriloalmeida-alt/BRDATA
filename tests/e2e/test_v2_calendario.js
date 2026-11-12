// Carreira 2.0 — Entrega 05 (Calendário, /calendario). Pela UI
// real: Início → Ver calendário; pré-temporada (sem anteriores); depois de
// 2 rodadas jogadas, próximo compromisso = rodada atual (adversário, data
// do domingo e mando iguais aos da versão atual), anteriores com placar do
// registro de partidas; CTA da semana; nada gravado; 360 px.
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

  const email = `v2cal${Date.now()}@teste.com`;
  // Conta e carreira pelo motor da v2 (sem a tela antiga), ainda na pré-temporada.
  await carreiraV2(page, email, { clube: "fla", preTemporada: true, criarConta: signup });
  await ensureDailyClaimed(page);

  const v2 = await ctx.newPage();
  const writes = [];
  v2.on("request", (r) => { if (r.url().includes("/api/career") && r.method() !== "GET") writes.push(r.method()); });
  const items = () => v2.evaluate(() => [...document.querySelectorAll(".cal-list:not(#cal-past) .cal-item")].map((li) => ({
    date: li.querySelector(".cal-when b").textContent, sub: li.querySelector(".cal-when span").textContent,
    teams: [...li.querySelectorAll(".cal-team")].map((t) => t.textContent), x: li.querySelector(".cal-x").textContent,
    comp: li.querySelector(".cal-comp").textContent, next: li.classList.contains("is-next"),
  })));

  // 1) Pré-temporada: Início → Ver calendário; 38 rodadas, sem anteriores.
  await v2.goto(base + "/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  await v2.click('a.row[href="/calendario"]');
  await v2.waitForSelector(".cal-list", { timeout: 10000 });
  const pre = await items();
  const pre1 = await v2.evaluate(() => ({ path: location.pathname, title: document.querySelector(".cal-title").textContent, lead: document.querySelector(".cal-lead").textContent, past: !!document.querySelector(".cal-more"), cta: document.querySelector(".cal-foot .cta").textContent }));
  check("1) Início → Calendário (pré-temporada): 38 rodadas do Brasileirão, próximo destacado, sem 'anteriores', CTA da semana:",
    pre1.path === "/calendario" && pre1.title === "Calendário" && pre1.lead === "Seu próximo compromisso." && !pre1.past
      && pre.filter((i) => i.comp.startsWith("Brasileirão Série A · Rodada")).length === 38 && pre[0].next && pre.filter((i) => i.next).length === 1
      && pre1.cta === "Avançar semana", JSON.stringify({ pre1, first: pre[0] }));

  // 2) Depois de 2 rodadas: próximo = rodada 3, igual à versão atual.
  await pularPreTemporada(page);
  // Duas rodadas pela ponte do motor da v2 (proposta por jogador: recusa).
  for (let i = 0; i < 2; i++) { const r = await jogarRodadaV2(page); if (!r.ok) throw new Error("rodada: " + r.passos.join(" ")); }
  const legacy = await noMotor(page, ({ CAREER, estado, jogo }) => {
    const teamById = (id) => estado.timePorId(id), calendarDateLabel = jogo.calendarDateLabel;
    const r = CAREER.currentRound;
    const fx = CAREER.schedule[r].find((m) => String(m.home) === String(CAREER.clubId) || String(m.away) === String(CAREER.clubId));
    const w = CAREER.calendar.weeks.find((x) => x.r === r);
    return {
      r, home: teamById(fx.home).name, away: teamById(fx.away).name, isHome: String(fx.home) === String(CAREER.clubId),
      sunday: calendarDateLabel(w, 6), // "12/abr"
      log: CAREER.matchLog.filter((m) => m.seasonYear === CAREER.seasonYear).map((m) => ({ round: m.round, gh: m.gh, ga: m.ga })),
    };
  });
  writes.length = 0;
  await v2.reload({ waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".cal-list", { timeout: 15000 });
  const up = await items();
  const next = up.find((i) => i.next);
  const [dd, mon] = legacy.sunday.split("/");
  check("2) Próximo compromisso = rodada atual: adversário, data do domingo e mando iguais aos da versão atual:",
    next && next.comp === `Brasileirão Série A · Rodada ${legacy.r}` && next.teams[0] === legacy.home && next.teams[1] === legacy.away
      && next.date === `${dd} ${mon.toUpperCase()}` && next.sub === `DOM · ${legacy.isHome ? "Casa" : "Fora"}` && next.x === "×", JSON.stringify({ next, legacy }));

  // 3) Anteriores: as 2 rodadas com o placar do registro de partidas.
  await v2.click(".cal-more");
  const past = await v2.evaluate(() => [...document.querySelectorAll("#cal-past .cal-item")].map((li) => ({ comp: li.querySelector(".cal-comp").textContent, x: li.querySelector(".cal-x").textContent })));
  const league = past.filter((p) => p.comp.includes("Rodada"));
  check("3) 'Ver anteriores': rodadas disputadas com placar igual ao da versão atual, em ordem:",
    league.length === 2 && legacy.log.length === 2 && league.every((p, i) => { const l = legacy.log.find((m) => p.comp.endsWith(`Rodada ${m.round}`)); return l && p.x === `${l.gh} × ${l.ga}` && p.comp.endsWith(`Rodada ${i + 1}`); })
      && (await v2.locator(".cal-more").getAttribute("aria-expanded")) === "true", JSON.stringify({ past, log: legacy.log }));

  // 4) CTA da semana de jogo abre o Pré-jogo; 360 px; nada gravado.
  const cta = await v2.locator(".cal-foot .cta").getAttribute("href");
  await v2.setViewportSize({ width: 360, height: 780 });
  const a = await v2.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className),
  }));
  check("4) CTA 'Preparar partida' → Pré-jogo; 360 px sem rolagem horizontal e alvos ≥ 44 px; nada gravado:",
    cta === "/pre-jogo" && a.overflow <= 0 && a.small.length === 0 && writes.length === 0, JSON.stringify({ cta, a, writes }));

  // 5) Voltar → Início.
  await v2.goto(base + "/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  await v2.click('a.row[href="/calendario"]');
  await v2.waitForSelector(".cal-list", { timeout: 10000 });
  await v2.click(".back-btn");
  await v2.waitForSelector(".home", { timeout: 10000 });
  check("5) Voltar leva ao Início:", new URL(v2.url()).pathname === "/", v2.url());

  await browser.close();
})();
