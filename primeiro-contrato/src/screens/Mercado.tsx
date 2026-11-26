// Janela aberta, Qual caminho você escolhe?, Negociar com a diretoria e Mais
// uma temporada? (PC-001, PC-003).
import { useState } from "react";
import type { Catalogo } from "../engine/catalogo.ts";
import { idadeAtual } from "../engine/carreira.ts";
import type { Carreira, Oferta, Pedido, Pendente } from "../engine/estado.ts";
import { formatarDinheiro } from "../engine/financas.ts";
import { descricaoTipo, vinculoTexto } from "../engine/mercado.ts";
import { PEDIDOS, pedidosDisponiveis, termosDoCaminho } from "../engine/negociacao.ts";
import { Cta, Direita, Escudo, Foto, Header, Titulo } from "../ui/componentes.tsx";
import { BlocoDecisao } from "./Carreira.tsx";

/** Opção da janela já resolvida para exibição (proposta, termos negociados
 *  ou ficar). Os termos vêm do motor (`termosDoCaminho`). */
export type Caminho = {
  id: string; clubeId: string; clubeNome: string; tipo: string; papel: string; minutos: [number, number]; vinculo: string; motivo: string; acao: string;
  salario: string; bonus: string | null; revisao: string | null; negociado: boolean; oferta: Oferta;
};

const fmt = (n: number) => n.toLocaleString("pt-BR");

function caminho(c: Carreira, p: Pendente, of: Oferta, id: string): Caminho {
  const ficar = !!of.manterVinculo;
  const negociado = id.endsWith("#neg");
  const volta = !!p.contexto.voltaDeEmprestimo;
  const restante = c.vinculo ? c.vinculo.fim - c.ano : 0;
  const tipo = ficar ? (volta ? "Retorno" : "Ficar") : descricaoTipo(of);
  return {
    id, clubeId: of.clubeId, clubeNome: of.clubeNome, tipo: negociado ? `${tipo} negociado` : tipo, papel: of.papel, minutos: of.minutosPrevistos,
    vinculo: ficar ? `Contrato atual (${restante} ${restante === 1 ? "ano" : "anos"})` : vinculoTexto(of),
    motivo: ficar ? (volta ? "Fim do empréstimo: volta ao clube de origem." : "Seu contrato continua.") : of.motivo,
    acao: `${ficar ? (volta ? `Voltar ao ${of.clubeNome}` : "Ficar no clube") : of.tipo === "renovacao" ? "Renovar contrato" : of.tipo === "emprestimo" ? "Aceitar empréstimo" : of.tipo === "compra" ? "Aceitar compra" : "Aceitar transferência"}${negociado ? " (negociado)" : ""}`,
    salario: of.tipo === "emprestimo" ? `Pago ${of.salarioDestino === 1 ? "integralmente" : "pela metade"} pelo destino` : formatarDinheiro(of.salario),
    bonus: of.bonus ? `${formatarDinheiro(of.bonus, "")} com ${of.bonus.jogos} jogos` : null,
    revisao: of.revisaoRodada ? `Revisão do papel na rodada ${of.revisaoRodada}` : of.emprestimoAutorizado ? "Empréstimo autorizado" : null,
    negociado, oferta: of,
  };
}

export function caminhosDaJanela(cat: Catalogo, c: Carreira, p: Pendente): Caminho[] {
  const out: Caminho[] = [];
  for (const o of p.opcoes) {
    const of = termosDoCaminho(cat, c, p, o.id);
    if (of) out.push(caminho(c, p, of, o.id));
  }
  return out;
}

function frase(n: number, ficar: boolean): string {
  if (n === 0) return ficar ? "Nenhuma proposta chegou. Seu contrato continua." : "Nenhuma proposta chegou.";
  const nums = ["", "Uma proposta chegou", "Duas propostas chegaram", "Três propostas chegaram", "Quatro propostas chegaram"];
  return `${nums[n] ?? `${n} propostas chegaram`} para você. É uma nova chance de decidir os rumos da sua carreira.`;
}

export function TelaJanela({ cat, c, p, selecionado, onSelecionar, onComparar }: { cat: Catalogo; c: Carreira; p: Pendente; selecionado: string | null; onSelecionar: (id: string) => void; onComparar: () => void }) {
  const caminhos = caminhosDaJanela(cat, c, p);
  const propostas = caminhos.filter((x) => x.id !== "ficar" && !x.negociado).length;
  return (
    <main className="tela">
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 30 }}>
        <Titulo grande>Janela aberta</Titulo>
        <span className="barra" aria-hidden="true" />
        <p className="apoio" style={{ marginTop: 12 }}>{frase(propostas, caminhos.some((x) => x.id === "ficar"))}</p>
        <div className="propostas" role="radiogroup" aria-label="Propostas e caminhos">
          {caminhos.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={selecionado === x.id} className="proposta" onClick={() => onSelecionar(x.id)}>
              <Escudo cat={cat} clubeId={x.clubeId} nome={x.clubeNome} tamanho={52} />
              <span className="clube-corpo"><span className="proposta-nome">{x.clubeNome}</span><span className="proposta-meta">{x.tipo} · {x.papel}</span></span>
              <Direita />
            </button>
          ))}
        </div>
        <p className="estimativa">Papel, minutos e salário são estimativas; interesse não garante titularidade.</p>
      </div>
      <div className="acoes"><Cta onClick={onComparar}>{caminhos.length > 1 ? "Comparar propostas" : "Ver proposta"}</Cta></div>
    </main>
  );
}

