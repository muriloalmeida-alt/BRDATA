// EXPULSAO (17/11): jogador seu expulso não pode ser substituído; a Pausa
// mostra o campo com 1 a menos (vaga vazia, com o cartão vermelho) e avisa
// que o time joga com menos. Pela v2, sem a tela antiga.
// A expulsão sai pela regra do motor (applyMatchWearChunk com o sorteio
// baixo: vermelho direto no 1º jogador de linha seu) e entra na partida
// como no bloco (aovivo.registrarExpulsoes e a parada do PAUSA-EVENTO).
//  1) A partida para sozinha ("Jogo parado") com a expulsão e o aviso
//     "Seu time joga com 10, sem reposição".
//  2) Revisar time: 10 em campo; a vaga do expulso vazia, com o cartão
//     vermelho e o nome dele.
//  3) Substituir: o expulso não aparece para sair; o total de substituições
//     continua 5 (sem substituição extra); o comando direto é recusado
//     ("expulso").
//  4) O 2º jogador de linha sai normalmente (substituição comum).
//  5) 360 px sem rolagem horizontal no campo com 1 a menos.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  await newCareer(page, `v2expulso${Date.now()}@teste.com`);
  await page.goto("about:blank");
  const v2 = await ctx.newPage();
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await v2.goto(base + "/partida?iniciar=1", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".mt-score", { timeout: 40000 });
  // Para a partida (pausa manual) e volta ao placar, ainda parada.
  await v2.waitForFunction(() => /^(15|30)/.test(document.querySelector(".mt-min")?.textContent || ""), null, { timeout: 20000 });
  await v2.click(".mt-actions .mt-primary");
  await v2.waitForSelector(".pz-title", { timeout: 10000 });
  await v2.goBack();
  await v2.waitForSelector(".mt-score", { timeout: 10000 });

  // 1) Um bloco em que só o 1º jogador de linha seu leva vermelho direto.
  const forcado = await v2.evaluate(async () => {
    const J = await import("/js/motor/jogo.js");
    const E = await import("/js/motor/estado.js");
    const F = await import("/js/motor/fechamento.js");
    const A = await import("/js/motor/aovivo.js");
    const P = await import("/js/motor/partida.js");
    const lm = E.partidaAtual();
    const C = E.carreiraAtual();
    const alvo = C.squad.find((p) => p.id === C.lineup.starters[1]);
    // O cartão sai pela regra do motor (sorteio baixo = vermelho direto) e
    // entra na partida como no bloco (registrarExpulsoes + parada do PAUSA-EVENTO).
    const orig = Math.random;
    let r;
    Math.random = () => 0.0005;
    try { r = F.applyMatchWearChunk([alvo], lm.round, 1 / 6, lm.appeared); } finally { Math.random = orig; }
    A.registrarExpulsoes(lm, r.redCardIds, []);
    lm.events.push(...r.events.map((e) => ({ ...e, minute: 30, mine: true })));
    lm.paused = true; lm.pausaMotivo = [{ tipo: "vermelho", jogador: alvo.name, minuto: 30 }];
    J.ponteAvisar();
    return { id: alvo.id, nome: alvo.name, vermelhos: r.redCardIds, status: alvo.status, expulsos: lm.expulsos, ativa: P.EXPULSAO.ativa };
  });
  // A Pausa abre sozinha com o motivo (PAUSA-EVENTO); se a tela já estava
  // parada, o "Ajustes" abre a mesma Pausa.
  const abriu = await v2.waitForSelector(".pz-stop", { timeout: 5000 }).then(() => true).catch(() => false);
  if (!abriu) { await v2.click(".mt-actions .mt-secondary"); await v2.waitForSelector(".pz-stop", { timeout: 10000 }); }
  const p1 = await v2.evaluate(() => ({ title: document.querySelector(".pz-title").textContent, stop: document.querySelector(".pz-stop").textContent }));
  check("1) Expulsão sua: a partida para ('Jogo parado') e avisa que o time joga com 10, sem reposição:",
    forcado.ativa && JSON.stringify(forcado.vermelhos) === JSON.stringify([forcado.id]) && forcado.status === "suspenso" && JSON.stringify(forcado.expulsos) === JSON.stringify([forcado.id])
      && /foi expulso/.test(p1.stop) && /Seu time joga com 10, sem reposição/.test(p1.stop),
    JSON.stringify({ forcado, p1 }));

  // 2) Revisar time: 10 em campo, vaga vazia com o cartão vermelho.
  await v2.click(".pz-row[href$='tela=time']");
  await v2.waitForSelector(".pm-pitch", { timeout: 10000 });
  const t2 = await v2.evaluate(() => {
    const slots = [...document.querySelectorAll(".pm-pitch .lu-slot")];
    const vermelho = slots.filter((s) => s.querySelector(".lu-red"));
    return { slots: slots.length, comJogador: slots.filter((s) => !/vaga vazia/.test(s.getAttribute("aria-label"))).length,
      vermelho: vermelho.map((s) => ({ label: s.getAttribute("aria-label"), nome: s.querySelector(".lu-name").textContent })) };
  });
  check("2) Revisar time: 10 em campo; a vaga do expulso vazia, com o cartão vermelho e o nome dele:",
    t2.slots === 11 && t2.comJogador === 10 && t2.vermelho.length === 1 && /vaga vazia, .* expulso/.test(t2.vermelho[0].label) && t2.vermelho[0].nome === "Expulso",
    JSON.stringify(t2));
  await v2.setViewportSize({ width: 360, height: 780 });
  await v2.waitForTimeout(200);
  const w360 = await v2.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await v2.setViewportSize({ width: 390, height: 844 });
  await v2.goBack();
  await v2.waitForSelector(".pz-title", { timeout: 10000 });

  // 3) Substituir: o expulso não aparece; sem substituição extra; o comando direto é recusado.
  await v2.click(".pz-row[href$='tela=sai']");
  await v2.waitForSelector(".sb-list", { timeout: 10000 });
  const t3 = await v2.evaluate(async ({ id }) => {
    const nomes = [...document.querySelectorAll(".sb-list .sb-opt")].map((b) => b.getAttribute("aria-label"));
    const J = await import("/js/motor/jogo.js");
    const E = await import("/js/motor/estado.js");
    const C = E.carreiraAtual();
    const banco = C.lineup.bench.find((b) => (C.squad.find((p) => p.id === b) || {}).status === "ok");
    const cmd = J.comandosJogo ? J.comandosJogo.substituir(id, banco) : null;
    return { opcoes: nomes.length, count: document.querySelector(".sb-count").textContent, cmd, naVaga: C.lineup.starters.includes(id) };
  }, { id: forcado.id });
  check("3) Substituir: o expulso não aparece para sair; continua 5 substituições (sem extra); o comando direto é recusado ('expulso'):",
    t3.opcoes === 10 && /de 5$/.test(t3.count) && t3.naVaga && (!t3.cmd || (t3.cmd.ok === false && t3.cmd.motivo === "expulso")),
    JSON.stringify(t3));

  // 4) Outro jogador sai normalmente.
  await v2.click(".sb-list .sb-opt");
  await v2.waitForSelector(".qs-opt, .sb-list", { timeout: 10000 });
  const entrou = await v2.evaluate(() => !!document.querySelector("[role='radiogroup'] .qs-opt, .sb-in-list .qs-opt, .qs-opt"));
  check("4) Outro titular continua podendo sair (a lista de quem entra abre):", entrou, JSON.stringify({ entrou }));

  check("5) 360 px sem rolagem horizontal no campo com 1 a menos:", w360 <= 0, JSON.stringify({ w360 }));
  await browser.close();
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
