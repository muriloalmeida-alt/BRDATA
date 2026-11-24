/* ===================================================================
   MOTOR — DESEMPATE (MUNDO-001, etapa M3, 24/11/2026)
   -------------------------------------------------------------------
   Classificação de uma liga pelos critérios do regulamento (perfis em
   mundo.json, `perfisDesempate`, e regras de cada liga). Módulo puro: a
   tabela, os resultados e a disciplina chegam por parâmetro.

   - Pontos primeiro; depois os critérios do perfil, em ordem, até separar
     os empatados. Cada critério parte o grupo empatado em subgrupos; os
     critérios de confronto direto usam a minitabela SÓ dos clubes daquele
     subgrupo (empate múltiplo: todos contra todos dentro do grupo).
   - Perfis por tamanho do empate: na Espanha, 2 clubes usam `spainTwo` e 3
     ou mais usam `spainMulti` (regras.multiClubTable).
   - "...ForDecisivePositions": o critério só vale se o grupo empatado
     disputa uma posição decisiva (título, acesso, playoff, queda).
   - Confronto direto "só depois dos dois jogos" (Alemanha e França, e a
     opção h2hSoComTurnoCompleto): sem todos os jogos entre os empatados,
     os critérios de confronto direto não separam ninguém.
   - Fim da lista (jogo neutro, sorteio): sorteio determinístico pela chave
     recebida. Empate em posição decisiva resolvido assim é devolvido em
     `sorteios`, para a tela explicar (CLAUDE.md, seção 45). Jogos de
     decisão previstos pelo regulamento (Itália) são criados pelas fases
     (fases.js), não aqui.
=================================================================== */

// Linha: { id, j, v, e, d, gp, gc, pts } (tabela.js) e, se houver,
// disc (pontos disciplinares: amarelo 1, vermelho 3) e vd (vermelhos diretos).
// Resultado: { home, away, gh, ga }.

function pontosDe(r) {
  return r.pts != null ? r.pts : (r.v || 0) * 3 + (r.e || 0);
}

// Minitabela dos clubes `ids` com os jogos entre eles.
function minitabela(ids, resultados) {
  const set = new Set(ids.map(String));
  const t = Object.fromEntries([...set].map((id) => [id, { pts: 0, gp: 0, gc: 0, gpFora: 0, jogos: 0 }]));
  for (const r of resultados) {
    const h = String(r.home), a = String(r.away);
    if (!set.has(h) || !set.has(a)) continue;
    const H = t[h], A = t[a];
    H.jogos++; A.jogos++;
    H.gp += r.gh; H.gc += r.ga; A.gp += r.ga; A.gc += r.gh;
    A.gpFora += r.ga;
    if (r.gh > r.ga) H.pts += 3; else if (r.gh < r.ga) A.pts += 3; else { H.pts++; A.pts++; }
  }
  return t;
}

function golsForaTotais(resultados) {
  const out = {};
  for (const r of resultados) out[String(r.away)] = (out[String(r.away)] || 0) + r.ga;
  return out;
}

const NOMES_H2H = new Set(["headToHeadPoints", "headToHeadGoalDifference", "headToHeadGoalsFor", "headToHeadAwayGoals", "headToHeadAggregate"]);

// Valor de um critério para um clube (maior é melhor). null = o critério
// não se aplica (não separa ninguém).
function valorDoCriterio(nome, linha, ctx) {
  const base = nome.replace(/ForDecisivePositions$/, "");
  switch (base) {
    case "goalDifference": return linha.gp - linha.gc;
    case "goalsFor": return linha.gp;
    case "wins": return linha.v || 0;
    case "awayGoals": return ctx.golsFora[String(linha.id)] || 0;
    case "fairPlay":
    case "disciplinePointsAfter42Matches": return -(linha.disc || 0); // menos pontos é melhor
    case "straightRedOffences": return -(linha.vd || 0);
    case "headToHeadPoints": return ctx.mini[String(linha.id)].pts;
    case "headToHeadGoalDifference":
    case "headToHeadAggregate": { const m = ctx.mini[String(linha.id)]; return m.gp - m.gc; }
    case "headToHeadGoalsFor": return ctx.mini[String(linha.id)].gp;
    case "headToHeadAwayGoals": return ctx.mini[String(linha.id)].gpFora;
    default: return null; // neutralDecider, drawLots, deciderIfRequired: sorteio no fim
  }
}

