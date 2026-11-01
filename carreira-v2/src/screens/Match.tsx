// CAP04-T02 — Partida ao vivo (referencias_anteriores/partida.png), pela
// ponte com a versão atual (adapters/match.ts; plano do bloco da partida,
// opção A). A1: placar, minuto, último evento, lances, velocidade e
// "Pular para o fim" (decisões de 01/11). A2: Pausa (CAP04-T03) — aberta por
// Pausar/Ajustes e sozinha no intervalo — e "Revisar time" (escalação ao
// vivo). A3: Substituir (?tela=sai → entra), Ajustar tática (?tela=tatica)
// e Lances (?tela=lances), abertos pela Pausa. As vistas ficam na MESMA rota: a sessão da ponte
// continua viva e o voltar do sistema retorna à partida. O Resultado vem na
// A4. Até a A4, o Pré-jogo
// segue abrindo a partida na versão atual.
import { useEffect, useRef, useState } from "react";
import { openMatchSession, type MatchSession } from "../adapters/match.ts";
import { buildLiveLineup, buildMatch, buildResult, buildSubs, type MatchModel, type ResultModel } from "../domain/match.ts";
import { EventsView, SubInView, SubOutView, TacticsView } from "./MatchAdjust.tsx";
import type { MatchSnapshot } from "../adapters/match.ts";
import type { LineupModel } from "../domain/lineup.ts";
import type { Team } from "../domain/types.ts";
import { Crest, Wordmark } from "../ui/components.tsx";
import { IconBall, IconPause, IconPlay, IconSliders, IconArrow, IconBack, IconChevron, IconSwap, IconTactic, IconUsers, IconList } from "../ui/icons.tsx";
import { BASE, goBackTo, navigate } from "../ui/router.tsx";
import { PitchPlayers } from "../ui/pitch.tsx";
import { Jersey } from "../ui/components.tsx";
import { shortName } from "../domain/lineup.ts";
import "./lineup.css";
import "./prematch.css";
import "./table.css";
import "./home.css";
import "./match.css";

type View = { kind: "loading" } | { kind: "error"; message: string } | { kind: "none"; message: string } | { kind: "live"; m: MatchModel; snap: MatchSnapshot };
export type MatchSub = "pausa" | "time" | "sai" | "entra" | "tatica" | "lances" | "tabela" | null;
const PARTIDA = `${BASE}/partida`;

