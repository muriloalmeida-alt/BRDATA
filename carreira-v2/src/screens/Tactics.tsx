// Fase 6 (plano de independência) — tática pela v2. Aberta pela Escalação
// ("Tática e instruções", decisão de 04/11):
// - /carreira/tatica: índice (instruções, por setor, esquemas, marcação);
// - /carreira/tatica/instrucoes: Instruções táticas (CAP03-T03, complemento 23 col. 2);
// - /carreira/tatica/setor: Instruções por setor (CAP03-N01, 23 col. 3 a 25 col. 2;
//   escala de 5 passos — P4);
// - /carreira/tatica/esquemas: Esquemas salvos (CAP03-T04, 25 col. 3 e 26 col. 1-2);
// - /carreira/tatica/marcacao: Marcação individual (CAP03-N02, 26 col. 3).
// Tudo lido e gravado pelo motor (adapters/prep.ts), mesmas regras de sempre.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { PrepGateway, type Res } from "../adapters/prep.ts";
import { schemeAxes, schemeMeta, type Axis, type MarkingData, type SchemesData, type TacticsData } from "../domain/prep.ts";
import { shortName } from "../domain/lineup.ts";
import { Wordmark } from "../ui/components.tsx";
import { Sheet } from "../ui/dialog.tsx";
import { IconBack, IconCheck, IconChevron } from "../ui/icons.tsx";
import { BASE, Link, goBack, goBackTo } from "../ui/router.tsx";
import "./home.css";
import "./calendar.css";
import "./match.css";
import "./week.css";
import "./prep.css";

const T = `${BASE}/tatica`;
const ERR: Record<string, string> = { sessao: "Sua sessão expirou. Entre de novo para salvar." };
export const errText = (r: { motivo?: string; mensagem?: string }) => r.mensagem || ERR[r.motivo || ""] || "Não foi possível salvar. Tente de novo.";

export function Head({ ctx, back }: { ctx: string; back: string }) {
  return (
    <header className="sub-head">
      <button type="button" className="back-btn back-btn--bare" onClick={() => goBack(back)} aria-label="Voltar"><IconBack /></button>
      <Wordmark />
      <span className="sub-head-ctx">{ctx}</span>
    </header>
  );
}
export function useRead<T>(load: () => Promise<Res<T>>) {
  const [data, setData] = useState<T | null | "erro">(null);
  const reload = useCallback(() => { load().then((r) => setData(r.ok ? (r as T) : "erro")); }, [load]);
  useEffect(() => { reload(); }, [reload]);
  return [data, reload] as const;
}
export function Loading({ data, children }: { data: unknown; children: () => ReactNode }) {
  if (data === null) return <div className="state" role="status" aria-live="polite"><div className="state-line" />Carregando…</div>;
  if (data === "erro") return <div className="state" role="alert">Não foi possível carregar.<button className="state-btn" onClick={() => location.reload()}>Tentar novamente</button></div>;
  return <>{children()}</>;
}
// Escala de 5 passos com os rótulos das pontas (mesmo controle de Ajustar
// tática na Partida).
function Scale({ a, value, onChange }: { a: Axis; value: number; onChange: (v: number) => void }) {
  return (
    <section className="tk-sec" aria-labelledby={`sc-${a.id}`}>
      <h2 className="tk-axis" id={`sc-${a.id}`}>{a.nome}</h2>
      <div className="tk-seg" role="radiogroup" aria-labelledby={`sc-${a.id}`}>
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} aria-label={`${a.nome}: nível ${v} de 5${v === 1 ? ` (${a.baixo})` : v === 5 ? ` (${a.alto})` : ""}`}
            className={`tk-step${value >= v ? " is-fill" : ""}${value === v ? " is-on" : ""}`} onClick={() => onChange(v)}>{v}</button>
        ))}
      </div>
      <div className="tk-ends" aria-hidden="true"><span>{a.baixo}</span><span>{a.alto}</span></div>
    </section>
  );
}
function SaveFoot({ label = "Salvar", busy, msg, err, onSave, back, backLabel = "Voltar" }: { label?: string; busy: boolean; msg: string | null; err: string | null; onSave: () => void; back: () => void; backLabel?: string }) {
  return (
    <div className="cal-foot">
      <p className="sr-only" role="status" aria-live="polite">{msg || ""}</p>
      {msg && <p className="pr-ok" aria-hidden="true">{msg}</p>}
      {err && <p className="inline-error" role="alert">{err}</p>}
      <button type="button" className="cta" aria-disabled={busy || undefined} onClick={() => { if (!busy) onSave(); }}>{busy ? "Salvando…" : label}</button>
      <button type="button" className="link-back" onClick={back}>{backLabel}</button>
    </div>
  );
}

