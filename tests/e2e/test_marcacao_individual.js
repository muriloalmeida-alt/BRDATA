// Marcação individual — lote L5b, sem a tela antiga. As regras pela ponte
// (marcacao, salvarMarcacao: os mesmos comandos da tela Marcação da v2, que
// está no test_v2_tatica_treino item 5) e o efeito pelo motor.
//  1) O próximo adversário, 10 titulares meus de linha (sem goleiro) e os 5
//     melhores dele, sem marcação ainda.
//  2) Salvar grava a marcação (adversário, meu jogador, o dele) e ela volta
//     ao reabrir.
//  3) Jogador fora das listas é recusado.
//  4) Efeito real: com a marcação, o jogador marcado é sorteado como autor
//     de gol ou assistência bem menos vezes (4 000 sorteios).
//  5) "Sem marcação" limpa.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `marcacao${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  const r = await page.evaluate(async () => {
    const P = (await import("/js/motor/v2.js")).criarPonte();
    const out = {};
    const m = P.marcacao();
    out.um = { adv: !!m.adversario, meus: m.meus.length, rivais: m.rivais.length, atual: m.atual, semGoleiro: m.meus.every((x) => CAREER.squad.find((p) => p.id === x.id).group !== "G") };
    const meu = m.meus[0].id, rival = m.rivais[0].id;
    const s = await P.salvarMarcacao(meu, rival);
    const m2 = P.marcacao();
    out.dois = { s, mm: CAREER.manMarking, atual: m2.atual, meu, rival };
    out.tres = await P.salvarMarcacao("nao-existe", rival);
    const opp = CAREER.manMarking.opponentId;
    const squad = leagueSquadFor(opp);
    const marcado = squad.find((p) => p.id === rival);
    let com = 0, sem = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      if (attributeGoals(squad, 1, activeManMarkingSuppression(opp)).some((e) => e.player === marcado.name)) com++;
      if (attributeGoals(squad, 1, null).some((e) => e.player === marcado.name)) sem++;
    }
    out.quatro = { com, sem, N };
    const s5 = await P.salvarMarcacao(null, null);
    out.cinco = { s5, mm: CAREER.manMarking, atual: P.marcacao().atual };
    return out;
  });

  check("1) Próximo adversário, 10 titulares de linha meus (sem goleiro) e 5 dele, sem marcação:", r.um.adv && r.um.meus === 10 && r.um.rivais === 5 && r.um.atual === null && r.um.semGoleiro, JSON.stringify(r.um));
  check("2) Salvar grava a marcação e ela volta ao reabrir:", r.dois.s.ok !== false && r.dois.mm && r.dois.mm.myPlayerId === r.dois.meu && r.dois.mm.rivalPlayerId === r.dois.rival && r.dois.atual && r.dois.atual.meu === r.dois.meu, JSON.stringify(r.dois));
  check("3) Jogador fora das listas é recusado:", r.tres.ok === false && r.tres.motivo === "jogador-invalido", JSON.stringify(r.tres));
  check("4) Com marcação, o marcado é autor de gol/assistência bem menos vezes (menos de 75% do normal):", r.quatro.com < r.quatro.sem * 0.75, JSON.stringify(r.quatro));
  check("5) 'Sem marcação' limpa:", r.cinco.mm === null && r.cinco.atual === null, JSON.stringify(r.cinco));
  check("6) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
