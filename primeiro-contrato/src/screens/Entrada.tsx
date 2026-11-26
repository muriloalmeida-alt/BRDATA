// Telas de entrada (PC-001): Sua carreira, Seu jogador, Onde você joga?,
// Escolha seu clube e Seu primeiro contrato.
import { useEffect, useMemo, useRef, useState } from "react";
import { NACIONALIDADES, NAC } from "../engine/atleta.ts";
import { buscarClubes, rotuloInscricao, type Catalogo } from "../engine/catalogo.ts";
import { POS, type Posicao } from "../engine/posicoes.ts";
import { novaCarreira, propostaInicial, sugestoesIniciais } from "../engine/carreira.ts";
import { formatarDinheiro } from "../engine/financas.ts";
import { Abaixo, Camisa, Check, Cta, Direita, Escudo, Folha, Fundo, Header, Lupa, Mais, Menos, Titulo } from "../ui/componentes.tsx";
import { CampoPosicoes } from "../ui/campo.tsx";

export type Rascunho = { semente: string; apelido: string; nacionalidade: string; numero: number; posicao: Posicao | null; clubeId: string | null };

export function TelaInicio({ temSave, onNova, onContinuar }: { temSave: boolean; onNova: () => void; onContinuar: () => void }) {
  return (
    <main className="tela">
      <Fundo nome="01_tunel" modo="cheio" />
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 14 }}>
        <Titulo grande>Sua carreira</Titulo>
        <p className="apoio" style={{ maxWidth: 290 }}>Comece sua trajetória no futebol mundial.</p>
        <div style={{ flex: 1 }} />
      </div>
      <div className="acoes">
        <Cta onClick={onNova}>Nova carreira</Cta>
        {temSave && <button type="button" className="link" onClick={onContinuar}>Continuar carreira</button>}
      </div>
    </main>
  );
}

export function TelaJogador({ r, onMudar, onAvancar }: { r: Rascunho; onMudar: (p: Partial<Rascunho>) => void; onAvancar: () => void }) {
  const [folha, setFolha] = useState(false);
  const nac = NAC[r.nacionalidade];
  return (
    <main className="tela">
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 14 }}>
        <Titulo grande>Seu jogador</Titulo>
        <p className="apoio apoio--muted" style={{ marginTop: 6 }}>Defina os primeiros detalhes da sua carreira.</p>
        <Camisa numero={r.numero} />
        <label className="rotulo" htmlFor="apelido" style={{ marginTop: 18 }}>Apelido <small>(opcional)</small></label>
        <input id="apelido" className="campo" placeholder="Ex.: Cadu" value={r.apelido} maxLength={24} autoComplete="off"
          onChange={(e) => onMudar({ apelido: e.target.value })} />
        <div style={{ height: 12 }} />
        <button type="button" className="linha-form" onClick={() => setFolha(true)} aria-haspopup="dialog">
          <span>Nacionalidade</span><span>{nac?.nome}<Direita /></span>
        </button>
        <span className="rotulo" id="num-rot" style={{ marginTop: 16 }}>Número da camisa</span>
        <div className="stepper" role="group" aria-labelledby="num-rot">
          <button type="button" aria-label="Diminuir número" onClick={() => onMudar({ numero: r.numero <= 1 ? 99 : r.numero - 1 })}><Menos /></button>
          <output aria-live="polite">{r.numero}</output>
          <button type="button" aria-label="Aumentar número" onClick={() => onMudar({ numero: r.numero >= 99 ? 1 : r.numero + 1 })}><Mais /></button>
        </div>
      </div>
      <div className="acoes"><Cta onClick={onAvancar}>Escolher posição</Cta></div>
      {folha && (
        <Folha titulo="Nacionalidade" onFechar={() => setFolha(false)}>
          <div role="radiogroup" aria-label="Nacionalidade">
            {NACIONALIDADES.map((n) => (
              <button key={n.id} type="button" role="radio" aria-checked={n.id === r.nacionalidade} className="opcao-lista"
                onClick={() => { onMudar({ nacionalidade: n.id }); setFolha(false); }}>
                <span>{n.nome}</span>{n.id === r.nacionalidade && <Check />}
              </button>
            ))}
          </div>
        </Folha>
      )}
    </main>
  );
}

