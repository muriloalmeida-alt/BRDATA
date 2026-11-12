// Ajudantes para testes NOVOS da carreira oficial (/carreira, a v2).
// Não usam a tela antiga (carreira.html, /carreira-old), que está
// descontinuada e congelada (09/11, ver CLAUDE.md e tests/e2e/README.md):
// a conta é criada pela API e a carreira pelas telas da própria v2.
// Para regra do jogo sem navegador, ver _sem_tela.js.
const base = "http://localhost:8787";

// Conta nova já logada nesta página.
async function contaNova(page, email) {
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    const corpo = (b) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
    await fetch("/api/auth/signup", corpo({ name: "Teste V2", email, password: "senha123", phone: "11999999999", plan: "freemium" }));
    await fetch("/api/auth/login", corpo({ email, password: "senha123" }));
  }, { email });
}

// O save da conta no servidor.
async function saveNoServidor(page) {
  return page.evaluate(async () => (await (await fetch("/api/career", { cache: "no-store" })).json()).career);
}

// Conta nova + carreira criada pela v2 (Série A, o clube da posição
// `clube` na lista, 0 = o primeiro) e o caminho de primeira entrada
// (tutorial, assistente de início e recompensa) até o Início.
// Devolve o save do servidor.
async function novaCarreiraV2(page, email, { clube = 0 } = {}) {
  await contaNova(page, email);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('.ac-opt[role="radio"]', { timeout: 40000 });
  await page.locator(".ac-opt").first().click();
  await page.click(".ac-foot .cta");
  await page.waitForSelector(".ac-club", { timeout: 40000 });
  await page.locator(".ac-club").nth(clube).click();
  await page.click(".ac-foot .cta");
  await page.waitForSelector(".ac-clubline", { timeout: 20000 });
  await page.click(".ac-form .cta");
  await page.waitForURL(/\/nova\/pronto$/, { timeout: 90000 });
  await ateOInicio(page);
  return saveNoServidor(page);
}

// Primeira entrada da v2 (tutorial, assistente de início e recompensa) até
// o Início, pelas telas da v2.
async function ateOInicio(page) {
  // Cada passo troca a tela: o botão visto pode sumir antes do clique.
  // Nesse caso o clique falha rápido e a volta seguinte olha de novo.
  const clicar = (sel) => page.click(sel, { timeout: 2000 }).catch(() => {});
  // Prazo por tempo (sob carga, cada tela demora mais): até 60 s.
  // O Início aparece por um instante antes de a v2 abrir sozinha o
  // tutorial, o assistente ou a recompensa (efeito depois do 1º desenho):
  // só sai do laço com o Início estável por ~1 s.
  for (let estavel = 0, t0 = Date.now(); Date.now() - t0 < 60000;) {
    if (await page.locator(".home").count()) { if (++estavel >= 4) break; await page.waitForTimeout(250); continue; }
    estavel = 0;
    if (await page.locator(".ob-skip").count()) await clicar(".ob-skip");
    else if (await page.locator(".wz-skip").count()) await clicar(".wz-skip");
    else if (await page.locator(".wz-next").count()) await clicar(".wz-next");
    else if (await page.locator(".rw-foot .cta").count()) await clicar(".rw-foot .cta");
    else if (await page.locator(".ac-foot .cta").count()) await clicar(".ac-foot .cta");
    await page.waitForTimeout(250);
  }
  if (!(await page.locator(".home").count())) {
    const onde = await page.evaluate(() => `${location.pathname}${location.search} | ${(document.querySelector("h1") || {}).textContent || ""}`).catch(() => "?");
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".home", { timeout: 20000 }).catch(() => { throw new Error("ateOInicio: não chegou ao Início (parou em " + onde + ")"); });
  }
}

// ---------------------------------------------------------------------------
// O motor da v2, na própria página (plano "testes sem a tela antiga", L1).
// Desde a etapa G2d a v2 roda o motor como módulo (/js/motor/v2.js): os
// módulos importados aqui são as mesmas instâncias que a v2 usa (o
// navegador guarda um módulo por endereço). Substitui, nos testes, o
// `page.evaluate(() => CAREER...)` + `persistCareer()` da tela antiga.

