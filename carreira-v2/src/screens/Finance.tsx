// CAP02-T06 — Finanças (pranchas/06_clube.png, coluna 2). Saldo disponível
// (lima; vermelho se negativo), folha salarial × teto em texto, últimas
// movimentações com "Ver extrato completo", Ver elenco / Ver mercado e
// atalho "Patrocínios, estádio e orçamento" para a versão atual
// (decisões de 01/11). Sem gráficos nem controles de dinheiro. Só leitura.
import { useState } from "react";
import { RECENT_LEDGER, type FinanceModel, type LedgerRow } from "../domain/finance.ts";
import { Wordmark } from "../ui/components.tsx";
import { IconBack, IconChevron, IconDown } from "../ui/icons.tsx";
import { BASE, Link, goBack, goBackTo } from "../ui/router.tsx";
import { legacyHref } from "../adapters/legacy.ts";
import "./table.css";
import "./calendar.css";
import "./board.css";
import "./finance.css";

function Ledger({ rows, grouped }: { rows: LedgerRow[]; grouped: boolean }) {
  let last: number | null = null;
  return (
    <ul className="fn-ledger">
      {rows.map((r, i) => {
        const head = grouped && r.round !== last ? (last = r.round, <li key={`h${i}`} className="fn-round" aria-hidden="true">Rodada {r.round}</li>) : null;
        return [head, (
          <li key={i} className="fn-tx">
            <span className="fn-tx-body"><span className="fn-tx-label">{r.label}</span>{!grouped && <span className="fn-tx-round">Rodada {r.round}</span>}</span>
            <span className={`fn-tx-val${r.amount < 0 ? " is-neg" : ""}`} aria-label={`${r.amount < 0 ? "saída" : "entrada"} de ${r.text.slice(1)}`}>{r.text}</span>
          </li>
        )];
      })}
    </ul>
  );
}

export function Finance({ m }: { m: FinanceModel }) {
  const [full, setFull] = useState(false);
  return (
    <div className="fn">
      <header className="sub-head">
        <button type="button" className="back-btn back-btn--bare" onClick={() => goBack(`${BASE}/`)} aria-label="Voltar"><IconBack /></button>
        <Wordmark />
        <span />
      </header>
      <h1 className="cal-title">Finanças</h1>
      <span className="tb-bar cal-bar" aria-hidden="true" />
      <p className="cal-lead">Cuide do seu clube.</p>

      <dl className="bd-list">
        <div className="bd-item fn-cash">
          <dt>Saldo disponível</dt>
          <dd className={m.negative ? "is-neg" : undefined}>{m.cashText}</dd>
        </div>
        <div className="bd-item">
          <dt>Folha salarial</dt>
          <dd className="fn-wage">{m.wage.bill}{m.wage.cap && <span> de {m.wage.cap}</span>}</dd>
          {m.wage.over && <dd className="bd-note fn-over">Acima do teto salarial</dd>}
        </div>
      </dl>

      <nav aria-label="Atalhos" className="fn-links">
        <Link className="row bd-link" to={`${BASE}/elenco`}>
          <span className="row-body"><span className="row-title">Ver elenco</span></span>
          <IconChevron className="row-chevron bd-chev" />
        </Link>
        <a className="row bd-link" href={legacyHref("mercado")}>
          <span className="row-body"><span className="row-title">Ver mercado</span></span>
          <IconChevron className="row-chevron bd-chev" />
        </a>
      </nav>

      <section className="bd-sec" aria-labelledby="fn-mov">
        <h2 className="kicker-caps" id="fn-mov">{full ? "Extrato" : "Últimas movimentações"}</h2>
        {m.ledger.length ? (
          <>
            <Ledger rows={full ? m.ledger : m.ledger.slice(0, RECENT_LEDGER)} grouped={full} />
            {m.ledger.length > RECENT_LEDGER && (
              <button type="button" className="tb-more" aria-expanded={full} onClick={() => setFull(!full)}>
                {full ? "Ver só as últimas" : "Ver extrato completo"}<IconDown className={full ? "is-up" : ""} />
              </button>
            )}
          </>
        ) : <p className="fn-empty">Nenhum lançamento ainda.</p>}
      </section>

      <a className="row fn-legacy" href={legacyHref("financas")}>
        <span className="row-body"><span className="row-title">Patrocínios, estádio e orçamento</span><span className="row-sub">Contratos, obras, comissão técnica e pedido à diretoria</span></span>
        <IconChevron className="row-chevron" />
      </a>

      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(`${BASE}/clube`)}>Voltar ao clube</button></div>
    </div>
  );
}
