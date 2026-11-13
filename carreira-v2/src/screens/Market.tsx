// Fase 8 (plano de independência) — mercado pela v2:
// - /carreira/mercado: Mercado, busca e filtros (CAP05-T01, complemento 33);
// - /carreira/mercado/alvo?clube=&id=: Perfil do alvo (CAP05-T02, 34 col. 1);
// - /carreira/mercado/proposta?clube=&id=: Fazer proposta (CAP05-T03, 34 col. 2);
// - /carreira/mercado/propostas e /negociacao?id=: Minhas propostas (CAP05-N02,
//   35 col. 1) e Negociação (CAP05-T04, 34 col. 3), com Confirmar compra
//   (CAP05-N07, 37 col. 1) e a concorrência (Comparar);
// - /carreira/mercado/vendas e /vendas/propostas?id=: Minhas vendas (CAP05-N05,
//   36 col. 1) e Escolha a melhor oferta (CAP05-N03, 35 col. 2);
// - Colocar à venda (CAP05-N04, 35 col. 3), folha aberta pela ficha;
// - /carreira/mercado/emprestimo?id= (saída) e ?clube=&id= (entrada) (CAP05-N06, 36);
// - /carreira/mercado/historico: Histórico (CAP05-T07, 37 col. 2 e 3);
// - /carreira/mercado/oferta: proposta pendente por um jogador seu (CAP05-T05, 18).
import { useCallback, useEffect, useState } from "react";
import { MarketGateway, newOpId, type LoanPrep, type OfferPreview, type Preview } from "../adapters/market.ts";
import { DIVISION, NO_MARKET_FILTERS, ROLE, ROLES, YEARS, buildHistory, buildNegotiation, buildSales, buildTarget, findTarget, initialOffer, installmentsLabel, loanWage, marketFiltersActive, marketList, wageHint, yearsLabel,
  type HistoryTab, type LoanClause, type LoanDuration, type MarketFilters, type MarketInfo, type Range } from "../domain/market.ts";
import { POSITION } from "../domain/squadplus.ts";
import { moneyShort } from "../domain/home.ts";
import { shortName } from "../domain/lineup.ts";
import type { Career, OfferRole, Player } from "../domain/types.ts";
import { Jersey } from "../ui/components.tsx";
import { Sheet } from "../ui/dialog.tsx";
import { IconCheck, IconChevron } from "../ui/icons.tsx";
import { BASE, Link, goBackTo, navigate } from "../ui/router.tsx";
import { Head, Loading, errText, useRead } from "./Tactics.tsx";
import "./home.css";
import "./calendar.css";
import "./match.css";
import "./week.css";
import "./prep.css";
import "./squadplus.css";
import "./market.css";

const M = `${BASE}/mercado`;
type Row = { label: string; value: string; tone?: "pos" | "neg" };
export function Rows({ rows }: { rows: Row[] }) {
  return <dl className="wk-list">{rows.map((r, i) => <div key={`${r.label}-${i}`} className="wk-item"><dt>{r.label}</dt><dd className={r.tone === "pos" ? "is-pos" : r.tone === "neg" ? "is-neg" : undefined}>{r.value}</dd></div>)}</dl>;
}
export function PlayerRow({ name, position, to }: { name: string; position: string; to?: string }) {
  const inner = <><Jersey value="" size={44} /><span className="row-body"><span className="row-title">{name}</span><span className="row-sub">{position}</span></span>{to && <IconChevron className="row-chevron" />}</>;
  return to ? <Link className="row sp-player" to={to}>{inner}</Link> : <div className="row sp-player">{inner}</div>;
}
export function NavRow({ to, title, sub, value }: { to: string; title: string; sub?: string | null; value?: string | null }) {
  return <Link className="row pr-row" to={to}><span className="row-body"><span className="row-title">{title}</span>{sub && <span className="row-sub">{sub}</span>}</span>{value && <span className="row-sub pr-val">{value}</span>}<IconChevron className="row-chevron" /></Link>;
}
export function Status({ msg, err }: { msg?: string | null; err?: string | null }) {
  return <>
    <p className="sr-only" role="status" aria-live="polite">{msg || ""}</p>
    {msg && <p className="pr-ok" aria-hidden="true">{msg}</p>}
    {err && <p className="inline-error" role="alert">{err}</p>}
  </>;
}
const digits = (s: string) => s.replace(/\D/g, "");
const ALVO = (clubId: string, id: string) => `${M}/alvo?clube=${encodeURIComponent(clubId)}&id=${encodeURIComponent(id)}`;
const msgOf = (r: { motivo?: string; mensagem?: string }) => r.mensagem || errText(r);
function useInfo() {
  const load = useCallback(() => MarketGateway.info(), []);
  return useRead<MarketInfo>(load);
}

