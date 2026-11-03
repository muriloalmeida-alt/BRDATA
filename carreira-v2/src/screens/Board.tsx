// CAP02-T05 — Diretoria (pranchas/06_clube.png, coluna 1). Meta da
// temporada, situação atual (posição + "Dentro da meta"; sem confiança,
// barra ou percentual), "Ver classificação", outros objetivos e
// temporadas anteriores (decisões de 01/11). Só leitura.
import type { BoardModel } from "../domain/board.ts";
import { Wordmark } from "../ui/components.tsx";
import { IconBack, IconChevron } from "../ui/icons.tsx";
import { BASE, Link, goBack, goBackTo } from "../ui/router.tsx";
import "./table.css";
import "./calendar.css";
import "./board.css";

export function Board({ m }: { m: BoardModel }) {
  return (
    <div className="bd">
      <header className="sub-head">
        <button type="button" className="back-btn back-btn--bare" onClick={() => goBack(`${BASE}/`)} aria-label="Voltar"><IconBack /></button>
        <Wordmark />
        <span />
      </header>
      <h1 className="cal-title">Diretoria</h1>
      <span className="tb-bar cal-bar" aria-hidden="true" />
      <p className="cal-lead">O que o clube espera.</p>

      <dl className="bd-list">
        <div className="bd-item">
          <dt>Objetivo da temporada</dt>
          <dd>{m.goal || "Não definido"}</dd>
        </div>
        <div className="bd-item">
          <dt>Situação atual</dt>
          <dd>{m.position != null ? `${m.position}º na tabela` : "Temporada ainda não começou"}</dd>
          {m.onTrack && <dd className="bd-note">Dentro da meta</dd>}
        </div>
      </dl>
      <Link className="row bd-link" to={`${BASE}/tabela`}>
        <span className="row-body"><span className="row-title">Ver classificação</span></span>
        <IconChevron className="row-chevron bd-chev" />
      </Link>

      {m.objectives.length > 0 && (
        <section className="bd-sec" aria-labelledby="bd-obj">
          <h2 className="kicker-caps" id="bd-obj">Outros objetivos</h2>
          <ul>
            {m.objectives.map((o, i) => (
              <li key={i} className="bd-row">
                <span className="bd-row-title">{o.title}</span>
                <span className={`bd-row-sub${o.done ? " is-done" : ""}`}>{o.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {m.history.length > 0 && (
        <section className="bd-sec" aria-labelledby="bd-hist">
          <h2 className="kicker-caps" id="bd-hist">Temporadas anteriores</h2>
          <ul>
            {m.history.map((h) => (
              <li key={h.year} className="bd-row">
                <span className="bd-row-title">{h.year} · {h.position}º lugar</span>
                <span className="bd-row-sub">{h.goal} · <span className={h.met ? "is-done" : "is-miss"}>{h.met ? "Cumprida" : "Não cumprida"}</span></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="cal-foot"><button type="button" className="cta" onClick={() => goBackTo(`${BASE}/`)}>Voltar ao clube</button></div>
    </div>
  );
}
