// Simulação temporária (não versionar): carreira real pelo motor, placares do seu time.
const { abrirPagina, jogarRodada } = require("../_sem_tela");
(async () => {
  const [comp = "serie_b", idx = "0", rodadas = "40"] = process.argv.slice(2);
  const pg = await abrirPagina();
  const P = pg.P; if (!pg.pronta) throw new Error("ponte não ficou pronta");
  const c = await P.escolherCompeticao(comp);
  const clube = c.clubes.find((x) => x.id === idx) || c.clubes[Number(idx)];
  await P.criarCarreira(clube.id);
  const placares = [];
  const enc = P.encerrarPosJogo.bind(P);
  P.encerrarPosJogo = (...a) => { const e = P.estado(); if (e && e.contexto === "liga") placares.push(e.souMandante ? [e.gh, e.ga] : [e.ga, e.gh]); return enc(...a); };
  for (let n = 0; n < Number(rodadas); n++) { const r = await jogarRodada(P); if (!r.ok && n > 3 && r.passos.some((p) => /fim-de-temporada|temporada/.test(p))) break; }
  const save = (await pg.api("/api/career")).career;
  const raw = save.standings; const st = Array.isArray(raw) ? raw : Object.values(raw || {});
  const jogos = st.reduce((s, r) => s + (r.j || 0), 0) / 2, gols = st.reduce((s, r) => s + (r.gp || 0), 0);
  console.log(JSON.stringify({ comp, clube: clube.nome, placares, liga: { jogos, golsPorJogo: jogos ? +(gols / jogos).toFixed(2) : null }, chaves: Array.isArray(raw) ? "array" : Object.keys(raw || {}) }));
  process.exit(0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
