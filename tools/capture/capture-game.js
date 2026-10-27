#!/usr/bin/env node
/* Capturas reais dos capítulos 2–7 numa carreira de verdade.
   Uso: node tools/capture/capture-game.js <baseUrl> <saída> [w×h] [rodadas]
   Ex.: node tools/capture/capture-game.js http://localhost:8791 /tmp/caps 390x844 3

   Cria uma conta nova, passa pelo fluxo do Cap. 1, pula a pré-temporada
   e joga N rodadas pela interface (mesmo caminho dos testes E2E: pré-jogo
   → ao vivo → resultado → notícias → resultados → tabela), fotografando
   no caminho. Cada captura é independente: se uma tela falhar, registra
   e segue. */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const { passCareerSetup, enterGame } = require("../../tests/e2e/_startup");
const { skipPreseason } = require("../../tests/e2e/_calendar_skip");

const base = process.argv[2] || "http://localhost:8791";
const out = process.argv[3] || "/tmp/caps";
const [W, H] = (process.argv[4] || "390x844").split("x").map(Number);
const ROUNDS = Number(process.argv[5] || 3);
const tag = `${W}x${H}`;
fs.mkdirSync(out, { recursive: true });
const failures = [];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
  const shot = async (name, fn) => {
    try {
      if (fn) await fn();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(out, `${name}-${tag}.png`) });
      console.log("ok", name);
    } catch (e) { failures.push(`${name}: ${e.message.split("\n")[0]}`); console.log("FAIL", name, e.message.split("\n")[0]); }
  };
  const closeAll = async () => {
    await page.evaluate(() => {
      document.querySelectorAll(".ct-modal-overlay.open").forEach((o) => { if (o.id !== "liveMatchOverlay") o.classList.remove("open"); });
      document.querySelectorAll(".m3-bottom-sheet-overlay, .m3-dialog-overlay").forEach((o) => o.remove());
      const m = document.getElementById("topbarMenu"); if (m) m.classList.remove("open");
    });
    await page.waitForTimeout(150);
  };
  const tab = async (panel) => { await closeAll(); await page.evaluate((p) => switchToPanel(p), panel); await page.waitForTimeout(250); };

  const email = `caps_${tag}_${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async (email) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Murilo Almeida", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, email);
  await page.goto(base + "/carreira.html", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForSelector(".m3-club-row", { timeout: 20000 });
  await page.click('.m3-club-row[data-id="fla"]');
  await page.click("#btnConfirmClub");
  await passCareerSetup(page);
  await enterGame(page);

  // Pré-temporada (estado real de carreira nova)
  await shot("c2t01-inicio-pretemporada");

  // Joga N rodadas pela interface, fotografando o 1º jogo inteiro.
  await skipPreseason(page);
  for (let r = 0; r < ROUNDS; r++) {
    const first = r === 0;
    await closeAll();
    await page.evaluate(() => switchToPanel("central"));
    await page.click("#btnSimulate");
    if (await page.waitForSelector("#preMatchOverlay.open", { timeout: 8000 }).then(() => true, () => false)) {
      if (first) await shot("c4t01-pre-jogo");
      await page.click("#btnPreMatchGo");
    }
    await page.waitForSelector("#liveMatchOverlay.open", { timeout: 15000 });
    if (first) {
      await page.waitForTimeout(2500);
      await shot("c4t02-ao-vivo");
      await shot("c4t04-substituicoes", async () => { await page.click("#btnLiveSub", { timeout: 4000 }); });
      await page.evaluate(() => { const o = document.getElementById("liveSubOverlay"); if (o) o.classList.remove("open"); });
      await shot("c4t03-ajustes-taticos-ao-vivo", async () => { await page.click("#btnLiveTactics", { timeout: 4000 }); });
      await page.evaluate(() => { const o = document.getElementById("liveTacticsOverlay"); if (o) o.classList.remove("open"); });
    }
    await page.evaluate(() => typeof skipLiveMatch === "function" && skipLiveMatch());
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(300);
      const open = await page.evaluate(() => [...document.querySelectorAll(".ct-modal-overlay.open")].map((e) => e.id));
      if (!open.length) break;
      const top = open[open.length - 1];
      if (first && top === "matchDetailOverlay") { await shot("c4t06-resultado-final"); await shot("c4t05-eventos-estatisticas", async () => { await page.evaluate(() => { const el = document.querySelector("#matchDetailOverlay .ct-modal-body"); if (el) el.scrollTop = el.scrollHeight / 2; }); }); }
      if (first && top === "newsOverlay") await shot("c6t06-noticias-rodada");
      if (first && top === "roundResultsOverlay") await shot("c4t07-resultados-rodada");
      if (first && top === "tabelaModalOverlay") await shot("c4t07-tabela");
      const btn = { matchDetailOverlay: "#btnMatchDetailContinue", newsOverlay: "#btnNewsContinue", roundResultsOverlay: "#btnRoundResultsContinue", tabelaModalOverlay: "#btnTabelaModalCloseFooter", pressOverlay: "#pressOverlay [data-press-answer]", playerOfferOverlay: "#btnPlayerOfferReject" }[top];
      if (btn) await page.click(btn, { timeout: 3000 }).catch(async () => { await page.evaluate((id) => document.getElementById(id).classList.remove("open"), top); });
      else await page.evaluate((id) => document.getElementById(id).classList.remove("open"), top);
    }
  }

  // ---------- Cap. 2 ----------
  await tab("central"); await shot("c2t01-inicio");
  await page.screenshot({ path: path.join(out, `c2t01-inicio-full-${tag}.png`), fullPage: true });
  await tab("elenco"); await shot("c2t02-elenco");
  await shot("c2t02-elenco-filtro-def", async () => { await page.click('#elencoFilterRow [data-filter="DEF"]'); });
  await page.click('#elencoFilterRow [data-filter="todos"]').catch(() => {});
  await shot("c2t03-jogador", async () => { await page.click("#squadMainList [data-id]"); await page.waitForSelector("#detailOverlay.open"); });
  await shot("c2t03-jogador-contrato", async () => { await page.click('[data-detail-tab="contrato"]'); });
  await shot("c2t04-comissao", async () => { await closeAll(); await page.evaluate(() => openCommissionScreen()); });
  await shot("c2t05-diretoria", async () => { await closeAll(); await page.evaluate(() => openBoardGoalsScreen()); });
  await tab("clube"); await shot("c2t06-financas");
  await shot("c2t06-financas-fluxo", async () => { await page.evaluate(() => document.getElementById("financeFlowChart").scrollIntoView({ block: "center" })); });
  await shot("c2t06-extrato", async () => { await page.evaluate(() => openExtratoScreen()); });
  await tab("jogos"); await shot("c2t07-calendario");
  await shot("c2t07-jogo-passado", async () => { await page.click("#jogosTabs [data-jogos-tab='resultados']"); await page.click(".bd-fixture"); });

  // ---------- Cap. 3 ----------
  await tab("escalacao"); await shot("c3t01-formacao-escalacao");
  await shot("c3t02-troca-jogador", async () => { await page.click(".mt-pitch-slot, [data-slot]", { timeout: 4000 }); });
  await shot("c3t03-instrucoes", async () => { await closeAll(); await page.evaluate(() => openSectorScreen()); });
  await shot("c3t04-esquemas", async () => { await closeAll(); await page.evaluate(() => openSchemesScreen()); });
  await tab("treinos"); await shot("c3t05-treinamento");
  await shot("c3t06-evolucao-condicao", async () => { await closeAll(); await page.evaluate(() => openFatigueHistory && openFatigueHistory()); });

  // ---------- Cap. 4 ----------
  await tab("tabela"); await shot("c4t07-competicoes");

  // ---------- Cap. 5 ----------
  await tab("mercado"); await shot("c5t01-mercado");
  await shot("c5t02-perfil-alvo", async () => { await page.click("#marketList [data-player-id], #marketList [data-id], .mt-market-row", { timeout: 5000 }); });
  await shot("c5t06-contratos", async () => { await closeAll(); await page.evaluate(() => openContratosScreen()); });
  await shot("c5t07-historico-transferencias", async () => { await closeAll(); await page.evaluate(() => openTransferHistoryScreen()); });
  await shot("c5t08-olheiros", async () => { await closeAll(); await page.evaluate(() => openScoutingScreen()); });
  await shot("c5t10-base", async () => { await closeAll(); await page.evaluate(() => openBaseCategoriesScreen()); });

  // ---------- Cap. 6 ----------
  await shot("c6t01-perfil-treinador", async () => { await closeAll(); await page.evaluate(() => openCoachProfileScreen()); });
  await shot("c6t05-conquistas", async () => { await tab("conquistas"); });
  await shot("c6t06-notificacoes", async () => { await closeAll(); await page.evaluate(() => openNotificationsSheet()); });
  await shot("c6t07-estadio", async () => { await closeAll(); await page.evaluate(() => openStadiumScreen()); });

  // ---------- Cap. 7 ----------
  await shot("c7t01-menu", async () => { await closeAll(); await page.click("#btnBottomMenu"); });
  await shot("c7t01-configuracoes", async () => { await closeAll(); await page.evaluate(() => openSettingsScreen()); });
  await shot("c7t03-ajuda", async () => { await closeAll(); await page.evaluate(() => openHelpCenter && openHelpCenter()); });
  await shot("c7t04-confirmacao", async () => { await closeAll(); await page.evaluate(() => confirmModal("Apagar este esquema? Essa ação não pode ser desfeita.", "Apagar", { danger: true })); });

  fs.writeFileSync(path.join(out, `_falhas-${tag}.txt`), failures.join("\n"));
  console.log(`\n${failures.length} falha(s)`);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
