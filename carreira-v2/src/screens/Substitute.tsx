// CAP03-T02 — Escolher substituto (referencias_anteriores/escolher_substituto.png).
// "Vai sair" + elenco disponível (mesmo universo do seletor do legado).
// A troca só é gravada em "Confirmar troca"; "Cancelar" volta sem mexer.
import { useState } from "react";
import { GROUP_WORD, shortName, type SubstituteModel } from "../domain/lineup.ts";
import { Jersey, Wordmark } from "../ui/components.tsx";
import { IconArrow, IconBack, IconCheck } from "../ui/icons.tsx";
import { BASE, goBackTo } from "../ui/router.tsx";
import "./lineup.css";

const WHERE = { titular: "Titular", banco: "No banco" } as const;

export function Substitute({ m, onConfirm }: { m: SubstituteModel; onConfirm: (playerId: string) => Promise<string | null> }) {
  const [sel, setSel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const back = () => goBackTo(`${BASE}/escalacao`);
  const out = m.outgoing;
  const chosen = m.options.find((o) => o.player.id === sel)?.player || null;
  const outName = out ? shortName(out.name) : null;

  const confirm = async () => {
    if (!sel || busy) return;
    setBusy(true); setError(null);
    const err = await onConfirm(sel);
    if (err) { setError(err); setBusy(false); }
  };

  return (
    <div className="qs">
      <header className="sub-head">
        <button type="button" className="back-btn back-btn--bare" onClick={back} aria-label="Voltar à escalação"><IconBack /></button>
        <Wordmark />
        <span className="sub-head-ctx">Escalação</span>
      </header>

      <h1 className="screen-title">Quem entra?</h1>
      <p className="screen-sub">{outName ? `Escolha o substituto de ${outName}.` : `Escolha quem entra na vaga ${m.slotLabel}.`}</p>

      <section className="qs-out" aria-labelledby="qs-out-title">
        <h2 className="kicker-caps" id="qs-out-title">Vai sair</h2>
        <div className="qs-out-row">
          {out ? (
            <>
              <Jersey value={out.overall} gk={out.group === "G"} size={52} />
              <span className="qs-body"><span className="qs-name">{outName}</span><span className="qs-pos">{GROUP_WORD[out.group]}</span></span>
            </>
          ) : (
            <>
              <Jersey empty size={52} />
              <span className="qs-body"><span className="qs-name">Vaga vazia</span><span className="qs-pos">{m.slotLabel}</span></span>
            </>
          )}
        </div>
      </section>

      <section className="qs-list" aria-labelledby="qs-list-title">
        <h2 className="kicker-caps" id="qs-list-title">Jogadores disponíveis</h2>
        <p className="qs-hint" id="qs-hint">Selecione um jogador do elenco.</p>
        {m.options.length ? (
          <div role="radiogroup" aria-labelledby="qs-list-title" aria-describedby="qs-hint">
            {m.options.map(({ player, where }) => {
              const on = player.id === sel;
              return (
                <button key={player.id} type="button" role="radio" aria-checked={on} className={`qs-opt${on ? " is-on" : ""}`} onClick={() => setSel(player.id)}
                  aria-label={`${player.name}, ${GROUP_WORD[player.group]}, overall ${player.overall}${where ? `, ${WHERE[where].toLowerCase()}` : ""}`}>
                  <Jersey value={player.overall} gk={player.group === "G"} size={46} />
                  <span className="qs-body">
                    <span className="qs-name">{shortName(player.name)}</span>
                    <span className="qs-pos">{GROUP_WORD[player.group]}{where ? ` · ${WHERE[where]}` : ""}</span>
                  </span>
                  <span className="qs-radio" aria-hidden="true">{on && <IconCheck />}</span>
                </button>
              );
            })}
          </div>
        ) : <p className="lu-empty">Nenhum jogador disponível.</p>}
      </section>

      <div className="qs-foot">
        {chosen && <p className="qs-summary" aria-live="polite">{outName || m.slotLabel}<IconArrow />{shortName(chosen.name)}</p>}
        {error && <p className="inline-error" role="alert">{error}</p>}
        <button type="button" className="cta cta--inline" disabled={!sel || busy} onClick={confirm}>
          {busy ? "Salvando…" : "Confirmar troca"}{!busy && <IconArrow className="cta-arrow" />}
        </button>
        <button type="button" className="text-btn" onClick={back} disabled={busy}>Cancelar</button>
      </div>
    </div>
  );
}
