// Fase 5 (plano de independência) — temporada e carreira do treinador.
// - /carreira/temporada: Encerramento (CAP04-T08, 02_resultados col. 3);
// - /carreira/temporada/nova: Nova temporada (CAP04-N06, complemento 21 col. 2);
// - /carreira/demissao: Fim de carreira / demissão (CAP06-T08, 22 col. 2);
// - /carreira/proposta-clube: Proposta ao treinador (CAP06-T04, 21 col. 3) com
//   a confirmação (22 col. 1);
// - /carreira/perfil: Perfil do treinador (CAP06-T01, 11_base_treinador col. 3);
// - /carreira/historico: Histórico e conquistas (CAP06-T05, 22 col. 3 / 23 col. 1).
import { useEffect, useState } from "react";
import { SeasonGateway, newSeasonStore } from "../adapters/season.ts";
import { buildCoach, buildDismissal, buildHistory, buildNewSeason, type ClubOfferModel, type CoachHistory, type SeasonEndModel } from "../domain/season.ts";
import type { Career } from "../domain/types.ts";
import { Crest, Wordmark } from "../ui/components.tsx";
import { crestSrc } from "../adapters/gateways.ts";
import { TITLE_HEAD, TITLE_LABEL, TITLE_TEXT, type TitleKind } from "../domain/onboarding.ts";
import { shareTitle } from "../ui/share.ts";
import { Sheet } from "../ui/dialog.tsx";
import { IconArrow, IconBack, IconCheck, IconChevron, IconClose, IconList, IconTrophy } from "../ui/icons.tsx";
import { BASE, Link, goBack, goBackTo, navigate } from "../ui/router.tsx";
import "./home.css";
import "./calendar.css";
import "./week.css";
import "./season.css";

const ERR: Record<string, string> = { sessao: "Sua sessão expirou. Entre de novo para continuar.", "outra-conta": "Esta carreira é de outra conta." };

function Head({ ctx, back }: { ctx: string; back?: () => void }) {
  return (
    <header className="sub-head">
      {back ? <button type="button" className="back-btn back-btn--bare" onClick={back} aria-label="Voltar"><IconBack /></button> : <span />}
      <Wordmark />
      <span className="sub-head-ctx">{ctx}</span>
    </header>
  );
}
type Row = { label: string; value: string; tone?: "pos" | "neg" };
function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="wk-list">
      {rows.map((r) => <div key={r.label} className="wk-item"><dt>{r.label}</dt><dd className={r.tone === "pos" ? "is-pos" : r.tone === "neg" ? "is-neg" : undefined}>{r.value}</dd></div>)}
    </dl>
  );
}

