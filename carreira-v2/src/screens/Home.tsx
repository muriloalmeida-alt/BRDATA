// CAP01-T07 / CAP02-T01 — Início (referencias_anteriores/inicio.png).
// Composição da referência; dados reais do save; ações abrem a tela
// equivalente da versão atual até existirem na v2.
import { useState } from "react";
import type { HomeModel } from "../domain/home.ts";
import type { NoticesModel, SkipInfo } from "../domain/week.ts";
import { NoticesSheet, SkipToMatch } from "./Week.tsx";
import { CtaLink, Crest, TabBar, Wordmark } from "../ui/components.tsx";
import { IconCalendar, IconChevron, IconPitch, IconAlert, IconBell, IconGift, IconShield } from "../ui/icons.tsx";
import { legacyHref } from "../adapters/legacy.ts";
import { BASE, Link } from "../ui/router.tsx";
import "./home.css";
import "./week.css";

const FORM_WORD = { V: "Vitória", E: "Empate", D: "Derrota" } as const;

export function Home({ m, reward, skip, notices, onNoticesOpened }: {
  m: HomeModel; reward?: { pending: boolean }; skip?: SkipInfo | null;
  notices?: NoticesModel; onNoticesOpened?: () => void;
}) {
  // A folha guarda os avisos como estavam ao abrir: os novos continuam
  // destacados mesmo depois de marcados como lidos.
  const [bell, setBell] = useState<NoticesModel | null>(null);
  const unread = notices ? notices.unread : 0;
  const title = m.state === "ended" ? "Temporada encerrada." : "Vamos para o jogo.";
  return (
    <div className="home">
      <header className="home-head">
        <Wordmark />
        {notices && (
          <button type="button" className="home-bell" aria-label={unread ? `Avisos, ${unread} ${unread === 1 ? "novo" : "novos"}` : "Avisos"}
            onClick={() => { setBell(notices); if (unread) onNoticesOpened?.(); }}>
            <IconBell />{unread > 0 && <span className="home-bell-badge" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
          </button>
        )}
        <Link className="home-club" to={`${BASE}/clube`} aria-label={`${m.club.name}, temporada ${m.club.season}. Ver clube`}>
          <Crest team={m.club.crest} size={32} />
          <span className="home-club-txt"><b>{m.club.name.toUpperCase()}</b><span>{m.club.season}</span></span>
        </Link>
      </header>

      <h1 className="home-title">{title}</h1>
      <p className="home-sub">{m.competition}</p>

      <section className="home-match" aria-label="Próximo jogo">
        <div className="home-match-photo" aria-hidden="true" />
        {m.next ? (
          <div className="home-match-body">
            <div className="home-teams">
              <span className="home-team"><Crest team={m.next.home} size={60} /><b>{m.next.home.name}</b></span>
              <span className="home-vs" aria-label="contra">×</span>
              <span className="home-team"><Crest team={m.next.away} size={60} /><b>{m.next.away.name}</b></span>
            </div>
            <p className="home-date">{m.next.line}</p>
            {m.next.phase && <p className="home-phase">{m.next.phase}</p>}
          </div>
        ) : (
          <div className="home-match-body home-match-empty">
            <p className="home-date">{m.state === "ended" ? `Temporada ${m.club.season} concluída` : "Sem jogo do seu clube nesta rodada"}</p>
          </div>
        )}
      </section>

      <main className="home-main">
        <CtaLink cta={m.cta} className="cta" />
        {skip && <SkipToMatch info={skip} />}

        <nav className="home-list" aria-label="Ações">
          {m.alerts.map((a) => {
            const body = (<>
              <IconAlert className="row-icon" />
              <span className="row-body"><span className="row-title">{a.title}</span><span className="row-sub">{a.sub}</span></span>
              <IconChevron className="row-chevron" />
            </>);
            return a.id === "escalacao"
              ? <Link key={a.id} className="row" to={`${BASE}/escalacao`}>{body}</Link>
              : <a key={a.id} className="row" href={legacyHref(a.id)}>{body}</a>;
          })}
          <Link className="row" to={`${BASE}/escalacao`}>
            <IconPitch className="row-icon" />
            <span className="row-body"><span className="row-title">Ajustar escalação</span><span className="row-sub">Escolha quem entra em campo</span></span>
            <IconChevron className="row-chevron" />
          </Link>
          {m.optionalFriendly && (
            <Link className="row" to={`${BASE}/amistoso`}>
              <IconPitch className="row-icon" />
              <span className="row-body"><span className="row-title">Amistoso desta semana</span><span className="row-sub">Opcional · {m.optionalFriendly.invites} {m.optionalFriendly.invites === 1 ? "convite" : "convites"}</span></span>
              <IconChevron className="row-chevron" />
            </Link>
          )}
          {reward && (
            <Link className="row" to={`${BASE}/recompensa`}>
              <IconGift className="row-icon" />
              <span className="row-body"><span className="row-title">Recompensa diária</span><span className="row-sub">{reward.pending ? "Disponível hoje" : "Recebida hoje"}</span></span>
              <IconChevron className="row-chevron" />
            </Link>
          )}
          <Link className="row" to={`${BASE}/clube`}>
            <IconShield className="row-icon" />
            <span className="row-body"><span className="row-title">Clube</span><span className="row-sub">Diretoria, finanças, mercado e estrutura</span></span>
            <IconChevron className="row-chevron" />
          </Link>
          <Link className="row" to={`${BASE}/calendario`}>
            <IconCalendar className="row-icon" />
            <span className="row-body"><span className="row-title">Ver calendário</span></span>
            <IconChevron className="row-chevron" />
          </Link>

          {(m.position !== null || m.form.length > 0) && (
            <div className="row home-stats">
              {m.position !== null && (
                <Link className="home-pos" to={`${BASE}/tabela`} aria-label={`${m.position}º na tabela. Ver tabela`}><b>{m.position}<sup>º</sup></b><span>na tabela</span></Link>
              )}
              {m.form.length > 0 && (
                <span className="home-form">
                  <span className="home-form-label">Últimos jogos</span>
                  <span className="home-form-chips" role="list" aria-label="Últimos jogos, do mais antigo ao mais recente">
                    {m.form.map((r, i) => <span key={i} role="listitem" className={`chip chip--${r}`} aria-label={FORM_WORD[r]}>{r}</span>)}
                  </span>
                </span>
              )}
            </div>
          )}

          {m.objective && (
            <Link className="row" to={`${BASE}/diretoria`}>
              <span className="row-body"><span className="row-kicker">Objetivo</span><span className="row-title">{m.objective}</span></span>
              <IconChevron className="row-chevron" />
            </Link>
          )}
          {m.cash && (
            <Link className="row" to={`${BASE}/financas`}>
              <span className="row-body"><span className="row-title">Finanças</span></span>
              <span className="row-value">{m.cash}</span>
              <IconChevron className="row-chevron" />
            </Link>
          )}
          <Link className="row" to={`${BASE}/noticias`}>
            <span className="row-body"><span className="row-kicker row-kicker--caps">Notícias do clube</span><span className={m.news ? "row-title home-news" : "row-sub"}>{m.news || "Nenhuma notícia ainda"}</span></span>
            <IconChevron className="row-chevron" />
          </Link>
        </nav>
      </main>

      <TabBar current="inicio" />
      {bell && <NoticesSheet m={bell} onClose={() => setBell(null)} />}
    </div>
  );
}
