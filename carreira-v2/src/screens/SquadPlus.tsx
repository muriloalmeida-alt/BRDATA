// Fase 7 (plano de independência) — elenco avançado pela v2:
// - /carreira/elenco/ficha?id= (&tela=numeros|atributos): Ficha completa
//   (CAP02-N02, complemento 29 e 30 col. 1), aberta pelo Perfil;
// - Renovar contrato (CAP05-N01, 30 col. 3) e a resposta (31 col. 1-2), em folhas;
// - /carreira/elenco/conversa?id=: Conversa e reação (CAP06-T03, 31 col. 3 / 32 col. 1);
// - /carreira/contratos: Contratos (CAP05-T06, 30 col. 2);
// - /carreira/elenco/comparar?a=&b=: Comparar (CAP02-N03, 32 col. 2);
// - /carreira/clube-elenco?id= e /jogador: Elenco de outro clube (CAP02-N04, 32 col. 3);
// - /carreira/coletiva?volta=: coletiva avulsa (renovação recusada).
import { useEffect, useState } from "react";
import { SquadGateway, type PlayerAction, type RenewResult } from "../adapters/squadplus.ts";
import { legacyClubHref, legacyPlayerHref } from "../adapters/legacy.ts";
import { pressEffect } from "../domain/postmatch.ts";
import { buildClubRoster, buildCompare, buildContracts, buildFicha, comparePool, suggestedWage, POSITION, type CmpPlayer } from "../domain/squadplus.ts";
import { moneyShort } from "../domain/home.ts";
import { shortName } from "../domain/lineup.ts";
import type { Career, Player } from "../domain/types.ts";
import { Jersey } from "../ui/components.tsx";
import { Sheet } from "../ui/dialog.tsx";
import { IconCheck, IconChevron } from "../ui/icons.tsx";
import { BASE, Link, goBackTo, navigate } from "../ui/router.tsx";
import { Head, errText } from "./Tactics.tsx";
import "./home.css";
import "./calendar.css";
import "./match.css";
import "./week.css";
import "./prep.css";
import "./squadplus.css";

type Row = { label: string; value: string; tone?: "pos" | "neg" };
function Rows({ rows }: { rows: Row[] }) {
  return <dl className="wk-list">{rows.map((r, i) => <div key={`${r.label}-${i}`} className="wk-item"><dt>{r.label}</dt><dd className={r.tone === "pos" ? "is-pos" : r.tone === "neg" ? "is-neg" : undefined}>{r.value}</dd></div>)}</dl>;
}
function PlayerRow({ name, position, to }: { name: string; position: string; to?: string }) {
  const inner = <><Jersey value="" size={44} /><span className="row-body"><span className="row-title">{name}</span><span className="row-sub">{position}</span></span>{to && <IconChevron className="row-chevron" />}</>;
  return to ? <Link className="row sp-player" to={to}>{inner}</Link> : <div className="row sp-player">{inner}</div>;
}
const FICHA = (id: string, tela?: string) => `${BASE}/elenco/ficha?id=${encodeURIComponent(id)}${tela ? `&tela=${tela}` : ""}`;

