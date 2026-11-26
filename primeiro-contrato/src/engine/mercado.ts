// Mercado da janela (PC-001, PROJETO.md regras 4 e 5). Propostas dependem de
// fase da carreira, posição, necessidade do clube, vínculo, taxa e orçamento.
// Valor, taxa, capacidade e minutos são simulações (estimativas).
import { nivelNaFuncao, type Atleta } from "./atleta.ts";
import { forcaClube, jogosDaTemporada, type Catalogo } from "./catalogo.ts";
import { gerarConcorrentes, intervaloMinutos, papelPorParticipacao, participacaoEsperada, principalConcorrente } from "./elenco.ts";
import type { Carreira, Oferta, TipoOferta } from "./estado.ts";
import { metricaPrincipal, POS, type Posicao } from "./posicoes.ts";
import { clamp, rngFrom } from "./rng.ts";

export const idadeEm = (a: Atleta, ano: number) => ano - a.anoNascimento;

/** Valor de mercado simulado (€ mi). */
export function valorMercado(a: Atleta, idade: number): number {
  const fIdade = idade <= 21 ? 1.6 : idade <= 24 ? 1.3 : idade <= 28 ? 1 : idade <= 31 ? 0.6 : 0.3;
  return 0.02 * Math.pow(1.16, a.nivel - 40) * fIdade * (1 + Math.max(0, a.potencial - a.nivel) / 40);
}

/** Capacidade de investimento simulada do clube (€ mi por operação). */
export function capacidadeClube(forca: number): number {
  return 0.03 * Math.pow(1.17, forca - 40);
}

/** Papel e previsão do atleta num clube, para a temporada `ano`. */
export function projetarPapel(cat: Catalogo, c: Carreira, clubeId: string, ano: number, funcao: Posicao = c.atleta.posicao) {
  const conc = gerarConcorrentes(cat, c.semente, clubeId, funcao, ano);
  // Em outro clube a confiança é neutra (a do clube atual não se transfere).
  const atual = (c.emprestimo?.clubeId ?? c.vinculo?.clubeId) === clubeId;
  const ef = nivelNaFuncao(atual ? c.atleta : { ...c.atleta, confianca: 0.5 }, funcao);
  const part = participacaoEsperada(ef, conc);
  const previsao = intervaloMinutos(part);
  const clube = cat.clube(clubeId);
  const { jogos } = jogosDaTemporada(clube && cat.liga(clube.ligaId));
  const mins = (p: number) => Math.round((p / 100) * jogos * 90 / 100) * 100;
  return { conc, part, previsao, papel: papelPorParticipacao(part), minutosPrevistos: [mins(previsao[0]), mins(previsao[1])] as [number, number] };
}

function montarOferta(cat: Catalogo, c: Carreira, tipo: TipoOferta, clubeId: string, anoNovo: number, duracao: number, motivo: string, taxa: number): Oferta {
  const p = projetarPapel(cat, c, clubeId, anoNovo);
  return {
    id: `${tipo}:${clubeId}:${anoNovo}`, tipo, clubeId, clubeNome: cat.clube(clubeId)?.nome ?? clubeId,
    papel: p.papel, previsao: p.previsao, minutosPrevistos: p.minutosPrevistos, duracao, motivo,
    taxa: Math.round(taxa * 100) / 100,
    ...(tipo === "emprestimo" ? { salarioDestino: forcaClube(cat, clubeId) >= 65 ? 1 : 0.5 } : {}),
  };
}

function motivoInteresse(cat: Catalogo, c: Carreira, clubeId: string, anoNovo: number): string {
  const a = c.atleta;
  const conc = gerarConcorrentes(cat, c.semente, clubeId, a.posicao, anoNovo);
  const top = principalConcorrente(conc);
  const ult = c.historico[c.historico.length - 1];
  const idade = idadeEm(a, anoNovo);
  const m = metricaPrincipal(a.posicao);
  const temporada = ult && ult.jogos > 0 ? `${ult.jogos} jogos${ult.stats[m.chave] ? `, ${ult.stats[m.chave]} ${m.rotulo.toLowerCase()}` : ""} e nota ${ult.media.toLocaleString("pt-BR")} em ${ult.ano}` : null;
  if (top && top.nivel < nivelNaFuncao({ ...a, confianca: 0.5 }, a.posicao)) return `Busca ${POS[a.posicao].nome.toLowerCase()}: o titular simulado tem nível ${top.nivel}.${temporada ? ` Viu seus ${temporada}.` : ""}`;
  if (temporada) return `Acompanhou seus ${temporada}.`;
  if (idade <= 21 && a.potencial - a.nivel >= 8) return "Aposta no seu potencial.";
  return "Quer reforçar a posição.";
}

