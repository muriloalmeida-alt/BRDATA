// CAP04-T07 — Tabela e resultados da rodada (pranchas/02_resultados.png,
// coluna 2). Trecho de 6 linhas ao redor do seu clube com "Ver tabela
// completa", zonas discretas, seletor de divisão, resultados da última
// rodada e Copa do Brasil (decisões de 01/11). Só leitura; tocar num clube
// abre o elenco dele na v2 (fase 7).
import { useEffect, useState } from "react";
import type { CupModel, TableModel, TableRow } from "../domain/table.ts";
import { Crest, Wordmark } from "../ui/components.tsx";
import { IconBack, IconChevron, IconDown } from "../ui/icons.tsx";
import { BASE, goBack, goBackTo, navigate } from "../ui/router.tsx";
import "./table.css";


function Row({ r, zoneLabel, onClub }: { r: TableRow; zoneLabel: string | null; onClub?: (href: string, name: string) => void }) {
  const href = `${BASE}/clube-elenco?id=${encodeURIComponent(String(r.team.id))}`;
  return (
    <a className={`tb-row${r.mine ? " is-me" : ""}`} href={href} role="row"
      onClick={(e) => { e.preventDefault(); if (onClub) onClub(href, r.team.name); else navigate(href); }}
      aria-label={`${r.pos}º, ${r.team.name}${r.mine ? " (seu clube)" : ""}, ${r.pts} pontos, ${r.j} jogos${zoneLabel ? `, zona: ${zoneLabel}` : ""}. Ver elenco`}>
      <span className={`tb-pos${r.zone ? ` tb-zone tb-zone--${r.zone}` : ""}`} role="cell">{r.pos}</span>
      <span className="tb-club" role="cell"><Crest team={r.team} size={26} /><span className="tb-name">{r.team.name}</span></span>
      <span className="tb-num" role="cell">{r.pts}</span>
      <span className="tb-num" role="cell">{r.j}</span>
    </a>
  );
}

// Aberta pelo Resultado da partida (A4, AUD-03), recebe `match`:
// - voltar retorna ao Resultado, sem sair da partida (a sessão da ponte
//   guarda o pós-jogo pendente);
// - trocar a divisão fica na rota da partida (match.onDivision);
// - tocar num clube não sai direto: match.onClub pergunta antes.
export interface TableMatchContext { onBack: () => void; onDivision: (id: string | null) => void; onClub: (href: string, name: string) => void }

export function Table({ m, cup, match }: { m: TableModel; cup: CupModel; match?: TableMatchContext }) {
  const onBack = match?.onBack;
  const [full, setFull] = useState(false);
  // Outra divisão começa no trecho (a tela não remonta: o foco fica na aba).
  useEffect(() => { setFull(false); }, [m.division]);
  const rows = full ? m.rows : m.excerpt;
  const legendOf = (z: TableRow["zone"]) => (z ? m.legend.find((l) => l.zone === z)?.label || null : null);
  return (
    <div className="tb">
      <header className="sub-head">
        <button type="button" className="back-btn back-btn--bare" onClick={() => (onBack ? onBack() : goBack(`${BASE}/`))} aria-label="Voltar"><IconBack /></button>
        <Wordmark />
        <span className="sub-head-ctx">Tabela</span>
      </header>

      <h1 className="screen-title">A disputa continua.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Confira a tabela do {m.divisionName} e os resultados da rodada.</p>

      {m.switcher && (
        <div className="tb-switch" role="tablist" aria-label="Divisão">
          {m.switcher.map((d) => (
            <button key={d.id} type="button" role="tab" aria-selected={d.id === m.division} className={`tb-seg${d.id === m.division ? " is-on" : ""}`}
              onClick={() => {
                if (d.id === m.division) return;
                if (match) match.onDivision(d.id === m.ownDivision ? null : d.id);
                else navigate(d.id === m.ownDivision ? `${BASE}/tabela` : `${BASE}/tabela?divisao=${d.id}`, { replace: true });
              }}>
              {d.label}
            </button>
          ))}
        </div>
      )}

      <section className="tb-sec" aria-labelledby="tb-title">
        <h2 className="tb-comp" id="tb-title">{m.divisionName}</h2>
        <p className="tb-round">{m.lastRound > 0 ? `Rodada ${m.lastRound}` : "Nenhuma rodada disputada"}</p>
        <div className="tb-table" role="table" aria-labelledby="tb-title">
          <div className="tb-head" role="row">
            <span role="columnheader">Pos</span><span role="columnheader">Clube</span>
            <span role="columnheader" className="tb-num" aria-label="Pontos">P</span><span role="columnheader" className="tb-num" aria-label="Jogos">J</span>
          </div>
          <div role="rowgroup">{rows.map((r) => <Row key={String(r.team.id)} r={r} zoneLabel={legendOf(r.zone)} onClub={match?.onClub} />)}</div>
        </div>
        {m.rows.length > 6 && (
          <button type="button" className="tb-more" aria-expanded={full} onClick={() => setFull(!full)}>
            {full ? "Ver só perto do seu clube" : "Ver tabela completa"}<IconDown className={full ? "is-up" : ""} />
          </button>
        )}
        <ul className="tb-legend" aria-label="Zonas">
          {m.legend.map((l) => <li key={l.zone}><span className={`tb-legend-mark tb-zone--${l.zone}`} aria-hidden="true" />{l.label}</li>)}
        </ul>
      </section>

      {m.isOwnDivision && m.results.length > 0 && (
        <section className="tb-sec tb-results" aria-labelledby="tb-res-title">
          <h2 className="kicker-caps" id="tb-res-title">Resultados da rodada</h2>
          <ul>
            {m.results.map((r, i) => (
              <li key={i} className="tb-res" aria-label={`${r.home.name} ${r.gh} a ${r.ga} ${r.away.name}`}>
                <span className="tb-res-team tb-res-team--home"><span className="tb-name">{r.home.name}</span><Crest team={r.home} size={28} /></span>
                <span className="tb-score" aria-hidden="true">{r.gh} - {r.ga}</span>
                <span className="tb-res-team"><Crest team={r.away} size={28} /><span className="tb-name">{r.away.name}</span></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="tb-sec tb-cup" aria-labelledby="tb-cup-title">
        <h2 className="kicker-caps" id="tb-cup-title">Copa do Brasil</h2>
        <p className={`tb-cup-status${cup.outcome === "campeao" ? " is-champ" : ""}`}>{cup.status}</p>
        {cup.history.length > 0 ? (
          <ul>
            {cup.history.map((h, i) => (
              <li key={i} className="tb-cup-row">
                <span className="tb-cup-phase">{h.phase}</span>
                <span className="tb-cup-line"><span>Você</span><b>{h.score}</b><span className="tb-name">{h.opp.name}</span></span>
                <span className={`tb-cup-note${h.won === true ? " is-won" : h.won === false ? " is-out" : ""}`}>{h.note}</span>
              </li>
            ))}
          </ul>
        ) : cup.outcome !== "fora" ? <p className="tb-cup-empty">Nenhum confronto disputado ainda.</p> : null}
      </section>

      <div className="tb-foot">
        {onBack
          ? <button type="button" className="link-back" onClick={onBack}>Voltar ao resultado</button>
          : <button type="button" className="link-back" onClick={() => goBackTo(`${BASE}/`)}>Voltar ao clube</button>}
      </div>
    </div>
  );
}
