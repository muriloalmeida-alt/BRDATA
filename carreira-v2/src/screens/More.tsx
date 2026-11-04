// Fase 10 (plano de independência) — aba Mais pela v2:
// - /carreira/conquistas: Conquistas (sem prancha nova; as do jogo);
// - /carreira/ranking (?aba=amigos): Ranking e convite (CAP07-N02, complemento 44 col. 1-2);
// - /carreira/loja e /loja/historico: Loja e histórico (CAP07-N03, 44 col. 3 e 45 col. 1);
// - /carreira/configuracoes e /configuracoes/perfil: Configurações e Editar perfil (CAP07-N01, 43 col. 3);
// - /carreira/ajuda: Central de ajuda (CAP07-T03, 45 col. 3);
// - /carreira/saves: Saves (CAP07-T02).
import { useCallback, useEffect, useState } from "react";
import { MoreGateway, PushGateway, pushSupported, type Account, type Achievement, type BoostItem, type Package, type PurchaseTx, type RankEntry } from "../adapters/more.ts";
import type { Res } from "../adapters/prep.ts";
import { moneyShort } from "../domain/home.ts";
import type { Career } from "../domain/types.ts";
import { Sheet } from "../ui/dialog.tsx";
import { IconChevron } from "../ui/icons.tsx";
import { BASE, goBackTo, navigate } from "../ui/router.tsx";
import { shareAchievement } from "../ui/share.ts";
import { NavRow, Rows, Status } from "./Market.tsx";
import { Head, Loading, errText, useRead } from "./Tactics.tsx";
import "./home.css";
import "./calendar.css";
import "./week.css";
import "./prep.css";
import "./squadplus.css";
import "./market.css";
import "./games.css";

const MAIS = `${BASE}/mais`;
const msgOf = (r: { motivo?: string; mensagem?: string }) => r.mensagem || errText(r);
function Foot({ back = MAIS, label = "Voltar", children }: { back?: string; label?: string; children?: React.ReactNode }) {
  return <div className="cal-foot">{children}<button type="button" className="link-back" onClick={() => goBackTo(back)}>{label}</button></div>;
}
function useAccount() {
  const load = useCallback(async (): Promise<Res<Account>> => { const a = await MoreGateway.account(); return a ? { ok: true, ...a } : { ok: false, motivo: "sessao" }; }, []);
  return useRead<Account>(load);
}
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------- Conquistas ----------
const TIER: Record<string, string> = { gold: "Ouro", silver: "Prata", bronze: "Bronze" };
export function AchievementsScreen() {
  const load = useCallback(() => MoreGateway.achievements(), []);
  const [data] = useRead<{ categorias: Record<string, string>; lista: Achievement[] }>(load);
  const [cat, setCat] = useState("todas");
  const [open, setOpen] = useState<Achievement | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="wk pr">
      <Head ctx="Mais" back={MAIS} />
      <h1 className="screen-title">Sua vitrine.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <Loading data={data}>{() => {
        const d = data as { categorias: Record<string, string>; lista: Achievement[] };
        const done = d.lista.filter((a) => a.desbloqueadaEm).length;
        const next = d.lista.find((a) => !a.desbloqueadaEm);
        const list = d.lista.filter((a) => cat === "todas" || a.categoria === cat);
        return (<>
          <p className="screen-sub">{done} de {d.lista.length} conquistas desbloqueadas.</p>
          {next && <p className="wk-note pr-pad">Próxima: {next.icone} {next.titulo}{next.meta > 1 ? `, faltam ${next.meta - next.progresso}` : ""}.</p>}
          <div className="pr-seg cl-filters" role="radiogroup" aria-label="Categoria">
            {[["todas", "Todas"], ...Object.entries(d.categorias)].map(([id, l]) => <button key={id} type="button" role="radio" aria-checked={cat === id} className={`pr-seg-btn${cat === id ? " is-on" : ""}`} onClick={() => setCat(id)}>{l}</button>)}
          </div>
          <section className="wk-sec"><div className="mo-badges">
            {list.map((a) => (
              <button key={a.id} type="button" className={`mo-badge${a.desbloqueadaEm ? ` is-${a.nivel}` : " is-locked"}`} onClick={() => setOpen(a)}>
                <span className="mo-badge-ico" aria-hidden="true">{a.icone}</span><b>{a.titulo}</b>
                <small>{a.desbloqueadaEm ? TIER[a.nivel] : `${a.progresso}/${a.meta}`}</small>
              </button>
            ))}
          </div></section>
          <Foot><Status msg={msg} /></Foot>
          {open && (
            <Sheet labelledBy="ac-t" onDismiss={() => setOpen(null)}>
              <h2 id="ac-t" className="sheet-title">{open.icone} {open.titulo}</h2>
              <span className="tb-bar pr-sheet-bar" aria-hidden="true" />
              <p className="wk-sheet-text">{open.descricao}</p>
              <Rows rows={[{ label: "Categoria", value: d.categorias[open.categoria] || open.categoria }, { label: "Nível", value: TIER[open.nivel] }, open.desbloqueadaEm
                ? { label: "Desbloqueada em", value: new Date(open.desbloqueadaEm).toLocaleDateString("pt-BR") } : { label: "Progresso", value: `${open.progresso} / ${open.meta}` }]} />
              {open.desbloqueadaEm && <button type="button" className="cta sp-sheet-cta" onClick={async () => { const r = await shareAchievement(open); setOpen(null); if (r === "downloaded") setMsg("Imagem baixada: compartilhe pela sua galeria."); if (r === "failed") setMsg("Não deu pra gerar a imagem agora."); }}>Compartilhar</button>}
              <button type="button" className="text-btn" onClick={() => setOpen(null)}>Fechar</button>
            </Sheet>
          )}
        </>);
      }}</Loading>
    </div>
  );
}

