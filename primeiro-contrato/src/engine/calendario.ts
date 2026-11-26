// Calendário, placares e classificação da liga (PC-002). Uma única fonte:
// o placar de cada jogo da rodada sai daqui, e a linha do tempo, as
// estatísticas do atleta e a classificação usam esse mesmo resultado.
// Determinístico por (semente, ano, liga, rodada); nada daqui depende da
// reprodução na tela.
import { forcaClube, type Catalogo, type Liga } from "./catalogo.ts";
import { rngFrom, type Rng } from "./rng.ts";

export type Confronto = { mandante: string; visitante: string };
export type ResultadoJogo = Confronto & { golsMandante: number; golsVisitante: number };

/**
 * Clubes que disputam a temporada. Formato verificado: todos os inscritos
 * da liga. Temporada simplificada: um grupo simulado do tamanho do
 * calendário, com o clube do atleta (identificado na interface).
 */
export function participantes(cat: Catalogo, liga: Liga | undefined, clubeId: string, jogosTotal: number, semente: string, ano: number): string[] {
  const todos = liga ? cat.clubesDaLiga(liga.id).map((c) => c.id) : [];
  if (!todos.includes(clubeId)) todos.push(clubeId);
  const verificado = !!liga?.rodadas;
  let alvo = verificado ? todos.length : Math.min(todos.length, Math.floor(jogosTotal / 2) + 1);
  if (alvo % 2 === 1) alvo -= 1;
  if (alvo >= todos.length) return todos;
  const r = rngFrom(semente, "grupo", ano, liga?.id ?? "", clubeId);
  const outros = todos.filter((id) => id !== clubeId).map((id) => ({ id, s: r.next() })).sort((a, b) => a.s - b.s).map((x) => x.id);
  return [clubeId, ...outros.slice(0, alvo - 1)];
}

/** Rodízio pelo método do círculo, em turno e returno (repetido até cobrir
 *  as rodadas). A ordem inicial é sorteada pela semente. */
export function rodizio(ids: readonly string[], rodadas: number, r: Rng): Confronto[][] {
  const n = ids.length;
  const base = ids.map((id) => ({ id, s: r.next() })).sort((a, b) => a.s - b.s).map((x) => x.id);
  const turno: Confronto[][] = [];
  const roda = base.slice(1);
  for (let k = 0; k < n - 1; k++) {
    const lista = [base[0], ...roda];
    const rod: Confronto[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = lista[i], b = lista[n - 1 - i];
      rod.push((k + i) % 2 === 0 ? { mandante: a, visitante: b } : { mandante: b, visitante: a });
    }
    turno.push(rod);
    roda.unshift(roda.pop()!);
  }
  const out: Confronto[][] = [];
  for (let ciclo = 0; out.length < rodadas; ciclo++) {
    for (const rod of turno) {
      if (out.length >= rodadas) break;
      out.push(ciclo % 2 === 0 ? rod : rod.map((c) => ({ mandante: c.visitante, visitante: c.mandante })));
    }
  }
  return out;
}

function poisson(r: Rng, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= r.next(); } while (p > L && k < 10);
  return k - 1;
}

/** Placar pelo perfil de ataque/defesa do catálogo e pela força relativa. */
export function placar(cat: Catalogo, c: Confronto, r: Rng): ResultadoJogo {
  const m = cat.clube(c.mandante), v = cat.clube(c.visitante);
  const dif = (forcaClube(cat, c.mandante) - forcaClube(cat, c.visitante)) / 25;
  const lm = 1.38 * (m?.atk ?? 1) * (v?.def ?? 1) * Math.exp(dif);
  const lv = 1.08 * (v?.atk ?? 1) * (m?.def ?? 1) * Math.exp(-dif);
  return { ...c, golsMandante: poisson(r, Math.min(lm, 4)), golsVisitante: poisson(r, Math.min(lv, 4)) };
}

export type Calendario = { ano: number; ligaId: string; participantes: string[]; rodadas: Confronto[][] };

export function montarCalendario(cat: Catalogo, semente: string, ano: number, ligaId: string, ids: string[], jogosTotal: number): Calendario {
  return { ano, ligaId, participantes: ids, rodadas: rodizio(ids, jogosTotal, rngFrom(semente, "calendario", ano, ligaId, ids.join(","))) };
}

/** Todos os resultados da rodada (índice 0..). */
export function resultadosDaRodada(cat: Catalogo, semente: string, cal: Calendario, rodada: number): ResultadoJogo[] {
  return (cal.rodadas[rodada] ?? []).map((c) => placar(cat, c, rngFrom(semente, "placar", cal.ano, cal.ligaId, rodada, c.mandante, c.visitante)));
}

export type LinhaTabela = { clubeId: string; j: number; v: number; e: number; d: number; gp: number; gc: number; pts: number };

/** Classificação depois de `ate` rodadas, da mesma fonte dos placares. */
export function classificacao(cat: Catalogo, semente: string, cal: Calendario, ate: number): LinhaTabela[] {
  const t = new Map<string, LinhaTabela>(cal.participantes.map((id) => [id, { clubeId: id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 }]));
  for (let i = 0; i < Math.min(ate, cal.rodadas.length); i++) {
    for (const r of resultadosDaRodada(cat, semente, cal, i)) {
      const a = t.get(r.mandante)!, b = t.get(r.visitante)!;
      a.j++; b.j++;
      a.gp += r.golsMandante; a.gc += r.golsVisitante; b.gp += r.golsVisitante; b.gc += r.golsMandante;
      if (r.golsMandante > r.golsVisitante) { a.v++; b.d++; a.pts += 3; }
      else if (r.golsMandante < r.golsVisitante) { b.v++; a.d++; b.pts += 3; }
      else { a.e++; b.e++; a.pts++; b.pts++; }
    }
  }
  return [...t.values()].sort((x, y) => y.pts - x.pts || (y.gp - y.gc) - (x.gp - x.gc) || y.gp - x.gp || x.clubeId.localeCompare(y.clubeId));
}

/** Jogo do clube na rodada, do ponto de vista dele. */
export function jogoDoClube(cat: Catalogo, semente: string, cal: Calendario, rodada: number, clubeId: string) {
  const r = resultadosDaRodada(cat, semente, cal, rodada).find((x) => x.mandante === clubeId || x.visitante === clubeId);
  if (!r) return null;
  const mandante = r.mandante === clubeId;
  return {
    adversarioId: mandante ? r.visitante : r.mandante, mandante,
    golsPro: mandante ? r.golsMandante : r.golsVisitante, golsContra: mandante ? r.golsVisitante : r.golsMandante,
  };
}
