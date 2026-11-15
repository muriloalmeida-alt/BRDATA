// EMPRESTIMO-DISPONIVEL (15/11): "Disponível para empréstimo" e o filtro no
// Mercado da v2.
//  1) Filtro "Disponível para empréstimo": só jogadores da CPU que precisam de
//     minutos (reserva no clube, posição coberta), com a marca na linha,
//     jovens até 23 anos primeiro.
//  2) Pedido de um disponível que seria titular ou rotação no seu time: a
//     tela avisa da disponibilidade e o clube aceita a 50% do salário.
//  3) Disponível que ficaria reserva no seu time: recusado com o motivo.
//  4) Seu jogador: o interruptor da ficha marca "Disponível para empréstimo".
//  5) Na janela chegam propostas (até 2, de clubes em que ele seria titular
//     ou rotação); o Mercado mostra o número; recusar descarta uma.
//  6) Aceitar empresta: o jogador vai para o clube, a taxa entra no caixa,
//     a marca e as outras propostas saem.
//  7) Fora da janela as propostas caem e nenhuma chega; tirar a marca
//     descarta as propostas.
//  8) 360 px sem rolagem horizontal e alvos ≥ 44 px.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, noMotor, saveNoServidor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  // Pré-temporada: a janela de transferências está aberta (fase do calendário).
  await carreiraV2(page, `empdisp${Date.now()}@teste.com`, { preTemporada: true });
  // Teto folgado: o teste mede a disponibilidade, não o teto salarial.
  await noMotor(page, (M) => { M.CAREER.finances.wageCap = 1e9; return M.persistir(); });
  const sizes = {};
  const at360 = async (k) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.waitForTimeout(150);
    sizes[k] = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth,
      small: [...document.querySelectorAll(".wk a, .wk button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className) }));
    await page.setViewportSize({ width: 390, height: 844 });
  };

  // Disponíveis pela regra do motor e o papel de cada um no seu time.
  const alvo = await noMotor(page, (M) => {
    const C = M.CAREER;
    const meus = C.squad.filter((x) => x.origin !== "base");
    const lista = [];
    Object.entries(C.leagueSquads).forEach(([cid, sq]) => sq.forEach((p) => {
      if (cid === String(C.clubId) || !M.mercado.precisaDeMinutos(p, sq)) return;
      lista.push({ clubId: cid, id: String(p.id), age: p.age, papel: M.mercado.papelNoElenco(p, [...meus, p]) });
    }));
    return { n: lista.length, joga: lista.find((x) => x.papel !== "reserva"), reserva: lista.find((x) => x.papel === "reserva"), ids: lista.map((x) => x.id) };
  });

  // 1) Filtro.
  await page.goto(base + "/mercado", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mk-list li", { timeout: 30000 });
  await page.click(".mk-tools .sq-filter");
  await page.waitForSelector("#mf-t");
  await page.click('[aria-labelledby="mf-loan"] [role="radio"]:has-text("Disponível para empréstimo")');
  await at360("filtro");
  await page.click('[role="dialog"] .cta');
  await page.waitForSelector("#mf-t", { state: "detached" });
  await page.click(".mk-more").catch(() => {});
  for (let k = 0; k < 20 && await page.$(".mk-more"); k++) await page.click(".mk-more");
  const l1 = await page.evaluate(() => ({ subs: [...document.querySelectorAll(".mk-list li .row-sub")].map((s) => s.textContent), filtros: document.querySelector(".mk-tools .sq-filter").textContent, count: document.querySelector(".sq-count").textContent }));
  const idades = l1.subs.map((s) => Number((s.match(/(\d+) anos/) || [])[1] || 99));
  const jovensAntes = idades.findIndex((a) => a > 23) < 0 || idades.slice(idades.findIndex((a) => a > 23)).every((a) => a > 23);
  await at360("mercado");
  check("1) Filtro 'Disponível para empréstimo': só os disponíveis da CPU, com a marca na linha, jovens até 23 primeiro:",
    alvo.n > 0 && l1.subs.length === alvo.n && l1.subs.every((s) => /disponível para empréstimo/.test(s)) && jovensAntes && /Filtros \(1\)/.test(l1.filtros),
    JSON.stringify({ n: alvo.n, linhas: l1.subs.length, filtros: l1.filtros, idades: idades.slice(0, 12) }));

  // 2) Pedido pela tela: aviso e aceite a 50%.
  await page.goto(base + `/mercado/emprestimo?clube=${encodeURIComponent(alvo.joga.clubId)}&id=${encodeURIComponent(alvo.joga.id)}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mk-hint", { timeout: 30000 });
  await page.waitForFunction(() => [...document.querySelectorAll(".mk-hint")].some((h) => /Disponível para empréstimo/.test(h.textContent)), null, { timeout: 15000 }).catch(() => {});
  const dica = await page.evaluate(() => [...document.querySelectorAll(".mk-hint")].map((h) => h.textContent).find((t) => /Disponível/.test(t)) || "");
  const pct = await page.evaluate(() => (document.querySelector('[aria-labelledby="ln-p"] [aria-checked="true"]') || {}).textContent);
  await page.click(".cal-foot .cta");
  await page.waitForFunction(() => /Empréstimo fechado/.test((document.querySelector("h1") || {}).textContent) || !!document.querySelector(".inline-error"), null, { timeout: 30000 });
  const t2 = await page.evaluate(() => ({ h1: document.querySelector("h1").textContent, erro: (document.querySelector(".inline-error") || {}).textContent || null }));
  const c2 = await saveNoServidor(page);
  check("2) Disponível que seria titular ou rotação no seu time: a tela avisa e o clube aceita a 50% do salário:",
    /Disponível para empréstimo/.test(dica) && pct === "50%" && t2.h1 === "Empréstimo fechado." && c2.squad.some((p) => String(p.id) === alvo.joga.id && p.origin === "loan"),
    JSON.stringify({ alvo: alvo.joga, dica, pct, t2 }));

  // 3) Disponível que ficaria reserva no seu time.
  const r3 = alvo.reserva ? await noMotor(page, (M, a) => M.ponte.pegarEmprestado(a.clubId, a.id, "temporada", 100, "nenhuma", 0), alvo.reserva) : null;
  check("3) Disponível que ficaria reserva no seu time: recusado, com o motivo (precisa de minutos):",
    !!r3 && r3.ok === false && /precisa de minutos/.test(r3.mensagem || ""), JSON.stringify({ reserva: alvo.reserva, r3 }));

  // 4) Seu jogador: interruptor na ficha. Escolhe quem seria titular ou
  // rotação em algum clube (e não é titular aqui).
  const meu = await noMotor(page, (M) => {
    const C = M.CAREER;
    const meus = C.squad.filter((x) => x.origin !== "base");
    const recusa = meus.find((p) => p.origin === "principal" && M.clube.isLoanOutRefused(p));
    for (const p of meus.slice().sort((a, b) => b.overall - a.overall)) {
      if (p.origin !== "principal" || M.clube.isLoanOutRefused(p)) continue;
      if (M.mercado.papelNoElenco(p, meus) === "titular") continue;
      const clubes = Object.entries(C.leagueSquads).filter(([cid, sq]) => cid !== String(C.clubId) && ["titular", "rotacao"].includes(M.mercado.papelNoElenco(p, [...sq, p])));
      if (clubes.length >= 2) return { id: String(p.id), name: p.name, recusa: recusa ? String(recusa.id) : null };
    }
    return null;
  });
  await page.goto(base + `/elenco/ficha?id=${encodeURIComponent(meu.id)}&tela=numeros`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".sp-loan-toggle", { timeout: 30000 });
  await at360("ficha");
  await page.click(".sp-loan-toggle");
  await page.waitForFunction(() => document.querySelector(".sp-loan-toggle").getAttribute("aria-checked") === "true", null, { timeout: 15000 });
  const c4 = await saveNoServidor(page);
  check("4) O interruptor da ficha marca o seu jogador como disponível para empréstimo:",
    c4.squad.find((p) => String(p.id) === meu.id).loanListed === true, JSON.stringify(meu));
  // 4b) Quem não aceita ser emprestado (a regra do "Emprestar") não pode ser marcado.
  let t4b = null;
  if (meu.recusa) {
    await page.goto(base + `/elenco/ficha?id=${encodeURIComponent(meu.recusa)}&tela=numeros`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".sp-loan-toggle", { timeout: 30000 });
    await page.click(".sp-loan-toggle");
    await page.waitForSelector(".inline-error", { timeout: 15000 });
    t4b = await page.evaluate(() => ({ erro: document.querySelector(".inline-error").textContent, on: document.querySelector(".sp-loan-toggle").getAttribute("aria-checked") }));
  }
  check("4b) Quem não aceita ser emprestado não pode ser marcado (mensagem e interruptor desligado):",
    !meu.recusa || (/não aceita ser emprestado/.test(t4b.erro) && t4b.on === "false"), JSON.stringify({ recusa: meu.recusa, t4b }));

  // 5) Propostas na janela: roda a regra da semana várias vezes, trocando
  // só o ano da chave do sorteio (calendarTurnKey = ano + semana), até
  // chegarem 2. A janela continua a da semana atual.
  const r5 = await noMotor(page, async (M) => {
    const C = M.CAREER;
    const ano0 = C.calendar.year;
    let semanas = 0;
    for (; semanas < 60 && (C.loanOffersIn || []).length < 2; semanas++) {
      C.calendar.year = ano0 + 1000 * (semanas + 1);
      M.semana.resolveLoanListingsRound();
    }
    C.calendar.year = ano0;
    const ofertas = JSON.parse(JSON.stringify(C.loanOffersIn || []));
    const clubesOk = ofertas.every((o) => ["titular", "rotacao"].includes(o.papel) && ["titular", "rotacao"].includes(M.mercado.papelNoElenco(C.squad.find((p) => String(p.id) === String(o.playerId)), [...C.leagueSquads[o.clubId], C.squad.find((p) => String(p.id) === String(o.playerId))])));
    // Mais semanas não passam de 2 propostas abertas.
    for (let k = 0; k < 10; k++) { C.calendar.year = ano0 + 100000 + k; M.semana.resolveLoanListingsRound(); }
    C.calendar.year = ano0;
    const depois = (C.loanOffersIn || []).length;
    await M.persistir();
    return { semanas, ofertas, clubesOk, depois };
  });
  await page.goto(base + "/mercado", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mk-list li", { timeout: 30000 });
  const nav = await page.evaluate(() => [...document.querySelectorAll(".row")].map((r) => r.textContent).find((t) => /Meus jogadores para empréstimo/.test(t)) || "");
  await page.goto(base + "/mercado/emprestimos", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mk-loan-offer", { timeout: 30000 });
  await at360("propostas");
  const antes5 = await page.locator(".mk-loan-offer").count();
  await page.locator(".mk-loan-offer").nth(1).locator("button.row", { hasText: "Recusar" }).click();
  await page.waitForSelector(".pr-ok", { timeout: 15000 });
  const c5 = await saveNoServidor(page);
  check("5) Na janela chegam até 2 propostas, de clubes em que ele seria titular ou rotação; o Mercado mostra o número; recusar descarta uma:",
    r5.ofertas.length === 2 && r5.clubesOk && r5.depois === 2 && /2 propostas/.test(nav) && antes5 === 2 && (c5.loanOffersIn || []).length === 1,
    JSON.stringify({ semanas: r5.semanas, ofertas: r5.ofertas.map((o) => ({ clube: o.clubName, papel: o.papel, taxa: o.fee })), nav, depois: r5.depois, restam: (c5.loanOffersIn || []).length }));

  // 6) Aceitar a que sobrou.
  const caixa6 = c5.finances.cash;
  const oferta6 = c5.loanOffersIn[0];
  await page.goto(base + "/mercado/emprestimos", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mk-loan-offer", { timeout: 30000 });
  await page.locator(".mk-loan-offer button.row", { hasText: "Aceitar proposta" }).click();
  await page.waitForSelector(".pr-ok, .inline-error", { timeout: 15000 });
  const erro6 = await page.evaluate(() => (document.querySelector(".inline-error") || {}).textContent || null);
  const c6 = await saveNoServidor(page);
  const la = (c6.leagueSquads[oferta6.clubId] || []).find((p) => String(p.id) === meu.id);
  check("6) Aceitar empresta: o jogador vai para o clube, a taxa entra no caixa, a marca e as propostas saem:",
    !c6.squad.some((p) => String(p.id) === meu.id) && !!la && String(la.onLoanFromClubId) === String(c6.clubId) && !la.loanListed
      && c6.finances.cash === caixa6 + oferta6.fee && (c6.loanOffersIn || []).length === 0,
    JSON.stringify({ erro6, oferta6, caixa: [caixa6, c6.finances.cash], la: la && { onLoan: la.onLoanFromClubId, listed: la.loanListed } }));

  // 7) Fora da janela e tirar a marca.
  const r7 = await noMotor(page, async (M) => {
    const C = M.CAREER;
    const outro = C.squad.find((p) => p.origin === "principal");
    M.clube.setLoanListed(outro.id, true);
    C.loanOffersIn = [{ id: "teste_1", playerId: outro.id, playerName: outro.name, clubId: "x", clubName: "X", papel: "titular", fee: 1000, round: 1 }];
    // Uma semana de janela fechada no calendário.
    const idx0 = C.calendar.idx;
    const fechada = C.calendar.weeks.findIndex((w, i) => { C.calendar.idx = i; return !M.semana.transferWindowStatus(C.currentRound).open; });
    C.calendar.idx = fechada;
    M.semana.resolveLoanListingsRound();
    const fora = fechada >= 0 ? (C.loanOffersIn || []).length : -1;
    C.calendar.idx = idx0;
    C.loanOffersIn = [{ id: "teste_2", playerId: outro.id, playerName: outro.name, clubId: "x", clubName: "X", papel: "titular", fee: 1000, round: 1 }];
    M.clube.setLoanListed(outro.id, false);
    const semMarca = (C.loanOffersIn || []).length;
    const marca = !!outro.loanListed;
    await M.persistir();
    return { fora, semMarca, marca };
  });
  check("7) Fora da janela as propostas caem; tirar a marca descarta as propostas:", r7.fora === 0 && r7.semMarca === 0 && r7.marca === false, JSON.stringify(r7));

  check("8) 360 px sem rolagem horizontal e alvos ≥ 44 px (filtro, mercado, ficha, propostas):",
    Object.values(sizes).every((s) => s.overflow <= 0 && s.small.length === 0), JSON.stringify(sizes));

  await browser.close();
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
