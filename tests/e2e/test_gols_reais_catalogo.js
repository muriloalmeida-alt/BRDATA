// GOLS-REAIS (17/11/2026) — nível de gols dos campeonatos com dados reais.
// Perfil de servidor "frozen" (catálogo real congelado). Sem navegador, pela
// ponte (_sem_tela.js):
//  1) Carreira nova nasce na versão 2 do save, com o nível de gols de cada
//     campeonato em modo real (o do catálogo congelado) e nenhum nos de
//     Modo Exemplo.
//  2) Save antigo (versão 1, sem nível) migra ao abrir: ganha o mesmo nível;
//     a força gravada dos clubes não muda.
//  3) A rodada seguinte joga e grava o save migrado (versão 2, com o nível).
const { check } = require("./_check");
const { abrirPagina, jogarRodada } = require("./_sem_tela");

const NIVEL = { brasileirao: 1.115, serie_b: 1.036, serie_c: 1.034 };

(async () => {
  const pg = await abrirPagina();
  if (!pg.pronta) throw new Error("ponte não ficou pronta");
  const comp = await pg.P.escolherCompeticao("brasileirao");
  await pg.P.criarCarreira(comp.clubes[0].id);
  const s1 = (await pg.api("/api/career")).career;
  const reais = Object.keys(s1.liveModeByCompetition || {}).filter((c) => s1.liveModeByCompetition[c] === true);
  const esperado = Object.fromEntries(reais.map((c) => [c, NIVEL[c]]));
  check("1) Carreira nova: versão 2 do save e nível de gols dos campeonatos com dados reais (o do catálogo):",
    s1.schemaVersion === 2 && reais.includes("brasileirao") && JSON.stringify(s1.nivelGols) === JSON.stringify(esperado),
    JSON.stringify({ versao: s1.schemaVersion, modos: s1.liveModeByCompetition, nivelGols: s1.nivelGols }));

  // 2) Save antigo: versão 1, sem nível.
  const antigo = JSON.parse(JSON.stringify(s1));
  antigo.schemaVersion = 1;
  delete antigo.nivelGols;
  const forcaAntes = JSON.stringify(Object.values(antigo.divisionTeams || {}).flat().map((t) => [t.id, t.atk, t.def]));
  const put = await fetch(`${require("./_sem_tela").base}/api/career`, {
    method: "PUT", headers: { "Content-Type": "application/json", cookie: [...pg.sessao.cookies].map(([k, v]) => `${k}=${v}`).join("; ") }, body: JSON.stringify(antigo),
  });
  const pg2 = await abrirPagina({ sessao: pg.sessao });
  const mem = JSON.parse(pg2.rodar("JSON.stringify((() => { const c = window.BRDATA_MOTOR.estado.carreiraAtual(); return { v: c.schemaVersion, n: c.nivelGols, f: Object.values(c.divisionTeams || {}).flat().map((t) => [t.id, t.atk, t.def]) }; })())", "ler"));
  check("2) Save antigo migra ao abrir: versão 2, o mesmo nível de gols e a força gravada dos clubes igual:",
    put.ok && pg2.pronta && mem.v === 2 && JSON.stringify(mem.n) === JSON.stringify(esperado) && JSON.stringify(mem.f) === forcaAntes,
    JSON.stringify({ put: put.status, versao: mem.v, nivelGols: mem.n, forcaIgual: JSON.stringify(mem.f) === forcaAntes }));

  // 3) A rodada seguinte joga e grava o save migrado.
  const r = await jogarRodada(pg2.P);
  const s3 = (await pg2.api("/api/career")).career;
  check("3) A rodada seguinte joga e grava o save migrado (versão 2, com o nível):",
    r.ok && s3.schemaVersion === 2 && JSON.stringify(s3.nivelGols) === JSON.stringify(esperado) && s3.currentRound > s1.currentRound,
    JSON.stringify({ passos: r.passos, versao: s3.schemaVersion, nivelGols: s3.nivelGols, rodada: [s1.currentRound, s3.currentRound] }));

  console.log("OK");
  process.exit(0);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
