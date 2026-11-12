// Verifica a correção do bug "Time #ope": uma carreira criada em Modo
// Exemplo (liveMode: false) precisa continuar SEMPRE recarregando com
// os mesmos ids de time, mesmo que o dado real fique disponível
// depois (env vars configuradas) -- não pode trocar de fonte de dado
// silenciosamente e quebrar os ids já gravados no calendário/elenco.
// Lote L2 do plano "testes sem a tela antiga": mesmas verificações, pelo
// motor da v2 (loadLeague, timePorId); o passo 4 confere o Início da v2.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, noMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  // Série B, 1º clube da lista, ainda na pré-temporada (como na tela antiga).
  await carreiraV2(page, `pindata${Date.now()}@teste.com`, { competicao: "serie_b", preTemporada: true });

  // 1) Carreira nasceu em Modo Exemplo (sem chave real configurada neste
  // ambiente de teste) -- liveMode gravado como false, e o calendário tem
  // os ids fictícios de sempre (ex.: "ope").
  const initial = await noMotor(page, ({ CAREER }) => ({
    liveMode: CAREER.liveMode,
    hasOpeInSchedule: Object.values(CAREER.schedule).some((round) => round.some((m) => m.home === "ope" || m.away === "ope")),
  }));
  check("1) Carreira criada em Modo Exemplo (liveMode=false):", initial.liveMode === false, "| calendário usa ids fictícios (ex.: 'ope'):", initial.hasOpeInSchedule);

  // Fornecedor real "disponível": troca o fetch para devolver um catálogo
  // de times com ids TOTALMENTE diferentes dos fictícios.
  const comFornecedorReal = async (M, { forceDemo }) => {
    const realFetch = window.fetch;
    window.fetch = async (url, opts) => {
      if (String(url).includes("/api/health")) return new Response(JSON.stringify({ hasKey: true, season: 2026 }), { status: 200 });
      if (String(url).includes("/api/career/teams")) return new Response(JSON.stringify({ teams: [{ id: "9001", name: "Operário Ferroviário", short: "OPE" }, { id: "9002", name: "Goiás", short: "GOI" }] }), { status: 200 });
      if (String(url).includes("/api/career/standings")) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
      return realFetch(url, opts);
    };
    try {
      // Carreira "single" (marketScope legado): sem o registro das 3
      // competições, que mascararia o bug por outro caminho (ver o
      // comentário do teste antigo sobre ALL_TEAMS_FLAT).
      M.estado.definirTodosTimes([]);
      await M.carga.loadLeague("serie_b", forceDemo ? { forceDemo: M.CAREER.liveMode === false } : undefined);
      return { liveMode: M.estado.modoReal(), opeName: M.estado.timePorId("ope").name };
    } finally {
      window.fetch = realFetch;
    }
  };
  // 2) SEM a correção: loadLeague sem forceDemo reproduz o "Time #ope".
  const withoutFix = await noMotor(page, comFornecedorReal, { forceDemo: false });
  check("2) SEM a correção (loadLeague sem forceDemo), o bug reproduz -- 'Time #ope' aparece:", withoutFix.opeName === "Time #ope", JSON.stringify(withoutFix));
  // 3) Com a correção (forceDemo pela carreira em Modo Exemplo, como a
  // entrada do jogo faz), os ids continuam batendo com o calendário.
  const withFix = await noMotor(page, comFornecedorReal, { forceDemo: true });
  check("3) COM a correção, 'Operário-PR' continua resolvendo certo (sem quebrar):", withFix.opeName === "Operário-PR", "| continua em Modo Exemplo:", withFix.liveMode === false, JSON.stringify(withFix));

  // 4) Fluxo real: recarregar (a entrada do jogo) não quebra nada -- o
  // Início da v2 não mostra "Time #".
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".home", { timeout: 30000 });
  const texto = await page.evaluate(() => document.querySelector(".home").innerText);
  check("4) Depois de recarregar de verdade (entrada do jogo), o Início não mostra 'Time #' quebrado:", !texto.includes("Time #"), JSON.stringify(texto.slice(0, 200)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