export function TelaPosicao({ r, onMudar, onAvancar }: { r: Rascunho; onMudar: (p: Partial<Rascunho>) => void; onAvancar: () => void }) {
  return (
    <main className="tela">
      <Fundo nome="02_estadio" modo="topo" />
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 70 }}>
        <Titulo>Onde você joga?</Titulo>
        <CampoPosicoes valor={r.posicao} onEscolher={(p) => onMudar({ posicao: p })} />
        <p className="sr-only" aria-live="polite">{r.posicao ? `Selecionado: ${POS[r.posicao].nome}` : ""}</p>
      </div>
      <div className="acoes"><Cta onClick={onAvancar} desabilitado={!r.posicao}>Escolher clube</Cta></div>
    </main>
  );
}

const PAGINA = 40;

export function TelaClube({ cat, r, lista, onLista, onMudar, onAvancar }: {
  cat: Catalogo; r: Rascunho;
  lista: { texto: string; pais: string; ligaId: string; mostrar: number; rolagem: number };
  onLista: (l: Partial<{ texto: string; pais: string; ligaId: string; mostrar: number; rolagem: number }>) => void;
  onMudar: (p: Partial<Rascunho>) => void; onAvancar: () => void;
}) {
  const paises = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of cat.ligas) m.set(l.pais, l.continente);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0], "pt-BR"));
  }, [cat]);
  const ligas = useMemo(() => cat.ligas.filter((l) => !lista.pais || l.pais === lista.pais).sort((a, b) => a.pais.localeCompare(b.pais, "pt-BR") || a.divisao - b.divisao), [cat, lista.pais]);
  const filtrando = !!(lista.texto.trim() || lista.pais || lista.ligaId);
  const sugestoes = useMemo(() => {
    if (!r.posicao) return [];
    const c = novaCarreira(cat, { semente: r.semente, nacionalidade: r.nacionalidade, numero: r.numero, posicao: r.posicao });
    return sugestoesIniciais(cat, c);
  }, [cat, r.semente, r.nacionalidade, r.numero, r.posicao]);
  const resultado = useMemo(() => buscarClubes(cat, { texto: lista.texto, pais: lista.pais || undefined, ligaId: lista.ligaId || undefined }), [cat, lista.texto, lista.pais, lista.ligaId]);
  const restantes = filtrando ? resultado : resultado.filter((c) => !sugestoes.includes(c.id));
  const visiveis = restantes.slice(0, lista.mostrar);
  // Volta à posição anterior da lista (ao retornar do contrato).
  useEffect(() => { if (lista.rolagem) window.scrollTo(0, lista.rolagem); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const avancar = () => { onLista({ rolagem: window.scrollY }); onAvancar(); };
  const limpar = () => onLista({ texto: "", pais: "", ligaId: "", mostrar: PAGINA });
  const linha = (id: string) => {
    const c = cat.clube(id)!;
    const sel = r.clubeId === id;
    return (
      <li key={id}>
        <button type="button" role="radio" aria-checked={sel} className="clube" onClick={() => onMudar({ clubeId: id })}>
          <Escudo cat={cat} clubeId={id} tamanho={48} preguicoso />
          <span className="clube-corpo"><span className="clube-nome">{c.nome}</span><span className="clube-meta">{rotuloInscricao(cat, id)}</span></span>
          {sel && <Check />}
        </button>
      </li>
    );
  };
  return (
    <main className="tela">
      <Fundo nome="02_estadio" modo="topo" />
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 70 }}>
        <Titulo>Escolha seu clube</Titulo>
        <div className="busca">
          <Lupa />
          <input className="campo" type="search" placeholder="Buscar clube" aria-label="Buscar clube por nome ou sigla" value={lista.texto}
            onChange={(e) => onLista({ texto: e.target.value, mostrar: PAGINA })} />
        </div>
        <div className="filtros">
          <div className="select">
            <select aria-label="País" value={lista.pais} onChange={(e) => onLista({ pais: e.target.value, ligaId: "", mostrar: PAGINA })}>
              <option value="">País</option>
              {[...new Set(paises.map((p) => p[1]))].map((cont) => (
                <optgroup key={cont} label={cont}>
                  {paises.filter((p) => p[1] === cont).map(([p]) => <option key={p} value={p}>{p}</option>)}
                </optgroup>
              ))}
            </select><Abaixo />
          </div>
          <div className="select">
            <select aria-label="Liga" value={lista.ligaId} onChange={(e) => onLista({ ligaId: e.target.value, mostrar: PAGINA })}>
              <option value="">Liga</option>
              {ligas.map((l) => <option key={l.id} value={l.id}>{lista.pais ? l.nome : `${l.nome} (${l.pais})`}</option>)}
            </select><Abaixo />
          </div>
        </div>
        <div role="radiogroup" aria-label="Clubes">
          {!filtrando && sugestoes.length > 0 && (
            <>
              <p className="grupo">Sugestões para você</p>
              <ul className="lista-clubes" style={{ marginTop: 0 }}>{sugestoes.map(linha)}</ul>
              <p className="grupo">Todos os clubes · temporada {cat.temporada}</p>
            </>
          )}
          <ul className="lista-clubes" style={{ marginTop: filtrando ? 16 : 0 }} aria-live="polite">
            {visiveis.map((c) => linha(c.id))}
          </ul>
        </div>
        {restantes.length === 0 && (
          <div className="vazio">
            <p>Nenhum clube encontrado{lista.texto ? ` para “${lista.texto}”` : ""}.</p>
            <button type="button" className="link" onClick={limpar}>Limpar busca e filtros</button>
          </div>
        )}
        {restantes.length > lista.mostrar && (
          <button type="button" className="link" style={{ marginTop: 8 }} onClick={() => onLista({ mostrar: lista.mostrar + PAGINA })}>
            Mostrar mais ({restantes.length - lista.mostrar})
          </button>
        )}
        <p className="estimativa">Catálogo {cat.versao} · {cat.clubes.length} clubes · fonte Touchline</p>
      </div>
      <div className="acoes"><Cta onClick={avancar} desabilitado={!r.clubeId}>Ver proposta</Cta></div>
    </main>
  );
}

