// Fase 10 (plano de independência) — aba Jogos pela v2:
// - /carreira/copa (?fase=): Copa do Brasil (CAP04-N07, complemento 40 col. 3, 41 col. 1-2);
// - /carreira/estatisticas (?escopo=&periodo=): Estatísticas (CAP04-N08, 41 col. 3 e 42);
// - /carreira/retrospecto?id=: Retrospecto H2H (CAP04-N09, 43 col. 1);
// - /carreira/premiacoes (?ano=): Premiações (CAP07-N04, 45 col. 2).
import { useEffect, useState } from "react";
import { buildAwards, buildCupDetail, buildCupEditions, buildH2H, buildStats, type CupSide, type StatsPeriod, type StatsScope } from "../domain/games.ts";
import type { Career, Team } from "../domain/types.ts";
import { ContinentalGateway } from "../adapters/continental.ts";
import { defaultCup, defaultPhase, duelOutcome, duelScore, type CClub, type CDuel, type CRow, type ContinentalView } from "../domain/continental.ts";
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

// ---------- Copas continentais (MUNDO-001, M10c, MUN-15) ----------
// /carreira/continental (?copa=&fase=): grupos, fase de liga e chaves da
// Libertadores, Sul-Americana, Champions, Europa League e Conference, com os
// campeões anteriores. Dados do motor (copasContinentais).
const FAIXA_LABEL: Record<string, string> = { oitavas: "Oitavas", playoff: "Playoff", fora: "Eliminado" };
const asClubTeam = (c: CClub): Team => ({ id: c.id, name: c.nome, short: c.sigla || undefined, logo: c.escudo || undefined });
function CTable({ rows, label, bands }: { rows: CRow[]; label: string; bands?: boolean }) {
  return (
    <div className="gm-table-wrap">
      <table className="gm-table" aria-label={label}>
        <thead><tr><th scope="col">Clube</th><th scope="col" aria-label="Jogos">J</th><th scope="col" aria-label="Saldo">SG</th><th scope="col" aria-label="Pontos">P</th>{bands && <th scope="col">Faixa</th>}</tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id} className={r.meu ? "is-mine" : undefined}>
            <td><span className="ct-club"><span className="ct-pos">{r.pos}</span><Crest team={asClubTeam(r)} size={22} /><span>{r.nome}</span></span></td>
            <td>{r.j}</td><td>{r.sg > 0 ? `+${r.sg}` : r.sg}</td><td><b>{r.pts}</b></td>{bands && <td className={`ct-band ct-band--${r.faixa}`}>{FAIXA_LABEL[r.faixa || ""] || ""}</td>}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
function CDuelRow({ d }: { d: CDuel }) {
  const out = duelOutcome(d);
  return (
    <div className="ct-duel">
      <div className="gm-duel">
        <span className={`gm-side${d.a.meu ? " is-mine" : ""}`}><Crest team={asClubTeam(d.a)} size={34} /><b>{d.a.nome}</b></span>
        <span className="gm-score">{duelScore(d)}</span>
        <span className={`gm-side${d.b.meu ? " is-mine" : ""}`}><Crest team={asClubTeam(d.b)} size={34} /><b>{d.b.nome}</b></span>
      </div>
      {(d.placares.length > 1 || out) && <p className="gm-when">{d.placares.length > 1 ? `Ida ${d.placares[0].gh}×${d.placares[0].ga} · Volta ${d.placares[1].gh}×${d.placares[1].ga}` : d.neutro ? "Jogo único, campo neutro" : ""}{out ? `${d.placares.length > 1 || d.neutro ? " · " : ""}${out}` : ""}</p>}
    </div>
  );
}
export function ContinentalScreen({ copa, fase }: { copa: string | null; fase: string | null }) {
  const [st, setSt] = useState<{ kind: "loading" } | { kind: "ok"; v: ContinentalView | null } | { kind: "error" }>({ kind: "loading" });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    setSt({ kind: "loading" });
    ContinentalGateway.view().then((v) => { if (alive) setSt({ kind: "ok", v }); }, () => { if (alive) setSt({ kind: "error" }); });
    return () => { alive = false; };
  }, [n]);
  const back = `${BASE}/jogos`;
  if (st.kind === "loading") return <div className="state" role="status" aria-live="polite"><div className="state-line" />Carregando as copas…</div>;
  if (st.kind === "error") return <div className="state" role="alert">Não foi possível carregar as copas.<button className="state-btn" onClick={() => setN((x) => x + 1)}>Tentar novamente</button></div>;
  const v = st.v;
  if (!v) return (
    <div className="wk pr"><Head ctx="Jogos" back={back} /><h1 className="screen-title">Copas continentais.</h1><span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Nenhuma edição no seu save ainda. As copas começam com a temporada delas no calendário do mundo.</p></div>
  );
  const cups = v.confederacoes.flatMap((c) => c.copas.map((cp) => ({ ...cp, confed: c })));
  const cur = cups.find((c) => c.id === copa) || cups.find((c) => c.id === defaultCup(v)) || cups[0];
  const ph = cur ? (cur.fases.find((f) => f.id === fase) || cur.fases.find((f) => f.id === defaultPhase(cur)) || null) : null;
  const go = (c: string, f?: string | null) => navigate(`${BASE}/continental?copa=${encodeURIComponent(c)}${f ? `&fase=${encodeURIComponent(f)}` : ""}`, { replace: true });
  return (
    <div className="wk pr">
      <Head ctx="Jogos" back={back} />
      <h1 className="screen-title">{cur ? cur.nome : "Copas continentais"}{cur && cur.confed.rotuloAno ? ` ${cur.confed.rotuloAno}` : ""}.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{cur ? (cur.campeao ? `Campeão: ${cur.campeao.nome}${cur.campeao.meu ? " ★" : ""}` : cur.souParticipante ? "Seu clube está nesta copa." : "Seu clube não está nesta copa.") : "Sem edição em andamento."}</p>
      {cups.length > 0 && (
        <section className="wk-sec pr-pad">
          <Picker id="ct-c" label="Copa" value={cur ? cur.id : ""} options={cups.map((c) => ({ id: c.id, label: `${c.nome}${c.souParticipante ? " ★" : ""}` }))} onPick={(id) => go(id)} />
          {cur && cur.fases.length > 0 && <Picker id="ct-f" label="Fase" value={ph ? ph.id : ""} options={cur.fases.map((f) => ({ id: f.id, label: f.nome }))} onPick={(id) => go(cur.id, id)} />}
        </section>
      )}
      {ph && ph.tipo === "grupos" && ph.grupos.map((g) => (
        <section key={g.grupo} className="wk-sec" aria-labelledby={`ct-g-${g.grupo}`}><h2 className="kicker-caps" id={`ct-g-${g.grupo}`}>Grupo {g.grupo}</h2><CTable rows={g.linhas} label={`Grupo ${g.grupo}`} /></section>
      ))}
      {ph && ph.tipo === "liga" && (
        <section className="wk-sec" aria-labelledby="ct-liga"><h2 className="kicker-caps" id="ct-liga">Fase de liga · {ph.rodadas} rodadas</h2>
          <CTable rows={ph.linhas} label="Fase de liga" bands />
          <p className="wk-note">1º ao 8º vão às oitavas; 9º ao 24º jogam o playoff; 25º ao 36º estão eliminados.</p>
        </section>
      )}
      {ph && ph.tipo === "mata" && (
        <section className="wk-sec" aria-labelledby="ct-mm"><h2 className="kicker-caps" id="ct-mm">{ph.nome}</h2>
          {ph.duelos.slice().sort((x, y) => Number(y.a.meu || y.b.meu) - Number(x.a.meu || x.b.meu)).map((d) => <CDuelRow key={d.id} d={d} />)}
        </section>
      )}
      {cur && cur.confed.historico.length > 0 && (
        <section className="wk-sec" aria-labelledby="ct-h"><h2 className="kicker-caps" id="ct-h">Edições anteriores</h2>
          {cur.confed.historico.map((h) => {
            const x = h.campeoes.find((c) => c.copa === cur.id);
            return x ? <Rows key={h.ano} rows={[{ label: h.ano, value: `${x.campeao.nome}${x.campeao.meu ? " ★" : ""} (vice: ${x.vice.nome})` }]} /> : null;
          })}
        </section>
      )}
    </div>
  );
}