/**
 * Propostas da janela que antecede a temporada `ano + 1`.
 * Regras: renovação quando o vínculo está no fim e o clube quer o atleta;
 * transferência só se a taxa cabe na capacidade do comprador; empréstimo só
 * com vínculo em vigor, vaga (papel Titular/Rotação) e orçamento no destino;
 * compra pelo clube do empréstimo quando a passagem foi boa.
 */
export function gerarOfertas(cat: Catalogo, c: Carreira): Oferta[] {
  const ano = c.ano;
  const anoNovo = ano + 1;
  const a = c.atleta;
  const idade = idadeEm(a, anoNovo);
  const r = rngFrom(c.semente, "janela", ano);
  const ult = c.historico[c.historico.length - 1];
  const part = ult?.participacao ?? 0;
  const vinc = c.vinculo;
  const restante = vinc ? vinc.fim - ano : 0;
  const clubeAtual = vinc?.clubeId ?? "";
  const ef = nivelNaFuncao(a, a.posicao);
  const valor = valorMercado(a, idade);
  const ofertas: Oferta[] = [];
  const usados = new Set<string>([clubeAtual]);

  // Compra pelo clube do empréstimo que terminou nesta temporada.
  if (ult?.emprestimo && ult.participacao >= 0.45 && restante >= 0) {
    const fDest = forcaClube(cat, ult.clubeId);
    const taxa = restante >= 1 ? valor : 0;
    if (taxa <= capacidadeClube(fDest) * 0.8) {
      ofertas.push(montarOferta(cat, c, "compra", ult.clubeId, anoNovo, 3, "Quer comprar você depois do empréstimo.", taxa));
      usados.add(ult.clubeId);
    }
  }

  // Renovação: o clube quer manter quem rende ou quem ainda tem margem.
  if (vinc && restante <= 1) {
    const f = forcaClube(cat, clubeAtual);
    const quer = ef >= f - 8 || (idade <= 22 && a.potencial >= f) || part >= 0.4;
    if (quer && idade < 40) {
      ofertas.push(montarOferta(cat, c, "renovacao", clubeAtual, anoNovo, idade >= 32 ? 1 : idade >= 29 ? 2 : 3, "Quer manter você no elenco.", 0));
    }
  }

  // Rumor da temporada: o interesse concreto vira proposta se ainda couber
  // no orçamento do clube (a reação ao rumor depende deste desfecho).
  if (c.rumor && c.rumor.ano === ano && !usados.has(c.rumor.clubeId) && idade < 39) {
    const f = forcaClube(cat, c.rumor.clubeId);
    const taxa = restante >= 1 ? valor : 0;
    if (taxa <= capacidadeClube(f) * 0.8) {
      ofertas.push(montarOferta(cat, c, "transferencia", c.rumor.clubeId, anoNovo, idade >= 31 ? 1 : idade >= 27 ? 2 : 3,
        `O interesse noticiado em ${ano} virou proposta. ${motivoInteresse(cat, c, c.rumor.clubeId, anoNovo)}`, taxa));
      usados.add(c.rumor.clubeId);
    }
  }

  // Transferências definitivas. A reputação amplia a observação e o teto.
  const rep = a.reputacao ?? 0;
  const desempenho = clamp(0.35 + part * 0.9 + (ult ? (ult.media - 6.5) * 0.25 : 0) + rep / 80, 0.15, 1.8);
  const teto = ef + 4 + (idade <= 22 ? Math.max(0, a.potencial - a.nivel) * 0.35 : 0) + part * 3 + rep / 12;
  const piso = ef - 14;
  const candidatos = cat.clubes
    .filter((cl) => !usados.has(cl.id))
    .map((cl) => ({ cl, f: forcaClube(cat, cl.id), sorte: r.next() }))
    .filter((x) => x.f >= piso && x.f <= teto)
    .sort((x, y) => x.sorte - y.sorte);
  let transf = 0;
  for (const { cl, f, sorte } of candidatos) {
    if (transf + ofertas.filter((o) => o.tipo === "transferencia").length >= 2 || idade >= 39) break;
    const interesse = c.clubesDeInteresse.includes(cl.id) ? 0.35 : 0;
    if (sorte > 0.08 * desempenho + interesse + (idade > 33 ? -0.03 : 0)) continue;
    const taxa = restante >= 1 ? valor : 0;
    if (taxa > capacidadeClube(f) * 0.8) continue;
    const of = montarOferta(cat, c, "transferencia", cl.id, anoNovo, idade >= 31 ? 1 : idade >= 27 ? 2 : 3, motivoInteresse(cat, c, cl.id, anoNovo), taxa);
    if (of.papel === "Promessa" && idade >= 21) continue; // ninguém contrata veterano para não jogar
    ofertas.push(of);
    usados.add(cl.id);
    transf++;
  }

  // Empréstimo: pedido pelo atleta ou pouco espaço num clube acima do nível.
  const fAtual = forcaClube(cat, clubeAtual);
  const precisaJogar = c.interesseEmprestimo || (part < 0.3 && fAtual > ef + 3);
  if (vinc && restante >= 1 && precisaJogar && idade <= 30) {
    const destinos = cat.clubes
      .filter((cl) => !usados.has(cl.id))
      .map((cl) => ({ cl, f: forcaClube(cat, cl.id), sorte: r.next() }))
      .filter((x) => x.f <= ef + 3 && x.f >= ef - 10)
      .sort((x, y) => x.sorte - y.sorte);
    for (const { cl, f } of destinos.slice(0, 40)) {
      const of = montarOferta(cat, c, "emprestimo", cl.id, anoNovo, 1, "Tem vaga na posição e o empréstimo cabe no orçamento.", 0);
      const custo = valor * 0.1 * (of.salarioDestino ?? 1);
      if ((of.papel === "Titular" || of.papel === "Rotação") && custo <= capacidadeClube(f)) {
        ofertas.push(of);
        break;
      }
    }
  }

  // Sem vínculo e sem proposta: um clube de nível compatível oferece contrato
  // (agente livre), para a carreira sempre ter caminho até o limite de idade.
  const temCaminho = ofertas.length > 0 || restante >= 1;
  if (!temCaminho && idade < 40) {
    const alvo = cat.clubes
      .filter((cl) => !usados.has(cl.id))
      .map((cl) => ({ cl, d: Math.abs(forcaClube(cat, cl.id) - (ef - 6)), sorte: r.next() }))
      .sort((x, y) => x.d - y.d || x.sorte - y.sorte)[Math.floor(r.next() * 5)];
    if (alvo) ofertas.push(montarOferta(cat, c, "transferencia", alvo.cl.id, anoNovo, 1, "Oferece contrato a um atleta livre.", 0));
  }
  return ofertas;
}

