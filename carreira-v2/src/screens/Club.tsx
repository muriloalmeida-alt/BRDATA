// Fase 9 (plano de independência) — clube pela v2:
// - /carreira/comissao: Comissão técnica (CAP02-T04, complemento 38 col. 1);
// - /carreira/estadio e /estadio/obra?id=: Estádio e obras (CAP06-T07, 38 col. 2-3);
// - /carreira/patrocinios: Propostas de patrocínio (CAP06-N01, 39 col. 1);
// - /carreira/extrato: Extrato financeiro (CAP02-N05, 39 col. 2);
// - /carreira/olheiros (+ /contratar, /missao, /indicacoes, /relatorios,
//   /prospecto?id=): Olheiros e missões (CAP05-T08, 39 col. 3) e Relatórios
//   e prospectos (CAP05-T09, 40 col. 1);
// - /carreira/base: Categorias de base (CAP05-T10, 40 col. 2).
import { useCallback, useState } from "react";
import { ClubGateway, type Scouting, type Sponsors, type Stadium, type Staff } from "../adapters/club.ts";
import { MarketGateway } from "../adapters/market.ts";
import type { Res } from "../adapters/prep.ts";
import { BASE_CAT_LABEL, POSITION, REGION_LABEL, baseCounts, baseList, buildLedger, buildProspects, buildSuggestions, ledgerFilters, scoutStatus, type BaseCat } from "../domain/club.ts";
import { moneyShort } from "../domain/home.ts";
import type { MarketInfo } from "../domain/market.ts";
import type { Career, PlayerGroup } from "../domain/types.ts";
import { Sheet } from "../ui/dialog.tsx";
import { IconChevron } from "../ui/icons.tsx";
import { BASE, Link, goBackTo, navigate } from "../ui/router.tsx";
import { NavRow, PlayerRow, Rows, Seg, Status } from "./Market.tsx";
import { Head, Loading, errText, useRead } from "./Tactics.tsx";
import "./home.css";
import "./calendar.css";
import "./match.css";
import "./week.css";
import "./prep.css";
import "./squadplus.css";
import "./market.css";
import "./club.css";

const CLUBE = `${BASE}/clube`;
const OL = `${BASE}/olheiros`;
const msgOf = (r: { motivo?: string; mensagem?: string }) => r.mensagem || errText(r);
const proposalTo = (t: { clubId: string; playerId: string }) => `${BASE}/mercado/proposta?clube=${encodeURIComponent(t.clubId)}&id=${encodeURIComponent(t.playerId)}`;
function Foot({ back = CLUBE, label = "Voltar ao clube", children }: { back?: string; label?: string; children?: React.ReactNode }) {
  return <div className="cal-foot">{children}<button type="button" className="link-back" onClick={() => goBackTo(back)}>{label}</button></div>;
}
// Confirmação (alertdialog), mesmo padrão das fases 7 e 8.
function Confirm({ id, title, text, ok, cancel = "Cancelar", danger, busy, onOk, onClose, children }: { id: string; title: string; text: string; ok: string; cancel?: string; danger?: boolean; busy: boolean; onOk: () => void; onClose: () => void; children?: React.ReactNode }) {
  return (
    <Sheet alert labelledBy={`${id}-t`} describedBy={`${id}-d`} onDismiss={busy ? undefined : onClose}>
      <h2 id={`${id}-t`} className="sheet-title">{title}</h2>
      <p id={`${id}-d`} className="wk-sheet-text">{text}</p>
      {children}
      {danger
        ? <><button type="button" className="cta" data-autofocus onClick={onClose}>{cancel}</button>
          <button type="button" className="text-btn pr-danger-text" disabled={busy} onClick={onOk}>{busy ? "…" : ok}</button></>
        : <><button type="button" className="cta sp-sheet-cta" aria-disabled={busy || undefined} onClick={() => { if (!busy) onOk(); }}>{busy ? "…" : ok}</button>
          <button type="button" className="text-btn" disabled={busy} onClick={onClose}>{cancel}</button></>}
    </Sheet>
  );
}
function useAct() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = async <T,>(p: Promise<Res<T>>, ok?: (r: T) => void | Promise<void>) => {
    if (busy) return false;
    setBusy(true); setErr(null); setMsg(null);
    const r = await p;
    setBusy(false);
    if (!r.ok) { setErr(msgOf(r)); return false; }
    if (ok) await ok(r as T);
    return true;
  };
  return { busy, msg, err, setMsg, setErr, run };
}