export function Match({ startNow, sub, outId, competitionId, competitionName, teamById, onFinished, renderTable }: {
  startNow: boolean; sub: MatchSub; outId?: string | null; competitionId?: string; competitionName: string; teamById: (id: string | number) => Team;
  onFinished: () => void; renderTable: (onBack: () => void) => JSX.Element;
}) {
  // Só a 1ª montagem decide se começa: trocar de vista (?tela=) não reinicia.
  const startOnce = useRef(startNow);
  const halftimeShown = useRef(false);
  const guardPushed = useRef(false);
  const liveRef = useRef(false);
  const [leaveAsk, setLeaveAsk] = useState(false);
  const [postMatch, setPostMatch] = useState(false);
  const applyRef = useRef<(() => void) | null>(null);
  const doneReads = useRef(0);
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
        // Pós-jogo na versão atual (tela cheia): quando a sequência termina,
        // esconde a ponte e volta ao Início com o save relido.
        if (snap.fase === "pos-jogo") {
          // Duas leituras seguidas (≥ 0,6 s) sem modal aberto: evita fechar
          // na troca de um modal para o próximo da sequência.
          doneReads.current = snap.posJogo === "concluido" ? doneReads.current + 1 : 0;
          if (doneReads.current >= 2) { s.reveal(false); onFinished(); navigate(`${BASE}/`, { replace: true }); }
          return;
        }
        const m = buildMatch(snap, competitionId);
        liveRef.current = !!m && (m.phase === "jogando" || m.phase === "pausada" || m.phase === "intervalo");
        if (m) {
          setView({ kind: "live", m, snap });
          // Intervalo: abre a Pausa sozinho, uma vez por intervalo.
          if (m.phase === "intervalo" && !halftimeShown.current) { halftimeShown.current = true; if (!new URLSearchParams(location.search).get("tela")) navigate(`${PARTIDA}?tela=pausa`); }
          if (m.phase === "encerrada" && m.saved && !finishedOnce.current) { finishedOnce.current = true; onFinished(); }
        }
      };
      applyRef.current = apply;
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
    // Durante o pós-jogo os modais da versão atual abrem e fecham sem avisar
    // a ponte: confere de tempos em tempos se a sequência terminou.
    const poll = setInterval(() => { const ss = session.current; if (ss && ss.snapshot().fase === "pos-jogo") applyRef.current?.(); }, 600);
    return () => { alive = false; clearInterval(poll); if (unsub) unsub(); session.current?.destroy(); session.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Saída acidental no meio do jogo (decisão de 01/11): uma entrada extra no
  // histórico segura o voltar do sistema na tela da Partida; o voltar então
  // pergunta e, confirmando, faz o mesmo "Pular para o fim" de hoje.
  useEffect(() => {
    if (view.kind !== "live" || !liveRef.current || guardPushed.current) return;
    if (location.pathname !== PARTIDA || location.search) return;
    guardPushed.current = true;
    history.pushState({ v2from: PARTIDA, v2guard: true }, "", PARTIDA);
  }, [view]);
  useEffect(() => {
    const onPop = () => {
      if (!liveRef.current || !guardPushed.current) return;
      if (location.pathname !== PARTIDA || location.search || (history.state && history.state.v2guard)) return;
      history.pushState({ v2from: PARTIDA, v2guard: true }, "", PARTIDA);
      setLeaveAsk(true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (view.kind === "loading") return <div className="state" role="status" aria-live="polite"><div className="state-line" />Preparando a partida…</div>;
  if (view.kind === "error") return <div className="state" role="alert">{view.message}<button className="state-btn" onClick={() => setAttempt((n) => n + 1)}>Tentar novamente</button></div>;
  if (view.kind === "none") return <div className="state">{view.message}<button className="state-btn" onClick={() => navigate(`${BASE}/`, { replace: true })}>Ir para o início</button></div>;

  const m = view.m;
  const s = session.current!;
  const ended = m.phase === "encerrada";
  const primary = ended
    ? { label: "Continuar", icon: <IconArrow className="mt-btn-ico" />, act: () => {} }
    : m.phase === "intervalo" ? { label: "Começar 2º tempo", icon: <IconPlay className="mt-btn-ico" />, act: () => s.continueHalftime() }
    : m.phase === "pausada" ? { label: "Retomar", icon: <IconPlay className="mt-btn-ico" />, act: () => s.resume() }
    : { label: "Pausar", icon: <IconPause className="mt-btn-ico" />, act: () => openPause() };
  function openPause() { s.pause(); navigate(`${PARTIDA}?tela=pausa`); }
  const resumeAndBack = () => { if (m.phase === "intervalo") s.continueHalftime(); else s.resume(); goBackTo(PARTIDA); };

  const PAUSA = `${PARTIDA}?tela=pausa`;
  // Volta à Pausa a partir de uma vista aberta por ela (n passos atrás no
  // histórico quando a cadeia é a esperada; senão substitui).
  const backToPause = (steps: number) => {
    if (history.state && typeof history.state.v2from === "string" && history.state.v2from.startsWith(PARTIDA)) history.go(-steps);
    else navigate(PAUSA, { replace: true });
  };
  const subs = buildSubs(view.snap);
  if (!ended && sub === "pausa") return <PauseView m={m} teamById={teamById} onResume={resumeAndBack} />;
  if (sub === "time") return <TeamView lineup={buildLiveLineup(view.snap)} />;
  if (!ended && sub === "sai" && subs) return <SubOutView m={m} subs={subs} teamById={teamById} onBack={() => backToPause(1)} onPick={(id) => navigate(`${PARTIDA}?tela=entra&sai=${encodeURIComponent(id)}`)} />;
  if (!ended && sub === "entra" && subs && outId) return (
    <SubInView key={outId} m={m} subs={subs} outId={outId} teamById={teamById} onCancel={() => backToPause(2)}
      onConfirm={(inId) => { const r = s.substitute(outId, inId); if (r.ok) backToPause(2); return r; }} />
  );
  if (!ended && sub === "tatica" && view.snap.tatica) return (
    <TacticsView m={m} tatica={view.snap.tatica} teamById={teamById} onCancel={() => backToPause(1)}
      onApply={(f, a) => { const r = s.applyTactics(f, a); if (r.ok) backToPause(1); return r; }} />
  );
  if (sub === "lances") return <EventsView m={m} teamById={teamById} onBack={() => (ended ? goBackTo(PARTIDA) : backToPause(1))} />;
  if (postMatch) return <div className="state" role="status" aria-live="polite"><div className="state-line" />Continuando…</div>;
  if (ended && sub === "tabela") return renderTable(() => goBackTo(PARTIDA));
  if (ended) {
    const res = buildResult(view.snap, competitionName);
    const ready = !!view.snap.resultadoPronto && m.saved === true;
    const cont = () => { const r = s.continuePostMatch(); if (r.ok) { setPostMatch(true); s.reveal(true); } };
    return <ResultView m={m} res={res} teamById={teamById} ready={ready} failed={m.saved === false} onContinue={cont} />;
  }

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
      </div>
      {leaveAsk && (
        <div className="sheet-scrim" onClick={() => setLeaveAsk(false)}>
          <div className="sheet" role="alertdialog" aria-modal="true" aria-labelledby="lv-t" aria-describedby="lv-d" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" aria-hidden="true" />
            <h2 id="lv-t" className="sheet-title">Sair da partida?</h2>
            <p id="lv-d" className="lv-text">O restante do jogo será simulado e o resultado, gravado — como “Pular para o fim”.</p>
            <button type="button" className="cta" onClick={() => { setLeaveAsk(false); s.skip(); }}>Sair e simular o resto</button>
            <button type="button" className="text-btn" autoFocus onClick={() => setLeaveAsk(false)}>Continuar jogando</button>
          </div>
        </div>
      )}
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
        {m.subs.used < m.subs.total ? (
          <a className="row pz-row" href={`${PARTIDA}?tela=sai`} onClick={(e) => { e.preventDefault(); navigate(`${PARTIDA}?tela=sai`); }}>
            <IconSwap className="row-icon pz-ico" />
            <span className="row-body"><span className="row-title">Substituir jogador</span><span className="row-sub">{`Troque jogadores em campo · ${m.subs.used} de ${m.subs.total}`}</span></span>
            <IconChevron className="row-chevron" />
          </a>
        ) : (
          <div className="row pz-row is-soon" aria-disabled="true">
            <IconSwap className="row-icon pz-ico" />
            <span className="row-body"><span className="row-title">Substituir jogador</span><span className="row-sub">{`Sem substituições disponíveis · ${m.subs.used} de ${m.subs.total}`}</span></span>
          </div>
        )}
        <a className="row pz-row" href={`${PARTIDA}?tela=tatica`} onClick={(e) => { e.preventDefault(); navigate(`${PARTIDA}?tela=tatica`); }}>
          <IconTactic className="row-icon pz-ico" />
          <span className="row-body"><span className="row-title">Ajustar tática</span><span className="row-sub">Altere a formação e instruções.</span></span>
          <IconChevron className="row-chevron" />
        </a>
        <a className="row pz-row" href={`${PARTIDA}?tela=lances`} onClick={(e) => { e.preventDefault(); navigate(`${PARTIDA}?tela=lances`); }}>
          <IconBall className="row-icon pz-ico" />
          <span className="row-body"><span className="row-title">Lances da partida</span><span className="row-sub">Gols, cartões e substituições até agora.</span></span>
          <IconChevron className="row-chevron" />
        </a>
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

// CAP04-T06 — Resultado final (pranchas/02_resultados.png, coluna 1).
function ResultView({ m, res, teamById, ready, failed, onContinue }: {
  m: MatchModel; res: ResultModel | null; teamById: (id: string | number) => Team; ready: boolean; failed: boolean; onContinue: () => void;
}) {
  return (
    <div className="mt rs">
      <header className="mt-head">
        <Wordmark />
        <span className="sub-head-ctx">Resultado</span>
      </header>
      <h1 className="screen-title rs-title">{res?.title}</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub rs-line">{res?.line}</p>
      <section className="home-match rs-band" aria-label={`Placar final: ${m.home.name} ${m.gh}, ${m.away.name} ${m.ga}`}>
        <div className="home-match-photo" aria-hidden="true" />
        <p className="mt-kicker rs-kicker">{m.kicker}</p>
        <div className="mt-score" aria-hidden="true">
          <span className="mt-team"><Crest team={teamById(m.home.id)} size={66} /><b>{m.home.name}</b></span>
          <span className="mt-center"><span className="mt-goals">{m.gh} - {m.ga}</span><span className="rs-min">90’</span><span className="rs-tag">Encerrado</span></span>
          <span className="mt-team"><Crest team={teamById(m.away.id)} size={66} /><b>{m.away.name}</b></span>
        </div>
      </section>
      <section className="rs-goals" aria-label="Gols">
        {res && res.goals.length ? (
          <ul>{res.goals.map((g, i) => (
            <li key={i} className="rs-goal">
              <span className="rs-goal-min">{g.minute}’</span>
              <IconBall className={`rs-goal-ico${g.mine ? " is-mine" : ""}`} />
              <span className="rs-goal-body"><b>{g.scorer}{g.penalty ? " (pênalti)" : ""}</b><span>{g.team}</span></span>
            </li>
          ))}</ul>
        ) : <p className="mt-quiet">Sem gols na partida.</p>}
      </section>
      <nav className="rs-links" aria-label="Detalhes">
        <a className="row" href={`${PARTIDA}?tela=lances`} onClick={(e) => { e.preventDefault(); navigate(`${PARTIDA}?tela=lances`); }}>
          <IconPlay className="row-icon rs-ico" />
          <span className="row-body"><span className="row-title">Ver lances</span></span>
          <IconChevron className="row-chevron" />
        </a>
        <a className="row" href={`${PARTIDA}?tela=tabela`} onClick={(e) => { e.preventDefault(); navigate(`${PARTIDA}?tela=tabela`); }}>
          <IconList className="row-icon rs-ico" />
          <span className="row-body"><span className="row-title">Ver tabela</span></span>
          <IconChevron className="row-chevron" />
        </a>
      </nav>
      <div className="mt-foot pz-foot">
        {failed && <p className="inline-error" role="alert">A partida terminou, mas não foi possível salvar o progresso.</p>}
        <button type="button" className="cta" disabled={!ready} onClick={onContinue}>{ready || failed ? "Continuar" : "Salvando…"}<IconChevron className="cta-arrow" /></button>
      </div>
    </div>
  );
}