// ---------- Encerramento ----------
export function SeasonEnd({ m, onAdvanced, onExpired }: { m: SeasonEndModel; onAdvanced: () => Promise<void> | void; onExpired: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  // Cartão de título (mesmo desenho da versão anterior): o escudo vai sobre
  // a chapinha clara, então usa o original, não a versão negativa.
  const share = async (k: TitleKind) => {
    setShareMsg(null);
    const src = crestSrc(m.club);
    const r = await shareTitle({
      head: TITLE_HEAD[k], year: m.year, file: `campeao-${m.year}.png`,
      text: `${m.club.name} é ${TITLE_TEXT[k]} em ${m.year} no Modo Técnico!`,
      team: { name: m.club.name, short: m.club.short, c1: m.club.c1, c2: m.club.c2, src: src ? src.replace(/_neg\.(svg|png)$/, ".$1") : null },
    });
    if (r === "downloaded") setShareMsg("Imagem baixada: compartilhe pela sua galeria.");
    if (r === "failed") setShareMsg("Não deu pra gerar a imagem agora.");
  };
  const go = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    const r = await SeasonGateway.next();
    if (!r.ok) {
      if (r.motivo === "sessao") onExpired();
      setError(ERR[r.motivo || ""] || "Não foi possível começar a nova temporada. Nada foi alterado.");
      setBusy(false);
      return;
    }
    // Primeiro a tela seguinte, depois o save relido: com o save novo, o
    // Encerramento (temporada já virada) devolveria ao Início.
    if (r.demitido) { navigate(`${BASE}/demissao`, { replace: true }); onAdvanced(); return; }
    newSeasonStore.set(r);
    navigate(`${BASE}/temporada/nova`, { replace: true });
    onAdvanced();
  };
  return (
    <div className="wk se">
      <Head ctx="Temporada" back={() => goBack(`${BASE}/`)} />
      <h1 className="screen-title">Temporada encerrada.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{m.line}</p>
      <section className="home-match se-band" aria-label={m.position ? `${m.position}º lugar, ${m.club.name}` : m.club.name}>
        <div className="home-match-photo" aria-hidden="true" />
        <p className="mt-kicker se-kicker">{m.kicker}</p>
        {m.position != null && <p className="se-pos" aria-hidden="true">{m.position}<sup>º</sup></p>}
        <p className="se-club" aria-hidden="true"><Crest team={m.club} size={28} />{m.club.name}</p>
      </section>
      <nav className="wk-sec" aria-label="Temporada">
        {m.goal && (
          <div className="row se-goal">
            <span className="row-body"><span className="row-kicker row-kicker--caps">Meta da temporada</span><span className="row-title">{m.goal.label}</span></span>
            {m.goal.met ? <IconCheck className="se-met" aria-label="Meta cumprida" /> : <IconClose className="se-miss" aria-label="Meta não cumprida" />}
            <span className="sr-only">{m.goal.met ? "Meta cumprida" : "Meta não cumprida"}</span>
          </div>
        )}
        <Link className="row" to={`${BASE}/tabela`}><IconList className="row-icon" /><span className="row-body"><span className="row-title">Ver classificação</span></span><IconChevron className="row-chevron" /></Link>
        <Link className="row" to={`${BASE}/historico`}><IconTrophy className="row-icon" /><span className="row-body"><span className="row-title">Ver histórico</span></span><IconChevron className="row-chevron" /></Link>
        {m.titles.map((k) => (
          <button key={k} type="button" className="row se-share" onClick={() => share(k)}>
            <IconTrophy className="row-icon" />
            <span className="row-body"><span className="row-kicker row-kicker--caps">{TITLE_LABEL[k]}</span><span className="row-title">Compartilhar título</span></span>
            <IconChevron className="row-chevron" />
          </button>
        ))}
      </nav>
      {shareMsg && <p className="wk-note se-share-msg" role="status">{shareMsg}</p>}
      <p className="wk-note se-warn">Ao continuar, a temporada {m.nextYear} começa: o elenco envelhece, contratos vencidos saem e a base renova.</p>
      {error && <p className="inline-error se-err" role="alert">{error}</p>}
      <div className="cal-foot">
        <button type="button" className="cta" aria-disabled={busy || undefined} onClick={go}>{busy ? "Começando…" : "Continuar"}<IconArrow className="cta-arrow" /></button>
      </div>
    </div>
  );
}

// ---------- Nova temporada ----------
export function NewSeason() {
  const r = newSeasonStore.get();
  useEffect(() => { if (!r) navigate(`${BASE}/`, { replace: true }); }, [r]);
  if (!r) return null;
  const m = buildNewSeason(r);
  const start = () => { newSeasonStore.set(null); navigate(m.hasOffer ? `${BASE}/proposta-clube` : `${BASE}/`, { replace: true }); };
  return (
    <div className="wk ns">
      <Head ctx="Temporada" />
      <h1 className="screen-title">{m.title}</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Uma nova temporada começa.</p>
      <section className="wk-sec" aria-labelledby="ns-v"><h2 className="kicker-caps" id="ns-v">Virada de temporada</h2><Rows rows={m.turn} />{m.leaving && <p className="wk-note">{m.leaving}</p>}</section>
      <section className="wk-sec" aria-labelledby="ns-g"><h2 className="kicker-caps" id="ns-g">Objetivo da diretoria</h2><p className="se-goal-text">{m.goal || "Não definido"}</p></section>
      <section className="wk-sec" aria-labelledby="ns-a"><h2 className="kicker-caps" id="ns-a">Temporada {r.anoAnterior}</h2><Rows rows={m.last} /></section>
      <section className="wk-sec" aria-labelledby="ns-b"><h2 className="kicker-caps" id="ns-b">Base e elenco</h2><Rows rows={m.squad} /></section>
      <section className="wk-sec" aria-labelledby="ns-f"><h2 className="kicker-caps" id="ns-f">Finanças</h2><Rows rows={m.money} /></section>
      <div className="cal-foot"><button type="button" className="cta" onClick={start}>Começar temporada<IconArrow className="cta-arrow" /></button></div>
    </div>
  );
}

