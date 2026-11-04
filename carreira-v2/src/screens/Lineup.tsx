// CAP03-T01 — Escalação (referencias_anteriores/escalacao.png).
// Campo com a formação real, banco completo, troca de formação (grava na
// hora, como no legado) e toque no jogador → "Quem entra?". Fase 6: "Tática e
// instruções" abre a tática da v2 e "Escalar automaticamente" (com
// confirmação) usa a mesma escalação automática do jogo.
import { useRef, useState, type KeyboardEvent } from "react";
import { FORMATION_IDS, shortName, type LineupModel } from "../domain/lineup.ts";
import { PitchPlayers } from "../ui/pitch.tsx";
import type { HomeModel } from "../domain/home.ts";
import { CtaLink, Jersey, TabBar, Wordmark } from "../ui/components.tsx";
import { IconArrow, IconBack, IconCheck, IconChevron, IconDown } from "../ui/icons.tsx";
import { BASE, Link, goBack } from "../ui/router.tsx";
import { Sheet } from "../ui/dialog.tsx";
import "./lineup.css";

// Folha de formação (AUD-04): diálogo da ui/dialog.tsx e radiogroup com
// foco "roving" — só a opção marcada entra no Tab; as setas (↑↓←→, Home,
// End) movem o foco entre as opções e Enter/Espaço escolhe. As setas não
// escolhem sozinhas porque escolher grava na hora (como no legado): passar
// por 13 formações não pode virar 13 gravações. Durante a gravação a folha
// não fecha por Escape nem pelo fundo.
function FormationSheet({ current, busy, error, onPick, onClose }: { current: string; busy: boolean; error: string | null; onPick: (f: string) => void; onClose: () => void }) {
  const [focusIdx, setFocusIdx] = useState(Math.max(0, FORMATION_IDS.indexOf(current)));
  const opts = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (i: number) => {
    const n = FORMATION_IDS.length;
    const next = ((i % n) + n) % n;
    setFocusIdx(next);
    opts.current[next]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    const k = e.key;
    if (k === "ArrowDown" || k === "ArrowRight") { e.preventDefault(); move(focusIdx + 1); }
    else if (k === "ArrowUp" || k === "ArrowLeft") { e.preventDefault(); move(focusIdx - 1); }
    else if (k === "Home") { e.preventDefault(); move(0); }
    else if (k === "End") { e.preventDefault(); move(FORMATION_IDS.length - 1); }
  };
  return (
    <Sheet labelledBy="sheet-title" onDismiss={busy ? undefined : onClose}>
      <h2 id="sheet-title" className="sheet-title">Formação</h2>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="sheet-list" role="radiogroup" aria-labelledby="sheet-title" aria-busy={busy} onKeyDown={onKey}>
        {FORMATION_IDS.map((f, i) => (
          <button key={f} ref={(el) => { opts.current[i] = el; }} type="button" role="radio" aria-checked={f === current}
            tabIndex={i === focusIdx ? 0 : -1} data-autofocus={f === current ? "" : undefined}
            className={`sheet-opt${f === current ? " is-on" : ""}`} aria-disabled={busy || undefined}
            onFocus={() => setFocusIdx(i)} onClick={() => { if (!busy) onPick(f); }}>
            <span>{f}</span>
            {f === current && <IconCheck className="sheet-check" />}
          </button>
        ))}
      </div>
      <button type="button" className="text-btn" disabled={busy} onClick={onClose}>Cancelar</button>
    </Sheet>
  );
}

