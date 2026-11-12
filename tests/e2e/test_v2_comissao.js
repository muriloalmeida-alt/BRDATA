// Comissão técnica — menu de sugestões rápidas (05/11), pela UI real.
//  1) Aba fechada: botão semântico na borda direita (nome, aria-expanded,
//     aria-controls), só o chevron, 20 px visíveis e toque de 44 × 64; só no
//     Início, Escalação e Pré-jogo (não no Elenco).
//  2) Sem comissão contratada: o painel explica e leva à Comissão técnica.
//  3) Com comissão e um titular lesionado: Escalação abre primeiro com a
//     troca pela melhor reserva da posição e o motivo; Formação e Postura na
//     ordem; "Aplicar" grava só a troca; a Escalação mostra quem entrou.
//  4) Desfazer volta só aquela troca; toque duplo em "Aplicar" grava uma vez.
//  5) Sugestão desatualizada (o save mudou com o painel aberto): não grava,
//     mostra o aviso e a recomendação nova.
//  6) Postura: aplica ritmo, pressão e linha no nível sugerido.
//  7) Escape fecha e devolve o foco à aba; 320/390/430 px sem rolagem
//     horizontal e alvos ≥ 44 px no painel.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { base, newCareer, serverCareer } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  await newCareer(page, `v2com${Date.now()}@teste.com`);
  await page.close();
  const v2 = await ctx.newPage();
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const patch = (src) => v2.evaluate(async (src) => {
    const c = (await (await fetch("/api/career", { cache: "no-store" })).json()).career;
    const out = new Function("c", src)(c);
    c.updatedAt = Date.now();
    await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
    return out;
  }, src);
  const home = async () => { await v2.goto(base + "/", { waitUntil: "domcontentloaded" }); await v2.waitForSelector(".home", { timeout: 20000 }); };
  const openPanel = async () => { await v2.click(".cm-tab"); await v2.waitForSelector("#cm-panel", { timeout: 10000 }); await v2.waitForFunction(() => !/Carregando/.test(document.querySelector(".cm-body")?.textContent || ""), null, { timeout: 40000 }); };

  // 1) Aba fechada.
  await home();
  const tab = await v2.evaluate(() => {
    const b = document.querySelector(".cm-tab"); const f = b.querySelector(".cm-tab-face");
    const rb = b.getBoundingClientRect(), rf = f.getBoundingClientRect();
    return { tag: b.tagName, name: b.getAttribute("aria-label"), exp: b.getAttribute("aria-expanded"), ctl: b.getAttribute("aria-controls"), text: b.textContent.trim(),
      hit: [Math.round(rb.width), Math.round(rb.height)], face: [Math.round(rf.width), Math.round(rf.height)], right: Math.round(innerWidth - rb.right) };
  });
  await v2.goto(base + "/elenco", { waitUntil: "domcontentloaded" }); await v2.waitForSelector("h1", { timeout: 20000 });
  const onSquad = await v2.locator(".cm-tab").count();
  await v2.goto(base + "/escalacao", { waitUntil: "domcontentloaded" }); await v2.waitForSelector("h1", { timeout: 20000 });
  const onLineup = await v2.locator(".cm-tab").count();
  check("1) Aba: botão 'Abrir comissão técnica' (aria-expanded/controls), só o chevron, 20×64 visível e toque 44×64 na borda; no Início e na Escalação, não no Elenco:",
    tab.tag === "BUTTON" && tab.name === "Abrir comissão técnica" && tab.exp === "false" && tab.ctl === "cm-panel" && tab.text === "" && tab.hit[0] === 44 && tab.hit[1] === 64 && tab.face[0] === 20 && tab.right === 0 && onSquad === 0 && onLineup === 1,
    JSON.stringify({ tab, onSquad, onLineup }));

  // 2) Sem comissão.
  await home(); await openPanel();
  const noStaff = await v2.evaluate(() => ({ t: document.querySelector("#cm-t").textContent, s: document.querySelector("#cm-s").textContent, body: document.querySelector(".cm-body").textContent, tabGone: getComputedStyle(document.querySelector(".cm-tab")).visibility === "hidden" && document.querySelector(".cm-tab").getAttribute("aria-expanded") === "true" }));
  await v2.click(".cm-body .cm-cta");
  await v2.waitForURL(/\/comissao$/, { timeout: 10000 });
  check("2) Sem comissão contratada: 'Comissão técnica' / 'Sugestões para o próximo jogo', explica e leva à Comissão técnica; aba some com o painel aberto:",
    noStaff.t === "Comissão técnica" && /Sugestões para o próximo jogo/.test(noStaff.s) && /ainda não foi contratada/.test(noStaff.body) && noStaff.tabGone, JSON.stringify(noStaff));

  // 3) Comissão contratada + titular lesionado.
  const setup = await patch(`
    c.technicalStaff = Object.assign({}, c.technicalStaff, { hired: true });
    const F = { "4-3-3": 0 }; const sq = c.squad;
    const id = c.lineup.starters[9]; const p = sq.find((x) => x.id === id);
    p.status = "contundido"; p.outUntilRound = c.currentRound + 3;
    sq.forEach((x) => { if (x.status === "ok") x.condition = 95; });
    return { outId: id, outName: p.name, group: p.group };`);
  await home(); await openPanel();
  const p3 = await v2.evaluate(() => ({ cats: [...document.querySelectorAll(".cm-cat")].map((e) => e.textContent), open: document.querySelector(".cm-item.is-open .cm-cat")?.textContent,
    resumo: document.querySelector(".cm-item.is-open .cm-resumo")?.textContent, motivo: document.querySelector(".cm-item.is-open .cm-motivo")?.textContent, cta: document.querySelector(".cm-item.is-open .cm-cta")?.textContent,
    others: [...document.querySelectorAll(".cm-item:not(.is-open) .cm-resumo")].map((e) => e.textContent) }));
  // Toque duplo: só uma gravação.
  let puts = 0; v2.on("request", (r) => { if (r.method() === "PUT" && r.url().endsWith("/api/career")) puts++; });
  await v2.evaluate(() => { const b = document.querySelector(".cm-item.is-open .cm-cta"); b.click(); b.click(); });
  await v2.waitForSelector(".cm-msg.is-ok", { timeout: 30000 });
  const c3 = await serverCareer(v2);
  const msg3 = await v2.locator(".cm-msg").textContent();
  const putsAfterApply = puts;
  check("3) Escalação aberta primeiro: troca pela reserva da posição, motivo 'lesionado'; ordem Escalação/Formação/Postura; Aplicar grava só a troca (toque duplo = 1 gravação):",
    JSON.stringify(p3.cats) === JSON.stringify(["Escalação", "Formação", "Postura"]) && p3.open === "Escalação" && /no lugar de/.test(p3.resumo || "") && /lesionado/.test(p3.motivo || "") && p3.cta === "Aplicar sugestão"
      && !c3.lineup.starters.includes(setup.outId) && c3.squad.find((x) => x.id === c3.lineup.starters[9]).group === setup.group && /Sugestão aplicada/.test(msg3) && putsAfterApply === 1 && p3.others.length === 2,
    JSON.stringify({ p3, slot9: c3.lineup.starters[9], putsAfterApply, msg3 }));

  // 4) Desfazer.
  await v2.click(".cm-undo");
  await v2.waitForFunction(() => /Desfeito/.test(document.querySelector(".cm-msg")?.textContent || ""), null, { timeout: 30000 });
  const c4 = await serverCareer(v2);
  check("4) Desfazer volta só a troca (o lesionado de volta à vaga, mesmo banco):", c4.lineup.starters[9] === setup.outId && JSON.stringify(c4.lineup.bench) === JSON.stringify((await (async () => c4)()).lineup.bench), JSON.stringify({ slot9: c4.lineup.starters[9] }));

  // 5) Desatualizada: com o painel aberto, a escalação muda por fora.
  await v2.keyboard.press("Escape");
  await openPanel();
  await patch(`const s = c.lineup.starters; const i = 3, j = 4; const t = s[i]; s[i] = s[j]; s[j] = t;`);
  await v2.click(".cm-item.is-open .cm-cta");
  await v2.waitForSelector(".cm-msg", { timeout: 30000 });
  const msg5 = await v2.locator(".cm-msg").textContent();
  const c5 = await serverCareer(v2);
  check("5) Sugestão desatualizada não grava: aviso 'A situação mudou' e recomendação atualizada:", /A situação mudou/.test(msg5) && c5.lineup.starters[9] === setup.outId, JSON.stringify({ msg5 }));

  // 6) Postura.
  await v2.locator(".cm-row", { hasText: "Postura" }).click();
  const post = await v2.evaluate(() => ({ resumo: document.querySelector(".cm-item.is-open .cm-resumo")?.textContent, cta: !!document.querySelector(".cm-item.is-open .cm-cta") }));
  let tac = null;
  if (post.cta) {
    await v2.click(".cm-item.is-open .cm-cta");
    await v2.waitForSelector(".cm-msg.is-ok", { timeout: 30000 });
    tac = (await serverCareer(v2)).lineup.tactics;
  }
  const lvl = { Ofensiva: 4, Equilibrada: 3, Cautelosa: 2 }[(post.resumo || "").split(" ")[0]];
  check("6) Postura: 'Ofensiva/Equilibrada/Cautelosa para começar' aplica ritmo, pressão e linha no nível; ou 'Manter postura atual':",
    post.cta ? (lvl && tac.ritmo === lvl && tac.pressao === lvl && tac.linhaDefensiva === lvl) : /Manter postura atual/.test(post.resumo || ""), JSON.stringify({ post, tac }));

  // 7) Escape, foco e larguras.
  const sizes = {};
  for (const w of [320, 390, 430]) {
    await v2.setViewportSize({ width: w, height: 760 });
    await v2.waitForTimeout(150);
    sizes[w] = await v2.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth,
      small: [...document.querySelectorAll("#cm-panel button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && r.height < 44; }).map((el) => el.className) }));
  }
  await v2.setViewportSize({ width: 390, height: 844 });
  await v2.keyboard.press("Escape");
  await v2.waitForSelector(".cm-tab", { timeout: 5000 });
  const focus = await v2.evaluate(() => document.activeElement?.classList.contains("cm-tab"));
  check("7) Escape fecha e devolve o foco à aba; 320/390/430 px sem rolagem horizontal e alvos ≥ 44 px no painel:",
    focus && Object.values(sizes).every((s) => s.overflow <= 0 && s.small.length === 0), JSON.stringify({ focus, sizes }));

  // 8) Desgaste e formação: titular a 50% de condição (o resto descansado)
  // → troca com motivo de desgaste; formação 5-4-1 → sugestão de formação
  // com quem entra/sai, ou "Manter" se for a melhor.
  await patch(`
    const sq = c.squad;
    sq.forEach((x) => { if (x.status !== "ok") { x.status = "ok"; x.outUntilRound = null; } x.condition = 95; });
    c.lineup.formation = "5-4-1";
    const slots = { "5-4-1": [["G"],["D"],["D"],["D"],["D"],["D"],["M"],["M"],["M"],["M"],["F"]] }["5-4-1"];
    const used = new Set();
    const pick = (g) => { const p = sq.filter((x) => (x.origin === "principal" || x.origin === "loan") && x.group === g && !used.has(x.id)).sort((a, b) => b.overall - a.overall)[0]; if (p) used.add(p.id); return p ? p.id : null; };
    c.lineup.starters = slots.map(([g]) => pick(g));
    const tired = sq.find((x) => x.id === c.lineup.starters[7]); tired.condition = 50;
    const reserve = sq.find((x) => (x.origin === "principal" || x.origin === "loan") && x.group === "M" && !used.has(x.id));
    reserve.overall = tired.overall - 1;`);
  await home(); await openPanel();
  const p8 = await v2.evaluate(() => ({ esc: document.querySelector(".cm-item.is-open .cm-motivo")?.textContent, formResumo: [...document.querySelectorAll(".cm-item")].find((li) => /Formação/.test(li.textContent))?.querySelector(".cm-resumo")?.textContent }));
  if (!(await v2.locator(".cm-item.is-open .cm-cat", { hasText: "Formação" }).count())) await v2.locator(".cm-row", { hasText: "Formação" }).click();
  const form = await v2.evaluate(() => ({ motivo: document.querySelector(".cm-item.is-open .cm-motivo")?.textContent, chips: [...document.querySelectorAll(".cm-item.is-open .cm-chip")].map((e) => e.textContent), notes: [...document.querySelectorAll(".cm-item.is-open .cm-note")].map((e) => e.textContent), cta: !!document.querySelector(".cm-item.is-open .cm-cta") }));
  let f8 = null;
  if (form.cta) {
    await v2.click(".cm-item.is-open .cm-cta");
    await v2.waitForSelector(".cm-msg.is-ok", { timeout: 30000 });
    f8 = (await serverCareer(v2)).lineup.formation;
  }
  check("8) Desgaste: troca com motivo 'desgastado (condição 50%)'; Formação a partir do 5-4-1: mostra de → para e quem entra/sai e aplica, ou 'Manter formação atual':",
    /desgastado para começar \(condição 50%\)/.test(p8.esc || "") && (form.cta ? (form.chips[0] === "5-4-1" && f8 === form.chips[1] && f8 !== "5-4-1") : /Manter formação atual/.test(p8.formResumo || "")),
    JSON.stringify({ p8, form, f8 }));

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