// ---------- Índice ----------
export function TacticsHub({ formation, marking, schemes }: { formation: string; marking: string | null; schemes: number }) {
  const rows: [string, string, string][] = [
    ["Instruções táticas", "Ritmo, pressão, linha defensiva e passe", `${T}/instrucoes`],
    ["Instruções por setor", "Defesa, meio e ataque", `${T}/setor`],
    ["Esquemas salvos", schemes ? `${schemes} ${schemes === 1 ? "esquema" : "esquemas"}` : "Nenhum esquema salvo", `${T}/esquemas`],
    ["Marcação individual", marking || "Sem marcação no próximo jogo", `${T}/marcacao`],
  ];
  return (
    <div className="wk pr">
      <Head ctx="Tática" back={`${BASE}/escalacao`} />
      <h1 className="screen-title">Seu time em campo.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Formação {formation}. Ajuste como o time joga.</p>
      <nav className="wk-sec" aria-label="Tática">
        {rows.map(([t, sub, to]) => (
          <Link key={to} className="row" to={to}><span className="row-body"><span className="row-title">{t}</span><span className="row-sub">{sub}</span></span><IconChevron className="row-chevron" /></Link>
        ))}
      </nav>
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(`${BASE}/escalacao`)}>Voltar à escalação</button></div>
    </div>
  );
}

// ---------- Instruções táticas ----------
export function TacticsAxes({ onSaved }: { onSaved: () => void }) {
  const [data] = useRead(PrepGateway.tactics);
  const [axes, setAxes] = useState<Record<string, number> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return <Loading data={data}>{() => {
    const d = data as TacticsData;
    const cur = axes || Object.fromEntries(d.eixos.map((a) => [a.id, a.nivel]));
    const save = async () => {
      setBusy(true); setErr(null); setMsg(null);
      const r = await PrepGateway.saveTactics(cur);
      setBusy(false);
      if (r.ok) { setMsg("Instruções salvas."); onSaved(); } else setErr(errText(r));
    };
    return (
      <div className="wk pr">
        <Head ctx="Tática" back={T} />
        <h1 className="screen-title">Dê seu ritmo.</h1>
        <span className="tb-bar" aria-hidden="true" />
        <p className="screen-sub">Ajuste as instruções do seu time.</p>
        <dl className="wk-list pr-pad"><div className="wk-item"><dt>Formação atual</dt><dd>{d.formacao}</dd></div></dl>
        <div className="pr-pad">{d.eixos.map((a) => <Scale key={a.id} a={a} value={cur[a.id]} onChange={(v) => { setMsg(null); setAxes({ ...cur, [a.id]: v }); }} />)}</div>
        <nav className="wk-sec"><Link className="row" to={`${T}/setor`}><span className="row-body"><span className="row-title">Instruções por setor</span></span><IconChevron className="row-chevron" /></Link></nav>
        <SaveFoot busy={busy} msg={msg} err={err} onSave={save} back={() => goBackTo(T)} />
      </div>
    );
  }}</Loading>;
}

