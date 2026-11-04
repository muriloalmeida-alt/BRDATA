// Carreira 2.0 — Entrega 02 (Escalação + Quem entra?, /carreira/escalacao).
// Pela UI real: dados do save, troca titular↔reserva gravada pelo mesmo
// PUT da versão atual e lida por ela, cancelar sem gravar, formação,
// conflito (escalação mudou em outra aba → nada gravado), indisponível
// marcado e fora da lista, resto do save intacto, 360 px e acessibilidade.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { ensureDailyClaimed } = require("./_v2_match");
const { passCareerSetup, enterGame } = require("./_startup");
const { skipPreseason } = require("./_calendar_skip");

const strip = (c) => { const x = JSON.parse(JSON.stringify(c)); delete x.lineup; delete x.updatedAt; delete x.activeSchemeId; return x; };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";

  const email = `v2esc${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Murilo Almeida", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });
  await page.goto(base + "/carreira-old", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForSelector(".m3-club-row", { timeout: 20000 });
  await page.click('.m3-club-row[data-id="fla"]');
  await page.click("#btnConfirmClub");
  await passCareerSetup(page);
  await enterGame(page);
  await ensureDailyClaimed(page);
  await skipPreseason(page);
  await page.evaluate(() => { CAREER.lineup.formation = "4-3-3"; CAREER.activeSchemeId = "scheme_teste"; return persistCareer(); });
  const api = {
    get: () => page.evaluate(async () => (await (await fetch("/api/career", { cache: "no-store" })).json()).career),
    put: (c) => page.evaluate(async (c) => (await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) })).status, c),
  };
  const before = await api.get();

  // 1) Início → Ajustar escalação (navegação interna) → campo real.
  const v2 = await ctx.newPage();
  const writes = [];
  v2.on("request", (r) => { if (r.url().includes("/api/career") && r.method() !== "GET") writes.push(r.method()); });
  await v2.goto(base + "/carreira/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  await v2.click('a.row[href="/carreira/escalacao"]');
  await v2.waitForSelector(".lu-pitch", { timeout: 10000 });
  const view = await v2.evaluate(() => ({
    path: location.pathname,
    title: document.querySelector(".screen-title").textContent,
    formation: document.querySelector("#lu-form-val").textContent,
    slots: [...document.querySelectorAll(".lu-slot")].map((a) => ({ ovr: a.querySelector("text").textContent, name: a.querySelector(".lu-name").textContent, href: a.getAttribute("href") })),
    bench: document.querySelectorAll(".lu-res").length,
    club: document.querySelector(".sub-head-ctx").textContent,
    cta: document.querySelector(".lu-foot .cta").getAttribute("href"),
    legacy: document.querySelector(".lu-legacy").getAttribute("href"),
    tab: document.querySelector('.tab[aria-current="page"]').textContent,
  }));
  const gk = before.squad.find((p) => p.id === before.lineup.starters[0]);
  const gkSlot = view.slots.find((s) => s.href.endsWith("vaga=0"));
  check("1) Início → Escalação na v2 com formação, titulares (overall/nome) e banco do save:",
    view.path === "/carreira/escalacao" && view.title === "Escale seu time." && view.formation === "4-3-3" && view.slots.length === 11
      && gkSlot && gkSlot.ovr === String(gk.overall) && view.bench === before.lineup.bench.length && view.club === "FLAMENGO"
      && view.cta === "/carreira/pre-jogo" && view.legacy === "/carreira/tatica" && view.tab === "Elenco", JSON.stringify(view));

  // 2) Quem entra? + Cancelar: volta sem gravar.
  const idx = 6; // meia (4-3-3: VOL, MEI, MEI = 5..7)
  await v2.click(`.lu-slot[href$="vaga=${idx}"]`);
  await v2.waitForSelector(".qs-opt", { timeout: 10000 });
  const outId = before.lineup.starters[idx];
  const outP = before.squad.find((p) => p.id === outId);
  const qs = await v2.evaluate(() => ({
    title: document.querySelector(".screen-title").textContent,
    sub: document.querySelector(".screen-sub").textContent,
    firstPos: document.querySelector(".qs-opt .qs-pos").textContent,
    ctaDisabled: document.querySelector(".qs-foot .cta").disabled,
    n: document.querySelectorAll(".qs-opt").length,
  }));
  await v2.click(".qs-foot .text-btn");
  await v2.waitForSelector(".lu-pitch", { timeout: 10000 });
  check("2) Quem entra?: quem sai, mesma posição primeiro, CTA só após escolher; Cancelar volta sem gravar:",
    qs.title === "Quem entra?" && qs.sub.includes(outP.name.split(" ").pop()) && qs.firstPos.startsWith("Meio-campo") && qs.ctaDisabled && qs.n > 10 && writes.length === 0, JSON.stringify({ qs, writes }));

  // 3) Troca com um reserva do meio-campo: grava, versão atual lê.
  await v2.click(`.lu-slot[href$="vaga=${idx}"]`);
  await v2.waitForSelector(".qs-opt", { timeout: 10000 });
  const benchMid = v2.locator(".qs-opt", { hasText: "Meio-campo · No banco" }).first();
  const inName = await benchMid.locator(".qs-name").textContent();
  await benchMid.click();
  const summary = await v2.locator(".qs-summary").textContent();
  await v2.click(".qs-foot .cta");
  await v2.waitForSelector(".lu-pitch", { timeout: 10000 });
  const after = await api.get();
  const inId = after.lineup.starters[idx];
  const inP = after.squad.find((p) => p.id === inId);
  const slotName = await v2.locator(`.lu-slot[href$="vaga=${idx}"] .lu-name`).textContent();
  check("3) Confirmar troca grava: reserva entra na vaga, quem saiu vai para o banco, esquema salvo desvinculado:",
    writes.length === 1 && inId !== outId && before.lineup.bench.includes(inId) && after.lineup.bench.includes(outId) && after.lineup.bench.length === before.lineup.bench.length
      && slotName === inName && summary.includes(inName) && after.activeSchemeId === null, JSON.stringify({ writes, summary, slotName, inName }));
  check("4) Resto do save intacto (só lineup/updatedAt/activeSchemeId mudam):",
    JSON.stringify(strip(after)) === JSON.stringify(strip(before)) && JSON.stringify(after.lineup.tactics) === JSON.stringify(before.lineup.tactics), "");
  await page.goto(base + "/carreira-old", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof CAREER !== "undefined" && CAREER && CAREER.lineup, null, { timeout: 20000 });
  const legacySees = await page.evaluate((idx) => CAREER.lineup.starters[idx], idx);
  check("5) A versão atual lê a troca feita na v2:", legacySees === inId && inP, legacySees);

  // 6) Formação pelo seletor: grava e mantém titulares nas vagas.
  await v2.click(".lu-form-btn");
  await v2.waitForSelector(".sheet", { timeout: 5000 });
  await v2.click('.sheet-opt:has-text("4-4-2")');
  await v2.waitForSelector(".sheet", { state: "detached", timeout: 10000 });
  const f = await api.get();
  check("6) Formação 4-4-2 gravada pelo seletor, titulares nas mesmas vagas:",
    f.lineup.formation === "4-4-2" && JSON.stringify(f.lineup.starters) === JSON.stringify(after.lineup.starters) && (await v2.locator("#lu-form-val").textContent()) === "4-4-2", f.lineup.formation);

  // 7) Conflito: outra aba muda a vaga depois que "Quem entra?" abriu → nada gravado.
  await v2.click(`.lu-slot[href$="vaga=${idx}"]`);
  await v2.waitForSelector(".qs-opt", { timeout: 10000 });
  const other = JSON.parse(JSON.stringify(f));
  const swapWith = other.lineup.bench[0];
  other.lineup.bench[0] = other.lineup.starters[idx];
  other.lineup.starters[idx] = swapWith;
  await api.put(other);
  await v2.locator(".qs-opt").nth(1).click();
  await v2.click(".qs-foot .cta");
  await v2.waitForSelector(".qs-foot .inline-error", { timeout: 10000 });
  const conflictMsg = await v2.locator(".qs-foot .inline-error").textContent();
  const afterConflict = await api.get();
  check("7) Escalação mudou em outra aba: mostra aviso e não sobrescreve:",
    /mudou/.test(conflictMsg) && JSON.stringify(afterConflict.lineup) === JSON.stringify(other.lineup), conflictMsg);
  await v2.click(".qs-foot .text-btn");
  await v2.waitForSelector(".lu-pitch", { timeout: 10000 });

  // 8) Indisponível: marcado no campo e fora da lista do Quem entra?.
  const inj = JSON.parse(JSON.stringify(afterConflict));
  const hurtId = inj.lineup.starters[1];
  const hurt = inj.squad.find((p) => p.id === hurtId);
  hurt.status = "contundido"; hurt.outUntilRound = inj.currentRound + 3;
  await api.put(inj);
  await v2.reload({ waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".lu-pitch", { timeout: 15000 });
  const badge = await v2.locator('.lu-slot[href$="vaga=1"] .lu-out').count();
  const label = await v2.locator('.lu-slot[href$="vaga=1"]').getAttribute("aria-label");
  await v2.click('.lu-slot[href$="vaga=2"]');
  await v2.waitForSelector(".qs-opt", { timeout: 10000 });
  const listed = await v2.evaluate((n) => [...document.querySelectorAll(".qs-opt")].some((b) => b.getAttribute("aria-label").startsWith(n + ",")), hurt.name);
  check("8) Lesionado marcado na camisa (e no rótulo acessível) e fora da lista de substitutos:", badge === 1 && /lesionado/.test(label) && !listed, JSON.stringify({ badge, label, listed }));

  // 9) Voltar do sistema: Quem entra? → Escalação → Início.
  await v2.goBack(); await v2.waitForSelector(".lu-pitch", { timeout: 10000 });
  await v2.click(".back-btn"); await v2.waitForSelector(".home", { timeout: 10000 });
  check("9) Voltar leva de Quem entra? à Escalação e da Escalação ao Início:", new URL(v2.url()).pathname === "/carreira/", v2.url());

  // 10) 360 px: sem rolagem horizontal, alvos ≥ 44 px nas duas telas e no seletor.
  await v2.setViewportSize({ width: 360, height: 780 });
  const audit = () => v2.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className + ":" + el.textContent.slice(0, 20)),
  }));
  await v2.goto(base + "/carreira/escalacao", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".lu-pitch", { timeout: 15000 });
  const a1 = await audit();
  await v2.click(".lu-form-btn"); await v2.waitForSelector(".sheet");
  const a2 = await audit();
  const dlg = await v2.evaluate(() => ({ modal: document.querySelector(".sheet").getAttribute("aria-modal"), focus: document.activeElement.getAttribute("aria-checked") }));
  await v2.keyboard.press("Escape"); await v2.waitForSelector(".sheet", { state: "detached" });
  await v2.click('.lu-slot[href$="vaga=5"]'); await v2.waitForSelector(".qs-opt");
  const a3 = await audit();
  check("10) 360 px sem rolagem horizontal, alvos ≥ 44 px, seletor modal com foco na opção atual e Esc fecha:",
    [a1, a2, a3].every((a) => a.overflow <= 0 && a.small.length === 0) && dlg.modal === "true" && dlg.focus === "true", JSON.stringify({ a1, a2, a3, dlg }));

  await browser.close();
})();
