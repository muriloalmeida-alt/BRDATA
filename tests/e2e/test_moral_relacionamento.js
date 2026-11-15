// Moral e relacionamento (banco, conversa, pedido de transferência) — lote
// L5a, sem a tela antiga. As regras pelo motor (applyMoraleAfterMatch,
// canTalkTo) e a conversa pela ponte (ponte.conversar, a mesma da tela
// Conversa da v2, que está no test_v2_elenco_avancado item 5).
//  1) 3 jogos fora do time: a sequência no banco vai a 3 e o motivo vira
//     insatisfação; o titular não acumula sequência.
//  2) Conversar fica disponível para o insatisfeito, não para o titular.
//  3) "Ouvir e apoiar": a moral sobe, o motivo muda para a conversa e não dá
//     para conversar de novo na mesma rodada.
//  4) Moral muito baixa com banco prolongado: marca o pedido de
//     transferência.
//  5) "Cobrar postura" em quem já está muito infeliz piora a moral.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `relacao${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  const r = await page.evaluate(async () => {
    const P = (await import("/js/motor/v2.js")).criarPonte();
    const out = {};
    const reserva = CAREER.squad.find((p) => CAREER.lineup.bench.includes(p.id) && p.origin === "principal");
    const titular = CAREER.squad.find((p) => CAREER.lineup.starters.includes(p.id));
    for (let i = 0; i < 3; i++) applyMoraleAfterMatch(2, 0);
    out.um = { streak: reserva.benchStreak, motivo: reserva.moraleReason, titularStreak: titular.benchStreak };
    out.dois = { reserva: canTalkTo(reserva), titular: canTalkTo(titular) };
    const antes = reserva.morale;
    const c = await P.conversar(reserva.id, "apoiar");
    out.tres = { c, antes, depois: reserva.morale, motivo: reserva.moraleReason, deNovo: canTalkTo(reserva) };
    reserva.benchStreak = 6; reserva.morale = 10; reserva.lastTalkRound = null;
    applyMoraleAfterMatch(0, 2);
    out.quatro = { quer: reserva.wantsTransfer };
    reserva.lastTalkRound = null;
    const antes5 = reserva.morale;
    const c5 = await P.conversar(reserva.id, "cobrar");
    out.cinco = { c5, antes5, depois: reserva.morale };
    return out;
  });

  check("1) 3 jogos fora: sequência no banco 3, motivo de insatisfação; o titular não acumula:", r.um.streak === 3 && /Insatisfeito|Contrariado/.test(r.um.motivo) && r.um.titularStreak === 0, JSON.stringify(r.um));
  check("2) Conversar disponível para o insatisfeito, não para o titular:", r.dois.reserva === true && r.dois.titular === false, JSON.stringify(r.dois));
  check("3) 'Ouvir e apoiar': a moral sobe, o motivo muda para a conversa e não dá para conversar de novo na rodada:", r.tres.c.ok && r.tres.depois > r.tres.antes && /Conversou/.test(r.tres.motivo) && r.tres.deNovo === false, JSON.stringify(r.tres));
  check("4) Moral muito baixa com banco prolongado: pede transferência:", r.quatro.quer === true, JSON.stringify(r.quatro));
  check("5) 'Cobrar postura' em quem já está muito infeliz piora a moral:", r.cinco.c5.ok && r.cinco.depois < r.cinco.antes5, JSON.stringify(r.cinco));
  check("6) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