// ---------- Mercado (CAP05-T01) ----------
const PAGE = 40;
function FiltersSheet({ f, info, onApply, onClose }: { f: MarketFilters; info: MarketInfo; onApply: (f: MarketFilters) => void; onClose: () => void }) {
  const [d, setD] = useState(f);
  const range = (k: "ovr" | "age" | "val", label: string, money = false) => {
    const r = d[k];
    const put = (side: keyof Range, v: string) => { const n = digits(v); setD({ ...d, [k]: { ...r, [side]: n === "" ? null : Number(n) } }); };
    return (
      <div className="pr-field">
        <span className="pr-label" id={`mf-${k}`}>{label}</span>
        <div className="mk-range" role="group" aria-labelledby={`mf-${k}`}>
          <input className="pr-input" inputMode="numeric" aria-label={`${label}: de`} placeholder={money ? "De R$" : "De"} value={r.min ?? ""} onChange={(e) => put("min", e.target.value)} />
          <span aria-hidden="true">até</span>
          <input className="pr-input" inputMode="numeric" aria-label={`${label}: até`} placeholder={money ? "Até R$" : "Até"} value={r.max ?? ""} onChange={(e) => put("max", e.target.value)} />
        </div>
      </div>
    );
  };
  const clubs = info.clubes.filter((c) => !d.div || c.divisao === d.div).slice().sort((a, b) => a.nome.localeCompare(b.nome));
  const divs = [...new Set(info.clubes.map((c) => c.divisao))].filter((x) => DIVISION[x]);
  return (
    <Sheet labelledBy="mf-t" onDismiss={onClose}>
      <h2 id="mf-t" className="sheet-title">Refine sua busca.</h2>
      <p className="wk-sheet-text">Encontre o perfil que você precisa.</p>
      <div className="sheet-list">
        <div className="pr-field">
          <span className="pr-label" id="mf-pos">Posição</span>
          <div className="pr-seg" role="radiogroup" aria-labelledby="mf-pos">
            {([["todas", "Todas"], ["G", "Goleiro"], ["D", "Defensor"], ["M", "Meio"], ["F", "Atacante"]] as const).map(([v, l]) =>
              <button key={v} type="button" role="radio" aria-checked={d.pos === v} className={`pr-seg-btn${d.pos === v ? " is-on" : ""}`} onClick={() => setD({ ...d, pos: v })}>{l}</button>)}
          </div>
        </div>
        {info.multi && divs.length > 1 && (
          <div className="pr-field">
            <span className="pr-label" id="mf-div">Divisão</span>
            <div className="pr-seg" role="radiogroup" aria-labelledby="mf-div">
              {[["", "Todas"], ...divs.map((x) => [x, DIVISION[x]])].map(([v, l]) =>
                <button key={v} type="button" role="radio" aria-checked={d.div === v} className={`pr-seg-btn${d.div === v ? " is-on" : ""}`} onClick={() => setD({ ...d, div: v, club: "" })}>{l}</button>)}
            </div>
          </div>
        )}
        <div className="pr-field">
          <label className="pr-label" htmlFor="mf-club">Clube</label>
          <select id="mf-club" className="pr-input" value={d.club} onChange={(e) => setD({ ...d, club: e.target.value })}>
            <option value="">Todos os clubes</option>
            {clubs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        {range("ovr", "Faixa de overall")}
        {range("age", "Idade")}
        {range("val", "Valor", true)}
        <div className="pr-field">
          <span className="pr-label" id="mf-sort">Ordenar por</span>
          <div className="pr-seg" role="radiogroup" aria-labelledby="mf-sort">
            {([["valor", "Valor"], ["overall", "Overall"], ["idade", "Idade"]] as const).map(([v, l]) =>
              <button key={v} type="button" role="radio" aria-checked={d.sort === v} className={`pr-seg-btn${d.sort === v ? " is-on" : ""}`} onClick={() => setD({ ...d, sort: v })}>{l}</button>)}
          </div>
        </div>
      </div>
      <button type="button" className="cta" onClick={() => onApply(d)}>Aplicar filtros</button>
      <button type="button" className="text-btn" onClick={() => onApply({ ...NO_MARKET_FILTERS, q: d.q })}>Limpar filtros</button>
    </Sheet>
  );
}
// Filtros valem durante a visita (como os do Elenco), não são gravados.
let KEPT: MarketFilters = NO_MARKET_FILTERS;
// MER-02: ao abrir um jogador e voltar, a lista volta com a mesma
// quantidade carregada e na mesma rolagem (nesta visita ao jogo).
let KEPT_SHOWN = PAGE;
let KEPT_SCROLL = 0;
export function Market({ career }: { career: Career }) {
  const [info] = useInfo();
  const [f, setF] = useState<MarketFilters>(KEPT);
  const [sheet, setSheet] = useState(false);
  const [shown, setShownState] = useState(KEPT_SHOWN);
  const setShown = (n: number) => { KEPT_SHOWN = n; setShownState(n); };
  const set = (x: MarketFilters) => { KEPT = x; setF(x); setShown(PAGE); KEPT_SCROLL = 0; };
  const loaded = !!info && info !== "erro";
  useEffect(() => {
    if (!loaded || !KEPT_SCROLL) return;
    const y = KEPT_SCROLL; KEPT_SCROLL = 0;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }, [loaded]);
  const offers = (career.pendingOffersOut || []).length;
  const sales = (career.pendingListings || []).length;
  return (
    <div className="wk pr">
      <Head ctx="Mercado" back={`${BASE}/clube`} />
      <h1 className="screen-title">Busque seu reforço.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Encontre jogadores no mercado.</p>
      <Loading data={info}>{() => {
        const i = info as MarketInfo;
        const list = marketList(career, i, f);
        const active = marketFiltersActive(f);
        return (<>
          {career.pendingOffer && (
            <section className="wk-sec" aria-labelledby="mk-po"><h2 className="kicker-caps" id="mk-po">Proposta recebida</h2>
              <NavRow to={`${M}/oferta`} title={`${career.pendingOffer.clubName} quer ${shortName(career.pendingOffer.playerName)}`} sub={moneyShort(career.pendingOffer.fee)} />
            </section>
          )}
          <nav className="wk-sec" aria-label="Suas negociações">
            <NavRow to={`${M}/propostas`} title="Minhas propostas" value={offers ? String(offers) : null} />
            <NavRow to={`${M}/vendas`} title="Minhas vendas" value={sales ? String(sales) : null} />
            <NavRow to={`${M}/historico`} title="Histórico de negociações" />
          </nav>
          <div className="sq-tools mk-tools">
            <label className="sr-only" htmlFor="mk-q">Buscar jogador</label>
            <input id="mk-q" className="pr-input sq-search" type="search" placeholder="Buscar jogador ou clube" value={f.q} onChange={(e) => set({ ...f, q: e.target.value })} />
            <button type="button" className="state-btn sq-filter" onClick={() => setSheet(true)} aria-label={`Filtros${active ? `, ${active} ativos` : ""}`}>Filtros{active ? ` (${active})` : ""}</button>
          </div>
          <p className={`mk-window${i.janela.aberta ? "" : " is-closed"}`}>{i.janela.aberta ? i.janela.texto : `${i.janela.texto} · somente leitura`}</p>
          <section className="sq-sec" aria-label="Jogadores">
            <p className="sq-count">{list.length ? `Mostrando ${Math.min(shown, list.length)} de ${list.length} jogador${list.length === 1 ? "" : "es"}.` : "Nenhum jogador encontrado."}</p>
            <ul className="mk-list">
              {list.slice(0, shown).map((r) => (
                <li key={`${r.clubId}-${r.player.id}`}>
                  <Link className="row sp-player" to={ALVO(r.clubId, r.player.id)} onClick={() => { KEPT_SCROLL = window.scrollY; }}>
                    <Jersey value="" size={44} />
                    <span className="row-body"><span className="row-title">{shortName(r.player.name)}</span>
                      <span className="row-sub">{POSITION[r.player.group]} · overall {r.player.overall}{r.player.age != null ? ` · ${r.player.age} anos` : ""}{r.pendingOfferId ? (r.pendingRefused ? " · proposta recusada" : " · proposta enviada") : ""}</span></span>
                    <IconChevron className="row-chevron" />
                  </Link>
                  <dl className="wk-list"><div className="wk-item"><dt>{r.clubName}{r.division && i.multi ? ` · ${r.division}` : ""} · valor de mercado</dt><dd>{r.player.value != null ? moneyShort(r.player.value) : "—"}</dd></div></dl>
                </li>
              ))}
            </ul>
            {shown < list.length && <button type="button" className="state-btn mk-more" onClick={() => setShown(shown + 60)}>Carregar mais</button>}
          </section>
          {sheet && <FiltersSheet f={f} info={i} onClose={() => setSheet(false)} onApply={(x) => { set(x); setSheet(false); }} />}
        </>);
      }}</Loading>
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(`${BASE}/clube`)}>Voltar ao clube</button></div>
    </div>
  );
}