// Espera a v2 abrir o motor (ambiente montado, conta e, com `comCarreira`,
// a carreira carregada). Se a página não está na v2, abre o Início.
async function motorPronto(page, { comCarreira = true, timeout = 40000 } = {}) {
  if (!page.url().startsWith(base)) await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  // (waitForFunction não serve: com função async, a Promise conta como verdadeira.)
  const pronto = () => page.evaluate(async (comCarreira) => {
    if (typeof DEMO_FIRST_NAMES === "undefined") return false; // a v2 ainda não carregou o data.js
    const [semana, estado, carga] = await Promise.all([import("/js/motor/semana.js"), import("/js/motor/estado.js"), import("/js/motor/carga.js")]);
    return semana.temAmbiente() && !!estado.conta() && carga.ponteEstado().fase !== "carregando" && (!comCarreira || !!estado.carreiraAtual());
  }, comCarreira).catch(() => false);
  for (const t0 = Date.now(); !(await pronto()); await page.waitForTimeout(200)) {
    if (Date.now() - t0 > timeout) throw new Error("motorPronto: a v2 não abriu o motor em " + timeout + " ms");
  }
}

// Roda `fn(M, arg)` na página da v2. M traz os módulos do motor (estado,
// semana, carga, jogo, posjogo, aovivo, virada, clube, mercado, temporada,
// financas, treino, registro, fechamento), a ponte (`M.ponte`, os mesmos comandos de
// _sem_tela.js), a carreira em memória (`M.CAREER`, lida na hora) e
// `M.persistir()` (grava como o jogo grava). `fn` não pode usar variáveis
// de fora: o que precisar vai em `arg`.
async function noMotor(page, fn, arg, { comCarreira = true } = {}) {
  await motorPronto(page, { comCarreira });
  return page.evaluate(async ({ src, arg }) => {
    const nomes = ["estado", "semana", "carga", "jogo", "posjogo", "aovivo", "virada", "clube", "mercado", "temporada", "financas", "treino", "registro", "fechamento", "escalacao", "v2"];
    const mods = Object.fromEntries(await Promise.all(nomes.map(async (n) => [n, await import(`/js/motor/${n}.js`)])));
    const M = { ...mods, ponte: mods.v2.criarPonte(), persistir: () => mods.carga.persistCareer() };
    Object.defineProperty(M, "CAREER", { get: () => mods.estado.carreiraAtual() });
    const f = new Function(`return (${src});`)();
    return f(M, arg);
  }, { src: fn.toString(), arg });
}