// ---------- Ranking ----------
export function RankingScreen({ tab }: { tab: "all" | "friends" }) {
  const [acc] = useAccount();
  const load = useCallback(() => MoreGateway.ranking(tab), [tab]);
  const [data, reload] = useRead<{ entries: RankEntry[]; own?: RankEntry }>(load);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const me = acc && acc !== "erro" ? acc : null;
  const invite = async () => {
    if (!me?.friendCode) return;
    const url = `${location.origin}/carreira.html?convite=${encodeURIComponent(me.friendCode)}`;
    const text = "Entra no Modo Técnico comigo! Usa meu link pra a gente virar amigo no Ranking:";
    try { if (navigator.share) { await navigator.share({ title: "BR Treinador — Modo Técnico", text, url }); return; } } catch (e) { if ((e as Error).name === "AbortError") return; }
    try { await navigator.clipboard.writeText(url); setMsg("Link de convite copiado."); } catch { setErr("Não deu pra copiar o link agora."); }
  };
  const add = async () => {
    if (!code.trim() || busy) return;
    setBusy(true); setErr(null); setMsg(null);
    const r = await MoreGateway.addFriend(code.trim().toUpperCase());
    setBusy(false);
    if (!r.ok) { setErr(msgOf(r)); return; }
    setCode(""); setMsg("Amigo adicionado!"); if (tab === "friends") reload();
  };
  return (
    <div className="wk pr">
      <Head ctx="Mais" back={MAIS} />
      <h1 className="screen-title">Veja sua posição.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Treinadores e pontos no ranking.</p>
      <div className="pr-tabs sp-tabs2" role="tablist" aria-label="Ranking">
        {([["all", "Todos"], ["friends", "Amigos"]] as const).map(([t, l]) => <button key={t} type="button" role="tab" aria-selected={tab === t} className={`pr-tab${tab === t ? " is-on" : ""}`} onClick={() => navigate(`${BASE}/ranking${t === "friends" ? "?aba=amigos" : ""}`, { replace: true })}>{l}</button>)}
      </div>
      <Loading data={data}>{() => {
        const d = data as { entries: RankEntry[]; own?: RankEntry };
        const entries = d.entries.slice();
        let mine = me ? entries.findIndex((e) => String(e.userId) === me.id) : -1;
        if (mine < 0 && d.own) { entries.push(d.own); mine = entries.length - 1; }
        return (
          <section className="wk-sec" role="tabpanel">
            {entries.length ? entries.map((e, i) => (
              <div key={`${e.userId}-${i}`} className={`mo-rank${i === mine ? " is-me" : ""}`}>
                <span className="mo-rank-pos">{i + 1}º</span>
                <span className="mo-rank-name"><b>{e.managerName}{i === mine ? " (você)" : ""}</b>{e.clubName && <small>{e.clubName}</small>}</span>
                <span className="mo-rank-pts">{e.score.toLocaleString("pt-BR")}</span>
              </div>
            )) : <p className="wk-note">{tab === "friends" ? "Adicione amigos pra comparar o ranking com eles." : "Ninguém publicou placar ainda."}</p>}
            <p className="wk-note">Pontos: pontos no campeonato × 10, conquistas × 50 e saldo de gols × 2.</p>
          </section>
        );
      }}</Loading>
      <section className="wk-sec pr-pad" aria-labelledby="rk-a"><h2 className="kicker-caps" id="rk-a">Amigos</h2>
        {me?.friendCode && <Rows rows={[{ label: "Seu código", value: me.friendCode }]} />}
        <label className="pr-label" htmlFor="rk-c">Código do amigo</label>
        <div className="sq-tools mo-add"><input id="rk-c" className="pr-input sq-search" value={code} maxLength={12} autoCapitalize="characters" onChange={(e) => setCode(e.target.value)} />
          <button type="button" className="state-btn sq-filter" disabled={busy || !code.trim()} onClick={add}>Adicionar</button></div>
      </section>
      <Foot><Status msg={msg} err={err} /><button type="button" className="cta" aria-disabled={!me?.friendCode || undefined} onClick={invite}>Convidar amigo</button></Foot>
    </div>
  );
}