// ---------- Perfil do alvo (CAP05-T02) ----------
export function Target({ career, clubId, id }: { career: Career; clubId: string; id: string }) {
  const [info] = useInfo();
  const [err, setErr] = useState<string | null>(null);
  const p = findTarget(career, clubId, id);
  const club = (career.divisionTeams ? Object.values(career.divisionTeams).flat() : []).find((t) => String(t.id) === clubId);
  useEffect(() => { if (!p) navigate(M, { replace: true }); }, [p]);
  if (!p) return null;
  return (
    <div className="wk pr">
      <Head ctx="Mercado" back={M} />
      <h1 className="screen-title">Conheça seu reforço.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Avalie o jogador antes de negociar.</p>
      <Loading data={info}>{() => {
        const t = buildTarget(career, info as MarketInfo, clubId, p);
        return (<>
          <section className="wk-sec">
            <PlayerRow name={t.short} position={`${t.position}${club ? ` · ${club.name}` : ""}`} />
            <Rows rows={t.facts} />
          </section>
          <section className="wk-sec" aria-labelledby="ta-a"><h2 className="kicker-caps" id="ta-a">Atributos</h2><Rows rows={t.attrs} /></section>
          <nav className="wk-sec" aria-label="Mais">
            {t.loan.ok ? <NavRow to={`${M}/emprestimo?clube=${encodeURIComponent(clubId)}&id=${encodeURIComponent(p.id)}`} title="Pedir empréstimo" />
              : <button type="button" className="row pr-row sp-off" aria-disabled="true" onClick={() => setErr(t.loan.why)}><span className="row-body"><span className="row-title">Pedir empréstimo</span><span className="row-sub">{t.loan.why}</span></span></button>}
            <NavRow to={`${BASE}/elenco/comparar?ext=${encodeURIComponent(`${clubId}:${p.id}`)}`} title="Comparar com meu elenco" />
            <NavRow to={`${BASE}/clube-elenco?id=${encodeURIComponent(clubId)}`} title={`Elenco do ${club ? club.name : "clube"}`} />
          </nav>
          <div className="cal-foot">
            <Status err={err} />
            {!t.propose.ok && <p className="sp-why">{t.propose.why}</p>}
            {t.propose.ok && t.refused && <p className="sp-why">Sua última proposta foi recusada{t.refused.motivo ? `: ${t.refused.motivo}` : "."} Uma nova proposta substitui a anterior.</p>}
            {t.pendingOfferId
              ? <Link className="cta" to={`${M}/negociacao?id=${encodeURIComponent(t.pendingOfferId)}`}>Ver negociação</Link>
              : <button type="button" className="cta" aria-disabled={!t.propose.ok || undefined} onClick={() => { if (t.propose.ok) navigate(`${M}/proposta?clube=${encodeURIComponent(clubId)}&id=${encodeURIComponent(p.id)}`); }}>{t.refused ? "Fazer nova proposta" : "Fazer proposta"}</button>}
            <button type="button" className="link-back" onClick={() => goBackTo(M)}>Voltar ao mercado</button>
          </div>
        </>);
      }}</Loading>
    </div>
  );
}

// ---------- Fazer proposta (CAP05-T03) ----------
function MoneyInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (<>
    <label className="pr-label" htmlFor={id}>{label}</label>
    <input id={id} className="pr-input" inputMode="numeric" value={value} onChange={(e) => onChange(digits(e.target.value))} />
    {value && <p className="mk-hint">{moneyShort(Number(value))}</p>}
  </>);
}
function Installments({ value, options, onChange }: { value: number; options: number[]; onChange: (n: number) => void }) {
  return (
    <div className="pr-field">
      <span className="pr-label" id="pp-n">Parcelamento da taxa</span>
      <div className="pr-seg" role="radiogroup" aria-labelledby="pp-n">
        {options.map((n) => <button key={n} type="button" role="radio" aria-checked={value === n} className={`pr-seg-btn${value === n ? " is-on" : ""}`} onClick={() => onChange(n)}>{n === 1 ? "À vista" : `${n}x`}</button>)}
      </div>
    </div>
  );
}
export function Propose({ career, clubId, id, onChanged }: { career: Career; clubId: string; id: string; onChanged: () => void }) {
  const [info] = useInfo();
  const p = findTarget(career, clubId, id);
  const [value, setValue] = useState<string | null>(null);
  const [n, setN] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<{ id: string; valor: number } | null>(null);
  // FASE1-MER (MER-03/04): o que o atleta recebe — salário, papel e duração.
  const [wage, setWage] = useState<string | null>(null);
  const [role, setRole] = useState<OfferRole>("rotacao");
  const [years, setYears] = useState(3);
  const [pv, setPv] = useState<OfferPreview | null>(null);
  const [opId] = useState(newOpId);
  useEffect(() => { if (!p && !sent) navigate(M, { replace: true }); }, [p, sent]);
  useEffect(() => { if (p && value == null && info && info !== "erro") setValue(String(initialOffer(p, info.desconto))); }, [p, info, value]);
  useEffect(() => { if (p && wage == null) setWage(String(p.wage || 0)); }, [p, wage]);
  useEffect(() => {
    if (!p || sent || !value || !wage) return;
    let live = true;
    MarketGateway.offerPreview(clubId, id, Number(value) || 0, n, Number(wage) || 0).then((r) => { if (live && r.ok) setPv(r); });
    return () => { live = false; };
  }, [clubId, id, value, n, wage, !!p, !!sent]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return null;
  const back = ALVO(clubId, id);
  const send = async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    const r = await MarketGateway.propose(clubId, id, Number(value) || 0, n, { salario: Number(wage) || 0, papel: role, anos: years }, opId);
    setBusy(false);
    if (r.ok) { setSent(r); onChanged(); } else setErr(msgOf(r));
  };
  const hint = pv ? wageHint(Number(wage) || 0, pv.sugerido[role], p.wage) : null;
  if (sent) return (
    <div className="wk pr">
      <Head ctx="Mercado" back={M} />
      <h1 className="screen-title">Proposta enviada.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">O clube responde em algumas rodadas.</p>
      <section className="wk-sec"><PlayerRow name={shortName(p.name)} position={POSITION[p.group]} />
        <Rows rows={[{ label: "Sua proposta", value: moneyShort(sent.valor) }, { label: "Parcelamento", value: installmentsLabel(n) },
          { label: "Salário oferecido", value: `${moneyShort(Number(wage) || 0)}/mês` }, { label: "Papel prometido", value: ROLE[role] }, { label: "Contrato", value: yearsLabel(years) }]} />
        <p className="wk-note">{info && info !== "erro" ? `A resposta chega em ${info.esperaRodadas} rodadas. ` : ""}O clube decide o valor; o jogador decide o salário, o papel e a duração. Acompanhe em Minhas propostas.</p>
      </section>
      <div className="cal-foot">
        <Link className="cta" to={`${M}/negociacao?id=${encodeURIComponent(sent.id)}`}>Ver negociação</Link>
        <button type="button" className="link-back" onClick={() => navigate(M, { replace: true })}>Voltar ao mercado</button>
      </div>
    </div>
  );
  return (
    <div className="wk pr">
      <Head ctx="Mercado" back={back} />
      <h1 className="screen-title">Faça sua oferta.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Negocie com o clube e com o jogador.</p>
      <Loading data={info}>{() => (<>
        <section className="wk-sec">
          <PlayerRow name={shortName(p.name)} position={POSITION[p.group]} />
          <Rows rows={[{ label: "Valor de mercado", value: p.value != null ? moneyShort(p.value) : "—" }, { label: "Salário mensal", value: p.wage != null ? moneyShort(p.wage) : "—" }]} />
        </section>
        <section className="wk-sec pr-pad">
          <MoneyInput id="pp-v" label="Sua proposta (R$)" value={value || ""} onChange={setValue} />
          {(info as MarketInfo).desconto > 0 && <p className="mk-hint">Desconto de contratação de {(info as MarketInfo).desconto}% aplicado ao valor sugerido.</p>}
          <Installments value={n} options={(info as MarketInfo).parcelas} onChange={setN} />
          <p className="wk-note">Propor menos que o valor de mercado é possível, mas o clube pode recusar, pedir mais ou demorar para responder.</p>
        </section>
        <section className="wk-sec pr-pad" aria-labelledby="pp-at"><h2 className="kicker-caps" id="pp-at">Para o jogador</h2>
          <MoneyInput id="pp-s" label="Salário mensal oferecido (R$)" value={wage || ""} onChange={setWage} />
          <Seg id="pp-r" label="Papel prometido" value={role} opts={ROLES.map((r) => [r, ROLE[r]] as [OfferRole, string])} onChange={setRole} />
          {hint && <p className={`mk-hint${hint.tone === "neg" ? " is-neg" : ""}`}>{hint.text}</p>}
          <Seg id="pp-y" label="Duração do contrato" value={years} opts={YEARS.map((y) => [y, `${y}`] as [number, string])} onChange={setYears} />
          <p className="wk-note">{role === "titular" ? "Prometer titularidade convence mais, mas ele cobra: no banco, a moral cai mais rápido nesta temporada." : role === "rotacao" ? "Prometer rotação: fora da lista de jogo, a moral cai mais nesta temporada." : "Sem promessa de jogar: ele tende a pedir mais salário."}</p>
        </section>
        {pv && (
          <section className="wk-sec mk-impact" aria-labelledby="pp-im"><h2 className="kicker-caps" id="pp-im">Antes de enviar</h2>
            <Rows rows={[
              { label: "Pago no fechamento", value: pv.parcelas > 1 ? `${moneyShort(pv.primeira)} (1ª de ${pv.parcelas})` : moneyShort(pv.primeira) },
              { label: "Salário assumido", value: `${moneyShort(pv.salario)}/mês${pv.salarioAtual ? ` (hoje ${moneyShort(pv.salarioAtual)})` : ""}` },
              { label: "Caixa", value: `${moneyShort(pv.caixaAntes)} → ${moneyShort(pv.caixaDepois)}`, tone: pv.caixaDepois < 0 ? "neg" : undefined },
              { label: "Folha salarial mensal", value: `${moneyShort(pv.folhaAntes)} → ${moneyShort(pv.folhaDepois)}`, tone: pv.teto != null && pv.folhaDepois > pv.teto ? "neg" : undefined },
              ...(pv.teto != null ? [{ label: "Teto da folha", value: moneyShort(pv.teto) }] : []),
            ]} />
          </section>
        )}
      </>)}</Loading>
      <div className="cal-foot">
        <Status err={err} />
        <button type="button" className="cta" aria-disabled={busy || !value || !Number(wage) || undefined} onClick={() => { if (value && Number(wage)) send(); }}>{busy ? "Enviando…" : "Enviar proposta"}</button>
        <button type="button" className="link-back" disabled={busy} onClick={() => goBackTo(back)}>Cancelar</button>
      </div>
    </div>
  );
}

