// Carreira 2.0 — Entrega A3 (Substituição, Ajustar tática e Lances, pela
// Pausa da Partida da v2). Partida real pela ponte: substituição em duas
// etapas (cancelar não troca; confirmar troca, conta 1 de N e aparece nos
// lances e no Revisar time); tática (formação + eixo) aplicada pelo motor
// de sempre; ao fim, o save tem a formação/tática e o jogador que entrou;
// partida continua pausada durante os ajustes; 360 px.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, motorNaPagina } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";

  const email = `v2aj${Date.now()}@teste.com`;
  // Conta e carreira pelo motor da v2 (sem a tela antiga), já na rodada 1.
  await newCareer(page, email);
  await noMotor(page, (M) => { M.CAREER.lineup.formation = "4-3-3"; M.CAREER.lineup.tactics.pressao = 3; return M.persistir(); });
  const before = await noMotor(page, (M) => { const C = M.CAREER; return { round: C.currentRound, outId: C.lineup.starters[9], outName: C.squad.find((p) => p.id === C.lineup.starters[9]).name }; });
  await page.goto("about:blank");

  const v2 = await ctx.newPage();
  await v2.goto(base + "/partida?iniciar=1", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".mt-score", { timeout: 40000 });
  await v2.waitForFunction(() => /^(15|30)/.test(document.querySelector(".mt-min")?.textContent || ""), null, { timeout: 20000 });
  await v2.click(".mt-actions .mt-primary");
  await v2.waitForSelector(".pz-title", { timeout: 10000 });
  const min0 = await v2.locator(".pz-min").textContent();
  // Total de substituições da partida: 5, mais 1 por vermelho do seu time
  // (subsBonus do motor) — um vermelho no 1º trecho é sorteio da partida
  // (CI, PR #73), então o total vem do motor em vez de fixo em 5.
  await motorNaPagina(v2);
  const subsTotal = await v2.evaluate(() => __motor.aovivo.MAX_SUBS_PER_MATCH + __motor.estado.partidaAtual().subsBonus);

  // 1) Quem sai: titulares em campo; cancelar não troca.
  await v2.click(".pz-row[href$='tela=sai']");
  await v2.waitForSelector(".sb-list", { timeout: 10000 });
  const outList = await v2.evaluate(() => ({ n: document.querySelectorAll(".sb-list .sb-opt").length, count: document.querySelector(".sb-count").textContent }));
  await v2.locator(".sb-list .sb-opt").nth(9).click();
  await v2.waitForSelector(".sb-pair", { timeout: 10000 });
  const pair0 = await v2.evaluate(() => ({ search: location.search, sai: document.querySelectorAll(".sb-side .sb-name")[0].textContent, entra: document.querySelectorAll(".sb-side .sb-name")[1].textContent, disabled: document.querySelector(".sb-foot .cta").disabled }));
  await v2.click(".sb-foot .btn-secondary"); // Cancelar
  await v2.waitForSelector(".pz-title", { timeout: 10000 });
  const afterCancel = await v2.locator(".pz-row[href$='tela=sai'] .row-sub").textContent();
  const parts = before.outName.trim().split(/\s+/); const outShort = parts.length > 1 ? `${parts[0][0].toUpperCase()}. ${parts[parts.length - 1]}` : before.outName;
  check("1) Quem sai: 11 titulares e 'Substituições: 0 de 5'; Sai ⇄ Entra com quem sai fixo e Confirmar desativado até escolher; Cancelar volta à Pausa sem trocar:",
    outList.n === 11 && outList.count.includes(`0 de ${subsTotal}`) && subsTotal >= 5 && pair0.search.includes(`sai=${encodeURIComponent(before.outId)}`) && pair0.sai === outShort && pair0.entra === "Escolha abaixo" && pair0.disabled && afterCancel.includes(`0 de ${subsTotal}`),
    JSON.stringify({ outList, pair0, afterCancel, subsTotal }));

  // 2) Confirmar substituição: volta à Pausa, 1 de 5, jogo ainda parado.
  await v2.click(".pz-row[href$='tela=sai']");
  await v2.waitForSelector(".sb-list", { timeout: 10000 });
  await v2.locator(".sb-list .sb-opt").nth(9).click();
  await v2.waitForSelector(".sb-pair", { timeout: 10000 });
  await v2.locator(".sb-bench .sb-opt").first().click();
  const inShort = await v2.evaluate(() => document.querySelectorAll(".sb-side .sb-name")[1].textContent);
  await v2.click(".sb-foot .cta");
  await v2.waitForSelector(".pz-title", { timeout: 10000 });
  const p2 = await v2.evaluate(() => ({ search: location.search, sub: document.querySelector(".pz-row[href$='tela=sai'] .row-sub").textContent, min: document.querySelector(".pz-min").textContent }));
  check("2) Confirmar substituição volta à Pausa com '1 de 5' e a partida segue parada:", p2.search === "?tela=pausa" && p2.sub.includes(`1 de ${subsTotal}`) && p2.min === min0, JSON.stringify({ p2, inShort, subsTotal }));

  // 3) Revisar time e Lances refletem a troca.
  await v2.click(".pz-row[href$='tela=time']");
  await v2.waitForSelector(".pm-pitch", { timeout: 10000 });
  const onPitch = await v2.evaluate(() => [...document.querySelectorAll(".pm-pitch .lu-name")].map((n) => n.textContent));
  const onBench = await v2.evaluate(() => [...document.querySelectorAll(".pz-bench-name")].map((n) => n.textContent));
  await v2.goBack(); await v2.waitForSelector(".pz-title", { timeout: 10000 });
  await v2.click(".pz-row[href$='tela=lances']");
  await v2.waitForSelector(".ev-list", { timeout: 10000 });
  const ev = await v2.evaluate(() => [...document.querySelectorAll(".ev-item")].map((i) => i.textContent));
  await v2.click(".pz-foot .link-back"); await v2.waitForSelector(".pz-title", { timeout: 10000 });
  check("3) Revisar time mostra quem entrou em campo e quem saiu no banco; Lances registram a substituição:",
    onPitch.includes(inShort) && !onPitch.includes(outShort) && onBench.includes(outShort) && ev.some((t) => /Substituição/.test(t) && t.includes(`entra ${inShort}`) && t.includes(`sai ${outShort}`)) && /Início da partida/.test(ev[ev.length - 1]),
    JSON.stringify({ onPitch, onBench: onBench.slice(0, 3), ev: ev.slice(0, 3) }));

  // 4) Ajustar tática: formação 4-4-2 + pressão 5, com aviso do custo.
  await v2.click(".pz-row[href$='tela=tatica']");
  await v2.waitForSelector(".tk-forms", { timeout: 10000 });
  const tk0 = await v2.evaluate(() => ({ on: document.querySelector(".tk-form.is-on").textContent, axes: [...document.querySelectorAll(".tk-axis")].map((a) => a.textContent), note: !!document.querySelector(".tk-note") }));
  await v2.locator(".tk-form", { hasText: "4-4-2" }).first().click();
  const note = await v2.locator(".tk-note").textContent();
  await v2.locator(".tk-seg").nth(1).locator(".tk-step").nth(4).click();
  await v2.click(".sb-foot .cta");
  await v2.waitForSelector(".pz-title", { timeout: 10000 });
  await v2.click(".pz-row[href$='tela=tatica']");
  await v2.waitForSelector(".tk-forms", { timeout: 10000 });
  const tk1 = await v2.evaluate(() => ({ on: document.querySelector(".tk-form.is-on").textContent, pressao: document.querySelectorAll(".tk-seg")[1].querySelector(".tk-step.is-on").textContent, cont: document.querySelector(".tk-note")?.textContent || "" }));
  await v2.click(".sb-foot .btn-secondary"); await v2.waitForSelector(".pz-title", { timeout: 10000 });
  check("4) Ajustar tática: formação atual marcada e 4 eixos da versão atual; aviso ao trocar formação; aplicado volta 4-4-2 e pressão 5 (time ainda se ajustando):",
    tk0.on.startsWith("4-3-3") && JSON.stringify(tk0.axes) === JSON.stringify(["Ritmo de jogo", "Pressão", "Linha defensiva", "Estilo de passe"]) && !tk0.note && /perder um pouco de efetividade/.test(note)
      && tk1.on.startsWith("4-4-2") && tk1.pressao === "5" && /ajustando/.test(tk1.cont), JSON.stringify({ tk0, tk1 }));

  // 5) 360 px nas telas de ajuste; fim da partida e save.
  await v2.setViewportSize({ width: 360, height: 780 });
  const audit = () => v2.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className),
  }));
  await v2.click(".pz-row[href$='tela=sai']"); await v2.waitForSelector(".sb-list");
  const a1 = await audit();
  await v2.locator(".sb-list .sb-opt").first().click(); await v2.waitForSelector(".sb-pair");
  const a2 = await audit();
  await v2.click(".sb-foot .btn-secondary"); await v2.waitForSelector(".pz-title");
  await v2.click(".pz-row[href$='tela=tatica']"); await v2.waitForSelector(".tk-forms");
  const a3 = await audit();
  await v2.click(".sb-foot .btn-secondary"); await v2.waitForSelector(".pz-title");
  await v2.click(".pz-foot .mt-primary");
  await v2.waitForSelector(".mt-score", { timeout: 10000 });
  await v2.click(".mt-skip");
  await v2.waitForSelector(".rs-title", { timeout: 30000 }); // Resultado (A4)
  await v2.waitForTimeout(1500);
  const after = await v2.evaluate(async () => (await (await fetch("/api/career", { cache: "no-store" })).json()).career);
  // O nome curto pode se repetir no elenco sorteado (dois "G. Costa"):
  // entre os homônimos, vale o que está entre os titulares.
  // Quem entrou e depois foi expulso (ou se lesionou) no resto da partida
  // sai da escalação de propósito: aí basta ele estar suspenso/lesionado.
  const fora = (p) => p.status === "suspenso" || p.status === "contundido";
  const sameShort = after.squad.filter((p) => { const pt = p.name.trim().split(/\s+/); return (pt.length > 1 ? `${pt[0][0].toUpperCase()}. ${pt[pt.length - 1]}` : p.name) === inShort && (after.lineup.starters.includes(p.id) || after.lineup.bench.includes(p.id) || fora(p)); });
  const inP = sameShort.find((p) => after.lineup.starters.includes(p.id)) || sameShort.find(fora) || sameShort[0];
  check("5) 360 px sem rolagem e alvos ≥ 44 px nas telas de ajuste; ao fim, save com rodada +1, formação 4-4-2, pressão 5 e quem entrou na escalação:",
    [a1, a2, a3].every((a) => a.overflow <= 0 && a.small.length === 0) && after.currentRound === before.round + 1 && after.lineup.formation === "4-4-2" && after.lineup.tactics.pressao === 5 && !!inP && (after.lineup.starters.includes(inP.id) || fora(inP)),
    JSON.stringify({ a1, a2, a3, round: after.currentRound, f: after.lineup.formation, pressao: after.lineup.tactics.pressao, inP: inP && inP.id }));

  await browser.close();
})();
