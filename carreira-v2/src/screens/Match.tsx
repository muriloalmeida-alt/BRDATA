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
import { type MatchSession, type SaveError } from "../adapters/match.ts";
import { engine } from "../adapters/engine.ts";
import { WeekGateway, weekStore } from "../adapters/week.ts";
import type { TableMatchContext } from "./Table.tsx";
import { Sheet } from "../ui/dialog.tsx";
import { LoginSheet } from "../ui/session.tsx";
import { buildLiveLineup, buildMatch, buildResult, buildSubs, type MatchModel, type ResultModel } from "../domain/match.ts";
import { EventsView, SubInView, SubOutView, TacticsView } from "./MatchAdjust.tsx";
import type { MatchSnapshot } from "../adapters/match.ts";
import type { LineupModel } from "../domain/lineup.ts";
import type { Team } from "../domain/types.ts";
import { Crest, Wordmark } from "../ui/components.tsx";
import { IconBall, IconPause, IconPlay, IconSliders, IconArrow, IconBack, IconChevron, IconSwap, IconTactic, IconUsers, IconList } from "../ui/icons.tsx";
import { BASE, goBackTo, navigate, refocusIfLost } from "../ui/router.tsx";
import { PitchPlayers } from "../ui/pitch.tsx";
import { Jersey } from "../ui/components.tsx";
import { shortName } from "../domain/lineup.ts";
import "./lineup.css";
import "./prematch.css";
import "./table.css";
import "./home.css";
import "./match.css";

// Saída pedida: no meio do jogo (simula o resto) ou a partir do Resultado
// (para o Início, ou para o elenco de um clube tocado na Tabela).
type Leave = { kind: "live" } | { kind: "result"; to: string | null; club?: string };
// Estado da gravação do resultado (AUD-02).
type SaveStatus = "saving" | "saved" | "failed" | "session" | "other-account";
type View = { kind: "loading" } | { kind: "error"; message: string } | { kind: "none"; message: string } | { kind: "live"; m: MatchModel; snap: MatchSnapshot };
export type MatchSub = "pausa" | "time" | "sai" | "entra" | "tatica" | "lances" | "tabela" | null;
const PARTIDA = `${BASE}/partida`;

