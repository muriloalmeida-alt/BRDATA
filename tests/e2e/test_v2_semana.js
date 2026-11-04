// Carreira 2.0 — fase 3 do plano de independência (a semana), pela UI real.
//  1) Semana sem jogo: "Avançar semana" do Início abre a Semana concluída
//     da v2 (treino, condição, prazos e caixa); o save avança 1 semana e o
//     caixa da tela é o do save; recarregar a tela não avança outra semana.
//  2) "Continuar" volta ao Início.
//  3) Amistoso da pré-temporada: "Ir para o amistoso" abre o Pré-jogo de
//     amistoso com os 3 convites (1º marcado); escolher outro grava; o
//     amistoso roda na Partida da v2 (sem "Ver tabela") e "Continuar"
//     mostra a semana com o placar; o save marca o amistoso jogado, avança
//     a semana e não mexe na rodada.
//  4) Amistoso de julho (opcional): linha no Início; Pré-jogo sem adversário
//     ("Escolha um convite") e "Avançar sem amistoso".
//  5) "Avançar até o próximo jogo": confirmação quando há amistoso no
//     caminho; avança até a semana do jogo e avisa os amistosos pulados.
//  6) Notícias da v2: "Nos bastidores.", situação do elenco e manchetes.
//  7) Sino: número de não lidos; a folha "Avisos" lista e marca como lidos.
//  8) 360 px sem rolagem horizontal e alvos ≥ 44 px (semana, amistoso,
//     notícias); nenhuma navegação passou por /carreira-old.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { signup, serverCareer, ensureDailyClaimed } = require("./_v2_match");
const { passCareerSetup, enterGame } = require("./_startup");