// ---------- Demissão ----------
export function Dismissal({ career, onConfirmed, onExpired }: { career: Career; onConfirmed: () => void; onExpired: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const m = buildDismissal(career);
  const go = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    const r = await SeasonGateway.dismiss();
    if (!r.ok) { if (r.motivo === "sessao") onExpired(); setError(ERR[r.motivo || ""] || "Não foi possível continuar. Tente de novo."); setBusy(false); return; }
    navigate(`${BASE}/nova`, { replace: true });
    onConfirmed();
  };
  return (
    <div className="wk dm">
      <Head ctx="Carreira" />
      <h1 className="screen-title">O ciclo terminou.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">A diretoria do {career.clubName} encerrou seu contrato.</p>
      <section className="wk-sec" aria-labelledby="dm-m"><h2 className="kicker-caps" id="dm-m">Motivo</h2><p className="se-goal-text dm-reason">{m.reason}</p></section>
      <section className="wk-sec" aria-labelledby="dm-p"><h2 className="kicker-caps" id="dm-p">Sua passagem</h2><Rows rows={m.rows} /></section>
      <p className="wk-note se-warn">Sua reputação e as passagens por clubes seguem com você na nova carreira.</p>
      {error && <p className="inline-error se-err" role="alert">{error}</p>}
      <div className="cal-foot"><button type="button" className="cta" aria-disabled={busy || undefined} onClick={go}>{busy ? "Encerrando…" : "Começar nova carreira"}<IconArrow className="cta-arrow" /></button></div>
    </div>
  );
}

// ---------- Proposta ao treinador ----------
export function ClubOffer({ m, onDone, onExpired }: { m: ClubOfferModel; onDone: (accepted: boolean) => Promise<void> | void; onExpired: () => void }) {
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState<null | "aceitar" | "recusar">(null);
  const [error, setError] = useState<string | null>(null);
  const act = async (which: "aceitar" | "recusar") => {
    if (busy) return;
    setBusy(which); setError(null);
    const r = which === "aceitar" ? await SeasonGateway.acceptOffer() : await SeasonGateway.declineOffer();
    if (!r.ok) { setAsk(false); if (r.motivo === "sessao") onExpired(); setError(ERR[r.motivo || ""] || "Não foi possível salvar. Tente de novo."); setBusy(null); return; }
    await onDone(which === "aceitar");
  };
  return (
    <div className="wk co">
      <Head ctx="Carreira" back={() => goBack(`${BASE}/`)} />
      <h1 className="screen-title">Um novo caminho.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Avalie o convite de outro clube.</p>
      <section className="wk-sec" aria-labelledby="co-i">
        <h2 className="kicker-caps" id="co-i">Clube interessado</h2>
        <dl className="wk-list">
          <div className="wk-item co-club"><dt><Crest team={m.club} size={28} />{m.clubName}</dt><dd>{m.division || ""}</dd></div>
          {m.budget && <div className="wk-item"><dt>Orçamento para salários</dt><dd>{m.budget}</dd></div>}
        </dl>
      </section>
      <section className="wk-sec" aria-labelledby="co-a">
        <h2 className="kicker-caps" id="co-a">Seu clube atual</h2>
        <Rows rows={[{ label: m.current.name, value: m.current.division || "" }, { label: "Posição atual", value: m.current.position }, ...(m.reputation ? [{ label: "Sua reputação", value: m.reputation }] : [])]} />
      </section>
      {error && <p className="inline-error se-err" role="alert">{error}</p>}
      <div className="cal-foot">
        <button type="button" className="cta" aria-disabled={!!busy || undefined} onClick={() => setAsk(true)}>Aceitar e mudar de clube</button>
        <button type="button" className="link-back" disabled={!!busy} onClick={() => act("recusar")}>{busy === "recusar" ? "Recusando…" : "Recusar"}</button>
      </div>
      {ask && (
        <Sheet labelledBy="co-t" describedBy="co-d" onDismiss={busy ? undefined : () => setAsk(false)}>
          <h2 id="co-t" className="sheet-title">Mudar de clube?</h2>
          <span className="tb-bar co-bar" aria-hidden="true" />
          <p className="wk-sheet-text">Sua carreira continua no novo clube.</p>
          <Rows rows={[{ label: "Novo clube", value: m.clubName }, ...(m.division ? [{ label: "Divisão", value: m.division }] : []), ...(m.budget ? [{ label: "Orçamento", value: m.budget }] : [])]} />
          <p id="co-d" className="wk-sheet-text co-leave">Você deixará o {m.current.name} e seguirá sua carreira no {m.clubName}.</p>
          <button type="button" className="cta" aria-disabled={!!busy || undefined} onClick={() => act("aceitar")}>{busy === "aceitar" ? "Mudando de clube…" : "Aceitar e mudar de clube"}</button>
          <button type="button" className="text-btn" data-autofocus disabled={!!busy} onClick={() => setAsk(false)}>Cancelar</button>
        </Sheet>
      )}
    </div>
  );
}