// ---------- Comissão técnica (CAP02-T04) ----------
export function StaffScreen({ onChanged }: { onChanged: () => Promise<void> | void }) {
  const load = useCallback(() => ClubGateway.staff(), []);
  const [data, reload] = useRead<Staff>(load);
  const a = useAct();
  const [ask, setAsk] = useState<null | "hire" | "fire">(null);
  const done = async (t: string) => { setAsk(null); a.setMsg(t); await onChanged(); reload(); };
  return (
    <div className="wk pr">
      <Head ctx="Clube" back={CLUBE} />
      <h1 className="screen-title">Fortaleça a comissão.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Profissionais que trabalham com você.</p>
      <Loading data={data}>{() => {
        const s = data as Staff;
        return (<>
          <section className="wk-sec" aria-labelledby="cm-s"><h2 className="kicker-caps" id="cm-s">{s.contratada ? "Comissão contratada" : "Sem comissão"}</h2>
            <Rows rows={[{ label: "Situação", value: s.contratada ? "Contratada" : "Não contratada" }, { label: "Custo mensal", value: moneyShort(s.custoMensal) }, { label: "Por rodada", value: moneyShort(Math.round(s.custoMensal / 4)) }]} />
            <p className="wk-note">{s.contratada ? "O custo acompanha a folha salarial (5%) e é pago junto com ela." : "A comissão sugere escalação, treinos, tática e reforços. Você decide o que aplicar."}</p>
          </section>
          {s.contratada && (
            <section className="wk-sec" aria-labelledby="cm-g"><h2 className="kicker-caps" id="cm-g">Sugestões</h2>
              {s.sugestoes.map((g) => (
                <div key={g.area} className="cl-sug">
                  <p className="cl-sug-t">{g.nome}</p>
                  <p className="wk-note">{g.texto}</p>
                  {g.aplicavel && <button type="button" className="state-btn cl-sug-btn" disabled={a.busy}
                    onClick={() => a.run(ClubGateway.applySuggestion(g.area), async (r) => {
                      if (r.alvo) { navigate(proposalTo(r.alvo)); return; }
                      await done(`Sugestão de ${g.nome} aplicada.`);
                    })}>{g.area === "market" ? "Fazer proposta" : "Aplicar"}</button>}
                </div>
              ))}
              <button type="button" className="row pr-row pr-danger" disabled={a.busy} onClick={() => setAsk("fire")}><span className="row-body"><span className="row-title">Demitir comissão técnica</span></span><IconChevron className="row-chevron" /></button>
            </section>
          )}
          <Foot><Status msg={a.msg} err={a.err} />{!s.contratada && <button type="button" className="cta" onClick={() => setAsk("hire")}>Contratar comissão técnica</button>}</Foot>
          {ask === "hire" && <Confirm id="ch" title="Contratar a comissão?" text={`Custo de ${moneyShort(s.custoMensal)} por mês, pago junto com a folha.`} ok="Contratar" busy={a.busy} onClose={() => setAsk(null)}
            onOk={() => a.run(ClubGateway.hireStaff(), () => done("Comissão técnica contratada: as sugestões já estão disponíveis."))} />}
          {ask === "fire" && <Confirm id="cf" title="Demitir a comissão?" text="As sugestões deixam de aparecer e o custo mensal para." ok="Demitir" danger busy={a.busy} onClose={() => setAsk(null)}
            onOk={() => a.run(ClubGateway.fireStaff(), () => done("Comissão técnica demitida."))} />}
        </>);
      }}</Loading>
    </div>
  );
}