export function descricaoTipo(o: Oferta): string {
  return o.tipo === "renovacao" ? "Renovar" : o.tipo === "emprestimo" ? "Empréstimo" : o.tipo === "compra" ? "Compra" : "Transferência";
}

export function vinculoTexto(o: Oferta): string {
  const anos = `${o.duracao} ${o.duracao === 1 ? "ano" : "anos"}`;
  return o.tipo === "renovacao" ? `Renovação (${anos})` : o.tipo === "emprestimo" ? "Empréstimo (1 ano)" : `${o.tipo === "compra" ? "Compra" : "Transferência"} (${anos})`;
}


/**
 * Interesse concreto de outro clube durante a temporada (rumor de saída):
 * um clube com necessidade na posição, nível compatível e orçamento para a
 * taxa, observando o desempenho até aqui. Determinístico por semente e ano.
 */
export function interesseConcreto(cat: Catalogo, c: Carreira): string | null {
  const t = c.temporada;
  if (!t || !c.vinculo || t.jogoAtual < 8) return null;
  const a = c.atleta;
  const idade = idadeEm(a, t.ano + 1);
  if (idade >= 34) return null;
  const part = t.minutos / (90 * t.jogoAtual);
  const media = t.jogos ? t.notas / t.jogos : 0;
  const rep = a.reputacao ?? 0;
  if (part < 0.45 || media < 6.6) return null;
  const r = rngFrom(c.semente, "rumor", t.ano);
  if (!r.chance(clamp(0.25 + (media - 6.6) * 0.5 + rep / 100, 0, 0.85))) return null;
  const ef = nivelNaFuncao({ ...a, confianca: 0.5 }, a.posicao);
  const fAtual = forcaClube(cat, t.clubeId);
  const restante = c.vinculo.fim - t.ano;
  const taxa = restante >= 1 ? valorMercado(a, idade) : 0;
  const cands = cat.clubes
    .filter((cl) => cl.id !== t.clubeId && cl.id !== c.vinculo!.clubeId)
    .map((cl) => ({ id: cl.id, f: forcaClube(cat, cl.id), s: r.next() }))
    .filter((x) => x.f > fAtual && x.f <= ef + 6 + rep / 12 && taxa <= capacidadeClube(x.f) * 0.8)
    .filter((x) => {
      const top = principalConcorrente(gerarConcorrentes(cat, c.semente, x.id, a.posicao, t.ano + 1));
      return !!top && top.nivel <= ef + 3; // necessidade na posição
    })
    .sort((x, y) => x.s - y.s);
  return cands[0]?.id ?? null;
}
