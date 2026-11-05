// Carreira 2.0 — fase 6 do plano de independência (tática e treino), pela UI
// real, conferindo o save a cada passo.
//  1) Escalação → "Tática e instruções" abre o índice da v2 (4 entradas).
//  2) Instruções táticas: escala de 5 passos; "Salvar" grava os eixos.
//  3) Instruções por setor: abas Defesa/Meio/Ataque; "Salvar" grava os setores.
//  4) Esquemas: vazio → salvar o atual (nome), renomear, aplicar e excluir
//     (com confirmação).
//  5) Marcação individual: próximo adversário, seu jogador × adversário;
//     "Sem marcação" remove.
//  6) Escalar automaticamente (Escalação), com confirmação.
//  7) Treino da semana (pelo Início): sábado é jogo, sexta/domingo folgas;
//     editar um dia (foco, intensidade, duração) grava; ocupar a folga mostra
//     o aviso; modelo da semana; "Aplicar treino da semana" aplica 1x.
//  8) Condição → Evolução do jogador; overall por temporada (campo novo,
//     gravado na virada) aparece na Evolução.
//  9) 360 px sem rolagem horizontal e alvos ≥ 44 px; nada por /carreira-old.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, serverCareer } = require("./_v2_match");

const base = "http://localhost:8787";

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  await newCareer(page, `v2tat${Date.now()}@teste.com`);
  // Campo novo da fase 6: a virada guarda o overall no histórico do jogador.
  const snap = await page.evaluate(() => { const p = CAREER.squad[0]; snapshotPlayerSeasonHistory(p, CAREER.clubName); const h = p.seasonHistory.shift(); return { overall: h.overall, expected: p.overall }; });
  await page.close();

  const v2 = await ctx.newPage();
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const visited = [];
  v2.on("framenavigated", (f) => { if (f === v2.mainFrame()) visited.push(new URL(f.url()).pathname); });
  const sizes = {};
  const at360 = async (k) => {
    await v2.setViewportSize({ width: 360, height: 780 });
    sizes[k] = await v2.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth,
      small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className) }));
    await v2.setViewportSize({ width: 390, height: 844 });
  };
  const waitH1 = (t) => v2.waitForFunction((t) => (document.querySelector("h1") || {}).textContent === t, t, { timeout: 30000 });
  const go = async (path, h1) => { await v2.goto(base + path, { waitUntil: "domcontentloaded" }); if (h1) await waitH1(h1); };
  const ok = (t) => v2.waitForFunction((t) => (document.querySelector(".pr-ok") || {}).textContent === t, t, { timeout: 20000 });

  // 1) Índice.
  await go("/escalacao");
  await v2.waitForSelector(".lu-legacy", { timeout: 20000 });
  await v2.click('.lu-legacy[href="/tatica"]');
  await waitH1("Seu time em campo.");
  const hub = await v2.evaluate(() => [...document.querySelectorAll(".row .row-title")].map((t) => t.textContent));
  await at360("tatica");
  check("1) Escalação → 'Tática e instruções' abre o índice da v2:", JSON.stringify(hub) === JSON.stringify(["Instruções táticas", "Instruções por setor", "Esquemas salvos", "Marcação individual"]), JSON.stringify(hub));

  // 2) Instruções táticas.
  await v2.click('.row[href$="/tatica/instrucoes"]');
  await waitH1("Dê seu ritmo.");
  const axes = await v2.evaluate(() => [...document.querySelectorAll(".tk-axis")].map((t) => t.textContent));
  await v2.click('[aria-labelledby="sc-ritmo"] .tk-step:nth-child(5)');
  await v2.click('[aria-labelledby="sc-pressao"] .tk-step:nth-child(1)');
  await at360("instrucoes");
  await v2.click(".pr .cal-foot .cta");
  await ok("Instruções salvas.");
  const s2 = await serverCareer(v2);
  check("2) Instruções táticas: 4 eixos com escala de 5; 'Salvar' grava (ritmo 5, pressão 1):",
    axes.join("|") === "Ritmo de jogo|Pressão|Linha defensiva|Estilo de passe" && s2.lineup.tactics.ritmo === 5 && s2.lineup.tactics.pressao === 1, JSON.stringify({ axes, t: s2.lineup.tactics }));

  // 3) Por setor.
  await go("/tatica/setor", "Ajuste cada setor.");
  const tabs = await v2.evaluate(() => [...document.querySelectorAll(".pr-tab")].map((t) => t.textContent));
  await v2.locator(".pr-tab", { hasText: "Meio" }).click();
  await v2.click('[aria-labelledby="sc-transicao"] .tk-step:nth-child(5)');
  await v2.locator(".pr-tab", { hasText: "Ataque" }).click();
  await v2.click('[aria-labelledby="sc-finalizacao"] .tk-step:nth-child(1)');
  await at360("setor");
  await v2.click(".pr .cal-foot .cta");
  await ok("Instruções salvas.");
  const s3 = await serverCareer(v2);
  check("3) Instruções por setor: Defesa/Meio/Ataque; 'Salvar' grava os dois setores mudados:",
    tabs.join("|") === "Defesa|Meio|Ataque" && s3.lineup.sectorTactics.meio.transicao === 5 && s3.lineup.sectorTactics.ataque.finalizacao === 1 && s3.lineup.tactics.ritmo === 5,
    JSON.stringify({ tabs, st: s3.lineup.sectorTactics }));

  // 4) Esquemas.
  await go("/tatica/esquemas", "Guarde sua ideia.");
  await v2.click(".pr .cal-foot .cta");
  await v2.waitForSelector("#sq-n");
  await v2.fill("#sq-n", "Pressão alta");
  await v2.click(".pr-sheet-cta");
  await ok("Esquema salvo.");
  await waitH1("Seu plano de jogo.");
  const s4a = await serverCareer(v2);
  await at360("esquemas");
  await v2.locator(".pr-scheme-acts .row", { hasText: "Renomear" }).click();
  await v2.waitForSelector("#sq-n");
  await v2.fill("#sq-n", "Pressão total");
  await v2.click(".pr-sheet-cta");
  await ok("Esquema renomeado.");
  const s4b = await serverCareer(v2);
  await v2.locator(".pr-scheme-acts .row", { hasText: "Aplicar" }).click();
  await ok("Esquema “Pressão total” aplicado.");
  const s4c = await serverCareer(v2);
  await v2.locator(".pr-scheme-acts .row", { hasText: "Excluir" }).click();
  await v2.waitForSelector("#sx-t");
  const del = await v2.textContent("#sx-t");
  await v2.click(".pr-danger-text");
  await ok("Esquema excluído.");
  const s4d = await serverCareer(v2);
  check("4) Esquemas: salvar o atual, renomear, aplicar e excluir (com confirmação), tudo gravado:",
    s4a.tacticalSchemes.length === 1 && s4a.tacticalSchemes[0].name === "Pressão alta" && s4a.tacticalSchemes[0].tactics.ritmo === 5
      && s4b.tacticalSchemes[0].name === "Pressão total" && s4c.activeSchemeId === s4c.tacticalSchemes[0].id && del === "Excluir “Pressão total”?" && s4d.tacticalSchemes.length === 0 && !s4d.activeSchemeId,
    JSON.stringify({ a: s4a.tacticalSchemes.map((x) => x.name), b: s4b.tacticalSchemes.map((x) => x.name), active: s4c.activeSchemeId, after: s4d.tacticalSchemes.length }));

  // 5) Marcação individual.
  await go("/tatica/marcacao", "Acompanhe de perto.");
  const opp = await v2.textContent(".wk-item dt");
  await v2.click(".pr-check"); // estava "Sem marcação" marcado: desmarca
  await v2.locator(".pr-select").nth(0).click();
  await v2.click(".pr-opt >> nth=0");
  await v2.locator(".pr-select").nth(1).click();
  await v2.click(".pr-opt >> nth=0");
  await at360("marcacao");
  await v2.click(".pr .cal-foot .cta");
  await ok("Marcação salva para o próximo jogo.");
  const s5a = await serverCareer(v2);
  await v2.click(".pr-check");
  await v2.click(".pr .cal-foot .cta");
  await ok("Sem marcação no próximo jogo.");
  const s5b = await serverCareer(v2);
  check("5) Marcação: próximo adversário; seu jogador × adversário gravados; 'Sem marcação' remove:",
    !!opp && s5a.manMarking && s5a.manMarking.myPlayerId && s5a.manMarking.rivalPlayerId && !s5b.manMarking, JSON.stringify({ opp, mm: s5a.manMarking, after: s5b.manMarking }));

  // 6) Escalar automaticamente.
  await go("/escalacao");
  await v2.waitForSelector(".lu-auto", { timeout: 20000 });
  await v2.click(".lu-auto");
  await v2.waitForSelector("#au-t");
  const au = await v2.textContent("#au-t");
  await v2.click('[role="alertdialog"] .cta');
  await v2.waitForFunction(() => !document.querySelector("#au-t"), null, { timeout: 20000 });
  const s6 = await serverCareer(v2);
  check("6) Escalar automaticamente (com confirmação): 11 titulares gravados:", au === "Escalar automaticamente?" && s6.lineup.starters.filter(Boolean).length === 11, JSON.stringify({ au, starters: s6.lineup.starters.filter(Boolean).length }));

  // 7) Treino.
  await go("/");
  await v2.waitForSelector(".home", { timeout: 20000 });
  await v2.click('.home-list a.row[href$="/treino"]');
  await waitH1("Prepare a semana.");
  const week = await v2.evaluate(() => [...document.querySelectorAll(".pr-row")].map((r) => [r.querySelector(".row-title").textContent, r.querySelector(".pr-val")?.textContent || "", r.tagName]));
  await at360("treino");
  await v2.locator("button.pr-row", { hasText: "Segunda" }).click();
  await v2.waitForSelector("#dy-t");
  await v2.locator(".pr-seg-btn", { hasText: "Tático" }).click();
  await v2.locator(".pr-seg-btn", { hasText: "Intensa" }).click();
  await v2.click('.pr-step[aria-label="Aumentar duração"]');
  await v2.click('[role="dialog"] .cta');
  await ok("Treino de segunda salvo.");
  const s7a = await serverCareer(v2);
  await v2.locator("button.pr-row", { hasText: "Sexta" }).click();
  await v2.waitForSelector("#dy-t");
  await v2.locator(".pr-seg-btn", { hasText: "Físico" }).click();
  const warn = await v2.locator(".pr-warn").count();
  await v2.click('[role="dialog"] .cta');
  await ok("Treino de sexta salvo.");
  const folgasDd = () => [...document.querySelectorAll(".wk-item")].find((r) => r.querySelector("dt").textContent === "Folgas protegidas").querySelector("dd").textContent;
  await v2.waitForFunction((src) => new Function(`return (${src})()`)() === "1/2", folgasDd.toString(), { timeout: 15000 }).catch(() => {});
  const folgas = await v2.evaluate(folgasDd);
  await v2.locator("button.pr-row", { hasText: "Modelo da semana" }).click();
  await v2.locator(".pr-opt", { hasText: "Recuperação" }).click();
  await ok("Modelo “Recuperação” aplicado.");
  const s7b = await serverCareer(v2);
  await v2.click(".pr .cal-foot .cta");
  await v2.waitForFunction(() => /^Treino aplicado/.test((document.querySelector(".pr-ok") || {}).textContent || "") && /já aplicado/.test(document.querySelector(".pr .cal-foot .cta").textContent), null, { timeout: 20000 });
  const applied = await v2.textContent(".pr .cal-foot .cta");
  const s7c = await serverCareer(v2);
  check("7) Treino: sábado jogo, sexta/domingo folgas; dia editado gravado (tático, intensa, 90 min); folga ocupada com aviso; modelo aplicado; treino aplicado 1x:",
    week.some((w) => w[0] === "Sábado" && w[1] === "Dia de jogo" && w[2] === "DIV") && week.some((w) => w[0] === "Sexta" && w[1] === "Folga protegida") && week.some((w) => w[0] === "Domingo" && w[1] === "Folga protegida")
      && s7a.trainingPlan[0].foco === "tatico" && s7a.trainingPlan[0].intensidade === "intensa" && s7a.trainingPlan[0].duracao === 90 && s7a.trainingSchemeId == null
      && warn === 1 && folgas === "1/2" && s7b.trainingSchemeId === "recuperacao" && s7b.trainingPlan[0].foco === "descanso"
      && applied === "Treino da semana já aplicado" && s7c.trainingAppliedForRound != null,
    JSON.stringify({ week, d0: s7a.trainingPlan[0], warn, folgas, model: s7b.trainingSchemeId, applied, turn: s7c.trainingAppliedForRound }));

  // 8) Condição → Evolução; overall por temporada.
  const pid = s7c.squad.find((p) => p.origin === "principal").id;
  await v2.evaluate(async (pid) => {
    const c = (await (await fetch("/api/career", { cache: "no-store" })).json()).career;
    const p = c.squad.find((x) => x.id === pid);
    p.seasonHistory = [{ year: c.seasonYear - 1, clubName: c.clubName, apps: 30, goals: 5, assists: 2, overall: p.overall - 2 }];
    await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
  }, pid);
  await go("/treino/condicao", "Cuide do elenco.");
  const cond = await v2.evaluate(() => ({ rows: document.querySelectorAll(".pr-plist li").length, risk: document.querySelectorAll(".pr-risk").length }));
  await at360("condicao");
  await v2.click(`.pr-prow[href$="id=${encodeURIComponent(pid)}"]`);
  await v2.waitForSelector(".pr h1", { timeout: 20000 });
  const ev = await v2.evaluate(() => ({ h1: document.querySelector("h1").textContent, rows: [...document.querySelectorAll(".wk-item")].map((r) => [r.querySelector("dt").textContent, r.querySelector("dd").textContent]) }));
  await at360("evolucao");
  const s8 = await serverCareer(v2);
  const p8 = s8.squad.find((p) => p.id === pid);
  check("8) Condição → Evolução: condição atual e 'Overall por temporada' (campo novo, gravado na virada) com overall atual e potencial:",
    snap.overall === snap.expected && cond.rows >= 11 && ev.rows.some((r) => r[0] === "Condição atual") && ev.rows.some((r) => r[0] === `Temporada ${s8.seasonYear - 1}` && r[1] === `Overall ${p8.overall - 2}`)
      && ev.rows.some((r) => r[0] === "Overall atual · potencial"),
    JSON.stringify({ snap, cond, ev }));

  check("9) 360 px sem rolagem horizontal e alvos ≥ 44 px; nada por /carreira-old:",
    Object.values(sizes).every((s) => s.overflow <= 0 && s.small.length === 0) && !visited.some((p) => p.startsWith("/carreira-old")),
    JSON.stringify({ sizes, old: visited.filter((p) => p.startsWith("/carreira-old")) }));

  await browser.close();
})();