export function TelaContrato({ cat, r, onAssinar }: { cat: Catalogo; r: Rascunho; onAssinar: () => void }) {
  const of = useMemo(() => {
    const c = novaCarreira(cat, { semente: r.semente, nacionalidade: r.nacionalidade, numero: r.numero, posicao: r.posicao! });
    return propostaInicial(cat, c, r.clubeId!);
  }, [cat, r]);
  const enviando = useRef(false);
  return (
    <main className="tela">
      <Fundo nome="02_estadio" modo="topo" />
      <Header />
      <div className="tela-corpo" style={{ paddingTop: 70 }}>
        <Titulo>Seu primeiro contrato</Titulo>
        <div className="cartao-clube">
          <Escudo cat={cat} clubeId={of.clubeId} tamanho={76} />
          <strong>{of.clubeNome}</strong>
        </div>
        <dl className="linhas-dados">
          <div><dt>Papel previsto</dt><dd>{of.papel}</dd></div>
          <div><dt>Minutos previstos</dt><dd>{of.previsao[0]}–{of.previsao[1]}%</dd></div>
          <div><dt>Vínculo</dt><dd>{of.duracao} temporadas</dd></div>
          <div><dt>Salário</dt><dd>{formatarDinheiro(of.salario)}</dd></div>
        </dl>
      </div>
      <div className="acoes"><Cta onClick={() => { if (!enviando.current) { enviando.current = true; onAssinar(); } }}>Assinar contrato</Cta></div>
    </main>
  );
}

