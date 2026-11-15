// Comissão técnica — lote L5c, sem a tela antiga. As regras pelo motor e pela
// ponte (contratarComissao, demitirComissao: os mesmos da tela Comissão da
// v2). As telas: Clube → Comissão (contratar mostra as 4 sugestões; demitir)
// no test_v2_clube item 2, e o painel de sugestões rápidas (aplicar, desfazer,
// sugestão desatualizada) no test_v2_comissao. O card da comissão no Início
// da tela antiga (test_comissao_resumo_inicio) saiu.
//  1) Começa sem comissão; contratar liga, demitir desliga.
//  2) Na rodada 1 o treino sugerido é a Pré-Temporada Física; aplicar grava
//     o modelo.
//  3) A sugestão de tática compara com o próximo adversário de verdade (o
//     nome dele e favorito, equilibrado ou parelho).
//  4) A sugestão de escalação vem calculada (aplicável ou já a melhor).
//  5) No fechamento do mês, a comissão contratada custa o valor mensal dela:
//     a diferença de caixa com e sem comissão é exatamente esse custo.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `comissao${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  const r = await page.evaluate(async () => {
    const P = (await import("/js/motor/v2.js")).criarPonte();
    const fin = await import("/js/motor/financas.js");
    const out = {};
    const antes = !!(CAREER.technicalStaff && CAREER.technicalStaff.hired);
    await P.contratarComissao();
    const contratada = CAREER.technicalStaff.hired;
    out.um = { antes, contratada };
    CAREER.trainingSchemeId = "equilibrio";
    const t = suggestTraining();
    if (t.canApply) t.apply();
    out.dois = { texto: t.text, modelo: CAREER.trainingSchemeId, rodada: CAREER.currentRound };
    const tac = suggestTactics();
    const opp = teamById(nextOpponentId());
    out.tres = { texto: tac.text, adversario: opp && opp.name };
    const l = suggestLineup();
    out.quatro = { canApply: l.canApply };
    // 5) Mês com e sem comissão, do mesmo ponto de partida.
    const caixa0 = CAREER.finances.cash;
    const custo = fin.staffMonthlyCost(CAREER.squad);
    const mes = 3;
    applyCalendarMonthlyFinances(mes);
    const com = CAREER.finances.cash - caixa0;
    CAREER.finances.cash = caixa0;
    CAREER.technicalStaff.hired = false;
    applyCalendarMonthlyFinances(mes);
    const sem = CAREER.finances.cash - caixa0;
    CAREER.finances.cash = caixa0;
    CAREER.technicalStaff.hired = true;
    out.cinco = { com, sem, custo };
    await P.demitirComissao();
    out.um.demitida = CAREER.technicalStaff.hired;
    return out;
  });

  check("1) Começa sem comissão; contratar liga e demitir desliga:", r.um.antes === false && r.um.contratada === true && r.um.demitida === false, JSON.stringify(r.um));
  check("2) Na rodada 1 o treino sugerido é a Pré-Temporada Física; aplicar grava o modelo:", r.dois.rodada === 1 && /Pré-Temporada Física/.test(r.dois.texto) && r.dois.modelo === "pretemporada", JSON.stringify(r.dois));
  check("3) A tática sugerida compara com o próximo adversário (nome e favorito/equilibrado/parelho):", !!r.tres.adversario && r.tres.texto.includes(r.tres.adversario) && /favorito|equilibrado|parelh/.test(r.tres.texto), JSON.stringify(r.tres));
  check("4) A escalação sugerida vem calculada:", typeof r.quatro.canApply === "boolean", JSON.stringify(r.quatro));
  check("5) No fechamento do mês, a comissão custa exatamente o valor mensal dela:", r.cinco.custo > 0 && r.cinco.sem - r.cinco.com === r.cinco.custo, JSON.stringify(r.cinco));
  check("6) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
