// Testes unitários do motor do BRDATA 2048 (GAME-2048-001).
// Uso: node tests/unit/test_game2048_engine.js   (sai com 1 se algo falhar)
const assert = require("assert");
const E = require("../../public/js/game2048/engine.js");

let failed = 0, n = 0;
function check(name, fn) {
  n++;
  try { fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message}`); }
}

// Desliza uma única linha à esquerda e devolve a linha resultante
// (sem a peça que nasce: compara só as casas ocupadas pela jogada).
function slideRow(row) {
  const s = E.fromGrid([row, [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const r = E.move(s, "left");
  const ids = new Set(r.merges.map((m) => m.id).concat(r.moves.map((m) => m.id)));
  return { r, row: r.state.cells.slice(0, 4).map((c) => (c && (!r.spawned || c.id !== r.spawned.id) && ids.has(c.id) ? c.value : 0)) };
}

check("[2,2,2,2] ← vira [4,4,_,_]", () => assert.deepStrictEqual(slideRow([2, 2, 2, 2]).row, [4, 4, 0, 0]));
check("[2,2,2,_] ← vira [4,2,_,_]", () => assert.deepStrictEqual(slideRow([2, 2, 2, 0]).row, [4, 2, 0, 0]));
check("[4,4,8,_] ← vira [8,8,_,_] (8 novo não funde de novo)", () => assert.deepStrictEqual(slideRow([4, 4, 8, 0]).row, [8, 8, 0, 0]));
check("[_,2,_,2] ← vira [4,_,_,_]", () => assert.deepStrictEqual(slideRow([0, 2, 0, 2]).row, [4, 0, 0, 0]));
check("[2,4,2,4] ← não se mexe", () => assert.strictEqual(slideRow([2, 4, 2, 4]).r.moved, false));
check("pontuação soma valores criados ([2,2,4,4] → +12)", () => assert.strictEqual(slideRow([2, 2, 4, 4]).r.gained, 12));

check("direita prioriza a borda direita ([2,2,2,_] → [_,_,2,4])", () => {
  const s = E.fromGrid([[2, 2, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const r = E.move(s, "right");
  const row = r.state.cells.slice(0, 4).map((c) => (c && c.id !== r.spawned.id ? c.value : 0));
  assert.deepStrictEqual(row, [0, 0, 2, 4]);
});
check("cima e baixo funcionam por coluna", () => {
  const s = E.fromGrid([[2, 0, 0, 0], [2, 0, 0, 0], [4, 0, 0, 0], [4, 0, 0, 0]]);
  const up = E.move(s, "up");
  assert.deepStrictEqual([0, 4, 8, 12].map((i) => up.state.cells[i] && up.state.cells[i].id !== up.spawned.id ? up.state.cells[i].value : 0), [4, 8, 0, 0]);
  const down = E.move(s, "down");
  assert.deepStrictEqual([0, 4, 8, 12].map((i) => down.state.cells[i] && down.state.cells[i].id !== down.spawned.id ? down.state.cells[i].value : 0), [0, 0, 4, 8]);
});

check("jogada inválida não gera peça nem conta jogada", () => {
  const s = E.fromGrid([[2, 4, 8, 16], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const r = E.move(s, "up");
  assert.strictEqual(r.moved, false);
  assert.strictEqual(r.spawned, null);
  assert.strictEqual(r.state, s);
  assert.strictEqual(s.moves, 0);
});
check("jogada válida gera exatamente 1 peça (2 ou 4)", () => {
  const s = E.fromGrid([[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const r = E.move(s, "right");
  assert.ok(r.spawned && (r.spawned.value === 2 || r.spawned.value === 4));
  assert.strictEqual(r.state.cells.filter(Boolean).length, 2);
});
check("move não altera o estado recebido", () => {
  const s = E.fromGrid([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const before = JSON.stringify(s);
  E.move(s, "left");
  assert.strictEqual(JSON.stringify(s), before);
});

check("derrota: cheio e sem pares iguais", () => {
  const s = E.fromGrid([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]);
  assert.strictEqual(s.over, true);
  assert.strictEqual(E.hasMoves(s), false);
  for (const d of E.DIRECTIONS) assert.strictEqual(E.move(s, d).moved, false);
});
check("cheio com par adjacente vertical não é derrota", () => {
  const s = E.fromGrid([[2, 4, 2, 4], [2, 8, 4, 2], [4, 2, 8, 4], [8, 4, 2, 8]]);
  assert.strictEqual(s.over, false);
});
check("flag over sempre coincide com hasMoves após a jogada", () => {
  const s = E.fromGrid([[2, 2, 8, 16], [32, 64, 128, 256], [512, 1024, 4, 8], [16, 32, 64, 128]]);
  const r = E.move(s, "left");
  assert.strictEqual(r.state.over, !E.hasMoves(r.state));
});

check("vitória ao criar 2048 (won=true, continua jogável)", () => {
  const s = E.fromGrid([[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  assert.strictEqual(s.won, false);
  const r = E.move(s, "left");
  assert.strictEqual(r.state.won, true);
  assert.strictEqual(r.state.over, false);
  assert.strictEqual(E.maxTile(r.state), 2048);
});

check("determinismo: mesma seed + mesmas jogadas = mesmo tabuleiro", () => {
  const play = (seed) => {
    let s = E.newGame(seed);
    const dirs = ["left", "up", "right", "down"];
    for (let i = 0; i < 300 && !s.over; i++) s = E.move(s, dirs[i % 4]).state;
    return JSON.stringify(s);
  };
  assert.strictEqual(play(12345), play(12345));
  assert.notStrictEqual(play(12345), play(54321));
});
check("novo jogo começa com 2 peças", () => {
  for (let seed = 1; seed <= 50; seed++) assert.strictEqual(E.newGame(seed).cells.filter(Boolean).length, 2);
});
check("distribuição de nascimento ≈ 90% de 2 / 10% de 4", () => {
  let fours = 0, total = 0;
  for (let seed = 1; seed <= 2000; seed++) {
    for (const c of E.newGame(seed).cells) if (c) { total++; if (c.value === 4) fours++; }
  }
  const pct = fours / total;
  assert.ok(pct > 0.08 && pct < 0.12, `4s = ${(pct * 100).toFixed(1)}%`);
});
check("partida aleatória longa termina e mantém invariantes", () => {
  let s = E.newGame(777);
  let guard = 0, rng = 1;
  while (!s.over && guard++ < 5000) {
    rng = (rng * 1103515245 + 12345) >>> 0;
    const r = E.move(s, E.DIRECTIONS[(rng >>> 16) % 4]);
    if (r.moved) {
      assert.strictEqual(r.state.score, s.score + r.gained);
      assert.ok(E.isValidState(r.state));
    }
    s = r.state;
  }
  assert.ok(s.over, "a partida deveria terminar");
});

check("isValidState rejeita saves corrompidos", () => {
  const ok = E.newGame(1);
  assert.ok(E.isValidState(JSON.parse(JSON.stringify(ok))));
  assert.ok(!E.isValidState(null));
  assert.ok(!E.isValidState({}));
  assert.ok(!E.isValidState(Object.assign({}, ok, { cells: ok.cells.slice(1) })));
  const bad = JSON.parse(JSON.stringify(ok));
  bad.cells[bad.cells.findIndex(Boolean)].value = 3;
  assert.ok(!E.isValidState(bad));
});

console.log(failed ? `\n${failed}/${n} falharam` : `\n${n}/${n} ok`);
process.exit(failed ? 1 : 0);