// ---------- Estádio (CAP06-T07) ----------
const WORK_STATE: Record<string, string> = { disponivel: "Disponível", aguardando: "Aguarda a obra atual", bloqueada: "Bloqueada", "em-obra": "Em obra", concluida: "Concluída" };
export function StadiumScreen({ work, onChanged }: { work: string | null; onChanged: () => Promise<void> | void }) {
  const load = useCallback(() => ClubGateway.stadium(), []);
  const [data, reload] = useRead<Stadium>(load);
  const a = useAct();
  const [ask, setAsk] = useState(false);
  return (
    <div className="wk pr">
      <Head ctx="Estádio" back={work ? `${BASE}/estadio` : CLUBE} />
      <Loading data={data}>{() => {
        const s = data as Stadium;
        const u = work ? s.melhorias.find((x) => x.id === work) : null;
        const done = s.melhorias.filter((x) => x.estado === "concluida");
        if (u) return (<>
          <h1 className="screen-title">O clube em obras.</h1>
          <span className="tb-bar" aria-hidden="true" />
          <p className="screen-sub">Acompanhe o andamento das melhorias.</p>
          <section className="wk-sec" aria-labelledby="ob-s"><h2 className="kicker-caps" id="ob-s">Melhoria selecionada</h2>
            <p className="wk-note cl-lead">{u.nome}</p>
            <Rows rows={[{ label: "Custo", value: moneyShort(u.custo) }, { label: "Prazo", value: `${u.rodadas} rodadas` }, ...(u.lugares ? [{ label: "Lugares a mais", value: u.lugares.toLocaleString("pt-BR") }] : []), { label: "Situação", value: WORK_STATE[u.estado] }]} />
            {u.estado === "bloqueada" && <p className="wk-note">Exige {u.requer} concluída.</p>}
            {u.estado === "aguardando" && <p className="wk-note">Só uma obra por vez: espere a atual terminar.</p>}
          </section>
          <section className="wk-sec" aria-labelledby="ob-a"><h2 className="kicker-caps" id="ob-a">Em andamento</h2>
            {s.obra ? <Rows rows={[{ label: "Obra", value: s.obra.nome }, { label: "Rodadas restantes", value: String(s.obra.rodadasRestantes) }]} /> : <p className="wk-note">Nenhuma obra em andamento.</p>}
          </section>
          <section className="wk-sec" aria-labelledby="ob-c"><h2 className="kicker-caps" id="ob-c">Concluídas</h2>
            {done.length ? <Rows rows={done.map((x) => ({ label: x.nome, value: x.lugares ? `+${x.lugares.toLocaleString("pt-BR")} lugares` : "Pronta" }))} /> : <p className="wk-note">Nenhuma melhoria concluída ainda.</p>}
          </section>
          <Foot back={`${BASE}/estadio`} label="Voltar ao estádio"><Status msg={a.msg} err={a.err} />
            {u.estado === "disponivel" && <button type="button" className="cta" onClick={() => setAsk(true)}>Iniciar obra</button>}</Foot>
          {ask && <Confirm id="ow" title="Iniciar a obra?" text={`${u.nome}: ${moneyShort(u.custo)} saem do caixa agora, e a obra leva ${u.rodadas} rodadas.`} ok="Iniciar obra" busy={a.busy} onClose={() => setAsk(false)}
            onOk={() => a.run(ClubGateway.startWork(u.id), async () => { setAsk(false); a.setMsg(`Obra iniciada: ${u.nome}.`); await onChanged(); reload(); })}>
            <Rows rows={[{ label: "Caixa", value: `${moneyShort(s.caixa)} → ${moneyShort(s.caixa - u.custo)}`, tone: s.caixa - u.custo < 0 ? "neg" : undefined }]} />
          </Confirm>}
        </>);
        return (<>
          <h1 className="screen-title">Faça o clube crescer.</h1>
          <span className="tb-bar" aria-hidden="true" />
          <p className="screen-sub">Capacidade, obras e melhorias.</p>
          <section className="wk-sec"><Rows rows={[{ label: "Nome do estádio", value: s.nome || "—" }, { label: "Capacidade", value: `${s.capacidade.toLocaleString("pt-BR")} lugares` }, ...(s.obra ? [{ label: "Em obra", value: `${s.obra.nome} · ${s.obra.rodadasRestantes} rod.` }] : [])]} /></section>
          <nav className="wk-sec" aria-labelledby="st-m"><h2 className="kicker-caps" id="st-m">Melhorias</h2>
            {s.melhorias.map((x) => <NavRow key={x.id} to={`${BASE}/estadio/obra?id=${x.id}`} title={x.nome} sub={`${WORK_STATE[x.estado]} · ${moneyShort(x.custo)} · ${x.rodadas} rodadas`} value="Ver" />)}
            {s.melhorias.filter((x) => x.requer).map((x) => <p key={x.id} className="wk-note">{x.nome} exige {x.requer}.</p>)}
          </nav>
          <Foot />
        </>);
      }}</Loading>
    </div>
  );
}

