// GE-COPA-001 (issue #28) — teste e2e via UI real. Cobre a estrutura
// (constantes/prêmios), integridade de clubes por fase (60 → 56+4 →
// 32 → 16 → 8 → 4 → 2 → 1, sem duplicado/perdido), o fluxo ao vivo do
// confronto do técnico (ida e volta, reaproveitando startLiveMatch/
// resolveLiveChunk) e a compatibilidade com o formato LEGADO (save sem
// sistema de divisões continua com 16 clubes/jogo único). A validação
// estatística de várias temporadas completas já foi feita em
// tests/e2e/sim_ge_copa_001.js — este teste é sobre corretude
// estrutural e integração, não estatística.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("fonts.googleapis") && !m.text().includes("fundingchoices")) console.log("CONSOLE ERROR:", m.text()); });

  // Lote L4b: carreira pela v2 e as funções do jogo pelo motor na página da
  // v2 (globaisDoMotor), sem a tela antiga.
  // Cuiabá: não é cabeça de chave (o item 3 precisa do clube na 1ª fase).
  await newCareer(page, `gecopa001b${Date.now()}@teste.com`, "cui");
  await globaisDoMotor(page);

  // 1) Estrutura: 6 fases na ordem certa, 4 cabeças de chave, prêmios
  // novos somados sem alterar os 5 valores preservados.
  const structure = await page.evaluate(() => ({
    phases: CUP_PHASES_EXPANDED, seedCount: CUP_SEED_COUNT,
    prize: CUP_PRIZE, rounds: CUP_ROUNDS_EXPANDED,
  }));
  const phasesOk = JSON.stringify(structure.phases) === JSON.stringify(["fase1", "r32", "r16", "qf", "sf", "final"]);
  const prizeOk = structure.prize.r32 === 150000 && structure.prize.r16 === 350000
    && structure.prize.qf === 500000 && structure.prize.sf === 1500000 && structure.prize.final === 4000000
    && structure.prize.champion === 10000000 && structure.prize.runnerUp === 3000000;
  const roundsOk = structure.rounds.fase1.ida === 3 && structure.rounds.fase1.volta === 6 && structure.rounds.final.volta === 36;
  check("1) Estrutura de fases/prêmios/calendário bate com o desenho aprovado (6 fases, 4 cabeças de chave, prêmios antigos preservados + 2 novos):",
    phasesOk && structure.seedCount === 4 && prizeOk && roundsOk, JSON.stringify(structure));

  // 2) Integridade de clubes por fase — fecha o chaveamento inteiro
  // (silent:true bypassa o vivo, mesma função real usada por
  // migração) e confere: 60 únicos no total, cada fase com o tamanho
  // certo, exatamente 1 campeão no fim.
  // SERIED-001 (13/11/2026): estes itens validam o formato de 60 clubes
  // (edição sem a Série D). A Copa com a D (96, com a preliminar) tem testes
  // próprios: tests/unit/test_motor_serie_d.js e tests/e2e/test_v2_serie_d.js.
  const integrity = await page.evaluate(() => {
    CAREER.serieDPool = [];
    setupCupExpanded();
    const cup = CAREER.cup;
    const seen = new Set();
    const phaseSizes = {};
    let guard = 0;
    while (cup.phase !== "done" && guard++ < 20) {
      const phase = cup.phase;
      const ties = cup.ties[phase];
      phaseSizes[phase] = ties.length * 2;
      ties.forEach((t) => { seen.add(String(t.home)); seen.add(String(t.away)); });
      const rounds = CUP_ROUNDS_EXPANDED[phase];
      resolveCupPhaseExpanded(rounds.ida, { silent: true });
      resolveCupPhaseExpanded(rounds.volta, { silent: true });
    }
    return { phaseSizes, totalUniqueClubs: seen.size, champion: cup.champion, phaseFinal: cup.phase };
  });
  const sizesOk = integrity.phaseSizes.fase1 === 56 && integrity.phaseSizes.r32 === 32 && integrity.phaseSizes.r16 === 16
    && integrity.phaseSizes.qf === 8 && integrity.phaseSizes.sf === 4 && integrity.phaseSizes.final === 2;
  check("2) Integridade do chaveamento inteiro (60 clubes únicos, tamanho certo em cada fase, fecha num campeão só):",
    integrity.totalUniqueClubs === 60 && sizesOk && integrity.phaseFinal === "done" && !!integrity.champion, JSON.stringify(integrity));

  // 3) Fluxo ao vivo real: força o confronto do técnico na Fase 1 (ida)
  // e confere que vira partida ao vivo de verdade (a mesma
  // partida ao vivo do Brasileirão, contexto Copa), decide pelos mesmos tempos, e
  // fecha gravando o placar na perna certa do tie.
  const liveIda = await page.evaluate(async () => {
    CAREER.serieDPool = [];
    setupCupExpanded();
    const cup = CAREER.cup;
    const myTie = cup.ties.fase1.find((t) => String(t.home) === String(CAREER.clubId) || String(t.away) === String(CAREER.clubId));
    resolveCupPhaseExpanded(CUP_ROUNDS_EXPANDED.fase1.ida); // resolve os OUTROS confrontos, defere o seu
    const deferredBefore = !!cup.pendingLiveLeg;
    const started = maybeStartPendingCupLegLive();
    // Na v2 a partida ao vivo é a tela Partida, alimentada pela ponte: o
    // estado da ponte é "jogando", no contexto da Copa (antes: o
    // #liveMatchOverlay da tela antiga aberto).
    const est = (await import("/js/motor/carga.js")).ponteEstado();
    const overlayOpen = est.fase === "jogando" && est.contexto === "copa";
    const isCup = !!(LIVE_MATCH && LIVE_MATCH.cupContext);
    pauseLiveMatch();
    skipLiveMatch();
    await new Promise((r) => setTimeout(r, 300));
    return {
      deferredBefore, started, overlayOpen, isCup,
      liveMatchGone: LIVE_MATCH === null,
      leg1Filled: myTie.leg1.gh != null,
      pendingClearedAfter: !cup.pendingLiveLeg,
    };
  });
  check("3) Confronto do técnico na Fase 1 (ida) vira ao vivo de verdade (a partida ao vivo do motor, contexto Copa), decide e grava a perna:",
    liveIda.deferredBefore && liveIda.started && liveIda.overlayOpen && liveIda.isCup && liveIda.liveMatchGone && liveIda.leg1Filled && liveIda.pendingClearedAfter,
    JSON.stringify(liveIda));

  // 4) Formato LEGADO preservado: carreira SEM sistema de divisões
  // continua com a Copa de 16 clubes/jogo único, exatamente como antes
  // desta demanda.
  const legacy = await page.evaluate(() => {
    const savedPool = CAREER.serieDPool;
    delete CAREER.serieDPool; // simula save antigo, sem o sistema de divisões
    setupCup();
    const cup = CAREER.cup;
    const totalClubsR16 = new Set(cup.ties.r16.flatMap((t) => [String(t.home), String(t.away)])).size;
    CAREER.serieDPool = savedPool; // restaura pro resto do processo continuar normal
    return { expanded: cup.expanded, phase: cup.phase, hasSeeds: !!cup.seeds, totalClubsR16, hasFlatGh: cup.ties.r16.every((t) => "gh" in t) };
  });
  check("4) Save sem sistema de divisões continua com a Copa LEGADA (16 clubes, jogo único, sem cabeça de chave):",
    legacy.expanded === false && legacy.phase === "r16" && !legacy.hasSeeds && legacy.totalClubsR16 === 16 && legacy.hasFlatGh,
    JSON.stringify(legacy));

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