/** Colunas da comparação: o caminho escolhido e o do clube atual (ou o próximo). */
export function colunasComparacao(caminhos: Caminho[], sel: string | null): Caminho[] {
  if (caminhos.length <= 2) return caminhos;
  const a = caminhos.find((x) => x.id === sel) ?? caminhos[0];
  const atual = caminhos.find((x) => x.id !== a.id && (x.id === "ficar" || x.id.startsWith("renovacao:")) && !x.negociado);
  const b = atual ?? caminhos.find((x) => x.id !== a.id)!;
  return [a, b];
}

export function TelaComparar({ cat, c, p, selecionado, onDecidir, onNegociar }: {
  cat: Catalogo; c: Carreira; p: Pendente; selecionado: string | null; onDecidir: (id: string) => void; onNegociar: (caminhoId: string) => void;
}) {
  const cols = colunasComparacao(caminhosDaJanela(cat, c, p), selecionado);
  const [sel, setSel] = useState<string | null>(null);
  // Aceitar, Negociar (uma vez por proposta) ou escolher outro caminho.
  const negociaveis = cols.filter((x) => !x.negociado && !p.negociacoes?.[x.id] && pedidosDisponiveis(c, x.oferta).length > 0);
  const opcoes = [
    ...cols.map((x) => ({ id: x.id, rotulo: x.acao })),
    ...negociaveis.map((x) => ({ id: `negociar:${x.id}`, rotulo: `Negociar com o ${x.clubeNome}` })),
  ];
  const temBonus = cols.some((x) => x.bonus), temRevisao = cols.some((x) => x.revisao);
  return (
    <main className="tela">
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 14 }}>
        <Titulo grande>Qual caminho você escolhe?</Titulo>
        <span className="barra" aria-hidden="true" />
        <table className="tabela-cmp">
          <caption className="sr-only">Comparação de papel, minutos previstos, vínculo e salário</caption>
          <thead>
            <tr>
              <td style={{ borderBottom: "1px solid var(--bd-line)" }} />
              {cols.map((x) => (
                <th key={x.id} scope="col"><span className="cmp-cab"><Escudo cat={cat} clubeId={x.clubeId} nome={x.clubeNome} tamanho={40} />{x.clubeNome}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr><th scope="row">Papel</th>{cols.map((x) => <td key={x.id}>{x.papel}</td>)}</tr>
            <tr><th scope="row">Minutos previstos</th>{cols.map((x) => <td key={x.id}>{fmt(x.minutos[0])}–{fmt(x.minutos[1])} min</td>)}</tr>
            <tr><th scope="row">Vínculo</th>{cols.map((x) => <td key={x.id}>{x.vinculo}</td>)}</tr>
            <tr><th scope="row">Salário</th>{cols.map((x) => <td key={x.id}>{x.salario}</td>)}</tr>
            {temBonus && <tr><th scope="row">Bônus</th>{cols.map((x) => <td key={x.id}>{x.bonus ?? "—"}</td>)}</tr>}
            {temRevisao && <tr><th scope="row">Compromisso</th>{cols.map((x) => <td key={x.id}>{x.revisao ?? "—"}</td>)}</tr>}
            <tr><th scope="row">Interesse</th>{cols.map((x) => <td key={x.id}><span className="cmp-motivo">{x.motivo}</span></td>)}</tr>
          </tbody>
        </table>
      </div>
      <BlocoDecisao opcoes={opcoes} sel={sel} setSel={setSel} rotulo="Qual caminho você escolhe?"
        confirmar={sel?.startsWith("negociar:") ? "Abrir negociação" : "Confirmar"}
        onConfirmar={() => { if (!sel) return; if (sel.startsWith("negociar:")) onNegociar(sel.slice(9)); else onDecidir(sel); }} />
    </main>
  );
}

const RESPOSTA: Record<string, string> = { aceita: "A diretoria aceitou", alternativa: "A diretoria fez uma contraproposta", recusa: "A diretoria recusou", retirada: "A diretoria retirou a proposta" };

/** Negociar com a diretoria: um único pedido; reabrir mostra a mesma resposta. */
export function TelaNegociar({ cat, c, p, caminhoId, onPedir, onDecidir, onVoltar }: {
  cat: Catalogo; c: Carreira; p: Pendente; caminhoId: string; onPedir: (pedido: Pedido) => void; onDecidir: (id: string) => void; onVoltar: () => void;
}) {
  const of = termosDoCaminho(cat, c, p, caminhoId);
  const neg = p.negociacoes?.[caminhoId];
  const [sel, setSel] = useState<string | null>(null);
  if (!of) return null;
  const base = caminho(c, p, of, caminhoId);
  const linhas = (x: Caminho) => (
    <dl className="grade-dados">
      <div><dt>Papel previsto</dt><dd>{x.papel}</dd></div>
      <div><dt>Minutos previstos</dt><dd>{fmt(x.minutos[0])}–{fmt(x.minutos[1])}</dd></div>
      <div><dt>Vínculo</dt><dd>{x.vinculo}</dd></div>
      <div><dt>Salário</dt><dd>{x.salario}</dd></div>
      {x.bonus && <div><dt>Bônus</dt><dd>{x.bonus}</dd></div>}
      {x.revisao && <div><dt>Compromisso</dt><dd>{x.revisao}</dd></div>}
    </dl>
  );
  if (!neg) {
    const disp = pedidosDisponiveis(c, of);
    return (
      <main className="tela">
        <Header />
        <div className="tela-corpo" style={{ paddingTop: 14 }}>
          <Titulo grande>Negociar com a diretoria</Titulo>
          <div className="cartao-clube" style={{ marginTop: 14, padding: "12px 14px" }}>
            <Escudo cat={cat} clubeId={of.clubeId} nome={of.clubeNome} tamanho={44} />
            <strong style={{ fontSize: 24 }}>{of.clubeNome}</strong>
          </div>
          {linhas(base)}
          <p className="apoio apoio--muted" style={{ marginTop: 10 }}>Escolha um único pedido. A proposta original continua valendo se o clube recusar, salvo se ele a retirar.</p>
        </div>
        <BlocoDecisao opcoes={PEDIDOS.filter((x) => disp.includes(x.id))} sel={sel} setSel={setSel} rotulo="Qual pedido você faz?" confirmar="Enviar pedido" onConfirmar={() => sel && onPedir(sel as Pedido)} />
      </main>
    );
  }
  const novos = neg.termos ? caminho(c, p, neg.termos, `${caminhoId}#neg`) : null;
  const originalValida = neg.resposta !== "retirada" && p.opcoes.some((o) => o.id === caminhoId);
  const opcoes = [
    ...(novos ? [{ id: `${caminhoId}#neg`, rotulo: "Assinar com os novos termos" }] : []),
    ...(originalValida ? [{ id: caminhoId, rotulo: of.manterVinculo ? "Manter o contrato atual" : "Assinar a proposta original" }] : []),
    { id: "voltar", rotulo: "Voltar às propostas" },
  ];
  return (
    <main className="tela">
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 14 }}>
        <Titulo grande>{RESPOSTA[neg.resposta]}</Titulo>
        <span className="barra" aria-hidden="true" />
        <p className="meta" style={{ margin: "10px 0 0" }}>{of.clubeNome} · pedido: {PEDIDOS.find((x) => x.id === neg.pedido)?.rotulo}</p>
        <p className="apoio" style={{ fontSize: 17 }}>{neg.razao}</p>
        {novos && linhas(novos)}
      </div>
      <BlocoDecisao opcoes={opcoes} sel={sel} setSel={setSel} rotulo="O que você faz?" confirmar={sel === "voltar" ? "Voltar" : "Confirmar"}
        onConfirmar={() => { if (!sel) return; if (sel === "voltar") onVoltar(); else onDecidir(sel); }} />
    </main>
  );
}

export function TelaAposentadoria({ c, p, onDecidir }: { c: Carreira; p: Pendente; onDecidir: (id: string) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const texto = p.contexto.contratoTermina ? "Seu contrato termina hoje. O que você quer fazer?" : `Você tem ${idadeAtual(c)} anos. O que você quer fazer?`;
  const confirmar = sel === "encerrar" ? "Confirmar aposentadoria" : "Confirmar";
  return (
    <main className="tela tela--fixa">
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 30 }}>
        <Titulo grande>Mais uma temporada?</Titulo>
        <Foto nome="04_despedida" altura={300} />
        <p className="apoio" style={{ fontWeight: 500 }}>{texto}</p>
        {!p.opcoes.some((o) => o.id === "continuar") && <p className="estimativa">Sem contrato válido nem proposta para a próxima temporada.</p>}
      </div>
      <BlocoDecisao opcoes={p.opcoes} sel={sel} setSel={setSel} rotulo="Mais uma temporada?" confirmar={confirmar} onConfirmar={() => sel && onDecidir(sel)} />
    </main>
  );
}
