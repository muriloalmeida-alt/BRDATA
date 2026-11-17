// PAUSA-EVENTO (15/11): lesão ou expulsão de um jogador SEU para a partida
// como a pausa manual e abre a Pausa sozinha, com o motivo no topo
// ("Jogo parado"). Lesão ou expulsão do adversário não para o jogo.
// O lance é forçado num bloco do motor (o mesmo resolveLiveChunk da partida),
// com o sorteio preso num valor baixo: todo jogador em campo é expulso.
//  1) Pausa manual: "Partida pausada", sem faixa de motivo.
//  2) Bloco com expulsões: a partida para sozinha e a Pausa abre sozinha,
//     "Jogo parado", com uma linha por jogador seu expulso (e nenhuma do
//     adversário), o aviso de que o time joga com menos (EXPULSAO, 17/11)
//     e as mesmas opções da pausa manual.
//  3) Retomar limpa o motivo; uma pausa manual depois volta sem faixa.
//  4) "Pular para o fim" com o mesmo sorteio não para: a partida termina.
//  5) 360 px sem rolagem horizontal.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  await newCareer(page, `v2pzev${Date.now()}@teste.com`);
  await page.goto("about:blank");
  const v2 = await ctx.newPage();
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await v2.goto(base + "/partida?iniciar=1", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".mt-score", { timeout: 40000 });
  await v2.waitForFunction(() => /^(15|30)/.test(document.querySelector(".mt-min")?.textContent || ""), null, { timeout: 20000 });
  const pausa = () => v2.evaluate(() => ({ search: location.search, title: (document.querySelector(".pz-title") || {}).textContent || null, stop: (document.querySelector(".pz-stop") || {}).textContent || null,
    rows: [...document.querySelectorAll(".pz-row .row-title")].map((r) => r.textContent), cta: (document.querySelector(".pz-foot .mt-primary") || {}).textContent || null }));

  // 1) Pausa manual.
  await v2.click(".mt-actions .mt-primary");
  await v2.waitForSelector(".pz-title", { timeout: 10000 });
  const p1 = await pausa();
  check("1) Pausa manual: 'Partida pausada', sem faixa de motivo:", p1.title === "Partida pausada" && !p1.stop, JSON.stringify(p1));

  // 2) Volta à partida (ainda parada) e roda um bloco com expulsões forçadas.
  await v2.goBack();
  await v2.waitForSelector(".mt-score", { timeout: 10000 });
  const forcado = await v2.evaluate(async () => {
    const J = await import("/js/motor/jogo.js");
    const E = await import("/js/motor/estado.js");
    const lm = E.partidaAtual();
    const antes = lm.events.length;
    const orig = Math.random;
    Math.random = () => 0.0005;
    try { J.resolveLiveChunk(); } finally { Math.random = orig; }
    const novos = lm.events.slice(antes);
    return { paused: lm.paused, halftime: !!lm.halftime, motivo: lm.pausaMotivo,
      meus: novos.filter((e) => e.mine && (e.type === "vermelho" || e.type === "lesao")).map((e) => e.player),
      deles: novos.filter((e) => !e.mine && (e.type === "vermelho" || e.type === "lesao")).length };
  });
  await v2.waitForFunction(() => /tela=pausa/.test(location.search) && !!document.querySelector(".pz-stop"), null, { timeout: 15000 });
  const p2 = await pausa();
  // EXPULSAO (17/11): depois das linhas dos expulsos, o aviso de que o time joga com menos.
  const todas = (p2.stop || "").split(" · ");
  const aviso = todas.filter((l) => /^Seu time joga com \d+, sem reposição$/.test(l));
  const linhas = todas.filter((l) => !aviso.includes(l));
  await v2.setViewportSize({ width: 360, height: 780 });
  await v2.waitForTimeout(200);
  const w360 = await v2.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await v2.setViewportSize({ width: 390, height: 844 });
  check("2) Expulsão dos seus: a partida para e a Pausa abre sozinha, 'Jogo parado', uma linha por jogador seu (nenhuma do adversário), mesmas opções da manual:",
    forcado.paused && forcado.motivo && forcado.motivo.length === forcado.meus.length && forcado.meus.length > 0 && forcado.deles > 0
      && p2.search === "?tela=pausa" && p2.title === (forcado.halftime ? "Intervalo" : "Jogo parado") && linhas.length === forcado.meus.length && linhas.every((l) => /foi expulso \(\d+’\)/.test(l)) && aviso.length === 1
      && JSON.stringify(p2.rows) === JSON.stringify(p1.rows),
    JSON.stringify({ forcado: { ...forcado, motivo: (forcado.motivo || []).length }, p2: { ...p2, stop: linhas.length, aviso } }));

  // 3) Retomar limpa o motivo; pausa manual depois, sem faixa.
  await v2.click(".pz-foot .mt-primary");
  await v2.waitForSelector(".mt-score", { timeout: 10000 });
  const motivo3 = await v2.evaluate(async () => ((await import("/js/motor/estado.js")).partidaAtual() || {}).pausaMotivo || null);
  await v2.click(".mt-actions .mt-primary");
  await v2.waitForSelector(".pz-title", { timeout: 10000 });
  const p3 = await pausa();
  check("3) Retomar limpa o motivo; uma pausa manual depois volta sem faixa:", motivo3 === null && p3.title === "Partida pausada" && !p3.stop, JSON.stringify({ motivo3, p3 }));

  // 4) Pular para o fim com o mesmo sorteio: não para no caminho.
  const r4 = await v2.evaluate(async () => {
    const J = await import("/js/motor/jogo.js");
    const E = await import("/js/motor/estado.js");
    const lm = E.partidaAtual();
    const orig = Math.random;
    Math.random = () => 0.0005;
    try { J.skipLiveMatch(); } finally { Math.random = orig; }
    return { finished: !!lm.finished, motivo: lm.pausaMotivo || null };
  });
  await v2.goBack();
  await v2.waitForSelector(".rs-title", { timeout: 30000 }).catch(() => {}); // Resultado
  const fim = await v2.evaluate(() => ({ path: location.pathname + location.search, encerrado: !!document.querySelector(".rs-title") }));
  check("4) 'Pular para o fim' não para por lesão ou expulsão: a partida termina (Resultado):", r4.finished && !r4.motivo && fim.encerrado, JSON.stringify({ r4, fim }));

  check("5) Pausa com a faixa em 360 px sem rolagem horizontal:", w360 <= 0, String(w360));
  await browser.close();
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
