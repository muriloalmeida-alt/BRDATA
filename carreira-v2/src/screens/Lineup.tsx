// CAP03-T01 — Escalação (referencias_anteriores/escalacao.png).
// Campo com a formação real, banco completo, troca de formação (grava na
// hora, como no legado) e toque no jogador → "Quem entra?". Tática,
// instruções, escalação automática e esquemas continuam na versão atual
// (linha "Tática e instruções", decisão de 01/11).
import { useEffect, useRef, useState } from "react";
import { FORMATION_IDS, shortName, type LineupModel, type PitchSlot } from "../domain/lineup.ts";
import type { HomeModel } from "../domain/home.ts";
import { Jersey, TabBar, Wordmark } from "../ui/components.tsx";
import { IconArrow, IconBack, IconCheck, IconChevron, IconDown } from "../ui/icons.tsx";
import { BASE, Link, goBackTo } from "../ui/router.tsx";
import { legacyHref } from "../adapters/legacy.ts";
import "./lineup.css";

// Centro horizontal (%) de cada camisa, pelo nº de jogadores na linha —
// medido na referência (3: 23/50/77; 4: 15/38/62/85).
const STEP: Record<number, number> = { 1: 0, 2: 30, 3: 27, 4: 23.5, 5: 18.5 };
const ROW_Y = [21, 45, 67, 89]; // ataque → goleiro (% da altura do campo)

function Slot({ s, x, y }: { s: PitchSlot; x: number; y: number }) {
  const label = s.player
    ? `${s.label}: ${s.player.name}, overall ${s.player.overall}${s.out ? `, ${s.out.toLowerCase()}` : ""}. Trocar`
    : `${s.label}: vaga vazia. Escolher jogador`;
  return (
    <Link to={`${BASE}/escalacao/trocar?vaga=${s.index}`} className="lu-slot" style={{ left: `${x}%`, top: `${y}%` }} aria-label={label}>
      <span className="lu-jersey">
        <Jersey value={s.player?.overall} gk={s.group === "G"} empty={!s.player} />
        {s.out && <span className="lu-out" aria-hidden="true">!</span>}
      </span>
      <span className="lu-name">{s.player ? shortName(s.player.name) : s.label}</span>
    </Link>
  );
}

function Pitch() {
  return (
    <svg className="lu-lines" viewBox="0 0 390 414" preserveAspectRatio="none" aria-hidden="true">
      <path d="M32 9H358L390 414H0Z" />
      <path d="M172 9V0h46v9" />
      <path d="M104 9v53h182V9M145 9v23h100V9" />
      <path d="M166 62a40 14 0 0 0 58 0" />
      <path d="M17 182h356" />
      <ellipse cx="195" cy="182" rx="53" ry="43" />
      <path d="M87 414v-80h216v80M133 414v-38h123v38" />
      <path d="M160 334a45 22 0 0 1 70 0" />
      <path d="M166 414v13h58v-13" />
      <path d="M32 18a9 9 0 0 0 9-9M349 9a9 9 0 0 0 9 9M0 404a10 10 0 0 1 10 10M380 414a10 10 0 0 1 10-10" />
    </svg>
  );
}

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
        <button type="button" className="back-btn" onClick={() => goBackTo(`${BASE}/`)} aria-label="Voltar ao início"><span className="back-box"><IconBack /></span></button>
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
        <Pitch />
        {m.rows.map((row, ri) => row.map((s, i) => (
          <Slot key={s.index} s={s} x={50 + (i - (row.length - 1) / 2) * (STEP[row.length] ?? 18)} y={ROW_Y[ri + (4 - m.rows.length)] ?? 50} />
        )))}
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
        <a className="cta cta--inline" href={legacyHref(cta.action)}>{cta.label}<IconArrow className="cta-arrow" /></a>
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