// ---------- Minhas propostas (CAP05-N02) ----------
export function MyOffers({ career }: { career: Career }) {
  const list = career.pendingOffersOut || [];
  return (
    <div className="wk pr">
      <Head ctx="Mercado" back={M} />
      <h1 className="screen-title">Suas negociações.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Acompanhe cada proposta enviada.</p>
      <section className="wk-sec">
        {list.length ? list.map((o) => {
          const n = buildNegotiation(o);
          return (
            <Link key={o.id} className="row pr-row" to={`${M}/negociacao?id=${encodeURIComponent(o.id)}`}>
              <span className="row-body"><span className="row-title">{n.short}</span><span className="row-sub">{n.club} · {n.mine.value}</span></span>
              <span className={`row-sub pr-val mk-st${n.status.tone ? ` is-${n.status.tone}` : ""}`}>{n.status.text}</span><IconChevron className="row-chevron" />
            </Link>
          );
        }) : <p className="wk-note">Nenhuma proposta em andamento. Propostas aceitas, recusadas ou retiradas ficam no histórico.</p>}
      </section>
      <nav className="wk-sec" aria-label="Mais"><NavRow to={`${M}/historico`} title="Histórico de negociações" /></nav>
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(M)}>Voltar ao mercado</button></div>
    </div>
  );
}

