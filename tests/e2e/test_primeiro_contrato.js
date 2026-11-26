// PC-001 — Touchline · Primeiro Contrato (app independente em
// /primeiro-contrato). Smoke de ponta a ponta pela tela do próprio app (não
// usa a tela antiga nem a carreira do treinador):
//  1) A rota serve o app e o catálogo publicado (ponteiro + snapshot).
//  2) Arquivo inexistente do bundle é 404 (nunca o HTML).
//  3) Header só com o símbolo T; famílias e pesos reais das fontes.
//  4) Criação: apelido, posição (11 alvos, seleção única) e clube por busca
//     sem acento.
//  5) Contrato com papel, previsão em intervalo e vínculo; assinar abre a
//     temporada.
//  6) Avançar até uma decisão ou o balanço; recarregar retoma o save
//     (IndexedDB) com a mesma decisão pendente.
const { chromium } = require("playwright-core");
const { check } = require("./_check");

const base = "http://localhost:8787";

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));

  const ativo = await (await fetch(`${base}/primeiro-contrato/catalogo/ativo.json`)).json();
  const snap = await (await fetch(`${base}/primeiro-contrato/catalogo/${ativo.arquivo}`)).json();
  check("1) catálogo publicado:", snap.clubes.length === 795 && snap.ligas.length === 34, snap.versao);
  const r404 = await fetch(`${base}/primeiro-contrato/assets/nao-existe.js`);
  check("2) asset inexistente é 404:", r404.status === 404);

  await page.goto(`${base}/primeiro-contrato`);
  await page.waitForSelector("h1");
  const header = await page.evaluate(async () => {
    await document.fonts.ready;
    const h = document.querySelector("header");
    const fam = (s) => { const c = getComputedStyle(document.querySelector(s)); return `${c.fontFamily.split(",")[0].replace(/"/g, "")} ${c.fontWeight}`; };
    return { filhos: h.children.length, img: h.querySelector("img")?.getAttribute("src"), titulo: fam("h1"), cta: fam(".cta"), apoio: fam(".apoio") };
  });
  check("3) header só com o T:", header.filhos === 1 && /marca-t\.webp$/.test(header.img || ""), header.img);
  check("3) fontes:", header.titulo === "Barlow Condensed 700" && header.cta === "Barlow Condensed 600" && header.apoio === "Barlow 400", JSON.stringify(header));

  await page.getByRole("button", { name: "Nova carreira" }).click();
  await page.fill("#apelido", "Smoke");
  await page.getByRole("button", { name: "Escolher posição" }).click();
  const alvos = await page.locator(".alvo").count();
  await page.getByRole("radio", { name: "Centroavante", exact: true }).click();
  await page.getByRole("radio", { name: "Goleiro", exact: true }).click();
  const marcados = await page.locator(".alvo[aria-checked=true]").count();
  check("4) 11 posições, seleção única:", alvos === 11 && marcados === 1, alvos, marcados);
  await page.getByRole("button", { name: "Escolher clube" }).click();
  await page.fill("input[type=search]", "sao paulo");
  const achou = page.getByRole("radio", { name: /São Paulo/ }).first();
  check("4) busca sem acento:", (await achou.count()) > 0);
  await achou.click();
  await page.getByRole("button", { name: "Ver proposta" }).click();
  await page.waitForSelector("text=Seu primeiro contrato");
  const dados = await page.locator(".linhas-dados dd").allTextContents();
  check("5) contrato (papel, intervalo, vínculo):", dados.length === 3 && /\d+–\d+%/.test(dados[1]) && /temporadas/.test(dados[2]), dados.join(" | "));
  await page.getByRole("button", { name: "Assinar contrato" }).click();
  await page.waitForSelector("text=Sua temporada");
  check("5) temporada aberta:", true);

  // PC-002: o primeiro CTA é "Iniciar temporada"; a reprodução jogo a jogo
  // tem Pausar, Acelerar e Ir à próxima decisão (que só pula a exibição).
  check("7) CTA inicial:", (await page.getByRole("button", { name: "Iniciar temporada" }).count()) === 1);
  let titulo = "";
  let viuReproducao = false;
  for (let i = 0; i < 12; i++) {
    const pular = page.getByRole("button", { name: "Ir à próxima decisão" });
    if (await pular.count()) {
      viuReproducao = true;
      const placar = await page.locator(".placar-num").count();
      check("7) card da partida com placar:", placar === 1);
      await pular.click();
    } else {
      await page.getByRole("button", { name: /^(Iniciar|Continuar) temporada$/ }).click();
    }
    await page.waitForTimeout(300);
    titulo = (await page.locator("h1").textContent()).trim();
    if (titulo !== "Sua temporada") break;
  }
  check("7) reprodução jogo a jogo:", viuReproducao);
  check("6) chegou a uma decisão ou ao balanço:", titulo !== "Sua temporada", titulo);
  await page.reload();
  await page.waitForSelector("h1");
  await page.getByRole("button", { name: "Continuar carreira" }).click();
  await page.waitForFunction((t) => document.querySelector("h1")?.textContent?.trim() === t, titulo, { timeout: 10000 }).catch(() => {});
  const depois = (await page.locator("h1").textContent()).trim();
  check("6) retomada na mesma tela:", depois === titulo, depois);
  check("sem erro de página:", erros.length === 0, erros.join(" | "));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
