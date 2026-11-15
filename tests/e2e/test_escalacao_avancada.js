// Formações e escalar automaticamente — lote L5b, sem a tela antiga. As
// regras pelo motor e pela ponte (escalarAutomaticamente, o mesmo de
// "Escalar automaticamente" da v2, no test_v2_tatica_treino item 6). As trocas
// na Escalação (titular por titular, reserva entra e quem sai vai para o
// banco) estão no test_v2_escalacao itens 2 e 3; as marcas "(titular)" e
// "(banco)" do seletor da tela antiga saíram.
//  1) 14 formações disponíveis.
//  2) Cada formação tem 11 posições (com 1 goleiro), inclusive a 4-2-2-2.
//  3) Escalar automaticamente na 4-2-2-2: 11 titulares, a formação e as
//     táticas ficam como estavam.
//  4) O melhor zagueiro disponível do elenco está entre os titulares.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `escavancada${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  const r = await page.evaluate(async () => {
    const P = (await import("/js/motor/v2.js")).criarPonte();
    const nomes = Object.keys(FORMATIONS);
    const erradas = nomes.filter((f) => FORMATIONS[f].length !== 11 || FORMATIONS[f].filter((s) => s[0] === "G").length !== 1);
    CAREER.lineup.formation = "4-2-2-2";
    const taticas = JSON.stringify(CAREER.lineup.tactics);
    const a = await P.escalarAutomaticamente(false);
    const disp = CAREER.squad.filter((p) => p.status === "ok" && p.origin === "principal" && p.group === "D");
    const melhor = disp.sort((x, y) => y.overall - x.overall)[0];
    return { n: nomes.length, tem4222: nomes.includes("4-2-2-2"), erradas, a, titulares: CAREER.lineup.starters.filter(Boolean).length, formacao: CAREER.lineup.formation,
      taticasIguais: JSON.stringify(CAREER.lineup.tactics) === taticas, melhorTitular: !!melhor && CAREER.lineup.starters.includes(melhor.id) };
  });

  check("1) 14 formações disponíveis:", r.n === 14, r.n);
  check("2) Todas com 11 posições e 1 goleiro, inclusive a 4-2-2-2:", r.tem4222 && r.erradas.length === 0, JSON.stringify(r.erradas));
  check("3) Escalar automaticamente na 4-2-2-2: 11 titulares; formação e táticas como estavam:", r.a.ok !== false && r.titulares === 11 && r.formacao === "4-2-2-2" && r.taticasIguais, JSON.stringify({ titulares: r.titulares, formacao: r.formacao, taticas: r.taticasIguais }));
  check("4) O melhor zagueiro disponível está entre os titulares:", r.melhorTitular);
  check("5) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
