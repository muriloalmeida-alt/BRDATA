// CONSELHO-INTERVALO (16/11): a comissão técnica (se contratada) opina no
// intervalo, na Pausa do intervalo: tática pelo placar, cansaço e cartões,
// desempenho do 1º tempo e formação; conselho com mudança se aplica com um
// toque.
//  1) Sem comissão: a Pausa do intervalo convida a contratar.
//  2) Com comissão, perdendo e com um titular cansado: os 4 conselhos, com
//     "Partir para cima" e a troca do cansado pelo reserva da posição.
//  3) "Aplicar" na tática: os eixos mudam no jogo e o conselho vira "Já está
//     atacando".
//  4) "Aplicar" no cansaço: a substituição é feita (1 a mais usada).
//  5) "Começar 2º tempo" segue o jogo; 360 px sem rolagem horizontal.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, base, retomarParadasAutomaticas } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await retomarParadasAutomaticas(ctx);
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  await newCareer(page, `v2cons${Date.now()}@teste.com`);
  await noMotor(page, (M) => { M.CAREER.technicalStaff = { hired: false }; return M.persistir(); });
  await page.goto("about:blank");
  const v2 = await ctx.newPage();
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await v2.goto(base + "/partida?iniciar=1", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".mt-score", { timeout: 40000 });
  await v2.waitForFunction(() => (document.querySelector(".pz-title") || {}).textContent === "Intervalo", null, { timeout: 60000 });

  // 1) Sem comissão.
  const t1 = await v2.evaluate(() => ({ convite: (document.querySelector(".pz-advice-none") || {}).textContent || null, secao: !!document.querySelector(".pz-advice") }));
  check("1) Sem comissão, a Pausa do intervalo convida a contratar (sem conselhos):", /Contrate a comissão técnica/.test(t1.convite || "") && !t1.secao, JSON.stringify(t1));

  // 2) Comissão contratada, perdendo por 0 x 2 e um titular de linha cansado.
  const arranjo = await v2.evaluate(async () => {
    const E = await import("/js/motor/estado.js");
    const c = E.carreiraAtual(), lm = E.partidaAtual();
    c.technicalStaff = { hired: true };
    if (lm.isHome) { lm.gh = 0; lm.ga = 2; } else { lm.gh = 2; lm.ga = 0; }
    const banco = new Set(c.lineup.bench);
    const grupos = new Set(c.squad.filter((p) => banco.has(p.id) && p.status === "ok").map((p) => p.group));
    const alvo = c.lineup.starters.map((id) => c.squad.find((p) => p.id === id)).find((p) => p && p.status === "ok" && p.group !== "G" && grupos.has(p.group));
    alvo.condition = 40;
    // O amarelo pesa mais que o cansaço (prioridade da comissão): sem
    // amarelos do seu time, o conselho é o do cansado.
    const amarelos = lm.events.filter((e) => e.mine && e.type === "amarelo").length;
    lm.events = lm.events.filter((e) => !(e.mine && e.type === "amarelo"));
    return { amarelos, alvo: alvo.id, nome: alvo.name, subs: lm.subsUsed, eixos: { ...c.lineup.tactics } };
  });
  // Remonta a Pausa (os conselhos são lidos ao abrir).
  await v2.click('.pz-row[href$="tela=lances"]');
  await v2.waitForSelector(".ev-list", { timeout: 10000 });
  await v2.goBack();
  await v2.waitForSelector(".pz-advice", { timeout: 10000 });
  const lista = () => v2.evaluate(() => [...document.querySelectorAll(".pz-advice-item")].map((li) => ({ k: li.querySelector(".pz-advice-k").textContent, t: li.querySelector(".pz-advice-t").textContent, m: li.querySelector(".pz-advice-m").textContent, btn: !!li.querySelector(".pz-advice-btn") })));
  const l2 = await lista();
  const placar = l2.find((x) => x.k === "Tática pelo placar"), cans = l2.find((x) => x.k === "Cansaço e cartões");
  check("2) Com comissão, perdendo e com um titular cansado: 4 conselhos, 'Partir para cima' e a troca do cansado, com 'Aplicar':",
    l2.length === 4 && placar && placar.t === "Partir para cima" && placar.btn && cans && / no lugar de /.test(cans.t) && /cansado \(condição 40%\)/.test(cans.m) && cans.btn
      && l2.some((x) => x.k === "Desempenho" && /finaliza/.test(x.m)) && l2.some((x) => x.k === "Formação"),
    JSON.stringify(l2));

  // 3) Aplicar a tática.
  await v2.locator(".pz-advice-item", { hasText: "Tática pelo placar" }).locator(".pz-advice-btn").click();
  await v2.waitForSelector(".pz-advice .pr-ok", { timeout: 5000 });
  const r3 = await v2.evaluate(async () => (await import("/js/motor/estado.js")).carreiraAtual().lineup.tactics);
  const l3 = await lista();
  check("3) 'Aplicar' na tática: ritmo, pressão e linha 4 no jogo; o conselho vira 'Já está atacando':",
    r3.ritmo === 4 && r3.pressao === 4 && r3.linhaDefensiva === 4 && (l3.find((x) => x.k === "Tática pelo placar") || {}).t === "Já está atacando", JSON.stringify({ r3, placar: l3.find((x) => x.k === "Tática pelo placar") }));

  // 4) Aplicar o cansaço.
  await v2.locator(".pz-advice-item", { hasText: "Cansaço e cartões" }).locator(".pz-advice-btn").click();
  await v2.waitForFunction(() => /Feito: .* no lugar de/.test((document.querySelector(".pz-advice .pr-ok") || {}).textContent || ""), null, { timeout: 5000 });
  const r4 = await v2.evaluate(async (alvo) => { const E = await import("/js/motor/estado.js"); const c = E.carreiraAtual(), lm = E.partidaAtual(); return { emCampo: c.lineup.starters.includes(alvo), subs: lm.subsUsed, ev: lm.events.filter((e) => e.type === "substituicao").length }; }, arranjo.alvo);
  check("4) 'Aplicar' no cansaço: o cansado sai e o reserva entra (1 substituição a mais):", !r4.emCampo && r4.subs === arranjo.subs + 1 && r4.ev >= 1, JSON.stringify({ arranjo, r4 }));

  // 4b) Um titular com amarelo passa à frente de um cansado.
  const r4b = await v2.evaluate(async () => {
    const E = await import("/js/motor/estado.js");
    const C = await import("/js/motor/conselho.js");
    const c = E.carreiraAtual(), lm = E.partidaAtual();
    const emCampo = c.lineup.starters.map((id) => c.squad.find((p) => p.id === id)).filter((p) => p && p.status === "ok" && p.group !== "G");
    const [cansado, pendurado] = emCampo;
    cansado.condition = 30; pendurado.condition = 95;
    lm.events.push({ type: "amarelo", player: pendurado.name, playerId: pendurado.id, mine: true, minute: 30 });
    const a = C.conselhoCansaco(lm);
    return { resumo: a.resumo, motivo: a.motivo, sai: a.detalhe && a.detalhe.sai.id, pendurado: pendurado.id };
  });
  check("4b) A comissão tira primeiro quem tem amarelo (risco de expulsão), à frente de um cansado:",
    r4b.sai === r4b.pendurado && /amarelo/.test(r4b.motivo), JSON.stringify(r4b));

  // 5) 360 px e 2º tempo.
  await v2.setViewportSize({ width: 360, height: 780 });
  await v2.waitForTimeout(200);
  const w360 = await v2.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, small: [...document.querySelectorAll(".pz-advice button")].filter((b) => b.getBoundingClientRect().height < 44).length }));
  await v2.setViewportSize({ width: 390, height: 844 });
  await v2.click(".pz-foot .mt-primary");
  await v2.waitForFunction(() => /^(60|75|90)/.test(document.querySelector(".mt-min")?.textContent || "") || !!document.querySelector(".rs-title"), null, { timeout: 30000 });
  check("5) 'Começar 2º tempo' segue o jogo; 360 px sem rolagem horizontal e botões ≥ 44 px:", w360.overflow <= 0 && w360.small === 0, JSON.stringify(w360));

  await browser.close();
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
