// Fase 4 (plano de independência) — pós-jogo pela v2, em /carreira/pos-jogo.
// No lugar da tela cheia da versão anterior, uma etapa por vez, na ordem
// de sempre:
// - Coletiva (CAP04-N03, complemento 17 col. 3): "Sua vez de falar.";
// - Notícias da rodada: "Nos bastidores." só da rodada, com as finanças;
// - Resultados da rodada (CAP04-N04, complemento 18 col. 1): "A disputa
//   continua.", com "Ver tabela" (?tela=tabela);
// - Perna da Copa: a Partida da v2 (?iniciar=copa), com o contexto da Copa;
// - Proposta recebida (CAP05-T05, complemento 18 col. 2): "Uma oferta chegou.".
// Sem etapa pendente, a sequência termina no Início.
import { useEffect, useRef, useState } from "react";
import { PostMatchGateway } from "../adapters/postmatch.ts";
import { buildOffer, buildRoundNews, buildRoundResults, cupLegTitle, pressEffect, type PostMatchStep, type ResultRow } from "../domain/postmatch.ts";
import type { Team } from "../domain/types.ts";
import type { TableMatchContext } from "./Table.tsx";
import { Crest, Jersey, Wordmark } from "../ui/components.tsx";
import { Sheet } from "../ui/dialog.tsx";
import { IconArrow, IconCheck, IconChevron } from "../ui/icons.tsx";
import { BASE, Link, navigate } from "../ui/router.tsx";
import "./home.css";
import "./calendar.css";
import "./week.css";
import "./postmatch.css";

const POS = `${BASE}/pos-jogo`;
type View = { kind: "loading" } | { kind: "error"; message: string } | { kind: "step"; step: PostMatchStep };

function Head({ ctx }: { ctx: string }) {
  return (
    <header className="sub-head">
      <span />
      <Wordmark />
      <span className="sub-head-ctx">{ctx}</span>
    </header>
  );
}

