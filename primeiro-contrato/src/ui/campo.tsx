// Campo inteiro em 4–2–3–1 (PC-001): 11 alvos independentes, nome acessível
// por extenso, toque mínimo de 44 px, seleção única. Setas do teclado movem a
// seleção como num grupo de rádio.
import { useRef, type KeyboardEvent } from "react";
import { POSICOES, type Posicao } from "../engine/posicoes.ts";

const Y = [0.22, 0.37, 0.585, 0.745, 0.925];

export function CampoPosicoes({ valor, onEscolher }: { valor: Posicao | null; onEscolher: (p: Posicao) => void }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const ordem = POSICOES.map((p) => p.id);
  const teclado = (e: KeyboardEvent, atual: Posicao) => {
    const i = ordem.indexOf(atual);
    let j = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % ordem.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + ordem.length) % ordem.length;
    if (j >= 0) { e.preventDefault(); onEscolher(ordem[j]); refs.current[ordem[j]]?.focus(); }
  };
  const focavel = valor ?? "CA";
  return (
    <div className="campo-pos" role="radiogroup" aria-label="Posição em campo, formação 4–2–3–1">
      <svg className="linhas" viewBox="0 0 360 400" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id="gramado" width="360" height="80" patternUnits="userSpaceOnUse">
            <rect width="360" height="40" fill="#1d3b1f" /><rect y="40" width="360" height="40" fill="#18321a" />
          </pattern>
        </defs>
        <polygon points="24,2 336,2 358,398 2,398" fill="url(#gramado)" stroke="#f5f7fa" strokeWidth="2.5" strokeLinejoin="round" />
        <g fill="none" stroke="#f5f7fa" strokeWidth="2" opacity=".9">
          <line x1="13" y1="190" x2="347" y2="190" />
          <circle cx="180" cy="190" r="38" />
          <rect x="100" y="2" width="160" height="58" />
          <rect x="142" y="2" width="76" height="22" />
          <path d="M152 60 Q180 78 208 60" />
          <rect x="86" y="338" width="188" height="60" />
          <rect x="136" y="374" width="88" height="24" />
          <path d="M150 338 Q180 318 210 338" />
        </g>
        <circle cx="180" cy="190" r="2.5" fill="#f5f7fa" />
      </svg>
      {POSICOES.map((p) => {
        const sel = valor === p.id;
        return (
          <button key={p.id} ref={(el) => { refs.current[p.id] = el; }} type="button" role="radio" aria-checked={sel} aria-label={p.nome}
            tabIndex={p.id === focavel ? 0 : -1} className="alvo" style={{ left: `${p.coluna * 100}%`, top: `${Y[p.linha] * 100}%` }}
            onClick={() => onEscolher(p.id)} onKeyDown={(e) => teclado(e, p.id)}>
            <span className="chip" aria-hidden="true">{p.sigla}</span>
            {sel && <span className="alvo-nome" aria-hidden="true">{p.nome}</span>}
          </button>
        );
      })}
    </div>
  );
}