// ---------- Negociação (CAP05-T04) + Confirmar compra (CAP05-N07) ----------
function ImpactRows({ pv, buy }: { pv: Preview; buy: boolean }) {
  return <Rows rows={[
    { label: buy ? "Valor da transferência" : "Valor da venda", value: moneyShort(pv.valor) },
    { label: "Parcelas", value: pv.parcelas > 1 ? `${pv.parcelas}x de ${moneyShort(pv.porParcela)}` : "À vista" },
    { label: buy ? "Pago agora" : "Recebido agora", value: moneyShort(pv.primeira) },
  ]} />;
}
function ImpactClub({ pv }: { pv: Preview }) {
  return (
    <section className="wk-sec mk-impact" aria-labelledby="ic-t"><h2 className="kicker-caps" id="ic-t">Impacto no clube</h2>
      <Rows rows={[
        { label: "Caixa", value: `${moneyShort(pv.caixaAntes)} → ${moneyShort(pv.caixaDepois)}`, tone: pv.caixaDepois < 0 ? "neg" : undefined },
        { label: "Folha salarial mensal", value: `${moneyShort(pv.folhaAntes)} → ${moneyShort(pv.folhaDepois)}`, tone: pv.teto != null && pv.folhaDepois > pv.teto ? "neg" : undefined },
      ]} />
    </section>
  );
}
function RaiseSheet({ min, suggested, onClose, onSend }: { min: number; suggested: number; onClose: () => void; onSend: (v: number) => Promise<string | null> }) {
  const [v, setV] = useState(String(suggested));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    const n = Number(v) || 0;
    if (n < min) { setErr(`A nova proposta precisa ser de pelo menos ${moneyShort(min)}.`); return; }
    setBusy(true); setErr(null);
    const e = await onSend(n);
    setBusy(false);
    if (e) setErr(e);
  };
  return (
    <Sheet labelledBy="rs-t" onDismiss={busy ? undefined : onClose}>
      <h2 id="rs-t" className="sheet-title">Aumente sua proposta.</h2>
      <span className="tb-bar pr-sheet-bar" aria-hidden="true" />
      <p className="wk-sheet-text">O clube volta a analisar a proposta nova.</p>
      <MoneyInput id="rs-v" label="Nova proposta (R$)" value={v} onChange={setV} />
      {err && <p className="inline-error" role="alert">{err}</p>}
      <button type="button" className="cta sp-sheet-cta" aria-disabled={busy || undefined} onClick={go}>{busy ? "Enviando…" : "Enviar proposta"}</button>
      <button type="button" className="text-btn" disabled={busy} onClick={onClose}>Cancelar</button>
    </Sheet>
  );
}
export function Negotiation({ career, id, onChanged }: { career: Career; id: string; onChanged: () => Promise<void> | void }) {
  const o = (career.pendingOffersOut || []).find((x) => x.id === id) || null;
  const [raise, setRaise] = useState(false);
  const [confirm, setConfirm] = useState<Preview | null>(null);
  const [quit, setQuit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ ok: boolean; text: string; name: string } | null>(null);
  const [opId, setOpId] = useState(newOpId);
  useEffect(() => { if (!o && !done) navigate(`${M}/propostas`, { replace: true }); }, [o, done]);
  if (done) return (
    <div className="wk pr">
      <Head ctx="Mercado" back={M} />
      <h1 className="screen-title">{done.ok ? "Reforço contratado." : "Negócio desfeito."}</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{done.text}</p>
      <div className="cal-foot">
        {done.ok && <Link className="cta" to={`${BASE}/elenco`}>Ver elenco</Link>}
        <button type="button" className="link-back" onClick={() => navigate(M, { replace: true })}>Voltar ao mercado</button>
      </div>
    </div>
  );
  if (!o) return null;
  const n = buildNegotiation(o);
  const target = findTarget(career, o.clubId, o.playerId);
  const openConfirm = async () => {
    setBusy(true); setErr(null);
    const r = await MarketGateway.buyPreview(o.id);
    setBusy(false);
    if (r.ok) setConfirm(r); else setErr(msgOf(r));
  };
  const accept = async () => {
    setBusy(true); setErr(null);
    const r = await MarketGateway.acceptCounter(o.id, opId);
    setBusy(false); setConfirm(null);
    if (!r.ok) { setErr(msgOf(r)); return; }
    setOpId(newOpId());
    await onChanged();
    // O clube aceitou; o jogador pediu mais salário ou recusou: a proposta
    // fica na lista com o motivo e a próxima ação.
    if (!r.comprado && r.atleta) { setMsg(r.mensagem); return; }
    if (r.comprado && r.coletiva) { navigate(`${BASE}/coletiva?volta=${encodeURIComponent(`${BASE}/elenco`)}`, { replace: true }); return; }
    setDone(r.comprado ? { ok: true, name: n.short, text: `${n.short} chegou do ${n.club}. A compra entrou no caixa e no histórico.` } : { ok: false, name: n.short, text: r.mensagem || "A compra não pôde ser concluída." });
  };
  const acceptWage = async () => {
    setBusy(true); setErr(null);
    const r = await MarketGateway.acceptWage(o.id, opId);
    setBusy(false); setConfirm(null);
    if (!r.ok) { setErr(msgOf(r)); return; }
    setOpId(newOpId());
    await onChanged();
    if (r.comprado && r.coletiva) { navigate(`${BASE}/coletiva?volta=${encodeURIComponent(`${BASE}/elenco`)}`, { replace: true }); return; }
    if (!r.comprado && r.mensagem && !/não está mais/.test(r.mensagem)) { setMsg(r.mensagem); return; }
    setDone(r.comprado ? { ok: true, name: n.short, text: `${n.short} chegou do ${n.club}. A compra entrou no caixa e no histórico.` } : { ok: false, name: n.short, text: r.mensagem || "A compra não pôde ser concluída." });
  };
  const withdraw = async () => {
    setBusy(true); setErr(null);
    const r = await (n.open ? MarketGateway.withdraw(o.id) : MarketGateway.dismiss(o.id));
    setBusy(false); setQuit(false);
    if (!r.ok) { setErr(msgOf(r)); return; }
    await onChanged();
    navigate(`${M}/propostas`, { replace: true });
  };
  return (
    <div className="wk pr">
      <Head ctx="Mercado" back={`${M}/propostas`} />
      <h1 className="screen-title">A negociação continua.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Compare os valores e decida.</p>
      <section className="wk-sec">
        <PlayerRow name={n.short} position={`${target ? POSITION[target.group] : ""}${target ? " · " : ""}${n.club}`} to={target ? ALVO(o.clubId, o.playerId) : undefined} />
      </section>
      <section className="wk-sec" aria-labelledby="ng-m"><h2 className="kicker-caps" id="ng-m">Sua proposta</h2>
        <p className="mk-big">{n.mine.value}</p>
        <Rows rows={[{ label: "Parcelamento", value: n.mine.installments }, { label: "Valor de mercado", value: n.market }, { label: "Situação", value: n.status.text }]} />
        {n.wait && <p className="wk-note">{n.wait}</p>}
      </section>
      {n.terms && (
        <section className="wk-sec" aria-labelledby="ng-t"><h2 className="kicker-caps" id="ng-t">Para o jogador</h2><Rows rows={n.terms} /></section>
      )}
      {n.counter && (
        <section className="wk-sec" aria-labelledby="ng-c"><h2 className="kicker-caps" id="ng-c">Contraproposta do clube</h2>
          <p className="mk-big">{n.counter}</p>
          {n.reason && <p className="wk-note">{n.reason}</p>}
        </section>
      )}
      {!n.counter && n.reason && (
        <section className="wk-sec" aria-labelledby="ng-why"><h2 className="kicker-caps" id="ng-why">{n.refused ? "Por que recusou" : "O que ele pede"}</h2>
          {n.askedWage && <p className="mk-big">{n.askedWage}/mês</p>}
          <p className="wk-note">{n.reason}</p>
        </section>
      )}
      {n.rival && (
        <section className="wk-sec" aria-labelledby="ng-r"><h2 className="kicker-caps" id="ng-r">Proposta concorrente</h2>
          <Rows rows={[{ label: n.rival.club, value: `${n.rival.value} · ${n.rival.installments}` }]} />
          {n.analysis && <p className="wk-note">{n.analysis}</p>}
        </section>
      )}
      <nav className="wk-sec" aria-label="Ações">
        {n.open && <button type="button" className="row pr-row" disabled={busy} onClick={() => setRaise(true)}><span className="row-body"><span className="row-title">Aumentar proposta</span></span><IconChevron className="row-chevron" /></button>}
        {!n.open && target && <NavRow to={`${M}/proposta?clube=${encodeURIComponent(o.clubId)}&id=${encodeURIComponent(o.playerId)}`} title="Fazer nova proposta" sub={n.refused ? "Mude o valor, o salário, o papel ou a duração" : "Ofereça outro salário, papel ou duração"} />}
        <NavRow to={M} title="Voltar ao mercado" />
      </nav>
      <div className="cal-foot">
        <Status msg={msg} err={err} />
        {n.counter && <button type="button" className="cta" aria-disabled={busy || undefined} onClick={() => { if (!busy) openConfirm(); }}>Aceitar contraproposta</button>}
        {n.askedWage && <button type="button" className="cta" aria-disabled={busy || undefined} onClick={() => { if (!busy) acceptWage(); }}>{busy ? "Concluindo…" : `Aceitar salário pedido (${n.askedWage})`}</button>}
        <button type="button" className="link-back" disabled={busy} onClick={() => setQuit(true)}>{n.open ? "Desistir" : "Dispensar"}</button>
      </div>
      {raise && <RaiseSheet min={n.minRaise} suggested={n.suggestedRaise} onClose={() => setRaise(false)} onSend={async (v) => {
        const r = await MarketGateway.raise(o.id, v);
        if (!r.ok) return msgOf(r);
        setRaise(false); setMsg(`Proposta atualizada para ${moneyShort(v)}.`); await onChanged(); return null;
      }} />}
      {confirm && (
        <Sheet labelledBy="cc-t" onDismiss={busy ? undefined : () => setConfirm(null)}>
          <h2 id="cc-t" className="sheet-title">Confirme seu reforço.</h2>
          <span className="tb-bar pr-sheet-bar" aria-hidden="true" />
          <p className="wk-sheet-text">Revise o impacto antes de concluir.</p>
          <PlayerRow name={n.short} position={target ? POSITION[target.group] : n.club} />
          <ImpactRows pv={confirm} buy />
          <ImpactClub pv={confirm} />
          <button type="button" className="cta sp-sheet-cta" aria-disabled={busy || undefined} onClick={() => { if (!busy) accept(); }}>{busy ? "Concluindo…" : "Confirmar"}</button>
          <button type="button" className="text-btn" disabled={busy} onClick={() => setConfirm(null)}>Cancelar</button>
        </Sheet>
      )}
      {quit && (
        <Sheet alert labelledBy="qt-t" describedBy="qt-d" onDismiss={busy ? undefined : () => setQuit(false)}>
          <h2 id="qt-t" className="sheet-title">{n.open ? "Desistir?" : "Dispensar?"}</h2>
          <p id="qt-d" className="wk-sheet-text">{n.open ? `Sua proposta por ${n.short} será retirada.` : `A proposta por ${n.short} sai da lista.`}</p>
          <button type="button" className="cta" data-autofocus onClick={() => setQuit(false)}>Continuar negociando</button>
          <button type="button" className="text-btn pr-danger-text" disabled={busy} onClick={withdraw}>{busy ? "…" : n.open ? "Desistir" : "Dispensar"}</button>
        </Sheet>
      )}
    </div>
  );
}

