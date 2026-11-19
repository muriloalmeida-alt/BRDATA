// PARIDADE-CPU · E1a, PR2 (19/11): a força de jogo dos dois lados sai da
// mesma regra (fechamento.forcaDoLado: XI em campo contra a média do elenco
// principal, completude, formação, tática e condição, sobre a força de jogo
// do clube), e a condição se recupera depois do jogo pela mesma regra (quem
// jogou recupera 45% do que falta; quem não jogou, como sempre). Sem
// navegador, pela ponte (_sem_tela.js), catálogo real congelado (frozen).
//  1) V01: a força da CPU é a da regra comum com as mesmas entradas, e a sua
//     também (computeHumanStrength = forcaDoLado com a sua escalação).
//  2) Desfalques pesam (V01, 3 confrontos): sem o goleiro e os melhores
//     defensores, a defesa piora; sem atacantes, o ataque cai.
//  3) Cansaço pesa: o mesmo XI com condição 40 ataca menos e defende pior.
//  4) Expulso da CPU ao vivo conta na vaga (sem desconto em dobro).
//  5) Condição depois da rodada: os titulares dos dois lados entram na
//     rodada seguinte entre 60 e 100 (nem cheios por engano, nem no piso).
//  6) Regra desligada (testes de equivalência): a força do clube, como antes.
const { check } = require("./_check");
const { abrirPagina, jogarRodada } = require("./_sem_tela");

