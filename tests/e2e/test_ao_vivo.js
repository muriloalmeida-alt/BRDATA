// Partida ao vivo (substituição, troca de esquema, expulsão, fim) — lote L5d,
// sem a tela antiga. A partida pela ponte (iniciar, pausar, substituir,
// aplicarTatica, pularParaFim: os mesmos comandos da Partida da v2) e os
// tempos resolvidos pelo motor (resolveLiveChunk). As telas: a Partida
// (placar, minuto, lances, pausar, intervalo, velocidade, pular para o fim)
// no test_v2_partida e no test_v2_pausa; Substituição e Ajustar tática no
// test_v2_ajustes; Resultados da rodada no test_v2_posjogo item 3.
//  1) A partida começa ao vivo.
//  2) Substituição: quem saiu deixa de ser titular; 1 substituição usada.
//  3) Trocar o esquema no jogo: a formação muda, com 2 tempos de penalidade
//     de familiaridade.
//  4) A penalidade some depois de 2 tempos.
//  5) Uma expulsão deixa o expulso suspenso, na vaga e sem reposição: não há
//     substituição a mais e o comando recusa trocá-lo (EXPULSAO, 17/11).
//  6) Pular para o fim termina a partida e grava a rodada (avança 1).
//  7) A rodada grava os 10 jogos (os da CPU também).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `aovivo${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  const r = await page.evaluate(async () => {
    const P = (await import("/js/motor/v2.js")).criarPonte();
    const ate = async (cond, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = cond(); if (v) return v; await new Promise((ok) => setTimeout(ok, 50)); } return null; };
    const out = {};
    let i = P.iniciar();
    if (i && i.motivo === "escalacao") { await P.completarEscalacao(); i = P.iniciar(); }
    const rodada = CAREER.currentRound;
    out.um = { i, aoVivo: !!LIVE_MATCH };
    P.pausar();
    resolveLiveChunk();
    // Um titular em campo (EXPULSAO: um expulso de verdade no 1º bloco não pode sair).
    const sai = CAREER.lineup.starters.find((id) => id && !(LIVE_MATCH.expulsos || []).includes(id));
    const entra = CAREER.lineup.bench.find((id) => CAREER.squad.find((p) => p.id === id && p.status === "ok"));
    const s = P.substituir(sai, entra);
    out.dois = { s, saiTitular: CAREER.lineup.starters.includes(sai), usadas: LIVE_MATCH.subsUsed };
    const outra = Object.keys(FORMATIONS).find((f) => f !== CAREER.lineup.formation);
    P.aplicarTatica({ formacao: outra });
    out.tres = { formacao: CAREER.lineup.formation === outra, penalidade: LIVE_MATCH.formationPenaltyChunksLeft };
    P.pausar();
    resolveLiveChunk(); resolveLiveChunk();
    out.quatro = { penalidade: LIVE_MATCH.formationPenaltyChunksLeft };
    const real = Math.random;
    Math.random = () => 0.001; // vermelho garantido para quem estiver em campo
    resolveLiveChunk();
    Math.random = real;
    const expulso = (LIVE_MATCH.expulsos || [])[0];
    const reserva = CAREER.lineup.bench.find((id) => CAREER.squad.find((p) => p.id === id && p.status === "ok"));
    out.cinco = { bonus: LIVE_MATCH.subsBonus, suspenso: CAREER.squad.some((p) => p.status === "suspenso"), expulso: !!expulso, naVaga: !!expulso && CAREER.lineup.starters.includes(expulso), troca: expulso ? P.substituir(expulso, reserva) : null };
    P.pularParaFim();
    const fim = await ate(() => { const e = P.estado(); return e.fase === "encerrada" && e.gravada != null ? e : null; });
    out.seis = { gravada: fim && fim.gravada, rodada, depois: CAREER.currentRound };
    out.sete = ((CAREER.resultsByRound || {})[rodada] || []).length;
    return out;
  });

  check("1) A partida começa ao vivo:", r.um.i && r.um.i.ok && r.um.aoVivo, JSON.stringify(r.um));
  check("2) Substituição: quem saiu não é mais titular; 1 substituição usada:", r.dois.s.ok && !r.dois.saiTitular && r.dois.usadas === 1, JSON.stringify(r.dois));
  check("3) Trocar o esquema no jogo: formação nova, com 2 tempos de penalidade de familiaridade:", r.tres.formacao && r.tres.penalidade === 2, JSON.stringify(r.tres));
  check("4) A penalidade some depois de 2 tempos:", r.quatro.penalidade === 0, JSON.stringify(r.quatro));
  check("5) Uma expulsão deixa o expulso suspenso, na vaga e sem reposição (sem substituição a mais; trocá-lo é recusado):",
    r.cinco.bonus === 0 && r.cinco.suspenso && r.cinco.expulso && r.cinco.naVaga && r.cinco.troca && r.cinco.troca.ok === false && r.cinco.troca.motivo === "expulso", JSON.stringify(r.cinco));
  check("6) Pular para o fim termina e grava a rodada (avança 1):", r.seis.gravada === true && r.seis.depois === r.seis.rodada + 1, JSON.stringify(r.seis));
  check("7) A rodada grava os 10 jogos (CPU também):", r.sete === 10, r.sete);
  check("8) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
