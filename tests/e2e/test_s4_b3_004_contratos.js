// Tela "Contratos": acesso, um contrato por jogador (sem emprestados),
// ordem por vencimento, filtro Todos/Vencendo, nome levando à ficha,
// "Renovar" abrindo a renovação e o estado vazio do "Vencendo".
// Lote L3d (12/11/2026, plano "testes sem a tela antiga"): antes pela tela
// antiga (menu "Equipe & Treinos" → Contratos, ContractCard). Agora pela
// tela "Cuide da continuidade." da v2 (/contratos), aberta pelo Elenco.
// "Dispensar" (item 6 antigo) fica na ficha do jogador na v2 e é coberto
// pelo test_v2_elenco_avancado (item 6); a renovação em si, pelos itens 3 e 4
// dele.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, saveNoServidor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `contratos${Date.now()}@teste.com`);
  // Garante ao menos um contrato vencendo nesta temporada.
  const vencendoId = await noMotor(page, async ({ CAREER, persistir }) => {
    const p = CAREER.squad.find((x) => x.origin === "principal");
    p.contractUntil = CAREER.seasonYear;
    await persistir();
    return p.id;
  });
  const h1 = (t) => page.waitForFunction((t) => (document.querySelector("h1") || {}).textContent === t, t, { timeout: 20000 });
  const linhas = () => page.evaluate(() => [...document.querySelectorAll(".pr-plist > li")].map((li) => ({
    href: (li.querySelector("a") || {}).getAttribute ? li.querySelector("a").getAttribute("href") : null,
    texto: li.textContent,
    renovar: !!li.querySelector("button.pr-row"),
  })));

  // 1) Acesso pelo Elenco.
  await page.goto(base + "/elenco", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".sq-legacy", { timeout: 20000 });
  await page.click(".sq-legacy");
  await h1("Cuide da continuidade.");
  check("1) O Elenco leva à tela de Contratos:", new URL(page.url()).pathname === "/contratos", page.url());

  // 2) Um contrato por jogador não emprestado, ordenado por vencimento.
  const save = await saveNoServidor(page);
  const esperado = save.squad.filter((p) => p.origin !== "loan");
  const l2 = await linhas();
  const anos = l2.map((l) => Number((/Término(\d{4})/.exec(l.texto) || [])[1]));
  check("2) A lista mostra um contrato por jogador não emprestado, ordenada por vencimento:",
    l2.length === esperado.length && anos.every((a, i) => i === 0 || a >= anos[i - 1]), JSON.stringify({ linhas: l2.length, esperado: esperado.length, anos: anos.slice(0, 5) }));

  // 3) "Vencendo": só contratos que terminam nesta temporada, com "Renovar".
  await page.locator('[role="tab"]', { hasText: "Vencendo" }).click();
  const l3 = await linhas();
  const vencendo = esperado.filter((p) => p.contractUntil === save.seasonYear);
  check("3) O filtro \"Vencendo\" mostra só os contratos desta temporada, cada um com \"Renovar\":",
    l3.length === vencendo.length && l3.length > 0 && l3.every((l) => l.renovar), JSON.stringify({ linhas: l3.length, vencendo: vencendo.length }));

  // 4) O nome leva à ficha do jogador.
  const href = l3.find((l) => l.href && l.href.includes(encodeURIComponent(vencendoId)));
  check("4) O nome do jogador leva à ficha dele:", !!href && href.href.startsWith("/elenco/ficha?id="), JSON.stringify(href));

  // 5) "Renovar" abre a renovação.
  await page.locator(".pr-plist button.pr-row", { hasText: "Renovar" }).first().click();
  await page.waitForSelector("#rn-t", { timeout: 10000 });
  check("5) \"Renovar\" abre a renovação do contrato:", true, await page.textContent("#rn-t"));

  // 7) Estado vazio do "Vencendo".
  await noMotor(page, async ({ CAREER, persistir }) => {
    CAREER.squad.forEach((p) => { if (p.origin !== "loan") p.contractUntil = CAREER.seasonYear + 3; });
    await persistir();
  });
  await page.goto(base + "/contratos", { waitUntil: "domcontentloaded" });
  await h1("Cuide da continuidade.");
  await page.locator('[role="tab"]', { hasText: "Vencendo" }).click();
  const vazio = await page.evaluate(() => ({ nota: (document.querySelector('[role="tabpanel"] .wk-note') || {}).textContent || "", linhas: document.querySelectorAll(".pr-plist > li").length }));
  check("7) Sem contrato vencendo, o filtro \"Vencendo\" mostra a mensagem do estado vazio:", vazio.linhas === 0 && /Nenhum contrato termina em \d{4}/.test(vazio.nota), JSON.stringify(vazio));

  check("8) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