// ---------- Loja ----------
export function ShopScreen({ onChanged }: { onChanged: () => Promise<void> | void }) {
  const [acc, reloadAcc] = useAccount();
  const load = useCallback(() => MoreGateway.shop(), []);
  const [data, reload] = useRead<{ pacotes: Package[]; itens: BoostItem[]; categorias: Record<string, string>; historico: PurchaseTx[] }>(load);
  const [ask, setAsk] = useState<null | { kind: "package"; item: Package } | { kind: "boost"; item: BoostItem }>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const credits = acc && acc !== "erro" ? acc.creditsBR || 0 : 0;
  const confirm = async () => {
    if (!ask || busy) return;
    setBusy(true); setErr(null); setMsg(null);
    if (ask.kind === "package") {
      const r = await MoreGateway.checkout(ask.item.id);
      if (r.ok) { location.href = r.checkoutUrl; return; } // Checkout Pro do Mercado Pago, como a versão anterior
      setBusy(false); setAsk(null); setErr(msgOf(r)); return;
    }
    const r = await MoreGateway.buy(ask.item.id);
    setBusy(false); setAsk(null);
    if (!r.ok) { setErr(msgOf(r)); return; }
    setMsg(`${ask.item.name}: ${r.efeito}.`); reloadAcc(); reload(); await onChanged();
  };
  return (
    <div className="wk pr">
      <Head ctx="Mais" back={MAIS} />
      <h1 className="screen-title">Mais opções de jogo.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Créditos e itens disponíveis.</p>
      <Loading data={data}>{() => {
        const d = data as { pacotes: Package[]; itens: BoostItem[]; categorias: Record<string, string> };
        return (<>
          <section className="wk-sec" aria-labelledby="lj-s"><h2 className="kicker-caps" id="lj-s">Seu saldo</h2><p className="mk-big">{credits.toLocaleString("pt-BR")} créditos</p></section>
          <section className="wk-sec" aria-labelledby="lj-p"><h2 className="kicker-caps" id="lj-p">Pacotes de créditos</h2>
            <p className="wk-note">Créditos BR compram conveniência e cosméticos. Nenhum pacote aumenta atributos de jogador.</p>
            {d.pacotes.map((p) => (
              <div key={p.id} className="mo-item"><span className="row-body"><span className="row-title">{p.name}{p.featured ? " · melhor valor" : ""}</span><span className="row-sub">{p.totalCoins.toLocaleString("pt-BR")} créditos{p.bonusPct ? ` (+${p.bonusPct}% de bônus)` : ""}</span></span>
                <button type="button" className="state-btn" onClick={() => setAsk({ kind: "package", item: p })}>{brl(p.priceBRL)}</button></div>
            ))}
          </section>
          {Object.entries(d.categorias).map(([cat, label]) => (
            <section key={cat} className="wk-sec" aria-labelledby={`lj-${cat}`}><h2 className="kicker-caps" id={`lj-${cat}`}>Itens com créditos · {label.toLowerCase()}</h2>
              {d.itens.filter((i) => i.category === cat).map((i) => (
                <div key={i.id} className="mo-item"><span className="row-body"><span className="row-title">{i.icon} {i.name}</span><span className="row-sub">{i.desc} · {i.duration.toLowerCase()}</span></span>
                  <button type="button" className="state-btn" onClick={() => setAsk({ kind: "boost", item: i })}>{i.priceCredits} créditos</button></div>
              ))}
            </section>
          ))}
          <nav className="wk-sec" aria-label="Mais"><NavRow to={`${BASE}/loja/historico`} title="Histórico de compras" /></nav>
        </>);
      }}</Loading>
      <Foot><Status msg={msg} err={err} /></Foot>
      {ask && (
        <Sheet labelledBy="lj-t" onDismiss={busy ? undefined : () => setAsk(null)}>
          <h2 id="lj-t" className="sheet-title">{ask.item.name}</h2>
          <span className="tb-bar pr-sheet-bar" aria-hidden="true" />
          {ask.kind === "package" ? (<>
            <Rows rows={[{ label: "Créditos", value: ask.item.totalCoins.toLocaleString("pt-BR") }, { label: "Preço", value: brl(ask.item.priceBRL) }, { label: "Pagamento", value: "Mercado Pago (cartão ou Pix)" }]} />
            <p className="wk-sheet-text">Você vai para uma página segura do Mercado Pago. Os créditos entram na conta quando o pagamento for aprovado.</p>
          </>) : (<>
            <p className="wk-sheet-text">{ask.item.desc}</p>
            <Rows rows={[{ label: "Preço", value: `${ask.item.priceCredits} créditos` }, { label: "Seu saldo", value: `${credits.toLocaleString("pt-BR")} créditos` }]} />
            <p className="wk-sheet-text">{credits >= ask.item.priceCredits ? "O valor sai do seu saldo na hora, e o efeito é aplicado direto na carreira." : "Saldo insuficiente: compre um pacote de créditos primeiro."}</p>
          </>)}
          <button type="button" className="cta sp-sheet-cta" aria-disabled={busy || (ask.kind === "boost" && credits < ask.item.priceCredits) || undefined}
            onClick={() => { if (ask.kind === "boost" && credits < ask.item.priceCredits) return; confirm(); }}>{busy ? "…" : ask.kind === "package" ? `Pagar ${brl(ask.item.priceBRL)}` : `Comprar por ${ask.item.priceCredits} créditos`}</button>
          <button type="button" className="text-btn" disabled={busy} onClick={() => setAsk(null)}>Cancelar</button>
        </Sheet>
      )}
    </div>
  );
}
export function PurchaseHistoryScreen() {
  const load = useCallback(() => MoreGateway.shop(), []);
  const [data] = useRead<{ historico: PurchaseTx[] }>(load);
  const back = `${BASE}/loja`;
  return (
    <div className="wk pr">
      <Head ctx="Loja" back={back} />
      <h1 className="screen-title">Suas compras.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Consulte os registros da loja.</p>
      <Loading data={data}>{() => {
        const list = (data as { historico: PurchaseTx[] }).historico;
        return list.length ? (
          <section className="wk-sec" aria-labelledby="hc-t"><h2 className="kicker-caps" id="hc-t">Histórico de compras</h2>
            <dl className="wk-list">{list.map((t, i) => <div key={i} className="wk-item"><dt>{t.icon} {t.name}<small className="mo-sub">{new Date(t.ts).toLocaleDateString("pt-BR")}{t.detail ? ` · ${t.detail}` : ""}</small></dt><dd className={t.valueType === "credit" ? "is-pos" : undefined}>{t.valueLabel || ""}</dd></div>)}</dl>
          </section>
        ) : <p className="wk-note pr-pad">Nenhuma compra ou recompensa usada ainda. Itens da loja e recompensas do login diário aparecem aqui.</p>;
      }}</Loading>
      <Foot back={back} label="Voltar à loja" />
    </div>
  );
}

