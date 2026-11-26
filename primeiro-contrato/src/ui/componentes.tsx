// Componentes do Primeiro Contrato (PC-001): header só com o símbolo T,
// CTA Touchline, respostas de decisão, escudo por ID, fundos e camisa.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Catalogo } from "../engine/catalogo.ts";

const BASE = import.meta.env.BASE_URL;

export const Seta = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
);
export const Check = () => (
  <svg className="check" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="13" fill="#b4e64b" /><path d="M8 14.5l4 4 8-8.5" fill="none" stroke="#0b1508" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const Lupa = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></svg>
);
export const Abaixo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
);
export const Direita = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
);
export const Menos = () => (<svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>);
export const Mais = () => (<svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg>);

/** Header universal: só o símbolo oficial T, à esquerda. */
export function Header() {
  return (
    <header className="header">
      <img src={`${BASE}marca-t.webp`} width="198" height="160" alt="Touchline" />
    </header>
  );
}

/** Título da tela: recebe o foco ao trocar de tela (leitor de tela e teclado). */
export function Titulo({ children, grande, id }: { children: ReactNode; grande?: boolean; id?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return <h1 ref={ref} id={id} tabIndex={-1} className={`titulo${grande ? " titulo--lg" : ""}`} style={{ outline: "none" }}>{children}</h1>;
}

export function Cta({ children, onClick, desabilitado, secundario, rotulo }: { children: ReactNode; onClick: () => void; desabilitado?: boolean; secundario?: boolean; rotulo?: string }) {
  return (
    <button type="button" className={`cta${secundario ? " cta--sec" : ""}`} aria-disabled={desabilitado || undefined} aria-label={rotulo}
      onClick={() => { if (!desabilitado) onClick(); }}>
      {children}{!secundario && <Seta />}
    </button>
  );
}

export type OpcaoUI = { id: string; rotulo: string; detalhe?: string };

/** Respostas com o mesmo peso; a escolhida fica lima; o jogador confirma. */
export function Opcoes({ opcoes, valor, onEscolher, rotulo }: { opcoes: OpcaoUI[]; valor: string | null; onEscolher: (id: string) => void; rotulo: string }) {
  return (
    <div className="opcoes" role="radiogroup" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={valor === o.id} className={`opcao${o.detalhe ? "" : " opcao--simples"}`} onClick={() => onEscolher(o.id)}>
          <span className="opcao-titulo">{o.rotulo}</span>
          {o.detalhe && <span className="opcao-detalhe">{o.detalhe}</span>}
          <Seta />
        </button>
      ))}
    </div>
  );
}

/** Escudo original resolvido por ID; iniciais só quando o ativo falta ou falha. */
/** `preguicoso` só em listas longas (catálogo): no Safari, imagem preguiçosa
 *  dentro de contêiner com rolagem própria pode não carregar a tempo. */
export function Escudo({ cat, clubeId, nome, tamanho, preguicoso }: { cat: Catalogo | null; clubeId: string; nome?: string; tamanho: number; preguicoso?: boolean }) {
  const clube = cat?.clube(clubeId);
  const src = clube?.escudo ?? null;
  const [falhou, setFalhou] = useState<string | null>(null);
  const nomeFinal = clube?.nome ?? nome ?? "";
  const iniciais = (clube?.sigla ?? nomeFinal.split(/\s+/).map((p) => p[0]).join("")).slice(0, 3).toUpperCase();
  return (
    <span className="escudo" style={{ width: tamanho, height: tamanho }} aria-hidden="true">
      {src && falhou !== src
        ? <span className="escudo-placa"><img src={src} alt="" loading={preguicoso ? "lazy" : "eager"} decoding="async" onError={() => setFalhou(src)} /></span>
        : <span className="escudo-iniciais" style={{ fontSize: Math.round(tamanho * (iniciais.length > 2 ? 0.3 : 0.38)) }}>{iniciais}</span>}
    </span>
  );
}

export type NomeFundo = "01_tunel" | "02_estadio" | "03_conversa_treinador" | "04_despedida"
  | "plano-treinador" | "disputa-por-vaga" | "entrevista-pos-jogo" | "volta-ao-treino" | "gol-decisivo";
const FOCO: Record<NomeFundo, string> = {
  "01_tunel": "64% 53%", "02_estadio": "50% 49%", "03_conversa_treinador": "50% 45%", "04_despedida": "52% 49%",
  // PC-002 (ASSETS.md): preservar rostos e a ação principal no recorte.
  "plano-treinador": "35% 50%", "disputa-por-vaga": "45% 42%", "entrevista-pos-jogo": "55% 40%", "volta-ao-treino": "55% 45%", "gol-decisivo": "55% 50%",
};

