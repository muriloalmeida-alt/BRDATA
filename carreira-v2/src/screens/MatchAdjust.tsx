// Ajustes durante a partida (A3), todos com a partida parada na Pausa e
// executados pelo motor da versão atual via ponte (confirmLiveSub /
// confirmLiveTactics — mesmas regras, limite e custo de familiaridade):
//   ?tela=sai     — CAP04-T04, etapa 1: quem sai (titulares em campo)
//   ?tela=entra   — CAP04-T04, prancha: Sai ⇄ Entra + reservas disponíveis
//   ?tela=tatica  — formação + 4 eixos existentes (1–5)
//   ?tela=lances  — CAP04-T05: lances da partida, aberto pela Pausa
import { useState } from "react";
import type { CommandResult, TacticAxis } from "../adapters/match.ts";
import type { MatchModel, SubModel, SubPlayer } from "../domain/match.ts";
import type { Team } from "../domain/types.ts";
import { GROUP_WORD } from "../domain/lineup.ts";
import { Crest, Jersey, Wordmark } from "../ui/components.tsx";
import { IconBack, IconBall, IconCheck, IconSwap } from "../ui/icons.tsx";

type TeamById = (id: string | number) => Team;

function Head({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <header className="sub-head">
      <button type="button" className="back-btn back-btn--bare" onClick={onBack} aria-label={label}><IconBack /></button>
      <Wordmark />
      <span />
    </header>
  );
}

export function ScoreCompact({ m, teamById }: { m: MatchModel; teamById: TeamById }) {
  const half = m.phase === "intervalo";
  return (
    <section className="pz-score" aria-label={`${m.home.name} ${m.gh}, ${m.away.name} ${m.ga}, ${half ? "intervalo" : `${m.minute.replace("’", "")} minutos`}`}>
      <span className="mt-team"><Crest team={teamById(m.home.id)} size={52} /><b>{m.home.name}</b></span>
      <span className="pz-center" aria-hidden="true"><span className="pz-min">{half ? "Intervalo" : m.minute}</span><span className="pz-goals">{m.gh} - {m.ga}</span></span>
      <span className="mt-team"><Crest team={teamById(m.away.id)} size={52} /><b>{m.away.name}</b></span>
    </section>
  );
}

const cond = (p: SubPlayer) => (p.condition == null ? "" : ` · ${Math.round(p.condition)}%`);