// ---------- Renovar ----------
export function RenewSheets({ player, back, onClose, onDone }: { player: Player; back: string; onClose: () => void; onDone: () => void }) {
  const sug = suggestedWage(player);
  const [wage, setWage] = useState(String(sug));
  const [years, setYears] = useState(2);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<RenewResult | null>(null);
  const send = async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    const r = await SquadGateway.renew(player.id, Number(wage.replace(/\D/g, "")) || 0, years);
    setBusy(false);
    if (r.ok) { setRes(r); if (r.aceita) onDone(); } else setErr(errText(r));
  };
  if (res) return (
    <Sheet labelledBy="rn-r" onDismiss={() => { if (res.aceita) onClose(); }}>
      <h2 id="rn-r" className="sheet-title">{res.aceita ? "Proposta aceita." : "Proposta recusada."}</h2>
      <span className="tb-bar pr-sheet-bar" aria-hidden="true" />
      <p className="wk-sheet-text">Resposta do jogador à renovação.</p>
      <PlayerRow name={shortName(player.name)} position={POSITION[player.group]} />
      {!res.aceita && <p className="sp-reason">Motivo: {res.motivo}</p>}
      <Rows rows={[{ label: res.aceita ? "Novo salário mensal" : "Salário proposto", value: moneyShort(res.salario) }, { label: "Duração proposta", value: `${res.anos} ${res.anos === 1 ? "ano" : "anos"}` }, ...(res.aceita ? [{ label: "Contrato até", value: String(res.ate) }] : [])]} />
      {res.aceita
        ? <button type="button" className="text-btn" data-autofocus onClick={onClose}>{back === "contratos" ? "Voltar aos contratos" : "Voltar ao jogador"}</button>
        : <button type="button" className="cta" data-autofocus onClick={() => navigate(`${BASE}/coletiva?volta=${encodeURIComponent(back === "contratos" ? `${BASE}/contratos` : FICHA(player.id))}`)}>Continuar</button>}
    </Sheet>
  );
  return (
    <Sheet labelledBy="rn-t" onDismiss={busy ? undefined : onClose}>
      <h2 id="rn-t" className="sheet-title">Mantenha seu jogador.</h2>
      <span className="tb-bar pr-sheet-bar" aria-hidden="true" />
      <p className="wk-sheet-text">Faça uma proposta de renovação.</p>
      <PlayerRow name={shortName(player.name)} position={POSITION[player.group]} />
      <Rows rows={[{ label: "Salário atual", value: player.wage != null ? moneyShort(player.wage) : "—" }, { label: "Salário sugerido", value: moneyShort(sug) }]} />
      <label className="pr-label" htmlFor="rn-w">Novo salário mensal (R$)</label>
      <input id="rn-w" className="pr-input" inputMode="numeric" value={wage} onChange={(e) => setWage(e.target.value.replace(/[^\d]/g, ""))} />
      <span className="pr-label" id="rn-d">Duração da proposta (anos)</span>
      <div className="tk-seg" role="radiogroup" aria-labelledby="rn-d">
        {[1, 2, 3, 4, 5].map((v) => <button key={v} type="button" role="radio" aria-checked={years === v} className={`tk-step${years >= v ? " is-fill" : ""}${years === v ? " is-on" : ""}`} onClick={() => setYears(v)} aria-label={`${v} ${v === 1 ? "ano" : "anos"}`}>{v}</button>)}
      </div>
      {err && <p className="inline-error" role="alert">{err}</p>}
      <button type="button" className="cta sp-sheet-cta" aria-disabled={busy || undefined} onClick={send}>{busy ? "Enviando…" : "Propor renovação"}</button>
      <button type="button" className="text-btn" disabled={busy} onClick={onClose}>Cancelar</button>
    </Sheet>
  );
}

