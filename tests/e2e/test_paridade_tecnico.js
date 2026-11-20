// PARIDADE-CPU · E1b, PR1 (20/11): o técnico da CPU. Perfil do clube com
// variação guardada (D1), postura no pré-jogo pelo perfil, pela diferença de
// força e pelo mando, e mudança no intervalo pelo placar, com o lance nos
// Lances da sua partida (D3). Sem navegador, pela ponte, perfil frozen.
//  1) Perfil: o clube mais forte é mais ousado que o mais fraco; a variação
//     é sorteada uma vez e fica no save (CAREER.perfisCpu), sempre igual.
//  2) Postura: o mais fraco, fora, contra o mais forte se fecha; o mais forte,
//     em casa, contra o mais fraco, propõe o jogo.
//  3) A postura entra na força: com o mesmo XI, a retranca ataca menos e
//     defende melhor que a postura equilibrada.
//  4) Intervalo: perdendo, abre um nível; ganhando, fecha; empate, mantém.
//  5) Na sua partida: a postura do adversário fica na partida e a mudança do
//     intervalo aparece nos lances, com o texto.
//  6) Regra desligada (equivalência): sem postura e sem perfil gravado.
const { check } = require("./_check");
const { abrirPagina, ate } = require("./_sem_tela");

(async () => {
  const pg = await abrirPagina();
  if (!pg.pronta) throw new Error("ponte não ficou pronta");
  const comp = await pg.P.escolherCompeticao("brasileirao");
  await pg.P.criarCarreira(comp.clubes[0].id);
  const ler = (codigo) => JSON.parse(pg.rodar(`JSON.stringify((() => { const M = window.BRDATA_MOTOR, E = M.estado, F = M.fechamento, C = E.carreiraAtual();
    const forca = (id) => { const f = E.forcaDeJogo(E.timePorId(id)); return f.atk / f.def; };
    const ids = Object.keys(C.standings).filter((x) => x !== String(C.clubId)).sort((a, b) => forca(b) - forca(a));
    const forte = ids[0], fraco = ids[ids.length - 1];
    ${codigo} })())`, "teste"));

  // 1) Perfil.
  const r1 = ler(`
    const pf = F.perfilDoTecnico(forte), pw = F.perfilDoTecnico(fraco);
    const guardado = { ...C.perfisCpu };
    const de_novo = F.perfilDoTecnico(forte);
    return { pf, pw, de_novo, guardado: [guardado[forte], guardado[fraco]] };`);
  check("1) Perfil: o clube mais forte é mais ousado que o mais fraco; a variação fica guardada no save e o perfil se repete:",
    r1.pf > r1.pw && r1.pf === r1.de_novo && r1.guardado.every((v) => typeof v === "number" && Math.abs(v) <= 0.3), JSON.stringify(r1));

  // 2) Postura.
  const r2 = ler(`
    const fracoFora = F.posturaDaCpu(fraco, forte, false), forteCasa = F.posturaDaCpu(forte, fraco, true);
    return { fracoFora: [fracoFora.id, fracoFora.formation], forteCasa: [forteCasa.id, forteCasa.formation], nf: fracoFora.nivel, nc: forteCasa.nivel };`);
  check("2) Postura: o mais fraco, fora, contra o mais forte se fecha; o mais forte, em casa, contra o mais fraco, propõe o jogo:",
    r2.nf <= 1 && r2.nc >= 2 && r2.nc > r2.nf, JSON.stringify(r2));

  // 3) A postura entra na força.
  const r3 = ler(`
    const club = E.timePorId(fraco), r = C.currentRound;
    const xi = F.xiDaCpu(fraco, r, "4-4-2");
    const eq = F.forcaDaCpu(fraco, club, xi, 0, "4-4-2", F.tacticModDe(F.POSTURAS_CPU[2].tactics));
    const re = F.forcaDaCpu(fraco, club, xi, 0, "5-4-1", F.tacticModDe(F.POSTURAS_CPU[0].tactics));
    return { eq: [eq.atk, eq.def], re: [re.atk, re.def] };`);
  check("3) Com o mesmo XI, a retranca ataca menos e defende melhor (sofre menos) que a postura equilibrada:",
    r3.re[0] < r3.eq[0] && r3.re[1] < r3.eq[1], JSON.stringify(r3));

  // 4) Intervalo.
  const r4 = ler(`
    const atual = F.posturaDaCpu(forte, fraco, true);
    const perdendo = F.posturaNoIntervalo(fraco, { ...F.POSTURAS_CPU[1], nivel: 1 }, 0, 1);
    const ganhando = F.posturaNoIntervalo(fraco, { ...F.POSTURAS_CPU[2], nivel: 2 }, 1, 0);
    const empate = F.posturaNoIntervalo(fraco, { ...F.POSTURAS_CPU[2], nivel: 2 }, 1, 1);
    return { perdendo: perdendo && [perdendo.nivel, perdendo.formation], ganhando: ganhando && [ganhando.nivel, ganhando.formation], empate };`);
  check("4) Intervalo: perdendo, abre um nível (mantém a formação); ganhando, fecha um; empatado, mantém:",
    r4.perdendo && r4.perdendo[0] === 2 && r4.perdendo[1] === "4-5-1" && r4.ganhando && r4.ganhando[0] === 1 && r4.empate === null, JSON.stringify(r4));

  // 5) Na sua partida: força um placar no intervalo em que o adversário perde.
  await pg.P.avancarSemana(true);
  let i = pg.P.iniciar();
  if (i && i.motivo === "escalacao") { await pg.P.escalarAutomaticamente(true); i = pg.P.iniciar(); }
  pg.rodar(`(() => { const lm = window.BRDATA_MOTOR.estado.partidaAtual(); lm.pararEmEvento = false; window.__lm = lm; })()`, "lm");
  const r5a = ler(`const lm = window.__lm; return { postura: lm.cpuPostura ? [lm.cpuPostura.id, lm.cpuPostura.formation, lm.cpuPostura.nivel] : null };`);
  // Antes do 2º tempo: o seu time vence por 2 (o adversário perde e abre um nível, se puder).
  await ate(() => ler(`return window.__lm.chunkIndex >= 3;`) || ler(`return window.__lm.halftime === true;`), 30000);
  ler(`const lm = window.__lm; if (lm.chunkIndex === 3 && !lm.cpuIntervaloVisto) { if (lm.isHome) { lm.gh = lm.ga + 2; } else { lm.ga = lm.gh + 2; } } return 0;`);
  pg.P.pularParaFim();
  await ate(() => { const e = pg.P.estado(); return e.fase === "encerrada" && e.gravada != null; }, 60000);
  const est = pg.P.estado();
  const r5 = ler(`const lm = window.__lm; return { nivel: lm.cpuPostura && lm.cpuPostura.nivel, visto: !!lm.cpuIntervaloVisto, tatica: (lm.events || []).filter((e) => e.type === "tatica").map((e) => [e.minute, e.mine, e.text]) };`);
  const lance = (est.eventos || []).find((e) => e.tipo === "tatica");
  const podiaAbrir = r5a.postura && r5a.postura[2] < 3;
  check("5) Na sua partida: o adversário tem postura; perdendo no intervalo, abre um nível e o lance aparece com o texto (minuto 45):",
    r5a.postura && r5.visto && (podiaAbrir ? (r5.nivel === r5a.postura[2] + 1 && lance && lance.minuto === 45 && lance.meu === false && /ataque/.test(lance.texto || "")) : !lance),
    JSON.stringify({ r5a, r5, lance }));

  // 6) Regra desligada.
  const r6 = ler(`
    E.PARIDADE_CPU.tecnico = false;
    try { const antes = Object.keys(C.perfisCpu || {}).length; const p = F.posturaDaCpu(fraco, forte, false); return { p, mesmos: Object.keys(C.perfisCpu || {}).length === antes }; }
    finally { E.PARIDADE_CPU.tecnico = true; }`);
  check("6) Regra desligada (só os testes de equivalência): sem postura e sem perfil novo no save:", r6.p === null && r6.mesmos, JSON.stringify(r6));

  console.log("OK");
  process.exit(0);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
