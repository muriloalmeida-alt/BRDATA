// CAP03-T01 — Escalação (referencias_anteriores/escalacao.png).
// Campo com a formação real, banco completo, troca de formação (grava na
// hora, como no legado) e toque no jogador → "Quem entra?". Tática,
// instruções, escalação automática e esquemas continuam na versão atual
// (linha "Tática e instruções", decisão de 01/11).
import { useRef, useState, type KeyboardEvent } from "react";
import { FORMATION_IDS, shortName, type LineupModel } from "../domain/lineup.ts";
import { PitchPlayers } from "../ui/pitch.tsx";
import type { HomeModel } from "../domain/home.ts";
import { CtaLink, Jersey, TabBar, Wordmark } from "../ui/components.tsx";
import { IconArrow, IconBack, IconCheck, IconChevron, IconDown } from "../ui/icons.tsx";
import { BASE, Link, goBack } from "../ui/router.tsx";
import { legacyHref } from "../adapters/legacy.ts";
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

export function Lineup({ m, cta, onFormation }: { m: LineupModel; cta: HomeModel["cta"]; onFormation: (f: string) => Promise<string | null> }) {
  const [sheet, setSheet] = useState(false);
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
        <a className="row lu-legacy" href={legacyHref("escalacao")}>
          <span className="row-body"><span className="row-title">Tática e instruções</span><span className="row-sub">Ritmo, pressão, instruções, escalação automática e esquemas</span></span>
          <IconChevron className="row-chevron" />
        </a>
      </div>

      <TabBar current="elenco" />
      {sheet && <FormationSheet current={m.formation} busy={busy} error={error} onPick={pick} onClose={() => { if (!busy) { setSheet(false); setError(null); } }} />}
    </div>
  );
}