// Lote L3 (testes sem a tela antiga): os testes de regra antigos rodavam
// trechos `page.evaluate(() => transferScore(...))` na página antiga, que
// tinha as funções do jogo como globais (atalhos para o motor desde a
// etapa G). Aqui, na página da v2, as mesmas funções vêm dos módulos do
// motor com os nomes de sempre, mais CAREER (o save do motor),
// persistCareer e os atalhos da página antiga que não são exports
// (teamById, sortedStandings, squadAvgOverallOf, motorMercado e o mundo:
// LEAGUE_TEAMS, ALL_TEAMS_FLAT, CURRENT_COMPETITION_ID). Quando dois
// módulos exportam o mesmo nome, vale o da camada com o save (semana,
// clube...), que era o global da página; os puros (mercado...) vêm por
// último. Nada é reimplementado: são as funções do motor.
async function globaisDoMotor(page) {
  await motorPronto(page, { comCarreira: true });
  return page.evaluate(async () => {
    const ordem = ["semana", "clube", "fechamento", "carga", "virada", "temporada", "aovivo", "posjogo", "jogo", "ponte", "estado", "escalacao", "tabela", "registro", "treino", "financas", "partida", "rodada", "calendario", "mercado"];
    const mods = {};
    for (const n of ordem) mods[n] = await import(`/js/motor/${n}.js`);
    const def = (k, v) => { if (!(k in window)) window[k] = v; };
    window.clubBudgetProxy = (clubId) => mods.mercado.clubBudget(mods.semana.marketClub(clubId));
    // Os 4 globais da página antiga que chamavam o mercado puro com o clube
    // montado (marketClub) e não têm versão com id em outro módulo.
    const S = mods.semana, Mm = mods.mercado;
    window.transferValuation = (player, buyingClubId, sellingClubId, context = {}) => Mm.transferValuation(player, S.marketClub(buyingClubId), S.marketClub(sellingClubId), { ...context, seasonYear: mods.estado.carreiraAtual().seasonYear });
    window.adequacaoScore = (candidate, squad, buyingClubId) => Mm.adequacaoScore(candidate, squad, S.marketClub(buyingClubId));
    window.contextoScore = (candidate, squad, buyingClubId) => Mm.contextoScore(candidate, squad, S.marketClub(buyingClubId));
    window.buyerNegotiationDecision = (counterValue, initialOfferValue, player, buyingClubId, context = {}) => Mm.buyerNegotiationDecision(counterValue, initialOfferValue, player, S.marketClub(buyingClubId), context);
    for (const n of ordem) for (const [k, v] of Object.entries(mods[n])) def(k, v);
    const E = mods.estado;
    Object.defineProperty(window, "CAREER", { configurable: true, get: () => E.carreiraAtual(), set: (v) => E.definirCarreira(v) });
    Object.defineProperty(window, "LEAGUE_TEAMS", { configurable: true, get: () => E.ligaAtual() });
    Object.defineProperty(window, "ALL_TEAMS_FLAT", { configurable: true, get: () => E.todosTimes() });
    Object.defineProperty(window, "CURRENT_COMPETITION_ID", { configurable: true, get: () => E.competicaoAtual() });
    window.persistCareer = () => mods.carga.persistCareer();
    window.teamById = (id) => E.timePorId(id);
    window.squadAvgOverallOf = (id) => E.forcaMediaDoElenco(id);
    window.sortedStandings = () => mods.tabela.sortRows(E.carreiraAtual().standings);
    window.motorMercado = () => mods.mercado;
    return Object.keys(mods).length;
  });
}

// Conta nova + carreira em `competicao` com o clube de id `clube` (padrão:
// o 1º da lista), criada pelo motor da v2 (escolherCompeticao/criarCarreira,
// os mesmos comandos da tela de criação). A primeira entrada sai pelos
// mesmos comandos das telas dela, sem passar por elas (as telas têm testes
// próprios, e novaCarreiraV2 passa por elas): tutorial visto (o POST da
// tela), assistente visto (assistenteVisto) e recompensa do dia recebida
// (receberRecompensa). Sem `preTemporada: true`, pula a pré-temporada até a
// semana da rodada 1 (como skipPreseason fazia na tela antiga) e grava.
// Termina no Início. Devolve o save do servidor.
async function carreiraV2(page, email, { competicao = "brasileirao", clube = null, preTemporada = false, criarConta = contaNova } = {}) {
  await criarConta(page, email);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  const r = await noMotor(page, async (M, { competicao, clube, preTemporada }) => {
    const P = M.ponte;
    const c = await P.escolherCompeticao(competicao);
    if (!c.ok) return c;
    const id = clube == null ? c.clubes[0].id : String(clube);
    const criada = await P.criarCarreira(id);
    if (!criada.ok) return criada;
    const tutorial = await fetch("/api/account/onboarding-seen", { method: "POST" });
    if (!tutorial.ok) return { ok: false, motivo: "tutorial " + tutorial.status };
    const assistente = await P.assistenteVisto();
    if (!assistente || assistente.ok === false) return { ok: false, motivo: "assistente", assistente };
    const recompensa = await P.receberRecompensa();
    if (!recompensa.ok && recompensa.motivo !== "ja-recebida") return { ok: false, motivo: "recompensa", recompensa };
    if (!preTemporada && M.semana.calendarOn()) {
      let guard = 0;
      while (!M.semana.calendarWeek().r && M.CAREER.currentRound <= 38 && guard++ < 60) M.semana.runCalendarOffWeek();
      if (!(await M.persistir())) return { ok: false, motivo: "gravar" };
    }
    return { ok: true };
  }, { competicao, clube, preTemporada }, { comCarreira: false });
  if (!r || !r.ok) throw new Error("carreiraV2: " + JSON.stringify(r));
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".home", { timeout: 30000 });
  return saveNoServidor(page);
}