export function Lineup({ m, cta, onFormation, onAutoLineup }: {
  m: LineupModel; cta: HomeModel["cta"]; onFormation: (f: string) => Promise<string | null>;
  onAutoLineup?: (includeBase: boolean) => Promise<string | null>;
}) {
  const [sheet, setSheet] = useState(false);
  const [auto, setAuto] = useState(false);
  const [autoBase, setAutoBase] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoErr, setAutoErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (f: string) => {
    if (f === m.formation) { setSheet(false); return; }
    setBusy(true); setError(null);
    const err = await onFormation(f);
    setBusy(false);
    if (err) setError(err); else setSheet(false);
  };

  return (
    <div className="lu">
      <header className="sub-head">
        <button type="button" className="back-btn" onClick={() => goBack(`${BASE}/`)} aria-label="Voltar"><span className="back-box"><IconBack /></span></button>
        <Wordmark />
        <span className="sub-head-ctx sub-head-ctx--gold">{m.clubName.toUpperCase()}</span>
      </header>

      <h1 className="screen-title">Escale seu time.</h1>
      <p className="screen-sub">Toque em um jogador para trocar.</p>
      <div className="lu-formation">
        <span className="kicker-caps" id="lu-form-label">Formação</span>
        <button type="button" className="lu-form-btn" aria-haspopup="dialog" aria-labelledby="lu-form-label lu-form-val" onClick={() => setSheet(true)}>
          <span id="lu-form-val">{m.formation}</span><IconDown />
        </button>
      </div>

      <section className="lu-pitch" aria-label={`Titulares, formação ${m.formation}`}>
        <PitchPlayers rows={m.rows} slotHref={(i) => `${BASE}/escalacao/trocar?vaga=${i}`} />
      </section>

      <section className="lu-bench" aria-labelledby="lu-bench-title">
        <div className="lu-bench-head">
          <h2 className="kicker-caps" id="lu-bench-title">Banco de reservas</h2>
          <Link className="lu-more" to={`${BASE}/elenco`}>Ver elenco<IconArrow /></Link>
        </div>
        {m.bench.length ? (
          <div className="lu-bench-grid">
            {m.bench.map(({ player, out }) => (
              <Link key={player.id} to={`${BASE}/escalacao/trocar?reserva=${encodeURIComponent(player.id)}`} className="lu-res"
                aria-label={`Reserva: ${player.name}, overall ${player.overall}${out ? `, ${out.toLowerCase()}` : ""}. Trocar`}>
                <span className="lu-jersey">
                  <Jersey value={player.overall} gk={player.group === "G"} />
                  {out && <span className="lu-out" aria-hidden="true">!</span>}
                </span>
                <span className="lu-name">{shortName(player.name)}</span>
              </Link>
            ))}
          </div>
        ) : <p className="lu-empty">Nenhum reserva no banco.</p>}
      </section>

      <div className="lu-foot">
        <CtaLink cta={cta} className="cta cta--inline" />
        <Link className="row lu-legacy" to={`${BASE}/tatica`}>
          <span className="row-body"><span className="row-title">Tática e instruções</span><span className="row-sub">Ritmo, pressão, setores, esquemas e marcação</span></span>
          <IconChevron className="row-chevron" />
        </Link>
        {onAutoLineup && (
          <button type="button" className="row lu-legacy lu-auto" onClick={() => { setAutoErr(null); setAuto(true); }}>
            <span className="row-body"><span className="row-title">Escalar automaticamente</span><span className="row-sub">Os melhores por posição na formação {m.formation}</span></span>
            <IconChevron className="row-chevron" />
          </button>
        )}
      </div>

      <TabBar current="elenco" />
      {auto && onAutoLineup && (
        <Sheet alert labelledBy="au-t" describedBy="au-d" onDismiss={autoBusy ? undefined : () => setAuto(false)}>
          <h2 id="au-t" className="sheet-title">Escalar automaticamente?</h2>
          <p id="au-d" className="lu-auto-text">Os titulares e o banco atuais são substituídos pelos melhores overalls por posição na formação {m.formation}.</p>
          <button type="button" role="checkbox" aria-checked={autoBase} className="lu-auto-check" onClick={() => setAutoBase(!autoBase)}>
            {autoBase ? <IconCheck className="lu-auto-ico" /> : <span className="lu-auto-box" aria-hidden="true" />}Incluir jovens da base
          </button>
          {autoErr && <p className="inline-error" role="alert">{autoErr}</p>}
          <button type="button" className="cta" aria-disabled={autoBusy || undefined} onClick={async () => {
            if (autoBusy) return;
            setAutoBusy(true); setAutoErr(null);
            const err = await onAutoLineup(autoBase);
            setAutoBusy(false);
            if (err) setAutoErr(err); else setAuto(false);
          }}>{autoBusy ? "Escalando…" : "Escalar"}</button>
          <button type="button" className="text-btn" data-autofocus disabled={autoBusy} onClick={() => setAuto(false)}>Cancelar</button>
        </Sheet>
      )}
      {sheet && <FormationSheet current={m.formation} busy={busy} error={error} onPick={pick} onClose={() => { if (!busy) { setSheet(false); setError(null); } }} />}
    </div>
  );
}
