// Lesões — lote L5a, sem a tela antiga. As regras pelo motor na página da
// v2. As telas: a situação "Lesionado · volta na rodada N" no Elenco está no
// test_v2_elenco item 2, e o lesionado fora da lista de substitutos (com a
// marca na camisa) no test_v2_escalacao item 8.
//  1) 20 000 sorteios num time de 11: as 3 gravidades aparecem, na proporção
//     ~70% leve / 25% média / 5% grave, e há lesão de mais de 4 rodadas.
//  2) A chance de lesão do exausto (físico e condição baixos) é maior que a
//     do saudável.
//  3) Lesão grave atravessando a virada: na temporada nova o jogador volta a
//     "ok", sem rodada de retorno (antes era um defeito).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `lesoes${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  // 1) Distribuição.
  const st = await page.evaluate(() => {
    const time = () => Array.from({ length: 11 }, (_, i) => ({ id: `f${i}`, name: `Jogador ${i}`, group: "M", phys: 70, condition: 100, apps: 0, status: "ok", yellowCards: 0 }));
    const c = { leve: 0, media: 0, grave: 0, maxDur: 0 };
    for (let i = 0; i < 20000; i++) {
      const sq = time();
      simulatePlayerEvents(sq, 0, 1);
      sq.forEach((p) => { if (p.status === "contundido") { c[p.injurySeverity]++; c.maxDur = Math.max(c.maxDur, p.outUntilRound - 1); } });
    }
    return c;
  });
  const tot = st.leve + st.media + st.grave;
  const prop = { leve: +(st.leve / tot).toFixed(3), media: +(st.media / tot).toFixed(3), grave: +(st.grave / tot).toFixed(3) };
  check("1) 20 000 sorteios: as 3 gravidades na proporção ~70/25/5 e lesão de mais de 4 rodadas:",
    tot > 100 && Math.abs(prop.leve - 0.70) < 0.05 && Math.abs(prop.media - 0.25) < 0.05 && Math.abs(prop.grave - 0.05) < 0.03 && st.maxDur > 4, JSON.stringify({ ...st, prop }));

  // 2) Chance pelo físico e pela condição.
  const ch = await page.evaluate(() => ({ saudavel: injuryChanceFor({ phys: 85, condition: 100 }), exausto: injuryChanceFor({ phys: 40, condition: 30 }) }));
  check("2) A chance de lesão do exausto é maior que a do saudável:", ch.exausto > ch.saudavel, JSON.stringify(ch));

  // 3) Virada com lesão grave.
  const r3 = await page.evaluate(async () => {
    const p = CAREER.squad.find((x) => x.origin === "principal" && x.contractUntil > CAREER.seasonYear);
    p.status = "contundido"; p.outUntilRound = CAREER.currentRound + 14; p.injurySeverity = "grave";
    CAREER.currentRound = 39;
    CAREER.negativeSeasonsStreak = -99; // o teste mede a lesão, não a diretoria
    await advanceSeason();
    const d = CAREER.squad.find((x) => x.id === p.id);
    return d ? { status: d.status, volta: d.outUntilRound } : "saiu";
  });
  check("3) Lesão grave atravessando a virada: na temporada nova o jogador volta a 'ok', sem rodada de retorno:", r3 !== "saiu" && r3.status === "ok" && r3.volta == null, JSON.stringify(r3));

  check("4) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
