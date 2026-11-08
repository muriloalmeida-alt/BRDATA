/* ===================================================================
   MOTOR — EVENTOS (plano "sem página escondida", etapa C1, 09/11)
   -------------------------------------------------------------------
   A lógica do jogo não chama a tela: ela emite eventos, e quem quiser
   mostrar alguma coisa ouve (decisão de 09/11). Hoje a página antiga
   ouve "aviso" e mostra o toast de sempre; a v2 pode ouvir também.

   Tipos em uso:
     "aviso" — { titulo, detalhe, tipo }  (ex.: objetivo concluído,
               conquista desbloqueada; tipo "pos" | "warn" | null)
=================================================================== */
const ouvintes = new Map(); // tipo -> Set(fn)

// Passa a ouvir `tipo`. Devolve a função que para de ouvir.
export function ouvir(tipo, fn) {
  if (!ouvintes.has(tipo)) ouvintes.set(tipo, new Set());
  ouvintes.get(tipo).add(fn);
  return () => ouvintes.get(tipo).delete(fn);
}

// Avisa todos que ouvem `tipo`. Um ouvinte com erro não impede os outros
// nem a lógica que emitiu.
export function emitir(tipo, dados) {
  const lista = ouvintes.get(tipo);
  if (!lista) return;
  for (const fn of [...lista]) {
    try { fn(dados); } catch (err) { console.error(`[eventos] ouvinte de "${tipo}" falhou:`, err); }
  }
}