// ---------- Instruções por setor ----------
export function TacticsSectors({ onSaved }: { onSaved: () => void }) {
  const [data] = useRead(PrepGateway.tactics);
  const [tab, setTab] = useState("defesa");
  const [vals, setVals] = useState<Record<string, Record<string, number>>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return <Loading data={data}>{() => {
    const d = data as TacticsData;
    const sec = d.setores.find((s) => s.id === tab) || d.setores[0];
    const cur = (sid: string) => ({ ...Object.fromEntries((d.setores.find((s) => s.id === sid)?.instrucoes || []).map((i) => [i.id, i.nivel])), ...(vals[sid] || {}) });
    const save = async () => {
      setBusy(true); setErr(null); setMsg(null);
      for (const sid of Object.keys(vals)) {
        const r = await PrepGateway.saveSector(sid, cur(sid));
        if (!r.ok) { setBusy(false); setErr(errText(r)); return; }
      }
      setBusy(false); setVals({}); setMsg("Instruções salvas."); onSaved();
    };
    return (
      <div className="wk pr">
        <Head ctx="Tática" back={T} />
        <h1 className="screen-title">Ajuste cada setor.</h1>
        <span className="tb-bar" aria-hidden="true" />
        <p className="screen-sub">Detalhe como seu time joga.</p>
        <div className="pr-tabs" role="tablist" aria-label="Setor">
          {d.setores.map((s) => (
            <button key={s.id} type="button" role="tab" aria-selected={s.id === tab} className={`pr-tab${s.id === tab ? " is-on" : ""}`} onClick={() => setTab(s.id)}>{s.nome}</button>
          ))}
        </div>
        <div className="pr-pad" role="tabpanel" aria-label={sec.nome}>
          {sec.instrucoes.map((a) => <Scale key={a.id} a={a} value={cur(sec.id)[a.id]} onChange={(v) => { setMsg(null); setVals({ ...vals, [sec.id]: { ...(vals[sec.id] || {}), [a.id]: v } }); }} />)}
        </div>
        <SaveFoot busy={busy} msg={msg} err={err} onSave={save} back={() => goBackTo(T)} />
      </div>
    );
  }}</Loading>;
}

