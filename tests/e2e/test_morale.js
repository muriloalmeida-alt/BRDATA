// Moral dos jogadores — lote L5a, sem a tela antiga. Junta o test_morale e o
// test_morale_season (que só imprimia as contas). Regras pelo motor e pela
// ponte na página da v2; a moral na tela, pelo Perfil do jogador da v2 (o
// card de moral da tela antiga foi removido antes, a pedido do usuário).
//  1) O elenco principal nasce com moral 70 (a base sobe treinando com o
//     principal na pré-temporada: +5 por dia no grupo misto, motor/treino.js).
//  2) O Perfil do jogador da v2 mostra a moral dele.
//  3) Depois da rodada 1: a moral dos titulares muda e quem ficou fora da
//     súmula (nem titular nem banco) cai 2 × o quanto ele reclama
//     (playerComplaintFactor, idade e overall). O teste antigo imprimia "68"
//     (70 − 2) sem verificar: era a regra antes do amortecimento.
//  4) Moral baixa (20): a renovação é recusada mesmo com salário 1,5× e 3
//     anos (ponte.renovar, a da v2).
//  5) Moral alta (90): o salário sugerido passa de 1,05× o atual e 1 ano é
//     recusado (quer mais tempo).
//  6) Virada de temporada (seasonMorale, motor/temporada.js): moral 100 com salário
//     justo volta rumo a 70 (91); mal pago (metade do justo) cai para 64; bem
//     pago (o dobro) sobe para 74.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, globaisDoMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `moral${Date.now()}@teste.com`);

  // 1) Nascem em 70.
  const r1 = await noMotor(page, ({ CAREER }) => ({ todos70: CAREER.squad.filter((p) => p.origin === "principal").every((p) => p.morale === 70), id: CAREER.squad.find((p) => p.origin === "principal").id }));
  check("1) O elenco principal nasce com moral 70:", r1.todos70);

  // 2) Perfil do jogador.
  await page.goto(base + "/elenco/jogador?id=" + encodeURIComponent(r1.id), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => /Moral/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
  const perfil = await page.evaluate(() => { const l = document.body.innerText.split("\n"); const i = l.findIndex((x) => x.trim() === "Moral"); return i >= 0 ? l[i + 1].trim() : null; });
  check("2) O Perfil do jogador da v2 mostra a moral dele (70):", perfil === "70", perfil);

  // 3) Rodada 1: a moral medida logo antes da partida (a semana, com o treino,
  // já passou) e logo depois.
  await globaisDoMotor(page);
  const r3 = await page.evaluate(async () => {
    const aovivo = await import("/js/motor/aovivo.js");
    const starters = CAREER.lineup.starters.filter(Boolean), bench = CAREER.lineup.bench.filter(Boolean);
    const na = new Set([...starters, ...bench]);
    const fora = CAREER.squad.filter((p) => !na.has(p.id) && p.origin === "principal").map((p) => ({ id: p.id, antes: p.morale, esperado: Math.max(0, Math.min(100, p.morale + Math.round(-2 * aovivo.playerComplaintFactor(p)))) }));
    const titAntes = starters.map((id) => CAREER.squad.find((p) => p.id === id).morale);
    const j = await jogarPartidaDaRodada();
    const m = (id) => CAREER.squad.find((p) => p.id === id).morale;
    return { ok: j.ok, passos: j.passos, titMudou: starters.some((id, i) => m(id) !== titAntes[i]), fora: fora.map((f) => ({ ...f, depois: m(f.id) })) };
  });
  check("3) Depois da rodada 1: a moral dos titulares muda e quem ficou fora da súmula cai 2 × o quanto reclama:",
    r3.ok && r3.titMudou && r3.fora.length > 0 && r3.fora.every((f) => f.depois === f.esperado && f.depois < f.antes), JSON.stringify(r3.fora.slice(0, 4)));

  // 4 e 5) Renovação pela moral.
  const r4 = await noMotor(page, async ({ CAREER, ponte, clube }) => {
    const principal = CAREER.squad.filter((p) => p.origin === "principal");
    const limpa = async () => { const c = ponte.coletivaAtual(); if (c.ok) await ponte.responderColetiva(c.respostas[0].letra); };
    const baixa = principal[0];
    baixa.morale = 20; baixa.contractUntil = CAREER.seasonYear;
    const ren4 = await ponte.renovar(baixa.id, Math.round(baixa.wage * 1.5), 3);
    await limpa();
    const alta = principal[1];
    alta.morale = 90; alta.contractUntil = CAREER.seasonYear;
    const sugerido = clube.suggestedRenewalWage(alta);
    const ren5 = await ponte.renovar(alta.id, sugerido, 1);
    await limpa();
    return { ren4, ren5, sugerido, wage: alta.wage };
  });
  check("4) Moral 20: a renovação é recusada mesmo com salário 1,5× e 3 anos:", r4.ren4.ok && r4.ren4.aceita === false && /infeliz/.test(r4.ren4.motivo), JSON.stringify(r4.ren4));
  check("5) Moral 90: o salário sugerido passa de 1,05× e 1 ano é recusado (quer mais tempo):", r4.sugerido > 1.05 * r4.wage && r4.ren5.ok && r4.ren5.aceita === false && /mais longo/.test(r4.ren5.motivo), JSON.stringify({ sugerido: r4.sugerido, wage: r4.wage, ren5: r4.ren5 }));

  // 6) Virada de temporada.
  await globaisDoMotor(page);
  const r6 = await page.evaluate(() => {
    const principal = CAREER.squad.filter((p) => p.origin === "principal");
    const [a, b, c] = principal.slice(2, 5);
    a.morale = 100; a.wage = fairWageFor(a);
    b.morale = 70; b.wage = Math.round(fairWageFor(b) * 0.5);
    c.morale = 70; c.wage = Math.round(fairWageFor(c) * 2);
    [a, b, c].forEach((p) => { p.morale = seasonMorale(p); }); // o que a virada aplica a cada jogador (motor/temporada.js)
    return { teto: a.morale, malPago: b.morale, bemPago: c.morale };
  });
  check("6) Virada: moral 100 com salário justo vai a 91; mal pago cai a 64; bem pago sobe a 74:", r6.teto === 91 && r6.malPago === 64 && r6.bemPago === 74, JSON.stringify(r6));

  check("7) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
