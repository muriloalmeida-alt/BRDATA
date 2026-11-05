// Tutorial de boas-vindas e assistente de início (item 1 do diagnóstico de
// 05/11, P8; telas sem prancha, no padrão da v2).
//  - Tutorial: 4 telas, só na 1ª carreira da conta; "Pular" e "Começar" dão
//    no mesmo (POST /api/account/onboarding-seen, como closeOnboardingOverlay).
//  - Assistente: sequência guiada pelas telas que a v2 já tem (Escalação,
//    Comissão, Contratar olheiro, Instruções táticas), com a barra
//    "Passo N de 4" + "Continuar" / "Pular esta etapa". No fim, o mesmo
//    startupWizardSeen = true de finishStartupWizard.
import { useRef, useState } from "react";
import { MoreGateway } from "../adapters/more.ts";
import { TUTORIAL, WIZARD, wizardUrl, type Slide, type WizardStep } from "../domain/onboarding.ts";
import { Wordmark } from "../ui/components.tsx";
import { navigate } from "../ui/router.tsx";
import "./onboarding.css";

const ICONS: Record<Slide["icon"], JSX.Element> = {
  escudo: <><path d="M12 2 3 7v6c0 5 4 8.5 9 9 5-.5 9-4 9-9V7l-9-5Z" /><path d="M9 12l2 2 4-4" /></>,
  grade: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  play: <><circle cx="12" cy="12" r="9" /><polygon points="10 8 16 12 10 16 10 8" /></>,
  taca: <><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3a2 2 0 0 1-2 4M7 5H4a2 2 0 0 0 2 4" /></>,
};

export function Tutorial({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const s = TUTORIAL[i];
  const last = i === TUTORIAL.length - 1;
  const finish = async () => {
    if (busy) return;
    setBusy(true);
    // Mesmo se falhar, não trava a entrada (como na versão anterior): só
    // reapareceria na próxima abertura.
    await MoreGateway.tutorialSeen();
    onDone();
  };
  return (
    <div className="ac ob">
      <header className="ac-head"><Wordmark /><span /><button type="button" className="link-back ob-skip" onClick={finish}>Pular</button></header>
      <div className="ob-body">
        <svg className="ob-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[s.icon]}</svg>
        <h1 className="ac-title ac-title--center ob-title" data-screen-title>{s.title}</h1>
        <p className="ob-text">{s.text}</p>
        <ol className="ob-dots" aria-label={`Tela ${i + 1} de ${TUTORIAL.length}`}>
          {TUTORIAL.map((_, k) => <li key={k} className={k === i ? "is-on" : ""} aria-current={k === i ? "step" : undefined} />)}
        </ol>
      </div>
      <div className="ac-foot ac-foot--sticky">
        <button type="button" className="cta" aria-disabled={busy || undefined} onClick={() => (last ? finish() : setI(i + 1))}>{last ? "Começar" : "Avançar"}</button>
      </div>
    </div>
  );
}

// Passo 4 (Instruções táticas): "Começar a temporada" aplica as instruções
// escolhidas antes de terminar, como o "Continuar" da versão anterior. A
// tela registra aqui a própria gravação enquanto está aberta no assistente.
let applyStep: null | (() => Promise<boolean>) = null;
export function registerWizardApply(fn: null | (() => Promise<boolean>)) { applyStep = fn; }

export function WizardBar({ step, onFinished }: { step: WizardStep; onFinished: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const busyRef = useRef(false);
  const last = step.n === WIZARD.length;
  const finish = async () => {
    const r = await MoreGateway.wizardDone();
    if (!r.ok) { setErr("Não foi possível concluir agora. Tente de novo."); return; }
    onFinished();
  };
  const go = async (apply: boolean) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setErr(null);
    try {
      if (apply && last && applyStep && !(await applyStep())) { setErr("Não foi possível salvar as instruções. Tente de novo."); return; }
      if (last) await finish();
      else navigate(wizardUrl(step.n + 1), { replace: true });
    } finally {
      busyRef.current = false; setBusy(false);
    }
  };
  return (
    <aside className="wz" aria-label="Assistente de início">
      <p className="wz-k">Assistente de início · Passo {step.n} de {WIZARD.length}</p>
      <p className="wz-t">{step.title}</p>
      {err && <p className="inline-error wz-err" role="alert">{err}</p>}
      <div className="wz-actions">
        <button type="button" className="link-back wz-skip" disabled={busy} onClick={() => go(false)}>Pular esta etapa</button>
        <button type="button" className="cta wz-next" aria-disabled={busy || undefined} onClick={() => go(true)}>{busy ? "Aguarde…" : last ? "Começar a temporada" : "Continuar"}</button>
      </div>
    </aside>
  );
}