// ---------- Ficha completa ----------
export function Ficha({ career, id, tela, onChanged }: { career: Career; id: string; tela: string | null; onChanged: () => Promise<void> | void }) {
  const m = buildFicha(career, id);
  const [renew, setRenew] = useState(false);
  const [ask, setAsk] = useState<null | { id: PlayerAction; label: string; confirm?: string; danger?: boolean }>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (!m) navigate(`${BASE}/elenco`, { replace: true }); }, [m]);
  if (!m) return null;
  const act = async (a: PlayerAction, label: string) => {
    setBusy(true); setErr(null); setMsg(null);
    const r = await SquadGateway.action(m.player.id, a);
    setBusy(false); setAsk(null);
    if (!r.ok) { setErr(errText(r)); return; }
    if (a === "release") { await onChanged(); navigate(`${BASE}/elenco`, { replace: true }); return; }
    setMsg(`${label}: feito.`); await onChanged();
  };
  if (tela === "atributos") return (
    <div className="wk pr">
      <Head ctx="Elenco" back={FICHA(id)} />
      <h1 className="screen-title">Atributos.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{m.short} · {m.position}</p>
      <section className="wk-sec"><Rows rows={m.attrs} /></section>
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(FICHA(id))}>Voltar ao jogador</button></div>
    </div>
  );
  if (tela === "numeros") return (
    <div className="wk pr">
      <Head ctx="Elenco" back={FICHA(id)} />
      <h1 className="screen-title">A temporada em números.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Estatísticas e histórico de {m.short}.</p>
      <section className="wk-sec" aria-labelledby="fn-s"><h2 className="kicker-caps" id="fn-s">Estatísticas da temporada</h2><Rows rows={m.season} /></section>
      <section className="wk-sec" aria-labelledby="fn-c"><h2 className="kicker-caps" id="fn-c">Histórico de clubes</h2>
        {m.clubs.length ? <Rows rows={m.clubs} /> : <p className="wk-note">O histórico aparece a partir da primeira virada de temporada.</p>}</section>
      <nav className="wk-sec" aria-label="Mercado">
        {m.sale.loan && <a className="row pr-row" href={legacyPlayerHref(m.player.id)}><span className="row-body"><span className="row-title">{m.sale.listed ? "Ver anúncio de venda" : "Colocar à venda"}</span></span><span className="hb-ext" aria-label="abre a versão anterior">↗</span></a>}
        {m.sale.loan && <a className="row pr-row" href={legacyPlayerHref(m.player.id)}><span className="row-body"><span className="row-title">Emprestar</span></span><span className="hb-ext" aria-label="abre a versão anterior">↗</span></a>}
        <Link className="row pr-row" to={`${BASE}/elenco/comparar?a=${encodeURIComponent(id)}`}><span className="row-body"><span className="row-title">Comparar</span></span><IconChevron className="row-chevron" /></Link>
      </nav>
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(FICHA(id))}>Voltar ao jogador</button></div>
    </div>
  );
  return (
    <div className="wk pr">
      <Head ctx="Elenco" back={`${BASE}/elenco/jogador?id=${encodeURIComponent(id)}`} />
      <h1 className="screen-title">Conheça seu jogador.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Dados e trajetória no clube.</p>
      <section className="wk-sec">
        <PlayerRow name={m.short} position={m.position} to={`${BASE}/elenco/jogador?id=${encodeURIComponent(id)}`} />
        <Rows rows={m.facts} />
      </section>
      <section className="wk-sec" aria-labelledby="fc-a"><h2 className="kicker-caps" id="fc-a">Atributos</h2>
        <Link className="row pr-row" to={FICHA(id, "atributos")}><span className="row-body"><span className="row-title">Atributos do jogador</span></span><span className="row-sub pr-val">Ver</span><IconChevron className="row-chevron" /></Link>
      </section>
      <section className="wk-sec" aria-labelledby="fc-c"><h2 className="kicker-caps" id="fc-c">Contrato</h2><Rows rows={m.contract} /></section>
      <nav className="wk-sec" aria-label="Mais">
        <Link className="row pr-row" to={FICHA(id, "numeros")}><span className="row-body"><span className="row-title">A temporada em números</span><span className="row-sub">Estatísticas, histórico, mercado e comparar</span></span><IconChevron className="row-chevron" /></Link>
      </nav>
      {m.actions.length > 0 && (
        <section className="wk-sec" aria-labelledby="fc-m"><h2 className="kicker-caps" id="fc-m">Mais ações</h2>
          {m.actions.map((a) => (
            <button key={a.id} type="button" className={`row pr-row${a.danger ? " pr-danger" : ""}`} disabled={busy} onClick={() => (a.confirm ? setAsk(a) : act(a.id, a.label))}>
              <span className="row-body"><span className="row-title">{a.label}</span></span><IconChevron className="row-chevron" />
            </button>
          ))}
        </section>
      )}
      <div className="cal-foot">
        <p className="sr-only" role="status" aria-live="polite">{msg || ""}</p>
        {msg && <p className="pr-ok" aria-hidden="true">{msg}</p>}
        {err && <p className="inline-error" role="alert">{err}</p>}
        {!m.renew.ok && <p className="sp-why">{m.renew.why}</p>}
        <button type="button" className="cta" aria-disabled={!m.renew.ok || undefined} onClick={() => { if (m.renew.ok) setRenew(true); }}>Renovar contrato</button>
        {m.talk.ok
          ? <Link className="link-back" to={`${BASE}/elenco/conversa?id=${encodeURIComponent(id)}`}>Conversar</Link>
          : <button type="button" className="link-back sp-off" aria-disabled="true" title={m.talk.why || ""} onClick={() => setErr(m.talk.why)}>Conversar</button>}
      </div>
      {renew && <RenewSheets player={m.player} back="ficha" onClose={() => setRenew(false)} onDone={() => { onChanged(); }} />}
      {ask && (
        <Sheet alert labelledBy="fa-t" describedBy="fa-d" onDismiss={busy ? undefined : () => setAsk(null)}>
          <h2 id="fa-t" className="sheet-title">{ask.label}?</h2>
          <p id="fa-d" className="wk-sheet-text">{ask.confirm}</p>
          <button type="button" className="cta" data-autofocus onClick={() => setAsk(null)}>Cancelar</button>
          <button type="button" className={`text-btn${ask.danger ? " pr-danger-text" : ""}`} disabled={busy} onClick={() => act(ask.id, ask.label)}>{busy ? "…" : ask.label}</button>
        </Sheet>
      )}
    </div>
  );
}

