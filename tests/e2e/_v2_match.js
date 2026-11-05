// Carreira 2.0 — ganchos comuns dos testes da auditoria (AUD-02/03/04):
// criar conta+carreira pela versão anterior, abrir a partida pela v2 e
// atravessar o pós-jogo da ponte até o Início. Mesmos passos de
// test_v2_resultado.js, só reunidos.
const { passCareerSetup, enterGame } = require("./_startup");
const { skipPreseason } = require("./_calendar_skip");

const base = "http://localhost:8787";

async function signup(page, email) {
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Murilo Almeida", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });
}

// Conta nova + carreira no Brasileirão com `club`, já na rodada 1.
async function newCareer(page, email, club = "fla") {
  await signup(page, email);
  await page.goto(base + "/carreira-old", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForSelector(".m3-club-row", { timeout: 20000 });
  await page.click(`.m3-club-row[data-id="${club}"]`);
  await page.click("#btnConfirmClub");
  await passCareerSetup(page);
  await enterGame(page);
  await skipPreseason(page);
  await page.evaluate(() => persistCareer());
  await ensureDailyClaimed(page);
}

async function serverCareer(page) {
  return page.evaluate(async () => (await (await fetch("/api/career", { cache: "no-store" })).json()).career);
}

// Início → Preparar partida → Iniciar partida → "Pular para o fim".
async function playV2MatchToEnd(v2) {
  await v2.goto(base + "/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  await v2.click(".home-main .cta");
  await v2.waitForSelector(".pm-cta", { timeout: 10000 });
  await v2.click(".pm-cta");
  await v2.waitForSelector(".mt-skip", { timeout: 40000 });
  await v2.click(".mt-skip");
  await v2.waitForSelector(".rs-title", { timeout: 30000 });
}

const ponteFrame = (v2) => v2.frames().find((f) => f.url().includes("/carreira/motor"));

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
      if (ready) return "copa-fim";
      if (document.querySelector(".pj-answer")) return document.querySelector(".pj-effect") ? "coletiva-ok" : "coletiva";
      if (h1 === "Nos bastidores." && document.querySelector(".pj")) return "noticias";
      if (h1 === "A disputa continua.") return "resultados";
      if (h1 === "Uma oferta chegou.") return "proposta";
      return null;
    }).catch(() => null);
    if (st === "live") { if (!steps.includes("copa")) steps.push("copa"); await v2.click(".mt-skip").catch(() => {}); }
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
  await v2.waitForSelector(".home", { timeout: 30000 });
  return steps;
}

// Save do servidor × save em memória da ponte, sem o carimbo updatedAt.
function sameSave(a, b) {
  const strip = (c) => JSON.stringify({ ...c, updatedAt: 0 });
  return strip(a) === strip(b);
}

module.exports = { base, signup, newCareer, serverCareer, playV2MatchToEnd, ponteFrame, continueToHome, sameSave };

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
module.exports.ensureDailyClaimed = ensureDailyClaimed;

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
module.exports.skipAutoOpen = skipAutoOpen;