// ---------- Patrocínios (CAP06-N01) ----------
export function SponsorsScreen({ onChanged }: { onChanged: () => Promise<void> | void }) {
  const load = useCallback(() => ClubGateway.sponsors(), []);
  const [data, reload] = useRead<Sponsors>(load);
  const a = useAct();
  const [ask, setAsk] = useState<null | { kind: string; idx: number; empresa: string; valor: number; dur: number }>(null);
  return (
    <div className="wk pr">
      <Head ctx="Clube" back={CLUBE} />
      <h1 className="screen-title">Novas parcerias.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Avalie as propostas para o clube.</p>
      <Loading data={data}>{() => {
        const s = data as Sponsors;
        return (<>
          {s.tipos.map((t) => (
            <section key={t.tipo} className="wk-sec" aria-labelledby={`sp-${t.tipo}`}><h2 className="kicker-caps" id={`sp-${t.tipo}`}>{t.nome}</h2>
              {t.contrato
                ? <Rows rows={[{ label: "Empresa", value: t.contrato.empresa }, { label: "Valor por temporada", value: moneyShort(t.contrato.valorTemporada) }, { label: "Duração", value: `${t.contrato.temporadasRestantes} ${t.contrato.temporadasRestantes === 1 ? "temporada restante" : "temporadas restantes"}` }]} />
                : (<>
                  <p className="wk-note">Contrato vencido: escolha uma das propostas.</p>
                  {(t.propostas || []).map((p, i) => (
                    <button key={i} type="button" className="row pr-row" onClick={() => setAsk({ kind: t.tipo, idx: i, empresa: p.empresa, valor: p.valorTemporada, dur: p.duracao })}>
                      <span className="row-body"><span className="row-title">{p.empresa}</span><span className="row-sub">{moneyShort(p.valorTemporada)} por temporada · {p.duracao} temporadas</span></span>
                      <span className="row-sub pr-val">Assinar</span><IconChevron className="row-chevron" />
                    </button>
                  ))}
                </>)}
            </section>
          ))}
          <section className="wk-sec"><Rows rows={[{ label: "Total por temporada", value: moneyShort(s.totalTemporada) }]} /><p className="wk-note">O valor entra no caixa aos poucos, ao longo da temporada.</p></section>
          <Foot><Status msg={a.msg} err={a.err} /></Foot>
          {ask && <Confirm id="sg" title="Assinar o contrato?" text={`${ask.empresa}: ${moneyShort(ask.valor)} por temporada, por ${ask.dur} temporadas.`} ok="Assinar" busy={a.busy} onClose={() => setAsk(null)}
            onOk={() => a.run(ClubGateway.sign(ask.kind, ask.idx), async () => { a.setMsg(`Contrato assinado com ${ask.empresa}.`); setAsk(null); await onChanged(); reload(); })} />}
        </>);
      }}</Loading>
    </div>
  );
}

// ---------- Extrato (CAP02-N05) ----------
let KEPT_FILTER = "todos";
export function LedgerScreen({ career }: { career: Career }) {
  const filters = ledgerFilters(career);
  const [f, setF] = useState(filters.some((x) => x.id === KEPT_FILTER) ? KEPT_FILTER : "todos");
  const m = buildLedger(career, f);
  return (
    <div className="wk pr">
      <Head ctx="Finanças" back={`${BASE}/financas`} />
      <h1 className="screen-title">Cada movimento conta.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Entradas, saídas e saldo por rodada.</p>
      <section className="wk-sec" aria-labelledby="ex-s"><h2 className="kicker-caps" id="ex-s">Saldo</h2><p className={`mk-big${m.negative ? " cl-neg" : ""}`}>{m.cash}</p></section>
      <div className="pr-seg cl-filters" role="radiogroup" aria-label="Tipo de lançamento">
        {filters.map((x) => <button key={x.id} type="button" role="radio" aria-checked={f === x.id} className={`pr-seg-btn${f === x.id ? " is-on" : ""}`} onClick={() => { KEPT_FILTER = x.id; setF(x.id); }}>{x.label}</button>)}
      </div>
      {m.empty ? <p className="wk-note pr-pad">Nenhum lançamento ainda{f !== "todos" ? " nesse filtro" : ""}.</p>
        : m.groups.map((g, i) => (
          <section key={`${g.round}-${i}`} className="wk-sec" aria-labelledby={`ex-${i}`}><h2 className="kicker-caps" id={`ex-${i}`}>Rodada {g.round}</h2>
            <dl className="wk-list">{g.items.map((t, j) => <div key={j} className="wk-item"><dt>{t.type} · {t.label}</dt><dd className={t.tone === "pos" ? "is-pos" : "is-neg"}>{t.text}</dd></div>)}</dl>
          </section>
        ))}
      <Foot back={`${BASE}/financas`} label="Voltar às finanças" />
    </div>
  );
}

