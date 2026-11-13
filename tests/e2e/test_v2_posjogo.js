// Carreira 2.0 — fase 4 do plano de independência (pós-jogo pela v2).
// Depois do Resultado, "Continuar" segue nas telas da v2, com o motor
// sempre escondido (antes: a versão anterior em tela cheia).
//  1) Coletiva: pergunta e respostas da biblioteca do jogo; responder mostra
//     o efeito real (reputação e moral) só depois e grava no save.
//  2) Notícias da rodada: manchetes da rodada (até 3) e finanças com o
//     caixa do save.
//  3) Resultados da rodada: todos os jogos, o seu primeiro e marcado; "Ver
//     tabela" abre a Tabela e volta aos resultados.
//  4) Proposta: jogador, clube, valor; "Aceitar" vende como na versão
//     anterior (sai do elenco, valor no caixa) e o pós-jogo termina no Início
//     na rodada seguinte.
//  5) Segunda rodada: "Pular" a coletiva não muda nada; "Decidir depois"
//     mantém a proposta pendente no save.
//  6) 360 px sem rolagem horizontal e alvos ≥ 44 px; nenhuma navegação por
//     /carreira-old e o motor nunca aparece.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, serverCareer, motorNaPagina, playV2MatchToEnd } = require("./_v2_carreira");

