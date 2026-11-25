/* ===================================================================
   MOTOR — VISÃO DAS COPAS CONTINENTAIS PARA AS TELAS (MUNDO-001, M10c)
   -------------------------------------------------------------------
   Só leitura: monta, a partir das edições no save (copasmundo.js e
   copasuefa.js), o que a v2 mostra na tela das copas (MUN-15: "chaves e
   grupos continentais"):
   - por confederação, a edição em andamento (ou a última encerrada) e os
     campeões anteriores;
   - por copa, as fases criadas: grupos (tabela por grupo), fase de liga
     (tabela com as faixas de oitavas, playoff e eliminação) e mata-mata
     (confrontos com os placares, o agregado e quem passou);
   - o clube do técnico marcado em tudo.
   A ordem dos grupos aqui é de exibição (pontos, saldo, gols); quem passa
   de fase é decidido pelo motor das copas, com os critérios do pacote.
=================================================================== */
import { ganchosMundo, todosTimes } from "./estado.js";
import { indiceDoMundo } from "./carreiramundo.js";
import * as Copas from "./copasmundo.js";
import * as CopasUefa from "./copasuefa.js";
import * as U from "./uefa.js";

const S = (x) => String(x);
const NOMES = { LIB: "Libertadores", SUD: "Sul-Americana", UCL: "Champions League", UEL: "Europa League", UECL: "Conference League" };
const FASES = {
  fase_1: "Fase 1", fase_2: "Fase 2", fase_3: "Fase 3", primeira_fase: "1ª fase", grupos: "Fase de grupos", playoff: "Playoff",
  Q3: "3ª pré-eliminatória", PO: "Playoff de qualificação", liga: "Fase de liga", playoff_mata_mata: "Playoff",
  oitavas: "Oitavas de final", quartas: "Quartas de final", semifinal: "Semifinal", final: "Final",
};
const ORDEM_FASES = ["fase_1", "fase_2", "fase_3", "primeira_fase", "Q3", "PO", "grupos", "liga", "playoff", "playoff_mata_mata", "oitavas", "quartas", "semifinal", "final"];

function clube(CAREER, indice, id) {
  const t = todosTimes().find((x) => S(x.id) === S(id));
  const info = Copas.clubeNoIndice(indice).get(S(id));
  const ext = CAREER.exterior && CAREER.exterior.clubes[S(id)];
  return {
    id: S(id),
    nome: t ? t.name : ext ? ext.name : info ? info.c.nome : S(id),
    sigla: t ? t.short || null : info ? info.c.sigla || null : null,
    escudo: t ? t.logo || null : info ? info.c.escudo || info.c.logoOrigem || null : null,
    meu: S(id) === S(CAREER.clubId),
  };
}

function tabelaDeGrupo(plano, copa, grupo, ids) {
  const l = new Map(ids.map((id) => [S(id), { id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 }]));
  for (const j of plano.jogos) {
    if (j.copa !== copa || j.fase !== "grupos" || j.grupo !== grupo || j.gh == null) continue;
    const h = l.get(S(j.casa)), a = l.get(S(j.fora));
    if (!h || !a) continue;
    h.j++; a.j++; h.gp += j.gh; h.gc += j.ga; a.gp += j.ga; a.gc += j.gh;
    if (j.gh > j.ga) { h.v++; h.pts += 3; a.d++; } else if (j.gh < j.ga) { a.v++; a.pts += 3; h.d++; } else { h.e++; a.e++; h.pts++; a.pts++; }
  }
  return [...l.values()].map((x) => ({ ...x, sg: x.gp - x.gc })).sort((x, y) => y.pts - x.pts || y.sg - x.sg || y.gp - x.gp || S(x.id).localeCompare(S(y.id)));
}

function duelo(CAREER, indice, c) {
  const placares = c.placares.map((p) => ({ casa: S(p.casa), fora: S(p.fora), gh: p.gh, ga: p.ga }));
  const gols = { [S(c.a)]: 0, [S(c.b)]: 0 };
  for (const p of c.placares) { gols[S(p.casa)] += p.gh; gols[S(p.fora)] += p.ga; }
  if (c.extra && c.extra.prorrogacao && c.placares.length) {
    const u = c.placares[c.placares.length - 1];
    gols[S(u.casa)] += c.extra.prorrogacao.gh; gols[S(u.fora)] += c.extra.prorrogacao.ga;
  }
  return {
    id: c.id, a: clube(CAREER, indice, c.a), b: clube(CAREER, indice, c.b), pernas: c.pernas, neutro: !!c.neutro,
    placares, agregado: c.placares.length ? { a: gols[S(c.a)], b: gols[S(c.b)] } : null,
    vencedor: c.vencedor != null ? S(c.vencedor) : null, como: c.como || null,
  };
}

