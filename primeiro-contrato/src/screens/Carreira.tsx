// Telas da carreira (PC-001, PC-002): Sua temporada com reprodução jogo a
// jogo, decisões (treinador, volta ao treino, disputa por vaga, entrevista,
// rumor), balanço detalhado e primeira convocação.
import { useEffect, useRef, useState } from "react";
import { nomeExibicao } from "../engine/atleta.ts";
import type { Catalogo } from "../engine/catalogo.ts";
import { idadeAtual, resumoTemporada, situacao, tabelaDaTemporada } from "../engine/carreira.ts";
import type { Carreira, Partida, Pendente } from "../engine/estado.ts";
import { metricaPrincipal, POS } from "../engine/posicoes.ts";
import { Consequencia, Cta, Escudo, Foto, Fundo, Header, Opcoes, Titulo, type NomeFundo } from "../ui/componentes.tsx";
import { CardPartida, LinhaPartida } from "../ui/partida.tsx";

function Numeros({ itens }: { itens: Array<[string | number, string]> }) {
  return (
    <div className="numeros">
      {itens.map(([v, r]) => <div className="numero" key={r}><b>{v}</b><span>{r}</span></div>)}
    </div>
  );
}

/** Duração do trecho entre decisões: 8–15 s, conforme o número de jogos. */
export function duracaoTrecho(jogos: number): number {
  return Math.min(15000, Math.max(8000, 8000 + jogos * 250));
}

const prefereMenosMovimento = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function fundoDaPartida(p: Partida | undefined): NomeFundo {
  if (!p) return "02_estadio";
  if (p.marcos.includes("golDecisivo")) return "gol-decisivo";
  if (p.marcos.includes("retorno")) return "volta-ao-treino";
  return "02_estadio";
}

/**
 * Sua temporada. Ocioso: "Iniciar temporada" (primeiro trecho) ou "Continuar
 * temporada". Em reprodução: os jogos novos aparecem um a um (o motor já
 * decidiu tudo); Pausar, Acelerar e Ir à próxima decisão só mudam a
 * exibição. O ponteiro `exibidos` é persistido a cada jogo.
 */
export function TelaTemporada({ cat, c, onAvancar, onExibir, onTrajetoria, ocupado }: {
  cat: Catalogo; c: Carreira; onAvancar: () => void; onExibir: (n: number) => void; onTrajetoria: () => void; ocupado: boolean;
}) {
  const t = c.temporada!;
  const total = t.partidas.length;
  const emReproducao = t.exibidos < total;
  const [atual, setAtual] = useState(t.exibidos); // índice do jogo no card
  const [pausado, setPausado] = useState(false);
  const [vel, setVel] = useState(1);
  const inicioTrecho = useRef(t.exibidos);
  const reduzido = useRef(prefereMenosMovimento());
  useEffect(() => {
    if (!emReproducao || pausado) return;
    const jogos = Math.max(1, total - inicioTrecho.current);
    const passo = duracaoTrecho(jogos) / jogos / vel;
    const id = window.setTimeout(() => {
      if (atual < total - 1) { setAtual(atual + 1); onExibir(atual + 1); }
      else onExibir(total); // fim do trecho: a próxima decisão (ou o balanço) aparece
    }, passo);
    return () => window.clearTimeout(id);
  }, [emReproducao, pausado, vel, atual, total]); // eslint-disable-line react-hooks/exhaustive-deps

  const mostrados = emReproducao ? atual + 1 : total;
  const res = resumoTemporada(c, mostrados)!;
  const clube = c.emprestimo ? `${c.emprestimo.clubeNome} (emprestado)` : c.vinculo?.clubeNome;
  const ligaNome = cat.liga(t.ligaId)?.nome ?? "";
  // O card da partida aparece durante a reprodução; ocioso, a tela mostra os
  // totais (o detalhe de cada jogo fica no balanço).
  const card = emReproducao ? t.partidas[atual] : undefined;
  const iniciar = t.jogoAtual === 0 && total === 0;
  return (
    <main className="tela">
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 14 }}>
        <Titulo grande>Sua temporada</Titulo>
        <p className="meta" style={{ margin: "4px 0 0", fontSize: 17 }}>{idadeAtual(c)} anos · {clube}</p>
        <p className="situacao">{situacao(c, mostrados)}</p>
        <Numeros itens={[[res.jogos, "Jogos"], [res.minutos.toLocaleString("pt-BR"), "Minutos"], [res.metrica, res.rotulo]]} />
        <p className="estimativa">Temporada {t.ano} · rodada {mostrados} de {t.jogosTotal}{t.simplificada ? " · temporada simplificada (calendário e resultados simulados)" : ""}</p>
        <Foto nome={fundoDaPartida(card)} altura={card ? 200 : 250} />
        {card && (
          <div className={`partida-wrap${reduzido.current ? "" : " partida-wrap--anim"}`} key={card.chave} aria-live={emReproducao && !pausado ? "off" : "polite"}>
            <CardPartida cat={cat} p={card} clubeId={t.clubeId} ligaNome={ligaNome} simplificada={t.simplificada} funcao={t.funcao} />
          </div>
        )}
      </div>
      <div className="acoes">
        {emReproducao ? (
          <>
            <div className="controles">
              <button type="button" className="controle" aria-pressed={pausado} onClick={() => setPausado(!pausado)}>{pausado ? "Retomar" : "Pausar"}</button>
              <button type="button" className="controle" aria-label={`Acelerar, velocidade atual ${vel}×`} onClick={() => setVel(vel >= 4 ? 1 : vel * 2)}>Acelerar · {vel}×</button>
            </div>
            <Cta onClick={() => onExibir(total)}>Ir à próxima decisão</Cta>
          </>
        ) : (
          <>
            <Consequencia texto={c.ultimaConsequencia} />
            <Cta onClick={onAvancar} desabilitado={ocupado}>{iniciar ? "Iniciar temporada" : "Continuar temporada"}</Cta>
            <button type="button" className="link" onClick={onTrajetoria}>Ver trajetória</button>
          </>
        )}
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
      <div className="acoes acoes--fluxo" style={{ paddingTop: 0 }}>
        <Opcoes opcoes={p.opcoes} valor={sel} onEscolher={setSel} rotulo={rotulo} />
        {sel && <Cta onClick={() => onDecidir(sel)}>Confirmar</Cta>}
      </div>
    </>
  );
}

