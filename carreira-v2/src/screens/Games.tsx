// Fase 10 (plano de independência) — aba Jogos pela v2:
// - /carreira/copa (?fase=): Copa do Brasil (CAP04-N07, complemento 40 col. 3, 41 col. 1-2);
// - /carreira/estatisticas (?escopo=&periodo=): Estatísticas (CAP04-N08, 41 col. 3 e 42);
// - /carreira/retrospecto?id=: Retrospecto H2H (CAP04-N09, 43 col. 1);
// - /carreira/premiacoes (?ano=): Premiações (CAP07-N04, 45 col. 2).
import { useState } from "react";
import { buildAwards, buildCupDetail, buildCupEditions, buildH2H, buildStats, type CupSide, type StatsPeriod, type StatsScope } from "../domain/games.ts";
import type { Career, Team } from "../domain/types.ts";
import { Crest } from "../ui/components.tsx";
import { Sheet } from "../ui/dialog.tsx";
import { IconCheck, IconChevron } from "../ui/icons.tsx";
import { BASE, goBackTo, navigate } from "../ui/router.tsx";
import { Rows } from "./Market.tsx";
import { Head } from "./Tactics.tsx";
import "./home.css";
import "./calendar.css";
import "./week.css";
import "./prep.css";
import "./squadplus.css";
import "./market.css";
import "./games.css";

type TeamById = (id: string | number) => Team;
function Duel({ left, right, score, teamById }: { left: CupSide; right: CupSide; score: string; teamById: TeamById }) {
  return (
    <div className="gm-duel">
      <span className={`gm-side${left.mine ? " is-mine" : ""}`}><Crest team={teamById(left.id)} size={40} /><b>{left.name}</b></span>
      <span className="gm-score">{score}</span>
      <span className={`gm-side${right.mine ? " is-mine" : ""}`}><Crest team={teamById(right.id)} size={40} /><b>{right.name}</b></span>
    </div>
  );
}
// Escolha numa folha (mesmo padrão de "Selecionar" das fases 6 e 7).
function Picker({ id, label, value, options, onPick }: { id: string; label: string; value: string; options: { id: string; label: string }[]; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.id === value);
  return (<>
    <span className="pr-label" id={`${id}-l`}>{label}</span>
    <button type="button" className="pr-select" aria-labelledby={`${id}-l`} aria-haspopup="dialog" onClick={() => setOpen(true)}><span>{cur ? cur.label : "Selecionar"}</span><IconChevron className="pr-select-ico" /></button>
    {open && (
      <Sheet labelledBy={`${id}-t`} onDismiss={() => setOpen(false)}>
        <h2 id={`${id}-t`} className="sheet-title">{label}</h2>
        <div className="sheet-list" role="radiogroup" aria-labelledby={`${id}-t`}>
          {options.map((o) => <button key={o.id} type="button" role="radio" aria-checked={o.id === value} className={`sheet-opt pr-opt${o.id === value ? " is-on" : ""}`} onClick={() => { setOpen(false); onPick(o.id); }}><span>{o.label}</span>{o.id === value && <IconCheck className="sheet-check" />}</button>)}
        </div>
        <button type="button" className="text-btn" onClick={() => setOpen(false)}>Cancelar</button>
      </Sheet>
    )}
  </>);
}

