// CAP02-T02 — Elenco (pranchas/05_elenco.png, coluna 1). Lista agrupada
// por posição (Goleiros, Defesa, Meio-campo, Ataque) + seção Base; camisa
// com o overall; situação sob o nome; toque abre o Perfil (decisões de
// 01/11). Filtros, busca, ordenação e resumo seguem na versão atual.
import type { SquadModel, SquadRow } from "../domain/squad.ts";
import { Jersey, Wordmark } from "../ui/components.tsx";
import { IconBack, IconChevron } from "../ui/icons.tsx";
import { BASE, Link, goBack } from "../ui/router.tsx";
import { legacyHref } from "../adapters/legacy.ts";
import "./calendar.css";
import "./squad.css";

function Row({ r }: { r: SquadRow }) {
  return (
    <Link className="sq-row" to={`${BASE}/elenco/jogador?id=${encodeURIComponent(r.player.id)}`}
      aria-label={`${r.player.name}, overall ${r.player.overall}, ${r.situation.text}. Ver perfil`}>
      <Jersey value={r.player.overall} gk={r.player.group === "G"} size={44} />
      <span className="sq-body">
        <span className="sq-name">{r.short}</span>
        <span className={`sq-sit${r.situation.tone ? ` sq-sit--${r.situation.tone}` : ""}`}>{r.situation.text}</span>
      </span>
      <IconChevron className="row-chevron" />
    </Link>
  );
}

export function Squad({ m }: { m: SquadModel }) {
  return (
    <div className="sq">
      <header className="sub-head">
        <button type="button" className="back-btn back-btn--bare" onClick={() => goBack(`${BASE}/`)} aria-label="Voltar"><IconBack /></button>
        <Wordmark />
        <span />
      </header>
      <h1 className="cal-title sq-title">Elenco</h1>
      <p className="screen-sub sq-sub">Seu time começa aqui.</p>
      {/* Fase 6: treino e condição pelo Elenco (decisão de 04/11). */}
      <nav className="sq-prep" aria-label="Preparação">
        <Link className="row" to={`${BASE}/treino`}><span className="row-body"><span className="row-title">Treino da semana</span><span className="row-sub">Foco, intensidade e grupo de cada dia</span></span><IconChevron className="row-chevron" /></Link>
        <Link className="row" to={`${BASE}/treino/condicao`}><span className="row-body"><span className="row-title">Evolução e condição</span><span className="row-sub">Condição física, fadiga e risco de lesão</span></span><IconChevron className="row-chevron" /></Link>
      </nav>

      {m.groups.map((g) => (
        <section key={g.group} className="sq-sec" aria-labelledby={`sq-${g.group}`}>
          <h2 className="sq-head" id={`sq-${g.group}`}>{g.title}</h2>
          <div>{g.rows.map((r) => <Row key={r.player.id} r={r} />)}</div>
        </section>
      ))}
      {m.base.length > 0 && (
        <section className="sq-sec" aria-labelledby="sq-base">
          <h2 className="sq-head" id="sq-base">Base</h2>
          <div>{m.base.map((r) => <Row key={r.player.id} r={r} />)}</div>
        </section>
      )}
      {m.total === 0 && <p className="cal-empty">Sem jogadores.</p>}

      <a className="row sq-legacy" href={legacyHref("elenco")}>
        <span className="row-body"><span className="row-title">Filtros e ordenação</span><span className="row-sub">Resumo do elenco, busca e outras ordenações</span></span>
        <IconChevron className="row-chevron" />
      </a>

      <div className="cal-foot"><Link className="cta" to={`${BASE}/escalacao`}>Ajustar escalação</Link></div>
    </div>
  );
}
