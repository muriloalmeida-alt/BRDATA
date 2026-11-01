// CAP04-T02 — Partida ao vivo (referencias_anteriores/partida.png), pela
// ponte com a versão atual (adapters/match.ts; plano do bloco da partida,
// opção A). Entrega A1: placar, minuto, último evento, lances, Pausar /
// Retomar, intervalo, velocidade e "Pular para o fim" (decisões de 01/11).
// Ajustes leva à Pausa na A2; o Resultado vem na A4. Até a A4, o Pré-jogo
// segue abrindo a partida na versão atual.
import { useEffect, useRef, useState } from "react";
import { openMatchSession, type MatchSession } from "../adapters/match.ts";
import { buildMatch, type MatchModel } from "../domain/match.ts";
import type { Team } from "../domain/types.ts";
import { Crest, Wordmark } from "../ui/components.tsx";
import { IconBall, IconPause, IconPlay, IconSliders, IconArrow } from "../ui/icons.tsx";
import { BASE, navigate } from "../ui/router.tsx";
import "./home.css";
import "./match.css";

type View = { kind: "loading" } | { kind: "error"; message: string } | { kind: "none"; message: string } | { kind: "live"; m: MatchModel };

export function Match({ startNow, competitionId, teamById, onFinished }: {
  startNow: boolean; competitionId?: string; teamById: (id: string | number) => Team; onFinished: () => void;
}) {
  const [view, setView] = useState<View>({ kind: "loading" });
  const session = useRef<MatchSession | null>(null);
  const finishedOnce = useRef(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    let unsub: (() => void) | null = null;
    setView({ kind: "loading" });
    openMatchSession().then((s) => {
      if (!alive) { s.destroy(); return; }
      session.current = s;
      const apply = () => {
        const snap = s.snapshot();
        const m = buildMatch(snap, competitionId);
        if (m) {
          setView({ kind: "live", m });
          if (m.phase === "encerrada" && m.saved && !finishedOnce.current) { finishedOnce.current = true; onFinished(); }
        }
      };
      unsub = s.subscribe(apply);
      if (startNow) {
        // Tira o ?iniciar da barra: recarregar não começa outra partida.
        history.replaceState(history.state, "", `${BASE}/partida`);
        const r = s.start();
        if (!r.ok) setView({ kind: "none", message: r.motivo === "sem-jogo" ? "Não há jogo do seu clube nesta semana." : "Não foi possível iniciar a partida." });
        else apply();
      } else {
        setView({ kind: "none", message: "Nenhuma partida em andamento." });
      }
    }).catch(() => { if (alive) setView({ kind: "error", message: "Não foi possível preparar a partida." }); });
    return () => { alive = false; if (unsub) unsub(); session.current?.destroy(); session.current = null; };
  }, [attempt, startNow, competitionId, onFinished]);

  if (view.kind === "loading") return <div className="state" role="status" aria-live="polite"><div className="state-line" />Preparando a partida…</div>;
  if (view.kind === "error") return <div className="state" role="alert">{view.message}<button className="state-btn" onClick={() => setAttempt((n) => n + 1)}>Tentar novamente</button></div>;
  if (view.kind === "none") return <div className="state">{view.message}<button className="state-btn" onClick={() => navigate(`${BASE}/`, { replace: true })}>Ir para o início</button></div>;

  const m = view.m;
  const s = session.current!;
  const ended = m.phase === "encerrada";
  const primary = ended
    ? { label: "Continuar", icon: <IconArrow className="mt-btn-ico" />, act: () => { location.href = "/carreira"; } }
    : m.phase === "intervalo" ? { label: "Começar 2º tempo", icon: <IconPlay className="mt-btn-ico" />, act: () => s.continueHalftime() }
    : m.phase === "pausada" ? { label: "Retomar", icon: <IconPlay className="mt-btn-ico" />, act: () => s.resume() }
    : { label: "Pausar", icon: <IconPause className="mt-btn-ico" />, act: () => s.pause() };

  return (
    <div className="mt">
      <header className="mt-head">
        <Wordmark />
        <span className="sub-head-ctx">Partida</span>
      </header>

      <section className="home-match mt-band" aria-label="Placar">
        <div className="home-match-photo" aria-hidden="true" />
        <p className="mt-kicker">{m.kicker}</p>
        <div className="mt-score" aria-live="polite" aria-label={`${m.home.name} ${m.gh}, ${m.away.name} ${m.ga}. ${m.period}${ended || m.phase === "intervalo" ? "" : `, ${m.minute.replace("’", "")} minutos`}`}>
          <span className="mt-team"><Crest team={teamById(m.home.id)} size={70} /><b>{m.home.name}</b></span>
          <span className="mt-center" aria-hidden="true">
            <span className="mt-goals">{m.gh} - {m.ga}</span>
            <span className="mt-min">{ended ? "90’" : m.minute}</span>
            <span className="mt-period">{m.period}</span>
          </span>
          <span className="mt-team"><Crest team={teamById(m.away.id)} size={70} /><b>{m.away.name}</b></span>
        </div>
      </section>

      <section className="mt-last" aria-labelledby="mt-last-t">
        <h2 className="kicker-caps" id="mt-last-t">Último evento</h2>
        {m.last ? (
          <div className="mt-last-row">
            <span className="mt-last-min">{m.last.minute}’</span>
            {m.last.goal ? <IconBall className={`mt-last-ico${m.last.mine ? " is-mine" : ""}`} /> : <span className="mt-last-dot" aria-hidden="true" />}
            <span className="mt-last-body"><b>{m.last.title}</b><span>{m.last.sub}</span></span>
          </div>
        ) : <p className="mt-quiet">Bola rolando…</p>}
      </section>

      <section className="mt-feed" aria-labelledby="mt-feed-t">
        <h2 className="mt-feed-title" id="mt-feed-t">Lances da partida</h2>
        <ol className="mt-tl">
          {m.timeline.map((t) => (
            <li key={t.key} className={`mt-tl-item mt-tl-item--${t.kind}`}>
              <span className="mt-tl-min">{t.minute}’</span>
              <span className="mt-tl-body"><b>{t.title}</b><span>{t.sub}</span></span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-foot">
        {!ended && (
          <div className="mt-tools">
            <div className="mt-speed" role="group" aria-label="Velocidade">
              {([1, 2] as const).map((v) => (
                <button key={v} type="button" className={`mt-speed-btn${m.speed === v ? " is-on" : ""}`} aria-pressed={m.speed === v} onClick={() => s.speed(v)}>{v}×</button>
              ))}
            </div>
            <button type="button" className="mt-skip" onClick={() => s.skip()}>Pular para o fim</button>
          </div>
        )}
        <div className="mt-actions">
          <button type="button" className="cta mt-primary" onClick={primary.act}>{primary.icon}{primary.label}</button>
          {!ended && <button type="button" className="mt-secondary" onClick={() => s.pause()}><IconSliders className="mt-btn-ico" />Ajustes</button>}
        </div>
        {ended && m.saved === false && <p className="inline-error" role="alert">A partida terminou, mas não foi possível salvar o progresso.</p>}
      </div>
    </div>
  );
}