// ---------- Configurações ----------
function Toggle({ label, on, disabled, onClick }: { label: string; on: boolean; disabled?: boolean; onClick: () => void }) {
  return <button type="button" role="switch" aria-checked={on} className="mo-toggle" disabled={disabled} onClick={onClick}><span>{label}</span><span className="mo-switch" aria-hidden="true" /></button>;
}
export function SettingsScreen({ career }: { career: Career }) {
  const [acc, reloadAcc] = useAccount();
  const load = useCallback(() => MoreGateway.prefs(), []);
  const [prefs, reload] = useRead<{ notificacoes: Record<string, boolean>; som: boolean; reputacao: number }>(load);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const act = async (p: Promise<Res>, ok: string, after?: () => void) => {
    setBusy(true); setErr(null); setMsg(null);
    const r = await p;
    setBusy(false);
    if (!r.ok) { setErr(msgOf(r)); return; }
    setMsg(ok); after?.();
  };
  const me = acc && acc !== "erro" ? acc : null;
  return (
    <div className="wk pr">
      <Head ctx="Mais" back={MAIS} />
      <h1 className="screen-title">Do seu jeito.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{me ? `${me.name}${me.createdAt ? ` · treinador desde ${new Date(me.createdAt).getFullYear()}` : ""}` : "Conta e preferências."}</p>
      <Loading data={prefs}>{() => {
        const p = prefs as { notificacoes: Record<string, boolean>; som: boolean; reputacao: number };
        const push = !!me?.pushEnabled;
        return (<>
          <nav className="wk-sec" aria-labelledby="cf-j"><h2 className="kicker-caps" id="cf-j">Jogo</h2>
            <NavRow to={`${BASE}/clube`} title="Clube atual" sub={career.clubName} />
            <NavRow to={`${BASE}/saves`} title="Saves" sub="Carreira atual · reiniciar" />
          </nav>
          <section className="wk-sec" aria-labelledby="cf-n"><h2 className="kicker-caps" id="cf-n">Notificações do jogo</h2>
            {([["partida", "Lembrete de partida"], ["loja", "Recompensas e ofertas"], ["lesao", "Alertas de lesão"]] as const).map(([k, l]) =>
              <Toggle key={k} label={l} on={!!p.notificacoes[k]} disabled={busy} onClick={() => act(MoreGateway.toggleNotice(k), `${l}: ${p.notificacoes[k] ? "desligado" : "ligado"}.`, reload)} />)}
          </section>
          <section className="wk-sec" aria-labelledby="cf-p"><h2 className="kicker-caps" id="cf-p">Notificações push</h2>
            <p className="wk-note">{pushSupported() ? "Um lembrete se você estiver perto de perder sua sequência de login diário, mesmo com o app fechado." : "Seu navegador não suporta notificações push."}</p>
            <Toggle label="Ativar notificações push" on={push} disabled={busy || !pushSupported()} onClick={() => act(push ? PushGateway.disable() : PushGateway.enable(), push ? "Notificações desativadas." : "Notificações ativadas.", reloadAcc)} />
            {push && <button type="button" className="row pr-row" disabled={busy} onClick={() => act(PushGateway.test(), "Notificação de teste enviada: deve chegar em alguns segundos.")}><span className="row-body"><span className="row-title">Enviar notificação de teste</span></span><IconChevron className="row-chevron" /></button>}
          </section>
          <section className="wk-sec" aria-labelledby="cf-a"><h2 className="kicker-caps" id="cf-a">Áudio</h2>
            <p className="wk-note">Apito, som de gol e torcida durante a partida ao vivo.</p>
            <Toggle label="Efeitos sonoros" on={p.som} disabled={busy} onClick={() => act(MoreGateway.setSound(!p.som), p.som ? "Efeitos sonoros desligados." : "Efeitos sonoros ligados.", reload)} />
          </section>
          <nav className="wk-sec" aria-labelledby="cf-c"><h2 className="kicker-caps" id="cf-c">Conta</h2>
            <NavRow to={`${BASE}/configuracoes/perfil`} title="Editar perfil" sub={me ? me.name : null} />
            <NavRow to={`${BASE}/loja/historico`} title="Histórico de compras" />
            <NavRow to={`${BASE}/ajuda`} title="Central de ajuda" />
            <a className="row pr-row" href="/privacidade.html" target="_blank" rel="noopener"><span className="row-body"><span className="row-title">Privacidade e dados</span><span className="row-sub">Abre em outra aba</span></span><IconChevron className="row-chevron" /></a>
          </nav>
        </>);
      }}</Loading>
      <Foot><Status msg={msg} err={err} /></Foot>
    </div>
  );
}
export function EditProfileScreen() {
  const [acc] = useAccount();
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const back = `${BASE}/configuracoes`;
  useEffect(() => { if (name == null && acc && acc !== "erro") setName(acc.name); }, [acc, name]);
  const save = async () => {
    if (busy) return;
    if (!(name || "").trim()) { setErr("O nome não pode ficar vazio."); return; }
    setBusy(true); setErr(null);
    const r = await MoreGateway.saveName(name!.trim());
    setBusy(false);
    if (!r.ok) { setErr(msgOf(r)); return; }
    setSaved(`Nome salvo como "${r.nome}".`);
  };
  return (
    <div className="wk pr">
      <Head ctx="Perfil" back={back} />
      <h1 className="screen-title">Seu nome no jogo.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Atualize o nome do treinador.</p>
      <Loading data={acc}>{() => (
        <section className="wk-sec pr-pad">
          <label className="pr-label" htmlFor="ep-n">Nome do treinador</label>
          <input id="ep-n" className="pr-input" value={name || ""} maxLength={60} onChange={(e) => { setName(e.target.value); setSaved(null); }} />
          {acc && acc !== "erro" && acc.email && <p className="mk-hint">Conta: {acc.email.replace(/^(.).*(@.*)$/, "$1•••$2")}</p>}
        </section>
      )}</Loading>
      <div className="cal-foot"><Status msg={saved} err={err} />
        <button type="button" className="cta" aria-disabled={busy || undefined} onClick={save}>{busy ? "Salvando…" : "Salvar"}</button>
        <button type="button" className="link-back" disabled={busy} onClick={() => goBackTo(back)}>Cancelar</button>
      </div>
    </div>
  );
}