// Pré-temporada: roda as semanas sem jogo até a semana da 1ª rodada e grava
// (o mesmo laço de _calendar_skip.skipPreseason, no motor).
async function pularPreTemporada(page) {
  const ok = await noMotor(page, async (M) => {
    const { semana } = M;
    if (!semana.calendarOn()) return true;
    let guard = 0;
    while (!semana.calendarWeek().r && M.CAREER.currentRound <= 38 && guard++ < 60) semana.runCalendarOffWeek();
    return M.persistir();
  });
  if (!ok) throw new Error("pularPreTemporada: não gravou");
}

// Uma rodada inteira pela ponte do motor na página da v2: semana até o jogo,
// partida (pulando para o fim), pós-jogo (coletiva: 1ª resposta; proposta:
// recusar; perna da Copa ao vivo) — os mesmos passos de _sem_tela.jogarRodada.
async function jogarRodadaV2(page) {
  return noMotor(page, async (M) => {
    const P = M.ponte;
    const ate = async (cond, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = cond(); if (v) return v; await new Promise((r) => setTimeout(r, 50)); } return null; };
    const passos = [];
    const s = await P.avancarSemana(true);
    passos.push(`semana:${s && s.ok ? "ok" : s && s.motivo}`);
    // Escalação com pendência (lesão, suspensão, venda): o jogo não começa
    // (12/11); o técnico toca em "Completar automaticamente" do Pré-jogo.
    let i = P.iniciar();
    if (i && i.motivo === "escalacao") { const c = await P.completarEscalacao(); passos.push(`completou:${c.ok && c.valida}`); i = P.iniciar(); }
    passos.push(`iniciar:${i && i.ok ? (i.aoVivo ? "ao-vivo" : "direto") : i && i.motivo}`);
    if (!i || !i.ok) return { ok: false, passos };
    P.pularParaFim();
    const est = await ate(() => { const e = P.estado(); return e.fase === "encerrada" && e.gravada != null ? e : null; });
    passos.push(`fim:${est ? (est.gravada ? "gravada" : est.erroGravacao) : "timeout"}`);
    if (!est || !est.gravada) return { ok: false, passos };
    let etapa = P.iniciarPosJogo();
    passos.push(`pos:${etapa.ok ? etapa.etapa : etapa.motivo}`);
    for (let n = 0; etapa && etapa.ok !== false && etapa.etapa !== "fim" && n < 12; n++) {
      if (etapa.etapa === "coletiva") etapa = await P.responderColetiva(etapa.respostas[0].letra);
      else if (etapa.etapa === "noticias" || etapa.etapa === "resultados") etapa = P.concluirEtapa(etapa.etapa);
      else if (etapa.etapa === "proposta") etapa = await P.responderProposta("recusar");
      else if (etapa.etapa === "copa") {
        let c = P.iniciarPernaCopa();
        if (c.motivo === "escalacao") { await P.completarEscalacao(); c = P.iniciarPernaCopa(); }
        if (c.ok && c.aoVivo) { P.pularParaFim(); await ate(() => { const e = P.estado(); return e.fase === "encerrada" && e.gravada != null; }); }
        etapa = P.posJogo();
      } else break;
      passos.push(`pos:${etapa && etapa.ok === false ? etapa.motivo : etapa.etapa}`);
    }
    P.encerrarPosJogo();
    return { ok: !!etapa && etapa.etapa === "fim", passos };
  });
}

