// Relações da carreira (PC-003): planos do técnico, compromissos da
// diretoria, torcida, declarações e manchetes. Funções puras sobre o save
// (mutam o objeto recebido; quem clona é a API de carreira.ts).
import type { Carreira, ChaveCriterio, Compromisso, Declaracao, Partida, Plano, Temporada, TorcidaClube } from "./estado.ts";
import { POS, type Posicao } from "./posicoes.ts";
import { clamp } from "./rng.ts";

export const JANELA_PLANO = 4; // partidas elegíveis (calibração inicial do handoff)
export const MINUTOS_MINIMOS = 120; // abaixo disso a amostra é insuficiente

/** Meta compreensível por função, normalizada por 90 minutos. Nunca exige
 *  gols de defensores. */
export function criterioDaFuncao(f: Posicao): Plano["criterio"] {
  const setor = POS[f].setor;
  if (setor === "GOL") return { chave: "defesas", alvo90: 2.2, rotulo: "defesas por 90 min" };
  if (f === "MEI") return { chave: "criacao", alvo90: 1.6, rotulo: "passes decisivos e assistências por 90 min" };
  if (f === "PE" || f === "PD") return { chave: "participacao", alvo90: 1.5, rotulo: "passes decisivos, assistências e gols por 90 min" };
  if (f === "CA") return { chave: "golsAssist", alvo90: 0.45, rotulo: "gols e assistências por 90 min" };
  const alvo = f === "LD" || f === "LE" ? 2.4 : 3.2;
  return { chave: "defensivas", alvo90: alvo, rotulo: "desarmes e interceptações por 90 min" };
}

export function valorCriterio(p: Partida, chave: ChaveCriterio): number {
  const passes = p.passes ?? 0, inter = p.intercept ?? 0;
  if (chave === "defesas") return p.defesas;
  if (chave === "defensivas") return p.desarmes + inter;
  if (chave === "criacao") return passes + p.assistencias;
  if (chave === "participacao") return passes + p.assistencias + p.gols;
  return p.gols + p.assistencias;
}

export function planoAtivo(c: Carreira): Plano | undefined {
  return c.planos.find((p) => p.estado === "ativo");
}

/** Cria um plano (encerra o ativo anterior, que foi substituído). */
export function criarPlano(c: Carreira, t: Temporada, tipo: Plano["tipo"], funcao: Posicao, origem: string): Plano {
  for (const p of c.planos) if (p.estado === "ativo") { p.estado = "encerrado"; p.resultado = { jogos: 0, minutos: 0, valor90: 0, texto: "Substituído por um plano novo." }; }
  const plano: Plano = {
    id: `${origem}:plano`, clubeId: t.clubeId, ano: t.ano, origem, tipo, funcao, criterio: criterioDaFuncao(funcao),
    inicio: t.jogoAtual, partidas: JANELA_PLANO, estado: "ativo", resultado: null,
  };
  c.planos.push(plano);
  return plano;
}

/** Partidas elegíveis da janela (o atleta estava disponível). */
export function janelaDoPlano(t: Temporada, p: Plano): Partida[] {
  return t.partidas.filter((x) => x.rodada - 1 >= p.inicio && x.situacao !== "indisponivel").slice(0, p.partidas);
}

export function planoCompleto(t: Temporada, p: Plano): boolean {
  if (p.estado !== "ativo" || p.ano !== t.ano || p.clubeId !== t.clubeId) return false;
  return janelaDoPlano(t, p).length >= p.partidas;
}

