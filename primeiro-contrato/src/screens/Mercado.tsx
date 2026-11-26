// Janela aberta, Qual caminho você escolhe? e Mais uma temporada? (PC-001).
import { useState } from "react";
import type { Catalogo } from "../engine/catalogo.ts";
import { idadeAtual } from "../engine/carreira.ts";
import type { Carreira, Oferta, Pendente } from "../engine/estado.ts";
import { descricaoTipo, vinculoTexto } from "../engine/mercado.ts";
import { projetarPapel } from "../engine/mercado.ts";
import { Cta, Direita, Escudo, Foto, Header, Opcoes, Titulo } from "../ui/componentes.tsx";

/** Opção da janela já resolvida para exibição (proposta ou ficar). */
export type Caminho = { id: string; clubeId: string; clubeNome: string; tipo: string; papel: string; minutos: [number, number]; vinculo: string; motivo: string; acao: string };

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function caminhosDaJanela(cat: Catalogo, c: Carreira, p: Pendente): Caminho[] {
  const out: Caminho[] = (p.ofertas ?? []).map((o: Oferta) => ({
    id: o.id, clubeId: o.clubeId, clubeNome: o.clubeNome, tipo: descricaoTipo(o), papel: o.papel,
    minutos: o.minutosPrevistos, vinculo: vinculoTexto(o), motivo: o.motivo,
    acao: o.tipo === "renovacao" ? "Renovar contrato" : o.tipo === "emprestimo" ? "Aceitar empréstimo" : o.tipo === "compra" ? "Aceitar compra" : "Aceitar transferência",
  }));
  if (p.opcoes.some((o) => o.id === "ficar") && c.vinculo) {
    const proj = projetarPapel(cat, c, c.vinculo.clubeId, c.ano + 1);
    const restante = c.vinculo.fim - c.ano;
    out.push({
      id: "ficar", clubeId: c.vinculo.clubeId, clubeNome: c.vinculo.clubeNome, tipo: p.contexto.voltaDeEmprestimo ? "Retorno" : "Ficar",
      papel: proj.papel, minutos: proj.minutosPrevistos, vinculo: `Contrato atual (${restante} ${restante === 1 ? "ano" : "anos"})`,
      motivo: p.contexto.voltaDeEmprestimo ? "Fim do empréstimo: volta ao clube de origem." : "Seu contrato continua.",
      acao: p.contexto.voltaDeEmprestimo ? `Voltar ao ${c.vinculo.clubeNome}` : "Ficar no clube",
    });
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
  const propostas = caminhos.filter((x) => x.id !== "ficar").length;
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
        <p className="estimativa">Papel e minutos são estimativas; interesse não garante titularidade.</p>
      </div>
      <div className="acoes"><Cta onClick={onComparar}>{caminhos.length > 1 ? "Comparar propostas" : "Ver proposta"}</Cta></div>
    </main>
  );
}

/** Colunas da comparação: o caminho escolhido e o do clube atual (ou o próximo). */
export function colunasComparacao(caminhos: Caminho[], sel: string | null): Caminho[] {
  if (caminhos.length <= 2) return caminhos;
  const a = caminhos.find((x) => x.id === sel) ?? caminhos[0];
  const atual = caminhos.find((x) => x.id !== a.id && (x.id === "ficar" || x.id.startsWith("renovacao:")));
  const b = atual ?? caminhos.find((x) => x.id !== a.id)!;
  return [a, b];
}

export function TelaComparar({ cat, c, p, selecionado, onDecidir }: { cat: Catalogo; c: Carreira; p: Pendente; selecionado: string | null; onDecidir: (id: string) => void }) {
  const cols = colunasComparacao(caminhosDaJanela(cat, c, p), selecionado);
  const [sel, setSel] = useState<string | null>(null);
  return (
    <main className="tela">
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 14 }}>
        <Titulo grande>Qual caminho você escolhe?</Titulo>
        <span className="barra" aria-hidden="true" />
        <table className="tabela-cmp">
          <caption className="sr-only">Comparação de papel, minutos previstos e vínculo</caption>
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
            <tr><th scope="row">Interesse</th>{cols.map((x) => <td key={x.id}><span className="cmp-motivo">{x.motivo}</span></td>)}</tr>
          </tbody>
        </table>
      </div>
      <div className="acoes">
        <Opcoes opcoes={cols.map((x) => ({ id: x.id, rotulo: x.acao }))} valor={sel} onEscolher={setSel} rotulo="Qual caminho você escolhe?" />
        {sel && <Cta onClick={() => onDecidir(sel)}>Confirmar</Cta>}
      </div>
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
      <div className="acoes acoes--fluxo" style={{ paddingTop: 0 }}>
        <Opcoes opcoes={p.opcoes} valor={sel} onEscolher={setSel} rotulo="Mais uma temporada?" />
        {sel && <Cta onClick={() => onDecidir(sel)}>{confirmar}</Cta>}
      </div>
    </main>
  );
}
