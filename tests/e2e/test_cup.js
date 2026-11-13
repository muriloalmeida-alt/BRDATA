// Copa do Brasil (formato expandido, ida e volta, com a Série D desde a
// SERIED-001) — lote L4b, sem a tela antiga. O teste antigo verificava só o
// 1º valor de cada item (o resto era impresso: "Fase 1 tem 56 clubes", "4
// cabeças de chave"...). Agora, pelo motor e pela tela da Copa da v2:
//  1) Carreira na Série A: Copa expandida com 96 clubes, começando na fase
//     preliminar (32 jogos únicos, 64 clubes); os outros 32 (o clube da
//     Série A entre eles) entram direto na 1ª fase.
//  2) Rodada a rodada até fechar a rodada 6 (volta da 1ª fase): a Copa
//     passou da 1ª fase (32 avos) ou o clube foi eliminado.
//  3) A Copa da v2 mostra o estado certo (título e "Copa do Brasil · …").
//  4) Campeão: "A Copa é sua." / "Copa do Brasil · Campeão".
//  5) Não classificado (cup.active = false): "Fora desta Copa."
//  6) Migração: save sem Copa na rodada 20, ao abrir, monta a Copa e fecha
//     por trás as fases já passadas (próxima: quartas, ida na rodada 21).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, jogarRodadaV2, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `cup${Date.now()}@teste.com`);

  // 1) Estrutura.
  const e1 = await noMotor(page, ({ CAREER }) => {
    const c = CAREER.cup;
    const prelim = (c.ties.prelim || []).flatMap((t) => [String(t.home), String(t.away)]);
    const direct = (c.prelim && c.prelim.direct || []).map(String);
    return { expanded: c.expanded, participantes: c.participantes, phase: c.phase, prelimJogos: (c.ties.prelim || []).length, prelimClubes: new Set(prelim).size, direct: direct.length,
      meDireto: direct.includes(String(CAREER.clubId)), meNaPrelim: prelim.includes(String(CAREER.clubId)), divisao: CAREER.competitionId };
  });
  check("1) Série A: Copa expandida com 96 clubes, começando na preliminar (32 jogos, 64 clubes); os outros 32, com o seu clube, entram direto na 1ª fase:",
    e1.expanded && e1.participantes === 96 && e1.phase === "prelim" && e1.prelimJogos === 32 && e1.prelimClubes === 64 && e1.direct === 32 && e1.meDireto && !e1.meNaPrelim, JSON.stringify(e1));

  // 2) Rodada a rodada até fechar a rodada 6.
  const passos = [];
  for (let guard = 0; guard < 10 && (await noMotor(page, ({ CAREER }) => CAREER.currentRound)) <= 6; guard++) {
    const r = await jogarRodadaV2(page);
    passos.push(r.ok ? "ok" : r.passos.join(" "));
    if (!r.ok) break;
  }
  const e2 = await noMotor(page, ({ CAREER }) => ({ rodada: CAREER.currentRound, phase: CAREER.cup.phase, vivo: CAREER.cup.humanAlive, r32: (CAREER.cup.ties.r32 || []).length }));
  check("2) Depois da rodada 6 (volta da 1ª fase): a Copa está nos 32 avos (16 confrontos) ou o clube foi eliminado:",
    e2.rodada === 7 && ((e2.phase === "r32" && e2.r32 === 16) || e2.vivo === false), JSON.stringify({ e2, passos }));

  // 3) Tela da Copa da v2.
  const copa = async () => {
    await page.goto(base + "/copa", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1.screen-title", { timeout: 30000 });
    await page.waitForTimeout(300);
    return page.evaluate(() => ({ h1: document.querySelector("h1.screen-title").textContent, sub: document.querySelector(".screen-sub")?.textContent || "" }));
  };
  const t3 = await copa();
  const esperado3 = e2.vivo ? ["A caminho da taça.", "Copa do Brasil · Em disputa"] : ["Sua campanha terminou.", "Copa do Brasil · Eliminado"];
  check("3) A Copa da v2 mostra o estado certo (título e situação):", t3.h1 === esperado3[0] && t3.sub === esperado3[1], JSON.stringify({ t3, esperado3 }));

  // 4) Campeão.
  await noMotor(page, ({ CAREER, persistir }) => { Object.assign(CAREER.cup, { phase: "done", champion: CAREER.clubId, championIsHuman: true, humanAlive: true }); return persistir(); });
  const t4 = await copa();
  check("4) Campeão: 'A Copa é sua.' e 'Copa do Brasil · Campeão':", t4.h1 === "A Copa é sua." && t4.sub === "Copa do Brasil · Campeão", JSON.stringify(t4));

  // 5) Não classificado.
  await noMotor(page, ({ CAREER, persistir }) => { CAREER.cup.active = false; return persistir(); });
  const t5 = await copa();
  check("5) Não classificado: 'Fora desta Copa.' e 'Copa do Brasil · Não classificado':", t5.h1 === "Fora desta Copa." && t5.sub === "Copa do Brasil · Não classificado", JSON.stringify(t5));

  // 6) Migração: sem Copa, rodada 20; ao abrir, a Copa é montada e as fases
  // passadas fecham por trás.
  await noMotor(page, ({ CAREER, persistir }) => { delete CAREER.cup; CAREER.currentRound = 20; return persistir(); });
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  const e6 = await noMotor(page, ({ CAREER }) => ({ temCopa: !!CAREER.cup, expanded: CAREER.cup && CAREER.cup.expanded, phase: CAREER.cup && CAREER.cup.phase }));
  check("6) Migração (save sem Copa na rodada 20): ao abrir, a Copa é montada e as fases passadas fecham por trás (próxima: quartas):",
    e6.temCopa && e6.expanded && e6.phase === "qf", JSON.stringify(e6));

  check("7) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
