// CAP04-T02 — Partida ao vivo (referencias_anteriores/partida.png), pela
// ponte com a versão atual (adapters/match.ts; plano do bloco da partida,
// opção A). A1: placar, minuto, último evento, lances, velocidade e
// "Pular para o fim" (decisões de 01/11). A2: Pausa (CAP04-T03) — aberta por
// Pausar/Ajustes e sozinha no intervalo — e "Revisar time" (escalação ao
// vivo). As vistas são ?tela=pausa|time na MESMA rota: a sessão da ponte
// continua viva e o voltar do sistema retorna à partida. Substituir e
// Ajustar tática chegam na A3; o Resultado na A4. Até a A4, o Pré-jogo
// segue abrindo a partida na versão atual.
import { useEffect, useRef, useState } from "react";
import { openMatchSession, type MatchSession } from "../adapters/match.ts";
import { buildLiveLineup, buildMatch, type MatchModel } from "../domain/match.ts";
import type { MatchSnapshot } from "../adapters/match.ts";
import type { LineupModel } from "../domain/lineup.ts";
import type { Team } from "../domain/types.ts";
import { Crest, Wordmark } from "../ui/components.tsx";
import { IconBall, IconPause, IconPlay, IconSliders, IconArrow, IconBack, IconChevron, IconSwap, IconTactic, IconUsers } from "../ui/icons.tsx";
import { BASE, goBackTo, navigate } from "../ui/router.tsx";
import { PitchPlayers } from "../ui/pitch.tsx";
import { Jersey } from "../ui/components.tsx";
import { shortName } from "../domain/lineup.ts";
import "./lineup.css";
import "./prematch.css";
import "./home.css";
import "./match.css";

type View = { kind: "loading" } | { kind: "error"; message: string } | { kind: "none"; message: string } | { kind: "live"; m: MatchModel; snap: MatchSnapshot };
export type MatchSub = "pausa" | "time" | null;
const PARTIDA = `${BASE}/partida`;

export function Match({ startNow, sub, competitionId, teamById, onFinished }: {
  startNow: boolean; sub: MatchSub; competitionId?: string; teamById: (id: string | number) => Team; onFinished: () => void;
}) {
  // Só a 1ª montagem decide se começa: trocar de vista (?tela=) não reinicia.
  const startOnce = useRef(startNow);
  const halftimeShown = useRef(false);
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
          setView({ kind: "live", m, snap });
          // Intervalo: abre a Pausa sozinho, uma vez por intervalo.
          if (m.phase === "intervalo" && !halftimeShown.current) { halftimeShown.current = true; if (!new URLSearchParams(location.search).get("tela")) navigate(`${PARTIDA}?tela=pausa`); }
          if (m.phase === "encerrada" && m.saved && !finishedOnce.current) { finishedOnce.current = true; onFinished(); }
        }
      };
      unsub = s.subscribe(apply);
      if (startOnce.current) {
        startOnce.current = false;
        // Tira o ?iniciar da barra: recarregar não começa outra partida.
        history.replaceState(history.state, "", PARTIDA);
        const r = s.start();
        if (!r.ok) setView({ kind: "none", message: r.motivo === "sem-jogo" ? "Não há jogo do seu clube nesta semana." : "Não foi possível iniciar a partida." });
        else apply();
      } else {
        setView({ kind: "none", message: "Nenhuma partida em andamento." });
      }
    }).catch(() => { if (alive) setView({ kind: "error", message: "Não foi possível preparar a partida." }); });
    return () => { alive = false; if (unsub) unsub(); session.current?.destroy(); session.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

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
    : { label: "Pausar", icon: <IconPause className="mt-btn-ico" />, act: () => openPause() };
  function openPause() { s.pause(); navigate(`${PARTIDA}?tela=pausa`); }
  const resumeAndBack = () => { if (m.phase === "intervalo") s.continueHalftime(); else s.resume(); goBackTo(PARTIDA); };

  if (sub === "pausa" && !ended) return <PauseView m={m} teamById={teamById} onResume={resumeAndBack} />;
  if (sub === "time") return <TeamView lineup={buildLiveLineup(view.snap)} />;

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
          {!ended && <button type="button" className="mt-secondary" onClick={openPause}><IconSliders className="mt-btn-ico" />Ajustes</button>}
        </div>
        {ended && m.saved === false && <p className="inline-error" role="alert">A partida terminou, mas não foi possível salvar o progresso.</p>}
      </div>
    </div>
  );
}