// ---------- Central de ajuda ----------
// As mesmas perguntas de #helpCenterOverlay (carreira.html).
const FAQ: [string, string][] = [
  ["Como funciona a fadiga do elenco?", "A fadiga sobe com treinos e partidas e desce com descanso. Acima de 80% aumenta bastante o risco de lesão — veja a condição de cada jogador em Elenco → Evolução e condição."],
  ["Preciso gastar dinheiro real pra jogar?", "Não. Jogar é 100% de graça — a Loja é opcional, e nenhum item dela dá vantagem competitiva (só conveniência e cosméticos)."],
  ["Como funciona a cor dinâmica do clube?", "O app usa a cor oficial do seu clube pra pintar botões e destaques em toda tela — muda sozinho quando você troca de time."],
  ["Perdi meu progresso, o que fazer?", "Seu progresso é salvo automaticamente na sua conta a cada ação — se sumiu, confira se entrou com o mesmo e-mail de sempre."],
];
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function HelpScreen() {
  const [q, setQ] = useState("");
  const list = FAQ.filter(([p, r]) => !q.trim() || fold(p + " " + r).includes(fold(q.trim())));
  return (
    <div className="wk pr">
      <Head ctx="Mais" back={MAIS} />
      <h1 className="screen-title">Como podemos ajudar?</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Encontre respostas e entre em contato.</p>
      <div className="sq-tools"><label className="sr-only" htmlFor="hp-q">Buscar dúvida</label><input id="hp-q" className="pr-input sq-search" type="search" placeholder="Buscar dúvida ou palavra-chave" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <section className="wk-sec" aria-labelledby="hp-f"><h2 className="kicker-caps" id="hp-f">Perguntas frequentes</h2>
        {list.length ? list.map(([p, r]) => <details key={p} className="mo-faq"><summary>{p}</summary><p>{r}</p></details>) : <p className="wk-note">Nenhuma pergunta com esse termo.</p>}
      </section>
      <nav className="wk-sec" aria-label="Contato"><a className="row pr-row" href="/" target="_blank" rel="noopener"><span className="row-body"><span className="row-title">Contato</span><span className="row-sub">Fale com o suporte pelo site</span></span><IconChevron className="row-chevron" /></a></nav>
      <Foot />
    </div>
  );
}

