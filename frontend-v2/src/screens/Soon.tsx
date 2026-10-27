// Destinos ainda não migrados pra v2 (fases seguintes do plano): estado
// honesto, com caminho pro jogo atual — sem tela de mentira.
export function Soon({ title }: { title: string }) {
  return (
    <div className="state"><div>
      <h1>{title}</h1>
      <p className="muted">Esta área ainda está sendo reconstruída na nova versão. Por enquanto ela funciona no Modo Carreira atual.</p>
      <a className="btn-ghost" href="/carreira.html">Abrir no Modo Carreira atual</a>
    </div></div>
  );
}
