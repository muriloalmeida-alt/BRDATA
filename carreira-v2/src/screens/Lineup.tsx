// CAP03-T01 — Escalação (referencias_anteriores/escalacao.png).
// Campo com a formação real, banco completo, troca de formação (grava na
// hora, como no legado) e toque no jogador → "Quem entra?". Tática,
// instruções, escalação automática e esquemas continuam na versão atual
// (linha "Tática e instruções", decisão de 01/11).
import { useEffect, useRef, useState } from "react";
import { FORMATION_IDS, shortName, type LineupModel } from "../domain/lineup.ts";
import { PitchPlayers } from "../ui/pitch.tsx";
import type { HomeModel } from "../domain/home.ts";
import { CtaLink, Jersey, TabBar, Wordmark } from "../ui/components.tsx";
import { IconArrow, IconBack, IconCheck, IconChevron, IconDown } from "../ui/icons.tsx";
import { BASE, Link, goBack } from "../ui/router.tsx";
import { legacyHref } from "../adapters/legacy.ts";
import "./lineup.css";

function FormationSheet({ current, busy, error, onPick, onClose }: { current: string; busy: boolean; error: string | null; onPick: (f: string) => void; onClose: () => void }) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => { first.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        <h2 id="sheet-title" className="sheet-title">Formação</h2>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <div className="sheet-list" role="radiogroup" aria-labelledby="sheet-title">
          {FORMATION_IDS.map((f) => (
            <button key={f} ref={f === current ? first : undefined} type="button" role="radio" aria-checked={f === current}
              className={`sheet-opt${f === current ? " is-on" : ""}`} disabled={busy} onClick={() => onPick(f)}>
              <span>{f}</span>
              {f === current && <IconCheck className="sheet-check" />}
            </button>
          ))}
        </div>
        <button type="button" className="text-btn" onClick={onClose}>Cancelar</button>
      </div>
    </div>
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
          <a className="lu-more" href={legacyHref("elenco")}>Ver elenco<IconArrow /></a>
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
