// Fase 3 (plano de independência) — a semana.
// - Semana concluída (CAP04-N01, complemento 17 col. 1): /carreira/semana.
//   Com ?avancar=semana|jogo, avança pelo motor (mesmo turno da versão
//   anterior) e mostra o resumo; depois do amistoso, mostra o resumo que o
//   fim do amistoso deixou. Só "Continuar" (decisão de 04/11).
// - Pré-jogo de amistoso (CAP04-N02, complemento 17 col. 2): /carreira/amistoso,
//   com os convites da semana para escolher (decisão de 04/11).
// - Notícias (CAP06-T06, 13_historia col. 2): /carreira/noticias.
// - Avisos (sino, P8): folha aberta pelo topo do Início.
import { useEffect, useRef, useState } from "react";
import { WeekGateway, weekStore } from "../adapters/week.ts";
import { buildWeekDone, type FriendlyModel, type NewsModel, type NoticesModel, type SkipInfo, type WeekSummary } from "../domain/week.ts";
import { Crest, Wordmark } from "../ui/components.tsx";
import { Sheet } from "../ui/dialog.tsx";
import { IconAlert, IconArrow, IconBack, IconCalendar, IconCheck, IconChevron, IconGift, IconMail, IconPitch, IconTrophy, IconUsers } from "../ui/icons.tsx";
import { BASE, Link, goBack, goBackTo, navigate } from "../ui/router.tsx";
import "./home.css";
import "./calendar.css";
import "./week.css";

const SAVE_MSG: Record<string, string> = {
  sessao: "Sua sessão expirou. Entre de novo para avançar.",
  "outra-conta": "Esta carreira é de outra conta.",
};

function SubHead({ ctx, back }: { ctx: string; back?: () => void }) {
  return (
    <header className="sub-head">
      {back ? <button type="button" className="back-btn back-btn--bare" onClick={back} aria-label="Voltar"><IconBack /></button> : <span />}
      <Wordmark />
      <span className="sub-head-ctx">{ctx}</span>
    </header>
  );
}

