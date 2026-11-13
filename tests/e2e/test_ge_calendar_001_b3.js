// GE-CALENDAR-001 (B3) — data da semana no Início, o calendário do ano e o
// aviso de rodízio na semana de 2 jogos (Copa na quarta). Lote L4c (sem a
// tela antiga):
//  1) Início da v2 na pré-temporada: "Pré-temporada · semana N de M"
//     (antes: "Semana de dd/fev" no topo da tela antiga).
//  2) O calendário do ano (motor): semanas de 12 meses, 5 amistosos, 13
//     semanas de Copa (a preliminar e as 12 pernas) e a rodada 1. A lista
//     semana a semana era da tela antiga; o Calendário da v2 (jogos e
//     próximo compromisso) está no test_v2_calendario, e a Copa nele no
//     test_v2_serie_d.
//  3) Semana de 2 jogos (Copa na quarta): o Pré-jogo da v2 mostra "Semana
//     de 2 jogos" e o Início, a data do jogo com a rodada.
const { chromium } = require("playwright-core");
const { carreiraV2, signup, ensureDailyClaimed, globaisDoMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await carreiraV2(page, `gecalb3${Date.now()}@teste.com`, { clube: "fla", preTemporada: true, criarConta: signup });
  await ensureDailyClaimed(page);
  let ok = true;
  const check = (label, cond, extra) => { console.log(label, !!cond, extra !== undefined ? JSON.stringify(extra) : ""); ok = ok && !!cond; };

  // 1) Início na pré-temporada.
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".home", { timeout: 30000 });
  const fase = await page.evaluate(() => document.querySelector(".home-phase")?.textContent || "");
  check("1) Início na pré-temporada mostra a semana: 'Pré-temporada · semana N de M':", /^Pré-temporada · semana \d+ de \d+$/.test(fase), fase);

  // 2) O calendário do ano, pelo motor.
  await globaisDoMotor(page);
  const cal = await page.evaluate(() => {
    const ws = CAREER.calendar.weeks;
    const meses = new Set(ws.map((w) => w.d.slice(0, 2)));
    return { semanas: ws.length, meses: meses.size, amistosos: CAREER.calendar.friendlies.length, copa: ws.filter((w) => w.c).length, rodada1: ws.some((w) => w.r === 1), rodadas: ws.filter((w) => w.r).length };
  });
  check("2) O calendário do ano: semanas nos 12 meses, 5 amistosos, 13 semanas de Copa e as 38 rodadas (com a 1ª):",
    cal.meses === 12 && cal.amistosos === 5 && cal.copa === 13 && cal.rodada1 && cal.rodadas === 38, cal);

  // 3) Avança até a 1ª semana de 2 jogos em que o clube joga a Copa.
  const r3 = await page.evaluate(async () => {
    let guard = 0;
    const me = String(CAREER.clubId);
    const jogaCopa = () => { const w = calendarWeek(); if (!w || !w.r || !w.c) return false; const cup = CAREER.cup; const pre = cup.prelim && w.r === (cup.prelim.round || 1); return !pre || (cup.ties.prelim || []).some((t) => String(t.home) === me || String(t.away) === me); };
    while (guard++ < 60 && !jogaCopa()) {
      const w = calendarWeek();
      if (!w.r) { const f = friendlySlotThisWeek(); if (f) f.played = true; runCalendarOffWeek(); continue; }
      const j = await jogarPartidaDaRodada();
      if (!j.ok) return { erro: j.passos };
    }
    await persistCareer();
    return { round: CAREER.currentRound, cup: !!calendarWeek().c };
  });
  await page.goto(base + "/pre-jogo", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => /Rodada \d+/.test(document.body.textContent), null, { timeout: 30000 }).catch(() => {});
  const pre = await page.evaluate(() => document.body.innerText);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".home", { timeout: 30000 });
  const linha = await page.evaluate(() => document.querySelector(".home-date")?.textContent || "");
  check("3) Semana de 2 jogos: o Pré-jogo da v2 mostra 'Semana de 2 jogos' (Copa na quarta) e o Início, a data com a rodada:",
    r3.cup && /Semana de 2 jogos/.test(pre) && /Copa do Brasil na quarta/.test(pre) && new RegExp(`^\\d{2} \\w{3} · RODADA ${r3.round}$`).test(linha), { r3, linha });

  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.log("FATAL:", e.message); process.exit(1); });
