/* ===================================================================
   MOTOR — TABELA (Fase 12, etapa 2 do plano de independência, 05/11)
   -------------------------------------------------------------------
   Tabela de pontos corridos, extraída de carreira.js sem mudar regra:
   linha zerada, aplicar um resultado, critério de classificação, posição
   e zonas de acesso/rebaixamento. Nada aqui lê CAREER, DOM ou save.
   As duas versões usam este módulo (decisão de 05/11): a anterior por
   window.BRDATA_MOTOR.tabela, a v2 importando no build.

   Critério (o de sempre): pontos → vitórias → saldo → gols pró. Empate
   em tudo NÃO tem critério final: fica a ordem em que os clubes estão
   guardados (Array.prototype.sort é estável). Decisão de 05/11: manter
   assim; um critério final (confronto direto, sorteio) é questão de
   balanceamento, para decidir depois.
=================================================================== */

export function emptyRow(id) {
  return { id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0 };
}
export function emptyStandings(ids) {
  const standings = {};
  ids.forEach((id) => { standings[id] = emptyRow(id); });
  return standings;
}

// Aplica um resultado ({home, away, gh, ga}) na tabela recebida, NO
// LUGAR (o jogo guarda referências às linhas). Clube fora da tabela:
// não faz nada.
export function applyResult(standings, r) {
  const H = standings[r.home], A = standings[r.away];
  if (!H || !A) return;
  H.j++; A.j++; H.gp += r.gh; H.gc += r.ga; A.gp += r.ga; A.gc += r.gh;
  if (r.gh > r.ga) { H.v++; H.pts += 3; A.d++; }
  else if (r.gh < r.ga) { A.v++; A.pts += 3; H.d++; }
  else { H.e++; A.e++; H.pts++; A.pts++; }
  H.sg = H.gp - H.gc; A.sg = A.gp - A.gc;
}

export function cloneStandings(standings) {
  const copy = {};
  Object.keys(standings).forEach((id) => { copy[id] = { ...standings[id] }; });
  return copy;
}

export function compareRows(a, b) {
  return (b.pts - a.pts) || (b.v - a.v) || (b.sg - a.sg) || (b.gp - a.gp);
}
// Linhas ordenadas (novo array; aceita a tabela-objeto ou uma lista).
export function sortRows(standingsOrRows) {
  const rows = Array.isArray(standingsOrRows) ? standingsOrRows.slice() : Object.values(standingsOrRows || {});
  return rows.sort(compareRows);
}
// Posição (1 = líder) do clube; 0 se não estiver na tabela.
export function positionOf(standingsOrRows, clubId) {
  return sortRows(standingsOrRows).findIndex((r) => String(r.id) === String(clubId)) + 1;
}

// Os n primeiros (acesso) de linhas já ordenadas.
export function accessZoneIds(sortedRows, n) {
  return sortedRows.slice(0, n).map((r) => String(r.id));
}
// Os n últimos (rebaixamento) de linhas já ordenadas. Se `protectedId`
// cair na zona (o clube do técnico na Série C, que não desce para a D),
// sai e entra o melhor colocado que ficaria de fora — a zona continua com n.
export function relegationZoneIds(sortedRows, n, protectedId) {
  const ids = sortedRows.map((r) => String(r.id));
  let zone = ids.slice(ids.length - n);
  if (protectedId != null && zone.includes(String(protectedId))) {
    zone = zone.filter((id) => id !== String(protectedId));
    zone.push(ids[ids.length - n - 1]);
  }
  return zone;
}