// ---------- Saves ----------
export function SavesScreen({ career }: { career: Career }) {
  const [ask, setAsk] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const last = career.updatedAt ? new Date(career.updatedAt) : null;
  const restart = async () => {
    setBusy(true); setErr(null);
    const r = await MoreGateway.restart();
    setBusy(false);
    if (!r.ok) { setErr(msgOf(r)); return; }
    location.assign(`${BASE}/`); // sem carreira, a v2 abre a criação (fase 2)
  };
  return (
    <div className="wk pr">
      <Head ctx="Mais" back={MAIS} />
      <h1 className="screen-title">Sua carreira salva.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Uma carreira por conta, salva a cada ação.</p>
      <section className="wk-sec" aria-labelledby="sv-c"><h2 className="kicker-caps" id="sv-c">Carreira atual</h2>
        <Rows rows={[{ label: "Clube", value: career.clubName }, { label: "Temporada", value: String(career.seasonYear) }, { label: "Rodada", value: String(Math.min(career.currentRound, 38)) },
          { label: "Caixa", value: moneyShort(career.finances?.cash || 0) }, ...(last ? [{ label: "Última gravação", value: `${last.toLocaleDateString("pt-BR")} ${last.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` }] : [])]} />
      </section>
      <nav className="wk-sec" aria-label="Ações"><button type="button" className="row pr-row pr-danger" onClick={() => setAsk(true)}><span className="row-body"><span className="row-title">Reiniciar carreira</span><span className="row-sub">Apaga esta carreira e começa do zero</span></span><IconChevron className="row-chevron" /></button></nav>
      <Foot><Status err={err} /></Foot>
      {ask && (
        <Sheet alert labelledBy="sv-t" describedBy="sv-d" onDismiss={busy ? undefined : () => { setAsk(false); setTyped(""); }}>
          <h2 id="sv-t" className="sheet-title">Apagar e reiniciar?</h2>
          <p id="sv-d" className="wk-sheet-text">Isso apaga sua carreira atual no {career.clubName} e começa do zero. Não dá para desfazer. Para confirmar, digite REINICIAR.</p>
          <input className="pr-input" aria-label="Digite REINICIAR para confirmar" value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" />
          <button type="button" className="cta" data-autofocus onClick={() => { setAsk(false); setTyped(""); }}>Manter carreira</button>
          <button type="button" className="text-btn pr-danger-text" disabled={busy || typed.trim().toUpperCase() !== "REINICIAR"} onClick={restart}>{busy ? "…" : "Apagar e reiniciar"}</button>
        </Sheet>
      )}
    </div>
  );
}