// ---------------------------------------------------------------------------
// Ganchos dos testes da v2 (antes em _v2_match.js, que montava a carreira
// pela tela antiga). Plano "testes sem a tela antiga", lote L1.

// Conta nova (nome "Murilo Almeida", como os testes antigos) já logada.
async function signup(page, email) {
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Murilo Almeida", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });
}

// Conta nova + carreira no Brasileirão com `club`, já na rodada 1 e com a
// recompensa do dia recebida — o mesmo ponto em que o newCareer da tela
// antiga deixava, agora pelo motor da v2 (carreiraV2).
async function newCareer(page, email, club = "fla") {
  await carreiraV2(page, email, { clube: club, criarConta: signup });
  await ensureDailyClaimed(page);
}

const serverCareer = saveNoServidor;

// "Iniciar partida" no Pré-jogo. Com pendência na escalação (lesão,
// suspensão, venda) a partida não começa (decisão de 12/11): o botão é
// "Completar automaticamente"; toca nele e depois em "Iniciar partida",
// como o técnico faria.
async function iniciarPeloPreJogo(v2) {
  await v2.waitForSelector(".pm-cta", { timeout: 15000 });
  if (await v2.locator("button.pm-cta").count()) {
    await v2.click("button.pm-cta");
    await v2.waitForSelector("a.pm-cta", { timeout: 20000 });
  }
  await v2.click("a.pm-cta");
}