export function TelaTreinador({ p, onDecidir }: { p: Pendente; onDecidir: (id: string) => void }) {
  const plano = !!p.contexto.plano;
  return (
    <main className="tela">
      <Fundo nome={plano ? "plano-treinador" : "03_conversa_treinador"} modo="cheio" foco={plano ? "38% 45%" : "50% 40%"} reserva="03_conversa_treinador" />
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 14 }}>
        <Titulo grande>O treinador te chamou</Titulo>
        {plano && <p className="meta" style={{ margin: "4px 0 0", fontSize: 17 }}>Plano para a temporada {p.ano}</p>}
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
        <Foto nome="volta-ao-treino" altura={300} />
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
        <Foto nome="disputa-por-vaga" altura={300} />
        <Titulo>Você perdeu espaço</Titulo>
        <span className="barra" aria-hidden="true" />
        {p.contexto.recente != null && <p className="apoio apoio--muted" style={{ marginTop: 10 }}>Nos últimos 8 jogos você teve {String(p.contexto.recente)}% dos minutos; a previsão era {String(p.contexto.previsto)}%.</p>}
        <p className="apoio" style={{ fontFamily: "var(--bd-font-text)", fontWeight: 500 }}>Como você reage?</p>
      </div>
      <Decisao p={p} onDecidir={onDecidir} rotulo="Como você reage?" />
    </main>
  );
}

export function TelaEntrevista({ p, onDecidir }: { p: Pendente; onDecidir: (id: string) => void }) {
  const decisivo = !!p.contexto.decisivo;
  return (
    <main className="tela">
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 0 }}>
        <Foto nome={decisivo ? "gol-decisivo" : "entrevista-pos-jogo"} altura={300} />
        <Titulo>Entrevista pós-jogo</Titulo>
        <span className="barra" aria-hidden="true" />
        <p className="apoio">{String(p.contexto.fato)}</p>
        <p className="apoio" style={{ fontWeight: 500 }}>O que você diz?</p>
      </div>
      <Decisao p={p} onDecidir={onDecidir} rotulo="O que você diz na entrevista?" />
    </main>
  );
}

export function TelaRumor({ cat, p, onDecidir }: { cat: Catalogo; p: Pendente; onDecidir: (id: string) => void }) {
  return (
    <main className="tela">
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 0 }}>
        <Foto nome="entrevista-pos-jogo" foco="40% 40%" altura={260} />
        <Titulo>Rumor de saída</Titulo>
        <span className="barra" aria-hidden="true" />
        <div className="cartao-clube" style={{ marginTop: 16 }}>
          <Escudo cat={cat} clubeId={String(p.contexto.clubeId)} tamanho={52} />
          <strong style={{ fontSize: 25 }}>{String(p.contexto.clube)}</strong>
        </div>
        <p className="apoio">O clube demonstrou interesse concreto em você. A imprensa quer sua resposta.</p>
      </div>
      <Decisao p={p} onDecidir={onDecidir} rotulo="Como você responde ao rumor?" />
    </main>
  );
}

const TITULO_BALANCO = { ganhou: "Você ganhou espaço", manteve: "Temporada de afirmação", perdeu: "Temporada de pouco espaço", lesao: "Temporada interrompida" } as const;

