// CAP02-T03 — Perfil do jogador (pranchas/05_elenco.png, coluna 2).
// Camisa grande com o overall, nome e posição; "No elenco do <clube>" com
// dados esportivos em linhas simples (sem idade, salário ou gráficos);
// "Contrato e ações do jogador" abre a ficha da versão atual (decisões de
// 01/11). Só leitura.
import type { ProfileModel } from "../domain/squad.ts";
import { Jersey, Wordmark } from "../ui/components.tsx";
import { IconBack, IconChevron } from "../ui/icons.tsx";
import { BASE, Link, goBack, goBackTo } from "../ui/router.tsx";
import { legacyPlayerHref } from "../adapters/legacy.ts";
import "./squad.css";

export function Profile({ m }: { m: ProfileModel }) {
  return (
    <div className="pf">
      <header className="sub-head">
        <button type="button" className="back-btn back-btn--text" onClick={() => goBack(`${BASE}/elenco`)}><IconBack /><span>Voltar</span></button>
        <Wordmark />
        <span />
      </header>

      <div className="pf-hero">
        <Jersey value={m.player.overall} gk={m.player.group === "G"} size={150} />
        <h1 className="pf-name">{m.short}</h1>
        <p className="pf-pos">{m.position}</p>
      </div>

      <section className="pf-sec" aria-labelledby="pf-club">
        <h2 className="pf-club" id="pf-club">No elenco do {m.clubName}</h2>
        <dl className="pf-facts">
          {m.facts.map((f) => (
            <div key={f.label} className="pf-fact">
              <dt>{f.label}</dt>
              <dd className={f.tone ? `sq-sit--${f.tone}` : undefined}>{f.value}</dd>
            </div>
          ))}
        </dl>
        <a className="row pf-legacy" href={legacyPlayerHref(m.player.id)}>
          <span className="row-body"><span className="row-title">Contrato e ações do jogador</span><span className="row-sub">Renovar, conversar, vender, emprestar e mais</span></span>
          <IconChevron className="row-chevron" />
        </a>
      </section>

      <div className="pf-foot">
        <Link className="cta" to={`${BASE}/escalacao`}>Ver escalação</Link>
        <button type="button" className="link-back" onClick={() => goBackTo(`${BASE}/elenco`)}>Voltar ao elenco</button>
      </div>
    </div>
  );
}