const base = "http://localhost:8787";

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const old = await ctx.newPage();
  old.on("dialog", (d) => d.dismiss());
  await signup(old, `v2sem${Date.now()}@teste.com`);
  await old.goto(base + "/carreira-old", { waitUntil: "domcontentloaded" });
  await old.click('.mt-competition-card[data-competition="brasileirao"]');
  await old.waitForSelector(".m3-club-row", { timeout: 20000 });
  await old.click('.m3-club-row[data-id="fla"]');
  await old.click("#btnConfirmClub");
  await passCareerSetup(old);
  await enterGame(old);
  await ensureDailyClaimed(old);

  // Coloca a carreira numa semana (pela versão anterior, que grava).
  const setWeek = async (pick) => {
    await old.goto(base + "/carreira-old", { waitUntil: "domcontentloaded" });
    await old.waitForFunction(() => typeof CAREER !== "undefined" && CAREER && CAREER.calendar, null, { timeout: 20000 });
    return old.evaluate(async (pick) => {
      const cal = CAREER.calendar;
      const fr = cal.friendlies;
      const pre = fr.filter((f) => !f.optional), opt = fr.filter((f) => f.optional);
      const plain = cal.weeks.findIndex((w, i) => !w.r && w.p !== "ferias" && !fr.some((f) => f.wi === i));
      const wi = pick === "plain" ? plain : pick === "pre" ? pre[0].wi : pick === "opt" ? opt[0].wi : pick === "before-pre" ? pre[0].wi - 1 : plain;
      cal.idx = wi;
      fr.forEach((f) => { f.played = false; f.opp = null; f.result = null; });
      CAREER.trainingAppliedForRound = null;
      await persistCareer();
      return { wi, phase: cal.weeks[wi].p, round: CAREER.currentRound, friendly: fr.find((f) => f.wi === wi) || null };
    }, pick);
  };

  const v2 = await ctx.newPage();
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const visited = [];
  v2.on("framenavigated", (f) => { if (f === v2.mainFrame()) visited.push(new URL(f.url()).pathname); });
  const small = () => v2.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className) }));
  const sizes = {};
  const at360 = async (k) => { await v2.setViewportSize({ width: 360, height: 780 }); sizes[k] = await small(); await v2.setViewportSize({ width: 390, height: 844 }); };
  const home = async () => { await v2.goto(base + "/carreira/", { waitUntil: "domcontentloaded" }); await v2.waitForSelector(".home", { timeout: 20000 }); };

  // 1) Semana sem jogo.
  const w1 = await setWeek("plain");
  await home();
  const cta = await v2.evaluate(() => { const a = document.querySelector(".home-main .cta"); return [a.textContent.trim(), a.getAttribute("href")]; });
  await v2.click(".home-main .cta");
  await v2.waitForSelector(".wk h1", { timeout: 30000 });
  const wk = await v2.evaluate(() => ({ url: location.pathname + location.search, h1: document.querySelector("h1").textContent,
    secs: [...document.querySelectorAll(".wk-sec .kicker-caps")].map((k) => k.textContent),
    rows: [...document.querySelectorAll(".wk-item")].map((r) => [r.querySelector("dt").textContent, r.querySelector("dd").textContent]) }));
  const s1 = await serverCareer(v2);
  await at360("semana");
  await v2.reload({ waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 20000 });
  const s1b = await serverCareer(v2);
  const cashRow = (wk.rows.find((r) => r[0] === "Caixa") || [])[1];
  const fmtCash = (v) => `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  check("1) Avançar semana pela v2: Semana concluída (treino, condição, prazos, caixa = save), save +1 semana; recarregar não avança outra:",
    cta[0] === "Avançar semana" && cta[1] === "/carreira/semana?avancar=semana" && wk.url === "/carreira/semana" && wk.h1 === "A semana avançou."
      && wk.secs.join("|") === "Treino aplicado|Condição do elenco|Prazos e finanças" && s1.calendar.idx === w1.wi + 1 && cashRow === fmtCash(s1.finances.cash)
      && s1b.calendar.idx === w1.wi + 1,
    JSON.stringify({ cta, wk, idx: [w1.wi, s1.calendar.idx, s1b.calendar.idx], cash: [cashRow, s1.finances.cash] }));

  // 2) Continuar → Início (com uma nova semana avançada, sem recarregar).
  await setWeek("plain");
  await home();
  await v2.click(".home-main .cta");
  await v2.waitForSelector(".wk h1", { timeout: 30000 });
  await v2.click(".cal-foot .cta");
  await v2.waitForSelector(".home", { timeout: 15000 });
  check("2) 'Continuar' volta ao Início:", new URL(v2.url()).pathname === "/carreira/", v2.url());

  // 3) Amistoso da pré-temporada.
  const w3 = await setWeek("pre");
  await home();
  const cta3 = await v2.evaluate(() => { const a = document.querySelector(".home-main .cta"); return [a.textContent.trim(), a.getAttribute("href")]; });
  await v2.click(".home-main .cta");
  await v2.waitForSelector(".am h1", { timeout: 15000 });
  const am = await v2.evaluate(() => ({ h1: document.querySelector("h1").textContent, opts: [...document.querySelectorAll(".am-opt")].map((o) => [o.querySelector(".row-title").textContent, o.getAttribute("aria-checked")]),
    start: document.querySelector(".am .cal-foot .cta").textContent }));
  await at360("amistoso");
  await v2.click(".am-opt:nth-child(2)");
  await v2.waitForFunction(() => document.querySelector(".am-opt:nth-child(2)").getAttribute("aria-checked") === "true" && !document.querySelector(".am-saving"), null, { timeout: 20000 });
  const s3a = await serverCareer(v2);
  const chosen = s3a.calendar.friendlies.find((f) => f.wi === w3.wi).opp;
  await v2.click(".am .cal-foot .cta");
  await v2.waitForSelector(".mt-skip", { timeout: 40000 });
  const kicker = await v2.textContent(".mt-kicker");
  await v2.click(".mt-skip");
  await v2.waitForSelector(".rs-title", { timeout: 30000 });
  const rs = await v2.evaluate(() => ({ links: [...document.querySelectorAll(".rs-links .row-title")].map((t) => t.textContent) }));
  await v2.waitForSelector('.pz-foot .cta[data-save="saved"]:not([aria-disabled])', { timeout: 30000 });
  await v2.click(".pz-foot .cta");
  await v2.waitForSelector(".wk h1", { timeout: 20000 });
  const wk3 = await v2.evaluate(() => ({ url: location.pathname, secs: [...document.querySelectorAll(".wk-sec .kicker-caps")].map((k) => k.textContent), score: document.querySelector(".wk-item--stack dt")?.textContent }));
  const s3 = await serverCareer(v2);
  const slot = s3.calendar.friendlies.find((f) => f.wi === w3.wi);
  check("3) Amistoso: 3 convites (1º marcado), escolha gravada, partida 'Amistoso' sem 'Ver tabela', Continuar → semana com placar; save: jogado, +1 semana, rodada igual:",
    cta3[0] === "Ir para o amistoso" && cta3[1] === "/carreira/amistoso" && am.h1 === "Entre em campo." && am.opts.length === 3 && am.opts[0][1] === "true"
      && chosen === w3.friendly.invites[1] && kicker === "Amistoso" && !rs.links.includes("Ver tabela") && wk3.url === "/carreira/semana" && wk3.secs[0] === "Amistoso"
      && slot.played === true && slot.result && wk3.score === `Flamengo ${slot.result.gh} × ${slot.result.ga} ${am.opts[1][0]}` && s3.calendar.idx === w3.wi + 1 && s3.currentRound === w3.round,
    JSON.stringify({ cta3, am, chosen, invites: w3.friendly.invites, kicker, rs, wk3, slot, idx: s3.calendar.idx }));

  // 4) Amistoso opcional (julho).
  await setWeek("opt");
  await home();
  const h4 = await v2.evaluate(() => ({ cta: document.querySelector(".home-main .cta").textContent.trim(), row: [...document.querySelectorAll(".home-list .row-title")].some((t) => t.textContent === "Amistoso desta semana") }));
  await v2.click('.home-list a.row[href$="/amistoso"]');
  await v2.waitForSelector(".am h1", { timeout: 15000 });
  const am4 = await v2.evaluate(() => ({ checked: [...document.querySelectorAll('.am-opt[aria-checked="true"]')].length, start: document.querySelector(".am .cal-foot .cta").textContent, startDisabled: document.querySelector(".am .cal-foot .cta").getAttribute("aria-disabled"),
    second: document.querySelector(".am .cal-foot .link-back").textContent, empty: !!document.querySelector(".am-empty") }));
  check("4) Amistoso de julho: linha no Início, 'Avançar semana' no botão; Pré-jogo sem adversário, 'Escolha um convite' e 'Avançar sem amistoso':",
    h4.cta === "Avançar semana" && h4.row && am4.checked === 0 && am4.startDisabled === "true" && am4.start === "Escolha um convite" && am4.second === "Avançar sem amistoso" && am4.empty,
    JSON.stringify({ h4, am4 }));

  // 5) Avançar até o próximo jogo (com amistosos no caminho).
  await setWeek("before-pre");
  await home();
  await v2.click(".home-skip");
  await v2.waitForSelector("#sk-t", { timeout: 5000 });
  const sheet = await v2.evaluate(() => ({ t: document.querySelector("#sk-t").textContent, d: document.querySelector("#sk-d").textContent }));
  await v2.click(".sheet .text-btn");
  await v2.waitForSelector(".wk h1", { timeout: 30000 });
  const wk5 = await v2.evaluate(() => ({ h1: document.querySelector("h1").textContent, note: document.querySelector(".wk-note")?.textContent }));
  const s5 = await serverCareer(v2);
  check("5) Avançar até o próximo jogo: confirmação dos amistosos, semanas avançadas até a do jogo e aviso dos pulados:",
    /amistosos/.test(sheet.t) && wk5.h1 === "As semanas avançaram." && /amistosos ficaram sem ser jogados/.test(wk5.note || "") && !!s5.calendar.weeks[s5.calendar.idx].r,
    JSON.stringify({ sheet, wk5, idx: s5.calendar.idx }));

  // 6) Notícias (o amistoso do passo 3 pode ter deixado outro lesionado: a
  // verificação procura o lesionado injetado aqui, sem exigir que seja o único).
  await old.goto(base + "/carreira-old", { waitUntil: "domcontentloaded" });
  await old.waitForFunction(() => typeof CAREER !== "undefined" && CAREER && CAREER.squad, null, { timeout: 20000 });
  await old.evaluate(async () => {
    CAREER.newsFeed = [{ type: "lider", texto: "Flamengo assume a ponta", round: 4, seasonYear: CAREER.seasonYear, mine: true }];
    const p = CAREER.squad[0]; p.status = "contundido"; p.outUntilRound = 6;
    CAREER.notifications = [];
    pushNotification("lesao", "Lesão no treino."); pushNotification("proposta", "Proposta recebida.");
    await persistCareer();
  });
  await home();
  await v2.click('.home-list a.row[href$="/noticias"]');
  await v2.waitForSelector(".nw h1", { timeout: 15000 });
  const nw = await v2.evaluate(() => ({ h1: document.querySelector("h1").textContent, squad: [...document.querySelectorAll(".nw-item--sq")].map((i) => i.textContent), heads: [...document.querySelectorAll(".nw-title")].map((i) => i.textContent) }));
  await at360("noticias");
  await v2.click(".cal-foot .link-back");
  await v2.waitForSelector(".home", { timeout: 15000 });
  check("6) Notícias da v2: título, elenco (lesionado com volta) e manchetes; 'Voltar ao clube' → Início:",
    nw.h1 === "Nos bastidores." && nw.squad.some((t) => /lesionado · volta na rodada 6$/.test(t)) && nw.squad.every((t) => /· (lesionado|suspenso)/.test(t)) && nw.heads[0] === "Flamengo assume a ponta" && new URL(v2.url()).pathname === "/carreira/",
    JSON.stringify(nw));

  // 7) Sino.
  const badge = await v2.evaluate(() => ({ label: document.querySelector(".home-bell").getAttribute("aria-label"), n: document.querySelector(".home-bell-badge")?.textContent }));
  await v2.click(".home-bell");
  await v2.waitForSelector("#nt-t", { timeout: 5000 });
  const items = await v2.evaluate(() => [...document.querySelectorAll(".nt-item .nt-text")].map((t) => t.textContent));
  await v2.waitForFunction(async () => { const c = (await (await fetch("/api/career", { cache: "no-store" })).json()).career; return c.notifications.every((n) => n.read); }, null, { timeout: 15000 });
  await v2.click(".sheet .text-btn");
  await v2.waitForFunction(() => !document.querySelector(".home-bell-badge"), null, { timeout: 15000 });
  check("7) Sino: '2 novos', folha 'Avisos' com os avisos (mais novo primeiro), lidos no save e sem número depois:",
    badge.n === "2" && badge.label === "Avisos, 2 novos" && items.length === 2 && /Proposta recebida/.test(items[0]),
    JSON.stringify({ badge, items }));

  // 8) 360 px e sem /carreira-old.
  check("8) 360 px sem rolagem horizontal e alvos ≥ 44 px; nenhuma navegação da v2 passou por /carreira-old:",
    Object.values(sizes).every((s) => s.overflow <= 0 && s.small.length === 0) && !visited.some((p) => p.startsWith("/carreira-old")),
    JSON.stringify({ sizes, old: visited.filter((p) => p.startsWith("/carreira-old")) }));

  await browser.close();
})();
