// SERIED-001 (13/11/2026) — a Série D na Copa do Brasil, pela v2, sem a tela
// antiga. Carreira na Série C (o clube joga a fase preliminar):
//  1) a Copa mostra a "Fase preliminar" (jogo único, rodada 1) com o
//     adversário sorteado; o calendário lista o jogo único na rodada 1;
//  2) a rodada 1 inteira pela ponte (pós-jogo com a perna ao vivo da Copa):
//     a preliminar é decidida no jogo único (sem volta) e a Copa segue para
//     a 1ª fase (ou o clube cai, com a frase "na fase preliminar");
//  3) clube da Série D aparece com nome e monograma (sem escudo quebrado);
//  4) sem erro na página e 360 px sem rolagem horizontal na Copa.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, signup, ensureDailyClaimed, noMotor, jogarRodadaV2, saveNoServidor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await carreiraV2(page, `v2seried${Date.now()}@teste.com`, { competicao: "serie_c", clube: "nau", criarConta: signup });
  await ensureDailyClaimed(page);
  const h1 = (t) => page.waitForFunction((t) => (document.querySelector("h1") || {}).textContent === t, t, { timeout: 20000 });

  // Para o item 3, o adversário da preliminar passa a ser um clube da D.
  const prep = await noMotor(page, async ({ CAREER, persistir }) => {
    const ties = CAREER.cup.ties.prelim;
    const mine = ties.find((t) => t.home === CAREER.clubId || t.away === CAREER.clubId);
    const d = CAREER.serieDPool[0];
    const other = ties.find((t) => t !== mine && (t.home === String(d.id) || t.away === String(d.id)));
    const oppKey = mine.home === CAREER.clubId ? "away" : "home";
    const otherKey = other.home === String(d.id) ? "home" : "away";
    const old = mine[oppKey]; mine[oppKey] = String(d.id); other[otherKey] = old;
    await persistir();
    return { participantes: CAREER.cup.participantes, fase: CAREER.cup.phase, opp: d.name, oppId: String(d.id) };
  });

  // 1) Copa e calendário antes da rodada 1.
  await page.goto(base + "/copa", { waitUntil: "domcontentloaded" });
  await h1("A caminho da taça.");
  const c1 = await page.evaluate(() => ({
    fase: (document.getElementById("cp-f") ? [...document.querySelectorAll('[aria-labelledby="cp-f"] [role="radio"], #cp-f option')].map((o) => o.textContent) : []),
    linhas: [...document.querySelectorAll(".wk-item")].map((d) => `${d.querySelector("dt").textContent}=${d.querySelector("dd").textContent}`),
    nota: [...document.querySelectorAll(".wk-note")].map((n) => n.textContent).join(" | "),
    duelo: document.body.textContent.includes(""),
    crest: [...document.querySelectorAll(".crest")].map((c) => (c.querySelector("img") ? "img" : (c.querySelector(".crest-mono") || {}).textContent)),
  }));
  const temOpp = await page.evaluate((nome) => document.body.textContent.includes(nome), prep.opp);
  await page.goto(base + "/calendario", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".cal-comp", { timeout: 20000 });
  const cal = await page.evaluate(() => [...document.querySelectorAll(".cal-comp")].map((e) => e.textContent).filter((t) => /Copa/.test(t)).slice(0, 2));
  check("1) A Copa mostra a fase preliminar (96 clubes, jogo único) com o adversário, e o calendário lista o jogo único:",
    prep.participantes === 96 && prep.fase === "prelim" && temOpp && c1.linhas.some((l) => l.startsWith("Jogo=")) && !c1.linhas.some((l) => l.startsWith("Volta=")) && /Fase preliminar · Jogo único/.test(cal[0] || ""),
    JSON.stringify({ prep, c1, cal }));

  // 2) Rodada 1 inteira (com a perna da Copa ao vivo no pós-jogo).
  const r = await jogarRodadaV2(page);
  const s2 = await saveNoServidor(page);
  const tie = s2.cup.ties.prelim.find((t) => t.home === s2.clubId || t.away === s2.clubId);
  const ok2 = r.ok && tie.leg1.gh != null && tie.winner != null && (s2.cup.phase === "fase1") && (tie.winner === s2.clubId ? s2.cup.humanAlive : !s2.cup.humanAlive && s2.cup.humanEliminatedStage === "prelim");
  await page.goto(base + "/copa?fase=prelim", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".wk-item", { timeout: 20000 });
  const c2 = await page.evaluate(() => ({ titulo: document.querySelector("h1").textContent, notas: [...document.querySelectorAll(".wk-note")].map((n) => n.textContent).join(" | ") }));
  const frase = tie.winner === s2.clubId ? /Classificado/.test(c2.notas) : /Eliminado na fase preliminar/.test(c2.notas);
  check("2) A preliminar é decidida no jogo único e a Copa segue para a 1ª fase (classificado ou \"Eliminado na fase preliminar\"):", ok2 && frase,
    JSON.stringify({ passos: r.passos, tie, fase: s2.cup.phase, vivo: s2.cup.humanAlive, c2 }));

  // 3) Clube da D com nome e monograma.
  check("3) O clube da Série D aparece com nome e monograma (sem escudo quebrado):", temOpp && c1.crest.length > 0 && c1.crest.every((x) => x === "img" || (x && x.length === 3)), JSON.stringify(c1.crest));

  // 4) 360 px e erros.
  await page.setViewportSize({ width: 360, height: 780 });
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check("4) Sem erro na página e 360 px sem rolagem horizontal na Copa:", erros.length === 0 && ov <= 0, JSON.stringify({ erros: erros.slice(0, 3), ov }));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