// ---------- Copa do Brasil ----------
export function CupScreen({ career, teamById, phase }: { career: Career; teamById: TeamById; phase: string | null }) {
  const m = buildCupDetail(career, teamById, phase);
  const eds = buildCupEditions(career, teamById);
  const back = `${BASE}/jogos`;
  return (
    <div className="wk pr">
      <Head ctx="Jogos" back={back} />
      <h1 className="screen-title">{m.title}</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{m.sub}</p>
      {m.phases.length > 0 && <section className="wk-sec pr-pad"><Picker id="cp-f" label="Fase" value={m.phase || ""} options={m.phases} onPick={(id) => navigate(`${BASE}/copa?fase=${id}`, { replace: true })} /></section>}
      {m.tie && (
        <section className="wk-sec" aria-labelledby="cp-c"><h2 className="kicker-caps" id="cp-c">Seu confronto</h2>
          <Duel left={m.tie.meHome ? m.tie.me : m.tie.opp} right={m.tie.meHome ? m.tie.opp : m.tie.me} score={m.tie.agregado && m.tie.meHome ? m.tie.agregado : m.tie.ida} teamById={teamById} />
          <Rows rows={[{ label: m.tie.volta != null ? "Ida" : "Jogo", value: m.tie.ida }, ...(m.tie.volta != null ? [{ label: "Volta", value: m.tie.volta }, { label: "Agregado", value: m.tie.agregado || "— × —" }] : []), ...(m.tie.penalties ? [{ label: "Decisão", value: "Nos pênaltis" }] : [])]} />
          <p className="wk-note">Placares do ponto de vista do seu clube. {m.tie.result}</p>
        </section>
      )}
      {m.note && <p className="wk-note pr-pad">{m.note}</p>}
      {m.state === "campeao" && <section className="wk-sec" aria-labelledby="cp-ch"><h2 className="kicker-caps" id="cp-ch">Campeão</h2><p className="mk-big">{teamById(career.clubId).name}</p></section>}
      {m.state === "encerrada" && m.champion && <section className="wk-sec" aria-labelledby="cp-ch"><h2 className="kicker-caps" id="cp-ch">Campeão</h2><p className="mk-big">{m.champion}</p></section>}
      {eds.length > 0 && (
        <section className="wk-sec" aria-labelledby="cp-ed"><h2 className="kicker-caps" id="cp-ed">Edições anteriores</h2>
          {eds.map((e) => (
            <div key={e.ano} className="cp-ed">
              <p className="row-title">{e.ano}{e.participantes ? ` · ${e.participantes} clubes` : ""}</p>
              <Rows rows={[{ label: "Campeão", value: `${e.campeao}${e.mine ? " ★" : ""}` }, { label: "Vice", value: e.vice }, { label: "Sua campanha", value: e.campanha }]} />
            </div>
          ))}
        </section>
      )}
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(back)}>Voltar aos jogos</button></div>
    </div>
  );
}

