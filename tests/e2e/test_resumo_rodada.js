// Resumo da rodada — lote L4d, sem a tela antiga. Junta o test_resumo_rodada
// e o test_s4_b3_006_resumo_rodada (os dois abriam o modal "Resumo da rodada"
// e o MatchCard da tela antiga). Na v2 os jogos da rodada aparecem na Tabela
// ("Resultados da rodada", a última disputada) e no pós-jogo (Resultados da
// rodada, no test_v2_posjogo item 3, com a Copa e os pênaltis no teste de
// unidade postmatch.test.ts). Aqui, a regra (CAREER.resultsByRound) e a
// Tabela:
//  1) Antes de jogar, a Tabela não tem "Resultados da rodada".
//  2) Rodada 1 jogada: o registro tem os 10 jogos, cada clube da divisão uma
//     vez, e o meu com o placar do registro de partidas.
//  3) A Tabela mostra os 10 jogos da rodada 1 com esses placares, o meu
//     primeiro.
//  4) Rodada 2 jogada: a Tabela passa a mostrar os jogos da rodada 2.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, jogarRodadaV2, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `resumo${Date.now()}@teste.com`);

  const tabela = async () => {
    await page.goto(base + "/tabela", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".tb-cup", { timeout: 30000 });
    return page.evaluate(() => ({ titulo: !!document.getElementById("tb-res-title"), jogos: [...document.querySelectorAll(".tb-res")].map((li) => li.getAttribute("aria-label")) }));
  };
  const registro = (rodada) => noMotor(page, ({ CAREER }, rodada) => {
    const nome = (id) => { const t = Object.values(CAREER.divisionTeams || {}).flat().find((x) => String(x.id) === String(id)); return t ? t.name : null; };
    const jogos = (CAREER.resultsByRound || {})[rodada] || [];
    const me = String(CAREER.clubId);
    const log = (CAREER.matchLog || []).find((m) => m.round === rodada && m.seasonYear === CAREER.seasonYear) || (CAREER.matchLog || [])[0];
    return {
      jogos: jogos.map((j) => ({ home: String(j.home), away: String(j.away), gh: j.gh, ga: j.ga })),
      clubes: Object.keys(CAREER.standings).length, me, log: log && { home: log.home, gh: log.gh, ga: log.ga },
      rotulos: jogos.map((j) => `${nome(j.home)} ${j.gh} a ${j.ga} ${nome(j.away)}`),
    };
  }, rodada);

  // 1) Antes de jogar.
  const t1 = await tabela();
  check("1) Antes de jogar, a Tabela não tem 'Resultados da rodada':", !t1.titulo && t1.jogos.length === 0, JSON.stringify(t1));

  // 2) Rodada 1.
  let r = await jogarRodadaV2(page); if (!r.ok) throw new Error("rodada 1: " + r.passos.join(" "));
  const g1 = await registro(1);
  const ids = g1.jogos.flatMap((j) => [j.home, j.away]);
  const meu = g1.jogos.find((j) => j.home === g1.me || j.away === g1.me);
  check("2) Rodada 1 jogada: 10 jogos no registro, cada clube uma vez, e o meu com o placar do registro de partidas:",
    g1.jogos.length === 10 && new Set(ids).size === 20 && g1.clubes === 20 && !!meu && !!g1.log && meu.gh === g1.log.gh && meu.ga === g1.log.ga && (meu.home === g1.me) === !!g1.log.home,
    JSON.stringify({ meu, log: g1.log, n: g1.jogos.length }));

  // 3) Tabela com a rodada 1.
  const t3 = await tabela();
  const mesmos = t3.jogos.length === 10 && g1.rotulos.every((l) => t3.jogos.includes(l));
  check("3) A Tabela mostra os 10 jogos da rodada 1 com esses placares, o meu primeiro:", t3.titulo && mesmos && t3.jogos[0] === g1.rotulos[g1.jogos.indexOf(meu)], JSON.stringify({ tabela: t3.jogos.slice(0, 3), registro: g1.rotulos.slice(0, 3) }));

  // 4) Rodada 2.
  r = await jogarRodadaV2(page); if (!r.ok) throw new Error("rodada 2: " + r.passos.join(" "));
  const g2 = await registro(2);
  const t4 = await tabela();
  check("4) Rodada 2 jogada: a Tabela passa a mostrar os jogos da rodada 2:", t4.jogos.length === 10 && g2.rotulos.every((l) => t4.jogos.includes(l)) && g2.rotulos.join() !== g1.rotulos.join(), JSON.stringify(t4.jogos.slice(0, 2)));

  check("5) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