/** Devolutiva com os jogos da janela. Não penaliza amostra insuficiente. */
export function avaliarPlano(t: Temporada, p: Plano): NonNullable<Plano["resultado"]> & { estado: Plano["estado"] } {
  const js = janelaDoPlano(t, p);
  const minutos = js.reduce((s, x) => s + x.minutos, 0);
  const total = js.reduce((s, x) => s + valorCriterio(x, p.criterio.chave), 0);
  const valor90 = minutos ? Math.round((total / minutos) * 90 * 100) / 100 : 0;
  const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const rodadas = js.length ? `rodadas ${js[0].rodada}–${js[js.length - 1].rodada}` : "sem jogos";
  if (minutos < MINUTOS_MINIMOS) {
    return { jogos: js.length, minutos, valor90, estado: "amostraInsuficiente",
      texto: `Amostra insuficiente: ${minutos} min em ${js.length} jogos elegíveis (${rodadas}). O plano pode ser revisto sem penalização.` };
  }
  const atingiu = valor90 >= p.criterio.alvo90;
  return { jogos: js.length, minutos, valor90, estado: atingiu ? "atingido" : "naoAtingido",
    texto: `Nos ${js.length} jogos da janela (${rodadas}): ${minutos} min e ${fmt(valor90)} ${p.criterio.rotulo} (meta ${fmt(p.criterio.alvo90)}).` };
}

// ─────────────────────────────── compromissos ───────────────────────────────

export function compromissoAtivo(c: Carreira, clubeId: string, ano: number): Compromisso | undefined {
  return c.compromissos.find((x) => x.estado === "ativo" && x.clubeId === clubeId && x.ano === ano && x.tipo === "revisaoPapel");
}

/** Encerra compromissos que não se aplicam mais (mudança de clube etc.). */
export function encerrarCompromissos(c: Carreira, filtro: (x: Compromisso) => boolean, motivo: string) {
  for (const x of c.compromissos) if (x.estado === "ativo" && filtro(x)) { x.estado = "encerrado"; x.motivo = motivo; }
}

// ───────────────────────────────── torcida ─────────────────────────────────

export function torcidaDe(c: Carreira, clubeId: string, ano: number): TorcidaClube {
  let t = c.torcida[clubeId];
  if (!t) { t = { identificacao: 10, jogos: 0, marcantes: 0, temporadas: 0, saida: null, ultimoAno: ano }; c.torcida[clubeId] = t; }
  return t;
}

export function ajustarIdentificacao(c: Carreira, clubeId: string, ano: number, delta: number) {
  const t = torcidaDe(c, clubeId, ano);
  t.identificacao = Math.round(clamp(t.identificacao + delta, 0, 100) * 10) / 10;
  t.ultimoAno = ano;
}

/** Recepção no estádio do ex-clube, pela passagem e pela saída. */
export function recepcaoNoReencontro(t: TorcidaClube): "aplausos" | "vaias" | "dividida" {
  if (t.saida === "ruim" || t.identificacao < 20) return "vaias";
  if ((t.identificacao >= 50 && t.saida === "boa") || t.identificacao >= 65) return "aplausos";
  return "dividida";
}

// ─────────────────────────── declarações e manchetes ───────────────────────────

export function declarar(c: Carreira, d: Omit<Declaracao, "id" | "reapareceu">) {
  c.declaracoes.push({ ...d, id: `${d.origem}:declaracao`, reapareceu: false });
}

export function manchete(c: Carreira, ano: number, rodada: number | null, clubeId: string, texto: string, tom: -1 | 0 | 1) {
  c.manchetes.push({ ano, rodada, clubeId, texto, tom });
  if (c.manchetes.length > 60) c.manchetes.splice(0, c.manchetes.length - 60);
}

// ─────────────────────────────── fatos da temporada ───────────────────────────────

/** Rodada em que o atleta ganhou (ou perdeu) a vaga: começa uma sequência de
 *  4 titularidades em 5 jogos (ou sai dela). */
export function rodadaDaVaga(partidas: readonly Partida[], tipo: "ganhou" | "perdeu"): number | null {
  const tit = partidas.map((p) => p.situacao === "titular");
  const seq = (i: number) => tit.slice(i, i + 5).filter(Boolean).length >= 4;
  if (tipo === "ganhou") {
    for (let i = 0; i + 5 <= tit.length; i++) if (seq(i) && (i === 0 ? false : !seq(i - 1)) && tit[i]) return partidas[i].rodada;
    return null;
  }
  let antes = false;
  for (let i = 0; i + 5 <= tit.length; i++) {
    if (seq(i)) antes = true;
    else if (antes && !seq(i)) return partidas[i].rodada;
  }
  return null;
}

