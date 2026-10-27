import { ArrowLeftRight, ArrowRight, ChevronRight, CircleCheck, Circle, Goal, MapPin, Play, Shield, Trophy, Users, Swords, ClipboardList } from "lucide-react";
import type { Career, SessionUser } from "../domain/contracts";
import {
  boardConfidence, clubNews, clubRecord, competitionLabel, firstName, greeting, groupLabel,
  initials, leaguePosition, nextMatch, recentResults, shortDate, squadHighlights, teamById,
} from "../domain/dashboard";
import { Crest, Ring } from "../ui/components";

const perGame = (n: number, j: number) => (j ? (n / j).toFixed(1).replace(".", ",") : "0,0");
const shortName = (name: string) => { const p = name.split(" "); return p.length > 1 ? `${p[0][0]}. ${p[p.length - 1]}` : name; };

// Abas de contexto do clube (referência aprovada). Só "Visão geral" já
// existe na v2; as demais levam ao estado "em reconstrução".
const TABS = [
  { route: "inicio", label: "Visão geral" }, { route: "clube", label: "Elenco" }, { route: "tatica", label: "Tática" },
  { route: "jogos", label: "Calendário" }, { route: "competicoes", label: "Competições" }, { route: "financas", label: "Finanças" },
];

export function Dashboard({ career, user, now = new Date() }: { career: Career; user: SessionUser; now?: Date }) {
  const pos = leaguePosition(career);
  const rec = clubRecord(career);
  const nm = nextMatch(career);
  const conf = boardConfidence(career);
  const recent = recentResults(career);
  const stars = squadHighlights(career);
  const news = clubNews(career, 4);
  const myTeam = teamById(career, career.clubId);
  const weekly = career.objectives?.weekly ?? [];

  return (
    <div className="dash">
      <section className="dash-club" aria-label="Seu clube">
        <Crest team={myTeam ?? { id: career.clubId, name: career.clubName, short: career.clubShort }} logo={career.clubLogo} size={64} bare />
        <div>
          <h2>{career.clubName}</h2>
          <p>{competitionLabel(career.competitionId)}</p>
        </div>
      </section>

      <nav className="tabs" aria-label="Seções do clube">
        {TABS.map((t) => <a key={t.route} href={`#/${t.route}`} aria-current={t.route === "inicio" ? "page" : undefined}>{t.label}</a>)}
      </nav>

      <section className="hero" aria-label="Boas-vindas e próximo jogo">
        <div className="hero-bg" aria-hidden />
        <div className="hero-coach" aria-hidden />
        <div className="hero-hello">
          <h1 className="dash-hello">{greeting(now)},<br /><span>{firstName(user.name)}!</span></h1>
          <p className="hero-quote">"Trabalho, estratégia e consistência constroem grandes histórias."</p>
        </div>

        <section className="next" aria-labelledby="next-title">
          <a className="next-head" href="/carreira.html" aria-label="Próximo jogo: abrir detalhes">
            <h3 id="next-title">Próximo jogo</h3><ArrowRight size={18} aria-hidden />
          </a>
          {nm ? (
            <>
              <p className="next-meta">{nm.competition} · {nm.round}ª rodada</p>
              <div className="next-teams">
                <div className="next-team"><Crest team={nm.home} size={48} bare /><span>{nm.home.name}</span></div>
                <div className="next-mid">
                  {nm.date ? <b>{shortDate(nm.date)}</b> : <b>Rodada {nm.round}</b>}
                  <span>{nm.isHome ? "Em casa" : "Fora"}</span>
                </div>
                <div className="next-team"><Crest team={nm.away} size={48} bare /><span>{nm.away.name}</span></div>
              </div>
              {nm.venue && <p className="next-venue"><MapPin size={14} aria-hidden /> {nm.venue}</p>}
              <a className="btn-primary next-cta" href="/carreira.html"><Play size={16} fill="currentColor" aria-hidden /> Ver detalhes</a>
            </>
          ) : <p className="next-meta">Nenhum jogo pendente nesta temporada.</p>}
        </section>
      </section>

      <section className="panel stats" aria-label="Campanha na temporada">
        <div><Trophy size={22} aria-hidden /><b>{pos ? `${pos}º` : "—"}</b><span>Posição</span><small>{rec.pts} pts</small></div>
        <div><Goal size={22} aria-hidden /><b>{rec.j}</b><span>Jogos</span><small>V {rec.v} · E {rec.e} · D {rec.d}</small></div>
        <div><Swords size={22} aria-hidden /><b>{rec.gp}</b><span>Gols marcados</span><small>{perGame(rec.gp, rec.j)} por jogo</small></div>
        <div><Shield size={22} aria-hidden /><b>{rec.gc}</b><span>Gols sofridos</span><small>{perGame(rec.gc, rec.j)} por jogo</small></div>
      </section>

      <div className="dash-grid">
        <section className="panel conf" aria-labelledby="conf-title">
          <h3 className="panel-title" id="conf-title">Confiança da diretoria</h3>
          <div className="conf-body">
            <Ring value={conf.value} tone={conf.tone} size={76} />
            <b className={`tone-${conf.tone}`}>{conf.label}</b>
          </div>
          <ChevronRight size={18} className="panel-chev" aria-hidden />
        </section>

        <section className="panel form" aria-labelledby="form-title">
          <h3 className="panel-title" id="form-title">Desempenho recente</h3>
          {recent.length ? (
            <ol className="form-bars">
              {recent.map((r) => (
                <li key={`${r.round}-${r.opponentId}`} className={`res-${r.result}`} title={`Rodada ${r.round}: ${r.my} x ${r.their} contra ${r.opponentShort}`}>
                  <i style={{ height: r.result === "V" ? 40 : r.result === "E" ? 22 : 46 }} />
                  <span aria-label={r.result === "V" ? "vitória" : r.result === "E" ? "empate" : "derrota"}>{r.result}</span>
                </li>
              ))}
            </ol>
          ) : <p className="meta">Sem jogos oficiais ainda.</p>}
        </section>

        <section className="panel goals" aria-labelledby="goals-title">
          <h3 className="panel-title" id="goals-title">Objetivos da temporada</h3>
          <ul className="goal-list">
            {career.boardGoal && (
              <li>{pos && pos <= career.boardGoal.target ? <CircleCheck size={17} className="ok" aria-label="dentro da meta" /> : <Circle size={17} aria-label="fora da meta" />}
                <span>{career.boardGoal.label}</span><ChevronRight size={15} aria-hidden /></li>
            )}
            {weekly.slice(0, 3).map((o) => (
              <li key={o.objectiveId}>{o.status === "completed" ? <CircleCheck size={17} className="ok" aria-label="concluído" /> : <Circle size={17} aria-label="em andamento" />}
                <span>{o.title}</span><ChevronRight size={15} aria-hidden /></li>
            ))}
            {!career.boardGoal && !weekly.length && <li className="meta">Sem objetivos definidos.</li>}
          </ul>
        </section>
      </div>

      <div className="dash-grid two">
        <section className="panel" aria-labelledby="stars-title">
          <h3 className="panel-title" id="stars-title">Destaques do elenco <ChevronRight size={18} aria-hidden /></h3>
          <ul className="stars">
            {stars.map((p) => (
              <li key={p.id}>
                <span className="star-avatar" aria-hidden>{initials(p.name)}<em>{p.overall}</em></span>
                <b>{shortName(p.name)}</b>
                <span className="meta">{groupLabel(p.group)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel news-card" aria-labelledby="news-title">
          <h3 className="panel-title" id="news-title">Notícias do clube <ChevronRight size={18} aria-hidden /></h3>
          {news.length ? (
            <div className="news-hero">
              <div className="news-img" aria-hidden />
              <div className="news-text"><b>{news[0].texto}</b><span className="meta">{news[0].round ? `Rodada ${news[0].round}` : ""}</span></div>
              <div className="news-dots" aria-hidden>{news.map((_, i) => <i key={i} className={i === 0 ? "on" : ""} />)}</div>
            </div>
          ) : <p className="meta">Sem notícias por enquanto.</p>}
        </section>
      </div>

      <nav className="quick" aria-label="Atalhos">
        <a href="#/tatica"><ClipboardList size={22} aria-hidden /><span>Ajustar tática</span><ChevronRight size={18} aria-hidden /></a>
        <a href="#/mercado"><ArrowLeftRight size={22} aria-hidden /><span>Mercado</span><ChevronRight size={18} aria-hidden /></a>
        <a href="#/clube"><Users size={22} aria-hidden /><span>Relatório do elenco</span><ChevronRight size={18} aria-hidden /></a>
      </nav>
    </div>
  );
}
