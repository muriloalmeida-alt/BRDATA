// Fase 2 — acesso (plano de independência). Pranchas 03_acesso e
// 04_inicio_carreira (Pacote Mobile) com as decisões de 03/11:
// - Abertura (CAP01-T01): túnel, wordmark e "Carregando…".
// - Login (CAP01-T02): e-mail e senha; "Criar conta" leva ao cadastro do
//   portal (/?signup=1), o único que existe.
// - Competição (CAP01-T03): nomes reais (Brasileirão Série A/B/C) com os
//   subtítulos do jogo.
// - Clube (CAP01-T04): os clubes reais, sem pré-seleção; o botão só fica
//   ativo depois de escolher.
// - Configurar (CAP01-T05): nome do treinador; "Iniciar carreira" cria a
//   carreira (mesmas funções da versão anterior, pelo motor).
// - Primeira entrada (CAP01-T06): objetivo real e próximo jogo com dia e
//   mando, sem horário; "Ir para o clube" leva ao Início.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AccessGateway, type ClubOption, type CompetitionOption } from "../adapters/access.ts";
import { SessionGateway } from "../adapters/gateways.ts";
import type { HomeModel } from "../domain/home.ts";
import type { Team } from "../domain/types.ts";
import { Crest, Wordmark } from "../ui/components.tsx";
import { IconBack, IconCheck, IconChevron, IconClose, IconShield, IconTrophy } from "../ui/icons.tsx";
import { BASE, goBack, navigate } from "../ui/router.tsx";
import "./access.css";

export const NEW = `${BASE}/nova`;

// Abertura / carregamento inicial (CAP01-T01).
export function Splash({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="ac-splash" role="status" aria-live="polite">
      <div className="ac-splash-bg" aria-hidden="true" />
      <div className="ac-splash-body">
        <span className="wordmark ac-splash-mark" role="img" aria-label="BRDATA">BR<b>DATA</b></span>
        <span className="ac-bar" aria-hidden="true" />
        <span className="ac-splash-label">{label}</span>
      </div>
    </div>
  );
}

// Login (CAP01-T02).
export function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) { setError("Informe e-mail e senha."); return; }
    setBusy(true); setError(null);
    try {
      const r = await SessionGateway.login(email.trim(), password);
      if ("error" in r) { setError(r.error); return; }
      onLoggedIn();
    } catch {
      setError("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ac ac--stadium">
      <header className="ac-head ac-head--center"><Wordmark /></header>
      <h1 className="ac-title ac-title--center">Volte para o jogo.</h1>
      <form className="ac-form" onSubmit={submit} noValidate>
        <label className="lg-field"><span>E-mail</span>
          <input type="email" inputMode="email" autoComplete="username" autoCapitalize="off" spellCheck={false} placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="lg-field"><span>Senha</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <button type="submit" className="cta" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
      </form>
      <p className="ac-signup">Ainda não tem uma conta? <a href="/?signup=1">Criar conta</a></p>
    </div>
  );
}

// Clube escolhido nesta sessão (para o passo "Configurar" não precisar
// recarregar a lista). Só memória: recarregar a página volta à escolha.
let picked: { competition: CompetitionOption; club: ClubOption } | null = null;

const COMP_ICON: Record<string, JSX.Element> = {
  brasileirao: <IconTrophy className="ac-comp-ico is-gold" />,
  serie_b: <IconShield className="ac-comp-ico" />,
  serie_c: <IconTrophy className="ac-comp-ico" />,
};

