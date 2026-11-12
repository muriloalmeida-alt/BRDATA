// Migração de save MUITO antigo: sem nenhum campo das fases 2/3 (finanças,
// elencos da liga, estatísticas, histórico…) e sem salário, valor e
// contrato nos jogadores. Ao carregar, o motor completa os campos
// (migrateCareerDefaults) e a v2 abre normalmente.
// Lote L2 do plano "testes sem a tela antiga": antes este teste só
// imprimia o resultado (sem verificação) e usava a tela antiga; agora
// verifica, pelo motor da v2.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, noMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await carreiraV2(page, `migration${Date.now()}@teste.com`, { preTemporada: true });
  // Simula um save BEM ANTIGO pelo servidor.
  const put = await page.evaluate(async () => {
    const data = await (await fetch("/api/career", { cache: "no-store" })).json();
    for (const k of ["finances", "leagueSquads", "teamStats", "transferLog", "pendingOffer", "lastBoardRequestRound", "boardDecision", "recentForm", "seasonYear", "seasonHistory"]) delete data.career[k];
    data.career.squad.forEach((p) => { delete p.wage; delete p.value; delete p.contractUntil; });
    return (await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data.career) })).status;
  });
  // Recarrega: a v2 abre o motor, que carrega e migra o save.
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".home", { timeout: 30000 });
  const mem = await noMotor(page, ({ CAREER }) => ({
    finances: !!CAREER.finances && typeof CAREER.finances.cash === "number",
    // Só existe: um save sem elencos da liga volta com o objeto vazio, e
    // nada os reconstrói (comportamento de antes, registrado no relatório
    // ENTREGA_TESTES_L2.md para decisão).
    leagueSquads: !!CAREER.leagueSquads && typeof CAREER.leagueSquads === "object",
    seasonYear: CAREER.seasonYear,
    seasonHistory: Array.isArray(CAREER.seasonHistory),
    jogadores: CAREER.squad.every((p) => typeof p.wage === "number" && typeof p.value === "number" && p.contractUntil != null),
  }));
  check("1) Save antigo gravado (PUT) e a v2 abre o Início sem erro na página:", put === 200 && erros.length === 0, JSON.stringify({ put, erros: erros.slice(0, 2) }));
  check("2) O motor completa os campos ao carregar (finanças, elencos da liga como objeto, temporada, histórico; salário, valor e contrato de cada jogador):",
    mem.finances && mem.leagueSquads && typeof mem.seasonYear === "number" && mem.seasonHistory && mem.jogadores, JSON.stringify(mem));
  // Gravar de novo grava o save já completo.
  await noMotor(page, (M) => M.persistir());
  const salvo = await page.evaluate(async () => { const c = (await (await fetch("/api/career", { cache: "no-store" })).json()).career; return { finances: !!c.finances, seasonYear: c.seasonYear, wage: c.squad[0].wage }; });
  check("3) Ao gravar, o save completo vai para o servidor:", salvo.finances && typeof salvo.seasonYear === "number" && typeof salvo.wage === "number", JSON.stringify(salvo));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