// ---------- Minhas vendas (CAP05-N05) ----------
export function MySales({ career, onChanged }: { career: Career; onChanged: () => Promise<void> | void }) {
  const list = buildSales(career);
  const [ask, setAsk] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const unlist = async () => {
    if (!ask) return;
    setBusy(true); setErr(null);
    const r = await MarketGateway.unlist(ask.id);
    setBusy(false);
    if (!r.ok) { setErr(msgOf(r)); setAsk(null); return; }
    setMsg(`${ask.name} não está mais à venda.`); setAsk(null); await onChanged();
  };
  return (
    <div className="wk pr">
      <Head ctx="Mercado" back={M} />
      <h1 className="screen-title">Jogadores no mercado.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Gerencie anúncios e ofertas recebidas.</p>
      {list.length ? list.map((l) => (
        <section key={l.id} className="wk-sec" aria-label={l.short}>
          <PlayerRow name={l.short} position={l.position} to={`${BASE}/elenco/ficha?id=${encodeURIComponent(l.playerId)}`} />
          <Rows rows={[{ label: "Valor pedido", value: l.asking }, { label: "Valor de mercado", value: l.market }]} />
          {l.offers.length
            ? <NavRow to={`${M}/vendas/propostas?id=${encodeURIComponent(l.id)}`} title="Propostas recebidas" value={`${l.offers.length} · Ver`} />
            : <p className="wk-note">Nenhuma proposta ainda: aguardando interessados.</p>}
          <button type="button" className="row pr-row" disabled={busy} onClick={() => setAsk({ id: l.id, name: l.short })}><span className="row-body"><span className="row-title">Retirar do mercado</span></span><IconChevron className="row-chevron" /></button>
        </section>
      )) : <p className="wk-note pr-pad">Nenhum jogador à venda. Para anunciar, abra a ficha do jogador e escolha "Colocar à venda". Vender é possível mesmo com a janela fechada.</p>}
      <div className="cal-foot">
        <Status msg={msg} err={err} />
        <button type="button" className="link-back" onClick={() => goBackTo(M)}>Voltar ao mercado</button>
      </div>
      {ask && (
        <Sheet alert labelledBy="ul-t" describedBy="ul-d" onDismiss={busy ? undefined : () => setAsk(null)}>
          <h2 id="ul-t" className="sheet-title">Retirar do mercado?</h2>
          <p id="ul-d" className="wk-sheet-text">{ask.name} deixa de estar à venda, e as propostas recebidas são descartadas.</p>
          <button type="button" className="cta" data-autofocus onClick={() => setAsk(null)}>Manter à venda</button>
          <button type="button" className="text-btn pr-danger-text" disabled={busy} onClick={unlist}>{busy ? "…" : "Retirar do mercado"}</button>
        </Sheet>
      )}
    </div>
  );
}

// ---------- Escolha a melhor oferta (CAP05-N03) ----------
export function SaleOffers({ career, id, onChanged }: { career: Career; id: string; onChanged: () => Promise<void> | void }) {
  const l = buildSales(career).find((x) => x.id === id) || null;
  const [pick, setPick] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Preview | null>(null);
  const [rejectAll, setRejectAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sold, setSold] = useState<string | null>(null);
  const [saleOp] = useState(newOpId);
  useEffect(() => { if (!sold && (!l || !l.offers.length)) navigate(`${M}/vendas`, { replace: true }); }, [l, sold]);
  if (sold) return (
    <div className="wk pr">
      <Head ctx="Mercado" back={`${M}/vendas`} />
      <h1 className="screen-title">Venda concluída.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{sold}</p>
      <div className="cal-foot"><button type="button" className="cta" onClick={() => navigate(`${M}/vendas`, { replace: true })}>Voltar às vendas</button></div>
    </div>
  );
  if (!l || !l.offers.length) return null;
  const chosen = l.offers.find((o) => o.id === pick) || null;
  const openConfirm = async () => {
    if (!chosen) { setErr("Escolha uma proposta."); return; }
    setBusy(true); setErr(null);
    const r = await MarketGateway.salePreview(l.id, chosen.id);
    setBusy(false);
    if (r.ok) setConfirm(r); else setErr(msgOf(r));
  };
  const accept = async () => {
    if (!chosen) return;
    setBusy(true); setErr(null);
    const r = await MarketGateway.acceptSale(l.id, chosen.id, saleOp);
    setBusy(false); setConfirm(null);
    if (!r.ok) { setErr(msgOf(r)); return; }
    await onChanged();
    if (!r.vendido) { setErr(r.mensagem || "A venda não pôde ser concluída."); return; }
    if (r.coletiva) { navigate(`${BASE}/coletiva?volta=${encodeURIComponent(`${M}/vendas`)}`, { replace: true }); return; }
    setSold(`${l.short} foi vendido ao ${chosen.club} por ${chosen.value}.`);
  };
  const reject = async (offerId: string | null) => {
    setBusy(true); setErr(null);
    const r = await MarketGateway.rejectSale(l.id, offerId);
    setBusy(false); setRejectAll(false);
    if (!r.ok) { setErr(msgOf(r)); return; }
    setPick(null); setMsg(offerId ? "Proposta recusada. O anúncio continua." : "Propostas recusadas. O anúncio continua."); await onChanged();
  };
  return (
    <div className="wk pr">
      <Head ctx="Mercado" back={`${M}/vendas`} />
      <h1 className="screen-title">Escolha a melhor oferta.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Propostas pelo mesmo jogador.</p>
      <section className="wk-sec">
        <PlayerRow name={l.short} position={`${l.position} · pedido ${l.asking}`} />
        <div className="mk-offers" role="radiogroup" aria-label="Propostas">
          {l.offers.map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={pick === o.id} className={`row pr-check mk-offer${pick === o.id ? " is-on" : ""}`} onClick={() => setPick(o.id)}>
              <span className="pr-box" aria-hidden="true">{pick === o.id && <IconCheck />}</span>
              <span className="row-body"><span className="row-title">{o.club}</span><span className="row-sub">Valor {o.value} · {o.installments}</span></span>
            </button>
          ))}
        </div>
        {chosen && <button type="button" className="text-btn mk-reject" disabled={busy} onClick={() => reject(chosen.id)}>Recusar só a do {chosen.club}</button>}
      </section>
      <div className="cal-foot">
        <Status msg={msg} err={err} />
        <button type="button" className="cta" aria-disabled={busy || !chosen || undefined} onClick={() => { if (!busy) openConfirm(); }}>Escolher proposta</button>
        <button type="button" className="link-back" disabled={busy} onClick={() => setRejectAll(true)}>Recusar todas</button>
      </div>
      {confirm && chosen && (
        <Sheet labelledBy="cv-t" onDismiss={busy ? undefined : () => setConfirm(null)}>
          <h2 id="cv-t" className="sheet-title">Confirme a venda.</h2>
          <span className="tb-bar pr-sheet-bar" aria-hidden="true" />
          <p className="wk-sheet-text">{l.short} vai para o {chosen.club}.</p>
          <ImpactRows pv={confirm} buy={false} />
          <ImpactClub pv={confirm} />
          <button type="button" className="cta sp-sheet-cta" aria-disabled={busy || undefined} onClick={() => { if (!busy) accept(); }}>{busy ? "Concluindo…" : "Confirmar"}</button>
          <button type="button" className="text-btn" disabled={busy} onClick={() => setConfirm(null)}>Cancelar</button>
        </Sheet>
      )}
      {rejectAll && (
        <Sheet alert labelledBy="ra-t" describedBy="ra-d" onDismiss={busy ? undefined : () => setRejectAll(false)}>
          <h2 id="ra-t" className="sheet-title">Recusar todas?</h2>
          <p id="ra-d" className="wk-sheet-text">As {l.offers.length} propostas por {l.short} serão recusadas. O anúncio continua ativo.</p>
          <button type="button" className="cta" data-autofocus onClick={() => setRejectAll(false)}>Cancelar</button>
          <button type="button" className="text-btn pr-danger-text" disabled={busy} onClick={() => reject(null)}>{busy ? "…" : "Recusar todas"}</button>
        </Sheet>
      )}
    </div>
  );
}

