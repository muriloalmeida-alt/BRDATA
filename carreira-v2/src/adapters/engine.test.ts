// Fase 1 — host do motor: uma sessão reaproveitada entre telas, recarregada
// quando o save do servidor mudou por fora.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "./engine.ts";
import type { MatchSession } from "./match.ts";

type Fake = { version: number | null; destroyed: boolean };
function setup(opts: { server?: () => number | null; failFirst?: boolean; delayMs?: number } = {}) {
  const sessions: Fake[] = [];
  let calls = 0;
  let version = 100;
  const engine = createEngine({
    open: async () => {
      calls++;
      if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
      if (opts.failFirst && calls === 1) throw new Error("timeout");
      const f: Fake = { version, destroyed: false };
      sessions.push(f);
      return { saveVersion: () => f.version, destroy: () => { f.destroyed = true; } } as unknown as MatchSession;
    },
    serverVersion: async () => (opts.server ? opts.server() : version),
  });
  return { engine, sessions, setVersion: (v: number) => { version = v; }, calls: () => calls };
}

test("reaproveita a mesma sessão entre telas (abre uma vez só)", async () => {
  const { engine, sessions } = setup();
  const a = await engine.get();
  const b = await engine.get();
  assert.equal(a, b);
  assert.equal(engine.opens(), 1);
  assert.equal(sessions.length, 1);
});

test("save mudou por fora (ex.: a v2 gravou a escalação): recarrega o motor antes de devolver", async () => {
  const { engine, sessions, setVersion } = setup();
  const a = await engine.get();
  setVersion(200); // servidor agora em 200; a sessão aberta tem 100
  const b = await engine.get();
  assert.notEqual(a, b);
  assert.equal(sessions[0].destroyed, true, "sessão antiga destruída");
  assert.equal(sessions[1].version, 200, "nova sessão leu o save novo");
  assert.equal(engine.opens(), 2);
});

test("servidor sem versão (sem carreira ou falha de leitura): não recarrega à toa", async () => {
  const { engine } = setup({ server: () => null });
  await engine.get(); await engine.get();
  assert.equal(engine.opens(), 1);
});

test("chamadas simultâneas compartilham uma única abertura", async () => {
  const { engine } = setup({ delayMs: 50 });
  const [a, b, c] = await Promise.all([engine.get(), engine.get(), engine.get()]);
  assert.ok(a === b && b === c);
  assert.equal(engine.opens(), 1);
});

test("sair da tela cancela só a espera de quem saiu; a sessão segue abrindo e é reaproveitada", async () => {
  const { engine } = setup({ delayMs: 80 });
  const ac = new AbortController();
  const p = engine.get(ac.signal);
  setTimeout(() => ac.abort(), 10);
  await assert.rejects(p, (e: Error) => e.name === "AbortError");
  const s = await engine.get();
  assert.ok(s);
  assert.equal(engine.opens(), 1, "a abertura em curso não foi refeita");
});

test("falha ao abrir: a próxima chamada tenta de novo, com uma sessão nova", async () => {
  const { engine } = setup({ failFirst: true });
  await assert.rejects(engine.get(), /timeout/);
  const s = await engine.get();
  assert.ok(s);
  assert.equal(engine.opens(), 2);
});

test("pré-carga: abre em segundo plano e engole erro; get() reaproveita", async () => {
  const ok = setup({ delayMs: 20 });
  ok.engine.preload();
  const s = await ok.engine.get();
  assert.ok(s);
  assert.equal(ok.engine.opens(), 1);
  const bad = setup({ failFirst: true });
  bad.engine.preload(); // não lança
  await new Promise((r) => setTimeout(r, 10));
  assert.ok(await bad.engine.get());
});

test("reset fecha a sessão; a próxima get() abre outra", async () => {
  const { engine, sessions } = setup();
  await engine.get();
  engine.reset();
  assert.equal(sessions[0].destroyed, true);
  assert.equal(engine.current(), null);
  await engine.get();
  assert.equal(engine.opens(), 2);
});
