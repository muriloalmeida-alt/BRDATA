// PARIDADE-CPU · A14 (17/11): os elencos da CPU encolhiam a cada virada. Na
// virada (motor/temporada.js, renewLeagueSquad), a CPU renova o contrato
// vencido de quem tem até 32 anos e overall pelo menos igual à média do
// elenco, ou de quem falta para cobrir a posição; repõe até o tamanho que o
// elenco tinha, e o gerado nasce com contrato contado do ano da carreira, na
// posição e perto do overall de quem saiu (calibração).
// Uso: node tests/unit/test_motor_a14.js   (sai com 1 se algo falhar)
const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");

let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`); }
}
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const ANO = 2025; // ano da temporada nova (a virada já passou)
const jog = (id, group, overall, age, contractUntil, extra = {}) => ({ id, name: id, group, overall, atk: overall, def: overall, phys: 70, age: age - 1, potential: overall, contractUntil, wage: 10000, value: 100000, origin: "principal", real: true, status: "ok", ...extra });
// Elenco de 20 com cobertura folgada (G 3, D 7, M 6, F 4), overall médio ~70.
function elenco(extra = []) {
  const base = [];
  ["G", "G", "G"].forEach((g, i) => base.push(jog(`g${i}`, g, 70, 26, ANO + 1)));
  for (let i = 0; i < 7; i++) base.push(jog(`d${i}`, "D", 70, 26, ANO + 1));
  for (let i = 0; i < 6; i++) base.push(jog(`m${i}`, "M", 70, 26, ANO + 1));
  for (let i = 0; i < 4; i++) base.push(jog(`f${i}`, "F", 70, 26, ANO + 1));
  return [...base, ...extra];
}
const env = { firstNames: ["Ana", "Bia"], lastNames: ["Silva", "Souza"], liveSeason: ANO };
const club = { id: "x", atk: 1.1, def: 0.9 };

(async () => {
  const T = await import(pathToFileURL(path.join(__dirname, "..", "..", "public", "js", "motor", "temporada.js")).href);
  const renovar = (squad, o = {}) => T.renewLeagueSquad({ club, squad, seasonYear: ANO, minSize: 16, evoRng: () => 0.5, rng: seeded(7), env, ...o });

  await check("Regra ligada por padrão; cobertura mínima G 2, D 6, M 6, F 4; até 32 anos", () => {
    assert.strictEqual(T.RENOVACAO_CPU.ativa, true);
    assert.deepStrictEqual(T.RENOVACAO_CPU.cobertura, { G: 2, D: 6, M: 6, F: 4 });
    assert.strictEqual(T.RENOVACAO_CPU.idadeMax, 32);
  });

  await check("Contrato vencido: renova quem tem até 32 anos e overall ≥ média (contrato novo e salário de mercado); sai o mais velho e o abaixo da média", () => {
    const bom = jog("bom", "M", 78, 28, ANO - 1), velho = jog("velho", "M", 80, 33, ANO - 1), fraco = jog("fraco", "M", 60, 24, ANO - 1);
    const novo = renovar(elenco([bom, velho, fraco]));
    const b = novo.find((p) => p.id === "bom");
    assert.ok(b && b.contractUntil >= ANO && b.contractUntil <= ANO + 3, `renovado até ${b && b.contractUntil}`);
    assert.strictEqual(b.wage, T.computeContractFields(b.overall, b.age, b.potential, () => 0.5, 0).wage, "salário de mercado");
    assert.ok(!novo.some((p) => p.id === "velho"), "33 anos sai");
    assert.ok(!novo.some((p) => p.id === "fraco"), "abaixo da média sai");
  });

  await check("Cobertura: sem renovar, a posição ficaria abaixo do mínimo — renova os melhores da posição até cobrir, mesmo velhos ou fracos", () => {
    // Só 1 goleiro com contrato; 2 vencidos (33 anos e fraco): renova 1 (o melhor) para chegar a 2.
    const sq = elenco().filter((p) => p.group !== "G");
    sq.push(jog("g-ok", "G", 70, 26, ANO + 1), jog("g-velho", "G", 66, 34, ANO - 1), jog("g-fraco", "G", 55, 30, ANO - 1));
    const r = T.renovacoesDaCpu(sq.map((p) => ({ ...p, age: p.age + 1 })), ANO);
    assert.deepStrictEqual([...r], ["g-velho"]);
  });

  await check("Reposição até o tamanho que o elenco tinha; gerado com contrato do ano da carreira e id único", () => {
    const sq = elenco([jog("v1", "D", 60, 34, ANO - 1), jog("v2", "M", 60, 34, ANO - 1), jog("gen_x_0", "F", 60, 25, ANO + 2, { real: false })]);
    const novo = renovar(sq);
    assert.strictEqual(novo.length, sq.length);
    const gerados = novo.filter((p) => !sq.some((q) => q.id === p.id));
    assert.strictEqual(gerados.length, 2);
    gerados.forEach((p) => assert.ok(p.contractUntil >= ANO + 1 && p.contractUntil <= ANO + 4, `contrato ${p.contractUntil}`));
    assert.strictEqual(new Set(novo.map((p) => p.id)).size, novo.length, "ids únicos");
  });

  await check("Calibração: quem repõe nasce na posição de quem saiu e perto do overall dele (−3 a +2), com contrato do ano da carreira", () => {
    const sairam = [jog("s1", "G", 81, 35, ANO - 1), jog("s2", "F", 64, 30, ANO - 1)];
    const sq = elenco(sairam);
    const novo = renovar(sq);
    const gerados = novo.filter((p) => !sq.some((q) => q.id === p.id));
    assert.strictEqual(gerados.length, 2);
    gerados.forEach((p, i) => {
      assert.strictEqual(p.group, sairam[i].group);
      assert.ok(p.overall >= sairam[i].overall - 3 && p.overall <= sairam[i].overall + 2, `${p.overall} perto de ${sairam[i].overall}`);
      assert.strictEqual(p.wage, T.computeContractFields(p.overall, p.age, p.potential, () => 0.5, 0).wage, "salário de mercado do novo nível");
      assert.ok(p.contractUntil >= ANO + 1 && p.contractUntil <= ANO + 4);
    });
  });

  await check("Elenco pequeno continua repondo até o mínimo", () => {
    const sq = elenco().slice(0, 10).map((p, i) => (i < 3 ? { ...p, contractUntil: ANO - 1, age: 40 } : p));
    assert.strictEqual(renovar(sq).length, 16);
  });

  await check("Regra desligada (só os testes de equivalência): ninguém renova e repõe só até o mínimo", () => {
    T.RENOVACAO_CPU.ativa = false;
    try {
      const sq = elenco([jog("bom", "M", 78, 28, ANO - 1)]);
      const novo = renovar(sq);
      assert.ok(!novo.some((p) => p.id === "bom"));
      assert.strictEqual(novo.length, 20, "20 com contrato, acima do mínimo de 16");
      assert.strictEqual(T.renovacoesDaCpu(sq, ANO).size, 0);
    } finally { T.RENOVACAO_CPU.ativa = true; }
  });

  console.log(failed ? `\n${failed}/${n} falharam` : `\n${n}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