/** Fundo de produção como camada independente, fora da árvore acessível. */
export function Fundo({ nome, modo, foco, reserva = "02_estadio" }: { nome: NomeFundo; modo: "cheio" | "topo" | "palco"; foco?: string; reserva?: NomeFundo }) {
  const [falhou, setFalhou] = useState(false);
  const n = falhou ? reserva : nome;
  return (
    <div className={`fundo fundo--${modo}`} aria-hidden="true">
      <img key={n} src={`${BASE}fundos/${n}.webp`} alt="" decoding="async" style={{ objectPosition: falhou ? FOCO[n] : foco ?? FOCO[n] }} onError={() => setFalhou(true)} />
    </div>
  );
}

/** Foto no fluxo da tela: ocupa o espaço que sobra (até `altura`), para a
 *  tela caber sem rolar quando possível. Se a cena falhar, usa o fundo original
 *  compatível (`reserva`), como pede o ASSETS.md. */
export function Foto({ nome, foco, altura, reserva = "02_estadio" }: { nome: NomeFundo; foco?: string; altura?: number; reserva?: NomeFundo }) {
  const [falhou, setFalhou] = useState(false);
  const n = falhou ? reserva : nome;
  return (
    <div className="foto" aria-hidden="true" style={altura ? { maxHeight: altura } : undefined}>
      <img key={n} src={`${BASE}fundos/${n}.webp`} alt="" decoding="async" style={{ objectPosition: falhou ? FOCO[n] : foco ?? FOCO[n] }} onError={() => setFalhou(true)} />
    </div>
  );
}

/** Camisa dinâmica (número do jogador; cores do clube quando houver). */
export function Camisa({ numero, cor }: { numero: number; cor?: string | null }) {
  const corFaixa = cor && cor.toLowerCase() !== "#ffffff" ? cor : "#14171c";
  const gid = useId().replace(/:/g, "");
  return (
    <svg className="camisa" viewBox="0 0 240 210" role="img" aria-label={`Camisa número ${numero}`}>
      <defs>
        <linearGradient id={`${gid}s`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7f8fa" /><stop offset="1" stopColor="#c9ced6" /></linearGradient>
        <clipPath id={`${gid}c`}><path d="M78 8 L102 4 Q120 18 138 4 L162 8 L222 40 L204 92 L180 80 L180 206 L60 206 L60 80 L36 92 L18 40 Z" /></clipPath>
      </defs>
      <g clipPath={`url(#${gid}c)`}>
        <rect width="240" height="210" fill={`url(#${gid}s)`} />
        <path d="M150 0 L210 0 L90 210 L30 210 Z" fill={corFaixa} opacity=".95" />
        <path d="M102 4 Q120 22 138 4" fill="none" stroke="#14171c" strokeWidth="6" />
      </g>
      <text x="120" y="150" textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif" fontWeight="700" fontSize="92" fill="#14171c" stroke="#f7f8fa" strokeWidth="3" paintOrder="stroke">{numero}</text>
    </svg>
  );
}

/** Folha de seleção em tela cheia (nacionalidade). */
export function Folha({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[aria-checked='true'], button")?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);
  return (
    <div className="folha" role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
      <div className="folha-topo"><h2>{titulo}</h2><button type="button" className="fechar" onClick={onFechar}>Fechar</button></div>
      <div className="folha-lista">{children}</div>
    </div>
  );
}

export function Dialogo({ titulo, texto, confirmar, onConfirmar, onCancelar }: { titulo: string; texto: string; confirmar: string; onConfirmar: () => void; onCancelar: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>("button")?.focus(); }, []);
  return (
    <div className="dialogo-fundo" onClick={onCancelar}>
      <div className="dialogo" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" ref={ref} onClick={(e) => e.stopPropagation()}>
        <h2 id="dlg-t">{titulo}</h2>
        <p className="apoio apoio--muted" style={{ margin: 0 }}>{texto}</p>
        <Cta onClick={onConfirmar}>{confirmar}</Cta>
        <button type="button" className="link" onClick={onCancelar}>Voltar</button>
      </div>
    </div>
  );
}

export function Consequencia({ texto }: { texto: string | null }) {
  return <div role="status" aria-live="polite">{texto ? <p className="consequencia">{texto}</p> : null}</div>;
}
