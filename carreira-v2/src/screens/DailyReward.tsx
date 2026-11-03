// CAP01-N01 — Recompensa diária (pacote complementar, prancha 20, col. 1 e 2).
// Decisão de 03/11: abre sozinha uma vez por dia ao entrar (se ainda não
// recebeu) e fica acessível por uma linha no Início. "Receber" aplica o
// prêmio real (mesmo caminho de claimDailyLoginNow da versão anterior, pelo
// motor) e mostra a variante "Já recebida hoje".
import { useEffect, useRef, useState } from "react";
import { AccessGateway, type DailyRewardState } from "../adapters/access.ts";
import { rewardSub, rewardTitle } from "../domain/reward.ts";
import { TabBar, Wordmark } from "../ui/components.tsx";
import { IconBack, IconCheck } from "../ui/icons.tsx";
import { BASE, goBackTo } from "../ui/router.tsx";
import { Splash } from "./Access.tsx";
import "./access.css";

export function DailyReward({ onClaimed }: { onClaimed: () => void }) {
  const [st, setSt] = useState<{ kind: "loading" } | { kind: "error" } | { kind: "ok"; v: DailyRewardState }>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const busyRef = useRef(false);
  useEffect(() => {
    let alive = true;
    setSt({ kind: "loading" });
    AccessGateway.dailyReward().then((v) => { if (alive) setSt({ kind: "ok", v }); }, () => { if (alive) setSt({ kind: "error" }); });
    return () => { alive = false; };
  }, [attempt]);

  if (st.kind === "loading") return <Splash />;
  if (st.kind === "error") return <div className="state" role="alert">Não foi possível carregar.<button className="state-btn" onClick={() => setAttempt((n) => n + 1)}>Tentar novamente</button></div>;
  const r = st.v;
  const today = r.ciclo.find((d) => d.dia === r.dia) || r.ciclo[0];
  const claim = async () => {
    if (busyRef.current || r.recebidaHoje) return;
    busyRef.current = true; setBusy(true); setMsg(null);
    try {
      const res = await AccessGateway.claimDailyReward();
      if (res.ok) {
        setMsg({ ok: true, text: `Recompensa recebida: ${res.detalhe}.` });
        onClaimed();
      } else {
        setMsg({ ok: false, text: res.motivo === "ja-recebida" ? "A recompensa de hoje já foi recebida." : "Não foi possível receber agora. Tente de novo." });
      }
      const v = await AccessGateway.dailyReward();
      setSt({ kind: "ok", v });
    } catch {
      setMsg({ ok: false, text: "Não foi possível receber agora. Tente de novo." });
    } finally {
      busyRef.current = false; setBusy(false);
    }
  };

  return (
    <div className="ac rw">
      <header className="sub-head">
        <button type="button" className="back-btn back-btn--bare" onClick={() => goBackTo(`${BASE}/`)} aria-label="Voltar"><IconBack /></button>
        <Wordmark />
        <span className="sub-head-ctx">Recompensa</span>
      </header>
      <h1 className="screen-title">Bom ter você aqui.</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">Sua sequência de recompensas.</p>
      <ol className="rw-days" aria-label={`Sequência: dia ${r.dia} de 7`}>
        {r.ciclo.map((d) => {
          const done = d.dia < r.dia || (r.recebidaHoje && d.dia === r.dia);
          const isToday = d.dia === r.dia;
          return (
            <li key={d.dia} className={`rw-day${isToday ? " is-today" : ""}${done ? " is-done" : ""}`} aria-current={isToday ? "date" : undefined}>
              <span className="rw-day-k">Dia</span>
              <b>{done && !isToday ? <IconCheck className="rw-day-ok" /> : d.dia}</b>
              <span className="sr-only">{done ? "recebido" : isToday ? "hoje" : ""}</span>
            </li>
          );
        })}
      </ol>
      <p className="rw-note">Sequência de 1 a 7 dias. Pular um dia recomeça do dia 1.</p>
      <section className="rw-today" aria-labelledby="rw-k">
        <h2 className="kicker-caps" id="rw-k">Recompensa do dia</h2>
        <p className="rw-title">{rewardTitle(today.tipo, today.valor)}</p>
        <p className="rw-sub">{rewardSub(today.tipo, today.valor)}</p>
      </section>
      <p className="rw-state" role="status" aria-live="polite">{msg && msg.ok ? msg.text : r.recebidaHoje ? "Já recebida hoje." : "Receba a recompensa de hoje."}</p>
      {msg && !msg.ok && <p className="inline-error rw-err" role="alert">{msg.text}</p>}
      <div className="ac-foot ac-foot--sticky rw-foot">
        {!r.recebidaHoje && <button type="button" className="cta" aria-disabled={busy || undefined} onClick={claim}>{busy ? "Recebendo…" : "Receber"}</button>}
        <button type="button" className="link-back" onClick={() => goBackTo(`${BASE}/`)}>Voltar ao clube</button>
      </div>
      <TabBar current="inicio" />
    </div>
  );
}
