// PARIDADE-CPU · E3, PR3 (22/11): "Agentes livres" no Mercado da v2. Quem a
// CPU dispensa ou não renova fica livre; você contrata sem taxa, só com o
// salário que ele pede, por 2 temporadas.
//  1) Mercado: a entrada "Agentes livres" com a quantidade.
//  2) A tela lista o jogador com o último clube e o salário pedido.
//  3) "Contratar sem taxa": ele chega ao seu elenco, o caixa só paga luvas e
//     comissão (economia v6; antes, não mudava) e a
//     lista fica vazia.
//  4) 360 px sem rolagem horizontal.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, noMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await carreiraV2(page, `livres${Date.now()}@teste.com`, { preTemporada: true });
  const alvo = await noMotor(page, (M) => {
    const C = M.CAREER;
    C.finances.wageCap = 1e9;
    const clubeId = Object.keys(C.leagueSquads)[0];
    const base = C.leagueSquads[clubeId][4];
    C.agentesLivres = [{ ...base, id: "livre_v2", name: "Agente Livre Teste", livreDesde: { temporada: C.seasonYear, rodada: 1 }, ultimoClube: clubeId }];
    return M.persistir().then(() => ({ caixa: C.finances.cash, n: C.squad.length }));
  });

  // 1) Entrada no Mercado.
  await page.goto(base + "/mercado", { waitUntil: "domcontentloaded" });
  const entrada = page.getByRole("link", { name: /Agentes livres/ });
  await entrada.waitFor({ timeout: 20000 });
  const textoEntrada = (await entrada.innerText()).replace(/\s+/g, " ");
  check("1) Mercado: a entrada \"Agentes livres\" com a quantidade:", /Agentes livres/.test(textoEntrada) && /\b1\b/.test(textoEntrada), textoEntrada);

  // 2) A lista.
  await entrada.click();
  await page.getByRole("heading", { name: "Agentes livres." }).waitFor({ timeout: 20000 });
  const item = (await page.locator(".mk-list li").first().innerText()).replace(/\s+/g, " ");
  check("2) A tela lista o jogador com o último clube e o salário pedido:", /Teste/.test(item) && /Último clube/.test(item) && /Salário pedido/.test(item), item);

  // 4) 360 px.
  await page.setViewportSize({ width: 360, height: 780 });
  const rola = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

  // 3) Contratar.
  await page.getByRole("button", { name: "Contratar sem taxa" }).first().click();
  await page.locator(".pr-ok").waitFor({ timeout: 20000 });
  // MERCADO-001 (economia v6, carreiras novas): sem taxa ao clube anterior;
  // saem do caixa só as luvas e a comissão do agente (lançadas no extrato).
  const depois = await noMotor(page, (M) => ({ caixa: M.CAREER.finances.cash, n: M.CAREER.squad.length, tem: M.CAREER.squad.some((p) => p.id === "livre_v2"), livres: (M.CAREER.agentesLivres || []).length,
    custos: (M.CAREER.financeLedger || []).filter((l) => /^(Luvas|Comissão do agente)/.test(l.label || "")).reduce((s, l) => s - l.amount, 0) }));
  const vazia = await page.getByText(/Nenhum jogador livre agora/).waitFor({ timeout: 10000 }).then(() => 1, () => 0);
  check("3) Contratado: chega ao seu elenco, o caixa não muda e a lista fica vazia:",
    depois.tem && depois.n === alvo.n + 1 && depois.caixa === alvo.caixa - depois.custos && depois.livres === 0 && vazia > 0, JSON.stringify({ alvo, depois, vazia }));
  check("4) 360 px sem rolagem horizontal:", !rola);
  check("5) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));

  await browser.close();
  console.log("OK");
  process.exit(0);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
