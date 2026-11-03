// Login dentro da v2 (folha), compartilhado: sessão expirada em qualquer
// tela (CAP07-T06, pranchas 20 col. 3 e 21 col. 1) e "Entre para salvar" o
// resultado da partida (AUD-02). Só aceita a MESMA conta da carreira aberta:
// com outra, avisa ("Esta carreira é de outra conta.") e não segue.
// Mesmo POST /api/auth/login da versão anterior, com a mesma regra de
// pagamento pendente.
import { useState, type FormEvent } from "react";
import { SessionGateway } from "../adapters/gateways.ts";
import { Sheet } from "./dialog.tsx";

export function LoginSheet({ account, title = "Sua sessão expirou.", lead = "Entre novamente para continuar.", note = "Use a mesma conta desta carreira.",
  submitLabel = "Entrar", wrongAccount = "Esta carreira é de outra conta.", onClose, onLoggedIn }: {
  account: string | null; title?: string; lead?: string; note?: string | null; submitLabel?: string; wrongAccount?: string;
  // Sem onClose a folha é bloqueante (não fecha por Escape/fundo).
  onClose?: () => void; onLoggedIn: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) { setError("Informe e-mail e senha."); return; }
    setBusy(true); setError(null);
    try {
      const r = await SessionGateway.login(email.trim(), password);
      if ("error" in r) { setError(r.error); return; }
      if (!account || r.user.id !== account) { setError(wrongAccount); return; }
      onLoggedIn();
    } catch {
      setError("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet labelledBy="lg-t" describedBy="lg-d" onDismiss={busy || !onClose ? undefined : onClose}>
      <h2 id="lg-t" className="sheet-title">{title}</h2>
      <p id="lg-d" className="lv-text">{lead}{note ? <><br />{note}</> : null}</p>
      <form className="lg-form" onSubmit={submit} noValidate>
        <label className="lg-field"><span>E-mail</span>
          <input type="email" inputMode="email" autoComplete="username" autoCapitalize="off" spellCheck={false} placeholder="seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} data-autofocus />
        </label>
        <label className="lg-field"><span>Senha</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <button type="submit" className="cta" disabled={busy}>{busy ? "Entrando…" : submitLabel}</button>
      </form>
      {onClose && <button type="button" className="text-btn" disabled={busy} onClick={onClose}>Cancelar</button>}
    </Sheet>
  );
}
