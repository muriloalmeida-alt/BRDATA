// Etapas G2b–G2d — sessão do motor como módulo (hosted.ts), sem navegador: DOM
// mínimo falso (só o <script> do data.js) e hospedeiro falso.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openHostedSession } from "./hosted.ts";

const scripts: { src: string; onload?: () => void; onerror?: () => void }[] = [];
(globalThis as unknown as { document: unknown }).document = {
  createElement: () => ({ src: "", onload: undefined, onerror: undefined }),
  head: { appendChild: (s: { src: string; onload?: () => void; onerror?: () => void }) => { scripts.push(s); setTimeout(() => s.onload?.(), 5); } },
};

function ponteFalsa() {
  const chamadas: unknown[][] = [];
  const ouvintes = new Set<() => void>();
  const p = {
    chamadas,
    estado: () => ({ fase: "sem-partida" as const }),
    aoMudar: (cb: () => void) => { ouvintes.add(cb); return () => ouvintes.delete(cb); },
    avisar: () => ouvintes.forEach((cb) => cb()),
    iniciar: () => { chamadas.push(["iniciar"]); return { ok: true, aoVivo: true }; },
    pausar: () => chamadas.push(["pausar"]), retomar: () => chamadas.push(["retomar"]), continuarIntervalo: () => chamadas.push(["intervalo"]),
    velocidade: (v: number) => chamadas.push(["velocidade", v]), pularParaFim: () => chamadas.push(["pular"]),
    substituir: (a: string, b: string) => { chamadas.push(["substituir", a, b]); return { ok: true }; },
    aplicarTatica: (t: unknown) => { chamadas.push(["tatica", t]); return { ok: true }; },
    conta: () => "u1", salvarDeNovo: async () => ({ ok: true }), versaoSave: () => 123, descartar: () => ({ ok: true }),
    executar: (nome: string, ...args: unknown[]) => { chamadas.push(["executar", nome, ...args]); return { ok: true, nome }; },
  };
  return p;
}

test("abre: carrega o data.js uma vez só, importa o motor/v2.js e mapeia a ponte como a do quadro", async () => {
  const p = ponteFalsa();
  const fontes: string[] = [];
  const importar = async (src: string) => { fontes.push(src); return { abrirMotor: async () => ({ ponte: p }) }; };
  const s1 = await openHostedSession({ importar });
  const s2 = await openHostedSession({ importar });
  assert.equal(scripts.filter((s) => s.src === "/js/data.js").length, 1, "data.js carregado uma vez");
  assert.deepEqual(fontes, ["/js/motor/v2.js", "/js/motor/v2.js"]);
  assert.equal(s1.snapshot().fase, "sem-partida");
  assert.deepEqual(s1.start(), { ok: true, aoVivo: true });
  s1.pause(); s1.resume(); s1.continueHalftime(); s1.speed(2); s1.skip();
  s1.substitute("a", "b"); s1.applyTactics("4-3-3", { ritmo: 4 });
  assert.equal(s1.account(), "u1");
  assert.equal(s1.saveVersion(), 123);
  assert.deepEqual(s1.run("mercado", 1), { ok: true, nome: "mercado" });
  assert.deepEqual(p.chamadas, [["iniciar"], ["pausar"], ["retomar"], ["intervalo"], ["velocidade", 2], ["pular"], ["substituir", "a", "b"],
    ["tatica", { formacao: "4-3-3", eixos: { ritmo: 4 } }], ["executar", "mercado", 1]]);
  let n = 0;
  const parar = s1.subscribe((snap) => { n++; assert.equal(snap.fase, "sem-partida"); });
  p.avisar(); parar(); p.avisar();
  assert.equal(n, 1, "assinatura e cancelamento");
  s1.destroy(); s2.destroy(); // sem página: nada a remover
});

test("sem conta logada: rejeita com 'sessao'", async () => {
  await assert.rejects(openHostedSession({ importar: async () => ({ abrirMotor: async () => ({ semConta: true as const }) }) }), /sessao/);
});

test("prazo e cancelamento: o hospedeiro que não responde estoura o prazo; signal cancela", async () => {
  const nunca = async () => ({ abrirMotor: () => new Promise<never>(() => {}) });
  const t0 = Date.now();
  await assert.rejects(openHostedSession({ importar: nunca, timeoutMs: 120 }), /timeout/);
  assert.ok(Date.now() - t0 < 1000);
  const ac = new AbortController();
  const pr = openHostedSession({ importar: nunca, signal: ac.signal });
  ac.abort();
  await assert.rejects(pr, (e: Error) => e.name === "AbortError");
  const ja = new AbortController(); ja.abort();
  await assert.rejects(openHostedSession({ importar: nunca, signal: ja.signal }), (e: Error) => e.name === "AbortError");
});