// ---------- Estatísticas ----------
export function StatsScreen({ career, teamById, scope, period }: { career: Career; teamById: TeamById; scope: StatsScope; period: StatsPeriod }) {
  const secs = buildStats(career, teamById, scope, period);
  const go = (s: StatsScope, p: StatsPeriod) => navigate(`${BASE}/estatisticas?escopo=${s}&periodo=${p}`, { replace: true });
  const back = `${BASE}/jogos`;
  return (
    <div className="wk pr">
      <Head ctx="Jogos" back={back} />
      <h1 className="screen-title">O jogo em números.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Consulte os dados da competição.</p>
      <div className="pr-tabs sp-tabs2" role="tablist" aria-label="Escopo">
        {([["time", "Meu time"], ["campeonato", "Campeonato"]] as const).map(([s, l]) => <button key={s} type="button" role="tab" aria-selected={scope === s} className={`pr-tab${scope === s ? " is-on" : ""}`} onClick={() => go(s, period)}>{l}</button>)}
      </div>
      <div className="pr-tabs sp-tabs2" role="tablist" aria-label="Período">
        {([["temporada", "Temporada atual"], ["historico", "Histórico"]] as const).map(([p, l]) => <button key={p} type="button" role="tab" aria-selected={period === p} className={`pr-tab${period === p ? " is-on" : ""}`} onClick={() => go(scope, p)}>{l}</button>)}
      </div>
      {secs.map((s) => (
        <section key={s.id} className="wk-sec" aria-labelledby={`st-${s.id}`}><h2 className="kicker-caps" id={`st-${s.id}`}>{s.title}</h2>
          {s.rows && <Rows rows={s.rows} />}
          {s.table && (s.table.rows.length
            ? <div className="gm-table-wrap"><table className="gm-table"><thead><tr>{s.table.head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
              <tbody>{s.table.rows.map((r, i) => <tr key={i} className={r.mine ? "is-mine" : undefined}>{r.cells.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
            : <p className="wk-note">{s.empty}</p>)}
        </section>
      ))}
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(back)}>Voltar aos jogos</button></div>
    </div>
  );
}

// ---------- Retrospecto H2H ----------
export function H2HScreen({ career, teamById, oppId, back }: { career: Career; teamById: TeamById; oppId: string; back: string }) {
  const m = buildH2H(career, teamById, oppId);
  return (
    <div className="wk pr">
      <Head ctx="Retrospecto" back={back} />
      <h1 className="screen-title">O histórico do duelo.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{m.me.name} × {m.opp.name}.</p>
      <section className="wk-sec" aria-labelledby="h2-c"><h2 className="kicker-caps" id="h2-c">Confrontos diretos</h2>
        <Rows rows={[{ label: "Vitórias", value: String(m.v) }, { label: "Empates", value: String(m.e) }, { label: "Derrotas", value: String(m.d) }]} />
        {m.form.length > 0 && <p className="wk-note">Últimos {m.form.length}: <span className="gm-form">{m.form.map((f, i) => <b key={i} className={`gm-f gm-f-${f}`} aria-label={f === "V" ? "vitória" : f === "E" ? "empate" : "derrota"}>{f}</b>)}</span></p>}
      </section>
      <section className="wk-sec" aria-labelledby="h2-u"><h2 className="kicker-caps" id="h2-u">Últimos jogos</h2>
        {m.games.length ? m.games.map((g, i) => (<div key={i} className="gm-game"><p className="gm-when">{g.when}</p><Duel left={g.left} right={g.right} score={g.score} teamById={teamById} /></div>))
          : <p className="wk-note">Vocês ainda não se enfrentaram nesta carreira.</p>}
      </section>
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(back)}>Voltar</button></div>
    </div>
  );
}

// ---------- Premiações ----------
export function AwardsScreen({ career, teamById, year }: { career: Career; teamById: TeamById; year: number | null }) {
  const m = buildAwards(career, teamById, year);
  const back = `${BASE}/mais`;
  const s = m.season;
  const prize = (p: { name: string; club: string; value: string; mine: boolean } | null) => (p ? `${p.name} (${p.club}) · ${p.value}${p.mine ? " ★" : ""}` : "—");
  return (
    <div className="wk pr">
      <Head ctx="Mais" back={back} />
      <h1 className="screen-title">{s ? "Quem fez a diferença." : "Premiações vêm aí."}</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Prêmios da temporada.</p>
      {s ? (<>
        <section className="wk-sec pr-pad"><Picker id="aw-t" label="Temporada" value={String(m.year)} options={m.years.map((y) => ({ id: String(y), label: String(y) }))} onPick={(id) => navigate(`${BASE}/premiacoes?ano=${id}`, { replace: true })} /></section>
        <section className="wk-sec" aria-labelledby="aw-p"><h2 className="kicker-caps" id="aw-p">Premiações</h2>
          <Rows rows={[{ label: "Artilheiro", value: prize(s.scorer) }, { label: "Assistências", value: prize(s.assists) }, { label: "Melhor jogador", value: prize(s.best) }]} />
        </section>
        <section className="wk-sec" aria-labelledby="aw-b"><h2 className="kicker-caps" id="aw-b">Brasileirão</h2>
          <Rows rows={[{ label: "Campeão", value: `${s.champion.name}${s.champion.mine ? " ★" : ""}` }, { label: "Vice", value: `${s.vice.name}${s.vice.mine ? " ★" : ""}` }]} />
        </section>
        <section className="wk-sec" aria-labelledby="aw-c"><h2 className="kicker-caps" id="aw-c">Copa do Brasil</h2>
          {s.cup ? <Rows rows={[{ label: "Campeão", value: `${s.cup.champion.name}${s.cup.champion.mine ? " ★" : ""}` }, { label: "Vice", value: `${s.cup.vice.name}${s.cup.vice.mine ? " ★" : ""}` }]} /> : <p className="wk-note">Não disputada nessa temporada.</p>}
        </section>
        <section className="wk-sec" aria-labelledby="aw-t2"><h2 className="kicker-caps" id="aw-t2">Seus títulos</h2>
          <Rows rows={[{ label: "Total", value: m.titles.total ? `${m.titles.total} · ${m.titles.text}` : "Nenhum título ainda" }]} />
          <p className="wk-note">★ marca o seu clube.</p>
        </section>
      </>) : <p className="wk-note pr-pad">Nenhuma temporada encerrada ainda: as premiações aparecem aqui ao fim de cada temporada.</p>}
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(back)}>Voltar</button></div>
    </div>
  );
}
