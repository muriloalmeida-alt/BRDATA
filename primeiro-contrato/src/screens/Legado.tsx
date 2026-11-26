// Sua trajetória e Seu legado (PC-001), com o cartão compartilhável.
import { useState } from "react";
import { nomeExibicao } from "../engine/atleta.ts";
import type { Catalogo } from "../engine/catalogo.ts";
import { passagens, totais } from "../engine/carreira.ts";
import type { Carreira } from "../engine/estado.ts";
import { metricaPrincipal, POS } from "../engine/posicoes.ts";
import { Cta, Direita, Escudo, Header, Titulo } from "../ui/componentes.tsx";
import { compartilharCartao } from "../ui/cartao.ts";

const BASE = import.meta.env.BASE_URL;

export function TelaTrajetoria({ cat, c, onVoltar, rotuloVoltar }: { cat: Catalogo; c: Carreira; onVoltar: () => void; rotuloVoltar: string }) {
  const ps = passagens(c);
  const tot = totais(c);
  const [aberta, setAberta] = useState<number | null>(null);
  const m = metricaPrincipal(c.atleta.posicao);
  return (
    <main className="tela">
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 40 }}>
        <Titulo grande>Sua trajetória</Titulo>
        {ps.length === 0 && <p className="apoio apoio--muted">Sua primeira temporada ainda está em andamento. A trajetória aparece aqui a cada balanço.</p>}
        <ol className="timeline">
          {ps.map((p, i) => {
            const marcos = c.marcos.filter((x) => x.ano >= p.inicio && x.ano <= p.fim && (x.tipo === "convocacao" || x.tipo === "titulo"));
            return (
              <li key={`${p.clubeId}-${p.inicio}`} className="passagem">
                <button type="button" aria-expanded={aberta === i} onClick={() => setAberta(aberta === i ? null : i)}>
                  <Escudo cat={cat} clubeId={p.clubeId} nome={p.clubeNome} tamanho={46} />
                  <span className="passagem-titulo">{p.inicio} · {p.clubeNome}
                    <small>{p.emprestimo ? "Empréstimo · " : ""}{p.temporadas.length} {p.temporadas.length === 1 ? "temporada" : "temporadas"}{marcos.length ? ` · ${marcos.length} ${marcos.length === 1 ? "marco" : "marcos"}` : ""}</small>
                  </span>
                  <Direita />
                </button>
                {aberta === i && (
                  <ul className="temporadas">
                    {p.temporadas.map((t) => (
                      <li key={t.ano}>
                        <b>{t.ano} · {t.ligaNome}</b>
                        <span>{t.jogos} jogos · {t.minutos.toLocaleString("pt-BR")} min · {t.stats[m.chave]} {m.rotulo.toLowerCase()} · média {t.media.toLocaleString("pt-BR")}</span>
                        <span>{t.papel}{t.funcao !== c.atleta.posicao ? ` · jogou como ${POS[t.funcao].nome.toLowerCase()}` : ""}{t.emprestimo && t.origemNome ? ` · emprestado pelo ${t.origemNome}` : ""}</span>
                        {t.posicaoLiga && <span>{t.posicaoLiga}º lugar na liga</span>}
                        {t.origem === "resumo" && <span className="estimativa" style={{ margin: 0 }}>Resumo de versão anterior (sem jogo a jogo)</span>}
                      </li>
                    ))}
                    {marcos.map((x) => <li key={x.tipo + x.ano} className="marco">{x.ano} · {x.texto}</li>)}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
        <div className="totais">
          <div><b>{tot.jogos}</b><span>Jogos</span></div>
          <div><b>{tot.metrica}</b><span>{tot.rotulo}</span></div>
        </div>
      </div>
      <div className="acoes"><Cta onClick={onVoltar}>{rotuloVoltar}</Cta></div>
    </main>
  );
}

export function TelaLegado({ cat, c, onNova, onTrajetoria }: { cat: Catalogo; c: Carreira; onNova: () => void; onTrajetoria: () => void }) {
  const tot = totais(c);
  const [aviso, setAviso] = useState<string | null>(null);
  const compartilhar = async () => {
    setAviso(null);
    try {
      const r = await compartilharCartao(cat, c);
      setAviso(r === "baixado" ? "Cartão salvo como imagem." : r === "compartilhado" ? null : null);
    } catch {
      setAviso("Não foi possível gerar o cartão. Tente de novo.");
    }
  };
  return (
    <main className="tela">
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 30 }}>
        <Titulo grande>Seu legado</Titulo>
        <figure className="cartao-legado" aria-label={`Cartão de ${nomeExibicao(c.atleta)}: ${tot.jogos} jogos, ${tot.metrica} ${tot.rotulo.toLowerCase()}`}>
          <img className="foto-legado" src={`${BASE}fundos/04_despedida.webp`} alt="" aria-hidden="true" />
          <img className="marca" src={`${BASE}marca-t.webp`} alt="" aria-hidden="true" />
          <span className="num-camisa" aria-hidden="true">{c.atleta.numero}</span>
          <figcaption className="legado-corpo">
            <p className="legado-nome">{nomeExibicao(c.atleta)}</p>
            <div className="legado-num">
              <div><b>{tot.jogos}</b><span>Jogos</span></div>
              <div><b>{tot.metrica}</b><span>{tot.rotulo}</span></div>
            </div>
          </figcaption>
        </figure>
        <button type="button" className="link" style={{ marginTop: 6 }} onClick={onTrajetoria}>Ver trajetória</button>
        <div role="status" aria-live="polite">{aviso && <p className="estimativa" style={{ textAlign: "center" }}>{aviso}</p>}</div>
      </div>
      <div className="acoes">
        <Cta onClick={compartilhar}>Compartilhar carreira</Cta>
        <Cta secundario onClick={onNova}>Nova carreira</Cta>
      </div>
    </main>
  );
}
