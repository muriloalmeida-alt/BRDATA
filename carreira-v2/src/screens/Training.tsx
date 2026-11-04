// Fase 6 (plano de independência) — treino pela v2. Aberto pelo Início e
// pelo Elenco (decisão de 04/11):
// - /carreira/treino: Treinamento semanal (CAP03-T05, complemento 27 col. 1),
//   com a folha do dia (27 col. 2) e os modelos de semana;
// - /carreira/treino/condicao: Condição no treinamento (27 col. 3);
// - /carreira/treino/evolucao?id=: Evolução e condição física (CAP03-T06,
//   28 col. 1 e 2), lida do save.
// O treino tem tudo o que o jogo tem: sábado é dia de jogo, sexta e domingo
// são folgas protegidas (mudá-las mostra o aviso de risco), duração, treino
// individual e os 5 modelos de semana.
import { useState } from "react";
import { PrepGateway } from "../adapters/prep.ts";
import { RISK_FATIGUE, buildEvolution, dayLine, type TrainingData, type TrainingDay } from "../domain/prep.ts";
import { shortName } from "../domain/lineup.ts";
import type { Player } from "../domain/types.ts";
import { Jersey } from "../ui/components.tsx";
import { Sheet } from "../ui/dialog.tsx";
import { IconAlert, IconCheck, IconChevron } from "../ui/icons.tsx";
import { BASE, Link, goBackTo } from "../ui/router.tsx";
import { Head, Loading, errText, useRead } from "./Tactics.tsx";
import "./home.css";
import "./calendar.css";
import "./week.css";
import "./prep.css";

const TR = `${BASE}/treino`;

function ApplyButton({ applied, onApplied }: { applied: boolean; onApplied: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    if (busy || applied) return;
    setBusy(true); setErr(null);
    const r = await PrepGateway.applyTraining();
    setBusy(false);
    if (r.ok) onApplied(r.evoluiram ? `Treino aplicado: ${r.evoluiram} ${r.evoluiram === 1 ? "jogador evoluiu" : "jogadores evoluíram"}.` : "Treino aplicado: semana de descanso, condição recuperada.");
    else if (r.motivo === "ja-aplicado") onApplied("O treino desta semana já foi aplicado.");
    else setErr(errText(r));
  };
  return (<>
    {err && <p className="inline-error" role="alert">{err}</p>}
    <button type="button" className="cta" aria-disabled={busy || applied || undefined} onClick={go}>{applied ? "Treino da semana já aplicado" : busy ? "Aplicando…" : "Aplicar treino da semana"}</button>
  </>);
}
function Seg<T extends string>({ label, options, value, onChange, disabled }: { label: string; options: [T, string][]; value: T; onChange: (v: T) => void; disabled?: boolean }) {
  const id = `seg-${label.replace(/\W/g, "")}`;
  return (
    <div className="pr-field">
      <span className="pr-label" id={id}>{label}</span>
      <div className="pr-seg" role="radiogroup" aria-labelledby={id}>
        {options.map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} disabled={disabled} className={`pr-seg-btn${value === v ? " is-on" : ""}`} onClick={() => onChange(v)}>{l}</button>
        ))}
      </div>
    </div>
  );
}

