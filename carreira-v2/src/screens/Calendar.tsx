// CAP02-T07 — Calendário (pranchas/06_clube.png, coluna 3). Lista
// cronológica dos seus jogos (Brasileirão, Copa e amistosos — decisões de
// 01/11); o próximo compromisso destacado com a barra lima; "Ver
// anteriores" mostra os disputados com placar. Sem troca de semana/mês
// nem agendamento (a prancha proíbe). Só leitura.
import { useState } from "react";
import type { CalendarItem, CalendarModel } from "../domain/calendar.ts";
import type { HomeModel } from "../domain/home.ts";
import { CtaLink, Wordmark } from "../ui/components.tsx";
import { IconBack, IconDown } from "../ui/icons.tsx";
import { BASE, goBack } from "../ui/router.tsx";
import "./table.css";
import "./calendar.css";

function Item({ it, next }: { it: CalendarItem; next: boolean }) {
  const teams = it.score
    ? `${it.home.name} ${it.score.gh} a ${it.score.ga} ${it.away.name}`
    : `${it.home.name} contra ${it.away.name}`;
  return (
    <li className={`cal-item${next ? " is-next" : ""}${it.played ? " is-past" : ""}`}
      aria-label={`${next ? "Próximo compromisso: " : ""}${it.date}${it.day === "DOM" ? ", domingo" : it.day === "QUA" ? ", quarta-feira" : ""}, ${it.where === "Casa" ? "em casa" : "fora"}. ${teams}. ${it.label}${it.played && !it.score ? ", disputado" : ""}`}>
      <span className="cal-when" aria-hidden="true">
        <b>{it.date}</b>
        <span>{[it.day, it.where].filter(Boolean).join(" · ")}</span>
      </span>
      <span className="cal-what" aria-hidden="true">
        <span className="cal-teams">
          <span className="cal-team">{it.home.name}</span>
          <span className="cal-x">{it.score ? `${it.score.gh} × ${it.score.ga}` : "×"}</span>
          <span className="cal-team">{it.away.name}</span>
        </span>
        <span className={`cal-comp cal-comp--${it.competition}`}>{it.label}{it.played && !it.score ? " · disputado" : ""}</span>
      </span>
    </li>
  );
}

export function Calendar({ m, cta }: { m: CalendarModel; cta: HomeModel["cta"] }) {
  const [showPast, setShowPast] = useState(false);
  const past = m.past.slice().reverse(); // mais antigo primeiro, emendando nos próximos
  return (
    <div className="cal">
      <header className="sub-head">
        <button type="button" className="back-btn back-btn--bare" onClick={() => goBack(`${BASE}/`)} aria-label="Voltar"><IconBack /></button>
        <Wordmark />
        <span />
      </header>

      <h1 className="cal-title">Calendário</h1>
      <span className="tb-bar cal-bar" aria-hidden="true" />
      <p className="cal-lead">Seu próximo compromisso.</p>

      {m.past.length > 0 && (
        <button type="button" className="tb-more cal-more" aria-expanded={showPast} aria-controls="cal-past" onClick={() => setShowPast(!showPast)}>
          {showPast ? "Ocultar anteriores" : `Ver anteriores (${m.past.length})`}<IconDown className={showPast ? "is-up" : ""} />
        </button>
      )}
      {showPast && (
        <ol className="cal-list" id="cal-past" aria-label="Jogos disputados">
          {past.map((it) => <Item key={it.key} it={it} next={false} />)}
        </ol>
      )}

      {m.upcoming.length ? (
        <ol className="cal-list" aria-label="Próximos jogos">
          {m.upcoming.map((it, i) => <Item key={it.key} it={it} next={i === 0} />)}
        </ol>
      ) : <p className="cal-empty">Nenhum jogo agendado.</p>}

      <div className="cal-foot"><CtaLink cta={cta} className="cta cta--inline" /></div>
    </div>
  );
}
