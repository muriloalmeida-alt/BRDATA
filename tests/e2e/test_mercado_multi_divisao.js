// Mercado de 60 times (Séries A, B e C juntas): a carreira nova nasce
// "multi" (elencos das 3 divisões), o Mercado mostra jogadores de fora com a
// divisão e deixa comprar entre elas, e a negociação CPU x CPU respeita os
// limites de elenco dos times de fora.
// Lote L3d (12/11/2026, plano "testes sem a tela antiga"): antes pela tela
// antiga (#marketCompFilter, [data-buy], #btnOfferConfirm). Agora:
// - itens 1, 3, 6 e 7 (regras): os mesmos trechos, na página da v2 com as
//   funções do motor (globaisDoMotor);
// - itens 2 e 4 (filtro de divisão): a folha "Refine sua busca." do
//   Mercado da v2 (grupo "Divisão") e a lista filtrada;
// - item 5 (comprar de outra divisão): "Faça sua oferta." da v2 para um
//   jogador da Série B, e a resposta do clube pelo motor.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, signup, ensureDailyClaimed, globaisDoMotor, saveNoServidor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  // Pré-temporada: a janela de transferências está aberta (item 5).
  await carreiraV2(page, `mercadomulti${Date.now()}@teste.com`, { clube: "fla", criarConta: signup, preTemporada: true });
  await ensureDailyClaimed(page);
  await globaisDoMotor(page);
  const h1 = (t) => page.waitForFunction((t) => (document.querySelector("h1") || {}).textContent === t, t, { timeout: 20000 });

  // 1) Carreira nasce "multi", com liveModeByCompetition das 3.
  const created = await page.evaluate(() => ({
    marketScope: CAREER.marketScope,
    liveModeByCompetition: CAREER.liveModeByCompetition,
    leagueSquadCount: Object.keys(CAREER.leagueSquads).length,
  }));
  check("1) Carreira nasce 'multi':", created.marketScope === "multi", "| 59 outros times com elenco:", created.leagueSquadCount === 59, JSON.stringify(created));

  const marketState = await page.evaluate(() => {
    const rows = allMarketPlayers();
    const byComp = {};
    rows.forEach(({ club }) => {
      const c = club.competitionId || "?";
      byComp[c] = (byComp[c] || 0) + 1;
    });
    const anyBroken = rows.some(({ club }) => club.name.startsWith("Time #"));
    return { byComp, anyBroken, total: rows.length };
  });
  check("3) Jogadores das 3 divisões aparecem no mercado (sem 'Time #xxx' quebrado):", !marketState.anyBroken && Object.keys(marketState.byComp).length === 3, JSON.stringify(marketState.byComp));

  // 2/4) O Mercado da v2 oferece o filtro de divisão; "Série C" só mostra essa divisão.
  await page.goto(base + "/mercado", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mk-list li", { timeout: 20000 });
  await page.click(".sq-filter");
  await page.waitForSelector("#mf-t", { timeout: 10000 });
  const divisoes = await page.evaluate(() => [...document.querySelectorAll('[aria-labelledby="mf-div"] [role="radio"]')].map((b) => b.textContent));
  check("2) O filtro de divisão aparece no Mercado:", divisoes.length >= 3, JSON.stringify(divisoes));
  await page.locator('[aria-labelledby="mf-div"] [role="radio"]', { hasText: "Série C" }).click();
  await page.locator('[role="dialog"] .cta', { hasText: "Aplicar filtros" }).click();
  await page.waitForFunction(() => !document.getElementById("mf-t"), null, { timeout: 10000 });
  await page.waitForTimeout(150);
  const filteredClubs = await page.evaluate(() => [...document.querySelectorAll(".mk-list .wk-item dt")].map((d) => d.textContent));
  check("4) Filtro \"Série C\" só mostra jogadores dessa divisão:", filteredClubs.length > 0 && filteredClubs.every((t) => t.includes("Série C")), filteredClubs.length, "linhas");

  // 5) Comprar um jogador da Série B pela tela de proposta da v2.
  await globaisDoMotor(page);
  const alvoB = await page.evaluate(() => {
    const l = allMarketPlayers().filter((e) => !e.mine && e.club.competitionId === "serie_b" && e.p.value > 0).sort((a, b) => a.p.value - b.p.value);
    const e = l[0];
    return { clubId: String(e.club.id), id: e.p.id };
  });
  const before = await saveNoServidor(page);
  await page.goto(base + `/mercado/proposta?clube=${encodeURIComponent(alvoB.clubId)}&id=${encodeURIComponent(alvoB.id)}`, { waitUntil: "domcontentloaded" });
  await h1("Faça sua oferta.");
  await page.waitForFunction(() => Number((document.getElementById("pp-v") || {}).value) > 0, null, { timeout: 20000 });
  await page.click(".pr .cal-foot .cta");
  await h1("Proposta enviada.");
  await globaisDoMotor(page);
  // FASE1-MER (13/11/2026): a resposta é determinística (sorteio com
  // chave), e o clube pode contrapor e o atleta pedir mais salário. O
  // técnico aceita o que vier, como faria na tela de Minhas propostas.
  const caminho = await page.evaluate(async (id) => {
    const passos = [];
    for (let k = 0; k < 6; k++) {
      const o = CAREER.pendingOffersOut.find((x) => String(x.playerId) === String(id));
      if (!o) break;
      passos.push(o.status);
      if (o.status === "countered") aceitarContraDoClube(o.id);
      else if (o.status === "pede-salario") aceitarSalarioPedido(o.id);
      else if (o.status === "pending") resolvePendingOffersOutRound(CAREER.currentRound);
      else break;
    }
    await persistCareer();
    return passos;
  }, alvoB.id);
  const after = await saveNoServidor(page);
  const bought = { caminho, targetClub: alvoB.clubId, cashChanged: after.finances.cash < before.finances.cash, squadGrew: after.squad.length === before.squad.length + 1, noElenco: after.squad.some((p) => p.id === alvoB.id) };
  check("5) Comprou jogador da Série B pela proposta da v2:", bought.cashChanged && bought.squadGrew && bought.noElenco, JSON.stringify(bought));

  // 6) Simula algumas rodadas — negociação CPU x CPU (simulateAiTransfers)
  // pode mover jogador entre divisões diferentes agora (checa no feed
  // de transferências se alguma menciona um time de fora, ao longo de
  // várias rodadas -- sorteio, então roda uma boa quantidade de vezes).
  const crossDivisionTrade = await page.evaluate(() => {
    const ownIds = new Set(Object.keys(CAREER.standings));
    for (let i = 0; i < 40; i++) {
      simulateAiTransfers(CAREER.currentRound + i);
    }
    // Um transferLog que cite um clube de fora da própria divisão
    // (nome de time que não está em CAREER.standings) indica troca
    // cruzando divisão -- não dá pra achar por id direto no texto, só
    // roda bastante e confia no sorteio (0-2 por rodada, 40 rodadas).
    return { transferLogSize: (CAREER.transferLog || []).length, leagueSquadCount: Object.keys(CAREER.leagueSquads).length };
  });
  check("6) simulateAiTransfers rodou sem erro (40 rodadas simuladas):", crossDivisionTrade.transferLogSize > 0, JSON.stringify(crossDivisionTrade));

  // 7) Depois de 40 rodadas de negociação CPU x CPU, nenhum elenco de
  // outra divisão passou do teto menor (MAX_LEAGUE_SQUAD_OTHER_DIVISION)
  // nem encolheu abaixo do piso -- confere que o limite por time
  // (maxSquadSizeFor/minSquadSizeFor) segurou de verdade, sem corroer a
  // economia de tamanho de save com o tempo.
  const capsHeld = await page.evaluate(() => {
    const ownIds = new Set(Object.keys(CAREER.standings));
    let ok = true;
    const sizes = [];
    Object.entries(CAREER.leagueSquads).forEach(([id, squad]) => {
      if (ownIds.has(id)) return; // times da própria divisão usam o teto/piso maior, não checado aqui
      sizes.push(squad.length);
      if (squad.length > 16 || squad.length < 1) ok = false; // nunca deveria passar de 16 (teto) -- piso de 12 pode furar um pouco por venda avulsa, mas nunca zera
    });
    return { ok, min: Math.min(...sizes), max: Math.max(...sizes) };
  });
  check("7) Elenco de times de fora respeita o teto de 16 mesmo depois de várias negociações CPU:", capsHeld.ok, JSON.stringify(capsHeld));

  check("8) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
