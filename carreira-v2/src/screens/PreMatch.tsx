// CAP04-T01 — Pré-jogo (referencias_anteriores/pre_jogo.png).
// Confronto, titulares (campo só leitura, com nome — decisão de 01/11),
// avisos da confirmação atual como linhas de alerta, "Revisar escalação"
// (v2) e "Iniciar partida", que roda o jogo na versão atual (#iniciar)
// enquanto a Partida não existe na v2.
import type { PreMatchModel } from "../domain/prematch.ts";
import { Crest, Wordmark } from "../ui/components.tsx";
import { IconAlert, IconArrow, IconBack, IconChevron, IconPitch } from "../ui/icons.tsx";
import { BASE, Link, goBack } from "../ui/router.tsx";
import { PitchPlayers } from "../ui/pitch.tsx";
import "./home.css";
import "./lineup.css";
import "./prematch.css";

export function PreMatch({ m }: { m: PreMatchModel }) {
  const back = () => goBack(`${BASE}/`);
  return (
    <div className="pm">
      <header className="sub-head">
        <button type="button" className="back-btn back-btn--bare" onClick={back} aria-label="Voltar"><IconBack /></button>
        <Wordmark />
        <span className="sub-head-ctx">Pré-jogo</span>
      </header>

      <h1 className="screen-title">É hora de jogar.</h1>
      <p className="screen-sub">{m.subtitle}</p>

      <section className="home-match pm-match" aria-label="Confronto">
        <div className="home-match-photo" aria-hidden="true" />
        {m.next ? (
          <div className="home-match-body">
            <div className="home-teams">
              <span className="home-team"><Crest team={m.next.home} size={56} /><b>{m.next.home.name}</b></span>
              <span className="home-vs" aria-label="contra">×</span>
              <span className="home-team"><Crest team={m.next.away} size={56} /><b>{m.next.away.name}</b></span>
            </div>
            {m.next.date && <p className="home-date">{m.next.date}</p>}
          </div>
        ) : (
          <div className="home-match-body home-match-empty"><p className="home-date">Sem jogo do seu clube nesta rodada</p></div>
        )}
      </section>

      <div className="pm-lineup-head">
        <h2 className="kicker-caps">Sua escalação</h2>
        <span className="pm-formation" aria-label={`Formação ${m.formation}`}>{m.formation.split("").join(" ")}</span>
      </div>
      <section className="lu-pitch pm-pitch" aria-label={`Titulares, formação ${m.formation}`}>
        <PitchPlayers rows={m.rows} />
      </section>

      <div className="pm-foot">
        <nav aria-label="Ações">
          {m.alerts.map((a) => (
            <Link key={a.id} className="row" to={`${BASE}/escalacao`}>
              <IconAlert className="row-icon" />
              <span className="row-body"><span className="row-title">{a.title}</span><span className="row-sub">{a.sub}</span></span>
              <IconChevron className="row-chevron" />
            </Link>
          ))}
          <Link className="row" to={`${BASE}/escalacao`}>
            <IconPitch className="row-icon" />
            <span className="row-body"><span className="row-title">Revisar escalação</span></span>
            <IconChevron className="row-chevron" />
          </Link>
        </nav>
        <a className="cta pm-cta" href="/carreira#iniciar">Iniciar partida<IconArrow className="cta-arrow" /></a>
        <button type="button" className="text-btn" onClick={back}>Voltar</button>
      </div>
    </div>
  );
}
