// Patrocínio — lote L5c, sem a tela antiga. As regras pelo motor e pela
// ponte (patrocinios, assinarPatrocinio: os mesmos da tela Patrocínios da
// v2, que está no test_v2_clube item 4).
//  1) A carreira nasce com os contratos master e de material esportivo, com
//     valor por temporada.
//  2) Na virada, o contrato que vence (1 temporada restante) vira 3 propostas;
//     o outro (com mais tempo) continua.
//  3) Só o vencido tem propostas; assinar uma grava o contrato novo.
//  4) No fechamento do mês, o patrocínio entra no caixa, com o lançamento de
//     patrocínio no extrato.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `patrocinio${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  const r = await page.evaluate(async () => {
    const P = (await import("/js/motor/v2.js")).criarPonte();
    const s = CAREER.sponsorship;
    const out = { um: { master: s.master && s.master.valorTemporada, material: s.material && s.material.valorTemporada } };
    s.master.temporadasRestantes = 1;
    s.material.temporadasRestantes = 3;
    CAREER.currentRound = 39;
    CAREER.negativeSeasonsStreak = -99; // o teste mede o patrocínio, não a diretoria
    await advanceSeason();
    out.dois = { master: CAREER.sponsorship.master, propostas: (CAREER.sponsorProposals.master || []).length, material: !!CAREER.sponsorship.material };
    const p = await P.patrocinios();
    const t = (k) => p.tipos.find((x) => x.tipo === k);
    const a = await P.assinarPatrocinio("master", 0);
    out.tres = { masterPropostas: (t("master").propostas || []).length, materialPropostas: t("material").propostas, assinou: a.ok !== false, contrato: !!CAREER.sponsorship.master };
    const caixa0 = CAREER.finances.cash;
    const patro = () => (CAREER.financeLedger || []).filter((l) => /Patroc/i.test(l.label) && l.amount > 0).length;
    const n0 = patro();
    applyCalendarMonthlyFinances(3);
    out.quatro = { antes: n0, depois: patro(), caixaMudou: CAREER.finances.cash !== caixa0 };
    return out;
  });

  check("1) Nasce com os contratos master e de material esportivo, com valor por temporada:", r.um.master > 0 && r.um.material > 0, JSON.stringify(r.um));
  check("2) Na virada, o que vence vira 3 propostas; o outro continua:", r.dois.master === null && r.dois.propostas === 3 && r.dois.material, JSON.stringify(r.dois));
  check("3) Só o vencido tem propostas; assinar grava o contrato novo:", r.tres.masterPropostas === 3 && r.tres.materialPropostas === null && r.tres.assinou && r.tres.contrato, JSON.stringify(r.tres));
  check("4) No fechamento do mês o patrocínio entra no caixa, com o lançamento no extrato:", r.quatro.depois > r.quatro.antes && r.quatro.caixaMudou, JSON.stringify(r.quatro));
  check("5) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