// ---------- Folha do dia ----------
function DaySheet({ day, data, onClose, onSaved }: { day: TrainingDay; data: TrainingData; onClose: () => void; onSaved: () => void }) {
  const rest0 = day.foco === "descanso";
  const [foco, setFoco] = useState<string>(day.foco);
  const [intensidade, setInt] = useState<string>(day.intensidade || "moderada");
  const [grupo, setGrupo] = useState<string>(day.grupo || "principal");
  const [duracao, setDur] = useState<number>(day.duracao || data.duracao.padrao[day.intensidade || "moderada"] || 60);
  const [jogador, setJogador] = useState<string | null>(day.jogador);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rest = foco === "descanso";
  const warn = day.protegido && !rest;
  const save = async () => {
    if (busy) return;
    if (!rest && grupo === "individual" && !jogador) { setErr("Escolha o jogador do treino individual."); return; }
    setBusy(true); setErr(null);
    const r = await PrepGateway.saveDay(day.dia, rest ? { foco } : { foco, intensidade, grupo, duracao, jogador: grupo === "individual" ? jogador : null });
    setBusy(false);
    if (r.ok) onSaved(); else setErr(errText(r));
  };
  return (
    <Sheet labelledBy="dy-t" onDismiss={busy ? undefined : onClose}>
      <h2 id="dy-t" className="sheet-title">Treino de {day.nome.toLowerCase()}.</h2>
      <span className="tb-bar pr-sheet-bar" aria-hidden="true" />
      <p className="wk-sheet-text">Escolha como o grupo vai treinar.</p>
      <div className="sheet-list pr-day">
        {warn && <p className="pr-warn" role="note"><IconAlert className="pr-warn-ico" />Você está ocupando uma folga protegida ({day.dia === 4 ? "véspera do" : "dia seguinte ao"} jogo): risco maior de fadiga e lesão.</p>}
        <Seg label="Foco" options={[["tecnico", "Técnico"], ["fisico", "Físico"], ["tatico", "Tático"], ["descanso", "Descanso"]]} value={foco} onChange={(v) => { setFoco(v); setErr(null); }} />
        <Seg label="Intensidade" disabled={rest} options={[["leve", "Leve"], ["moderada", "Moderada"], ["intensa", "Intensa"]]} value={intensidade} onChange={(v) => { setInt(v); setDur(data.duracao.padrao[v] || 60); }} />
        {!rest && (
          <div className="pr-field">
            <span className="pr-label" id="dy-d">Duração</span>
            <div className="pr-stepper" role="group" aria-labelledby="dy-d">
              <button type="button" className="pr-step" aria-label="Diminuir duração" disabled={duracao <= data.duracao.min} onClick={() => setDur(Math.max(data.duracao.min, duracao - data.duracao.passo))}>−</button>
              <span className="pr-step-val" aria-live="polite">{duracao} min</span>
              <button type="button" className="pr-step" aria-label="Aumentar duração" disabled={duracao >= data.duracao.max} onClick={() => setDur(Math.min(data.duracao.max, duracao + data.duracao.passo))}>+</button>
            </div>
          </div>
        )}
        <Seg label="Grupo" disabled={rest} options={[["principal", "Elenco"], ["misto", "Misto"], ["individual", "Individual"]]} value={grupo} onChange={setGrupo} />
        {!rest && grupo === "misto" && <p className="wk-note">Misto: elenco principal com o Sub-20.</p>}
        {!rest && grupo === "individual" && (
          <div className="pr-field">
            <span className="pr-label" id="dy-j">Jogador</span>
            <div className="pr-players" role="radiogroup" aria-labelledby="dy-j">
              {data.elenco.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={jogador === p.id} className={`sheet-opt pr-opt${jogador === p.id ? " is-on" : ""}`} onClick={() => { setJogador(p.id); setErr(null); }}>
                  <span>{shortName(p.nome)}<small>{p.posicao} · {p.condicao}%</small></span>{jogador === p.id && <IconCheck className="sheet-check" />}
                </button>
              ))}
            </div>
          </div>
        )}
        {rest0 && !rest && <p className="wk-note">Era {day.protegido ? "folga protegida" : "descanso"}.</p>}
      </div>
      {err && <p className="inline-error" role="alert">{err}</p>}
      <button type="button" className="cta" aria-disabled={busy || undefined} onClick={save}>{busy ? "Salvando…" : "Salvar dia"}</button>
      <button type="button" className="text-btn" disabled={busy} onClick={onClose}>Voltar ao treino</button>
    </Sheet>
  );
}

