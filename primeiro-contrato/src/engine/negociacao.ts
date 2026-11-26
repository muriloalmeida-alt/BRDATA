// Negociação com a diretoria (PC-003). Um único pedido por proposta, sem
// cadeia de negociação. A resposta é determinística (semente + janela +
// proposta + pedido) e fica gravada na pendência: reabrir a tela recupera a
// mesma resposta. O vínculo só muda quando o jogador confirma uma proposta
// válida na janela.
import { nivelNaFuncao } from "./atleta.ts";
import { forcaClube, jogosDaTemporada, type Catalogo } from "./catalogo.ts";
import { gerarConcorrentes, principalConcorrente } from "./elenco.ts";
import type { Carreira, Negociacao, Oferta, Pedido, Pendente } from "./estado.ts";
import { arredondar, faixaSalarial, formatarDinheiro } from "./financas.ts";
import { capacidadeClube, idadeEm, ofertasDeEmprestimo, projetarPapel, valorMercado } from "./mercado.ts";
import { rngFrom } from "./rng.ts";

export const PEDIDOS: ReadonlyArray<{ id: Pedido; rotulo: string; detalhe: string }> = [
  { id: "espaco", rotulo: "Mais espaço", detalhe: "Plano de rotação e data de revisão" },
  { id: "curto", rotulo: "Contrato mais curto", detalhe: "Menos temporadas de vínculo" },
  { id: "condicoes", rotulo: "Melhores condições", detalhe: "Salário ou bônus por jogos" },
  { id: "emprestimo", rotulo: "Buscar empréstimo", detalhe: "Autorização para procurar destino" },
];

const ehClubeAtual = (c: Carreira, clubeId: string) => c.vinculo?.clubeId === clubeId;

/** Termos de um caminho da janela. "ficar" vira uma proposta do clube atual
 *  com o vínculo vigente (para negociar sem trocar de contrato). */
