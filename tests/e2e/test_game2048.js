// E2E do BRDATA 2048 (GAME-2048-001): swipe, teclado, vitória, derrota,
// 390px sem scroll horizontal, persistência após reload, offline.
const { chromium } = require("playwright-core");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    headless: true,
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") { errors.push(msg.text()); console.log("CONSOLE ERROR:", msg.text()); } });
  page.on("pageerror", (err) => { errors.push(err.message); console.log("PAGE ERROR:", err.message); });

  const base = "http://localhost:8787";
  const results = [];
  const check = (name, ok) => { results.push(ok); console.log(`${results.length}) ${name}: ${ok}`); };
  const tiles = () => page.evaluate(() => window.__game2048.state.cells.filter(Boolean).length);
  const grid = () => page.evaluate(() => {
    const s = window.__game2048.state; const g = [];
    for (let r = 0; r < s.size; r++) g.push(s.cells.slice(r * s.size, (r + 1) * s.size).map((c) => (c ? c.value : 0)));
    return g;
  });
  const settle = () => page.waitForTimeout(260);

  await page.goto(base + "/2048.html", { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });

  check("página abre com 2 peças", (await tiles()) === 2 && (await page.locator(".g-tile").count()) === 2);
  check("sem scroll horizontal em 390px", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  const box = await page.locator("#board").boundingBox();
  check("tabuleiro quadrado e com 16px de margem", Math.abs(box.width - box.height) < 1 && Math.abs(box.x - 16) <= 1 && Math.abs(box.width - 358) <= 1);
  check("16 casas no grid com aria-label", (await page.locator('#grid [role="gridcell"][aria-label]').count()) === 16);

  // Teclado: tabuleiro controlado → resultado conhecido
  await page.evaluate(() => window.__game2048.load([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 4]]));
  await page.keyboard.press("ArrowLeft");
  await settle();
  let g = await grid();
  check("seta ← funde 2+2 e soma 4 pontos", g[0][0] === 4 && (await page.textContent("#score")) === "4");
  check("jogada válida gera 1 peça nova", (await tiles()) === 3 && (await page.locator(".g-tile").count()) === 3);

  // Jogada inválida: nada nasce
  await page.evaluate(() => window.__game2048.load([[2, 4, 8, 16], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]));
  await page.keyboard.press("w");
  await settle();
  check("jogada inválida (W) não gera peça", (await tiles()) === 4);

  // Swipe por toque (pointer events)
  await page.evaluate(() => window.__game2048.load([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 8]]));
  const swipe = async (dx, dy) => {
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy); await page.mouse.down();
    await page.mouse.move(cx + dx, cy + dy, { steps: 5 }); await page.mouse.up();
    await settle();
  };
  await swipe(0, -120);
  g = await grid();
  check("swipe para cima move a peça até a borda", g[0][3] === 8);
  await swipe(-120, 0);
  g = await grid();
  check("swipe para a esquerda move a peça até a borda", g[0][0] === 8);
  const before = JSON.stringify(await grid());
  await swipe(10, 5);
  check("toque curto (< 24px) não conta como jogada", JSON.stringify(await grid()) === before);
  const scrollY = await page.evaluate(() => window.scrollY);
  check("página não rola durante o swipe", scrollY === 0);

  // Vitória
  await page.evaluate(() => window.__game2048.load([[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]));
  await page.keyboard.press("ArrowLeft");
  await settle();
  check("diálogo de vitória ao criar 2048", (await page.isVisible("#dialog")) && (await page.textContent("#dialogTitle")).includes("2048"));
  await page.click("#dialogActions button:first-child");
  check("Continuar jogando fecha o diálogo e mantém o 2048", !(await page.isVisible("#dialog")) && (await grid())[0][0] === 2048);
  await page.keyboard.press("ArrowRight");
  await settle();
  check("após continuar, não reabre o diálogo de vitória", !(await page.isVisible("#dialog")));

  // Derrota durante a partida: joga em ciclo a partir de um tabuleiro
  // quase cheio até acabar (determinístico para a seed fixa abaixo).
  await page.evaluate(() => window.__game2048.load([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 8, 0]], { seed: 7 }));
  const cycle = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
  for (let i = 0; i < 200 && !(await page.isVisible("#dialog")); i++) { await page.keyboard.press(cycle[i % 4]); await page.waitForTimeout(140); }
  await settle();
  check("derrota abre o diálogo de fim de jogo", (await page.evaluate(() => window.__game2048.state.over)) && (await page.textContent("#dialogTitle")) === "Fim de jogo");
  await page.click("#dialogActions button:first-child");
  await settle();
  check("Jogar de novo começa partida nova", (await tiles()) === 2 && (await page.textContent("#score")) === "0");

  // Tabuleiro já terminado ao abrir a página mostra o fim de jogo
  await page.evaluate(() => window.__game2048.load([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]));
  await page.reload({ waitUntil: "load" });
  check("save terminado reabre no diálogo de fim de jogo", (await page.isVisible("#dialog")) && (await page.textContent("#dialogTitle")) === "Fim de jogo");
  await page.click("#dialogActions button:first-child");
  await settle();

  // Persistência e recorde
  await page.evaluate(() => window.__game2048.load([[512, 512, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]));
  await page.keyboard.press("ArrowLeft");
  await settle();
  const gridBefore = JSON.stringify(await grid());
  const bestBefore = await page.textContent("#best");
  await page.reload({ waitUntil: "load" });
  await settle();
  check("partida em andamento sobrevive ao reload", JSON.stringify(await grid()) === gridBefore);
  check("recorde sobrevive ao reload", (await page.textContent("#best")) === bestBefore && bestBefore !== "0");

  // Novo jogo com partida em andamento pede confirmação
  await page.click("#btnNew");
  check("Novo jogo pede confirmação", (await page.textContent("#dialogTitle")).includes("novo jogo"));
  await page.click("#dialogActions button:last-child");
  check("Cancelar mantém a partida", JSON.stringify(await grid()) === gridBefore);

  // Save corrompido não quebra a página
  await page.evaluate(() => localStorage.setItem("brdata2048:v1", "{lixo"));
  await page.reload({ waitUntil: "load" });
  check("save corrompido → jogo novo sem erro", (await tiles()) === 2);

  // Offline (service worker)
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 8000 }).catch(() => {});
  const swOk = await page.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller));
  check("service worker controlando a página", swOk);
  if (swOk) {
    await ctx.setOffline(true);
    await page.reload({ waitUntil: "load" }).catch(() => {});
    check("abre offline", (await page.locator(".g-tile").count()) >= 2);
    await ctx.setOffline(false);
  }

  check("sem erros de console", errors.length === 0);

  await browser.close();
  const ok = results.every(Boolean);
  console.log(ok ? "\nTUDO OK" : "\nFALHOU");
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