// ---------- Treinamento semanal ----------
export function TrainingWeek({ onChanged }: { onChanged: () => void }) {
  const [data, reload] = useRead(PrepGateway.training);
  const [day, setDay] = useState<TrainingDay | null>(null);
  const [models, setModels] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return <Loading data={data}>{() => {
    const d = data as TrainingData;
    const model = d.modelos.find((m) => m.id === d.modelo);
    const done = (m: string | null) => { setMsg(m); reload(); onChanged(); };
    return (
      <div className="wk pr">
        <Head ctx="Treino" back={`${BASE}/`} />
        <h1 className="screen-title">Prepare a semana.</h1>
        <span className="tb-bar" aria-hidden="true" />
        <p className="screen-sub">Defina foco, intensidade e grupo.</p>
        <section className="wk-sec" aria-labelledby="tr-k">
          <h2 className="kicker-caps" id="tr-k">Esquema da semana</h2>
          <button type="button" className="row pr-row" onClick={() => setModels(true)}><span className="row-body"><span className="row-title">Modelo da semana</span></span><span className="row-sub pr-val">{model ? model.nome : "Personalizado"}</span><IconChevron className="row-chevron" /></button>
          {d.dias.map((x) => {
            const l = dayLine(x, d.elenco);
            return l.editable ? (
              <button key={x.dia} type="button" className="row pr-row" onClick={() => setDay(x)} aria-label={`${x.nome}: ${l.value}. Editar`}>
                <span className="row-body"><span className="row-title">{x.nome}</span></span>
                <span className={`row-sub pr-val${l.warn ? " pr-val--warn" : ""}`}>{l.warn && <IconAlert className="pr-mini-ico" />}{l.value}</span><IconChevron className="row-chevron" />
              </button>
            ) : (
              <div key={x.dia} className="row pr-row pr-row--fixed"><span className="row-body"><span className="row-title">{x.nome}</span></span><span className="row-sub pr-val">{l.value}</span></div>
            );
          })}
        </section>
        <section className="wk-sec" aria-labelledby="tr-s">
          <h2 className="kicker-caps" id="tr-s">Elenco nesta semana</h2>
          <dl className="wk-list">
            <div className="wk-item"><dt>Fadiga média</dt><dd className={d.resumo.fadigaMedia >= 70 ? "is-neg" : undefined}>{d.resumo.fadigaMedia}%</dd></div>
            <div className="wk-item"><dt>Moral do elenco</dt><dd className={d.resumo.moral < 50 ? "is-neg" : undefined}>{d.resumo.moral}%</dd></div>
            <div className="wk-item"><dt>Folgas protegidas</dt><dd className={d.resumo.folgas < 2 ? "is-neg" : undefined}>{d.resumo.folgas}/2</dd></div>
          </dl>
          <Link className="row pr-row" to={`${TR}/condicao`}><span className="row-body"><span className="row-title">Elenco — condição física</span></span><span className="row-sub pr-val">Ver</span><IconChevron className="row-chevron" /></Link>
        </section>
        <div className="cal-foot">
          <p className="sr-only" role="status" aria-live="polite">{msg || ""}</p>
          {msg && <p className="pr-ok" aria-hidden="true">{msg}</p>}
          <ApplyButton applied={d.aplicado} onApplied={done} />
          <button type="button" className="link-back" onClick={() => goBackTo(`${BASE}/`)}>Voltar ao clube</button>
        </div>
        {day && <DaySheet key={day.dia} day={day} data={d} onClose={() => setDay(null)} onSaved={() => { setDay(null); done(`Treino de ${day.nome.toLowerCase()} salvo.`); }} />}
        {models && (
          <Sheet labelledBy="md-t" onDismiss={busy ? undefined : () => setModels(false)}>
            <h2 id="md-t" className="sheet-title">Modelo da semana</h2>
            <p className="wk-sheet-text">Troca o plano dos dias de treino. Sábado (jogo) e as folgas de sexta e domingo continuam.</p>
            <div className="sheet-list" role="radiogroup" aria-labelledby="md-t">
              {d.modelos.map((m) => (
                <button key={m.id} type="button" role="radio" aria-checked={d.modelo === m.id} disabled={busy} className={`sheet-opt pr-opt${d.modelo === m.id ? " is-on" : ""}`} data-autofocus={d.modelo === m.id || undefined}
                  onClick={async () => { setBusy(true); setErr(null); const r = await PrepGateway.applyModel(m.id); setBusy(false); if (r.ok) { setModels(false); done(`Modelo “${m.nome}” aplicado.`); } else setErr(errText(r)); }}>
                  <span>{m.nome}<small>{m.descricao}</small></span>{d.modelo === m.id && <IconCheck className="sheet-check" />}
                </button>
              ))}
            </div>
            {err && <p className="inline-error" role="alert">{err}</p>}
            <button type="button" className="text-btn" disabled={busy} onClick={() => setModels(false)}>Cancelar</button>
          </Sheet>
        )}
      </div>
    );
  }}</Loading>;
}

