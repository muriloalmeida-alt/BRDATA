export function Loading({ label = "Carregando sua carreira…" }: { label?: string }) {
  return <div className="state" role="status" aria-live="polite"><div><div className="spinner" /><p className="muted" style={{ marginTop: 16 }}>{label}</p></div></div>;
}
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="state" role="alert"><div>
      <h1>Não foi possível carregar</h1>
      <p className="muted">{message}</p>
      <button className="btn-primary" onClick={onRetry}>Tentar novamente</button>
    </div></div>
  );
}
// Sem carreira salva: a criação de carreira (competição/clube) ainda é do
// jogo atual nesta fatia — link honesto pra lá, sem fluxo inventado.
export function NoCareer() {
  return (
    <div className="state"><div>
      <h1>Nenhuma carreira ativa</h1>
      <p className="muted">Comece uma carreira escolhendo competição e clube. Nesta versão de testes, a criação ainda acontece no Modo Carreira atual.</p>
      <a className="btn-primary" href="/carreira.html">Começar no Modo Carreira</a>
    </div></div>
  );
}