export function PostMatch({ myId, teamById, tela, onChanged, onExpired, renderTable }: {
  myId: string; teamById: (id: string | number) => Team; tela: string | null;
  onChanged: () => void; onExpired: () => void; renderTable: (ctx: TableMatchContext) => JSX.Element;
}) {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [press, setPress] = useState<string | null>(null); // efeito da coletiva respondida
  const [chosen, setChosen] = useState<string | null>(null); // resposta escolhida
  const [leave, setLeave] = useState<string | null>(null);
  const ended = useRef(false);

  const finish = async () => {
    if (ended.current) return;
    ended.current = true;
    await PostMatchGateway.finish();
    onChanged();
    navigate(`${BASE}/`, { replace: true });
  };
  const show = (step: PostMatchStep) => {
    if (step.etapa === "nenhuma") { navigate(`${BASE}/`, { replace: true }); return; }
    if (step.etapa === "fim") { finish(); return; }
    if (step.etapa === "copa") { navigate(`${BASE}/partida?iniciar=copa`, { replace: true }); return; }
    setView({ kind: "step", step });
  };
  useEffect(() => {
    PostMatchGateway.current().then(show, () => setView({ kind: "error", message: "Não foi possível continuar." }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Respostas que gravam: falha de sessão abre o login; outras, aviso.
  const act = async <T extends { ok: boolean; motivo?: string }>(p: Promise<T>, then: (r: Extract<T, { ok: true }>) => void) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await p;
      if (!r.ok) {
        if (r.motivo === "sessao") onExpired();
        setView({ kind: "error", message: "Não foi possível salvar. Tente de novo." });
        return;
      }
      then(r as Extract<T, { ok: true }>);
    } catch {
      setView({ kind: "error", message: "Não foi possível continuar." });
    } finally { setBusy(false); }
  };

  if (view.kind === "loading") return <div className="state" role="status" aria-live="polite"><div className="state-line" />Continuando…</div>;
  if (view.kind === "error") return (
    <div className="state" role="alert">{view.message}
      <button className="state-btn" onClick={() => { setView({ kind: "loading" }); PostMatchGateway.current().then(show); }}>Tentar novamente</button>
      <button className="text-btn" onClick={() => navigate(`${BASE}/`, { replace: true })}>Ir para o início</button>
    </div>
  );
  const step = view.step;
  const sheets = leave && (
    <Sheet alert labelledBy="pj-lv" describedBy="pj-lvd" onDismiss={() => setLeave(null)}>
      <h2 id="pj-lv" className="sheet-title">Sair do pós-jogo?</h2>
      <p id="pj-lvd" className="wk-sheet-text">A rodada já está salva. O que ainda falta (perna da Copa ou proposta pendente) pode não ser mostrado agora.</p>
      <button type="button" className="cta" data-autofocus onClick={() => setLeave(null)}>Voltar aos resultados</button>
      <button type="button" className="text-btn" onClick={() => { const to = leave; setLeave(null); location.href = to; }}>Sair mesmo assim</button>
    </Sheet>
  );

  // ---------- Coletiva ----------
  if (step.etapa === "coletiva") {
    const next = () => { setPress(null); setChosen(null); PostMatchGateway.current().then(show); };
    return (
      <div className="wk pj">
        <Head ctx="Coletiva" />
        <h1 className="screen-title">Sua vez de falar.</h1>
        <span className="tb-bar" aria-hidden="true" />
        <p className="screen-sub">Uma pergunta. Escolha sua resposta.</p>
        <section className="wk-sec" aria-labelledby="pj-q">
          <h2 className="kicker-caps">Coletiva pós-jogo</h2>
          <p className="pj-question" id="pj-q">{step.pergunta}</p>
          <div className="pj-answers" role="radiogroup" aria-labelledby="pj-q">
            {step.respostas.map((r) => {
              const on = chosen === r.letra;
              return (
                <button key={r.letra} type="button" role="radio" aria-checked={on} className={`pj-answer${on ? " is-on" : ""}`} disabled={busy || !!press}
                  onClick={() => { setChosen(r.letra); act(PostMatchGateway.answerPress(r.letra), (x) => setPress(pressEffect(x.reputacao, x.moral) || "Resposta registrada.")); }}>
                  {on ? <IconCheck className="am-check" /> : <span className="am-dot" aria-hidden="true" />}<span className="pj-answer-t">{r.texto}</span>
                </button>
              );
            })}
          </div>
          {press && <p className="pj-effect" role="status">{press}</p>}
        </section>
        <div className="cal-foot">
          {press
            ? <button type="button" className="cta" data-autofocus onClick={next}>Continuar<IconArrow className="cta-arrow" /></button>
            : <button type="button" className="link-back" disabled={busy} onClick={() => act(PostMatchGateway.answerPress(null), () => next())}>Pular</button>}
        </div>
      </div>
    );
  }

  // ---------- Notícias da rodada ----------
  if (step.etapa === "noticias") {
    const m = buildRoundNews(step);
    return (
      <div className="wk nw pj">
        <Head ctx="Notícias" />
        <h1 className="screen-title">Nos bastidores.</h1>
        <span className="tb-bar" aria-hidden="true" />
        <p className="screen-sub">{m.sub}</p>
        <section className="wk-sec" aria-labelledby="pj-nm">
          <h2 className="kicker-caps" id="pj-nm">Manchetes da rodada</h2>
          {m.items.length ? (
            <ul className="nw-list">
              {m.items.map((n) => (
                <li key={n.key} className={`nw-item${n.mine ? " is-mine" : ""}`}>
                  <span className="nw-title">{n.title}</span>
                  <span className="nw-meta">{n.mine ? "Seu clube · " : ""}{n.meta}</span>
                </li>
              ))}
            </ul>
          ) : <p className="wk-note">Nenhuma manchete nesta rodada.</p>}
        </section>
        <section className="wk-sec" aria-labelledby="pj-fn">
          <h2 className="kicker-caps" id="pj-fn">Finanças da rodada</h2>
          <dl className="wk-list">
            {m.finance.map((f) => (
              <div key={f.label} className="wk-item"><dt>{f.label}</dt><dd className={f.tone === "pos" ? "is-pos" : f.tone === "neg" ? "is-neg" : undefined}>{f.value}</dd></div>
            ))}
          </dl>
        </section>
        <div className="cal-foot">
          <button type="button" className="cta" disabled={busy} onClick={() => act(PostMatchGateway.done("noticias"), show)}>Continuar<IconArrow className="cta-arrow" /></button>
        </div>
      </div>
    );
  }

  // ---------- Resultados da rodada (e "Ver tabela") ----------
  if (step.etapa === "resultados") {
    if (tela === "tabela") return (<>
      {renderTable({
        onBack: () => navigate(POS, { replace: true }),
        onDivision: (id) => navigate(`${POS}?tela=tabela${id ? `&divisao=${encodeURIComponent(id)}` : ""}`, { replace: true }),
        onClub: (href) => setLeave(href),
      })}
      {sheets}
    </>);
    const m = buildRoundResults(step, myId);
    const Row = ({ r }: { r: ResultRow }) => (
      <li className={`pj-res${r.mine ? " is-mine" : ""}`} aria-label={`${r.home.nome} ${r.score.replace("–", "a")} ${r.away.nome}${r.note ? `. ${r.note}` : ""}`}>
        <span className="pj-res-team"><Crest team={teamById(r.home.id)} size={34} /><b>{r.home.nome}</b></span>
        <span className="pj-res-score" aria-hidden="true">{r.score}{r.note && <small>{r.note}</small>}</span>
        <span className="pj-res-team pj-res-team--away"><Crest team={teamById(r.away.id)} size={34} /><b>{r.away.nome}</b></span>
      </li>
    );
    return (
      <div className="wk pj">
        <Head ctx="Rodada" />
        <h1 className="screen-title">A disputa continua.</h1>
        <span className="tb-bar" aria-hidden="true" />
        <p className="screen-sub">Confira todos os jogos da rodada.</p>
        <section className="wk-sec" aria-labelledby="pj-rs">
          <h2 className="kicker-caps" id="pj-rs">Resultados da rodada {m.round}</h2>
          <ul className="pj-results">{m.rows.map((r) => <Row key={r.key} r={r} />)}</ul>
          {m.changes && <p className="wk-note">{m.changes}</p>}
        </section>
        {m.cup && (
          <section className="wk-sec" aria-labelledby="pj-cp">
            <h2 className="kicker-caps" id="pj-cp">{m.cup.title}</h2>
            {m.cup.rows.length > 0 && <ul className="pj-results">{m.cup.rows.map((r) => <Row key={r.key} r={r} />)}</ul>}
            {m.cup.note && <p className="wk-note">{m.cup.note}</p>}
          </section>
        )}
        <div className="cal-foot">
          <button type="button" className="cta" disabled={busy} onClick={() => act(PostMatchGateway.done("resultados"), show)}>Continuar<IconArrow className="cta-arrow" /></button>
          <Link className="link-back" to={`${POS}?tela=tabela`}>Ver tabela</Link>
        </div>
        {sheets}
      </div>
    );
  }

  // ---------- Proposta recebida ----------
  if (step.etapa === "proposta") {
    const o = buildOffer(step);
    const answer = (d: "aceitar" | "recusar" | "depois") => act(PostMatchGateway.answerOffer(d), (r) => { onChanged(); show(r); });
    return (
      <div className="wk pj">
        <Head ctx="Proposta" />
        <h1 className="screen-title">Uma oferta chegou.</h1>
        <span className="tb-bar" aria-hidden="true" />
        <p className="screen-sub">Decida o futuro do seu jogador.</p>
        <section className="wk-sec">
          <Link className="row pj-player" to={`${BASE}/elenco/jogador?id=${encodeURIComponent(o.playerId)}`}>
            <Jersey value="" size={44} />
            <span className="row-body"><span className="row-title">{o.name}</span>{o.position && <span className="row-sub">{o.position}</span>}</span>
            <IconChevron className="row-chevron" />
          </Link>
          <dl className="wk-list">
            {o.age && <div className="wk-item"><dt>Idade</dt><dd>{o.age}</dd></div>}
          </dl>
        </section>
        <section className="wk-sec" aria-labelledby="pj-cl">
          <h2 className="kicker-caps" id="pj-cl">Clube interessado</h2>
          <dl className="wk-list"><div className="wk-item"><dt>{o.club}</dt><dd>{o.clubShort || ""}</dd></div></dl>
        </section>
        <section className="wk-sec" aria-labelledby="pj-vl">
          <h2 className="kicker-caps" id="pj-vl">Valor oferecido</h2>
          <p className="pj-fee">{o.fee}</p>
          <dl className="wk-list">
            <div className="wk-item"><dt>Parcelamento</dt><dd>{o.installments}</dd></div>
            {o.market && <div className="wk-item"><dt>Valor de mercado</dt><dd>{o.market}</dd></div>}
            {o.diff && <div className="wk-item"><dt>Diferença para o mercado</dt><dd className={o.diff.tone === "pos" ? "is-pos" : o.diff.tone === "neg" ? "is-neg" : undefined}>{o.diff.text}</dd></div>}
          </dl>
        </section>
        <div className="cal-foot">
          <button type="button" className="cta" disabled={busy} onClick={() => answer("aceitar")}>Aceitar</button>
          <button type="button" className="link-back" disabled={busy} onClick={() => answer("recusar")}>Recusar</button>
          <button type="button" className="text-btn" disabled={busy} onClick={() => answer("depois")}>Decidir depois</button>
        </div>
      </div>
    );
  }

  // Perna da Copa: aviso curto enquanto a Partida abre (cupLegTitle).
  if (step.etapa === "copa") {
    const t = cupLegTitle(step);
    return <div className="state" role="status">{`Copa do Brasil · ${t.sub}. ${t.line}`}</div>;
  }
  return null;
}