// ---------- Colocar à venda (CAP05-N04): folha aberta pela ficha ----------
export function ListSheet({ player, onClose, onDone }: { player: Player; onClose: () => void; onDone: (msg: string) => void }) {
  const [v, setV] = useState(String(player.value || 0));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setErr(null);
    const r = await MarketGateway.list(player.id, Number(v) || 0);
    setBusy(false);
    if (r.ok) onDone(`${shortName(player.name)} à venda por ${moneyShort(r.valor)}. Acompanhe em Minhas vendas.`); else setErr(msgOf(r));
  };
  return (
    <Sheet labelledBy="ls-t" onDismiss={busy ? undefined : onClose}>
      <h2 id="ls-t" className="sheet-title">Abra as negociações.</h2>
      <span className="tb-bar pr-sheet-bar" aria-hidden="true" />
      <p className="wk-sheet-text">Defina o valor pedido pelo jogador.</p>
      <PlayerRow name={shortName(player.name)} position={POSITION[player.group]} />
      <Rows rows={[{ label: "Valor de mercado", value: player.value != null ? moneyShort(player.value) : "—" }]} />
      <MoneyInput id="ls-v" label="Valor pedido (R$)" value={v} onChange={setV} />
      <p className="mk-hint">Pedir acima do valor de mercado é possível, mas atrai menos interessados.</p>
      {err && <p className="inline-error" role="alert">{err}</p>}
      <button type="button" className="cta sp-sheet-cta" aria-disabled={busy || undefined} onClick={() => { if (!busy) go(); }}>{busy ? "Anunciando…" : "Anunciar"}</button>
      <button type="button" className="text-btn" disabled={busy} onClick={onClose}>Cancelar</button>
    </Sheet>
  );
}

