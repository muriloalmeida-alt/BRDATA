// Empréstimos: de ida (OUT) e de vinda (IN), o salário de quem chega, a
// etiqueta no Elenco, o que o perfil do emprestado não oferece, a folha e a
// volta dos dois na virada de temporada.
// Lote L3b (12/11/2026, plano "testes sem a tela antiga"): antes pela tela
// antiga (#marketSearch, [data-loanout], #loanOverlay, #detailOverlay,
// #btnAdvanceSeason). Agora as regras pelos comandos do motor que as telas
// de mercado da v2 usam (prepararEmprestimo/emprestar, pegarEmprestado,
// proximaTemporada) e o que é tela pelas telas da v2 (Elenco e perfil).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, signup, ensureDailyClaimed, noMotor, saveNoServidor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  // Pré-temporada: a janela de transferências está aberta (com calendário,
  // a janela é a fase do ano).
  await carreiraV2(page, `loans${Date.now()}@teste.com`, { clube: "fla", criarConta: signup, preTemporada: true });
  await ensureDailyClaimed(page);

  // 1) Empréstimo OUT (comprador garantido: sorteio alto, como antes).
  const out = await noMotor(page, async ({ CAREER, ponte }) => {
    const escalados = new Set([...CAREER.lineup.starters, ...CAREER.lineup.bench]);
    const p = CAREER.squad.filter((x) => x.origin === "principal" && !escalados.has(x.id)).sort((a, b) => a.overall - b.overall)[0];
    const rnd = Math.random; Math.random = () => 0.99;
    try {
      const cashBefore = CAREER.finances.cash;
      const prep = await ponte.prepararEmprestimo(p.id);
      const r = prep.ok ? await ponte.emprestar(p.id, "temporada", "nenhuma", 0) : prep;
      return { id: p.id, prep, r, cashBefore };
    } finally { Math.random = rnd; }
  });
  let career = await saveNoServidor(page);
  let foundInClub = null;
  for (const [clubId, squad] of Object.entries(career.leagueSquads)) {
    const found = squad.find((p) => p.id === out.id);
    if (found) { foundInClub = { clubId, onLoanFromClubId: found.onLoanFromClubId }; break; }
  }
  check("1) Empréstimo OUT: saiu do meu elenco e está em outro clube com onLoanFromClubId do meu clube:",
    out.r.ok && !career.squad.some((p) => p.id === out.id) && !!foundInClub && String(foundInClub.onLoanFromClubId) === String(career.clubId),
    JSON.stringify({ r: out.r, foundInClub }));
  console.log("   Caixa aumentou (taxa de empréstimo):", career.finances.cash > out.cashBefore, "| delta:", career.finances.cash - out.cashBefore);

  // 2) O emprestado não aparece no mercado (allMarketPlayers).
  const noMercado = await noMotor(page, ({ semana }, id) => semana.allMarketPlayers().some((e) => e.p.id === id), out.id);
  check("2) Jogador emprestado NÃO aparece no Mercado:", !noMercado, noMercado);

  // 3) Empréstimo IN, pagando 50% do salário (o que o modal antigo fazia).
  const inn = await noMotor(page, async ({ ponte, semana, clube }) => {
    const e = semana.allMarketPlayers().find((x) => !x.mine && !clube.isLoanOutRefused(x.p));
    const info = { id: e.p.id, name: e.p.name, clubId: String(e.club.id), wage: e.p.wage };
    const r = await ponte.pegarEmprestado(info.clubId, info.id, "temporada", 50, "nenhuma", 0);
    return { ...info, r };
  });
  career = await saveNoServidor(page);
  const loanedIn = career.squad.find((p) => p.id === inn.id);
  check("3) Jogador emprestado IN entrou no elenco, com metade do salário e o salário original guardado:",
    inn.r.ok && !!loanedIn && loanedIn.origin === "loan" && loanedIn.wage === Math.round((inn.wage * 0.5) / 100) * 100 && loanedIn.loanOriginalWage === inn.wage,
    JSON.stringify({ r: inn.r, origin: loanedIn && loanedIn.origin, wage: loanedIn && loanedIn.wage, original: inn.wage, guardado: loanedIn && loanedIn.loanOriginalWage }));

  // 4) Elenco (v2): a linha do emprestado tem a etiqueta "Emprestado".
  await page.goto(base + "/elenco", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".sq-row", { timeout: 20000 });
  const rowText = await page.evaluate((id) => {
    const a = [...document.querySelectorAll("a.sq-row")].find((x) => x.getAttribute("href").endsWith(`id=${encodeURIComponent(id)}`));
    return a ? a.textContent : null;
  }, inn.id);
  check("4) Jogador emprestado aparece no Elenco com a etiqueta \"Emprestado\":", !!rowText && rowText.includes("Emprestado"), rowText);

  // 5) Ficha do emprestado (v2, o que o detalhe antigo era): sem vender, emprestar, dispensar,
  // promover ou mandar para a base; renovar desativado com o motivo.
  await page.goto(base + `/elenco/ficha?id=${encodeURIComponent(inn.id)}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".cal-foot .cta", { timeout: 20000 });
  const perfil = await page.evaluate(() => ({
    acoes: [...document.querySelectorAll(".row-title")].map((t) => t.textContent),
    renovar: document.querySelector(".cal-foot .cta").getAttribute("aria-disabled"),
    motivo: (document.querySelector(".sp-why") || {}).textContent || "",
  }));
  const proibidas = ["Colocar à venda", "Emprestar", "Dispensar", "Promover ao elenco principal", "Enviar para a base"];
  check("5) Perfil do emprestado sem vender/emprestar/dispensar/promover/enviar para a base; renovar desativado com o motivo:",
    !perfil.acoes.some((a) => proibidas.includes(a)) && perfil.renovar === "true" && /emprestado/i.test(perfil.motivo), JSON.stringify(perfil));

  // 6) A folha inclui o salário do emprestado.
  const folha = await noMotor(page, ({ CAREER, financas }, id) => ({ total: financas.wageBill(CAREER.squad), semEle: financas.wageBill(CAREER.squad.filter((p) => p.id !== id)) }), inn.id);
  check("6) A folha (wageBill) inclui o salário do emprestado:", folha.total > folha.semEle && folha.total > 0, JSON.stringify(folha));

  // 7) Virada de temporada: os dois empréstimos voltam para o dono.
  const virada = await noMotor(page, async ({ CAREER, persistir, ponte }) => {
    CAREER.currentRound = 39;
    await persistir();
    return ponte.proximaTemporada();
  });
  for (const t0 = Date.now(); Date.now() - t0 < 15000;) {
    career = await saveNoServidor(page);
    if (career.currentRound !== 39) break;
    await page.waitForTimeout(200);
  }
  const voltouAoDono = (career.leagueSquads[inn.clubId] || []).find((p) => p.id === inn.id);
  check("7) Empréstimo OUT voltou para o meu elenco:", career.squad.some((p) => p.id === out.id), JSON.stringify({ virada: virada && virada.ok, round: career.currentRound }));
  console.log("   Empréstimo IN saiu do meu elenco:", !career.squad.some((p) => p.id === inn.id), "| voltou ao clube de origem com o salário original:", !!voltouAoDono && voltouAoDono.wage === inn.wage && voltouAoDono.origin === "principal");

  check("8) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
