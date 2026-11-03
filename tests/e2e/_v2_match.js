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
  await v2.goto(base + "/carreira/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  await v2.click(".home-main .cta");
  await v2.waitForSelector(".pm-cta", { timeout: 10000 });
  await v2.click(".pm-cta");
  await v2.waitForSelector(".mt-skip", { timeout: 40000 });
  await v2.click(".mt-skip");
  await v2.waitForSelector(".rs-title", { timeout: 30000 });
}

const ponteFrame = (v2) => v2.frames().find((f) => f.url().includes("/carreira/motor"));

// "Continuar" e a sequência da versão anterior até voltar ao Início.
// Devolve os passos clicados (ids) — inclui btnLiveSkip quando houve perna
// de Copa ao vivo.
async function continueToHome(v2) {
  await v2.click('.pz-foot .cta[data-save="saved"]');
  await v2.waitForTimeout(800);
  const frame = ponteFrame(v2);
  const clicked = [];
  for (let k = 0; k < 60; k++) {
    if (await v2.locator(".home").count()) break;
    const id = frame ? await frame.evaluate(() => {
      const vis = (id) => { const el = document.getElementById(id); return el && el.offsetParent !== null; };
      const press = document.querySelector("#pressOverlay.open [data-press]"); if (press) { press.click(); return "press"; }
      for (const id of ["btnMatchDetailContinue", "btnNewsContinue", "btnRoundResultsContinue", "btnPlayerOfferDecline", "tabelaModalClose", "btnLiveSkip"]) if (vis(id)) { document.getElementById(id).click(); return id; }
      return null;
    }).catch(() => null) : null;
    if (id) clicked.push(id);
    await v2.waitForTimeout(400);
  }
  await v2.waitForSelector(".home", { timeout: 30000 });
  return clicked;
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
