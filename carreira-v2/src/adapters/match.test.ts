// AUD-06 — abertura da ponte com prazo independente do evento load.
// DOM mínimo falso (só o que openMatchSession usa) e prazos curtos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openMatchSession } from "./match.ts";

type Listener = () => void;
class FakeFrame {
  src = ""; title = ""; tabIndex = 0; style = { cssText: "" };
  attrs = new Map<string, string>();
  listeners = new Map<string, Set<Listener>>();
  contentWindow: { BRDATA_PONTE?: unknown } = {};
  apiReads = 0;
  setAttribute(k: string, v: string) { this.attrs.set(k, v); }
  removeAttribute(k: string) { this.attrs.delete(k); }
  addEventListener(t: string, cb: Listener) { if (!this.listeners.has(t)) this.listeners.set(t, new Set()); this.listeners.get(t)!.add(cb); }
  removeEventListener(t: string, cb: Listener) { this.listeners.get(t)?.delete(cb); }
  remove() { body.children.delete(this); }
  focus() {}
  fire(t: string) { [...(this.listeners.get(t) || [])].forEach((cb) => cb()); }
  listenerCount() { let n = 0; this.listeners.forEach((s) => { n += s.size; }); return n; }
}
const body = { children: new Set<FakeFrame>(), appendChild(f: FakeFrame) { body.children.add(f); } };
const created: FakeFrame[] = [];
// Listeners do guarda de foco (document focusin, window blur): contados
// para provar que são removidos em todos os caminhos.
const docListeners = new Set<Listener>();
const winListeners = new Set<Listener>();
(globalThis as unknown as { document: unknown }).document = {
  createElement: () => { const f = new FakeFrame(); created.push(f); return f; },
  body,
  activeElement: null,
  addEventListener: (_t: string, cb: Listener) => docListeners.add(cb),
  removeEventListener: (_t: string, cb: Listener) => docListeners.delete(cb),
};
(globalThis as unknown as { window: unknown }).window = {
  addEventListener: (_t: string, cb: Listener) => winListeners.add(cb),
  removeEventListener: (_t: string, cb: Listener) => winListeners.delete(cb),
};
const guards = () => docListeners.size + winListeners.size;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// API da ponte falsa: `fase` decide se está pronta; conta as leituras de
// estado (para provar que o polling parou).
function fakeApi(frame: FakeFrame, fase: () => string) {
  const api = { estado: () => { frame.apiReads++; return { fase: fase() }; } };
  Object.defineProperty(frame.contentWindow, "BRDATA_PONTE", { get: () => api, configurable: true });
  return api;
}
const reset = () => { body.children.clear(); created.length = 0; };

test("documento que nunca termina de carregar: rejeita no prazo, remove o quadro e para de verificar", async () => {
  reset();
  const t0 = Date.now();
  await assert.rejects(openMatchSession({ timeoutMs: 400 }), /timeout/);
  const took = Date.now() - t0;
  assert.ok(took >= 380 && took < 1500, `prazo respeitado (${took} ms)`);
  assert.equal(body.children.size, 0, "quadro removido");
  assert.equal(created[0].listenerCount(), 0, "listener de load removido");
  assert.equal(guards(), 0, "guarda de foco removido");
  const reads = created[0].apiReads;
  await sleep(400);
  assert.equal(created[0].apiReads, reads, "nenhuma verificação depois de rejeitar");
});

test("documento carregado, mas a API nunca fica pronta: rejeita no prazo", async () => {
  reset();
  const p = openMatchSession({ timeoutMs: 400 });
  fakeApi(created[0], () => "carregando");
  created[0].fire("load");
  await assert.rejects(p, /timeout/);
  assert.equal(body.children.size, 0);
  const reads = created[0].apiReads;
  assert.ok(reads > 1, "verificou enquanto esperava");
  await sleep(400);
  assert.equal(created[0].apiReads, reads, "polling parou");
});

test("carregamento bem-sucedido: resolve uma vez, sem depender do load, e para de verificar", async () => {
  reset();
  let fase = "carregando";
  const p = openMatchSession({ timeoutMs: 2000 });
  fakeApi(created[0], () => fase);
  setTimeout(() => { fase = "sem-partida"; }, 250); // pronta sem nenhum evento load
  const s = await p;
  assert.equal(s.snapshot().fase, "sem-partida");
  assert.equal(body.children.size, 1, "quadro continua (sessão viva)");
  assert.equal(created[0].listenerCount(), 0, "listener de load removido");
  const reads = created[0].apiReads;
  await sleep(2200); // passou do prazo: o watchdog não pode disparar
  assert.equal(created[0].apiReads, reads, "polling parou ao resolver");
  assert.equal(body.children.size, 1, "watchdog limpo: o quadro não foi removido depois do prazo");
  assert.equal(guards(), 2, "guarda de foco ativo enquanto a sessão vive");
  s.destroy();
  assert.equal(body.children.size, 0);
  assert.equal(guards(), 0, "destroy remove o guarda de foco");
});

test("sair antes da prontidão: cancela, remove o quadro e ignora a prontidão tardia", async () => {
  reset();
  let fase = "carregando";
  const ac = new AbortController();
  const p = openMatchSession({ timeoutMs: 2000, signal: ac.signal });
  fakeApi(created[0], () => fase);
  setTimeout(() => ac.abort(), 100);
  await assert.rejects(p, (e: Error) => e.name === "AbortError");
  assert.equal(body.children.size, 0, "quadro removido na hora");
  assert.equal(guards(), 0, "guarda de foco removido");
  fase = "sem-partida";
  created[0].fire("load"); // evento tardio
  await sleep(300);
  assert.equal(body.children.size, 0, "nada reaparece");
});

test("já cancelada antes de abrir: nem cria o quadro", async () => {
  reset();
  const ac = new AbortController(); ac.abort();
  await assert.rejects(openMatchSession({ signal: ac.signal }), (e: Error) => e.name === "AbortError");
  assert.equal(created.length, 0);
});

test("nova tentativa depois de uma falha: uma única sessão limpa", async () => {
  reset();
  await assert.rejects(openMatchSession({ timeoutMs: 200 }), /timeout/);
  const p = openMatchSession({ timeoutMs: 2000 });
  fakeApi(created[1], () => "sem-partida");
  const s = await p;
  assert.equal(created.length, 2);
  assert.equal(body.children.size, 1, "só o quadro da nova tentativa");
  assert.ok(body.children.has(created[1]));
  s.destroy();
});