const base = "http://localhost:8787";

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  await newCareer(page, `v2pos${Date.now()}@teste.com`);
  await page.close();

  const v2 = await ctx.newPage();
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const visited = [];
  v2.on("framenavigated", (f) => { if (f === v2.mainFrame()) visited.push(new URL(f.url()).pathname); });
  let motorShown = false;
  // Desde a G2c o motor é módulo na página: nenhum quadro, nem escondido.
  const watchMotor = async () => { motorShown = motorShown || await v2.evaluate(() => document.querySelectorAll("iframe").length > 0); };
  const sizes = {};
  const at360 = async (k) => {
    await v2.setViewportSize({ width: 360, height: 780 });
    sizes[k] = await v2.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth,
      small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className) }));
    await v2.setViewportSize({ width: 390, height: 844 });
  };
  const h1 = () => v2.evaluate(() => (document.querySelector("h1") || {}).textContent || "");
  const waitH1 = (t) => v2.waitForFunction((t) => (document.querySelector("h1") || {}).textContent === t, t, { timeout: 20000 });

  // Joga a rodada 1 e, antes de "Continuar", garante coletiva e proposta na
  // memória do motor (mesmas funções que o fim da partida usa).
  const playAndForce = async (persistOffer) => {
    await playV2MatchToEnd(v2);
    await v2.waitForSelector('.pz-foot .cta[data-save="saved"]:not([aria-disabled])', { timeout: 30000 });
    await motorNaPagina(v2);
    return v2.evaluate(async (persistOffer) => {
      const { estado, posjogo, carga } = __motor;
      const CAREER = estado.carreiraAtual(), LEAGUE_TEAMS = estado.ligaAtual();
      posjogo.firePressConference("01", CAREER.currentRound - 1, true);
      const PENDING_PRESS = estado.coletivaPendente();
      const p = CAREER.squad.find((x) => !CAREER.lineup.starters.includes(x.id) && x.value) || CAREER.squad[CAREER.squad.length - 1];
      const club = LEAGUE_TEAMS.find((t) => String(t.id) !== String(CAREER.clubId));
      CAREER.pendingOffer = { playerId: p.id, playerName: p.name, clubId: String(club.id), clubName: club.name, fee: 4_321_000, round: CAREER.currentRound };
      if (persistOffer) await carga.persistCareer();
      return { question: PENDING_PRESS.entry.pergunta, answers: PENDING_PRESS.entry.respostas.length, player: p.id, playerName: p.name, club: club.name, round: CAREER.currentRound };
    }, persistOffer);
  };

  const forced = await playAndForce(false);
  const before = await serverCareer(v2);
  await v2.click(".pz-foot .cta");

  // 1) Coletiva.
  await waitH1("Sua vez de falar.");
  await watchMotor();
  const c1 = await v2.evaluate(() => ({ url: location.pathname, q: document.querySelector(".pj-question").textContent, n: document.querySelectorAll(".pj-answer").length }));
  await at360("coletiva");
  await v2.click(".pj-answer");
  await v2.waitForSelector(".pj-effect", { timeout: 15000 });
  const effect = await v2.textContent(".pj-effect");
  const s1 = await serverCareer(v2);
  const log = (s1.pressLog || [])[0];
  check("1) Coletiva da v2: pergunta e respostas reais; efeito só depois de responder (= o gravado no save):",
    c1.url === "/pos-jogo" && c1.q === forced.question && c1.n === forced.answers && log && (s1.pressLog || []).length === (before.pressLog || []).length + 1
      && effect === `Reputação ${log.reputacao > 0 ? "+" : log.reputacao < 0 ? "−" : ""}${Math.abs(log.reputacao)} · Moral do elenco ${log.moral > 0 ? "+" : log.moral < 0 ? "−" : ""}${Math.abs(log.moral)}`,
    JSON.stringify({ c1, effect, log }));
  await v2.click(".pj .cal-foot .cta");

  // 2) Notícias da rodada.
  await waitH1("Nos bastidores.");
  await watchMotor();
  const n2 = await v2.evaluate(() => ({ items: document.querySelectorAll(".nw-title").length, rows: [...document.querySelectorAll(".wk-item")].map((r) => [r.querySelector("dt").textContent, r.querySelector("dd").textContent]), sub: document.querySelector(".screen-sub").textContent }));
  const cash = (n2.rows.find((r) => r[0] === "Caixa") || [])[1];
  const fmt = (v) => `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  await at360("noticias");
  check("2) Notícias da rodada: até 3 manchetes da rodada e finanças com o caixa do save:",
    n2.items <= 3 && n2.sub === `Rodada ${forced.round - 1} · as manchetes da rodada` && cash === fmt(s1.finances.cash), JSON.stringify({ n2, cash: s1.finances.cash }));
  await v2.click(".pj .cal-foot .cta");

  // 3) Resultados da rodada + Ver tabela.
  await waitH1("A disputa continua.");
  await watchMotor();
  const r3 = await v2.evaluate(() => ({ rows: document.querySelector(".pj-results").querySelectorAll(".pj-res").length, firstMine: document.querySelector(".pj-res").classList.contains("is-mine"), mine: document.querySelectorAll(".pj-res.is-mine").length }));
  await at360("resultados");
  await v2.click(".pj .cal-foot .link-back");
  await v2.waitForSelector(".tb-table", { timeout: 10000 });
  const tableUrl = await v2.evaluate(() => location.pathname + location.search);
  await v2.click(".tb-foot .link-back");
  await waitH1("A disputa continua.");
  check("3) Resultados da rodada: 10 jogos, o seu primeiro e marcado; 'Ver tabela' abre a Tabela e volta aos resultados:",
    r3.rows === 10 && r3.firstMine && r3.mine === 1 && tableUrl === "/pos-jogo?tela=tabela", JSON.stringify({ r3, tableUrl }));
  await v2.click(".pj .cal-foot .cta");

  // 4) Proposta → Aceitar.
  await waitH1("Uma oferta chegou.");
  await watchMotor();
  const p4 = await v2.evaluate(() => ({ name: document.querySelector(".pj-player .row-title").textContent, fee: document.querySelector(".pj-fee").textContent, club: document.querySelector("#pj-cl + .wk-list dt")?.textContent,
    rows: [...document.querySelectorAll(".wk-item dt")].map((d) => d.textContent), btns: [...document.querySelectorAll(".pj .cal-foot button")].map((b) => b.textContent) }));
  await at360("proposta");
  await v2.click(".pj .cal-foot .cta");
  await v2.waitForSelector(".home", { timeout: 30000 });
  await watchMotor();
  const s4 = await serverCareer(v2);
  const home4 = await v2.evaluate(() => document.querySelector(".home-date")?.textContent || "");
  check("4) Proposta: jogador, clube e valor reais; Aceitar vende (sai do elenco, +valor no caixa); termina no Início na rodada seguinte:",
    p4.fee === "R$ 4,3 mi" && p4.club === forced.club && p4.rows.includes("Parcelamento") && JSON.stringify(p4.btns) === JSON.stringify(["Aceitar", "Recusar", "Decidir depois"])
      && !s4.squad.some((x) => x.id === forced.player) && s4.finances.cash === s1.finances.cash + 4_321_000 && !s4.pendingOffer && home4.endsWith(`RODADA ${forced.round}`),
    JSON.stringify({ p4, cash: [s1.finances.cash, s4.finances.cash], pending: s4.pendingOffer, home4 }));

  // 5) Rodada 2: Pular a coletiva; Decidir depois.
  const forced2 = await playAndForce(true);
  const before5 = await serverCareer(v2);
  await v2.click(".pz-foot .cta");
  await waitH1("Sua vez de falar.");
  await v2.click(".pj .cal-foot .link-back"); // Pular
  await waitH1("Nos bastidores.");
  await v2.click(".pj .cal-foot .cta");
  await waitH1("A disputa continua.");
  await v2.click(".pj .cal-foot .cta");
  await waitH1("Uma oferta chegou.");
  await v2.click(".pj .cal-foot .text-btn"); // Decidir depois
  await v2.waitForSelector(".home", { timeout: 30000 });
  const s5 = await serverCareer(v2);
  check("5) 'Pular' a coletiva não muda reputação nem o registro; 'Decidir depois' mantém a proposta pendente no save:",
    (s5.pressLog || []).length === (before5.pressLog || []).length && s5.reputation === before5.reputation && s5.pendingOffer && s5.pendingOffer.playerId === forced2.player && s5.squad.some((x) => x.id === forced2.player),
    JSON.stringify({ log: [(before5.pressLog || []).length, (s5.pressLog || []).length], rep: [before5.reputation, s5.reputation], pending: s5.pendingOffer }));

  check("6) 360 px sem rolagem horizontal e alvos ≥ 44 px; nenhuma navegação por /carreira-old; motor nunca visível:",
    Object.values(sizes).every((s) => s.overflow <= 0 && s.small.length === 0) && !visited.some((p) => p.startsWith("/carreira-old")) && !motorShown,
    JSON.stringify({ sizes, old: visited.filter((p) => p.startsWith("/carreira-old")), motorShown }));

  await browser.close();
})();
