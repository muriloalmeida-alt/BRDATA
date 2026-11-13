// Negociação de compra: a proposta demora rodadas, pode ser retirada,
// aceita (com parcelamento real), recusada ou virar contraproposta.
// Lote L3c (12/11/2026, plano "testes sem a tela antiga"):
// - itens 1, 2, 3 e 4 (tela de proposta, "Minhas propostas", retirar): pelas
//   telas de mercado da v2 ("Faça sua oferta.", Mercado). O resto do fluxo
//   de tela (aumentar, contraproposta mostrada e aceita com a confirmação,
//   desistir com confirmação) já é do test_v2_mercado (itens 2, 3 e 4);
// - itens 5 a 7c (regras): os mesmos trechos, na página da v2 com as
//   funções do motor (globaisDoMotor). O 7b (contraproposta com botão de
//   aceitar em "Minhas propostas") é o item 3 do test_v2_mercado.
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
  await carreiraV2(page, `mercadoneg${Date.now()}@teste.com`, { clube: "fla", criarConta: signup, preTemporada: true });
  await ensureDailyClaimed(page);
  await globaisDoMotor(page);
  // Um alvo comprável de outro clube, sem proposta (o 1º da lista antiga
  // era o mais valioso; aqui um de valor médio, para o caixa e o teto).
  const alvo = () => page.evaluate(() => {
    const pend = new Set((CAREER.pendingOffersOut || []).map((o) => String(o.playerId)));
    const l = allMarketPlayers().filter((e) => !e.mine && !pend.has(String(e.p.id)) && e.p.value > 0).sort((a, b) => a.p.value - b.p.value);
    const e = l[Math.floor(l.length / 2)];
    return { clubId: String(e.club.id), playerId: e.p.id, name: e.p.name };
  });
  const h1 = (t) => page.waitForFunction((t) => (document.querySelector("h1") || {}).textContent === t, t, { timeout: 20000 });

  // 1) "Fazer proposta" abre a oferta com o valor sugerido preenchido.
  const t1 = await alvo();
  await page.goto(base + `/mercado/proposta?clube=${encodeURIComponent(t1.clubId)}&id=${encodeURIComponent(t1.playerId)}`, { waitUntil: "domcontentloaded" });
  await h1("Faça sua oferta.");
  await page.waitForFunction(() => Number((document.getElementById("pp-v") || {}).value) > 0, null, { timeout: 20000 });
  const sugerido = Number(await page.inputValue("#pp-v"));
  check("1) A proposta abre com o valor sugerido preenchido:", sugerido > 0, sugerido);

  // 2) 70% em 2x: vira proposta pendente; o caixa não muda.
  const cashBefore = (await saveNoServidor(page)).finances.cash;
  await page.fill("#pp-v", String(Math.round(sugerido * 0.7)));
  await page.locator('[aria-labelledby="pp-n"] .pr-seg-btn', { hasText: "2x" }).click();
  await page.click(".pr .cal-foot .cta");
  await h1("Proposta enviada.");
  let career = await saveNoServidor(page);
  const o2 = (career.pendingOffersOut || []).find((x) => String(x.playerId) === String(t1.playerId));
  check("2) Propor 70% em 2x cria a proposta pendente e o caixa não muda:",
    !!o2 && o2.installments === 2 && o2.status === "pending" && career.finances.cash === cashBefore, JSON.stringify({ o2, cash: [cashBefore, career.finances.cash] }));

  // 3) Mercado: "Minhas propostas" com 1 e o jogador marcado.
  const mercado = async () => {
    await page.goto(base + "/mercado", { waitUntil: "domcontentloaded" });
    await h1("Busque seu reforço.");
    await page.fill("#mk-q", t1.name);
    await page.waitForTimeout(300);
    return page.evaluate(() => ({
      minhas: [...document.querySelectorAll("nav .row")].map((r) => r.textContent).find((t) => t.startsWith("Minhas propostas")) || "",
      marcado: [...document.querySelectorAll(".mk-list .row-sub")].some((s) => s.textContent.includes("proposta enviada")),
    }));
  };
  const m3 = await mercado();
  check("3) No Mercado, \"Minhas propostas\" mostra 1 e o jogador aparece com \"proposta enviada\":", m3.minhas === "Minhas propostas1" && m3.marcado, JSON.stringify(m3));

  // 4) Retirar a proposta (o mesmo withdrawOffer do "Desistir"): some do
  // save e da marca na lista.
  await globaisDoMotor(page);
  await page.evaluate(async (id) => { withdrawOffer(id); await persistCareer(); }, o2.id);
  career = await saveNoServidor(page);
  const m4 = await mercado();
  check("4) Retirar a proposta tira do save e a lista volta ao normal:",
    !(career.pendingOffersOut || []).some((x) => x.id === o2.id) && !m4.marcado && m4.minhas === "Minhas propostas", JSON.stringify(m4));
  await globaisDoMotor(page);

  // 5) Proposta ACEITA (ratio 1.0, RNG forçado pra dentro da faixa de
  // aceite alta) -- parcelada em 3x: jogador entra no elenco, cash
  // desconta só a 1ª parcela, o resto vai pra pendingInstallments.
  const target = await alvo();
  const check5 = await page.evaluate((t) => {
    const p = leagueSquadFor(t.clubId).find((x) => x.id === t.playerId);
    const cashBefore = CAREER.finances.cash;
    CAREER.pendingOffersOut.push({
      id: "test_offer_accept", playerId: p.id, playerName: p.name, clubId: t.clubId, clubName: teamById(t.clubId).name,
      marketValue: p.value, offerValue: p.value, installments: 3, roundsLeft: 1, status: "pending", counterValue: null,
    });
    // FASE1-MER (13/11/2026): a resposta vem do sorteio com chave da oferta.
    // Escolhe um id em que o 1º sorteio não traz concorrente e o 2º cai na
    // faixa de aceite (ratio 1.0: 85% de chance).
    sorteioNaFaixa(CAREER.pendingOffersOut.find((x) => x.id === "test_offer_accept"), CAREER.currentRound, (v, rng) => v >= RIVAL_OFFER_CHANCE_PER_ROUND && rng() < 0.85);
    resolvePendingOffersOutRound(CAREER.currentRound);
    const perInstallment = Math.round(p.value / 3 / 1000) * 1000;
    return {
      inSquad: !!CAREER.squad.find((x) => x.id === p.id),
      cashDelta: cashBefore - CAREER.finances.cash,
      expectedFirst: perInstallment,
      installmentsLeft: CAREER.pendingInstallments.filter((i) => i.label.includes(p.name)).length,
      installmentsAmount: CAREER.pendingInstallments.find((i) => i.label.includes(p.name))?.perRoundAmount,
      installmentsRoundsLeft: CAREER.pendingInstallments.find((i) => i.label.includes(p.name))?.roundsLeft,
      stillPending: CAREER.pendingOffersOut.some((x) => String(x.playerId) === String(p.id)),
    };
  }, target);
  check("5) Proposta aceita (ratio 1.0) entra no elenco, cobra só a 1ª de 3 parcelas, agenda as outras 2:",
    check5.inSquad && check5.cashDelta === check5.expectedFirst && check5.installmentsLeft === 1
    && check5.installmentsAmount === check5.expectedFirst && check5.installmentsRoundsLeft === 2 && !check5.stillPending,
    JSON.stringify(check5));

  // 5b) As parcelas restantes descontam o caixa a cada rodada
  // simulada (ver processPendingInstallments/finishRoundTail) até
  // quitar -- 2 chamadas diretas (evita depender do fluxo de partida
  // completo só pra isso).
  const check5b = await page.evaluate(() => {
    const before = CAREER.finances.cash;
    const paid1 = processPendingInstallments();
    const mid = CAREER.finances.cash;
    const paid2 = processPendingInstallments();
    const after = CAREER.finances.cash;
    return { before, mid, after, paid1, paid2, remaining: CAREER.pendingInstallments.length };
  });
  check("5b) Parcelas restantes descontam o caixa rodada a rodada e terminam quitadas:",
    check5b.before - check5b.mid === check5b.paid1 && check5b.mid - check5b.after === check5b.paid2
    && check5b.paid1 === check5b.paid2 && check5b.remaining === 0, JSON.stringify(check5b));

  // D. Souza tem overall >= 82 -- contratação "polêmica" (ver
  // finalizeIncomingPurchase) dispara uma coletiva de imprensa por
  // cima de tudo (mesmo clique defensivo já usado em outros testes
  // desta sessão pra esse mesmo modal).


  // 6) Proposta RECUSADA (ratio bem baixo, RNG forçado pra fora de
  // qualquer faixa de aceite/contraproposta) -- jogador continua no
  // elenco de origem, cash intocado.
  const target2 = await alvo();
  const check6 = await page.evaluate((t) => {
    const p = leagueSquadFor(t.clubId).find((x) => x.id === t.playerId);
    const cashBefore = CAREER.finances.cash;
    CAREER.pendingOffersOut.push({
      id: "test_offer_reject", playerId: p.id, playerName: p.name, clubId: t.clubId, clubName: teamById(t.clubId).name,
      marketValue: p.value, offerValue: Math.round(p.value * 0.5), installments: 1, roundsLeft: 1, status: "pending", counterValue: null,
    });
    resolvePendingOffersOutRound(CAREER.currentRound); // ratio 0.5 -- abaixo de 0.6, recusa direto, sem depender de RNG
    return {
      cashUnchanged: CAREER.finances.cash === cashBefore,
      stillInLeagueSquad: !!leagueSquadFor(t.clubId).find((x) => x.id === p.id),
      // FASE1-MER (13/11/2026): a recusa fica na lista, com o motivo, até
      // o técnico fazer outra proposta ou dispensar.
      recusa: (({ status, motivo, recusadoPor }) => ({ status, motivo, recusadoPor }))(CAREER.pendingOffersOut.find((x) => x.id === "test_offer_reject") || {}),
    };
  }, target2);
  check("6) Proposta muito abaixo do valor de mercado (50%) é recusada direto, sem afetar nada (fica na lista como recusada, com o motivo do clube):",
    check6.cashUnchanged && check6.stillInLeagueSquad && check6.recusa.status === "recusada" && check6.recusa.recusadoPor === "clube" && /\S/.test(check6.recusa.motivo || ""), JSON.stringify(check6));

  // 7) Contraproposta (ratio no meio-termo, RNG forçado pra cair
  // nessa faixa) -- vira status "countered", aceitar fecha na hora.
  const target3 = await alvo();
  const check7 = await page.evaluate((t) => {
    const p = leagueSquadFor(t.clubId).find((x) => x.id === t.playerId);
    // Fase 1.4 do mercado: o vendedor CPU decide pela proporção sobre a
    // RESERVA dele (calculateSellerReservationValue), não mais sobre o
    // valor de mercado — [0.75, 0.95) da reserva é contraproposta,
    // determinística (sellerNegotiationDecision). 85% da reserva cai no
    // meio dessa faixa, sem depender de RNG.
    const reservation = calculateSellerReservationValue(p, t.clubId, { baseValue: p.value });
    CAREER.pendingOffersOut.push({
      id: "test_offer_counter", playerId: p.id, playerName: p.name, clubId: t.clubId, clubName: teamById(t.clubId).name,
      marketValue: p.value, offerValue: Math.round(reservation * 0.85), installments: 1, roundsLeft: 1, status: "pending", counterValue: null,
    });
    resolvePendingOffersOutRound(CAREER.currentRound);
    const o = CAREER.pendingOffersOut.find((x) => x.id === "test_offer_counter");
    return { countered: !!o && o.status === "countered", counterValue: o?.counterValue, offerValue: o?.offerValue, reservation, marketValue: p.value };
  }, target3);
  check("7) Proposta no meio-termo (85% da reserva do vendedor) vira contraproposta (não recusa nem aceita direto):",
    check7.countered && check7.counterValue > check7.offerValue && check7.counterValue <= check7.reservation * 1.05, JSON.stringify(check7));

  // Passos anteriores já compraram/parcelaram um craque nesta mesma
  // carreira de teste, deixando pouca (ou nenhuma) folga real de teto
  // salarial/caixa -- sobe os dois só pra este check isolar de verdade
  // o mecanismo de "aceitar contraproposta fecha na hora", sem
  // depender de quanto sobrou dos passos anteriores (a trava de
  // teto/caixa em si já é a MESMA de sempre, ver finalizeIncomingPurchase/
  // buyPlayer, não é o que este check quer provar).
  await page.evaluate(() => { CAREER.finances.wageCap = 999999999; CAREER.finances.cash = 999999999; });
  const check7c = await page.evaluate((t) => {
    const cashBefore = CAREER.finances.cash;
    const counterValue = CAREER.pendingOffersOut.find((x) => x.id === "test_offer_counter").counterValue;
    acceptCounterOffer("test_offer_counter");
    return {
      cashDelta: cashBefore - CAREER.finances.cash,
      counterValue,
      inSquad: !!CAREER.squad.find((x) => x.id === t.playerId),
      stillPending: !!CAREER.pendingOffersOut.find((x) => x.id === "test_offer_counter"),
    };
  }, target3);
  check("7c) Aceitar a contraproposta fecha na hora, cobrando o valor pedido pelo clube:",
    check7c.cashDelta === check7c.counterValue && check7c.inSquad && !check7c.stillPending, JSON.stringify(check7c));

  check("8) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