// ---------- Pedido de orçamento à diretoria (boardRequest) ----------
export function BudgetScreen({ onChanged }: { onChanged: () => Promise<void> | void }) {
  const load = useCallback(() => MoreGateway.budget(), []);
  const [data, reload] = useRead<{ espera: number; decisao: string | null; teto: number; caixa: number; intervalo: number }>(load);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<null | { aprovado: boolean; aumentoTeto: number; aporte: number; motivoTexto: string }>(null);
  const [err, setErr] = useState<string | null>(null);
  const back = `${BASE}/diretoria`;
  const ask = async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    const r = await MoreGateway.askBudget();
    setBusy(false);
    if (!r.ok) { setErr(msgOf(r)); return; }
    setRes(r); await onChanged(); reload();
  };
  return (
    <div className="wk pr">
      <Head ctx="Diretoria" back={back} />
      <h1 className="screen-title">{res ? (res.aprovado ? "Pedido aprovado." : "Pedido negado.") : "Peça reforço."}</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{res ? "A resposta da diretoria." : "A diretoria avalia o momento antes de responder."}</p>
      <Loading data={data}>{() => {
        const d = data as { espera: number; decisao: string | null; teto: number; caixa: number; intervalo: number };
        return (<>
          {res && (
            <section className="wk-sec" aria-labelledby="or-r"><h2 className="kicker-caps" id="or-r">Resposta</h2>
              <p className="wk-note cl-lead">{res.motivoTexto}</p>
              {res.aprovado && <Rows rows={[{ label: "Teto salarial", value: `+${moneyShort(res.aumentoTeto)}` }, { label: "Caixa", value: `+${moneyShort(res.aporte)}`, tone: "pos" }]} />}
            </section>
          )}
          <section className="wk-sec" aria-labelledby="or-s"><h2 className="kicker-caps" id="or-s">Orçamento atual</h2>
            <Rows rows={[{ label: "Teto salarial", value: moneyShort(d.teto) }, { label: "Caixa", value: moneyShort(d.caixa) }]} />
            {!res && d.decisao && <p className="wk-note">Última resposta: {d.decisao.replace(/^[✅❌]\s*/, "")}</p>}
            <p className="wk-note">Na briga pelo título (G4) ou perto do rebaixamento, a diretoria costuma liberar mais. No meio da tabela, quase sempre nega. Depois de cada resposta, é preciso esperar {d.intervalo} rodadas para pedir de novo.</p>
          </section>
          <div className="cal-foot"><Status err={err} />
            {d.espera > 0 && <p className="sp-why">Você pode pedir de novo em {d.espera} {d.espera === 1 ? "rodada" : "rodadas"}.</p>}
            <button type="button" className="cta" aria-disabled={busy || d.espera > 0 || undefined} onClick={() => { if (d.espera <= 0) ask(); }}>{busy ? "Aguardando…" : "Pedir mais orçamento"}</button>
            <button type="button" className="link-back" onClick={() => goBackTo(back)}>Voltar à diretoria</button>
          </div>
        </>);
      }}</Loading>
    </div>
  );
}