// ---------- Conversa ----------
const TALK: [string, "apoiar" | "prometer" | "cobrar"][] = [["Ouvir e apoiar", "apoiar"], ["Prometer mais chances", "prometer"], ["Cobrar postura", "cobrar"]];
export function Talk({ career, id, onChanged }: { career: Career; id: string; onChanged: () => void }) {
  const p = (career.squad || []).find((x) => x.id === id);
  const [res, setRes] = useState<{ efeito: number; texto: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (!p) navigate(`${BASE}/elenco`, { replace: true }); }, [p]);
  if (!p) return null;
  const say = async (o: "apoiar" | "prometer" | "cobrar") => {
    if (busy) return;
    setBusy(o); setErr(null);
    const r = await SquadGateway.talk(id, o);
    setBusy(null);
    if (r.ok) { setRes(r); onChanged(); } else setErr(r.motivo === "sem-conversa" ? "Não dá para conversar com ele agora." : errText(r));
  };
  if (res) return (
    <div className="wk pr">
      <Head ctx="Conversa" back={FICHA(id)} />
      <h1 className="screen-title">Conversa encerrada.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Veja como o jogador reagiu.</p>
      <section className="wk-sec"><PlayerRow name={shortName(p.name)} position={POSITION[p.group]} to={FICHA(id)} /></section>
      <section className="wk-sec" aria-labelledby="cv-r"><h2 className="kicker-caps" id="cv-r">Reação do jogador</h2>
        <p className="se-goal-text dm-reason">{res.texto}</p>
        <Rows rows={[{ label: "Efeito na moral", value: res.efeito > 0 ? `+${res.efeito}` : res.efeito < 0 ? `−${Math.abs(res.efeito)}` : "0", tone: res.efeito > 0 ? "pos" : res.efeito < 0 ? "neg" : undefined }]} />
      </section>
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(FICHA(id))}>Voltar ao jogador</button></div>
    </div>
  );
  return (
    <div className="wk pr">
      <Head ctx="Conversa" back={FICHA(id)} />
      <h1 className="screen-title">Abra o diálogo.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Escolha como falar com o jogador.</p>
      <section className="wk-sec">
        <PlayerRow name={shortName(p.name)} position={POSITION[p.group]} to={FICHA(id)} />
        <Rows rows={[{ label: "Moral atual", value: String(p.morale ?? 70) }]} />
        <p className="wk-note">Situação: {p.moraleReason || "Precisa de uma conversa."}</p>
        <div className="pj-answers" role="radiogroup" aria-label="Como falar">
          {TALK.map(([label, o]) => (
            <button key={o} type="button" role="radio" aria-checked={busy === o} className="pj-answer" disabled={!!busy} onClick={() => say(o)}>
              {busy === o ? <IconCheck className="am-check" /> : <span className="am-dot" aria-hidden="true" />}<span className="pj-answer-t">{label}</span>
            </button>
          ))}
        </div>
        {err && <p className="inline-error" role="alert">{err}</p>}
      </section>
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(FICHA(id))}>Voltar ao jogador</button></div>
    </div>
  );
}