function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [st, setSt] = useState<{ kind: "loading" } | { kind: "ok"; v: T } | { kind: "error" }>({ kind: "loading" });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    setSt({ kind: "loading" });
    fn().then((v) => { if (alive) setSt({ kind: "ok", v }); }, () => { if (alive) setSt({ kind: "error" }); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return [st, () => setN((x) => x + 1)] as const;
}

function LoadError({ retry }: { retry: () => void }) {
  return <div className="state" role="alert">Não foi possível carregar.<button className="state-btn" onClick={retry}>Tentar novamente</button></div>;
}

// Competição (CAP01-T03).
export function CompetitionScreen() {
  const [st, retry] = useLoad(() => AccessGateway.competitions(), []);
  const [sel, setSel] = useState<string | null>(null);
  if (st.kind === "loading") return <Splash />;
  if (st.kind === "error") return <LoadError retry={retry} />;
  const list = st.v;
  const chosen = list.find((c) => c.id === sel) || null;
  return (
    <div className="ac ac--stadium">
      <header className="ac-head ac-head--center"><Wordmark /></header>
      <h1 className="ac-title ac-title--center">Onde começa sua história?</h1>
      <p className="ac-sub ac-sub--center">Escolha a competição.</p>
      <div className="ac-list" role="radiogroup" aria-label="Competição">
        {list.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={c.id === sel} className={`ac-opt${c.id === sel ? " is-on" : ""}`} onClick={() => setSel(c.id)}>
            {COMP_ICON[c.id] || <IconTrophy className="ac-comp-ico" />}
            <span className="ac-opt-body"><b>{c.nome}</b><span>{c.sub}</span></span>
            <span className="ac-radio" aria-hidden="true">{c.id === sel && <IconCheck />}</span>
          </button>
        ))}
      </div>
      <div className="ac-foot">
        <button type="button" className="cta" aria-disabled={!chosen || undefined} onClick={() => { if (chosen) navigate(`${NEW}/clube?comp=${encodeURIComponent(chosen.id)}`); }}>
          {chosen ? "Continuar" : "Escolha uma competição"}
        </button>
      </div>
    </div>
  );
}

const asTeam = (c: ClubOption): Team => ({ id: c.id, name: c.nome, short: c.sigla || undefined, logo: c.escudo || undefined });

// Clube (CAP01-T04).
export function ClubScreen({ competitionId }: { competitionId: string }) {
  const [st, retry] = useLoad(async () => {
    const [comps, r] = await Promise.all([AccessGateway.competitions(), AccessGateway.chooseCompetition(competitionId)]);
    if (!r.ok) throw new Error(r.motivo || "falha");
    return { comp: comps.find((c) => c.id === competitionId)!, clubes: r.clubes };
  }, [competitionId]);
  const [sel, setSel] = useState<string | null>(null);
  if (st.kind === "loading") return <Splash label="Carregando os clubes…" />;
  if (st.kind === "error") return <LoadError retry={retry} />;
  const { comp, clubes } = st.v;
  const chosen = clubes.find((c) => c.id === sel) || null;
  return (
    <div className="ac">
      <header className="ac-head">
        <button type="button" className="back-btn back-btn--bare" onClick={() => goBack(NEW)} aria-label="Voltar"><IconBack /></button>
        <Wordmark />
        <span />
      </header>
      <h1 className="ac-title ac-title--caps">Qual será o seu clube?</h1>
      <p className="ac-kicker">{comp ? comp.nome : ""}</p>
      <div className="ac-list" role="radiogroup" aria-label="Clube">
        {clubes.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={c.id === sel} className={`ac-club${c.id === sel ? " is-on" : ""}`} onClick={() => setSel(c.id)}>
            <Crest team={asTeam(c)} size={44} />
            <span className="ac-opt-body"><b>{c.nome}</b>{c.cidade && <span>{c.cidade}</span>}</span>
            <span className="ac-ring" aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="ac-foot ac-foot--sticky">
        <button type="button" className="cta" aria-disabled={!chosen || undefined}
          onClick={() => { if (chosen && comp) { picked = { competition: comp, club: chosen }; navigate(`${NEW}/treinador?comp=${encodeURIComponent(comp.id)}&clube=${encodeURIComponent(chosen.id)}`); } }}>
          {chosen ? <>Continuar com {chosen.nome}<IconChevron className="cta-arrow" /></> : "Escolha um clube"}
        </button>
      </div>
    </div>
  );
}

// Configurar carreira (CAP01-T05): nome do treinador e criação da carreira.
export function SetupScreen({ competitionId, clubId, coachName, onCreated }: { competitionId: string; clubId: string; coachName: string; onCreated: () => Promise<void> }) {
  const [st, retry] = useLoad(async () => {
    if (picked && picked.competition.id === competitionId && picked.club.id === clubId) return picked;
    const [comps, r] = await Promise.all([AccessGateway.competitions(), AccessGateway.chooseCompetition(competitionId)]);
    const club = r.ok ? r.clubes.find((c) => c.id === clubId) : null;
    const competition = comps.find((c) => c.id === competitionId);
    if (!club || !competition) throw new Error("clube");
    return { competition, club };
  }, [competitionId, clubId]);
  const [name, setName] = useState(coachName);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const busy = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  if (creating) return <Splash label="Criando sua carreira…" />;
  if (st.kind === "loading") return <Splash />;
  if (st.kind === "error") return <LoadError retry={retry} />;
  const { competition, club } = st.v;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy.current) return;
    const n = name.trim();
    if (!n) { setError("Informe o nome do treinador."); input.current?.focus(); return; }
    busy.current = true; setError(null);
    try {
      if (n !== coachName) await SessionGateway.updateName(n);
      setCreating(true);
      // A competição precisa estar carregada no motor (o passo anterior
      // carrega; após recarregar a página, carrega de novo aqui).
      const loaded = await AccessGateway.chooseCompetition(competition.id);
      if (!loaded.ok) throw new Error("competicao");
      const r = await AccessGateway.createCareer(club.id);
      if (!r.ok) throw new Error(r.motivo || "falha");
      await onCreated();
      navigate(`${NEW}/pronto`, { replace: true });
    } catch {
      setCreating(false);
      setError("Não foi possível iniciar a carreira. Verifique sua conexão e tente de novo.");
    } finally {
      busy.current = false;
    }
  };
  return (
    <div className="ac">
      <header className="ac-head">
        <button type="button" className="back-btn back-btn--bare" onClick={() => goBack(`${NEW}/clube?comp=${encodeURIComponent(competition.id)}`)} aria-label="Voltar"><IconBack /></button>
        <Wordmark />
        <span />
      </header>
      <div className="ac-clubline">
        <Crest team={asTeam(club)} size={56} />
        <span><b>{club.nome}</b><span>{competition.nome}</span></span>
      </div>
      <h1 className="ac-title ac-title--caps">Como vamos chamar você?</h1>
      <form className="ac-form ac-form--grow" onSubmit={submit} noValidate>
        <label className="lg-field"><span>Nome do treinador</span>
          <span className="ac-input">
            <input ref={input} type="text" autoComplete="name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
            {name && <button type="button" className="ac-clear" aria-label="Limpar nome" onClick={() => { setName(""); input.current?.focus(); }}><IconClose /></button>}
          </span>
        </label>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <div className="ac-foot ac-foot--form ac-foot--sticky">
          <button type="submit" className="cta">Iniciar carreira<IconChevron className="cta-arrow" /></button>
        </div>
      </form>
    </div>
  );
}