// ---------- Condição no treinamento ----------
export function TrainingCondition({ onChanged }: { onChanged: () => void }) {
  const [data, reload] = useRead(PrepGateway.training);
  const [msg, setMsg] = useState<string | null>(null);
  return <Loading data={data}>{() => {
    const d = data as TrainingData;
    const list = d.elenco.slice().sort((a, b) => a.condicao - b.condicao);
    return (
      <div className="wk pr">
        <Head ctx="Treino" back={TR} />
        <h1 className="screen-title">Cuide do elenco.</h1>
        <span className="tb-bar" aria-hidden="true" />
        <p className="screen-sub">Condição física antes do treino.</p>
        <section className="wk-sec" aria-labelledby="cd-k">
          <h2 className="kicker-caps" id="cd-k">Elenco — condição física</h2>
          <ul className="pr-plist">
            {list.map((p) => {
              const risk = p.fadigaProjetada >= RISK_FATIGUE;
              return (
                <li key={p.id}>
                  <Link className="row pr-prow" to={`${TR}/evolucao?id=${encodeURIComponent(p.id)}`}>
                    <Jersey value="" size={40} />
                    <span className="row-body"><span className="row-title">{shortName(p.nome)}</span><span className="row-sub">{p.posicao}</span></span>
                    <IconChevron className="row-chevron" />
                  </Link>
                  <div className="wk-item"><dt>Condição</dt><dd>{p.condicao}%</dd></div>
                  {risk && <p className="pr-risk"><IconAlert className="pr-mini-ico" />Risco de lesão: chega a {p.fadigaProjetada}% de fadiga com o treino desta semana.</p>}
                </li>
              );
            })}
          </ul>
        </section>
        <div className="cal-foot">
          <p className="sr-only" role="status" aria-live="polite">{msg || ""}</p>
          {msg && <p className="pr-ok" aria-hidden="true">{msg}</p>}
          <ApplyButton applied={d.aplicado} onApplied={(m) => { setMsg(m); reload(); onChanged(); }} />
          <button type="button" className="link-back" onClick={() => goBackTo(TR)}>Voltar ao treino</button>
        </div>
      </div>
    );
  }}</Loading>;
}

// ---------- Evolução e condição física ----------
export function Evolution({ player }: { player: Player }) {
  const m = buildEvolution(player);
  return (
    <div className="wk pr">
      <Head ctx="Evolução" back={`${TR}/condicao`} />
      <h1 className="screen-title">{m.empty ? "O histórico vem aí." : "Veja a evolução."}</h1>
      <span className="tb-bar" aria-hidden="true" />
      <p className="screen-sub">{m.empty ? "A evolução aparece conforme você joga." : "Acompanhe fadiga e desenvolvimento."}</p>
      <section className="wk-sec">
        <Link className="row pr-prow" to={`${BASE}/elenco/jogador?id=${encodeURIComponent(player.id)}`}>
          <Jersey value="" size={40} />
          <span className="row-body"><span className="row-title">{m.name}</span><span className="row-sub">{m.position}</span></span>
          <IconChevron className="row-chevron" />
        </Link>
        <dl className="wk-list">
          <div className="wk-item"><dt>Condição atual</dt><dd>{m.condition}</dd></div>
          {m.empty && <div className="wk-item"><dt>Overall · potencial</dt><dd>{m.potential}</dd></div>}
        </dl>
        {m.empty && <p className="wk-note">Ainda não há histórico de fadiga ou evolução.</p>}
      </section>
      {m.fatigue.length > 0 && (
        <section className="wk-sec" aria-labelledby="ev-f"><h2 className="kicker-caps" id="ev-f">Fadiga por rodada</h2>
          <dl className="wk-list">{m.fatigue.map((f) => <div key={f.label} className="wk-item"><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl></section>
      )}
      {!m.empty && (
        <section className="wk-sec" aria-labelledby="ev-o"><h2 className="kicker-caps" id="ev-o">Overall por temporada</h2>
          <dl className="wk-list">
            {m.seasons.map((s) => <div key={s.label} className="wk-item"><dt>{s.label}</dt><dd>{s.value}</dd></div>)}
            <div className="wk-item"><dt>Overall atual · potencial</dt><dd>{m.potential}</dd></div>
          </dl>
          {!m.seasons.length && <p className="wk-note">O overall de cada temporada aparece a partir da próxima virada.</p>}
        </section>
      )}
      {m.injuries.length > 0 && (
        <section className="wk-sec" aria-labelledby="ev-l"><h2 className="kicker-caps" id="ev-l">Lesões recentes</h2>
          <dl className="wk-list">{m.injuries.map((f, i) => <div key={i} className="wk-item"><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl></section>
      )}
      <div className="cal-foot"><button type="button" className="link-back" onClick={() => goBackTo(`${TR}/condicao`)}>Voltar</button></div>
    </div>
  );
}

