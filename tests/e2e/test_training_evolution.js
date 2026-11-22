// Evolução pelo treino e pela idade — lote L5b, sem a tela antiga. As regras
// pelo motor na página da v2 (applyWeeklyTraining, applyNaturalAgingEvolution).
// As setas de tendência do detalhe da tela antiga saíram; a Evolução do
// jogador na v2 está no test_v2_tatica_treino item 8.
//  1) Titular de idade "prime" (overall abaixo de 80, com espaço até o
//     potencial) com um dia de treino técnico moderado: overall +2 e
//     condição −6; ataque e defesa não mudam (o técnico vai para o overall).
//     Acima de 80 cada ponto tem só 50% de chance (highBandGainFactor).
//  2) O plano do técnico não vale para a CPU: desde o PARIDADE-CPU E4, a CPU
//     treina pelo plano padrão dela, e o resultado dela é o mesmo com
//     qualquer plano seu.
//  3) Veterano (32+) que não jogou, com o sorteio sempre no ramo de declínio:
//     perde 1 em ataque, defesa, físico e overall na rodada.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `evolucaotreino${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  const r = await page.evaluate(() => {
    const T = (s) => JSON.parse(JSON.stringify(s));
    let p = CAREER.squad.find((x) => x.age >= 22 && x.age <= 29 && x.status === "ok" && CAREER.lineup.starters.includes(x.id));
    if (!p) { p = CAREER.squad.find((x) => x.age >= 22 && x.age <= 29 && x.status === "ok" && x.origin === "principal"); CAREER.lineup.starters[1] = p.id; }
    // Abaixo de 80 e com 15+ de espaço até o potencial o ganho é certo; acima
    // de 80 cada ponto tem só 50% (highBandGainFactor, motor/treino.js).
    p.overall = Math.min(p.overall, 75);
    p.potential = p.overall + 20;
    p.condition = 100;
    p.seasonGain = {};
    const antes = T(p);
    const cpuId = Object.keys(CAREER.leagueSquads)[0];
    const cpuAntes = T(CAREER.leagueSquads[cpuId][0]);
    // Só o dia 0: técnico, moderado, elenco principal; os outros dias sem foco
    // (o treino pula o dia, nem fadiga nem descanso), menos o jogo.
    CAREER.trainingPlan[0] = { foco: "tecnico", intensidade: "moderada", grupo: "principal" };
    for (let i = 1; i < 7; i++) if (i !== 5) CAREER.trainingPlan[i] = {};
    CAREER.trainingAppliedForRound = null;
    applyWeeklyTraining();
    const depois = T(p);
    const cpuDepois = T(CAREER.leagueSquads[cpuId][0]);
    // Veterano que não jogou, sorteio sempre no declínio.
    const v = CAREER.squad.find((x) => x.age >= 32 && x.origin === "principal" && x.id !== p.id) || CAREER.squad.find((x) => x.id !== p.id && x.origin === "principal");
    v.age = Math.max(v.age, 33);
    const vAntes = { atk: v.atk, def: v.def, phys: v.phys, overall: v.overall };
    const orig = Math.random;
    Math.random = () => 0.999;
    applyNaturalAgingEvolution([]);
    Math.random = orig;
    const vDepois = { atk: v.atk, def: v.def, phys: v.phys, overall: v.overall };
    return { antes: { overall: antes.overall, atk: antes.atk, def: antes.def, condition: antes.condition }, depois: { overall: depois.overall, atk: depois.atk, def: depois.def, condition: depois.condition },
      cpuIgual: ["atk", "def", "phys", "overall"].every((k) => cpuAntes[k] === cpuDepois[k]), vAntes, vDepois };
  });

  check("1) Titular prime, 1 dia técnico moderado: overall +2, condição −6; ataque e defesa iguais:",
    r.depois.overall === r.antes.overall + 2 && r.depois.condition === r.antes.condition - 6 && r.depois.atk === r.antes.atk && r.depois.def === r.antes.def, JSON.stringify({ antes: r.antes, depois: r.depois }));
  // 2) Mesmo sorteio, dois planos seus (técnico x descanso): a CPU fica igual.
  const r2 = await page.evaluate(() => {
    const T = (s) => JSON.parse(JSON.stringify(s));
    const cpuId = Object.keys(CAREER.leagueSquads)[0];
    const meuAntes = T(CAREER.squad), cpuAntes = T(CAREER.leagueSquads[cpuId]), planoAntes = T(CAREER.trainingPlan);
    const rodar = (foco) => {
      CAREER.squad.forEach((p, i) => Object.assign(p, T(meuAntes[i])));
      CAREER.leagueSquads[cpuId].forEach((p, i) => { Object.keys(p).forEach((k) => delete p[k]); Object.assign(p, T(cpuAntes[i])); });
      for (let i = 0; i < 7; i++) if (i !== 5) CAREER.trainingPlan[i] = { foco, intensidade: "alta", grupo: "principal" };
      CAREER.trainingAppliedForRound = null;
      const orig = Math.random; Math.random = () => 0;
      try { applyWeeklyTraining(); } finally { Math.random = orig; }
      return JSON.stringify(CAREER.leagueSquads[cpuId].map((p) => [p.overall, p.atk, p.def, p.phys, p.condition]));
    };
    const comTecnico = rodar("tecnico"), comDescanso = rodar("descanso");
    CAREER.trainingPlan.splice(0, CAREER.trainingPlan.length, ...planoAntes);
    return { igual: comTecnico === comDescanso };
  });
  check("2) O plano do técnico não vale para a CPU (o resultado dela é o mesmo com o seu plano técnico ou de descanso):", r2.igual, JSON.stringify(r2));
  check("3) Veterano que não jogou, sorteio no declínio: −1 em ataque, defesa, físico e overall:",
    ["atk", "def", "phys", "overall"].every((k) => r.vDepois[k] === r.vAntes[k] - 1), JSON.stringify({ antes: r.vAntes, depois: r.vDepois }));
  check("4) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
