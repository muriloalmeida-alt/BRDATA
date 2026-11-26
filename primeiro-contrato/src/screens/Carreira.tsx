// Telas da carreira (PC-001): Sua temporada, decisões (treinador, volta
// antes da hora, perda de espaço), balanço e primeira convocação.
import { useState } from "react";
import { nomeExibicao } from "../engine/atleta.ts";
import { idadeAtual, resumoTemporada, situacao } from "../engine/carreira.ts";
import type { Carreira, Pendente } from "../engine/estado.ts";
import { metricaPrincipal } from "../engine/posicoes.ts";
import { Consequencia, Cta, Foto, Fundo, Header, Opcoes, Titulo } from "../ui/componentes.tsx";

function Numeros({ itens }: { itens: Array<[string | number, string]> }) {
  return (
    <div className="numeros">
      {itens.map(([v, r]) => <div className="numero" key={r}><b>{v}</b><span>{r}</span></div>)}
    </div>
  );
}

export function TelaTemporada({ c, onAvancar, onTrajetoria, ocupado }: { c: Carreira; onAvancar: () => void; onTrajetoria: () => void; ocupado: boolean }) {
  const t = c.temporada!;
  const res = resumoTemporada(c)!;
  const clube = c.emprestimo ? `${c.emprestimo.clubeNome} (emprestado)` : c.vinculo?.clubeNome;
  return (
    <main className="tela">
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 14 }}>
        <Titulo grande>Sua temporada</Titulo>
        <p className="meta" style={{ margin: "4px 0 0", fontSize: 17 }}>{idadeAtual(c)} anos · {clube}</p>
        <p className="situacao">{situacao(c)}</p>
        <Numeros itens={[[res.jogos, "Jogos"], [res.minutos.toLocaleString("pt-BR"), "Minutos"], [res.metrica, res.rotulo]]} />
        <p className="estimativa">Temporada {t.ano} · jogo {t.jogoAtual} de {t.jogosTotal}{t.simplificada ? " · temporada simplificada (calendário simulado)" : ""}</p>
        <Foto nome="02_estadio" altura={250} />
      </div>
      <div className="acoes">
        <Consequencia texto={c.ultimaConsequencia} />
        <Cta onClick={onAvancar} desabilitado={ocupado}>Avançar temporada</Cta>
        <button type="button" className="link" onClick={onTrajetoria}>Ver trajetória</button>
      </div>
    </main>
  );
}

/** Decisão tipada com resposta selecionável e confirmação. */
function Decisao({ p, onDecidir, children, rotulo }: { p: Pendente; onDecidir: (id: string) => void; children?: React.ReactNode; rotulo: string }) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <>
      {children}
      <div className="acoes" style={{ paddingTop: 0 }}>
        <Opcoes opcoes={p.opcoes} valor={sel} onEscolher={setSel} rotulo={rotulo} />
        {sel && <Cta onClick={() => onDecidir(sel)}>Confirmar</Cta>}
      </div>
    </>
  );
}

export function TelaTreinador({ p, onDecidir }: { p: Pendente; onDecidir: (id: string) => void }) {
  return (
    <main className="tela">
      <Fundo nome="03_conversa_treinador" modo="cheio" foco="50% 40%" />
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 14 }}>
        <Titulo grande>O treinador te chamou</Titulo>
        <div style={{ flex: 1, minHeight: 240 }} />
        <h2 className="titulo" style={{ fontSize: 30 }}>{String(p.contexto.pergunta)}</h2>
      </div>
      <Decisao p={p} onDecidir={onDecidir} rotulo={String(p.contexto.pergunta)} />
    </main>
  );
}

export function TelaRecuperacao({ p, onDecidir }: { p: Pendente; onDecidir: (id: string) => void }) {
  return (
    <main className="tela">
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 0 }}>
        <Foto nome="02_estadio" foco="50% 60%" altura={300} />
        <Titulo>Voltar antes da hora?</Titulo>
        <span className="barra" aria-hidden="true" />
        <p className="apoio">A decisão é sua. O próximo jogo é contra {String(p.contexto.rival)}.</p>
      </div>
      <Decisao p={p} onDecidir={onDecidir} rotulo="Voltar antes da hora?" />
    </main>
  );
}

export function TelaPerdaEspaco({ p, onDecidir }: { p: Pendente; onDecidir: (id: string) => void }) {
  return (
    <main className="tela">
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 0 }}>
        <Foto nome="02_estadio" foco="50% 45%" altura={300} />
        <Titulo>Você perdeu espaço</Titulo>
        <span className="barra" aria-hidden="true" />
        <p className="apoio" style={{ fontFamily: "var(--bd-font-text)", fontWeight: 500 }}>Como você reage?</p>
      </div>
      <Decisao p={p} onDecidir={onDecidir} rotulo="Como você reage?" />
    </main>
  );
}

const TITULO_BALANCO = { ganhou: "Você ganhou espaço", manteve: "Temporada de afirmação", perdeu: "Temporada de pouco espaço", lesao: "Temporada interrompida" } as const;

export function TelaBalanco({ c, onAbrirJanela }: { c: Carreira; onAbrirJanela: () => void }) {
  const h = c.historico[c.historico.length - 1];
  const m = metricaPrincipal(c.atleta.posicao);
  const delta = h.nivelFim - h.nivelInicio;
  return (
    <main className="tela">
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 14 }}>
        <Titulo>{TITULO_BALANCO[h.resultado]}</Titulo>
        <Foto nome="01_tunel" foco="64% 40%" altura={300} />
        <Numeros itens={[[h.jogos, "Jogos"], [h.stats[m.chave], m.rotulo], [`${delta > 0 ? "+" : ""}${delta}`, "Nível"]]} />
        <p className="apoio apoio--muted" style={{ marginTop: 14 }}>{h.fato}</p>
        {h.posicaoLiga && <p className="estimativa">{h.clubeNome} terminou em {h.posicaoLiga}º na {h.ligaNome}{h.titulo ? " · campeão" : ""}.</p>}
        <p className="estimativa">Nível é uma simulação do jogo.</p>
      </div>
      <div className="acoes"><Cta onClick={onAbrirJanela}>Abrir janela</Cta></div>
    </main>
  );
}

export function TelaConvocacao({ c, p, onContinuar }: { c: Carreira; p: Pendente; onContinuar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const clube = c.emprestimo?.clubeNome ?? c.vinculo?.clubeNome;
  return (
    <main className="tela">
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 14 }}>
        <Titulo grande>Primeira convocação</Titulo>
        <p className="meta" style={{ margin: "4px 0 0", fontSize: 17 }}>{String(p.contexto.selecao)}</p>
        <Foto nome="01_tunel" foco="60% 45%" altura={280} />
        <h2 className="titulo" style={{ fontSize: 30 }}>Você foi chamado para a seleção.</h2>
        {aberto && (
          <div className="detalhes" id="conv-det">
            <p><b>{nomeExibicao(c.atleta)}</b> · {idadeAtual(c)} anos · {clube}</p>
            <p>Temporada {String(p.contexto.ano)}. Critérios: nível {String(p.contexto.nivel)} (exigência da seleção: {String(p.contexto.exigencia)}), titularidade no clube e liga de nível competitivo.</p>
            <p>O marco entra na sua trajetória uma única vez.</p>
          </div>
        )}
      </div>
      <div className="acoes">
        {aberto
          ? <Cta onClick={onContinuar}>Continuar</Cta>
          : <Cta onClick={() => setAberto(true)}>Ver convocação</Cta>}
      </div>
    </main>
  );
}

