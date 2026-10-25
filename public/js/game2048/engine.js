/* ===================================================================
   BRDATA 2048 — motor de regras (GAME-2048-001, ver docs/HANDOFF_CLAUDE.md)

   Puro: sem DOM, sem Math.random, sem mutação do estado recebido.
   Toda aleatoriedade vem de um PRNG com seed (mulberry32) cujo estado
   interno fica DENTRO do estado do jogo — mesma seed + mesmas jogadas =
   mesma partida (CLAUDE.md §12/§44). Isso permite testar em Node e,
   no futuro, validar uma partida no servidor por replay.

   Estado:
     { size, cells: (null|{id,value})[size*size], rng, nextId,
       score, moves, won, keepPlaying, over, seed }
   cells é linha a linha (índice = row*size + col).
=================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Game2048Engine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const WIN_VALUE = 2048;
  const FOUR_CHANCE = 0.1;
  const DIRECTIONS = ["up", "down", "left", "right"];

  // mulberry32 — retorna [número em [0,1), próximo estado uint32].
  function rngNext(s) {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
  }

  function cloneState(state) {
    return Object.assign({}, state, {
      cells: state.cells.map((c) => (c ? { id: c.id, value: c.value } : null)),
    });
  }

  // Nasce 1 peça numa casa vazia (muta `state`, que já deve ser cópia).
  function spawnInPlace(state) {
    const empties = [];
    state.cells.forEach((c, i) => { if (!c) empties.push(i); });
    if (!empties.length) return null;
    let r;
    [r, state.rng] = rngNext(state.rng);
    const pos = empties[Math.floor(r * empties.length)];
    [r, state.rng] = rngNext(state.rng);
    const tile = { id: state.nextId++, value: r < FOUR_CHANCE ? 4 : 2 };
    state.cells[pos] = tile;
    return { id: tile.id, value: tile.value, pos };
  }

  function newGame(seed, size) {
    size = size || 4;
    const s = (seed === undefined ? (Date.now() ^ 0x9e3779b9) : seed) >>> 0;
    const state = {
      size, cells: new Array(size * size).fill(null), rng: s, seed: s,
      nextId: 1, score: 0, moves: 0, won: false, keepPlaying: false, over: false,
    };
    spawnInPlace(state);
    spawnInPlace(state);
    return state;
  }

  // Índices de cada linha, ordenados a partir da borda para onde se desliza.
  function lines(size, dir) {
    const out = [];
    for (let a = 0; a < size; a++) {
      const line = [];
      for (let b = 0; b < size; b++) {
        if (dir === "left") line.push(a * size + b);
        else if (dir === "right") line.push(a * size + (size - 1 - b));
        else if (dir === "up") line.push(b * size + a);
        else line.push((size - 1 - b) * size + a);
      }
      out.push(line);
    }
    return out;
  }

  function hasMoves(state) {
    const { size, cells } = state;
    for (let i = 0; i < cells.length; i++) {
      if (!cells[i]) return true;
      const col = i % size;
      if (col < size - 1 && cells[i + 1] && cells[i + 1].value === cells[i].value) return true;
      if (i + size < cells.length && cells[i + size] && cells[i + size].value === cells[i].value) return true;
    }
    return false;
  }

  /* Aplica uma jogada. Retorna:
       { state, moved, gained, moves: [{id, from, to}], merges: [{id, value, pos, from:[idA,idB]}], spawned }
     `moves` lista toda peça antiga e para onde ela foi (inclusive as que
     somem numa fusão — `to` é a casa da fusão); a UI usa isso para animar.
     Jogada inválida (nada se mexe): moved=false, estado devolvido é o
     mesmo objeto, nenhuma peça nasce. */
  function move(state, dir) {
    if (DIRECTIONS.indexOf(dir) === -1) throw new Error("direção inválida: " + dir);
    const result = { state, moved: false, gained: 0, moves: [], merges: [], spawned: null };
    if (state.over) return result;
    const next = cloneState(state);
    const cells = new Array(next.cells.length).fill(null);

    for (const line of lines(next.size, dir)) {
      let target = 0;            // próxima casa livre da linha
      let last = null;           // última peça colocada que ainda pode fundir
      for (const idx of line) {
        const tile = next.cells[idx];
        if (!tile) continue;
        if (last && last.tile.value === tile.value) {
          const value = tile.value * 2;
          const merged = { id: next.nextId++, value };
          cells[last.pos] = merged;
          result.moves.push({ id: tile.id, from: idx, to: last.pos });
          result.merges.push({ id: merged.id, value, pos: last.pos, from: [last.tile.id, tile.id] });
          result.gained += value;
          if (idx !== last.pos) result.moved = true;
          last = null; // a peça fundida não funde de novo nesta jogada
        } else {
          const pos = line[target++];
          cells[pos] = tile;
          result.moves.push({ id: tile.id, from: idx, to: pos });
          if (idx !== pos) result.moved = true;
          last = { tile, pos };
        }
      }
    }

    if (!result.moved) { result.moves = []; result.merges = []; return result; }

    next.cells = cells;
    next.score += result.gained;
    next.moves += 1;
    if (!next.won && result.merges.some((m) => m.value >= WIN_VALUE)) next.won = true;
    result.spawned = spawnInPlace(next);
    next.over = !hasMoves(next);
    result.state = next;
    return result;
  }

  function maxTile(state) {
    return state.cells.reduce((m, c) => (c && c.value > m ? c.value : m), 0);
  }

  // Valida um estado vindo de armazenamento (localStorage pode estar
  // corrompido ou ser de outra versão) — CLAUDE.md §33.
  function isValidState(s) {
    if (!s || typeof s !== "object") return false;
    if (!Number.isInteger(s.size) || s.size < 2 || s.size > 8) return false;
    if (!Array.isArray(s.cells) || s.cells.length !== s.size * s.size) return false;
    const ids = new Set();
    for (const c of s.cells) {
      if (c === null) continue;
      if (!c || !Number.isInteger(c.id) || !Number.isInteger(c.value)) return false;
      if (c.value < 2 || (c.value & (c.value - 1)) !== 0) return false;
      if (ids.has(c.id) || c.id >= s.nextId) return false;
      ids.add(c.id);
    }
    return Number.isInteger(s.nextId) && Number.isFinite(s.score) && s.score >= 0 &&
      Number.isInteger(s.rng) && Number.isInteger(s.moves) &&
      typeof s.won === "boolean" && typeof s.keepPlaying === "boolean" && typeof s.over === "boolean";
  }

  // Monta um estado a partir de uma matriz de valores (testes/depuração).
  function fromGrid(grid, opts) {
    opts = opts || {};
    const size = grid.length;
    const state = {
      size, cells: [], rng: (opts.seed || 1) >>> 0, seed: (opts.seed || 1) >>> 0,
      nextId: 1, score: opts.score || 0, moves: 0, won: false, keepPlaying: false, over: false,
    };
    for (const row of grid) for (const v of row) state.cells.push(v ? { id: state.nextId++, value: v } : null);
    state.won = maxTile(state) >= WIN_VALUE;
    state.over = !hasMoves(state);
    return state;
  }

  function toGrid(state) {
    const g = [];
    for (let r = 0; r < state.size; r++) {
      g.push(state.cells.slice(r * state.size, (r + 1) * state.size).map((c) => (c ? c.value : 0)));
    }
    return g;
  }

  return { WIN_VALUE, DIRECTIONS, newGame, move, hasMoves, maxTile, isValidState, fromGrid, toGrid };
});