// Início → Preparar partida → Iniciar partida → "Pular para o fim".
async function playV2MatchToEnd(v2) {
  await v2.goto(base + "/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  await v2.click(".home-main .cta");
  await iniciarPeloPreJogo(v2);
  await v2.waitForSelector(".mt-skip", { timeout: 40000 });
  await v2.click(".mt-skip");
  await v2.waitForSelector(".rs-title", { timeout: 30000 });
}

// Desde a etapa G2c a v2 roda o motor como módulo na própria página, sem o
// quadro escondido. motorNaPagina(v2) deixa em window.__motor os módulos do
// motor (as mesmas instâncias que a v2 usa: o navegador guarda um módulo por
// URL) e uma ponte montada deles; depois, v2.evaluate(() => __motor...).
async function motorNaPagina(v2) {
  await v2.evaluate(async () => {
    if (window.__motor) return;
    const nomes = ["estado", "aovivo", "posjogo", "carga", "semana", "v2"];
    const m = await Promise.all(nomes.map((n) => import(`/js/motor/${n}.js`)));
    const mods = Object.fromEntries(nomes.map((n, i) => [n, m[i]]));
    window.__motor = { ...mods, ponte: mods.v2.criarPonte() };
  });
}

// "Continuar" e o pós-jogo da v2 (fase 4) até voltar ao Início. Devolve as
// etapas atravessadas, na ordem: "coletiva", "noticias", "resultados",
// "copa" (perna ao vivo na Partida da v2) e "proposta".
// opts.press: "responder" (1ª resposta, padrão) ou "pular"; opts.offer:
// "recusar" (padrão), "aceitar" ou "depois".
async function continueToHome(v2, opts = {}) {
  await v2.click('.pz-foot .cta[data-save="saved"]');
  const steps = [];
  for (let k = 0; k < 120; k++) {
    if (await v2.locator(".home").count()) break;
    const st = await v2.evaluate(() => {
      const h1 = (document.querySelector("h1") || {}).textContent || "";
      const ready = document.querySelector('.pz-foot .cta[data-save="saved"]:not([aria-disabled])');
      if (document.querySelector(".mt-skip")) return "live";
      // Perna da Copa no intervalo (a v2 abre a Pausa sozinha): volta à partida para pular.
      if (document.querySelector('[aria-label="Voltar à partida"]')) return "pausa";
      // Perna da Copa bloqueada por pendência na escalação (12/11): o técnico completa.
      if (document.querySelector(".state .pm-blocked")) return "bloqueada";
      if (ready) return "copa-fim";
      if (document.querySelector(".pj-answer")) return document.querySelector(".pj-effect") ? "coletiva-ok" : "coletiva";
      if (h1 === "Nos bastidores." && document.querySelector(".pj")) return "noticias";
      if (h1 === "A disputa continua.") return "resultados";
      if (h1 === "Uma oferta chegou.") return "proposta";
      return null;
    }).catch(() => null);
    if (st === "pausa") await v2.click('[aria-label="Voltar à partida"]').catch(() => {});
    else if (st === "bloqueada") { if (!steps.includes("completou")) steps.push("completou"); await v2.click(".state .state-btn").catch(() => {}); }
    else if (st === "live") { if (!steps.includes("copa")) steps.push("copa"); await v2.click(".mt-skip").catch(() => {}); }
    else if (st === "copa-fim") await v2.click(".pz-foot .cta").catch(() => {});
    else if (st === "coletiva") {
      steps.push("coletiva");
      if (opts.press === "pular") await v2.click(".pj .cal-foot .link-back").catch(() => {});
      else await v2.click(".pj-answer").catch(() => {});
    } else if (st === "coletiva-ok") await v2.click(".pj .cal-foot .cta").catch(() => {});
    else if (st === "noticias" || st === "resultados") {
      if (steps[steps.length - 1] !== st) steps.push(st);
      await v2.click(".pj .cal-foot .cta").catch(() => {});
    } else if (st === "proposta") {
      steps.push("proposta");
      const which = opts.offer === "aceitar" ? ".pj .cal-foot .cta" : opts.offer === "depois" ? ".pj .cal-foot .text-btn" : ".pj .cal-foot .link-back";
      await v2.click(which).catch(() => {});
    }
    await v2.waitForTimeout(400);
  }
  await v2.waitForSelector(".home", { timeout: 30000 }).catch(async (e) => {
    const onde = await v2.evaluate(() => `${location.pathname}${location.search} | ${(document.querySelector("h1") || {}).textContent || ""}`).catch(() => "?");
    throw new Error(`continueToHome: não chegou ao Início (parou em ${onde}; passos: ${steps.join(",")}) — ${e.message.split("\n")[0]}`);
  });
  return steps;
}

// Save do servidor × save em memória da ponte, sem o carimbo updatedAt.
function sameSave(a, b) {
  const strip = (c) => JSON.stringify({ ...c, updatedAt: 0 });
  return strip(a) === strip(b);
}

// Fase 2: a v2 abre a recompensa diária sozinha se ela não foi recebida
// hoje. enterGame() da versão anterior só a recebe se o modal abrir em 3 s;
// para os testes que não são da recompensa, garante pelo servidor (409 =
// já recebida). Testes da recompensa usam conta nova e não chamam isto.
async function ensureDailyClaimed(page) {
  await page.evaluate(async () => {
    const d = new Date();
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    await fetch("/api/daily-login/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ localDate }) }).catch(() => {});
  });
}

// Desde o item 1 (05/11) a v2 abre sozinha, ao entrar, o tutorial (1ª
// carreira da conta), o assistente de início (carreira nova) e a
// recompensa. Pula o que estiver aberto até chegar ao Início.
async function skipAutoOpen(page, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await page.locator(".home").count()) return true;
    const u = page.url();
    if (/\/boas-vindas$/.test(u) && await page.locator(".ob-skip").count()) await page.click(".ob-skip").catch(() => {});
    else if (/assistente=\d/.test(u) && await page.locator(".wz-skip").count()) await page.click(".wz-skip").catch(() => {});
    else if (/\/recompensa$/.test(u) && await page.locator(".rw-foot .link-back").count()) await page.click(".rw-foot .link-back").catch(() => {});
    await page.waitForTimeout(300);
  }
  return false;
}

module.exports = { globaisDoMotor, iniciarPeloPreJogo, base, contaNova, saveNoServidor, novaCarreiraV2, ateOInicio, motorPronto, noMotor, carreiraV2, pularPreTemporada, jogarRodadaV2,
  signup, newCareer, serverCareer, playV2MatchToEnd, motorNaPagina, continueToHome, sameSave, ensureDailyClaimed, skipAutoOpen };
