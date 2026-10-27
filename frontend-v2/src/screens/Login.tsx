import { useState } from "react";
import { SessionGateway } from "../adapters/gateways";
import { HttpError } from "../adapters/http";

export function Login({ onLogged }: { onLogged: () => void }) {
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return; // evita envio duplo (double tap)
    if (!email.trim() || !password) { setError("Informe e-mail e senha."); return; }
    setBusy(true); setError(null);
    try { await SessionGateway.login(email.trim(), password); onLogged(); }
    catch (err) { setError(err instanceof HttpError ? err.message : "Sem conexão. Tente de novo."); }
    finally { setBusy(false); }
  }
  return (
    <main className="login">
      <div className="login-card">
        <div className="login-brand">
          <img src="/img/brand-icon.png" alt="" />
          <b>BR<span>DATA</span></b>
          <small>MODO CARREIRA</small>
        </div>
        <h1 style={{ font: "700 26px/1.1 var(--font-ui)", margin: "0 0 24px" }}>Bem-vindo de volta!</h1>
        <form onSubmit={submit} noValidate>
          <label className="field"><span>E-mail</span>
            <input type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field"><span>Senha</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn-primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? "Entrando…" : "Entrar"}</button>
        </form>
        <p className="login-foot muted">Não tem uma conta? <a href="/?signup=1">Cadastre-se no BR Data</a></p>
      </div>
    </main>
  );
}
