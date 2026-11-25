// TETO-CAIXA (15/11): o técnico aumenta o teto salarial com o caixa. Cada
// R$ 1 a mais no teto (por mês) sai 12× do caixa; devolve-se só o que foi
// reservado na temporada; o caixa guarda 1 mês de folha; na virada o teto é
// recalculado e o reservado zera.
//  1) Finanças → "Ajustar teto com o caixa": a tela mostra teto, folha, caixa
//     e reservado iguais ao save.
//  2) Aumentar R$ 100 mil: prévia (novo teto, sai R$ 1,2 mi, caixa depois);
//     confirmar grava teto +100 mil, caixa −1,2 mi, reservado 100 mil e o
//     lançamento no extrato.
//  3) Acima do limite: a tela explica e não deixa confirmar; pela ponte,
//     recusa "caixa" e nada muda.
//  4) Devolver R$ 40 mil volta R$ 480 mil; devolver mais que o reservado é
//     recusado.
//  5) O teto novo libera a promoção que antes estourava o teto.
//  6) Virada: o teto é recalculado (folha × 1,35; na economia v5, pela faixa
//     da folha) e o reservado zera, sem
//     dinheiro de volta.
//  7) Save antigo sem o campo abre com reservado 0.
//  8) 360 px sem rolagem horizontal.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, noMotor, saveNoServidor, globaisDoMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await carreiraV2(page, `teto${Date.now()}@teste.com`);
  const folhaDe = (c) => c.squad.filter((p) => p.origin === "principal" || p.origin === "loan").reduce((s, p) => s + (p.wage || 0), 0);
  const tela = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll(".wk-item")].map((i) => [i.querySelector("dt").textContent, i.querySelector("dd").textContent])));
  const fmt = (v) => page.evaluate((v) => {
    const abs = Math.abs(v); if (abs >= 1e6) return `R$ ${(abs / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
    if (abs >= 1e3) return `R$ ${(abs / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`; return `R$ ${abs}`;
  }, v);
  const abrir = async () => {
    await page.goto(base + "/financas/teto", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#tc-v", { timeout: 30000 });
  };

  // 1) Pelas Finanças.
  await page.goto(base + "/financas", { waitUntil: "domcontentloaded" });
  await page.locator("a.row", { hasText: "Ajustar teto com o caixa" }).click();
  await page.waitForSelector("#tc-v", { timeout: 30000 });
  const c0 = await saveNoServidor(page);
  const t1 = await tela();
  check("1) Finanças → 'Ajustar teto com o caixa' mostra teto, folha, caixa e reservado do save:",
    new URL(page.url()).pathname === "/financas/teto" && t1["Teto salarial"] === `${await fmt(c0.finances.wageCap)}/mês` && t1["Folha salarial"] === `${await fmt(folhaDe(c0))}/mês`
      && t1["Caixa"] === await fmt(c0.finances.cash) && /^R\$ 0\/mês$/.test(t1["Reservado nesta temporada"]),
    JSON.stringify({ t1, teto: c0.finances.wageCap, caixa: c0.finances.cash, folha: folhaDe(c0) }));

  // 2) Aumentar 100 mil.
  await page.fill("#tc-v", "100");
  await page.waitForSelector("#tc-p", { timeout: 5000 });
  const prev = await tela();
  await page.click(".cal-foot .cta");
  await page.waitForSelector(".pr-ok", { timeout: 15000 });
  const msg2 = await page.evaluate(() => document.querySelector(".pr-ok").textContent);
  const c2 = await saveNoServidor(page);
  const l2 = (c2.financeLedger || [])[0] || {};
  check("2) Aumentar R$ 100 mil: prévia certa; grava teto +100 mil, caixa −1,2 mi, reservado 100 mil e o lançamento no extrato:",
    prev["Novo teto"] === `${await fmt(c0.finances.wageCap + 100000)}/mês` && prev["Sai do caixa"] === "R$ 1,2 mi" && prev["Caixa depois"] === await fmt(c0.finances.cash - 1200000)
      && c2.finances.wageCap === c0.finances.wageCap + 100000 && c2.finances.cash === c0.finances.cash - 1200000 && c2.finances.wageCapBought === 100000
      && l2.type === "salario" && l2.amount === -1200000 && /Reserva para salários \(teto \+R\$\s?100\.000/.test(l2.label) && /Saíram R\$ 1,2 mi do caixa/.test(msg2),
    JSON.stringify({ prev, msg2, fin: c2.finances, l2 }));

  // 3) Acima do limite.
  await abrir();
  const info3 = await noMotor(page, (M) => M.ponte.tetoSalarial());
  await page.fill("#tc-v", String(info3.maxUp / 1000 + 1));
  await page.waitForSelector(".sp-why", { timeout: 5000 });
  const t3 = await page.evaluate(() => ({ why: document.querySelector(".sp-why").textContent, dis: document.querySelector(".cal-foot .cta").getAttribute("aria-disabled") }));
  const r3 = await noMotor(page, (M, d) => M.ponte.ajustarTeto(d), info3.maxUp + 1000);
  const c3 = await saveNoServidor(page);
  check("3) Acima do limite (caixa precisa guardar 1 mês de folha): a tela explica e bloqueia; a ponte recusa e nada muda:",
    info3.maxUp === Math.floor((info3.caixa - info3.folha) / 12 / 1000) * 1000 && /1 mês de folha/.test(t3.why) && t3.dis === "true"
      && r3.ok === false && r3.motivo === "caixa" && c3.finances.cash === c2.finances.cash && c3.finances.wageCap === c2.finances.wageCap,
    JSON.stringify({ info3, t3, r3 }));

  // 4) Devolver.
  await page.click('[role="radio"]:has-text("Devolver")');
  await page.fill("#tc-v", "40");
  await page.waitForSelector("#tc-p", { timeout: 5000 });
  await page.click(".cal-foot .cta");
  await page.waitForSelector(".pr-ok", { timeout: 15000 });
  const c4 = await saveNoServidor(page);
  const r4 = await noMotor(page, (M) => M.ponte.ajustarTeto(-70000));
  check("4) Devolver R$ 40 mil volta R$ 480 mil ao caixa; devolver mais que o reservado (60 mil) é recusado:",
    c4.finances.wageCap === c2.finances.wageCap - 40000 && c4.finances.cash === c2.finances.cash + 480000 && c4.finances.wageCapBought === 60000
      && (c4.financeLedger[0] || {}).amount === 480000 && r4.ok === false && r4.motivo === "reservado",
    JSON.stringify({ fin: c4.finances, l: c4.financeLedger[0], r4 }));

  // 5) O teto novo libera a promoção. Teto encostado na folha; um da base.
  const r5 = await noMotor(page, async (M) => {
    const C = M.CAREER;
    const folha = C.squad.filter((p) => p.origin === "principal" || p.origin === "loan").reduce((s, p) => s + (p.wage || 0), 0);
    const jovem = C.squad.find((p) => p.origin === "base" && p.wage > 0);
    C.finances.wageCap = folha; C.finances.wageCapBought = 0; C.finances.cash = Math.max(C.finances.cash, folha * 3 + jovem.wage * 24);
    const antes = await M.ponte.acaoJogador(jovem.id, "promote");
    const aumento = Math.ceil(jovem.wage / 1000) * 1000;
    const ajuste = await M.ponte.ajustarTeto(aumento);
    const depois = await M.ponte.acaoJogador(jovem.id, "promote");
    return { antes, ajuste, depois, origem: C.squad.find((p) => p.id === jovem.id).origin };
  });
  check("5) O teto aumentado com o caixa libera a promoção que antes estourava o teto:",
    r5.antes.ok === false && r5.antes.motivo === "teto" && r5.ajuste.ok && r5.depois.ok !== false && r5.origem === "principal", JSON.stringify(r5));

  // 6) Virada.
  await globaisDoMotor(page);
  const r6 = await page.evaluate(async () => {
    CAREER.finances.wageCapBought = 80000;
    const caixaAntes = CAREER.finances.cash;
    CAREER.currentRound = 39;
    CAREER.negativeSeasonsStreak = -99;
    await advanceSeason();
    const folha = CAREER.squad.filter((p) => p.origin === "principal" || p.origin === "loan").reduce((s, p) => s + (p.wage || 0), 0);
    // MERCADO-001 (economia v5, carreiras novas): o teto da virada é o da faixa
    // da folha (ou a folga de abertura); sem a v5, folha × 1,35 como antes.
    const E = await import("/js/motor/economia.js");
    const v5 = E.economiaV5(CAREER), cl = CAREER.economia && CAREER.economia.clube;
    const esperado = v5 ? E.tetoDaFolha(cl.liga, cl.receitaAnual, folha) : Math.round(folha * 1.35 / 1000) * 1000;
    return { teto: CAREER.finances.wageCap, esperado, reservado: CAREER.finances.wageCapBought,
      devolvido: (CAREER.financeLedger || []).some((l) => /devolvida/.test(l.label || "") && l.round === 39), caixaAntes };
  });
  check("6) Virada: teto recalculado (folha × 1,35) e reservado zerado, sem dinheiro de volta:",
    r6.teto === r6.esperado && r6.reservado === 0 && !r6.devolvido, JSON.stringify(r6));

  // 7) Save antigo sem o campo.
  const r7 = await page.evaluate(async () => {
    const c = (await (await fetch("/api/career", { cache: "no-store" })).json()).career;
    delete c.finances.wageCapBought;
    const put = await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
    return put.status;
  });
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".home", { timeout: 30000 });
  const i7 = await noMotor(page, (M) => M.ponte.tetoSalarial());
  check("7) Save antigo sem o campo abre com reservado 0:", r7 < 400 && i7.ok && i7.reservado === 0, JSON.stringify({ r7, i7 }));

  // 8) 360 px.
  await abrir();
  await page.setViewportSize({ width: 360, height: 780 });
  await page.waitForTimeout(200);
  const s8 = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll("a, button, input")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && r.height < 44; }).map((el) => el.className || el.tagName) }));
  check("8) 360 px sem rolagem horizontal e alvos ≥ 44 px:", s8.overflow <= 0 && s8.small.length === 0, JSON.stringify(s8));

  await browser.close();
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