export function SubOutView({ m, subs, teamById, onBack, onPick }: { m: MatchModel; subs: SubModel; teamById: TeamById; onBack: () => void; onPick: (id: string) => void }) {
  return (
    <div className="mt pz">
      <Head onBack={onBack} label="Voltar à pausa" />
      <h1 className="screen-title pz-title">Mude o jogo.</h1>
      <p className="screen-sub">Escolha o jogador que vai sair.</p>
      <ScoreCompact m={m} teamById={teamById} />
      <p className="sb-count">Substituições: {subs.used} de {subs.total}</p>
      <ul className="sb-list" aria-label="Titulares em campo">
        {subs.starters.map((p) => (
          <li key={p.id}>
            <button type="button" className="qs-opt sb-opt" onClick={() => onPick(p.id)} aria-label={`Tirar ${p.name}, ${GROUP_WORD[p.group]}, overall ${p.overall}${p.condition == null ? "" : `, condição ${Math.round(p.condition)}%`}`}>
              <Jersey value={p.overall} gk={p.group === "G"} size={44} />
              <span className="qs-body"><span className="qs-name">{p.short}</span><span className="qs-pos">{GROUP_WORD[p.group]}{cond(p)}{p.status !== "ok" ? " · indisponível" : ""}</span></span>
              <span className="sb-out-tag">Sai</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SubInView({ m, subs, outId, teamById, onConfirm, onCancel }: {
  m: MatchModel; subs: SubModel; outId: string; teamById: TeamById; onConfirm: (inId: string) => CommandResult; onCancel: () => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const out = subs.starters.find((p) => p.id === outId) || null;
  const inP = subs.bench.find((p) => p.id === sel) || null;
  const confirm = () => {
    if (!sel) return;
    const r = onConfirm(sel);
    if (!r.ok) setErr(r.motivo === "sem-substituicoes" ? "Sem substituições disponíveis." : "Não foi possível fazer a substituição. Revise e tente de novo.");
  };
  const Side = ({ p, label, cls }: { p: SubPlayer | null; label: string; cls: string }) => (
    <div className="sb-side">
      <span className={`sb-label ${cls}`}>{label}</span>
      {p ? <Jersey value={p.overall} gk={p.group === "G"} size={74} /> : <Jersey empty size={74} />}
      <b className="sb-name">{p ? p.short : "Escolha abaixo"}</b>
      <span className="sb-meta">{p ? `${GROUP_WORD[p.group]}${cond(p)}` : " "}</span>
    </div>
  );
  return (
    <div className="mt pz">
      <Head onBack={onCancel} label="Voltar" />
      <h1 className="screen-title pz-title">Mude o jogo.</h1>
      <p className="screen-sub">Escolha o jogador que vai sair e quem vai entrar em seu lugar.</p>
      <ScoreCompact m={m} teamById={teamById} />
      <section className="sb-pair" aria-label="Troca">
        <Side p={out} label="Sai" cls="is-out" />
        <IconSwap className="sb-swap" />
        <Side p={inP} label="Entra" cls="is-in" />
      </section>
      <section className="sb-bench" aria-labelledby="sb-bench-t">
        <h2 className="sb-bench-title" id="sb-bench-t">{inP ? "Outros jogadores disponíveis" : "Jogadores disponíveis"}</h2>
        {subs.bench.length ? (
          <div role="radiogroup" aria-labelledby="sb-bench-t">
            {subs.bench.filter((p) => p.id !== sel).map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={false} className="qs-opt sb-opt" onClick={() => { setSel(p.id); setErr(null); }}
                aria-label={`${p.name}, ${GROUP_WORD[p.group]}, overall ${p.overall}`}>
                <Jersey value={p.overall} gk={p.group === "G"} size={44} />
                <span className="qs-body"><span className="qs-name">{p.short}</span><span className="qs-pos">{GROUP_WORD[p.group]}{cond(p)}</span></span>
                <span className="qs-radio" aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : <p className="mt-quiet">Nenhum reserva disponível no banco.</p>}
      </section>
      <div className="mt-foot pz-foot sb-foot">
        {err && <p className="inline-error" role="alert">{err}</p>}
        <button type="button" className="cta" disabled={!sel || !out || subs.left <= 0} onClick={confirm}>Confirmar substituição</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

export function TacticsView({ m, tatica, teamById, onApply, onCancel }: {
  m: MatchModel; tatica: { formacao: string; eixos: TacticAxis[]; formacoes: string[]; penalidadeBlocos: number }; teamById: TeamById;
  onApply: (formation: string, axes: Record<string, number>) => CommandResult; onCancel: () => void;
}) {
  const [formation, setFormation] = useState(tatica.formacao);
  const [axes, setAxes] = useState<Record<string, number>>(() => Object.fromEntries(tatica.eixos.map((a) => [a.id, a.nivel])));
  const [err, setErr] = useState<string | null>(null);
  const changedFormation = formation !== tatica.formacao;
  const apply = () => { const r = onApply(formation, axes); if (!r.ok) setErr("Não foi possível aplicar a tática."); };
  return (
    <div className="mt pz">
      <Head onBack={onCancel} label="Voltar à pausa" />
      <h1 className="screen-title pz-title">Ajuste a tática.</h1>
      <p className="screen-sub">Formação e instruções valem a partir do próximo trecho do jogo.</p>
      <ScoreCompact m={m} teamById={teamById} />
      <section className="tk-sec" aria-labelledby="tk-f">
        <h2 className="kicker-caps" id="tk-f">Formação</h2>
        <div className="tk-forms" role="radiogroup" aria-labelledby="tk-f">
          {tatica.formacoes.map((f) => (
            <button key={f} type="button" role="radio" aria-checked={f === formation} className={`tk-form${f === formation ? " is-on" : ""}`} onClick={() => setFormation(f)}>
              {f}{f === formation && <IconCheck className="tk-check" />}
            </button>
          ))}
        </div>
        {changedFormation && <p className="tk-note" role="note">Trocar a formação durante o jogo faz o time perder um pouco de efetividade nos próximos 2 trechos (30 minutos).</p>}
        {!changedFormation && tatica.penalidadeBlocos > 0 && <p className="tk-note">O time ainda está se ajustando à última troca de formação.</p>}
      </section>
      {tatica.eixos.map((a) => (
        <section key={a.id} className="tk-sec" aria-labelledby={`tk-${a.id}`}>
          <h2 className="tk-axis" id={`tk-${a.id}`}>{a.nome}</h2>
          <div className="tk-seg" role="radiogroup" aria-labelledby={`tk-${a.id}`}>
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} type="button" role="radio" aria-checked={axes[a.id] === v} aria-label={`${a.nome}: nível ${v} de 5${v === 1 ? ` (${a.baixo})` : v === 5 ? ` (${a.alto})` : ""}`}
                className={`tk-step${axes[a.id] >= v ? " is-fill" : ""}${axes[a.id] === v ? " is-on" : ""}`} onClick={() => setAxes({ ...axes, [a.id]: v })}>{v}</button>
            ))}
          </div>
          <div className="tk-ends" aria-hidden="true"><span>{a.baixo}</span><span>{a.alto}</span></div>
        </section>
      ))}
      <div className="mt-foot pz-foot sb-foot">
        {err && <p className="inline-error" role="alert">{err}</p>}
        <button type="button" className="cta" onClick={apply}>Aplicar</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

export function EventsView({ m, teamById, onBack }: { m: MatchModel; teamById: TeamById; onBack: () => void }) {
  return (
    <div className="mt pz">
      <Head onBack={onBack} label="Voltar" />
      <h1 className="screen-title pz-title">Lances da partida</h1>
      <p className="screen-sub">Acompanhe os principais acontecimentos do jogo, do mais recente ao início.</p>
      <ScoreCompact m={m} teamById={teamById} />
      <ol className="ev-list">
        {m.timeline.map((t) => (
          <li key={t.key} className="ev-item">
            <span className="ev-min">{t.minute}’</span>
            {t.kind === "gol-meu" || t.kind === "gol" ? <IconBall className={`ev-ico${t.kind === "gol-meu" ? " is-mine" : ""}`} /> : <span className={`ev-dot${t.kind === "inicio" ? " is-start" : ""}`} aria-hidden="true" />}
            <span className="ev-body"><b>{t.title}</b><span>{t.sub}</span></span>
          </li>
        ))}
      </ol>
      <div className="mt-foot pz-foot">
        <button type="button" className="link-back" onClick={onBack}>{m.phase === "encerrada" ? "Voltar ao resultado" : "Voltar à partida"}</button>
      </div>
    </div>
  );
}