// ---------- Olheiros e missões (CAP05-T08) ----------
function useScouting() {
  const load = useCallback(() => ClubGateway.scouting(), []);
  return useRead<Scouting>(load);
}
export function ScoutsScreen({ career, onChanged }: { career: Career; onChanged: () => Promise<void> | void }) {
  const [data, reload] = useScouting();
  const a = useAct();
  const [pick, setPick] = useState<string | null>(null);
  const [ask, setAsk] = useState(false);
  const scouts = career.scouts || [];
  const sc = scouts.find((s) => s.id === pick) || null;
  const nProspects = (career.scoutMissionProspects || []).length, nSugg = (career.scoutSuggestions || []).length;
  const base = baseCounts(career);
  return (
    <div className="wk pr">
      <Head ctx="Clube" back={CLUBE} />
      <h1 className="screen-title">Amplie seu alcance.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Organize a observação de jogadores.</p>
      <Loading data={data}>{() => {
        const s = data as Scouting;
        return (<>
          <section className="wk-sec" aria-labelledby="ol-c"><h2 className="kicker-caps" id="ol-c">Olheiros em campo</h2>
            {scouts.length ? scouts.map((x) => {
              const st = scoutStatus(x);
              return <button key={x.id} type="button" className="row pr-row" onClick={() => setPick(x.id)}><span className="row-body"><span className="row-title">{x.name}</span><span className="row-sub">{st.text}</span></span><IconChevron className="row-chevron" /></button>;
            }) : <p className="wk-note">Nenhum olheiro contratado.</p>}
            <NavRow to={`${OL}/contratar`} title="Contratar olheiro" sub={scouts.length ? `Salários: ${moneyShort(s.custoMensal)} por mês` : null} />
          </section>
          <nav className="wk-sec" aria-labelledby="ol-m"><h2 className="kicker-caps" id="ol-m">Missões</h2>
            <NavRow to={`${OL}/missao`} title="Nova missão" sub="Jovens para a base (Sub-17 e Sub-20)" />
            <NavRow to={`${OL}/missao?tipo=pro`} title="Enviar olheiro ao mercado" sub="Indicações de jogadores de outros clubes" />
            <NavRow to={`${OL}/indicacoes`} title="Indicações dos olheiros" value={nSugg ? String(nSugg) : null} />
            <NavRow to={`${OL}/relatorios`} title="Relatórios e prospectos" value={nProspects ? String(nProspects) : null} />
            <NavRow to={`${BASE}/base`} title="Categorias de base" value={String(base.sub15 + base.sub17 + base.sub20)} />
          </nav>
          <Foot><Status msg={a.msg} err={a.err} /></Foot>
          {sc && !ask && (
            <Sheet labelledBy="os-t" onDismiss={() => setPick(null)}>
              <h2 id="os-t" className="sheet-title">{sc.name}</h2>
              <span className="tb-bar pr-sheet-bar" aria-hidden="true" />
              <p className="wk-sheet-text">{scoutStatus(sc).text}</p>
              <Rows rows={[{ label: "Avaliação", value: `${sc.evaluation ?? sc.stars ?? "—"}/5` }, { label: "Rede", value: `${sc.network ?? sc.stars ?? "—"}/5` }, { label: "Salário mensal", value: moneyShort(sc.monthlyCost) },
                { label: "Regiões", value: (s.permitidas[sc.id] || []).map((r) => REGION_LABEL[r] || r).join(", ") || "—" }]} />
              {sc.mission ? <p className="wk-note">Em missão: só dá para dispensar quando ele voltar.</p> : <>
                <button type="button" className="cta sp-sheet-cta" onClick={() => { setPick(null); navigate(`${OL}/missao?olheiro=${encodeURIComponent(sc.id)}`); }}>Enviar em missão</button>
                <button type="button" className="text-btn pr-danger-text" onClick={() => setAsk(true)}>Dispensar</button></>}
              <button type="button" className="text-btn" onClick={() => setPick(null)}>Fechar</button>
            </Sheet>
          )}
          {sc && ask && <Confirm id="od" title={`Dispensar ${sc.name}?`} text="O salário dele deixa de ser pago." ok="Dispensar" danger busy={a.busy} onClose={() => { setAsk(false); setPick(null); }}
            onOk={() => a.run(ClubGateway.fireScout(sc.id), async () => { a.setMsg(`${sc.name} dispensado.`); setAsk(false); setPick(null); await onChanged(); reload(); })} />}
        </>);
      }}</Loading>
    </div>
  );
}
export function HireScoutScreen({ career, onChanged }: { career: Career; onChanged: () => Promise<void> | void }) {
  const [data, reload] = useScouting();
  const a = useAct();
  const [ask, setAsk] = useState<null | { id: string; nome: string; salario: number }>(null);
  const hired = new Set((career.scouts || []).map((s) => s.marketId));
  return (
    <div className="wk pr">
      <Head ctx="Olheiros" back={OL} />
      <h1 className="screen-title">Monte sua rede.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Olheiros disponíveis para contratar.</p>
      <Loading data={data}>{() => (
        <section className="wk-sec">
          {(data as Scouting).catalogo.map((c) => (
            <div key={c.id} className="cl-scout">
              <div className="row-body"><span className="row-title">{c.nome}</span><span className="row-sub">{c.especialidade} · Avaliação {c.avaliacao}/5 · Rede {c.rede}/5</span><span className="row-sub">{moneyShort(c.salario)} por mês</span></div>
              {hired.has(c.id) ? <span className="row-sub pr-val">Contratado</span>
                : <button type="button" className="state-btn" onClick={() => setAsk({ id: c.id, nome: c.nome, salario: c.salario })}>Contratar</button>}
            </div>
          ))}
        </section>
      )}</Loading>
      <Foot back={OL} label="Voltar aos olheiros"><Status msg={a.msg} err={a.err} /></Foot>
      {ask && <Confirm id="oh" title={`Contratar ${ask.nome}?`} text={`Salário de ${moneyShort(ask.salario)} por mês.`} ok="Contratar" busy={a.busy} onClose={() => setAsk(null)}
        onOk={() => a.run(ClubGateway.hireScout(ask.id), async () => { a.setMsg(`${ask.nome} contratado.`); setAsk(null); await onChanged(); reload(); })} />}
    </div>
  );
}
export function MissionScreen({ career, type, scoutId, onChanged }: { career: Career; type: string | null; scoutId: string | null; onChanged: () => Promise<void> | void }) {
  const [data] = useScouting();
  const a = useAct();
  const idle = (career.scouts || []).filter((s) => !s.mission);
  const [sid, setSid] = useState<string | null>(scoutId && idle.some((s) => s.id === scoutId) ? scoutId : idle.length === 1 ? idle[0].id : null);
  const [t, setT] = useState(type === "pro" ? "pro" : "sub17");
  const [g, setG] = useState<string>("");
  const [d, setD] = useState("media");
  const [region, setRegion] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  if (sent) return (
    <div className="wk pr">
      <Head ctx="Olheiros" back={OL} />
      <h1 className="screen-title">Olheiro em campo.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{sent}</p>
      <div className="cal-foot"><button type="button" className="cta" onClick={() => navigate(OL, { replace: true })}>Voltar aos olheiros</button></div>
    </div>
  );
  return (
    <div className="wk pr">
      <Head ctx="Olheiros" back={OL} />
      <h1 className="screen-title">Planeje a missão.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Escolha o olheiro, o foco e a região.</p>
      <Loading data={data}>{() => {
        const s = data as Scouting;
        if (!idle.length) return <p className="wk-note pr-pad">{(career.scouts || []).length ? "Todos os seus olheiros já estão em missão." : "Contrate um olheiro antes de mandar em missão."}</p>;
        const regions = sid ? (s.permitidas[sid] || []) : [];
        const reg = region && regions.includes(region) ? region : regions.length === 1 ? regions[0] : null;
        const dur = s.duracoes.find((x) => x.id === d)!;
        const scout = idle.find((x) => x.id === sid);
        return (<>
          <section className="wk-sec pr-pad">
            <Seg id="ms-o" label="Olheiro" value={sid || ""} opts={idle.map((x) => [x.id, x.name] as [string, string])} onChange={(v) => { setSid(v); setRegion(null); }} />
            <Seg id="ms-t" label="Tipo" value={t} opts={s.tipos.map((x) => [x.id, x.nome] as [string, string])} onChange={setT} />
            <Seg id="ms-g" label="Posição" value={g} opts={[["", "Qualquer"], ...(["G", "D", "M", "F"] as PlayerGroup[]).map((x) => [x, POSITION[x]] as [string, string])]} onChange={setG} />
            <Seg id="ms-d" label="Duração" value={d} opts={s.duracoes.map((x) => [x.id, `${x.nome} · ${x.rodadas} rod.`] as [string, string])} onChange={setD} />
            {sid && <Seg id="ms-r" label="Região" value={reg || ""} opts={regions.map((r) => [r, REGION_LABEL[r] || r] as [string, string])} onChange={setRegion} />}
            <p className="wk-note">{scout && reg ? `${scout.name} volta em ${dur.rodadas} rodadas com até ${dur.tentativas} ${t === "pro" ? "indicação(ões) para o Mercado" : "jovem(ns) para a base"}. A missão não tem custo além do salário.` : "Escolha o olheiro e a região."}</p>
          </section>
          <div className="cal-foot"><Status err={a.err} />
            <button type="button" className="cta" aria-disabled={a.busy || !scout || !reg || undefined} onClick={() => {
              if (!scout || !reg) return;
              a.run(ClubGateway.mission(scout.id, reg, t, g || null, d), async () => { await onChanged(); setSent(`${scout.name} partiu para o ${REGION_LABEL[reg] || reg} e volta em ${dur.rodadas} rodadas.`); });
            }}>{a.busy ? "Enviando…" : "Enviar olheiro"}</button>
            <button type="button" className="link-back" onClick={() => goBackTo(OL)}>Cancelar</button>
          </div>
        </>);
      }}</Loading>
    </div>
  );
}
export function SuggestionsScreen({ career, onChanged }: { career: Career; onChanged: () => Promise<void> | void }) {
  const loadM = useCallback(() => MarketGateway.info(), []);
  const [mk] = useRead<MarketInfo>(loadM);
  const a = useAct();
  const list = buildSuggestions(career);
  const open = mk && mk !== "erro" ? mk.janela.aberta : true;
  return (
    <div className="wk pr">
      <Head ctx="Olheiros" back={OL} />
      <h1 className="screen-title">Indicações dos olheiros.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Jogadores de outros clubes, pela leitura dos seus olheiros.</p>
      {!open && <p className="mk-window is-closed">Janela de contratações fechada: só dá para propor quando abrir.</p>}
      {list.length ? list.map((s) => (
        <section key={s.id} className="wk-sec" aria-label={s.short}>
          <PlayerRow name={s.short} position={`${s.club} · ${s.meta}`} to={`${BASE}/mercado/alvo?clube=${encodeURIComponent(s.clubId)}&id=${encodeURIComponent(s.playerId)}`} />
          <Rows rows={[{ label: "Potencial estimado", value: s.potential || "—" }, { label: "Valor de mercado", value: s.value }]} />
          {s.report && <p className="wk-note">{s.report}</p>}
          <div className="cl-actions">
            <button type="button" className="state-btn" disabled={a.busy || !open} onClick={() => a.run(ClubGateway.suggestion(s.id, "propor"), async (r) => { await onChanged(); if (r.alvo) navigate(proposalTo(r.alvo)); })}>Propor</button>
            <button type="button" className="state-btn" disabled={a.busy} onClick={() => a.run(ClubGateway.suggestion(s.id, "recusar"), async () => { a.setMsg(`Indicação de ${s.short} recusada.`); await onChanged(); })}>Recusar</button>
          </div>
        </section>
      )) : <p className="wk-note pr-pad">Nenhuma indicação ainda. Mande um olheiro numa missão Profissional para receber indicações com relatório.</p>}
      <Foot back={OL} label="Voltar aos olheiros"><Status msg={a.msg} err={a.err} /></Foot>
    </div>
  );
}
export function ProspectsScreen({ career, id, onChanged }: { career: Career; id: string | null; onChanged: () => Promise<void> | void }) {
  const a = useAct();
  const list = buildProspects(career);
  const p = id ? list.find((x) => x.id === id) : null;
  const [done, setDone] = useState<string | null>(null);
  if (done) return (
    <div className="wk pr">
      <Head ctx="Olheiros" back={`${OL}/relatorios`} />
      <h1 className="screen-title">Bem-vindo à base.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{done}</p>
      <div className="cal-foot"><Link className="cta" to={`${BASE}/base`}>Ver categorias de base</Link><button type="button" className="link-back" onClick={() => navigate(`${OL}/relatorios`, { replace: true })}>Voltar aos relatórios</button></div>
    </div>
  );
  if (p) return (
    <div className="wk pr">
      <Head ctx="Olheiros" back={`${OL}/relatorios`} />
      <h1 className="screen-title">{p.short}.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{p.position} · {p.age} · achado no {p.region}</p>
      <section className="wk-sec"><Rows rows={[{ label: "Overall", value: p.overall }, { label: "Potencial estimado", value: p.potential }, ...p.attrs]} /></section>
      <section className="wk-sec" aria-labelledby="pp-r"><h2 className="kicker-caps" id="pp-r">Relatório de {p.scout}</h2>
        <p className="wk-note">"{p.note}"</p>{p.report && <p className="wk-note">{p.report}</p>}</section>
      <div className="cal-foot"><Status err={a.err} />
        <button type="button" className="cta" aria-disabled={a.busy || undefined} onClick={() => a.run(ClubGateway.recruit(p.id), async () => { await onChanged(); setDone(`${p.name} entrou na categoria de base.`); })}>{a.busy ? "…" : "Trazer para a base"}</button>
        <button type="button" className="link-back" onClick={() => goBackTo(`${OL}/relatorios`)}>Voltar aos relatórios</button>
      </div>
    </div>
  );
  return (
    <div className="wk pr">
      <Head ctx="Olheiros" back={OL} />
      <h1 className="screen-title">Veja os prospectos.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Relatórios das missões de observação.</p>
      {list.length ? (
        <section className="wk-sec" aria-labelledby="pr-l"><h2 className="kicker-caps" id="pr-l">Relatórios das missões</h2>
          {list.map((x) => (
            <div key={x.id} className="cl-prospect">
              <PlayerRow name={x.short} position={`${x.position} · ${x.age} · ${x.region}`} />
              <Rows rows={[{ label: "Overall", value: x.overall }, { label: "Potencial estimado", value: x.potential }]} />
              <NavRow to={`${OL}/prospecto?id=${encodeURIComponent(x.id)}`} title="Ver jogador" />
            </div>
          ))}
        </section>
      ) : <p className="wk-note pr-pad">Nenhum prospecto ainda. Os olheiros em missão Sub-17 ou Sub-20 trazem relatórios quando voltam.</p>}
      <Foot back={OL} label="Voltar aos olheiros" />
    </div>
  );
}

