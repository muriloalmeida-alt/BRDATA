// Carreira 2.0 — fase 9 do plano de independência (clube), pela UI real,
// conferindo o save a cada passo. Contrato de patrocínio vencido, prospecto
// e indicação de olheiro são preparados no save pelo servidor (o motor só os
// gera ao virar a temporada ou ao voltar de missão).
//  1) Clube: Comissão, Estádio, Patrocínios, Extrato e Base e olheiros na v2.
//  2) Comissão: contratar (com confirmação) mostra as 4 sugestões; demitir.
//  3) Estádio: obra com confirmação (caixa antes → depois); só uma por vez.
//  4) Patrocínios: contrato vencido → 3 propostas → assinar.
//  5) Extrato: filtros do jogo e lançamentos por rodada; Finanças → extrato.
//  6) Olheiros: contratar, mandar em missão (região e duração).
//  7) Relatórios: prospecto → "Trazer para a base" → aparece na base.
//  8) Indicações: "Propor" abre a proposta da v2; "Recusar" tira da lista.
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
  await newCareer(page, `v2cl${Date.now()}@teste.com`);
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
  const go = async (p, h1) => { await v2.goto(base + p, { waitUntil: "domcontentloaded" }); if (h1) await waitH1(h1); };
  const put = (fn, arg) => v2.evaluate(async ({ src, arg }) => {
    const c = (await (await fetch("/api/career", { cache: "no-store" })).json()).career;
    const out = new Function("c", "arg", src)(c, arg);
    await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
    return out;
  }, { src: fn, arg });
  await go("/");
  await v2.waitForSelector(".home", { timeout: 20000 });
  await put(`c.finances.cash = 50000000;`);

  // 1) Clube.
  await go("/clube");
  await v2.waitForSelector(".hb-row", { timeout: 20000 });
  const hub = await v2.evaluate(() => Object.fromEntries([...document.querySelectorAll("a.hb-row")].map((a) => [a.querySelector(".row-title").textContent, a.getAttribute("href")])));
  check("1) Clube: Comissão, Estádio, Patrocínios, Extrato e Base e olheiros abrem a v2:",
    hub["Comissão técnica"] === "/comissao" && hub["Estádio"] === "/estadio" && hub["Patrocínios"] === "/patrocinios" && hub["Extrato financeiro"] === "/extrato" && hub["Base e olheiros"] === "/olheiros",
    JSON.stringify(hub));

  // 2) Comissão.
  await go("/comissao", "Fortaleça a comissão.");
  await v2.waitForSelector(".pr .cal-foot .cta");
  await at360("comissao");
  await v2.click(".pr .cal-foot .cta");
  await v2.waitForSelector("#ch-t");
  await v2.click('[role="alertdialog"] .sp-sheet-cta');
  await v2.waitForSelector(".cl-sug", { timeout: 30000 });
  const sug = await v2.evaluate(() => [...document.querySelectorAll(".cl-sug-t")].map((t) => t.textContent));
  const hired = (await serverCareer(v2)).technicalStaff.hired;
  await at360("comissao-contratada");
  await v2.locator("button.pr-row", { hasText: "Demitir comissão técnica" }).click();
  await v2.waitForSelector("#cf-t");
  await v2.click('[role="alertdialog"] .text-btn');
  await v2.waitForFunction(() => !document.querySelector(".cl-sug"), null, { timeout: 30000 });
  const fired = (await serverCareer(v2)).technicalStaff.hired;
  check("2) Comissão: contratar (confirmação) → 4 sugestões (Escalação, Treinos, Tática, Mercado); demitir grava:",
    hired === true && sug.join("|") === "Escalação|Treinos|Tática|Mercado" && fired === false, JSON.stringify({ hired, sug, fired }));

  // 3) Estádio.
  await go("/estadio", "Faça o clube crescer.");
  await at360("estadio");
  await v2.locator("a.pr-row", { hasText: "Iluminação LED completa" }).click();
  await waitH1("O clube em obras.");
  const cash3 = (await serverCareer(v2)).finances.cash;
  await v2.click(".pr .cal-foot .cta");
  await v2.waitForSelector("#ow-t");
  const conf3 = await v2.evaluate(() => document.querySelector('[role="alertdialog"] .wk-item dd').textContent);
  await at360("obra-confirmar");
  await v2.click('[role="alertdialog"] .sp-sheet-cta');
  await v2.waitForSelector(".pr-ok", { timeout: 30000 });
  const s3 = await serverCareer(v2);
  await go("/estadio/obra?id=setor_norte", "O clube em obras.");
  const other = await v2.evaluate(() => ({ cta: !!document.querySelector(".pr .cal-foot .cta"), txt: document.body.innerText.includes("Só uma obra por vez") }));
  check("3) Estádio: obra com confirmação (caixa antes → depois) grava e desconta; outra melhoria aguarda:",
    s3.stadium.pendingUpgrade && s3.stadium.pendingUpgrade.id === "iluminacao" && s3.finances.cash === cash3 - 900000 && /→/.test(conf3) && !other.cta && other.txt,
    JSON.stringify({ pend: s3.stadium.pendingUpgrade, cash: [cash3, s3.finances.cash], conf3, other }));

  // 4) Patrocínios.
  await put(`c.sponsorship.master = null; c.sponsorProposals.master = null;`);
  await go("/patrocinios", "Novas parcerias.");
  await v2.waitForSelector('[aria-labelledby="sp-master"] button.pr-row', { timeout: 30000 });
  await at360("patrocinios");
  const props = await v2.evaluate(() => [...document.querySelectorAll('[aria-labelledby="sp-master"] button.pr-row .row-title')].map((t) => t.textContent));
  await v2.click('[aria-labelledby="sp-master"] button.pr-row >> nth=1');
  await v2.waitForSelector("#sg-t");
  await v2.click('[role="alertdialog"] .sp-sheet-cta');
  await v2.waitForSelector(".pr-ok", { timeout: 30000 });
  const s4 = await serverCareer(v2);
  check("4) Patrocínios: contrato vencido → 3 propostas → 'Assinar' (com confirmação) grava o contrato:",
    props.length === 3 && s4.sponsorship.master && s4.sponsorship.master.empresa === props[1] && !s4.sponsorProposals.master, JSON.stringify({ props, master: s4.sponsorship.master }));

  // 5) Extrato.
  await put(`for (let i = 0; i < 6; i++) c.financeLedger.unshift({ round: 1, type: "tv", label: "Cota " + i, amount: 100000 });`);
  await go("/financas");
  await v2.waitForSelector(".fn-cash", { timeout: 20000 });
  await v2.click('a.tb-more[href="/extrato"]');
  await waitH1("Cada movimento conta.");
  await at360("extrato");
  const filters = await v2.evaluate(() => [...document.querySelectorAll(".cl-filters .pr-seg-btn")].map((b) => b.textContent));
  await v2.locator(".cl-filters .pr-seg-btn", { hasText: "Estádio" }).click();
  const est = await v2.evaluate(() => [...document.querySelectorAll(".wk-item dt")].map((d) => d.textContent));
  check("5) Finanças → 'Ver extrato completo' → Extrato da v2; filtros do jogo; filtro Estádio mostra a obra:",
    filters[0] === "Tudo" && filters.includes("Estádio") && filters.includes("Cota de TV") && est.length >= 1 && est.every((t) => t.startsWith("Estádio · ")), JSON.stringify({ filters, est }));

  // 6) Olheiros.
  await go("/olheiros", "Amplie seu alcance.");
  await at360("olheiros");
  await v2.locator("a.pr-row", { hasText: "Contratar olheiro" }).click();
  await waitH1("Monte sua rede.");
  await at360("olheiros-contratar");
  await v2.locator(".cl-scout", { hasText: "R. Moura" }).locator("button").click();
  await v2.waitForSelector("#oh-t");
  await v2.click('[role="alertdialog"] .sp-sheet-cta');
  await v2.waitForSelector(".pr-ok", { timeout: 30000 });
  await go("/olheiros/missao", "Planeje a missão.");
  await v2.locator('[aria-labelledby="ms-d"] .pr-seg-btn', { hasText: "Curta" }).click();
  await at360("missao");
  await v2.click(".pr .cal-foot .cta");
  await waitH1("Olheiro em campo.");
  const s6 = await serverCareer(v2);
  const sc = (s6.scouts || []).find((s) => s.marketId === "r_moura");
  check("6) Olheiros: contratar (com confirmação) e mandar em missão (região do especialista, curta = 2 rodadas):",
    !!sc && sc.mission && sc.mission.regionUf === "norte" && sc.mission.roundsLeft === 2 && sc.mission.type === "sub17", JSON.stringify(sc));

  // 7) Relatórios → base.
  await put(`c.scoutMissionProspects = [{ id: "pp1", name: "Kauã Souza", group: "F", age: 16, overall: 41, atk: 45, def: 30, phys: 60, potential: 80, potRange: { lo: 76, hi: 82 }, foundRegion: "norte", scoutName: "R. Moura", scoutNote: "Promissor.", wage: 2000, value: 100000, contractUntil: c.seasonYear + 3, report: { recommendation: "Promover já", strength: "físico", weakness: "defesa" } }];`);
  await go("/olheiros/relatorios", "Veja os prospectos.");
  await at360("relatorios");
  await v2.locator("a.pr-row", { hasText: "Ver jogador" }).click();
  await waitH1("K. Souza.");
  await v2.click(".pr .cal-foot .cta");
  await waitH1("Bem-vindo à base.");
  const s7 = await serverCareer(v2);
  await go("/base", "O futuro está aqui.");
  await v2.locator(".pr-tab", { hasText: "Sub-17" }).click();
  const inBase = await v2.evaluate(() => [...document.querySelectorAll(".sp-player .row-title")].map((t) => t.textContent));
  await at360("base");
  check("7) Relatório → 'Trazer para a base' → jogador na base (Sub-17) e fora dos relatórios:",
    s7.squad.some((p) => p.name === "Kauã Souza" && p.origin === "base") && !(s7.scoutMissionProspects || []).length && inBase.includes("K. Souza"), JSON.stringify({ inBase }));

  // 8) Indicações.
  const sugg = await put(`if (c.calendar) c.calendar.weeks[c.calendar.idx].p = "pre";
    const clubs = Object.keys(c.leagueSquads).filter((id) => id !== String(c.clubId));
    const mk = (i) => { const p = c.leagueSquads[clubs[i]][0]; return { id: "sg" + i, playerId: p.id, playerName: p.name, clubId: clubs[i], clubName: "Clube " + i, subpos: "MEI", overall: p.overall, age: p.age, value: p.value, potLo: 70, potHi: 74 }; };
    c.scoutSuggestions = [mk(0), mk(1)]; return c.scoutSuggestions.map((s) => s.playerId);`);
  await go("/olheiros/indicacoes", "Indicações dos olheiros.");
  await v2.waitForFunction(() => !document.querySelector(".mk-window.is-closed") && document.querySelectorAll(".cl-actions").length === 2, null, { timeout: 30000 });
  await at360("indicacoes");
  await v2.locator(".cl-actions >> nth=1").locator("button", { hasText: "Recusar" }).click();
  await v2.waitForFunction(() => document.querySelectorAll(".cl-actions").length === 1, null, { timeout: 30000 });
  await v2.locator(".cl-actions button", { hasText: "Propor" }).click();
  await waitH1("Faça sua oferta.");
  const s8 = await serverCareer(v2);
  check("8) Indicações: 'Recusar' tira da lista; 'Propor' abre 'Faça sua oferta.' da v2 com o jogador indicado:",
    !(s8.scoutSuggestions || []).length && new URL(v2.url()).searchParams.get("id") === sugg[0], JSON.stringify({ left: s8.scoutSuggestions, url: v2.url() }));

  check("9) 360 px sem rolagem horizontal e alvos ≥ 44 px; nada por /carreira-old:",
    Object.values(sizes).every((s) => s.overflow <= 0 && s.small.length === 0) && !visited.some((p) => p.startsWith("/carreira-old")),
    JSON.stringify({ sizes, old: visited.filter((p) => p.startsWith("/carreira-old")) }));

  await browser.close();
})();