// ---------- Contratos ----------
export function Contracts({ career, onChanged }: { career: Career; onChanged: () => void }) {
  const [tab, setTab] = useState<"todos" | "vencendo">("todos");
  const [renew, setRenew] = useState<Player | null>(null);
  const list = buildContracts(career, tab === "vencendo");
  return (
    <div className="wk pr">
      <Head ctx="Contratos" back={`${BASE}/clube`} />
      <h1 className="screen-title">Cuide da continuidade.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Salários e prazos do seu elenco.</p>
      <div className="pr-tabs sp-tabs2" role="tablist" aria-label="Contratos">
        {(["todos", "vencendo"] as const).map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} className={`pr-tab${tab === t ? " is-on" : ""}`} onClick={() => setTab(t)}>{t === "todos" ? "Todos" : "Vencendo"}</button>)}
      </div>
      <section className="wk-sec" role="tabpanel" aria-label={tab === "todos" ? "Todos" : "Vencendo"}>
        {list.length ? <ul className="pr-plist">{list.map((c) => (
          <li key={c.id}>
            <PlayerRow name={c.short} position={c.position} to={FICHA(c.id)} />
            <Rows rows={[{ label: "Salário mensal", value: c.wage }, { label: "Término", value: c.until }]} />
            {c.canRenew
              ? <button type="button" className="row pr-row" onClick={() => setRenew((career.squad || []).find((p) => p.id === c.id) || null)}><span className="row-body"><span className="row-title">Renovar</span></span><IconChevron className="row-chevron" /></button>
              : <p className="sp-why sp-why--row">Renovação no último ano de contrato.</p>}
          </li>
        ))}</ul> : <p className="wk-note">{tab === "vencendo" ? `Nenhum contrato termina em ${career.seasonYear}.` : "Nenhum contrato."}</p>}
      </section>
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(`${BASE}/clube`)}>Voltar ao clube</button></div>
      {renew && <RenewSheets player={renew} back="contratos" onClose={() => setRenew(null)} onDone={onChanged} />}
    </div>
  );
}

// ---------- Coletiva avulsa ----------
export function PressStandalone({ back }: { back: string }) {
  const [q, setQ] = useState<{ pergunta: string; respostas: { letra: string; texto: string }[] } | null | "nenhuma">(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [fx, setFx] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { SquadGateway.press().then((r) => setQ(r.ok ? r : "nenhuma")); }, []);
  useEffect(() => { if (q === "nenhuma") navigate(back, { replace: true }); }, [q, back]);
  if (q === null || q === "nenhuma") return <div className="state" role="status" aria-live="polite"><div className="state-line" />Carregando…</div>;
  const answer = async (l: string | null) => {
    if (busy) return;
    setBusy(true); setChosen(l); setErr(null);
    const r = await SquadGateway.answerPress(l);
    setBusy(false);
    if (!r.ok) { setErr(errText(r)); return; }
    if (l == null) navigate(back, { replace: true }); else setFx(pressEffect(r.reputacao, r.moral) || "Resposta registrada.");
  };
  return (
    <div className="wk pj">
      <Head ctx="Coletiva" back={back} />
      <h1 className="screen-title">Sua vez de falar.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Uma pergunta. Escolha sua resposta.</p>
      <section className="wk-sec" aria-labelledby="ps-q">
        <h2 className="kicker-caps">Coletiva</h2>
        <p className="pj-question" id="ps-q">{q.pergunta}</p>
        <div className="pj-answers" role="radiogroup" aria-labelledby="ps-q">
          {q.respostas.map((r) => {
            const on = chosen === r.letra;
            return <button key={r.letra} type="button" role="radio" aria-checked={on} className={`pj-answer${on ? " is-on" : ""}`} disabled={busy || !!fx} onClick={() => answer(r.letra)}>
              {on ? <IconCheck className="am-check" /> : <span className="am-dot" aria-hidden="true" />}<span className="pj-answer-t">{r.texto}</span></button>;
          })}
        </div>
        {fx && <p className="pj-effect" role="status">{fx}</p>}
        {err && <p className="inline-error" role="alert">{err}</p>}
      </section>
      <div className="cal-foot">
        {fx ? <button type="button" className="cta" data-autofocus onClick={() => navigate(back, { replace: true })}>Continuar</button>
          : <button type="button" className="link-back" disabled={busy} onClick={() => answer(null)}>Pular</button>}
      </div>
    </div>
  );
}