// ---------- Categorias de base (CAP05-T10) ----------
let KEPT_CAT: BaseCat = "sub17";
export function BaseScreen({ career }: { career: Career }) {
  const [cat, setCat] = useState<BaseCat>(KEPT_CAT);
  const counts = baseCounts(career);
  const list = baseList(career, cat);
  return (
    <div className="wk pr">
      <Head ctx="Base" back={OL} />
      <h1 className="screen-title">O futuro está aqui.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Acompanhe os atletas da base.</p>
      <div className="pr-tabs mk-tabs3" role="tablist" aria-label="Categorias">
        {(["sub15", "sub17", "sub20"] as BaseCat[]).map((c) => <button key={c} type="button" role="tab" aria-selected={cat === c} className={`pr-tab${cat === c ? " is-on" : ""}`} onClick={() => { KEPT_CAT = c; setCat(c); }}>{BASE_CAT_LABEL[c]} ({counts[c]})</button>)}
      </div>
      <section className="wk-sec" role="tabpanel">
        {list.length ? list.map((p) => (
          <Link key={p.id} className="row sp-player" to={`${BASE}/elenco/ficha?id=${encodeURIComponent(p.id)}`}>
            <span className="row-body"><span className="row-title">{p.short}</span><span className="row-sub">{p.position} · {p.age} · overall {p.overall}{p.potential != null ? ` · potencial ${p.potential}` : ""}</span></span><IconChevron className="row-chevron" />
          </Link>
        )) : <p className="wk-note">Nenhum atleta nessa categoria ainda.</p>}
        <p className="wk-note">Na ficha de cada atleta: promover ao profissional ou dispensar.</p>
      </section>
      <Foot back={OL} label="Voltar aos olheiros" />
    </div>
  );
}
