// Modo Carreira multi-divisão (lote L4a, sem a tela antiga), pelas telas da
// v2: escolha de campeonato, Escolha do Clube restrita à divisão escolhida,
// competitionId gravado, reabertura na divisão certa e "Reiniciar".
//  1) Sem carreira, a escolha de campeonato aparece com as 3 divisões.
//  2) Escolher Série B lista os clubes da Série B (com o Coritiba).
//  3) A carreira criada grava competitionId "serie_b".
//  4) Recarregar reabre direto no Início, na Série B.
//  5) "Reiniciar carreira" (Saves) volta para a escolha de campeonato.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { contaNova, ateOInicio, saveNoServidor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await contaNova(page, `multidiv${Date.now()}@teste.com`);

  // 1) Escolha de campeonato.
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('.ac-opt[role="radio"]', { timeout: 40000 });
  const comps = await page.evaluate(() => [...document.querySelectorAll(".ac-opt")].map((o) => o.textContent));
  check("1) Sem carreira, a escolha de campeonato aparece com as 3 divisões:", comps.length === 3 && ["Série A", "Série B", "Série C"].every((d, i) => comps[i].includes(d)), JSON.stringify(comps));

  // 2) Série B: clubes da Série B.
  await page.locator(".ac-opt").nth(1).click();
  await page.click(".ac-foot .cta");
  await page.waitForSelector(".ac-club", { timeout: 40000 });
  const clubes = await page.evaluate(() => [...document.querySelectorAll(".ac-club")].map((c) => c.textContent));
  check("2) Após escolher a Série B, a Escolha do Clube mostra os 20 clubes da Série B (com o Coritiba):", clubes.length === 20 && clubes.some((c) => c.includes("Coritiba")), JSON.stringify({ n: clubes.length }));

  // 3) Cria a carreira.
  await page.locator(".ac-club").first().click();
  await page.click(".ac-foot .cta");
  await page.waitForSelector(".ac-clubline", { timeout: 20000 });
  await page.click(".ac-form .cta");
  await page.waitForURL(/\/nova\/pronto$/, { timeout: 90000 });
  await ateOInicio(page);
  const career = await saveNoServidor(page);
  check("3) Carreira criada com competitionId 'serie_b':", career && career.competitionId === "serie_b", career && career.competitionId);

  // 4) Recarregar reabre direto no Início, na Série B.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".home", { timeout: 30000 });
  const sub = await page.evaluate(() => ({ comp: document.querySelector(".home-sub")?.textContent || "", path: location.pathname }));
  check("4) Recarregar reabre direto no Início, na Série B (sem passar pela escolha):", sub.path === "/" && /Série B/.test(sub.comp), JSON.stringify(sub));

  // 5) Reiniciar volta para a escolha de campeonato.
  await page.goto(base + "/saves", { waitUntil: "domcontentloaded" });
  await page.locator("button.pr-row", { hasText: "Reiniciar carreira" }).click();
  await page.fill('[role="alertdialog"] input, [role="dialog"] input', "REINICIAR");
  await page.click('.pr-danger-text');
  const voltou = await page.waitForSelector('.ac-opt[role="radio"]', { timeout: 40000 }).then(() => true, () => false);
  const apagada = await saveNoServidor(page);
  check("5) 'Reiniciar carreira' volta para a escolha de campeonato (carreira apagada):", voltou && !apagada, JSON.stringify({ voltou, apagada: !!apagada }));

  check("6) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