// ---------- Comparar ----------
const cmp = (p: Player): CmpPlayer => ({ id: p.id, name: p.name, group: p.group, overall: p.overall, atk: p.atk, def: p.def, phys: p.phys, age: p.age, wage: p.wage, value: p.value });
export function Compare({ career, a, b, ext }: { career: Career; a: string | null; b: string | null; ext: string | null }) {
  const [pick, setPick] = useState(false);
  const extP = ext ? (() => { const [club, pid] = ext.split(":"); return ((career.leagueSquads || {})[club] || []).find((p) => p.id === pid) || null; })() : null;
  const base = extP || (career.squad || []).find((p) => p.id === a) || null;
  const other = (career.squad || []).find((p) => p.id === b) || null;
  useEffect(() => { if (!base) navigate(`${BASE}/elenco`, { replace: true }); }, [base]);
  if (!base) return null;
  const back = extP ? `${BASE}/clube-elenco?id=${encodeURIComponent(ext!.split(":")[0])}` : FICHA(base.id, "numeros");
  const pool = comparePool(career, cmp(base));
  const m = other ? buildCompare(cmp(base), cmp(other)) : null;
  const go = (id: string) => navigate(`${BASE}/elenco/comparar?${ext ? `ext=${encodeURIComponent(ext)}` : `a=${encodeURIComponent(base.id)}`}&b=${encodeURIComponent(id)}`, { replace: true });
  return (
    <div className="wk pr">
      <Head ctx="Elenco" back={back} />
      <h1 className="screen-title">Compare lado a lado.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Escolha com os dados do elenco.</p>
      {m ? (<>
        <div className="sp-cmp" aria-label={`${m.a.name} contra ${m.b.name}`}>
          {[m.a, m.b].map((s, i) => (
            <div key={i} className="sp-cmp-col"><Jersey value="" size={48} /><b>{s.name}</b><span>{s.overall}</span><span>{s.age}</span><span className="sp-muted">{s.position}</span></div>
          ))}
        </div>
        <section className="wk-sec" aria-labelledby="cp-a"><h2 className="kicker-caps" id="cp-a">Atributos principais</h2>
          <Rows rows={m.rows.map((r) => ({ label: r.label, value: `${r.a} | ${r.b}` }))} />
          {m.verdict && <p className="wk-note">{m.verdict}</p>}
        </section>
      </>) : <p className="wk-note pr-pad">Escolha um {POSITION[base.group].toLowerCase()} do seu elenco para comparar com {shortName(base.name)}.</p>}
      <div className="cal-foot">
        <button type="button" className="cta" onClick={() => setPick(true)}>{m ? "Trocar jogador" : "Escolher jogador"}</button>
        <button type="button" className="link-back" onClick={() => goBackTo(back)}>{extP ? "Voltar ao clube" : "Voltar ao jogador"}</button>
      </div>
      {pick && (
        <Sheet labelledBy="cp-t" onDismiss={() => setPick(false)}>
          <h2 id="cp-t" className="sheet-title">Comparar com</h2>
          <div className="sheet-list" role="radiogroup" aria-labelledby="cp-t">
            {pool.map((p) => <button key={p.id} type="button" role="radio" aria-checked={p.id === b} className={`sheet-opt pr-opt${p.id === b ? " is-on" : ""}`} onClick={() => { setPick(false); go(p.id); }}>
              <span>{shortName(p.name)}<small>Overall {p.overall}{p.age != null ? ` · ${p.age} anos` : ""}</small></span>{p.id === b && <IconCheck className="sheet-check" />}</button>)}
            {!pool.length && <p className="wk-note">Nenhum jogador da mesma posição no seu elenco.</p>}
          </div>
          <button type="button" className="text-btn" onClick={() => setPick(false)}>Cancelar</button>
        </Sheet>
      )}
    </div>
  );
}