// ---------- Perfil e histórico do treinador ----------
function useHistory() {
  const [h, setH] = useState<CoachHistory | null | "erro">(null);
  useEffect(() => {
    let alive = true;
    SeasonGateway.history().then((r) => { if (alive) setH(r.ok ? r : "erro"); });
    return () => { alive = false; };
  }, []);
  return h;
}
export function CoachProfile({ career, userName }: { career: Career; userName: string }) {
  const h = useHistory();
  if (h === null) return <div className="state" role="status" aria-live="polite"><div className="state-line" />Carregando…</div>;
  if (h === "erro") return <div className="state" role="alert">Não foi possível carregar.<button className="state-btn" onClick={() => location.reload()}>Tentar novamente</button></div>;
  const m = buildCoach(h, userName, career);
  return (
    <div className="wk cp">
      <Head ctx="Perfil" back={() => goBack(`${BASE}/`)} />
      <h1 className="screen-title">Perfil do treinador.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <div className="cp-hero">
        <span className="cp-avatar" aria-hidden="true">{m.initial}</span>
        <b className="cp-name">{m.name}</b>
        <span className="cp-role">{m.role}</span>
        <span className="cp-season">{m.season}</span>
      </div>
      <section className="wk-sec"><Rows rows={[{ label: "Reputação", value: m.reputation }]} /></section>
      <nav className="wk-sec" aria-label="Carreira">
        <Link className="row" to={`${BASE}/historico`}><IconList className="row-icon" /><span className="row-body"><span className="row-title">Ver histórico</span></span><IconChevron className="row-chevron" /></Link>
        <Link className="row" to={`${BASE}/diretoria`}><IconTrophy className="row-icon" /><span className="row-body"><span className="row-title">Ver objetivos</span></span><IconChevron className="row-chevron" /></Link>
      </nav>
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(`${BASE}/`)}>Voltar ao clube</button></div>
    </div>
  );
}
export function History() {
  const h = useHistory();
  if (h === null) return <div className="state" role="status" aria-live="polite"><div className="state-line" />Carregando…</div>;
  if (h === "erro") return <div className="state" role="alert">Não foi possível carregar.<button className="state-btn" onClick={() => location.reload()}>Tentar novamente</button></div>;
  const m = buildHistory(h);
  const first = m.empty && !m.titles.length && m.clubs.length === 1;
  return (
    <div className="wk hs">
      <Head ctx="Histórico" back={() => goBack(`${BASE}/`)} />
      <h1 className="screen-title">{first ? "Sua história começa." : "Sua história no jogo."}</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{first ? "As conquistas aparecem conforme você joga." : "Clubes, títulos e conquistas."}</p>
      <section className="wk-sec" aria-labelledby="hs-c">
        <h2 className="kicker-caps" id="hs-c">Passagens por clubes</h2>
        <ul className="nw-list">{m.clubs.map((c) => (
          <li key={c.key} className="nw-item"><span className="hs-line"><b className="nw-title">{c.name}</b><span className="hs-val">{c.value}</span></span><span className="nw-meta">{c.sub}</span></li>
        ))}</ul>
      </section>
      {m.titles.length > 0 && (
        <section className="wk-sec" aria-labelledby="hs-t"><h2 className="kicker-caps" id="hs-t">Títulos</h2><Rows rows={m.titles.map((t) => ({ label: t.name, value: t.value }))} /></section>
      )}
      <section className="wk-sec" aria-labelledby="hs-a">
        <h2 className="kicker-caps" id="hs-a">{m.empty ? "Conquistas" : "Conquistas desbloqueadas"}</h2>
        {m.empty ? <p className="wk-note">Você ainda não tem conquistas.</p> : <Rows rows={m.achievements.map((a) => ({ label: a.name, value: a.value }))} />}
      </section>
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(`${BASE}/`)}>Voltar ao clube</button></div>
    </div>
  );
}