function vistaDaCopa(CAREER, indice, plano, copa, confed) {
  const fases = [];
  const criadas = new Set(plano.jogos.filter((j) => j.copa === copa).map((j) => j.fase));
  for (const f of ORDEM_FASES) {
    if (!criadas.has(f)) continue;
    const base = { id: f, nome: FASES[f] || f };
    if (f === "grupos" && plano.grupos && plano.grupos[copa]) {
      fases.push({ ...base, tipo: "grupos", grupos: Object.entries(plano.grupos[copa]).map(([g, ids]) => ({
        grupo: g, linhas: tabelaDeGrupo(plano, copa, g, ids).map((x, i) => ({ pos: i + 1, ...clube(CAREER, indice, x.id), j: x.j, v: x.v, e: x.e, d: x.d, sg: x.sg, gp: x.gp, pts: x.pts })),
      })) });
      continue;
    }
    if (f === "liga" && confed === "UEFA") {
      fases.push({ ...base, tipo: "liga", rodadas: plano.regras[copa].liga.rodadas, linhas: U.tabelaDaLiga(plano, copa).map((x, i) => ({
        pos: i + 1, ...clube(CAREER, indice, x.id), j: x.j, v: x.v, e: x.e, d: x.d, sg: x.sg, gp: x.gp, pts: x.pts,
        faixa: i < 8 ? "oitavas" : i < 24 ? "playoff" : "fora",
      })) });
      continue;
    }
    fases.push({ ...base, tipo: "mata", duelos: plano.confrontos.filter((c) => c.copa === copa && c.etapa === f).map((c) => duelo(CAREER, indice, c)) });
  }
  const campeao = plano.resultado && plano.resultado.campeoes[copa] != null ? clube(CAREER, indice, plano.resultado.campeoes[copa]) : null;
  const meusJogos = plano.jogos.filter((j) => j.copa === copa && (S(j.casa) === S(CAREER.clubId) || S(j.fora) === S(CAREER.clubId)));
  return { id: copa, nome: NOMES[copa], fases, campeao, souParticipante: meusJogos.length > 0 };
}

// A visão inteira (null sem o mundo ou sem nenhuma edição no save).
export function vistaDasCopas(CAREER) {
  const indice = indiceDoMundo();
  if (!CAREER || !CAREER.copas || !indice) return null;
  const out = [];
  const conm = CAREER.copas.conmebol;
  if (conm && (conm.edicao || (conm.historico || []).length)) {
    const plano = Copas.edicaoAtual(CAREER, indice);
    out.push({
      confed: "CONMEBOL", ano: plano ? plano.ano : null, rotuloAno: plano ? String(plano.ano) : null,
      copas: plano ? ["LIB", "SUD"].map((c) => vistaDaCopa(CAREER, indice, plano, c, "CONMEBOL")) : [],
      historico: (conm.historico || []).slice().reverse().map((h) => ({ ano: String(h.ano), campeoes: ["LIB", "SUD"].map((c) => ({ copa: c, nome: NOMES[c], campeao: clube(CAREER, indice, h[c].campeao), vice: clube(CAREER, indice, h[c].vice) })) })),
      pendente: conm.pendente || null,
    });
  }
  const uefa = CAREER.copas.uefa;
  if (uefa && (uefa.edicao || (uefa.historico || []).length)) {
    const plano = CopasUefa.edicaoUefaAtual(CAREER, indice);
    const rot = (a) => `${a}/${String(a + 1).slice(2)}`;
    out.push({
      confed: "UEFA", ano: plano ? plano.ano : null, rotuloAno: plano ? rot(plano.ano) : null,
      copas: plano ? U.COPAS_UEFA.map((c) => vistaDaCopa(CAREER, indice, plano, c, "UEFA")) : [],
      historico: (uefa.historico || []).slice().reverse().map((h) => ({ ano: rot(h.ano), campeoes: U.COPAS_UEFA.map((c) => ({ copa: c, nome: NOMES[c], campeao: clube(CAREER, indice, h[c].campeao), vice: clube(CAREER, indice, h[c].vice) })) })),
      pendente: uefa.pendente || null,
    });
  }
  return out.length ? { confederacoes: out } : null;
}
ganchosMundo.vistaCopas = (CAREER) => vistaDasCopas(CAREER);
