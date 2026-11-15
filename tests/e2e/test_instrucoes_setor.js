// Instruções por setor — lote L5b, sem a tela antiga. As regras pela ponte
// (salvarInstrucoesSetor, o mesmo da tela Instruções por setor da v2, que
// está no test_v2_tatica_treino item 3) e o efeito pelo motor.
//  1) 3 setores (Defesa, Meio, Ataque) com 5 instruções cada, diferentes
//     entre si, todas neutras (3) numa carreira nova.
//  2) Salvar grava o valor; valor fora de 1 a 5 é ignorado.
//  3) Efeito real: com um ajuste, combinedSectorTacticMod e combinedTacticMod
//     (a que entra na força do time) saem do neutro.
//  4) Save antigo sem as instruções por setor migra para as 15 neutras.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `setor${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  const r = await page.evaluate(async () => {
    const P = (await import("/js/motor/v2.js")).criarPonte();
    const fe = await import("/js/motor/fechamento.js");
    const SI = fe.SECTOR_INSTRUCTIONS;
    const st = CAREER.lineup.sectorTactics;
    const ids = (s) => SI[s].map((i) => i.id);
    const out = {
      um: { setores: Object.keys(SI), cinco: ["defesa", "meio", "ataque"].every((s) => SI[s].length === 5), diferentes: ids("defesa").join() !== ids("meio").join() && ids("meio").join() !== ids("ataque").join(),
        neutras: ["defesa", "meio", "ataque"].every((s) => ids(s).every((i) => st[s][i] === 3)) },
    };
    const neutro = { setor: combinedSectorTacticMod(), geral: combinedTacticMod() };
    const alvo = ids("ataque")[0];
    const s2 = await P.salvarInstrucoesSetor("ataque", { [alvo]: 5, [ids("ataque")[1]]: 9 });
    out.dois = { s2, valor: CAREER.lineup.sectorTactics.ataque[alvo], ignorado: CAREER.lineup.sectorTactics.ataque[ids("ataque")[1]] };
    out.tres = { neutro, setor: combinedSectorTacticMod(), geral: combinedTacticMod() };
    delete CAREER.lineup.sectorTactics;
    migrateCareerDefaults();
    const m = CAREER.lineup.sectorTactics;
    out.quatro = { todos: ["defesa", "meio", "ataque"].every((s) => m[s] && Object.keys(m[s]).length === 5), neutros: ["defesa", "meio", "ataque"].every((s) => Object.values(m[s]).every((v) => v === 3)) };
    return out;
  });

  check("1) 3 setores com 5 instruções cada, diferentes, todas neutras:", r.um.cinco && r.um.diferentes && r.um.neutras && ["defesa", "meio", "ataque"].every((s) => r.um.setores.includes(s)), JSON.stringify(r.um));
  check("2) Salvar grava o valor; fora de 1 a 5 é ignorado:", r.dois.s2.ok !== false && r.dois.valor === 5 && r.dois.ignorado === 3, JSON.stringify(r.dois));
  check("3) Com um ajuste, os modificadores do setor e o geral saem do neutro:", r.tres.neutro.setor.atk === 1 && r.tres.setor.atk !== 1 && r.tres.geral.atk !== r.tres.neutro.geral.atk, JSON.stringify(r.tres));
  check("4) Save antigo sem instruções por setor migra para as 15 neutras:", r.quatro.todos && r.quatro.neutros, JSON.stringify(r.quatro));
  check("5) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
