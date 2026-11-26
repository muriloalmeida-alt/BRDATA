// Utilitário de balanceamento (roda junto dos testes, sem asserts pesados):
// SIM_LOTE=1 imprime estatísticas de N carreiras com decisões automáticas.
import test from "node:test";
import { catalogoDeTeste } from "./teste-catalogo.ts";
import { abrirJanela, assinarPrimeiroContrato, avancar, decidir, novaCarreira, sugestoesIniciais, totais } from "./carreira.ts";
import { POSICOES } from "./posicoes.ts";
import type { Carreira } from "./estado.ts";

export function jogarAutomatico(semente: string, pos = POSICOES[(semente.length * 7) % 11].id, escolhaClube = 1, politica = (c: Carreira) => c.pendente!.opcoes[0].id) {
  const cat = catalogoDeTeste();
  let c = novaCarreira(cat, { semente, nacionalidade: "BR", numero: 10, posicao: pos });
  const sug = sugestoesIniciais(cat, c);
  c = assinarPrimeiroContrato(cat, c, sug[Math.min(escolhaClube, sug.length - 1)]);
  for (let passo = 0; passo < 500 && c.fase !== "encerrada"; passo++) {
    if (c.pendente) c = decidir(cat, c, politica(c));
    else if (c.fase === "temporada") c = avancar(cat, c);
    else if (c.fase === "balanco") c = abrirJanela(cat, c);
  }
  return c;
}

test("lote de carreiras (estatísticas)", { skip: !process.env.SIM_LOTE }, () => {
  const n = Number(process.env.SIM_LOTE) || 200;
  const idades: number[] = [], jogos: number[] = [], picos: number[] = [], clubes: number[] = [];
  const ev: Record<string, number> = {};
  let convoc = 0, emprest = 0;
  for (let i = 0; i < n; i++) {
    const pol = (c: Carreira) => {
      const p = c.pendente!;
      if (p.tipo === "aposentadoria") return (c.ano - c.atleta.anoNascimento) >= 35 ? "encerrar" : p.opcoes[0].id;
      if (p.tipo === "janela") return p.opcoes[(i + c.ano) % p.opcoes.length].id;
      return p.opcoes[(i + c.ano) % p.opcoes.length].id;
    };
    const c = jogarAutomatico("s" + i, undefined, i % 3, pol);
    const t = totais(c);
    idades.push(c.ano - c.atleta.anoNascimento); jogos.push(t.jogos);
    picos.push(Math.max(...c.historico.map((h) => h.nivelFim)));
    clubes.push(new Set(c.historico.map((h) => h.clubeId)).size);
    for (const d of c.decisoes) ev[d.tipo] = (ev[d.tipo] ?? 0) + 1;
    if (c.convocado) convoc++;
    if (c.historico.some((h) => h.emprestimo)) emprest++;
  }
  const q = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return `min ${s[0]} p25 ${s[Math.floor(s.length * .25)]} med ${s[Math.floor(s.length / 2)]} p75 ${s[Math.floor(s.length * .75)]} max ${s[s.length - 1]}`; };
  console.log({ idadeFim: q(idades), jogos: q(jogos), pico: q(picos), clubes: q(clubes), eventosPorCarreira: Object.fromEntries(Object.entries(ev).map(([k, v]) => [k, +(v / n).toFixed(2)])), convocados: convoc / n, comEmprestimo: emprest / n });
});
