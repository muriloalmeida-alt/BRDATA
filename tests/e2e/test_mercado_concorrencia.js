// Proposta concorrente (rival) numa compra: nasce uma vez, aparece na
// negociação com a comparação e a análise, "aumentar" sugere o valor do
// rival, e a disputa é resolvida pelo peso das propostas.
// Lote L3c (12/11/2026, plano "testes sem a tela antiga"):
// - itens 1, 2, 6 e 7 (regras): os mesmos trechos, na página da v2 com as
//   funções do motor (globaisDoMotor);
// - itens 3, 4 e 5 (telas "Minhas propostas", "Comparar propostas" e o
//   aumentar da comparação, da tela antiga): pelas telas da v2 — o selo
//   "Concorrência" em "Minhas propostas"; a negociação com a seção
//   "Proposta concorrente" e a análise; "Aumentar proposta" sugerindo o
//   valor do concorrente.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, signup, ensureDailyClaimed, globaisDoMotor, saveNoServidor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  // Pré-temporada: a janela de transferências está aberta.
  await carreiraV2(page, `concorrencia${Date.now()}@teste.com`, { clube: "fla", criarConta: signup, preTemporada: true });
  await ensureDailyClaimed(page);
  await globaisDoMotor(page);
  const alvo = () => page.evaluate(() => {
    const pend = new Set((CAREER.pendingOffersOut || []).map((o) => String(o.playerId)));
    const l = allMarketPlayers().filter((e) => !e.mine && !pend.has(String(e.p.id)) && e.p.value > 0).sort((a, b) => a.p.value - b.p.value);
    const e = l[Math.floor(l.length / 2)];
    return { clubId: String(e.club.id), playerId: e.p.id };
  });
  const h1 = (t) => page.waitForFunction((t) => (document.querySelector("h1") || {}).textContent === t, t, { timeout: 20000 });

  // 1) Um concorrente NASCE (RNG forçado dentro da chance) numa
  // proposta pendente sem concorrente ainda.
  const target = await alvo();
  const check1 = await page.evaluate((t) => {
    const p = leagueSquadFor(t.clubId).find((x) => x.id === t.playerId);
    CAREER.pendingOffersOut.push({
      id: "test_rival_spawn", playerId: p.id, playerName: p.name, clubId: t.clubId, clubName: teamById(t.clubId).name,
      marketValue: p.value, offerValue: Math.round(p.value * 0.8), installments: 1,
      roundsLeft: 3, status: "pending", counterValue: null, rivalOffer: null,
    });
    const o = CAREER.pendingOffersOut.find((x) => x.id === "test_rival_spawn");
    const orig = Math.random;
    Math.random = () => 0.01; // garante nascer (< RIVAL_OFFER_CHANCE_PER_ROUND) e o resto dos sorteios internos também caem em valores baixos
    maybeSpawnRivalOffer(o);
    Math.random = orig;
    return { hasRival: !!o.rivalOffer, rival: o.rivalOffer };
  }, target);
  check("1) Concorrente nasce numa proposta pendente (RNG dentro da chance):", check1.hasRival && !!check1.rival?.clubName && check1.rival?.offerValue > 0, JSON.stringify(check1));

  // 2) Nunca nasce um 2º concorrente pra mesma proposta (já tem um).
  const check2 = await page.evaluate(() => {
    const o = CAREER.pendingOffersOut.find((x) => x.id === "test_rival_spawn");
    const firstRivalClub = o.rivalOffer.clubName;
    const orig = Math.random;
    Math.random = () => 0.01;
    maybeSpawnRivalOffer(o);
    Math.random = orig;
    return { sameRival: o.rivalOffer.clubName === firstRivalClub };
  });
  check("2) Não nasce um 2º concorrente pra mesma proposta:", check2.sameRival, JSON.stringify(check2));

  // A proposta com o concorrente vai para o save (as telas leem do servidor).
  await page.evaluate(() => persistCareer());

  // 3) "Minhas propostas": a proposta com o selo "Concorrência".
  await page.goto(base + "/mercado/propostas", { waitUntil: "domcontentloaded" });
  await h1("Suas negociações.");
  const linha = await page.evaluate(() => [...document.querySelectorAll(".wk-sec a.pr-row")].map((a) => ({ href: a.getAttribute("href"), text: a.textContent })).find((r) => r.href.includes("test_rival_spawn")) || null);
  check("3) \"Minhas propostas\" mostra a proposta com o selo \"Concorrência\":", !!linha && linha.text.includes("Concorrência"), JSON.stringify(linha));

  // 4) A negociação compara as duas propostas, com a análise.
  const rival = await page.evaluate(async () => { const c = (await (await fetch("/api/career", { cache: "no-store" })).json()).career; return c.pendingOffersOut.find((x) => x.id === "test_rival_spawn").rivalOffer; });
  await page.goto(base + "/mercado/negociacao?id=test_rival_spawn", { waitUntil: "domcontentloaded" });
  await h1("A negociação continua.");
  await page.waitForSelector("#ng-r", { timeout: 20000 });
  const check4 = await page.evaluate(() => {
    const sec = document.getElementById("ng-r").closest("section");
    return { minha: !!document.getElementById("ng-m"), rivalTexto: sec.textContent, analise: (sec.querySelector(".wk-note") || {}).textContent || "" };
  });
  check("4) A negociação mostra a sua proposta e a \"Proposta concorrente\" (clube do rival) com uma análise:",
    check4.minha && check4.rivalTexto.includes(rival.clubName) && check4.analise.length > 20, JSON.stringify(check4));

  // 5) "Aumentar proposta" sugere o valor do concorrente; enviar grava.
  await page.locator("button.pr-row", { hasText: "Aumentar proposta" }).click();
  await page.waitForSelector("#rs-v", { timeout: 10000 });
  const sugerido = Number(await page.inputValue("#rs-v"));
  await page.click('[role="dialog"] .sp-sheet-cta');
  await page.waitForSelector(".pr-ok", { timeout: 30000 });
  const o5 = (await saveNoServidor(page)).pendingOffersOut.find((x) => x.id === "test_rival_spawn");
  check("5) \"Aumentar proposta\" sugere o valor do concorrente e a proposta sobe para ele:",
    sugerido >= rival.offerValue && o5.offerValue >= rival.offerValue, JSON.stringify({ sugerido, rival: rival.offerValue, nova: o5.offerValue }));
  await globaisDoMotor(page);

  // 6) Resolução COM concorrente: minha proposta "pesa mais" (valor
  // maior, mesmas parcelas) -- RNG forçado pra dentro da faixa de
  // vitória (80%) -- fecha o negócio de verdade.
  const target2 = await alvo();
  const check6 = await page.evaluate((t) => {
    const p = leagueSquadFor(t.clubId).find((x) => x.id === t.playerId);
    CAREER.finances.wageCap = 999999999; CAREER.finances.cash = 999999999;
    CAREER.pendingOffersOut.push({
      id: "test_rival_win", playerId: p.id, playerName: p.name, clubId: t.clubId, clubName: teamById(t.clubId).name,
      marketValue: p.value, offerValue: p.value, installments: 1, roundsLeft: 1, status: "pending", counterValue: null,
      rivalOffer: { clubId: "xxx", clubName: "Rival FC", offerValue: Math.round(p.value * 0.9), installments: 1 },
    });
    // FASE1-MER (13/11/2026): a disputa usa o sorteio com chave da oferta
    // (não mais Math.random). Escolhe um id cujo sorteio cai dentro dos 80%.
    // As outras propostas saem da lista para não resolverem junto.
    CAREER.pendingOffersOut = CAREER.pendingOffersOut.filter((x) => x.id === "test_rival_win");
    sorteioNaFaixa(CAREER.pendingOffersOut[0], CAREER.currentRound, (v) => v < 0.8);
    resolvePendingOffersOutRound(CAREER.currentRound);
    return { inSquad: !!CAREER.squad.find((x) => x.id === t.playerId), stillPending: CAREER.pendingOffersOut.length > 0 };
  }, target2);
  check("6) Minha proposta pesa mais que a do concorrente e vence (RNG dentro dos 80%):",
    check6.inSquad && !check6.stillPending, JSON.stringify(check6));

  // 7) Resolução COM concorrente: minha proposta pesa MENOS -- RNG
  // forçado pra fora dos 25% de chance -- perco a disputa, sem entrar
  // no elenco nem gastar nada.
  const target3 = await alvo();
  const check7 = await page.evaluate((t) => {
    const p = leagueSquadFor(t.clubId).find((x) => x.id === t.playerId);
    const cashBefore = CAREER.finances.cash;
    CAREER.pendingOffersOut.push({
      id: "test_rival_lose", playerId: p.id, playerName: p.name, clubId: t.clubId, clubName: teamById(t.clubId).name,
      marketValue: p.value, offerValue: Math.round(p.value * 0.85), installments: 1, roundsLeft: 1, status: "pending", counterValue: null,
      rivalOffer: { clubId: "yyy", clubName: "Concorrente United", offerValue: p.value, installments: 1 },
    });
    // Sorteio com chave fora dos 25% de chance (minha oferta < rival).
    CAREER.pendingOffersOut = CAREER.pendingOffersOut.filter((x) => x.id === "test_rival_lose");
    sorteioNaFaixa(CAREER.pendingOffersOut[0], CAREER.currentRound, (v) => v >= 0.25);
    resolvePendingOffersOutRound(CAREER.currentRound);
    return {
      cashUnchanged: CAREER.finances.cash === cashBefore,
      notInMySquad: !CAREER.squad.find((x) => x.id === t.playerId),
      stillPending: CAREER.pendingOffersOut.length > 0,
    };
  }, target3);
  check("7) Minha proposta pesa menos e perco a disputa (RNG fora dos 25%), sem afetar meu caixa/elenco:",
    check7.cashUnchanged && check7.notInMySquad && !check7.stillPending, JSON.stringify(check7));

  check("8) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