// Primeira entrada (CAP01-T06).
export function FirstEntryScreen({ home }: { home: HomeModel }) {
  return (
    <div className="ac">
      <header className="ac-head"><Wordmark /><span /><span /></header>
      <h1 className="ac-title ac-title--caps ac-title--center">Seu trabalho começa agora.</h1>
      <div className="ac-hero">
        <Crest team={home.club.crest} size={88} />
        <b>{home.club.name}</b>
        <span className="ac-kicker ac-kicker--center">{home.competition} · {home.club.season}</span>
      </div>
      <section className="ac-sec" aria-labelledby="fe-obj">
        <h2 className="ac-kicker" id="fe-obj">Objetivo</h2>
        <p className="ac-sec-text">{home.objective || "A diretoria ainda não definiu o objetivo."}</p>
      </section>
      {home.next && (
        <section className="ac-sec" aria-labelledby="fe-next">
          <h2 className="ac-kicker" id="fe-next">Próximo jogo</h2>
          <div className="ac-match">
            <span className="ac-match-team"><Crest team={home.next.home} size={48} /><b>{home.next.home.name}</b></span>
            <span className="ac-match-vs" aria-label="contra">×</span>
            <span className="ac-match-team"><Crest team={home.next.away} size={48} /><b>{home.next.away.name}</b></span>
          </div>
          <p className="ac-match-line">{home.next.line}</p>
        </section>
      )}
      <div className="ac-foot ac-foot--sticky">
        <button type="button" className="cta" onClick={() => navigate(`${BASE}/`, { replace: true })}>Ir para o clube<IconChevron className="cta-arrow" /></button>
      </div>
    </div>
  );
}