// ---------- Empréstimo (CAP05-N06): entrada (clube=) ou saída ----------
export function Seg<T extends string | number>({ id, label, value, opts, onChange }: { id: string; label: string; value: T; opts: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="pr-field">
      <span className="pr-label" id={id}>{label}</span>
      <div className="pr-seg" role="radiogroup" aria-labelledby={id}>
        {opts.map(([v, l]) => <button key={String(v)} type="button" role="radio" aria-checked={value === v} className={`pr-seg-btn${value === v ? " is-on" : ""}`} onClick={() => onChange(v)}>{l}</button>)}
      </div>
    </div>
  );
}
export function Loan({ career, clubId, id, onChanged }: { career: Career; clubId: string | null; id: string; onChanged: () => Promise<void> | void }) {
  const incoming = !!clubId;
  const p = incoming ? findTarget(career, clubId!, id) : (career.squad || []).find((x) => x.id === id) || null;
  const [prep, setPrep] = useState<LoanPrep | null>(null);
  const [prepErr, setPrepErr] = useState<string | null>(null);
  const [dur, setDur] = useState<LoanDuration>("temporada");
  const [pct, setPct] = useState(50);
  const [clause, setClause] = useState<LoanClause>("nenhuma");
  const [cv, setCv] = useState(String(p?.value || 0));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [askPct, setAskPct] = useState<number | null>(null);
  const [loanOp] = useState(newOpId);
  const back = incoming ? ALVO(clubId!, id) : `${BASE}/elenco/ficha?id=${encodeURIComponent(id)}&tela=numeros`;
  useEffect(() => { if (!p && !done) navigate(incoming ? M : `${BASE}/elenco`, { replace: true }); }, [p, done, incoming]);
  // Saída: o clube interessado é sorteado ao abrir, como no jogo.
  useEffect(() => {
    if (incoming || !p) return;
    let live = true;
    MarketGateway.prepareLoanOut(id).then((r) => { if (!live) return; if (r.ok) setPrep(r); else setPrepErr(msgOf(r)); });
    return () => { live = false; };
  }, [incoming, id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (done) return (
    <div className="wk pr">
      <Head ctx="Empréstimo" back={incoming ? M : `${BASE}/elenco`} />
      <h1 className="screen-title">Empréstimo fechado.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{done}</p>
      <div className="cal-foot"><button type="button" className="cta" onClick={() => navigate(incoming ? `${BASE}/elenco` : M, { replace: true })}>{incoming ? "Ver elenco" : "Ir ao mercado"}</button></div>
    </div>
  );
  if (!p) return null;
  const club = incoming ? (career.divisionTeams ? Object.values(career.divisionTeams).flat() : []).find((t) => String(t.id) === clubId) : null;
  const send = async (pctNow = pct) => {
    if (busy) return;
    setBusy(true); setErr(null); setAskPct(null);
    const value = clause === "nenhuma" ? 0 : Number(cv) || 0;
    const r = incoming ? await MarketGateway.loanIn(clubId!, id, dur, pctNow, clause, value, loanOp) : await MarketGateway.loanOut(id, dur, clause, value, loanOp);
    setBusy(false);
    if (!r.ok) {
      // FASE1-MER (MER-05): o clube de origem pede um percentual maior.
      const pedido = (r as { pctPedido?: number }).pctPedido;
      if (r.motivo === "contra" && pedido) { setAskPct(pedido); setErr(msgOf(r)); return; }
      setErr(msgOf(r)); return;
    }
    await onChanged();
    const when = dur === "meia" ? "por 6 meses" : "até o fim da temporada";
    setDone(incoming ? `${shortName(p.name)} chega emprestado do ${club ? club.name : "clube"} ${when}, com ${pct}% do salário pago por você.`
      : `${shortName(p.name)} vai emprestado para o ${prep!.clube.nome} ${when}. Você recebe ${moneyShort(dur === "meia" ? prep!.taxaMeia : prep!.taxaTemporada)}.`);
  };
  const blocked = !incoming && !prep;
  return (
    <div className="wk pr">
      <Head ctx="Empréstimo" back={back} />
      <h1 className="screen-title">Combine o empréstimo.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Condições para {incoming ? "entrada" : "saída"} do jogador.</p>
      <section className="wk-sec">
        <PlayerRow name={shortName(p.name)} position={POSITION[p.group]} />
        {incoming
          ? <Rows rows={[{ label: "Clube", value: club ? club.name : "—" }, { label: "Salário cheio", value: p.wage != null ? moneyShort(p.wage) : "—" }]} />
          : prep ? <Rows rows={[{ label: "Clube interessado", value: prep.clube.nome }, { label: "Taxa que você recebe", value: moneyShort(dur === "meia" ? prep.taxaMeia : prep.taxaTemporada) }]} />
            : <p className={prepErr ? "inline-error" : "wk-note"} role={prepErr ? "alert" : "status"}>{prepErr || "Procurando um clube interessado…"}</p>}
      </section>
      {!blocked && (
        <section className="wk-sec pr-pad">
          <Seg id="ln-d" label="Duração do empréstimo" value={dur} opts={[["temporada", "Temporada inteira"], ["meia", "6 meses"]]} onChange={setDur} />
          {incoming && <>
            <Seg id="ln-p" label="Percentual do salário que você paga" value={pct} opts={[[50, "50%"], [75, "75%"], [100, "100%"]]} onChange={setPct} />
            <p className="mk-hint">Você paga {moneyShort(loanWage(p.wage || 0, pct))} por mês.</p>
          </>}
          <Seg id="ln-c" label="Cláusula de compra ao fim do empréstimo" value={clause} opts={[["nenhuma", "Nenhuma"], ["opcional", "Opcional"], ["obrigatoria", "Obrigatória"]]} onChange={setClause} />
          {clause !== "nenhuma" && <MoneyInput id="ln-v" label="Valor da cláusula (R$)" value={cv} onChange={setCv} />}
        </section>
      )}
      <div className="cal-foot">
        <Status err={err} />
        {askPct != null && <button type="button" className="cta" aria-disabled={busy || undefined} onClick={() => { setPct(askPct); send(askPct); }}>{busy ? "Enviando…" : `Aceitar ${askPct}% do salário`}</button>}
        <button type="button" className={askPct != null ? "state-btn" : "cta"} aria-disabled={busy || blocked || undefined} onClick={() => { if (!blocked) send(); }}>{busy ? "Enviando…" : "Propor empréstimo"}</button>
        <button type="button" className="link-back" disabled={busy} onClick={() => goBackTo(back)}>Cancelar</button>
      </div>
    </div>
  );
}

// ---------- Histórico (CAP05-T07) ----------
export function History({ career }: { career: Career }) {
  const [tab, setTab] = useState<HistoryTab>("compras");
  const h = buildHistory(career, tab);
  if (!h.total) return (
    <div className="wk pr">
      <Head ctx="Mercado" back={M} />
      <h1 className="screen-title">Seu histórico começa.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">As negociações aparecerão aqui.</p>
      <p className="wk-note pr-pad">Ainda não há compras, vendas ou empréstimos.</p>
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(M)}>Voltar ao mercado</button></div>
    </div>
  );
  return (
    <div className="wk pr">
      <Head ctx="Mercado" back={M} />
      <h1 className="screen-title">O mercado do clube.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Compras, vendas e empréstimos.</p>
      <div className="pr-tabs mk-tabs3" role="tablist" aria-label="Histórico">
        {([["compras", "Compras"], ["vendas", "Vendas"], ["emprestimos", "Empréstimos"]] as const).map(([t, l]) =>
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`pr-tab${tab === t ? " is-on" : ""}`} onClick={() => setTab(t)}>{l}</button>)}
      </div>
      <section className="wk-sec" role="tabpanel">
        {h.items.length ? <dl className="wk-list">{h.items.map((e, i) => <div key={i} className="wk-item mk-log"><dt>{e.round}</dt><dd>{e.text}</dd></div>)}</dl>
          : <p className="wk-note">Nada nesta aba ainda.</p>}
      </section>
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(M)}>Voltar ao mercado</button></div>
    </div>
  );
}

// ---------- Proposta pendente por um jogador seu (CAP05-T05) ----------
export function PendingOffer({ career, onChanged }: { career: Career; onChanged: () => Promise<void> | void }) {
  const o = career.pendingOffer || null;
  const p = o ? (career.squad || []).find((x) => String(x.id) === String(o.playerId)) || null : null;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => { if (!o && !done) navigate(M, { replace: true }); }, [o, done]);
  if (done) return (
    <div className="wk pr">
      <Head ctx="Proposta" back={M} />
      <h1 className="screen-title">{done.startsWith("Venda") ? "Venda concluída." : "Proposta recusada."}</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{done}</p>
      <div className="cal-foot"><button type="button" className="cta" onClick={() => navigate(M, { replace: true })}>Voltar ao mercado</button></div>
    </div>
  );
  if (!o) return null;
  const diff = p?.value != null ? o.fee - p.value : null;
  const answer = async (d: "aceitar" | "recusar") => {
    setBusy(true); setErr(null);
    const r = await MarketGateway.answerPending(d);
    setBusy(false);
    if (!r.ok) { setErr(msgOf(r)); return; }
    await onChanged();
    setDone(d === "aceitar" ? `Venda: ${shortName(o.playerName)} foi para o ${o.clubName} por ${moneyShort(o.fee)}.` : `A proposta do ${o.clubName} por ${shortName(o.playerName)} foi recusada.`);
  };
  return (
    <div className="wk pr">
      <Head ctx="Proposta" back={M} />
      <h1 className="screen-title">Uma oferta chegou.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Decida o futuro do seu jogador.</p>
      <section className="wk-sec">
        <PlayerRow name={shortName(o.playerName)} position={p ? POSITION[p.group] : ""} to={p ? `${BASE}/elenco/jogador?id=${encodeURIComponent(p.id)}` : undefined} />
        {p?.age != null && <Rows rows={[{ label: "Idade", value: `${p.age} anos` }]} />}
      </section>
      <section className="wk-sec" aria-labelledby="po-c"><h2 className="kicker-caps" id="po-c">Clube interessado</h2><Rows rows={[{ label: o.clubName, value: "" }]} /></section>
      <section className="wk-sec" aria-labelledby="po-v"><h2 className="kicker-caps" id="po-v">Valor oferecido</h2>
        <p className="mk-big">{moneyShort(o.fee)}</p>
        <Rows rows={[{ label: "Parcelamento", value: "À vista" },
          ...(p?.value != null ? [{ label: "Valor de mercado", value: moneyShort(p.value) }] : []),
          ...(diff != null ? [{ label: "Diferença para o mercado", value: diff === 0 ? "R$ 0" : `${diff > 0 ? "+" : "−"}${moneyShort(Math.abs(diff))}`, tone: diff > 0 ? "pos" as const : diff < 0 ? "neg" as const : undefined }] : [])]} />
      </section>
      <div className="cal-foot">
        <Status err={err} />
        <button type="button" className="cta" aria-disabled={busy || undefined} onClick={() => { if (!busy) answer("aceitar"); }}>Aceitar</button>
        <button type="button" className="link-back" disabled={busy} onClick={() => answer("recusar")}>Recusar</button>
      </div>
    </div>
  );
}
