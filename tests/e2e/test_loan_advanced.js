// Empréstimos avançados: percentual de salário na chegada, 6 meses com
// cláusula de compra obrigatória (vira venda definitiva na rodada da volta)
// e a volta do emprestado "temporada inteira" na virada.
// Lote L3b (12/11/2026, plano "testes sem a tela antiga"): antes pelo modal
// da tela antiga (#loanOverlay, selects e #btnAdvanceSeason). Agora pela
// tela "Combine o empréstimo" da v2 (/mercado/emprestimo), com os mesmos
// campos, e as rodadas e a virada pelos comandos do motor.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, signup, ensureDailyClaimed, noMotor, saveNoServidor, jogarRodadaV2, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  // Comprador/interessado garantido (sorteio alto), como antes; só com a
  // marca na sessão (o clube interessado é sorteado ao abrir a tela).
  await ctx.addInitScript(() => { try { if (sessionStorage.getItem("rnd99")) Math.random = () => 0.99; } catch { /* sem sessão */ } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  // Pré-temporada: a janela de transferências está aberta.
  await carreiraV2(page, `loan2-${Date.now()}@teste.com`, { clube: "fla", criarConta: signup, preTemporada: true });
  await ensureDailyClaimed(page);
  await page.evaluate(() => sessionStorage.setItem("rnd99", "1"));
  const seg = (grupo, texto) => page.locator(`[role="radiogroup"][aria-labelledby="${grupo}"] [role="radio"]`, { hasText: texto }).click();
  const fechado = () => page.waitForSelector("text=Empréstimo fechado.", { timeout: 20000 });

  // ===== Empréstimo IN com 100% do salário e sem cláusula =====
  const outro = await noMotor(page, ({ semana, clube }) => {
    const e = semana.allMarketPlayers().find((x) => !x.mine && !clube.isLoanOutRefused(x.p));
    return { id: e.p.id, clubId: String(e.club.id), wage: e.p.wage };
  });
  await page.goto(base + `/mercado/emprestimo?clube=${encodeURIComponent(outro.clubId)}&id=${encodeURIComponent(outro.id)}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[aria-labelledby="ln-d"]', { timeout: 20000 });
  const pctVisivelIn = await page.locator('[aria-labelledby="ln-p"]').count() === 1;
  await seg("ln-d", "Temporada inteira");
  await seg("ln-p", "100%");
  await page.click(".cal-foot .cta");
  await fechado();
  let career = await saveNoServidor(page);
  const loanedIn = career.squad.find((p) => p.id === outro.id);
  check("3) Tela de empréstimo de entrada: o percentual do salário aparece; com 100% e temporada inteira, o salário é o original e não há rodada de volta:",
    pctVisivelIn && !!loanedIn && loanedIn.wage === outro.wage && loanedIn.loanReturnRound == null,
    JSON.stringify({ pctVisivelIn, wage: loanedIn && loanedIn.wage, original: outro.wage, volta: loanedIn && loanedIn.loanReturnRound }));

  // ===== Empréstimo OUT de 6 meses com cláusula OBRIGATÓRIA de 5M =====
  const sai = await noMotor(page, ({ CAREER }) => {
    const escalados = new Set([...CAREER.lineup.starters, ...CAREER.lineup.bench]);
    const p = CAREER.squad.filter((x) => x.origin === "principal" && !escalados.has(x.id)).sort((a, b) => a.overall - b.overall)[0];
    return { id: p.id, startRound: CAREER.currentRound };
  });
  await page.goto(base + `/mercado/emprestimo?id=${encodeURIComponent(sai.id)}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[aria-labelledby="ln-d"]', { timeout: 20000 });
  const pctEscondidoOut = await page.locator('[aria-labelledby="ln-p"]').count() === 0;
  const valorAntes = await page.locator("#ln-v").count();
  await seg("ln-d", "6 meses");
  await seg("ln-c", "Obrigatória");
  const valorDepois = await page.locator("#ln-v").count();
  await page.fill("#ln-v", "5000000");
  await page.click(".cal-foot .cta");
  await fechado();
  career = await saveNoServidor(page);
  const caixaDepoisDoEmprestimo = career.finances.cash;
  let emprestado = null;
  for (const [clubId, squad] of Object.entries(career.leagueSquads)) {
    const found = squad.find((p) => p.id === sai.id);
    if (found) { emprestado = { clubId, returnRound: found.loanReturnRound, buyOption: found.loanBuyOption }; break; }
  }
  check("1) Tela de empréstimo de saída: sem o percentual do salário; o valor da cláusula aparece ao escolher \"Obrigatória\":", pctEscondidoOut && valorAntes === 0 && valorDepois === 1,
    JSON.stringify({ pctEscondidoOut, valorAntes, valorDepois }));
  console.log("   Saiu do elenco:", !career.squad.some((p) => p.id === sai.id), "| loanReturnRound = início+19:", !!emprestado && emprestado.returnRound === sai.startRound + 19,
    "| cláusula obrigatória de 5M salva:", !!emprestado && !!emprestado.buyOption && emprestado.buyOption.mandatory === true && emprestado.buyOption.value === 5000000);

  // Na rodada da volta, a cláusula obrigatória vira venda definitiva.
  await page.evaluate(() => sessionStorage.removeItem("rnd99"));
  await noMotor(page, async ({ CAREER, persistir }, volta) => { CAREER.currentRound = volta - 1; await persistir(); }, emprestado.returnRound);
  const rodada = await jogarRodadaV2(page);
  career = await saveNoServidor(page);
  console.log("   Rodada depois de jogar:", career.currentRound, "(cláusula vence na", emprestado.returnRound + ")", rodada.passos.join(" "));
  const aindaMeu = career.squad.some((p) => p.id === sai.id);
  const noComprador = (career.leagueSquads[String(emprestado.clubId)] || []).find((p) => p.id === sai.id);
  check("2) Após a rodada da cláusula obrigatória: o jogador NÃO voltou e ficou de vez no clube comprador:",
    rodada.ok && !aindaMeu && !!noComprador && !noComprador.onLoanFromClubId, JSON.stringify({ rodada: rodada.ok, aindaMeu, noComprador: !!noComprador, onLoanFrom: noComprador && noComprador.onLoanFromClubId }));
  console.log("   Caixa recebeu os 5M da cláusula:", career.finances.cash >= caixaDepoisDoEmprestimo + 5000000 - 1);

  // ===== A virada de temporada devolve quem veio para a "temporada inteira" =====
  // Como antes: grava a rodada 39 e reabre o jogo antes da virada.
  await noMotor(page, async ({ CAREER, persistir }) => { CAREER.currentRound = 39; await persistir(); });
  const t0v = Date.now();
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  const virada = await noMotor(page, ({ ponte }) => ponte.proximaTemporada());
  console.log("   Virada:", JSON.stringify(virada && { ok: virada.ok, motivo: virada.motivo }), Date.now() - t0v, "ms");
  for (const t0 = Date.now(); Date.now() - t0 < 15000;) {
    career = await saveNoServidor(page);
    if (career.currentRound !== 39) break;
    await page.waitForTimeout(200);
  }
  const deVolta = (career.leagueSquads[outro.clubId] || []).find((p) => p.id === outro.id);
  check("4) Empréstimo \"temporada inteira\" voltou na virada, com o salário restaurado no clube de origem:",
    !career.squad.some((p) => p.id === outro.id) && !!deVolta && deVolta.wage === outro.wage, JSON.stringify({ round: career.currentRound, deVolta: !!deVolta, wage: deVolta && deVolta.wage }));

  check("5) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
