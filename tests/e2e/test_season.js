// Virada de temporada (lote L4a, sem a tela antiga). O teste antigo pulava
// para o fim da temporada, forçava 3 contratos a vencer e só imprimia o
// "depois". Agora, pelo comando da virada no motor da página da v2
// (proximaTemporada, o "Continuar" do Encerramento da v2), as mesmas
// situações viram verificações:
//  1) Ano + 1, rodada 1, tabela zerada e a temporada encerrada no histórico.
//  2) Os 3 com contrato vencendo saem do elenco (ou renovam com contrato
//     novo); quem fica envelhece 1 ano.
//  3) O Início da v2 mostra a temporada nova (rodada 1) depois de recarregar.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, base, skipAutoOpen } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `season${Date.now()}@teste.com`);

  const r = await noMotor(page, async ({ CAREER, ponte }) => {
    CAREER.currentRound = 39;
    const vencendo = CAREER.squad.slice(0, 3).map((p) => { p.contractUntil = CAREER.seasonYear; return { id: p.id, name: p.name }; });
    const idades = Object.fromEntries(CAREER.squad.map((p) => [p.id, p.age]));
    const ano = CAREER.seasonYear;
    const hist = (CAREER.seasonHistory || []).length;
    const v = await ponte.proximaTemporada();
    const ficaram = CAREER.squad.filter((p) => idades[p.id] != null);
    return {
      v, ano, hist,
      depois: { ano: CAREER.seasonYear, rodada: CAREER.currentRound, hist: (CAREER.seasonHistory || []).length, histAno: (CAREER.seasonHistory || [])[0] && CAREER.seasonHistory[0].year,
        tabelaZerada: Object.values(CAREER.standings).every((s) => s.j === 0 && s.pts === 0) },
      vencendo: vencendo.map((x) => { const p = CAREER.squad.find((q) => q.id === x.id); return { ...x, ficou: !!p, contrato: p ? p.contractUntil : null }; }),
      envelheceram: ficaram.every((p) => p.age === idades[p.id] + 1), ficaram: ficaram.length,
    };
  });
  check("1) Virada: ano + 1, rodada 1, tabela zerada e a temporada encerrada no histórico:",
    r.v.ok && r.v.demitido === false && r.depois.ano === r.ano + 1 && r.depois.rodada === 1 && r.depois.tabelaZerada && r.depois.hist === r.hist + 1 && r.depois.histAno === r.ano,
    JSON.stringify({ v: { ok: r.v.ok, ano: r.v.ano, saidas: r.v.saidas }, depois: r.depois }));
  check("2) Os 3 com contrato vencendo saem do elenco (ou ficam com contrato novo, depois do ano que acabou); quem fica envelhece 1 ano:",
    r.vencendo.every((x) => (!x.ficou && r.v.saidas.includes(x.name)) || (x.ficou && x.contrato > r.ano)) && r.vencendo.some((x) => !x.ficou) && r.envelheceram && r.ficaram > 0,
    JSON.stringify({ vencendo: r.vencendo, envelheceram: r.envelheceram }));

  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await skipAutoOpen(page);
  await page.waitForSelector(".home", { timeout: 20000 });
  const linha = await page.evaluate(() => document.querySelector(".home-date")?.textContent || "");
  check("3) Depois de recarregar, o Início da v2 está na temporada nova (rodada 1):", /RODADA 1$/.test(linha), linha);

  check("4) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
