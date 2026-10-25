// Nova feature (pedido do usuário: "mostrar a posição do atleta e
// incluir um botão recusar sugestão para que a janela feche e o
// atleta seja excluído da lista de olheiros") — "Indicações dos
// olheiros": lista de jogadores de outros clubes com espaço real de
// crescimento, buscada sob demanda (botão "Buscar indicações"),
// aceitar abre a proposta real do Mercado, recusar só tira da lista.
// Ver searchScoutSuggestions/acceptScoutSuggestion/rejectScoutSuggestion
// em carreira.js.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { enterGame } = require("./_startup");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";
  const email = `olheiros${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Olheiros Teste", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });
  await page.goto(base + "/carreira.html", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForTimeout(300);
  await page.click(".m3-club-row");
  await page.waitForTimeout(150);
  await page.click("#btnConfirmClub");
  await enterGame(page);
  await page.click(".m3-nav-item[data-panel='mercado']");
  await page.waitForTimeout(300);
  await page.evaluate(() => { CAREER.finances.wageCap = 999999999; CAREER.finances.cash = 999999999; });

  // GE-SCOUT-001 — indicações vêm de olheiro contratado em missão
  // Profissional (não mais de uma busca automática com cooldown).
  // 1) Sem olheiro: a tela explica e o botão leva pra contratar.
  await page.click("#btnOpenScoutSuggestions");
  await page.waitForTimeout(200);
  const check1 = await page.evaluate(() => ({
    open: document.getElementById("scoutSuggestionsOverlay").classList.contains("open"),
    hint: document.getElementById("scoutSuggestionsHint").textContent,
    btn: document.getElementById("btnScoutSearch").textContent,
  }));
  await page.click("#btnScoutSearch");
  await page.waitForTimeout(300);
  const check1b = await page.evaluate(() => ({
    marketOpen: document.getElementById("scoutMarketOverlay").classList.contains("open"),
    suggestions: (CAREER.scoutSuggestions || []).length,
  }));
  check("1) Sem olheiro contratado: sem indicação, e o botão leva pra contratar olheiro:",
    check1.open && /Sem olheiro/.test(check1.hint) && check1.btn === "Contratar olheiro" && check1b.marketOpen && check1b.suggestions === 0, JSON.stringify({ ...check1, ...check1b }));

  // 2) Contrata o olheiro-chefe, manda em missão Profissional (longa)
  // pela própria tela de indicações e espera ele voltar.
  await page.click('#scoutMarketList [data-hire="t_lacerda"]');
  await page.waitForTimeout(200);
  await page.evaluate(() => closeScoutMarketScreen());
  await page.click("#btnOpenScoutSuggestions");
  await page.waitForTimeout(200);
  await page.click("#btnScoutSearch");
  await page.waitForTimeout(300);
  const typePreselected = await page.evaluate(() => MISSION_FORM.type);
  await page.click("#missionScoutList [data-pickscout]");
  await page.waitForTimeout(150);
  await page.click('[data-mission-duration="longa"]');
  await page.waitForTimeout(150);
  await page.click("#missionRegionRow [data-mission-region]");
  await page.waitForTimeout(150);
  await page.click("#btnMissionStart");
  await page.waitForTimeout(200);
  const mission = await page.evaluate(() => (CAREER.scouts[0] || {}).mission);
  await page.evaluate(() => { for (let r = 0; r < 6; r++) tickScoutMissions(CAREER.currentRound); });
  await page.click("#btnOpenScoutSuggestions");
  await page.waitForTimeout(200);
  const check2 = await page.evaluate(() => {
    const suggestions = CAREER.scoutSuggestions || [];
    const rows = [...document.querySelectorAll("#scoutSuggestionsList .mt-sponsor-proposal-row")];
    return {
      suggestionCount: suggestions.length,
      allHaveReport: suggestions.every((s) => s.report && s.report.recommendation && s.potLo != null && s.potHi >= s.potLo),
      noExactPotentialField: suggestions.every((s) => s.potential === undefined),
      rowCount: rows.length,
      firstRowHasPosChip: !!rows[0]?.querySelector(".mt-pos-chip"),
      firstRowText: rows[0]?.textContent.replace(/\s+/g, " ").trim().slice(0, 160),
    };
  });
  check("2) Missão Profissional do olheiro traz indicações com POSIÇÃO, faixa de potencial e relatório:",
    typePreselected === "pro" && mission && mission.type === "pro" && mission.duration === "longa"
    && check2.suggestionCount > 0 && check2.allHaveReport && check2.noExactPotentialField
    && check2.rowCount === check2.suggestionCount && check2.firstRowHasPosChip, JSON.stringify({ typePreselected, mission, ...check2 }));

  // 3) Catálogo é só nacional (nada de internacional/sul-americano).
  const check3 = await page.evaluate(() => SCOUT_MARKET.every((c) => c.regionScope === "any" || c.regionScope.every((r) => REGION_LABEL[r]))
    && !SCOUT_MARKET.some((c) => /internacional|sul-americ/i.test(c.specialty)));
  check("3) Catálogo de olheiros só nacional:", check3);

  // 4) "Recusar" tira SÓ aquele jogador da lista (a janela continua
  // aberta, só o item some).
  const firstId = await page.evaluate(() => CAREER.scoutSuggestions[0].id);
  const countBefore4 = await page.evaluate(() => CAREER.scoutSuggestions.length);
  await page.click(`[data-rejectscout="${firstId}"]`);
  await page.waitForTimeout(200);
  const check4 = await page.evaluate((firstId) => ({
    stillOpen: document.getElementById("scoutSuggestionsOverlay").classList.contains("open"),
    gone: !CAREER.scoutSuggestions.some((s) => s.id === firstId),
    countAfter: CAREER.scoutSuggestions.length,
  }), firstId);
  check("4) 'Recusar' tira só aquele jogador da lista, sem fechar a tela:",
    check4.stillOpen && check4.gone && check4.countAfter === countBefore4 - 1, JSON.stringify(check4));

  // 5) "Aceitar" abre a MESMA proposta real do Mercado (openOfferModal)
  // pro jogador certo, tira da lista de olheiros e fecha a tela de
  // indicações (sem comprar na hora).
  const secondId = await page.evaluate(() => CAREER.scoutSuggestions[0]?.id);
  const secondSuggestion = await page.evaluate((id) => CAREER.scoutSuggestions.find((s) => s.id === id), secondId);
  await page.click(`[data-acceptscout="${secondId}"]`);
  await page.waitForTimeout(300);
  const check5 = await page.evaluate(({ id, playerId, clubId }) => ({
    scoutOverlayClosed: !document.getElementById("scoutSuggestionsOverlay").classList.contains("open"),
    offerOpen: !!document.getElementById("btnOfferConfirm"),
    offerCtxMatches: OFFER_CTX && String(OFFER_CTX.playerId) === String(playerId) && String(OFFER_CTX.clubId) === String(clubId),
    removedFromScoutList: !CAREER.scoutSuggestions.some((s) => s.id === id),
  }), { id: secondId, playerId: secondSuggestion.playerId, clubId: secondSuggestion.clubId });
  check("5) 'Propor' abre a proposta real do jogador certo (sem comprar na hora), some da lista de olheiros:",
    check5.scoutOverlayClosed && check5.offerOpen && check5.offerCtxMatches && check5.removedFromScoutList, JSON.stringify(check5));
  await page.evaluate(() => closeOfferModal()); // proposta virou diálogo M3 (sem #offerClose)
  await page.waitForTimeout(200);

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
