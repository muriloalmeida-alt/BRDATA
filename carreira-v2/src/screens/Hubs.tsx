// P7 (plano de independência) — telas de entrada no padrão das listas da v2:
// - Jogos (aba "Jogos"): Calendário, Tabela, Copa do Brasil, Estatísticas.
// - Clube (aberta pelo Início): diretoria, dinheiro, elenco e mercado,
//   estrutura. "Voltar ao clube" das telas do clube volta para cá.
// - Mais (aba "Mais", prancha 43 col. 2, CAP07-T01): os 9 itens.
// Áreas que ainda não têm tela na v2 abrem a tela equivalente da versão
// anterior (só em homologação — D3), marcadas com ↗ no fim da linha; elas
// passam a ser telas da v2 nas fases seguintes.
import { useState } from "react";
import { legacyHref, type LegacyTarget } from "../adapters/legacy.ts";
import type { BoardModel } from "../domain/board.ts";
import type { FinanceModel } from "../domain/finance.ts";
import type { HomeModel } from "../domain/home.ts";
import type { CupModel } from "../domain/table.ts";
import { TabBar, Wordmark } from "../ui/components.tsx";
import { IconBack, IconChevron } from "../ui/icons.tsx";
import { BASE, Link, goBack } from "../ui/router.tsx";
import "./hubs.css";

type Entry = { title: string; sub?: string | null } & ({ to: string } | { legacy: LegacyTarget } | { action: () => void });

function Row({ e }: { e: Entry }) {
  const body = (<>
    <span className="row-body"><span className="row-title">{e.title}</span>{e.sub && <span className="row-sub">{e.sub}</span>}</span>
    {"legacy" in e ? <span className="hb-ext" aria-label="abre a versão anterior">↗</span> : <IconChevron className="row-chevron" />}
  </>);
  if ("to" in e) return <Link className="row hb-row" to={e.to}>{body}</Link>;
  if ("legacy" in e) return <a className="row hb-row" href={legacyHref(e.legacy)}>{body}</a>;
  return <button type="button" className="row hb-row" onClick={e.action}>{body}</button>;
}

function Section({ title, items }: { title?: string; items: Entry[] }) {
  return (
    <section className="hb-sec">
      {title && <h2 className="kicker-caps hb-k">{title}</h2>}
      <nav aria-label={title}>{items.map((e) => <Row key={e.title} e={e} />)}</nav>
    </section>
  );
}

function Head({ ctx, back }: { ctx: string; back?: string }) {
  return (
    <header className="sub-head">
      {back ? <button type="button" className="back-btn back-btn--bare" onClick={() => goBack(back)} aria-label="Voltar"><IconBack /></button> : <span />}
      <Wordmark />
      <span className="sub-head-ctx">{ctx}</span>
    </header>
  );
}

const CUP_SHORT: Record<CupModel["outcome"], string | null> = { campeao: "Campeão", eliminado: "Eliminado", encerrada: "Edição encerrada", fora: "Fora desta edição", vivo: null };

// Aba Jogos.
export function GamesHub({ home, cup }: { home: HomeModel; cup: CupModel }) {
  return (
    <div className="hb">
      <Head ctx="Jogos" back={`${BASE}/`} />
      <h1 className="screen-title">Seus jogos.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{home.competition} · {home.club.season}</p>
      <Section items={[
        { title: "Calendário", sub: home.next ? `Próximo: ${home.next.home.name} × ${home.next.away.name} · ${home.next.line}` : "Todos os jogos da temporada", to: `${BASE}/calendario` },
        { title: "Tabela", sub: home.position !== null ? `${home.position}º lugar` : "Nenhuma rodada disputada", to: `${BASE}/tabela` },
        { title: "Copa do Brasil", sub: CUP_SHORT[cup.outcome] || cup.status, to: `${BASE}/copa` },
        { title: "Estatísticas", sub: "Seu time, o campeonato e o histórico", to: `${BASE}/estatisticas` },
      ]} />
      <TabBar current="jogos" />
    </div>
  );
}

// Clube (aberta pelo Início).
export function ClubHub({ home, board, finance }: { home: HomeModel; board: BoardModel; finance: FinanceModel }) {
  return (
    <div className="hb">
      <Head ctx="Clube" back={`${BASE}/`} />
      <h1 className="screen-title">Seu clube.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{home.club.name} · Temporada {home.club.season}</p>
      <Section title="Gestão" items={[
        { title: "Diretoria", sub: board.goal ? `Meta: ${board.goal}` : "Objetivos da temporada", to: `${BASE}/diretoria` },
        { title: "Finanças", sub: `Saldo ${finance.cashText}`, to: `${BASE}/financas` },
        { title: "Extrato financeiro", sub: "Entradas e saídas por rodada", to: `${BASE}/extrato` },
      ]} />
      <Section title="Elenco e mercado" items={[
        { title: "Mercado", sub: "Compra, venda e empréstimos", to: `${BASE}/mercado` },
        { title: "Contratos", sub: "Salários e prazos do elenco", to: `${BASE}/contratos` },
        { title: "Histórico de negociações", to: `${BASE}/mercado/historico` },
        { title: "Base e olheiros", sub: "Missões, relatórios e categorias de base", to: `${BASE}/olheiros` },
        { title: "Comissão técnica", to: `${BASE}/comissao` },
      ]} />
      <Section title="Estrutura" items={[
        { title: "Estádio", sub: "Capacidade e obras", to: `${BASE}/estadio` },
        { title: "Patrocínios", to: `${BASE}/patrocinios` },
      ]} />
      <TabBar current="inicio" />
    </div>
  );
}

// Aba Mais (CAP07-T01).
export function MoreMenu({ onLogout }: { onLogout: () => Promise<void> }) {
  const [leaving, setLeaving] = useState(false);
  return (
    <div className="hb">
      <Head ctx="Mais" back={`${BASE}/`} />
      <h1 className="screen-title">Seu jogo continua.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Conta, carreira e preferências.</p>
      <Section items={[
        { title: "Perfil do treinador", sub: "Reputação, histórico e objetivos", to: `${BASE}/perfil` },
        { title: "Conquistas", to: `${BASE}/conquistas` },
        { title: "Premiações", to: `${BASE}/premiacoes` },
        { title: "Ranking", to: `${BASE}/ranking` },
        { title: "Loja", to: `${BASE}/loja` },
        { title: "Configurações", to: `${BASE}/configuracoes` },
        { title: "Central de ajuda", to: `${BASE}/ajuda` },
        { title: "Saves", sub: "Carreira atual · reiniciar", to: `${BASE}/saves` },
        { title: leaving ? "Saindo…" : "Sair", action: () => { if (!leaving) { setLeaving(true); onLogout(); } } },
      ]} />
      <TabBar current="mais" />
    </div>
  );
}
