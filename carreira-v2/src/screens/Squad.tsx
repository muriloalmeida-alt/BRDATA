// CAP02-T02 — Elenco (pranchas/05_elenco.png, coluna 1). Lista agrupada
// por posição (Goleiros, Defesa, Meio-campo, Ataque) + seção Base; camisa
// com o overall; situação sob o nome; toque abre o Perfil (decisões de
// 01/11). Filtros, busca, ordenação e resumo seguem na versão atual.
import type { SquadModel, SquadRow } from "../domain/squad.ts";
import { Jersey, Wordmark } from "../ui/components.tsx";
import { IconBack, IconChevron } from "../ui/icons.tsx";
import { BASE, Link, goBack } from "../ui/router.tsx";
import { useState } from "react";
import type { Career } from "../domain/types.ts";
import { NO_FILTERS, filterSquad, filtersActive, type SquadFilters } from "../domain/squadplus.ts";
import { Sheet } from "../ui/dialog.tsx";
import "./week.css";
import "./prep.css";
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

// Fase 7: filtros e busca (CAP02-N01, complemento 28 col. 3), só nesta
// visita; com filtro ou busca, a lista vira uma só, na ordem escolhida.
let lastFilters: SquadFilters = NO_FILTERS;
function FiltersSheet({ f, onApply, onClose }: { f: SquadFilters; onApply: (f: SquadFilters) => void; onClose: () => void }) {
  const [d, setD] = useState(f);
  const seg = <K extends "pos" | "sit" | "cat" | "sort">(k: K, label: string, opts: [SquadFilters[K], string][]) => (
    <div className="pr-field">
      <span className="pr-label" id={`ft-${k}`}>{label}</span>
      <div className="pr-seg" role="radiogroup" aria-labelledby={`ft-${k}`}>
        {opts.map(([v, l]) => <button key={String(v)} type="button" role="radio" aria-checked={d[k] === v} className={`pr-seg-btn${d[k] === v ? " is-on" : ""}`} onClick={() => setD({ ...d, [k]: v })}>{l}</button>)}
      </div>
    </div>
  );
  return (
    <Sheet labelledBy="ft-t" onDismiss={onClose}>
      <h2 id="ft-t" className="sheet-title">Encontre seu jogador.</h2>
      <p className="wk-sheet-text">Filtre e organize o elenco.</p>
      <div className="sheet-list">
        {seg("pos", "Posição", [["todas", "Todas"], ["G", "Goleiro"], ["D", "Defensor"], ["M", "Meio"], ["F", "Atacante"]])}
        {seg("sit", "Situação", [["todas", "Todas"], ["titular", "Titular"], ["banco", "Banco"], ["lesionado", "Lesionado"], ["suspenso", "Suspenso"], ["venda", "À venda"]])}
        {seg("cat", "Categoria", [["todas", "Todas"], ["profissional", "Profissional"], ["base", "Base"]])}
        {seg("sort", "Ordenar por", [["posicao", "Posição"], ["overall", "Overall"], ["idade", "Idade"], ["condicao", "Condição"], ["contrato", "Contrato"]])}
      </div>
      <button type="button" className="cta" onClick={() => onApply(d)}>Aplicar filtros</button>
      <button type="button" className="text-btn" onClick={() => onApply({ ...NO_FILTERS, q: d.q })}>Limpar filtros</button>
    </Sheet>
  );
}

export function Squad({ m, career }: { m: SquadModel; career: Career }) {
  const [f, setF] = useState<SquadFilters>(lastFilters);
  const [sheet, setSheet] = useState(false);
  const set = (x: SquadFilters) => { lastFilters = x; setF(x); };
  const active = filtersActive(f);
  const filtered = active || f.q.trim() ? filterSquad(career, f) : null;
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

      <div className="sq-tools">
        <label className="sr-only" htmlFor="sq-q">Buscar jogador</label>
        <input id="sq-q" className="pr-input sq-search" type="search" placeholder="Buscar jogador" value={f.q} onChange={(e) => set({ ...f, q: e.target.value })} />
        <button type="button" className="state-btn sq-filter" onClick={() => setSheet(true)} aria-label={`Filtros${active ? `, ${active} ativos` : ""}`}>Filtros{active ? ` (${active})` : ""}</button>
      </div>
      {filtered && (
        <section className="sq-sec" aria-label="Resultado">
          <p className="sq-count" role="status">{filtered.length} {filtered.length === 1 ? "jogador" : "jogadores"}</p>
          <div>{filtered.map((r) => <Row key={r.player.id} r={r} />)}</div>
        </section>
      )}
      {!filtered && m.groups.map((g) => (
        <section key={g.group} className="sq-sec" aria-labelledby={`sq-${g.group}`}>
          <h2 className="sq-head" id={`sq-${g.group}`}>{g.title}</h2>
          <div>{g.rows.map((r) => <Row key={r.player.id} r={r} />)}</div>
        </section>
      ))}
      {!filtered && m.base.length > 0 && (
        <section className="sq-sec" aria-labelledby="sq-base">
          <h2 className="sq-head" id="sq-base">Base</h2>
          <div>{m.base.map((r) => <Row key={r.player.id} r={r} />)}</div>
        </section>
      )}
      {m.total === 0 && <p className="cal-empty">Sem jogadores.</p>}

      <Link className="row sq-legacy" to={`${BASE}/contratos`}>
        <span className="row-body"><span className="row-title">Contratos</span><span className="row-sub">Salários, prazos e renovações</span></span>
        <IconChevron className="row-chevron" />
      </Link>

      <div className="cal-foot"><Link className="cta" to={`${BASE}/escalacao`}>Ajustar escalação</Link></div>
      {sheet && <FiltersSheet f={f} onClose={() => setSheet(false)} onApply={(x) => { set(x); setSheet(false); }} />}
    </div>
  );
}
