// Meus esquemas (formação, titulares, banco e táticas juntos) — lote L5b, sem
// a tela antiga. As regras pela ponte (esquemas, salvarEsquema, aplicarEsquema,
// excluirEsquema, escalarAutomaticamente: os mesmos comandos das telas da v2;
// a tela Esquemas está no test_v2_tatica_treino item 4).
//  1) Começa sem esquemas, com o limite de 8.
//  2) Salvar "Retranca fora" (5-3-2, pressão 1): fica na lista e ativo.
//  3) Mexer na escalação depois de salvar desvincula (sem esquema ativo).
//  4) Aplicar o esquema volta formação e táticas inteiras e o deixa ativo.
//  5) Nome repetido é recusado.
//  6) Excluir volta ao vazio.
//  7) Com 8 esquemas, o 9º é recusado com o aviso do limite.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `esquemas${Date.now()}@teste.com`);

  const r = await noMotor(page, async ({ CAREER, ponte }) => {
    const out = {};
    const e0 = ponte.esquemas();
    out.um = { n: e0.lista.length, max: e0.max, ativo: e0.ativo };
    CAREER.lineup.formation = "5-3-2";
    CAREER.lineup.tactics.pressao = 1;
    const s2 = await ponte.salvarEsquema("Retranca fora");
    const e2 = ponte.esquemas();
    out.dois = { s2, n: e2.lista.length, nome: e2.lista[0] && e2.lista[0].nome, formacao: e2.lista[0] && e2.lista[0].formacao, ativo: e2.ativo === (e2.lista[0] && e2.lista[0].id) };
    const id = e2.lista[0].id;
    CAREER.lineup.formation = "4-3-3";
    CAREER.lineup.tactics.pressao = 4;
    await ponte.escalarAutomaticamente(false);
    out.tres = { ativo: ponte.esquemas().ativo };
    const s4 = await ponte.aplicarEsquema(id);
    out.quatro = { s4, formacao: CAREER.lineup.formation, pressao: CAREER.lineup.tactics.pressao, ativo: ponte.esquemas().ativo === id };
    out.cinco = await ponte.salvarEsquema("retranca FORA");
    const s6 = await ponte.excluirEsquema(id);
    out.seis = { s6, n: ponte.esquemas().lista.length };
    for (let i = 0; i < 8; i++) await ponte.salvarEsquema(`Esquema ${i}`);
    const s7 = await ponte.salvarEsquema("Esquema 9");
    out.sete = { s7, n: ponte.esquemas().lista.length };
    return out;
  });

  check("1) Começa sem esquemas, com limite de 8:", r.um.n === 0 && r.um.max === 8 && r.um.ativo === null, JSON.stringify(r.um));
  check("2) Salvar 'Retranca fora' (5-3-2): na lista e ativo:", r.dois.s2.ok !== false && r.dois.n === 1 && r.dois.nome === "Retranca fora" && r.dois.formacao === "5-3-2" && r.dois.ativo, JSON.stringify(r.dois));
  check("3) Mexer na escalação depois de salvar desvincula:", r.tres.ativo === null, JSON.stringify(r.tres));
  check("4) Aplicar volta formação e táticas e deixa ativo:", r.quatro.s4.ok !== false && r.quatro.formacao === "5-3-2" && r.quatro.pressao === 1 && r.quatro.ativo, JSON.stringify(r.quatro));
  check("5) Nome repetido (sem diferenciar maiúsculas) é recusado:", r.cinco.ok === false && r.cinco.motivo === "nome-repetido", JSON.stringify(r.cinco));
  check("6) Excluir volta ao vazio:", r.seis.s6.ok !== false && r.seis.n === 0, JSON.stringify(r.seis));
  check("7) Com 8 esquemas, o 9º é recusado com o aviso do limite:", r.sete.n === 8 && r.sete.s7.ok === false && /limite/i.test(r.sete.s7.mensagem || ""), JSON.stringify(r.sete));
  check("8) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
