// Redesign capítulos 1–7 — pela UI real: configurar carreira (nome),
// primeira entrada, escudos oficiais, Início com dados reais, Jogos,
// filtros do Elenco, renomear esquema; e a RETIRADA (31/10/2026) de
// busca/favoritos/popularidade, nacionalidade/foto, confiança e saves.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { enterGame, waitForBoot } = require("./_startup");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";
  const email = `redesign${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Murilo Almeida", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });
  await page.goto(base + "/carreira.html", { waitUntil: "domcontentloaded" });
  await waitForBoot(page);

  // 1) Competição: lista real, sem abas (1 categoria), sem selo sem dado.
  const comp = await page.evaluate(() => ({
    cards: [...document.querySelectorAll(".mt-competition-card")].map((c) => c.dataset.competition),
    catsHidden: document.getElementById("competitionCategories").hidden,
  }));
  check("1) Competição: 3 divisões reais, abas ocultas com 1 categoria:", JSON.stringify(comp.cards) === JSON.stringify(["brasileirao", "serie_b", "serie_c"]) && comp.catsHidden, JSON.stringify(comp));

  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForSelector(".m3-club-row", { timeout: 20000 });

  // 2) Escolha do clube: escudos oficiais; busca, favoritos, região e
  // selo "Mais popular" foram RETIRADOS (decisão de 31/10/2026).
  const crests = await page.evaluate(() => document.querySelector('.m3-club-row[data-id="fla"] img.bd-crest')?.getAttribute("src"));
  check("2a) Escudo oficial do repositório na grade (Flamengo):", crests === "img/teams/fla.svg", crests);
  const retired = await page.evaluate(async () => ({
    search: !!document.getElementById("clubSearch"), favs: document.querySelectorAll(".bd-fav").length, popular: document.querySelectorAll(".bd-badge").length,
    popApi: (await fetch("/api/career/competition-popularity")).status, favApi: (await fetch("/api/account/career-favorites", { method: "PUT", headers: { "Content-Type": "application/json" }, body: "{}" })).status,
  }));
  check("2b) Busca/favoritos/região/'Mais popular' retirados (tela e API):", !retired.search && retired.favs === 0 && retired.popular === 0 && retired.popApi >= 400 && retired.favApi >= 400 /* 404, ou 501 sem fornecedor ao vivo */, JSON.stringify(retired));

  // 4) Configurar carreira: só o nome (nacionalidade e foto retiradas).
  await page.click('.m3-club-row[data-id="fla"]');
  await page.click("#btnConfirmClub");
  await page.waitForSelector("#screenSetup:not(.hidden)");
  await page.fill("#setupCoachName", "   ");
  await page.click("#btnStartCareer");
  const nameErr = await page.evaluate(() => ({ shown: document.getElementById("setupError").style.display !== "none", stillSetup: !document.getElementById("screenSetup").classList.contains("hidden") }));
  check("4a) Nome vazio bloqueia com mensagem, sem sair da tela:", nameErr.shown && nameErr.stillSetup, JSON.stringify(nameErr));
  await page.fill("#setupCoachName", "Murilo Treinador");
  const noExtras = await page.evaluate(() => !document.getElementById("setupNationality") && !document.getElementById("setupAvatarInput"));
  await page.click("#btnStartCareer");
  await page.waitForSelector("#screenFirstEntry:not(.hidden)", { timeout: 30000 });
  const me = await page.evaluate(async () => (await (await fetch("/api/auth/me")).json()).user);
  check("4b) Nome salvo na conta; sem campos de nacionalidade/foto:", me.name === "Murilo Treinador" && noExtras && me.coachNationality === undefined && me.coachAvatar === undefined, JSON.stringify({ name: me.name, noExtras }));

  // 5) Primeira entrada: clube e competição reais; uma ação.
  const first = await page.evaluate(() => ({ sub: document.getElementById("firstEntrySub").textContent, crest: document.querySelector("#firstEntryCrest img")?.getAttribute("src") }));
  check("5) Primeira entrada com clube/competição reais e escudo oficial:", first.sub.includes("Flamengo") && first.sub.includes("Brasileirão Série A") && first.crest === "img/teams/fla.svg", JSON.stringify(first));
  await page.click("#btnFirstEntryGo");
  await enterGame(page);

  // 6) Início: saudação com o nome real, sem estatística inventada antes do 1º jogo.
  const home = await page.evaluate(() => ({
    greet: document.getElementById("homeGreeting").textContent,
    statsEmpty: !!document.querySelector("#homeStats .bd-empty-inline"),
    tableMine: !!document.querySelector("#homeMiniTable tr.mine"),
    chip: document.getElementById("topbarPositionChip").textContent,
    initials: (document.querySelector("#btnTopbarCoach .bd-avatar--mono")?.textContent || "").trim(),
  }));
  check("6) Início: nome real, sem estatística/posição antes do 1º jogo, tabela com o clube, iniciais no topo:",
    home.greet.includes("Murilo") && home.statsEmpty && home.tableMine && home.chip === "Pré-jogo" && home.initials === "MT", JSON.stringify(home));

  // 7) Indicador de confiança da diretoria retirado (decisão de 31/10/2026).
  const conf = await page.evaluate(() => ({ fn: typeof boardConfidence, card: !!document.getElementById("homeBoardCard"), box: !!document.getElementById("boardConfidenceBox") }));
  check("7) Indicador de confiança da diretoria retirado:", conf.fn === "undefined" && !conf.card && !conf.box, JSON.stringify(conf));

  // 8) Jogos: calendário do clube com o 1º jogo marcado como próximo.
  await page.click('.m3-bottom-nav [data-panel="jogos"]');
  const jogos = await page.evaluate(() => ({ rows: document.querySelectorAll("#jogosList .bd-fixture").length, next: !!document.querySelector("#jogosList .bd-fixture.next"), month: document.getElementById("jogosMonthLabel").textContent }));
  await page.click('#jogosTabs [data-jogos-tab="resultados"]');
  const noResults = await page.evaluate(() => document.querySelector("#jogosList .bd-empty")?.textContent || "");
  check("8) Jogos: mês do próximo jogo com o jogo marcado; Resultados vazio honesto:", jogos.rows > 0 && jogos.next && /2023|2024|2025|2026/.test(jogos.month) && noResults.includes("Nenhum jogo disputado"), JSON.stringify({ jogos, noResults }));

  // 9) Elenco: filtro de posição e busca.
  await page.click(".m3-nav-item[data-panel='elenco']");
  await page.click('#elencoFilterRow [data-filter="GOL"]');
  const gk = await page.evaluate(() => [...document.querySelectorAll("#squadMainList [data-id]")].map((r) => subPositionOf(CAREER.squad.find((p) => p.id === r.dataset.id))));
  await page.fill("#elencoSearch", "zzzz");
  const noPlayer = await page.evaluate(() => document.querySelector("#squadMainList .ct-empty")?.textContent || "");
  await page.fill("#elencoSearch", "");
  await page.click('#elencoFilterRow [data-filter="todos"]');
  check("9) Elenco: filtro Goleiros só traz GOL; busca sem resultado avisa:", gk.length > 0 && gk.every((x) => x === "GOL") && noPlayer.includes("Nenhum jogador"), JSON.stringify({ gk, noPlayer }));

  // 10) Esquemas: renomear valida duplicado e persiste.
  await page.evaluate(() => { saveTacticalScheme("Ofensivo"); saveTacticalScheme("Defensivo"); });
  const dup = await page.evaluate(() => renameTacticalScheme(CAREER.tacticalSchemes[1].id, "ofensivo"));
  await page.evaluate(() => { openSchemesScreen(); });
  await page.click(`#schemesList [data-rename]`);
  await page.fill("#renameSchemeInput", "Contra-ataque");
  await page.click("#renameSchemeForm button[type=submit]");
  await page.waitForTimeout(400);
  const names = await page.evaluate(() => CAREER.tacticalSchemes.map((s) => s.name));
  check("10) Renomear esquema: duplicado recusado, novo nome aplicado:", dup.ok === false && names.includes("Contra-ataque"), JSON.stringify({ dup, names }));
  await page.evaluate(() => { closeSchemesScreen && closeSchemesScreen(); persistCareer(); });

  // 11) Uma carreira por conta: "Meus saves" e a API de slots retirados
  // (decisão de 31/10/2026); recarregar volta para a mesma carreira.
  await page.evaluate(() => persistCareer());
  await page.waitForTimeout(400);
  const saves = await page.evaluate(async () => ({
    menu: !!document.getElementById("btnOpenSaves"), overlay: !!document.getElementById("savesOverlay"),
    api: (await fetch("/api/career/slots")).status,
  }));
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForBoot(page);
  const back = await page.evaluate(() => ({ club: CAREER && CAREER.clubName, schemes: CAREER && CAREER.tacticalSchemes.map((s) => s.name) }));
  check("11) Sem gerência de saves (tela e API); recarregar mantém a carreira e os esquemas:",
    !saves.menu && !saves.overlay && saves.api === 404 && back.club === "Flamengo" && back.schemes.includes("Contra-ataque"), JSON.stringify({ saves, back }));

  await browser.close();
})();