export function Match({ start, sub, outId, competitionId, competitionName, teamById, onFinished, renderTable }: {
  start: null | "jogo" | "amistoso"; sub: MatchSub; outId?: string | null; competitionId?: string; competitionName: string; teamById: (id: string | number) => Team;
  onFinished: () => void; renderTable: (ctx: TableMatchContext) => JSX.Element;
}) {
  // Só a 1ª montagem decide se começa: trocar de vista (?tela=) não reinicia.
  const startOnce = useRef(start);
  const halftimeShown = useRef(false);
  const guardPushed = useRef(false);
  const liveRef = useRef(false);
  // Guarda do voltar: ativa no jogo e no Resultado (até "Continuar").
  const guardRef = useRef(false);
  const savedRef = useRef<boolean | null>(null);
  const [leave, setLeave] = useState<Leave | null>(null);
  const [postMatch, setPostMatch] = useState(false);
  const postMatchRef = useRef(false);
  const [retrying, setRetrying] = useState(false);
  const retryBusy = useRef(false);
  const [login, setLogin] = useState(false);
  const applyRef = useRef<(() => void) | null>(null);
  const doneReads = useRef(0);
  const [view, setView] = useState<View>({ kind: "loading" });
  const session = useRef<MatchSession | null>(null);
  const finishedOnce = useRef(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    let unsub: (() => void) | null = null;
    // AUD-06: sair da tela antes de a ponte ficar pronta cancela a espera.
    // Fase 1: a sessão do motor é compartilhada (adapters/engine.ts) e não é
    // destruída ao sair da tela; get() já confere se o save é o do servidor.
    const ac = new AbortController();
    setView({ kind: "loading" });
    engine.setFocusHandler(refocusIfLost);
    engine.get(ac.signal).then((s) => {
      if (!alive) return;
      session.current = s;
      const apply = () => {
        const snap = s.snapshot();
        // Pós-jogo na versão atual (tela cheia): quando a sequência termina,
        // esconde a ponte e volta ao Início com o save relido.
        if (snap.fase === "pos-jogo") {
          // Duas leituras seguidas (≥ 0,6 s) sem modal aberto: evita fechar
          // na troca de um modal para o próximo da sequência.
          doneReads.current = snap.posJogo === "concluido" ? doneReads.current + 1 : 0;
          // Fase 1: o motor fica aberto; descarta a partida encerrada para não
          // reapresentá-la na próxima abertura da Partida.
          if (doneReads.current >= 2) { s.reveal(false); s.discard(); onFinished(); navigate(`${BASE}/`, { replace: true }); }
          return;
        }
        const m = buildMatch(snap, competitionId);
        liveRef.current = !!m && (m.phase === "jogando" || m.phase === "pausada" || m.phase === "intervalo");
        guardRef.current = liveRef.current || (!!m && m.phase === "encerrada" && !postMatchRef.current);
        savedRef.current = m ? m.saved : null;
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
        const kind = startOnce.current;
        startOnce.current = null;
        // Tira o ?iniciar da barra: recarregar não começa outra partida.
        // Pelo roteador (não history direto): a rota guardada na v2 precisa
        // saber que a consulta mudou, senão o 1º voltar parece troca de tela.
        navigate(PARTIDA, { replace: true });
        // Fase 3: o amistoso usa o mesmo motor ao vivo (iniciarAmistoso).
        const r = kind === "amistoso" ? s.run<{ ok: boolean; motivo?: string }>("iniciarAmistoso") : s.start();
        if (!r.ok) setView({ kind: "none", message: r.motivo === "sem-jogo" ? "Não há jogo do seu clube nesta semana." : r.motivo === "sem-amistoso" ? "Não há amistoso nesta semana." : "Não foi possível iniciar a partida." });
        else apply();
      } else {
        // Sem ?iniciar: com o motor reaproveitado, uma partida em andamento
        // (ex.: voltou à tela no meio do jogo) continua de onde está. Partida
        // já encerrada não é reapresentada: gravada, é descartada; não
        // gravada (saiu sem salvar), o motor é recarregado, que é o mesmo que
        // a tela antiga fazia ao destruir a sessão.
        const fase = s.snapshot().fase;
        if (fase === "jogando" || fase === "pausada" || fase === "intervalo") { apply(); return; }
        // Pós-jogo interrompido (modais da versão anterior ainda abertos no
        // motor) também recarrega: o próximo jogo começa de um motor limpo.
        if (fase === "pos-jogo" || (fase === "encerrada" && s.snapshot().gravada !== true)) engine.reset();
        else s.discard();
        setView({ kind: "none", message: "Nenhuma partida em andamento." });
      }
    }).catch(() => { if (alive && !ac.signal.aborted) setView({ kind: "error", message: "Não foi possível preparar a partida." }); });
    // Durante o pós-jogo os modais da versão atual abrem e fecham sem avisar
    // a ponte: confere de tempos em tempos se a sequência terminou.
    const poll = setInterval(() => { const ss = session.current; if (ss && ss.snapshot().fase === "pos-jogo") applyRef.current?.(); }, 600);
    return () => {
      alive = false; ac.abort(); clearInterval(poll); if (unsub) unsub();
      // Nunca deixa o motor visível ao sair da tela; a sessão continua viva,
      // mas sem resto de partida: encerrada e gravada → descartada; pós-jogo
      // interrompido ou resultado não gravado → motor recarregado (como a
      // tela fazia antes, ao destruir a sessão). Partida em andamento segue.
      const ss = session.current;
      if (ss) {
        ss.reveal(false);
        const snap = ss.snapshot();
        if (snap.fase === "pos-jogo" || (snap.fase === "encerrada" && snap.gravada !== true)) engine.reset();
        else if (snap.fase === "encerrada") ss.discard();
      }
      session.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Saída acidental no meio do jogo (decisão de 01/11): uma entrada extra no
  // histórico segura o voltar do sistema na tela da Partida; o voltar então
  // pergunta e, confirmando, faz o mesmo "Pular para o fim" de hoje.
  useEffect(() => {
    if (view.kind !== "live" || !guardRef.current || guardPushed.current) return;
    if (location.pathname !== PARTIDA || location.search) return;
    guardPushed.current = true;
    history.pushState({ v2from: PARTIDA, v2guard: true }, "", PARTIDA);
  }, [view]);
  useEffect(() => {
    const onPop = () => {
      if (!guardRef.current || !guardPushed.current) return;
      if (location.pathname !== PARTIDA || location.search || (history.state && history.state.v2guard)) return;
      history.pushState({ v2from: PARTIDA, v2guard: true }, "", PARTIDA);
      setLeave(liveRef.current ? { kind: "live" } : { kind: "result", to: null });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // AUD-05: quando a tela troca sem mudar a rota (carregando → partida,
  // jogo → Resultado, gravação → falha), o elemento focado pode sumir:
  // recoloca o foco no título. Minuto e placar não mexem no foco.
  const viewKey = view.kind === "live" ? `live:${view.m.phase === "encerrada" ? "fim" : "jogo"}:${postMatch}` : view.kind;
  useEffect(() => { refocusIfLost(); }, [viewKey]);

  if (view.kind === "loading") return <div className="state" role="status" aria-live="polite"><div className="state-line" />Preparando a partida…</div>;
  if (view.kind === "error") return <div className="state" role="alert">{view.message}<button className="state-btn" onClick={() => { engine.reset(); setAttempt((n) => n + 1); }}>Tentar novamente</button></div>;
  if (view.kind === "none") return <div className="state">{view.message}<button className="state-btn" onClick={() => navigate(`${BASE}/`, { replace: true })}>Ir para o início</button></div>;

  const m = view.m;
  const snap = view.snap;
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
  const subs = buildSubs(snap);
  const content = screen();
  const sheets = (
    <>
      {leave && <LeaveSheet leave={leave} saved={m.saved === true} friendly={snap.contexto === "amistoso"} onStay={() => setLeave(null)} onLeave={() => {
        const l = leave;
        setLeave(null);
        if (l.kind === "live") { s.skip(); return; }
        // Saída pelo Resultado: a ponte (e o pós-jogo pendente) é descartada.
        guardRef.current = false;
        if (l.to) { location.href = l.to; return; }
        onFinished();
        navigate(`${BASE}/`, { replace: true });
      }} />}
      {login && <LoginSheet account={s.account()} title="Entre para salvar" lead="Use a mesma conta em que a partida foi jogada. O resultado continua guardado aqui." submitLabel="Entrar e salvar" onClose={() => setLogin(false)} onLoggedIn={() => { setLogin(false); retry(); }} />}
    </>
  );
  return <>{content}{sheets}</>;

  // AUD-02 — repete só a gravação; toques repetidos não abrem gravações
  // paralelas (aqui e na ponte). Ao gravar, a ponte avisa e a v2 relê o save.
  async function retry() {
    if (retryBusy.current) return;
    retryBusy.current = true; setRetrying(true);
    try { await s.retrySave(); } finally { retryBusy.current = false; setRetrying(false); }
  }

  function screen() {
  if (!ended && sub === "pausa") return <PauseView m={m} teamById={teamById} onResume={resumeAndBack} />;
  if (sub === "time") return <TeamView lineup={buildLiveLineup(snap)} />;
  if (!ended && sub === "sai" && subs) return <SubOutView m={m} subs={subs} teamById={teamById} onBack={() => backToPause(1)} onPick={(id) => navigate(`${PARTIDA}?tela=entra&sai=${encodeURIComponent(id)}`)} />;
  if (!ended && sub === "entra" && subs && outId) return (
    <SubInView key={outId} m={m} subs={subs} outId={outId} teamById={teamById} onCancel={() => backToPause(2)}
      onConfirm={(inId) => { const r = s.substitute(outId, inId); if (r.ok) backToPause(2); return r; }} />
  );
  if (!ended && sub === "tatica" && snap.tatica) return (
    <TacticsView m={m} tatica={snap.tatica} teamById={teamById} onCancel={() => backToPause(1)}
      onApply={(f, a) => { const r = s.applyTactics(f, a); if (r.ok) backToPause(1); return r; }} />
  );
  if (sub === "lances") return <EventsView m={m} teamById={teamById} onBack={() => (ended ? goBackTo(PARTIDA) : backToPause(1))} />;
  if (postMatch) return <div className="state" role="status" aria-live="polite"><div className="state-line" />Continuando…</div>;
  if (ended && sub === "tabela") return renderTable({
    onBack: () => goBackTo(PARTIDA),
    onDivision: (id) => navigate(`${PARTIDA}?tela=tabela${id ? `&divisao=${encodeURIComponent(id)}` : ""}`, { replace: true }),
    onClub: (href, name) => setLeave({ kind: "result", to: href, club: name }),
  });
  if (ended) {
    const res = buildResult(snap, competitionName);
    const status = saveStatus(m.saved, snap.erroGravacao ?? null, !!snap.salvando || retrying);
    const friendly = snap.contexto === "amistoso";
    const ready = (friendly ? !!snap.semanaPronta : !!snap.resultadoPronto) && status === "saved";
    const cont = () => {
      if (!ready || postMatchRef.current) return;
      if (friendly) {
        // Fase 3: o amistoso fecha a semana; "Continuar" mostra o resumo
        // dela (Semana concluída), sem o pós-jogo do campeonato.
        postMatchRef.current = true; guardRef.current = false;
        WeekGateway.friendlySummary().then((r) => {
          weekStore.set(r);
          s.discard(); onFinished();
          navigate(r ? `${BASE}/semana` : `${BASE}/`, { replace: true });
        });
        return;
      }
      const r = s.continuePostMatch();
      if (r.ok) { postMatchRef.current = true; guardRef.current = false; setPostMatch(true); s.reveal(true); }
    };
    return <ResultView m={m} res={res} teamById={teamById} status={status} ready={ready} friendly={friendly} onContinue={cont} onRetry={retry} onLogin={() => setLogin(true)} />;
  }

  return (
    <div className="mt">
      <header className="mt-head">
        <Wordmark />
        <span className="sub-head-ctx">Partida</span>
      </header>
      <h1 className="sr-only">Partida ao vivo</h1>

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
    </div>
  );
  }
}

function saveStatus(saved: boolean | null, err: SaveError | null, busy: boolean): SaveStatus {
  if (saved === true) return "saved";
  if (busy || saved === null) return "saving";
  return err === "sessao" ? "session" : err === "outra-conta" ? "other-account" : "failed";
}

// Confirmação de saída (AUD-03/04): no jogo, simula o resto; no Resultado,
// diz o que se perde. O foco começa em ficar — sair é a ação destrutiva.
function LeaveSheet({ leave, saved, friendly, onStay, onLeave }: { leave: Leave; saved: boolean; friendly: boolean; onStay: () => void; onLeave: () => void }) {
  if (leave.kind === "live") return (
    <Sheet alert labelledBy="lv-t" describedBy="lv-d" onDismiss={onStay}>
      <h2 id="lv-t" className="sheet-title">Sair da partida?</h2>
      <p id="lv-d" className="lv-text">O restante do jogo será simulado e o resultado, gravado — como “Pular para o fim”.</p>
      <button type="button" className="cta" onClick={onLeave}>Sair e simular o resto</button>
      <button type="button" className="text-btn" data-autofocus onClick={onStay}>Continuar jogando</button>
    </Sheet>
  );
  const club = leave.club;
  return (
    <Sheet alert labelledBy="lv-t" describedBy="lv-d" onDismiss={onStay}>
      <h2 id="lv-t" className="sheet-title">Sair do resultado?</h2>
      <p id="lv-d" className="lv-text">{saved && friendly
        ? "O amistoso já está salvo. O resumo da semana pode não ser mostrado se você sair agora."
        : saved
        ? "A rodada já está salva. O que vem em “Continuar” — coletiva, resumo da rodada e jogo de Copa pendente — pode não ser mostrado se você sair agora."
        : "O resultado desta partida ainda não foi salvo. Se você sair agora, ele será perdido."}</p>
      <button type="button" className="cta" data-autofocus onClick={onStay}>{saved ? "Voltar ao resultado" : "Ficar e salvar"}</button>
      <button type="button" className="text-btn" onClick={onLeave}>{club ? `Sair e abrir o elenco do ${club}` : saved ? "Sair mesmo assim" : "Sair sem salvar"}</button>
    </Sheet>
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
// Rodapé pelo estado da gravação (AUD-02): "Continuar" só com o resultado
// salvo de verdade; na falha, a ação é recuperar (sem simular de novo). Um
// único botão, para o foco não se perder quando o estado muda.
const SAVE_COPY: Record<SaveStatus, string | null> = {
  saving: null,
  saved: null,
  failed: "Não foi possível salvar o resultado. Ele continua guardado aqui — tente de novo.",
  session: "Sua sessão expirou. Entre de novo, com a mesma conta, para salvar o resultado.",
  "other-account": "Outra conta entrou neste navegador. Entre com a conta em que a partida foi jogada para salvar o resultado.",
};
function ResultView({ m, res, teamById, status, ready, friendly, onContinue, onRetry, onLogin }: {
  m: MatchModel; res: ResultModel | null; teamById: (id: string | number) => Team; status: SaveStatus; ready: boolean; friendly: boolean;
  onContinue: () => void; onRetry: () => void; onLogin: () => void;
}) {
  const msg = SAVE_COPY[status];
  const action = status === "saved"
    ? { label: ready ? "Continuar" : "Salvando…", act: onContinue, disabled: !ready }
    : status === "saving" ? { label: "Salvando…", act: () => {}, disabled: true }
    : status === "failed" ? { label: "Tentar salvar novamente", act: onRetry, disabled: false }
    : { label: "Entrar para salvar", act: onLogin, disabled: false };
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
        {!friendly && (
          <a className="row" href={`${PARTIDA}?tela=tabela`} onClick={(e) => { e.preventDefault(); navigate(`${PARTIDA}?tela=tabela`); }}>
            <IconList className="row-icon rs-ico" />
            <span className="row-body"><span className="row-title">Ver tabela</span></span>
            <IconChevron className="row-chevron" />
          </a>
        )}
      </nav>
      <div className="mt-foot pz-foot">
        <p className="sr-only" role="status" aria-live="polite">{status === "saving" ? "Salvando o resultado…" : status === "saved" ? "Resultado salvo." : ""}</p>
        {msg && <p className="inline-error" role="alert">{msg}</p>}
        <button type="button" className="cta" aria-disabled={action.disabled || undefined} data-save={status}
          onClick={() => { if (!action.disabled) action.act(); }}>{action.label}<IconChevron className="cta-arrow" /></button>
      </div>
    </div>
  );
}
