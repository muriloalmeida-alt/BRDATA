// Redesign capítulos 1–7 — funcionalidades novas pela UI real:
// configurar carreira (validação, nacionalidade, foto), primeira entrada,
// busca/favoritos na escolha de clube, Início com dados reais, Jogos,
// filtros do Elenco, renomear esquema, confiança da diretoria e
// gerenciamento de saves (vários slots por conta).
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

  // 2) Escolha do clube: escudos oficiais, busca por cidade, vazio + limpar.
  const crests = await page.evaluate(() => document.querySelector('.m3-club-row[data-id="fla"] img.bd-crest')?.getAttribute("src"));
  check("2a) Escudo oficial do repositório na grade (Flamengo):", crests === "img/teams/fla.svg", crests);
  await page.fill("#clubSearch", "porto alegre");
  const porto = await page.evaluate(() => [...document.querySelectorAll(".m3-club-row")].map((r) => r.dataset.id).sort());
  check("2b) Busca por cidade (sem acento/caixa) acha Grêmio e Internacional:", JSON.stringify(porto) === JSON.stringify(["gre", "int"]), JSON.stringify(porto));
  await page.fill("#clubSearch", "xyzxyz");
  const empty = await page.evaluate(() => ({ rows: document.querySelectorAll(".m3-club-row").length, emptyShown: !document.getElementById("clubGridEmpty").hidden }));
  await page.click("#btnClearClubFilters");
  const cleared = await page.evaluate(() => document.querySelectorAll(".m3-club-row").length);
  check("2c) Sem resultado mostra estado vazio; 'Limpar filtros' devolve a lista:", empty.rows === 0 && empty.emptyShown && cleared === 20, JSON.stringify({ empty, cleared }));

  // 3) Favoritos: marca, filtra e persiste na conta.
  await page.click('.m3-club-row[data-id="pal"] .bd-fav');
  await page.waitForFunction(() => (ME.careerFavorites || []).includes("pal"), null, { timeout: 5000 }).catch(() => {});
  await page.click('#clubFilters [data-club-filter="fav"]');
  const favRows = await page.evaluate(() => [...document.querySelectorAll(".m3-club-row")].map((r) => r.dataset.id));
  const favServer = await page.evaluate(async () => (await (await fetch("/api/auth/me")).json()).user.careerFavorites);
  check("3) Favorito filtra e fica salvo na conta:", JSON.stringify(favRows) === '["pal"]' && JSON.stringify(favServer) === '["pal"]', JSON.stringify({ favRows, favServer }));
  await page.click('#clubFilters [data-club-filter="all"]');

  // 4) Configurar carreira: nome obrigatório, nacionalidade e foto salvas.
  await page.click('.m3-club-row[data-id="fla"]');
  await page.click("#btnConfirmClub");
  await page.waitForSelector("#screenSetup:not(.hidden)");
  await page.fill("#setupCoachName", "   ");
  await page.click("#btnStartCareer");
  const nameErr = await page.evaluate(() => ({ shown: document.getElementById("setupError").style.display !== "none", stillSetup: !document.getElementById("screenSetup").classList.contains("hidden") }));
  check("4a) Nome vazio bloqueia com mensagem, sem sair da tela:", nameErr.shown && nameErr.stillSetup, JSON.stringify(nameErr));
  // PNG 2×2 válido gerado na hora (sem arquivo externo).
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==", "base64");
  await page.setInputFiles("#setupAvatarInput", { name: "foto.png", mimeType: "image/png", buffer: png });
  await page.waitForFunction(() => !!document.querySelector("#setupAvatarPreview img"), null, { timeout: 5000 }).catch(() => {});
  await page.fill("#setupCoachName", "Murilo Treinador");
  await page.selectOption("#setupNationality", "PT");
  await page.click("#btnStartCareer");
  await page.waitForSelector("#screenFirstEntry:not(.hidden)", { timeout: 30000 });
  const me = await page.evaluate(async () => (await (await fetch("/api/auth/me")).json()).user);
  check("4b) Perfil do treinador salvo (nome, nacionalidade, foto reduzida):", me.name === "Murilo Treinador" && me.coachNationality === "PT" && /^data:image\/(webp|jpeg);base64,/.test(me.coachAvatar || ""), JSON.stringify({ name: me.name, nat: me.coachNationality, avatar: (me.coachAvatar || "").slice(0, 24) }));

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
    avatar: !!document.querySelector("#btnTopbarCoach img"),
  }));
  check("6) Início: nome real, sem estatística/posição antes do 1º jogo, tabela com o clube, foto no topo:",
    home.greet.includes("Murilo") && home.statsEmpty && home.tableMine && home.chip === "Pré-jogo" && home.avatar, JSON.stringify(home));

  // 7) Confiança da diretoria: 0–100 e igual à soma das parcelas exibidas.
  const conf = await page.evaluate(() => { const c = boardConfidence(); return { v: c.value, sum: 50 + c.parts.reduce((a, p) => a + p.delta, 0) }; });
  check("7) Confiança da diretoria explicável (valor = base + parcelas, limitado 0–100):", conf.v >= 0 && conf.v <= 100 && conf.v === Math.max(0, Math.min(100, conf.sum)), JSON.stringify(conf));

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

  // 11) Saves: nova carreira em outro slot sem perder a primeira; trocar; excluir.
  await page.evaluate(() => persistCareer());
  await page.waitForTimeout(400);
  await page.evaluate(() => openSavesScreen());
  await page.waitForSelector("[data-save-new]");
  await page.click("[data-save-new]");
  await page.waitForLoadState("domcontentloaded");
  await waitForBoot(page);
  // O "voltar aos saves" aparece depois da consulta a /api/career/slots.
  const onPicker = await page.waitForFunction(() => !document.getElementById("screenCompetitionPicker").classList.contains("hidden") && !document.getElementById("btnCompetitionPickerBack").hidden, null, { timeout: 8000 }).then(() => true, () => false);
  await page.click('.mt-competition-card[data-competition="serie_b"]');
  await page.waitForSelector(".m3-club-row", { timeout: 20000 });
  await page.click(".m3-club-row");
  await page.click("#btnConfirmClub");
  await enterGame(page);
  const clubB = await page.evaluate(() => CAREER.clubName);
  await page.evaluate(() => persistCareer());
  await page.waitForTimeout(300);
  const slots = await page.evaluate(async () => (await (await fetch("/api/career/slots")).json()).slots.filter((s) => !s.empty).map((s) => s.meta.clubName));
  check("11a) Nova carreira em slot vazio: seletor com 'voltar aos saves'; 2 saves na conta:", onPicker && slots.length === 2 && slots.includes("Flamengo") && slots.includes(clubB), JSON.stringify({ onPicker, slots }));
  await page.evaluate(() => openSavesScreen());
  await page.waitForSelector("[data-save-load]");
  await page.click("[data-save-load]");
  await page.waitForLoadState("domcontentloaded");
  await waitForBoot(page);
  const back = await page.evaluate(() => ({ club: CAREER && CAREER.clubName, schemes: CAREER && CAREER.tacticalSchemes.map((s) => s.name) }));
  check("11b) 'Continuar' volta pra carreira do Flamengo intacta (esquemas renomeados preservados):", back.club === "Flamengo" && back.schemes.includes("Contra-ataque"), JSON.stringify(back));
  await page.evaluate(() => openSavesScreen());
  await page.waitForSelector("[data-save-del]");
  const delBtns = await page.$$("[data-save-del]");
  await delBtns[1].click();
  await page.click("#confirmOkBtn");
  await page.waitForTimeout(800);
  const after = await page.evaluate(async () => (await (await fetch("/api/career/slots")).json()).slots.filter((s) => !s.empty).map((s) => s.meta.clubName));
  check("11c) Excluir (com confirmação) remove só o outro save:", JSON.stringify(after) === '["Flamengo"]', JSON.stringify(after));

  await browser.close();
})();