// ---------- Semana concluída ----------
export function WeekDone({ clubName, mode, onAdvanced, onExpired }: {
  clubName: string; mode: "semana" | "jogo" | null; onAdvanced: () => void; onExpired: () => void;
}) {
  const startOnce = useRef(mode);
  const [summary, setSummary] = useState<WeekSummary | null>(() => (mode ? null : weekStore.get()));
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Um avanço por vez (o efeito pode rodar de novo sem a tela sair, ex.:
  // StrictMode em desenvolvimento): o 2º disparo espera o 1º.
  const inflight = useRef(false);
  useEffect(() => {
    const m = startOnce.current;
    if (inflight.current) return;
    if (!m) {
      // Sem resumo em memória (página recarregada): a semana já foi gravada.
      if (!weekStore.get()) navigate(`${BASE}/`, { replace: true });
      return;
    }
    startOnce.current = null;
    inflight.current = true;
    // Tira o ?avancar da barra: recarregar não avança outra semana.
    navigate(`${BASE}/semana`, { replace: true });
    setError(null);
    WeekGateway.advance(m === "jogo").then((r) => {
      inflight.current = false;
      if (r.ok) { weekStore.set(r.resumo); setSummary(r.resumo); onAdvanced(); return; }
      if (r.motivo === "amistoso") { navigate(`${BASE}/amistoso`, { replace: true }); return; }
      if (r.motivo === "sem-semana") { navigate(`${BASE}/`, { replace: true }); return; }
      if (r.motivo === "sessao") onExpired();
      setError(SAVE_MSG[r.motivo || ""] || "Não foi possível avançar a semana. Nada foi alterado.");
      startOnce.current = m;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const done = () => { weekStore.set(null); navigate(`${BASE}/`, { replace: true }); };
  if (error) return (
    <div className="state" role="alert">{error}
      <button className="state-btn" onClick={() => setAttempt((n) => n + 1)}>Tentar novamente</button>
      <button className="text-btn" onClick={() => navigate(`${BASE}/`, { replace: true })}>Ir para o início</button>
    </div>
  );
  if (!summary) return <div className="state" role="status" aria-live="polite"><div className="state-line" />Avançando a semana…</div>;

  const m = buildWeekDone(summary, clubName);
  return (
    <div className="wk">
      <SubHead ctx="Semana" />
      <h1 className="screen-title">{m.title}</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{m.sub}</p>

      {m.friendly && (
        <section className="wk-sec" aria-labelledby="wk-am">
          <h2 className="kicker-caps" id="wk-am">Amistoso</h2>
          <dl className="wk-list">
            <div className="wk-item wk-item--stack"><dt>{m.friendly.score}</dt><dd>{m.friendly.note}</dd></div>
          </dl>
        </section>
      )}

      <section className="wk-sec" aria-labelledby="wk-tr">
        <h2 className="kicker-caps" id="wk-tr">Treino aplicado</h2>
        <dl className="wk-list">
          {m.training ? (<>
            <div className="wk-item"><dt>{m.training.perWeek ? "Sessões por semana" : "Sessões"}</dt><dd>{m.training.sessions}</dd></div>
            {m.training.intensity && <div className="wk-item"><dt>Intensidade</dt><dd>{m.training.intensity}</dd></div>}
          </>) : <div className="wk-item"><dt>Sem treino</dt><dd>Férias</dd></div>}
        </dl>
      </section>

      {m.condition && (
        <section className="wk-sec" aria-labelledby="wk-cd">
          <h2 className="kicker-caps" id="wk-cd">Condição do elenco</h2>
          <dl className="wk-list">
            <div className="wk-item"><dt>Média do elenco</dt><dd>{m.condition.average}</dd></div>
            {m.condition.players.map((p) => (
              <div key={p.id} className="wk-item"><dt>{p.name}</dt><dd className={p.delta > 0 ? "is-pos" : "is-neg"}>{p.text}</dd></div>
            ))}
          </dl>
        </section>
      )}

      <section className="wk-sec" aria-labelledby="wk-pz">
        <h2 className="kicker-caps" id="wk-pz">Prazos e finanças</h2>
        <dl className="wk-list">
          {m.deadlines.length ? m.deadlines.map((d) => (
            <div key={d.label} className="wk-item"><dt>{d.label}</dt><dd className={d.tone === "pos" ? "is-pos" : d.tone === "neg" ? "is-neg" : undefined}>{d.value}</dd></div>
          )) : <div className="wk-item"><dt>Nenhum prazo nesta semana</dt><dd /></div>}
          <div className="wk-item"><dt>Caixa</dt><dd>{m.cash}</dd></div>
        </dl>
        {m.skipped && <p className="wk-note">{m.skipped}</p>}
      </section>

      <div className="cal-foot"><button type="button" className="cta" onClick={done}>Continuar<IconArrow className="cta-arrow" /></button></div>
    </div>
  );
}

// ---------- Pré-jogo de amistoso ----------
export function FriendlyPre({ m, onChanged, onExpired }: { m: FriendlyModel; onChanged: () => Promise<void> | void; onExpired: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const opp = m.chosen ? m.invites.find((i) => String(i.team.id) === m.chosen)?.team || null : null;
  const pick = async (id: string) => {
    if (busy || id === m.chosen && m.picked) return;
    setBusy(id); setError(null);
    const r = await WeekGateway.chooseFriendly(id);
    if (r.ok) await onChanged();
    else { if (r.motivo === "sessao") onExpired(); setError(SAVE_MSG[r.motivo || ""] || "Não foi possível salvar a escolha. Tente de novo."); }
    setBusy(null);
  };
  const canStart = !!m.chosen && !busy;
  return (
    <div className="wk am">
      <SubHead ctx="Amistoso" back={() => goBack(`${BASE}/`)} />
      <h1 className="screen-title">Entre em campo.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Prepare seu time para o amistoso.</p>

      <section className="wk-sec" aria-labelledby="am-k">
        <h2 className="kicker-caps" id="am-k">Amistoso</h2>
        <p className="am-rule">Não vale pontos; lesões contam.{m.optional && " Opcional: escolha um convite para jogar, ou avance a semana sem amistoso."}</p>
        <div className="am-vs" aria-label={opp ? `${m.me.name} contra ${opp.name}` : "Adversário a escolher"}>
          <span className="am-team"><Crest team={m.me} size={52} /><b>{m.me.name}</b></span>
          <span className="am-x" aria-hidden="true">×</span>
          <span className="am-team">{opp ? <><Crest team={opp} size={52} /><b>{opp.name}</b></> : <><span className="am-empty" aria-hidden="true">?</span><b className="am-muted">A escolher</b></>}</span>
        </div>
      </section>

      <section className="wk-sec" aria-labelledby="am-cv">
        <h2 className="kicker-caps" id="am-cv">Convites</h2>
        <div className="am-opts" role="radiogroup" aria-labelledby="am-cv">
          {m.invites.map((i) => {
            const id = String(i.team.id);
            const on = m.chosen === id;
            return (
              <button key={id} type="button" role="radio" aria-checked={on} className={`am-opt${on ? " is-on" : ""}`} disabled={!!busy} onClick={() => pick(id)}>
                <Crest team={i.team} size={32} />
                <span className="row-body"><span className="row-title">{i.team.name}</span>{i.division && <span className="row-sub">{i.division}</span>}</span>
                {busy === id ? <span className="am-saving">Salvando…</span> : on ? <IconCheck className="am-check" /> : <span className="am-dot" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {error && <p className="inline-error" role="alert">{error}</p>}
      </section>

      <section className="wk-sec" aria-labelledby="am-tm">
        <h2 className="kicker-caps" id="am-tm">Seu time</h2>
        <dl className="wk-list">
          <div className="wk-item"><dt>Formação atual</dt><dd>{m.formation}</dd></div>
        </dl>
        <nav aria-label="Escalação">
          {m.filled < 11 && (
            <Link className="row" to={`${BASE}/escalacao`}>
              <IconAlert className="row-icon" />
              <span className="row-body"><span className="row-title">Escalação incompleta</span><span className="row-sub">{m.filled}/11 titulares definidos</span></span>
              <IconChevron className="row-chevron" />
            </Link>
          )}
          <Link className="row" to={`${BASE}/escalacao`}>
            <IconPitch className="row-icon" />
            <span className="row-body"><span className="row-title">Escalação</span></span>
            <span className="row-sub am-review">Revisar</span>
            <IconChevron className="row-chevron" />
          </Link>
        </nav>
      </section>

      <div className="cal-foot">
        {canStart
          ? <Link className="cta" to={`${BASE}/partida?iniciar=amistoso`}>Iniciar amistoso<IconArrow className="cta-arrow" /></Link>
          : <button type="button" className="cta" aria-disabled="true">{busy ? "Salvando…" : "Escolha um convite"}</button>}
        {m.optional
          ? <Link className="link-back" to={`${BASE}/semana?avancar=semana`}>Avançar sem amistoso</Link>
          : <button type="button" className="link-back" onClick={() => goBackTo(`${BASE}/`)}>Voltar ao clube</button>}
      </div>
    </div>
  );
}

// ---------- "Avançar até o próximo jogo" (Início) ----------
export function SkipToMatch({ info }: { info: SkipInfo }) {
  const [ask, setAsk] = useState(false);
  const go = () => navigate(`${BASE}/semana?avancar=jogo`);
  return (<>
    <button type="button" className="text-btn home-skip" onClick={() => (info.friendlies ? setAsk(true) : go())}>Avançar até o próximo jogo</button>
    {ask && (
      <Sheet alert labelledBy="sk-t" describedBy="sk-d" onDismiss={() => setAsk(false)}>
        <h2 id="sk-t" className="sheet-title">Pular {info.friendlies === 1 ? "o amistoso" : "os amistosos"}?</h2>
        <p id="sk-d" className="wk-sheet-text">Avançar até o próximo jogo passa {info.weeks} {info.weeks === 1 ? "semana" : "semanas"} de uma vez. {info.friendlies === 1 ? "O amistoso do caminho não será jogado." : `Os ${info.friendlies} amistosos do caminho não serão jogados.`}</p>
        <button type="button" className="cta" data-autofocus onClick={() => setAsk(false)}>Voltar</button>
        <button type="button" className="text-btn" onClick={() => { setAsk(false); go(); }}>Avançar mesmo assim</button>
      </Sheet>
    )}
  </>);
}

// ---------- Notícias ----------
export function News({ m }: { m: NewsModel }) {
  return (
    <div className="wk nw">
      <SubHead ctx="Notícias" back={() => goBack(`${BASE}/`)} />
      <h1 className="screen-title">Nos bastidores.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{m.sub}</p>

      <section className="wk-sec" aria-labelledby="nw-sq">
        <h2 className="kicker-caps" id="nw-sq">Seu elenco</h2>
        <ul className="nw-list">
          {m.squad.length ? m.squad.map((s) => <li key={s.id} className="nw-item nw-item--sq">{s.text}</li>)
            : <li className="nw-item nw-item--sq">Elenco 100% disponível: ninguém lesionado ou suspenso.</li>}
        </ul>
      </section>

      <section className="wk-sec" aria-labelledby="nw-fd">
        <h2 className="kicker-caps" id="nw-fd">Manchetes</h2>
        {m.items.length ? (
          <ul className="nw-list">
            {m.items.map((n) => (
              <li key={n.key} className={`nw-item${n.mine ? " is-mine" : ""}`}>
                <span className="nw-title">{n.title}</span>
                <span className="nw-meta">{n.mine ? "Seu clube · " : ""}{n.meta}</span>
              </li>
            ))}
          </ul>
        ) : <p className="wk-note">Nenhuma notícia ainda. As manchetes aparecem depois da primeira rodada.</p>}
      </section>

      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(`${BASE}/`)}>Voltar ao clube</button></div>
    </div>
  );
}

// ---------- Avisos (sino) ----------
// Ícone em traço por tipo de aviso (os tipos da central da versão anterior).
const NOTICE_ICON: Record<string, (p: { className?: string }) => JSX.Element> = {
  calendario: IconCalendar, lesao: IconAlert, proposta: IconMail, posicao: IconTrophy, olheiro: IconUsers, loja: IconGift, partida: IconPitch,
};
export function NoticesSheet({ m, onClose }: { m: NoticesModel; onClose: () => void }) {
  return (
    <Sheet labelledBy="nt-t" onDismiss={onClose}>
      <h2 id="nt-t" className="sheet-title">Avisos</h2>
      {m.items.length ? (
        <ul className="sheet-list nt-list">
          {m.items.map((n) => (
            <li key={n.key} className="nt-item">
              {(() => { const I = NOTICE_ICON[n.kind] || IconAlert; return <I className={`nt-ico${n.unread ? " is-new" : ""}`} />; })()}
              <span className="nt-body"><span className="nt-text">{n.unread && <span className="sr-only">Novo: </span>}{n.text}</span><span className="nt-when">{n.when}</span></span>
            </li>
          ))}
        </ul>
      ) : <p className="wk-note">Nenhum aviso ainda. Lesões, propostas, posição na tabela e olheiros aparecem aqui quando acontecem.</p>}
      <button type="button" className="text-btn" data-autofocus onClick={onClose}>Fechar</button>
    </Sheet>
  );
}

