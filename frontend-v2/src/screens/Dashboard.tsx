import { CalendarDays, ChevronRight, CircleCheck, Circle, Goal, MapPin, Play, Shield, Trophy, ArrowLeftRight, Users, Swords } from "lucide-react";
import type { Career, SessionUser } from "../domain/contracts";
import {
  boardConfidence, clubNews, clubRecord, competitionLabel, firstName, greeting, groupLabel,
  initials, leaguePosition, nextMatch, recentResults, shortDate, squadHighlights, teamById,
} from "../domain/dashboard";
import { Crest, Ring } from "../ui/components";

const perGame = (n: number, j: number) => (j ? (n / j).toFixed(1).replace(".", ",") : "0,0");

export function Dashboard({ career, user, now = new Date() }: { career: Career; user: SessionUser; now?: Date }) {
  const pos = leaguePosition(career);
  const rec = clubRecord(career);
  const nm = nextMatch(career);
  const conf = boardConfidence(career);
  const recent = recentResults(career);
  const stars = squadHighlights(career);
  const news = clubNews(career);
  const myTeam = teamById(career, career.clubId);
  const weekly = career.objectives?.weekly ?? [];

  return (
    <div className="dash">
      <section className="dash-club" aria-label="Seu clube">
        <Crest team={myTeam ?? { id: career.clubId, name: career.clubName, short: career.clubShort }} logo={career.clubLogo} size={48} />
        <div>
          <h2>{career.clubName}</h2>
          <p className="meta">{competitionLabel(career.competitionId)} · Temporada {career.seasonYear}</p>
        </div>
      </section>

      <h1 className="dash-hello">{greeting(now)}, <span>{firstName(user.name)}!</span></h1>

      <section className="panel next" aria-labelledby="next-title">
        <div className="next-head">
          <h3 id="next-title">Próximo jogo</h3>
          {nm && <span className="meta">{nm.competition} · {nm.round}ª rodada</span>}
        </div>
        {nm ? (
          <>
            <div className="next-teams">
              <div className="next-team"><Crest team={nm.home} size={60} /><span>{nm.home.name}</span></div>
              <div className="next-mid">
                {nm.date ? <><CalendarDays size={16} aria-hidden /><b>{shortDate(nm.date)}</b></> : <b>Rodada {nm.round}</b>}
                <span className="meta">{nm.isHome ? "Em casa" : "Fora"}</span>
              </div>
              <div className="next-team"><Crest team={nm.away} size={60} /><span>{nm.away.name}</span></div>
            </div>
            {nm.venue && <p className="next-venue meta"><MapPin size={14} aria-hidden /> {nm.venue}</p>}
            <a className="btn-primary next-cta" href="/carreira.html"><Play size={18} fill="currentColor" aria-hidden /> Ir para o jogo</a>
          </>
        ) : <p className="muted">Nenhum jogo pendente nesta temporada.</p>}
      </section>

      <section className="panel stats" aria-label="Campanha na temporada">
        <div><Trophy size={20} aria-hidden /><b>{pos ? `${pos}º` : "—"}</b><span>Posição</span><small>{rec.pts} pts</small></div>
        <div><Swords size={20} aria-hidden /><b>{rec.j}</b><span>Jogos</span><small>V {rec.v} · E {rec.e} · D {rec.d}</small></div>
        <div><Goal size={20} aria-hidden /><b>{rec.gp}</b><span>Gols marcados</span><small>{perGame(rec.gp, rec.j)} por jogo</small></div>
        <div><Shield size={20} aria-hidden /><b>{rec.gc}</b><span>Gols sofridos</span><small>{perGame(rec.gc, rec.j)} por jogo</small></div>
      </section>

      <div className="dash-grid">
        <section className="panel conf" aria-labelledby="conf-title">
          <h3 className="panel-title" id="conf-title">Confiança da diretoria</h3>
          <div className="conf-body">
            <Ring value={conf.value} tone={conf.tone} />
            <div><b className={`tone-${conf.tone}`}>{conf.label}</b>
              {conf.parts[0] && <p className="meta">{conf.parts[0].label}</p>}</div>
          </div>
        </section>

        <section className="panel form" aria-labelledby="form-title">
          <h3 className="panel-title" id="form-title">Desempenho recente</h3>
          {recent.length ? (
            <ol className="form-bars">
              {recent.map((r) => (
                <li key={`${r.round}-${r.opponentId}`} className={`res-${r.result}`} title={`Rodada ${r.round}: ${r.my} x ${r.their} contra ${r.opponentShort}`}>
                  <i style={{ height: r.result === "V" ? 44 : r.result === "E" ? 26 : 40 }} />
                  <span aria-label={r.result === "V" ? "vitória" : r.result === "E" ? "empate" : "derrota"}>{r.result}</span>
                  <small>{r.my}–{r.their}</small>
                </li>
              ))}
            </ol>
          ) : <p className="muted">Ainda sem jogos oficiais nesta temporada.</p>}
        </section>

        <section className="panel goals" aria-labelledby="goals-title">
          <h3 className="panel-title" id="goals-title">Objetivos da temporada</h3>
          <ul className="goal-list">
            {career.boardGoal && (
              <li>{pos && pos <= career.boardGoal.target ? <CircleCheck size={18} className="ok" aria-label="dentro da meta" /> : <Circle size={18} aria-label="fora da meta" />}
                <span>{career.boardGoal.label}<small className="meta"> · meta da diretoria</small></span></li>
            )}
            {weekly.slice(0, 3).map((o) => (
              <li key={o.objectiveId}>{o.status === "completed" ? <CircleCheck size={18} className="ok" aria-label="concluído" /> : <Circle size={18} aria-label="em andamento" />}
                <span>{o.title}<small className="meta"> · {Math.min(o.currentProgress, o.target)}/{o.target}</small></span></li>
            ))}
            {!career.boardGoal && !weekly.length && <li className="muted">Sem objetivos definidos.</li>}
          </ul>
        </section>
      </div>

      <div className="dash-grid two">
        <section className="panel" aria-labelledby="stars-title">
          <h3 className="panel-title" id="stars-title">Destaques do elenco</h3>
          <ul className="stars">
            {stars.map((p) => (
              <li key={p.id}>
                <span className="star-avatar" aria-hidden>{initials(p.name)}<em>{p.overall}</em></span>
                <b>{p.name.split(" ").length > 1 ? `${p.name.split(" ")[0][0]}. ${p.name.split(" ").slice(-1)[0]}` : p.name}</b>
                <span className="meta">{groupLabel(p.group)} · OVR {p.overall}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel" aria-labelledby="news-title">
          <h3 className="panel-title" id="news-title">Notícias</h3>
          {news.length ? (
            <ul className="news">{news.map((n, i) => <li key={i}><b>{n.texto}</b><span className="meta">{n.round ? `Rodada ${n.round}` : ""}</span></li>)}</ul>
          ) : <p className="muted">Sem notícias por enquanto.</p>}
        </section>
      </div>

      <nav className="quick" aria-label="Atalhos">
        <a href="#/jogos"><Swords size={20} aria-hidden /><span>Ajustar tática</span><ChevronRight size={18} aria-hidden /></a>
        <a href="#/mercado"><ArrowLeftRight size={20} aria-hidden /><span>Mercado</span><ChevronRight size={18} aria-hidden /></a>
        <a href="#/clube"><Users size={20} aria-hidden /><span>Elenco</span><ChevronRight size={18} aria-hidden /></a>
      </nav>
    </div>
  );
}
