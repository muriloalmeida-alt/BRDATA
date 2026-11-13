// GE-CALENDAR-001 (B2) — amistosos. Lote L4c (sem a tela antiga): as regras
// pelo motor na página da v2 (os mesmos comandos da ponte que o Pré-jogo de
// amistoso e a Semana da v2 usam). As telas do amistoso (convites,
// "Ir para o amistoso", Partida de amistoso, "Avançar até o próximo jogo",
// amistoso opcional de julho) estão no test_v2_semana, itens 3 a 5.
//  1) O calendário nasce com 3 amistosos na pré (obrigatórios) + 2 em julho
//     (opcionais), 3 convites cada; a 1ª semana não tem amistoso.
//  2) Na semana do amistoso, "Avançar semana" sem jogar é recusado (o
//     amistoso da pré é obrigatório).
//  3) Amistoso jogado contra o convite escolhido, com resultado guardado.
//  3b) Não mexe na tabela, em gol/assistência oficial nem em cartão/suspensão.
//  3c) Rende bilheteria e fecha a semana (calendário avança, rodada não).
//  4) "Avançar até o próximo jogo" chega na rodada 1 e marca os amistosos
//     pulados como jogados, sem resultado.
//  5) Em julho o amistoso é opcional: dá para avançar sem convite; com
//     convite aceito, a semana espera o amistoso.
const { chromium } = require("playwright-core");
const { carreiraV2, signup, ensureDailyClaimed, globaisDoMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await carreiraV2(page, `gecalb2${Date.now()}@teste.com`, { clube: "fla", preTemporada: true, criarConta: signup });
  await ensureDailyClaimed(page);
  await globaisDoMotor(page);
  await page.evaluate(async () => { window.P = (await import("/js/motor/v2.js")).criarPonte(); });
  let ok = true;
  const check = (label, cond, extra) => { console.log(label, !!cond, extra !== undefined ? JSON.stringify(extra) : ""); ok = ok && !!cond; };

  const s0 = await page.evaluate(() => ({
    slots: CAREER.calendar.friendlies.map((f) => ({ phase: CAREER.calendar.weeks[f.wi].p, invites: f.invites.length, optional: f.optional })),
    thisWeek: !!friendlySlotThisWeek(),
  }));
  check("1) Calendário nasce com 3 amistosos na pré (obrigatórios) + 2 em julho (opcionais), 3 convites cada:",
    s0.slots.filter((x) => x.phase === "pre" && !x.optional).length === 3 && s0.slots.filter((x) => x.phase === "pausa" && x.optional).length === 2 && s0.slots.every((x) => x.invites === 3) && !s0.thisWeek, s0);

  // 2) Avança a 1ª semana (sem amistoso); na seguinte, avançar sem jogar é recusado.
  const s2 = await page.evaluate(async () => {
    const a = await P.avancarSemana(false);
    const slot = friendlySlotThisWeek();
    const b = await P.avancarSemana(false);
    return { a: a.ok, temAmistoso: !!slot, convites: slot ? slot.invites.length : 0, recusa: b.motivo };
  });
  check("2) Semana de amistoso (3 convites): avançar sem jogar é recusado (amistoso da pré é obrigatório):", s2.a && s2.temAmistoso && s2.convites === 3 && s2.recusa === "amistoso", s2);

  // 3) Joga o amistoso contra o 2º convite.
  const r3 = await page.evaluate(async () => {
    const soma = () => ({
      pts: Object.values(CAREER.standings).reduce((a, r) => a + r.pts + r.j, 0),
      goals: CAREER.squad.reduce((a, p) => a + (p.goalsSeason || 0) + (p.goalsCareer || 0), 0),
      yellows: CAREER.squad.reduce((a, p) => a + (p.yellowCards || 0), 0),
      idx: CAREER.calendar.idx, round: CAREER.currentRound,
    });
    const before = { ...soma(), pick: friendlySlotThisWeek().invites[1] };
    await P.escolherAmistoso(before.pick);
    const i = P.iniciarAmistoso();
    P.pularParaFim();
    const t0 = Date.now();
    while (Date.now() - t0 < 30000 && P.estado().fase !== "encerrada" && P.estado().fase !== "sem-partida") await new Promise((r) => setTimeout(r, 30));
    await new Promise((r) => setTimeout(r, 300));
    const slot = CAREER.calendar.friendlies.find((f) => f.wi === before.idx);
    const after = { ...soma(), played: slot.played, opp: slot.opp, result: slot.result,
      suspended: CAREER.squad.filter((p) => p.status === "suspenso").length,
      ticket: (CAREER.financeLedger || []).some((l) => l.label === "Bilheteria de amistoso" && l.amount > 0) };
    return { iniciou: i.ok, before, after };
  });
  const { before, after } = r3;
  check("3) Amistoso jogado contra o convite escolhido, com resultado guardado:", r3.iniciou && after.played && after.opp === before.pick && !!after.result, after);
  check("3b) Não mexe na tabela, em gol/assistência oficial nem em cartão/suspensão:", after.pts === before.pts && after.goals === before.goals && after.yellows === before.yellows && after.suspended === 0, { before, after });
  check("3c) Rende bilheteria e fecha a semana sozinho (calendário avança, rodada não):", after.ticket && after.idx === before.idx + 1 && after.round === before.round, { idx: [before.idx, after.idx], round: [before.round, after.round] });

  // 4) Avançar até o próximo jogo.
  const s4 = await page.evaluate(async () => {
    const r = await P.avancarSemana(true);
    return { ok: r.ok, round: CAREER.currentRound, week: calendarWeek(),
      preSlots: CAREER.calendar.friendlies.filter((f) => !f.optional).map((f) => ({ played: f.played, hasResult: !!f.result })) };
  });
  check("4) 'Avançar até o próximo jogo' chega na rodada 1 e marca os amistosos pulados como jogados (sem resultado):",
    s4.ok && s4.week.r === 1 && s4.preSlots.every((f) => f.played) && s4.preSlots.filter((f) => f.hasResult).length === 1, s4);

  // 5) Julho: amistoso opcional.
  const july = await page.evaluate(async () => {
    let guard = 0;
    while (guard++ < 80) {
      const w = calendarWeek();
      if (!w.r && friendlySlotThisWeek()) break;
      if (!w.r) { runCalendarOffWeek(); continue; }
      const j = await jogarPartidaDaRodada();
      if (!j.ok) return { erro: j.passos };
    }
    const slot = friendlySlotThisWeek();
    const fase = calendarWeek().p, idx = CAREER.calendar.idx;
    // Com convite aceito, a semana espera o amistoso.
    slot.opp = slot.invites[0];
    const comConvite = await P.avancarSemana(false);
    // Sem convite (opcional), dá para avançar.
    slot.opp = null;
    const semConvite = await P.avancarSemana(false);
    return { fase, optional: slot.optional, comConvite: comConvite.motivo, semConvite: semConvite.ok, avancou: CAREER.calendar.idx === idx + 1 };
  });
  check("5) Em julho o amistoso é opcional: sem convite a semana avança; com convite aceito, espera o amistoso:",
    july.fase === "pausa" && july.optional && july.comConvite === "amistoso" && july.semConvite && july.avancou, july);

  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.log("FATAL:", e.message); process.exit(1); });
