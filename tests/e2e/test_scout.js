// Avaliação do olheiro (faixa de potencial): aparece para quem ainda tem
// espaço de crescimento e não aparece para quem já chegou ao teto.
// Lote L3d (12/11/2026, plano "testes sem a tela antiga"):
// - itens 1 e 2 (a regra da faixa: determinística, mínimo >= overall,
//   máximo <= 99, mínimo <= máximo; sem faixa sem espaço de crescimento)
//   foram para o domínio da v2 (carreira-v2/src/domain/potential.test.ts),
//   que também confere que a faixa é idêntica à do jogo;
// - itens 4 e 5 (detalhe do jogador): na ficha da v2, o fato "Potencial"
//   mostra a faixa do olheiro para o jovem da base e "Não avaliado" para
//   quem não tem espaço de crescimento;
// - o item 3 antigo (a faixa na linha da base, na lista do Elenco) não tem
//   equivalente: o Elenco da v2 mostra a faixa só na ficha. Registrado em
//   docs/carreira-v2/ENTREGA_TESTES_L3.md.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `scout${Date.now()}@teste.com`);

  const ids = await noMotor(page, async ({ CAREER, persistir }) => {
    const jovem = CAREER.squad.find((p) => p.origin === "base" && p.potential > p.overall && !p.scoutRevealed);
    const veterano = CAREER.squad.find((p) => p.origin === "principal");
    veterano.potential = veterano.overall; // sem espaço de crescimento, como um veterano de verdade
    await persistir();
    return { jovem: jovem.id, veterano: veterano.id, faixa: [jovem.overall, jovem.potential] };
  });
  const potencial = async (id) => {
    await page.goto(base + `/elenco/ficha?id=${encodeURIComponent(id)}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".cal-foot .cta", { timeout: 20000 });
    return page.evaluate(() => {
      const item = [...document.querySelectorAll(".wk-item")].find((d) => (d.querySelector("dt") || {}).textContent === "Potencial");
      return item ? item.querySelector("dd").textContent : null;
    });
  };

  const p4 = await potencial(ids.jovem);
  const m = /^(\d+)(?:–(\d+))?$/.exec(p4 || "");
  const lo = m ? Number(m[1]) : NaN, hi = m ? Number(m[2] || m[1]) : NaN;
  check("4) A ficha do jovem da base mostra a avaliação do olheiro (faixa de potencial, a partir do overall):",
    !!m && lo >= ids.faixa[0] && hi <= 99 && lo <= hi, JSON.stringify({ potencial: p4, overallEPotencial: ids.faixa }));

  const p5 = await potencial(ids.veterano);
  check("5) Jogador sem espaço de crescimento não tem avaliação do olheiro (\"Não avaliado\"):", p5 === "Não avaliado", p5);

  check("6) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