// ---------- Esquemas salvos ----------
type SchemeSheet = { kind: "novo" } | { kind: "renomear"; id: string; nome: string } | { kind: "excluir"; id: string; nome: string };
export function TacticsSchemes({ onSaved }: { onSaved: () => void }) {
  const [data, reload] = useRead(PrepGateway.schemes);
  const [sheet, setSheet] = useState<SchemeSheet | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const run = async (p: Promise<Res>, done: string) => {
    setBusy(true); setErr(null);
    const r = await p;
    setBusy(false);
    if (!r.ok) { setErr(errText(r)); return; }
    setSheet(null); setMsg(done); reload(); onSaved();
  };
  return <Loading data={data}>{() => {
    const d = data as SchemesData;
    const empty = !d.lista.length;
    const full = d.lista.length >= d.max;
    return (
      <div className="wk pr">
        <Head ctx="Tática" back={T} />
        <h1 className="screen-title">{empty ? "Guarde sua ideia." : "Seu plano de jogo."}</h1>
        <span className="tb-bar" aria-hidden="true" />
        <p className="screen-sub">{empty ? "Reutilize suas configurações táticas." : "Aplique um esquema ou salve o atual."}</p>
        {empty ? <p className="wk-note pr-pad">Você ainda não salvou esquemas.</p> : (
          <section className="wk-sec" aria-labelledby="sq-k">
            <h2 className="kicker-caps" id="sq-k">Esquemas salvos</h2>
            {d.lista.map((s) => {
              const [l1, l2] = schemeAxes(s);
              return (
                <article key={s.id} className="pr-scheme" aria-label={s.nome}>
                  <div className="wk-item"><dt className="pr-scheme-name">{s.nome}{s.id === d.ativo && <span className="pr-badge">Em uso</span>}</dt><dd>Formação {s.formacao}</dd></div>
                  <p className="pr-scheme-axes">{l1}<br />{l2}</p>
                  <p className="nw-meta">{schemeMeta(s)}</p>
                  <div className="pr-scheme-acts">
                    <button type="button" className="row" disabled={busy} onClick={() => run(PrepGateway.applyScheme(s.id), `Esquema “${s.nome}” aplicado.`)}><span className="row-body"><span className="row-title">Aplicar</span></span><IconChevron className="row-chevron" /></button>
                    <button type="button" className="row" disabled={busy} onClick={() => { setErr(null); setName(s.nome); setSheet({ kind: "renomear", id: s.id, nome: s.nome }); }}><span className="row-body"><span className="row-title">Renomear</span></span><IconChevron className="row-chevron" /></button>
                    <button type="button" className="row pr-danger" disabled={busy} onClick={() => { setErr(null); setSheet({ kind: "excluir", id: s.id, nome: s.nome }); }}><span className="row-body"><span className="row-title">Excluir</span></span><IconChevron className="row-chevron" /></button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
        {full && <p className="wk-note pr-pad">Limite de {d.max} esquemas salvos: exclua um para salvar outro.</p>}
        <div className="cal-foot">
          <p className="sr-only" role="status" aria-live="polite">{msg || ""}</p>
          {msg && <p className="pr-ok" aria-hidden="true">{msg}</p>}
          {err && !sheet && <p className="inline-error" role="alert">{err}</p>}
          <button type="button" className="cta" aria-disabled={full || busy || undefined} onClick={() => { if (full || busy) return; setErr(null); setName(""); setSheet({ kind: "novo" }); }}>Salvar esquema atual</button>
          <button type="button" className="link-back" onClick={() => goBackTo(T)}>Voltar</button>
        </div>
        {sheet && sheet.kind !== "excluir" && (
          <Sheet labelledBy="sq-t" onDismiss={busy ? undefined : () => setSheet(null)}>
            <h2 id="sq-t" className="sheet-title">{sheet.kind === "novo" ? "Salve seu esquema." : "Renomeie o esquema."}</h2>
            <span className="tb-bar pr-sheet-bar" aria-hidden="true" />
            <p className="wk-sheet-text">{sheet.kind === "novo" ? "Dê um nome para reconhecer depois. Ele guarda formação, titulares, banco e instruções táticas." : `Novo nome para “${sheet.nome}”.`}</p>
            <form onSubmit={(e) => { e.preventDefault(); run(sheet.kind === "novo" ? PrepGateway.saveScheme(name) : PrepGateway.renameScheme(sheet.id, name), sheet.kind === "novo" ? "Esquema salvo." : "Esquema renomeado."); }}>
              <label className="pr-label" htmlFor="sq-n">Nome</label>
              <input id="sq-n" className="pr-input" data-autofocus maxLength={30} value={name} placeholder="Nome do esquema" autoComplete="off" onChange={(e) => setName(e.target.value)} />
              {err && <p className="inline-error" role="alert">{err}</p>}
              <button type="submit" className="cta pr-sheet-cta" aria-disabled={busy || !name.trim() || undefined}>{busy ? "Salvando…" : sheet.kind === "novo" ? "Salvar esquema atual" : "Salvar nome"}</button>
            </form>
            <button type="button" className="text-btn" disabled={busy} onClick={() => setSheet(null)}>Cancelar</button>
          </Sheet>
        )}
        {sheet && sheet.kind === "excluir" && (
          <Sheet alert labelledBy="sx-t" describedBy="sx-d" onDismiss={busy ? undefined : () => setSheet(null)}>
            <h2 id="sx-t" className="sheet-title">Excluir “{sheet.nome}”?</h2>
            <p id="sx-d" className="wk-sheet-text">O esquema salvo some da lista. A escalação e a tática atuais não mudam.</p>
            {err && <p className="inline-error" role="alert">{err}</p>}
            <button type="button" className="cta" data-autofocus onClick={() => setSheet(null)}>Manter esquema</button>
            <button type="button" className="text-btn pr-danger-text" disabled={busy} onClick={() => run(PrepGateway.deleteScheme(sheet.id), "Esquema excluído.")}>Excluir</button>
          </Sheet>
        )}
      </div>
    );
  }}</Loading>;
}

// ---------- Marcação individual ----------
export function TacticsMarking({ onSaved }: { onSaved: () => void }) {
  const [data, reload] = useRead(PrepGateway.marking);
  const [pick, setPick] = useState<{ mine: string | null; rival: string | null; none: boolean } | null>(null);
  const [sheet, setSheet] = useState<null | "meu" | "rival">(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return <Loading data={data}>{() => {
    const d = data as MarkingData;
    if (!d.adversario) return (
      <div className="wk pr">
        <Head ctx="Tática" back={T} />
        <h1 className="screen-title">Acompanhe de perto.</h1>
        <span className="tb-bar" aria-hidden="true" />
        <p className="screen-sub">Defina a marcação para o próximo jogo.</p>
        <p className="wk-note pr-pad">Não há jogo do seu clube marcado agora. A marcação fica disponível na semana de um jogo do Brasileirão.</p>
        <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(T)}>Voltar</button></div>
      </div>
    );
    const cur = pick || { mine: d.atual?.meu || null, rival: d.atual?.rival || null, none: !d.atual };
    const mine = d.meus.find((p) => p.id === cur.mine);
    const rival = d.rivais.find((p) => p.id === cur.rival);
    const can = cur.none || (!!mine && !!rival);
    const save = async () => {
      if (!can) return;
      setBusy(true); setErr(null); setMsg(null);
      const r = await PrepGateway.saveMarking(cur.none ? null : cur.mine, cur.none ? null : cur.rival);
      setBusy(false);
      if (r.ok) { setMsg(cur.none ? "Sem marcação no próximo jogo." : "Marcação salva para o próximo jogo."); setPick(null); reload(); onSaved(); } else setErr(errText(r));
    };
    const list = sheet === "meu" ? d.meus : d.rivais;
    return (
      <div className="wk pr">
        <Head ctx="Tática" back={T} />
        <h1 className="screen-title">Acompanhe de perto.</h1>
        <span className="tb-bar" aria-hidden="true" />
        <p className="screen-sub">Defina a marcação para o próximo jogo.</p>
        <section className="wk-sec" aria-labelledby="mk-a">
          <h2 className="kicker-caps" id="mk-a">Próximo adversário</h2>
          <dl className="wk-list"><div className="wk-item"><dt>{d.adversario.nome}</dt><dd>{d.adversario.sigla || ""}</dd></div></dl>
          <span className="pr-label">Seu jogador</span>
          <button type="button" className="pr-select" disabled={cur.none} onClick={() => setSheet("meu")}>{mine ? `${shortName(mine.nome)}${mine.posicao ? ` · ${mine.posicao}` : ""}` : <span className="pr-ph">Escolher jogador</span>}<IconChevron className="pr-select-ico" /></button>
          <span className="pr-label">Jogador adversário</span>
          <button type="button" className="pr-select" disabled={cur.none} onClick={() => setSheet("rival")}>{rival ? `${shortName(rival.nome)}${rival.posicao ? ` · ${rival.posicao}` : ""}${rival.overall ? ` · ${rival.overall}` : ""}` : <span className="pr-ph">Escolher adversário</span>}<IconChevron className="pr-select-ico" /></button>
          <button type="button" role="checkbox" aria-checked={cur.none} className="pr-check" onClick={() => setPick({ ...cur, none: !cur.none })}>
            {cur.none ? <IconCheck className="am-check" /> : <span className="am-dot" aria-hidden="true" />}<span>Sem marcação</span>
          </button>
          <p className="wk-note">O marcador reduz as chances do jogador adversário neste jogo; os 5 adversários são os de maior overall.</p>
        </section>
        <SaveFoot busy={busy} msg={msg} err={err} onSave={save} back={() => goBackTo(T)} />
        {sheet && (
          <Sheet labelledBy="mk-t" onDismiss={() => setSheet(null)}>
            <h2 id="mk-t" className="sheet-title">{sheet === "meu" ? "Seu jogador" : "Jogador adversário"}</h2>
            <div className="sheet-list" role="radiogroup" aria-labelledby="mk-t">
              {list.map((p) => {
                const on = (sheet === "meu" ? cur.mine : cur.rival) === p.id;
                return (
                  <button key={p.id} type="button" role="radio" aria-checked={on} className={`sheet-opt pr-opt${on ? " is-on" : ""}`} data-autofocus={on || undefined}
                    onClick={() => { setPick(sheet === "meu" ? { ...cur, mine: p.id, none: false } : { ...cur, rival: p.id, none: false }); setSheet(null); setMsg(null); }}>
                    <span>{shortName(p.nome)}<small>{[p.posicao, p.overall ? `overall ${p.overall}` : null].filter(Boolean).join(" · ")}</small></span>{on && <IconCheck className="sheet-check" />}
                  </button>
                );
              })}
              {!list.length && <p className="wk-note">{sheet === "meu" ? "Defina os titulares na Escalação antes de marcar alguém." : "Elenco do adversário indisponível."}</p>}
            </div>
            <button type="button" className="text-btn" onClick={() => setSheet(null)}>Cancelar</button>
          </Sheet>
        )}
      </div>
    );
  }}</Loading>;
}
