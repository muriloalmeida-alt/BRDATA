/* ===================================================================
   BRDATA 2048 — interface (GAME-2048-001, ver docs/HANDOFF_CLAUDE.md)

   Render em DOM: 16 casas de fundo (role="grid", com aria-label por
   casa) + camada de peças posicionadas por --r/--c (transform). Regras
   ficam todas em engine.js; aqui só input, animação, diálogos e
   persistência em localStorage (sem backend, sem ligação com CAREER).
=================================================================== */
(function () {
  "use strict";
  const E = window.Game2048Engine;
  const STORAGE_KEY = "brdata2048:v1";
  const SWIPE_MIN_PX = 24;
  const KEY_DIRS = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right",
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    board: $("board"), grid: $("grid"), tiles: $("tiles"), score: $("score"), best: $("best"),
    scoreCard: $("scoreCard"), hint: $("hint"), live: $("live"),
    dialog: $("dialog"), dialogTitle: $("dialogTitle"), dialogBody: $("dialogBody"), dialogActions: $("dialogActions"),
  };

  let state = null;
  let best = 0;
  let finishPending = null; // finaliza a animação da jogada anterior
  const tileEls = new Map(); // id → elemento
  const cellEls = [];
  const fmt = (n) => n.toLocaleString("pt-BR");

  // ---------- Persistência (CLAUDE.md §33: save ausente/corrompido não quebra) ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.schemaVersion !== 1) return null;
      return {
        best: Number.isFinite(data.best) && data.best >= 0 ? data.best : 0,
        state: E.isValidState(data.state) ? data.state : null,
      };
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, best, state })); }
    catch (e) { /* modo privado/armazenamento cheio: o jogo segue sem salvar */ }
  }

  // ---------- Render ----------
  function buildGrid(size) {
    els.grid.innerHTML = "";
    cellEls.length = 0;
    for (let r = 0; r < size; r++) {
      const row = document.createElement("div");
      row.setAttribute("role", "row");
      for (let c = 0; c < size; c++) {
        const cell = document.createElement("div");
        cell.className = "g-cell";
        cell.setAttribute("role", "gridcell");
        row.appendChild(cell);
        cellEls.push(cell);
      }
      els.grid.appendChild(row);
    }
  }

  function placeTile(el, pos) {
    el.style.setProperty("--r", Math.floor(pos / state.size));
    el.style.setProperty("--c", pos % state.size);
  }

  function makeTile(tile, pos, cls) {
    const el = document.createElement("div");
    const v = tile.value;
    el.className = "g-tile " + (v > 2048 ? "vbig" : "v" + v) + (cls ? " " + cls : "");
    el.dataset.len = String(v).length;
    el.dataset.value = v;
    el.innerHTML = `<div class="g-tile-inner">${v}</div>`;
    placeTile(el, pos);
    els.tiles.appendChild(el);
    tileEls.set(tile.id, el);
    return el;
  }

  // Reconcilia o DOM com `state`: remove peças que sumiram, cria as novas.
  function sync(created) {
    created = created || {};
    const alive = new Set();
    state.cells.forEach((tile, pos) => {
      const r = Math.floor(pos / state.size) + 1, c = (pos % state.size) + 1;
      cellEls[pos].setAttribute("aria-label", `Linha ${r}, coluna ${c}: ${tile ? tile.value : "vazia"}`);
      if (!tile) return;
      alive.add(tile.id);
      const el = tileEls.get(tile.id);
      if (el) { el.classList.remove("is-new", "is-merged"); placeTile(el, pos); }
      else makeTile(tile, pos, created[tile.id] || "");
    });
    for (const [id, el] of tileEls) if (!alive.has(id)) { el.remove(); tileEls.delete(id); }
    renderScore();
  }

  function renderScore(gained) {
    els.score.textContent = fmt(state.score);
    els.best.textContent = fmt(best);
    if (gained) {
      const g = document.createElement("span");
      g.className = "g-score-gain";
      g.textContent = "+" + gained;
      els.scoreCard.appendChild(g);
      g.addEventListener("animationend", () => g.remove());
      setTimeout(() => g.remove(), 800);
    }
  }

  function moveMs() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--g-move-ms")) || 0;
  }

  // ---------- Jogada ----------
  function play(dir) {
    if (els.dialog.open) return;
    if (finishPending) finishPending();
    const prev = state;
    const res = E.move(state, dir);
    if (!res.moved) {
      els.board.classList.remove("shake");
      void els.board.offsetWidth; // reinicia a animação
      els.board.classList.add("shake");
      return;
    }
    state = res.state;
    if (state.score > best) best = state.score;
    save();
    els.hint.textContent = "";

    // 1) peças antigas deslizam até o destino
    for (const m of res.moves) {
      const el = tileEls.get(m.id);
      if (el) placeTile(el, m.to);
    }
    // 2) depois do deslize: some quem fundiu, aparecem fundida + nova
    const created = {};
    for (const m of res.merges) created[m.id] = "is-merged";
    if (res.spawned) created[res.spawned.id] = "is-new";
    let done = false;
    finishPending = () => {
      if (done) return;
      done = true;
      finishPending = null;
      sync(created);
      renderScore(res.gained);
      announce(res);
      if (state.won && !prev.won && !state.keepPlaying) showWin();
      else if (state.over) showOver();
    };
    const ms = moveMs();
    if (ms > 0) setTimeout(() => finishPending && finishPending(), ms); else finishPending();
  }

  function announce(res) {
    let msg = res.gained ? `Mais ${res.gained} pontos. Total ${fmt(state.score)}.` : `Total ${fmt(state.score)}.`;
    if (state.won && !state.keepPlaying) msg += " Você chegou a 2048!";
    if (state.over) msg += " Fim de jogo.";
    els.live.textContent = msg;
  }

  function newGame() {
    if (finishPending) finishPending();
    state = E.newGame();
    for (const el of tileEls.values()) el.remove();
    tileEls.clear();
    const created = {};
    state.cells.forEach((t) => { if (t) created[t.id] = "is-new"; });
    sync(created);
    els.hint.textContent = "Deslize para mover as peças. No teclado, use as setas ou WASD.";
    els.live.textContent = "Novo jogo.";
    save();
  }

  // ---------- Diálogos ----------
  function openDialog(title, bodyHtml, actions, onCancel) {
    els.dialogTitle.textContent = title;
    els.dialogBody.innerHTML = bodyHtml;
    els.dialogActions.innerHTML = "";
    actions.forEach((a, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "g-btn " + (i === 0 ? "g-btn--primary" : "g-btn--ghost");
      b.textContent = a.label;
      b.addEventListener("click", () => { closeDialog(); a.run && a.run(); });
      els.dialogActions.appendChild(b);
    });
    els.dialog.oncancel = (ev) => { ev.preventDefault(); closeDialog(); onCancel && onCancel(); };
    if (typeof els.dialog.showModal === "function") els.dialog.showModal();
    else els.dialog.setAttribute("open", "");
    const first = els.dialogActions.querySelector("button");
    if (first) first.focus();
  }
  function closeDialog() {
    if (typeof els.dialog.close === "function" && els.dialog.open) els.dialog.close();
    else els.dialog.removeAttribute("open");
    els.board.focus({ preventScroll: true });
  }

  function keepPlaying() { state = Object.assign({}, state, { keepPlaying: true }); save(); }

  function showWin() {
    openDialog("Você chegou a 2048!",
      `<p>Pontos: <strong>${fmt(state.score)}</strong> · Recorde: <strong>${fmt(best)}</strong></p><p>Dá para continuar jogando e buscar peças maiores.</p>`,
      [{ label: "Continuar jogando", run: keepPlaying }, { label: "Novo jogo", run: newGame }],
      keepPlaying);
  }
  function showOver() {
    const record = state.score > 0 && state.score >= best;
    openDialog("Fim de jogo",
      `<p>Não há mais jogadas possíveis.</p><p>Pontos: <strong>${fmt(state.score)}</strong> · Recorde: <strong>${fmt(best)}</strong>${record ? " (novo recorde!)" : ""}</p><p>Maior peça: <strong>${E.maxTile(state)}</strong></p>`,
      [{ label: "Jogar de novo", run: newGame }, { label: "Ver tabuleiro" }]);
  }
  function confirmNewGame() {
    if (state.over || state.moves === 0) { newGame(); return; }
    openDialog("Começar um novo jogo?",
      `<p>A partida atual (<strong>${fmt(state.score)}</strong> pontos) será perdida. O recorde continua salvo.</p>`,
      [{ label: "Novo jogo", run: newGame }, { label: "Cancelar" }]);
  }
  function showHelp() {
    openDialog("Como jogar",
      `<p>Deslize o dedo (ou use as setas/WASD) para mover <strong>todas</strong> as peças.</p>
       <p>Duas peças iguais que se encontram viram uma só com o dobro do valor, e você ganha esses pontos.</p>
       <p>A cada jogada nasce uma peça nova. Chegue a <strong>2048</strong>! O jogo acaba quando não há mais jogadas.</p>`,
      [{ label: "Entendi" }]);
  }

  // ---------- Input ----------
  let start = null;
  els.board.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    try { els.board.setPointerCapture(e.pointerId); } catch (err) {}
  });
  els.board.addEventListener("pointerup", (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) return;
    play(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });
  els.board.addEventListener("pointercancel", () => { start = null; });
  document.addEventListener("keydown", (e) => {
    if (els.dialog.open || e.altKey || e.ctrlKey || e.metaKey) return;
    const dir = KEY_DIRS[e.key];
    if (!dir) return;
    e.preventDefault();
    play(dir);
  });
  els.board.addEventListener("animationend", (e) => { if (e.target === els.board) els.board.classList.remove("shake"); });
  $("btnNew").addEventListener("click", confirmNewGame);
  $("btnHelp").addEventListener("click", showHelp);

  // ---------- Boot ----------
  const saved = load();
  best = saved ? saved.best : 0;
  state = saved && saved.state ? saved.state : E.newGame();
  if (state.score > best) best = state.score;
  buildGrid(state.size);
  sync();
  if (state.moves > 0) els.hint.textContent = "";
  save();
  if (state.over) showOver();
  else if (state.won && !state.keepPlaying) showWin();

  // Offline: mesmo service worker do site (sw.js já cacheia esta página),
  // registrado aqui porque a WebView pode abrir 2048.html direto.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }

  // Gancho de teste/depuração (sem efeito em produção): carrega um tabuleiro.
  window.__game2048 = {
    get state() { return state; },
    load(grid, opts) { if (finishPending) finishPending(); state = E.fromGrid(grid, opts); for (const el of tileEls.values()) el.remove(); tileEls.clear(); sync(); save(); },
    play,
  };
})();