// CAP04-T03 — Pausa / Ajustes (pranchas/01_partida.png, coluna 1). No
// intervalo é a mesma tela, com "Intervalo" e "Começar 2º tempo".
function PauseView({ m, teamById, onResume }: { m: MatchModel; teamById: (id: string | number) => Team; onResume: () => void }) {
  const half = m.phase === "intervalo";
  return (
    <div className="mt pz">
      <header className="sub-head">
        <button type="button" className="back-btn back-btn--bare" onClick={() => goBackTo(PARTIDA)} aria-label="Voltar à partida"><IconBack /></button>
        <Wordmark />
        <span />
      </header>
      <section className="pz-score" aria-label={`${m.home.name} ${m.gh}, ${m.away.name} ${m.ga}, ${half ? "intervalo" : `${m.minute.replace("’", "")} minutos`}`}>
        <span className="mt-team"><Crest team={teamById(m.home.id)} size={56} /><b>{m.home.name}</b></span>
        <span className="pz-center" aria-hidden="true"><span className="pz-min">{half ? "Intervalo" : m.minute}</span><span className="pz-goals">{m.gh} - {m.ga}</span></span>
        <span className="mt-team"><Crest team={teamById(m.away.id)} size={56} /><b>{m.away.name}</b></span>
      </section>
      <h1 className="screen-title pz-title">{half ? "Intervalo" : "Partida pausada"}</h1>
      <p className="screen-sub">{half ? "Ajuste seu time antes do 2º tempo." : "Ajuste seu time e retorne quando estiver pronto."}</p>
      <nav className="pz-list" aria-label="Ajustes">
        <a className="row pz-row" href={`${PARTIDA}?tela=time`} onClick={(e) => { e.preventDefault(); navigate(`${PARTIDA}?tela=time`); }}>
          <IconUsers className="row-icon pz-ico" />
          <span className="row-body"><span className="row-title">Revisar time</span><span className="row-sub">Veja a escalação em campo.</span></span>
          <IconChevron className="row-chevron" />
        </a>
        <div className="row pz-row is-soon" aria-disabled="true">
          <IconSwap className="row-icon pz-ico" />
          <span className="row-body"><span className="row-title">Substituir jogador</span><span className="row-sub">{`${m.subs.used} de ${m.subs.total} usadas · disponível na próxima entrega`}</span></span>
        </div>
        <div className="row pz-row is-soon" aria-disabled="true">
          <IconTactic className="row-icon pz-ico" />
          <span className="row-body"><span className="row-title">Ajustar tática</span><span className="row-sub">Formação e instruções · disponível na próxima entrega</span></span>
        </div>
      </nav>
      <div className="mt-foot pz-foot">
        <button type="button" className="cta mt-primary" onClick={onResume}><IconPlay className="mt-btn-ico" />{half ? "Começar 2º tempo" : "Retomar partida"}</button>
      </div>
    </div>
  );
}

// "Revisar time": titulares em campo e banco, ao vivo (só leitura).
function TeamView({ lineup }: { lineup: LineupModel | null }) {
  return (
    <div className="mt pz">
      <header className="sub-head">
        <button type="button" className="back-btn back-btn--bare" onClick={() => goBackTo(`${PARTIDA}?tela=pausa`)} aria-label="Voltar à pausa"><IconBack /></button>
        <Wordmark />
        <span />
      </header>
      <h1 className="screen-title pz-title">Seu time em campo.</h1>
      {lineup ? (
        <>
          <div className="pm-lineup-head"><h2 className="kicker-caps">Titulares</h2><span className="pm-formation" aria-label={`Formação ${lineup.formation}`}>{lineup.formation.split("").join("\u200a")}</span></div>
          <section className="lu-pitch pm-pitch" aria-label={`Titulares, formação ${lineup.formation}`}><PitchPlayers rows={lineup.rows} /></section>
          <section className="pz-bench" aria-labelledby="pz-bench-t">
            <h2 className="kicker-caps" id="pz-bench-t">Banco de reservas</h2>
            {lineup.bench.length ? (
              <ul>{lineup.bench.map(({ player, out }) => (
                <li key={player.id} className="pz-bench-row">
                  <Jersey value={player.overall} gk={player.group === "G"} size={36} />
                  <span className="pz-bench-name">{shortName(player.name)}</span>
                  {out && <span className="pz-bench-out">{out}</span>}
                </li>
              ))}</ul>
            ) : <p className="mt-quiet">Nenhum reserva no banco.</p>}
          </section>
        </>
      ) : <p className="mt-quiet pz-pad">Escalação indisponível.</p>}
    </div>
  );
}