// ---------- Elenco de outro clube ----------
export function ClubRoster({ career, clubId, clubName, player }: { career: Career; clubId: string; clubName: string; player: string | null }) {
  const m = buildClubRoster(career, clubId, clubName);
  const back = `${BASE}/tabela`;
  const p = player ? ((career.leagueSquads || {})[clubId] || []).find((x) => x.id === player) : null;
  if (p) return (
    <div className="wk pr">
      <Head ctx="Outro clube" back={`${BASE}/clube-elenco?id=${encodeURIComponent(clubId)}`} />
      <h1 className="screen-title">{shortName(p.name)}.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{POSITION[p.group]} do {clubName}.</p>
      <section className="wk-sec"><Rows rows={[
        { label: "Overall", value: String(p.overall) }, { label: "Idade", value: p.age != null ? `${p.age} anos` : "—" },
        { label: "Ataque", value: p.atk != null ? String(p.atk) : "—" }, { label: "Defesa", value: p.def != null ? String(p.def) : "—" }, { label: "Físico", value: p.phys != null ? String(p.phys) : "—" },
        { label: "Valor de mercado", value: p.value != null ? moneyShort(p.value) : "—" },
      ]} /></section>
      <nav className="wk-sec" aria-label="Ações">
        <Link className="row pr-row" to={`${BASE}/elenco/comparar?ext=${encodeURIComponent(`${clubId}:${p.id}`)}`}><span className="row-body"><span className="row-title">Comparar com o meu</span></span><IconChevron className="row-chevron" /></Link>
        <a className="row pr-row" href={legacyClubHref(clubId)}><span className="row-body"><span className="row-title">Fazer proposta</span><span className="row-sub">Pelo mercado da versão anterior (fase 8)</span></span><span className="hb-ext" aria-label="abre a versão anterior">↗</span></a>
      </nav>
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(`${BASE}/clube-elenco?id=${encodeURIComponent(clubId)}`)}>Voltar ao clube</button></div>
    </div>
  );
  return (
    <div className="wk pr">
      <Head ctx="Outro clube" back={back} />
      <h1 className="screen-title">Conheça o adversário.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Consulte os jogadores do clube.</p>
      <section className="wk-sec"><Rows rows={[{ label: m.name, value: m.division || "" }, { label: "Posição na divisão", value: m.position }]} /></section>
      <section className="wk-sec" aria-labelledby="cr-e"><h2 className="kicker-caps" id="cr-e">Elenco</h2>
        {m.players.length ? m.players.map((x) => (
          <Link key={x.id} className="row sp-player" to={`${BASE}/clube-elenco/jogador?id=${encodeURIComponent(clubId)}&jogador=${encodeURIComponent(x.id)}`}>
            <Jersey value="" size={44} /><span className="row-body"><span className="row-title">{x.short}</span><span className="row-sub">{x.position} · overall {x.overall}{x.age != null ? ` · ${x.age} anos` : ""}</span></span><IconChevron className="row-chevron" />
          </Link>
        )) : <p className="wk-note">Elenco indisponível.</p>}
      </section>
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(back)}>Voltar à tabela</button></div>
    </div>
  );
}