export function TelaBalanco({ cat, c, onAbrirJanela }: { cat: Catalogo; c: Carreira; onAbrirJanela: () => void }) {
  const h = c.historico[c.historico.length - 1];
  const m = metricaPrincipal(c.atleta.posicao);
  const delta = h.nivelFim - h.nivelInicio;
  const [aberto, setAberto] = useState<"jogos" | "tabela" | null>(null);
  const pct = Math.round(h.participacao * 100);
  const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const setor = POS[c.atleta.posicao].setor;
  const extra: Array<[string, string]> = setor === "GOL"
    ? [["Defesas", String(h.stats.defesas)], ["Jogos sem sofrer gol", String(h.stats.semSofrer)]]
    : setor === "ATA" || c.atleta.posicao === "MEI"
      ? [["Gols e assistências", `${h.stats.gols} e ${h.stats.assistencias}`]]
      : [["Desarmes e interceptações", `${h.stats.desarmes} e ${h.stats.interceptacoes}`]];
  const tabela = aberto === "tabela" && c.temporada && c.temporada.ano === h.ano && !h.simplificada ? tabelaDaTemporada(cat, c, h.jogosTotal) : [];
  return (
    <main className="tela">
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 14 }}>
        <Titulo>{TITULO_BALANCO[h.resultado]}</Titulo>
        <Foto nome="01_tunel" foco="64% 40%" altura={220} />
        <Numeros itens={[[h.jogos, "Jogos"], [h.stats[m.chave], m.rotulo], [`${delta > 0 ? "+" : ""}${delta}`, "Nível"]]} />
        <p className="apoio" style={{ marginTop: 14, fontSize: 17 }}>{h.fato}</p>
        <dl className="linhas-dados linhas-dados--compacto">
          <div><dt>Minutos previstos × realizados</dt><dd>{h.previsao[0]}–{h.previsao[1]}% · {pct}%</dd></div>
          {h.titularidades != null && <div><dt>Titularidades</dt><dd>{h.titularidades} de {h.jogosTotal}</dd></div>}
          <div><dt>Nota média</dt><dd>{h.jogos ? fmt(h.media) : "—"}</dd></div>
          {extra.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          {h.reputacaoDelta != null && <div><dt>Reputação</dt><dd>{h.reputacaoDelta >= 0 ? "+" : ""}{fmt(h.reputacaoDelta)}</dd></div>}
        </dl>
        {h.campanha && (
          <p className="estimativa">
            {h.posicaoLiga ? `${h.clubeNome} terminou em ${h.posicaoLiga}º na ${h.ligaNome}${h.titulo ? " · campeão" : ""}` : `Campanha simulada do ${h.clubeNome}`}
            {` · ${h.campanha.v}V ${h.campanha.e}E ${h.campanha.d}D, ${h.campanha.pts} pontos`}
            {h.simplificada ? " · temporada simplificada, sem classificação oficial" : ""}.
          </p>
        )}
        {h.origem === "resumo" && <p className="estimativa">Parte desta temporada veio de uma versão anterior do jogo, sem registro jogo a jogo.</p>}
        <div className="disclosures">
          {h.partidas && h.partidas.length > 0 && (
            <button type="button" className="link link--esq" aria-expanded={aberto === "jogos"} onClick={() => setAberto(aberto === "jogos" ? null : "jogos")}>Jogos da temporada ({h.partidas.length})</button>
          )}
          {aberto === "jogos" && <ol className="lista-partidas">{h.partidas!.map((p) => <LinhaPartida key={p.chave} p={p} funcao={h.funcao} />)}</ol>}
          {!h.simplificada && c.temporada?.ano === h.ano && (
            <button type="button" className="link link--esq" aria-expanded={aberto === "tabela"} onClick={() => setAberto(aberto === "tabela" ? null : "tabela")}>Classificação</button>
          )}
          {aberto === "tabela" && (
            <table className="tabela-liga">
              <caption className="sr-only">Classificação final da {h.ligaNome}</caption>
              <thead><tr><th scope="col">#</th><th scope="col">Clube</th><th scope="col">J</th><th scope="col">V</th><th scope="col">SG</th><th scope="col">Pts</th></tr></thead>
              <tbody>
                {tabela.map((l, i) => (
                  <tr key={l.clubeId} aria-current={l.clubeId === h.clubeId ? "true" : undefined}>
                    <td>{i + 1}</td><td>{cat.clube(l.clubeId)?.nome}</td><td>{l.j}</td><td>{l.v}</td><td>{l.gp - l.gc}</td><td>{l.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="estimativa">Nível, nota e reputação são simulações do jogo.</p>
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
            <p>Temporada {String(p.contexto.ano)}. Critérios: nível {String(p.contexto.nivel)} (exigência da seleção: {String(p.contexto.exigencia)}), reputação {String(p.contexto.reputacao ?? "—")}, titularidade no clube e liga de nível competitivo.</p>
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
