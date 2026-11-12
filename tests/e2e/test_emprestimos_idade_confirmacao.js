// Ajustes de empréstimo e idade: idade real vinda da API, fator de
// reclamação por idade/overall, empréstimo recusado por jogador de destaque.
// Lote L3b (12/11/2026, plano "testes sem a tela antiga"):
// - itens 1 a 3 (regras): os mesmos trechos, na página da v2 com as funções
//   do motor (globaisDoMotor), no lugar da tela antiga;
// - item 4 ("Emprestar" desativado no detalhe antigo): na v2 a recusa
//   aparece ao abrir "Combine o empréstimo" (/mercado/emprestimo), com o
//   motivo e o botão de propor desativado;
// - itens 5, 5b, 5c e 6 (confirmação de escalação antes de simular, na tela
//   antiga) saíram: o Pré-jogo da v2 cobre o mesmo em test_v2_prejogo
//   (itens 2, 3 e 7: titulares e adversário, "Revisar escalação" e voltar,
//   "Iniciar partida" começa o jogo).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, signup, ensureDailyClaimed, globaisDoMotor, noMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    headless: true,
    args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));

  // Pré-temporada: a janela de transferências está aberta (item 4).
  await carreiraV2(page, `ajustes${Date.now()}@teste.com`, { clube: "fla", criarConta: signup, preTemporada: true });
  await ensureDailyClaimed(page);
  await globaisDoMotor(page);

  // ---------- 1) Idade real vinda da API ----------
  const ageCheck = await page.evaluate(() => {
    const rng = () => 0.5;
    const club = { atk: 1.2, def: 1.1 };
    const rawComPeidade = { id: 999, name: "Jogador Com Idade", position: "Midfielder", rating: 7, games: 20, goals: 3, assists: 2, age: 29 };
    const rawSemIdade = { id: 998, name: "Jogador Sem Idade", position: "Midfielder", rating: 7, games: 20, goals: 3, assists: 2 };
    const pCom = buildRealPlayer(rawComPeidade, club, rng);
    const pSem = buildRealPlayer(rawSemIdade, club, rng);
    return { comIdade: pCom.age, semIdade: pSem.age };
  });
  check("1) Idade vinda do 'raw.age' da API é usada de verdade:", ageCheck.comIdade === 29);
  console.log("   Sem raw.age, cai no sorteio de sempre (18-35):", ageCheck.semIdade >= 18 && ageCheck.semIdade <= 35);

  // ---------- 2) Fator de reclamação: idade/overall ----------
  const complaintCheck = await page.evaluate(() => {
    const prime = { age: 27, overall: 85 };
    const old = { age: 36, overall: 85 };
    const young = { age: 18, overall: 85 };
    const lowOvr = { age: 27, overall: 58 };
    return {
      prime: playerComplaintFactor(prime),
      old: playerComplaintFactor(old),
      young: playerComplaintFactor(young),
      lowOvr: playerComplaintFactor(lowOvr),
    };
  });
  check("2) Jogador em idade de pico + overall alto reclama mais que veterano com o mesmo overall:", complaintCheck.prime > complaintCheck.old);
  console.log("   ...e mais que um jovem com o mesmo overall:", complaintCheck.prime > complaintCheck.young);
  console.log("   ...e mais que alguém de overall baixo na mesma idade:", complaintCheck.prime > complaintCheck.lowOvr);

  // ---------- 3) Empréstimo recusado por jogador de destaque ----------
  const loanCheck = await page.evaluate(async () => {
    const destaque = CAREER.squad.find((p) => p.origin === "principal");
    destaque.overall = 88; destaque.age = 27; // prime + overall alto -> deve recusar
    const cashBefore = CAREER.finances.cash;
    const okDestaque = await finalizeLoanOut(destaque.id, { returnRound: null, buyOption: null });
    const aindaNoElenco = CAREER.squad.some((p) => p.id === destaque.id);

    const reserva = CAREER.squad.filter((p) => p.origin === "principal")[1];
    reserva.overall = 60; reserva.age = 27; // overall baixo -> deve aceitar (se achar comprador)
    let okReserva = false, tentativas = 0;
    while (!okReserva && tentativas < 20) { // findInterestedBuyer tem chance de recusa aleatória -- tenta algumas vezes
      okReserva = await finalizeLoanOut(reserva.id, { returnRound: null, buyOption: null });
      tentativas++;
    }
    return { okDestaque, aindaNoElenco, okReserva, cashChanged: CAREER.finances.cash !== cashBefore };
  });
  check("3) Jogador de destaque (prime + overall alto) tem empréstimo recusado:", loanCheck.okDestaque === false && loanCheck.aindaNoElenco === true);
  console.log("   Jogador de overall baixo consegue ser emprestado (mesma idade):", loanCheck.okReserva === true);

  // ---------- 4) Empréstimo do destaque recusado na tela da v2 ----------
  const destaque = await noMotor(page, async ({ CAREER, persistir }) => {
    const p = CAREER.squad.find((x) => x.origin === "principal" && x.id !== CAREER.lineup.starters[0]);
    p.overall = 90; p.age = 26;
    await persistir();
    return { id: p.id };
  });
  await page.goto(base + `/mercado/emprestimo?id=${encodeURIComponent(destaque.id)}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".wk-sec .inline-error", { timeout: 20000 });
  const tela4 = await page.evaluate(() => ({
    motivo: document.querySelector(".wk-sec .inline-error").textContent,
    propor: document.querySelector(".cal-foot .cta").getAttribute("aria-disabled"),
    campos: document.querySelectorAll('[aria-labelledby="ln-d"]').length,
  }));
  check("4) Empréstimo do destaque: a tela da v2 mostra a recusa com o motivo e não deixa propor:",
    /não aceita ser emprestado/.test(tela4.motivo) && tela4.propor === "true" && tela4.campos === 0, JSON.stringify(tela4));

  check("5) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