export function termosDoCaminho(cat: Catalogo, c: Carreira, p: Pendente, caminhoId: string): Oferta | null {
  const base = caminhoId.replace(/#neg$/, "");
  if (caminhoId.endsWith("#neg")) return p.negociacoes?.[base]?.termos ?? null;
  const of = p.ofertas?.find((o) => o.id === base);
  if (of) return of;
  if (base !== "ficar" || !c.vinculo) return null;
  const proj = projetarPapel(cat, c, c.vinculo.clubeId, c.ano + 1);
  const faixa = faixaSalarial(cat, c.vinculo.clubeId, proj.papel, c.atleta.nivel);
  return {
    id: "ficar", tipo: "renovacao", clubeId: c.vinculo.clubeId, clubeNome: c.vinculo.clubeNome,
    papel: proj.papel, previsao: proj.previsao, minutosPrevistos: proj.minutosPrevistos,
    duracao: Math.max(1, c.vinculo.fim - c.ano), motivo: "Seu contrato continua.", taxa: 0,
    salario: c.vinculo.salario ?? faixa.ref, bonus: null, revisaoRodada: null, validaAte: c.ano, manterVinculo: true,
  };
}

/** Pedidos que fazem sentido para o caminho (estado do vínculo e da proposta). */
export function pedidosDisponiveis(c: Carreira, of: Oferta): Pedido[] {
  const out: Pedido[] = ["espaco"];
  if (of.tipo !== "emprestimo" && of.duracao > 1 && !of.manterVinculo) out.push("curto");
  if (of.tipo !== "emprestimo") out.push("condicoes");
  if (ehClubeAtual(c, of.clubeId) && of.tipo !== "emprestimo") out.push("emprestimo");
  return out;
}

function revisao(cat: Catalogo, of: Oferta): number {
  const cl = cat.clube(of.clubeId);
  const { jogos } = jogosDaTemporada(cl && cat.liga(cl.ligaId));
  return Math.max(6, Math.round(jogos * 0.3));
}

/** Avalia o pedido: duração, fase da carreira, margem salarial, concorrência
 *  de propostas e interesse do clube. */
export function avaliarPedido(cat: Catalogo, c: Carreira, p: Pendente, of: Oferta, pedido: Pedido): Negociacao {
  const chave = `${c.ano}:${of.id}`;
  const r = rngFrom(c.semente, "negociacao", c.ano, of.id, pedido);
  const a = c.atleta;
  const anoNovo = c.ano + 1;
  const idade = idadeEm(a, anoNovo);
  const ef = nivelNaFuncao(ehClubeAtual(c, of.clubeId) ? a : { ...a, confianca: 0.5 }, a.posicao);
  const top = principalConcorrente(gerarConcorrentes(cat, c.semente, of.clubeId, a.posicao, anoNovo));
  const ult = c.historico[c.historico.length - 1];
  const part = ult?.participacao ?? 0;
  const concorrencia = (p.ofertas ?? []).filter((o) => o.clubeId !== of.clubeId && o.tipo !== "renovacao").length;
  const nova = (mud: Partial<Oferta>): Oferta => ({ ...of, ...mud, id: `${of.id}#neg` });
  const base = { chave, caminhoId: of.id, pedido };

  if (pedido === "espaco") {
    const gap = top ? ef - top.nivel : 5;
    if (gap >= -4) {
      const rod = revisao(cat, of);
      return { ...base, resposta: "aceita", termos: nova({ revisaoRodada: rod }),
        razao: `Há espaço plausível: ${top ? `o titular simulado ${top.nome} tem nível ${top.nivel} e o seu é ${Math.round(ef)}` : "a posição está aberta"}. O clube oferece um plano de rotação com revisão do seu papel na rodada ${rod}. A escalação continua com o técnico.` };
    }
    if (idade <= 21 && ehClubeAtual(c, of.clubeId) && of.tipo !== "emprestimo") {
      return { ...base, resposta: "alternativa", termos: nova({ emprestimoAutorizado: true }),
        razao: `${top?.nome ?? "O titular"} (nível ${top?.nivel}) está à frente. Em vez de espaço agora, o clube autoriza procurar um empréstimo com minutos.` };
    }
    return { ...base, resposta: "recusa", termos: null,
      razao: `${top?.nome ?? "O titular"} (concorrente simulado, nível ${top?.nivel}) está à frente; seu nível hoje é ${Math.round(ef)}. O clube não vê espaço para prometer revisão agora.` };
  }

  if (pedido === "curto") {
    const curta = Math.max(1, of.duracao - 1);
    if (of.papel === "Titular" || (of.papel === "Rotação" && idade >= 24)) {
      return { ...base, resposta: "aceita", termos: nova({ duracao: curta }), razao: `O clube aceita ${curta} ${curta === 1 ? "temporada" : "temporadas"}: conta com você ${of.papel === "Titular" ? "como titular" : "na rotação"}.` };
    }
    if (idade <= 22 && a.potencial - a.nivel >= 6) {
      const sal = of.salario ? { ...of.salario, valor: arredondar(of.salario.valor * 0.88) } : of.salario;
      return { ...base, resposta: "alternativa", termos: nova({ duracao: curta, salario: sal }),
        razao: `O clube investe no seu potencial e aceita ${curta} ${curta === 1 ? "temporada" : "temporadas"} com salário fixo menor (${formatarDinheiro(sal)}).` };
    }
    return { ...base, resposta: "recusa", termos: null, razao: `Para o papel de ${of.papel.toLowerCase()}, o clube só oferece ${of.duracao} temporadas.` };
  }

  if (pedido === "condicoes") {
    const faixa = faixaSalarial(cat, of.clubeId, of.papel, a.nivel);
    const atual = of.salario?.valor ?? faixa.ref.valor;
    const margem = faixa.teto.valor - atual;
    const desempenho = part >= 0.5 && (ult?.media ?? 0) >= 6.8;
    const orcamentoCurto = valorMercado(a, idade) * 0.2 > capacidadeClube(forcaClube(cat, of.clubeId));
    if (margem > 0 && (concorrencia >= 1 || desempenho) && !orcamentoCurto) {
      const sal = { valor: arredondar(Math.min(faixa.teto.valor, atual * 1.12)), moeda: faixa.moeda };
      return { ...base, resposta: "aceita", termos: nova({ salario: sal }),
        razao: `${concorrencia >= 1 ? `Com ${concorrencia} ${concorrencia === 1 ? "outra proposta" : "outras propostas"} na mesa` : `Pelos ${Math.round(part * 100)}% dos minutos em ${ult?.ano}`}, o clube sobe o fixo para ${formatarDinheiro(sal)} (teto da faixa da função: ${formatarDinheiro(faixa.teto)}).` };
    }
    const cl = cat.clube(of.clubeId);
    const { jogos } = jogosDaTemporada(cl && cat.liga(cl.ligaId));
    if (concorrencia >= 1 || desempenho || of.papel === "Titular" || of.papel === "Rotação") {
      const meta = Math.max(8, Math.round(jogos * 0.55));
      const bonus = { jogos: meta, valor: arredondar(atual * 3), moeda: faixa.moeda };
      return { ...base, resposta: "alternativa", termos: nova({ bonus }),
        razao: `${margem <= 0 ? "O fixo já está no teto da faixa da função" : "O orçamento não comporta aumento fixo"}. O clube oferece bônus único de ${formatarDinheiro(bonus, "")} se você fizer ${meta} jogos na temporada ${anoNovo}.` };
    }
    if (!ehClubeAtual(c, of.clubeId) && concorrencia === 0 && r.chance(0.5)) {
      return { ...base, resposta: "retirada", termos: null, razao: "A diretoria considerou o pedido fora da faixa para o papel previsto e retirou a proposta." };
    }
    return { ...base, resposta: "recusa", termos: null, razao: `O salário oferecido já está na faixa da função (${formatarDinheiro(faixa.piso)} a ${formatarDinheiro(faixa.teto)}). A proposta original continua valendo.` };
  }

  // Buscar empréstimo (só no clube atual).
  const restante = c.vinculo ? c.vinculo.fim - c.ano : 0;
  if (part >= 0.6) {
    return { ...base, resposta: "recusa", termos: null, razao: `O elenco precisa de você: ${Math.round(part * 100)}% dos minutos em ${ult?.ano}. O clube não autoriza a procura.` };
  }
  if (of.tipo === "renovacao" && restante < 1) {
    return { ...base, resposta: "alternativa", termos: nova({ emprestimoAutorizado: true }),
      razao: "Seu contrato termina agora. Renovando, o clube autoriza procurar um empréstimo com minutos." };
  }
  if (idade >= 31) {
    return { ...base, resposta: "recusa", termos: null, razao: "O clube prefere adiar: quer reavaliar seu papel na próxima janela." };
  }
  return { ...base, resposta: "aceita", termos: nova({ emprestimoAutorizado: true }),
    razao: `Autorizado: com ${Math.round(part * 100)}% dos minutos em ${ult?.ano ?? c.ano}, o clube aceita procurar um destino com vaga e orçamento. O vínculo de origem continua.` };
}

/** Grava a negociação (uma vez por proposta) e atualiza a janela. Quando a
 *  diretoria autoriza o empréstimo, destinos elegíveis passam a ofertar. */
export function aplicarNegociacao(cat: Catalogo, c: Carreira, caminhoId: string, pedido: Pedido): boolean {
  const p = c.pendente;
  if (!p || p.tipo !== "janela") return false;
  p.negociacoes = p.negociacoes ?? {};
  if (p.negociacoes[caminhoId]) return false;
  if (!p.opcoes.some((o) => o.id === caminhoId)) return false;
  const of = termosDoCaminho(cat, c, p, caminhoId);
  if (!of || !pedidosDisponiveis(c, of).includes(pedido)) return false;
  const neg = avaliarPedido(cat, c, p, of, pedido);
  p.negociacoes[caminhoId] = neg;
  if (neg.termos) p.opcoes.push({ id: `${caminhoId}#neg`, rotulo: `${of.clubeNome} (termos negociados)` });
  if (neg.resposta === "retirada") p.opcoes = p.opcoes.filter((o) => o.id !== caminhoId);
  if (neg.termos?.emprestimoAutorizado && neg.resposta === "aceita") {
    c.interesseEmprestimo = true;
    const usados = new Set<string>([c.vinculo?.clubeId ?? "", ...(p.ofertas ?? []).map((o) => o.clubeId)]);
    const novas = ofertasDeEmprestimo(cat, c, usados, 2, "autorizado");
    p.ofertas = [...(p.ofertas ?? []), ...novas];
    for (const o of novas) p.opcoes.push({ id: o.id, rotulo: o.clubeNome });
    neg.razao += novas.length ? ` ${novas.length === 1 ? "Um destino ofereceu" : `${novas.length} destinos ofereceram`} empréstimo.` : " Nenhum destino com vaga e orçamento nesta janela.";
  }
  return true;
}
