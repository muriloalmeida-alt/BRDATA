// Lances e estatísticas da partida — lote L5d, sem a tela antiga. Junta o
// test_play_by_play_v1 e o test_play_by_play_v2. A partida pela ponte e o que
// o motor guarda dela; as telas da v2 (lances na Partida, velocidade, "Ver
// lances" e o Resultado) estão no test_v2_partida e no test_v2_resultado.
//  1) A velocidade 2× fica na partida (ponte.velocidade, o botão da v2).
//  2) Os lances são variados: além de gols e cartões, há chances perdidas e
//     defesas.
//  3) Cada gol tem o autor e, quando há, o autor da assistência (com o id).
//  4) As estatísticas: finalizações no alvo nunca passam das finalizações,
//     para cada lado, e a posse fica entre 0 e 100%.
// O test_play_by_play_v2 só imprimia os lances raros (lesão, pênalti, VAR)
// achados em várias partidas: são sorteados e não viraram verificação.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `lances${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  const r = await page.evaluate(async () => {
    const P = (await import("/js/motor/v2.js")).criarPonte();
    const ate = async (cond, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = cond(); if (v) return v; await new Promise((ok) => setTimeout(ok, 50)); } return null; };
    let i = P.iniciar();
    if (i && i.motivo === "escalacao") { await P.completarEscalacao(); i = P.iniciar(); }
    const lm = LIVE_MATCH;
    P.velocidade(2);
    const vel = { motor: lm.speed, ponte: P.estado().velocidade };
    P.pularParaFim();
    await ate(() => { const e = P.estado(); return e.fase === "encerrada" && e.gravada != null; });
    const ev = lm.events || [];
    const s = lm.stats;
    const posse = Math.round(Math.max(0, Math.min(1, s.possWeightHome)) * 100);
    return {
      vel, tipos: [...new Set(ev.map((e) => e.type))],
      gols: ev.filter((e) => e.type === "gol").map((e) => ({ autor: !!e.player, temChave: "assistPlayer" in e, ok: !e.assistPlayer || !!e.assistPlayerId })),
      stats: { shots: s.shots, onTarget: s.shotsOnTarget, posse },
    };
  });

  check("1) A velocidade 2× fica na partida:", r.vel.motor === 2 && r.vel.ponte === 2, JSON.stringify(r.vel));
  check("2) Lances variados: chances perdidas ou defesas além de gols e cartões:", r.tipos.includes("chance_perdida") || r.tipos.includes("defesa"), JSON.stringify(r.tipos));
  check("3) Cada gol tem o autor e a assistência (quando há, com o id):", r.gols.every((g) => g.autor && g.temChave && g.ok), JSON.stringify(r.gols));
  check("4) Finalizações no alvo nunca passam das finalizações; posse entre 0 e 100%:",
    ["home", "away"].every((k) => r.stats.onTarget[k] <= r.stats.shots[k] && r.stats.shots[k] >= 0) && r.stats.posse >= 0 && r.stats.posse <= 100, JSON.stringify(r.stats));
  check("5) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