(async () => {
  const pg = await abrirPagina();
  if (!pg.pronta) throw new Error("ponte não ficou pronta");
  const comp = await pg.P.escolherCompeticao("brasileirao");
  await pg.P.criarCarreira(comp.clubes[0].id);
  const ler = (codigo) => JSON.parse(pg.rodar(`JSON.stringify((() => { const M = window.BRDATA_MOTOR, E = M.estado, F = M.fechamento, C = E.carreiraAtual(); ${codigo} })())`, "teste"));
  const CLUBE = `const id = Object.keys(C.standings).find((x) => x !== String(C.clubId)); const club = E.timePorId(id); const r = C.currentRound; const sq = M.semana.leagueSquadFor(id);`;

  // 1) Mesma regra para os dois lados.
  const r1 = ler(`${CLUBE}
    const xi = F.xiDaCpu(id, r);
    const cpu = F.forcaDaCpu(id, club, xi);
    const comum = F.forcaDoLado({ club, elenco: sq, titulares: xi, formation: "4-4-2", tacticMod: { atk: 1, def: 1 } });
    const meu = F.computeHumanStrength(E.timePorId(C.clubId));
    const meuComum = F.forcaDoLado({ club: E.timePorId(C.clubId), elenco: C.squad, titulares: C.lineup.starters.map((x) => C.squad.find((p) => p.id === x)), formation: C.lineup.formation, tacticMod: F.combinedTacticMod() });
    return { cpu: [cpu.atk, cpu.def], comum: [comum.atk, comum.def], meu: [meu.atk, meu.def], meuComum: [meuComum.atk, meuComum.def], clube: [E.forcaDeJogo(club).atk, E.forcaDeJogo(club).def] };`);
  check("1) A força da CPU e a sua saem da mesma regra (forcaDoLado) com as mesmas entradas; a da CPU já não é só a do clube:",
    JSON.stringify(r1.cpu) === JSON.stringify(r1.comum) && JSON.stringify(r1.meu) === JSON.stringify(r1.meuComum) && JSON.stringify(r1.cpu) !== JSON.stringify(r1.clube), JSON.stringify(r1));

  // 2) Três confrontos no mesmo cenário: completo; sem o goleiro titular e os
  // 2 melhores defensores; sem nenhum atacante no elenco (as vagas de ataque
  // vão para quem é de outra posição). Os reservas do catálogo repetem
  // atributos: tirar só o titular nem sempre muda a força.
  const r2 = ler(`${CLUBE}
    const forca = () => { const f = F.forcaDaCpu(id, club, F.xiDaCpu(id, r)); return { atk: f.atk, def: f.def }; };
    const completo = forca();
    const xi = F.xiDaCpu(id, r);
    const melhores = (g, n) => xi.filter((p) => p.group === g).sort((a, b) => b.overall - a.overall).slice(0, n);
    const fora = (lista, sim) => lista.forEach((p) => { p.status = sim ? "contundido" : "ok"; p.outUntilRound = sim ? r + 3 : null; });
    const defesa = [...melhores("G", 1), ...melhores("D", 2)], ataque = sq.filter((p) => p.group === "F" && p.status === "ok");
    fora(defesa, true); const semDefesa = forca(); fora(defesa, false);
    fora(ataque, true); const semAtaque = forca(); fora(ataque, false);
    return { completo, semDefesa, semAtaque, atacantes: ataque.length };`);
  check("2) Desfalques pesam: sem o goleiro e os 2 melhores defensores titulares a defesa piora; sem atacantes o ataque cai:",
    r2.semDefesa.def > r2.completo.def && r2.semAtaque.atk < r2.completo.atk, JSON.stringify(r2));

  // 3) Cansaço.
  const r3 = ler(`${CLUBE}
    const xi = F.xiDaCpu(id, r);
    const descansado = F.forcaDaCpu(id, club, xi);
    const antes = xi.map((p) => p.condition); xi.forEach((p) => { p.condition = 40; });
    const cansado = F.forcaDaCpu(id, club, xi);
    xi.forEach((p, i) => { p.condition = antes[i]; });
    return { descansado: [descansado.atk, descansado.def], cansado: [cansado.atk, cansado.def] };`);
  check("3) O mesmo XI cansado (condição 40) ataca menos e defende pior:",
    r3.cansado[0] < r3.descansado[0] && r3.cansado[1] > r3.descansado[1], JSON.stringify(r3));

  // 4) Expulso ao vivo: a vaga conta (o peso vem de partida.comExpulsoes).
  const r4 = ler(`${CLUBE}
    const xi = F.xiDaCpu(id, r);
    const cheio = F.forcaDaCpu(id, club, xi);
    const dez = F.forcaDaCpu(id, club, xi.slice(0, 10), 1);
    const semContar = F.forcaDaCpu(id, club, xi.slice(0, 10), 0);
    return { cheio: cheio.atk, dez: dez.atk, semContar: semContar.atk };`);
  check("4) Expulso da CPU ao vivo conta na vaga (sem o desconto de time incompleto em dobro):",
    Math.abs(r4.dez - r4.cheio) < Math.abs(r4.semContar - r4.cheio) && r4.semContar < r4.cheio, JSON.stringify(r4));

  // 5) Condição depois de algumas rodadas.
  for (let n = 0; n < 4; n++) { const x = await jogarRodada(pg.P); if (!x.ok) throw new Error("rodada: " + x.passos.join(" ")); }
  const r5 = ler(`${CLUBE}
    const av = (l) => l.reduce((s, p) => s + (p.condition == null ? 100 : p.condition), 0) / l.length;
    const meus = C.lineup.starters.map((x) => C.squad.find((p) => p.id === x)).filter(Boolean);
    return { rodada: r, cpuXI: av(F.xiDaCpu(id, r)), seuXI: av(meus) };`);
  check("5) Depois de 4 rodadas, os titulares dos dois lados entram em campo entre 60 e 100 de condição (sem recuperação indevida e sem piso):",
    r5.cpuXI >= 60 && r5.cpuXI < 100 && r5.seuXI >= 60 && r5.seuXI < 100, JSON.stringify(r5));

  // 6) Regra desligada.
  const r6 = ler(`${CLUBE}
    E.PARIDADE_CPU.forca = false;
    try { const f = F.forcaDaCpu(id, club, F.xiDaCpu(id, r)); const c = E.forcaDeJogo(club); return { igual: f.atk === c.atk && f.def === c.def }; }
    finally { E.PARIDADE_CPU.forca = true; }`);
  check("6) Regra desligada (só os testes de equivalência): a força do clube, como antes:", r6.igual, JSON.stringify(r6));

  console.log("OK");
  process.exit(0);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