// Sorteio determinístico (mulberry32 pela chave).
export function rngDaChave(chave) {
  let h = 2166136261;
  for (const c of String(chave)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Ordena um grupo empatado em pontos a partir da posição `inicio` (1 = 1º).
function ordenarGrupo(grupo, inicio, opts, saida) {
  if (grupo.length === 1) return grupo;
  const perfil = grupo.length >= 3 && opts.perfilMulti ? opts.perfilMulti : opts.perfil;
  const fim = inicio + grupo.length - 1;
  const decisiva = (opts.posicoesDecisivas || []).some((p) => p >= inicio && p <= fim);
  const ids = grupo.map((l) => l.id);
  const mini = minitabela(ids, opts.resultados);
  // Turno completo entre os empatados: cada par jogou ida e volta.
  const turnoCompleto = Object.values(mini).every((m) => m.jogos >= 2 * (grupo.length - 1));
  const ctx = { mini, golsFora: opts.golsFora };
  for (const nome of perfil) {
    if (/ForDecisivePositions$/.test(nome) && !decisiva) continue;
    if (NOMES_H2H.has(nome.replace(/ForDecisivePositions$/, "")) && opts.h2hSoComTurnoCompleto && !turnoCompleto) continue;
    const vals = grupo.map((l) => valorDoCriterio(nome, l, ctx));
    if (vals.some((v) => v == null)) continue;
    if (new Set(vals).size === 1) continue;
    // Parte o grupo por valor (maior primeiro) e ordena cada parte de novo,
    // com os critérios desde o início, só entre quem continua empatado.
    const porValor = new Map();
    grupo.forEach((l, i) => { if (!porValor.has(vals[i])) porValor.set(vals[i], []); porValor.get(vals[i]).push(l); });
    const partes = [...porValor.entries()].sort((a, b) => b[0] - a[0]).map(([, ls]) => ls);
    const out = [];
    let pos = inicio;
    for (const p of partes) { out.push(...ordenarGrupo(p, pos, opts, saida)); pos += p.length; }
    return out;
  }
  // Ninguém separou: sorteio determinístico.
  const rng = rngDaChave(`${opts.chaveSorteio}:${ids.map(String).sort().join(",")}`);
  const sorteado = grupo.map((l) => ({ l, k: rng() })).sort((a, b) => a.k - b.k).map((x) => x.l);
  if (decisiva) saida.sorteios.push({ ids: sorteado.map((l) => l.id), posicoes: [inicio, fim] });
  return sorteado;
}

// Classificação completa. opts:
//   perfil: lista de critérios (ex.: perfisDesempate.premier);
//   perfilMulti: perfil para 3+ empatados (Espanha);
//   resultados: jogos da fase ({ home, away, gh, ga });
//   posicoesDecisivas: posições (1 = 1º) onde o empate decide algo;
//   h2hSoComTurnoCompleto: confronto direto só com ida e volta jogadas;
//   chaveSorteio: chave do sorteio final (liga e temporada).
// Devolve { ordem: [linhas], sorteios: [{ ids, posicoes }] }.
export function classificar(linhas, opts = {}) {
  const o = {
    perfil: opts.perfil || ["goalDifference", "goalsFor"],
    perfilMulti: opts.perfilMulti || null,
    resultados: opts.resultados || [],
    posicoesDecisivas: opts.posicoesDecisivas || [],
    h2hSoComTurnoCompleto: !!opts.h2hSoComTurnoCompleto,
    chaveSorteio: opts.chaveSorteio || "desempate",
  };
  o.golsFora = golsForaTotais(o.resultados);
  const saida = { sorteios: [] };
  const porPontos = new Map();
  for (const l of linhas) {
    const p = pontosDe(l);
    if (!porPontos.has(p)) porPontos.set(p, []);
    porPontos.get(p).push(l);
  }
  const ordem = [];
  let pos = 1;
  for (const [, grupo] of [...porPontos.entries()].sort((a, b) => b[0] - a[0])) {
    // Ordem de entrada estável antes dos critérios (o sorteio não depende dela).
    grupo.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    ordem.push(...ordenarGrupo(grupo, pos, o, saida));
    pos += grupo.length;
  }
  return { ordem, sorteios: saida.sorteios };
}

// Posições decisivas de uma liga europeia pelo regulamento do pacote:
// título, acesso direto, playoff, playout, decisão e queda (as fronteiras).
export function posicoesDecisivasDe(regras, clubes) {
  const s = new Set([1]);
  const fronteira = (lista) => { if (lista && lista.length) { s.add(Math.min(...lista) - 1); s.add(Math.min(...lista)); s.add(Math.max(...lista)); s.add(Math.max(...lista) + 1); } };
  fronteira(regras.down);
  fronteira(regras.up);
  if (regras.promotionPlayoff) fronteira(regras.promotionPlayoff.positions);
  if (regras.relegationPlayout) fronteira(regras.relegationPlayout.positions);
  if (regras.interDivisionPlayoff) s.add(regras.interDivisionPlayoff.upperPosition);
  for (const d of regras.decisionMatches || []) d.positions.forEach((p) => s.add(p));
  return [...s].filter((p) => p >= 1 && p <= clubes).sort((a, b) => a - b);
}

// Opções de classificar() para uma liga europeia do índice do mundo.
export function opcoesDaLiga(comp, perfisDesempate, resultados, chaveSorteio) {
  const r = comp.regras || {};
  return {
    perfil: perfisDesempate[r.table],
    perfilMulti: r.multiClubTable ? perfisDesempate[r.multiClubTable] : null,
    resultados,
    posicoesDecisivas: posicoesDecisivasDe(r, comp.clubes),
    // Alemanha e França: confronto direto só depois dos dois jogos.
    h2hSoComTurnoCompleto: r.table === "germany" || r.table === "france",
    chaveSorteio,
  };
}

