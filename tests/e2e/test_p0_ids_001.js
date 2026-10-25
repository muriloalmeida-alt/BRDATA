// P0-IDS-001 — ids de jogador únicos no save inteiro. Achado em
// GE-BALANCE-005/UX-MERCADO-001: catálogos de divisões diferentes
// repetiam `real_<id>` entre clubes, e a reposição anual reusava
// `base_<clube>_<n>`. Cobre: carreira nova sem repetição, save antigo
// com repetição corrigido ao carregar (proposta pendente acompanha o
// jogador certo) e reposição de base na virada sem repetir id.
const { chromium } = require("playwright-core");
const { skipOnboarding } = require("./_startup");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";
  const email = `p0ids${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "P0 Ids", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });
  await page.goto(base + "/carreira.html", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForTimeout(300);
  await page.click(".m3-club-row");
  await page.waitForTimeout(150);
  await page.click("#btnConfirmClub");
  await skipOnboarding(page);
  for (let i = 0; i < 6; i++) { await page.click("#btnWizardSkip", { timeout: 2500 }).catch(() => {}); await page.waitForTimeout(300); }
  await page.click("#btnClaimDailyLogin", { timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(500);
  let ok = true;
  const check = (label, cond, extra) => { console.log(label, !!cond, extra !== undefined ? JSON.stringify(extra) : ""); ok = ok && !!cond; };
  const dupCount = () => page.evaluate(() => {
    const ids = [...CAREER.squad, ...Object.values(CAREER.leagueSquads).flat()].map((p) => p.id);
    return ids.length - new Set(ids).size;
  });

  check("1) Carreira nova nasce sem id de jogador repetido:", (await dupCount()) === 0, await dupCount());

  // 2) Save "antigo": força um id repetido entre 2 clubes + proposta
  // pendente pelo jogador repetido no 2º clube, grava e recarrega.
  const setup = await page.evaluate(async () => {
    const [clubA, clubB] = Object.keys(CAREER.leagueSquads).sort();
    const a = CAREER.leagueSquads[clubA][0], b = CAREER.leagueSquads[clubB][0];
    b.id = a.id;
    CAREER.pendingOffersOut = [{ id: "offerout_test", playerId: b.id, playerName: b.name, clubId: clubB, clubName: "B", marketValue: b.value, offerValue: b.value, installments: 1, roundsLeft: 3, status: "pending", counterValue: null, submittedRound: 1 }];
    const r = await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(CAREER) });
    return { clubA, clubB, dupId: a.id, bName: b.name, put: r.status };
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const afterLoad = await page.evaluate(({ clubB, bName }) => {
    const o = (CAREER.pendingOffersOut || []).find((x) => x.id === "offerout_test");
    const target = o && leagueSquadFor(clubB).find((p) => p.id === o.playerId);
    return { offerPlayerId: o && o.playerId, targetName: target && target.name, bName };
  }, setup);
  check("2) Save com id repetido é corrigido ao carregar:", (await dupCount()) === 0 && setup.put < 300, { dups: await dupCount(), put: setup.put });
  check("2b) Proposta pendente continua apontando pro jogador certo do 2º clube:", afterLoad.offerPlayerId !== setup.dupId && afterLoad.targetName === afterLoad.bName, afterLoad);

  // 3) Reposição da base (mesma função da virada de temporada) não
  // deixa id repetido no seu elenco.
  const renewal = await page.evaluate(() => {
    CAREER.squad.filter((p) => p.origin === "base").slice(0, 3).forEach((p) => { p.origin = "principal"; });
    CAREER.seasonYear += 1;
    renewHumanSquad();
    const before = CAREER.squad.length - new Set(CAREER.squad.map((p) => p.id)).size;
    ensureUniquePlayerIds();
    const after = CAREER.squad.length - new Set(CAREER.squad.map((p) => p.id)).size;
    return { before, after };
  });
  check("3) Reposição de base na virada: repetição gerada é corrigida pela passada de ids únicos:", renewal.after === 0, renewal);

  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.log("FATAL:", e.message); process.exit(1); });
