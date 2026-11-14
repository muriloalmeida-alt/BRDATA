// GE-BALANCE-004 (issue #39) — virada de temporada real (advanceSeason)
// numa carreira multi-divisão: promovidos chegam abaixo da média da
// divisão nova, rebaixados acima, e a força nova persiste no save.
// Lote L4c (sem a tela antiga): carreira pela v2, a temporada jogada rodada
// a rodada pela ponte do motor (jogarRodadaV2) e a virada pelo motor na
// página da v2 (globaisDoMotor).
const { chromium } = require("playwright-core");
const { newCareer, globaisDoMotor, jogarRodadaV2, noMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await newCareer(page, `geb004${Date.now()}@teste.com`);
  // A temporada inteira, rodada a rodada, pela ponte e sem rede (modo
  // offline real desde a OFFLINE-001: grava só no aparelho, sem a cópia de
  // ~600 KB ao servidor a cada gravação; o item 4 volta a rede e confere a
  // cópia no servidor).
  await page.context().setOffline(true);
  for (let guard = 0; guard < 60 && (await noMotor(page, ({ CAREER }) => CAREER.currentRound)) <= 38; guard++) {
    const r = await jogarRodadaV2(page);
    if (!r.ok) throw new Error("rodada: " + r.passos.join(" "));
  }
  await globaisDoMotor(page);
  let ok = true;
  const check = (label, cond, extra) => { console.log(label, !!cond, extra !== undefined ? JSON.stringify(extra) : ""); ok = ok && !!cond; };

  const res = await page.evaluate(async () => {
    const top4B = sortedDivisionRows("serie_b").slice(0, 4).map((r) => String(r.id));
    const scaleBBefore = divisionStrengthScale(CAREER.divisionTeams.serie_b);
    CAREER.negativeSeasonsStreak = -99;
    const r = await advanceSeason();
    const pr = r.promotionRelegation;
    const ids = (list) => list.map((t) => String(t.id));
    const A = CAREER.divisionTeams.brasileirao, B = CAREER.divisionTeams.serie_b;
    const stayA = A.filter((t) => !ids(pr.promotedB).includes(String(t.id)));
    const stayB = B.filter((t) => !ids(pr.relegatedA).includes(String(t.id)) && !ids(pr.promotedC).includes(String(t.id)));
    const sA = divisionStrengthScale(stayA), sB = divisionStrengthScale(stayB);
    const promoted = A.filter((t) => ids(pr.promotedB).includes(String(t.id)));
    const relegated = B.filter((t) => ids(pr.relegatedA).includes(String(t.id)));
    const zOf = (t, s) => ((t.atk - s.meanAtk) / s.sdAtk - (t.def - s.meanDef) / s.sdDef) / 2; // + = mais forte
    return {
      top4Match: ids(pr.promotedB).every((id) => top4B.includes(id)),
      promotedZ: promoted.map((t) => +zOf(t, sA).toFixed(2)),
      relegatedZ: relegated.map((t) => +zOf(t, sB).toFixed(2)),
      savedAtk: promoted.map((t) => t.atk),
      saved: promoted.map((t) => ({ id: String(t.id), atk: t.atk, def: t.def })),
    };
  });
  check("1) Promovidos à A são os 4 primeiros da B:", res.top4Match, res);
  // média do grupo (um clube dominante pode, legitimamente, chegar perto da média)
  const avgZ = (arr) => arr.reduce((a, v) => a + v, 0) / arr.length;
  check("2) Promovidos chegam, em média, ABAIXO da média da Série A (força combinada em desvios < 0):", res.promotedZ.length === 4 && avgZ(res.promotedZ) < 0, res.promotedZ);
  check("3) Rebaixados chegam, em média, ACIMA da média da Série B (força combinada em desvios > 0):", res.relegatedZ.length === 4 && avgZ(res.relegatedZ) > 0, res.relegatedZ);

  // 4) Persistência: recarrega e confere que a força nova veio do save.
  await page.context().setOffline(false);
  await page.evaluate(() => persistCareer());
  // Espera o save do SERVIDOR conter a força nova (estado), em vez de 2,5 s
  // fixos: sob carga no CI o PUT ainda não tinha chegado e o reload lia o
  // save antigo (0 de 4).
  await page.waitForFunction(async (saved) => {
    const c = (await (await fetch("/api/career", { cache: "no-store" })).json()).career;
    const A = (c && c.divisionTeams && c.divisionTeams.brasileirao) || [];
    return saved.every((s) => A.some((t) => String(t.id) === s.id && t.atk === s.atk && t.def === s.def));
  }, res.saved, { timeout: 20000, polling: 500 }).catch(() => {});
  await page.reload({ waitUntil: "domcontentloaded" });
  // A carreira recarregada do save, pelo motor da página da v2.
  await globaisDoMotor(page);
  // Compara por clube (id + atk + def): comparar só o valor de atk dava 5
  // quando outro clube da Série A tinha, por acaso, o mesmo atk (CI, run 19).
  const reloaded = await page.evaluate((saved) => {
    const A = CAREER.divisionTeams.brasileirao;
    return saved.filter((s) => A.some((t) => String(t.id) === s.id && t.atk === s.atk && t.def === s.def)).length;
  }, res.saved);
  check("4) Força reposicionada persiste no save (recarregado):", reloaded === 4, reloaded);

  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.log("FATAL:", e.message); process.exit(1); });
